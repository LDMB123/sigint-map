/**
 * DMB Almanac - Dexie Initialization
 *
 * Bootstrap script for IndexedDB initialization.
 * Call this early in the app lifecycle (e.g., root layout or provider).
 *
 * Features:
 * - Checks IndexedDB availability
 * - Requests persistent storage
 * - Optionally triggers initial data load
 * - Handles initialization errors gracefully
 * - Thread-safe initialization with proper mutex pattern
 * - Error state caching with explicit retry support
 * - Configurable timeout handling
 * - Initialization lifecycle events
 */

import {
  getStorageInfo,
  isDataLoaded,
  type LoadProgress,
  loadInitialData,
  requestPersistentStorage,
} from './data-loader';
import { getDb, isIndexedDBAvailable } from './db';
import { createDevLogger } from '../../utils/dev-logger';

const logger = createDevLogger('db:init');

// ==================== TYPES ====================

export interface InitOptions {
  /**
   * Automatically load data if not present
   * @default false
   */
  autoLoad?: boolean;

  /**
   * Request persistent storage on init
   * @default true
   */
  requestPersist?: boolean;

  /**
   * Progress callback for auto-loading
   */
  onProgress?: (progress: LoadProgress) => void;

  /**
   * Callback when initialization completes
   */
  onComplete?: () => void;

  /**
   * Callback when initialization fails
   */
  onError?: (error: Error) => void;

  /**
   * Log initialization steps to console
   * @default false
   */
  verbose?: boolean;

  /**
   * Timeout for initialization in milliseconds
   * @default 30000 (30 seconds)
   */
  timeout?: number;

  /**
   * Force retry even if previous attempt failed
   * @default false
   */
  forceRetry?: boolean;
}

export interface InitResult {
  success: boolean;
  dataLoaded: boolean;
  isPersisted: boolean;
  error?: Error;
  storageInfo?: {
    usage: number;
    quota: number;
    percentUsed: number;
  };
  /** Detailed errors from each initialization step */
  stepErrors?: Array<{ step: string; error: Error }>;
  /** Duration of initialization in milliseconds */
  duration?: number;
}

/** Initialization state for external consumers */
export type InitState = 'idle' | 'initializing' | 'success' | 'error';

/** Event types for initialization lifecycle */
export interface DexieInitEvents {
  'dexie-init-start': CustomEvent<{ timestamp: number }>;
  'dexie-init-complete': CustomEvent<InitResult>;
  'dexie-init-error': CustomEvent<{ error: Error; result: InitResult }>;
  'dexie-init-progress': CustomEvent<{ step: string; progress: number }>;
  'dexie-unavailable': CustomEvent<{ reason: string }>;
}

// ==================== STATE ====================

/**
 * Mutex promise for thread-safe initialization
 * Once resolved, stays resolved to allow immediate returns
 */
let initMutex: Promise<void> | null = null;

/**
 * Resolver function for the mutex
 */
let resolveMutex: (() => void) | null = null;

/**
 * Cached initialization result (success or error)
 */
let initResult: InitResult | null = null;

/**
 * Track current initialization state
 */
let currentState: InitState = 'idle';

/**
 * Track if we had a successful initialization
 */
let isInitialized = false;

// ==================== EVENTS ====================

/**
 * Dispatch initialization lifecycle events
 */
function dispatchInitEvent<K extends keyof DexieInitEvents>(
  eventName: K,
  detail: DexieInitEvents[K] extends CustomEvent<infer D> ? D : never
): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(eventName, { detail }));
  }
}

// ==================== TIMEOUT HANDLING ====================

/**
 * Create a timeout promise that rejects after specified duration
 */
function createTimeoutPromise(ms: number, signal?: AbortController): Promise<never> {
  return new Promise((_, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Initialization timed out after ${ms}ms`));
    }, ms);

    // Allow cleanup if aborted
    signal?.signal.addEventListener('abort', () => {
      clearTimeout(timeoutId);
    });
  });
}

/**
 * Race a promise against a timeout
 */
async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  signal?: AbortController
): Promise<T> {
  return Promise.race([promise, createTimeoutPromise(ms, signal)]);
}

// ==================== INITIALIZATION ====================

/**
 * Initialize the Dexie database and optionally load data.
 *
 * This function is thread-safe and handles concurrent calls properly:
 * - First caller starts initialization
 * - Concurrent callers wait on the same mutex
 * - All callers receive the same result (success or error)
 * - Errors are cached and require explicit forceRetry to retry
 *
 * @param options - Initialization options
 * @returns Promise resolving to initialization result
 */
export async function initDexieDb(options: InitOptions = {}): Promise<InitResult> {
  const {
    autoLoad = false,
    requestPersist = true,
    onProgress,
    onComplete,
    onError,
    verbose = false,
    timeout = 30000,
    forceRetry = false,
  } = options;

  // If we have a cached successful result, return it immediately
  if (initResult && initResult.success) {
    if (verbose) {
      logger.debug('[Dexie Init] Returning cached successful result');
    }
    return initResult;
  }

  // If we have a cached error result and not forcing retry, return the error
  if (initResult && initResult.error && !forceRetry) {
    if (verbose) {
      logger.debug('[Dexie Init] Returning cached error result (use forceRetry to retry)');
    }
    onError?.(initResult.error);
    return initResult;
  }

  // If forcing retry after error, reset the state
  if (forceRetry && initResult?.error) {
    if (verbose) {
      logger.debug('[Dexie Init] Forcing retry after previous error');
    }
    resetInitState();
  }

  // If initialization is already in progress, wait for it
  if (initMutex && currentState === 'initializing') {
    if (verbose) {
      logger.debug('[Dexie Init] Initialization in progress, waiting...');
    }
    await initMutex;

    // After mutex resolves, return the cached result
    if (initResult) {
      if (initResult.success) {
        onComplete?.();
      } else if (initResult.error) {
        onError?.(initResult.error);
      }
      return initResult;
    }

    // This shouldn't happen, but handle it gracefully
    return {
      success: false,
      dataLoaded: false,
      isPersisted: false,
      error: new Error('Initialization completed but no result was cached'),
    };
  }

  // Start new initialization with mutex
  // Create mutex BEFORE any async work to prevent race condition
  initMutex = new Promise<void>((resolve) => {
    resolveMutex = resolve;
  });
  currentState = 'initializing';

  const startTime = performance.now();

  // Dispatch start event
  dispatchInitEvent('dexie-init-start', { timestamp: Date.now() });

  if (verbose) {
    logger.debug('[Dexie Init] Starting initialization...');
  }

  // Create abort controller for timeout cleanup
  const abortController = new AbortController();

  try {
    // Run initialization with timeout
    const result = await withTimeout(
      performInit({
        autoLoad,
        requestPersist,
        onProgress,
        verbose,
      }),
      timeout,
      abortController
    );

    // Add duration to result
    result.duration = performance.now() - startTime;

    // Cache the result
    initResult = result;
    isInitialized = result.success;
    currentState = result.success ? 'success' : 'error';

    // Dispatch appropriate event
    if (result.success) {
      dispatchInitEvent('dexie-init-complete', result);
      onComplete?.();
    } else if (result.error) {
      dispatchInitEvent('dexie-init-error', { error: result.error, result });
      onError?.(result.error);
    }

    if (verbose) {
      console.debug(`[Dexie Init] Completed in ${result.duration?.toFixed(2)}ms`, result);
    }

    return result;
  } catch (error) {
    // Handle timeout or unexpected errors
    const err = error instanceof Error ? error : new Error(String(error));
    const duration = performance.now() - startTime;

    const result: InitResult = {
      success: false,
      dataLoaded: false,
      isPersisted: false,
      error: err,
      duration,
    };

    // Cache the error result
    initResult = result;
    currentState = 'error';

    // Dispatch error event
    dispatchInitEvent('dexie-init-error', { error: err, result });

    if (verbose) {
      logger.error('[Dexie Init] Initialization failed:', err);
    }

    onError?.(err);
    return result;
  } finally {
    // Cancel any pending timeout
    abortController.abort();

    // Resolve mutex to unblock any waiting callers
    // Important: Do NOT clear the mutex - let it stay resolved
    resolveMutex?.();
    resolveMutex = null;
  }
}

/**
 * Internal initialization implementation with detailed error tracking
 */
async function performInit(options: {
  autoLoad: boolean;
  requestPersist: boolean;
  onProgress?: (progress: LoadProgress) => void;
  verbose: boolean;
}): Promise<InitResult> {
  const { autoLoad, requestPersist, onProgress, verbose } = options;
  const stepErrors: Array<{ step: string; error: Error }> = [];
  let dataLoaded = false;
  let isPersisted = false;
  let storageInfo: InitResult['storageInfo'] | undefined;

  // Step 1: Check IndexedDB availability
  try {
    dispatchInitEvent('dexie-init-progress', { step: 'checking-availability', progress: 0 });

    if (verbose) {
      logger.debug('[Dexie Init] Step 1: Checking IndexedDB availability...');
    }

    if (!isIndexedDBAvailable()) {
      const unavailableError = new Error('IndexedDB is not available in this environment');

      logger.warn('[Dexie Init] IndexedDB not available, running in read-only mode');

      dispatchInitEvent('dexie-unavailable', {
        reason: 'IndexedDB not supported or blocked',
      });

      onProgress?.({
        phase: 'error',
        loaded: 0,
        total: 0,
        percentage: 0,
        error: 'IndexedDB not available. Some features may be limited.',
      });

      return {
        success: false,
        dataLoaded: false,
        isPersisted: false,
        error: unavailableError,
        stepErrors: [{ step: 'check-availability', error: unavailableError }],
      };
    }

    if (verbose) {
      logger.debug('[Dexie Init] Step 1 complete: IndexedDB available');
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    stepErrors.push({ step: 'check-availability', error: err });

    if (verbose) {
      logger.error('[Dexie Init] Step 1 failed:', err);
    }

    return {
      success: false,
      dataLoaded: false,
      isPersisted: false,
      error: err,
      stepErrors,
    };
  }

  // Step 2: Initialize Dexie database
  try {
    dispatchInitEvent('dexie-init-progress', { step: 'opening-database', progress: 20 });

    if (verbose) {
      logger.debug('[Dexie Init] Step 2: Opening database...');
    }

    const db = getDb();
    await db.open();

    if (verbose) {
      logger.debug('[Dexie Init] Step 2 complete: Database opened');
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    stepErrors.push({ step: 'open-database', error: err });

    if (verbose) {
      logger.error('[Dexie Init] Step 2 failed:', err);
    }

    return {
      success: false,
      dataLoaded: false,
      isPersisted: false,
      error: new Error(`Failed to open database: ${err.message}`),
      stepErrors,
    };
  }

  // Step 3: Check if data is loaded
  try {
    dispatchInitEvent('dexie-init-progress', { step: 'checking-data', progress: 40 });

    if (verbose) {
      logger.debug('[Dexie Init] Step 3: Checking data state...');
    }

    dataLoaded = await isDataLoaded();

    if (verbose) {
      console.debug(`[Dexie Init] Step 3 complete: Data loaded = ${dataLoaded}`);
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    stepErrors.push({ step: 'check-data', error: err });

    if (verbose) {
      logger.warn('[Dexie Init] Step 3 warning: Could not check data state:', err);
    }
    // Non-fatal: continue with dataLoaded = false
  }

  // Step 4: Auto-load data if requested and not present
  if (autoLoad && !dataLoaded) {
    try {
      dispatchInitEvent('dexie-init-progress', { step: 'loading-data', progress: 50 });

      if (verbose) {
        logger.debug('[Dexie Init] Step 4: Auto-loading data...');
      }

      await loadInitialData(onProgress);
      dataLoaded = true;

      if (verbose) {
        logger.debug('[Dexie Init] Step 4 complete: Data loaded');
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      stepErrors.push({ step: 'load-data', error: err });

      if (verbose) {
        logger.error('[Dexie Init] Step 4 failed:', err);
      }

      // This is a critical error if autoLoad was requested
      return {
        success: false,
        dataLoaded: false,
        isPersisted: false,
        error: new Error(`Failed to load initial data: ${err.message}`),
        stepErrors,
      };
    }
  }

  // Step 5: Request persistent storage
  if (requestPersist) {
    try {
      dispatchInitEvent('dexie-init-progress', { step: 'requesting-persistence', progress: 80 });

      if (verbose) {
        logger.debug('[Dexie Init] Step 5: Requesting persistent storage...');
      }

      isPersisted = await requestPersistentStorage();

      if (verbose) {
        console.debug(`[Dexie Init] Step 5 complete: Persistent storage = ${isPersisted}`);
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      stepErrors.push({ step: 'request-persistence', error: err });

      if (verbose) {
        logger.warn('[Dexie Init] Step 5 warning: Could not request persistent storage:', err);
      }
      // Non-fatal: continue with isPersisted = false
    }
  }

  // Step 6: Get storage info
  try {
    dispatchInitEvent('dexie-init-progress', { step: 'getting-storage-info', progress: 90 });

    if (verbose) {
      logger.debug('[Dexie Init] Step 6: Getting storage info...');
    }

    storageInfo = await getStorageInfo();

    if (verbose) {
      logger.debug('[Dexie Init] Step 6 complete: Storage info:', {
        usage: `${(storageInfo.usage / 1024 / 1024).toFixed(2)} MB`,
        quota: `${(storageInfo.quota / 1024 / 1024).toFixed(2)} MB`,
        percentUsed: `${storageInfo.percentUsed.toFixed(2)}%`,
      });
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    stepErrors.push({ step: 'get-storage-info', error: err });

    if (verbose) {
      logger.warn('[Dexie Init] Step 6 warning: Could not get storage info:', err);
    }
    // Non-fatal: continue without storage info
  }

  dispatchInitEvent('dexie-init-progress', { step: 'complete', progress: 100 });

  // Success (possibly with non-fatal warnings)
  return {
    success: true,
    dataLoaded: autoLoad ? true : dataLoaded,
    isPersisted,
    storageInfo,
    stepErrors: stepErrors.length > 0 ? stepErrors : undefined,
  };
}

/**
 * Check if storage is persisted
 */
async function isStoragePersisted(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persisted) {
    return false;
  }

  try {
    return await navigator.storage.persisted();
  } catch {
    return false;
  }
}

/**
 * Reset initialization state.
 * Use this to allow retry after error or for testing.
 */
export function resetInitState(): void {
  // Wait for any pending initialization to complete before resetting
  if (resolveMutex) {
    resolveMutex();
    resolveMutex = null;
  }

  isInitialized = false;
  initMutex = null;
  initResult = null;
  currentState = 'idle';
}

/**
 * Check if Dexie has been initialized successfully
 */
export function isInitializedDexie(): boolean {
  return isInitialized;
}

/**
 * Get the current initialization state
 */
export function getInitState(): InitState {
  return currentState;
}

/**
 * Get the cached initialization result (if any)
 */
export function getCachedInitResult(): InitResult | null {
  return initResult;
}

// ==================== REACT/SVELTE INTEGRATION ====================

/**
 * Simple initialization function for app startup.
 * Call this in your root layout or app component.
 *
 * Example (Svelte):
 * ```svelte
 * <script>
 *   import { onMount } from 'svelte';
 *   import { initializeDexieDb } from '$lib/db/dexie/init';
 *
 *   onMount(() => {
 *     initializeDexieDb({ verbose: true });
 *   });
 * </script>
 * ```
 *
 * Example (React):
 * ```tsx
 * useEffect(() => {
 *   initializeDexieDb({ verbose: true });
 * }, []);
 * ```
 */
export async function initializeDexieDb(options?: InitOptions): Promise<InitResult> {
  return initDexieDb(options);
}

/**
 * Get initialization status without triggering init
 */
export async function getInitStatus(): Promise<{
  state: InitState;
  isInitialized: boolean;
  dataLoaded: boolean;
  isPersisted: boolean;
  error?: Error;
}> {
  return {
    state: currentState,
    isInitialized,
    dataLoaded: isInitialized ? await isDataLoaded() : false,
    isPersisted: isInitialized ? await isStoragePersisted() : false,
    error: initResult?.error,
  };
}

/**
 * Subscribe to initialization state changes.
 * Returns an unsubscribe function.
 *
 * Example:
 * ```typescript
 * const unsubscribe = subscribeToInitEvents({
 *   onStart: () => console.log('Init started'),
 *   onComplete: (result) => console.log('Init complete', result),
 *   onError: (error, result) => console.error('Init failed', error),
 *   onProgress: (step, progress) => console.log(`${step}: ${progress}%`),
 * });
 *
 * // Later:
 * unsubscribe();
 * ```
 */
export function subscribeToInitEvents(handlers: {
  onStart?: () => void;
  onComplete?: (result: InitResult) => void;
  onError?: (error: Error, result: InitResult) => void;
  onProgress?: (step: string, progress: number) => void;
  onUnavailable?: (reason: string) => void;
}): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const startHandler = () => handlers.onStart?.();
  const completeHandler = (e: Event) => {
    const detail = (e as CustomEvent<InitResult>).detail;
    handlers.onComplete?.(detail);
  };
  const errorHandler = (e: Event) => {
    const detail = (e as CustomEvent<{ error: Error; result: InitResult }>).detail;
    handlers.onError?.(detail.error, detail.result);
  };
  const progressHandler = (e: Event) => {
    const detail = (e as CustomEvent<{ step: string; progress: number }>).detail;
    handlers.onProgress?.(detail.step, detail.progress);
  };
  const unavailableHandler = (e: Event) => {
    const detail = (e as CustomEvent<{ reason: string }>).detail;
    handlers.onUnavailable?.(detail.reason);
  };

  window.addEventListener('dexie-init-start', startHandler);
  window.addEventListener('dexie-init-complete', completeHandler);
  window.addEventListener('dexie-init-error', errorHandler);
  window.addEventListener('dexie-init-progress', progressHandler);
  window.addEventListener('dexie-unavailable', unavailableHandler);

  return () => {
    window.removeEventListener('dexie-init-start', startHandler);
    window.removeEventListener('dexie-init-complete', completeHandler);
    window.removeEventListener('dexie-init-error', errorHandler);
    window.removeEventListener('dexie-init-progress', progressHandler);
    window.removeEventListener('dexie-unavailable', unavailableHandler);
  };
}

// ==================== EXPORTS ====================

export { initDexieDb as default };

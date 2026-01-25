/**
 * DMB Almanac - Telemetry Queue Service
 *
 * Provides reliable telemetry delivery with:
 * - Automatic queuing when network fails
 * - Exponential backoff retry logic (max 3 retries)
 * - Background Sync API integration (when available)
 * - Structured error logging with error codes
 * - SSR compatibility (typeof window checks)
 *
 * Telemetry entries are stored in IndexedDB and processed when:
 * 1. Browser comes back online (navigator.onLine + 'online' event)
 * 2. Background Sync API fires (if registered and supported)
 * 3. Manual processQueue() call
 * 4. Scheduled retry based on exponential backoff
 */

import type { PerformanceTelemetry } from '$lib/utils/rum';
import { getDb } from '$db/dexie/db';
import { errorLogger } from '$lib/errors/logger';
import { ApiError, TelemetryError } from '$lib/errors/types';

// ==================== CONFIGURATION ====================

/**
 * Maximum number of retry attempts for a failed telemetry submission
 */
const MAX_RETRIES = 3;

/**
 * Base delay in milliseconds for exponential backoff
 * First retry: 1000ms, second: 2000ms, third: 4000ms
 */
const BACKOFF_BASE_MS = 1000;

/**
 * Exponential multiplier for backoff calculation
 */
const BACKOFF_MULTIPLIER = 2;

/**
 * Maximum jitter (randomness) to add to backoff in milliseconds
 * Prevents thundering herd problem when multiple clients come online
 */
const BACKOFF_JITTER_MS = 500;

/**
 * Maximum number of telemetry entries to keep in queue
 * Prevents storage quota issues with unbounded queue growth
 */
const MAX_QUEUE_SIZE = 500;

/**
 * Maximum number of parallel telemetry requests
 * Balances throughput with server load and network congestion
 */
const MAX_PARALLEL_REQUESTS = 2;

/**
 * Timeout for individual fetch requests in milliseconds
 */
const FETCH_TIMEOUT_MS = 10000;

/**
 * Background Sync tag for telemetry queue processing
 */
const BACKGROUND_SYNC_TAG = 'dmb-telemetry-queue';

/**
 * Default telemetry endpoint
 */
const DEFAULT_ENDPOINT = '/api/telemetry/performance';

// ==================== TYPES ====================

/**
 * Telemetry queue item stored in IndexedDB
 */
export interface TelemetryQueueItem {
  id?: number;
  payload: PerformanceTelemetry;
  endpoint: string;
  status: 'pending' | 'retrying' | 'completed' | 'failed';
  retries: number;
  createdAt: number;
  lastError?: string;
  lastErrorCode?: string;
  nextRetry?: number;
}

/**
 * Options for queue processing
 */
export interface ProcessQueueOptions {
  /**
   * Maximum number of entries to process (default: undefined = process all)
   */
  maxEntries?: number;

  /**
   * Abort signal for cancellation support
   */
  signal?: AbortSignal;
}

/**
 * Result of processing a single telemetry entry
 */
export interface ProcessTelemetryResult {
  id: number;
  success: boolean;
  status: 'completed' | 'retrying' | 'failed';
  error?: string;
  errorCode?: string;
  response?: {
    status: number;
    statusText: string;
  };
}

/**
 * Result of processing the entire queue
 */
export interface ProcessQueueResult {
  processed: number;
  succeeded: number;
  failed: number;
  retrying: number;
  results: ProcessTelemetryResult[];
}

/**
 * Error codes for telemetry failures
 */
export enum TelemetryErrorCode {
  NETWORK_TIMEOUT = 'TELEMETRY_NETWORK_TIMEOUT',
  NETWORK_OFFLINE = 'TELEMETRY_NETWORK_OFFLINE',
  SERVER_ERROR = 'TELEMETRY_SERVER_ERROR',
  CLIENT_ERROR = 'TELEMETRY_CLIENT_ERROR',
  VALIDATION_ERROR = 'TELEMETRY_VALIDATION_ERROR',
  STORAGE_FULL = 'TELEMETRY_STORAGE_FULL',
  UNKNOWN_ERROR = 'TELEMETRY_UNKNOWN_ERROR',
}

// ==================== PRIVATE STATE ====================

/**
 * Promise for current processing operation
 * Allows concurrent callers to await the same processing
 * Prevents TOCTOU race condition
 */
let processingPromise: Promise<ProcessQueueResult> | null = null;

/**
 * Online status flag
 * True when navigator.onLine is true and 'online' event received
 */
let isOnline = typeof window !== 'undefined' ? navigator.onLine : false;

/**
 * Scheduled timeout for next retry
 */
let nextRetryTimeout: ReturnType<typeof setTimeout> | null = null;

/**
 * Event listeners cleanup functions
 */
const listeners: Array<() => void> = [];

// ==================== UTILITY FUNCTIONS ====================

/**
 * Check if environment supports window/IndexedDB
 */
function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

/**
 * Check if Background Sync API is supported
 */
function supportsBackgroundSync(): boolean {
  if (!isBrowser()) return false;
  return (
    'serviceWorker' in navigator &&
    'SyncManager' in window &&
    'registration' in navigator.serviceWorker
  );
}

/**
 * Calculate exponential backoff delay with jitter
 * @param retryCount - Zero-based retry attempt number (0, 1, 2...)
 * @returns Delay in milliseconds
 */
function calculateBackoffDelay(retryCount: number): number {
  const exponentialDelay = BACKOFF_BASE_MS * Math.pow(BACKOFF_MULTIPLIER, retryCount);
  const jitter = Math.random() * BACKOFF_JITTER_MS;
  return exponentialDelay + jitter;
}

/**
 * Perform a fetch with timeout
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeout?: number }
): Promise<Response> {
  const { timeout = FETCH_TIMEOUT_MS, ...fetchOptions } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    return await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Check if online status has changed
 */
function checkOnlineStatus(): boolean {
  const wasOnline = isOnline;
  isOnline = isBrowser() ? navigator.onLine : false;

  if (!wasOnline && isOnline) {
    errorLogger.debug('[TelemetryQueue] Back online, triggering queue processing');
    return true; // Changed from offline to online
  }

  return false;
}

/**
 * Schedule automatic processing on next retry time
 */
function scheduleNextRetry(nextRetryTime: number): void {
  // Clear existing timeout
  if (nextRetryTimeout) {
    clearTimeout(nextRetryTimeout);
  }

  const delayMs = Math.max(0, nextRetryTime - Date.now());

  if (delayMs > 0) {
    errorLogger.debug(`[TelemetryQueue] Scheduling next retry in ${delayMs}ms`);
    nextRetryTimeout = setTimeout(() => {
      processQueue().catch((error) => {
        errorLogger.error('[TelemetryQueue] Error in scheduled retry', error, {
          errorCode: TelemetryErrorCode.UNKNOWN_ERROR,
        });
      });
    }, delayMs);
  }
}

/**
 * Determine error code from error object
 */
function getErrorCode(error: unknown): TelemetryErrorCode {
  if (error instanceof Error) {
    if (error.message.includes('timeout') || error.message.includes('aborted')) {
      return TelemetryErrorCode.NETWORK_TIMEOUT;
    }
    if (error.message.includes('offline') || error.message.includes('network')) {
      return TelemetryErrorCode.NETWORK_OFFLINE;
    }
  }

  if (typeof error === 'object' && error !== null && 'status' in error) {
    const status = (error as any).status;
    if (status >= 400 && status < 500) {
      return TelemetryErrorCode.CLIENT_ERROR;
    }
    if (status >= 500) {
      return TelemetryErrorCode.SERVER_ERROR;
    }
  }

  return TelemetryErrorCode.UNKNOWN_ERROR;
}

/**
 * Determine if an error should prevent retry
 */
function isNonRetryableError(errorCode: TelemetryErrorCode, statusCode?: number): boolean {
  // 4xx errors (except 429 Too Many Requests) are typically not retryable
  if (statusCode && statusCode >= 400 && statusCode < 500 && statusCode !== 429) {
    return true;
  }

  // Validation errors are not retryable
  if (errorCode === TelemetryErrorCode.VALIDATION_ERROR) {
    return true;
  }

  return false;
}

// ==================== PUBLIC API ====================

/**
 * Initialize the telemetry queue service
 * Registers online/offline event listeners
 *
 * Call this once during app initialization (e.g., in +layout.svelte's onMount)
 */
export function initializeTelemetryQueue(): void {
  if (!isBrowser()) {
    errorLogger.debug('[TelemetryQueue] SSR environment, skipping initialization');
    return;
  }

  errorLogger.debug('[TelemetryQueue] Initializing queue service');

  // Update initial online status
  isOnline = navigator.onLine;

  // Listen for online event
  const handleOnline = () => {
    errorLogger.debug('[TelemetryQueue] Online event fired');
    checkOnlineStatus();
    processQueue().catch((error) => {
      errorLogger.error('[TelemetryQueue] Error processing queue on online', error);
    });
  };

  // Listen for offline event
  const handleOffline = () => {
    errorLogger.debug('[TelemetryQueue] Offline event fired');
    checkOnlineStatus();
  };

  // Listen for visibility change (helps detect coming back online)
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible' && navigator.onLine && !isOnline) {
      errorLogger.debug('[TelemetryQueue] Document became visible and online');
      checkOnlineStatus();
      processQueue().catch((error) => {
        errorLogger.error('[TelemetryQueue] Error processing queue on visibility', error);
      });
    }
  };

  // Passive flag: These are information-only events, never prevent default
  window.addEventListener('online', handleOnline, { passive: true });
  window.addEventListener('offline', handleOffline, { passive: true });
  document.addEventListener('visibilitychange', handleVisibilityChange, { passive: true });

  // Store cleanup functions
  listeners.push(() => window.removeEventListener('online', handleOnline));
  listeners.push(() => window.removeEventListener('offline', handleOffline));
  listeners.push(() =>
    document.removeEventListener('visibilitychange', handleVisibilityChange)
  );

  errorLogger.debug('[TelemetryQueue] Queue service initialized');
}

/**
 * Clean up the telemetry queue service
 * Removes event listeners and cancels scheduled retries
 *
 * Call this during app cleanup (e.g., in route transitions or cleanup functions)
 */
export function cleanupTelemetryQueue(): void {
  if (!isBrowser()) {
    return;
  }

  errorLogger.debug('[TelemetryQueue] Cleaning up queue service');

  // Remove all event listeners
  listeners.forEach((cleanup) => cleanup());
  listeners.length = 0;

  // Clear scheduled retry
  if (nextRetryTimeout) {
    clearTimeout(nextRetryTimeout);
    nextRetryTimeout = null;
  }
}

/**
 * Queue telemetry payload for reliable delivery
 *
 * @param payload - Performance telemetry data
 * @param endpoint - API endpoint (default: /api/telemetry/performance)
 * @returns Promise resolving to the queue item ID
 *
 * @example
 * const id = await queueTelemetry(telemetryPayload);
 */
export async function queueTelemetry(
  payload: PerformanceTelemetry,
  endpoint: string = DEFAULT_ENDPOINT
): Promise<number> {
  if (!isBrowser()) {
    throw new Error('[TelemetryQueue] Cannot queue telemetry in SSR environment');
  }

  const db = getDb();
  await db.ensureOpen();

  // Check queue size limit to prevent unbounded growth
  const currentCount = await db.telemetryQueue.count();
  if (currentCount >= MAX_QUEUE_SIZE) {
    // Clear oldest completed entries first
    const completed = await db.telemetryQueue
      .where('status')
      .equals('completed')
      .sortBy('createdAt');

    if (completed.length > 0) {
      const idsToDelete = completed
        .slice(0, Math.max(1, completed.length / 2))
        .map((t) => t.id)
        .filter((id): id is number => id !== undefined);
      await db.telemetryQueue.bulkDelete(idsToDelete);
      errorLogger.debug(`[TelemetryQueue] Cleaned up ${idsToDelete.length} old completed entries`);
    } else {
      // If no completed entries, throw storage full error
      const error = new ApiError(
        endpoint,
        'POST',
        'Telemetry queue storage limit reached',
        507
      );
      errorLogger.warn('[TelemetryQueue] Queue size limit reached', error, {
        errorCode: TelemetryErrorCode.STORAGE_FULL,
        queueSize: currentCount,
        maxSize: MAX_QUEUE_SIZE,
      });
      throw error;
    }
  }

  const queueItem: TelemetryQueueItem = {
    payload,
    endpoint,
    status: 'pending',
    retries: 0,
    createdAt: Date.now(),
    lastError: undefined,
    lastErrorCode: undefined,
    nextRetry: undefined,
  };

  try {
    const id = await db.telemetryQueue.add(queueItem);
    const telemetryId = id as number;

    errorLogger.debug(`[TelemetryQueue] Queued telemetry entry (ID: ${telemetryId})`, {
      sessionId: payload.sessionId,
      metricsCount: payload.metrics.length,
    });

    // If online, immediately try to process
    if (navigator.onLine && !processingPromise) {
      errorLogger.debug('[TelemetryQueue] Online detected, attempting immediate processing');
      processQueue().catch((error) => {
        errorLogger.error('[TelemetryQueue] Error in immediate processing', error);
      });
    }

    return telemetryId;
  } catch (error) {
    errorLogger.error('[TelemetryQueue] Error queueing telemetry', error, {
      errorCode: TelemetryErrorCode.UNKNOWN_ERROR,
    });
    throw error;
  }
}

/**
 * Process all pending and retrying telemetry entries in the queue
 *
 * Attempts to send each entry and updates status based on response.
 * Uses exponential backoff for failed entries.
 *
 * @param options - Processing options
 * @returns Promise resolving to processing results
 *
 * @example
 * const result = await processQueue();
 * console.log(`Processed ${result.processed} entries, ${result.succeeded} succeeded`);
 */
export async function processQueue(
  options?: ProcessQueueOptions
): Promise<ProcessQueueResult> {
  if (!isBrowser()) {
    throw new Error('[TelemetryQueue] Cannot process queue in SSR environment');
  }

  // If already processing, return the existing promise (fixes TOCTOU race condition)
  if (processingPromise) {
    errorLogger.debug('[TelemetryQueue] Queue already processing, returning existing promise');
    return processingPromise;
  }

  // Create and store the processing promise
  processingPromise = performQueueProcessing(options);

  try {
    return await processingPromise;
  } finally {
    processingPromise = null;
  }
}

/**
 * Internal function that performs the actual queue processing
 */
async function performQueueProcessing(
  options?: ProcessQueueOptions
): Promise<ProcessQueueResult> {
  const startTime = performance.now();

  try {
    const db = getDb();
    await db.ensureOpen();

    // Get all pending and retrying entries, ordered by creation time (FIFO)
    const entries = await db.telemetryQueue
      .where('status')
      .anyOf(['pending', 'retrying'])
      .sortBy('createdAt');

    // Apply max entries limit if specified
    const toProcess = options?.maxEntries
      ? entries.slice(0, options.maxEntries)
      : entries;

    errorLogger.debug(
      `[TelemetryQueue] Processing ${toProcess.length} entries (total queued: ${entries.length})`
    );

    const results: ProcessTelemetryResult[] = [];
    let succeeded = 0;
    let failed = 0;
    let retrying = 0;
    let earliestNextRetry: number | null = null;

    // Process entries in parallel batches for better throughput
    const processBatch = async (
      batch: typeof toProcess
    ): Promise<ProcessTelemetryResult[]> =>
      Promise.all(
        batch.map(async (entry) => {
          // Check abort signal
          if (options?.signal?.aborted) {
            return {
              id: entry.id ?? 0,
              success: false,
              status: 'retrying' as const,
              error: 'Aborted',
              errorCode: TelemetryErrorCode.UNKNOWN_ERROR,
            };
          }

          try {
            return await processTelemetryEntry(entry);
          } catch (error) {
            errorLogger.error(`[TelemetryQueue] Error processing entry ${entry.id}`, error);
            return {
              id: entry.id ?? 0,
              success: false,
              status: 'failed' as const,
              error: error instanceof Error ? error.message : String(error),
              errorCode: getErrorCode(error),
            };
          }
        })
      );

    // Process in batches of MAX_PARALLEL_REQUESTS
    for (let i = 0; i < toProcess.length; i += MAX_PARALLEL_REQUESTS) {
      // Check abort signal before each batch
      if (options?.signal?.aborted) {
        errorLogger.debug('[TelemetryQueue] Processing aborted by signal');
        break;
      }

      const batch = toProcess.slice(i, i + MAX_PARALLEL_REQUESTS);
      const batchResults = await processBatch(batch);

      for (let j = 0; j < batchResults.length; j++) {
        const result = batchResults[j];
        const entry = batch[j];
        results.push(result);

        if (result.status === 'completed') {
          succeeded++;
        } else if (result.status === 'retrying') {
          retrying++;
          if (
            entry.nextRetry &&
            (earliestNextRetry === null || entry.nextRetry < earliestNextRetry)
          ) {
            earliestNextRetry = entry.nextRetry;
          }
        } else if (result.status === 'failed') {
          failed++;
        }
      }
    }

    // Schedule next retry if there are retrying entries
    if (earliestNextRetry) {
      scheduleNextRetry(earliestNextRetry);
    }

    const duration = performance.now() - startTime;
    errorLogger.info(
      `[TelemetryQueue] Processing complete (${toProcess.length} entries in ${duration.toFixed(2)}ms)`,
      {
        succeeded,
        retrying,
        failed,
        duration,
      }
    );

    return {
      processed: toProcess.length,
      succeeded,
      failed,
      retrying,
      results,
    };
  } catch (error) {
    errorLogger.error('[TelemetryQueue] Error in processQueue', error);
    throw error;
  }
}

/**
 * Process a single telemetry entry
 * Internal function called by processQueue()
 */
async function processTelemetryEntry(
  entry: TelemetryQueueItem
): Promise<ProcessTelemetryResult> {
  const db = getDb();
  const entryId = entry.id ?? 0;

  // Check if we're online before attempting
  if (!navigator.onLine) {
    errorLogger.debug(`[TelemetryQueue] Skipping entry ${entryId}: offline`);
    return {
      id: entryId,
      success: false,
      status: 'retrying',
      error: 'Offline',
      errorCode: TelemetryErrorCode.NETWORK_OFFLINE,
    };
  }

  try {
    // Update status to retrying
    await db.telemetryQueue.update(entryId, {
      status: 'retrying',
    });

    // Attempt the fetch with CSRF token
    const csrfToken = document.querySelector<HTMLMetaElement>(
      'meta[name="csrf-token"]'
    )?.content;

    const response = await fetchWithTimeout(entry.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
      },
      body: JSON.stringify(entry.payload),
    });

    // Check if successful
    if (response.ok) {
      await db.telemetryQueue.update(entryId, {
        status: 'completed',
      });

      errorLogger.debug(`[TelemetryQueue] Entry ${entryId} completed: ${entry.endpoint}`);

      return {
        id: entryId,
        success: true,
        status: 'completed',
        response: {
          status: response.status,
          statusText: response.statusText,
        },
      };
    } else {
      // Non-2xx response - may retry
      const errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      const telemetryErrorCode =
        response.status >= 400 && response.status < 500
          ? TelemetryErrorCode.CLIENT_ERROR
          : TelemetryErrorCode.SERVER_ERROR;

      errorLogger.debug(
        `[TelemetryQueue] Non-2xx response from ${entry.endpoint}`,
        {
          status: response.status,
          statusText: response.statusText,
          errorCode: telemetryErrorCode,
          entryId
        }
      );

      throw new TelemetryError(
        errorMessage,
        telemetryErrorCode,
        response.status,
        entryId,
        {
          endpoint: entry.endpoint,
          responseStatus: response.status,
          responseStatusText: response.statusText
        }
      );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorCode = getErrorCode(error);
    const statusCode =
      typeof error === 'object' && error !== null && 'status' in error
        ? (error as any).status
        : undefined;

    // Check if we should retry
    const shouldRetry =
      entry.retries < MAX_RETRIES && !isNonRetryableError(errorCode, statusCode);

    if (shouldRetry) {
      const nextRetryTime = Date.now() + calculateBackoffDelay(entry.retries);

      await db.telemetryQueue.update(entryId, {
        status: 'retrying',
        retries: entry.retries + 1,
        lastError: errorMessage,
        lastErrorCode: errorCode,
        nextRetry: nextRetryTime,
      });

      errorLogger.debug(
        `[TelemetryQueue] Entry ${entryId} queued for retry (attempt ${entry.retries + 1}/${MAX_RETRIES})`,
        {
          errorCode,
          errorMessage,
        }
      );

      return {
        id: entryId,
        success: false,
        status: 'retrying',
        error: errorMessage,
        errorCode,
      };
    } else {
      // Max retries exceeded or non-retryable error
      await db.telemetryQueue.update(entryId, {
        status: 'failed',
        lastError: errorMessage,
        lastErrorCode: errorCode,
      });

      errorLogger.error(`[TelemetryQueue] Entry ${entryId} failed permanently`, undefined, {
        errorCode,
        errorMessage,
        retries: entry.retries,
      });

      return {
        id: entryId,
        success: false,
        status: 'failed',
        error: errorMessage,
        errorCode,
      };
    }
  }
}

/**
 * Get all queued telemetry entries
 *
 * @returns Promise resolving to array of queued entries
 */
export async function getQueuedTelemetry(): Promise<TelemetryQueueItem[]> {
  if (!isBrowser()) {
    throw new Error('[TelemetryQueue] Cannot get queued telemetry in SSR environment');
  }

  const db = getDb();
  await db.ensureOpen();

  return db.telemetryQueue.toArray();
}

/**
 * Get telemetry entries with a specific status
 *
 * @param status - Status to filter by
 * @returns Promise resolving to filtered entries
 */
export async function getTelemetryByStatus(
  status: TelemetryQueueItem['status']
): Promise<TelemetryQueueItem[]> {
  if (!isBrowser()) {
    throw new Error('[TelemetryQueue] Cannot get telemetry in SSR environment');
  }

  const db = getDb();
  await db.ensureOpen();

  return db.telemetryQueue.where('status').equals(status).toArray();
}

/**
 * Clear all completed telemetry entries from the queue
 *
 * @returns Promise resolving to number of deleted entries
 */
export async function clearCompletedTelemetry(): Promise<number> {
  if (!isBrowser()) {
    throw new Error('[TelemetryQueue] Cannot clear telemetry in SSR environment');
  }

  const db = getDb();
  await db.ensureOpen();

  const completed = await db.telemetryQueue.where('status').equals('completed').toArray();

  const ids = completed.map((t) => t.id).filter((id): id is number => id !== undefined);

  if (ids.length > 0) {
    await db.telemetryQueue.bulkDelete(ids);
    errorLogger.debug(`[TelemetryQueue] Cleared ${ids.length} completed entries`);
  }

  return ids.length;
}

/**
 * Delete a specific telemetry entry from the queue
 *
 * @param id - Entry ID to delete
 * @returns Promise resolving when deletion is complete
 */
export async function deleteTelemetryEntry(id: number): Promise<void> {
  if (!isBrowser()) {
    throw new Error('[TelemetryQueue] Cannot delete telemetry in SSR environment');
  }

  const db = getDb();
  await db.ensureOpen();

  await db.telemetryQueue.delete(id);
  errorLogger.debug(`[TelemetryQueue] Deleted entry ${id}`);
}

/**
 * Type guard for ServiceWorkerRegistration with Background Sync support
 */
interface SyncManager {
  register(tag: string): Promise<void>;
  getTags(): Promise<string[]>;
}

interface ServiceWorkerRegistrationWithSync extends ServiceWorkerRegistration {
  readonly sync: SyncManager;
}

function hasBackgroundSyncSupport(
  registration: ServiceWorkerRegistration
): registration is ServiceWorkerRegistrationWithSync {
  return 'sync' in registration && registration.sync != null;
}

/**
 * Register the telemetry queue for Background Sync API processing
 *
 * This allows the browser/OS to process the queue even when the app
 * is closed (after service worker registration).
 * Requires the Background Sync API to be available.
 *
 * @returns Promise resolving to registration success
 */
export async function registerBackgroundSync(): Promise<void> {
  if (!supportsBackgroundSync()) {
    errorLogger.warn('[TelemetryQueue] Background Sync API not available in this browser');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    if (!hasBackgroundSyncSupport(registration)) {
      errorLogger.warn('[TelemetryQueue] ServiceWorkerRegistration lacks sync property');
      return;
    }
    await registration.sync.register(BACKGROUND_SYNC_TAG);
    errorLogger.debug(
      `[TelemetryQueue] Background Sync registered (tag: ${BACKGROUND_SYNC_TAG})`
    );
  } catch (error) {
    errorLogger.error('[TelemetryQueue] Error registering Background Sync', error);
    throw error;
  }
}

/**
 * Get the Background Sync API tag used by this service
 * Useful for coordinating with service workers
 *
 * @returns The sync tag string
 */
export function getBackgroundSyncTag(): string {
  return BACKGROUND_SYNC_TAG;
}

/**
 * Get current queue statistics
 *
 * @returns Promise resolving to queue statistics
 */
export async function getQueueStats(): Promise<{
  total: number;
  pending: number;
  retrying: number;
  failed: number;
  completed: number;
  oldestEntry: TelemetryQueueItem | null;
}> {
  if (!isBrowser()) {
    throw new Error('[TelemetryQueue] Cannot get stats in SSR environment');
  }

  const db = getDb();
  await db.ensureOpen();

  const [total, pending, retrying, failed, completed] = await Promise.all([
    db.telemetryQueue.count(),
    db.telemetryQueue.where('status').equals('pending').count(),
    db.telemetryQueue.where('status').equals('retrying').count(),
    db.telemetryQueue.where('status').equals('failed').count(),
    db.telemetryQueue.where('status').equals('completed').count(),
  ]);

  const oldest = await db.telemetryQueue.orderBy('createdAt').first();

  return {
    total,
    pending,
    retrying,
    failed,
    completed,
    oldestEntry: oldest || null,
  };
}

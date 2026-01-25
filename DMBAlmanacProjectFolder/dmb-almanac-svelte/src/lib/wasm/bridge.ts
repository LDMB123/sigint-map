/**
 * DMB Almanac - WASM Bridge
 *
 * Main TypeScript wrapper class for WASM module interaction.
 * Handles lazy loading, worker communication, fallback, and Svelte store integration.
 */

import { browser } from '$app/environment';
import { writable, derived, get, type Readable, type Writable } from 'svelte/store';
import type {
  WasmExports,
  WasmBridgeConfig,
  WasmLoadState,
  WasmResult,
  WasmPerformanceMetrics,
  WasmPerformanceStats,
  WorkerRequest,
  WorkerResponse,
  DEFAULT_WASM_CONFIG,
  // WasmSongInput, WasmShowInput, WasmSetlistEntryInput available for input transformations
  WasmShowInput,
  WasmSongStatisticsOutput,
  WasmLiberationEntryOutput,
  WasmYearlyStatisticsOutput,
} from './types';
import {
  fallbackImplementations,
  type FallbackMethod,
} from './fallback';
import {
  serializeForWasm,
  deserializeFromWasm,
  songsToWasmInput,
  showsToWasmInput,
  setlistEntriesToWasmInput,
  viewTypedArrayFromWasm,
  copyTypedArrayFromWasm,
  copyParallelArraysFromWasm,
  parallelArraysToObjects,
  type TypedArrayContainer,
  type ParallelTypedArrays,
} from './serialization';
import {
  WasmFunctionAccessor,
  isWasmTypedArrayReturn,
  type WasmTypedArrayReturn,
} from '../types/wasm-helpers';

// ==================== TYPES ====================

type WasmMethodName = keyof WasmExports;

interface PendingCall {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  startTime: number;
  method: WasmMethodName;
}

// ==================== SINGLETON BRIDGE ====================

/**
 * WasmBridge - Singleton class managing WASM module lifecycle
 */
class WasmBridge {
  private static instance: WasmBridge | null = null;

  // Configuration
  private config: WasmBridgeConfig;

  // Worker
  private worker: Worker | null = null;
  private pendingCalls = new Map<string, PendingCall>();
  private callIdCounter = 0;
  private staleCleanupInterval: ReturnType<typeof setInterval> | null = null;
  private healthCheckInterval: ReturnType<typeof setInterval> | null = null;
  private workerRestartInProgress = false;

  // Direct WASM (fallback when workers unavailable)
  private wasmModule: WasmExports | null = null;

  // Stores
  private loadStateStore: Writable<WasmLoadState>;
  private metricsStore: Writable<WasmPerformanceMetrics[]>;

  // Performance tracking
  private performanceMetrics: WasmPerformanceMetrics[] = [];
  private maxMetricsHistory = 100;

  private constructor(config: Partial<WasmBridgeConfig> = {}) {
    this.config = { ...this.getDefaultConfig(), ...config };
    this.loadStateStore = writable<WasmLoadState>({ status: 'idle' });
    this.metricsStore = writable<WasmPerformanceMetrics[]>([]);
  }

  /**
   * Get or create the singleton instance
   */
  public static getInstance(config?: Partial<WasmBridgeConfig>): WasmBridge {
    if (!WasmBridge.instance) {
      WasmBridge.instance = new WasmBridge(config);
    } else if (config) {
      // Update config if provided
      WasmBridge.instance.config = {
        ...WasmBridge.instance.config,
        ...config,
      };
    }
    return WasmBridge.instance;
  }

  /**
   * Reset singleton (for testing)
   */
  public static resetInstance(): void {
    if (WasmBridge.instance) {
      WasmBridge.instance.terminate();
      WasmBridge.instance = null;
    }
  }

  // ==================== INITIALIZATION ====================

  /**
   * Initialize the WASM module (lazy load)
   */
  public async initialize(): Promise<void> {
    if (!browser) {
      console.warn('[WasmBridge] Cannot initialize on server');
      return;
    }

    const currentState = get(this.loadStateStore);
    if (currentState.status === 'ready') {
      return; // Already initialized
    }
    if (currentState.status === 'loading') {
      // Wait for existing initialization
      return new Promise((resolve, reject) => {
        const unsubscribe = this.loadStateStore.subscribe(state => {
          if (state.status === 'ready') {
            unsubscribe();
            resolve();
          } else if (state.status === 'error') {
            unsubscribe();
            if (state.fallbackActive) {
              resolve(); // Fallback is active, consider it successful
            } else {
              reject(state.error);
            }
          }
        });
      });
    }

    this.loadStateStore.set({ status: 'loading', progress: 0 });

    try {
      if (this.config.useWorker && typeof Worker !== 'undefined') {
        await this.initializeWorker();
      } else {
        await this.initializeDirect();
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      if (this.config.enableFallback) {
        console.warn('[WasmBridge] WASM failed, using fallback:', err.message);
        this.loadStateStore.set({
          status: 'error',
          error: err,
          fallbackActive: true,
        });
      } else {
        this.loadStateStore.set({
          status: 'error',
          error: err,
          fallbackActive: false,
        });
        throw error;
      }
    }
  }

  /**
   * Initialize WASM in Web Worker
   */
  private async initializeWorker(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Set up initialization timeout to prevent hanging forever
      const initTimeout = setTimeout(() => {
        this.worker?.terminate();
        this.worker = null;
        reject(new Error('WASM worker initialization timed out'));
      }, this.config.operationTimeout);

      try {
        // Create worker from bundled worker file
        this.worker = new Worker(
          new URL('./worker.ts', import.meta.url),
          { type: 'module' }
        );

        this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
          this.handleWorkerMessage(event.data);
        };

        this.worker.onerror = (error) => {
          clearTimeout(initTimeout);
          console.error('[WasmBridge] Worker error:', error);
          // Clean up all pending calls on worker error
          this.rejectAllPendingCalls(new Error(`Worker error: ${error.message}`));
          reject(new Error(`Worker error: ${error.message}`));
        };

        // Set up init response handler
        const initHandler = (response: WorkerResponse) => {
          clearTimeout(initTimeout);
          if (response.type === 'init-success') {
            this.loadStateStore.set({
              status: 'ready',
              loadTime: response.loadTime,
            });
            resolve();
          } else if (response.type === 'init-error') {
            reject(new Error(response.error));
          }
        };

        // Temporarily add init handler
        const originalHandler = this.worker.onmessage;
        this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
          const response = event.data;
          if (response.type === 'init-success' || response.type === 'init-error') {
            initHandler(response);
            this.worker!.onmessage = originalHandler;
          } else if (originalHandler && this.worker) {
            originalHandler.call(this.worker, event);
          }
        };

        // Send init message
        const initRequest: WorkerRequest = {
          type: 'init',
          config: this.config,
        };
        this.worker.postMessage(initRequest);

        this.loadStateStore.set({ status: 'loading', progress: 50 });

        // Start periodic stale request cleanup (every 10 seconds)
        this.startStaleRequestCleanup();

        // Start worker health check (every 10 seconds)
        this.startWorkerHealthCheck();
      } catch (error) {
        clearTimeout(initTimeout);
        reject(error);
      }
    });
  }

  /**
   * Initialize WASM directly (no worker)
   * Uses wasm-bindgen generated JS glue code for proper initialization
   */
  private async initializeDirect(): Promise<void> {
    const startTime = performance.now();

    this.loadStateStore.set({ status: 'loading', progress: 25 });

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.operationTimeout);

    try {
      this.loadStateStore.set({ status: 'loading', progress: 50 });

      // Use wasm-bindgen generated JS module for proper initialization
      // This handles all the complex import/export bindings correctly
      const wasmModule = await import('$wasm/dmb-transform/pkg/dmb_transform.js');

      // Dynamically import WASM URL to defer loading until needed
      const { default: transformWasmUrl } = await import('$wasm/dmb-transform/pkg/dmb_transform_bg.wasm?url');

      // Initialize with explicit URL to ensure correct path resolution
      await wasmModule.default(transformWasmUrl);

      clearTimeout(timeoutId);

      this.loadStateStore.set({ status: 'loading', progress: 90 });

      // Store the module exports for direct calls
      this.wasmModule = wasmModule as unknown as WasmExports;

      const loadTime = performance.now() - startTime;
      console.debug(`[WasmBridge] WASM loaded directly in ${loadTime.toFixed(2)}ms`);
      this.loadStateStore.set({ status: 'ready', loadTime });
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('WASM initialization timed out');
      }
      throw error;
    }
  }

  // ==================== WORKER COMMUNICATION ====================

  /**
   * Handle messages from worker
   */
  private handleWorkerMessage(response: WorkerResponse): void {
    switch (response.type) {
      case 'result': {
        const pending = this.pendingCalls.get(response.id);
        if (pending) {
          this.recordMetric(pending.method, pending.startTime, response.executionTime, true);
          pending.resolve(response.data);
          this.pendingCalls.delete(response.id);
        }
        break;
      }

      case 'error': {
        const pending = this.pendingCalls.get(response.id);
        if (pending) {
          pending.reject(new Error(response.error));
          this.pendingCalls.delete(response.id);
        }
        break;
      }

      case 'progress': {
        // Could emit progress events for long operations
        if (this.config.enablePerfLogging) {
          console.debug(`[WasmBridge] Progress ${response.id}: ${response.progress}%`);
        }
        break;
      }

      case 'log': {
        if (this.config.enablePerfLogging || response.level !== 'debug') {
          console[response.level](`[WASM Worker] ${response.message}`);
        }
        break;
      }
    }
  }

  /**
   * Call a WASM method through the worker
   */
  private async callWorker<T>(method: WasmMethodName, args: unknown[]): Promise<T> {
    if (!this.worker) {
      throw new Error('Worker not initialized');
    }

    const id = `call_${++this.callIdCounter}`;
    const startTime = performance.now();

    return new Promise((resolve, reject) => {
      // Set up timeout
      const timeoutId = setTimeout(() => {
        // Atomic cleanup: remove from pending calls and reject
        const pending = this.pendingCalls.get(id);
        if (pending) {
          this.pendingCalls.delete(id);
          reject(new Error(`Operation timed out: ${method}`));

          // Try to abort the operation
          const abortRequest: WorkerRequest = { type: 'abort', id };
          this.worker?.postMessage(abortRequest);
        }
      }, this.config.operationTimeout);

      this.pendingCalls.set(id, {
        resolve: (value) => {
          clearTimeout(timeoutId);
          this.pendingCalls.delete(id); // Atomic cleanup on success
          resolve(value as T);
        },
        reject: (error) => {
          clearTimeout(timeoutId);
          this.pendingCalls.delete(id); // Atomic cleanup on error
          reject(error);
        },
        startTime,
        method,
      });

      const request: WorkerRequest = {
        type: 'call',
        id,
        method,
        args,
      };
      this.worker!.postMessage(request);
    });
  }

  // ==================== PUBLIC API ====================

  /**
   * Execute a WASM method with automatic fallback
   */
  public async call<T>(method: WasmMethodName, ...args: unknown[]): Promise<WasmResult<T>> {
    const startTime = performance.now();

    // Ensure initialized
    await this.initialize();

    const currentState = get(this.loadStateStore);

    try {
      let result: T;
      let usedWasm = false;

      if (currentState.status === 'ready' && this.worker) {
        // Use worker
        result = await this.callWorker<T>(method, args);
        usedWasm = true;
      } else if (currentState.status === 'ready' && this.wasmModule) {
        // Direct WASM call
        const wasmFn = this.wasmModule[method] as ((...a: unknown[]) => unknown) | undefined;
        if (wasmFn) {
          // PERF: Skip serialization for strings (already JSON-serialized from high-level API)
          // This avoids double JSON.stringify which adds ~50-100ms for large datasets
          const serializedArgs = args.map(arg => {
            if (typeof arg === 'string') return arg; // Already serialized JSON
            if (typeof arg === 'object') return serializeForWasm(arg);
            return arg;
          });
          const wasmResult = wasmFn(...serializedArgs);
          result = (typeof wasmResult === 'string'
            ? deserializeFromWasm<T>(wasmResult)
            : wasmResult) as T;
          usedWasm = true;
        } else {
          throw new Error(`Method not found: ${method}`);
        }
      } else if (this.config.enableFallback) {
        // Use fallback
        result = await this.executeFallback<T>(method, args);
        usedWasm = false;
      } else {
        throw new Error('WASM not available and fallback disabled');
      }

      const executionTime = performance.now() - startTime;
      this.recordMetric(method, startTime, executionTime, usedWasm);

      return {
        success: true,
        data: result,
        executionTime,
        usedWasm,
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      // Try fallback on error if enabled
      if (this.config.enableFallback) {
        try {
          const result = await this.executeFallback<T>(method, args);
          const executionTime = performance.now() - startTime;

          return {
            success: true,
            data: result,
            executionTime,
            usedWasm: false,
          };
        } catch (fallbackError) {
          return {
            success: false,
            error: fallbackError instanceof Error ? fallbackError : new Error(String(fallbackError)),
            usedWasm: false,
          };
        }
      }

      return {
        success: false,
        error: err,
        usedWasm: false,
      };
    }
  }

  /**
   * Execute fallback JavaScript implementation
   */
  private async executeFallback<T>(method: WasmMethodName, args: unknown[]): Promise<T> {
    const fallbackMethod = method as FallbackMethod;

    if (!(fallbackMethod in fallbackImplementations)) {
      throw new Error(`No fallback for: ${method}`);
    }

    const impl = fallbackImplementations[fallbackMethod] as (...a: unknown[]) => unknown;

    // Parse JSON string arguments
    const processedArgs = args.map(arg => {
      if (typeof arg === 'string') {
        try {
          return JSON.parse(arg);
        } catch {
          return arg;
        }
      }
      return arg;
    });

    return impl(...processedArgs) as T;
  }

  // ==================== HIGH-LEVEL API ====================

  /**
   * Calculate song statistics
   */
  public async calculateSongStatistics(
    songs: import('$db/dexie/schema').DexieSong[]
  ): Promise<WasmResult<WasmSongStatisticsOutput[]>> {
    const input = songsToWasmInput(songs);
    return this.call<WasmSongStatisticsOutput[]>(
      'calculateSongStatistics' as WasmMethodName,
      JSON.stringify(input)
    );
  }

  /**
   * Compute liberation list
   */
  public async computeLiberationList(
    songs: import('$db/dexie/schema').DexieSong[],
    setlistEntries: import('$db/dexie/schema').DexieSetlistEntry[]
  ): Promise<WasmResult<WasmLiberationEntryOutput[]>> {
    const songsInput = songsToWasmInput(songs);
    const entriesInput = setlistEntriesToWasmInput(setlistEntries);

    return this.call<WasmLiberationEntryOutput[]>(
      'computeLiberationList' as WasmMethodName,
      JSON.stringify(songsInput),
      JSON.stringify(entriesInput)
    );
  }

  /**
   * Aggregate yearly statistics
   */
  public async aggregateYearlyStatistics(
    shows: import('$db/dexie/schema').DexieShow[],
    setlistEntries: import('$db/dexie/schema').DexieSetlistEntry[]
  ): Promise<WasmResult<WasmYearlyStatisticsOutput[]>> {
    const showsInput = showsToWasmInput(shows);
    const entriesInput = setlistEntriesToWasmInput(setlistEntries);

    return this.call<WasmYearlyStatisticsOutput[]>(
      'aggregateYearlyStatistics' as WasmMethodName,
      JSON.stringify(showsInput),
      JSON.stringify(entriesInput)
    );
  }

  /**
   * Calculate setlist similarity
   */
  public async calculateSetlistSimilarity(
    setlistA: import('$db/dexie/schema').DexieSetlistEntry[],
    setlistB: import('$db/dexie/schema').DexieSetlistEntry[]
  ): Promise<WasmResult<number>> {
    const inputA = setlistEntriesToWasmInput(setlistA);
    const inputB = setlistEntriesToWasmInput(setlistB);

    return this.call<number>(
      'calculateSetlistSimilarity' as WasmMethodName,
      JSON.stringify(inputA),
      JSON.stringify(inputB)
    );
  }

  /**
   * Find rare shows
   */
  public async findRareShows(
    shows: import('$db/dexie/schema').DexieShow[],
    threshold: number
  ): Promise<WasmResult<WasmShowInput[]>> {
    const input = showsToWasmInput(shows);

    return this.call<WasmShowInput[]>(
      'findRareShows' as WasmMethodName,
      JSON.stringify(input),
      threshold
    );
  }

  // ==================== TYPED ARRAY API (ZERO-COPY) ====================

  /**
   * Get show IDs for a song as TypedArray (zero-copy transfer)
   * PERF: Returns BigInt64Array directly from WASM memory - no JSON serialization
   */
  public async getShowIdsForSongTyped(
    setlistEntries: import('$db/dexie/schema').DexieSetlistEntry[],
    songId: bigint
  ): Promise<WasmResult<BigInt64Array>> {
    const entriesInput = setlistEntriesToWasmInput(setlistEntries);
    return this.call<BigInt64Array>(
      'getShowIdsForSongTyped' as WasmMethodName,
      JSON.stringify(entriesInput),
      songId
    );
  }

  /**
   * Get unique years as TypedArray (zero-copy transfer)
   * PERF: Returns Int32Array directly from WASM memory - no JSON serialization
   */
  public async getUniqueYearsTyped(
    shows: import('$db/dexie/schema').DexieShow[]
  ): Promise<WasmResult<Int32Array>> {
    const showsInput = showsToWasmInput(shows);
    return this.call<Int32Array>(
      'getUniqueYearsTyped' as WasmMethodName,
      JSON.stringify(showsInput)
    );
  }

  /**
   * Get play counts per song as parallel TypedArrays (zero-copy transfer)
   * PERF: Returns songIds (BigInt64Array) and counts (Int32Array) directly from WASM
   */
  public async getPlayCountsPerSong(
    setlistEntries: import('$db/dexie/schema').DexieSetlistEntry[]
  ): Promise<WasmResult<{ songIds: BigInt64Array; counts: Int32Array }>> {
    const entriesInput = setlistEntriesToWasmInput(setlistEntries);
    return this.call<{ songIds: BigInt64Array; counts: Int32Array }>(
      'getPlayCountsPerSong' as WasmMethodName,
      JSON.stringify(entriesInput)
    );
  }

  // ==================== ZERO-COPY TYPED ARRAY UTILITIES ====================

  /**
   * Get direct access to WASM memory for zero-copy operations
   * WARNING: Memory can be invalidated if WASM memory grows
   */
  public getWasmMemory(): WebAssembly.Memory | null {
    if (this.wasmModule) {
      return this.wasmModule.memory;
    }
    return null;
  }

  /**
   * Extract years from show dates as Int32Array (zero-copy)
   * PERF: 10-20x faster than JSON for large datasets
   *
   * @param shows - Array of shows with date strings
   * @returns Int32Array of years in same order as input
   */
  public async extractYearsTyped(
    shows: import('$db/dexie/schema').DexieShow[]
  ): Promise<WasmResult<TypedArrayContainer<Int32Array>>> {
    const startTime = performance.now();

    await this.initialize();

    const currentState = get(this.loadStateStore);

    // If WASM is ready and we have direct access, use zero-copy
    if (currentState.status === 'ready' && this.wasmModule && this.wasmModule.memory) {
      try {
        const showsInput = showsToWasmInput(shows);
        const inputJson = JSON.stringify(showsInput);

        // Call WASM function that returns ptr and length
        // Note: These typed return functions may not be in the base WasmExports interface
        // They are added by WASM modules that support zero-copy returns
        const accessor = new WasmFunctionAccessor(this.wasmModule);
        const wasmReturn = accessor.extractYearsTyped(inputJson);

        if (wasmReturn && isWasmTypedArrayReturn(wasmReturn)) {
          const { ptr, len } = wasmReturn;
          const result = copyTypedArrayFromWasm(
            this.wasmModule.memory,
            ptr,
            len,
            Int32Array
          );

          // Free the WASM memory
          if (this.wasmModule.dealloc) {
            this.wasmModule.dealloc(ptr, len * 4); // Int32 = 4 bytes
          }

          const executionTime = performance.now() - startTime;
          this.recordMetric('extractYearsTyped' as WasmMethodName, startTime, executionTime, true);

          return {
            success: true,
            data: result,
            executionTime,
            usedWasm: true,
          };
        }
      } catch (error) {
        console.warn('[WasmBridge] extractYearsTyped failed, using fallback:', error);
      }
    }

    // JavaScript fallback
    const years = new Int32Array(shows.length);
    for (let i = 0; i < shows.length; i++) {
      const date = shows[i].date;
      years[i] = parseInt(date.slice(0, 4), 10);
    }

    const executionTime = performance.now() - startTime;

    return {
      success: true,
      data: {
        data: years,
        length: years.length,
        isZeroCopy: false,
      },
      executionTime,
      usedWasm: false,
    };
  }

  /**
   * Get song IDs from setlist entries as BigInt64Array (zero-copy)
   * PERF: Avoids JSON parsing overhead for ID extraction
   */
  public async extractSongIdsTyped(
    entries: import('$db/dexie/schema').DexieSetlistEntry[]
  ): Promise<WasmResult<TypedArrayContainer<BigInt64Array>>> {
    const startTime = performance.now();

    await this.initialize();

    const currentState = get(this.loadStateStore);

    // If WASM is ready and we have direct access, use zero-copy
    if (currentState.status === 'ready' && this.wasmModule && this.wasmModule.memory) {
      try {
        const entriesInput = setlistEntriesToWasmInput(entries);
        const inputJson = JSON.stringify(entriesInput);

        const accessor = new WasmFunctionAccessor(this.wasmModule);
        // Cast to unknown first to avoid TS error if method missing in types
        const wasmFn = (accessor as unknown as Record<string, Function>)['extractSongIdsTyped'];

        if (typeof wasmFn === 'function') {
          const wasmReturn = wasmFn(inputJson);

          if (wasmReturn && isWasmTypedArrayReturn(wasmReturn)) {
            const { ptr, len } = wasmReturn;
            const result = copyTypedArrayFromWasm(
              this.wasmModule.memory,
              ptr,
              len,
              BigInt64Array
            );

            if (this.wasmModule.dealloc) {
              this.wasmModule.dealloc(ptr, len * 8); // BigInt64 = 8 bytes
            }

            const executionTime = performance.now() - startTime;
            this.recordMetric('extractSongIdsTyped' as WasmMethodName, startTime, executionTime, true);

            return {
              success: true,
              data: result,
              executionTime,
              usedWasm: true,
            };
          }
        }
        // If function missing or failed, fall through to fallback
      } catch (error) {
        console.warn('[WasmBridge] extractSongIdsTyped failed, using fallback:', error);
      }
    }

    // JavaScript fallback
    const songIds = new BigInt64Array(entries.length);
    for (let i = 0; i < entries.length; i++) {
      songIds[i] = BigInt(entries[i].songId);
    }

    const executionTime = performance.now() - startTime;

    return {
      success: true,
      data: {
        data: songIds,
        length: songIds.length,
        isZeroCopy: false,
      },
      executionTime,
      usedWasm: false,
    };
  }

  /**
   * Aggregate play counts per song as parallel typed arrays
   * PERF: Returns parallel arrays - much faster than array of objects
   *
   * @returns { songIds: BigInt64Array, counts: Int32Array } - Parallel arrays
   */
  public async aggregatePlayCountsTyped(
    entries: import('$db/dexie/schema').DexieSetlistEntry[]
  ): Promise<WasmResult<ParallelTypedArrays<BigInt64Array, Int32Array>>> {
    const startTime = performance.now();

    await this.initialize();

    const currentState = get(this.loadStateStore);

    if (currentState.status === 'ready' && this.wasmModule && this.wasmModule.memory) {
      try {
        const entriesInput = setlistEntriesToWasmInput(entries);
        const inputJson = JSON.stringify(entriesInput);

        const accessor = new WasmFunctionAccessor(this.wasmModule);
        const playCounts = accessor.getPlayCountsPerSong(inputJson);

        if (playCounts && playCounts.songIds && playCounts.counts) {
          const result = {
            ids: playCounts.songIds,
            values: playCounts.counts,
            length: playCounts.songIds.length,
            isZeroCopy: true
          };

          // Note: Memory is managed by WASM module, no manual dealloc needed
          // for TypedArray returns from getPlayCountsPerSong

          const executionTime = performance.now() - startTime;
          this.recordMetric('aggregatePlayCountsTyped' as WasmMethodName, startTime, executionTime, true);

          return {
            success: true,
            data: result,
            executionTime,
            usedWasm: true,
          };
        }
      } catch (error) {
        console.warn('[WasmBridge] aggregatePlayCountsTyped failed, using fallback:', error);
      }
    }

    // JavaScript fallback
    const countMap = new Map<number, number>();
    for (const entry of entries) {
      countMap.set(entry.songId, (countMap.get(entry.songId) ?? 0) + 1);
    }

    const songIds = new BigInt64Array(countMap.size);
    const counts = new Int32Array(countMap.size);

    let i = 0;
    for (const [songId, count] of countMap) {
      songIds[i] = BigInt(songId);
      counts[i] = count;
      i++;
    }

    const executionTime = performance.now() - startTime;

    return {
      success: true,
      data: {
        ids: songIds,
        values: counts,
        length: countMap.size,
        isZeroCopy: false,
      },
      executionTime,
      usedWasm: false,
    };
  }

  /**
   * Compute rarity scores for songs as Float32Array
   * PERF: Returns compact numeric array instead of objects
   */
  public async computeRarityScoresTyped(
    songs: import('$db/dexie/schema').DexieSong[],
    totalShows: number
  ): Promise<WasmResult<TypedArrayContainer<Float32Array>>> {
    const startTime = performance.now();

    await this.initialize();

    const currentState = get(this.loadStateStore);

    if (currentState.status === 'ready' && this.wasmModule && this.wasmModule.memory) {
      try {
        const songsInput = songsToWasmInput(songs);
        const inputJson = JSON.stringify(songsInput);

        const accessor = new WasmFunctionAccessor(this.wasmModule);
        // Note: computeRarityScoresTyped is a custom function not in the base accessor
        // We'll safely access it directly
        const wasmFn = (this.wasmModule as unknown as Record<string, unknown>)[
          'computeRarityScoresTyped'
        ] as
          | ((json: string, totalShows: number) => WasmTypedArrayReturn)
          | undefined;

        if (wasmFn && isWasmTypedArrayReturn(wasmFn(inputJson, totalShows))) {
          const wasmReturn = wasmFn(inputJson, totalShows);
          const { ptr, len } = wasmReturn;
          const result = copyTypedArrayFromWasm(
            this.wasmModule.memory,
            ptr,
            len,
            Float32Array
          );

          if (this.wasmModule.dealloc) {
            this.wasmModule.dealloc(ptr, len * 4);
          }

          const executionTime = performance.now() - startTime;
          this.recordMetric('computeRarityScoresTyped' as WasmMethodName, startTime, executionTime, true);

          return {
            success: true,
            data: result,
            executionTime,
            usedWasm: true,
          };
        }
      } catch (error) {
        console.warn('[WasmBridge] computeRarityScoresTyped failed, using fallback:', error);
      }
    }

    // JavaScript fallback - simple inverse frequency rarity
    const rarities = new Float32Array(songs.length);
    for (let i = 0; i < songs.length; i++) {
      const song = songs[i];
      if (song.totalPerformances > 0 && totalShows > 0) {
        rarities[i] = 1 - song.totalPerformances / totalShows;
      } else {
        rarities[i] = 1;
      }
    }

    const executionTime = performance.now() - startTime;

    return {
      success: true,
      data: {
        data: rarities,
        length: rarities.length,
        isZeroCopy: false,
      },
      executionTime,
      usedWasm: false,
    };
  }

  /**
   * Convert TypedArray result to object array for UI consumption
   * Helper to bridge zero-copy returns with existing UI code
   */
  public typedResultToObjects<T extends Record<string, unknown>>(
    parallel: ParallelTypedArrays,
    idKey: string,
    valueKey: string
  ): T[] {
    return parallelArraysToObjects(parallel.ids, parallel.values, idKey, valueKey) as T[];
  }

  // ==================== STORES ====================

  /**
   * Get load state store
   */
  public getLoadState(): Readable<WasmLoadState> {
    return { subscribe: this.loadStateStore.subscribe };
  }

  /**
   * Get derived ready state
   */
  public getIsReady(): Readable<boolean> {
    return derived(this.loadStateStore, state => state.status === 'ready');
  }

  /**
   * Get metrics store
   */
  public getMetrics(): Readable<WasmPerformanceMetrics[]> {
    return { subscribe: this.metricsStore.subscribe };
  }

  /**
   * Get aggregated performance stats
   */
  public getStats(): Readable<WasmPerformanceStats> {
    return derived(this.metricsStore, metrics => {
      if (metrics.length === 0) {
        return {
          totalCalls: 0,
          wasmCalls: 0,
          fallbackCalls: 0,
          averageExecutionTime: 0,
          maxExecutionTime: 0,
          minExecutionTime: 0,
          totalDataProcessed: 0,
          errorCount: 0,
        };
      }

      // PERF: Single-pass aggregation instead of multiple map/filter/reduce passes
      let wasmCalls = 0;
      let totalTime = 0;
      let maxTime = 0;
      let minTime = Infinity;
      let totalData = 0;

      for (const m of metrics) {
        if (m.usedWasm) wasmCalls++;
        totalTime += m.executionTime;
        if (m.executionTime > maxTime) maxTime = m.executionTime;
        if (m.executionTime < minTime) minTime = m.executionTime;
        totalData += m.inputSize + m.outputSize;
      }

      return {
        totalCalls: metrics.length,
        wasmCalls,
        fallbackCalls: metrics.length - wasmCalls,
        averageExecutionTime: totalTime / metrics.length,
        maxExecutionTime: maxTime,
        minExecutionTime: minTime === Infinity ? 0 : minTime,
        totalDataProcessed: totalData,
        errorCount: 0, // Would need error tracking
      };
    });
  }

  // ==================== PERFORMANCE TRACKING ====================

  private recordMetric(
    method: WasmMethodName,
    startTime: number,
    executionTime: number,
    usedWasm: boolean
  ): void {
    const metric: WasmPerformanceMetrics = {
      operationName: method,
      startTime,
      endTime: startTime + executionTime,
      executionTime,
      inputSize: 0, // Would need to track
      outputSize: 0,
      usedWasm,
    };

    this.performanceMetrics.push(metric);

    // Limit history
    if (this.performanceMetrics.length > this.maxMetricsHistory) {
      this.performanceMetrics = this.performanceMetrics.slice(-this.maxMetricsHistory);
    }

    this.metricsStore.set([...this.performanceMetrics]);

    if (this.config.enablePerfLogging) {
      console.debug(
        `[WasmBridge] ${method}: ${executionTime.toFixed(2)}ms (${usedWasm ? 'WASM' : 'JS'})`
      );
    }
  }

  // ==================== STALE REQUEST CLEANUP ====================

  /**
   * Start periodic cleanup of stale pending requests
   * Prevents memory leaks if worker crashes or hangs without responding
   */
  private startStaleRequestCleanup(): void {
    // Clear any existing interval
    this.stopStaleRequestCleanup();

    // Check every 10 seconds for stale requests
    this.staleCleanupInterval = setInterval(() => {
      this.cleanupStaleRequests();
    }, 10000);
  }

  /**
   * Stop periodic stale request cleanup
   */
  private stopStaleRequestCleanup(): void {
    if (this.staleCleanupInterval !== null) {
      clearInterval(this.staleCleanupInterval);
      this.staleCleanupInterval = null;
    }
  }

  /**
   * Clean up requests that have exceeded the operation timeout
   * This catches cases where individual timeouts might not fire
   * (e.g., if the timeout was cleared incorrectly or worker crashed silently)
   */
  private cleanupStaleRequests(): void {
    const now = performance.now();
    const staleThreshold = this.config.operationTimeout * 1.5; // 1.5x timeout as safety margin

    for (const [id, call] of this.pendingCalls.entries()) {
      const elapsed = now - call.startTime;
      if (elapsed > staleThreshold) {
        console.warn(
          `[WasmBridge] Cleaning up stale request ${id} (${call.method}) after ${elapsed.toFixed(0)}ms`
        );
        call.reject(new Error(`Stale request cleanup: ${call.method} exceeded ${staleThreshold}ms`));
        this.pendingCalls.delete(id);
      }
    }
  }

  /**
   * Start periodic worker health check
   * Monitors worker responsiveness and attempts recovery if dead
   */
  private startWorkerHealthCheck(): void {
    // Clear any existing interval
    this.stopWorkerHealthCheck();

    // Check every 10 seconds for worker health
    this.healthCheckInterval = setInterval(() => {
      this.checkWorkerHealth();
    }, 10000);
  }

  /**
   * Stop periodic worker health check
   */
  private stopWorkerHealthCheck(): void {
    if (this.healthCheckInterval !== null) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * Check if worker is healthy and attempt restart if needed
   * Detects: stale calls over 30s, dead worker, excessive pending calls
   */
  private async checkWorkerHealth(): Promise<void> {
    // Skip if no worker or restart already in progress
    if (!this.worker || this.workerRestartInProgress) {
      return;
    }

    const now = performance.now();
    const STALE_THRESHOLD = 30000; // 30 seconds
    const MAX_PENDING_CALLS = 100; // Prevent unbounded growth

    // Check 1: Detect very stale calls (likely dead worker)
    let staleCalls = 0;
    for (const [id, call] of this.pendingCalls.entries()) {
      const elapsed = now - call.startTime;
      if (elapsed > STALE_THRESHOLD) {
        staleCalls++;
      }
    }

    // Check 2: Too many pending calls (worker might be stuck)
    const pendingCount = this.pendingCalls.size;

    // Check 3: Enforce maximum pending call limit
    if (pendingCount > MAX_PENDING_CALLS) {
      console.error(
        `[WasmBridge] Health check FAIL: ${pendingCount} pending calls exceeds limit (${MAX_PENDING_CALLS})`
      );
      // Reject oldest calls to prevent unbounded memory growth
      const sorted = Array.from(this.pendingCalls.entries()).sort(
        ([, a], [, b]) => a.startTime - b.startTime
      );
      const toReject = sorted.slice(0, pendingCount - MAX_PENDING_CALLS);
      for (const [id, call] of toReject) {
        call.reject(new Error(`Pending call limit exceeded: ${call.method}`));
        this.pendingCalls.delete(id);
      }
    }

    // Health check decision
    const isUnhealthy = staleCalls > 3 || (staleCalls > 0 && pendingCount > 20);

    if (isUnhealthy) {
      console.warn(
        `[WasmBridge] Health check FAIL: ${staleCalls} stale calls, ${pendingCount} pending. Attempting restart...`
      );
      await this.restartWorker();
    } else if (staleCalls > 0 || pendingCount > 10) {
      console.warn(
        `[WasmBridge] Health check WARNING: ${staleCalls} stale calls, ${pendingCount} pending`
      );
    }
  }

  /**
   * Attempt to restart the worker after detecting it's dead
   */
  private async restartWorker(): Promise<void> {
    if (this.workerRestartInProgress) {
      return;
    }

    this.workerRestartInProgress = true;

    try {
      console.warn('[WasmBridge] Restarting worker...');

      // 1. Terminate old worker
      if (this.worker) {
        this.worker.terminate();
        this.worker = null;
      }

      // 2. Reject all pending calls (they're orphaned)
      this.rejectAllPendingCalls(new Error('Worker restarted due to health check failure'));

      // 3. Update state
      this.loadStateStore.set({ status: 'loading', progress: 25 });

      // 4. Re-initialize worker
      await this.initializeWorker();

      console.log('[WasmBridge] Worker restart successful');
    } catch (error) {
      console.error('[WasmBridge] Worker restart failed:', error);
      this.loadStateStore.set({
        status: 'error',
        error: error instanceof Error ? error.message : 'Worker restart failed'
      });
    } finally {
      this.workerRestartInProgress = false;
    }
  }

  /**
   * Reject all pending calls (used when worker crashes)
   */
  private rejectAllPendingCalls(error: Error): void {
    for (const [id, pending] of this.pendingCalls) {
      console.warn(`[WasmBridge] Rejecting pending call ${id} (${pending.method}) due to: ${error.message}`);
      pending.reject(error);
    }
    this.pendingCalls.clear();
  }

  // ==================== CLEANUP ====================

  /**
   * Terminate worker and cleanup
   */
  public terminate(): void {
    // Stop periodic cleanups
    this.stopStaleRequestCleanup();
    this.stopWorkerHealthCheck();

    if (this.worker) {
      const request: WorkerRequest = { type: 'terminate' };
      this.worker.postMessage(request);
      this.worker.terminate();
      this.worker = null;
    }

    // Reject pending calls
    this.rejectAllPendingCalls(new Error('Bridge terminated'));

    this.wasmModule = null;
    this.loadStateStore.set({ status: 'idle' });
    this.performanceMetrics = [];
    this.metricsStore.set([]);
  }

  // ==================== HELPERS ====================

  private getDefaultConfig(): WasmBridgeConfig {
    return {
      wasmPath: transformWasmUrl,
      jsGluePath: '/wasm/dmb-transform/pkg/dmb_transform.js',
      enableFallback: true,
      operationTimeout: 30000,
      maxRetries: 3,
      enablePerfLogging: false,
      // Worker disabled: worker.ts uses raw WebAssembly.instantiate() which doesn't work
      // with wasm-bindgen generated modules. Use initializeDirect() instead until worker is fixed.
      useWorker: false,
      sharedBufferSize: 16 * 1024 * 1024,
    };
  }
}

// ==================== EXPORTS ====================

/**
 * Get the singleton WASM bridge instance
 */
export function getWasmBridge(config?: Partial<WasmBridgeConfig>): WasmBridge {
  return WasmBridge.getInstance(config);
}

/**
 * Initialize WASM (call early in app lifecycle)
 */
export async function initializeWasm(config?: Partial<WasmBridgeConfig>): Promise<void> {
  const bridge = getWasmBridge(config);
  await bridge.initialize();
}

/**
 * Svelte-friendly stores for WASM state
 */
export function createWasmStores(config?: Partial<WasmBridgeConfig>) {
  const bridge = getWasmBridge(config);

  return {
    loadState: bridge.getLoadState(),
    isReady: bridge.getIsReady(),
    metrics: bridge.getMetrics(),
    stats: bridge.getStats(),
  };
}

// Re-export the class for advanced usage
export { WasmBridge };

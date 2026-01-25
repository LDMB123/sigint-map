/**
 * DMB Almanac - WASM Svelte Stores
 *
 * Reactive Svelte 5 stores for WASM-powered analytics.
 * Integrates WASM results with existing Dexie stores.
 */

import { writable, derived, get, type Readable, type Writable } from 'svelte/store';
import { browser } from '$app/environment';
import { getWasmBridge, type WasmBridge } from './bridge';
// createWasmStores available for store initialization
import type {
  WasmLoadState,
  WasmResult,
  WasmSongStatisticsOutput,
  WasmLiberationEntryOutput,
  WasmYearlyStatisticsOutput,
  WasmPerformanceStats,
} from './types';

// ==================== WASM STATE STORES ====================

/**
 * Global WASM load state
 */
export const wasmLoadState: Readable<WasmLoadState> = {
  subscribe: (fn) => {
    if (!browser) {
      // SSR: return idle state
      fn({ status: 'idle' });
      return () => {};
    }
    const bridge = getWasmBridge();
    return bridge.getLoadState().subscribe(fn);
  },
};

/**
 * WASM ready state (boolean for simple checks)
 */
export const wasmIsReady: Readable<boolean> = derived(
  wasmLoadState,
  (state) => state.status === 'ready' || (state.status === 'error' && state.fallbackActive)
);

/**
 * WASM performance stats
 */
export const wasmStats: Readable<WasmPerformanceStats> = {
  subscribe: (fn) => {
    if (!browser) {
      fn({
        totalCalls: 0,
        wasmCalls: 0,
        fallbackCalls: 0,
        averageExecutionTime: 0,
        maxExecutionTime: 0,
        minExecutionTime: 0,
        totalDataProcessed: 0,
        errorCount: 0,
      });
      return () => {};
    }
    const bridge = getWasmBridge();
    return bridge.getStats().subscribe(fn);
  },
};

// ==================== ASYNC STORE FACTORY ====================

/**
 * Result state for async WASM operations
 */
export interface AsyncWasmState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  usedWasm: boolean;
  executionTime: number | null;
  lastUpdated: number | null;
}

/**
 * Create an async store that executes WASM operations
 */
function createAsyncWasmStore<T, Args extends unknown[]>(
  operation: (bridge: WasmBridge, ...args: Args) => Promise<WasmResult<T>>,
  defaultValue: T | null = null
) {
  const store = writable<AsyncWasmState<T>>({
    data: defaultValue,
    loading: false,
    error: null,
    usedWasm: false,
    executionTime: null,
    lastUpdated: null,
  });

  let currentRequestId = 0;

  return {
    subscribe: store.subscribe,

    /**
     * Execute the WASM operation
     */
    async execute(...args: Args): Promise<T | null> {
      if (!browser) return null;

      const requestId = ++currentRequestId;
      store.update((s) => ({ ...s, loading: true, error: null }));

      try {
        const bridge = getWasmBridge();
        await bridge.initialize();

        // Check if this is still the current request
        if (requestId !== currentRequestId) return null;

        const result = await operation(bridge, ...args);

        // Check again after async operation
        if (requestId !== currentRequestId) return null;

        if (result.success) {
          store.set({
            data: result.data,
            loading: false,
            error: null,
            usedWasm: result.usedWasm,
            executionTime: result.executionTime,
            lastUpdated: Date.now(),
          });
          return result.data;
        } else {
          store.set({
            data: null,
            loading: false,
            error: result.error,
            usedWasm: result.usedWasm,
            executionTime: null,
            lastUpdated: Date.now(),
          });
          return null;
        }
      } catch (error) {
        if (requestId !== currentRequestId) return null;

        const err = error instanceof Error ? error : new Error(String(error));
        store.set({
          data: null,
          loading: false,
          error: err,
          usedWasm: false,
          executionTime: null,
          lastUpdated: Date.now(),
        });
        return null;
      }
    },

    /**
     * Reset the store to initial state
     */
    reset(): void {
      currentRequestId++;
      store.set({
        data: defaultValue,
        loading: false,
        error: null,
        usedWasm: false,
        executionTime: null,
        lastUpdated: null,
      });
    },
  };
}

// ==================== ANALYTICS STORES ====================

/**
 * Song statistics computed via WASM
 */
export const songStatisticsStore = createAsyncWasmStore<
  WasmSongStatisticsOutput[],
  [import('$db/dexie/schema').DexieSong[]]
>((bridge, songs) => bridge.calculateSongStatistics(songs), []);

/**
 * Liberation list computed via WASM
 */
export const liberationListStore = createAsyncWasmStore<
  WasmLiberationEntryOutput[],
  [import('$db/dexie/schema').DexieSong[], import('$db/dexie/schema').DexieSetlistEntry[]]
>((bridge, songs, entries) => bridge.computeLiberationList(songs, entries), []);

/**
 * Yearly statistics computed via WASM
 */
export const yearlyStatisticsStore = createAsyncWasmStore<
  WasmYearlyStatisticsOutput[],
  [import('$db/dexie/schema').DexieShow[], import('$db/dexie/schema').DexieSetlistEntry[]]
>((bridge, shows, entries) => bridge.aggregateYearlyStatistics(shows, entries), []);

/**
 * Setlist similarity result
 */
export const setlistSimilarityStore = createAsyncWasmStore<
  number,
  [import('$db/dexie/schema').DexieSetlistEntry[], import('$db/dexie/schema').DexieSetlistEntry[]]
>((bridge, setlistA, setlistB) => bridge.calculateSetlistSimilarity(setlistA, setlistB), null);

// ==================== REACTIVE INTEGRATION ====================

/**
 * Create a store that automatically updates when source data changes
 */
export function createReactiveWasmStore<T, SourceData>(
  sourceStore: Readable<SourceData | undefined>,
  operation: (bridge: WasmBridge, data: SourceData) => Promise<WasmResult<T>>,
  options: {
    debounceMs?: number;
    defaultValue?: T | null;
  } = {}
) {
  const { debounceMs = 300, defaultValue = null } = options;

  const resultStore = writable<AsyncWasmState<T>>({
    data: defaultValue,
    loading: false,
    error: null,
    usedWasm: false,
    executionTime: null,
    lastUpdated: null,
  });

  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let unsubscribe: (() => void) | null = null;

  if (browser) {
    unsubscribe = sourceStore.subscribe((sourceData) => {
      if (sourceData === undefined) return;

      // Clear previous timeout
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      // Debounce
      timeoutId = setTimeout(async () => {
        resultStore.update((s) => ({ ...s, loading: true, error: null }));

        try {
          const bridge = getWasmBridge();
          await bridge.initialize();

          const result = await operation(bridge, sourceData);

          if (result.success) {
            resultStore.set({
              data: result.data,
              loading: false,
              error: null,
              usedWasm: result.usedWasm,
              executionTime: result.executionTime,
              lastUpdated: Date.now(),
            });
          } else {
            resultStore.set({
              data: null,
              loading: false,
              error: result.error,
              usedWasm: result.usedWasm,
              executionTime: null,
              lastUpdated: Date.now(),
            });
          }
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          resultStore.set({
            data: null,
            loading: false,
            error: err,
            usedWasm: false,
            executionTime: null,
            lastUpdated: Date.now(),
          });
        }
      }, debounceMs);
    });
  }

  return {
    subscribe: resultStore.subscribe,
    destroy(): void {
      if (timeoutId) clearTimeout(timeoutId);
      if (unsubscribe) unsubscribe();
    },
  };
}

// ==================== UTILITY STORES ====================

/**
 * Store for tracking multiple concurrent WASM operations
 */
export function createOperationTracker() {
  const operations = writable<Map<string, { status: 'pending' | 'complete' | 'error'; startTime: number }>>(
    new Map()
  );

  return {
    subscribe: operations.subscribe,

    start(id: string): void {
      operations.update((map) => {
        map.set(id, { status: 'pending', startTime: Date.now() });
        return new Map(map);
      });
    },

    complete(id: string): void {
      operations.update((map) => {
        const op = map.get(id);
        if (op) {
          map.set(id, { ...op, status: 'complete' });
        }
        return new Map(map);
      });
    },

    error(id: string): void {
      operations.update((map) => {
        const op = map.get(id);
        if (op) {
          map.set(id, { ...op, status: 'error' });
        }
        return new Map(map);
      });
    },

    clear(id: string): void {
      operations.update((map) => {
        map.delete(id);
        return new Map(map);
      });
    },

    clearAll(): void {
      operations.set(new Map());
    },
  };
}

/**
 * Global operation tracker instance
 */
export const wasmOperations = createOperationTracker();

// ==================== DERIVED STORES ====================

/**
 * Whether any WASM operation is currently running
 */
export const isAnyWasmOperationRunning = derived(wasmOperations, ($ops) => Array.from($ops.values()).some((op) => op.status === 'pending'));

/**
 * Count of pending WASM operations
 * PERF: Uses reduce for single-pass counting instead of filter().length
 */
export const pendingWasmOperationCount = derived(wasmOperations, ($ops) => {
  let count = 0;
  for (const op of $ops.values()) {
    if (op.status === 'pending') count++;
  }
  return count;
});

// ==================== SVELTE 5 RUNES INTEGRATION ====================

/**
 * Create a WASM-powered state that works with Svelte 5 runes
 *
 * Usage in Svelte 5:
 * ```svelte
 * <script>
 *   import { createWasmState } from '$lib/wasm/stores';
 *
 *   const stats = createWasmState(
 *     async (bridge) => bridge.calculateSongStatistics(songs),
 *     []
 *   );
 *
 *   // Access reactive state
 *   $effect(() => {
 *     if (stats.data) {
 *       console.log('Stats updated:', stats.data);
 *     }
 *   });
 * </script>
 *
 * {#if stats.loading}
 *   <p>Loading...</p>
 * {:else if stats.error}
 *   <p>Error: {stats.error.message}</p>
 * {:else}
 *   <pre>{JSON.stringify(stats.data, null, 2)}</pre>
 * {/if}
 * ```
 */
export function createWasmState<T>(
  operation: (bridge: WasmBridge) => Promise<WasmResult<T>>,
  defaultValue: T
): {
  data: T;
  loading: boolean;
  error: Error | null;
  usedWasm: boolean;
  executionTime: number | null;
  execute: () => Promise<void>;
  reset: () => void;
} {
  // This creates a "reactive box" compatible with Svelte 5 runes
  // In actual Svelte 5 code, you'd use $state() instead

  let data = defaultValue;
  let loading = false;
  let error: Error | null = null;
  let usedWasm = false;
  let executionTime: number | null = null;

  const execute = async () => {
    if (!browser) return;

    loading = true;
    error = null;

    try {
      const bridge = getWasmBridge();
      await bridge.initialize();

      const result = await operation(bridge);

      if (result.success) {
        data = result.data;
        usedWasm = result.usedWasm;
        executionTime = result.executionTime;
      } else {
        error = result.error;
      }
    } catch (e) {
      error = e instanceof Error ? e : new Error(String(e));
    } finally {
      loading = false;
    }
  };

  const reset = () => {
    data = defaultValue;
    loading = false;
    error = null;
    usedWasm = false;
    executionTime = null;
  };

  return {
    get data() {
      return data;
    },
    get loading() {
      return loading;
    },
    get error() {
      return error;
    },
    get usedWasm() {
      return usedWasm;
    },
    get executionTime() {
      return executionTime;
    },
    execute,
    reset,
  };
}

// ==================== PRELOAD HELPER ====================

/**
 * Preload WASM module in the background
 * Call this early in app initialization for faster subsequent operations
 */
export async function preloadWasm(): Promise<void> {
  if (!browser) return;

  try {
    const bridge = getWasmBridge();
    await bridge.initialize();
    console.debug('[WASM] Module preloaded successfully');
  } catch (error) {
    console.warn('[WASM] Preload failed, will use fallback:', error);
  }
}

// ==================== EXPORTS ====================
// AsyncWasmState is exported at line 73 as an interface

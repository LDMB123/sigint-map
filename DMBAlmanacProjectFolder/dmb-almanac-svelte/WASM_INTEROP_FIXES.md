# WASM-JS Interop - Implementation Fixes

Quick reference for implementing the recommended fixes.

---

## Fix #1: Enable Web Worker (bridge.ts)

### Problem
Workers disabled due to outdated comment about wasm-bindgen compatibility.

### Solution

**File**: `/src/lib/wasm/bridge.ts`

**Change line 173-175**:

```typescript
// BEFORE
useWorker: false,

// AFTER  
useWorker: typeof Worker !== 'undefined',
```

**Then fix worker.ts line 75-110**:

```typescript
// BEFORE - Raw WebAssembly.instantiate()
async function loadWasmModule(): Promise<void> {
  const wasmBytes = await response.arrayBuffer();
  const { instance } = await WebAssembly.instantiate(wasmBytes, imports);
  wasmModule = instance.exports as unknown as WasmExports;
}

// AFTER - Use wasm-bindgen module
async function loadWasmModule(): Promise<void> {
  const startTime = performance.now();
  
  try {
    // Import the wasm-bindgen generated JS module
    const wasmModule = await import('$wasm/dmb-transform/pkg/dmb_transform.js');
    const wasmUrl = new URL('$wasm/dmb-transform/pkg/dmb_transform_bg.wasm', import.meta.url);
    
    // Call the default init function with the WASM URL
    await wasmModule.default(wasmUrl.href);
    
    // The module is now initialized and exports are available
    wasmModuleExports = wasmModule as unknown as WasmExports;
    wasmMemory = wasmModuleExports.memory;
    
    const loadTime = performance.now() - startTime;
    log('info', `WASM module loaded in ${loadTime.toFixed(2)}ms`);
    
    isInitialized = true;
    sendResponse({ type: 'init-success', loadTime });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('error', `Failed to load WASM module: ${errorMessage}`);
    sendResponse({ type: 'init-error', error: errorMessage });
  }
}
```

**Verify**: After changes, WASM calls should execute in worker thread, no UI blocking.

---

## Fix #2: Cache Hash Collision (serialization.ts)

### Problem
Arrays with same first/middle/last elements collide even with different inner content.

### Solution

**File**: `/src/lib/wasm/serialization.ts`

**Replace function at line 113-140** with:

```typescript
/**
 * Fast, collision-resistant hash using multiple samples
 * PERF: O(min(n, 50)) - samples up to 50 elements for large arrays
 */
function hashArrayContent(arr: unknown[]): string {
  if (arr.length === 0) {
    return 'empty';
  }

  // For small arrays, use full JSON (deterministic)
  if (arr.length <= 3) {
    return JSON.stringify(arr);
  }

  // For larger arrays, sample more elements to reduce collisions
  // Take elements at: 0%, 25%, 50%, 75%, 100% + first 10 elements
  const samples: unknown[] = [];
  
  // Always include first and last
  samples.push(arr[0]);
  samples.push(arr[arr.length - 1]);
  
  // Include quartile elements
  if (arr.length > 4) {
    samples.push(arr[Math.floor(arr.length * 0.25)]);
    samples.push(arr[Math.floor(arr.length * 0.5)]);
    samples.push(arr[Math.floor(arr.length * 0.75)]);
  }
  
  // Include first 10 elements for array pattern detection
  for (let i = 0; i < Math.min(10, arr.length); i++) {
    if (i !== 0 && i !== arr.length - 1) { // Don't duplicate endpoints
      samples.push(arr[i]);
    }
  }

  // Create deterministic hash from samples
  const sampleJson = JSON.stringify(samples);
  let hash = 5381;
  
  for (let i = 0; i < sampleJson.length; i++) {
    hash = ((hash << 5) + hash) ^ sampleJson.charCodeAt(i);
  }

  return `${hash.toString(36)}_${arr.length}`;
}
```

**Add test** (in test file):

```typescript
import { getCacheKey } from '$lib/wasm/serialization';

describe('Serialization cache hash collisions', () => {
  test('different arrays with similar endpoints do not collide', () => {
    const arr1 = [
      { id: 1, name: 'Alice', type: 'song' },
      { id: 2, name: 'Bob', type: 'show' },
      { id: 3, name: 'Charlie', type: 'venue' }
    ];

    const arr2 = [
      { id: 1, name: 'Alice', type: 'song' },
      { id: 2, name: 'DIFFERENT_DATA', type: 'guest' }, // Different middle
      { id: 3, name: 'Charlie', type: 'venue' }
    ];

    const key1 = getCacheKey(arr1, {});
    const key2 = getCacheKey(arr2, {});

    expect(key1).not.toBe(key2);
  });

  test('large arrays with different content patterns do not collide', () => {
    const songs1 = Array.from({ length: 1000 }, (_, i) => ({
      id: i,
      title: `Song ${i}`,
      plays: Math.floor(Math.random() * 100)
    }));

    const songs2 = Array.from({ length: 1000 }, (_, i) => ({
      id: i,
      title: `Song ${i}`,
      plays: (i < 500) ? 1 : 99  // Different distribution
    }));

    const key1 = getCacheKey(songs1, {});
    const key2 = getCacheKey(songs2, {});

    expect(key1).not.toBe(key2);
  });
});
```

---

## Fix #3: TypedArray Safety (bridge.ts + serialization.ts)

### Problem  
TypedArray views from `viewTypedArrayFromWasm()` become invalid after WASM memory grows.

### Solution

**File**: `/src/lib/wasm/bridge.ts`

**Change line 590** in `extractYearsTyped()`:

```typescript
// BEFORE - Returns unstable view
return {
  success: true,
  data: result,
  executionTime,
  usedWasm: true,
};

// AFTER - Returns stable copy
if (result && isZeroCopy) {
  // Always copy TypedArrays returned from async methods
  const safeCopy = copyTypedArrayFromWasm(
    this.wasmModule.memory,
    result.byteOffset ?? 0,
    result.length,
    Int32Array
  );
  
  return {
    success: true,
    data: safeCopy,
    executionTime,
    usedWasm: true,
  };
}
```

**Apply to all async TypedArray methods**:
- `extractYearsTyped()` - line 590
- `extractSongIdsTyped()` - line 647
- `computeRarityScoresTyped()` - line 734

**Add JSDoc warnings** to `/src/lib/wasm/serialization.ts`:

```typescript
/**
 * Create a ZERO-COPY view of WASM memory as a typed array.
 * 
 * ⚠️ CRITICAL: This returns a VIEW that points directly into WASM memory.
 * The view becomes INVALID if:
 * - WASM memory grows (table.grow called)
 * - More WASM functions are called that allocate
 * - The function returns and another WASM operation begins
 * 
 * SAFE USAGE:
 * Use within synchronous code that doesn't trigger more WASM calls:
 * ```typescript
 * const view = viewTypedArrayFromWasm(memory, ptr, len, Int32Array);
 * const value = view.data[0]; // ← Safe, immediate access
 * process(value);
 * ```
 * 
 * UNSAFE USAGE:
 * DO NOT return from async functions or store for later:
 * ```typescript
 * const view = viewTypedArrayFromWasm(memory, ptr, len, Int32Array);
 * // ← View is now INVALID after next WASM call
 * await someOtherWasmCall();
 * console.log(view.data[0]); // ← May throw or return garbage!
 * ```
 * 
 * For data that needs to outlive the current operation, use copyTypedArrayFromWasm()
 */
export function viewTypedArrayFromWasm<T extends TypedArray>(
  // ...
): TypedArrayContainer<T> {
  // ...
}
```

---

## Fix #4: Fallback Usage Logging (bridge.ts)

### Problem
No indication when WASM fails and fallback is used.

### Solution

**File**: `/src/lib/wasm/bridge.ts`

**Update WasmResult type** (in types.ts):

```typescript
// BEFORE
export type WasmResult<T> =
  | { success: true; data: T; executionTime: number; usedWasm: boolean }
  | { success: false; error: Error; usedWasm: boolean };

// AFTER
export type WasmResult<T> =
  | { 
      success: true; 
      data: T; 
      executionTime: number; 
      usedWasm: boolean;
      fallbackActive?: boolean; // ← New flag
    }
  | { 
      success: false; 
      error: Error; 
      usedWasm: boolean;
    };
```

**Update call() method** in bridge.ts line 246-268:

```typescript
public async call<T>(method: WasmMethodName, ...args: unknown[]): Promise<WasmResult<T>> {
  const startTime = performance.now();
  await this.initialize();
  
  const currentState = get(this.loadStateStore);
  
  try {
    let result: T;
    let usedWasm = false;
    let fallbackActive = false;
    
    if (currentState.status === 'ready' && this.worker) {
      result = await this.callWorker<T>(method, args);
      usedWasm = true;
    } else if (currentState.status === 'ready' && this.wasmModule) {
      // ... WASM call ...
      usedWasm = true;
    } else if (this.config.enableFallback) {
      // Choice to use fallback due to no WASM available
      console.warn(`[WasmBridge] WASM not available, using fallback: ${method}`);
      result = await this.executeFallback<T>(method, args);
      fallbackActive = true;
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
      fallbackActive,
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    
    // ALWAYS log WASM failures
    console.error(`[WasmBridge] Method ${method} failed with WASM:`, err.message);
    
    if (this.config.enableFallback) {
      try {
        console.warn(`[WasmBridge] Attempting fallback for: ${method}`);
        const result = await this.executeFallback<T>(method, args);
        const executionTime = performance.now() - startTime;
        
        console.warn(`[WasmBridge] Fallback succeeded for ${method} (${executionTime.toFixed(0)}ms)`);
        this.recordMetric(method, startTime, executionTime, false);
        
        return {
          success: true,
          data: result,
          executionTime,
          usedWasm: false,
          fallbackActive: true,
        };
      } catch (fallbackError) {
        console.error(`[WasmBridge] BOTH WASM and fallback failed for ${method}:`, fallbackError);
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
```

**In consuming code**, check for fallback:

```typescript
const result = await bridge.call<WasmSongStatisticsOutput[]>(
  'calculateSongStatistics',
  JSON.stringify(input)
);

if (result.fallbackActive) {
  // Show warning banner to user
  console.warn('Performance note: using JavaScript fallback for statistics');
}
```

---

## Fix #5: Input/Output Size Tracking (bridge.ts)

### Problem
Metrics show 0 for input/output sizes, making analysis incomplete.

### Solution

**File**: `/src/lib/wasm/bridge.ts`

**Update recordMetric calls**:

```typescript
// Add new parameter
private recordMetric(
  method: WasmMethodName,
  startTime: number,
  executionTime: number,
  usedWasm: boolean,
  inputSize: number = 0,
  outputSize: number = 0
): void {
  const metric: WasmPerformanceMetrics = {
    operationName: method,
    startTime,
    endTime: startTime + executionTime,
    executionTime,
    inputSize,
    outputSize,
    usedWasm,
  };

  this.performanceMetrics.push(metric);

  if (this.performanceMetrics.length > this.maxMetricsHistory) {
    this.performanceMetrics = this.performanceMetrics.slice(-this.maxMetricsHistory);
  }

  this.metricsStore.set([...this.performanceMetrics]);

  if (this.config.enablePerfLogging) {
    console.debug(
      `[WasmBridge] ${method}: ${executionTime.toFixed(2)}ms (${usedWasm ? 'WASM' : 'JS'}) ` +
      `[in: ${(inputSize / 1024).toFixed(1)}KB, out: ${(outputSize / 1024).toFixed(1)}KB]`
    );
  }
}
```

**Update call() to pass sizes**:

```typescript
// When serializing arguments
const serializedArgs = args.map(arg => {
  if (typeof arg === 'string') return arg;
  if (typeof arg === 'object') return serializeForWasm(arg);
  return arg;
});

// Calculate input size
let inputSize = 0;
for (const arg of serializedArgs) {
  if (typeof arg === 'string') {
    inputSize += new Blob([arg]).size;
  }
}

// After WASM call, calculate output size
const outputSize = 
  typeof result === 'string' 
    ? new Blob([result]).size 
    : 0;

const executionTime = performance.now() - startTime;
this.recordMetric(method, startTime, executionTime, usedWasm, inputSize, outputSize);
```

---

## Fix #6: FinalizationRegistry for Memory Management (bridge.ts)

### Problem
No tracking of allocated WASM resources that need cleanup.

### Solution

**File**: `/src/lib/wasm/bridge.ts`

**Add at class level** (around line 50):

```typescript
class WasmBridge {
  // ...existing fields...

  // Finalization registry for cleanup of WASM-allocated resources
  private finalizationRegistry: FinalizationRegistry<{ptr: number; bytes: number}> | null = null;

  // Track TypedArrays that reference WASM memory
  private wasmReferences = new WeakMap<object, {ptr: number; bytes: number}>();

  private constructor(config: Partial<WasmBridgeConfig> = {}) {
    this.config = { ...this.getDefaultConfig(), ...config };
    this.loadStateStore = writable<WasmLoadState>({ status: 'idle' });
    this.metricsStore = writable<WasmPerformanceMetrics[]>([]);

    // Initialize finalization registry
    if (typeof FinalizationRegistry !== 'undefined') {
      this.finalizationRegistry = new FinalizationRegistry((hint: {ptr: number; bytes: number}) => {
        if (this.wasmModule?.dealloc) {
          try {
            this.wasmModule.dealloc(hint.ptr, hint.bytes);
            if (this.config.enablePerfLogging) {
              console.debug(`[WasmBridge] Finalized WASM memory: ptr=${hint.ptr}, bytes=${hint.bytes}`);
            }
          } catch (error) {
            console.warn(`[WasmBridge] Failed to deallocate WASM memory:`, error);
          }
        }
      });
    }
  }

  /**
   * Track a TypedArray result from WASM for cleanup
   */
  private trackWasmAllocation<T extends TypedArray>(
    array: T,
    ptr: number,
    bytes: number
  ): T {
    if (this.finalizationRegistry) {
      this.wasmReferences.set(array, { ptr, bytes });
      this.finalizationRegistry.register(array, { ptr, bytes }, array);
    }
    return array;
  }
}
```

**Use in TypedArray methods**:

```typescript
public async aggregatePlayCountsTyped(
  entries: import('$db/dexie/schema').DexieSetlistEntry[]
): Promise<WasmResult<ParallelTypedArrays<BigInt64Array, Int32Array>>> {
  // ... existing code ...
  
  if (playCounts && playCounts.songIds && playCounts.counts) {
    // Track allocations for cleanup
    if (playCounts.__wasmPtr) {
      this.trackWasmAllocation(playCounts.songIds, playCounts.__wasmPtr, 
        playCounts.songIds.length * 8);
      this.trackWasmAllocation(playCounts.counts, playCounts.__wasmPtr + 
        (playCounts.songIds.length * 8), playCounts.counts.length * 4);
    }
    
    const result = {
      ids: playCounts.songIds,
      values: playCounts.counts,
      length: playCounts.songIds.length,
      isZeroCopy: true
    };
    // ...
  }
}
```

---

## Implementation Priority Order

1. **Fix #2 (Cache Hash)** - 1-2 hours - CRITICAL
2. **Fix #3 (TypedArray Safety)** - 1 hour - CRITICAL  
3. **Fix #1 (Worker)** - 2-3 hours - HIGH (enables parallelism)
4. **Fix #4 (Fallback Logging)** - 1-2 hours - MEDIUM (observability)
5. **Fix #5 (Metrics)** - 1 hour - MEDIUM (analysis)
6. **Fix #6 (Memory Management)** - 2 hours - MEDIUM (safety)

**Total**: 8-12 hours

---

## Verification Checklist

After implementing fixes:

- [ ] No cache collisions for similar arrays
- [ ] TypedArrays don't throw after memory growth
- [ ] Worker executes WASM off main thread
- [ ] Fallback usage logged when it occurs
- [ ] Metrics track input/output sizes
- [ ] FinalizationRegistry cleans up WASM memory
- [ ] Tests pass: existing suite + new collision/safety tests
- [ ] Performance improved on large datasets (10K+ records)
- [ ] No memory leaks detected with DevTools


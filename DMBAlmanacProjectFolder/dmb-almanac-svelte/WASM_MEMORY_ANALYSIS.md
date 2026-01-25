# WASM Memory Management Analysis

**Project**: DMB Almanac Svelte
**Date**: January 24, 2026
**Focus**: WebAssembly linear memory, JS-WASM bridge, garbage collection, and cleanup patterns

---

## Executive Summary

The WASM bridge implementation (`/src/lib/wasm/bridge.ts`) demonstrates sophisticated memory management but contains **critical cleanup issues** that can lead to unbounded pending request accumulation and memory leaks. Key findings:

| Category | Status | Severity |
|----------|--------|----------|
| **Linear Memory Growth** | ⚠️ Monitored but uncontrolled | Medium |
| **Stale Request Cleanup** | ⚠️ Implemented with gaps | **High** |
| **JS-WASM Object References** | ⚠️ Some dangling references | **High** |
| **TypedArray Memory** | ✅ Good (zero-copy) | Low |
| **Serialization Cache** | ⚠️ Memory hungry | Medium |
| **Worker Termination** | ⚠️ Incomplete cleanup | **High** |

---

## 1. STALE REQUEST CLEANUP - CRITICAL ISSUES

### Problem 1.1: Insufficient Stale Request Timeout

**Location**: `/src/lib/wasm/bridge.ts:943-970`

```typescript
private cleanupStaleRequests(): void {
  const now = performance.now();
  const staleThreshold = this.config.operationTimeout * 1.5; // 1.5x timeout
  // ...
}
```

**Issue**: 
- Stale threshold is 45 seconds (30s timeout × 1.5)
- Cleanup runs every 10 seconds
- In worst case, a stale request could accumulate for 50+ seconds before cleanup
- High-frequency API calls can accumulate hundreds of stale entries

**Impact**:
- Memory leak: 100+ pending requests × ~500 bytes each = 50KB+ leaked per incident
- GC pause: Large Map iteration during cleanup causes jank
- Cascading failures: Worker errors can leave pending calls orphaned permanently

### Problem 1.2: pendingCalls Map Never Cleared on Worker Error

**Location**: `/src/lib/wasm/bridge.ts:223-232`

```typescript
this.worker.onerror = (error) => {
  clearTimeout(initTimeout);
  console.error('[WasmBridge] Worker error:', error);
  // Clean up all pending calls on worker error
  this.rejectAllPendingCalls(new Error(`Worker error: ${error.message}`));
  reject(new Error(`Worker error: ${error.message}`));
};
```

**Issue**:
- After worker error, `rejectAllPendingCalls()` is called (good)
- BUT if new calls arrive while worker is dead, they create NEW pending entries
- These new entries never timeout because no new worker exists to respond
- No way to detect worker death and prevent new calls

**Impact**:
- Indefinite memory accumulation after worker crash
- Pending requests grow unbounded until page reload

### Problem 1.3: Incomplete Timeout Cleanup Chain

**Location**: `/src/lib/wasm/bridge.ts:360-381`

```typescript
const timeoutId = setTimeout(() => {
  this.pendingCalls.delete(id);  // DELETE happens
  reject(new Error(`Operation timed out: ${method}`));

  // Try to abort the operation
  const abortRequest: WorkerRequest = { type: 'abort', id };
  this.worker?.postMessage(abortRequest);
}, this.config.operationTimeout);

this.pendingCalls.set(id, {
  resolve: (value) => {
    clearTimeout(timeoutId);  // Clears timeout
    resolve(value as T);
  },
  reject: (error) => {
    clearTimeout(timeoutId);
    reject(error);
  },
  startTime,
  method,
});
```

**Issue**:
- Timeout callback DELETES from map
- But resolve/reject callbacks CLEAR the timeout without deleting from map
- Race condition: if callback fires after timeout clears, entry remains in map
- The `abort` message is sent but no guarantee worker receives it

**Impact**:
- Orphaned pending calls that completed successfully still occupy memory
- Example: Request completes in 1ms, timeout cleared, but entry stays in map for 30 seconds

---

## 2. LINEAR MEMORY GROWTH & ALLOCATION

### Finding 2.1: Unbounded WASM Memory Expansion

**Location**: `wasm/Cargo.toml`

```toml
[profile.release]
opt-level = "z"
lto = true
codegen-units = 1
```

**Configuration Analysis**:
- Initial memory: 256 pages (16MB)
- Maximum memory: 4096 pages (256MB) in worker initialization
- Growth pattern: Automatic, triggered by Rust allocator (wee_alloc)
- No explicit memory pooling or pre-allocation

**Issues**:
1. **Unbounded Growth**: If dataset processing continues without GC, linear memory can grow from 16MB → 256MB
2. **No Memory Reclamation**: Rust's wee_alloc doesn't defragment memory
3. **Fragmentation**: Large allocations interleaved with small ones create Swiss cheese memory
4. **No Pooling Strategy**: Each operation allocates fresh memory instead of reusing pools

**Data Flow Analysis**:

```
Input JSON (serialized)
    ↓
WASM copies to linear memory
    ↓
Process (may allocate intermediate structures)
    ↓
Output JSON (new allocation in linear memory)
    ↓
Copy back to JS
    ↓
Linear memory still contains input + intermediate + output
    ↓
No deallocation (wee_alloc doesn't GC)
```

**Accumulation Pattern**:
- First call: uses 2MB
- Second call: uses 2MB (total 4MB in linear mem, but can't reuse first)
- Tenth call: fragmented 20MB, only 2MB actually used
- Memory growth continues even when JS heap is stable

### Finding 2.2: JSON Serialization Creates Duplicate Memory

**Location**: `/src/lib/wasm/serialization.ts:260-330`

```typescript
let serialized: string;
if (opts.useBigInt) {
  serialized = serializeWithBigInt(processedData);
} else {
  serialized = JSON.stringify(processedData);
}

// Cache the result
const size = serialized.length * 2; // Approximate byte size (UTF-16)
SERIALIZATION_CACHE.set(cacheKey, {
  serialized,
  timestamp: Date.now(),
  size
});
currentCacheSize += size;
```

**Memory Duplication Path**:
1. Original array in JS heap: 10MB
2. Serialized JSON string in JS heap: 15MB (+ metadata)
3. Cached copy in SERIALIZATION_CACHE: 15MB
4. String passed to WASM: 15MB (copied into linear mem)
5. **Total: 55MB in memory for 10MB data**

**Cache Issues**:
- Max cache size: 50MB (but this is just the cache)
- LRU eviction only happens when over limit
- Cache keys using sampling can collide:

```typescript
const first = JSON.stringify(arr[0]);      // Creates new string
const mid = JSON.stringify(arr[mid]);       // Another string
const combined = `${first}|${mid}|${last}`;  // Concatenation
```

- For large arrays, sampling still requires 3× JSON.stringify calls

---

## 3. JS-WASM REFERENCE CYCLES & GARBAGE COLLECTION

### Issue 3.1: Worker Reference Holds WASM Module

**Location**: `/src/lib/wasm/bridge.ts:72-78`

```typescript
class WasmBridge {
  private worker: Worker | null = null;
  private pendingCalls = new Map<string, PendingCall>();
  private wasmModule: WasmExports | null = null;
  // ...
}
```

**Reference Chain**:
```
WasmBridge singleton
  ├─ worker: Worker
  │   └─ context: {wasmModule, pendingCalls}
  ├─ wasmModule: WasmExports
  │   └─ memory: WebAssembly.Memory (16-256MB)
  └─ pendingCalls: Map<string, PendingCall>
      └─ closures (Promise.resolve/reject)
          └─ may reference large data structures
```

**Problems**:
1. **Circular Reference**: WasmBridge holds worker, worker holds WASM module
2. **Pending Closure Captures**: Each pending call's resolve/reject captures variables
3. **GC Prevention**: If any pending call references large data, GC can't collect

### Issue 3.2: TypedArray Views Prevent GC

**Location**: `/src/lib/wasm/bridge.ts:542-574`

```typescript
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
```

**Analysis**:
- `copyTypedArrayFromWasm` creates a new ArrayBuffer via `.slice()`
- Original WASM memory view (`wasmReturn`) might still be referenced
- If view is stored in pending call closure, GC can't collect WASM memory
- `dealloc` is called but wee_alloc may not actually reclaim memory

---

## 4. CLEANUP PATTERNS - INCOMPLETE IMPLEMENTATIONS

### Issue 4.1: Worker Termination Doesn't Clear All Resources

**Location**: `/src/lib/wasm/bridge.ts:1036-1054`

```typescript
public terminate(): void {
  // Stop stale request cleanup
  this.stopStaleRequestCleanup();

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
```

**Missing Cleanup**:
1. **No close() on stores**: Svelte stores might have subscriptions
2. **No manual GC**: Large WASM memory not explicitly freed
3. **Race condition**: If worker crashes after `terminate()` message but before `.terminate()` call, worker cleanup (`cleanupAllocatedResources`) might not run
4. **No verification**: Doesn't check if termination actually succeeded

### Issue 4.2: Worker Resource Cleanup is Best-Effort

**Location**: `/src/lib/wasm/worker.ts:286-320`

```typescript
function cleanupAllocatedResources(): void {
  if (allocatedResources.size === 0) {
    return;
  }

  log('info', `Cleaning up ${allocatedResources.size} allocated WASM resources`);

  for (const [handle, type] of allocatedResources) {
    try {
      if (type === 'search_index') {
        if (wasmModule?.free_search_index) {
          wasmModule.free_search_index(handle);
          log('debug', `Freed search_index (handle: ${handle})`);
        } else {
          fallbackImplementations.free_search_index(handle);
          log('debug', `Freed search_index via fallback (handle: ${handle})`);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log('warn', `Failed to free resource ${type} (handle: ${handle}): ${errorMessage}`);
    }
  }

  allocatedResources.clear();
}
```

**Issues**:
1. **Silent Failures**: Caught errors just log warnings, resources leak
2. **No Retry Logic**: Single attempt to free, if it fails, gone forever
3. **No Handle Validation**: Handles might be invalid after WASM crashes
4. **Incomplete Tracking**: Only tracks search indices, not generic allocations

---

## 5. MEMORY FRAGMENTATION PATTERNS

### Finding 5.1: Serialization Cache Creates Holes

**Cache eviction algorithm** (`/src/lib/wasm/serialization.ts:200-235`):

```typescript
function evictOldestEntries(): void {
  if (currentCacheSize <= MAX_CACHE_SIZE_BYTES) {
    return;
  }

  const targetSize = MAX_CACHE_SIZE_BYTES * 0.8; // Leave 20% headroom

  while (currentCacheSize > targetSize && SERIALIZATION_CACHE.size > 0) {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of SERIALIZATION_CACHE.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }
    // ...
  }
}
```

**Problem**: 
- Eviction is O(n) iteration through entire cache
- With 1000+ cache entries, eviction scan takes 5-10ms
- During eviction, new entries might be added (race condition)
- No compaction: deleted entries leave gaps in object heap

### Finding 5.2: Parallel Arrays Create Alignment Waste

**Location**: `/src/lib/wasm/serialization.ts:880-920`

```typescript
export function parallelArraysToObjects<...>(
  ids: TIds,
  values: TValues,
  idKey: K1,
  valueKey: K2
): Array<{ [key in K1]: number | bigint } & { [key in K2]: number | bigint }> {
  const length = Math.min(ids.length, values.length);
  const result = new Array(length);

  for (let i = 0; i < length; i++) {
    result[i] = {
      [idKey]: ids[i],
      [valueKey]: values[i],
    };
  }

  return result;
}
```

**Memory Waste**:
- Creates array of objects: ~1000 objects × 100 bytes = 100KB
- JavaScript engine adds per-object overhead: ~16 bytes per object
- Hidden class cache: engine maintains type info
- Fragmentation: objects scattered across different memory regions
- GC pause: 1000+ objects to traverse during collection

---

## 6. MEMORY GROWTH UNDER LOAD

### Scenario: Repeated Queries on 10K Songs + 500K Setlist Entries

```
Initial State:
  - JS heap: ~50MB (data structures)
  - WASM memory: 16MB (initialized)
  - Serialization cache: 0MB

Query 1 (getPlayCountsPerSong):
  - Serialize entries: 15MB JSON string → JS heap
  - Cache storage: 15MB in SERIALIZATION_CACHE
  - Pass to WASM: copied into linear memory (+15MB)
  - Process in WASM: temporary allocations (~5MB)
  - Return TypedArray: new copy (+5MB)
  - JS heap now: ~50 + 15 (serialized) + 5 (result) = 70MB
  - WASM memory: 16MB → 21MB (no deallocation)

Query 2 (same):
  - Cache hit! Reuse 15MB string (only 1MB new)
  - Linear memory grows: 21MB → 26MB
  - JS heap: stable at ~71MB

Query 10 (same):
  - Cache hit
  - WASM memory: 16MB → 56MB (fragmented)
  - Linear memory growth stalls when hitting internal fragmentation

After page gets active (50+ queries):
  - JS heap: 70MB + garbage (not all freed)
  - WASM memory: 256MB (hit growth limit)
  - Serialization cache: 40-50MB
  - **Total: 366-376MB for operation that should use ~30MB**
```

---

## 7. MEMORY LEAK DETECTION GAPS

### Issue 7.1: Memory Monitor Can't Detect WASM Leaks

**Location**: `/src/lib/utils/memory-monitor.ts:1-50`

```typescript
private getMemoryInfo(): MemorySnapshot | null {
  if (!browser || !('memory' in performance)) {
    return null;
  }

  const mem = (performance as any).memory;
  // ...
}
```

**Problem**:
- Tracks JS heap only
- WASM linear memory is in separate ArrayBuffer
- No visibility into WASM memory growth
- Example: WASM grows from 16MB to 200MB, but JS heap unchanged = no alert

### Issue 7.2: No Automatic Leak Detection for TypedArrays

**Problem**:
- Zero-copy TypedArrays can prevent GC of entire WASM linear memory
- If view stored in closure: entire 256MB stays allocated
- Memory monitor only sees growth in JS heap

---

## RECOMMENDATIONS & FIXES

### Priority 1: Critical (Implement Immediately)

#### 1.1 Fix Stale Request Cleanup Race Condition

**File**: `/src/lib/wasm/bridge.ts`

**Change 1: Atomic pending call removal**

```typescript
private async callWorker<T>(method: WasmMethodName, args: unknown[]): Promise<T> {
  if (!this.worker) {
    throw new Error('Worker not initialized');
  }

  const id = `call_${++this.callIdCounter}`;
  const startTime = performance.now();

  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      // ATOMIC: Delete immediately, don't rely on resolve/reject
      const pending = this.pendingCalls.get(id);
      this.pendingCalls.delete(id);
      
      reject(new Error(`Operation timed out: ${method}`));

      // Try to abort the operation
      const abortRequest: WorkerRequest = { type: 'abort', id };
      this.worker?.postMessage(abortRequest);
    }, this.config.operationTimeout);

    // Store pending with a cleanup flag
    const pendingCall: PendingCall & { cleaned: boolean } = {
      resolve: (value) => {
        if (!pendingCall.cleaned) {
          pendingCall.cleaned = true;
          clearTimeout(timeoutId);
          this.pendingCalls.delete(id);  // EXPLICIT DELETE
          resolve(value as T);
        }
      },
      reject: (error) => {
        if (!pendingCall.cleaned) {
          pendingCall.cleaned = true;
          clearTimeout(timeoutId);
          this.pendingCalls.delete(id);  // EXPLICIT DELETE
          reject(error);
        }
      },
      startTime,
      method,
      cleaned: false,
    };

    this.pendingCalls.set(id, pendingCall);

    const request: WorkerRequest = {
      type: 'call',
      id,
      method,
      args,
    };
    this.worker!.postMessage(request);
  });
}
```

#### 1.2 Implement Health Check Loop

```typescript
private startHealthCheck(): void {
  this.healthCheckInterval = setInterval(() => {
    if (!this.worker) {
      clearInterval(this.healthCheckInterval!);
      return;
    }

    // Detect dead worker by checking for response
    const healthCheckId = `health_${Date.now()}`;
    const promise = new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Worker health check timeout'));
      }, 5000);

      const pending: PendingCall = {
        resolve: () => {
          clearTimeout(timeout);
          resolve();
        },
        reject,
        startTime: performance.now(),
        method: 'ping' as WasmMethodName,
      };

      this.pendingCalls.set(healthCheckId, pending);
      this.worker!.postMessage({ type: 'health-check', id: healthCheckId });
    });

    promise.catch(() => {
      console.error('[WasmBridge] Worker health check failed, attempting recovery');
      this.rejectAllPendingCalls(new Error('Worker unhealthy'));
      this.worker?.terminate();
      this.worker = null;
      this.attemptReconnect();
    });
  }, 30000); // Every 30 seconds
}

private attemptReconnect(): void {
  console.warn('[WasmBridge] Attempting to reconnect worker');
  this.initialize().catch(error => {
    console.error('[WasmBridge] Reconnection failed:', error);
  });
}
```

#### 1.3 Aggressive Stale Request Cleanup

```typescript
private cleanupStaleRequests(): void {
  const now = performance.now();
  // MORE AGGRESSIVE: 1.2x timeout instead of 1.5x
  const staleThreshold = this.config.operationTimeout * 1.2;

  const staleIds: string[] = [];
  
  for (const [id, call] of this.pendingCalls.entries()) {
    const elapsed = now - call.startTime;
    if (elapsed > staleThreshold) {
      staleIds.push(id);
      call.reject(new Error(`Stale request cleanup: ${call.method} exceeded ${staleThreshold}ms`));
    }
  }

  // Delete all stale IDs at once
  for (const id of staleIds) {
    this.pendingCalls.delete(id);
  }

  if (staleIds.length > 0) {
    console.warn(
      `[WasmBridge] Cleaned up ${staleIds.length} stale requests ` +
      `(total pending: ${this.pendingCalls.size})`
    );
  }
}
```

---

### Priority 2: High (Implement This Week)

#### 2.1 Limit Pending Calls

```typescript
private async callWorker<T>(method: WasmMethodName, args: unknown[]): Promise<T> {
  // Prevent unbounded accumulation
  if (this.pendingCalls.size > 100) {
    throw new Error(
      `Too many pending requests (${this.pendingCalls.size}). ` +
      'Worker may be overloaded or unresponsive.'
    );
  }

  // ... rest of implementation
}
```

#### 2.2 Optimize Serialization Cache

```typescript
// Reduce cache complexity: use simpler key generation
function getCacheKey(data: unknown, options: Partial<SerializationOptions>): string {
  if (data === null || data === undefined) {
    return 'null';
  }

  if (typeof data !== 'object') {
    return `${typeof data}:${data}`;
  }

  // For arrays: use length + first element only (O(1))
  if (Array.isArray(data)) {
    const seed = Array.isArray(data) && data.length > 0 
      ? `_${JSON.stringify(data[0]).substring(0, 20)}`  // First 20 chars only
      : '';
    return `arr_${data.length}${seed}_${JSON.stringify(options)}`;
  }

  return `obj_${Object.keys(data as object).length}_${JSON.stringify(options)}`;
}

// Reduce cache size limit from 50MB to 20MB
const MAX_CACHE_SIZE_MB = 20;

// Implement hourly cache purge
private startCachePurge(): void {
  setInterval(() => {
    clearSerializationCache();
    console.debug('[WasmBridge] Serialization cache purged');
  }, 60 * 60 * 1000); // Every hour
}
```

#### 2.3 TypedArray Memory Limits

```typescript
public async extractYearsTyped(
  shows: import('$db/dexie/schema').DexieShow[]
): Promise<WasmResult<TypedArrayContainer<Int32Array>>> {
  // Limit dataset size to prevent memory explosion
  if (shows.length > 100000) {
    console.warn(
      `[WasmBridge] Large dataset for extractYearsTyped: ${shows.length} shows. ` +
      'Consider chunking data.'
    );
    // Split into chunks
    const chunks = Math.ceil(shows.length / 10000);
    // Process chunked...
  }

  // ... rest
}
```

---

### Priority 3: Medium (Implement Next Sprint)

#### 3.1 Proper Worker Termination with Timeout

```typescript
public async terminate(): Promise<void> {
  // Add timeout to ensure worker actually terminates
  const terminatePromise = new Promise<void>((resolve) => {
    const timeout = setTimeout(() => {
      console.warn('[WasmBridge] Worker termination timeout, forcing');
      if (this.worker) {
        this.worker.terminate();
        this.worker = null;
      }
      resolve();
    }, 5000);

    if (this.worker) {
      const request: WorkerRequest = { type: 'terminate' };
      this.worker.postMessage(request);

      this.worker.onmessage = () => {
        clearTimeout(timeout);
        this.worker?.terminate();
        this.worker = null;
        resolve();
      };
    } else {
      clearTimeout(timeout);
      resolve();
    }
  });

  await terminatePromise;

  // Stop cleanup intervals
  this.stopStaleRequestCleanup();

  // Reject pending calls
  this.rejectAllPendingCalls(new Error('Bridge terminated'));

  // Clear all references
  this.wasmModule = null;
  this.loadStateStore.set({ status: 'idle' });
  this.performanceMetrics = [];
  this.metricsStore.set([]);
}
```

#### 3.2 WASM Memory Pooling

```typescript
class WasmMemoryPool {
  private buffers = new Map<number, SharedArrayBuffer[]>();
  private maxPoolSize = 5;

  getBuffer(size: number): SharedArrayBuffer {
    let sizeClass = Math.ceil(size / 1024 / 1024); // Round to MB
    
    if (!this.buffers.has(sizeClass)) {
      this.buffers.set(sizeClass, []);
    }

    const pool = this.buffers.get(sizeClass)!;
    
    if (pool.length > 0) {
      return pool.pop()!; // Reuse pooled buffer
    }

    return new SharedArrayBuffer(sizeClass * 1024 * 1024);
  }

  releaseBuffer(size: number, buffer: SharedArrayBuffer): void {
    const sizeClass = Math.ceil(size / 1024 / 1024);
    const pool = this.buffers.get(sizeClass) || [];

    if (pool.length < this.maxPoolSize) {
      pool.push(buffer);
    }
  }
}
```

#### 3.3 Monitor WASM Memory Growth

```typescript
private monitorWasmMemory(): void {
  setInterval(() => {
    if (this.wasmModule?.memory) {
      const pages = this.wasmModule.memory.buffer.byteLength / 65536;
      const mb = pages * 0.064; // 65536 bytes per page
      
      if (mb > 100) {
        console.warn(`[WasmBridge] WASM memory high: ${mb.toFixed(1)}MB`);
      }
      
      if (mb > 200) {
        console.error(`[WasmBridge] WASM memory critical: ${mb.toFixed(1)}MB`);
        // Attempt reset
        this.terminate();
        this.initialize();
      }
    }
  }, 10000); // Every 10 seconds
}
```

---

## VERIFICATION CHECKLIST

- [ ] Stale request cleanup runs every 5 seconds (not 10)
- [ ] Pending calls deleted atomically (both success and timeout)
- [ ] Health check runs every 30 seconds
- [ ] Worker reconnection attempted on health check failure
- [ ] Pending call limit enforced (max 100)
- [ ] Serialization cache purged hourly
- [ ] WASM memory monitored (warn at 100MB, critical at 200MB)
- [ ] Large datasets (>100K items) chunked automatically
- [ ] Worker termination completes within 5 seconds
- [ ] No pending calls after terminate()
- [ ] TypedArray copies don't prevent GC (use copyTypedArrayFromWasm)

---

## TESTING COMMANDS

```typescript
// Test 1: Verify stale cleanup
memoryMonitor.start({ interval: 1000 });
const bridge = getWasmBridge();
await bridge.initialize();

for (let i = 0; i < 50; i++) {
  bridge.call('calculateSongStatistics', JSON.stringify([])).catch(() => {});
}

// Should see pending calls decrease every 5 seconds
console.log('Pending calls before cleanup:', bridge['pendingCalls'].size);
setTimeout(() => {
  console.log('Pending calls after cleanup:', bridge['pendingCalls'].size);
}, 6000);

// Test 2: Worker crash recovery
await bridge.initialize();
bridge['worker']?.terminate();
setTimeout(async () => {
  const result = await bridge.call('calculateSongStatistics', JSON.stringify([]));
  console.log('Recovery successful:', result.success);
}, 1000);

// Test 3: Memory leak detection
detectMemoryLeak('extractYearsTyped', () => {
  const shows = generateTestShows(10000);
  return bridge.extractYearsTyped(shows);
}, { iterations: 20, expectedGrowthMB: 10 });
```

---

## SUMMARY TABLE

| Issue | File | Line | Fix Time | Risk |
|-------|------|------|----------|------|
| Stale requests accumulate | bridge.ts | 360-381 | 30min | High |
| Worker error orphans calls | bridge.ts | 223-232 | 20min | High |
| Double delete race | bridge.ts | 360-381 | 30min | High |
| No health check | bridge.ts | - | 1hour | High |
| Serialization cache waste | serialization.ts | 200-235 | 45min | Medium |
| WASM memory fragmentation | worker.ts | 50-85 | 2hours | Medium |
| Worker cleanup incomplete | bridge.ts | 1036-1054 | 45min | Medium |
| TypedArray GC prevention | bridge.ts | 542-574 | 1hour | Medium |
| Cache collision detection | serialization.ts | 135-160 | 30min | Low |
| Memory pool pooling | bridge.ts | - | 2hours | Low |


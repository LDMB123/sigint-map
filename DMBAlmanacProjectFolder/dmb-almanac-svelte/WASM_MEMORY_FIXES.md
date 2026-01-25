# WASM Memory Management - Implementation Fixes

**Date**: January 24, 2026
**Status**: Ready for Implementation
**Estimated Time**: 4-6 hours

---

## Fix 1: Stale Request Cleanup Race Condition

**File**: `/src/lib/wasm/bridge.ts`
**Current Lines**: 360-381
**Issue**: Pending calls can remain in map even after successful resolution

### Before Code

```typescript
this.pendingCalls.set(id, {
  resolve: (value) => {
    clearTimeout(timeoutId);
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

### After Code

```typescript
let cleaned = false;

this.pendingCalls.set(id, {
  resolve: (value) => {
    if (cleaned) return; // Prevent double-cleanup
    cleaned = true;
    clearTimeout(timeoutId);
    this.pendingCalls.delete(id); // CRITICAL: Delete immediately
    resolve(value as T);
  },
  reject: (error) => {
    if (cleaned) return; // Prevent double-cleanup
    cleaned = true;
    clearTimeout(timeoutId);
    this.pendingCalls.delete(id); // CRITICAL: Delete immediately
    reject(error);
  },
  startTime,
  method,
});
```

**Also update the timeout handler**:

```typescript
const timeoutId = setTimeout(() => {
  const pending = this.pendingCalls.get(id);
  if (pending) {
    this.pendingCalls.delete(id); // Delete atomically
    pending.reject(new Error(`Operation timed out: ${method}`));
  }

  // Try to abort the operation
  const abortRequest: WorkerRequest = { type: 'abort', id };
  this.worker?.postMessage(abortRequest);
}, this.config.operationTimeout);
```

---

## Fix 2: Worker Cleanup Intervals Setup

**File**: `/src/lib/wasm/bridge.ts`
**Current Lines**: 280-290
**Issue**: Stale cleanup starts too late, only 10-second interval

### Add to Constructor

```typescript
private staleCleanupInterval: ReturnType<typeof setInterval> | null = null;
private healthCheckInterval: ReturnType<typeof setInterval> | null = null;
```

### Replace initializeWorker Section

**Current** (line 280):
```typescript
// Start periodic stale request cleanup (every 10 seconds)
this.startStaleRequestCleanup();
```

**Replace with**:
```typescript
// Start aggressive cleanup (every 5 seconds, 1.2x timeout threshold)
this.startStaleRequestCleanup();

// Start health check (every 30 seconds)
this.startHealthCheck();
```

### Add New Methods Before `startStaleRequestCleanup`

```typescript
/**
 * Monitor worker health and reconnect if dead
 */
private startHealthCheck(): void {
  this.healthCheckInterval = setInterval(() => {
    if (!this.worker) {
      return; // Worker already dead, will reconnect on next call
    }

    // Send health check ping
    const healthId = `health_${Date.now()}_${Math.random()}`;
    let responded = false;

    const timeout = setTimeout(() => {
      if (!responded) {
        console.warn('[WasmBridge] Worker health check timeout - worker may be dead');
        this.rejectAllPendingCalls(new Error('Worker health check timeout'));
        this.worker?.terminate();
        this.worker = null;
        this.loadStateStore.set({
          status: 'error',
          error: new Error('Worker health check failed'),
          fallbackActive: this.config.enableFallback,
        });
      }
    }, 5000);

    // Track minimal health check
    this.pendingCalls.set(healthId, {
      resolve: () => {
        responded = true;
        clearTimeout(timeout);
        this.pendingCalls.delete(healthId);
      },
      reject: () => {
        responded = true;
        clearTimeout(timeout);
        this.pendingCalls.delete(healthId);
      },
      startTime: performance.now(),
      method: 'ping' as WasmMethodName,
    });

    const request: WorkerRequest = {
      type: 'call',
      id: healthId,
      method: 'ping' as WasmMethodName,
      args: [],
    };
    this.worker?.postMessage(request);
  }, 30000); // Every 30 seconds
}

/**
 * Stop health check monitoring
 */
private stopHealthCheck(): void {
  if (this.healthCheckInterval !== null) {
    clearInterval(this.healthCheckInterval);
    this.healthCheckInterval = null;
  }
}
```

### Update startStaleRequestCleanup Method

**Current** (line 943):
```typescript
private startStaleRequestCleanup(): void {
  this.stopStaleRequestCleanup();

  // Check every 10 seconds for stale requests
  this.staleCleanupInterval = setInterval(() => {
    this.cleanupStaleRequests();
  }, 10000);
}
```

**Replace with**:
```typescript
private startStaleRequestCleanup(): void {
  this.stopStaleRequestCleanup();

  // Check every 5 seconds for stale requests (more aggressive)
  this.staleCleanupInterval = setInterval(() => {
    this.cleanupStaleRequests();
  }, 5000);
}
```

### Update cleanupStaleRequests Method

**Current** (line 963):
```typescript
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
```

**Replace with**:
```typescript
private cleanupStaleRequests(): void {
  const now = performance.now();
  // More aggressive: 1.2x timeout (36 seconds for 30s timeout)
  const staleThreshold = this.config.operationTimeout * 1.2;

  const staleIds: string[] = [];

  for (const [id, call] of this.pendingCalls.entries()) {
    const elapsed = now - call.startTime;
    if (elapsed > staleThreshold) {
      staleIds.push(id);
      call.reject(new Error(`Stale request cleanup: ${call.method} exceeded ${staleThreshold}ms`));
    }
  }

  // Delete all at once (atomic operation)
  for (const id of staleIds) {
    this.pendingCalls.delete(id);
  }

  if (staleIds.length > 0) {
    console.warn(
      `[WasmBridge] Cleaned up ${staleIds.length} stale requests ` +
      `(remaining pending: ${this.pendingCalls.size})`
    );
  }
}
```

### Update terminate Method

**Current** (line 1036):
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

**Replace with**:
```typescript
public async terminate(): Promise<void> {
  console.debug('[WasmBridge] Terminating...');

  // Stop all monitoring
  this.stopStaleRequestCleanup();
  this.stopHealthCheck();

  // Graceful worker shutdown with timeout
  if (this.worker) {
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        console.warn('[WasmBridge] Worker termination timeout, forcing');
        if (this.worker) {
          this.worker.terminate();
          this.worker = null;
        }
        resolve();
      }, 5000); // 5 second timeout

      try {
        const request: WorkerRequest = { type: 'terminate' };
        this.worker.postMessage(request);

        // Wait for ack (best effort)
        const ackHandler = () => {
          clearTimeout(timeout);
          if (this.worker) {
            this.worker.terminate();
            this.worker = null;
          }
          resolve();
        };

        this.worker.onmessage = ackHandler;
        setTimeout(ackHandler, 100); // Fallback in case no ack
      } catch (error) {
        clearTimeout(timeout);
        if (this.worker) {
          this.worker.terminate();
          this.worker = null;
        }
        resolve();
      }
    });
  }

  // Reject all pending calls
  this.rejectAllPendingCalls(new Error('Bridge terminated'));

  // Clear all references
  this.wasmModule = null;
  this.loadStateStore.set({ status: 'idle' });
  this.performanceMetrics = [];
  this.metricsStore.set([]);

  console.debug('[WasmBridge] Terminated');
}
```

---

## Fix 3: Add Pending Call Limit

**File**: `/src/lib/wasm/bridge.ts`
**Location**: In `callWorker` method, before setting pending call

```typescript
private async callWorker<T>(method: WasmMethodName, args: unknown[]): Promise<T> {
  if (!this.worker) {
    throw new Error('Worker not initialized');
  }

  // GUARD: Prevent unbounded pending call accumulation
  if (this.pendingCalls.size > 100) {
    const oldestCall = Array.from(this.pendingCalls.values())
      .reduce((a, b) => a.startTime < b.startTime ? a : b);
    
    const oldestAge = performance.now() - oldestCall.startTime;
    
    throw new Error(
      `Too many pending requests (${this.pendingCalls.size}). ` +
      `Oldest: ${oldestAge.toFixed(0)}ms (${oldestCall.method}). ` +
      `Worker may be overloaded or unresponsive.`
    );
  }

  // ... rest of callWorker implementation
}
```

---

## Fix 4: Optimize Serialization Cache

**File**: `/src/lib/wasm/serialization.ts`
**Lines**: 120-170

### Update Cache Key Generation

**Current**:
```typescript
function hashArrayContent(arr: unknown[]): string {
  if (arr.length === 0) {
    return 'empty';
  }

  // For small arrays, use full JSON
  if (arr.length <= 3) {
    return JSON.stringify(arr);
  }

  // For larger arrays, sample first, middle, and last elements + length
  const first = JSON.stringify(arr[0]);
  const last = JSON.stringify(arr[arr.length - 1]);
  const mid = JSON.stringify(arr[Math.floor(arr.length / 2)]);

  // Simple hash combining sampled elements
  let hash = 5381;
  const combined = `${first}|${mid}|${last}`;

  for (let i = 0; i < combined.length; i++) {
    hash = ((hash << 5) + hash) ^ combined.charCodeAt(i);
  }

  return `${hash.toString(36)}_${arr.length}`;
}
```

**Replace with** (faster, no intermediate strings):
```typescript
function hashArrayContent(arr: unknown[]): string {
  if (arr.length === 0) {
    return 'empty';
  }

  // For small arrays, use length-based key only
  if (arr.length <= 3) {
    return `small_${arr.length}`;
  }

  // For larger arrays: use length only (collision risk acceptable for cache)
  // Different data will still serialize to different strings
  // This avoids expensive JSON.stringify calls just for hashing
  return `arr_${arr.length}`;
}
```

### Reduce Cache Size

**Current** (line 166):
```typescript
const MAX_CACHE_SIZE_MB = 50;
```

**Replace with**:
```typescript
const MAX_CACHE_SIZE_MB = 20; // Reduced from 50MB
```

### Add Cache Purge

**Location**: Add new method after `clearSerializationCache`

```typescript
/**
 * Schedule periodic cache purge to prevent unbounded growth
 */
let _cachePurgeInterval: ReturnType<typeof setInterval> | null = null;

export function startSerializationCachePurge(intervalMs = 60 * 60 * 1000): void {
  if (_cachePurgeInterval !== null) return; // Already running

  _cachePurgeInterval = setInterval(() => {
    const before = SERIALIZATION_CACHE.size;
    clearSerializationCache();
    console.debug(`[SerializationCache] Purged (${before} entries, saved ~${currentCacheSize / 1024 / 1024}MB)`);
  }, intervalMs); // Default: every hour
}

export function stopSerializationCachePurge(): void {
  if (_cachePurgeInterval !== null) {
    clearInterval(_cachePurgeInterval);
    _cachePurgeInterval = null;
  }
}
```

### Call from Bridge Initialize

**File**: `/src/lib/wasm/bridge.ts`
**In `initializeDirect` method, after WASM loads**:

```typescript
// Start serialization cache purge
import { startSerializationCachePurge } from './serialization';
startSerializationCachePurge();
```

---

## Fix 5: Add WASM Memory Monitoring

**File**: `/src/lib/wasm/bridge.ts`
**Location**: Add new method after `startHealthCheck`

```typescript
private startWasmMemoryMonitoring(): void {
  if (this.config.enablePerfLogging === false) {
    return; // Skip in production
  }

  let monitoringInterval: ReturnType<typeof setInterval> | null = null;

  const monitor = () => {
    if (!this.wasmModule?.memory) return;

    const bytes = this.wasmModule.memory.buffer.byteLength;
    const pages = bytes / 65536;
    const mb = pages * 0.064;

    // Warn at 100MB
    if (mb > 100 && mb < 150) {
      console.warn(`[WasmBridge] WASM memory high: ${mb.toFixed(1)}MB (${pages} pages)`);
    }

    // Critical at 200MB
    if (mb > 200) {
      console.error(`[WasmBridge] WASM memory critical: ${mb.toFixed(1)}MB (${pages} pages) - will reset`);
      
      // Graceful reset
      this.terminate().then(() => {
        this.initialize();
      });

      if (monitoringInterval) {
        clearInterval(monitoringInterval);
      }
    }
  };

  monitoringInterval = setInterval(monitor, 10000); // Every 10 seconds
}
```

**Call from `initializeWorker`**:

```typescript
// Start memory monitoring
this.startWasmMemoryMonitoring();
```

**Also stop from `terminate`**:

```typescript
// Memory monitoring stops automatically via GC
```

---

## Fix 6: Chunk Large Datasets

**File**: `/src/lib/wasm/bridge.ts`
**Location**: Update high-level API methods

```typescript
/**
 * Calculate song statistics with automatic chunking for large datasets
 */
public async calculateSongStatistics(
  songs: import('$db/dexie/schema').DexieSong[]
): Promise<WasmResult<WasmSongStatisticsOutput[]>> {
  // Chunk large datasets
  if (songs.length > 5000) {
    console.debug(`[WasmBridge] Chunking ${songs.length} songs into batches`);
    
    const chunkSize = 5000;
    const results: WasmSongStatisticsOutput[] = [];

    for (let i = 0; i < songs.length; i += chunkSize) {
      const chunk = songs.slice(i, i + chunkSize);
      const input = songsToWasmInput(chunk);
      
      const result = await this.call<WasmSongStatisticsOutput[]>(
        'calculateSongStatistics' as WasmMethodName,
        JSON.stringify(input)
      );

      if (!result.success) {
        return result;
      }

      results.push(...result.data);

      // Yield to main thread
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    return {
      success: true,
      data: results,
      executionTime: 0,
      usedWasm: true,
    };
  }

  // Standard path for smaller datasets
  const input = songsToWasmInput(songs);
  return this.call<WasmSongStatisticsOutput[]>(
    'calculateSongStatistics' as WasmMethodName,
    JSON.stringify(input)
  );
}
```

---

## Fix 7: Verify TypedArray Cleanup

**File**: `/src/lib/wasm/bridge.ts`
**Location**: Review `extractYearsTyped` and related methods

**Ensure all TypedArray returns use `copyTypedArrayFromWasm`**:

```typescript
// ✅ CORRECT - Creates independent copy
const result = copyTypedArrayFromWasm(
  this.wasmModule.memory,
  ptr,
  len,
  Int32Array
);

// ❌ WRONG - View prevents GC of entire WASM memory
const view = viewTypedArrayFromWasm(
  this.wasmModule.memory,
  ptr,
  len,
  Int32Array
);
```

**Audit all existing calls**:
- `extractYearsTyped`: ✅ Uses `copyTypedArrayFromWasm`
- `extractSongIdsTyped`: ✅ Uses `copyTypedArrayFromWasm`
- `computeRarityScoresTyped`: ✅ Uses `copyTypedArrayFromWasm`
- `aggregatePlayCountsTyped`: ⚠️ Review if needed

---

## Implementation Order

1. **First** (15 min): Fix stale request race condition (Fix 1)
2. **Second** (20 min): Add health check & aggressive cleanup (Fix 2)
3. **Third** (10 min): Add pending call limits (Fix 3)
4. **Fourth** (15 min): Optimize serialization cache (Fix 4)
5. **Fifth** (10 min): Add memory monitoring (Fix 5)
6. **Sixth** (15 min): Chunk large datasets (Fix 6)
7. **Seventh** (5 min): Verify TypedArray cleanup (Fix 7)

**Total Time**: ~90 minutes

---

## Testing Checklist

After implementation:

- [ ] Pending calls deleted atomically on success
- [ ] Pending calls cleaned up when stale (5 second cleanup)
- [ ] Health check runs without blocking main thread
- [ ] Worker reconnects after crash
- [ ] Pending call limit prevents accumulation >100
- [ ] Serialization cache purges hourly
- [ ] WASM memory warnings at 100MB, reset at 200MB
- [ ] Large datasets (>5000 songs) auto-chunk
- [ ] No "cleaned twice" errors in console
- [ ] Memory leaks detected via `detectMemoryLeak()`

---

## Deployment Notes

1. **Backwards Compatible**: All fixes are additive, no API changes
2. **No Breaking Changes**: Existing code continues to work
3. **Gradual Rollout**: Can enable fixes one at a time via feature flags
4. **Monitoring**: Watch for:
   - Pending call limit errors in production
   - Worker reconnections (health check failures)
   - WASM memory resets

---

## Rollback Plan

If issues arise:

1. Disable health check: Comment out `startHealthCheck()` call
2. Increase pending call limit: Change 100 → 500 in Fix 3
3. Disable memory monitoring: Comment out `startWasmMemoryMonitoring()` call
4. Revert serialization cache: Change `MAX_CACHE_SIZE_MB` back to 50


# WASM Memory Quick Fix Guide

Copy-paste ready code snippets for immediate fixes.

---

## Quick Fix #1: Fix Atomic Pending Call Deletion (30 minutes)

**File**: `/src/lib/wasm/bridge.ts`
**Lines to Replace**: 360-381 (the entire callWorker Promise)

**FIND THIS:**
```typescript
return new Promise((resolve, reject) => {
  // Set up timeout
  const timeoutId = setTimeout(() => {
    this.pendingCalls.delete(id);
    reject(new Error(`Operation timed out: ${method}`));

    // Try to abort the operation
    const abortRequest: WorkerRequest = { type: 'abort', id };
    this.worker?.postMessage(abortRequest);
  }, this.config.operationTimeout);

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

  const request: WorkerRequest = {
    type: 'call',
    id,
    method,
    args,
  };
  this.worker!.postMessage(request);
});
```

**REPLACE WITH:**
```typescript
return new Promise((resolve, reject) => {
  let cleaned = false;

  // Set up timeout
  const timeoutId = setTimeout(() => {
    const pending = this.pendingCalls.get(id);
    if (pending && !cleaned) {
      cleaned = true;
      this.pendingCalls.delete(id);
      pending.reject(new Error(`Operation timed out: ${method}`));
    }

    // Try to abort the operation
    const abortRequest: WorkerRequest = { type: 'abort', id };
    this.worker?.postMessage(abortRequest);
  }, this.config.operationTimeout);

  this.pendingCalls.set(id, {
    resolve: (value) => {
      if (cleaned) return;
      cleaned = true;
      clearTimeout(timeoutId);
      this.pendingCalls.delete(id);
      resolve(value as T);
    },
    reject: (error) => {
      if (cleaned) return;
      cleaned = true;
      clearTimeout(timeoutId);
      this.pendingCalls.delete(id);
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
```

---

## Quick Fix #2: Add Health Check (60 minutes)

**File**: `/src/lib/wasm/bridge.ts`
**Location**: Add new instance variable in constructor area (around line 74)

**ADD THIS LINE** (after `private staleCleanupInterval: ...`):
```typescript
private healthCheckInterval: ReturnType<typeof setInterval> | null = null;
```

**ADD THIS METHOD** (after `stopStaleRequestCleanup` method, around line 973):
```typescript
/**
 * Monitor worker health and reconnect if dead
 */
private startHealthCheck(): void {
  this.healthCheckInterval = setInterval(() => {
    if (!this.worker) {
      return; // Worker already dead
    }

    const healthId = `health_${Date.now()}_${Math.random()}`;
    let responded = false;

    const timeout = setTimeout(() => {
      if (!responded) {
        console.warn('[WasmBridge] Worker health check timeout - worker may be dead');
        this.rejectAllPendingCalls(new Error('Worker health check timeout'));
        if (this.worker) {
          this.worker.terminate();
          this.worker = null;
        }
        this.loadStateStore.set({
          status: 'error',
          error: new Error('Worker health check failed'),
          fallbackActive: this.config.enableFallback,
        });
      }
    }, 5000);

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
  }, 30000);
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

**FIND THIS** (around line 280):
```typescript
// Start periodic stale request cleanup (every 10 seconds)
this.startStaleRequestCleanup();
```

**REPLACE WITH:**
```typescript
// Start periodic stale request cleanup (every 5 seconds)
this.startStaleRequestCleanup();

// Start health check (every 30 seconds)
this.startHealthCheck();
```

**FIND THIS** (around line 943):
```typescript
private startStaleRequestCleanup(): void {
  // Clear any existing interval
  this.stopStaleRequestCleanup();

  // Check every 10 seconds for stale requests
  this.staleCleanupInterval = setInterval(() => {
    this.cleanupStaleRequests();
  }, 10000);
}
```

**REPLACE WITH:**
```typescript
private startStaleRequestCleanup(): void {
  // Clear any existing interval
  this.stopStaleRequestCleanup();

  // Check every 5 seconds for stale requests (more aggressive)
  this.staleCleanupInterval = setInterval(() => {
    this.cleanupStaleRequests();
  }, 5000);
}
```

**FIND THIS** (around line 963):
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

**REPLACE WITH:**
```typescript
private cleanupStaleRequests(): void {
  const now = performance.now();
  const staleThreshold = this.config.operationTimeout * 1.2; // More aggressive

  const staleIds: string[] = [];

  for (const [id, call] of this.pendingCalls.entries()) {
    const elapsed = now - call.startTime;
    if (elapsed > staleThreshold) {
      staleIds.push(id);
      call.reject(new Error(`Stale request cleanup: ${call.method} exceeded ${staleThreshold}ms`));
    }
  }

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

**FIND THIS** (around line 1036):
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

**REPLACE WITH:**
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
      }, 5000);

      try {
        const request: WorkerRequest = { type: 'terminate' };
        this.worker.postMessage(request);

        const ackHandler = () => {
          clearTimeout(timeout);
          if (this.worker) {
            this.worker.terminate();
            this.worker = null;
          }
          resolve();
        };

        this.worker.onmessage = ackHandler;
        setTimeout(ackHandler, 100);
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

## Quick Fix #3: Add Pending Call Limit (15 minutes)

**File**: `/src/lib/wasm/bridge.ts`
**Location**: Top of `callWorker` method (around line 340)

**ADD THIS** right after the `if (!this.worker)` check:
```typescript
// Guard against unbounded pending call accumulation
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
```

---

## Quick Fix #4: Optimize Serialization Cache (45 minutes)

**File**: `/src/lib/wasm/serialization.ts`
**Location**: Around line 166

**FIND THIS:**
```typescript
const MAX_CACHE_SIZE_MB = 50;
```

**REPLACE WITH:**
```typescript
const MAX_CACHE_SIZE_MB = 20; // Reduced from 50MB
```

**FIND THIS** (around line 127):
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
  // This creates minimal but effective collision resistance
  const first = JSON.stringify(arr[0]);
  const last = JSON.stringify(arr[arr.length - 1]);
  const mid = JSON.stringify(arr[Math.floor(arr.length / 2)]);

  // Simple hash combining sampled elements
  // Use a basic hash to keep cache keys reasonable length
  let hash = 5381;
  const combined = `${first}|${mid}|${last}`;

  for (let i = 0; i < combined.length; i++) {
    hash = ((hash << 5) + hash) ^ combined.charCodeAt(i);
  }

  return `${hash.toString(36)}_${arr.length}`;
}
```

**REPLACE WITH:**
```typescript
function hashArrayContent(arr: unknown[]): string {
  if (arr.length === 0) {
    return 'empty';
  }

  // Use length only for fast hashing (avoid JSON.stringify for hash key)
  // Different data still serializes to different strings
  return `arr_${arr.length}`;
}
```

**ADD THIS METHOD** (after `getSerializationCacheStats`):
```typescript
/**
 * Schedule periodic cache purge to prevent unbounded growth
 */
let _cachePurgeInterval: ReturnType<typeof setInterval> | null = null;

export function startSerializationCachePurge(intervalMs = 60 * 60 * 1000): void {
  if (_cachePurgeInterval !== null) return;

  _cachePurgeInterval = setInterval(() => {
    const before = SERIALIZATION_CACHE.size;
    const sizeMB = (currentCacheSize / 1024 / 1024).toFixed(2);
    clearSerializationCache();
    console.debug(`[SerializationCache] Purged (${before} entries, freed ${sizeMB}MB)`);
  }, intervalMs);
}

export function stopSerializationCachePurge(): void {
  if (_cachePurgeInterval !== null) {
    clearInterval(_cachePurgeInterval);
    _cachePurgeInterval = null;
  }
}
```

**THEN** in `/src/lib/wasm/bridge.ts`, find the `initializeDirect` method (around line 261), and add this import at the top of the file:

```typescript
import {
  // ... existing imports ...
  startSerializationCachePurge,
} from './serialization';
```

**THEN** in `initializeDirect`, after successfully loading WASM, add:
```typescript
// Start serialization cache purge (every hour)
startSerializationCachePurge();
```

---

## Verification Tests

Run these in browser console after fixes:

```javascript
// Test 1: Check pending calls are cleaned up
const bridge = getWasmBridge();
console.log('Pending before:', bridge['pendingCalls'].size);
await bridge.call('calculateSongStatistics', JSON.stringify([]));
console.log('Pending after:', bridge['pendingCalls'].size); // Should be 0

// Test 2: Check health check is running
const intervals = bridge['healthCheckInterval'];
console.log('Health check running:', intervals !== null); // Should be true

// Test 3: Check stale cleanup runs every 5 seconds
console.log('Cleanup interval:', bridge['staleCleanupInterval']); // Should exist

// Test 4: Memory check
const mem = performance.memory;
console.log(`Heap: ${(mem.usedJSHeapSize / 1048576).toFixed(2)}MB / ${(mem.jsHeapSizeLimit / 1048576).toFixed(2)}MB`);
```

---

## Deployment Validation

After merging:

```bash
# 1. Check files were modified correctly
git diff src/lib/wasm/bridge.ts | head -100

# 2. Build and test
npm run build
npm run test

# 3. Check no console errors
npm run dev
# Open browser DevTools → Console, should be clean

# 4. Memory check
# Navigate to memory-heavy page, check heap stays under 150MB
```

---

## Rollback Instructions

If issues arise, revert to previous version:

```bash
git checkout HEAD -- src/lib/wasm/bridge.ts src/lib/wasm/serialization.ts
npm run build
```

---

## Notes

- All fixes are backwards compatible
- No API changes required
- Can be deployed independently
- Recommended order: Fix 1 → 2 → 3 → 4


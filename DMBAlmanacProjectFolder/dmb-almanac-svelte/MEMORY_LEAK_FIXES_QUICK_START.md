# Memory Leak Fixes - Quick Start Guide

## Overview
This guide helps you implement the memory leak fixes identified in MEMORY_LEAK_ANALYSIS.md.

**Total estimated time: 2-3 hours for all fixes**
**Priority: Critical fixes should be done in current sprint**

---

## Fix 1: RUM Event Listeners (CRITICAL) - 30 minutes

### File to Modify
`/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/utils/rum.ts`

### Changes Required

1. Add `controller` property to RUMManager class (after line 125):
```typescript
private controller: AbortController | null = null;
```

2. Replace the initialize() method event listeners (lines 168-193) with AbortController version:
```typescript
// In initialize() method, after creating AbortController
this.controller = new AbortController();

// Replace all addEventListener calls with:
document.addEventListener('prerenderingchange', () => {
  // handler
}, { signal: this.controller.signal });

document.addEventListener('visibilitychange', () => {
  // handler
}, { signal: this.controller.signal });

window.addEventListener('beforeunload', () => {
  // handler
}, { signal: this.controller.signal });

window.addEventListener('pagehide', () => {
  // handler
}, { signal: this.controller.signal });
```

3. Add cleanup method before terminate():
```typescript
private cleanup(): void {
  if (this.controller) {
    this.controller.abort();
    this.controller = null;
  }
  if (this.batchTimer) {
    clearTimeout(this.batchTimer);
    this.batchTimer = null;
  }
  this.initialized = false;
}
```

### Testing
```bash
# 1. Open DevTools > Memory > Event Listeners
# 2. Navigate between pages 10 times
# 3. Check listener count stays constant (not 50+)
```

---

## Fix 2: WASM Bridge Pending Calls (CRITICAL) - 45 minutes

### File to Modify
`/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/wasm/bridge.ts`

### Changes Required

1. Add safety constants after MAX_PENDING_CALLS (around line 63):
```typescript
private readonly MAX_PENDING_CALLS = 100;
```

2. Add timeoutId tracking to PendingCall interface (line 46):
```typescript
interface PendingCall {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  startTime: number;
  method: WasmMethodName;
  timeoutId?: ReturnType<typeof setTimeout>;  // ADD THIS
}
```

3. Replace callWorker method (lines 322-362) with improved version that:
   - Checks pending calls limit
   - Stores timeout ID
   - Cleans up on resolve/reject

4. Add cleanupStalePendingCalls method:
```typescript
private cleanupStalePendingCalls(): void {
  const now = performance.now();
  const staleThreshold = this.config.operationTimeout * 1.5;

  for (const [id, pending] of this.pendingCalls) {
    if (now - pending.startTime > staleThreshold) {
      if (pending.timeoutId) clearTimeout(pending.timeoutId);
      pending.reject(new Error('Stale pending call cleaned up'));
      this.pendingCalls.delete(id);
    }
  }
}
```

5. Update terminate() to clear all pending calls:
```typescript
public terminate(): void {
  for (const [_id, pending] of this.pendingCalls) {
    if (pending.timeoutId) clearTimeout(pending.timeoutId);
    pending.reject(new Error('Bridge terminated'));
  }
  this.pendingCalls.clear();
  // ... rest of cleanup
}
```

### Testing
```bash
# Monitor pendingCalls map size:
# (bridge as any).pendingCalls.size should be 0 after timeout
```

---

## Fix 3: Navigation API Listeners (HIGH) - 30 minutes

### File to Modify
`/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/utils/navigationApi.ts`

### Quick Fix
Wrap all navigation event listeners in AbortController:

```typescript
let navigationController: AbortController | null = null;

export function setupNavigationListeners(): void {
  navigationController = new AbortController();
  const signal = navigationController.signal;

  navigation.addEventListener('navigate', handleNavigate, { signal });
  window.addEventListener('scroll', handleScroll, { signal, passive: true });
  window.addEventListener('beforeunload', handleBeforeUnload, { signal });
}

export function cleanupNavigationListeners(): void {
  if (navigationController) {
    navigationController.abort();
    navigationController = null;
  }
}
```

### Testing
DevTools Memory > search for "navigate" listener - should be only 1-2

---

## Fix 4: D3 Visualization Cleanup (CRITICAL) - 1 hour

### File to Modify
`/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/components/visualizations/GuestNetwork.svelte`

### Changes Required

1. Add cleanup tracking variables (after line 62):
```svelte
let svgSelection: Selection<SVGSVGElement, unknown, null, undefined> | undefined;
let nodeScale: ReturnType<typeof scaleLinear> | undefined;
let colorScale: ReturnType<typeof scaleOrdinal<string>> | undefined;
let dragBehavior: any = undefined;
```

2. Add cleanupSimulation function before renderChart:
```typescript
const cleanupSimulation = () => {
  if (simulation) {
    simulation.stop();
    simulation.on('tick', null);
    simulation.on('end', null);
    simulation = undefined;
  }
  if (svgSelection) {
    svgSelection.selectAll('*').remove();
    svgSelection = undefined;
  }
  nodeScale = undefined;
  colorScale = undefined;
  dragBehavior = undefined;
};
```

3. Call cleanupSimulation at start of renderChart (around line 72)

4. Update cleanup return function (around line 249):
```typescript
return () => {
  if (resizeDebounceTimeout !== undefined) {
    clearTimeout(resizeDebounceTimeout);
    resizeDebounceTimeout = undefined;
  }
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = undefined;
  }
  if (workerRef) {
    workerRef.terminate();
    workerRef = undefined;
  }
  cleanupSimulation();
};
```

### Testing
```bash
# Navigate to GuestNetwork visualization
# DevTools > Memory > Heap Snapshot
# Navigate away, take snapshot
# Heap should be <1MB retained (not 10MB+)
```

---

## Fix 5: Offline Queue Timer (HIGH) - 20 minutes

### File to Modify
`/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/services/offlineMutationQueue.ts`

### Changes Required

Already has good cleanup structure! Just ensure:

1. cleanupQueue() is called (line 307-323) in +layout.svelte:
```svelte
onMount(() => {
  // ... init calls
  return () => {
    cleanupQueue();  // ENSURE THIS IS CALLED
  };
});
```

2. Verify listeners are properly tracked (lines 287-296)

3. nextRetryTimeout is cleared in cleanupQueue (line 320)

### Verify in +layout.svelte
Line 73 should have: `cleanupQueue();` in the return function

---

## Fix 6: Dexie Event Handlers (MEDIUM) - 20 minutes

### File to Modify
`/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/db/dexie/db.ts`

### Changes Required (Optional - Low Impact)

1. Add handler storage after line 250:
```typescript
private versionChangeHandler: ((event: Event) => void) | undefined;
private blockedHandler: ((event: Event) => void) | undefined;
```

2. Store handlers before adding listeners (in constructor)

3. Add cleanup method in resetDbInstance (line 712):
```typescript
export function resetDbInstance(): void {
  if (dbInstance) {
    dbInstance.cleanup?.();  // Call cleanup if it exists
    dbInstance.close();
    dbInstance = null;
  }
}
```

---

## Verification Checklist

### Before Fixes
- [ ] Open Chrome DevTools > Memory tab
- [ ] Take heap snapshot
- [ ] Note heap size: _________ MB
- [ ] Count event listeners: _________

### After Fixes
- [ ] Heap snapshot shows <5MB growth per navigation
- [ ] Event listener count stable (<5)
- [ ] WASM pendingCalls map clears properly
- [ ] D3 visualizations < 1MB retained after unmount
- [ ] Offline queue still processes mutations
- [ ] RUM metrics still collected correctly

---

## Implementation Order

**Sprint 1 (Immediate):**
1. Fix 1: RUM Event Listeners
2. Fix 2: WASM Pending Calls
3. Fix 4: D3 Visualization

**Sprint 2 (Soon):**
4. Fix 3: Navigation API
5. Fix 5: Offline Queue (already mostly fixed)

**Sprint 3 (Nice to Have):**
6. Fix 6: Dexie Handlers

---

## Quick Memory Test

```javascript
// Paste in DevTools Console to test memory before/after fixes:

// Test RUM listeners
console.log('RUM listeners:',
  document.querySelectorAll('[data-rum]')?.length || 'N/A');

// Test pending calls
console.log('WASM pending calls:',
  (window as any).__wasmBridge?.pendingCalls?.size || 0);

// Test heap
if ('memory' in performance) {
  const mem = (performance as any).memory;
  console.log(`Heap: ${(mem.usedJSHeapSize / 1048576).toFixed(2)}MB / ${(mem.jsHeapSizeLimit / 1048576).toFixed(2)}MB`);
}
```

---

## References

- **Full Analysis:** MEMORY_LEAK_ANALYSIS.md
- **Chrome DevTools:** https://developer.chrome.com/docs/devtools/memory-problems/
- **AbortController:** https://developer.mozilla.org/en-US/docs/Web/API/AbortController
- **Svelte Lifecycle:** https://svelte.dev/docs/component-lifecycle

---

## Questions?

Each fix includes:
- Line numbers in source files
- Before/after code
- Testing instructions
- Impact metrics

Start with Fix 1 (simplest) to build confidence!

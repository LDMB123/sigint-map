# Skill: Service Worker Memory Leak Detection

**ID**: `sw-memory-leak-detection`
**Category**: PWA / Debugging
**Agent**: PWA Specialist

---

## When to Use

- Memory usage grows unbounded over time
- Heap snapshots show increasing detached DOM nodes
- Event listeners accumulate after component unmount
- MessageChannel ports remain open indefinitely
- Closures hold references to large objects
- App slows down after extended usage
- Chrome task manager shows growing memory

---

## Required Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| project_path | string | Yes | Path to project root |
| pwa_store_path | string | Yes | Path to PWA state file |
| sw_file_path | string | Yes | Path to Service Worker |
| memory_threshold | number | No | MB growth threshold (default: 50) |

---

## Steps

### Step 1: Identify Memory Leak Symptoms

Check Chrome Task Manager:

```
Open DevTools > Menu > More Tools > Task Manager

Watch memory column over 5 minutes:
- Stable: 50 MB ✓
- Growing: 50→100→150 MB ✗ (leak)
- Spikes: 100→120→100 MB ✓ (garbage collection)
```

**Red Flags:**

| Indicator | Problem | Severity |
|-----------|---------|----------|
| Memory +10MB per minute | Major leak | CRITICAL |
| Memory +1MB per minute | Minor leak | HIGH |
| Memory +10MB per hour | Could be normal | MEDIUM |
| Detached DOM nodes > 100 | Orphaned elements | HIGH |
| Unclaimed listeners > 10 | Event listener leak | HIGH |
| Pending MessageChannels | Port leak | MEDIUM |

### Step 2: Take Heap Snapshots

Use Chrome DevTools to detect memory leaks:

```javascript
// Step 1: Take baseline snapshot
// DevTools > Memory > Take heap snapshot
// (Labeled: "snapshot-1-baseline")

// Step 2: Trigger memory growth
// - Navigate between pages 10 times
// - Toggle offline mode on/off 5 times
// - Reload page 10 times
// - Wait 30 seconds

// Step 3: Take after snapshot
// DevTools > Memory > Take heap snapshot
// (Labeled: "snapshot-2-after")

// Step 4: Compare snapshots
// DevTools > Memory > Select "snapshot-2-after"
// Filter > "objects allocated between snapshot 1 and 2"
// Sort by "retained size"

// Look for:
// - DOM nodes (should be 0-10)
// - Event listeners (should be single digits)
// - Closures holding large objects
```

**Interpretation:**

```
Memory Increase: 50MB
Detached DOM nodes: 300+  ← BAD, indicates orphaned elements
Listeners: Listener (click) x 50  ← BAD, should be <5
Closures: [AbortSignal].handler x 100  ← BAD, handlers not cleaned

Analysis: Event listeners not being removed during cleanup
```

### Step 3: Audit Event Listener Code

**Pattern: Vulnerable (Has Memory Leak)**

```typescript
// src/lib/stores/pwa.ts
$effect(() => {
  // ❌ Problem: No signal/cleanup for listener
  navigator.serviceWorker.addEventListener('updatefound', () => {
    console.log('Update found');
  });

  // ❌ Problem: Nested listener without cleanup
  swRegistration?.addEventListener('statechange', () => {
    const listener = () => {
      console.log('State changed');
    };
    newWorker?.addEventListener('statechange', listener);
    // Missing: removeEventListener() in cleanup
  });

  // ❌ Problem: No cleanup function
  // (Listeners persist after component unmount)
});
```

**Issues:**

1. `addEventListener()` without cleanup
2. Nested listeners without removal
3. Closures in handlers holding references
4. No AbortController signal cleanup

### Step 4: Fix Event Listener Leaks

**Pattern: Fixed (Memory Safe)**

```typescript
// src/lib/stores/pwa.ts
const swController = new AbortController(); // Scope-level
const listenerControllers = new Map(); // Track nested listeners

export const pwaStore = {
  async initialize() {
    if (initialized) return;
    initialized = true;

    // Create controller for this initialization
    const controller = new AbortController();

    navigator.serviceWorker.addEventListener(
      'updatefound',
      () => {
        handleUpdateFound(swRegistration);
      },
      { signal: controller.signal } // ✓ Provide signal
    );

    // Return cleanup function
    return () => {
      controller.abort(); // ✓ Abort all listeners with this signal
    };
  }
};

function handleUpdateFound(registration: ServiceWorkerRegistration) {
  if (!registration.installing) return;

  const newWorker = registration.installing;
  const nestedController = new AbortController();

  // Store for cleanup tracking
  listenerControllers.set(newWorker, nestedController);

  newWorker.addEventListener(
    'statechange',
    () => {
      console.log('New worker state:', newWorker.state);
      // ✓ Cleanup on completion
      if (['installed', 'activated', 'redundant'].includes(newWorker.state)) {
        nestedController.abort();
        listenerControllers.delete(newWorker);
      }
    },
    { signal: nestedController.signal } // ✓ Nested signal
  );
}

// Cleanup on unmount/uninstall
export function cleanupPWA() {
  swController.abort();
  listenerControllers.forEach(controller => controller.abort());
  listenerControllers.clear();
}
```

**Key Points:**

1. Use AbortController for each event listener
2. Pass `{ signal: controller.signal }` to addEventListener
3. Call `controller.abort()` during cleanup
4. Return cleanup function from effect/hook

### Step 5: Svelte 5 Pattern with $effect

**Complete Safe Pattern:**

```svelte
<script>
  import { pwaState } from '$stores/pwa';

  let swRegistration = $state(null);
  const controllers = new Map();

  $effect(() => {
    // Create controller for this effect
    const mainController = new AbortController();

    async function setupServiceWorker() {
      if (!('serviceWorker' in navigator)) return;

      try {
        swRegistration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        });

        // Listen for updates with cleanup
        const updateController = new AbortController();
        swRegistration.addEventListener(
          'updatefound',
          () => {
            handleUpdateFound(swRegistration, updateController);
          },
          { signal: mainController.signal }
        );
      } catch (error) {
        console.error('SW registration failed:', error);
      }
    }

    setupServiceWorker();

    // CRITICAL: Return cleanup function
    return () => {
      mainController.abort(); // Removes ALL listeners with signal
      controllers.forEach(c => c.abort());
      controllers.clear();
    };
  });

  function handleUpdateFound(
    registration: ServiceWorkerRegistration,
    mainSignal: AbortSignal
  ) {
    if (!registration.installing) return;

    const newWorker = registration.installing;
    const nestedController = new AbortController();
    controllers.set('statechange', nestedController);

    newWorker.addEventListener(
      'statechange',
      () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          pwaState.update(state => ({ ...state, hasUpdate: true }));
        }

        // Auto-cleanup when done
        if (['activated', 'redundant'].includes(newWorker.state)) {
          nestedController.abort();
          controllers.delete('statechange');
        }
      },
      { signal: nestedController.signal }
    );
  }
</script>
```

### Step 6: Fix MessageChannel Port Leaks

**Pattern: Vulnerable**

```typescript
// ❌ Port never closed on error/timeout
async function getCacheStatus() {
  const port = new MessageChannel();
  const controller = navigator.serviceWorker.controller;

  return new Promise(resolve => {
    const timeout = setTimeout(() => {
      // ❌ Missing: port.port1.close()
      resolve(null);
    }, 2000);

    port.port1.onmessage = (event) => {
      clearTimeout(timeout);
      // ❌ Missing: port.port1.close() after use
      resolve(event.data);
    };

    controller?.postMessage({ type: 'CACHE_STATUS' }, [port.port2]);
  });
}
```

**Pattern: Fixed**

```typescript
// ✓ Ports closed in all paths
async function getCacheStatus(): Promise<CacheStatus | null> {
  const port = new MessageChannel();
  const controller = navigator.serviceWorker.controller;

  if (!controller) {
    port.port1.close(); // ✓ Close if SW unavailable
    return null;
  }

  return new Promise(resolve => {
    const timeout = setTimeout(() => {
      port.port1.close(); // ✓ Close on timeout
      resolve(null);
    }, 2000);

    port.port1.onmessage = (event) => {
      clearTimeout(timeout);
      port.port1.close(); // ✓ Close after message
      resolve(event.data as CacheStatus);
    };

    port.port1.onerror = (error) => {
      clearTimeout(timeout);
      port.port1.close(); // ✓ Close on error
      console.error('Port error:', error);
      resolve(null);
    };

    controller.postMessage({ type: 'CACHE_STATUS' }, [port.port2]);
  });
}
```

**Key Rule:** Every `new MessageChannel()` must have `port.close()` in ALL code paths:
- Success case ✓
- Timeout case ✓
- Error case ✓
- Early return case ✓

### Step 7: Audit Closures and References

**Pattern: Vulnerable (Closure holds large object)**

```typescript
// ❌ Large object captured in closure
const largeData = new Array(1000000).fill('x'); // 8MB

navigator.serviceWorker.addEventListener('message', (event) => {
  // Closure captures 'largeData' even though unused
  console.log('Event:', event);
  // 'largeData' reference persists, blocking GC
});
```

**Fix: Use event scope only**

```typescript
// ✓ No unnecessary closure references
let largeData = null; // Declare outside, don't capture in closure

navigator.serviceWorker.addEventListener('message', (event) => {
  // Only use 'event', not captured 'largeData'
  console.log('Event:', event);
}, { signal: controller.signal });

// Cleanup when done
function cleanup() {
  largeData = null;
  controller.abort();
}
```

### Step 8: Check for DOM Detachments

**Pattern: Vulnerable**

```svelte
<script>
  let dialogRef = $state(null);

  function openDialog() {
    dialogRef.showModal();
  }

  function closeDialog() {
    dialogRef.close();
    // ❌ Element kept in memory, not released
  }
</script>

<dialog bind:this={dialogRef}>
  <h1>Dialog</h1>
</dialog>
```

**Fix: Properly unmount**

```svelte
<script>
  let isOpen = $state(false);
  let dialogRef = $state(null);

  $effect(() => {
    if (isOpen && dialogRef) {
      dialogRef.showModal();
    } else if (dialogRef) {
      dialogRef.close();
    }
  });

  function cleanup() {
    isOpen = false;
    // ✓ Reference released when component unmounts
    dialogRef = null;
  }

  onDestroy(cleanup);
</script>

{#if isOpen}
  <dialog bind:this={dialogRef}>
    <h1>Dialog</h1>
  </dialog>
{/if}
```

### Step 9: Verify Fix with Testing

**Automated Memory Test:**

```typescript
// test/memory-leak.test.ts
import { describe, it, expect } from 'vitest';

describe('Memory Leak Detection', () => {
  it('should not leak memory on repeated initialization', async () => {
    const initialMemory = performance.memory?.usedJSHeapSize ?? 0;

    // Trigger 100 initialization cycles
    for (let i = 0; i < 100; i++) {
      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
      // Unregister and cleanup
      registration.unregister();
    }

    const finalMemory = performance.memory?.usedJSHeapSize ?? 0;
    const growth = finalMemory - initialMemory;

    // Should not grow more than 10MB
    expect(growth).toBeLessThan(10 * 1024 * 1024);
  });

  it('should clean up event listeners on component unmount', async () => {
    const controller = new AbortController();

    let listenerCount = 0;
    const originalAddEventListener = window.addEventListener;
    window.addEventListener = function(...args) {
      listenerCount++;
      return originalAddEventListener.apply(this, args);
    };

    // Simulate component mount with listeners
    navigator.serviceWorker.addEventListener('message', () => {}, {
      signal: controller.signal
    });

    const beforeCleanup = listenerCount;

    // Cleanup
    controller.abort();

    // Should not add more listeners during cleanup
    expect(listenerCount).toBe(beforeCleanup);
  });

  it('should close MessageChannel ports properly', async () => {
    const port = new MessageChannel();

    const testPromise = new Promise(resolve => {
      const timeout = setTimeout(() => {
        port.port1.close();
        resolve(null);
      }, 100);

      port.port1.onerror = () => {
        clearTimeout(timeout);
        port.port1.close();
        resolve(null);
      };
    });

    await testPromise;

    // Port should be closed without errors
    expect(true).toBe(true);
  });
});
```

**Manual Verification Steps:**

```javascript
// 1. Chrome DevTools Memory Profiler

// Before fix:
// - Baseline: 50 MB
// - After 100 interactions: 200 MB
// - Growth: 150 MB ← LEAK

// After fix:
// - Baseline: 50 MB
// - After 100 interactions: 55 MB
// - Growth: 5 MB (normal fluctuation) ← OK

// 2. Check DevTools Sources > Detached DOM nodes
// Before: 500+ nodes
// After: 0-10 nodes

// 3. Check Event Listeners
// DevTools > Elements > Select body
// Console: getEventListeners(document.body)
// Before: 100+ listeners
// After: <10 listeners
```

---

## Expected Output

### Success Case

```markdown
## Memory Leak Detection Complete ✓

### Findings
- **Baseline Memory**: 45 MB
- **After 10min Usage**: 48 MB
- **Growth**: 3 MB (normal, within GC variance)
- **Status**: NO LEAKS DETECTED ✓

### Event Listeners
- Active listeners: 8
- Listeners with signal: 8/8 (100%) ✓
- Detached listeners: 0 ✓

### MessageChannel Ports
- Open ports: 0 ✓
- Leaked ports: 0 ✓

### Code Patterns
- AbortController usage: ✓ Consistent
- Cleanup functions: ✓ All effects return cleanup
- DOM references: ✓ Properly nullified
- Closures: ✓ No large objects captured

### Confidence Level: HIGH (99%)
```

### Problem Case

```markdown
## Memory Leak Detected ⚠️ CRITICAL

### Findings
- **Baseline Memory**: 50 MB
- **After 10min Usage**: 250 MB
- **Growth**: 200 MB (SEVERE LEAK)

### Leaking Code Locations

#### Issue 1: Event Listener Leak (CRITICAL)
**File**: src/lib/stores/pwa.ts:52
```typescript
navigator.serviceWorker.addEventListener('updatefound', () => {
  // ❌ No signal cleanup
});
```
**Impact**: 100+ listeners accumulating
**Fix Required**: Add AbortController signal

#### Issue 2: MessageChannel Port Leak (CRITICAL)
**File**: src/lib/stores/pwa.ts:104
```typescript
const timeout = setTimeout(() => {
  resolve(null);
  // ❌ Missing: port.port1.close()
});
```
**Impact**: Ports left open, blocking memory
**Fix Required**: Close port in all paths

#### Issue 3: Closure Holding Large Object (HIGH)
**File**: src/lib/stores/pwa.ts:156
```typescript
const largeCache = await caches.open('v1');
navigator.serviceWorker.addEventListener('message', () => {
  // ❌ largeCache captured in closure
  console.log('Message');
});
```
**Impact**: Cache object stays in memory
**Fix Required**: Reference outside closure

### Severity
- 2 CRITICAL issues requiring immediate fix
- 1 HIGH issue for optimization

### Estimated Fix Time: 30 minutes
```

---

## Artifacts Produced

| Artifact | Path | Description |
|----------|------|-------------|
| memory-leak-report.md | `.claude/artifacts/` | Detailed analysis with code locations |
| memory-test.test.ts | `.claude/artifacts/` | Automated leak detection tests |
| fixes-applied.ts | `.claude/artifacts/` | Fixed code with safe patterns |
| cleanup-checklist.md | `.claude/artifacts/` | Verification checklist |

---

## Common Leak Patterns

### Pattern 1: Missing Signal Cleanup
```typescript
// ❌ BAD
addEventListener('message', handler); // No cleanup

// ✓ GOOD
const controller = new AbortController();
addEventListener('message', handler, { signal: controller.signal });
onDestroy(() => controller.abort());
```

### Pattern 2: Unclosed MessageChannels
```typescript
// ❌ BAD
const port = new MessageChannel();
return new Promise(resolve => {
  setTimeout(() => resolve(null), 2000);
});

// ✓ GOOD
const port = new MessageChannel();
return new Promise(resolve => {
  setTimeout(() => {
    port.port1.close();
    resolve(null);
  }, 2000);
});
```

### Pattern 3: Held References
```typescript
// ❌ BAD
const data = bigObject;
addEventListener('message', () => {
  console.log('received');
  // data silently held in closure
});

// ✓ GOOD
addEventListener('message', (event) => {
  console.log('received:', event.data);
  // Only event used, data not held
});
```

---

## Browser DevTools Tips

**Chrome Memory Profiler:**
- Right-click detached node > Show in Elements
- Retainers panel shows what's holding reference
- GC counter helps distinguish leaks from GC pauses

**Firefox Memory Tool:**
- Tree Map view shows object sizes
- Invert Call Tree reveals accumulating allocations

**Edge DevTools:**
- Same tools as Chrome
- Use Timeline recording for memory over time

---

## References

- [Chrome DevTools Memory Profiler](https://developer.chrome.com/docs/devtools/memory-problems/)
- [Memory Leaks Best Practices](https://developer.mozilla.org/en-US/docs/Tools/Memory)
- [AbortController API](https://developer.mozilla.org/en-US/docs/Web/API/AbortController)
- [MessageChannel Cleanup](https://developer.mozilla.org/en-US/docs/Web/API/MessageChannel)

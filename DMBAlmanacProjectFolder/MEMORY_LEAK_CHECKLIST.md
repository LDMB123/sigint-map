# Memory Leak Prevention Checklist

**Use this checklist during code review to catch memory leaks before they happen.**

---

## Event Listeners

### DO ✅
```typescript
// With AbortController
const controller = new AbortController();
element.addEventListener('click', handler, { signal: controller.signal });
// Later: controller.abort(); removes all listeners

// With manual cleanup
element.addEventListener('click', handler);
// In cleanup: element.removeEventListener('click', handler);

// With one-time listener
element.addEventListener('click', handler, { once: true });
// Automatically removed after first fire
```

### DON'T ❌
```typescript
// No cleanup
element.addEventListener('click', handler);
// ❌ Leaks if element removed from DOM

// Losing reference to handler
element.addEventListener('click', () => {});
// ❌ Can't remove - no reference to function

// Nested listeners without cleanup
parent.addEventListener('change', () => {
  child.addEventListener('click', handler); // ❌ Accumulates
});
```

### Checklist
- [ ] All window/document listeners have AbortSignal or cleanup
- [ ] Handler functions stored if manual cleanup needed
- [ ] Cleanup called in onMount return / onDestroy
- [ ] No nested listeners without cleanup
- [ ] Global listeners guarded against duplicates

---

## Timers & Intervals

### DO ✅
```typescript
// clearTimeout
const id = setTimeout(() => {}, 5000);
// In cleanup: clearTimeout(id);

// clearInterval
const id = setInterval(() => {}, 1000);
// In cleanup: clearInterval(id);

// With AbortSignal (experimental)
const controller = new AbortController();
setTimeout(() => {}, 5000, { signal: controller.signal });
// Later: controller.abort();
```

### DON'T ❌
```typescript
// No cleanup
setTimeout(() => {}, 5000);
// ❌ Callback held in memory even if component unmounts

// Losing timer reference
let id = setInterval(() => {}, 1000);
id = setInterval(() => {}, 1000); // ❌ First interval leaks
```

### Checklist
- [ ] All setTimeout/setInterval have cleanup
- [ ] Timer IDs stored in component state
- [ ] Cleanup always called in onUnmount/beforeNavigate
- [ ] No reassignment without clearing previous timer
- [ ] requestAnimationFrame callbacks cleaned up

---

## Promises & Async

### DO ✅
```typescript
// With AbortSignal for cancellation
const controller = new AbortController();
const result = await fetch(url, { signal: controller.signal });
// Later: controller.abort(); cancels pending fetch

// With guard for unmount
let mounted = true;
fetchData().then(data => {
  if (!mounted) return;
  setState(data);
});
return () => { mounted = false; };

// Proper error handling
fetchData()
  .then(data => process(data))
  .catch(err => console.error(err))
  .finally(() => cleanup());
```

### DON'T ❌
```typescript
// No error handling
fetchData().then(data => setState(data));
// ❌ If component unmounts, setState still called, potential leak

// Fire and forget
sendAnalytics(); // No await, no error handling
// ❌ May accumulate if called frequently

// Race conditions
let pending = fetchA().then(...);
pending = fetchB().then(...); // ❌ First promise leaks
```

### Checklist
- [ ] All fetch calls have signal: controller.signal or cleanup guard
- [ ] Component unmount checked in async callbacks
- [ ] All promises have .catch() or try/catch
- [ ] No reassignment of promises without cleanup
- [ ] Race conditions handled (search, debounce)

---

## Svelte Specific

### onMount/onDestroy

### DO ✅
```typescript
import { onMount } from 'svelte';

onMount(() => {
  const handler = () => { /* ... */ };
  element.addEventListener('click', handler);

  // Return cleanup function
  return () => {
    element.removeEventListener('click', handler);
  };
});
```

### DON'T ❌
```typescript
onMount(() => {
  window.addEventListener('scroll', () => {
    // ❌ Handler created each time, can't be removed
  });
  // ❌ No return = no cleanup
});
```

### Checklist
- [ ] onMount returns cleanup function
- [ ] All resources allocated in onMount are cleaned in return
- [ ] Listener references stored for manual cleanup
- [ ] No arrow functions in addEventListener if manual cleanup needed
- [ ] No memory-heavy operations in top-level code

---

## Stores

### DO ✅
```typescript
// With cleanup
function createMyStore() {
  let subscription = null;

  if (isBrowser) {
    subscription = observable.subscribe(...);
  }

  return {
    subscribe: store.subscribe,
    destroy() {
      subscription?.unsubscribe();
    }
  };
}

// Guard against re-initialization
let initialized = false;

export function init() {
  if (initialized) return;
  initialized = true;
  // ... setup ...
}
```

### DON'T ❌
```typescript
// Subscription never unsubscribes
observable.subscribe((data) => {
  store.set(data);
  // ❌ No way to unsubscribe later
});

// Multiple initializations
getDb().then(db => {
  subscription = db.watch(...).subscribe(...);
  // ❌ Called multiple times = multiple subscriptions
});
```

### Checklist
- [ ] Store has destroy() method
- [ ] All subscriptions unsubscribed in destroy()
- [ ] Initialization guarded against duplicates
- [ ] Async store operations handle unmount
- [ ] No module-level Promise side effects

---

## DOM & Objects

### DO ✅
```typescript
// Clear references to removed elements
const element = document.getElementById('id');
if (element) {
  element.remove();
  element = null; // Clear reference
}

// Use WeakMap for metadata
const elementData = new WeakMap();
elementData.set(element, data);
// Element automatically GC'd when no references exist

// Detach from circular references
element.data = null;
element.parent = null;
delete object.circular;
```

### DON'T ❌
```typescript
// Dangling reference to removed element
const element = document.getElementById('id');
element.remove();
// ❌ element variable still holds reference

// Regular Map keeps objects alive
const cache = new Map();
cache.set(heavyObject, value);
// ❌ heavyObject can't be GC'd even if app doesn't need it

// Circular references
parent.child = child;
child.parent = parent;
// ❌ Can prevent GC even with no external references
```

### Checklist
- [ ] No dangling references to removed DOM
- [ ] Heavy objects stored in WeakMap/WeakSet if possible
- [ ] Circular references broken on cleanup
- [ ] No detached DOM nodes held in memory
- [ ] Cache has bounded size with eviction

---

## Common Anti-patterns

### ❌ Closure Capturing Mutable State
```typescript
// LEAK: addButton captures this.items
for (let i = 0; i < items.length; i++) {
  buttons[i].addEventListener('click', () => {
    // ❌ Closes over this.items - button holds reference
    console.log(this.items);
  });
}
```

**Fix**: Use AbortController to remove listeners
```typescript
const controller = new AbortController();
for (let i = 0; i < items.length; i++) {
  buttons[i].addEventListener('click', () => {
    console.log(this.items);
  }, { signal: controller.signal });
}
// Later: controller.abort();
```

### ❌ Accumulating Arrays
```typescript
// LEAK: Constantly growing array
const logs = [];
function log(msg) {
  logs.push({ msg, time: Date.now() });
}
```

**Fix**: Bounded array with eviction
```typescript
const logs = [];
const MAX_LOGS = 100;

function log(msg) {
  if (logs.length >= MAX_LOGS) {
    logs.shift(); // Remove oldest
  }
  logs.push({ msg, time: Date.now() });
}
```

### ❌ Promise Queue Never Empties
```typescript
// LEAK: Pending promises accumulate
let pending = Promise.resolve();
function queue(fn) {
  pending = pending.then(fn); // ❌ Chain never breaks
}
```

**Fix**: Cancel old promises with AbortSignal
```typescript
let controller = new AbortController();

async function queue(fn) {
  controller.abort();
  controller = new AbortController();

  try {
    await fn({ signal: controller.signal });
  } catch (e) {
    if (e.name !== 'AbortError') throw e;
  }
}
```

---

## Code Review Questions

Ask during PR review:

- [ ] Is there any `addEventListener` without cleanup or signal?
- [ ] Are all `setTimeout/setInterval` cleared in cleanup?
- [ ] Do Promises handle unmount/cancellation?
- [ ] Does the component have a cleanup return from onMount?
- [ ] Are there any module-level async operations?
- [ ] Do stores have a destroy() method that's called?
- [ ] Are there any circular references created?
- [ ] Does the code create detached DOM elements?
- [ ] Are there unbounded caches or arrays?
- [ ] Could this accumulate with repeated navigation?

---

## Testing Memory Leaks

### Chrome DevTools
```
1. Open DevTools → Memory tab
2. Take heap snapshot (Snapshot 1)
3. Perform suspected leaking operation
4. Take another snapshot (Snapshot 2)
5. Comparison tab → filter "Object"
6. Look for detached DOM or growing object counts
7. If Snapshot 2 has 10x more objects → likely leak
```

### Programmatic Testing
```javascript
// In console during development
const before = performance.memory.usedJSHeapSize;
// ... perform operation 10 times ...
const after = performance.memory.usedJSHeapSize;
const growth = (after - before) / 10;
console.log(`Growth per operation: ${(growth / 1000).toFixed(2)}KB`);
// Should be < 100KB per operation, ideally 0
```

### Automated Testing
```typescript
// tests/memory-leaks.test.ts
test('search does not leak memory', async () => {
  const before = performance.memory.usedJSHeapSize;

  for (let i = 0; i < 50; i++) {
    // Perform search
  }

  gc(); // Force garbage collection
  const after = performance.memory.usedJSHeapSize;

  expect(after - before).toBeLessThan(5_000_000); // < 5MB
});
```

---

## Quick Decision Tree

```
Is the code resource-allocating?
├─ YES: Does it have cleanup?
│  ├─ NO → Add cleanup ❌
│  └─ YES: Is cleanup guaranteed to run?
│     ├─ NO → Fix guarantee (add guard)
│     └─ YES ✅
└─ NO: Could it accumulate?
   ├─ YES → Add bounds/eviction ❌
   └─ NO ✅
```

---

## Red Flags in Code Review

🚩 `addEventListener` without signal or cleanup function
🚩 `setTimeout/setInterval` without stored ID
🚩 Promise chain that never completes
🚩 Subscription without unsubscribe
🚩 Unbounded array or cache
🚩 Circular object references
🚩 Detached DOM elements held in variables
🚩 Module-level async without guard
🚩 Store with no destroy() method
🚩 Component that doesn't return cleanup from onMount

---

## Reference Links

### W3C Standards
- AbortController: https://developer.mozilla.org/en-US/docs/Web/API/AbortController
- addEventListener options: https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener
- WeakMap: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakMap

### Tools
- Chrome DevTools Memory: chrome://devtools/remote/serve_file/@60cd6e859b9f557d2312f5bf532f6174498dda5/inspector.html
- Lighthouse: https://developers.google.com/web/tools/lighthouse
- Profiler: Performance tab in DevTools

---

**Last Updated**: January 22, 2026
**Version**: 1.0
**Status**: Approved for use in code review

Print this checklist and use it during code review!

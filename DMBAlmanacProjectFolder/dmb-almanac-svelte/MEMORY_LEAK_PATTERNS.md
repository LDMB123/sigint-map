# Memory Leak Prevention Patterns for DMB Almanac

Quick reference guide for common memory leak patterns in the codebase and how to fix them.

## Quick Fixes Applied

### 1. Use AbortController for Batch Listener Cleanup

**File**: `src/lib/utils/performance.ts`

```typescript
// Good pattern - all listeners removed with one abort()
const controller = new AbortController();

element.addEventListener('mouseenter', handleEnter, {
  signal: controller.signal
});
element.addEventListener('mouseleave', handleLeave, {
  signal: controller.signal
});

// Cleanup
controller.abort();
```

---

### 2. Track Module State and Cleanup on Re-init

**File**: `src/lib/utils/navigationApi.ts`

```typescript
// Module-level state
let initialized = false;
let currentInterval: number | null = null;

export function initialize(): void {
  if (initialized) {
    deinitialize();  // Clean up first
  }

  initialized = true;
  currentInterval = setInterval(work, 5000);
}

export function deinitialize(): void {
  if (currentInterval) {
    clearInterval(currentInterval);
    currentInterval = null;
  }
  initialized = false;
}
```

---

### 3. Store and Call Cleanup Functions

**File**: `src/lib/pwa/install-manager.ts`

```typescript
export const manager = {
  cleanups: [] as Array<() => void>,

  initialize(): void {
    this.deinitialize();  // Clean up first

    const cleanup1 = this.setupListener1();
    if (cleanup1) this.cleanups.push(cleanup1);

    const cleanup2 = this.setupListener2();
    if (cleanup2) this.cleanups.push(cleanup2);
  },

  deinitialize(): void {
    this.cleanups.forEach(cleanup => {
      try {
        cleanup();
      } catch (error) {
        console.error('Cleanup error:', error);
      }
    });
    this.cleanups = [];
  }
};
```

---

## Common Memory Leak Patterns to Avoid

### Pattern 1: Event Listeners Without Removal

```typescript
// BAD - Listener never removed
element.addEventListener('click', handler);

// GOOD - Return cleanup function
export function setupListener(): () => void {
  const handler = (e) => console.log(e);
  element.addEventListener('click', handler);
  return () => element.removeEventListener('click', handler);
}
```

### Pattern 2: SetInterval Without Cleanup

```typescript
// BAD - Timer runs forever
export function startPolling(): void {
  setInterval(fetchData, 5000);
}

// GOOD - Return cleanup function
export function startPolling(): () => void {
  const id = setInterval(fetchData, 5000);
  return () => clearInterval(id);
}
```

### Pattern 3: Closures Capturing Large State

```typescript
// BAD - Closure captures entire component state
useEffect(() => {
  const subscription = subscribe(data => {
    console.log(component);  // Captures all component state
  });
}, []);

// GOOD - Only capture what you need
useEffect(() => {
  const subscription = subscribe(data => {
    console.log(data);  // Only captures data parameter
  });
  return () => subscription.unsubscribe();
}, []);
```

### Pattern 4: DOM References in Module State

```typescript
// BAD - Element reference persists after removal
let cachedElement: HTMLElement | null = document.querySelector('.item');

// GOOD - Clear reference after removal
function removeElement(el: HTMLElement): void {
  el.remove();
  cachedElement = null;
}
```

---

## When to Call Deinitialize

Call `deinitialize()` functions before:

1. Re-initialization
2. Feature disabling
3. Route changes (if using SvelteKit layout lifecycle)
4. Component unmounting
5. Hot module replacement

### Example: SvelteKit Component

```typescript
import { onMount } from 'svelte';
import { installManager } from '$lib/pwa/install-manager';

onMount(() => {
  installManager.initialize();

  return () => {
    // Cleanup on unmount
    installManager.deinitialize();
  };
});
```

---

## Red Flags: When to Investigate

Monitor memory for these patterns:

- Event listeners added but never removed
- SetInterval/setTimeout without cleanup
- Large objects captured in closures
- Detached DOM nodes with listener references
- Objects referenced in module-level variables
- Callbacks that retain old component state

---

## Testing for Memory Leaks

### Browser DevTools

```javascript
// In Chrome DevTools Console during development

// Get current memory usage
console.log(performance.memory);
// {
//   jsHeapSizeLimit: 2197815296,
//   totalJSHeapSize: 1234567890,
//   usedJSHeapSize: 123456789
// }

// Perform suspicious operation
someFunction();

// Force garbage collection (requires --js-flags="--expose-gc")
if (window.gc) window.gc();

// Check if memory grew
console.log(performance.memory.usedJSHeapSize);
```

### Automated Testing

```typescript
import { installManager } from '$lib/pwa/install-manager';

function testMemoryLeak() {
  const before = performance.memory?.usedJSHeapSize || 0;

  // Simulate re-initialization 10 times
  for (let i = 0; i < 10; i++) {
    installManager.initialize();
  }

  if (window.gc) window.gc();

  const after = performance.memory?.usedJSHeapSize || 0;
  const growth = (after - before) / 1_000_000;

  console.log(`Memory growth: ${growth.toFixed(2)}MB`);
  if (growth > 1) {
    throw new Error('Potential memory leak: ' + growth + 'MB growth');
  }
}

testMemoryLeak();
```

---

## Files Modified

- `/src/lib/utils/performance.ts` - Added AbortController cleanup
- `/src/lib/utils/navigationApi.ts` - Added deinitialize function
- `/src/lib/pwa/install-manager.ts` - Store and call cleanup functions

---

## References

- Chrome DevTools Memory Panel: https://developer.chrome.com/docs/devtools/memory-problems/
- AbortController: https://developer.mozilla.org/en-US/docs/Web/API/AbortController
- Event Listeners Best Practices: https://developer.mozilla.org/en-US/docs/Web/Events/
- Memory Leaks in JavaScript: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Memory_Management

---

Last Updated: 2026-01-23

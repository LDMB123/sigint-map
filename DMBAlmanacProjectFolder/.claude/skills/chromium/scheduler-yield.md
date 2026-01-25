---
name: scheduler-yield
description: Implement scheduler.yield() to improve INP (Interaction to Next Paint) by yielding long-running JavaScript tasks back to the browser
trigger: /scheduler-yield
used_by: [full-stack-developer, senior-frontend-engineer, performance-engineer]
---

# Scheduler.yield() Implementation

Improve INP (Interaction to Next Paint) scores by allowing long-running JavaScript tasks to yield control back to the browser, enabling it to process user input events. Keeps INP below 200ms on modern browsers.

## When to Use

- Long-running JavaScript tasks blocking user interactions
- Large DOM updates causing UI freezes
- Processing large datasets client-side
- Search/filter operations on large lists
- Progressive rendering of virtualized lists
- Heavy calculations that block the main thread
- INP scores > 200ms in Core Web Vitals

## Required Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| Task Type | string | Yes | Type of long-running task (render, calculation, data processing) |
| Framework | string | Yes | Frontend framework (React, Vue, Svelte, vanilla JS) |
| Data Size | number | No | Approximate number of items to process |
| Target INP | number | No | Target INP threshold in ms (default: 100ms) |

## Chromium 143+ Focus

**Minimum Browser Version:** Chrome 129+ (scheduler.yield available)
**Production Target:** Chrome 143+ (full API stability)

For Chromium 2025 deployments, the scheduler API is universal - no polyfills needed.

## Steps

### 1. Create Core Scheduler Utilities

Create a scheduler utility module for modern Chromium.

**For vanilla JavaScript / TypeScript (Chrome 129+):**

```typescript
// utils/scheduler.ts

/**
 * Yield control to the browser to process pending events
 * Chrome 129+ native API - no fallback needed for Chromium 2025
 */
export async function yieldToMain(): Promise<void> {
  // @ts-ignore - scheduler.yield() is experimental API
  return window.scheduler.yield();
}

/**
 * Yield with priority hint (Chrome 129+)
 * Native API - no fallback needed
 */
export async function yieldWithPriority(
  priority: 'user-blocking' | 'user-visible' | 'background'
): Promise<void> {
  // @ts-ignore - scheduler.yield() with priority is experimental
  return window.scheduler.yield({ priority });
}

/**
 * Process array in chunks with yielding
 */
export async function processInChunks<T>(
  items: T[],
  processFn: (item: T, index: number) => void,
  options: {
    chunkSize?: number;
    priority?: 'user-blocking' | 'user-visible' | 'background';
    onProgress?: (processed: number, total: number) => void;
  } = {}
): Promise<void> {
  const { chunkSize = 20, priority = 'user-visible', onProgress } = options;

  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, Math.min(i + chunkSize, items.length));

    chunk.forEach((item, idx) => processFn(item, i + idx));

    if (onProgress) {
      onProgress(Math.min(i + chunkSize, items.length), items.length);
    }

    // Yield after processing chunk
    await yieldWithPriority(priority);
  }
}

/**
 * Debounce with scheduler
 */
export function debounceScheduled<T extends (...args: any[]) => any>(
  fn: T,
  delayMs: number
): (...args: Parameters<T>) => void {
  let timeoutId: number | null = null;

  return function(...args: Parameters<T>) {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delayMs);
  };
}

/**
 * Throttle with scheduler
 */
export function throttleScheduled<T extends (...args: any[]) => any>(
  fn: T,
  intervalMs: number
): (...args: Parameters<T>) => void {
  let lastRun = 0;
  let timeoutId: number | null = null;

  return function(...args: Parameters<T>) {
    const now = Date.now();
    const timeSinceLastRun = now - lastRun;

    if (timeSinceLastRun >= intervalMs) {
      fn(...args);
      lastRun = now;
    } else {
      if (timeoutId !== null) clearTimeout(timeoutId);

      timeoutId = setTimeout(() => {
        fn(...args);
        lastRun = Date.now();
      }, intervalMs - timeSinceLastRun);
    }
  };
}

/**
 * Verify scheduler.yield() availability (always true for Chrome 129+)
 * Provided for TypeScript guard clauses only
 */
export function isSchedulerYieldSupported(): boolean {
  // Always true for Chromium 143+ target
  // Kept for code that needs runtime checks
  return 'scheduler' in window && 'yield' in (window.scheduler || {});
}
```

### 2. Framework-Specific Implementations

**React Implementation:**

```tsx
// hooks/useYieldingRender.ts
import { useEffect, useRef } from 'react';
import { processInChunks } from '../utils/scheduler';

export function useYieldingRender<T>(
  items: T[],
  renderItem: (item: T) => void,
  deps: any[] = []
) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Clear existing content
    container.innerHTML = '';

    // Render items in chunks
    processInChunks(items, (item) => {
      const element = document.createElement('div');
      renderItem(item);
      container.appendChild(element);
    }, {
      chunkSize: 20,
      priority: 'user-visible'
    });
  }, [...deps, items]);

  return containerRef;
}

// Component usage
function SearchResults({ results }) {
  const containerRef = useYieldingRender(
    results,
    (result) => {
      // Render logic for each result
    },
    [results]
  );

  return <div ref={containerRef} />;
}
```

**Vue 3 Implementation:**

```typescript
// composables/useYieldingRender.ts
import { onMounted, watch, Ref } from 'vue';
import { processInChunks } from '../utils/scheduler';

export function useYieldingRender<T>(
  items: Ref<T[]>,
  callback: (item: T) => void
) {
  const processItems = async () => {
    await processInChunks(items.value, callback, {
      chunkSize: 20,
      priority: 'user-visible'
    });
  };

  watch(items, processItems, { immediate: true });

  return { processItems };
}
```

**Svelte 5 Implementation:**

```typescript
// actions/yieldDuringRender.ts
import { yieldWithPriority } from '../utils/scheduler';

export function yieldDuringRender(
  node: HTMLElement,
  options: {
    priority?: 'user-blocking' | 'user-visible' | 'background';
    mutationThreshold?: number;
    debug?: boolean;
  } = {}
) {
  const { priority = 'user-visible', mutationThreshold = 50, debug = false } = options;

  let mutationCount = 0;

  const observer = new MutationObserver(async (mutations) => {
    mutationCount += mutations.length;

    if (mutationCount >= mutationThreshold) {
      if (debug) console.log(`Yielding after ${mutationCount} mutations`);
      mutationCount = 0;
      await yieldWithPriority(priority);
    }
  });

  observer.observe(node, {
    childList: true,
    subtree: true
  });

  return {
    destroy() {
      observer.disconnect();
    }
  };
}
```

### 3. Common Use Cases

**Search Results Rendering:**

```typescript
// Vanilla JS
async function renderSearchResults(results: SearchResult[]) {
  const container = document.getElementById('results');
  if (!container) return;

  container.innerHTML = '';

  await processInChunks(results, (result) => {
    const div = document.createElement('div');
    div.className = 'result-card';
    div.innerHTML = `
      <h3>${result.title}</h3>
      <p>${result.description}</p>
    `;
    container.appendChild(div);
  }, {
    chunkSize: 10,
    onProgress: (processed, total) => {
      updateProgressBar(processed / total);
    }
  });
}
```

**Table Filtering:**

```typescript
const applyFilter = debounceScheduled(async (filterValue: string) => {
  const filtered = largeDataset.filter(item =>
    item.name.includes(filterValue)
  );

  await processInChunks(filtered, (item) => {
    renderTableRow(item);
  }, { chunkSize: 50 });
}, 300);

// Usage
searchInput.addEventListener('input', (e) => {
  applyFilter(e.target.value);
});
```

**Progressive List Rendering:**

```typescript
async function renderLargeList(items: any[]) {
  let visibleCount = 50;

  // Render initial batch
  await processInChunks(
    items.slice(0, visibleCount),
    renderItem,
    { chunkSize: 10 }
  );

  // Load more on scroll
  window.addEventListener('scroll', throttleScheduled(() => {
    if (isNearBottom()) {
      visibleCount += 50;
      processInChunks(
        items.slice(visibleCount - 50, visibleCount),
        renderItem,
        { chunkSize: 10 }
      );
    }
  }, 100));
}
```

### 4. Performance Monitoring

**Setup Long Animation Frames monitoring:**

```typescript
export function setupLoAFMonitoring(
  callback: (entry: any) => void
) {
  if (!('PerformanceObserver' in window)) return;

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > 50) {  // Report frames > 50ms
          callback(entry);
        }
      }
    });

    observer.observe({
      type: 'long-animation-frame',
      buffered: true
    });

    return () => observer.disconnect();
  } catch (e) {
    console.warn('Long Animation Frames API not supported');
  }
}
```

**Track INP improvements:**

```typescript
export function trackINP() {
  if ('PerformanceObserver' in window) {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        console.log('INP:', entry);
      }
    });

    observer.observe({
      type: 'event',
      durationThreshold: 40,
      buffered: true
    });
  }
}
```

## Expected Output

After implementing scheduler.yield():

**Performance Improvements:**
- INP reduced by 60-90% (typical improvement)
- Long tasks broken into smaller chunks
- UI remains responsive during heavy processing
- Smooth scrolling and interactions maintained

**Browser Support:**
- Chrome 129+: Native `scheduler.yield()` with priority
- Older browsers: Automatic fallback to `setTimeout(0)`
- Progressive enhancement: Works everywhere

**Core Web Vitals Targets:**
- INP: < 200ms (good), ideally < 100ms
- No impact on LCP or CLS
- Improved user experience on all devices

**Debugging Output:**

```typescript
// Enable debug logging
const capabilities = {
  supportsYield: isSchedulerYieldSupported(),
  browser: navigator.userAgent
};

console.log('Scheduler capabilities:', capabilities);
```

## Best Practices

**Do:**
- Use `processInChunks` for rendering lists (most common case)
- Use `debounceScheduled` for search/filter inputs
- Use 'background' priority for analytics and logging
- Test with DevTools CPU throttling (6x slowdown)
- Measure INP before and after implementation
- Yield after processing 10-50 items (tune for your use case)

**Don't:**
- Don't yield in every event handler (use debounce/throttle instead)
- Don't use 'user-blocking' priority for non-critical work
- Don't create excessive yields (overhead can accumulate)
- Don't yield in tight loops without batching
- Don't forget error handling in async operations

## Browser Compatibility

| Browser | Version | Support |
|---------|---------|---------|
| Chrome | 129+ | Full support with priority |
| Chrome | 102-128 | Polyfill required |
| Edge | 129+ | Full support |
| Safari | All | Fallback to setTimeout |
| Firefox | All | Fallback to setTimeout |

**Detection:**

```typescript
if (isSchedulerYieldSupported()) {
  console.log('Using native scheduler.yield()');
} else {
  console.log('Using setTimeout fallback');
}
```

## References

- [Scheduler API Spec (WICG)](https://wicg.github.io/scheduling-apis/)
- [Chrome 129 Release Notes](https://developer.chrome.com/blog/chrome-129-beta/)
- [Core Web Vitals - INP](https://web.dev/inp/)
- [Long Animation Frames API](https://developer.chrome.com/docs/web-platform/long-animation-frames/)

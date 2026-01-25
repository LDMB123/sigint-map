---
name: inp-debugging
description: Debug and fix Interaction to Next Paint (INP) issues in Chromium 2025
tags: [performance, inp, core-web-vitals, responsiveness, chromium-2025]
when_to_use: When interactions feel slow (>200ms delay), buttons freeze, or Core Web Vitals shows INP > 200ms (Poor rating)
---

# INP Debugging Guide

Comprehensive guide for diagnosing and fixing Interaction to Next Paint (INP) issues using Chromium 2025 APIs.

## What is INP?

**Interaction to Next Paint (INP)** measures responsiveness by tracking the latency of **all** user interactions throughout the page lifecycle.

```
User Click → [Input Delay] → [Processing] → [Presentation Delay] → Visual Update
              ↑                ↑             ↑
              Queued           JS runs       Browser paints
```

**INP Thresholds:**
- **Good:** ≤ 200ms
- **Needs Improvement:** 200-500ms
- **Poor:** > 500ms

**Target (Chromium 143 / Apple Silicon):** < 100ms

---

## Three Phases of INP

### 1. Input Delay
**Time from user input to event handler start**

**Causes:**
- Main thread busy with long tasks
- Heavy JavaScript executing
- Layout thrashing
- Previous interaction still processing

**Fix:**
- Break up long tasks with scheduler.yield()
- Use background priority for non-urgent work
- Defer non-critical scripts

### 2. Processing Duration
**Time to run all event handlers**

**Causes:**
- Heavy computation in click handlers
- Synchronous API calls
- DOM manipulation triggering layout
- Large state updates

**Fix:**
- Chunk work with scheduler.yield()
- Use requestIdleCallback for background work
- Debounce/throttle rapid interactions
- Batch DOM updates

### 3. Presentation Delay
**Time from handler completion to paint**

**Causes:**
- Style recalculation
- Layout operations
- Paint operations
- Composite operations

**Fix:**
- Animate transform/opacity only
- Use will-change hints
- Avoid forced synchronous layout

---

## Debugging Tools

### 1. Long Animation Frames API (Chrome 123+)

**Most powerful INP debugging tool**

```javascript
// Monitor long animation frames
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    const loaf = entry;

    if (loaf.duration > 50) {
      console.warn('Long Animation Frame detected:', {
        duration: loaf.duration,
        blockingDuration: loaf.blockingDuration,
        renderStart: loaf.renderStart,
        styleAndLayoutStart: loaf.styleAndLayoutStart,

        // Which scripts caused the long frame
        scripts: loaf.scripts?.map(s => ({
          sourceURL: s.sourceURL,
          sourceFunctionName: s.sourceFunctionName,
          invoker: s.invoker,  // e.g., "click-event"
          invokerType: s.invokerType,  // e.g., "event-listener"
          duration: s.duration,
          executionStart: s.executionStart,
          forcedStyleAndLayoutDuration: s.forcedStyleAndLayoutDuration
        }))
      });

      // Send to analytics
      if (loaf.duration > 100) {
        reportINPIssue('long_frame', loaf);
      }
    }
  }
});

observer.observe({ type: 'long-animation-frame', buffered: true });
```

**What to look for:**
- `duration > 50ms`: Blocks user input
- `blockingDuration`: Time actually blocking (excludes rendering)
- `scripts[].sourceFunctionName`: Exact function causing the issue
- `forcedStyleAndLayoutDuration > 0`: Layout thrashing detected

### 2. Web Vitals INP Attribution

```javascript
import { onINP } from 'web-vitals/attribution';

onINP((metric) => {
  const { attribution } = metric;

  console.log('INP Event:', {
    value: metric.value,  // INP duration in ms
    rating: metric.rating,  // "good" | "needs-improvement" | "poor"

    // Attribution data
    interactionType: attribution.interactionType,  // "pointer" | "keyboard"
    interactionTarget: attribution.interactionTarget,  // DOM element
    interactionTime: attribution.interactionTime,

    // Phase breakdown
    inputDelay: attribution.inputDelay,  // Phase 1
    processingDuration: attribution.processingDuration,  // Phase 2
    presentationDelay: attribution.presentationDelay,  // Phase 3

    // Long Animation Frames involved
    longAnimationFrames: attribution.longAnimationFrameEntries
  });

  // Send to analytics
  if (metric.rating !== 'good') {
    analytics.trackINP({
      value: metric.value,
      target: attribution.interactionTarget,
      breakdown: {
        input: attribution.inputDelay,
        processing: attribution.processingDuration,
        presentation: attribution.presentationDelay
      }
    });
  }
});
```

### 3. Chrome DevTools Performance Panel

**Record interaction:**
```
1. DevTools → Performance tab
2. Click Record (⚫)
3. Perform slow interaction (click button)
4. Click Stop (⏹️)
5. Analyze timeline:
   - Look for tasks > 50ms (red triangle)
   - Find event handler in timeline
   - Check for forced reflow warnings
   - Measure Input Delay + Processing + Presentation
```

**DevTools INP metrics:**
```
DevTools → Performance → Bottom-up tab
  → Filter by event type (e.g., "click")
  → See total time for click handlers
  → Expand to see call stack
```

---

## Fixing INP Issues

### Fix 1: Break Up Long Tasks with scheduler.yield()

**Chrome 129+**

```javascript
// BEFORE: Long task blocks input
async function processItems(items) {
  for (const item of items) {
    processItem(item);  // Blocks for entire loop
  }
}

// AFTER: Yields to allow input processing
async function processItemsOptimized(items) {
  const CHUNK_SIZE = 10;

  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    const chunk = items.slice(i, i + CHUNK_SIZE);

    for (const item of chunk) {
      processItem(item);
    }

    // Yield to main thread between chunks
    await scheduler.yield();
  }
}
```

**Why this works:**
- Breaks 500ms task into 10x 50ms tasks
- Allows user input to be processed between chunks
- Input Delay drops from 500ms → <50ms

### Fix 2: Use Task Priority

```javascript
// User-blocking: Immediate visual feedback
scheduler.postTask(() => {
  showLoadingSpinner();
}, { priority: 'user-blocking' });

// User-visible: Important updates
scheduler.postTask(() => {
  updateDataView();
}, { priority: 'user-visible' });

// Background: Analytics, prefetching
scheduler.postTask(() => {
  sendAnalytics();
  prefetchNextPage();
}, { priority: 'background' });
```

**Priority levels:**
- `user-blocking`: Runs immediately (UI feedback)
- `user-visible`: Runs soon (data updates)
- `background`: Runs when idle (non-urgent work)

### Fix 3: isInputPending() for Responsive Loops

```javascript
function processLargeDataset(data) {
  let index = 0;

  function processChunk() {
    const deadline = performance.now() + 50;  // 50ms budget

    while (index < data.length && performance.now() < deadline) {
      // Check if user is trying to interact
      if (navigator.scheduling?.isInputPending()) {
        // Yield immediately to handle input
        setTimeout(processChunk, 0);
        return;
      }

      processItem(data[index++]);
    }

    if (index < data.length) {
      setTimeout(processChunk, 0);
    }
  }

  processChunk();
}
```

### Fix 4: Debounce/Throttle Rapid Interactions

```javascript
// BEFORE: Every keystroke triggers heavy search
input.addEventListener('input', (e) => {
  performExpensiveSearch(e.target.value);  // 200ms processing
});

// AFTER: Debounce to reduce processing
let debounceTimer;
input.addEventListener('input', (e) => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    performExpensiveSearch(e.target.value);
  }, 300);
});

// OR: Use scheduler for better responsiveness
let searchTimeout;
input.addEventListener('input', (e) => {
  clearTimeout(searchTimeout);

  // Show immediate feedback
  showSearchSpinner();

  // Defer actual search
  searchTimeout = setTimeout(async () => {
    await scheduler.yield();  // Allow other interactions
    performExpensiveSearch(e.target.value);
  }, 300);
});
```

### Fix 5: Batch DOM Updates

```javascript
// BEFORE: Multiple reflows
function updateList(items) {
  items.forEach(item => {
    const el = document.createElement('li');
    el.textContent = item.name;
    list.appendChild(el);  // Reflow on each append
  });
}

// AFTER: Single reflow
function updateListOptimized(items) {
  const fragment = document.createDocumentFragment();

  items.forEach(item => {
    const el = document.createElement('li');
    el.textContent = item.name;
    fragment.appendChild(el);  // No reflow
  });

  list.appendChild(fragment);  // Single reflow
}

// EVEN BETTER: Use requestAnimationFrame
function updateListRAF(items) {
  requestAnimationFrame(() => {
    const fragment = document.createDocumentFragment();
    items.forEach(item => {
      const el = document.createElement('li');
      el.textContent = item.name;
      fragment.appendChild(el);
    });
    list.appendChild(fragment);
  });
}
```

### Fix 6: Avoid Forced Synchronous Layout

```javascript
// BEFORE: Forced reflow
function resizeElements(elements) {
  elements.forEach(el => {
    el.style.width = el.offsetWidth + 10 + 'px';  // Read then write
  });
}

// AFTER: Batch reads, then batch writes
function resizeElementsOptimized(elements) {
  // Read phase
  const widths = elements.map(el => el.offsetWidth);

  // Write phase
  elements.forEach((el, i) => {
    el.style.width = widths[i] + 10 + 'px';
  });
}
```

**What triggers forced layout:**
- Reading layout properties (offsetWidth, scrollTop, etc.) after writing styles
- DevTools shows warning: "Forced reflow is a likely performance bottleneck"

---

## React/Svelte Specific Fixes

### React: useTransition

```javascript
import { useTransition, useState } from 'react';

function SearchResults() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isPending, startTransition] = useTransition();

  function handleSearch(e) {
    const value = e.target.value;
    setQuery(value);  // Urgent: update input immediately

    startTransition(() => {
      // Non-urgent: defer expensive filtering
      setResults(filterResults(value));
    });
  }

  return (
    <>
      <input value={query} onChange={handleSearch} />
      {isPending && <Spinner />}
      <ResultsList results={results} />
    </>
  );
}
```

### Svelte 5: $effect with scheduler.yield()

```svelte
<script>
  let items = $state([]);
  let processedItems = $state([]);

  $effect(async () => {
    // Wait for next tick
    await scheduler.yield();

    // Process items in chunks
    const processed = [];
    for (let i = 0; i < items.length; i += 10) {
      const chunk = items.slice(i, i + 10);
      processed.push(...chunk.map(processItem));

      // Yield between chunks
      if (i + 10 < items.length) {
        await scheduler.yield();
      }
    }

    processedItems = processed;
  });
</script>
```

---

## Measuring INP Improvements

### Before/After Comparison

```javascript
// Track INP over time
let inpMeasurements = [];

onINP((metric) => {
  inpMeasurements.push({
    timestamp: Date.now(),
    value: metric.value,
    rating: metric.rating,
    target: metric.attribution.interactionTarget
  });

  console.log('INP measurements:', inpMeasurements);
});
```

### Field Monitoring

```javascript
// Send INP to analytics
onINP((metric) => {
  if (metric.rating !== 'good') {
    fetch('/api/analytics', {
      method: 'POST',
      body: JSON.stringify({
        type: 'inp',
        value: metric.value,
        rating: metric.rating,
        url: window.location.href,
        userAgent: navigator.userAgent,
        breakdown: {
          inputDelay: metric.attribution.inputDelay,
          processing: metric.attribution.processingDuration,
          presentation: metric.attribution.presentationDelay
        }
      })
    });
  }
});
```

---

## Common INP Issues by Framework

### React
**Issue:** Heavy re-renders blocking input
**Fix:** useMemo, useCallback, React.memo, useTransition

### Svelte
**Issue:** Large reactive updates
**Fix:** $derived with chunking, $effect with scheduler.yield()

### Vue
**Issue:** Large computed properties
**Fix:** Break into smaller computeds, use watch with nextTick

### IndexedDB/Dexie
**Issue:** Large query results blocking main thread
**Fix:** Chunk queries with limit/offset + scheduler.yield()

```javascript
async function loadAllRecordsChunked() {
  const records = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const batch = await db.table
      .offset(offset)
      .limit(limit)
      .toArray();

    if (batch.length === 0) break;

    records.push(...batch);
    offset += limit;

    // Yield to handle user input
    await scheduler.yield();
  }

  return records;
}
```

### D3 Visualizations
**Issue:** Large dataset rendering
**Fix:** Virtual scrolling, progressive rendering, Web Workers

```javascript
// Progressive rendering with scheduler.yield()
async function renderLargeDataset(data) {
  const BATCH_SIZE = 100;

  for (let i = 0; i < data.length; i += BATCH_SIZE) {
    const batch = data.slice(i, i + BATCH_SIZE);

    // Render batch
    svg.selectAll('.point')
      .data(batch)
      .enter()
      .append('circle')
      .attr('cx', d => xScale(d.x))
      .attr('cy', d => yScale(d.y));

    // Yield between batches
    if (i + BATCH_SIZE < data.length) {
      await scheduler.yield();
    }
  }
}
```

---

## INP Debugging Checklist

**Identify the issue:**
```
□ Measure baseline INP with Web Vitals
□ Record interaction in DevTools Performance
□ Enable Long Animation Frames monitoring
□ Identify which interaction has poor INP
□ Determine bottleneck phase:
  □ High Input Delay: Main thread blocked
  □ High Processing: Event handler too slow
  □ High Presentation: Layout/paint expensive
```

**Apply fixes:**
```
□ Break long tasks with scheduler.yield()
□ Use scheduler.postTask for prioritization
□ Debounce/throttle rapid interactions
□ Batch DOM updates
□ Avoid forced synchronous layout
□ Move heavy work to Web Workers
□ Use framework-specific optimizations
```

**Verify improvements:**
```
□ Re-measure INP
□ Record Performance profile
□ Check Long Animation Frames reduced
□ Test on real device (Apple Silicon Mac)
□ Monitor field data
```

---

## Resources

- [INP Optimization Guide](https://web.dev/inp/)
- [Long Animation Frames API](https://developer.chrome.com/blog/long-animation-frames/)
- [scheduler.yield() Guide](https://developer.chrome.com/blog/introducing-scheduler-yield-origin-trial/)
- [Web Vitals Library](https://github.com/GoogleChrome/web-vitals)

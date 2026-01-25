---
name: long-task-detection
description: Find and break up long tasks causing jank and frozen UI
tags: [performance, long-tasks, jank, responsiveness, chromium-2025]
when_to_use: When UI freezes during interactions, scrolling is janky, or DevTools shows tasks >50ms blocking the main thread
---

# Long Task Detection and Fixing Guide

Comprehensive guide for detecting and breaking up long tasks that cause UI jank and unresponsiveness.

## What is a Long Task?

**Long task:** Any JavaScript task that blocks the main thread for >50ms.

**Why 50ms?**
- For 60fps: Each frame budget = 16.67ms
- For 120fps: Each frame budget = 8.33ms
- Tasks >50ms block multiple frames → visible jank
- Tasks >100ms → UI feels frozen

**Impact:**
- User input delayed (poor INP)
- Animations stutter (dropped frames)
- Scrolling janky
- UI completely frozen during task

**Target (Chromium 143 / Apple Silicon):** All tasks < 50ms

---

## Detection Tools

### 1. Long Animation Frames API (Chrome 123+)

**Most powerful detection method**

```javascript
// Monitor all long animation frames
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    const loaf = entry;

    if (loaf.duration > 50) {
      console.warn('Long Animation Frame detected:', {
        duration: loaf.duration,
        blockingDuration: loaf.blockingDuration,

        // Timing breakdown
        renderStart: loaf.renderStart,
        styleAndLayoutStart: loaf.styleAndLayoutStart,

        // Scripts that ran during this frame
        scripts: loaf.scripts?.map(s => ({
          sourceURL: s.sourceURL,
          sourceFunctionName: s.sourceFunctionName,
          invoker: s.invoker,  // What triggered it
          invokerType: s.invokerType,  // e.g., "click-event"
          duration: s.duration,
          executionStart: s.executionStart,

          // Layout thrashing detection
          forcedStyleAndLayoutDuration: s.forcedStyleAndLayoutDuration,

          // Call stack
          sourceCharPosition: s.sourceCharPosition
        }))
      });

      // Group by source
      const bySource = loaf.scripts?.reduce((acc, s) => {
        const source = s.sourceURL || 'inline';
        if (!acc[source]) acc[source] = [];
        acc[source].push(s);
        return acc;
      }, {});

      console.table(bySource);
    }
  }
});

observer.observe({ type: 'long-animation-frame', buffered: true });
```

**What to look for:**
- `duration > 50`: Blocks user input
- `scripts[].sourceFunctionName`: Exact culprit function
- `forcedStyleAndLayoutDuration > 0`: Layout thrashing
- `invoker`: What triggered the long task

### 2. Performance Observer for Long Tasks

**Older API (Chrome 58+):**

```javascript
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    console.warn('Long Task detected:', {
      name: entry.name,
      duration: entry.duration,
      startTime: entry.startTime,
      attribution: entry.attribution
    });
  }
});

observer.observe({ type: 'longtask', buffered: true });
```

**Limitations vs LoAF:**
- No script details
- No function names
- No layout thrashing detection
- Use LoAF API instead when available

### 3. Chrome DevTools Performance Panel

**Visual detection:**
```
1. DevTools → Performance tab
2. Click Record (⚫)
3. Perform action (click button, scroll, etc.)
4. Click Stop (⏹️)
5. Look for red triangles in Main thread timeline
   - Red triangle = Long task (>50ms)
6. Click task to see call stack
7. Identify bottleneck function
```

**Performance panel features:**
- Flame chart shows call stack
- Bottom-up view shows time by function
- Call tree shows hierarchical breakdown
- Event log shows task order

### 4. User Timing API

**Manual instrumentation:**

```javascript
// Mark start of expensive operation
performance.mark('process-start');

processLargeDataset();

// Mark end
performance.mark('process-end');

// Measure duration
performance.measure('process-duration', 'process-start', 'process-end');

// Get measurement
const measure = performance.getEntriesByName('process-duration')[0];
console.log('Processing took:', measure.duration, 'ms');

if (measure.duration > 50) {
  console.warn('Long task detected:', measure.duration, 'ms');
}
```

---

## Common Long Task Sources

### 1. Large DOM Manipulation

**Problem:**
```javascript
// LONG TASK: Appending 1000 items one by one
function renderItems(items) {
  performance.mark('render-start');

  items.forEach(item => {
    const li = document.createElement('li');
    li.textContent = item.name;
    list.appendChild(li);  // Reflow on each append
  });

  performance.mark('render-end');
  performance.measure('render', 'render-start', 'render-end');
  // Measurement: 450ms (LONG TASK)
}
```

**Fix: Use DocumentFragment**
```javascript
function renderItemsOptimized(items) {
  const fragment = document.createDocumentFragment();

  items.forEach(item => {
    const li = document.createElement('li');
    li.textContent = item.name;
    fragment.appendChild(li);  // No reflow
  });

  list.appendChild(fragment);  // Single reflow
  // Duration: 25ms ✓
}
```

**Fix: Chunk with scheduler.yield()**
```javascript
async function renderItemsChunked(items) {
  const CHUNK_SIZE = 50;
  const fragment = document.createDocumentFragment();

  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    const chunk = items.slice(i, i + CHUNK_SIZE);

    chunk.forEach(item => {
      const li = document.createElement('li');
      li.textContent = item.name;
      fragment.appendChild(li);
    });

    // Append chunk
    list.appendChild(fragment);

    // Yield to main thread
    if (i + CHUNK_SIZE < items.length) {
      await scheduler.yield();
    }
  }
}
// Each chunk: 8ms ✓
// Total time: Same, but UI responsive throughout
```

### 2. Heavy Computation

**Problem:**
```javascript
// LONG TASK: Processing 100K records
function processRecords(records) {
  return records.map(record => {
    // Complex calculation
    return {
      ...record,
      score: calculateComplexScore(record),
      normalized: normalizeData(record)
    };
  });
}
// Duration: 850ms (LONG TASK)
```

**Fix: Chunk Processing**
```javascript
async function processRecordsChunked(records) {
  const CHUNK_SIZE = 1000;
  const results = [];

  for (let i = 0; i < records.length; i += CHUNK_SIZE) {
    const chunk = records.slice(i, i + CHUNK_SIZE);

    const processed = chunk.map(record => ({
      ...record,
      score: calculateComplexScore(record),
      normalized: normalizeData(record)
    }));

    results.push(...processed);

    // Yield between chunks
    if (i + CHUNK_SIZE < records.length) {
      await scheduler.yield();
    }
  }

  return results;
}
// Each chunk: 8-12ms ✓
```

**Fix: Web Worker (for truly heavy work)**
```javascript
// worker.js
self.onmessage = function(e) {
  const records = e.data;

  const processed = records.map(record => ({
    ...record,
    score: calculateComplexScore(record),
    normalized: normalizeData(record)
  }));

  self.postMessage(processed);
};

// main.js
const worker = new Worker('worker.js');

worker.onmessage = function(e) {
  const processedRecords = e.data;
  updateUI(processedRecords);
};

worker.postMessage(records);
// Main thread: 0ms ✓ (offloaded to worker)
```

### 3. IndexedDB Queries

**Problem:**
```javascript
// LONG TASK: Loading 50K records at once
async function loadAllRecords() {
  const records = await db.table.toArray();
  displayRecords(records);
}
// Duration: 320ms (LONG TASK)
```

**Fix: Chunk with limit/offset**
```javascript
async function loadRecordsChunked() {
  const CHUNK_SIZE = 100;
  let offset = 0;
  const allRecords = [];

  while (true) {
    const chunk = await db.table
      .offset(offset)
      .limit(CHUNK_SIZE)
      .toArray();

    if (chunk.length === 0) break;

    allRecords.push(...chunk);
    displayRecordsIncremental(chunk);  // Update UI progressively

    offset += CHUNK_SIZE;

    // Yield to main thread
    await scheduler.yield();
  }

  return allRecords;
}
// Each chunk: 4-6ms ✓
```

### 4. JSON Parsing

**Problem:**
```javascript
// LONG TASK: Parsing large JSON response
async function fetchData() {
  const response = await fetch('/api/large-data');
  const data = await response.json();  // Blocks main thread
  return data;
}
// Duration: 180ms (LONG TASK)
```

**Fix: Stream Parsing**
```javascript
async function fetchDataStreamed() {
  const response = await fetch('/api/large-data');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  let buffer = '';
  const results = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Parse line-by-line (NDJSON)
    const lines = buffer.split('\n');
    buffer = lines.pop();  // Keep incomplete line

    for (const line of lines) {
      if (line.trim()) {
        results.push(JSON.parse(line));

        // Yield every 100 items
        if (results.length % 100 === 0) {
          await scheduler.yield();
        }
      }
    }
  }

  return results;
}
// Yields frequently, no long tasks ✓
```

### 5. Forced Synchronous Layout

**Problem:**
```javascript
// LONG TASK: Layout thrashing
function resizeElements(elements) {
  elements.forEach(el => {
    const width = el.offsetWidth;  // Read (triggers layout)
    el.style.width = width + 10 + 'px';  // Write
    // Read-write-read-write pattern = forced reflow each iteration
  });
}
// Duration: 280ms (LONG TASK)
// DevTools warning: "Forced reflow"
```

**Fix: Batch Reads and Writes**
```javascript
function resizeElementsOptimized(elements) {
  // Read phase (single layout)
  const widths = elements.map(el => el.offsetWidth);

  // Write phase (single layout)
  elements.forEach((el, i) => {
    el.style.width = widths[i] + 10 + 'px';
  });
}
// Duration: 12ms ✓
```

**Detected by LoAF:**
```javascript
observer.observe({ type: 'long-animation-frame', buffered: true });
// Output:
// forcedStyleAndLayoutDuration: 265ms
// ^ High value indicates layout thrashing
```

### 6. React Re-renders

**Problem:**
```javascript
// LONG TASK: Re-rendering large list on every state change
function LargeList({ items }) {
  const [filter, setFilter] = useState('');

  // Re-renders all 10K items on every keystroke
  const filtered = items.filter(item =>
    item.name.includes(filter)
  );

  return (
    <>
      <input onChange={e => setFilter(e.target.value)} />
      <ul>
        {filtered.map(item => (
          <ExpensiveItem key={item.id} item={item} />
        ))}
      </ul>
    </>
  );
}
// Duration on keystroke: 420ms (LONG TASK)
```

**Fix: useDeferredValue**
```javascript
import { useDeferredValue, memo } from 'react';

const ExpensiveItem = memo(({ item }) => {
  // ... expensive rendering
});

function LargeList({ items }) {
  const [filter, setFilter] = useState('');
  const deferredFilter = useDeferredValue(filter);

  // Filtering uses deferred value (non-blocking)
  const filtered = items.filter(item =>
    item.name.includes(deferredFilter)
  );

  return (
    <>
      <input onChange={e => setFilter(e.target.value)} />
      <ul>
        {filtered.map(item => (
          <ExpensiveItem key={item.id} item={item} />
        ))}
      </ul>
    </>
  );
}
// Input responsive immediately
// Filtering deferred (no long task)
```

### 7. D3 Visualizations

**Problem:**
```javascript
// LONG TASK: Rendering 10K data points at once
function renderChart(data) {
  svg.selectAll('circle')
    .data(data)  // 10,000 items
    .enter()
    .append('circle')
    .attr('cx', d => xScale(d.x))
    .attr('cy', d => yScale(d.y))
    .attr('r', 5);
}
// Duration: 680ms (LONG TASK)
```

**Fix: Progressive Rendering**
```javascript
async function renderChartProgressive(data) {
  const BATCH_SIZE = 200;

  for (let i = 0; i < data.length; i += BATCH_SIZE) {
    const batch = data.slice(i, i + BATCH_SIZE);

    svg.selectAll('circle')
      .data(batch)
      .enter()
      .append('circle')
      .attr('cx', d => xScale(d.x))
      .attr('cy', d => yScale(d.y))
      .attr('r', 5);

    // Yield between batches
    if (i + BATCH_SIZE < data.length) {
      await scheduler.yield();
    }
  }
}
// Each batch: 12-15ms ✓
```

**Fix: Canvas + Web Worker (for very large datasets)**
```javascript
// worker.js
self.onmessage = function(e) {
  const { data, width, height } = e.data;

  const offscreen = new OffscreenCanvas(width, height);
  const ctx = offscreen.getContext('2d');

  // Render on worker thread
  data.forEach(point => {
    ctx.beginPath();
    ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
    ctx.fill();
  });

  // Transfer back to main thread
  const bitmap = offscreen.transferToImageBitmap();
  self.postMessage({ bitmap }, [bitmap]);
};

// main.js
const worker = new Worker('worker.js');
worker.postMessage({ data, width, height });

worker.onmessage = function(e) {
  const { bitmap } = e.data;
  ctx.drawImage(bitmap, 0, 0);
};
// Main thread: 0ms ✓
```

---

## Breaking Up Long Tasks

### Pattern 1: scheduler.yield() (Chrome 129+)

**Recommended approach**

```javascript
async function processLargeTask(items) {
  const CHUNK_SIZE = 50;

  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    const chunk = items.slice(i, i + CHUNK_SIZE);

    // Process chunk
    chunk.forEach(item => process(item));

    // Yield to main thread
    await scheduler.yield();
  }
}
```

**Why scheduler.yield() is better than setTimeout(fn, 0):**
- Continues ASAP after yielding (setTimeout has 4ms minimum delay)
- Maintains task priority
- Better scheduling behavior

### Pattern 2: requestIdleCallback

**For non-urgent work**

```javascript
function processWhenIdle(items) {
  let index = 0;

  function processChunk(deadline) {
    while (index < items.length && deadline.timeRemaining() > 0) {
      process(items[index++]);
    }

    if (index < items.length) {
      requestIdleCallback(processChunk);
    }
  }

  requestIdleCallback(processChunk);
}
```

**Use cases:**
- Analytics processing
- Background data sync
- Prefetching

### Pattern 3: isInputPending()

**Interrupt when user interacts**

```javascript
function processWithInterruptCheck(items) {
  let index = 0;

  function processChunk() {
    const deadline = performance.now() + 50;

    while (index < items.length && performance.now() < deadline) {
      // Check if user is trying to interact
      if (navigator.scheduling?.isInputPending()) {
        setTimeout(processChunk, 0);
        return;
      }

      process(items[index++]);
    }

    if (index < items.length) {
      setTimeout(processChunk, 0);
    }
  }

  processChunk();
}
```

### Pattern 4: Web Workers

**For CPU-intensive work**

```javascript
// Offload to background thread
const worker = new Worker('processor.js');

worker.postMessage(largeDataset);

worker.onmessage = function(e) {
  const result = e.data;
  updateUI(result);
};
```

**When to use:**
- Image processing
- Cryptography
- Data transformation
- Complex calculations

---

## Monitoring Long Tasks

### Production Monitoring

```javascript
// Track long tasks in production
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.duration > 50) {
      // Send to analytics
      fetch('/api/performance', {
        method: 'POST',
        body: JSON.stringify({
          type: 'long-task',
          duration: entry.duration,
          url: window.location.href,
          userAgent: navigator.userAgent,
          timestamp: Date.now()
        })
      });
    }
  }
});

observer.observe({ type: 'long-animation-frame', buffered: true });
```

### Alerting

```javascript
// Alert on excessive long tasks
let longTaskCount = 0;
const THRESHOLD = 5;

const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.duration > 50) {
      longTaskCount++;

      if (longTaskCount >= THRESHOLD) {
        console.error(`${longTaskCount} long tasks detected!`);
        // Send alert
        sendAlert('performance', 'Too many long tasks');
      }
    }
  }
});

observer.observe({ type: 'long-animation-frame', buffered: true });
```

---

## Long Task Debugging Checklist

```
□ Enable Long Animation Frames monitoring
□ Identify long tasks (>50ms)
□ Find source functions
□ Determine task type:
  □ DOM manipulation
  □ Heavy computation
  □ Large data processing
  □ Layout thrashing
  □ Framework re-renders

□ Apply appropriate fix:
  □ Chunk with scheduler.yield()
  □ Use Web Worker for CPU work
  □ Batch DOM operations
  □ Fix layout thrashing (batch reads/writes)
  □ Optimize framework re-renders

□ Verify improvements:
  □ Re-check with LoAF monitoring
  □ Confirm all tasks < 50ms
  □ Test INP improved
  □ Test on real device
```

---

## Resources

- [Long Animation Frames API](https://developer.chrome.com/blog/long-animation-frames/)
- [Optimize Long Tasks](https://web.dev/optimize-long-tasks/)
- [scheduler.yield() Guide](https://developer.chrome.com/blog/introducing-scheduler-yield-origin-trial/)
- [User Timing API](https://developer.mozilla.org/en-US/docs/Web/API/User_Timing_API)

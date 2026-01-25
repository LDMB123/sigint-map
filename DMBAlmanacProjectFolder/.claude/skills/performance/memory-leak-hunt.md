---
name: memory-leak-hunt
description: Find and fix memory leaks causing growing memory usage and slowdowns
tags: [performance, memory, memory-leak, debugging, chrome-devtools]
when_to_use: When app gets slower over time, memory usage grows continuously, or DevTools shows increasing heap size
---

# Memory Leak Hunting Guide

Comprehensive guide for detecting and fixing memory leaks in web applications using Chrome DevTools.

## What is a Memory Leak?

**Memory leak:** Memory that's no longer needed but isn't released, causing memory usage to grow over time.

**Symptoms:**
- App gets slower over time
- Memory usage increases continuously
- Tab crashes after extended use
- High memory warnings in DevTools
- Garbage collection pauses become longer

**Common causes:**
- Event listeners not removed
- Timers/intervals not cleared
- Detached DOM nodes held in closures
- Global variables accumulating data
- Cache growing unbounded
- Closure scope chains retaining data

---

## Debugging Tools

### 1. Chrome DevTools Memory Panel

**Three profiling types:**

1. **Heap Snapshot:** Point-in-time memory state
2. **Allocation Instrumentation on Timeline:** Shows what's allocating over time
3. **Allocation Sampling:** Lightweight profiling for production

### 2. Performance Monitor

**Real-time memory tracking:**
```
DevTools → More Tools → Performance Monitor

Metrics shown:
  • JS heap size (total memory used)
  • DOM nodes (total number)
  • Event listeners (total count)
  • Frames per second
```

---

## Memory Leak Detection Process

### Step 1: Establish Baseline

**Take initial snapshot:**
```
1. DevTools → Memory tab
2. Select "Heap snapshot"
3. Click "Take snapshot"
4. Note current heap size (e.g., 15 MB)
```

### Step 2: Perform Actions

**Exercise the suspected leak:**
```
1. Perform action that might leak (e.g., open/close modal 10 times)
2. Force garbage collection:
   DevTools → Memory → 🗑️ icon
3. Wait 10 seconds
4. Take another snapshot
```

### Step 3: Compare Snapshots

**Analyze difference:**
```
1. In Memory panel, select second snapshot
2. Change view from "Summary" to "Comparison"
3. Compare with first snapshot
4. Look for:
   - Objects that grew in count (# Delta column)
   - Objects that grew in size (Size Delta column)
   - Objects that shouldn't persist after action
```

---

## Common Memory Leak Patterns

### Leak 1: Event Listeners Not Removed

**Problem:**
```javascript
// LEAK: Event listener persists after component unmounts
function setupComponent() {
  const button = document.getElementById('btn');
  button.addEventListener('click', handleClick);

  // Component destroyed, but listener persists
}

function handleClick() {
  // This closure keeps component scope alive
  console.log(componentData);
}
```

**Fix:**
```javascript
// FIX: Remove event listener on cleanup
function setupComponent() {
  const button = document.getElementById('btn');

  function handleClick() {
    console.log(componentData);
  }

  button.addEventListener('click', handleClick);

  // Cleanup
  return () => {
    button.removeEventListener('click', handleClick);
  };
}

// React example
useEffect(() => {
  function handleClick() {
    console.log(data);
  }

  button.addEventListener('click', handleClick);

  return () => {
    button.removeEventListener('click', handleClick);
  };
}, [data]);

// Svelte example
onMount(() => {
  function handleClick() {
    console.log(data);
  }

  button.addEventListener('click', handleClick);

  return () => {
    button.removeEventListener('click', handleClick);
  };
});
```

### Leak 2: Timers Not Cleared

**Problem:**
```javascript
// LEAK: setInterval keeps running after component unmounts
function startPolling() {
  setInterval(() => {
    fetchData();
  }, 1000);
}
```

**Fix:**
```javascript
// FIX: Clear interval on cleanup
function startPolling() {
  const intervalId = setInterval(() => {
    fetchData();
  }, 1000);

  return () => {
    clearInterval(intervalId);
  };
}

// React example
useEffect(() => {
  const intervalId = setInterval(() => {
    fetchData();
  }, 1000);

  return () => clearInterval(intervalId);
}, []);

// Svelte example
onMount(() => {
  const intervalId = setInterval(() => {
    fetchData();
  }, 1000);

  return () => clearInterval(intervalId);
});
```

### Leak 3: Detached DOM Nodes

**Problem:**
```javascript
// LEAK: DOM nodes removed from document but still referenced
let cache = [];

function createElements() {
  for (let i = 0; i < 100; i++) {
    const div = document.createElement('div');
    div.innerHTML = `Item ${i}`;
    document.body.appendChild(div);

    // Cache references to DOM nodes
    cache.push(div);
  }
}

function clearElements() {
  document.body.innerHTML = '';  // Removes from DOM
  // But cache still holds references - LEAK
}
```

**Fix:**
```javascript
// FIX: Clear cache when removing elements
let cache = [];

function createElements() {
  for (let i = 0; i < 100; i++) {
    const div = document.createElement('div');
    div.innerHTML = `Item ${i}`;
    document.body.appendChild(div);
    cache.push(div);
  }
}

function clearElements() {
  document.body.innerHTML = '';
  cache = [];  // Clear references
}

// Or use WeakMap for automatic cleanup
const cache = new WeakMap();

function createElements() {
  for (let i = 0; i < 100; i++) {
    const div = document.createElement('div');
    div.innerHTML = `Item ${i}`;
    document.body.appendChild(div);

    // WeakMap doesn't prevent garbage collection
    cache.set(div, { index: i });
  }
}
```

### Leak 4: Closure Scope Retention

**Problem:**
```javascript
// LEAK: Closure retains large data in scope
function createHandler(largeData) {
  return function handleClick() {
    // Only uses one property, but entire largeData is retained
    console.log(largeData.id);
  };
}

const handler = createHandler({ id: 1, data: new Array(1000000) });
button.addEventListener('click', handler);
```

**Fix:**
```javascript
// FIX: Only close over what you need
function createHandler(largeData) {
  const id = largeData.id;  // Extract only what's needed

  return function handleClick() {
    console.log(id);  // Closes over primitive, not entire object
  };
}

const handler = createHandler({ id: 1, data: new Array(1000000) });
button.addEventListener('click', handler);
// Large data can be garbage collected
```

### Leak 5: Global Variables Accumulating

**Problem:**
```javascript
// LEAK: Global array grows unbounded
window.eventLog = [];

function logEvent(event) {
  window.eventLog.push({
    timestamp: Date.now(),
    data: event
  });
  // Array grows forever
}
```

**Fix:**
```javascript
// FIX: Limit cache size with circular buffer
const MAX_LOGS = 1000;
window.eventLog = [];

function logEvent(event) {
  window.eventLog.push({
    timestamp: Date.now(),
    data: event
  });

  // Remove old entries
  if (window.eventLog.length > MAX_LOGS) {
    window.eventLog.shift();
  }
}

// Or use LRU cache
class LRUCache {
  constructor(maxSize) {
    this.maxSize = maxSize;
    this.cache = new Map();
  }

  set(key, value) {
    // Delete oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  get(key) {
    if (!this.cache.has(key)) return undefined;

    // Move to end (most recently used)
    const value = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, value);

    return value;
  }
}

window.eventLog = new LRUCache(1000);
```

### Leak 6: IndexedDB/Dexie Cursors Not Closed

**Problem:**
```javascript
// LEAK: Large result sets kept in memory
async function getAllRecords() {
  const records = await db.table.toArray();  // Loads all into memory
  return records;  // Keeps all in memory while processing
}
```

**Fix:**
```javascript
// FIX: Stream records with cursor
async function processRecords(callback) {
  await db.table.each((record) => {
    callback(record);  // Process one at a time
    // Previous records can be garbage collected
  });
}

// Or chunk with limit/offset
async function getRecordsChunked(chunkSize = 100) {
  let offset = 0;

  while (true) {
    const chunk = await db.table
      .offset(offset)
      .limit(chunkSize)
      .toArray();

    if (chunk.length === 0) break;

    yield chunk;  // Yields chunks, previous can be GC'd
    offset += chunkSize;
  }
}

// Usage
for await (const chunk of getRecordsChunked()) {
  processChunk(chunk);
  // Previous chunks eligible for garbage collection
}
```

### Leak 7: React Component State/Refs

**Problem:**
```javascript
// LEAK: Ref holds reference to large data
function Component() {
  const dataRef = useRef(null);

  useEffect(() => {
    fetch('/api/large-data').then(data => {
      dataRef.current = data;  // Held for lifetime of component
    });
  }, []);

  // Component re-renders many times
  // dataRef persists even if not needed
}
```

**Fix:**
```javascript
// FIX: Use state and clear when not needed
function Component() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch('/api/large-data').then(data => {
      setData(data);
    });

    return () => {
      setData(null);  // Clear on unmount
    };
  }, []);

  // Or use local variable if doesn't trigger re-renders
  useEffect(() => {
    let data = null;

    fetch('/api/large-data').then(response => {
      data = response;
      processData(data);
    });

    return () => {
      data = null;  // Clear on cleanup
    };
  }, []);
}
```

---

## Advanced Memory Profiling

### Heap Snapshot Analysis

**Find detached DOM nodes:**
```
1. Take heap snapshot
2. In "Class filter" search box, type: Detached
3. Look for "Detached HTMLDivElement" etc.
4. Expand to see retaining path
5. Identify what's holding reference
```

**Find large objects:**
```
1. Take heap snapshot
2. Sort by "Shallow Size" (descending)
3. Look for unexpectedly large objects
4. Expand to see what's inside
5. Check if size is justified
```

**Retaining path analysis:**
```
1. Select an object in snapshot
2. Look at "Retainers" section at bottom
3. Follow path from object → GC root
4. Identify unexpected retainers
5. Fix code holding unnecessary references
```

### Allocation Timeline

**Find what's allocating over time:**
```
1. DevTools → Memory tab
2. Select "Allocation instrumentation on timeline"
3. Click "Start"
4. Perform actions (open/close modal 10x)
5. Click "Stop"
6. Blue bars show allocations
7. Gray bars show deallocations
8. Look for bars that stay blue (not collected)
```

---

## Framework-Specific Patterns

### React Memory Leaks

**Common issues:**
- Event listeners in useEffect without cleanup
- Intervals/timeouts without cleanup
- Subscriptions (WebSocket, etc.) not closed
- Large objects in useRef
- Context providers leaking

**Fix pattern:**
```javascript
function Component() {
  useEffect(() => {
    const subscription = subscribe();

    return () => {
      subscription.unsubscribe();  // Always cleanup
    };
  }, []);
}
```

### Svelte Memory Leaks

**Common issues:**
- onMount without cleanup
- Stores not unsubscribed
- Event listeners on window/document
- $effect without cleanup

**Fix pattern:**
```svelte
<script>
  import { onMount } from 'svelte';

  onMount(() => {
    const unsubscribe = store.subscribe(value => {
      console.log(value);
    });

    return unsubscribe;  // Cleanup
  });
</script>
```

### D3 Visualizations

**Common issues:**
- Event listeners on SVG elements
- Timers for transitions
- Large datasets in closures

**Fix pattern:**
```javascript
function createVisualization(container, data) {
  const svg = d3.select(container)
    .append('svg');

  // ... create visualization

  // Return cleanup function
  return () => {
    svg.selectAll('*').remove();  // Remove DOM
    svg.remove();
  };
}

// Usage
const cleanup = createVisualization('#chart', data);

// On component unmount
cleanup();
```

---

## Memory Leak Testing Workflow

### Automated Testing

**Test for leaks in tests:**
```javascript
// Jest example
test('component does not leak memory', async () => {
  const initialHeap = performance.memory.usedJSHeapSize;

  // Mount/unmount component 100 times
  for (let i = 0; i < 100; i++) {
    const { unmount } = render(<Component />);
    unmount();
  }

  // Force garbage collection (requires --expose-gc flag)
  if (global.gc) {
    global.gc();
  }

  await new Promise(resolve => setTimeout(resolve, 1000));

  const finalHeap = performance.memory.usedJSHeapSize;
  const heapGrowth = finalHeap - initialHeap;

  // Heap should not grow significantly
  expect(heapGrowth).toBeLessThan(1024 * 1024);  // < 1MB growth
});
```

### Manual Testing Checklist

```
□ Open DevTools Performance Monitor
□ Note initial JS heap size: ___ MB
□ Note initial DOM node count: ___
□ Note initial event listener count: ___

□ Perform action 10-20 times (e.g., open/close modal)

□ Force garbage collection (🗑️ icon in Memory panel)
□ Wait 10 seconds

□ Note final JS heap size: ___ MB
□ Note final DOM node count: ___
□ Note final event listener count: ___

EXPECTED:
  ✓ Heap size returns to baseline (±10%)
  ✓ DOM node count returns to baseline
  ✓ Event listener count returns to baseline

IF LEAKING:
  ✗ Heap size grows continuously
  ✗ DOM node count increases
  ✗ Event listener count increases

  → Take heap snapshots and compare
  → Find detached DOM nodes
  → Identify retaining paths
  → Fix root cause
```

---

## Prevention Best Practices

### 1. Always Cleanup in Component Lifecycle

```javascript
// React
useEffect(() => {
  // Setup
  const subscription = subscribe();

  return () => {
    // Cleanup
    subscription.unsubscribe();
  };
}, []);

// Svelte
onMount(() => {
  // Setup
  const subscription = subscribe();

  return () => {
    // Cleanup
    subscription.unsubscribe();
  };
});
```

### 2. Use WeakMap/WeakSet for Caches

```javascript
// Strong reference (can leak)
const cache = new Map();
cache.set(domNode, data);  // domNode won't be GC'd

// Weak reference (no leak)
const cache = new WeakMap();
cache.set(domNode, data);  // domNode can be GC'd when removed from DOM
```

### 3. Limit Cache Size

```javascript
// Unbounded cache (leaks)
const cache = {};

function memoize(fn) {
  return function(...args) {
    const key = JSON.stringify(args);
    if (!(key in cache)) {
      cache[key] = fn(...args);
    }
    return cache[key];
  };
}

// Bounded cache (safe)
const MAX_CACHE_SIZE = 1000;
const cache = new Map();

function memoize(fn) {
  return function(...args) {
    const key = JSON.stringify(args);

    if (!cache.has(key)) {
      if (cache.size >= MAX_CACHE_SIZE) {
        const firstKey = cache.keys().next().value;
        cache.delete(firstKey);
      }
      cache.set(key, fn(...args));
    }

    return cache.get(key);
  };
}
```

### 4. Avoid Global Variables

```javascript
// Bad: Global accumulation
window.analytics = [];
window.analytics.push(event);  // Grows forever

// Good: Module-scoped with limits
const analytics = new LRUCache(1000);
export function trackEvent(event) {
  analytics.set(Date.now(), event);
}
```

### 5. Clear Timers/Intervals

```javascript
// Always pair with cleanup
const timerId = setTimeout(() => {
  // ...
}, 1000);

// Cleanup
clearTimeout(timerId);

const intervalId = setInterval(() => {
  // ...
}, 1000);

// Cleanup
clearInterval(intervalId);
```

---

## Resources

- [Chrome DevTools Memory Profiling](https://developer.chrome.com/docs/devtools/memory-problems/)
- [JavaScript Memory Management](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Memory_Management)
- [Fixing Memory Leaks in Web Apps](https://web.dev/fixing-memory-leaks-in-web-applications/)

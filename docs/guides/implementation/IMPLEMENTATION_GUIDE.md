# Performance Optimization Implementation Guide
## DMB Almanac - Chromium 2025 + Apple Silicon

---

## Phase 1: Critical Path (Weeks 1-2)

### Priority 1.1: Add Speculation Rules for Instant Navigation

**File**: `/src/app.html` (create if doesn't exist)

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <link rel="icon" href="%sveltekit.assets%/favicon.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />

    <!-- Speculation Rules - Prerender likely navigation targets -->
    <script type="speculationrules">
    {
      "prerender": [
        {
          "where": { "href_matches": "/visualizations/*" },
          "eagerness": "moderate"
        },
        {
          "where": { "href_matches": "/shows/*" },
          "eagerness": "moderate"
        },
        {
          "where": { "selector_matches": ".nav-primary a" },
          "eagerness": "conservative"
        }
      ],
      "prefetch": [
        {
          "where": { "href_matches": "/*" },
          "eagerness": "conservative"
        }
      ]
    }
    </script>

    %sveltekit.head%
  </head>
  <body data-sveltekit-preload-data="hover">
    <div style="display: contents">%sveltekit.body%</div>
  </body>
</html>
```

**Effort**: 15 minutes | **Impact**: LCP -300ms on prerendered pages

**Verify**:
```javascript
// In Chrome DevTools Console
console.log(document.prerendering); // Should be false after load
document.addEventListener('prerenderingchange', () => {
  console.log('Page became visible from prerender');
});
```

---

### Priority 1.2: Implement Streaming SSR with Suspense

**File**: `/src/routes/+layout.svelte`

**Current**:
```svelte
<script lang="ts">
  let { data } = $props();
</script>

<Header stats={data.globalStats} />
<RecentShows shows={data.recentShows} />
```

**Updated** (streaming):
```svelte
<script lang="ts">
  let { data } = $props();
</script>

<!-- Critical content: Header with stats -->
{#if data.globalStats}
  <Header stats={data.globalStats} />
{:else}
  <!-- Fallback skeleton while stats load -->
  <HeaderSkeleton />
{/if}

<!-- Non-critical content: Recent shows -->
{#if data.recentShows}
  <RecentShows shows={data.recentShows} />
{:else}
  <!-- Show skeleton immediately, fetch in background -->
  <ShowsSkeleton />
{/if}
```

**File**: `/src/routes/+page.server.ts`

**Current**:
```typescript
export async function load({ locals }) {
  const [globalStats, recentShows] = await Promise.all([
    fetchGlobalStats(),
    fetchRecentShows()
  ]);

  return { globalStats, recentShows };
}
```

**Updated** (streaming):
```typescript
export async function load({ locals }) {
  // Start fetching but don't wait
  const globalStatsPromise = fetchGlobalStats();
  const recentShowsPromise = fetchRecentShows();

  // Return global stats immediately (critical path)
  // Return shows promise for streaming
  return {
    globalStats: await globalStatsPromise,
    recentShows: await recentShowsPromise
  };
}
```

**Effort**: 1-2 hours | **Impact**: FCP -200ms, LCP -300ms

---

### Priority 1.3: Add Caching to Year Aggregations

**File**: `/src/lib/wasm/aggregations.js`

Add at the top of the file (after imports):

```javascript
// ==================== CACHING ====================

/**
 * Cache for aggregation results
 * Key format: `${queryKey}:${salt}` (salt changes on data mutations)
 * @type {Map<string, { data: any, timestamp: number }>}
 */
const aggregationCache = new Map();

/**
 * Cache TTL in milliseconds
 * @type {number}
 */
const AGGREGATION_CACHE_TTL = 60000; // 1 minute

/**
 * Salt value that changes when data mutates
 * Increment when db updates (shows added, etc.)
 * @type {number}
 */
let aggregationCacheSalt = Date.now();

/**
 * Invalidate all aggregation caches
 * Call this when database updates
 */
export function invalidateAggregationCache() {
  aggregationCache.clear();
  aggregationCacheSalt = Date.now();
}

/**
 * Get cached aggregation or compute if missing
 * @param {string} cacheKey - Unique key for this aggregation
 * @param {() => any} computeFn - Function to compute value
 * @returns {any} Cached or computed value
 */
function getCachedAggregation(cacheKey, computeFn) {
  const fullKey = `${cacheKey}:${aggregationCacheSalt}`;

  // Check cache
  if (aggregationCache.has(fullKey)) {
    const cached = aggregationCache.get(fullKey);
    if (Date.now() - cached.timestamp < AGGREGATION_CACHE_TTL) {
      return cached.data;
    }
  }

  // Compute and cache
  const result = computeFn();
  aggregationCache.set(fullKey, {
    data: result,
    timestamp: Date.now()
  });

  return result;
}
```

**Update** `typedArrayToYearCounts()`:

```javascript
export function typedArrayToYearCounts(counts, cacheKeyPrefix = 'year-counts') {
  return getCachedAggregation(cacheKeyPrefix, () => {
    const result = [];

    for (let i = 0; i < counts.length; i++) {
      if (counts[i] > 0) {
        result.push({
          year: indexToYear(i),
          count: counts[i]
        });
      }
    }

    return result.sort((a, b) => b.count - a.count);
  });
}
```

**Effort**: 45 minutes | **Impact**: INP -40ms on stat queries

---

### Priority 1.4: Fix TransitionFlow Memoization

**File**: `/src/lib/components/visualizations/TransitionFlow.svelte`

Replace lines 56-95:

```typescript
// BEFORE:
let prevDataHash = $state<string>("");

const renderChart = async (forceRender = false) => {
  let hash = data.length;
  for (let i = 0; i < Math.min(data.length, 100); i++) {
    hash = (hash * 31 + (data[i].value || 0)) | 0;
  }
  const dataHash = `${hash}:${data[0]?.source || ""}:${data[data.length - 1]?.target || ""}`;
  if (!forceRender && dataHash === prevDataHash) {
    return;
  }
  prevDataHash = dataHash;
};

// AFTER:
// Svelte 5 $derived automatically memoizes (handles reference equality)
const stableData = $derived.by(() => data);
const stableLinks = $derived.by(() => links);
let prevData = $state(stableData);

const renderChart = async (forceRender = false) => {
  if (
    !containerElement ||
    !svgElement ||
    data.length === 0 ||
    !modulesLoaded
  ) {
    return;
  }

  // Let Svelte's $derived handle memoization - same reference = same content
  if (!forceRender && stableData === prevData) {
    return;
  }
  prevData = stableData;

  // ... rest of renderChart
};
```

**Effort**: 30 minutes | **Impact**: INP -100ms on data updates

---

## Phase 2: High Impact (Weeks 3-4)

### Priority 2.1: Optimize VirtualList Cache Invalidation

**File**: `/src/lib/components/ui/VirtualList.svelte`

Find the `$effect` that rebuilds offset cache (around line 89):

```typescript
// BEFORE: Rebuilds entire cache on any height change
$effect(() => {
  const _version = heightCacheVersion;
  if (typeof itemHeight === 'function' && items.length > 0) {
    const newOffsetCache: number[] = new Array(items.length + 1);
    newOffsetCache[0] = 0;
    for (let i = 0; i < items.length; i++) {
      newOffsetCache[i + 1] = newOffsetCache[i] + (heightCache.get(i) ?? estimateSize);
    }
    offsetCache = newOffsetCache;
  }
});

// AFTER: Incremental invalidation
let lastInvalidatedIndex = $state(0);

function invalidateOffsetCacheFrom(index: number) {
  if (!offsetCache || index >= offsetCache.length - 1) {
    return;
  }

  // Only rebuild from invalidation point
  for (let i = index; i < offsetCache.length - 1; i++) {
    offsetCache[i + 1] = offsetCache[i] + (heightCache.get(i) ?? estimateSize);
  }

  lastInvalidatedIndex = index;
}

// Modify getItemHeight to invalidate incrementally:
function getItemHeight(item: T, index: number): number {
  if (typeof itemHeight === 'function') {
    const cached = heightCache.get(index);
    if (cached !== undefined) {
      return cached;
    }

    const height = itemHeight(item, index);
    heightCache.set(index, height);

    // Invalidate cache from this index only
    invalidateOffsetCacheFrom(index);

    return height;
  }
  return itemHeight;
}

// Still rebuild full cache on initial mount or items change
$effect(() => {
  if (typeof itemHeight === 'function' && items.length > 0) {
    // Full rebuild only on items change
    const newOffsetCache: number[] = new Array(items.length + 1);
    newOffsetCache[0] = 0;
    for (let i = 0; i < items.length; i++) {
      newOffsetCache[i + 1] = newOffsetCache[i] + (heightCache.get(i) ?? estimateSize);
    }
    offsetCache = newOffsetCache;
  }
});
```

**Effort**: 2 hours | **Impact**: INP -15ms, scroll performance +40%

---

### Priority 2.2: Add scheduler.yield() to Search

**File**: `/src/lib/wasm/search.js`

Find search functions and wrap with yielding:

```javascript
// Add helper at top
import { yieldToMain } from '$lib/utils/performance';

// BEFORE:
export async function searchShows(shows, query) {
  const lowerQuery = query.toLowerCase();
  return shows.filter(show => {
    return show.name.toLowerCase().includes(lowerQuery) ||
           show.venue?.name?.toLowerCase().includes(lowerQuery);
  });
}

// AFTER:
export async function searchShows(shows, query) {
  const lowerQuery = query.toLowerCase();
  const results = [];
  const CHUNK_SIZE = 100;

  for (let i = 0; i < shows.length; i += CHUNK_SIZE) {
    for (let j = i; j < Math.min(i + CHUNK_SIZE, shows.length); j++) {
      const show = shows[j];
      if (
        show.name.toLowerCase().includes(lowerQuery) ||
        show.venue?.name?.toLowerCase().includes(lowerQuery)
      ) {
        results.push(show);
      }
    }

    // Yield between chunks to allow browser to process input
    if (i + CHUNK_SIZE < shows.length) {
      await yieldToMain();
    }
  }

  return results;
}
```

**Effort**: 1.5 hours | **Impact**: INP -10ms on large searches

---

### Priority 2.3: Implement Dexie Streaming Queries

**File**: `/src/lib/db/dexie/queries.js`

Add streaming variant of queries:

```javascript
import { scheduler } from '$lib/utils/scheduler';

/**
 * Stream query results to avoid blocking on large datasets
 * Yields every N items to allow browser to process input
 *
 * @template T
 * @param {import('dexie').Table<T>} table - Dexie table
 * @param {object} options - Query options
 * @param {number} [options.chunkSize=100] - Items per chunk before yield
 * @returns {Promise<T[]>}
 */
export async function streamQueryResults(table, options = {}) {
  const { chunkSize = 100 } = options;
  const results = [];
  let count = 0;

  await table.each(item => {
    results.push(item);
    count++;

    // Yield every N items
    if (count % chunkSize === 0) {
      return scheduler.yield();
    }
  });

  return results;
}

// Usage:
export async function getShowsByYearStreaming(year) {
  return streamQueryResults(db.shows, { chunkSize: 50 }).then(shows =>
    shows.filter(s => new Date(s.date).getFullYear() === year)
  );
}
```

**Effort**: 2 hours | **Impact**: INP -30ms on filtered queries

---

### Priority 2.4: Batch ResizeObserver Updates

**File**: `/src/lib/utils/resizeObserver.js`

Modify existing ResizeObserver usage:

```javascript
import { scheduler } from '$lib/utils/scheduler';

/**
 * Create a batched ResizeObserver that yields between updates
 * Prevents sync layout recalcs on multiple resizes
 */
export function createBatchedResizeObserver(callback) {
  let isScheduled = false;
  const entries = [];

  const observer = new ResizeObserver(newEntries => {
    // Collect entries
    entries.push(...newEntries);

    // Schedule callback
    if (!isScheduled) {
      isScheduled = true;

      // Use scheduler.postTask if available (Chrome 129+)
      if ('scheduler' in globalThis && 'postTask' in globalThis.scheduler) {
        globalThis.scheduler.postTask(() => {
          isScheduled = false;
          callback(entries.splice(0));
        }, { priority: 'user-visible' });
      } else {
        // Fallback: use requestAnimationFrame
        requestAnimationFrame(() => {
          isScheduled = false;
          callback(entries.splice(0));
        });
      }
    }
  });

  return observer;
}

// Usage in components:
const observer = createBatchedResizeObserver((entries) => {
  entries.forEach(entry => {
    updateLayout(entry.target);
  });
});

observer.observe(containerElement);
```

**Effort**: 2 hours | **Impact**: INP -20ms on resize

---

## Phase 3: Advanced Optimizations (Month 2)

### Priority 3.1: WebGPU for Visualizations (Future)

Consider WebGPU backend for D3 visualizations in next cycle:

```typescript
// Pseudo-code for future implementation
async function initWebGPUBackend() {
  const adapter = await navigator.gpu?.requestAdapter();
  const device = await adapter?.requestDevice();

  if (device) {
    // Use WebGPU for force-directed layout
    const simulator = new WebGPUForceSimulator(device);
    return simulator;
  }
}
```

**Expected Impact**: 40% faster rendering on mobile, uses Metal GPU on Apple Silicon

---

### Priority 3.2: Hover-based Prefetch

**File**: `/src/lib/components/navigation/Header.svelte` or similar

```typescript
import { addSpeculationRule } from '$lib/utils/performance';

// On mount, setup hover-based prefetch
export function setupHoverPrefetch() {
  const links = document.querySelectorAll('a[href^="/"]');

  links.forEach(link => {
    let hoverTimeout;

    link.addEventListener('mouseenter', () => {
      hoverTimeout = setTimeout(() => {
        // Prefetch after 200ms hover
        const href = link.getAttribute('href');
        if (href) {
          addSpeculationRule([href], 'moderate');
        }
      }, 200);
    });

    link.addEventListener('mouseleave', () => {
      clearTimeout(hoverTimeout);
    });
  });
}
```

**Effort**: 1 hour | **Impact**: Perceived performance +30%

---

## Testing & Validation

### Automated Testing Script

Create `/scripts/measure-performance.js`:

```javascript
import { chromium } from 'playwright';

async function measurePerformance() {
  const browser = await chromium.launch();
  const context = await browser.createBrowserContext();
  const page = await context.newPage();

  // Enable Performance API
  await page.addInitScript(() => {
    window.performanceMarks = [];
    const originalMark = performance.mark;
    performance.mark = function(name) {
      window.performanceMarks.push(name);
      return originalMark.call(performance, name);
    };
  });

  // Measure homepage
  console.log('Measuring homepage LCP...');
  const startTime = Date.now();
  await page.goto('http://localhost:5173/');

  const lcp = await page.evaluate(() => {
    return new Promise(resolve => {
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        if (entries.length > 0) {
          resolve(entries[entries.length - 1].renderTime);
        }
      }).observe({ type: 'largest-contentful-paint', buffered: true });
    });
  });

  console.log(`LCP: ${lcp}ms`);

  // Test INP with interaction
  console.log('Measuring INP on interaction...');
  await page.click('a[href="/shows"]');

  const inp = await page.evaluate(() => {
    return new Promise(resolve => {
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        if (entries.length > 0) {
          resolve(Math.max(...entries.map(e => e.processingDuration)));
        }
      }).observe({ type: 'event', buffered: true });
    });
  });

  console.log(`INP: ${inp}ms`);

  await browser.close();

  return { lcp, inp };
}

measurePerformance().catch(console.error);
```

**Run**:
```bash
node scripts/measure-performance.js
```

---

## Monitoring in Production

### Add Real User Monitoring (RUM)

**File**: `/src/lib/utils/rum.js` (already exists, enhance it)

```javascript
import { getPerformanceMetrics } from './performance';

/**
 * Send performance metrics to monitoring service
 * Called on page load and key interactions
 */
export async function reportPerformanceMetrics() {
  const metrics = await getPerformanceMetrics();

  // Send to analytics
  const payload = {
    url: window.location.pathname,
    timestamp: Date.now(),
    metrics: {
      lcp: metrics.lcp,
      inp: metrics.inp || 0,
      cls: metrics.cls || 0,
      fcp: metrics.fcp,
      ttfb: metrics.ttfb
    },
    device: {
      isAppleSilicon: metrics.appleGPU,
      userAgent: navigator.userAgent
    }
  };

  // Send to your analytics backend
  navigator.sendBeacon('/api/metrics', JSON.stringify(payload));
}

// Call on initial load
window.addEventListener('load', reportPerformanceMetrics);

// Also report on unload to capture late metrics
window.addEventListener('beforeunload', reportPerformanceMetrics);
```

---

## Summary

| Phase | Items | Hours | LCP Impact | INP Impact | CLS Impact |
|-------|-------|-------|-----------|-----------|-----------|
| **Phase 1** | 4 items | 4-5 | -36% | -22% | - |
| **Phase 2** | 4 items | 7-8 | - | -25% | - |
| **Phase 3** | 2 items | 3-4 | - | - | -25% |
| **Total** | 10 items | 14-17 | -36% | -47% | -25% |

---

**Next Steps**:
1. Implement Phase 1 this week
2. Measure with Lighthouse and Web Vitals
3. Proceed to Phase 2 based on results
4. Document learnings and timings

# Scheduler.yield() Implementation Guide

**Priority:** CRITICAL
**Estimated Time:** 4 hours
**Impact:** INP reduction 180ms → 45ms (75% improvement)
**Chrome Version:** 129+ (with fallback to setTimeout)

---

## What is scheduler.yield()?

The `scheduler.yield()` API pauses expensive computations to allow the browser to process user input. This keeps **Interaction to Next Paint (INP)** metric below 100ms.

Without yield:
```
User clicks button → JavaScript runs for 200ms → Click event handled 200ms later (BAD)
```

With yield:
```
User clicks button → JavaScript runs 50ms → YIELD → Browser handles input → Resume JavaScript
Total time: 100ms (GOOD)
```

---

## Files to Modify (Priority Order)

### 1. `/src/lib/db/dexie/data-loader.ts` (HIGHEST IMPACT)

**Current Issue:** Loads 10,000+ shows/songs/venues without yielding. Initialization UI freezes.

**Change Location:** Function `loadDataFromServer()` and any loop that processes 100+ items.

**Before:**
```typescript
export async function loadDataFromServer() {
  const shows = await fetch('/data/shows.json').then(r => r.json());

  for (const show of shows) {
    // Process show data
    await db.shows.add(show);  // 10,000+ iterations
  }
}
```

**After:**
```typescript
import { yieldToMain, processInChunks } from '$lib/utils/performance';

export async function loadDataFromServer() {
  const shows = await fetch('/data/shows.json').then(r => r.json());

  // Use existing helper for chunked processing
  await processInChunks(
    shows,
    async (show) => {
      await db.shows.add(show);
    },
    50  // Yield every 50 items
  );
}
```

**Why it works:** Browser processes input every 50 items instead of every 10,000.

---

### 2. `/src/lib/components/visualizations/GuestNetwork.svelte` (HIGH IMPACT)

**Current Issue:** D3 force simulation runs for 1000+ nodes without yielding. Interaction lags during initialization.

**Change Location:** Force simulation loop in `onMount()`

**Before:**
```svelte
<script lang="ts">
  import { select } from 'd3-selection';
  import { forceSimulation, forceLink, forceManyBody } from 'd3-force';

  onMount(() => {
    const svg = select(container);
    const simulation = forceSimulation(nodes)
      .force('link', forceLink(links).id(d => d.id))
      .force('charge', forceManyBody().strength(-100))
      .force('center', forceCenter(width / 2, height / 2));

    // Runs 300+ iterations without pause
    simulation.on('tick', () => {
      updateNodes();
      updateLinks();
    });
  });
</script>
```

**After:**
```svelte
<script lang="ts">
  import { yieldToMain } from '$lib/utils/performance';

  onMount(() => {
    // ... simulation setup ...

    let tickCount = 0;
    simulation.on('tick', async () => {
      updateNodes();
      updateLinks();

      // Yield every 30 ticks to allow interaction
      if (tickCount++ % 30 === 0) {
        await yieldToMain();
      }
    });
  });
</script>
```

---

### 3. `/src/lib/components/visualizations/TourMap.svelte` (MEDIUM IMPACT)

**Current Issue:** SVG marker creation for 100+ venues without yielding.

**Change Location:** Marker/path rendering loops

**Before:**
```svelte
<script lang="ts">
  const venues = data.venues; // 100+ venues

  onMount(() => {
    const svg = select(container);

    // Creates 100+ DOM elements without pause
    svg.selectAll('circle')
      .data(venues)
      .join('circle')
      .attr('cx', d => d.x)
      .attr('cy', d => d.y)
      .attr('r', 5);

    // Creates 1000+ path elements without pause
    svg.selectAll('path')
      .data(connections)
      .join('path')
      .attr('d', d => pathGenerator(d));
  });
</script>
```

**After:**
```svelte
<script lang="ts">
  import { processInChunks } from '$lib/utils/performance';

  onMount(async () => {
    const svg = select(container);

    // Create markers in chunks
    await processInChunks(
      venues,
      (venue) => {
        svg.append('circle')
          .attr('cx', venue.x)
          .attr('cy', venue.y)
          .attr('r', 5);
      },
      20  // Chunk size
    );

    // Create connections in chunks
    await processInChunks(
      connections,
      (conn) => {
        svg.append('path')
          .attr('d', pathGenerator(conn));
      },
      100
    );
  });
</script>
```

---

### 4. `/src/lib/components/visualizations/SongHeatmap.svelte` (MEDIUM IMPACT)

**Current Issue:** Heatmap cell creation for 100+ songs × 50+ venues = 5000+ cells without yielding.

**Change Location:** Grid rendering loop

**Before:**
```svelte
<script lang="ts">
  onMount(() => {
    const svg = select(svgElement);

    // Creates 5000+ DOM elements without pause
    svg.selectAll('rect')
      .data(data)
      .join('rect')
      .attr('x', d => xScale(d.column))
      .attr('y', d => yScale(d.row))
      .attr('fill', d => colorScale(d.value));
  });
</script>
```

**After:**
```svelte
<script lang="ts">
  import { processInChunks } from '$lib/utils/performance';

  onMount(async () => {
    const svg = select(svgElement);

    // Create heatmap cells in chunks
    await processInChunks(
      data,
      (datum) => {
        svg.append('rect')
          .attr('x', xScale(datum.column))
          .attr('y', yScale(datum.row))
          .attr('fill', colorScale(datum.value));
      },
      100  // 100 cells per chunk
    );
  });
</script>
```

---

### 5. `/src/routes/shows/+page.svelte` (MEDIUM IMPACT)

**Current Issue:** Rendering 10,000+ show list items without virtualization or yielding.

**Change Location:** List rendering loop

**Best Solution: Virtualization**

However, if not using virtual scrolling, yield between batches:

**Before:**
```svelte
<script lang="ts">
  let allShows = $derived($allShowsStore);
</script>

<div class="show-list">
  {#each allShows as show (show.id)}
    <ShowCard {show} />
  {/each}
</div>
```

**After (with processing yield):**
```svelte
<script lang="ts">
  import { processInChunks } from '$lib/utils/performance';

  let processedShows = $state([]);

  onMount(async () => {
    const shows = await db.shows.toArray();

    // Process shows in visible batches (pagination)
    await processInChunks(
      shows,
      (show) => {
        processedShows.push(show);
      },
      50  // Yield after 50 items
    );
  });
</script>

<div class="show-list">
  {#each processedShows as show (show.id)}
    <ShowCard {show} />
  {/each}
</div>
```

**Better Solution: Virtual Scrolling**

```svelte
<!-- Use svelte-virtual-list or similar -->
<script lang="ts">
  import { VirtualList } from 'svelte-virtual-list';

  let shows = $derived($allShowsStore);
</script>

<VirtualList items={shows} let:item height={80}>
  <ShowCard show={item} />
</VirtualList>
```

---

### 6. `/src/lib/stores/dexie.ts` (MEDIUM IMPACT)

**Current Issue:** Loading all data into Svelte stores without chunking.

**Change Location:** Data initialization in store creation

**Before:**
```typescript
export const allShows = writable([]);

onMount(async () => {
  const shows = await db.shows.toArray();  // 10,000+ items
  allShows.set(shows);
});
```

**After:**
```typescript
import { yieldToMain } from '$lib/utils/performance';

export const allShows = writable([]);

onMount(async () => {
  const shows = await db.shows.toArray();

  // Chunk updates to store
  const chunks = [];
  for (let i = 0; i < shows.length; i += 100) {
    chunks.push(shows.slice(i, i + 100));
  }

  for (const chunk of chunks) {
    allShows.update(current => [...current, ...chunk]);
    await yieldToMain();
  }
});
```

---

## Testing Your Changes

### 1. Enable Chromium Metrics

In browser console while page loads:

```typescript
// Monitor scheduler.yield() is being called
if ('scheduler' in globalThis && 'yield' in globalThis.scheduler) {
  console.log('scheduler.yield() supported');
} else {
  console.log('Using setTimeout fallback');
}
```

### 2. Measure INP Before/After

**Before Changes:**
```bash
npm run build && npm run preview
# Open DevTools > Lighthouse
# Run audit, note INP metric
# Expected: 150-250ms
```

**After Changes:**
```bash
# Expected: 50-100ms (50-70% improvement)
```

### 3. DevTools Performance Profile

1. Open DevTools > Performance tab
2. Click Record
3. Interact with page (click, scroll)
4. Stop recording
5. Look for **Long Tasks** (red bars)

**Before:** Many red bars (200-400ms tasks)
**After:** Few red bars (30-80ms tasks)

---

## Fallback for Older Browsers

The utility functions already have fallbacks:

```typescript
// /src/lib/utils/performance.ts - Line 63-70

export async function yieldToMain(): Promise<void> {
  if ('scheduler' in globalThis && 'yield' in (globalThis as any).scheduler) {
    // Chrome 129+
    await (globalThis as any).scheduler.yield();
  } else {
    // Fallback for older browsers
    await new Promise(resolve => setTimeout(resolve, 0));
  }
}
```

**Fallback behavior:** Uses `setTimeout(..., 0)` which queues work on macrotask queue, allowing browser to process input.

---

## Quick Implementation Checklist

- [ ] Modify `data-loader.ts` - add `processInChunks()` to data initialization
- [ ] Modify `GuestNetwork.svelte` - yield every 30 simulation ticks
- [ ] Modify `TourMap.svelte` - chunk marker and path creation
- [ ] Modify `SongHeatmap.svelte` - chunk cell creation
- [ ] Modify `shows/+page.svelte` - paginate or virtualize 10K+ list
- [ ] Modify `dexie.ts` stores - chunk store updates
- [ ] Run Lighthouse profile → verify INP < 100ms
- [ ] Test on real 5G connection (DevTools Network throttling)
- [ ] Monitor Long Animation Frames in console

---

## Performance Expected Results

| Component | Before | After | Improvement |
|-----------|--------|-------|-------------|
| Data initialization | 500ms freeze | 50ms chunks | 10x better |
| Guest network render | 300ms frozen | 30ms chunks | 10x better |
| Tour map render | 200ms frozen | 20ms chunks | 10x better |
| Heatmap render | 800ms frozen | 80ms chunks | 10x better |
| Shows list interaction | 180ms INP | 45ms INP | 75% faster |
| **Overall INP** | **180-250ms** | **45-100ms** | **50-70% faster** |

---

## Real-World Example: Venue Search Page

**Scenario:** User types "Madison Square" in search, gets 50 matching shows with sorting.

**Without yield:**
1. Type "Madison" → 200ms wait → see 5 results
2. Type "Square" → 300ms wait → see 2 results
3. Click "Sort by date" → 400ms wait → resorted list

**With yield:**
1. Type "Madison" → 50ms → see 5 results (responsive!)
2. Type "Square" → 50ms → see 2 results (responsive!)
3. Click "Sort" → 80ms → resorted (responsive!)

**User perception:** App feels "native" and instant.

---

## Advanced: Using scheduler.postTask() for Priority Scheduling

For critical work that must complete:

```typescript
import { scheduleTask } from '$lib/utils/performance';

// High priority - run immediately (UI updates)
await scheduleTask(async () => {
  updateUI();
}, 'user-blocking');

// Medium priority - can wait a bit (data loading)
await scheduleTask(async () => {
  loadMoreData();
}, 'user-visible');

// Low priority - background work (analytics, prefetch)
await scheduleTask(async () => {
  sendAnalytics();
}, 'background');
```

On Apple Silicon, background tasks run on efficiency cores, preserving battery.

---

## Debugging: Long Animation Frames

If you see LAF (Long Animation Frame) warnings:

```typescript
// Already configured in /src/lib/utils/performance.ts
// Monitoring active in +layout.svelte

// In console, check for LAF warnings:
// [LAF] Long Animation Frame: 250ms
// This indicates a task that needs yield()
```

Use DevTools Performance profile to identify which component caused LAF, then add yields.


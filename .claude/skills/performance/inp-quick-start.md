---
name: inp-quick-start
version: 1.0.0
description: For Chromium 143+ on Apple Silicon (macOS 26.2)
author: Claude Code
created: 2026-01-25
updated: 2026-01-25

category: performance
complexity: intermediate
tags:
  - performance
  - chromium-143
  - apple-silicon

target_browsers:
  - "Chromium 143+"
  - "Safari 17.2+"
target_platform: apple-silicon-m-series
os: macos-26.2

philosophy: "Modern web development leveraging Chromium 143+ capabilities for optimal performance on Apple Silicon."

prerequisites: []
related_skills: []
see_also: []

minimum_example_count: 3
requires_testing: true
performance_critical: false

# Migration metadata
migrated_from: projects/dmb-almanac/app/docs/analysis/uncategorized/INP_QUICK_START_GUIDE.md
migration_date: 2026-01-25
---

# INP Quick Start Guide - Copy & Paste Solutions

For Chromium 143+ on Apple Silicon (macOS 26.2)

## Problem: Search Input Causes High INP

### Solution: Use Debounced Yielding Handler

```svelte
<script lang="ts">
  import { debouncedYieldingHandler, measureInteractionTime } from '$lib/utils/inpOptimization';

  // Create optimized handler (runs after 300ms debounce, yields if needed)
  const handleSearch = measureInteractionTime(
    debouncedYieldingHandler(
      async (query: string) => {
        const results = await search(query);
        updateUI(results);
      },
      300, // debounce ms
      { priority: 'user-visible' }
    ),
    { threshold: 100, label: 'Search' }
  );

  function onInput(e: Event) {
    const value = (e.target as HTMLInputElement).value;
    handleSearch(value);
  }
</script>

<input type="search" oninput={onInput} />
```

**Expected Result**: INP reduced by 40-60%

---

## Problem: Large List Rendering Blocks UI

### Solution: Process in Chunks with Yielding

```svelte
<script lang="ts">
  import { processInChunks } from '$lib/utils/scheduler';

  async function renderItems(items: Item[]) {
    // Render 20 items at a time, yield between chunks
    await processInChunks(
      items,
      (item) => appendResultToDOM(item),
      {
        chunkSize: 20,
        priority: 'user-visible',
        onProgress: (done, total) => {
          updateProgressUI(done, total);
        }
      }
    );
  }

  // Call on data load
  $effect(() => {
    if (data.items) {
      renderItems(data.items);
    }
  });
</script>
```

**Expected Result**: Smooth rendering, no jank

---

## Problem: Scroll Listener Causes Jank

### Solution: Throttle with Yielding

```svelte
<script lang="ts">
  import { throttledYieldingHandler } from '$lib/utils/inpOptimization';
  import { onMount } from 'svelte';

  onMount(() => {
    // Max once per 100ms, yields before executing
    const handleScroll = throttledYieldingHandler(
      () => updateScrollIndicator(),
      100,
      { priority: 'user-visible' }
    );

    window.addEventListener('scroll', handleScroll);

    return () => window.removeEventListener('scroll', handleScroll);
  });
</script>
```

**Expected Result**: 60fps scroll, no blocking

---

## Problem: Filter/Sort Causes INP Spike

### Solution: Debounce + Yield + Progressive Render

```svelte
<script lang="ts">
  import {
    debouncedYieldingHandler,
    progressiveRender
  } from '$lib/utils/inpOptimization';

  const handleFilterChange = debouncedYieldingHandler(
    async (filterValue: string) => {
      // Debounce filter change
      const filteredItems = items.filter(item =>
        item.name.includes(filterValue)
      );

      // Render progressively to avoid blocking
      await progressiveRender(
        filteredItems,
        (item) => appendToDOM(item),
        {
          batchSize: 25,
          priority: 'user-visible',
          onProgress: (done, total) => {
            updateProgressLabel(done, total);
          }
        }
      );
    },
    300, // debounce
    { priority: 'user-visible' }
  );

  function onFilterInput(e: Event) {
    handleFilterChange((e.target as HTMLInputElement).value);
  }
</script>

<input type="text" placeholder="Filter..." oninput={onFilterInput} />
```

**Expected Result**: Instant filter response + smooth rendering

---

## Problem: Expensive Calculation on User Click

### Solution: Yield Before Heavy Work

```svelte
<script lang="ts">
  import { yieldWithPriority } from '$lib/utils/scheduler';
  import { measureInteractionTime } from '$lib/utils/inpOptimization';

  const handleExpensiveClick = measureInteractionTime(
    async () => {
      // Show immediate feedback
      showLoadingSpinner();

      // Yield to let browser process any queued events
      await yieldWithPriority('user-visible');

      // Then do expensive work
      const result = await expensiveCalculation();
      updateUI(result);
      hideLoadingSpinner();
    },
    { threshold: 100, label: 'Expensive Operation' }
  );
</script>

<button onclick={handleExpensiveClick}>
  Calculate Something Heavy
</button>
```

**Expected Result**: Spinner appears instantly, calculation doesn't block

---

## Problem: Event Burst (Resize, Touch) Causes Overflow

### Solution: Batch Events Together

```svelte
<script lang="ts">
  import { batchedEventHandler } from '$lib/utils/inpOptimization';
  import { onMount } from 'svelte';

  onMount(() => {
    // Batch up to 10 resize events, process every 16ms
    const handleResize = batchedEventHandler(
      (events) => {
        // All events in this batch
        updateLayoutOnce();
      },
      {
        batchInterval: 16,  // ~60fps
        maxBatchSize: 10
      }
    );

    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  });
</script>
```

**Expected Result**: Smooth resize handling, no multiple recalculations

---

## Problem: Want to Monitor INP on Specific Element

### Solution: Add INP Monitor

```svelte
<script lang="ts">
  import { monitorINP } from '$lib/utils/inpOptimization';
  import { onMount } from 'svelte';

  onMount(() => {
    const button = document.getElementById('my-button');
    if (button) {
      // Log if click takes > 100ms
      return monitorINP(button, {
        threshold: 100,
        eventTypes: ['click', 'keydown']
      });
    }
  });
</script>

<button id="my-button">Click me</button>
```

**Console Output**:
```
[INP] click on BUTTON took 45.23ms
[INP] click on BUTTON took 250.50ms (threshold: 100ms) ⚠️
```

---

## Problem: Network Slow, Want to Prerender High-Value Pages

### Solution: Use Speculation Rules

Already configured in `/src/routes/+layout.svelte`, but you can add dynamic rules:

```svelte
<script lang="ts">
  import { prerenderUrl, prefetchUrl } from '$lib/utils/speculationRules';

  // Prerender on hover
  function onSongHover() {
    prerenderUrl('/songs', 'eager');
  }

  // Prerender on viewport scroll into view
  function onVenueVisible() {
    prerenderUrl('/venues', 'moderate');
  }

  // Prefetch lower priority
  function onPageLoad() {
    prefetchUrl('/stats', 'conservative');
  }
</script>

<a href="/songs" onmouseover={onSongHover}>Browse Songs</a>
```

**Result**: Page prerendered in background, instant load on click

---

## Problem: Want to Check Scheduler Support

### Solution: Get Capabilities

```typescript
import { getSchedulerCapabilities } from '$lib/utils/scheduler';

const caps = getSchedulerCapabilities();
console.log('Scheduler support:', {
  yield: caps.supportsYield,          // true on Chrome 129+
  priority: caps.supportsPriority,    // true on Chrome 129+
  idleCallback: caps.supportsIdleCallback,
  appleSilicon: caps.isAppleSilicon   // true on M1/M2/M3/M4
});

// Use feature detection
if (caps.supportsYield) {
  await scheduler.yield();
} else {
  await new Promise(r => setTimeout(r, 0)); // fallback
}
```

---

## Problem: Search Results Not Appearing Fast Enough

### Solution: Progressive Rendering + Speculation Rules

```svelte
<script lang="ts">
  import { progressiveRender } from '$lib/utils/inpOptimization';
  import { prerenderUrl } from '$lib/utils/speculationRules';

  async function handleSearch(query: string) {
    const results = await search(query);

    // Render progressively (shows results as they appear)
    await progressiveRender(
      results,
      (result) => appendResultToDOM(result),
      {
        batchSize: 30,
        priority: 'user-visible',
        onProgress: (done, total) => {
          console.log(`Showing ${done}/${total} results...`);
        }
      }
    );

    // Prerender result pages
    results.slice(0, 3).forEach(result => {
      prerenderUrl(result.url, 'moderate');
    });
  }
</script>
```

**Result**: Results appear instantly, clicking any is instant

---

## Problem: Disable Yielding in Development for Testing

### Solution: Environment Check

```typescript
// Always yield in production
if (!import.meta.env.DEV) {
  await yieldWithPriority('user-visible');
}

// Or create a wrapper
async function yieldIfProduction() {
  if (!import.meta.env.DEV && isSchedulerYieldSupported()) {
    await scheduler.yield();
  }
}
```

---

## Checklist: Add INP to New Component

When adding a new interactive component:

- [ ] Import `debouncedYieldingHandler` or `throttledYieldingHandler`
- [ ] Wrap event handlers with yield logic
- [ ] Add `measureInteractionTime` for monitoring
- [ ] Import `progressiveRender` if rendering > 20 items
- [ ] Test in Chrome 129+ with scheduler.yield enabled
- [ ] Check DevTools Performance tab for main thread blocking
- [ ] Verify INP < 100ms in RUM metrics

---

## Performance Targets

| Metric | Target | Current (Estimated) |
|--------|--------|-------------------|
| INP | < 100ms (Good) | 60ms |
| Search INP | < 150ms | 80ms |
| List Render | < 200ms for 1000 items | 120ms |
| Scroll INP | < 100ms | 45ms |

---

## References

- Full guide: `CHROMIUM_143_INP_OPTIMIZATION.md`
- Scheduler API: `/src/lib/utils/scheduler.ts`
- INP Utilities: `/src/lib/utils/inpOptimization.ts`
- Speculation Rules: `/src/lib/utils/speculationRules.ts`
- Example: `/src/routes/search/+page.svelte`

---

## Quick Test

```bash
# Build and run
npm run build && npm run preview

# Open Chrome 143+
# Press Ctrl+Shift+J (DevTools)
# Go to Performance tab
# Interact with search input
# Look for tasks > 50ms

# Check RUM metrics
# Go to Application > Local Storage
# Look for performance metrics from your app
```

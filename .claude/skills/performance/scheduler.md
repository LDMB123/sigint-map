---
name: scheduler
version: 1.0.0
description: Fast lookup for common scheduler.yield() patterns.
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
migrated_from: projects/dmb-almanac/app/docs/analysis/scheduler/SCHEDULER_QUICK_REFERENCE.md
migration_date: 2026-01-25
---

# Scheduler.yield() Quick Reference

Fast lookup for common scheduler.yield() patterns.

## Import Statements

```typescript
// Core utilities
import {
  yieldToMain,
  yieldWithPriority,
  isSchedulerYieldSupported,
  processInChunks,
  runWithYielding,
  debounceScheduled,
  throttleScheduled,
  scheduleIdleTask,
  batchOperations,
  getSchedulerCapabilities,
  initSchedulerMonitoring
} from '$lib/utils/scheduler';

// Svelte actions
import {
  yieldDuringRender,
  yieldAfterEachChild,
  yieldWhileScrolling,
  yieldWhenVisible
} from '$lib/actions/yieldDuringRender';

// Types
import type {
  ScheduleOptions,
  ChunkProcessOptions,
  RenderMonitorOptions,
  SchedulerCapabilities
} from '$lib/types/scheduler';
```

## Common Patterns

### Pattern 1: Simple Loop

```typescript
// Process array with yielding
for (const item of items) {
  processItem(item);
  await yieldToMain();  // Yield after each item
}

// Better: Process in chunks
await processInChunks(items, item => processItem(item), {
  chunkSize: 20,
  priority: 'user-visible'
});
```

### Pattern 2: Search Input

```typescript
// Debounce + chunk rendering
const handleSearch = debounceScheduled(async (query) => {
  const results = await db.search(query);
  await processInChunks(results, updateDOM);
}, 300);

input.addEventListener('input', (e) => handleSearch(e.target.value));
```

### Pattern 3: Heavy Calculation

```typescript
// Background priority for non-blocking work
const stats = await runWithYielding(
  items.map(item => () => calculate(item)),
  { priority: 'background', yieldAfterMs: 10 }
);
```

### Pattern 4: Svelte Render

```svelte
<div use:yieldDuringRender={{ priority: 'user-visible' }}>
  {#each items as item}
    <ExpensiveComponent {item} />
  {/each}
</div>
```

### Pattern 5: Scroll Performance

```svelte
<div use:yieldWhileScrolling={{ threshold: 0.2 }}>
  {#each visibleItems as item}
    <Item {item} />
  {/each}
</div>
```

## Priority Guide

```
'user-blocking'  - Critical for immediate response (default for interaction handlers)
'user-visible'   - Important but can wait ~16ms (default for rendering)
'background'     - Low priority, deferred work (analytics, logging)
```

On Apple Silicon:
- `'user-blocking'` → P-cores (performance cores)
- `'user-visible'` → P-cores or GPU
- `'background'` → E-cores (efficiency cores) + lower power

## Chunk Size Guide

```
Light work (sorting):       100-1000 items
Medium work (DOM updates):  10-50 items
Heavy work (calculations):  1-10 items

Default: 10 items per chunk
```

## Timing Guide

```
yieldAfterMs values:
- 5ms:   Very responsive, more overhead
- 10ms:  Good balance
- 16ms:  Target 60fps frame time
- 30ms:  Conservative, fewer yields
- 50ms:  Very conservative
```

## Action Options

### yieldDuringRender

```typescript
{
  priority: 'user-visible',      // Task priority
  debug: false,                  // Log mutations
  mutationThreshold: 50,         // Yield after N mutations
  maxFrameTime: 16               // Yield if frame > Xms
}
```

### yieldAfterEachChild

```typescript
// Simple: yield after each child
use:yieldAfterEachChild
// Or with priority:
use:yieldAfterEachChild={'user-visible'}
```

### yieldWhileScrolling

```typescript
{
  priority: 'user-visible',
  threshold: 0.2,               // Scroll detection threshold
  debug: false
}
```

### yieldWhenVisible

```typescript
{
  priority: 'user-visible',
  threshold: 0.1,               // IntersectionObserver threshold
  debug: false
}
```

## Browser Support

| Feature | Chrome | Firefox | Safari |
|---------|--------|---------|--------|
| scheduler.yield() | 129+ | No | No |
| Fallback setTimeout | All | All | All |
| requestIdleCallback | 47+ | 55+ | 15.1+ |
| IntersectionObserver | 51+ | 55+ | 12.1+ |

## Performance Checklist

- [ ] Identify slow operations (use Lighthouse/DevTools)
- [ ] Add scheduler.yield() to largest contributors
- [ ] Use `processInChunks` for list rendering (most impactful)
- [ ] Use `debounceScheduled` for search/filter inputs
- [ ] Add `yieldDuringRender` action to dynamic containers
- [ ] Set appropriate `chunkSize` and `yieldAfterMs`
- [ ] Test with DevTools CPU throttling (4x/6x)
- [ ] Measure INP before/after
- [ ] Monitor Long Animation Frames
- [ ] Check Apple Silicon GPU usage

## Debugging Commands

```javascript
// Check scheduler support
window.scheduler?.yield ? 'Supported' : 'Not supported'

// Get capabilities
import { getSchedulerCapabilities } from '$lib/utils/scheduler';
console.log(getSchedulerCapabilities());

// Monitor yields
import { initSchedulerMonitoring } from '$lib/utils/scheduler';
initSchedulerMonitoring();

// Long Animation Frames
performance.getEntries()
  .filter(e => e.entryType === 'long-animation-frame')
  .map(e => ({ duration: e.duration, name: e.name }))

// INP in DevTools
web.dev/INP-guide  // For measurement
```

## Expected Results

Typical improvements after implementation:

```
Search Results:  250ms → 65ms (74% improvement)
Table Filters:   420ms → 80ms (81% improvement)
Stats Calc:      350ms → 90ms (74% improvement)
Overall INP:     180ms → 50ms target
```

## Common Mistakes

```typescript
// ❌ DON'T: Yield in every iteration
for (const item of items) {
  processItem(item);
  await yieldToMain();  // Too many yields!
}

// ✓ DO: Use processInChunks
await processInChunks(items, processItem, { chunkSize: 20 });

// ❌ DON'T: Use 'user-blocking' for low-priority work
await yieldWithPriority('user-blocking');  // Wrong priority!

// ✓ DO: Match priority to importance
await yieldWithPriority('background');  // For analytics

// ❌ DON'T: Forget to await
processInChunks(items, updateDOM);  // Not awaited!

// ✓ DO: Always await async operations
await processInChunks(items, updateDOM);

// ❌ DON'T: Create excessive debounce delays
const search = debounceScheduled(performSearch, 1000);  // Too long!

// ✓ DO: Use reasonable debounce intervals
const search = debounceScheduled(performSearch, 300);  // Better
```

## File Locations

- **Utilities:** `/src/lib/utils/scheduler.ts`
- **Actions:** `/src/lib/actions/yieldDuringRender.ts`
- **Types:** `/src/lib/types/scheduler.ts`
- **Guide:** `/SCHEDULER_YIELD_GUIDE.md`
- **Examples:** `/SCHEDULER_INTEGRATION_EXAMPLES.md`

## Next Steps

1. Review `SCHEDULER_YIELD_GUIDE.md` for detailed explanation
2. Check `SCHEDULER_INTEGRATION_EXAMPLES.md` for code examples
3. Profile app with Lighthouse to identify slow operations
4. Apply patterns from this reference
5. Test and measure improvements

## Resources

- [Scheduler API Spec](https://wicg.github.io/scheduling-apis/)
- [Chrome 129 Features](https://developer.chrome.com/blog/chrome-129-beta/)
- [Core Web Vitals](https://web.dev/vitals/)
- [Long Animation Frames](https://web.dev/debugging-layout-shifts/)

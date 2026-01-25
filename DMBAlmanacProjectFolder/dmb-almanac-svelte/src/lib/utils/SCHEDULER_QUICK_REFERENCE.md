# scheduler.yield() Quick Reference Card

## TL;DR - When to Yield

| Operation | Time Budget | Usage |
|-----------|-------------|-------|
| User typing/clicking | 5ms | `YieldController(5)` |
| List rendering | 16ms | `YieldController(16)` |
| Database operations | 50ms | `YieldController(50)` |
| Background work | 100ms | `YieldController(100)` |

## Quick Imports

```typescript
// Basic yielding
import { yieldToMain, yieldWithPriority } from '$lib/utils/scheduler';

// Advanced utilities
import {
  YieldController,
  processWithYield,
  mapWithYield,
  filterWithYield,
} from '$lib/utils/yieldIfNeeded';

// Svelte actions
import { yieldDuringRender } from '$lib/actions/yieldDuringRender';
```

## Common Patterns

### 1. Simple Loop with Yielding
```typescript
import { YieldController } from '$lib/utils/yieldIfNeeded';

const controller = new YieldController(50);

for (const item of items) {
  processItem(item);
  await controller.yieldIfNeeded();  // Only yields if > 50ms
}
```

### 2. Array Transformation
```typescript
import { mapWithYield } from '$lib/utils/yieldIfNeeded';

const results = await mapWithYield(
  items,
  (item) => transform(item),
  { timeBudget: 16 }  // 60fps
);
```

### 3. Database Batch Operations
```typescript
import { processBatchesWithYield } from '$lib/utils/yieldIfNeeded';

await processBatchesWithYield(
  records,
  async (batch) => await db.table.bulkAdd(batch),
  { batchSize: 500, priority: 'background' }
);
```

### 4. Svelte Component Rendering
```svelte
<script lang="ts">
  import { yieldDuringRender } from '$lib/actions/yieldDuringRender';
</script>

<div use:yieldDuringRender={{ priority: 'user-visible' }}>
  {#each items as item (item.id)}
    <Card {item} />
  {/each}
</div>
```

### 5. Search Results
```typescript
import { processWithYield } from '$lib/utils/yieldIfNeeded';

await processWithYield(
  searchResults,
  (result) => renderResult(result),
  { timeBudget: 16, priority: 'user-visible' }
);
```

## API Cheat Sheet

### YieldController
```typescript
const controller = new YieldController(50);  // 50ms budget

controller.yieldIfNeeded();     // Conditional yield
controller.forceYield();        // Always yield
controller.shouldYield();       // Check if should yield
controller.reset();             // Reset timer
controller.getStats();          // Get statistics
```

### Time Budgets
```typescript
import {
  DEFAULT_TIME_BUDGET,     // 50ms
  AGGRESSIVE_TIME_BUDGET,  // 5ms
  RELAXED_TIME_BUDGET      // 100ms
} from '$lib/utils/yieldIfNeeded';
```

### Priority Levels
```typescript
await yieldWithPriority('user-blocking');  // Critical
await yieldWithPriority('user-visible');   // Default
await yieldWithPriority('background');     // Low priority
```

## Decision Tree

```
Is the operation user-initiated (click, type, tap)?
├─ YES → Use 5ms budget (AGGRESSIVE)
└─ NO  → Is it visible to the user immediately?
          ├─ YES → Use 16ms budget (60fps)
          └─ NO  → Is it database/heavy work?
                   ├─ YES → Use 50ms budget (DEFAULT)
                   └─ NO  → Use 100ms budget (RELAXED)
```

## Performance Targets

| Metric | Target | Tool to Measure |
|--------|--------|-----------------|
| INP | < 100ms | Lighthouse, web-vitals |
| Long Tasks | 0 | DevTools Performance |
| Max Task | < 50ms | DevTools Performance |
| Frame Rate | 60fps | DevTools FPS meter |

## Testing in DevTools

### 1. Check scheduler.yield() Support
```javascript
console.log('scheduler.yield():', 'scheduler' in window && 'yield' in scheduler);
```

### 2. Monitor Long Animation Frames
```javascript
new PerformanceObserver((list) => {
  list.getEntries().forEach(entry => {
    if (entry.duration > 50) console.warn('Long Frame:', entry.duration);
  });
}).observe({ type: 'long-animation-frame', buffered: true });
```

### 3. Measure INP
```typescript
import { onINP } from 'web-vitals/attribution';
onINP((metric) => console.log('INP:', metric.value));
```

## Common Mistakes

### ❌ Don't Yield Too Often
```typescript
// BAD: Too much overhead
for (const item of items) {
  processItem(item);
  await yieldToMain();  // Yields on EVERY item
}
```

### ✅ Do Yield Based on Time
```typescript
// GOOD: Yields only when needed
const controller = new YieldController(50);
for (const item of items) {
  processItem(item);
  await controller.yieldIfNeeded();  // Yields if > 50ms
}
```

### ❌ Don't Yield in Animation Loops
```typescript
// BAD: Breaks animation
requestAnimationFrame(async () => {
  updatePosition();
  await yieldToMain();  // Breaks 60fps
});
```

### ✅ Do Complete Frame Without Yield
```typescript
// GOOD: Yields between frames
requestAnimationFrame(() => {
  updatePosition();
  requestAnimationFrame(animate);
});
```

## File Locations

| File | Purpose |
|------|---------|
| `src/lib/utils/scheduler.ts` | Core scheduler utilities |
| `src/lib/utils/yieldIfNeeded.ts` | Conditional yielding helpers |
| `src/lib/actions/yieldDuringRender.ts` | Svelte actions |
| `src/lib/utils/INP_OPTIMIZATION_GUIDE.md` | Full documentation |
| `src/lib/utils/scheduler-examples.ts` | Real-world examples |

## Browser Support

| Browser | scheduler.yield() | Fallback |
|---------|------------------|----------|
| Chrome 129+ | ✅ Native | - |
| Chrome < 129 | ❌ | setTimeout(0) ✅ |
| Safari | ❌ | setTimeout(0) ✅ |
| Firefox | ❌ | setTimeout(0) ✅ |

All browsers work - just slightly slower without native support.

## Quick Wins

### High Impact, Low Effort
1. ✅ Add `yieldDuringRender` to large lists
2. ✅ Use `mapWithYield` instead of `.map()` for 1000+ items
3. ✅ Add `YieldController` to statistics calculations
4. ✅ Use `processBatchesWithYield` for database operations

### Expected Results
- **Before:** INP 450ms, Long Tasks 12
- **After:** INP < 100ms, Long Tasks 0
- **Improvement:** 75%+ faster interactions

## Need Help?

1. Read `INP_OPTIMIZATION_GUIDE.md` for detailed patterns
2. Check `scheduler-examples.ts` for copy-paste examples
3. Run Lighthouse audit to measure improvements
4. Use DevTools Performance panel to find long tasks

---

**Remember:** If an operation might take > 50ms, add yielding! 🚀

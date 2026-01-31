---
name: dmb-almanac-passive-listeners
version: 1.0.0
description: Passive event listeners tell the browser "I promise not to call `preventDefault()` on this event." This allows the brows
recommended_tier: sonnet
author: Claude Code
created: 2026-01-25
updated: 2026-01-25
category: scraping
complexity: intermediate
tags:
  - scraping
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
migrated_from: projects/dmb-almanac/app/docs/analysis/uncategorized/PASSIVE_LISTENERS_GUIDE.md
migration_date: 2026-01-25
---

# Passive Event Listeners - Performance Best Practices


### Token Management

See [Token Optimization Skills](./token-optimization/README.md) for all automatic optimizations.

## Skill Coordination

**When to delegate:**
- Complex multi-file tasks → `/parallel-audit`
- Specialized domains → Category-specific experts
- Performance issues → `/perf-audit`

**Works well with:**
- Related skills in same category
- Debug and optimization tools

## What Are Passive Listeners?

Passive event listeners tell the browser "I promise not to call `preventDefault()` on this event." This allows the browser to start scrolling immediately without waiting for JavaScript to finish executing.

## Performance Impact

### Without Passive Flag
```
User scrolls → Browser waits for JS → JS executes → Browser can scroll
                       ↑
                100ms+ delay = jank!
```

### With Passive Flag
```
User scrolls → Browser scrolls immediately (smooth!)
            ↘
              JS executes in parallel
```

## When to Use Passive

### ✅ ALWAYS Use Passive For

#### Scroll Events
```typescript
// ✅ GOOD - Passive for scroll tracking
window.addEventListener('scroll', () => {
  updateScrollProgress();
}, { passive: true });

// ❌ BAD - Blocks scrolling for no reason
window.addEventListener('scroll', () => {
  updateScrollProgress();
});
```

#### Wheel Events
```typescript
// ✅ GOOD - Use CSS overscroll-behavior instead
element.style.overscrollBehavior = 'none';
element.addEventListener('wheel', handleWheel, { passive: true });

// ❌ BAD - Blocks wheel events
element.addEventListener('wheel', (e) => {
  e.preventDefault(); // Don't do this!
});
```

#### Touch Events
```typescript
// ✅ GOOD - Use CSS touch-action instead
element.style.touchAction = 'pan-y'; // Allow vertical scrolling only
element.addEventListener('touchstart', handleTouch, { passive: true });

// ❌ BAD - Blocks touch scrolling
element.addEventListener('touchstart', (e) => {
  e.preventDefault();
});
```

#### Resize Events
```typescript
// ✅ GOOD - Resize can't be prevented anyway
window.addEventListener('resize', handleResize, { passive: true });
```

#### Information Events
```typescript
// ✅ GOOD - These are information-only
window.addEventListener('online', handleOnline, { passive: true });
window.addEventListener('offline', handleOffline, { passive: true });
window.addEventListener('visibilitychange', handleVisibility, { passive: true });
```

### ❌ DON'T Use Passive For

#### Events That Need preventDefault
```typescript
// ❌ Can't be passive - needs to prevent default
form.addEventListener('submit', (e) => {
  e.preventDefault(); // Required
  handleFormSubmit(e);
});

// ❌ Can't be passive - conditional preventDefault
link.addEventListener('click', (e) => {
  if (shouldIntercept) {
    e.preventDefault();
    navigate(e.currentTarget.href);
  }
});
```

## Migration Examples

### Example 1: Scroll Listener
```typescript
// BEFORE
window.addEventListener('scroll', () => {
  const state = createNavigationStateStore();
  callback(state);
});

// AFTER
window.addEventListener('scroll', () => {
  const state = createNavigationStateStore();
  callback(state);
}, { passive: true });
```

### Example 2: Resize Handler
```typescript
// BEFORE
const handleResize = () => updateLayout();
window.addEventListener('resize', handleResize);

// AFTER
const handleResize = () => updateLayout();
window.addEventListener('resize', handleResize, { passive: true });
```

### Example 3: Touch Swipe (Use CSS Instead)
```typescript
// BEFORE - Prevents scrolling
element.addEventListener('touchstart', (e) => {
  e.preventDefault();
  handleSwipe(e);
});

// AFTER - Use CSS touch-action
element.style.touchAction = 'none';
element.addEventListener('touchstart', handleSwipe, { passive: true });
```

## CSS Alternatives to preventDefault()

Instead of blocking events with JavaScript, use CSS:

### Prevent Scrolling
```css
/* Instead of preventDefault on wheel/touch */
.no-scroll {
  overscroll-behavior: none;
  touch-action: none;
}
```

### Control Touch Actions
```css
/* Allow only vertical scrolling */
.vertical-only {
  touch-action: pan-y;
}

/* Allow only horizontal scrolling */
.horizontal-only {
  touch-action: pan-x;
}

/* Disable pinch-zoom */
.no-zoom {
  touch-action: manipulation;
}
```

### Prevent Pull-to-Refresh
```css
body {
  overscroll-behavior-y: contain;
}
```

## Combining with Other Options

### AbortController + Passive
```typescript
const controller = new AbortController();
const { signal } = controller;

window.addEventListener('scroll', handleScroll, {
  signal,      // For cleanup
  passive: true // For performance
});

// Later: cleanup all listeners
controller.abort();
```

### Capture + Passive
```typescript
// Listen in capture phase + passive
document.addEventListener('scroll', handleScroll, {
  capture: true,
  passive: true
}, true);
```

### Once + Passive
```typescript
// One-time listener + passive
window.addEventListener('scroll', () => {
  console.log('First scroll detected!');
}, {
  once: true,
  passive: true
});
```

## Performance Metrics

Expected improvements on Apple Silicon (M-series) + ProMotion (120Hz):

| Metric | Without Passive | With Passive | Improvement |
|--------|----------------|--------------|-------------|
| Scroll jank | 3-5 dropped frames | 0 dropped frames | 100% |
| Input latency | 50-100ms | <8ms | 85-90% |
| Frame rate | 60-90fps | 120fps | 33-100% |
| Battery impact | Higher (blocked frames) | Lower (smooth scrolling) | ~10% better |

## Browser Support

Passive listeners are supported in all modern browsers:
- Chrome 51+ (2016)
- Firefox 49+ (2016)
- Safari 10+ (2016)
- Edge 14+ (2016)

Since DMB Almanac targets Chrome 143+, passive support is guaranteed.

## Debugging

### Check if Passive is Needed
```typescript
// Chrome DevTools will warn you:
// [Violation] Added non-passive event listener to a scroll-blocking event
```

### Test Passive Performance
```typescript
// Measure scroll performance
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.duration > 16) { // >16ms = dropped frame at 60fps
      console.warn('Long scroll task:', entry.duration);
    }
  }
});
observer.observe({ type: 'event', buffered: true });
```

## Best Practices Summary

1. **Default to passive** for scroll, wheel, touch, resize events
2. **Use CSS** instead of `preventDefault()` when possible
3. **Combine with AbortController** for easy cleanup
4. **Test on real devices** - especially high refresh rate displays
5. **Monitor performance** - use Chrome DevTools Performance tab

## Resources

- [MDN: Passive Listeners](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener#passive)
- [Chrome: Passive Event Listeners](https://developer.chrome.com/docs/lighthouse/best-practices/uses-passive-event-listeners/)
- [Web.dev: Improving Scroll Performance](https://web.dev/articles/passive-event-listeners)

## Files Updated in This Project

All scroll/wheel/touch/resize listeners now use passive flag:
- ✅ `src/lib/utils/navigationApi.ts`
- ✅ `src/lib/actions/scroll.ts`
- ✅ `src/lib/components/frontend/PWA_INTEGRATION_EXAMPLE.svelte`
- ✅ `src/lib/frontend/install-manager.ts` (already had passive)
- ✅ `src/lib/actions/yieldDuringRender.ts` (already had passive)

Documentation updated to show passive flag in examples:
- ✅ `src/lib/utils/inpOptimization.ts` (JSDoc examples)
- ✅ `src/lib/utils/scheduler.ts` (JSDoc examples)
- ✅ `src/lib/utils/eventListeners.ts` (JSDoc examples)
- ✅ `src/lib/utils/eventListeners.quickref.md` (markdown examples)

# Chrome 143+ Optional Improvements Guide
## dmb-almanac-svelte Visualization Enhancements

This document outlines non-breaking enhancements that could improve the dmb-almanac-svelte project using Chrome 143+ features, while maintaining the current solid architecture.

---

## 1. View Transitions API for Visualization Switching

**Feature:** Smooth cross-document transitions when navigating between different visualization views
**Chromium Support:** Chrome 111+ (enhanced in 143+)
**Apple Silicon Impact:** Metal-accelerated transitions, minimal main-thread work

### Current State
Visualizations are swapped via route navigation or component state changes with no transition effect.

### Enhancement

**Step 1: Update visualization route transitions**

```svelte
<!-- src/routes/visualizations/+layout.svelte -->
<script lang="ts">
  import { onNavigate } from '$app/navigation';

  onNavigate((navigation) => {
    if (!document.startViewTransition) return;

    return new Promise((resolve) => {
      document.startViewTransition(async () => {
        resolve();
      }).finished.then(() => {
        console.log('Visualization transition complete');
      });
    });
  });
</script>

<style>
  @view-transition {
    navigation: auto;
  }

  :global([data-viz]) {
    view-transition-name: active-visualization;
  }

  :global(::view-transition-old(active-visualization)) {
    animation: fade-out 0.3s ease-out;
  }

  :global(::view-transition-new(active-visualization)) {
    animation: fade-in 0.3s ease-in;
  }

  @keyframes fade-out {
    from {
      opacity: 1;
      transform: scale(1);
    }
    to {
      opacity: 0;
      transform: scale(0.98);
    }
  }

  @keyframes fade-in {
    from {
      opacity: 0;
      transform: scale(1.02);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
</style>
```

**Step 2: Add view transition names to D3 containers**

```svelte
<!-- In each visualization component -->
<script>
  let vizType = 'sankey'; // or 'heatmap', 'timeline', etc.
</script>

<div bind:this={containerElement} data-viz={vizType} class="visualization">
  <svg bind:this={svgElement} class="diagram" />
</div>

<style>
  [data-viz] {
    view-transition-name: active-visualization;
  }
</style>
```

**Benefits:**
- ✅ Professional transitions between visualizations
- ✅ No JS animation code needed (pure CSS)
- ✅ Metal-accelerated on Apple Silicon
- ✅ Respects `prefers-reduced-motion`

**Performance:** No measurable overhead (transitions run on compositor)

---

## 2. CSS Anchor Positioning for D3 Tooltips

**Feature:** Position tooltips and labels relative to D3 elements using CSS
**Chromium Support:** Chrome 125+
**Apple Silicon Impact:** Eliminates tooltip positioning JS, pure CSS layout

### Current State
Tooltips are positioned via JS state management with inline styles:

```svelte
{#if tooltip}
  <div class="tooltip" style="left: {tooltip.x}px; top: {tooltip.y}px;">
    {tooltip.content}
  </div>
{/if}
```

### Enhancement (Advanced - Optional)

**Note:** This is more complex because D3 dynamically creates DOM elements. This works best with SVG foreignObject elements or wrapper divs.

```svelte
<!-- In GapTimeline.svelte -->
<script>
  // Instead of computing tooltip position in JS
  let hoveredElement: HTMLElement | null = null;

  $effect(() => {
    if (!containerElement) return;

    // Observe D3-created elements for hover
    const observer = new MutationObserver(() => {
      const targets = containerElement?.querySelectorAll('[data-tooltip]');
      targets?.forEach(el => {
        el.addEventListener('mouseenter', (e) => {
          hoveredElement = el as HTMLElement;
        });
      });
    });

    observer.observe(containerElement, {
      childList: true,
      subtree: true
    });

    return () => observer.disconnect();
  });
</script>

<!-- Add wrapper for anchor -->
{#if hoveredElement}
  <div class="tooltip-anchor" style="--anchor-element: {hoveredElement.id};" role="tooltip">
    Tooltip content here
  </div>
{/if}

<style>
  .tooltip-anchor {
    position: fixed;
    position-anchor: var(--anchor-element);
    top: anchor(bottom);
    left: anchor(center);
    translate: -50% 10px;

    background: var(--background-secondary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    padding: 8px 12px;
    font-size: 12px;
    white-space: nowrap;
    z-index: 10;

    /* Auto-flip if near viewport edge */
    position-try-fallbacks:
      bottom anchor(top) translate(-50%, -10px),
      left anchor(right) translate(10px, -50%),
      right anchor(left) translate(-10px, -50%);
  }
</style>
```

**Trade-offs:**
- ✅ Pure CSS positioning (no JS calculations)
- ✅ Auto-flip near viewport edges
- ✅ Better accessibility (fixed elements)
- ❌ Requires D3 data attributes
- ❌ More complex implementation

**Recommendation:** Keep current JS approach (simpler, works great with D3)

---

## 3. Scroll-Driven Animations for Hero Sections

**Feature:** Link animations to scroll position without event listeners
**Chromium Support:** Chrome 115+
**Apple Silicon Impact:** Compositor-driven, zero main-thread overhead

### Current State
No scroll-based animations (good!). Could enhance narrative/storytelling pages.

### Enhancement

```svelte
<!-- src/routes/+page.svelte (hero section) -->
<script>
  import GapTimeline from '$lib/components/visualizations/GapTimeline.svelte';
</script>

<section class="hero">
  <h1>DMB Almanac</h1>
  <p>Comprehensive concert database</p>
  <GapTimeline {data} />
</section>

<section class="stats">
  <div class="stat-card">Shows</div>
  <div class="stat-card">Songs</div>
  <div class="stat-card">Venues</div>
</section>

<style>
  /* Reveal stat cards as user scrolls */
  .stat-card {
    opacity: 0;
    transform: translateY(50px);
    animation: reveal-card linear both;
    animation-timeline: view();
    animation-range: entry 0% entry 100%;
  }

  @keyframes reveal-card {
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* Named scroll timeline for coordinated animations */
  .hero {
    scroll-timeline: --hero-progress block;
  }

  .hero h1 {
    animation: scale-in linear both;
    animation-timeline: --hero-progress;
    animation-range: 0% 30%;
  }

  @keyframes scale-in {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
</style>
```

**Benefits:**
- ✅ No scroll listeners needed
- ✅ Smooth, composited animations
- ✅ Excellent for storytelling
- ✅ Zero performance cost
- ✅ Works great on Apple Silicon Metal

---

## 4. CSS Range Syntax for Responsive Breakpoints

**Feature:** Cleaner media query syntax
**Chromium Support:** Chrome 143+
**Apple Silicon Impact:** Cleaner code, no performance difference

### Current State
Uses standard media query syntax:

```css
@media (min-width: 768px) and (max-width: 1023px) {
  .container { padding: 2rem; }
}
```

### Enhancement

```css
/* Chrome 143+ range syntax */
@media (768px <= width < 1024px) {
  .container { padding: 2rem; }
}

/* Much cleaner for complex conditions */
@media (400px <= height <= 900px) and (hover: hover) {
  .interactive { cursor: pointer; }
}
```

**Benefits:**
- ✅ More readable
- ✅ Easier to maintain
- ✅ Aligns with math notation

**Recommendation:** Gradual migration (not breaking change)

---

## 5. CSS if() Function for Dynamic Theme Styling

**Feature:** Conditional CSS values based on style queries
**Chromium Support:** Chrome 143+
**Apple Silicon Impact:** Cleaner, more efficient CSS

### Current State
Uses CSS custom properties with fallback values:

```css
.button {
  background: var(--is-dark-mode, #fff);
  color: var(--is-dark-mode, #000);
}
```

### Enhancement

```css
/* Chrome 143+: CSS if() function */
.button {
  background: if(style(--is-dark: true), #333, #fff);
  color: if(style(--is-dark: true), #fff, #000);
  border: if(style(--has-hover: true), 1px solid #ccc, none);
}

/* Works with @media */
@media (prefers-color-scheme: dark) {
  :root {
    --is-dark: true;
  }
}

.dark-theme {
  --is-dark: true;
}

/* Nested conditionals */
.card {
  padding: if(
    style(--is-compact: true),
    0.5rem 1rem,
    if(style(--is-large: true), 2rem 3rem, 1rem 1.5rem)
  );
}
```

**Benefits:**
- ✅ Conditional styling without calc()
- ✅ Reduces CSS custom property proliferation
- ✅ More semantic intent

**Recommendation:** Keep current approach (simpler, more compatible)

---

## 6. Enhanced View Transitions with document.activeViewTransition

**Feature:** Monitor and control active transitions
**Chromium Support:** Chrome 143+ (enhanced property)
**Apple Silicon Impact:** Better control of transition timing

### Current State
No view transitions currently used.

### Enhancement

```typescript
// Detect when transition animation is safe to trigger
function waitForTransitionReady(): Promise<void> {
  return new Promise((resolve) => {
    if (!document.activeViewTransition) {
      resolve();
      return;
    }

    document.activeViewTransition.ready.then(() => {
      // Pseudo-elements created, safe to update content
      resolve();
    });
  });
}

// Use in component mount
$effect(() => {
  waitForTransitionReady().then(() => {
    // Trigger heavy updates after transition setup
    renderExpensiveVisualization();
  });
});

// Monitor transition completion
$effect(() => {
  if (document.activeViewTransition) {
    document.activeViewTransition.finished.then(() => {
      console.log('Transition complete, cleanup if needed');
    });
  }
});
```

**Benefits:**
- ✅ Better coordination of animations and content updates
- ✅ Avoids janky transitions from heavy rendering
- ✅ Chrome 143+ enhancement

---

## 7. Speculation Rules for Visualization Preloading

**Feature:** Preload related visualizations before navigation
**Chromium Support:** Chrome 121+
**Status:** Already implemented in project (see `src/lib/utils/speculation-rules.ts`)

### Current Implementation
```typescript
// src/lib/utils/speculation-rules.ts exists and is ready
```

### Enhancement: Expand to Visualizations

```html
<!-- In +layout.svelte -->
<script type="speculationrules">
{
  "prerender": [
    {
      "where": { "href_matches": "/visualizations/*" },
      "eagerness": "moderate"
    },
    {
      "where": { "href_matches": "/shows/\\d+" },
      "eagerness": "conservative"
    }
  ],
  "prefetch": [
    {
      "where": { "selector_matches": "a[href*='visualization']" },
      "eagerness": "conservative"
    }
  ]
}
</script>
```

**Benefits:**
- ✅ Instant navigation to visualizations
- ✅ Works with View Transitions for seamless transitions
- ✅ Already implemented in project

---

## 8. Scheduler API for D3 Rendering Priority

**Feature:** Control rendering priority of D3 visualizations
**Chromium Support:** Chrome 94+ (built-in to all Chrome)
**Apple Silicon Impact:** Better main-thread responsiveness

### Current State
ResizeObserver callbacks render immediately.

### Enhancement

```typescript
// In visualization onMount
const renderChart = async () => {
  // User interaction always takes priority
  if (isUserInteracting) {
    scheduler.postTask(() => renderExpensiveViz(), {
      priority: 'user-blocking'
    });
    return;
  }

  // Background data processing with lower priority
  scheduler.postTask(async () => {
    // Prepare data
    const processedData = await processLargeDataset(data);

    // Yield to main thread if needed (Chrome 129+)
    if ('yield' in scheduler) {
      await scheduler.yield();
    }

    // Render with user-visible priority
    scheduler.postTask(() => {
      renderChart();
    }, { priority: 'user-visible' });
  }, { priority: 'background' });
};
```

**Benefits:**
- ✅ Responsive UI during heavy D3 rendering
- ✅ Better INP scores
- ✅ Smoother user interactions

---

## Implementation Priority Matrix

| Feature | Impact | Effort | Priority | Breaking |
|---------|--------|--------|----------|----------|
| View Transitions | High | Low | **HIGH** | No |
| Scroll Animations | Medium | Medium | Medium | No |
| CSS Range Syntax | Low | Low | Low | No |
| Anchor Positioning | Medium | High | Low | No |
| CSS if() | Low | Low | Low | No |
| Scheduler API | Medium | Medium | Medium | No |
| Enhanced Spec Rules | Medium | Low | Medium | No |

**Recommended Priority:**

1. **Quick Win (1-2 hours):** View Transitions for viz switching
2. **Nice to Have:** Scroll-driven animations for hero section
3. **Polish (if time):** CSS Range syntax migration, Scheduler API

---

## Testing on Apple Silicon

Before deploying:

```bash
# Build for production
npm run build

# Preview locally with Chrome 143+
npm run preview

# Open DevTools and check:
# 1. Performance tab > Recording
#    - Verify no layout thrashing
#    - Check Metal GPU timeline
#
# 2. Rendering > Show rendering
#    - Verify paint operations are minimal
#    - Confirm compositor animations (green)
#
# 3. Performance > Long Animation Frames
#    - Should be < 50ms for transitions
#    - No blocking operations
```

---

## References

- [View Transitions API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API)
- [CSS Anchor Positioning - MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/anchor-name)
- [Scroll-Driven Animations - MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/animation-timeline)
- [CSS if() - Chrome Developers](https://developer.chrome.com/blog/css-if-function/)
- [Scheduler API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Scheduler)
- [Speculation Rules - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Speculation_Rules_API)

---

**Document Version:** 1.0
**Generated:** January 21, 2026
**For:** Chromium 143+ / Apple Silicon (macOS 26.2)

# Chromium 143+ Enhancement Implementation Guide

## Overview
This document provides implementation examples for the two identified enhancement opportunities in the DMB Almanac project.

---

## Enhancement #1: Scroll-Driven Animations for Visualizations

### Why This Enhancement Works

The visualization pages (tours, stats, visualizations) are perfect candidates for scroll-driven animations because:
1. Users scroll specifically to view these components
2. Visual entrance animations add polish without distraction
3. Scroll-driven animations are GPU-accelerated on Apple Silicon
4. Zero JavaScript needed - pure CSS
5. Respects prefers-reduced-motion

### Implementation A: Basic Entry Animation

**Target File:** `/src/lib/components/visualizations/GapTimeline.svelte`

```css
/* Add to <style> block in GapTimeline.svelte */

.gap-timeline {
  /* Entry animation triggered when element enters viewport */
  animation: viz-fade-in linear both;
  animation-timeline: view();
  animation-range: entry 0% entry 100%;
}

@keyframes viz-fade-in {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Respect motion preferences */
@media (prefers-reduced-motion: reduce) {
  .gap-timeline {
    animation: none;
    opacity: 1;
  }
}
```

**How it works:**
- `animation-timeline: view()` - Timeline progresses as element enters viewport
- `animation-range: entry 0% entry 100%` - Animation completes during entry phase
- Fade in + slide up happens smoothly as user scrolls to visualization

---

### Implementation B: Scroll Progress Indicator

**Target File:** `/src/routes/visualizations/+page.svelte` or global `app.css`

Add a scroll progress indicator at the top of pages with visualizations:

```html
<!-- Add to page template -->
<div class="scroll-progress-bar"></div>

<!-- Rest of page content -->
```

```css
/* Add to app.css or page-specific styles */

.scroll-progress-bar {
  position: fixed;
  top: 0;
  left: 0;
  height: 3px;
  background: linear-gradient(
    to right,
    var(--color-primary-500),
    var(--color-primary-600)
  );
  transform-origin: left;

  /* Animates based on scroll position */
  animation: grow-width linear;
  animation-timeline: scroll(root);
}

@keyframes grow-width {
  from {
    transform: scaleX(0);
  }
  to {
    transform: scaleX(1);
  }
}

/* Ensure it's above content */
z-index: 999;

/* Respect motion preferences */
@media (prefers-reduced-motion: reduce) {
  .scroll-progress-bar {
    animation: none;
    opacity: 0;
  }
}
```

---

### Implementation C: Staggered Visualization Children

For components with multiple child elements (like multiple cards in a grid), create a staggered entrance effect:

**Target File:** `/src/lib/components/visualizations/TourMap.svelte`

```html
<!-- In template, add data attribute to each visualization element -->
<svg bind:this={svgElement} class="map-diagram" data-item-index="0" />
```

```css
/* Add to <style> block */

.map-diagram {
  /* Shared animation timeline */
  animation-timeline: view();
  animation-range: entry 0% entry 100%;
}

/* Each element gets staggered timing */
[data-item-index="0"] {
  animation: viz-fade-in linear both;
  --stagger-delay: 0ms;
}

[data-item-index="1"] {
  animation: viz-fade-in linear both;
  --stagger-delay: 100ms;
  animation-delay: var(--stagger-delay);
}

[data-item-index="2"] {
  animation: viz-fade-in linear both;
  --stagger-delay: 200ms;
  animation-delay: var(--stagger-delay);
}

@keyframes viz-fade-in {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

---

### Implementation D: Scroll-Linked Parallax (Advanced)

For hero sections or intro visualizations:

```css
/* Parallax effect using scroll-driven animation */
.hero-visualization {
  animation: parallax-scroll linear both;
  animation-timeline: scroll(root);
}

@keyframes parallax-scroll {
  from {
    transform: translateY(0);
  }
  to {
    transform: translateY(-200px); /* Adjust based on scroll range */
  }
}

/* Or use view() for viewport-relative effect */
.data-reveal {
  animation: data-appear linear both;
  animation-timeline: view();
  animation-range: entry 0% cover 50%;
}

@keyframes data-appear {
  from {
    opacity: 0;
    clip-path: polygon(0 0, 100% 0, 100% 0, 0 0);
  }
  to {
    opacity: 1;
    clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%);
  }
}
```

---

### Browser Support & Fallback

Scroll-driven animations are supported in Chrome 115+. For older browsers:

```css
/* Detection: check if browser supports animation-timeline */
@supports not (animation-timeline: scroll()) {
  /* Provide static entry animation instead */
  .visualization {
    animation: static-enter 0.6s ease-out both;
  }

  @keyframes static-enter {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
}
```

---

## Enhancement #2: text-wrap: pretty for Body Text

### Why This Enhancement Works

`text-wrap: pretty` prevents "orphans" (single words on new lines) and improves visual balance:

**Before:**
```
Lorem ipsum dolor sit amet,
consectetur adipiscing
elit.
```

**After:**
```
Lorem ipsum dolor sit amet,
consectetur adipiscing elit.
```

### Implementation

**Target File:** `/src/app.css` (add after line 717)

```css
/* After the heading text-wrap rule */
h1, h2, h3, h4, h5, h6 {
  text-wrap: balance;
}

/* NEW: Add text-wrap: pretty to paragraphs */
p, li, dd {
  text-wrap: pretty;
}

/* Or apply to entire body for broader effect */
body {
  text-wrap: pretty;
}

/* Optional: Fallback hint (some browsers may not support) */
@supports not (text-wrap: pretty) {
  /* No fallback needed - text just reflows normally */
}
```

### Affected Components

**Most benefit from text-wrap: pretty:**
- `/src/routes/about/+page.svelte` - About page text
- `/src/routes/contact/+page.svelte` - Contact info
- `/src/routes/faq/+page.svelte` - FAQ descriptions
- `/src/lib/components/ui/EmptyState.svelte` - Empty state messages
- `/src/lib/components/ui/Card.svelte` - Card descriptions
- Any component with descriptive text

### Browser Support

- **Chrome:** 114+ (includes 143+)
- **Firefox:** 123+
- **Safari:** 17.2+
- **Fallback:** Text wraps normally (no visual regression)

---

## Enhancement #3: CSS Range Syntax (Optional Refactoring)

### Why This Enhancement Works

CSS range syntax is more readable and concise:

**Before (Old Syntax):**
```css
@media (min-width: 768px) and (max-width: 1023px) {
  /* tablet styles */
}
```

**After (Range Syntax):**
```css
@media (768px <= width < 1024px) {
  /* tablet styles */
}
```

### Implementation Strategy

This is an **optional, gradual refactoring** (not urgent). You can:

1. **Start with new code** - Use range syntax in new features
2. **Refactor incrementally** - Update a few files per sprint
3. **No breaking changes** - Old and new syntax can coexist

### Example Refactoring

**File:** `/src/app.css`

**Current (Lines 1248-1250):**
```css
@media (prefers-reduced-motion: reduce) {
  /* Some rules */
}
```

**Can stay as-is** (no width range here)

**Current (e.g., tour page media query):**
```css
@media (max-width: 768px) {
  .results-grid {
    grid-template-columns: 1fr;
  }
}
```

**Refactored:**
```css
@media (width < 768px) {
  .results-grid {
    grid-template-columns: 1fr;
  }
}
```

### Common Refactoring Patterns

```css
/* Pattern 1: Maximum width only */
/* Old */
@media (max-width: 768px) { }
/* New */
@media (width <= 768px) { }

/* Pattern 2: Minimum width only */
/* Old */
@media (min-width: 768px) { }
/* New */
@media (width >= 768px) { }

/* Pattern 3: Range (most readable improvement) */
/* Old */
@media (min-width: 768px) and (max-width: 1023px) { }
/* New */
@media (768px <= width < 1024px) { }

/* Pattern 4: Aspect ratio ranges */
/* Old */
@media (min-aspect-ratio: 16/9) { }
/* New */
@media (aspect-ratio >= 16/9) { }

/* Pattern 5: Height ranges */
/* Old */
@media (max-height: 600px) { }
/* New */
@media (height <= 600px) { }
```

### Browser Support

- **Chrome:** 143+ (newest versions)
- **Firefox:** 121+
- **Safari:** 17.4+
- **Progressive Enhancement:** Old syntax still works in all browsers

---

## Implementation Priority & Effort Matrix

| Enhancement | Priority | Effort | Impact | Browser Support |
|-------------|----------|--------|--------|-----------------|
| Scroll-Driven Animations | Medium | 2-3 hrs | Moderate UX improvement | Chrome 115+ |
| text-wrap: pretty | Low | 15 min | Minor text polish | Chrome 114+ |
| CSS Range Syntax | Low | 1-2 hrs | Code readability | Chrome 143+ |

---

## Testing Recommendations

### For Scroll-Driven Animations

1. **Enable Chrome DevTools DevTools:**
   - Open DevTools > Rendering > "Animations"
   - Watch animations play as you scroll

2. **Test on different viewport heights:**
   - Desktop (1024px)
   - Tablet (768px)
   - Mobile (375px)

3. **Test with prefers-reduced-motion:**
   ```bash
   # Simulate reduced motion in Chrome DevTools
   # Rendering > Emulate CSS media feature prefers-reduced-motion
   ```

4. **Check Apple Silicon performance:**
   - Ensure smooth 120Hz on ProMotion displays
   - No jank or dropped frames during scroll

### For text-wrap: pretty

1. **Visual inspection:**
   - Check all text content for orphans before/after
   - Compare line breaks on different viewport widths

2. **Accessibility:**
   - Ensure text-to-speech sounds natural
   - Line breaks shouldn't affect semantic meaning

### For CSS Range Syntax

1. **Backward compatibility:**
   - Test in older Chrome versions (should still work)
   - No functional changes, only syntax improvements

---

## Recommended Rollout Plan

### Week 1: text-wrap: pretty
- Low risk, 15-minute implementation
- Deploy immediately
- No testing complexity

### Week 2-3: Scroll-Driven Animations
- Start with one visualization component (e.g., GapTimeline)
- Test on actual Apple Silicon hardware
- Gather user feedback
- Roll out to other visualizations

### Later: CSS Range Syntax
- Optional refactoring
- Gradual migration as you touch existing code
- No deadline

---

## Additional Resources

### Scroll-Driven Animations
- [MDN: animation-timeline](https://developer.mozilla.org/en-US/docs/Web/CSS/animation-timeline)
- [Chrome DevTools Animation Debugging](https://developer.chrome.com/docs/devtools/css/animations/)
- [View Transitions Timing Functions](https://developer.chrome.com/docs/web-platform/view-transitions-2/)

### text-wrap: pretty
- [MDN: text-wrap](https://developer.mozilla.org/en-US/docs/Web/CSS/text-wrap)
- [Can I Use: text-wrap](https://caniuse.com/css-text-wrap)

### CSS Range Syntax
- [MDN: Media Query Range Syntax](https://developer.mozilla.org/en-US/docs/Web/CSS/media_queries/using_media_queries#syntax_improvements_in_level_4)
- [Chrome 143 Media Query Features](https://developer.chrome.com/blog/css-media-query-range-syntax/)

---

## Questions?

For implementation questions or to discuss rollout timing, refer to the main audit document: `CHROMIUM_143_AUDIT.md`

---

**Generated:** January 21, 2026
**For:** DMB Almanac Svelte Project
**Chrome Target:** 143+ on Apple Silicon macOS

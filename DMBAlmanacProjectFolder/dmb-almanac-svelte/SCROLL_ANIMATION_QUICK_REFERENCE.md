# CSS Scroll Animation Quick Reference
## Copy-Paste Solutions for DMB Almanac

---

## Current Implementations (Verified Working)

### Header Scroll Progress Bar ✅
**Location:** `/src/lib/components/navigation/Header.svelte`

```css
@supports (animation-timeline: scroll()) {
  .header::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    height: 2px;
    width: 100%;
    background: linear-gradient(90deg, var(--color-primary-500), var(--color-accent-cyan));
    transform: scaleX(0);
    transform-origin: left;
    opacity: 0;
    animation: scrollProgress linear both;
    animation-timeline: scroll(root);
  }

  @keyframes scrollProgress {
    from { transform: scaleX(0); }
    to { transform: scaleX(1); }
  }
}
```

---

### Card Reveal on Scroll ✅
**Location:** Multiple pages (tours, songs, discography)

```css
@supports (animation-timeline: view()) {
  .card {
    animation: scrollReveal linear both;
    animation-timeline: view();
    animation-range: entry 0% entry 100%;
  }

  @keyframes scrollReveal {
    from {
      opacity: 0;
      transform: translateY(40px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
}
```

---

## Enhancement Templates (Ready to Use)

### 1. Enhanced Entry Animation (Staggered Reveal)

Use when you want animation to progress as element scrolls into view:

```css
@supports (animation-timeline: view()) {
  .card {
    animation: enhancedReveal linear both;
    animation-timeline: view();
    animation-range: entry 0% cover 50%; /* Spreads animation over viewport scroll */
  }

  @keyframes enhancedReveal {
    from {
      opacity: 0;
      transform: translateY(60px);
    }
    50% {
      opacity: 0.5;
      transform: translateY(30px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
}
```

**When to use:** Lists, card grids, content sections

---

### 2. Exit Animation (Fade Out Going Up)

Use when you want elements to fade out as they leave viewport:

```css
@supports (animation-timeline: view()) {
  .card {
    animation: cardExit linear both;
    animation-timeline: view();
    animation-range: cover 50% exit 100%; /* Animates as element exits */
  }

  @keyframes cardExit {
    from {
      opacity: 1;
      transform: translateY(0);
    }
    to {
      opacity: 0;
      transform: translateY(-60px);
    }
  }
}
```

**When to use:** Dismissing elements, parallax layering effects

---

### 3. Parallax Background

Use for hero sections and backgrounds:

```css
.parallax-bg {
  position: absolute;
  inset: 0;
  background: url('bg.jpg') center/cover;
  animation: parallax linear both;
  animation-timeline: scroll();
  animation-range: 0vh 200vh; /* Adjust based on hero height */
}

@keyframes parallax {
  from {
    transform: translateY(0);
  }
  to {
    transform: translateY(-40px); /* Adjust percentage as needed */
  }
}
```

**Applied to:** Hero sections
**Browser support:** Chrome 115+

---

### 4. Progress Indicator (Full Document)

For showing reading progress:

```css
.progress-bar {
  position: fixed;
  top: 0;
  left: 0;
  height: 3px;
  width: 100%;
  background: linear-gradient(90deg,
    var(--color-primary-500),
    var(--color-accent-cyan),
    var(--color-primary-500)
  );
  z-index: 9999;
  transform: scaleX(0);
  transform-origin: left;
  animation: progressFill linear both;
  animation-timeline: scroll(root);
}

@keyframes progressFill {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}
```

---

### 5. Staggered List Items

Use for sequential reveals in lists:

```css
.list-item {
  animation: itemReveal linear both;
  animation-timeline: view();
  animation-range: entry 0% cover 25%;
  animation-delay: calc(var(--index) * 100ms);
}

@keyframes itemReveal {
  from {
    opacity: 0;
    transform: translateX(-30px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
```

**HTML Usage:**
```html
<div class="list">
  <div class="list-item" style="--index: 0">Item 1</div>
  <div class="list-item" style="--index: 1">Item 2</div>
  <div class="list-item" style="--index: 2">Item 3</div>
</div>
```

---

### 6. Image Scale On Scroll

For gallery-style animations:

```css
.gallery-image {
  animation: imageScale linear both;
  animation-timeline: view();
  animation-range: entry 15% cover 50%;
}

@keyframes imageScale {
  from {
    transform: scale(0.8);
    opacity: 0.5;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}
```

---

### 7. Text Clip Reveal

For dramatic text reveals:

```css
.text-reveal {
  animation: textClipReveal linear both;
  animation-timeline: view();
  animation-range: entry 0% cover 35%;
  overflow: hidden;
}

@keyframes textClipReveal {
  from {
    clip-path: inset(0 100% 0 0);
  }
  to {
    clip-path: inset(0 0 0 0);
  }
}
```

---

### 8. Color Fade on Scroll

For changing element colors as they scroll:

```css
.color-fade {
  animation: colorShift linear both;
  animation-timeline: view();
  animation-range: entry 0% cover 100%;
}

@keyframes colorShift {
  from {
    color: var(--color-gray-600);
    background-color: var(--background-tertiary);
  }
  to {
    color: var(--color-primary-600);
    background-color: var(--background-secondary);
  }
}
```

---

### 9. Rotate on Scroll

For rotating elements:

```css
.rotate-scroll {
  animation: rotateIn linear both;
  animation-timeline: view();
  animation-range: entry 0% cover 50%;
}

@keyframes rotateIn {
  from {
    transform: rotate(0deg) scale(0.8);
    opacity: 0;
  }
  to {
    transform: rotate(360deg) scale(1);
    opacity: 1;
  }
}
```

---

## Animation Range Reference

### Common animation-range Values

```css
/* Entry animation - plays as element enters viewport */
animation-range: entry 0% entry 100%;

/* Spread animation over viewport coverage */
animation-range: entry 0% cover 50%;

/* Full visibility range */
animation-range: cover 0% cover 100%;

/* Exit animation - plays as element leaves */
animation-range: exit 0% exit 100%;

/* Mixed: enter to exit */
animation-range: entry 0% exit 100%;

/* Pixel-based ranges */
animation-range: 0px 500px;

/* Viewport height units */
animation-range: 0vh 100vh;
```

### Animation Range Breakdown

| Range | Meaning | Use Case |
|-------|---------|----------|
| `entry 0%` | Element at viewport edge | Start trigger |
| `entry 100%` | Element fully entered | Transition point |
| `cover 0%` | Element fully visible | Visibility start |
| `cover 100%` | Still fully visible | Visibility end |
| `exit 0%` | Starting to leave | Fade start |
| `exit 100%` | Completely gone | Animation end |

---

## Accessibility Best Practices

### Always Include Reduced Motion Protection

```css
@media (prefers-reduced-motion: reduce) {
  .animated-element {
    animation: none;
    opacity: 1;
    transform: none;
  }
}
```

### Example in Real Code

```css
@supports (animation-timeline: view()) {
  .card {
    animation: scrollReveal linear both;
    animation-timeline: view();
    animation-range: entry 0% entry 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .card {
    animation: none;
    opacity: 1;
    transform: none;
  }
}

@keyframes scrollReveal {
  from {
    opacity: 0;
    transform: translateY(40px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

---

## Browser Support Fallback

### Complete Pattern with Fallback

```css
/* Graceful degradation for older browsers */
.element {
  opacity: 1;
  transform: translateY(0);
  /* Default: no animation in unsupporting browsers */
}

/* Chrome 115+ and modern browsers */
@supports (animation-timeline: scroll()) {
  .element {
    animation: reveal linear both;
    animation-timeline: view();
    animation-range: entry 0% entry 100%;
  }

  @keyframes reveal {
    from {
      opacity: 0;
      transform: translateY(40px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
}
```

**Fallback behavior:** Elements appear immediately without animation in older browsers

---

## Performance Checklist

### GPU-Accelerated Properties Only ✅
```css
/* Use these */
transform: translateY(40px);    /* GPU accelerated */
transform: scaleX(0.5);          /* GPU accelerated */
transform: rotate(45deg);        /* GPU accelerated */
opacity: 0.5;                    /* GPU accelerated */

/* Avoid these */
top: 40px;                       /* CPU-bound layout */
left: 40px;                      /* CPU-bound layout */
width: 100px;                    /* CPU-bound layout */
height: 100px;                   /* CPU-bound layout */
```

### Performance Tips
- Use `transform` instead of positioning
- Use `opacity` instead of `visibility`
- Avoid animating `width`, `height`, `margin`, `padding`
- Use `will-change: transform` for GPU hints (sparingly)
- Keep animation-duration under 1000ms

---

## Testing in Browser

### Chrome DevTools Testing

1. **Open DevTools:** `Cmd+Option+I` (Mac) or `Ctrl+Shift+I` (Windows)
2. **Go to:** Elements > Animations panel
3. **Trigger:** Scroll page slowly
4. **Verify:** Animations play smoothly

### Performance Testing

1. **Open DevTools:** `Cmd+Option+I`
2. **Go to:** Performance tab
3. **Record:** Scroll performance
4. **Check:** Frame rate (should be 60fps)
5. **Look for:** Green bars in timeline (no red jank)

### Accessibility Testing

1. **Open DevTools:** `Cmd+Option+I`
2. **Go to:** Rendering > Emulate CSS media feature `prefers-reduced-motion`
3. **Select:** `prefers-reduced-motion: reduce`
4. **Verify:** Animations stop working

---

## Common Mistakes to Avoid

### ❌ Wrong: Animating Layout Properties
```css
/* SLOW - triggers reflow */
@keyframes bad {
  from { width: 0; }
  to { width: 100%; }
}
```

### ✅ Right: Using Transform
```css
/* FAST - GPU accelerated */
@keyframes good {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}
```

---

### ❌ Wrong: Missing @supports
```css
.card {
  animation-timeline: view(); /* Breaks in older browsers */
}
```

### ✅ Right: @supports Wrapper
```css
@supports (animation-timeline: view()) {
  .card {
    animation-timeline: view();
  }
}
```

---

### ❌ Wrong: No Reduced Motion Support
```css
.card {
  animation: fade 300ms;
}
```

### ✅ Right: Respects Preferences
```css
@media (prefers-reduced-motion: reduce) {
  .card {
    animation: none;
  }
}
```

---

## Integration Examples

### Adding to Tours Page

```svelte
<style>
  .tour-card {
    animation: tourReveal linear both;
    animation-timeline: view();
    animation-range: entry 0% entry 100%;
  }

  @supports not (animation-timeline: view()) {
    .tour-card {
      opacity: 1;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .tour-card {
      animation: none;
    }
  }

  @keyframes tourReveal {
    from {
      opacity: 0;
      transform: translateY(40px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>
```

---

### Adding to Discography Page

```svelte
<style>
  .release-card {
    animation: releaseReveal linear both;
    animation-timeline: view();
    animation-range: entry 0% cover 50%;
  }

  @keyframes releaseReveal {
    from {
      opacity: 0;
      transform: translateY(50px) scale(0.9);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
</style>
```

---

## Timing Functions for Scroll Animations

```css
/* Linear - matches scroll speed exactly */
animation-timing-function: linear;

/* Ease-in - accelerates */
animation-timing-function: ease-in;

/* Ease-out - decelerates */
animation-timing-function: ease-out;

/* Ease-in-out - smooth throughout */
animation-timing-function: ease-in-out;

/* Custom cubic-bezier */
animation-timing-function: cubic-bezier(0.17, 0.67, 0.83, 0.67);
```

### Recommended for Scroll Animations
- **Linear** - Most natural for scroll-driven animations
- **Ease-out** - Good for entry animations
- **Ease-in-out** - Smooth, polished feel

---

## Color Animation Reference

Using your DMB Almanac color system:

```css
@keyframes colorEntry {
  from {
    color: var(--color-gray-600);
    background: var(--background-tertiary);
  }
  to {
    color: var(--color-primary-600);
    background: var(--background-secondary);
  }
}
```

---

## Next Steps

1. **Review:** Read `SCROLL_ANIMATION_ANALYSIS.md` for full context
2. **Choose:** Pick 1-2 enhancements from above
3. **Implement:** Copy the template and adjust to your needs
4. **Test:** Use Chrome DevTools Performance tab
5. **Verify:** Check accessibility with prefers-reduced-motion

---

## Resources

- [MDN: animation-timeline](https://developer.mozilla.org/en-US/docs/Web/CSS/animation-timeline)
- [MDN: animation-range](https://developer.mozilla.org/en-US/docs/Web/CSS/animation-range)
- [W3C Scroll-Driven Animations Spec](https://drafts.csswg.org/scroll-animations-1/)
- [Chrome DevTools Performance](https://developer.chrome.com/docs/devtools/performance)

---

**Last Updated:** January 21, 2026
**For:** DMB Almanac Svelte (Chrome 143+)

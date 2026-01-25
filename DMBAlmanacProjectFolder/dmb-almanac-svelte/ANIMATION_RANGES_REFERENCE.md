# Animation Ranges Reference

## Understanding animation-range

The `animation-range` property controls **when** an animation plays relative to scroll position. It uses two anchor points: `start` and `end`.

## Syntax

```css
animation-range: <start-anchor> <start-offset> <end-anchor> <end-offset>;
```

## Anchor Keywords

### View-Based Anchors (element visibility)

**`entry`** - When element enters viewport
```css
animation-range: entry 0% entry 100%;
/* Animation plays as element enters */
```

**`exit`** - When element leaves viewport
```css
animation-range: exit 0% exit 100%;
/* Animation plays as element exits */
```

**`cover`** - Entire time element is in viewport
```css
animation-range: cover 0% cover 100%;
/* Animation plays while element is visible */
```

**`contain`** - Only when element is fully visible
```css
animation-range: contain 0% contain 100%;
/* Animation plays while fully inside viewport */
```

### Scroll-Based Anchors (document scroll)

**`0vh`** - Start of scroll (top of page)
```css
animation-range: 0vh 100vh;
/* Start immediately, end after 100vh of scroll */
```

**Percentage offsets** - Position within viewport
```css
animation-range: entry 0% entry 50%;
/* Start at entry point, end halfway through */
```

## Common Patterns

### Fade In On Enter
```css
.element {
  animation: fadeIn linear both;
  animation-timeline: view();
  animation-range: entry 0% cover 40%;
}
```
**Effect:** Element fades in as it enters and 40% through viewport

### Slide Up While Visible
```css
.element {
  animation: slideUp linear both;
  animation-timeline: view();
  animation-range: entry 0% entry 100%;
}
```
**Effect:** Element slides up during entry phase only

### Parallax Background
```css
.background {
  animation: parallax linear;
  animation-timeline: scroll(root);
  animation-range: 0vh 100vh;
}
```
**Effect:** Background parallaxes from top to 100vh scroll

### Text Reveal
```css
.text {
  animation: reveal linear both;
  animation-timeline: view();
  animation-range: entry 0% cover 50%;
}
```
**Effect:** Text reveals as element enters and moves 50% through viewport

### Staggered List
```css
.item {
  animation: slideUp linear both;
  animation-timeline: view();
  animation-range: entry 0% cover 50%;
}
.item:nth-child(1) { animation-delay: 0ms; }
.item:nth-child(2) { animation-delay: 50ms; }
.item:nth-child(3) { animation-delay: 100ms; }
```
**Effect:** Each item slides up with delay

### Gallery Items (Carousel Effect)
```css
.gallery-item {
  animation: carouselItem linear both;
  animation-timeline: view(inline);
  animation-range: contain 0% contain 100%;
}
```
**Effect:** Items scale/fade based on horizontal scroll

### Reveal on Full Visibility
```css
.element {
  animation: appear linear both;
  animation-timeline: view();
  animation-range: contain 0% contain 100%;
}
```
**Effect:** Animation only plays when element is fully in viewport

### Fade In and Out
```css
.element {
  animation: fadeInOut linear both;
  animation-timeline: view();
  animation-range: entry 0% exit 100%;
}

@keyframes fadeInOut {
  0% { opacity: 0; }
  50% { opacity: 1; }
  100% { opacity: 0; }
}
```
**Effect:** Fade in on entry, fade out on exit

## Advanced Examples

### Hero Section Parallax + Fade
```css
.hero-background {
  animation: parallax linear;
  animation-timeline: scroll(root);
  animation-range: 0vh 150vh;
}

.hero-title {
  animation: slideUpFade linear both;
  animation-timeline: view();
  animation-range: entry 0% cover 60%;
}
```
**Effect:** Background parallaxes while title fades and slides

### Card Grid with Stagger
```css
.card {
  animation: slideUp linear both;
  animation-timeline: view();
  animation-range: entry 0% cover 40%;
}

.card:nth-child(1) { animation-delay: 0ms; }
.card:nth-child(2) { animation-delay: 50ms; }
.card:nth-child(3) { animation-delay: 100ms; }
.card:nth-child(4) { animation-delay: 150ms; }
```
**Effect:** Cards slide up in sequence

### Progressive Scroll Progress
```css
.progress-bar {
  animation: grow linear;
  animation-timeline: scroll(root);
  animation-range: 0 document 100%;
}

@keyframes grow {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}
```
**Effect:** Progress bar fills as user scrolls document

### Blur to Sharp
```css
.image {
  animation: blurIn linear both;
  animation-timeline: view();
  animation-range: entry 0% cover 50%;
}

@keyframes blurIn {
  from {
    filter: blur(10px);
    opacity: 0;
  }
  to {
    filter: blur(0);
    opacity: 1;
  }
}
```
**Effect:** Image comes into focus

## Range Comparison

### Fast Animation (Small Range)
```css
animation-range: entry 0% entry 30%;
/* Quick animation during early entry */
```

### Slow Animation (Large Range)
```css
animation-range: entry 0% exit 100%;
/* Slow animation across entire visibility */
```

### Delayed Animation
```css
animation-range: cover 0% cover 100%;
/* Starts after element is fully visible */
```

## Percentage vs. vh Units

### View-Based (Percentages)
```css
/* 0% = start of range, 100% = end of range */
animation-range: entry 0% cover 100%;
```
**Use:** Elements, proportional animations

### Scroll-Based (Viewport Heights)
```css
/* 0vh = top, 100vh = full screen scroll */
animation-range: 0vh 100vh;
```
**Use:** Fixed scroll distances, parallax

## Testing Animation Ranges

### Quick Test
```css
.element {
  animation: test linear both;
  animation-timeline: view();
  animation-range: entry 0% cover 50%;

  /* Change these to test */
  /* animation-range: entry 0% cover 25%; */
  /* animation-range: entry 0% cover 100%; */
}

@keyframes test {
  from { background: red; }
  to { background: blue; }
}
```

### Debug Visualization
```css
.element {
  animation: debug steps(10) both;
  animation-timeline: view();
  animation-range: entry 0% cover 100%;
}

@keyframes debug {
  0% { opacity: 0.1; }
  10% { opacity: 0.2; }
  20% { opacity: 0.3; }
  /* ... continues in 10% increments ... */
  100% { opacity: 1; }
}
```

## Common Mistakes

❌ **Wrong:** Missing animation-timeline
```css
.element {
  animation: fadeIn linear both;
  animation-range: entry 0% cover 50%;
  /* ERROR: animation-timeline missing! */
}
```

✅ **Correct:**
```css
.element {
  animation: fadeIn linear both;
  animation-timeline: view();
  animation-range: entry 0% cover 50%;
}
```

---

❌ **Wrong:** Using layout properties
```css
@keyframes bad {
  from { left: -100px; }
  to { left: 0; }
}
```

✅ **Correct:** Use transform
```css
@keyframes good {
  from { transform: translateX(-100px); }
  to { transform: translateX(0); }
}
```

---

❌ **Wrong:** Overlapping percentage ranges
```css
/* Confusing - unclear which takes priority */
animation-range: entry 50% cover 50%;
```

✅ **Correct:** Use consistent pattern
```css
/* Clear and predictable */
animation-range: entry 0% cover 100%;
```

## Animation Range Cheat Sheet

| Effect | Range | Code |
|--------|-------|------|
| Fade in on enter | entry → cover 40% | `entry 0% cover 40%` |
| Slide up on enter | entry → cover 50% | `entry 0% cover 50%` |
| Parallax scroll | 0vh → 100vh | `0vh 100vh` |
| Reveal while visible | cover → cover | `cover 0% cover 100%` |
| Fade in/out | entry → exit | `entry 0% exit 100%` |
| Stagger delay | entry → cover 30% | `entry 0% cover 30%` + delay |
| Quick zoom | entry 0% → entry 50% | `entry 0% entry 50%` |
| Text reveal | entry → cover 50% | `entry 0% cover 50%` |

## Browser Support

- **Chrome 115+:** Full support
- **Safari 17.1+:** Full support
- **Edge 115+:** Full support
- **Firefox:** Not yet supported
- **Older versions:** Use CSS fallbacks

## Performance Notes

- Animations with **larger ranges** are smoother (more keyframes interpolated)
- Animations with **smaller ranges** are faster (fewer calculations)
- **entry/exit** animations are faster than **cover** animations
- **Scroll-based** animations are faster than **view-based** on massive documents

## References

- [MDN: animation-range](https://developer.mozilla.org/en-US/docs/Web/CSS/animation-range)
- [web.dev: Scroll-driven animations](https://web.dev/scroll-animations/)
- [Chrome DevTools: Animations panel](https://developer.chrome.com/docs/devtools/animations/)

---

**Last Updated:** January 21, 2026
**For:** DMB Almanac SvelteKit PWA
**Chrome:** 143+

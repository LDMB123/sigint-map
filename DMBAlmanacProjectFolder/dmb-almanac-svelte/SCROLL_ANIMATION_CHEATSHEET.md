# Scroll Animation Cheatsheet
**DMB Almanac - Quick Reference**

---

## Animation Classes (Copy & Paste Ready)

### Fade Animations
```html
<div class="scroll-fade-in">Fades in on scroll</div>
<div class="scroll-fade-through">Fades in, then out as you scroll past</div>
```

### Slide Animations
```html
<div class="scroll-slide-up">Slides up + fades in</div>
<div class="scroll-slide-in-left">Slides in from left</div>
<div class="scroll-slide-in-right">Slides in from right</div>
```

### Scale Animations
```html
<div class="scroll-scale-up">Scales from 0.9 to 1.0 + fades</div>
```

### Parallax Effects
```html
<img class="parallax-slow" src="bg.jpg" alt="">    <!-- Slowest: -50px -->
<img class="parallax-medium" src="mid.jpg" alt=""> <!-- Medium: -30px -->
<img class="parallax-fast" src="fg.jpg" alt="">    <!-- Fast: -15px -->
```

### Staggered Lists
```html
<ul>
  <li class="scroll-stagger-item">First (0ms delay)</li>
  <li class="scroll-stagger-item">Second (50ms delay)</li>
  <li class="scroll-stagger-item">Third (100ms delay)</li>
  <li class="scroll-stagger-item">Fourth (150ms delay)</li>
</ul>
```

### Card Animations
```html
<article class="scroll-card-reveal">
  Scale + slide + fade combo
</article>
```

### Clip Path Reveals (Text)
```html
<h2 class="scroll-clip-reveal">Reveals from left to right</h2>
<h3 class="scroll-clip-reveal-bottom">Reveals from bottom</h3>
```

### Gallery Items
```html
<div class="gallery">
  <img class="scroll-gallery-item" src="1.jpg" alt="">
  <img class="scroll-gallery-item" src="2.jpg" alt="">
  <img class="scroll-gallery-item" src="3.jpg" alt="">
</div>
```

### Advanced Reveals
```html
<section class="scroll-section-reveal">Full section fade-in</section>
<div class="scroll-epic-reveal">Slide + fade + scale + rotate</div>
<div class="scroll-reveal-on-hover">Interactive reveal</div>
```

### Special Effects
```html
<div class="scroll-counter">Number animation (0-100%)</div>
<div class="scroll-border-animate">Inset box-shadow reveal</div>
<div class="scroll-color-change">Background color transition</div>
<div class="scroll-rotate">360° rotation</div>
<div class="scroll-blur-in">Blur to sharp on scroll</div>
```

### Progress Bar
```html
<!-- Add to root layout -->
<div class="scroll-progress-bar"></div>
```

---

## CSS Scroll Timeline Syntax

### View Timeline (Element-based)
```css
/* When element enters viewport */
.element {
  animation: fadeIn linear both;
  animation-timeline: view();           /* Tied to element visibility */
  animation-range: entry 0% cover 40%;  /* Trigger on entry, finish at 40% of visible */
}
```

### Scroll Timeline (Document)
```css
/* When document is scrolled */
.progress-bar {
  animation: scaleX linear both;
  animation-timeline: scroll(root block);  /* Tied to document scroll */
  animation-range: 0vh 100vh;              /* From top to bottom of viewport */
}
```

### Horizontal Scroll Timeline
```css
/* For carousels */
.gallery-item {
  animation: scale linear both;
  animation-timeline: view(inline);  /* Tied to horizontal viewport */
  animation-range: contain 0% contain 100%;
}
```

---

## Animation Range Cookbook

| Range | Meaning | Use Case |
|-------|---------|----------|
| `entry 0% entry 100%` | Just entering viewport | Quick reveals |
| `entry 0% cover 40%` | Enter + partial visibility | Staggered reveals |
| `entry 0% cover 50%` | Standard animation | Most animations |
| `entry 0% cover 100%` | Long animation | Counters, progress |
| `contain 0% contain 100%` | Fully in viewport | Gallery items |
| `entry 0% exit 100%` | Enter and exit | Fade through |
| `0vh 100vh` | Viewport height range | Parallax, scrollbar |
| `0px 1000px` | Pixel range | Distance-based |

---

## Feature Detection (JavaScript)

### Check Support
```typescript
import { isScrollAnimationsSupported } from '$lib/utils/scrollAnimations';

if (isScrollAnimationsSupported()) {
  console.log('Native scroll animations available');
}
```

### Get Details
```typescript
import { getScrollAnimationFeatures } from '$lib/utils/scrollAnimations';

const features = getScrollAnimationFeatures();
// {
//   scrollTimeline: true,
//   viewTimeline: true,
//   animationRange: true,
//   supported: true
// }
```

### Debug Info
```typescript
import { getScrollAnimationDebugInfo } from '$lib/utils/scrollAnimations';

const info = getScrollAnimationDebugInfo();
console.log(info);
// Shows supported features, scroll progress, viewport info
```

---

## CSS Feature Detection

### Browser Support Check
```css
/* Only runs on Chrome 115+ */
@supports (animation-timeline: scroll()) {
  .scroll-fade-in {
    animation: fadeIn linear both;
    animation-timeline: view();
  }
}

/* Fallback for older browsers */
@supports not (animation-timeline: scroll()) {
  .scroll-fade-in {
    animation: fadeInFallback 0.6s ease-out forwards;
  }
}
```

---

## Accessibility: Motion Preferences

### Automatic Handling
```css
/* All animations automatically disable for users with motion sensitivity */
@media (prefers-reduced-motion: reduce) {
  .scroll-fade-in,
  .parallax-slow,
  /* ... all animation classes ... */
  {
    animation: none !important;
    transform: none !important;
    opacity: 1 !important;
  }
}
```

### Detect in JavaScript
```typescript
import { prefersReducedMotion } from '$lib/utils/scrollAnimations';

if (prefersReducedMotion()) {
  console.log('User has motion sensitivity enabled');
}
```

---

## Performance Tips

### DO - GPU Properties
```css
@keyframes goodAnimation {
  from {
    transform: translateY(30px);    /* GPU accelerated */
    opacity: 0;                     /* GPU accelerated */
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
```

### DON'T - Layout Properties
```css
@keyframes badAnimation {
  from {
    top: 30px;      /* ❌ Causes layout recalc */
    height: 100px;  /* ❌ Causes layout recalc */
  }
  to {
    top: 0;
    height: 50px;
  }
}
```

### GPU Hints
```css
.optimized-animation {
  will-change: transform, opacity;    /* Hint for layer promotion */
  transform: translateZ(0);           /* GPU hack for Apple Silicon */
  backface-visibility: hidden;        /* Prevent flickering */
}
```

---

## Common Patterns

### Hero Section
```svelte
<div class="hero">
  <img class="parallax-slow" src="bg.jpg" alt="">
  <h1>Welcome</h1>
</div>

<style>
  .hero {
    position: relative;
    height: 100vh;
    overflow: hidden;
  }
</style>
```

### Product Grid
```svelte
<div class="products">
  {#each products as product}
    <article class="scroll-card-reveal">
      <img src={product.image}>
      <h3>{product.name}</h3>
    </article>
  {/each}
</div>

<style>
  .products {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1rem;
  }
</style>
```

### Staggered List
```svelte
<ul>
  {#each items as item, i (item.id)}
    <li class="scroll-stagger-item">
      {item.name}
    </li>
  {/each}
</ul>
```

### Statistics Section
```svelte
<section>
  {#each stats as stat}
    <div class="scroll-fade-in">
      <div class="scroll-counter">{stat.value}</div>
      <p>{stat.label}</p>
    </div>
  {/each}
</section>
```

---

## Browser Support

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | 115+ | Full support |
| Edge | 115+ | Full support |
| Opera | 101+ | Full support |
| Safari | 17.4+ | Full support |
| Firefox | TBD | Coming soon |
| Chrome | <115 | Fallback animations |

---

## Troubleshooting

### Animation Not Working?

**1. Check browser support**
```typescript
const isSupported = isScrollAnimationsSupported();
console.log('Supported:', isSupported);
```

**2. Check CSS syntax**
```css
/* Verify animation-timeline property */
animation-timeline: view();           ✅ Correct
animation-timeline: scroll();         ✅ Correct
animation-timeline: myTimeline;       ⚠️ Must define custom timeline first
```

**3. Check animation-range**
```css
/* Verify range syntax */
animation-range: entry 0% cover 50%;  ✅ Correct
animation-range: entry 0%;            ❌ Incomplete
```

**4. Check prefers-reduced-motion**
```typescript
if (prefersReducedMotion()) {
  // All animations are disabled
}
```

---

## File Locations

| Purpose | File |
|---------|------|
| Scroll animations | `/src/lib/motion/scroll-animations.css` |
| Feature detection | `/src/lib/utils/scrollAnimations.ts` |
| Basic animations | `/src/lib/motion/animations.css` |
| Page transitions | `/src/lib/motion/viewTransitions.css` |
| Global styles | `/src/app.css` |

---

## Useful Links

- **Chrome Specification:** https://www.w3.org/TR/scroll-animations-1/
- **MDN Documentation:** https://developer.mozilla.org/en-US/docs/Web/CSS/animation-timeline
- **Browser Support:** https://caniuse.com/css-animation-timeline

---

## Summary

| Need | Solution |
|------|----------|
| Fade on scroll | `.scroll-fade-in` |
| Slide up | `.scroll-slide-up` |
| Parallax background | `.parallax-slow/medium/fast` |
| Staggered list | `.scroll-stagger-item` |
| Card animation | `.scroll-card-reveal` |
| Text reveal | `.scroll-clip-reveal` |
| Gallery | `.scroll-gallery-item` |
| Progress bar | `.scroll-progress-bar` |
| Custom animation | Define with `animation-timeline: view()` |
| Check support | `isScrollAnimationsSupported()` |
| Respect preferences | Auto-handled by `prefers-reduced-motion` |

---

**Last Updated:** January 24, 2026
**Chrome Target:** 115+
**Framework:** Svelte 5 + SvelteKit 2

# CSS Scroll-Driven Animations Guide

## Overview

This DMB Almanac PWA implements **zero-JavaScript scroll animations** using native Chrome 115+ CSS features. No animation libraries required—just pure CSS using `animation-timeline` and `animation-range`.

**Requirements:**
- Chrome 115+ / Chromium 143+
- macOS Tahoe 26.2 + Apple Silicon (optimized)
- `@supports (animation-timeline: scroll())` for feature detection

**Performance:**
- 60 FPS on Apple Silicon with GPU acceleration
- Transform + opacity only (no layout thrashing)
- Automatic fallback to CSS for older browsers
- Respects `prefers-reduced-motion`

## Quick Start

### 1. Import the CSS

The scroll animations CSS is already imported in `/src/app.css`:

```css
@import './lib/motion/scroll-animations.css';
```

### 2. Use Svelte Actions

Apply animations with Svelte actions (easiest method):

```svelte
<script>
  import { scrollFadeIn, scrollSlideUp, parallax } from '$lib/actions/scroll';
</script>

<!-- Fade in on scroll -->
<div use:scrollFadeIn>Content fades in</div>

<!-- Slide up on scroll -->
<div use:scrollSlideUp>Content slides up</div>

<!-- Parallax background -->
<div use:parallax={{ speed: 'slow' }}>Background parallax</div>
```

### 3. Use CSS Classes Directly

If you prefer direct CSS:

```svelte
<div class="scroll-fade-in">Fades in</div>
<div class="scroll-slide-up">Slides up</div>
<div class="parallax-slow">Parallax slow</div>
```

### 4. TypeScript Utilities

For programmatic control:

```typescript
import {
  isScrollAnimationsSupported,
  applyScrollAnimation,
  getScrollProgress,
} from '$lib/utils/scrollAnimations';

// Check support
if (isScrollAnimationsSupported()) {
  console.log('Native scroll animations supported!');
}

// Apply animation to element
const element = document.querySelector('.my-card');
applyScrollAnimation(element, 'scroll-fade-in');

// Get current scroll progress (0-100%)
const progress = getScrollProgress();
```

## Animation Classes Reference

### Fade Animations

**`.scroll-fade-in`**
- Element fades in as it enters viewport
- Range: `entry 0% cover 40%`
- Use for: General content, text, images

```svelte
<div class="scroll-fade-in">I fade in on scroll</div>
```

**`.scroll-fade-through`**
- Element fades in, then fades out
- Range: `entry 0% exit 100%`
- Use for: Reveal effects, section transitions

```svelte
<div class="scroll-fade-through">I fade in and out</div>
```

### Slide Animations

**`.scroll-slide-up`**
- Slide up from bottom + fade
- Range: `entry 0% cover 50%`
- Most common pattern for cards/sections

```svelte
<div class="scroll-slide-up">Slides up smoothly</div>
```

**`.scroll-slide-in-left`**
- Slide in from left + fade
- Range: `entry 0% cover 50%`

```svelte
<div class="scroll-slide-in-left">Comes from left</div>
```

**`.scroll-slide-in-right`**
- Slide in from right + fade
- Range: `entry 0% cover 50%`

```svelte
<div class="scroll-slide-in-right">Comes from right</div>
```

### Scale Animations

**`.scroll-scale-up`**
- Scale from 0.9 to 1.0 + fade
- Range: `entry 0% cover 50%`
- Use for: Emphasis, cards, CTAs

```svelte
<div class="scroll-scale-up">Scales up on scroll</div>
```

### Parallax Effects

Creates depth by moving backgrounds slower than foreground.

**`.parallax-slow`**
- Moves -50px over 100vh scroll
- Best for hero backgrounds

```svelte
<div class="parallax-slow">
  <img src="background.jpg" />
</div>
```

**`.parallax-medium`**
- Moves -30px over 80vh scroll
- General purpose parallax

```svelte
<div use:parallax={{ speed: 'medium' }}>Content</div>
```

**`.parallax-fast`**
- Moves -15px over 60vh scroll
- Subtle effect

```svelte
<div use:parallax={{ speed: 'fast' }}>Subtle parallax</div>
```

### Stagger Animations

**`.scroll-stagger-item`**
- Sequential animations for list items
- Each child gets staggered delay (0ms, 50ms, 100ms, etc.)

```svelte
<div class="scroll-stagger-container">
  {#each items as item, i}
    <div class="scroll-stagger-item" data-stagger-item>
      {item.title}
    </div>
  {/each}
</div>
```

### Reveal Animations

**`.scroll-clip-reveal`**
- Text reveals horizontally left-to-right
- Uses `clip-path: inset()`

```svelte
<h2 class="scroll-clip-reveal">This text reveals</h2>
```

**`.scroll-clip-reveal-bottom`**
- Text reveals vertically bottom-to-top

```svelte
<p class="scroll-clip-reveal-bottom">Reveals from bottom</p>
```

### Special Effects

**`.scroll-card-reveal`**
- Combined: slide + fade + scale
- Great for card stacks

```svelte
<div class="scroll-card-reveal">Epic card reveal</div>
```

**`.scroll-epic-reveal`**
- Maximum impact: slide + fade + scale + rotate
- Use sparingly for hero sections

```svelte
<div class="scroll-epic-reveal">Maximum drama!</div>
```

**`.scroll-gallery-item`**
- Items scale and fade in carousel
- Range: `contain 0% contain 100%`

```svelte
<div class="scroll-gallery-item">Gallery item</div>
```

**`.scroll-blur-in`**
- Element comes into focus (blur to sharp)
- Range: `entry 0% cover 50%`

```svelte
<img class="scroll-blur-in" src="image.jpg" />
```

**`.scroll-rotate`**
- Element rotates 360° with scroll
- Range: `0vh 150vh`

```svelte
<div class="scroll-rotate">Spinning</div>
```

### Utility Classes

**`.scroll-progress-bar`**
- Fixed progress bar tied to document scroll
- `transform: scaleX()` - GPU accelerated

```svelte
<!-- Import component for easy use -->
<ScrollProgressBar variant="gradient" />
```

## Svelte Actions API

### `scrollAnimate(element, animationClass)`

Generic scroll animation action.

```typescript
import { scrollAnimate } from '$lib/actions/scroll';

<div use:scrollAnimate={'scroll-fade-in'}>
  Content
</div>
```

### `scrollFadeIn(element)`

Fade in on scroll.

```svelte
<div use:scrollFadeIn>Fades in</div>
```

### `scrollSlideUp(element)`

Slide up on scroll.

```svelte
<div use:scrollSlideUp>Slides up</div>
```

### `parallax(element, options)`

Parallax effect with speed control.

```svelte
<div use:parallax={{ speed: 'slow' }}>
  <img src="bg.jpg" />
</div>
```

Options:
- `speed`: `'slow'` | `'medium'` | `'fast'`

### `scrollCardReveal(element)`

Card reveal animation.

```svelte
<div use:scrollCardReveal>
  Card content
</div>
```

### `scrollStagger(element)`

Stagger animations for children.

```svelte
<div use:scrollStagger>
  {#each items as item}
    <div data-stagger-item>{item}</div>
  {/each}
</div>
```

### `scrollAnimateAdvanced(element, options)`

Advanced control with custom ranges and callbacks.

```svelte
<div use:scrollAnimateAdvanced={{
  animation: 'scroll-slide-up',
  animationRange: 'entry 0% cover 50%',
  timingFunction: 'linear',
  onStart: () => console.log('Started'),
  debug: true
}}>
  Advanced animation
</div>
```

Options:
- `animation`: CSS class name
- `animationRange`: Custom animation range (requires CSS support)
- `timingFunction`: `'linear'` | `'ease-in'` | `'ease-out'` | `'ease-in-out'`
- `mediaQuery`: Only apply on certain screen sizes
- `onStart`: Callback when animation starts
- `onComplete`: Callback when animation completes
- `debug`: Log debug info

### `scrollAnimateResponsive(element, options)`

Different animations per breakpoint.

```svelte
<div use:scrollAnimateResponsive={{
  mobile: 'scroll-fade-in',
  tablet: 'scroll-slide-up',
  desktop: 'scroll-scale-up'
}}>
  Responsive animation
</div>
```

## TypeScript Utilities

### Feature Detection

```typescript
import {
  isScrollAnimationsSupported,
  isViewTimelineSupported,
  isAnimationRangeSupported,
  getScrollAnimationFeatures,
} from '$lib/utils/scrollAnimations';

// Check browser support
if (isScrollAnimationsSupported()) {
  console.log('Native scroll animations!');
}

// Get feature info
const features = getScrollAnimationFeatures();
// {
//   scrollTimeline: true,
//   viewTimeline: true,
//   animationRange: true,
//   supported: true
// }
```

### Apply/Remove Animations

```typescript
import {
  applyScrollAnimation,
  removeScrollAnimation,
  applyScrollAnimationsToElements,
} from '$lib/utils/scrollAnimations';

// Single element
const el = document.querySelector('.card');
applyScrollAnimation(el, 'scroll-fade-in');

// Remove later
removeScrollAnimation(el, 'scroll-fade-in');

// Batch apply
applyScrollAnimationsToElements('.card', 'scroll-slide-up');
```

### Scroll Utilities

```typescript
import {
  getScrollProgress,
  getScrollPosition,
  prefersReducedMotion,
} from '$lib/utils/scrollAnimations';

// Get current scroll progress (0-100%)
const progress = getScrollProgress();

// Get scroll position
const { x, y } = getScrollPosition();

// Check accessibility preference
if (prefersReducedMotion()) {
  // Disable animations
}
```

### Disable/Enable Animations

```typescript
import {
  disableScrollAnimations,
  enableScrollAnimations,
} from '$lib/utils/scrollAnimations';

// Disable all
disableScrollAnimations();

// Re-enable
enableScrollAnimations();
```

### Observe with Fallback

```typescript
import { observeScrollAnimations } from '$lib/utils/scrollAnimations';

// If scroll animations not supported, uses Intersection Observer
const observer = observeScrollAnimations('[data-scroll-animate]');
```

### Debug Info

```typescript
import { getScrollAnimationDebugInfo } from '$lib/utils/scrollAnimations';

const info = getScrollAnimationDebugInfo();
// {
//   supported: true,
//   features: { ... },
//   scrollProgress: 45.2,
//   scrollPosition: { x: 0, y: 1200 },
//   prefersReducedMotion: false,
//   viewportHeight: 800,
//   documentHeight: 3000
// }
```

## CSS Custom Properties

Override animation behavior with CSS variables:

```css
/* Custom animation range */
.my-element {
  --animation-range: entry 0% cover 50%;
  animation: scrollFadeIn linear both;
  animation-timeline: view();
}

/* Custom timing */
.my-element {
  --animation-timing: ease-in-out;
  animation-timing-function: var(--animation-timing);
}
```

## Components

### `ScrollProgressBar`

Fixed progress bar showing scroll position.

```svelte
<script>
  import ScrollProgressBar from '$lib/components/scroll/ScrollProgressBar.svelte';
</script>

<!-- Default -->
<ScrollProgressBar />

<!-- Gradient variant -->
<ScrollProgressBar variant="gradient" />

<!-- Glowing variant -->
<ScrollProgressBar variant="glowing" color="primary" height={4} />

<!-- With label -->
<ScrollProgressBar showLabel={true} />
```

Props:
- `variant`: `'solid'` | `'gradient'` | `'glowing'` (default: `'solid'`)
- `color`: `'primary'` | `'secondary'` | `'success'` | `'warning'` (default: `'primary'`)
- `height`: pixels (default: 4)
- `showLabel`: show percentage (default: false)

### `ScrollAnimationCard`

Card with automatic scroll animation.

```svelte
<script>
  import ScrollAnimationCard from '$lib/components/scroll/ScrollAnimationCard.svelte';
</script>

<ScrollAnimationCard animation="scroll-slide-up">
  <h3>My Card</h3>
  <p>Content here</p>
</ScrollAnimationCard>
```

Props:
- `animation`: CSS animation class
- `variant`: Card style variant
- `padding`: `'none'` | `'sm'` | `'md'` | `'lg'`
- `interactive`: clickable card
- `class`: custom CSS classes

### `ScrollAnimationExamples`

Complete showcase of all animations.

```svelte
<script>
  import ScrollAnimationExamples from '$lib/components/scroll/ScrollAnimationExamples.svelte';
</script>

<ScrollAnimationExamples />
```

## Accessibility

All scroll animations respect `prefers-reduced-motion`:

```css
@media (prefers-reduced-motion: reduce) {
  /* Animations disabled */
}
```

To disable animations programmatically:

```typescript
import { disableScrollAnimations } from '$lib/utils/scrollAnimations';

if (userHasAccessibilitySettings) {
  disableScrollAnimations();
}
```

## Performance Tips

1. **Use GPU-accelerated properties only:**
   - ✅ `transform`, `opacity`
   - ❌ Avoid `top`, `left`, `width`, `height`

2. **Apply `will-change` strategically:**
   ```css
   .animated-element {
     will-change: transform, opacity;
   }
   ```

3. **Use `animation-range` for precise control:**
   ```css
   .card {
     animation-range: entry 0% cover 40%;
   }
   ```

4. **Combine with container queries for responsive:**
   ```css
   @container (max-width: 600px) {
     .card {
       animation-range: entry 0% cover 60%;
     }
   }
   ```

5. **Respect reduced motion:**
   ```css
   @media (prefers-reduced-motion: reduce) {
     .scroll-animated {
       animation: none;
     }
   }
   ```

## Browser Compatibility

| Feature | Chrome | Safari | Firefox | Edge |
|---------|--------|--------|---------|------|
| `animation-timeline` | 115+ | 17.1+ | ❌ | 115+ |
| `animation-range` | 115+ | 17.1+ | ❌ | 115+ |
| Fallback CSS | All | All | All | All |

For unsupported browsers, scroll animations fall back to simple `opacity` transitions.

## Examples

### Hero Section with Parallax

```svelte
<section class="hero" use:parallax={{ speed: 'slow' }}>
  <img src="bg.jpg" class="parallax-bg" />
  <h1 class="scroll-epic-reveal">Welcome to DMB Almanac</h1>
</section>
```

### Card Grid with Stagger

```svelte
<div use:scrollStagger>
  {#each shows as show}
    <div class="card scroll-stagger-item" data-stagger-item>
      <h3>{show.title}</h3>
    </div>
  {/each}
</div>
```

### About Section with Multiple Effects

```svelte
<section>
  <h2 class="scroll-clip-reveal">Our Story</h2>

  <div class="grid">
    {#each items as item}
      <div class="scroll-card-reveal">
        {item.content}
      </div>
    {/each}
  </div>
</section>
```

### Gallery with Item Animations

```svelte
<div class="gallery">
  {#each images as image}
    <img class="scroll-gallery-item" src={image} />
  {/each}
</div>
```

## Troubleshooting

### Animations not working?

1. Check browser support:
   ```typescript
   import { isScrollAnimationsSupported } from '$lib/utils/scrollAnimations';
   console.log(isScrollAnimationsSupported());
   ```

2. Check for `prefers-reduced-motion`:
   ```typescript
   import { prefersReducedMotion } from '$lib/utils/scrollAnimations';
   console.log(prefersReducedMotion());
   ```

3. Verify CSS is imported in `app.css`

4. Check browser console for errors

### Animations too fast/slow?

Adjust `animation-range` in CSS:

```css
.my-element {
  /* Faster: smaller range */
  animation-range: entry 0% cover 20%;

  /* Slower: larger range */
  animation-range: entry 0% cover 80%;
}
```

### Performance issues?

1. Use DevTools Performance tab to identify bottlenecks
2. Check for painting/layout issues (red indicators)
3. Ensure only `transform` and `opacity` are animated
4. Use `content-visibility: auto` for off-screen elements

## References

- [CSS Animation Timeline MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/animation-timeline)
- [Animation Range MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/animation-range)
- [View Transitions API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API)
- [Chrome 115 Release Notes](https://developer.chrome.com/blog/chrome-115-beta/)

## Contributing

To add new scroll animations:

1. Add keyframes to `/src/lib/motion/scroll-animations.css`
2. Add Svelte action to `/src/lib/actions/scroll.ts`
3. Add utility function to `/src/lib/utils/scrollAnimations.ts`
4. Export in action files for easy use

---

**Performance Target:** 60 FPS on Apple Silicon with ProMotion 120Hz display.

**Last Updated:** 2026-01-21
**Tested On:** Chrome 143, macOS Tahoe 26.2, M-series Apple Silicon

# Scroll-Driven Animation Implementation Guide
**DMB Almanac - Chrome 115+ & Chromium 143+**

Quick reference for developers using scroll animations in this project.

---

## 1. Using Scroll Animation Classes

### Basic Element Animations

```svelte
<!-- Fade in when element enters viewport -->
<section class="scroll-fade-in">
  <h2>Your Content</h2>
</section>

<!-- Slide up + fade in -->
<div class="scroll-slide-up">
  <p>Animated content</p>
</div>

<!-- Scale up + fade -->
<card class="scroll-scale-up">
  Card reveals with scale animation
</card>
```

### Parallax Backgrounds

```svelte
<!-- Hero section with parallax effect -->
<div class="hero">
  <!-- Background moves slower than scroll (parallax-slow) -->
  <img class="parallax-slow" src="bg.jpg" alt="Hero background">

  <!-- Text moves faster (parallax-fast) -->
  <h1 class="parallax-fast">Amazing Title</h1>
</div>

<!-- Medium parallax for mid-section -->
<section class="parallax-medium">
  Content that moves at medium speed
</section>
```

### Staggered List Items

```svelte
<!-- Each item fades in with sequential delay -->
<ul>
  {#each items as item (item.id)}
    <li class="scroll-stagger-item">
      {item.name}
    </li>
  {/each}
</ul>
```

### Progress Bar

```svelte
<!-- Fixed progress bar showing scroll position -->
<div class="scroll-progress-bar"></div>
```

---

## 2. Advanced Animation Ranges

### Entry-Only Animations

```css
/* Animate only when element enters viewport */
.scroll-fade-in {
  animation: scrollFadeIn linear both;
  animation-timeline: view();
  animation-range: entry 0% entry 100%;  /* 0% = entering, 100% = fully entered */
}
```

**Use for:** Quick reveals (loading states, cards entering list).

### Cover-Range Animations

```css
/* Animate while element is in viewport */
.scroll-slide-up {
  animation: scrollSlideUp linear both;
  animation-timeline: view();
  animation-range: entry 0% cover 50%;  /* Finish halfway through visible section */
}
```

**Use for:** Staggered reveals, parallax effects.

### Exit Animations

```css
/* Fade out as element leaves viewport */
.scroll-fade-through {
  animation: scrollFadeThrough linear both;
  animation-timeline: view();
  animation-range: entry 0% exit 100%;  /* Fade in on entry, fade out on exit */
}
```

**Use for:** Elements that appear/disappear as you scroll.

### Contain-Range Animations

```css
/* Animate when element is centered in viewport */
.scroll-gallery-item {
  animation: scrollGalleryItem linear both;
  animation-timeline: view(inline);
  animation-range: contain 0% contain 100%;  /* Trigger when in center of viewport */
}
```

**Use for:** Gallery carousels, highlight effects.

---

## 3. Named Scroll Timelines

For animations tied to specific scrollable containers (not document):

```svelte
<script>
  import { createNamedScrollTimeline } from '$lib/utils/scrollAnimations';

  let containerElement;

  onMount(() => {
    createNamedScrollTimeline(containerElement, 'my-list-scroll', 'block');
  });
</script>

<div bind:this={containerElement} class="scroll-timeline-container" style="overflow-y: auto">
  <div class="timeline-item">Item 1 animates based on list scroll</div>
  <div class="timeline-item">Item 2</div>
  <div class="timeline-item">Item 3</div>
</div>

<style>
  .scroll-timeline-container {
    scroll-timeline-name: --my-list-scroll;
    scroll-timeline-axis: block;
    height: 500px;
    overflow-y: auto;
  }

  .timeline-item {
    animation: fadeIn linear both;
    animation-timeline: --my-list-scroll;
    animation-range: entry 0% cover 100%;
  }
</style>
```

---

## 4. Feature Detection

### JavaScript

```typescript
import {
  isScrollAnimationsSupported,
  getScrollAnimationFeatures,
  initializeScrollAnimations
} from '$lib/utils/scrollAnimations';

// Check if browser supports scroll-driven animations
if (isScrollAnimationsSupported()) {
  console.log('Native scroll animations available');
} else {
  console.log('Using fallback fade animations');
}

// Get detailed feature info
const features = getScrollAnimationFeatures();
console.log(features);
// {
//   scrollTimeline: true,
//   viewTimeline: true,
//   animationRange: true,
//   supported: true
// }

// Initialize scroll animations (call once at app startup)
initializeScrollAnimations();
```

### CSS

```css
/* All scroll animations are automatically wrapped in @supports */
@supports (animation-timeline: scroll()) {
  .scroll-fade-in {
    animation: scrollFadeIn linear both;
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

## 5. Accessibility (prefers-reduced-motion)

Animations automatically disable for users with motion sensitivity:

```css
@media (prefers-reduced-motion: reduce) {
  .scroll-fade-in,
  .scroll-slide-up,
  .parallax-slow,
  /* ... all animation classes ... */
  {
    animation: none !important;
    transform: none !important;
    opacity: 1 !important;
  }
}
```

**No action needed** - handled automatically. Content remains readable and accessible.

### Detect User Preference

```typescript
import { prefersReducedMotion, onReducedMotionChange } from '$lib/utils/scrollAnimations';

if (prefersReducedMotion()) {
  console.log('User prefers reduced motion');
}

// Listen for preference changes
const unsubscribe = onReducedMotionChange((prefers) => {
  if (prefers) {
    console.log('User enabled reduced motion');
  } else {
    console.log('User disabled reduced motion');
  }
});

// Cleanup
unsubscribe();
```

---

## 6. Animation Properties Reference

### Scroll Progress Timeline

```css
/* Tied to document vertical scroll position (0% - 100%) */
.element {
  animation: myAnimation linear both;
  animation-timeline: scroll(root block);  /* document scroll, vertical */
  animation-range: 0vh 100vh;              /* 0vh at top, 100vh at bottom */
}

/* Optional: scroll(inline) for horizontal scrolling */
.carousel {
  animation-timeline: scroll(inline);
  animation-range: 0px 1000px;  /* pixel-based ranges */
}
```

### View Timeline

```css
/* Tied to element's visibility in viewport (entry -> cover -> exit) */
.element {
  animation: myAnimation linear both;
  animation-timeline: view();  /* Default: vertical, nearest ancestor */
  animation-range: entry 0% cover 50%;
}

/* Optional: horizontal scrolling carousel */
.gallery-item {
  animation-timeline: view(inline);  /* horizontal viewport tracking */
  animation-range: contain 0% contain 100%;
}
```

### Animation Range Keyframes

```
entry 0%   -> Element just entering viewport
entry 100% -> Element fully in viewport
cover 0%   -> Viewport covers element start
cover 100% -> Viewport covers element end
contain 0% -> Element fully visible in viewport
contain 100% -> Element about to leave viewport
exit 0%    -> Element starting to exit
exit 100%  -> Element fully exited
```

---

## 7. Performance Tips

### DO - GPU-Safe Properties

```css
/* ✅ GOOD - GPU accelerated on Apple Silicon */
@keyframes goodAnimation {
  from {
    transform: translateY(30px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
```

### DON'T - Layout-Thrashing Properties

```css
/* ❌ BAD - Causes layout recalculation every frame */
@keyframes badAnimation {
  from {
    top: 30px;      /* DON'T - layout property */
    height: 50px;   /* DON'T - layout property */
  }
  to {
    top: 0;
    height: 100px;
  }
}
```

### Optimization Hints

```css
/* Tell browser this element will be animated */
.element {
  will-change: transform, opacity;

  /* GPU layer promotion for Apple Silicon */
  transform: translateZ(0);
  backface-visibility: hidden;
}
```

---

## 8. Common Patterns

### Fade-in List

```svelte
<ul>
  {#each items as item, index (item.id)}
    <li
      class="scroll-fade-in"
      style="animation-delay: {index * 50}ms"
    >
      {item.name}
    </li>
  {/each}
</ul>

<style>
  li {
    animation: scrollFadeIn linear both;
    animation-timeline: view();
    animation-range: entry 0% cover 40%;
  }
</style>
```

### Parallax Hero

```svelte
<section class="hero">
  <img class="parallax-slow" src="background.jpg" alt="Hero background">
  <h1>Scroll me</h1>
</section>

<style>
  .hero {
    position: relative;
    height: 100vh;
    overflow: hidden;
  }

  .parallax-slow {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    /* Animation applied via CSS class */
  }

  h1 {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }
</style>
```

### Staggered Card Grid

```svelte
<div class="card-grid">
  {#each cards as card (card.id)}
    <article class="scroll-card-reveal">
      <h3>{card.title}</h3>
      <p>{card.description}</p>
    </article>
  {/each}
</div>

<style>
  .card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: var(--space-4);
  }

  article {
    animation: scrollCardReveal linear both;
    animation-timeline: view();
    animation-range: entry 0% cover 40%;
  }
</style>
```

### Scroll Progress Bar

```svelte
<!-- In root layout -->
<div class="scroll-progress-bar"></div>

<style>
  /* All styling in src/lib/motion/scroll-animations.css */
  .scroll-progress-bar {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 4px;
    background: linear-gradient(90deg, var(--color-primary-500), var(--color-accent-orange));
    animation: scrollProgress linear both;
    animation-timeline: scroll(root block);
    transform-origin: left;
  }

  @keyframes scrollProgress {
    from { transform: scaleX(0); }
    to { transform: scaleX(1); }
  }
</style>
```

---

## 9. Debugging

### Check Browser Support

```typescript
import { getScrollAnimationDebugInfo } from '$lib/utils/scrollAnimations';

const info = getScrollAnimationDebugInfo();
console.log(info);

// Output:
// {
//   supported: true,
//   features: {
//     scrollTimeline: true,
//     viewTimeline: true,
//     animationRange: true,
//     supported: true
//   },
//   scrollProgress: 42.5,           // Current scroll %
//   scrollPosition: { x: 0, y: 500 },
//   prefersReducedMotion: false,
//   viewportHeight: 1080,
//   documentHeight: 3400
// }
```

### DevTools Tips

1. **Chrome DevTools > Elements > Animations panel**
   - Shows all running animations
   - View timeline scrubber
   - Pause/slow down animations

2. **Performance > Rendering**
   - Show composited layer borders
   - Check if animations use GPU (green = good)

3. **Coverage tab**
   - Verify scroll-animations.css is loaded
   - Should see `@supports` rules applied

### Console Warnings

```typescript
// If scroll animations not supported:
'Scroll-driven animations not supported. Using CSS fallbacks.'

// Log feature availability:
import.meta.env.DEV && getScrollAnimationDebugInfo();
```

---

## 10. Browser Support Timeline

| Browser | Version | Status | Animation Fallback |
|---------|---------|--------|-------------------|
| Chrome | 115+ | Full Support | Native CSS animations |
| Edge | 115+ | Full Support | Native CSS animations |
| Opera | 101+ | Full Support | Native CSS animations |
| Safari | 17.4+ | Full Support | Native CSS animations |
| Firefox | TBD | Not yet implemented | Traditional animations |

---

## 11. Customization

### Create Custom Scroll Animation

```css
/* Define custom keyframes */
@keyframes myCustomReveal {
  from {
    opacity: 0;
    transform: translateX(-100px) rotate(-10deg);
  }
  to {
    opacity: 1;
    transform: translateX(0) rotate(0deg);
  }
}

/* Create animation class */
.my-custom-animation {
  animation: myCustomReveal linear both;
  animation-timeline: view();
  animation-range: entry 0% cover 60%;
  will-change: transform, opacity;
}
```

### Adjust Animation Range

```css
/* Quick reveal (perfect for fast scrollers) */
.quick-reveal {
  animation-range: entry 0% cover 20%;  /* Finish faster */
}

/* Slow reveal (dramatic effect) */
.slow-reveal {
  animation-range: entry 0% cover 80%;  /* Draw out animation */
}

/* Entry-only */
.entry-only {
  animation-range: entry 0% entry 100%;  /* Trigger only on entry */
}
```

### Create Parallax Variant

```css
/* Extra slow parallax */
.parallax-extra-slow {
  animation: parallaxExtraSlow linear;
  animation-timeline: scroll(root block);
  animation-range: 0vh 150vh;  /* Longer range = slower movement */
  will-change: transform;
}

@keyframes parallaxExtraSlow {
  from { transform: translateY(0); }
  to { transform: translateY(-80px); }
}
```

---

## 12. Troubleshooting

### Animation Not Triggering

**Check 1: Feature Support**
```typescript
if (!isScrollAnimationsSupported()) {
  console.warn('Browser does not support scroll-driven animations');
}
```

**Check 2: animation-timeline Value**
```css
/* Verify syntax */
animation-timeline: view();           /* ✅ Correct */
animation-timeline: scroll();         /* ✅ Correct */
animation-timeline: view(inline);     /* ✅ Correct for horizontal */
animation-timeline: myTimeline;       /* ⚠️ Custom timeline - must be defined */
```

**Check 3: animation-range Value**
```css
/* Verify range syntax */
animation-range: entry 0% cover 50%;   /* ✅ Correct */
animation-range: entry 0% cover 100%;  /* ✅ Correct */
animation-range: entry 0%;             /* ⚠️ Incomplete - needs second value */
```

**Check 4: prefers-reduced-motion**
```typescript
if (prefersReducedMotion()) {
  // All animations are disabled for this user
  console.log('Motion animations disabled');
}
```

### Animation Too Fast/Slow

**Adjust animation-range:**
```css
/* Current */
.element {
  animation-range: entry 0% cover 50%;  /* Animation finishes at 50% viewport coverage */
}

/* Slower - extend range */
.element {
  animation-range: entry 0% cover 80%;  /* Animation finishes at 80% viewport coverage */
}

/* Faster - shorten range */
.element {
  animation-range: entry 0% cover 25%;  /* Animation finishes at 25% viewport coverage */
}
```

### Animation Jittery

**Ensure GPU properties only:**
```css
/* ❌ DON'T DO THIS */
@keyframes jittery {
  from { left: 30px; }        /* Layout property - will jitter */
  to { left: 0; }
}

/* ✅ DO THIS */
@keyframes smooth {
  from { transform: translateX(30px); }  /* GPU property - smooth */
  to { transform: translateX(0); }
}
```

---

## 13. Examples by Component Type

### Hero Section
```svelte
<div class="hero">
  <img class="parallax-slow" src="bg.jpg" alt="">
  <h1 class="parallax-fast">Welcome</h1>
</div>
```

### Product Cards
```svelte
<div class="products-grid">
  {#each products as product}
    <div class="scroll-card-reveal">
      <img src={product.image}>
      <h3>{product.name}</h3>
    </div>
  {/each}
</div>
```

### Statistics Section
```svelte
<section class="stats">
  {#each stats as stat}
    <div class="stat-item scroll-fade-in">
      <div class="scroll-counter">{stat.value}</div>
      <p>{stat.label}</p>
    </div>
  {/each}
</section>
```

### Image Gallery
```svelte
<div class="gallery">
  {#each images as img}
    <div class="scroll-gallery-item">
      <img src={img.src} alt={img.alt}>
    </div>
  {/each}
</div>
```

### Text Reveal
```svelte
<h2 class="scroll-clip-reveal">
  Text reveals from left to right as you scroll
</h2>
```

---

## Summary

**Use case → Animation class:**

| Use Case | Class | animation-range |
|----------|-------|-----------------|
| Fade in on scroll | `.scroll-fade-in` | entry 0% cover 40% |
| Slide up + fade | `.scroll-slide-up` | entry 0% cover 50% |
| Side slide | `.scroll-slide-in-left` | entry 0% cover 50% |
| Scale up + fade | `.scroll-scale-up` | entry 0% cover 50% |
| Background parallax | `.parallax-slow/medium/fast` | 0vh 100vh/80vh/60vh |
| Hero images | `.parallax-slow` | 0vh 100vh |
| List items (stagger) | `.scroll-stagger-item` | entry 0% cover 40% |
| Cards | `.scroll-card-reveal` | entry 0% cover 40% |
| Gallery items | `.scroll-gallery-item` | contain 0% contain 100% |
| Horizontal reveal | `.scroll-clip-reveal` | entry 0% cover 50% |
| Vertical reveal | `.scroll-clip-reveal-bottom` | entry 0% cover 50% |
| Numbers/progress | `.scroll-counter` | entry 0% cover 100% |
| Borders | `.scroll-border-animate` | entry 0% cover 60% |
| Full-width sections | `.scroll-section-reveal` | entry 0% cover 50% |
| Epic combo reveal | `.scroll-epic-reveal` | entry 0% cover 60% |

---

**Reference:** `/src/lib/motion/scroll-animations.css` | `/src/lib/utils/scrollAnimations.ts`

---
title: Blaire's Kind Heart — Safari 26.2 CSS Best Practices (Exemplary Implementation)
type: reference
status: guide
---

# Safari 26.2 CSS Best Practices

## Blaire's Kind Heart as a Reference Implementation

This document highlights the **excellent CSS patterns** used in Blaire's Kind Heart that other Safari 26.2 projects should emulate.

---

## Pattern 1: View Transitions for Page Navigation

### Location
`src/styles/animations.css:7–26`

### Implementation

```css
::view-transition-old(root) {
  animation: slide-out var(--duration-normal) var(--ease-smooth);
}

::view-transition-new(root) {
  animation: slide-in var(--duration-normal) var(--ease-smooth);
}

@keyframes slide-out {
  to {
    opacity: 0;
    transform: translateX(-30px) scale(0.96);
  }
}

@keyframes slide-in {
  from {
    opacity: 0;
    transform: translateX(30px) scale(0.96);
  }
}
```

### Why This is Excellent

1. **Simple and declarative** — No JS involvement, pure CSS
2. **Named transitions** — Also uses `companion-transform` for skin changes
3. **Smooth timing** — Uses token `--duration-normal` and `--ease-smooth` (reusable)
4. **Directional feel** — Slide left on exit, slide right on enter (intuitive)
5. **Scale animation** — Slight zoom adds depth without distracting

### Integration with Rust

Rust code triggers via Navigation API:

```rust
// Triggering in rust/navigation.rs (pseudo-code)
navigation::navigate_to("panel-tracker")?;
// Browser automatically handles ::view-transition-old/new
```

### Best Practices Applied

✅ Uses CSS custom properties for timing
✅ Semantic transition names
✅ Respects `prefers-reduced-motion` (in animations.css:452)
✅ Works exclusively in Safari 26.2 (no fallbacks needed)
✅ No JavaScript animation libraries required

---

## Pattern 2: Staggered Entrance with sibling-index()

### Locations

1. `src/styles/app.css:482` — Home button grid
2. `src/styles/tracker.css:60` — Kind act buttons
3. `src/styles/quests.css:107` — Quest cards
4. `src/styles/stories.css:192` — Story covers

### Example: Home Button Stagger

```css
[data-home-btn].entrance-visible {
  opacity: 1;
  transform: scale(1) translateY(0);
  /* Safari 26.2 sibling-index() — eliminates nth-child() rules */
  transition-delay: calc(200ms + (sibling-index() - 1) * 80ms);
}
```

### HTML Structure (from index.html)

```html
<nav class="home-grid" aria-label="Main features">
  <button class="home-btn home-btn--tracker" data-home-btn>
    <img src="..." alt="" class="home-btn-img">
    <span class="home-btn-label">Kind Acts</span>
  </button>
  <!-- Buttons 2–6 follow -->
</nav>
```

### Result

- Button 1: `transition-delay: 200ms`
- Button 2: `transition-delay: 280ms`
- Button 3: `transition-delay: 360ms`
- ... and so on

**No CSS for each nth-child!** Browser calculates position automatically.

### Why This is Excellent

1. **DRY** — Single rule handles all children
2. **Dynamic** — Works if buttons are added/removed
3. **Readable** — Math is right in the CSS (`sibling-index() - 1`)
4. **No JS calculations** — Browser does the math
5. **Safari 26.2+ only** — Appropriate for this project (no fallback needed)

### Fallback Pattern (if needed)

For cross-browser support (not applicable here):

```css
/* Safari 26.2+ */
@supports (transition-delay: calc(200ms + (sibling-index() - 1) * 80ms)) {
  [data-home-btn].entrance-visible {
    transition-delay: calc(200ms + (sibling-index() - 1) * 80ms);
  }
}

/* Older browsers: individual nth-child rules */
@supports not (transition-delay: calc(200ms + (sibling-index() - 1) * 80ms)) {
  [data-home-btn]:nth-child(1).entrance-visible { transition-delay: 200ms; }
  [data-home-btn]:nth-child(2).entrance-visible { transition-delay: 280ms; }
  /* ... etc ... */
}
```

---

## Pattern 3: Scroll-Driven Animations with Viewport Timelines

### Location
`src/styles/scroll-effects.css` (entire file)

### Example 1: View-Based Reveal

```css
.home-btn, .kind-btn, .quest-card {
  opacity: 0;
  transform: translateY(30px) scale(0.92);

  /* Animate as element enters viewport */
  animation: scroll-reveal linear both;
  animation-timeline: view();
  animation-range: entry 0% entry 80%;
}

@keyframes scroll-reveal {
  from {
    opacity: 0;
    transform: translateY(30px) scale(0.92);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
```

### Example 2: Root Scroll Timeline

```css
/* Companion rotates based on page scroll position */
.companion {
  animation: companion-scroll-rotate linear;
  animation-timeline: scroll(root);
}

@keyframes companion-scroll-rotate {
  from { transform: rotate(-5deg); }
  to { transform: rotate(5deg); }
}
```

### Example 3: Staggered Stagger via animation-range

```css
.home-btn:nth-child(1) {
  animation-range: entry 0% entry 70%;
}
.home-btn:nth-child(2) {
  animation-range: entry 10% entry 80%;
}
.home-btn:nth-child(3) {
  animation-range: entry 20% entry 90%;
}
```

Each button enters at a slightly offset scroll position, creating waterfall effect.

### Why This is Excellent

1. **No JavaScript required** — Pure CSS timelines
2. **Performant** — Browser native, not JS-triggered
3. **Readable** — `view()` and `scroll()` are semantic
4. **Responsive** — Works at any viewport size
5. **Graceful fallback** — Elements visible by default if animation fails

### Fallback Pattern

```css
@supports (animation-timeline: view()) {
  .home-btn {
    animation-timeline: view();
    animation-range: entry 0% entry 80%;
  }
}

@supports not (animation-timeline: view()) {
  /* Older browsers: just make visible */
  .home-btn {
    opacity: 1;
    transform: none;
  }
}
```

---

## Pattern 4: Color State Management with color-mix()

### Location
`src/styles/tokens.css:32–40`

### Implementation

```css
:root {
  /* Base colors */
  --color-purple: #B57EFF;
  --color-pink: #FF8FAB;

  /* Interactive states via color-mix() */
  --color-purple-hover: color-mix(in srgb, var(--color-purple) 85%, white);
  --color-purple-active: color-mix(in srgb, var(--color-purple) 85%, black);
  --color-pink-hover: color-mix(in srgb, var(--color-pink) 85%, white);
  --color-pink-active: color-mix(in srgb, var(--color-pink) 85%, black);

  /* Overlay colors */
  --color-overlay-light: color-mix(in srgb, var(--color-purple-dark) 6%, transparent);
  --color-overlay-medium: color-mix(in srgb, var(--color-purple-dark) 55%, transparent);
}
```

### Usage

```css
.kind-btn--hug:hover {
  background: var(--color-purple-hover);
  border-color: var(--color-purple);
}

.kind-btn--hug:active {
  background: var(--color-purple-active);
  box-shadow: 0 1px 3px rgba(255, 143, 171, 0.2);
}
```

### Why This is Excellent

1. **No hardcoded hex codes** — All derived from base colors
2. **Consistent blending** — All hovers at 85% saturation
3. **Safari 26.2 default** — `in srgb` is the Safari 26.2 default (oklab coming in 26.2)
4. **Maintainable** — Change base color once, all states update
5. **Accessible** — Colors auto-contrast for readability

### Advanced: Conditional Color-Mix (Future)

When dark mode is added (hypothetical):

```css
:root {
  --light-mode: 1;

  --color-purple-hover: color-mix(
    in srgb,
    var(--color-purple) if(var(--light-mode) = 1, 85%, 65%),
    if(var(--light-mode) = 1, white, black)
  );
}

@media (prefers-color-scheme: dark) {
  :root {
    --light-mode: 0;
  }
}
```

---

## Pattern 5: Deferred Rendering with content-visibility

### Location
`src/styles/app.css:268–270`

### Implementation

```css
.panel[hidden] {
  display: none;
  /* Defer rendering of hidden panels until needed (Safari 26.2) */
  content-visibility: auto;
  contain-intrinsic-size: auto 100vh;
}
```

### How It Works

1. **Tracker panel** loads hidden
2. Browser skips rendering its contents
3. When user navigates to tracker, panel becomes visible
4. Browser renders contents at that moment

**Result**: Faster initial LCP (Largest Contentful Paint)

### Why This is Excellent

1. **Performance win** — Reduces initial JS/layout work
2. **No behavior change** — Content still there, just deferred
3. **Explicit size hint** — `contain-intrinsic-size` prevents jank
4. **Containment** — `contain: layout` isolated panel paint
5. **Safari 26.2+ only** — Appropriate for this project

### Containment Applied Elsewhere

`src/styles/app.css:346`:

```css
.panel-body {
  flex: 1;
  padding: var(--space-lg);
  /* Phase 2.1: Isolate panel layout from document tree (faster View Transitions) */
  contain: layout style paint;
}
```

This ensures panels don't trigger parent reflows during View Transitions.

---

## Pattern 6: Responsive Touch Targets with CSS Variables

### Location
`src/styles/tokens.css:102–105`

### Implementation

```css
:root {
  /* Touch targets — extra generous for small fingers */
  --touch-min: 52px;
  --touch-comfortable: 68px;
  --touch-large: 88px;
}
```

### Usage Throughout

```css
/* Buttons minimum touch target */
.kind-btn {
  min-height: var(--touch-comfortable); /* 68px */
}

.panel-back {
  width: var(--touch-min); /* 52px */
  height: var(--touch-min);
}

.onboarding-btn {
  min-height: var(--touch-large); /* 88px */
}
```

### Why This is Excellent

1. **Accessibility by design** — All buttons exceed 48px Apple guideline
2. **Consistent** — Every button uses the same scale
3. **Adjustable** — Change one variable to resize all buttons
4. **Kid-friendly** — Extra padding for small fingers (48px min → 52–88px actual)
5. **No magic numbers** — Every button size is intentional

---

## Pattern 7: Playful Easing Functions for Motion

### Location
`src/styles/tokens.css:107–112`

### Implementation

```css
:root {
  /* Transitions — bouncier and more playful */
  --ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-overshoot: cubic-bezier(0.175, 0.885, 0.32, 1.275);
  --ease-smooth: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-spring: cubic-bezier(0.68, -0.55, 0.265, 1.55);
  --ease-elastic: cubic-bezier(0.68, -0.6, 0.32, 1.6);
}
```

### Usage

```css
.kind-btn {
  transition: transform var(--duration-fast) var(--ease-bounce);
}

[data-home-btn].entrance-visible {
  transition: all var(--duration-normal) var(--ease-overshoot);
}

.quest-card {
  animation: quest-entrance 0.5s var(--ease-overshoot) both;
}
```

### Why This is Excellent

1. **Brand consistency** — All bounce/spring animations feel unified
2. **Playful feel** — Overshoot easing creates joy (appropriate for 4-year-old)
3. **Named timings** — `--ease-bounce` is more meaningful than `cubic-bezier(...)`
4. **Adjustable** — Change easing once, affects entire app
5. **Performance** — Easing functions are hardware-accelerated

### Easing Function Guide

| Function | Feel | Use Case |
|----------|------|----------|
| `--ease-bounce` | Bouncy, playful | Button press, card reveal |
| `--ease-overshoot` | Snappy, overshoots then settles | Entrance animations, scale-in |
| `--ease-smooth` | Subtle, professional | Fade, opacity changes, scrolling |
| `--ease-spring` | Springy, oscillates | Loading states, micro-interactions |
| `--ease-elastic` | Stretchy, exaggerated | Jelly wobble, playful feedback |

---

## Pattern 8: GPU Acceleration Hints for Smooth Animations

### Location
`src/styles/app.css:262–276`

### Implementation

```css
.panel {
  position: fixed;
  /* Force GPU layer for smoother View Transitions */
  transform: translateZ(0);

  &.transitioning {
    will-change: transform, opacity;
  }
}
```

### Also in Quests

`src/styles/quests.css:93`:

```css
.quest-card {
  transform: translateZ(0);
  /* ... */
}
```

### Why This is Excellent

1. **Hardware acceleration** — `translateZ(0)` forces GPU rendering
2. **Conditional hint** — Only `will-change` during transitions (not always)
3. **Smooth 60fps** — Prevents jank during View Transitions on iPad mini
4. **Subtly applied** — Not overused (only where needed)
5. **Safari 26.2 optimized** — Works perfectly on Metal backend

### When Not to Use

❌ Don't apply `will-change` to everything
❌ Don't use `translateZ(0)` unnecessarily (wastes GPU memory)
❌ Use conditionally (only during transitions)

---

## Pattern 9: Graceful Fallbacks with @supports

### Location
`src/styles/scroll-effects.css:114–140`

### Implementation

```css
@supports (animation-timeline: scroll(root)) {
  /* Add subtle progress bar that fills as you scroll */
  body::after {
    content: "";
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: var(--gradient-rainbow);
    transform: scaleX(0);
    animation: scroll-progress linear;
    animation-timeline: scroll(root);
  }
}
```

### Reduced Motion Respect

`src/styles/animations.css:451–462`:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
  ::view-transition-old(root),
  ::view-transition-new(root) {
    animation: none !important;
  }
}
```

### Why This is Excellent

1. **Inclusive design** — Respects accessibility preferences
2. **Feature detection** — Only applies animation where supported
3. **No breaking changes** — Elements still function without animations
4. **Performance conscious** — Disables animations for users with motion sensitivity

---

## Pattern 10: Semantic HTML Structure with ARIA Labels

### Location
`index.html:216–256` (home scene)

### Implementation

```html
<main id="app" class="home-scene" data-scene="home">
  <header class="home-header">
    <h1 class="home-title">Blaire's Kind Heart</h1>
    <div class="heart-counter" data-hearts-total aria-label="Total hearts earned">
      <span class="heart-icon" aria-hidden="true">&#x1F49C;</span>
      <span data-hearts data-hearts-count aria-live="polite">0</span>
    </div>
  </header>

  <nav class="home-grid" aria-label="Main features">
    <button class="home-btn home-btn--tracker" data-panel-open="panel-tracker"
            data-home-btn aria-label="Kind Acts Tracker">
      <img class="home-btn-img" src="illustrations/buttons/btn-kind-acts.webp"
           alt="" aria-hidden="true" width="256" height="256" loading="eager">
      <span class="home-btn-label">Kind Acts</span>
    </button>
    <!-- More buttons -->
  </nav>

  <!-- ... -->
</main>
```

### Why This is Excellent

1. **Semantic HTML** — `<main>`, `<header>`, `<nav>` clearly mark structure
2. **ARIA labels** — Describe button purpose to screen readers
3. **aria-hidden** — Decorative emojis hidden from a11y tree
4. **aria-live** — Counter updates announced to screen readers
5. **Image alt text** — Empty alt for decorative images, descriptive where needed

---

## Summary: Key Takeaways

Blaire's Kind Heart exemplifies:

✅ **View Transitions** for smooth navigation
✅ **Scroll-driven animations** for engagement
✅ **sibling-index()** for DRY stagger effects
✅ **color-mix()** for consistent state colors
✅ **content-visibility** for performance
✅ **Playful easing** for delightful UX
✅ **GPU acceleration hints** for smooth 60fps
✅ **Graceful fallbacks** for accessibility
✅ **Semantic HTML** with ARIA
✅ **CSS variables** for maintainability

**These patterns are recommended for any Safari 26.2–exclusive project.**

# CSS Features Quick Reference - DMB Almanac

**Current Status:** 85/100 - Production-ready for Chrome 143+

---

## Already Implemented ✅

### 1. CSS Nesting (Chrome 120+)
**File:** `/src/lib/components/ui/Button.svelte` (lines 73-424)

```css
.button {
  display: inline-flex;
  /* base styles */

  &:hover:not(:disabled) {
    transform: translate3d(0, -1px, 0);
  }

  &.primary {
    background: linear-gradient(to bottom, var(--color-primary-500), var(--color-primary-600));
    color: white;

    &:hover:not(:disabled) {
      background: linear-gradient(to bottom, var(--color-primary-600), var(--color-primary-700));
    }
  }

  @media (prefers-color-scheme: dark) {
    &.primary {
      background: linear-gradient(to bottom, var(--color-primary-500), var(--color-primary-600));
    }
  }
}
```

**Usage Count:** 20+ files throughout codebase

---

### 2. Scroll-Driven Animations (Chrome 115+)
**Files:**
- `/src/app.css` (lines 1152-1180)
- `/src/lib/components/navigation/Header.svelte` (lines 191-206)
- `/src/routes/tours/+page.svelte` (lines 319-356)

```css
@supports (animation-timeline: scroll()) {
  .animate-on-scroll {
    animation: fadeIn linear both;
    animation-timeline: view();
    animation-range: entry 0% entry 100%;
  }

  .header::after {
    opacity: 1;
    animation: scrollProgress linear both;
    animation-timeline: scroll(root);
  }

  @keyframes scrollProgress {
    from { transform: scaleX(0); }
    to { transform: scaleX(1); }
  }
}
```

**Gracefully degrades** in older browsers via @supports

---

### 3. Container Queries (Chrome 105+)
**File:** `/src/lib/components/ui/Card.svelte` (lines 34-35, 241-278)

```css
.card {
  container-type: inline-size;
  container-name: card;
}

@container card (max-width: 280px) {
  .card :global(.title) {
    font-size: var(--text-sm);
  }
}

@container card (min-width: 401px) {
  .card :global(.title) {
    font-size: var(--text-lg);
  }
}

/* Fallback for browsers without container queries */
@supports not (container-type: inline-size) {
  @media (max-width: 320px) {
    .card :global(.title) {
      font-size: var(--text-sm);
    }
  }
}
```

---

### 4. Modern Color Functions
**File:** `/src/app.css` (lines 106-493)

#### light-dark() (Chrome 123+)
```css
:root {
  --background: light-dark(#faf8f3, oklch(0.15 0.008 65));
  --foreground: light-dark(#000000, oklch(0.98 0.003 65));
  --border-color: light-dark(
    oklch(0.92 0.008 65),
    oklch(0.27 0.010 65)
  );
}
```

#### oklch() Color Space (Chrome 111+)
```css
:root {
  --color-primary-50: oklch(0.99 0.015 75);
  --color-primary-500: oklch(0.70 0.20 60);
  --color-primary-600: oklch(0.62 0.20 55);
}
```

#### color-mix() (Chrome 111+)
```css
:root {
  --hover-overlay: color-mix(in oklch, var(--foreground) 4%, transparent);
  --focus-ring: color-mix(in oklch, var(--color-primary-600) 40%, transparent);
}
```

**All have @supports fallbacks** (lines 414-505)

---

### 5. View Transitions API (Chrome 111+)
**File:** `/src/app.css` (lines 1288-1466)

```css
/* Named view transitions */
.view-transition-main {
  view-transition-name: main-content;
}

/* Custom transition types */
@supports (view-transition-type: zoom-in) {
  :root:active-view-transition-type(zoom-in) {
    &::view-transition-old(main-content) {
      animation: view-transition-zoom-out 300ms var(--ease-out-expo) forwards;
    }

    &::view-transition-new(main-content) {
      animation: view-transition-zoom-in 300ms var(--ease-out-expo) forwards;
    }
  }
}

@keyframes view-transition-zoom-out {
  from {
    opacity: 1;
    transform: scale(1);
  }
  to {
    opacity: 0;
    transform: scale(1.1);
  }
}
```

---

### 6. GPU Acceleration (Apple Silicon Optimization)
**File:** `/src/app.css` (lines 989-1057)

```css
.gpu-accelerated {
  transform: translateZ(0);
  backface-visibility: hidden;
  perspective: 1000px;
}

.will-animate {
  will-change: transform, opacity;
}

.transform-gpu {
  transform: translate3d(0, 0, 0);
}

.content-auto {
  content-visibility: auto;
  contain-intrinsic-size: auto 300px;
}
```

**Applied to:** Buttons, Cards, Animations throughout

---

### 7. @supports Feature Detection - 28 Rules
**File:** `/src/app.css`

```css
/* Feature detection for graceful degradation */
@supports not (background: light-dark(white, black)) {
  :root {
    --background: #faf8f3;
  }
}

@supports (animation-timeline: scroll()) {
  .animate-on-scroll {
    animation-timeline: view();
  }
}

@supports (view-transition-type: zoom-in) {
  :root:active-view-transition-type(zoom-in) {
    /* enhanced transitions */
  }
}

@supports (color: AccentColor) {
  :root {
    --system-accent-color: AccentColor;
  }
}
```

---

## Not Yet Adopted ❌

### 1. CSS if() (Chrome 143+)

**When:** Q3 2026 (after 50%+ adoption)

**Use Case Example:**
```css
.button {
  padding: if(
    style(--size: large): 1rem 2rem;
    style(--size: small): 0.25rem 0.5rem;
    0.5rem 1rem
  );

  font-size: if(
    style(--size: large): var(--text-base);
    style(--size: small): var(--text-sm);
    var(--text-sm)
  );
}
```

**Status:** Waiting for browser adoption. Alternative: Use CSS custom properties with fallbacks.

---

### 2. @scope (Chrome 118+)

**When:** Q2 2026

**Current Code (Button.svelte):**
```css
.button {
  display: inline-flex;
}

.button:hover {
  transform: translate3d(0, -1px, 0);
}

.button.primary {
  background: ...;
}

.spinnerIcon {
  animation: spin 0.7s linear infinite;
}
```

**With @scope:**
```css
@scope (.button) {
  :scope {
    display: inline-flex;
  }

  &:hover {
    transform: translate3d(0, -1px, 0);
  }

  &.primary {
    background: ...;
  }

  .spinnerIcon {
    animation: spin 0.7s linear infinite;
  }
}
```

**Benefits:**
- Cleaner scoped styles
- No :global() workarounds needed
- Better component encapsulation

---

### 3. Anchor Positioning (Chrome 125+)

**When:** Q2 2026 (create new Tooltip/Popover components)

**Pattern Example:**
```svelte
<!-- Tooltip Trigger -->
<button
  aria-describedby="tooltip"
  class="trigger"
>
  Hover me
</button>

<!-- Tooltip Content -->
<div id="tooltip" class="tooltip" role="tooltip">
  Helpful text
</div>
```

```css
.trigger {
  anchor-name: --trigger;
}

.tooltip {
  position: absolute;
  position-anchor: --trigger;
  top: anchor(bottom);
  left: anchor(center);
  translate: -50% 0.5rem;

  /* Smart fallback positioning */
  position-try-fallbacks: flip-block;
}

/* Fallback for browsers without anchor positioning */
@supports not (position-anchor: --trigger) {
  .tooltip {
    position: fixed;
    /* JavaScript-based positioning */
  }
}
```

---

## Design Token System

### Color Scales (oklch)
**File:** `/src/app.css:109-143`

```css
/* Primary Colors (Warm Amber/Gold) */
--color-primary-50:  oklch(0.99 0.015 75);    /* Cream */
--color-primary-500: oklch(0.70 0.20 60);     /* Gold */
--color-primary-600: oklch(0.62 0.20 55);     /* CTA Orange */
--color-primary-900: oklch(0.32 0.12 40);     /* Dark Brown */

/* Secondary Colors (Forest Blue-Green) */
--color-secondary-500: oklch(0.52 0.18 190);  /* Teal-Blue */
--color-secondary-900: oklch(0.22 0.10 170);  /* Near Black Blue */

/* Gray Neutrals (Warm Undertone) */
--color-gray-50:  oklch(0.98 0.003 65);       /* Off-white */
--color-gray-500: oklch(0.55 0.013 65);       /* Medium Gray */
--color-gray-900: oklch(0.20 0.008 65);       /* Near Black */
```

### Spacing Scale
```css
--space-0:  0;
--space-1:  0.25rem;  /* 4px */
--space-2:  0.5rem;   /* 8px */
--space-3:  0.75rem;  /* 12px */
--space-4:  1rem;     /* 16px */
--space-6:  1.5rem;   /* 24px */
--space-8:  2rem;     /* 32px */
--space-12: 3rem;     /* 48px */
--space-24: 6rem;     /* 96px */
```

### Motion Tokens
```css
/* Durations */
--motion-instant: 100ms;
--motion-fast:    200ms;
--motion-normal:  300ms;
--motion-slow:    500ms;
--motion-slower:  700ms;

/* Easing */
--ease-out:        cubic-bezier(0, 0, 0.2, 1);
--ease-in:         cubic-bezier(0.4, 0, 1, 1);
--ease-in-out:     cubic-bezier(0.4, 0, 0.2, 1);
--ease-spring:     cubic-bezier(0.34, 1.56, 0.64, 1);
--ease-apple:      cubic-bezier(0.25, 0.1, 0.25, 1);
```

---

## Accessibility Features

### Motion Preferences
```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }

  .animate-fade-in,
  .animate-slide-up,
  .animate-spin {
    animation: none !important;
  }
}
```

### Color Scheme Preference
```css
@media (prefers-color-scheme: dark) {
  :root {
    --background: oklch(0.15 0.008 65);
    --foreground: oklch(0.98 0.003 65);
  }
}
```

### High Contrast Mode
```css
@media (forced-colors: active) {
  .button:focus-visible {
    outline: 2px solid Highlight;
    box-shadow: none;
  }
}
```

### Data Saver Mode
```css
@media (prefers-reduced-data: reduce) {
  .decorative-bg {
    background-image: none !important;
  }
}
```

---

## Performance Optimizations

### Containment
```css
.card {
  contain: content;
}

.button {
  contain: layout style;
}

body {
  contain: layout style;
}
```

### Content Visibility
```css
.off-screen-list-item {
  content-visibility: auto;
  contain-intrinsic-size: auto 100px;
}
```

### ProMotion 120Hz Tuning
```css
:root {
  --transition-fast:   120ms;  /* 10 frames @ 120fps */
  --transition-normal: 180ms;  /* 22 frames @ 120fps */
  --motion-normal:     300ms;  /* 36 frames @ 120fps */
}

/* Adjusted for 120Hz displays */
@supports (animation-timing-function: ease-out-expo) {
  .smooth-transition {
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  }
}
```

---

## Common Patterns

### Loading State (CSS-First)
```svelte
<button data-loading={isLoading}>
  <span class="spinner" aria-hidden="true">⟳</span>
  <span class="content">Click me</span>
</button>

<style>
  button[data-loading='true'] .content {
    opacity: 0;
  }

  button[data-loading='true'] .spinner {
    animation: spin 0.8s linear infinite;
  }
</style>
```

### Conditional Styling (Data Attributes)
```svelte
<div data-interactive={interactive || undefined}>
  <!-- Card content -->
</div>

<style>
  [data-interactive="true"] {
    cursor: pointer;
    transition: transform 250ms var(--ease-spring);
  }

  [data-interactive="true"]:hover {
    transform: translate3d(0, -4px, 0);
  }
</style>
```

### Component Responsiveness (Container Queries)
```svelte
<div class="card">
  <!-- Card content -->
</div>

<style>
  .card {
    container-type: inline-size;
    container-name: card;
  }

  @container card (max-width: 280px) {
    /* Mobile card layout */
  }

  @container card (min-width: 401px) {
    /* Desktop card layout */
  }
</style>
```

---

## Browser Support Summary

| Feature | Chrome | Edge | Firefox | Safari | Status |
|---------|--------|------|---------|--------|--------|
| CSS if() | 143+ | 143+ | ❌ | ❌ | Future Q3 2026 |
| @scope | 118+ | 118+ | ❌ | 18+ | Future Q2 2026 |
| Nesting | 120+ | 120+ | ✅ | 17.2+ | ✅ Active |
| Scroll-Driven | 115+ | 115+ | ❌ | ❌ | ✅ Active (@supports) |
| Anchor Position | 125+ | 125+ | ❌ | ❌ | Future Q2 2026 |
| Container Queries | 105+ | 105+ | ❌ | 16+ | ✅ Active (@supports) |
| light-dark() | 123+ | 123+ | ❌ | 17.4+ | ✅ Active |
| oklch() | 111+ | 111+ | ✅ | 15.1+ | ✅ Active |
| color-mix() | 111+ | 111+ | ✅ | 16+ | ✅ Active |
| View Transitions | 111+ | 111+ | ❌ | ❌ | ✅ Active (@supports) |

---

## Quick Copy-Paste Snippets

### Feature Detection
```javascript
const cssFeatures = {
  cssIf: CSS.supports('width: if(1, 1px, 2px)'),
  cssScope: CSS.supports('@scope (.test) {}'),
  scrollDrivenAnimations: CSS.supports('animation-timeline: scroll()'),
  anchorPositioning: CSS.supports('position-anchor: --anchor'),
  containerQueries: CSS.supports('container-type: inline-size'),
  lightDark: CSS.supports('color: light-dark(white, black)'),
  oklch: CSS.supports('color: oklch(0.5 0.1 0)'),
  colorMix: CSS.supports('color: color-mix(in oklch, red, blue)'),
  viewTransitions: CSS.supports('view-transition-name: test')
};

console.table(cssFeatures);
```

### Responsive Container Query
```css
.component {
  container-type: inline-size;
  container-name: component;
}

@container component (min-width: 400px) {
  .component {
    /* Layout for wide components */
  }
}

@supports not (container-type: inline-size) {
  @media (min-width: 400px) {
    .component {
      /* Media query fallback */
    }
  }
}
```

### Scroll-Driven Animation
```css
@supports (animation-timeline: scroll()) {
  .element {
    animation: fadeIn linear both;
    animation-timeline: view();
    animation-range: entry 0% entry 100%;
  }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

### GPU-Accelerated Transform
```css
.element {
  transform: translate3d(0, 0, 0);
  backface-visibility: hidden;
  will-change: transform;
}

.element:hover {
  transform: translate3d(0, -4px, 0);
  transition: transform 200ms var(--ease-spring);
}
```

---

## Resources

- **MDN Web Docs:** https://developer.mozilla.org/en-US/docs/Web/CSS
- **W3C Specifications:** https://www.w3.org/
- **Chrome Platform Status:** https://chromestatus.com/
- **Can I Use:** https://caniuse.com/
- **CSS Working Group Drafts:** https://drafts.csswg.org/

---

**Last Updated:** January 21, 2026
**Maintainer:** CSS Modern Specialist
**Status:** Production-ready for Chrome 143+

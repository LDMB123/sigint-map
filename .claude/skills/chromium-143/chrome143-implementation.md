---
name: chrome143-implementation
version: 1.0.0
description: **Document Type:** Implementation Roadmap
author: Claude Code
created: 2026-01-25
updated: 2026-01-25

category: chromium-143
complexity: advanced
tags:
  - chromium-143
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

# Migration metadata
migrated_from: projects/dmb-almanac/app/docs/analysis/uncategorized/CHROME143_IMPLEMENTATION_GUIDE.md
migration_date: 2026-01-25
---

# Chrome 143+ CSS Implementation Guide
## DMB Almanac - Quick Start for Developers

**Document Type:** Implementation Roadmap
**Updated:** January 21, 2026
**Status:** Ready for Development

---

## Table of Contents

1. [Container Queries Migration](#container-queries-migration)
2. [CSS clamp() Simplification](#css-clamp-simplification)
3. [Scroll-Driven Animations Expansion](#scroll-driven-animations-expansion)
4. [CSS if() Theme Switching](#css-if-theme-switching)
5. [Anchor Positioning Polish](#anchor-positioning-polish)
6. [Design Token Extraction](#design-token-extraction)

---

## Container Queries Migration

### Why: Components Responsive to Their Container, Not Viewport

### Target Files & Priority

**Priority 1 (High Impact):**
- `/src/lib/components/shows/ShowCard.svelte` (Line 285)
- `/src/lib/components/navigation/Header.svelte` (Lines 217, 292, 401, 513)
- `/src/lib/components/navigation/Footer.svelte` (Lines 168, 180, 186)

**Priority 2 (Medium Impact):**
- `/src/routes/liberation/+page.svelte` (Lines 381-382)
- `/src/routes/songs/[slug]/+page.svelte` (Lines 612-635)
- `/src/routes/shows/[showId]/+page.svelte` (Lines 592-625)

### Implementation: ShowCard Component

**File:** `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/src/lib/components/shows/ShowCard.svelte`

**Current Code (Viewport-Based - Line 285):**
```svelte
<style>
  .compact-card {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3);
  }

  @media (max-width: 768px) {
    .compact-month {
      font-size: 0.625rem;
    }
    .compact-day {
      font-size: 1rem;
    }
  }
</style>
```

**Modified Code (Container-Based):**
```svelte
<style>
  article {
    container-type: inline-size;
    container-name: show-card;
  }

  .compact-card {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3);
  }

  @container show-card (max-width: 400px) {
    .compact-month {
      font-size: 0.625rem;
    }
    .compact-day {
      font-size: 1rem;
    }
  }
</style>
```

**Benefits:**
- Card adapts when container shrinks (sidebar, small columns, modal)
- No viewport-specific breakpoints needed
- Component works in any layout

---

### Implementation: Header Navigation

**File:** `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/src/lib/components/navigation/Header.svelte`

**Current Code (Lines 217, 292, 401, 513):**
```svelte
<style>
  .header {
    display: flex;
    align-items: center;
  }

  @media (min-width: 640px) {
    .nav-menu {
      display: flex;
      gap: var(--space-4);
    }
  }

  @media (min-width: 1024px) {
    .header-logo {
      font-size: var(--text-2xl);
    }
  }
</style>
```

**Modified Code (Container-Based):**
```svelte
<style>
  :global(.header) {
    container-type: inline-size;
    container-name: header;
  }

  .header {
    display: flex;
    align-items: center;
  }

  @container header (min-width: 640px) {
    .nav-menu {
      display: flex;
      gap: var(--space-4);
    }
  }

  @container header (min-width: 1024px) {
    .header-logo {
      font-size: var(--text-2xl);
    }
  }
</style>
```

**Key Changes:**
1. Add `container-type: inline-size` to header
2. Add `container-name: header` for identification
3. Replace `@media (min-width)` with `@container header (min-width)`

---

### Implementation: Footer

**File:** `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/src/lib/components/navigation/Footer.svelte`

**Current Code (Lines 168-189):**
```svelte
<style>
  .footer-grid {
    grid-template-columns: 1fr;
  }

  @media (min-width: 640px) {
    .footer-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (min-width: 1024px) {
    .footer-grid {
      grid-template-columns: 2fr 1fr 1fr 1fr;
    }
  }
</style>
```

**Modified Code (Container-Based):**
```svelte
<style>
  :global(footer) {
    container-type: inline-size;
    container-name: footer;
  }

  .footer-grid {
    grid-template-columns: 1fr;
  }

  @container footer (min-width: 640px) {
    .footer-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @container footer (min-width: 1024px) {
    .footer-grid {
      grid-template-columns: 2fr 1fr 1fr 1fr;
    }
  }
</style>
```

---

## CSS clamp() Simplification

### Why: Replace complex calc() with responsive bounds

### Target Expressions

**Location 1: Header Width Calculation**

**File:** `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/src/lib/components/navigation/Header.svelte` (Line 367)

**Current:**
```css
width: calc(100% - var(--space-6));
```

**Improved:**
```css
width: clamp(300px, 100% - var(--space-6), 1600px);
/* Prevents header from becoming too narrow or wide */
```

---

**Location 2: Scroll Margin Top**

**File:** `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/src/routes/songs/+page.svelte` (Line 284)

**Current:**
```css
scroll-margin-top: calc(var(--header-height, 64px) + 80px);
```

**Improved:**
```css
scroll-margin-top: clamp(
  var(--header-height, 64px),
  var(--header-height) + 80px,
  200px
);
```

---

**Location 3: Animation Delay**

**File:** `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/src/lib/components/navigation/Header.svelte` (Line 566)

**Current:**
```css
animation-delay: calc(var(--stagger-index, 0) * var(--stagger-delay));
```

**Improved:**
```css
animation-delay: clamp(
  0ms,
  calc(var(--stagger-index, 0) * var(--stagger-delay)),
  500ms
);
/* Prevents delays exceeding 500ms */
```

---

### Responsive Font Sizing (App-Wide)

**File:** `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/src/app.css` (Lines 298-307)

**Current:**
```css
:root {
  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.25rem;
  --text-2xl: 1.5rem;
  /* Static sizes - no scaling */
}
```

**Enhanced (Fluid Sizing):**
```css
:root {
  /* Fluid typography: scales between min and max */
  --text-xs: clamp(0.75rem, 0.7rem + 0.5vw, 0.9rem);
  --text-sm: clamp(0.875rem, 0.8rem + 0.75vw, 1rem);
  --text-base: clamp(1rem, 0.95rem + 1vw, 1.1rem);
  --text-lg: clamp(1.125rem, 1rem + 1.25vw, 1.3rem);
  --text-xl: clamp(1.25rem, 1.1rem + 1.5vw, 1.5rem);
  --text-2xl: clamp(1.5rem, 1.3rem + 2vw, 1.9rem);
  --text-3xl: clamp(1.875rem, 1.6rem + 3vw, 2.5rem);
  --text-4xl: clamp(2.25rem, 1.8rem + 4vw, 3.5rem);
  --text-5xl: clamp(3rem, 2.2rem + 5vw, 5rem);

  /* Gap scales with viewport */
  --gap-responsive: clamp(0.5rem, 1vw, 2rem);

  /* Padding scales smoothly */
  --padding-responsive: clamp(1rem, 5vw, 3rem);
}
```

**Benefits:**
- No media query breakpoints needed for font sizes
- Typography scales smoothly on all screen sizes
- Better appearance on ultra-wide displays (4K monitors)
- Less CSS overall

---

## Scroll-Driven Animations Expansion

### Current Foundation (Already Implemented)

**File:** `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/src/app.css` (Lines 1161-1189)

```css
@supports (animation-timeline: scroll()) {
  .animate-on-scroll {
    animation: fadeIn linear both;
    animation-timeline: view();
    animation-range: entry 0% entry 100%;
  }
}
```

### Expansion 1: Hero Parallax Effect

**File:** `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/src/routes/+page.svelte`

**Add to style block:**
```css
@supports (animation-timeline: scroll()) {
  .hero {
    animation: parallax linear;
    animation-timeline: scroll();
    animation-range: entry 0% 50vh;
  }

  @keyframes parallax {
    from {
      transform: translateY(0);
    }
    to {
      transform: translateY(-40px);
    }
  }
}
```

**HTML:**
```svelte
<section class="hero">
  <h1 class="hero-title">DMB Almanac</h1>
  <!-- Moves up slower than scroll = parallax effect -->
</section>
```

---

### Expansion 2: Card Stagger on Scroll

**File:** `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/src/routes/shows/+page.svelte`

**Add to style block:**
```css
@supports (animation-timeline: scroll()) {
  .show-card {
    animation: scrollReveal linear both;
    animation-timeline: view();
    animation-range: entry 0% entry 50%;
    animation-delay: calc(var(--index) * 50ms);
  }

  @keyframes scrollReveal {
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

**HTML:**
```svelte
{#each shows as show, i}
  <div class="show-card" style="--index: {i}">
    <!-- Each card fades in as it enters viewport -->
  </div>
{/each}
```

---

### Expansion 3: Sticky Header Collapse

**File:** `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/src/lib/components/navigation/Header.svelte`

**Add to style block:**
```css
@supports (animation-timeline: scroll()) {
  .header {
    animation: headerShrink linear;
    animation-timeline: scroll();
    animation-range: 0px 150px;
  }

  @keyframes headerShrink {
    from {
      padding-block: var(--space-4);
      font-size: var(--text-xl);
    }
    to {
      padding-block: var(--space-2);
      font-size: var(--text-lg);
    }
  }
}
```

**Effect:** Header shrinks as user scrolls down, expands when scrolling back up.

---

## CSS if() Theme Switching

### Current Implementation

The codebase uses `light-dark()` with `@media (prefers-color-scheme)`.

### Enhanced with CSS if()

**File:** `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/src/app.css`

**Add new variables section (around Line 418):**

```css
/* Chrome 143+ CSS if() conditional styling */
@supports (background: if(supports(color: oklch(0.5 0.1 0)), red, blue)) {
  :root {
    /* Theme mode - can be set via data attribute */
    --theme: light;

    /* Colors based on theme mode using if() */
    --background: if(style(--theme: dark),
      oklch(0.15 0.008 65),
      #faf8f3);

    --foreground: if(style(--theme: dark),
      oklch(0.98 0.003 65),
      #000000);

    --card-bg: if(style(--theme: dark),
      oklch(0.22 0.010 65),
      #ffffff);

    --border-color: if(style(--theme: dark),
      oklch(0.37 0.012 65),
      oklch(0.92 0.008 65));
  }

  /* Theme switcher via data attribute */
  :root[data-theme="dark"] {
    --theme: dark;
  }
}

/* Fallback for browsers without CSS if() */
@supports not (background: if(supports(color: oklch(0.5 0.1 0)), red, blue)) {
  /* Use existing light-dark() fallback */
  :root {
    --background: light-dark(#faf8f3, oklch(0.15 0.008 65));
    --foreground: light-dark(#000000, oklch(0.98 0.003 65));
  }
}
```

**Usage in HTML (Layout component):**

```svelte
<script>
  // Toggle theme
  function toggleTheme() {
    const root = document.documentElement;
    const isDark = root.getAttribute('data-theme') === 'dark';
    root.setAttribute('data-theme', isDark ? 'light' : 'dark');
  }
</script>

<html data-theme="light">
  <!-- Content -->
  <button on:click={toggleTheme}>Toggle Theme</button>
</html>
```

---

## Anchor Positioning Polish

### Current Fallback Infrastructure

The app already has comprehensive anchor positioning with fallbacks (app.css, Lines 1523-1678).

### Enhancement: Tooltip Simplification

**Current (Fallback Mode - No Native Anchor Support):**
```css
.tooltip {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-bottom: var(--space-2);
  opacity: 0;
}
```

**Enhanced (Chrome 125+):**
```css
@supports (anchor-name: --anchor) {
  .tooltip-trigger {
    anchor-name: --trigger;
  }

  .tooltip {
    position: absolute;
    position-anchor: --trigger;
    top: anchor(bottom);
    left: anchor(center);
    translate: -50% 0.5rem;

    /* Automatic fallback positioning */
    position-try-fallbacks: bottom, left, right;

    opacity: 0;
    transition: opacity var(--transition-fast);
  }

  /* Show on hover */
  .tooltip-trigger:hover + .tooltip,
  .tooltip-trigger:focus-visible + .tooltip {
    opacity: 1;
    pointer-events: auto;
  }
}

/* Fallback for older browsers */
@supports not (anchor-name: --anchor) {
  .tooltip {
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    margin-bottom: var(--space-2);
    opacity: 0;
  }
}
```

---

## Design Token Extraction

### Target: Remove Hardcoded Values

### Step 1: Add to app.css

**File:** `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/src/app.css`

**Add after spacing scale (around Line 290):**

```css
/* ==================== LAYOUT DIMENSIONS ==================== */

/* Grid column widths */
--column-checkbox: 50px;
--column-accent: 100px;
--column-date: 180px;

/* Sidebar widths */
--sidebar-sm: 280px;
--sidebar-md: 320px;
--sidebar-lg: 400px;

/* Common card dimensions */
--card-image-aspect: 16 / 9;
--card-icon-size: 40px;

/* Button sizes */
--button-sm-height: 32px;
--button-md-height: 40px;
--button-lg-height: 48px;

/* Icon sizes */
--icon-xs: 16px;
--icon-sm: 20px;
--icon-md: 24px;
--icon-lg: 32px;
--icon-xl: 48px;
```

### Step 2: Replace Hardcoded Values

**File:** `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/src/routes/liberation/+page.svelte`

**Before (Line 253):**
```css
grid-template-columns: 50px 1fr 100px 100px 180px;
```

**After:**
```css
grid-template-columns:
  var(--column-checkbox)
  1fr
  var(--column-accent)
  var(--column-accent)
  var(--column-date);
```

---

**File:** `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/src/routes/songs/[slug]/+page.svelte`

**Before (Line 410):**
```css
grid-template-columns: 1fr 320px;
```

**After:**
```css
grid-template-columns: 1fr var(--sidebar-md);
```

---

## Implementation Checklist

### Phase 1: Quick Wins (2-3 hours)
- [ ] Extract hardcoded pixel values to CSS variables
- [ ] Implement fluid typography with clamp()
- [ ] Test scroll-driven animations on Safari

### Phase 2: Container Queries (4-5 hours)
- [ ] Migrate ShowCard media queries to container queries
- [ ] Migrate Header media queries to container queries
- [ ] Migrate Footer media queries to container queries
- [ ] Update documentation with container query patterns

### Phase 3: Advanced Features (2-3 hours)
- [ ] Implement CSS if() theme switching
- [ ] Expand scroll-driven animations
- [ ] Polish anchor positioning
- [ ] Performance testing on Apple Silicon

### Testing Checklist
- [ ] Test in Chrome 143+ on macOS
- [ ] Verify fallbacks work in Chrome 120-142
- [ ] Test on Safari 17+ (where applicable)
- [ ] Test on Apple Silicon (ProMotion 120Hz)
- [ ] Performance profiling with DevTools
- [ ] Verify 60fps smooth scrolling

---

## Performance Verification

After implementation, check:

```javascript
// Check for animation frame drops
let dropped = 0;
let lastTime = performance.now();

function frame() {
  const now = performance.now();
  const delta = now - lastTime;

  if (delta > 16.7) {  // More than 60fps frame time
    dropped++;
  }
  lastTime = now;
  requestAnimationFrame(frame);
}

// On Apple Silicon with ProMotion, target < 8.3ms per frame (120fps)
```

---

## Related Files to Review

- `/src/app.css` - Global styles
- `/src/lib/styles/scoped-patterns.css` - Component scoping patterns
- `/src/lib/motion/animations.css` - Animation definitions
- `svelte.config.js` - Build configuration

---

## Questions & Support

Refer to:
1. [CSS_MODERNIZATION_AUDIT_CHROME143.md](./CSS_MODERNIZATION_AUDIT_CHROME143.md) - Full audit details
2. MDN Web Docs for each feature
3. Chrome Platform Status for feature tracking

---

**Last Updated:** January 21, 2026
**Implementation Status:** Ready for Development
**Target Release:** Q1 2026

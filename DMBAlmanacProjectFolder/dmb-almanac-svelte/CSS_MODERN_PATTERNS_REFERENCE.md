# Modern CSS Patterns - Implementation Reference

**DMB Almanac Project**
**Chrome 143+ Patterns with Live Examples**

---

## Pattern 1: @scope for Component Isolation

### File Location
`/src/lib/styles/scoped-patterns.css` (Lines 29-92)

### Implementation: Card Component

```css
@scope (.card) to (.card-content) {
  /* :scope refers to .card element */
  :scope {
    display: flex;
    flex-direction: column;
    background: var(--card-bg, #ffffff);
    border: 1px solid var(--card-border, #e5e7eb);
    border-radius: var(--card-radius, 8px);
    box-shadow: var(--card-shadow, 0 1px 3px rgba(0, 0, 0, 0.1));
    overflow: hidden;
    transition: box-shadow 0.2s ease-in-out;
  }

  /* Hover state - scoped only */
  :scope:hover {
    box-shadow: var(--card-shadow-hover, 0 4px 12px rgba(0, 0, 0, 0.15));
  }

  /* Headings inside card */
  h2 {
    margin: 0;
    margin-block-end: 0.5rem;
    color: var(--card-heading-color, #1f2937);
    font-size: 1.25rem;
    font-weight: 600;
  }

  /* Paragraphs - NOT applied inside .card-content */
  p {
    margin: 0;
    margin-block-end: 1rem;
    color: var(--card-text-color, #4b5563);
    line-height: 1.6;
  }

  p:last-child {
    margin-block-end: 0;
  }

  /* Links inside card */
  a {
    color: var(--card-link-color, #0066cc);
    text-decoration: none;
    transition: color 0.15s ease-in-out;
  }

  a:hover {
    color: var(--card-link-hover, #0052a3);
    text-decoration: underline;
  }
}
```

### Key Benefits
- No BEM naming (.card__heading, .card__text) needed
- Style doesn't leak into nested .card-content
- CSS custom properties for easy theming
- Browser support: Chrome 118+

### HTML Usage
```html
<div class="card">
  <h2>Card Title</h2>
  <p>Card description text</p>
  <div class="card-content">
    <!-- Styles above don't apply here -->
    <p>Nested content with different styling</p>
  </div>
</div>
```

---

## Pattern 2: Container Queries for Responsive Components

### File Location
`/src/app.css` (Lines 2027-2070)

### Implementation: D3 Visualizations

```css
.visualization-container {
  container-type: inline-size;
  container-name: visualization;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--background);
  border-radius: var(--radius-lg);
  overflow: hidden;
  contain: layout style paint;
  content-visibility: auto;
}

/* Example: Transition Flow (Sankey Diagram) */
.transition-flow {
  container-type: inline-size;
  container-name: transition-flow;
}

/* Mobile: Smaller text */
@container transition-flow (width < 400px) {
  :global(.sankey-diagram text) {
    font-size: 9px;
  }
}

/* Tablet: Readable text */
@container transition-flow (width >= 400px) and (width < 800px) {
  :global(.sankey-diagram text) {
    font-size: 11px;
  }
}

/* Desktop: Detailed labels */
@container transition-flow (width >= 800px) {
  :global(.sankey-diagram text) {
    font-size: 12px;
  }
}

/* Style-based container queries */
@container style(--theme: dark) {
  .visualization {
    background: var(--color-gray-900);
    color: var(--color-gray-50);
  }
}

/* Combined size + style conditions */
@container transition-flow (width >= 800px) and style(--featured: true) {
  :global(.sankey-diagram) {
    filter: drop-shadow(0 0 10px var(--glow-primary));
  }
}
```

### Key Benefits
- Responsive at component level (not viewport)
- No JavaScript resize listeners
- Works with D3 dynamic sizing
- Browser support: Chrome 105+

### Usage in D3 Component
```javascript
// In GapTimeline.svelte
<div class="gap-timeline" bind:clientWidth>
  <svg bind:this={svgElement} width={clientWidth} />
</div>
```

---

## Pattern 3: Scroll-Driven Animations

### File Location
`/src/lib/motion/scroll-animations.css` (600+ lines)

### Implementation: Progress Bar

```css
@supports (animation-timeline: scroll()) {
  /* Fixed progress bar tied to document scroll */
  .scroll-progress-bar {
    position: fixed;
    top: 0;
    left: 0;
    right: auto;
    bottom: auto;
    width: 100%;
    height: 4px;
    max-height: 4px;
    background: var(--color-primary-600);
    transform-origin: left;
    z-index: var(--z-sticky);

    /* Tied to document scroll position */
    animation: scrollProgress linear both;
    animation-timeline: scroll(root block);
    will-change: transform;
  }

  @keyframes scrollProgress {
    from { transform: scaleX(0); }
    to { transform: scaleX(1); }
  }

  /* Fade + slide on scroll */
  .scroll-slide-up {
    animation: scrollSlideUp linear both;
    animation-timeline: view();
    animation-range: entry 0% cover 50%;
  }

  @keyframes scrollSlideUp {
    from {
      opacity: 0;
      transform: translateY(30px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* Parallax background effect */
  .parallax-slow {
    animation: parallaxSlow linear;
    animation-timeline: scroll(root block);
    animation-range: 0vh 100vh;
    will-change: transform;
  }

  @keyframes parallaxSlow {
    from { transform: translateY(0); }
    to { transform: translateY(-50px); }
  }

  /* Sticky header shrink */
  .sticky-header {
    position: sticky;
    top: 0;
    animation: headerShrink linear both;
    animation-timeline: scroll(root block);
    animation-range: 0 200px;
    z-index: var(--z-sticky);
  }

  @keyframes headerShrink {
    from {
      transform: translateY(0);
      box-shadow: none;
    }
    to {
      transform: translateY(0);
      box-shadow: var(--shadow-md);
    }
  }

  /* Accessibility: Respect user preferences */
  @media (prefers-reduced-motion: reduce) {
    .scroll-progress-bar,
    .scroll-slide-up,
    .parallax-slow,
    .sticky-header {
      animation: none !important;
      transform: none !important;
    }
  }
}

/* Fallback for browsers without scroll-driven animations */
@supports not (animation-timeline: scroll()) {
  .scroll-slide-up {
    opacity: 1;
    transform: translateY(0);
  }
}
```

### Key Benefits
- No JavaScript event listeners
- GPU-accelerated transforms
- Smooth 60fps animations
- Respects reduced-motion preference
- Browser support: Chrome 115+

### HTML Usage
```html
<!-- Progress bar -->
<div class="scroll-progress-bar"></div>

<!-- Content that fades in on scroll -->
<section class="scroll-slide-up">
  <h2>Revealed on scroll</h2>
</section>
```

---

## Pattern 4: CSS if() for Dynamic Styling

### File Location
`/src/lib/styles/scoped-patterns.css` (Lines 735-783)

### Implementation: Compact Mode Toggle

```css
@supports (width: if(style(--x: 1), 10px, 20px)) {
  /* Compact mode card styling using if() */
  @scope (.card) to (.card-content) {
    :scope {
      padding: if(style(--compact-mode: true), 1rem, 1.5rem);
      margin-bottom: if(style(--compact-mode: true), 0.5rem, 1rem);
    }

    h2 {
      font-size: if(style(--compact-mode: true), 1.125rem, 1.25rem);
      margin-block-end: if(style(--compact-mode: true), 0.25rem, 0.5rem);
    }

    p {
      font-size: if(style(--compact-mode: true), 0.875rem, 0.95rem);
      line-height: if(style(--compact-mode: true), 1.4, 1.6);
    }
  }

  /* Dense form layout */
  @scope (form) {
    .form-group {
      gap: if(style(--compact-mode: true), 0.25rem, 0.5rem);
      margin-block-end: if(style(--compact-mode: true), 1rem, 1.5rem);
    }

    label {
      font-size: if(style(--compact-mode: true), 0.875rem, 0.9375rem);
    }

    input,
    textarea,
    select {
      padding: if(style(--compact-mode: true), 0.5rem 0.625rem, 0.625rem 0.75rem);
    }
  }

  /* Navigation density control */
  @scope (nav) {
    a {
      padding: if(style(--compact-mode: true), 0.375rem 0.75rem, 0.5rem 1rem);
      font-size: if(style(--compact-mode: true), 0.875rem, 0.95rem);
    }

    ul, ol {
      gap: if(style(--compact-mode: true), 0.25rem, 0.5rem);
    }
  }
}

/* Fallback for browsers without if() */
@supports not (width: if(style(--x: 1), 10px, 20px)) {
  /* Use base values */
  .card { padding: 1.5rem; }
  .form { /* base form styles */ }
}
```

### Activation (JavaScript)

```javascript
// Enable compact mode
function enableCompactMode() {
  document.documentElement.style.setProperty('--compact-mode', 'true');
}

// Disable compact mode
function disableCompactMode() {
  document.documentElement.style.setProperty('--compact-mode', '');
}

// Toggle based on preference
const prefers = window.matchMedia('(prefers-reduced-motion: no-preference)');
if (prefers.matches && window.innerWidth < 640) {
  enableCompactMode();
}
```

### Key Benefits
- Single property controls entire layout
- No JavaScript conditional rendering
- System-wide consistency
- Browser support: Chrome 143+

---

## Pattern 5: Modern Media Query Range Syntax

### File Location
`/src/app.css` (Lines 1950-2015)

### Implementation Examples

```css
/* Large screens - modern range syntax */
@media (width >= 1024px) {
  .container { max-width: 1280px; }
  .sidebar { display: block; width: 300px; }
  .grid-auto {
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  }
}

/* Medium screens - range query */
@media (640px <= width < 1024px) {
  .container { padding-inline: var(--space-6); }
  .grid-auto {
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  }
}

/* Small screens - less than */
@media (width < 640px) {
  .sidebar { display: none; }
  .container { padding-inline: var(--space-4); }
  h1 { font-size: var(--text-3xl); }
  h2 { font-size: var(--text-2xl); }
}

/* Orientation comparison */
@media (width > height) {
  /* Landscape mode */
  .landscape-only { display: block; }
}

@media (width < height) {
  /* Portrait mode */
  .portrait-optimized { flex-direction: column; }
}

/* Combined conditions */
@media (400px <= width < 600px) and (height >= 800px) {
  /* Tall mobile phone */
  .mobile-vertical-layout { display: flex; flex-direction: column; }
}
```

### Old vs. New Comparison

```css
/* OLD: min-width/max-width syntax (still works) */
@media (min-width: 1024px) and (max-width: 1279px) { }

/* NEW: Range syntax (clearer intent) */
@media (1024px <= width < 1280px) { }
```

### Key Benefits
- More readable intent
- Cleaner CSS code
- Future CSS standard
- Browser support: Chrome 104+

---

## Pattern 6: CSS Nesting

### File Location
`/src/app.css` (Lines 2409-2441)

### Implementation: Show Card

```css
.show-card {
  background: var(--background);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  transition: all var(--transition-normal) var(--ease-apple);

  /* Nested pseudo-class */
  &:hover {
    box-shadow: var(--shadow-lg);
  }

  /* Nested class modifier */
  &.featured {
    border: 2px solid var(--color-primary-600);
    padding: var(--space-6);
  }

  /* Nested descendant selector */
  & .show-card-title {
    font-size: var(--text-lg);
    font-weight: var(--font-bold);
    margin-block-end: var(--space-2);
  }

  & .show-card-info {
    font-size: var(--text-sm);
    color: var(--foreground-secondary);
  }

  /* Nested media query */
  @media (width < 640px) {
    padding: var(--space-3);

    & .show-card-title {
      font-size: var(--text-base);
    }

    & .show-card-info {
      font-size: var(--text-xs);
    }
  }
}
```

### Old Approach (with Sass)

```scss
// BEFORE: Need Sass preprocessor
.show-card {
  @media (width < 640px) {
    & {
      padding: var(--space-3);
    }

    .show-card-title {
      font-size: var(--text-base);
    }
  }
}
```

### Key Benefits
- No Sass/LESS preprocessor needed
- Native browser support
- Smaller CSS files
- Cleaner, more maintainable code
- Browser support: Chrome 120+

---

## Pattern 7: light-dark() for Theme Support

### File Location
`/src/app.css` (Lines 239-260)

### Implementation: Design Tokens

```css
:root {
  /* Automatic light/dark theme switching */
  --background: light-dark(#faf8f3, oklch(0.15 0.008 65));
  --foreground: light-dark(#000000, oklch(0.98 0.003 65));

  /* Glassmorphism with theme awareness */
  --glass-bg: light-dark(
    oklch(1 0 0 / 0.7),           /* Light: white glass */
    oklch(0.18 0.01 65 / 0.7)     /* Dark: dark glass */
  );

  /* Colors adapt to theme */
  --color-primary-600: light-dark(
    oklch(0.62 0.20 55),          /* Light: warm orange */
    oklch(0.75 0.22 55)           /* Dark: brighter orange */
  );

  /* Semantic colors */
  --color-success: light-dark(
    oklch(0.55 0.18 145),         /* Light: forest green */
    oklch(0.65 0.16 145)          /* Dark: bright green */
  );

  --color-error: light-dark(
    oklch(0.55 0.20 25),          /* Light: warm rust */
    oklch(0.65 0.22 25)           /* Dark: bright red */
  );

  /* Shadows adapt */
  --shadow-md: light-dark(
    0 4px 6px -1px rgb(0 0 0 / 0.08),
    0 4px 8px -1px rgb(0 0 0 / 0.3)
  );
}

/* Fallback for browsers without light-dark() */
@supports not (background: light-dark(white, black)) {
  :root {
    --background: #faf8f3;
    --foreground: #000000;
  }

  @media (prefers-color-scheme: dark) {
    :root {
      --background: #1a1410;
      --foreground: #faf8f3;
    }
  }
}
```

### Key Benefits
- Single value for both light/dark themes
- Follows system preferences automatically
- Cleaner code than @media (prefers-color-scheme)
- Browser support: Chrome 122+

---

## Pattern 8: color-mix() for Dynamic Colors

### File Location
`/src/app.css` (Lines 253-260)

### Implementation: Interactive States

```css
:root {
  /* Dynamic color mixing for interactive states */
  --hover-overlay: color-mix(in oklch, var(--foreground) 4%, transparent);
  --active-overlay: color-mix(in oklch, var(--foreground) 8%, transparent);

  /* Focus ring with transparency mixing */
  --focus-ring: color-mix(
    in oklch,
    var(--color-primary-600) 40%,
    transparent
  );

  /* Primary button hover state */
  --primary-hover: color-mix(
    in oklch,
    var(--color-primary-600) 90%,
    var(--color-primary-700)
  );

  --primary-active: color-mix(
    in oklch,
    var(--color-primary-700) 80%,
    var(--color-primary-800)
  );
}

/* Dark mode slot colors using color-mix */
@media (prefers-color-scheme: dark) {
  :root {
    --color-opener-bg: color-mix(
      in oklch,
      var(--color-opener) 20%,
      transparent
    );

    --color-closer-bg: color-mix(
      in oklch,
      var(--color-closer) 20%,
      transparent
    );

    --color-encore-bg: color-mix(
      in oklch,
      var(--color-encore) 20%,
      transparent
    );
  }
}
```

### Usage in Components

```css
button {
  background: var(--color-primary-600);
  color: white;
  transition: all 0.15s;
}

button:hover {
  background: var(--primary-hover);
  box-shadow: 0 0 0 2px var(--focus-ring);
}

button:active {
  background: var(--primary-active);
}

button:focus-visible {
  outline: 2px solid var(--focus-ring-strong);
  outline-offset: 2px;
}
```

### Key Benefits
- Perceptually uniform color adjustments
- Better accessibility (color-mix is perceptual)
- Works with any color system (oklch, srgb, etc.)
- Browser support: Chrome 111+

---

## Browser Support Reference

### Progressive Enhancement Template

```css
/* Feature with full fallback */
@supports (feature: value) {
  /* Modern implementation */
  selector {
    property: modern-value;
  }
}

@supports not (feature: value) {
  /* Fallback implementation */
  selector {
    property: fallback-value;
  }
}
```

### Full Support Matrix

| Feature | Chrome | Safari | Firefox | Status |
|---------|--------|--------|---------|--------|
| CSS if() | 143+ | No | No | Fallback provided |
| @scope | 118+ | 18+ | 110+ | Widely supported |
| Container Queries | 105+ | 16+ | 110+ | Widely supported |
| Scroll Animations | 115+ | 16.4+ | 113+ | Widely supported |
| CSS Nesting | 120+ | 17.5+ | 117+ | Widely supported |
| Anchor Positioning | 125+ | No | No | Fallback provided |
| light-dark() | 122+ | 17.1+ | No | Fallback provided |
| color-mix() | 111+ | 16.1+ | 113+ | Widely supported |

---

## Best Practices Summary

### 1. Always Provide Fallbacks
```css
@supports (feature: value) { /* modern */ }
@supports not (feature: value) { /* fallback */ }
```

### 2. Use CSS Custom Properties
```css
:root {
  --spacing: 1rem;
  --primary-color: oklch(0.62 0.20 55);
}
```

### 3. Design Tokens Over Magic Numbers
```css
/* Good */
padding: var(--space-4);

/* Bad */
padding: 16px;
```

### 4. GPU-Accelerate Animations
```css
animation: slidein 0.3s;

@keyframes slidein {
  from { transform: translateY(20px); }
  to { transform: translateY(0); }
}
```

### 5. Respect Accessibility Preferences
```css
@media (prefers-reduced-motion: reduce) {
  * { animation: none !important; }
}
```

---

**Reference Document Complete**
Generated: January 24, 2026

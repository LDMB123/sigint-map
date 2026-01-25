# DMB Almanac - CSS Implementation Examples
## Chrome 143+ Patterns & Best Practices

---

## Table of Contents
1. [Design Tokens](#design-tokens)
2. [Modern Media Queries](#modern-media-queries)
3. [Container Queries](#container-queries)
4. [Scroll-Driven Animations](#scroll-driven-animations)
5. [CSS Nesting](#css-nesting)
6. [@scope Rules](#scope-rules)
7. [View Transitions](#view-transitions)
8. [CSS if()](#css-if)
9. [Anchor Positioning](#anchor-positioning)
10. [Popover API](#popover-api)
11. [GPU Optimization](#gpu-optimization)
12. [Accessibility Patterns](#accessibility-patterns)

---

## Design Tokens

### CSS Variables for Theming

```css
/* Color system using oklch() */
:root {
  /* Primary color scale */
  --color-primary-50: oklch(0.99 0.015 75);    /* Cream */
  --color-primary-100: oklch(0.97 0.04 78);    /* Light beige */
  --color-primary-500: oklch(0.70 0.20 60);    /* Golden amber */
  --color-primary-900: oklch(0.32 0.12 40);    /* Dark brown */

  /* Dark mode colors */
  --foreground: light-dark(#000000, #faf8f3);
  --background: light-dark(#faf8f3, #1a1410);

  /* Dynamic color mixing */
  --hover-overlay: color-mix(in oklch, var(--foreground) 4%, transparent);
  --active-overlay: color-mix(in oklch, var(--foreground) 8%, transparent);

  /* Spacing scale */
  --space-0: 0;
  --space-1: 0.25rem;  /* 4px */
  --space-2: 0.5rem;   /* 8px */
  --space-4: 1rem;     /* 16px */
  --space-6: 1.5rem;   /* 24px */

  /* Motion tokens */
  --transition-fast: 120ms cubic-bezier(0.2, 0, 0, 1);
  --transition-normal: 180ms cubic-bezier(0.2, 0, 0, 1);
  --ease-apple: cubic-bezier(0.25, 0.1, 0.25, 1);

  /* Shadows with elevation */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.04);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.08);
}

/* Fallback for browsers without light-dark() */
@supports not (background: light-dark(white, black)) {
  :root {
    --foreground: #000000;
    --background: #faf8f3;
  }

  @media (prefers-color-scheme: dark) {
    :root {
      --foreground: #faf8f3;
      --background: #1a1410;
    }
  }
}
```

### Usage in Components

```svelte
<script>
  let { variant = 'primary' } = $props();
</script>

<button class="button {variant}">
  Click me
</button>

<style>
  .button {
    padding: var(--space-2) var(--space-4);
    color: var(--foreground);
    background: var(--background);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    transition: all var(--transition-fast) var(--ease-apple);
  }

  .button.primary {
    background: var(--color-primary-600);
    color: white;
  }

  .button:hover {
    background: color-mix(
      in oklch,
      var(--color-primary-600) 110%,
      white
    );
  }
</style>
```

---

## Modern Media Queries

### Range Syntax (Chrome 104+)

```css
/* Old syntax (still works) */
@media (min-width: 768px) { }
@media (max-width: 767px) { }

/* Modern range syntax (Chrome 104+) */
@media (width >= 768px) { }
@media (width < 768px) { }
@media (640px <= width < 1024px) { }

/* Practical example */
@media (width >= 1024px) {
  .container {
    display: grid;
    grid-template-columns: 1fr 300px;
    gap: var(--space-6);
  }
}

@media (640px <= width < 1024px) {
  .container {
    display: grid;
    grid-template-columns: 1fr;
  }
}

@media (width < 640px) {
  .container {
    display: flex;
    flex-direction: column;
  }
}

/* Orientation-based */
@media (height > width) {
  /* Portrait */
  .landscape-only { display: none; }
}

@media (width > height) {
  /* Landscape */
  .portrait-only { display: none; }
}
```

---

## Container Queries

### Size-Based Container Queries (Chrome 105+)

```css
/* Define container */
.card-container {
  container-type: inline-size;
  container-name: card;
}

/* Query container size */
@container card (width >= 400px) {
  .card {
    display: grid;
    grid-template-columns: 200px 1fr;
    gap: var(--space-4);
  }

  .card-image {
    width: 200px;
    height: 200px;
  }
}

@container card (width < 400px) {
  .card {
    display: flex;
    flex-direction: column;
  }

  .card-image {
    width: 100%;
    aspect-ratio: 16/9;
  }
}
```

### Style-Based Container Queries (Chrome 111+)

```css
/* Query custom property values */
@container style(--theme: dark) {
  .card {
    background: var(--color-gray-900);
    color: var(--color-gray-50);
  }
}

@container style(--layout: featured) {
  .card {
    border: 2px solid var(--color-primary-600);
    padding: var(--space-6);
  }
}

/* Combined conditions */
@container card (width >= 500px) and style(--featured: true) {
  .card {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-6);
  }
}
```

### Usage in Svelte

```svelte
<script>
  let { featured = false } = $props();
</script>

<div
  class="card-container"
  style="--featured: {featured ? 'true' : 'false'}"
>
  <article class="card">
    <!-- Content -->
  </article>
</div>

<style>
  .card-container {
    container-type: inline-size;
    container-name: card;
  }

  @container card (width >= 400px) {
    .card {
      display: grid;
      grid-template-columns: 200px 1fr;
    }
  }

  @container style(--featured: true) {
    .card {
      border: 2px solid var(--color-primary-600);
    }
  }
</style>
```

---

## Scroll-Driven Animations

### Basic Scroll Progress Bar

```css
@supports (animation-timeline: scroll()) {
  .scroll-progress-bar {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 4px;
    background: var(--color-primary-600);
    transform-origin: left;

    /* Tied to document scroll */
    animation: scrollProgress linear;
    animation-timeline: scroll(root block);
    will-change: transform;
  }

  @keyframes scrollProgress {
    from {
      transform: scaleX(0);
    }
    to {
      transform: scaleX(1);
    }
  }
}
```

### View-Based Fade-In on Scroll

```css
@supports (animation-timeline: view()) {
  .reveal-on-scroll {
    animation: reveal linear both;
    animation-timeline: view();
    animation-range: entry 0% cover 50%;
  }

  @keyframes reveal {
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

/* Fallback for older browsers */
@supports not (animation-timeline: view()) {
  .reveal-on-scroll {
    animation: revealFallback 0.6s ease-out forwards;
    opacity: 0;
  }

  @keyframes revealFallback {
    to {
      opacity: 1;
    }
  }
}
```

### Parallax Effect

```css
@supports (animation-timeline: scroll()) {
  .parallax-bg {
    animation: parallax linear;
    animation-timeline: scroll(root block);
    animation-range: 0vh 100vh;
    will-change: transform;
  }

  @keyframes parallax {
    from {
      transform: translateY(0);
    }
    to {
      transform: translateY(-50px);
    }
  }
}
```

### Staggered List Animation

```css
@supports (animation-timeline: view()) {
  .list-item {
    animation: itemReveal linear both;
    animation-timeline: view();
    animation-range: entry 0% cover 40%;
  }

  .list-item:nth-child(1) {
    animation-delay: 0ms;
  }

  .list-item:nth-child(2) {
    animation-delay: 50ms;
  }

  .list-item:nth-child(3) {
    animation-delay: 100ms;
  }

  /* More items... */

  @keyframes itemReveal {
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

## CSS Nesting

### Button with Variants and States

```css
.button {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  font-weight: var(--font-medium);
  border-radius: var(--radius-lg);
  cursor: pointer;
  border: 1px solid transparent;
  transition: all var(--transition-fast);

  /* Hover state */
  &:hover:not(:disabled) {
    transform: translate3d(0, -1px, 0);
  }

  /* Active state */
  &:active:not(:disabled) {
    transform: translate3d(0, 1px, 0);
  }

  /* Disabled state */
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
  }

  /* Primary variant */
  &.primary {
    background: linear-gradient(
      to bottom,
      var(--color-primary-500),
      var(--color-primary-600)
    );
    color: white;

    &:hover:not(:disabled) {
      background: linear-gradient(
        to bottom,
        var(--color-primary-600),
        var(--color-primary-700)
      );
    }
  }

  /* Secondary variant */
  &.secondary {
    background: var(--color-gray-100);
    color: var(--color-gray-700);

    &:hover:not(:disabled) {
      background: var(--color-gray-200);
    }
  }

  /* Loading state */
  &[data-loading="true"] {
    pointer-events: none;

    & .content {
      opacity: 0;
    }
  }

  /* Responsive */
  @media (width < 640px) {
    padding: var(--space-1) var(--space-3);
    font-size: var(--text-sm);
  }

  /* Dark mode */
  @media (prefers-color-scheme: dark) {
    &.secondary {
      background: var(--color-gray-800);
      color: var(--color-gray-100);
    }
  }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    transition: none;

    &:hover:not(:disabled),
    &:active:not(:disabled) {
      transform: none;
    }
  }
}
```

---

## @scope Rules

### Card Component Isolation

```css
@scope (.card) to (.card-content) {
  /* :scope refers to .card element */
  :scope {
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-sm);
    overflow: hidden;
    transition: box-shadow var(--transition-normal);
  }

  :scope:hover {
    box-shadow: var(--shadow-lg);
  }

  /* Styles inside .card but NOT inside .card-content */
  h2, h3 {
    margin: 0;
    margin-block-end: 0.5rem;
    color: var(--foreground);
  }

  h2 {
    font-size: var(--text-xl);
    font-weight: var(--font-bold);
  }

  /* Paragraphs - won't affect ones inside .card-content */
  p {
    margin: 0;
    margin-block-end: 1rem;
    color: var(--foreground-secondary);
  }

  p:last-child {
    margin-block-end: 0;
  }

  /* Links inside card */
  a {
    color: var(--color-primary-600);
    text-decoration: none;
    transition: color var(--transition-fast);
  }

  a:hover {
    color: var(--color-primary-700);
    text-decoration: underline;
  }
}
```

### Form Field Isolation

```css
@scope (form) {
  /* Form container */
  :scope {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    padding: var(--space-4);
  }

  /* Field group */
  .form-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  /* Labels */
  label {
    font-weight: var(--font-medium);
    color: var(--foreground);
    display: block;
  }

  /* Required indicator */
  label[aria-required="true"]::after {
    content: " *";
    color: var(--color-error);
  }

  /* Inputs */
  input[type="text"],
  input[type="email"],
  input[type="password"],
  textarea,
  select {
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    font-size: var(--text-base);
    font-family: inherit;
    transition: all var(--transition-fast);
  }

  /* Input focus */
  input:focus-visible,
  textarea:focus-visible,
  select:focus-visible {
    outline: 2px solid var(--color-primary-600);
    outline-offset: 2px;
    border-color: var(--color-primary-600);
  }

  /* Input error state */
  input[aria-invalid="true"],
  textarea[aria-invalid="true"] {
    border-color: var(--color-error);
    background-color: var(--color-error-bg);
  }

  /* Error message */
  .form-error {
    font-size: var(--text-sm);
    color: var(--color-error);
    margin-block-start: var(--space-1);
    font-weight: var(--font-medium);
  }

  /* Submit button */
  button[type="submit"] {
    padding: var(--space-2) var(--space-6);
    background: var(--color-primary-600);
    color: white;
    border: none;
    border-radius: var(--radius-md);
    cursor: pointer;
    font-weight: var(--font-semibold);
    transition: all var(--transition-fast);
  }

  button[type="submit"]:hover {
    background: var(--color-primary-700);
  }
}
```

---

## View Transitions

### Basic Page Transition

```svelte
<script>
  import { enhance } from '$app/forms';
  import { beforeNavigate, afterNavigate } from '$app/navigation';

  function handleNavigation(event) {
    if (!document.startViewTransition) return;

    const transition = document.startViewTransition(() => {
      event.target.click();
    });
  }
</script>

<a href="/page" on:click={handleNavigation}>
  Navigate
</a>
```

### Styled Transitions

```css
/* Define transition names on elements */
.view-transition-main {
  view-transition-name: main-content;
}

.view-transition-header {
  view-transition-name: header;
}

/* Default cross-fade */
::view-transition-old(root),
::view-transition-new(root) {
  animation-duration: 200ms;
  animation-timing-function: var(--ease-apple);
}

/* Main content with scale effect */
::view-transition-old(main-content) {
  animation: viewTransitionFadeOut 200ms var(--ease-apple),
             viewTransitionScaleDown 200ms var(--ease-apple);
}

::view-transition-new(main-content) {
  animation: viewTransitionFadeIn 200ms var(--ease-apple),
             viewTransitionScaleUp 200ms var(--ease-apple);
}

/* Header with subtle slide */
::view-transition-old(header),
::view-transition-new(header) {
  animation-duration: 150ms;
  animation-timing-function: var(--ease-apple);
}

@keyframes viewTransitionFadeOut {
  from { opacity: 1; }
  to { opacity: 0; }
}

@keyframes viewTransitionFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes viewTransitionScaleDown {
  from { transform: scale(1); }
  to { transform: scale(0.95); }
}

@keyframes viewTransitionScaleUp {
  from { transform: scale(0.95); }
  to { transform: scale(1); }
}

/* Respect reduced motion */
@media (prefers-reduced-motion: reduce) {
  ::view-transition-old(*),
  ::view-transition-new(*) {
    animation-duration: 0.01ms !important;
  }
}
```

---

## CSS if()

### Conditional Button Sizing

```css
/* Chrome 143+ */
@supports (width: if(style(--x: 1), 10px, 20px)) {
  .button {
    /* Compact mode padding */
    padding: if(style(--compact-mode: true), 0.5rem 0.875rem, 0.75rem 1.25rem);
    font-size: if(style(--compact-mode: true), 0.875rem, 1rem);
    height: if(style(--compact-mode: true), 32px, 40px);
  }

  .card {
    /* Conditional padding */
    padding: if(style(--compact-mode: true), var(--space-3), var(--space-4));
    margin-bottom: if(style(--compact-mode: true), var(--space-2), var(--space-4));
  }

  h1 {
    /* Conditional font size */
    font-size: if(style(--compact-mode: true), 1.875rem, 2.25rem);
  }

  /* Multi-value conditional */
  .spacer {
    height: if(
      style(--size: large): 3rem;
      style(--size: small): 1rem;
      1.5rem
    );
  }
}

/* Fallback for older browsers */
@supports not (width: if(style(--x: 1), 10px, 20px)) {
  .button {
    padding: 0.75rem 1.25rem;
    font-size: 1rem;
  }
}
```

### Usage in Component

```svelte
<script>
  let compact = $state(false);
</script>

<div style="--compact-mode: {compact ? 'true' : 'false'}">
  <button class="button">
    {compact ? 'Compact' : 'Normal'} Button
  </button>

  <button on:click={() => (compact = !compact)}>
    Toggle Mode
  </button>
</div>

<style>
  div {
    --compact-mode: false;
  }

  @supports (width: if(style(--x: 1), 10px, 20px)) {
    .button {
      padding: if(style(--compact-mode: true), 0.5rem 0.875rem, 0.75rem 1.25rem);
    }
  }
</style>
```

---

## Anchor Positioning

### Tooltip with Anchor API (Chrome 125+)

```css
/* Define anchor */
.tooltip-trigger {
  anchor-name: --trigger;
}

/* Position tooltip to anchor */
.tooltip {
  position: absolute;
  position-anchor: --trigger;
  top: anchor(bottom);
  left: anchor(center);
  translate: -50% 0.5rem;

  /* Fallback positions if no space */
  position-try-fallbacks: bottom, top, left, right;

  padding: var(--space-2) var(--space-3);
  background: var(--color-gray-900);
  color: var(--color-gray-50);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  box-shadow: var(--shadow-lg);
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity var(--transition-fast);
  z-index: var(--z-tooltip);
}

/* Show tooltip on hover */
.tooltip-trigger:hover + .tooltip {
  opacity: 1;
}

/* Fallback for browsers without anchor positioning */
@supports not (anchor-name: --test) {
  .tooltip {
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    margin-top: var(--space-2);
  }
}
```

### Dropdown Menu with Anchor

```css
.dropdown-trigger {
  anchor-name: --menu;
}

.dropdown-menu {
  position: absolute;
  position-anchor: --menu;
  top: anchor(bottom);
  left: anchor(left);
  width: max(200px, anchor-size(width));

  /* Automatic fallback to top if no space below */
  position-try-fallbacks: top;

  background: var(--background);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  margin-top: var(--space-2);
  z-index: var(--z-dropdown);
}
```

---

## Popover API

### Native Tooltip with Popover (Chrome 114+)

```svelte
<script>
  let id = Math.random().toString(36);
  let isSupported = typeof HTMLElement.prototype.popover !== 'undefined';
</script>

<!-- Trigger -->
<button
  popovertarget={isSupported ? id : undefined}
  popovertargetaction="toggle"
>
  Show Tooltip
</button>

<!-- Popover -->
{#if isSupported}
  <div {id} popover="hint">
    This is a tooltip
  </div>
{:else}
  <!-- Fallback for older browsers -->
  <div class="tooltip-fallback" style="display: none;">
    This is a tooltip
  </div>
{/if}

<style>
  [popover] {
    position: fixed;
    padding: var(--space-2) var(--space-3);
    background: var(--color-gray-900);
    color: var(--color-gray-50);
    border-radius: var(--radius-md);
    border: none;
    box-shadow: var(--shadow-lg);
    font-size: var(--text-sm);

    opacity: 0;
    transform: scale(0.95) translateY(-4px);
    transition: opacity 150ms, transform 150ms, display 150ms allow-discrete;
  }

  [popover]:popover-open {
    opacity: 1;
    transform: scale(1) translateY(0);
  }

  @starting-style {
    [popover]:popover-open {
      opacity: 0;
      transform: scale(0.95) translateY(-4px);
    }
  }

  [popover]::backdrop {
    background: transparent;
  }

  /* Fallback styling */
  .tooltip-fallback {
    position: absolute;
    padding: var(--space-2) var(--space-3);
    background: var(--color-gray-900);
    color: var(--color-gray-50);
    border-radius: var(--radius-md);
    z-index: var(--z-tooltip);
  }

  @media (prefers-reduced-motion: reduce) {
    [popover] {
      transition: none;
    }
  }
</style>
```

---

## GPU Optimization

### Transform-Only Animations

```css
/* GOOD: GPU-accelerated - uses transform only */
.button:hover {
  transform: translate3d(0, -1px, 0);
  transition: transform var(--transition-fast);
}

/* AVOID: Layout-triggering - slower */
.button:hover {
  margin-top: -1px;
  transition: margin-top var(--transition-fast);
}

/* GOOD: GPU-accelerated - uses opacity only */
.fade-in {
  opacity: 0;
  animation: fadeIn 0.3s forwards;
}

@keyframes fadeIn {
  to { opacity: 1; }
}

/* AVOID: Paint-triggering - slower */
.fade-in {
  background-color: transparent;
  animation: fadeInBg 0.3s forwards;
}

@keyframes fadeInBg {
  to { background-color: white; }
}

/* GPU acceleration hints */
.gpu-accelerated {
  transform: translateZ(0);           /* Force layer creation */
  backface-visibility: hidden;         /* Hide back face */
  will-change: transform, opacity;     /* Hint to browser */
}

/* Scaler progress bar - GPU-friendly */
.progress-bar {
  transform-origin: left;

  &.progress-75 {
    transform: scaleX(0.75);           /* Efficient scale */
  }

  /* AVOID: */
  &.progress-75 {
    width: 75%;                        /* Triggers layout */
  }
}
```

---

## Accessibility Patterns

### Keyboard Navigation

```css
/* Focus visible styles */
.button:focus-visible {
  outline: 2px solid var(--color-primary-600);
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}

/* High contrast mode */
@media (forced-colors: active) {
  .button:focus-visible {
    outline: 2px solid Highlight;
    outline-offset: 2px;
  }

  .button {
    border: 2px solid CanvasText;
  }
}

/* Skip link for keyboard users */
.skip-link {
  position: absolute;
  top: -100px;
  left: 50%;
  transform: translateX(-50%);
  padding: var(--space-2) var(--space-4);
  background: var(--color-primary-600);
  color: white;
  border-radius: var(--radius-md);
  text-decoration: none;
  font-weight: 600;
  z-index: 9999;
}

.skip-link:focus {
  top: var(--space-2);
  outline: 2px solid white;
  outline-offset: 2px;
}
```

### Motion Preferences

```css
/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }

  .button:hover {
    transform: none;
  }

  .animated-element {
    animation: none;
  }
}

/* Reduced transparency for accessibility */
@media (prefers-reduced-transparency: reduce) {
  .glass-panel {
    background: var(--background);
    backdrop-filter: none;
  }
}
```

### Color Contrast

```css
/* Semantic color tokens with sufficient contrast */
:root {
  /* Text on light backgrounds */
  --text-on-light: #000000;      /* 21:1 contrast */

  /* Text on dark backgrounds */
  --text-on-dark: #faf8f3;       /* 16:1 contrast */

  /* Links with sufficient contrast */
  --link-color: #0052a3;         /* 4.5:1 on white */
  --link-visited: #663399;       /* 4.5:1 on white */
}

/* Verification in CSS */
.text {
  color: var(--text-on-light);   /* Meets WCAG AA */
}

a {
  color: var(--link-color);      /* Meets WCAG AA */
}

a:visited {
  color: var(--link-visited);    /* Meets WCAG AA */
}
```

---

## Performance Checklist

```css
/* ✅ DO: Use CSS variables */
.component {
  color: var(--foreground);
  padding: var(--space-4);
}

/* ❌ AVOID: Magic numbers */
.component {
  color: #000000;
  padding: 16px;
}

/* ✅ DO: GPU-accelerated animations */
@keyframes slide {
  from { transform: translateX(-100px); }
  to { transform: translateX(0); }
}

/* ❌ AVOID: Layout-triggering animations */
@keyframes slide-bad {
  from { margin-left: -100px; }
  to { margin-left: 0; }
}

/* ✅ DO: Transform-origin for efficient transforms */
.progress-bar {
  transform-origin: left;
  transform: scaleX(var(--progress));
}

/* ✅ DO: will-change for animated elements */
.spinner {
  will-change: transform;
  animation: spin 1s linear infinite;
}

/* ❌ AVOID: will-change on non-animated elements */
.static-element {
  will-change: transform;  /* Unnecessary memory usage */
}

/* ✅ DO: Containment for independent elements */
.card {
  contain: layout style;
}

/* ✅ DO: Content visibility for off-screen content */
.list-item {
  content-visibility: auto;
  contain-intrinsic-size: auto 200px;
}
```

---

## Testing CSS Features

```javascript
// Feature detection
const supportsScrollDrivenAnimations =
  CSS.supports('animation-timeline: scroll()');

const supportsContainerQueries =
  CSS.supports('container-type: inline-size');

const supportsCSSIf =
  CSS.supports('width: if(style(--x: 1), 10px, 20px)');

const supportsAnchorPositioning =
  CSS.supports('anchor-name: --test');

const supportsPopoverAPI =
  document.createElement('div').popover !== undefined;

// Apply fallbacks based on support
if (!supportsScrollDrivenAnimations) {
  // Use JavaScript scroll events for progress bar
}

if (!supportsAnchorPositioning) {
  // Use JavaScript for tooltip positioning
}
```

---

## References

- [MDN: CSS if()](https://developer.mozilla.org/en-US/docs/Web/CSS/if)
- [MDN: @scope](https://developer.mozilla.org/en-US/docs/Web/CSS/@scope)
- [Web.dev: Container Queries](https://web.dev/container-queries/)
- [Web.dev: Scroll-Driven Animations](https://web.dev/scroll-driven-animations/)
- [Web.dev: Anchor Positioning](https://web.dev/anchor-positioning/)
- [MDN: CSS Nesting](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Nesting)

---

*Examples Document v1.0*
*Last Updated: January 22, 2026*

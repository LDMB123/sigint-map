# Chrome 143+ CSS Features: Technical Reference
## Comprehensive Guide for DMB Almanac Svelte

---

## Feature Reference

### 1. CSS if() Function

**Specification:** [CSS Conditional 5](https://drafts.csswg.org/css-conditional-5/#conditional-functions)
**Browser Support:** Chrome 143+
**Fallback:** @supports guard

#### Syntax

```css
/* Basic if() */
property: if(condition, true-value, false-value);

/* Nested if() */
property: if(condition1, value1, if(condition2, value2, default));

/* Multiple conditions */
property: if(
  style(--size: large), large-value,
  style(--size: small), small-value,
  default-value
);

/* Feature-based conditions */
display: if(supports(display: grid), grid, flex);

/* Media query conditions */
width: if(media(width > 768px), 300px, 100%);
```

#### Supported Condition Types

```css
/* Style queries */
if(style(--property: value), ...)

/* Supports queries */
if(supports(property: value), ...)

/* Media queries */
if(media(media-query-list), ...)
```

#### Real-world DMB Example

```css
/* Badge component variants */
.badge {
  padding: if(
    style(--badge-size: sm), 2px 8px,
    style(--badge-size: lg), 5px 14px,
    4px 10px
  );

  font-size: if(
    style(--badge-size: sm), 10px,
    style(--badge-size: lg), var(--text-sm),
    var(--text-xs)
  );

  background: if(
    style(--badge-variant: primary),
    linear-gradient(to bottom, var(--color-primary-100), var(--color-primary-200)),
    if(
      style(--badge-variant: secondary),
      linear-gradient(to bottom, var(--color-secondary-100), var(--color-secondary-200)),
      var(--color-gray-100)
    )
  );
}
```

#### Integration with Svelte

```svelte
<script>
  let { variant = 'default', size = 'md' } = $props();
</script>

<!-- Pass props as CSS custom properties -->
<div style="--badge-variant: {variant}; --badge-size: {size}">
  {@render children?.()}
</div>

<style>
  @supports (background: if(style(--x: y), red, blue)) {
    div {
      background: if(
        style(--badge-variant: primary),
        var(--primary-bg),
        var(--default-bg)
      );
    }
  }

  /* Fallback for Chrome <143 */
  @supports not (background: if(style(--x: y), red, blue)) {
    div {
      background: var(--default-bg);
    }

    div[style*="primary"] {
      background: var(--primary-bg);
    }
  }
</style>
```

#### Performance Considerations

- CSS if() is resolved at parsing time (no runtime cost)
- Each condition is evaluated independently
- Use @supports guard to prevent style application in unsupported browsers
- Nesting if() statements increases specificity complexity

---

### 2. @scope At-Rule

**Specification:** [CSS Scoping 1](https://drafts.csswg.org/css-scoping-1/#scope-atrule)
**Browser Support:** Chrome 118+ (available now!)
**Use Case:** Explicit style scoping without Shadow DOM

#### Syntax

```css
/* Basic scope */
@scope (.element) {
  /* Styles only apply within .element */
  p { color: blue; }
}

/* Explicit scope root */
@scope (.element) {
  :scope { /* applies to .element directly */ }
}

/* Donut scope - exclude elements */
@scope (.article) to (.comments) {
  /* Applies to .article but NOT to .comments inside it */
  p { line-height: 1.8; }
}

/* Nested scope */
@scope (.parent) {
  @scope (.child) {
    /* Scope within scope */
  }
}
```

#### Scoping Rules

```css
/* All three are equivalent */

/* 1. Using :scope */
@scope (.container) {
  :scope { padding: 1rem; }
  :scope > .item { margin: 1rem; }
}

/* 2. Without :scope (implicit) */
@scope (.container) {
  padding: 1rem;
  & > .item { margin: 1rem; }
}

/* 3. Using selector (outer scope) */
.container {
  padding: 1rem;
  & > .item { margin: 1rem; }
}
```

#### Donut Scope Pattern

```css
/* Prevent styles from leaking into nested components */
@scope (.card) to (.card-content) {
  /* Styles apply to .card but NOT .card-content */
  p {
    margin: 0;
    color: inherit;
  }

  h2 {
    font-size: 1.5rem;
  }
}

/* Useful for complex component hierarchies */
@scope (.modal) to (.modal-dialog) {
  /* These rules apply everywhere except inside .modal-dialog */
  a { color: var(--modal-link-color); }
}
```

#### DMB Example: Button Component

```svelte
<!-- Button with nested elements -->
<button class="button">
  <span class="spinner">⏳</span>
  <span class="content">Click me</span>
</button>

<style>
  @scope (.button) {
    /* Styles only apply inside .button */
    :scope {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-2) var(--space-4);
    }

    /* Donut scope: exclude .content from text-shadow */
    @scope (.button) to (.content) {
      text-shadow: 0 1px 1px rgb(0 0 0 / 0.05);
    }

    /* Nested elements */
    .spinner {
      position: absolute;
      animation: spin 0.7s linear infinite;
    }

    .content {
      flex: 1;
      text-align: center;
    }
  }
</style>
```

---

### 3. CSS Nesting

**Specification:** [CSS Nesting 1](https://drafts.csswg.org/css-nesting-1/)
**Browser Support:** Chrome 120+
**Benefit:** Cleaner, more maintainable CSS

#### Syntax

```css
/* Basic nesting with & */
.button {
  color: blue;
  &:hover { color: darkblue; }
  &:active { color: navy; }
}

/* Nested pseudo-elements */
.button {
  &::before { content: '▼'; }
  &::after { content: ''; position: absolute; }
}

/* Nested classes */
.button {
  &.primary { background: blue; }
  &.secondary { background: gray; }
}

/* Complex selectors */
.button {
  & > .icon { width: 20px; }
  & + .label { margin-left: 8px; }
  &[disabled] { opacity: 0.5; }
}

/* Media queries inside nesting */
.button {
  padding: 1rem;

  @media (max-width: 768px) {
    padding: 0.5rem;
  }

  @supports (display: grid) {
    display: grid;
  }
}
```

#### Selector Combinations

```css
.button {
  /* Valid & combinations */
  & { } /* just .button */
  &:hover { } /* .button:hover */
  &.active { } /* .button.active */
  &[disabled] { } /* .button[disabled] */
  & > .child { } /* .button > .child */
  & .descendant { } /* .button .descendant */
  &, &.variant { } /* .button, .button.variant */
}
```

#### Nesting Depth

```css
.button {
  color: blue;
  padding: 1rem;

  &:hover {
    color: darkblue;

    & .icon {
      transform: scale(1.2);

      &::before {
        content: '→';
      }
    }
  }
}

/* Equivalent flat CSS */
.button { color: blue; padding: 1rem; }
.button:hover { color: darkblue; }
.button:hover .icon { transform: scale(1.2); }
.button:hover .icon::before { content: '→'; }
```

#### DMB Example: Complete Button

```css
.button {
  /* Base styles */
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  font-weight: var(--font-medium);
  border-radius: var(--radius-lg);
  cursor: pointer;
  border: 1px solid transparent;
  padding: var(--space-2) var(--space-4);
  min-height: var(--touch-target-min);
  transition:
    transform var(--transition-fast) var(--ease-apple),
    background-color var(--transition-fast) var(--ease-smooth);
  transform: translateZ(0);
  backface-visibility: hidden;

  /* Pseudo-classes */
  &:hover:not(:disabled) {
    transform: translate3d(0, -1px, 0);
  }

  &:active:not(:disabled) {
    transform: translate3d(0, 1px, 0);
    transition-duration: var(--duration-instant);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
  }

  &:focus-visible {
    outline: 2px solid var(--color-primary-500);
    outline-offset: 2px;
    box-shadow: var(--shadow-focus);
  }

  /* Pseudo-elements */
  &::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    background: rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    transform: translate(-50%, -50%);
    opacity: 0;
  }

  &:active:not(:disabled)::after {
    width: 200%;
    height: 200%;
    opacity: 0;
    transition: width 0.4s ease-out, height 0.4s ease-out, opacity 0.4s ease-out;
  }

  /* Size variants */
  &.sm {
    padding: var(--space-1) var(--space-3);
    font-size: var(--text-sm);
    height: 32px;
  }

  &.md {
    padding: var(--space-2) var(--space-4);
    font-size: var(--text-sm);
    height: 40px;
  }

  &.lg {
    padding: var(--space-3) var(--space-6);
    font-size: var(--text-base);
    height: 48px;
  }

  /* Color variants */
  &.primary {
    background: linear-gradient(to bottom, var(--color-primary-500), var(--color-primary-600));
    color: white;

    &:hover:not(:disabled) {
      background: linear-gradient(to bottom, var(--color-primary-600), var(--color-primary-700));
      box-shadow: var(--shadow-primary-md);
    }

    &:active:not(:disabled) {
      background: var(--color-primary-700);
      box-shadow: var(--shadow-inner-sm);
    }
  }

  &.secondary {
    background: linear-gradient(to bottom, var(--color-gray-50), var(--color-gray-100));
    color: var(--color-gray-700);

    &:hover:not(:disabled) {
      background: linear-gradient(to bottom, var(--color-gray-100), var(--color-gray-200));
    }
  }

  &.outline {
    background-color: transparent;
    color: var(--color-primary-600);
    border-color: var(--color-primary-400);

    &:hover:not(:disabled) {
      background-color: var(--color-primary-50);
      border-color: var(--color-primary-500);
    }
  }

  /* Responsive */
  @media (max-width: 768px) {
    padding: var(--space-1) var(--space-3);
    font-size: var(--text-sm);
  }

  /* Accessibility */
  @media (prefers-reduced-motion: reduce) {
    transition: none;
    animation: none;

    &:hover:not(:disabled),
    &:active:not(:disabled) {
      transform: none;
    }
  }

  /* Dark mode */
  @media (prefers-color-scheme: dark) {
    &.secondary {
      background: linear-gradient(to bottom, var(--color-gray-700), var(--color-gray-800));
      color: var(--color-gray-100);
    }
  }
}
```

---

### 4. Scroll-Driven Animations

**Specification:** [Scroll-Driven Animations](https://drafts.csswg.org/scroll-animations-1/)
**Browser Support:** Chrome 115+
**Use Case:** Animations tied to scroll position

#### Syntax

```css
/* Basic view() timeline */
.element {
  animation: fadeIn linear;
  animation-timeline: view();
  animation-range: entry 0% entry 100%;
}

/* Root scroll timeline */
.element {
  animation: slideUp linear;
  animation-timeline: scroll();
  animation-range: 0 500px;
}

/* Named scroll timeline */
@supports (animation-timeline: scroll()) {
  .element {
    animation: slideUp linear;
    animation-timeline: scroll(root);
    animation-range: entry 0% entry 100%;
  }
}
```

#### Timeline Types

```css
/* view() - element enters viewport */
animation-timeline: view();

/* scroll() - document scroll position */
animation-timeline: scroll();
animation-timeline: scroll(root);
animation-timeline: scroll(inline);

/* scroll(scroller-name) - custom scroll container */
animation-timeline: scroll(#my-container);
```

#### Animation Ranges

```css
/* Entry phase */
animation-range: entry 0% entry 100%;
/* Runs while element is entering viewport */

/* Cover phase */
animation-range: cover 0% cover 100%;
/* Runs while element is visible in viewport */

/* Exit phase */
animation-range: exit 0% exit 100%;
/* Runs while element is exiting viewport */

/* Absolute scroll positions */
animation-range: 0 500px;
/* Starts at scroll 0, ends at scroll 500px */

/* Viewport-relative */
animation-range: 50px;
/* Starts 50px before element, ends at bottom */
```

#### DMB Example: Scroll Progress Header

```css
.header {
  position: sticky;
  top: 0;
  z-index: var(--z-sticky);
}

/* Scroll progress indicator */
.header::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  height: 3px;
  width: 100%;
  background: linear-gradient(90deg, var(--color-primary-500), var(--color-primary-400));
  transform: scaleX(0);
  transform-origin: left;

  /* Animate based on scroll position */
  @supports (animation-timeline: scroll()) {
    animation: scrollProgress linear both;
    animation-timeline: scroll(root);
  }
}

@keyframes scrollProgress {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}

/* Reveal elements as they enter viewport */
.show-card {
  @supports (animation-timeline: view()) {
    animation: slideInUp linear both;
    animation-timeline: view();
    animation-range: entry 0% entry 100%;
  }
}

@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(40px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Parallax effect */
.parallax-bg {
  @supports (animation-timeline: scroll()) {
    animation: parallax linear;
    animation-timeline: scroll();
    animation-range: 0 100%;
  }
}

@keyframes parallax {
  from { transform: translateY(0); }
  to { transform: translateY(-100px); }
}
```

#### Performance Tips

- Use `transform: translateX/Y` and `opacity` only (compositor-friendly)
- Avoid animating `width`, `height`, `position`
- Use `will-change: transform` carefully
- Test on actual target device (mobile performance matters)

---

### 5. Container Queries

**Specification:** [CSS Contain 3](https://drafts.csswg.org/css-contain-3/)
**Browser Support:** Chrome 105+
**Status:** Already excellently implemented in DMB!

#### Syntax

```css
/* Define container */
.card-container {
  container-type: inline-size;
  container-name: card;
}

/* Query container size */
@container card (min-width: 400px) {
  .card { display: grid; }
}

/* Multiple conditions */
@container card (min-width: 600px) and (min-height: 400px) {
  .card { flex-direction: row; }
}

/* Style queries */
@container style(--theme: dark) {
  .card { background: #1a1a1a; }
}
```

#### DMB Implementation (Card.svelte)

```css
.card {
  container-type: inline-size;
  container-name: card;
}

/* Responsive to card width, not viewport */
@container card (max-width: 280px) {
  .header { gap: var(--space-0); }
  .title { font-size: var(--text-sm); }
}

@container card (min-width: 281px) and (max-width: 400px) {
  .title { font-size: var(--text-base); }
}

@container card (min-width: 401px) {
  .title { font-size: var(--text-lg); }
}

/* Fallback for browsers without container queries */
@supports not (container-type: inline-size) {
  @media (max-width: 320px) {
    .card { /* small layout */ }
  }
}
```

#### Container Units

```css
.element {
  /* 100% of container inline size */
  width: 100cqw;

  /* 100% of container block size */
  height: 100cqh;

  /* 100% of container's smaller dimension */
  size: 100cqmin;

  /* 100% of container's larger dimension */
  size: 100cqmax;
}

/* DMB Example */
.card {
  container-type: inline-size;
  /* Each card is a responsive container */
}

.card-content {
  padding: 2cqw;
  /* Padding scales with card width */

  font-size: max(0.875rem, 2cqw);
  /* Font scales with card width, min 14px */
}
```

---

### 6. CSS Anchor Positioning

**Specification:** [CSS Anchor Position](https://drafts.csswg.org/css-anchor-position-1/)
**Browser Support:** Chrome 125+
**Status:** Perfect implementation already in place!

#### Syntax

```css
/* Define anchor */
.trigger {
  anchor-name: --my-anchor;
}

/* Position relative to anchor */
.positioned {
  position: absolute;
  position-anchor: --my-anchor;
  top: anchor(bottom);
  left: anchor(center);
  translate: -50% 0.5rem;
}

/* Position areas */
.dropdown {
  position-area: bottom span-right;
  /* Places element below, spanning to right edge */
}

/* Automatic fallbacks */
.tooltip {
  position-try-fallbacks: bottom, left, right;
  /* Try bottom first, then left, then right */
}

/* Anchor sizing */
.dropdown {
  min-width: anchor-size(width);
  /* Match anchor element's width */
}
```

#### Anchor Functions

```css
/* Position relative to anchor edges */
top: anchor(top);      /* Anchor's top edge */
top: anchor(bottom);   /* Anchor's bottom edge */
left: anchor(left);    /* Anchor's left edge */
left: anchor(right);   /* Anchor's right edge */
left: anchor(center);  /* Anchor's center point */

/* Sizing relative to anchor */
width: anchor-size(width);
height: anchor-size(height);
width: anchor-size(inline);
height: anchor-size(block);
```

#### DMB Implementation (app.css)

```css
@supports (anchor-name: --anchor) {
  /* Anchor definition */
  .anchor-trigger {
    anchor-name: --trigger;
  }

  /* Positioned element */
  .tooltip {
    position: absolute;
    position-anchor: --trigger;
    position-area: top;
    margin-bottom: var(--space-2);
    padding: var(--space-2) var(--space-3);
    font-size: var(--text-sm);
    background: var(--color-gray-900);
    color: var(--color-gray-50);
    border-radius: var(--radius-md);
    white-space: nowrap;
    pointer-events: none;
    opacity: 0;
    transition: opacity var(--transition-fast);

    /* Automatic fallbacks */
    position-try-fallbacks: bottom, left, right;
  }

  /* Show on hover */
  .anchor-trigger:hover + .tooltip,
  .anchor-trigger:focus-visible + .tooltip {
    opacity: 1;
  }

  /* Dropdown menu */
  .dropdown-menu {
    position: absolute;
    position-anchor: --menu;
    position-area: bottom span-right;
    margin-top: var(--space-1);
    min-width: anchor-size(width);
    background: var(--background);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);

    /* Fallback: flip to top */
    position-try-fallbacks: top span-right;
  }
}

/* Fallback for Chrome <125 */
@supports not (anchor-name: --anchor) {
  .tooltip {
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    margin-bottom: var(--space-2);
  }

  .dropdown-menu {
    position: absolute;
    top: 100%;
    left: 0;
    margin-top: var(--space-1);
  }
}
```

---

## @supports Feature Detection

### Detect CSS if()
```css
@supports (background: if(style(--x: y), red, blue)) {
  /* CSS if() is supported */
}

@supports not (background: if(style(--x: y), red, blue)) {
  /* Fallback for Chrome <143 */
}
```

### Detect @scope
```css
@supports (selector(&:hover)) {
  /* Nesting and @scope supported */
}
```

### Detect CSS Nesting
```css
@supports (selector(&:hover)) {
  /* CSS nesting supported (Chrome 120+) */
}
```

### Detect Scroll-Driven Animations
```css
@supports (animation-timeline: view()) {
  /* Scroll-driven animations supported */
}
```

### Detect Container Queries
```css
@supports (container-type: inline-size) {
  /* Container queries supported */
}
```

### Detect Anchor Positioning
```css
@supports (anchor-name: --x) {
  /* Anchor positioning supported */
}
```

---

## Progressive Enhancement Pattern

```css
/* Base: works everywhere */
.button {
  display: inline-flex;
  background: blue;
  color: white;
}

/* Chrome 120+: CSS nesting */
@supports (selector(&:hover)) {
  .button {
    &:hover { background: darkblue; }
  }
}

/* Chrome 125+: Anchor positioning */
@supports (anchor-name: --x) {
  .tooltip {
    position: absolute;
    position-anchor: --trigger;
  }
}

/* Chrome 143+: CSS if() */
@supports (background: if(style(--x: y), red, blue)) {
  .button {
    background: if(
      style(--variant: primary),
      blue,
      gray
    );
  }
}
```

---

## Testing & Debugging

### Check Browser Support
```javascript
// In console
CSS.supports('anchor-name', '--test') // Chrome 125+
CSS.supports('animation-timeline', 'view()') // Chrome 115+
CSS.supports('selector', '&:hover') // Chrome 120+
CSS.supports('background', 'if(style(--x: y), red, blue)') // Chrome 143+
```

### Debug Custom Properties
```javascript
// Get computed custom property
const btn = document.querySelector('button');
const style = getComputedStyle(btn);
console.log(style.getPropertyValue('--button-variant'));
```

### Chrome DevTools
- **Elements Panel:** Check computed styles for custom properties
- **Console:** Use CSS.supports() to detect features
- **Network:** Verify CSS size reduction

---

## Performance Best Practices

### 1. Minimize CSS if() Nesting
```css
/* ❌ Too deep */
background: if(cond1, val1, if(cond2, val2, if(cond3, val3, default)));

/* ✅ Better: use CSS classes + @scope */
@scope (.button) {
  &.primary { background: var(--primary); }
  &.secondary { background: var(--secondary); }
}
```

### 2. Use Container Queries Over Media Queries
```css
/* ❌ Viewport-dependent */
@media (max-width: 600px) {
  .card { flex-direction: column; }
}

/* ✅ Container-dependent */
@container card (max-width: 400px) {
  .card { flex-direction: column; }
}
```

### 3. Leverage Scroll-Driven Animations
```css
/* ❌ JavaScript scroll listener */
window.addEventListener('scroll', updateProgress);

/* ✅ CSS animation timeline */
.progress {
  animation: grow linear;
  animation-timeline: scroll();
}
```

### 4. Use Anchor Positioning Over JS Libraries
```css
/* ❌ JavaScript positioning (Popper, FloatingUI) */
// JS: calculatePosition(trigger, tooltip, options)

/* ✅ Native anchor positioning */
@supports (anchor-name: --trigger) {
  .tooltip {
    position: absolute;
    position-anchor: --trigger;
    position-area: top;
    position-try-fallbacks: bottom;
  }
}
```

---

## Compatibility Matrix

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| CSS if() | 143+ | No | No | 143+ |
| @scope | 118+ | No | 17+ | 118+ |
| Nesting | 120+ | ✅ | ✅ | 120+ |
| Scroll-Driven | 115+ | ✅ | ✅ | 115+ |
| Containers | 105+ | ✅ | ✅ | 105+ |
| Anchoring | 125+ | No | 18+ | 125+ |

---

## References

1. [Chrome 143 Release Notes](https://developer.chrome.com/blog/)
2. [CSS if() Spec](https://drafts.csswg.org/css-conditional-5/)
3. [CSS Scoping Spec](https://drafts.csswg.org/css-scoping-1/)
4. [CSS Nesting Spec](https://drafts.csswg.org/css-nesting-1/)
5. [Scroll Animations Spec](https://drafts.csswg.org/scroll-animations-1/)
6. [Container Queries Spec](https://drafts.csswg.org/css-contain-3/)
7. [Anchor Positioning Spec](https://drafts.csswg.org/css-anchor-position-1/)

---

**Version:** 1.0
**Last Updated:** 2026-01-21
**Status:** Ready for Reference


---
name: safari-css-modern
description: >
  Expert in Safari 26.0-26.2 modern CSS features including anchor positioning,
  scroll-driven animations, field-sizing, CSS calc functions (random, sibling-index,
  sibling-count), contrast-color, scrollbar-color, @scope, and text shaping.
  Use for Safari-targeted CSS, cross-browser CSS compatibility, or progressive
  enhancement with WebKit-specific capabilities.
user-invocable: true
allowed-tools:
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - WebSearch
disable-model-invocation: false
---

# Safari 26.0-26.2 Modern CSS Skill

Expert knowledge of CSS features shipping in Safari 26.0 and 26.2 (macOS 26 Tahoe, iOS 26, iPadOS 26).

## Anchor Positioning (26.0 + 26.2 enhancements)

Full CSS Anchor Positioning support:

```css
/* Define anchor */
.trigger {
  anchor-name: --my-anchor;
}

/* Position relative to anchor */
.tooltip {
  position: fixed;
  position-anchor: --my-anchor;
  position-area: top center;
}

/* Fallback positioning (26.2: flip-x, flip-y) */
.tooltip {
  position-try-fallbacks: flip-y, flip-x;
  position-visibility: anchors-visible; /* 26.2 */
}

/* Works on pseudo-elements in 26.2 */
.element::before {
  position-anchor: --my-anchor;
  position-area: bottom center;
}
.element::backdrop {
  position-anchor: --my-anchor; /* 26.2 */
}
```

**26.2 additions**: `flip-x`, `flip-y` in `position-try-fallback`; `position-visibility` property; pseudo-element support (`::before`, `::after`, `::backdrop`).

## Scroll-Driven Animations (26.0)

```css
/* View-based timeline */
.card {
  animation: fade-in linear;
  animation-timeline: view();
  animation-range: entry 0% entry 100%;
}

@keyframes fade-in {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Works on ::marker pseudo-elements */
li::marker {
  animation-timeline: view();
  animation-range-start: entry 0%;
  animation-range-end: entry 100%;
}
```

## Field Sizing (26.2)

Auto-growing form fields:

```css
/* Auto-size textarea and inputs to content */
textarea, input {
  field-sizing: content;
}

/* With min/max constraints */
textarea {
  field-sizing: content;
  min-height: 3lh;   /* at least 3 lines */
  max-height: 10lh;  /* cap at 10 lines */
}
```

## CSS Calc Functions (26.2)

### random()
```css
/* Random values per element */
.particle {
  --x: random(0px, 100vw);
  --y: random(0px, 100vh);
  transform: translate(var(--x), var(--y));
}
```

### sibling-index() / sibling-count()
```css
/* Staggered animation delays based on DOM position */
.list-item {
  animation-delay: calc(sibling-index() * 50ms);
}

/* Distribute items evenly */
.grid-item {
  --total: sibling-count();
  width: calc(100% / var(--total));
}
```

### progress() (26.0)
```css
/* Map a value to a 0-1 range */
.bar {
  --progress: progress(var(--value), 0, 100);
  width: calc(var(--progress) * 100%);
}
```

## contrast-color() (26.0)

Automatic accessible text color:

```css
/* Picks black or white for best contrast */
.badge {
  background: var(--badge-color);
  color: contrast-color(var(--badge-color));
}
```

## Scrollbar Styling (26.2)

```css
/* Custom scrollbar colors */
.scrollable {
  scrollbar-color: #6b7280 transparent;
  /* thumb-color track-color */
}
```

## @scope Enhancements (26.0 + 26.2)

```css
/* Scoped styles with boundaries */
@scope (.card) to (.card-footer) {
  p { color: #333; }
  /* Direct declarations inside @scope (26.0) */
  color: inherit;
}

/* Shadow DOM support (26.2) */
@scope (:host) {
  .inner { padding: 1rem; }
}

/* :visited handling in @scope (26.2) */
@scope (.nav) {
  a:visited { color: purple; }
}
```

## Text & Typography

### text-wrap: pretty (26.0)
```css
/* Improved line breaking - avoids orphans/widows */
p { text-wrap: pretty; }
```

### Text Shaping Across Boxes (26.2)
Arabic and other connected scripts now correctly join letterforms across inline element boundaries.

### text-decoration Enhancements (26.2)
```css
/* Full shorthand support */
a { text-decoration: underline wavy red 2px; }

/* Spelling/grammar error indicators */
.misspelled { text-decoration: spelling-error; }
.grammar { text-decoration: grammar-error; }
```

### initial-letter Improvements (26.2)
```css
/* Decimal values + web font support */
p::first-letter {
  initial-letter: 3.5;
  font-family: 'Playfair Display', serif;
}
```

## Color Functions

### color-mix() Default (26.2)
```css
/* Defaults to oklab when no color space specified */
.blend {
  color: color-mix(in oklab, red 30%, blue); /* explicit */
  color: color-mix(red 30%, blue);           /* same result in 26.2 */
}
```

### display-p3-linear (26.2)
```css
.wide-gamut {
  color: color(display-p3-linear 1 0 0);
}
```

### dynamic-range-limit (26.0)
```css
/* Control HDR rendering */
.standard { dynamic-range-limit: standard; }
.hdr { dynamic-range-limit: no-limit; }
```

## Layout & Positioning

### margin-trim (26.0)
```css
.container {
  margin-trim: block inline;
}
```

### Logical Overflow (26.0)
```css
.box {
  overflow-block: auto;
  overflow-inline: hidden;
}
```

### Absolute Positioning Alignment (26.0)
```css
.abs {
  position: absolute;
  align-self: center;
  justify-self: end;
}
```

### accent-color Legibility (26.2)
```css
/* Safari auto-clamps luminance for readability */
input[type="checkbox"] {
  accent-color: #ff0;  /* Safari ensures text remains readable */
}
```

## CSS URL Modifiers (26.2)

```css
/* Cross-origin and referrer control on CSS URLs */
.bg {
  background-image: url("https://cdn.example.com/img.png" cross-origin(anonymous) referrer-policy(no-referrer));
}
```

## MathML Styling (26.2)

```css
math {
  font-family: math;  /* new generic font family */
}
math[display="block"] {
  math-shift: compact; /* compact superscript positioning */
}
```

## @starting-style (26.0)

```css
/* Animate from initial state on first render */
@starting-style {
  .modal {
    opacity: 0;
    transform: scale(0.95);
  }
}
.modal {
  opacity: 1;
  transform: scale(1);
  transition: opacity 0.3s, transform 0.3s;
}
```

## Pseudo-Element Enhancements (26.2)

```css
/* cursor now works on pseudo-elements */
.link::after {
  content: ' >';
  cursor: pointer;
}
```

## Feature Detection

```css
/* Anchor positioning */
@supports (position-anchor: --x) {
  /* anchor-based layout */
}

/* field-sizing */
@supports (field-sizing: content) {
  textarea { field-sizing: content; }
}

/* random() */
@supports (width: random(0px, 100px)) {
  /* randomized layouts */
}

/* scrollbar-color */
@supports (scrollbar-color: auto) {
  .scroll { scrollbar-color: gray transparent; }
}
```

## Cross-Browser Notes

| Feature | Safari 26.2 | Chrome 131+ | Firefox 135+ |
|---------|------------|-------------|--------------|
| Anchor Positioning | Full | Full | Partial |
| field-sizing | Yes | Yes (123+) | Yes (132+) |
| random() | Yes | No | No |
| sibling-index/count | Yes | No | No |
| scroll-driven anim | Yes | Yes (115+) | No |
| contrast-color() | Yes | No | No |
| scrollbar-color | Yes | Yes (121+) | Yes (64+) |
| @scope | Yes | Yes (118+) | No |

Safari-first features (use progressive enhancement): `random()`, `sibling-index()`, `sibling-count()`, `contrast-color()`.

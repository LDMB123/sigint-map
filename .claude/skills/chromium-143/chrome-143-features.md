---
name: chrome-143-features
version: 1.0.0
description: ---
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
migrated_from: CHROME_143_FEATURES_QUICK_REFERENCE.md
migration_date: 2026-01-25
---

# Chrome 143+ CSS Features Quick Reference
## DMB Almanac Implementation Guide

---

## 1. CSS if() Function (Chrome 143+)

### What It Does
Conditional styling based on custom property values without JavaScript.

### File Location
`/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/src/lib/styles/scoped-patterns.css:735-783`

### Syntax
```css
@supports (width: if(style(--x: 1), 10px, 20px)) {
  .element {
    padding: if(style(--compact-mode: true), 1rem, 1.5rem);
  }
}
```

### Use Case
Compact vs. normal density modes without class toggling.

### Example from Codebase
```css
padding: if(style(--compact-mode: true), 1rem, 1.5rem);
font-size: if(style(--compact-mode: true), 0.875rem, 0.95rem);
```

### Fallback
Older browsers ignore the if() and use cascade normally.

---

## 2. @scope At-Rules (Chrome 118+)

### What It Does
Component-level scoping without BEM naming conventions.

### File Locations
- `app.css:1865` (3 rules)
- `lib/styles/scoped-patterns.css:29-814` (5 rules)

### Syntax
```css
@scope (.card) to (.card-content) {
  /* Styles only apply in .card, not inside .card-content */
  p { color: blue; }
}
```

### Use Cases
| Pattern | Example |
|---------|---------|
| Card isolation | `@scope (.card) to (.card-content)` |
| Form isolation | `@scope (form)` |
| Navigation isolation | `@scope (nav)` |
| Button group | `@scope (.button-group) to (.button-dropdown)` |

### Nested @scope
```css
@scope (.container) to (.nested) {
  @scope (.item) to (.item-nested) {
    /* Nested scoping */
  }
}
```

### Fallback
Ignored in older browsers; styles still cascade normally.

---

## 3. CSS Nesting (Chrome 120+)

### What It Does
Native selector nesting without Sass/Less.

### File Location
`app.css:2394-2426`

### Syntax
```css
.show-card {
  background: white;

  &:hover {
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  }

  &.featured {
    border: 2px solid var(--primary);
  }

  & .show-card-title {
    font-size: 1.5rem;
  }

  @media (width < 640px) {
    padding: 1rem;
  }
}
```

### Features
- `&:hover` - Pseudo-class nesting
- `&.featured` - Modifier nesting
- `& .child` - Descendant nesting
- `@media` - Nested media queries

### Fallback
Unsupported browsers ignore nested rules; parent selector still applies.

---

## 4. Scroll-Driven Animations (Chrome 115+)

### What It Does
CSS animations tied to scroll position without JavaScript.

### File Location
`lib/motion/scroll-animations.css:1-614`

### Animation Types

#### View-based (Element visibility)
```css
@supports (animation-timeline: scroll()) {
  .scroll-fade-in {
    animation: scrollFadeIn linear both;
    animation-timeline: view();
    animation-range: entry 0% cover 40%;
  }
}
```

#### Document scroll (Progress bar)
```css
.scroll-progress-bar {
  animation: scrollProgress linear both;
  animation-timeline: scroll(root block);
}
```

### Use Cases
| Scenario | Timeline | Example |
|----------|----------|---------|
| Fade on scroll | `view()` | .scroll-fade-in |
| Slide on scroll | `view()` | .scroll-slide-up |
| Progress bar | `scroll(root block)` | .scroll-progress-bar |
| Parallax | `scroll()` | Depth effects |

### Fallback
```css
@supports not (animation-timeline: scroll()) {
  .scroll-fade-in {
    opacity: 1; /* Static styling */
  }
}
```

---

## 5. Anchor Positioning (Chrome 125+)

### What It Does
Smart positioning of elements relative to anchors with automatic fallbacks.

### File Location
`app.css:1560-1709`

### Define an Anchor
```css
.anchor {
  anchor-name: --my-anchor;
}
```

### Position Relative to Anchor
```css
@supports (anchor-name: --anchor) {
  .tooltip {
    position: absolute;
    position-anchor: --trigger;
    inset-area: top;
    margin-bottom: var(--space-2);
    position-try-fallbacks: bottom, left, right;
  }
}
```

### Examples from Codebase
| Element | Anchor | Primary Area | Fallbacks |
|---------|--------|--------------|-----------|
| .tooltip | --trigger | top | bottom, left, right |
| .dropdown-menu | --menu | bottom span-right | top span-right |
| .popover-content | --anchor | bottom | top, right, left |

### Fallback
```css
@supports not (anchor-name: --anchor) {
  .tooltip {
    position: absolute;
    inset-block-end: 100%;
    inset-inline-start: 50%;
    transform: translateX(-50%);
  }
}
```

---

## 6. Container Queries (Chrome 105+)

### What It Does
Component-level responsive design based on container size, not viewport.

### File Location
`app.css:2009-2328`

### Define Container
```css
.card-container {
  container-type: inline-size;
  container-name: card;
}
```

### Size-based Queries
```css
@container card (width >= 400px) {
  .card-content {
    display: grid;
    grid-template-columns: 200px 1fr;
  }
}

@container card (width < 400px) {
  .card-content {
    display: flex;
    flex-direction: column;
  }
}
```

### Style-based Queries (Chrome 111+)
```css
@container style(--theme: dark) {
  .card {
    background: #1a1a1a;
    color: #fff;
  }
}
```

### Combined Queries
```css
@container card (width >= 500px) and style(--featured: true) {
  .card {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
}
```

### Real Examples from DMB Almanac
| Container | Purpose | Breakpoints |
|-----------|---------|-------------|
| .visualization-container | D3 visualizations | <400px, 400-800px, >800px |
| .transition-flow | Sankey diagrams | Mobile, tablet, desktop |
| .song-heatmap | Heatmap layout | 3 responsive sizes |
| .gap-timeline | Timeline layout | Mobile, tablet, desktop |
| .rarity-scorecard | Scorecard layout | <400px, 400-700px, >700px |

### Fallback
Older browsers ignore container queries; normal CSS cascade applies.

---

## 7. light-dark() Function (Chrome 111+)

### What It Does
Automatic theme switching based on OS preference. No JavaScript needed.

### File Location
`app.css:70-148` (60+ instances throughout)

### Syntax
```css
--glass-bg: light-dark(
  oklch(1 0 0 / 0.7),        /* Light mode */
  oklch(0.18 0.01 65 / 0.7)  /* Dark mode */
);

background: var(--glass-bg);
```

### Design Token Example
```css
--color-primary-50: oklch(0.99 0.015 75);    /* Light */
--color-primary-900: oklch(0.32 0.12 40);    /* Dark */

/* Theme-aware glow */
--glow-primary: light-dark(
  0 0 20px oklch(0.70 0.20 60 / 0.25),      /* Subtle in light */
  0 0 25px oklch(0.70 0.20 60 / 0.35)       /* Prominent in dark */
);
```

### Real Examples from DMB Almanac
| Token | Light Value | Dark Value |
|-------|-------------|-----------|
| --glass-bg | Transparent white | Transparent dark |
| --glow-primary | Soft glow | Strong glow |
| --gradient-hero | Warm colors | Dark colors |
| --gradient-card-shine | Light shimmer | Subtle shimmer |

### Fallback
Older browsers use the light mode value (first parameter).

---

## 8. Modern Color Functions

### light-dark() - Theme Switching
```css
color: light-dark(#000, #fff);
```

### color-mix() - Color Blending
```css
--mixed-color: color-mix(in oklch, red 50%, blue);
```

### oklch() - Perceptually Uniform Color Space
```css
--color: oklch(lightness chroma hue / alpha);
--color-primary-600: oklch(0.62 0.20 55);
```

### Usage Statistics
| Function | Count | Purpose |
|----------|-------|---------|
| light-dark() | 60+ | Theme switching |
| color-mix() | 16 | Dynamic colors |
| oklch() | 155 | Color system |

---

## Design Tokens Reference

### Color System
```css
/* Primary (warm amber/gold - DMB vinyl inspired) */
--color-primary-50: oklch(0.99 0.015 75);    /* Cream */
--color-primary-600: oklch(0.62 0.20 55);    /* Bronze CTA */
--color-primary-900: oklch(0.32 0.12 40);    /* Deep brown */

/* Glass morphism (theme-aware) */
--glass-bg: light-dark(oklch(1 0 0 / 0.7), oklch(0.18 0.01 65 / 0.7));
--glass-bg-strong: light-dark(...);
--glass-blur: blur(20px);

/* Glow effects (subtle in light, prominent in dark) */
--glow-primary: light-dark(0 0 20px ..., 0 0 25px ...);
```

### Spacing
```css
--space-1: 0.25rem;
--space-2: 0.5rem;
--space-3: 0.75rem;
--space-4: 1rem;
--space-5: 1.5rem;
--space-6: 2rem;
```

### Typography
```css
--text-sm: 0.875rem;
--text-base: 1rem;
--text-lg: 1.125rem;
--text-xl: 1.5rem;

--font-light: 300;
--font-normal: 400;
--font-medium: 500;
--font-bold: 700;
```

### Shadows
```css
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
--shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
--shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
--shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.1);
```

---

## Performance Tips

### GPU Acceleration
```css
/* Transform + opacity only - GPU accelerated */
transform: translateZ(0);  /* Create composited layer */
will-change: transform;    /* Hint browser to prepare */

/* Animated keyframes */
@keyframes slide {
  from { transform: translateY(30px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
```

### CSS Containment
```css
.visualization-container {
  contain: layout style paint;    /* Isolated rendering */
  content-visibility: auto;       /* Lazy rendering off-screen */
}
```

---

## Browser Support Checklist

```
Chrome 49+     ✅ CSS custom properties
Chrome 104+    ✅ Media query ranges
Chrome 105+    ✅ Container queries
Chrome 111+    ✅ light-dark(), color-mix()
Chrome 115+    ✅ Scroll-driven animations
Chrome 118+    ✅ @scope rules
Chrome 120+    ✅ CSS nesting
Chrome 125+    ✅ Anchor positioning
Chrome 143+    ✅ CSS if()

Fallback strategy:
- All features in @supports blocks
- Older browsers get graceful degradation
- No blocking errors
```

---

## Common Patterns

### Component with Variants
```css
@scope (.card) to (.card-content) {
  :scope {
    /* Base styles */
  }

  :scope:hover {
    /* Hover state */
  }

  :scope.featured {
    /* Featured variant via CSS if() */
    padding: if(style(--featured: true), 2rem, 1rem);
  }
}
```

### Responsive Container
```css
.card-container {
  container-type: inline-size;
  container-name: card;
}

@container card (width >= 400px) {
  /* Large layout */
}

@container card (width < 400px) {
  /* Mobile layout */
}

@container style(--theme: dark) {
  /* Dark mode */
}
```

### Scroll Animation
```css
.element {
  animation: fadeIn linear both;
  animation-timeline: view();
  animation-range: entry 0% cover 40%;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

### Positioned Tooltip
```css
.trigger {
  anchor-name: --trigger;
}

.tooltip {
  position: absolute;
  position-anchor: --trigger;
  inset-area: top;
  position-try-fallbacks: bottom, left, right;
}
```

---

## Files to Review

For implementation details, see:

1. **CSS if() conditionals**
   - `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/src/lib/styles/scoped-patterns.css:735-783`

2. **@scope examples**
   - `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/src/lib/styles/scoped-patterns.css:29-814`

3. **Scroll animations**
   - `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/src/lib/motion/scroll-animations.css:1-614`

4. **Anchor positioning**
   - `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/src/app.css:1560-1709`

5. **Container queries**
   - `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/src/app.css:2009-2328`

6. **Theme system**
   - `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/src/app.css:70-200`

---

## Quick Testing

### Check Browser Support
```javascript
// In browser console
CSS.supports('animation-timeline: scroll()');     // Chrome 115+
CSS.supports('anchor-name: --test');              // Chrome 125+
CSS.supports('width: if(style(--x: 1), 10px, 20px)'); // Chrome 143+
CSS.supports('width: 1cqw');                      // Container query units
```

### Inspect Computed Styles
```javascript
// Verify custom properties are applied
const style = getComputedStyle(document.documentElement);
console.log(style.getPropertyValue('--glass-bg'));
```

---

## Additional Resources

- MDN: https://developer.mozilla.org/en-US/docs/Web/CSS/@scope
- MDN Container Queries: https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_container_queries
- MDN Scroll-driven Animations: https://developer.mozilla.org/en-US/docs/Web/CSS/animation-timeline
- MDN Anchor Positioning: https://developer.mozilla.org/en-US/docs/Web/CSS/anchor

---

*Quick Reference Guide - January 25, 2026*
*CSS Modern Specialist | Chrome 143+ Expert*

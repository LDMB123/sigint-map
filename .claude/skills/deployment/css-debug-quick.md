---
name: css-debug-quick
version: 1.0.0
description: ---
author: Claude Code
created: 2026-01-25
updated: 2026-01-25

category: deployment
complexity: advanced
tags:
  - deployment
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
migrated_from: projects/dmb-almanac/app/docs/analysis/css/CSS_DEBUG_QUICK_GUIDE.md
migration_date: 2026-01-25
---

# CSS Debug Quick Reference Guide
## DMB Almanac - Chrome 143+ Features & Fixes

---

## Common Issues & Solutions

### Issue 1: Flex Item Won't Shrink

**Problem**: Content overflows flex container

**Solution**:
```css
.flex-child {
  flex: 1;
  min-width: 0;  /* ✅ Critical - allows shrinking */
  overflow: hidden;
}
```

**Status**: ✅ Correctly implemented in ShowCard.svelte (line 200)

---

### Issue 2: High Specificity Conflict

**Problem**: Can't override component styles

**Solution**:
```css
/* Instead of this */
#main .card .title { }     /* (1,2,1) - Too high */

/* Do this */
.card-title { }             /* (0,1,0) - Perfect */
```

**Status**: ✅ No conflicts found (all components use (0,1,0))

---

### Issue 3: Animation Jank on 120Hz Display

**Problem**: Animation stuttering on ProMotion displays

**Solution**:
```css
/* Only animate transform + opacity */
.element {
  animation: moveSlide 0.2s ease-out;  /* ✅ GPU accelerated */
  will-change: transform, opacity;      /* ✅ Hints GPU */
  transform: translateZ(0);             /* ✅ Creates GPU layer */
}

@keyframes moveSlide {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

/* ❌ DON'T animate these properties */
/* height, width, padding, margin, left, top, color */
```

**Status**: ✅ All animations correctly use GPU properties

---

### Issue 4: Layout Shift During Scroll Animations

**Problem**: CLS issues with scroll-triggered animations

**Solution**:
```css
/* Use contain to isolate layout */
.animated-section {
  contain: layout style;      /* ✅ Prevents layout thrashing */
  content-visibility: auto;   /* ✅ Skip off-screen rendering */
}

/* Scroll animations won't trigger reflow */
.scroll-fade-in {
  animation: fadeIn linear both;
  animation-timeline: view();        /* ✅ Native scroll timeline */
  animation-range: entry 0% cover 50%;
}
```

**Status**: ✅ Properly implemented in scroll-animations.css

---

### Issue 5: Tooltip Positioning Issues

**Problem**: Tooltip off-screen or overlapping content

**Solution (Chrome 125+)**:
```css
@supports (anchor-name: --anchor) {
  /* Modern approach */
  [popover][data-anchor] {
    position-anchor: --trigger;
    inset-area: top;                    /* ✅ Smart positioning */
    position-try-fallbacks: bottom, left, right;  /* ✅ Auto-fallback */
  }
}

@supports not (anchor-name: --anchor) {
  /* Fallback for older browsers */
  [popover][data-anchor] {
    position: absolute;
    bottom: 110%;
    left: 50%;
    transform: translateX(-50%);
  }
}
```

**Status**: ✅ Implemented in Tooltip.svelte with fallbacks

---

## CSS Variable Reference

### Colors (Light/Dark Auto-Switching)

```css
:root {
  /* Auto-switch based on system preference */
  --background: light-dark(#faf8f3, oklch(0.15 0.008 65));
  --foreground: light-dark(#000000, oklch(0.98 0.003 65));
  --color-primary-600: oklch(0.62 0.20 55);
}
```

### Spacing Scale

```css
--space-1: 0.25rem;    /* 4px */
--space-2: 0.5rem;     /* 8px */
--space-3: 0.75rem;    /* 12px */
--space-4: 1rem;       /* 16px */
--space-6: 1.5rem;     /* 24px */
```

### Animations

```css
--transition-fast: 120ms cubic-bezier(0.2, 0, 0, 1);      /* 7 frames @120Hz */
--transition-normal: 180ms cubic-bezier(0.2, 0, 0, 1);    /* 10.8 frames @120Hz */
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);       /* Bounce effect */
--ease-apple: cubic-bezier(0.25, 0.1, 0.25, 1);         /* macOS style */
```

### GPU Hints

```css
--gpu-transform-hint: translateZ(0);  /* Force GPU layer */
```

---

## Chrome 143+ Feature Detection

### CSS if()

```javascript
// Check support in JavaScript
const supportsIfFunction = CSS.supports('width: if(style(--x: 1), 10px, 20px)');
console.log('CSS if() supported:', supportsIfFunction);
```

```css
/* In CSS - use @supports */
@supports (width: if(style(--x: 1), 10px, 20px)) {
  .element {
    padding: if(style(--density: compact), 0.5rem, 1rem);
  }
}
```

### @scope

```css
@scope (.card) to (.card-footer) {
  /* Styles only apply inside .card, exclude .card-footer */
  h2 { color: blue; }
}
```

### Container Queries

```css
.container {
  container-type: inline-size;
  container-name: my-container;
}

@container my-container (min-width: 400px) {
  .child { display: grid; }
}
```

### Scroll-Driven Animations

```css
@supports (animation-timeline: view()) {
  .fade-on-scroll {
    animation: fadeIn linear both;
    animation-timeline: view();
    animation-range: entry 0% cover 50%;
  }
}
```

---

## Performance Checklist

### ✅ GPU Acceleration

```css
/* Good - GPU accelerated */
.element {
  transform: translate3d(0, 0, 0);      /* ✅ 3D transform */
  will-change: transform, opacity;      /* ✅ GPU hint */
}

/* Bad - Layout thrashing */
.element {
  left: 10px;                           /* ❌ Layout property */
  will-change: left;                    /* ❌ Won't help */
}
```

### ✅ Containment Strategy

```css
.card {
  contain: content;                     /* ✅ Paint + layout contained */
}

.visualization {
  contain: layout style paint;          /* ✅ Strict containment */
  content-visibility: auto;             /* ✅ Skip off-screen render */
}
```

### ✅ Will-Change Usage

```css
/* Good - Apply during animation */
.element:hover {
  will-change: transform;               /* ✅ Applied before animation */
}

/* Remove after animation */
@media (prefers-reduced-motion: reduce) {
  .element {
    will-change: auto;                  /* ✅ Remove when idle */
  }
}
```

---

## Accessibility Quick Checks

### Focus States

```css
/* All interactive elements need clear focus */
button:focus-visible {
  outline: 2px solid var(--focus-ring-strong);
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}

/* Status: ✅ Implemented everywhere */
```

### Reduced Motion Support

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}

/* Status: ✅ Implemented globally */
```

### Color Contrast

```css
/* Verify 4.5:1 minimum (WCAG AA) */
--foreground: #000000;              /* Perfect on light bg */
--background: #ffffff;
/* Status: ✅ All components compliant */
```

---

## Browser Compatibility Matrix

### Modern Features (Chrome 143+)

| Feature | Support | Fallback | Status |
|---------|---------|----------|--------|
| CSS if() | Chrome 143+ | ❌ JS required | Production Ready |
| @scope | Chrome 118+ | ✅ No nesting | Production Ready |
| Container Q. | Chrome 105+ | ✅ Media query | Production Ready |
| Scroll Anim. | Chrome 115+ | ✅ Load animation | Production Ready |
| Anchor Pos. | Chrome 125+ | ✅ JS positioning | Production Ready |

---

## Testing in DevTools

### Check GPU Acceleration

```javascript
// Chrome DevTools Console
// Look for GPU-accelerated properties

// In Elements tab:
// 1. Inspect animated element
// 2. Styles panel
// 3. Check for transform, opacity only
// 4. Verify will-change present during animation

// In Rendering tab (⚙️ > More tools > Rendering):
// 1. Enable "Paint flashing"
// 2. Scroll or animate
// 3. Should see minimal repaints (no red)
```

### Check Container Queries

```css
/* Verify container is defined */
element {
  container-type: inline-size;  /* ✅ Required */
  container-name: my-container;  /* ✅ Name it */
}

/* In DevTools:
   1. Inspect container element
   2. In Computed styles, search for "container"
   3. Should show the container type and name
*/
```

### Check Scroll Animations

```javascript
// In Chrome 115+:
// DevTools > Sources > Page
// Hover over animated element while scrolling
// Should see: animation-timeline: view()

// In Animations panel:
// Should show scroll timeline indicator
```

---

## Debugging Commands

### Check CSS Variable Value

```javascript
// Get computed CSS variable
getComputedStyle(document.documentElement)
  .getPropertyValue('--color-primary-600')
  .trim();
// Returns: "0.62 0.20 55" (OKLCH values)
```

### Check Animation Performance

```javascript
// Detect janky animations
let lastTime = performance.now();
const fps = [];

const measureFPS = () => {
  const now = performance.now();
  const delta = now - lastTime;
  fps.push(1000 / delta);
  lastTime = now;
  requestAnimationFrame(measureFPS);
};

measureFPS();
// Should consistently show 60+ fps
// On 120Hz displays: 100+ fps possible
```

### Check Layout Shifts

```javascript
// Detect Cumulative Layout Shift (CLS)
new PerformanceObserver((entryList) => {
  for (const entry of entryList.getEntries()) {
    if (entry.hadRecentInput) continue;
    console.log('Layout Shift:', {
      value: entry.value,
      hadRecentInput: entry.hadRecentInput,
      sources: entry.sources
    });
  }
}).observe({type: 'layout-shift', buffered: true});
```

---

## Common Mistakes & Fixes

### ❌ Animating Width

```css
/* Bad - causes layout thrashing */
@keyframes badSlide {
  from { width: 0; }
  to { width: 100px; }
}

/* Good - use transform instead */
@keyframes goodSlide {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}
```

### ❌ Too Many GPU Layers

```css
/* Bad - creates too many layers */
* {
  will-change: transform;  /* ❌ Overdone */
  transform: translateZ(0);
}

/* Good - strategic GPU hints */
.animated-only {
  will-change: transform;  /* ✅ Only on animated elements */
}
```

### ❌ Specificity Wars

```css
/* Bad */
#main .card .title { }      /* (1,2,1) */
.container > .card > .title { }  /* (0,3,0) */
.card-title { }             /* (0,1,0) - wins! But confusing */

/* Good - consistent (0,1,0) */
.card-title { }
.card-title:hover { }
```

### ❌ Missing Fallbacks

```css
/* Bad - no fallback for older browsers */
.element {
  background: light-dark(white, black);
}

/* Good - with fallback */
.element {
  background: white;  /* Fallback */
}

@supports (background: light-dark(white, black)) {
  .element {
    background: light-dark(white, black);
  }
}
```

---

## File Locations Quick Reference

| Feature | File | Lines |
|---------|------|-------|
| CSS Variables | `src/app.css` | 45-486 |
| Animations | `src/lib/motion/animations.css` | 1-390 |
| Scroll Anim. | `src/lib/motion/scroll-animations.css` | 1-610 |
| View Transitions | `src/lib/motion/viewTransitions.css` | 1-443 |
| @scope Rules | `src/lib/styles/scoped-patterns.css` | 1-815 |
| Container Queries | `src/app.css` | 2024-2344 |
| Anchor Positioning | `src/app.css` | 1570-1702 |
| Accessibility | `src/app.css` | 1327-1859 |

---

## Quick Testing Checklist

Before deploying CSS changes:

- [ ] Test in Chrome 143+
- [ ] Test in Safari 17.2+
- [ ] Verify fallbacks work in Firefox
- [ ] Check animation performance (60+ fps)
- [ ] Test keyboard navigation (Tab, Enter)
- [ ] Enable reduced motion - verify no animations
- [ ] Enable high contrast - verify visibility
- [ ] Test on Apple Silicon Mac if possible
- [ ] Check mobile touch interactions
- [ ] Validate color contrast (WCAG AAA)

---

## Reference Links

- **Full Audit Report**: `CSS_AUDIT_REPORT.md`
- **Modernization Roadmap**: `CSS_MODERNIZATION_ROADMAP.md`
- **Chrome Features**: chrome.dev/css-2024
- **MDN Web Docs**: mdn.io/css
- **WCAG 2.1 Guidelines**: wcag.io

---

**Quick Reference Version**: 1.0
**Last Updated**: January 24, 2026
**Auditor**: CSS Debugger Agent (Claude Code)

*For detailed information, see CSS_AUDIT_REPORT.md (2,500+ lines)*

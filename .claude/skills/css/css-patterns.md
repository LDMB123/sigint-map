---
name: css-patterns
version: 1.0.0
description: Quick lookup guide for replacing JavaScript patterns with CSS equivalents.
author: Claude Code
created: 2026-01-25
updated: 2026-01-25

category: css
complexity: advanced
tags:
  - css
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
migrated_from: projects/dmb-almanac/app/src/CSS_PATTERNS_REFERENCE.md
migration_date: 2026-01-25
---

# Chrome 143+ CSS Patterns - Complete Reference

Quick lookup guide for replacing JavaScript patterns with CSS equivalents.

---

## Pattern 1: Scroll Event Listener

### ❌ Before: JavaScript
```typescript
window.addEventListener('scroll', handleScroll, { passive: true });

function handleScroll() {
  const scrollPercent = (window.scrollY /
    (document.documentElement.scrollHeight - window.innerHeight)) * 100;

  // Update progress bar
  progressBar.style.width = scrollPercent + '%';
}
```

### ✅ After: CSS (Chrome 115+)
```css
.progress-bar {
  animation: updateProgress linear;
  animation-timeline: scroll(root block);
}

@keyframes updateProgress {
  from { width: 0%; }
  to { width: 100%; }
}
```

### Fallback: IntersectionObserver
```typescript
if (!CSS.supports('animation-timeline: scroll()')) {
  // Use IntersectionObserver fallback
  const observer = new IntersectionObserver(...);
}
```

---

## Pattern 2: ResizeObserver for Dynamic Heights

### ❌ Before: JavaScript
```typescript
let resizeObserver: ResizeObserver | null = null;

onMount(() => {
  resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      containerHeight = entry.contentRect.height;
      rerenderChart();
    }
  });
  resizeObserver.observe(container);

  return () => resizeObserver?.disconnect();
});
```

### ✅ After: CSS (Chrome 105+)
```css
/* Parent container */
.chart-container {
  container-type: inline-size;
  contain: layout style paint;
}

/* Responsive inside container */
.chart {
  width: 100%;
}

/* Adjust layout based on container width */
@container (width >= 800px) {
  .chart {
    max-height: 600px;
  }
}

@container (width < 800px) {
  .chart {
    max-height: 300px;
  }
}
```

### In Component
```typescript
// Chart still renders, but browser handles resizing
const debouncedRender = debounce(() => {
  d3.selectAll('g').remove();
  drawChart(); // D3 automatically uses new dimensions
}, 300);

onMount(() => {
  debouncedRender();
});
```

---

## Pattern 3: IntersectionObserver for Visibility

### ❌ Before: JavaScript
```typescript
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        element.classList.add('visible');
      }
    });
  },
  { threshold: 0.5 }
);

observer.observe(element);
```

### ✅ After: CSS (Chrome 115+)
```css
.element {
  animation: fadeInOnView ease-out both;
  animation-timeline: view();
  animation-range: entry 0% cover 50%;
}

@keyframes fadeInOnView {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

**Fallback:** Keep IntersectionObserver for older browsers
```typescript
if (!CSS.supports('animation-timeline: view()')) {
  observeScrollAnimations('[data-animate]');
}
```

---

## Pattern 4: Tooltip/Popover Positioning

### ❌ Before: JavaScript (Floating UI)
```typescript
import { computePosition, flip, shift, offset } from '@floating-ui/dom';

async function updatePosition(trigger, tooltip) {
  const { x, y } = await computePosition(trigger, tooltip, {
    middleware: [flip(), shift(), offset(8)],
  });

  tooltip.style.left = x + 'px';
  tooltip.style.top = y + 'px';
}

// Update on scroll/resize
window.addEventListener('scroll', () => updatePosition(...));
new ResizeObserver(() => updatePosition(...)).observe(container);
```

### ✅ After: CSS (Chrome 125+)
```css
/* Trigger element - defines anchor */
.tooltip-trigger {
  anchor-name: --tooltip;
}

/* Positioned relative to anchor */
.tooltip {
  position: absolute;
  position-anchor: --tooltip;
  inset-area: top;
  margin-bottom: 8px;

  /* Smart fallback if not enough space */
  position-try-fallbacks: bottom, left, right;
}

/* Show on hover */
.tooltip-trigger:hover .tooltip {
  opacity: 1;
}
```

**Bundle savings:** 15-45 KB (removes @floating-ui/dom, Popper.js, Tippy.js)

---

## Pattern 5: Dynamic Spacing Based on Theme

### ❌ Before: JavaScript
```typescript
function applyTheme(theme: 'compact' | 'normal') {
  const spacing = theme === 'compact' ? '0.5rem' : '1rem';

  document.querySelectorAll('[data-spacing]').forEach((el) => {
    el.style.padding = spacing;
  });
}

// Or CSS-in-JS
const buttonStyle = css`
  padding: ${isCompact ? '0.5rem 0.875rem' : '0.75rem 1.25rem'};
`;
```

### ✅ After: CSS (Chrome 143+)
```css
:root {
  --use-compact: false;
}

button {
  padding: if(style(--use-compact: true), 0.5rem 0.875rem, 0.75rem 1.25rem);
}
```

**From JavaScript (when needed):**
```typescript
document.documentElement.style.setProperty('--use-compact', 'true');
```

---

## Pattern 6: Auto Theme Detection

### ❌ Before: JavaScript
```typescript
function initTheme() {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  if (prefersDark) {
    document.documentElement.style.colorScheme = 'dark';
    applyDarkTheme();
  } else {
    applyLightTheme();
  }
}

// Listen for changes
window.matchMedia('(prefers-color-scheme: dark)')
  .addEventListener('change', (e) => {
    if (e.matches) applyDarkTheme();
    else applyLightTheme();
  });
```

### ✅ After: CSS (Chrome 123+)
```css
:root {
  color-scheme: light dark;

  /* Automatically respects system preference */
  --background: light-dark(#ffffff, #030712);
  --foreground: light-dark(#000000, #fafafa);
  --border: light-dark(#e5e7eb, #374151);
}

/* No JavaScript needed! Browser handles theme changes */
```

**Optional fallback for manual override:**
```css
html[data-theme="dark"] {
  --background: #030712;
  --foreground: #fafafa;
}

html[data-theme="light"] {
  --background: #ffffff;
  --foreground: #000000;
}
```

---

## Pattern 7: Animation Frame Loop

### ❌ Before: JavaScript
```typescript
function animate() {
  const progress = calculateProgress();
  element.style.transform = `translateX(${progress}px)`;

  requestAnimationFrame(animate);
}

animate(); // Start loop
```

### ✅ After: CSS (Chrome 115+)
```css
.element {
  animation: slide linear;
  animation-timeline: scroll(root block);
}

@keyframes slide {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(500px);
  }
}
```

---

## Pattern 8: Scroll Progress Indicator

### ❌ Before: JavaScript
```typescript
function updateProgressBar() {
  const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
  const scrollProgress = (window.scrollY / scrollHeight) * 100;

  progressBar.style.width = scrollProgress + '%';
}

window.addEventListener('scroll', updateProgressBar, { passive: true });
```

### ✅ After: CSS (Chrome 115+)
```css
.progress-bar {
  position: fixed;
  top: 0;
  left: 0;
  height: 3px;
  background: var(--color-primary);

  animation: growWidth linear;
  animation-timeline: scroll();
}

@keyframes growWidth {
  from { width: 0%; }
  to { width: 100%; }
}
```

---

## Pattern 9: Element Reveal on Scroll

### ❌ Before: JavaScript + CSS
```typescript
// JavaScript
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('revealed');
    }
  });
});

document.querySelectorAll('.fade-on-scroll').forEach(el => {
  observer.observe(el);
});

// CSS
.fade-on-scroll {
  opacity: 0;
  transform: translateY(20px);
}

.fade-on-scroll.revealed {
  animation: fadeReveal 0.6s ease-out forwards;
}

@keyframes fadeReveal {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

### ✅ After: Pure CSS (Chrome 115+)
```css
.fade-on-scroll {
  animation: fadeReveal ease-out both;
  animation-timeline: view();
  animation-range: entry 0% cover 50%;
}

@keyframes fadeReveal {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

---

## Pattern 10: Parallax Scrolling

### ❌ Before: JavaScript
```typescript
function handleParallax() {
  const scrollY = window.scrollY;

  document.querySelectorAll('.parallax').forEach((el) => {
    const speed = el.dataset.speed || 0.5;
    el.style.transform = `translateY(${scrollY * speed}px)`;
  });
}

window.addEventListener('scroll', handleParallax, { passive: true });
```

### ✅ After: CSS (Chrome 115+)
```css
.parallax-slow {
  animation: parallaxSlow linear;
  animation-timeline: scroll(root block);
}

.parallax-medium {
  animation: parallaxMedium linear;
  animation-timeline: scroll(root block);
}

.parallax-fast {
  animation: parallaxFast linear;
  animation-timeline: scroll(root block);
}

@keyframes parallaxSlow {
  from { transform: translateY(0); }
  to { transform: translateY(-50px); }
}

@keyframes parallaxMedium {
  from { transform: translateY(0); }
  to { transform: translateY(-100px); }
}

@keyframes parallaxFast {
  from { transform: translateY(0); }
  to { transform: translateY(-150px); }
}
```

---

## Pattern 11: Dropdown Menu with Smart Fallback

### ❌ Before: JavaScript (Popper.js)
```typescript
import { createPopper } from '@popperjs/core';

const button = document.querySelector('[data-popper-trigger]');
const menu = document.querySelector('[data-popper-content]');

const popperInstance = createPopper(button, menu, {
  placement: 'bottom',
  modifiers: [
    {
      name: 'flip',
      enabled: true,
    },
  ],
});

button.addEventListener('click', () => {
  menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
  popperInstance.update();
});
```

### ✅ After: CSS + HTML (Chrome 125+)
```html
<button popovertarget="menu" style="anchor-name: --menu;">
  Menu
</button>

<div popover="auto" id="menu" style="position-anchor: --menu;">
  <button>Item 1</button>
  <button>Item 2</button>
  <button>Item 3</button>
</div>
```

```css
[popover="auto"] {
  position: absolute;
  position-anchor: --menu;
  inset-area: bottom;

  /* Smart fallback positioning */
  position-try-fallbacks: top, left, right;
}

[popover="auto"]:popover-open {
  opacity: 1;
  transform: scale(1);
}
```

**Bundle savings:** 10 KB+ (removes Popper.js)

---

## Pattern 12: Lazy Loading Images

### ❌ Before: JavaScript
```typescript
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      const img = entry.target;
      img.src = img.dataset.src;
      img.onload = () => img.classList.add('loaded');
    }
  });
});

document.querySelectorAll('img[data-src]').forEach((img) => {
  observer.observe(img);
});
```

### ✅ After: HTML Native (No JavaScript!)
```html
<!-- Chrome 110+, Safari 16.1+ -->
<img
  src="placeholder.jpg"
  srcset="tiny.jpg 100w, small.jpg 200w"
  loading="lazy"
  alt="Description"
/>

<!-- Or use picture with media queries -->
<picture>
  <source media="(width < 768px)" srcset="mobile.jpg" />
  <source media="(width >= 768px)" srcset="desktop.jpg" />
  <img src="desktop.jpg" alt="Description" loading="lazy" />
</picture>
```

**Zero JavaScript needed!**

---

## Pattern 13: Conditional CSS Based on Feature

### ❌ Before: JavaScript + Inline Styles
```typescript
if (userPreferences.density === 'compact') {
  button.style.padding = '0.5rem';
} else {
  button.style.padding = '1rem';
}

if (userPreferences.showLabels) {
  button.style.display = 'inline-flex';
} else {
  button.style.display = 'none';
}
```

### ✅ After: CSS @supports + CSS if() (Chrome 143+)
```css
@supports (width: if(style(--x: 1), 10px, 20px)) {
  button {
    padding: if(
      style(--density: compact): 0.5rem;
      style(--density: normal): 1rem;
      1rem  /* default */
    );

    display: if(style(--show-labels: true), inline-flex, none);
  }
}

/* Fallback for older browsers */
@supports not (width: if(style(--x: 1), 10px, 20px)) {
  button {
    padding: 1rem;
    display: inline-flex;
  }
}
```

---

## Browser Support Quick Reference

```javascript
// Check support programmatically
const features = {
  scrollDriven: CSS.supports('animation-timeline: scroll()'),
  viewTimeline: CSS.supports('animation-timeline: view()'),
  containerQueries: CSS.supports('container-type: inline-size'),
  anchorPositioning: CSS.supports('anchor-name: --test'),
  cssIf: CSS.supports('width: if(style(--x: 1), 10px, 20px)'),
  lightDark: CSS.supports('color: light-dark(red, blue)'),
};

console.log(features);
```

---

## Performance Tips

### 1. Use `will-change` for animated elements
```css
.animated {
  animation: slide linear;
  animation-timeline: scroll();
  will-change: transform; /* GPU acceleration hint */
}
```

### 2. Use `contain` for isolated layouts
```css
.component {
  container-type: inline-size;
  contain: layout style paint; /* Let browser optimize */
}
```

### 3. Batch animations with `animation-delay`
```css
.item {
  animation: stagger 0.5s ease-out both;
  animation-timeline: view();
  animation-delay: calc(var(--index) * 100ms);
}
```

### 4. Disable animations for reduced motion
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation: none !important;
    transition: none !important;
  }
}
```

---

## Debugging CSS Animations

### In Chrome DevTools:

1. **Elements tab** → Check computed styles
   - See animation properties
   - View timeline calculations

2. **Performance tab** → Record scroll/resize
   - Verify no JavaScript overhead
   - Check frame rate (target: 60+ fps)

3. **Animation Inspector** → Preview animations
   - Play/pause animations
   - Adjust timeline scrubber
   - Check animation range

### CSS Debugging:
```css
/* Highlight animated elements */
[style*="animation-timeline"] {
  outline: 2px dashed red;
}

/* Check containment */
[style*="container-type"] {
  outline: 2px dashed blue;
}
```

---

## Migration Checklist

- [ ] Replace `addEventListener('scroll')` with `animation-timeline: scroll()`
- [ ] Replace ResizeObserver with `container-type: inline-size`
- [ ] Replace IntersectionObserver with `animation-timeline: view()`
- [ ] Replace positioning libraries with `anchor-name` + `position-anchor`
- [ ] Replace theme toggle with `light-dark()`
- [ ] Replace rAF loops with `animation-timeline`
- [ ] Add `@supports` fallbacks for older browsers
- [ ] Test in Chrome 143+, Safari 17.4+, Firefox 125+
- [ ] Verify 60+ fps on Apple Silicon

---

## Resources

- [Scroll-Driven Animations](https://scroll-driven-animations.style/)
- [MDN: animation-timeline](https://developer.mozilla.org/en-US/docs/Web/CSS/animation-timeline)
- [CSS Anchor Positioning](https://drafts.csswg.org/css-anchor-position-1/)
- [Container Queries](https://developer.mozilla.org/en-US/docs/Web/CSS/Container_queries)
- [Can I Use](https://caniuse.com/)

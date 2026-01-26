# CSS Modernization Quick Reference
**Chrome 143+ CSS Features - Replace TypeScript with Native CSS**

---

## 🎯 Quick Decision Matrix

| If you're writing... | Use CSS Feature Instead |
|---------------------|------------------------|
| Scroll event listener | `animation-timeline: scroll()` |
| IntersectionObserver for animations | `animation-timeline: view()` |
| ResizeObserver for layout | `@container` queries |
| JavaScript positioning (tooltips) | `anchor-name` + `position-anchor` |
| Media query listeners | `@container` queries |
| Conditional inline styles | CSS `if()` function |
| State-based styling | CSS `:has()` + custom properties |
| Animation state variables | `@starting-style` + `:popover-open` |

---

## 1. Scroll Animations

### ❌ BEFORE (TypeScript)
```typescript
// DON'T: JavaScript scroll listener
window.addEventListener('scroll', () => {
  const progress = (window.scrollY / document.documentElement.scrollHeight) * 100;
  progressBar.style.width = `${progress}%`;
});

// DON'T: IntersectionObserver for fade-in
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
});
```

### ✅ AFTER (CSS Only)
```css
/* DO: Scroll-driven animations (Chrome 115+) */

/* Progress bar tied to scroll position */
.progress-bar {
  animation: growWidth linear;
  animation-timeline: scroll(root);
}

@keyframes growWidth {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}

/* Fade in when element enters viewport */
.fade-in-on-scroll {
  animation: fadeIn linear;
  animation-timeline: view();
  animation-range: entry 0% cover 40%;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

**Usage:**
```svelte
<!-- Just add CSS class - no JavaScript needed -->
<div class="progress-bar"></div>
<section class="fade-in-on-scroll">Content</section>
```

---

## 2. Anchor Positioning

### ❌ BEFORE (TypeScript)
```typescript
// DON'T: JavaScript positioning calculations
function positionTooltip(trigger: HTMLElement, tooltip: HTMLElement) {
  const triggerRect = trigger.getBoundingClientRect();
  tooltip.style.top = `${triggerRect.bottom + 8}px`;
  tooltip.style.left = `${triggerRect.left + triggerRect.width / 2}px`;
  tooltip.style.transform = 'translateX(-50%)';
}
```

### ✅ AFTER (CSS Only)
```css
/* DO: CSS anchor positioning (Chrome 125+) */

/* Define anchor */
.tooltip-trigger {
  anchor-name: --tooltip-anchor;
}

/* Position relative to anchor */
.tooltip {
  position: absolute;
  position-anchor: --tooltip-anchor;

  /* Position below trigger, centered */
  top: anchor(bottom);
  left: anchor(center);
  translate: -50% 0.5rem;

  /* Automatic collision detection */
  position-try-fallbacks: flip-block, flip-inline;
}

/* Fallback position if no space below */
@position-try --flip-top {
  bottom: anchor(top);
  top: auto;
  translate: -50% -0.5rem;
}
```

**Usage:**
```svelte
<button class="tooltip-trigger">Hover me</button>
<div class="tooltip">Tooltip content</div>
```

---

## 3. Container Queries

### ❌ BEFORE (TypeScript)
```typescript
// DON'T: ResizeObserver for responsive layouts
const resizeObserver = new ResizeObserver((entries) => {
  for (const entry of entries) {
    const width = entry.contentRect.width;
    if (width < 300) {
      element.classList.add('compact');
    } else {
      element.classList.remove('compact');
    }
  }
});
```

### ✅ AFTER (CSS Only)
```css
/* DO: Container queries (Chrome 105+) */

/* Define container */
.card-container {
  container-type: inline-size;
  container-name: card;
}

/* Responsive based on container size, not viewport */
@container card (max-width: 300px) {
  .card {
    flex-direction: column;
    padding: var(--space-2);
  }

  .card-title {
    font-size: var(--text-sm);
  }
}

@container card (min-width: 400px) {
  .card {
    flex-direction: row;
    padding: var(--space-4);
  }

  .card-title {
    font-size: var(--text-lg);
  }
}
```

**Usage:**
```svelte
<div class="card-container">
  <div class="card">
    <h3 class="card-title">Title</h3>
  </div>
</div>
```

---

## 4. CSS if() Function

### ❌ BEFORE (TypeScript)
```typescript
// DON'T: Conditional inline styles
const padding = density === 'compact' ? '8px' : '16px';
element.style.padding = padding;

const bgColor = theme === 'dark' ? '#1a1a1a' : '#ffffff';
element.style.backgroundColor = bgColor;
```

### ✅ AFTER (CSS Only)
```css
/* DO: CSS if() conditionals (Chrome 143+) */

/* Density-based spacing */
.button {
  padding: if(
    style(--density: compact),
    var(--space-2),
    var(--space-4)
  );
}

/* Theme-based colors */
.card {
  background: if(
    style(--theme: dark),
    var(--color-gray-900),
    var(--color-gray-50)
  );

  color: if(
    style(--theme: dark),
    var(--color-gray-50),
    var(--color-gray-900)
  );
}

/* Feature detection */
.grid {
  display: if(
    supports(display: grid),
    grid,
    flex
  );
}

/* Media query conditionals */
.sidebar {
  width: if(
    media(width >= 768px),
    300px,
    100%
  );
}
```

**Usage:**
```svelte
<!-- Set custom properties in HTML -->
<div style="--density: compact; --theme: dark">
  <button class="button">Compact Dark Button</button>
</div>
```

---

## 5. CSS :has() for State

### ❌ BEFORE (TypeScript)
```typescript
// DON'T: JavaScript state management for styling
let isMenuOpen = $state(false);

$effect(() => {
  if (isMenuOpen) {
    header.classList.add('menu-open');
  } else {
    header.classList.remove('menu-open');
  }
});
```

### ✅ AFTER (CSS Only)
```css
/* DO: CSS :has() for state-based styling (Chrome 105+) */

/* Style header when menu is open */
.header:has(.menu[open]) {
  border-bottom-color: var(--border-strong);
  backdrop-filter: blur(30px);
}

/* Style page when dialog is open */
body:has(dialog[open]) {
  overflow: hidden;
}

/* Conditional styling based on checkbox */
.form:has(input[type="checkbox"]:checked) {
  --form-valid: 1;
  border-color: var(--color-success);
}

/* Style parent when child has focus */
.card:has(:focus-visible) {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
}
```

**Usage:**
```svelte
<!-- Native HTML elements provide state -->
<header class="header">
  <details class="menu">
    <summary>Menu</summary>
    <!-- Menu content -->
  </details>
</header>
```

---

## 6. Popover API + @starting-style

### ❌ BEFORE (TypeScript)
```typescript
// DON'T: JavaScript for show/hide with animations
let isVisible = $state(false);

function show() {
  isVisible = true;
  element.classList.add('visible');

  // Trigger animation
  requestAnimationFrame(() => {
    element.style.opacity = '1';
    element.style.transform = 'scale(1)';
  });
}
```

### ✅ AFTER (CSS Only)
```css
/* DO: Native Popover API (Chrome 114+) + @starting-style (Chrome 117+) */

/* Popover default state */
[popover] {
  opacity: 0;
  transform: scale(0.95) translateY(-8px);
  transition:
    opacity 150ms ease,
    transform 150ms ease,
    display 150ms allow-discrete;
}

/* Open state */
[popover]:popover-open {
  opacity: 1;
  transform: scale(1) translateY(0);
}

/* Entry animation */
@starting-style {
  [popover]:popover-open {
    opacity: 0;
    transform: scale(0.95) translateY(-8px);
  }
}
```

**Usage:**
```svelte
<!-- Native popover - no JavaScript -->
<button popovertarget="my-popover">Show</button>

<div id="my-popover" popover="auto">
  Popover content
</div>
```

---

## 7. Scroll-Driven Header Shrink

### ❌ BEFORE (TypeScript)
```typescript
// DON'T: Scroll event listener
window.addEventListener('scroll', () => {
  const scrolled = window.scrollY > 100;

  if (scrolled) {
    header.style.padding = '8px';
    header.style.fontSize = '14px';
  } else {
    header.style.padding = '16px';
    header.style.fontSize = '18px';
  }
});
```

### ✅ AFTER (CSS Only)
```css
/* DO: Scroll-driven animation (Chrome 115+) */

.header {
  animation: shrinkHeader linear both;
  animation-timeline: scroll(root);
  animation-range: 0px 200px; /* Shrink during first 200px of scroll */
}

@keyframes shrinkHeader {
  from {
    padding-block: var(--space-4);
    font-size: var(--text-lg);
    backdrop-filter: blur(8px);
  }
  to {
    padding-block: var(--space-2);
    font-size: var(--text-sm);
    backdrop-filter: blur(20px);
    box-shadow: var(--shadow-md);
  }
}
```

**Usage:**
```svelte
<!-- Just add class - no JavaScript needed -->
<header class="header">
  <!-- Header content -->
</header>
```

---

## 8. Parallax Scrolling

### ❌ BEFORE (TypeScript)
```typescript
// DON'T: Scroll event for parallax
window.addEventListener('scroll', () => {
  const scrollY = window.scrollY;
  background.style.transform = `translateY(${scrollY * 0.5}px)`;
});
```

### ✅ AFTER (CSS Only)
```css
/* DO: CSS parallax (Chrome 115+) */

.parallax-bg {
  animation: parallax linear;
  animation-timeline: scroll(root);
  animation-range: 0vh 100vh;
}

@keyframes parallax {
  from { transform: translateY(0); }
  to { transform: translateY(-100px); }
}

/* Variable speed parallax */
.parallax-slow {
  animation: parallaxSlow linear;
  animation-timeline: scroll(root);
  animation-range: 0vh 150vh;
}

@keyframes parallaxSlow {
  from { transform: translateY(0); }
  to { transform: translateY(-50px); }
}
```

---

## 9. Mobile Menu Toggle

### ❌ BEFORE (TypeScript)
```typescript
// DON'T: JavaScript state for menu toggle
let isOpen = $state(false);

function toggle() {
  isOpen = !isOpen;
}
```

### ✅ AFTER (CSS Only)
```html
<!-- DO: Native <details> element -->
<details class="mobile-menu">
  <summary class="menu-button">
    <span class="icon"></span>
  </summary>

  <nav class="menu-content">
    <!-- Menu items -->
  </nav>
</details>
```

```css
/* Hamburger to X transformation */
.mobile-menu[open] .icon::before {
  transform: rotate(45deg) translateY(7px);
}

.mobile-menu[open] .icon::after {
  transform: rotate(-45deg) translateY(-7px);
}

/* Menu animation */
.menu-content {
  animation: slideDown 200ms ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

---

## 10. Performance Best Practices

### CSS Properties That Trigger GPU Acceleration
```css
/* ✅ FAST: Only trigger compositing, not layout */
.element {
  transform: translate3d(0, 0, 0);
  opacity: 0.8;
  filter: blur(10px);
  will-change: transform, opacity;
}

/* ❌ SLOW: Triggers layout recalculation */
.element {
  width: 100px;
  height: 100px;
  top: 10px;
  left: 20px;
  margin: 10px;
  padding: 10px;
}
```

### Animation Timeline Performance
```css
/* ✅ FAST: Scroll-driven animation (GPU) */
.element {
  animation: fade linear;
  animation-timeline: scroll(root);
}

/* ❌ SLOW: JavaScript scroll listener (CPU) */
window.addEventListener('scroll', () => {
  element.style.opacity = calculateOpacity();
});
```

### Container Query Performance
```css
/* ✅ FAST: Container query (native) */
@container card (max-width: 400px) {
  .card { padding: 1rem; }
}

/* ❌ SLOW: ResizeObserver (JavaScript) */
resizeObserver.observe(element);
```

---

## Migration Checklist

When replacing TypeScript with CSS:

- [ ] **Identify the pattern**: Scroll? Resize? Conditional?
- [ ] **Find CSS alternative**: Check this guide
- [ ] **Test browser support**: Chrome 143+ = all features ✓
- [ ] **Write CSS first**: Add CSS classes/rules
- [ ] **Remove TypeScript**: Delete event listeners, state variables
- [ ] **Test thoroughly**: Ensure same behavior
- [ ] **Measure performance**: Should be faster (use DevTools Performance tab)
- [ ] **Document changes**: Update component docs

---

## Feature Detection

Always use `@supports` for progressive enhancement:

```css
/* Chrome 143+ CSS if() */
@supports (width: if(style(--x: 1), 10px, 20px)) {
  .card {
    padding: if(style(--compact: true), 8px, 16px);
  }
}

/* Fallback for older browsers */
@supports not (width: if(style(--x: 1), 10px, 20px)) {
  .card {
    padding: 16px;
  }
}
```

---

## Files to Delete After Migration

Once CSS features are in place, these files can be removed:

1. `/lib/actions/scroll.ts` (361 lines) → Use CSS scroll timeline classes
2. `/lib/actions/anchor.ts` (184 lines) → Use CSS anchor positioning
3. `/lib/utils/anchorPositioning.ts` (74 lines) → Use native CSS
4. Scroll event handlers in components → Use `animation-timeline: scroll()`
5. ResizeObserver instances → Use container queries
6. Media query listeners → Use `@container` or `@media` with range syntax

---

## Quick Command Reference

```bash
# Find scroll event listeners to replace
grep -r "addEventListener.*scroll" src/

# Find ResizeObserver instances to replace
grep -r "new ResizeObserver" src/

# Find IntersectionObserver for animations to replace
grep -r "new IntersectionObserver" src/

# Find conditional styling to replace with CSS if()
grep -r "style\\.setProperty" src/

# Find state-based classList manipulation
grep -r "classList\\.(add|remove|toggle)" src/
```

---

## Resources

- [MDN: CSS Scroll-driven Animations](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_scroll-driven_animations)
- [MDN: CSS Anchor Positioning](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_anchor_positioning)
- [MDN: Container Queries](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_container_queries)
- [Chrome 143+ CSS if() Spec](https://drafts.csswg.org/css-conditional-5/#if-function)
- [Chrome DevTools Performance](https://developer.chrome.com/docs/devtools/performance)

---

**Remember:** Chrome 143+ gives you everything you need. Stop writing JavaScript for styling, layout, and animations. Let CSS do what it does best! 🚀

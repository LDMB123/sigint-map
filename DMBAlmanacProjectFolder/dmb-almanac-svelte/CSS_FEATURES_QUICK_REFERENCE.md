# Chromium 143+ CSS Features - Quick Reference

Fast lookup guide for using modern CSS features in DMB Almanac.

## CSS if() - Chrome 143+

**Toggle compact mode:**
```css
button {
  padding: if(style(--use-compact-spacing: true), 0.5rem 0.875rem, 0.75rem 1.25rem);
}
```

**Activate in JS:**
```js
document.documentElement.style.setProperty('--use-compact-spacing', 'true');
```

**Check support:**
```js
CSS.supports('width', 'if(style(--x: 1), 10px, 20px)')
```

---

## @scope - Chrome 118+

**Isolate component styles:**
```css
@scope (.card) to (.card-content) {
  h2 { color: var(--foreground); }
  p { margin-block-end: var(--space-2); }
}
```

**Benefits:**
- No BEM naming needed
- Automatic style isolation
- Nested scopes supported
- Boundary exclusion with `to`

---

## Media Query Ranges - Chrome 104+

**Old way:**
```css
@media (min-width: 1024px) { }
```

**New way:**
```css
@media (width >= 1024px) { }
@media (width < 768px) { }
@media (640px <= width < 1024px) { }
@media (width > height) { } /* Landscape */
```

**All operators:** `>=`, `<=`, `<`, `>`, `=`

---

## Anchor Positioning - Chrome 125+

**Define anchor:**
```css
.tooltip-trigger {
  anchor-name: --tooltip;
}
```

**Position element:**
```css
.tooltip {
  position: absolute;
  position-anchor: --tooltip;
  inset-area: top;
  position-try-fallbacks: bottom, left, right;
}
```

**Show on hover:**
```css
.tooltip-trigger:hover .tooltip { opacity: 1; }
```

**Replaces:** Popper.js, @floating-ui/dom, Tippy.js

---

## Container Queries - Chrome 105+

**Define container:**
```css
.card-container {
  container-type: inline-size;
  container-name: card;
}
```

**Size-based query:**
```css
@container card (width >= 400px) {
  .card { display: grid; grid-template-columns: 200px 1fr; }
}
```

**Style-based query:**
```css
@container style(--theme: dark) {
  .card { background: var(--color-gray-900); }
}
```

---

## CSS Nesting - Chrome 120+

**Native nesting (no Sass needed):**
```css
.show-card {
  background: var(--background);

  &:hover { box-shadow: var(--shadow-lg); }

  &.featured { border: 2px solid var(--color-primary-600); }

  & .title { font-size: var(--text-lg); }

  @media (width < 640px) {
    padding: var(--space-3);
  }
}
```

**Replaces:** Sass, Less, PostCSS nesting plugin

---

## Scroll-Driven Animations - Chrome 115+

**Fade in on scroll:**
```css
.reveal {
  animation: fadeIn linear both;
  animation-timeline: view();
  animation-range: entry 0% cover 50%;
}
```

**Scroll progress bar:**
```css
.progress {
  animation: grow linear both;
  animation-timeline: scroll(root block);
}

@keyframes grow {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}
```

**No JS needed** - Native GPU acceleration

---

## Progressive Enhancement Pattern

**All features use @supports:**

```css
@supports (feature: value) {
  /* Modern feature */
  selector { property: new-value; }
}

@supports not (feature: value) {
  /* Fallback */
  selector { property: old-value; }
}
```

---

## Feature Support by Chrome Version

| Feature | Chrome | Fallback | Migration Cost |
|---------|--------|----------|-----------------|
| if() | 143+ | Base values | Low |
| @scope | 118+ | No isolation | Low |
| Media ranges | 104+ | Works unchanged | None |
| Anchor positioning | 125+ | JS positioning | High savings |
| Container queries | 105+ | Mobile-first | Medium |
| Scroll animations | 115+ | Static | Medium |
| CSS nesting | 120+ | Preprocessor | Low |

---

## Practical Examples

### Compact Mode Toggle

```html
<button onclick="toggleCompact()">Compact Mode</button>

<div class="card">
  <h2>Title</h2>
  <p>Content here</p>
</div>
```

```css
@supports (width: if(style(--x: 1), 10px, 20px)) {
  .card {
    padding: if(style(--compact: true), 1rem, 1.5rem);
  }
}
```

```js
function toggleCompact() {
  const root = document.documentElement;
  const isCompact = root.style.getPropertyValue('--compact') === 'true';
  root.style.setProperty('--compact', isCompact ? 'false' : 'true');
}
```

---

### Tooltip Without JS Library

```html
<button class="tooltip-trigger">Hover me
  <span class="tooltip">I'm a tooltip!</span>
</button>
```

```css
.tooltip-trigger {
  anchor-name: --tip;
  position: relative;
}

.tooltip {
  position: absolute;
  position-anchor: --tip;
  inset-area: top;
  margin-bottom: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: #333;
  color: white;
  opacity: 0;
  transition: opacity 150ms;
  position-try-fallbacks: bottom, left, right;
}

.tooltip-trigger:hover .tooltip {
  opacity: 1;
}
```

**Result:** Smart tooltip that flips if no space above

---

### Responsive Card Grid

```css
.card-grid {
  container-type: inline-size;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

@container (width >= 500px) {
  .card { display: grid; grid-template-columns: 150px 1fr; }
}

@container style(--featured: true) {
  .card { border: 2px solid var(--primary); padding: 2rem; }
}
```

---

### Scoped Component Isolation

```css
@scope (.card) to (.card-content) {
  :scope {
    background: white;
    border-radius: 8px;
    padding: 1rem;
  }

  h2 {
    margin: 0;
    color: #333;
  }

  p {
    color: #666;
    line-height: 1.6;
  }
}

/* .card-content children won't be affected by above styles */
```

---

## Performance Gains

### Anchor Positioning
- **Before:** Popper.js (2-5ms JS calc) + repaints
- **After:** Native CSS (0ms JS) + GPU acceleration

### Scroll Animations
- **Before:** JS scroll listener + RAF callback (55-58fps)
- **After:** Native animation-timeline (60fps+)

### Container Queries
- **Before:** Media queries + layout shift detection JS
- **After:** Pure CSS (@container)

### CSS Nesting
- **Before:** Sass/Less compile step
- **After:** Zero build overhead

---

## Browser DevTools Tips

**Chrome DevTools - Check computed styles with if():**
1. Right-click element > Inspect
2. Go to Computed tab
3. Filter by property name
4. See if() evaluated values

**Test feature support in Console:**
```js
CSS.supports('anchor-name', '--test') // true in Chrome 125+
CSS.supports('width', 'if(style(--x: 1), 10px, 20px)') // true in Chrome 143+
```

---

## File Locations in Project

```
src/
├── app.css                          # Main file with all features
├── lib/
│   ├── motion/
│   │   ├── animations.css           # Keyframe animations + modern media ranges
│   │   ├── scroll-animations.css    # Scroll-driven animations
│   │   └── viewTransitions.css      # View transition API
│   └── styles/
│       └── scoped-patterns.css      # @scope examples & patterns
└── CSS_MODERNIZATION_143.md         # Detailed documentation
```

---

## Quick Wins (Low Risk, High Value)

1. **Media query ranges** - Drop-in replacement, no breaking changes
2. **CSS if()** for theme toggles - Progressive enhancement, no fallback needed
3. **@scope** for new components - Better than BEM, same performance
4. **Anchor positioning** - Replace Popper.js immediately, saves 5KB+ and 2-5ms JS

---

## What NOT to Do (Yet)

- **Safari users?** Skip anchor positioning (Chrome-only for now)
- **Old Chromium?** Below 104? Keep old media syntax alongside
- **Dark mode library?** CSS if() won't replace theme libraries, use for UI density

---

## Need More Help?

- Full docs: `src/CSS_MODERNIZATION_143.md`
- Browser support: https://caniuse.com
- Specifications: Search "CSS [feature name] spec" on drafts.csswg.org

---

## TL;DR Checklist

- [ ] Using tooltips? Switch to anchor positioning (Chrome 125+)
- [ ] Theme toggles? Use CSS if() (Chrome 143+)
- [ ] Many media queries? Update to range syntax (Chrome 104+)
- [ ] New components? Use @scope instead of BEM
- [ ] Responsive cards? Use container queries instead of media queries
- [ ] Scroll effects? Implement with animation-timeline instead of JS

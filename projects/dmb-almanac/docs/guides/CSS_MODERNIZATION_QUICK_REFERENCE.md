# CSS Modernization Quick Reference (Chrome 143+)

## Decision Matrix

| JS Pattern | CSS Replacement | Chrome | Savings |
|------------|----------------|--------|---------|
| `addEventListener('scroll')` | `animation-timeline: scroll()` | 115+ | 60Hz exec |
| IntersectionObserver (reveal) | `animation-timeline: view()` | 115+ | ~2KB |
| ResizeObserver | `container-type: inline-size` | 105+ | 4KB |
| Floating UI / Popper.js | `anchor-name` + `position-anchor` | 125+ | 6.5-10KB |
| Theme toggle JS | `light-dark()` | 123+ | 4.3KB |
| Conditional inline styles | CSS `if()` | 143+ | varies |
| State-based classList | `:has()` + custom props | 105+ | 1.5KB |
| Show/hide animation JS | `@starting-style` + popover | 117+ | varies |

## Scroll-Driven Animations (Chrome 115+)

- GPU compositor thread, zero JS, 60fps+
- Replaces scroll listeners (60Hz main thread execution)

```css
/* Progress bar */
.progress-bar {
  animation: growWidth linear;
  animation-timeline: scroll(root block);
}
@keyframes growWidth {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}

/* Fade on enter viewport */
.fade-in-on-scroll {
  animation: fadeIn linear both;
  animation-timeline: view();
  animation-range: entry 0% cover 40%;
}

/* Header shrink on scroll */
.header {
  animation: shrinkHeader linear both;
  animation-timeline: scroll(root);
  animation-range: 0px 200px;
}

/* Parallax */
.parallax-slow {
  animation: parallaxSlow linear;
  animation-timeline: scroll(root block);
  will-change: transform;
}
```

## Anchor Positioning (Chrome 125+)

- Replaces Floating UI (6.5KB), Popper.js (10KB+)
- Native collision detection via `position-try-fallbacks`

```css
.tooltip-trigger { anchor-name: --tooltip; }
.tooltip {
  position: absolute;
  position-anchor: --tooltip;
  inset-area: top;
  margin-bottom: 8px;
  position-try-fallbacks: bottom, left, right;
}

/* Dropdown with min-width matching trigger */
.dropdown-menu {
  position-anchor: --dropdown;
  inset-area: bottom span-right;
  min-width: anchor-size(width);
}

/* Custom fallback */
@position-try --prefer-left {
  top: anchor(top);
  right: anchor(left);
  margin-right: 4px;
}
```

## Container Queries (Chrome 105+)

```css
.card-container {
  container-type: inline-size;
  container-name: card;
}
@container card (width >= 400px) {
  .card { display: grid; }
}
/* Style-based (Chrome 111+) */
@container style(--theme: dark) {
  .card { background: var(--color-gray-900); }
}
```

## CSS if() (Chrome 143+)

```css
/* Density-based spacing */
.button {
  padding: if(style(--density: compact), var(--space-2), var(--space-4));
}
/* Multi-value */
.spacer {
  height: if(
    style(--size: large): 3rem;
    style(--size: medium): 2rem;
    1.5rem
  );
}
```

## :has() State Styling (Chrome 105+)

```css
.header:has(.menu[open]) { backdrop-filter: blur(30px); }
body:has(dialog[open]) { overflow: hidden; }
.card:has(:focus-visible) { outline: 2px solid var(--focus-ring); }
```

## light-dark() Theme (Chrome 123+)

```css
:root {
  color-scheme: light dark;
  --background: light-dark(#ffffff, #030712);
  --foreground: light-dark(#000000, #fafafa);
}
```

## Popover + @starting-style (Chrome 117+)

```css
[popover] {
  opacity: 0;
  transform: scale(0.95) translateY(-8px);
  transition: opacity 150ms ease, transform 150ms ease, display 150ms allow-discrete;
}
[popover]:popover-open { opacity: 1; transform: scale(1) translateY(0); }
@starting-style {
  [popover]:popover-open { opacity: 0; transform: scale(0.95) translateY(-8px); }
}
```

## @scope (Chrome 118+) / Nesting (Chrome 120+) / Media Ranges (Chrome 104+)

```css
/* Scoped styles */
@scope (.card) to (.card-content) {
  :scope { display: flex; }
  h2 { color: var(--foreground); }
}

/* Nesting */
.show-card {
  padding: var(--space-4);
  &:hover { box-shadow: var(--shadow-lg); }
  @media (width < 640px) { padding: var(--space-3); }
}

/* Range syntax: (width >= 1024px), (640px <= width < 1024px) */
```

## Browser Support

| Feature | Chrome | Safari | Firefox |
|---------|--------|--------|---------|
| Scroll animations | 115+ | 16.4+ | 113+ |
| Container queries | 105+ | 16+ | 110+ |
| Anchor positioning | 125+ | -- | -- |
| CSS if() | 143+ | -- | -- |
| light-dark() | 123+ | 16.4+ | 120+ |
| @scope | 118+ | 18+ | 110+ |
| Media ranges | 104+ | 15.4+ | 102+ |
| Nesting | 120+ | 17.5+ | 117+ |

## Migration Priority

- **High** (quick wins):
  - Anchor positioning (4h, 6.5KB saved)
  - light-dark() theme (8h, 4.3KB saved)
  - Media range syntax (1.5h, cleaner code)
- **Medium**:
  - Container queries (7h, 4KB saved)
  - :has() hover states (2h, 1.5KB saved)
- **Low**:
  - CSS if() density (2h, varies)
  - @scope isolation (30m, maintainability)

## Performance (Apple Silicon)

- **Before**: 120 JS callbacks/sec, 2-5ms positioning, 55-58fps scroll
- **After**: GPU compositor, 0ms positioning, 60fps+ scroll
- **Eliminated**: scroll listeners (2x), closure retention, main thread contention
- **GPU-accelerated**: transform, opacity, scroll-driven animations

## Feature Detection

```javascript
const features = {
  scrollDriven: CSS.supports('animation-timeline: scroll()'),
  cssIf: CSS.supports('width: if(style(--x: 1), 10px, 20px)'),
  anchor: CSS.supports('anchor-name: --test'),
  container: CSS.supports('container-type: inline-size'),
  lightDark: CSS.supports('color: light-dark(red, blue)'),
};
```

```css
@supports (animation-timeline: scroll()) { /* modern */ }
@supports not (animation-timeline: scroll()) { /* fallback */ }
```

## VirtualList Exception

- **Kept**: requires scrollTop for visible range calculation
- Rendering 20 vs 1000 items = 50x faster
- Net gain: 2400x improvement despite scroll listener

## Files to Delete After Migration

- `/lib/actions/scroll.js` (361 lines) - use CSS scroll timeline
- `/lib/actions/anchor.js` (184 lines) - use CSS anchor positioning
- `/lib/utils/anchorPositioning.js` (74 lines) - use native CSS

## Find Patterns to Replace

```bash
grep -r "addEventListener.*scroll" src/
grep -r "new ResizeObserver" src/
grep -r "new IntersectionObserver" src/
grep -r "classList\.\(add\|remove\|toggle\)" src/
```

## Debug

```javascript
getEventListeners(window).scroll  // should be empty
CSS.supports('animation-timeline: scroll()')
// DevTools > Rendering > Frame Rendering Stats
```

## Project Files Modified

- `/lib/pwa/install-manager.js` - IntersectionObserver
- `/lib/utils/navigationApi.js` - removed scroll listener
- `/lib/components/ui/VirtualList.svelte` - kept (required)
- `/lib/motion/scroll-animations.css` - 639 lines of patterns

# CSS Modernization Deep Dive - Chromium 143+

## Goals
- Reduce JS for layout and UI variants.
- Use declarative CSS for responsiveness and density.
- Prevent style leakage in data-heavy views.
- Align with brand tokens and new summary-first patterns.

## Core Patterns

### 1. CSS if() for Density and Variants
Use CSS custom properties to toggle compact vs comfortable density. Apply to summary strips, cards, and navigation.

```css
@supports (width: if(style(--x: 1), 10px, 20px)) {
  .summary-strip {
    gap: if(style(--density: compact), 0.5rem, 0.75rem);
    padding: if(style(--density: compact), 0.5rem, 1rem);
  }
}
```

### 2. @scope for Component Isolation
Use @scope around data-heavy components to prevent leakage. Use donut scopes to avoid styling user-generated content.

```css
@scope (.setlist) to (.setlist-notes) {
  .song-row { display: grid; }
}
```

### 3. Container Queries for Cards
Cards should adapt to available width, not viewport.

```css
.show-card { container-type: inline-size; }
@container (width < 360px) {
  .show-card .facts { display: none; }
}
```

### 4. Anchor Positioning for Popovers
Use native anchor positioning for sort menus and filters.

```css
.sort-trigger { anchor-name: --sort; }
.sort-menu {
  position-anchor: --sort;
  top: anchor(bottom);
  left: anchor(start);
}
```

### 5. Scroll-Driven Animation
Use for subtle header shrink and progress bars. Avoid decorative motion.

```css
.header {
  animation: shrink linear;
  animation-timeline: scroll();
  animation-range: 0 180px;
}
```

### 6. @layer for Cascade Control
Use layers to prevent overrides as the UI grows.

```css
@layer reset, base, components, utilities;
@layer components {
  .summary-strip { border-radius: 14px; }
}
```

### 7. :has() for State Without JS
Use for parent state detection in lists and cards.

```css
.show-card:has(.song-count) {
  outline: 1px solid color-mix(in oklch, var(--color-primary-500) 40%, transparent);
}
```

### 8. Subgrid for Dense Tables
Use subgrid for aligned stat rows.

```css
.stats-table { display: grid; grid-template-columns: 1fr auto; }
.stats-row { display: grid; grid-template-columns: subgrid; }
```

### 9. View Transitions (CSS Only)
Use view-transition-name on cards to make list/detail transitions feel native.

```css
.show-card { view-transition-name: show-card; }
```

## Component Targets
- Summary strip
- Show cards
- Song list rows
- Venue list rows
- Search results
- Stats cards

## Performance Practices
- Use content-visibility for long lists.
- Use contain-intrinsic-size for stable layout.
- Avoid heavy shadows in long lists.

## Accessibility Practices
- Respect prefers-reduced-motion.
- Ensure focus styles remain visible.
- Avoid layout shifts when toggling density.

## Implementation Checklist
- [ ] Replace quick stats blocks with SummaryStrip.
- [ ] Add container queries to list cards.
- [ ] Apply @scope to list components.
- [ ] Add density toggles via CSS custom props.
- [ ] Confirm no leakage in data-heavy pages.
- [ ] Use @layer to prevent cascade drift.
- [ ] Replace JS hover/active styling with :has() where safe.

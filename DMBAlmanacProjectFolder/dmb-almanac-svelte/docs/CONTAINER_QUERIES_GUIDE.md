# CSS Container Queries Implementation Guide
## DMB Almanac App - Component-Level Responsive Design

**Status**: Implemented across core components
**Browser Support**: Chrome 105+, Edge 105+, Safari 16+, Firefox 110+
**Fallback**: @media queries for older browsers via @supports

---

## Overview

This guide documents the CSS Container Queries implementation in the DMB Almanac app. Container queries enable components to respond to their **container width** rather than the viewport width, enabling true component-level responsive design.

### Key Advantages

- **Component Independence**: Components adapt to their parent container, not viewport
- **Reusability**: Same component works in sidebars, main content, cards, grids
- **No JavaScript**: Pure CSS responsive behavior
- **Smaller Bundles**: Eliminates JS resize listeners and complex state management
- **Better Encapsulation**: Styles stay within component scope

---

## Implemented Components

### 1. SongListItem Component

**File**: `/src/lib/components/songs/SongListItem.svelte`

**Container Type**: `inline-size` (responds to container width)

#### Breakpoints

| Container Width | Layout | Key Changes |
|-----------------|--------|-------------|
| < 200px | Extra Small | Minimal padding, stacked badges, small text |
| 200-299px | Small | Single column, vertical badge layout |
| 300-399px | Medium | Horizontal main area, wrapped stats |
| 400-499px | Large | Full horizontal layout, normal spacing |
| 500px+ | Extra Large | Premium layout with larger fonts |

#### CSS Pattern

```css
/* Container context */
.song-card-container {
  container: song-card / inline-size;
  height: 100%;
}

/* Responsive queries */
@container song-card (max-width: 199px) {
  .song-title { font-size: var(--text-sm); }
  .song-stats { flex-direction: column; }
}

@container song-card (min-width: 400px) {
  .song-main { flex-direction: row; }
}

/* Fallback for older browsers */
@supports not (container-type: inline-size) {
  @media (max-width: 639px) { /* mobile */ }
  @media (min-width: 640px) { /* desktop */ }
}
```

**Usage Example**:
```svelte
<div class="song-grid">
  {#each songs as song}
    <SongListItem {song} />
  {/each}
</div>

<style>
  .song-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: var(--space-4);
  }
</style>
```

In this layout:
- Narrow columns (250px): Component uses compact layout
- Wide columns (600px+): Component uses full layout
- **No viewport changes needed** - component adapts automatically!

---

### 2. ShowCard Component

**File**: `/src/lib/components/shows/ShowCard.svelte`

**Container Type**: `inline-size`

#### Multi-Level Responsive Behavior

```
Extra Small (< 280px)    → Vertical stack, centered text
Small (280-399px)        → Horizontal with date on left
Medium (400-549px)       → Standard card layout
Large (550px+)           → Full featured with stats row
Ultra Large (700px+)     → Premium typography
```

#### Container Query Implementation

```css
/* Extra Small: < 280px */
@container show-card (max-width: 279px) {
  .content { flex-direction: column; text-align: center; }
  .date-block { width: 48px; height: 48px; }
  .venue { font-size: var(--text-sm); }
}

/* Small: 280-399px */
@container show-card (min-width: 280px) and (max-width: 399px) {
  .content { flex-wrap: wrap; }
  .date-block { width: 60px; height: 60px; }
  .stats { flex-basis: 100%; }
}

/* Large: 550px+ */
@container show-card (min-width: 550px) {
  .content { align-items: center; }
  .stats { flex-direction: row; gap: var(--space-3); }
}
```

---

### 3. Additional Components with Container Queries

#### Card Component (`/src/lib/components/ui/Card.svelte`)
- **Container**: `card / inline-size`
- **Queries**: Adjusts heading sizes and spacing at < 280px, < 400px, > 400px
- **Use Case**: General purpose card wrapper for content

#### StatCard Component (`/src/lib/components/ui/StatCard.svelte`)
- **Container**: `stat-card / inline-size`
- **Query**: Reduces padding and font size at < 200px
- **Use Case**: Dashboard statistics, KPI cards

#### Table Component (`/src/lib/components/ui/Table.svelte`)
- **Container**: `table / inline-size`
- **Query**: Reduces font size and padding at < 500px
- **Use Case**: Responsive data tables

#### Pagination Component (`/src/lib/components/ui/Pagination.svelte`)
- **Container**: `pagination / inline-size`
- **Query**: Hides page numbers at < 400px, shows nav arrows only
- **Use Case**: Pagination controls

#### EmptyState Component (`/src/lib/components/ui/EmptyState.svelte`)
- **Container**: `empty-state / inline-size`
- **Query**: Reduces icon and font sizes at < 400px
- **Use Case**: Empty state messaging

---

## Container Query Fundamentals

### 1. Establishing a Container

```css
/* Define a container with inline-size (width) queries */
.card {
  container: my-card / inline-size;
  /* OR shorthand: */
  container-type: inline-size;
  container-name: my-card;
}
```

### Container Types

| Type | Queries | Use Case |
|------|---------|----------|
| `inline-size` | Width only | Most common, no layout shift |
| `size` | Width & Height | 2D layouts, aspect-ratio aware |
| `normal` | Style queries only | Style-based queries (Chrome 111+) |

### 2. Querying Containers

```css
/* Min-width query */
@container card (min-width: 400px) {
  .title { font-size: var(--text-lg); }
}

/* Max-width query */
@container card (max-width: 299px) {
  .title { font-size: var(--text-sm); }
}

/* Range query */
@container card (min-width: 300px) and (max-width: 399px) {
  .title { font-size: var(--text-base); }
}

/* Aspect ratio */
@container card (aspect-ratio > 1) {
  .title { position: absolute; }
}
```

### 3. Container Query Units

Use these units to scale with container size:

```css
.element {
  /* cqw: 1% of container width */
  font-size: 4cqw;          /* Scales with width */

  /* cqi: 1% of container inline size (same as cqw in LTR) */
  padding: 5cqi;

  /* cqh: 1% of container height (requires container-type: size) */
  margin: 3cqh;

  /* cqmin/cqmax: Min/max of inline and block */
  gap: 2cqmin;
}
```

**Example**: A card that scales its padding with width:
```css
@container card (min-width: 300px) {
  .content {
    padding: 3cqi 4cqi;  /* Scales with container width */
  }
}
```

---

## Implementation Patterns

### Pattern 1: Simple Responsive Component

```svelte
<script>
  let items = [/* ... */];
</script>

<!-- Component establishes a container -->
<div class="wrapper">
  <div class="grid">
    {#each items as item}
      <div class="card">{item.title}</div>
    {/each}
  </div>
</div>

<style>
  /* Container context */
  .wrapper {
    container: my-grid / inline-size;
  }

  /* Default: large grid */
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: var(--space-4);
  }

  /* Small containers: single column */
  @container my-grid (max-width: 500px) {
    .grid {
      grid-template-columns: 1fr;
    }
  }

  /* Fallback */
  @supports not (container-type: inline-size) {
    @media (max-width: 640px) {
      .grid { grid-template-columns: 1fr; }
    }
  }
</style>
```

### Pattern 2: Typography Scaling

```css
/* Scale typography based on available width */
.card {
  container: card / inline-size;
}

/* Extra small: 200px */
@container card (max-width: 199px) {
  .title { font-size: var(--text-xs); }
  .subtitle { font-size: 10px; }
}

/* Small: 200-299px */
@container card (min-width: 200px) and (max-width: 299px) {
  .title { font-size: var(--text-sm); }
  .subtitle { font-size: var(--text-xs); }
}

/* Medium: 300-399px */
@container card (min-width: 300px) and (max-width: 399px) {
  .title { font-size: var(--text-base); }
  .subtitle { font-size: var(--text-sm); }
}

/* Large: 400px+ */
@container card (min-width: 400px) {
  .title { font-size: var(--text-lg); }
  .subtitle { font-size: var(--text-base); }
}
```

### Pattern 3: Layout Switching

```css
/* Vertical by default */
.card {
  container: card / inline-size;
  display: flex;
  flex-direction: column;
}

/* Switch to horizontal at medium width */
@container card (min-width: 400px) {
  .card {
    flex-direction: row;
    align-items: center;
  }

  .image {
    width: 150px;
    flex-shrink: 0;
  }
}

/* Grid layout at large width */
@container card (min-width: 600px) {
  .card {
    display: grid;
    grid-template-columns: 150px 1fr auto;
    gap: var(--space-4);
  }
}
```

### Pattern 4: Style-Based Queries (Chrome 111+)

```css
/* Query custom properties - requires container-type: normal */
.theme-wrapper {
  container-type: normal;
  container-name: theme;
}

/* Respond to theme custom property */
@container theme style(--theme: dark) {
  .card {
    background: var(--color-gray-900);
    color: white;
  }
}

@container theme style(--layout: featured) {
  .card {
    grid-column: span 2;
    font-size: var(--text-lg);
  }
}
```

Usage:
```svelte
<div class="theme-wrapper" style="--theme: dark; --layout: featured;">
  <!-- Card adapts based on custom properties -->
</div>
```

---

## Best Practices

### 1. Container Naming Convention

```css
/* Use descriptive names matching component purpose */
.button-group {
  container: button-group / inline-size;
}

.card-list {
  container: card-list / inline-size;
}

.dashboard-widget {
  container: widget / inline-size;
}

/* Generic patterns */
.grid-container {
  container: grid / inline-size;
}
```

### 2. Organize Breakpoints

```css
/* Group queries by component, from small to large */
@container card (max-width: 199px) { }
@container card (min-width: 200px) and (max-width: 299px) { }
@container card (min-width: 300px) and (max-width: 399px) { }
@container card (min-width: 400px) { }
```

### 3. Always Provide Fallbacks

```css
/* Main container query */
@container card (min-width: 400px) {
  .content { flex-direction: row; }
}

/* Fallback for unsupported browsers */
@supports not (container-type: inline-size) {
  @media (min-width: 640px) {
    .content { flex-direction: row; }
  }
}
```

### 4. Avoid Nesting Container Contexts

```css
/* Good: Simple hierarchy */
.outer-card {
  container: outer / inline-size;
}

.inner-content {
  container: inner / inline-size;
}

/* Queries apply to nearest ancestor container */
@container (min-width: 400px) {
  .element { /* matches inner or outer */ }
}

@container inner (min-width: 400px) {
  .element { /* matches inner specifically */ }
}
```

### 5. Use Container Query Units Wisely

```css
/* Good: Relative sizing */
.card {
  container: card / inline-size;
  padding: 3cqi;  /* Scales with container */
}

/* Avoid: Over-reliance on cq units */
.card {
  width: 50cqi;   /* Can cause layout issues */
  height: 50cqh;  /* Only if container-type: size */
}
```

---

## Migration Guide: From Media Queries to Container Queries

### Before (Media Query)

```css
/* Responds to viewport only */
@media (max-width: 640px) {
  .card { flex-direction: column; }
}

@media (min-width: 641px) {
  .card { flex-direction: row; }
}
```

**Problem**: All cards respond to viewport, even if in wide sidebar

### After (Container Query)

```css
/* Responds to parent container */
.card-wrapper {
  container: card / inline-size;
}

@container card (max-width: 300px) {
  .card { flex-direction: column; }
}

@container card (min-width: 301px) {
  .card { flex-direction: row; }
}
```

**Solution**: Each card responds to its actual width, works everywhere

---

## Common Patterns & Use Cases

### Sidebar-Aware Components

```css
/* Same component, different layouts depending on sidebar state */
.article {
  container: article / inline-size;
}

/* In narrow sidebar (300px) */
@container article (max-width: 350px) {
  .content { font-size: var(--text-sm); }
  .media { display: none; }
}

/* In main area (600px+) */
@container article (min-width: 600px) {
  .content { columns: 2; }
  .media { margin: var(--space-4) 0; }
}
```

### Responsive Grid Layout

```css
.gallery {
  container: gallery / inline-size;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--space-4);
}

/* Adjust image aspect ratio based on container */
@container gallery (max-width: 500px) {
  .gallery-image { aspect-ratio: 1; }
}

@container gallery (min-width: 500px) {
  .gallery-image { aspect-ratio: 16 / 9; }
}
```

### Adaptive Header

```css
.header {
  container: header / inline-size;
}

/* Minimal header in narrow space */
@container header (max-width: 300px) {
  .nav { display: none; }
  .logo { width: 32px; }
}

/* Full header in wide space */
@container header (min-width: 600px) {
  .nav { display: flex; }
  .logo { width: 48px; }
  .nav-text { display: inline; }
}
```

### Responsive Data Table

```css
.table-wrapper {
  container: table / inline-size;
  overflow-x: auto;
}

/* Hide columns on narrow tables */
@container table (max-width: 600px) {
  .column-optional { display: none; }
  .cell { padding: var(--space-2); }
}

/* Show all columns on wide tables */
@container table (min-width: 1000px) {
  .cell { padding: var(--space-4); }
}
```

---

## Performance Considerations

### 1. Layout Shift Prevention

Container queries have minimal impact on performance:
- No JavaScript needed
- No resize listeners
- Pure CSS changes
- Minimal repaints

### 2. CSS Size

The container query syntax adds minimal CSS:
```css
/* Small overhead */
.wrapper { container: wrapper / inline-size; }  /* ~40 bytes per component */
@container wrapper (min-width: 400px) { }       /* ~35 bytes per query */
```

### 3. Browser Optimization

Modern browsers (Chrome 105+) optimize container queries:
- Efficient layout calculations
- Minimal reflow
- GPU acceleration compatible
- Works with `will-change`

---

## Browser Support & Testing

### Browser Coverage

| Browser | Version | Support |
|---------|---------|---------|
| Chrome | 105+ | Full support |
| Edge | 105+ | Full support |
| Safari | 16+ | Full support |
| Firefox | 110+ | Full support |
| Opera | 91+ | Full support |

### Testing Approach

```svelte
<!-- Test at different container widths -->
<div class="test-container" style="width: 200px;">
  <YourComponent />
</div>

<div class="test-container" style="width: 400px;">
  <YourComponent />
</div>

<div class="test-container" style="width: 600px;">
  <YourComponent />
</div>

<style>
  .test-container {
    border: 1px dashed red;
    resize: horizontal;
    overflow: hidden;
  }
</style>
```

### Fallback Testing

```css
/* Verify fallbacks render correctly */
@supports not (container-type: inline-size) {
  /* These styles apply if no container query support */
  @media (max-width: 640px) {
    .card { flex-direction: column; }
  }
}
```

---

## Debugging Container Queries

### Chrome DevTools

1. Inspect element with container
2. Check "Styles" panel
3. Look for `@container` rules
4. Verify container context in DOM

### Firefox DevTools

1. Inspector → Style Editor
2. Search for `@container`
3. Resize browser or use responsive view
4. Watch styles update

### Common Issues

**Issue**: Container query not applying
```css
/* Wrong: Container outside query scope */
.parent { container: my-container / inline-size; }
.child { /* Cannot query .parent */ }

/* Right: Query matches closest ancestor */
.parent {
  container: my-container / inline-size;
}

.parent > .child {
  @container my-container (min-width: 400px) { }
}
```

**Issue**: Nested containers causing confusion
```css
/* Use specific names to clarify intent */
.outer { container: outer-card / inline-size; }
.inner { container: inner-content / inline-size; }

/* Query specific container */
@container outer-card (min-width: 500px) { }
@container inner-content (min-width: 300px) { }
```

---

## References

- [MDN: CSS Container Queries](https://developer.mozilla.org/en-US/docs/Web/CSS/container-query-rules)
- [CSS Tricks: A Primer on Container Queries](https://css-tricks.com/a-primer-on-container-queries/)
- [Chrome DevTools: Container Queries](https://developer.chrome.com/docs/devtools/css-in-container-queries/)
- [Can I Use: Container Queries](https://caniuse.com/container-queries)
- [W3C Spec: CSS Containment Module Level 3](https://drafts.csswg.org/css-contain-3/)

---

## Summary

Container queries enable true component-level responsive design in the DMB Almanac app:

1. **Components respond to their container**, not viewport
2. **No JavaScript** needed for responsive behavior
3. **Better reusability** - same component works in any layout
4. **Graceful degradation** - media query fallbacks included
5. **Future-proof** - standard CSS feature with broad browser support

Implement container queries for:
- Card-based components
- Grid layouts
- Tables and data displays
- Navigation elements
- Content blocks
- Dashboard widgets

All major DMB Almanac components now use container queries with fallbacks!

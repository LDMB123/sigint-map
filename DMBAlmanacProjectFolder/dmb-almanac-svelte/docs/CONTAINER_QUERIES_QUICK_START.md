# Container Queries - Quick Start Guide
## DMB Almanac App

---

## What are Container Queries?

Container queries allow components to respond to their **parent container width** instead of viewport width.

```css
/* OLD: Responds to viewport (all cards act the same) */
@media (max-width: 640px) {
  .card { font-size: small; }
}

/* NEW: Responds to container (each card adapts to its width) */
@container card (max-width: 300px) {
  .card { font-size: small; }
}
```

---

## Quick Example

```svelte
<div class="wrapper">
  <div class="card">
    <h3>Title</h3>
    <p>Content</p>
  </div>
</div>

<style>
  /* Step 1: Define container */
  .wrapper {
    container: card / inline-size;
  }

  /* Step 2: Query container */
  @container card (max-width: 300px) {
    .card { flex-direction: column; }
  }

  @container card (min-width: 301px) {
    .card { flex-direction: row; }
  }

  /* Step 3: Add fallback for older browsers */
  @supports not (container-type: inline-size) {
    @media (max-width: 640px) {
      .card { flex-direction: column; }
    }
  }
</style>
```

---

## 3-Step Implementation

### Step 1: Add Container to Parent

```css
.my-component-wrapper {
  container: my-component / inline-size;
}
```

### Step 2: Write Queries

```css
/* Small containers */
@container my-component (max-width: 300px) {
  .content { font-size: small; }
}

/* Large containers */
@container my-component (min-width: 301px) {
  .content { font-size: large; }
}
```

### Step 3: Add Fallback

```css
@supports not (container-type: inline-size) {
  @media (max-width: 640px) {
    .content { font-size: small; }
  }
  @media (min-width: 641px) {
    .content { font-size: large; }
  }
}
```

---

## Common Breakpoints

```css
/* Use these breakpoints for consistency */

/* Extra small: Narrow sidebars, mobile */
@container comp (max-width: 199px) { }

/* Small: Narrow columns, sidebars */
@container comp (min-width: 200px) and (max-width: 299px) { }

/* Medium: Grid columns, standard width */
@container comp (min-width: 300px) and (max-width: 399px) { }

/* Large: Main content area */
@container comp (min-width: 400px) and (max-width: 599px) { }

/* Extra large: Full width, featured sections */
@container comp (min-width: 600px) { }
```

---

## Available Queries

```css
/* Single condition */
@container comp (min-width: 400px) { }
@container comp (max-width: 300px) { }

/* Range */
@container comp (min-width: 300px) and (max-width: 399px) { }

/* Aspect ratio (requires container-type: size) */
@container comp (aspect-ratio > 1) { }

/* Orientation */
@container comp (orientation: landscape) { }
```

---

## Naming Convention

```css
/* Use descriptive names matching component purpose */

/* UI Components */
.card-wrapper { container: card / inline-size; }
.button-group { container: button-group / inline-size; }
.modal-content { container: modal / inline-size; }

/* Layout Components */
.sidebar { container: sidebar / inline-size; }
.main-content { container: main / inline-size; }
.grid-wrapper { container: grid / inline-size; }

/* Feature Components */
.article-block { container: article / inline-size; }
.gallery-section { container: gallery / inline-size; }
.footer-area { container: footer / inline-size; }
```

---

## Real-World Example: Song List Item

**File**: `/src/lib/components/songs/SongListItem.svelte`

```svelte
<script>
  let { song } = $props();
</script>

<a href={`/songs/${song.slug}`} class="song-link">
  <div class="song-card-container">  {/* ← Container */}
    <div class="song-card">
      <h3 class="song-title">{song.title}</h3>
      <span class="count">{song.totalPerformances} plays</span>
    </div>
  </div>
</a>

<style>
  .song-card-container {
    container: song-card / inline-size;
  }

  /* Base styles */
  .song-card {
    padding: var(--space-3);
  }

  .song-title {
    font-size: var(--text-base);
  }

  /* Extra small: < 200px */
  @container song-card (max-width: 199px) {
    .song-card { padding: var(--space-2); }
    .song-title { font-size: var(--text-xs); }
  }

  /* Small: 200-299px */
  @container song-card (min-width: 200px) and (max-width: 299px) {
    .song-card { padding: var(--space-2); }
    .song-title { font-size: var(--text-sm); }
  }

  /* Medium: 300px+ */
  @container song-card (min-width: 300px) {
    .song-card { padding: var(--space-4); }
    .song-title { font-size: var(--text-base); }
  }

  /* Fallback for older browsers */
  @supports not (container-type: inline-size) {
    @media (max-width: 640px) {
      .song-card { padding: var(--space-2); }
      .song-title { font-size: var(--text-sm); }
    }
    @media (min-width: 641px) {
      .song-card { padding: var(--space-4); }
      .song-title { font-size: var(--text-base); }
    }
  }
</style>
```

---

## Using in Layouts

### Grid Layout
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

  /* Cards automatically adapt to column width!
     - Column 250px: Shows small layout
     - Column 400px: Shows medium layout
     - Column 600px: Shows large layout
     No viewport changes needed! */
</style>
```

### Sidebar Layout
```svelte
<div class="layout">
  <aside style="width: 300px;">
    <SongListItem {song} />  {/* Auto uses 300px layout */}
  </aside>

  <main style="width: 600px;">
    <SongListItem {song} />  {/* Auto uses 600px layout */}
  </main>
</div>

<!-- Same component, different widths, different layouts! */
```

---

## Browser Support

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | 105+ | ✓ Full Support |
| Edge | 105+ | ✓ Full Support |
| Safari | 16+ | ✓ Full Support |
| Firefox | 110+ | ✓ Full Support |
| Older versions | < 105 | Fallback to @media |

---

## Checklist for New Components

When creating a responsive component:

- [ ] Add `container: component-name / inline-size;` to wrapper
- [ ] Define responsive breakpoints (200px, 300px, 400px, etc.)
- [ ] Test at each breakpoint using browser resize
- [ ] Add `@supports not` fallback with media queries
- [ ] Use consistent naming convention
- [ ] Document breakpoint behavior in comments
- [ ] Test in different layout contexts (grid, sidebar, modal)

---

## Common Issues & Solutions

### Issue: Breakpoint not triggering

```css
/* ✗ Wrong: Container inside query scope */
@container card (min-width: 400px) {
  .card { flex-direction: row; }
}

/* ✓ Correct: Query targets ancestor container */
.wrapper { container: card / inline-size; }

.wrapper > .card {
  @container card (min-width: 400px) {
    flex-direction: row;
  }
}
```

### Issue: Conflicting with media queries

```css
/* ✓ Use container queries in addition to, not instead of, media queries */
@container card (min-width: 400px) {
  .card { flex-direction: row; }
}

@media (min-width: 1200px) {
  /* Separate layout-level queries can still exist */
  .main { columns: 2; }
}
```

### Issue: Nested containers

```css
/* ✓ Use explicit names to avoid confusion */
.outer { container: outer-card / inline-size; }
.inner { container: inner-card / inline-size; }

/* Query specific container */
@container outer-card (min-width: 500px) { }
@container inner-card (min-width: 200px) { }
```

---

## Performance Tips

1. **Avoid excessive nesting**: Keep container hierarchy shallow
2. **Use mobile-first approach**: Base styles for small, add large breakpoints
3. **Reuse breakpoints**: Stick to consistent widths across components
4. **Test performance**: Use Chrome DevTools Performance tab
5. **Consider fallbacks**: Media queries provide good fallback behavior

---

## Container Query Units

Container queries also support special units:

```css
.element {
  /* cqw: 1% of container width */
  font-size: 4cqw;

  /* cqi: 1% of container inline size (width in LTR) */
  padding: 3cqi;

  /* cqh: 1% of container height (requires container-type: size) */
  margin: 5cqh;

  /* cqmin/cqmax: Min/max of inline and block */
  gap: 2cqmin;
}
```

**Note**: Rarely used in this app. Stick to fixed sizes for predictability.

---

## Documentation Files

- **Comprehensive Guide**: `/docs/CONTAINER_QUERIES_GUIDE.md`
- **Code Examples**: `/docs/CONTAINER_QUERIES_EXAMPLES.md`
- **Implementation Summary**: `/docs/CONTAINER_QUERIES_IMPLEMENTATION_SUMMARY.md`
- **This Quick Start**: `/docs/CONTAINER_QUERIES_QUICK_START.md`

---

## References

- [MDN: CSS Container Queries](https://developer.mozilla.org/en-US/docs/Web/CSS/container-query-rules)
- [Can I Use: Container Queries](https://caniuse.com/container-queries)
- [Web.dev: Container Queries Introduction](https://web.dev/css-container-queries/)

---

## Summary

Container queries enable **component-level responsive design**:

1. Add `container: name / inline-size;` to wrapper
2. Write `@container name (query) { }` rules
3. Add `@supports not` fallback with media queries
4. Components now adapt to their width, not viewport

**Result**: Same component works in any layout context automatically!

Questions? See the comprehensive guide at `/docs/CONTAINER_QUERIES_GUIDE.md`

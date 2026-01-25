# Container Query Implementation Guide

**Ready-to-use code examples for DMB Almanac Svelte**

---

## Quick Reference

### Pattern Template

Use this pattern for all conversions:

```svelte
<style>
  /* Step 1: Add container type */
  .wrapper {
    container-type: inline-size;
    container-name: descriptive-name;
  }

  /* Step 2: Convert @media to @container */
  @container descriptive-name (max-width: 400px) {
    .element {
      /* styles */
    }
  }

  /* Step 3: Add fallback */
  @supports not (container-type: inline-size) {
    @media (max-width: 640px) {
      .element {
        /* same styles as @container */
      }
    }
  }
</style>
```

---

## Component Implementations

### 1. StatCard.svelte - Complete Example

**Current file location:** `src/lib/components/ui/StatCard.svelte`

**Replace the style block (lines 75-452) with:**

```svelte
<style>
  .stat-card {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    padding: var(--space-4);
    background: var(--background-secondary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-xl);
    text-decoration: none;
    color: inherit;
    position: relative;
    overflow: hidden;

    /* GPU acceleration */
    transform: translateZ(0);
    backface-visibility: hidden;

    /* NEW: Container queries */
    container-type: inline-size;
    container-name: stat-card;
  }

  /* Interactive (link) variant */
  .stat-card.interactive {
    cursor: pointer;
    transition:
      transform var(--transition-fast) var(--ease-spring),
      box-shadow var(--transition-fast) var(--ease-smooth),
      border-color var(--transition-fast),
      background var(--transition-fast);
  }

  .stat-card.interactive:hover {
    transform: translate3d(0, -2px, 0);
    box-shadow: var(--shadow-md);
    border-color: var(--color-primary-300);
    background: linear-gradient(
      to bottom,
      var(--background),
      color-mix(in oklch, var(--color-primary-50) 40%, var(--background))
    );
  }

  .stat-card.interactive:active {
    transform: translate3d(0, 0, 0);
    transition-duration: var(--duration-instant);
  }

  /* Icon container */
  .icon-container {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    background: var(--background-tertiary);
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-color);
  }

  .icon-container :global(svg) {
    width: 24px;
    height: 24px;
    color: var(--foreground-secondary);
  }

  /* Content */
  .content {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    flex: 1;
  }

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
  }

  .label {
    font-size: var(--text-sm);
    color: var(--foreground-secondary);
    text-transform: uppercase;
    letter-spacing: var(--tracking-wider);
    font-weight: var(--font-medium);
  }

  .value-container {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .value {
    font-size: var(--text-3xl);
    font-weight: var(--font-extrabold);
    color: var(--foreground);
    line-height: var(--leading-none);
    letter-spacing: var(--tracking-tight);
  }

  .subtitle {
    font-size: var(--text-sm);
    color: var(--foreground-muted);
  }

  /* Trend indicator */
  .trend {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    font-size: var(--text-xs);
    font-weight: var(--font-semibold);
    padding: 2px 6px;
    border-radius: var(--radius-full);
  }

  .trend-up {
    color: var(--color-secondary-700);
    background-color: var(--color-success-bg);
  }

  .trend-down {
    color: var(--color-primary-800);
    background-color: var(--color-error-bg);
  }

  .trend-neutral {
    color: var(--foreground-muted);
    background-color: var(--background-tertiary);
  }

  .trend-value {
    font-weight: var(--font-bold);
  }

  /* Size variants */
  .sm {
    padding: var(--space-3);
    gap: var(--space-2);
  }

  .sm .icon-container {
    width: 36px;
    height: 36px;
  }

  .sm .icon-container :global(svg) {
    width: 18px;
    height: 18px;
  }

  .sm .value {
    font-size: var(--text-2xl);
  }

  .sm .label {
    font-size: var(--text-xs);
  }

  .md {
    padding: var(--space-4);
  }

  .lg {
    padding: var(--space-6);
    gap: var(--space-4);
  }

  .lg .icon-container {
    width: 64px;
    height: 64px;
  }

  .lg .icon-container :global(svg) {
    width: 32px;
    height: 32px;
  }

  .lg .value {
    font-size: var(--text-4xl);
  }

  .lg .label {
    font-size: var(--text-base);
  }

  /* Color variants */
  .primary {
    border-color: var(--color-primary-200);
    background: linear-gradient(
      to bottom,
      color-mix(in oklch, var(--color-primary-50) 60%, var(--background)),
      color-mix(in oklch, var(--color-primary-100) 50%, var(--background))
    );
  }

  .primary .value {
    color: var(--color-primary-700);
  }

  .primary .icon-container {
    background-color: var(--color-primary-100);
    border-color: var(--color-primary-200);
  }

  .primary .icon-container :global(svg) {
    color: var(--color-primary-600);
  }

  .secondary {
    border-color: var(--color-secondary-200);
    background: linear-gradient(
      to bottom,
      color-mix(in oklch, var(--color-secondary-50) 60%, var(--background)),
      color-mix(in oklch, var(--color-secondary-100) 50%, var(--background))
    );
  }

  .secondary .value {
    color: var(--color-secondary-700);
  }

  .secondary .icon-container {
    background-color: var(--color-secondary-100);
    border-color: var(--color-secondary-200);
  }

  .secondary .icon-container :global(svg) {
    color: var(--color-secondary-600);
  }

  .success {
    border-color: var(--color-success);
    background: linear-gradient(
      to bottom,
      var(--color-success-bg),
      color-mix(in oklch, var(--color-success-bg) 80%, var(--background))
    );
  }

  .success .value {
    color: var(--color-success);
  }

  .success .icon-container {
    background-color: var(--color-success-bg);
    border-color: var(--color-success);
  }

  .success .icon-container :global(svg) {
    color: var(--color-success);
  }

  .warning {
    border-color: var(--color-warning);
    background: linear-gradient(
      to bottom,
      var(--color-warning-bg),
      color-mix(in oklch, var(--color-warning-bg) 80%, var(--background))
    );
  }

  .warning .value {
    color: var(--color-warning);
  }

  .warning .icon-container {
    background-color: var(--color-warning-bg);
    border-color: var(--color-warning);
  }

  .warning .icon-container :global(svg) {
    color: var(--color-warning);
  }

  /* Focus state */
  .stat-card.interactive:focus-visible {
    outline: 2px solid var(--color-primary-500);
    outline-offset: 2px;
  }

  /* Dark mode */
  @media (prefers-color-scheme: dark) {
    .stat-card {
      background: linear-gradient(
        to bottom,
        var(--color-gray-800),
        var(--color-gray-900)
      );
      border-color: var(--color-gray-700);
    }

    .icon-container {
      background-color: var(--color-gray-800);
      border-color: var(--color-gray-700);
    }

    .primary {
      background: linear-gradient(
        to bottom,
        color-mix(in oklch, var(--color-primary-900) 30%, var(--background)),
        color-mix(in oklch, var(--color-primary-900) 20%, var(--background))
      );
    }

    .primary .value {
      color: var(--color-primary-400);
    }

    .secondary {
      background: linear-gradient(
        to bottom,
        color-mix(in oklch, var(--color-secondary-900) 30%, var(--background)),
        color-mix(in oklch, var(--color-secondary-900) 20%, var(--background))
      );
    }

    .secondary .value {
      color: var(--color-secondary-400);
    }

    .trend-up {
      color: var(--color-secondary-300);
      background-color: color-mix(in oklch, var(--color-success) 20%, transparent);
    }

    .trend-down {
      color: var(--color-primary-300);
      background-color: color-mix(in oklch, var(--color-error) 20%, transparent);
    }
  }

  /* NEW: Container queries for responsive sizing */
  @container stat-card (max-width: 320px) {
    .stat-card {
      padding: var(--space-3);
    }

    .value {
      font-size: var(--text-2xl);
    }

    .lg .value {
      font-size: var(--text-3xl);
    }
  }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .stat-card.interactive {
      transition: none;
    }

    .stat-card.interactive:hover,
    .stat-card.interactive:active {
      transform: none;
    }
  }

  /* High contrast mode */
  @media (forced-colors: active) {
    .stat-card {
      border: 2px solid CanvasText;
    }

    .stat-card.interactive:focus-visible {
      outline: 2px solid Highlight;
    }
  }

  /* NEW: Fallback for browsers without container queries */
  @supports not (container-type: inline-size) {
    @media (max-width: 480px) {
      .stat-card {
        padding: var(--space-3);
      }

      .value {
        font-size: var(--text-2xl);
      }

      .lg .value {
        font-size: var(--text-3xl);
      }
    }
  }
</style>
```

---

### 2. Table.svelte - Complete Example

**Current file location:** `src/lib/components/ui/Table.svelte`

**Changes needed:**

1. Add to `.table-wrapper` (around line 154):
```svelte
<style>
  .table-wrapper {
    width: 100%;
    overflow-x: auto;
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-color);
    background: var(--background);
    box-shadow: var(--shadow-sm);
    -webkit-overflow-scrolling: touch;

    /* NEW: Container queries */
    container-type: inline-size;
    container-name: table;
  }
```

2. Replace responsive section (around line 305-319) with:
```svelte
  /* NEW: Container queries for responsive layout */
  @container table (max-width: 640px) {
    .table-wrapper {
      border-radius: var(--radius-md);
    }

    .table {
      font-size: var(--text-xs);
    }

    .table-header-cell,
    .table-cell {
      padding: var(--space-2) var(--space-3);
    }
  }

  /* NEW: Fallback for browsers without container queries */
  @supports not (container-type: inline-size) {
    @media (max-width: 640px) {
      .table-wrapper {
        border-radius: var(--radius-md);
      }

      .table {
        font-size: var(--text-xs);
      }

      .table-header-cell,
      .table-cell {
        padding: var(--space-2) var(--space-3);
      }
    }
  }
```

---

### 3. EmptyState.svelte - Complete Example

**Current file location:** `src/lib/components/ui/EmptyState.svelte`

**Changes needed:**

1. Add to `.empty-state` (around line 49):
```svelte
<style>
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-6);
    padding: var(--space-12) var(--space-4);
    text-align: center;
    min-height: 320px;
    animation: fadeIn var(--transition-slow) var(--ease-out-expo);

    /* NEW: Container queries */
    container-type: inline-size;
    container-name: empty-state;
  }
```

2. Replace responsive section (around line 140-150) with:
```svelte
  /* NEW: Container queries for responsive layout */
  @container empty-state (max-width: 640px) {
    .empty-state {
      padding: var(--space-8) var(--space-4);
      min-height: 280px;
    }

    .icon {
      width: 64px;
      height: 64px;
    }

    .icon-emoji {
      font-size: var(--text-3xl);
    }

    .title {
      font-size: var(--text-xl);
    }

    .description {
      font-size: var(--text-sm);
    }
  }

  /* NEW: Fallback for browsers without container queries */
  @supports not (container-type: inline-size) {
    @media (max-width: 640px) {
      .empty-state {
        padding: var(--space-8) var(--space-4);
        min-height: 280px;
      }

      .icon {
        width: 64px;
        height: 64px;
      }

      .icon-emoji {
        font-size: var(--text-3xl);
      }

      .title {
        font-size: var(--text-xl);
      }

      .description {
        font-size: var(--text-sm);
      }
    }
  }
```

---

### 4. ShowCard.svelte - Complete Example

**Current file location:** `src/lib/components/shows/ShowCard.svelte`

**Changes needed:**

1. Add container to `.content` (around line 191):
```svelte
  .content {
    display: flex;
    gap: var(--space-4);
    align-items: flex-start;
    padding: var(--space-4);

    /* NEW: Container queries */
    container-type: inline-size;
    container-name: show-card;
  }
```

2. Replace responsive section (around line 264-277) with:
```svelte
  /* NEW: Container queries for responsive layout */
  @container show-card (max-width: 500px) {
    .content {
      flex-wrap: wrap;
    }

    .date-block {
      width: 60px;
      height: 60px;
    }

    .day {
      font-size: var(--text-2xl);
    }

    .month {
      font-size: var(--text-xs);
    }

    .year {
      opacity: 0.7;
    }
  }

  /* NEW: Fallback for browsers without container queries */
  @supports not (container-type: inline-size) {
    @media (max-width: 768px) {
      .content {
        flex-wrap: wrap;
      }

      .date-block {
        width: 60px;
        height: 60px;
      }

      .day {
        font-size: var(--text-2xl);
      }

      .month {
        font-size: var(--text-xs);
      }

      .year {
        opacity: 0.7;
      }
    }
  }
```

---

## Route Page Implementations

### Liberation Page Example

**Current file location:** `src/routes/liberation/+page.svelte`

**Step 1:** Add container type to `.listContainer` (around line 243):
```svelte
  .listContainer {
    background: var(--background);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-xl);
    overflow: hidden;

    /* NEW: Container queries */
    container-type: inline-size;
    container-name: liberation-list;
  }
```

**Step 2:** Add container type to `.container` (around line 138):
```svelte
  .container {
    max-width: var(--max-width);
    margin: 0 auto;
    padding: var(--space-6) var(--space-4);

    /* NEW: Container queries */
    container-type: inline-size;
    container-name: liberation-page;
  }
```

**Step 3:** Replace media queries (around line 375-422) with:
```svelte
  /* NEW: Container queries for list layout */
  @container liberation-list (max-width: 900px) {
    .listHeader {
      display: none;
    }

    .listItem {
      grid-template-columns: 40px 1fr;
      grid-template-rows: auto auto;
      gap: var(--space-2);
    }

    .itemRank {
      grid-row: span 2;
      align-self: center;
    }

    .itemDays,
    .itemShows {
      flex-direction: row;
      gap: var(--space-1);
    }

    .itemLast {
      grid-column: 2;
      flex-direction: row;
      gap: var(--space-2);
      align-items: center;
    }
  }

  /* Container queries for page layout */
  @container liberation-page (max-width: 768px) {
    .title {
      font-size: var(--text-3xl);
    }

    .quickStats {
      gap: var(--space-4);
      padding: var(--space-4);
    }

    .statValue {
      font-size: var(--text-2xl);
    }
  }

  /* NEW: Fallback for browsers without container queries */
  @supports not (container-type: inline-size) {
    @media (max-width: 900px) {
      .listHeader {
        display: none;
      }

      .listItem {
        grid-template-columns: 40px 1fr;
        grid-template-rows: auto auto;
        gap: var(--space-2);
      }

      .itemRank {
        grid-row: span 2;
        align-self: center;
      }

      .itemDays,
      .itemShows {
        flex-direction: row;
        gap: var(--space-1);
      }

      .itemLast {
        grid-column: 2;
        flex-direction: row;
        gap: var(--space-2);
        align-items: center;
      }
    }

    @media (max-width: 768px) {
      .title {
        font-size: var(--text-3xl);
      }

      .quickStats {
        gap: var(--space-4);
        padding: var(--space-4);
      }

      .statValue {
        font-size: var(--text-2xl);
      }
    }
  }
```

---

### Homepage Example

**Current file location:** `src/routes/+page.svelte`

**Step 1:** Add container type to `.show-list` (around line 210):
```svelte
  .show-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);

    /* NEW: Container queries */
    container-type: inline-size;
    container-name: show-list;
  }
```

**Step 2:** Add container type to `.container` (around line 108):
```svelte
  .container {
    max-width: var(--max-width);
    margin: 0 auto;
    padding: var(--space-6) var(--space-4);

    /* NEW: Container queries */
    container-type: inline-size;
    container-name: home-page;
  }
```

**Step 3:** Replace media queries (around line 326-347) with:
```svelte
  /* NEW: Container queries for show list */
  @container show-list (max-width: 500px) {
    .show-card {
      flex-wrap: wrap;
    }

    .show-details {
      order: 2;
      width: 100%;
    }

    .show-songs {
      order: 1;
    }
  }

  /* Container queries for page layout */
  @container home-page (max-width: 768px) {
    .hero-title {
      font-size: var(--text-4xl);
    }

    .hero-subtitle {
      font-size: var(--text-lg);
    }
  }

  /* NEW: Fallback for browsers without container queries */
  @supports not (container-type: inline-size) {
    @media (max-width: 768px) {
      .hero-title {
        font-size: var(--text-4xl);
      }

      .hero-subtitle {
        font-size: var(--text-lg);
      }

      .show-card {
        flex-wrap: wrap;
      }

      .show-details {
        order: 2;
        width: 100%;
      }

      .show-songs {
        order: 1;
      }
    }
  }
```

---

## Testing Templates

### Component Testing

Create a test file to verify container queries work at different widths:

```svelte
<!-- src/lib/components/testing/ContainerQueryTest.svelte -->
<script lang="ts">
  import StatCard from '$lib/components/ui/StatCard.svelte';
  let containerWidth = 400;
</script>

<div class="test-wrapper">
  <h2>StatCard Container Query Test</h2>

  <div class="width-display">
    Container width: {containerWidth}px
    <input
      type="range"
      min="200"
      max="800"
      bind:value={containerWidth}
    />
  </div>

  <div class="test-container" style="width: {containerWidth}px">
    <StatCard
      label="Total Shows"
      value={2547}
      subtitle="All time"
      variant="primary"
    />
  </div>
</div>

<style>
  .test-wrapper {
    padding: var(--space-6);
    background: var(--background-secondary);
    border-radius: var(--radius-lg);
    margin: var(--space-4);
  }

  .width-display {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    margin-bottom: var(--space-4);
    font-weight: var(--font-semibold);
  }

  .width-display input {
    flex: 1;
  }

  .test-container {
    transition: width 200ms ease;
    border: 2px dashed var(--border-color);
    padding: var(--space-4);
    background: var(--background);
  }
</style>
```

---

## Debugging Container Queries

### Chrome DevTools

1. Open DevTools (F12)
2. Go to **Styles** panel
3. Click on element with `container-type`
4. Right-click on `@container` rule
5. Select **Show container query boundaries**

### Logging container size

```svelte
<script lang="ts">
  let containerElement: HTMLElement;
  let width = 0;

  $effect(() => {
    if (!containerElement) return;

    const observer = new ResizeObserver(([entry]) => {
      width = entry.contentRect.width;
      console.log(`Container width: ${width}px`);
    });

    observer.observe(containerElement);
    return () => observer.disconnect();
  });
</script>

<div bind:this={containerElement} class="container">
  <!-- content -->
  {#if width > 0}
    <p>Debug: Container is {width}px wide</p>
  {/if}
</div>
```

---

## Migration Checklist

For each file converted:

- [ ] Add `container-type: inline-size`
- [ ] Add `container-name: [descriptive-name]`
- [ ] Convert all `@media (max-width/min-width)` to `@container`
- [ ] Keep breakpoints the same (container is narrower than viewport)
- [ ] Add `@supports not (container-type)` fallback
- [ ] Test at min-width, breakpoint, max-width
- [ ] Test in sidebar (if applicable)
- [ ] Test in modal (if applicable)
- [ ] Verify Firefox/Safari fallback works
- [ ] Run Lighthouse check
- [ ] Document in code comments

---

## Performance Tips

1. **Container queries are free** - No JavaScript overhead
2. **Scope wisely** - Only add `container-type` where needed
3. **Fallbacks are important** - Support older browsers gracefully
4. **Test combinations** - Different viewport + container widths
5. **Avoid nesting** - One level of container per element

---

## Common Pitfalls

### ❌ Wrong: Container query on body/html
```svelte
<style>
  :global(body) {
    container-type: inline-size;  /* Don't do this */
  }
</style>
```

### ✅ Right: Container on specific wrapper
```svelte
<style>
  .my-wrapper {
    container-type: inline-size;  /* Good */
    container-name: my-wrapper;
  }
</style>
```

---

### ❌ Wrong: Comparing breakpoints
```svelte
<!-- Container: 300px wide, but @media checks viewport -->
<style>
  .wrapper {
    container-type: inline-size;
  }

  /* This checks viewport, not container */
  @media (max-width: 1024px) {
    .element { /* might not apply */ }
  }
</style>
```

### ✅ Right: Use container queries
```svelte
<style>
  .wrapper {
    container-type: inline-size;
    container-name: my-wrapper;
  }

  /* This checks container width */
  @container my-wrapper (max-width: 300px) {
    .element { /* applies when container is small */ }
  }
</style>
```

---

## Reference Links

- [Container Queries on MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Container_Queries)
- [Chrome Developers Blog](https://developer.chrome.com/docs/css-ui/container-queries/)
- [Container Query Units](https://web.dev/articles/cq-units)
- [Can I Use - Container Queries](https://caniuse.com/css-container-queries)
- [Svelte Docs - Styles](https://svelte.dev/docs/svelte/css)

---

## Next Steps

1. **Pick one component** (e.g., StatCard)
2. **Copy the implementation** from above
3. **Test at different widths** using the test template
4. **Deploy with confidence** using the fallback pattern
5. **Repeat for other components**

**Estimated time per component: 20-30 minutes**

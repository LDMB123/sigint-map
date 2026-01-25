# Container Queries - Code Examples & Patterns
## DMB Almanac App Implementation Examples

---

## Example 1: Song Card Responsiveness

### Before (Media Query Only)

```svelte
<script>
  let { song } = $props();
</script>

<a href={`/songs/${song.slug}`} class="song-link">
  <div class="song-card">
    <h3>{song.title}</h3>
    <span class="count">{song.totalPerformances} plays</span>
  </div>
</a>

<style>
  .song-card {
    padding: var(--space-3);
  }

  /* Problem: Responds to viewport, not container */
  @media (max-width: 640px) {
    .song-card { font-size: var(--text-sm); }
  }

  @media (min-width: 641px) {
    .song-card { font-size: var(--text-base); }
  }
</style>
```

**Issues**:
- Card adapts to viewport, not its actual width
- In a 300px sidebar, still uses desktop styles
- Can't be reused in different contexts
- Needs different breakpoint in grid vs sidebar

### After (Container Query)

```svelte
<script>
  let { song } = $props();
</script>

<a href={`/songs/${song.slug}`} class="song-link">
  <div class="song-card-container">
    <div class="song-card">
      <h3>{song.title}</h3>
      <span class="count">{song.totalPerformances} plays</span>
    </div>
  </div>
</a>

<style>
  /* Establish container context */
  .song-card-container {
    container: song-card / inline-size;
    height: 100%;
  }

  .song-card {
    padding: var(--space-3);
  }

  /* Solution: Responds to actual container width */
  @container song-card (max-width: 199px) {
    .song-card { font-size: var(--text-xs); }
  }

  @container song-card (min-width: 200px) and (max-width: 299px) {
    .song-card { font-size: var(--text-sm); }
  }

  @container song-card (min-width: 300px) {
    .song-card { font-size: var(--text-base); }
  }

  /* Fallback for older browsers */
  @supports not (container-type: inline-size) {
    @media (max-width: 640px) {
      .song-card { font-size: var(--text-sm); }
    }
  }
</style>
```

**Benefits**:
- Card adapts to actual width (whether 300px or 800px)
- Same component works in any context
- Responsive behavior built into component
- Viewport-independent

### Usage Comparison

```svelte
<!-- Grid Layout -->
<div class="song-grid">
  {#each songs as song}
    <SongListItem {song} />
  {/each}
</div>

<style>
  .song-grid {
    /* Grid determines column width */
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: var(--space-4);
  }

  /* With container queries:
     - Column width ~250px: Shows compact layout
     - Column width ~400px: Shows normal layout
     - Column width ~600px: Shows full layout
     All WITHOUT changing breakpoints! */
</style>

<!-- Sidebar Layout -->
<aside style="width: 300px;">
  <div class="song-list">
    {#each songs as song}
      <SongListItem {song} />
    {/each}
  </div>
</aside>

<!-- Same component, adapts to 300px width automatically! -->
```

---

## Example 2: Show Card Multi-Level Responsiveness

### Complete Implementation

```svelte
<script lang="ts">
  import Badge from '$lib/components/ui/Badge.svelte';
  import Card from '$lib/components/ui/Card.svelte';
  import type { DexieShow } from '$db/dexie/schema';

  type Props = {
    show: DexieShow;
    variant?: 'default' | 'compact';
  };

  let { show, variant = 'compact' }: Props = $props();

  const date = $derived(formatShowDate(show.date));
</script>

{#if variant === 'compact'}
  <article class="compact-article">
    <!-- Compact variant for lists -->
  </article>
{:else}
  <article>
    <Card interactive>
      <a href="/shows/{show.id}" class="link">
        <div class="content">
          <!-- Date block - scales with container -->
          <time class="date-block" datetime={show.date}>
            <span class="month">{date.month}</span>
            <span class="day">{date.day}</span>
            <span class="year">{date.year}</span>
          </time>

          <!-- Info section - adapts to available space -->
          <div class="info">
            <h3 class="venue">{show.venue?.name || 'Unknown Venue'}</h3>
            <p class="location">{show.venue?.city}</p>
            {#if show.tour}
              <Badge variant="secondary" size="sm">{show.tour.name}</Badge>
            {/if}
          </div>

          <!-- Stats - layout changes based on width -->
          <div class="stats">
            {#if show.songCount}
              <span class="stat">{show.songCount} songs</span>
            {/if}
            {#if show.rarityIndex}
              <span class="stat">Rarity: {show.rarityIndex.toFixed(2)}</span>
            {/if}
          </div>
        </div>
      </a>
    </Card>
  </article>
{/if}

<style>
  /* Container context - main responsive mechanism */
  .content {
    display: flex;
    gap: var(--space-4);
    align-items: flex-start;
    padding: var(--space-4);
    height: 100%;
    container: show-card / inline-size;
  }

  /* === BREAKPOINT 1: Extra Small (< 280px) === */
  /* Use case: Mobile sidebar, narrow column */
  @container show-card (max-width: 279px) {
    .content {
      flex-direction: column;
      gap: var(--space-2);
      padding: var(--space-2);
      align-items: center;
      text-align: center;
    }

    .date-block {
      width: 48px;
      height: 48px;
    }

    .month {
      font-size: var(--text-xs);
    }

    .day {
      font-size: var(--text-lg);
    }

    .year {
      font-size: 8px;
      opacity: 0.7;
    }

    .info {
      width: 100%;
    }

    .venue {
      font-size: var(--text-sm);
    }

    .location {
      font-size: var(--text-xs);
    }

    .stats {
      width: 100%;
      flex-direction: column;
      align-items: center;
      font-size: var(--text-xs);
    }
  }

  /* === BREAKPOINT 2: Small (280-399px) === */
  /* Use case: Narrow sidebar, column in grid */
  @container show-card (min-width: 280px) and (max-width: 399px) {
    .content {
      flex-wrap: wrap;
      gap: var(--space-3);
      padding: var(--space-3);
    }

    .date-block {
      width: 60px;
      height: 60px;
      flex-shrink: 0;
    }

    .month {
      font-size: var(--text-xs);
    }

    .day {
      font-size: var(--text-2xl);
    }

    .info {
      flex: 1;
      min-width: 150px;
    }

    .venue {
      font-size: var(--text-base);
    }

    .stats {
      flex-basis: 100%;
      font-size: var(--text-xs);
      gap: var(--space-2);
    }
  }

  /* === BREAKPOINT 3: Medium (400-549px) === */
  /* Use case: Main content area, standard card grid */
  @container show-card (min-width: 400px) and (max-width: 549px) {
    .content {
      gap: var(--space-3);
      padding: var(--space-3);
    }

    .date-block {
      width: 70px;
      height: 70px;
    }

    .info {
      flex: 1;
    }

    .stats {
      flex-direction: column;
      gap: var(--space-1);
      font-size: var(--text-xs);
    }
  }

  /* === BREAKPOINT 4: Large (550px+) === */
  /* Use case: Wide content, featured section */
  @container show-card (min-width: 550px) {
    .content {
      gap: var(--space-4);
      padding: var(--space-4);
      align-items: center;
    }

    .date-block {
      width: 80px;
      height: 80px;
    }

    .info {
      flex: 1;
    }

    .stats {
      flex-direction: row;
      gap: var(--space-3);
      white-space: nowrap;
    }
  }

  /* === BREAKPOINT 5: Ultra Large (700px+) === */
  /* Use case: Fullscreen, featured display */
  @container show-card (min-width: 700px) {
    .venue {
      font-size: var(--text-xl);
    }

    .location {
      font-size: var(--text-base);
    }

    .stats {
      font-size: var(--text-sm);
    }
  }

  /* === FALLBACK FOR OLDER BROWSERS === */
  /* Gracefully degrade to media queries */
  @supports not (container-type: inline-size) {
    /* Mobile fallback */
    @media (max-width: 399px) {
      .content {
        flex-wrap: wrap;
        gap: var(--space-2);
        padding: var(--space-2);
      }

      .date-block {
        width: 60px;
        height: 60px;
      }

      .day {
        font-size: var(--text-2xl);
      }

      .stats {
        flex-basis: 100%;
        font-size: var(--text-xs);
      }
    }

    /* Tablet fallback */
    @media (min-width: 400px) and (max-width: 799px) {
      .content {
        gap: var(--space-3);
        padding: var(--space-3);
      }

      .date-block {
        width: 70px;
        height: 70px;
      }

      .stats {
        flex-direction: column;
        font-size: var(--text-xs);
      }
    }

    /* Desktop fallback */
    @media (min-width: 800px) {
      .content {
        gap: var(--space-4);
        padding: var(--space-4);
        align-items: center;
      }

      .date-block {
        width: 80px;
        height: 80px;
      }

      .stats {
        flex-direction: row;
        gap: var(--space-3);
      }
    }
  }
</style>
```

---

## Example 3: Adaptive Layout Patterns

### Pattern A: Responsive Grid with Container Queries

```svelte
<script>
  let shows = [/* array of shows */];
  let gridColumns = 2;
</script>

<div class="shows-grid">
  {#each shows as show}
    <ShowCard {show} />
  {/each}
</div>

<style>
  .shows-grid {
    display: grid;
    /* Default: 2 columns on desktop */
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-4);
  }

  /* Mobile: 1 column */
  @media (max-width: 768px) {
    .shows-grid {
      grid-template-columns: 1fr;
    }
  }

  /* With container queries, each card adapts:
     - On desktop (2 columns): Each card is ~350px wide
       → Uses Small breakpoint (280-399px) styling

     - On mobile (1 column): Each card is ~400px wide
       → Uses Medium breakpoint (400-549px) styling

     No need for grid-level media queries!
     Cards handle their own responsive behavior! */
</style>
```

### Pattern B: Sidebar + Main Content Layout

```svelte
<div class="layout">
  <aside class="sidebar">
    <!-- Narrow: 300px -->
    <SongList {songs} />
  </aside>

  <main class="main-content">
    <!-- Wide: 600px+ -->
    <ShowList {shows} />
  </main>
</div>

<style>
  .layout {
    display: grid;
    grid-template-columns: 300px 1fr;
    gap: var(--space-6);
  }

  /* With container queries:

     SongList in sidebar (300px):
     - Compact layout
     - Small fonts
     - Single-column items

     ShowList in main (600px):
     - Full layout
     - Normal fonts
     - Multi-column cards

     Same components, different contexts!
     All handled by container queries! */

  @media (max-width: 768px) {
    .layout {
      grid-template-columns: 1fr;
    }

    .sidebar {
      display: none;
    }
  }
</style>
```

### Pattern C: Card with Dynamic Width

```svelte
<div class="featured-section">
  <ShowCard {featuredShow} />
</div>

<style>
  .featured-section {
    /* Container width changes with resize */
    width: 100%;
    max-width: min(90vw, 800px);
  }

  /* ShowCard container query handles all widths:
     - 200px (mobile): Extra Small layout
     - 400px (tablet): Medium layout
     - 800px (desktop): Large layout
     - 900px (ultra-wide): Ultra Large layout

     Same ShowCard component, infinite width possibilities! */
</style>
```

---

## Example 4: Comparison Table

### Component Behavior at Different Widths

```
Container Width | SongListItem Layout | ShowCard Layout
─────────────────┼────────────────────┼──────────────────────
150px           | Extra small layout  | Extra small (vertical)
250px           | Small layout        | Small (wrapped)
350px           | Medium layout       | Medium (horizontal)
500px           | Large layout        | Large (stats row)
700px           | Extra Large layout  | Ultra Large (premium)
```

### Real-World Layout Examples

```svelte
<!-- EXAMPLE 1: Auto-fill Grid -->
<div class="auto-fill-grid">
  {#each songs as song}
    <SongListItem {song} />
  {/each}
</div>

<style>
  .auto-fill-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: var(--space-4);
  }

  /* At different viewport widths:
     - Mobile (375px): 1 column of ~375px → Large layout
     - Tablet (768px): 3 columns of ~256px → Medium layout
     - Desktop (1200px): 5 columns of ~240px → Small layout

     Container queries automatically select best variant! */
</style>

<!-- EXAMPLE 2: Subgrid Layout -->
<div class="shows-section">
  {#each groups as group}
    <div class="group">
      <h2>{group.name}</h2>
      <div class="group-grid">
        {#each group.shows as show}
          <ShowCard {show} />
        {/each}
      </div>
    </div>
  {/each}
</div>

<style>
  .shows-section {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-6);
  }

  .group-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--space-4);
  }

  /* Each ShowCard adapts:
     - Left column (400px): Uses Medium layout
     - Right column (400px): Uses Medium layout

     Consistent behavior across layout! */

  @media (max-width: 768px) {
    .shows-section {
      grid-template-columns: 1fr;
    }

    .group-grid {
      grid-template-columns: 1fr;
    }
  }
</style>

<!-- EXAMPLE 3: Responsive Modal -->
<div class="modal">
  <div class="modal-content">
    <ShowCard {show} />
  </div>
</div>

<style>
  .modal {
    position: fixed;
    inset: 0;
    display: flex;
    place-items: center;
    background: rgba(0, 0, 0, 0.5);
  }

  .modal-content {
    width: 90%;
    max-width: 600px;
    max-height: 90vh;
    overflow: auto;
  }

  /* ShowCard adapts to modal width:
     - Mobile (342px max-width): Medium layout
     - Desktop (600px max-width): Large layout
     - Ultra-wide (600px max-width): Ultra Large layout

     No need for different ShowCard versions! */
</style>
```

---

## Example 5: Advanced Patterns

### Pattern: Conditional Display with Container Queries

```svelte
<div class="card" bind:this={cardElement}>
  <div class="header">
    <h3 class="title">Card Title</h3>
    <button class="close-btn">×</button>
  </div>

  <div class="content">
    <!-- Always rendered, but visibility changes -->
    <p class="description">This is a longer description that might not fit in narrow containers.</p>
    <div class="stats">
      <span class="stat">Stat 1</span>
      <span class="stat">Stat 2</span>
      <span class="stat">Stat 3</span>
    </div>
  </div>
</div>

<style>
  .card {
    container: card / inline-size;
  }

  /* Wide containers: show everything */
  .description {
    display: block;
  }

  .stats {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }

  /* Narrow containers: hide description, minimize stats */
  @container card (max-width: 199px) {
    .description {
      display: none;  /* Too narrow for description */
    }

    .stats {
      display: flex;
      gap: var(--space-1);
    }

    .stat {
      font-size: var(--text-xs);
    }
  }
</style>
```

### Pattern: Semantic Layout Changes

```svelte
<article class="post">
  <header>
    <h1 class="title">{title}</h1>
    <time class="date">{publishedDate}</time>
  </header>

  <aside class="metadata">
    <span class="author">{author}</span>
    <span class="category">{category}</span>
  </aside>

  <div class="body">
    {#each paragraphs as para}
      <p>{para}</p>
    {/each}
  </div>

  <footer class="actions">
    <button>Like</button>
    <button>Share</button>
    <button>Save</button>
  </footer>
</article>

<style>
  .post {
    container: post / inline-size;
  }

  /* Narrow: Vertical stack */
  .metadata {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    font-size: var(--text-xs);
  }

  .actions {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  /* Medium: Horizontal metadata, stacked actions */
  @container post (min-width: 400px) {
    .metadata {
      flex-direction: row;
      gap: var(--space-3);
      font-size: var(--text-sm);
    }
  }

  /* Wide: Full layout */
  @container post (min-width: 700px) {
    .metadata {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--space-4);
    }

    .actions {
      flex-direction: row;
      gap: var(--space-3);
    }

    .body {
      columns: 2;
      column-gap: var(--space-6);
    }
  }

  /* Fallback for older browsers */
  @supports not (container-type: inline-size) {
    @media (min-width: 400px) {
      .metadata {
        flex-direction: row;
        gap: var(--space-3);
      }
    }

    @media (min-width: 700px) {
      .body {
        columns: 2;
      }
    }
  }
</style>
```

---

## Testing Examples

### Manual Testing Checklist

```svelte
<!-- Test Card Breakpoints -->
<div style="width: 150px; border: 1px dashed red;">
  <SongListItem {song} />
</div>

<div style="width: 250px; border: 1px dashed red;">
  <SongListItem {song} />
</div>

<div style="width: 350px; border: 1px dashed red;">
  <SongListItem {song} />
</div>

<div style="width: 500px; border: 1px dashed red;">
  <SongListItem {song} />
</div>

<div style="width: 700px; border: 1px dashed red;">
  <SongListItem {song} />
</div>

<!-- Verify each width shows correct layout -->
<!-- Test by dragging the browser corner (if resizable: horizontal) -->

<style>
  div {
    resize: horizontal;
    overflow: hidden;
  }
</style>
```

---

## Summary of Patterns

| Pattern | Use Case | Complexity |
|---------|----------|-----------|
| Simple responsive text | Cards, text blocks | Low |
| Layout switching | Flex direction, grid columns | Medium |
| Conditional display | Hide/show elements | Medium |
| Semantic layout | Article layouts, cards | High |
| Grid adaptation | Product grids, galleries | Medium |
| Sidebar-aware | Sidebar layouts | Medium |

All patterns use the same core technique: `container: name / inline-size;` + `@container name (query) { }`

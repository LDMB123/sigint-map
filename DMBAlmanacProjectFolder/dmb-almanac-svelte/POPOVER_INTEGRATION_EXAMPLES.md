# Popover API Integration Examples

Real-world examples of using Popover API components in the DMB Almanac.

## Example 1: Show Details Page with Information Tooltips

**Location**: Concert details page with helpful tooltips for each field

```svelte
<!-- src/routes/shows/[id]/+page.svelte -->

<script lang="ts">
  import { Tooltip } from '$lib/components/ui';
  import type { PageData } from './$types';

  export let data: PageData;

  const show = data.show;
</script>

<div class="show-details">
  <section class="info-grid">
    <!-- Date with tooltip -->
    <div class="info-item">
      <label>
        Date
        <Tooltip
          id="date-help"
          content="Concert performance date"
          position="right"
        >
          <svelte:fragment slot="trigger">
            <button class="icon-help" aria-label="Date info">❓</button>
          </svelte:fragment>
        </Tooltip>
      </label>
      <p>{show.date}</p>
    </div>

    <!-- Venue with tooltip -->
    <div class="info-item">
      <label>
        Venue
        <Tooltip
          id="venue-help"
          content="Concert venue and location"
          position="right"
        >
          <svelte:fragment slot="trigger">
            <button class="icon-help" aria-label="Venue info">❓</button>
          </svelte:fragment>
        </Tooltip>
      </label>
      <p>{show.venue}</p>
    </div>

    <!-- Songs played with tooltip -->
    <div class="info-item">
      <label>
        Songs Played
        <Tooltip
          id="songs-help"
          content="Total number of songs in setlist"
          position="right"
        >
          <svelte:fragment slot="trigger">
            <button class="icon-help" aria-label="Songs info">❓</button>
          </svelte:fragment>
        </Tooltip>
      </label>
      <p>{show.setlist.length}</p>
    </div>
  </section>

  <!-- More content -->
</div>

<style>
  .icon-help {
    background: none;
    border: none;
    color: var(--color-primary-600);
    cursor: help;
    font-size: 1.1em;
    padding: 0;
    margin-left: 4px;

    &:hover {
      opacity: 0.8;
    }

    &:focus-visible {
      outline: 2px solid var(--color-primary-500);
      outline-offset: 2px;
      border-radius: 4px;
    }
  }
</style>
```

## Example 2: Dropdown Menu for Show Actions

**Location**: Concert list with action menu per row

```svelte
<!-- src/routes/shows/+page.svelte -->

<script lang="ts">
  import { Dropdown } from '$lib/components/ui';
  import type { Show } from '$lib/types';

  let shows: Show[] = [];

  function handleViewDetails(showId: string) {
    goto(`/shows/${showId}`);
  }

  function handleAddToPlaylist(showId: string) {
    console.log('Added show', showId, 'to playlist');
    // Add to favorite shows in Dexie
  }

  function handleShare(showId: string) {
    const show = shows.find(s => s.id === showId);
    if (navigator.share) {
      navigator.share({
        title: 'DMB Show',
        text: `Check out this show: ${show?.venue}`,
        url: `/shows/${showId}`
      });
    }
  }
</script>

<table class="shows-table">
  <thead>
    <tr>
      <th>Date</th>
      <th>Venue</th>
      <th>City</th>
      <th>Songs</th>
      <th>Actions</th>
    </tr>
  </thead>
  <tbody>
    {#each shows as show (show.id)}
      <tr>
        <td>{show.date}</td>
        <td>{show.venue}</td>
        <td>{show.city}</td>
        <td>{show.setlist.length}</td>
        <td>
          <Dropdown id="actions-{show.id}" label="⋮" variant="ghost">
            <button onclick={() => handleViewDetails(show.id)}>
              👁️ View Details
            </button>
            <button onclick={() => handleAddToPlaylist(show.id)}>
              ❤️ Add to Favorites
            </button>
            <button onclick={() => handleShare(show.id)}>
              🔗 Share
            </button>
          </Dropdown>
        </td>
      </tr>
    {/each}
  </tbody>
</table>

<style>
  .shows-table {
    width: 100%;
    border-collapse: collapse;

    thead {
      background: var(--color-gray-100);
      font-weight: bold;

      @media (prefers-color-scheme: dark) {
        background: var(--color-gray-800);
      }
    }

    tbody tr {
      border-bottom: 1px solid var(--border-color);

      &:hover {
        background: var(--color-gray-50);

        @media (prefers-color-scheme: dark) {
          background: var(--color-gray-900);
        }
      }
    }

    th,
    td {
      padding: var(--space-3);
      text-align: left;
    }
  }
</style>
```

## Example 3: Filter Dropdown in Search Results

**Location**: Concert search page with filter options

```svelte
<!-- src/routes/search/+page.svelte -->

<script lang="ts">
  import { Dropdown } from '$lib/components/ui';

  let selectedYear = 'All Years';
  let selectedSeason = 'All Seasons';
  let results: Show[] = [];

  function handleYearFilter(year: string) {
    selectedYear = year;
    applyFilters();
  }

  function handleSeasonFilter(season: string) {
    selectedSeason = season;
    applyFilters();
  }

  function applyFilters() {
    // Filter results based on selected criteria
    console.log('Filtering by', selectedYear, selectedSeason);
  }
</script>

<div class="search-page">
  <div class="filter-bar">
    <input type="text" placeholder="Search concerts..." />

    <!-- Year filter -->
    <Dropdown
      id="year-filter"
      label={`Year: ${selectedYear}`}
      variant="secondary"
    >
      <button onclick={() => handleYearFilter('All Years')}>
        All Years
      </button>
      <hr />
      {#each [2024, 2023, 2022, 2021] as year}
        <button onclick={() => handleYearFilter(String(year))}>
          {year}
        </button>
      {/each}
    </Dropdown>

    <!-- Season filter -->
    <Dropdown
      id="season-filter"
      label={`Season: ${selectedSeason}`}
      variant="secondary"
    >
      <button onclick={() => handleSeasonFilter('All Seasons')}>
        All Seasons
      </button>
      <hr />
      <button onclick={() => handleSeasonFilter('Winter')}>
        🌨️ Winter
      </button>
      <button onclick={() => handleSeasonFilter('Spring')}>
        🌸 Spring
      </button>
      <button onclick={() => handleSeasonFilter('Summer')}>
        ☀️ Summer
      </button>
      <button onclick={() => handleSeasonFilter('Fall')}>
        🍂 Fall
      </button>
    </Dropdown>
  </div>

  <!-- Results -->
  <div class="results">
    {#each results as show (show.id)}
      <div class="result-card">
        {show.date} - {show.venue}
      </div>
    {/each}
  </div>
</div>

<style>
  .search-page {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .filter-bar {
    display: flex;
    gap: var(--space-2);
    flex-wrap: wrap;
    align-items: center;
  }

  .results {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: var(--space-4);
  }

  .result-card {
    padding: var(--space-4);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    background: var(--background-secondary);
  }
</style>
```

## Example 4: Song Info with Nested Popovers

**Location**: Setlist display with song details

```svelte
<!-- src/lib/components/SetlistDisplay.svelte -->

<script lang="ts">
  import { Tooltip } from '$lib/components/ui';
  import type { Song } from '$lib/types';

  interface SetlistEntry {
    song: Song;
    position: number;
    notes?: string;
  }

  export let entries: SetlistEntry[] = [];
</script>

<ol class="setlist">
  {#each entries as entry (entry.position)}
    <li class="setlist-entry">
      <span class="position">{entry.position}.</span>

      <span class="song-name">{entry.song.name}</span>

      <!-- Duration tooltip -->
      <Tooltip
        id="duration-{entry.song.id}"
        content="{entry.song.duration}s"
        position="top"
      >
        <svelte:fragment slot="trigger">
          <button class="duration-badge" aria-label="Song duration">
            ⏱️
          </button>
        </svelte:fragment>
      </Tooltip>

      <!-- Notes tooltip if present -->
      {#if entry.notes}
        <Tooltip
          id="notes-{entry.position}"
          content={entry.notes}
          position="top"
        >
          <svelte:fragment slot="trigger">
            <button class="notes-badge" aria-label="Setlist notes">
              📝
            </button>
          </svelte:fragment>
        </Tooltip>
      {/if}

      <!-- Song details link -->
      <a href="/songs/{entry.song.id}" class="song-link">→</a>
    </li>
  {/each}
</ol>

<style>
  .setlist {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .setlist-entry {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
    border-bottom: 1px solid var(--border-color);

    &:hover {
      background: var(--color-gray-50);

      @media (prefers-color-scheme: dark) {
        background: var(--color-gray-900);
      }
    }
  }

  .position {
    color: var(--foreground-secondary);
    font-weight: var(--font-medium);
    min-width: 2em;
  }

  .song-name {
    flex: 1;
    font-weight: var(--font-medium);
  }

  .duration-badge,
  .notes-badge {
    background: none;
    border: none;
    color: var(--foreground-secondary);
    cursor: help;
    padding: var(--space-1);
    border-radius: 4px;
    transition: background-color var(--transition-fast);

    &:hover {
      background: var(--color-gray-200);

      @media (prefers-color-scheme: dark) {
        background: var(--color-gray-800);
      }
    }
  }

  .song-link {
    color: var(--color-primary-600);
    text-decoration: none;
    padding: var(--space-1) var(--space-2);

    &:hover {
      text-decoration: underline;
    }
  }
</style>
```

## Example 5: Export Options with Dropdown

**Location**: Data export functionality

```svelte
<!-- src/lib/components/ExportButton.svelte -->

<script lang="ts">
  import { Dropdown } from '$lib/components/ui';

  export let data: any;
  export let filename = 'export';

  function exportAsJSON() {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json'
    });
    downloadFile(blob, `${filename}.json`);
  }

  function exportAsCSV() {
    // Convert to CSV format
    const csv = convertToCSV(data);
    const blob = new Blob([csv], { type: 'text/csv' });
    downloadFile(blob, `${filename}.csv`);
  }

  function exportAsHTML() {
    const html = convertToHTML(data);
    const blob = new Blob([html], { type: 'text/html' });
    downloadFile(blob, `${filename}.html`);
  }

  function downloadFile(blob: Blob, name: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }

  function convertToCSV(data: any): string {
    // Implementation
    return '';
  }

  function convertToHTML(data: any): string {
    // Implementation
    return '';
  }
</script>

<Dropdown id="export-menu" label="📥 Export" variant="outline">
  <button onclick={exportAsJSON}>
    📄 JSON
  </button>
  <button onclick={exportAsCSV}>
    🗂️ CSV
  </button>
  <button onclick={exportAsHTML}>
    🌐 HTML
  </button>
</Dropdown>

<style>
  /* Styles inherited from parent */
</style>
```

## Example 6: Sort Options for List

**Location**: Visualization sorting

```svelte
<!-- src/routes/venues/+page.svelte -->

<script lang="ts">
  import { Dropdown } from '$lib/components/ui';

  type SortOption = 'name' | 'shows-count' | 'location';

  let sortBy: SortOption = 'name';
  let venues: Venue[] = [];

  function handleSort(option: SortOption) {
    sortBy = option;
    venues = sortVenues(venues, option);
  }

  function sortVenues(venues: Venue[], by: SortOption) {
    const sorted = [...venues];

    switch (by) {
      case 'name':
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case 'shows-count':
        return sorted.sort((a, b) => b.shows.length - a.shows.length);
      case 'location':
        return sorted.sort((a, b) => a.city.localeCompare(b.city));
    }

    return sorted;
  }
</script>

<div class="venues-header">
  <h1>Venues</h1>

  <Dropdown
    id="sort-venues"
    label="Sort By"
    variant="secondary"
    closeOnSelect={true}
  >
    <button onclick={() => handleSort('name')}>
      {sortBy === 'name' ? '✓' : ''} Venue Name A-Z
    </button>
    <button onclick={() => handleSort('shows-count')}>
      {sortBy === 'shows-count' ? '✓' : ''} Most Shows
    </button>
    <button onclick={() => handleSort('location')}>
      {sortBy === 'location' ? '✓' : ''} Location A-Z
    </button>
  </Dropdown>
</div>

<div class="venues-grid">
  {#each venues as venue (venue.id)}
    <div class="venue-card">
      <h3>{venue.name}</h3>
      <p>{venue.city}, {venue.state}</p>
      <p class="shows-count">{venue.shows.length} shows</p>
    </div>
  {/each}
</div>

<style>
  .venues-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-6);
  }

  .venues-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: var(--space-4);
  }

  .venue-card {
    padding: var(--space-4);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    background: var(--background-secondary);

    h3 {
      margin: 0 0 var(--space-2) 0;
      font-size: var(--text-lg);
    }

    p {
      margin: var(--space-1) 0;
      color: var(--foreground-secondary);
    }

    .shows-count {
      font-weight: var(--font-semibold);
      color: var(--color-primary-600);
    }
  }
</style>
```

## Example 7: Settings Menu with Submenu

**Location**: User settings dropdown

```svelte
<!-- src/lib/components/SettingsMenu.svelte -->

<script lang="ts">
  import { Dropdown } from '$lib/components/ui';

  function handleDarkMode() {
    const isDark = document.documentElement.dataset.theme === 'dark';
    document.documentElement.dataset.theme = isDark ? 'light' : 'dark';
    localStorage.setItem('theme', isDark ? 'light' : 'dark');
  }

  function handleLogout() {
    fetch('/api/logout', { method: 'POST' });
    goto('/');
  }
</script>

<Dropdown
  id="settings-menu"
  label="⚙️"
  variant="ghost"
  closeOnSelect={true}
>
  <button onclick={handleDarkMode}>
    🌙 Toggle Dark Mode
  </button>

  <button onclick={() => goto('/settings/profile')}>
    👤 Profile Settings
  </button>

  <button onclick={() => goto('/settings/privacy')}>
    🔒 Privacy & Security
  </button>

  <button onclick={() => goto('/settings/notifications')}>
    🔔 Notifications
  </button>

  <hr />

  <button onclick={() => goto('/help')}>
    ❓ Help & Support
  </button>

  <button onclick={() => goto('/about')}>
    ℹ️ About
  </button>

  <hr />

  <button onclick={handleLogout} class="logout">
    🚪 Logout
  </button>
</Dropdown>

<style>
  :global(.logout) {
    color: var(--color-danger, #ef4444);
  }
</style>
```

## Example 8: Browser Support Detection

**Location**: Feature detection and fallback

```svelte
<!-- src/lib/components/PopoverExample.svelte -->

<script lang="ts">
  import { isPopoverSupported } from '$lib/utils/popover';
  import { Dropdown } from '$lib/components/ui';

  let browserSupported = false;

  onMount(() => {
    browserSupported = isPopoverSupported();

    if (!browserSupported) {
      console.warn(
        'Popover API not supported. Using CSS fallback.'
      );
    }
  });
</script>

{#if browserSupported}
  <div class="support-badge success">
    ✓ Using native Popover API
  </div>
{:else}
  <div class="support-badge warning">
    ⚠ Using CSS fallback
  </div>
{/if}

<Dropdown
  id="demo-dropdown"
  label="Open Menu"
  variant="primary"
>
  <button>Item 1</button>
  <button>Item 2</button>
</Dropdown>

<style>
  .support-badge {
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-md);
    font-size: var(--text-sm);
    margin-bottom: var(--space-4);

    &.success {
      background: oklch(0.85 0.15 155);
      color: oklch(0.30 0.12 155);
    }

    &.warning {
      background: oklch(0.92 0.15 65);
      color: oklch(0.45 0.18 50);
    }
  }
</style>
```

## Tips for Integration

1. **Always provide unique IDs**: Each popover needs a unique `id` for proper functioning
2. **Use semantic roles**: Add `role="tooltip"` or `role="menu"` for accessibility
3. **Test in browsers**: Check behavior in Chrome 114+, Safari 17.4+, Firefox 125+
4. **Fallback gracefully**: Components auto-detect browser support
5. **Keyboard navigation**: Escape closes, Tab navigates, Enter selects
6. **Mobile compatibility**: Click replaces hover on touch devices
7. **Performance**: Animations are GPU-accelerated on Apple Silicon

## Testing Your Integration

```svelte
<script lang="ts">
  import { isPopoverSupported } from '$lib/utils/popover';

  // Check support on mount
  let supported: boolean = false;
  onMount(() => {
    supported = isPopoverSupported();
    console.log('Popover API supported:', supported);
  });
</script>

<!-- Show support status -->
{#if !supported}
  <p>⚠ Popover API not supported, using fallback</p>
{/if}
```

---

These examples show real-world usage patterns for the Popover API in the DMB Almanac. Adapt them to your specific needs!

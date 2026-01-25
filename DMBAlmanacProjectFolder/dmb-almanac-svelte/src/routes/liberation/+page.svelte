<script lang="ts">
  import { Card } from '$lib/components/ui';
  import { liberationList as clientLiberationList } from '$lib/stores/dexie';

  // Receive SSR data from +page.server.ts
  let { data } = $props();

  // Use SSR data for initial render, fall back to client store for hydration
  let liberation = $derived(data?.liberationList ?? $clientLiberationList);
  let isLoading = $derived(!liberation);

  function formatDaysSince(days: number): string {
    const years = Math.floor(days / 365);
    const remainingDays = days % 365;
    if (years > 0) {
      return `${years}y ${remainingDays}d`;
    }
    return `${days}d`;
  }

  function formatDate(dateString: string): string {
    return new Date(`${dateString}T00:00:00`).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  let isEmpty = $derived(liberation && liberation.length === 0);

  // PERF: Helper to find max without spread operator (avoids stack overflow on large arrays)
  function maxBy<T>(arr: T[], accessor: (item: T) => number): number {
    if (!arr || arr.length === 0) return 0;
    let max = accessor(arr[0]);
    for (let i = 1; i < arr.length; i++) {
      const val = accessor(arr[i]);
      if (val > max) max = val;
    }
    return max;
  }

  // Use SSR stats if available, otherwise compute from list
  let longestWait = $derived(
    data?.liberationStats?.longestWait ??
    maxBy(liberation ?? [], (s) => s.daysSince)
  );
  let mostShowsMissed = $derived(
    data?.liberationStats?.mostShowsMissed ??
    maxBy(liberation ?? [], (s) => s.showsSince)
  );
</script>

<svelte:head>
  <title>Liberation List - DMB Almanac</title>
  <meta
    name="description"
    content="Songs waiting to be liberated - played again after extended absences"
  />
</svelte:head>

<div class="container">
  {#if isLoading}
    <!-- Loading state -->
    <div class="header">
      <h1 class="title">Liberation List</h1>
      <p class="subtitle">Loading liberation data...</p>
    </div>
  {:else}
    <!-- Header -->
    <div class="header">
      <h1 class="title">Liberation List</h1>
      <p class="subtitle">
        Songs waiting to be "liberated" - played again after extended absences
      </p>
    </div>

    <!-- Explanation -->
    <Card class="explainer">
      <div class="explainerContent">
        <h2 class="explainerTitle">What is the Liberation List?</h2>
        <p class="explainerText">
          The Liberation List tracks songs that haven't been played for an extended period. When a
          song on this list is finally played again, fans celebrate its "liberation" - a triumphant
          return to the setlist after years of waiting.
        </p>
      </div>
    </Card>

    {#if isEmpty}
      <!-- Empty State -->
      <Card class="emptyState">
        <div class="emptyStateContent">
          <p class="emptyStateText">All songs have been played recently!</p>
          <p class="emptyStateSubtext">
            Check back after more shows to see which songs are awaiting liberation.
          </p>
        </div>
      </Card>
    {:else}
      <!-- Liberation Stats -->
      <div class="quickStats">
        <div class="stat">
          <span class="statValue">{liberation!.length}</span>
          <span class="statLabel">Songs Waiting</span>
        </div>
        <div class="stat">
          <span class="statValue">{formatDaysSince(longestWait!)}</span>
          <span class="statLabel">Longest Wait</span>
        </div>
        <div class="stat">
          <span class="statValue">{mostShowsMissed}</span>
          <span class="statLabel">Most Shows Missed</span>
        </div>
      </div>

      <!-- Liberation List -->
      <div class="listContainer">
        <div class="listHeader">
          <span class="headerRank">#</span>
          <span class="headerSong">Song</span>
          <span class="headerDays">Days</span>
          <span class="headerShows">Shows</span>
          <span class="headerLast">Last Played</span>
        </div>

        <div class="list">
          {#each liberation! as entry, index}
            <div class="listItem">
              <span class="itemRank">{index + 1}</span>
              <div class="itemSong">
                <a href="/songs/{entry.song.slug}" class="songLink">{entry.song.title}</a>
                <span class="totalPlays">{entry.song.totalPerformances} total plays</span>
              </div>
              <div class="itemDays">
                <span class="daysValue">{entry.daysSince.toLocaleString()}</span>
                <span class="daysLabel">days</span>
              </div>
              <div class="itemShows">
                <span class="showsValue">{entry.showsSince}</span>
                <span class="showsLabel">shows</span>
              </div>
              <div class="itemLast">
                <a href="/shows/{entry.lastShow.id}" class="lastPlayedLink">
                  {formatDate(entry.lastPlayedDate)}
                </a>
                <span class="lastVenue">{entry.lastShow.venue.name}</span>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  {/if}
</div>

<style>
  .container {
    max-width: var(--max-width);
    margin: 0 auto;
    padding: var(--space-6) var(--space-4);
  }

  /* Header */
  .header {
    text-align: center;
    margin-bottom: var(--space-6);
  }

  .title {
    font-size: var(--text-4xl);
    font-weight: var(--font-bold);
    color: var(--foreground);
    margin: 0 0 var(--space-2);
  }

  .subtitle {
    font-size: var(--text-lg);
    color: var(--foreground-secondary);
    margin: 0;
  }

  /* Explainer */
  :global(.explainer) {
    margin-bottom: var(--space-6);
    background: linear-gradient(135deg, var(--color-primary-50), var(--background-secondary));
  }

  .explainerContent {
    padding: var(--space-6);
  }

  .explainerTitle {
    font-size: var(--text-lg);
    font-weight: var(--font-semibold);
    color: var(--foreground);
    margin: 0 0 var(--space-2);
  }

  .explainerText {
    font-size: var(--text-base);
    color: var(--foreground-secondary);
    line-height: 1.6;
    margin: 0;
  }

  /* Empty State */
  :global(.emptyState) {
    margin-top: var(--space-8);
    text-align: center;
  }

  .emptyStateContent {
    padding: var(--space-12) var(--space-6);
  }

  .emptyStateText {
    font-size: var(--text-xl);
    font-weight: var(--font-semibold);
    color: var(--foreground);
    margin: 0 0 var(--space-2);
  }

  .emptyStateSubtext {
    font-size: var(--text-base);
    color: var(--foreground-muted);
    margin: 0;
  }

  /* Quick Stats */
  .quickStats {
    display: flex;
    justify-content: center;
    gap: var(--space-8);
    padding: var(--space-6);
    background: var(--background-secondary);
    border-radius: var(--radius-xl);
    margin-bottom: var(--space-8);
    flex-wrap: wrap;
  }

  .stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-1);
  }

  .statValue {
    font-size: var(--text-3xl);
    font-weight: var(--font-bold);
    color: var(--color-primary-500);
  }

  .statLabel {
    font-size: var(--text-sm);
    color: var(--foreground-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  /* List Container */
  .listContainer {
    background: var(--background);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-xl);
    overflow: hidden;
  }

  /* List Header */
  .listHeader {
    display: grid;
    grid-template-columns: 50px 1fr 100px 100px 180px;
    gap: var(--space-4);
    padding: var(--space-4);
    background: var(--background-secondary);
    border-bottom: 1px solid var(--border-color);
    font-size: var(--text-xs);
    font-weight: var(--font-bold);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--foreground-muted);
  }

  .headerRank {
    text-align: center;
  }

  /* List */
  .list {
    display: flex;
    flex-direction: column;
  }

  .listItem {
    display: grid;
    grid-template-columns: 50px 1fr 100px 100px 180px;
    gap: var(--space-4);
    padding: var(--space-4);
    border-bottom: 1px solid var(--border-color);
    align-items: center;
    transition: background-color var(--transition-fast);
  }

  .listItem:last-child {
    border-bottom: none;
  }

  .listItem:hover {
    background-color: var(--background-secondary);
  }

  /* Rank */
  .itemRank {
    font-size: var(--text-xl);
    font-weight: var(--font-bold);
    color: var(--color-primary-500);
    text-align: center;
  }

  /* Song */
  .itemSong {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .songLink {
    font-size: var(--text-base);
    font-weight: var(--font-semibold);
    color: var(--foreground);
    text-decoration: none;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .songLink:hover {
    color: var(--color-primary-500);
  }

  .totalPlays {
    font-size: var(--text-xs);
    color: var(--foreground-muted);
  }

  /* Days */
  .itemDays,
  .itemShows {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .daysValue,
  .showsValue {
    font-size: var(--text-lg);
    font-weight: var(--font-bold);
    color: var(--foreground);
  }

  .daysLabel,
  .showsLabel {
    font-size: var(--text-xs);
    color: var(--foreground-muted);
  }

  /* Last Played */
  .itemLast {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .lastPlayedLink {
    font-size: var(--text-sm);
    color: var(--color-primary-500);
    text-decoration: none;
  }

  .lastPlayedLink:hover {
    text-decoration: underline;
  }

  .lastVenue {
    font-size: var(--text-xs);
    color: var(--foreground-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* Responsive */
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
    .container {
      padding: var(--space-4) var(--space-3);
    }

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
</style>

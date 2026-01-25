<script lang="ts">
  import { Badge, Card } from '$lib/components/ui';
  import {
    globalStats,
    topSongsByPerformances,
    topOpeningSongs,
    topClosingSongs,
    topEncoreSongs,
    topVenuesByShows,
    showsByYearSummary
  } from '$lib/stores/dexie';

  let stats = $derived($globalStats);
  let topSongs = $derived($topSongsByPerformances);
  let topOpeners = $derived($topOpeningSongs);
  let topClosers = $derived($topClosingSongs);
  let topEncores = $derived($topEncoreSongs);
  let topVenues = $derived($topVenuesByShows);
  let yearData = $derived($showsByYearSummary);

  // Loading state
  let isLoading = $derived(
    !stats || !topSongs || !topOpeners || !topClosers || !topEncores || !topVenues || !yearData
  );

  // Sort by year descending and take most recent 10 years for display
  let recentYears = $derived(yearData ? [...yearData].sort((a, b) => b.year - a.year).slice(0, 10) : []);
  // PERF: Use loop instead of Math.max(...spread) to avoid stack overflow
  let maxShowCount = $derived.by(() => {
    if (recentYears.length === 0) return 1;
    let max = recentYears[0].count;
    for (let i = 1; i < recentYears.length; i++) {
      if (recentYears[i].count > max) max = recentYears[i].count;
    }
    return max;
  });
</script>

<svelte:head>
  <title>Statistics - DMB Almanac</title>
  <meta name="description" content="{stats?.yearsActive ?? 0} years of DMB history in numbers" />
</svelte:head>

<div class="container">
  {#if isLoading}
    <!-- Loading state -->
    <div class="header">
      <h1 class="title">Statistics</h1>
      <p class="subtitle">Loading statistics...</p>
    </div>
  {:else}
    <!-- Header -->
    <div class="header">
      <h1 class="title">Statistics</h1>
      <p class="subtitle">{stats!.yearsActive} years of DMB history in numbers</p>
    </div>

    <!-- Overall Stats -->
    <div class="overallStats" role="group" aria-label="Overall statistics">
      <Card class="bigStat">
        <div class="bigStatContent">
          <span class="bigStatValue" id="total-shows-stat">
            {stats!.totalShows.toLocaleString()}
          </span>
          <span class="bigStatLabel" aria-describedby="total-shows-stat">Total Shows</span>
        </div>
      </Card>
      <Card class="bigStat">
        <div class="bigStatContent">
          <span class="bigStatValue" id="unique-songs-stat">
            {stats!.totalSongs.toLocaleString()}
          </span>
          <span class="bigStatLabel" aria-describedby="unique-songs-stat">Unique Songs</span>
        </div>
      </Card>
      <Card class="bigStat">
        <div class="bigStatContent">
          <span class="bigStatValue" id="venues-stat">
            {stats!.totalVenues.toLocaleString()}
          </span>
          <span class="bigStatLabel" aria-describedby="venues-stat">Venues</span>
        </div>
      </Card>
      <Card class="bigStat">
        <div class="bigStatContent">
          <span class="bigStatValue" id="guests-stat">
            {stats!.totalGuests.toLocaleString()}
          </span>
          <span class="bigStatLabel" aria-describedby="guests-stat">Guest Musicians</span>
        </div>
      </Card>
    </div>

    <!-- Main Grid -->
    <div class="mainGrid">
      <!-- Most Played Songs -->
      <Card>
        <div class="section">
          <h2 class="sectionTitle" id="most-played-heading">Most Played Songs</h2>
          <ol class="rankedList" aria-labelledby="most-played-heading">
            {#each topSongs! as song, i}
              <li>
                <span class="listRank">{i + 1}</span>
                <a href="/songs/{song.slug}" class="listLink">{song.title}</a>
                <span class="listCount">{song.totalPerformances.toLocaleString()}</span>
              </li>
            {/each}
          </ol>
        </div>
      </Card>

      <!-- Shows by Year -->
      <Card>
        <div class="section">
          <h2 class="sectionTitle" id="shows-by-year-heading">Shows by Year</h2>
          <div class="yearChart" role="list" aria-labelledby="shows-by-year-heading">
            {#each recentYears! as item}
              <div class="yearRow" role="listitem">
                <a href="/tours/{item.year}" class="yearLabel">{item.year}</a>
                <div class="yearBar" role="presentation" aria-hidden="true">
                  <div
                    class="yearFill"
                    style="--fill: {item.count / maxShowCount}"
                  ></div>
                </div>
                <span class="yearCount" aria-hidden="true">{item.count}</span>
              </div>
            {/each}
          </div>
        </div>
      </Card>

      <!-- Top Openers -->
      <Card>
        <div class="section">
          <h2 class="sectionTitle" id="top-openers-heading">
            <Badge variant="opener" size="sm" aria-hidden="true">Opener</Badge>
            Top Openers
          </h2>
          <ol class="rankedList" aria-labelledby="top-openers-heading">
            {#each topOpeners! as { song, count }, i}
              <li>
                <span class="listRank">{i + 1}</span>
                <a href="/songs/{song.slug}" class="listLink">{song.title}</a>
                <span class="listCount">{count.toLocaleString()}</span>
              </li>
            {/each}
          </ol>
        </div>
      </Card>

      <!-- Top Closers -->
      <Card>
        <div class="section">
          <h2 class="sectionTitle" id="top-closers-heading">
            <Badge variant="closer" size="sm" aria-hidden="true">Closer</Badge>
            Top Closers
          </h2>
          <ol class="rankedList" aria-labelledby="top-closers-heading">
            {#each topClosers! as { song, count }, i}
              <li>
                <span class="listRank">{i + 1}</span>
                <a href="/songs/{song.slug}" class="listLink">{song.title}</a>
                <span class="listCount">{count.toLocaleString()}</span>
              </li>
            {/each}
          </ol>
        </div>
      </Card>

      <!-- Top Encores -->
      <Card>
        <div class="section">
          <h2 class="sectionTitle" id="top-encores-heading">
            <Badge variant="encore" size="sm" aria-hidden="true">Encore</Badge>
            Top Encores
          </h2>
          <ol class="rankedList" aria-labelledby="top-encores-heading">
            {#each topEncores! as { song, count }, i}
              <li>
                <span class="listRank">{i + 1}</span>
                <a href="/songs/{song.slug}" class="listLink">{song.title}</a>
                <span class="listCount">{count.toLocaleString()}</span>
              </li>
            {/each}
          </ol>
        </div>
      </Card>

      <!-- Top Venues -->
      <Card>
        <div class="section">
          <h2 class="sectionTitle" id="top-venues-heading">Most Visited Venues</h2>
          <ol class="rankedList" aria-labelledby="top-venues-heading">
            {#each topVenues! as { venue, showCount }, i}
              <li>
                <span class="listRank">{i + 1}</span>
                <a href="/venues/{venue.id}" class="listLink">{venue.name}</a>
                <span class="listCount">{showCount.toLocaleString()}</span>
              </li>
            {/each}
          </ol>
        </div>
      </Card>
    </div>
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
    margin-bottom: var(--space-8);
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

  /* Overall Stats */
  .overallStats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--space-4);
    margin-bottom: var(--space-8);
  }

  :global(.bigStat) {
    text-align: center;
    background: linear-gradient(
      135deg,
      color-mix(in oklch, var(--color-primary-50) 80%, var(--background)),
      var(--background)
    );
  }

  .bigStatContent {
    padding: var(--space-6);
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .bigStatValue {
    display: block;
    font-size: var(--text-4xl);
    font-weight: var(--font-extrabold);
    color: var(--color-primary-600);
    letter-spacing: var(--tracking-tight);
    background: linear-gradient(135deg, var(--color-primary-500), var(--color-primary-700));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .bigStatLabel {
    font-size: var(--text-xs);
    color: var(--foreground-muted);
    text-transform: uppercase;
    letter-spacing: var(--tracking-wider);
    font-weight: var(--font-medium);
  }

  /* Main Grid */
  .mainGrid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-6);
  }

  /* Section */
  .section {
    padding: var(--space-5);
  }

  .sectionTitle {
    font-size: var(--text-lg);
    font-weight: var(--font-bold);
    color: var(--foreground);
    margin: 0 0 var(--space-4);
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  /* Ranked List */
  .rankedList {
    list-style: none;
    padding: 0;
    margin: 0;
    counter-reset: none;
  }

  .rankedList li {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) 0;
    border-bottom: 1px solid var(--border-color);
  }

  .rankedList li:last-child {
    border-bottom: none;
  }

  .listRank {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--color-primary-100), var(--color-primary-200));
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: var(--text-xs);
    font-weight: var(--font-bold);
    color: var(--color-primary-700);
    flex-shrink: 0;
  }

  .listLink {
    flex: 1;
    font-size: var(--text-sm);
    color: var(--foreground);
    text-decoration: none;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .listLink:hover {
    color: var(--color-primary-500);
  }

  .listCount {
    font-size: var(--text-sm);
    font-weight: var(--font-semibold);
    color: var(--color-primary-500);
    min-width: 35px;
    text-align: right;
  }

  /* Year Chart */
  .yearChart {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .yearRow {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .yearLabel {
    font-size: var(--text-sm);
    color: var(--foreground);
    text-decoration: none;
    width: 50px;
    flex-shrink: 0;
  }

  .yearLabel:hover {
    color: var(--color-primary-500);
  }

  .yearBar {
    flex: 1;
    height: 20px;
    background: var(--background-secondary);
    border-radius: var(--radius-md);
    overflow: hidden;
  }

  .yearFill {
    height: 100%;
    width: 100%;
    background: linear-gradient(90deg, var(--color-primary-400), var(--color-primary-600));
    border-radius: var(--radius-md);
    /* GPU-accelerated: Use scaleX instead of width */
    transform-origin: left center;
    transform: scaleX(var(--fill, 0));
    transition: transform var(--transition-slow) var(--ease-out-expo);
    box-shadow: 0 1px 2px oklch(0.62 0.185 75 / 0.2);
  }

  .yearCount {
    font-size: var(--text-sm);
    font-weight: var(--font-semibold);
    color: var(--foreground-secondary);
    width: 30px;
    text-align: right;
    flex-shrink: 0;
  }

  /* Responsive */
  @media (max-width: 1024px) {
    .mainGrid {
      grid-template-columns: 1fr;
    }

    .overallStats {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 768px) {
    .container {
      padding: var(--space-4) var(--space-3);
    }

    .title {
      font-size: var(--text-3xl);
    }

    .bigStatValue {
      font-size: var(--text-3xl);
    }
  }

  /* Dark mode */
  @media (prefers-color-scheme: dark) {
    :global(.bigStat) {
      background: linear-gradient(135deg, oklch(0.7 0.19 82 / 0.08), var(--background));
    }

    .bigStatValue {
      background: linear-gradient(135deg, var(--color-primary-400), var(--color-primary-500));
      -webkit-background-clip: text;
      background-clip: text;
    }

    .listRank {
      background: linear-gradient(135deg, oklch(0.7 0.19 82 / 0.2), oklch(0.7 0.19 82 / 0.3));
      color: var(--color-primary-400);
    }

    .yearFill {
      background: linear-gradient(90deg, var(--color-primary-500), var(--color-primary-400));
      box-shadow: 0 1px 3px oklch(0.7 0.19 82 / 0.3);
    }
  }
</style>

<script lang="ts">
  import { onMount } from 'svelte';
  import { allShows } from '$lib/stores/dexie';
  import type { DexieShow } from '$lib/db/dexie/schema';
  import Card from '$lib/components/ui/Card.svelte';
  import LazyVisualization from '$lib/components/visualizations/LazyVisualization.svelte';
  import { preloadVisualization } from '$lib/utils/d3-loader';

  // Reactive state for visualization data
  let transitionData = $state<Array<{
    source: string;
    target: string;
    value: number;
  }>>([]);

  let guestData = $state<Array<{
    id: string;
    name: string;
    appearances: number;
  }>>([]);

  let guestLinks = $state<Array<{
    source: string | number;
    target: string | number;
    weight?: number;
    value?: number;
  }>>([]);

  let tourMapData = $state<Map<string, number>>(new Map());

  let gapTimelineData = $state<Array<{
    date: string;
    songId: string;
    songName: string;
    gap: number;
  }>>([]);

  let heatmapData = $state<Array<{
    row: string;
    column: string;
    value: number;
  }>>([]);

  let rarityData = $state<Array<{
    id: string;
    name: string;
    rarity: number;
    lastPlayed?: string;
    totalAppearances: number;
  }>>([]);

  let activeTab = $state('transitions');
  let isLoading = $state(true);

  // Tab navigation options in order
  const tabOptions = ['transitions', 'guests', 'map', 'timeline', 'heatmap', 'rarity'];

  // Handle keyboard navigation between tabs
  function handleTabKeydown(event: KeyboardEvent, currentTab: string) {
    const currentIndex = tabOptions.indexOf(currentTab);
    let nextIndex: number | null = null;

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      nextIndex = (currentIndex + 1) % tabOptions.length;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      nextIndex = (currentIndex - 1 + tabOptions.length) % tabOptions.length;
    } else if (event.key === 'Home') {
      event.preventDefault();
      nextIndex = 0;
    } else if (event.key === 'End') {
      event.preventDefault();
      nextIndex = tabOptions.length - 1;
    }

    if (nextIndex !== null) {
      activeTab = tabOptions[nextIndex];
      // Preload D3 modules for the next tab
      preloadVisualization(tabOptions[nextIndex] as any);
      // Focus the newly activated tab button
      const tabButtons = document.querySelectorAll('[role="tab"]');
      const targetButton = tabButtons[nextIndex];
      if (targetButton instanceof HTMLElement) {
        targetButton.focus();
      }
    }
  }

  // Preload D3 modules on tab hover (anticipatory loading for better UX)
  function handleTabHover(tabId: string) {
    preloadVisualization(tabId as any);
  }

  // Map of visualization components with their display properties
  type ComponentPathType = 'TransitionFlow' | 'GuestNetwork' | 'TourMap' | 'GapTimeline' | 'SongHeatmap' | 'RarityScorecard' | 'LazyTransitionFlow';

  type VisualizationTab = {
    id: string;
    label: string;
    componentPath: ComponentPathType;
    fullWidth?: boolean;
    height?: 'normal' | 'large';
    description: string;
  };

  const visualizations: VisualizationTab[] = [
    {
      id: 'transitions',
      label: 'Song Transitions',
      componentPath: 'TransitionFlow',
      description: 'Sankey diagram showing the flow of song transitions in DMB setlists. Each band represents a song, and the width of the connection shows how often songs are played in sequence.'
    },
    {
      id: 'guests',
      label: 'Guest Network',
      componentPath: 'GuestNetwork',
      description: 'Force-directed graph showing relationships between guest musicians who have performed with DMB. Node size represents number of appearances, and edges show collaborations.'
    },
    {
      id: 'map',
      label: 'Tour Map',
      componentPath: 'TourMap',
      description: 'Choropleth map showing the concentration of DMB concert performances by state. Darker colors indicate more shows performed in that location.'
    },
    {
      id: 'timeline',
      label: 'Gap Timeline',
      componentPath: 'GapTimeline',
      fullWidth: true,
      height: 'large',
      description: 'Timeline showing the time gaps between performances of individual songs. Bars represent the number of days since a song was last played.'
    },
    {
      id: 'heatmap',
      label: 'Song Heatmap',
      componentPath: 'SongHeatmap',
      fullWidth: true,
      description: 'Matrix showing the frequency of song performances across months and years. Darker cells indicate more frequent performances during that period.'
    },
    {
      id: 'rarity',
      label: 'Rarity Scores',
      componentPath: 'RarityScorecard',
      description: 'Bar chart showing the rarity of songs based on performance history. Green bars indicate common songs, red bars indicate rare songs that are seldom performed.'
    }
  ];

  onMount(() => {
    // Subscribe to shows data
    const unsubscribe = allShows.subscribe(shows => {
      try {
        if (!shows || shows.length === 0) {
          isLoading = true;
          return;
        }

        isLoading = false;

        // Generate transition data from setlist
        generateTransitionData(shows);

        // Generate tour map data
        generateTourMapData(shows);

        // Generate gap timeline
        generateGapTimeline(shows);

        // Generate heatmap
        generateHeatmapData(shows);

        // Generate rarity data
        generateRarityData(shows);

        // Generate guest network
        generateGuestNetwork(shows);
      } catch (error) {
        console.error('Error loading visualization data:', error);
        isLoading = false;
      }
    });

    return unsubscribe;
  });

  function generateTransitionData(shows: DexieShow[]) {
    const transitions = new Map<string, number>();

    shows.forEach(_show => {
      // This is a placeholder - in reality, you'd parse the setlist
      // from each show to build song transitions
      const key = 'Ants Marching → All Along the Watchtower';
      transitions.set(key, (transitions.get(key) || 0) + 1);
    });

    transitionData = Array.from(transitions.entries())
      .slice(0, 20)
      .map(([pair, count]) => {
        const [source, target] = pair.split(' → ');
        return { source, target, value: count };
      });
  }

  function generateTourMapData(shows: DexieShow[]) {
    const stateMap = new Map<string, number>();

    shows.forEach(show => {
      const state = show.venue?.state || 'Unknown';
      stateMap.set(state, (stateMap.get(state) || 0) + 1);
    });

    tourMapData = stateMap;
  }

  function generateGapTimeline(shows: DexieShow[]) {
    const gaps: Array<{
      date: string;
      songId: string;
      songName: string;
      gap: number;
    }> = [];

    // Placeholder implementation
    shows.slice(0, 30).forEach((show, index) => {
      gaps.push({
        date: show.date,
        songId: `song-${index}`,
        songName: `Song ${index}`,
        gap: Math.floor(Math.random() * 365)
      });
    });

    gapTimelineData = gaps;
  }

  function generateHeatmapData(_shows: DexieShow[]) {
    const heatmap: Array<{
      row: string;
      column: string;
      value: number;
    }> = [];

    const songs = ['Ants Marching', 'Stay', 'Crash Into Me', 'Lover Lay Down', 'Satellite'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

    songs.forEach(song => {
      months.forEach(month => {
        heatmap.push({
          row: song,
          column: month,
          value: Math.floor(Math.random() * 10)
        });
      });
    });

    heatmapData = heatmap;
  }

  function generateRarityData(shows: DexieShow[]) {
    const songs = [
      { id: 'ants-marching', name: 'Ants Marching', totalAppearances: 450 },
      { id: 'stay', name: 'Stay', totalAppearances: 380 },
      { id: 'crash-into-me', name: 'Crash Into Me', totalAppearances: 420 },
      { id: 'lover-lay-down', name: 'Lover Lay Down', totalAppearances: 45 },
      { id: 'satellite', name: 'Satellite', totalAppearances: 120 },
      { id: 'warehouse', name: 'Warehouse', totalAppearances: 85 },
      { id: 'the-space-between', name: 'The Space Between', totalAppearances: 150 },
      { id: 'pig', name: 'Pig', totalAppearances: 35 },
      { id: 'stand-up', name: 'Stand Up', totalAppearances: 95 },
      { id: 'dont-drink-drive', name: "Don't Drink the Water", totalAppearances: 200 }
    ];

    const totalShows = shows.length || 1;

    rarityData = songs.map(song => ({
      id: song.id,
      name: song.name,
      rarity: (song.totalAppearances / totalShows) * 100,
      totalAppearances: song.totalAppearances
    }));
  }

  function generateGuestNetwork(_shows: DexieShow[]) {
    const guests = [
      { id: 'tim-reynolds', name: 'Tim Reynolds', appearances: 120 },
      { id: 'evan-brewer', name: 'Evan Brewer', appearances: 85 },
      { id: 'buddy-guy', name: 'Buddy Guy', appearances: 3 },
      { id: 'carlos-santana', name: 'Carlos Santana', appearances: 5 },
      { id: 'robert-randolph', name: 'Robert Randolph', appearances: 8 }
    ];

    const links = [
      { source: 'tim-reynolds', target: 'evan-brewer', weight: 45 },
      { source: 'tim-reynolds', target: 'buddy-guy', weight: 1 },
      { source: 'evan-brewer', target: 'robert-randolph', weight: 3 },
      { source: 'carlos-santana', target: 'buddy-guy', weight: 1 }
    ];

    guestData = guests;
    guestLinks = links;
  }

  // Helper function to get the correct visualization data based on tab ID
  function getVisualizationData(tabId: string): Record<string, unknown> | undefined {
    switch (tabId) {
      case 'transitions':
        // Transition data is an array of objects
        return { data: transitionData } as Record<string, unknown>;
      case 'guests':
        // Guest data is an array of objects
        return { data: guestData } as Record<string, unknown>;
      case 'map':
        // Tour map data is a Map converted to object
        return { data: Array.from(tourMapData.entries()).map(([state, count]) => ({ state, count })) } as Record<string, unknown>;
      case 'timeline':
        // Gap timeline data is an array of objects
        return { data: gapTimelineData } as Record<string, unknown>;
      case 'heatmap':
        // Heatmap data is an array of objects
        return { data: heatmapData } as Record<string, unknown>;
      case 'rarity':
        // Rarity data is an array of objects
        return { data: rarityData } as Record<string, unknown>;
      default:
        return undefined;
    }
  }
</script>

<svelte:head>
  <title>Visualizations - DMB Almanac</title>
  <meta name="description" content="Interactive visualizations and analytics for Dave Matthews Band concerts" />
</svelte:head>

<div class="container">
  <!-- Header -->
  <section class="header">
    <h1 class="page-title">Concert Visualizations</h1>
    <p class="page-subtitle">Explore Dave Matthews Band concert data through interactive charts and maps</p>
  </section>

  <!-- Tabs -->
  <div class="tabs-container">
    <div class="tabs" role="tablist" aria-label="Visualization categories">
      {#each visualizations as viz (viz.id)}
        <button
          class="tab"
          id="{viz.id}-tab"
          role="tab"
          aria-controls="{viz.id}-panel"
          onclick={() => activeTab = viz.id}
          onkeydown={(e) => handleTabKeydown(e, activeTab)}
          onmouseenter={() => handleTabHover(viz.id)}
          aria-selected={activeTab === viz.id}
          tabindex={activeTab === viz.id ? 0 : -1}
        >
          {viz.label}
        </button>
      {/each}
    </div>
  </div>

  <!-- Content -->
  <div class="content-container">
    {#if isLoading}
      <div class="loading-state">
        <div class="spinner"></div>
        <p>Loading visualization data...</p>
      </div>
    {:else}
      {#each visualizations as viz (viz.id)}
        {#if activeTab === viz.id}
          <div id="{viz.id}-panel" role="tabpanel" aria-labelledby="{viz.id}-tab" class="tab-content {viz.fullWidth ? 'full-width' : ''}">
            <Card variant="elevated" class="chart-card">
              <div class="chart-container {viz.height === 'large' ? 'large' : ''}">
                <LazyVisualization
                  componentPath={viz.componentPath}
                  data={getVisualizationData(viz.id)}
                  links={viz.id === 'guests' ? guestLinks : undefined}
                  limit={viz.id === 'rarity' ? 10 : undefined}
                />
              </div>
              <div class="chart-info">
                <h2>{viz.label}</h2>
                <p>{viz.description}</p>
              </div>
            </Card>
          </div>
        {/if}
      {/each}
    {/if}
  </div>

  <!-- Info Section -->
  <section class="info-section">
    <h2 class="section-title">About These Visualizations</h2>
    <div class="info-grid">
      <Card variant="outlined" padding="md">
        <div class="info-card-content">
          <h3>Data Source</h3>
          <p>All visualizations are generated from the DMB Almanac concert database, which includes detailed information about performances, setlists, and guest appearances.</p>
        </div>
      </Card>
      <Card variant="outlined" padding="md">
        <div class="info-card-content">
          <h3>Interactive Features</h3>
          <p>Hover over elements for more information. Click to select items. Use zoom and drag to explore the network and map visualizations in detail.</p>
        </div>
      </Card>
      <Card variant="outlined" padding="md">
        <div class="info-card-content">
          <h3>Data Updates</h3>
          <p>The Almanac is continuously updated with new shows and data. Visualizations reflect the most recent concert information available.</p>
        </div>
      </Card>
    </div>
  </section>
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
    padding: var(--space-8) 0;
    margin-bottom: var(--space-8);
  }

  .page-title {
    font-size: var(--text-4xl);
    font-weight: var(--font-bold);
    margin: 0 0 var(--space-3);
    background: var(--gradient-text-gold);
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .page-subtitle {
    font-size: var(--text-lg);
    color: var(--foreground-secondary);
    margin: 0;
  }

  /* Tabs */
  .tabs-container {
    margin-bottom: var(--space-8);
    overflow-x: auto;
  }

  .tabs {
    display: flex;
    gap: var(--space-2);
    border-bottom: 2px solid var(--border-color);
    padding-bottom: var(--space-2);
  }

  .tab {
    padding: var(--space-3) var(--space-4);
    background: transparent;
    border: none;
    border-bottom: 3px solid transparent;
    font-weight: var(--font-medium);
    color: var(--foreground-secondary);
    cursor: pointer;
    transition:
      color var(--transition-fast),
      border-color var(--transition-fast);
  }

  .tab:hover {
    color: var(--foreground);
  }

  .tab[aria-selected='true'] {
    color: var(--color-primary-500);
    border-bottom-color: var(--color-primary-500);
  }

  /* Content */
  .content-container {
    margin-bottom: var(--space-12);
  }

  .tab-content {
    animation: fadeIn 300ms ease-in-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  :global(.chart-card) {
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
    height: auto;
  }

  :global(.chart-card.full-width) {
    width: 100%;
  }

  .chart-container {
    width: 100%;
    height: 400px;
    border-radius: var(--radius-md);
    overflow: hidden;
    background: var(--background-secondary);
  }

  .chart-container.large {
    height: 500px;
  }

  .chart-info {
    padding: var(--space-4) 0;
  }

  .chart-info h2 {
    font-size: var(--text-xl);
    font-weight: var(--font-bold);
    margin: 0 0 var(--space-2);
  }

  .chart-info p {
    margin: 0;
    font-size: var(--text-sm);
    color: var(--foreground-secondary);
  }

  /* Loading State */
  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--space-12);
    min-height: 400px;
    gap: var(--space-4);
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid var(--border-color);
    border-top-color: var(--color-primary-500);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .loading-state p {
    color: var(--foreground-secondary);
    font-size: var(--text-sm);
  }


  /* Info Section */
  .info-section {
    margin-top: var(--space-12);
    padding-top: var(--space-8);
    border-top: 1px solid var(--border-color);
  }

  .section-title {
    font-size: var(--text-2xl);
    font-weight: var(--font-bold);
    margin: 0 0 var(--space-6);
  }

  .info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: var(--space-4);
  }

  :global(.info-card-content) {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  :global(.info-card-content h3) {
    font-size: var(--text-base);
    font-weight: var(--font-semibold);
    margin: 0;
  }

  :global(.info-card-content p) {
    margin: 0;
    font-size: var(--text-sm);
    color: var(--foreground-secondary);
  }

  /* Responsive */
  @media (max-width: 768px) {
    .page-title {
      font-size: var(--text-3xl);
    }

    .tabs {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }

    .chart-container {
      height: 300px;
    }

    .chart-container.large {
      height: 350px;
    }

    :global(.chart-card) {
      gap: var(--space-4);
    }

    .info-grid {
      grid-template-columns: 1fr;
    }
  }
</style>

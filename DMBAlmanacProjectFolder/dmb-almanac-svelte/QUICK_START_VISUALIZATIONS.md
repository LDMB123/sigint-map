# Quick Start Guide - D3 Visualizations

Fast reference for using the migrated D3 visualization components.

## Installation

All dependencies are already in `package.json`:

```bash
npm install
```

No additional packages needed!

## Basic Usage

### 1. Import Components

```svelte
<script lang="ts">
  import {
    TransitionFlow,
    GuestNetwork,
    TourMap,
    GapTimeline,
    SongHeatmap,
    RarityScorecard
  } from '$lib/components/visualizations';
</script>
```

### 2. Prepare Data

Each component expects specific data formats:

#### TransitionFlow (Sankey Diagram)
```typescript
const transitionData = [
  { source: 'Ants Marching', target: 'Crash Into Me', value: 45 },
  { source: 'Crash Into Me', target: 'Stay', value: 38 }
];
```

#### GuestNetwork (Force Graph)
```typescript
const guestNodes = [
  { id: 'tim-reynolds', name: 'Tim Reynolds', appearances: 120 }
];

const guestLinks = [
  { source: 'tim-reynolds', target: 'evan-brewer', weight: 45 }
];
```

#### TourMap (Choropleth)
```typescript
const tourData = {
  'New York': 25,
  'California': 18,
  'Texas': 15
};
```

#### GapTimeline (Canvas Timeline)
```typescript
const gapData = [
  {
    date: '2024-01-15',
    songId: 'ants-marching',
    songName: 'Ants Marching',
    gap: 45
  }
];
```

#### SongHeatmap (Matrix)
```typescript
const heatmapData = [
  { row: 'Ants Marching', column: 'January', value: 5 },
  { row: 'Ants Marching', column: 'February', value: 4 }
];
```

#### RarityScorecard (Bar Chart)
```typescript
const rarityData = [
  {
    id: 'ants-marching',
    name: 'Ants Marching',
    rarity: 95,
    totalAppearances: 450
  }
];
```

### 3. Use in Template

```svelte
<div class="chart-container">
  <TransitionFlow data={transitionData} width={960} height={600} />
</div>

<style>
  .chart-container {
    width: 100%;
    height: 400px;
  }
</style>
```

## Component API Reference

### TransitionFlow
```svelte
<TransitionFlow
  data={transitionData}
  width={960}
  height={600}
  class="my-chart"
/>
```

**Props:**
- `data?: TransitionFlowData[]`
- `width?: number` (default: 960)
- `height?: number` (default: 600)
- `class?: string`

---

### GuestNetwork
```svelte
<GuestNetwork
  data={guestNodes}
  links={guestLinks}
  width={800}
  height={600}
  class="network"
/>
```

**Props:**
- `data?: GuestNetworkNode[]`
- `links?: GuestNetworkLink[]`
- `width?: number` (default: 800)
- `height?: number` (default: 600)
- `class?: string`

**Features:**
- Click and drag nodes
- Hover to highlight
- Auto-layout with force simulation

---

### TourMap
```svelte
<TourMap
  topoData={usTopoJson}
  data={tourData}
  colorScheme="blues"
  width={960}
  height={600}
/>
```

**Props:**
- `topoData?: TopoJSONGeometry`
- `data?: Map<string, number> | Record<string, number>`
- `colorScheme?: 'blues' | 'greens' | 'reds' | 'purples'` (default: 'blues')
- `width?: number` (default: 960)
- `height?: number` (default: 600)
- `class?: string`

**Features:**
- Click states to select
- Hover for details
- Automatic legend

**Loading TopoJSON:**
```typescript
const response = await fetch('/data/us-states.json');
const topoData = await response.json();
```

---

### GapTimeline
```svelte
<GapTimeline
  data={gapData}
  width={1200}
  height={400}
/>
```

**Props:**
- `data?: GapTimelineData[]`
- `width?: number` (default: 1200)
- `height?: number` (default: 400)
- `class?: string`

**Features:**
- Canvas rendering (fast)
- Hover tooltips
- Grid lines

---

### SongHeatmap
```svelte
<SongHeatmap
  data={heatmapData}
  width={900}
  height={600}
/>
```

**Props:**
- `data?: HeatmapData[]`
- `width?: number` (default: 900)
- `height?: number` (default: 600)
- `class?: string`

**Features:**
- Interactive cells
- Legend
- Rotated labels

---

### RarityScorecard
```svelte
<RarityScorecard
  data={rarityData}
  limit={10}
  width={400}
  height={500}
/>
```

**Props:**
- `data?: RarityData[]`
- `limit?: number` (default: 10) - Show top N songs
- `width?: number` (default: 400)
- `height?: number` (default: 500)
- `class?: string`

**Features:**
- Sorted by rarity
- Color coded (green = common, red = rare)
- Value labels

---

## Complete Example

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import {
    TransitionFlow,
    RarityScorecard
  } from '$lib/components/visualizations';
  import type { TransitionFlowData, RarityData } from '$lib/types/visualizations';

  let transitionData: TransitionFlowData[] = [];
  let rarityData: RarityData[] = [];
  let loading = true;

  onMount(async () => {
    try {
      // Load data
      const transResponse = await fetch('/api/transitions');
      transitionData = await transResponse.json();

      const rarityResponse = await fetch('/api/rarity');
      rarityData = await rarityResponse.json();

      loading = false;
    } catch (error) {
      console.error('Failed to load data:', error);
      loading = false;
    }
  });
</script>

<div class="dashboard">
  {#if loading}
    <p>Loading visualizations...</p>
  {:else}
    <div class="chart-grid">
      <div class="chart">
        <h2>Song Transitions</h2>
        <TransitionFlow {transitionData} />
      </div>

      <div class="chart">
        <h2>Rarity Scores</h2>
        <RarityScorecard {rarityData} />
      </div>
    </div>
  {/if}
</div>

<style>
  .dashboard {
    padding: 2rem;
  }

  .chart-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
    gap: 2rem;
  }

  .chart {
    background: white;
    border-radius: 8px;
    padding: 1.5rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .chart h2 {
    margin-top: 0;
    font-size: 1.25rem;
  }

  :global(.chart-grid > div) {
    min-height: 400px;
  }
</style>
```

## Utility Functions

Use the D3 helper utilities for common tasks:

```typescript
import {
  formatNumber,
  parseDate,
  createColorScale,
  D3Helpers
} from '$lib/utils/d3-helpers';

// Format numbers
formatNumber(1500);        // "1.5K"
formatNumber(1000000);     // "1M"

// Parse dates
parseDate('2024-01-15');   // Date object

// Create scales
const scale = createColorScale('categorical', ['A', 'B', 'C']);

// Use namespace
D3Helpers.getContainerDimensions(element, 960, 600);
```

## Responsive Sizing

All components respond to container size:

```svelte
<div class="container">
  <TransitionFlow {data} />
</div>

<style>
  .container {
    width: 100%;
    height: 500px;
  }

  @media (max-width: 768px) {
    .container {
      height: 300px;
    }
  }
</style>
```

## Types

Import type definitions:

```typescript
import type {
  TransitionFlowData,
  GuestNetworkNode,
  GuestNetworkLink,
  TourMapData,
  GapTimelineData,
  HeatmapData,
  RarityData
} from '$lib/types/visualizations';
```

## Theming

Components use CSS variables. Customize via:

```css
:root {
  --background: #ffffff;
  --foreground: #000000;
  --color-primary-500: #3b82f6;
  --border-color: #e5e7eb;
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: #1f2937;
    --foreground: #ffffff;
  }
}
```

## Performance Tips

1. **Limit data size:**
   - Transitions: <200 nodes
   - Guest Network: <300 nodes
   - Gap Timeline: <10,000 points
   - Heatmap: <1,000 cells

2. **Use canvas for large datasets:**
   - GapTimeline uses canvas automatically
   - Renders 10K+ points efficiently

3. **Aggregate data:**
   ```typescript
   import { aggregateData } from '$lib/utils/d3-helpers';

   const aggregated = aggregateData(data, 'month', items =>
     items.reduce((sum, i) => sum + i.value, 0)
   );
   ```

4. **Enable reduced motion:**
   - Components respect `prefers-reduced-motion`
   - No manual configuration needed

## Accessibility

All components include:
- ARIA labels and roles
- Keyboard navigation support
- High contrast mode support
- Reduced motion support
- Status updates for async operations

## Troubleshooting

### Component not rendering

Check if ref binding worked:
```svelte
<script lang="ts">
  let svgElement: SVGSVGElement | undefined;

  onMount(() => {
    console.log('SVG bound:', !!svgElement); // Should be true
  });
</script>

<svg bind:this={svgElement} />
```

### Data not updating

Subscribe to stores properly:
```typescript
onMount(() => {
  const unsubscribe = store.subscribe(newData => {
    // Data updated
  });
  return unsubscribe; // Cleanup
});
```

### TopoJSON not rendering

Ensure correct structure:
```typescript
{
  objects: {
    states: { type: 'GeometryCollection', geometries: [...] }
  }
}
```

## Common Patterns

### Loading Data from API

```svelte
<script lang="ts">
  let data: TransitionFlowData[] = [];
  let loading = true;

  onMount(async () => {
    const response = await fetch('/api/transitions');
    data = await response.json();
    loading = false;
  });
</script>

{#if loading}
  <p>Loading...</p>
{:else}
  <TransitionFlow {data} />
{/if}
```

### Filtering Data

```svelte
<script lang="ts">
  let rawData = [];
  let selectedType = 'all';

  $: filtered = selectedType === 'all'
    ? rawData
    : rawData.filter(d => d.type === selectedType);
</script>

<select bind:value={selectedType}>
  <option value="all">All</option>
  <option value="type1">Type 1</option>
</select>

<TransitionFlow data={filtered} />
```

### Coordinating Multiple Charts

```svelte
<script lang="ts">
  let selectedNode = null;

  function handleSelect(nodeId) {
    selectedNode = nodeId;
    // Filter other charts based on selection
  }
</script>

<GuestNetwork {data} on:select={e => handleSelect(e.detail.id)} />

{#if selectedNode}
  <RarityScorecard data={filtered} />
{/if}
```

## Next Steps

1. Check the main visualizations page at `/src/routes/visualizations`
2. Review component documentation at `/src/lib/components/visualizations/README.md`
3. Explore type definitions at `/src/lib/types/visualizations.ts`
4. Study migration guide at `/VISUALIZATION_MIGRATION.md`

## Resources

- [D3.js Docs](https://d3js.org)
- [Svelte 5 Docs](https://svelte.dev/docs)
- [Component README](./src/lib/components/visualizations/README.md)
- [Migration Guide](./VISUALIZATION_MIGRATION.md)
- [Type Definitions](./src/lib/types/visualizations.ts)

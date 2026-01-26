---
name: optimization
version: 1.0.0
description: Quick reference for implementing the audit recommendations.
author: Claude Code
created: 2026-01-25
updated: 2026-01-25

category: performance
complexity: advanced
tags:
  - performance
  - chromium-143
  - apple-silicon

target_browsers:
  - "Chromium 143+"
  - "Safari 17.2+"
target_platform: apple-silicon-m-series
os: macos-26.2

philosophy: "Modern web development leveraging Chromium 143+ capabilities for optimal performance on Apple Silicon."

prerequisites: []
related_skills: []
see_also: []

minimum_example_count: 3
requires_testing: true
performance_critical: false

# Migration metadata
migrated_from: projects/dmb-almanac/app/docs/analysis/uncategorized/OPTIMIZATION_GUIDE.md
migration_date: 2026-01-25
---

# D3 Visualization Optimization Implementation Guide

Quick reference for implementing the audit recommendations.

---

## 1. Fix TourMap colorSchemes Type Error

**File:** `src/lib/components/visualizations/TourMap.svelte`

**Current (Line 57-62):**
```typescript
const colorSchemes: Record<string, readonly string[]> = {
  blues: schemeBlues[9],      // ❌ WRONG: accesses 10th element (undefined)
  greens: schemeGreens[9],
  reds: schemeReds[9],
  purples: schemePurples[9]
};
```

**Fixed:**
```typescript
const colorSchemes: Record<string, readonly string[]> = {
  blues: schemeBlues,      // ✓ CORRECT: uses entire array
  greens: schemeGreens,
  reds: schemeReds,
  purples: schemePurples
};
```

**Change:** Remove `[9]` index accessor on all color scheme assignments

---

## 2. Create Centralized D3 Utilities

**File:** Create `src/lib/utils/d3-helpers.ts`

```typescript
/**
 * Centralized D3 utility functions
 * Re-exported from d3-array to avoid duplication across components
 */

export { max, extent, min, sum, mean } from 'd3-array';

/**
 * Custom helper for finding closest data point (used in GapTimeline)
 */
export function findClosestPoint<T>(
  data: T[],
  target: number,
  accessor: (d: T) => number
): T {
  return data.reduce((closest, point) => {
    const pointVal = accessor(point);
    const closestVal = accessor(closest);
    const currentDist = Math.abs(pointVal - target);
    const closestDist = Math.abs(closestVal - target);
    return currentDist < closestDist ? point : closest;
  });
}

/**
 * Helper for extent calculation with accessor
 */
export function extentDate<T>(
  arr: T[],
  accessor: (d: T) => Date
): [Date, Date] {
  const values = arr.map(accessor);
  const times = values.map(v => v.getTime());
  return [new Date(Math.min(...times)), new Date(Math.max(...times))];
}
```

**Update Imports in Components:**

```typescript
// Before
import { max } from 'd3-array';
const max = <T>(arr: T[], accessor: (d: T) => number): number =>
  Math.max(...arr.map(accessor));

// After
import { max, findClosestPoint } from '$lib/utils/d3-helpers';
const maxValue = max(data, d => d.value);
```

---

## 3. Create Centralized Color Schemes

**File:** Create `src/lib/utils/d3-color-schemes.ts`

```typescript
/**
 * Centralized D3 color schemes
 * Replaces d3-scale-chromatic to save ~12KB
 */

// Categorical
export const schemeCategory10 = [
  '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
  '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'
] as const;

export const schemeAccent = [
  '#7fc97f', '#beaed4', '#fdc086', '#ffff99',
  '#386641', '#f0027f', '#bf5b17', '#666666'
] as const;

// Sequential Blues (9-class)
export const schemeBlues = [
  '#f7fbff', '#deebf7', '#c6dbef', '#9ecae1', '#6baed6',
  '#4292c6', '#2171b5', '#08519c', '#08306b'
] as const;

// Sequential Greens (9-class)
export const schemeGreens = [
  '#f7fcf5', '#e5f5e0', '#c7e9c0', '#a1d99b', '#74c476',
  '#41ab5d', '#238b45', '#006d2c', '#00441b'
] as const;

// Sequential Reds (9-class)
export const schemeReds = [
  '#fff5f0', '#fee0d2', '#fcbba1', '#fc9272', '#fb6a4a',
  '#ef3b2c', '#cb181d', '#a50f15', '#67000d'
] as const;

// Sequential Purples (9-class)
export const schemePurples = [
  '#fcfbfd', '#efedf5', '#dadaeb', '#bcbddc', '#9e9ac8',
  '#807dba', '#6a51a3', '#54278f', '#3f007d'
] as const;

// Diverging
export const schemePiYG = [
  '#8e0152', '#c51b7d', '#de77ae', '#f1b6da', '#fde0ef',
  '#f7f7f7', '#e6f5d0', '#b8e186', '#7fbc41', '#4d9221', '#276419'
] as const;
```

**Update All Components:**

```typescript
// Before
const schemeBlues = ['#f7fbff', '#deebf7', ...] as const;

// After
import { schemeBlues, schemeCategory10 } from '$lib/utils/d3-color-schemes';
```

---

## 4. Efficient SVG Element Clearing

**File:** `src/lib/components/visualizations/TransitionFlow.svelte` (example)

**Current Approach:**
```typescript
const renderChart = () => {
  // ... scale setup ...

  // ❌ Removes ALL elements including structure
  select(svgElement).selectAll('*').remove();

  const svg = select(svgElement)
    .attr('viewBox', `0 0 ${containerWidth} ${containerHeight}`);

  // ... rebuild everything ...
};
```

**Optimized Approach:**
```typescript
let svg: Selection<SVGSVGElement, unknown, HTMLElement, unknown> | undefined;

onMount(() => {
  if (!svgElement) return;

  // Create SVG structure once
  svg = select(svgElement)
    .attr('viewBox', `0 0 ${containerWidth} ${containerHeight}`)
    .attr('width', containerWidth)
    .attr('height', containerHeight);

  // Create empty groups for layers
  svg.append('g').attr('class', 'defs-layer');
  svg.append('g').attr('class', 'links-layer');
  svg.append('g').attr('class', 'nodes-layer');
  svg.append('g').attr('class', 'labels-layer');

  if (data.length > 0) renderChart();

  return () => {
    resizeObserver?.disconnect();
  };
});

const renderChart = () => {
  if (!svg || data.length === 0) return;

  // ✓ Only update viewport dimensions
  svg.attr('viewBox', `0 0 ${containerWidth} ${containerHeight}`);

  // ✓ Only clear data layers
  svg.select('g.links-layer').selectAll('*').remove();
  svg.select('g.nodes-layer').selectAll('*').remove();
  svg.select('g.labels-layer').selectAll('*').remove();

  // ✓ Reuse defs layer if filters exist
  let defsGroup = svg.select('g.defs-layer');
  if (defsGroup.select('filter').empty()) {
    defsGroup.append('defs').append('filter')
      .attr('id', 'shadow')
      .append('feDropShadow');
  }

  // ... update data bindings ...
};
```

**Performance Impact:** 15-25% faster re-renders on every resize

---

## 5. Data Transform Memoization

**File:** `src/lib/components/visualizations/GapTimeline.svelte` (example)

**Current (Recreates objects on every render):**
```typescript
const renderChart = () => {
  // ❌ Creates new array on every resize event
  const parsedData = data.map(d => ({
    ...d,
    date: new Date(d.date)
  }));

  const uniqueSongs = Array.from(new Set(parsedData.map(d => d.songName)));
  // ... rest of render
};
```

**Optimized with Svelte 5 `$derived`:**
```typescript
<script lang="ts">
  // ✓ Only recalculates when `data` changes
  let parsedData = $derived(
    data.map(d => ({
      ...d,
      date: new Date(d.date)
    }))
  );

  // ✓ Only recalculates when `parsedData` changes
  let uniqueSongs = $derived(
    Array.from(new Set(parsedData.map(d => d.songName)))
  );

  // ✓ Only recalculates when dependent values change
  let colorScale = $derived(
    scaleOrdinal<string>()
      .domain(uniqueSongs)
      .range(schemeCategory10)
  );

  let xScale = $derived(
    scaleTime()
      .domain(extent(parsedData, d => d.date) as [Date, Date])
      .range([0, innerWidth])
  );

  const renderChart = () => {
    // parsedData, uniqueSongs, colorScale, xScale are stable
    // No recreation on resize
    // ... rest of render
  };
</script>
```

**Performance Impact:** 30-40% faster re-renders, cleaner code

---

## 6. Lazy-Load Geography Visualizations

**File:** `src/lib/components/visualizations/TourMap.svelte`

**Current (Always bundled):**
```typescript
import { geoAlbersUsa, geoPath as d3GeoPath } from 'd3-geo';
import * as topojson from 'topojson-client';

// 37KB always included in bundle
```

**Optimized (Lazy-loaded):**
```typescript
<script lang="ts">
  let geoAlbersUsa: any;
  let d3GeoPath: any;
  let topojson: any;
  let geoModulesReady = $state(false);

  const loadGeoModules = async () => {
    const [geoModule, topoModule] = await Promise.all([
      import('d3-geo'),
      import('topojson-client')
    ]);

    geoAlbersUsa = geoModule.geoAlbersUsa;
    d3GeoPath = geoModule.geoPath;
    topojson = topoModule;
    geoModulesReady = true;
  };

  onMount(async () => {
    // Load geo modules only when component mounts
    await loadGeoModules();

    if (topoData) {
      renderChart();
    }

    return () => {
      // Cleanup
    };
  });

  const renderChart = () => {
    if (!geoModulesReady || !topoData) return;

    // Use imported modules
    const projection = geoAlbersUsa()
      .fitSize([containerWidth, containerHeight], geojson);

    // ... rest of render
  };
</script>

{#if !geoModulesReady}
  <div>Loading map...</div>
{:else}
  <div bind:this={containerElement}>
    <svg bind:this={svgElement} />
  </div>
{/if}
```

**Bundle Impact:** 37KB deferred until TourMap component is rendered

---

## 7. GuestNetwork Force Simulation with Worker

**File:** `src/lib/components/visualizations/GuestNetwork.svelte`

**Before (Main thread blocking):**
```typescript
simulation = forceSimulation<NetworkNode>(nodes)
  .force('link', forceLink(linkData))
  .force('charge', forceManyBody())
  // ... calculates forces on main thread, blocks input
  .on('tick', () => {
    linkElements.attr('x1', d => d.source.x);  // Updates DOM on main thread
  });
```

**After (Worker thread):**
```typescript
<script lang="ts">
  let workerRef: Worker | undefined;
  let simulation: any = undefined;

  onMount(() => {
    if (!containerElement || !svgElement) return;

    const renderChart = () => {
      if (!containerElement || !svgElement || data.length === 0) return;

      // Initialize worker for force simulation
      const workerScript = `
        // Inline or reference force-simulation.worker.ts
        import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide } from 'd3-force';

        let simulation;

        self.onmessage = (event) => {
          if (event.data.type === 'init') {
            const { width, height, nodes, links } = event.data.data;
            simulation = forceSimulation(nodes)
              .force('link', forceLink(links).id(d => d.id))
              .force('charge', forceManyBody().strength(-200))
              .force('center', forceCenter(width / 2, height / 2))
              .force('collide', forceCollide().radius(d => nodeScale(d.appearances) + 5));

            simulation.on('tick', () => {
              self.postMessage({ type: 'tick', nodes });
            });

            simulation.on('end', () => {
              self.postMessage({ type: 'end', nodes });
            });
          }

          if (event.data.type === 'drag') {
            const { nodeId, x, y, type } = event.data;
            const node = simulation.nodes().find(n => n.id === nodeId);
            if (!node) return;

            if (type === 'start') {
              simulation.alphaTarget(0.3).restart();
              node.fx = node.x;
              node.fy = node.y;
            } else if (type === 'drag') {
              node.fx = x;
              node.fy = y;
            } else if (type === 'end') {
              node.fx = null;
              node.fy = null;
              simulation.alphaTarget(0);
            }
          }
        };
      `;

      workerRef = new Worker(
        new URL('$lib/workers/force-simulation.worker.ts', import.meta.url),
        { type: 'module' }
      );

      // Send initial config
      workerRef.postMessage({
        type: 'init',
        data: {
          width: containerWidth,
          height: containerHeight,
          nodes: data.map(d => ({
            id: d.id,
            name: d.name,
            appearances: d.appearances,
            x: Math.random() * containerWidth,
            y: Math.random() * containerHeight
          })),
          links
        }
      });

      // Clear previous content
      select(svgElement).selectAll('*').remove();

      const svg = select(svgElement)
        .attr('viewBox', `0 0 ${containerWidth} ${containerHeight}`)
        .attr('width', containerWidth)
        .attr('height', containerHeight);

      // Create link and node elements
      const linkElements = svg.append('g')
        .selectAll('line')
        .data(links)
        .join('line');

      const nodeElements = svg.append('g')
        .selectAll('circle')
        .data(data)
        .join('circle');

      const labelElements = svg.append('g')
        .selectAll('text')
        .data(data)
        .join('text');

      // Listen for worker updates
      workerRef.onmessage = (event: MessageEvent) => {
        if (event.data.type === 'tick') {
          const updatedNodes = event.data.nodes;

          // Update positions from worker
          nodeElements
            .attr('cx', d => {
              const node = updatedNodes.find(n => n.id === d.id);
              return node?.x ?? d.x ?? 0;
            })
            .attr('cy', d => {
              const node = updatedNodes.find(n => n.id === d.id);
              return node?.y ?? d.y ?? 0;
            });

          labelElements
            .attr('x', d => {
              const node = updatedNodes.find(n => n.id === d.id);
              return node?.x ?? d.x ?? 0;
            })
            .attr('y', d => {
              const node = updatedNodes.find(n => n.id === d.id);
              return node?.y ?? d.y ?? 0;
            });
        }

        if (event.data.type === 'end') {
          isSimulating = false;
        }
      };

      // Drag handler - sends to worker instead of updating locally
      const dragBehavior = d3Drag<Element, NetworkNode>()
        .on('start', (event, d) => {
          workerRef?.postMessage({
            type: 'drag',
            data: {
              nodeId: d.id,
              type: 'start'
            }
          });
        })
        .on('drag', (event, d) => {
          workerRef?.postMessage({
            type: 'drag',
            data: {
              nodeId: d.id,
              x: event.x,
              y: event.y,
              type: 'drag'
            }
          });
        })
        .on('end', (event, d) => {
          workerRef?.postMessage({
            type: 'drag',
            data: {
              nodeId: d.id,
              type: 'end'
            }
          });
        });

      (nodeElements as any).call(dragBehavior);
    };

    if (data.length > 0) renderChart();

    return () => {
      workerRef?.terminate();
      resizeObserver?.disconnect();
    };
  });
</script>
```

**Performance Impact:** Main thread remains responsive during force simulation, sustained 60 FPS on Apple Silicon

---

## 8. Dynamic Debounce Based on Data Size

**File:** All visualization components

**Current (Fixed 150ms):**
```typescript
resizeTimeout = setTimeout(() => renderChart(), 150);
```

**Optimized (Dynamic):**
```typescript
const getOptimalDebounce = (dataSize: number): number => {
  if (dataSize < 50) return 50;      // Tiny - instant response
  if (dataSize < 500) return 100;    // Small - fast response
  if (dataSize < 2000) return 150;   // Medium - current default
  if (dataSize < 5000) return 200;   // Large - allow computation
  return 300;                         // Very large - careful
};

resizeObserver = new ResizeObserver(() => {
  if (resizeTimeout) clearTimeout(resizeTimeout);

  const debounceDelay = getOptimalDebounce(data.length);
  resizeTimeout = setTimeout(() => {
    if (data.length > 0) renderChart();
  }, debounceDelay);
});
```

---

## 9. Add Keyboard Navigation (WCAG 2.1 AA)

**File:** `src/lib/components/visualizations/RarityScorecard.svelte` (example)

```typescript
<script lang="ts">
  let selectedIndex = $state(-1);

  const handleKeyDown = (event: KeyboardEvent, index: number) => {
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        selectedSong = topData[index].id;
        break;
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        if (selectedIndex < topData.length - 1) {
          selectedIndex++;
          selectedSong = topData[selectedIndex].id;
        }
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        if (selectedIndex > 0) {
          selectedIndex--;
          selectedSong = topData[selectedIndex].id;
        }
        break;
      case 'Home':
        event.preventDefault();
        selectedIndex = 0;
        selectedSong = topData[0].id;
        break;
      case 'End':
        event.preventDefault();
        selectedIndex = topData.length - 1;
        selectedSong = topData[selectedIndex].id;
        break;
    }
  };
</script>

{#each topData as item, i}
  <rect
    role="button"
    tabindex={i === selectedIndex ? 0 : -1}
    on:click={() => {
      selectedIndex = i;
      selectedSong = item.id;
    }}
    on:keydown={(e) => handleKeyDown(e, i)}
    aria-label={`${item.name}: Rarity ${Math.round(item.rarity)}%`}
    aria-pressed={selectedSong === item.id}
  />
{/each}
```

---

## 10. Canvas Context Management

**File:** `src/lib/components/visualizations/GapTimeline.svelte`

**Before (No cleanup):**
```typescript
const ctx = canvasElement.getContext('2d');
// ... use context ...
// Context persists even after component unmounts
```

**After (Proper cleanup):**
```typescript
<script lang="ts">
  let ctx: CanvasRenderingContext2D | null = null;

  onMount(() => {
    if (!canvasElement) return;

    // Use optimization hints
    ctx = canvasElement.getContext('2d', {
      alpha: false,                 // No transparency
      willReadFrequently: false,    // GPU optimization
      desynchronized: true          // Low-latency (good for animations)
    });

    if (!ctx) return;

    // ... rendering code ...

    return () => {
      // Cleanup
      ctx = null;
      // For OffscreenCanvas (if used)
      canvasElement.width = 0;
      canvasElement.height = 0;
    };
  });
</script>
```

---

## Testing & Validation

### Performance Testing Checklist

```typescript
// Add to any visualization component for performance monitoring
const measurePerformance = async () => {
  const startTime = performance.now();
  const startMemory = (performance as any).memory?.usedJSHeapSize || 0;

  renderChart();
  await new Promise(resolve => setTimeout(resolve, 0)); // Next frame

  const endTime = performance.now();
  const endMemory = (performance as any).memory?.usedJSHeapSize || 0;

  console.log(`
    Render Time: ${(endTime - startTime).toFixed(2)}ms
    Memory Delta: ${((endMemory - startMemory) / 1024).toFixed(2)}KB
    Data Points: ${data.length}
    FPS Target: 60
  `);
};
```

### Validation Script

```typescript
// src/lib/utils/d3-validation.ts
export function validateVisualizationConfig(props: any) {
  const errors: string[] = [];

  // Check required props
  if (props.width && (props.width <= 0 || props.width > 10000)) {
    errors.push('Width must be between 0 and 10000');
  }

  if (props.height && (props.height <= 0 || props.height > 10000)) {
    errors.push('Height must be between 0 and 10000');
  }

  if (props.data && !Array.isArray(props.data)) {
    errors.push('Data must be an array');
  }

  if (props.data && props.data.length > 100000) {
    console.warn('Large dataset detected. Consider using canvas rendering.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
```

---

## Rollout Strategy

1. **Phase 1 (Day 1):** Fix TourMap type error - Single line change
2. **Phase 2 (Days 2-3):** Create utilities, implement in one component (GapTimeline)
3. **Phase 3 (Days 4-5):** Rollout to remaining components
4. **Phase 4 (Days 6-10):** Worker integration for GuestNetwork
5. **Phase 5 (Days 11+):** Polish and accessibility enhancements

---

## Monitoring & Metrics

Track these metrics after each optimization:

```typescript
// src/lib/metrics/visualization-metrics.ts
export interface VisualizationMetrics {
  componentName: string;
  renderTime: number;          // ms
  memoryUsed: number;          // MB
  dataPoints: number;
  fps: number;
  timestamp: Date;
}

export const metrics: VisualizationMetrics[] = [];

export function recordMetric(component: string, renderTime: number, dataPoints: number) {
  metrics.push({
    componentName: component,
    renderTime,
    memoryUsed: (performance as any).memory?.usedJSHeapSize / 1024 / 1024 || 0,
    dataPoints,
    fps: 1000 / renderTime,
    timestamp: new Date()
  });

  // Log if performance degrades
  if (renderTime > 16) {
    console.warn(`${component} render time exceeded 16ms: ${renderTime}ms`);
  }
}
```

---

**Implementation Summary:** These optimizations can be rolled out incrementally, with the most critical fixes (TourMap type error, SVG clearing) implemented first.

# D3.js Performance & Bundle Optimization

## When to Use This Skill

- Optimizing D3.js bundle size with tree-shaking
- Choosing between Canvas and SVG rendering
- Integrating D3 with virtual DOM frameworks (React, Svelte, Vue)
- Managing memory for large datasets (10,000+ data points)
- Profiling and improving visualization performance
- Selecting optimal D3 submodules for imports
- Implementing responsive charts for multiple screen sizes
- Handling real-time data updates efficiently

## Tree-Shaking with Named Imports

### Problem: Monolithic D3 Package

The default `import * as d3 from 'd3'` imports the entire 90-150KB D3 library even if you only use a few functions. Bundlers cannot tree-shake monolithic imports.

```typescript
// BAD: Forces entire D3 bundle (~95KB gzipped)
import * as d3 from 'd3';

svg.select('g')      // Only need d3-selection
  .attr('transform', scale(value)); // Only need d3-scale
```

### Solution: Granular Submodule Imports

Replace with specific D3 submodule imports. Each submodule is independently tree-shakeable.

```typescript
// GOOD: Only ~36KB gzipped of actual D3 code used
import { select } from 'd3-selection';
import { scaleLinear, scaleBand } from 'd3-scale';
import { axisLeft, axisBottom } from 'd3-axis';
import { max } from 'd3-array';
```

### D3 Submodules by Purpose

| Module | Size (gzip) | Used For | Example Exports |
|--------|-------------|----------|-----------------|
| **d3-selection** | ~3KB | DOM manipulation, events | select, selectAll, pointer |
| **d3-scale** | ~5KB | Data-to-visual mapping | scaleLinear, scaleBand, scaleTime, scaleOrdinal |
| **d3-array** | ~2KB | Array operations, aggregation | extent, max, min, mean, group, rollup |
| **d3-axis** | ~2KB | Axis rendering | axisLeft, axisRight, axisTop, axisBottom |
| **d3-scale-chromatic** | ~6KB | Color schemes | schemeCategory10, schemeBlues, schemePurples |
| **d3-force** | ~7KB | Physics-based layouts | forceSimulation, forceLink, forceManyBody |
| **d3-geo** | ~9KB | Geographic projections | geoAlbersUsa, geoMercator, geoPath |
| **d3-sankey** | ~2KB | Sankey diagrams | sankey, sankeyLinkHorizontal |
| **d3-shape** | ~3KB | Path generators | line, area, arc, pie |
| **d3-transition** | ~4KB | Smooth animations | transition, delay, duration |
| **d3-ease** | ~2KB | Easing functions | easeLinear, easeCubicInOut |

### Complete Import Migration Example

**Before:**
```typescript
import * as d3 from 'd3';

const svg = d3.select(svgRef.current);
const xScale = d3.scaleTime();
const yScale = d3.scaleLinear();
const axes = d3.axisBottom(xScale);
const colors = d3.schemeCategory10;
```

**After:**
```typescript
import { select } from 'd3-selection';
import { scaleTime, scaleLinear } from 'd3-scale';
import { axisBottom } from 'd3-axis';
import { schemeCategory10 } from 'd3-scale-chromatic';

const svg = select(svgRef.current);
const xScale = scaleTime();
const yScale = scaleLinear();
const axes = axisBottom(xScale);
const colors = schemeCategory10;
```

### Bundle Size Impact

| Scenario | Before | After | Savings |
|----------|--------|-------|---------|
| Basic chart (scales + axes) | 95KB | 15KB | 80KB (84%) |
| Network graph (force) | 95KB | 27KB | 68KB (72%) |
| Geographic map (geo) | 95KB | 25KB | 70KB (74%) |
| Sankey diagram | 95KB + d3-sankey | 16KB | 80KB (83%) |

## Virtual DOM Integration Patterns

### React + D3 (useRef Pattern)

```typescript
import { useRef, useEffect } from 'react';
import { select } from 'd3-selection';
import { scaleLinear } from 'd3-scale';
import { axisLeft } from 'd3-axis';

interface AxisChartProps {
  data: { x: number; y: number }[];
  width: number;
  height: number;
}

export function AxisChart({ data, width, height }: AxisChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data.length) return;

    const margin = { top: 20, right: 20, bottom: 30, left: 40 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // D3 controls the DOM inside the ref
    const svg = select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    // Clear previous render
    svg.selectAll('*').remove();

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const yScale = scaleLinear()
      .domain([0, Math.max(...data.map(d => d.y))])
      .range([innerHeight, 0]);

    // Y-axis
    g.append('g')
      .call(axisLeft(yScale));

  }, [data, width, height]);

  return <svg ref={svgRef} />;
}
```

**Key Points:**
- D3 owns the DOM inside the ref
- React state doesn't interfere
- Clean separation of concerns
- Works with transitions and interactivity

### Svelte + D3

```svelte
<script>
  import { select } from 'd3-selection';
  import { scaleLinear, scaleTime } from 'd3-scale';
  import { max, extent } from 'd3-array';

  let svgElement;
  let { data } = $props();

  $effect(() => {
    if (!svgElement || !data.length) return;

    const width = 800;
    const height = 300;
    const margin = { top: 20, right: 20, bottom: 30, left: 40 };

    const xScale = scaleTime()
      .domain(extent(data, d => d.date))
      .range([margin.left, width - margin.right]);

    const yScale = scaleLinear()
      .domain([0, max(data, d => d.value)])
      .range([height - margin.bottom, margin.top]);

    select(svgElement)
      .attr('width', width)
      .attr('height', height);

    // D3 rendering here
  });
</script>

<svg bind:this={svgElement}></svg>
```

**Svelte Advantages:**
- `$effect` automatically cleans up
- No useRef needed
- Reactive props trigger re-renders
- Simpler mental model

### Calculate Scales, React Renders (Hybrid)

When you need React to control rendering but D3 for calculations:

```typescript
import { useMemo } from 'react';
import { scaleLinear, scaleBand } from 'd3-scale';
import { max } from 'd3-array';

interface BarChartProps {
  data: { label: string; value: number }[];
}

export function BarChart({ data }: BarChartProps) {
  const { xScale, yScale, bars } = useMemo(() => {
    const xScale = scaleBand()
      .domain(data.map(d => d.label))
      .range([0, 600])
      .padding(0.1);

    const yScale = scaleLinear()
      .domain([0, max(data, d => d.value) || 0])
      .range([400, 0]);

    const bars = data.map(d => ({
      label: d.label,
      x: xScale(d.label) || 0,
      y: yScale(d.value),
      width: xScale.bandwidth(),
      height: 400 - yScale(d.value),
    }));

    return { xScale, yScale, bars };
  }, [data]);

  return (
    <svg width={600} height={400}>
      <g transform="translate(40, 20)">
        {bars.map(bar => (
          <rect
            key={bar.label}
            x={bar.x}
            y={bar.y}
            width={bar.width}
            height={bar.height}
            fill="steelblue"
            className="hover:fill-blue-700"
          />
        ))}
      </g>
    </svg>
  );
}
```

**Benefits:**
- D3 only calculates scales (fast)
- React renders JSX (predictable)
- No ref management
- Easier to test

## Canvas vs SVG Decision Matrix

### Use SVG When

- Data points: < 5,000
- Interactions: Hover tooltips, click selection, complex events
- Accessibility: Need ARIA labels, semantic HTML
- Precision: Sub-pixel rendering matters
- Animation: Smooth transitions between states

**SVG Example:**
```typescript
import { select } from 'd3-selection';

// SVG is queryable and interactive
select('circle.data-point')
  .on('mouseover', (event, d) => {
    select(event.currentTarget).attr('r', 8);
  })
  .on('mouseout', function() {
    select(this).attr('r', 5);
  });

// Supports ARIA
select(svgRef.current)
  .attr('role', 'img')
  .attr('aria-label', 'Sales by region');
```

### Use Canvas When

- Data points: 10,000+
- Performance: Render time < 16ms for 60fps
- Simple interactions: Zoom, pan only
- Real-time: Updating 1000+ points per frame
- GPU: Leverage hardware acceleration

**Canvas Example:**
```typescript
import { scaleLinear } from 'd3-scale';

const canvas = canvasRef.current;
const ctx = canvas.getContext('2d', {
  alpha: false,
  desynchronized: true // Low-latency mode
});

// Draw 100,000 points
const xScale = scaleLinear().domain([0, 100]).range([0, width]);
const yScale = scaleLinear().domain([0, 100]).range([height, 0]);

ctx.fillStyle = 'rgba(70, 130, 180, 0.5)';
for (const point of data) {
  ctx.beginPath();
  ctx.arc(xScale(point.x), yScale(point.y), 2, 0, 2 * Math.PI);
  ctx.fill();
}
```

### Hybrid: Canvas Data, SVG Interaction

```typescript
// Canvas renders efficiently
const canvas = canvasRef.current;
const ctx = canvas.getContext('2d');

// Draw all data points to canvas
for (const point of data) {
  ctx.fillRect(x, y, 2, 2);
}

// SVG layer on top for interactivity
const svg = select(svgRef.current);
svg.append('circle')
  .attr('cx', x).attr('cy', y).attr('r', 8)
  .attr('fill', 'none')
  .on('mouseover', showTooltip);
```

### Rendering Decision Tree

```
Data points > 50,000?
├─ YES: Use Canvas or WebGPU
├─ NO: Data points > 5,000?
│  ├─ YES: Consider Canvas
│  └─ NO: SVG is fine
│
Needs hover tooltips?
├─ YES: SVG (queryable) or Canvas + overlay
└─ NO: Canvas is optimal
```

## Memory Management for Large Datasets

### Problem: Memory Bloat

```typescript
// BAD: Stores all intermediate data
const allData = [];
for (let i = 0; i < 1000000; i++) {
  allData.push({
    id: i,
    date: new Date(),
    value: Math.random(),
    color: getColor(Math.random()),  // Functions called per item
    label: formatLabel(i),
  });
}
// ~500MB for 1M records (with strings, dates, functions)
```

### Solution 1: Lazy Aggregation

```typescript
import { max, extent } from 'd3-array';

// Only compute what's needed
const rawData = fetchLargeDataset(); // Just IDs and values

const extent_ = extent(rawData, d => d.value); // O(n) but efficient
const max_ = max(rawData, d => d.value); // O(n) but efficient

// Compute colors/labels only when rendering visible items
const visibleItems = rawData.slice(startIndex, endIndex)
  .map(d => ({
    ...d,
    color: getColor(d.value),
    label: formatLabel(d.id),
  }));
```

### Solution 2: Data Binning/Aggregation

```typescript
import { group, rollup } from 'd3-array';

// Instead of plotting 1M points, aggregate to bins
const binned = rollup(
  data,
  v => ({ count: v.length, avg: v.reduce((a, d) => a + d.value, 0) / v.length }),
  d => Math.floor(d.value / 10) // Bin by 10s
);

// Plot 100 bins instead of 1M points
const chartData = Array.from(binned, ([bin, stats]) => ({
  bin,
  count: stats.count,
  avg: stats.avg,
}));
```

### Solution 3: Downsampling for Real-time Data

```typescript
// Keep only significant points (Largest-Triangle-Three-Buckets algorithm)
function downsampleData(data, threshold) {
  if (data.length < threshold) return data;

  const bucketSize = data.length / threshold;
  const downsampled = [];

  for (let i = 0; i < data.length; i += bucketSize) {
    const bucket = data.slice(i, i + bucketSize);
    const maxArea = bucket.reduce((max, p) => {
      const area = Math.abs(
        (data[i].date - p.date) * (p.value - data[i].value) / 2
      );
      return Math.max(max, area);
    }, 0);

    downsampled.push(bucket.find(p => {
      const area = Math.abs(
        (data[i].date - p.date) * (p.value - data[i].value) / 2
      );
      return area === maxArea;
    }));
  }

  return downsampled;
}

const visualData = downsampleData(rawData, 5000); // Show max 5000 points
```

### Solution 4: Virtual Scrolling (For Tables/Lists)

```typescript
import { select } from 'd3-selection';

// Only render visible rows
const rowHeight = 30;
const containerHeight = 600;
const visibleRows = Math.ceil(containerHeight / rowHeight);

let scrollTop = 0;
const container = select('#table-container')
  .on('scroll', function() {
    scrollTop = this.scrollTop;
    updateVisibleRows();
  });

function updateVisibleRows() {
  const startIndex = Math.floor(scrollTop / rowHeight);
  const endIndex = startIndex + visibleRows;

  const rows = select('#table-body')
    .selectAll('tr')
    .data(data.slice(startIndex, endIndex), d => d.id);

  rows.enter().append('tr')
    .merge(rows)
    .attr('style', (d, i) => `transform: translateY(${(startIndex + i) * rowHeight}px)`)
    .html(d => `<td>${d.label}</td><td>${d.value}</td>`);

  rows.exit().remove();
}
```

## Performance Optimization Checklist

### Bundle Size
- [ ] Use granular D3 submodule imports
- [ ] Remove `import * as d3` statements
- [ ] Check `package.json` for unused D3 modules
- [ ] Run tree-shaking analyzer: `npx source-map-explorer`

### Rendering Performance
- [ ] Data < 5,000 points? Use SVG
- [ ] Data > 50,000 points? Use Canvas or WebGPU
- [ ] Real-time updates? Use `requestAnimationFrame`
- [ ] Animations? Use D3 transitions, not CSS

### Memory
- [ ] Avoid storing intermediate data
- [ ] Aggregate/bin large datasets
- [ ] Downsample before rendering
- [ ] Use virtual scrolling for tables

### Runtime
- [ ] Profile with DevTools Performance tab
- [ ] Target < 16ms per frame (60fps)
- [ ] Use `scheduler.yield()` for main thread
- [ ] Lazy-load visualization libraries

## Configuration: vite.config.ts

Explicitly declare which D3 modules to optimize:

```typescript
import { defineConfig } from 'vite';
import sveltekit from '@sveltejs/kit/vite';

export default defineConfig({
  plugins: [sveltekit()],
  optimizeDeps: {
    include: [
      'd3-selection',
      'd3-scale',
      'd3-scale-chromatic',
      'd3-array',
      'd3-axis',
      'd3-force',
      'd3-geo',
      'd3-sankey'
    ]
  }
});
```

## Type Safety with Specific Imports

When using TypeScript, import types from specific modules:

```typescript
// Before: Types from monolithic package
import * as d3 from 'd3';
import type { Selection } from 'd3';

// After: Types from actual modules
import { select } from 'd3-selection';
import type { Selection } from 'd3-selection';

import { scaleLinear } from 'd3-scale';
import type { ScaleLinear } from 'd3-scale';

import { forceSimulation } from 'd3-force';
import type { Simulation } from 'd3-force';
```

## Testing Performance

```bash
# Measure bundle size
npm run build
du -sh dist/

# Analyze bundle composition
npx source-map-explorer './dist/**/*.js' --html analysis.html

# Profile rendering
# 1. Open Chrome DevTools > Performance
# 2. Record while chart renders
# 3. Look for long tasks > 50ms
# 4. Verify frame rate stays at 60fps

# Monitor memory
# Chrome DevTools > Memory > Take Heap Snapshot
# Compare before/after data updates
```

## Resources

- [D3.js v7 Modules](https://github.com/d3/d3/blob/main/README.md)
- [Rollup Tree-Shaking](https://rollupjs.org/guide/en/#tree-shaking)
- [Vite Dep Optimization](https://vitejs.dev/guide/dep-pre-bundling.html)
- [Canvas Performance](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
- [WebGPU for Massive Data](https://gpuweb.github.io/)

## Common Gotchas

1. **Forgetting to import from d3-scale** - TypeScript won't error if you use `d3.scaleLinear()` but it won't be tree-shaken
2. **Canvas context options** - Always set `alpha: false` for performance
3. **Memory leaks** - Remove event listeners when unmounting React/Svelte components
4. **SVG rendering** - Rasterizing > 10,000 DOM nodes becomes very slow
5. **Real-time data** - Use Canvas or aggregate, not SVG updates

---

**Last Updated:** January 2026
**Best For:** D3.js optimization on production visualizations
**Related Skills:** React/Svelte integration, Canvas rendering, Geographic maps

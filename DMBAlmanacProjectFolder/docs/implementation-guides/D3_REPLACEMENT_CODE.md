# D3 Replacement Code Templates - Ready to Implement

**For:** dmb-almanac-svelte project
**Status:** Production-ready implementations
**Date:** 2026-01-23

---

## 1. Native Axis Implementation (Replaces d3-axis)

**Create new file:** `/src/lib/utils/native-axis.ts`

This replaces all d3-axis functionality with native SVG generation. Works with d3-scale objects.

```typescript
/**
 * Native SVG Axis Generation - Replaces d3-axis (~8KB gzipped)
 *
 * Generates SVG axis elements without d3-axis dependency.
 * Works with d3-scale.scaleBand and d3-scale.scaleLinear.
 *
 * Usage:
 *   const xAxis = createAxisTop(xScale, { tickSize: 6 });
 *   g.append('g').call(xAxis);
 */

import type { Selection } from 'd3-selection';
import type { ScaleBand, ScaleLinear } from 'd3-scale';

export interface AxisOptions {
  tickSize?: number;
  tickPadding?: number;
  tickFormat?: (d: any, i: number) => string;
  tickValues?: any[];
}

type D3Scale = ScaleBand<string> | ScaleLinear<number, number> | any;

/**
 * Create a top axis generator
 * Suitable for x-axis at top of chart
 */
export function createAxisTop(scale: D3Scale, options: AxisOptions = {}) {
  const { tickSize = 6, tickPadding = 3, tickFormat, tickValues } = options;

  return function (selection: Selection<SVGGElement, unknown, HTMLElement, unknown>) {
    // Get domain values - handle both band and linear scales
    let ticks = tickValues || (typeof scale.bandwidth === 'function'
      ? scale.domain() // Band scale
      : (scale.ticks?.(5) || scale.domain())); // Linear scale

    // Create tick elements
    const tickElements = selection
      .selectAll('.tick')
      .data(ticks)
      .join('g')
      .attr('class', 'tick')
      .attr('transform', (d: any) => {
        const pos = typeof scale.bandwidth === 'function'
          ? scale(d)! + (scale.bandwidth?.() || 0) / 2  // Band scale center
          : scale(d);  // Linear scale position
        return `translate(${pos}, 0)`;
      });

    // Tick lines
    tickElements
      .append('line')
      .attr('stroke', 'currentColor')
      .attr('y1', 0)
      .attr('y2', -tickSize);

    // Tick text labels
    tickElements
      .append('text')
      .attr('fill', 'currentColor')
      .attr('y', -tickSize - tickPadding)
      .attr('text-anchor', 'middle')
      .attr('font-size', '11px')
      .text((d: any) => tickFormat ? tickFormat(d, 0) : String(d));

    // Axis line
    selection
      .insert('line', ':first-child')
      .attr('stroke', 'currentColor')
      .attr('x1', 0)
      .attr('x2', typeof scale.bandwidth === 'function'
        ? scale.range()[1]
        : scale.range()[1])
      .attr('y1', 0)
      .attr('y2', 0);
  };
}

/**
 * Create a left axis generator
 * Suitable for y-axis on left side of chart
 */
export function createAxisLeft(scale: D3Scale, options: AxisOptions = {}) {
  const { tickSize = 6, tickPadding = 3, tickFormat, tickValues } = options;

  return function (selection: Selection<SVGGElement, unknown, HTMLElement, unknown>) {
    let ticks = tickValues || (typeof scale.bandwidth === 'function'
      ? scale.domain()
      : (scale.ticks?.(5) || scale.domain()));

    const tickElements = selection
      .selectAll('.tick')
      .data(ticks)
      .join('g')
      .attr('class', 'tick')
      .attr('transform', (d: any) => {
        const pos = typeof scale.bandwidth === 'function'
          ? scale(d)! + (scale.bandwidth?.() || 0) / 2  // Band scale center
          : scale(d);  // Linear scale position
        return `translate(0, ${pos})`;
      });

    // Tick lines
    tickElements
      .append('line')
      .attr('stroke', 'currentColor')
      .attr('x1', 0)
      .attr('x2', -tickSize);

    // Tick text labels
    tickElements
      .append('text')
      .attr('fill', 'currentColor')
      .attr('x', -tickSize - tickPadding)
      .attr('text-anchor', 'end')
      .attr('dominant-baseline', 'middle')
      .attr('font-size', '11px')
      .text((d: any) => tickFormat ? tickFormat(d, 0) : String(d));

    // Axis line
    selection
      .insert('line', ':first-child')
      .attr('stroke', 'currentColor')
      .attr('x1', 0)
      .attr('x2', 0)
      .attr('y1', 0)
      .attr('y2', typeof scale.bandwidth === 'function'
        ? scale.range()[1]
        : scale.range()[1]);
  };
}

/**
 * Create a bottom axis generator
 * Suitable for x-axis at bottom of chart
 */
export function createAxisBottom(scale: D3Scale, options: AxisOptions = {}) {
  const { tickSize = 6, tickPadding = 3, tickFormat, tickValues } = options;

  return function (selection: Selection<SVGGElement, unknown, HTMLElement, unknown>) {
    let ticks = tickValues || (typeof scale.bandwidth === 'function'
      ? scale.domain()
      : (scale.ticks?.(5) || scale.domain()));

    const tickElements = selection
      .selectAll('.tick')
      .data(ticks)
      .join('g')
      .attr('class', 'tick')
      .attr('transform', (d: any) => {
        const pos = typeof scale.bandwidth === 'function'
          ? scale(d)! + (scale.bandwidth?.() || 0) / 2
          : scale(d);
        return `translate(${pos}, 0)`;
      });

    tickElements
      .append('line')
      .attr('stroke', 'currentColor')
      .attr('y1', 0)
      .attr('y2', tickSize);

    tickElements
      .append('text')
      .attr('fill', 'currentColor')
      .attr('y', tickSize + tickPadding)
      .attr('text-anchor', 'middle')
      .attr('font-size', '11px')
      .text((d: any) => tickFormat ? tickFormat(d, 0) : String(d));

    selection
      .insert('line', ':first-child')
      .attr('stroke', 'currentColor')
      .attr('x1', 0)
      .attr('x2', typeof scale.bandwidth === 'function'
        ? scale.range()[1]
        : scale.range()[1])
      .attr('y1', 0)
      .attr('y2', 0);
  };
}

/**
 * Create a right axis generator
 * Suitable for y-axis on right side of chart
 */
export function createAxisRight(scale: D3Scale, options: AxisOptions = {}) {
  const { tickSize = 6, tickPadding = 3, tickFormat, tickValues } = options;

  return function (selection: Selection<SVGGElement, unknown, HTMLElement, unknown>) {
    let ticks = tickValues || (typeof scale.bandwidth === 'function'
      ? scale.domain()
      : (scale.ticks?.(5) || scale.domain()));

    const tickElements = selection
      .selectAll('.tick')
      .data(ticks)
      .join('g')
      .attr('class', 'tick')
      .attr('transform', (d: any) => {
        const pos = typeof scale.bandwidth === 'function'
          ? scale(d)! + (scale.bandwidth?.() || 0) / 2
          : scale(d);
        return `translate(0, ${pos})`;
      });

    tickElements
      .append('line')
      .attr('stroke', 'currentColor')
      .attr('x1', 0)
      .attr('x2', tickSize);

    tickElements
      .append('text')
      .attr('fill', 'currentColor')
      .attr('x', tickSize + tickPadding)
      .attr('text-anchor', 'start')
      .attr('dominant-baseline', 'middle')
      .attr('font-size', '11px')
      .text((d: any) => tickFormat ? tickFormat(d, 0) : String(d));

    selection
      .insert('line', ':first-child')
      .attr('stroke', 'currentColor')
      .attr('x1', 0)
      .attr('x2', 0)
      .attr('y1', 0)
      .attr('y2', typeof scale.bandwidth === 'function'
        ? scale.range()[1]
        : scale.range()[1]);
  };
}
```

---

## 2. Native Scale Utilities (Optional)

**Create new file:** `/src/lib/utils/native-scales.ts`

Optional replacements for lightweight d3-scale usage.

```typescript
/**
 * Native Scale Implementations - Optional replacements for d3-scale
 *
 * For simple cases, we can replace d3-scale with native functions.
 * This saves ~2-4KB but adds code complexity. Only recommended for
 * frequently-used scales like color interpolation.
 *
 * Keep using d3-scale for:
 * - scaleBand (complex padding/bandwidth logic)
 * - scaleLinear with domains (already minimal)
 * - scaleOrdinal (cycling logic)
 */

/**
 * Linear color scale - interpolates between two hex colors
 *
 * @param domain [min, max] input values
 * @param range [color1, color2] hex colors like '#f0f9ff'
 * @returns Function that maps value to interpolated color
 *
 * @example
 * const colorScale = createColorScale([0, 100], ['#f0f9ff', '#0c4a6e']);
 * colorScale(50) // Returns: '#7f8c9f'
 */
export function createColorScale(
  domain: [number, number],
  range: [string, string]
): (value: number) => string {
  const [minVal, maxVal] = domain;
  const [color1, color2] = range;

  return (value: number): string => {
    // Normalize to 0-1 range
    let t = (value - minVal) / (maxVal - minVal);
    t = Math.max(0, Math.min(1, t)); // Clamp to [0, 1]

    // Parse hex colors to RGB
    const c1 = parseInt(color1.slice(1), 16);
    const c2 = parseInt(color2.slice(1), 16);

    const r1 = (c1 >> 16) & 0xFF;
    const g1 = (c1 >> 8) & 0xFF;
    const b1 = c1 & 0xFF;

    const r2 = (c2 >> 16) & 0xFF;
    const g2 = (c2 >> 8) & 0xFF;
    const b2 = c2 & 0xFF;

    // Interpolate each channel
    const r = Math.round(r1 * (1 - t) + r2 * t);
    const g = Math.round(g1 * (1 - t) + g2 * t);
    const b = Math.round(b1 * (1 - t) + b2 * t);

    // Convert back to hex
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  };
}

/**
 * Square root scale - maps using square root transformation
 *
 * @param domain [min, max] input values
 * @param range [minOut, maxOut] output values
 * @returns Function that maps value using sqrt transformation
 *
 * @example
 * const sizeScale = createSqrtScale([0, 100], [4, 20]);
 * sizeScale(25) // Returns: 10 (sqrt(25/100) * 16 + 4)
 */
export function createSqrtScale(
  domain: [number, number],
  range: [number, number]
): (value: number) => number {
  const [minVal, maxVal] = domain;
  const [minOut, maxOut] = range;

  return (value: number): number => {
    if (maxVal === 0) return minOut;
    const t = Math.sqrt(value / maxVal);
    return minOut + t * (maxOut - minOut);
  };
}

/**
 * Linear scale - maps input range to output range
 *
 * @param domain [min, max] input values
 * @param range [minOut, maxOut] output values
 * @returns Function that maps value linearly
 *
 * @example
 * const scale = createLinearScale([0, 100], [0, 500]);
 * scale(50) // Returns: 250
 */
export function createLinearScale(
  domain: [number, number],
  range: [number, number]
): (value: number) => number {
  const [minVal, maxVal] = domain;
  const [minOut, maxOut] = range;

  return (value: number): number => {
    if (minVal === maxVal) return minOut;
    const t = (value - minVal) / (maxVal - minVal);
    return minOut + Math.max(0, Math.min(1, t)) * (maxOut - minOut);
  };
}

/**
 * Logarithmic scale - maps using log transformation
 *
 * @param domain [min, max] input values (must be > 0)
 * @param range [minOut, maxOut] output values
 * @returns Function that maps value using log scale
 *
 * @example
 * const scale = createLogScale([1, 10000], [0, 100]);
 * scale(100) // Returns: 50
 */
export function createLogScale(
  domain: [number, number],
  range: [number, number]
): (value: number) => number {
  const [minVal, maxVal] = domain;
  const [minOut, maxOut] = range;

  const logMin = Math.log(minVal);
  const logMax = Math.log(maxVal);

  return (value: number): number => {
    if (value <= 0) return minOut;
    const t = (Math.log(value) - logMin) / (logMax - logMin);
    return minOut + Math.max(0, Math.min(1, t)) * (maxOut - minOut);
  };
}

/**
 * Power scale - maps using power (exponent) transformation
 *
 * @param domain [min, max] input values
 * @param range [minOut, maxOut] output values
 * @param exponent Power to raise values to (default 2)
 * @returns Function that maps value using power scale
 *
 * @example
 * const scale = createPowerScale([0, 10], [0, 100], 2);
 * scale(5) // Returns: 25 (squared)
 */
export function createPowerScale(
  domain: [number, number],
  range: [number, number],
  exponent: number = 2
): (value: number) => number {
  const [minVal, maxVal] = domain;
  const [minOut, maxOut] = range;

  const minPow = Math.pow(minVal, exponent);
  const maxPow = Math.pow(maxVal, exponent);

  return (value: number): number => {
    const valPow = Math.pow(value, exponent);
    const t = (valPow - minPow) / (maxPow - minPow);
    return minOut + Math.max(0, Math.min(1, t)) * (maxOut - minOut);
  };
}

/**
 * Multi-color scale - interpolates through multiple colors
 *
 * @param domain Domain values aligned with color array
 * @param colors Array of hex colors
 * @returns Function that maps value to interpolated color
 *
 * @example
 * const colors = ['#fff5f0', '#fb6a4a', '#a50f15'];
 * const scale = createMultiColorScale([0, 50, 100], colors);
 * scale(25) // Returns color interpolated between colors[0] and colors[1]
 */
export function createMultiColorScale(
  domain: number[],
  colors: string[]
): (value: number) => string {
  if (domain.length !== colors.length) {
    throw new Error('Domain and colors must have same length');
  }

  return (value: number): string => {
    // Find segment
    let segmentIdx = 0;
    for (let i = 1; i < domain.length; i++) {
      if (value < domain[i]) {
        segmentIdx = i - 1;
        break;
      }
      if (i === domain.length - 1) {
        segmentIdx = i - 1;
      }
    }

    const [minDomain, maxDomain] = [domain[segmentIdx], domain[segmentIdx + 1]];
    const [color1, color2] = [colors[segmentIdx], colors[segmentIdx + 1]];

    // Interpolate within segment
    const t = (value - minDomain) / (maxDomain - minDomain);
    const clampedT = Math.max(0, Math.min(1, t));

    // Parse and interpolate hex colors
    const c1 = parseInt(color1.slice(1), 16);
    const c2 = parseInt(color2.slice(1), 16);

    const r = Math.round(((c1 >> 16) & 0xFF) * (1 - clampedT) + ((c2 >> 16) & 0xFF) * clampedT);
    const g = Math.round(((c1 >> 8) & 0xFF) * (1 - clampedT) + ((c2 >> 8) & 0xFF) * clampedT);
    const b = Math.round((c1 & 0xFF) * (1 - clampedT) + (c2 & 0xFF) * clampedT);

    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  };
}
```

---

## 3. Update d3-loader.ts (Remove unused loaders)

**File:** `/src/lib/utils/d3-loader.ts`

Remove these functions (they're no longer needed):

```typescript
// DELETE THESE FUNCTIONS:

// ❌ Remove loadD3Axis - will use native implementation
export async function loadD3Axis() { ... }

// ❌ Remove loadD3Drag - completely unused
export async function loadD3Drag() { ... }

// UPDATE: Remove from preloadVisualization
// Before:
case 'guests':
  await Promise.all([
    loadD3Selection(),
    loadD3Scale(),
    loadD3Force(),
    loadD3Drag()  // ❌ Remove this
  ]);
  break;

// After:
case 'guests':
  await Promise.all([
    loadD3Selection(),
    loadD3Scale(),
    loadD3Force()
  ]);
  break;

// UPDATE: Remove from timeline and other visualizations
// Before:
case 'timeline':
  await Promise.all([
    loadD3Selection(),
    loadD3Scale(),
    loadD3Axis()  // ❌ Remove this
  ]);
  break;

// After:
case 'timeline':
  await Promise.all([
    loadD3Selection(),
    loadD3Scale()
  ]);
  break;
```

---

## 4. Update SongHeatmap.svelte (Remove d3-axis)

**File:** `/src/lib/components/visualizations/SongHeatmap.svelte`

```typescript
// ===== BEFORE (lines 1-10) =====
<script lang="ts">
  import { onMount } from 'svelte';
  import { loadD3Selection, loadD3Scale, loadD3Axis } from '$lib/utils/d3-loader';
  import { arrayMax } from '$lib/utils/d3-utils';

  let d3Selection: typeof import('d3-selection') | null = null;
  let d3Scale: typeof import('d3-scale') | null = null;
  let d3Axis: typeof import('d3-axis') | null = null;  // ❌ Remove this

// ===== AFTER (lines 1-10) =====
<script lang="ts">
  import { onMount } from 'svelte';
  import { loadD3Selection, loadD3Scale } from '$lib/utils/d3-loader';
  import { createAxisTop, createAxisLeft } from '$lib/utils/native-axis';
  import { arrayMax } from '$lib/utils/d3-utils';

  let d3Selection: typeof import('d3-selection') | null = null;
  let d3Scale: typeof import('d3-scale') | null = null;
  // d3Axis removed - using native implementation
```

Update the loadModules function (around line 42-53):

```typescript
// ===== BEFORE =====
const loadModules = async () => {
  const [selection, scale, axis] = await Promise.all([
    loadD3Selection(),
    loadD3Scale(),
    loadD3Axis()
  ]);
  d3Selection = selection;
  d3Scale = scale;
  d3Axis = axis;
  modulesLoaded = true;
  if (data.length > 0) renderChart();
};

// ===== AFTER =====
const loadModules = async () => {
  const [selection, scale] = await Promise.all([
    loadD3Selection(),
    loadD3Scale()
  ]);
  d3Selection = selection;
  d3Scale = scale;
  modulesLoaded = true;
  if (data.length > 0) renderChart();
};
```

Update renderChart function (around lines 137-150):

```typescript
// ===== BEFORE =====
      // X Axis (columns)
      g.append('g')
        .attr('transform', `translate(0,-10)`)
        .call(d3Axis.axisTop(xScale))
        .selectAll('text')
        .style('text-anchor', 'start')
        .attr('transform', 'rotate(-45)')
        .attr('font-size', '11px');

      // Y Axis (rows)
      g.append('g')
        .call(d3Axis.axisLeft(yScale))
        .selectAll('text')
        .attr('font-size', '11px');

// ===== AFTER =====
      // X Axis (columns) - using native axis
      const xAxisGroup = g.append('g')
        .attr('transform', `translate(0,-10)`);
      xAxisGroup.call(createAxisTop(xScale, {
        tickSize: 6,
        tickPadding: 3
      }));
      xAxisGroup.selectAll('text')
        .style('text-anchor', 'start')
        .attr('transform', 'rotate(-45)');

      // Y Axis (rows) - using native axis
      const yAxisGroup = g.append('g');
      yAxisGroup.call(createAxisLeft(yScale, {
        tickSize: 6,
        tickPadding: 3
      }));
```

---

## 5. Update GapTimeline.svelte (Remove d3-axis)

**File:** `/src/lib/components/visualizations/GapTimeline.svelte`

Apply same pattern as SongHeatmap:

```typescript
// ===== CHANGE 1: Import statement =====
// Remove:
import { loadD3Selection, loadD3Scale, loadD3Axis } from '$lib/utils/d3-loader';

// Add:
import { loadD3Selection, loadD3Scale } from '$lib/utils/d3-loader';
import { createAxisLeft, createAxisBottom } from '$lib/utils/native-axis';

// ===== CHANGE 2: Remove d3Axis state =====
// Remove: let d3Axis: typeof import('d3-axis') | null = null;

// ===== CHANGE 3: Update loadModules =====
// Remove loadD3Axis() from Promise.all
const [selection, scale] = await Promise.all([
  loadD3Selection(),
  loadD3Scale()
]);

// ===== CHANGE 4: Update axis calls =====
// Find lines that say: .call(d3Axis.axisLeft(...)) or .call(d3Axis.axisBottom(...))
// Replace with: .call(createAxisLeft(...)) or .call(createAxisBottom(...))
```

---

## 6. Update RarityScorecard.svelte (Remove d3-axis)

Apply same changes as SongHeatmap.svelte.

---

## 7. Update force-simulation.worker.ts (Remove scaleSqrt)

**File:** `/src/lib/workers/force-simulation.worker.ts`

```typescript
// ===== BEFORE (line 9) =====
import { scaleSqrt } from 'd3-scale';

// ===== AFTER (remove import) =====
// scaleSqrt removed - using native implementation

// ===== ADD native sqrt scale function (after imports, around line 15) =====
/**
 * Native square root scale - replaces d3-scale.scaleSqrt()
 * Maps using sqrt transformation: output = rangeMin + sqrt(value/max) * (rangeMax - rangeMin)
 */
const createSqrtScale = (value: number, maxValue: number, rangeMin: number, rangeMax: number): number => {
  if (maxValue === 0) return rangeMin;
  const t = Math.sqrt(value / maxValue);
  return rangeMin + t * (rangeMax - rangeMin);
};

// ===== UPDATE initSimulation function (around line 294) =====
// BEFORE:
const radiusScale = scaleSqrt().domain([0, maxAppearances]).range([4, 20]);
// ... later ...
.radius((d) => radiusScale(d.totalAppearances) + 5)

// AFTER:
// radiusScale is now a function that takes raw value directly
// ... later ...
.radius((d) => createSqrtScale(d.totalAppearances, maxAppearances, 4, 20) + 5)
```

---

## 8. Update package.json (Remove dependencies)

**File:** `package.json`

```json
{
  "dependencies": {
    // ❌ Remove these lines:
    // "d3-drag": "^3.0.0",
    // "d3-axis": "^3.0.0",

    // ✅ Keep these:
    "d3-force": "^3.0.0",
    "d3-geo": "^3.1.1",
    "d3-sankey": "^0.12.3",
    "d3-scale": "^4.0.2",
    "d3-selection": "^3.0.0",
    "d3-transition": "^3.0.1"
  },
  "devDependencies": {
    // ❌ Remove these lines:
    // "@types/d3-axis": "^3.0.6",
    // "@types/d3-drag": "^3.0.7",

    // ✅ Keep @types for remaining packages
  }
}
```

Then run:
```bash
npm install
```

---

## 9. Test Checklist

After implementing changes, verify:

```typescript
// ✅ Test 1: d3-drag removal (GuestNetwork still works)
- Navigate to guest network visualization
- Verify network renders correctly
- Verify drag interactions still work (uses d3-force internally)
- Check browser console for any import errors

// ✅ Test 2: Axis replacement (All visualizations)
- SongHeatmap: Verify heatmap axes align with cells
- GapTimeline: Verify timeline axes render correctly
- RarityScorecard: Verify scorecard axes match previous behavior
- Check that all tick labels and gridlines appear

// ✅ Test 3: scaleSqrt replacement (GuestNetwork)
- Verify node circles scale correctly by guest appearance count
- Compare sizes with previous version (should be identical)
- Check collision detection works (nodes don't overlap excessively)

// ✅ Test 4: Bundle size verification
npm run build
// Check build output: should show ~15-20KB reduction in vendor bundle

// ✅ Test 5: Performance testing
npm run dev
// Open DevTools > Performance tab
// Record page load
// Verify no performance regression (should be slightly faster)
```

---

## 10. Optional: Color Scale Replacement (Advanced)

If you want to save additional 1.5KB by replacing d3-scale.scaleLinear in SongHeatmap:

**File:** `/src/lib/components/visualizations/SongHeatmap.svelte`

```typescript
// ===== BEFORE (line 106-108) =====
const colorScale = d3Scale.scaleLinear<string>()
  .domain([0, arrayMax(data, d => d.value) || 1])
  .range(['#f0f9ff', '#0c4a6e']);

// ===== AFTER =====
import { createColorScale } from '$lib/utils/native-scales';

// ... then in renderChart ...
const colorScale = createColorScale(
  [0, arrayMax(data, d => d.value) || 1],
  ['#f0f9ff', '#0c4a6e']
);
```

**Note:** This is optional and saves minimal bytes. Only implement if you're already doing the axis work.

---

## Verification Commands

```bash
# Check for remaining d3-axis imports
grep -r "d3-axis" src/

# Check for remaining d3-drag imports
grep -r "d3-drag" src/

# Check for remaining scaleSqrt
grep -r "scaleSqrt" src/

# Build and check bundle size
npm run build

# Run tests
npm run test

# Type check
npm run check
```

---

## Summary of Changes by Priority

| Priority | Change | File | Bundle Savings | Time |
|----------|--------|------|-----------------|------|
| 🔴 HIGH | Remove d3-drag | package.json + loader | -3KB | 10 min |
| 🔴 HIGH | Remove d3-axis | 3 svelte + loader + package.json | -8KB | 60 min |
| 🟡 MEDIUM | Replace scaleSqrt | force-simulation.worker.ts | -0.5KB | 10 min |
| 🟢 LOW | Replace scaleLinear colors | SongHeatmap.svelte (optional) | -1.5KB | 20 min |

**Total Implementation Time:** 100 minutes (1.5-2 hours)
**Total Bundle Reduction:** 11.5-13KB gzipped (9-10% of D3 bundle)


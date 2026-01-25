# Component Update Reference - Before & After Code

Quick reference for updating each of the 5 visualization components to use the shared `d3-utils.ts` module.

**Time per component**: 2-3 minutes
**Total time**: 15 minutes for all 5 files
**Savings**: 2-3KB gzipped

---

## 1. SongHeatmap.svelte

**File**: `/src/lib/components/visualizations/SongHeatmap.svelte`

### BEFORE (Lines 1-18)

```typescript
<script lang="ts">
  import { onMount } from 'svelte';
  import { select } from 'd3-selection';
  import { scaleBand, scaleLinear } from 'd3-scale';
  import { axisTop, axisLeft } from 'd3-axis';

  // Native replacement for d3-array max (~6KB saved by removing d3-array dependency)
  // PERF: Use loop instead of Math.max(...spread) to avoid stack overflow on large arrays
  const max = <T>(arr: T[], accessor: (d: T) => number): number => {
    if (arr.length === 0) return 0;
    let maxVal = accessor(arr[0]);
    for (let i = 1; i < arr.length; i++) {
      const val = accessor(arr[i]);
      if (val > maxVal) maxVal = val;
    }
    return maxVal;
  };
```

### AFTER (Lines 1-10)

```typescript
<script lang="ts">
  import { onMount } from 'svelte';
  import { select } from 'd3-selection';
  import { scaleBand, scaleLinear } from 'd3-scale';
  import { axisTop, axisLeft } from 'd3-axis';
  import { arrayMax } from '$lib/utils/d3-utils';

  const max = arrayMax;

  // ... rest of component unchanged
```

**Changes**:
- Added: 1 import statement
- Added: 1 constant assignment
- Removed: 9 lines of duplicate function definition
- **Net: 11 fewer lines, no functional change**

---

## 2. GuestNetwork.svelte

**File**: `/src/lib/components/visualizations/GuestNetwork.svelte`

### BEFORE (Lines 1-25)

```typescript
<script lang="ts">
  import { onMount } from 'svelte';
  import { select } from 'd3-selection';
  import { scaleLinear, scaleOrdinal } from 'd3-scale';
  import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide } from 'd3-force';

  // Native replacement for d3-array max (~18KB saved)
  // PERF: Use reduce instead of Math.max(...spread) to avoid stack overflow on large arrays
  const max = <T>(arr: T[], accessor: (d: T) => number): number => {
    if (arr.length === 0) return -Infinity;
    let maxVal = accessor(arr[0]);
    for (let i = 1; i < arr.length; i++) {
      const val = accessor(arr[i]);
      if (val > maxVal) maxVal = val;
    }
    return maxVal;
  };

  // Color scheme replacement for d3-scale-chromatic (~12KB saved)
  const schemeCategory10 = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'];
```

### AFTER (Lines 1-12)

```typescript
<script lang="ts">
  import { onMount } from 'svelte';
  import { select } from 'd3-selection';
  import { scaleLinear, scaleOrdinal } from 'd3-scale';
  import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide } from 'd3-force';
  import { arrayMax, colorSchemes } from '$lib/utils/d3-utils';

  const max = arrayMax;
  const schemeCategory10 = colorSchemes.category10;

  // ... rest of component unchanged
```

**Changes**:
- Added: 1 import statement (2 exports)
- Added: 2 constant assignments
- Removed: 14 lines of duplicate function + color scheme
- **Net: 12 fewer lines, no functional change**

---

## 3. TransitionFlow.svelte

**File**: `/src/lib/components/visualizations/TransitionFlow.svelte`

### BEFORE (Lines 1-12)

```typescript
<script lang="ts">
  import { onMount } from 'svelte';
  import { select } from 'd3-selection';
  import { scaleOrdinal } from 'd3-scale';
  import { sankey, sankeyLinkHorizontal } from 'd3-sankey';

  // Color scheme replacement for d3-scale-chromatic (~12KB saved)
  const schemeCategory10 = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'];
  import type { SankeyNode, SankeyLink, SankeyGraph } from 'd3-sankey';
```

### AFTER (Lines 1-11)

```typescript
<script lang="ts">
  import { onMount } from 'svelte';
  import { select } from 'd3-selection';
  import { scaleOrdinal } from 'd3-scale';
  import { sankey, sankeyLinkHorizontal } from 'd3-sankey';
  import { colorSchemes } from '$lib/utils/d3-utils';
  import type { SankeyNode, SankeyLink, SankeyGraph } from 'd3-sankey';

  const schemeCategory10 = colorSchemes.category10;

  // ... rest of component unchanged
```

**Changes**:
- Added: 1 import statement (1 export)
- Added: 1 constant assignment
- Removed: 1 line of hardcoded color array
- **Net: 1 fewer line, no functional change**

---

## 4. GapTimeline.svelte

**File**: `/src/lib/components/visualizations/GapTimeline.svelte`

### BEFORE (Lines 1-35)

```typescript
<script lang="ts">
  import { onMount } from 'svelte';
  import { select } from 'd3-selection';
  import { scaleBand, scaleLinear } from 'd3-scale';
  import { axisBottom, axisLeft } from 'd3-axis';
  import { line } from 'd3-shape';

  // Native replacement for d3-array max
  const max = <T>(arr: T[], accessor: (d: T) => number): number => {
    if (arr.length === 0) return 0;
    let maxVal = accessor(arr[0]);
    for (let i = 1; i < arr.length; i++) {
      const val = accessor(arr[i]);
      if (val > maxVal) maxVal = val;
    }
    return maxVal;
  };

  const schemeCategory10 = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'];
```

### AFTER (Lines 1-13)

```typescript
<script lang="ts">
  import { onMount } from 'svelte';
  import { select } from 'd3-selection';
  import { scaleBand, scaleLinear } from 'd3-scale';
  import { axisBottom, axisLeft } from 'd3-axis';
  import { line } from 'd3-shape';
  import { arrayMax, colorSchemes } from '$lib/utils/d3-utils';

  const max = arrayMax;
  const schemeCategory10 = colorSchemes.category10;

  // ... rest of component unchanged
```

**Changes**:
- Added: 1 import statement (2 exports)
- Added: 2 constant assignments
- Removed: 9 lines of duplicate function
- Removed: 1 line of hardcoded color array
- **Net: 8 fewer lines, no functional change**

---

## 5. TourMap.svelte

**File**: `/src/lib/components/visualizations/TourMap.svelte`

This file is slightly more complex because it uses multiple color schemes.

### BEFORE (Lines 1-35)

```typescript
<script lang="ts">
  import { onMount } from 'svelte';
  import { select } from 'd3-selection';
  import { scaleQuantize, scaleLinear } from 'd3-scale';
  import { geoAlbersUsa, geoPath as d3GeoPath } from 'd3-geo';
  import * as topojson from 'topojson-client';
  import type { Topology, GeometryCollection } from 'topojson-specification';

  // Color scheme replacements for d3-scale-chromatic (~12KB saved)
  // 9-color sequential schemes
  const schemeBlues = ['#f7fbff', '#deebf7', '#c6dbef', '#9ecae1', '#6baed6', '#4292c6', '#2171b5', '#08519c', '#08306b'] as const;
  const schemeGreens = ['#f7fcf5', '#e5f5e0', '#c7e9c0', '#a1d99b', '#74c476', '#41ab5d', '#238b45', '#006d2c', '#00441b'] as const;
  const schemeReds = ['#fff5f0', '#fee0d2', '#fcbba1', '#fc9272', '#fb6a4a', '#ef3b2c', '#cb181d', '#a50f15', '#67000d'] as const;
  const schemePurples = ['#fcfbfd', '#efedf5', '#dadaeb', '#bcbddc', '#9e9ac8', '#807dba', '#6a51a3', '#54278f', '#3f007d'] as const;

  // ... later in the component (around line 67-72)

  const colorSchemes: Record<string, readonly string[]> = {
    blues: schemeBlues,
    greens: schemeGreens,
    reds: schemeReds,
    purples: schemePurples
  };
```

### AFTER (Lines 1-18)

```typescript
<script lang="ts">
  import { onMount } from 'svelte';
  import { select } from 'd3-selection';
  import { scaleQuantize, scaleLinear } from 'd3-scale';
  import { geoAlbersUsa, geoPath as d3GeoPath } from 'd3-geo';
  import * as topojson from 'topojson-client';
  import type { Topology, GeometryCollection } from 'topojson-specification';
  import { colorSchemes as d3ColorSchemes } from '$lib/utils/d3-utils';

  // ... later in the component (around line 67-72, replace with):

  const colorSchemeMap: Record<string, readonly string[]> = {
    blues: d3ColorSchemes.blues,
    greens: d3ColorSchemes.greens,
    reds: d3ColorSchemes.reds,
    purples: d3ColorSchemes.purples
  };
```

**Important**: In TourMap, we rename the import to `d3ColorSchemes` and the map to `colorSchemeMap` to avoid variable name conflicts with the incoming prop.

**Next**: Find the usage of the old `colorSchemes` object and replace:

### BEFORE (around line 125 in renderChart function)

```typescript
const colorScale = scaleQuantize<string>()
  .domain([0, maxValue])
  .range(colorSchemes[colorScheme]);
```

### AFTER

```typescript
const colorScale = scaleQuantize<string>()
  .domain([0, maxValue])
  .range(colorSchemeMap[colorScheme]);
```

**Changes**:
- Added: 1 import statement with alias (colorSchemes → d3ColorSchemes)
- Updated: Local map variable from `colorSchemes` to `colorSchemeMap`
- Updated: Usage of map variable in renderChart function
- Removed: 4 lines of hardcoded color arrays
- **Net: 3 fewer lines, no functional change**

---

## Summary Table

| Component | Lines Removed | Lines Added | Net Change | Savings |
|-----------|---|---|---|---|
| SongHeatmap.svelte | 9 | 2 | -7 | 0.4KB |
| GuestNetwork.svelte | 14 | 2 | -12 | 0.6KB |
| TransitionFlow.svelte | 2 | 1 | -1 | 0.1KB |
| GapTimeline.svelte | 10 | 2 | -8 | 0.4KB |
| TourMap.svelte | 5 | 2 | -3 | 0.4KB |
| **TOTAL** | **40** | **9** | **-31** | **2-3KB** |

---

## Verification After Each Update

After updating each component, run:

```bash
npm run check
```

If there are type errors specific to that component, double-check:
1. Import path is `/src/lib/utils/d3-utils` (note the $.alias $lib)
2. Function names match: `arrayMax`, `colorSchemes`
3. No typos in variable assignments

If the entire build fails, check:
```bash
npm run build
```

This will show exactly which file has the error.

---

## Testing After All Updates

Once all 5 components are updated:

```bash
# Type check
npm run check
# Should pass with no new errors

# Build
npm run build
# Should complete successfully

# Dev server
npm run dev
# Navigate to http://localhost:5173/visualizations
# Verify all tabs work and visualizations render

# Bundle analysis
npx source-map-explorer dist/client/*.js --html report.html
# Should show main bundle is smaller by ~2-3KB
```

---

## Rollback (If Needed)

If any visualization doesn't render correctly after the update, you can rollback individual files:

```bash
# Rollback one file
git checkout -- src/lib/components/visualizations/SongHeatmap.svelte

# Or rollback all at once
git checkout -- src/lib/components/visualizations/

# Verify
npm run check && npm run build
```

---

## Copy-Paste Snippets

### Import block (add to top of `<script>`)

For `SongHeatmap.svelte`, `GapTimeline.svelte`:
```typescript
import { arrayMax } from '$lib/utils/d3-utils';
```

For `GuestNetwork.svelte`:
```typescript
import { arrayMax, colorSchemes } from '$lib/utils/d3-utils';
```

For `TransitionFlow.svelte`:
```typescript
import { colorSchemes } from '$lib/utils/d3-utils';
```

For `TourMap.svelte`:
```typescript
import { colorSchemes as d3ColorSchemes } from '$lib/utils/d3-utils';
```

### Constant assignments (add after imports)

For `SongHeatmap.svelte`, `GapTimeline.svelte`:
```typescript
const max = arrayMax;
```

For `GuestNetwork.svelte`, `GapTimeline.svelte`:
```typescript
const schemeCategory10 = colorSchemes.category10;
```

For `TransitionFlow.svelte`:
```typescript
const schemeCategory10 = colorSchemes.category10;
```

For `TourMap.svelte`:
```typescript
const colorSchemeMap: Record<string, readonly string[]> = {
  blues: d3ColorSchemes.blues,
  greens: d3ColorSchemes.greens,
  reds: d3ColorSchemes.reds,
  purples: d3ColorSchemes.purples
};
```

---

## Common Mistakes to Avoid

❌ **WRONG**: Importing without alias in TourMap
```typescript
import { colorSchemes } from '$lib/utils/d3-utils';
// This conflicts with the 'colorScheme' prop!
```

✅ **RIGHT**: Use alias to avoid conflict
```typescript
import { colorSchemes as d3ColorSchemes } from '$lib/utils/d3-utils';
```

---

❌ **WRONG**: Path without $lib alias
```typescript
import { arrayMax } from '../utils/d3-utils';
// Brittle relative path!
```

✅ **RIGHT**: Use Svelte $lib alias
```typescript
import { arrayMax } from '$lib/utils/d3-utils';
// Works everywhere!
```

---

❌ **WRONG**: Removing the `const` assignment
```typescript
import { arrayMax } from '$lib/utils/d3-utils';
// Then using: arrayMax(data, d => d.value) ✓
// But also using: max(data, d => d.value) ✗ -- max is undefined
```

✅ **RIGHT**: Keep the assignment
```typescript
import { arrayMax } from '$lib/utils/d3-utils';
const max = arrayMax;
// Now both work: arrayMax(...) and max(...)
```

---

## Final Checklist Per Component

- [ ] Added import from `$lib/utils/d3-utils`
- [ ] Added const assignment(s)
- [ ] Removed duplicate function/color definition
- [ ] No syntax errors (red squiggles in editor)
- [ ] File saves successfully
- [ ] `npm run check` passes for this component
- [ ] Visualizations render correctly

**Estimated time**: 2-3 minutes per component
**Total**: 15 minutes for all 5 files

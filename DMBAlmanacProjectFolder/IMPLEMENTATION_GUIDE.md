# Bundle Optimization - Implementation Guide

**Quick Reference**: Implement these 3 quick wins in ~1 hour to save 7-9KB gzipped.

---

## Quick Start: The 3-Step Plan

### Step 1: Update package.json (5 minutes) - 0.5-1KB savings

Add `sideEffects` field to tell bundlers which files can't be tree-shaken:

**File**: `/package.json`

```diff
  {
    "name": "dmb-almanac-svelte",
    "version": "0.1.0",
    "private": true,
    "type": "module",
+   "sideEffects": [
+     "*.css",
+     "./src/lib/sw/*.js",
+     "./src/app.css",
+     "./static/**/*"
+   ],
    "scripts": {
```

**Why**: Vite/Rollup can now confidently tree-shake your TypeScript modules while preserving CSS and static file side effects.

**Verify**:
```bash
npm run build
```

---

### Step 2: Create Shared D3 Utilities (30 minutes) - 2-3KB savings

**Status**: ✓ File already created at `/src/lib/utils/d3-utils.ts`

This file consolidates functions that were previously duplicated across 5 visualization components:
- `max()` function (used in SongHeatmap, GuestNetwork, TourMap, GapTimeline)
- `schemeCategory10` and other color schemes (used in 3+ components)
- Margin constants (used throughout)

**Next**: Update the 5 visualization components to import from this shared module.

---

### Step 3: Update Visualization Components (30 minutes) - Uses shared utils

Update each visualization to import utilities from `d3-utils.ts`:

#### 3.1 SongHeatmap.svelte

**File**: `/src/lib/components/visualizations/SongHeatmap.svelte`

```diff
  <script lang="ts">
    import { onMount } from 'svelte';
    import { select } from 'd3-selection';
    import { scaleBand, scaleLinear } from 'd3-scale';
    import { axisTop, axisLeft } from 'd3-axis';

-   // Native replacement for d3-array max (~6KB saved by removing d3-array dependency)
-   // PERF: Use loop instead of Math.max(...spread) to avoid stack overflow on large arrays
-   const max = <T>(arr: T[], accessor: (d: T) => number): number => {
-     if (arr.length === 0) return 0;
-     let maxVal = accessor(arr[0]);
-     for (let i = 1; i < arr.length; i++) {
-       const val = accessor(arr[i]);
-       if (val > maxVal) maxVal = val;
-     }
-     return maxVal;
-   };
+   import { arrayMax } from '$lib/utils/d3-utils';
+   const max = arrayMax;
```

**What changed**: Removed the local `max` function definition (8 lines) and imported it from shared utilities.

---

#### 3.2 GuestNetwork.svelte

**File**: `/src/lib/components/visualizations/GuestNetwork.svelte`

```diff
  <script lang="ts">
    import { onMount } from 'svelte';
    import { select } from 'd3-selection';
    import { scaleLinear, scaleOrdinal } from 'd3-scale';
    import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide } from 'd3-force';

-   // Native replacement for d3-array max (~18KB saved)
-   // PERF: Use reduce instead of Math.max(...spread) to avoid stack overflow on large arrays
-   const max = <T>(arr: T[], accessor: (d: T) => number): number => {
-     if (arr.length === 0) return -Infinity;
-     let maxVal = accessor(arr[0]);
-     for (let i = 1; i < arr.length; i++) {
-       const val = accessor(arr[i]);
-       if (val > maxVal) maxVal = val;
-     }
-     return maxVal;
-   };

-   // Color scheme replacement for d3-scale-chromatic (~12KB saved)
-   const schemeCategory10 = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'];
+   import { arrayMax, colorSchemes } from '$lib/utils/d3-utils';
+   const max = arrayMax;
+   const schemeCategory10 = colorSchemes.category10;
```

**What changed**:
- Removed local `max` function
- Removed hardcoded color scheme
- Imported both from d3-utils

---

#### 3.3 TransitionFlow.svelte

**File**: `/src/lib/components/visualizations/TransitionFlow.svelte`

```diff
  <script lang="ts">
    import { onMount } from 'svelte';
    import { select } from 'd3-selection';
    import { scaleOrdinal } from 'd3-scale';
    import { sankey, sankeyLinkHorizontal } from 'd3-sankey';

-   // Color scheme replacement for d3-scale-chromatic (~12KB saved)
-   const schemeCategory10 = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'];
+   import { colorSchemes } from '$lib/utils/d3-utils';
+   const schemeCategory10 = colorSchemes.category10;
```

**What changed**: Removed hardcoded color scheme, imported from d3-utils.

---

#### 3.4 GapTimeline.svelte

**File**: `/src/lib/components/visualizations/GapTimeline.svelte`

```diff
  <script lang="ts">
    import { onMount } from 'svelte';
    import { select } from 'd3-selection';
    import { scaleBand, scaleLinear } from 'd3-scale';
    import { axisBottom, axisLeft } from 'd3-axis';
    import { line } from 'd3-shape';

-   // Native replacement for d3-array max
-   const max = <T>(arr: T[], accessor: (d: T) => number): number => {
-     if (arr.length === 0) return 0;
-     let maxVal = accessor(arr[0]);
-     for (let i = 1; i < arr.length; i++) {
-       const val = accessor(arr[i]);
-       if (val > maxVal) maxVal = val;
-     }
-     return maxVal;
-   };

-   const schemeCategory10 = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'];
+   import { arrayMax, colorSchemes } from '$lib/utils/d3-utils';
+   const max = arrayMax;
+   const schemeCategory10 = colorSchemes.category10;
```

**What changed**:
- Removed local `max` function
- Removed color scheme, imported from d3-utils

---

#### 3.5 TourMap.svelte

**File**: `/src/lib/components/visualizations/TourMap.svelte`

```diff
  <script lang="ts">
    import { onMount } from 'svelte';
    import { select } from 'd3-selection';
    import { scaleQuantize, scaleLinear } from 'd3-scale';
    import { geoAlbersUsa, geoPath as d3GeoPath } from 'd3-geo';
    import * as topojson from 'topojson-client';
    import type { Topology, GeometryCollection } from 'topojson-specification';

-   // Color scheme replacements for d3-scale-chromatic (~12KB saved)
-   // 9-color sequential schemes
-   const schemeBlues = ['#f7fbff', '#deebf7', '#c6dbef', '#9ecae1', '#6baed6', '#4292c6', '#2171b5', '#08519c', '#08306b'] as const;
-   const schemeGreens = ['#f7fcf5', '#e5f5e0', '#c7e9c0', '#a1d99b', '#74c476', '#41ab5d', '#238b45', '#006d2c', '#00441b'] as const;
-   const schemeReds = ['#fff5f0', '#fee0d2', '#fcbba1', '#fc9272', '#fb6a4a', '#ef3b2c', '#cb181d', '#a50f15', '#67000d'] as const;
-   const schemePurples = ['#fcfbfd', '#efedf5', '#dadaeb', '#bcbddc', '#9e9ac8', '#807dba', '#6a51a3', '#54278f', '#3f007d'] as const;
+   import { colorSchemes } from '$lib/utils/d3-utils';
+   const schemeBlues = colorSchemes.blues;
+   const schemeGreens = colorSchemes.greens;
+   const schemeReds = colorSchemes.reds;
+   const schemePurples = colorSchemes.purples;
```

Also update the colorSchemes map:

```diff
-   const colorSchemes: Record<string, readonly string[]> = {
-     blues: schemeBlues,
-     greens: schemeGreens,
-     reds: schemeReds,
-     purples: schemePurples
-   };
+   const colorSchemeMap: Record<string, readonly string[]> = {
+     blues: colorSchemes.blues,
+     greens: colorSchemes.greens,
+     reds: colorSchemes.reds,
+     purples: colorSchemes.purples
+   };
```

And update usage:

```diff
-     const colorScale = scaleQuantize<string>()
-       .domain([0, maxValue])
-       .range(colorSchemes[colorScheme]);
+     const colorScale = scaleQuantize<string>()
+       .domain([0, maxValue])
+       .range(colorSchemeMap[colorScheme]);
```

**What changed**:
- Removed hardcoded color schemes
- Import from d3-utils
- Renamed internal map to avoid conflicts

---

## Verification Steps

After making these changes, verify everything works:

### 1. Type Check

```bash
npm run check
```

Expected: No new type errors.

### 2. Build Test

```bash
npm run build
```

Expected: Build completes, no errors.

### 3. Visual Test

```bash
npm run dev
# Open http://localhost:5173/visualizations
```

Expected: All visualizations render identically to before.

### 4. Bundle Size Check

```bash
npm run build
# Check the dist/ output
```

Expected: Main bundle slightly smaller (~2-3KB), component chunks unchanged.

---

## Advanced: Add Dead Code Detection (Optional)

To prevent future bundle bloat, add dead code detection to your CI pipeline:

### Install unimported

```bash
npm install --save-dev unimported
```

### Add to package.json scripts

**File**: `/package.json`

```json
{
  "scripts": {
    "build": "vite build",
    "postbuild": "npm run check:dead-code",
    "check:dead-code": "unimported --exit-code 0 || true"
  }
}
```

### Usage

```bash
npm run check:dead-code
```

Output will show potentially unused exports for review.

---

## Advanced: Lazy-Load Dexie (Optional - Medium effort)

This saves 8-12KB on light pages (about, contact, faq) that don't need immediate database access.

### Update dexie.ts

**File**: `/src/lib/stores/dexie.ts`

After the existing imports, add lazy initialization:

```typescript
import { liveQuery, type Observable } from 'dexie';
import Dexie from 'dexie';

// ... existing code ...

// Add lazy initialization
let dexieInitialized = false;
let dexieInitPromise: Promise<void> | null = null;

export async function initializeDexieOnDemand() {
  if (dexieInitialized) return;
  if (dexieInitPromise) return dexieInitPromise;

  dexieInitPromise = (async () => {
    try {
      const { setupCacheInvalidationListeners } = await import('$db/dexie/cache');
      setupCacheInvalidationListeners();
      dexieInitialized = true;
    } catch (error) {
      console.error('Failed to initialize Dexie:', error);
      throw error;
    }
  })();

  return dexieInitPromise;
}

/**
 * Ensure Dexie is ready before accessing data
 * Called automatically by data-heavy pages
 */
export function ensureDexieReady() {
  return initializeDexieOnDemand();
}
```

### Update +layout.svelte

**File**: `/src/routes/+layout.svelte`

```diff
  import { setupCacheInvalidationListeners } from '$db/dexie/cache';
+ import { initializeDexieOnDemand } from '$lib/stores/dexie';

  onMount(() => {
-   setupCacheInvalidationListeners();
+   // Lazy initialize Dexie only when needed
+   // Heavy data pages call ensureDexieReady() explicitly
+   initializeDexieOnDemand().catch(console.error);
  });
```

### Update data-heavy pages

**Files**:
- `/src/routes/shows/+page.svelte`
- `/src/routes/shows/[showId]/+page.svelte`
- `/src/routes/songs/+page.svelte`
- `/src/routes/venues/+page.svelte`
- `/src/routes/guests/+page.svelte`
- (etc. - all pages that import from dexie stores)

```diff
  import { ensureDexieReady } from '$lib/stores/dexie';
  import { allShows } from '$lib/stores/dexie';

  onMount(async () => {
+   await ensureDexieReady();  // Ensure Dexie is ready before accessing stores
    const shows = get(allShows);
  });
```

**Impact**: Light pages (about, contact, faq) skip Dexie initialization (~8-12KB savings on those pages).

---

## Testing Checklist

Before pushing changes:

- [ ] `npm run check` passes (no type errors)
- [ ] `npm run build` succeeds without warnings
- [ ] All D3 visualizations render correctly
- [ ] No console errors in DevTools
- [ ] Bundle size smaller than before (use source-map-explorer)
- [ ] PWA still works (install + offline)
- [ ] WASM modules initialize correctly
- [ ] Web Vitals not negatively impacted

---

## Expected Results

### Phase 1 (All 3 steps)

- **Bundle reduction**: 7-9KB gzipped
- **Effort**: ~1 hour
- **Risk**: LOW (only refactoring, no logic changes)

### Phase 2 (Optional: Lazy Dexie)

- **Bundle reduction on light pages**: 8-12KB gzipped
- **Effort**: ~1 hour
- **Risk**: LOW (with proper testing)

### Total Potential Savings

- **Initial bundle**: ~315KB gzipped
- **After Phase 1**: ~307KB gzipped (2.5%)
- **After Phase 2**: ~295KB on light pages, ~303KB on data-heavy pages (6% avg)

---

## Rollback Plan

If something breaks, rollback is simple:

```bash
git checkout -- src/lib/components/visualizations/
git checkout -- package.json
git checkout -- src/lib/utils/d3-utils.ts
npm install
npm run dev
```

---

## Files Modified Summary

| File | Changes | Lines |
|------|---------|-------|
| `/package.json` | Added sideEffects | +5 |
| `/src/lib/utils/d3-utils.ts` | Created new file | +200 |
| `/src/lib/components/visualizations/SongHeatmap.svelte` | Import from d3-utils | -8, +1 |
| `/src/lib/components/visualizations/GuestNetwork.svelte` | Import from d3-utils | -11, +2 |
| `/src/lib/components/visualizations/TransitionFlow.svelte` | Import from d3-utils | -3, +1 |
| `/src/lib/components/visualizations/GapTimeline.svelte` | Import from d3-utils | -11, +2 |
| `/src/lib/components/visualizations/TourMap.svelte` | Import from d3-utils | -16, +8 |
| **Total** | | **~15 net lines removed** |

---

## Questions?

If you encounter issues:

1. **Type errors**: Ensure `d3-utils.ts` is in correct path: `/src/lib/utils/d3-utils.ts`
2. **Import errors**: Check that visualization files can see the new module
3. **Build failures**: Check `npm run build` output for specific errors
4. **Visual glitches**: Compare rendered output before/after - logic hasn't changed
5. **Performance issues**: Use Chrome DevTools Performance tab to profile

---

## Next Steps

1. **Implement Step 1-3** (1 hour)
2. **Run verification steps** (15 minutes)
3. **Monitor Web Vitals** in production for 1 week
4. **Plan Phase 2** if Phase 1 successful

Estimated total time: **1-1.5 hours**
Estimated bundle savings: **7-9KB gzipped** (2-3% reduction)

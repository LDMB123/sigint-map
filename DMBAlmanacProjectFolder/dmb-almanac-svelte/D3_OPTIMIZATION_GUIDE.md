# D3 Bundle Optimization Guide

## Current State

**File**: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/utils/d3-helpers.ts`

**Current import** (Line 25):
```typescript
import * as d3 from 'd3';  // Imports entire D3 library (~100-150 KB gzipped)
```

**Problem**: Even though individual modules are imported throughout the file, the wildcard import forces bundlers to include the entire D3 library.

---

## Files Using D3

1. **d3-helpers.ts** - Core utilities
2. **TransitionFlow.svelte** - Sankey diagram
3. **GapTimeline.svelte** - Timeline visualization
4. **SongHeatmap.svelte** - Heat map
5. **RarityScorecard.svelte** - Score visualization
6. **GuestNetwork.svelte** - Network graph
7. **TourMap.svelte** - Geographic map
8. **force-simulation.worker.ts** - Worker thread force simulation

---

## Optimization Steps

### Step 1: Remove Wildcard Import

**Before**:
```typescript
// src/lib/utils/d3-helpers.ts line 25
import * as d3 from 'd3';
```

**After**:
Remove this line entirely - it's redundant since individual modules are imported

### Step 2: Update All Component Imports

**Files to Update**:
- `src/lib/components/visualizations/TransitionFlow.svelte`
- `src/lib/components/visualizations/GapTimeline.svelte`
- `src/lib/components/visualizations/SongHeatmap.svelte`
- `src/lib/components/visualizations/RarityScorecard.svelte`
- `src/lib/components/visualizations/GuestNetwork.svelte`
- `src/lib/components/visualizations/TourMap.svelte`
- `src/lib/workers/force-simulation.worker.ts`

**For each file using `import * as d3 from 'd3'`**:

Replace with specific imports based on actual usage. Example:

```typescript
// BEFORE
import * as d3 from 'd3';

// AFTER - GapTimeline example
import { select, selectAll, Selection } from 'd3-selection';
import { scaleLinear, scaleTime } from 'd3-scale';
import { axisBottom, axisLeft } from 'd3-axis';
```

### Step 3: Type Annotations

For TypeScript type annotations, use specific types:

```typescript
// BEFORE
svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>

// AFTER
svg: Selection<SVGSVGElement, unknown, HTMLElement, any>
```

---

## D3 Modules Actually Used in Project

Based on code analysis:

**Definitely Used**:
- d3-selection (DOM manipulation)
- d3-scale (scales for axes)
- d3-axis (axis generation)
- d3-ease (animation easing)
- d3-sankey (TransitionFlow visualization)
- d3-force (network force simulation)
- d3-scale-chromatic (color schemes)
- d3-shape (path generation)
- d3-array (array utilities)

**Potentially Used**:
- d3-zoom (if any zoom interactions)
- d3-drag (if any drag interactions)
- d3-transition (animations)
- d3-time (time scales)

**Likely NOT Used**:
- d3-geo (geographic projections)
- d3-contour (contour plots)
- d3-chord (chord diagrams)
- d3-brush (brushing interactions)
- d3-color (color utilities)
- d3-dispatch (event dispatch)
- d3-dsv (CSV parsing)
- d3-fetch (data loading)
- d3-format (number formatting)
- d3-delaunay (Delaunay triangulation)
- d3-polygon (polygon utilities)
- d3-quadtree (spatial indexing)
- d3-random (random number generation)
- d3-path (path manipulation)
- d3-timer (timer management)
- d3-duration (duration parsing)
- d3-histogram (histogram generation)
- d3-interpolate (interpolation)
- d3-voronoi (Voronoi diagrams)
- d3-module-needs-catalog (hypothetical)

---

## Expected Bundle Size Reduction

**Current**: 100-150 KB (gzipped) for full D3
**After Optimization**: 50-80 KB (gzipped)
**Savings**: 30-50 KB per build (30-40% reduction)

---

## Testing After Optimization

```bash
# 1. Build and check size
npm run build
du -sh build/client/_app

# 2. Run type checking
npm run check

# 3. Visual regression testing
npm run dev
# Manually test each visualization

# 4. Build for production
npm run build && npm run preview
```

---

## Manual D3 Code Review

Each visualization component should be reviewed:

1. **TransitionFlow.svelte** - Uses `sankey`, `sankeyLinkHorizontal`
2. **GapTimeline.svelte** - Uses `select`, `scaleTime`, `axisBottom`, `line`
3. **SongHeatmap.svelte** - Uses scales and color schemes
4. **RarityScorecard.svelte** - Uses selection and scaling
5. **GuestNetwork.svelte** - Uses force simulation and circles
6. **TourMap.svelte** - Uses geographic data (may use d3-geo)
7. **force-simulation.worker.ts** - Uses d3-force

---

## Implementation Timeline

**Phase 1** (30 minutes): Remove wildcard imports from d3-helpers.ts
**Phase 2** (1-2 hours): Update each visualization component
**Phase 3** (1 hour): Testing and validation
**Phase 4** (30 minutes): Measurement and documentation

**Total**: 3-4 hours of focused work

---

## Rollback Plan

Git commits after each phase:
```bash
git add src/lib/utils/d3-helpers.ts
git commit -m "refactor: Remove wildcard d3 import from helpers"

git add src/lib/components/visualizations/
git commit -m "refactor: Replace wildcard d3 imports with specific modules"

npm run build
# If successful:
git add .
git commit -m "build: Confirm D3 tree-shaking optimization"

# If issues:
git revert HEAD~2  # Revert last 2 commits
```


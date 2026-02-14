# Dependency Elimination Master Plan

- **Goal**: 9 prod deps → 2
- **Bundle reduction**: 34-58KB gzipped
- **Timeline**: 20-38h across 3 phases
- **Risk**: LOW-MEDIUM

## Keep (Justified)

- **Dexie.js** (42KB) - 739 API calls, 34 files, 60-80h replace cost
- **web-push** (0KB client) - Server-only, crypto required, zero client impact

## Eliminate (54KB total)

| Package | Size | Files | Call Sites | Replace Time |
|---------|------|-------|------------|-------------|
| d3-drag | 4KB | 1 | ~8 | 2h |
| d3-scale | 10KB | 5 | ~80 | 4h |
| d3-axis | 4KB | 2 | ~10 | 3h |
| d3-selection | 12KB | 7 | ~150 | 8h |
| topojson-client | 4KB | 1 | 1 | 3h |
| d3-geo | 16KB | 1 | ~5 | 6h (optional) |
| d3-sankey | 8KB | 1 | ~15 | 12h (optional) |

## Phase 1: Easy Wins (9h, -22KB, LOW risk)

### 1.1 d3-drag → Pointer Events (2h, -4KB)

- **Location**: `GuestNetwork.svelte` line 245
- **Replacement**: Native Pointer Events API
- Create `src/lib/utils/pointerDrag.js` (~40 lines)
- `pointerdown` → setPointerCapture, track dragStartPos
- `pointermove` → compute dx/dy, call dragged callback
- `pointerup` → releasePointerCapture, cleanup
- Steps: create util → update GuestNetwork → remove import → test → remove dep

### 1.2 d3-scale → Native Math (4h, -10KB)

- Existing `src/lib/utils/native-axis.js` has partial scale implementations
- Create `src/lib/utils/native-scales.js` (~120 lines)
- Implementations needed:
  - `scaleLinear(domain, range)` - linear interpolation with .domain()/.range()/.invert()
  - `scaleTime(domain, range)` - Date-aware linear scale
  - `scaleOrdinal(domain, range)` - discrete Map-based mapping
  - `scaleBand(domain, range, padding)` - equal bands with .bandwidth()/.step()
  - `scaleQuantize(domain, range)` - binned thresholds
- Components to update:
  - `GuestNetwork.svelte` - scaleLinear, scaleOrdinal
  - `TransitionFlow.svelte` - scaleOrdinal
  - `GapTimeline.svelte` - scaleLinear, scaleTime
  - `RarityScorecard.svelte` - scaleLinear, scaleBand
  - `TourMap.svelte` - scaleQuantize
- Replace: `from 'd3-scale'` → `from '$lib/utils/native-scales'`

### 1.3 d3-axis → Native SVG (3h, -4KB)

- Used in: `GapTimeline.svelte` (axisBottom, axisLeft), `RarityScorecard.svelte` (axisLeft)
- Enhance existing `native-axis.js` with `renderAxis(svgGroup, scale, orientation, options)`
- Options: tickCount, tickSize, tickPadding, tickFormat
- Renders axis line + tick marks + labels via SVG createElement
- Replace: `from 'd3-axis'` → `from '$lib/utils/native-axis'`

### Phase 1 Summary

- **Time**: 9h | **Savings**: -22KB | **Deps removed**: 3
- **Files modified**: 7 viz components + 2 new utils

## Phase 2: Core Replacement (11h, -16KB, MEDIUM risk)

### 2.1 d3-selection → Native DOM (8h, -12KB)

- Create `src/lib/utils/svgDataJoin.js` (~150 lines)
- `SVGSelection` class replicating `.data().join()` pattern
- Methods: selectAll, data, join (enter/update/exit), attr, style, text, on, append, remove, raise, transition
- Uses `__data__` property on DOM elements for data binding
- Static helpers: `select(element)`, `pointer(event, element)`
- Update 6 components: TransitionFlow, GuestNetwork, GapTimeline, SongHeatmap, RarityScorecard, TourMap
- Replace: `from 'd3-selection'` → `from '$lib/utils/svgDataJoin'`

### 2.2 topojson-client → Build-time Convert (3h, -4KB)

- **Recommended**: Pre-convert at build time (Option A)
- Create a dedicated build conversion script (planned): read TopoJSON → `topojson.feature()` → write GeoJSON
- Add to package.json: `"build:geo"` script, run in `prebuild`
- Update `TourMap.svelte`: fetch `/data/us-states-geo.json` directly
- Move topojson-client to devDependencies
- Tradeoff: TopoJSON ~15KB vs GeoJSON ~45KB (file size increase)
- **Alternative**: Inline decoder (~60 lines) if file size matters

### Phase 2 Summary

- **Time**: 11h | **Savings**: -16KB | **Deps removed**: 2
- **Files modified**: 7 components + 2 new utils

## Phase 3: Optional Advanced (18h, -24KB, HIGH risk)

### 3.1 d3-geo Replacement (6h, -16KB) - OPTIONAL

- **Option A (recommended)**: Pre-projected SVG paths at build time
  - Build script: geoAlbersUsa projection → pathGenerator → write SVG path strings
  - Runtime: just render pre-computed `<path d="...">` elements
  - Caveat: must regenerate if map dimensions change
- **Option B**: Implement Albers USA projection (~200 lines math)
  - Only if interactive zoom/pan needed

### 3.2 d3-sankey Replacement (12h, -8KB) - OPTIONAL

- Complex layout algorithm: layer assignment → height computation → iterative relaxation → Bezier paths
- ~300-400 lines to reimplement
- **Recommendation: DEFER** - only 1 component (TransitionFlow), lazy-loaded, high effort/risk

## Target State

| Phase | Deps Remaining | Bundle (gzip) | Savings |
|-------|---------------|---------------|---------|
| Current | 9 | ~100KB | - |
| After P1 | 6 | ~78KB | -22KB |
| After P2 | 4 | ~62KB | -38KB |
| After P3 | 2 | ~42KB | -58KB |

## Final 2 Dependencies

- **Dexie.js** (42KB): 739 calls/34 files, query builder + schema migrations + transactions
- **web-push** (0KB client): RFC 8030/8291 Web Push Protocol, VAPID signing, server-only

## Timeline

### Conservative (P1+P2): 20h, 2-3 weeks
- Week 1: Phase 1 (9h) - d3-drag(2h) → d3-scale(4h) → d3-axis(3h)
- Week 2: Phase 2 (11h) - d3-selection(8h) → topojson(3h)
- Week 3: Testing, validation, benchmarks
- **Result**: -38KB, 4 deps remaining

### Aggressive (all phases): 38h, 4-5 weeks
- +Week 4: d3-geo (6h)
- +Week 5: d3-sankey (12h)
- **Result**: -58KB, 2 deps remaining

## Risk Mitigation

- Git branch per dependency - easy rollback
- Feature flag wrapper - toggle old/new impl
- Visual regression tests - screenshot comparison
- Incremental rollout - one component at a time
- Performance monitoring - FPS, render time, memory
- Rollback: `git revert <commit>` per dep or per phase

## Validation Checklist (per phase)

- `npm run build` succeeds
- Bundle size decreased by expected amount
- All visualizations render correctly
- No console errors/warnings
- Interactive features work (drag, hover, click)
- Lighthouse performance equal or better
- Visual regression test passes

## Success Metrics

| Metric | Current | After P1 | After P2 | After P3 |
|--------|---------|----------|----------|----------|
| Dependencies | 9 | 6 (-33%) | 4 (-56%) | 2 (-78%) |
| Bundle (gzip) | ~100KB | ~78KB | ~62KB | ~42KB |
| Viz load time | ~50ms | <50ms | <50ms | <40ms |
| TTI | 2.5s | 2.3s | 2.1s | 1.9s |

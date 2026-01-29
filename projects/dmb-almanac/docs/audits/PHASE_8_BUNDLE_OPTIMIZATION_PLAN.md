# Phase 8: Bundle Optimization Plan

## Executive Summary

Based on comprehensive bundle analysis, the DMB Almanac app has several optimization opportunities that can reduce initial load time and improve performance on Apple Silicon Macs and all platforms.

**Current State:**
- Total client bundle: ~600+ KB (gzipped)
- Largest chunks: 142 KB, 87 KB, 80 KB (uncompressed)
- D3 visualizations loaded eagerly on all routes
- WASM transform module (98.26 KB server-side) needs analysis

**Target Goals:**
- Reduce critical path bundle by 40% (from ~200 KB to ~120 KB)
- Implement route-based code splitting for visualizations
- Defer D3 libraries until visualization pages load
- Optimize Dexie.js tree-shaking
- Improve IndexedDB query patterns

---

## Analysis Findings

### 1. Client-Side Chunks (Top 10)

| Chunk | Size (Uncompressed) | Likely Contents | Priority |
|-------|---------------------|----------------|----------|
| DP9_wQfI.js | 142 KB | D3 force simulation + network graphs | HIGH |
| CERTZCY9.js | 87 KB | D3 geo + map visualizations | HIGH |
| CSNJrTeI.js | 80 KB | D3 scale + axis (shared utilities) | MEDIUM |
| DPuHkU7l.js | 57 KB | D3 transition + animation | MEDIUM |
| rGzJK-Od.js | 52 KB | D3 sankey/flow diagrams | HIGH |
| CNdeu4uV.js | 42 KB | Dexie.js core | LOW |
| BNbIddF3.js | 36 KB | Unknown (needs source map analysis) | MEDIUM |
| D1c6-A9b.js | 34 KB | Unknown | MEDIUM |
| fjd891kk.js | 30 KB | Unknown | MEDIUM |
| DAUMQ_Mu.js | 27 KB | Unknown | MEDIUM |

**Total of top 10**: ~587 KB uncompressed

### 2. Server-Side Chunks (Top 5)

| Chunk | Size | Contents |
|-------|------|----------|
| dexie.js | 99.58 KB | Dexie.js library |
| dmb_transform.js | 98.26 KB | WASM transform wrapper |
| index2.js | 76.34 KB | Unknown |
| db.js | 55.37 KB | Database utilities |
| _layout.svelte.js | 43.02 KB | Root layout |

### 3. Route-Specific Bundles

| Route | Size | Heavy Imports | Split Opportunity |
|-------|------|---------------|-------------------|
| /visualizations | 29.33 KB | ALL D3 modules | ✅ **YES - Defer all D3** |
| /shows/[id] | 25.47 KB | D3 for show viz | ✅ **YES - Lazy load viz** |
| /search | 29.33 KB | Search + filters | ⚠️ **MAYBE - Core feature** |
| /songs/[slug] | ~15 KB | Song stats viz | ✅ **YES - Lazy load** |

---

## Optimization Strategy

### Priority 1: D3 Code Splitting (Est. 40% reduction)

**Problem**: D3 modules (d3-force, d3-geo, d3-sankey, d3-scale, d3-axis, d3-transition) are bundled eagerly, adding ~350+ KB to the critical path.

**Solution**: Implement lazy loading for ALL D3 visualizations.

**Implementation**:

1. **Create D3 Module Loaders** (already exists: `$lib/utils/d3-loader.ts`)
   - Keep existing dynamic imports for each D3 module
   - Ensure tree-shaking works correctly

2. **Route-Based Splitting**:
   ```typescript
   // visualizations/+page.svelte
   // BEFORE:
   import TransitionFlow from '$lib/components/visualizations/TransitionFlow.svelte';
   import GuestNetwork from '$lib/components/visualizations/GuestNetwork.svelte';

   // AFTER:
   const TransitionFlow = lazy(() => import('$lib/components/visualizations/TransitionFlow.svelte'));
   const GuestNetwork = lazy(() => import('$lib/components/visualizations/GuestNetwork.svelte'));
   ```

3. **Preload on Hover** (already implemented):
   ```typescript
   // Keep existing preloadVisualization() function
   function handleTabHover(tabId: string) {
     preloadVisualization(tabId as 'transitions' | 'guests' | ...);
   }
   ```

**Expected Impact**:
- Critical path: -250 KB (D3 modules deferred)
- /visualizations route: +250 KB (lazy loaded)
- Initial page load: **40% faster**

### Priority 2: Dexie.js Tree-Shaking (Est. 10% reduction)

**Problem**: Dexie.js bundle is 99.58 KB (server) + 42 KB (client). Possible unused features.

**Solution**: Audit Dexie.js imports and ensure tree-shaking.

**Implementation**:

1. **Analyze Dexie Usage**:
   ```bash
   # Find all Dexie imports
   grep -r "from 'dexie'" app/src --include="*.ts" --include="*.svelte"
   ```

2. **Use Named Imports**:
   ```typescript
   // BEFORE (pulls everything):
   import Dexie from 'dexie';

   // AFTER (tree-shakeable):
   import { Dexie, Table } from 'dexie';
   ```

3. **Check for Unused Dexie Features**:
   - `dexie-export-import` (if not using export)
   - `dexie-observable` (if not using sync)
   - Hook system (if only using basic queries)

**Expected Impact**:
- Dexie.js: 99.58 KB → ~80 KB (-20%)
- Client bundle: -5 KB

### Priority 3: WASM Transform Optimization (Est. 5% reduction)

**Problem**: `dmb_transform.js` is 98.26 KB (server-side). This wrapper may have optimization opportunities.

**Solution**:
1. Ensure WASM module is loaded lazily (already done)
2. Check for duplicate transform logic (JS fallback vs WASM)
3. Split WASM module by feature (if possible)

**Implementation**:

1. **Analyze transform.ts** (1,249 lines):
   - Lines 191-445: JavaScript fallback transforms (needed for Safari/Firefox)
   - Lines 447-654: WASM transform wrappers
   - Lines 788-1,248: TypedArray utilities (460 lines)

2. **Split TypedArray Utilities**:
   ```typescript
   // Move lines 788-1,248 to separate file
   // $lib/wasm/transform-typed-arrays.ts
   export * from './transform-typed-arrays';
   ```

3. **Lazy Load TypedArray Utils**:
   ```typescript
   // Only import when needed (liberation calculations, stats)
   const { computeSongPlayCountsTyped } = await import('./transform-typed-arrays');
   ```

**Expected Impact**:
- Server bundle: -15 KB (typed array utils split)
- Only loaded on liberation/stats pages

### Priority 4: Route-Based Code Splitting (Est. 15% reduction)

**Problem**: Heavy features loaded on all routes.

**Solution**: Split by route and lazy load on demand.

**Implementation**:

1. **/visualizations Route** (Highest Priority):
   ```svelte
   <!-- visualizations/+page.svelte -->
   <script>
   // Defer ALL visualization components
   const { default: TransitionFlow } = await import('./TransitionFlow.svelte');
   const { default: GuestNetwork } = await import('./GuestNetwork.svelte');
   const { default: TourMap } = await import('./TourMap.svelte');
   const { default: GapTimeline } = await import('./GapTimeline.svelte');
   const { default: SongHeatmap } = await import('./SongHeatmap.svelte');
   const { default: RarityScorecard } = await import('./RarityScorecard.svelte');
   </script>
   ```

2. **/shows/[id] Route**:
   ```svelte
   <!-- shows/[showId]/+page.svelte -->
   {#if showVisualization}
     {#await import('$lib/components/show/ShowVisualization.svelte')}
       <LoadingSpinner />
     {:then { default: ShowViz }}
       <ShowViz {show} />
     {/await}
   {/if}
   ```

3. **/songs/[slug] Route**:
   ```svelte
   <!-- songs/[slug]/+page.svelte -->
   {#if showStats}
     {#await import('$lib/components/song/SongStatsChart.svelte')}
       <LoadingSpinner />
     {:then { default: StatsChart }}
       <StatsChart {song} />
     {/await}
   {/if}
   ```

**Expected Impact**:
- Home page: -100 KB (no viz loaded)
- /visualizations: +250 KB (all viz loaded)
- /shows/[id]: +50 KB (show viz only)
- **Net improvement: Faster initial load**

### Priority 5: IndexedDB Query Optimization (Est. 10% faster queries)

**Problem**: Potential missing compound indexes and inefficient query patterns.

**Solution**: Add strategic indexes based on query patterns.

**Implementation**:

1. **Analyze Query Patterns**:
   ```bash
   # Find all Dexie queries
   grep -r "\.where\|\.orderBy\|\.filter" app/src/lib/db/dexie
   ```

2. **Add Compound Indexes**:
   ```typescript
   // schema.ts
   shows: '++id, date, venueId, tourId, year, [year+date], [venueId+date]'
   setlistEntries: '++id, showId, songId, position, year, [showId+position], [songId+year]'
   songs: '++id, slug, totalPerformances, [isLiberated+daysSinceLastPlayed]'
   ```

3. **Use Indexed Queries**:
   ```typescript
   // BEFORE (table scan):
   db.shows.filter(s => s.year === 2024 && s.venueId === 123).toArray();

   // AFTER (index scan):
   db.shows.where('[year+venueId]').equals([2024, 123]).toArray();
   ```

**Expected Impact**:
- Query latency: -20-50% for common queries
- Liberation list calculation: -30% (compound index on [songId+year])

### Priority 6: Service Worker Caching Strategy (Est. 5% improvement)

**Problem**: Static assets may not have optimal cache strategies.

**Solution**: Implement advanced caching with Workbox.

**Implementation**:

1. **Precache Critical Assets**:
   ```javascript
   // sw.js
   const criticalAssets = [
     '/app.css',
     '/entry.js',
     '/fonts/...',
   ];

   workbox.precaching.precacheAndRoute(criticalAssets);
   ```

2. **Runtime Caching Strategies**:
   ```javascript
   // D3 modules: Cache-first (never change)
   workbox.routing.registerRoute(
     /d3-.*\.js$/,
     new workbox.strategies.CacheFirst({
       cacheName: 'd3-modules',
       plugins: [
         new workbox.expiration.ExpirationPlugin({
           maxEntries: 50,
           maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
         }),
       ],
     })
   );

   // API calls: Network-first with offline fallback
   workbox.routing.registerRoute(
     /\/api\/.*/,
     new workbox.strategies.NetworkFirst({
       cacheName: 'api-cache',
       plugins: [
         new workbox.expiration.ExpirationPlugin({
           maxEntries: 100,
           maxAgeSeconds: 24 * 60 * 60, // 1 day
         }),
       ],
     })
   );
   ```

**Expected Impact**:
- Repeat visits: -50% load time (cached D3)
- Offline functionality: +100% (API fallback)

---

## Implementation Phases

### Phase 8.1: D3 Code Splitting (2-3 hours)

**Tasks**:
1. ✅ Verify `d3-loader.ts` exists and works
2. Update `/visualizations` route to use lazy loading
3. Update `/shows/[id]` route for lazy show viz
4. Update `/songs/[slug]` route for lazy stats
5. Test bundle size reduction
6. Verify visualizations still work

**Success Criteria**:
- Critical path bundle: <150 KB (from 200 KB)
- /visualizations loads D3 dynamically
- No broken visualizations

### Phase 8.2: Dexie.js Optimization (1-2 hours)

**Tasks**:
1. Audit all Dexie imports
2. Convert to named imports where possible
3. Remove unused Dexie features
4. Test database functionality
5. Measure bundle size reduction

**Success Criteria**:
- Dexie bundle: <85 KB (from 99.58 KB)
- All database queries work
- No performance regressions

### Phase 8.3: WASM Transform Splitting (1 hour)

**Tasks**:
1. Extract TypedArray utilities to separate file
2. Update imports to lazy load when needed
3. Test data transformations
4. Verify WASM fallback still works

**Success Criteria**:
- Server bundle: -15 KB
- Transform performance unchanged
- No breaking changes

### Phase 8.4: IndexedDB Query Optimization (2 hours)

**Tasks**:
1. Add compound indexes to schema
2. Update query patterns to use indexes
3. Test query performance before/after
4. Document new indexes

**Success Criteria**:
- Query latency: -20-50%
- Liberation list: -30% calculation time
- No query errors

### Phase 8.5: Service Worker Caching (1-2 hours)

**Tasks**:
1. Implement precaching for critical assets
2. Add runtime caching strategies
3. Test offline functionality
4. Verify cache invalidation works

**Success Criteria**:
- Repeat visits: -50% load time
- Offline mode works for cached routes
- Cache updates correctly on deployment

---

## Expected Cumulative Impact

| Optimization | Bundle Size Impact | Load Time Impact | Effort |
|--------------|-------------------|------------------|--------|
| D3 Code Splitting | -250 KB critical | -40% initial load | HIGH |
| Dexie Tree-Shaking | -20 KB | -3% | LOW |
| WASM Splitting | -15 KB server | -2% | LOW |
| Route Splitting | -100 KB home | -15% home page | MEDIUM |
| IndexedDB Indexes | N/A | -20-50% queries | MEDIUM |
| SW Caching | N/A | -50% repeat visits | MEDIUM |
| **TOTAL** | **-385 KB** | **-60% initial load** | **8-12 hours** |

---

## Monitoring and Validation

### Before Optimization (Baseline)

```bash
# Capture baseline metrics
npm run build
ls -lh .svelte-kit/output/client/_app/immutable/chunks/*.js | head -20
```

**Baseline Metrics**:
- Critical path: ~200 KB
- Largest chunk: 142 KB (D3 force)
- Total client bundle: ~600 KB
- IndexedDB query time (liberation list): TBD

### After Optimization (Target)

**Target Metrics**:
- Critical path: <120 KB (-40%)
- Largest chunk: <80 KB (Dexie)
- Total client bundle: ~400 KB (-33%)
- IndexedDB query time: -30%

### Validation Commands

```bash
# Build and measure
npm run build
find .svelte-kit/output/client -name "*.js" -exec ls -lh {} \; | sort -k5 -hr | head -10

# Lighthouse audit
npx lighthouse http://localhost:4173 --view

# Bundle analysis
npx vite-bundle-visualizer
```

---

## Rollback Plan

If any optimization breaks functionality:

1. **D3 Splitting**: Revert to eager imports
   ```git
   git revert <commit-hash>
   ```

2. **Dexie Changes**: Restore full Dexie import
   ```typescript
   import Dexie from 'dexie'; // Full bundle
   ```

3. **IndexedDB Indexes**: Remove compound indexes
   ```typescript
   // Revert to simple indexes
   shows: '++id, date, venueId, tourId, year'
   ```

---

## Next Steps

1. **Phase 8.1**: Implement D3 code splitting (HIGHEST IMPACT)
2. **Phase 8.2**: Optimize Dexie.js tree-shaking
3. **Phase 8.3**: Split WASM transform utilities
4. **Phase 8.4**: Add IndexedDB compound indexes
5. **Phase 8.5**: Enhance service worker caching

**Total Estimated Time**: 8-12 hours
**Expected Performance Improvement**: 60% faster initial load, 30% faster queries
**Risk Level**: Low (incremental changes with rollback plan)

---

## References

- [Vite Code Splitting Guide](https://vitejs.dev/guide/features.html#code-splitting)
- [SvelteKit Lazy Loading](https://kit.svelte.dev/docs/modules#$app-navigation-import)
- [Dexie.js Performance](https://dexie.org/docs/Tutorial/Best-Practices)
- [Workbox Caching Strategies](https://developer.chrome.com/docs/workbox/caching-strategies-overview/)
- [Lighthouse Performance Scoring](https://web.dev/performance-scoring/)

**Status**: Ready for Implementation ✅
**Priority**: HIGH 🚀
**Expected Completion**: Phase 8.1-8.5 (8-12 hours total)

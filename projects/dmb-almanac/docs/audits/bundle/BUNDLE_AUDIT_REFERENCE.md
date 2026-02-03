# Bundle Audit Reference (Compressed)

## Build Profile
- Framework: SvelteKit 2 + Vite 6.4.1, target ES2022 (Chrome 130+)
- Build time: ~6s
- Total client transfer (gzip): 365 KB (JS 285 KB + CSS 62 KB + SW 17 KB)
- Critical path (initial load, gzip): ~160 KB
- JS chunks: 60 files, 830 KB raw / 285 KB gzip
- WASM: 7 modules, lazy-loaded
- Zero polyfills

## Overall Grade: A
- Dependency audit: A+
- Tree-shaking: A-
- Code splitting: A
- Lazy loading: A+
- Native API usage: A+
- Polyfill overhead: A+
- Bundle consolidation: A

## Top Chunks by Gzip Size
| Chunk | Identity | Raw | Gzip | Load |
|-------|----------|-----|------|------|
| DP9_wQfI | Dexie (IndexedDB) | 95.8 KB | 31.9 KB | Eager |
| RZkROLzn | Svelte 5 runtime | 81.1 KB | 31.0 KB | Eager |
| faV0xiKa | d3-scale+axis | 46.2 KB | 16.0 KB | Lazy |
| nagOjm5Y | SvelteKit client | 46.5 KB | 10.6 KB | Eager |
| BPDkwtzm | d3-geo+topojson | 42.5 KB | 15.8 KB | Lazy |
| D2BTjPBV | Components+layout | 43.7 KB | 13.3 KB | Eager |
| BISgOZjA | WASM bridge | 34.2 KB | 10.6 KB | Lazy |
| CxQYf8G2 | PWA services | 24.3 KB | 7.7 KB | Eager |
| DhY6CiXd | i18n+monitoring | 20.1 KB | 7.2 KB | Eager |

## Dependency Weights (gzip in bundle)
- **dexie** 31.9 KB - Eager, required for offline DB
- **d3-scale+axis** 16.0 KB - Lazy, STILL BUNDLED (native replacements exist but not fully wired)
- **d3-geo** 15.8 KB - Lazy, TourMap only
- **d3-selection** 4.3 KB - Lazy, all visualizations
- **d3-sankey** 2.5 KB - Lazy, TransitionFlow only
- **d3-drag** 2.1 KB - Lazy, GuestNetwork only
- **topojson-client** in d3-geo chunk - Lazy, TourMap only
- **web-push** 0 KB client - Server-side only

## Critical Finding: d3-scale/d3-axis Not Fully Migrated
- Native replacements exist: `native-scales.js`, `native-axis.js`
- `d3-loader.js` lines 289, 304 still have `import('d3-scale')`, `import('d3-axis')`
- 5 visualization components still reference d3-scale via dynamic imports
- Components: GapTimeline, RarityScorecard, GuestNetwork, TourMap, TransitionFlow
- **Potential savings: 16.0 KB gzip if fully migrated**

## Native Replacements Already Done
- ~~d3-scale~~ -> native linear scale + Math (32 KB saved) -- PARTIAL, see above
- ~~d3-axis~~ -> SVG text + DOM methods (18 KB saved) -- PARTIAL
- ~~d3-drag~~ -> Pointer Events API (8 KB saved)
- No moment.js (native Temporal/Intl)
- No lodash (native Array/Object)
- No axios (native fetch)
- No core-js polyfills
- Uses crypto.subtle, structuredClone, Compression Streams, View Transitions

## Lazy Loading Status (100% coverage)
- D3 libraries: 6/6 lazy via `d3-loader.js` with moduleCache
- WASM modules: 7/7 lazy
- PWA components: 17+ lazy
- Visualizations: 6/6 lazy
- Route pages: 26/26 (SvelteKit automatic)

## D3 Loader Pattern
```javascript
// src/lib/utils/d3-loader.js
export async function loadD3Selection() {
  if (moduleCache.has('d3-selection')) return moduleCache.get('d3-selection');
  const module = await import('d3-selection');
  moduleCache.set('d3-selection', module);
  return module;
}
```

## Manual Chunk Config
```javascript
// vite.config.js
function manualChunks(id) {
  if (id.includes('d3-selection')) return 'd3-selection';
  if (id.includes('d3-sankey')) return 'd3-sankey';
  if (id.includes('d3-geo')) return 'd3-geo';
  if (id.includes('dexie')) return 'dexie';
  if (id.includes('topojson-client')) return 'd3-geo';
}
```

## Consolidation Groups (12 groups, ~30 KB overhead eliminated)
- `db-utils`: 12 Dexie helpers
- `utils-scheduling`: 5 perf modules
- `utils-visualization`: 6 D3 utilities
- `utils-core`: 15 shared utils
- `utils-pwa`: 21 browser APIs
- `components-pwa`: 17+ PWA components
- `components-ui`: UI primitives
- `monitoring`: telemetry modules
- `pwa-services`: PWA service layer
- `wasm-bridge`: WASM bridge + loaders
- `seo`: JSON-LD, meta
- `i18n`: translations

## Tree-Shaking Status
- `sideEffects` configured in package.json
- Named exports throughout
- 127+ exports scanned, 0 unused
- Build target ES2022, no syntax transforms
- Blockers: d3-scale full module via dynamic import, Dexie single-module package

## Duplicate Code (Minimal)
- Formatting: `native-axis.js` has duplicate `formatDate()`, `formatNumber()` -- import from `format.js` instead (~2 KB)
- MARGINS constants duplicated in GapTimeline, SongHeatmap, RarityScorecard (~2 KB)
- Axis implementations: 5 variants in `native-axis.js`, audit which are used (~3-5 KB)
- Barrel exports in `components/pwa/index.js`, `errors/index.js`, `search/index.js` (~2-3 KB)

## Optimization Actions

### P0: High Impact (18 KB gzip)
| Action | Files | Savings | Effort |
|--------|-------|---------|--------|
| Complete d3-scale/d3-axis native migration | d3-loader.js, 5 viz components | 16.0 KB | 4-6 hrs |
| Remove duplicate formatDate/formatNumber | native-axis.js | 2 KB | 15 min |

### P1: Medium Impact (20 KB gzip, mostly off critical path)
| Action | Files | Savings | Effort |
|--------|-------|---------|--------|
| Defer Dexie init to first data access | stores/dexie.js, layout, hooks | 31.9 KB off critical path | 6-8 hrs |
| Lazy-load PWA components after 5s idle | +layout.svelte | 8 KB off critical path | 2 hrs |
| Defer RUM/monitoring after FCP | +layout.svelte | 3-4 KB | 1 hr |
| Remove unused axis variants | native-axis.js | 3-5 KB | 30 min |
| Audit d3-loader dead code | d3-loader.js | 1 KB | 15 min |
| Audit unused query helpers | db/dexie/queries.js | 5 KB | 1 hr |

### P2: Low Impact (10 KB gzip)
| Action | Files | Savings | Effort |
|--------|-------|---------|--------|
| Consolidate MARGINS constants | d3-utils.js, 3 viz components | 1-2 KB | 15 min |
| Remove barrel re-exports | component index.js files | 2-3 KB | 30 min |
| i18n tree-shake unused locales | lib/i18n/ | 2-3 KB | 30 min |
| WASM bridge dead code | wasm/advanced-modules.js | 3-5 KB | 1 hr |

### P3: Future (Q2-Q3 2026)
- Replace Dexie with custom IndexedDB wrapper (20-25 KB, significant refactor)
- Per-visualization lazy-loadable components (8-12 KB)

## Prefetch Opportunity
- `preloadVisualization()` exists in d3-loader.js but not called on hover
- Wire to `on:mouseenter` on visualization nav links
- ~200ms faster perceived load

## Dexie Lazy-Load Details
- Used by 4+ files: `db/dexie/queries.js`, `db/dexie/db.js`, `stores/dexie.js`, route loads
- `stores/dexie.js` (~8 KB) auto-inits on app load -- defer to first data access
- `db/dexie/cache.js` (~3 KB) TTL cleanup runs eagerly -- lazy-load timer
- `db/dexie/validation/` (~5 KB) validated on startup -- defer to first write

## Parse Time Estimates
| Device | Critical Path | Full Bundle |
|--------|--------------|-------------|
| High-end desktop | ~7 ms | ~42 ms |
| Mid-range mobile | ~27 ms | ~166 ms |
| Low-end mobile | ~68 ms | ~415 ms |

## Network Transfer
| Connection | Time for 365 KB gzip |
|-----------|---------------------|
| 3G (1.5 Mbps) | 1.95s |
| 4G (10 Mbps) | 0.29s |
| WiFi (50 Mbps) | 0.06s |

## Savings Already Achieved
- Chunk consolidation (60+ to 32): ~10 KB gzip
- sideEffects declaration: ~2 KB gzip
- ES2022 target: ~5 KB gzip
- Zero polyfills: ~8 KB gzip
- D3 lazy loading: 38 KB off critical path
- WASM lazy loading: 754 KB off critical path
- Native Pointer Events (partial): ~2 KB gzip

## Validation Commands
```bash
cd projects/dmb-almanac/app
npm run build
# Measure gzip size
find build/client/_app/immutable/chunks -name "*.js" \
  -exec gzip -c {} \; 2>/dev/null | wc -c | awk '{printf "%.2f KB\n", $1/1024}'
# Source map analysis
VITE_SOURCEMAP=true npm run build
npx source-map-explorer 'build/client/_app/immutable/chunks/*.js' --html report.html
```

## Key File Paths
- `app/vite.config.js` -- build config, chunk splitting
- `app/package.json` -- deps, sideEffects
- `app/src/lib/utils/d3-utils.js` -- D3 shared viz utilities
- `app/src/lib/utils/d3-utils.js` -- shared viz utilities
- `app/src/lib/utils/native-scales.js` -- native d3-scale replacement
- `app/src/lib/utils/native-axis.js` -- native d3-axis replacement, has duplicates
- `app/src/lib/utils/format.js` -- canonical formatting functions
- `app/src/lib/stores/dexie.js` -- Dexie store wrapper (eager init)
- `app/src/lib/db/dexie/queries.js` -- DB query interface
- `app/src/routes/+layout.svelte` -- PWA/monitoring eager loads
- `app/src/routes/visualizations/+page.svelte` -- prefetch target

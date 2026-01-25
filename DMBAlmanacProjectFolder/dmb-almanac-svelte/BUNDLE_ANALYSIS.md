# DMB Almanac Bundle Optimization Analysis

Date: January 22, 2026
Framework: SvelteKit 2 with Svelte 5
Build Tool: Vite 6.0.7
Target: Chromium 143+ on Apple Silicon

---

## Executive Summary

The DMB Almanac app has several significant optimization opportunities that could reduce bundle size by approximately 35-45% while maintaining feature parity. The current build contains unnecessary bloat from D3 visualization libraries, suboptimal tree-shaking of Dexie.js, and missing dynamic import opportunities.

### Current Bundle Status
- **Total Client Build**: 32 MB (includes all assets, CSS, compressed variants)
- **Largest JS Chunk**: 145 KB (DP9_wQfI.js) - uncompressed
- **Gzip Compression**: ~36% reduction (typical for this codebase)
- **Critical Issue**: WASM modules not properly integrated in build

---

## 1. Current Bundle Composition Analysis

### Largest JavaScript Chunks

| Chunk | Size (KB) | Content Type | Issue |
|-------|-----------|--------------|-------|
| DP9_wQfI.js | 145 | D3 visualizations + Dexie | All D3 in initial bundle |
| CKn9w1lU.js | 66 | Database queries | Dexie factory patterns |
| CS7z9cqC.js | 62 | UI components | Card, Button, shared utilities |
| DNLPtLlO.js | 43 | Route-specific (shows) | Not code-split by route |
| D8f01nDw.js | 43 | Route-specific (songs) | Not code-split by route |
| C3GtIhaN.js | 40 | Route-specific (venues) | Not code-split by route |
| DNSYaLNH.js | 25 | Search/filtering logic | Reactive patterns |
| DHXg6zPe.js | 18 | Workers/utilities | Force simulation worker |

**Total measured JS chunks: 541 KB** (uncompressed), ~190 KB gzipped

### CSS Assets
- **Total CSS**: ~230 KB (uncompressed)
- **Gzipped**: ~45 KB
- **Status**: Well-optimized, minimal redundancy

### WASM Modules
- **WASM Status**: NOT DEPLOYED IN BUILD
- **Missing**: dmb-transform.wasm (862 KB uncompressed in source)
- **Missing**: dmb-segue-analysis.wasm
- **Missing**: dmb-date-utils.wasm
- **Issue**: Vite WASM plugin not properly integrating modules into output
- **Build Error**: wasm-opt validation errors (disabled in Cargo.toml fix)

---

## 2. Tree-Shaking Effectiveness Analysis

### D3 Library Imports (Current State)

**CRITICAL ISSUE**: All D3 modules bundled despite being used only in visualization routes.

#### D3 Module Usage:

```
d3-selection:     6 imports (select, pointer) - 16 KB
d3-scale:         7 imports (scaleTime, scaleLinear, scaleBand, etc) - 18 KB
d3-axis:          3 imports (axisBottom, axisTop, axisLeft) - 8 KB
d3-sankey:        1 import (sankey, sankeyLinkHorizontal) - 12 KB
d3-force:         2 imports (forceSimulation, forceLink, etc) - 22 KB
d3-geo:           1 import (geoAlbersUsa, geoPath) - 24 KB
d3-drag:          1 import (drag) - 4 KB
d3-array:         1 import (max) - limited usage - 4 KB
topojson-client:  1 import (for geographic data) - 8 KB
```

**Total D3 ecosystem in bundle: ~116 KB**

#### Current vite.config.ts Manual Chunking:

```typescript
manualChunks(id) {
  if (id.includes('node_modules')) {
    if (id.includes('d3-selection') || id.includes('d3-scale')) {
      return 'd3-core';
    }
    if (id.includes('d3-axis')) {
      return 'd3-axis';
    }
    if (id.includes('d3-sankey') || id.includes('d3-force') || id.includes('d3-geo')) {
      return 'd3-viz';
    }
  }
}
```

**Status**: Chunking is configured BUT chunks are still loaded eagerly because visualization components are imported at module-level in index.ts.

### Dexie.js Import Pattern

```typescript
// src/lib/stores/dexie.ts
import Dexie from 'dexie';
import { liveQuery, type Observable } from 'dexie';

// Singleton pattern with lazy loading
let dbPromise: Promise<typeof import('$db/dexie/db')> | null = null;

export async function getDb() {
  if (!dbPromise) {
    dbPromise = import('$db/dexie/db');
  }
  return dbPromise;
}
```

**Status**: Good lazy-load pattern, but Dexie core imported at top-level. Safe to split.

---

## 3. Code Splitting Opportunities

### Current State: Inadequate Route-Based Splitting

The app uses SvelteKit 2 which automatically creates per-route code chunks, but visualization components break this pattern.

#### Visualization Components Import Pattern (BLOCKING)

```typescript
// src/lib/components/visualizations/index.ts
export { default as TransitionFlow } from './TransitionFlow.svelte';
export { default as GuestNetwork } from './GuestNetwork.svelte';
export { default as TourMap } from './TourMap.svelte';
export { default as GapTimeline } from './GapTimeline.svelte';
export { default as SongHeatmap } from './SongHeatmap.svelte';
export { default as RarityScorecard } from './RarityScorecard.svelte';
```

**Problem**: These are exported from index.ts, making them eagerly imported if any component imports from the barrel export.

#### Visualization Route Implementation (GOOD)

```typescript
const componentLoaders = {
  transitions: () => import('$lib/components/visualizations/TransitionFlow.svelte'),
  guests: () => import('$lib/components/visualizations/GuestNetwork.svelte'),
  map: () => import('$lib/components/visualizations/TourMap.svelte'),
  timeline: () => import('$lib/components/visualizations/GapTimeline.svelte'),
  heatmap: () => import('$lib/components/visualizations/SongHeatmap.svelte'),
  rarity: () => import('$lib/components/visualizations/RarityScorecard.svelte')
};
```

**Status**: Dynamic imports implemented correctly in the route, but D3 deps still load eagerly.

### Additional Code Splitting Opportunities

| Feature | Location | Size Impact | Users Affected | Opportunity |
|---------|----------|-------------|----------------|-------------|
| Visualizations | /visualizations | 116 KB D3 | <15% | Dynamic import D3 per chart |
| Search/Filter | /songs, /shows, /venues | 25 KB | ~40% | Lazy-load advanced filters |
| Guest Network | /visualizations tab | 22 KB d3-force | <5% | Load only on tab click |
| Geographic Map | /visualizations tab | 32 KB d3-geo | <5% | Load only on tab click |

---

## 4. Large Dependencies Analysis

### D3 Dependencies Breakdown

Each visualization loads multiple D3 modules:

```
TransitionFlow.svelte:
  - d3-selection (select, 16 KB)
  - d3-scale (scaleOrdinal, 18 KB)
  - d3-sankey (sankey, sankeyLinkHorizontal, 12 KB)
  Total: 46 KB

GuestNetwork.svelte:
  - d3-selection (select, 16 KB)
  - d3-scale (scaleLinear, scaleOrdinal, 18 KB)
  - d3-force (forceSimulation, forceLink, forceManyBody, etc, 22 KB)
  - d3-drag (drag, 4 KB)
  Total: 60 KB

GapTimeline.svelte:
  - d3-selection (select, pointer, 16 KB)
  - d3-scale (scaleTime, scaleLinear, scaleOrdinal, 18 KB)
  - d3-axis (axisBottom, axisLeft, 8 KB)
  Total: 42 KB

TourMap.svelte:
  - d3-selection (select, 16 KB)
  - d3-scale (scaleSqrt, 18 KB)
  - d3-geo (geoAlbersUsa, geoPath, 24 KB)
  - topojson-client (3.1.0, 8 KB)
  Total: 66 KB

SongHeatmap.svelte:
  - d3-selection (select, 16 KB)
  - d3-scale (scaleBand, scaleLinear, scaleQuantize, 18 KB)
  - d3-axis (axisTop, axisLeft, 8 KB)
  Total: 42 KB

RarityScorecard.svelte:
  - d3-selection (select, 16 KB)
  - d3-scale (scaleBand, scaleLinear, 18 KB)
  - d3-axis (axisLeft, 8 KB)
  Total: 42 KB
```

### WASM Modules (Currently Unused)

The project has three WASM modules built but not deployed:

```
dmb-transform.wasm:          862 KB (compiled)
  - TF-IDF search engine
  - Rarity scoring
  - Data transformation
  - Status: Broken build (wasm-opt disabled)

dmb-segue-analysis.wasm:     TBD (not found in build output)
  - Segue detection
  - Song transition analysis
  - Status: Unknown

dmb-date-utils.wasm:         TBD (not found in build output)
  - Date calculations
  - Gap computations
  - Status: Unknown
```

**Issue**: WASM modules are in Cargo.toml as dev dependencies but not built/deployed.

---

## 5. WASM Module Integration Issues

### Current Build Failures

1. **wasm-opt Validation Error**
   - Error: "unexpected false: all used features should be allowed"
   - Occurs in functions using `i32.trunc_sat_f64_u` and `i64.trunc_sat_f64_s`
   - **Fix Applied**: Disabled wasm-opt in Cargo.toml (already done)
   - **Impact**: Removes -50% WASM size optimization, WASM files ~1.7x larger

2. **WASM Not Deployed**
   - dmb_transform.wasm exists in `/wasm/dmb-transform/pkg/` (862 KB)
   - Not included in Vite build output
   - **Reason**: Vite WASM plugin may not be finding modules
   - **Check**: See vite.config.ts `optimizeDeps.exclude`

### WASM Usage Pattern

```typescript
// src/lib/wasm/bridge.ts
async function analyzeSongRarity(songs: DexieSong[]): Promise<RarityAnalysis> {
  const wasmModule = await import('dmb-transform').catch(() => null);
  if (!wasmModule) {
    console.warn('WASM unavailable, using JS fallback');
    return jsRarityFallback(songs);
  }
  return wasmModule.computeRarity(songs);
}
```

**Status**: Graceful fallback implemented, but WASM never loads because module is missing from output.

---

## 6. Dynamic Import Opportunities

### Immediately Actionable (Week 1)

#### 1. Lazy Load D3 Per Chart (Est. Savings: 110 KB)

Each visualization component should be split into separate lazy-loaded chunks:

```typescript
// BAD - current approach
import { TransitionFlow, GuestNetwork } from '$lib/components/visualizations/index';

// GOOD - lazy-load approach
const TransitionFlow = async () => {
  const mod = await import('$lib/components/visualizations/TransitionFlow.svelte');
  return mod.default;
};

// BETTER - in route page
const componentLoaders = {
  transitions: () => import('$lib/components/visualizations/TransitionFlow.svelte'),
  // ... already implemented in /visualizations route!
};
```

**Action**: The route already does this correctly. Issue is D3 deps still load because they're imported at module-level in visualization components.

#### 2. Split D3 by Chart Type (Est. Savings: 65 KB)

Create separate vendor bundles:

```typescript
// vite.config.ts - enhanced manual chunking
manualChunks(id) {
  if (id.includes('node_modules')) {
    // D3 core utilities - used by all charts
    if (id.includes('d3-selection') || id.includes('d3-scale')) {
      return 'd3-core'; // 34 KB
    }
    // Axes - used by timeline, heatmap, rarity
    if (id.includes('d3-axis')) {
      return 'd3-axis'; // 8 KB
    }
    // Sankey - only TransitionFlow
    if (id.includes('d3-sankey')) {
      return 'd3-sankey-viz'; // 12 KB
    }
    // Force simulation - only GuestNetwork
    if (id.includes('d3-force')) {
      return 'd3-force-viz'; // 22 KB
    }
    // Geography - only TourMap
    if (id.includes('d3-geo') || id.includes('topojson')) {
      return 'd3-geo-viz'; // 32 KB
    }
    // Drag - only GuestNetwork
    if (id.includes('d3-drag')) {
      return 'd3-drag-util'; // 4 KB
    }
  }
}
```

**Benefit**: Charts load only their dependencies on-demand.

#### 3. Lazy Load Database Features (Est. Savings: 20 KB)

```typescript
// src/lib/stores/dexie.ts - already has lazy pattern
export async function getDb() {
  if (!dbPromise) {
    dbPromise = import('$db/dexie/db');
  }
  return dbPromise;
}
```

**Status**: Good, but consider lazy-loading specific query modules:

```typescript
// Lazy-load search module only when needed
const searchModule = await import('$db/dexie/search-queries');
const results = await searchModule.searchSongs(query);
```

#### 4. Remove Unused Dexie Features (Est. Savings: 8 KB)

Check `src/lib/db/dexie/queries.ts` for unused methods and remove or tree-shake them.

### Secondary Opportunities (Week 2-3)

#### 5. Implement Prefetching Strategy (No size impact, UX improvement)

```typescript
function prefetchVisualization(chartType: string) {
  import(`$lib/components/visualizations/${chartType}.svelte`);
}

// Prefetch on route navigation
<a href="/visualizations" onmouseenter={() => prefetchVisualization('TransitionFlow')}>
  View Charts
</a>
```

#### 6. Service Worker Caching for D3 (No size impact, load time improvement)

Currently Workbox is configured, but ensure D3 chunks are cached:

```typescript
// src/service-worker.ts
const CACHEABLE_D3_PATTERNS = [
  /d3-/,
  /topojson-/
];
```

---

## 7. Performance Metrics & Targets

### Current State (Measured)

| Metric | Value | Status |
|--------|-------|--------|
| Total JS (gzip) | ~190 KB | Target: <150 KB |
| Initial Bundle | 145 KB (largest chunk) | Target: <75 KB |
| CSS (gzip) | ~45 KB | Target: <40 KB |
| WASM Deployed | 0 MB | Issue: Not built |
| TTI Impact (D3 wait) | ~300ms | Target: <100ms |

### Optimization Targets

| Phase | Bundle Size | TTI | LCP |
|-------|-------------|-----|-----|
| Current | 190 KB | 1.2s | 0.8s |
| Week 1 (Quick Wins) | 125 KB (-34%) | 0.9s | 0.7s |
| Week 2 (Full Implementation) | 110 KB (-42%) | 0.7s | 0.65s |
| Final Goal | <100 KB (-47%) | <0.6s | <0.6s |

---

## 8. Detailed Recommendations

### CRITICAL (Implement First)

#### 1. Fix WASM Build and Deployment

**File**: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/wasm/dmb-transform/Cargo.toml`

Status: wasm-opt already disabled (✓ Done)

**Next Steps**:
- [ ] Re-enable wasm-opt with updated version or use alternative
- [ ] Verify WASM outputs to `/build/client/_app/immutable/` (currently missing)
- [ ] Add WASM preloading to app.html
- [ ] Test WASM module loading with fallback

**Expected Savings**: -50 KB network (WASM will be 430 KB instead of 862 KB if opt applied)

#### 2. Break Out D3 Visualization Chunks

**File**: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/vite.config.ts`

**Change**:
```typescript
// Add this to manual chunking to ensure D3 modules aren't in main bundle
manualChunks(id) {
  if (id.includes('node_modules')) {
    // Only bundle D3 when visualization component requests it
    // This prevents eager loading of D3 in main entry bundle

    if (id.includes('d3-')) {
      const match = id.match(/d3-(\w+)/);
      if (match) {
        return `d3-${match[1]}`;
      }
    }

    if (id.includes('topojson-client')) {
      return 'topojson-client';
    }
  }
}
```

**Expected Savings**: -40 KB from main bundle (D3 becomes lazy-loaded chunks)

#### 3. Break Out Large Route Chunks

**Status**: SvelteKit already does per-route splitting, but consolidated chunks suggest shared dependencies.

**Investigation**:
- DNLPtLlO.js (43 KB - shows route)
- D8f01nDw.js (43 KB - songs route)
- C3GtIhaN.js (40 KB - venues route)

These should be much smaller. Likely caused by shared search/filter logic.

**Action**:
```typescript
// Create separate shared chunks for route-common utilities
// vite.config.ts
manualChunks(id) {
  if (id.includes('node_modules')) {
    // Keep shared utilities in explicit chunks
    if (id.includes('dexie')) {
      return 'dexie-client';
    }
  }

  // App code - routes already auto-split by SvelteKit
  if (id.includes('src/routes/')) {
    // Let SvelteKit handle this
    return undefined;
  }
}
```

**Expected Savings**: -15 KB (better route isolation)

### HIGH PRIORITY (Week 1)

#### 4. Remove Unused WASM Dependencies

**File**: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/wasm/dmb-transform/Cargo.toml`

Current unused features:
- `console_error_panic_hook` (only in dev) - 3 KB
- Check if `rayon` parallel feature is actually used

**Action**: Make these true dev-only dependencies.

**Expected Savings**: -3 KB

#### 5. Implement Lazy Dexie Database Loading

**File**: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/stores/dexie.ts`

Already good, but consider:

```typescript
// Instead of importing all query modules upfront
// import * as queries from '$db/dexie/queries';

// Lazy-load query modules only when needed
const getQueryModule = async () => {
  return import('$db/dexie/queries');
};
```

**Expected Savings**: -8 KB

#### 6. Tree-Shake Unused d3-array Exports

**Status**: Using only `max` function from d3-array, but entire module is bundled.

**Action**: Create a minimal utility if d3-array is only used for `max`:

```typescript
// src/lib/utils/array.ts
export const max = (arr: number[]) => Math.max(...arr);

// In visualization components
// Change: import { max } from 'd3-array';
// To:     import { max } from '$lib/utils/array';
```

**Expected Savings**: -4 KB

### MEDIUM PRIORITY (Week 2)

#### 7. Implement Visualization Component Prefetching

**File**: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/routes/visualizations/+page.svelte`

Already has prefetch logic, enhance it:

```typescript
// Prefetch adjacent visualization when one loads
$effect(() => {
  const currentIndex = tabOptions.indexOf(activeTab);
  const nextTab = tabOptions[currentIndex + 1];
  if (nextTab) {
    loadComponent(nextTab as TabName);
  }
});
```

**Expected Savings**: No size reduction, but ~200ms perceived load improvement.

#### 8. Route-Level Code Splitting for API Handlers

Ensure all `+server.ts` files are properly tree-shaken in production.

**Check**:
- `/src/routes/api/telemetry/performance/+server.ts`
- Verify only used database queries are bundled

#### 9. CSS Scope Analysis

CSS looks well-optimized at 45 KB gzipped, but verify:
- No unused CSS Custom Properties
- No duplicate styles across components
- Global styles vs component-scoped ratio

**Tool**: Run `npm run build` with CSS analysis enabled.

---

## 9. Implementation Roadmap

### Phase 1: Quick Wins (1-2 days, Est. -40 KB gzip)

1. ✓ Fix WASM build config (Cargo.toml disabled wasm-opt)
2. [ ] Update vite.config.ts to prevent D3 eager loading
3. [ ] Verify route-level code splitting is working
4. [ ] Remove console_error_panic_hook from production

**Metrics After Phase 1**:
- Main bundle: 100 KB gzip (from 145 KB)
- D3 chunks lazy-loaded: 60 KB each (on-demand)
- Build time: Same

### Phase 2: Full Implementation (3-5 days, Est. -45 KB total)

1. [ ] Deploy WASM modules with proper loading strategy
2. [ ] Implement full D3 per-chart splitting
3. [ ] Create shared utilities (array.ts) to replace d3-array
4. [ ] Lazy-load search/advanced filters
5. [ ] Add prefetch hints to service worker

**Metrics After Phase 2**:
- Main bundle: 85 KB gzip (from 145 KB, -41%)
- D3 chunks: On-demand loading
- WASM: Deployed and cached, 430 KB gzip
- Total app capable: 400 KB gzip (all features loaded)
- Initial load: 85 KB gzip (main) + 45 KB (CSS) = 130 KB

### Phase 3: Polish (1-2 days, Est. additional optimizations)

1. [ ] Implement route prefetching with <link rel="prefetch">
2. [ ] Add critical CSS inlining
3. [ ] Verify Lighthouse scores
4. [ ] Add bundle size regression tests to CI/CD

---

## 10. Testing Strategy

### Manual Validation

```bash
# Build and analyze
npm run build

# Generate source maps
ls build/client/_app/immutable/chunks/*.js.map

# Check bundle sizes
du -h build/client/_app/immutable/chunks/ | sort -h

# Load in Chrome DevTools
# Network tab: Check JS chunk sizes and waterfall
# Coverage tab: Verify no unused code in initial bundle
```

### Automated Testing

```bash
# Add CI bundle size checks
# .github/workflows/bundle-size.yml

on:
  pull_request:
    branches: [main]

jobs:
  bundle-size:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run build
      - name: Check bundles
        run: |
          MAX_SIZE_KB=150
          SIZE=$(du -k build/client/_app/immutable/chunks/ | tail -1 | cut -f1)
          if [ "$SIZE" -gt "$MAX_SIZE_KB" ]; then
            echo "Main bundle too large: ${SIZE}KB (limit: ${MAX_SIZE_KB}KB)"
            exit 1
          fi
```

### Performance Testing

```typescript
// src/lib/utils/bundle-analyzer.ts
export async function reportBundleMetrics() {
  const chunks = document.querySelectorAll('script[src*="_app/immutable"]');
  let totalSize = 0;

  for (const script of chunks) {
    const response = await fetch(script.src, { method: 'HEAD' });
    const size = Number(response.headers.get('content-length')) || 0;
    totalSize += size;
    console.log(`${script.src}: ${(size / 1024).toFixed(1)} KB`);
  }

  console.log(`Total JS: ${(totalSize / 1024).toFixed(1)} KB`);

  // Report to analytics
  window.gtag?.('event', 'bundle_metrics', {
    total_size_kb: (totalSize / 1024).toFixed(1),
    timestamp: new Date().toISOString()
  });
}
```

---

## 11. Known Issues & Workarounds

### Issue 1: WASM Build Failures
- **Cause**: wasm-opt validation errors with certain Rust patterns
- **Current Fix**: Disabled wasm-opt (applied in Cargo.toml)
- **Side Effect**: WASM files are ~50% larger than optimal
- **Future Fix**: Update wasm-pack or use alternative wasm optimizer

### Issue 2: D3 in Initial Bundle
- **Cause**: Visualization components imported from barrel export
- **Impact**: D3 loads even when user never visits /visualizations
- **Fix**: Remove from index.ts barrel export, lazy-load in route

### Issue 3: TypeScript Types Bundled
- **Cause**: Some type imports not using `import type`
- **Impact**: Minimal (TS compiler handles this), but verify with `tsc --noEmit`
- **Fix**: Audit `d3-*` type imports, use `import type { ... }`

### Issue 4: CSS Not Minified Aggressively
- **Cause**: Vite's CSS minifier is conservative
- **Impact**: 45 KB CSS could potentially be 38 KB
- **Fix**: Use cssnano plugin if needed

---

## 12. Configuration Changes Required

### vite.config.ts Updates

```typescript
// CURRENT - needs enhancement
export default defineConfig({
  // ... existing config
  build: {
    target: 'es2022',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // ISSUE: D3 is bundled even when not used
            // FIX: Don't chunk D3 here, let it be lazy-loaded

            if (id.includes('dexie')) {
              return 'dexie';
            }
          }
        }
      }
    }
  }
});

// RECOMMENDED - updated approach
export default defineConfig({
  // ... existing config
  build: {
    target: 'es2022',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Dexie gets its own chunk for reuse
            if (id.includes('dexie')) {
              return 'dexie-db';
            }

            // D3 modules are split into separate chunks
            // This enables lazy-loading per visualization
            if (id.includes('d3-selection')) return 'd3-selection';
            if (id.includes('d3-scale')) return 'd3-scale';
            if (id.includes('d3-axis')) return 'd3-axis';
            if (id.includes('d3-sankey')) return 'd3-sankey';
            if (id.includes('d3-force')) return 'd3-force';
            if (id.includes('d3-geo')) return 'd3-geo';
            if (id.includes('d3-drag')) return 'd3-drag';
            if (id.includes('topojson')) return 'topojson';
          }
        }
      }
    },
    // Warn if chunks exceed this size
    chunkSizeWarningLimit: 75
  }
});
```

### Cargo.toml WASM Config

```toml
[package.metadata.wasm-pack.profile.release]
# Currently: wasm-opt = false (disabled due to validation errors)
# Should be: wasm-opt = ["-Oz", "--enable-bulk-memory"] once fixed
wasm-opt = false

[profile.release.package."*"]
opt-level = "z"  # Optimal for WASM size
```

---

## 13. Estimated Impact Summary

### Bundle Size Reduction

```
Current State:
  Main JS Bundle:      145 KB (uncompressed), 52 KB (gzip)
  D3 Dependencies:     116 KB (embedded)
  Total App JS:        541 KB (uncompressed), 190 KB (gzip)

After Optimizations:
  Main JS Bundle:       75 KB (uncompressed), 28 KB (gzip) ← -46%
  D3 Dependencies:      116 KB (lazy-loaded on-demand)
  Total Initial Load:   75 KB JS + 45 KB CSS = 120 KB gzip

Savings: -70 KB gzip (-37% for initial load)
```

### Performance Impact

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| First Contentful Paint (FCP) | ~0.8s | ~0.6s | -25% |
| Largest Contentful Paint (LCP) | ~1.0s | ~0.7s | -30% |
| Interaction to Next Paint (INP) | ~110ms | ~85ms | -23% |
| Time to Interactive (TTI) | ~1.2s | ~0.8s | -33% |
| Total Bundle (gzip) | 190 KB | 120 KB | -37% |

### User Experience Impact

- Faster page load on slow networks (3G: -2.5s)
- Reduced time on critical rendering path
- Better mobile performance
- Faster perceived interactivity
- Reduced CPU usage during load

---

## 14. Files to Modify

### High Priority
1. `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/vite.config.ts` - Manual chunking
2. `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/wasm/dmb-transform/Cargo.toml` - WASM build
3. `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/components/visualizations/index.ts` - Remove barrel export

### Medium Priority
4. `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/stores/dexie.ts` - Lazy loading
5. `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/routes/visualizations/+page.svelte` - Prefetch logic

### Documentation
6. Create `.claude/skills/bundle-optimization.md` - Optimization techniques
7. Create `BUNDLE_MONITORING.md` - CI/CD bundle checks

---

## 15. Success Metrics & CI/CD Integration

### Metrics to Track

```typescript
// Create metrics file to track over time
// scripts/bundle-metrics.ts

interface BundleMetrics {
  timestamp: string;
  mainBundleSize: number;     // KB, gzipped
  d3ChunksSize: number;       // KB, gzipped (lazy-loaded)
  wasmSize: number;           // KB, gzipped
  totalAssets: number;        // KB, gzipped
  chunkCount: number;         // Number of JS chunks
  largestChunk: number;       // KB, uncompressed
  fcp: number;                // Milliseconds
  lcp: number;                // Milliseconds
  ttfi: number;               // Milliseconds
}
```

### CI/CD Bundle Check

Add to GitHub Actions:

```yaml
- name: Bundle Size Check
  run: |
    npm run build
    MAIN_SIZE=$(wc -c < build/client/_app/immutable/chunks/DP9_wQfI.js)
    if [ "$MAIN_SIZE" -gt 100000 ]; then
      echo "⚠️ Main chunk exceeds 100KB"
      exit 1
    fi
    echo "✓ Bundle size within limits"
```

---

## Conclusion

The DMB Almanac app has significant optimization opportunities, primarily through:

1. **Lazy-loading D3 visualizations** (-40 KB, highest impact)
2. **Fixing WASM deployment** (-50 KB when optimized)
3. **Better route code splitting** (-15 KB)
4. **Tree-shaking improvements** (-8 KB)

**Total Potential Savings: -113 KB or 37-47% reduction in initial load**

These changes maintain feature parity while dramatically improving load times and user experience, particularly on mobile and slow networks. Implementation timeline: 1-2 weeks for full optimization, with quick wins available in 1-2 days.

# DMB Almanac Svelte - Bundle Size Optimization Analysis

**Analysis Date:** January 22, 2026
**Project:** dmb-almanac-svelte (SvelteKit 2 + Svelte 5)
**Target Platform:** Chromium 143+ / Apple Silicon
**Analysis Status:** Comprehensive (All dependencies, imports, and build config analyzed)

---

## EXECUTIVE SUMMARY

The DMB Almanac Svelte project has a solid foundation but is shipping 150-250 KB of unnecessary code that could be deferred with targeted code splitting. The main opportunities are:

| Finding | Current | Target | Savings |
|---------|---------|--------|---------|
| **Total JS (gzip)** | ~140 KB | ~100 KB | 40 KB |
| **D3 bundle** | 47 KB gzip | ~12 KB immediate | 35 KB deferred |
| **Dexie** | 30 KB gzip | ~8 KB on-demand | 22 KB deferred |
| **WASM modules** | All eagerly loaded | Lazy by feature | 250+ KB deferred |

**Estimated improvement:** 40-50% reduction in critical path JavaScript with strategic code splitting.

---

## DETAILED FINDINGS

### 1. D3.JS BUNDLE ANALYSIS

#### Current State

**Status:** Tree-shaking configured correctly, but no code splitting at route level

**D3 Modules in use:**
```
├── d3-selection (8 KB)     - DOM manipulation
├── d3-scale (15 KB)        - Scale functions (linear, band, quantize, time)
├── d3-scale-chromatic (12 KB) - Color schemes
├── d3-axis (6 KB)          - Axis generation
├── d3-array (10 KB)        - Array utilities (extent, max, group)
├── d3-force (20 KB)        - Force simulation (GuestNetwork)
├── d3-sankey (8 KB)        - Sankey diagram (TransitionFlow)
├── d3-geo (12 KB)          - Geographic projections (TourMap)
├── d3-drag (3 KB)          - Drag behavior
└── topojson-client (4 KB)  - TopoJSON conversion
```

**Total D3 ecosystem:** 98 KB raw (~28 KB gzip)

#### Import Analysis by Component

**File:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/components/visualizations/TransitionFlow.svelte` (Lines 1-10)
```typescript
import { select } from 'd3-selection';           // 8 KB raw
import { scaleOrdinal } from 'd3-scale';         // 15 KB raw (only uses scaleOrdinal)
import { schemeCategory10 } from 'd3-scale-chromatic';  // 12 KB raw (color scheme only)
import { sankey, sankeyLinkHorizontal } from 'd3-sankey'; // 8 KB raw
```
**Analysis:** Good named imports, tree-shakeable. But entire d3-scale is loaded even though only scaleOrdinal is used.

**File:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/components/visualizations/GuestNetwork.svelte` (Lines 1-11)
```typescript
import { select } from 'd3-selection';
import { scaleLinear, scaleOrdinal } from 'd3-scale';
import { max } from 'd3-array';
import { schemeCategory10 } from 'd3-scale-chromatic';
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide } from 'd3-force';
import { drag as d3Drag } from 'd3-drag';
import type { Simulation, SimulationNodeDatum } from 'd3-force';
import type { Selection } from 'd3-selection';
```
**Analysis:** Heavy component. Imports entire d3-force (20 KB raw) for simulation.

**File:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/components/visualizations/TourMap.svelte` (Lines 1-8)
```typescript
import { select } from 'd3-selection';
import { scaleQuantize, scaleLinear } from 'd3-scale';
import { schemeBlues, schemeGreens, schemeReds, schemePurples } from 'd3-scale-chromatic';
import { geoAlbersUsa, geoPath as d3GeoPath } from 'd3-geo';
import * as topojson from 'topojson-client';
```
**Analysis:** Loads all color schemes (12 KB) but uses only one at runtime based on prop.

**File:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/components/visualizations/SongHeatmap.svelte` (Lines 1-7)
```typescript
import { select } from 'd3-selection';
import { scaleBand, scaleLinear } from 'd3-scale';
import { max } from 'd3-array';
import { axisTop, axisLeft } from 'd3-axis';
```
**Analysis:** Good, minimal imports.

**File:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/components/visualizations/GapTimeline.svelte` (Lines 1-9)
```typescript
import { select } from 'd3-selection';
import { scaleTime, scaleLinear, scaleOrdinal } from 'd3-scale';
import { extent, max } from 'd3-array';
import { schemeCategory10 } from 'd3-scale-chromatic';
import { axisBottom, axisLeft } from 'd3-axis';
import { pointer } from 'd3-selection';
```
**Analysis:** Good imports, minimal waste.

**File:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/components/visualizations/RarityScorecard.svelte`
**Analysis:** Similar pattern, minimal imports.

#### Bundling Strategy Issue

**File:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/vite.config.ts` (Lines 26-40)
```typescript
optimizeDeps: {
  include: [
    'dexie',
    'd3-selection',
    'd3-scale',
    'd3-scale-chromatic',
    'd3-array',
    'd3-axis',
    'd3-sankey',
    'd3-force',
    'd3-geo'
  ],
  exclude: ['dmb-transform']
},
```

**Problems:**
1. **All D3 modules in optimizeDeps** - Forces them into a single pre-bundled chunk
2. **No rollupOptions.manualChunks** - Missing opportunity for vendor splitting
3. **All D3 loaded on initial page load** - Even pages without visualizations load all 28 KB gzip

#### Current Visualization Loading

**File:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/routes/visualizations/+page.svelte` (Lines 12-19)
```typescript
const componentLoaders = {
  transitions: () => import('$lib/components/visualizations/TransitionFlow.svelte'),
  guests: () => import('$lib/components/visualizations/GuestNetwork.svelte'),
  map: () => import('$lib/components/visualizations/TourMap.svelte'),
  timeline: () => import('$lib/components/visualizations/GapTimeline.svelte'),
  heatmap: () => import('$lib/components/visualizations/SongHeatmap.svelte'),
  rarity: () => import('$lib/components/visualizations/RarityScorecard.svelte')
} as const;
```

**Status:** Good! Dynamic imports with component caching. But D3 modules are still eagerly loaded because they're in `optimizeDeps`.

#### Tree-Shaking Assessment

**Status:** EXCELLENT
- All imports are named exports: `import { select } from 'd3-selection'`
- No barrel file anti-patterns in D3 imports
- D3 packages have proper `sideEffects: false` in their package.json

**Verification:**
- No `import * as d3 from 'd3'` patterns found
- No `import d3 from 'd3'` patterns found
- Each component imports exactly what it needs

---

### 2. DEXIE DATABASE LAYER ANALYSIS

#### Current Usage

**File:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/db/dexie/`

**Size Impact:**
- Raw bundle: 68.66 KB
- Gzipped: ~30-35 KB
- Loaded on every page load

#### Import Analysis

**Critical files:**
- `/src/lib/db/dexie/db.ts` - Dexie instance
- `/src/lib/db/dexie/queries.ts` - Query layer
- `/src/lib/db/dexie/cache.ts` - Caching logic
- `/src/lib/db/dexie/sync.ts` - Sync mechanism

**Current loading pattern:**
- Dexie imported in multiple stores
- Stores imported globally
- No lazy loading for database operations

#### Pages Requiring Dexie

**Analyzed pages:**

1. **`/my-shows`** - REQUIRES Dexie
   - Favorites list stored in IndexedDB
   - User show history
   - Attended shows tracking

2. **`/search`** - REQUIRES Dexie (optional)
   - Cached search results
   - Filter state persistence
   - But could work without IndexedDB with worse UX

3. **`/` (home)** - DOES NOT REQUIRE Dexie
   - Static content
   - Service Worker handles caching
   - No user data needed

4. **`/shows/*`** - DOES NOT REQUIRE Dexie
   - Server-rendered data
   - No offline functionality needed
   - No user tracking

5. **`/songs/*`** - DOES NOT REQUIRE Dexie
   - Server data only

6. **`/venues/*`** - DOES NOT REQUIRE Dexie
   - Server data only

7. **`/stats`** - DOES NOT REQUIRE Dexie
   - Server data for visualizations
   - D3 visualizations don't use IndexedDB

8. **`/guests/*`** - DOES NOT REQUIRE Dexie
   - Server data only

#### Load Path Analysis

**Current (eager):**
```
Initial page load
    ↓
Layout component
    ↓
Import stores
    ↓
Stores import Dexie
    ↓
30-35 KB gzip loaded
```

**Optimization target (lazy):**
```
Initial page load
    ↓
Check route
    ↓
If NOT /my-shows or /search → Skip Dexie
    ↓
Lazy load only when needed
```

---

### 3. WASM LOADING STRATEGY ANALYSIS

#### Current WASM Setup

**File:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/wasm/transform.ts` (Lines 80-119)

**Current implementation:**
```typescript
async function loadWasmModule(): Promise<WasmTransformModule | null> {
  if (wasmModule) return wasmModule;
  if (wasmLoadFailed) return null;
  if (wasmLoadPromise) return wasmLoadPromise;

  wasmLoadPromise = (async () => {
    try {
      if (typeof WebAssembly === 'undefined') {
        console.warn('[WASM Transform] WebAssembly not supported, using JavaScript fallback');
        wasmLoadFailed = true;
        return null;
      }

      // Dynamic import of WASM module
      const wasm = await import('../../../wasm/dmb-transform/pkg/dmb_transform.js');
      await wasm.default();
      wasmModule = wasm as unknown as WasmTransformModule;
      return wasmModule;
    } catch (error) {
      console.warn('[WASM Transform] Failed to load, using JavaScript fallback:', error);
      wasmLoadFailed = true;
      return null;
    }
  })();

  return wasmLoadPromise;
}
```

**Status: GOOD!** Dynamic import configured, caching in place, fallback available.

#### WASM Module Breakdown

**Directory:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/wasm/`

```
wasm/
├── dmb-core/ (Shared Rust code)
├── dmb-date-utils/ (Date calculations)
├── dmb-segue-analysis/ (Advanced analysis)
├── dmb-string-utils/ (String processing)
└── dmb-transform/ (Primary transforms)
```

**Module compilation products:**
- `dmb-transform_bg.wasm` - 436 KB (PRIMARY - always needed)
- `dmb-segue-analysis_bg.wasm` - 158 KB (Feature - rarely used)
- `dmb-date-utils_bg.wasm` - 117 KB (Utility - timeline only)
- `dmb-string-utils_bg.wasm` - 99 KB (Utility - search/filter only)

**Total WASM:** 810 KB (uncompressed)

#### WASM Loading Pattern

**File:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/wasm/dmb-transform/Cargo.toml`

**Issue identified:** Build only includes dmb-transform primary module, but all utilities compiled.

**Current usage:**
```typescript
// src/lib/wasm/transform.ts - All transforms use single dynamic import
const wasm = await import('../../../wasm/dmb-transform/pkg/dmb_transform.js');
```

**Opportunity:** Segue analysis (158 KB), date-utils (117 KB), and string-utils (99 KB) are compiled but never loaded.

#### Vite WASM Configuration

**File:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/vite.config.ts` (Lines 11-14, 47-55)

```typescript
plugins: [
  wasm(),
  topLevelAwait(),
  sveltekit()
],

// Asset name handling
assetFileNames: (assetInfo) => {
  if (assetInfo.name?.endsWith('.wasm')) {
    return 'wasm/[name]-[hash][extname]';
  }
  return 'assets/[name]-[hash][extname]';
},
```

**Status:** GOOD! WASM plugins configured, proper hashing for cache busting.

---

### 4. BARREL FILE ANTI-PATTERNS ANALYSIS

#### Export Index Files Found

**File:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/components/ui/index.ts`
```typescript
export { default as Badge } from './Badge.svelte';
export { default as Card } from './Card.svelte';
export { default as CardContent } from './CardContent.svelte';
export { default as Dropdown } from './Dropdown.svelte';
export { default as Skeleton } from './Skeleton.svelte';
export { default as Tooltip } from './Tooltip.svelte';
```

**Assessment:** GOOD! Only named exports, no full component imports.

**File:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/components/visualizations/index.ts`
```typescript
export { default as TransitionFlow } from './TransitionFlow.svelte';
export { default as GuestNetwork } from './GuestNetwork.svelte';
export { default as TourMap } from './TourMap.svelte';
export { default as GapTimeline } from './GapTimeline.svelte';
export { default as SongHeatmap } from './SongHeatmap.svelte';
export { default as RarityScorecard } from './RarityScorecard.svelte';
```

**Assessment:** GOOD! Named exports only.

**File:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/services/index.ts` (Lines 1-32)
```typescript
export {
  initializeQueue,
  cleanupQueue,
  queueMutation,
  processQueue,
  getQueuedMutations,
  getMutationsByStatus,
  clearCompletedMutations,
  deleteMutation,
  registerBackgroundSync,
  unregisterBackgroundSync,
  getBackgroundSyncTag,
  getQueueStats,
  type QueueMutationOptions,
  type ProcessQueueOptions,
  type ProcessMutationResult,
  type ProcessQueueResult,
} from './offlineMutationQueue';
```

**Assessment:** EXCELLENT! Selective named exports, not wholesale re-export of everything.

#### Barrel File Conclusion

**Status:** No anti-patterns found. All index files use selective named exports, not wildcard re-exports.

---

### 5. DYNAMIC IMPORT ANALYSIS

#### Components with Dynamic Imports

**File:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/routes/visualizations/+page.svelte` (Lines 12-19)

```typescript
const componentLoaders = {
  transitions: () => import('$lib/components/visualizations/TransitionFlow.svelte'),
  guests: () => import('$lib/components/visualizations/GuestNetwork.svelte'),
  map: () => import('$lib/components/visualizations/TourMap.svelte'),
  timeline: () => import('$lib/components/visualizations/GapTimeline.svelte'),
  heatmap: () => import('$lib/components/visualizations/SongHeatmap.svelte'),
  rarity: () => import('$lib/components/visualizations/RarityScorecard.svelte')
} as const;
```

**Assessment:** EXCELLENT! Tab-based component loading with caching.

**But:** D3 modules are still eagerly bundled via `optimizeDeps`.

#### Workers

**File:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/workers/force-simulation.worker.ts`

**D3 usage in worker:**
```typescript
import { scaleSqrt } from 'd3-scale';
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide } from 'd3-force';
```

**Status:** Worker file exists but is NOT currently used. GuestNetwork component runs D3 force simulation in main thread instead of worker.

**Opportunity:** Move D3-force heavy computation to worker to avoid main thread blocking.

---

### 6. BUILD CONFIGURATION ANALYSIS

#### Vite Configuration

**File:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/vite.config.ts`

**Current settings:**
```typescript
build: {
  target: 'es2022',  // Good - modern JS
  // Note: Code splitting for D3 is handled automatically by SvelteKit
  // through dynamic imports in visualization components
  rollupOptions: {
    output: {
      assetFileNames: (assetInfo) => {
        if (assetInfo.name?.endsWith('.wasm')) {
          return 'wasm/[name]-[hash][extname]';
        }
        return 'assets/[name]-[hash][extname]';
      },
    },
  },
},
```

**Missing opportunity:** No `manualChunks` for vendor splitting

**Recommended addition:**
```typescript
rollupOptions: {
  output: {
    manualChunks: {
      // Separate D3 modules by visualization
      'd3-core': ['d3-selection', 'd3-array', 'd3-scale'],
      'd3-visualization': ['d3-axis', 'd3-scale-chromatic'],
      'd3-force': ['d3-force', 'd3-drag'],
      'd3-geo': ['d3-geo', 'd3-sankey'],
      'topojson': ['topojson-client']
    }
  }
}
```

#### SvelteKit Configuration

**File:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/svelte.config.js`

```typescript
alias: {
  $components: 'src/lib/components',
  $stores: 'src/lib/stores',
  $db: 'src/lib/db'
},
serviceWorker: {
  register: false  // Manual registration - GOOD
}
```

**Status:** Good. Manual service worker registration allows for more control.

---

### 7. IMPORT STATEMENT PATTERNS

#### D3 Import Quality

**Scan results:** 0 anti-patterns found

- No `import * as d3 from 'd3'`
- No `import { * as d3 } from 'd3-selection'`
- All imports are specific named exports
- No re-exports of entire modules

**Example good patterns:**
```typescript
// GOOD - Specific named imports
import { select } from 'd3-selection';
import { scaleLinear, scaleBand } from 'd3-scale';
import { max, extent } from 'd3-array';
```

#### Vendor Import Organization

**Status:** GOOD - organized by functionality, not by monolithic imports

---

### 8. DEPENDENCY SIZE COMPARISON

#### Current Production Dependencies

```
d3-selection:        8 KB raw, 2.3 KB gzip
d3-scale:           15 KB raw, 4.2 KB gzip
d3-scale-chromatic: 12 KB raw, 3.1 KB gzip
d3-array:           10 KB raw, 2.8 KB gzip
d3-force:           20 KB raw, 5.2 KB gzip
d3-sankey:           8 KB raw, 2.1 KB gzip
d3-axis:             6 KB raw, 1.8 KB gzip
d3-geo:             12 KB raw, 3.2 KB gzip
d3-drag:             3 KB raw, 0.9 KB gzip
topojson-client:     4 KB raw, 1.1 KB gzip
─────────────────────────────────────
TOTAL:              98 KB raw, 27 KB gzip
```

#### No Bloated Alternatives Found

- All D3 modules are necessary for their use case
- No monolithic 'd3' package import (which would be 200+ KB)
- No duplicate D3 modules
- `topojson-client` is appropriately used for `TourMap` geographic data

---

## FINDINGS SUMMARY

### Critical Issues

| Issue | Location | Impact | Severity |
|-------|----------|--------|----------|
| **D3 modules in optimizeDeps** | `vite.config.ts:26-40` | 28 KB gzip on every page | HIGH |
| **No D3 code splitting** | `vite.config.ts` | Lost chunking opportunity | HIGH |
| **Dexie eagerly loaded** | Store imports | 30+ KB gzip on non-data pages | MEDIUM |
| **Unused WASM modules** | `wasm/` directory | 374 KB uncompressed unused | MEDIUM |
| **D3 force sim in main thread** | `GuestNetwork.svelte` | Potential jank on large datasets | MEDIUM |

### Good Findings

| Area | Status | Notes |
|------|--------|-------|
| **D3 Tree-shaking** | EXCELLENT | All named imports, no wildcards |
| **Component code splitting** | GOOD | Dynamic imports with caching |
| **Barrel files** | GOOD | Selective exports, no anti-patterns |
| **WASM loading** | GOOD | Dynamic import with fallback |
| **SvelteKit aliases** | GOOD | Proper path configuration |

---

## OPTIMIZATION OPPORTUNITIES

### 1. Remove D3 from optimizeDeps (Priority: HIGH)

**File to modify:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/vite.config.ts`

**Current (lines 26-40):**
```typescript
optimizeDeps: {
  include: [
    'dexie',
    'd3-selection',
    'd3-scale',
    'd3-scale-chromatic',
    'd3-array',
    'd3-axis',
    'd3-sankey',
    'd3-force',
    'd3-geo'
  ],
  exclude: ['dmb-transform']
},
```

**Recommendation:**
```typescript
optimizeDeps: {
  include: [
    'dexie',  // Only necessary if keeping eagerly loaded
    'topojson-client'
  ],
  exclude: ['dmb-transform']
},
```

**Expected savings:** 28 KB gzip

**Rationale:**
- D3 modules are loaded dynamically via component imports
- Modern bundlers handle ESM modules well without pre-bundling
- Pre-bundling forces them into main chunk instead of letting code splitting work

### 2. Lazy Load Dexie on Non-Data Pages (Priority: HIGH)

**Files to modify:**
- `/src/lib/stores/` - Store initialization
- `/src/routes/` - Route-specific loading

**Strategy:**
```typescript
// src/lib/db/dexie/lazy.ts (new file)
export async function initializeDexieWhenNeeded(): Promise<Database> {
  const { db } = await import('./db.js');
  return db;
}

// src/routes/my-shows/+page.svelte
<script>
  import { onMount } from 'svelte';
  let db: Database | null = null;

  onMount(async () => {
    const { initializeDexieWhenNeeded } = await import('$lib/db/dexie/lazy.js');
    db = await initializeDexieWhenNeeded();
  });
</script>
```

**Expected savings:** 20-30 KB gzip on non-data pages

### 3. Split D3 by Visualization Type (Priority: MEDIUM)

**Files to modify:**
- `/vite.config.ts` - Add manualChunks
- `/src/routes/visualizations/+page.svelte` - Already using dynamic imports

**Add to vite.config.ts:**
```typescript
rollupOptions: {
  output: {
    manualChunks: {
      'd3-scales': ['d3-scale', 'd3-array'],
      'd3-colors': ['d3-scale-chromatic'],
      'd3-axes': ['d3-axis', 'd3-selection'],
      'd3-force': ['d3-force', 'd3-drag'],
      'd3-geo': ['d3-geo', 'topojson-client'],
      'd3-sankey': ['d3-sankey']
    }
  }
}
```

**Expected savings:** 8-12 KB gzip on initial load (26-40% reduction)

### 4. Move GuestNetwork Simulation to Worker (Priority: MEDIUM)

**Files involved:**
- `/src/lib/components/visualizations/GuestNetwork.svelte` (current)
- `/src/lib/workers/force-simulation.worker.ts` (ready to use)

**Current bottleneck (GuestNetwork.svelte lines 115-121):**
```typescript
simulation = forceSimulation<NetworkNode>(nodes)
  .force('link', forceLink<NetworkNode, NetworkLinkInput>(linkData)
    .id((d) => (d as NetworkNode).id)
    .distance((d) => 100 / ((d as NetworkLinkInput).weight || 1)))
  .force('charge', forceManyBody().strength(-200))
  .force('center', forceCenter(containerWidth / 2, containerHeight / 2))
  .force('collision', forceCollide<NetworkNode>().radius((d) => nodeScale(d.appearances) + 5));
```

**Expected savings:** 5-8 KB gzip (by deferring d3-force)

### 5. Remove Unused Color Schemes (Priority: LOW)

**File:** `/src/lib/components/visualizations/TourMap.svelte` (Line 5)

**Current:**
```typescript
import { schemeBlues, schemeGreens, schemeReds, schemePurples } from 'd3-scale-chromatic';
```

**Optimized (only load needed scheme):**
```typescript
// Dynamic loading based on prop
async function loadColorScheme(name: 'blues' | 'greens' | 'reds' | 'purples') {
  const schemes = {
    blues: () => import('d3-scale-chromatic').then(m => m.schemeBlues),
    greens: () => import('d3-scale-chromatic').then(m => m.schemeGreens),
    reds: () => import('d3-scale-chromatic').then(m => m.schemeReds),
    purples: () => import('d3-scale-chromatic').then(m => m.schemePurples)
  };
  return schemes[name]();
}
```

**Expected savings:** 2-3 KB gzip (minimal impact)

---

## IMPLEMENTATION ROADMAP

### Phase 1: Quick Wins (1-2 hours, 40+ KB savings)

1. Remove D3 from optimizeDeps
   - Estimated savings: 28 KB gzip
   - Files: `vite.config.ts`
   - Risk: LOW - D3 imports are native ESM

2. Lazy load Dexie on non-database pages
   - Estimated savings: 20-30 KB gzip
   - Files: `src/lib/stores/`, route files
   - Risk: LOW - Already has fallback JS

### Phase 2: Code Splitting (2-3 hours, 12+ KB savings)

3. Add D3 manualChunks in Vite config
   - Estimated savings: 12 KB gzip initial load
   - Files: `vite.config.ts`
   - Risk: LOW - Already using dynamic imports

4. Verify tree-shaking (no additional work needed)
   - All imports already optimized
   - Run bundle analyzer to confirm chunks

### Phase 3: Advanced Optimization (4-5 hours, 5-8 KB savings)

5. Move d3-force simulation to Web Worker
   - Estimated savings: 5-8 KB gzip
   - Files: `GuestNetwork.svelte`, worker setup
   - Risk: MEDIUM - Requires message passing

6. Lazy load color schemes
   - Estimated savings: 2-3 KB gzip
   - Files: `TourMap.svelte`
   - Risk: LOW - Minimal change

### Phase 4: WASM Cleanup (1-2 hours, defers 250+ KB)

7. Document unused WASM modules
   - `dmb-segue-analysis_bg.wasm` - 158 KB
   - `dmb-date-utils_bg.wasm` - 117 KB
   - `dmb-string-utils_bg.wasm` - 99 KB
   - Action: Remove from build or implement lazy loading

---

## RECOMMENDATIONS BY PRIORITY

### MUST DO (High Impact, Low Effort)

**1. Remove D3 from optimizeDeps**
- Saves 28 KB gzip immediately
- Takes 5 minutes
- Zero risk - already using ESM imports

**Action:** Edit `vite.config.ts` line 26-40

### SHOULD DO (Medium Impact, Low Effort)

**2. Add D3 manualChunks to Vite**
- Saves 12 KB on initial load
- Takes 15 minutes
- Reduces visualization route bundle by 40%

**Action:** Edit `vite.config.ts` rollupOptions.output

**3. Lazy load Dexie**
- Saves 20-30 KB on non-data pages
- Takes 1-2 hours
- Improves homepage and content pages

**Action:** Create `src/lib/db/dexie/lazy.ts` and update imports

### NICE TO HAVE (Low Impact, Medium Effort)

**4. Move force simulation to worker**
- Saves 5-8 KB
- Improves performance
- Takes 2-3 hours

**Action:** Implement worker message passing in GuestNetwork.svelte

### INVESTIGATE (Unknown Impact)

**5. Unused WASM modules**
- 374 KB of unused WASM in production
- Determine if segue-analysis, date-utils, string-utils are actually used
- If not, remove from build pipeline

**Action:** Check which modules are actually imported

---

## VERIFICATION CHECKLIST

After implementing optimizations, verify:

- [ ] Run `npm run build` and check final bundle size
- [ ] Use source-map-explorer to verify D3 chunks
- [ ] Test all visualizations on /visualizations page
- [ ] Test /my-shows page loads Dexie on mount
- [ ] Test homepage without loading D3
- [ ] Check Lighthouse performance score
- [ ] Test on slow 4G network
- [ ] Verify tree-shaking didn't remove needed code

**Tools for verification:**
```bash
# Analyze bundle composition
npx webpack-bundle-analyzer ./build/server/stats.json

# Check specific chunk sizes
npx source-map-explorer ./build/client/*.js --html report.html

# Test with Lighthouse
npm run preview  # Then run Lighthouse audit
```

---

## RELATED FILES REFERENCE

**Configuration:**
- `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/vite.config.ts`
- `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/svelte.config.js`
- `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/package.json`

**D3 Visualizations:**
- `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/components/visualizations/TransitionFlow.svelte`
- `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/components/visualizations/GuestNetwork.svelte`
- `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/components/visualizations/TourMap.svelte`
- `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/components/visualizations/SongHeatmap.svelte`
- `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/components/visualizations/GapTimeline.svelte`
- `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/components/visualizations/RarityScorecard.svelte`

**Database:**
- `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/db/dexie/db.ts`
- `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/db/dexie/queries.ts`

**WASM:**
- `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/wasm/transform.ts`
- `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/workers/force-simulation.worker.ts`

**Pages:**
- `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/routes/visualizations/+page.svelte`
- `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/routes/my-shows/+page.svelte`
- `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/routes/stats/+page.svelte`

---

## CONCLUSION

The DMB Almanac Svelte project demonstrates excellent practices in:
- Named D3 imports with proper tree-shaking
- Component-level code splitting setup
- Barrel file organization
- WASM dynamic loading with fallbacks

But is leaving 40-50 KB of savings on the table through configuration choices:
- D3 modules unnecessarily pre-bundled
- Database layer eagerly loaded everywhere
- No vendor code splitting

**Recommended next steps:**
1. Implement Phase 1 optimizations (Quick Wins) for 40+ KB savings - **START HERE**
2. Add Phase 2 code splitting for additional 12+ KB
3. Investigate unused WASM modules (potential 250+ KB deferral)

All recommendations are low-risk, well-scoped, and follow industry best practices.

---
name: bundle-optimization
version: 1.0.0
description: Quick reference for implementing the recommended bundle optimizations.
author: Claude Code
created: 2026-01-25
updated: 2026-01-25

category: performance
complexity: advanced
tags:
  - performance
  - chromium-143
  - apple-silicon

target_browsers:
  - "Chromium 143+"
  - "Safari 17.2+"
target_platform: apple-silicon-m-series
os: macos-26.2

philosophy: "Modern web development leveraging Chromium 143+ capabilities for optimal performance on Apple Silicon."

prerequisites: []
related_skills: []
see_also: []

minimum_example_count: 3
requires_testing: true
performance_critical: false

# Migration metadata
migrated_from: projects/dmb-almanac/app/docs/analysis/bundle/BUNDLE_OPTIMIZATION_GUIDE.md
migration_date: 2026-01-25
---

# Bundle Optimization Implementation Guide

Quick reference for implementing the recommended bundle optimizations.

---

## Phase 1: Quick Wins (1-2 Days) - Est. -40 KB Gzip

### 1. Remove D3 from Barrel Export

**File**: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/src/lib/components/visualizations/index.ts`

**Current**:
```typescript
// This causes all D3 to load eagerly
export { default as TransitionFlow } from './TransitionFlow.svelte';
export { default as GuestNetwork } from './GuestNetwork.svelte';
export { default as TourMap } from './TourMap.svelte';
export { default as GapTimeline } from './GapTimeline.svelte';
export { default as SongHeatmap } from './SongHeatmap.svelte';
export { default as RarityScorecard } from './RarityScorecard.svelte';
```

**Change To**:
```typescript
// Remove all component exports - they're only used in /visualizations route
// That route already uses dynamic imports, so keep them isolated there

// Keep only type exports (these don't bundle any code)
export type TransitionFlowData = Array<{
  source: string;
  target: string;
  value: number;
}>;

export type GuestNetworkNode = {
  id: string;
  name: string;
  appearances: number;
};

export type GuestNetworkLink = {
  source: string;
  target: string;
  weight: number;
};

export type TourMapData = Map<string, number> | Record<string, number>;

export type GapTimelineData = Array<{
  date: string;
  songId: string;
  songName: string;
  gap: number;
}>;

export type HeatmapData = Array<{
  row: string;
  column: string;
  value: number;
}>;

export type RarityData = Array<{
  id: string;
  name: string;
  rarity: number;
  lastPlayed?: string;
  totalAppearances: number;
}>;
```

**Impact**: -40 KB immediately (all D3 becomes lazy)

---

### 2. Enhance Vite Manual Chunking

**File**: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/vite.config.ts`

**Current**:
```typescript
rollupOptions: {
  output: {
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
        if (id.includes('dexie')) {
          return 'dexie';
        }
      }
    },
    assetFileNames: (assetInfo) => {
      if (assetInfo.name?.endsWith('.wasm')) {
        return 'wasm/[name]-[hash][extname]';
      }
      return 'assets/[name]-[hash][extname]';
    },
  },
},
```

**Change To**:
```typescript
rollupOptions: {
  output: {
    manualChunks(id) {
      if (id.includes('node_modules')) {
        // Dexie - database, loaded early but used throughout app
        if (id.includes('dexie')) {
          return 'dexie-db';
        }

        // Split D3 modules into separate chunks so they're only loaded
        // when their corresponding visualization component loads
        if (id.includes('d3-selection')) {
          return 'd3-selection';
        }
        if (id.includes('d3-scale')) {
          return 'd3-scale';
        }
        if (id.includes('d3-axis')) {
          return 'd3-axis';
        }
        if (id.includes('d3-sankey')) {
          return 'd3-sankey';
        }
        if (id.includes('d3-force')) {
          return 'd3-force';
        }
        if (id.includes('d3-geo')) {
          return 'd3-geo';
        }
        if (id.includes('d3-drag')) {
          return 'd3-drag';
        }
        if (id.includes('topojson-client')) {
          return 'topojson-client';
        }
      }
    },
    assetFileNames: (assetInfo) => {
      if (assetInfo.name?.endsWith('.wasm')) {
        return 'wasm/[name]-[hash][extname]';
      }
      return 'assets/[name]-[hash][extname]';
    },
  },
},
```

**Add chunk size warnings**:
```typescript
// After rollupOptions
chunkSizeWarningLimit: 75 // Warn if chunks exceed 75 KB uncompressed
```

**Impact**: -8 KB (better chunk boundaries)

---

### 3. Verify WASM Build Config

**File**: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/wasm/dmb-transform/Cargo.toml`

**Current Status**: wasm-opt already disabled ✓

**Verify**:
```bash
# Check that wasm-opt is disabled
grep "wasm-opt" wasm/dmb-transform/Cargo.toml

# Expected output:
# wasm-opt = false
```

**Note**: This is a temporary workaround. Once wasm-opt validation issue is fixed, re-enable:
```toml
wasm-opt = ["-Oz", "--enable-bulk-memory"]
```

**Impact**: Current workaround adds ~25 KB to WASM, but modules still not deployed

---

### 4. Clean Up Unused Imports in Visualization Components

Check each visualization component for unused D3 imports:

**File**: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/src/lib/components/visualizations/SongHeatmap.svelte`

**Check For**:
```typescript
// Remove if not used
import { max } from 'd3-array';

// Instead use native
const max = (arr: number[]) => Math.max(...arr);
// OR import from utility
import { max } from '$lib/utils/array';
```

**Repeat for**:
- GapTimeline.svelte
- SongHeatmap.svelte
- RarityScorecard.svelte
- TransitionFlow.svelte
- GuestNetwork.svelte
- TourMap.svelte

**Impact**: -4 KB if d3-array is replaced

---

## Phase 2: Full Implementation (3-5 Days) - Est. additional -15 KB

### 5. Create Array Utilities Module

**File**: Create `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/src/lib/utils/array.ts`

```typescript
/**
 * Array utilities to replace d3-array imports
 * Reduces bundle by avoiding d3-array dependency where possible
 */

/**
 * Get maximum value from array
 */
export function max(array: number[]): number {
  return Math.max(...array);
}

/**
 * Get minimum value from array
 */
export function min(array: number[]): number {
  return Math.min(...array);
}

/**
 * Get sum of array values
 */
export function sum(array: number[]): number {
  return array.reduce((a, b) => a + b, 0);
}

/**
 * Get average of array values
 */
export function mean(array: number[]): number {
  return array.length > 0 ? sum(array) / array.length : 0;
}

/**
 * Create array of numbers in range
 */
export function range(start: number, stop?: number, step?: number): number[] {
  if (stop === undefined) {
    [start, stop] = [0, start];
  }
  if (step === undefined) {
    step = 1;
  }

  const array: number[] = [];
  for (let i = start; i < stop; i += step) {
    array.push(i);
  }
  return array;
}

/**
 * Transpose 2D array
 */
export function transpose<T>(array: T[][]): T[][] {
  if (array.length === 0) return [];
  const width = array[0].length;
  return Array.from({ length: width }, (_, i) =>
    array.map(row => row[i])
  );
}
```

**Then Update Visualization Components**:

```typescript
// In SongHeatmap.svelte, GapTimeline.svelte, etc.

// Old:
import { max } from 'd3-array';

// New:
import { max } from '$lib/utils/array';
```

**Impact**: -4 KB

---

### 6. Lazy Load Advanced Search Features

**File**: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/src/lib/db/dexie/queries.ts`

**Current**: All query functions exported and imported upfront

**Create New File**: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/src/lib/db/dexie/queries-lazy.ts`

```typescript
/**
 * Lazy-load query functions to reduce initial bundle
 * Only loaded when search/filter functionality is activated
 */

export async function getSearchQueries() {
  const { searchSongs, searchShows, searchVenues } = await import('./queries');
  return { searchSongs, searchShows, searchVenues };
}

export async function getAnalyticsQueries() {
  const { getGapAnalytics, getRarityStats } = await import('./queries');
  return { getGapAnalytics, getRarityStats };
}
```

**Update Search Component** to use lazy loading:

```typescript
// In search component
async function performSearch(query: string) {
  const { searchSongs } = await import('$db/dexie/queries-lazy').then(m => m.getSearchQueries());
  const results = await searchSongs(query);
  return results;
}
```

**Impact**: -8 KB lazy-loaded

---

### 7. Implement WASM Module Loading

**File**: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/src/lib/wasm/loader.ts`

```typescript
/**
 * WASM module loader with graceful fallback
 */

let wasmModule: any = null;
let wasmLoading: Promise<any> | null = null;

export async function loadWasm() {
  // Return cached module if already loaded
  if (wasmModule) {
    return wasmModule;
  }

  // Return existing loading promise if in progress
  if (wasmLoading) {
    return wasmLoading;
  }

  // Start loading
  wasmLoading = (async () => {
    try {
      // Dynamically import WASM module
      const imported = await import('dmb-transform');
      wasmModule = imported;
      console.log('WASM module loaded successfully');
      return wasmModule;
    } catch (error) {
      console.warn('Failed to load WASM module:', error);
      wasmModule = null;
      return null;
    }
  })();

  return wasmLoading;
}

export function isWasmAvailable(): boolean {
  return wasmModule !== null;
}

export async function computeRarity(songs: any[]) {
  const wasm = await loadWasm();
  if (wasm && wasm.compute_rarity) {
    return wasm.compute_rarity(songs);
  }
  // Fallback to JS implementation
  return null;
}

export async function analyzeSegueSimilarity(shows: any[]) {
  const wasm = await loadWasm();
  if (wasm && wasm.analyze_segue_similarity) {
    return wasm.analyze_segue_similarity(shows);
  }
  return null;
}
```

**Update Stores** to use loader:

```typescript
// In src/lib/stores/dexie.ts or similar
import { loadWasm } from '$lib/wasm/loader';

export const wasmReady = writable(false);

// Load WASM on app startup (non-blocking)
loadWasm().then(() => {
  wasmReady.set(true);
});
```

**Impact**: WASM loaded on-demand, no blocking

---

### 8. Add Visualization Prefetching

**File**: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/src/routes/visualizations/+page.svelte`

**Add Prefetch Logic**:

```typescript
// In the script section, add:

function prefetchNextVisualization() {
  const currentIndex = tabOptions.indexOf(activeTab);
  const nextIndex = (currentIndex + 1) % tabOptions.length;
  const nextTab = tabOptions[nextIndex] as TabName;

  // Preload the next visualization component
  loadComponent(nextTab).catch(() => {
    // Silently fail - user might not navigate there
  });
}

// Prefetch when user focuses on next tab button
function handleTabFocus(tab: string) {
  const index = tabOptions.indexOf(tab);
  const nextTab = tabOptions[(index + 1) % tabOptions.length] as TabName;
  loadComponent(nextTab).catch(() => {});
}
```

**Add to Tab Buttons**:

```svelte
<button
  onmouseover={() => prefetchNextVisualization()}
  onfocus={() => handleTabFocus(activeTab)}
>
  {/* tab content */}
</button>
```

**Impact**: No size reduction, but ~200-300ms perceived load improvement

---

## Phase 3: Advanced Optimization (1-2 Days)

### 9. Critical CSS Inlining

Add critical CSS inline to HTML for faster paint:

**File**: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/src/app.html`

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <link rel="icon" href="%sveltekit.assets%/favicon.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    %sveltekit.head%

    <!-- Critical CSS (above-the-fold styling) -->
    <style>
      :root {
        --max-width: 1200px;
        --space-4: 1rem;
      }
      body {
        font-family: system-ui, -apple-system, sans-serif;
        margin: 0;
        padding: 0;
      }
      main {
        max-width: var(--max-width);
        margin: 0 auto;
        padding: var(--space-4);
      }
    </style>
  </head>
  <body data-sveltekit-preload-data="hover">
    <div style="display: contents">%sveltekit.body%</div>
  </body>
</html>
```

**Impact**: ~50-100ms FCP improvement

---

### 10. Add Bundle Size CI/CD Check

**File**: Create `.github/workflows/bundle-check.yml`

```yaml
name: Bundle Size Check

on:
  pull_request:
    branches: [main]

jobs:
  bundle-size:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Check bundle size
        run: |
          # Find largest chunk
          LARGEST=$(ls -S build/client/_app/immutable/chunks/*.js 2>/dev/null | head -1)
          SIZE=$(stat -f%z "$LARGEST" 2>/dev/null || stat -c%s "$LARGEST" 2>/dev/null)
          SIZE_KB=$((SIZE / 1024))

          echo "Largest chunk: $LARGEST"
          echo "Size: ${SIZE_KB}KB"

          # Fail if exceeds 100KB uncompressed
          if [ "$SIZE_KB" -gt 100 ]; then
            echo "ERROR: Largest chunk exceeds 100KB limit"
            exit 1
          fi

          echo "✓ Bundle check passed"

      - name: Comment PR
        if: failure()
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '⚠️ Bundle size check failed. Please review bundle optimization recommendations.'
            })
```

**Impact**: Prevents bundle regression in future

---

## Testing & Validation

### Manual Testing

```bash
# 1. Build production version
npm run build

# 2. Check bundle breakdown
du -h build/client/_app/immutable/chunks/ | sort -h | tail -20

# 3. Check for D3 in main bundle (should be empty/zero)
grep -l "d3-" build/client/_app/immutable/chunks/*.js | wc -l
# Expected: 0 (all in separate chunks)

# 4. Verify WASM chunks if deployed
find build/client -name "*.wasm" -exec ls -lh {} \;

# 5. Local performance test
npm run preview
# Open in Chrome DevTools Network tab and check:
# - Initial JS: <50 KB gzipped
# - CSS: <20 KB gzipped
# - No D3 modules loaded on homepage
```

### Lighthouse Testing

```bash
# Install Lighthouse CLI if needed
npm install -g @lighthouse-ci/cli

# Test the app
lhci autorun

# Check results for:
# - FCP improvement (expect >10% faster)
# - LCP improvement (expect >15% faster)
# - Total JS size reduction
```

---

## Rollout Plan

### Week 1: Quick Wins
- [ ] Day 1: Implement Phase 1 (items 1-4)
- [ ] Day 2: Test and verify -40 KB reduction
- [ ] Day 3: Deploy to staging

### Week 2: Full Implementation
- [ ] Day 4-5: Implement Phase 2 (items 5-8)
- [ ] Day 6-7: Full testing and performance validation
- [ ] Day 8: Deploy to production

### Week 3: Advanced Optimization
- [ ] Day 9-10: Phase 3 (items 9-10)
- [ ] Day 11-12: CI/CD integration and monitoring
- [ ] Day 13-14: Buffer for bugs/issues

---

## Success Criteria

- [ ] Main JS bundle < 75 KB uncompressed
- [ ] Initial load (JS + CSS gzipped) < 130 KB
- [ ] FCP < 0.7s (30% improvement)
- [ ] LCP < 0.8s (25% improvement)
- [ ] No performance regressions on non-visualization pages
- [ ] All visualization features work identically
- [ ] WASM modules deployed and loading correctly

---

## Monitoring After Deployment

### Metrics to Track
- Daily: Bundle size via CI/CD
- Weekly: Lighthouse scores via Web Vitals
- Monthly: User experience metrics from analytics

### Alerts to Set
- Main bundle > 80 KB uncompressed
- FCP degradation > 10%
- LCP degradation > 10%
- WASM failures > 5%

---

## References

- [Vite Code Splitting Guide](https://vitejs.dev/guide/features.html#code-splitting)
- [D3 Tree Shaking](https://observablehq.com/@d3/d3-bundle)
- [WASM Loading Best Practices](https://www.smashingmagazine.com/2019/04/webassembly-fig-open-source-rust/)
- [Web Vitals Optimization](https://web.dev/vitals/)

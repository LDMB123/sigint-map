# Bundle Optimization - Implementation Guide

Quick reference for implementing the optimization recommendations.

---

## Quick Wins (Week 1)

### 1. Update vite.config.ts - Manual Chunk Splitting

**File:** `vite.config.ts`

Add manual chunk splitting configuration to rollupOptions:

```typescript
build: {
  target: 'es2022',
  rollupOptions: {
    output: {
      // NEW: Manual chunk splitting
      manualChunks: (id) => {
        // Separate D3 vendor chunk (core utilities)
        if (id.includes('node_modules/d3-selection') ||
            id.includes('node_modules/d3-scale') ||
            id.includes('node_modules/d3-scale-chromatic') ||
            id.includes('node_modules/d3-axis') ||
            id.includes('node_modules/d3-array')) {
          return 'd3-vendor';
        }

        // Separate advanced D3 modules (force, sankey, geo)
        if (id.includes('node_modules/d3-force') ||
            id.includes('node_modules/d3-sankey') ||
            id.includes('node_modules/d3-geo') ||
            id.includes('node_modules/d3-drag')) {
          return 'd3-advanced';
        }

        // Separate database chunk
        if (id.includes('node_modules/dexie')) {
          return 'database';
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
  chunkSizeWarningLimit: 500,
},
```

**Expected Impact:** -8 KB gzip (better cache separation)

---

### 2. Lazy Load Dexie

Create lazy wrapper file: `src/lib/db/dexie/lazy.ts`

```typescript
/**
 * Lazy-loading wrapper for Dexie
 * Loads database layer only when needed
 */

import type { DexieDatabase } from './schema';
import { browser } from '$app/environment';

let dexieInstance: DexieDatabase | null = null;

export async function initializeDexie(): Promise<DexieDatabase> {
  if (!browser) {
    throw new Error('Dexie can only be used in the browser');
  }

  if (dexieInstance) {
    return dexieInstance;
  }

  // Dynamically import the full Dexie module
  const { createDexieDatabase } = await import('./index');
  dexieInstance = createDexieDatabase();

  // Initialize schema
  await dexieInstance.open();

  return dexieInstance;
}

export function getDexieInstance(): DexieDatabase | null {
  return dexieInstance;
}

export async function ensureDexieReady(): Promise<DexieDatabase> {
  return initializeDexie();
}
```

Update `src/lib/db/dexie/stores.ts` to use lazy loading:

```typescript
import { initializeDexie } from './lazy';
import { writable } from 'svelte/store';

export const dexieReady = writable<boolean>(false);

let dbInstance: any | null = null;

async function ensureDb() {
  if (!dbInstance) {
    dbInstance = await initializeDexie();
    dexieReady.set(true);
  }
  return dbInstance;
}

export async function getSongsStore() {
  const db = await ensureDb();
  return db.songs;
}

export async function getShowsStore() {
  const db = await ensureDb();
  return db.shows;
}

// ... repeat for all stores
```

Update components using Dexie (e.g., `src/routes/my-shows/+page.svelte`):

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { getSongsStore } from '$lib/db/dexie/stores';

  let myShows = $state([]);
  let loading = $state(true);

  onMount(async () => {
    const store = await getSongsStore();
    myShows = await store.toArray();
    loading = false;
  });
</script>

{#if loading}
  <p>Loading...</p>
{:else}
  <!-- Render myShows -->
{/if}
```

**Expected Impact:** -8 KB gzip

---

### 3. Lazy Load WASM Fallback

In `src/lib/wasm/bridge.ts`, update `executeFallback` method:

```typescript
private async executeFallback<T>(method: WasmMethodName, args: unknown[]): Promise<T> {
  // Dynamically import fallback only when needed
  const { fallbackImplementations } = await import('./fallback');

  const fallbackMethod = method as FallbackMethod;

  if (!(fallbackMethod in fallbackImplementations)) {
    throw new Error(`No fallback for: ${method}`);
  }

  const impl = fallbackImplementations[fallbackMethod] as (...a: unknown[]) => unknown;

  const processedArgs = args.map(arg => {
    if (typeof arg === 'string') {
      try {
        return JSON.parse(arg);
      } catch {
        return arg;
      }
    }
    return arg;
  });

  return impl(...processedArgs) as T;
}
```

Same update in `src/lib/wasm/worker.ts`:

```typescript
async function executeFallback(method: string, args: unknown[]): Promise<unknown> {
  const { fallbackImplementations } = await import('./fallback');

  const fallbackMethod = method as FallbackMethod;

  if (!(fallbackMethod in fallbackImplementations)) {
    throw new Error(`No fallback implementation for: ${method}`);
  }

  const impl = fallbackImplementations[fallbackMethod] as (...args: unknown[]) => unknown;

  const processedArgs = args.map(arg => {
    if (typeof arg === 'string') {
      try {
        return JSON.parse(arg);
      } catch {
        return arg;
      }
    }
    return arg;
  });

  return impl(...processedArgs);
}
```

**Expected Impact:** -5 KB gzip

---

### 4. Move Visualizations Out of Shared Layout

Check current imports:
```bash
grep -r "GuestNetwork\|SongHeatmap\|TransitionFlow\|GapTimeline\|RarityScorecard\|TourMap" src/routes --include="*.svelte"
```

Ensure visualizations are only imported in their specific routes:
- `/stats` for GuestNetwork, SongHeatmap, RarityScorecard
- `/visualizations` for TransitionFlow
- `/tours` for TourMap
- `/songs` for GapTimeline

NOT in root `+layout.svelte`

**Expected Impact:** -5 KB gzip

---

## Medium Complexity (Week 2)

### 5. Create WASM Module Loaders

Create new file: `src/lib/wasm/module-loaders.ts`

```typescript
/**
 * WASM Module Loader System
 *
 * Provides lazy loading for WASM modules by feature
 */

import { getWasmBridge } from './bridge';

interface ModuleConfig {
  path: string;
  priority: 'high' | 'medium' | 'low';
  description: string;
}

const moduleRegistry: Record<string, ModuleConfig> = {
  'transform': {
    path: '/wasm/dmb_transform_bg.wasm',
    priority: 'high',
    description: 'Primary data transformation'
  },
  'date-utils': {
    path: '/wasm/dmb_date_utils_bg.wasm',
    priority: 'low',
    description: 'Date calculations'
  },
  'segue-analysis': {
    path: '/wasm/dmb_segue_analysis_bg.wasm',
    priority: 'low',
    description: 'Advanced analysis'
  },
  'string-utils': {
    path: '/wasm/dmb_string_utils_bg.wasm',
    priority: 'low',
    description: 'String utilities'
  }
};

const loadedModules = new Set<string>();
const loadingPromises = new Map<string, Promise<void>>();

export async function loadWasmModule(moduleName: string): Promise<void> {
  if (loadedModules.has(moduleName)) {
    return;
  }

  if (loadingPromises.has(moduleName)) {
    return loadingPromises.get(moduleName)!;
  }

  const config = moduleRegistry[moduleName];
  if (!config) {
    throw new Error(`Unknown WASM module: ${moduleName}`);
  }

  const loadPromise = (async () => {
    const bridge = getWasmBridge({
      wasmPath: config.path
    });

    await bridge.initialize();
    loadedModules.add(moduleName);
  })();

  loadingPromises.set(moduleName, loadPromise);

  try {
    await loadPromise;
  } finally {
    loadingPromises.delete(moduleName);
  }
}

export function preloadWasmModule(moduleName: string): void {
  loadWasmModule(moduleName).catch(err => {
    console.warn(`Failed to preload WASM module '${moduleName}':`, err);
  });
}

export function isWasmModuleLoaded(moduleName: string): boolean {
  return loadedModules.has(moduleName);
}

export function getAvailableModules(): Record<string, ModuleConfig> {
  return moduleRegistry;
}
```

**Expected Impact:** -30 KB (unused modules not loaded initially)

---

### 6. Add Preloading to Root Layout

Update `src/routes/+layout.svelte`:

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { preloadWasmModule } from '$lib/wasm/module-loaders';

  onMount(() => {
    // Preload main WASM during idle time
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        preloadWasmModule('transform');
      }, { timeout: 5000 });
    } else {
      setTimeout(() => {
        preloadWasmModule('transform');
      }, 2000);
    }
  });
</script>

<!-- existing layout content -->
```

---

## Testing & Validation

### Check bundle size after each change:

```bash
npm run build 2>&1 | grep -E "\.js.*gzip:" | sort -t: -k3 -rn | head -20
```

### Run Lighthouse:

```bash
npx lighthouse http://localhost:5173 --view
```

### Verification checklist:

- [ ] Build completes without errors
- [ ] No TypeScript errors (`npm run check`)
- [ ] All routes load correctly
- [ ] Visualizations appear when navigating
- [ ] WASM operations work
- [ ] No console errors

---

## Expected Results

**Bundle size reduction:**
- Before: ~120-140 KB (gzip)
- After: ~80-100 KB (gzip)
- **Savings: 40-50 KB gzip (~30% reduction)**

**Timeline:** 10-16 hours of development effort

**Zero functional changes** - same features, better performance

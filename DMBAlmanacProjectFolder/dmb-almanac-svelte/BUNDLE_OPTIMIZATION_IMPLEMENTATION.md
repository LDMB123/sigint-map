# Bundle Optimization Implementation Guide
## DMB Almanac SvelteKit PWA

Quick reference for implementing the bundle optimizations identified in `BUNDLE_OPTIMIZATION_REPORT.md`.

---

## Quick Start: Priority Order

1. **CRITICAL** - Investigate WASM lazy-loading (2-3 hours)
2. **HIGH** - Replace Zod with Valibot (2-3 hours)
3. **HIGH** - Code-split Dexie (3-4 hours)
4. **MEDIUM** - Tree-shaking audit (3-4 hours)
5. **MEDIUM** - Setup bundle analyzer (2 hours)

---

## Implementation 1: Replace Zod with Valibot

### Step 1: Install Valibot
```bash
npm install valibot
npm uninstall zod
```

### Step 2: Identify Zod Usage
**File:** `/src/lib/db/dexie/sync.ts`

```bash
grep -n "from 'zod'" /src/lib/db/dexie/sync.ts
```

### Step 3: Replace Schema Definition

**Before:**
```typescript
import { z } from 'zod';

export const SyncMetaSchema = z.object({
  id: z.string().uuid(),
  timestamp: z.number().min(0),
  status: z.enum(['pending', 'synced', 'error']),
  data: z.record(z.unknown()),
  version: z.number().default(1),
});

export type SyncMeta = z.infer<typeof SyncMetaSchema>;

export function validateSyncMeta(data: unknown): SyncMeta {
  return SyncMetaSchema.parse(data);
}
```

**After:**
```typescript
import { object, string, number, enum_, record, unknown, minValue, parse, SafeParseResult } from 'valibot';

export const SyncMetaSchema = object({
  id: string(),
  timestamp: number([minValue(0)]),
  status: enum_(['pending', 'synced', 'error']),
  data: record(unknown()),
  version: number(),
});

export type SyncMeta = typeof SyncMetaSchema.__TYPE__;

export function validateSyncMeta(data: unknown): SyncMeta {
  const result = parse(SyncMetaSchema, data);
  return result;
}
```

### Step 4: Test Changes
```bash
npm run test
npm run check
```

### Step 5: Verify Bundle Reduction
```bash
npm run build
# Check that bundle size decreased by ~8-13KB
```

**Expected Savings:** 8-13KB gzip

---

## Implementation 2: Code-Split Dexie

### Step 1: Audit Dexie Usage

**Find all Dexie imports:**
```bash
grep -r "from '\$lib/db/dexie" /src --include="*.ts" --include="*.svelte" | grep -v node_modules | head -20
```

**Files that import Dexie:**
- `/src/routes/+layout.svelte` - Layout (might be unnecessary)
- `/src/lib/stores/dexie.ts` - Store definition
- `/src/lib/db/dexie/db.ts` - Main export
- `/src/lib/db/dexie/queries.ts` - Query functions
- `/src/lib/db/dexie/sync.ts` - Sync logic
- Routes that need offline data

### Step 2: Trace Initialization

**Find where Dexie is initialized:**
```bash
grep -n "getDb\|initializeDexie" /src/routes/+layout.svelte
```

### Step 3: Make Dexie Lazy-Loaded

**File:** `/src/routes/+layout.svelte`

**Before:**
```typescript
<script>
  import { getDb } from '$lib/db/dexie/db';
  import { onMount } from 'svelte';

  onMount(async () => {
    const db = await getDb(); // Loaded immediately
  });
</script>
```

**After:**
```typescript
<script>
  import { onMount } from 'svelte';
  let db: any = null;

  onMount(async () => {
    // Only load Dexie when needed (e.g., after main content loads)
    const { getDb } = await import('$lib/db/dexie/db');
    db = await getDb();
  });
</script>
```

### Step 4: Dynamic Import in Route Layouts

**File:** `/src/routes/shows/+layout.svelte`

```typescript
<script>
  import type { LayoutData } from './$types';

  export let data: LayoutData;

  let dexieDb: any = null;

  onMount(async () => {
    // Only import Dexie on show route
    const { getDb } = await import('$lib/db/dexie/db');
    dexieDb = await getDb();
  });
</script>
```

### Step 5: Update Store Exports

**File:** `/src/lib/stores/dexie.ts`

Make store creation lazy:

```typescript
// Before: Immediate initialization
export const dexieDb = initializeDexie();

// After: Lazy initialization
let cachedDb: Database | null = null;

export async function getDexieStore() {
  if (!cachedDb) {
    cachedDb = await initializeDexie();
  }
  return cachedDb;
}
```

### Step 6: Test

```bash
npm run dev
npm run test
npm run check
```

**Expected Savings:** 10-12KB gzip from initial bundle

---

## Implementation 3: Audit WASM Lazy-Loading (CRITICAL)

### Step 1: Check Current WASM Imports

**File:** `/src/lib/wasm/bridge.ts`

```bash
grep -n "import.*wasm" /src/lib/wasm/bridge.ts | head -20
```

**Problem Location** (Line 48):
```typescript
import transformWasmUrl from '$wasm/dmb-transform/pkg/dmb_transform_bg.wasm?url';
```

This is a **static import** - it loads at compile time!

### Step 2: Identify All WASM Imports

```bash
grep -r "import.*\.wasm" /src/lib/wasm --include="*.ts" | grep -v "test\|mock"
```

### Step 3: Check Initialization Flow

**Files to audit:**
```bash
grep -n "initializeWasm\|loadWasm" /src/routes/+layout.svelte
grep -n "new Worker" /src/lib/wasm/*.ts
```

### Step 4: Verify Lazy-Loading Strategy

Create a test script to check when WASM loads:

**File:** `/src/lib/wasm/check-loading.ts`

```typescript
/**
 * Debug script to check WASM module loading
 * Add to console to verify lazy vs eager loading
 */

export function checkWasmLoading() {
  const observer = {
    apply(target: any, thisArg: any, args: any[]) {
      console.log(`[WASM] Loading module:`, args);
      return Reflect.apply(target, thisArg, args);
    }
  };

  // Log when WASM modules are imported
  console.log('[WASM] Initialization check complete');
}
```

### Step 5: Refactor to Dynamic Imports

**If currently eager-loaded, refactor to:**

```typescript
// Lazy WASM loading with caching
const wasmModuleCache = new Map<string, any>();

async function loadWasmModule(moduleName: string) {
  if (wasmModuleCache.has(moduleName)) {
    return wasmModuleCache.get(moduleName);
  }

  let module;
  switch (moduleName) {
    case 'transform':
      module = await import('$wasm/dmb-transform/pkg/dmb_transform.js');
      break;
    case 'segue-analysis':
      module = await import('$wasm/dmb-segue-analysis/pkg/dmb_segue_analysis.js');
      break;
    case 'date-utils':
      module = await import('$wasm/dmb-date-utils/pkg/dmb_date_utils.js');
      break;
    case 'force-simulation':
      module = await import('$wasm/dmb-force-simulation/pkg/dmb_force_simulation.js');
      break;
    default:
      throw new Error(`Unknown WASM module: ${moduleName}`);
  }

  wasmModuleCache.set(moduleName, module);
  return module;
}
```

### Step 6: Route-Based Loading

**File:** `/src/routes/visualizations/+page.svelte`

```typescript
<script>
  import { onMount } from 'svelte';

  onMount(async () => {
    // Only load WASM needed for visualizations
    const forceModule = await loadWasmModule('force-simulation');
    // Initialize visualization
  });
</script>
```

**Expected Savings:** 100-300KB gzip from initial bundle (investigation may reveal this is already done)

---

## Implementation 4: Tree-Shaking Verification

### Step 1: Check D3 Utils Exports

**File:** `/src/lib/utils/d3-utils.ts`

Find all exports:
```bash
grep -n "^export" /src/lib/utils/d3-utils.ts
```

Verify each is used:
```bash
# For each export, check if it's used
grep -r "arrayMax\|arrayMin\|colorSchemes\|createDataHash\|clamp" /src/lib/components --include="*.svelte"
```

### Step 2: Remove Unused Exports

If any exports are unused:

```typescript
// REMOVE if not used:
// export const createDataHash = ...
// export const clamp = ...

// ADD comments about usage:
/**
 * Used in: GuestNetwork.svelte, SongHeatmap.svelte
 */
export const arrayMax = ...
```

### Step 3: Check WASM Index Exports

**File:** `/src/lib/wasm/index.ts`

This file re-exports 496 lines of content. Audit which exports are actually used:

```bash
# Check what's imported from wasm/index.ts
grep -r "from '\$lib/wasm'" /src --include="*.ts" --include="*.svelte" | grep -v test
```

Remove any unused re-exports.

### Step 4: Verify Tree-Shaking Config

**File:** `/vite.config.ts`

Ensure these settings exist:

```typescript
build: {
  rollupOptions: {
    output: {
      // This is already configured correctly
    }
  }
}
```

### Step 5: Test Tree-Shaking

```bash
npm run build
# Check dist/index.js doesn't contain unused functions
# Use source-map-explorer for detailed analysis
npm install --save-dev source-map-explorer
npx source-map-explorer dist/index.js --html result.html
```

**Expected Savings:** 5-10KB gzip

---

## Implementation 5: Bundle Analyzer Setup

### Step 1: Install Visualizer

```bash
npm install --save-dev rollup-plugin-visualizer
```

### Step 2: Update vite.config.ts

**File:** `/vite.config.ts`

```typescript
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig(({ mode }) => ({
  plugins: [
    // ... existing plugins ...
    mode === 'analyze' && visualizer({
      open: true,
      gzipSize: true,
      brotliSize: true,
      filename: 'dist/stats.html'
    })
  ].filter(Boolean),
  // ... rest of config
}));
```

### Step 3: Add Build Script

**File:** `/package.json`

```json
{
  "scripts": {
    "build": "vite build",
    "build:analyze": "vite build --mode analyze"
  }
}
```

### Step 4: Generate Analysis

```bash
npm run build:analyze
# Opens dist/stats.html automatically
```

This shows:
- Bundle size by module
- Gzipped vs raw size
- Tree-shaking effectiveness
- Duplicate dependencies

**Expected Output:** Interactive visualization of bundle composition

---

## Implementation 6: Add CI/CD Bundle Monitoring

### Step 1: Create GitHub Actions Workflow

**File:** `.github/workflows/bundle-size.yml`

```yaml
name: Bundle Size Check

on:
  pull_request:
    branches: [main, develop]

jobs:
  bundle-size:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

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
          # Get total size
          TOTAL=$(du -sb dist | awk '{print $1}')
          # Get gzip size of main JS
          GZIP=$(gzip -c dist/index.js | wc -c)
          
          echo "Total dist: $((TOTAL / 1024))KB"
          echo "Main JS gzip: $((GZIP / 1024))KB"
          
          # Fail if over 300KB
          if [ $GZIP -gt 307200 ]; then
            echo "ERROR: Bundle too large!"
            exit 1
          fi

      - name: Comment on PR
        uses: actions/github-script@v7
        if: always()
        with:
          script: |
            const fs = require('fs');
            const distSize = require('child_process')
              .execSync('du -sb dist | awk \'{print $1}\'')
              .toString()
              .trim();
            const gzipSize = require('child_process')
              .execSync('gzip -c dist/index.js | wc -c')
              .toString()
              .trim();
            
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `Bundle Size Report\n\n- Total: ${Math.round(distSize / 1024)}KB\n- Main JS (gzip): ${Math.round(gzipSize / 1024)}KB`
            });
```

### Step 2: Commit Workflow

```bash
git add .github/workflows/bundle-size.yml
git commit -m "Add bundle size monitoring to CI/CD"
```

**Expected:** Automatic bundle size checks on every PR

---

## Verification Checklist

After implementing optimizations, verify:

- [ ] Zod → Valibot: `npm run build` shows ~8-13KB reduction
- [ ] Dexie code-split: Initial chunk smaller, data routes load Dexie
- [ ] WASM lazy: Waterfall shows WASM loading on-demand
- [ ] Tree-shaking: `source-map-explorer` shows no dead code
- [ ] Bundle analyzer: Visual shows expected chunks
- [ ] CI/CD: PR shows bundle size metrics
- [ ] Tests pass: `npm run test` all green
- [ ] Type check: `npm run check` no errors
- [ ] Dev works: `npm run dev` loads without errors
- [ ] Production builds: `npm run build && npm run preview` working

---

## Performance Validation

After optimizations, measure real-world impact:

### Lighthouse Audit

```bash
npm run build && npm run preview
# Open http://localhost:4173 in Chrome
# Run Lighthouse audit
# Verify LCP, FCP, CLS improvements
```

### Network Waterfall

Chrome DevTools > Network:
- Main JS should be smaller
- WASM modules appear later (lazy)
- Dexie loads on data routes only

### Time-to-Interactive

Should improve by 200-500ms based on bundle reduction.

---

## Rollback Plan

If any optimization causes issues:

```bash
# Revert single commit
git revert <commit-hash>

# Or revert all optimizations
git reset --hard <before-optimization-commit>
```

---

## Success Metrics

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Total bundle | ~350KB | <250KB | - |
| Main JS | ~200KB | <150KB | - |
| Initial D3 | ~2-3KB | <2KB | - |
| Dexie in initial | ~15KB | 0KB | - |
| Zod in bundle | ~13KB | 0KB | - |
| WASM on load | ~1.5MB | <200KB | - |

---

## Timeline Estimate

- **Week 1:** Zod replacement + Dexie split: 5-7 hours
- **Week 2:** WASM investigation + tree-shaking: 6-8 hours
- **Week 3:** Bundle analysis + CI/CD + testing: 5-7 hours
- **Total:** 16-22 hours of focused work

---

**Ready to start?** Begin with WASM lazy-loading investigation (2-3h, highest ROI).

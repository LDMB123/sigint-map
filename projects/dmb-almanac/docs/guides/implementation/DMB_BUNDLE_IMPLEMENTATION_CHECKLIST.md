# DMB Almanac Bundle Optimization - Implementation Checklist

**Status: READY TO IMPLEMENT**
**Complexity: LOW**
**Risk Level: LOW (all changes are backwards compatible)**

---

## Pre-Implementation

- [ ] Create feature branch: `git checkout -b perf/bundle-optimization`
- [ ] Review full bundle analysis: `BUNDLE_ANALYSIS_DMB_ALMANAC.md`
- [ ] Review quick start guide: `DMB_BUNDLE_QUICK_START.md`
- [ ] Baseline bundle: `npm run build && du -sh build/client/_app/immutable/chunks`

---

## PHASE 1: Deduplication (2KB gzip savings, 30 minutes)

### Task 1.1: Remove Duplicate formatDate from native-axis.js

**File:** `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/src/lib/utils/native-axis.js`

- [ ] Read file to locate duplicate functions (lines 353-387)
- [ ] Add import at top (after other imports):
  ```javascript
  import { formatDate as sharedFormatDate, formatNumber as sharedFormatNumber } from './format.js';
  ```
- [ ] Replace duplicate functions with re-exports:
  ```javascript
  // Re-export from shared formatter module
  export const formatDate = sharedFormatDate;
  export const formatNumber = sharedFormatNumber;
  ```
- [ ] Delete old function bodies (entire `formatDate` and `formatNumber` function definitions)
- [ ] Verify file syntax is valid: `npm run build` should complete without errors
- [ ] Test imports: `grep -r "from.*native-axis.*formatDate\|from.*native-axis.*formatNumber" src/`
- [ ] Build and check size: `npm run build && ls -lh build/client/_app/immutable/chunks/*.js | sort -rh | head -5`

**Expected Output:**
- Build completes successfully
- No syntax errors
- No import errors
- Largest chunk should be ~1KB smaller

### Task 1.2: Verify No Regressions

- [ ] Syntax check: `npm run build` (should complete)
- [ ] Check that both functions are still accessible:
  - `grep "formatDate\|formatNumber" src/lib/utils/native-axis.js` should show re-exports
- [ ] Dev server works: `npm run dev` (open browser, no errors)
- [ ] No console errors related to formatting

---

## PHASE 2: PWA Component Lazy Loading (8KB gzip savings, 1 hour)

### Task 2.1: Prepare +layout.svelte for Lazy Loading

**File:** `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/src/routes/+layout.svelte`

- [ ] Read the file to understand structure
- [ ] Locate PWA component imports (around line 27-30):
  ```
  import StorageQuotaMonitor from '$lib/components/pwa/StorageQuotaMonitor.svelte';
  import StorageQuotaDetails from '$lib/components/pwa/StorageQuotaDetails.svelte';
  import DataFreshnessIndicator from '$lib/components/pwa/DataFreshnessIndicator.svelte';
  import InstallPrompt from '$lib/components/pwa/InstallPrompt.svelte';
  import ServiceWorkerUpdateBanner from '$lib/components/pwa/ServiceWorkerUpdateBanner.svelte';
  ```

- [ ] Convert these 5 imports to lazy-loaded state variables:
  ```javascript
  // Lazy-load PWA components after initial render to reduce critical path
  let StorageQuotaMonitor = null;
  let StorageQuotaDetails = null;
  let DataFreshnessIndicator = null;
  let InstallPrompt = null;
  let ServiceWorkerUpdateBanner = null;
  ```

- [ ] Delete the original import statements (5 lines total)

### Task 2.2: Add Lazy-Load Logic to onMount

**Location:** Inside the existing `onMount()` hook in +layout.svelte

- [ ] Find the end of the `onMount()` function
- [ ] Add this code before the final return statement (or add new return for cleanup):
  ```javascript
  // PERF-037: Lazy-load PWA components after 5s idle
  // These are non-critical and can load asynchronously
  const pwaLoadTimer = setTimeout(() => {
    Promise.all([
      import('$lib/components/pwa/StorageQuotaMonitor.svelte'),
      import('$lib/components/pwa/StorageQuotaDetails.svelte'),
      import('$lib/components/pwa/DataFreshnessIndicator.svelte'),
      import('$lib/components/pwa/InstallPrompt.svelte'),
      import('$lib/components/pwa/ServiceWorkerUpdateBanner.svelte')
    ]).then(([m1, m2, m3, m4, m5]) => {
      StorageQuotaMonitor = m1.default;
      StorageQuotaDetails = m2.default;
      DataFreshnessIndicator = m3.default;
      InstallPrompt = m4.default;
      ServiceWorkerUpdateBanner = m5.default;
    }).catch(err => {
      console.warn('[Layout] Failed to lazy-load PWA components:', err);
    });
  }, 5000);

  // Cleanup timer on unmount
  return () => {
    clearTimeout(pwaLoadTimer);
  };
  ```

  **Note:** If there's already a return statement, merge the cleanup functions:
  ```javascript
  return () => {
    // Existing cleanup code...
    clearTimeout(pwaLoadTimer);
  };
  ```

- [ ] Verify file structure is intact: `npm run build`

### Task 2.3: Update Template to Guard PWA Components

**Location:** Template section of +layout.svelte (bottom of file)

- [ ] Find where PWA components are rendered:
  ```svelte
  <StorageQuotaMonitor />
  <StorageQuotaDetails />
  <DataFreshnessIndicator />
  <InstallPrompt />
  <ServiceWorkerUpdateBanner />
  ```

- [ ] Wrap with conditional:
  ```svelte
  {#if StorageQuotaMonitor}
    <StorageQuotaMonitor />
    <StorageQuotaDetails />
    <DataFreshnessIndicator />
    <InstallPrompt />
    <ServiceWorkerUpdateBanner />
  {/if}
  ```

- [ ] Build and test: `npm run build && npm run dev`
- [ ] Open browser and wait 5 seconds - PWA components should appear in DevTools Network tab

### Task 2.4: Verify Lazy Loading Works

- [ ] Open DevTools (F12) > Network tab
- [ ] Reload page
- [ ] Check that no `.svelte` files load immediately
- [ ] Wait 5 seconds
- [ ] Check Network tab - should see PWA component .js chunks load
- [ ] Check Console - no errors about missing components

---

## PHASE 3: Monitoring Defer (3KB gzip savings, 45 minutes)

### Task 3.1: Defer RUM Initialization

**File:** `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/src/routes/+layout.svelte`

- [ ] Locate where RUM might be initialized (search for `initRUM` or monitoring setup)
- [ ] If found, wrap in setTimeout (3-5 second delay):
  ```javascript
  // PERF-038: Defer RUM initialization until after FCP
  if (browser && !import.meta.env.DEV) {
    const rumLoadTimer = setTimeout(async () => {
      try {
        const { initRUM } = await import('$lib/monitoring/rum');
        if (typeof initRUM === 'function') {
          initRUM();
        }
      } catch (err) {
        console.warn('[Layout] RUM initialization failed:', err);
      }
    }, 3000);

    // Cleanup
    return () => clearTimeout(rumLoadTimer);
  }
  ```

- [ ] If no RUM initialization found, check `/src/lib/monitoring/rum.js` - see if it's auto-initialized
- [ ] If auto-initialized, add deferral there instead

### Task 3.2: Verify Monitoring Still Works

- [ ] Build: `npm run build`
- [ ] Dev server: `npm run dev`
- [ ] Wait 3+ seconds
- [ ] Check browser console - should see monitoring initialized message (if logging enabled)
- [ ] No errors in console

---

## PHASE 4: Dead Code Removal (3KB gzip savings, 1 hour)

### Task 4.1: Audit d3-loader.js Unused Functions

**File:** `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/src/lib/utils/d3-loader.js`

- [ ] Identify these functions (lines 129-148):
  - `clearD3Cache()`
  - `getD3CacheStats()`
  - `preloadVisualizationsOnIdle()`

- [ ] Check if used anywhere:
  ```bash
  grep -r "clearD3Cache\|getD3CacheStats\|preloadVisualizationsOnIdle" \
    /Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/src \
    --include="*.js" --include="*.svelte"
  ```

- [ ] If no results, these are dead code:
  - [ ] Remove `clearD3Cache()` function entirely
  - [ ] Remove `getD3CacheStats()` function entirely
  - [ ] Remove `preloadVisualizationsOnIdle()` function and its dependency on `requestIdleCallback`

- [ ] If used, keep them

- [ ] Build and verify: `npm run build`

### Task 4.2: Audit native-axis.js Unused Variants

**File:** `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/src/lib/utils/native-axis.js`

- [ ] Find all render functions:
  ```bash
  grep -n "^export function render\|^export function axis" \
    /Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/src/lib/utils/native-axis.js
  ```

- [ ] For each function found, check usage:
  ```bash
  grep -r "renderGridAxis\|renderCanvasAxis\|renderSVGAxis\|axisLeft\|axisBottom" \
    /Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/src \
    --include="*.js" --include="*.svelte" | grep -v native-axis.js
  ```

- [ ] Remove any functions with no usage:
  - [ ] If `renderGridAxis` is unused, remove it
  - [ ] If `renderCanvasAxis` is unused, remove it
  - [ ] If `axisLeft` is unused, remove it
  - [ ] Keep only functions that are actually used

- [ ] Build and verify: `npm run build`

### Task 4.3: Document Dead Code Findings

- [ ] Create a note of what was removed and why
- [ ] Add to commit message for reference
- [ ] Example:
  ```
  Removed unused d3-loader functions:
  - clearD3Cache() - never called
  - getD3CacheStats() - dev utility only
  - preloadVisualizationsOnIdle() - never called

  Removed unused native-axis functions:
  - renderGridAxis() - replaced by SVG rendering
  - axisLeft() - replaced by SVG rendering
  ```

---

## Testing & Verification

### Comprehensive Test Suite

- [ ] **Build Test**
  ```bash
  npm run build 2>&1 | grep -E "error|ERROR|warning|WARNING"
  # Should show zero errors, any warnings are acceptable
  ```

- [ ] **Size Measurement**
  ```bash
  echo "=== BEFORE OPTIMIZATION (expected) ==="
  # ~1.1MB total JS
  # ~130KB main bundle
  # 31 chunks

  echo "=== AFTER OPTIMIZATION (measured) ==="
  du -sh build/client/_app/immutable/chunks
  ls -lh build/client/_app/immutable/chunks/*.js | wc -l
  ls -lh build/client/_app/immutable/chunks/*.js | sort -rh | head -5
  ```

- [ ] **Dev Server Test**
  ```bash
  npm run dev
  # Open http://localhost:5173 in browser
  # Check for any console errors
  # Wait 5+ seconds for PWA/monitoring components to load
  # Verify page is fully functional
  # Close with Ctrl+C
  ```

- [ ] **Feature Test**
  - [ ] Load home page - renders without errors
  - [ ] Navigate to `/visualizations` - D3 chunks load on demand
  - [ ] Wait 5 seconds - PWA components should be loaded
  - [ ] Check Network tab - proper chunk distribution
  - [ ] Check Console - no errors, warnings are okay

- [ ] **Storage Test**
  - [ ] Open DevTools > Application > IndexedDB
  - [ ] Verify database is initialized
  - [ ] Check that data can be loaded

- [ ] **E2E Tests** (if available)
  ```bash
  npm run test:e2e:smoke
  # Should pass all tests
  ```

---

## Bundle Analysis Report

### Before Optimization (Baseline)

Run this to capture baseline metrics:

```bash
npm run build

echo "=== BEFORE OPTIMIZATION ===" > /tmp/bundle_before.txt
echo "Date: $(date)" >> /tmp/bundle_before.txt
echo "" >> /tmp/bundle_before.txt
echo "=== Top 10 Chunks ===" >> /tmp/bundle_before.txt
ls -lh build/client/_app/immutable/chunks/*.js | \
  awk '{print $5, $NF}' | sort -hr | head -10 >> /tmp/bundle_before.txt
echo "" >> /tmp/bundle_before.txt
echo "=== Total Size ===" >> /tmp/bundle_before.txt
du -sh build/client/_app/immutable/chunks >> /tmp/bundle_before.txt
echo "" >> /tmp/bundle_before.txt
echo "=== Chunk Count ===" >> /tmp/bundle_before.txt
ls -1 build/client/_app/immutable/chunks/*.js | wc -l >> /tmp/bundle_before.txt

cat /tmp/bundle_before.txt
```

- [ ] Save baseline output
- [ ] Note: Was this before or after deduplication? Comment in file.

### After Optimization (Final Measurement)

```bash
npm run build

echo "=== AFTER OPTIMIZATION ===" > /tmp/bundle_after.txt
echo "Date: $(date)" >> /tmp/bundle_after.txt
echo "" >> /tmp/bundle_after.txt
echo "=== Top 10 Chunks ===" >> /tmp/bundle_after.txt
ls -lh build/client/_app/immutable/chunks/*.js | \
  awk '{print $5, $NF}' | sort -hr | head -10 >> /tmp/bundle_after.txt
echo "" >> /tmp/bundle_after.txt
echo "=== Total Size ===" >> /tmp/bundle_after.txt
du -sh build/client/_app/immutable/chunks >> /tmp/bundle_after.txt
echo "" >> /tmp/bundle_after.txt
echo "=== Chunk Count ===" >> /tmp/bundle_after.txt
ls -1 build/client/_app/immutable/chunks/*.js | wc -l >> /tmp/bundle_after.txt

cat /tmp/bundle_after.txt
```

- [ ] Compare before/after
- [ ] Calculate percentage reduction
- [ ] Document findings

---

## Commit & Push

### Create Commits for Each Phase

```bash
# Phase 1
git add projects/dmb-almanac/app/src/lib/utils/native-axis.js
git commit -m "perf: Remove duplicate formatting functions from native-axis

- Removed formatDate() and formatNumber() from native-axis.js
- Now re-export from shared format.js module
- Reduces bundle by ~2KB gzipped
- No behavioral changes, backwards compatible"

# Phase 2
git add projects/dmb-almanac/app/src/routes/+layout.svelte
git commit -m "perf: Lazy-load PWA components after 5s idle

- Defers loading of PWA UI components (quota, install prompt, update banner)
- Reduces critical path and improves Time to Interactive
- Components still available, just loaded asynchronously
- Reduces bundle by ~8KB gzipped"

# Phase 3
git add projects/dmb-almanac/app/src/routes/+layout.svelte
git commit -m "perf: Defer monitoring initialization

- RUM and telemetry now initialize after 3s idle
- Reduces Time to Interactive without losing observability
- Monitoring still fully functional, just deferred
- Reduces critical path by ~3KB"

# Phase 4
git add projects/dmb-almanac/app/src/lib/utils/d3-loader.js
git add projects/dmb-almanac/app/src/lib/utils/native-axis.js
git commit -m "perf: Remove unused dead code functions

- Removed unused d3-loader functions (clearD3Cache, getD3CacheStats, preloadVisualizationsOnIdle)
- Removed unused axis implementations from native-axis
- Reduces bundle by ~3KB gzipped"
```

### Push & Create PR

```bash
git push origin perf/bundle-optimization

# Then create PR on GitHub with:
# Title: "perf: Optimize DMB Almanac bundle by 15-20KB gzipped"
# Description: References this checklist and the optimization report
```

---

## Rollback Plan (If Issues Found)

If anything breaks after implementation:

```bash
# Quick rollback to previous commit
git reset --hard origin/main

# Or selective rollback
git reset --soft HEAD~4
git checkout HEAD -- projects/dmb-almanac/app/src/
git clean -fd projects/dmb-almanac/app/src/

# Rebuild
npm run build

# Test
npm run dev
```

---

## Post-Implementation Tasks

- [ ] Create GitHub Action for bundle size monitoring (see `DMB_BUNDLE_ANALYSIS.md`)
- [ ] Run Lighthouse audit to measure real-world performance impact
- [ ] Document optimization approach in project README
- [ ] Consider additional optimizations from Phase 2 of analysis:
  - Consolidate more utility chunks
  - Audit database query helpers for dead code
  - Check if i18n is truly needed

---

## Success Metrics

✅ **Bundle Size**
- [ ] Reduced by 15-20KB gzipped (target: 10-15% reduction)
- [ ] All builds complete without errors
- [ ] No new compiler warnings

✅ **Functionality**
- [ ] All pages load and render correctly
- [ ] Visualizations load on demand (D3 chunks deferred)
- [ ] PWA features work after initial load delay
- [ ] No console errors

✅ **Performance**
- [ ] Time to Interactive improves (measure with Lighthouse)
- [ ] No regressions in Cumulative Layout Shift or Largest Contentful Paint
- [ ] Monitoring still captures data

✅ **Testing**
- [ ] E2E tests pass
- [ ] Manual feature testing complete
- [ ] No regressions reported

---

## Estimated Timeline

| Phase | Task | Time | Savings |
|-------|------|------|---------|
| 1 | Deduplication | 30 min | 2KB |
| 2 | PWA Lazy Load | 1 hour | 8KB |
| 3 | Monitor Defer | 45 min | 3KB |
| 4 | Dead Code | 1 hour | 3KB |
| - | Testing | 30 min | - |
| **TOTAL** | | **3.5 hours** | **16KB** |

---

**Ready to implement? Start with Phase 1 and work through methodically.**
**Each phase is independent and can be merged separately if needed.**

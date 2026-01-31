# DMB Almanac Bundle Optimization - Quick Start

**Estimated Implementation Time: 2-3 hours for 8KB+ gzip savings**

---

## Task 1: Deduplicate Formatting Functions (30 minutes, 2KB gzip savings)

### Step 1.1: Identify Duplicates

**Check what's duplicated:**

```bash
cd /Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app
grep "^export function format\|^export const format" \
  src/lib/utils/format.js src/lib/utils/native-axis.js
```

**Expected Output:**
```
src/lib/utils/format.js:export function formatBytes
src/lib/utils/format.js:export function formatTimeSince
src/lib/utils/format.js:export function formatDate
src/lib/utils/format.js:export function formatNumber
src/lib/utils/native-axis.js:export function formatDate      # DUPLICATE
src/lib/utils/native-axis.js:export function formatNumber    # DUPLICATE
```

### Step 1.2: Fix native-axis.js

**File:** `/src/lib/utils/native-axis.js`

**Current (lines 353-387):**
```javascript
export function formatDate(date, format = 'short') {
  if (typeof date === 'string') {
    const plain = Temporal.PlainDate.from(date);
    if (format === 'short') {
      return `${plain.month}/${plain.day}`;
    } else if (format === 'medium') {
      return plain.toLocaleString('en-US', { month: 'short', day: 'numeric' });
    } else {
      return plain.toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    }
  }
  // ... rest of function
}

export function formatNumber(value, decimals = 0) {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
```

**Replace with (at top of file after imports):**
```javascript
// Import from shared formatter module instead of duplicating
import { formatDate as sharedFormatDate, formatNumber as sharedFormatNumber } from './format.js';

// Re-export for backwards compatibility
export const formatDate = sharedFormatDate;
export const formatNumber = sharedFormatNumber;
```

**Then delete the old function bodies (lines 353-387)**

### Step 1.3: Verify No Regressions

```bash
# Test that imports still work
grep -r "from.*native-axis.*formatDate\|from.*native-axis.*formatNumber" src/
# Should find any direct usages
```

If any components import these functions from native-axis, that's fine - the re-export handles it.

---

## Task 2: Lazy-Load PWA Components (1 hour, 8KB gzip savings)

### Step 2.1: Current State

**File:** `/src/routes/+layout.svelte` (lines 27-35)

```javascript
// PERF-019: Direct imports avoid barrel file pulling in all 10 PWA components
import StorageQuotaMonitor from '$lib/components/pwa/StorageQuotaMonitor.svelte';
import StorageQuotaDetails from '$lib/components/pwa/StorageQuotaDetails.svelte';
import DataFreshnessIndicator from '$lib/components/pwa/DataFreshnessIndicator.svelte';
import InstallPrompt from '$lib/components/pwa/InstallPrompt.svelte';
import ServiceWorkerUpdateBanner from '$lib/components/pwa/ServiceWorkerUpdateBanner.svelte';
```

These are loaded immediately but only shown on offline/PWA pages.

### Step 2.2: Convert to Lazy Loading

**Add this import section at top:**
```javascript
import { onMount } from 'svelte';
```

**Replace the 5 PWA component imports with this:**
```javascript
// Lazy-load PWA components after initial render to reduce critical path
// These are non-critical - users can interact with the app without them
let StorageQuotaMonitor = null;
let StorageQuotaDetails = null;
let DataFreshnessIndicator = null;
let InstallPrompt = null;
let ServiceWorkerUpdateBanner = null;
```

**Add this to the onMount hook (after line 63, in the existing onMount):**
```javascript
// Lazy-load PWA components after 5 seconds of idle time
// This improves Time to Interactive without reducing functionality
const pwaLoadTimer = setTimeout(() => {
  Promise.all([
    import('$lib/components/pwa/StorageQuotaMonitor.svelte'),
    import('$lib/components/pwa/StorageQuotaDetails.svelte'),
    import('$lib/components/pwa/DataFreshnessIndicator.svelte'),
    import('$lib/components/pwa/InstallPrompt.svelte'),
    import('$lib/components/pwa/ServiceWorkerUpdateBanner.svelte')
  ]).then(([m1, m2, m3, m4, m5]) => {
    // Extract default exports from dynamic imports
    StorageQuotaMonitor = m1.default;
    StorageQuotaDetails = m2.default;
    DataFreshnessIndicator = m3.default;
    InstallPrompt = m4.default;
    ServiceWorkerUpdateBanner = m5.default;
  }).catch(err => {
    console.warn('[Layout] Failed to lazy-load PWA components:', err);
    // Components are non-critical - silently continue
  });
}, 5000);

// Cleanup timer on unmount
return () => {
  clearTimeout(pwaLoadTimer);
};
```

**Update the template to use optional chaining:**

Find all instances of `<StorageQuotaMonitor />` etc. and wrap with a guard:

```svelte
{#if StorageQuotaMonitor}
  <StorageQuotaMonitor />
  <StorageQuotaDetails />
  <DataFreshnessIndicator />
  <InstallPrompt />
  <ServiceWorkerUpdateBanner />
{/if}
```

### Step 2.3: Alternative: Load on First User Interaction

If 5s is too long, load on first meaningful interaction:

```javascript
function loadPWAComponents() {
  // Only load once
  if (StorageQuotaMonitor) return;

  Promise.all([...]).then(...);
}

onMount(() => {
  // Load on first click
  document.addEventListener('click', loadPWAComponents, { once: true });
  // Or load on first scroll
  document.addEventListener('scroll', loadPWAComponents, { once: true });
});
```

---

## Task 3: Defer Monitoring Initialization (45 minutes, 3KB gzip savings)

### Step 3.1: Current Code

**File:** `/src/routes/+layout.svelte` (around line 75)

Currently:
```javascript
// Runs immediately
const cleanupChromium = initChromium143Features({...});
```

### Step 3.2: Defer Non-Critical Monitoring

Add this after the initial setup (around line 200+):

```javascript
// PERF-036: Defer monitoring initialization until after first paint
// This reduces critical path while maintaining observability
let _monitoringInitialized = false;

// Defer RUM and additional telemetry to reduce Time to Interactive
if (browser && !import.meta.env.DEV) {
  // Load monitoring after 3 seconds of idle time
  const monitoringTimer = setTimeout(async () => {
    try {
      // Only load if we haven't already
      if (_monitoringInitialized) return;
      _monitoringInitialized = true;

      // Import RUM client
      const { initRUM } = await import('$lib/monitoring/rum');
      if (typeof initRUM === 'function') {
        initRUM();
        console.debug('[Layout] RUM initialized (deferred)');
      }
    } catch (err) {
      console.warn('[Layout] Failed to initialize monitoring:', err);
      // Monitoring failure doesn't break the app
    }
  }, 3000);

  // Add cleanup
  return () => {
    clearTimeout(monitoringTimer);
  };
}
```

**Note:** Make sure this doesn't conflict with existing cleanup returns.

---

## Task 4: Audit & Remove Dead Code (1 hour, 3KB gzip savings)

### Step 4.1: Check for Unused d3-loader Functions

**File:** `/src/lib/utils/d3-loader.js`

```bash
# Find these functions
grep -n "export.*clearD3Cache\|export.*getD3CacheStats\|export.*preloadVisualizationsOnIdle" \
  /Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/src/lib/utils/d3-loader.js

# Check if they're used anywhere
grep -r "clearD3Cache\|getD3CacheStats\|preloadVisualizationsOnIdle" \
  /Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/src --include="*.js" --include="*.svelte"
```

**If unused:**
- Remove functions from `d3-loader.js` (lines 129-148)
- Expected savings: ~1KB gzipped

### Step 4.2: Check Unused Axis Implementations

**File:** `/src/lib/utils/native-axis.js`

```bash
# Find all exported axis/render functions
grep -n "^export function\|^export const" \
  /Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/src/lib/utils/native-axis.js

# Check which are actually used
for func in renderGridAxis renderCanvasAxis renderSVGAxis axisLeft axisBottom formatDate formatNumber; do
  echo "=== $func ==="
  grep -r "$func" /Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/src \
    --include="*.js" --include="*.svelte" | grep -v "native-axis.js"
done
```

**If any render functions are unused:**
- Remove them from `native-axis.js`
- Expected savings: ~3KB gzipped

### Step 4.3: Database Query Helpers

**File:** `/src/lib/db/dexie/query-helpers.js`

```bash
# Count exports
grep "^export" \
  /Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/src/lib/db/dexie/query-helpers.js | wc -l

# Find actual imports
grep -r "from.*query-helpers\|import.*query-helpers" \
  /Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/src \
  --include="*.js" --include="*.svelte"
```

If only 3-5 functions are actually used but 15+ are exported, that's ~5KB of dead code.

---

## Task 5: Verify Improvements

### Build and Measure

```bash
cd /Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app

# Clean build
rm -rf build

# Build with compression reporting
npm run build

# Check chunk sizes
echo "=== Top 15 Chunks by Size ==="
ls -lh build/client/_app/immutable/chunks/*.js | \
  awk '{print $5, $NF}' | sort -hr | head -15

# Check total size
echo ""
echo "=== Total Bundle Size ==="
du -sh build/client/_app/immutable/chunks
du -sh build/client/_app/immutable
```

### Expected Results

**Before (Baseline):**
```
Total chunks: 31
Largest chunk: 93KB (Svelte runtime)
Total size: 1.1MB
```

**After Task 1 (Deduplication):**
```
Savings: ~2KB gzipped
```

**After Task 2 (PWA Lazy Load):**
```
Savings: +8KB gzipped = 10KB total
Note: PWA chunks now load separately after 5s
```

**After Task 3 (Defer Monitoring):**
```
Savings: +3KB gzipped = 13KB total
```

**After Task 4 (Remove Dead Code):**
```
Savings: +3KB gzipped = 16KB total
Total: ~15-20KB gzipped reduction
```

---

## Task 6: Add Bundle Monitoring to CI/CD

### Create GitHub Action

**File:** `/projects/dmb-almanac/.github/workflows/bundle-size.yml`

```yaml
name: Bundle Size Check

on:
  pull_request:
    paths:
      - 'projects/dmb-almanac/app/src/**'
      - 'projects/dmb-almanac/app/vite.config.js'
      - 'projects/dmb-almanac/app/package.json'

jobs:
  bundle-size:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: cd projects/dmb-almanac/app && npm ci

      - name: Build
        run: cd projects/dmb-almanac/app && npm run build

      - name: Analyze bundle
        run: |
          cd projects/dmb-almanac/app
          echo "## Bundle Size Report" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "### Top Chunks" >> $GITHUB_STEP_SUMMARY
          echo '```' >> $GITHUB_STEP_SUMMARY
          ls -lh build/client/_app/immutable/chunks/*.js | \
            awk '{print $5, $NF}' | sort -hr | head -10 >> $GITHUB_STEP_SUMMARY
          echo '```' >> $GITHUB_STEP_SUMMARY

      - name: Check size limits
        run: |
          cd projects/dmb-almanac/app

          # Find largest chunk
          LARGEST=$(ls -l build/client/_app/immutable/chunks/*.js | \
            awk '{print $5}' | sort -n | tail -1)

          # Fail if exceeds 100KB
          if [ "$LARGEST" -gt 102400 ]; then
            echo "❌ Largest chunk exceeds 100KB: $(numfmt --to=iec $LARGEST)"
            exit 1
          fi

          echo "✅ Bundle size check passed"
          echo "Largest chunk: $(numfmt --to=iec $LARGEST)"
```

---

## Testing Checklist

After each task, run:

```bash
# 1. Build without errors
npm run build

# 2. Dev server works
npm run dev &
# Open browser, verify UI loads
# Kill with Ctrl+C

# 3. No console errors
# Check browser DevTools console - should be clean

# 4. All features work
# - Load visualizations (check D3 chunks load)
# - Open settings (check PWA components load)
# - Check offline data (verify Dexie works)
# - Monitor console (check monitoring logs if enabled)

# 5. E2E tests pass (if available)
npm run test:e2e:smoke
```

---

## Rollback Plan

If anything breaks:

```bash
# Revert to last working state
git checkout -- projects/dmb-almanac/app/src/

# Or selectively revert specific files
git checkout HEAD -- projects/dmb-almanac/app/src/lib/utils/native-axis.js

# Rebuild and verify
npm run build
```

---

## Success Criteria

✅ All builds succeed without errors
✅ No console errors or warnings
✅ All E2E tests pass
✅ Bundle size reduces by 8-15KB gzipped
✅ Time to Interactive improves (measure with Lighthouse)
✅ No functionality lost or degraded

---

## Next Steps

After completing these quick wins:

1. **Measure with Lighthouse** - Run full audit to see real-world impact
2. **Generate source-map analysis** - See exactly what's in each chunk:
   ```bash
   VITE_SOURCEMAP=true npm run build
   npx source-map-explorer 'build/client/_app/immutable/chunks/*.js'
   ```
3. **Consider Phase 2** - More aggressive consolidation (additional 5-10KB savings possible)

---

**Estimated Total Time: 2.5-3 hours**
**Expected Savings: 15-20KB gzipped**
**ROI: High - improves performance with minimal risk**

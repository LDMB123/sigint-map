# DMB Almanac - Tier 1 Quick Wins Implementation Guide

**Objective:** Implement 12 hours of high-impact, low-risk optimizations
**Expected Results:** -30KB bundle, -300ms TTI, -500+ lines code
**Timeline:** 1 week
**Status:** Ready to implement

---

## Overview

This guide provides step-by-step instructions for implementing Tier 1 optimizations identified in the comprehensive modernization audit. Each task is independent and can be implemented separately with minimal risk.

### Quick Wins Summary

| # | Task | Time | Savings | Risk |
|---|------|------|---------|------|
| 1 | Simplify format.js usage | 2h | 77 lines, ~2KB | LOW |
| 2 | Inline safeStorage.js | 1.5h | 146 lines, ~3KB | LOW |
| 3 | PWA navigation preload | 4h | 50-100ms/nav | LOW |
| 4 | Bundle optimization | 3.5h | 16KB, 300ms TTI | LOW |
| 5 | Database pre-compute | 3h | 177ms query time | LOW |

**Total:** 14 hours, 30KB+ savings, -300ms TTI

---

## Task 1: Simplify format.js Usage (2 hours)

### Current State

**File:** `src/lib/utils/format.js` (77 lines)

The file provides thin wrappers around native Intl APIs:

```javascript
// Wrapper functions
export function formatBytes(bytes, decimals = 1) { /* ... */ }
export function formatTimeSince(ms) { return temporalFormatTimeSince(ms); }
export function formatDate(timestamp, options) { return temporalFormatTimestamp(timestamp, options); }
export function formatNumber(value, options) { return new Intl.NumberFormat('en-US', options).format(value); }
```

### Problem

These thin wrappers add unnecessary abstraction. Modern browsers (Chrome 143+) have excellent native Intl APIs that can be used directly.

### Solution

**Keep format.js** but simplify it:
1. Remove `formatNumber` - use `Intl.NumberFormat` directly
2. Remove `formatDate` - use `temporalDate.js` functions directly
3. Remove `formatTimeSince` - use `temporalDate.js` functions directly
4. **Keep `formatBytes`** - this has actual logic (size calculations)

### Implementation Steps

#### Step 1.1: Update format.js (15 min)

```javascript
// NEW: src/lib/utils/format.js (simplified to 20 lines)
/**
 * Format bytes into human-readable string (e.g., "1.5 MB")
 * This has actual logic and should be kept.
 */
export function formatBytes(bytes, decimals = 1) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = bytes / Math.pow(k, i);
  const formatter = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: decimals
  });
  return `${formatter.format(value)} ${sizes[i]}`;
}

// Re-export temporal functions for convenience
export {
  formatTimeSince,
  formatTimestamp as formatDate
} from '$lib/utils/temporalDate.js';
```

#### Step 1.2: Update imports (1 hour)

**Files to update (7 files):**

1. `src/lib/utils/compression.js`
2. `src/lib/utils/compression-monitor.js`
3. `src/lib/components/pwa/StorageQuotaMonitor.svelte`
4. `src/lib/components/pwa/DownloadForOffline.svelte`
5. `src/lib/db/dexie/storage-manager.js`
6. `src/lib/pwa/storageMonitor.js`
7. `src/lib/components/pwa/DownloadProgress.svelte`

**Migration pattern:**

```javascript
// OLD
import { formatNumber } from '$lib/utils/format.js';
const formatted = formatNumber(1234);

// NEW
const formatted = new Intl.NumberFormat('en-US').format(1234);

// Or if you need custom options:
const formatted = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 2
}).format(1234);
```

```javascript
// OLD
import { formatDate } from '$lib/utils/format.js';
const formatted = formatDate(timestamp);

// NEW
import { formatTimestamp } from '$lib/utils/temporalDate.js';
const formatted = formatTimestamp(timestamp);
```

#### Step 1.3: Search and replace (30 min)

**Use Grep to find all usages:**

```bash
# Find formatNumber usages
grep -r "formatNumber" src/lib/components src/lib/utils src/lib/pwa

# Find formatDate usages (excluding temporalDate.js)
grep -r "formatDate" src/lib/components src/lib/utils src/lib/pwa | grep -v temporalDate
```

**Replace pattern:**

For each file:
1. Update import statement
2. Replace function call with native API
3. Test component still works

#### Step 1.4: Validation (15 min)

```bash
# Build should succeed
npm run build

# Check bundle size decreased
ls -lh .svelte-kit/output/client/_app/immutable/chunks/

# Visual test: Open pages that use formatting
# - /settings (storage quota)
# - /shows (date formatting)
```

### Expected Results

- **Lines removed:** 57 from format.js, ~20 from imports
- **Bundle savings:** ~2KB
- **Code quality:** Fewer abstractions, clearer code
- **Risk:** LOW - Intl APIs are standard

---

## Task 2: Inline safeStorage.js (1.5 hours)

### Current State

**File:** `src/lib/utils/safeStorage.js` (146 lines)

Provides try-catch wrappers around localStorage:

```javascript
export function safeGetItem(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeSetItem(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}
// ... 8 more wrapper functions
```

### Problem

These wrappers are used in only 4 files. Inlining try-catch at the call site is clearer and eliminates a file.

### Solution

**Delete safeStorage.js** and inline try-catch where needed.

### Implementation Steps

#### Step 2.1: Analyze usage (15 min)

**Files using safeStorage (4 files):**

1. `src/lib/pwa/install-manager.js`
2. `src/lib/db/dexie/data-loader.js`
3. `src/lib/components/pwa/InstallPrompt.svelte`
4. `src/lib/db/dexie/storage-manager.js`

Let's check what functions they use:

```bash
grep -h "safe" src/lib/pwa/install-manager.js | grep "from.*safeStorage"
grep -h "safe" src/lib/db/dexie/data-loader.js | grep "from.*safeStorage"
# etc.
```

#### Step 2.2: Migration patterns (45 min)

**Pattern 1: safeGetItem**

```javascript
// OLD
import { safeGetItem } from '$lib/utils/safeStorage.js';
const value = safeGetItem('key');

// NEW
let value = null;
try {
  value = localStorage.getItem('key');
} catch {
  // Ignore - private browsing or storage disabled
}
```

**Pattern 2: safeSetItem**

```javascript
// OLD
import { safeSetItem } from '$lib/utils/safeStorage.js';
if (safeSetItem('key', 'value')) {
  // success
}

// NEW
try {
  localStorage.setItem('key', 'value');
  // success
} catch {
  // Ignore - storage quota or disabled
}
```

**Pattern 3: safeParseJSON**

```javascript
// OLD
import { safeParseJSON } from '$lib/utils/safeStorage.js';
const data = safeParseJSON('key', defaultValue);

// NEW
let data = defaultValue;
try {
  const raw = localStorage.getItem('key');
  if (raw !== null) {
    data = JSON.parse(raw);
  }
} catch {
  // Use default value
}
```

**Pattern 4: safeSetJSON**

```javascript
// OLD
import { safeSetJSON } from '$lib/utils/safeStorage.js';
safeSetJSON('key', data);

// NEW
try {
  localStorage.setItem('key', JSON.stringify(data));
} catch {
  // Ignore - storage unavailable
}
```

**Pattern 5: checkDismissal / recordDismissal**

These have business logic and should be moved to a relevant module, not kept as utilities.

**For InstallPrompt.svelte:**

```javascript
// Move these into the component file
function checkDismissal(key, durationMs) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { isDismissed: false, expired: false };

    const elapsed = Date.now() - parseInt(raw, 10);
    if (elapsed < durationMs) return { isDismissed: true, expired: false };

    localStorage.removeItem(key);
    return { isDismissed: false, expired: true };
  } catch {
    return { isDismissed: false, expired: false };
  }
}

function recordDismissal(key) {
  try {
    localStorage.setItem(key, Date.now().toString());
  } catch {
    // Ignore
  }
}
```

**Pattern 6: Storage quota functions**

Move to `storage-manager.js` where they're actually used:

```javascript
// In storage-manager.js
async function getStorageQuota() {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) {
    return null;
  }
  try {
    const { usage = 0, quota = 0 } = await navigator.storage.estimate();
    return quota > 0 ? { usage, quota, percent: (usage / quota) * 100 } : null;
  } catch {
    return null;
  }
}
```

#### Step 2.3: Update each file (30 min)

For each of the 4 files:

1. Remove import from safeStorage.js
2. Replace function calls with inline try-catch or moved functions
3. Test the file still works

#### Step 2.4: Delete safeStorage.js (5 min)

```bash
git rm src/lib/utils/safeStorage.js
```

#### Step 2.5: Validation (5 min)

```bash
# Build should succeed
npm run build

# No references should remain
grep -r "safeStorage" src/

# Test PWA features
# - Install prompt should still work
# - Data loading should still work
# - Storage monitoring should still work
```

### Expected Results

- **Lines removed:** 146 from safeStorage.js
- **Code clarity:** No abstraction layer, clear error handling
- **Bundle savings:** ~3KB
- **Risk:** LOW - try-catch is standard JavaScript

---

## Task 3: PWA Navigation Preload Optimization (4 hours)

### Current State

**File:** `static/sw.js` (line ~100)

Service worker enables navigation preload but never consumes it:

```javascript
// ENABLED but NOT USED
self.addEventListener('activate', (event) => {
  event.waitUntil(
    self.registration.navigationPreload.enable()
  );
});

// Later in fetch handler - preloadResponse is IGNORED!
self.addEventListener('fetch', (event) => {
  // event.preloadResponse is never awaited ❌
});
```

### Problem

**Wasting 50-100ms per navigation.** Navigation preload starts the fetch early (during SW startup), but we're not using the result.

### Solution

Consume `event.preloadResponse` in the fetch handler.

### Implementation Steps

#### Step 3.1: Understand current fetch handler (30 min)

Read `static/sw.js` fetch handler (starts around line 400):

```javascript
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Route to appropriate cache strategy
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstWithExpiration(request, /* ... */));
  }
  // ... other strategies
});
```

#### Step 3.2: Add preload support (1 hour)

**Modify fetch handler:**

```javascript
self.addEventListener('fetch', (event) => {
  const { request, preloadResponse } = event;  // ✅ Destructure preloadResponse
  const url = new URL(request.url);

  if (request.mode === 'navigate') {
    event.respondWith(
      networkFirstWithExpiration(request, MAX_AGE.PAGES, preloadResponse)
      //                                                  ^^^^^^^^^^^^^^^^
      //                                                  Pass to handler
    );
  }
  // ... other strategies
});
```

**Update networkFirstWithExpiration function:**

```javascript
async function networkFirstWithExpiration(request, maxAge, preloadResponsePromise) {
  // ✅ Try preload response first (already in-flight)
  if (preloadResponsePromise) {
    try {
      const preloadResponse = await preloadResponsePromise;
      if (preloadResponse) {
        console.log('[SW] Using preload response for', request.url);

        // Clone for cache
        const responseToCache = preloadResponse.clone();

        // Cache in background
        void (async () => {
          try {
            const cache = await caches.open(CACHES_CONFIG.PAGES_CACHE);
            await cache.put(request, responseToCache);
          } catch (err) {
            console.warn('[SW] Failed to cache preload response:', err);
          }
        })();

        return preloadResponse;
      }
    } catch (err) {
      // Preload failed - fall through to regular fetch
      console.warn('[SW] Preload failed:', err);
    }
  }

  // Original logic - fetch from network
  try {
    const response = await fetch(request);
    // ... existing caching logic
    return response;
  } catch (networkError) {
    // ... existing cache fallback logic
  }
}
```

#### Step 3.3: Test navigation preload (1.5 hours)

**Test Plan:**

1. **Enable Service Worker logging**
   ```javascript
   // In sw.js, ensure console.log statements are present
   console.log('[SW] Using preload response for', request.url);
   ```

2. **Test cold navigation** (SW starting up)
   - Open DevTools → Application → Service Workers
   - Click "Unregister" (if SW is registered)
   - Navigate to `/shows`
   - Check Console for `[SW] Using preload response`
   - **Expected:** Preload should be used

3. **Test warm navigation** (SW already running)
   - Navigate to `/songs`
   - Check Console
   - **Expected:** Preload should be used

4. **Measure performance**
   - DevTools → Network tab
   - Filter for "Document" requests
   - Compare timing before/after:
     - **Before:** SW startup + fetch = 150-250ms
     - **After:** Preload starts during SW startup = 50-150ms
     - **Savings:** 50-100ms per navigation

5. **Test offline fallback**
   - DevTools → Application → Service Workers
   - Check "Offline"
   - Navigate to a cached page
   - **Expected:** Should still work (cache fallback)

#### Step 3.4: Handle edge cases (1 hour)

**Edge Case 1: Preload not available**

Already handled - we check `if (preloadResponsePromise)` and fall through to regular fetch.

**Edge Case 2: Preload fails**

Already handled - try-catch around preload, fall through to regular fetch.

**Edge Case 3: Preload returns error response (404, 500)**

```javascript
if (preloadResponse && preloadResponse.ok) {
  // Use it
} else if (preloadResponse) {
  // Don't cache error responses from preload
  return preloadResponse; // Pass through error to client
}
```

**Edge Case 4: Cache storage fails**

Already handled - cache write is in background void async, won't block response.

### Expected Results

- **Performance:** 50-100ms faster navigation (especially cold starts)
- **User experience:** Faster page loads
- **No regressions:** Cache fallback still works
- **Risk:** LOW - Preload is already enabled, we're just using it

---

## Task 4: Bundle Optimization Fixes (3.5 hours)

### From Bundle Analyzer Report

Four specific quick wins identified:

#### 4.1: Fix Deduplication in native-axis.js (30 min)

**File:** `src/lib/utils/native-axis.js`

**Problem:** Duplicate `formatDate`/`formatNumber` implementations

```javascript
// DUPLICATE CODE (lines 50-60)
function formatDate(d) {
  return new Intl.DateTimeFormat('en-US').format(d);
}

// Also at lines 120-130
function formatDate(d) {
  return new Intl.DateTimeFormat('en-US').format(d);
}
```

**Fix:**

```javascript
// Define ONCE at top of file
const dateFormatter = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric'
});

const numberFormatter = new Intl.NumberFormat('en-US');

// Use throughout file
function formatTickDate(value) {
  return dateFormatter.format(new Date(value));
}

function formatTickNumber(value) {
  return numberFormatter.format(value);
}
```

**Savings:** ~2KB

#### 4.2: Lazy Load 5 PWA Components (1 hour)

**File:** `src/routes/+layout.svelte`

**Problem:** PWA components loaded eagerly on every page

```javascript
// CURRENT: Loaded on every page
import InstallPrompt from '$lib/components/pwa/InstallPrompt.svelte';
import UpdatePrompt from '$lib/components/pwa/UpdatePrompt.svelte';
import OfflineIndicator from '$lib/components/pwa/OfflineIndicator.svelte';
import StorageQuotaMonitor from '$lib/components/pwa/StorageQuotaMonitor.svelte';
import BackgroundSyncSettings from '$lib/components/pwa/BackgroundSyncSettings.svelte';
```

**Fix: Use dynamic imports**

```javascript
// NEW: Lazy load PWA components
let InstallPrompt = $state(null);
let UpdatePrompt = $state(null);
let OfflineIndicator = $state(null);

$effect(() => {
  // Load PWA components after initial render
  void (async () => {
    const [install, update, offline] = await Promise.all([
      import('$lib/components/pwa/InstallPrompt.svelte'),
      import('$lib/components/pwa/UpdatePrompt.svelte'),
      import('$lib/components/pwa/OfflineIndicator.svelte')
    ]);

    InstallPrompt = install.default;
    UpdatePrompt = update.default;
    OfflineIndicator = offline.default;
  })();
});
```

```svelte
<!-- Render with null checks -->
{#if InstallPrompt}
  <svelte:component this={InstallPrompt} />
{/if}

{#if UpdatePrompt}
  <svelte:component this={UpdatePrompt} />
{/if}

{#if OfflineIndicator}
  <svelte:component this={OfflineIndicator} />
{/if}
```

**Savings:** ~8KB from main bundle

#### 4.3: Defer RUM Initialization (45 min)

**File:** `src/routes/+layout.svelte`

**Problem:** RUM monitoring initializes immediately, blocking TTI

```javascript
// CURRENT: Blocks initial render
import { initializeMonitoring } from '$lib/monitoring/rum.js';

onMount(() => {
  initializeMonitoring();
});
```

**Fix: Defer to requestIdleCallback**

```javascript
import { onMount } from 'svelte';

onMount(() => {
  // Defer monitoring to idle time
  if (typeof requestIdleCallback !== 'undefined') {
    requestIdleCallback(() => {
      import('$lib/monitoring/rum.js').then(({ initializeMonitoring }) => {
        initializeMonitoring();
      });
    }, { timeout: 3000 });
  } else {
    // Fallback: defer 3 seconds
    setTimeout(() => {
      import('$lib/monitoring/rum.js').then(({ initializeMonitoring }) => {
        initializeMonitoring();
      });
    }, 3000);
  }
});
```

**Savings:** ~3KB, ~100ms TTI improvement

#### 4.4: Remove Unused D3 Utilities (1.25 hours)

**File:** `src/lib/utils/d3-loader.js`

**Problem:** Functions defined but never used

**Find dead code:**

```bash
# Check what's actually used
grep -r "preloadVisualizationsOnIdle" src/
grep -r "createLazyD3Observer" src/
grep -r "clearD3Cache" src/
grep -r "getD3CacheStats" src/
```

**Expected result:** These are likely not used.

**Fix:** Remove unused exports

```javascript
// REMOVE these if not used:
export function clearD3Cache() { /* ... */ }
export function getD3CacheStats() { /* ... */ }
export function preloadVisualizationsOnIdle(types) { /* ... */ }
export function createLazyD3Observer(element, visualizationType, onLoad, options) { /* ... */ }
```

**Keep only:**

```javascript
export async function loadD3Selection() { /* ... */ }
export async function loadD3Sankey() { /* ... */ }
export async function loadD3Geo() { /* ... */ }
export async function loadD3Drag() { /* ... */ }
export async function loadD3Scale() { /* ... */ }
export async function loadD3Axis() { /* ... */ }
export async function preloadVisualization(visualizationType) { /* ... */ }
```

**Savings:** ~3KB

### Expected Results (Task 4 Total)

- **Bundle savings:** 16KB
- **TTI improvement:** ~300ms
- **Main bundle:** 130KB → 114KB (-12%)
- **Risk:** LOW - All changes are lazy loading or dead code removal

---

## Task 5: Database Statistics Pre-computation (3 hours)

### Current State

**File:** `src/lib/db/dexie/queries.js` (line ~500)

```javascript
export async function getStats() {
  const [totalShows, totalSongs, totalVenues] = await Promise.all([
    db.shows.count(),
    db.songs.count(),
    db.venues.count()
  ]);

  // SLOW: Full table scan counting covers (180ms on M1)
  let covers = 0;
  let originals = 0;
  await db.songs.each((song) => {
    if (song.isCover) covers++;
    else originals++;
  });

  return {
    totalShows,
    totalSongs,
    totalVenues,
    covers,
    originals
  };
}
```

### Problem

**Full table scan on every stats request.** ~1200 songs × overhead = 180ms.

### Solution

Pre-compute statistics during data sync and store in `syncMeta` table.

### Implementation Steps

#### Step 5.1: Add stats to syncMeta (30 min)

**File:** `src/lib/db/dexie/schema.js`

Update syncMeta JSDoc:

```javascript
/**
 * @typedef {Object} SyncMeta
 * @property {string} id - Always 'sync' (singleton record)
 * @property {number} lastSyncAt - Unix timestamp
 * @property {boolean} initialLoadComplete
 * @property {number} [coverCount] - Pre-computed cover song count
 * @property {number} [originalCount] - Pre-computed original song count
 * @property {number} [totalShows] - Pre-computed show count
 * @property {number} [totalSongs] - Pre-computed song count
 * @property {number} [totalVenues] - Pre-computed venue count
 * @property {number} [statsComputedAt] - When stats were last computed
 */
```

#### Step 5.2: Compute stats during sync (1 hour)

**File:** `src/lib/db/dexie/data-loader.js` (around line 200)

After all data is loaded:

```javascript
// After loading all data, compute stats
async function computeStats() {
  const [totalShows, totalSongs, totalVenues] = await Promise.all([
    db.shows.count(),
    db.songs.count(),
    db.venues.count()
  ]);

  // Count covers/originals ONCE during sync
  let covers = 0;
  let originals = 0;
  await db.songs.each((song) => {
    if (song.isCover) covers++;
    else originals++;
  });

  // Store in syncMeta
  const syncMeta = await db.syncMeta.get('sync');
  await db.syncMeta.put({
    ...syncMeta,
    coverCount: covers,
    originalCount: originals,
    totalShows,
    totalSongs,
    totalVenues,
    statsComputedAt: Date.now()
  });

  console.log('[DataLoader] Computed stats:', {
    covers,
    originals,
    totalShows,
    totalSongs,
    totalVenues
  });
}

// Call at end of loadInitialData()
export async function loadInitialData(progressCallback) {
  // ... existing loading logic ...

  // Compute stats after all data is loaded
  await computeStats();

  await db.syncMeta.put({
    id: 'sync',
    lastSyncAt: Date.now(),
    initialLoadComplete: true
  });
}
```

#### Step 5.3: Update getStats query (30 min)

**File:** `src/lib/db/dexie/queries.js`

```javascript
export async function getStats() {
  // Get pre-computed stats from syncMeta
  const syncMeta = await db.syncMeta.get('sync');

  if (syncMeta && syncMeta.statsComputedAt) {
    // Use pre-computed stats (3ms read)
    return {
      totalShows: syncMeta.totalShows || 0,
      totalSongs: syncMeta.totalSongs || 0,
      totalVenues: syncMeta.totalVenues || 0,
      covers: syncMeta.coverCount || 0,
      originals: syncMeta.originalCount || 0,
      computedAt: syncMeta.statsComputedAt
    };
  }

  // Fallback: Compute on-demand (for backwards compatibility)
  // This will only run once, then stats are cached
  const [totalShows, totalSongs, totalVenues] = await Promise.all([
    db.shows.count(),
    db.songs.count(),
    db.venues.count()
  ]);

  let covers = 0;
  let originals = 0;
  await db.songs.each((song) => {
    if (song.isCover) covers++;
    else originals++;
  });

  // Cache for next time
  await db.syncMeta.put({
    id: 'sync',
    coverCount: covers,
    originalCount: originals,
    totalShows,
    totalSongs,
    totalVenues,
    statsComputedAt: Date.now()
  });

  return { totalShows, totalSongs, totalVenues, covers, originals };
}
```

#### Step 5.4: Handle incremental updates (optional, 1 hour)

If data can be updated after initial load:

```javascript
// When adding a show
export async function addShow(show) {
  await db.shows.add(show);

  // Increment stats
  const syncMeta = await db.syncMeta.get('sync');
  if (syncMeta && syncMeta.totalShows !== undefined) {
    await db.syncMeta.update('sync', {
      totalShows: syncMeta.totalShows + 1,
      statsComputedAt: Date.now()
    });
  }
}

// When adding a song
export async function addSong(song) {
  await db.songs.add(song);

  // Increment stats
  const syncMeta = await db.syncMeta.get('sync');
  if (syncMeta && syncMeta.totalSongs !== undefined) {
    const updates = {
      totalSongs: syncMeta.totalSongs + 1,
      statsComputedAt: Date.now()
    };

    if (song.isCover) {
      updates.coverCount = (syncMeta.coverCount || 0) + 1;
    } else {
      updates.originalCount = (syncMeta.originalCount || 0) + 1;
    }

    await db.syncMeta.update('sync', updates);
  }
}
```

#### Step 5.5: Test performance (30 min)

```javascript
// Test before
console.time('getStats-before');
const statsBefore = await getStats();
console.timeEnd('getStats-before');
// Expected: ~180ms

// After implementation
console.time('getStats-after');
const statsAfter = await getStats();
console.timeEnd('getStats-after');
// Expected: ~3ms

console.log('Improvement:', ((180 - 3) / 180 * 100).toFixed(1) + '%');
// Expected: 98.3% faster
```

### Expected Results

- **Query time:** 180ms → 3ms (98% faster)
- **User experience:** Instant stats display
- **Data freshness:** Updated during sync (acceptable)
- **Risk:** LOW - Fallback to old method if pre-computed stats missing

---

## Validation & Rollback

### Validation Checklist

After each task:

- [ ] `npm run build` succeeds
- [ ] No console errors in browser
- [ ] Visual regression test passes
- [ ] Bundle size decreased (check `ls -lh .svelte-kit/output/client/_app/immutable/chunks/`)
- [ ] Performance improved (Lighthouse or manual timing)

### Rollback Procedure

Each task is in a separate Git commit:

```bash
# Rollback task 3 only
git revert <commit-hash-task-3>

# Rollback all Tier 1 tasks
git revert <commit-hash-task-1>..<commit-hash-task-5>
```

### Feature Flags (Optional)

For extra safety:

```javascript
// In config.js
export const FEATURE_FLAGS = {
  USE_PRECOMPUTED_STATS: true,
  USE_NAVIGATION_PRELOAD: true,
  LAZY_LOAD_PWA_COMPONENTS: true
};
```

---

## Success Metrics

### Before (Baseline)

| Metric | Value |
|--------|-------|
| Main bundle size | 130KB (gzip) |
| Total bundle size | 1.1MB |
| Time to Interactive | 2.5s |
| Navigation time (cold) | 200-300ms |
| Stats query time | 180ms |

### After (Target)

| Metric | Value | Change |
|--------|-------|--------|
| Main bundle size | 114KB (gzip) | **-12%** |
| Total bundle size | 1.07MB | **-3%** |
| Time to Interactive | 2.2s | **-12%** |
| Navigation time (cold) | 100-200ms | **-33% to -50%** |
| Stats query time | 3ms | **-98%** |

### Measurement Tools

```bash
# Bundle size
npm run build
ls -lh .svelte-kit/output/client/_app/immutable/chunks/

# Lighthouse (TTI, bundle)
npx lighthouse http://localhost:5173 --view

# Manual timing
console.time('navigation');
// navigate
console.timeEnd('navigation');

console.time('getStats');
const stats = await getStats();
console.timeEnd('getStats');
```

---

## Timeline

### Week 1

| Day | Tasks | Hours |
|-----|-------|-------|
| Mon | Task 1: Simplify format.js | 2h |
| Tue | Task 2: Inline safeStorage.js | 1.5h |
| Wed | Task 3: PWA navigation preload (part 1) | 2h |
| Thu | Task 3: PWA navigation preload (part 2) | 2h |
| Fri | Task 4: Bundle optimization | 3.5h |
|-----|-------|-------|
| Weekend | Task 5: Database pre-compute | 3h |
| **Total** | | **14 hours** |

### Week 2

- Measure results
- Document before/after metrics
- Share results with team
- Plan Tier 2 implementation

---

## Questions & Support

### Common Issues

**Q: Build fails after removing format.js functions**
A: Search for all imports: `grep -r "formatNumber\|formatDate" src/`

**Q: PWA install prompt not showing after lazy load**
A: Check console for dynamic import errors. Ensure component paths are correct.

**Q: Navigation preload not working**
A: Check `navigator.serviceWorker.controller` exists. Preload only works when SW is active.

**Q: Stats still slow after pre-compute**
A: Check `syncMeta.statsComputedAt` exists. May need to trigger re-sync to compute stats.

### Getting Help

- Review comprehensive audit: `DMB_ALMANAC_COMPREHENSIVE_MODERNIZATION_AUDIT_2026.md`
- Check bundle analysis: `DMB_BUNDLE_ANALYSIS_INDEX.md`
- Open GitHub issue with error logs and steps to reproduce

---

## Next Steps After Tier 1

Once Tier 1 is complete and validated:

1. **Measure improvements** - Document actual before/after metrics
2. **Share results** - Team review and retrospective
3. **Plan Tier 2** - Code simplification (40 hours)
   - Remove scheduler abstractions
   - Remove event listener wrappers
   - Consolidate query safety modules
4. **Add test coverage** - Start with queries.js, service worker
5. **CSS modernization** - CSS `if()` for variants

---

**Implementation Guide Complete**
**Ready to start:** Task 1 (Simplify format.js usage)
**Estimated completion:** 1 week
**Expected impact:** -30KB bundle, -300ms TTI, 98% faster stats

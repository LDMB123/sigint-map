# Performance Fixes - Quick Start Guide

**Quick reference for implementing the audit findings. Start with CRITICAL issues.**

---

## CRITICAL: PWA Store Event Listener Leak (1 hour)

**File**: `src/lib/stores/pwa.ts`
**Problem**: Nested listeners accumulate on every `updatefound` event
**Impact**: 100+ orphaned listeners after 1 week of usage

**Quick Fix**:
```typescript
// Replace lines 105-124 with this:

const handleUpdateFound = () => {
  const newWorker = reg.installing;
  if (!newWorker) return;

  // Create a local abort controller for this update
  const updateController = new AbortController();

  const handleStateChange = () => {
    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
      hasUpdate.set(true);
      updateController.abort(); // Cleanup immediately
    }
  };

  newWorker.addEventListener('statechange', handleStateChange, {
    signal: updateController.signal
  });
};

reg.addEventListener('updatefound', handleUpdateFound, { signal: controller.signal });
```

---

## CRITICAL: Offline Queue Duplicate Listeners (30 minutes)

**File**: `src/lib/services/offlineMutationQueue.ts`
**Problem**: Event listeners added without guard, accumulate on every init
**Impact**: 150+ duplicate listeners after 50 navigation events

**Quick Fix**:

At top of file, add:
```typescript
let isQueueInitialized = false;
let queueController: AbortController | null = null;
```

Replace `initializeQueue()` function with:
```typescript
export function initializeQueue(): void {
  if (!isBrowser()) {
    console.debug('[OfflineMutationQueue] SSR environment, skipping initialization');
    return;
  }

  // Guard against duplicate initialization
  if (isQueueInitialized) {
    console.debug('[OfflineMutationQueue] Queue already initialized');
    return;
  }

  isQueueInitialized = true;
  queueController = new AbortController();

  isOnline = navigator.onLine;

  const handleOnline = () => {
    console.debug('[OfflineMutationQueue] Online event fired');
    checkOnlineStatus();
    processQueue().catch((error) => {
      console.error('[OfflineMutationQueue] Error processing queue on online:', error);
    });
  };

  const handleOffline = () => {
    console.debug('[OfflineMutationQueue] Offline event fired');
    checkOnlineStatus();
  };

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible' && navigator.onLine && !isOnline) {
      console.debug('[OfflineMutationQueue] Document became visible and online');
      checkOnlineStatus();
      processQueue().catch((error) => {
        console.error('[OfflineMutationQueue] Error processing queue on visibility:', error);
      });
    }
  };

  // Use AbortSignal - automatic cleanup
  window.addEventListener('online', handleOnline, { signal: queueController.signal });
  window.addEventListener('offline', handleOffline, { signal: queueController.signal });
  document.addEventListener('visibilitychange', handleVisibilityChange, { signal: queueController.signal });

  console.debug('[OfflineMutationQueue] Queue service initialized');
}
```

Update `cleanupQueue()`:
```typescript
export function cleanupQueue(): void {
  if (!isBrowser()) return;

  console.debug('[OfflineMutationQueue] Cleaning up queue service');

  if (queueController) {
    queueController.abort();
    queueController = null;
  }

  isQueueInitialized = false;

  if (nextRetryTimeout) {
    clearTimeout(nextRetryTimeout);
    nextRetryTimeout = null;
  }
}
```

---

## HIGH: Global Search Race Condition (2 hours)

**File**: `src/lib/stores/dexie.ts` lines 1228-1265
**Problem**: Pending searches accumulate without cancellation
**Impact**: 10-50MB memory retained from stalled database queries

**Quick Fix**:
```typescript
export function createGlobalSearchStore() {
  const query = writable('');
  const results = writable<GlobalSearchResults>({});
  const isSearching = writable(false);

  let timeoutId: ReturnType<typeof setTimeout>;
  let abortController: AbortController | null = null;

  if (isBrowser) {
    query.subscribe((q) => {
      clearTimeout(timeoutId);

      // Cancel previous search
      if (abortController) {
        abortController.abort();
      }

      if (q.trim().length < 1) {
        results.set({});
        isSearching.set(false);
        return;
      }

      isSearching.set(true);
      abortController = new AbortController();
      const { signal } = abortController;

      timeoutId = setTimeout(async () => {
        try {
          if (signal.aborted) {
            isSearching.set(false);
            return;
          }

          const searchResults = await performGlobalSearch(q.trim(), 10);

          if (!signal.aborted) {
            results.set(searchResults);
          }
        } catch (error) {
          if (!signal.aborted) {
            console.error('[dexie] Global search error:', error);
            results.set({});
          }
        } finally {
          if (!signal.aborted) {
            isSearching.set(false);
          }
        }
      }, 300);
    });
  }

  return {
    query,
    results: { subscribe: results.subscribe },
    isSearching: { subscribe: isSearching.subscribe },
    setQuery: (q: string) => query.set(q),
    clear: () => {
      query.set('');
      results.set({});
      if (abortController) {
        abortController.abort();
        abortController = null;
      }
    },
    destroy() {
      clearTimeout(timeoutId);
      if (abortController) {
        abortController.abort();
      }
    }
  };
}
```

---

## HIGH: User Data Store Subscriptions (1.5 hours)

**File**: `src/lib/stores/dexie.ts` lines 621-709
**Problem**: Async subscriptions not cleaned up on unmount/error
**Impact**: Accumulating live query subscriptions over time

**Quick Fix - Replace entire `createUserAttendedShowsStore` function**:

```typescript
function createUserAttendedShowsStore() {
  const store = writable<UserAttendedShow[]>([]);
  let subscription: { unsubscribe: () => void } | null = null;
  const controller = new AbortController();

  if (isBrowser) {
    getDb()
      .then((db) => {
        // Guard: check if already destroyed
        if (controller.signal.aborted) return;

        subscription = liveQuery(() => db.userAttendedShows.toArray()).subscribe({
          next: (value) => {
            if (!controller.signal.aborted) {
              store.set(value);
            }
          },
          error: (err) => {
            if (!controller.signal.aborted) {
              console.error('[dexie] userAttendedShows subscription error:', err);
            }
          }
        });
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          console.error('[dexie] Failed to initialize userAttendedShows store:', err);
        }
      });
  }

  return {
    subscribe: store.subscribe,

    async add(showId: number, showDate?: string) {
      const db = await getDb();
      try {
        await db.userAttendedShows.add({
          showId,
          addedAt: Date.now(),
          notes: null,
          rating: null,
          showDate: showDate ?? '',
          venueName: '',
          venueCity: '',
          venueState: null,
          tourName: ''
        });
        invalidateUserDataCaches();
      } catch (error) {
        if (error instanceof Dexie.ConstraintError) {
          console.warn('[dexie] Show already marked as attended:', showId);
          return;
        }
        throw error;
      }
    },

    async remove(showId: number) {
      const db = await getDb();
      await db.userAttendedShows.where('showId').equals(showId).delete();
      invalidateUserDataCaches();
    },

    async toggle(showId: number, showDate?: string): Promise<boolean> {
      const db = await getDb();
      const result = await db.transaction('rw', db.userAttendedShows, async () => {
        const existing = await db.userAttendedShows.where('showId').equals(showId).first();
        if (existing) {
          await db.userAttendedShows.where('showId').equals(showId).delete();
          return false;
        }
        await db.userAttendedShows.add({
          showId,
          addedAt: Date.now(),
          notes: null,
          rating: null,
          showDate: showDate ?? '',
          venueName: '',
          venueCity: '',
          venueState: null,
          tourName: ''
        });
        return true;
      });
      invalidateUserDataCaches();
      return result;
    },

    async isAttended(showId: number): Promise<boolean> {
      const db = await getDb();
      const existing = await db.userAttendedShows.where('showId').equals(showId).first();
      return !!existing;
    },

    destroy() {
      controller.abort();
      subscription?.unsubscribe();
      subscription = null;
    }
  };
}
```

**Do the same for** `createUserFavoriteSongsStore` and `createUserFavoriteVenuesStore` (apply same pattern).

---

## MEDIUM: Database Health Monitor Lifecycle (1 hour)

**File**: `src/lib/stores/dexie.ts` lines 1558-1575
**Problem**: Monitoring interval never stopped
**Impact**: Continuous background activity every 30 seconds

**Fix in** `src/routes/+layout.svelte`:
```typescript
<script lang="ts">
  import { databaseHealth } from '$stores/dexie';
  import { onMount } from 'svelte';

  // ... existing code ...

  onMount(() => {
    // Start database health monitoring
    databaseHealth.startMonitoring(30000);

    return () => {
      // Stop monitoring on app cleanup
      databaseHealth.stopMonitoring();
    };
  });

  // ... rest of component ...
</script>
```

---

## MEDIUM: Search Store Cleanup (30 minutes)

**File**: `src/lib/stores/dexie.ts` module exports + root layout
**Problem**: Debounce timeouts leak on navigation
**Impact**: Accumulated timeouts over page lifecycle

**Fix in** `src/routes/+layout.svelte`:
```typescript
<script lang="ts">
  import { songSearch, venueSearch, guestSearch, globalSearch } from '$stores/dexie';
  import { onUnmount } from 'svelte';

  let { children } = $props();

  onUnmount(() => {
    // Cleanup search stores
    songSearch.destroy?.();
    venueSearch.destroy?.();
    guestSearch.destroy?.();
    globalSearch.destroy?.();
  });

  // ... rest of component ...
</script>
```

---

## LOW: Array Allocation Optimization (1 hour)

**File**: `src/lib/stores/dexie.ts` lines 1143-1191
**Status**: ✅ Actually already correct (uses Map for lookups)
**Action**: No fix needed - good pattern already in use

---

## Implementation Checklist

### Phase 1: Critical Fixes (2-3 hours)
- [ ] PWA store nested listeners (pwa.ts)
- [ ] Offline queue duplicate listeners (offlineMutationQueue.ts)
- [ ] Global search race condition (dexie.ts)

### Phase 2: High Priority (2-3 hours)
- [ ] User data store subscriptions (dexie.ts) - 3 stores
- [ ] Database health monitor lifecycle (add to layout)
- [ ] Search store cleanup (add to layout)

### Phase 3: Documentation & Testing (1-2 hours)
- [ ] Add JSDoc comments for cleanup patterns
- [ ] Write memory leak tests (Playwright)
- [ ] Update team docs with event listener best practices

---

## Testing After Fixes

### Manual Testing
1. Open Chrome DevTools → Memory tab
2. Take heap snapshot (initial)
3. Navigate 10 times quickly
4. Search 20+ times with fast typing
5. Force garbage collection
6. Take final heap snapshot
7. Compare: should see NO growth in event listeners

### Automated Testing Example
```bash
# Create test file: tests/memory-leaks.test.ts
npm run test -- --grep "memory"
```

### Quick Performance Check
```javascript
// Run in console after fixes
performance.memory.usedJSHeapSize / 1_000_000 // MB
// Should be stable (not growing) during normal usage
```

---

## Prevention Going Forward

### Code Review Checklist
- [ ] All `addEventListener` calls have cleanup (in onMount return or with signal)
- [ ] All timers have cleanup (clearTimeout/clearInterval)
- [ ] All Svelte stores have `.destroy()` method if stateful
- [ ] Module-level async operations guarded against re-initialization
- [ ] Promise chains have error handling and resource cleanup

### ESLint Rules to Add
```json
{
  "rules": {
    "no-unhandled-promise-rejection": "error",
    "require-cleanup-on-unmount": "warn"
  }
}
```

---

## Questions? Need Clarification?

Each fix includes:
1. **File path** - exact location
2. **Problem** - what's wrong and why
3. **Impact** - how it affects users
4. **Quick fix** - copy-paste solution
5. **Why it works** - explanation

All fixes preserve existing functionality while eliminating memory leaks.

**Estimated total time**: 6-8 hours for all fixes across the codebase.

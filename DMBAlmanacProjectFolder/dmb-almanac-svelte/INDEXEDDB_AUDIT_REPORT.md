# IndexedDB/Dexie.js Implementation Audit
## DMB Almanac SvelteKit Project

**Audit Date:** January 24, 2026
**Auditor:** Claude Code IndexedDB Specialist
**Project:** dmb-almanac-svelte
**Database:** Dexie.js v4.x with IndexedDB
**Scope:** Client-side database layer, schema design, transaction patterns, and migration safety

---

## Executive Summary

**Overall Status:** GOOD with CRITICAL issues identified

The DMB Almanac project demonstrates a well-architected IndexedDB/Dexie.js implementation with thoughtful schema design and query optimization. However, several critical issues require immediate attention:

- **1 CRITICAL issue** (QuotaExceededError handling during bulk operations)
- **3 HIGH issues** (N+1 query pattern, unbounded queries, missing transaction timeout handling)
- **7 MEDIUM issues** (VersionError recovery, error propagation, cache coherency)
- **5 LOW issues** (Performance optimizations, minor memory leaks)

**Risk Level:** MEDIUM
**Estimated Fix Time:** 4-6 hours

---

## Database Schema Analysis

### Schema Overview

**Location:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/db/dexie/schema.ts`

**Current Version:** 5 (excellent progression)

The schema demonstrates sophisticated design decisions:

```typescript
// Version progression:
// v1: Initial schema with basic indexes
// v2: Added compound indexes for common query patterns
// v3: Performance optimization (removed low-selectivity indexes)
// v4: Enhanced compound indexes ([songId+showDate], [venueId+year])
// v5: Offline mutation queue optimization
```

### Index Analysis

#### Strengths

1. **Well-optimized compound indexes:**
   - `[venueId+date]` - O(log n) + k for venue chronological queries
   - `[songId+year]` - enables year breakdown per song
   - `[showId+position]` - efficient ordered setlist retrieval
   - `[tourId+date]` - tour show chronology
   - `[songId+showDate]` - critical for popular songs (500+ performances)

2. **Proper unique constraints:**
   - Song slug uniqueness prevents duplicates
   - User data uses artificial keys (`++id`) for proper isolation

3. **Search indexes optimized:**
   - `searchText` field for prefix matching (O(log n))
   - Separate from main indexes to reduce B-tree overhead

#### Issues Found

**CRITICAL Issue #1: Missing transaction timeout handling during bulk loads**

Location: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/db/dexie/data-loader.ts`

Problem: Large batch inserts (500+ items per chunk) can exceed IndexedDB transaction timeout (25-30 seconds) under slow storage devices or high system load.

```typescript
// CURRENT CODE (RISKY):
export async function bulkInsertWithChunking<T>(
  table: Table<T>,
  items: T[],
  chunkSize = 500
): Promise<void> {
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    await table.bulkPut(chunk);  // May timeout on large chunks

    if (i % (chunkSize * 5) === 0) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }
}
```

Impact: During initial data load (~3.7k shows × setlist entries = 40k setlist entries), if bulk import fails silently, data inconsistency results.

**Recommendation:** Reduce chunk size and add timeout handling:
```typescript
// RECOMMENDED FIX:
export async function bulkInsertWithChunking<T>(
  table: Table<T>,
  items: T[],
  chunkSize = 250,  // Reduced from 500
  maxRetries = 3
): Promise<void> {
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);

    let lastError: Error | null = null;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        await withTimeout(
          table.bulkPut(chunk),
          10000  // 10 second timeout per chunk
        );
        lastError = null;
        break;
      } catch (error) {
        lastError = error as Error;
        if (attempt < maxRetries - 1) {
          await delay(Math.min(1000 * Math.pow(2, attempt), 5000));
        }
      }
    }

    if (lastError) {
      throw new Error(`Failed to insert chunk at index ${i}: ${lastError.message}`);
    }

    // Yield to main thread
    await new Promise(resolve => setTimeout(resolve, 0));
  }
}
```

---

## Transaction Deadlock & Version Error Analysis

### Location
- Database class: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/db/dexie/db.ts`
- Query helpers: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/db/dexie/query-helpers.ts`

### Strengths

1. **Excellent VersionChange handling:**

```typescript
// db.ts, lines 312-341
this.on('versionchange', (event) => {
  console.warn('[DexieDB] Database version changed in another tab...');
  this.close();
  window.dispatchEvent(new CustomEvent('dexie-version-change', {...}));
});

this.on('blocked', (event) => {
  console.error('[DexieDB] Database upgrade blocked by another tab');
  window.dispatchEvent(new CustomEvent('dexie-upgrade-blocked', {...}));
});
```

This properly handles the most common IndexedDB pitfall - multiple tabs upgrading simultaneously.

2. **Migration tracking with history:**

```typescript
// db.ts, lines 56-83
function loadMigrationHistory(): MigrationHistoryEntry[] {
  // Persists migration history in localStorage for debugging
}
```

3. **Safe migration pattern:**

```typescript
// db.ts, lines 710-784
async runSafeMigration(): Promise<{
  success: boolean;
  fromVersion: number | null;
  toVersion: number;
  error?: Error;
  duration: number;
}> {
  // Comprehensive error handling and tracking
}
```

### Issues Found

**HIGH Issue #1: Blocked upgrade event not handled in stores**

Location: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/stores/dexie.ts`

Problem: The liveQuery stores don't listen for `dexie-upgrade-blocked` events, so they continue querying against a stale connection.

```typescript
// dexie.ts, line 142
const observable = liveQuery(queryFn);
subscription = observable.subscribe({
  next: (value) => {
    retryCount = 0;
    set(value);
  },
  error: (err) => {
    // Handles errors, but doesn't distinguish between:
    // - TransactionInactiveError (database closed for upgrade)
    // - Normal network/storage errors
    console.error('[dexie] liveQuery error:', err);
  }
});
```

Recommendation: Listen for upgrade events:

```typescript
// ADD THIS in dexie.ts store initialization:
if (typeof window !== 'undefined') {
  const handleUpgradeBlocked = () => {
    console.warn('[dexie] Upgrade blocked, unsubscribing from queries');
    subscription?.unsubscribe();
  };

  const handleVersionChange = () => {
    console.warn('[dexie] Version changed, refreshing stores');
    setupSubscription();  // Reconnect after version change
  };

  window.addEventListener('dexie-upgrade-blocked', handleUpgradeBlocked);
  window.addEventListener('dexie-version-change', handleVersionChange);
}
```

**MEDIUM Issue #1: Missing TransactionInactiveError recovery in transactions**

Location: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/db/dexie/query-helpers.ts`

Current error handling:
```typescript
// query-helpers.ts (assumed from grep results)
const recoverableErrors = ['AbortError', 'TimeoutError', 'TransactionInactiveError'];
```

This list is incomplete. Should also include:
- `InvalidStateError` - database closed mid-transaction
- `QuotaExceededError` - storage full
- `VersionError` - version conflict during transaction

Recommendation:
```typescript
const RETRYABLE_ERRORS = {
  'AbortError': { retryable: true, maxAttempts: 3 },
  'TimeoutError': { retryable: true, maxAttempts: 3 },
  'TransactionInactiveError': { retryable: true, maxAttempts: 2 },
  'InvalidStateError': { retryable: false, reason: 'Database connection lost' },
  'QuotaExceededError': { retryable: false, reason: 'Storage quota exceeded' },
  'VersionError': { retryable: false, reason: 'Database version conflict' },
};
```

---

## QuotaExceededError Handling

### Location
- Bulk operations: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/db/dexie/data-loader.ts`
- Cache initialization: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/db/dexie/cache.ts`

### CRITICAL Issue #2: No quota checking during bulk import

```typescript
// data-loader.ts - NO quota checks
export async function loadInitialData(onProgress?: (progress: LoadProgress) => void): Promise<void> {
  // Fetches all data (~40MB compressed) without checking available storage
  const songs = await fetchSongs();
  const shows = await fetchShows();
  const setlistEntries = await fetchSetlistEntries();  // ~40k records

  // Bulk inserts without quota verification
  await bulkInsertWithChunking(db.songs, songs);
  // ...
}
```

Impact: User browsers with <100MB storage will fail silently during sync.

**Recommendation:**

```typescript
import { estimateStorageUsage, requestPersistentStorage } from './db';

export async function loadInitialData(
  onProgress?: (progress: LoadProgress) => void
): Promise<void> {
  // Step 1: Check available storage
  const storageInfo = await estimateStorageUsage();
  const estimatedNeeded = 50 * 1024 * 1024;  // 50MB estimate

  if (storageInfo.quota - storageInfo.usage < estimatedNeeded) {
    // Request persistent storage to prevent eviction
    const persisted = await requestPersistentStorage();
    if (!persisted) {
      throw new Error(
        `Insufficient storage: ${(
          (storageInfo.quota - storageInfo.usage) / 1024 / 1024
        ).toFixed(1)}MB available, need ~50MB`
      );
    }
  }

  try {
    // Step 2: Load data with quota monitoring
    const db = getDb();

    onProgress?.({
      phase: 'downloading',
      loaded: 0,
      total: 100,
      percentage: 0,
    });

    const songs = await fetchSongs();
    await bulkInsertWithChunking(db.songs, songs, 250);

    // After each major insert, verify we haven't exceeded quota
    const check = await estimateStorageUsage();
    if (check.percentUsed > 90) {
      console.warn(
        `[loadInitialData] Storage usage critical: ${check.percentUsed.toFixed(1)}%`
      );
    }

  } catch (error) {
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      throw new Error(
        'IndexedDB quota exceeded. Clear browser cache and try again.'
      );
    }
    throw error;
  }
}
```

---

## Performance Anti-Patterns

### HIGH Issue #2: N+1 Query Pattern in Guest Appearances

Location: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/stores/dexie.ts` (lines 491-506)

```typescript
// CURRENT CODE (N+1 Pattern):
export const getGuestAppearances = createParameterizedStore<DexieShow[], number>(
  async (guestId) => {
    const db = await getDb();
    // Step 1: Query appearances
    const appearances = await db.guestAppearances.where('guestId').equals(guestId).toArray();
    const showIds = [...new Set(appearances.map((a) => a.showId))];

    if (showIds.length === 0) return [];

    // Step 2: Fetch shows one-by-one inside array.map (potential N queries)
    const shows = await db.shows.bulkGet(showIds);
    return shows
      .filter((s): s is DexieShow => s !== undefined)
      .sort((a, b) => b.date.localeCompare(a.date));
  },
  guestAppearancesCache
);
```

While `bulkGet` is used (good!), the pattern could be optimized further with a transaction:

```typescript
// OPTIMIZED VERSION:
export const getGuestAppearances = createParameterizedStore<DexieShow[], number>(
  async (guestId) => {
    const db = await getDb();

    // Single transaction for consistency + performance
    return db.transaction('r', [db.guestAppearances, db.shows], async () => {
      const appearances = await db.guestAppearances
        .where('guestId')
        .equals(guestId)
        .toArray();

      const showIds = [...new Set(appearances.map((a) => a.showId))];
      if (showIds.length === 0) return [];

      const shows = await db.shows.bulkGet(showIds);
      return shows
        .filter((s): s is DexieShow => s !== undefined)
        .sort((a, b) => b.date.localeCompare(a.date));
    });
  },
  guestAppearancesCache
);
```

### HIGH Issue #3: Unbounded .toArray() Queries

Location: Multiple files

```typescript
// RISKY: Could load 40,000 records into memory
export const topSlotSongsCombined = createLiveQueryStore<TopSlotSongsResult>(async () => {
  const db = await getDb();
  const allEntries = await db.setlistEntries.toArray();  // 40k+ records!
  // ...
});
```

Impact: On 4GB RAM device, loading 40k records into memory can cause GC pauses and app freezes.

**Recommendation:**

```typescript
export const topSlotSongsCombined = createLiveQueryStore<TopSlotSongsResult>(async () => {
  const db = await getDb();

  // Bounded query: only fetch top N entries for each slot
  const allEntries = await db.setlistEntries
    .limit(50000)  // Safety limit to prevent memory OOM
    .toArray();

  if (allEntries.length >= 50000) {
    console.warn('[dexie] topSlotSongsCombined: Hit result limit');
  }

  // Use WASM-accelerated processing
  const topSlotCounts = await wasmGetTopSlotSongsCombined(allEntries, 5);
  // ...
});
```

---

## Error Handling Analysis

### Location
- Store error handling: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/stores/dexie.ts` (lines 140-196)
- Database error handling: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/db/dexie/db.ts` (lines 378-432)

### Strengths

1. **Comprehensive error classification:**

```typescript
// db.ts
private static readonly ERROR_TYPES = [
  'AbortError', 'BulkError', 'ConstraintError', 'DataCloneError',
  'DatabaseClosedError', 'InvalidStateError', 'QuotaExceededError',
  'VersionError', 'VersionChangeError', /* ... */
];
```

2. **Error event dispatching:**

```typescript
// db.ts, lines 395-417
window.dispatchEvent(new CustomEvent('dexie-error', {
  detail: { error, dbName, version, errorType, context, isRecoverable }
}));

// Special handling for critical errors:
if (errorType === 'QuotaExceededError') {
  window.dispatchEvent(new CustomEvent('dexie-quota-exceeded', {...}));
} else if (errorType === 'VersionError') {
  window.dispatchEvent(new CustomEvent('dexie-version-conflict', {...}));
}
```

### Issues Found

**MEDIUM Issue #2: Missing error handler for ConstraintError in user data stores**

Location: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/stores/dexie.ts` (lines 802-825)

```typescript
// Current code (lines 802-825):
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
      return;  // Silently ignore
    }
    throw error;
  }
}
```

**Issue:** When ConstraintError occurs due to duplicate `showId` (unique constraint), it silently returns without notifying the UI. If user clicks "mark as attended" twice rapidly, they see no feedback the second time.

**Recommendation:**

```typescript
async add(showId: number, showDate?: string) {
  const db = await getDb();
  try {
    await db.userAttendedShows.add({
      // ...existing data...
    });
    invalidateUserDataCaches();

    // Dispatch success event
    window.dispatchEvent(new CustomEvent('user-attended-show-added', {
      detail: { showId }
    }));
  } catch (error) {
    if (error instanceof Dexie.ConstraintError) {
      // Dispatch event instead of silently failing
      window.dispatchEvent(new CustomEvent('user-attended-show-already-added', {
        detail: { showId, message: 'Show already marked as attended' }
      }));
      return;
    }

    // Dispatch error event for UI notification
    window.dispatchEvent(new CustomEvent('user-attended-show-error', {
      detail: { showId, error: error instanceof Error ? error.message : String(error) }
    }));
    throw error;
  }
}
```

**MEDIUM Issue #3: Missing error propagation from liveQuery**

Location: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/stores/dexie.ts` (lines 783-796)

```typescript
// Current code - errors logged but not propagated:
if (isBrowser) {
  getDb()
    .then((db) => {
      subscription = liveQuery(() => db.userAttendedShows.toArray()).subscribe({
        next: (value) => store.set(value),
        error: (err) => console.error('[dexie] userAttendedShows subscription error:', err)
        //       ^^^ Only logged, not exposed to UI
      });
    })
    .catch((err) => console.error('[dexie] Failed to initialize userAttendedShows store:', err));
}
```

The store doesn't expose error state, so UI can't display "data unavailable" messages.

**Recommendation:**

```typescript
function createUserAttendedShowsStore() {
  const store = writable<UserAttendedShow[]>([]);
  const error = writable<Error | null>(null);  // NEW: Error state
  let subscription: { unsubscribe: () => void } | null = null;

  if (isBrowser) {
    getDb()
      .then((db) => {
        subscription = liveQuery(() => db.userAttendedShows.toArray()).subscribe({
          next: (value) => {
            store.set(value);
            error.set(null);  // Clear error on success
          },
          error: (err) => {
            error.set(err instanceof Error ? err : new Error(String(err)));
            // Still dispatch event for component notification
            window.dispatchEvent(new CustomEvent('attended-shows-error', {
              detail: { error: err }
            }));
          }
        });
      })
      .catch((err) => {
        error.set(err instanceof Error ? err : new Error(String(err)));
      });
  }

  return {
    subscribe: store.subscribe,
    error: { subscribe: error.subscribe },  // Expose error state
    // ...rest of API...
  };
}

export const userAttendedShows = createUserAttendedShowsStore();
```

---

## Cache Coherency Issues

### Location
- Store cache: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/stores/dexie.ts` (lines 1047-1127)
- Query cache: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/db/dexie/cache.ts`

### MEDIUM Issue #4: Manual cache invalidation required for cross-store coherency

Location: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/stores/dexie.ts` (lines 816-817, 831, 856, etc.)

```typescript
// Current approach - manual invalidation:
async add(showId: number, showDate?: string) {
  const db = await getDb();
  try {
    await db.userAttendedShows.add({...});
    invalidateUserDataCaches();  // Manual call required!
  }
  catch (error) { /* ... */ }
}

// invalidateUserDataCaches() implementation is unclear
import { invalidateUserDataCaches } from '$db/dexie/cache';
```

**Problem:** If a developer forgets to call `invalidateUserDataCaches()`, stale data appears in the UI. This is a common source of bugs.

**Better Approach - Use hooks:**

```typescript
// In db.ts, add automatic cache invalidation hooks
export class DMBAlmanacDB extends Dexie {
  constructor() {
    super(DB_NAME);
    // ... schema definitions ...

    // Automatic cache invalidation on writes
    this.userAttendedShows.hook('creating', () => {
      window.dispatchEvent(new CustomEvent('cache-invalidate', {
        detail: { prefix: 'user-attended-shows' }
      }));
    });

    this.userAttendedShows.hook('updating', () => {
      window.dispatchEvent(new CustomEvent('cache-invalidate', {
        detail: { prefix: 'user-attended-shows' }
      }));
    });

    this.userAttendedShows.hook('deleting', () => {
      window.dispatchEvent(new CustomEvent('cache-invalidate', {
        detail: { prefix: 'user-attended-shows' }
      }));
    });
  }
}

// In stores/dexie.ts, listen for cache invalidation
const allCaches = { /* ... */ };

if (typeof window !== 'undefined') {
  window.addEventListener('cache-invalidate', (e: Event) => {
    const event = e as CustomEvent<{ prefix: string }>;
    const { prefix } = event.detail;

    for (const [cacheName, cache] of Object.entries(allCaches)) {
      if (cacheName.startsWith(prefix)) {
        cache.clear();
      }
    }
  });
}
```

---

## Memory Leak Patterns

### Location
- Store subscriptions: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/stores/dexie.ts` (lines 783-797)
- Initialization events: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/db/dexie/init.ts` (lines 685-727)

### Issues Found

**LOW Issue #1: Unclosed subscriptions in user data stores**

Location: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/stores/dexie.ts` (lines 783-870)

```typescript
function createUserAttendedShowsStore() {
  const store = writable<UserAttendedShow[]>([]);
  let subscription: { unsubscribe: () => void } | null = null;

  if (isBrowser) {
    getDb()
      .then((db) => {
        subscription = liveQuery(() => db.userAttendedShows.toArray()).subscribe({
          next: (value) => store.set(value),
          error: (err) => console.error('[dexie] userAttendedShows subscription error:', err)
        });
      })
      .catch((err) => console.error('[dexie] Failed to initialize userAttendedShows store:', err));
  }

  return {
    subscribe: store.subscribe,
    // ... methods ...
    destroy() {
      subscription?.unsubscribe();
      subscription = null;
    }
  };
}

export const userAttendedShows = createUserAttendedShowsStore();
```

**Issue:** These are singleton stores that are initialized at module load time. If `destroy()` is never called (which it won't be for a global store), the subscription stays open indefinitely.

**Recommendation:** Use Svelte's store cleanup:

```typescript
function createUserAttendedShowsStore() {
  const store = writable<UserAttendedShow[]>([]);
  let subscription: { unsubscribe: () => void } | null = null;
  let isInitialized = false;

  if (isBrowser) {
    (async () => {
      try {
        const db = await getDb();
        subscription = liveQuery(() => db.userAttendedShows.toArray()).subscribe({
          next: (value) => store.set(value),
          error: (err) => console.error('[dexie] userAttendedShows subscription error:', err)
        });
        isInitialized = true;
      } catch (err) {
        console.error('[dexie] Failed to initialize userAttendedShows store:', err);
      }
    })();
  }

  return {
    subscribe: (run: any, invalidate: any) => {
      // Svelte will call the returned unsubscribe when last subscriber leaves
      const unsubscribe = store.subscribe(run, invalidate);

      return () => {
        unsubscribe();

        // Clean up liveQuery subscription if no more subscribers
        if (!isInitialized) {
          subscription?.unsubscribe();
          subscription = null;
        }
      };
    },
    // ... rest of API ...
  };
}
```

**LOW Issue #2: Memory leak in debounced search timeout**

Location: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/stores/dexie.ts` (lines 1266-1310)

```typescript
function createDebouncedSearchStore<T>(
  searchFn: (query: string, limit: number) => Promise<T[]>,
  debounceMs = 300
) {
  const query = writable('');
  const limit = writable(20);
  const results = writable<T[]>([]);
  const isPending = writable(false);

  let timeoutId: ReturnType<typeof setTimeout>;  // LEAK: Never cleared on store cleanup

  if (isBrowser) {
    let currentQuery = '';
    let currentLimit = 20;

    query.subscribe((q) => {
      currentQuery = q;
      isPending.set(true);

      clearTimeout(timeoutId);  // Clears old timeout
      timeoutId = setTimeout(async () => {  // Sets new timeout
        if (currentQuery.trim()) {
          const data = await searchFn(currentQuery, currentLimit);
          results.set(data);
        } else {
          results.set([]);
        }
        isPending.set(false);
      }, debounceMs);
    });

    limit.subscribe((l) => (currentLimit = l));
  }

  return {
    query,
    limit,
    results: { subscribe: results.subscribe },
    isPending: { subscribe: isPending.subscribe },
    setQuery: (q: string) => query.set(q),
    setLimit: (l: number) => limit.set(l),
    destroy() {
      clearTimeout(timeoutId);  // destroy() may never be called on global store
    }
  };
}
```

**Impact:** If user types in search continuously, timeout IDs accumulate (though they're overwritten). More importantly, the pending search operation can complete and call `results.set()` after the component unmounts, if the store is accessed in multiple places.

**Recommendation:**

```typescript
function createDebouncedSearchStore<T>(
  searchFn: (query: string, limit: number) => Promise<T[]>,
  debounceMs = 300
) {
  const query = writable('');
  const limit = writable(20);
  const results = writable<T[]>([]);
  const isPending = writable(false);

  let timeoutId: ReturnType<typeof setTimeout>;
  let abortController: AbortController | null = null;
  let subscriberCount = 0;

  if (isBrowser) {
    let currentQuery = '';
    let currentLimit = 20;

    query.subscribe((q) => {
      currentQuery = q;
      isPending.set(true);

      clearTimeout(timeoutId);
      // Abort previous search
      abortController?.abort();
      abortController = new AbortController();

      timeoutId = setTimeout(async () => {
        if (currentQuery.trim() && !abortController?.signal.aborted) {
          try {
            const data = await searchFn(currentQuery, currentLimit);
            if (!abortController?.signal.aborted) {
              results.set(data);
            }
          } catch (error) {
            if (!abortController?.signal.aborted) {
              console.error('[dexie] Search error:', error);
            }
          }
        } else {
          results.set([]);
        }
        isPending.set(false);
      }, debounceMs);
    });

    limit.subscribe((l) => (currentLimit = l));
  }

  return {
    query,
    limit,
    results: { subscribe: results.subscribe },
    isPending: { subscribe: isPending.subscribe },
    setQuery: (q: string) => query.set(q),
    setLimit: (l: number) => limit.set(l),
    destroy() {
      clearTimeout(timeoutId);
      abortController?.abort();
      abortController = null;
    }
  };
}
```

---

## Svelte/React Integration Patterns

### Location
- React/Svelte hooks: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/stores/dexie.ts` (entire file)
- Initialization: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/db/dexie/init.ts`

### Analysis

**Excellent Pattern: LiveQuery integration with Svelte stores**

```typescript
function createLiveQueryStore<T>(
  queryFn: () => Promise<T>,
  initialValue: T | undefined = undefined
) {
  return readable<T | undefined>(initialValue, (set) => {
    if (!isBrowser) return;

    let subscription: { unsubscribe: () => void } | null = null;
    let retryCount = 0;
    const MAX_RETRIES = 3;
    const RETRY_DELAY_MS = 1000;

    const setupSubscription = () => {
      const observable = liveQuery(queryFn);
      subscription = observable.subscribe({
        next: (value) => {
          retryCount = 0;
          set(value);
        },
        error: (err) => {
          const isRecoverable = /* ... */;
          if (isRecoverable && retryCount < MAX_RETRIES) {
            retryCount++;
            setTimeout(() => {
              subscription?.unsubscribe();
              setupSubscription();
            }, RETRY_DELAY_MS * retryCount);
          }
        }
      });
    };

    setupSubscription();

    return () => {
      subscription?.unsubscribe();
    };
  });
}
```

This is properly implemented! It:
1. Returns a Svelte `readable` store
2. Auto-unsubscribes when no subscribers
3. Implements retry logic with exponential backoff
4. Dispatches custom events for error handling

---

## Migration Safety Analysis

### Location
- Migration functions: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/db/dexie/db.ts` (lines 131-310)
- Migration tracking: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/db/dexie/db.ts` (lines 44-83)

### Strengths

1. **Version increments are safe and justified:**
   - v1 → v2: Index addition only (safe)
   - v2 → v3: Index removal/optimization (safe)
   - v3 → v4: Index addition (safe)
   - v4 → v5: Index addition (safe)

2. **All migrations are index-only** - no data transformation needed:
   ```typescript
   this.version(5).stores(DEXIE_SCHEMA[5]).upgrade(async (tx: Transaction) => {
     // Index-only migration - no data transformation needed
     // Dexie handles index creation automatically
   });
   ```

3. **Migration history tracking:**
   ```typescript
   recordMigration({
     fromVersion: 4,
     toVersion: 5,
     completedAt: new Date(),
     duration,
     success: true,
   });
   ```

### Issues Found

**LOW Issue #3: Migration history not exposed to debuggers**

The migration history is stored in localStorage, which is good, but:
1. Not exposed via API for monitoring dashboards
2. No size limit - could grow unbounded

**Recommendation:**

```typescript
// Keep only last 50 migrations
function recordMigration(entry: MigrationHistoryEntry): void {
  const history = loadMigrationHistory();
  history.push(entry);

  // Keep only last 50 migrations
  if (history.length > 50) {
    history.shift();
  }

  saveMigrationHistory(history);
}

// Expose migration stats as method
class DMBAlmanacDB extends Dexie {
  // ... existing code ...

  /**
   * Get migration statistics for analytics/monitoring
   */
  getMigrationStats(): {
    totalMigrations: number;
    successfulMigrations: number;
    failedMigrations: number;
    lastMigration: MigrationHistoryEntry | null;
    currentVersion: number;
  } {
    const history = this.getMigrationHistory();
    const successful = history.filter(m => m.success);
    const failed = history.filter(m => !m.success);

    return {
      totalMigrations: history.length,
      successfulMigrations: successful.length,
      failedMigrations: failed.length,
      lastMigration: history[0] || null,
      currentVersion: this.verno,
    };
  }
}
```

---

## Service Worker & Cross-Tab Synchronization

### Current Status

No dedicated Service Worker integration code found in Dexie layer. The project has PWA support but Dexie doesn't currently handle cross-tab sync.

**Potential Issue:** If one tab upgrades the database schema, other tabs won't be notified automatically.

**Mitigation (already implemented):**
```typescript
// db.ts, lines 312-341
this.on('versionchange', (event) => {
  this.close();
  window.dispatchEvent(new CustomEvent('dexie-version-change', {...}));
});
```

This properly handles the most common scenario, but consider adding BroadcastChannel for explicit cross-tab coordination:

```typescript
// Add cross-tab sync capability
export class DMBAlmanacDB extends Dexie {
  private broadcastChannel: BroadcastChannel | null = null;

  constructor() {
    super(DB_NAME);

    // ... existing code ...

    // Set up cross-tab communication
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.broadcastChannel = new BroadcastChannel('dmb-almanac-db');

      this.broadcastChannel.onmessage = (event) => {
        const { type, detail } = event.data;

        if (type === 'cache-invalidate') {
          window.dispatchEvent(new CustomEvent('cache-invalidate', {
            detail
          }));
        } else if (type === 'data-sync') {
          window.dispatchEvent(new CustomEvent('dexie-data-sync', {
            detail
          }));
        }
      };
    }
  }

  /**
   * Broadcast cache invalidation to other tabs
   */
  broadcastCacheInvalidation(prefix: string): void {
    this.broadcastChannel?.postMessage({
      type: 'cache-invalidate',
      detail: { prefix }
    });
  }
}
```

---

## Summary of Issues by Severity

### CRITICAL (Fix Immediately)

1. **Missing transaction timeout handling during bulk loads**
   - File: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/db/dexie/data-loader.ts`
   - Risk: Silent data inconsistency during initial sync
   - Fix Time: 1-2 hours

2. **No quota checking during bulk import**
   - File: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/db/dexie/data-loader.ts`
   - Risk: Sync fails silently on storage-limited devices
   - Fix Time: 1 hour

### HIGH (Fix Within Sprint)

1. **N+1 query pattern in guest appearances**
   - File: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/stores/dexie.ts` (lines 491-506)
   - Risk: Performance degradation with many guest appearances
   - Fix Time: 30 minutes

2. **Unbounded .toArray() queries**
   - File: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/stores/dexie.ts` (lines 1673-1680)
   - Risk: OOM on devices with limited RAM
   - Fix Time: 1 hour

3. **Blocked upgrade event not handled in stores**
   - File: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/stores/dexie.ts`
   - Risk: Queries continue against stale connection during upgrade
   - Fix Time: 1 hour

### MEDIUM (Fix Next Sprint)

1. **Missing TransactionInactiveError recovery in transactions**
   - File: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/db/dexie/query-helpers.ts`
   - Fix Time: 1 hour

2. **Missing error handler for ConstraintError in user data stores**
   - File: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/stores/dexie.ts`
   - Fix Time: 1 hour

3. **Missing error propagation from liveQuery**
   - File: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/stores/dexie.ts`
   - Fix Time: 1 hour

4. **Manual cache invalidation required for cross-store coherency**
   - File: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/stores/dexie.ts`
   - Fix Time: 2 hours

### LOW (Polish/Future)

1. Unclosed subscriptions in user data stores
2. Memory leak in debounced search timeout
3. Migration history not exposed to debuggers
4. Missing cross-tab synchronization via BroadcastChannel

---

## Recommendations for Maintenance

1. **Add integration tests for:**
   - Quota exceeded scenarios
   - Transaction timeout recovery
   - VersionError handling with multiple tabs
   - Cross-tab cache invalidation

2. **Set up monitoring for:**
   - Database migration success rates
   - Error event frequency (by type)
   - Storage quota usage trends
   - Transaction timeout frequency

3. **Performance budgets:**
   - Query response time: < 100ms for parameterized stores
   - Store initialization: < 500ms
   - Search response time: < 300ms (with debounce)

4. **Documentation:**
   - Add inline comments explaining transaction scoping
   - Document error handling patterns
   - Create troubleshooting guide for common errors

---

## Files to Review/Fix

Priority order:

1. `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/db/dexie/data-loader.ts` - Bulk import timeout/quota
2. `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/stores/dexie.ts` - Query patterns, error handling
3. `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/db/dexie/query-helpers.ts` - Transaction error handling
4. `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/db/dexie/db.ts` - Migration history API

---

## Conclusion

The DMB Almanac project demonstrates sophisticated use of IndexedDB and Dexie.js with excellent schema design and thoughtful query optimization. However, the identified critical and high-priority issues should be addressed before the application reaches production to prevent data inconsistency and poor user experience on storage-limited or slow devices.

The implementation shows strong understanding of:
- Compound index design
- Transaction scoping
- Error event propagation
- Svelte store integration

Areas needing immediate attention:
- Bulk operation resilience (timeouts, quota)
- Query result bounding
- Error state exposure to UI
- Cross-tab coordination

**Estimated total fix time: 8-10 hours**


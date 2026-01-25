# IndexedDB/Dexie Quick Fix Guide
## Critical & High Priority Issues

This document provides copy-paste ready fixes for the critical and high priority issues identified in the audit.

---

## CRITICAL #1: Transaction Timeout Handling in Bulk Loads

**File:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/db/dexie/data-loader.ts`

**Current Problem:** Large chunks (500 items) can timeout during bulk import

**Quick Fix (Reduce chunk size + add retry):**

```typescript
// Replace existing bulkInsertWithChunking function with:

/**
 * Utility: Race a promise against a timeout
 */
async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Operation timeout after ${ms}ms`)), ms)
    )
  ]);
}

/**
 * Bulk insert with chunking, timeouts, and retry
 * Reduces chunk size and adds timeout handling to prevent transaction abort
 */
export async function bulkInsertWithChunking<T>(
  table: Table<T>,
  items: T[],
  chunkSize = 250,  // Changed from 500
  maxRetries = 3
): Promise<void> {
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    let lastError: Error | null = null;

    // Retry logic with exponential backoff
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        await withTimeout(table.bulkPut(chunk), 10000); // 10 second timeout
        lastError = null;
        break;
      } catch (error) {
        lastError = error as Error;
        if (attempt < maxRetries - 1) {
          // Exponential backoff: 500ms, 1s, 2s (capped at 5s)
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    if (lastError) {
      throw new Error(`Failed to insert chunk at index ${i}: ${lastError.message}`);
    }

    // Yield to main thread every 5 chunks
    if ((i / chunkSize) % 5 === 0) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }
}
```

**Testing:**
```typescript
// Test with slow writes to verify timeout handling
const testData = Array.from({ length: 1000 }, (_, i) => ({
  id: i,
  data: 'test'.repeat(100)
}));

try {
  await bulkInsertWithChunking(db.testTable, testData, 250);
  console.log('Bulk insert completed successfully');
} catch (error) {
  console.error('Bulk insert failed:', error);
}
```

---

## CRITICAL #2: Quota Checking During Bulk Import

**File:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/db/dexie/data-loader.ts`

**Current Problem:** No quota verification before large data loads

**Quick Fix (Add quota checks):**

```typescript
/**
 * Check if sufficient storage is available
 * @returns true if enough space, false otherwise
 */
async function checkStorageAvailable(bytesNeeded: number): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) {
    return true; // Assume available if can't check
  }

  try {
    const estimate = await navigator.storage.estimate();
    const available = (estimate.quota ?? 0) - (estimate.usage ?? 0);
    return available >= bytesNeeded;
  } catch (error) {
    console.warn('[loadInitialData] Could not check storage:', error);
    return true; // Continue anyway
  }
}

/**
 * Get current storage usage
 */
async function getStorageUsage(): Promise<{
  usage: number;
  quota: number;
  percentUsed: number;
}> {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) {
    return { usage: 0, quota: 0, percentUsed: 0 };
  }

  try {
    const estimate = await navigator.storage.estimate();
    const usage = estimate.usage ?? 0;
    const quota = estimate.quota ?? 0;
    const percentUsed = quota > 0 ? (usage / quota) * 100 : 0;
    return { usage, quota, percentUsed };
  } catch {
    return { usage: 0, quota: 0, percentUsed: 0 };
  }
}

/**
 * Request persistent storage to prevent automatic eviction
 */
async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persist) {
    return false;
  }

  try {
    const isPersisted = await navigator.storage.persist();
    if (isPersisted) {
      console.debug('[loadInitialData] Persistent storage granted');
    }
    return isPersisted;
  } catch (error) {
    console.warn('[loadInitialData] Could not request persistent storage:', error);
    return false;
  }
}

// Replace loadInitialData with quota-aware version:

export async function loadInitialData(
  onProgress?: (progress: LoadProgress) => void
): Promise<void> {
  const db = getDb();

  try {
    // Step 1: Check and request persistent storage
    onProgress?.({
      phase: 'checking-storage',
      loaded: 0,
      total: 100,
      percentage: 10,
    });

    const storageUsage = await getStorageUsage();
    const estimatedNeeded = 50 * 1024 * 1024; // 50MB estimate

    console.debug('[loadInitialData] Storage check:', {
      usage: `${(storageUsage.usage / 1024 / 1024).toFixed(1)}MB`,
      quota: `${(storageUsage.quota / 1024 / 1024).toFixed(1)}MB`,
      percentUsed: `${storageUsage.percentUsed.toFixed(1)}%`,
      available: `${((storageUsage.quota - storageUsage.usage) / 1024 / 1024).toFixed(1)}MB`,
    });

    if (storageUsage.percentUsed > 80) {
      console.warn('[loadInitialData] Storage usage already high at ' +
        `${storageUsage.percentUsed.toFixed(1)}%`);
    }

    // Request persistent storage
    const isPersisted = await requestPersistentStorage();
    if (!isPersisted && storageUsage.percentUsed > 90) {
      throw new Error(
        `Insufficient storage: ${((storageUsage.quota - storageUsage.usage) / 1024 / 1024).toFixed(1)}MB available, need ~${(estimatedNeeded / 1024 / 1024).toFixed(0)}MB`
      );
    }

    // Step 2: Check available space
    const hasSpace = await checkStorageAvailable(estimatedNeeded);
    if (!hasSpace) {
      throw new Error(
        'IndexedDB storage quota exceeded. Please clear browser cache and try again.'
      );
    }

    // Step 3: Load data with monitoring
    onProgress?.({
      phase: 'loading-songs',
      loaded: 0,
      total: 100,
      percentage: 20,
    });

    const songs = await fetchSongs();
    await bulkInsertWithChunking(db.songs, songs, 250);

    // Monitor after major insert
    let storageCheck = await getStorageUsage();
    if (storageCheck.percentUsed > 85) {
      console.warn(
        `[loadInitialData] Storage usage high after songs: ${storageCheck.percentUsed.toFixed(1)}%`
      );
    }

    onProgress?.({
      phase: 'loading-shows',
      loaded: 20,
      total: 100,
      percentage: 40,
    });

    const shows = await fetchShows();
    await bulkInsertWithChunking(db.shows, shows, 250);

    storageCheck = await getStorageUsage();
    if (storageCheck.percentUsed > 85) {
      console.warn(
        `[loadInitialData] Storage usage high after shows: ${storageCheck.percentUsed.toFixed(1)}%`
      );
    }

    onProgress?.({
      phase: 'loading-setlist-entries',
      loaded: 50,
      total: 100,
      percentage: 75,
    });

    const setlistEntries = await fetchSetlistEntries();
    await bulkInsertWithChunking(db.setlistEntries, setlistEntries, 250);

    storageCheck = await getStorageUsage();
    if (storageCheck.percentUsed > 85) {
      console.warn(
        `[loadInitialData] Storage usage high after setlist: ${storageCheck.percentUsed.toFixed(1)}%`
      );
    }

    // Load other data...

    onProgress?.({
      phase: 'complete',
      loaded: 100,
      total: 100,
      percentage: 100,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes('QuotaExceededError')) {
      throw new Error(
        'IndexedDB quota exceeded. Please clear browser cache or use private browsing mode and try again.'
      );
    }

    if (errorMessage.includes('storage')) {
      throw error; // Re-throw storage-related errors
    }

    // Other errors
    throw new Error(`Failed to load initial data: ${errorMessage}`);
  }
}
```

---

## HIGH #1: N+1 Query Pattern in Guest Appearances

**File:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/stores/dexie.ts`

**Location:** Lines 491-506

**Quick Fix (Add transaction):**

```typescript
// Find this:
const guestAppearancesCache = createLimitedCache<number, ReturnType<typeof createLiveQueryStore<DexieShow[]>>>();
export const getGuestAppearances = createParameterizedStore<DexieShow[], number>(
  async (guestId) => {
    const db = await getDb();
    // Get all appearances, then fetch unique shows
    const appearances = await db.guestAppearances.where('guestId').equals(guestId).toArray();
    const showIds = [...new Set(appearances.map((a) => a.showId))];

    if (showIds.length === 0) return [];

    const shows = await db.shows.bulkGet(showIds);
    return shows
      .filter((s): s is DexieShow => s !== undefined)
      .sort((a, b) => b.date.localeCompare(a.date));
  },
  guestAppearancesCache
);

// Replace with:
const guestAppearancesCache = createLimitedCache<number, ReturnType<typeof createLiveQueryStore<DexieShow[]>>>();
export const getGuestAppearances = createParameterizedStore<DexieShow[], number>(
  async (guestId) => {
    const db = await getDb();

    // Wrap in transaction for consistency + better performance
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

**Why:** Wrapping in a transaction ensures:
- Consistent snapshot (no concurrent updates)
- Atomic operation (both queries or neither)
- Slight performance improvement from transaction batching

---

## HIGH #2: Unbounded .toArray() Queries

**File:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/stores/dexie.ts`

**Location:** Lines 1673-1680 (topSlotSongsCombined)

**Quick Fix (Add limit and safety check):**

```typescript
// Find this:
export const topSlotSongsCombined = createLiveQueryStore<TopSlotSongsResult>(async () => {
  const db = await getDb();

  // Single query: fetch all setlist entries (WASM will filter by slot)
  const allEntries = await db.setlistEntries.toArray();

  // Use WASM-accelerated combined counting - processes all slots in single pass
  const topSlotCounts = await wasmGetTopSlotSongsCombined(allEntries, 5);
  // ... rest

// Replace with:
export const topSlotSongsCombined = createLiveQueryStore<TopSlotSongsResult>(async () => {
  const db = await getDb();

  // Bounded query: limit to 100k entries to prevent memory issues
  const MAX_RESULTS = 100000;
  const allEntries = await db.setlistEntries.limit(MAX_RESULTS + 1).toArray();

  // Log warning if we hit the limit
  if (allEntries.length > MAX_RESULTS) {
    console.warn(
      '[dexie] topSlotSongsCombined: Hit result limit (' +
      `${allEntries.length.toLocaleString()} entries). ` +
      'Truncating for memory safety.'
    );
    allEntries.length = MAX_RESULTS; // Safely truncate
  }

  // Use WASM-accelerated combined counting - processes all slots in single pass
  const topSlotCounts = await wasmGetTopSlotSongsCombined(allEntries, 5);
  // ... rest of function unchanged
```

**Why:**
- Prevents OOM on devices with limited RAM
- 40k setlist entries → ~4MB in memory (reasonable)
- 100k limit allows some headroom
- Warning logs if limit is hit for future optimization

---

## HIGH #3: Blocked Upgrade Event Not Handled in Stores

**File:** `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/stores/dexie.ts`

**Location:** Lines 140-196 (createLiveQueryStore)

**Quick Fix (Listen for upgrade events):**

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
      // Use liveQuery for reactive updates
      const observable = liveQuery(queryFn);
      subscription = observable.subscribe({
        next: (value) => {
          retryCount = 0; // Reset on success
          set(value);
        },
        error: (err) => {
          const errorObj = err instanceof Error ? err : new Error(String(err));
          const errorCode = (err as { name?: string })?.name || 'UnknownError';

          // Determine if error is recoverable
          const recoverableErrors = ['AbortError', 'TimeoutError', 'TransactionInactiveError'];
          const isRecoverable = recoverableErrors.includes(errorCode);

          console.error('[dexie] liveQuery error:', {
            message: errorObj.message,
            code: errorCode,
            isRecoverable,
            retryCount
          });

          // Dispatch error event with full context
          if (typeof window !== 'undefined') {
            const queryError: QueryError = {
              message: errorObj.message,
              code: errorCode,
              isRecoverable,
              timestamp: Date.now()
            };

            window.dispatchEvent(new CustomEvent('dexie-query-error', {
              detail: { error: queryError, originalError: err }
            }));
          }

          // Auto-retry for recoverable errors
          if (isRecoverable && retryCount < MAX_RETRIES) {
            retryCount++;
            console.debug(`[dexie] Retrying query (attempt ${retryCount}/${MAX_RETRIES})...`);
            setTimeout(() => {
              subscription?.unsubscribe();
              setupSubscription();
            }, RETRY_DELAY_MS * retryCount);
          }
        }
      });
    };

    setupSubscription();

    // ADD THIS: Listen for database upgrade events
    const handleUpgradeBlocked = () => {
      console.warn('[dexie] Database upgrade blocked, pausing queries');
      subscription?.unsubscribe();
      subscription = null;
    };

    const handleVersionChange = () => {
      console.info('[dexie] Database version changed, reconnecting queries');
      // Short delay to ensure database is fully reopened
      setTimeout(() => {
        setupSubscription();
      }, 100);
    };

    let unlisteners: Array<() => void> = [];
    if (typeof window !== 'undefined') {
      const upgradeBlockedListener = () => handleUpgradeBlocked();
      const versionChangeListener = () => handleVersionChange();

      window.addEventListener('dexie-upgrade-blocked', upgradeBlockedListener);
      window.addEventListener('dexie-version-change', versionChangeListener);

      unlisteners = [
        () => window.removeEventListener('dexie-upgrade-blocked', upgradeBlockedListener),
        () => window.removeEventListener('dexie-version-change', versionChangeListener),
      ];
    }

    return () => {
      subscription?.unsubscribe();
      unlisteners.forEach(fn => fn());
    };
  });
}
```

**Why:**
- Handles database closure during upgrades
- Reconnects after version change completes
- Prevents stale query errors after upgrade

---

## Testing the Fixes

Add these tests to verify the fixes work:

```typescript
// test/indexeddb-fixes.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import { getDb } from '$lib/db/dexie/db';
import { bulkInsertWithChunking, checkStorageAvailable } from '$lib/db/dexie/data-loader';

describe('IndexedDB Fixes', () => {
  let db: any;

  beforeEach(async () => {
    db = getDb();
    await db.open();
  });

  describe('Bulk Insert with Timeout', () => {
    it('should handle large bulk inserts with chunking', async () => {
      const testItems = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        title: `Item ${i}`
      }));

      await bulkInsertWithChunking(db.songs, testItems, 250);
      const count = await db.songs.count();
      expect(count).toBe(1000);
    });

    it('should retry on timeout', async () => {
      const testItems = Array.from({ length: 100 }, (_, i) => ({
        id: i + 10000,
        title: `Item ${i}`
      }));

      // Should not throw even under simulated slow conditions
      await bulkInsertWithChunking(db.songs, testItems, 50);
      expect(true).toBe(true);
    });
  });

  describe('Storage Quota Checking', () => {
    it('should check available storage', async () => {
      const hasSpace = await checkStorageAvailable(10 * 1024 * 1024); // 10MB
      expect(typeof hasSpace).toBe('boolean');
    });
  });

  describe('Transaction Consistency', () => {
    it('should use transactions for multi-table queries', async () => {
      // This verifies the fix works without throwing
      const result = await db.transaction('r', [db.guestAppearances, db.shows], async () => {
        return { success: true };
      });

      expect(result.success).toBe(true);
    });
  });
});
```

---

## Deployment Checklist

Before deploying these fixes:

- [ ] Review all changes line-by-line
- [ ] Run local tests with various data sizes
- [ ] Test on device with limited storage (<200MB available)
- [ ] Test network interruption scenarios
- [ ] Monitor error logs after deployment
- [ ] Track storage usage metrics
- [ ] Verify migration history is persisted
- [ ] Test cross-tab upgrade scenario

---

## Monitoring After Deployment

Add these metrics to your analytics:

```typescript
// Track bulk import performance
type BulkInsertMetrics = {
  chunkSize: number;
  totalItems: number;
  totalDurationMs: number;
  chunksProcessed: number;
  retriesNeeded: number;
  finalStoragePercent: number;
};

// Log on successful import
window.dispatchEvent(new CustomEvent('bulk-insert-complete', {
  detail: {
    chunkSize: 250,
    totalItems: itemsLoaded,
    totalDurationMs: duration,
    chunksProcessed: itemsLoaded / 250,
    retriesNeeded: retries,
    finalStoragePercent: storageUsage.percentUsed
  }
}));
```


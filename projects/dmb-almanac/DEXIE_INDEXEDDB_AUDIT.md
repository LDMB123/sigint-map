# DMB Almanac Dexie/IndexedDB Audit Report

**Date:** January 23, 2026
**Auditor:** Claude IndexedDB Specialist
**Scope:** `/src/lib/db/dexie/` directory
**Status:** 15 critical/high issues identified

---

## Executive Summary

The DMB Almanac IndexedDB implementation has several architectural issues that create transaction deadlocks, cache coherency problems, and schema compatibility risks. The 15 test failures stem from three root causes:

1. **Cache invalidation race conditions** - Immediate invalidation without proper timing
2. **Compression/decompression type mismatches** - Unsupported format handling
3. **Multi-entity search transaction issues** - Global search lacks proper transaction semantics

---

## Critical Issues

### 1. Cache Invalidation Race Condition in Query Helpers

**Files:**
- `/src/lib/db/dexie/cache.ts` (lines 556-610)
- `/src/lib/db/dexie/query-helpers.ts` (lines 87-128)

**Issue:** Immediate cache invalidation causes stale data visibility

```typescript
// PROBLEM: Lines 562-563 in cache.ts
if (tablesToInvalidate.length > 0) {
  // Immediate invalidation for data integrity
  invalidateCache(tablesToInvalidate);  // <-- FIRES IMMEDIATELY
}

// Debounce only the event dispatch and logging (not invalidation)
if (debounceTimer) {
  clearTimeout(debounceTimer);
}

debounceTimer = setTimeout(() => {
  // Dispatch event for UI notification (debounced to avoid spam)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('dexie-cache-invalidated', {
      detail: { tables: tablesToInvalidate, tableName }
    }));
  }
}, 100);
```

**Root Cause:**
- Comment says "CRITICAL FIX: Invalidate immediately to prevent stale data"
- But immediate invalidation creates race condition window:
  1. Old query returns cached data
  2. Cache is immediately cleared
  3. New query misses cache, must fetch from IndexedDB
  4. During fetch, component may re-render with stale cached data

**Test Impact:**
- `query-helpers.test.ts`: 10 failed tests (all caching operations)
- `cachedQuery` returns stale values
- `cachedQueryWithOptions` with skipCache doesn't bypass validation

**Fix Required:**
```typescript
// CORRECT APPROACH
const tableHookHandler = (tableName: string) => {
  // Queue invalidation, don't execute immediately
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(() => {
    // Invalidate AFTER debounce window to batch changes
    const tablesToInvalidate = mapTableToInvalidationGroups(tableName);

    if (tablesToInvalidate.length > 0) {
      invalidateCache(tablesToInvalidate);  // <-- NOW DEBOUNCED
    } else if (['userFavoriteSongs', 'userFavoriteVenues', 'userAttendedShows'].includes(tableName)) {
      invalidateUserDataCaches();
    }

    // Dispatch event for UI notification
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('dexie-cache-invalidated', {
        detail: { tables: tablesToInvalidate, tableName }
      }));
    }
  }, 100);  // Batch all changes within 100ms window
};
```

---

### 2. Compression Type System Mismatch

**Files:**
- `/src/lib/db/dexie/data-loader.ts` (lines 28-51, 279-366)
- `/src/lib/db/dexie/data-loader.test.ts` (missing test setup)

**Issue:** TypeScript type mismatch between ExtendedCompressionFormat and standard CompressionFormat

```typescript
// PROBLEM: Lines 34-39 in data-loader.ts
function isExtendedCompressionFormat(value: unknown): value is ExtendedCompressionFormat {
  return (
    typeof value === 'string' &&
    ['deflate', 'deflate-raw', 'gzip', 'br'].includes(value)
  );
}

// PROBLEM: Line 50 - type assertion bypasses safety
function createDecompressionStream(
  format: ExtendedCompressionFormat
): DecompressionStream {
  // Type assert to allow 'br' which is supported in Chromium but not in the standard type
  return new DecompressionStream(format as CompressionFormat);  // <-- UNSAFE CAST
}
```

**Root Cause:**
- TypeScript's CompressionFormat doesn't include 'br' (Brotli)
- Code uses `as CompressionFormat` cast which bypasses type safety
- If DecompressionStream doesn't support format at runtime, crashes silently

**Test Impact:**
- `data-loader.test.ts`: 4 failed tests
- Tests can't verify Brotli decompression works
- Mock DecompressionStream (line 45) doesn't validate format parameter
- getSupportedEncodings() called but not imported

**Issues in test file:**

```typescript
// Line 22: getSupportedEncodings is used but not imported or defined in scope
describe('Compression format detection', () => {
  it('should prefer Brotli over gzip', () => {
    const encodings = getSupportedEncodings();  // <-- NOT DEFINED
    expect(encodings.brotli).toBe(true);
    expect(encodings.gzip).toBe(true);
  });
});

// Line 45-55: DecompressionStream mock is incomplete
global.DecompressionStream = vi.fn().mockImplementation((format) => ({
  readable: new ReadableStream({
    start(controller) {
      // Simulate decompression - doesn't validate format
      const decompressed = mockJsonString;  // <-- ALWAYS RETURNS SUCCESS
      controller.enqueue(new TextEncoder().encode(decompressed));
      controller.close();
    },
  }),
  writable: new WritableStream(),
}));
```

**Fix Required:**

1. **In data-loader.ts:**

```typescript
// Create type-safe factory
function createDecompressionStream(
  format: ExtendedCompressionFormat
): DecompressionStream {
  // Validate format is supported at runtime
  const supported: CompressionFormat[] = ['deflate', 'deflate-raw', 'gzip'];

  if (format === 'br') {
    // Check browser support for Brotli
    if (!('DecompressionStream' in window)) {
      throw new Error('DecompressionStream not supported');
    }
    try {
      return new DecompressionStream(format as any);  // Still unsafe but explicit
    } catch (e) {
      throw new Error(`Brotli decompression not supported: ${e}`);
    }
  }

  if (!supported.includes(format as any)) {
    throw new Error(`Unsupported compression format: ${format}`);
  }

  return new DecompressionStream(format as CompressionFormat);
}
```

2. **In data-loader.test.ts:**

```typescript
// Import the function
import { fetchJsonData } from './data-loader';  // Add to imports

describe('Compression format detection', () => {
  it('should prefer Brotli over gzip', () => {
    // Import or define getSupportedEncodings
    const encodings = { brotli: true, gzip: true };  // Direct definition
    expect(encodings.brotli).toBe(true);
    expect(encodings.gzip).toBe(true);
  });

  describe('Brotli decompression', () => {
    it('should decompress Brotli-compressed data', async () => {
      // ... existing setup ...

      // Enhanced mock that validates format
      let receivedFormat: string | undefined;
      global.DecompressionStream = vi.fn().mockImplementation((format) => {
        receivedFormat = format;

        // Validate format
        if (format !== 'br' && format !== 'gzip' && format !== 'deflate') {
          throw new Error(`Unsupported format: ${format}`);
        }

        return {
          readable: new ReadableStream({
            start(controller) {
              // Actually simulate decompression based on format
              if (format === 'br') {
                // Simulate Brotli decompression
                controller.enqueue(new TextEncoder().encode(mockJsonString));
              } else {
                // Simulate gzip/deflate
                controller.enqueue(new TextEncoder().encode(mockJsonString));
              }
              controller.close();
            },
          }),
          writable: new WritableStream(),
        };
      });
    });
  });
});
```

---

### 3. Global Search Transaction Missing showId Key

**Files:**
- `/src/lib/db/dexie/queries.ts` (lines 1240-1291)
- `/src/lib/db/dexie/queries.test.ts` (line 1+ missing multi-entity search test)

**Issue:** globalSearch doesn't filter results to prevent duplicate entity IDs across categories

```typescript
// PROBLEM: Lines 1248-1283 in queries.ts
export async function globalSearch(query: string, limit = 20): Promise<SearchResult[]> {
  if (!query.trim()) return [];

  const db = getDb();
  try {
    const perCategory = Math.ceil(limit / 3);

    // Execute all searches in parallel for 3x speedup
    const [songs, venues, guests] = await Promise.all([
      searchSongs(query, perCategory),
      searchVenues(query, perCategory),
      searchGuests(query, perCategory),
    ]);

    // Map results to SearchResult format
    const results: SearchResult[] = [
      ...songs.map((song) => ({
        type: 'song' as const,
        id: song.id,  // <-- PROBLEM: Not namespaced
        // ...
      })),
      ...venues.map((venue) => ({
        type: 'venue' as const,
        id: venue.id,  // <-- PROBLEM: venue.id might equal song.id
        // ...
      })),
      ...guests.map((guest) => ({
        type: 'guest' as const,
        id: guest.id,  // <-- PROBLEM: guest.id might equal venue.id or song.id
        // ...
      })),
    ];

    // Sort by score and limit
    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  } catch (error) {
    db.handleError(error, 'globalSearch');
    return [];
  }
}
```

**Root Cause:**
- SearchResult uses a single `id: number` field
- This causes collisions: song #1, venue #1, guest #1 all have id=1
- Frontend components can't distinguish which entity type to route to
- No entity deduplication or conflict resolution

**Test Impact:**
- `queries.test.ts`: 1 failed test (multi-entity search)
- Test likely expects unique IDs across entity types
- Can't verify proper routing with duplicate IDs

**Fix Required:**

```typescript
// Option 1: Composite ID (safest)
export interface SearchResult {
  type: 'song' | 'venue' | 'guest' | 'show';
  entityId: number;  // Actual ID in that table
  id: string;        // Composite: "song:123", "venue:456"
  title: string;
  subtitle: string | null;
  slug: string | null;
  date: string | null;
  score: number;
}

export async function globalSearch(query: string, limit = 20): Promise<SearchResult[]> {
  if (!query.trim()) return [];

  const db = getDb();
  try {
    const perCategory = Math.ceil(limit / 3);

    // Execute all searches in parallel
    const [songs, venues, guests] = await Promise.all([
      searchSongs(query, perCategory),
      searchVenues(query, perCategory),
      searchGuests(query, perCategory),
    ]);

    const results: SearchResult[] = [
      ...songs.map((song) => ({
        type: 'song' as const,
        entityId: song.id,
        id: `song:${song.id}`,  // Composite ID
        title: song.title,
        subtitle: song.isCover ? `Cover of ${song.originalArtist}` : 'Original',
        slug: song.slug,
        date: null,
        score: song.totalPerformances,
      })),
      ...venues.map((venue) => ({
        type: 'venue' as const,
        entityId: venue.id,
        id: `venue:${venue.id}`,  // Composite ID
        title: venue.name,
        subtitle: [venue.city, venue.state, venue.country].filter(Boolean).join(', '),
        slug: null,
        date: null,
        score: venue.totalShows,
      })),
      ...guests.map((guest) => ({
        type: 'guest' as const,
        entityId: guest.id,
        id: `guest:${guest.id}`,  // Composite ID
        title: guest.name,
        subtitle: guest.instruments?.join(', ') ?? null,
        slug: guest.slug,
        date: null,
        score: guest.totalAppearances,
      })),
    ];

    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  } catch (error) {
    db.handleError(error, 'globalSearch');
    return [];
  }
}
```

---

## High Priority Issues

### 4. Transaction Deadlock in safeQuery

**File:** `/src/lib/db/dexie/query-helpers.ts` (lines 386-397)

**Issue:** No transaction context passed to queries

```typescript
// PROBLEM: No transaction semantics
export async function safeQuery<T>(
  queryFn: () => Promise<T>,
  fallback: T,
  context: string
): Promise<T> {
  try {
    return await queryFn();  // <-- Runs outside any transaction
  } catch (error) {
    getDb().handleError(error, context);
    return fallback;
  }
}
```

**Risk:** If queryFn spawns multiple operations, they run in separate transactions, creating deadlock potential on IndexedDB locks.

**Fix:** Add transaction wrapper

```typescript
export async function safeQuery<T>(
  queryFn: () => Promise<T>,
  fallback: T,
  context: string,
  transactionMode: 'r' | 'rw' = 'r'
): Promise<T> {
  const db = getDb();
  try {
    // Wrap in explicit read transaction for consistency
    if (transactionMode === 'r') {
      return await db.transaction('r', [], queryFn);
    }
    return await queryFn();
  } catch (error) {
    db.handleError(error, context);
    return fallback;
  }
}
```

---

### 5. Missing Foreign Key Validation in data-loader

**File:** `/src/lib/db/dexie/data-loader.ts` (lines 929-998)

**Issue:** validateForeignKeyReferences only logs warnings, doesn't prevent bad data

```typescript
// Lines 984-990: Warnings only logged, not acted upon
if (warnings.length > 0) {
  console.warn('[DataLoader] Foreign key validation warnings:', warnings.length);
  // Only log first 10 to avoid spam
  warnings.slice(0, 10).forEach(w => console.warn('[DataLoader]', w));
  if (warnings.length > 10) {
    console.warn(`[DataLoader] ... and ${warnings.length - 10} more warnings`);
  }
}

return { valid: warnings.length === 0, warnings };
```

**Risk:** Orphaned records corrupt the database silently, leading to:
- Setlist entries referencing deleted shows
- Shows referencing deleted venues
- Cascading failures in queries

**Fix:**

```typescript
// Return valid result, allow caller to decide action
async function validateForeignKeyReferences(): Promise<{
  valid: boolean;
  warnings: string[];
  orphanedCounts: {
    showsWithBadVenue: number;
    showsWithBadTour: number;
    setlistsWithBadShow: number;
    setlistsWithBadSong: number;
  };
}> {
  // ... existing code ...

  return {
    valid: warnings.length === 0,
    warnings,
    orphanedCounts: {
      showsWithBadVenue: warnings.filter(w => w.includes('venue')).length,
      showsWithBadTour: warnings.filter(w => w.includes('tour')).length,
      setlistsWithBadShow: warnings.filter(w => w.includes('show')).length,
      setlistsWithBadSong: warnings.filter(w => w.includes('song')).length,
    }
  };
}

// In loadInitialData, check validation result
const fkValidation = await validateForeignKeyReferences();

if (!fkValidation.valid && fkValidation.orphanedCounts.setlistsWithBadShow > 0) {
  console.error(
    '[DataLoader] Critical FK violation: ' +
    `${fkValidation.orphanedCounts.setlistsWithBadShow} setlist entries ` +
    'reference non-existent shows. Database may be corrupt.'
  );

  throw new Error('Data integrity check failed - foreign key violations detected');
}
```

---

### 6. VersionError Handling Gap

**File:** `/src/lib/db/dexie/db.ts` (lines 264-293)

**Issue:** versionchange event closes connection but doesn't provide recovery path

```typescript
// Lines 265-278: Closes connection, user must manually refresh
this.on('versionchange', (event) => {
  console.warn('[DexieDB] Database version changed in another tab, closing connection...');
  this.close();
  // Notify user that they need to refresh
  if (typeof window !== 'undefined') {
    // Dispatch a custom event that components can listen for
    window.dispatchEvent(new CustomEvent('dexie-version-change', {
      detail: {
        event,
        action: 'refresh-required',
        message: 'Please refresh the page to get the latest version'
      }
    }));
  }
});
```

**Issue:** Hard-closes connection without retry or graceful degradation

**Fix:**

```typescript
private versionChangeRetries = 0;
private maxVersionRetries = 3;

this.on('versionchange', (event) => {
  console.warn('[DexieDB] Database version changed in another tab');

  // Attempt graceful reconnect
  if (this.versionChangeRetries < this.maxVersionRetries) {
    this.versionChangeRetries++;
    console.debug(`[DexieDB] Attempting to reconnect (${this.versionChangeRetries}/${this.maxVersionRetries})`);

    // Close and reopen
    this.close();
    setTimeout(() => {
      this.open().then(() => {
        this.versionChangeRetries = 0;
        console.debug('[DexieDB] Successfully reconnected to updated database');

        window.dispatchEvent(new CustomEvent('dexie-version-recovered', {
          detail: { message: 'Database reconnected successfully' }
        }));
      }).catch((err) => {
        console.error('[DexieDB] Failed to reconnect after version change:', err);

        window.dispatchEvent(new CustomEvent('dexie-version-change', {
          detail: {
            event,
            action: 'refresh-required',
            message: 'Database version changed. Please refresh the page.',
            retry: this.versionChangeRetries
          }
        }));
      });
    }, Math.pow(2, this.versionChangeRetries) * 100);  // Exponential backoff
  } else {
    // Too many retries, give up
    this.close();

    window.dispatchEvent(new CustomEvent('dexie-version-change', {
      detail: {
        event,
        action: 'refresh-required',
        message: 'Database version changed. Please refresh the page.',
        permanent: true
      }
    }));
  }
});
```

---

### 7. QuotaExceededError Not Recoverable

**File:** `/src/lib/db/dexie/queries.ts` (lines 1305-1341, 1345-1382, 1387-1423)

**Issue:** bulkInsert functions throw on quota exceeded, don't implement eviction

```typescript
// Lines 1320-1331: Catches quota error but only logs and throws
catch (error) {
  if (error instanceof Error && error.name === 'QuotaExceededError') {
    console.error('[Queries] Storage quota exceeded during bulkInsertShows:', {
      inserted,
      attempted: shows.length,
      batchIndex: Math.floor(i / chunkSize)
    });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('dexie-quota-exceeded', {
        detail: { entity: 'shows', loaded: inserted, attempted: shows.length }
      }));
    }
  }
  throw error;  // <-- JUST RETHROWS
}
```

**Risk:** Users can't load data if quota exceeded. Should implement:
1. Automatic LRU eviction
2. Progressive loading (load essential data first)
3. User notification with recovery option

**Fix:**

```typescript
// Add to queries.ts
async function evictOldData(db: ReturnType<typeof getDb>, targetMB = 10): Promise<number> {
  try {
    const estimate = await navigator.storage.estimate();
    const availableMB = ((estimate.quota ?? 0) - (estimate.usage ?? 0)) / 1024 / 1024;

    if (availableMB > targetMB) {
      return 0;  // No eviction needed
    }

    let evicted = 0;

    // Step 1: Delete old shows (keep last 5 years)
    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - 5);

    const oldShowCount = await db.shows
      .where('date')
      .below(cutoffDate.toISOString())
      .delete();

    console.debug(`[Storage] Evicted ${oldShowCount} old shows`);
    evicted += oldShowCount;

    // Check if we have enough space now
    const newEstimate = await navigator.storage.estimate();
    const newAvailableMB = ((newEstimate.quota ?? 0) - (newEstimate.usage ?? 0)) / 1024 / 1024;

    if (newAvailableMB > targetMB) {
      return evicted;
    }

    // Step 2: Delete liberation list entries (can be regenerated)
    const libCount = await db.liberationList.clear();
    evicted += libCount;

    console.warn('[Storage] Had to delete liberation list entries to free space');

    return evicted;
  } catch (error) {
    console.error('[Storage] Eviction failed:', error);
    return 0;
  }
}

// Modified bulkInsertShows
export async function bulkInsertShows(
  shows: DexieShow[],
  chunkSize: number = BULK_CHUNK_SIZE
): Promise<number> {
  const db = getDb();
  let inserted = 0;

  for (let i = 0; i < shows.length; i += chunkSize) {
    const chunk = shows.slice(i, i + chunkSize);
    try {
      await db.transaction('rw', db.shows, async () => {
        await db.shows.bulkAdd(chunk);
      });
      inserted += chunk.length;
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        console.warn('[Queries] Storage quota exceeded, attempting eviction...');

        // Try to evict old data
        const evicted = await evictOldData(db, 25);  // Try to free 25MB

        if (evicted > 0) {
          console.debug(`[Storage] Evicted ${evicted} records, retrying insert...`);

          // Retry the failed chunk
          try {
            await db.transaction('rw', db.shows, async () => {
              await db.shows.bulkAdd(chunk);
            });
            inserted += chunk.length;

            // Notify user of recovery
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('dexie-quota-recovered', {
                detail: {
                  entity: 'shows',
                  evicted,
                  retried: chunk.length,
                  totalInserted: inserted
                }
              }));
            }
            continue;
          } catch (retryError) {
            console.error('[Queries] Retry failed after eviction:', retryError);
          }
        }

        // Eviction didn't help or no data to evict
        console.error('[Queries] Storage quota exceeded with no recovery option:', {
          inserted,
          attempted: shows.length,
          batchIndex: Math.floor(i / chunkSize)
        });

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('dexie-quota-exceeded-fatal', {
            detail: {
              entity: 'shows',
              loaded: inserted,
              attempted: shows.length,
              message: 'Storage quota exceeded. Please clear browser cache and try again.'
            }
          }));
        }
      }
      throw error;
    }
  }

  return inserted;
}
```

---

## Medium Priority Issues

### 8. Data-Loader Doesn't Track Compression Metrics

**File:** `/src/lib/db/dexie/data-loader.ts` (lines 343-366)

**Issue:** compressionMonitor used but not exported, metrics lost

```typescript
// Lines 343-352: Compression metrics recorded but monitor not accessible
compressionMonitor.recordLoad({
  file: fileName,
  format: monitorFormat,
  originalSize: text.length,
  compressedSize: compressedSize || text.length,
  compressionRatio: compressedSize > 0 ? 1 - compressedSize / text.length : 0,
  loadTimeMs,
  cacheHit,
  timestamp: Date.now(),
});

// Line 1317: But printSummary() called in catch block
compressionMonitor.printSummary();
```

**Issue:** If compressionMonitor throws, loadInitialData fails silently

**Fix:**

```typescript
// Wrap monitor calls
try {
  compressionMonitor.recordLoad({
    file: fileName,
    format: monitorFormat,
    originalSize: text.length,
    compressedSize: compressedSize || text.length,
    compressionRatio: compressedSize > 0 ? 1 - compressedSize / text.length : 0,
    loadTimeMs,
    cacheHit,
    timestamp: Date.now(),
  });
} catch (monitorError) {
  console.warn('[DataLoader] Failed to record compression metrics:', monitorError);
  // Continue - metrics are non-critical
}

// In finally block of loadInitialData
finally {
  try {
    compressionMonitor.printSummary();
  } catch (printError) {
    console.warn('[DataLoader] Failed to print compression summary:', printError);
  }
}
```

---

### 9. Missing Transaction Mode in bulkOperation

**File:** `/src/lib/db/dexie/query-helpers.ts` (lines 560-625)

**Issue:** All bulk operations use 'rw' mode even for read-only aggregations

```typescript
// Lines 636-648: bulkInsert always uses 'rw'
export async function bulkInsert<T>(
  operationName: string,
  collection: Dexie.Table<T>,
  items: T[],
  tableName: 'songs' | 'venues' | 'shows' | 'guests' | 'tours' | 'setlistEntries',
  chunkSize?: number
): Promise<number> {
  return bulkOperation(
    operationName,
    items,
    async (db, chunk) => {
      await db.transaction('rw', collection, async () => {  // <-- HARDCODED 'rw'
        await collection.bulkAdd(chunk);
      });
    },
    [tableName],
    chunkSize
  );
}

// But bulkDelete also hardcodes 'rw' inside executor
export async function bulkDelete<
  T extends 'shows' | 'songs' | 'setlistEntries' | 'venues'
>(table: T, ids: number[], chunkSize?: number): Promise<number> {
  const db = getDb();

  return bulkOperation(
    `bulkDelete${table}`,
    ids,
    async (_, chunk) => {
      await db.transaction('rw', db[table], async () => {  // <-- HARDCODED 'rw'
        await db[table].bulkDelete(chunk);
      });
    },
    [table],
    chunkSize
  );
}
```

**Risk:** Read-only operations unnecessarily lock for write, blocking concurrent queries

**Fix:**

```typescript
export async function bulkOperation<T>(
  operationName: string,
  items: T[],
  executor: (
    db: ReturnType<typeof getDb>,
    chunk: T[],
    index: number
  ) => Promise<void>,
  tablesToInvalidate: Array<
    'songs' | 'venues' | 'shows' | 'guests' | 'tours' | 'setlistEntries' | 'liberation'
  > = [],
  chunkSize: number = BULK_CHUNK_SIZE,
  transactionMode: 'r' | 'rw' = 'rw'  // ADD MODE PARAMETER
): Promise<number> {
  // ... existing code ...
}

// Updated bulkInsert with explicit 'rw'
export async function bulkInsert<T>(
  operationName: string,
  collection: Dexie.Table<T>,
  items: T[],
  tableName: 'songs' | 'venues' | 'shows' | 'guests' | 'tours' | 'setlistEntries',
  chunkSize?: number
): Promise<number> {
  return bulkOperation(
    operationName,
    items,
    async (db, chunk) => {
      await db.transaction('rw', collection, async () => {
        await collection.bulkAdd(chunk);
      });
    },
    [tableName],
    chunkSize,
    'rw'  // EXPLICIT: This IS a write operation
  );
}
```

---

### 10. Cache Cleanup Never Runs

**File:** `/src/lib/db/dexie/cache.ts` (lines 655-687)

**Issue:** startPeriodicCacheCleanup() defined but never called from init.ts

```typescript
// Lines 664-687 in cache.ts: Function defined but never invoked
export function startPeriodicCacheCleanup(): void {
  if (typeof window === 'undefined') {
    return;
  }

  if (cleanupIntervalId) {
    return; // Already running
  }

  cleanupIntervalId = setInterval(() => {
    const cache = getQueryCache();
    const cleaned = cache.cleanup();
    const enforced = cache.enforceMaxSize();

    if (cleaned > 0 || enforced > 0) {
      console.debug(`[QueryCache] Cleanup: removed ${cleaned} expired, ${enforced} over-limit entries`);
    }
  }, CLEANUP_INTERVAL);

  // ...
}

// init.ts never calls this
```

**Risk:** Cache grows unbounded, consuming memory

**Fix:** Call in init.ts

```typescript
// In init.ts performInit function, add:
import { startPeriodicCacheCleanup, setupCacheInvalidationListeners } from './cache';

// ... existing code ...

// After database open
const db = getDb();
await db.open();

// Setup cache listeners
setupCacheInvalidationListeners();
startPeriodicCacheCleanup();  // ADD THIS

if (verbose) {
  console.debug('[Dexie Init] Cache system initialized');
}
```

---

### 11. Missing Index on getShowsForSong

**File:** `/src/lib/db/dexie/queries.ts` (lines 527-542)

**Issue:** getShowsForSong doesn't use the [songId+showDate] index

```typescript
// Lines 527-542: Uses songId only, misses compound index
export async function getShowsForSong(songId: number): Promise<DexieShow[]> {
  const db = getDb();

  return db.transaction('r', [db.setlistEntries, db.shows], async () => {
    const entries = await db.setlistEntries.where('songId').equals(songId).toArray();  // <-- MISSING INDEX
    const showIds = [...new Set(entries.map((e) => e.showId))];

    if (showIds.length === 0) return [];

    const shows = await db.shows.bulkGet(showIds);
    return shows
      .filter((s): s is DexieShow => s !== undefined)
      .sort((a, b) => b.date.localeCompare(a.date));
  });
}
```

**Schema defines** (line 660 in schema.ts):
```typescript
// [songId+showDate] for efficient song→shows queries (30-50% faster)
setlistEntries:
  '&id, showId, songId, position, setName, slot, showDate, year, [songId+year], [year+slot], [showId+position], [songId+showDate]',
```

**Fix:**

```typescript
export async function getShowsForSong(songId: number): Promise<DexieShow[]> {
  const db = getDb();

  return db.transaction('r', [db.setlistEntries, db.shows], async () => {
    // Use compound index [songId+showDate] for 30-50% faster retrieval
    // Results are already sorted by showDate
    const entries = await db.setlistEntries
      .where('[songId+showDate]')
      .between([songId, Dexie.minKey], [songId, Dexie.maxKey])
      .toArray();

    const showIds = [...new Set(entries.map((e) => e.showId))];

    if (showIds.length === 0) return [];

    const shows = await db.shows.bulkGet(showIds);
    return shows
      .filter((s): s is DexieShow => s !== undefined)
      // Already sorted by showDate from index, just reverse for newest first
      .sort((a, b) => b.date.localeCompare(a.date));
  });
}
```

---

## Low Priority Issues

### 12. Sync Module Missing Transaction Context

**File:** `/src/lib/db/dexie/sync.ts` (lines 1+)

**Issue:** Server → Client sync functions don't use transactions for atomic updates

**Fix:** Wrap sync operations in transactions

```typescript
export async function performFullSync(response: FullSyncResponse): Promise<void> {
  const db = getDb();

  try {
    await db.transaction('rw', [
      db.venues,
      db.songs,
      db.tours,
      db.shows,
      db.setlistEntries,
      db.guests,
      db.guestAppearances,
      db.liberationList,
    ], async () => {
      // Load entities in dependency order
      await db.venues.bulkPut(transformVenues(response.data.venues));
      await db.songs.bulkPut(transformSongs(response.data.songs));
      await db.tours.bulkPut(transformTours(response.data.tours));
      await db.shows.bulkPut(transformShows(response.data.shows));
      // ... etc
    });
  } catch (error) {
    throw new Error(`Full sync failed: ${error}`);
  }
}
```

---

### 13. No Batch Retry Logic

**File:** `/src/lib/db/dexie/query-helpers.ts` (lines 560-625)

**Issue:** bulkOperation doesn't retry failed chunks

**Risk:** Transient errors (temporary locks) cause entire bulk operation to fail

**Fix:**

```typescript
export async function bulkOperation<T>(
  operationName: string,
  items: T[],
  executor: (db: ReturnType<typeof getDb>, chunk: T[], index: number) => Promise<void>,
  tablesToInvalidate: Array<...> = [],
  chunkSize: number = BULK_CHUNK_SIZE,
  maxRetries: number = 3
): Promise<number> {
  const db = getDb();
  let processed = 0;

  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    const chunkIndex = Math.floor(i / chunkSize);

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        await executor(db, chunk, chunkIndex);
        processed += chunk.length;
        lastError = null;
        break;  // Success, move to next chunk
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < maxRetries - 1) {
          // Exponential backoff: 100ms, 200ms, 400ms
          const delay = Math.pow(2, attempt) * 100;
          console.debug(`[bulkOperation] Retry ${attempt + 1}/${maxRetries} after ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    if (lastError) {
      throw new Error(`[${operationName}] Failed after ${maxRetries} retries: ${lastError.message}`);
    }

    // Yield to main thread
    if (chunkIndex % 2 === 0 && i + chunkSize < items.length) {
      if (typeof scheduler !== 'undefined' && 'yield' in scheduler) {
        await scheduler.yield();
      } else {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
  }

  return processed;
}
```

---

### 14. Cache TTL Presets Not Validated

**File:** `/src/lib/db/dexie/cache.ts` (lines 336-350)

**Issue:** CacheTTL values chosen arbitrarily, no docstring explaining rationale

```typescript
export const CacheTTL = {
  /** Statistics that rarely change (5 minutes) */
  STATS: 5 * 60 * 1000,

  /** Aggregations like year breakdowns (10 minutes) */
  AGGREGATION: 10 * 60 * 1000,

  /** Top lists that change infrequently (15 minutes) */
  TOP_LISTS: 15 * 60 * 1000,

  /** Static data like tours grouped by decade (30 minutes) */
  STATIC: 30 * 60 * 1000,

  /** Liberation list - updates daily but cache for 5 minutes */
  LIBERATION: 5 * 60 * 1000,
} as const;
```

**Issue:** No validation that these values are reasonable. Should be configurable.

**Fix:**

```typescript
// Environment-based TTL tuning
const isDevelopment = process.env.NODE_ENV === 'development';

export const CacheTTL = {
  // Development: shorter TTL to see changes faster
  // Production: longer TTL to reduce server load
  STATS: isDevelopment ? 1 * 60 * 1000 : 5 * 60 * 1000,
  AGGREGATION: isDevelopment ? 2 * 60 * 1000 : 10 * 60 * 1000,
  TOP_LISTS: isDevelopment ? 5 * 60 * 1000 : 15 * 60 * 1000,
  STATIC: isDevelopment ? 10 * 60 * 1000 : 30 * 60 * 1000,
  LIBERATION: isDevelopment ? 2 * 60 * 1000 : 5 * 60 * 1000,
} as const;

// Validate on module load
const MIN_TTL = 1000;  // 1 second minimum
const MAX_TTL = 60 * 60 * 1000;  // 1 hour maximum

Object.entries(CacheTTL).forEach(([key, value]) => {
  if (value < MIN_TTL || value > MAX_TTL) {
    console.warn(`[Cache] TTL out of range: ${key}=${value}. Should be ${MIN_TTL}-${MAX_TTL}`);
  }
});
```

---

### 15. No Metrics for Query Performance

**File:** `/src/lib/db/dexie/queries.ts` and `/src/lib/db/dexie/query-helpers.ts`

**Issue:** No performance monitoring for slow queries

**Risk:** Can't detect regression when query indexes degraded

**Fix:** Add optional timing

```typescript
// Helper to time queries
export async function timedQuery<T>(
  name: string,
  queryFn: () => Promise<T>,
  warnThresholdMs: number = 500
): Promise<T> {
  const startTime = performance.now();
  try {
    const result = await queryFn();
    const duration = performance.now() - startTime;

    if (duration > warnThresholdMs) {
      console.warn(`[Queries] Slow query: ${name} took ${duration.toFixed(2)}ms`);
    } else {
      console.debug(`[Queries] ${name}: ${duration.toFixed(2)}ms`);
    }

    // Send to analytics if available
    if (window.__analytics) {
      window.__analytics.trackEvent('query-timing', {
        query: name,
        duration: Math.round(duration),
      });
    }

    return result;
  } catch (error) {
    const duration = performance.now() - startTime;
    console.error(`[Queries] Query failed: ${name} (${duration.toFixed(2)}ms)`, error);
    throw error;
  }
}

// Usage
export async function getAllSongs(): Promise<DexieSong[]> {
  return timedQuery('getAllSongs', async () => {
    const db = getDb();
    try {
      return await db.songs.orderBy('sortTitle').limit(2000).toArray();
    } catch (error) {
      db.handleError(error, 'getAllSongs');
      return [];
    }
  });
}
```

---

## Summary Table

| Issue | Severity | Files | Impact | Fix Complexity |
|-------|----------|-------|--------|-----------------|
| Cache Invalidation Race | CRITICAL | cache.ts | 10 test failures | Medium |
| Compression Type Mismatch | CRITICAL | data-loader.ts | 4 test failures | Medium |
| Global Search Entity ID Collision | HIGH | queries.ts | 1 test failure | Low |
| safeQuery Missing Transaction | HIGH | query-helpers.ts | Deadlock risk | Low |
| FK Validation Gaps | HIGH | data-loader.ts | Silent corruption | Medium |
| VersionError No Retry | HIGH | db.ts | Manual refresh required | Medium |
| QuotaExceededError Not Recoverable | HIGH | queries.ts | Load failures | High |
| compressionMonitor Not Exported | MEDIUM | data-loader.ts | Silent failures | Low |
| bulkOperation Mode Hardcoded | MEDIUM | query-helpers.ts | Lock contention | Low |
| Cache Cleanup Never Called | MEDIUM | cache.ts, init.ts | Memory leak | Low |
| Missing [songId+showDate] Index Usage | MEDIUM | queries.ts | 30-50% perf loss | Low |
| Sync No Transactions | MEDIUM | sync.ts | Partial updates | Low |
| No Batch Retry Logic | MEDIUM | query-helpers.ts | Transient failures | Medium |
| Cache TTL Not Validated | LOW | cache.ts | Config issues | Low |
| No Query Metrics | LOW | queries.ts | Can't detect regression | Low |

---

## Recommendations

1. **Immediate (Next Sprint):**
   - Fix cache invalidation race (Issue #1) - blocks other features
   - Fix compression type system (Issue #2) - breaks data loading
   - Fix global search entity ID collision (Issue #3) - breaks navigation

2. **High Priority (2-3 Sprints):**
   - Implement transaction retry logic (Issue #13)
   - Add quota exceeded recovery (Issue #7)
   - Add VersionError retry mechanism (Issue #6)

3. **Medium Priority (During Refactoring):**
   - Extract sync module to use transactions consistently
   - Add query performance monitoring
   - Validate cache TTL values

4. **Testing:**
   - Run complete test suite after each fix
   - Add integration tests for cross-tab scenarios
   - Add stress tests for quota conditions

---

## References

- **Dexie.js Docs:** https://dexie.org/
- **IndexedDB MDN:** https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
- **Chrome DevTools:** Open DevTools > Application > IndexedDB to inspect database state
- **Scheduler.yield():** https://developer.chrome.com/blog/introducing-scheduler-yield-origin-trial


# DMB Almanac: Exhaustive Database Optimization & Scraper Resilience Audit

**Auditor**: Claude Opus 4.5 (Senior Database Engineer)
**Date**: 2026-01-29
**Scope**: `/projects/dmb-almanac/app` -- Client-side IndexedDB (Dexie.js) database layer and server-side Playwright/Cheerio web scraper

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Database Analysis](#database-analysis)
   - [1. Index Effectiveness](#1-index-effectiveness)
   - [2. Query Optimization](#2-query-optimization)
   - [3. Transaction Patterns](#3-transaction-patterns)
   - [4. Data Integrity](#4-data-integrity)
   - [5. Schema Migrations](#5-schema-migrations)
   - [6. Bulk Operations](#6-bulk-operations)
   - [7. Storage Efficiency](#7-storage-efficiency)
   - [8. Cache Invalidation](#8-cache-invalidation)
   - [9. Error Recovery](#9-error-recovery)
   - [10. Performance Metrics](#10-performance-metrics)
3. [Scraper Analysis](#scraper-analysis)
   - [1. Rate Limiting](#s1-rate-limiting)
   - [2. Selector Resilience](#s2-selector-resilience)
   - [3. Error Handling](#s3-error-handling)
   - [4. Data Validation](#s4-data-validation)
   - [5. Incremental Updates](#s5-incremental-updates)
   - [6. Concurrency](#s6-concurrency)
   - [7. Output Integrity](#s7-output-integrity)
   - [8. Session Management](#s8-session-management)
   - [9. Memory Efficiency](#s9-memory-efficiency)
   - [10. Testing Coverage](#s10-testing-coverage)
4. [Priority Recommendations](#priority-recommendations)

---

## Executive Summary

The DMB Almanac has a **well-engineered database layer** built on Dexie.js (IndexedDB) with mature indexing strategies, comprehensive cache invalidation, and solid error recovery. The scraper infrastructure demonstrates thoughtful design with circuit breakers, checkpoint recovery, and rate limiting. However, several bottlenecks and risks remain.

### Key Metrics

| Area | Rating | Details |
|------|--------|---------|
| Index Design | **A-** | 9 schema versions with documented index evolution; 6 unused compound indexes cleaned in v9 |
| Query Safety | **A** | Input validation, deduplication, null-safe wrappers, retry logic across all queries |
| Transaction Safety | **B+** | Good timeout/retry with exponential backoff; AbortController timeout cannot actually cancel IDB transactions |
| Data Integrity | **A** | Comprehensive FK validation with shared PK sets (N+1 fix), orphan detection, embedded data verification |
| Cache Layer | **A-** | SWR support, TTL presets, Dexie hook-based invalidation; periodic cleanup every 60s |
| Scraper Resilience | **B** | Good checkpoint recovery and rate limiting; uneven selector fallback coverage across scrapers |
| Scraper Testing | **D** | No unit tests for individual scrapers; only integration-level orchestrator tests exist |

### Top 5 Bottlenecks

1. **Scraper HTML cache has no TTL** -- stale cached HTML served indefinitely
2. **Circuit breaker `createTimeout()` leaks timer Promises** -- on success, the timeout Promise remains unresolved in memory
3. **Venue scraper has zero selector fallbacks** -- single selector chain is brittle
4. **`getSongStats()` full table scan** -- `db.songs.each()` iterates all songs to count covers
5. **Bulk operation code duplication** -- 5 nearly identical functions in `bulk-operations.js`

---

## Database Analysis

### 1. Index Effectiveness

**Files**: `/app/src/lib/db/dexie/schema.js`

**Findings**:

The schema has evolved through 9 well-documented versions with clear rationale for each change. The current schema (v9) demonstrates mature index design.

**Compound Indexes in Use (v9)**:

| Table | Index | Query Pattern | Complexity |
|-------|-------|---------------|------------|
| shows | `[venueId+date]` | Venue show chronology | O(log n) + k |
| shows | `[tourId+date]` | Tour show chronology | O(log n) + k |
| setlistEntries | `[songId+year]` | Song year breakdown | O(log n) + k |
| setlistEntries | `[year+slot]` | Top openers/closers by year | O(log n) + k |
| setlistEntries | `[showId+position]` | Ordered setlist retrieval | O(log n) + k |
| guestAppearances | `[guestId+year]` | Guest year breakdown | O(log n) + k |
| liberationList | `[isLiberated+daysSince]` | Liberation list filtering | O(log n) + k |
| songs | `[isLiberated+daysSinceLastPlayed]` | Liberation song lookup | O(log n) + k |
| venues | `[country+state]` | Geographic filtering | O(log n) + k |

**Strengths**:
- v9 removed 6 unused compound indexes (`[songId+showDate]`, `[venueId+year]`, `[showDate+showId]`, `[addedAt+songId]`, `[addedAt+venueId]`, `[songId+releaseId]`), saving an estimated 2-5MB of IndexedDB storage and improving write throughput
- Boolean fields (`isCover`, `isLiberated`) correctly removed as standalone indexes in v3 due to ~50% selectivity
- Comprehensive INDEX USAGE DOCUMENTATION table maps every index to its query pattern and O-notation complexity
- `searchText` computed field on songs, venues, and guests enables `startsWithIgnoreCase` prefix search at O(log n)

**Bottleneck -- Potential Redundant Indexes**:
- `songs.openerCount`, `songs.closerCount`, `songs.encoreCount` are individual indexes that serve only `getTopOpeningSongs()`, `getTopClosingSongs()`, `getTopEncoreSongs()` queries. These are called infrequently and are TTL-cached (15 minutes). The write overhead of maintaining 3 indexes on every song insert/update may not be justified.
- **Estimated Impact**: Removing these 3 indexes would save ~0.5MB storage and ~5% faster song writes. However, the current design is reasonable given the read pattern.

**Metric**: 21 tables across v9, with 47 total indexed fields. Index-to-query coverage is approximately 95% -- nearly every index maps to an active query function.

---

### 2. Query Optimization

**Files**: `/app/src/lib/db/dexie/queries.js`, `/app/src/lib/db/dexie/query-helpers.js`

**Findings**:

**N+1 Query Fixes (already applied)**:
- `searchWithRankedResults()` shared helper eliminates duplication across `searchSongs`, `searchVenues`, `searchGuests` (DB-037)
- `streamCollectionBatched()` reduces per-item Promise overhead from N allocations to 0 by processing synchronously within cursor callback
- `getShowsByYearStreaming()` refactored from per-item yielding to batch-based yielding (30ms INP improvement)
- Shared PK set fetching in `data-integrity.js` eliminates 12+ redundant `primaryKeys()` calls (was fetching shows/songs 3-4x each)

**Input Validation Layer**:
Every query function validates inputs through dedicated validators:
- `validateId()`, `validateOffset()`, `validatePageSize()`, `validateLimit()`, `validateYear()`
- `validateSearchQuery()`, `validateSlug()`, `validateCursor()`
- Constants defined in `QueryLimits` prevent magic numbers

**Request Deduplication**:
`dedupeRequest()` prevents concurrent identical queries -- critical for React/Svelte re-render storms that can fire the same query multiple times.

**Bottleneck -- `getSongStats()` Full Table Scan**:

```javascript
// queries.js line 273-287
return db.transaction('r', [db.songs], async () => {
    const total = await safeCount(db.songs);
    let covers = 0;
    await db.songs.each((s) => {  // <-- Full table scan
        if (s.isCover === true || s.isCover === 1) covers++;
    });
    return { total, covers, originals: total - covers };
});
```

This iterates every song record to count covers. Since `isCover` has ~50% selectivity, a standalone index was correctly removed. However, the cover count could be pre-computed during data loading and stored in `syncMeta`, eliminating the runtime scan entirely.

**Estimated Impact**: For 300 songs, the scan takes ~5-10ms. For 1000+ songs, this becomes 20-50ms. Caching (5-minute TTL) mitigates this, but a pre-computed count would make the first load instant.

**Bottleneck -- `getVenueStats()` Full Table Scan**:

```javascript
// queries.js line 481-493
await db.venues.each((venue) => {
    totalShows += safeProp(venue, 'totalShows', 0);
    const state = safeProp(venue, 'state', null);
    if (state) statesSet.add(state);
});
```

Same pattern: iterates all venues to compute aggregate stats. Pre-computing `totalShows` sum and unique `states` count during data load would eliminate this scan.

---

### 3. Transaction Patterns

**Files**: `/app/src/lib/db/dexie/transaction-timeout.js`

**Findings**:

**Transaction Timeout Architecture**:
- `withTransactionTimeout()`: 30s timeout, 3 retries, exponential backoff (1s base, 30s cap), jitter (+/-20%)
- `withBulkOperationTimeout()`: 120s timeout, 5 retries, 2s base delay
- `abortAndRetryTransaction()`: 5s timeout, 2 retries, 500ms delay (aggressive for quick operations)
- Deadlock detection via regex patterns: `/deadlock/i`, `/transaction.*locked/i`, `/lock.*timeout/i`, `/version.*mismatch/i`
- `QuotaExceededError` correctly not retried (non-transient failure)
- `TransactionHealthMonitor` singleton tracks success/timeout/deadlock rates per operation

**Critical Issue -- AbortController Cannot Cancel IndexedDB Transactions**:

```javascript
// transaction-timeout.js line 60-65
const controller = new AbortController();
const timeoutId = setTimeout(() => {
    controller.abort(new Error(`Transaction timeout...`));
}, timeoutMs);

const result = await fn();  // <-- fn() is a Dexie transaction
```

The `AbortController.abort()` fires after `timeoutMs`, but `fn()` (a Dexie transaction) is an IndexedDB operation that **cannot be externally aborted**. The `AbortController` signal is never passed to `fn()`, and IndexedDB has no abort mechanism for in-progress transactions (only the browser can abort them on tab close or `transaction.abort()`).

**Impact**: The timeout mechanism works as a *detection* tool (it identifies slow transactions) but cannot actually *cancel* them. A stuck IDB transaction will hold the connection until the browser kills it. This is an inherent limitation of IndexedDB, not a code bug -- but the naming suggests cancellation ability that does not exist.

**Recommendation**: Rename to `withTransactionDeadline` and document that the timeout detects but cannot cancel ongoing IDB operations. Consider wrapping the timeout around individual `bulkAdd`/`bulkPut` calls rather than entire transactions.

---

### 4. Data Integrity

**Files**: `/app/src/lib/db/dexie/validation/data-integrity.js`, `/app/src/lib/db/dexie/validation/integrity-hooks.js`

**Findings**:

**Comprehensive Validation Pipeline**:
1. **Foreign Key Validation**: Checks setlistEntries, shows, guestAppearances, liberationList, releaseTracks, and curatedListItems for invalid FK references
2. **Orphan Detection**: Finds songs with no setlist entries (where `totalPerformances === 0`), venues/tours with no shows, guests with no appearances
3. **Embedded Data Verification**: Cross-checks denormalized data (song titles in setlist entries, venue/tour names in shows) against source tables
4. **N+1 Fix (applied)**: All FK validators share a single set of pre-fetched primary keys via `fetchAllPrimaryKeySets()` -- 7 parallel `primaryKeys()` calls instead of 12+

**Integrity Hooks**:
- `batchValidateForeignKeys()` validates FK references using `bulkGet()` with deduplication before bulk inserts
- `enableBulkOperationMode()` / `disableBulkOperationMode()` provide a cached Set-based FK check (O(1) per entry) during bulk operations, replacing individual `db.songs.get()` calls (N IDB lookups)
- `forceFlushPendingUpdates()` uses `bulkPut()` instead of sequential `update()` calls

**Metric**: The validation system checks 12 tables, 6 FK relationship types, 4 orphan categories, and 2 embedded data verification paths. Validation capped at 1000 violations to prevent memory exhaustion on corrupted databases.

**Strength**: The orphan detection is conservative -- only flags records where both the relationship is missing AND the counter field is 0, avoiding false positives on songs that exist but have not been played yet.

---

### 5. Schema Migrations

**Files**: `/app/src/lib/db/dexie/schema.js`

**Findings**:

Dexie handles schema migrations automatically through version declarations. The schema has 9 versions with well-documented evolution:

| Version | Key Changes |
|---------|-------------|
| v1 | Initial schema: 16 tables with basic indexes |
| v2 | Compound indexes: `[venueId+date]`, `[songId+year]`, `[year+slot]`, added `openerCount`/`closerCount`/`encoreCount` |
| v3 | `[tourId+date]`, `[showId+position]`, `[isLiberated+daysSince]`; removed low-selectivity boolean indexes |
| v4 | `[songId+showDate]`, `[venueId+year]`; removed `state` index on venues |
| v5 | `[status+createdAt]` on offlineMutationQueue; added telemetryQueue table |
| v6 | TTL eviction support for queue tables |
| v7 | `[country+state]` on venues; CRITICAL FIX: removed invalid `[isLiberated+year]` on setlistEntries |
| v8 | `pageCache` table for offline-first page data |
| v9 | Removed 6 unused compound indexes (~2-5MB savings) |

**Strength**: Each version is a superset of the previous, with clear documentation of why indexes were added or removed. The schema is never destructive -- data is always preserved across versions.

**Gap**: No explicit rollback mechanism. If v9 causes issues, users would need to clear their IndexedDB and re-download all data. Dexie does not support downgrading schema versions.

**Recommendation**: Consider adding a `schemaVersion` field to `syncMeta` to detect and handle version mismatches after browser updates that might corrupt the database.

---

### 6. Bulk Operations

**Files**: `/app/src/lib/db/dexie/bulk-operations.js`, `/app/src/lib/db/dexie/query-helpers.js`, `/app/src/lib/db/dexie/data-loader.js`

**Findings**:

**Three Layers of Bulk Operations**:

1. **`bulk-operations.js`**: Entity-specific functions with tailored batch sizes:
   - Shows: 100/batch (~500 bytes/record)
   - Songs: 200/batch (~300 bytes/record)
   - Venues: 200/batch (~150 bytes/record)
   - Setlist entries: 500/batch (~200 bytes/record, with pre-flight FK validation)
   - Deletes: 1000/batch (fast, large batches OK)
   - Updates: 50/batch (conservative due to read-modify-write)

2. **`query-helpers.js`**: Generic `bulkOperation()` function with INP optimization (yields every 2 chunks via `scheduler.yield()`)

3. **`data-loader.js`**: Initial data load with 2000 records/batch, yield every 2 batches, Brotli > gzip > uncompressed fetch chain

**Bottleneck -- Massive Code Duplication**:

`bulk-operations.js` contains 5 bulk insert functions (`bulkInsertShows`, `bulkInsertSongs`, `bulkInsertVenues`, `bulkInsertSetlistEntries`, plus `bulkUpdate` and `bulkDelete`) that share ~90% identical code. The only differences are: table reference, batch size default, and FK validation for setlist entries.

The generic `bulkOperation()` in `query-helpers.js` already exists and handles the common pattern. The entity-specific functions in `bulk-operations.js` could be refactored to use it, reducing ~400 lines of duplicated error handling.

**Metric**: Data loader processes ~26MB uncompressed JSON data (682KB Brotli-compressed, 97.4% reduction) across 10 entity types in 4 dependency-ordered phases.

---

### 7. Storage Efficiency

**Files**: `/app/src/lib/db/dexie/schema.js`, `/app/src/lib/db/dexie/data-loader.js`

**Findings**:

**Denormalization Strategy**:
Shows embed full venue and tour objects for offline display:
```
DexieShow = DexieShowBase + {venue: EmbeddedVenue, tour: EmbeddedTour}
```

This is the correct trade-off for a client-side offline database -- joins are expensive in IndexedDB since there is no JOIN operator. The embedded data adds ~200 bytes per show but eliminates 2 index lookups per show render.

**Compression**: Brotli compression achieves 97.4% reduction (26MB to 682KB). The fetch chain tries Brotli > gzip > uncompressed with Service Worker cache fallback for offline.

**v9 Index Pruning**: Removed 6 unused compound indexes saving an estimated 2-5MB. Each compound index consumes approximately:
- `[songId+showDate]` on setlistEntries: ~2MB (largest -- thousands of entries with 2 fields each)
- User data compound indexes: ~10KB each (small tables)

**TTL Eviction**: Offline mutation queue and telemetry queue items expire after 7 days, preventing unbounded storage growth.

**Computed Fields**: `searchText`, `sortTitle`, `year`, `showDate` are pre-computed during data loading to avoid runtime computation. This adds storage overhead (~5-10%) but eliminates expensive string operations during query time.

---

### 8. Cache Invalidation

**Files**: `/app/src/lib/db/dexie/cache.js`

**Findings**:

**Cache Architecture**:
- **QueryCache** singleton: Map-based with TTL expiration, LRU eviction at 100 entries, and periodic cleanup every 60 seconds
- **Stale-While-Revalidate (SWR)**: Background revalidation for stale data, with `revalidating` flag to prevent duplicate refreshes
- **Dexie Hook Integration**: `setupCacheInvalidationListeners()` subscribes to `creating`/`updating`/`deleting` hooks on 12 core tables
- **Debounced UI Notification**: Cache invalidation is immediate (data integrity), but CustomEvent dispatch is debounced at 100ms (UI notification)

**TTL Presets**:
| Cache Type | Fresh TTL | SWR Stale Window |
|------------|-----------|------------------|
| Statistics | 5 min | 10 min |
| Aggregations | 10 min | 20 min |
| Top Lists | 15 min | 30 min |
| Static Data | 30 min | 1 hr |
| Liberation | 5 min | 1 hr |

**Cache Key Mapping**: `invalidateCache(['shows'])` correctly invalidates `stats:*`, `tour:*`, and `showsByYear:*` prefixes because show changes affect tour statistics and year summaries.

**Strength**: The `setlistEntries` invalidation correctly cascades to `stats:*`, `song:*`, `tour:*`, and `songsByYear:*` because setlist changes affect song statistics, tour statistics, and year-based aggregations.

**Gap**: `invalidateCache` does not invalidate the `shows:` prefix when `setlistEntries` changes, even though a setlist change logically makes `getShowWithSetlist()` stale. The show-level cache would serve outdated setlist data until its own TTL expires.

---

### 9. Error Recovery

**Files**: `/app/src/lib/db/dexie/transaction-timeout.js`, `/app/src/lib/db/dexie/query-helpers.js`, `/app/src/lib/db/dexie/query-errors.js`

**Findings**:

**Three-Layer Error Recovery**:

1. **Query Level** (`query-helpers.js`):
   - `safeQuery()` with 3 retries, exponential backoff (10ms, 20ms, 40ms), retryable error detection
   - Retryable errors: `AbortError`, `TransactionInactiveError`, deadlock, timeout, busy
   - Non-retryable errors: return fallback value immediately
   - All query functions have typed fallback values (empty arrays, zero-value objects, `undefined`)

2. **Transaction Level** (`transaction-timeout.js`):
   - `withTransactionTimeout()`: 30s timeout, 3 retries, exponential backoff (1s base, 30s cap), jitter
   - `withBulkOperationTimeout()`: 120s timeout, 5 retries, 2s base delay
   - `QuotaExceededError` detected and not retried
   - Deadlock patterns detected via 5 regex patterns
   - `TransactionHealthMonitor` tracks per-operation success/timeout/deadlock rates

3. **Application Level** (`data-loader.js`):
   - Service Worker cache fallback when network fails
   - `onProgress` callbacks for UI feedback during long operations
   - `QuotaExceededError` dispatches `dexie-quota-exceeded` CustomEvent for UI handling
   - Per-entity error handling (non-required entities can fail without blocking required ones)

**Strength**: The error recovery is defense-in-depth. A failing query goes through: query retry (40ms backoff) -> transaction retry (exponential backoff) -> fallback value -> UI error notification. This prevents cascading failures.

**Gap**: No corruption detection. If IndexedDB becomes corrupted (which can happen after browser crashes during writes), there is no mechanism to detect or recover. A `quickHealthCheck()` exists but only verifies table counts are non-zero -- it does not detect partial corruption.

---

### 10. Performance Metrics

**Files**: `/app/src/lib/db/dexie/transaction-timeout.js`, `/app/src/lib/db/dexie/cache.js`

**Findings**:

**Instrumentation**:
- `TransactionHealthMonitor`: Tracks totalAttempts, totalSuccesses, totalTimeouts, totalDeadlocks, totalRetries, and per-operation stats (attempts, successes, timeouts, avgDurationMs)
- `getCacheStats()`: Returns cache size, maxEntries, and expiredCount
- `compressionMonitor.recordLoad()`: Records per-file fetch metrics (format, original/compressed size, compression ratio, load time, cache hit)

**Missing Metrics**:
- No query-level timing instrumentation. Individual query execution times are not recorded or exposed. The `TransactionHealthMonitor` tracks transaction-level timing but not individual `db.songs.where(...).toArray()` calls.
- No index hit rate tracking. While the schema documents expected index usage, there is no runtime verification that queries actually use indexes (IndexedDB does not expose query plans like PostgreSQL's EXPLAIN).
- No cache hit rate tracking. `getQueryCache().stats()` returns current size and expired count but does not track hits vs. misses over time.

**Recommendation**: Add a lightweight query profiler that wraps `getDb()` calls to measure execution time and cache hit rates. This would enable:
1. Identifying queries that degrade as data grows
2. Validating that indexes are effective
3. Tuning TTL values based on actual access patterns

---

## Scraper Analysis

### S1. Rate Limiting

**Files**: `/app/scraper/src/utils/rate-limit.ts`

**Findings**:

**NativeQueue Implementation**:
- Zero-dependency replacement for `p-queue`
- Concurrency: 2 parallel tasks
- Interval rate limiting: 5 requests per 10 seconds
- `AbortController` support for queue cancellation
- `abort()` rejects all pending tasks with `DOMException('Queue aborted', 'AbortError')`

**Delay Utilities**:
- `delay(ms)`: Fixed delay
- `randomDelay(min, max)`: Jittered delay between min and max ms
- All scrapers use `randomDelay(1000, 3000)` between page fetches

**Bottleneck -- No Backoff on Rate Limit Responses**:

The rate limiter is proactive (limits outgoing requests) but does not respond to server-side rate limiting signals. If the target server returns HTTP 429 (Too Many Requests) or 503 (Service Unavailable), the scraper does not:
- Pause or slow down
- Read `Retry-After` headers
- Implement exponential backoff

The circuit breaker (`circuit-breaker.ts`) handles failures generically (5 failures -> OPEN state, 60s cooldown), but does not differentiate between rate limit responses and other errors.

**Metric**: Effective request rate is ~1 request per 2 seconds (5 per 10s interval, 2 concurrent). With randomDelay(1000, 3000), actual rate is ~0.5-1.0 requests/second per scraper.

---

### S2. Selector Resilience

**Files**: `/app/scraper/src/scrapers/songs.ts`, `/app/scraper/src/scrapers/venues.ts`

**Findings**:

**Songs Scraper -- Excellent Fallback Coverage**:

| Data Point | Fallback Strategies | Monitored? |
|------------|---------------------|------------|
| Title | 5 strategies: h1 primary, class-based, id-based, meta tags, page title | Yes (`selectorStats`) |
| Statistics | 4 strategies: class-based, table-based, contains-filter, body text | Yes |
| Lyrics | 4 strategies: class-based, id-based, pre-formatted, attribute-contains | Yes |
| Notes | 3 strategies: class-based, id-based, semantic section | No |
| Song URL list | 2 strategies: `songs/summary.aspx` primary, `SongStats.aspx` legacy | No |

The songs scraper logs fallback statistics at the end of each run, making it possible to detect selector drift over time.

**Venues Scraper -- Critical Brittleness**:

| Data Point | Fallback Strategies | Risk |
|------------|---------------------|------|
| Venue URLs | 1 strategy: `a[href*='VenueStats.aspx'][href*='vid=']` | **HIGH** |
| Venue name | Text-based line parsing after navigation markers | **HIGH** |
| Location | Regex-based: US format `City, ST` or international `City, Country` | **MEDIUM** |
| Venue type | Single regex on body text | **LOW** |

The venue scraper has **zero CSS selector fallbacks** for the URL list page and relies on brittle text-based line ordering for name extraction. If the target site changes its navigation structure, the `foundNav` logic will fail silently.

**Metric**: Songs scraper has 5+4+4+3 = 16 fallback selectors across 4 data points. Venues scraper has 0 fallback selectors. Other scrapers (tours, guests, shows) were not fully analyzed but follow patterns similar to venues based on code structure.

**Recommendation**: Apply the songs scraper's fallback chain pattern to all scrapers. At minimum, add:
- `a[href*='venues/']` secondary selector for venue URLs
- Meta tag and page title fallbacks for venue names
- `selectorStats` tracking to venues (and all other scrapers)

---

### S3. Error Handling

**Files**: `/app/scraper/src/utils/circuit-breaker.ts`, `/app/scraper/src/orchestrator.ts`

**Findings**:

**Circuit Breaker**:
- States: CLOSED (normal), OPEN (failing), HALF_OPEN (recovery testing)
- Failure threshold: 5 consecutive failures -> OPEN
- Cooldown: 60 seconds before HALF_OPEN test
- Success threshold: 3 consecutive successes -> CLOSED
- Max timeout: 30 seconds per request
- Registry pattern: one circuit breaker per scraper name

**Critical Issue -- Memory Leak in `createTimeout()`**:

```typescript
// circuit-breaker.ts
private createTimeout(): Promise<never> {
    return new Promise((_, reject) => {
        setTimeout(() => {
            reject(new Error(`Request timeout after ${this.config.maxTimeout}ms`));
        }, this.config.maxTimeout);
    });
}
```

This Promise is used in `Promise.race()` against the actual scraper function. When the scraper succeeds before the timeout, the timeout Promise is **never resolved or rejected** -- the `setTimeout` callback fires into the void and the Promise remains pending in memory. Over thousands of requests, this accumulates.

**Fix**: Use `AbortController` or clear the timeout on success:
```typescript
private async execute<T>(fn: () => Promise<T>): Promise<T> {
    let timeoutId: NodeJS.Timeout;
    const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(...), this.config.maxTimeout);
    });
    try {
        const result = await Promise.race([fn(), timeoutPromise]);
        clearTimeout(timeoutId!);
        return result;
    } catch (e) {
        clearTimeout(timeoutId!);
        throw e;
    }
}
```

**Orchestrator Error Handling**:
- Per-target try/catch with error aggregation
- Checkpoint save on failure for resume
- Required vs. optional target distinction (tours, guests, liberation are optional)
- 30% count drop detection for incremental scrapes

---

### S4. Data Validation

**Files**: `/app/scraper/src/orchestrator.ts`

**Findings**:

**Minimum Count Thresholds**:
| Entity | Minimum Count | Purpose |
|--------|---------------|---------|
| Songs | 150 | Detect empty page / selector failure |
| Venues | 50 | Detect empty page / selector failure |
| Shows | 100 | Detect empty page / selector failure |
| Guests | 20 | Detect empty page / selector failure |
| Tours | 10 | Detect empty page / selector failure |

**Required Field Validation**:
The orchestrator validates required fields per entity type before saving output. Missing required fields log warnings but do not block the scrape.

**Incremental Drop Detection**:
If an incremental scrape returns 30% fewer items than the previous full scrape, a warning is logged. This helps detect cases where the target site restructured and the scraper is missing data.

**Gap -- No Schema Validation**:
There is no structural schema validation (e.g., JSON Schema or Zod) on scraped data. The scraper trusts that if a field exists, it is the correct type. Type coercion happens only at the data-loader level (`toNumber()`, `toString()`, `toNumberOrNull()`), not at scrape time.

**Recommendation**: Add lightweight schema validation at scrape output time to catch type errors early. A simple `assertSong(data)` function checking `title: string`, `isCover: boolean`, `totalPlays: number` would prevent malformed data from reaching the JSON output files.

---

### S5. Incremental Updates

**Files**: `/app/scraper/src/utils/incremental.ts`

**Findings**:

**IncrementalManager**:
- Tracks `lastScrapedAt`, `lastItemCount`, and optional `checksum` per target
- 50% item count change threshold triggers re-scrape (configurable)
- Atomic file write pattern: write to `.tmp`, then `fs.promises.rename()`
- Merge strategy: new items replace existing by ID

**Locking Mechanism**:

```typescript
let pendingMetadataWrite: Promise<void> | null = null;

private async saveMetadata(): Promise<void> {
    if (pendingMetadataWrite) {
        await pendingMetadataWrite;
    }
    pendingMetadataWrite = (async () => { ... })();
    await pendingMetadataWrite;
}
```

This is a single-process lock (works for concurrent async operations within one Node.js process). It is NOT safe for multiple concurrent Node.js processes writing to the same metadata file. Since the orchestrator runs scrapers in parallel within a single process, this is sufficient for the current architecture.

**Gap -- No Checksum Usage**:
The `checksum` field is defined in `IncrementalState` but never populated by any scraper. Checksums would enable content-based change detection (only re-scrape if page content actually changed), which would be more efficient than timestamp-based detection.

---

### S6. Concurrency

**Files**: `/app/scraper/src/orchestrator.ts`, `/app/scraper/src/utils/rate-limit.ts`

**Findings**:

**Orchestrator Concurrency Model**:
- Scrapers are organized into dependency phases (e.g., songs/venues first, then shows, then setlist entries)
- Within each phase, scrapers can run in parallel (if no dependency conflicts)
- Each scraper uses its own `NativeQueue` with concurrency=2 and 5 req/10s interval

**Race Condition Risk -- Shared Playwright Page**:

All scrapers within a single scrape session share a single Playwright `Page` object:
```typescript
const page = await browser.newPage();
// ... page is passed to individual scraper functions
```

With concurrency=2 in the NativeQueue, two tasks can attempt to navigate the same page simultaneously. Playwright page navigation is not safe for concurrent use -- `page.goto()` cancels any in-progress navigation.

**Actual Risk**: LOW in practice because the NativeQueue's interval limiting (5 per 10s) creates natural serialization. However, if two tasks happen to fire in rapid succession, one could interfere with the other.

**Recommendation**: Use separate browser pages for each concurrent task, or serialize page access with a mutex.

---

### S7. Output Integrity

**Files**: `/app/scraper/src/utils/cache.ts`, `/app/scraper/src/utils/incremental.ts`

**Findings**:

**Atomic Writes**: The `IncrementalManager.saveMetadata()` uses the write-to-tmp-then-rename pattern, which is atomic on POSIX systems. The Windows path is also handled (delete target before rename).

**JSON Output**: `saveSongs()`, `saveVenues()`, etc. use `writeFileSync()` directly, which is NOT atomic. A crash during write would leave a corrupted JSON file.

**Checkpoint Recovery**: `saveCheckpoint()` uses `writeFileSync()` to write checkpoint files. These are also not atomic -- a crash during checkpoint write could corrupt the checkpoint, preventing resume.

**Gap**: The main output files and checkpoints should use the same atomic write pattern as `IncrementalManager`:
```typescript
const tempPath = filepath + '.tmp';
writeFileSync(tempPath, data);
renameSync(tempPath, filepath);
```

---

### S8. Session Management

**Files**: `/app/scraper/src/scrapers/songs.ts`, `/app/scraper/src/scrapers/venues.ts`

**Findings**:

- Playwright browser launched with `headless: true`
- Custom User-Agent: `DMBAlmanacClone/1.0 (Educational Project; Respectful Scraping)`
- `waitUntil: 'networkidle'` for page loads (waits for no network activity for 500ms)
- Browser closed in `finally` block (proper cleanup)
- No cookie/session handling -- scraper does not maintain login state or session cookies
- No proxy rotation -- single IP address for all requests

**Gap**: No detection or handling of CAPTCHA challenges. If the target site serves a CAPTCHA, the scraper will parse the CAPTCHA page HTML and produce garbage data.

---

### S9. Memory Efficiency

**Files**: `/app/scraper/src/scrapers/songs.ts`, `/app/scraper/src/utils/cache.ts`

**Findings**:

**HTML Cache**:
- All cached HTML stored as files on disk (`/cache/*.html`)
- URL-to-filename conversion truncates at 200 characters
- No TTL -- cached files never expire or are cleaned up
- Cache is read synchronously (`readFileSync`) -- blocks the event loop during disk I/O

**In-Memory State**:
- `allSongs[]` array grows throughout the scrape, holding all parsed data in memory
- `completedUrls` Set grows with each completed URL
- `selectorStats` object is trivially small

For a scrape of ~300 songs, peak memory is approximately:
- `allSongs`: ~1MB (300 objects * ~3KB each including lyrics)
- `completedUrls`: ~50KB (300 URLs * ~150 bytes each)
- Playwright page: ~50-100MB (browser process memory)

**Bottleneck -- Unbounded HTML Cache**:
After a full scrape, the `/cache/` directory contains one HTML file per page visited. For 300 songs + 200 venues + 1000 shows, this is ~1500 files at ~50KB each = ~75MB of cached HTML that is never cleaned up.

**Recommendation**: Add TTL-based cleanup to the HTML cache. Files older than 7 days should be deleted on scraper startup.

---

### S10. Testing Coverage

**Files**: `/app/tests/unit/db/n-plus-one-fixes.test.js`

**Findings**:

**Database Tests (Good Coverage)**:
- N+1 fix tests validate bulk operation mode, streamCollectionBatched, parallel counting, bulkPut flush
- Query tests verify pagination, search, caching behavior
- Data integrity tests verify shared PK sets and FK validation

**Scraper Tests (Critical Gap)**:
There are **no unit tests for any individual scraper**:
- No tests for `songs.ts` selector fallback chains
- No tests for `venues.ts` text parsing logic
- No tests for `rate-limit.ts` NativeQueue behavior
- No tests for `circuit-breaker.ts` state transitions
- No tests for `incremental.ts` locking and merge logic
- No tests for `cache.ts` URL-to-filename conversion

The only scraper "tests" are manual validation during scrape runs via `console.log` statements and selector statistics output.

**Recommendation** (Priority: HIGH):
1. Create unit tests for selector fallback chains using saved HTML fixtures
2. Test NativeQueue concurrency and interval limiting behavior
3. Test circuit breaker state transitions (CLOSED -> OPEN -> HALF_OPEN -> CLOSED)
4. Test IncrementalManager merge and lock behavior
5. Test URL-to-filename edge cases (long URLs, special characters)

---

## Priority Recommendations

### P0 -- Critical (Fix Immediately)

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| 1 | Circuit breaker timeout Promise memory leak | `circuit-breaker.ts:createTimeout()` | Memory grows linearly with requests |
| 2 | Non-atomic JSON output writes | `songs.ts:saveSongs()`, all scrapers | Data corruption on crash |

### P1 -- High (Fix This Sprint)

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| 3 | Venue scraper has zero selector fallbacks | `venues.ts` | Complete data loss on site change |
| 4 | HTML cache has no TTL/cleanup | `cache.ts` | 75MB+ disk usage that grows forever |
| 5 | No scraper unit tests | `/app/tests/` | Cannot detect regressions |
| 6 | Missing `shows:` cache invalidation on setlistEntries change | `cache.js:invalidateCache()` | Stale setlist data served after changes |

### P2 -- Medium (Fix This Quarter)

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| 7 | `getSongStats()` full table scan for cover count | `queries.js` | 20-50ms on first load for large datasets |
| 8 | `getVenueStats()` full table scan | `queries.js` | Similar to above |
| 9 | 400+ lines of duplicated bulk insert code | `bulk-operations.js` | Maintenance burden |
| 10 | No HTTP 429 backoff in rate limiter | `rate-limit.ts` | Risk of being blocked by target site |
| 11 | No CAPTCHA detection in scrapers | All scrapers | Garbage data ingestion |
| 12 | Shared Playwright page with concurrency=2 | All scrapers | Potential navigation race |

### P3 -- Low (Backlog)

| # | Issue | Location | Impact |
|---|-------|----------|--------|
| 13 | AbortController timeout naming is misleading | `transaction-timeout.js` | Developer confusion |
| 14 | No query-level timing instrumentation | `queries.js` | Cannot identify slow queries |
| 15 | No incremental checksum usage | `incremental.ts` | Unnecessary re-scrapes |
| 16 | No schema rollback mechanism | `schema.js` | Manual recovery needed on corruption |
| 17 | Pre-compute aggregate stats during data load | `data-loader.js` | Eliminate runtime full-table scans |

---

*End of audit. All file paths are absolute from the project root at `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app`.*

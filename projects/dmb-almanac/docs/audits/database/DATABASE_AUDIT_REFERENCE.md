# Database Audit Reference - DMB Almanac

## Architecture

- Client-side: Dexie.js 4.x wrapping IndexedDB
- Server-side: SQLite (better-sqlite3, WAL mode)
- WASM: disabled (Vite 6 incompatibility), JS fallback active
- Schema: 9 versions, 21 tables, 47 indexed fields

## Schema Evolution (v1-v9)

| Version | Changes |
|---------|---------|
| v1 | Initial: 16 tables, basic indexes |
| v2 | Compound indexes: `[venueId+date]`, `[songId+year]`, `[year+slot]`, `[guestId+year]`; added opener/closer/encore counts |
| v3 | `[tourId+date]`, `[showId+position]`, `[isLiberated+daysSince]`; removed low-selectivity boolean indexes |
| v4 | `[songId+showDate]`, `[venueId+year]`; removed `state` index on venues |
| v5 | `[status+createdAt]` on offlineMutationQueue; added telemetryQueue table |
| v6 | TTL eviction support for queue tables |
| v7 | `[country+state]` on venues; removed invalid `[isLiberated+year]` on setlistEntries |
| v8 | `pageCache` table for offline-first page data |
| v9 | Removed 6 unused compound indexes (~2-5MB savings) |

## Tables (v9, 21 total)

- **Core**: venues, songs, tours, shows, setlistEntries
- **Guests**: guests, guestAppearances
- **Stats**: liberationList, songStatistics
- **User**: userAttendedShows, userFavoriteSongs, userFavoriteVenues
- **Content**: curatedLists, curatedListItems, releases, releaseTracks
- **System**: syncMeta, offlineMutationQueue, telemetryQueue, pageCache

## Active Compound Indexes (v9)

| Table | Index | Query Pattern |
|-------|-------|---------------|
| shows | `[venueId+date]` | Venue show chronology |
| shows | `[tourId+date]` | Tour show chronology |
| setlistEntries | `[songId+year]` | Song year breakdown |
| setlistEntries | `[year+slot]` | Top openers/closers by year |
| setlistEntries | `[showId+position]` | Ordered setlist retrieval |
| guestAppearances | `[guestId+year]` | Guest year breakdown |
| liberationList | `[isLiberated+daysSince]` | Liberation list filtering |
| songs | `[isLiberated+daysSinceLastPlayed]` | Liberation song lookup |
| venues | `[country+state]` | Geographic filtering |
| offlineMutationQueue | `[status+createdAt]` | FIFO queue processing |
| telemetryQueue | `[status+createdAt]` | FIFO queue processing |
| pageCache | `[route+createdAt]` | Route-based TTL queries |

## Query Optimization

- N+1 fixes: `bulkGet()` for batch fetches (8 occurrences in queries.js)
- `searchWithRankedResults()` shared helper eliminates duplication across search functions
- `streamCollectionBatched()` reduces per-item Promise overhead to 0
- `dedupeRequest()` prevents concurrent identical queries (re-render storms)
- Input validation: `validateId()`, `validateOffset()`, `validatePageSize()`, `validateYear()`, etc.
- `QueryLimits` constants prevent magic numbers

## Bottlenecks

- **`getSongStats()` full table scan**: `db.songs.each()` iterates all songs to count covers (~5-10ms for 300 songs, 20-50ms for 1000+). Pre-compute during data load.
- **`getVenueStats()` full table scan**: iterates all venues for aggregate stats. Same fix.
- **400+ lines duplicated bulk insert code**: 5 nearly identical functions in `bulk-operations.js`. Refactor to use generic `bulkOperation()` from query-helpers.js
- **AbortController timeout misleading**: `withTransactionTimeout()` uses AbortController but IndexedDB transactions cannot be externally aborted. Works as detection, not cancellation.

## Transaction Patterns

- `withTransactionTimeout()`: 30s timeout, 3 retries, exponential backoff (1s base, 30s cap), +/-20% jitter
- `withBulkOperationTimeout()`: 120s timeout, 5 retries, 2s base delay
- `abortAndRetryTransaction()`: 5s timeout, 2 retries, 500ms delay
- Deadlock detection: regex patterns for deadlock, lock timeout, version mismatch
- `QuotaExceededError`: correctly not retried
- `TransactionHealthMonitor`: tracks success/timeout/deadlock rates per operation

## Cache System

- `QueryCache` singleton: Map-based, TTL expiration, LRU eviction at 100 entries, cleanup every 60s
- SWR support: background revalidation, `revalidating` flag prevents duplicates
- Dexie hook integration: `creating`/`updating`/`deleting` hooks on 12 tables
- Debounced UI notification: cache invalidation immediate, CustomEvent dispatch at 100ms

### TTL Presets

| Type | Fresh | Stale Window |
|------|-------|--------------|
| Statistics | 5 min | 10 min |
| Aggregations | 10 min | 20 min |
| Top Lists | 15 min | 30 min |
| Static Data | 30 min | 1 hr |
| Liberation | 5 min | 1 hr |

### Cache Gap

- `setlistEntries` invalidation does NOT cascade to `shows:` prefix
- `getShowWithSetlist()` serves stale setlist data until own TTL expires

## Data Integrity Validation

- FK validation across setlistEntries, shows, guestAppearances, liberationList, releaseTracks, curatedListItems
- Orphan detection: songs with no setlist entries (totalPerformances=0), venues/tours with no shows
- Embedded data verification: cross-checks denormalized song titles, venue/tour names
- Shared PK set fetching via `fetchAllPrimaryKeySets()`: 7 parallel calls instead of 12+
- `enableBulkOperationMode()`: Set-based FK check O(1) during bulk ops
- Validation capped at 1000 violations to prevent memory exhaustion
- No corruption detection beyond table count checks

## Bulk Operations

- Shows: 100/batch (~500 bytes/record)
- Songs: 200/batch (~300 bytes/record)
- Venues: 200/batch (~150 bytes/record)
- Setlist entries: 500/batch (~200 bytes/record, pre-flight FK validation)
- Deletes: 1000/batch
- Updates: 50/batch (conservative, read-modify-write)
- Data loader: 2000 records/batch, yield every 2 batches, Brotli > gzip > uncompressed

## Storage

- Denormalization: shows embed full venue/tour objects (~200 bytes/show, eliminates 2 index lookups)
- Compression: Brotli 97.4% reduction (26MB to 682KB)
- Computed fields: `searchText`, `sortTitle`, `year`, `showDate` pre-computed at load time
- TTL eviction: offline mutation queue and telemetry expire after 7 days

## Error Recovery (3 layers)

1. **Query**: `safeQuery()` with 3 retries, exponential backoff (10ms, 20ms, 40ms)
2. **Transaction**: timeout with retries, deadlock detection, jitter
3. **Application**: SW cache fallback, per-entity error isolation, `QuotaExceededError` CustomEvent

## DB Methods (DMBAlmanacDB class)

```javascript
async ensureOpen()           // Ensures DB open before queries
async getSyncMeta()          // Retrieves sync metadata singleton
getConnectionState()         // Returns 'open'|'closed'|'opening'|'error'
async updateSyncMeta(updates) // Updates sync metadata
getMigrationHistory()        // View migration history
getMigrationLogs()           // View migration logs
getTableSizes()              // Count records per table
verifyIntegrity()            // Run integrity checks
getStorageEstimate()         // Check quota usage
```

## Debugging Tools

```javascript
// Browser console or component:
import { validateDataIntegrity } from '$db/dexie/validation/data-integrity';
const results = await validateDataIntegrity();
```

## Scraper Database Integration

### Rate Limiting
- NativeQueue: concurrency=2, 5 req/10s interval
- `randomDelay(1000, 3000)` between page fetches
- No HTTP 429 backoff or Retry-After header support

### Circuit Breaker
- 5 consecutive failures -> OPEN, 60s cooldown, 3 successes -> CLOSED
- **Memory leak**: `createTimeout()` Promise never resolved on success; clearTimeout needed

### Selector Resilience
- Songs scraper: 16 fallback selectors across 4 data points (excellent)
- Venues scraper: 0 fallback selectors (critical brittleness)

### Data Validation
- Minimum counts: Songs 150, Venues 50, Shows 100, Guests 20, Tours 10
- 30% drop detection for incremental scrapes
- No schema validation (Zod/JSON Schema) at scrape output time

### Output Issues
- JSON output uses `writeFileSync()` (not atomic, corruption risk on crash)
- HTML cache has no TTL (unbounded disk growth, ~75MB after full scrape)
- No scraper unit tests (critical gap)

## Priority Fixes

### P0 (Immediate)
- Circuit breaker timeout Promise memory leak
- Non-atomic JSON output writes in scrapers

### P1 (This Sprint)
- Venue scraper: add selector fallbacks
- HTML cache: add TTL cleanup (7-day expiry)
- Add scraper unit tests
- Fix `shows:` cache invalidation on setlistEntries change

### P2 (This Quarter)
- Pre-compute `getSongStats()`/`getVenueStats()` aggregates at load time
- Deduplicate bulk insert code (~400 lines)
- Add HTTP 429 backoff to rate limiter
- Add CAPTCHA detection

### P3 (Backlog)
- Rename `withTransactionTimeout` to `withTransactionDeadline`
- Add query-level timing instrumentation
- Implement incremental checksums
- Schema rollback mechanism
- Query profiler for cache hit rates

## Test Results (Last Run)

- 511/511 unit tests passed (2.06s)
- DB queries: 46 tests, data loader: 7, query helpers: 47
- WASM force simulation: 30, security: 75, PWA: 66, stores: 35
- Migration path v1-v9: validated
- Schema integrity: 21 tables, all properly indexed

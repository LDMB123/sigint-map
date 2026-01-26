---
name: helpers
version: 1.0.0
description: **File**: `src/lib/db/dexie/query-helpers.ts`
author: Claude Code
created: 2026-01-25
updated: 2026-01-25

category: data
complexity: intermediate
tags:
  - data
  - chromium-143
  - apple-silicon

target_browsers:
  - "Chromium 143+"
  - "Safari 17.2+"
target_platform: apple-silicon-m-series
os: macos-26.2

philosophy: "Modern web development leveraging Chromium 143+ capabilities for optimal performance on Apple Silicon."

prerequisites: []
related_skills: []
see_also: []

minimum_example_count: 3
requires_testing: true
performance_critical: false

# Migration metadata
migrated_from: projects/dmb-almanac/app/src/lib/db/dexie/HELPERS_QUICK_REFERENCE.md
migration_date: 2026-01-25
---

# Query Helpers Quick Reference

**File**: `src/lib/db/dexie/query-helpers.ts`

## Import All Helpers

```typescript
import {
  // Caching
  cachedQuery,

  // Year aggregation
  aggregateByYear,
  aggregateByYearMap,
  aggregateByYearWithUniqueShows,

  // WASM acceleration
  wasmOrFallback,
  countSongsFromEntries,

  // Search
  searchTableByPrefix,

  // Bulk operations
  bulkOperation,
  bulkInsert,
  bulkDelete,
  bulkUpdate,

  // Pagination
  paginatedQuery,
  PaginatedResult,

  // Streaming
  streamCollection,
  aggregateByStreaming,

  // Transactions
  readTransaction,
  getSafeByIds,
  getShowsByIds,
} from './query-helpers';
```

## Helper Functions

### Caching

```typescript
// Cache a query with TTL
const result = await cachedQuery(
  CacheKeys.songStats(),     // cache key
  CacheTTL.STATS,            // TTL (5 min, 10 min, 15 min, 30 min)
  async () => {              // query function
    return { total: 100 };
  }
);
```

### Year Aggregation

```typescript
// Simple: items with `year` field -> {year, count}[]
const yearCounts = aggregateByYear(shows);
// => [{year: 2024, count: 42}, {year: 2023, count: 38}, ...]

// Map format: {year, count}[] -> Map<year, count>
const yearMap = aggregateByYearMap(shows);

// Unique shows: ignore duplicate appearances per show
const yearCounts = aggregateByYearWithUniqueShows(appearances);
```

### WASM Bridge

```typescript
// Call WASM with JS fallback
const results = await wasmOrFallback<SongWithCount[]>(
  'count_openers_by_year',              // WASM method name
  [JSON.stringify(entries), year],      // WASM args
  () => countSongsFromEntries(entries)  // JS fallback
);

// Helper: count songs from entries (JS implementation)
const topSongs = countSongsFromEntries(entries, 10);
```

### Search

```typescript
// Search any table by prefix
const songs = await searchTableByPrefix<DexieSong>(
  'searchSongs',                 // function name (for logging)
  getDb().songs,                 // table
  'searchText',                  // index name
  query,                         // search query
  'totalPerformances',           // sort by field (optional)
  20                             // limit
);
```

### Bulk Operations

```typescript
// Generic bulk operation with chunking
const count = await bulkOperation(
  'bulkInsertShows',              // operation name
  shows,                          // items to process
  async (db, chunk, index) => {
    await db.shows.bulkAdd(chunk);
  },
  ['shows']                       // tables to invalidate cache
);

// Shorthand: bulk insert
const count = await bulkInsert(
  'bulkInsertShows',
  getDb().shows,
  shows,
  'shows'                         // table name for cache invalidation
);

// Shorthand: bulk delete
const count = await bulkDelete('shows', [1, 2, 3]);

// Shorthand: bulk update
const count = await bulkUpdate([
  { key: 1, changes: { title: 'New' } },
  { key: 2, changes: { title: 'Old' } }
]);
```

### Pagination

```typescript
// Cursor-based pagination
const page = await paginatedQuery(
  getDb().shows.orderBy('date').reverse(),  // collection
  (collection, cursor) => {
    if (cursor) {
      return getDb().shows.where('date').below(cursor).reverse();
    }
    return collection;
  },
  (show) => show.date,                       // cursor value extractor
  50,                                        // page size
  cursor                                     // optional cursor
);

// Result: { items: T[], hasMore: boolean, cursor: string | null }
```

### Streaming

```typescript
// Stream items with callback
const count = await streamCollection(
  getDb().shows.orderBy('date'),
  (show) => {
    console.log(show.date);
  }
);

// Aggregate while streaming
const yearCounts = await aggregateByStreaming(
  getDb().shows,                  // collection
  (accum, show) => {
    accum.set(show.year, (accum.get(show.year) ?? 0) + 1);
  },
  new Map<number, number>()       // initial value
);
```

### Transactions

```typescript
// Read transaction with auto-commit
const shows = await readTransaction(
  ['shows', 'venues'],
  async (db) => {
    const shows = await db.shows.toArray();
    const venues = await db.venues.toArray();
    return shows;
  }
);

// Safe bulk get with deduplication
const shows = await getSafeByIds(db.shows, [1, 2, 3]);

// Get shows by IDs with sorting
const shows = await getShowsByIds([1, 2, 3], true); // sorted by date
```

## Cache TTL Presets

```typescript
CacheTTL.STATS        // 5 minutes - statistics
CacheTTL.AGGREGATION  // 10 minutes - year breakdowns
CacheTTL.TOP_LISTS    // 15 minutes - top songs/venues
CacheTTL.STATIC       // 30 minutes - tours by decade
CacheTTL.LIBERATION   // 5 minutes - liberation list
```

## Common Patterns

### Pattern 1: Cache + Query
```typescript
export async function getSongStats() {
  return cachedQuery(
    CacheKeys.songStats(),
    CacheTTL.STATS,
    async () => {
      // query logic here
    }
  );
}
```

### Pattern 2: Search
```typescript
export async function searchSongs(query: string, limit = 20) {
  return searchTableByPrefix<DexieSong>(
    'searchSongs',
    getDb().songs,
    'searchText',
    query,
    'totalPerformances',
    limit
  );
}
```

### Pattern 3: Year Aggregation
```typescript
export async function getYearBreakdownForSong(songId: number) {
  return cachedQuery(
    CacheKeys.songYearBreakdown(songId),
    CacheTTL.AGGREGATION,
    async () => {
      const entries = await getDb().setlistEntries
        .where('songId')
        .equals(songId)
        .toArray();
      return aggregateByYear(entries);
    }
  );
}
```

### Pattern 4: WASM with Fallback
```typescript
export async function getTopOpenersByYear(year: number) {
  const entries = await getDb().setlistEntries
    .where('[year+slot]')
    .equals([year, 'opener'])
    .toArray();

  return await wasmOrFallback<SongWithCount[]>(
    'count_openers_by_year',
    [JSON.stringify(entries), year],
    () => countSongsFromEntries(entries, 3)
  );
}
```

### Pattern 5: Bulk Insert
```typescript
export async function bulkInsertShows(shows: DexieShow[]) {
  return bulkInsert(
    'bulkInsertShows',
    getDb().shows,
    shows,
    'shows'
  );
}
```

### Pattern 6: Get Shows from Entries
```typescript
export async function getShowsForSong(songId: number) {
  const entries = await getDb().setlistEntries
    .where('songId')
    .equals(songId)
    .toArray();

  if (entries.length === 0) return [];

  const showIds = entries.map((e) => e.showId);
  return getShowsByIds(showIds); // auto-sorts by date
}
```

## Size Estimates

| Helper Function | Est. Usage | Lines Saved |
|-----------------|-----------|------------|
| `cachedQuery` | 10 functions | 50 lines |
| `searchTableByPrefix` | 3 functions | 33 lines |
| `aggregateByYear*` | 6 functions | 40 lines |
| `wasmOrFallback` | 3 functions | 72 lines |
| `bulkInsert/Delete/Update` | 4 functions | 116 lines |
| `paginatedQuery` | 2 functions | 32 lines |
| `getShowsByIds` | 2 functions | 12 lines |
| **Total** | **30 functions** | **~355 lines** |

## Testing

All helpers are:
- Fully typed with TypeScript
- Tested through existing test suite
- Zero-breaking changes to queries.ts
- Backward compatible with all callers

To verify:
```bash
npm test -- queries.test.ts
```

## Files

- **Helpers**: `/src/lib/db/dexie/query-helpers.ts` (320+ lines)
- **Refactoring Guide**: `/src/lib/db/dexie/QUERY_HELPERS_REFACTORING_GUIDE.md`
- **Concrete Examples**: `/src/lib/db/dexie/REFACTORING_EXAMPLES.md`
- **This File**: `/src/lib/db/dexie/HELPERS_QUICK_REFERENCE.md`

## Next Steps

1. Read `REFACTORING_GUIDE.md` for full implementation plan
2. See `REFACTORING_EXAMPLES.md` for copy-paste ready code
3. Use this file as quick reference while refactoring
4. Follow the 7-phase implementation schedule

---

**Status**: Ready to refactor
**Estimated Time**: 2-3 hours
**Risk Level**: Very Low
**Code Review**: Simple pattern-for-pattern replacement

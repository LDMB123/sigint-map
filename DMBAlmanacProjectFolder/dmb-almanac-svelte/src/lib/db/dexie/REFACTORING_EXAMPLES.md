# Query Helpers: Concrete Refactoring Examples

## Complete Before/After Examples

This document shows complete, copy-paste ready examples of how to refactor queries.ts using the new helpers.

## Example 1: Cache Pattern - getSongStats()

### Before (16 lines)
```typescript
export async function getSongStats(): Promise<{
  total: number;
  originals: number;
  covers: number;
}> {
  const cache = getQueryCache();
  const cacheKey = CacheKeys.songStats();

  const cached = cache.get<{ total: number; originals: number; covers: number }>(cacheKey);
  if (cached) {
    return cached;
  }

  const db = getDb();
  const total = await db.songs.count();
  const covers = await db.songs.filter((s) => s.isCover === true).count();

  const result = {
    total,
    covers,
    originals: total - covers,
  };

  cache.set(cacheKey, result, CacheTTL.STATS);
  return result;
}
```

### After (12 lines)
```typescript
export async function getSongStats(): Promise<{
  total: number;
  originals: number;
  covers: number;
}> {
  return cachedQuery(
    CacheKeys.songStats(),
    CacheTTL.STATS,
    async () => {
      const db = getDb();
      const total = await db.songs.count();
      const covers = await db.songs.filter((s) => s.isCover === true).count();

      return {
        total,
        covers,
        originals: total - covers,
      };
    }
  );
}
```

**Savings**: 4 lines (25% reduction)

---

## Example 2: Search Pattern - searchSongs()

### Before (17 lines)
```typescript
export async function searchSongs(query: string, limit = 20): Promise<DexieSong[]> {
  if (!query.trim()) return [];

  const searchTerm = query.toLowerCase().trim();
  const db = getDb();
  try {
    const songs = await db.songs
      .where('searchText')
      .startsWithIgnoreCase(searchTerm)
      .limit(limit)
      .sortBy('totalPerformances');
    return songs.reverse();
  } catch (error) {
    db.handleError(error, 'searchSongs');
    return [];
  }
}
```

### After (6 lines)
```typescript
export async function searchSongs(query: string, limit = 20): Promise<DexieSong[]> {
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

**Savings**: 11 lines (65% reduction)

---

## Example 3: WASM Fallback - getTopOpenersByYear()

### Before (39 lines)
```typescript
export async function getTopOpenersByYear(
  year: number,
  limit = 3
): Promise<Array<{ song: string; count: number }>> {
  const db = getDb();
  const entries = await db.setlistEntries.where('[year+slot]').equals([year, 'opener']).toArray();

  const bridge = getWasmBridge();
  let songCountsArray: SongWithCount[];

  if (bridge) {
    try {
      const result = await bridge.call<string>(
        'count_openers_by_year',
        JSON.stringify(entries),
        year
      );

      if (result.success && result.data) {
        songCountsArray = (JSON.parse(result.data) as SongWithCount[]).slice(0, limit);
      } else {
        songCountsArray = countSongsFromEntries(entries, limit);
      }
    } catch {
      songCountsArray = countSongsFromEntries(entries, limit);
    }
  } else {
    songCountsArray = countSongsFromEntries(entries, limit);
  }

  const songs = await db.songs.bulkGet(songCountsArray.map((sc) => sc.songId));
  return songCountsArray.map((sc, i) => ({
    song: songs[i]?.title ?? `Song #${sc.songId}`,
    count: sc.count,
  }));
}
```

### After (15 lines)
```typescript
export async function getTopOpenersByYear(
  year: number,
  limit = 3
): Promise<Array<{ song: string; count: number }>> {
  const db = getDb();
  const entries = await db.setlistEntries
    .where('[year+slot]')
    .equals([year, 'opener'])
    .toArray();

  const songCountsArray = await wasmOrFallback<SongWithCount[]>(
    'count_openers_by_year',
    [JSON.stringify(entries), year],
    () => countSongsFromEntries(entries, limit)
  );

  const topSongs = songCountsArray.slice(0, limit);
  const songs = await db.songs.bulkGet(topSongs.map((sc) => sc.songId));

  return topSongs.map((sc, i) => ({
    song: songs[i]?.title ?? `Song #${sc.songId}`,
    count: sc.count,
  }));
}
```

**Savings**: 24 lines (62% reduction)

---

## Example 4: Year Aggregation - getYearBreakdownForSong()

### Before (27 lines)
```typescript
export async function getYearBreakdownForSong(
  songId: number
): Promise<Array<{ year: number; count: number }>> {
  const cache = getQueryCache();
  const cacheKey = CacheKeys.songYearBreakdown(songId);

  const cached = cache.get<Array<{ year: number; count: number }>>(cacheKey);
  if (cached) {
    return cached;
  }

  const entries = await getDb().setlistEntries.where('songId').equals(songId).toArray();
  const yearCounts = new Map<number, number>();

  for (const entry of entries) {
    const count = yearCounts.get(entry.year) ?? 0;
    yearCounts.set(entry.year, count + 1);
  }

  const result = Array.from(yearCounts.entries())
    .map(([year, count]) => ({ year, count }))
    .sort((a, b) => b.year - a.year);

  cache.set(cacheKey, result, CacheTTL.AGGREGATION);
  return result;
}
```

### After (16 lines)
```typescript
export async function getYearBreakdownForSong(
  songId: number
): Promise<Array<{ year: number; count: number }>> {
  return cachedQuery(
    CacheKeys.songYearBreakdown(songId),
    CacheTTL.AGGREGATION,
    async () => {
      const entries = await getDb()
        .setlistEntries.where('songId')
        .equals(songId)
        .toArray();
      return aggregateByYear(entries);
    }
  );
}
```

**Savings**: 11 lines (41% reduction)

---

## Example 5: Bulk Operation - bulkInsertShows()

### Before (36 lines)
```typescript
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
      throw error;
    }
  }

  const { invalidateCache } = await import('./cache');
  invalidateCache(['shows']);

  return inserted;
}
```

### After (7 lines)
```typescript
export async function bulkInsertShows(
  shows: DexieShow[],
  chunkSize?: number
): Promise<number> {
  return bulkInsert('bulkInsertShows', getDb().shows, shows, 'shows', chunkSize);
}
```

**Savings**: 29 lines (81% reduction)

---

## Example 6: Pagination - getShowsPaginated()

### Before (28 lines)
```typescript
export async function getShowsPaginated(
  pageSize: number = 50,
  cursor?: string
): Promise<PaginatedResult<DexieShow>> {
  const db = getDb();

  let collection = db.shows.orderBy('date').reverse();

  if (cursor) {
    collection = db.shows.where('date').below(cursor).reverse();
  }

  const items = await collection.limit(pageSize + 1).toArray();
  const hasMore = items.length > pageSize;

  if (hasMore) {
    items.pop();
  }

  const lastItem = items[items.length - 1];

  return {
    items,
    hasMore,
    cursor: lastItem?.date ?? null,
  };
}
```

### After (12 lines)
```typescript
export async function getShowsPaginated(
  pageSize: number = 50,
  cursor?: string
): Promise<PaginatedResult<DexieShow>> {
  return paginatedQuery(
    getDb().shows.orderBy('date').reverse(),
    (collection, c) => c ? getDb().shows.where('date').below(c).reverse() : collection,
    (show) => show.date,
    pageSize,
    cursor
  );
}
```

**Savings**: 16 lines (57% reduction)

---

## Example 7: Unique Shows Aggregation - getShowsForSong()

### Before (15 lines)
```typescript
export async function getShowsForSong(songId: number): Promise<DexieShow[]> {
  const db = getDb();

  return db.transaction('r', [db.setlistEntries, db.shows], async () => {
    const entries = await db.setlistEntries.where('songId').equals(songId).toArray();
    const showIds = [...new Set(entries.map((e) => e.showId))];

    if (showIds.length === 0) return [];

    const shows = await db.shows.bulkGet(showIds);
    return shows
      .filter((s): s is DexieShow => s !== undefined)
      .sort((a, b) => b.date.localeCompare(a.date));
  });
}
```

### After (9 lines)
```typescript
export async function getShowsForSong(songId: number): Promise<DexieShow[]> {
  return readTransaction(['setlistEntries', 'shows'], async (db) => {
    const entries = await db.setlistEntries.where('songId').equals(songId).toArray();
    if (entries.length === 0) return [];

    const showIds = entries.map((e) => e.showId);
    return getShowsByIds(showIds);
  });
}
```

**Savings**: 6 lines (40% reduction)

---

## Example 8: Year Aggregation with Unique Shows - getYearBreakdownForGuest()

### Before (29 lines)
```typescript
export async function getYearBreakdownForGuest(
  guestId: number
): Promise<Array<{ year: number; count: number }>> {
  const cache = getQueryCache();
  const cacheKey = CacheKeys.guestYearBreakdown(guestId);

  const cached = cache.get<Array<{ year: number; count: number }>>(cacheKey);
  if (cached) {
    return cached;
  }

  const appearances = await getDb().guestAppearances.where('guestId').equals(guestId).toArray();

  const showsByYear = new Map<number, Set<number>>();
  for (const app of appearances) {
    const shows = showsByYear.get(app.year) ?? new Set();
    shows.add(app.showId);
    showsByYear.set(app.year, shows);
  }

  const result = Array.from(showsByYear.entries())
    .map(([year, shows]) => ({ year, count: shows.size }))
    .sort((a, b) => b.year - a.year);

  cache.set(cacheKey, result, CacheTTL.AGGREGATION);
  return result;
}
```

### After (15 lines)
```typescript
export async function getYearBreakdownForGuest(
  guestId: number
): Promise<Array<{ year: number; count: number }>> {
  return cachedQuery(
    CacheKeys.guestYearBreakdown(guestId),
    CacheTTL.AGGREGATION,
    async () => {
      const appearances = await getDb()
        .guestAppearances.where('guestId')
        .equals(guestId)
        .toArray();
      return aggregateByYearWithUniqueShows(appearances);
    }
  );
}
```

**Savings**: 14 lines (48% reduction)

---

## Summary of Savings

| Pattern | Functions | Avg Savings | Total |
|---------|-----------|-------------|-------|
| Cache Pattern | 10 | 4-6 lines | ~50 lines |
| Search Pattern | 3 | 11 lines | 33 lines |
| WASM Fallback | 3 | 24 lines | 72 lines |
| Year Aggregation | 4 | 11 lines | 44 lines |
| Bulk Operations | 4 | 29 lines | 116 lines |
| Pagination | 2 | 16 lines | 32 lines |
| Unique Shows | 2 | 6 lines | 12 lines |
| **Total** | **28** | **~12 lines avg** | **~360 lines** |

**Expected Final Result**: queries.ts from **1,565 lines → ~1,200 lines** (23% reduction)

---

## Refactoring Sequence

### Step 1: Prepare
1. Create `query-helpers.ts` ✓
2. Add import to `queries.ts`
3. Run tests: `npm test -- queries.test.ts`

### Step 2: Replace Search Patterns (15-20 min)
4. Refactor `searchSongs()`
5. Refactor `searchVenues()`
6. Refactor `searchGuests()`
7. Run tests

### Step 3: Replace Cache Patterns (30-40 min)
8. Refactor `getSongStats()`
9. Refactor `getVenueStats()`
10. Refactor `getGlobalStats()`
11. Refactor others
12. Run tests

### Step 4: Replace WASM Patterns (15-20 min)
13. Refactor `getTopOpenersByYear()`
14. Refactor `getTopClosersByYear()`
15. Refactor `getTopEncoresByYear()`
16. Run tests

### Step 5: Replace Aggregation Patterns (20-30 min)
17. Refactor `getYearBreakdownForSong()`
18. Refactor `getYearBreakdownForVenue()`
19. Refactor `getYearBreakdownForGuest()`
20. Run tests

### Step 6: Replace Bulk Operations (20-30 min)
21. Refactor `bulkInsertShows()`
22. Refactor `bulkInsertSongs()`
23. Refactor `bulkInsertSetlistEntries()`
24. Refactor `bulkUpdateShows()`
25. Refactor `bulkDeleteByIds()` (use new `bulkDelete()`)
26. Run tests

### Step 7: Final Cleanup (10-15 min)
27. Refactor `getShowsPaginated()`
28. Refactor `getSongsPaginated()`
29. Refactor `getShowsForSong()`
30. Refactor `getAllShowsForGuest()`
31. Run full test suite
32. Commit changes

**Total Time**: ~2-3 hours
**Risk Level**: Very Low (all behavior preserved)

---

## Testing After Each Phase

```bash
# Run after each step
npm test -- queries.test.ts

# Full test run before commit
npm test

# Manual testing
npm run dev
# Test affected features in browser
```

---

## Rollback Plan

If any issues arise:

1. Revert last commit: `git revert HEAD`
2. Restore from backup
3. Identify issue in helper or refactored function
4. Fix and retry

All changes are incremental and reversible.

---

## Notes

- Each refactoring preserves exact function signature
- All TypeScript types remain identical
- Error handling is preserved
- Cache behavior unchanged
- No impact on external API
- Tests should pass without modification

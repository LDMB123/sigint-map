# IndexedDB Query Performance - Quick Reference

## Index Usage Guide

### When to Use Each Index

```typescript
// ============================================================================
// PRIMARY USE CASES
// ============================================================================

// 1. GET BY ID (Always fastest - O(1))
const song = await db.songs.get(123);  // Primary key lookup
const venue = await db.venues.get(45);

// 2. FILTER BY SINGLE FIELD (O(log n) with index)
const shows = await db.shows.where('year').equals(2024).toArray();
const songs = await db.songs.where('slug').equals('crash-into-me').first();
const venues = await db.venues.where('country').equals('USA').toArray();

// 3. TOP N BY NUMERIC FIELD (O(log n) + k items)
const topSongs = await db.songs
  .where('totalPerformances')
  .above(0)
  .reverse()
  .limit(10)
  .toArray();

const topVenues = await db.venues
  .where('totalShows')
  .above(0)
  .reverse()
  .limit(25)
  .toArray();

// 4. RANGE QUERIES (O(log n) + k items)
const recentShows = await db.shows
  .where('date')
  .between('2024-01-01', '2024-12-31')
  .toArray();

// 5. SEARCH/PREFIX MATCHING (O(log n) + k items with startsWithIgnoreCase)
const matches = await db.songs
  .where('searchText')
  .startsWithIgnoreCase('crash')
  .limit(20)
  .toArray();

// ============================================================================
// COMPOUND INDEX PATTERNS
// ============================================================================

// 6. TWO-FIELD FILTERING + ORDERING ([field1+field2])
// Pattern: WHERE field1 = x AND field2 BETWEEN a AND b
// Index: [field1+field2]

// Example: Get all shows for venue 1, any year
const venueShows = await db.shows
  .where('[venueId+date]')
  .between([1, '0000-01-01'], [1, '9999-12-31'])
  .toArray();

// Example: Get shows for venue 1 in year 2024
const venueShowsIn2024 = await db.shows
  .where('[venueId+date]')
  .between([1, '2024-01-01'], [1, '2024-12-31'])
  .toArray();

// Example: Year breakdown for song 456
const songYears = await db.setlistEntries
  .where('[songId+year]')
  .between([456, 1990], [456, 2100])
  .toArray();

// Then aggregate:
const yearCounts = new Map();
for (const entry of songYears) {
  yearCounts.set(entry.year, (yearCounts.get(entry.year) ?? 0) + 1);
}

// 7. THREE-FIELD QUERIES (Use two-level compound index approach)
// Example: Get closers (slot='closer') from year 2023

// Method A: Use [year+slot] index
const closers2023 = await db.setlistEntries
  .where('[year+slot]')
  .between([2023, 'closer'], [2023, 'closer\uffff'])
  .toArray();

// Method B: Filter after index lookup
const set1Closers2023 = closers2023.filter(e => e.setName === 'set1');

// ============================================================================
// MEMORY-EFFICIENT PATTERNS
// ============================================================================

// 8. CURSOR-BASED PAGINATION (For large result sets)
async function paginateVenueShows(venueId, pageSize = 50, cursor = null) {
  let collection = db.shows
    .where('[venueId+date]')
    .between([venueId, '0000-01-01'], [venueId, '9999-12-31'])
    .reverse();

  if (cursor) {
    collection = db.shows
      .where('[venueId+date]')
      .between([venueId, '0000-01-01'], [venueId, cursor])
      .reverse();
  }

  const items = await collection.limit(pageSize + 1).toArray();
  const hasMore = items.length > pageSize;
  if (hasMore) items.pop();

  return {
    items,
    hasMore,
    cursor: items[items.length - 1]?.date ?? null,
  };
}

// Usage:
const page1 = await paginateVenueShows(1, 50);
const page2 = await paginateVenueShows(1, 50, page1.cursor);

// 9. STREAMING/ITERATION (For memory pressure)
let count = 0;
await db.shows
  .where('[venueId+date]')
  .between([1, '0000-01-01'], [1, '9999-12-31'])
  .each((show) => {
    // Process one item at a time
    console.log(show.date);
    count++;
  });
console.log(`Total shows: ${count}`);

// 10. AGGREGATION VIA CURSOR (Not toArray())
const yearCounts = new Map();
await db.shows
  .where('[venueId+year]')
  .between([1, 0], [1, 9999])
  .each((show) => {
    yearCounts.set(show.year, (yearCounts.get(show.year) ?? 0) + 1);
  });

// ============================================================================
// ANTI-PATTERNS (AVOID THESE)
// ============================================================================

// ❌ DON'T: Load entire table into memory
const allShows = await db.shows.toArray();  // Could be 50K+ records!

// ✓ DO: Use pagination or streaming
const shows50 = await db.shows
  .orderBy('date')
  .reverse()
  .limit(50)
  .toArray();

// ❌ DON'T: Filter without index (O(n) full scan)
const coversNoIndex = await db.songs
  .toArray()  // Loads all songs!
  .then(songs => songs.filter(s => s.isCover));

// ✓ DO: Use indexed field or compound index
const covers = await db.songs
  .filter(s => s.isCover === true)  // Faster: filter on indexed field
  .count();

// ❌ DON'T: Multiple queries when one index works
const entries = await db.setlistEntries.where('songId').equals(456).toArray();
const years = entries.map(e => e.year);
const year2024 = years.filter(y => y === 2024);

// ✓ DO: Use compound index for direct filtering
const entries2024 = await db.setlistEntries
  .where('[songId+year]')
  .between([456, 2024], [456, 2024])
  .toArray();

// ❌ DON'T: Sort after loading (expensive)
const shows = await db.shows.where('year').equals(2024).toArray();
const sorted = shows.sort((a, b) => b.date.localeCompare(a.date));

// ✓ DO: Use orderBy or proper index
const sorted = await db.shows
  .where('year')
  .equals(2024)
  .sortBy('date');  // Or use [year+date] index

// ============================================================================
// TRANSACTION PATTERNS
// ============================================================================

// 11. CONSISTENT READ (multiple tables)
const result = await db.transaction('r', [db.shows, db.venues], async () => {
  const shows = await db.shows.where('year').equals(2024).toArray();
  const venues = await db.venues.toArray();
  return { shows, venues };
});

// 12. BULK GET WITH DEDUPLICATION
const showIds = [1, 2, 3, 1, 2];  // Has duplicates
const uniqueIds = [...new Set(showIds)];
const shows = await db.shows.bulkGet(uniqueIds);
const filtered = shows.filter(s => s !== undefined);

// ============================================================================
// CACHING PATTERNS
// ============================================================================

// 13. QUERY WITH CACHE
async function getCachedVenueStats(venueId) {
  const cache = getQueryCache();
  const key = `venue:${venueId}:stats`;

  // Check cache
  const cached = cache.get(key);
  if (cached) return cached;

  // Query
  const shows = await db.shows.where('venueId').equals(venueId).toArray();
  const stats = {
    count: shows.length,
    minYear: Math.min(...shows.map(s => s.year)),
    maxYear: Math.max(...shows.map(s => s.year)),
  };

  // Cache for 10 minutes
  cache.set(key, stats, 10 * 60 * 1000);
  return stats;
}

// ============================================================================
// REAL-WORLD EXAMPLES
// ============================================================================

// Example 1: Venue Detail Page
async function getVenuePageData(venueId) {
  return {
    venue: await db.venues.get(venueId),
    shows: await db.shows
      .where('[venueId+date]')
      .between([venueId, '0000-01-01'], [venueId, '9999-12-31'])
      .reverse()
      .limit(50)
      .toArray(),
    yearBreakdown: await db.shows
      .where('[venueId+year]')
      .between([venueId, 0], [venueId, 9999])
      .toArray()
      .then(shows => {
        const map = new Map();
        for (const show of shows) {
          map.set(show.year, (map.get(show.year) ?? 0) + 1);
        }
        return Array.from(map.entries())
          .map(([year, count]) => ({ year, count }))
          .sort((a, b) => b.year - a.year);
      }),
  };
}

// Example 2: Song Detail Page
async function getSongPageData(songId) {
  const shows = new Set();
  const years = new Map();

  // Use compound index to gather data efficiently
  await db.setlistEntries
    .where('[songId+showDate]')
    .between([songId, '0000-01-01'], [songId, '9999-12-31'])
    .reverse()
    .each((entry) => {
      shows.add(entry.showId);
      years.set(entry.year, (years.get(entry.year) ?? 0) + 1);
    });

  return {
    song: await db.songs.get(songId),
    shows: await db.shows.bulkGet(Array.from(shows)),
    yearBreakdown: Array.from(years.entries())
      .map(([year, count]) => ({ year, count }))
      .sort((a, b) => b.year - a.year),
  };
}

// Example 3: Top Songs by Performance
async function getTopSongsByPerformanceIn(year) {
  // Count performances by song for a specific year
  const songCounts = new Map();

  await db.setlistEntries
    .where('[year+songId]')  // Use year as primary filter
    .between([year, 0], [year, 999999])
    .each((entry) => {
      songCounts.set(entry.songId, (songCounts.get(entry.songId) ?? 0) + 1);
    });

  // Get top 20 songs
  const topSongIds = Array.from(songCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([id]) => id);

  const songs = await db.songs.bulkGet(topSongIds);

  return songs
    .filter(s => s !== undefined)
    .map(song => ({
      song,
      count: songCounts.get(song.id),
    }))
    .sort((a, b) => b.count - a.count);
}

// ============================================================================
// PERFORMANCE MONITORING
// ============================================================================

// Measure query performance
async function measureQuery(name, queryFn) {
  const start = performance.now();
  const result = await queryFn();
  const duration = performance.now() - start;

  console.log(`${name}: ${duration.toFixed(2)}ms`);

  // Log if slow
  if (duration > 100) {
    console.warn(`SLOW QUERY: ${name} took ${duration.toFixed(2)}ms`);
  }

  return result;
}

// Usage:
const shows = await measureQuery(
  'getShowsByVenue',
  () => db.shows.where('[venueId+date]').between([1, '0000-01-01'], [1, '9999-12-31']).toArray()
);
```

---

## Index Summary Table

| Table | Field | Type | Usage |
|-------|-------|------|-------|
| songs | slug | unique | Get song by slug O(1) |
| songs | sortTitle | index | List all songs, sorted |
| songs | totalPerformances | index | Top songs by plays |
| songs | searchText | index | Song search prefix |
| venues | name | index | List venues |
| venues | totalShows | index | Top venues by shows |
| shows | date | index | Recent shows |
| shows | year | index | Shows by year |
| shows | venueId | index | Shows at venue |
| shows | tourId | index | Shows in tour |
| shows | [venueId+date] | compound | Venue shows chronological |
| shows | [tourId+date] | compound | Tour shows chronological |
| shows | [venueId+year] | compound | Venue year breakdown ✨ v7 |
| setlistEntries | songId | index | Song in which shows |
| setlistEntries | [showId+position] | compound | Setlist ordered |
| setlistEntries | [songId+year] | compound | Song year breakdown |
| setlistEntries | [year+slot] | compound | Openers/closers by year |
| setlistEntries | [songId+showDate] | compound | Song shows chronological |
| guestAppearances | guestId | index | Guest appearances |
| guestAppearances | [guestId+year] | compound | Guest year breakdown |
| liberationList | [isLiberated+daysSince] | compound | Liberation filtering |

---

## Performance Targets

```typescript
// Query performance targets (with proper indexes)

// ✓ GOOD (< 20ms)
- get(id)
- where().equals().first()
- where().equals().limit(10).toArray()

// ✓ ACCEPTABLE (20-50ms)
- where().equals().limit(50).toArray()
- where('[field1+field2]').between().limit(50).toArray()
- compound index aggregation with .each()

// ⚠ SLOW (50-200ms)
- where().equals().toArray() (for 100+ results)
- Full table .each() or .toArray()
- Multiple index lookups

// ✗ VERY SLOW (> 200ms)
- .filter() on large result sets
- No index on where() field
- Loading entire tables (1000+ records)
```


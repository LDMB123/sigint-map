/**
 * DMB Almanac - Dexie Query Functions
 *
 * Client-side query functions that mirror the server-side SQLite queries.
 * These functions provide offline access to all data with efficient IndexedDB queries.
 *
 * Key patterns:
 * - Functions return the same shape as server-side queries for drop-in replacement
 * - Compound queries use Dexie's efficient indexing
 * - Expensive aggregations are cached with TTL-based expiration
 * - Results are cached via Dexie's reactive query system
 */

import Dexie from 'dexie';
import { CacheKeys, CacheTTL, getQueryCache } from './cache';
import { getDb } from './db';
import type {
  DexieGuest,
  DexieGuestAppearance,
  DexieLiberationEntry,
  DexieSetlistEntry,
  DexieShow,
  DexieSong,
  DexieTour,
  DexieVenue,
  SearchResult,
  UserAttendedShow,
  UserFavoriteSong,
  UserFavoriteVenue,
} from './schema';
import { getWasmBridge } from '$lib/wasm/bridge';
import type { SongWithCount } from '$lib/wasm/queries';

// ==================== PAGINATION HELPERS ====================

/**
 * Cursor-based pagination for memory-efficient iteration over large datasets.
 * Uses IndexedDB cursors to avoid loading entire result sets into memory.
 */
export interface PaginatedResult<T> {
  items: T[];
  hasMore: boolean;
  cursor: string | null;
}

/**
 * Get paginated shows using cursor-based pagination.
 * More memory-efficient than offset-based pagination for large datasets.
 */
export async function getShowsPaginated(
  pageSize: number = 50,
  cursor?: string
): Promise<PaginatedResult<DexieShow>> {
  const db = getDb();

  let collection = db.shows.orderBy('date').reverse();

  // If cursor provided, start after that date
  if (cursor) {
    collection = db.shows.where('date').below(cursor).reverse();
  }

  const items = await collection.limit(pageSize + 1).toArray();
  const hasMore = items.length > pageSize;

  if (hasMore) {
    items.pop(); // Remove the extra item
  }

  const lastItem = items[items.length - 1];

  return {
    items,
    hasMore,
    cursor: lastItem?.date ?? null,
  };
}

/**
 * Get paginated songs using cursor-based pagination.
 */
export async function getSongsPaginated(
  pageSize: number = 50,
  cursor?: string
): Promise<PaginatedResult<DexieSong>> {
  const db = getDb();

  let collection = db.songs.orderBy('sortTitle');

  if (cursor) {
    collection = db.songs.where('sortTitle').above(cursor);
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
    cursor: lastItem?.sortTitle ?? null,
  };
}

// ==================== SONG QUERIES ====================

/**
 * Get all songs sorted by title
 * Limit prevents memory exhaustion on large datasets
 */
export async function getAllSongs(): Promise<DexieSong[]> {
  const db = getDb();
  try {
    return await db.songs.orderBy('sortTitle').limit(2000).toArray();
  } catch (error) {
    db.handleError(error, 'getAllSongs');
    return [];
  }
}

/**
 * Get song by slug
 */
export async function getSongBySlug(slug: string): Promise<DexieSong | undefined> {
  return getDb().songs.where('slug').equals(slug).first();
}

/**
 * Get song by ID
 */
export async function getSongById(id: number): Promise<DexieSong | undefined> {
  return getDb().songs.get(id);
}

/**
 * Get song statistics (cached for 5 minutes)
 */
export async function getSongStats(): Promise<{
  total: number;
  originals: number;
  covers: number;
}> {
  const cache = getQueryCache();
  const cacheKey = CacheKeys.songStats();

  // Check cache first
  const cached = cache.get<{ total: number; originals: number; covers: number }>(cacheKey);
  if (cached) {
    return cached;
  }

  const db = getDb();
  const total = await db.songs.count();
  // Note: isCover index was removed in v3 for low selectivity
  // Use filter instead of where for boolean fields without indexes
  const covers = await db.songs.filter((s) => s.isCover === true).count();

  const result = {
    total,
    covers,
    originals: total - covers,
  };

  cache.set(cacheKey, result, CacheTTL.STATS);
  return result;
}

/**
 * Get top songs by total performances
 */
export async function getTopSongsByPerformances(limit = 10): Promise<DexieSong[]> {
  return getDb().songs.orderBy('totalPerformances').reverse().limit(limit).toArray();
}

/**
 * Get top songs by opener count
 */
export async function getTopOpeningSongs(
  limit = 10
): Promise<Array<{ song: DexieSong; count: number }>> {
  const songs = await getDb()
    .songs.where('openerCount')
    .above(0)
    .reverse()
    .limit(limit)
    .toArray();

  return songs.map((song) => ({
    song,
    count: song.openerCount,
  }));
}

/**
 * Get top songs by closer count
 */
export async function getTopClosingSongs(
  limit = 10
): Promise<Array<{ song: DexieSong; count: number }>> {
  const songs = await getDb()
    .songs.where('closerCount')
    .above(0)
    .reverse()
    .limit(limit)
    .toArray();

  return songs.map((song) => ({
    song,
    count: song.closerCount,
  }));
}

/**
 * Get top songs by encore count
 */
export async function getTopEncoreSongs(
  limit = 10
): Promise<Array<{ song: DexieSong; count: number }>> {
  const songs = await getDb()
    .songs.where('encoreCount')
    .above(0)
    .reverse()
    .limit(limit)
    .toArray();

  return songs.map((song) => ({
    song,
    count: song.encoreCount,
  }));
}

/**
 * Search songs by title or artist
 * Uses startsWithIgnoreCase for prefix search (O(log n) with index)
 * Note: For full-text search (contains), would need to use filter which is O(n)
 */
export async function searchSongs(query: string, limit = 20): Promise<DexieSong[]> {
  if (!query.trim()) return [];

  const searchTerm = query.toLowerCase().trim();
  const db = getDb();
  try {
    // Optimized: Sort in descending order directly instead of sort+reverse
    // Over-fetch to account for limit after sorting
    const songs = await db.songs
      .where('searchText')
      .startsWithIgnoreCase(searchTerm)
      .limit(limit * 2)
      .toArray();
    // Sort descending by totalPerformances and apply limit
    return songs
      .sort((a, b) => b.totalPerformances - a.totalPerformances)
      .slice(0, limit);
  } catch (error) {
    db.handleError(error, 'searchSongs');
    return [];
  }
}

// ==================== VENUE QUERIES ====================

/**
 * Get all venues sorted by name
 * Limit prevents memory exhaustion on large datasets
 */
export async function getAllVenues(): Promise<DexieVenue[]> {
  return getDb().venues.orderBy('name').limit(1000).toArray();
}

/**
 * Get venue by ID
 */
export async function getVenueById(id: number): Promise<DexieVenue | undefined> {
  return getDb().venues.get(id);
}

/**
 * Get venue statistics (cached for 5 minutes)
 */
export async function getVenueStats(): Promise<{
  total: number;
  totalShows: number;
  states: number;
}> {
  const cache = getQueryCache();
  const cacheKey = CacheKeys.venueStats();

  // Check cache first
  const cached = cache.get<{ total: number; totalShows: number; states: number }>(cacheKey);
  if (cached) {
    return cached;
  }

  const db = getDb();

  // Use read-only transaction for consistent read and better performance
  const result = await db.transaction('r', [db.venues], async () => {
    const venues = await db.venues.toArray();

    const total = venues.length;
    const totalShows = venues.reduce((sum, v) => sum + v.totalShows, 0);
    const states = new Set(venues.map((v) => v.state).filter(Boolean)).size;

    return { total, totalShows, states };
  });

  cache.set(cacheKey, result, CacheTTL.STATS);
  return result;
}

/**
 * Get top venues by show count
 * Uses where().above(0) with reverse() for efficient indexed retrieval
 */
export async function getTopVenuesByShows(
  limit = 25
): Promise<Array<{ venue: DexieVenue; showCount: number }>> {
  const venues = await getDb()
    .venues.where('totalShows')
    .above(0)
    .reverse()
    .limit(limit)
    .toArray();

  return venues.map((venue) => ({
    venue,
    showCount: venue.totalShows,
  }));
}

/**
 * Search venues by name, city, or state
 * Uses startsWithIgnoreCase for prefix search (O(log n) with index)
 * Note: For full-text search (contains), would need to use filter which is O(n)
 */
export async function searchVenues(query: string, limit = 20): Promise<DexieVenue[]> {
  if (!query.trim()) return [];

  const searchTerm = query.toLowerCase().trim();
  const db = getDb();
  try {
    // Optimized: Sort in descending order directly instead of sort+reverse
    // Over-fetch to account for limit after sorting
    const venues = await db.venues
      .where('searchText')
      .startsWithIgnoreCase(searchTerm)
      .limit(limit * 2)
      .toArray();
    // Sort descending by totalShows and apply limit
    return venues
      .sort((a, b) => b.totalShows - a.totalShows)
      .slice(0, limit);
  } catch (error) {
    db.handleError(error, 'searchVenues');
    return [];
  }
}

// ==================== SHOW QUERIES ====================

/**
 * Get all shows sorted by date (newest first)
 * Limit prevents memory exhaustion on large datasets
 */
export async function getAllShows(): Promise<DexieShow[]> {
  const db = getDb();
  try {
    return await db.shows.orderBy('date').reverse().limit(5000).toArray();
  } catch (error) {
    db.handleError(error, 'getAllShows');
    return [];
  }
}

/**
 * Get show by ID
 */
export async function getShowById(id: number): Promise<DexieShow | undefined> {
  return getDb().shows.get(id);
}

/**
 * Get show with setlist
 * Uses compound index [showId+position] for efficient ordered retrieval
 */
export async function getShowWithSetlist(
  showId: number
): Promise<(DexieShow & { setlist: DexieSetlistEntry[] }) | undefined> {
  const db = getDb();
  try {
    const show = await db.shows.get(showId);
    if (!show) return undefined;

    // Use compound index [showId+position] - results are already sorted by position
    const setlist = await db.setlistEntries
      .where('[showId+position]')
      .between([showId, Dexie.minKey], [showId, Dexie.maxKey])
      .toArray();

    return { ...show, setlist };
  } catch (error) {
    db.handleError(error, 'getShowWithSetlist');
    return undefined;
  }
}

/**
 * Get recent shows
 */
export async function getRecentShows(limit = 10): Promise<DexieShow[]> {
  return getDb().shows.orderBy('date').reverse().limit(limit).toArray();
}

/**
 * Get shows by year
 */
export async function getShowsByYear(year: number): Promise<DexieShow[]> {
  return getDb().shows.where('year').equals(year).sortBy('date');
}

/**
 * Get shows by venue
 */
export async function getShowsByVenue(venueId: number): Promise<DexieShow[]> {
  return getDb().shows.where('venueId').equals(venueId).sortBy('date');
}

/**
 * Get adjacent shows (previous and next)
 */
export async function getAdjacentShows(
  showId: number
): Promise<{ previousShow?: DexieShow; nextShow?: DexieShow }> {
  const db = getDb();
  const show = await db.shows.get(showId);
  if (!show) return {};

  const [previousShow] = await db.shows.where('date').below(show.date).reverse().limit(1).toArray();

  const [nextShow] = await db.shows.where('date').above(show.date).limit(1).toArray();

  return { previousShow, nextShow };
}

/**
 * Get shows by year summary (cached for 10 minutes)
 * Uses year index instead of loading all shows
 */
export async function getShowsByYearSummary(): Promise<Array<{ year: number; count: number }>> {
  const cache = getQueryCache();
  const cacheKey = CacheKeys.showsByYearSummary();

  // Check cache first
  const cached = cache.get<Array<{ year: number; count: number }>>(cacheKey);
  if (cached) {
    return cached;
  }

  const db = getDb();

  // Use cursor-based iteration for memory efficiency
  // Instead of loading all shows into memory, iterate through them one at a time
  const yearCounts = new Map<number, number>();

  await db.shows.orderBy('year').each((show) => {
    const count = yearCounts.get(show.year) ?? 0;
    yearCounts.set(show.year, count + 1);
  });

  const result = Array.from(yearCounts.entries())
    .map(([year, count]) => ({ year, count }))
    .sort((a, b) => a.year - b.year);

  cache.set(cacheKey, result, CacheTTL.AGGREGATION);
  return result;
}

/**
 * Get year range (cached for 30 minutes - rarely changes)
 */
export async function getYearRange(): Promise<{ minYear: number; maxYear: number }> {
  const cache = getQueryCache();
  const cacheKey = CacheKeys.yearRange();

  // Check cache first
  const cached = cache.get<{ minYear: number; maxYear: number }>(cacheKey);
  if (cached) {
    return cached;
  }

  const db = getDb();
  const [oldest] = await db.shows.orderBy('year').limit(1).toArray();
  const [newest] = await db.shows.orderBy('year').reverse().limit(1).toArray();

  const result = {
    minYear: oldest?.year ?? 1991,
    maxYear: newest?.year ?? new Date().getFullYear(),
  };

  cache.set(cacheKey, result, CacheTTL.STATIC);
  return result;
}

// ==================== SETLIST QUERIES ====================

/**
 * Get setlist for a show
 * Uses compound index [showId+position] for efficient ordered retrieval
 */
export async function getSetlistForShow(showId: number): Promise<DexieSetlistEntry[]> {
  // Use compound index [showId+position] - results are already sorted by position
  return getDb()
    .setlistEntries.where('[showId+position]')
    .between([showId, Dexie.minKey], [showId, Dexie.maxKey])
    .toArray();
}

/**
 * Get all shows where a song was played
 * Uses transaction for consistent read and bulkGet for efficiency
 */
export async function getShowsForSong(songId: number): Promise<DexieShow[]> {
  const db = getDb();

  // Use transaction for consistent read and better performance
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

/**
 * Get recent shows for a song
 */
export async function getRecentShowsForSong(songId: number, limit = 10): Promise<DexieShow[]> {
  const shows = await getShowsForSong(songId);
  return shows.slice(0, limit);
}

/**
 * Get year breakdown for a song (cached for 10 minutes)
 */
export async function getYearBreakdownForSong(
  songId: number
): Promise<Array<{ year: number; count: number }>> {
  const cache = getQueryCache();
  const cacheKey = CacheKeys.songYearBreakdown(songId);

  // Check cache first
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

/**
 * Get year breakdown for a venue (cached for 10 minutes)
 */
export async function getYearBreakdownForVenue(
  venueId: number
): Promise<Array<{ year: number; count: number }>> {
  const cache = getQueryCache();
  const cacheKey = CacheKeys.venueYearBreakdown(venueId);

  // Check cache first
  const cached = cache.get<Array<{ year: number; count: number }>>(cacheKey);
  if (cached) {
    return cached;
  }

  const shows = await getDb().shows.where('venueId').equals(venueId).toArray();
  const yearCounts = new Map<number, number>();

  for (const show of shows) {
    const count = yearCounts.get(show.year) ?? 0;
    yearCounts.set(show.year, count + 1);
  }

  const result = Array.from(yearCounts.entries())
    .map(([year, count]) => ({ year, count }))
    .sort((a, b) => b.year - a.year);

  cache.set(cacheKey, result, CacheTTL.AGGREGATION);
  return result;
}

// ==================== TOUR QUERIES ====================

/**
 * Get all tours sorted by year (newest first)
 * Limit prevents memory exhaustion on large datasets
 */
export async function getAllTours(): Promise<DexieTour[]> {
  return getDb().tours.orderBy('year').reverse().limit(200).toArray();
}

/**
 * Get tour by ID
 */
export async function getTourById(id: number): Promise<DexieTour | undefined> {
  return getDb().tours.get(id);
}

/**
 * Get tours grouped by decade
 */
export async function getToursGroupedByDecade(): Promise<Record<string, DexieTour[]>> {
  const tours = await getAllTours();
  const grouped: Record<string, DexieTour[]> = {};

  for (const tour of tours) {
    const decadeStart = Math.floor(tour.year / 10) * 10;
    const decadeLabel = `${decadeStart}s`;

    if (!grouped[decadeLabel]) {
      grouped[decadeLabel] = [];
    }
    grouped[decadeLabel].push(tour);
  }

  return grouped;
}

/**
 * Get shows for a tour
 * Uses compound index [tourId+date] for efficient chronological retrieval
 */
export async function getShowsForTour(tourId: number): Promise<DexieShow[]> {
  // Use compound index [tourId+date] - results are already sorted by date
  return getDb()
    .shows.where('[tourId+date]')
    .between([tourId, Dexie.minKey], [tourId, Dexie.maxKey])
    .toArray();
}

// ==================== GUEST QUERIES ====================

/**
 * Get all guests sorted by name
 * Limit prevents memory exhaustion on large datasets
 */
export async function getAllGuests(): Promise<DexieGuest[]> {
  return getDb().guests.orderBy('name').limit(1000).toArray();
}

/**
 * Get guest by slug
 */
export async function getGuestBySlug(slug: string): Promise<DexieGuest | undefined> {
  return getDb().guests.where('slug').equals(slug).first();
}

/**
 * Get guest by ID
 */
export async function getGuestById(id: number): Promise<DexieGuest | undefined> {
  return getDb().guests.get(id);
}

/**
 * Get appearances for a guest
 */
export async function getAppearancesByGuest(guestId: number): Promise<DexieGuestAppearance[]> {
  const db = getDb();
  try {
    // Optimized: Sort descending directly instead of double reverse
    const apps = await db.guestAppearances
      .where('guestId')
      .equals(guestId)
      .toArray();
    // Sort by showDate descending (newest first)
    return apps.sort((a, b) => b.showDate.localeCompare(a.showDate));
  } catch (error) {
    db.handleError(error, 'getAppearancesByGuest');
    return [];
  }
}

/**
 * Get shows for a guest
 * Uses transaction for consistent read and bulkGet for efficiency
 */
export async function getAllShowsForGuest(guestId: number): Promise<DexieShow[]> {
  const db = getDb();

  // Use transaction for consistent read and better performance
  return db.transaction('r', [db.guestAppearances, db.shows], async () => {
    const appearances = await db.guestAppearances.where('guestId').equals(guestId).toArray();
    const showIds = [...new Set(appearances.map((a) => a.showId))];

    if (showIds.length === 0) return [];

    const shows = await db.shows.bulkGet(showIds);
    return shows
      .filter((s): s is DexieShow => s !== undefined)
      .sort((a, b) => b.date.localeCompare(a.date));
  });
}

/**
 * Get year breakdown for a guest (cached for 10 minutes)
 */
export async function getYearBreakdownForGuest(
  guestId: number
): Promise<Array<{ year: number; count: number }>> {
  const cache = getQueryCache();
  const cacheKey = CacheKeys.guestYearBreakdown(guestId);

  // Check cache first
  const cached = cache.get<Array<{ year: number; count: number }>>(cacheKey);
  if (cached) {
    return cached;
  }

  const appearances = await getDb().guestAppearances.where('guestId').equals(guestId).toArray();

  // Group by show to avoid double-counting multiple appearances per show
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

/**
 * Search guests by name
 * Uses startsWithIgnoreCase for prefix search (O(log n) with index)
 * Note: For full-text search (contains), would need to use filter which is O(n)
 */
export async function searchGuests(query: string, limit = 20): Promise<DexieGuest[]> {
  if (!query.trim()) return [];

  const searchTerm = query.toLowerCase().trim();
  const db = getDb();
  try {
    // Optimized: Sort in descending order directly instead of sort+reverse
    // Over-fetch to account for limit after sorting
    const guests = await db.guests
      .where('searchText')
      .startsWithIgnoreCase(searchTerm)
      .limit(limit * 2)
      .toArray();
    // Sort descending by totalAppearances and apply limit
    return guests
      .sort((a, b) => b.totalAppearances - a.totalAppearances)
      .slice(0, limit);
  } catch (error) {
    db.handleError(error, 'searchGuests');
    return [];
  }
}

// ==================== LIBERATION LIST QUERIES ====================

/**
 * Get liberation list entries sorted by days since
 * Uses compound index [isLiberated+daysSince] for efficient filtered retrieval
 */
export async function getLiberationList(limit = 10): Promise<DexieLiberationEntry[]> {
  // Use compound index [isLiberated+daysSince] where isLiberated=0 (false)
  // Results are already sorted by daysSince ascending, so reverse for descending
  return getDb()
    .liberationList.where('[isLiberated+daysSince]')
    .between([0, Dexie.minKey], [0, Dexie.maxKey])
    .reverse()
    .limit(limit)
    .toArray();
}

/**
 * Get full liberation list
 * Uses compound index [isLiberated+daysSince] for efficient filtered retrieval
 */
export async function getFullLiberationList(): Promise<DexieLiberationEntry[]> {
  // Use compound index [isLiberated+daysSince] where isLiberated=0 (false)
  // Results are already sorted by daysSince ascending, so reverse for descending
  return getDb()
    .liberationList.where('[isLiberated+daysSince]')
    .between([0, Dexie.minKey], [0, Dexie.maxKey])
    .reverse()
    .toArray();
}

/**
 * Get liberation entry for a song
 */
export async function getLiberationEntryForSong(
  songId: number
): Promise<DexieLiberationEntry | undefined> {
  return getDb().liberationList.where('songId').equals(songId).first();
}

// ==================== GLOBAL STATISTICS QUERIES ====================

/**
 * Get global statistics (cached for 5 minutes)
 */
export async function getGlobalStats(): Promise<{
  totalShows: number;
  totalSongs: number;
  totalVenues: number;
  yearsActive: number;
  firstYear: number;
  lastYear: number;
}> {
  const cache = getQueryCache();
  const cacheKey = CacheKeys.globalStats();

  // Check cache first
  type GlobalStatsResult = {
    totalShows: number;
    totalSongs: number;
    totalVenues: number;
    yearsActive: number;
    firstYear: number;
    lastYear: number;
  };
  const cached = cache.get<GlobalStatsResult>(cacheKey);
  if (cached) {
    return cached;
  }

  const db = getDb();

  // Use read-only transaction for consistent read and better performance
  const result = await db.transaction('r', [db.shows, db.songs, db.venues], async () => {
    const [totalShows, totalSongs, totalVenues] = await Promise.all([
      db.shows.count(),
      db.songs.count(),
      db.venues.count(),
    ]);

    const { minYear, maxYear } = await getYearRange();

    return {
      totalShows,
      totalSongs,
      totalVenues,
      yearsActive: maxYear - minYear + 1,
      firstYear: minYear,
      lastYear: maxYear,
    } as GlobalStatsResult;
  });

  cache.set(cacheKey, result, CacheTTL.STATS);
  return result;
}

/**
 * Get extended global statistics
 */
export async function getGlobalStatsExtended(): Promise<{
  totalShows: number;
  totalSongs: number;
  totalVenues: number;
  totalGuests: number;
  yearsActive: number;
  totalSetlistEntries: number;
}> {
  const db = getDb();

  // Use read-only transaction for consistent read and better performance
  return db.transaction(
    'r',
    [db.shows, db.songs, db.venues, db.guests, db.setlistEntries],
    async () => {
      const [totalShows, totalSongs, totalVenues, totalGuests, totalSetlistEntries] =
        await Promise.all([
          db.shows.count(),
          db.songs.count(),
          db.venues.count(),
          db.guests.count(),
          db.setlistEntries.count(),
        ]);

      const { minYear, maxYear } = await getYearRange();

      return {
        totalShows,
        totalSongs,
        totalVenues,
        totalGuests,
        yearsActive: maxYear - minYear + 1,
        totalSetlistEntries,
      };
    }
  );
}

// ==================== TOUR YEAR STATISTICS ====================

/**
 * Get tour statistics for a year
 */
export async function getTourStatsByYear(year: number): Promise<{
  totalShows: number;
  uniqueVenues: number;
  uniqueSongs: number;
  states: number;
}> {
  const db = getDb();

  // Use read-only transaction for consistent read and better performance
  return db.transaction('r', [db.shows, db.venues, db.setlistEntries], async () => {
    const shows = await db.shows.where('year').equals(year).toArray();

    const venueIds = new Set(shows.map((s) => s.venueId));
    const venues = await db.venues.bulkGet([...venueIds]);
    // Optimized: Single-pass state counting without intermediate arrays
    const statesSet = new Set<string>();
    for (const v of venues) {
      if (v?.state) statesSet.add(v.state);
    }
    const states = statesSet.size;

    const showIds = shows.map((s) => s.id);
    const entries = await db.setlistEntries.where('showId').anyOf(showIds).toArray();
    const uniqueSongs = new Set(entries.map((e) => e.songId)).size;

    return {
      totalShows: shows.length,
      uniqueVenues: venueIds.size,
      uniqueSongs,
      states,
    };
  });
}

/**
 * Get top openers for a year (WASM-accelerated)
 * Uses compound index [year+slot] for efficient filtered retrieval
 */
export async function getTopOpenersByYear(
  year: number,
  limit = 3
): Promise<Array<{ song: string; count: number }>> {
  const db = getDb();
  // Use compound index [year+slot] for efficient retrieval
  const entries = await db.setlistEntries.where('[year+slot]').equals([year, 'opener']).toArray();

  // Try WASM-accelerated counting
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
        // Fallback to JS
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

/** Helper to count songs from entries (JS fallback) */
function countSongsFromEntries(entries: DexieSetlistEntry[], limit: number): SongWithCount[] {
  const songCounts = new Map<number, number>();
  for (const entry of entries) {
    songCounts.set(entry.songId, (songCounts.get(entry.songId) ?? 0) + 1);
  }
  return [...songCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([songId, count]) => ({ songId, count }));
}

/**
 * Get top closers for a year (WASM-accelerated)
 * Uses compound index [year+slot] for efficient filtered retrieval
 */
export async function getTopClosersByYear(
  year: number,
  limit = 3
): Promise<Array<{ song: string; count: number }>> {
  const db = getDb();
  // Use compound index [year+slot] for efficient retrieval
  // Note: The filter for setName is intentional - setName patterns like "encore1", "encore2"
  // cannot be efficiently indexed for startsWith queries. The compound index [year+slot]
  // already narrows down results significantly, making the in-memory filter acceptable.
  const entries = await db.setlistEntries
    .where('[year+slot]')
    .equals([year, 'closer'])
    .filter((e) => !e.setName.startsWith('encore'))
    .toArray();

  // Try WASM-accelerated counting
  const bridge = getWasmBridge();
  let songCountsArray: SongWithCount[];

  if (bridge) {
    try {
      const result = await bridge.call<string>(
        'count_closers_by_year',
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

/**
 * Get top encores for a year (WASM-accelerated)
 */
export async function getTopEncoresByYear(
  year: number,
  limit = 3
): Promise<Array<{ song: string; count: number }>> {
  const db = getDb();
  // Note: The .and() filter for setName is intentional - setName patterns like "encore1", "encore2"
  // cannot be efficiently indexed for startsWith queries. Using the year index first narrows
  // results significantly, making the in-memory filter for encore sets acceptable.
  const entries = await db.setlistEntries
    .where('year')
    .equals(year)
    .and((e) => e.setName.startsWith('encore'))
    .toArray();

  // Try WASM-accelerated counting
  const bridge = getWasmBridge();
  let songCountsArray: SongWithCount[];

  if (bridge) {
    try {
      const result = await bridge.call<string>(
        'count_encores_by_year',
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

/**
 * Get average songs per show for a year
 */
export async function getAvgSongsPerShowByYear(year: number): Promise<number> {
  const shows = await getDb().shows.where('year').equals(year).toArray();
  if (shows.length === 0) return 0;

  const totalSongs = shows.reduce((sum, s) => sum + s.songCount, 0);
  return Math.round(totalSongs / shows.length);
}

// ==================== USER DATA QUERIES ====================

/**
 * Get user's attended shows
 */
export async function getUserAttendedShows(): Promise<UserAttendedShow[]> {
  return getDb().userAttendedShows.orderBy('showDate').reverse().toArray();
}

/**
 * Add a show to user's attended list
 */
export async function addUserAttendedShow(showId: number, show: DexieShow): Promise<number> {
  const id = await getDb().userAttendedShows.add({
    showId,
    addedAt: Date.now(),
    notes: null,
    rating: null,
    showDate: show.date,
    venueName: show.venue.name,
    venueCity: show.venue.city,
    venueState: show.venue.state ?? null,
    tourName: show.tour.name,
  });
  return id ?? showId;
}

/**
 * Remove a show from user's attended list
 */
export async function removeUserAttendedShow(showId: number): Promise<void> {
  await getDb().userAttendedShows.where('showId').equals(showId).delete();
}

/**
 * Check if user has attended a show
 */
export async function hasUserAttendedShow(showId: number): Promise<boolean> {
  const entry = await getDb().userAttendedShows.where('showId').equals(showId).first();
  return !!entry;
}

/**
 * Get user's favorite songs
 */
export async function getUserFavoriteSongs(): Promise<UserFavoriteSong[]> {
  return getDb().userFavoriteSongs.orderBy('addedAt').reverse().toArray();
}

/**
 * Add a song to user's favorites
 */
export async function addUserFavoriteSong(songId: number, song: DexieSong): Promise<number> {
  const id = await getDb().userFavoriteSongs.add({
    songId,
    addedAt: Date.now(),
    songTitle: song.title,
    songSlug: song.slug,
  });
  return id ?? songId;
}

/**
 * Remove a song from user's favorites
 */
export async function removeUserFavoriteSong(songId: number): Promise<void> {
  await getDb().userFavoriteSongs.where('songId').equals(songId).delete();
}

/**
 * Check if user has favorited a song
 */
export async function hasUserFavoritedSong(songId: number): Promise<boolean> {
  const entry = await getDb().userFavoriteSongs.where('songId').equals(songId).first();
  return !!entry;
}

/**
 * Get user's favorite venues
 */
export async function getUserFavoriteVenues(): Promise<UserFavoriteVenue[]> {
  return getDb().userFavoriteVenues.orderBy('addedAt').reverse().toArray();
}

/**
 * Add a venue to user's favorites
 */
export async function addUserFavoriteVenue(venueId: number, venue: DexieVenue): Promise<number> {
  const id = await getDb().userFavoriteVenues.add({
    venueId,
    addedAt: Date.now(),
    venueName: venue.name,
    venueCity: venue.city,
    venueState: venue.state ?? null,
  });
  return id ?? venueId;
}

/**
 * Remove a venue from user's favorites
 */
export async function removeUserFavoriteVenue(venueId: number): Promise<void> {
  await getDb().userFavoriteVenues.where('venueId').equals(venueId).delete();
}

// ==================== GLOBAL SEARCH ====================

/**
 * Search across all entities (parallelized for 3x speedup)
 * Uses Promise.all to execute all searches concurrently
 */
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

    // Map results to SearchResult format with composite IDs to prevent collisions
    // CRITICAL FIX: Use composite IDs like "song:1", "venue:1" to distinguish entities with same numeric ID
    const results: SearchResult[] = [
      ...songs.map((song) => ({
        type: 'song' as const,
        id: `song:${song.id}`,
        title: song.title,
        subtitle: song.isCover ? `Cover of ${song.originalArtist}` : 'Original',
        slug: song.slug,
        date: null,
        score: song.totalPerformances,
      })),
      ...venues.map((venue) => ({
        type: 'venue' as const,
        id: `venue:${venue.id}`,
        title: venue.name,
        subtitle: [venue.city, venue.state, venue.country].filter(Boolean).join(', '),
        slug: null,
        date: null,
        score: venue.totalShows,
      })),
      ...guests.map((guest) => ({
        type: 'guest' as const,
        id: `guest:${guest.id}`,
        title: guest.name,
        subtitle: guest.instruments?.join(', ') ?? null,
        slug: guest.slug,
        date: null,
        score: guest.totalAppearances,
      })),
    ];

    // Sort by score and limit
    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  } catch (error) {
    db.handleError(error, 'globalSearch');
    return [];
  }
}

// ==================== BULK OPERATIONS ====================

/**
 * Default chunk size for bulk operations.
 * 500 is optimal for IndexedDB performance without blocking the main thread.
 */
const BULK_CHUNK_SIZE = 500;

/**
 * Bulk insert with chunking to prevent memory issues and transaction timeouts.
 * Processes records in chunks of 500 for optimal performance.
 */
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

  // Invalidate cache after bulk insert
  const { invalidateCache } = await import('./cache');
  invalidateCache(['shows']);

  return inserted;
}

/**
 * Bulk insert songs with chunking
 */
export async function bulkInsertSongs(
  songs: DexieSong[],
  chunkSize: number = BULK_CHUNK_SIZE
): Promise<number> {
  const db = getDb();
  let inserted = 0;

  for (let i = 0; i < songs.length; i += chunkSize) {
    const chunk = songs.slice(i, i + chunkSize);
    try {
      await db.transaction('rw', db.songs, async () => {
        await db.songs.bulkAdd(chunk);
      });
      inserted += chunk.length;
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        console.error('[Queries] Storage quota exceeded during bulkInsertSongs:', {
          inserted,
          attempted: songs.length,
          batchIndex: Math.floor(i / chunkSize)
        });
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('dexie-quota-exceeded', {
            detail: { entity: 'songs', loaded: inserted, attempted: songs.length }
          }));
        }
      }
      throw error;
    }
  }

  // Invalidate cache after bulk insert
  const { invalidateCache } = await import('./cache');
  invalidateCache(['songs']);

  return inserted;
}

/**
 * Bulk insert setlist entries with chunking
 */
export async function bulkInsertSetlistEntries(
  entries: DexieSetlistEntry[],
  chunkSize: number = BULK_CHUNK_SIZE
): Promise<number> {
  const db = getDb();
  let inserted = 0;

  for (let i = 0; i < entries.length; i += chunkSize) {
    const chunk = entries.slice(i, i + chunkSize);
    try {
      await db.transaction('rw', db.setlistEntries, async () => {
        await db.setlistEntries.bulkAdd(chunk);
      });
      inserted += chunk.length;
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        console.error('[Queries] Storage quota exceeded during bulkInsertSetlistEntries:', {
          inserted,
          attempted: entries.length,
          batchIndex: Math.floor(i / chunkSize)
        });
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('dexie-quota-exceeded', {
            detail: { entity: 'setlistEntries', loaded: inserted, attempted: entries.length }
          }));
        }
      }
      throw error;
    }
  }

  // Invalidate cache after bulk insert
  const { invalidateCache } = await import('./cache');
  invalidateCache(['setlistEntries']);

  return inserted;
}

/**
 * Bulk update with chunking
 */
export async function bulkUpdateShows(
  updates: Array<{ key: number; changes: Partial<DexieShow> }>,
  chunkSize: number = BULK_CHUNK_SIZE
): Promise<number> {
  const db = getDb();
  let updated = 0;

  for (let i = 0; i < updates.length; i += chunkSize) {
    const chunk = updates.slice(i, i + chunkSize);
    await db.transaction('rw', db.shows, async () => {
      for (const { key, changes } of chunk) {
        await db.shows.update(key, changes);
      }
    });
    updated += chunk.length;
  }

  // Invalidate cache after bulk update
  const { invalidateCache } = await import('./cache');
  invalidateCache(['shows']);

  return updated;
}

/**
 * Bulk delete with chunking to prevent transaction timeouts
 */
export async function bulkDeleteByIds<T extends 'shows' | 'songs' | 'setlistEntries' | 'venues'>(
  table: T,
  ids: number[],
  chunkSize: number = BULK_CHUNK_SIZE
): Promise<number> {
  const db = getDb();
  let deleted = 0;

  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    await db.transaction('rw', db[table], async () => {
      await db[table].bulkDelete(chunk);
    });
    deleted += chunk.length;
  }

  // Invalidate cache after bulk delete
  const { invalidateCache } = await import('./cache');
  invalidateCache([table]);

  return deleted;
}

// ==================== STREAMING / CURSOR HELPERS ====================

/**
 * Stream shows using cursor for memory-efficient iteration.
 * Useful for processing all shows without loading them all into memory.
 */
export async function streamShows(
  callback: (show: DexieShow) => void | Promise<void>,
  options?: { limit?: number; reverse?: boolean }
): Promise<number> {
  const db = getDb();
  let processed = 0;
  const { limit, reverse = false } = options ?? {};

  let collection = db.shows.orderBy('date');
  if (reverse) {
    collection = collection.reverse();
  }
  if (limit) {
    collection = collection.limit(limit);
  }

  await collection.each(async (show) => {
    await callback(show);
    processed++;
  });

  return processed;
}

/**
 * Stream setlist entries for a show using cursor.
 */
export async function streamSetlistEntries(
  showId: number,
  callback: (entry: DexieSetlistEntry) => void | Promise<void>
): Promise<number> {
  const db = getDb();
  let processed = 0;

  await db.setlistEntries
    .where('[showId+position]')
    .between([showId, Dexie.minKey], [showId, Dexie.maxKey])
    .each(async (entry) => {
      await callback(entry);
      processed++;
    });

  return processed;
}

/**
 * Aggregate shows by year using streaming to avoid loading all data.
 * More memory-efficient than getShowsByYearSummary for very large datasets.
 */
export async function aggregateShowsByYearStreaming(): Promise<Map<number, number>> {
  const db = getDb();
  const yearCounts = new Map<number, number>();

  await db.shows.orderBy('year').each((show) => {
    const count = yearCounts.get(show.year) ?? 0;
    yearCounts.set(show.year, count + 1);
  });

  return yearCounts;
}

/**
 * Aggregate song performances using streaming.
 */
export async function aggregateSongPerformancesStreaming(): Promise<Map<number, number>> {
  const db = getDb();
  const songCounts = new Map<number, number>();

  await db.setlistEntries.each((entry) => {
    const count = songCounts.get(entry.songId) ?? 0;
    songCounts.set(entry.songId, count + 1);
  });

  return songCounts;
}

/**
 * Process venues in batches using offset pagination.
 * Useful for exports or batch processing without cursor support.
 */
export async function processVenuesInBatches(
  callback: (venues: DexieVenue[]) => void | Promise<void>,
  batchSize: number = 100
): Promise<number> {
  const db = getDb();
  let offset = 0;
  let totalProcessed = 0;

  while (true) {
    const batch = await db.venues.orderBy('id').offset(offset).limit(batchSize).toArray();

    if (batch.length === 0) break;

    await callback(batch);
    totalProcessed += batch.length;
    offset += batchSize;

    if (batch.length < batchSize) break;
  }

  return totalProcessed;
}

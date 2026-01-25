/**
 * DMB Almanac - JavaScript Fallback Implementations
 *
 * Pure JavaScript implementations of WASM functions for when WASM
 * is unavailable or fails to load. These implementations prioritize
 * correctness over performance.
 */

import type {
  WasmSongInput,
  WasmShowInput,
  WasmSetlistEntryInput,
  WasmSongStatisticsOutput,
  // WasmShowStatisticsOutput available for show stats
  WasmLiberationEntryOutput,
  WasmYearlyStatisticsOutput,
  WasmSearchResult,
  WasmTourYearStats,
  // WasmSongWithCount available for song counts
  WasmYearCount,
} from './types';

// ==================== PERFORMANCE HELPERS ====================

// PERF: Inline year extraction (avoids parseInt + substring overhead)
// Date format is always YYYY-MM-DD, so we can extract year directly via char codes
function extractYearFast(date: string): number {
  return (date.charCodeAt(0) - 48) * 1000 +
         (date.charCodeAt(1) - 48) * 100 +
         (date.charCodeAt(2) - 48) * 10 +
         (date.charCodeAt(3) - 48);
}

// ==================== SONG ANALYTICS ====================

/**
 * Calculate rarity score for a song based on play frequency
 * Lower scores = more rare
 */
export function calculateSongRarity(showCount: number, totalShows: number): number {
  if (totalShows === 0) return 0;
  const frequency = showCount / totalShows;
  // Rarity is inverse of frequency, scaled 0-100
  return Math.round((1 - frequency) * 100);
}

/**
 * Calculate comprehensive statistics for songs
 */
export function calculateSongStatistics(songs: WasmSongInput[]): WasmSongStatisticsOutput[] {
  const totalShows = songs.reduce((max, s) => Math.max(max, s.total_performances), 0);

  // PERF: Create Date once outside loop instead of for every song (~5000 allocations saved)
  const now = Date.now();
  const MS_PER_DAY = 1000 * 60 * 60 * 24;

  return songs.map(song => {
    const rarityScore = calculateSongRarity(song.total_performances, totalShows);

    // Calculate gap (days since last played)
    let gapDays: number | null = null;
    if (song.last_played_date) {
      // PERF: Use Date.parse() which returns number directly, avoiding Date object allocation
      const lastPlayedTime = Date.parse(song.last_played_date);
      gapDays = Math.floor((now - lastPlayedTime) / MS_PER_DAY);
    }

    return {
      song_id: song.id,
      rarity_score: rarityScore,
      gap_days: gapDays,
      gap_shows: null, // Would need full show history to calculate
      slot_distribution: {
        opener: song.opener_count,
        closer: song.closer_count,
        midset: song.total_performances - song.opener_count - song.closer_count - song.encore_count,
        encore: song.encore_count,
      },
      yearly_breakdown: {}, // Would need setlist entries to calculate
    };
  });
}

/**
 * Find songs with significant gaps since last play
 */
export function findSongGaps(
  setlistEntries: WasmSetlistEntryInput[]
): Array<{ song_id: number; gap_days: number; last_show_date: string }> {
  // Group by song and find most recent play
  const songLastPlay = new Map<number, { date: string; showId: number }>();

  for (const entry of setlistEntries) {
    const existing = songLastPlay.get(entry.song_id);
    if (!existing || entry.show_date > existing.date) {
      songLastPlay.set(entry.song_id, { date: entry.show_date, showId: entry.show_id });
    }
  }

  // Calculate gaps
  const now = new Date();
  const gaps: Array<{ song_id: number; gap_days: number; last_show_date: string }> = [];

  for (const [songId, lastPlay] of songLastPlay) {
    const lastDate = new Date(lastPlay.date);
    const gapDays = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    gaps.push({
      song_id: songId,
      gap_days: gapDays,
      last_show_date: lastPlay.date,
    });
  }

  // Sort by gap descending
  return gaps.sort((a, b) => b.gap_days - a.gap_days);
}

// ==================== SHOW ANALYTICS ====================

/**
 * Calculate rarity index for a show based on its setlist
 */
export function calculateShowRarity(
  setlist: WasmSetlistEntryInput[],
  songStats: Map<number, { rarityScore: number }>
): number {
  if (setlist.length === 0) return 0;

  // Average rarity of songs in setlist
  let totalRarity = 0;
  let songCount = 0;

  for (const entry of setlist) {
    const stats = songStats.get(entry.song_id);
    if (stats) {
      totalRarity += stats.rarityScore;
      songCount++;
    }
  }

  return songCount > 0 ? Math.round(totalRarity / songCount) : 0;
}

/**
 * Find shows with rarity above threshold
 */
export function findRareShows(
  shows: WasmShowInput[],
  threshold: number
): WasmShowInput[] {
  return shows
    .filter(show => (show.rarity_index ?? 0) >= threshold)
    .sort((a, b) => (b.rarity_index ?? 0) - (a.rarity_index ?? 0));
}

/**
 * Calculate similarity between two setlists (Jaccard index)
 */
export function calculateSetlistSimilarity(
  setlistA: WasmSetlistEntryInput[],
  setlistB: WasmSetlistEntryInput[]
): number {
  const songsA = new Set(setlistA.map(e => e.song_id));
  const songsB = new Set(setlistB.map(e => e.song_id));

  const intersection = new Set([...songsA].filter(id => songsB.has(id)));
  const union = new Set([...songsA, ...songsB]);

  if (union.size === 0) return 0;
  return intersection.size / union.size;
}

// ==================== TOUR ANALYTICS ====================

/**
 * Calculate statistics for a tour's shows
 */
export function calculateTourStatistics(
  tourShows: WasmShowInput[]
): {
  show_count: number;
  average_songs_per_show: number;
  total_songs_played: number;
  date_range: { start: string; end: string } | null;
} {
  if (tourShows.length === 0) {
    return {
      show_count: 0,
      average_songs_per_show: 0,
      total_songs_played: 0,
      date_range: null,
    };
  }

  const sortedShows = [...tourShows].sort((a, b) => a.date.localeCompare(b.date));
  const totalSongs = tourShows.reduce((sum, show) => sum + show.song_count, 0);

  return {
    show_count: tourShows.length,
    average_songs_per_show: Math.round((totalSongs / tourShows.length) * 10) / 10,
    total_songs_played: totalSongs,
    date_range: {
      start: sortedShows[0].date,
      end: sortedShows[sortedShows.length - 1].date,
    },
  };
}

/**
 * Find patterns in tour shows (openers, closers, etc.)
 */
export function findTourPatterns(
  setlistEntries: WasmSetlistEntryInput[]
): {
  common_openers: Array<{ song_id: number; count: number }>;
  common_closers: Array<{ song_id: number; count: number }>;
  common_encores: Array<{ song_id: number; count: number }>;
} {
  const openers = new Map<number, number>();
  const closers = new Map<number, number>();
  const encores = new Map<number, number>();

  for (const entry of setlistEntries) {
    // PERF: Cache startsWith result to avoid computing twice
    const isEncore = entry.set_name.startsWith('encore');

    if (entry.slot === 'opener') {
      openers.set(entry.song_id, (openers.get(entry.song_id) ?? 0) + 1);
    } else if (entry.slot === 'closer') {
      // Check if it's a main set closer (not encore)
      if (!isEncore) {
        closers.set(entry.song_id, (closers.get(entry.song_id) ?? 0) + 1);
      }
    }

    if (isEncore) {
      encores.set(entry.song_id, (encores.get(entry.song_id) ?? 0) + 1);
    }
  }

  const sortByCount = (map: Map<number, number>) =>
    Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([song_id, count]) => ({ song_id, count }));

  return {
    common_openers: sortByCount(openers),
    common_closers: sortByCount(closers),
    common_encores: sortByCount(encores),
  };
}

// ==================== VENUE ANALYTICS ====================

/**
 * Calculate statistics for a venue's shows
 */
export function calculateVenueStatistics(
  venueShows: WasmShowInput[]
): {
  show_count: number;
  first_show: string | null;
  last_show: string | null;
  years_played: number[];
} {
  if (venueShows.length === 0) {
    return {
      show_count: 0,
      first_show: null,
      last_show: null,
      years_played: [],
    };
  }

  const sortedShows = [...venueShows].sort((a, b) => a.date.localeCompare(b.date));
  // PERF: Use extractYearFast instead of parseInt(substring)
  const years = new Set(sortedShows.map(show => extractYearFast(show.date)));

  return {
    show_count: venueShows.length,
    first_show: sortedShows[0].date,
    last_show: sortedShows[sortedShows.length - 1].date,
    years_played: Array.from(years).sort((a, b) => a - b),
  };
}

// ==================== LIBERATION LIST ====================

/**
 * Compute liberation list from songs and setlist entries
 */
export function computeLiberationList(
  songs: WasmSongInput[],
  setlistEntries: WasmSetlistEntryInput[]
): WasmLiberationEntryOutput[] {
  // Find last play for each song
  const songLastPlay = new Map<number, { date: string; showId: number }>();

  for (const entry of setlistEntries) {
    const existing = songLastPlay.get(entry.song_id);
    if (!existing || entry.show_date > existing.date) {
      songLastPlay.set(entry.song_id, { date: entry.show_date, showId: entry.show_id });
    }
  }

  // Get unique show dates sorted
  const showDates = [...new Set(setlistEntries.map(e => e.show_date))].sort();
  // PERF: Build date->index Map for O(1) lookup instead of O(n) indexOf
  const dateIndexMap = new Map<string, number>();
  for (let i = 0; i < showDates.length; i++) {
    dateIndexMap.set(showDates[i], i);
  }

  const now = new Date();
  const liberationEntries: WasmLiberationEntryOutput[] = [];

  for (const song of songs) {
    const lastPlay = songLastPlay.get(song.id);
    if (!lastPlay) continue; // Never played

    const lastDate = new Date(lastPlay.date);
    const daysSince = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

    // PERF: Use Map lookup O(1) instead of indexOf O(n)
    const lastPlayIndex = dateIndexMap.get(lastPlay.date) ?? -1;
    const showsSince = lastPlayIndex >= 0 ? showDates.length - lastPlayIndex - 1 : 0;

    // Consider "liberated" if played within last 30 days
    const isLiberated = daysSince < 30;

    liberationEntries.push({
      song_id: song.id,
      last_played_date: lastPlay.date,
      last_played_show_id: lastPlay.showId,
      days_since: daysSince,
      shows_since: showsSince,
      is_liberated: isLiberated,
    });
  }

  // Sort by days since (most gap first)
  // PERF: Avoid mutating original array - spread then sort
  return [...liberationEntries].sort((a, b) => b.days_since - a.days_since);
}

/**
 * Update a liberation entry with new show date
 */
export function updateLiberationEntry(
  entry: WasmLiberationEntryOutput,
  _latestShowDate: string
): WasmLiberationEntryOutput {
  const lastDate = new Date(entry.last_played_date);
  const now = new Date();
  const daysSince = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

  return {
    ...entry,
    days_since: daysSince,
    is_liberated: daysSince < 30,
  };
}

// ==================== SEARCH INDEX ====================

/**
 * Simple in-memory search index
 */
interface SearchIndexEntry {
  id: number;
  type: string;
  text: string;
  score: number;
}

const searchIndexes = new Map<number, SearchIndexEntry[]>();
let nextIndexHandle = 1;

/**
 * Build a search index from entities
 */
export function buildSearchIndex(entities: Array<{ id: number; type: string; text: string; score: number }>): number {
  const handle = nextIndexHandle++;
  searchIndexes.set(handle, entities);
  return handle;
}

/**
 * Search the index
 */
export function searchIndex(handle: number, query: string, limit: number): SearchIndexEntry[] {
  const index = searchIndexes.get(handle);
  if (!index) return [];

  const normalizedQuery = query.toLowerCase().trim();
  if (!normalizedQuery) return [];

  // PERF: Pre-compute lowercased text once per entry to avoid O(n*m) toLowerCase calls
  // where n = entries and m = filter + sort iterations
  return index
    .map(entry => ({ entry, textLower: entry.text.toLowerCase() }))
    .filter(({ textLower }) => textLower.includes(normalizedQuery))
    .sort((a, b) => {
      // Prioritize prefix matches - use pre-lowercased text
      const aStartsWith = a.textLower.startsWith(normalizedQuery) ? 1 : 0;
      const bStartsWith = b.textLower.startsWith(normalizedQuery) ? 1 : 0;
      if (aStartsWith !== bStartsWith) return bStartsWith - aStartsWith;

      // Then by score
      return b.entry.score - a.entry.score;
    })
    .slice(0, limit)
    .map(({ entry }) => entry);
}

/**
 * Free a search index
 */
export function freeSearchIndex(handle: number): void {
  searchIndexes.delete(handle);
}

// ==================== STATISTICS AGGREGATION ====================

/**
 * Aggregate yearly statistics
 */
export function aggregateYearlyStatistics(
  shows: WasmShowInput[],
  setlistEntries: WasmSetlistEntryInput[]
): WasmYearlyStatisticsOutput[] {
  // Group shows by year
  const showsByYear = new Map<number, WasmShowInput[]>();
  for (const show of shows) {
    // PERF: Use extractYearFast instead of parseInt(substring)
    const year = extractYearFast(show.date);
    const yearShows = showsByYear.get(year);
    if (yearShows) {
      yearShows.push(show);
    } else {
      showsByYear.set(year, [show]);
    }
  }

  // Group entries by year
  const entriesByYear = new Map<number, WasmSetlistEntryInput[]>();
  for (const entry of setlistEntries) {
    const yearEntries = entriesByYear.get(entry.year);
    if (yearEntries) {
      yearEntries.push(entry);
    } else {
      entriesByYear.set(entry.year, [entry]);
    }
  }

  const results: WasmYearlyStatisticsOutput[] = [];

  for (const [year, yearShows] of showsByYear) {
    const yearEntries = entriesByYear.get(year) ?? [];

    // Count song occurrences
    const songCounts = new Map<number, number>();
    const openerCounts = new Map<number, number>();
    const closerCounts = new Map<number, number>();

    for (const entry of yearEntries) {
      songCounts.set(entry.song_id, (songCounts.get(entry.song_id) ?? 0) + 1);

      if (entry.slot === 'opener') {
        openerCounts.set(entry.song_id, (openerCounts.get(entry.song_id) ?? 0) + 1);
      } else if (entry.slot === 'closer' && !entry.set_name.startsWith('encore')) {
        closerCounts.set(entry.song_id, (closerCounts.get(entry.song_id) ?? 0) + 1);
      }
    }

    const sortedSongs = Array.from(songCounts.entries()).sort((a, b) => b[1] - a[1]);
    const sortedOpeners = Array.from(openerCounts.entries()).sort((a, b) => b[1] - a[1]);
    const sortedClosers = Array.from(closerCounts.entries()).sort((a, b) => b[1] - a[1]);

    const totalSongs = yearShows.reduce((sum, s) => sum + s.song_count, 0);

    results.push({
      year,
      show_count: yearShows.length,
      unique_songs: songCounts.size,
      average_setlist_length: yearShows.length > 0 ? Math.round(totalSongs / yearShows.length) : 0,
      most_played_songs: sortedSongs.slice(0, 10).map(([song_id, count]) => ({ song_id, count })),
      top_openers: sortedOpeners.slice(0, 5).map(([song_id, count]) => ({ song_id, count })),
      top_closers: sortedClosers.slice(0, 5).map(([song_id, count]) => ({ song_id, count })),
    });
  }

  return results.sort((a, b) => b.year - a.year);
}

/**
 * Calculate slot statistics across all setlist entries
 */
export function calculateSlotStatistics(
  setlistEntries: WasmSetlistEntryInput[]
): {
  total_entries: number;
  by_slot: Record<string, number>;
  by_set: Record<string, number>;
} {
  const bySlot: Record<string, number> = {};
  const bySet: Record<string, number> = {};

  for (const entry of setlistEntries) {
    bySlot[entry.slot] = (bySlot[entry.slot] ?? 0) + 1;
    bySet[entry.set_name] = (bySet[entry.set_name] ?? 0) + 1;
  }

  return {
    total_entries: setlistEntries.length,
    by_slot: bySlot,
    by_set: bySet,
  };
}

// ==================== GLOBAL SEARCH ====================

/**
 * Global search across songs, venues, and guests
 */
export function globalSearch(
  songs: Array<{ id: number; title: string; slug: string }>,
  venues: Array<{ id: number; name: string; slug: string }>,
  guests: Array<{ id: number; name: string; slug: string }>,
  query: string,
  limit: number
): WasmSearchResult[] {
  const normalizedQuery = query.toLowerCase().trim();
  if (!normalizedQuery) return [];

  const results: WasmSearchResult[] = [];

  // Search songs
  for (const song of songs) {
    const titleLower = song.title.toLowerCase();
    if (titleLower.includes(normalizedQuery)) {
      const score = titleLower.startsWith(normalizedQuery) ? 100 : 50;
      results.push({
        entityType: 'song',
        id: song.id,
        title: song.title,
        slug: song.slug,
        score,
      });
    }
  }

  // Search venues
  for (const venue of venues) {
    const nameLower = venue.name.toLowerCase();
    if (nameLower.includes(normalizedQuery)) {
      const score = nameLower.startsWith(normalizedQuery) ? 100 : 50;
      results.push({
        entityType: 'venue',
        id: venue.id,
        title: venue.name,
        slug: venue.slug,
        score,
      });
    }
  }

  // Search guests
  for (const guest of guests) {
    const nameLower = guest.name.toLowerCase();
    if (nameLower.includes(normalizedQuery)) {
      const score = nameLower.startsWith(normalizedQuery) ? 100 : 50;
      results.push({
        entityType: 'guest',
        id: guest.id,
        title: guest.name,
        slug: guest.slug,
        score,
      });
    }
  }

  // Sort by score (descending), then by title (ascending)
  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.title.localeCompare(b.title);
  });

  return results.slice(0, limit);
}

// ==================== TOUR STATS ====================

/**
 * Get tour statistics for a specific year
 */
export function getTourStatsByYear(
  shows: Array<{ id: number; date: string; venue_id: number; state: string }>,
  entries: WasmSetlistEntryInput[],
  year: number
): WasmTourYearStats {
  // Filter shows for the year
  // PERF: Use extractYearFast instead of parseInt(substring)
  const yearShows = shows.filter(show => extractYearFast(show.date) === year);

  if (yearShows.length === 0) {
    return {
      year,
      showCount: 0,
      uniqueVenues: 0,
      uniqueStates: 0,
      uniqueSongs: 0,
    };
  }

  // Count unique venues and states
  const uniqueVenues = new Set(yearShows.map(s => s.venue_id));
  const uniqueStates = new Set(yearShows.map(s => s.state).filter(Boolean));

  // Get show IDs for the year
  const showIds = new Set(yearShows.map(s => s.id));

  // PERF: Single-pass loop instead of filter().map() chain
  // Original created intermediate filtered array before Set creation
  const uniqueSongs = new Set<number>();
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    if (showIds.has(e.show_id)) {
      uniqueSongs.add(e.song_id);
    }
  }

  return {
    year,
    showCount: yearShows.length,
    uniqueVenues: uniqueVenues.size,
    uniqueStates: uniqueStates.size,
    uniqueSongs: uniqueSongs.size,
  };
}

/**
 * Group tours by decade
 */
export function getToursGroupedByDecade(
  tours: Array<{ id: number; name: string; start_date: string; end_date: string }>
): Record<number, Array<{ id: number; name: string; start_date: string; end_date: string }>> {
  const grouped: Record<number, Array<{ id: number; name: string; start_date: string; end_date: string }>> = {};

  for (const tour of tours) {
    // PERF: Use extractYearFast instead of parseInt(substring)
    const startYear = extractYearFast(tour.start_date);
    const decade = Math.floor(startYear / 10) * 10;

    if (!grouped[decade]) {
      grouped[decade] = [];
    }
    grouped[decade].push(tour);
  }

  // Sort tours within each decade by start date
  for (const decade in grouped) {
    grouped[decade].sort((a, b) => a.start_date.localeCompare(b.start_date));
  }

  return grouped;
}

// ==================== GUEST STATS ====================

/**
 * Get year breakdown for a guest (appearances per year)
 */
export function getYearBreakdownForGuest(
  appearances: Array<{ id: number; guest_id: number; show_id: number; show_date: string }>,
  guestId: number
): WasmYearCount[] {
  // Filter appearances for the guest
  const guestAppearances = appearances.filter(a => a.guest_id === guestId);

  // Group by year and count unique shows
  const yearMap = new Map<number, Set<number>>();

  for (const appearance of guestAppearances) {
    // PERF: Use extractYearFast instead of parseInt(substring)
    const year = extractYearFast(appearance.show_date);
    const shows = yearMap.get(year);
    if (shows) {
      shows.add(appearance.show_id);
    } else {
      yearMap.set(year, new Set([appearance.show_id]));
    }
  }

  // Convert to array and sort by year
  const yearCounts: WasmYearCount[] = Array.from(yearMap.entries()).map(([year, shows]) => ({
    year,
    count: shows.size,
  }));

  return yearCounts.sort((a, b) => a.year - b.year);
}

// ==================== ENCORE AND SHOW IDS ====================

/**
 * Count encore songs for a specific year
 * PERF: Single-pass counting instead of filter().length
 */
export function countEncoresByYear(
  entries: WasmSetlistEntryInput[],
  year: number
): number {
  let count = 0;
  for (const e of entries) {
    if (e.year === year && e.set_name.startsWith('encore')) {
      count++;
    }
  }
  return count;
}

/**
 * Get unique show IDs where a song was played
 */
export function getShowIdsForSong(
  entries: WasmSetlistEntryInput[],
  songId: number
): number[] {
  const showIds = new Set<number>();

  for (const entry of entries) {
    if (entry.song_id === songId) {
      showIds.add(entry.show_id);
    }
  }

  return Array.from(showIds).sort((a, b) => a - b);
}

/**
 * Get unique show IDs where a guest appeared
 */
export function getShowIdsForGuest(
  appearances: Array<{ id: number; guest_id: number; show_id: number }>,
  guestId: number
): number[] {
  const showIds = new Set<number>();

  for (const appearance of appearances) {
    if (appearance.guest_id === guestId) {
      showIds.add(appearance.show_id);
    }
  }

  return Array.from(showIds).sort((a, b) => a - b);
}

// ==================== DATA VALIDATION ====================

/**
 * Validate setlist integrity
 */
export function validateSetlistIntegrity(
  setlist: WasmSetlistEntryInput[]
): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for duplicate positions
  const positions = new Set<number>();
  for (const entry of setlist) {
    if (positions.has(entry.position)) {
      errors.push(`Duplicate position: ${entry.position}`);
    }
    positions.add(entry.position);
  }

  // Check for gaps in positions
  const sortedPositions = [...positions].sort((a, b) => a - b);
  // PERF: Cache length outside loop condition
  const posLen = sortedPositions.length;
  for (let i = 1; i < posLen; i++) {
    if (sortedPositions[i] - sortedPositions[i - 1] > 1) {
      warnings.push(`Gap in positions between ${sortedPositions[i - 1]} and ${sortedPositions[i]}`);
    }
  }

  // Check for multiple openers
  const openers = setlist.filter(e => e.slot === 'opener');
  if (openers.length > 1) {
    warnings.push(`Multiple openers found: ${openers.length}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate show data
 */
export function validateShowData(
  show: WasmShowInput
): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(show.date)) {
    errors.push(`Invalid date format: ${show.date}`);
  }

  // Validate IDs
  if (show.id <= 0) errors.push('Invalid show ID');
  if (show.venue_id <= 0) errors.push('Invalid venue ID');
  if (show.tour_id <= 0) errors.push('Invalid tour ID');

  // Validate song count
  if (show.song_count < 0) errors.push('Negative song count');

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ==================== FALLBACK REGISTRY ====================

/**
 * Registry of all fallback implementations
 */
export const fallbackImplementations = {
  calculate_song_rarity: calculateSongRarity,
  calculate_song_statistics: calculateSongStatistics,
  find_song_gaps: findSongGaps,
  calculate_show_rarity: calculateShowRarity,
  find_rare_shows: findRareShows,
  calculate_setlist_similarity: calculateSetlistSimilarity,
  calculate_tour_statistics: calculateTourStatistics,
  find_tour_patterns: findTourPatterns,
  calculate_venue_statistics: calculateVenueStatistics,
  compute_liberation_list: computeLiberationList,
  update_liberation_entry: updateLiberationEntry,
  build_search_index: buildSearchIndex,
  search_index: searchIndex,
  free_search_index: freeSearchIndex,
  aggregate_yearly_statistics: aggregateYearlyStatistics,
  calculate_slot_statistics: calculateSlotStatistics,
  validate_setlist_integrity: validateSetlistIntegrity,
  validate_show_data: validateShowData,
  global_search: globalSearch,
  get_tour_stats_by_year: getTourStatsByYear,
  get_tours_grouped_by_decade: getToursGroupedByDecade,
  get_year_breakdown_for_guest: getYearBreakdownForGuest,
  count_encores_by_year: countEncoresByYear,
  get_show_ids_for_song: getShowIdsForSong,
  get_show_ids_for_guest: getShowIdsForGuest,
} as const;

export type FallbackMethod = keyof typeof fallbackImplementations;

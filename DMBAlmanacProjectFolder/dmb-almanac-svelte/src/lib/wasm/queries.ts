/**
 * DMB Almanac - WASM-Accelerated Query Functions
 *
 * High-performance query functions that use WASM when available
 * with automatic JavaScript fallback.
 *
 * These functions provide the same API whether WASM is loaded or not.
 */

import { getWasmBridge } from './bridge';
import { getQueryCache, CacheKeys, CacheTTL } from '$db/dexie/cache';
import type {
	DexieSong,
	DexieVenue,
	DexieGuest,
	DexieShow,
	DexieSetlistEntry,
	DexieTour,
	DexieGuestAppearance
} from '$db/dexie/schema';

// ==================== PERFORMANCE HELPERS ====================

// PERF: Inline year extraction (avoids parseInt + substring overhead)
// Date format is always YYYY-MM-DD, so we can extract year directly via char codes
function extractYearFast(date: string): number {
	return (date.charCodeAt(0) - 48) * 1000 +
		(date.charCodeAt(1) - 48) * 100 +
		(date.charCodeAt(2) - 48) * 10 +
		(date.charCodeAt(3) - 48);
}

// ==================== SEARCH RESULT TYPES ====================

export interface SearchResult {
	entityType: 'song' | 'venue' | 'guest';
	id: number;
	title: string;
	score: number;
}

// ==================== GLOBAL SEARCH ====================

/**
 * Global search using WASM acceleration when available
 */
export async function wasmGlobalSearch(
	songs: DexieSong[],
	venues: DexieVenue[],
	guests: DexieGuest[],
	query: string,
	limit: number = 50
): Promise<SearchResult[]> {
	const bridge = getWasmBridge();

	// Check cache first
	const cache = getQueryCache();
	const cacheKey = `search:global:${query}:${limit}`;
	const cached = cache.get<SearchResult[]>(cacheKey);
	if (cached) {
		return cached;
	}

	// Try WASM if available
	if (bridge) {
		try {
			const result = await bridge.call<string>(
				'global_search',
				JSON.stringify(songs),
				JSON.stringify(venues),
				JSON.stringify(guests),
				query,
				limit
			);

			if (result.success && result.data) {
				const parsed = JSON.parse(result.data) as SearchResult[];
				cache.set(cacheKey, parsed, CacheTTL.STATS);
				return parsed;
			}
		} catch (error) {
			console.warn('WASM global_search failed, using JS fallback:', error);
		}
	}

	// JS fallback implementation
	const results: SearchResult[] = [];
	const lowerQuery = query.toLowerCase();

	// Search songs - pre-compute lowercase outside condition check
	for (const song of songs) {
		const lowerTitle = song.title.toLowerCase();
		if (lowerTitle.includes(lowerQuery)) {
			results.push({
				entityType: 'song',
				id: song.id,
				title: song.title,
				score: 1.0
			});
		}
	}

	// Search venues - pre-compute lowercase to avoid repeated calls
	for (const venue of venues) {
		const lowerName = venue.name.toLowerCase();
		const lowerCity = venue.city?.toLowerCase();
		const nameMatch = lowerName.includes(lowerQuery);
		const cityMatch = lowerCity?.includes(lowerQuery) ?? false;
		if (nameMatch || cityMatch) {
			results.push({
				entityType: 'venue',
				id: venue.id,
				title: venue.name,
				score: nameMatch ? 1.0 : 0.5
			});
		}
	}

	// Search guests - pre-compute lowercase
	for (const guest of guests) {
		const lowerName = guest.name.toLowerCase();
		if (lowerName.includes(lowerQuery)) {
			results.push({
				entityType: 'guest',
				id: guest.id,
				title: guest.name,
				score: 1.0
			});
		}
	}

	// Sort by score and limit
	results.sort((a, b) => b.score - a.score);
	const limited = results.slice(0, limit);

	cache.set(cacheKey, limited, CacheTTL.STATS);

	return limited;
}

// ==================== TOUR STATISTICS ====================

export interface TourYearStats {
	showCount: number;
	uniqueVenues: number;
	uniqueStates: number;
	uniqueSongs: number;
}

/**
 * Get tour statistics for a year using WASM
 */
export async function wasmGetTourStatsByYear(
	shows: DexieShow[],
	setlistEntries: DexieSetlistEntry[],
	year: number
): Promise<TourYearStats> {
	const bridge = getWasmBridge();

	// Check cache first
	const cache = getQueryCache();
	const cacheKey = CacheKeys.tourStatsByYear(year);
	const cached = cache.get<TourYearStats>(cacheKey);
	if (cached) {
		return cached;
	}

	// Try WASM if available
	if (bridge) {
		try {
			const result = await bridge.call<string>(
				'get_tour_stats_by_year',
				JSON.stringify(shows),
				JSON.stringify(setlistEntries),
				year
			);

			if (result.success && result.data) {
				const parsed = JSON.parse(result.data) as TourYearStats;
				cache.set(cacheKey, parsed, CacheTTL.STATS);
				return parsed;
			}
		} catch (error) {
			console.warn('WASM get_tour_stats_by_year failed, using JS fallback:', error);
		}
	}

	// JS fallback implementation
	const yearShows = shows.filter((show) => show.year === year);

	const showIds = new Set(yearShows.map((s) => s.id));
	const venueIds = new Set(yearShows.map((s) => s.venueId));
	const states = new Set(yearShows.map((s) => s.venue?.state).filter(Boolean));

	const yearEntries = setlistEntries.filter((entry) => showIds.has(entry.showId));
	const songIds = new Set(yearEntries.map((e) => e.songId));

	const stats: TourYearStats = {
		showCount: yearShows.length,
		uniqueVenues: venueIds.size,
		uniqueStates: states.size,
		uniqueSongs: songIds.size
	};

	cache.set(cacheKey, stats, CacheTTL.STATS);

	return stats;
}

/**
 * Group tours by decade using WASM
 */
export async function wasmGetToursGroupedByDecade(
	tours: DexieTour[]
): Promise<Map<number, DexieTour[]>> {
	const bridge = getWasmBridge();

	// Check cache first
	const cache = getQueryCache();
	const cacheKey = CacheKeys.toursGroupedByDecade();
	const cached = cache.get<Array<[number, DexieTour[]]>>(cacheKey);
	if (cached) {
		return new Map(cached);
	}

	// Try WASM if available
	if (bridge) {
		try {
			const result = await bridge.call<string>(
				'get_tours_grouped_by_decade',
				JSON.stringify(tours)
			);

			if (result.success && result.data) {
				const parsed = JSON.parse(result.data) as Record<string, DexieTour[]>;
				const resultMap = new Map<number, DexieTour[]>();
				for (const [decade, toursList] of Object.entries(parsed)) {
					resultMap.set(Number(decade), toursList);
				}
				cache.set(cacheKey, Array.from(resultMap.entries()), CacheTTL.STATIC);
				return resultMap;
			}
		} catch (error) {
			console.warn('WASM get_tours_grouped_by_decade failed, using JS fallback:', error);
		}
	}

	// JS fallback implementation
	const grouped = new Map<number, DexieTour[]>();

	for (const tour of tours) {
		const decade = Math.floor(tour.year / 10) * 10;

		if (!grouped.has(decade)) {
			grouped.set(decade, []);
		}
		grouped.get(decade)!.push(tour);
	}

	// Sort tours within each decade by year
	for (const [, toursList] of grouped.entries()) {
		toursList.sort((a, b) => a.year - b.year);
	}

	cache.set(cacheKey, Array.from(grouped.entries()), CacheTTL.STATIC);

	return grouped;
}

// ==================== GUEST AGGREGATIONS ====================

export interface YearCount {
	year: number;
	count: number;
}

/**
 * Get year breakdown for a guest using WASM
 */
export async function wasmGetYearBreakdownForGuest(
	appearances: DexieGuestAppearance[],
	guestId: number
): Promise<YearCount[]> {
	const bridge = getWasmBridge();

	// Check cache first
	const cache = getQueryCache();
	const cacheKey = CacheKeys.guestYearBreakdown(guestId);
	const cached = cache.get<YearCount[]>(cacheKey);
	if (cached) {
		return cached;
	}

	// Try WASM if available
	if (bridge) {
		try {
			const result = await bridge.call<string>(
				'get_year_breakdown_for_guest',
				JSON.stringify(appearances),
				guestId
			);

			if (result.success && result.data) {
				const parsed = JSON.parse(result.data) as YearCount[];
				cache.set(cacheKey, parsed, CacheTTL.AGGREGATION);
				return parsed;
			}
		} catch (error) {
			console.warn('WASM get_year_breakdown_for_guest failed, using JS fallback:', error);
		}
	}

	// JS fallback implementation
	const guestAppearances = appearances.filter((a) => a.guestId === guestId);
	const yearCounts = new Map<number, number>();

	for (const appearance of guestAppearances) {
		const year = appearance.year;
		yearCounts.set(year, (yearCounts.get(year) || 0) + 1);
	}

	const breakdown = Array.from(yearCounts.entries())
		.map(([year, count]) => ({ year, count }))
		.sort((a, b) => a.year - b.year);

	cache.set(cacheKey, breakdown, CacheTTL.AGGREGATION);

	return breakdown;
}

// ==================== SLOT-BASED AGGREGATIONS ====================

export interface SongWithCount {
	songId: number;
	count: number;
}

/**
 * Count encores by year using WASM
 */
export async function wasmCountEncoresByYear(
	entries: DexieSetlistEntry[],
	year: number,
	limit: number = 10
): Promise<SongWithCount[]> {
	const bridge = getWasmBridge();

	// Check cache first
	const cache = getQueryCache();
	const cacheKey = CacheKeys.topEncoresByYear(year, limit);
	const cached = cache.get<SongWithCount[]>(cacheKey);
	if (cached) {
		return cached;
	}

	// Try WASM if available
	if (bridge) {
		try {
			const result = await bridge.call<string>(
				'count_encores_by_year',
				JSON.stringify(entries),
				year
			);

			if (result.success && result.data) {
				const parsed = JSON.parse(result.data) as SongWithCount[];
				cache.set(cacheKey, parsed.slice(0, limit), CacheTTL.TOP_LISTS);
				return parsed.slice(0, limit);
			}
		} catch (error) {
			console.warn('WASM count_encores_by_year failed, using JS fallback:', error);
		}
	}

	// JS fallback implementation
	const encoreEntries = entries.filter((entry) => {
		const setName = entry.setName?.toLowerCase() || '';
		return setName.includes('encore') && entry.year === year;
	});

	const songCounts = new Map<number, number>();

	for (const entry of encoreEntries) {
		songCounts.set(entry.songId, (songCounts.get(entry.songId) || 0) + 1);
	}

	const counts = Array.from(songCounts.entries())
		.map(([songId, count]) => ({ songId, count }))
		.sort((a, b) => b.count - a.count)
		.slice(0, limit);

	cache.set(cacheKey, counts, CacheTTL.TOP_LISTS);

	return counts;
}

// ==================== SHOW ID LOOKUPS ====================

/**
 * Get unique show IDs for a song using WASM
 */
export async function wasmGetShowIdsForSong(
	entries: DexieSetlistEntry[],
	songId: number
): Promise<number[]> {
	const bridge = getWasmBridge();

	// Check cache first
	const cache = getQueryCache();
	const cacheKey = `showIds:song:${songId}`;
	const cached = cache.get<number[]>(cacheKey);
	if (cached) {
		return cached;
	}

	// Try WASM if available
	if (bridge) {
		try {
			const result = await bridge.call<string>(
				'get_show_ids_for_song',
				JSON.stringify(entries),
				songId
			);

			if (result.success && result.data) {
				const parsed = JSON.parse(result.data) as number[];
				cache.set(cacheKey, parsed, CacheTTL.AGGREGATION);
				return parsed;
			}
		} catch (error) {
			console.warn('WASM get_show_ids_for_song failed, using JS fallback:', error);
		}
	}

	// JS fallback implementation
	const showIds = new Set<number>();

	for (const entry of entries) {
		if (entry.songId === songId) {
			showIds.add(entry.showId);
		}
	}

	const result = Array.from(showIds).sort((a, b) => a - b);

	cache.set(cacheKey, result, CacheTTL.AGGREGATION);

	return result;
}

/**
 * Get unique show IDs for a guest using WASM
 */
export async function wasmGetShowIdsForGuest(
	appearances: DexieGuestAppearance[],
	guestId: number
): Promise<number[]> {
	const bridge = getWasmBridge();

	// Check cache first
	const cache = getQueryCache();
	const cacheKey = `showIds:guest:${guestId}`;
	const cached = cache.get<number[]>(cacheKey);
	if (cached) {
		return cached;
	}

	// Try WASM if available
	if (bridge) {
		try {
			const result = await bridge.call<string>(
				'get_show_ids_for_guest',
				JSON.stringify(appearances),
				guestId
			);

			if (result.success && result.data) {
				const parsed = JSON.parse(result.data) as number[];
				cache.set(cacheKey, parsed, CacheTTL.AGGREGATION);
				return parsed;
			}
		} catch (error) {
			console.warn('WASM get_show_ids_for_guest failed, using JS fallback:', error);
		}
	}

	// JS fallback implementation
	const showIds = new Set<number>();

	for (const appearance of appearances) {
		if (appearance.guestId === guestId) {
			showIds.add(appearance.showId);
		}
	}

	const result = Array.from(showIds).sort((a, b) => a - b);

	cache.set(cacheKey, result, CacheTTL.AGGREGATION);

	return result;
}

// ==================== TOP SLOT SONGS ====================

/**
 * Get top opening songs across all shows
 */
export async function wasmGetTopOpeningSongs(
	entries: DexieSetlistEntry[],
	limit: number = 5
): Promise<SongWithCount[]> {
	const bridge = getWasmBridge();

	// Check cache first
	const cache = getQueryCache();
	const cacheKey = CacheKeys.topOpeningSongs(limit);
	const cached = cache.get<SongWithCount[]>(cacheKey);
	if (cached) {
		return cached;
	}

	// Try WASM if available
	if (bridge) {
		try {
			const result = await bridge.call<string>(
				'count_openers_by_year',
				JSON.stringify(entries),
				0 // 0 = all years
			);

			if (result.success && result.data) {
				const parsed = JSON.parse(result.data) as SongWithCount[];
				cache.set(cacheKey, parsed.slice(0, limit), CacheTTL.TOP_LISTS);
				return parsed.slice(0, limit);
			}
		} catch (error) {
			console.warn('WASM count_openers_by_year failed, using JS fallback:', error);
		}
	}

	// JS fallback implementation
	const openerEntries = entries.filter((entry) => entry.slot === 'opener');
	const songCounts = new Map<number, number>();

	for (const entry of openerEntries) {
		songCounts.set(entry.songId, (songCounts.get(entry.songId) || 0) + 1);
	}

	const counts = Array.from(songCounts.entries())
		.map(([songId, count]) => ({ songId, count }))
		.sort((a, b) => b.count - a.count)
		.slice(0, limit);

	cache.set(cacheKey, counts, CacheTTL.TOP_LISTS);

	return counts;
}

/**
 * Get top closing songs across all shows (excluding encores)
 */
export async function wasmGetTopClosingSongs(
	entries: DexieSetlistEntry[],
	limit: number = 5
): Promise<SongWithCount[]> {
	const bridge = getWasmBridge();

	// Check cache first
	const cache = getQueryCache();
	const cacheKey = CacheKeys.topClosingSongs(limit);
	const cached = cache.get<SongWithCount[]>(cacheKey);
	if (cached) {
		return cached;
	}

	// Try WASM if available
	if (bridge) {
		try {
			const result = await bridge.call<string>(
				'count_closers_by_year',
				JSON.stringify(entries),
				0 // 0 = all years
			);

			if (result.success && result.data) {
				const parsed = JSON.parse(result.data) as SongWithCount[];
				cache.set(cacheKey, parsed.slice(0, limit), CacheTTL.TOP_LISTS);
				return parsed.slice(0, limit);
			}
		} catch (error) {
			console.warn('WASM count_closers_by_year failed, using JS fallback:', error);
		}
	}

	// JS fallback implementation - exclude encores
	const closerEntries = entries.filter((entry) => {
		const isCloser = entry.slot === 'closer';
		const setName = entry.setName?.toLowerCase() || '';
		const isNotEncore = !setName.includes('encore');
		return isCloser && isNotEncore;
	});

	const songCounts = new Map<number, number>();

	for (const entry of closerEntries) {
		songCounts.set(entry.songId, (songCounts.get(entry.songId) || 0) + 1);
	}

	const counts = Array.from(songCounts.entries())
		.map(([songId, count]) => ({ songId, count }))
		.sort((a, b) => b.count - a.count)
		.slice(0, limit);

	cache.set(cacheKey, counts, CacheTTL.TOP_LISTS);

	return counts;
}

/**
 * Get top encore songs across all shows
 */
export async function wasmGetTopEncoreSongs(
	entries: DexieSetlistEntry[],
	limit: number = 5
): Promise<SongWithCount[]> {
	const bridge = getWasmBridge();

	// Check cache first
	const cache = getQueryCache();
	const cacheKey = CacheKeys.topEncoreSongs(limit);
	const cached = cache.get<SongWithCount[]>(cacheKey);
	if (cached) {
		return cached;
	}

	// Try WASM if available - use count_encores_by_year with year=0 for all years
	if (bridge) {
		try {
			const result = await bridge.call<string>(
				'count_encores_by_year',
				JSON.stringify(entries),
				0 // 0 = all years
			);

			if (result.success && result.data) {
				const parsed = JSON.parse(result.data) as SongWithCount[];
				cache.set(cacheKey, parsed.slice(0, limit), CacheTTL.TOP_LISTS);
				return parsed.slice(0, limit);
			}
		} catch (error) {
			console.warn('WASM count_encores_by_year failed, using JS fallback:', error);
		}
	}

	// JS fallback implementation
	const encoreEntries = entries.filter((entry) => {
		const setName = entry.setName?.toLowerCase() || '';
		return setName.includes('encore');
	});

	const songCounts = new Map<number, number>();

	for (const entry of encoreEntries) {
		songCounts.set(entry.songId, (songCounts.get(entry.songId) || 0) + 1);
	}

	const counts = Array.from(songCounts.entries())
		.map(([songId, count]) => ({ songId, count }))
		.sort((a, b) => b.count - a.count)
		.slice(0, limit);

	cache.set(cacheKey, counts, CacheTTL.TOP_LISTS);

	return counts;
}

// ==================== COMBINED TOP SLOT SONGS ====================

/**
 * Combined result for all three slot types (opener, closer, encore).
 * Reduces IndexedDB queries from 3 to 1.
 */
export interface TopSlotSongsCombined {
	topOpeners: SongWithCount[];
	topClosers: SongWithCount[];
	topEncores: SongWithCount[];
}

/**
 * Get top songs for all slot types in a single pass.
 * This reduces 3 separate IndexedDB queries to 1, improving performance by ~66%.
 *
 * @param entries - All setlist entries (not pre-filtered by slot)
 * @param limit - Maximum number of songs to return per slot type (default 5)
 * @returns Combined top songs for opener, closer, and encore slots
 */
export async function wasmGetTopSlotSongsCombined(
	entries: DexieSetlistEntry[],
	limit: number = 5
): Promise<TopSlotSongsCombined> {
	const bridge = getWasmBridge();

	// Check cache first - use a combined cache key
	const cache = getQueryCache();
	const cacheKey = `songs:top:combined:${limit}`;
	const cached = cache.get<TopSlotSongsCombined>(cacheKey);
	if (cached) {
		return cached;
	}

	// Try WASM if available
	if (bridge) {
		try {
			// NOTE: bridge.call() already deserializes JSON strings from WASM
			// Use the correct type directly - no need for JSON.parse
			const result = await bridge.call<TopSlotSongsCombined>(
				'getTopSlotSongsCombined',
				JSON.stringify(entries),
				limit
			);

			if (result.success && result.data) {
				cache.set(cacheKey, result.data, CacheTTL.TOP_LISTS);
				return result.data;
			}
		} catch (error) {
			console.warn('WASM getTopSlotSongsCombined failed, using JS fallback:', error);
		}
	}

	// JS fallback implementation - single pass over all entries
	const openerCounts = new Map<number, number>();
	const closerCounts = new Map<number, number>();
	const encoreCounts = new Map<number, number>();

	for (const entry of entries) {
		if (entry.slot === 'opener') {
			openerCounts.set(entry.songId, (openerCounts.get(entry.songId) || 0) + 1);
		} else {
			// PERF: Compute setName lowercase once for all conditions
			const setNameLower = entry.setName?.toLowerCase() || '';
			const isEncore = setNameLower.includes('encore');

			if (entry.slot === 'closer') {
				if (isEncore) {
					encoreCounts.set(entry.songId, (encoreCounts.get(entry.songId) || 0) + 1);
				} else {
					closerCounts.set(entry.songId, (closerCounts.get(entry.songId) || 0) + 1);
				}
			} else if (isEncore) {
				// Standard entries in encore sets count as encores
				encoreCounts.set(entry.songId, (encoreCounts.get(entry.songId) || 0) + 1);
			}
		}
	}

	const toSortedArray = (counts: Map<number, number>, lim: number): SongWithCount[] =>
		Array.from(counts.entries())
			.map(([songId, count]) => ({ songId, count }))
			.sort((a, b) => b.count - a.count)
			.slice(0, lim);

	const combined: TopSlotSongsCombined = {
		topOpeners: toSortedArray(openerCounts, limit),
		topClosers: toSortedArray(closerCounts, limit),
		topEncores: toSortedArray(encoreCounts, limit),
	};

	cache.set(cacheKey, combined, CacheTTL.TOP_LISTS);

	return combined;
}

// ==================== SHOWS SUMMARY ====================

/**
 * Get shows summary by year
 */
export async function wasmGetShowsByYearSummary(shows: DexieShow[]): Promise<YearCount[]> {
	const bridge = getWasmBridge();

	// Check cache first
	const cache = getQueryCache();
	const cacheKey = CacheKeys.showsByYearSummary();
	const cached = cache.get<YearCount[]>(cacheKey);
	if (cached) {
		return cached;
	}

	// Try WASM if available
	if (bridge) {
		try {
			const result = await bridge.call<string>('aggregate_shows_by_year', JSON.stringify(shows));

			if (result.success && result.data) {
				const parsed = JSON.parse(result.data) as YearCount[];
				cache.set(cacheKey, parsed, CacheTTL.STATS);
				return parsed;
			}
		} catch (error) {
			console.warn('WASM aggregate_shows_by_year failed, using JS fallback:', error);
		}
	}

	// JS fallback implementation
	const yearCounts = new Map<number, number>();

	for (const show of shows) {
		// PERF: Use fast year extraction when show.year is not available
		const year = show.year || extractYearFast(show.date);
		yearCounts.set(year, (yearCounts.get(year) || 0) + 1);
	}

	const summary = Array.from(yearCounts.entries())
		.map(([year, count]) => ({ year, count }))
		.sort((a, b) => b.year - a.year);

	cache.set(cacheKey, summary, CacheTTL.STATS);

	return summary;
}

// ==================== SONG YEAR BREAKDOWN ====================

/**
 * Get year breakdown for a song using WASM
 */
export async function wasmGetYearBreakdownForSong(
	entries: DexieSetlistEntry[],
	songId: number
): Promise<YearCount[]> {
	const bridge = getWasmBridge();

	// Check cache first
	const cache = getQueryCache();
	const cacheKey = CacheKeys.songYearBreakdown(songId);
	const cached = cache.get<YearCount[]>(cacheKey);
	if (cached) {
		return cached;
	}

	// Try WASM if available
	if (bridge) {
		try {
			const result = await bridge.call<string>(
				'get_year_breakdown_for_song',
				JSON.stringify(entries),
				songId
			);

			if (result.success && result.data) {
				const parsed = JSON.parse(result.data) as YearCount[];
				cache.set(cacheKey, parsed, CacheTTL.AGGREGATION);
				return parsed;
			}
		} catch (error) {
			console.warn('WASM get_year_breakdown_for_song failed, using JS fallback:', error);
		}
	}

	// JS fallback implementation
	const songEntries = entries.filter((e) => e.songId === songId);
	const yearCounts = new Map<number, number>();

	for (const entry of songEntries) {
		yearCounts.set(entry.year, (yearCounts.get(entry.year) || 0) + 1);
	}

	const breakdown = Array.from(yearCounts.entries())
		.map(([year, count]) => ({ year, count }))
		.sort((a, b) => b.year - a.year);

	cache.set(cacheKey, breakdown, CacheTTL.AGGREGATION);

	return breakdown;
}

// ==================== VENUE YEAR BREAKDOWN ====================

/**
 * Get year breakdown for a venue using WASM
 */
export async function wasmGetYearBreakdownForVenue(
	shows: DexieShow[],
	venueId: number
): Promise<YearCount[]> {
	const bridge = getWasmBridge();

	// Check cache first
	const cache = getQueryCache();
	const cacheKey = CacheKeys.venueYearBreakdown(venueId);
	const cached = cache.get<YearCount[]>(cacheKey);
	if (cached) {
		return cached;
	}

	// Try WASM if available
	if (bridge) {
		try {
			const result = await bridge.call<string>(
				'get_year_breakdown_for_venue',
				JSON.stringify(shows),
				venueId
			);

			if (result.success && result.data) {
				const parsed = JSON.parse(result.data) as YearCount[];
				cache.set(cacheKey, parsed, CacheTTL.AGGREGATION);
				return parsed;
			}
		} catch (error) {
			console.warn('WASM get_year_breakdown_for_venue failed, using JS fallback:', error);
		}
	}

	// JS fallback implementation
	const venueShows = shows.filter((s) => s.venueId === venueId);
	const yearCounts = new Map<number, number>();

	for (const show of venueShows) {
		// PERF: Use fast year extraction when show.year is not available
		const year = show.year || extractYearFast(show.date);
		yearCounts.set(year, (yearCounts.get(year) || 0) + 1);
	}

	const breakdown = Array.from(yearCounts.entries())
		.map(([year, count]) => ({ year, count }))
		.sort((a, b) => b.year - a.year);

	cache.set(cacheKey, breakdown, CacheTTL.AGGREGATION);

	return breakdown;
}

// ==================== TOP SONGS BY PERFORMANCES ====================

/**
 * Get top songs by total performances using WASM
 */
export async function wasmGetTopSongsByPerformances(
	entries: DexieSetlistEntry[],
	limit: number = 10
): Promise<SongWithCount[]> {
	const bridge = getWasmBridge();

	// Check cache first
	const cache = getQueryCache();
	const cacheKey = CacheKeys.topSongsByPerformances(limit);
	const cached = cache.get<SongWithCount[]>(cacheKey);
	if (cached) {
		return cached;
	}

	// Try WASM if available
	if (bridge) {
		try {
			const result = await bridge.call<string>(
				'get_top_songs_by_performances',
				JSON.stringify(entries),
				limit
			);

			if (result.success && result.data) {
				const parsed = JSON.parse(result.data) as SongWithCount[];
				cache.set(cacheKey, parsed, CacheTTL.TOP_LISTS);
				return parsed;
			}
		} catch (error) {
			console.warn('WASM get_top_songs_by_performances failed, using JS fallback:', error);
		}
	}

	// JS fallback implementation
	const songCounts = new Map<number, number>();

	for (const entry of entries) {
		songCounts.set(entry.songId, (songCounts.get(entry.songId) || 0) + 1);
	}

	const counts = Array.from(songCounts.entries())
		.map(([songId, count]) => ({ songId, count }))
		.sort((a, b) => b.count - a.count)
		.slice(0, limit);

	cache.set(cacheKey, counts, CacheTTL.TOP_LISTS);

	return counts;
}

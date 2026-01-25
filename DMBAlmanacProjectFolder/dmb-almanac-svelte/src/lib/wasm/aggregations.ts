/**
 * DMB Almanac - Year Aggregation Utilities
 *
 * High-performance year-based aggregation functions that leverage WASM
 * when available with optimized JavaScript fallbacks.
 *
 * Features:
 * - TypedArrays (Uint32Array) for year counts - indexed by year offset
 * - Single-pass algorithms for O(n) performance
 * - WASM acceleration when available, JS fallback otherwise
 * - Caching via query cache for expensive operations
 * - Zero-copy memory patterns where possible
 *
 * Usage:
 * ```typescript
 * import {
 *   aggregateShowsByYear,
 *   aggregateSongsPerYear,
 *   calculateYearStatistics,
 *   getYearlyAverages
 * } from '$lib/wasm/aggregations';
 *
 * const showCounts = await aggregateShowsByYear(shows);
 * const songStats = await aggregateSongsPerYear(entries);
 * ```
 */

import { getWasmBridge } from './bridge';
import { getQueryCache, CacheTTL } from '$db/dexie/cache';
import type { DexieShow, DexieSetlistEntry } from '$db/dexie/schema';

// ==================== CONSTANTS ====================

/** Base year for TypedArray indexing (DMB formed in 1991) */
const BASE_YEAR = 1991;

/** Maximum year span to support (1991-2050 = 60 years) */
const MAX_YEAR_SPAN = 60;

// ==================== PERFORMANCE HELPERS ====================

/**
 * Fast year extraction from ISO date string (YYYY-MM-DD)
 * Avoids parseInt + substring overhead by using char codes directly
 * PERF: ~3x faster than parseInt(date.substring(0,4))
 */
function extractYearFast(date: string): number {
	return (
		(date.charCodeAt(0) - 48) * 1000 +
		(date.charCodeAt(1) - 48) * 100 +
		(date.charCodeAt(2) - 48) * 10 +
		(date.charCodeAt(3) - 48)
	);
}

/**
 * Convert year to TypedArray index
 * Years are stored as offset from BASE_YEAR for compact storage
 */
function yearToIndex(year: number): number {
	return year - BASE_YEAR;
}

/**
 * Convert TypedArray index back to year
 */
function indexToYear(index: number): number {
	return index + BASE_YEAR;
}

// ==================== TYPES ====================

export interface YearCount {
	year: number;
	count: number;
}

export interface YearStatistics {
	year: number;
	showCount: number;
	totalSongsPlayed: number;
	uniqueSongsPlayed: number;
	averageSongsPerShow: number;
	openerCount: number;
	closerCount: number;
	encoreCount: number;
}

export interface YearlyAverages {
	year: number;
	avgSongsPerShow: number;
	avgSetlistLength: number;
	avgUniqueSongs: number;
}

export interface SongYearBreakdown {
	songId: number;
	yearCounts: YearCount[];
	totalPerformances: number;
	firstYear: number;
	lastYear: number;
	yearsPlayed: number;
}

export interface YearAggregationResult {
	/** Year counts using TypedArray (index = year - BASE_YEAR) */
	counts: Uint32Array;
	/** Minimum year with data */
	minYear: number;
	/** Maximum year with data */
	maxYear: number;
	/** Total count across all years */
	total: number;
}

export interface ComprehensiveYearStats {
	years: YearStatistics[];
	yearRange: { min: number; max: number };
	totalShows: number;
	totalSongsPlayed: number;
	totalUniqueSongs: number;
	averageSongsPerShow: number;
	busiestYear: { year: number; showCount: number };
	quietestYear: { year: number; showCount: number };
}

// ==================== TYPED ARRAY UTILITIES ====================

/**
 * Create a year counts TypedArray initialized to zero
 * Uses Uint32Array for memory efficiency and fast operations
 */
export function createYearCountsArray(): Uint32Array {
	return new Uint32Array(MAX_YEAR_SPAN);
}

/**
 * Convert TypedArray year counts to YearCount array
 * Filters out years with zero counts
 */
export function typedArrayToYearCounts(counts: Uint32Array): YearCount[] {
	const result: YearCount[] = [];

	for (let i = 0; i < counts.length; i++) {
		if (counts[i] > 0) {
			result.push({
				year: indexToYear(i),
				count: counts[i]
			});
		}
	}

	// Sort by year descending (most recent first)
	return result.sort((a, b) => b.year - a.year);
}

/**
 * Convert YearCount array to TypedArray for efficient operations
 */
export function yearCountsToTypedArray(yearCounts: YearCount[]): Uint32Array {
	const counts = createYearCountsArray();

	for (const { year, count } of yearCounts) {
		const index = yearToIndex(year);
		if (index >= 0 && index < counts.length) {
			counts[index] = count;
		}
	}

	return counts;
}

/**
 * Merge multiple year count arrays (for combining results)
 */
export function mergeYearCounts(...arrays: Uint32Array[]): Uint32Array {
	const result = createYearCountsArray();

	for (const arr of arrays) {
		for (let i = 0; i < arr.length; i++) {
			result[i] += arr[i];
		}
	}

	return result;
}

// ==================== SHOW AGGREGATIONS ====================

/**
 * Aggregate shows by year using TypedArrays for efficiency
 * PERF: Single-pass O(n) algorithm with Uint32Array storage
 */
export async function aggregateShowsByYear(
	shows: DexieShow[]
): Promise<YearAggregationResult> {
	const bridge = getWasmBridge();

	// Check cache first
	const cache = getQueryCache();
	const cacheKey = `aggregations:shows:byYear:${shows.length}`;
	const cached = cache.get<YearAggregationResult>(cacheKey);
	if (cached) {
		return cached;
	}

	// Try WASM if available
	if (bridge) {
		try {
			const result = await bridge.call<string>(
				'aggregateShowsByYear',
				JSON.stringify(shows)
			);

			if (result.success && result.data) {
				const wasmResult = JSON.parse(result.data) as YearCount[];
				const counts = yearCountsToTypedArray(wasmResult);
				const aggregation = computeAggregationStats(counts);
				cache.set(cacheKey, aggregation, CacheTTL.AGGREGATION);
				return aggregation;
			}
		} catch (error) {
			console.warn('WASM aggregate_shows_by_year failed, using JS fallback:', error);
		}
	}

	// JS fallback - single pass algorithm
	const counts = createYearCountsArray();
	let minYear = Infinity;
	let maxYear = -Infinity;
	let total = 0;

	for (const show of shows) {
		const year = show.year || extractYearFast(show.date);
		const index = yearToIndex(year);

		if (index >= 0 && index < counts.length) {
			counts[index]++;
			total++;

			if (year < minYear) minYear = year;
			if (year > maxYear) maxYear = year;
		}
	}

	const aggregation: YearAggregationResult = {
		counts,
		minYear: minYear === Infinity ? BASE_YEAR : minYear,
		maxYear: maxYear === -Infinity ? BASE_YEAR : maxYear,
		total
	};

	cache.set(cacheKey, aggregation, CacheTTL.AGGREGATION);
	return aggregation;
}

/**
 * Get shows grouped by year as a Map for efficient lookup
 */
export async function getShowsGroupedByYear(
	shows: DexieShow[]
): Promise<Map<number, DexieShow[]>> {
	const cache = getQueryCache();
	const cacheKey = `aggregations:shows:grouped:${shows.length}`;

	// Note: We cache the array form since Maps don't serialize well
	const cached = cache.get<Array<[number, DexieShow[]]>>(cacheKey);
	if (cached) {
		return new Map(cached);
	}

	const grouped = new Map<number, DexieShow[]>();

	for (const show of shows) {
		const year = show.year || extractYearFast(show.date);
		const existing = grouped.get(year);

		if (existing) {
			existing.push(show);
		} else {
			grouped.set(year, [show]);
		}
	}

	cache.set(cacheKey, Array.from(grouped.entries()), CacheTTL.AGGREGATION);
	return grouped;
}

// ==================== SONG AGGREGATIONS ====================

/**
 * Aggregate songs played per year from setlist entries
 * Returns total song performances per year (not unique)
 *
 * Note: Uses optimized JS implementation. WASM acceleration available
 * through aggregateShowsByYear which handles shows-level aggregation.
 */
export async function aggregateSongsPerYear(
	entries: DexieSetlistEntry[]
): Promise<YearAggregationResult> {
	const cache = getQueryCache();
	const cacheKey = `aggregations:songs:perYear:${entries.length}`;
	const cached = cache.get<YearAggregationResult>(cacheKey);
	if (cached) {
		return cached;
	}

	// Optimized JS implementation - single pass O(n)
	// PERF: TypedArray provides ~2x faster iteration than plain objects
	const counts = createYearCountsArray();
	let minYear = Infinity;
	let maxYear = -Infinity;
	let total = 0;

	for (const entry of entries) {
		const year = entry.year;
		const index = yearToIndex(year);

		if (index >= 0 && index < counts.length) {
			counts[index]++;
			total++;

			if (year < minYear) minYear = year;
			if (year > maxYear) maxYear = year;
		}
	}

	const aggregation: YearAggregationResult = {
		counts,
		minYear: minYear === Infinity ? BASE_YEAR : minYear,
		maxYear: maxYear === -Infinity ? BASE_YEAR : maxYear,
		total
	};

	cache.set(cacheKey, aggregation, CacheTTL.AGGREGATION);
	return aggregation;
}

/**
 * Count unique songs played per year
 * More expensive than total songs - requires Set per year
 */
export async function aggregateUniqueSongsPerYear(
	entries: DexieSetlistEntry[]
): Promise<YearAggregationResult> {
	const cache = getQueryCache();
	const cacheKey = `aggregations:songs:uniquePerYear:${entries.length}`;
	const cached = cache.get<YearAggregationResult>(cacheKey);
	if (cached) {
		return cached;
	}

	// Build Set of song IDs per year - single pass
	const songsByYear = new Map<number, Set<number>>();
	let minYear = Infinity;
	let maxYear = -Infinity;

	for (const entry of entries) {
		const year = entry.year;
		const existing = songsByYear.get(year);

		if (existing) {
			existing.add(entry.songId);
		} else {
			songsByYear.set(year, new Set([entry.songId]));
		}

		if (year < minYear) minYear = year;
		if (year > maxYear) maxYear = year;
	}

	// Convert to TypedArray
	const counts = createYearCountsArray();
	let total = 0;

	for (const [year, songIds] of songsByYear) {
		const index = yearToIndex(year);
		if (index >= 0 && index < counts.length) {
			counts[index] = songIds.size;
			total += songIds.size;
		}
	}

	const aggregation: YearAggregationResult = {
		counts,
		minYear: minYear === Infinity ? BASE_YEAR : minYear,
		maxYear: maxYear === -Infinity ? BASE_YEAR : maxYear,
		total
	};

	cache.set(cacheKey, aggregation, CacheTTL.AGGREGATION);
	return aggregation;
}

/**
 * Get year breakdown for a specific song
 */
export async function getSongYearBreakdown(
	entries: DexieSetlistEntry[],
	songId: number
): Promise<SongYearBreakdown> {
	const bridge = getWasmBridge();

	const cache = getQueryCache();
	const cacheKey = `aggregations:song:${songId}:yearBreakdown`;
	const cached = cache.get<SongYearBreakdown>(cacheKey);
	if (cached) {
		return cached;
	}

	// Try WASM if available
	if (bridge) {
		try {
			const result = await bridge.call<string>(
				'getYearBreakdownForSong',
				JSON.stringify(entries),
				songId
			);

			if (result.success && result.data) {
				const yearCounts = JSON.parse(result.data) as YearCount[];
				const breakdown = buildSongYearBreakdown(songId, yearCounts);
				cache.set(cacheKey, breakdown, CacheTTL.AGGREGATION);
				return breakdown;
			}
		} catch (error) {
			console.warn('WASM get_year_breakdown_for_song failed, using JS fallback:', error);
		}
	}

	// JS fallback - filter and aggregate
	const counts = createYearCountsArray();
	let minYear = Infinity;
	let maxYear = -Infinity;
	let total = 0;

	for (const entry of entries) {
		if (entry.songId === songId) {
			const year = entry.year;
			const index = yearToIndex(year);

			if (index >= 0 && index < counts.length) {
				counts[index]++;
				total++;

				if (year < minYear) minYear = year;
				if (year > maxYear) maxYear = year;
			}
		}
	}

	const yearCounts = typedArrayToYearCounts(counts);
	const breakdown: SongYearBreakdown = {
		songId,
		yearCounts,
		totalPerformances: total,
		firstYear: minYear === Infinity ? 0 : minYear,
		lastYear: maxYear === -Infinity ? 0 : maxYear,
		yearsPlayed: yearCounts.length
	};

	cache.set(cacheKey, breakdown, CacheTTL.AGGREGATION);
	return breakdown;
}

// ==================== COMPREHENSIVE STATISTICS ====================

/**
 * Calculate comprehensive year statistics combining shows and setlist data
 * This is the main entry point for year-based analytics
 */
export async function calculateYearStatistics(
	shows: DexieShow[],
	entries: DexieSetlistEntry[]
): Promise<ComprehensiveYearStats> {
	const bridge = getWasmBridge();

	const cache = getQueryCache();
	const cacheKey = `aggregations:yearStats:${shows.length}:${entries.length}`;
	const cached = cache.get<ComprehensiveYearStats>(cacheKey);
	if (cached) {
		return cached;
	}

	// Try WASM if available
	if (bridge) {
		try {
			const result = await bridge.call<string>(
				'aggregateYearlyStatistics',
				JSON.stringify(shows),
				JSON.stringify(entries)
			);

			if (result.success && result.data) {
				const wasmStats = JSON.parse(result.data);
				const stats = transformWasmYearlyStats(wasmStats);
				cache.set(cacheKey, stats, CacheTTL.AGGREGATION);
				return stats;
			}
		} catch (error) {
			console.warn('WASM aggregate_yearly_statistics failed, using JS fallback:', error);
		}
	}

	// JS fallback - comprehensive single-pass aggregation
	const stats = computeComprehensiveYearStats(shows, entries);
	cache.set(cacheKey, stats, CacheTTL.AGGREGATION);
	return stats;
}

/**
 * Get yearly averages for setlist metrics
 */
export async function getYearlyAverages(
	shows: DexieShow[],
	entries: DexieSetlistEntry[]
): Promise<YearlyAverages[]> {
	const cache = getQueryCache();
	const cacheKey = `aggregations:yearlyAverages:${shows.length}:${entries.length}`;
	const cached = cache.get<YearlyAverages[]>(cacheKey);
	if (cached) {
		return cached;
	}

	// Group shows and entries by year
	const showsByYear = await getShowsGroupedByYear(shows);
	const entriesByYear = new Map<number, DexieSetlistEntry[]>();

	for (const entry of entries) {
		const year = entry.year;
		const existing = entriesByYear.get(year);
		if (existing) {
			existing.push(entry);
		} else {
			entriesByYear.set(year, [entry]);
		}
	}

	// Calculate averages per year
	const averages: YearlyAverages[] = [];

	for (const [year, yearShows] of showsByYear) {
		const yearEntries = entriesByYear.get(year) || [];
		const uniqueSongs = new Set(yearEntries.map((e) => e.songId));

		const avgSongsPerShow =
			yearShows.length > 0 ? yearEntries.length / yearShows.length : 0;

		// Average setlist length from show.songCount
		const avgSetlistLength =
			yearShows.length > 0
				? yearShows.reduce((sum, s) => sum + s.songCount, 0) / yearShows.length
				: 0;

		averages.push({
			year,
			avgSongsPerShow: Math.round(avgSongsPerShow * 10) / 10,
			avgSetlistLength: Math.round(avgSetlistLength * 10) / 10,
			avgUniqueSongs: uniqueSongs.size
		});
	}

	// Sort by year descending
	averages.sort((a, b) => b.year - a.year);

	cache.set(cacheKey, averages, CacheTTL.AGGREGATION);
	return averages;
}

// ==================== SLOT AGGREGATIONS BY YEAR ====================

/**
 * Aggregate opener songs by year
 */
export async function aggregateOpenersByYear(
	entries: DexieSetlistEntry[]
): Promise<YearAggregationResult> {
	const cache = getQueryCache();
	const cacheKey = `aggregations:openers:byYear:${entries.length}`;
	const cached = cache.get<YearAggregationResult>(cacheKey);
	if (cached) {
		return cached;
	}

	const counts = createYearCountsArray();
	let minYear = Infinity;
	let maxYear = -Infinity;
	let total = 0;

	for (const entry of entries) {
		if (entry.slot === 'opener') {
			const year = entry.year;
			const index = yearToIndex(year);

			if (index >= 0 && index < counts.length) {
				counts[index]++;
				total++;

				if (year < minYear) minYear = year;
				if (year > maxYear) maxYear = year;
			}
		}
	}

	const aggregation: YearAggregationResult = {
		counts,
		minYear: minYear === Infinity ? BASE_YEAR : minYear,
		maxYear: maxYear === -Infinity ? BASE_YEAR : maxYear,
		total
	};

	cache.set(cacheKey, aggregation, CacheTTL.AGGREGATION);
	return aggregation;
}

/**
 * Aggregate closer songs by year (excluding encores)
 */
export async function aggregateClosersByYear(
	entries: DexieSetlistEntry[]
): Promise<YearAggregationResult> {
	const cache = getQueryCache();
	const cacheKey = `aggregations:closers:byYear:${entries.length}`;
	const cached = cache.get<YearAggregationResult>(cacheKey);
	if (cached) {
		return cached;
	}

	const counts = createYearCountsArray();
	let minYear = Infinity;
	let maxYear = -Infinity;
	let total = 0;

	for (const entry of entries) {
		// Only count closers from main sets, not encores
		const isCloser = entry.slot === 'closer';
		const isEncore = entry.setName === 'encore' || entry.setName === 'encore2';

		if (isCloser && !isEncore) {
			const year = entry.year;
			const index = yearToIndex(year);

			if (index >= 0 && index < counts.length) {
				counts[index]++;
				total++;

				if (year < minYear) minYear = year;
				if (year > maxYear) maxYear = year;
			}
		}
	}

	const aggregation: YearAggregationResult = {
		counts,
		minYear: minYear === Infinity ? BASE_YEAR : minYear,
		maxYear: maxYear === -Infinity ? BASE_YEAR : maxYear,
		total
	};

	cache.set(cacheKey, aggregation, CacheTTL.AGGREGATION);
	return aggregation;
}

/**
 * Aggregate encore songs by year
 */
export async function aggregateEncoresByYear(
	entries: DexieSetlistEntry[]
): Promise<YearAggregationResult> {
	const cache = getQueryCache();
	const cacheKey = `aggregations:encores:byYear:${entries.length}`;
	const cached = cache.get<YearAggregationResult>(cacheKey);
	if (cached) {
		return cached;
	}

	const counts = createYearCountsArray();
	let minYear = Infinity;
	let maxYear = -Infinity;
	let total = 0;

	for (const entry of entries) {
		const isEncore = entry.setName === 'encore' || entry.setName === 'encore2';

		if (isEncore) {
			const year = entry.year;
			const index = yearToIndex(year);

			if (index >= 0 && index < counts.length) {
				counts[index]++;
				total++;

				if (year < minYear) minYear = year;
				if (year > maxYear) maxYear = year;
			}
		}
	}

	const aggregation: YearAggregationResult = {
		counts,
		minYear: minYear === Infinity ? BASE_YEAR : minYear,
		maxYear: maxYear === -Infinity ? BASE_YEAR : maxYear,
		total
	};

	cache.set(cacheKey, aggregation, CacheTTL.AGGREGATION);
	return aggregation;
}

// ==================== WASM-ACCELERATED CORE AGGREGATIONS ====================

/**
 * Result type for song counting operations
 */
export interface SongWithCount {
	songId: number;
	count: number;
}

/**
 * WASM-accelerated aggregateByYear
 * Replaces the function at query-helpers.ts:142
 *
 * Aggregates items by year using TypedArrays for efficiency.
 * Uses WASM when available with automatic JS fallback.
 *
 * @param items - Array of items with year field
 * @returns Array of {year, count} sorted by year descending
 *
 * @example
 * ```typescript
 * const shows = await db.shows.toArray();
 * const yearCounts = await wasmAggregateByYear(shows);
 * // => [{year: 2024, count: 42}, {year: 2023, count: 38}, ...]
 * ```
 */
export async function wasmAggregateByYear<T extends { year: number }>(
	items: T[]
): Promise<YearCount[]> {
	const bridge = getWasmBridge();

	// Check cache first
	const cache = getQueryCache();
	const cacheKey = `aggregations:generic:byYear:${items.length}`;
	const cached = cache.get<YearCount[]>(cacheKey);
	if (cached) {
		return cached;
	}

	// Try WASM if available
	if (bridge) {
		try {
			// Extract just the years for efficient WASM processing
			const years = items.map(item => item.year);
			const result = await bridge.call<string>(
				'aggregate_years' as any,
				JSON.stringify(years)
			);

			if (result.success && result.data) {
				const parsed = JSON.parse(result.data) as YearCount[];
				cache.set(cacheKey, parsed, CacheTTL.AGGREGATION);
				return parsed;
			}
		} catch (error) {
			console.warn('WASM aggregate_years failed, using JS fallback:', error);
		}
	}

	// JS fallback - TypedArray-based counting for performance
	const counts = createYearCountsArray();

	for (const item of items) {
		const index = yearToIndex(item.year);
		if (index >= 0 && index < counts.length) {
			counts[index]++;
		}
	}

	const yearCounts = typedArrayToYearCounts(counts);
	cache.set(cacheKey, yearCounts, CacheTTL.AGGREGATION);
	return yearCounts;
}

/**
 * WASM-accelerated countSongsFromEntries
 * Replaces the function at query-helpers.ts:497
 *
 * Counts songs from setlist entries and returns top N by count.
 * Uses WASM when available with automatic JS fallback.
 *
 * @param entries - Array of setlist entries
 * @param limit - Maximum number of songs to return
 * @returns Array of {songId, count} sorted by count descending
 *
 * @example
 * ```typescript
 * const entries = await db.setlistEntries.toArray();
 * const topSongs = await wasmCountSongsFromEntries(entries, 10);
 * // => [{songId: 42, count: 500}, {songId: 13, count: 450}, ...]
 * ```
 */
export async function wasmCountSongsFromEntries(
	entries: DexieSetlistEntry[],
	limit: number
): Promise<SongWithCount[]> {
	const bridge = getWasmBridge();

	// Check cache first
	const cache = getQueryCache();
	const cacheKey = `aggregations:songs:count:${entries.length}:${limit}`;
	const cached = cache.get<SongWithCount[]>(cacheKey);
	if (cached) {
		return cached;
	}

	// Try WASM if available
	if (bridge) {
		try {
			const result = await bridge.call<string>(
				'count_songs_from_entries' as any,
				JSON.stringify(entries.map(e => e.songId)),
				limit
			);

			if (result.success && result.data) {
				const parsed = JSON.parse(result.data) as SongWithCount[];
				cache.set(cacheKey, parsed, CacheTTL.AGGREGATION);
				return parsed;
			}
		} catch (error) {
			console.warn('WASM count_songs_from_entries failed, using JS fallback:', error);
		}
	}

	// JS fallback - Map-based counting
	const songCounts = new Map<number, number>();

	for (const entry of entries) {
		songCounts.set(entry.songId, (songCounts.get(entry.songId) ?? 0) + 1);
	}

	const result = [...songCounts.entries()]
		.sort((a, b) => b[1] - a[1])
		.slice(0, limit)
		.map(([songId, count]) => ({ songId, count }));

	cache.set(cacheKey, result, CacheTTL.AGGREGATION);
	return result;
}

/**
 * WASM-accelerated aggregateByYearWithUniqueShows
 * Replaces the function at query-helpers.ts:226
 *
 * Aggregates items by year, counting unique shows per year.
 * Uses WASM when available with automatic JS fallback.
 *
 * @param items - Array of items with year and showId fields
 * @returns Array of {year, count} where count is unique shows, sorted by year descending
 *
 * @example
 * ```typescript
 * const appearances = await db.guestAppearances.toArray();
 * const yearCounts = await wasmAggregateByYearWithUniqueShows(appearances);
 * // => [{year: 2024, count: 3}, ...]
 * ```
 */
export async function wasmAggregateByYearWithUniqueShows<
	T extends { year: number; showId: number }
>(items: T[]): Promise<YearCount[]> {
	const bridge = getWasmBridge();

	// Check cache first
	const cache = getQueryCache();
	const cacheKey = `aggregations:uniqueShows:byYear:${items.length}`;
	const cached = cache.get<YearCount[]>(cacheKey);
	if (cached) {
		return cached;
	}

	// Try WASM if available
	if (bridge) {
		try {
			// Extract year and showId pairs for WASM processing
			const pairs = items.map(item => ({ year: item.year, showId: item.showId }));
			const result = await bridge.call<string>(
				'aggregate_unique_shows_by_year' as any,
				JSON.stringify(pairs)
			);

			if (result.success && result.data) {
				const parsed = JSON.parse(result.data) as YearCount[];
				cache.set(cacheKey, parsed, CacheTTL.AGGREGATION);
				return parsed;
			}
		} catch (error) {
			console.warn('WASM aggregate_unique_shows_by_year failed, using JS fallback:', error);
		}
	}

	// JS fallback - Map of Sets aggregation
	const showsByYear = new Map<number, Set<number>>();

	for (const item of items) {
		const shows = showsByYear.get(item.year) ?? new Set();
		shows.add(item.showId);
		showsByYear.set(item.year, shows);
	}

	const yearCounts = Array.from(showsByYear.entries())
		.map(([year, shows]) => ({ year, count: shows.size }))
		.sort((a, b) => b.year - a.year);

	cache.set(cacheKey, yearCounts, CacheTTL.AGGREGATION);
	return yearCounts;
}

// ==================== TYPED ARRAY BATCH AGGREGATIONS ====================

/**
 * TypedArray-based year aggregation result
 * More efficient for large datasets - avoids object creation overhead
 */
export interface TypedYearAggregation {
	/** Years array (Int32Array) */
	years: Int32Array;
	/** Counts array (Uint32Array), parallel to years */
	counts: Uint32Array;
	/** Number of non-zero entries */
	length: number;
	/** Minimum year with data */
	minYear: number;
	/** Maximum year with data */
	maxYear: number;
	/** Total count across all years */
	total: number;
}

/**
 * Batch count songs from entries using TypedArrays
 * More efficient for very large datasets (>50k entries)
 *
 * Returns parallel typed arrays instead of object array for
 * zero-allocation processing in visualization code.
 *
 * @param entries - Array of setlist entries
 * @returns Parallel arrays {songIds, counts} sorted by count descending
 */
export async function batchCountSongsTyped(
	entries: DexieSetlistEntry[]
): Promise<{ songIds: Int32Array; counts: Int32Array }> {
	const bridge = getWasmBridge();

	// Check cache first
	const cache = getQueryCache();
	const cacheKey = `aggregations:songs:batchTyped:${entries.length}`;
	const cached = cache.get<{ songIds: Int32Array; counts: Int32Array }>(cacheKey);
	if (cached) {
		return cached;
	}

	// Try WASM if available
	if (bridge) {
		try {
			const entriesJson = JSON.stringify(
				entries.map((e) => ({
					showId: e.showId,
					songId: e.songId,
					year: e.year
				}))
			);

			const result = await bridge.call<{ songIds: BigInt64Array; counts: Int32Array }>(
				'batchCountSongsTyped',
				entriesJson
			);

			if (result.success && result.data) {
				// Convert BigInt64Array to Int32Array for song IDs
				const songIds = new Int32Array(result.data.songIds.length);
				for (let i = 0; i < result.data.songIds.length; i++) {
					songIds[i] = Number(result.data.songIds[i]);
				}

				const typedResult = {
					songIds,
					counts: result.data.counts
				};

				cache.set(cacheKey, typedResult, CacheTTL.AGGREGATION);
				return typedResult;
			}
		} catch (error) {
			console.warn('WASM batchCountSongsTyped failed, using JS fallback:', error);
		}
	}

	// JS fallback - Map-based counting then convert to typed arrays
	const songCounts = new Map<number, number>();

	for (const entry of entries) {
		songCounts.set(entry.songId, (songCounts.get(entry.songId) ?? 0) + 1);
	}

	// Sort by count descending
	const sorted = [...songCounts.entries()].sort((a, b) => b[1] - a[1]);

	const songIds = new Int32Array(sorted.length);
	const counts = new Int32Array(sorted.length);

	for (let i = 0; i < sorted.length; i++) {
		songIds[i] = sorted[i][0];
		counts[i] = sorted[i][1];
	}

	const result = { songIds, counts };
	cache.set(cacheKey, result, CacheTTL.AGGREGATION);
	return result;
}

/**
 * Batch aggregation of years using TypedArrays
 * Returns compact typed arrays for efficient visualization
 *
 * @param items - Array of items with year field
 * @returns TypedYearAggregation with parallel arrays
 */
export async function batchAggregateYearsTyped<T extends { year: number }>(
	items: T[]
): Promise<TypedYearAggregation> {
	const bridge = getWasmBridge();

	// Check cache first
	const cache = getQueryCache();
	const cacheKey = `aggregations:years:batchTyped:${items.length}`;
	const cached = cache.get<TypedYearAggregation>(cacheKey);
	if (cached) {
		return cached;
	}

	// Try WASM if available
	if (bridge) {
		try {
			const years = items.map(item => item.year);
			const result = await bridge.call<TypedYearAggregation>(
				'batch_aggregate_years_typed' as any,
				JSON.stringify(years)
			);

			if (result.success && result.data) {
				cache.set(cacheKey, result.data, CacheTTL.AGGREGATION);
				return result.data;
			}
		} catch (error) {
			console.warn('WASM batch_aggregate_years_typed failed, using JS fallback:', error);
		}
	}

	// JS fallback - TypedArray counting
	const countArray = createYearCountsArray();
	let minYear = Infinity;
	let maxYear = -Infinity;
	let total = 0;

	for (const item of items) {
		const index = yearToIndex(item.year);
		if (index >= 0 && index < countArray.length) {
			countArray[index]++;
			total++;
			if (item.year < minYear) minYear = item.year;
			if (item.year > maxYear) maxYear = item.year;
		}
	}

	// Extract non-zero entries into compact arrays
	const nonZeroCount = countArray.reduce((sum, c) => sum + (c > 0 ? 1 : 0), 0);
	const years = new Int32Array(nonZeroCount);
	const counts = new Uint32Array(nonZeroCount);

	let idx = 0;
	for (let i = 0; i < countArray.length; i++) {
		if (countArray[i] > 0) {
			years[idx] = indexToYear(i);
			counts[idx] = countArray[i];
			idx++;
		}
	}

	const result: TypedYearAggregation = {
		years,
		counts,
		length: nonZeroCount,
		minYear: minYear === Infinity ? BASE_YEAR : minYear,
		maxYear: maxYear === -Infinity ? BASE_YEAR : maxYear,
		total
	};

	cache.set(cacheKey, result, CacheTTL.AGGREGATION);
	return result;
}

/**
 * Multi-field batch aggregation for complex analytics
 * Aggregates by year, song, and show in a single pass
 *
 * @param entries - Array of setlist entries
 * @returns Combined aggregation results
 */
export async function batchAggregateMultiField(
	entries: DexieSetlistEntry[]
): Promise<{
	byYear: TypedYearAggregation;
	bySong: { songIds: Int32Array; counts: Int32Array };
	uniqueSongsByYear: YearCount[];
}> {
	const bridge = getWasmBridge();

	// Check cache first
	const cache = getQueryCache();
	const cacheKey = `aggregations:multiField:${entries.length}`;
	const cached = cache.get<{
		byYear: TypedYearAggregation;
		bySong: { songIds: Int32Array; counts: Int32Array };
		uniqueSongsByYear: YearCount[];
	}>(cacheKey);
	if (cached) {
		return cached;
	}

	// Try WASM if available - single pass through data
	if (bridge) {
		try {
			const entriesJson = JSON.stringify(
				entries.map((e) => ({
					songId: e.songId,
					showId: e.showId,
					year: e.year
				}))
			);

			const result = await bridge.call<string>(
				'batchAggregateMultiField',
				entriesJson
			);

			if (result.success && result.data) {
				const parsed = JSON.parse(result.data);
				cache.set(cacheKey, parsed, CacheTTL.AGGREGATION);
				return parsed;
			}
		} catch (error) {
			console.warn('WASM batchAggregateMultiField failed, using JS fallback:', error);
		}
	}

	// JS fallback - single pass multi-aggregation
	const yearCounts = createYearCountsArray();
	const songCounts = new Map<number, number>();
	const songsByYear = new Map<number, Set<number>>();
	let minYear = Infinity;
	let maxYear = -Infinity;
	let totalByYear = 0;

	for (const entry of entries) {
		// Year aggregation
		const yearIndex = yearToIndex(entry.year);
		if (yearIndex >= 0 && yearIndex < yearCounts.length) {
			yearCounts[yearIndex]++;
			totalByYear++;
			if (entry.year < minYear) minYear = entry.year;
			if (entry.year > maxYear) maxYear = entry.year;
		}

		// Song counts
		songCounts.set(entry.songId, (songCounts.get(entry.songId) ?? 0) + 1);

		// Unique songs by year
		const songs = songsByYear.get(entry.year) ?? new Set();
		songs.add(entry.songId);
		songsByYear.set(entry.year, songs);
	}

	// Build year aggregation
	const nonZeroYears = yearCounts.reduce((sum, c) => sum + (c > 0 ? 1 : 0), 0);
	const years = new Int32Array(nonZeroYears);
	const counts = new Uint32Array(nonZeroYears);

	let idx = 0;
	for (let i = 0; i < yearCounts.length; i++) {
		if (yearCounts[i] > 0) {
			years[idx] = indexToYear(i);
			counts[idx] = yearCounts[i];
			idx++;
		}
	}

	// Build song counts (sorted by count descending)
	const sortedSongs = [...songCounts.entries()].sort((a, b) => b[1] - a[1]);
	const songIds = new Int32Array(sortedSongs.length);
	const songCountArr = new Int32Array(sortedSongs.length);

	for (let i = 0; i < sortedSongs.length; i++) {
		songIds[i] = sortedSongs[i][0];
		songCountArr[i] = sortedSongs[i][1];
	}

	// Build unique songs by year
	const uniqueSongsByYear: YearCount[] = [...songsByYear.entries()]
		.map(([year, songs]) => ({
			year,
			count: songs.size
		}))
		.sort((a, b) => a.year - b.year);

	const multiFieldResult = {
		byYear: {
			years,
			counts,
			minYear: minYear === Infinity ? BASE_YEAR : minYear,
			maxYear: maxYear === -Infinity ? BASE_YEAR : maxYear,
			total: totalByYear,
			length: nonZeroYears
		},
		bySong: {
			songIds,
			counts: songCountArr
		},
		uniqueSongsByYear
	};

	cache.set(cacheKey, multiFieldResult, CacheTTL.AGGREGATION);
	return multiFieldResult;
}




// ==================== BATCH OPERATIONS ====================

/**
 * Get year breakdowns for multiple songs in a single pass
 * More efficient than calling getSongYearBreakdown repeatedly
 */
export async function batchGetSongYearBreakdowns(
	entries: DexieSetlistEntry[],
	songIds: number[]
): Promise<Map<number, SongYearBreakdown>> {
	const cache = getQueryCache();
	const songIdKey = songIds.slice(0, 10).join(','); // Use subset for cache key
	const cacheKey = `aggregations:songs:batchBreakdown:${entries.length}:${songIdKey}`;
	const cached = cache.get<Array<[number, SongYearBreakdown]>>(cacheKey);
	if (cached) {
		return new Map(cached);
	}

	// Build counts for all songs in single pass
	const songSet = new Set(songIds);
	const songCounts = new Map<number, Uint32Array>();
	const songMeta = new Map<number, { minYear: number; maxYear: number; total: number }>();

	// Initialize for each song
	for (const songId of songIds) {
		songCounts.set(songId, createYearCountsArray());
		songMeta.set(songId, { minYear: Infinity, maxYear: -Infinity, total: 0 });
	}

	// Single pass through all entries
	for (const entry of entries) {
		if (songSet.has(entry.songId)) {
			const counts = songCounts.get(entry.songId)!;
			const meta = songMeta.get(entry.songId)!;

			const year = entry.year;
			const index = yearToIndex(year);

			if (index >= 0 && index < counts.length) {
				counts[index]++;
				meta.total++;

				if (year < meta.minYear) meta.minYear = year;
				if (year > meta.maxYear) meta.maxYear = year;
			}
		}
	}

	// Build results
	const results = new Map<number, SongYearBreakdown>();

	for (const songId of songIds) {
		const counts = songCounts.get(songId)!;
		const meta = songMeta.get(songId)!;
		const yearCounts = typedArrayToYearCounts(counts);

		results.set(songId, {
			songId,
			yearCounts,
			totalPerformances: meta.total,
			firstYear: meta.minYear === Infinity ? 0 : meta.minYear,
			lastYear: meta.maxYear === -Infinity ? 0 : meta.maxYear,
			yearsPlayed: yearCounts.length
		});
	}

	cache.set(cacheKey, Array.from(results.entries()), CacheTTL.AGGREGATION);
	return results;
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Compute aggregation stats from a counts TypedArray
 */
function computeAggregationStats(counts: Uint32Array): YearAggregationResult {
	let minYear = Infinity;
	let maxYear = -Infinity;
	let total = 0;

	for (let i = 0; i < counts.length; i++) {
		if (counts[i] > 0) {
			const year = indexToYear(i);
			total += counts[i];

			if (year < minYear) minYear = year;
			if (year > maxYear) maxYear = year;
		}
	}

	return {
		counts,
		minYear: minYear === Infinity ? BASE_YEAR : minYear,
		maxYear: maxYear === -Infinity ? BASE_YEAR : maxYear,
		total
	};
}

/**
 * Build SongYearBreakdown from YearCount array
 */
function buildSongYearBreakdown(songId: number, yearCounts: YearCount[]): SongYearBreakdown {
	let total = 0;
	let minYear = Infinity;
	let maxYear = -Infinity;

	for (const { year, count } of yearCounts) {
		total += count;
		if (year < minYear) minYear = year;
		if (year > maxYear) maxYear = year;
	}

	return {
		songId,
		yearCounts,
		totalPerformances: total,
		firstYear: minYear === Infinity ? 0 : minYear,
		lastYear: maxYear === -Infinity ? 0 : maxYear,
		yearsPlayed: yearCounts.length
	};
}

/**
 * Transform WASM yearly statistics to ComprehensiveYearStats
 */
function transformWasmYearlyStats(
	wasmStats: Array<{
		year: number;
		show_count: number;
		unique_songs: number;
		average_setlist_length: number;
		most_played_songs: Array<{ song_id: number; count: number }>;
		top_openers: Array<{ song_id: number; count: number }>;
		top_closers: Array<{ song_id: number; count: number }>;
	}>
): ComprehensiveYearStats {
	let totalShows = 0;
	let totalSongs = 0;
	let minYear = Infinity;
	let maxYear = -Infinity;
	let busiestYear = { year: 0, showCount: 0 };
	let quietestYear = { year: 0, showCount: Infinity };

	const uniqueSongsSet = new Set<number>();

	const years: YearStatistics[] = wasmStats.map((ws) => {
		totalShows += ws.show_count;
		const totalSongsYear = ws.show_count * ws.average_setlist_length;
		totalSongs += totalSongsYear;

		if (ws.year < minYear) minYear = ws.year;
		if (ws.year > maxYear) maxYear = ws.year;

		if (ws.show_count > busiestYear.showCount) {
			busiestYear = { year: ws.year, showCount: ws.show_count };
		}
		if (ws.show_count < quietestYear.showCount && ws.show_count > 0) {
			quietestYear = { year: ws.year, showCount: ws.show_count };
		}

		// Track unique songs
		for (const song of ws.most_played_songs) {
			uniqueSongsSet.add(song.song_id);
		}

		// Count slots from top lists
		const openerCount = ws.top_openers.reduce((sum, o) => sum + o.count, 0);
		const closerCount = ws.top_closers.reduce((sum, c) => sum + c.count, 0);

		return {
			year: ws.year,
			showCount: ws.show_count,
			totalSongsPlayed: Math.round(totalSongsYear),
			uniqueSongsPlayed: ws.unique_songs,
			averageSongsPerShow: ws.average_setlist_length,
			openerCount,
			closerCount,
			encoreCount: 0 // Would need separate encore data
		};
	});

	return {
		years,
		yearRange: {
			min: minYear === Infinity ? 0 : minYear,
			max: maxYear === -Infinity ? 0 : maxYear
		},
		totalShows,
		totalSongsPlayed: Math.round(totalSongs),
		totalUniqueSongs: uniqueSongsSet.size,
		averageSongsPerShow: totalShows > 0 ? Math.round((totalSongs / totalShows) * 10) / 10 : 0,
		busiestYear,
		quietestYear: quietestYear.showCount === Infinity ? { year: 0, showCount: 0 } : quietestYear
	};
}

/**
 * Compute comprehensive year statistics using pure JavaScript
 */
function computeComprehensiveYearStats(
	shows: DexieShow[],
	entries: DexieSetlistEntry[]
): ComprehensiveYearStats {
	// Group shows by year
	const showsByYear = new Map<number, DexieShow[]>();
	let minYear = Infinity;
	let maxYear = -Infinity;

	for (const show of shows) {
		const year = show.year || extractYearFast(show.date);
		const existing = showsByYear.get(year);

		if (existing) {
			existing.push(show);
		} else {
			showsByYear.set(year, [show]);
		}

		if (year < minYear) minYear = year;
		if (year > maxYear) maxYear = year;
	}

	// Group entries by year and compute stats
	const entriesByYear = new Map<number, DexieSetlistEntry[]>();
	const uniqueSongsByYear = new Map<number, Set<number>>();
	const openersByYear = new Map<number, number>();
	const closersByYear = new Map<number, number>();
	const encoresByYear = new Map<number, number>();

	for (const entry of entries) {
		const year = entry.year;

		// Group entries
		const existing = entriesByYear.get(year);
		if (existing) {
			existing.push(entry);
		} else {
			entriesByYear.set(year, [entry]);
		}

		// Track unique songs
		const songs = uniqueSongsByYear.get(year);
		if (songs) {
			songs.add(entry.songId);
		} else {
			uniqueSongsByYear.set(year, new Set([entry.songId]));
		}

		// Count slots
		if (entry.slot === 'opener') {
			openersByYear.set(year, (openersByYear.get(year) || 0) + 1);
		} else if (entry.slot === 'closer') {
			const isEncore = entry.setName === 'encore' || entry.setName === 'encore2';
			if (!isEncore) {
				closersByYear.set(year, (closersByYear.get(year) || 0) + 1);
			}
		}

		const isEncore = entry.setName === 'encore' || entry.setName === 'encore2';
		if (isEncore) {
			encoresByYear.set(year, (encoresByYear.get(year) || 0) + 1);
		}
	}

	// Build year statistics
	const years: YearStatistics[] = [];
	let totalShows = 0;
	let totalSongsPlayed = 0;
	const allUniqueSongs = new Set<number>();
	let busiestYear = { year: 0, showCount: 0 };
	let quietestYear = { year: 0, showCount: Infinity };

	for (const [year, yearShows] of showsByYear) {
		const yearEntries = entriesByYear.get(year) || [];
		const uniqueSongs = uniqueSongsByYear.get(year) || new Set();

		const showCount = yearShows.length;
		totalShows += showCount;

		const totalSongs = yearEntries.length;
		totalSongsPlayed += totalSongs;

		// Track all unique songs
		for (const songId of uniqueSongs) {
			allUniqueSongs.add(songId);
		}

		if (showCount > busiestYear.showCount) {
			busiestYear = { year, showCount };
		}
		if (showCount < quietestYear.showCount && showCount > 0) {
			quietestYear = { year, showCount };
		}

		years.push({
			year,
			showCount,
			totalSongsPlayed: totalSongs,
			uniqueSongsPlayed: uniqueSongs.size,
			averageSongsPerShow: showCount > 0 ? Math.round((totalSongs / showCount) * 10) / 10 : 0,
			openerCount: openersByYear.get(year) || 0,
			closerCount: closersByYear.get(year) || 0,
			encoreCount: encoresByYear.get(year) || 0
		});
	}

	// Sort by year descending
	years.sort((a, b) => b.year - a.year);

	return {
		years,
		yearRange: {
			min: minYear === Infinity ? 0 : minYear,
			max: maxYear === -Infinity ? 0 : maxYear
		},
		totalShows,
		totalSongsPlayed,
		totalUniqueSongs: allUniqueSongs.size,
		averageSongsPerShow:
			totalShows > 0 ? Math.round((totalSongsPlayed / totalShows) * 10) / 10 : 0,
		busiestYear,
		quietestYear: quietestYear.showCount === Infinity ? { year: 0, showCount: 0 } : quietestYear
	};
}

// ==================== EXPORTS ====================

export {
	extractYearFast,
	yearToIndex,
	indexToYear,
	BASE_YEAR,
	MAX_YEAR_SPAN
};

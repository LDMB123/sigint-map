/**
 * DMB Almanac - WASM-Accelerated Search Functions
 *
 * High-performance search functions that use WASM when available
 * with automatic JavaScript fallback.
 *
 * Target functions from src/lib/stores/dexie.ts:
 * 1. normalizeSearchText() - String normalization (line 1378)
 * 2. performGlobalSearch() - Complex search with parallel queries (line 1392)
 *
 * WASM modules:
 * - $wasm/dmb-string-utils: String normalization functions
 * - $wasm/dmb-core: Core search and data processing
 */

import { browser } from '$app/environment';
import { getWasmBridge } from './bridge';
import { getQueryCache, CacheTTL } from '$db/dexie/cache';
import type {
	DexieSong,
	DexieVenue,
	DexieTour,
	DexieGuest,
	DexieRelease,
	DexieShow
} from '$db/dexie/schema';

// ==================== TYPES ====================

/**
 * Global search results interface matching the React app
 * (Mirrors GlobalSearchResults from dexie.ts)
 */
export interface GlobalSearchResults {
	shows?: Array<{
		id: number;
		almanacId: string | null;
		showDate: string;
		venue: { name: string; city: string | null; state: string | null } | null;
	}>;
	songs?: Array<{
		id: number;
		title: string;
		slug: string;
		timesPlayed: number;
	}>;
	venues?: Array<{
		id: number;
		name: string;
		slug: string;
		city: string | null;
		state: string | null;
	}>;
	tours?: Array<{
		id: number;
		name: string;
		slug: string;
		year: number;
	}>;
	guests?: Array<{
		id: number;
		name: string;
		slug: string;
		instruments: string[];
	}>;
	albums?: Array<{
		id: number;
		title: string;
		slug: string;
		releaseType: string | null;
	}>;
}

/**
 * Input data structure for optimized global search
 */
export interface SearchableData {
	songs: DexieSong[];
	venues: DexieVenue[];
	tours: DexieTour[];
	guests: DexieGuest[];
	releases: DexieRelease[];
	shows: DexieShow[];
}

/**
 * WASM search result from dmb-core module
 */
interface WasmSearchResultInternal {
	songs: Array<{ id: number; title: string; slug: string; timesPlayed: number; score: number }>;
	venues: Array<{
		id: number;
		name: string;
		city: string | null;
		state: string | null;
		score: number;
	}>;
	tours: Array<{ id: number; name: string; year: number; score: number }>;
	guests: Array<{ id: number; name: string; slug: string; instruments: string[]; score: number }>;
	albums: Array<{
		id: number;
		title: string;
		slug: string;
		releaseType: string | null;
		score: number;
	}>;
	shows: Array<{
		id: number;
		showDate: string;
		venueId: number | null;
		score: number;
	}>;
}

// ==================== FEATURE DETECTION ====================

let wasmStringUtilsAvailable: boolean | null = null;
let wasmCoreAvailable: boolean | null = null;

/**
 * Check if WASM string utilities module is available
 */
async function checkWasmStringUtilsAvailable(): Promise<boolean> {
	if (wasmStringUtilsAvailable !== null) {
		return wasmStringUtilsAvailable;
	}

	if (!browser) {
		wasmStringUtilsAvailable = false;
		return false;
	}

	try {
		const bridge = getWasmBridge();
		await bridge.initialize();

		// Test if the normalize_search_text function exists
		const result = await bridge.call<string>('normalize_search_text' as never, 'test');
		wasmStringUtilsAvailable = result.success;
	} catch {
		wasmStringUtilsAvailable = false;
	}

	return wasmStringUtilsAvailable;
}

/**
 * Check if WASM core search module is available
 */
async function checkWasmCoreAvailable(): Promise<boolean> {
	if (wasmCoreAvailable !== null) {
		return wasmCoreAvailable;
	}

	if (!browser) {
		wasmCoreAvailable = false;
		return false;
	}

	try {
		const bridge = getWasmBridge();
		await bridge.initialize();

		// Test if the global_search function exists
		const result = await bridge.call<string>(
			'global_search' as never,
			'[]',
			'[]',
			'[]',
			'[]',
			'test',
			10
		);
		wasmCoreAvailable = result.success;
	} catch {
		wasmCoreAvailable = false;
	}

	return wasmCoreAvailable;
}

/**
 * Check overall WASM search availability
 */
export async function isWasmSearchAvailable(): Promise<boolean> {
	const [stringUtils, core] = await Promise.all([
		checkWasmStringUtilsAvailable(),
		checkWasmCoreAvailable()
	]);
	return stringUtils || core;
}

/**
 * Reset WASM availability cache (useful for testing)
 */
export function resetWasmSearchAvailability(): void {
	wasmStringUtilsAvailable = null;
	wasmCoreAvailable = null;
}

// ==================== STRING NORMALIZATION ====================

/**
 * JavaScript fallback for text normalization
 * Matches the exact behavior of normalizeSearchText in dexie.ts
 */
function normalizeSearchTextJS(text: string): string {
	return text
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '') // Remove diacritics
		.replace(/[^a-z0-9\s]/g, ' ') // Replace non-alphanumeric with space
		.replace(/\s+/g, ' ') // Collapse multiple spaces
		.trim();
}

/**
 * WASM-accelerated text normalization with JS fallback
 *
 * Normalizes search text for fuzzy matching:
 * - Converts to lowercase
 * - Removes diacritics (NFD normalization)
 * - Replaces non-alphanumeric characters with spaces
 * - Collapses multiple spaces
 * - Trims whitespace
 *
 * @param text - The text to normalize
 * @returns Normalized text string
 */
export async function wasmNormalizeSearchText(text: string): Promise<string> {
	// Early return for empty or very short strings (not worth WASM overhead)
	if (!text || text.length < 3) {
		return normalizeSearchTextJS(text);
	}

	// Try WASM if available
	if (await checkWasmStringUtilsAvailable()) {
		try {
			const bridge = getWasmBridge();
			const result = await bridge.call<string>('normalize_search_text' as never, text);

			if (result.success && result.data !== undefined) {
				return result.data;
			}
		} catch (error) {
			console.warn('[search] WASM normalize_search_text failed, using JS fallback:', error);
		}
	}

	// JavaScript fallback
	return normalizeSearchTextJS(text);
}

/**
 * Synchronous text normalization (JS only)
 * Use when async is not acceptable (e.g., in sort comparators)
 */
export function normalizeSearchTextSync(text: string): string {
	return normalizeSearchTextJS(text);
}

/**
 * Batch normalize multiple strings using WASM
 * More efficient than calling wasmNormalizeSearchText repeatedly
 *
 * @param texts - Array of strings to normalize
 * @returns Array of normalized strings in same order
 */
export async function wasmNormalizeSearchTextBatch(texts: string[]): Promise<string[]> {
	if (texts.length === 0) {
		return [];
	}

	// For small batches, individual calls are fine
	if (texts.length < 10) {
		return Promise.all(texts.map((t) => wasmNormalizeSearchText(t)));
	}

	// Try WASM batch normalization if available
	if (await checkWasmStringUtilsAvailable()) {
		try {
			const bridge = getWasmBridge();
			const result = await bridge.call<string[]>(
				'normalize_search_text_batch' as never,
				JSON.stringify(texts)
			);

			if (result.success && result.data !== undefined) {
				return result.data;
			}
		} catch (error) {
			console.warn('[search] WASM normalize_search_text_batch failed, using JS fallback:', error);
		}
	}

	// JavaScript fallback - process in batch for consistency
	return texts.map(normalizeSearchTextJS);
}

// ==================== OPTIMIZED GLOBAL SEARCH ====================

/**
 * JavaScript fallback for global search
 * Performs search across all entity types with scoring
 */
function globalSearchOptimizedJS(
	data: SearchableData,
	normalizedQuery: string,
	limit: number
): GlobalSearchResults {
	const results: GlobalSearchResults = {};

	// Search songs - use searchText if available, otherwise normalize title
	const matchedSongs = data.songs
		.filter((s) => {
			const searchText = s.searchText || normalizeSearchTextJS(s.title);
			return searchText.includes(normalizedQuery);
		})
		.sort((a, b) => (b.totalPerformances || 0) - (a.totalPerformances || 0))
		.slice(0, limit);

	results.songs = matchedSongs.map((s) => ({
		id: s.id,
		title: s.title,
		slug: s.slug,
		timesPlayed: s.totalPerformances || 0
	}));

	// Search venues - use searchText if available
	const matchedVenues = data.venues
		.filter((v) => {
			const searchText = v.searchText || normalizeSearchTextJS(`${v.name} ${v.city || ''}`);
			return searchText.includes(normalizedQuery);
		})
		.sort((a, b) => (b.totalShows || 0) - (a.totalShows || 0))
		.slice(0, limit);

	results.venues = matchedVenues.map((v) => ({
		id: v.id,
		name: v.name,
		slug: String(v.id),
		city: v.city,
		state: v.state
	}));

	// Search tours
	const matchedTours = data.tours
		.filter((t) => normalizeSearchTextJS(t.name).includes(normalizedQuery))
		.sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''))
		.slice(0, limit);

	results.tours = matchedTours.map((t) => ({
		id: t.id,
		name: t.name,
		slug: String(t.year),
		year: t.year
	}));

	// Search guests - use searchText if available
	const matchedGuests = data.guests
		.filter((g) => {
			const searchText = g.searchText || normalizeSearchTextJS(g.name);
			return searchText.includes(normalizedQuery);
		})
		.sort((a, b) => (b.totalAppearances || 0) - (a.totalAppearances || 0))
		.slice(0, limit);

	results.guests = matchedGuests.map((g) => ({
		id: g.id,
		name: g.name,
		slug: g.slug,
		instruments: g.instruments ?? []
	}));

	// Search releases/albums
	const matchedAlbums = data.releases
		.filter((r) => normalizeSearchTextJS(r.title).includes(normalizedQuery))
		.sort((a, b) => (b.releaseDate || '').localeCompare(a.releaseDate || ''))
		.slice(0, limit);

	results.albums = matchedAlbums.map((r) => ({
		id: r.id,
		title: r.title,
		slug: r.slug,
		releaseType: r.releaseType
	}));

	// Search shows by matching venues
	const venueIds = new Set(matchedVenues.map((v) => v.id));
	if (venueIds.size > 0) {
		const matchedShows = data.shows
			.filter((s) => s.venueId && venueIds.has(s.venueId))
			.sort((a, b) => b.date.localeCompare(a.date))
			.slice(0, limit);

		// Create venue lookup map for O(1) access
		const venueMap = new Map(matchedVenues.map((v) => [v.id, v]));

		results.shows = matchedShows.map((s) => {
			const venue = s.venueId ? venueMap.get(s.venueId) : null;
			return {
				id: s.id,
				almanacId: null,
				showDate: s.date,
				venue: venue ? { name: venue.name, city: venue.city, state: venue.state } : null
			};
		});
	} else {
		results.shows = [];
	}

	return results;
}

/**
 * WASM-accelerated global search with JS fallback
 *
 * Performs comprehensive search across all entity types:
 * - Songs (by title, searchText)
 * - Venues (by name, city, searchText)
 * - Tours (by name)
 * - Guests (by name, searchText)
 * - Releases/Albums (by title)
 * - Shows (by venue match)
 *
 * @param query - The search query string
 * @param data - All searchable data
 * @param limit - Maximum results per category (default: 10)
 * @returns Search results grouped by category
 */
export async function wasmGlobalSearchOptimized(
	query: string,
	data: SearchableData,
	limit: number = 10
): Promise<GlobalSearchResults> {
	// Normalize query first
	const normalizedQuery = await wasmNormalizeSearchText(query);

	// Empty query returns empty results
	if (!normalizedQuery) {
		return {};
	}

	// Check cache
	const cache = getQueryCache();
	const cacheKey = `search:global:optimized:${normalizedQuery}:${limit}`;
	const cached = cache.get<GlobalSearchResults>(cacheKey);
	if (cached) {
		return cached;
	}

	// Try WASM if available
	if (await checkWasmCoreAvailable()) {
		try {
	// Try WASM if available
	if (await checkWasmCoreAvailable()) {
		try {
			const bridge = getWasmBridge();

			// Serialize data for WASM - separate JSON strings for each entity type
			const songsJson = JSON.stringify(
				data.songs.map((s) => ({
					id: s.id,
					title: s.title,
					slug: s.slug,
					searchText: s.searchText,
					totalPerformances: s.totalPerformances || 0
				}))
			);

			const venuesJson = JSON.stringify(
				data.venues.map((v) => ({
					id: v.id,
					name: v.name,
					city: v.city,
					state: v.state,
					searchText: v.searchText,
					totalShows: v.totalShows || 0
				}))
			);

			const guestsJson = JSON.stringify(
				data.guests.map((g) => ({
					id: g.id,
					name: g.name,
					slug: g.slug,
					searchText: g.searchText,
					instruments: g.instruments,
					totalAppearances: g.totalAppearances || 0
				}))
			);

			const toursJson = JSON.stringify(
				data.tours.map((t) => ({
					id: t.id,
					name: t.name,
					year: t.year,
					startDate: t.startDate
				}))
			);

			const result = await bridge.call<string>(
				'global_search',
				songsJson,
				venuesJson,
				guestsJson,
				toursJson,
				normalizedQuery,
				limit
			);

			if (result.success && result.data) {
				const wasmResults = JSON.parse(result.data) as WasmSearchResultInternal;

				// Transform WASM results to GlobalSearchResults format
				const searchResults = transformWasmSearchResults(wasmResults, data.venues);
				cache.set(cacheKey, searchResults, CacheTTL.STATS);
				return searchResults;
			}
		} catch (error) {
			console.warn('[search] WASM global_search failed, using JS fallback:', error);
		}
	}
	// JavaScript fallback
	const results = globalSearchOptimizedJS(data, normalizedQuery, limit);
	cache.set(cacheKey, results, CacheTTL.STATS);
	return results;
}

/**
 * Transform WASM search results to GlobalSearchResults format
 */
function transformWasmSearchResults(
	wasmResults: WasmSearchResultInternal,
	venues: DexieVenue[]
): GlobalSearchResults {
	// Create venue map for show venue lookups
	const venueMap = new Map(venues.map((v) => [v.id, v]));

	return {
		songs: wasmResults.songs.map((s) => ({
			id: s.id,
			title: s.title,
			slug: s.slug,
			timesPlayed: s.timesPlayed
		})),
		venues: wasmResults.venues.map((v) => ({
			id: v.id,
			name: v.name,
			slug: String(v.id),
			city: v.city,
			state: v.state
		})),
		tours: wasmResults.tours.map((t) => ({
			id: t.id,
			name: t.name,
			slug: String(t.year),
			year: t.year
		})),
		guests: wasmResults.guests.map((g) => ({
			id: g.id,
			name: g.name,
			slug: g.slug,
			instruments: g.instruments
		})),
		albums: wasmResults.albums.map((a) => ({
			id: a.id,
			title: a.title,
			slug: a.slug,
			releaseType: a.releaseType
		})),
		shows: wasmResults.shows.map((s) => {
			const venue = s.venueId ? venueMap.get(s.venueId) : null;
			return {
				id: s.id,
				almanacId: null,
				showDate: s.showDate,
				venue: venue ? { name: venue.name, city: venue.city, state: venue.state } : null
			};
		})
	};
}

// ==================== TYPED ARRAY BATCH SEARCH ====================

/**
 * Batch search using TypedArrays for maximum performance
 * Used when searching large datasets with numeric IDs
 *
 * @param ids - Int32Array of entity IDs to search
 * @param searchTexts - Parallel array of pre-normalized search texts
 * @param query - Normalized search query
 * @returns Int32Array of matching indices
 */
export async function wasmBatchSearchTyped(
	ids: Int32Array,
	searchTexts: string[],
	query: string
): Promise<Int32Array> {
	if (ids.length === 0 || ids.length !== searchTexts.length) {
		return new Int32Array(0);
	}

	const normalizedQuery = await wasmNormalizeSearchText(query);
	if (!normalizedQuery) {
		return new Int32Array(0);
	}

	// Try WASM if available
	if (await checkWasmCoreAvailable()) {
		try {
			const bridge = getWasmBridge();
			const result = await bridge.call<Int32Array>(
				'batch_search_typed' as never,
				ids,
				JSON.stringify(searchTexts),
				normalizedQuery
			);

			if (result.success && result.data) {
				return result.data;
			}
		} catch (error) {
			console.warn('[search] WASM batch_search_typed failed, using JS fallback:', error);
		}
	}

	// JavaScript fallback
	const matches: number[] = [];
	for (let i = 0; i < searchTexts.length; i++) {
		if (searchTexts[i].includes(normalizedQuery)) {
			matches.push(i);
		}
	}

	return new Int32Array(matches);
}

// ==================== INCREMENTAL SEARCH ====================

/**
 * Incremental search state for typeahead/autocomplete
 */
interface IncrementalSearchState {
	lastQuery: string;
	lastResults: GlobalSearchResults;
	candidateIds: {
		songs: Set<number>;
		venues: Set<number>;
		tours: Set<number>;
		guests: Set<number>;
		releases: Set<number>;
	};
}

let incrementalState: IncrementalSearchState | null = null;

/**
 * Incremental search optimized for typeahead
 * Reuses previous results when query is extended
 *
 * @param query - Current search query
 * @param data - Searchable data
 * @param limit - Maximum results per category
 * @returns Search results
 */
export async function wasmIncrementalSearch(
	query: string,
	data: SearchableData,
	limit: number = 10
): Promise<GlobalSearchResults> {
	const normalizedQuery = await wasmNormalizeSearchText(query);

	if (!normalizedQuery) {
		incrementalState = null;
		return {};
	}

	// Check if we can use incremental search (query extends previous)
	if (
		incrementalState &&
		normalizedQuery.startsWith(incrementalState.lastQuery) &&
		normalizedQuery.length > incrementalState.lastQuery.length
	) {
		// Filter previous candidates instead of full search
		const results = filterIncrementalResults(
			data,
			incrementalState.candidateIds,
			normalizedQuery,
			limit
		);

		// Update state with narrowed candidates
		incrementalState = {
			lastQuery: normalizedQuery,
			lastResults: results,
			candidateIds: extractCandidateIds(results)
		};

		return results;
	}

	// Full search required
	const results = await wasmGlobalSearchOptimized(query, data, limit * 2);

	// Store state for potential incremental refinement
	incrementalState = {
		lastQuery: normalizedQuery,
		lastResults: results,
		candidateIds: extractCandidateIds(results)
	};

	return limitResults(results, limit);
}

/**
 * Reset incremental search state
 * Call when search input is cleared or component unmounts
 */
export function resetIncrementalSearch(): void {
	incrementalState = null;
}

/**
 * Filter incremental results from previous candidate set
 */
function filterIncrementalResults(
	data: SearchableData,
	candidateIds: IncrementalSearchState['candidateIds'],
	normalizedQuery: string,
	limit: number
): GlobalSearchResults {
	const results: GlobalSearchResults = {};

	// Filter songs from candidates
	const candidateSongs = data.songs.filter((s) => candidateIds.songs.has(s.id));
	const matchedSongs = candidateSongs
		.filter((s) => {
			const searchText = s.searchText || normalizeSearchTextJS(s.title);
			return searchText.includes(normalizedQuery);
		})
		.slice(0, limit);

	results.songs = matchedSongs.map((s) => ({
		id: s.id,
		title: s.title,
		slug: s.slug,
		timesPlayed: s.totalPerformances || 0
	}));

	// Filter venues from candidates
	const candidateVenues = data.venues.filter((v) => candidateIds.venues.has(v.id));
	const matchedVenues = candidateVenues
		.filter((v) => {
			const searchText = v.searchText || normalizeSearchTextJS(`${v.name} ${v.city || ''}`);
			return searchText.includes(normalizedQuery);
		})
		.slice(0, limit);

	results.venues = matchedVenues.map((v) => ({
		id: v.id,
		name: v.name,
		slug: String(v.id),
		city: v.city,
		state: v.state
	}));

	// Filter other entity types similarly
	const candidateTours = data.tours.filter((t) => candidateIds.tours.has(t.id));
	results.tours = candidateTours
		.filter((t) => normalizeSearchTextJS(t.name).includes(normalizedQuery))
		.slice(0, limit)
		.map((t) => ({
			id: t.id,
			name: t.name,
			slug: String(t.year),
			year: t.year
		}));

	const candidateGuests = data.guests.filter((g) => candidateIds.guests.has(g.id));
	results.guests = candidateGuests
		.filter((g) => {
			const searchText = g.searchText || normalizeSearchTextJS(g.name);
			return searchText.includes(normalizedQuery);
		})
		.slice(0, limit)
		.map((g) => ({
			id: g.id,
			name: g.name,
			slug: g.slug,
			instruments: g.instruments ?? []
		}));

	const candidateReleases = data.releases.filter((r) => candidateIds.releases.has(r.id));
	results.albums = candidateReleases
		.filter((r) => normalizeSearchTextJS(r.title).includes(normalizedQuery))
		.slice(0, limit)
		.map((r) => ({
			id: r.id,
			title: r.title,
			slug: r.slug,
			releaseType: r.releaseType
		}));

	// Shows derived from venue matches
	const venueIds = new Set(matchedVenues.map((v) => v.id));
	if (venueIds.size > 0) {
		const venueMap = new Map(matchedVenues.map((v) => [v.id, v]));
		results.shows = data.shows
			.filter((s) => s.venueId && venueIds.has(s.venueId))
			.sort((a, b) => b.date.localeCompare(a.date))
			.slice(0, limit)
			.map((s) => {
				const venue = s.venueId ? venueMap.get(s.venueId) : null;
				return {
					id: s.id,
					almanacId: null,
					showDate: s.date,
					venue: venue ? { name: venue.name, city: venue.city, state: venue.state } : null
				};
			});
	} else {
		results.shows = [];
	}

	return results;
}

/**
 * Extract candidate IDs from search results for incremental filtering
 */
function extractCandidateIds(
	results: GlobalSearchResults
): IncrementalSearchState['candidateIds'] {
	return {
		songs: new Set(results.songs?.map((s) => s.id) ?? []),
		venues: new Set(results.venues?.map((v) => v.id) ?? []),
		tours: new Set(results.tours?.map((t) => t.id) ?? []),
		guests: new Set(results.guests?.map((g) => g.id) ?? []),
		releases: new Set(results.albums?.map((a) => a.id) ?? [])
	};
}

/**
 * Limit results to specified count per category
 */
function limitResults(results: GlobalSearchResults, limit: number): GlobalSearchResults {
	return {
		songs: results.songs?.slice(0, limit),
		venues: results.venues?.slice(0, limit),
		tours: results.tours?.slice(0, limit),
		guests: results.guests?.slice(0, limit),
		albums: results.albums?.slice(0, limit),
		shows: results.shows?.slice(0, limit)
	};
}

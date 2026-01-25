/**
 * Dexie Reactive Stores - Svelte stores for IndexedDB queries
 *
 * Replaces dexie-react-hooks (useLiveQuery) with Svelte's reactive stores
 * Uses Dexie's liveQuery for automatic re-rendering on data changes
 */

import { readable, writable, derived, get } from 'svelte/store';
import { liveQuery, type Observable } from 'dexie';
import Dexie from 'dexie';
import { browser } from '$app/environment';
import type {
	DexieSong,
	DexieVenue,
	DexieShow,
	DexieTour,
	DexieGuest,
	DexieSetlistEntry,
	DexieLiberationEntry,
	UserAttendedShow,
	UserFavoriteSong,
	UserFavoriteVenue
} from '$db/dexie/schema';
import { invalidateUserDataCaches } from '$db/dexie/cache';
import {
	wasmGetTopOpeningSongs,
	wasmGetTopClosingSongs,
	wasmGetTopEncoreSongs,
	wasmGetTopSlotSongsCombined,
	wasmGetShowsByYearSummary,
	wasmGetToursGroupedByDecade,
	wasmGetYearBreakdownForSong
	// SongWithCount and YearCount types available for result typing
} from '$lib/wasm/queries';

// ============================================================
// SSR SAFETY
// ============================================================

/**
 * Safe browser check - prevents SSR errors
 */
const isBrowser = typeof window !== 'undefined' && typeof indexedDB !== 'undefined';

// ============================================================
// SIZE-LIMITED CACHE HELPER
// ============================================================

const CACHE_MAX_SIZE = 150; // Maximum entries per cache (increased for better hit rates)

function createLimitedCache<K, V>(): Map<K, V> {
	const cache = new Map<K, V>();
	const originalSet = cache.set.bind(cache);

	cache.set = function (key: K, value: V): Map<K, V> {
		// If at capacity, delete oldest entry (first in map)
		if (cache.size >= CACHE_MAX_SIZE && !cache.has(key)) {
			const firstKey = cache.keys().next().value;
			if (firstKey !== undefined) {
				cache.delete(firstKey);
			}
		}
		return originalSet(key, value);
	};

	return cache;
}

// Lazy-loaded database reference with initialization lock
let dbModulePromise: Promise<typeof import('$db/dexie/db')> | null = null;
let dbInitPromise: Promise<ReturnType<typeof import('$db/dexie/db').getDb>> | null = null;

/**
 * Get the database instance with proper initialization locking.
 * Prevents race conditions when multiple stores try to initialize simultaneously.
 */
async function getDb() {
	if (!isBrowser) throw new Error('Cannot access database on server');

	// If initialization is already in progress, wait for it
	if (dbInitPromise) {
		return dbInitPromise;
	}

	// Start initialization with lock
	dbInitPromise = (async () => {
		try {
			// Lazy load the module
			if (!dbModulePromise) {
				dbModulePromise = import('$db/dexie/db');
			}
			const { getDb: getDbInstance } = await dbModulePromise;
			const db = getDbInstance();

			// Ensure database is open before returning
			await db.ensureOpen();

			return db;
		} catch (error) {
			// Clear the promise on error so retry is possible
			dbInitPromise = null;
			throw error;
		}
	})();

	return dbInitPromise;
}

// ============================================================
// GENERIC LIVE QUERY STORE FACTORY
// ============================================================

/**
 * Error state for query stores
 */
export interface QueryError {
	message: string;
	code?: string;
	isRecoverable: boolean;
	timestamp: number;
}

/**
 * Create a readable store that subscribes to a Dexie liveQuery
 * Automatically re-renders when underlying data changes.
 * Includes proper error propagation and recovery handling.
 */
function createLiveQueryStore<T>(
	queryFn: () => Promise<T>,
	initialValue: T | undefined = undefined
) {
	return readable<T | undefined>(initialValue, (set) => {
		if (!isBrowser) return;

		let subscription: { unsubscribe: () => void } | null = null;
		let retryCount = 0;
		const MAX_RETRIES = 3;
		const RETRY_DELAY_MS = 1000;

		const setupSubscription = () => {
			// Use liveQuery for reactive updates
			const observable = liveQuery(queryFn);
			subscription = observable.subscribe({
				next: (value) => {
					retryCount = 0; // Reset on success
					set(value);
				},
				error: (err) => {
					const errorObj = err instanceof Error ? err : new Error(String(err));
					const errorCode = (err as { name?: string })?.name || 'UnknownError';

					// Determine if error is recoverable
					const recoverableErrors = ['AbortError', 'TimeoutError', 'TransactionInactiveError'];
					const isRecoverable = recoverableErrors.includes(errorCode);

					console.error('[dexie] liveQuery error:', {
						message: errorObj.message,
						code: errorCode,
						isRecoverable,
						retryCount
					});

					// Dispatch error event with full context
					if (typeof window !== 'undefined') {
						const queryError: QueryError = {
							message: errorObj.message,
							code: errorCode,
							isRecoverable,
							timestamp: Date.now()
						};

						window.dispatchEvent(new CustomEvent('dexie-query-error', {
							detail: { error: queryError, originalError: err }
						}));
					}

					// Auto-retry for recoverable errors
					if (isRecoverable && retryCount < MAX_RETRIES) {
						retryCount++;
						console.debug(`[dexie] Retrying query (attempt ${retryCount}/${MAX_RETRIES})...`);
						setTimeout(() => {
							subscription?.unsubscribe();
							setupSubscription();
						}, RETRY_DELAY_MS * retryCount);
					}
				}
			});
		};

		setupSubscription();

		return () => {
			subscription?.unsubscribe();
		};
	});
}

/**
 * Create a parameterized live query store with caching
 * Error handling is inherited from createLiveQueryStore
 */
function createParameterizedStore<T, P extends string | number>(
	queryFn: (param: P) => Promise<T>,
	cache: Map<P, ReturnType<typeof createLiveQueryStore<T>>>
) {
	return (param: P) => {
		if (!cache.has(param)) {
			cache.set(param, createLiveQueryStore(() => queryFn(param)));
		}
		return cache.get(param)!;
	};
}

// ============================================================
// SONG STORES
// ============================================================

/**
 * @deprecated Use createPaginatedSongsStore() for better performance with large datasets
 * WARNING: Loads ALL songs into memory - only use as SSR fallback
 * RECOMMENDATION: Prefer SSR data fetching in +page.server.ts for full catalog views
 * For client-only routes, use createPaginatedSongsStore() with limit
 */
export const allSongs = createLiveQueryStore<DexieSong[]>(async () => {
	const db = await getDb();
	// PERF: No limit - full dataset needed for catalog view
	// SSR data should be preferred (see /songs/+page.server.ts)
	return db.transaction('r', db.songs, () => db.songs.orderBy('sortTitle').toArray());
});

export const songStats = createLiveQueryStore(async () => {
	const db = await getDb();
	// Use filter instead of where since isCover index was removed in v3 for low selectivity
	const total = await db.songs.count();
	const covers = await db.songs.filter((s) => s.isCover === true).count();
	return { total, originals: total - covers, covers };
});

const songBySlugCache = createLimitedCache<string, ReturnType<typeof createLiveQueryStore<DexieSong | undefined>>>();
export const getSongBySlug = createParameterizedStore<DexieSong | undefined, string>(
	async (slug) => {
		const db = await getDb();
		return db.songs.where('slug').equals(slug).first();
	},
	songBySlugCache
);

const songByIdCache = createLimitedCache<number, ReturnType<typeof createLiveQueryStore<DexieSong | undefined>>>();
export const getSongById = createParameterizedStore<DexieSong | undefined, number>(
	async (id) => {
		const db = await getDb();
		return db.songs.get(id);
	},
	songByIdCache
);

// ============================================================
// VENUE STORES
// ============================================================

export const allVenues = createLiveQueryStore<DexieVenue[]>(async () => {
	const db = await getDb();
	return db.transaction('r', db.venues, () => db.venues.orderBy('name').toArray());
});

export const venueStats = createLiveQueryStore(async () => {
	const db = await getDb();
	const total = await db.venues.count();
	return { total };
});

const venueByIdCache = createLimitedCache<number, ReturnType<typeof createLiveQueryStore<DexieVenue | undefined>>>();
export const getVenueById = createParameterizedStore<DexieVenue | undefined, number>(
	async (id) => {
		const db = await getDb();
		return db.venues.get(id);
	},
	venueByIdCache
);

const venueShowsCache = createLimitedCache<number, ReturnType<typeof createLiveQueryStore<DexieShow[]>>>();
export const getVenueShows = createParameterizedStore<DexieShow[], number>(
	async (venueId) => {
		const db = await getDb();
		// Use compound index [venueId+date] for efficient chronological retrieval
		return db.shows
			.where('[venueId+date]')
			.between([venueId, Dexie.minKey], [venueId, Dexie.maxKey])
			.reverse()
			.toArray();
	},
	venueShowsCache
);

/**
 * Venue song statistics - unique songs and top songs played at a venue
 * OPTIMIZATION: Single transaction fetches shows and setlist entries in parallel phases
 */
export interface VenueSongStats {
	uniqueSongsCount: number;
	topSongs: Array<{
		song: {
			id: number;
			slug: string;
			title: string;
		};
		playCount: number;
	}>;
}

const venueSongStatsCache = createLimitedCache<number, ReturnType<typeof createLiveQueryStore<VenueSongStats>>>();
export const getVenueSongStats = createParameterizedStore<VenueSongStats, number>(
	async (venueId) => {
		const db = await getDb();

		return db.transaction('r', [db.shows, db.setlistEntries, db.songs], async () => {
			// Phase 1: Get all show IDs for this venue
			const shows = await db.shows
				.where('[venueId+date]')
				.between([venueId, Dexie.minKey], [venueId, Dexie.maxKey])
				.toArray();

			if (shows.length === 0) {
				return { uniqueSongsCount: 0, topSongs: [] };
			}

			const showIds = shows.map((s) => s.id);

			// Phase 2: Get all setlist entries for these shows
			const entries = await db.setlistEntries.where('showId').anyOf(showIds).toArray();

			// Count unique songs and their frequencies
			const songCounts = new Map<number, number>();
			for (const entry of entries) {
				songCounts.set(entry.songId, (songCounts.get(entry.songId) ?? 0) + 1);
			}

			const uniqueSongsCount = songCounts.size;

			// Get top 5 songs by play count
			const topSongIds = [...songCounts.entries()]
				.sort((a, b) => b[1] - a[1])
				.slice(0, 5);

			// Fetch song details for top songs
			const songDetails = await db.songs.bulkGet(topSongIds.map(([id]) => id));

			const topSongs = topSongIds
				.map(([songId, count], i) => {
					const song = songDetails[i];
					if (!song) return null;
					return {
						song: {
							id: song.id,
							slug: song.slug,
							title: song.title
						},
						playCount: count
					};
				})
				.filter((item): item is NonNullable<typeof item> => item !== null);

			return { uniqueSongsCount, topSongs };
		});
	},
	venueSongStatsCache
);

// ============================================================
// SHOW STORES
// ============================================================

/**
 * @deprecated Use createPaginatedShowsStore() for better performance with large datasets
 * WARNING: Loads ALL shows into memory - only use as SSR fallback
 * RECOMMENDATION: Prefer SSR data fetching in +page.server.ts for full show lists
 * For client-only routes, use createPaginatedShowsStore() with limit
 */
export const allShows = createLiveQueryStore<DexieShow[]>(async () => {
	const db = await getDb();
	// PERF: No limit - full dataset needed for show list view
	// SSR data should be preferred (see /shows/+page.server.ts)
	return db.transaction('r', db.shows, () => db.shows.orderBy('date').reverse().toArray());
});

export const showStats = createLiveQueryStore(async () => {
	const db = await getDb();
	const total = await db.shows.count();
	return { total };
});

const showByIdCache = createLimitedCache<number, ReturnType<typeof createLiveQueryStore<DexieShow | undefined>>>();
export const getShowById = createParameterizedStore<DexieShow | undefined, number>(
	async (id) => {
		const db = await getDb();
		return db.shows.get(id);
	},
	showByIdCache
);

// Get show with setlist entries joined
// OPTIMIZATION: Parallelized show + setlist fetch using Promise.all
const showWithSetlistCache = createLimitedCache<
	number,
	ReturnType<typeof createLiveQueryStore<(DexieShow & { setlist: DexieSetlistEntry[] }) | undefined>>
>();
export const getShowWithSetlist = createParameterizedStore<
	(DexieShow & { setlist: DexieSetlistEntry[] }) | undefined,
	number
>(async (showId) => {
	const db = await getDb();

	// Parallel fetch: show and setlist entries simultaneously
	const [show, setlist] = await Promise.all([
		db.shows.get(showId),
		db.setlistEntries
			.where('[showId+position]')
			.between([showId, Dexie.minKey], [showId, Dexie.maxKey])
			.toArray()
	]);

	if (!show) return undefined;
	return { ...show, setlist };
}, showWithSetlistCache);

// Get adjacent shows (previous and next by date)
const adjacentShowsCache = createLimitedCache<
	number,
	ReturnType<
		typeof createLiveQueryStore<{ previousShow?: DexieShow; nextShow?: DexieShow } | undefined>
	>
>();
export const getAdjacentShows = createParameterizedStore<
	{ previousShow?: DexieShow; nextShow?: DexieShow } | undefined,
	number
>(async (showId) => {
	const db = await getDb();
	const currentShow = await db.shows.get(showId);
	if (!currentShow) return undefined;

	const [previousShow, nextShow] = await Promise.all([
		db.shows.where('date').below(currentShow.date).reverse().first(),
		db.shows.where('date').above(currentShow.date).first()
	]);

	return { previousShow, nextShow };
}, adjacentShowsCache);

// ============================================================
// TOUR STORES
// ============================================================

export const allTours = createLiveQueryStore<DexieTour[]>(async () => {
	const db = await getDb();
	return db.transaction('r', db.tours, () => db.tours.orderBy('year').reverse().toArray());
});

const tourByYearCache = createLimitedCache<number, ReturnType<typeof createLiveQueryStore<DexieTour | undefined>>>();
export const getTourByYear = createParameterizedStore<DexieTour | undefined, number>(
	async (year) => {
		const db = await getDb();
		return db.tours.where('year').equals(year).first();
	},
	tourByYearCache
);

const tourShowsCache = createLimitedCache<number, ReturnType<typeof createLiveQueryStore<DexieShow[]>>>();
export const getTourShows = createParameterizedStore<DexieShow[], number>(
	async (tourId) => {
		const db = await getDb();
		// Use compound index [tourId+date] for efficient chronological retrieval
		return db.shows
			.where('[tourId+date]')
			.between([tourId, (Dexie as any).minKey], [tourId, (Dexie as any).maxKey])
			.toArray();
	},
	tourShowsCache
);

// ============================================================
// GUEST STORES
// ============================================================

export const allGuests = createLiveQueryStore<DexieGuest[]>(async () => {
	const db = await getDb();
	return db.transaction('r', db.guests, () => db.guests.orderBy('name').toArray());
});

const guestBySlugCache = createLimitedCache<string, ReturnType<typeof createLiveQueryStore<DexieGuest | undefined>>>();
export const getGuestBySlug = createParameterizedStore<DexieGuest | undefined, string>(
	async (slug) => {
		const db = await getDb();
		return db.guests.where('slug').equals(slug).first();
	},
	guestBySlugCache
);

const guestAppearancesCache = createLimitedCache<number, ReturnType<typeof createLiveQueryStore<DexieShow[]>>>();
export const getGuestAppearances = createParameterizedStore<DexieShow[], number>(
	async (guestId) => {
		const db = await getDb();
		// Get all appearances, then fetch unique shows
		const appearances = await db.guestAppearances.where('guestId').equals(guestId).toArray();
		const showIds = [...new Set(appearances.map((a) => a.showId))];

		if (showIds.length === 0) return [];

		const shows = await db.shows.bulkGet(showIds);
		return shows
			.filter((s): s is DexieShow => s !== undefined)
			.sort((a, b) => b.date.localeCompare(a.date));
	},
	guestAppearancesCache
);

// ============================================================
// SETLIST STORES
// ============================================================

const setlistByShowCache = createLimitedCache<number, ReturnType<typeof createLiveQueryStore<DexieSetlistEntry[]>>>();
export const getSetlistByShow = createParameterizedStore<DexieSetlistEntry[], number>(
	async (showId) => {
		const db = await getDb();
		return db.setlistEntries
			.where('[showId+position]')
			.between([showId, Dexie.minKey], [showId, Dexie.maxKey])
			.toArray();
	},
	setlistByShowCache
);

/**
 * Get all shows where a song was played
 */
async function getShowsForSong(songId: number): Promise<DexieShow[]> {
	const db = await getDb();
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
const songRecentShowsCache = createLimitedCache<string, ReturnType<typeof createLiveQueryStore<DexieShow[]>>>();
export const getSongPerformances = createParameterizedStore<DexieShow[], string>(
	async (songIdAndLimit: string) => {
		const [songId, limit] = songIdAndLimit.split(':').map(Number);
		const shows = await getShowsForSong(songId);
		return shows.slice(0, limit || 10);
	},
	songRecentShowsCache
);

/**
 * Get year breakdown for a song (WASM-accelerated)
 */
const songYearBreakdownCache = createLimitedCache<number, ReturnType<typeof createLiveQueryStore<Array<{ year: number; count: number }>>>>();
export const getSongYearBreakdown = createParameterizedStore<Array<{ year: number; count: number }>, number>(
	async (songId) => {
		const db = await getDb();
		const entries = await db.setlistEntries.where('songId').equals(songId).toArray();

		// Use WASM-accelerated year breakdown
		return wasmGetYearBreakdownForSong(entries, songId);
	},
	songYearBreakdownCache
);

// ============================================================
// PARALLEL DETAIL PAGE QUERIES
// ============================================================

/**
 * Song detail data - parallelizes all queries needed for song detail page
 * OPTIMIZATION: Single call fetches song, performances, and year breakdown in parallel
 */
export interface SongDetailData {
	song: DexieSong;
	performances: DexieShow[];
	yearBreakdown: Array<{ year: number; count: number }>;
}

const songDetailCache = createLimitedCache<string, ReturnType<typeof createLiveQueryStore<SongDetailData | undefined>>>();
export const getSongDetailData = createParameterizedStore<SongDetailData | undefined, string>(
	async (slug) => {
		const db = await getDb();

		// First fetch the song to get its ID
		const song = await db.songs.where('slug').equals(slug).first();
		if (!song) return undefined;

		// Parallel fetch: performances and year breakdown
		const [performanceShows, entries] = await Promise.all([
			getShowsForSong(song.id).then((shows) => shows.slice(0, 10)),
			db.setlistEntries.where('songId').equals(song.id).toArray()
		]);

		// WASM-accelerated year breakdown
		const yearBreakdown = await wasmGetYearBreakdownForSong(entries, song.id);

		return {
			song,
			performances: performanceShows,
			yearBreakdown
		};
	},
	songDetailCache
);

/**
 * Venue detail data - parallelizes venue and shows queries
 * OPTIMIZATION: Single call fetches venue and shows in parallel
 */
export interface VenueDetailData {
	venue: DexieVenue;
	shows: DexieShow[];
}

const venueDetailCache = createLimitedCache<number, ReturnType<typeof createLiveQueryStore<VenueDetailData | undefined>>>();
export const getVenueDetailData = createParameterizedStore<VenueDetailData | undefined, number>(
	async (venueId) => {
		const db = await getDb();

		// Parallel fetch: venue and shows simultaneously
		const [venue, shows] = await Promise.all([
			db.venues.get(venueId),
			db.shows
				.where('[venueId+date]')
				.between([venueId, Dexie.minKey], [venueId, Dexie.maxKey])
				.reverse()
				.toArray()
		]);

		if (!venue) return undefined;
		return { venue, shows };
	},
	venueDetailCache
);

/**
 * Show detail data - parallelizes all show detail queries
 * OPTIMIZATION: Single call fetches show, setlist, venue, tour, and adjacent shows
 */
export interface ShowDetailData {
	show: DexieShow;
	setlist: DexieSetlistEntry[];
	venue: DexieVenue | undefined;
	tour: DexieTour | undefined;
	previousShow: DexieShow | undefined;
	nextShow: DexieShow | undefined;
}

const showDetailCache = createLimitedCache<number, ReturnType<typeof createLiveQueryStore<ShowDetailData | undefined>>>();
export const getShowDetailData = createParameterizedStore<ShowDetailData | undefined, number>(
	async (showId) => {
		const db = await getDb();

		// Phase 1: Fetch show and setlist in parallel
		const [show, setlist] = await Promise.all([
			db.shows.get(showId),
			db.setlistEntries
				.where('[showId+position]')
				.between([showId, Dexie.minKey], [showId, Dexie.maxKey])
				.toArray()
		]);

		if (!show) return undefined;

		// Phase 2: Fetch related data in parallel (venue, tour, adjacent shows)
		const [venue, tour, previousShow, nextShow] = await Promise.all([
			show.venueId ? db.venues.get(show.venueId) : Promise.resolve(undefined),
			show.tourId ? db.tours.get(show.tourId) : Promise.resolve(undefined),
			db.shows.where('date').below(show.date).reverse().first(),
			db.shows.where('date').above(show.date).first()
		]);

		return {
			show,
			setlist,
			venue,
			tour,
			previousShow,
			nextShow
		};
	},
	showDetailCache
);

/**
 * Tour detail data - parallelizes tour and shows queries
 * OPTIMIZATION: Fetches tour by year then shows in sequence (shows depend on tour.id)
 */
export interface TourDetailData {
	tour: DexieTour;
	shows: DexieShow[];
}

const tourDetailCache = createLimitedCache<number, ReturnType<typeof createLiveQueryStore<TourDetailData | undefined>>>();
export const getTourDetailData = createParameterizedStore<TourDetailData | undefined, number>(
	async (year) => {
		const db = await getDb();

		// First fetch the tour to get its ID
		const tour = await db.tours.where('year').equals(year).first();
		if (!tour) return undefined;

		// Then fetch shows using the compound index
		const shows = await db.shows
			.where('[tourId+date]')
			.between([tour.id, Dexie.minKey], [tour.id, Dexie.maxKey])
			.toArray();

		return { tour, shows };
	},
	tourDetailCache
);

/**
 * Guest detail data - parallelizes guest and appearances queries
 * OPTIMIZATION: Fetches guest then appearances in sequence (appearances depend on guest.id)
 */
export interface GuestDetailData {
	guest: DexieGuest;
	appearances: DexieShow[];
	yearBreakdown: Array<{ year: number; count: number }>;
}

const guestDetailCache = createLimitedCache<string, ReturnType<typeof createLiveQueryStore<GuestDetailData | undefined>>>();
export const getGuestDetailData = createParameterizedStore<GuestDetailData | undefined, string>(
	async (slug) => {
		const db = await getDb();

		// First fetch the guest to get its ID
		const guest = await db.guests.where('slug').equals(slug).first();
		if (!guest) return undefined;

		// Fetch appearances
		const guestAppearances = await db.guestAppearances.where('guestId').equals(guest.id).toArray();
		const showIds = [...new Set(guestAppearances.map((a) => a.showId))];

		if (showIds.length === 0) {
			return { guest, appearances: [], yearBreakdown: [] };
		}

		const shows = await db.shows.bulkGet(showIds);
		const appearances = shows
			.filter((s): s is DexieShow => s !== undefined)
			.sort((a, b) => b.date.localeCompare(a.date));

		// Calculate year breakdown from appearances
		const yearCounts = new Map<number, number>();
		for (const show of appearances) {
			const year = parseInt(show.date.substring(0, 4), 10);
			yearCounts.set(year, (yearCounts.get(year) || 0) + 1);
		}

		const yearBreakdown = Array.from(yearCounts.entries())
			.map(([year, count]) => ({ year, count }))
			.sort((a, b) => b.year - a.year);

		return { guest, appearances, yearBreakdown };
	},
	guestDetailCache
);

// ============================================================
// LIBERATION LIST
// ============================================================

export const liberationList = createLiveQueryStore<DexieLiberationEntry[]>(async () => {
	const db = await getDb();
	// PERF: Limit to 200 most recent liberation entries to prevent memory issues
	// Liberation list is typically displayed in full, but capped at reasonable size
	return db.liberationList.orderBy('daysSince').reverse().limit(200).toArray();
});

// ============================================================
// USER DATA STORES (with write capabilities)
// ============================================================

/**
 * User attended shows store with CRUD operations
 */
function createUserAttendedShowsStore() {
	const store = writable<UserAttendedShow[]>([]);
	let subscription: { unsubscribe: () => void } | null = null;

	if (isBrowser) {
		// Subscribe to live query with error handling
		getDb()
			.then((db) => {
				subscription = liveQuery(() => db.userAttendedShows.toArray()).subscribe({
					next: (value) => store.set(value),
					error: (err) => console.error('[dexie] userAttendedShows subscription error:', err)
				});
			})
			.catch((err) => console.error('[dexie] Failed to initialize userAttendedShows store:', err));
	}

	return {
		subscribe: store.subscribe,

		async add(showId: number, showDate?: string) {
			const db = await getDb();
			try {
				await db.userAttendedShows.add({
					showId,
					addedAt: Date.now(),
					notes: null,
					rating: null,
					showDate: showDate ?? '',
					venueName: '',
					venueCity: '',
					venueState: null,
					tourName: ''
				});
				// Invalidate caches that may depend on user data
				invalidateUserDataCaches();
			} catch (error) {
				if (error instanceof Dexie.ConstraintError) {
					console.warn('[dexie] Show already marked as attended:', showId);
					return; // Silently ignore duplicate
				}
				throw error;
			}
		},

		async remove(showId: number) {
			const db = await getDb();
			await db.userAttendedShows.where('showId').equals(showId).delete();
			// Invalidate caches that may depend on user data
			invalidateUserDataCaches();
		},

		async toggle(showId: number, showDate?: string): Promise<boolean> {
			const db = await getDb();
			const result = await db.transaction('rw', db.userAttendedShows, async () => {
				const existing = await db.userAttendedShows.where('showId').equals(showId).first();
				if (existing) {
					await db.userAttendedShows.where('showId').equals(showId).delete();
					return false;
				}
				await db.userAttendedShows.add({
					showId,
					addedAt: Date.now(),
					notes: null,
					rating: null,
					showDate: showDate ?? '',
					venueName: '',
					venueCity: '',
					venueState: null,
					tourName: ''
				});
				return true;
			});
			// Invalidate caches that may depend on user data
			invalidateUserDataCaches();
			return result;
		},

		async isAttended(showId: number): Promise<boolean> {
			const db = await getDb();
			const existing = await db.userAttendedShows.where('showId').equals(showId).first();
			return !!existing;
		},

		destroy() {
			subscription?.unsubscribe();
			subscription = null;
		}
	};
}

export const userAttendedShows = createUserAttendedShowsStore();

/**
 * User favorite songs store with CRUD operations
 */
function createUserFavoriteSongsStore() {
	const store = writable<UserFavoriteSong[]>([]);
	let subscription: { unsubscribe: () => void } | null = null;

	if (isBrowser) {
		getDb()
			.then((db) => {
				subscription = liveQuery(() => db.userFavoriteSongs.toArray()).subscribe({
					next: (value) => store.set(value),
					error: (err) => console.error('[dexie] userFavoriteSongs subscription error:', err)
				});
			})
			.catch((err) => console.error('[dexie] Failed to initialize userFavoriteSongs store:', err));
	}

	return {
		subscribe: store.subscribe,

		async add(songId: number, songTitle?: string, songSlug?: string) {
			const db = await getDb();
			try {
				await db.userFavoriteSongs.add({
					songId,
					addedAt: Date.now(),
					songTitle: songTitle ?? '',
					songSlug: songSlug ?? ''
				});
				// Invalidate caches that may depend on user data
				invalidateUserDataCaches();
			} catch (error) {
				if (error instanceof Dexie.ConstraintError) {
					console.warn('[dexie] Song already marked as favorite:', songId);
					return; // Silently ignore duplicate
				}
				throw error;
			}
		},

		async remove(songId: number) {
			const db = await getDb();
			await db.userFavoriteSongs.where('songId').equals(songId).delete();
			// Invalidate caches that may depend on user data
			invalidateUserDataCaches();
		},

		async toggle(songId: number, songTitle?: string, songSlug?: string): Promise<boolean> {
			const db = await getDb();
			const result = await db.transaction('rw', db.userFavoriteSongs, async () => {
				const existing = await db.userFavoriteSongs.where('songId').equals(songId).first();
				if (existing) {
					await db.userFavoriteSongs.where('songId').equals(songId).delete();
					return false;
				}
				await db.userFavoriteSongs.add({
					songId,
					addedAt: Date.now(),
					songTitle: songTitle ?? '',
					songSlug: songSlug ?? ''
				});
				return true;
			});
			// Invalidate caches that may depend on user data
			invalidateUserDataCaches();
			return result;
		},

		async isFavorite(songId: number): Promise<boolean> {
			const db = await getDb();
			const existing = await db.userFavoriteSongs.where('songId').equals(songId).first();
			return !!existing;
		},

		destroy() {
			subscription?.unsubscribe();
			subscription = null;
		}
	};
}

export const userFavoriteSongs = createUserFavoriteSongsStore();

/**
 * User favorite venues store with CRUD operations
 */
function createUserFavoriteVenuesStore() {
	const store = writable<UserFavoriteVenue[]>([]);
	let subscription: { unsubscribe: () => void } | null = null;

	if (isBrowser) {
		getDb()
			.then((db) => {
				subscription = liveQuery(() => db.userFavoriteVenues.toArray()).subscribe({
					next: (value) => store.set(value),
					error: (err) => console.error('[dexie] userFavoriteVenues subscription error:', err)
				});
			})
			.catch((err) => console.error('[dexie] Failed to initialize userFavoriteVenues store:', err));
	}

	return {
		subscribe: store.subscribe,

		async add(venueId: number, venueName?: string) {
			const db = await getDb();
			try {
				await db.userFavoriteVenues.add({
					venueId,
					addedAt: Date.now(),
					venueName: venueName ?? '',
					venueCity: '',
					venueState: null
				});
				// Invalidate caches that may depend on user data
				invalidateUserDataCaches();
			} catch (error) {
				if (error instanceof Dexie.ConstraintError) {
					console.warn('[dexie] Venue already marked as favorite:', venueId);
					return; // Silently ignore duplicate
				}
				throw error;
			}
		},

		async remove(venueId: number) {
			const db = await getDb();
			await db.userFavoriteVenues.where('venueId').equals(venueId).delete();
			// Invalidate caches that may depend on user data
			invalidateUserDataCaches();
		},

		async toggle(venueId: number, venueName?: string): Promise<boolean> {
			const db = await getDb();
			const result = await db.transaction('rw', db.userFavoriteVenues, async () => {
				const existing = await db.userFavoriteVenues.where('venueId').equals(venueId).first();
				if (existing) {
					await db.userFavoriteVenues.where('venueId').equals(venueId).delete();
					return false;
				}
				await db.userFavoriteVenues.add({
					venueId,
					addedAt: Date.now(),
					venueName: venueName ?? '',
					venueCity: '',
					venueState: null
				});
				return true;
			});
			// Invalidate caches that may depend on user data
			invalidateUserDataCaches();
			return result;
		},

		destroy() {
			subscription?.unsubscribe();
			subscription = null;
		}
	};
}

export const userFavoriteVenues = createUserFavoriteVenuesStore();

// ============================================================
// CACHE INVALIDATION
// ============================================================

/**
 * Cache references for invalidation
 * These maps hold parameterized store caches that may need clearing
 */
const allCaches = {
	songBySlug: songBySlugCache,
	songById: songByIdCache,
	venueById: venueByIdCache,
	venueShows: venueShowsCache,
	venueSongStats: venueSongStatsCache,
	showById: showByIdCache,
	showWithSetlist: showWithSetlistCache,
	adjacentShows: adjacentShowsCache,
	tourByYear: tourByYearCache,
	tourShows: tourShowsCache,
	guestBySlug: guestBySlugCache,
	guestAppearances: guestAppearancesCache,
	setlistByShow: setlistByShowCache,
	songRecentShows: songRecentShowsCache,
	songYearBreakdown: songYearBreakdownCache,
	// Detail page parallel query caches
	songDetail: songDetailCache,
	venueDetail: venueDetailCache,
	showDetail: showDetailCache,
	tourDetail: tourDetailCache,
	guestDetail: guestDetailCache
};

/**
 * Clear all parameterized store caches
 * Call this when data integrity may be compromised or after bulk operations
 */
export function clearAllCaches(): void {
	for (const cache of Object.values(allCaches)) {
		cache.clear();
	}
	console.debug('[DexieStores] All caches cleared');
}

/**
 * Clear caches related to songs
 * Call after bulk song updates or when song data may be stale
 */
export function clearSongCaches(): void {
	songBySlugCache.clear();
	songByIdCache.clear();
	songRecentShowsCache.clear();
	songYearBreakdownCache.clear();
	console.debug('[DexieStores] Song caches cleared');
}

/**
 * Clear caches related to shows
 * Call after bulk show updates
 */
export function clearShowCaches(): void {
	showByIdCache.clear();
	showWithSetlistCache.clear();
	adjacentShowsCache.clear();
	setlistByShowCache.clear();
	venueShowsCache.clear();
	tourShowsCache.clear();
	console.debug('[DexieStores] Show caches cleared');
}

/**
 * Clear caches related to venues
 */
export function clearVenueCaches(): void {
	venueByIdCache.clear();
	venueShowsCache.clear();
	venueSongStatsCache.clear();
	console.debug('[DexieStores] Venue caches cleared');
}

/**
 * Clear specific cache entry by key
 */
export function clearCacheEntry<K extends keyof typeof allCaches>(
	cacheName: K,
	key: Parameters<(typeof allCaches)[K]['delete']>[0]
): boolean {
	const cache = allCaches[cacheName];
	return cache.delete(key as never);
}

// ============================================================
// PAGINATED STORES
// ============================================================

/**
 * Create a paginated songs store
 * @param pageSize - Number of items per page (default 50)
 */
export function createPaginatedSongsStore(pageSize = 50) {
	const page = writable(0);
	const hasMore = writable(true);
	const items = writable<DexieSong[]>([]);
	const isLoading = writable(false);

	async function loadPage(pageNum: number) {
		if (!isBrowser) return;
		isLoading.set(true);
		const db = await getDb();
		const offset = pageNum * pageSize;
		const results = await db.songs
			.orderBy('sortTitle')
			.offset(offset)
			.limit(pageSize + 1) // Fetch one extra to check hasMore
			.toArray();

		hasMore.set(results.length > pageSize);
		items.set(results.slice(0, pageSize));
		page.set(pageNum);
		isLoading.set(false);
	}

	async function loadMore() {
		if (!get(hasMore) || get(isLoading)) return;
		const currentPage = get(page);
		const db = await getDb();
		const offset = (currentPage + 1) * pageSize;

		isLoading.set(true);
		const results = await db.songs
			.orderBy('sortTitle')
			.offset(offset)
			.limit(pageSize + 1)
			.toArray();

		hasMore.set(results.length > pageSize);
		items.update((current) => [...current, ...results.slice(0, pageSize)]);
		page.update((p) => p + 1);
		isLoading.set(false);
	}

	// Initialize first page
	if (isBrowser) {
		loadPage(0);
	}

	return {
		items: { subscribe: items.subscribe },
		page: { subscribe: page.subscribe },
		hasMore: { subscribe: hasMore.subscribe },
		isLoading: { subscribe: isLoading.subscribe },
		loadPage,
		loadMore,
		reset: () => loadPage(0)
	};
}

/**
 * Create a paginated shows store
 * @param pageSize - Number of items per page (default 50)
 */
export function createPaginatedShowsStore(pageSize = 50) {
	const page = writable(0);
	const hasMore = writable(true);
	const items = writable<DexieShow[]>([]);
	const isLoading = writable(false);

	async function loadPage(pageNum: number) {
		if (!isBrowser) return;
		isLoading.set(true);
		const db = await getDb();
		const offset = pageNum * pageSize;
		const results = await db.shows
			.orderBy('date')
			.reverse()
			.offset(offset)
			.limit(pageSize + 1)
			.toArray();

		hasMore.set(results.length > pageSize);
		items.set(results.slice(0, pageSize));
		page.set(pageNum);
		isLoading.set(false);
	}

	async function loadMore() {
		if (!get(hasMore) || get(isLoading)) return;
		const currentPage = get(page);
		const db = await getDb();
		const offset = (currentPage + 1) * pageSize;

		isLoading.set(true);
		const results = await db.shows
			.orderBy('date')
			.reverse()
			.offset(offset)
			.limit(pageSize + 1)
			.toArray();

		hasMore.set(results.length > pageSize);
		items.update((current) => [...current, ...results.slice(0, pageSize)]);
		page.update((p) => p + 1);
		isLoading.set(false);
	}

	// Initialize first page
	if (isBrowser) {
		loadPage(0);
	}

	return {
		items: { subscribe: items.subscribe },
		page: { subscribe: page.subscribe },
		hasMore: { subscribe: hasMore.subscribe },
		isLoading: { subscribe: isLoading.subscribe },
		loadPage,
		loadMore,
		reset: () => loadPage(0)
	};
}

// ============================================================
// SEARCH STORES
// ============================================================

/**
 * Create a debounced search store
 */
function createDebouncedSearchStore<T>(
	searchFn: (query: string, limit: number) => Promise<T[]>,
	debounceMs = 300
) {
	const query = writable('');
	const limit = writable(20);
	const results = writable<T[]>([]);
	const isPending = writable(false);

	let timeoutId: ReturnType<typeof setTimeout>;

	if (isBrowser) {
		let currentQuery = '';
		let currentLimit = 20;

		query.subscribe((q) => {
			currentQuery = q;
			isPending.set(true);

			clearTimeout(timeoutId);
			timeoutId = setTimeout(async () => {
				if (currentQuery.trim()) {
					const data = await searchFn(currentQuery, currentLimit);
					results.set(data);
				} else {
					results.set([]);
				}
				isPending.set(false);
			}, debounceMs);
		});

		limit.subscribe((l) => (currentLimit = l));
	}

	return {
		query,
		limit,
		results: { subscribe: results.subscribe },
		isPending: { subscribe: isPending.subscribe },
		setQuery: (q: string) => query.set(q),
		setLimit: (l: number) => limit.set(l),
		destroy() {
			clearTimeout(timeoutId);
		}
	};
}

export const songSearch = createDebouncedSearchStore<DexieSong>(async (q, l) => {
	const db = await getDb();
	return db.songs.where('searchText').startsWithIgnoreCase(q).limit(l).toArray();
});

export const venueSearch = createDebouncedSearchStore<DexieVenue>(async (q, l) => {
	const db = await getDb();
	return db.venues.where('searchText').startsWithIgnoreCase(q).limit(l).toArray();
});

export const guestSearch = createDebouncedSearchStore<DexieGuest>(async (q, l) => {
	const db = await getDb();
	return db.guests.where('searchText').startsWithIgnoreCase(q).limit(l).toArray();
});

// ============================================================
// GLOBAL SEARCH
// ============================================================

/**
 * Global search results interface matching the React app
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
 * Normalize search text for fuzzy matching
 */
function normalizeSearchText(text: string): string {
	return text
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-z0-9\s]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

/**
 * Enhanced global search function
 * PERFORMANCE: Uses single transaction to avoid N+1 pattern and duplicate venue fetching
 */
async function performGlobalSearch(query: string, limit = 10): Promise<GlobalSearchResults> {
	const db = await getDb();
	const normalizedQuery = normalizeSearchText(query);

	// Use single read-only transaction for all queries
	return db.transaction('r', [db.songs, db.venues, db.tours, db.guests, db.releases, db.shows], async () => {
		const results: GlobalSearchResults = {};

		// Parallel queries within transaction for better performance
		try {
			const [songs, matchingVenues, tours, guests, releases] = await Promise.all([
				// Search songs - O(log n) using searchText index
				// searchText contains normalized "title originalArtist"
				db.songs
					.where('searchText')
					.startsWithIgnoreCase(normalizedQuery)
					.limit(limit * 2)
					.toArray(),

				// Search venues - O(log n) using searchText index
				// searchText contains normalized "name city state country"
				db.venues
					.where('searchText')
					.startsWithIgnoreCase(normalizedQuery)
					.limit(limit * 2)
					.toArray(),

				// Search tours - no searchText index, use filter with limit
				// Tours table is small (~50 records), filter is acceptable
				db.tours
					.filter((t) => normalizeSearchText(t.name).includes(normalizedQuery))
					.limit(limit * 2)
					.toArray(),

				// Search guests - O(log n) using searchText index
				// searchText contains normalized "name instruments"
				db.guests
					.where('searchText')
					.startsWithIgnoreCase(normalizedQuery)
					.limit(limit * 2)
					.toArray(),

				// Search albums/releases - no searchText index, use filter with limit
				// Releases table is small (~100 records), filter is acceptable
				db.releases
					.filter((r) => normalizeSearchText(r.title).includes(normalizedQuery))
					.limit(limit * 2)
					.toArray()
			]);

		// Sort and map results - songs
		songs.sort((a, b) => (b.totalPerformances || 0) - (a.totalPerformances || 0));
		results.songs = songs.slice(0, limit).map((s) => ({
			id: s.id,
			title: s.title,
			slug: s.slug,
			timesPlayed: s.totalPerformances
		}));

		// Sort and map results - venues
		matchingVenues.sort((a, b) => (b.totalShows || 0) - (a.totalShows || 0));
		results.venues = matchingVenues.slice(0, limit).map((v) => ({
			id: v.id,
			name: v.name,
			slug: String(v.id), // Venues don't have slugs, use ID
			city: v.city,
			state: v.state
		}));

		// Sort and map results - tours
		tours.sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''));
		results.tours = tours.slice(0, limit).map((t) => ({
			id: t.id,
			name: t.name,
			slug: String(t.year), // Tours don't have slugs, use year
			year: t.year
		}));

		// Sort and map results - guests
		guests.sort((a, b) => (b.totalAppearances || 0) - (a.totalAppearances || 0));
		results.guests = guests.slice(0, limit).map((g) => ({
			id: g.id,
			name: g.name,
			slug: g.slug,
			instruments: g.instruments ?? []
		}));

		// Sort and map results - releases
		releases.sort((a, b) => (b.releaseDate || '').localeCompare(a.releaseDate || ''));
		results.albums = releases.slice(0, limit).map((r) => ({
			id: r.id,
			title: r.title,
			slug: r.slug,
			releaseType: r.releaseType
		}));

			// Search shows by venue name/city (reuse matchingVenues from above - no duplicate query)
			const venueIds = matchingVenues.map((v) => v.id);
			if (venueIds.length > 0) {
				// PERF: Limit show results to prevent memory issues with venues that have many shows
				const shows = await db.shows.where('venueId').anyOf(venueIds).limit(limit * 3).toArray();
				shows.sort((a, b) => b.date.localeCompare(a.date));

				// Use Map for O(1) venue lookups instead of repeated array searches
				const venueMap = new Map(matchingVenues.map((v) => [v.id, v]));
				results.shows = shows.slice(0, limit).map((s) => {
					const venue = s.venueId ? venueMap.get(s.venueId) : null;
					return {
						id: s.id,
						almanacId: null, // Shows don't have almanacId in Dexie schema
						showDate: s.date,
						venue: venue ? { name: venue.name, city: venue.city, state: venue.state } : null
					};
				});
			} else {
				results.shows = [];
			}

			return results;
		} catch (err) {
			console.error('[dexie] globalSearch error:', err);
			// Return empty results on error instead of crashing
			return {};
		}
	});
}

/**
 * Global search store with debouncing
 */
export function createGlobalSearchStore() {
	const query = writable('');
	const results = writable<GlobalSearchResults>({});
	const isSearching = writable(false);

	let timeoutId: ReturnType<typeof setTimeout>;
	let currentSearchId = 0; // Track search requests to handle race conditions
	let isDestroyed = false; // Track if store has been destroyed
	let unsubscribe: (() => void) | null = null;

	if (isBrowser) {
		unsubscribe = query.subscribe((q) => {
			// Don't process new queries if store is destroyed
			if (isDestroyed) return;

			clearTimeout(timeoutId);

			if (q.trim().length < 1) {
				results.set({});
				isSearching.set(false);
				return;
			}

			isSearching.set(true);

			// Increment search ID to track this specific request
			const searchId = ++currentSearchId;

			timeoutId = setTimeout(async () => {
				// Check if destroyed before starting async work
				if (isDestroyed) return;

				try {
					const searchResults = await performGlobalSearch(q.trim(), 10);
					// Only update results if this is still the current search AND not destroyed
					if (searchId === currentSearchId && !isDestroyed) {
						results.set(searchResults);
					}
				} catch (error) {
					// Only log error if this is still the current search AND not destroyed
					if (searchId === currentSearchId && !isDestroyed) {
						console.error('[dexie] Global search error:', error);
						results.set({});
					}
				} finally {
					// Only update searching state if this is still the current search AND not destroyed
					if (searchId === currentSearchId && !isDestroyed) {
						isSearching.set(false);
					}
				}
			}, 300);
		});
	}

	return {
		query,
		results: { subscribe: results.subscribe },
		isSearching: { subscribe: isSearching.subscribe },
		setQuery: (q: string) => query.set(q),
		clear: () => {
			query.set('');
			results.set({});
		},
		destroy() {
			isDestroyed = true;
			clearTimeout(timeoutId);
			// Unsubscribe from query store to prevent memory leaks
			unsubscribe?.();
			// Reset state
			currentSearchId = 0;
		}
	};
}

export const globalSearch = createGlobalSearchStore();

// ============================================================
// STATISTICS STORES
// ============================================================

export const globalStats = createLiveQueryStore(async () => {
	const db = await getDb();
	const [totalSongs, totalShows, totalVenues, totalGuests, tours] = await Promise.all([
		db.songs.count(),
		db.shows.count(),
		db.venues.count(),
		db.guests.count(),
		db.tours.orderBy('year').toArray()
	]);

	// PERF: Use loop instead of Math.min/max(...spread) to avoid stack overflow on large arrays
	let firstYear = Infinity;
	let lastYear = -Infinity;
	for (const t of tours) {
		if (t.year < firstYear) firstYear = t.year;
		if (t.year > lastYear) lastYear = t.year;
	}
	const yearsActive = lastYear - firstYear + 1;

	return {
		totalSongs,
		totalShows,
		totalVenues,
		totalGuests,
		yearsActive,
		firstYear,
		lastYear
	};
});

// Tours grouped by decade (WASM-accelerated)
export const toursGroupedByDecade = createLiveQueryStore(async () => {
	const db = await getDb();
	const tours = await db.tours.orderBy('year').reverse().toArray();

	// Use WASM-accelerated grouping
	const groupedMap = await wasmGetToursGroupedByDecade(tours);

	// Convert Map<number, DexieTour[]> to Record<string, DexieTour[]>
	const grouped: Record<string, DexieTour[]> = {};
	for (const [decade, toursList] of groupedMap.entries()) {
		grouped[`${decade}s`] = toursList;
	}

	return grouped;
});

// ============================================================
// TOP SONGS STORES
// ============================================================

export const topSongsByPerformances = createLiveQueryStore(async () => {
	const db = await getDb();
	return db.songs.orderBy('totalPerformances').reverse().limit(10).toArray();
});

// ============================================================
// COMBINED TOP SLOT SONGS STORE (OPTIMIZED)
// ============================================================
// PERFORMANCE: Reduces 3 IndexedDB WHERE queries to 1 full table scan
// with WASM-accelerated processing. ~66% fewer database operations.

interface TopSlotSongsResult {
	openers: Array<{ song: DexieSong; count: number }>;
	closers: Array<{ song: DexieSong; count: number }>;
	encores: Array<{ song: DexieSong; count: number }>;
}

/**
 * Combined store for all top slot songs (opener, closer, encore)
 * Single query + WASM processing instead of 3 separate queries
 */
export const topSlotSongsCombined = createLiveQueryStore<TopSlotSongsResult>(async () => {
	const db = await getDb();

	// Single query: fetch all setlist entries (WASM will filter by slot)
	// PERF: No limit needed - WASM filtering requires full dataset for accurate counts
	const allEntries = await db.setlistEntries.toArray();

	// Use WASM-accelerated combined counting - processes all slots in single pass
	const topSlotCounts = await wasmGetTopSlotSongsCombined(allEntries, 5);

	// Collect all unique song IDs from all three slot types
	const allSongIds = new Set<number>();
	topSlotCounts.topOpeners.forEach((sc) => allSongIds.add(sc.songId));
	topSlotCounts.topClosers.forEach((sc) => allSongIds.add(sc.songId));
	topSlotCounts.topEncores.forEach((sc) => allSongIds.add(sc.songId));

	// Single bulkGet for all songs (instead of 3 separate bulkGets)
	const songIdArray = Array.from(allSongIds);
	const songs = await db.songs.bulkGet(songIdArray);

	// Build song lookup map
	const songMap = new Map<number, DexieSong>();
	songIdArray.forEach((id, index) => {
		const song = songs[index];
		if (song) songMap.set(id, song);
	});

	// Helper to convert SongWithCount to {song, count}
	const toSongWithCount = (counts: Array<{ songId: number; count: number }>) =>
		counts
			.map((sc) => {
				const song = songMap.get(sc.songId);
				return song ? { song, count: sc.count } : null;
			})
			.filter((item): item is { song: DexieSong; count: number } => item !== null);

	return {
		openers: toSongWithCount(topSlotCounts.topOpeners),
		closers: toSongWithCount(topSlotCounts.topClosers),
		encores: toSongWithCount(topSlotCounts.topEncores),
	};
});

// ============================================================
// BACKWARD-COMPATIBLE DERIVED STORES
// ============================================================
// These derived stores provide the same interface as the old individual stores
// but derive their data from the combined store for efficiency

/**
 * Top opening songs - derived from combined store for backward compatibility
 */
export const topOpeningSongs = derived(topSlotSongsCombined, ($combined) =>
	$combined?.openers ?? []
);

/**
 * Top closing songs - derived from combined store for backward compatibility
 */
export const topClosingSongs = derived(topSlotSongsCombined, ($combined) =>
	$combined?.closers ?? []
);

/**
 * Top encore songs - derived from combined store for backward compatibility
 */
export const topEncoreSongs = derived(topSlotSongsCombined, ($combined) =>
	$combined?.encores ?? []
);

export const topVenuesByShows = createLiveQueryStore(async () => {
	const db = await getDb();
	// Use the existing totalShows field on venues instead of counting shows
	const venues = await db.venues.orderBy('totalShows').reverse().limit(5).toArray();
	return venues.map((venue) => ({ venue, showCount: venue.totalShows }));
});

// WASM-accelerated shows by year summary
export const showsByYearSummary = createLiveQueryStore(async () => {
	const db = await getDb();
	const shows = await db.shows.limit(5000).toArray();

	// Use WASM-accelerated aggregation
	return wasmGetShowsByYearSummary(shows);
});

// ============================================================
// DATA FRESHNESS MONITORING
// ============================================================

export interface DataFreshnessStatus {
	lastSyncTime: number | null;
	isSyncStale: boolean;
	timeSinceSync: number | null;
	syncStatus: 'idle' | 'syncing' | 'error';
	lastError: string | null;
}

/**
 * Data freshness store
 * Tracks when data was last synced and if it's stale (>24 hours)
 */
export const dataFreshness = createLiveQueryStore<DataFreshnessStatus>(async () => {
	const db = await getDb();
	const syncMeta = await db.getSyncMeta();

	if (!syncMeta) {
		return {
			lastSyncTime: null,
			isSyncStale: true,
			timeSinceSync: null,
			syncStatus: 'idle',
			lastError: null
		};
	}

	const lastSyncTime = syncMeta.lastFullSync ?? syncMeta.lastIncrementalSync ?? null;
	const now = Date.now();
	const timeSinceSync = lastSyncTime ? now - lastSyncTime : null;
	const isSyncStale = timeSinceSync !== null && timeSinceSync > 24 * 60 * 60 * 1000; // >24 hours

	return {
		lastSyncTime,
		isSyncStale,
		timeSinceSync,
		syncStatus: syncMeta.syncStatus,
		lastError: syncMeta.lastError
	};
});

// ============================================================
// DATABASE HEALTH MONITORING
// ============================================================

export interface DatabaseHealthStatus {
	isOpen: boolean;
	hasFailed: boolean;
	version: number;
	name: string;
	lastCheck: number;
	storageUsage?: number;
	storageQuota?: number;
	percentUsed?: number;
	isPersisted?: boolean;
}

/**
 * Database health monitoring store
 * Updates every 30 seconds while subscribed
 */
function createDatabaseHealthStore() {
	const store = writable<DatabaseHealthStatus>({
		isOpen: false,
		hasFailed: false,
		version: 0,
		name: '',
		lastCheck: 0,
	});

	let intervalId: ReturnType<typeof setInterval> | null = null;

	async function checkHealth(): Promise<DatabaseHealthStatus> {
		if (!isBrowser) {
			return { isOpen: false, hasFailed: false, version: 0, name: '', lastCheck: Date.now() };
		}

		try {
			const db = await getDb();
			const connectionState = db.getConnectionState();

			// Get storage info
			let storageInfo: { usage: number; quota: number; percentUsed: number } | undefined;
			let isPersisted: boolean | undefined;

			if (navigator.storage?.estimate) {
				const estimate = await navigator.storage.estimate();
				storageInfo = {
					usage: estimate.usage ?? 0,
					quota: estimate.quota ?? 0,
					percentUsed: estimate.quota ? ((estimate.usage ?? 0) / estimate.quota) * 100 : 0,
				};
			}

			if (navigator.storage?.persisted) {
				isPersisted = await navigator.storage.persisted();
			}

			return {
				...connectionState,
				lastCheck: Date.now(),
				storageUsage: storageInfo?.usage,
				storageQuota: storageInfo?.quota,
				percentUsed: storageInfo?.percentUsed,
				isPersisted,
			};
		} catch (error) {
			console.error('[DexieHealth] Health check failed:', error);
			return {
				isOpen: false,
				hasFailed: true,
				version: 0,
				name: 'dmb-almanac',
				lastCheck: Date.now(),
			};
		}
	}

	return {
		subscribe: store.subscribe,

		async refresh(): Promise<void> {
			const health = await checkHealth();
			store.set(health);
		},

		startMonitoring(intervalMs: number = 30000): void {
			if (intervalId) return;

			// Initial check
			this.refresh();

			// Periodic checks
			intervalId = setInterval(() => {
				this.refresh();
			}, intervalMs);
		},

		stopMonitoring(): void {
			if (intervalId) {
				clearInterval(intervalId);
				intervalId = null;
			}
		},

		destroy(): void {
			this.stopMonitoring();
		},
	};
}

export const databaseHealth = createDatabaseHealthStore();

/**
 * Derived store for storage warning threshold (> 80% used)
 */
export const storageWarning = derived(
	databaseHealth,
	($health) => ($health.percentUsed ?? 0) > 80
);

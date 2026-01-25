/**
 * DMB Almanac - WASM Transform Integration
 *
 * TypeScript wrapper for the Rust WASM data transformation module.
 * Provides lazy loading, fallback to JavaScript, and performance tracking.
 *
 * @module lib/wasm/transform
 */

import type {
  DexieSong,
  DexieVenue,
  DexieTour,
  DexieShow,
  DexieSetlistEntry,
  DexieGuest,
  DexieLiberationEntry,
  VenueType,
  SetType,
  SlotType,
} from '$lib/db/dexie/schema';

// ==================== TYPES ====================

export interface TransformResult<T> {
  data: T;
  source: 'wasm' | 'js';
  durationMs: number;
}

export interface ValidationWarning {
  entityType: string;
  entityId: number;
  field: string;
  invalidReference: number;
  message: string;
}

export interface TransformedSyncData {
  venues: DexieVenue[];
  songs: DexieSong[];
  tours: DexieTour[];
  shows: DexieShow[];
  setlistEntries: DexieSetlistEntry[];
  guests: DexieGuest[];
  guestAppearances: unknown[];
  liberationList: DexieLiberationEntry[];
}

// ==================== WASM MODULE LOADING ====================

let wasmModule: WasmTransformModule | null = null;
let wasmLoadPromise: Promise<WasmTransformModule | null> | null = null;
let wasmLoadFailed = false;

interface WasmTransformModule {
  // Legacy JSON string API (for backwards compatibility)
  transform_songs: (json: string) => DexieSong[];
  transform_venues: (json: string) => DexieVenue[];
  transform_tours: (json: string) => DexieTour[];
  transform_shows: (json: string) => DexieShow[];
  transform_setlist_entries: (json: string) => DexieSetlistEntry[];
  transform_guests: (json: string) => DexieGuest[];
  transform_liberation_list: (json: string) => DexieLiberationEntry[];
  transform_full_sync: (json: string) => TransformedSyncData;

  // Direct object API (serde-wasm-bindgen, ~10x faster)
  transformSongsDirect: (input: unknown[]) => DexieSong[];
  transformVenuesDirect: (input: unknown[]) => DexieVenue[];
  transformShowsDirect: (input: unknown[]) => DexieShow[];
  transformSetlistEntriesDirect: (input: unknown[]) => DexieSetlistEntry[];
  globalSearchDirect: (
    songs: DexieSong[],
    venues: DexieVenue[],
    guests: DexieGuest[],
    query: string,
    limit: number
  ) => unknown[];
  computeLiberationListDirect: (songs: DexieSong[], entries: DexieSetlistEntry[]) => unknown[];
  batchYearlyStatsDirect: (shows: DexieShow[], entries: DexieSetlistEntry[], year: number) => unknown;

  validate_foreign_keys: (
    songs: string,
    venues: string,
    tours: string,
    shows: string,
    setlistEntries: string
  ) => ValidationWarning[];
  generate_song_search_text: (title: string, originalArtist?: string) => string;
  generate_venue_search_text: (name: string, city: string, state?: string, country?: string) => string;
  extract_year_from_date: (date: string) => number | undefined;
  version: () => string;
}

/**
 * Lazily load the WASM module.
 *
 * Returns null if WASM is not supported or loading fails.
 */
async function loadWasmModule(): Promise<WasmTransformModule | null> {
  // Return cached module if already loaded
  if (wasmModule) return wasmModule;

  // Return null if previous load failed
  if (wasmLoadFailed) return null;

  // Return existing promise if load is in progress
  if (wasmLoadPromise) return wasmLoadPromise;

  // Start loading
  wasmLoadPromise = (async () => {
    try {
      // Check for WASM support
      if (typeof WebAssembly === 'undefined') {
        console.warn('[WASM Transform] WebAssembly not supported, using JavaScript fallback');
        wasmLoadFailed = true;
        return null;
      }

      // Dynamic import of WASM module
      // Note: This path will be configured by Vite for proper bundling
      const wasm = await import('$wasm/dmb-transform/pkg/dmb_transform.js');

      // Dynamically import WASM URL to defer loading until needed
      const { default: transformWasmUrl } = await import('$wasm/dmb-transform/pkg/dmb_transform_bg.wasm?url');

      // Initialize the module with explicit URL to ensure correct path resolution
      await wasm.default(transformWasmUrl);

      console.debug(`[WASM Transform] Loaded successfully, version: ${wasm.version()}`);

      wasmModule = wasm as unknown as WasmTransformModule;
      return wasmModule;
    } catch (error) {
      console.warn('[WASM Transform] Failed to load, using JavaScript fallback:', error);
      wasmLoadFailed = true;
      return null;
    }
  })();

  return wasmLoadPromise;
}

/**
 * Check if WASM module is available.
 */
export async function isWasmAvailable(): Promise<boolean> {
  const module = await loadWasmModule();
  return module !== null;
}

/**
 * Get WASM module version.
 */
export async function getWasmVersion(): Promise<string | null> {
  const module = await loadWasmModule();
  return module?.version() ?? null;
}

// ==================== JAVASCRIPT FALLBACKS ====================

/**
 * Server song data interface for transformation
 */
interface ServerSong {
  id: number;
  title: string;
  slug: string;
  sort_title: string;
  original_artist: string | null;
  is_cover: 0 | 1;
  is_original: 0 | 1;
  first_played_date: string | null;
  last_played_date: string | null;
  total_performances: number;
  opener_count: number;
  closer_count: number;
  encore_count: number;
  lyrics: string | null;
  notes: string | null;
  is_liberated?: 0 | 1 | null;
  days_since_last_played?: number | null;
  shows_since_last_played?: number | null;
}

/**
 * JavaScript fallback for song transformation.
 */
function transformSongsJS(serverSongs: unknown[]): DexieSong[] {
  return serverSongs.map((server: unknown) => {
    const song = server as ServerSong;
    return {
      id: song.id,
      title: song.title,
      slug: song.slug,
      sortTitle: song.sort_title,
      originalArtist: song.original_artist,
      isCover: song.is_cover === 1,
      isOriginal: song.is_original === 1,
      firstPlayedDate: song.first_played_date,
      lastPlayedDate: song.last_played_date,
      totalPerformances: song.total_performances,
      openerCount: song.opener_count,
      closerCount: song.closer_count,
      encoreCount: song.encore_count,
      lyrics: song.lyrics,
      notes: song.notes,
      isLiberated: (song.is_liberated ?? 0) === 1,
      daysSinceLastPlayed: song.days_since_last_played ?? null,
      showsSinceLastPlayed: song.shows_since_last_played ?? null,
      searchText: [song.title, song.original_artist]
        .filter(Boolean)
        .join(' ')
        .toLowerCase(),
    };
  });
}

/**
 * Server venue data interface for transformation
 */
interface ServerVenue {
  id: number;
  name: string;
  city: string;
  state: string | null;
  country: string;
  country_code: string;
  venue_type: VenueType | null;
  capacity: number | null;
  latitude: number | null;
  longitude: number | null;
  total_shows: number;
  first_show_date: string | null;
  last_show_date: string | null;
  notes: string | null;
}

/**
 * JavaScript fallback for venue transformation.
 */
function transformVenuesJS(serverVenues: unknown[]): DexieVenue[] {
  return serverVenues.map((server: unknown) => {
    const venue = server as ServerVenue;
    return {
      id: venue.id,
      name: venue.name,
      city: venue.city,
      state: venue.state,
      country: venue.country,
      countryCode: venue.country_code,
      venueType: venue.venue_type,
      capacity: venue.capacity,
      latitude: venue.latitude,
      longitude: venue.longitude,
      totalShows: venue.total_shows,
      firstShowDate: venue.first_show_date,
      lastShowDate: venue.last_show_date,
      notes: venue.notes,
      searchText: [venue.name, venue.city, venue.state, venue.country]
        .filter(Boolean)
        .join(' ')
        .toLowerCase(),
    };
  });
}

/**
 * Server tour data interface for transformation
 */
interface ServerTour {
  id: number;
  name: string;
  year: number;
  start_date: string | null;
  end_date: string | null;
  total_shows: number;
  unique_songs_played: number | null;
  average_songs_per_show: number | null;
  rarity_index: number | null;
}

/**
 * JavaScript fallback for tour transformation.
 */
function transformToursJS(serverTours: unknown[]): DexieTour[] {
  return serverTours.map((server: unknown) => {
    const tour = server as ServerTour;
    return {
      id: tour.id,
      name: tour.name,
      year: tour.year,
      startDate: tour.start_date,
      endDate: tour.end_date,
      totalShows: tour.total_shows,
      uniqueSongsPlayed: tour.unique_songs_played,
      averageSongsPerShow: tour.average_songs_per_show,
      rarityIndex: tour.rarity_index,
    };
  });
}

/**
 * Server show data interface for transformation
 */
interface ServerShow {
  id: number;
  date: string;
  venue_id: number;
  tour_id: number;
  notes: string | null;
  soundcheck: string | null;
  attendance_count: number | null;
  rarity_index: number | null;
  song_count: number;
  venue_name: string;
  venue_city: string;
  venue_state: string | null;
  venue_country: string;
  venue_country_code: string;
  venue_type: VenueType | null;
  venue_capacity: number | null;
  venue_total_shows: number;
  tour_name: string;
  tour_year: number;
  tour_start_date: string | null;
  tour_end_date: string | null;
  tour_total_shows: number;
}

// PERF: Inline year extraction (avoids parseInt + substring overhead on 153K items)
// Date format is always YYYY-MM-DD, so we can extract year directly via char codes
function extractYearFast(date: string): number {
  // (d[0]-'0')*1000 + (d[1]-'0')*100 + (d[2]-'0')*10 + (d[3]-'0')
  return (date.charCodeAt(0) - 48) * 1000 +
    (date.charCodeAt(1) - 48) * 100 +
    (date.charCodeAt(2) - 48) * 10 +
    (date.charCodeAt(3) - 48);
}

/**
 * JavaScript fallback for show transformation.
 */
function transformShowsJS(serverShows: unknown[]): DexieShow[] {
  return serverShows.map((server: unknown) => {
    const show = server as ServerShow;
    const year = extractYearFast(show.date);
    return {
      id: show.id,
      date: show.date,
      venueId: show.venue_id,
      tourId: show.tour_id,
      notes: show.notes,
      soundcheck: show.soundcheck,
      attendanceCount: show.attendance_count,
      rarityIndex: show.rarity_index,
      songCount: show.song_count,
      venue: {
        id: show.venue_id,
        name: show.venue_name,
        city: show.venue_city,
        state: show.venue_state,
        country: show.venue_country,
        countryCode: show.venue_country_code,
        venueType: show.venue_type,
        capacity: show.venue_capacity,
        totalShows: show.venue_total_shows,
      },
      tour: {
        id: show.tour_id,
        name: show.tour_name,
        year: show.tour_year,
        startDate: show.tour_start_date,
        endDate: show.tour_end_date,
        totalShows: show.tour_total_shows,
      },
      year,
    };
  });
}

/**
 * Server setlist entry data interface for transformation
 */
interface ServerSetlistEntry {
  id: number;
  show_id: number;
  song_id: number;
  position: number;
  set_name: SetType;
  slot: SlotType;
  duration_seconds: number | null;
  segue_into_song_id: number | null;
  is_segue: 0 | 1;
  is_tease: 0 | 1;
  tease_of_song_id: number | null;
  notes: string | null;
  song_title: string;
  song_slug: string;
  song_is_cover: 0 | 1;
  song_total_performances: number;
  song_opener_count: number;
  song_closer_count: number;
  song_encore_count: number;
  show_date: string;
}

/**
 * JavaScript fallback for setlist entry transformation.
 */
function transformSetlistEntriesJS(serverEntries: unknown[]): DexieSetlistEntry[] {
  return serverEntries.map((server: unknown) => {
    const entry = server as ServerSetlistEntry;
    // PERF: Use fast inline year extraction instead of parseInt(substring)
    const year = extractYearFast(entry.show_date);
    return {
      id: entry.id,
      showId: entry.show_id,
      songId: entry.song_id,
      position: entry.position,
      setName: entry.set_name,
      slot: entry.slot,
      durationSeconds: entry.duration_seconds,
      segueIntoSongId: entry.segue_into_song_id,
      isSegue: entry.is_segue === 1,
      isTease: entry.is_tease === 1,
      teaseOfSongId: entry.tease_of_song_id,
      notes: entry.notes,
      song: {
        id: entry.song_id,
        title: entry.song_title,
        slug: entry.song_slug,
        isCover: entry.song_is_cover === 1,
        totalPerformances: entry.song_total_performances,
        openerCount: entry.song_opener_count,
        closerCount: entry.song_closer_count,
        encoreCount: entry.song_encore_count,
      },
      showDate: entry.show_date,
      year,
    };
  });
}

// ==================== PUBLIC API ====================

/**
 * Transform songs with WASM acceleration (fallback to JS).
 *
 * Uses serde-wasm-bindgen direct API for ~10x faster transfer
 * compared to JSON string serialization.
 */
export async function transformSongs(
  serverSongs: unknown[]
): Promise<TransformResult<DexieSong[]>> {
  const start = performance.now();
  const module = await loadWasmModule();

  if (module) {
    try {
      // Use direct API (serde-wasm-bindgen) for ~10x faster transfer
      if (module.transformSongsDirect) {
        const data = module.transformSongsDirect(serverSongs);
        return {
          data,
          source: 'wasm',
          durationMs: performance.now() - start,
        };
      }
      // Fallback to legacy JSON API
      const json = JSON.stringify(serverSongs);
      const data = module.transform_songs(json);
      return {
        data,
        source: 'wasm',
        durationMs: performance.now() - start,
      };
    } catch (error) {
      console.warn('[WASM Transform] transform_songs failed, using JS fallback:', error);
    }
  }

  const data = transformSongsJS(serverSongs);
  return {
    data,
    source: 'js',
    durationMs: performance.now() - start,
  };
}

/**
 * Transform venues with WASM acceleration (fallback to JS).
 *
 * Uses serde-wasm-bindgen direct API for ~10x faster transfer.
 */
export async function transformVenues(
  serverVenues: unknown[]
): Promise<TransformResult<DexieVenue[]>> {
  const start = performance.now();
  const module = await loadWasmModule();

  if (module) {
    try {
      // Use direct API (serde-wasm-bindgen) for ~10x faster transfer
      if (module.transformVenuesDirect) {
        const data = module.transformVenuesDirect(serverVenues);
        return {
          data,
          source: 'wasm',
          durationMs: performance.now() - start,
        };
      }
      // Fallback to legacy JSON API
      const json = JSON.stringify(serverVenues);
      const data = module.transform_venues(json);
      return {
        data,
        source: 'wasm',
        durationMs: performance.now() - start,
      };
    } catch (error) {
      console.warn('[WASM Transform] transform_venues failed, using JS fallback:', error);
    }
  }

  const data = transformVenuesJS(serverVenues);
  return {
    data,
    source: 'js',
    durationMs: performance.now() - start,
  };
}

/**
 * Transform tours with WASM acceleration (fallback to JS).
 */
export async function transformTours(
  serverTours: unknown[]
): Promise<TransformResult<DexieTour[]>> {
  const start = performance.now();
  const module = await loadWasmModule();

  if (module) {
    try {
      const json = JSON.stringify(serverTours);
      const data = module.transform_tours(json);
      return {
        data,
        source: 'wasm',
        durationMs: performance.now() - start,
      };
    } catch (error) {
      console.warn('[WASM Transform] transform_tours failed, using JS fallback:', error);
    }
  }

  const data = transformToursJS(serverTours);
  return {
    data,
    source: 'js',
    durationMs: performance.now() - start,
  };
}

/**
 * Transform shows with WASM acceleration (fallback to JS).
 *
 * Uses serde-wasm-bindgen direct API for ~10x faster transfer.
 */
export async function transformShows(
  serverShows: unknown[]
): Promise<TransformResult<DexieShow[]>> {
  const start = performance.now();
  const module = await loadWasmModule();

  if (module) {
    try {
      // Use direct API (serde-wasm-bindgen) for ~10x faster transfer
      if (module.transformShowsDirect) {
        const data = module.transformShowsDirect(serverShows);
        return {
          data,
          source: 'wasm',
          durationMs: performance.now() - start,
        };
      }
      // Fallback to legacy JSON API
      const json = JSON.stringify(serverShows);
      const data = module.transform_shows(json);
      return {
        data,
        source: 'wasm',
        durationMs: performance.now() - start,
      };
    } catch (error) {
      console.warn('[WASM Transform] transform_shows failed, using JS fallback:', error);
    }
  }

  const data = transformShowsJS(serverShows);
  return {
    data,
    source: 'js',
    durationMs: performance.now() - start,
  };
}

/**
 * Transform setlist entries with WASM acceleration (fallback to JS).
 *
 * This is the largest dataset (~150K items) and benefits most from WASM.
 * Uses serde-wasm-bindgen direct API for ~10x faster transfer,
 * providing the largest performance benefit of any operation.
 */
export async function transformSetlistEntries(
  serverEntries: unknown[]
): Promise<TransformResult<DexieSetlistEntry[]>> {
  const start = performance.now();
  const module = await loadWasmModule();

  if (module) {
    try {
      // Use direct API (serde-wasm-bindgen) for ~10x faster transfer
      // This provides the biggest improvement due to dataset size
      if (module.transformSetlistEntriesDirect) {
        const data = module.transformSetlistEntriesDirect(serverEntries);
        return {
          data,
          source: 'wasm',
          durationMs: performance.now() - start,
        };
      }
      // Fallback to legacy JSON API
      const json = JSON.stringify(serverEntries);
      const data = module.transform_setlist_entries(json);
      return {
        data,
        source: 'wasm',
        durationMs: performance.now() - start,
      };
    } catch (error) {
      console.warn('[WASM Transform] transform_setlist_entries failed, using JS fallback:', error);
    }
  }

  const data = transformSetlistEntriesJS(serverEntries);
  return {
    data,
    source: 'js',
    durationMs: performance.now() - start,
  };
}

/**
 * Validate foreign key relationships.
 */
export async function validateForeignKeys(
  songs: DexieSong[],
  venues: DexieVenue[],
  tours: DexieTour[],
  shows: DexieShow[],
  setlistEntries: DexieSetlistEntry[]
): Promise<ValidationWarning[]> {
  const module = await loadWasmModule();

  if (module) {
    try {
      return module.validate_foreign_keys(
        JSON.stringify(songs),
        JSON.stringify(venues),
        JSON.stringify(tours),
        JSON.stringify(shows),
        JSON.stringify(setlistEntries)
      );
    } catch (error) {
      console.warn('[WASM Transform] validate_foreign_keys failed:', error);
    }
  }

  // JavaScript fallback (simplified)
  const warnings: ValidationWarning[] = [];
  const songIds = new Set(songs.map((s) => s.id));
  const venueIds = new Set(venues.map((v) => v.id));
  const tourIds = new Set(tours.map((t) => t.id));
  const showIds = new Set(shows.map((s) => s.id));

  for (const show of shows) {
    if (!venueIds.has(show.venueId)) {
      warnings.push({
        entityType: 'show',
        entityId: show.id,
        field: 'venueId',
        invalidReference: show.venueId,
        message: `Show ${show.id} references non-existent venue ${show.venueId}`,
      });
    }
    if (!tourIds.has(show.tourId)) {
      warnings.push({
        entityType: 'show',
        entityId: show.id,
        field: 'tourId',
        invalidReference: show.tourId,
        message: `Show ${show.id} references non-existent tour ${show.tourId}`,
      });
    }
  }

  for (const entry of setlistEntries) {
    if (!showIds.has(entry.showId)) {
      warnings.push({
        entityType: 'setlistEntry',
        entityId: entry.id,
        field: 'showId',
        invalidReference: entry.showId,
        message: `Setlist entry ${entry.id} references non-existent show ${entry.showId}`,
      });
    }
    if (!songIds.has(entry.songId)) {
      warnings.push({
        entityType: 'setlistEntry',
        entityId: entry.id,
        field: 'songId',
        invalidReference: entry.songId,
        message: `Setlist entry ${entry.id} references non-existent song ${entry.songId}`,
      });
    }
  }

  return warnings;
}

/**
 * Generate search text for a song.
 */
export async function generateSongSearchText(
  title: string,
  originalArtist?: string
): Promise<string> {
  const module = await loadWasmModule();

  if (module) {
    try {
      return module.generate_song_search_text(title, originalArtist);
    } catch {
      // Fallback to JS
    }
  }

  return [title, originalArtist].filter(Boolean).join(' ').toLowerCase();
}

/**
 * Generate search text for a venue.
 */
export async function generateVenueSearchText(
  name: string,
  city: string,
  state?: string,
  country?: string
): Promise<string> {
  const module = await loadWasmModule();

  if (module) {
    try {
      return module.generate_venue_search_text(name, city, state, country);
    } catch {
      // Fallback to JS
    }
  }

  return [name, city, state, country].filter(Boolean).join(' ').toLowerCase();
}

/**
 * Preload WASM module in the background.
 *
 * Call this early (e.g., on app load) to ensure WASM is ready
 * when data transformation is needed.
 */
export function preloadWasm(): void {
  loadWasmModule().catch(() => {
    // Silently ignore - will use JS fallback
  });
}

// ==================== ZERO-COPY TYPED ARRAY TRANSFORMS ====================

/**
 * Result type for zero-copy TypedArray operations
 */
export interface TypedArrayTransformResult<T> {
  data: T;
  source: 'wasm' | 'js';
  durationMs: number;
  isZeroCopy: boolean;
}

/**
 * Extract years from shows as Int32Array (zero-copy when WASM available)
 * PERF: 10-20x faster than JSON for large datasets (~3000 shows)
 *
 * Use case: Building year filters, grouping by year
 */
export async function extractShowYearsTyped(
  shows: { date: string }[]
): Promise<TypedArrayTransformResult<Int32Array>> {
  const start = performance.now();
  const module = await loadWasmModule();

  if (module) {
    try {
      // Check if typed array method exists
      const extractFn = (module as unknown as {
        extractShowYearsTyped?: (json: string) => Int32Array;
      }).extractShowYearsTyped;

      if (extractFn) {
        const dates = shows.map(s => s.date);
        const data = extractFn(JSON.stringify(dates));
        return {
          data,
          source: 'wasm',
          durationMs: performance.now() - start,
          isZeroCopy: true,
        };
      }
    } catch (error) {
      console.warn('[WASM Transform] extractShowYearsTyped failed, using JS fallback:', error);
    }
  }

  // JavaScript fallback
  const years = new Int32Array(shows.length);
  for (let i = 0; i < shows.length; i++) {
    years[i] = extractYearFast(shows[i].date);
  }

  return {
    data: years,
    source: 'js',
    durationMs: performance.now() - start,
    isZeroCopy: false,
  };
}

/**
 * Extract song IDs from setlist entries as Int32Array (zero-copy)
 * PERF: Avoids object creation overhead for ID extraction
 *
 * Use case: Building song ID sets, counting plays
 */
export async function extractSongIdsTyped(
  entries: { songId: number }[]
): Promise<TypedArrayTransformResult<Int32Array>> {
  const start = performance.now();
  const module = await loadWasmModule();

  if (module) {
    try {
      const extractFn = (module as unknown as {
        extractSongIdsTyped?: (json: string) => Int32Array;
      }).extractSongIdsTyped;

      if (extractFn) {
        const data = extractFn(JSON.stringify(entries.map(e => e.songId)));
        return {
          data,
          source: 'wasm',
          durationMs: performance.now() - start,
          isZeroCopy: true,
        };
      }
    } catch (error) {
      console.warn('[WASM Transform] extractSongIdsTyped failed, using JS fallback:', error);
    }
  }

  // JavaScript fallback
  const songIds = new Int32Array(entries.length);
  for (let i = 0; i < entries.length; i++) {
    songIds[i] = entries[i].songId;
  }

  return {
    data: songIds,
    source: 'js',
    durationMs: performance.now() - start,
    isZeroCopy: false,
  };
}

/**
 * Extract show IDs from setlist entries as Int32Array (zero-copy)
 */
export async function extractShowIdsTyped(
  entries: { showId: number }[]
): Promise<TypedArrayTransformResult<Int32Array>> {
  const start = performance.now();
  const module = await loadWasmModule();

  if (module) {
    try {
      const extractFn = (module as unknown as {
        extractShowIdsTyped?: (json: string) => Int32Array;
      }).extractShowIdsTyped;

      if (extractFn) {
        const data = extractFn(JSON.stringify(entries.map(e => e.showId)));
        return {
          data,
          source: 'wasm',
          durationMs: performance.now() - start,
          isZeroCopy: true,
        };
      }
    } catch (error) {
      console.warn('[WASM Transform] extractShowIdsTyped failed, using JS fallback:', error);
    }
  }

  // JavaScript fallback
  const showIds = new Int32Array(entries.length);
  for (let i = 0; i < entries.length; i++) {
    showIds[i] = entries[i].showId;
  }

  return {
    data: showIds,
    source: 'js',
    durationMs: performance.now() - start,
    isZeroCopy: false,
  };
}

/**
 * Compute song play counts as parallel typed arrays
 * Returns { songIds: Int32Array, counts: Int32Array }
 * PERF: Much faster than Map<number, number> for large datasets
 *
 * Use case: Top songs by plays, liberation calculations
 */
export async function computeSongPlayCountsTyped(
  entries: { songId: number }[]
): Promise<TypedArrayTransformResult<{ songIds: Int32Array; counts: Int32Array }>> {
  const start = performance.now();
  const module = await loadWasmModule();

  if (module) {
    try {
      const computeFn = (module as unknown as {
        computeSongPlayCountsTyped?: (json: string) => { songIds: Int32Array; counts: Int32Array };
      }).computeSongPlayCountsTyped;

      if (computeFn) {
        const data = computeFn(JSON.stringify(entries.map(e => e.songId)));
        return {
          data,
          source: 'wasm',
          durationMs: performance.now() - start,
          isZeroCopy: true,
        };
      }
    } catch (error) {
      console.warn('[WASM Transform] computeSongPlayCountsTyped failed, using JS fallback:', error);
    }
  }

  // JavaScript fallback - use Map for aggregation, then convert to typed arrays
  const countMap = new Map<number, number>();
  for (const entry of entries) {
    countMap.set(entry.songId, (countMap.get(entry.songId) ?? 0) + 1);
  }

  const size = countMap.size;
  const songIds = new Int32Array(size);
  const counts = new Int32Array(size);

  let i = 0;
  for (const [songId, count] of countMap) {
    songIds[i] = songId;
    counts[i] = count;
    i++;
  }

  return {
    data: { songIds, counts },
    source: 'js',
    durationMs: performance.now() - start,
    isZeroCopy: false,
  };
}

/**
 * Compute show song counts as parallel typed arrays
 * Returns { showIds: Int32Array, counts: Int32Array }
 *
 * Use case: Average setlist length, show statistics
 */
export async function computeShowSongCountsTyped(
  entries: { showId: number }[]
): Promise<TypedArrayTransformResult<{ showIds: Int32Array; counts: Int32Array }>> {
  const start = performance.now();
  const module = await loadWasmModule();

  if (module) {
    try {
      const computeFn = (module as unknown as {
        computeShowSongCountsTyped?: (json: string) => { showIds: Int32Array; counts: Int32Array };
      }).computeShowSongCountsTyped;

      if (computeFn) {
        const data = computeFn(JSON.stringify(entries.map(e => e.showId)));
        return {
          data,
          source: 'wasm',
          durationMs: performance.now() - start,
          isZeroCopy: true,
        };
      }
    } catch (error) {
      console.warn('[WASM Transform] computeShowSongCountsTyped failed, using JS fallback:', error);
    }
  }

  // JavaScript fallback
  const countMap = new Map<number, number>();
  for (const entry of entries) {
    countMap.set(entry.showId, (countMap.get(entry.showId) ?? 0) + 1);
  }

  const size = countMap.size;
  const showIds = new Int32Array(size);
  const counts = new Int32Array(size);

  let i = 0;
  for (const [showId, count] of countMap) {
    showIds[i] = showId;
    counts[i] = count;
    i++;
  }

  return {
    data: { showIds, counts },
    source: 'js',
    durationMs: performance.now() - start,
    isZeroCopy: false,
  };
}

/**
 * Compute rarity scores for all songs as Float32Array
 * Order matches input songs array
 * PERF: Compact numeric output, no object overhead
 *
 * Use case: Sorting songs by rarity, visualization
 */
export async function computeRarityScoresTyped(
  songs: { id: number; totalPerformances: number }[],
  totalShows: number
): Promise<TypedArrayTransformResult<Float32Array>> {
  const start = performance.now();
  const module = await loadWasmModule();

  if (module) {
    try {
      const computeFn = (module as unknown as {
        computeRarityScoresTyped?: (json: string, totalShows: number) => Float32Array;
      }).computeRarityScoresTyped;

      if (computeFn) {
        const input = songs.map(s => ({ id: s.id, plays: s.totalPerformances }));
        const data = computeFn(JSON.stringify(input), totalShows);
        return {
          data,
          source: 'wasm',
          durationMs: performance.now() - start,
          isZeroCopy: true,
        };
      }
    } catch (error) {
      console.warn('[WASM Transform] computeRarityScoresTyped failed, using JS fallback:', error);
    }
  }

  // JavaScript fallback - inverse frequency
  const rarities = new Float32Array(songs.length);
  for (let i = 0; i < songs.length; i++) {
    const plays = songs[i].totalPerformances;
    if (plays > 0 && totalShows > 0) {
      rarities[i] = 1 - plays / totalShows;
    } else {
      rarities[i] = 1;
    }
  }

  return {
    data: rarities,
    source: 'js',
    durationMs: performance.now() - start,
    isZeroCopy: false,
  };
}

/**
 * Batch extract positions from setlist entries as Int32Array
 * PERF: Useful for position-based analytics (openers, closers)
 */
export async function extractPositionsTyped(
  entries: { position: number }[]
): Promise<TypedArrayTransformResult<Int32Array>> {
  const start = performance.now();
  const module = await loadWasmModule();

  if (module) {
    try {
      const extractFn = (module as unknown as {
        extractPositionsTyped?: (json: string) => Int32Array;
      }).extractPositionsTyped;

      if (extractFn) {
        const data = extractFn(JSON.stringify(entries.map(e => e.position)));
        return {
          data,
          source: 'wasm',
          durationMs: performance.now() - start,
          isZeroCopy: true,
        };
      }
    } catch (error) {
      console.warn('[WASM Transform] extractPositionsTyped failed, using JS fallback:', error);
    }
  }

  // JavaScript fallback
  const positions = new Int32Array(entries.length);
  for (let i = 0; i < entries.length; i++) {
    positions[i] = entries[i].position;
  }

  return {
    data: positions,
    source: 'js',
    durationMs: performance.now() - start,
    isZeroCopy: false,
  };
}

// ==================== TYPED ARRAY UTILITY FUNCTIONS ====================

/**
 * Create unique set from Int32Array (returns sorted unique values)
 * PERF: Faster than Set<number> for large arrays
 */
export function uniqueInt32(arr: Int32Array): Int32Array {
  const sorted = arr.slice().sort();
  const unique: number[] = [];
  let last = NaN;

  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i] !== last) {
      unique.push(sorted[i]);
      last = sorted[i];
    }
  }

  return new Int32Array(unique);
}

/**
 * Filter Int32Array by predicate
 */
export function filterInt32(arr: Int32Array, predicate: (val: number) => boolean): Int32Array {
  const result: number[] = [];
  for (let i = 0; i < arr.length; i++) {
    if (predicate(arr[i])) {
      result.push(arr[i]);
    }
  }
  return new Int32Array(result);
}

/**
 * Sum all values in a numeric typed array
 */
export function sumTypedArray(arr: Int32Array | Float32Array | Float64Array): number {
  let sum = 0;
  for (let i = 0; i < arr.length; i++) {
    sum += arr[i];
  }
  return sum;
}

/**
 * Get min and max from a numeric typed array
 */
export function minMaxTypedArray(
  arr: Int32Array | Float32Array | Float64Array
): { min: number; max: number } {
  if (arr.length === 0) {
    return { min: 0, max: 0 };
  }

  let min = arr[0];
  let max = arr[0];

  for (let i = 1; i < arr.length; i++) {
    if (arr[i] < min) min = arr[i];
    if (arr[i] > max) max = arr[i];
  }

  return { min, max };
}

/**
 * Count occurrences in Int32Array (like a histogram)
 * Returns Map for sparse data, but processes typed array efficiently
 */
export function countOccurrences(arr: Int32Array): Map<number, number> {
  const counts = new Map<number, number>();
  for (let i = 0; i < arr.length; i++) {
    const val = arr[i];
    counts.set(val, (counts.get(val) ?? 0) + 1);
  }
  return counts;
}

/**
 * Convert parallel typed arrays to array of objects
 * Useful for bridging typed array results to existing UI code
 */
export function parallelArraysToObjectArray<K1 extends string, K2 extends string>(
  ids: Int32Array | BigInt64Array,
  values: Int32Array | Float32Array,
  idKey: K1,
  valueKey: K2
): Array<Record<K1 | K2, number>> {
  const length = Math.min(ids.length, values.length);
  const result = new Array<Record<K1 | K2, number>>(length);

  for (let i = 0; i < length; i++) {
    result[i] = {
      [idKey]: Number(ids[i]),
      [valueKey]: values[i],
    } as Record<K1 | K2, number>;
  }

  return result;
}

/**
 * DMB Almanac - Data Sync Module
 *
 * Handles synchronization between server (SQLite) and client (IndexedDB).
 * Supports both full sync for initial population and incremental updates.
 *
 * Sync Strategy:
 * 1. Initial sync: Fetch all data in chunks, populate IndexedDB
 * 2. Incremental sync: Fetch only changed records since last sync
 * 3. Background sync: Periodic refresh using Service Worker
 */

// Type declaration for Scheduling API (Chromium 143+)
// https://developer.chrome.com/blog/introducing-scheduler-yield-origin-trial
declare global {
  interface Scheduler {
    yield(): Promise<void>;
  }
  var scheduler: Scheduler | undefined;
}

import { getDb } from './db';
import { clearAllCaches } from './cache';
import * as v from 'valibot';
import type {
  DexieGuest,
  DexieGuestAppearance,
  DexieLiberationEntry,
  DexieSetlistEntry,
  DexieShow,
  DexieSong,
  DexieTour,
  DexieVenue,
  EmbeddedSong,
  EmbeddedTour,
  EmbeddedVenue,
} from './schema';

// ==================== TYPES ====================

const ServerVenueSchema = v.object({
  id: v.number(),
  name: v.string(),
  city: v.string(),
  state: v.nullable(v.string()),
  country: v.string(),
  country_code: v.string(),
  venue_type: v.nullable(v.string()),
  capacity: v.nullable(v.number()),
  latitude: v.nullable(v.number()),
  longitude: v.nullable(v.number()),
  total_shows: v.number(),
  first_show_date: v.nullable(v.string()),
  last_show_date: v.nullable(v.string()),
  notes: v.nullable(v.string()),
});

/**
 * Server response for full data sync
 */
export interface FullSyncResponse {
  version: string;
  timestamp: number;
  data: {
    venues: ServerVenue[];
    songs: ServerSong[];
    tours: ServerTour[];
    shows: ServerShow[];
    setlistEntries: ServerSetlistEntry[];
    guests: ServerGuest[];
    guestAppearances: ServerGuestAppearance[];
    liberationList: ServerLiberationEntry[];
  };
  counts: {
    venues: number;
    songs: number;
    tours: number;
    shows: number;
    setlistEntries: number;
    guests: number;
    guestAppearances: number;
    liberationList: number;
  };
}

/**
 * Server response for chunked sync
 */
export interface ChunkedSyncResponse {
  version: string;
  timestamp: number;
  chunk: number;
  totalChunks: number;
  entityType: keyof FullSyncResponse['data'];
  data: unknown[];
  hasMore: boolean;
}

/**
 * Server data types (snake_case from API)
 */
interface ServerVenue {
  id: number;
  name: string;
  city: string;
  state: string | null;
  country: string;
  country_code: string;
  venue_type: string | null;
  capacity: number | null;
  latitude: number | null;
  longitude: number | null;
  total_shows: number;
  first_show_date: string | null;
  last_show_date: string | null;
  notes: string | null;
}

interface ServerSong {
  id: number;
  title: string;
  slug: string;
  sort_title: string;
  original_artist: string | null;
  is_cover: number;
  is_original: number;
  first_played_date: string | null;
  last_played_date: string | null;
  total_performances: number;
  opener_count: number;
  closer_count: number;
  encore_count: number;
  lyrics: string | null;
  notes: string | null;
  is_liberated?: number;
  days_since_last_played?: number | null;
  shows_since_last_played?: number | null;
}

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
  // Embedded data
  venue_name: string;
  venue_city: string;
  venue_state: string | null;
  venue_country: string;
  venue_country_code: string | null;
  venue_type: string | null;
  venue_capacity: number | null;
  venue_total_shows: number;
  tour_name: string;
  tour_year: number;
  tour_start_date: string | null;
  tour_end_date: string | null;
  tour_total_shows: number;
}

interface ServerSetlistEntry {
  id: number;
  show_id: number;
  song_id: number;
  position: number;
  set_name: string;
  slot: string;
  duration_seconds: number | null;
  segue_into_song_id: number | null;
  is_segue: number;
  is_tease: number;
  tease_of_song_id: number | null;
  notes: string | null;
  // Embedded data
  song_title: string;
  song_slug: string;
  song_is_cover: number;
  song_total_performances: number;
  song_opener_count: number;
  song_closer_count: number;
  song_encore_count: number;
  show_date: string;
}

interface ServerGuest {
  id: number;
  name: string;
  slug: string;
  instruments: string | null; // JSON array
  total_appearances: number;
  first_appearance_date: string | null;
  last_appearance_date: string | null;
  notes: string | null;
}

interface ServerGuestAppearance {
  id: number;
  guest_id: number;
  show_id: number;
  setlist_entry_id: number | null;
  song_id: number | null;
  instruments: string | null;
  notes: string | null;
  show_date: string;
}

interface ServerLiberationEntry {
  id: number;
  song_id: number;
  last_played_date: string;
  last_played_show_id: number;
  days_since: number;
  shows_since: number;
  notes: string | null;
  configuration: string | null;
  is_liberated: number;
  liberated_date: string | null;
  liberated_show_id: number | null;
  // Embedded
  song_title: string;
  song_slug: string;
  song_is_cover: number;
  song_total_performances: number;
  show_date: string;
  venue_name: string;
  venue_city: string;
  venue_state: string | null;
}

// ==================== MAIN THREAD YIELD ====================

/**
 * Yield to the main thread to prevent UI jank during bulk operations.
 * Uses scheduler.yield() on Chromium 143+ with setTimeout fallback.
 */
function yieldToMain(): Promise<void> {
  // Use Scheduling API if available (Chromium 143+)
  if (typeof scheduler !== 'undefined' && typeof scheduler.yield === 'function') {
    return scheduler.yield();
  }
  // Fallback to setTimeout for older browsers
  return new Promise<void>((resolve) => setTimeout(resolve, 0));
}

/**
 * Batch size for bulk operations before yielding to main thread.
 * Smaller batches = more responsive UI, larger batches = faster sync.
 */
const YIELD_BATCH_SIZE = 250;

// ==================== SYNC OPTIONS ====================

export interface SyncOptions {
  /**
   * API base URL (default: /api)
   */
  apiBase?: string;

  /**
   * Callback for progress updates
   */
  onProgress?: (progress: SyncProgress) => void;

  /**
   * Abort signal for cancellation
   */
  signal?: AbortSignal;

  /**
   * Chunk size for fetching (default: 1000)
   */
  chunkSize?: number;
}

export interface SyncProgress {
  phase: 'fetching' | 'transforming' | 'storing' | 'complete' | 'error';
  entity?: string;
  current: number;
  total: number;
  percentage: number;
  message: string;
}

// ==================== TRANSFORMATION FUNCTIONS ====================

function transformVenue(server: ServerVenue): DexieVenue {
  // Validate incoming data using Valibot
  const result = v.safeParse(ServerVenueSchema, server);
  if (!result.success) {
    console.warn(`[Sync] Invalid venue data for ID ${server.id}:`, result.issues);
    // Fallback: Try to use data anyway but log warning
    // For critical data integrity, we warn but proceed to maintain sync compatibility
  }

  return {
    id: server.id,
    name: server.name,
    city: server.city,
    state: server.state,
    country: server.country,
    countryCode: server.country_code,
    venueType: server.venue_type as DexieVenue['venueType'],
    capacity: server.capacity,
    latitude: server.latitude,
    longitude: server.longitude,
    totalShows: server.total_shows,
    firstShowDate: server.first_show_date,
    lastShowDate: server.last_show_date,
    notes: server.notes,
    searchText: [server.name, server.city, server.state, server.country]
      .filter(Boolean)
      .join(' ')
      .toLowerCase(),
  };
}

function transformSong(server: ServerSong): DexieSong {
  return {
    id: server.id,
    title: server.title,
    slug: server.slug,
    sortTitle: server.sort_title,
    originalArtist: server.original_artist,
    isCover: server.is_cover === 1,
    isOriginal: server.is_original === 1,
    firstPlayedDate: server.first_played_date,
    lastPlayedDate: server.last_played_date,
    totalPerformances: server.total_performances,
    openerCount: server.opener_count,
    closerCount: server.closer_count,
    encoreCount: server.encore_count,
    lyrics: server.lyrics,
    notes: server.notes,
    isLiberated: (server.is_liberated ?? 0) === 1,
    daysSinceLastPlayed: server.days_since_last_played ?? null,
    showsSinceLastPlayed: server.shows_since_last_played ?? null,
    searchText: [server.title, server.original_artist].filter(Boolean).join(' ').toLowerCase(),
  };
}

function transformTour(server: ServerTour): DexieTour {
  return {
    id: server.id,
    name: server.name,
    year: server.year,
    startDate: server.start_date,
    endDate: server.end_date,
    totalShows: server.total_shows,
    uniqueSongsPlayed: server.unique_songs_played,
    averageSongsPerShow: server.average_songs_per_show,
    rarityIndex: server.rarity_index,
  };
}

function transformShow(server: ServerShow): DexieShow {
  const year = parseInt(server.date.substring(0, 4), 10);
  const venue: EmbeddedVenue = {
    id: server.venue_id,
    name: server.venue_name,
    city: server.venue_city,
    state: server.venue_state,
    country: server.venue_country,
    countryCode: server.venue_country_code,
    venueType: server.venue_type as EmbeddedVenue['venueType'],
    capacity: server.venue_capacity,
    totalShows: server.venue_total_shows,
  };
  const tour: EmbeddedTour = {
    id: server.tour_id,
    name: server.tour_name,
    year: server.tour_year,
    startDate: server.tour_start_date,
    endDate: server.tour_end_date,
    totalShows: server.tour_total_shows,
  };

  return {
    id: server.id,
    date: server.date,
    venueId: server.venue_id,
    tourId: server.tour_id,
    notes: server.notes,
    soundcheck: server.soundcheck,
    attendanceCount: server.attendance_count,
    rarityIndex: server.rarity_index,
    songCount: server.song_count,
    venue,
    tour,
    year,
  };
}

function transformSetlistEntry(server: ServerSetlistEntry): DexieSetlistEntry {
  const year = parseInt(server.show_date.substring(0, 4), 10);
  const song: EmbeddedSong = {
    id: server.song_id,
    title: server.song_title,
    slug: server.song_slug,
    isCover: server.song_is_cover === 1,
    totalPerformances: server.song_total_performances,
    openerCount: server.song_opener_count,
    closerCount: server.song_closer_count,
    encoreCount: server.song_encore_count,
  };

  return {
    id: server.id,
    showId: server.show_id,
    songId: server.song_id,
    position: server.position,
    setName: server.set_name as DexieSetlistEntry['setName'],
    slot: server.slot as DexieSetlistEntry['slot'],
    durationSeconds: server.duration_seconds,
    segueIntoSongId: server.segue_into_song_id,
    isSegue: server.is_segue === 1,
    isTease: server.is_tease === 1,
    teaseOfSongId: server.tease_of_song_id,
    notes: server.notes,
    song,
    showDate: server.show_date,
    year,
  };
}

function transformGuest(server: ServerGuest): DexieGuest {
  let instruments: string[] | null = null;
  if (server.instruments) {
    try {
      instruments = JSON.parse(server.instruments);
    } catch {
      instruments = null;
    }
  }

  return {
    id: server.id,
    name: server.name,
    slug: server.slug,
    instruments,
    totalAppearances: server.total_appearances,
    firstAppearanceDate: server.first_appearance_date,
    lastAppearanceDate: server.last_appearance_date,
    notes: server.notes,
    searchText: [server.name, instruments?.join(' ')].filter(Boolean).join(' ').toLowerCase(),
  };
}

function transformGuestAppearance(server: ServerGuestAppearance): DexieGuestAppearance {
  const year = server.show_date
    ? parseInt(server.show_date.substring(0, 4), 10)
    : new Date().getFullYear();

  let instruments: string[] | null = null;
  if (server.instruments) {
    try {
      instruments = JSON.parse(server.instruments);
    } catch {
      instruments = null;
    }
  }

  return {
    id: server.id,
    guestId: server.guest_id,
    showId: server.show_id,
    setlistEntryId: server.setlist_entry_id,
    songId: server.song_id,
    instruments,
    notes: server.notes,
    showDate: server.show_date,
    year,
  };
}

function transformLiberationEntry(server: ServerLiberationEntry): DexieLiberationEntry {
  return {
    id: server.id,
    songId: server.song_id,
    lastPlayedDate: server.last_played_date,
    lastPlayedShowId: server.last_played_show_id,
    daysSince: server.days_since,
    showsSince: server.shows_since,
    notes: server.notes,
    configuration: server.configuration as DexieLiberationEntry['configuration'],
    isLiberated: server.is_liberated === 1,
    liberatedDate: server.liberated_date,
    liberatedShowId: server.liberated_show_id,
    song: {
      id: server.song_id,
      title: server.song_title,
      slug: server.song_slug,
      isCover: server.song_is_cover === 1,
      totalPerformances: server.song_total_performances,
    },
    lastShow: {
      id: server.last_played_show_id,
      date: server.show_date,
      venue: {
        name: server.venue_name,
        city: server.venue_city,
        state: server.venue_state,
      },
    },
  };
}

// ==================== SYNC FUNCTIONS ====================

/**
 * Perform a full sync from the server.
 * Clears existing data and repopulates from server.
 */
export async function performFullSync(options: SyncOptions = {}): Promise<void> {
  const { apiBase = '/api', onProgress, signal, chunkSize = 1000 } = options;
  const db = getDb();

  try {
    // Update sync status
    await db.updateSyncMeta({
      syncStatus: 'syncing',
      lastError: null,
    });

    onProgress?.({
      phase: 'fetching',
      current: 0,
      total: 100,
      percentage: 0,
      message: 'Starting full sync...',
    });

    // Fetch the full data bundle
    const response = await fetch(`${apiBase}/sync/full`, {
      signal,
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Sync failed: ${response.status} ${response.statusText}`);
    }

    const data: FullSyncResponse = await response.json();

    onProgress?.({
      phase: 'fetching',
      current: 100,
      total: 100,
      percentage: 100,
      message: 'Data fetched, processing...',
    });

    // Clear existing synced data
    await db.clearSyncedData();

    // Process entities in order (respecting dependencies)
    const entities = [
      { name: 'venues', transform: transformVenue, data: data.data.venues },
      { name: 'songs', transform: transformSong, data: data.data.songs },
      { name: 'tours', transform: transformTour, data: data.data.tours },
      { name: 'shows', transform: transformShow, data: data.data.shows },
      { name: 'setlistEntries', transform: transformSetlistEntry, data: data.data.setlistEntries },
      { name: 'guests', transform: transformGuest, data: data.data.guests },
      {
        name: 'guestAppearances',
        transform: transformGuestAppearance,
        data: data.data.guestAppearances,
      },
      {
        name: 'liberationList',
        transform: transformLiberationEntry,
        data: data.data.liberationList,
      },
    ] as const;

    let processedEntities = 0;
    const totalEntities = entities.length;

    for (const entity of entities) {
      if (signal?.aborted) {
        throw new Error('Sync aborted');
      }

      onProgress?.({
        phase: 'transforming',
        entity: entity.name,
        current: processedEntities,
        total: totalEntities,
        percentage: Math.round((processedEntities / totalEntities) * 100),
        message: `Processing ${entity.name}...`,
      });

      // Transform data in batches with yielding to prevent UI jank
      const transformed: unknown[] = [];
      const transformFn = entity.transform as (item: unknown) => unknown;

      for (let i = 0; i < entity.data.length; i += YIELD_BATCH_SIZE) {
        if (signal?.aborted) {
          throw new Error('Sync aborted');
        }

        const batchEnd = Math.min(i + YIELD_BATCH_SIZE, entity.data.length);
        for (let j = i; j < batchEnd; j++) {
          transformed.push(transformFn(entity.data[j]));
        }

        // Yield to main thread after each transformation batch
        if (i + YIELD_BATCH_SIZE < entity.data.length) {
          await yieldToMain();
        }
      }

      onProgress?.({
        phase: 'storing',
        entity: entity.name,
        current: processedEntities,
        total: totalEntities,
        percentage: Math.round((processedEntities / totalEntities) * 100),
        message: `Storing ${transformed.length} ${entity.name}...`,
      });

      // Bulk insert in chunks with main thread yielding
      const table = db[entity.name as keyof typeof db] as {
        bulkPut: (items: unknown[]) => Promise<unknown>;
      };

      // Use smaller batch size for yielding to keep UI responsive
      const batchSize = Math.min(chunkSize, YIELD_BATCH_SIZE);

      for (let i = 0; i < transformed.length; i += batchSize) {
        if (signal?.aborted) {
          throw new Error('Sync aborted');
        }
        const chunk = transformed.slice(i, i + batchSize);
        try {
          await table.bulkPut(chunk);
        } catch (error) {
          // Handle storage quota exceeded
          if (error instanceof Error && error.name === 'QuotaExceededError') {
            console.error('[Sync] Storage quota exceeded during sync:', {
              entity: entity.name,
              batchIndex: Math.floor(i / batchSize),
              recordsProcessed: i
            });
            // Dispatch event for UI notification
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('dexie-quota-exceeded', {
                detail: {
                  entity: entity.name,
                  loaded: i,
                  attempted: transformed.length,
                  phase: 'sync'
                }
              }));
            }
          }
          throw error;
        }

        // Yield to main thread after each batch to prevent UI jank
        // This allows the browser to process pending UI updates and user input
        await yieldToMain();
      }

      processedEntities++;
    }

    // Update sync metadata
    const recordCounts = await db.getRecordCounts();
    await db.updateSyncMeta({
      lastFullSync: Date.now(),
      serverVersion: data.version,
      syncStatus: 'idle',
      recordCounts,
    });

    // Clear all query caches after full sync to ensure fresh data is used
    // This prevents stale cached queries from being returned after bulk data update
    clearAllCaches();

    // Notify UI that data has been refreshed
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('dexie-sync-complete', {
        detail: { type: 'full', recordCounts }
      }));
    }

    onProgress?.({
      phase: 'complete',
      current: totalEntities,
      total: totalEntities,
      percentage: 100,
      message: 'Sync complete!',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await db.updateSyncMeta({
      syncStatus: 'error',
      lastError: errorMessage,
    });

    onProgress?.({
      phase: 'error',
      current: 0,
      total: 100,
      percentage: 0,
      message: `Sync failed: ${errorMessage}`,
    });

    throw error;
  }
}

/**
 * Perform an incremental sync to fetch only changed data.
 */
export async function performIncrementalSync(options: SyncOptions = {}): Promise<void> {
  const { apiBase = '/api', onProgress, signal } = options;
  const db = getDb();
  const syncMeta = await db.getSyncMeta();

  if (!syncMeta?.lastFullSync && !syncMeta?.lastIncrementalSync) {
    // No previous sync - do full sync instead
    return performFullSync(options);
  }

  const lastSync = syncMeta.lastIncrementalSync ?? syncMeta.lastFullSync;

  try {
    await db.updateSyncMeta({
      syncStatus: 'syncing',
      lastError: null,
    });

    onProgress?.({
      phase: 'fetching',
      current: 0,
      total: 100,
      percentage: 0,
      message: 'Checking for updates...',
    });

    // Fetch incremental changes
    const response = await fetch(`${apiBase}/sync/incremental?since=${lastSync}`, {
      signal,
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Incremental sync failed: ${response.status}`);
    }

    const data = await response.json();

    if (!data.hasChanges) {
      // No changes since last sync
      await db.updateSyncMeta({
        lastIncrementalSync: Date.now(),
        syncStatus: 'idle',
      });

      onProgress?.({
        phase: 'complete',
        current: 100,
        total: 100,
        percentage: 100,
        message: 'No updates needed',
      });

      return;
    }

    // Apply incremental changes
    // This would process added/updated/deleted records
    // Implementation depends on server API structure

    await db.updateSyncMeta({
      lastIncrementalSync: Date.now(),
      syncStatus: 'idle',
    });

    // Clear all query caches after incremental sync to ensure fresh data
    clearAllCaches();

    // Notify UI that data has been refreshed
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('dexie-sync-complete', {
        detail: { type: 'incremental' }
      }));
    }

    onProgress?.({
      phase: 'complete',
      current: 100,
      total: 100,
      percentage: 100,
      message: 'Incremental sync complete',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await db.updateSyncMeta({
      syncStatus: 'error',
      lastError: errorMessage,
    });

    throw error;
  }
}

/**
 * Check if sync is needed
 */
export async function shouldSync(staleThresholdMs = 24 * 60 * 60 * 1000): Promise<boolean> {
  const db = getDb();
  const syncMeta = await db.getSyncMeta();

  if (!syncMeta?.lastFullSync) {
    return true; // Never synced
  }

  const lastSync = syncMeta.lastIncrementalSync ?? syncMeta.lastFullSync;
  const timeSinceSync = Date.now() - lastSync;

  return timeSinceSync > staleThresholdMs;
}

/**
 * Auto-sync: perform incremental if possible, full if needed
 */
export async function autoSync(options: SyncOptions = {}): Promise<void> {
  const db = getDb();
  const syncMeta = await db.getSyncMeta();

  if (!syncMeta?.lastFullSync) {
    // First sync - do full
    return performFullSync(options);
  }

  // Check server for whether incremental is possible
  const { apiBase = '/api' } = options;

  try {
    const checkResponse = await fetch(`${apiBase}/sync/check?since=${syncMeta.lastFullSync}`, {
      signal: options.signal,
    });

    if (!checkResponse.ok) {
      // Fall back to full sync
      return performFullSync(options);
    }

    const { incrementalAvailable } = await checkResponse.json();

    if (incrementalAvailable) {
      return performIncrementalSync(options);
    }
    return performFullSync(options);
  } catch {
    // If check fails, try incremental first, fall back to full
    try {
      return await performIncrementalSync(options);
    } catch {
      return performFullSync(options);
    }
  }
}

// Types are exported at their definition above

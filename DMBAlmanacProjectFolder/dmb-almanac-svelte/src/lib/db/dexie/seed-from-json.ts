/**
 * DMB Almanac - Seed Dexie Database from JSON Files
 *
 * Helper functions to load exported JSON files from public/data/ into Dexie IndexedDB.
 * This enables the PWA to bootstrap the database from static JSON files without needing
 * a server API.
 *
 * Usage:
 * ```typescript
 * import { seedDatabaseFromJson, checkIfDataNeedsUpdate } from '@/lib/db/dexie/seed-from-json';
 * import { db } from '@/lib/db/dexie/db';
 *
 * // On app initialization
 * if (await checkIfDataNeedsUpdate(db)) {
 *   await seedDatabaseFromJson(db);
 * }
 * ```
 */

import type Dexie from 'dexie';
import { dbSeedLogger as logger } from '$lib/utils/dev-logger';
import type {
  DexieGuest,
  DexieGuestAppearance,
  DexieLiberationEntry,
  DexieSetlistEntry,
  DexieShow,
  DexieSong,
  DexieSongStatistics,
  DexieTour,
  DexieVenue,
  SyncMeta,
} from './schema';

/**
 * Type-safe wrapper for Dexie database table operations
 * Provides proper typing for bulkAdd and other table methods
 */
type DexieTable<T> = {
  bulkAdd: (data: T[], opts: { allKeys: boolean }) => Promise<void>;
  clear: () => Promise<void>;
  put: (data: T) => Promise<void>;
  get: (key: string) => Promise<T | undefined>;
};

type TypedDexie = {
  venues: DexieTable<DexieVenue>;
  songs: DexieTable<DexieSong>;
  tours: DexieTable<DexieTour>;
  shows: DexieTable<DexieShow>;
  setlistEntries: DexieTable<DexieSetlistEntry>;
  guests: DexieTable<DexieGuest>;
  guestAppearances: DexieTable<DexieGuestAppearance>;
  liberationList: DexieTable<DexieLiberationEntry>;
  songStatistics: DexieTable<DexieSongStatistics>;
  syncMeta: DexieTable<SyncMeta>;
};

/**
 * Cast Dexie instance to typed wrapper
 */
function getCastDb(db: Dexie): TypedDexie {
  return db as unknown as TypedDexie;
}

export interface ExportManifest {
  version: string;
  timestamp: string;
  recordCounts: {
    venues: number;
    songs: number;
    tours: number;
    shows: number;
    setlistEntries: number;
    guests: number;
    guestAppearances: number;
    liberationList: number;
    songStatistics: number;
  };
  totalSize: number;
  files: {
    name: string;
    path: string;
    recordCount: number;
    size: number;
  }[];
}

/**
 * Fetch and parse manifest from public/data/manifest.json
 */
export async function fetchManifest(): Promise<ExportManifest> {
  const response = await fetch('/data/manifest.json');
  if (!response.ok) {
    throw new Error(`Failed to fetch manifest: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Fetch JSON data from public/data/ directory
 */
async function fetchTableData<T>(path: string): Promise<T[]> {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${path}: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Check if database needs to be updated by comparing manifest timestamp
 * with stored sync metadata
 */
export async function checkIfDataNeedsUpdate(db: Dexie): Promise<boolean> {
  try {
    const manifest = await fetchManifest();
    const typedDb = getCastDb(db);
    const syncMeta = await typedDb.syncMeta.get('sync_state');

    if (!syncMeta || !syncMeta.lastFullSync) {
      // First time loading data
      return true;
    }

    // Check if remote data is newer than local
    const remoteTime = new Date(manifest.timestamp).getTime();
    const localTime = syncMeta.lastFullSync;

    return remoteTime > localTime;
  } catch (error) {
    logger.error('Error checking for data updates:', error);
    // If we can't fetch manifest, assume we need to update
    return true;
  }
}

/**
 * Load venues from JSON and add to database
 */
async function loadVenues(db: Dexie): Promise<number> {
  logger.log('Loading venues...');
  const venues = await fetchTableData<DexieVenue>('/data/venues.json');

  if (venues.length === 0) {
    logger.warn('No venues found in JSON');
    return 0;
  }

  const typedDb = getCastDb(db);
  await typedDb.venues.bulkAdd(venues, { allKeys: true });
  logger.success(`Loaded ${venues.length} venues`);
  return venues.length;
}

/**
 * Load songs from JSON and add to database
 */
async function loadSongs(db: Dexie): Promise<number> {
  logger.log('Loading songs...');
  const songs = await fetchTableData<DexieSong>('/data/songs.json');

  if (songs.length === 0) {
    logger.warn('No songs found in JSON');
    return 0;
  }

  const typedDb = getCastDb(db);
  await typedDb.songs.bulkAdd(songs, { allKeys: true });
  logger.success(`Loaded ${songs.length} songs`);
  return songs.length;
}

/**
 * Load tours from JSON and add to database
 */
async function loadTours(db: Dexie): Promise<number> {
  logger.log('Loading tours...');
  const tours = await fetchTableData<DexieTour>('/data/tours.json');

  if (tours.length === 0) {
    logger.warn('No tours found in JSON');
    return 0;
  }

  const typedDb = getCastDb(db);
  await typedDb.tours.bulkAdd(tours, { allKeys: true });
  logger.success(`Loaded ${tours.length} tours`);
  return tours.length;
}

/**
 * Load shows from JSON and add to database
 */
async function loadShows(db: Dexie): Promise<number> {
  logger.log('Loading shows...');
  const shows = await fetchTableData<DexieShow>('/data/shows.json');

  if (shows.length === 0) {
    logger.warn('No shows found in JSON');
    return 0;
  }

  const typedDb = getCastDb(db);
  await typedDb.shows.bulkAdd(shows, { allKeys: true });
  logger.success(`Loaded ${shows.length} shows`);
  return shows.length;
}

/**
 * Load setlist entries from JSON and add to database
 */
async function loadSetlistEntries(db: Dexie): Promise<number> {
  logger.log('Loading setlist entries...');
  const entries = await fetchTableData<DexieSetlistEntry>('/data/setlist-entries.json');

  if (entries.length === 0) {
    logger.warn('No setlist entries found in JSON');
    return 0;
  }

  const typedDb = getCastDb(db);
  await typedDb.setlistEntries.bulkAdd(entries, { allKeys: true });
  logger.success(`Loaded ${entries.length} setlist entries`);
  return entries.length;
}

/**
 * Load guests from JSON and add to database
 */
async function loadGuests(db: Dexie): Promise<number> {
  logger.log('Loading guests...');
  const guests = await fetchTableData<DexieGuest>('/data/guests.json');

  if (guests.length === 0) {
    logger.warn('No guests found in JSON');
    return 0;
  }

  const typedDb = getCastDb(db);
  await typedDb.guests.bulkAdd(guests, { allKeys: true });
  logger.success(`Loaded ${guests.length} guests`);
  return guests.length;
}

/**
 * Load guest appearances from JSON and add to database
 */
async function loadGuestAppearances(db: Dexie): Promise<number> {
  logger.log('Loading guest appearances...');
  const appearances = await fetchTableData<DexieGuestAppearance>('/data/guest-appearances.json');

  if (appearances.length === 0) {
    logger.warn('No guest appearances found in JSON');
    return 0;
  }

  const typedDb = getCastDb(db);
  await typedDb.guestAppearances.bulkAdd(appearances, { allKeys: true });
  logger.success(`Loaded ${appearances.length} guest appearances`);
  return appearances.length;
}

/**
 * Load liberation list from JSON and add to database
 */
async function loadLiberationList(db: Dexie): Promise<number> {
  logger.log('Loading liberation list...');
  const liberations = await fetchTableData<DexieLiberationEntry>('/data/liberation-list.json');

  if (liberations.length === 0) {
    logger.warn('No liberation list entries found in JSON');
    return 0;
  }

  const typedDb = getCastDb(db);
  await typedDb.liberationList.bulkAdd(liberations, { allKeys: true });
  logger.success(`Loaded ${liberations.length} liberation list entries`);
  return liberations.length;
}

/**
 * Load song statistics from JSON and add to database
 */
async function loadSongStatistics(db: Dexie): Promise<number> {
  logger.log('Loading song statistics...');
  const stats = await fetchTableData<DexieSongStatistics>('/data/song-statistics.json');

  if (stats.length === 0) {
    logger.warn('No song statistics found in JSON');
    return 0;
  }

  const typedDb = getCastDb(db);
  await typedDb.songStatistics.bulkAdd(stats, { allKeys: true });
  logger.success(`Loaded ${stats.length} song statistics records`);
  return stats.length;
}

/**
 * Update sync metadata after successful seed
 */
async function updateSyncMeta(
  db: Dexie,
  manifest: ExportManifest,
  startTime: number
): Promise<void> {
  const syncMeta: SyncMeta = {
    id: 'sync_state',
    lastFullSync: Date.now(),
    lastIncrementalSync: null,
    serverVersion: manifest.version,
    clientVersion: 1,
    syncStatus: 'idle',
    lastError: null,
    recordCounts: {
      shows: manifest.recordCounts.shows,
      songs: manifest.recordCounts.songs,
      venues: manifest.recordCounts.venues,
      tours: manifest.recordCounts.tours,
      guests: manifest.recordCounts.guests,
      setlistEntries: manifest.recordCounts.setlistEntries,
      liberationList: manifest.recordCounts.liberationList,
    },
  };

  const typedDb = getCastDb(db);
  await typedDb.syncMeta.put(syncMeta);

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  logger.success(`Sync metadata updated in ${duration}s`);
}

/**
 * Seed the entire Dexie database from JSON files
 *
 * This is the main function to call during app initialization to load data
 * from the static JSON exports generated by scripts/export-to-json.ts
 *
 * @param db - Dexie database instance
 * @param options - Configuration options
 * @returns Promise that resolves when seeding is complete
 *
 * @example
 * ```typescript
 * import { db } from '@/lib/db/dexie/db';
 * import { seedDatabaseFromJson } from '@/lib/db/dexie/seed-from-json';
 *
 * try {
 *   console.log('Seeding database...');
 *   await seedDatabaseFromJson(db);
 *   console.log('Database ready');
 * } catch (error) {
 *   console.error('Failed to seed database:', error);
 * }
 * ```
 */
export async function seedDatabaseFromJson(
  db: Dexie,
  options?: {
    onProgress?: (table: string, count: number, total: number) => void;
  }
): Promise<void> {
  const startTime = Date.now();

  try {
    // Fetch manifest to get expected counts
    const manifest = await fetchManifest();
    logger.log('Manifest fetched');
    logger.log(`Data version: ${manifest.version}`);
    logger.log(`Timestamp: ${manifest.timestamp}`);
    logger.log(`Total size: ${(manifest.totalSize / 1024 / 1024).toFixed(2)} MB`);

    // Clear existing data to avoid conflicts
    logger.log('Clearing existing data...');
    const typedDb = getCastDb(db);

    await typedDb.venues.clear();
    await typedDb.songs.clear();
    await typedDb.tours.clear();
    await typedDb.shows.clear();
    await typedDb.setlistEntries.clear();
    await typedDb.guests.clear();
    await typedDb.guestAppearances.clear();
    await typedDb.liberationList.clear();
    await typedDb.songStatistics.clear();
    logger.success('Cleared existing data');

    // Load data in dependency order
    let totalRecords = 0;
    let tableCount = 0;

    totalRecords += await loadVenues(db);
    tableCount++;
    options?.onProgress?.('venues', tableCount, 9);

    totalRecords += await loadSongs(db);
    tableCount++;
    options?.onProgress?.('songs', tableCount, 9);

    totalRecords += await loadTours(db);
    tableCount++;
    options?.onProgress?.('tours', tableCount, 9);

    totalRecords += await loadShows(db);
    tableCount++;
    options?.onProgress?.('shows', tableCount, 9);

    totalRecords += await loadSetlistEntries(db);
    tableCount++;
    options?.onProgress?.('setlistEntries', tableCount, 9);

    totalRecords += await loadGuests(db);
    tableCount++;
    options?.onProgress?.('guests', tableCount, 9);

    totalRecords += await loadGuestAppearances(db);
    tableCount++;
    options?.onProgress?.('guestAppearances', tableCount, 9);

    totalRecords += await loadLiberationList(db);
    tableCount++;
    options?.onProgress?.('liberationList', tableCount, 9);

    totalRecords += await loadSongStatistics(db);
    tableCount++;
    options?.onProgress?.('songStatistics', tableCount, 9);

    // Update sync metadata
    await updateSyncMeta(db, manifest, startTime);

    logger.log('===================================');
    logger.log(`Total records loaded: ${totalRecords.toLocaleString()}`);
    logger.log(`Total time: ${((Date.now() - startTime) / 1000).toFixed(2)}s`);
    logger.log('===================================');
    logger.success('Database seeding complete!');
  } catch (error) {
    logger.error('Error seeding database:', error);

    // Update sync metadata with error state
    try {
      const syncMeta: SyncMeta = {
        id: 'sync_state',
        lastFullSync: null,
        lastIncrementalSync: null,
        serverVersion: null,
        clientVersion: 1,
        syncStatus: 'error',
        lastError: error instanceof Error ? error.message : 'Unknown error',
        recordCounts: {
          shows: 0,
          songs: 0,
          venues: 0,
          tours: 0,
          guests: 0,
          setlistEntries: 0,
          liberationList: 0,
        },
      };
      const typedDb = getCastDb(db);
      await typedDb.syncMeta.put(syncMeta);
    } catch {
      // Ignore errors updating sync meta during failure
    }

    throw error;
  }
}

/**
 * Get sync status information
 */
export async function getSyncStatus(db: Dexie): Promise<SyncMeta | null> {
  try {
    const typedDb = getCastDb(db);
    const result = await typedDb.syncMeta.get('sync_state');
    return result ?? null;
  } catch {
    return null;
  }
}

/**
 * Check if database has been seeded
 */
export async function isDatabaseSeeded(db: Dexie): Promise<boolean> {
  try {
    const syncMeta = await getSyncStatus(db);
    return syncMeta?.lastFullSync !== null && syncMeta?.lastFullSync !== undefined;
  } catch {
    return false;
  }
}

/**
 * Get manifest without seeding database
 * Useful for checking if updates are available
 */
export async function getManifest(): Promise<ExportManifest | null> {
  try {
    return await fetchManifest();
  } catch {
    return null;
  }
}

/**
 * DMB Almanac - Dexie Database Class
 *
 * Central database instance for client-side IndexedDB storage.
 * Uses Dexie.js 4.x for type-safe IndexedDB access with React integration.
 *
 * Features:
 * - Singleton pattern for consistent database access
 * - Type-safe table definitions
 * - Schema versioning with migration support
 * - Optimized for Chromium 143+ on Apple Silicon
 */

import Dexie, { type EntityTable, type Transaction } from 'dexie';
import { clearAllCaches } from './cache';
import {
  CURRENT_DB_VERSION,
  DB_NAME,
  DEXIE_SCHEMA,
  type DexieCuratedList,
  type DexieCuratedListItem,
  type DexieGuest,
  type DexieGuestAppearance,
  type DexieLiberationEntry,
  type DexieRelease,
  type DexieReleaseTrack,
  type DexieSetlistEntry,
  type DexieShow,
  type DexieSong,
  type DexieSongStatistics,
  type DexieTour,
  type DexieVenue,
  type OfflineMutationQueueItem,
  type TelemetryQueueItem,
  type SyncMeta,
  type UserAttendedShow,
  type UserFavoriteSong,
  type UserFavoriteVenue,
} from './schema';

/**
 * Migration history entry for tracking completed migrations
 */
export interface MigrationHistoryEntry {
  fromVersion: number;
  toVersion: number;
  completedAt: Date;
  duration: number;
  success: boolean;
  error?: string;
}

// In-memory migration history (persisted in localStorage when available)
const MIGRATION_HISTORY_KEY = 'dmb_almanac_migration_history';

function loadMigrationHistory(): MigrationHistoryEntry[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const stored = localStorage.getItem(MIGRATION_HISTORY_KEY);
    if (!stored) return [];
    return JSON.parse(stored).map((entry: MigrationHistoryEntry) => ({
      ...entry,
      completedAt: new Date(entry.completedAt),
    }));
  } catch {
    return [];
  }
}

function saveMigrationHistory(history: MigrationHistoryEntry[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(MIGRATION_HISTORY_KEY, JSON.stringify(history));
  } catch {
    // Storage quota exceeded or unavailable - ignore
  }
}

function recordMigration(entry: MigrationHistoryEntry): void {
  const history = loadMigrationHistory();
  history.push(entry);
  saveMigrationHistory(history);
}

/**
 * DMB Almanac Dexie Database
 *
 * Extends Dexie with typed tables for the DMB Almanac data model.
 * All tables are accessible via the singleton instance.
 */
export class DMBAlmanacDB extends Dexie {
  // Core entities
  venues!: EntityTable<DexieVenue, 'id'>;
  songs!: EntityTable<DexieSong, 'id'>;
  tours!: EntityTable<DexieTour, 'id'>;
  shows!: EntityTable<DexieShow, 'id'>;
  setlistEntries!: EntityTable<DexieSetlistEntry, 'id'>;

  // Guests
  guests!: EntityTable<DexieGuest, 'id'>;
  guestAppearances!: EntityTable<DexieGuestAppearance, 'id'>;

  // Liberation
  liberationList!: EntityTable<DexieLiberationEntry, 'id'>;

  // Statistics
  songStatistics!: EntityTable<DexieSongStatistics, 'id'>;

  // User data (local only)
  userAttendedShows!: EntityTable<UserAttendedShow, 'id'>;
  userFavoriteSongs!: EntityTable<UserFavoriteSong, 'id'>;
  userFavoriteVenues!: EntityTable<UserFavoriteVenue, 'id'>;

  // Curated lists
  curatedLists!: EntityTable<DexieCuratedList, 'id'>;
  curatedListItems!: EntityTable<DexieCuratedListItem, 'id'>;

  // Releases
  releases!: EntityTable<DexieRelease, 'id'>;
  releaseTracks!: EntityTable<DexieReleaseTrack, 'id'>;

  // Sync metadata
  syncMeta!: EntityTable<SyncMeta, 'id'>;

  // Offline mutation queue
  offlineMutationQueue!: EntityTable<OfflineMutationQueueItem, 'id'>;

  // Telemetry queue
  telemetryQueue!: EntityTable<TelemetryQueueItem, 'id'>;

  constructor() {
    super(DB_NAME);

    // Define schema versions
    // v1: Initial schema
    this.version(1).stores(DEXIE_SCHEMA[1]);

    // v2: Added compound indexes for common query patterns
    // - [venueId+date] on shows for venue history
    // - [songId+year] on setlistEntries for song year breakdown
    // - [year+slot] on setlistEntries for slot analysis by year
    // - [guestId+year] on guestAppearances for guest year breakdown
    this.version(2).stores(DEXIE_SCHEMA[2]).upgrade(async (tx: Transaction) => {
      const startTime = performance.now();
      console.debug('[DexieDB] Migration v1 -> v2: Starting (index-only changes)');

      try {
        // Index-only migration - no data transformation needed
        // Dexie handles index creation automatically
        // This upgrade function exists for logging and future extensibility

        const duration = performance.now() - startTime;
        console.debug(`[DexieDB] Migration v1 -> v2: Completed in ${duration.toFixed(2)}ms`);

        recordMigration({
          fromVersion: 1,
          toVersion: 2,
          completedAt: new Date(),
          duration,
          success: true,
        });
      } catch (error) {
        const duration = performance.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[DexieDB] Migration v1 -> v2: Failed after ${duration.toFixed(2)}ms`, error);

        recordMigration({
          fromVersion: 1,
          toVersion: 2,
          completedAt: new Date(),
          duration,
          success: false,
          error: errorMessage,
        });

        throw error;
      }
    });

    // v3: Optimized compound indexes for performance
    // - [tourId+date] for efficient tour chronological queries
    // - [isLiberated+daysSince] for liberation list filtering
    // - [showId+position] for ordered setlist retrieval
    // - User data compound indexes for efficient lookups
    // - Removed low-selectivity boolean indexes (isCover, isLiberated)
    this.version(3).stores(DEXIE_SCHEMA[3]).upgrade(async (tx: Transaction) => {
      const startTime = performance.now();
      console.debug('[DexieDB] Migration v2 -> v3: Starting (index optimization)');

      try {
        // Index-only migration - no data transformation needed
        // This version optimizes indexes by:
        // - Adding compound indexes for tour/date queries
        // - Adding showId+position for ordered setlist retrieval
        // - Removing low-selectivity boolean indexes

        const duration = performance.now() - startTime;
        console.debug(`[DexieDB] Migration v2 -> v3: Completed in ${duration.toFixed(2)}ms`);

        recordMigration({
          fromVersion: 2,
          toVersion: 3,
          completedAt: new Date(),
          duration,
          success: true,
        });
      } catch (error) {
        const duration = performance.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[DexieDB] Migration v2 -> v3: Failed after ${duration.toFixed(2)}ms`, error);

        recordMigration({
          fromVersion: 2,
          toVersion: 3,
          completedAt: new Date(),
          duration,
          success: false,
          error: errorMessage,
        });

        throw error;
      }
    });

    // v4: Performance optimizations from comprehensive audit
    // - [songId+showDate] for 30-50% faster song→shows queries
    // - [venueId+year] for venue year breakdown without full scan
    // - Removed 'state' index on venues (low selectivity)
    this.version(4).stores(DEXIE_SCHEMA[4]).upgrade(async (tx: Transaction) => {
      const startTime = performance.now();
      console.debug('[DexieDB] Migration v3 -> v4: Starting (performance optimization)');

      try {
        // Index-only migration - no data transformation needed
        // This version optimizes indexes by:
        // - Adding [songId+showDate] for efficient song→shows chronological queries
        // - Adding [venueId+year] for venue year breakdown
        // - Removing 'state' single-field index (low selectivity)

        const duration = performance.now() - startTime;
        console.debug(`[DexieDB] Migration v3 -> v4: Completed in ${duration.toFixed(2)}ms`);

        recordMigration({
          fromVersion: 3,
          toVersion: 4,
          completedAt: new Date(),
          duration,
          success: true,
        });
      } catch (error) {
        const duration = performance.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[DexieDB] Migration v3 -> v4: Failed after ${duration.toFixed(2)}ms`, error);

        recordMigration({
          fromVersion: 3,
          toVersion: 4,
          completedAt: new Date(),
          duration,
          success: false,
          error: errorMessage,
        });

        throw error;
      }
    });

    // v5: Offline mutation queue optimization
    // - [status+createdAt] compound index for efficient FIFO queue processing
    // This enables efficient queries like:
    //   .where('[status+createdAt]').between(['pending', 0], ['pending', Infinity])
    // Instead of:
    //   .where('status').anyOf(['pending', 'retrying']).sortBy('createdAt')
    this.version(5).stores(DEXIE_SCHEMA[5]).upgrade(async (tx: Transaction) => {
      const startTime = performance.now();
      console.debug('[DexieDB] Migration v4 -> v5: Starting (offline queue optimization)');

      try {
        // Index-only migration - no data transformation needed
        // This version adds:
        // - [status+createdAt] compound index on offlineMutationQueue
        //   for efficient FIFO processing of pending/retrying mutations

        const duration = performance.now() - startTime;
        console.debug(`[DexieDB] Migration v4 -> v5: Completed in ${duration.toFixed(2)}ms`);

        recordMigration({
          fromVersion: 4,
          toVersion: 5,
          completedAt: new Date(),
          duration,
          success: true,
        });
      } catch (error) {
        const duration = performance.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[DexieDB] Migration v4 -> v5: Failed after ${duration.toFixed(2)}ms`, error);

        recordMigration({
          fromVersion: 4,
          toVersion: 5,
          completedAt: new Date(),
          duration,
          success: false,
          error: errorMessage,
        });

        throw error;
      }
    });

    // Handle version changes from other tabs
    this.on('versionchange', (event) => {
      console.warn('[DexieDB] Database version changed in another tab, closing connection...');
      this.close();
      // Notify user that they need to refresh
      if (typeof window !== 'undefined') {
        // Dispatch a custom event that components can listen for
        window.dispatchEvent(new CustomEvent('dexie-version-change', {
          detail: {
            event,
            action: 'refresh-required',
            message: 'Please refresh the page to get the latest version'
          }
        }));
      }
    });

    // Handle blocked upgrades (another tab is holding the connection open)
    this.on('blocked', (event) => {
      console.error('[DexieDB] Database upgrade blocked by another tab');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('dexie-upgrade-blocked', {
          detail: {
            message: 'Please close all other tabs to complete the database upgrade',
            currentVersion: this.verno,
            event,
          },
        }));
      }
    });

  }

  /**
   * Dexie error types for specific handling
   */
  private static readonly ERROR_TYPES = [
    'AbortError',
    'BulkError',
    'ConstraintError',
    'DataCloneError',
    'DataError',
    'DatabaseClosedError',
    'InvalidAccessError',
    'InvalidStateError',
    'MissingAPIError',
    'NoSuchDatabaseError',
    'NotFoundError',
    'OpenFailedError',
    'PrematureCommitError',
    'QuotaExceededError',
    'ReadOnlyError',
    'SchemaError',
    'SubTransactionError',
    'TimeoutError',
    'TransactionInactiveError',
    'UnknownError',
    'UnsupportedError',
    'VersionChangeError',
    'VersionError',
  ] as const;

  /**
   * Handle and log database errors with context and specific error type handling.
   * Call this in catch blocks to get consistent error handling.
   */
  handleError(error: unknown, context: string): void {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    const errorType = errorObj.name || 'UnknownError';

    // Determine severity based on error type
    const isRecoverable = this.isRecoverableError(errorType);
    const severity = isRecoverable ? 'warn' : 'error';

    console[severity](`[DexieDB] ${context}:`, {
      name: this.name,
      version: this.verno,
      errorType,
      message: errorObj.message,
      stack: errorObj.stack,
      isRecoverable,
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('dexie-error', {
        detail: {
          error: errorObj,
          dbName: this.name,
          version: this.verno,
          errorType,
          context,
          isRecoverable,
          timestamp: Date.now(),
        },
      }));

      // Dispatch specific error events for critical errors
      if (errorType === 'QuotaExceededError') {
        window.dispatchEvent(new CustomEvent('dexie-quota-exceeded', {
          detail: { dbName: this.name, context },
        }));
      } else if (errorType === 'VersionError' || errorType === 'VersionChangeError') {
        window.dispatchEvent(new CustomEvent('dexie-version-conflict', {
          detail: { dbName: this.name, version: this.verno, context },
        }));
      }
    }
  }

  /**
   * Determine if an error is recoverable (can retry) or fatal
   */
  private isRecoverableError(errorType: string): boolean {
    const recoverableErrors = [
      'AbortError',
      'TimeoutError',
      'TransactionInactiveError',
      'DatabaseClosedError',
    ];
    return recoverableErrors.includes(errorType);
  }

  /**
   * Get sync metadata
   */
  async getSyncMeta(): Promise<SyncMeta | undefined> {
    return this.syncMeta.get('sync_state');
  }

  /**
   * Update sync metadata
   */
  async updateSyncMeta(updates: Partial<Omit<SyncMeta, 'id'>>): Promise<void> {
    const existing = await this.getSyncMeta();
    if (existing) {
      await this.syncMeta.update('sync_state', updates);
    } else {
      await this.syncMeta.put({
        id: 'sync_state',
        lastFullSync: null,
        lastIncrementalSync: null,
        serverVersion: null,
        clientVersion: CURRENT_DB_VERSION,
        syncStatus: 'idle',
        lastError: null,
        recordCounts: {
          shows: 0,
          songs: 0,
          venues: 0,
          tours: 0,
          guests: 0,
          setlistEntries: 0,
          liberationList: 0,
        },
        ...updates,
      });
    }
  }

  /**
   * Check if database has been populated with data
   */
  async isPopulated(): Promise<boolean> {
    const showCount = await this.shows.count();
    return showCount > 0;
  }

  /**
   * Get record counts for all tables
   */
  async getRecordCounts(): Promise<SyncMeta['recordCounts']> {
    const [shows, songs, venues, tours, guests, setlistEntries, liberationList] = await Promise.all(
      [
        this.shows.count(),
        this.songs.count(),
        this.venues.count(),
        this.tours.count(),
        this.guests.count(),
        this.setlistEntries.count(),
        this.liberationList.count(),
      ]
    );

    return {
      shows,
      songs,
      venues,
      tours,
      guests,
      setlistEntries,
      liberationList,
    };
  }

  /**
   * Clear all data (but preserve user data)
   */
  async clearSyncedData(): Promise<void> {
    clearAllCaches();
    await this.transaction(
      'rw',
      [
        this.venues,
        this.songs,
        this.tours,
        this.shows,
        this.setlistEntries,
        this.guests,
        this.guestAppearances,
        this.liberationList,
        this.songStatistics,
        this.curatedLists,
        this.curatedListItems,
        this.releases,
        this.releaseTracks,
        this.syncMeta,
      ],
      async () => {
        await Promise.all([
          this.venues.clear(),
          this.songs.clear(),
          this.tours.clear(),
          this.shows.clear(),
          this.setlistEntries.clear(),
          this.guests.clear(),
          this.guestAppearances.clear(),
          this.liberationList.clear(),
          this.songStatistics.clear(),
          this.curatedLists.clear(),
          this.curatedListItems.clear(),
          this.releases.clear(),
          this.releaseTracks.clear(),
          this.syncMeta.clear(),
        ]);
      }
    );
  }

  /**
   * Clear all data including user data
   */
  async clearAllData(): Promise<void> {
    clearAllCaches();
    await this.transaction(
      'rw',
      [
        this.venues,
        this.songs,
        this.tours,
        this.shows,
        this.setlistEntries,
        this.guests,
        this.guestAppearances,
        this.liberationList,
        this.songStatistics,
        this.userAttendedShows,
        this.userFavoriteSongs,
        this.userFavoriteVenues,
        this.curatedLists,
        this.curatedListItems,
        this.releases,
        this.releaseTracks,
        this.syncMeta,
      ],
      async () => {
        await Promise.all([
          this.venues.clear(),
          this.songs.clear(),
          this.tours.clear(),
          this.shows.clear(),
          this.setlistEntries.clear(),
          this.guests.clear(),
          this.guestAppearances.clear(),
          this.liberationList.clear(),
          this.songStatistics.clear(),
          this.userAttendedShows.clear(),
          this.userFavoriteSongs.clear(),
          this.userFavoriteVenues.clear(),
          this.curatedLists.clear(),
          this.curatedListItems.clear(),
          this.releases.clear(),
          this.releaseTracks.clear(),
          this.syncMeta.clear(),
        ]);
      }
    );
  }

  /**
   * Delete the entire database
   */
  async deleteDatabase(): Promise<void> {
    await this.delete();
  }

  /**
   * Check if database connection is open and healthy.
   */
  isConnectionHealthy(): boolean {
    return this.isOpen() && !this.hasFailed();
  }

  /**
   * Get current connection state for monitoring.
   */
  getConnectionState(): {
    isOpen: boolean;
    hasFailed: boolean;
    version: number;
    name: string;
  } {
    return {
      isOpen: this.isOpen(),
      hasFailed: this.hasFailed(),
      version: this.verno,
      name: this.name,
    };
  }

  // Track pending open operation to prevent race conditions
  private _openPromise: Promise<void> | null = null;

  /**
   * Ensure database is open, opening if necessary.
   * Uses a lock to prevent race conditions when multiple callers
   * try to open the database simultaneously.
   */
  async ensureOpen(): Promise<void> {
    // Already open - fast path
    if (this.isOpen()) {
      return;
    }

    // If there's already an open operation in progress, wait for it
    if (this._openPromise) {
      await this._openPromise;
      return;
    }

    // Start new open operation with lock
    this._openPromise = (async () => {
      try {
        // Double-check after acquiring "lock" (another caller may have completed)
        if (!this.isOpen()) {
          await this.open();
        }
      } catch (error) {
        this.handleError(error, 'ensureOpen');
        throw error;
      } finally {
        // Clear the lock so future calls can proceed
        this._openPromise = null;
      }
    })();

    await this._openPromise;
  }

  /**
   * Get the history of completed database migrations.
   * Returns migration entries sorted by completion time (newest first).
   */
  getMigrationHistory(): MigrationHistoryEntry[] {
    return loadMigrationHistory().sort(
      (a, b) => b.completedAt.getTime() - a.completedAt.getTime()
    );
  }

  /**
   * Get migration statistics
   */
  getMigrationStats(): {
    totalMigrations: number;
    successfulMigrations: number;
    failedMigrations: number;
    lastMigration: MigrationHistoryEntry | null;
    currentVersion: number;
  } {
    const history = this.getMigrationHistory();
    const successful = history.filter(m => m.success);
    const failed = history.filter(m => !m.success);

    return {
      totalMigrations: history.length,
      successfulMigrations: successful.length,
      failedMigrations: failed.length,
      lastMigration: history[0] || null,
      currentVersion: this.verno,
    };
  }

  /**
   * Run a safe migration with comprehensive error handling.
   * Wraps the database open operation in try-catch and dispatches
   * 'dexie-migration-error' event on failure.
   *
   * @returns Object with success status and optional error details
   */
  async runSafeMigration(): Promise<{
    success: boolean;
    fromVersion: number | null;
    toVersion: number;
    error?: Error;
    duration: number;
  }> {
    const startTime = performance.now();
    let fromVersion: number | null = null;

    try {
      // Determine current version before migration (if database exists)
      try {
        const existingDb = await Dexie.getDatabaseNames();
        if (existingDb.includes(this.name)) {
          // Database exists, get its version
          const tempDb = new Dexie(this.name);
          await tempDb.open();
          fromVersion = tempDb.verno;
          tempDb.close();
        }
      } catch {
        // Database doesn't exist yet or can't be opened - that's fine
        fromVersion = null;
      }

      console.debug(`[DexieDB] Safe migration: Starting (from v${fromVersion ?? 'new'} to v${CURRENT_DB_VERSION})`);

      // Open the database, which triggers any necessary migrations
      await this.open();

      const duration = performance.now() - startTime;
      const toVersion = this.verno;

      console.debug(`[DexieDB] Safe migration: Completed in ${duration.toFixed(2)}ms (now at v${toVersion})`);

      return {
        success: true,
        fromVersion,
        toVersion,
        duration,
      };
    } catch (error) {
      const duration = performance.now() - startTime;
      const errorObj = error instanceof Error ? error : new Error(String(error));

      console.error('[DexieDB] Safe migration: Failed', {
        fromVersion,
        targetVersion: CURRENT_DB_VERSION,
        duration,
        error: errorObj,
      });

      // Dispatch migration error event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('dexie-migration-error', {
          detail: {
            error: errorObj,
            fromVersion,
            targetVersion: CURRENT_DB_VERSION,
            duration,
            dbName: this.name,
          },
        }));
      }

      return {
        success: false,
        fromVersion,
        toVersion: CURRENT_DB_VERSION,
        error: errorObj,
        duration,
      };
    }
  }

  /**
   * Clear migration history (useful for testing or after major version changes)
   */
  clearMigrationHistory(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(MIGRATION_HISTORY_KEY);
    }
  }
}

// ==================== SINGLETON INSTANCE ====================

let dbInstance: DMBAlmanacDB | null = null;

/**
 * Get the singleton database instance.
 * Creates the instance on first call.
 *
 * @returns The DMBAlmanacDB instance
 */
export function getDb(): DMBAlmanacDB {
  if (!dbInstance) {
    dbInstance = new DMBAlmanacDB();
  }
  return dbInstance;
}

/**
 * Get the database instance (alias for getDb).
 * Exported for use with dexie-react-hooks.
 */
export const db = new Proxy({} as DMBAlmanacDB, {
  get(_target, prop) {
    return getDb()[prop as keyof DMBAlmanacDB];
  },
});

/**
 * Reset the database instance (useful for testing)
 */
export function resetDbInstance(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

/**
 * Check database connection health (useful for health checks)
 */
export function isDatabaseHealthy(): boolean {
  const db = getDb();
  return db.isConnectionHealthy();
}

/**
 * Get database connection state
 */
export function getDatabaseState(): ReturnType<DMBAlmanacDB['getConnectionState']> {
  return getDb().getConnectionState();
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Check if IndexedDB is available in the current environment
 */
export function isIndexedDBAvailable(): boolean {
  try {
    if (typeof window === 'undefined') {
      return false;
    }
    if (!window.indexedDB) {
      return false;
    }
    // Test if we can actually use IndexedDB
    const testDb = window.indexedDB.open('__idb_test__');
    testDb.onerror = () => false;
    return true;
  } catch {
    return false;
  }
}

/**
 * Estimate storage usage for the database
 */
export async function estimateStorageUsage(): Promise<{
  usage: number;
  quota: number;
  percentUsed: number;
}> {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) {
    return { usage: 0, quota: 0, percentUsed: 0 };
  }

  try {
    const estimate = await navigator.storage.estimate();
    const usage = estimate.usage ?? 0;
    const quota = estimate.quota ?? 0;
    const percentUsed = quota > 0 ? (usage / quota) * 100 : 0;

    return { usage, quota, percentUsed };
  } catch {
    return { usage: 0, quota: 0, percentUsed: 0 };
  }
}

/**
 * Request persistent storage (prevents browser from evicting IndexedDB data)
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persist) {
    return false;
  }

  try {
    const isPersisted = await navigator.storage.persist();
    console.debug(`[DexieDB] Persistent storage: ${isPersisted ? 'granted' : 'denied'}`);
    return isPersisted;
  } catch (error) {
    console.error('[DexieDB] Failed to request persistent storage:', error);
    return false;
  }
}

/**
 * Check if storage is already persisted
 */
export async function isStoragePersisted(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persisted) {
    return false;
  }

  try {
    return await navigator.storage.persisted();
  } catch {
    return false;
  }
}

/**
 * Get migration history for the database (standalone function)
 */
export function getMigrationHistory(): MigrationHistoryEntry[] {
  return getDb().getMigrationHistory();
}

/**
 * Get migration statistics (standalone function)
 */
export function getMigrationStats(): ReturnType<DMBAlmanacDB['getMigrationStats']> {
  return getDb().getMigrationStats();
}

/**
 * Run a safe database migration with error handling (standalone function)
 */
export async function runSafeMigration(): Promise<ReturnType<DMBAlmanacDB['runSafeMigration']>> {
  return getDb().runSafeMigration();
}

// ==================== EXPORTS ====================

export { DMBAlmanacDB as default };
export { CURRENT_DB_VERSION, DB_NAME };
// Note: MigrationHistoryEntry is exported at its interface definition above
export type {
  DexieCuratedList,
  DexieCuratedListItem,
  DexieGuest,
  DexieGuestAppearance,
  DexieLiberationEntry,
  DexieRelease,
  DexieReleaseTrack,
  DexieSetlistEntry,
  DexieShow,
  DexieSong,
  DexieSongStatistics,
  DexieTour,
  DexieVenue,
  SyncMeta,
  UserAttendedShow,
  UserFavoriteSong,
  UserFavoriteVenue,
} from './schema';

/**
 * DMB Almanac - Dexie Database Module
 *
 * Central export point for all Dexie-related functionality.
 * Import from '@/lib/db/dexie' for all client-side database needs.
 */

export type {
  EntityLoadTask,
  LoaderConfig,
  LoadProgress,
} from './data-loader';
// Data loader
export {
  clearAndReload,
  DEFAULT_CONFIG as DATA_LOADER_CONFIG,
  getLoadedVersion,
  getStorageInfo,
  isDataLoaded,
  LOAD_TASKS,
  loadInitialData,
  requestPersistentStorage as requestDataPersistence,
} from './data-loader';
// Database class and singleton
export {
  CURRENT_DB_VERSION,
  DB_NAME,
  DMBAlmanacDB,
  db,
  estimateStorageUsage,
  getDb,
  isIndexedDBAvailable,
  isStoragePersisted,
  requestPersistentStorage,
  resetDbInstance,
} from './db';
export type {
  InitOptions,
  InitResult,
} from './init';
// Initialization
export {
  getInitStatus,
  initDexieDb,
  initializeDexieDb,
  isInitializedDexie,
  resetInitState,
} from './init';
// Query functions
export * as queries from './queries';
// Re-export commonly used queries directly
export {
  addUserAttendedShow,
  addUserFavoriteSong,
  addUserFavoriteVenue,
  getAdjacentShows,
  // Guests
  getAllGuests,
  // Shows
  getAllShows,
  getAllShowsForGuest,
  // Songs
  getAllSongs,
  // Tours
  getAllTours,
  // Venues
  getAllVenues,
  getAppearancesByGuest,
  getAvgSongsPerShowByYear,
  getFullLiberationList,
  // Statistics
  getGlobalStats,
  getGlobalStatsExtended,
  getGuestById,
  getGuestBySlug,
  getLiberationEntryForSong,
  // Liberation
  getLiberationList,
  getRecentShows,
  getRecentShowsForSong,
  // Setlists
  getSetlistForShow,
  getShowById,
  getShowsByVenue,
  getShowsByYear,
  getShowsByYearSummary,
  getShowsForSong,
  getShowsForTour,
  getShowWithSetlist,
  getSongById,
  getSongBySlug,
  getSongStats,
  getTopClosersByYear,
  getTopClosingSongs,
  getTopEncoreSongs,
  getTopEncoresByYear,
  getTopOpenersByYear,
  getTopOpeningSongs,
  getTopSongsByPerformances,
  getTopVenuesByShows,
  getTourById,
  getTourStatsByYear,
  getToursGroupedByDecade,
  // User data
  getUserAttendedShows,
  getUserFavoriteSongs,
  getUserFavoriteVenues,
  getVenueById,
  getVenueStats,
  getYearBreakdownForGuest,
  getYearBreakdownForSong,
  getYearBreakdownForVenue,
  getYearRange,
  // Search
  globalSearch,
  hasUserAttendedShow,
  hasUserFavoritedSong,
  removeUserAttendedShow,
  removeUserFavoriteSong,
  removeUserFavoriteVenue,
  searchGuests,
  searchSongs,
  searchVenues,
} from './queries';
export type {
  CuratedListItemType,
  // Curated content
  DexieCuratedList,
  DexieCuratedListItem,
  DexieGuest,
  DexieGuestAppearance,
  DexieLiberationEntry,
  // Releases
  DexieRelease,
  DexieReleaseTrack,
  DexieSetlistEntry,
  DexieShow,
  DexieSong,
  DexieSongStatistics,
  DexieTour,
  // Core entities
  DexieVenue,
  EmbeddedSong,
  EmbeddedTour,
  // Embedded types
  EmbeddedVenue,
  LiberationConfiguration,
  ReleaseType,
  SearchResult,
  SetType,
  SlotType,
  // Meta
  SyncMeta,
  // User data
  UserAttendedShow,
  UserFavoriteSong,
  UserFavoriteVenue,
  // Enums
  VenueType,
} from './schema';
// Schema and types
export {
  DEXIE_SCHEMA,
  isDexieShow,
  isDexieSong,
  isDexieVenue,
} from './schema';
export type {
  ChunkedSyncResponse,
  FullSyncResponse,
  SyncOptions,
  SyncProgress,
} from './sync';
// Sync functions
export {
  autoSync,
  performFullSync,
  performIncrementalSync,
  shouldSync,
} from './sync';

// Validation and data integrity
export {
  // Song stats validation
  validateAllSongStats,
  validateSongStats,
  fixAllSongStats,
  previewFixes,
  generateMismatchReport,
  getMismatchSummary,
  // Data integrity
  validateDataIntegrity,
  generateIntegrityReport,
  quickHealthCheck,
  quickForeignKeyCheck,
  // Integrity hooks
  initializeIntegrityHooks,
  teardownIntegrityHooks,
  forceFlushPendingUpdates,
  recalculateSongStats,
} from './validation';

export type {
  SongStatsMismatch,
  SongStatsValidationResult,
  SongStatsRepairResult,
  ForeignKeyViolation,
  OrphanedRecord,
  DataIntegrityResult,
  ValidationOptions,
} from './validation';

// Migrations and repairs
export {
  runSongCountsRepair,
  previewSongCountsRepair,
  isRepairNeeded,
  getMismatchStatus,
  generateRepairLog,
} from './migrations';

export type {
  RepairMigrationResult,
  ProgressCallback,
} from './migrations';

// Note: Hooks are exported from './hooks' separately since they require 'use client'
// Import hooks directly: import { useAllSongs } from '@/lib/db/dexie/hooks'
// Import data loader hook: import { useDataLoader } from '@/lib/db/dexie/useDataLoader'

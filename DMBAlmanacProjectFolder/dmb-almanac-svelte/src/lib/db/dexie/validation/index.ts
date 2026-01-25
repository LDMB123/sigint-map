/**
 * Data Validation Module
 *
 * Exports all validation, integrity checking, and repair utilities
 * for the DMB Almanac Dexie database.
 */

// Song statistics validation
export {
  calculateSongStats,
  calculateAllSongStats,
  compareSongStats,
  validateAllSongStats,
  validateSongStats,
  getTopMismatches,
  getMismatchSummary,
  fixSongStats,
  fixAllSongStats,
  previewFixes,
  generateMismatchReport,
  exportMismatchesAsJson,
  type SongStatsMismatch,
  type SongStatsValidationResult,
  type SongStatsRepairResult,
  type CalculatedSongStats,
} from './song-stats-validator';

// Data integrity validation
export {
  validateDataIntegrity,
  generateIntegrityReport,
  exportValidationAsJson,
  quickForeignKeyCheck,
  quickHealthCheck,
  type ForeignKeyViolation,
  type OrphanedRecord,
  type EmbeddedDataMismatch,
  type TableStats,
  type DataIntegrityResult,
  type ValidationOptions,
} from './data-integrity';

// Integrity hooks
export {
  initializeIntegrityHooks,
  teardownIntegrityHooks,
  forceFlushPendingUpdates,
  hasPendingUpdates,
  getPendingUpdateCount,
  recalculateSongStats,
  recalculateMultipleSongStats,
} from './integrity-hooks';

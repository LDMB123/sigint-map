/**
 * Database Migrations Module
 *
 * Exports all migration and repair utilities
 * for the DMB Almanac Dexie database.
 */

// Song counts repair migration
export {
  runSongCountsRepair,
  previewSongCountsRepair,
  isRepairNeeded,
  getMismatchStatus,
  repairSingleSong,
  repairMultipleSongs,
  generateRepairLog,
  exportRepairResultAsJson,
  type RepairMigrationResult,
  type ProgressCallback,
} from './repair-song-counts';

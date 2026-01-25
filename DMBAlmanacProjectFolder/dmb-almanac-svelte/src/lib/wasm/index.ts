/**
 * DMB Almanac - WASM Bridge Module
 *
 * Public API for WebAssembly integration.
 * Provides a clean interface for calling Rust/WASM functions from SvelteKit.
 *
 * Usage:
 * ```typescript
 * import { getWasmBridge, initializeWasm, wasmIsReady } from '$lib/wasm';
 *
 * // Initialize early in app lifecycle
 * await initializeWasm();
 *
 * // Use the bridge for computations
 * const bridge = getWasmBridge();
 * const result = await bridge.calculateSongStatistics(songs);
 *
 * // Check state in components
 * {#if $wasmIsReady}
 *   <p>WASM is ready!</p>
 * {/if}
 * ```
 */

// ==================== BRIDGE ====================

export {
  getWasmBridge,
  initializeWasm,
  createWasmStores,
  WasmBridge,
} from './bridge';

// ==================== STORES ====================

export {
  // State stores
  wasmLoadState,
  wasmIsReady,
  wasmStats,

  // Analytics stores
  songStatisticsStore,
  liberationListStore,
  yearlyStatisticsStore,
  setlistSimilarityStore,

  // Operation tracking
  wasmOperations,
  isAnyWasmOperationRunning,
  pendingWasmOperationCount,

  // Store factories
  createReactiveWasmStore,
  createOperationTracker,
  createWasmState,

  // Utilities
  preloadWasm,

  // Types
  type AsyncWasmState,
} from './stores';

// ==================== TYPES ====================

export type {
  // Module types
  WasmExports,
  WasmInitOutput,

  // Data transfer types
  WasmSongInput,
  WasmShowInput,
  WasmSetlistEntryInput,
  WasmSongStatisticsOutput,
  WasmShowStatisticsOutput,
  WasmLiberationEntryOutput,
  WasmYearlyStatisticsOutput,

  // Bridge state types
  WasmLoadState,
  WasmResult,
  WasmBridgeConfig,

  // Worker types
  WorkerRequest,
  WorkerResponse,

  // Serialization types
  SerializationOptions,

  // Performance types
  WasmPerformanceMetrics,
  WasmPerformanceStats,
} from './types';

export {
  DEFAULT_WASM_CONFIG,
  SHORT_KEY_MAP,
  isWasmLoadError,
  isWasmReady,
  isWasmResultSuccess,
  isWasmResultError,
} from './types';

// ==================== SERIALIZATION ====================

export {
  // JSON utilities
  serializeWithBigInt,
  deserializeWithBigInt,
  serializeForWasm,
  deserializeFromWasm,

  // Key compression
  shortenKeys,
  expandKeys,
  serializeArrayShortKeys,
  deserializeArrayShortKeys,

  // Entity transformers
  songToWasmInput,
  showToWasmInput,
  setlistEntryToWasmInput,
  songsToWasmInput,
  showsToWasmInput,
  setlistEntriesToWasmInput,

  // Basic typed arrays
  toTypedArray,
  fromTypedArray,
  fromBigInt64Array,
  toBigInt64Array,
  encodeString,
  decodeString,

  // Zero-copy typed array utilities
  viewTypedArrayFromWasm,
  copyTypedArrayFromWasm,
  writeTypedArrayToWasm,
  getTypedArrayConstructor,
  WASM_TYPE_SIZES,

  // Parallel typed arrays
  viewParallelArraysFromWasm,
  copyParallelArraysFromWasm,
  parallelArraysToObjects,
  objectsToTypedArray,
  objectsToBigInt64Array,

  // Interleaved data
  deinterleaveTypedArray,
  interleaveTypedArrays,

  // SharedArrayBuffer
  isSharedArrayBufferSupported,
  createSharedBuffer,
  writeToSharedBuffer,
  readFromSharedBuffer,

  // Chunked transfer
  chunkArray,
  serializeInChunks,

  // Validation
  validateWasmResponse,

  // Serialization Types
  type TypedArrayContainer,
  type TypedArray,
  type NumericTypedArray,
  type BigIntTypedArray,
  type ParallelTypedArrays,
} from './serialization';

// ==================== FALLBACK ====================

export {
  // All fallback implementations
  fallbackImplementations,

  // Individual fallbacks (for direct use)
  calculateSongRarity,
  calculateSongStatistics,
  findSongGaps,
  calculateShowRarity,
  findRareShows,
  calculateSetlistSimilarity,
  calculateTourStatistics,
  findTourPatterns,
  calculateVenueStatistics,
  computeLiberationList,
  updateLiberationEntry,
  buildSearchIndex,
  searchIndex,
  freeSearchIndex,
  aggregateYearlyStatistics,
  calculateSlotStatistics,
  validateSetlistIntegrity,
  validateShowData,

  // Type
  type FallbackMethod,
} from './fallback';

// ==================== WASM-ACCELERATED QUERIES ====================

export {
  // Global search
  wasmGlobalSearch,

  // Tour statistics
  wasmGetTourStatsByYear,
  wasmGetToursGroupedByDecade,

  // Guest aggregations
  wasmGetYearBreakdownForGuest,
  wasmGetShowIdsForGuest,

  // Song aggregations
  wasmGetShowIdsForSong,
  wasmCountEncoresByYear,
  wasmGetYearBreakdownForSong,

  // Venue aggregations
  wasmGetYearBreakdownForVenue,

  // Top slot songs
  wasmGetTopOpeningSongs,
  wasmGetTopClosingSongs,
  wasmGetTopEncoreSongs,

  // Top songs by performances
  wasmGetTopSongsByPerformances,

  // Shows summary
  wasmGetShowsByYearSummary,

  // Types
  type SearchResult,
  type TourYearStats,
  type YearCount,
  type SongWithCount,
} from './queries';

// ==================== ADVANCED WASM MODULES ====================

export {
  // Engine classes
  TfIdfSearchEngine,
  SetlistSimilarityEngine,
  RarityEngine,
  SetlistPredictor,

  // Date utilities namespace
  DateUtils,

  // Singleton getters
  getTfIdfSearch,
  getSimilarityEngine,
  getRarityEngine,
  getPredictor,

  // Convenience functions
  initializeAllEngines,
  resetAllEngines,

  // Types
  type TfIdfSearchResult,
  type AutocompleteResult,
  type SimilarShowResult,
  type CoOccurrenceEntry,
  type ClusterResult,
  type SongRarity,
  type ShowRarity,
  type GapAnalysis,
  type RarityDistribution,
  type PredictionSignals,
  type AdvancedPrediction,
  type BustCandidate,
  type EnsemblePrediction,
  type PredictionContext,
  type SequenceMatch,
  type VenuePattern,
  type VenueSongStat,
  type SeasonalPattern,
  type SeasonalSongStat,
  type DateMetadata,
  type SeasonInfo,
  type AnniversaryInfo,
  type DateCluster,
  type TypedArrayResult,
} from './advanced-modules';

// ==================== DATA TRANSFORMS ====================

export {
  // Core transforms (WASM-accelerated with JS fallback)
  transformSongs,
  transformVenues,
  transformTours,
  transformShows,
  transformSetlistEntries,

  // Validation
  validateForeignKeys,

  // Search text generation
  generateSongSearchText,
  generateVenueSearchText,

  // WASM availability
  isWasmAvailable,
  getWasmVersion,
  preloadWasm as preloadWasmTransform,

  // Zero-copy TypedArray transforms
  extractShowYearsTyped,
  extractSongIdsTyped,
  extractShowIdsTyped,
  extractPositionsTyped,
  computeSongPlayCountsTyped,
  computeShowSongCountsTyped,
  computeRarityScoresTyped,

  // TypedArray utility functions
  uniqueInt32,
  filterInt32,
  sumTypedArray,
  minMaxTypedArray,
  countOccurrences,
  parallelArraysToObjectArray,

  // Types
  type TransformResult,
  type TypedArrayTransformResult,
  type ValidationWarning,
  type TransformedSyncData,
} from './transform';

// ==================== FORCE SIMULATION ====================

export {
  // Factory function
  createForceSimulation,

  // Backend implementations (for advanced usage)
  createMainThreadSimulation,
  createWorkerSimulation,
  createNoOpSimulation,

  // D3 compatibility
  toD3Compatible,

  // TypedArray utilities
  allocatePositionBuffer,
  packNodesIntoBuffer,
  unpackBufferIntoNodes,

  // Constants
  DEFAULT_FORCES,
  VALUES_PER_NODE,

  // Types
  type ForceNode,
  type ForceLink,
  type ForceSimulationConfig,
  type ForceConfigs,
  type ForceSimulation,
  type SimulationState,
  type TickCallback,
  type EndCallback,
} from './forceSimulation';

// ==================== YEAR AGGREGATIONS ====================

export {
  // TypedArray utilities
  createYearCountsArray,
  typedArrayToYearCounts,
  yearCountsToTypedArray,
  mergeYearCounts,

  // Show aggregations
  aggregateShowsByYear,
  getShowsGroupedByYear,

  // Song aggregations
  aggregateSongsPerYear,
  aggregateUniqueSongsPerYear,
  getSongYearBreakdown,

  // Comprehensive statistics
  calculateYearStatistics,
  getYearlyAverages,

  // Slot aggregations by year
  aggregateOpenersByYear,
  aggregateClosersByYear,
  aggregateEncoresByYear,

  // Batch operations
  batchGetSongYearBreakdowns,

  // WASM-accelerated core aggregations (query-helpers.ts replacements)
  wasmAggregateByYear,
  wasmCountSongsFromEntries,
  wasmAggregateByYearWithUniqueShows,

  // TypedArray batch aggregations
  batchCountSongsTyped,
  batchAggregateYearsTyped,
  batchAggregateMultiField,

  // Helper exports
  extractYearFast,
  yearToIndex,
  indexToYear,
  BASE_YEAR,
  MAX_YEAR_SPAN,

  // Types
  type YearCount as AggregationYearCount,
  type YearStatistics,
  type YearlyAverages,
  type SongYearBreakdown,
  type YearAggregationResult,
  type ComprehensiveYearStats,
  type SongWithCount as AggregationSongWithCount,
  type TypedYearAggregation,
} from './aggregations';

// ==================== WASM-ACCELERATED SEARCH ====================

export {
  // Text normalization
  wasmNormalizeSearchText,
  wasmNormalizeSearchTextBatch,
  normalizeSearchTextSync,

  // Optimized global search
  wasmGlobalSearchOptimized,

  // TypedArray batch search
  wasmBatchSearchTyped,

  // Incremental search (for typeahead)
  wasmIncrementalSearch,
  resetIncrementalSearch,

  // Feature detection
  isWasmSearchAvailable,
  resetWasmSearchAvailability,

  // Types
  type GlobalSearchResults,
  type SearchableData,
} from './search';

// ==================== WASM-ACCELERATED VALIDATION ====================

export {
  // Core validation functions
  wasmValidateForeignKeys,
  wasmFindOrphanedEntities,
  wasmBuildReferenceSet,
  wasmBatchValidateForeignKeys,

  // High-level convenience functions
  validateSetlistEntryForeignKeys as wasmValidateSetlistEntryForeignKeys,
  validateShowForeignKeys as wasmValidateShowForeignKeys,
  findOrphanedSongs as wasmFindOrphanedSongs,
  findOrphanedVenues as wasmFindOrphanedVenues,

  // TypedArray utilities
  binarySearchInt32,
  hasInt32,
  hasAllInt32,
  setDifferenceInt32,
  setIntersectionInt32,
  sortInt32,
  uniqueSortedInt32,

  // Feature detection
  isWasmValidationAvailable,
  preloadWasmValidation,

  // Types
  type ForeignKeyValidationResult,
  type OrphanDetectionResult,
  type ReferenceSetResult,
  type BatchForeignKeyResult,
  type ValidationOptions as WasmValidationOptions,
} from './validation';

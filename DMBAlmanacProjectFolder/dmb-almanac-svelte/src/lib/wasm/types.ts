/**
 * DMB Almanac - WASM Bridge Types
 *
 * Type definitions for the Rust/WASM to JavaScript/TypeScript bridge layer.
 * These types define the interface between the WASM module and the JS runtime.
 */

// ==================== WASM MODULE INTERFACE ====================

/**
 * WASM module exports - functions callable from JavaScript.
 * These must match the #[wasm_bindgen] exports from Rust.
 */
export interface WasmExports {
  // Memory management
  readonly memory: WebAssembly.Memory;
  alloc(size: number): number;
  dealloc(ptr: number, size: number): void;

  // Initialization
  init_module(): void;

  // Song analytics
  calculateSongRarity(show_count: number, total_shows: number): number;
  calculateSongStatistics(songs_json: string): string;
  findSongGaps(setlist_entries_json: string): string;

  // Show analytics
  calculateShowRarity(setlist_json: string, song_stats_json: string): number;
  findRareShows(shows_json: string, threshold: number): string;
  calculateSetlistSimilarity(setlist_a_json: string, setlist_b_json: string): number;

  // Tour analytics
  calculateTourStatistics(tour_shows_json: string): string;
  findTourPatterns(shows_json: string): string;

  // Venue analytics
  calculateVenueStatistics(venue_shows_json: string): string;

  // Liberation list
  computeLiberationList(songs_json: string, setlist_entries_json: string): string;
  updateLiberationEntry(entry_json: string, latest_show_date: string): string;

  // Search optimization
  buildSearchIndex(entities_json: string): number; // Returns index handle
  searchIndex(index_handle: number, query: string, limit: number): string;
  freeSearchIndex(index_handle: number): void;

  // Statistics aggregation
  aggregateYearlyStatistics(shows_json: string, setlist_entries_json: string): string;
  calculateSlotStatistics(setlist_entries_json: string): string;

  // Data validation
  validateSetlistIntegrity(setlist_json: string): string;
  validateShowData(show_json: string): string;

  // Global search - UPDATED to include tours_json parameter
  globalSearch(songs_json: string, venues_json: string, guests_json: string, tours_json: string, query: string, limit: number): string;

  // Tour stats
  getTourStatsByYear(shows_json: string, entries_json: string, year: number): string;
  getToursGroupedByDecade(tours_json: string): string;

  // Guest stats
  getYearBreakdownForGuest(appearances_json: string, guest_id: number): string;

  // Encore and show IDs
  countEncoresByYear(entries_json: string, year: number): string;
  getShowIdsForSong(entries_json: string, song_id: number): string;
  getShowIdsForGuest(appearances_json: string, guest_id: number): string;

  // Slot-based aggregations
  countOpenersByYear(entries_json: string, year: number): string;
  countClosersByYear(entries_json: string, year: number): string;
  aggregateShowsByYear(shows_json: string): string;

  // Year breakdowns for entities
  getYearBreakdownForSong(entries_json: string, song_id: number): string;
  getYearBreakdownForVenue(shows_json: string, venue_id: number): string;

  // Top songs
  getTopSongsByPerformances(entries_json: string, limit: number): string;

  // Combined top slot songs (opener, closer, encore in single pass)
  getTopSlotSongsCombined(entries_json: string, limit: number): string;
  getTopSlotSongsCombinedByYear(entries_json: string, year: number, limit: number): string;

  // TypedArray returns (zero-copy transfer for performance-critical operations)
  getShowIdsForSongTyped(entries_json: string, song_id: bigint): BigInt64Array;
  getSongIdsForVenueTyped(shows_json: string, entries_json: string, venue_id: bigint): BigInt64Array;
  getPlayCountsPerSong(entries_json: string): { songIds: BigInt64Array; counts: Int32Array };
  getUniqueYearsTyped(shows_json: string): Int32Array;

  // Phase 1 Migration: Aggregation functions (dmb-transform)
  aggregateSongsPerYear(entries_json: string): string;
  aggregateUniqueSongsPerYear(entries_json: string): string;
  aggregateYearlyStatistics(shows_json: string, entries_json: string, year: number): string;
  aggregateAllYearlyStatistics(shows_json: string, entries_json: string): string;

  // Phase 1 Migration: TypedArray extraction utilities (dmb-transform)
  extractShowYearsTyped(shows_json: string): Int32Array;
  extractSongIdsTyped(entries_json: string): BigInt64Array;
  extractShowIdsFromEntriesTyped(entries_json: string): BigInt64Array;
  getUniqueSongIdsTyped(entries_json: string): BigInt64Array;
  getUniqueShowIdsTyped(entries_json: string): BigInt64Array;
  computeShowCountsByYearTyped(shows_json: string): { years: Int32Array; counts: Int32Array };

  // Phase 1 Migration: String normalization (dmb-string-utils)
  normalizeSearchText(text: string): string;
  normalizeSearchTextBatch(inputs: string[]): string[];

  // NEW: Phase 2 Migration - Batch aggregation functions
  batchCountSongsTyped(entries_json: string): { songIds: BigInt64Array; counts: Int32Array };
  batchAggregateMultiField(entries_json: string): string;
}

/**
 * WASM module initialization output from wasm-bindgen
 */
export interface WasmInitOutput {
  memory: WebAssembly.Memory;
  // Add other exports as needed
}

// ==================== DATA TRANSFER TYPES ====================

/**
 * Serializable song data for WASM processing
 */
export interface WasmSongInput {
  id: number;
  title: string;
  slug: string;
  total_performances: number;
  opener_count: number;
  closer_count: number;
  encore_count: number;
  first_played_date: string | null;
  last_played_date: string | null;
  is_cover: boolean;
}

/**
 * Serializable show data for WASM processing
 */
export interface WasmShowInput {
  id: number;
  date: string;
  venue_id: number;
  tour_id: number;
  song_count: number;
  rarity_index: number | null;
}

/**
 * Serializable setlist entry for WASM processing
 */
export interface WasmSetlistEntryInput {
  id: number;
  show_id: number;
  song_id: number;
  position: number;
  set_name: string;
  slot: string;
  is_segue: boolean;
  show_date: string;
  year: number;
}

/**
 * Song statistics output from WASM
 */
export interface WasmSongStatisticsOutput {
  song_id: number;
  rarity_score: number;
  gap_days: number | null;
  gap_shows: number | null;
  slot_distribution: {
    opener: number;
    closer: number;
    midset: number;
    encore: number;
  };
  yearly_breakdown: Record<number, number>;
}

/**
 * Show statistics output from WASM
 */
export interface WasmShowStatisticsOutput {
  show_id: number;
  rarity_index: number;
  unique_song_count: number;
  rare_song_count: number;
  bust_out_count: number;
}

/**
 * Liberation entry output from WASM
 */
export interface WasmLiberationEntryOutput {
  song_id: number;
  last_played_date: string;
  last_played_show_id: number;
  days_since: number;
  shows_since: number;
  is_liberated: boolean;
}

/**
 * Yearly statistics output from WASM (legacy format)
 */
export interface WasmYearlyStatisticsOutput {
  year: number;
  show_count: number;
  unique_songs: number;
  average_setlist_length: number;
  most_played_songs: Array<{ song_id: number; count: number }>;
  top_openers: Array<{ song_id: number; count: number }>;
  top_closers: Array<{ song_id: number; count: number }>;
}

/**
 * Comprehensive yearly statistics from Phase 1 WASM migration
 * Matches Rust YearlyStatistics struct in dmb-transform/aggregation.rs
 */
export interface WasmYearlyStatisticsV2 {
  year: number;
  show_count: number;
  total_songs: number;
  unique_songs: number;
  unique_venues: number;
  avg_songs_per_show: number;
  opener_count: number;
  closer_count: number;
  encore_count: number;
}

/**
 * Search result output from WASM
 */
export interface WasmSearchResult {
  entityType: string;
  id: number;
  title: string;
  slug: string;
  score: number;
}

/**
 * Tour year statistics output from WASM
 */
export interface WasmTourYearStats {
  year: number;
  showCount: number;
  uniqueVenues: number;
  uniqueStates: number;
  uniqueSongs: number;
}

/**
 * Song with count output from WASM
 */
export interface WasmSongWithCount {
  songId: number;
  count: number;
}

/**
 * Year count output from WASM
 */
export interface WasmYearCount {
  year: number;
  count: number;
}

// ==================== BRIDGE STATE TYPES ====================

/**
 * WASM module loading states
 */
export type WasmLoadState =
  | { status: 'idle' }
  | { status: 'loading'; progress: number }
  | { status: 'ready'; loadTime: number }
  | { status: 'error'; error: Error; fallbackActive: boolean };

/**
 * WASM operation result - discriminated union for success/error
 */
export type WasmResult<T> =
  | { success: true; data: T; executionTime: number; usedWasm: boolean }
  | { success: false; error: Error; usedWasm: boolean };

/**
 * Configuration for WASM bridge
 */
export interface WasmBridgeConfig {
  /** Path to the WASM file */
  wasmPath: string;
  /** Path to the JavaScript glue code */
  jsGluePath: string;
  /** Enable fallback to pure JS implementations */
  enableFallback: boolean;
  /** Timeout for WASM operations in milliseconds */
  operationTimeout: number;
  /** Maximum retries for failed operations */
  maxRetries: number;
  /** Enable performance logging */
  enablePerfLogging: boolean;
  /** Use Web Worker for WASM execution */
  useWorker: boolean;
  /** SharedArrayBuffer size for zero-copy transfers (0 to disable) */
  sharedBufferSize: number;
}

/**
 * Default configuration
 */
export const DEFAULT_WASM_CONFIG: WasmBridgeConfig = {
  wasmPath: '/wasm/dmb-transform/pkg/dmb_transform_bg.wasm',
  jsGluePath: '/wasm/dmb-transform/pkg/dmb_transform.js',
  enableFallback: true,
  operationTimeout: 30000, // 30 seconds
  maxRetries: 3,
  enablePerfLogging: import.meta.env?.DEV ?? false,
  useWorker: true,
  sharedBufferSize: 16 * 1024 * 1024, // 16MB
};

// ==================== WORKER MESSAGE TYPES ====================

/**
 * Messages sent TO the worker
 */
export type WorkerRequest =
  | { type: 'init'; config: Partial<WasmBridgeConfig> }
  | { type: 'call'; id: string; method: keyof WasmExports; args: unknown[] }
  | { type: 'abort'; id: string }
  | { type: 'terminate' };

/**
 * Messages sent FROM the worker
 */
export type WorkerResponse =
  | { type: 'init-success'; loadTime: number }
  | { type: 'init-error'; error: string }
  | { type: 'result'; id: string; data: unknown; executionTime: number }
  | { type: 'error'; id: string; error: string }
  | { type: 'progress'; id: string; progress: number; message?: string }
  | { type: 'log'; level: 'debug' | 'info' | 'warn' | 'error'; message: string };

// ==================== SERIALIZATION HELPERS ====================

/**
 * JSON serialization options for WASM data transfer
 */
export interface SerializationOptions {
  /** Use BigInt for large IDs */
  useBigInt: boolean;
  /** Omit null values to reduce payload size */
  omitNulls: boolean;
  /** Use abbreviated keys to reduce payload size */
  useShortKeys: boolean;
}

/**
 * Short key mappings for abbreviated serialization
 */
export const SHORT_KEY_MAP = {
  id: 'i',
  song_id: 'si',
  show_id: 'hi',
  venue_id: 'vi',
  tour_id: 'ti',
  date: 'd',
  title: 't',
  slug: 's',
  position: 'p',
  set_name: 'sn',
  slot: 'sl',
  is_segue: 'sg',
  show_date: 'sd',
  year: 'y',
  total_performances: 'tp',
  opener_count: 'oc',
  closer_count: 'cc',
  encore_count: 'ec',
  first_played_date: 'fp',
  last_played_date: 'lp',
  is_cover: 'ic',
  song_count: 'sc',
  rarity_index: 'ri',
} as const;

export type ShortKeyMap = typeof SHORT_KEY_MAP;
export type LongKey = keyof ShortKeyMap;
export type ShortKey = ShortKeyMap[LongKey];

// ==================== PERFORMANCE TRACKING ====================

/**
 * Performance metrics for WASM operations
 */
export interface WasmPerformanceMetrics {
  operationName: string;
  startTime: number;
  endTime: number;
  executionTime: number;
  inputSize: number;
  outputSize: number;
  usedWasm: boolean;
  memoryUsage?: {
    before: number;
    after: number;
    delta: number;
  };
}

/**
 * Aggregated performance statistics
 */
export interface WasmPerformanceStats {
  totalCalls: number;
  wasmCalls: number;
  fallbackCalls: number;
  averageExecutionTime: number;
  maxExecutionTime: number;
  minExecutionTime: number;
  totalDataProcessed: number;
  errorCount: number;
}

// ==================== TYPE GUARDS ====================

export function isWasmLoadError(state: WasmLoadState): state is Extract<WasmLoadState, { status: 'error' }> {
  return state.status === 'error';
}

export function isWasmReady(state: WasmLoadState): state is Extract<WasmLoadState, { status: 'ready' }> {
  return state.status === 'ready';
}

export function isWasmResultSuccess<T>(result: WasmResult<T>): result is Extract<WasmResult<T>, { success: true }> {
  return result.success === true;
}

export function isWasmResultError<T>(result: WasmResult<T>): result is Extract<WasmResult<T>, { success: false }> {
  return result.success === false;
}

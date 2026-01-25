/**
 * DMB Almanac - Advanced WASM Module Wrappers
 *
 * Type-safe TypeScript interfaces for advanced WASM modules:
 * - TF-IDF Search Engine
 * - Setlist Similarity Engine
 * - Rarity Computation Engine
 * - Advanced Setlist Predictor
 * - Date Utilities
 */

import { browser } from '$app/environment';

// ==================== TYPE DEFINITIONS ====================

// TF-IDF Search Types
export interface TfIdfSearchResult {
  id: number;
  title: string;
  score: number;
  matchedTerms: string[];
}

export interface AutocompleteResult {
  term: string;
  frequency: number;
  documentCount: number;
}

// Setlist Similarity Types
export interface SimilarShowResult {
  showId: number;
  similarity: number;
  sharedSongs: number;
  method: 'jaccard' | 'cosine' | 'overlap';
}

export interface CoOccurrenceEntry {
  songA: number;
  songB: number;
  count: number;
  percentage: number;
}

export interface ClusterResult {
  clusterId: number;
  showIds: number[];
  centroidSongs: number[];
  avgSimilarity: number;
}

// Rarity Types
export interface SongRarity {
  songId: number;
  title: string;
  inverseFrequency: number;
  logScaled: number;
  percentile: number;
  gapBased: number;
  combinedScore: number;
}

export interface ShowRarity {
  showId: number;
  date: string;
  avgSongRarity: number;
  uniqueSongCount: number;
  rareSongCount: number;
  rarityScore: number;
}

export interface GapAnalysis {
  songId: number;
  title: string;
  daysSinceLast: number;
  showsSinceLast: number;
  averageGap: number;
  maxGap: number;
  gapRank: number;
}

export interface RarityDistribution {
  bucket: string;
  count: number;
  percentage: number;
  songIds: number[];
}

// Advanced Predictor Types
export interface PredictionSignals {
  markov1: number;
  markov2: number;
  markov3: number;
  positionScore: number;
  recencyScore: number;
  gapScore: number;
  venueScore: number;
  seasonalScore: number;
}

export interface AdvancedPrediction {
  songId: number;
  title: string;
  score: number;
  confidence: number;
  signals: PredictionSignals;
}

export interface BustCandidate {
  songId: number;
  title: string;
  daysSinceLast: number;
  showsSinceLast: number;
  bustScore: number;
  historicalFrequency: number;
  expectedVsActual: number;
}

export interface EnsemblePrediction {
  context: PredictionContext;
  predictions: AdvancedPrediction[];
  bustCandidates: BustCandidate[];
  openerPredictions: AdvancedPrediction[];
  closerPredictions: AdvancedPrediction[];
}

export interface PredictionContext {
  currentSongIds: number[];
  setPosition: string;
  venueId?: number;
  month?: number;
  dayOfWeek?: number;
}

export interface SequenceMatch {
  sequence: number[];
  titles: string[];
  occurrences: number;
  showDates: string[];
  probability: number;
}

export interface VenuePattern {
  venueId: number;
  venueName: string;
  signatureSongs: VenueSongStat[];
  openerTendencies: AdvancedPrediction[];
  closerTendencies: AdvancedPrediction[];
  uniqueSongs: number[];
}

export interface VenueSongStat {
  songId: number;
  title: string;
  timesPlayed: number;
  venueRate: number;
  overallRate: number;
  venueAffinity: number;
}

export interface SeasonalPattern {
  month: number;
  monthName: string;
  topSongs: SeasonalSongStat[];
  openers: AdvancedPrediction[];
  closers: AdvancedPrediction[];
}

export interface SeasonalSongStat {
  songId: number;
  title: string;
  monthlyRate: number;
  yearlyAverage: number;
  seasonalBoost: number;
}

// Date Utilities Types
export interface DateMetadata {
  year: number;
  month: number;
  day: number;
  dayOfWeek: number;
  dayOfWeekName: string;
  dayOfYear: number;
  weekOfYear: number;
  quarter: number;
  isWeekend: boolean;
  season: string;
}

export interface SeasonInfo {
  season: string;
  tourPeriod: string;
  isGorgeWeekend: boolean;
  isNewYearsRun: boolean;
  isSummerTour: boolean;
}

export interface AnniversaryInfo {
  showId: number;
  date: string;
  yearsAgo: number;
  isSignificant: boolean;
}

export interface DateCluster {
  startDate: string;
  endDate: string;
  dateCount: number;
  daySpan: number;
  isTourRun: boolean;
}

// Typed Array Results
export interface TypedArrayResult {
  songIds?: Int32Array | BigInt64Array;
  showIds?: Int32Array | BigInt64Array;
  scores?: Float32Array | Float64Array;
  counts?: Int32Array | Uint32Array;
  count: number;
}

// ==================== WASM MODULE TYPE DEFINITIONS ====================

/**
 * TF-IDF WASM module export interface
 */
interface TfIdfIndexModule {
  indexSongs(songsJson: string): void;
  indexVenues(venuesJson: string): void;
  indexGuests(guestsJson: string): void;
  search(query: string, limit: number): TfIdfSearchResult[];
  searchByType(query: string, entityType: 'song' | 'venue' | 'guest', limit: number): TfIdfSearchResult[];
  searchPhrase(phrase: string, limit: number): TfIdfSearchResult[];
  autocomplete(prefix: string, limit: number): AutocompleteResult[];
  searchScoresTyped(query: string, limit: number): TypedArrayResult;
}

/**
 * Setlist Similarity WASM module export interface
 */
interface SetlistSimilarityEngineModule {
  initialize(setlistEntriesJson: string, totalSongs: number): void;
  findSimilarShows(targetShowId: number, method: 'jaccard' | 'cosine' | 'overlap', limit: number): SimilarShowResult[];
  compareShows(showIdA: number, showIdB: number): {
    jaccard: number;
    cosine: number;
    overlap: number;
    sharedSongs: number[];
  };
  getSharedSongs(showIdA: number, showIdB: number): number[];
  computeCoOccurrenceMatrix(minOccurrences: number): CoOccurrenceEntry[];
  findAssociatedSongs(songId: number, limit: number): {
    songId: number;
    coOccurrenceCount: number;
    probability: number;
  }[];
  calculateDiversity(showId: number): number;
  clusterShows(numClusters: number, maxIterations: number): ClusterResult[];
  getSimilaritiesTyped(targetShowId: number, limit: number): TypedArrayResult;
}

/**
 * Rarity computation WASM module export interface
 */
interface RarityEngineModule {
  initialize(setlistEntriesJson: string, songsJson: string): void;
  computeSongRarity(songId: number): SongRarity;
  computeAllSongRarities(): SongRarity[];
  computeShowRarity(showId: number): ShowRarity;
  computeAllShowRarities(): ShowRarity[];
  computeGapAnalysis(): GapAnalysis[];
  getTopSongsByGap(limit: number): GapAnalysis[];
  computeRarityDistribution(numBuckets: number): RarityDistribution[];
  getSongRaritiesTyped(): TypedArrayResult & { rarities: Float32Array };
  getShowRaritiesTyped(): TypedArrayResult & { rarities: Float32Array };
}

/**
 * Advanced setlist predictor WASM module export interface
 */
interface SetlistPredictorModule {
  initialize(setlistEntriesJson: string, showsJson?: string): void;
  predictEnsemble(contextJson: string, limit: number): EnsemblePrediction;
  getBustCandidates(limit: number): BustCandidate[];
  findMatchingSequences(prefixJson: string, maxLength: number, limit: number): SequenceMatch[];
  analyzeVenuePatterns(venueId: number, venueName?: string): VenuePattern;
  analyzeSeasonalPatterns(month: number): SeasonalPattern;
  getPredictionsTyped(currentSongId: number, limit: number): TypedArrayResult & { probabilities: Float32Array };
  getBustCandidatesTyped(limit: number): TypedArrayResult & { bustScores: Float32Array; gaps: Int32Array };
  getStatistics(): {
    totalShows: number;
    totalSongsPlayed: number;
    uniqueSongs: number;
    firstOrderTransitions: number;
    secondOrderContexts: number;
    thirdOrderContexts: number;
    trackedVenues: number;
  };
}

/**
 * Date utilities WASM module export interface
 */
interface DateUtilsModule {
  parseDateWithMetadata(dateStr: string): DateMetadata;
  getSeasonInfo(dateStr: string): SeasonInfo;
  findAnniversaries(showDatesJson: string, targetDate?: string): AnniversaryInfo[];
  onThisDay(showDatesJson: string, month?: number, day?: number): string[];
  clusterDates(datesJson: string, maxGapDays: number): DateCluster[];
  formatRelative(dateStr: string, referenceDate?: string): string;
  daysBetween(dateA: string, dateB: string): number;
  daysSince(dateStr: string): number;
  batchExtractYearsTyped(datesJson: string): Int32Array;
  getUniqueYearsTyped(datesJson: string): Int32Array;
  batchDaysSinceTyped(datesJson: string): Int32Array;
}

/**
 * WASM module factory interface - constructor signatures
 */
interface WasmModuleConstructors {
  TfIdfIndex: new () => TfIdfIndexModule;
  SetlistSimilarityEngine: new () => SetlistSimilarityEngineModule;
  RarityEngine: new () => RarityEngineModule;
  SetlistPredictor: new () => SetlistPredictorModule;
}

// ==================== WASM MODULE LOADERS ====================

// Module instances (lazy loaded) with proper typing
const tfIdfIndex: TfIdfIndexModule | null = null;
const similarityEngine: SetlistSimilarityEngineModule | null = null;
const rarityEngine: RarityEngineModule | null = null;
const predictor: SetlistPredictorModule | null = null;

// Loading state
let transformModuleLoaded = false;
let segueModuleLoaded = false;
let dateUtilsModuleLoaded = false;

/**
 * Load the dmb-transform WASM module (contains TfIdf, Similarity, Rarity)
 * Note: WASM module paths are resolved at build time by Vite
 */
async function loadTransformModule(): Promise<WasmModuleConstructors & { default: () => Promise<void> }> {
  if (!browser) {
    throw new Error('WASM modules can only be loaded in browser');
  }

  if (!transformModuleLoaded) {
    // @ts-expect-error - WASM module path resolution handled by Vite
    const module = await import('$wasm/dmb-transform/pkg/dmb_transform.js');
    await module.default();
    transformModuleLoaded = true;
    return module as WasmModuleConstructors & { default: () => Promise<void> };
  }

  // @ts-expect-error - WASM module path resolution handled by Vite
  const module = await import('$wasm/dmb-transform/pkg/dmb_transform.js');
  return module as WasmModuleConstructors & { default: () => Promise<void> };
}

/**
 * Load the dmb-segue-analysis WASM module (contains predictor)
 * Note: WASM module paths are resolved at build time by Vite
 */
async function loadSegueModule(): Promise<WasmModuleConstructors & { default: () => Promise<void> }> {
  if (!browser) {
    throw new Error('WASM modules can only be loaded in browser');
  }

  if (!segueModuleLoaded) {
    // @ts-expect-error - WASM module path resolution handled by Vite
    const module = await import('$wasm/dmb-segue-analysis/pkg/dmb_segue_analysis.js');
    await module.default();
    segueModuleLoaded = true;
    return module as WasmModuleConstructors & { default: () => Promise<void> };
  }

  // @ts-expect-error - WASM module path resolution handled by Vite
  const module = await import('$wasm/dmb-segue-analysis/pkg/dmb_segue_analysis.js');
  return module as WasmModuleConstructors & { default: () => Promise<void> };
}

/**
 * Load the dmb-date-utils WASM module
 * Note: WASM module paths are resolved at build time by Vite
 */
async function loadDateUtilsModule(): Promise<DateUtilsModule & { default: () => Promise<void> }> {
  if (!browser) {
    throw new Error('WASM modules can only be loaded in browser');
  }

  if (!dateUtilsModuleLoaded) {
    // @ts-expect-error - WASM module path resolution handled by Vite
    const module = await import('$wasm/dmb-date-utils/pkg/dmb_date_utils.js');
    await module.default();
    dateUtilsModuleLoaded = true;
    return module as DateUtilsModule & { default: () => Promise<void> };
  }

  // @ts-expect-error - WASM module path resolution handled by Vite
  const module = await import('$wasm/dmb-date-utils/pkg/dmb_date_utils.js');
  return module as DateUtilsModule & { default: () => Promise<void> };
}

// ==================== TF-IDF SEARCH API ====================

/**
 * TF-IDF Search Engine wrapper
 */
export class TfIdfSearchEngine {
  private index: TfIdfIndexModule | null = null;
  private initialized = false;

  /**
   * Initialize the search index with songs
   */
  async indexSongs(songsJson: string): Promise<void> {
    const module = await loadTransformModule();
    this.index = new module.TfIdfIndex();
    this.index.indexSongs(songsJson);
    this.initialized = true;
  }

  /**
   * Add venues to the index
   */
  async indexVenues(venuesJson: string): Promise<void> {
    if (!this.index) await this.ensureInitialized();
    if (!this.index) throw new Error('Failed to initialize index');
    this.index.indexVenues(venuesJson);
  }

  /**
   * Add guests to the index
   */
  async indexGuests(guestsJson: string): Promise<void> {
    if (!this.index) await this.ensureInitialized();
    if (!this.index) throw new Error('Failed to initialize index');
    this.index.indexGuests(guestsJson);
  }

  /**
   * Search across all indexed entities
   */
  async search(query: string, limit = 20): Promise<TfIdfSearchResult[]> {
    if (!this.index) throw new Error('Index not initialized');
    return this.index.search(query, limit);
  }

  /**
   * Search by entity type
   */
  async searchByType(query: string, entityType: 'song' | 'venue' | 'guest', limit = 20): Promise<TfIdfSearchResult[]> {
    if (!this.index) throw new Error('Index not initialized');
    return this.index.searchByType(query, entityType, limit);
  }

  /**
   * Search for exact phrase
   */
  async searchPhrase(phrase: string, limit = 20): Promise<TfIdfSearchResult[]> {
    if (!this.index) throw new Error('Index not initialized');
    return this.index.searchPhrase(phrase, limit);
  }

  /**
   * Get autocomplete suggestions
   */
  async autocomplete(prefix: string, limit = 10): Promise<AutocompleteResult[]> {
    if (!this.index) throw new Error('Index not initialized');
    return this.index.autocomplete(prefix, limit);
  }

  /**
   * Get search results as TypedArrays (zero-copy)
   */
  async searchTyped(query: string, limit = 20): Promise<TypedArrayResult> {
    if (!this.index) throw new Error('Index not initialized');
    return this.index.searchScoresTyped(query, limit);
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      const module = await loadTransformModule();
      this.index = new module.TfIdfIndex();
      this.initialized = true;
    }
  }
}

// ==================== SETLIST SIMILARITY API ====================

/**
 * Setlist Similarity Engine wrapper
 */
export class SetlistSimilarityEngine {
  private engine: SetlistSimilarityEngineModule | null = null;
  private initialized = false;

  /**
   * Initialize with setlist data
   */
  async initialize(setlistEntriesJson: string, totalSongs: number): Promise<void> {
    const module = await loadTransformModule();
    this.engine = new module.SetlistSimilarityEngine();
    this.engine.initialize(setlistEntriesJson, totalSongs);
    this.initialized = true;
  }

  /**
   * Find shows similar to a target show
   */
  async findSimilarShows(
    targetShowId: number,
    method: 'jaccard' | 'cosine' | 'overlap' = 'jaccard',
    limit = 10
  ): Promise<SimilarShowResult[]> {
    if (!this.engine) throw new Error('Engine not initialized');
    return this.engine.findSimilarShows(targetShowId, method, limit);
  }

  /**
   * Compare two specific shows
   */
  async compareShows(
    showIdA: number,
    showIdB: number
  ): Promise<{
    jaccard: number;
    cosine: number;
    overlap: number;
    sharedSongs: number[];
  }> {
    if (!this.engine) throw new Error('Engine not initialized');
    return this.engine.compareShows(showIdA, showIdB);
  }

  /**
   * Get songs shared between two shows
   */
  async getSharedSongs(showIdA: number, showIdB: number): Promise<number[]> {
    if (!this.engine) throw new Error('Engine not initialized');
    return this.engine.getSharedSongs(showIdA, showIdB);
  }

  /**
   * Compute song co-occurrence matrix
   */
  async computeCoOccurrenceMatrix(minOccurrences = 5): Promise<CoOccurrenceEntry[]> {
    if (!this.engine) throw new Error('Engine not initialized');
    return this.engine.computeCoOccurrenceMatrix(minOccurrences);
  }

  /**
   * Find songs commonly played with a target song
   */
  async findAssociatedSongs(
    songId: number,
    limit = 10
  ): Promise<{
    songId: number;
    coOccurrenceCount: number;
    probability: number;
  }[]> {
    if (!this.engine) throw new Error('Engine not initialized');
    return this.engine.findAssociatedSongs(songId, limit);
  }

  /**
   * Calculate show diversity score
   */
  async calculateDiversity(showId: number): Promise<number> {
    if (!this.engine) throw new Error('Engine not initialized');
    return this.engine.calculateDiversity(showId);
  }

  /**
   * Cluster shows by similarity (k-means)
   */
  async clusterShows(numClusters: number, maxIterations = 100): Promise<ClusterResult[]> {
    if (!this.engine) throw new Error('Engine not initialized');
    return this.engine.clusterShows(numClusters, maxIterations);
  }

  /**
   * Get similarity scores as TypedArrays
   */
  async getSimilaritiesTyped(targetShowId: number, limit = 100): Promise<TypedArrayResult> {
    if (!this.engine) throw new Error('Engine not initialized');
    return this.engine.getSimilaritiesTyped(targetShowId, limit);
  }
}

// ==================== RARITY ENGINE API ====================

/**
 * Rarity Computation Engine wrapper
 */
export class RarityEngine {
  private engine: RarityEngineModule | null = null;
  private initialized = false;

  /**
   * Initialize with setlist data
   */
  async initialize(setlistEntriesJson: string, songsJson: string): Promise<void> {
    const module = await loadTransformModule();
    this.engine = new module.RarityEngine();
    this.engine.initialize(setlistEntriesJson, songsJson);
    this.initialized = true;
  }

  /**
   * Compute rarity for a single song
   */
  async computeSongRarity(songId: number): Promise<SongRarity> {
    if (!this.engine) throw new Error('Engine not initialized');
    return this.engine.computeSongRarity(songId);
  }

  /**
   * Compute rarity for all songs
   */
  async computeAllSongRarities(): Promise<SongRarity[]> {
    if (!this.engine) throw new Error('Engine not initialized');
    return this.engine.computeAllSongRarities();
  }

  /**
   * Compute rarity for a show
   */
  async computeShowRarity(showId: number): Promise<ShowRarity> {
    if (!this.engine) throw new Error('Engine not initialized');
    return this.engine.computeShowRarity(showId);
  }

  /**
   * Compute rarity for all shows
   */
  async computeAllShowRarities(): Promise<ShowRarity[]> {
    if (!this.engine) throw new Error('Engine not initialized');
    return this.engine.computeAllShowRarities();
  }

  /**
   * Get gap analysis for all songs
   */
  async computeGapAnalysis(): Promise<GapAnalysis[]> {
    if (!this.engine) throw new Error('Engine not initialized');
    return this.engine.computeGapAnalysis();
  }

  /**
   * Get top songs by gap (longest since last played)
   */
  async getTopSongsByGap(limit = 50): Promise<GapAnalysis[]> {
    if (!this.engine) throw new Error('Engine not initialized');
    return this.engine.getTopSongsByGap(limit);
  }

  /**
   * Get rarity distribution statistics
   */
  async computeRarityDistribution(numBuckets = 10): Promise<RarityDistribution[]> {
    if (!this.engine) throw new Error('Engine not initialized');
    return this.engine.computeRarityDistribution(numBuckets);
  }

  /**
   * Get song rarities as TypedArrays
   */
  async getSongRaritiesTyped(): Promise<TypedArrayResult & { rarities: Float32Array }> {
    if (!this.engine) throw new Error('Engine not initialized');
    return this.engine.getSongRaritiesTyped();
  }

  /**
   * Get show rarities as TypedArrays
   */
  async getShowRaritiesTyped(): Promise<TypedArrayResult & { rarities: Float32Array }> {
    if (!this.engine) throw new Error('Engine not initialized');
    return this.engine.getShowRaritiesTyped();
  }
}

// ==================== ADVANCED PREDICTOR API ====================

/**
 * Advanced Setlist Predictor wrapper
 */
export class SetlistPredictor {
  private predictor: SetlistPredictorModule | null = null;
  private initialized = false;

  /**
   * Initialize with historical setlist data
   */
  async initialize(setlistEntriesJson: string, showsJson?: string): Promise<void> {
    const module = await loadSegueModule();
    this.predictor = new module.SetlistPredictor();
    this.predictor.initialize(setlistEntriesJson, showsJson);
    this.initialized = true;
  }

  /**
   * Get ensemble prediction combining all signals
   */
  async predictEnsemble(context: PredictionContext, limit = 15): Promise<EnsemblePrediction> {
    if (!this.predictor) throw new Error('Predictor not initialized');
    return this.predictor.predictEnsemble(JSON.stringify(context), limit);
  }

  /**
   * Get bust candidates (songs due for a comeback)
   */
  async getBustCandidates(limit = 20): Promise<BustCandidate[]> {
    if (!this.predictor) throw new Error('Predictor not initialized');
    return this.predictor.getBustCandidates(limit);
  }

  /**
   * Find matching song sequences
   */
  async findMatchingSequences(prefix: number[], maxLength = 5, limit = 10): Promise<SequenceMatch[]> {
    if (!this.predictor) throw new Error('Predictor not initialized');
    return this.predictor.findMatchingSequences(JSON.stringify(prefix), maxLength, limit);
  }

  /**
   * Analyze venue-specific patterns
   */
  async analyzeVenuePatterns(venueId: number, venueName?: string): Promise<VenuePattern> {
    if (!this.predictor) throw new Error('Predictor not initialized');
    return this.predictor.analyzeVenuePatterns(venueId, venueName);
  }

  /**
   * Analyze seasonal patterns
   */
  async analyzeSeasonalPatterns(month: number): Promise<SeasonalPattern> {
    if (!this.predictor) throw new Error('Predictor not initialized');
    return this.predictor.analyzeSeasonalPatterns(month);
  }

  /**
   * Get predictions as TypedArrays
   */
  async getPredictionsTyped(currentSongId: number, limit = 20): Promise<TypedArrayResult & { probabilities: Float32Array }> {
    if (!this.predictor) throw new Error('Predictor not initialized');
    return this.predictor.getPredictionsTyped(currentSongId, limit);
  }

  /**
   * Get bust candidates as TypedArrays
   */
  async getBustCandidatesTyped(limit = 20): Promise<TypedArrayResult & { bustScores: Float32Array; gaps: Int32Array }> {
    if (!this.predictor) throw new Error('Predictor not initialized');
    return this.predictor.getBustCandidatesTyped(limit);
  }

  /**
   * Get statistics about the predictor
   */
  async getStatistics(): Promise<{
    totalShows: number;
    totalSongsPlayed: number;
    uniqueSongs: number;
    firstOrderTransitions: number;
    secondOrderContexts: number;
    thirdOrderContexts: number;
    trackedVenues: number;
  }> {
    if (!this.predictor) throw new Error('Predictor not initialized');
    return this.predictor.getStatistics();
  }
}

// ==================== DATE UTILITIES API ====================

/**
 * Date utilities wrapper - namespace for date-related WASM functions
 */
export const DateUtils = {
  /**
   * Parse a date string and extract metadata
   */
  async parseDateWithMetadata(dateStr: string): Promise<DateMetadata> {
    const module = await loadDateUtilsModule();
    return module.parseDateWithMetadata(dateStr);
  },

  /**
   * Get season and tour period info for a date
   */
  async getSeasonInfo(dateStr: string): Promise<SeasonInfo> {
    const module = await loadDateUtilsModule();
    return module.getSeasonInfo(dateStr);
  },

  /**
   * Find anniversary shows
   */
  async findAnniversaries(showDatesJson: string, targetDate?: string): Promise<AnniversaryInfo[]> {
    const module = await loadDateUtilsModule();
    return module.findAnniversaries(showDatesJson, targetDate);
  },

  /**
   * Find shows "on this day" in history
   */
  async onThisDay(showDatesJson: string, month?: number, day?: number): Promise<string[]> {
    const module = await loadDateUtilsModule();
    return module.onThisDay(showDatesJson, month, day);
  },

  /**
   * Cluster dates into tour runs
   */
  async clusterDates(datesJson: string, maxGapDays = 7): Promise<DateCluster[]> {
    const module = await loadDateUtilsModule();
    return module.clusterDates(datesJson, maxGapDays);
  },

  /**
   * Format date as relative time
   */
  async formatRelative(dateStr: string, referenceDate?: string): Promise<string> {
    const module = await loadDateUtilsModule();
    return module.formatRelative(dateStr, referenceDate);
  },

  /**
   * Calculate days between dates
   */
  async daysBetween(dateA: string, dateB: string): Promise<number> {
    const module = await loadDateUtilsModule();
    return module.daysBetween(dateA, dateB);
  },

  /**
   * Calculate days since a date
   */
  async daysSince(dateStr: string): Promise<number> {
    const module = await loadDateUtilsModule();
    return module.daysSince(dateStr);
  },

  /**
   * Batch extract years from dates (TypedArray)
   */
  async batchExtractYearsTyped(datesJson: string): Promise<Int32Array> {
    const module = await loadDateUtilsModule();
    return module.batchExtractYearsTyped(datesJson);
  },

  /**
   * Get unique years from dates (TypedArray)
   */
  async getUniqueYearsTyped(datesJson: string): Promise<Int32Array> {
    const module = await loadDateUtilsModule();
    return module.getUniqueYearsTyped(datesJson);
  },

  /**
   * Batch calculate days since for dates (TypedArray)
   */
  async batchDaysSinceTyped(datesJson: string): Promise<Int32Array> {
    const module = await loadDateUtilsModule();
    return module.batchDaysSinceTyped(datesJson);
  },
} as const;

// ==================== SINGLETON INSTANCES ====================

// Singleton instances for convenience
let tfIdfSearchInstance: TfIdfSearchEngine | null = null;
let similarityInstance: SetlistSimilarityEngine | null = null;
let rarityInstance: RarityEngine | null = null;
let predictorInstance: SetlistPredictor | null = null;

/**
 * Get or create TF-IDF search engine singleton
 */
export function getTfIdfSearch(): TfIdfSearchEngine {
  if (!tfIdfSearchInstance) {
    tfIdfSearchInstance = new TfIdfSearchEngine();
  }
  return tfIdfSearchInstance;
}

/**
 * Get or create similarity engine singleton
 */
export function getSimilarityEngine(): SetlistSimilarityEngine {
  if (!similarityInstance) {
    similarityInstance = new SetlistSimilarityEngine();
  }
  return similarityInstance;
}

/**
 * Get or create rarity engine singleton
 */
export function getRarityEngine(): RarityEngine {
  if (!rarityInstance) {
    rarityInstance = new RarityEngine();
  }
  return rarityInstance;
}

/**
 * Get or create predictor singleton
 */
export function getPredictor(): SetlistPredictor {
  if (!predictorInstance) {
    predictorInstance = new SetlistPredictor();
  }
  return predictorInstance;
}

// ==================== CONVENIENCE FUNCTIONS ====================

/**
 * Initialize all engines with data
 */
export async function initializeAllEngines(
  songsJson: string,
  setlistEntriesJson: string,
  showsJson?: string,
  venuesJson?: string,
  guestsJson?: string
): Promise<void> {
  const totalSongs = JSON.parse(songsJson).length;

  await Promise.all([
    // Initialize search
    (async () => {
      const search = getTfIdfSearch();
      await search.indexSongs(songsJson);
      if (venuesJson) await search.indexVenues(venuesJson);
      if (guestsJson) await search.indexGuests(guestsJson);
    })(),

    // Initialize similarity
    (async () => {
      const similarity = getSimilarityEngine();
      await similarity.initialize(setlistEntriesJson, totalSongs);
    })(),

    // Initialize rarity
    (async () => {
      const rarity = getRarityEngine();
      await rarity.initialize(setlistEntriesJson, songsJson);
    })(),

    // Initialize predictor
    (async () => {
      const predictor = getPredictor();
      await predictor.initialize(setlistEntriesJson, showsJson);
    })(),
  ]);
}

/**
 * Reset all singleton instances
 */
export function resetAllEngines(): void {
  tfIdfSearchInstance = null;
  similarityInstance = null;
  rarityInstance = null;
  predictorInstance = null;
}

# DMB Almanac WASM Interface Audit Report

**Date:** January 23, 2026
**Project:** DMB Almanac SvelteKit PWA
**TypeScript Interface Layer:** `/src/lib/wasm/`
**Scope:** Complete audit of WASM module requirements and missing implementations

---

## Executive Summary

The TypeScript interface layer defines a comprehensive WASM integration strategy with 4 major advanced modules requiring implementation. Current status:

| Module | Status | Functions | Notes |
|--------|--------|-----------|-------|
| **dmb-transform** | ✅ Implemented | 50+ | Core transforms, TF-IDF, similarity, rarity |
| **dmb-date-utils** | ✅ Implemented | 25+ | Date parsing, metadata, season analysis |
| **dmb-segue-analysis** | ⚠️ Partial | 10+ | Has predictor but NOT exposed via #[wasm_bindgen] |
| **dmb-string-utils** | ✅ Implemented | 8 | String normalization |
| **dmb-core** | ✅ Minimal | 2 | Basic core operations |

### Critical Gap: 4 Missing Classes

These classes are expected by TypeScript but have NO Rust implementations:

1. **TfIdfIndex** - Search engine (full-text TF-IDF indexing)
2. **SetlistSimilarityEngine** - Show similarity computation (Jaccard, cosine, overlap)
3. **RarityEngine** - Rarity scoring and gap analysis
4. **SetlistPredictor** - Advanced predictions (Markov chains, venue/seasonal patterns)

---

## Module Analysis

### 1. TfIdfIndex Class (MISSING)

**Location:** `advanced-modules.ts` lines 228-237
**TypeScript Interface:** `TfIdfIndexModule`
**Expected Module Path:** `$wasm/dmb-transform/pkg`

#### TypeScript Expectations

```typescript
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
```

#### Required Return Types

**TfIdfSearchResult:**
```typescript
{
  id: number;
  title: string;
  score: number;                    // 0.0-1.0, TF-IDF relevance score
  matchedTerms: string[];           // Query terms that matched
}
```

**AutocompleteResult:**
```typescript
{
  term: string;                     // Suggested completion
  frequency: number;                // Times term appears in corpus
  documentCount: number;            // Number of documents containing term
}
```

**TypedArrayResult:**
```typescript
{
  songIds?: Int32Array | BigInt64Array;
  showIds?: Int32Array | BigInt64Array;
  scores?: Float32Array | Float64Array;
  counts?: Int32Array | Uint32Array;
  count: number;                    // Number of results
}
```

#### Required Rust Functions

```rust
#[wasm_bindgen]
pub struct TfIdfIndex {
    // Internal state
}

#[wasm_bindgen]
impl TfIdfIndex {
    #[wasm_bindgen(constructor)]
    pub fn new() -> TfIdfIndex { /* ... */ }

    /// Index songs for full-text search
    /// Input: JSON array of { id, title, slug, ... }
    #[wasm_bindgen]
    pub fn index_songs(&mut self, songs_json: &str) -> Result<(), JsValue> { /* ... */ }

    /// Index venues for search
    #[wasm_bindgen]
    pub fn index_venues(&mut self, venues_json: &str) -> Result<(), JsValue> { /* ... */ }

    /// Index guest names for search
    #[wasm_bindgen]
    pub fn index_guests(&mut self, guests_json: &str) -> Result<(), JsValue> { /* ... */ }

    /// Search across all indexed entities
    /// Returns top N results sorted by TF-IDF score
    #[wasm_bindgen]
    pub fn search(&self, query: &str, limit: u32) -> Result<JsValue, JsValue> { /* ... */ }

    /// Search specific entity type only
    #[wasm_bindgen]
    pub fn search_by_type(&self, query: &str, entity_type: &str, limit: u32) -> Result<JsValue, JsValue> { /* ... */ }

    /// Phrase search (exact term sequences)
    #[wasm_bindgen]
    pub fn search_phrase(&self, phrase: &str, limit: u32) -> Result<JsValue, JsValue> { /* ... */ }

    /// Get autocomplete suggestions for prefix
    #[wasm_bindgen]
    pub fn autocomplete(&self, prefix: &str, limit: u32) -> Result<JsValue, JsValue> { /* ... */ }

    /// Zero-copy TypedArray result variant
    /// Returns { songIds: BigInt64Array, showIds: BigInt64Array, scores: Float32Array, count }
    #[wasm_bindgen]
    pub fn search_scores_typed(&self, query: &str, limit: u32) -> Result<JsValue, JsValue> { /* ... */ }
}
```

#### Algorithm Requirements

- **Tokenization:** Split on whitespace and punctuation, lowercase, remove stop words
- **TF Calculation:** Term frequency normalized by document length
- **IDF Calculation:** Inverse document frequency (log-scaled)
- **Scoring:** TF * IDF for each term, sum across terms
- **Ranking:** Sort by score descending
- **Autocomplete:** Prefix tree (trie) or similar structure for fast completion lookup

#### Performance Targets
- Index 1000 songs: < 100ms
- Search query: < 50ms
- Autocomplete query: < 20ms
- Memory: < 5MB for 1000 entities

---

### 2. SetlistSimilarityEngine Class (MISSING)

**Location:** `advanced-modules.ts` lines 242-261
**TypeScript Interface:** `SetlistSimilarityEngineModule`
**Expected Module Path:** `$wasm/dmb-transform/pkg`

#### TypeScript Expectations

```typescript
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
  findAssociatedSongs(songId: number, limit: number): { songId: number; coOccurrenceCount: number; probability: number }[];
  calculateDiversity(showId: number): number;
  clusterShows(numClusters: number, maxIterations: number): ClusterResult[];
  getSimilaritiesTyped(targetShowId: number, limit: number): TypedArrayResult;
}
```

#### Required Return Types

**SimilarShowResult:**
```typescript
{
  showId: number;
  similarity: number;               // 0.0-1.0, similarity score
  sharedSongs: number;              // Count of songs in common
  method: 'jaccard' | 'cosine' | 'overlap';
}
```

**CoOccurrenceEntry:**
```typescript
{
  songA: number;                    // First song ID
  songB: number;                    // Second song ID
  count: number;                    // Times played together
  percentage: number;               // % of songA shows with songB
}
```

**ClusterResult:**
```typescript
{
  clusterId: number;
  showIds: number[];                // Shows in cluster
  centroidSongs: number[];          // Most representative songs
  avgSimilarity: number;            // Average intra-cluster similarity
}
```

#### Required Rust Functions

```rust
#[wasm_bindgen]
pub struct SetlistSimilarityEngine {
    // Internal state: setlists by show, songs by show, etc.
}

#[wasm_bindgen]
impl SetlistSimilarityEngine {
    #[wasm_bindgen(constructor)]
    pub fn new() -> SetlistSimilarityEngine { /* ... */ }

    /// Initialize with setlist data
    /// Input: JSON array of { show_id, song_id, position, ... }
    #[wasm_bindgen]
    pub fn initialize(&mut self, setlist_entries_json: &str, total_songs: u32) -> Result<(), JsValue> { /* ... */ }

    /// Find similar shows using specified method
    /// Returns top N shows with highest similarity scores
    #[wasm_bindgen]
    pub fn find_similar_shows(&self, target_show_id: u32, method: &str, limit: u32) -> Result<JsValue, JsValue> { /* ... */ }

    /// Compare two shows across all similarity metrics
    #[wasm_bindgen]
    pub fn compare_shows(&self, show_id_a: u32, show_id_b: u32) -> Result<JsValue, JsValue> { /* ... */ }

    /// Get songs shared between two shows
    #[wasm_bindgen]
    pub fn get_shared_songs(&self, show_id_a: u32, show_id_b: u32) -> Result<JsValue, JsValue> { /* ... */ }

    /// Compute song co-occurrence matrix
    /// Returns pairs of songs that appear together frequently
    #[wasm_bindgen]
    pub fn compute_co_occurrence_matrix(&self, min_occurrences: u32) -> Result<JsValue, JsValue> { /* ... */ }

    /// Find songs commonly played with target song
    #[wasm_bindgen]
    pub fn find_associated_songs(&self, song_id: u32, limit: u32) -> Result<JsValue, JsValue> { /* ... */ }

    /// Calculate setlist diversity (unique vs repeated songs)
    /// Returns 0.0 (all repeats) to 1.0 (all unique)
    #[wasm_bindgen]
    pub fn calculate_diversity(&self, show_id: u32) -> Result<f32, JsValue> { /* ... */ }

    /// K-means clustering of shows
    #[wasm_bindgen]
    pub fn cluster_shows(&self, num_clusters: u32, max_iterations: u32) -> Result<JsValue, JsValue> { /* ... */ }

    /// Zero-copy TypedArray result variant
    #[wasm_bindgen]
    pub fn get_similarities_typed(&self, target_show_id: u32, limit: u32) -> Result<JsValue, JsValue> { /* ... */ }
}
```

#### Algorithm Requirements

**Similarity Metrics:**

1. **Jaccard Similarity:**
   ```
   J(A,B) = |A ∩ B| / |A ∪ B|
   ```
   - Count common songs / total unique songs
   - Best for set-based comparison

2. **Cosine Similarity:**
   ```
   cos(θ) = (A · B) / (||A|| × ||B||)
   ```
   - Treat setlists as vectors
   - Accounts for frequency of shared songs
   - Value 0.0-1.0

3. **Overlap Coefficient:**
   ```
   overlap = |A ∩ B| / min(|A|, |B|)
   ```
   - Useful for nested set comparison
   - Value 0.0-1.0

**Co-occurrence Analysis:**
- Track pairs of songs played in same show
- Count occurrences and calculate probability
- Filter by minimum frequency threshold

**Clustering (K-means):**
- Initialize centroids randomly or from data
- Iterate: assign shows to nearest centroid, recompute centroids
- Converge when assignments stable or max iterations reached

#### Performance Targets
- Initialize with 1000 shows: < 200ms
- Find similar shows (N=10): < 100ms
- Compare two shows: < 5ms
- Cluster 1000 shows (k=5): < 500ms
- Memory: < 10MB for 1000 shows

---

### 3. RarityEngine Class (MISSING)

**Location:** `advanced-modules.ts` lines 266-277
**TypeScript Interface:** `RarityEngineModule`
**Expected Module Path:** `$wasm/dmb-transform/pkg`

#### TypeScript Expectations

```typescript
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
```

#### Required Return Types

**SongRarity:**
```typescript
{
  songId: number;
  title: string;
  inverseFrequency: number;        // IDF-like score (0.0-1.0)
  logScaled: number;               // log(total_shows / appearances)
  percentile: number;              // Percentile rank in rarity (0.0-1.0)
  gapBased: number;                // Based on days/shows since last played
  combinedScore: number;           // Weighted combination of above
}
```

**ShowRarity:**
```typescript
{
  showId: number;
  date: string;
  avgSongRarity: number;           // Average rarity score of all songs
  uniqueSongCount: number;         // Songs not played in prior 100 shows
  rareSongCount: number;           // Songs with rarity > 0.75
  rarityScore: number;             // 0.0-1.0, overall show rarity
}
```

**GapAnalysis:**
```typescript
{
  songId: number;
  title: string;
  daysSinceLast: number;           // Days since last performance
  showsSinceLast: number;          // Shows since last performance
  averageGap: number;              // Historical average gap between performances
  maxGap: number;                  // Maximum gap recorded
  gapRank: number;                 // Rank among all songs by gap
}
```

**RarityDistribution:**
```typescript
{
  bucket: string;                  // e.g., "0.0-0.1", "0.1-0.2", ...
  count: number;                   // Songs in this rarity range
  percentage: number;              // % of total songs
  songIds: number[];               // Which songs in this bucket
}
```

#### Required Rust Functions

```rust
#[wasm_bindgen]
pub struct RarityEngine {
    // Internal state: setlist data, song appearances, gaps, etc.
}

#[wasm_bindgen]
impl RarityEngine {
    #[wasm_bindgen(constructor)]
    pub fn new() -> RarityEngine { /* ... */ }

    /// Initialize with setlist and song data
    /// Setlist: { show_id, song_id, position, date, ... }
    /// Songs: { id, title, total_performances, ... }
    #[wasm_bindgen]
    pub fn initialize(&mut self, setlist_entries_json: &str, songs_json: &str) -> Result<(), JsValue> { /* ... */ }

    /// Compute rarity metrics for single song
    #[wasm_bindgen]
    pub fn compute_song_rarity(&self, song_id: u32) -> Result<JsValue, JsValue> { /* ... */ }

    /// Compute rarity for all songs (batch)
    #[wasm_bindgen]
    pub fn compute_all_song_rarities(&self) -> Result<JsValue, JsValue> { /* ... */ }

    /// Compute rarity for single show
    #[wasm_bindgen]
    pub fn compute_show_rarity(&self, show_id: u32) -> Result<JsValue, JsValue> { /* ... */ }

    /// Compute rarity for all shows (batch)
    #[wasm_bindgen]
    pub fn compute_all_show_rarities(&self) -> Result<JsValue, JsValue> { /* ... */ }

    /// Analyze gaps between performances for all songs
    #[wasm_bindgen]
    pub fn compute_gap_analysis(&self) -> Result<JsValue, JsValue> { /* ... */ }

    /// Get top N songs with largest gaps
    #[wasm_bindgen]
    pub fn get_top_songs_by_gap(&self, limit: u32) -> Result<JsValue, JsValue> { /* ... */ }

    /// Compute distribution of rarity scores
    #[wasm_bindgen]
    pub fn compute_rarity_distribution(&self, num_buckets: u32) -> Result<JsValue, JsValue> { /* ... */ }

    /// Zero-copy TypedArray result variant
    #[wasm_bindgen]
    pub fn get_song_rarities_typed(&self) -> Result<JsValue, JsValue> { /* ... */ }

    /// Zero-copy TypedArray result variant
    #[wasm_bindgen]
    pub fn get_show_rarities_typed(&self) -> Result<JsValue, JsValue> { /* ... */ }
}
```

#### Algorithm Requirements

**Inverse Frequency Calculation:**
```
IF(song) = log(total_shows / (1 + appearances))
normalized = min(1.0, IF / max_IF)
```

**Gap-Based Rarity:**
- Track days and shows since last performance
- Normalize by song's average gap
- Higher score = longer gap

**Percentile Ranking:**
- Sort all songs by rarity score
- Assign percentile (0.0 = least rare, 1.0 = most rare)

**Combined Score (Suggested Weights):**
```
combined = 0.3 * IF + 0.3 * gap_based + 0.2 * percentile + 0.2 * logScaled
```

**Show Rarity:**
- Calculate weighted average of song rarities
- Count unique songs (not seen in last N shows)
- Count rare songs (rarity > 0.75)

#### Performance Targets
- Initialize with 5000 songs, 50k shows: < 500ms
- Compute single song rarity: < 1ms
- Compute all song rarities: < 200ms
- Compute all show rarities: < 300ms
- Memory: < 15MB for 5000 songs

---

### 4. SetlistPredictor Class (MISSING - IN SEPARATE MODULE)

**Location:** `advanced-modules.ts` lines 282-300
**TypeScript Interface:** `SetlistPredictorModule`
**Expected Module Path:** `$wasm/dmb-segue-analysis/pkg`
**Status:** ⚠️ Predictor may exist in Rust code but NOT exposed via `#[wasm_bindgen]`

#### TypeScript Expectations

```typescript
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
```

#### Required Return Types

**PredictionSignals:**
```typescript
{
  markov1: number;                 // First-order Markov probability (0.0-1.0)
  markov2: number;                 // Second-order Markov probability
  markov3: number;                 // Third-order Markov probability
  positionScore: number;           // Likelihood for next setlist position
  recencyScore: number;            // Recent appearance recency bonus
  gapScore: number;                // Gap-based due-for-play score
  venueScore: number;              // Venue-specific likelihood
  seasonalScore: number;           // Seasonal/monthly tendency
}
```

**AdvancedPrediction:**
```typescript
{
  songId: number;
  title: string;
  score: number;                   // 0.0-1.0, ensemble prediction score
  confidence: number;              // 0.0-1.0, confidence in prediction
  signals: PredictionSignals;      // Breakdown by signal source
}
```

**BustCandidate:**
```typescript
{
  songId: number;
  title: string;
  daysSinceLast: number;           // Days since last played
  showsSinceLast: number;          // Shows since last played
  bustScore: number;               // 0.0-1.0, likelihood of being "busted out"
  historicalFrequency: number;     // Historical play rate
  expectedVsActual: number;        // Deviation from expected frequency
}
```

**EnsemblePrediction:**
```typescript
{
  context: PredictionContext;
  predictions: AdvancedPrediction[];          // Next song predictions
  bustCandidates: BustCandidate[];           // Songs likely to be played soon
  openerPredictions: AdvancedPrediction[];   // If this is first song
  closerPredictions: AdvancedPrediction[];   // If this is last song
}
```

**PredictionContext:**
```typescript
{
  currentSongIds: number[];                   // Current setlist (in order)
  setPosition: string;                        // 'set1' | 'set2' | 'set3' | 'encore'
  venueId?: number;
  month?: number;
  dayOfWeek?: number;
}
```

**SequenceMatch:**
```typescript
{
  sequence: number[];              // Song IDs in sequence
  titles: string[];                // Song titles
  occurrences: number;             // Times this sequence appeared
  showDates: string[];             // Example show dates
  probability: number;             // Probability of occurrence
}
```

**VenuePattern:**
```typescript
{
  venueId: number;
  venueName: string;
  signatureSongs: VenueSongStat[];          // Songs signature to venue
  openerTendencies: AdvancedPrediction[];   // Common openers
  closerTendencies: AdvancedPrediction[];   // Common closers
  uniqueSongs: number[];                     // Venue-specific songs
}
```

**VenueSongStat:**
```typescript
{
  songId: number;
  title: string;
  timesPlayed: number;            // Times at this venue
  venueRate: number;              // Play rate at this venue
  overallRate: number;            // Overall play rate
  venueAffinity: number;          // venueRate / overallRate ratio
}
```

**SeasonalPattern:**
```typescript
{
  month: number;                  // 1-12
  monthName: string;
  topSongs: SeasonalSongStat[];   // Most common in month
  openers: AdvancedPrediction[];  // Common openers
  closers: AdvancedPrediction[];  // Common closers
}
```

**SeasonalSongStat:**
```typescript
{
  songId: number;
  title: string;
  monthlyRate: number;            // Play rate in this month
  yearlyAverage: number;          // Average play rate across year
  seasonalBoost: number;          // (monthlyRate / yearlyAverage) - 1.0
}
```

#### Required Rust Functions

```rust
#[wasm_bindgen]
pub struct SetlistPredictor {
    // Internal state: Markov chains (1st, 2nd, 3rd order),
    // venue patterns, seasonal patterns, etc.
}

#[wasm_bindgen]
impl SetlistPredictor {
    #[wasm_bindgen(constructor)]
    pub fn new() -> SetlistPredictor { /* ... */ }

    /// Initialize with historical setlist and show data
    #[wasm_bindgen]
    pub fn initialize(&mut self, setlist_entries_json: &str, shows_json: Option<String>) -> Result<(), JsValue> { /* ... */ }

    /// Get ensemble prediction combining all signals
    /// contextJson: JSON serialized PredictionContext
    #[wasm_bindgen]
    pub fn predict_ensemble(&self, context_json: &str, limit: u32) -> Result<JsValue, JsValue> { /* ... */ }

    /// Get songs likely to be "busted out" soon
    /// (Not played recently but historically played often)
    #[wasm_bindgen]
    pub fn get_bust_candidates(&self, limit: u32) -> Result<JsValue, JsValue> { /* ... */ }

    /// Find historical sequences matching prefix
    /// prefixJson: JSON array of song IDs
    #[wasm_bindgen]
    pub fn find_matching_sequences(&self, prefix_json: &str, max_length: u32, limit: u32) -> Result<JsValue, JsValue> { /* ... */ }

    /// Analyze patterns specific to a venue
    #[wasm_bindgen]
    pub fn analyze_venue_patterns(&self, venue_id: u32, venue_name: Option<String>) -> Result<JsValue, JsValue> { /* ... */ }

    /// Analyze seasonal patterns for a month
    #[wasm_bindgen]
    pub fn analyze_seasonal_patterns(&self, month: u32) -> Result<JsValue, JsValue> { /* ... */ }

    /// Zero-copy predictions as TypedArray
    #[wasm_bindgen]
    pub fn get_predictions_typed(&self, current_song_id: u32, limit: u32) -> Result<JsValue, JsValue> { /* ... */ }

    /// Zero-copy bust candidates as TypedArray
    #[wasm_bindgen]
    pub fn get_bust_candidates_typed(&self, limit: u32) -> Result<JsValue, JsValue> { /* ... */ }

    /// Get statistics about predictor state
    #[wasm_bindgen]
    pub fn get_statistics(&self) -> Result<JsValue, JsValue> { /* ... */ }
}
```

#### Algorithm Requirements

**Markov Chain Modeling:**

1. **First-Order Markov:**
   ```
   P(song_i | song_i-1) = count(i-1, i) / count(i-1)
   ```

2. **Second-Order Markov:**
   ```
   P(song_i | song_i-2, song_i-1) = count(i-2, i-1, i) / count(i-2, i-1)
   ```

3. **Third-Order Markov:**
   ```
   P(song_i | song_i-3, song_i-2, song_i-1)
   ```

**Ensemble Scoring:**
- Combine signals via weighted sum or learned weights
- Each signal: 0.0-1.0 range
- Confidence: variance across signals (high variance = low confidence)

**Bust Candidates:**
- Gap Analysis: days/shows since last play
- Historical Frequency: typical play rate
- Expected vs Actual: deviation from schedule
- Score = normalize(gap) * historicalFrequency

**Venue Patterns:**
- Group shows by venue
- Calculate play rates per song at venue
- Identify venue-signature songs (high venue rate, lower overall rate)
- Affinity = venueRate / overallRate

**Seasonal Patterns:**
- Group shows by month (1-12)
- Calculate monthly play rates
- Seasonal boost = (monthlyRate / yearlyAverage) - 1.0

#### Performance Targets
- Initialize with 5000 shows: < 1000ms
- Predict ensemble: < 50ms
- Get bust candidates: < 30ms
- Find sequences: < 100ms
- Analyze venue patterns: < 20ms
- Memory: < 25MB for 5000 shows

---

## DateUtils Module (ALREADY IMPLEMENTED)

**Location:** `advanced-modules.ts` lines 305-317
**TypeScript Namespace:** `DateUtils`
**Module Path:** `$wasm/dmb-date-utils/pkg`
**Status:** ✅ Already implemented with 25+ functions

### Implemented Functions (TypeScript wrappers at lines 786-874)

```typescript
export const DateUtils = {
  parseDateWithMetadata(dateStr: string): Promise<DateMetadata>,
  getSeasonInfo(dateStr: string): Promise<SeasonInfo>,
  findAnniversaries(showDatesJson: string, targetDate?: string): Promise<AnniversaryInfo[]>,
  onThisDay(showDatesJson: string, month?: number, day?: number): Promise<string[]>,
  clusterDates(datesJson: string, maxGapDays?: number): Promise<DateCluster[]>,
  formatRelative(dateStr: string, referenceDate?: string): Promise<string>,
  daysBetween(dateA: string, dateB: string): Promise<number>,
  daysSince(dateStr: string): Promise<number>,
  batchExtractYearsTyped(datesJson: string): Promise<Int32Array>,
  getUniqueYearsTyped(datesJson: string): Promise<Int32Array>,
  batchDaysSinceTyped(datesJson: string): Promise<Int32Array>,
}
```

---

## Integration Points

### 1. Class Instantiation (TypeScript Loader)

Located at `advanced-modules.ts` lines 346-406:

```typescript
async function loadTransformModule(): Promise<WasmModuleConstructors> {
  const module = await import('$wasm/dmb-transform/pkg/dmb_transform.js');
  await module.default();
  return module;
}

async function loadSegueModule(): Promise<WasmModuleConstructors> {
  const module = await import('$wasm/dmb-segue-analysis/pkg/dmb_segue_analysis.js');
  await module.default();
  return module;
}
```

These loaders expect:

```typescript
interface WasmModuleConstructors {
  TfIdfIndex: new () => TfIdfIndexModule;
  SetlistSimilarityEngine: new () => SetlistSimilarityEngineModule;
  RarityEngine: new () => RarityEngineModule;
  SetlistPredictor: new () => SetlistPredictorModule;
}
```

### 2. Singleton API (TypeScript Wrappers)

Classes (lines 413-779):
- `TfIdfSearchEngine` - Wraps `TfIdfIndex` (lines 413-492)
- `SetlistSimilarityEngine` - Wraps `SetlistSimilarityEngine` (lines 499-595)
- `RarityEngine` - Wraps `RarityEngine` (lines 602-687)
- `SetlistPredictor` - Wraps `SetlistPredictor` (lines 694-779)

Singleton accessors (lines 887-922):
```typescript
export function getTfIdfSearch(): TfIdfSearchEngine
export function getSimilarityEngine(): SetlistSimilarityEngine
export function getRarityEngine(): RarityEngine
export function getPredictor(): SetlistPredictor
```

### 3. Initialization Helper

Location: `advanced-modules.ts` lines 929-965

```typescript
export async function initializeAllEngines(
  songsJson: string,
  setlistEntriesJson: string,
  showsJson?: string,
  venuesJson?: string,
  guestsJson?: string
): Promise<void>
```

---

## TypeScript Integration Example

### Expected Usage Pattern

```typescript
import {
  getTfIdfSearch,
  getSimilarityEngine,
  getRarityEngine,
  getPredictor,
  initializeAllEngines,
} from '$lib/wasm';

// 1. Initialize all engines
await initializeAllEngines(
  JSON.stringify(songs),
  JSON.stringify(setlistEntries),
  JSON.stringify(shows),
  JSON.stringify(venues),
  JSON.stringify(guests)
);

// 2. Use search engine
const search = getTfIdfSearch();
const results = await search.search('phish', 20);

// 3. Use similarity engine
const similarity = getSimilarityEngine();
const similarShows = await similarity.findSimilarShows(12345, 'jaccard', 10);

// 4. Use rarity engine
const rarity = getRarityEngine();
const songRarity = await rarity.computeSongRarity(67);

// 5. Use predictor
const predictor = getPredictor();
const prediction = await predictor.predictEnsemble({
  currentSongIds: [1, 5, 23],
  setPosition: 'set1',
  venueId: 100,
}, 15);
```

---

## wasm-bindgen Requirements

Each class MUST be exported with `#[wasm_bindgen]` and constructor:

```rust
#[wasm_bindgen]
pub struct TfIdfIndex { /* ... */ }

#[wasm_bindgen]
impl TfIdfIndex {
    #[wasm_bindgen(constructor)]
    pub fn new() -> TfIdfIndex { /* ... */ }

    #[wasm_bindgen]
    pub fn index_songs(&mut self, songs_json: &str) -> Result<(), JsValue> { /* ... */ }

    // ... other methods
}
```

**Critical:** Without `#[wasm_bindgen]`:
- Constructor NOT available: `new module.TfIdfIndex()` fails
- Methods NOT callable from JavaScript
- TypeScript compilation succeeds but runtime fails

---

## Data Flow

### Serialization Format

All complex data passed as JSON strings:

```typescript
// Input to Rust
const songs = [
  { id: 1, title: "Ants Marching", total_performances: 500 },
  // ...
];
const songsJson = JSON.stringify(songs);
engine.index_songs(songsJson);

// Output from Rust (usually JSON string or typed arrays)
const results = engine.search("ants", 10); // Returns array of objects
```

### TypedArray Zero-Copy Transfer

For performance-critical operations:

```rust
#[wasm_bindgen]
pub fn search_scores_typed(&self, query: &str, limit: u32) -> Result<JsValue, JsValue> {
    // Allocate buffers in WASM memory
    let song_ids = vec![1u32, 5u32, 23u32, ...];
    let scores = vec![0.95f32, 0.87f32, 0.76f32, ...];

    // Return as TypedArrays
    let obj = js_sys::Object::new();
    js_sys::Reflect::set(
        &obj,
        &"songIds".into(),
        &js_sys::BigInt64Array::from(&song_ids[..]).into()
    )?;
    js_sys::Reflect::set(
        &obj,
        &"scores".into(),
        &js_sys::Float32Array::from(&scores[..]).into()
    )?;
    Ok(obj.into())
}
```

---

## Testing Checklist

For each class implementation:

- [ ] Constructor instantiation works
- [ ] `initialize()` accepts JSON input without errors
- [ ] All methods callable and return expected types
- [ ] Search results sorted by score (descending)
- [ ] TypedArray variants match object variants (same data)
- [ ] Performance benchmarks met (see targets above)
- [ ] Memory doesn't leak on repeated calls
- [ ] Error handling (invalid IDs, null data, etc.)
- [ ] Handles empty inputs gracefully
- [ ] Concurrent calls don't cause race conditions

---

## File Location Reference

**TypeScript Interface Files:**
- Primary: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/wasm/advanced-modules.ts` (976 lines)
- Types: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/wasm/types.ts` (413 lines)
- Bridge: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/wasm/bridge.ts` (Main wrapper)
- Transform: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/wasm/transform.ts` (WASM integration)
- Search: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/wasm/search.ts` (WASM-accelerated search)
- Queries: `/Users/louisherman/ClaudeCodeProjects/DMBAlmanacProjectFolder/dmb-almanac-svelte/src/lib/wasm/queries.ts` (WASM-accelerated queries)

**Expected Rust Module Paths:**
- TfIdfIndex, SetlistSimilarityEngine, RarityEngine: `$wasm/dmb-transform/pkg`
- SetlistPredictor: `$wasm/dmb-segue-analysis/pkg`
- DateUtils: `$wasm/dmb-date-utils/pkg` (Already implemented)

---

## Summary of Missing Implementations

| Class | Functions | Est. LOC | Complexity | Priority |
|-------|-----------|---------|-----------|----------|
| TfIdfIndex | 8 | 500-800 | High | ⭐⭐⭐ |
| SetlistSimilarityEngine | 8 | 600-1000 | High | ⭐⭐⭐ |
| RarityEngine | 9 | 400-700 | Medium | ⭐⭐ |
| SetlistPredictor | 8 | 800-1200 | Very High | ⭐⭐⭐ |

**Total Missing:** ~35-45 Rust functions across 4 classes
**Estimated Development:** 100-150 hours of Rust development

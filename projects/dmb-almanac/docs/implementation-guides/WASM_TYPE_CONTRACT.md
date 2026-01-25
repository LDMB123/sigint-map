# WASM Type Contract - Complete Reference

**Purpose:** Exact TypeScript-to-Rust type mappings
**Audience:** Rust developers implementing WASM modules
**Format:** Type specifications with JSON examples

---

## Module 1: TfIdfIndex

### Constructor

```typescript
// TypeScript
new TfIdfIndex()

// Rust equivalent
#[wasm_bindgen]
pub struct TfIdfIndex { ... }

#[wasm_bindgen]
impl TfIdfIndex {
    #[wasm_bindgen(constructor)]
    pub fn new() -> TfIdfIndex { ... }
}
```

### Method: indexSongs

```typescript
// TypeScript
indexSongs(songsJson: string): void

// Input JSON Schema
[
  {
    id: number,
    title: string,
    slug?: string,
    total_performances?: number,
    [key: string]: any  // Extra fields ignored
  },
  ...
]

// Example
[
  { id: 1, title: "Ants Marching", slug: "ants-marching" },
  { id: 2, title: "Tripping Billies", slug: "tripping-billies" }
]

// Rust
#[wasm_bindgen]
pub fn index_songs(&mut self, songs_json: &str) -> Result<(), JsValue> {
    let songs: Vec<Song> = serde_json::from_str(songs_json)?;
    for song in songs {
        self._index_document(song.id, &song.title, "song");
    }
    Ok(())
}
```

### Method: search

```typescript
// TypeScript signature
search(query: string, limit: number): TfIdfSearchResult[]

// Return type schema
interface TfIdfSearchResult {
  id: number;
  title: string;
  score: number;              // Range: 0.0-1.0
  matchedTerms: string[];     // Query terms that matched
}

// Example output
[
  {
    id: 1,
    title: "Ants Marching",
    score: 0.95,
    matchedTerms: ["ants"]
  },
  {
    id: 5,
    title: "Ant's Dance",
    score: 0.78,
    matchedTerms: ["ants"]
  }
]

// Rust implementation
#[wasm_bindgen]
pub fn search(&self, query: &str, limit: u32) -> Result<JsValue, JsValue> {
    let results = self._search_impl(query, None, limit as usize);
    Ok(serde_wasm_bindgen::to_value(&results)?)
}
```

### Method: searchByType

```typescript
// TypeScript signature
searchByType(
  query: string,
  entityType: 'song' | 'venue' | 'guest',
  limit: number
): TfIdfSearchResult[]

// Rust
#[wasm_bindgen]
pub fn search_by_type(
    &self,
    query: &str,
    entity_type: &str,
    limit: u32
) -> Result<JsValue, JsValue> {
    let results = self._search_impl(query, Some(entity_type), limit as usize);
    Ok(serde_wasm_bindgen::to_value(&results)?)
}
```

### Method: searchPhrase

```typescript
// TypeScript signature
searchPhrase(phrase: string, limit: number): TfIdfSearchResult[]

// Behavior: Match documents containing all tokens in phrase
// Example: "Blue Sky" → docs with both "blue" AND "sky"

// Rust
#[wasm_bindgen]
pub fn search_phrase(&self, phrase: &str, limit: u32) -> Result<JsValue, JsValue> {
    let tokens = self._tokenize(phrase);
    let results = self._search_phrase_impl(&tokens, limit as usize);
    Ok(serde_wasm_bindgen::to_value(&results)?)
}
```

### Method: autocomplete

```typescript
// TypeScript signature
autocomplete(prefix: string, limit: number): AutocompleteResult[]

// Return type schema
interface AutocompleteResult {
  term: string;               // Suggested completion
  frequency: number;          // Times term appears in corpus
  documentCount: number;      // Number of documents containing term
}

// Example output
[
  {
    term: "ants marching",
    frequency: 1247,
    documentCount: 500
  },
  {
    term: "ants dance",
    frequency: 234,
    documentCount: 100
  }
]

// Rust
#[wasm_bindgen]
pub fn autocomplete(&self, prefix: &str, limit: u32) -> Result<JsValue, JsValue> {
    let prefix = self._normalize_token(prefix);
    let mut results = Vec::new();

    for (term, freq) in &self.prefix_tree {
        if term.starts_with(&prefix) {
            let doc_count = self.df.get(term).copied().unwrap_or(0);
            results.push(AutocompleteResult {
                term: term.clone(),
                frequency: *freq,
                document_count: doc_count,
            });
        }
    }

    results.sort_by(|a, b| b.frequency.cmp(&a.frequency));
    results.truncate(limit as usize);
    Ok(serde_wasm_bindgen::to_value(&results)?)
}
```

### Method: searchScoresTyped

```typescript
// TypeScript signature
searchScoresTyped(query: string, limit: number): TypedArrayResult

// Return type schema
interface TypedArrayResult {
  songIds?: Int32Array | BigInt64Array;
  showIds?: Int32Array | BigInt64Array;
  scores?: Float32Array | Float64Array;
  counts?: Int32Array | Uint32Array;
  count: number;              // Number of results
}

// Example: searchScoresTyped("ants", 10) →
{
  songIds: Int32Array([1, 5, 23, ...]),
  scores: Float32Array([0.95, 0.78, 0.65, ...]),
  count: 3
}

// Rust
#[wasm_bindgen]
pub fn search_scores_typed(&self, query: &str, limit: u32) -> Result<JsValue, JsValue> {
    let results = self._search_impl(query, None, limit as usize);

    let ids: Vec<i32> = results.iter().map(|r| r.id as i32).collect();
    let scores: Vec<f32> = results.iter().map(|r| r.score).collect();

    let obj = js_sys::Object::new();
    js_sys::Reflect::set(
        &obj,
        &"songIds".into(),
        &js_sys::Int32Array::from(&ids[..]).into()
    )?;
    js_sys::Reflect::set(
        &obj,
        &"scores".into(),
        &js_sys::Float32Array::from(&scores[..]).into()
    )?;
    js_sys::Reflect::set(
        &obj,
        &"count".into(),
        &(results.len() as u32).into()
    )?;

    Ok(obj.into())
}
```

---

## Module 2: SetlistSimilarityEngine

### Method: initialize

```typescript
// TypeScript signature
initialize(setlistEntriesJson: string, totalSongs: number): void

// Input JSON Schema
[
  {
    show_id: number,
    song_id: number,
    position: number,
    [key: string]: any  // Extra fields ignored
  },
  ...
]

// Example
[
  { show_id: 100, song_id: 1, position: 0 },
  { show_id: 100, song_id: 5, position: 1 },
  { show_id: 100, song_id: 23, position: 2 },
  { show_id: 101, song_id: 1, position: 0 },
  { show_id: 101, song_id: 7, position: 1 }
]

// Rust
#[wasm_bindgen]
pub fn initialize(&mut self, setlist_entries_json: &str, total_songs: u32) -> Result<(), JsValue> {
    let entries: Vec<SetlistEntry> = serde_json::from_str(setlist_entries_json)?;

    for entry in entries {
        self.shows.entry(entry.show_id)
            .or_insert_with(Vec::new)
            .push(entry.song_id);
    }

    self.show_ids = self.shows.keys().copied().collect();
    self.show_ids.sort_unstable();
    self.total_songs = total_songs;

    Ok(())
}
```

### Method: findSimilarShows

```typescript
// TypeScript signature
findSimilarShows(
  targetShowId: number,
  method: 'jaccard' | 'cosine' | 'overlap',
  limit: number
): SimilarShowResult[]

// Return type schema
interface SimilarShowResult {
  showId: number;
  similarity: number;         // Range: 0.0-1.0
  sharedSongs: number;        // Count of songs in common
  method: 'jaccard' | 'cosine' | 'overlap';
}

// Example output
[
  {
    showId: 101,
    similarity: 0.85,
    sharedSongs: 15,
    method: "jaccard"
  },
  {
    showId: 102,
    similarity: 0.72,
    sharedSongs: 12,
    method: "jaccard"
  }
]

// Rust - Similarity Formulas
// Jaccard: |A ∩ B| / |A ∪ B|
// Cosine: (A · B) / (||A|| × ||B||)
// Overlap: |A ∩ B| / min(|A|, |B|)
```

### Method: compareShows

```typescript
// TypeScript signature
compareShows(showIdA: number, showIdB: number): {
  jaccard: number;
  cosine: number;
  overlap: number;
  sharedSongs: number[];
}

// Example output
{
  jaccard: 0.65,
  cosine: 0.72,
  overlap: 0.80,
  sharedSongs: [1, 5, 23, 45, ...]
}

// Rust - Calculate all three metrics for two shows
```

### Method: computeCoOccurrenceMatrix

```typescript
// TypeScript signature
computeCoOccurrenceMatrix(minOccurrences: number): CoOccurrenceEntry[]

// Return type schema
interface CoOccurrenceEntry {
  songA: number;
  songB: number;
  count: number;              // Times played together
  percentage: number;         // % of songA shows with songB
}

// Example output
[
  {
    songA: 1,
    songB: 5,
    count: 150,
    percentage: 75.5
  },
  {
    songA: 1,
    songB: 23,
    count: 120,
    percentage: 60.2
  }
]

// Algorithm:
// For each show, find all song pairs (i, j) where i < j
// Count how many times each pair appears
// Calculate percentage: (pair_count / count_of_songA_shows) * 100
```

### Method: clusterShows

```typescript
// TypeScript signature
clusterShows(numClusters: number, maxIterations: number): ClusterResult[]

// Return type schema
interface ClusterResult {
  clusterId: number;
  showIds: number[];          // Shows in this cluster
  centroidSongs: number[];    // Top 5 representative songs
  avgSimilarity: number;      // Average within-cluster similarity
}

// Example output
[
  {
    clusterId: 0,
    showIds: [100, 101, 102, 105, 110],
    centroidSongs: [1, 5, 23, 45, 67],
    avgSimilarity: 0.78
  },
  {
    clusterId: 1,
    showIds: [103, 104, 106, 111],
    centroidSongs: [2, 7, 34, 56],
    avgSimilarity: 0.82
  }
]

// Algorithm: K-means clustering
// 1. Initialize: Assign shows to clusters randomly or via selection
// 2. Iterate up to maxIterations:
//    - Calculate centroid for each cluster (most frequent songs)
//    - Reassign shows to nearest centroid
//    - Check for convergence
```

---

## Module 3: RarityEngine

### Method: initialize

```typescript
// TypeScript signature
initialize(setlistEntriesJson: string, songsJson: string): void

// Setlist entries (same format as SetlistSimilarityEngine)
// Songs JSON schema
[
  {
    id: number,
    title: string,
    total_performances: number,
    first_played_date: string,    // "YYYY-MM-DD"
    last_played_date: string,     // "YYYY-MM-DD"
    [key: string]: any
  },
  ...
]

// Example
[
  {
    id: 1,
    title: "Ants Marching",
    total_performances: 500,
    first_played_date: "1991-04-05",
    last_played_date: "2024-01-15"
  },
  {
    id: 2,
    title: "Tripping Billies",
    total_performances: 300,
    first_played_date: "1992-06-12",
    last_played_date: "2023-11-20"
  }
]
```

### Method: computeSongRarity

```typescript
// TypeScript signature
computeSongRarity(songId: number): SongRarity

// Return type schema
interface SongRarity {
  songId: number;
  title: string;
  inverseFrequency: number;       // Range: 0.0-1.0
  logScaled: number;              // log(total_shows / appearances)
  percentile: number;             // Range: 0.0-1.0
  gapBased: number;               // Normalized gap score
  combinedScore: number;          // Weighted combination
}

// Example output
{
  songId: 1,
  title: "Ants Marching",
  inverseFrequency: 0.15,         // Common song
  logScaled: 1.05,
  percentile: 0.25,
  gapBased: 0.40,
  combinedScore: 0.37             // Overall rarity (moderate)
}

// Calculation formulas:
// inverseFrequency = log(total_shows / (1 + appearances)) / max_IF
// logScaled = log(total_shows / appearances)
// percentile = rank / total_songs
// gapBased = (days_since_last / average_gap) normalized to 0-1
// combinedScore = 0.3*IF + 0.3*gap + 0.2*percentile + 0.2*log
```

### Method: computeAllSongRarities

```typescript
// TypeScript signature
computeAllSongRarities(): SongRarity[]

// Returns array of SongRarity for all songs
// Same format as computeSongRarity() output
```

### Method: computeShowRarity

```typescript
// TypeScript signature
computeShowRarity(showId: number): ShowRarity

// Return type schema
interface ShowRarity {
  showId: number;
  date: string;                   // "YYYY-MM-DD"
  avgSongRarity: number;          // Average rarity of all songs
  uniqueSongCount: number;        // Songs not in last N shows
  rareSongCount: number;          // Songs with rarity > 0.75
  rarityScore: number;            // Overall show rarity (0.0-1.0)
}

// Example output
{
  showId: 100,
  date: "2024-01-15",
  avgSongRarity: 0.45,
  uniqueSongCount: 3,
  rareSongCount: 2,
  rarityScore: 0.62
}

// Calculation:
// avgSongRarity = mean(rarity scores of all songs in show)
// uniqueSongCount = count of songs not played in prior 100 shows
// rareSongCount = count of songs with rarity > 0.75
// rarityScore = weighted combination of above
```

### Method: computeGapAnalysis

```typescript
// TypeScript signature
computeGapAnalysis(): GapAnalysis[]

// Return type schema
interface GapAnalysis {
  songId: number;
  title: string;
  daysSinceLast: number;          // Days since last performance
  showsSinceLast: number;         // Shows since last performance
  averageGap: number;             // Historical average gap days
  maxGap: number;                 // Maximum gap ever recorded
  gapRank: number;                // Rank by gap (1 = longest gap)
}

// Example output
[
  {
    songId: 42,
    title: "Rapunzel",
    daysSinceLast: 1250,
    showsSinceLast: 45,
    averageGap: 180,
    maxGap: 2100,
    gapRank: 1
  },
  {
    songId: 87,
    title: "Two Step",
    daysSinceLast: 980,
    showsSinceLast: 35,
    averageGap: 85,
    maxGap: 1200,
    gapRank: 2
  }
]
```

### Method: computeRarityDistribution

```typescript
// TypeScript signature
computeRarityDistribution(numBuckets: number): RarityDistribution[]

// Return type schema
interface RarityDistribution {
  bucket: string;                 // e.g., "0.0-0.1", "0.1-0.2"
  count: number;                  // Songs in this bucket
  percentage: number;             // % of total songs
  songIds: number[];              // Which songs
}

// Example output (10 buckets)
[
  {
    bucket: "0.0-0.1",
    count: 45,
    percentage: 12.5,
    songIds: [1, 5, 23, ...]
  },
  {
    bucket: "0.1-0.2",
    count: 52,
    percentage: 14.3,
    songIds: [2, 7, 34, ...]
  },
  // ... 8 more buckets
]

// Algorithm:
// 1. Calculate bucket size: 1.0 / numBuckets
// 2. For each song, find bucket based on combinedScore
// 3. Count songs per bucket
// 4. Calculate percentage: (count / total_songs) * 100
```

---

## Module 4: SetlistPredictor

### Method: initialize

```typescript
// TypeScript signature
initialize(setlistEntriesJson: string, showsJson?: string): void

// Setlist: same format as other modules
// Shows JSON schema (optional)
[
  {
    id: number,
    date: string,               // "YYYY-MM-DD"
    venue_id?: number,
    tour_id?: number,
    song_count?: number,
    [key: string]: any
  },
  ...
]
```

### Method: predictEnsemble

```typescript
// TypeScript signature
predictEnsemble(contextJson: string, limit: number): EnsemblePrediction

// Context input JSON schema
interface PredictionContext {
  currentSongIds: number[];       // Current setlist (in order)
  setPosition: string;            // 'set1' | 'set2' | 'set3' | 'encore'
  venueId?: number;
  month?: number;                 // 1-12
  dayOfWeek?: number;             // 0-6 (0 = Sunday)
}

// Example input
{
  currentSongIds: [1, 5, 23],
  setPosition: "set1",
  venueId: 42,
  month: 1
}

// Return type schema
interface EnsemblePrediction {
  context: PredictionContext;
  predictions: AdvancedPrediction[];     // Next songs
  bustCandidates: BustCandidate[];       // Comeback candidates
  openerPredictions: AdvancedPrediction[];
  closerPredictions: AdvancedPrediction[];
}

interface AdvancedPrediction {
  songId: number;
  title: string;
  score: number;                        // Range: 0.0-1.0
  confidence: number;                   // Range: 0.0-1.0
  signals: PredictionSignals;
}

interface PredictionSignals {
  markov1: number;                      // 1st order Markov probability
  markov2: number;                      // 2nd order Markov probability
  markov3: number;                      // 3rd order Markov probability
  positionScore: number;                // Likelihood for set position
  recencyScore: number;                 // Recent performance bonus
  gapScore: number;                     // Due-for-play score
  venueScore: number;                   // Venue affinity
  seasonalScore: number;                // Seasonal tendency
}

interface BustCandidate {
  songId: number;
  title: string;
  daysSinceLast: number;
  showsSinceLast: number;
  bustScore: number;                    // Range: 0.0-1.0
  historicalFrequency: number;          // Typical play rate
  expectedVsActual: number;             // Deviation from schedule
}

// Example output
{
  context: { currentSongIds: [1, 5, 23], setPosition: "set1", ... },
  predictions: [
    {
      songId: 45,
      title: "Blue Sky",
      score: 0.87,
      confidence: 0.92,
      signals: {
        markov1: 0.75,
        markov2: 0.85,
        markov3: 0.70,
        positionScore: 0.88,
        recencyScore: 0.65,
        gapScore: 0.55,
        venueScore: 0.92,
        seasonalScore: 0.78
      }
    },
    // ... more predictions
  ],
  bustCandidates: [
    {
      songId: 42,
      title: "Rapunzel",
      daysSinceLast: 1250,
      showsSinceLast: 45,
      bustScore: 0.89,
      historicalFrequency: 0.15,
      expectedVsActual: 2.1
    }
  ],
  openerPredictions: [...],
  closerPredictions: [...]
}

// Ensemble scoring algorithm:
// score = weighted_sum([markov1, markov2, markov3, position, recency, gap, venue, seasonal])
// confidence = 1.0 - variance(all_signals)
// Higher variance = lower confidence in prediction
```

### Method: findMatchingSequences

```typescript
// TypeScript signature
findMatchingSequences(
  prefixJson: string,
  maxLength: number,
  limit: number
): SequenceMatch[]

// Prefix input (JSON array)
// Example: [1, 5, 23]  → find sequences starting with these songs

// Return type schema
interface SequenceMatch {
  sequence: number[];            // Song IDs in sequence
  titles: string[];              // Song titles
  occurrences: number;           // Times this sequence appeared
  showDates: string[];           // Example show dates (up to 5)
  probability: number;           // Probability of occurrence
}

// Example output
[
  {
    sequence: [1, 5, 23, 45],
    titles: ["Ants Marching", "Jimi Thing", "Don't Drink", "Blue Sky"],
    occurrences: 12,
    showDates: ["1995-05-12", "1999-07-23", "2003-11-15"],
    probability: 0.08
  },
  {
    sequence: [1, 5, 23, 67],
    titles: ["Ants Marching", "Jimi Thing", "Don't Drink", "Two Step"],
    occurrences: 8,
    showDates: ["1998-06-14", "2002-09-20"],
    probability: 0.05
  }
]

// Algorithm:
// 1. Find all shows containing prefix sequence (in order)
// 2. Look ahead: what songs commonly follow this prefix?
// 3. Build sequences by extending prefix
// 4. Limit to maxLength songs total
// 5. Return top limit results by occurrence count
```

### Method: analyzeVenuePatterns

```typescript
// TypeScript signature
analyzeVenuePatterns(venueId: number, venueName?: string): VenuePattern

// Return type schema
interface VenuePattern {
  venueId: number;
  venueName: string;
  signatureSongs: VenueSongStat[];      // Signature to venue
  openerTendencies: AdvancedPrediction[];
  closerTendencies: AdvancedPrediction[];
  uniqueSongs: number[];                // Only at this venue
}

interface VenueSongStat {
  songId: number;
  title: string;
  timesPlayed: number;                  // Times at this venue
  venueRate: number;                    // Play rate at venue (0.0-1.0)
  overallRate: number;                  // Overall play rate (0.0-1.0)
  venueAffinity: number;                // venueRate / overallRate
}

// Example output
{
  venueId: 42,
  venueName: "Red Rocks Amphitheatre",
  signatureSongs: [
    {
      songId: 100,
      title: "Gorge Opener Special",
      timesPlayed: 45,
      venueRate: 0.85,
      overallRate: 0.15,
      venueAffinity: 5.67        // 5.67x more common at Red Rocks
    }
  ],
  openerTendencies: [
    { songId: 1, title: "Ants Marching", score: 0.92, ... },
    { songId: 2, title: "Tripping Billies", score: 0.88, ... }
  ],
  closerTendencies: [...],
  uniqueSongs: [100, 101, 102]   // Only played at this venue
}

// Calculation:
// venueRate = (plays_at_venue / shows_at_venue)
// overallRate = (total_plays / total_shows)
// venueAffinity = venueRate / overallRate
// Signature songs: venueAffinity > 2.0 and timesPlayed >= 3
```

### Method: analyzeSeasonalPatterns

```typescript
// TypeScript signature
analyzeSeasonalPatterns(month: number): SeasonalPattern

// Input: month 1-12

// Return type schema
interface SeasonalPattern {
  month: number;                        // 1-12
  monthName: string;
  topSongs: SeasonalSongStat[];        // Most common in month
  openers: AdvancedPrediction[];
  closers: AdvancedPrediction[];
}

interface SeasonalSongStat {
  songId: number;
  title: string;
  monthlyRate: number;                 // Play rate in this month
  yearlyAverage: number;               // Average play rate all months
  seasonalBoost: number;               // (monthlyRate/yearlyAvg) - 1.0
}

// Example output (for month = 7, July)
{
  month: 7,
  monthName: "July",
  topSongs: [
    {
      songId: 1,
      title: "Ants Marching",
      monthlyRate: 0.45,        // 45% of July shows
      yearlyAverage: 0.20,      // 20% overall
      seasonalBoost: 1.25       // 125% more common in July
    },
    {
      songId: 234,
      title: "Gorge Tour Exclusive",
      monthlyRate: 0.78,
      yearlyAverage: 0.05,
      seasonalBoost: 14.60      // 1460% more common (summer exclusive)
    }
  ],
  openers: [
    { songId: 1, title: "Ants Marching", score: 0.88, ... },
    { songId: 5, title: "Jimi Thing", score: 0.82, ... }
  ],
  closers: [
    { songId: 2, title: "Tripping Billies", score: 0.75, ... }
  ]
}

// Calculation:
// monthlyRate = (plays_in_month / shows_in_month)
// yearlyAverage = (total_plays / total_shows)
// seasonalBoost = (monthlyRate / yearlyAverage) - 1.0
// Interpretation:
//   + 0.0 = average
//   + 1.0 = 2x more common
//   -0.5 = 50% less common
```

---

## Error Handling Contract

### All Methods Must Return Result<_, JsValue>

```rust
#[wasm_bindgen]
pub fn some_method(&self) -> Result<JsValue, JsValue> {
    // Success path
    Ok(serde_wasm_bindgen::to_value(&data)?)

    // Error path
    Err(JsValue::from_str("Descriptive error message"))
}
```

### Common Error Cases

```rust
// Initialize not called
if self.shows.is_empty() {
    return Err(JsValue::from_str("Engine not initialized. Call initialize() first."));
}

// Invalid ID
if !self.documents.contains_key(&id) {
    return Err(JsValue::from_str("Show ID not found: 12345"));
}

// JSON parse error
let data: Vec<T> = serde_json::from_str(json)
    .map_err(|e| JsValue::from_str(&format!("JSON parse error: {}", e)))?;

// Invalid enum variant
match entity_type {
    "song" | "venue" | "guest" => {},
    _ => return Err(JsValue::from_str("Invalid entity type. Must be: song, venue, or guest"))
}
```

---

## TypedArray Zero-Copy Pattern

### Required Object Structure

```typescript
interface TypedArrayResult {
  songIds?: Int32Array | BigInt64Array;
  showIds?: Int32Array | BigInt64Array;
  scores?: Float32Array | Float64Array;
  counts?: Int32Array | Uint32Array;
  count: number;            // REQUIRED: Total results
}
```

### Creating TypedArray Results in Rust

```rust
#[wasm_bindgen]
pub fn search_scores_typed(&self, query: &str, limit: u32) -> Result<JsValue, JsValue> {
    let results = self._search_impl(query, None, limit as usize);

    // Convert to arrays
    let ids: Vec<i32> = results.iter().map(|r| r.id as i32).collect();
    let scores: Vec<f32> = results.iter().map(|r| r.score).collect();

    // Create JS object
    let obj = js_sys::Object::new();

    // Set each property
    js_sys::Reflect::set(
        &obj,
        &"songIds".into(),
        &js_sys::Int32Array::from(&ids[..]).into()
    )?;

    js_sys::Reflect::set(
        &obj,
        &"scores".into(),
        &js_sys::Float32Array::from(&scores[..]).into()
    )?;

    js_sys::Reflect::set(
        &obj,
        &"count".into(),
        &(results.len() as u32).into()
    )?;

    Ok(obj.into())
}
```

### Using TypedArray Results in TypeScript

```typescript
const result = await engine.searchScoresTyped("query", 100);
const ids: Int32Array = result.songIds;
const scores: Float32Array = result.scores;
const count: number = result.count;

// Direct access (zero-copy!)
for (let i = 0; i < count; i++) {
  console.log(`Song ${ids[i]}: score ${scores[i]}`);
}
```

---

## Summary: Critical Implementation Requirements

1. **All structs MUST have `#[wasm_bindgen]`**
2. **All constructors MUST have `#[wasm_bindgen(constructor)]`**
3. **All public methods MUST have `#[wasm_bindgen]`**
4. **All public methods MUST return `Result<T, JsValue>`**
5. **JSON serialization MUST use `serde_json`**
6. **JS object creation MUST use `js_sys::Object` and `Reflect::set`**
7. **TypedArrays MUST use `js_sys::Int32Array|Float32Array` etc.**
8. **All serde output MUST use `serde_wasm_bindgen::to_value`**
9. **Error messages MUST be descriptive**
10. **No panics** (use Result instead)

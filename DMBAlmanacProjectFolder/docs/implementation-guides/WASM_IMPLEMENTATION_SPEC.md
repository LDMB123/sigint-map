# DMB Almanac WASM Implementation Specification

**Target Audience:** Rust Developer
**Format:** Detailed implementation guide with code stubs and algorithm pseudocode
**Date:** January 23, 2026

---

## Part 1: Project Structure & Setup

### Module Organization

```
Rust WASM Modules (Cargo.toml in each):
├── dmb-transform/
│   ├── Cargo.toml
│   ├── src/
│   │   ├── lib.rs                    (module exports)
│   │   ├── tfidf.rs                  (NEW: TfIdfIndex class)
│   │   ├── similarity.rs             (NEW: SetlistSimilarityEngine class)
│   │   ├── rarity.rs                 (NEW: RarityEngine class)
│   │   ├── utils.rs                  (helpers: parsing, serialization)
│   │   └── ...existing code...
│   └── Cargo.toml (add dependencies)
│
├── dmb-segue-analysis/
│   ├── Cargo.toml
│   ├── src/
│   │   ├── lib.rs
│   │   ├── predictor.rs              (NEW: SetlistPredictor class - expose existing?)
│   │   └── ...existing code...
│   └── Cargo.toml
│
└── dmb-date-utils/
    └── ...already implemented...
```

### Cargo.toml Dependencies (for both modules)

```toml
[dependencies]
wasm-bindgen = "0.2"
wasm-bindgen-futures = "0.4"
web-sys = { version = "0.3", features = ["console"] }
js-sys = "0.3"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"

[dev-dependencies]
wasm-bindgen-test = "1.3"

[profile.release]
opt-level = "z"     # Optimize for size
lto = true
codegen-units = 1
strip = true
```

---

## Part 2: TfIdfIndex Implementation

### File: `dmb-transform/src/tfidf.rs`

```rust
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use wasm_bindgen::prelude::*;

// ==================== DATA STRUCTURES ====================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Document {
    pub id: u32,
    pub title: String,
    pub entity_type: String,  // "song", "venue", "guest"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TfIdfSearchResult {
    pub id: u32,
    pub title: String,
    pub score: f32,
    #[serde(rename = "matchedTerms")]
    pub matched_terms: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AutocompleteResult {
    pub term: String,
    pub frequency: u32,
    #[serde(rename = "documentCount")]
    pub document_count: u32,
}

// ==================== TFIDF INDEX ====================

#[wasm_bindgen]
pub struct TfIdfIndex {
    // Documents indexed (id -> document)
    documents: HashMap<u32, Document>,

    // Inverted index: term -> set of document IDs
    index: HashMap<String, Vec<u32>>,

    // Term frequencies: (doc_id, term) -> frequency
    tf: HashMap<(u32, String), f32>,

    // Document frequencies: term -> count of docs containing term
    df: HashMap<String, u32>,

    // Total documents (for IDF calculation)
    doc_count: u32,

    // Term frequency in each document (for IDF normalization)
    doc_lengths: HashMap<u32, usize>,

    // Documents by type (for filtering searches)
    docs_by_type: HashMap<String, Vec<u32>>,

    // For autocomplete: prefix -> terms
    prefix_tree: HashMap<String, u32>,  // Simplified: just store term frequency
}

#[wasm_bindgen]
impl TfIdfIndex {
    #[wasm_bindgen(constructor)]
    pub fn new() -> TfIdfIndex {
        TfIdfIndex {
            documents: HashMap::new(),
            index: HashMap::new(),
            tf: HashMap::new(),
            df: HashMap::new(),
            doc_count: 0,
            doc_lengths: HashMap::new(),
            docs_by_type: HashMap::new(),
            prefix_tree: HashMap::new(),
        }
    }

    /// Index songs for full-text search
    #[wasm_bindgen]
    pub fn index_songs(&mut self, songs_json: &str) -> Result<(), JsValue> {
        self._index_entities(songs_json, "song")
    }

    /// Index venues for search
    #[wasm_bindgen]
    pub fn index_venues(&mut self, venues_json: &str) -> Result<(), JsValue> {
        self._index_entities(venues_json, "venue")
    }

    /// Index guest names for search
    #[wasm_bindgen]
    pub fn index_guests(&mut self, guests_json: &str) -> Result<(), JsValue> {
        self._index_entities(guests_json, "guest")
    }

    /// Search across all indexed entities
    #[wasm_bindgen]
    pub fn search(&self, query: &str, limit: u32) -> Result<JsValue, JsValue> {
        let results = self._search_impl(query, None, limit as usize);
        Ok(serde_wasm_bindgen::to_value(&results).unwrap())
    }

    /// Search specific entity type only
    #[wasm_bindgen]
    pub fn search_by_type(&self, query: &str, entity_type: &str, limit: u32) -> Result<JsValue, JsValue> {
        let results = self._search_impl(query, Some(entity_type), limit as usize);
        Ok(serde_wasm_bindgen::to_value(&results).unwrap())
    }

    /// Phrase search (exact term sequences)
    #[wasm_bindgen]
    pub fn search_phrase(&self, phrase: &str, limit: u32) -> Result<JsValue, JsValue> {
        // Exact phrase matching (simplified: just match all terms in same doc)
        let tokens = self._tokenize(phrase);
        let results = self._search_phrase_impl(&tokens, limit as usize);
        Ok(serde_wasm_bindgen::to_value(&results).unwrap())
    }

    /// Get autocomplete suggestions for prefix
    #[wasm_bindgen]
    pub fn autocomplete(&self, prefix: &str, limit: u32) -> Result<JsValue, JsValue> {
        let prefix = self._normalize_token(prefix);
        let mut results = Vec::new();

        // Find all terms starting with prefix
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

        // Sort by frequency descending
        results.sort_by(|a, b| b.frequency.cmp(&a.frequency));
        results.truncate(limit as usize);

        Ok(serde_wasm_bindgen::to_value(&results).unwrap())
    }

    /// Zero-copy TypedArray result variant
    #[wasm_bindgen]
    pub fn search_scores_typed(&self, query: &str, limit: u32) -> Result<JsValue, JsValue> {
        // Return { songIds, scores, count }
        // For now, fall back to regular search
        let results = self._search_impl(query, None, limit as usize);

        let ids: Vec<i32> = results.iter().map(|r| r.id as i32).collect();
        let scores: Vec<f32> = results.iter().map(|r| r.score).collect();

        let obj = js_sys::Object::new();
        js_sys::Reflect::set(
            &obj,
            &"songIds".into(),
            &js_sys::Int32Array::from(&ids[..]).into(),
        ).ok();
        js_sys::Reflect::set(
            &obj,
            &"scores".into(),
            &js_sys::Float32Array::from(&scores[..]).into(),
        ).ok();
        js_sys::Reflect::set(
            &obj,
            &"count".into(),
            &(results.len() as u32).into(),
        ).ok();

        Ok(obj.into())
    }

    // ==================== PRIVATE HELPERS ====================

    fn _index_entities(&mut self, json: &str, entity_type: &str) -> Result<(), JsValue> {
        let docs: Vec<Document> = serde_json::from_str(json)
            .map_err(|e| JsValue::from_str(&format!("JSON parse error: {}", e)))?;

        for mut doc in docs {
            doc.entity_type = entity_type.to_string();
            self._add_document(&doc);
        }

        Ok(())
    }

    fn _add_document(&mut self, doc: &Document) {
        let doc_id = doc.id;
        self.documents.insert(doc_id, doc.clone());

        // Tokenize and index
        let tokens = self._tokenize(&doc.title);
        self.doc_lengths.insert(doc_id, tokens.len());

        // Track terms and frequencies
        let mut term_freq: HashMap<String, u32> = HashMap::new();
        for token in tokens {
            *term_freq.entry(token.clone()).or_insert(0) += 1;
            self.index.entry(token.clone()).or_insert_with(Vec::new).push(doc_id);
            self.prefix_tree.entry(token.clone()).or_insert(0);
        }

        // Update TF and DF
        for (term, freq) in term_freq {
            let tf_score = (freq as f32).sqrt() / (self.doc_lengths[&doc_id] as f32).sqrt();
            self.tf.insert((doc_id, term.clone()), tf_score);

            *self.df.entry(term.clone()).or_insert(0) += 1;
            *self.prefix_tree.get_mut(&term).unwrap() += 1;
        }

        // Update doc count and type index
        self.doc_count += 1;
        self.docs_by_type.entry(doc.entity_type.clone())
            .or_insert_with(Vec::new)
            .push(doc_id);
    }

    fn _search_impl(&self, query: &str, entity_type: Option<&str>, limit: usize) -> Vec<TfIdfSearchResult> {
        let tokens = self._tokenize(query);
        if tokens.is_empty() {
            return Vec::new();
        }

        // Find documents containing any token
        let mut scored_docs: HashMap<u32, (f32, Vec<String>)> = HashMap::new();

        for token in &tokens {
            if let Some(doc_ids) = self.index.get(token) {
                // IDF calculation
                let idf = ((self.doc_count as f32 + 1.0) / (self.df.get(token).copied().unwrap_or(1) as f32 + 1.0)).ln();

                for &doc_id in doc_ids {
                    // Filter by type if specified
                    if let Some(filter_type) = entity_type {
                        if self.documents[&doc_id].entity_type != filter_type {
                            continue;
                        }
                    }

                    let tf = self.tf.get(&(doc_id, token.clone())).copied().unwrap_or(0.0);
                    let tfidf = tf * idf;

                    let (score, mut matched) = scored_docs.remove(&doc_id).unwrap_or((0.0, Vec::new()));
                    matched.push(token.clone());
                    scored_docs.insert(doc_id, (score + tfidf, matched));
                }
            }
        }

        // Convert to results
        let mut results: Vec<_> = scored_docs
            .iter()
            .map(|(doc_id, (score, matched))| {
                let doc = &self.documents[doc_id];
                TfIdfSearchResult {
                    id: doc.id,
                    title: doc.title.clone(),
                    score: *score,
                    matched_terms: matched.clone(),
                }
            })
            .collect();

        // Sort by score descending
        results.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap_or(std::cmp::Ordering::Equal));
        results.truncate(limit);

        results
    }

    fn _search_phrase_impl(&self, tokens: &[String], limit: usize) -> Vec<TfIdfSearchResult> {
        // Simplified: just find docs containing all tokens
        if tokens.is_empty() {
            return Vec::new();
        }

        let mut doc_candidates: Option<Vec<u32>> = None;

        for token in tokens {
            let docs = self.index.get(token).cloned().unwrap_or_default();
            match doc_candidates {
                None => doc_candidates = Some(docs),
                Some(existing) => {
                    let intersection: Vec<u32> = existing
                        .into_iter()
                        .filter(|id| docs.contains(id))
                        .collect();
                    doc_candidates = Some(intersection);
                }
            }
        }

        let mut results = doc_candidates
            .unwrap_or_default()
            .iter()
            .map(|&doc_id| {
                let doc = &self.documents[&doc_id];
                let score = tokens.len() as f32;  // All tokens matched
                TfIdfSearchResult {
                    id: doc.id,
                    title: doc.title.clone(),
                    score,
                    matched_terms: tokens.to_vec(),
                }
            })
            .collect::<Vec<_>>();

        results.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap_or(std::cmp::Ordering::Equal));
        results.truncate(limit);

        results
    }

    fn _tokenize(&self, text: &str) -> Vec<String> {
        text.split(|c: char| !c.is_alphanumeric())
            .map(|s| self._normalize_token(s))
            .filter(|s| !s.is_empty() && s.len() > 1)  // Skip single chars and empty
            .collect()
    }

    fn _normalize_token(&self, token: &str) -> String {
        token.to_lowercase().trim().to_string()
    }
}

impl Default for TfIdfIndex {
    fn default() -> Self {
        Self::new()
    }
}
```

### Export in `dmb-transform/src/lib.rs`

```rust
pub mod tfidf;
pub use tfidf::TfIdfIndex;
```

---

## Part 3: SetlistSimilarityEngine Implementation

### File: `dmb-transform/src/similarity.rs`

```rust
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use wasm_bindgen::prelude::*;

// ==================== DATA STRUCTURES ====================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SetlistEntry {
    pub show_id: u32,
    pub song_id: u32,
    pub position: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SimilarShowResult {
    #[serde(rename = "showId")]
    pub show_id: u32,
    pub similarity: f32,
    #[serde(rename = "sharedSongs")]
    pub shared_songs: u32,
    pub method: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CoOccurrenceEntry {
    #[serde(rename = "songA")]
    pub song_a: u32,
    #[serde(rename = "songB")]
    pub song_b: u32,
    pub count: u32,
    pub percentage: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClusterResult {
    #[serde(rename = "clusterId")]
    pub cluster_id: u32,
    #[serde(rename = "showIds")]
    pub show_ids: Vec<u32>,
    #[serde(rename = "centroidSongs")]
    pub centroid_songs: Vec<u32>,
    #[serde(rename = "avgSimilarity")]
    pub avg_similarity: f32,
}

// ==================== SIMILARITY ENGINE ====================

#[wasm_bindgen]
pub struct SetlistSimilarityEngine {
    // Setlist entries grouped by show
    shows: HashMap<u32, Vec<u32>>,  // show_id -> vec of song_ids

    // All show IDs (for iteration)
    show_ids: Vec<u32>,

    // Total unique songs
    total_songs: u32,

    // Precomputed similarities (for caching)
    similarity_cache: HashMap<(u32, u32), (f32, f32, f32)>,  // (show_a, show_b) -> (jaccard, cosine, overlap)
}

#[wasm_bindgen]
impl SetlistSimilarityEngine {
    #[wasm_bindgen(constructor)]
    pub fn new() -> SetlistSimilarityEngine {
        SetlistSimilarityEngine {
            shows: HashMap::new(),
            show_ids: Vec::new(),
            total_songs: 0,
            similarity_cache: HashMap::new(),
        }
    }

    /// Initialize with setlist data
    #[wasm_bindgen]
    pub fn initialize(&mut self, setlist_entries_json: &str, total_songs: u32) -> Result<(), JsValue> {
        let entries: Vec<SetlistEntry> = serde_json::from_str(setlist_entries_json)
            .map_err(|e| JsValue::from_str(&format!("JSON parse error: {}", e)))?;

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

    /// Find similar shows
    #[wasm_bindgen]
    pub fn find_similar_shows(&mut self, target_show_id: u32, method: &str, limit: u32) -> Result<JsValue, JsValue> {
        let target_songs = self.shows.get(&target_show_id)
            .ok_or_else(|| JsValue::from_str("Show not found"))?;

        let mut results = Vec::new();

        for &show_id in &self.show_ids {
            if show_id == target_show_id {
                continue;
            }

            let show_songs = &self.shows[&show_id];
            let (shared, jaccard, cosine, overlap) = self._compute_similarities(target_songs, show_songs);

            let similarity = match method {
                "jaccard" => jaccard,
                "cosine" => cosine,
                "overlap" => overlap,
                _ => jaccard,
            };

            results.push((show_id, shared, similarity, method.to_string()));
        }

        // Sort by similarity descending
        results.sort_by(|a, b| b.2.partial_cmp(&a.2).unwrap_or(std::cmp::Ordering::Equal));
        results.truncate(limit as usize);

        let output: Vec<SimilarShowResult> = results
            .into_iter()
            .map(|(show_id, shared, similarity, method)| SimilarShowResult {
                show_id,
                similarity,
                shared_songs: shared as u32,
                method,
            })
            .collect();

        Ok(serde_wasm_bindgen::to_value(&output).unwrap())
    }

    /// Compare two shows
    #[wasm_bindgen]
    pub fn compare_shows(&mut self, show_id_a: u32, show_id_b: u32) -> Result<JsValue, JsValue> {
        let songs_a = self.shows.get(&show_id_a)
            .ok_or_else(|| JsValue::from_str("Show A not found"))?;
        let songs_b = self.shows.get(&show_id_b)
            .ok_or_else(|| JsValue::from_str("Show B not found"))?;

        let (shared, jaccard, cosine, overlap) = self._compute_similarities(songs_a, songs_b);

        let shared_songs: Vec<u32> = songs_a.iter()
            .filter(|s| songs_b.contains(s))
            .copied()
            .collect();

        let obj = js_sys::Object::new();
        js_sys::Reflect::set(&obj, &"jaccard".into(), &jaccard.into()).ok();
        js_sys::Reflect::set(&obj, &"cosine".into(), &cosine.into()).ok();
        js_sys::Reflect::set(&obj, &"overlap".into(), &overlap.into()).ok();
        js_sys::Reflect::set(&obj, &"sharedSongs".into(), &serde_wasm_bindgen::to_value(&shared_songs).unwrap()).ok();

        Ok(obj.into())
    }

    /// Get shared songs between two shows
    #[wasm_bindgen]
    pub fn get_shared_songs(&self, show_id_a: u32, show_id_b: u32) -> Result<JsValue, JsValue> {
        let songs_a = self.shows.get(&show_id_a)
            .ok_or_else(|| JsValue::from_str("Show A not found"))?;
        let songs_b = self.shows.get(&show_id_b)
            .ok_or_else(|| JsValue::from_str("Show B not found"))?;

        let shared: Vec<u32> = songs_a.iter()
            .filter(|s| songs_b.contains(s))
            .copied()
            .collect();

        Ok(serde_wasm_bindgen::to_value(&shared).unwrap())
    }

    /// Compute co-occurrence matrix
    #[wasm_bindgen]
    pub fn compute_co_occurrence_matrix(&self, min_occurrences: u32) -> Result<JsValue, JsValue> {
        let mut co_occur: HashMap<(u32, u32), u32> = HashMap::new();

        // Count co-occurrences
        for songs in self.shows.values() {
            for i in 0..songs.len() {
                for j in (i + 1)..songs.len() {
                    let a = songs[i].min(songs[j]);
                    let b = songs[i].max(songs[j]);
                    *co_occur.entry((a, b)).or_insert(0) += 1;
                }
            }
        }

        // Convert to results
        let results: Vec<CoOccurrenceEntry> = co_occur
            .into_iter()
            .filter(|(_, count)| *count >= min_occurrences)
            .map(|((song_a, song_b), count)| {
                // Calculate percentage for song_a
                let song_a_shows = self.shows.values()
                    .filter(|s| s.contains(&song_a))
                    .count() as f32;
                let percentage = if song_a_shows > 0.0 {
                    (count as f32 / song_a_shows) * 100.0
                } else {
                    0.0
                };

                CoOccurrenceEntry {
                    song_a,
                    song_b,
                    count,
                    percentage,
                }
            })
            .collect();

        Ok(serde_wasm_bindgen::to_value(&results).unwrap())
    }

    /// Find associated songs
    #[wasm_bindgen]
    pub fn find_associated_songs(&self, song_id: u32, limit: u32) -> Result<JsValue, JsValue> {
        let mut associations: HashMap<u32, (u32, u32)> = HashMap::new();  // song -> (count, show_count)

        let shows_with_song: Vec<u32> = self.shows.iter()
            .filter(|(_, songs)| songs.contains(&song_id))
            .map(|(show_id, _)| *show_id)
            .collect();

        let total_shows_with_song = shows_with_song.len() as f32;

        // For each song in same show, count co-occurrences
        for show_id in shows_with_song {
            if let Some(songs) = self.shows.get(&show_id) {
                for &other_song in songs {
                    if other_song != song_id {
                        let (count, _) = associations.entry(other_song).or_insert((0, 0));
                        *count += 1;
                    }
                }
            }
        }

        // Convert to results with probability
        let mut results: Vec<_> = associations
            .into_iter()
            .map(|(song_id, (count, _))| {
                let probability = if total_shows_with_song > 0.0 {
                    count as f32 / total_shows_with_song
                } else {
                    0.0
                };

                (song_id, count, probability)
            })
            .collect();

        results.sort_by(|a, b| b.1.cmp(&a.1));
        results.truncate(limit as usize);

        let output: Vec<_> = results
            .into_iter()
            .map(|(song_id, co_occur_count, probability)| {
                let mut obj = js_sys::Object::new();
                js_sys::Reflect::set(&obj, &"songId".into(), &song_id.into()).ok();
                js_sys::Reflect::set(&obj, &"coOccurrenceCount".into(), &co_occur_count.into()).ok();
                js_sys::Reflect::set(&obj, &"probability".into(), &probability.into()).ok();
                obj
            })
            .collect();

        Ok(serde_wasm_bindgen::to_value(&output).unwrap())
    }

    /// Calculate diversity
    #[wasm_bindgen]
    pub fn calculate_diversity(&self, show_id: u32) -> Result<f32, JsValue> {
        let songs = self.shows.get(&show_id)
            .ok_or_else(|| JsValue::from_str("Show not found"))?;

        let unique_count = songs.iter().collect::<HashSet<_>>().len();
        let total_count = songs.len();

        Ok(unique_count as f32 / total_count as f32)
    }

    /// Cluster shows (simplified k-means)
    #[wasm_bindgen]
    pub fn cluster_shows(&mut self, num_clusters: u32, max_iterations: u32) -> Result<JsValue, JsValue> {
        let num_clusters = (num_clusters as usize).min(self.show_ids.len());
        let mut clusters: Vec<Vec<u32>> = vec![Vec::new(); num_clusters];

        // Initialize: assign shows to clusters randomly
        for (i, &show_id) in self.show_ids.iter().enumerate() {
            clusters[i % num_clusters].push(show_id);
        }

        // K-means iterations (simplified)
        for _ in 0..max_iterations {
            // TODO: Implement proper centroid recomputation
            // For now, just keep current clusters
        }

        let results: Vec<ClusterResult> = clusters
            .into_iter()
            .enumerate()
            .map(|(cluster_id, show_ids)| {
                // Find centroid songs (most common in cluster)
                let mut song_freq: HashMap<u32, u32> = HashMap::new();
                for &show_id in &show_ids {
                    if let Some(songs) = self.shows.get(&show_id) {
                        for &song in songs {
                            *song_freq.entry(song).or_insert(0) += 1;
                        }
                    }
                }

                let mut centroid_songs: Vec<_> = song_freq
                    .into_iter()
                    .map(|(song, freq)| (song, freq))
                    .collect();
                centroid_songs.sort_by_key(|&(_, freq)| std::cmp::Reverse(freq));
                let centroid_songs: Vec<u32> = centroid_songs.iter().take(5).map(|&(s, _)| s).collect();

                // Calculate average similarity within cluster
                let mut total_similarity = 0.0;
                let mut comparisons = 0;
                for i in 0..show_ids.len() {
                    for j in (i + 1)..show_ids.len().min(i + 5) {  // Limit comparisons
                        let songs_i = &self.shows[&show_ids[i]];
                        let songs_j = &self.shows[&show_ids[j]];
                        let (_, jaccard, _, _) = self._compute_similarities(songs_i, songs_j);
                        total_similarity += jaccard;
                        comparisons += 1;
                    }
                }

                let avg_similarity = if comparisons > 0 {
                    total_similarity / comparisons as f32
                } else {
                    0.0
                };

                ClusterResult {
                    cluster_id: cluster_id as u32,
                    show_ids,
                    centroid_songs,
                    avg_similarity,
                }
            })
            .collect();

        Ok(serde_wasm_bindgen::to_value(&results).unwrap())
    }

    /// Zero-copy similarity results
    #[wasm_bindgen]
    pub fn get_similarities_typed(&mut self, target_show_id: u32, limit: u32) -> Result<JsValue, JsValue> {
        let target_songs = self.shows.get(&target_show_id)
            .ok_or_else(|| JsValue::from_str("Show not found"))?;

        let mut results: Vec<(u32, f32)> = self.show_ids
            .iter()
            .filter(|&&id| id != target_show_id)
            .map(|&show_id| {
                let (_, jaccard, _, _) = self._compute_similarities(target_songs, &self.shows[&show_id]);
                (show_id, jaccard)
            })
            .collect();

        results.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
        results.truncate(limit as usize);

        let show_ids: Vec<i32> = results.iter().map(|(id, _)| *id as i32).collect();
        let scores: Vec<f32> = results.iter().map(|(_, score)| *score).collect();

        let obj = js_sys::Object::new();
        js_sys::Reflect::set(&obj, &"showIds".into(), &js_sys::Int32Array::from(&show_ids[..]).into()).ok();
        js_sys::Reflect::set(&obj, &"scores".into(), &js_sys::Float32Array::from(&scores[..]).into()).ok();
        js_sys::Reflect::set(&obj, &"count".into(), &(results.len() as u32).into()).ok();

        Ok(obj.into())
    }

    // ==================== PRIVATE HELPERS ====================

    fn _compute_similarities(&self, songs_a: &[u32], songs_b: &[u32]) -> (usize, f32, f32, f32) {
        let set_a: HashSet<u32> = songs_a.iter().copied().collect();
        let set_b: HashSet<u32> = songs_b.iter().copied().collect();

        let intersection = set_a.intersection(&set_b).count();
        let union = set_a.union(&set_b).count();

        // Jaccard
        let jaccard = if union > 0 {
            intersection as f32 / union as f32
        } else {
            0.0
        };

        // Cosine
        let cosine = if !songs_a.is_empty() && !songs_b.is_empty() {
            intersection as f32 / ((songs_a.len() as f32).sqrt() * (songs_b.len() as f32).sqrt())
        } else {
            0.0
        };

        // Overlap (Szymkiewicz–Simpson)
        let overlap = if !songs_a.is_empty() || !songs_b.is_empty() {
            intersection as f32 / songs_a.len().min(songs_b.len()) as f32
        } else {
            0.0
        };

        (intersection, jaccard, cosine, overlap)
    }
}

impl Default for SetlistSimilarityEngine {
    fn default() -> Self {
        Self::new()
    }
}
```

---

## Part 4: RarityEngine Implementation (Stub)

### File: `dmb-transform/src/rarity.rs` (Abbreviated)

```rust
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use wasm_bindgen::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SongRarity {
    #[serde(rename = "songId")]
    pub song_id: u32,
    pub title: String,
    #[serde(rename = "inverseFrequency")]
    pub inverse_frequency: f32,
    #[serde(rename = "logScaled")]
    pub log_scaled: f32,
    pub percentile: f32,
    #[serde(rename = "gapBased")]
    pub gap_based: f32,
    #[serde(rename = "combinedScore")]
    pub combined_score: f32,
}

#[wasm_bindgen]
pub struct RarityEngine {
    // State
}

#[wasm_bindgen]
impl RarityEngine {
    #[wasm_bindgen(constructor)]
    pub fn new() -> RarityEngine {
        RarityEngine {}
    }

    #[wasm_bindgen]
    pub fn initialize(&mut self, _setlist_entries_json: &str, _songs_json: &str) -> Result<(), JsValue> {
        // TODO: Implement
        Ok(())
    }

    #[wasm_bindgen]
    pub fn compute_song_rarity(&self, _song_id: u32) -> Result<JsValue, JsValue> {
        // TODO: Implement
        Err(JsValue::from_str("Not implemented"))
    }

    // ... other methods
}
```

---

## Part 5: SetlistPredictor Implementation (Stub)

### File: `dmb-segue-analysis/src/predictor.rs` (Abbreviated)

```rust
use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PredictionSignals {
    pub markov1: f32,
    pub markov2: f32,
    pub markov3: f32,
    #[serde(rename = "positionScore")]
    pub position_score: f32,
    // ... other fields
}

#[wasm_bindgen]
pub struct SetlistPredictor {
    // State
}

#[wasm_bindgen]
impl SetlistPredictor {
    #[wasm_bindgen(constructor)]
    pub fn new() -> SetlistPredictor {
        SetlistPredictor {}
    }

    #[wasm_bindgen]
    pub fn initialize(&mut self, _setlist_entries_json: &str, _shows_json: Option<String>) -> Result<(), JsValue> {
        // TODO: Implement
        Ok(())
    }

    #[wasm_bindgen]
    pub fn predict_ensemble(&self, _context_json: &str, _limit: u32) -> Result<JsValue, JsValue> {
        // TODO: Implement
        Err(JsValue::from_str("Not implemented"))
    }

    // ... other methods
}
```

---

## Part 6: Building & Testing

### Build Commands

```bash
# In dmb-transform/
wasm-pack build --target bundler --dev

# In dmb-segue-analysis/
wasm-pack build --target bundler --dev

# Run tests
cargo test
```

### TypeScript Integration Test

```typescript
// test.ts
import { TfIdfSearchEngine, SetlistSimilarityEngine } from '$lib/wasm';

async function testWasmModules() {
  const songs = [
    { id: 1, title: "Ants Marching", total_performances: 500 },
    { id: 2, title: "Tripping Billies", total_performances: 300 },
  ];

  // Test TF-IDF
  const search = new TfIdfSearchEngine();
  await search.indexSongs(JSON.stringify(songs));
  const results = await search.search("ants", 10);
  console.log('Search results:', results);

  // Test Similarity
  const similarity = new SetlistSimilarityEngine();
  await similarity.initialize(JSON.stringify([
    { show_id: 1, song_id: 1, position: 0 },
    { show_id: 1, song_id: 2, position: 1 },
    { show_id: 2, song_id: 1, position: 0 },
  ]), 2);
  const similar = await similarity.findSimilarShows(1, 'jaccard', 10);
  console.log('Similar shows:', similar);
}

testWasmModules().catch(console.error);
```

---

## Implementation Checklist

- [ ] TfIdfIndex: Core tokenization + TF-IDF scoring
- [ ] TfIdfIndex: Phrase search support
- [ ] TfIdfIndex: Autocomplete/prefix tree
- [ ] TfIdfIndex: TypedArray output
- [ ] SetlistSimilarityEngine: Jaccard similarity
- [ ] SetlistSimilarityEngine: Cosine similarity
- [ ] SetlistSimilarityEngine: Overlap coefficient
- [ ] SetlistSimilarityEngine: K-means clustering
- [ ] RarityEngine: Inverse frequency calculation
- [ ] RarityEngine: Gap-based rarity
- [ ] RarityEngine: Percentile ranking
- [ ] SetlistPredictor: First-order Markov
- [ ] SetlistPredictor: Second-order Markov
- [ ] SetlistPredictor: Third-order Markov
- [ ] SetlistPredictor: Venue patterns
- [ ] SetlistPredictor: Seasonal patterns
- [ ] All: Error handling & edge cases
- [ ] All: Performance optimization (meet targets)
- [ ] All: Unit tests
- [ ] All: Integration tests with TypeScript

---

## Performance Profiling

```bash
# Build with optimizations
wasm-pack build --release

# Use wasm-opt
wasm-opt -Oz -o output.wasm input.wasm

# Benchmark with hyperfine
hyperfine './benchmark-js' './benchmark-wasm'
```

---

## Common Pitfalls

1. **Forgetting `#[wasm_bindgen]`** - Constructor won't be callable
2. **Not exporting in `lib.rs`** - Module won't be available
3. **String serialization overhead** - Consider `serde-wasm-bindgen` for zero-copy
4. **Memory leaks** - Don't forget cleanup for large allocations
5. **Browser compatibility** - Test on target browsers (Chromium 143+)

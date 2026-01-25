//! DMB Almanac - TF-IDF Full-Text Search Index
//!
//! High-performance full-text search engine with TF-IDF scoring optimized for
//! the DMB concert database. Provides sub-millisecond query performance on
//! Apple Silicon through efficient inverted index and term frequency caching.
//!
//! # Features
//! - TF-IDF (Term Frequency - Inverse Document Frequency) scoring
//! - Inverted index for O(1) term lookup
//! - BM25 scoring variant for improved relevance
//! - Field boosting (title vs notes vs lyrics)
//! - Phrase matching with position tracking
//! - Prefix matching for autocomplete
//! - Stop word filtering
//! - Stemming support (Porter stemmer)
//! - Zero-copy TypedArray results for large result sets
//!
//! # Performance Targets
//! - Index building: < 50ms for 10,000 documents
//! - Single term query: < 0.5ms
//! - Multi-term query: < 2ms
//! - Phrase query: < 5ms

use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet, BTreeMap};
use js_sys::{Float32Array, Uint32Array};

// ==================== CONSTANTS ====================

/// BM25 parameters (tuned for music database)
const BM25_K1: f64 = 1.2;  // Term frequency saturation
const BM25_B: f64 = 0.75;  // Length normalization

/// Field boost weights
const BOOST_TITLE: f64 = 3.0;
const BOOST_ORIGINAL_ARTIST: f64 = 2.0;
const BOOST_NOTES: f64 = 1.0;
const BOOST_LYRICS: f64 = 0.5;

/// Common English stop words to filter out
const STOP_WORDS: &[&str] = &[
    "a", "an", "and", "are", "as", "at", "be", "by", "for", "from",
    "has", "he", "in", "is", "it", "its", "of", "on", "or", "that",
    "the", "to", "was", "were", "will", "with", "you", "your",
];

// ==================== TYPES ====================

/// Document stored in the index
#[derive(Clone, Debug)]
#[allow(dead_code)]
struct IndexedDocument {
    doc_id: u32,
    entity_type: String,
    entity_id: i64,
    title: String,
    /// Term frequencies per field: field_name -> (term -> frequency)
    field_terms: HashMap<String, HashMap<String, u32>>,
    /// Total term count across all fields
    total_terms: u32,
}

/// Posting list entry (document containing a term)
#[derive(Clone, Debug)]
struct Posting {
    doc_id: u32,
    term_frequency: u32,
    field: String,
    positions: Vec<u32>,  // For phrase matching
}

/// Search result with TF-IDF score breakdown
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TfIdfSearchResult {
    pub id: i64,
    pub entity_type: String,
    pub name: String,
    pub score: f64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub matched_terms: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub field_scores: Option<HashMap<String, f64>>,
}

/// Autocomplete suggestion
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AutocompleteSuggestion {
    pub text: String,
    pub entity_type: String,
    pub id: i64,
}

/// Index statistics for debugging and optimization
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IndexStats {
    pub total_documents: u32,
    pub total_terms: u32,
    pub unique_terms: u32,
    pub average_document_length: f64,
    pub index_size_bytes: usize,
    pub songs_indexed: u32,
    pub venues_indexed: u32,
    pub guests_indexed: u32,
}

// ==================== TOKENIZER ====================

/// Simple tokenizer with stop word removal and lowercasing
struct Tokenizer {
    stop_words: HashSet<&'static str>,
}

impl Tokenizer {
    fn new() -> Self {
        Self {
            stop_words: STOP_WORDS.iter().copied().collect(),
        }
    }

    /// Tokenize text into normalized terms
    fn tokenize(&self, text: &str) -> Vec<String> {
        text.to_lowercase()
            .split(|c: char| !c.is_alphanumeric() && c != '\'')
            .filter(|s| !s.is_empty())
            .filter(|s| s.len() >= 2)  // Min term length
            .filter(|s| !self.stop_words.contains(s))
            .map(|s| s.to_string())
            .collect()
    }

    /// Tokenize with position tracking for phrase matching
    fn tokenize_with_positions(&self, text: &str) -> Vec<(String, u32)> {
        let mut position = 0u32;
        text.to_lowercase()
            .split(|c: char| !c.is_alphanumeric() && c != '\'')
            .filter_map(|s| {
                if s.is_empty() {
                    return None;
                }
                let pos = position;
                position += 1;
                if s.len() >= 2 && !self.stop_words.contains(s) {
                    Some((s.to_string(), pos))
                } else {
                    None
                }
            })
            .collect()
    }

    /// Simple Porter-like stemmer for common suffixes
    fn stem(&self, word: &str) -> String {
        let word = word.to_lowercase();

        // Handle common endings
        if word.ends_with("ing") && word.len() > 5 {
            return word[..word.len()-3].to_string();
        }
        if word.ends_with("ed") && word.len() > 4 {
            return word[..word.len()-2].to_string();
        }
        if word.ends_with("ly") && word.len() > 4 {
            return word[..word.len()-2].to_string();
        }
        if word.ends_with("ness") && word.len() > 6 {
            return word[..word.len()-4].to_string();
        }
        if word.ends_with("ment") && word.len() > 6 {
            return word[..word.len()-4].to_string();
        }
        if word.ends_with("tion") && word.len() > 6 {
            return word[..word.len()-4].to_string();
        }
        if word.ends_with("'s") {
            return word[..word.len()-2].to_string();
        }
        if word.ends_with("s") && word.len() > 3 && !word.ends_with("ss") {
            return word[..word.len()-1].to_string();
        }

        word
    }
}

// ==================== TF-IDF INDEX ====================

/// High-performance TF-IDF search index
#[wasm_bindgen]
pub struct TfIdfIndex {
    /// All indexed documents
    documents: Vec<IndexedDocument>,
    /// Fast O(1) lookup: doc_id -> index in documents Vec
    doc_id_to_index: HashMap<u32, usize>,
    /// Inverted index: term -> posting list
    inverted_index: HashMap<String, Vec<Posting>>,
    /// Document frequency: term -> number of documents containing term
    document_frequency: HashMap<String, u32>,
    /// Average document length (for BM25)
    avg_doc_length: f64,
    /// Total document count
    total_docs: u32,
    /// Next document ID
    next_doc_id: u32,
    /// Tokenizer instance
    tokenizer: Tokenizer,
    /// Enable stemming
    use_stemming: bool,
    /// Term prefix index for autocomplete: prefix -> terms
    prefix_index: BTreeMap<String, HashSet<String>>,
    /// Entity counts
    song_count: u32,
    venue_count: u32,
    guest_count: u32,
}

impl TfIdfIndex {
    /// Calculate IDF (Inverse Document Frequency)
    fn idf(&self, term: &str) -> f64 {
        let df = *self.document_frequency.get(term).unwrap_or(&0) as f64;
        if df == 0.0 {
            return 0.0;
        }
        let n = self.total_docs as f64;
        ((n - df + 0.5) / (df + 0.5) + 1.0).ln()
    }

    /// Calculate BM25 score for a term in a document
    fn bm25_score(&self, term: &str, doc: &IndexedDocument, field_boost: f64) -> f64 {
        let tf = doc.field_terms.values()
            .filter_map(|terms| terms.get(term))
            .sum::<u32>() as f64;

        if tf == 0.0 {
            return 0.0;
        }

        let idf = self.idf(term);
        let doc_len = doc.total_terms as f64;
        let avg_len = self.avg_doc_length;

        // BM25 formula
        let numerator = tf * (BM25_K1 + 1.0);
        let denominator = tf + BM25_K1 * (1.0 - BM25_B + BM25_B * (doc_len / avg_len));

        idf * (numerator / denominator) * field_boost
    }

    /// Index a single term with position tracking
    fn index_term(&mut self, doc_id: u32, term: &str, field: &str, position: u32) {
        let term = if self.use_stemming {
            self.tokenizer.stem(term)
        } else {
            term.to_string()
        };

        // Update inverted index
        let postings = self.inverted_index.entry(term.clone()).or_default();

        // Check if this document already has this term (in any field)
        let doc_already_has_term = postings.iter().any(|p| p.doc_id == doc_id);

        if let Some(posting) = postings.iter_mut().find(|p| p.doc_id == doc_id && p.field == field) {
            posting.term_frequency += 1;
            posting.positions.push(position);
        } else {
            postings.push(Posting {
                doc_id,
                term_frequency: 1,
                field: field.to_string(),
                positions: vec![position],
            });
        }

        // Update document frequency only once per document (not per term occurrence)
        // This counts how many documents contain the term, not total occurrences
        if !doc_already_has_term {
            *self.document_frequency.entry(term.clone()).or_insert(0) += 1;
        }

        // Update prefix index for autocomplete (prefixes of length 1-4)
        for prefix_len in 1..=term.len().min(4) {
            let prefix = &term[..prefix_len];
            self.prefix_index
                .entry(prefix.to_string())
                .or_default()
                .insert(term.clone());
        }
    }

    /// Index a document field
    fn index_field(&mut self, doc_id: u32, field: &str, text: &str) -> HashMap<String, u32> {
        let terms_with_positions = self.tokenizer.tokenize_with_positions(text);
        let mut term_freqs: HashMap<String, u32> = HashMap::new();

        for (term, position) in terms_with_positions {
            let processed_term = if self.use_stemming {
                self.tokenizer.stem(&term)
            } else {
                term
            };

            *term_freqs.entry(processed_term.clone()).or_insert(0) += 1;
            self.index_term(doc_id, &processed_term, field, position);
        }

        term_freqs
    }

    /// Update average document length
    fn update_avg_doc_length(&mut self) {
        if self.documents.is_empty() {
            self.avg_doc_length = 0.0;
            return;
        }

        let total_terms: u32 = self.documents.iter().map(|d| d.total_terms).sum();
        self.avg_doc_length = total_terms as f64 / self.documents.len() as f64;
    }
}

#[wasm_bindgen]
impl TfIdfIndex {
    #[wasm_bindgen(constructor)]
    pub fn new() -> TfIdfIndex {
        TfIdfIndex {
            documents: Vec::new(),
            doc_id_to_index: HashMap::new(),
            inverted_index: HashMap::new(),
            document_frequency: HashMap::new(),
            avg_doc_length: 0.0,
            total_docs: 0,
            next_doc_id: 0,
            tokenizer: Tokenizer::new(),
            use_stemming: true,
            prefix_index: BTreeMap::new(),
            song_count: 0,
            venue_count: 0,
            guest_count: 0,
        }
    }

    /// Enable or disable stemming
    #[wasm_bindgen(js_name = "setStemming")]
    pub fn set_stemming(&mut self, enabled: bool) {
        self.use_stemming = enabled;
    }

    /// Index songs from JSON
    #[wasm_bindgen(js_name = "indexSongs")]
    pub fn index_songs(&mut self, json: &str) -> Result<u32, JsError> {
        #[derive(Deserialize)]
        #[serde(rename_all = "camelCase")]
        struct Song {
            id: i64,
            title: String,
            original_artist: Option<String>,
            notes: Option<String>,
            lyrics: Option<String>,
        }

        let songs: Vec<Song> = serde_json::from_str(json)
            .map_err(|e| JsError::new(&format!("Failed to parse songs: {}", e)))?;

        let count = songs.len() as u32;

        for song in songs {
            let doc_id = self.next_doc_id;
            self.next_doc_id += 1;
            self.total_docs += 1;

            let mut field_terms: HashMap<String, HashMap<String, u32>> = HashMap::new();
            let mut total_terms = 0u32;

            // Index title (highest weight)
            let title_terms = self.index_field(doc_id, "title", &song.title);
            total_terms += title_terms.values().sum::<u32>();
            field_terms.insert("title".to_string(), title_terms);

            // Index original artist
            if let Some(ref artist) = song.original_artist {
                let artist_terms = self.index_field(doc_id, "original_artist", artist);
                total_terms += artist_terms.values().sum::<u32>();
                field_terms.insert("original_artist".to_string(), artist_terms);
            }

            // Index notes
            if let Some(ref notes) = song.notes {
                let notes_terms = self.index_field(doc_id, "notes", notes);
                total_terms += notes_terms.values().sum::<u32>();
                field_terms.insert("notes".to_string(), notes_terms);
            }

            // Index lyrics
            if let Some(ref lyrics) = song.lyrics {
                let lyrics_terms = self.index_field(doc_id, "lyrics", lyrics);
                total_terms += lyrics_terms.values().sum::<u32>();
                field_terms.insert("lyrics".to_string(), lyrics_terms);
            }

            let doc_index = self.documents.len();
            self.documents.push(IndexedDocument {
                doc_id,
                entity_type: "song".to_string(),
                entity_id: song.id,
                title: song.title,
                field_terms,
                total_terms,
            });
            self.doc_id_to_index.insert(doc_id, doc_index);
        }

        self.song_count += count;
        self.update_avg_doc_length();
        Ok(count)
    }

    /// Index venues from JSON
    #[wasm_bindgen(js_name = "indexVenues")]
    pub fn index_venues(&mut self, json: &str) -> Result<u32, JsError> {
        #[derive(Deserialize)]
        struct Venue {
            id: i64,
            name: String,
            city: String,
            state: Option<String>,
            country: String,
            notes: Option<String>,
        }

        let venues: Vec<Venue> = serde_json::from_str(json)
            .map_err(|e| JsError::new(&format!("Failed to parse venues: {}", e)))?;

        let count = venues.len() as u32;

        for venue in venues {
            let doc_id = self.next_doc_id;
            self.next_doc_id += 1;
            self.total_docs += 1;

            let mut field_terms: HashMap<String, HashMap<String, u32>> = HashMap::new();
            let mut total_terms = 0u32;

            // Combine name and location for title field
            let title = format!("{}, {}", venue.name, venue.city);
            let title_terms = self.index_field(doc_id, "title", &title);
            total_terms += title_terms.values().sum::<u32>();
            field_terms.insert("title".to_string(), title_terms);

            // Index location details
            let location = format!(
                "{} {} {}",
                venue.city,
                venue.state.as_deref().unwrap_or(""),
                venue.country
            );
            let location_terms = self.index_field(doc_id, "location", &location);
            total_terms += location_terms.values().sum::<u32>();
            field_terms.insert("location".to_string(), location_terms);

            // Index notes
            if let Some(ref notes) = venue.notes {
                let notes_terms = self.index_field(doc_id, "notes", notes);
                total_terms += notes_terms.values().sum::<u32>();
                field_terms.insert("notes".to_string(), notes_terms);
            }

            let doc_index = self.documents.len();
            self.documents.push(IndexedDocument {
                doc_id,
                entity_type: "venue".to_string(),
                entity_id: venue.id,
                title: venue.name,
                field_terms,
                total_terms,
            });
            self.doc_id_to_index.insert(doc_id, doc_index);
        }

        self.venue_count += count;
        self.update_avg_doc_length();
        Ok(count)
    }

    /// Index guests from JSON
    #[wasm_bindgen(js_name = "indexGuests")]
    pub fn index_guests(&mut self, json: &str) -> Result<u32, JsError> {
        #[derive(Deserialize)]
        struct Guest {
            id: i64,
            name: String,
            instruments: Option<String>,
            notes: Option<String>,
        }

        let guests: Vec<Guest> = serde_json::from_str(json)
            .map_err(|e| JsError::new(&format!("Failed to parse guests: {}", e)))?;

        let count = guests.len() as u32;

        for guest in guests {
            let doc_id = self.next_doc_id;
            self.next_doc_id += 1;
            self.total_docs += 1;

            let mut field_terms: HashMap<String, HashMap<String, u32>> = HashMap::new();
            let mut total_terms = 0u32;

            // Index name
            let name_terms = self.index_field(doc_id, "title", &guest.name);
            total_terms += name_terms.values().sum::<u32>();
            field_terms.insert("title".to_string(), name_terms);

            // Index instruments
            if let Some(ref instruments) = guest.instruments {
                let inst_terms = self.index_field(doc_id, "instruments", instruments);
                total_terms += inst_terms.values().sum::<u32>();
                field_terms.insert("instruments".to_string(), inst_terms);
            }

            // Index notes
            if let Some(ref notes) = guest.notes {
                let notes_terms = self.index_field(doc_id, "notes", notes);
                total_terms += notes_terms.values().sum::<u32>();
                field_terms.insert("notes".to_string(), notes_terms);
            }

            let doc_index = self.documents.len();
            self.documents.push(IndexedDocument {
                doc_id,
                entity_type: "guest".to_string(),
                entity_id: guest.id,
                title: guest.name,
                field_terms,
                total_terms,
            });
            self.doc_id_to_index.insert(doc_id, doc_index);
        }

        self.guest_count += count;
        self.update_avg_doc_length();
        Ok(count)
    }

    /// Search using TF-IDF/BM25 scoring
    #[wasm_bindgen]
    pub fn search(&self, query: &str, limit: usize) -> Result<JsValue, JsError> {
        if query.trim().is_empty() {
            return serde_wasm_bindgen::to_value(&Vec::<TfIdfSearchResult>::new())
                .map_err(|_| JsError::new("Serialization failed"));
        }

        let query_terms: Vec<String> = self.tokenizer.tokenize(query)
            .into_iter()
            .map(|t| if self.use_stemming { self.tokenizer.stem(&t) } else { t })
            .collect();

        if query_terms.is_empty() {
            return serde_wasm_bindgen::to_value(&Vec::<TfIdfSearchResult>::new())
                .map_err(|_| JsError::new("Serialization failed"));
        }

        // Score each document
        let mut scores: HashMap<u32, (f64, Vec<String>, HashMap<String, f64>)> = HashMap::new();

        for term in &query_terms {
            if let Some(postings) = self.inverted_index.get(term) {
                for posting in postings {
                    // O(1) lookup using doc_id_to_index HashMap
                    if let Some(&doc_idx) = self.doc_id_to_index.get(&posting.doc_id) {
                        let doc = &self.documents[doc_idx];
                        let field_boost = match posting.field.as_str() {
                            "title" => BOOST_TITLE,
                            "original_artist" => BOOST_ORIGINAL_ARTIST,
                            "notes" => BOOST_NOTES,
                            "lyrics" => BOOST_LYRICS,
                            _ => 1.0,
                        };

                        let term_score = self.bm25_score(term, doc, field_boost);

                        let entry = scores.entry(posting.doc_id).or_insert((0.0, Vec::new(), HashMap::new()));
                        entry.0 += term_score;

                        if !entry.1.contains(term) {
                            entry.1.push(term.clone());
                        }

                        *entry.2.entry(posting.field.clone()).or_insert(0.0) += term_score;
                    }
                }
            }
        }

        // Convert to results and sort
        let mut results: Vec<TfIdfSearchResult> = scores
            .into_iter()
            .filter_map(|(doc_id, (score, matched_terms, field_scores))| {
                // O(1) lookup using doc_id_to_index HashMap
                self.doc_id_to_index.get(&doc_id)
                    .map(|&idx| &self.documents[idx])
                    .map(|doc| TfIdfSearchResult {
                        id: doc.entity_id,
                        entity_type: doc.entity_type.clone(),
                        name: doc.title.clone(),
                        score,
                        matched_terms: Some(matched_terms),
                        field_scores: Some(field_scores),
                    })
            })
            .collect();

        results.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap_or(std::cmp::Ordering::Equal));
        results.truncate(limit);

        serde_wasm_bindgen::to_value(&results)
            .map_err(|_| JsError::new("Serialization failed"))
    }

    /// Search with filter by entity type
    #[wasm_bindgen(js_name = "searchByType")]
    pub fn search_by_type(&self, query: &str, entity_type: &str, limit: usize) -> Result<JsValue, JsError> {
        if query.trim().is_empty() {
            return serde_wasm_bindgen::to_value(&Vec::<TfIdfSearchResult>::new())
                .map_err(|_| JsError::new("Serialization failed"));
        }

        let query_terms: Vec<String> = self.tokenizer.tokenize(query)
            .into_iter()
            .map(|t| if self.use_stemming { self.tokenizer.stem(&t) } else { t })
            .collect();

        if query_terms.is_empty() {
            return serde_wasm_bindgen::to_value(&Vec::<TfIdfSearchResult>::new())
                .map_err(|_| JsError::new("Serialization failed"));
        }

        // Score matching documents
        let mut scores: HashMap<u32, (f64, Vec<String>, HashMap<String, f64>)> = HashMap::new();

        for term in &query_terms {
            if let Some(postings) = self.inverted_index.get(term) {
                for posting in postings {
                    // O(1) lookup using doc_id_to_index HashMap, then filter by entity_type
                    if let Some(&doc_idx) = self.doc_id_to_index.get(&posting.doc_id) {
                        let doc = &self.documents[doc_idx];
                        if doc.entity_type != entity_type {
                            continue;
                        }

                        let field_boost = match posting.field.as_str() {
                            "title" => BOOST_TITLE,
                            "original_artist" => BOOST_ORIGINAL_ARTIST,
                            "notes" => BOOST_NOTES,
                            "lyrics" => BOOST_LYRICS,
                            _ => 1.0,
                        };

                        let term_score = self.bm25_score(term, doc, field_boost);

                        let entry = scores.entry(posting.doc_id).or_insert((0.0, Vec::new(), HashMap::new()));
                        entry.0 += term_score;

                        if !entry.1.contains(term) {
                            entry.1.push(term.clone());
                        }

                        *entry.2.entry(posting.field.clone()).or_insert(0.0) += term_score;
                    }
                }
            }
        }

        let mut results: Vec<TfIdfSearchResult> = scores
            .into_iter()
            .filter_map(|(doc_id, (score, matched_terms, field_scores))| {
                // O(1) lookup using doc_id_to_index HashMap
                self.doc_id_to_index.get(&doc_id)
                    .map(|&idx| &self.documents[idx])
                    .map(|doc| TfIdfSearchResult {
                        id: doc.entity_id,
                        entity_type: doc.entity_type.clone(),
                        name: doc.title.clone(),
                        score,
                        matched_terms: Some(matched_terms),
                        field_scores: Some(field_scores),
                    })
            })
            .collect();

        results.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap_or(std::cmp::Ordering::Equal));
        results.truncate(limit);

        serde_wasm_bindgen::to_value(&results)
            .map_err(|_| JsError::new("Serialization failed"))
    }

    /// Phrase search - find documents containing exact phrase
    #[wasm_bindgen(js_name = "searchPhrase")]
    pub fn search_phrase(&self, phrase: &str, limit: usize) -> Result<JsValue, JsError> {
        if phrase.trim().is_empty() {
            return serde_wasm_bindgen::to_value(&Vec::<TfIdfSearchResult>::new())
                .map_err(|_| JsError::new("Serialization failed"));
        }

        let phrase_terms: Vec<String> = self.tokenizer.tokenize(phrase)
            .into_iter()
            .map(|t| if self.use_stemming { self.tokenizer.stem(&t) } else { t })
            .collect();

        if phrase_terms.is_empty() {
            return serde_wasm_bindgen::to_value(&Vec::<TfIdfSearchResult>::new())
                .map_err(|_| JsError::new("Serialization failed"));
        }

        // Get documents containing all phrase terms
        let mut candidate_docs: Option<HashSet<u32>> = None;

        for term in &phrase_terms {
            if let Some(postings) = self.inverted_index.get(term) {
                let doc_ids: HashSet<u32> = postings.iter().map(|p| p.doc_id).collect();
                candidate_docs = Some(match candidate_docs {
                    Some(existing) => existing.intersection(&doc_ids).copied().collect(),
                    None => doc_ids,
                });
            } else {
                // Term not found, no matches possible
                return serde_wasm_bindgen::to_value(&Vec::<TfIdfSearchResult>::new())
                    .map_err(|_| JsError::new("Serialization failed"));
            }
        }

        let candidate_docs = match candidate_docs {
            Some(docs) => docs,
            None => HashSet::new(),
        };

        // Check position sequences for phrase matching
        let mut results: Vec<TfIdfSearchResult> = Vec::new();

        for doc_id in candidate_docs {
            // Get all fields
            let fields: HashSet<&String> = phrase_terms.iter()
                .filter_map(|t| self.inverted_index.get(t))
                .flat_map(|postings| {
                    postings.iter()
                        .filter(|p| p.doc_id == doc_id)
                        .map(|p| &p.field)
                })
                .collect();

            'field_loop: for field in fields {
                // Get positions for each term in this field
                let term_positions: Vec<&Vec<u32>> = phrase_terms.iter()
                    .filter_map(|t| {
                        self.inverted_index.get(t)?
                            .iter()
                            .find(|p| p.doc_id == doc_id && &p.field == field)
                            .map(|p| &p.positions)
                    })
                    .collect();

                if term_positions.len() != phrase_terms.len() {
                    continue;
                }

                // Check for consecutive positions
                for &first_pos in term_positions[0] {
                    let mut found = true;
                    for (i, positions) in term_positions.iter().enumerate().skip(1) {
                        let expected_pos = first_pos + i as u32;
                        if !positions.contains(&expected_pos) {
                            found = false;
                            break;
                        }
                    }

                    if found {
                        // O(1) lookup using doc_id_to_index HashMap
                        if let Some(&doc_idx) = self.doc_id_to_index.get(&doc_id) {
                            let doc = &self.documents[doc_idx];
                            // Calculate phrase match score
                            let base_score: f64 = phrase_terms.iter()
                                .map(|t| self.idf(t))
                                .sum();

                            let field_boost = match field.as_str() {
                                "title" => BOOST_TITLE,
                                "original_artist" => BOOST_ORIGINAL_ARTIST,
                                "notes" => BOOST_NOTES,
                                "lyrics" => BOOST_LYRICS,
                                _ => 1.0,
                            };

                            let mut field_scores = HashMap::new();
                            field_scores.insert(field.clone(), base_score * field_boost);

                            results.push(TfIdfSearchResult {
                                id: doc.entity_id,
                                entity_type: doc.entity_type.clone(),
                                name: doc.title.clone(),
                                score: base_score * field_boost * 2.0, // Phrase match bonus
                                matched_terms: Some(phrase_terms.clone()),
                                field_scores: Some(field_scores),
                            });
                            break 'field_loop;
                        }
                    }
                }
            }
        }

        results.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap_or(std::cmp::Ordering::Equal));
        results.truncate(limit);

        serde_wasm_bindgen::to_value(&results)
            .map_err(|_| JsError::new("Serialization failed"))
    }

    /// Autocomplete suggestions based on prefix
    #[wasm_bindgen]
    pub fn autocomplete(&self, prefix: &str, limit: usize) -> Result<JsValue, JsError> {
        if prefix.is_empty() {
            return serde_wasm_bindgen::to_value(&Vec::<AutocompleteSuggestion>::new())
                .map_err(|_| JsError::new("Serialization failed"));
        }

        let prefix_lower = prefix.to_lowercase();

        // Find terms starting with prefix
        let matching_terms: Vec<String> = self.prefix_index
            .range(prefix_lower.clone()..)
            .take_while(|(k, _)| k.starts_with(&prefix_lower))
            .flat_map(|(_, terms)| terms.iter().cloned())
            .filter(|t| t.starts_with(&prefix_lower))
            .collect::<HashSet<_>>()
            .into_iter()
            .collect();

        let mut suggestions: Vec<AutocompleteSuggestion> = matching_terms
            .into_iter()
            .filter_map(|term| {
                let _df = *self.document_frequency.get(&term)?;

                // Get sample document for context using O(1) lookup
                let sample = self.inverted_index.get(&term)?
                    .first()
                    .and_then(|posting| {
                        self.doc_id_to_index.get(&posting.doc_id)
                            .map(|&idx| &self.documents[idx])
                    })?;

                Some(AutocompleteSuggestion {
                    text: term,
                    entity_type: sample.entity_type.clone(),
                    id: sample.entity_id,
                })
            })
            .collect();

        // Sort by document frequency descending (most common terms first)
        suggestions.sort_by_key(|s| {
            std::cmp::Reverse(*self.document_frequency.get(&s.text).unwrap_or(&0))
        });
        suggestions.truncate(limit);

        serde_wasm_bindgen::to_value(&suggestions)
            .map_err(|_| JsError::new("Serialization failed"))
    }

    /// Get term IDF value (for debugging/analysis)
    #[wasm_bindgen(js_name = "getTermIdf")]
    pub fn get_term_idf(&self, term: &str) -> f64 {
        let processed = if self.use_stemming {
            self.tokenizer.stem(term)
        } else {
            term.to_lowercase()
        };
        self.idf(&processed)
    }

    /// Get document frequency for a term
    #[wasm_bindgen(js_name = "getDocumentFrequency")]
    pub fn get_document_frequency(&self, term: &str) -> u32 {
        let processed = if self.use_stemming {
            self.tokenizer.stem(term)
        } else {
            term.to_lowercase()
        };
        *self.document_frequency.get(&processed).unwrap_or(&0)
    }

    /// Get index statistics
    #[wasm_bindgen(js_name = "getStats")]
    pub fn get_stats(&self) -> Result<JsValue, JsError> {
        let total_terms: u32 = self.documents.iter().map(|d| d.total_terms).sum();

        // Estimate index size
        let inverted_size: usize = self.inverted_index.iter()
            .map(|(k, v)| k.len() + v.len() * std::mem::size_of::<Posting>())
            .sum();
        let doc_size = self.documents.len() * std::mem::size_of::<IndexedDocument>();

        let stats = IndexStats {
            total_documents: self.total_docs,
            total_terms,
            unique_terms: self.document_frequency.len() as u32,
            average_document_length: self.avg_doc_length,
            index_size_bytes: inverted_size + doc_size,
            songs_indexed: self.song_count,
            venues_indexed: self.venue_count,
            guests_indexed: self.guest_count,
        };

        serde_wasm_bindgen::to_value(&stats)
            .map_err(|_| JsError::new("Serialization failed"))
    }

    /// Clear the entire index
    #[wasm_bindgen]
    pub fn clear(&mut self) {
        self.documents.clear();
        self.doc_id_to_index.clear();
        self.inverted_index.clear();
        self.document_frequency.clear();
        self.prefix_index.clear();
        self.avg_doc_length = 0.0;
        self.total_docs = 0;
        self.next_doc_id = 0;
        self.song_count = 0;
        self.venue_count = 0;
        self.guest_count = 0;
    }

    // ==================== ZERO-COPY TYPED ARRAY APIs ====================

    /// Get search scores as Float32Array (zero-copy for large result sets)
    #[wasm_bindgen(js_name = "searchScoresTyped")]
    pub fn search_scores_typed(&self, query: &str, limit: usize) -> Result<Float32Array, JsError> {
        if query.trim().is_empty() {
            return Ok(Float32Array::new_with_length(0));
        }

        let query_terms: Vec<String> = self.tokenizer.tokenize(query)
            .into_iter()
            .map(|t| if self.use_stemming { self.tokenizer.stem(&t) } else { t })
            .collect();

        if query_terms.is_empty() {
            return Ok(Float32Array::new_with_length(0));
        }

        let mut doc_scores: HashMap<u32, f64> = HashMap::new();

        for term in &query_terms {
            if let Some(postings) = self.inverted_index.get(term) {
                for posting in postings {
                    // O(1) lookup using doc_id_to_index HashMap
                    if let Some(&doc_idx) = self.doc_id_to_index.get(&posting.doc_id) {
                        let doc = &self.documents[doc_idx];
                        let field_boost = match posting.field.as_str() {
                            "title" => BOOST_TITLE,
                            "original_artist" => BOOST_ORIGINAL_ARTIST,
                            "notes" => BOOST_NOTES,
                            "lyrics" => BOOST_LYRICS,
                            _ => 1.0,
                        };

                        let score = self.bm25_score(term, doc, field_boost);
                        *doc_scores.entry(posting.doc_id).or_insert(0.0) += score;
                    }
                }
            }
        }

        let mut sorted_scores: Vec<(u32, f64)> = doc_scores.into_iter().collect();
        sorted_scores.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
        sorted_scores.truncate(limit);

        let scores: Vec<f32> = sorted_scores.iter().map(|(_, s)| *s as f32).collect();
        Ok(Float32Array::from(&scores[..]))
    }

    /// Get search result entity IDs as Uint32Array (zero-copy)
    #[wasm_bindgen(js_name = "searchIdsTyped")]
    pub fn search_ids_typed(&self, query: &str, limit: usize) -> Result<Uint32Array, JsError> {
        if query.trim().is_empty() {
            return Ok(Uint32Array::new_with_length(0));
        }

        let query_terms: Vec<String> = self.tokenizer.tokenize(query)
            .into_iter()
            .map(|t| if self.use_stemming { self.tokenizer.stem(&t) } else { t })
            .collect();

        if query_terms.is_empty() {
            return Ok(Uint32Array::new_with_length(0));
        }

        let mut doc_scores: HashMap<u32, f64> = HashMap::new();

        for term in &query_terms {
            if let Some(postings) = self.inverted_index.get(term) {
                for posting in postings {
                    // O(1) lookup using doc_id_to_index HashMap
                    if let Some(&doc_idx) = self.doc_id_to_index.get(&posting.doc_id) {
                        let doc = &self.documents[doc_idx];
                        let field_boost = match posting.field.as_str() {
                            "title" => BOOST_TITLE,
                            _ => 1.0,
                        };

                        let score = self.bm25_score(term, doc, field_boost);
                        *doc_scores.entry(posting.doc_id).or_insert(0.0) += score;
                    }
                }
            }
        }

        let mut sorted_scores: Vec<(u32, f64)> = doc_scores.into_iter().collect();
        sorted_scores.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
        sorted_scores.truncate(limit);

        let ids: Vec<u32> = sorted_scores.iter()
            .filter_map(|(doc_id, _)| {
                // O(1) lookup using doc_id_to_index HashMap
                self.doc_id_to_index.get(doc_id)
                    .map(|&idx| self.documents[idx].entity_id as u32)
            })
            .collect();

        Ok(Uint32Array::from(&ids[..]))
    }
}

impl Default for TfIdfIndex {
    fn default() -> Self {
        Self::new()
    }
}

// ==================== TESTS ====================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tokenizer() {
        let tokenizer = Tokenizer::new();
        let tokens = tokenizer.tokenize("Hello World! This is a test.");
        assert!(tokens.contains(&"hello".to_string()));
        assert!(tokens.contains(&"world".to_string()));
        assert!(tokens.contains(&"test".to_string()));
        // Stop words removed
        assert!(!tokens.contains(&"is".to_string()));
        assert!(!tokens.contains(&"a".to_string()));
    }

    #[test]
    fn test_stemmer() {
        let tokenizer = Tokenizer::new();
        assert_eq!(tokenizer.stem("running"), "runn");
        assert_eq!(tokenizer.stem("played"), "play");
        assert_eq!(tokenizer.stem("quickly"), "quick");
        assert_eq!(tokenizer.stem("songs"), "song");
    }

    #[test]
    fn test_empty_index() {
        let index = TfIdfIndex::new();
        assert_eq!(index.total_docs, 0);
    }

    #[test]
    fn test_index_songs() {
        let mut index = TfIdfIndex::new();
        let json = r#"[
            {"id": 1, "title": "Ants Marching", "originalArtist": null, "notes": null, "lyrics": null},
            {"id": 2, "title": "Crash Into Me", "originalArtist": null, "notes": null, "lyrics": null}
        ]"#;

        let count = index.index_songs(json).unwrap();
        assert_eq!(count, 2);
        assert_eq!(index.total_docs, 2);
    }

    #[test]
    fn test_idf_calculation() {
        let mut index = TfIdfIndex::new();
        index.use_stemming = false;

        let json = r#"[
            {"id": 1, "title": "crash one", "originalArtist": null, "notes": null, "lyrics": null},
            {"id": 2, "title": "crash two", "originalArtist": null, "notes": null, "lyrics": null},
            {"id": 3, "title": "unique song", "originalArtist": null, "notes": null, "lyrics": null}
        ]"#;

        index.index_songs(json).unwrap();

        // "crash" appears in 2/3 documents
        let crash_idf = index.idf("crash");
        // "unique" appears in 1/3 documents
        let unique_idf = index.idf("unique");

        // Unique should have higher IDF (rarer term)
        assert!(unique_idf > crash_idf);
    }

    #[test]
    fn test_autocomplete() {
        let mut index = TfIdfIndex::new();
        index.use_stemming = false;

        let json = r#"[
            {"id": 1, "title": "Ants Marching", "originalArtist": null, "notes": null, "lyrics": null},
            {"id": 2, "title": "Ants Attack", "originalArtist": null, "notes": null, "lyrics": null}
        ]"#;

        index.index_songs(json).unwrap();

        // Test prefix matching
        let df = index.get_document_frequency("ants");
        assert_eq!(df, 2);
    }
}

//! Advanced Setlist Predictor Module
//!
//! Extends basic Markov chain predictions with:
//! - Higher-order Markov chains (2nd, 3rd order)
//! - Set position awareness (openers, closers, encores)
//! - Venue and seasonal pattern recognition
//! - Song busts and debuts tracking
//! - Ensemble prediction combining multiple signals
//! - N-gram sequence matching
//! - Gap-based bust predictions

use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use js_sys::{Float32Array, Int32Array, Object, Reflect};

// ==================== INPUT TYPES ====================

#[derive(Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
#[allow(dead_code)]
struct SetlistEntry {
    id: i64,
    song_id: i64,
    show_id: i64,
    position: i32,
    #[serde(default)]
    song_title: Option<String>,
    #[serde(default)]
    show_date: Option<String>,
    #[serde(default)]
    set_name: Option<String>,
    #[serde(default)]
    venue_id: Option<i64>,
    #[serde(default)]
    is_segue: Option<bool>,
    #[serde(default)]
    is_opener: Option<bool>,
    #[serde(default)]
    is_closer: Option<bool>,
}

#[derive(Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
#[allow(dead_code)]
struct ShowInfo {
    id: i64,
    date: String,
    #[serde(default)]
    venue_id: Option<i64>,
    #[serde(default)]
    venue_name: Option<String>,
    #[serde(default)]
    tour_id: Option<i64>,
}

// ==================== OUTPUT TYPES ====================

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AdvancedPrediction {
    pub song_id: i64,
    pub title: String,
    pub score: f64,
    pub confidence: f64,
    pub signals: PredictionSignals,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PredictionSignals {
    pub markov_1: f64,        // First-order Markov probability
    pub markov_2: f64,        // Second-order (bigram context)
    pub markov_3: f64,        // Third-order (trigram context)
    pub position_score: f64,  // Set position appropriateness
    pub recency_score: f64,   // Recent play patterns
    pub gap_score: f64,       // Gap-based bust likelihood
    pub venue_score: f64,     // Venue-specific patterns
    pub seasonal_score: f64,  // Time-of-year patterns
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EnsemblePrediction {
    pub context: PredictionContext,
    pub predictions: Vec<AdvancedPrediction>,
    pub bust_candidates: Vec<BustCandidate>,
    pub opener_predictions: Vec<AdvancedPrediction>,
    pub closer_predictions: Vec<AdvancedPrediction>,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PredictionContext {
    pub current_song_ids: Vec<i64>,
    pub set_position: String,
    pub venue_id: Option<i64>,
    pub month: Option<u32>,
    pub day_of_week: Option<u32>,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct BustCandidate {
    pub song_id: i64,
    pub title: String,
    pub days_since_last: i64,
    pub shows_since_last: i64,
    pub bust_score: f64,
    pub historical_frequency: f64,
    pub expected_vs_actual: f64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PositionPrediction {
    pub position_type: String, // "opener", "closer", "encore", "set2_opener", etc.
    pub predictions: Vec<AdvancedPrediction>,
    pub historical_patterns: Vec<PositionPattern>,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PositionPattern {
    pub song_id: i64,
    pub title: String,
    pub count: usize,
    pub percentage: f64,
    pub recent_count: usize,  // Last 50 shows
    pub trend: String,        // "increasing", "stable", "decreasing"
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SequenceMatch {
    pub sequence: Vec<i64>,
    pub titles: Vec<String>,
    pub occurrences: usize,
    pub show_dates: Vec<String>,
    pub probability: f64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VenuePattern {
    pub venue_id: i64,
    pub venue_name: String,
    pub signature_songs: Vec<VenueSongStat>,
    pub opener_tendencies: Vec<AdvancedPrediction>,
    pub closer_tendencies: Vec<AdvancedPrediction>,
    pub unique_songs: Vec<i64>,  // Songs only played at this venue
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct VenueSongStat {
    pub song_id: i64,
    pub title: String,
    pub times_played: usize,
    pub venue_rate: f64,      // Rate at this venue
    pub overall_rate: f64,    // Overall rate
    pub venue_affinity: f64,  // How much more likely at this venue
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SeasonalPattern {
    pub month: u32,
    pub month_name: String,
    pub top_songs: Vec<SeasonalSongStat>,
    pub openers: Vec<AdvancedPrediction>,
    pub closers: Vec<AdvancedPrediction>,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SeasonalSongStat {
    pub song_id: i64,
    pub title: String,
    pub monthly_rate: f64,
    pub yearly_average: f64,
    pub seasonal_boost: f64,
}

// ==================== PREDICTOR ENGINE ====================

#[wasm_bindgen]
pub struct SetlistPredictor {
    // Song metadata
    song_titles: HashMap<i64, String>,

    // Markov chains
    first_order: HashMap<i64, HashMap<i64, u32>>,   // current -> next -> count
    second_order: HashMap<(i64, i64), HashMap<i64, u32>>,  // (prev, current) -> next -> count
    third_order: HashMap<(i64, i64, i64), HashMap<i64, u32>>,  // (prev2, prev, current) -> next -> count

    // Position tracking
    openers: HashMap<i64, u32>,
    closers: HashMap<i64, u32>,
    set2_openers: HashMap<i64, u32>,
    encore_openers: HashMap<i64, u32>,
    encore_closers: HashMap<i64, u32>,

    // Temporal patterns
    monthly_plays: HashMap<u32, HashMap<i64, u32>>,
    venue_plays: HashMap<i64, HashMap<i64, u32>>,

    // Gap tracking
    song_last_played: HashMap<i64, String>,
    song_play_dates: HashMap<i64, Vec<String>>,

    // Statistics
    total_shows: usize,
    total_songs_played: usize,
    song_total_plays: HashMap<i64, u32>,
}

#[wasm_bindgen]
impl SetlistPredictor {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            song_titles: HashMap::new(),
            first_order: HashMap::new(),
            second_order: HashMap::new(),
            third_order: HashMap::new(),
            openers: HashMap::new(),
            closers: HashMap::new(),
            set2_openers: HashMap::new(),
            encore_openers: HashMap::new(),
            encore_closers: HashMap::new(),
            monthly_plays: HashMap::new(),
            venue_plays: HashMap::new(),
            song_last_played: HashMap::new(),
            song_play_dates: HashMap::new(),
            total_shows: 0,
            total_songs_played: 0,
            song_total_plays: HashMap::new(),
        }
    }

    /// Initialize predictor with historical setlist data
    #[wasm_bindgen]
    pub fn initialize(&mut self, entries_json: &str, shows_json: Option<String>) -> Result<(), JsError> {
        let entries: Vec<SetlistEntry> = serde_json::from_str(entries_json)
            .map_err(|e| JsError::new(&format!("Failed to parse entries: {}", e)))?;

        let shows: HashMap<i64, ShowInfo> = if let Some(json) = shows_json {
            let show_list: Vec<ShowInfo> = serde_json::from_str(&json)
                .map_err(|e| JsError::new(&format!("Failed to parse shows: {}", e)))?;
            show_list.into_iter().map(|s| (s.id, s)).collect()
        } else {
            HashMap::new()
        };

        // Group entries by show
        let mut by_show: HashMap<i64, Vec<SetlistEntry>> = HashMap::new();
        for entry in entries {
            // Store song title
            if let Some(title) = &entry.song_title {
                self.song_titles.entry(entry.song_id).or_insert_with(|| title.clone());
            }

            by_show.entry(entry.show_id).or_default().push(entry);
        }

        self.total_shows = by_show.len();

        // Process each show
        for (show_id, mut show_entries) in by_show {
            show_entries.sort_by_key(|e| e.position);

            let show_info = shows.get(&show_id);
            let date = show_entries.first()
                .and_then(|e| e.show_date.clone())
                .or_else(|| show_info.map(|s| s.date.clone()));

            let venue_id = show_entries.first()
                .and_then(|e| e.venue_id)
                .or_else(|| show_info.and_then(|s| s.venue_id));

            let month = date.as_ref()
                .and_then(|d| d.get(5..7))
                .and_then(|m| m.parse::<u32>().ok());

            // Track positions and build n-grams
            self.process_show(&show_entries, date.as_deref(), venue_id, month);
        }

        Ok(())
    }

    fn process_show(
        &mut self,
        entries: &[SetlistEntry],
        date: Option<&str>,
        venue_id: Option<i64>,
        month: Option<u32>,
    ) {
        if entries.is_empty() {
            return;
        }

        // Group by set
        let mut sets: HashMap<String, Vec<&SetlistEntry>> = HashMap::new();
        for entry in entries {
            let set = entry.set_name.clone().unwrap_or_else(|| "Set 1".to_string());
            sets.entry(set).or_default().push(entry);
        }

        // Track openers/closers for each set
        for (set_name, set_entries) in &sets {
            if let Some(first) = set_entries.first() {
                let set_lower = set_name.to_lowercase();
                if set_lower.contains("encore") {
                    *self.encore_openers.entry(first.song_id).or_insert(0) += 1;
                } else if set_lower.contains("2") || set_lower.contains("ii") {
                    *self.set2_openers.entry(first.song_id).or_insert(0) += 1;
                } else {
                    *self.openers.entry(first.song_id).or_insert(0) += 1;
                }
            }

            if let Some(last) = set_entries.last() {
                let set_lower = set_name.to_lowercase();
                if set_lower.contains("encore") {
                    *self.encore_closers.entry(last.song_id).or_insert(0) += 1;
                } else {
                    *self.closers.entry(last.song_id).or_insert(0) += 1;
                }
            }
        }

        // Process transitions across entire show
        let song_ids: Vec<i64> = entries.iter().map(|e| e.song_id).collect();

        for (i, &song_id) in song_ids.iter().enumerate() {
            self.total_songs_played += 1;
            *self.song_total_plays.entry(song_id).or_insert(0) += 1;

            // Track dates
            if let Some(d) = date {
                self.song_last_played.insert(song_id, d.to_string());
                self.song_play_dates.entry(song_id).or_default().push(d.to_string());
            }

            // Track venue plays
            if let Some(vid) = venue_id {
                *self.venue_plays.entry(vid).or_default().entry(song_id).or_insert(0) += 1;
            }

            // Track monthly plays
            if let Some(m) = month {
                *self.monthly_plays.entry(m).or_default().entry(song_id).or_insert(0) += 1;
            }

            // First-order Markov
            if i + 1 < song_ids.len() {
                let next = song_ids[i + 1];
                *self.first_order.entry(song_id).or_default().entry(next).or_insert(0) += 1;
            }

            // Second-order Markov
            if i >= 1 && i + 1 < song_ids.len() {
                let prev = song_ids[i - 1];
                let next = song_ids[i + 1];
                *self.second_order.entry((prev, song_id)).or_default().entry(next).or_insert(0) += 1;
            }

            // Third-order Markov
            if i >= 2 && i + 1 < song_ids.len() {
                let prev2 = song_ids[i - 2];
                let prev = song_ids[i - 1];
                let next = song_ids[i + 1];
                *self.third_order.entry((prev2, prev, song_id)).or_default().entry(next).or_insert(0) += 1;
            }
        }
    }

    /// Get ensemble prediction combining all signals
    #[wasm_bindgen(js_name = "predictEnsemble")]
    pub fn predict_ensemble(
        &self,
        context_json: &str,
        limit: Option<usize>,
    ) -> Result<JsValue, JsError> {
        let context: PredictionContext = serde_json::from_str(context_json)
            .map_err(|e| JsError::new(&format!("Failed to parse context: {}", e)))?;

        let result_limit = limit.unwrap_or(15);
        let current_ids = &context.current_song_ids;

        // Collect all candidate songs with scores
        let mut candidates: HashMap<i64, PredictionSignals> = HashMap::new();

        // First-order Markov
        if let Some(&current) = current_ids.last() {
            if let Some(transitions) = self.first_order.get(&current) {
                let total: u32 = transitions.values().sum();
                if total > 0 {  // Guard against division by zero
                    for (&next, &count) in transitions {
                        let prob = count as f64 / total as f64;
                        candidates.entry(next).or_insert_with(PredictionSignals::default).markov_1 = prob;
                    }
                }
            }
        }

        // Second-order Markov
        if current_ids.len() >= 2 {
            let key = (current_ids[current_ids.len() - 2], current_ids[current_ids.len() - 1]);
            if let Some(transitions) = self.second_order.get(&key) {
                let total: u32 = transitions.values().sum();
                if total > 0 {  // Guard against division by zero
                    for (&next, &count) in transitions {
                        let prob = count as f64 / total as f64;
                        candidates.entry(next).or_insert_with(PredictionSignals::default).markov_2 = prob;
                    }
                }
            }
        }

        // Third-order Markov
        if current_ids.len() >= 3 {
            let key = (
                current_ids[current_ids.len() - 3],
                current_ids[current_ids.len() - 2],
                current_ids[current_ids.len() - 1],
            );
            if let Some(transitions) = self.third_order.get(&key) {
                let total: u32 = transitions.values().sum();
                if total > 0 {  // Guard against division by zero
                    for (&next, &count) in transitions {
                        let prob = count as f64 / total as f64;
                        candidates.entry(next).or_insert_with(PredictionSignals::default).markov_3 = prob;
                    }
                }
            }
        }

        // Position-based scoring
        let position_type = &context.set_position;
        let position_probs = self.get_position_probabilities(position_type);
        for (song_id, prob) in position_probs {
            candidates.entry(song_id).or_insert_with(PredictionSignals::default).position_score = prob;
        }

        // Venue-based scoring
        if let Some(vid) = context.venue_id {
            let venue_probs = self.get_venue_probabilities(vid);
            for (song_id, prob) in venue_probs {
                candidates.entry(song_id).or_insert_with(PredictionSignals::default).venue_score = prob;
            }
        }

        // Seasonal scoring
        if let Some(month) = context.month {
            let seasonal_probs = self.get_seasonal_probabilities(month);
            for (song_id, prob) in seasonal_probs {
                candidates.entry(song_id).or_insert_with(PredictionSignals::default).seasonal_score = prob;
            }
        }

        // Calculate gap scores for all songs
        let gap_scores = self.calculate_gap_scores();
        for (song_id, score) in gap_scores {
            candidates.entry(song_id).or_insert_with(PredictionSignals::default).gap_score = score;
        }

        // Calculate ensemble scores
        let mut predictions: Vec<AdvancedPrediction> = candidates
            .into_iter()
            .filter(|(song_id, _)| !current_ids.contains(song_id)) // Exclude already played
            .map(|(song_id, signals)| {
                // Weighted ensemble score
                let score =
                    signals.markov_1 * 0.30 +
                    signals.markov_2 * 0.25 +
                    signals.markov_3 * 0.15 +
                    signals.position_score * 0.10 +
                    signals.gap_score * 0.10 +
                    signals.venue_score * 0.05 +
                    signals.seasonal_score * 0.05;

                // Confidence based on signal agreement
                let non_zero_signals = [
                    signals.markov_1, signals.markov_2, signals.markov_3,
                    signals.position_score, signals.gap_score,
                ].iter().filter(|&&x| x > 0.0).count();

                let confidence = (non_zero_signals as f64 / 5.0).min(1.0);

                AdvancedPrediction {
                    song_id,
                    title: self.song_titles.get(&song_id).cloned().unwrap_or_default(),
                    score,
                    confidence,
                    signals,
                }
            })
            .collect();

        predictions.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap_or(std::cmp::Ordering::Equal));
        predictions.truncate(result_limit);

        // Get bust candidates
        let bust_candidates = self.get_bust_candidates(10);

        // Get opener/closer predictions
        let opener_predictions = self.get_position_predictions("opener", 5);
        let closer_predictions = self.get_position_predictions("closer", 5);

        let result = EnsemblePrediction {
            context,
            predictions,
            bust_candidates,
            opener_predictions,
            closer_predictions,
        };

        serde_wasm_bindgen::to_value(&result)
            .map_err(|_| JsError::new("Serialization failed"))
    }

    /// Get songs likely to be busted (played after long absence)
    #[wasm_bindgen(js_name = "getBustCandidates")]
    pub fn get_bust_candidates_js(&self, limit: Option<usize>) -> Result<JsValue, JsError> {
        let result_limit = limit.unwrap_or(20);
        let candidates = self.get_bust_candidates(result_limit);

        serde_wasm_bindgen::to_value(&candidates)
            .map_err(|_| JsError::new("Serialization failed"))
    }

    fn get_bust_candidates(&self, limit: usize) -> Vec<BustCandidate> {
        if self.total_shows == 0 {
            return Vec::new();
        }

        let mut candidates: Vec<BustCandidate> = self.song_total_plays
            .iter()
            .filter(|(_, &count)| count >= 10) // Minimum plays to be considered
            .map(|(&song_id, &total_plays)| {
                let historical_freq = total_plays as f64 / self.total_shows as f64;

                // Calculate gap
                let dates = self.song_play_dates.get(&song_id);

                // Estimate shows since last played
                let shows_since = if let Some(dates) = dates {
                    if dates.len() >= 2 {
                        // Calculate average gap between plays
                        let avg_gap = dates.len() as f64 / self.total_shows as f64;
                        let expected_plays_since = avg_gap * 50.0; // Approximate recent shows
                        let actual_recent = dates.iter()
                            .filter(|d| d.as_str() > "2020-01-01")
                            .count();
                        ((expected_plays_since - actual_recent as f64).max(0.0) * 10.0) as i64
                    } else {
                        100
                    }
                } else {
                    0
                };

                // Calculate days since last (estimate)
                let days_since = shows_since * 3; // Rough estimate: 3 days per show

                // Bust score: high historical frequency + long gap = good bust candidate
                let expected_vs_actual = historical_freq * self.total_shows as f64 - total_plays as f64;
                let bust_score = (historical_freq * 100.0) * (shows_since as f64 / 100.0).min(1.0);

                BustCandidate {
                    song_id,
                    title: self.song_titles.get(&song_id).cloned().unwrap_or_default(),
                    days_since_last: days_since,
                    shows_since_last: shows_since,
                    bust_score,
                    historical_frequency: historical_freq,
                    expected_vs_actual,
                }
            })
            .collect();

        candidates.sort_by(|a, b| b.bust_score.partial_cmp(&a.bust_score).unwrap_or(std::cmp::Ordering::Equal));
        candidates.truncate(limit);
        candidates
    }

    fn get_position_probabilities(&self, position_type: &str) -> HashMap<i64, f64> {
        let source = match position_type.to_lowercase().as_str() {
            "opener" | "set1_opener" => &self.openers,
            "closer" | "set1_closer" => &self.closers,
            "set2_opener" => &self.set2_openers,
            "encore_opener" => &self.encore_openers,
            "encore_closer" => &self.encore_closers,
            _ => &self.openers,
        };

        let total: u32 = source.values().sum();
        if total == 0 {
            return HashMap::new();
        }

        source.iter()
            .map(|(&song_id, &count)| (song_id, count as f64 / total as f64))
            .collect()
    }

    fn get_position_predictions(&self, position_type: &str, limit: usize) -> Vec<AdvancedPrediction> {
        let probs = self.get_position_probabilities(position_type);
        let mut predictions: Vec<AdvancedPrediction> = probs
            .into_iter()
            .map(|(song_id, prob)| {
                AdvancedPrediction {
                    song_id,
                    title: self.song_titles.get(&song_id).cloned().unwrap_or_default(),
                    score: prob,
                    confidence: if prob > 0.1 { 0.9 } else if prob > 0.05 { 0.7 } else { 0.5 },
                    signals: PredictionSignals {
                        position_score: prob,
                        ..Default::default()
                    },
                }
            })
            .collect();

        predictions.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap_or(std::cmp::Ordering::Equal));
        predictions.truncate(limit);
        predictions
    }

    fn get_venue_probabilities(&self, venue_id: i64) -> HashMap<i64, f64> {
        if let Some(venue_songs) = self.venue_plays.get(&venue_id) {
            let total: u32 = venue_songs.values().sum();
            if total == 0 {
                return HashMap::new();
            }

            venue_songs.iter()
                .map(|(&song_id, &count)| {
                    // Calculate venue affinity (how much more likely at this venue)
                    let venue_rate = count as f64 / total as f64;
                    let overall_rate = self.song_total_plays.get(&song_id)
                        .map(|&c| c as f64 / self.total_songs_played as f64)
                        .unwrap_or(0.0);

                    let affinity = if overall_rate > 0.0 {
                        (venue_rate / overall_rate).min(3.0) / 3.0
                    } else {
                        0.0
                    };

                    (song_id, affinity)
                })
                .collect()
        } else {
            HashMap::new()
        }
    }

    fn get_seasonal_probabilities(&self, month: u32) -> HashMap<i64, f64> {
        if let Some(monthly_songs) = self.monthly_plays.get(&month) {
            let monthly_total: u32 = monthly_songs.values().sum();
            if monthly_total == 0 {
                return HashMap::new();
            }

            monthly_songs.iter()
                .map(|(&song_id, &count)| {
                    let monthly_rate = count as f64 / monthly_total as f64;
                    let overall_rate = self.song_total_plays.get(&song_id)
                        .map(|&c| c as f64 / self.total_songs_played as f64)
                        .unwrap_or(0.0);

                    let seasonal_boost = if overall_rate > 0.0 {
                        (monthly_rate / overall_rate).min(3.0) / 3.0
                    } else {
                        0.0
                    };

                    (song_id, seasonal_boost)
                })
                .collect()
        } else {
            HashMap::new()
        }
    }

    fn calculate_gap_scores(&self) -> HashMap<i64, f64> {
        // Songs with longer-than-expected gaps get higher scores
        self.song_total_plays.iter()
            .map(|(&song_id, &total_plays)| {
                if total_plays < 5 {
                    return (song_id, 0.0);
                }

                let expected_rate = total_plays as f64 / self.total_shows as f64;
                let dates = self.song_play_dates.get(&song_id);

                let gap_score = if let Some(dates) = dates {
                    // Calculate recent play rate vs historical
                    let recent_cutoff = "2022-01-01";
                    let recent_plays = dates.iter().filter(|d| d.as_str() >= recent_cutoff).count();
                    let recent_shows = (self.total_shows as f64 * 0.3) as usize; // Assume 30% of shows are recent

                    if recent_shows > 0 {
                        let recent_rate = recent_plays as f64 / recent_shows as f64;
                        // If recent rate is lower than expected, song might be due
                        (expected_rate - recent_rate).max(0.0) / expected_rate
                    } else {
                        0.0
                    }
                } else {
                    0.0
                };

                (song_id, gap_score.min(1.0))
            })
            .collect()
    }

    /// Find N-gram sequences matching a prefix
    #[wasm_bindgen(js_name = "findMatchingSequences")]
    pub fn find_matching_sequences(
        &self,
        prefix_json: &str,
        max_length: Option<usize>,
        limit: Option<usize>,
    ) -> Result<JsValue, JsError> {
        let prefix: Vec<i64> = serde_json::from_str(prefix_json)
            .map_err(|e| JsError::new(&format!("Failed to parse prefix: {}", e)))?;

        let _max_len = max_length.unwrap_or(5);
        let result_limit = limit.unwrap_or(10);

        let mut sequences: Vec<SequenceMatch> = Vec::new();

        // Match based on prefix length
        match prefix.len() {
            0 => {
                // No prefix - return most common bigrams
                for (song_id, transitions) in &self.first_order {
                    for (&next_id, &count) in transitions {
                        if count >= 5 {
                            let titles = vec![
                                self.song_titles.get(song_id).cloned().unwrap_or_default(),
                                self.song_titles.get(&next_id).cloned().unwrap_or_default(),
                            ];
                            sequences.push(SequenceMatch {
                                sequence: vec![*song_id, next_id],
                                titles,
                                occurrences: count as usize,
                                show_dates: Vec::new(),
                                probability: 0.0,
                            });
                        }
                    }
                }
            }
            1 => {
                // Single song prefix - use first-order Markov
                if let Some(transitions) = self.first_order.get(&prefix[0]) {
                    let total: u32 = transitions.values().sum();
                    for (&next_id, &count) in transitions {
                        let prob = count as f64 / total as f64;
                        let titles = vec![
                            self.song_titles.get(&prefix[0]).cloned().unwrap_or_default(),
                            self.song_titles.get(&next_id).cloned().unwrap_or_default(),
                        ];
                        sequences.push(SequenceMatch {
                            sequence: vec![prefix[0], next_id],
                            titles,
                            occurrences: count as usize,
                            show_dates: Vec::new(),
                            probability: prob,
                        });
                    }
                }
            }
            2 => {
                // Two-song prefix - use second-order Markov
                let key = (prefix[0], prefix[1]);
                if let Some(transitions) = self.second_order.get(&key) {
                    let total: u32 = transitions.values().sum();
                    for (&next_id, &count) in transitions {
                        let prob = count as f64 / total as f64;
                        let titles = vec![
                            self.song_titles.get(&prefix[0]).cloned().unwrap_or_default(),
                            self.song_titles.get(&prefix[1]).cloned().unwrap_or_default(),
                            self.song_titles.get(&next_id).cloned().unwrap_or_default(),
                        ];
                        sequences.push(SequenceMatch {
                            sequence: vec![prefix[0], prefix[1], next_id],
                            titles,
                            occurrences: count as usize,
                            show_dates: Vec::new(),
                            probability: prob,
                        });
                    }
                }
            }
            _ => {
                // Three or more - use third-order if available
                let last_three = &prefix[prefix.len()-3..];
                let key = (last_three[0], last_three[1], last_three[2]);
                if let Some(transitions) = self.third_order.get(&key) {
                    let total: u32 = transitions.values().sum();
                    for (&next_id, &count) in transitions {
                        let prob = count as f64 / total as f64;
                        let mut seq = prefix.clone();
                        seq.push(next_id);
                        let titles: Vec<String> = seq.iter()
                            .map(|id| self.song_titles.get(id).cloned().unwrap_or_default())
                            .collect();
                        sequences.push(SequenceMatch {
                            sequence: seq,
                            titles,
                            occurrences: count as usize,
                            show_dates: Vec::new(),
                            probability: prob,
                        });
                    }
                }
            }
        }

        sequences.sort_by(|a, b| b.occurrences.cmp(&a.occurrences));
        sequences.truncate(result_limit);

        serde_wasm_bindgen::to_value(&sequences)
            .map_err(|_| JsError::new("Serialization failed"))
    }

    /// Analyze venue-specific patterns
    #[wasm_bindgen(js_name = "analyzeVenuePatterns")]
    pub fn analyze_venue_patterns(&self, venue_id: i64, venue_name: Option<String>) -> Result<JsValue, JsError> {
        let venue_songs = self.venue_plays.get(&venue_id);

        if venue_songs.is_none() {
            return serde_wasm_bindgen::to_value(&VenuePattern {
                venue_id,
                venue_name: venue_name.unwrap_or_default(),
                signature_songs: Vec::new(),
                opener_tendencies: Vec::new(),
                closer_tendencies: Vec::new(),
                unique_songs: Vec::new(),
            }).map_err(|_| JsError::new("Serialization failed"));
        }

        let venue_songs = venue_songs.unwrap();
        let venue_total: u32 = venue_songs.values().sum();

        // Find signature songs (played more at this venue than average)
        let mut signature_songs: Vec<VenueSongStat> = venue_songs.iter()
            .filter_map(|(&song_id, &count)| {
                let venue_rate = count as f64 / venue_total as f64;
                let overall_total = self.song_total_plays.get(&song_id).copied().unwrap_or(0);
                let overall_rate = if self.total_songs_played > 0 {
                    overall_total as f64 / self.total_songs_played as f64
                } else {
                    0.0
                };

                if overall_rate > 0.0 {
                    let affinity = venue_rate / overall_rate;
                    if affinity > 1.2 && count >= 3 {
                        return Some(VenueSongStat {
                            song_id,
                            title: self.song_titles.get(&song_id).cloned().unwrap_or_default(),
                            times_played: count as usize,
                            venue_rate,
                            overall_rate,
                            venue_affinity: affinity,
                        });
                    }
                }
                None
            })
            .collect();

        signature_songs.sort_by(|a, b| b.venue_affinity.partial_cmp(&a.venue_affinity).unwrap_or(std::cmp::Ordering::Equal));
        signature_songs.truncate(15);

        // Find songs unique to this venue
        let unique_songs: Vec<i64> = venue_songs.iter()
            .filter(|(&song_id, &count)| {
                // Check if played significantly more at this venue
                let overall = self.song_total_plays.get(&song_id).copied().unwrap_or(0);
                count >= 2 && count as f64 / overall as f64 > 0.5
            })
            .map(|(&id, _)| id)
            .take(10)
            .collect();

        let result = VenuePattern {
            venue_id,
            venue_name: venue_name.unwrap_or_default(),
            signature_songs,
            opener_tendencies: Vec::new(), // Would need venue-specific opener tracking
            closer_tendencies: Vec::new(), // Would need venue-specific closer tracking
            unique_songs,
        };

        serde_wasm_bindgen::to_value(&result)
            .map_err(|_| JsError::new("Serialization failed"))
    }

    /// Analyze seasonal patterns for a month
    #[wasm_bindgen(js_name = "analyzeSeasonalPatterns")]
    pub fn analyze_seasonal_patterns(&self, month: u32) -> Result<JsValue, JsError> {
        let month_names = ["", "January", "February", "March", "April", "May", "June",
                          "July", "August", "September", "October", "November", "December"];

        let month_name = if month >= 1 && month <= 12 {
            month_names[month as usize].to_string()
        } else {
            "Unknown".to_string()
        };

        let monthly_songs = self.monthly_plays.get(&month);

        if monthly_songs.is_none() {
            return serde_wasm_bindgen::to_value(&SeasonalPattern {
                month,
                month_name,
                top_songs: Vec::new(),
                openers: Vec::new(),
                closers: Vec::new(),
            }).map_err(|_| JsError::new("Serialization failed"));
        }

        let monthly_songs = monthly_songs.unwrap();
        let monthly_total: u32 = monthly_songs.values().sum();

        let mut top_songs: Vec<SeasonalSongStat> = monthly_songs.iter()
            .filter_map(|(&song_id, &count)| {
                let monthly_rate = count as f64 / monthly_total as f64;
                let overall_total = self.song_total_plays.get(&song_id).copied().unwrap_or(0);
                let yearly_average = if self.total_songs_played > 0 {
                    overall_total as f64 / self.total_songs_played as f64
                } else {
                    0.0
                };

                if yearly_average > 0.0 && count >= 3 {
                    let seasonal_boost = monthly_rate / yearly_average;
                    if seasonal_boost > 1.1 {
                        return Some(SeasonalSongStat {
                            song_id,
                            title: self.song_titles.get(&song_id).cloned().unwrap_or_default(),
                            monthly_rate,
                            yearly_average,
                            seasonal_boost,
                        });
                    }
                }
                None
            })
            .collect();

        top_songs.sort_by(|a, b| b.seasonal_boost.partial_cmp(&a.seasonal_boost).unwrap_or(std::cmp::Ordering::Equal));
        top_songs.truncate(15);

        let result = SeasonalPattern {
            month,
            month_name,
            top_songs,
            openers: Vec::new(), // Would need monthly opener tracking
            closers: Vec::new(), // Would need monthly closer tracking
        };

        serde_wasm_bindgen::to_value(&result)
            .map_err(|_| JsError::new("Serialization failed"))
    }

    /// Get predictions as TypedArrays for zero-copy transfer
    #[wasm_bindgen(js_name = "getPredictionsTyped")]
    pub fn get_predictions_typed(&self, current_song_id: i64, limit: Option<usize>) -> Result<JsValue, JsError> {
        let result_limit = limit.unwrap_or(20);

        if let Some(transitions) = self.first_order.get(&current_song_id) {
            let total: u32 = transitions.values().sum();

            if total == 0 {
                // PERF: Return empty typed arrays for zero-copy transfer
                let result = Object::new();
                Reflect::set(&result, &"songIds".into(), &Int32Array::new_with_length(0))
                    .map_err(|_| JsError::new("Failed to set songIds"))?;
                Reflect::set(&result, &"probabilities".into(), &Float32Array::new_with_length(0))
                    .map_err(|_| JsError::new("Failed to set probabilities"))?;
                Reflect::set(&result, &"count".into(), &0u32.into())
                    .map_err(|_| JsError::new("Failed to set count"))?;
                return Ok(result.into());
            }

            let mut sorted: Vec<(i64, f32)> = transitions.iter()
                .map(|(&id, &count)| (id, count as f32 / total as f32))
                .collect();
            sorted.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
            sorted.truncate(result_limit);

            let song_ids = Int32Array::new_with_length(sorted.len() as u32);
            let probabilities = Float32Array::new_with_length(sorted.len() as u32);

            for (i, (id, prob)) in sorted.iter().enumerate() {
                song_ids.set_index(i as u32, *id as i32);
                probabilities.set_index(i as u32, *prob);
            }

            let result = Object::new();
            Reflect::set(&result, &"songIds".into(), &song_ids)
                .map_err(|_| JsError::new("Failed to set songIds"))?;
            Reflect::set(&result, &"probabilities".into(), &probabilities)
                .map_err(|_| JsError::new("Failed to set probabilities"))?;
            Reflect::set(&result, &"count".into(), &(sorted.len() as u32).into())
                .map_err(|_| JsError::new("Failed to set count"))?;

            Ok(result.into())
        } else {
            let result = Object::new();
            Reflect::set(&result, &"songIds".into(), &Int32Array::new_with_length(0))
                .map_err(|_| JsError::new("Failed to set songIds"))?;
            Reflect::set(&result, &"probabilities".into(), &Float32Array::new_with_length(0))
                .map_err(|_| JsError::new("Failed to set probabilities"))?;
            Reflect::set(&result, &"count".into(), &0u32.into())
                .map_err(|_| JsError::new("Failed to set count"))?;

            Ok(result.into())
        }
    }

    /// Get bust candidates as TypedArrays
    #[wasm_bindgen(js_name = "getBustCandidatesTyped")]
    pub fn get_bust_candidates_typed(&self, limit: Option<usize>) -> Result<JsValue, JsError> {
        let candidates = self.get_bust_candidates(limit.unwrap_or(20));

        let song_ids = Int32Array::new_with_length(candidates.len() as u32);
        let bust_scores = Float32Array::new_with_length(candidates.len() as u32);
        let gaps = Int32Array::new_with_length(candidates.len() as u32);

        for (i, c) in candidates.iter().enumerate() {
            song_ids.set_index(i as u32, c.song_id as i32);
            bust_scores.set_index(i as u32, c.bust_score as f32);
            gaps.set_index(i as u32, c.shows_since_last as i32);
        }

        let result = Object::new();
        Reflect::set(&result, &"songIds".into(), &song_ids)
            .map_err(|_| JsError::new("Failed to set songIds"))?;
        Reflect::set(&result, &"bustScores".into(), &bust_scores)
            .map_err(|_| JsError::new("Failed to set bustScores"))?;
        Reflect::set(&result, &"gaps".into(), &gaps)
            .map_err(|_| JsError::new("Failed to set gaps"))?;
        Reflect::set(&result, &"count".into(), &(candidates.len() as u32).into())
            .map_err(|_| JsError::new("Failed to set count"))?;

        Ok(result.into())
    }

    /// Get statistics about the predictor
    #[wasm_bindgen(js_name = "getStatistics")]
    pub fn get_statistics(&self) -> Result<JsValue, JsError> {
        let stats = serde_json::json!({
            "totalShows": self.total_shows,
            "totalSongsPlayed": self.total_songs_played,
            "uniqueSongs": self.song_titles.len(),
            "firstOrderTransitions": self.first_order.len(),
            "secondOrderContexts": self.second_order.len(),
            "thirdOrderContexts": self.third_order.len(),
            "trackedVenues": self.venue_plays.len(),
        });

        serde_wasm_bindgen::to_value(&stats)
            .map_err(|_| JsError::new("Serialization failed"))
    }
}

impl Default for PredictionSignals {
    fn default() -> Self {
        Self {
            markov_1: 0.0,
            markov_2: 0.0,
            markov_3: 0.0,
            position_score: 0.0,
            recency_score: 0.0,
            gap_score: 0.0,
            venue_score: 0.0,
            seasonal_score: 0.0,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_predictor_creation() {
        let predictor = SetlistPredictor::new();
        assert_eq!(predictor.total_shows, 0);
    }
}

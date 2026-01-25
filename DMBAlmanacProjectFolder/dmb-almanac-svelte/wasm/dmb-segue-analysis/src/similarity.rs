//! Setlist Similarity and Clustering Module
//!
//! Provides advanced similarity analysis for setlists:
//! - Jaccard similarity: |A ∩ B| / |A ∪ B|
//! - Cosine similarity: dot(A,B) / (|A| * |B|)
//! - Overlap coefficient: |A ∩ B| / min(|A|, |B|)
//! - K-means clustering of shows
//! - Co-occurrence matrix computation
//! - Song association analysis

use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use js_sys::{BigInt64Array, Float32Array, Object, Reflect};

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
}

// ==================== OUTPUT TYPES ====================

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SimilarShowResult {
    pub show_id: i64,
    pub similarity: f64,
    pub shared_song_count: usize,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ShowComparison {
    pub jaccard: f64,
    pub cosine: f64,
    pub overlap: f64,
    pub shared_songs: Vec<i64>,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CoOccurrenceEntry {
    pub song_id_a: i64,
    pub song_id_b: i64,
    pub count: usize,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AssociatedSong {
    pub song_id: i64,
    pub co_occurrence_count: usize,
    pub probability: f64,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ClusterResult {
    pub cluster_id: usize,
    pub show_ids: Vec<i64>,
    pub centroid: Vec<f64>,
}

// ==================== SIMILARITY ENGINE ====================

#[wasm_bindgen]
pub struct SetlistSimilarityEngine {
    // Show-to-song mapping
    show_setlists: HashMap<i64, HashSet<i64>>,

    // Song co-occurrence tracking
    song_pairs: HashMap<(i64, i64), usize>,
    song_total_shows: HashMap<i64, usize>,

    // Metadata
    song_titles: HashMap<i64, String>,
    total_songs: usize,
    total_shows: usize,
}

#[wasm_bindgen]
impl SetlistSimilarityEngine {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            show_setlists: HashMap::new(),
            song_pairs: HashMap::new(),
            song_total_shows: HashMap::new(),
            song_titles: HashMap::new(),
            total_songs: 0,
            total_shows: 0,
        }
    }

    /// Initialize with setlist entries data
    #[wasm_bindgen]
    pub fn initialize(
        &mut self,
        setlist_entries_json: &str,
        total_songs: usize,
    ) -> Result<(), JsError> {
        let entries: Vec<SetlistEntry> = serde_json::from_str(setlist_entries_json)
            .map_err(|e| JsError::new(&format!("Failed to parse entries: {}", e)))?;

        self.total_songs = total_songs;

        // Group entries by show
        let mut by_show: HashMap<i64, Vec<&SetlistEntry>> = HashMap::new();
        for entry in &entries {
            by_show.entry(entry.show_id).or_default().push(entry);

            // Store song titles
            if let Some(title) = &entry.song_title {
                self.song_titles.entry(entry.song_id).or_insert_with(|| title.clone());
            }
        }

        self.total_shows = by_show.len();

        // Build setlists and co-occurrence data
        for (show_id, show_entries) in by_show {
            let song_set: HashSet<i64> = show_entries.iter()
                .map(|e| e.song_id)
                .collect();

            // Track song appearances
            for &song_id in &song_set {
                *self.song_total_shows.entry(song_id).or_insert(0) += 1;
            }

            // Track co-occurrences (all pairs in same show)
            let songs: Vec<i64> = song_set.iter().copied().collect();
            for i in 0..songs.len() {
                for j in (i + 1)..songs.len() {
                    let (a, b) = if songs[i] < songs[j] {
                        (songs[i], songs[j])
                    } else {
                        (songs[j], songs[i])
                    };
                    *self.song_pairs.entry((a, b)).or_insert(0) += 1;
                }
            }

            self.show_setlists.insert(show_id, song_set);
        }

        Ok(())
    }

    /// Find similar shows using specified similarity metric
    #[wasm_bindgen(js_name = "findSimilarShows")]
    pub fn find_similar_shows(
        &self,
        target_show_id: i64,
        method: &str,
        limit: usize,
    ) -> Result<JsValue, JsError> {
        let target_setlist = self.show_setlists.get(&target_show_id)
            .ok_or_else(|| JsError::new("Target show not found"))?;

        let mut similarities: Vec<SimilarShowResult> = self.show_setlists
            .iter()
            .filter(|(&show_id, _)| show_id != target_show_id)
            .map(|(&show_id, setlist)| {
                let similarity = match method {
                    "jaccard" => self.jaccard_similarity(target_setlist, setlist),
                    "cosine" => self.cosine_similarity(target_setlist, setlist),
                    "overlap" => self.overlap_coefficient(target_setlist, setlist),
                    _ => 0.0,
                };

                let shared_count = target_setlist.intersection(setlist).count();

                SimilarShowResult {
                    show_id,
                    similarity,
                    shared_song_count: shared_count,
                }
            })
            .collect();

        similarities.sort_by(|a, b|
            b.similarity.partial_cmp(&a.similarity).unwrap_or(std::cmp::Ordering::Equal)
        );
        similarities.truncate(limit);

        serde_wasm_bindgen::to_value(&similarities)
            .map_err(|_| JsError::new("Serialization failed"))
    }

    /// Compare two shows with all similarity metrics
    #[wasm_bindgen(js_name = "compareShows")]
    pub fn compare_shows(
        &self,
        show_id_a: i64,
        show_id_b: i64,
    ) -> Result<JsValue, JsError> {
        let setlist_a = self.show_setlists.get(&show_id_a)
            .ok_or_else(|| JsError::new("Show A not found"))?;
        let setlist_b = self.show_setlists.get(&show_id_b)
            .ok_or_else(|| JsError::new("Show B not found"))?;

        let jaccard = self.jaccard_similarity(setlist_a, setlist_b);
        let cosine = self.cosine_similarity(setlist_a, setlist_b);
        let overlap = self.overlap_coefficient(setlist_a, setlist_b);
        let shared_songs: Vec<i64> = setlist_a.intersection(setlist_b)
            .copied()
            .collect();

        let result = ShowComparison {
            jaccard,
            cosine,
            overlap,
            shared_songs,
        };

        serde_wasm_bindgen::to_value(&result)
            .map_err(|_| JsError::new("Serialization failed"))
    }

    /// Get shared songs between two shows
    #[wasm_bindgen(js_name = "getSharedSongs")]
    pub fn get_shared_songs(
        &self,
        show_id_a: i64,
        show_id_b: i64,
    ) -> Result<JsValue, JsError> {
        let setlist_a = self.show_setlists.get(&show_id_a)
            .ok_or_else(|| JsError::new("Show A not found"))?;
        let setlist_b = self.show_setlists.get(&show_id_b)
            .ok_or_else(|| JsError::new("Show B not found"))?;

        let shared: Vec<i64> = setlist_a.intersection(setlist_b)
            .copied()
            .collect();

        serde_wasm_bindgen::to_value(&shared)
            .map_err(|_| JsError::new("Serialization failed"))
    }

    /// Compute co-occurrence matrix for all song pairs
    #[wasm_bindgen(js_name = "computeCoOccurrenceMatrix")]
    pub fn compute_co_occurrence_matrix(
        &self,
        min_occurrences: usize,
    ) -> Result<JsValue, JsError> {
        let mut entries: Vec<CoOccurrenceEntry> = self.song_pairs
            .iter()
            .filter(|(_, &count)| count >= min_occurrences)
            .map(|(&(song_a, song_b), &count)| {
                CoOccurrenceEntry {
                    song_id_a: song_a,
                    song_id_b: song_b,
                    count,
                }
            })
            .collect();

        entries.sort_by(|a, b| b.count.cmp(&a.count));

        serde_wasm_bindgen::to_value(&entries)
            .map_err(|_| JsError::new("Serialization failed"))
    }

    /// Find songs most associated with a given song
    #[wasm_bindgen(js_name = "findAssociatedSongs")]
    pub fn find_associated_songs(
        &self,
        song_id: i64,
        limit: usize,
    ) -> Result<JsValue, JsError> {
        let song_total = self.song_total_shows.get(&song_id).copied().unwrap_or(0);

        if song_total == 0 {
            return serde_wasm_bindgen::to_value(&Vec::<AssociatedSong>::new())
                .map_err(|_| JsError::new("Serialization failed"));
        }

        let mut associations: Vec<AssociatedSong> = self.song_pairs
            .iter()
            .filter_map(|(&(a, b), &count)| {
                if a == song_id {
                    Some((b, count))
                } else if b == song_id {
                    Some((a, count))
                } else {
                    None
                }
            })
            .map(|(other_id, count)| {
                let probability = count as f64 / song_total as f64;
                AssociatedSong {
                    song_id: other_id,
                    co_occurrence_count: count,
                    probability,
                }
            })
            .collect();

        associations.sort_by(|a, b|
            b.co_occurrence_count.cmp(&a.co_occurrence_count)
        );
        associations.truncate(limit);

        serde_wasm_bindgen::to_value(&associations)
            .map_err(|_| JsError::new("Serialization failed"))
    }

    /// Calculate diversity score for a show (entropy-based)
    #[wasm_bindgen(js_name = "calculateDiversity")]
    pub fn calculate_diversity(&self, show_id: i64) -> Result<f64, JsError> {
        let setlist = self.show_setlists.get(&show_id)
            .ok_or_else(|| JsError::new("Show not found"))?;

        if setlist.is_empty() {
            return Ok(0.0);
        }

        // Calculate diversity based on rarity of songs played
        let mut rarity_sum = 0.0;
        let mut count = 0;

        for &song_id in setlist {
            if let Some(&shows) = self.song_total_shows.get(&song_id) {
                if shows > 0 {
                    // Inverse frequency - rare songs get higher scores
                    let rarity = 1.0 - (shows as f64 / self.total_shows as f64);
                    rarity_sum += rarity;
                    count += 1;
                }
            }
        }

        if count > 0 {
            // Average rarity score (0.0 to 1.0)
            Ok(rarity_sum / count as f64)
        } else {
            Ok(0.0)
        }
    }

    /// Cluster shows using K-means algorithm
    #[wasm_bindgen(js_name = "clusterShows")]
    pub fn cluster_shows(
        &self,
        num_clusters: usize,
        max_iterations: usize,
    ) -> Result<JsValue, JsError> {
        if num_clusters == 0 || num_clusters > self.show_setlists.len() {
            return Err(JsError::new("Invalid number of clusters"));
        }

        // Convert setlists to binary vectors
        let show_ids: Vec<i64> = self.show_setlists.keys().copied().collect();
        let vectors = self.create_feature_vectors(&show_ids);

        // Initialize centroids randomly
        let mut centroids = self.initialize_centroids(&vectors, num_clusters);

        // K-means iterations
        let mut assignments = vec![0; show_ids.len()];

        for _ in 0..max_iterations {
            let mut changed = false;

            // Assignment step
            for (i, vector) in vectors.iter().enumerate() {
                let closest = self.find_closest_centroid(vector, &centroids);
                if assignments[i] != closest {
                    assignments[i] = closest;
                    changed = true;
                }
            }

            if !changed {
                break; // Converged
            }

            // Update step
            centroids = self.update_centroids(&vectors, &assignments, num_clusters);
        }

        // Build cluster results
        let mut clusters: Vec<ClusterResult> = (0..num_clusters)
            .map(|cluster_id| ClusterResult {
                cluster_id,
                show_ids: Vec::new(),
                centroid: centroids[cluster_id].clone(),
            })
            .collect();

        for (i, &cluster_id) in assignments.iter().enumerate() {
            clusters[cluster_id].show_ids.push(show_ids[i]);
        }

        serde_wasm_bindgen::to_value(&clusters)
            .map_err(|_| JsError::new("Serialization failed"))
    }

    /// Get similarities with TypedArrays for zero-copy transfer
    #[wasm_bindgen(js_name = "getSimilaritiesTyped")]
    pub fn get_similarities_typed(
        &self,
        target_show_id: i64,
        limit: usize,
    ) -> Result<JsValue, JsError> {
        let target_setlist = self.show_setlists.get(&target_show_id)
            .ok_or_else(|| JsError::new("Target show not found"))?;

        let mut similarities: Vec<(i64, f32)> = self.show_setlists
            .iter()
            .filter(|(&show_id, _)| show_id != target_show_id)
            .map(|(&show_id, setlist)| {
                let similarity = self.jaccard_similarity(target_setlist, setlist) as f32;
                (show_id, similarity)
            })
            .collect();

        similarities.sort_by(|a, b|
            b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal)
        );
        similarities.truncate(limit);

        // Create typed arrays
        let show_ids_array = BigInt64Array::new_with_length(similarities.len() as u32);
        let scores_array = Float32Array::new_with_length(similarities.len() as u32);

        for (i, (show_id, score)) in similarities.iter().enumerate() {
            show_ids_array.set_index(i as u32, *show_id);
            scores_array.set_index(i as u32, *score);
        }

        let result = Object::new();
        Reflect::set(&result, &"showIds".into(), &show_ids_array)
            .map_err(|_| JsError::new("Failed to set showIds"))?;
        Reflect::set(&result, &"scores".into(), &scores_array)
            .map_err(|_| JsError::new("Failed to set scores"))?;

        Ok(result.into())
    }
}

// ==================== PRIVATE METHODS ====================

impl SetlistSimilarityEngine {
    /// Jaccard similarity: |A ∩ B| / |A ∪ B|
    fn jaccard_similarity(&self, set_a: &HashSet<i64>, set_b: &HashSet<i64>) -> f64 {
        let intersection = set_a.intersection(set_b).count();
        let union = set_a.union(set_b).count();

        if union == 0 {
            0.0
        } else {
            intersection as f64 / union as f64
        }
    }

    /// Cosine similarity: dot(A,B) / (|A| * |B|)
    fn cosine_similarity(&self, set_a: &HashSet<i64>, set_b: &HashSet<i64>) -> f64 {
        let intersection = set_a.intersection(set_b).count() as f64;
        let magnitude_a = (set_a.len() as f64).sqrt();
        let magnitude_b = (set_b.len() as f64).sqrt();

        if magnitude_a == 0.0 || magnitude_b == 0.0 {
            0.0
        } else {
            intersection / (magnitude_a * magnitude_b)
        }
    }

    /// Overlap coefficient: |A ∩ B| / min(|A|, |B|)
    fn overlap_coefficient(&self, set_a: &HashSet<i64>, set_b: &HashSet<i64>) -> f64 {
        let intersection = set_a.intersection(set_b).count();
        let min_size = set_a.len().min(set_b.len());

        if min_size == 0 {
            0.0
        } else {
            intersection as f64 / min_size as f64
        }
    }

    /// Create binary feature vectors for shows
    fn create_feature_vectors(&self, show_ids: &[i64]) -> Vec<Vec<f64>> {
        show_ids.iter()
            .map(|&show_id| {
                let setlist = &self.show_setlists[&show_id];
                let mut vector = vec![0.0; self.total_songs];

                for &song_id in setlist {
                    // Use song_id as index (assuming song IDs are reasonable)
                    let idx = (song_id as usize - 1).min(self.total_songs - 1);
                    vector[idx] = 1.0;
                }

                vector
            })
            .collect()
    }

    /// Initialize K-means centroids using K-means++ algorithm
    fn initialize_centroids(&self, vectors: &[Vec<f64>], k: usize) -> Vec<Vec<f64>> {
        if vectors.is_empty() {
            return Vec::new();
        }

        let mut centroids = Vec::new();
        let mut rng_state = 42u64; // Simple LCG for deterministic randomness

        // Choose first centroid randomly
        let first_idx = self.lcg_rand(&mut rng_state) % vectors.len();
        centroids.push(vectors[first_idx].clone());

        // Choose remaining centroids with k-means++ (distance-weighted)
        for _ in 1..k {
            let mut distances: Vec<f64> = vectors.iter()
                .map(|v| {
                    centroids.iter()
                        .map(|c| self.euclidean_distance(v, c))
                        .fold(f64::INFINITY, f64::min)
                })
                .collect();

            let sum: f64 = distances.iter().sum();
            if sum == 0.0 {
                break;
            }

            // Normalize to probabilities
            for d in &mut distances {
                *d /= sum;
            }

            // Choose next centroid based on weighted probability
            let rand_val = (self.lcg_rand(&mut rng_state) % 1000) as f64 / 1000.0;
            let mut cumsum = 0.0;
            let mut chosen_idx = 0;

            for (idx, &prob) in distances.iter().enumerate() {
                cumsum += prob;
                if cumsum >= rand_val {
                    chosen_idx = idx;
                    break;
                }
            }

            centroids.push(vectors[chosen_idx].clone());
        }

        centroids
    }

    /// Find the closest centroid to a vector
    fn find_closest_centroid(&self, vector: &[f64], centroids: &[Vec<f64>]) -> usize {
        centroids.iter()
            .enumerate()
            .map(|(i, centroid)| (i, self.euclidean_distance(vector, centroid)))
            .min_by(|(_, d1), (_, d2)| d1.partial_cmp(d2).unwrap_or(std::cmp::Ordering::Equal))
            .map(|(i, _)| i)
            .unwrap_or(0)
    }

    /// Update centroids based on current assignments
    fn update_centroids(
        &self,
        vectors: &[Vec<f64>],
        assignments: &[usize],
        num_clusters: usize,
    ) -> Vec<Vec<f64>> {
        let dim = if vectors.is_empty() { 0 } else { vectors[0].len() };
        let mut new_centroids = vec![vec![0.0; dim]; num_clusters];
        let mut counts = vec![0; num_clusters];

        for (vector, &cluster_id) in vectors.iter().zip(assignments.iter()) {
            for (i, &val) in vector.iter().enumerate() {
                new_centroids[cluster_id][i] += val;
            }
            counts[cluster_id] += 1;
        }

        for (centroid, count) in new_centroids.iter_mut().zip(counts.iter()) {
            if *count > 0 {
                for val in centroid.iter_mut() {
                    *val /= *count as f64;
                }
            }
        }

        new_centroids
    }

    /// Calculate Euclidean distance between two vectors
    fn euclidean_distance(&self, a: &[f64], b: &[f64]) -> f64 {
        a.iter()
            .zip(b.iter())
            .map(|(x, y)| (x - y).powi(2))
            .sum::<f64>()
            .sqrt()
    }

    /// Simple linear congruential generator for deterministic randomness
    fn lcg_rand(&self, state: &mut u64) -> usize {
        *state = state.wrapping_mul(1103515245).wrapping_add(12345);
        ((*state / 65536) % 32768) as usize
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_jaccard_similarity() {
        let engine = SetlistSimilarityEngine::new();

        let mut set_a = HashSet::new();
        set_a.insert(1);
        set_a.insert(2);
        set_a.insert(3);

        let mut set_b = HashSet::new();
        set_b.insert(2);
        set_b.insert(3);
        set_b.insert(4);

        let similarity = engine.jaccard_similarity(&set_a, &set_b);
        assert!((similarity - 0.5).abs() < 0.001); // 2/4 = 0.5
    }

    #[test]
    fn test_cosine_similarity() {
        let engine = SetlistSimilarityEngine::new();

        let mut set_a = HashSet::new();
        set_a.insert(1);
        set_a.insert(2);

        let mut set_b = HashSet::new();
        set_b.insert(1);
        set_b.insert(2);

        let similarity = engine.cosine_similarity(&set_a, &set_b);
        assert!((similarity - 1.0).abs() < 0.001); // Identical sets
    }

    #[test]
    fn test_overlap_coefficient() {
        let engine = SetlistSimilarityEngine::new();

        let mut set_a = HashSet::new();
        set_a.insert(1);
        set_a.insert(2);

        let mut set_b = HashSet::new();
        set_b.insert(1);
        set_b.insert(2);
        set_b.insert(3);

        let overlap = engine.overlap_coefficient(&set_a, &set_b);
        assert!((overlap - 1.0).abs() < 0.001); // All of smaller set in larger
    }
}

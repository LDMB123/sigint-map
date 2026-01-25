//! Stateful data store for holding parsed data to eliminate repeated JSON parsing.
//!
//! The `AlmanacDataStore` struct maintains parsed data in memory, allowing
//! multiple queries to be performed without re-parsing JSON each time.
//! This significantly improves performance for operations like global search
//! that need to access multiple entity types.

use wasm_bindgen::prelude::*;
use crate::types::*;

/// Stateful data store that holds parsed data to avoid repeated JSON parsing.
///
/// # Usage from JavaScript
/// ```javascript
/// const store = new AlmanacDataStore();
///
/// // Load data once
/// const songCount = store.loadSongs(songsJson);
/// const venueCount = store.loadVenues(venuesJson);
/// const showCount = store.loadShows(showsJson);
///
/// // Query multiple times without re-parsing
/// const results1 = store.globalSearch("gorge", 10);
/// const results2 = store.globalSearch("warehouse", 10);
///
/// // Clear when done
/// store.clear();
/// ```
///
/// # Performance
/// - Initial load: O(n) for parsing + O(n) for index building
/// - Lookups by ID: O(1) via HashMap
/// - Search: O(n) scan with early termination at limit
#[wasm_bindgen]
pub struct AlmanacDataStore {
    songs: Vec<DexieSong>,
    venues: Vec<DexieVenue>,
    shows: Vec<DexieShow>,
    tours: Vec<DexieTour>,
    entries: Vec<DexieSetlistEntry>,
    guests: Vec<DexieGuest>,
    // Indexes for fast lookup
    song_by_id: std::collections::HashMap<i64, usize>,
    venue_by_id: std::collections::HashMap<i64, usize>,
    show_by_id: std::collections::HashMap<i64, usize>,
}

#[wasm_bindgen]
impl AlmanacDataStore {
    /// Create a new empty data store.
    #[wasm_bindgen(constructor)]
    pub fn new() -> AlmanacDataStore {
        AlmanacDataStore {
            songs: Vec::new(),
            venues: Vec::new(),
            shows: Vec::new(),
            tours: Vec::new(),
            entries: Vec::new(),
            guests: Vec::new(),
            song_by_id: std::collections::HashMap::new(),
            venue_by_id: std::collections::HashMap::new(),
            show_by_id: std::collections::HashMap::new(),
        }
    }

    /// Load songs from JSON and build the song ID index.
    ///
    /// # Arguments
    /// * `json` - JSON string containing array of DexieSong objects
    ///
    /// # Returns
    /// Number of songs loaded
    #[wasm_bindgen(js_name = "loadSongs")]
    pub fn load_songs(&mut self, json: &str) -> Result<usize, JsError> {
        let songs: Vec<DexieSong> = serde_json::from_str(json)
            .map_err(|_| JsError::new("JSON parse error"))?;

        self.song_by_id.clear();
        for (idx, song) in songs.iter().enumerate() {
            self.song_by_id.insert(song.id, idx);
        }

        let count = songs.len();
        self.songs = songs;
        Ok(count)
    }

    /// Load venues from JSON and build the venue ID index.
    ///
    /// # Arguments
    /// * `json` - JSON string containing array of DexieVenue objects
    ///
    /// # Returns
    /// Number of venues loaded
    #[wasm_bindgen(js_name = "loadVenues")]
    pub fn load_venues(&mut self, json: &str) -> Result<usize, JsError> {
        let venues: Vec<DexieVenue> = serde_json::from_str(json)
            .map_err(|_| JsError::new("JSON parse error"))?;

        self.venue_by_id.clear();
        for (idx, venue) in venues.iter().enumerate() {
            self.venue_by_id.insert(venue.id, idx);
        }

        let count = venues.len();
        self.venues = venues;
        Ok(count)
    }

    /// Load shows from JSON and build the show ID index.
    ///
    /// # Arguments
    /// * `json` - JSON string containing array of DexieShow objects
    ///
    /// # Returns
    /// Number of shows loaded
    #[wasm_bindgen(js_name = "loadShows")]
    pub fn load_shows(&mut self, json: &str) -> Result<usize, JsError> {
        let shows: Vec<DexieShow> = serde_json::from_str(json)
            .map_err(|_| JsError::new("JSON parse error"))?;

        self.show_by_id.clear();
        for (idx, show) in shows.iter().enumerate() {
            self.show_by_id.insert(show.id, idx);
        }

        let count = shows.len();
        self.shows = shows;
        Ok(count)
    }

    /// Load tours from JSON.
    ///
    /// # Arguments
    /// * `json` - JSON string containing array of DexieTour objects
    ///
    /// # Returns
    /// Number of tours loaded
    #[wasm_bindgen(js_name = "loadTours")]
    pub fn load_tours(&mut self, json: &str) -> Result<usize, JsError> {
        let tours: Vec<DexieTour> = serde_json::from_str(json)
            .map_err(|_| JsError::new("JSON parse error"))?;
        let count = tours.len();
        self.tours = tours;
        Ok(count)
    }

    /// Load setlist entries from JSON.
    ///
    /// # Arguments
    /// * `json` - JSON string containing array of DexieSetlistEntry objects
    ///
    /// # Returns
    /// Number of entries loaded
    #[wasm_bindgen(js_name = "loadEntries")]
    pub fn load_entries(&mut self, json: &str) -> Result<usize, JsError> {
        let entries: Vec<DexieSetlistEntry> = serde_json::from_str(json)
            .map_err(|_| JsError::new("JSON parse error"))?;
        let count = entries.len();
        self.entries = entries;
        Ok(count)
    }

    /// Load guests from JSON.
    ///
    /// # Arguments
    /// * `json` - JSON string containing array of DexieGuest objects
    ///
    /// # Returns
    /// Number of guests loaded
    #[wasm_bindgen(js_name = "loadGuests")]
    pub fn load_guests(&mut self, json: &str) -> Result<usize, JsError> {
        let guests: Vec<DexieGuest> = serde_json::from_str(json)
            .map_err(|_| JsError::new("JSON parse error"))?;
        let count = guests.len();
        self.guests = guests;
        Ok(count)
    }

    /// Get the number of songs currently loaded.
    #[wasm_bindgen(js_name = "getSongCount")]
    pub fn get_song_count(&self) -> usize {
        self.songs.len()
    }

    /// Get the number of venues currently loaded.
    #[wasm_bindgen(js_name = "getVenueCount")]
    pub fn get_venue_count(&self) -> usize {
        self.venues.len()
    }

    /// Get the number of shows currently loaded.
    #[wasm_bindgen(js_name = "getShowCount")]
    pub fn get_show_count(&self) -> usize {
        self.shows.len()
    }

    /// Get the number of tours currently loaded.
    #[wasm_bindgen(js_name = "getTourCount")]
    pub fn get_tour_count(&self) -> usize {
        self.tours.len()
    }

    /// Get the number of setlist entries currently loaded.
    #[wasm_bindgen(js_name = "getEntryCount")]
    pub fn get_entry_count(&self) -> usize {
        self.entries.len()
    }

    /// Get the number of guests currently loaded.
    #[wasm_bindgen(js_name = "getGuestCount")]
    pub fn get_guest_count(&self) -> usize {
        self.guests.len()
    }

    /// Perform a global search across songs and venues.
    ///
    /// Searches the `search_text` field of songs and venues for case-insensitive
    /// substring matches. Results are limited to the specified count.
    ///
    /// # Arguments
    /// * `query` - Search query string
    /// * `limit` - Maximum number of results to return
    ///
    /// # Returns
    /// Array of search result objects with type, id, and title/name
    ///
    /// # Performance
    /// O(n) scan with early termination when limit is reached
    #[wasm_bindgen(js_name = "globalSearch")]
    pub fn global_search(&self, query: &str, limit: usize) -> Result<JsValue, JsError> {
        let query_lower = query.to_lowercase();
        let mut results = Vec::new();

        // Search songs by search_text field
        for song in &self.songs {
            if song.search_text.contains(&query_lower) {
                results.push(serde_json::json!({
                    "type": "song",
                    "id": song.id,
                    "title": song.title,
                    "score": song.total_performances,
                }));
                if results.len() >= limit { break; }
            }
        }

        // Search venues if under limit
        if results.len() < limit {
            for venue in &self.venues {
                if venue.search_text.contains(&query_lower) {
                    results.push(serde_json::json!({
                        "type": "venue",
                        "id": venue.id,
                        "name": venue.name,
                        "city": venue.city,
                        "state": venue.state,
                        "score": venue.total_shows,
                    }));
                    if results.len() >= limit { break; }
                }
            }
        }

        // Search guests if under limit
        if results.len() < limit {
            for guest in &self.guests {
                if guest.search_text.contains(&query_lower) {
                    results.push(serde_json::json!({
                        "type": "guest",
                        "id": guest.id,
                        "name": guest.name,
                        "score": guest.total_appearances,
                    }));
                    if results.len() >= limit { break; }
                }
            }
        }

        serde_wasm_bindgen::to_value(&results)
            .map_err(|_| JsError::new("Serialization failed"))
    }

    /// Look up a song by its ID.
    ///
    /// # Arguments
    /// * `id` - Song ID to look up
    ///
    /// # Returns
    /// The song object if found, null otherwise
    #[wasm_bindgen(js_name = "getSongById")]
    pub fn get_song_by_id(&self, id: i64) -> Result<JsValue, JsError> {
        if let Some(&idx) = self.song_by_id.get(&id) {
            if let Some(song) = self.songs.get(idx) {
                return serde_wasm_bindgen::to_value(song)
                    .map_err(|_| JsError::new("Serialization failed"));
            }
        }
        Ok(JsValue::NULL)
    }

    /// Look up a venue by its ID.
    ///
    /// # Arguments
    /// * `id` - Venue ID to look up
    ///
    /// # Returns
    /// The venue object if found, null otherwise
    #[wasm_bindgen(js_name = "getVenueById")]
    pub fn get_venue_by_id(&self, id: i64) -> Result<JsValue, JsError> {
        if let Some(&idx) = self.venue_by_id.get(&id) {
            if let Some(venue) = self.venues.get(idx) {
                return serde_wasm_bindgen::to_value(venue)
                    .map_err(|_| JsError::new("Serialization failed"));
            }
        }
        Ok(JsValue::NULL)
    }

    /// Look up a show by its ID.
    ///
    /// # Arguments
    /// * `id` - Show ID to look up
    ///
    /// # Returns
    /// The show object if found, null otherwise
    #[wasm_bindgen(js_name = "getShowById")]
    pub fn get_show_by_id(&self, id: i64) -> Result<JsValue, JsError> {
        if let Some(&idx) = self.show_by_id.get(&id) {
            if let Some(show) = self.shows.get(idx) {
                return serde_wasm_bindgen::to_value(show)
                    .map_err(|_| JsError::new("Serialization failed"));
            }
        }
        Ok(JsValue::NULL)
    }

    /// Clear all loaded data and indexes.
    ///
    /// Frees memory by clearing all vectors and hash maps.
    #[wasm_bindgen(js_name = "clear")]
    pub fn clear(&mut self) {
        self.songs.clear();
        self.venues.clear();
        self.shows.clear();
        self.tours.clear();
        self.entries.clear();
        self.guests.clear();
        self.song_by_id.clear();
        self.venue_by_id.clear();
        self.show_by_id.clear();
    }

    /// Check if the data store has any data loaded.
    #[wasm_bindgen(js_name = "isEmpty")]
    pub fn is_empty(&self) -> bool {
        self.songs.is_empty()
            && self.venues.is_empty()
            && self.shows.is_empty()
            && self.tours.is_empty()
            && self.entries.is_empty()
            && self.guests.is_empty()
    }

    /// Get memory usage statistics.
    ///
    /// # Returns
    /// Object with counts for each entity type
    #[wasm_bindgen(js_name = "getStats")]
    pub fn get_stats(&self) -> Result<JsValue, JsError> {
        let stats = serde_json::json!({
            "songs": self.songs.len(),
            "venues": self.venues.len(),
            "shows": self.shows.len(),
            "tours": self.tours.len(),
            "entries": self.entries.len(),
            "guests": self.guests.len(),
            "indexedSongs": self.song_by_id.len(),
            "indexedVenues": self.venue_by_id.len(),
            "indexedShows": self.show_by_id.len(),
        });

        serde_wasm_bindgen::to_value(&stats)
            .map_err(|_| JsError::new("Serialization failed"))
    }
}

impl Default for AlmanacDataStore {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_new_store_is_empty() {
        let store = AlmanacDataStore::new();
        assert!(store.is_empty());
        assert_eq!(store.get_song_count(), 0);
        assert_eq!(store.get_venue_count(), 0);
        assert_eq!(store.get_show_count(), 0);
    }

    #[test]
    fn test_clear() {
        let mut store = AlmanacDataStore::new();
        // Manually add some data to test clearing
        store.songs.push(DexieSong {
            id: 1,
            title: "Test".to_string(),
            slug: "test".to_string(),
            sort_title: "test".to_string(),
            original_artist: None,
            is_cover: false,
            is_original: true,
            first_played_date: None,
            last_played_date: None,
            total_performances: 0,
            opener_count: 0,
            closer_count: 0,
            encore_count: 0,
            lyrics: None,
            notes: None,
            is_liberated: false,
            days_since_last_played: None,
            shows_since_last_played: None,
            search_text: "test".to_string(),
        });
        store.song_by_id.insert(1, 0);

        assert!(!store.is_empty());

        store.clear();

        assert!(store.is_empty());
        assert_eq!(store.song_by_id.len(), 0);
    }
}

//! DMB Almanac - WASM Data Transformation Module
//!
//! High-performance Rust implementation for transforming raw JSON data
//! into Dexie-compatible formats. Replaces expensive JavaScript operations
//! with optimized Rust code compiled to WebAssembly.
//!
//! # Performance Targets
//! - Songs (~1,300 items): < 5ms
//! - Venues (~1,000 items): < 3ms
//! - Shows (~5,000 items): < 15ms
//! - Setlist entries (~150,000 items): < 100ms
//! - Foreign key validation: < 50ms
//!
//! # Architecture
//! ```text
//! JavaScript (raw JSON) -> WASM (transform) -> JavaScript (Dexie objects)
//! ```

mod error;
mod types;
mod transform;
mod validate;
mod aggregation;
mod search;
mod datastore;
mod search_index;
mod tfidf_search;
mod setlist_similarity;
mod rarity;

use wasm_bindgen::prelude::*;
use js_sys::{BigInt64Array, Int32Array, Object, Reflect};

// Re-export public API
pub use error::TransformError;
pub use types::*;
pub use transform::*;
pub use validate::*;
pub use aggregation::*;
pub use search::*;
pub use datastore::*;
pub use search_index::*;
pub use tfidf_search::*;
pub use setlist_similarity::*;
pub use rarity::*;

/// Initialize panic hook for better error messages in development.
/// Call this once at startup.
#[wasm_bindgen(start)]
pub fn init() {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}

/// Get the WASM module version for debugging.
#[wasm_bindgen(js_name = "version")]
pub fn version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

// ==================== MAIN TRANSFORMATION API ====================

/// Transform raw song JSON array to DexieSong format.
///
/// # Arguments
/// * `raw_json` - JSON string containing array of server songs (legacy)
///
/// # Returns
/// * `JsValue` - Array of DexieSong objects
///
/// # Performance
/// ~1,300 songs in < 5ms on Apple Silicon
#[wasm_bindgen(js_name = "transformSongs")]
pub fn transform_songs(raw_json: &str) -> Result<JsValue, JsError> {
    let server_songs: Vec<types::ServerSong> = serde_json::from_str(raw_json)
        .map_err(|_| JsError::new("JSON parse error"))?;

    let dexie_songs: Vec<types::DexieSong> = server_songs
        .into_iter()
        .map(transform::transform_song)
        .collect();

    serde_wasm_bindgen::to_value(&dexie_songs)
        .map_err(|_| JsError::new("Serialization failed"))
}

/// Transform song array directly from JavaScript objects (serde-wasm-bindgen).
///
/// This is ~10x faster than the JSON string version as it avoids
/// intermediate JSON serialization/deserialization.
///
/// # Arguments
/// * `input` - JavaScript array of server song objects
///
/// # Returns
/// * `JsValue` - Array of DexieSong objects
///
/// # Performance
/// ~1,300 songs in < 0.5ms on Apple Silicon (10x improvement)
#[wasm_bindgen(js_name = "transformSongsDirect")]
pub fn transform_songs_direct(input: JsValue) -> Result<JsValue, JsError> {
    let server_songs: Vec<types::ServerSong> = serde_wasm_bindgen::from_value(input)
        .map_err(|e| JsError::new(&format!("Deserialization error: {}", e)))?;

    let dexie_songs: Vec<types::DexieSong> = server_songs
        .into_iter()
        .map(transform::transform_song)
        .collect();

    serde_wasm_bindgen::to_value(&dexie_songs)
        .map_err(|e| JsError::new(&format!("Serialization error: {}", e)))
}

/// Transform raw venue JSON array to DexieVenue format.
///
/// # Arguments
/// * `raw_json` - JSON string containing array of server venues (legacy)
///
/// # Returns
/// * `JsValue` - Array of DexieVenue objects
///
/// # Performance
/// ~1,000 venues in < 3ms on Apple Silicon
#[wasm_bindgen(js_name = "transformVenues")]
pub fn transform_venues(raw_json: &str) -> Result<JsValue, JsError> {
    let server_venues: Vec<types::ServerVenue> = serde_json::from_str(raw_json)
        .map_err(|_| JsError::new("JSON parse error"))?;

    let dexie_venues: Vec<types::DexieVenue> = server_venues
        .into_iter()
        .map(transform::transform_venue)
        .collect();

    serde_wasm_bindgen::to_value(&dexie_venues)
        .map_err(|_| JsError::new("Serialization failed"))
}

/// Transform venue array directly from JavaScript objects (serde-wasm-bindgen).
///
/// This is ~10x faster than the JSON string version.
///
/// # Arguments
/// * `input` - JavaScript array of server venue objects
///
/// # Returns
/// * `JsValue` - Array of DexieVenue objects
#[wasm_bindgen(js_name = "transformVenuesDirect")]
pub fn transform_venues_direct(input: JsValue) -> Result<JsValue, JsError> {
    let server_venues: Vec<types::ServerVenue> = serde_wasm_bindgen::from_value(input)
        .map_err(|e| JsError::new(&format!("Deserialization error: {}", e)))?;

    let dexie_venues: Vec<types::DexieVenue> = server_venues
        .into_iter()
        .map(transform::transform_venue)
        .collect();

    serde_wasm_bindgen::to_value(&dexie_venues)
        .map_err(|e| JsError::new(&format!("Serialization error: {}", e)))
}

/// Transform raw tour JSON array to DexieTour format.
///
/// # Arguments
/// * `raw_json` - JSON string containing array of server tours
///
/// # Returns
/// * `JsValue` - Array of DexieTour objects
#[wasm_bindgen(js_name = "transformTours")]
pub fn transform_tours(raw_json: &str) -> Result<JsValue, JsError> {
    let server_tours: Vec<types::ServerTour> = serde_json::from_str(raw_json)
        .map_err(|_| JsError::new("JSON parse error"))?;

    let dexie_tours: Vec<types::DexieTour> = server_tours
        .into_iter()
        .map(transform::transform_tour)
        .collect();

    serde_wasm_bindgen::to_value(&dexie_tours)
        .map_err(|_| JsError::new("Serialization failed"))
}

/// Transform raw show JSON array to DexieShow format.
///
/// Shows include embedded venue and tour information for offline access.
///
/// # Arguments
/// * `raw_json` - JSON string containing array of server shows (legacy)
///
/// # Returns
/// * `JsValue` - Array of DexieShow objects with embedded venue/tour
///
/// # Performance
/// ~5,000 shows in < 15ms on Apple Silicon
#[wasm_bindgen(js_name = "transformShows")]
pub fn transform_shows(raw_json: &str) -> Result<JsValue, JsError> {
    let server_shows: Vec<types::ServerShow> = serde_json::from_str(raw_json)
        .map_err(|_| JsError::new("JSON parse error"))?;

    let dexie_shows: Vec<types::DexieShow> = server_shows
        .into_iter()
        .map(transform::transform_show)
        .collect();

    serde_wasm_bindgen::to_value(&dexie_shows)
        .map_err(|_| JsError::new("Serialization failed"))
}

/// Transform show array directly from JavaScript objects (serde-wasm-bindgen).
///
/// This is ~10x faster than the JSON string version.
///
/// # Arguments
/// * `input` - JavaScript array of server show objects
///
/// # Returns
/// * `JsValue` - Array of DexieShow objects with embedded venue/tour
///
/// # Performance
/// ~5,000 shows in < 1.5ms on Apple Silicon (10x improvement)
#[wasm_bindgen(js_name = "transformShowsDirect")]
pub fn transform_shows_direct(input: JsValue) -> Result<JsValue, JsError> {
    let server_shows: Vec<types::ServerShow> = serde_wasm_bindgen::from_value(input)
        .map_err(|e| JsError::new(&format!("Deserialization error: {}", e)))?;

    let dexie_shows: Vec<types::DexieShow> = server_shows
        .into_iter()
        .map(transform::transform_show)
        .collect();

    serde_wasm_bindgen::to_value(&dexie_shows)
        .map_err(|e| JsError::new(&format!("Serialization error: {}", e)))
}

/// Transform raw setlist entry JSON array to DexieSetlistEntry format.
///
/// This is the largest dataset (~150K items) and benefits most from
/// WASM optimization.
///
/// # Arguments
/// * `raw_json` - JSON string containing array of server setlist entries (legacy)
///
/// # Returns
/// * `JsValue` - Array of DexieSetlistEntry objects with embedded song
///
/// # Performance
/// ~150,000 entries in < 100ms on Apple Silicon
#[wasm_bindgen(js_name = "transformSetlistEntries")]
pub fn transform_setlist_entries(raw_json: &str) -> Result<JsValue, JsError> {
    let server_entries: Vec<types::ServerSetlistEntry> = serde_json::from_str(raw_json)
        .map_err(|_| JsError::new("JSON parse error"))?;

    let dexie_entries: Vec<types::DexieSetlistEntry> = server_entries
        .into_iter()
        .map(transform::transform_setlist_entry)
        .collect();

    serde_wasm_bindgen::to_value(&dexie_entries)
        .map_err(|_| JsError::new("Serialization failed"))
}

/// Transform setlist entry array directly from JavaScript objects (serde-wasm-bindgen).
///
/// This is ~10x faster than the JSON string version and provides the largest
/// performance benefit due to the dataset size (~150K items).
///
/// # Arguments
/// * `input` - JavaScript array of server setlist entry objects
///
/// # Returns
/// * `JsValue` - Array of DexieSetlistEntry objects with embedded song
///
/// # Performance
/// ~150,000 entries in < 10ms on Apple Silicon (10x improvement)
#[wasm_bindgen(js_name = "transformSetlistEntriesDirect")]
pub fn transform_setlist_entries_direct(input: JsValue) -> Result<JsValue, JsError> {
    let server_entries: Vec<types::ServerSetlistEntry> = serde_wasm_bindgen::from_value(input)
        .map_err(|e| JsError::new(&format!("Deserialization error: {}", e)))?;

    let dexie_entries: Vec<types::DexieSetlistEntry> = server_entries
        .into_iter()
        .map(transform::transform_setlist_entry)
        .collect();

    serde_wasm_bindgen::to_value(&dexie_entries)
        .map_err(|e| JsError::new(&format!("Serialization error: {}", e)))
}

/// Transform raw guest JSON array to DexieGuest format.
///
/// # Arguments
/// * `raw_json` - JSON string containing array of server guests
///
/// # Returns
/// * `JsValue` - Array of DexieGuest objects
#[wasm_bindgen(js_name = "transformGuests")]
pub fn transform_guests(raw_json: &str) -> Result<JsValue, JsError> {
    let server_guests: Vec<types::ServerGuest> = serde_json::from_str(raw_json)
        .map_err(|_| JsError::new("JSON parse error"))?;

    let dexie_guests: Vec<types::DexieGuest> = server_guests
        .into_iter()
        .map(transform::transform_guest)
        .collect();

    serde_wasm_bindgen::to_value(&dexie_guests)
        .map_err(|_| JsError::new("Serialization failed"))
}

/// Transform raw liberation list JSON array to DexieLiberationEntry format.
///
/// # Arguments
/// * `raw_json` - JSON string containing array of server liberation entries
///
/// # Returns
/// * `JsValue` - Array of DexieLiberationEntry objects
#[wasm_bindgen(js_name = "transformLiberationList")]
pub fn transform_liberation_list(raw_json: &str) -> Result<JsValue, JsError> {
    let server_entries: Vec<types::ServerLiberationEntry> = serde_json::from_str(raw_json)
        .map_err(|_| JsError::new("JSON parse error"))?;

    let dexie_entries: Vec<types::DexieLiberationEntry> = server_entries
        .into_iter()
        .map(transform::transform_liberation_entry)
        .collect();

    serde_wasm_bindgen::to_value(&dexie_entries)
        .map_err(|_| JsError::new("Serialization failed"))
}

// ==================== VALIDATION API ====================

/// Validate foreign key relationships across all entities.
///
/// Builds HashSets of valid IDs and checks all references.
///
/// # Arguments
/// * `songs_json` - JSON string of DexieSong array
/// * `venues_json` - JSON string of DexieVenue array
/// * `tours_json` - JSON string of DexieTour array
/// * `shows_json` - JSON string of DexieShow array
/// * `setlist_entries_json` - JSON string of DexieSetlistEntry array
///
/// # Returns
/// * `JsValue` - Array of ValidationWarning objects
///
/// # Performance
/// Full validation in < 50ms on Apple Silicon
#[wasm_bindgen(js_name = "validateForeignKeys")]
pub fn validate_foreign_keys(
    songs_json: &str,
    venues_json: &str,
    tours_json: &str,
    shows_json: &str,
    setlist_entries_json: &str,
) -> Result<JsValue, JsError> {
    let warnings = validate::validate_all_foreign_keys(
        songs_json,
        venues_json,
        tours_json,
        shows_json,
        setlist_entries_json,
    )?;

    serde_wasm_bindgen::to_value(&warnings)
        .map_err(|_| JsError::new("Serialization failed"))
}

// ==================== BATCH TRANSFORMATION API ====================

/// Transform all entity types in a single call.
///
/// More efficient than separate calls due to reduced JS<->WASM boundary crossings.
///
/// # Arguments
/// * `full_sync_json` - JSON string containing FullSyncResponse from server
///
/// # Returns
/// * `JsValue` - Object with all transformed entity arrays
#[wasm_bindgen(js_name = "transformFullSync")]
pub fn transform_full_sync(full_sync_json: &str) -> Result<JsValue, JsError> {
    let sync_data: types::FullSyncData = serde_json::from_str(full_sync_json)
        .map_err(|_| JsError::new("JSON parse error"))?;

    let result = transform::transform_full_sync_data(sync_data)?;

    serde_wasm_bindgen::to_value(&result)
        .map_err(|_| JsError::new("Serialization failed"))
}

// ==================== UTILITY FUNCTIONS ====================

/// Generate searchText field for a song.
///
/// Concatenates title and original artist (if cover) into lowercase string.
#[wasm_bindgen(js_name = "generateSongSearchText")]
pub fn generate_song_search_text(title: &str, original_artist: Option<String>) -> String {
    transform::generate_song_search_text(title, original_artist.as_deref())
}

/// Generate searchText field for a venue.
///
/// Concatenates name, city, state, country into lowercase string.
#[wasm_bindgen(js_name = "generateVenueSearchText")]
pub fn generate_venue_search_text(
    name: &str,
    city: &str,
    state: Option<String>,
    country: &str,
) -> String {
    transform::generate_venue_search_text(name, city, state.as_deref(), country)
}

/// Extract year from ISO date string (YYYY-MM-DD).
#[wasm_bindgen(js_name = "extractYearFromDate")]
pub fn extract_year_from_date(date: &str) -> Option<u16> {
    transform::extract_year_from_date(date)
}

/// Categorize slot type based on position in set.
#[wasm_bindgen(js_name = "categorizeSlot")]
pub fn categorize_slot(position: u32, total_in_set: u32, set_name: &str) -> String {
    transform::categorize_slot(position, total_in_set, set_name).to_string()
}

// ==================== AGGREGATION API ====================

/// Aggregate shows by year.
///
/// # Arguments
/// * `shows_json` - JSON string containing array of DexieShow objects
///
/// # Returns
/// * `JsValue` - Array of {year, count} objects sorted by year
#[wasm_bindgen(js_name = "aggregateShowsByYear")]
pub fn aggregate_shows_by_year(shows_json: &str) -> Result<JsValue, JsError> {
    let shows: Vec<types::DexieShow> = serde_json::from_str(shows_json)
        .map_err(|_| JsError::new("JSON parse error"))?;

    let result = aggregation::aggregate_shows_by_year(&shows);

    serde_wasm_bindgen::to_value(&result)
        .map_err(|_| JsError::new("Serialization failed"))
}

/// Get year breakdown for a specific song.
///
/// # Arguments
/// * `entries_json` - JSON string containing array of DexieSetlistEntry objects
/// * `song_id` - The song ID to get breakdown for
///
/// # Returns
/// * `JsValue` - Array of {year, count} objects sorted by year descending
#[wasm_bindgen(js_name = "getYearBreakdownForSong")]
pub fn get_year_breakdown_for_song(entries_json: &str, song_id: i64) -> Result<JsValue, JsError> {
    let entries: Vec<types::DexieSetlistEntry> = serde_json::from_str(entries_json)
        .map_err(|_| JsError::new("JSON parse error"))?;

    let result = aggregation::get_year_breakdown_for_song(&entries, song_id);

    serde_wasm_bindgen::to_value(&result)
        .map_err(|_| JsError::new("Serialization failed"))
}

/// Get year breakdown for a specific venue.
///
/// # Arguments
/// * `shows_json` - JSON string containing array of DexieShow objects
/// * `venue_id` - The venue ID to get breakdown for
///
/// # Returns
/// * `JsValue` - Array of {year, count} objects sorted by year descending
#[wasm_bindgen(js_name = "getYearBreakdownForVenue")]
pub fn get_year_breakdown_for_venue(shows_json: &str, venue_id: i64) -> Result<JsValue, JsError> {
    let shows: Vec<types::DexieShow> = serde_json::from_str(shows_json)
        .map_err(|_| JsError::new("JSON parse error"))?;

    let result = aggregation::get_year_breakdown_for_venue(&shows, venue_id);

    serde_wasm_bindgen::to_value(&result)
        .map_err(|_| JsError::new("Serialization failed"))
}

/// Calculate venue statistics.
///
/// # Arguments
/// * `venues_json` - JSON string containing array of DexieVenue objects
///
/// # Returns
/// * `JsValue` - VenueStats object with totals
#[wasm_bindgen(js_name = "calculateVenueStats")]
pub fn calculate_venue_stats(venues_json: &str) -> Result<JsValue, JsError> {
    let venues: Vec<types::DexieVenue> = serde_json::from_str(venues_json)
        .map_err(|_| JsError::new("JSON parse error"))?;

    let result = aggregation::calculate_venue_stats(&venues);

    serde_wasm_bindgen::to_value(&result)
        .map_err(|_| JsError::new("Serialization failed"))
}

/// Count openers by year.
///
/// # Arguments
/// * `entries_json` - JSON string containing array of DexieSetlistEntry objects
/// * `year` - The year to count openers for
///
/// # Returns
/// * `JsValue` - Array of {songId, count} objects sorted by count descending
#[wasm_bindgen(js_name = "countOpenersByYear")]
pub fn count_openers_by_year(entries_json: &str, year: i64) -> Result<JsValue, JsError> {
    let entries: Vec<types::DexieSetlistEntry> = serde_json::from_str(entries_json)
        .map_err(|_| JsError::new("JSON parse error"))?;

    let result = aggregation::count_openers_by_year(&entries, year);

    serde_wasm_bindgen::to_value(&result)
        .map_err(|_| JsError::new("Serialization failed"))
}

/// Count closers by year (excluding encores).
///
/// # Arguments
/// * `entries_json` - JSON string containing array of DexieSetlistEntry objects
/// * `year` - The year to count closers for
///
/// # Returns
/// * `JsValue` - Array of {songId, count} objects sorted by count descending
#[wasm_bindgen(js_name = "countClosersByYear")]
pub fn count_closers_by_year(entries_json: &str, year: i64) -> Result<JsValue, JsError> {
    let entries: Vec<types::DexieSetlistEntry> = serde_json::from_str(entries_json)
        .map_err(|_| JsError::new("JSON parse error"))?;

    let result = aggregation::count_closers_by_year(&entries, year);

    serde_wasm_bindgen::to_value(&result)
        .map_err(|_| JsError::new("Serialization failed"))
}

/// Get top N songs by total performance count.
///
/// # Arguments
/// * `entries_json` - JSON string containing array of DexieSetlistEntry objects
/// * `limit` - Maximum number of songs to return
///
/// # Returns
/// * `JsValue` - Array of {songId, count} objects sorted by count descending
#[wasm_bindgen(js_name = "getTopSongsByPerformances")]
pub fn get_top_songs_by_performances(entries_json: &str, limit: usize) -> Result<JsValue, JsError> {
    let entries: Vec<types::DexieSetlistEntry> = serde_json::from_str(entries_json)
        .map_err(|_| JsError::new("JSON parse error"))?;

    let result = aggregation::get_top_songs_by_performances(&entries, limit);

    serde_wasm_bindgen::to_value(&result)
        .map_err(|_| JsError::new("Serialization failed"))
}

/// Get tour statistics for a specific year.
///
/// Computes unique venues, states, and songs played in that year.
///
/// # Arguments
/// * `shows_json` - JSON string containing array of DexieShow objects
/// * `entries_json` - JSON string containing array of DexieSetlistEntry objects
/// * `year` - The year to get statistics for
///
/// # Returns
/// * `JsValue` - TourYearStats object with show count and unique counts
#[wasm_bindgen(js_name = "getTourStatsByYear")]
pub fn get_tour_stats_by_year(
    shows_json: &str,
    entries_json: &str,
    year: i64,
) -> Result<JsValue, JsError> {
    let shows: Vec<types::DexieShow> = serde_json::from_str(shows_json)
        .map_err(|_| JsError::new("JSON parse error"))?;

    let entries: Vec<types::DexieSetlistEntry> = serde_json::from_str(entries_json)
        .map_err(|_| JsError::new("JSON parse error"))?;

    let result = aggregation::get_tour_stats_by_year(&shows, &entries, year);

    serde_wasm_bindgen::to_value(&result)
        .map_err(|_| JsError::new("Serialization failed"))
}

/// Group tours by decade.
///
/// # Arguments
/// * `tours_json` - JSON string containing array of DexieTour objects
///
/// # Returns
/// * `JsValue` - Object with decade keys (1990, 2000, etc.) mapping to tour arrays
#[wasm_bindgen(js_name = "getToursGroupedByDecade")]
pub fn get_tours_grouped_by_decade(tours_json: &str) -> Result<JsValue, JsError> {
    let tours: Vec<types::DexieTour> = serde_json::from_str(tours_json)
        .map_err(|_| JsError::new("JSON parse error"))?;

    let result = aggregation::get_tours_grouped_by_decade(tours);

    serde_wasm_bindgen::to_value(&result)
        .map_err(|_| JsError::new("Serialization failed"))
}

/// Get year breakdown for a specific guest.
///
/// Returns unique show appearances per year (deduplicates multiple appearances
/// at the same show).
///
/// # Arguments
/// * `appearances_json` - JSON string containing array of DexieGuestAppearance objects
/// * `guest_id` - The guest ID to get breakdown for
///
/// # Returns
/// * `JsValue` - Array of {year, count} objects sorted by year descending
#[wasm_bindgen(js_name = "getYearBreakdownForGuest")]
pub fn get_year_breakdown_for_guest(
    appearances_json: &str,
    guest_id: i64,
) -> Result<JsValue, JsError> {
    let appearances: Vec<types::DexieGuestAppearance> = serde_json::from_str(appearances_json)
        .map_err(|_| JsError::new("JSON parse error"))?;

    let result = aggregation::get_year_breakdown_for_guest(&appearances, guest_id);

    serde_wasm_bindgen::to_value(&result)
        .map_err(|_| JsError::new("Serialization failed"))
}

/// Count encore songs by year.
///
/// Filters setlist entries where set_name is Encore or Encore2 and year matches,
/// then counts occurrences per song_id.
///
/// # Arguments
/// * `entries_json` - JSON string containing array of DexieSetlistEntry objects
/// * `year` - The year to count encores for
///
/// # Returns
/// * `JsValue` - Array of {songId, count} objects sorted by count descending
#[wasm_bindgen(js_name = "countEncoresByYear")]
pub fn count_encores_by_year(entries_json: &str, year: i64) -> Result<JsValue, JsError> {
    let entries: Vec<types::DexieSetlistEntry> = serde_json::from_str(entries_json)
        .map_err(|_| JsError::new("JSON parse error"))?;

    let result = aggregation::count_encores_by_year(&entries, year);

    serde_wasm_bindgen::to_value(&result)
        .map_err(|_| JsError::new("Serialization failed"))
}

/// Aggregate total songs played per year (counting each setlist entry).
///
/// Returns a sorted list of (year, count) pairs where count is the total
/// number of songs performed that year.
///
/// # Arguments
/// * `entries` - JavaScript array of DexieSetlistEntry objects
///
/// # Returns
/// * `JsValue` - Array of {year, count} objects sorted by year ascending
#[wasm_bindgen(js_name = "aggregateSongsPerYear")]
pub fn aggregate_songs_per_year(entries: JsValue) -> Result<JsValue, JsError> {
    let entries: Vec<types::DexieSetlistEntry> = serde_wasm_bindgen::from_value(entries)
        .map_err(|e| JsError::new(&format!("Deserialization error: {}", e)))?;

    let result = aggregation::aggregate_songs_per_year(&entries);

    serde_wasm_bindgen::to_value(&result)
        .map_err(|e| JsError::new(&format!("Serialization error: {}", e)))
}

/// Aggregate unique songs played per year (counting each unique song once).
///
/// Returns a sorted list of (year, count) pairs where count is the number
/// of distinct songs performed that year.
///
/// # Arguments
/// * `entries` - JavaScript array of DexieSetlistEntry objects
///
/// # Returns
/// * `JsValue` - Array of {year, count} objects sorted by year ascending
#[wasm_bindgen(js_name = "aggregateUniqueSongsPerYear")]
pub fn aggregate_unique_songs_per_year(entries: JsValue) -> Result<JsValue, JsError> {
    let entries: Vec<types::DexieSetlistEntry> = serde_wasm_bindgen::from_value(entries)
        .map_err(|e| JsError::new(&format!("Deserialization error: {}", e)))?;

    let result = aggregation::aggregate_unique_songs_per_year(&entries);

    serde_wasm_bindgen::to_value(&result)
        .map_err(|e| JsError::new(&format!("Serialization error: {}", e)))
}

/// Aggregate comprehensive yearly statistics in a single call.
///
/// Computes show count, total songs, unique songs, unique venues,
/// average songs per show, and opener/closer/encore counts.
///
/// # Arguments
/// * `shows` - JavaScript array of DexieShow objects
/// * `entries` - JavaScript array of DexieSetlistEntry objects
/// * `year` - The year to compute statistics for
///
/// # Returns
/// * `JsValue` - YearlyStatistics object with all computed values
#[wasm_bindgen(js_name = "aggregateYearlyStatistics")]
pub fn aggregate_yearly_statistics(
    shows: JsValue,
    entries: JsValue,
    year: i64,
) -> Result<JsValue, JsError> {
    let shows: Vec<types::DexieShow> = serde_wasm_bindgen::from_value(shows)
        .map_err(|e| JsError::new(&format!("Deserialization error for shows: {}", e)))?;
    let entries: Vec<types::DexieSetlistEntry> = serde_wasm_bindgen::from_value(entries)
        .map_err(|e| JsError::new(&format!("Deserialization error for entries: {}", e)))?;

    let result = aggregation::aggregate_yearly_statistics(&shows, &entries, year);

    serde_wasm_bindgen::to_value(&result)
        .map_err(|e| JsError::new(&format!("Serialization error: {}", e)))
}

/// Aggregate yearly statistics for all years in a single call.
///
/// More efficient than calling aggregateYearlyStatistics for each year
/// because it builds lookup structures once.
///
/// # Arguments
/// * `shows` - JavaScript array of DexieShow objects
/// * `entries` - JavaScript array of DexieSetlistEntry objects
///
/// # Returns
/// * `JsValue` - Array of YearlyStatistics objects sorted by year ascending
#[wasm_bindgen(js_name = "aggregateAllYearlyStatistics")]
pub fn aggregate_all_yearly_statistics(
    shows: JsValue,
    entries: JsValue,
) -> Result<JsValue, JsError> {
    let shows: Vec<types::DexieShow> = serde_wasm_bindgen::from_value(shows)
        .map_err(|e| JsError::new(&format!("Deserialization error for shows: {}", e)))?;
    let entries: Vec<types::DexieSetlistEntry> = serde_wasm_bindgen::from_value(entries)
        .map_err(|e| JsError::new(&format!("Deserialization error for entries: {}", e)))?;

    let result = aggregation::aggregate_all_yearly_statistics(&shows, &entries);

    serde_wasm_bindgen::to_value(&result)
        .map_err(|e| JsError::new(&format!("Serialization error: {}", e)))
}

/// Get top songs for all slot types (opener, closer, encore) in a single pass.
///
/// Reduces IndexedDB queries from 3 to 1 by computing all slot type counts
/// simultaneously. Uses BinaryHeap for O(n log k) top-K extraction.
///
/// # Arguments
/// * `entries_json` - JSON string containing array of DexieSetlistEntry objects
/// * `limit` - Maximum number of songs to return per slot type
///
/// # Returns
/// * `JsValue` - TopSlotSongsCombined object with topOpeners, topClosers, topEncores arrays
///
/// # Performance
/// Single pass O(n) + top-K extraction O(n log k) per slot type
#[wasm_bindgen(js_name = "getTopSlotSongsCombined")]
pub fn get_top_slot_songs_combined(entries_json: &str, limit: usize) -> Result<JsValue, JsError> {
    let entries: Vec<types::DexieSetlistEntry> = serde_json::from_str(entries_json)
        .map_err(|_| JsError::new("JSON parse error"))?;

    let result = aggregation::get_top_slot_songs_combined(&entries, limit);

    serde_wasm_bindgen::to_value(&result)
        .map_err(|_| JsError::new("Serialization failed"))
}

/// Get top songs for all slot types filtered by year.
///
/// Same as getTopSlotSongsCombined but filters by a specific year.
/// Pass year=0 to include all years.
///
/// # Arguments
/// * `entries_json` - JSON string containing array of DexieSetlistEntry objects
/// * `year` - The year to filter by (0 for all years)
/// * `limit` - Maximum number of songs to return per slot type
///
/// # Returns
/// * `JsValue` - TopSlotSongsCombined object with topOpeners, topClosers, topEncores arrays
#[wasm_bindgen(js_name = "getTopSlotSongsCombinedByYear")]
pub fn get_top_slot_songs_combined_by_year(
    entries_json: &str,
    year: i64,
    limit: usize,
) -> Result<JsValue, JsError> {
    let entries: Vec<types::DexieSetlistEntry> = serde_json::from_str(entries_json)
        .map_err(|_| JsError::new("JSON parse error"))?;

    let result = aggregation::get_top_slot_songs_combined_by_year(&entries, year, limit);

    serde_wasm_bindgen::to_value(&result)
        .map_err(|_| JsError::new("Serialization failed"))
}

/// Get unique show IDs for a specific song.
///
/// Filters setlist entries by song_id and returns deduplicated show IDs.
///
/// # Arguments
/// * `entries_json` - JSON string containing array of DexieSetlistEntry objects
/// * `song_id` - The song ID to get show IDs for
///
/// # Returns
/// * `JsValue` - Array of unique show IDs
#[wasm_bindgen(js_name = "getShowIdsForSong")]
pub fn get_show_ids_for_song(entries_json: &str, song_id: i64) -> Result<JsValue, JsError> {
    let entries: Vec<types::DexieSetlistEntry> = serde_json::from_str(entries_json)
        .map_err(|_| JsError::new("JSON parse error"))?;

    let result = aggregation::get_show_ids_for_song(&entries, song_id);

    serde_wasm_bindgen::to_value(&result)
        .map_err(|_| JsError::new("Serialization failed"))
}

/// Get unique show IDs for a specific guest.
///
/// Filters guest appearances by guest_id and returns deduplicated show IDs.
///
/// # Arguments
/// * `appearances_json` - JSON string containing array of DexieGuestAppearance objects
/// * `guest_id` - The guest ID to get show IDs for
///
/// # Returns
/// * `JsValue` - Array of unique show IDs
#[wasm_bindgen(js_name = "getShowIdsForGuest")]
pub fn get_show_ids_for_guest(appearances_json: &str, guest_id: i64) -> Result<JsValue, JsError> {
    let appearances: Vec<types::DexieGuestAppearance> = serde_json::from_str(appearances_json)
        .map_err(|_| JsError::new("JSON parse error"))?;

    let result = aggregation::get_show_ids_for_guest(&appearances, guest_id);

    serde_wasm_bindgen::to_value(&result)
        .map_err(|_| JsError::new("Serialization failed"))
}

// ==================== BATCH AGGREGATION API ====================

/// Compute all yearly statistics in a single WASM call.
///
/// Reduces JS/WASM boundary crossings by computing multiple statistics together:
/// show count, unique songs, unique venues, and opener/closer/encore counts.
///
/// # Arguments
/// * `shows_json` - JSON string containing array of DexieShow objects (legacy)
/// * `entries_json` - JSON string containing array of DexieSetlistEntry objects (legacy)
/// * `year` - The year to compute statistics for
///
/// # Returns
/// * `JsValue` - YearlyBatchStats object with all statistics
///
/// # Performance
/// < 20ms for typical year on full dataset
#[wasm_bindgen(js_name = "batchYearlyStats")]
pub fn batch_yearly_stats(
    shows_json: &str,
    entries_json: &str,
    year: i64,
) -> Result<JsValue, JsError> {
    let shows: Vec<types::DexieShow> = serde_json::from_str(shows_json)
        .map_err(|_| JsError::new("Failed to parse shows"))?;
    let entries: Vec<types::DexieSetlistEntry> = serde_json::from_str(entries_json)
        .map_err(|_| JsError::new("Failed to parse entries"))?;

    let stats = aggregation::compute_yearly_batch_stats(&shows, &entries, year);

    serde_wasm_bindgen::to_value(&stats)
        .map_err(|_| JsError::new("Serialization failed"))
}

/// Compute yearly statistics directly from JavaScript objects (serde-wasm-bindgen).
///
/// This is ~10x faster than the JSON string version.
///
/// # Arguments
/// * `shows` - JavaScript array of DexieShow objects
/// * `entries` - JavaScript array of DexieSetlistEntry objects
/// * `year` - The year to compute statistics for
///
/// # Returns
/// * `JsValue` - YearlyBatchStats object with all statistics
///
/// # Performance
/// < 2ms for typical year on full dataset (10x improvement)
#[wasm_bindgen(js_name = "batchYearlyStatsDirect")]
pub fn batch_yearly_stats_direct(
    shows: JsValue,
    entries: JsValue,
    year: i64,
) -> Result<JsValue, JsError> {
    let shows: Vec<types::DexieShow> = serde_wasm_bindgen::from_value(shows)
        .map_err(|e| JsError::new(&format!("Failed to deserialize shows: {}", e)))?;
    let entries: Vec<types::DexieSetlistEntry> = serde_wasm_bindgen::from_value(entries)
        .map_err(|e| JsError::new(&format!("Failed to deserialize entries: {}", e)))?;

    let stats = aggregation::compute_yearly_batch_stats(&shows, &entries, year);

    serde_wasm_bindgen::to_value(&stats)
        .map_err(|e| JsError::new(&format!("Serialization error: {}", e)))
}

/// Compute all statistics for a single song in one WASM call.
///
/// Reduces JS/WASM boundary crossings by computing multiple statistics together:
/// total plays, years played, venues, first/last dates, opener/closer/encore counts.
///
/// # Arguments
/// * `entries_json` - JSON string containing array of DexieSetlistEntry objects
/// * `shows_json` - JSON string containing array of DexieShow objects
/// * `song_id` - The song ID to compute statistics for
///
/// # Returns
/// * `JsValue` - SongBatchStats object with all statistics
///
/// # Performance
/// < 30ms for typical song on full dataset
#[wasm_bindgen(js_name = "batchSongStats")]
pub fn batch_song_stats(
    entries_json: &str,
    shows_json: &str,
    song_id: i64,
) -> Result<JsValue, JsError> {
    let entries: Vec<types::DexieSetlistEntry> = serde_json::from_str(entries_json)
        .map_err(|_| JsError::new("Failed to parse entries"))?;
    let shows: Vec<types::DexieShow> = serde_json::from_str(shows_json)
        .map_err(|_| JsError::new("Failed to parse shows"))?;

    let stats = aggregation::compute_song_batch_stats(&entries, &shows, song_id);

    serde_wasm_bindgen::to_value(&stats)
        .map_err(|_| JsError::new("Serialization failed"))
}

// ==================== SEARCH API ====================

/// Global search across songs, venues, guests, and tours.
///
/// Performs case-insensitive substring search on the `search_text` field
/// of each entity type. Results are scored by entity-specific metrics:
/// - Songs: totalPerformances
/// - Venues: totalShows
/// - Guests: totalAppearances
/// - Tours: totalShows
///
/// # Arguments
/// * `songs_json` - JSON string containing array of DexieSong objects (legacy)
/// * `venues_json` - JSON string containing array of DexieVenue objects (legacy)
/// * `guests_json` - JSON string containing array of DexieGuest objects (legacy)
/// * `tours_json` - JSON string containing array of DexieTour objects (legacy)
/// * `query` - Search query string
/// * `limit` - Maximum number of results to return
///
/// # Returns
/// * `JsValue` - Array of SearchResult objects sorted by score descending
///
/// # Performance
/// < 10ms for typical queries on full dataset
#[wasm_bindgen(js_name = "globalSearch")]
pub fn global_search(
    songs_json: &str,
    venues_json: &str,
    guests_json: &str,
    tours_json: &str,
    query: &str,
    limit: usize,
) -> Result<JsValue, JsError> {
    let songs: Vec<types::DexieSong> = serde_json::from_str(songs_json)
        .map_err(|e| JsError::new(&format!("JSON parse error for songs: {}", e)))?;

    let venues: Vec<types::DexieVenue> = serde_json::from_str(venues_json)
        .map_err(|e| JsError::new(&format!("JSON parse error for venues: {}", e)))?;

    let guests: Vec<types::DexieGuest> = serde_json::from_str(guests_json)
        .map_err(|e| JsError::new(&format!("JSON parse error for guests: {}", e)))?;


    let tours: Vec<types::DexieTour> = serde_json::from_str(tours_json)
        .map_err(|e| JsError::new(&format!("JSON parse error for tours: {}", e)))?;
    let mut results = search::global_search(&songs, &venues, &guests, &tours, query);

    // Apply limit
    results.truncate(limit);

    serde_wasm_bindgen::to_value(&results)
        .map_err(|e| JsError::new(&format!("Serialization error: {}", e)))
}

/// Global search using direct JavaScript objects (serde-wasm-bindgen).
///
/// This is ~10x faster than the JSON string version.
///
/// # Arguments
/// * `songs` - JavaScript array of DexieSong objects
/// * `venues` - JavaScript array of DexieVenue objects
/// * `guests` - JavaScript array of DexieGuest objects
/// * `tours` - JavaScript array of DexieTour objects
/// * `query` - Search query string
/// * `limit` - Maximum number of results to return
///
/// # Returns
/// * `JsValue` - Array of SearchResult objects sorted by score descending
///
/// # Performance
/// < 1ms for typical queries on full dataset (10x improvement)
#[wasm_bindgen(js_name = "globalSearchDirect")]
pub fn global_search_direct(
    songs: JsValue,
    venues: JsValue,
    guests: JsValue,
    tours: JsValue,
    query: &str,
    limit: usize,
) -> Result<JsValue, JsError> {
    let songs: Vec<types::DexieSong> = serde_wasm_bindgen::from_value(songs)
        .map_err(|e| JsError::new(&format!("Deserialization error for songs: {}", e)))?;

    let venues: Vec<types::DexieVenue> = serde_wasm_bindgen::from_value(venues)
        .map_err(|e| JsError::new(&format!("Deserialization error for venues: {}", e)))?;

    let guests: Vec<types::DexieGuest> = serde_wasm_bindgen::from_value(guests)
        .map_err(|e| JsError::new(&format!("Deserialization error for guests: {}", e)))?;

    let tours: Vec<types::DexieTour> = serde_wasm_bindgen::from_value(tours)
        .map_err(|e| JsError::new(&format!("Deserialization error for tours: {}", e)))?;

    let mut results = search::global_search(&songs, &venues, &guests, &tours, query);

    // Apply limit
    results.truncate(limit);

    serde_wasm_bindgen::to_value(&results)
        .map_err(|e| JsError::new(&format!("Serialization error: {}", e)))
}

// ==================== LIBERATION COMPUTATION API ====================

use chrono::{NaiveDate, Utc};
use std::collections::{HashMap, HashSet};

/// Liberation entry computed from songs and setlist entries.
#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ComputedLiberationEntry {
    pub song_id: i64,
    pub song_title: String,
    pub days_since: u32,
    pub shows_since: u32,
    pub last_show_id: i64,
    pub last_played_date: String,
}

/// Compute liberation list with O(n log n) complexity instead of O(n^2).
///
/// This function computes which songs have been "in the vault" the longest,
/// calculating days since last played and shows since last played for each song.
///
/// # Algorithm
/// 1. Single pass through entries to build last-play map - O(n)
/// 2. Binary search for shows_since calculation - O(log n) per song
/// 3. Sort results by days_since descending - O(m log m) where m is song count
///
/// # Arguments
/// * `songs_json` - JSON string containing array of DexieSong objects (legacy)
/// * `entries_json` - JSON string containing array of DexieSetlistEntry objects (legacy)
///
/// # Returns
/// * `JsValue` - Array of ComputedLiberationEntry objects sorted by days_since desc
///
/// # Performance
/// ~17x improvement over JavaScript implementation on Apple Silicon
#[wasm_bindgen(js_name = "computeLiberationList")]
pub fn compute_liberation_list(
    songs_json: &str,
    entries_json: &str,
) -> Result<JsValue, JsError> {
    let songs: Vec<types::DexieSong> = serde_json::from_str(songs_json)
        .map_err(|_| JsError::new("Failed to parse songs JSON"))?;
    let entries: Vec<types::DexieSetlistEntry> = serde_json::from_str(entries_json)
        .map_err(|_| JsError::new("Failed to parse entries JSON"))?;

    compute_liberation_list_internal(songs, entries)
}

/// Compute liberation list directly from JavaScript objects (serde-wasm-bindgen).
///
/// This is ~10x faster than the JSON string version.
///
/// # Arguments
/// * `songs` - JavaScript array of DexieSong objects
/// * `entries` - JavaScript array of DexieSetlistEntry objects
///
/// # Returns
/// * `JsValue` - Array of ComputedLiberationEntry objects sorted by days_since desc
///
/// # Performance
/// ~170x improvement over JavaScript implementation on Apple Silicon (10x from direct + 17x from algorithm)
#[wasm_bindgen(js_name = "computeLiberationListDirect")]
pub fn compute_liberation_list_direct(
    songs: JsValue,
    entries: JsValue,
) -> Result<JsValue, JsError> {
    let songs: Vec<types::DexieSong> = serde_wasm_bindgen::from_value(songs)
        .map_err(|e| JsError::new(&format!("Failed to deserialize songs: {}", e)))?;
    let entries: Vec<types::DexieSetlistEntry> = serde_wasm_bindgen::from_value(entries)
        .map_err(|e| JsError::new(&format!("Failed to deserialize entries: {}", e)))?;

    compute_liberation_list_internal(songs, entries)
}

/// Internal implementation for liberation list computation.
#[inline]
fn compute_liberation_list_internal(
    songs: Vec<types::DexieSong>,
    entries: Vec<types::DexieSetlistEntry>,
) -> Result<JsValue, JsError> {
    // Build last-play map in single pass - O(n)
    // Maps song_id -> (last_played_date, last_show_id)
    // PERF: Reduced string cloning - only clone on insert, update in-place
    let mut last_play: HashMap<i64, (String, i64)> = HashMap::with_capacity(songs.len());
    let mut show_dates_set: HashSet<&str> = HashSet::with_capacity(entries.len() / 20);

    for entry in &entries {
        let date = entry.show_date.as_str();
        show_dates_set.insert(date);
        last_play
            .entry(entry.song_id)
            .and_modify(|e| {
                // PERF: Compare as str, update in-place to avoid allocation
                if date > e.0.as_str() {
                    e.0.clear();
                    e.0.push_str(date);
                    e.1 = entry.show_id;
                }
            })
            .or_insert_with(|| (entry.show_date.clone(), entry.show_id));
    }

    // PERF: Convert to owned Vec only once, sort with unstable sort (faster)
    let mut dates_vec: Vec<String> = show_dates_set.into_iter().map(String::from).collect();
    dates_vec.sort_unstable();
    let now = Utc::now().date_naive();

    let mut results: Vec<ComputedLiberationEntry> = songs
        .into_iter()
        .filter_map(|song| {
            let (date, show_id) = last_play.get(&song.id)?;
            let parsed = NaiveDate::parse_from_str(date, "%Y-%m-%d").ok()?;
            let days_since = (now - parsed).num_days().max(0) as u32;

            // Binary search for shows_since - O(log n) instead of O(n)
            let shows_since = dates_vec
                .binary_search(date)
                .map(|idx| dates_vec.len() - idx - 1)
                .unwrap_or(0);

            Some(ComputedLiberationEntry {
                song_id: song.id,
                song_title: song.title.clone(),
                days_since,
                shows_since: shows_since as u32,
                last_show_id: *show_id,
                last_played_date: date.clone(),
            })
        })
        .collect();

    // Sort by days_since descending (longest time since played first)
    results.sort_by(|a, b| b.days_since.cmp(&a.days_since));

    serde_wasm_bindgen::to_value(&results)
        .map_err(|_| JsError::new("Serialization failed"))
}

// ==================== TYPED ARRAY API (ZERO-COPY TRANSFER) ====================

/// Get show IDs for a song as a TypedArray (zero-copy transfer).
///
/// Returns a BigInt64Array instead of JSON for efficient data transfer
/// without serialization overhead.
///
/// # Arguments
/// * `entries_json` - JSON string containing array of DexieSetlistEntry objects
/// * `song_id` - The song ID to get show IDs for
///
/// # Returns
/// * `BigInt64Array` - TypedArray of unique show IDs
#[wasm_bindgen(js_name = "getShowIdsForSongTyped")]
pub fn get_show_ids_for_song_typed(
    entries_json: &str,
    song_id: i64,
) -> Result<BigInt64Array, JsError> {
    let entries: Vec<types::DexieSetlistEntry> = serde_json::from_str(entries_json)
        .map_err(|_| JsError::new("Failed to parse entries"))?;

    let show_ids: Vec<i64> = entries
        .iter()
        .filter(|e| e.song_id == song_id)
        .map(|e| e.show_id)
        .collect::<std::collections::HashSet<_>>()
        .into_iter()
        .collect();

    // Create BigInt64Array from the IDs
    let array = BigInt64Array::new_with_length(show_ids.len() as u32);
    for (i, id) in show_ids.iter().enumerate() {
        array.set_index(i as u32, *id);
    }

    Ok(array)
}

/// Get song IDs played at a venue as a TypedArray.
///
/// Returns a BigInt64Array of unique song IDs for efficient data transfer.
///
/// # Arguments
/// * `entries_json` - JSON string containing array of DexieSetlistEntry objects
/// * `shows_json` - JSON string containing array of DexieShow objects
/// * `venue_id` - The venue ID to get song IDs for
///
/// # Returns
/// * `BigInt64Array` - TypedArray of unique song IDs
#[wasm_bindgen(js_name = "getSongIdsForVenueTyped")]
pub fn get_song_ids_for_venue_typed(
    entries_json: &str,
    shows_json: &str,
    venue_id: i64,
) -> Result<BigInt64Array, JsError> {
    let entries: Vec<types::DexieSetlistEntry> = serde_json::from_str(entries_json)
        .map_err(|_| JsError::new("Failed to parse entries"))?;
    let shows: Vec<types::DexieShow> = serde_json::from_str(shows_json)
        .map_err(|_| JsError::new("Failed to parse shows"))?;

    // Get show IDs for this venue
    let venue_show_ids: std::collections::HashSet<i64> = shows
        .iter()
        .filter(|s| s.venue_id == venue_id)
        .map(|s| s.id)
        .collect();

    // Get unique song IDs from those shows
    let song_ids: Vec<i64> = entries
        .iter()
        .filter(|e| venue_show_ids.contains(&e.show_id))
        .map(|e| e.song_id)
        .collect::<std::collections::HashSet<_>>()
        .into_iter()
        .collect();

    let array = BigInt64Array::new_with_length(song_ids.len() as u32);
    for (i, id) in song_ids.iter().enumerate() {
        array.set_index(i as u32, *id);
    }

    Ok(array)
}

/// Get years with shows as an Int32Array.
///
/// Returns a sorted Int32Array of unique years for efficient data transfer.
///
/// # Arguments
/// * `shows_json` - JSON string containing array of DexieShow objects
///
/// # Returns
/// * `Int32Array` - Sorted TypedArray of unique years
#[wasm_bindgen(js_name = "getYearsWithShowsTyped")]
pub fn get_years_with_shows_typed(shows_json: &str) -> Result<Int32Array, JsError> {
    let shows: Vec<types::DexieShow> = serde_json::from_str(shows_json)
        .map_err(|_| JsError::new("Failed to parse shows"))?;

    // Use the year field directly from DexieShow
    let mut years: Vec<i32> = shows
        .iter()
        .map(|s| s.year as i32)
        .collect::<std::collections::HashSet<_>>()
        .into_iter()
        .collect();

    years.sort();

    let array = Int32Array::new_with_length(years.len() as u32);
    for (i, year) in years.iter().enumerate() {
        array.set_index(i as u32, *year);
    }

    Ok(array)
}

/// Get play counts per song as parallel TypedArrays.
///
/// Returns an object with two TypedArrays: `songIds` (BigInt64Array) and
/// `counts` (Int32Array), sorted by count descending. This parallel array
/// structure enables zero-copy transfer for both IDs and counts.
///
/// # Arguments
/// * `entries_json` - JSON string containing array of DexieSetlistEntry objects
///
/// # Returns
/// * `JsValue` - Object with `songIds: BigInt64Array` and `counts: Int32Array`
#[wasm_bindgen(js_name = "getSongPlayCountsTyped")]
pub fn get_song_play_counts_typed(entries_json: &str) -> Result<JsValue, JsError> {
    let entries: Vec<types::DexieSetlistEntry> = serde_json::from_str(entries_json)
        .map_err(|_| JsError::new("Failed to parse entries"))?;

    let mut counts: std::collections::HashMap<i64, i32> = std::collections::HashMap::with_capacity(1300); // ~1,300 unique songs
    for entry in &entries {
        *counts.entry(entry.song_id).or_insert(0) += 1;
    }

    let mut pairs: Vec<(i64, i32)> = counts.into_iter().collect();
    pairs.sort_by(|a, b| b.1.cmp(&a.1)); // Sort by count descending

    let song_ids = BigInt64Array::new_with_length(pairs.len() as u32);
    let play_counts = Int32Array::new_with_length(pairs.len() as u32);

    for (i, (song_id, count)) in pairs.iter().enumerate() {
        song_ids.set_index(i as u32, *song_id);
        play_counts.set_index(i as u32, *count);
    }

    // Return as object with two typed arrays
    let result = Object::new();
    Reflect::set(&result, &"songIds".into(), &song_ids)
        .map_err(|_| JsError::new("Failed to set songIds"))?;
    Reflect::set(&result, &"counts".into(), &play_counts)
        .map_err(|_| JsError::new("Failed to set counts"))?;

    Ok(result.into())
}

// ==================== ADDITIONAL TYPED ARRAY UTILITIES ====================

/// Extract years from shows as an Int32Array (zero-copy transfer).
///
/// Returns an Int32Array containing the year for each show in input order.
/// More efficient than JSON when processing large datasets.
///
/// # Arguments
/// * `shows` - JavaScript array of DexieShow objects
///
/// # Returns
/// * `Int32Array` - Years in same order as input shows
#[wasm_bindgen(js_name = "extractShowYearsTyped")]
pub fn extract_show_years_typed(shows: JsValue) -> Result<Int32Array, JsError> {
    let shows: Vec<types::DexieShow> = serde_wasm_bindgen::from_value(shows)
        .map_err(|e| JsError::new(&format!("Deserialization error: {}", e)))?;

    let array = Int32Array::new_with_length(shows.len() as u32);
    for (i, show) in shows.iter().enumerate() {
        array.set_index(i as u32, show.year as i32);
    }

    Ok(array)
}

/// Extract song IDs from setlist entries as a BigInt64Array (zero-copy transfer).
///
/// Returns a BigInt64Array containing the song_id for each entry in input order.
/// More efficient than JSON when processing large datasets (~150K entries).
///
/// # Arguments
/// * `entries` - JavaScript array of DexieSetlistEntry objects
///
/// # Returns
/// * `BigInt64Array` - Song IDs in same order as input entries
#[wasm_bindgen(js_name = "extractSongIdsTyped")]
pub fn extract_song_ids_typed(entries: JsValue) -> Result<BigInt64Array, JsError> {
    let entries: Vec<types::DexieSetlistEntry> = serde_wasm_bindgen::from_value(entries)
        .map_err(|e| JsError::new(&format!("Deserialization error: {}", e)))?;

    let array = BigInt64Array::new_with_length(entries.len() as u32);
    for (i, entry) in entries.iter().enumerate() {
        array.set_index(i as u32, entry.song_id);
    }

    Ok(array)
}

/// Extract show IDs from setlist entries as a BigInt64Array (zero-copy transfer).
///
/// Returns a BigInt64Array containing the show_id for each entry in input order.
///
/// # Arguments
/// * `entries` - JavaScript array of DexieSetlistEntry objects
///
/// # Returns
/// * `BigInt64Array` - Show IDs in same order as input entries
#[wasm_bindgen(js_name = "extractShowIdsFromEntriesTyped")]
pub fn extract_show_ids_from_entries_typed(entries: JsValue) -> Result<BigInt64Array, JsError> {
    let entries: Vec<types::DexieSetlistEntry> = serde_wasm_bindgen::from_value(entries)
        .map_err(|e| JsError::new(&format!("Deserialization error: {}", e)))?;

    let array = BigInt64Array::new_with_length(entries.len() as u32);
    for (i, entry) in entries.iter().enumerate() {
        array.set_index(i as u32, entry.show_id);
    }

    Ok(array)
}

/// Get unique song IDs from entries as a BigInt64Array.
///
/// Returns deduplicated song IDs sorted in ascending order.
///
/// # Arguments
/// * `entries` - JavaScript array of DexieSetlistEntry objects
///
/// # Returns
/// * `BigInt64Array` - Unique song IDs sorted ascending
#[wasm_bindgen(js_name = "getUniqueSongIdsTyped")]
pub fn get_unique_song_ids_typed(entries: JsValue) -> Result<BigInt64Array, JsError> {
    let entries: Vec<types::DexieSetlistEntry> = serde_wasm_bindgen::from_value(entries)
        .map_err(|e| JsError::new(&format!("Deserialization error: {}", e)))?;

    let mut unique_ids: Vec<i64> = entries
        .iter()
        .map(|e| e.song_id)
        .collect::<std::collections::HashSet<_>>()
        .into_iter()
        .collect();

    unique_ids.sort_unstable();

    let array = BigInt64Array::new_with_length(unique_ids.len() as u32);
    for (i, id) in unique_ids.iter().enumerate() {
        array.set_index(i as u32, *id);
    }

    Ok(array)
}

/// Get unique show IDs from entries as a BigInt64Array.
///
/// Returns deduplicated show IDs sorted in ascending order.
///
/// # Arguments
/// * `entries` - JavaScript array of DexieSetlistEntry objects
///
/// # Returns
/// * `BigInt64Array` - Unique show IDs sorted ascending
#[wasm_bindgen(js_name = "getUniqueShowIdsTyped")]
pub fn get_unique_show_ids_typed(entries: JsValue) -> Result<BigInt64Array, JsError> {
    let entries: Vec<types::DexieSetlistEntry> = serde_wasm_bindgen::from_value(entries)
        .map_err(|e| JsError::new(&format!("Deserialization error: {}", e)))?;

    let mut unique_ids: Vec<i64> = entries
        .iter()
        .map(|e| e.show_id)
        .collect::<std::collections::HashSet<_>>()
        .into_iter()
        .collect();

    unique_ids.sort_unstable();

    let array = BigInt64Array::new_with_length(unique_ids.len() as u32);
    for (i, id) in unique_ids.iter().enumerate() {
        array.set_index(i as u32, *id);
    }

    Ok(array)
}

/// Compute year counts as parallel TypedArrays.
///
/// Returns an object with `years` (Int32Array) and `counts` (Int32Array)
/// sorted by year ascending. More efficient than JSON for year/count data.
///
/// # Arguments
/// * `shows` - JavaScript array of DexieShow objects
///
/// # Returns
/// * `JsValue` - Object with `years: Int32Array` and `counts: Int32Array`
#[wasm_bindgen(js_name = "computeShowCountsByYearTyped")]
pub fn compute_show_counts_by_year_typed(shows: JsValue) -> Result<JsValue, JsError> {
    let shows: Vec<types::DexieShow> = serde_wasm_bindgen::from_value(shows)
        .map_err(|e| JsError::new(&format!("Deserialization error: {}", e)))?;

    let mut counts: std::collections::HashMap<i32, i32> = std::collections::HashMap::with_capacity(40);
    for show in &shows {
        *counts.entry(show.year as i32).or_insert(0) += 1;
    }

    let mut pairs: Vec<(i32, i32)> = counts.into_iter().collect();
    pairs.sort_by_key(|p| p.0); // Sort by year ascending

    let years = Int32Array::new_with_length(pairs.len() as u32);
    let count_array = Int32Array::new_with_length(pairs.len() as u32);

    for (i, (year, count)) in pairs.iter().enumerate() {
        years.set_index(i as u32, *year);
        count_array.set_index(i as u32, *count);
    }

    let result = Object::new();
    Reflect::set(&result, &"years".into(), &years)
        .map_err(|_| JsError::new("Failed to set years"))?;
    Reflect::set(&result, &"counts".into(), &count_array)
        .map_err(|_| JsError::new("Failed to set counts"))?;

    Ok(result.into())
}

// ==================== TESTS ====================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_version() {
        assert!(!version().is_empty());
    }

    #[test]
    fn test_extract_year() {
        assert_eq!(extract_year_from_date("2024-07-15"), Some(2024));
        assert_eq!(extract_year_from_date("1991-03-14"), Some(1991));
        assert_eq!(extract_year_from_date("invalid"), None);
    }

    #[test]
    fn test_song_search_text() {
        let search = generate_song_search_text("Ants Marching", None);
        assert_eq!(search, "ants marching");

        let search = generate_song_search_text(
            "All Along the Watchtower",
            Some("Bob Dylan".to_string()),
        );
        assert_eq!(search, "all along the watchtower bob dylan");
    }

    #[test]
    fn test_venue_search_text() {
        let search = generate_venue_search_text(
            "The Gorge Amphitheatre",
            "George",
            Some("WA".to_string()),
            "USA",
        );
        assert_eq!(search, "the gorge amphitheatre george wa usa");
    }
}

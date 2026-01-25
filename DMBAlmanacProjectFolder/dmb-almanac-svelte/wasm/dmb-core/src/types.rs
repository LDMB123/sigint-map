//! Core types matching the Dexie schema for client-side IndexedDB.
//!
//! These types are designed for efficient serialization/deserialization with
//! JavaScript via serde. Field names use camelCase to match TypeScript.

use serde::{Deserialize, Serialize};

// ==================== VENUE TYPES ====================

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum VenueType {
    Amphitheater,
    Amphitheatre,
    Arena,
    Stadium,
    Theater,
    Theatre,
    Club,
    Festival,
    Outdoor,
    Cruise,
    Pavilion,
    Coliseum,
    Other,
}

/// Raw venue from server API (input for transformation)
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RawVenue {
    pub id: u32,
    pub name: String,
    pub city: String,
    pub state: Option<String>,
    pub country: String,
    pub country_code: Option<String>,
    pub venue_type: Option<String>,
    pub capacity: Option<u32>,
    pub latitude: Option<f64>,
    pub longitude: Option<f64>,
    pub total_shows: Option<u32>,
    pub first_show_date: Option<String>,
    pub last_show_date: Option<String>,
    pub notes: Option<String>,
}

/// Transformed venue for Dexie (output)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DexieVenue {
    pub id: u32,
    pub name: String,
    pub city: String,
    pub state: Option<String>,
    pub country: String,
    pub country_code: String,
    pub venue_type: Option<VenueType>,
    pub capacity: Option<u32>,
    pub latitude: Option<f64>,
    pub longitude: Option<f64>,
    pub total_shows: u32,
    pub first_show_date: Option<String>,
    pub last_show_date: Option<String>,
    pub notes: Option<String>,
    pub search_text: String,
}

// ==================== SONG TYPES ====================

/// Raw song from server API
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RawSong {
    pub id: u32,
    pub title: String,
    pub slug: String,
    pub sort_title: Option<String>,
    pub original_artist: Option<String>,
    pub is_cover: Option<bool>,
    pub is_original: Option<bool>,
    pub first_played_date: Option<String>,
    pub last_played_date: Option<String>,
    pub total_performances: Option<u32>,
    pub opener_count: Option<u32>,
    pub closer_count: Option<u32>,
    pub encore_count: Option<u32>,
    pub lyrics: Option<String>,
    pub notes: Option<String>,
    pub is_liberated: Option<bool>,
    pub days_since_last_played: Option<u32>,
    pub shows_since_last_played: Option<u32>,
}

/// Transformed song for Dexie
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DexieSong {
    pub id: u32,
    pub title: String,
    pub slug: String,
    pub sort_title: String,
    pub original_artist: Option<String>,
    pub is_cover: bool,
    pub is_original: bool,
    pub first_played_date: Option<String>,
    pub last_played_date: Option<String>,
    pub total_performances: u32,
    pub opener_count: u32,
    pub closer_count: u32,
    pub encore_count: u32,
    pub lyrics: Option<String>,
    pub notes: Option<String>,
    pub is_liberated: bool,
    pub days_since_last_played: Option<u32>,
    pub shows_since_last_played: Option<u32>,
    pub search_text: String,
}

// ==================== TOUR TYPES ====================

/// Raw tour from server API
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RawTour {
    pub id: u32,
    pub name: String,
    pub year: Option<u16>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub total_shows: Option<u32>,
    pub unique_songs_played: Option<u32>,
    pub average_songs_per_show: Option<f32>,
    pub rarity_index: Option<f32>,
}

/// Transformed tour for Dexie
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DexieTour {
    pub id: u32,
    pub name: String,
    pub year: u16,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub total_shows: u32,
    pub unique_songs_played: Option<u32>,
    pub average_songs_per_show: Option<f32>,
    pub rarity_index: Option<f32>,
}

// ==================== EMBEDDED TYPES ====================

/// Embedded venue info for denormalized show records
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EmbeddedVenue {
    pub id: u32,
    pub name: String,
    pub city: String,
    pub state: Option<String>,
    pub country: String,
    pub country_code: Option<String>,
    pub venue_type: Option<VenueType>,
    pub capacity: Option<u32>,
    pub total_shows: u32,
}

/// Embedded tour info for denormalized show records
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EmbeddedTour {
    pub id: u32,
    pub name: String,
    pub year: u16,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub total_shows: u32,
}

/// Embedded song info for setlist entries
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EmbeddedSong {
    pub id: u32,
    pub title: String,
    pub slug: String,
    pub is_cover: bool,
    pub total_performances: u32,
    pub opener_count: u32,
    pub closer_count: u32,
    pub encore_count: u32,
}

// ==================== SHOW TYPES ====================

/// Raw show from server API
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RawShow {
    pub id: u32,
    pub date: String,
    pub venue_id: Option<u32>,
    pub tour_id: Option<u32>,
    pub notes: Option<String>,
    pub soundcheck: Option<String>,
    pub attendance_count: Option<u32>,
    pub rarity_index: Option<f32>,
    pub song_count: Option<u32>,
    // Embedded objects may come from server
    pub venue: Option<RawEmbeddedVenue>,
    pub tour: Option<RawEmbeddedTour>,
}

/// Raw embedded venue (from server show response)
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RawEmbeddedVenue {
    pub id: u32,
    pub name: String,
    pub city: String,
    pub state: Option<String>,
    pub country: Option<String>,
    pub country_code: Option<String>,
    pub venue_type: Option<String>,
    pub capacity: Option<u32>,
    pub total_shows: Option<u32>,
}

/// Raw embedded tour (from server show response)
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RawEmbeddedTour {
    pub id: u32,
    pub name: String,
    pub year: Option<u16>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub total_shows: Option<u32>,
}

/// Transformed show for Dexie
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DexieShow {
    pub id: u32,
    pub date: String,
    pub venue_id: u32,
    pub tour_id: u32,
    pub notes: Option<String>,
    pub soundcheck: Option<String>,
    pub attendance_count: Option<u32>,
    pub rarity_index: Option<f32>,
    pub song_count: u32,
    pub venue: EmbeddedVenue,
    pub tour: EmbeddedTour,
    pub year: u16,
}

// ==================== SETLIST TYPES ====================

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum SetType {
    Set1,
    Set2,
    Set3,
    Encore,
    Encore2,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum SlotType {
    Opener,
    Closer,
    Standard,
}

/// Raw setlist entry from server API
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RawSetlistEntry {
    pub id: u32,
    pub show_id: u32,
    pub song_id: u32,
    pub position: u16,
    pub set_name: Option<String>,
    pub slot: Option<String>,
    pub duration_seconds: Option<u32>,
    pub segue_into_song_id: Option<u32>,
    pub is_segue: Option<bool>,
    pub is_tease: Option<bool>,
    pub tease_of_song_id: Option<u32>,
    pub notes: Option<String>,
    pub show_date: Option<String>,
    // Embedded song may come from server
    pub song: Option<RawEmbeddedSong>,
}

/// Raw embedded song (from server setlist response)
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RawEmbeddedSong {
    pub id: u32,
    pub title: String,
    pub slug: String,
    pub is_cover: Option<bool>,
    pub total_performances: Option<u32>,
    pub opener_count: Option<u32>,
    pub closer_count: Option<u32>,
    pub encore_count: Option<u32>,
}

/// Transformed setlist entry for Dexie
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DexieSetlistEntry {
    pub id: u32,
    pub show_id: u32,
    pub song_id: u32,
    pub position: u16,
    pub set_name: SetType,
    pub slot: SlotType,
    pub duration_seconds: Option<u32>,
    pub segue_into_song_id: Option<u32>,
    pub is_segue: bool,
    pub is_tease: bool,
    pub tease_of_song_id: Option<u32>,
    pub notes: Option<String>,
    pub song: EmbeddedSong,
    pub show_date: String,
    pub year: u16,
}

// ==================== GUEST TYPES ====================

/// Raw guest from server API
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RawGuest {
    pub id: u32,
    pub name: String,
    pub slug: String,
    pub instruments: Option<Vec<String>>,
    pub total_appearances: Option<u32>,
    pub first_appearance_date: Option<String>,
    pub last_appearance_date: Option<String>,
    pub notes: Option<String>,
}

/// Transformed guest for Dexie
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DexieGuest {
    pub id: u32,
    pub name: String,
    pub slug: String,
    pub instruments: Option<Vec<String>>,
    pub total_appearances: u32,
    pub first_appearance_date: Option<String>,
    pub last_appearance_date: Option<String>,
    pub notes: Option<String>,
    pub search_text: String,
}

/// Raw guest appearance from server API
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RawGuestAppearance {
    pub id: u32,
    pub guest_id: u32,
    pub show_id: u32,
    pub setlist_entry_id: Option<u32>,
    pub song_id: Option<u32>,
    pub instruments: Option<Vec<String>>,
    pub notes: Option<String>,
    pub show_date: Option<String>,
}

/// Transformed guest appearance for Dexie
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DexieGuestAppearance {
    pub id: u32,
    pub guest_id: u32,
    pub show_id: u32,
    pub setlist_entry_id: Option<u32>,
    pub song_id: Option<u32>,
    pub instruments: Option<Vec<String>>,
    pub notes: Option<String>,
    pub show_date: String,
    pub year: u16,
}

// ==================== LIBERATION TYPES ====================

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum LiberationConfiguration {
    FullBand,
    DaveTim,
    DaveSolo,
}

/// Raw liberation entry from server API
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RawLiberationEntry {
    pub id: u32,
    pub song_id: u32,
    pub last_played_date: String,
    pub last_played_show_id: u32,
    pub days_since: Option<u32>,
    pub shows_since: Option<u32>,
    pub notes: Option<String>,
    pub configuration: Option<String>,
    pub is_liberated: Option<bool>,
    pub liberated_date: Option<String>,
    pub liberated_show_id: Option<u32>,
    // Embedded objects
    pub song: Option<RawLiberationSong>,
    pub last_show: Option<RawLiberationShow>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RawLiberationSong {
    pub id: u32,
    pub title: String,
    pub slug: String,
    pub is_cover: Option<bool>,
    pub total_performances: Option<u32>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RawLiberationShow {
    pub id: u32,
    pub date: String,
    pub venue: Option<RawLiberationVenue>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RawLiberationVenue {
    pub name: String,
    pub city: String,
    pub state: Option<String>,
}

/// Embedded song info for liberation entries
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LiberationSong {
    pub id: u32,
    pub title: String,
    pub slug: String,
    pub is_cover: bool,
    pub total_performances: u32,
}

/// Embedded show info for liberation entries
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LiberationShow {
    pub id: u32,
    pub date: String,
    pub venue: LiberationVenue,
}

/// Embedded venue info for liberation entries
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LiberationVenue {
    pub name: String,
    pub city: String,
    pub state: Option<String>,
}

/// Transformed liberation entry for Dexie
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DexieLiberationEntry {
    pub id: u32,
    pub song_id: u32,
    pub last_played_date: String,
    pub last_played_show_id: u32,
    pub days_since: u32,
    pub shows_since: u32,
    pub notes: Option<String>,
    pub configuration: Option<LiberationConfiguration>,
    pub is_liberated: bool,
    pub liberated_date: Option<String>,
    pub liberated_show_id: Option<u32>,
    pub song: LiberationSong,
    pub last_show: LiberationShow,
}

// ==================== AGGREGATION RESULT TYPES ====================

/// Year count for aggregations
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct YearCount {
    pub year: u16,
    pub count: u32,
}

/// Song with count for top-N queries
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SongWithCount {
    pub song_id: u32,
    pub count: u32,
}

/// Venue statistics aggregation
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VenueStats {
    pub total_venues: u32,
    pub total_shows: u32,
    pub unique_states: u32,
    pub unique_countries: u32,
}

/// Tour statistics for a year
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TourYearStats {
    pub year: u16,
    pub show_count: u32,
    pub unique_venues: u32,
    pub unique_states: u32,
    pub unique_songs: u32,
}

// ==================== VALIDATION TYPES ====================

/// Validation warning for foreign key checks
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ValidationWarning {
    pub entity_type: String,
    pub entity_id: u32,
    pub field: String,
    pub invalid_ref: u32,
    pub message: String,
}

/// Input for foreign key validation
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ValidationInput {
    pub venue_ids: Vec<u32>,
    pub tour_ids: Vec<u32>,
    pub song_ids: Vec<u32>,
    pub show_ids: Vec<u32>,
    pub shows: Vec<ShowForValidation>,
    pub setlist_entries: Vec<SetlistEntryForValidation>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ShowForValidation {
    pub id: u32,
    pub venue_id: Option<u32>,
    pub tour_id: Option<u32>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetlistEntryForValidation {
    pub id: u32,
    pub show_id: u32,
    pub song_id: u32,
}

// ==================== SEARCH TYPES ====================

/// Search result from WASM
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchResult {
    #[serde(rename = "type")]
    pub result_type: String,
    pub id: u32,
    pub title: String,
    pub subtitle: Option<String>,
    pub slug: Option<String>,
    pub date: Option<String>,
    pub score: f32,
}

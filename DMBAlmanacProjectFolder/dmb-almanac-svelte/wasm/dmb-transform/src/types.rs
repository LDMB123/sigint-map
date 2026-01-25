//! Type definitions for DMB Almanac data transformation.
//!
//! This module defines two categories of types:
//! 1. Server types (snake_case) - Input from API/JSON
//! 2. Dexie types (camelCase) - Output for IndexedDB
//!
//! The transformation process converts from server types to Dexie types,
//! handling type coercion, denormalization, and computed field generation.

use serde::{Deserialize, Serialize};

// ==================== SERVER TYPES (INPUT) ====================

/// Server venue data (snake_case from API).
#[derive(Debug, Clone, Deserialize)]
pub struct ServerVenue {
    pub id: i64,
    pub name: String,
    pub city: String,
    pub state: Option<String>,
    pub country: String,
    pub country_code: String,
    pub venue_type: Option<String>,
    pub capacity: Option<i64>,
    pub latitude: Option<f64>,
    pub longitude: Option<f64>,
    pub total_shows: i64,
    pub first_show_date: Option<String>,
    pub last_show_date: Option<String>,
    pub notes: Option<String>,
}

/// Server song data (snake_case from API).
#[derive(Debug, Clone, Deserialize)]
pub struct ServerSong {
    pub id: i64,
    pub title: String,
    pub slug: String,
    pub sort_title: String,
    pub original_artist: Option<String>,
    /// 0 or 1 from SQLite boolean
    pub is_cover: i64,
    /// 0 or 1 from SQLite boolean
    pub is_original: i64,
    pub first_played_date: Option<String>,
    pub last_played_date: Option<String>,
    pub total_performances: i64,
    pub opener_count: i64,
    pub closer_count: i64,
    pub encore_count: i64,
    pub lyrics: Option<String>,
    pub notes: Option<String>,
    /// 0 or 1 from SQLite boolean
    #[serde(default)]
    pub is_liberated: i64,
    pub days_since_last_played: Option<i64>,
    pub shows_since_last_played: Option<i64>,
}

/// Server tour data (snake_case from API).
#[derive(Debug, Clone, Deserialize)]
pub struct ServerTour {
    pub id: i64,
    pub name: String,
    pub year: i64,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub total_shows: i64,
    pub unique_songs_played: Option<i64>,
    pub average_songs_per_show: Option<f64>,
    pub rarity_index: Option<f64>,
}

/// Server show data with embedded venue/tour info (snake_case from API).
#[derive(Debug, Clone, Deserialize)]
pub struct ServerShow {
    pub id: i64,
    pub date: String,
    pub venue_id: i64,
    pub tour_id: i64,
    pub notes: Option<String>,
    pub soundcheck: Option<String>,
    pub attendance_count: Option<i64>,
    pub rarity_index: Option<f64>,
    pub song_count: i64,
    // Embedded venue data
    pub venue_name: String,
    pub venue_city: String,
    pub venue_state: Option<String>,
    pub venue_country: String,
    pub venue_country_code: Option<String>,
    pub venue_type: Option<String>,
    pub venue_capacity: Option<i64>,
    pub venue_total_shows: i64,
    // Embedded tour data
    pub tour_name: String,
    pub tour_year: i64,
    pub tour_start_date: Option<String>,
    pub tour_end_date: Option<String>,
    pub tour_total_shows: i64,
}

/// Server setlist entry data with embedded song info (snake_case from API).
#[derive(Debug, Clone, Deserialize)]
pub struct ServerSetlistEntry {
    pub id: i64,
    pub show_id: i64,
    pub song_id: i64,
    pub position: i64,
    pub set_name: String,
    pub slot: String,
    pub duration_seconds: Option<i64>,
    pub segue_into_song_id: Option<i64>,
    /// 0 or 1 from SQLite boolean
    pub is_segue: i64,
    /// 0 or 1 from SQLite boolean
    pub is_tease: i64,
    pub tease_of_song_id: Option<i64>,
    pub notes: Option<String>,
    // Embedded song data
    pub song_title: String,
    pub song_slug: String,
    /// 0 or 1 from SQLite boolean
    pub song_is_cover: i64,
    pub song_total_performances: i64,
    pub song_opener_count: i64,
    pub song_closer_count: i64,
    pub song_encore_count: i64,
    // Denormalized show date
    pub show_date: String,
}

/// Server guest data (snake_case from API).
#[derive(Debug, Clone, Deserialize)]
pub struct ServerGuest {
    pub id: i64,
    pub name: String,
    pub slug: String,
    /// JSON array as string
    pub instruments: Option<String>,
    pub total_appearances: i64,
    pub first_appearance_date: Option<String>,
    pub last_appearance_date: Option<String>,
    pub notes: Option<String>,
}

/// Server guest appearance data (snake_case from API).
#[derive(Debug, Clone, Deserialize)]
pub struct ServerGuestAppearance {
    pub id: i64,
    pub guest_id: i64,
    pub show_id: i64,
    pub setlist_entry_id: Option<i64>,
    pub song_id: Option<i64>,
    /// JSON array as string
    pub instruments: Option<String>,
    pub notes: Option<String>,
    pub show_date: String,
}

/// Server liberation list entry (snake_case from API).
#[derive(Debug, Clone, Deserialize)]
pub struct ServerLiberationEntry {
    pub id: i64,
    pub song_id: i64,
    pub last_played_date: String,
    pub last_played_show_id: i64,
    pub days_since: i64,
    pub shows_since: i64,
    pub notes: Option<String>,
    pub configuration: Option<String>,
    /// 0 or 1 from SQLite boolean
    pub is_liberated: i64,
    pub liberated_date: Option<String>,
    pub liberated_show_id: Option<i64>,
    // Embedded song data
    pub song_title: String,
    pub song_slug: String,
    /// 0 or 1 from SQLite boolean
    pub song_is_cover: i64,
    pub song_total_performances: i64,
    // Embedded show/venue data
    pub show_date: String,
    pub venue_name: String,
    pub venue_city: String,
    pub venue_state: Option<String>,
}

/// Full sync response data from server.
#[derive(Debug, Clone, Deserialize)]
pub struct FullSyncData {
    pub version: String,
    pub timestamp: i64,
    pub data: FullSyncEntities,
}

/// All entity arrays in full sync.
#[derive(Debug, Clone, Deserialize)]
pub struct FullSyncEntities {
    pub venues: Vec<ServerVenue>,
    pub songs: Vec<ServerSong>,
    pub tours: Vec<ServerTour>,
    pub shows: Vec<ServerShow>,
    #[serde(rename = "setlistEntries")]
    pub setlist_entries: Vec<ServerSetlistEntry>,
    pub guests: Vec<ServerGuest>,
    #[serde(rename = "guestAppearances")]
    pub guest_appearances: Vec<ServerGuestAppearance>,
    #[serde(rename = "liberationList")]
    pub liberation_list: Vec<ServerLiberationEntry>,
}

// ==================== DEXIE TYPES (OUTPUT) ====================

/// Venue type enumeration.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
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

impl VenueType {
    /// Parse venue type from string.
    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "amphitheater" => Some(VenueType::Amphitheater),
            "amphitheatre" => Some(VenueType::Amphitheatre),
            "arena" => Some(VenueType::Arena),
            "stadium" => Some(VenueType::Stadium),
            "theater" => Some(VenueType::Theater),
            "theatre" => Some(VenueType::Theatre),
            "club" => Some(VenueType::Club),
            "festival" => Some(VenueType::Festival),
            "outdoor" => Some(VenueType::Outdoor),
            "cruise" => Some(VenueType::Cruise),
            "pavilion" => Some(VenueType::Pavilion),
            "coliseum" => Some(VenueType::Coliseum),
            "other" => Some(VenueType::Other),
            _ => None,
        }
    }
}

/// Set type enumeration.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum SetType {
    Set1,
    Set2,
    Set3,
    Encore,
    Encore2,
}

impl SetType {
    /// Parse set type from string.
    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "set1" => Some(SetType::Set1),
            "set2" => Some(SetType::Set2),
            "set3" => Some(SetType::Set3),
            "encore" => Some(SetType::Encore),
            "encore2" => Some(SetType::Encore2),
            _ => None,
        }
    }
}

/// Slot type enumeration.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum SlotType {
    Opener,
    Closer,
    Standard,
}

impl SlotType {
    /// Parse slot type from string.
    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "opener" => Some(SlotType::Opener),
            "closer" => Some(SlotType::Closer),
            "standard" => Some(SlotType::Standard),
            _ => None,
        }
    }
}

impl std::fmt::Display for SlotType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            SlotType::Opener => write!(f, "opener"),
            SlotType::Closer => write!(f, "closer"),
            SlotType::Standard => write!(f, "standard"),
        }
    }
}

/// Liberation configuration enumeration.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum LiberationConfiguration {
    FullBand,
    DaveTim,
    DaveSolo,
}

impl LiberationConfiguration {
    /// Parse configuration from string.
    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "full_band" => Some(LiberationConfiguration::FullBand),
            "dave_tim" => Some(LiberationConfiguration::DaveTim),
            "dave_solo" => Some(LiberationConfiguration::DaveSolo),
            _ => None,
        }
    }
}

/// Dexie venue record (camelCase for JavaScript).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DexieVenue {
    pub id: i64,
    pub name: String,
    pub city: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub state: Option<String>,
    pub country: String,
    pub country_code: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub venue_type: Option<VenueType>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub capacity: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub latitude: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub longitude: Option<f64>,
    pub total_shows: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub first_show_date: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_show_date: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub notes: Option<String>,
    /// Computed: "name city state country" lowercase
    pub search_text: String,
}

/// Dexie song record (camelCase for JavaScript).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DexieSong {
    pub id: i64,
    pub title: String,
    pub slug: String,
    pub sort_title: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub original_artist: Option<String>,
    pub is_cover: bool,
    pub is_original: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub first_played_date: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_played_date: Option<String>,
    pub total_performances: i64,
    pub opener_count: i64,
    pub closer_count: i64,
    pub encore_count: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub lyrics: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub notes: Option<String>,
    pub is_liberated: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub days_since_last_played: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub shows_since_last_played: Option<i64>,
    /// Computed: "title originalArtist" lowercase
    pub search_text: String,
}

/// Dexie tour record (camelCase for JavaScript).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DexieTour {
    pub id: i64,
    pub name: String,
    pub year: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub start_date: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub end_date: Option<String>,
    pub total_shows: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub unique_songs_played: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub average_songs_per_show: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub rarity_index: Option<f64>,
    /// Computed: "name" lowercase
    pub search_text: String,
}

/// Embedded venue info for denormalized show records.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EmbeddedVenue {
    pub id: i64,
    pub name: String,
    pub city: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub state: Option<String>,
    pub country: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub country_code: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub venue_type: Option<VenueType>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub capacity: Option<i64>,
    pub total_shows: i64,
}

/// Embedded tour info for denormalized show records.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EmbeddedTour {
    pub id: i64,
    pub name: String,
    pub year: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub start_date: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub end_date: Option<String>,
    pub total_shows: i64,
}

/// Dexie show record with embedded venue/tour (camelCase for JavaScript).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DexieShow {
    pub id: i64,
    pub date: String,
    pub venue_id: i64,
    pub tour_id: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub notes: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub soundcheck: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub attendance_count: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub rarity_index: Option<f64>,
    pub song_count: i64,
    /// Embedded venue for offline access
    pub venue: EmbeddedVenue,
    /// Embedded tour for offline access
    pub tour: EmbeddedTour,
    /// Extracted from date for filtering
    pub year: i64,
}

/// Embedded song info for setlist entries.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EmbeddedSong {
    pub id: i64,
    pub title: String,
    pub slug: String,
    pub is_cover: bool,
    pub total_performances: i64,
    pub opener_count: i64,
    pub closer_count: i64,
    pub encore_count: i64,
}

/// Dexie setlist entry record (camelCase for JavaScript).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DexieSetlistEntry {
    pub id: i64,
    pub show_id: i64,
    pub song_id: i64,
    pub position: i64,
    pub set_name: SetType,
    pub slot: SlotType,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub duration_seconds: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub segue_into_song_id: Option<i64>,
    pub is_segue: bool,
    pub is_tease: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tease_of_song_id: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub notes: Option<String>,
    /// Embedded song info
    pub song: EmbeddedSong,
    /// Denormalized from show
    pub show_date: String,
    /// For year-based filtering
    pub year: i64,
}

/// Dexie guest record (camelCase for JavaScript).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DexieGuest {
    pub id: i64,
    pub name: String,
    pub slug: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub instruments: Option<Vec<String>>,
    pub total_appearances: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub first_appearance_date: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_appearance_date: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub notes: Option<String>,
    /// Computed: "name instruments" lowercase
    pub search_text: String,
}

/// Dexie guest appearance record (camelCase for JavaScript).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DexieGuestAppearance {
    pub id: i64,
    pub guest_id: i64,
    pub show_id: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub setlist_entry_id: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub song_id: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub instruments: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub notes: Option<String>,
    pub show_date: String,
    pub year: i64,
}

/// Embedded song info for liberation entries.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LiberationSong {
    pub id: i64,
    pub title: String,
    pub slug: String,
    pub is_cover: bool,
    pub total_performances: i64,
}

/// Embedded show/venue info for liberation entries.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LiberationLastShow {
    pub id: i64,
    pub date: String,
    pub venue: LiberationVenue,
}

/// Embedded venue info for liberation entries.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LiberationVenue {
    pub name: String,
    pub city: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub state: Option<String>,
}

/// Dexie liberation entry record (camelCase for JavaScript).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DexieLiberationEntry {
    pub id: i64,
    pub song_id: i64,
    pub last_played_date: String,
    pub last_played_show_id: i64,
    pub days_since: i64,
    pub shows_since: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub notes: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub configuration: Option<LiberationConfiguration>,
    pub is_liberated: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub liberated_date: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub liberated_show_id: Option<i64>,
    /// Embedded song info
    pub song: LiberationSong,
    /// Embedded last show/venue info
    pub last_show: LiberationLastShow,
}

/// Result of full sync transformation.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TransformedSyncData {
    pub venues: Vec<DexieVenue>,
    pub songs: Vec<DexieSong>,
    pub tours: Vec<DexieTour>,
    pub shows: Vec<DexieShow>,
    pub setlist_entries: Vec<DexieSetlistEntry>,
    pub guests: Vec<DexieGuest>,
    pub guest_appearances: Vec<DexieGuestAppearance>,
    pub liberation_list: Vec<DexieLiberationEntry>,
}

/// Validation warning for foreign key issues.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ValidationWarning {
    pub entity_type: String,
    pub entity_id: i64,
    pub field: String,
    pub invalid_reference: i64,
    pub message: String,
}

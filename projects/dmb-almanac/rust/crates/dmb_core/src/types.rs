use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Venue {
    pub id: i32,
    pub name: String,
    pub city: String,
    pub state: Option<String>,
    pub country: String,
    pub country_code: Option<String>,
    pub venue_type: Option<String>,
    pub total_shows: Option<i32>,
    pub search_text: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Song {
    pub id: i32,
    pub slug: String,
    pub title: String,
    pub sort_title: Option<String>,
    pub total_performances: Option<i32>,
    pub last_played_date: Option<String>,
    pub is_liberated: Option<bool>,
    pub opener_count: Option<i32>,
    pub closer_count: Option<i32>,
    pub encore_count: Option<i32>,
    pub search_text: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Tour {
    pub id: i32,
    pub year: i32,
    pub name: String,
    pub total_shows: Option<i32>,
    pub search_text: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Show {
    pub id: i32,
    pub date: String,
    pub venue_id: i32,
    pub tour_id: Option<i32>,
    pub year: i32,
    pub song_count: Option<i32>,
    pub rarity_index: Option<f32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct SetlistEntry {
    pub id: i32,
    pub show_id: i32,
    pub song_id: i32,
    pub position: i32,
    pub set_name: Option<String>,
    pub slot: Option<String>,
    pub show_date: Option<String>,
    pub year: Option<i32>,
    pub duration_seconds: Option<i32>,
    pub segue_into_song_id: Option<i32>,
    pub is_segue: Option<bool>,
    pub is_tease: Option<bool>,
    pub tease_of_song_id: Option<i32>,
    pub notes: Option<String>,
    pub song: Option<Song>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Guest {
    pub id: i32,
    pub slug: String,
    pub name: String,
    pub total_appearances: Option<i32>,
    pub search_text: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct GuestAppearance {
    pub id: i32,
    pub guest_id: i32,
    pub show_id: i32,
    pub song_id: Option<i32>,
    pub show_date: Option<String>,
    pub year: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct LiberationEntry {
    pub id: i32,
    pub song_id: i32,
    pub days_since: Option<i32>,
    pub shows_since: Option<i32>,
    pub is_liberated: Option<bool>,
    pub last_played_date: Option<String>,
    pub last_played_show_id: Option<i32>,
    pub notes: Option<String>,
    pub configuration: Option<String>,
    pub liberated_date: Option<String>,
    pub liberated_show_id: Option<i32>,
    pub song: Option<Song>,
    pub last_show: Option<LiberationLastShow>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct SongStatistics {
    pub id: i32,
    pub song_id: i32,
    pub current_gap_days: Option<i32>,
    pub current_gap_shows: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Release {
    pub id: i32,
    pub title: String,
    pub slug: String,
    pub release_type: Option<String>,
    pub release_date: Option<String>,
    pub search_text: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ReleaseTrack {
    pub id: i32,
    pub release_id: i32,
    pub song_id: Option<i32>,
    pub show_id: Option<i32>,
    pub track_number: Option<i32>,
    pub disc_number: Option<i32>,
    pub duration_seconds: Option<i32>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct CuratedList {
    pub id: i32,
    pub original_id: Option<String>,
    pub title: String,
    pub slug: String,
    pub category: String,
    pub description: Option<String>,
    pub item_count: Option<i32>,
    pub is_featured: Option<bool>,
    pub sort_order: Option<i32>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct CuratedListItem {
    pub id: i32,
    pub list_id: i32,
    pub position: i32,
    pub item_type: String,
    pub show_id: Option<i32>,
    pub song_id: Option<i32>,
    pub venue_id: Option<i32>,
    pub guest_id: Option<i32>,
    pub release_id: Option<i32>,
    pub item_title: Option<String>,
    pub item_link: Option<String>,
    pub notes: Option<String>,
    pub metadata: Option<serde_json::Value>,
    pub created_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct LiberationLastShow {
    pub id: i32,
    pub date: Option<String>,
    pub venue: Option<LiberationVenue>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct LiberationVenue {
    pub name: Option<String>,
    pub city: Option<String>,
    pub state: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct UserAttendedShow {
    pub id: i32,
    pub show_id: i32,
    pub added_at: Option<String>,
    pub show_date: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct UserFavoriteSong {
    pub id: i32,
    pub song_id: i32,
    pub added_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct UserFavoriteVenue {
    pub id: i32,
    pub venue_id: i32,
    pub added_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct SearchResult {
    pub result_type: String,
    pub id: i32,
    pub slug: Option<String>,
    pub label: String,
    pub score: f32,
}

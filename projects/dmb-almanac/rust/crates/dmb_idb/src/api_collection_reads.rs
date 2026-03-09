use dmb_core::{
    CuratedList, CuratedListItem, Guest, LiberationEntry, Release, ReleaseTrack, SetlistEntry,
    Show, Tour, UserAttendedShow, Venue,
};
use wasm_bindgen::JsValue;

type Result<T> = std::result::Result<T, JsValue>;

pub async fn list_all<T: serde::de::DeserializeOwned>(store_name: &str) -> Result<Vec<T>> {
    crate::query_support::list_all(store_name).await
}

pub async fn list_recent_shows(limit: usize) -> Result<Vec<Show>> {
    crate::list_queries::list_recent_shows(limit).await
}

pub async fn list_top_venues(limit: usize) -> Result<Vec<Venue>> {
    crate::list_queries::list_top_venues(limit).await
}

pub async fn list_top_guests(limit: usize) -> Result<Vec<Guest>> {
    crate::list_queries::list_top_guests(limit).await
}

pub async fn list_recent_tours(limit: usize) -> Result<Vec<Tour>> {
    crate::list_queries::list_recent_tours(limit).await
}

pub async fn list_recent_releases(limit: usize) -> Result<Vec<Release>> {
    crate::list_queries::list_recent_releases(limit).await
}

pub async fn list_all_releases() -> Result<Vec<Release>> {
    crate::list_queries::list_all_releases().await
}

pub async fn list_setlist_entries(show_id: i32) -> Result<Vec<SetlistEntry>> {
    crate::list_queries::list_setlist_entries(show_id).await
}

pub async fn list_release_tracks(release_id: i32) -> Result<Vec<ReleaseTrack>> {
    crate::list_queries::list_release_tracks(release_id).await
}

pub async fn list_liberation_entries(limit: usize) -> Result<Vec<LiberationEntry>> {
    crate::list_queries::list_liberation_entries(limit).await
}

pub async fn list_curated_lists() -> Result<Vec<CuratedList>> {
    crate::list_queries::list_curated_lists().await
}

pub async fn list_curated_list_items(list_id: i32, limit: usize) -> Result<Vec<CuratedListItem>> {
    crate::list_queries::list_curated_list_items(list_id, limit).await
}

pub async fn list_user_attended_shows() -> Result<Vec<UserAttendedShow>> {
    crate::list_queries::list_user_attended_shows().await
}

use dmb_core::{Guest, Release, SearchResult, Show, Song, Tour, Venue};
use wasm_bindgen::JsValue;

type Result<T> = std::result::Result<T, JsValue>;

pub async fn count_store(store_name: &str) -> Result<u32> {
    crate::db_admin::count_store(store_name).await
}

pub async fn count_stores_with_missing(
    store_names: &[&str],
) -> Result<(Vec<(String, u32)>, Vec<String>)> {
    crate::db_admin::count_stores_with_missing(store_names).await
}

pub async fn get_show(id: i32) -> Result<Option<Show>> {
    crate::entity_lookup::get_show(id).await
}

pub async fn get_song(slug: &str) -> Result<Option<Song>> {
    crate::entity_lookup::get_song(slug).await
}

pub async fn get_song_by_id(id: i32) -> Result<Option<Song>> {
    crate::entity_lookup::get_song_by_id(id).await
}

pub async fn get_venue(id: i32) -> Result<Option<Venue>> {
    crate::entity_lookup::get_venue(id).await
}

pub async fn get_tour(year: i32) -> Result<Option<Tour>> {
    crate::entity_lookup::get_tour(year).await
}

pub async fn get_tour_by_id(id: i32) -> Result<Option<Tour>> {
    crate::entity_lookup::get_tour_by_id(id).await
}

pub async fn get_guest_by_slug(slug: &str) -> Result<Option<Guest>> {
    crate::entity_lookup::get_guest_by_slug(slug).await
}

pub async fn get_release_by_slug(slug: &str) -> Result<Option<Release>> {
    crate::entity_lookup::get_release_by_slug(slug).await
}

pub async fn search_global(query: &str) -> Result<Vec<SearchResult>> {
    crate::search_lookup::search_global(query).await
}

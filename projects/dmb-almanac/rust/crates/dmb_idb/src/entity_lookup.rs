use wasm_bindgen::JsValue;

use dmb_core::{Guest, Release, Show, Song, Tour, Venue};

#[cfg(target_arch = "wasm32")]
type Result<T> = std::result::Result<T, JsValue>;

#[cfg(target_arch = "wasm32")]
pub async fn get_show(id: i32) -> Result<Option<Show>> {
    crate::get_by_key(crate::TABLE_SHOWS, JsValue::from_f64(id as f64)).await
}

#[cfg(not(target_arch = "wasm32"))]
pub async fn get_show(_id: i32) -> Result<Option<Show>, JsValue> {
    crate::idb_fallback::idb_unavailable()
}

#[cfg(target_arch = "wasm32")]
pub async fn get_song(slug: &str) -> Result<Option<Song>> {
    crate::get_by_index_key(crate::TABLE_SONGS, "slug", JsValue::from_str(slug)).await
}

#[cfg(not(target_arch = "wasm32"))]
pub async fn get_song(_slug: &str) -> Result<Option<Song>, JsValue> {
    crate::idb_fallback::idb_unavailable()
}

#[cfg(target_arch = "wasm32")]
pub async fn get_song_by_id(id: i32) -> Result<Option<Song>> {
    crate::get_by_key(crate::TABLE_SONGS, JsValue::from_f64(id as f64)).await
}

#[cfg(not(target_arch = "wasm32"))]
pub async fn get_song_by_id(_id: i32) -> Result<Option<Song>, JsValue> {
    crate::idb_fallback::idb_unavailable()
}

#[cfg(target_arch = "wasm32")]
pub async fn get_venue(id: i32) -> Result<Option<Venue>> {
    crate::get_by_key(crate::TABLE_VENUES, JsValue::from_f64(id as f64)).await
}

#[cfg(not(target_arch = "wasm32"))]
pub async fn get_venue(_id: i32) -> Result<Option<Venue>, JsValue> {
    crate::idb_fallback::idb_unavailable()
}

#[cfg(target_arch = "wasm32")]
pub async fn get_tour(year: i32) -> Result<Option<Tour>> {
    crate::get_by_index_key(crate::TABLE_TOURS, "year", JsValue::from_f64(year as f64)).await
}

#[cfg(not(target_arch = "wasm32"))]
pub async fn get_tour(_year: i32) -> Result<Option<Tour>, JsValue> {
    crate::idb_fallback::idb_unavailable()
}

#[cfg(target_arch = "wasm32")]
pub async fn get_tour_by_id(id: i32) -> Result<Option<Tour>> {
    crate::get_by_key(crate::TABLE_TOURS, JsValue::from_f64(id as f64)).await
}

#[cfg(not(target_arch = "wasm32"))]
pub async fn get_tour_by_id(_id: i32) -> Result<Option<Tour>, JsValue> {
    crate::idb_fallback::idb_unavailable()
}

#[cfg(target_arch = "wasm32")]
pub async fn get_guest_by_slug(slug: &str) -> Result<Option<Guest>> {
    crate::get_by_index_key(crate::TABLE_GUESTS, "slug", JsValue::from_str(slug)).await
}

#[cfg(not(target_arch = "wasm32"))]
pub async fn get_guest_by_slug(_slug: &str) -> Result<Option<Guest>, JsValue> {
    crate::idb_fallback::idb_unavailable()
}

#[cfg(target_arch = "wasm32")]
pub async fn get_release_by_slug(slug: &str) -> Result<Option<Release>> {
    crate::get_by_index_key(crate::TABLE_RELEASES, "slug", JsValue::from_str(slug)).await
}

#[cfg(not(target_arch = "wasm32"))]
pub async fn get_release_by_slug(_slug: &str) -> Result<Option<Release>, JsValue> {
    crate::idb_fallback::idb_unavailable()
}

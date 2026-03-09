use wasm_bindgen::JsValue;

use dmb_core::{
    CuratedList, CuratedListItem, Guest, LiberationEntry, Release, ReleaseTrack, SetlistEntry,
    Show, Song, Tour, UserAttendedShow, Venue,
};

#[cfg(target_arch = "wasm32")]
type Result<T> = std::result::Result<T, JsValue>;

#[cfg(target_arch = "wasm32")]
pub async fn stats_top_songs(limit: usize) -> Result<Vec<Song>> {
    crate::query_support::top_by_index(crate::TABLE_SONGS, "totalPerformances", limit).await
}

#[cfg(target_arch = "wasm32")]
pub async fn stats_top_openers(limit: usize) -> Result<Vec<Song>> {
    crate::query_support::top_by_index(crate::TABLE_SONGS, "openerCount", limit).await
}

#[cfg(target_arch = "wasm32")]
pub async fn stats_top_closers(limit: usize) -> Result<Vec<Song>> {
    crate::query_support::top_by_index(crate::TABLE_SONGS, "closerCount", limit).await
}

#[cfg(target_arch = "wasm32")]
pub async fn stats_top_encores(limit: usize) -> Result<Vec<Song>> {
    crate::query_support::top_by_index(crate::TABLE_SONGS, "encoreCount", limit).await
}

#[cfg(target_arch = "wasm32")]
pub async fn list_recent_shows(limit: usize) -> Result<Vec<Show>> {
    crate::query_support::top_by_index(crate::TABLE_SHOWS, "date", limit).await
}

#[cfg(target_arch = "wasm32")]
pub async fn list_top_venues(limit: usize) -> Result<Vec<Venue>> {
    crate::query_support::top_by_index(crate::TABLE_VENUES, "totalShows", limit).await
}

#[cfg(target_arch = "wasm32")]
pub async fn list_top_guests(limit: usize) -> Result<Vec<Guest>> {
    crate::query_support::top_by_index(crate::TABLE_GUESTS, "totalAppearances", limit).await
}

#[cfg(target_arch = "wasm32")]
pub async fn list_recent_tours(limit: usize) -> Result<Vec<Tour>> {
    crate::query_support::top_by_index(crate::TABLE_TOURS, "year", limit).await
}

#[cfg(target_arch = "wasm32")]
pub async fn list_recent_releases(limit: usize) -> Result<Vec<Release>> {
    crate::query_support::top_by_index(crate::TABLE_RELEASES, "releaseDate", limit).await
}

#[cfg(target_arch = "wasm32")]
pub async fn list_all_releases() -> Result<Vec<Release>> {
    crate::query_support::list_all_by_index(
        crate::TABLE_RELEASES,
        "releaseDate",
        idb::CursorDirection::Prev,
    )
    .await
}

#[cfg(target_arch = "wasm32")]
pub async fn list_setlist_entries(show_id: i32) -> Result<Vec<SetlistEntry>> {
    let lower = crate::query_support::compound_i32_pair_key(show_id, 0);
    let upper = crate::query_support::compound_i32_pair_key(show_id, i32::MAX);
    crate::query_support::list_by_index_range(
        crate::TABLE_SETLIST_ENTRIES,
        "showId+position",
        lower,
        upper,
        None,
    )
    .await
}

#[cfg(target_arch = "wasm32")]
pub async fn list_release_tracks(release_id: i32) -> Result<Vec<ReleaseTrack>> {
    let mut tracks: Vec<ReleaseTrack> = crate::query_support::list_by_index_key(
        crate::TABLE_RELEASE_TRACKS,
        "releaseId",
        JsValue::from_f64(release_id as f64),
        None,
        idb::CursorDirection::Next,
    )
    .await?;
    tracks.sort_by(|a, b| {
        let disc_a = a.disc_number.unwrap_or(1);
        let disc_b = b.disc_number.unwrap_or(1);
        let track_a = a.track_number.unwrap_or(0);
        let track_b = b.track_number.unwrap_or(0);
        (disc_a, track_a).cmp(&(disc_b, track_b))
    });
    Ok(tracks)
}

#[cfg(target_arch = "wasm32")]
pub async fn list_liberation_entries(limit: usize) -> Result<Vec<LiberationEntry>> {
    crate::query_support::top_by_index(crate::TABLE_LIBERATION_LIST, "daysSince", limit).await
}

#[cfg(target_arch = "wasm32")]
pub async fn list_curated_lists() -> Result<Vec<CuratedList>> {
    crate::query_support::list_all(crate::TABLE_CURATED_LISTS).await
}

#[cfg(target_arch = "wasm32")]
pub async fn list_curated_list_items(list_id: i32, limit: usize) -> Result<Vec<CuratedListItem>> {
    let lower = crate::query_support::compound_i32_pair_key(list_id, i32::MIN);
    let upper = crate::query_support::compound_i32_pair_key(list_id, i32::MAX);
    crate::query_support::list_by_index_range(
        crate::TABLE_CURATED_LIST_ITEMS,
        "listId+position",
        lower,
        upper,
        Some(limit),
    )
    .await
}

#[cfg(target_arch = "wasm32")]
pub async fn list_user_attended_shows() -> Result<Vec<UserAttendedShow>> {
    crate::query_support::list_by_index_query(
        crate::TABLE_USER_ATTENDED_SHOWS,
        "showDate",
        None,
        Some(idb::CursorDirection::Prev),
        None,
    )
    .await
}

#[cfg(not(target_arch = "wasm32"))]
macro_rules! idb_unavailable_fn {
    ($name:ident ( $( $arg:ident : $arg_ty:ty ),* ) -> $ret:ty) => {
        pub async fn $name( $( $arg : $arg_ty ),* ) -> std::result::Result<$ret, JsValue> {
            crate::idb_fallback::idb_unavailable()
        }
    };
}

#[cfg(not(target_arch = "wasm32"))]
idb_unavailable_fn!(stats_top_songs(_limit: usize) -> Vec<Song>);
#[cfg(not(target_arch = "wasm32"))]
idb_unavailable_fn!(stats_top_openers(_limit: usize) -> Vec<Song>);
#[cfg(not(target_arch = "wasm32"))]
idb_unavailable_fn!(stats_top_closers(_limit: usize) -> Vec<Song>);
#[cfg(not(target_arch = "wasm32"))]
idb_unavailable_fn!(stats_top_encores(_limit: usize) -> Vec<Song>);
#[cfg(not(target_arch = "wasm32"))]
idb_unavailable_fn!(list_recent_shows(_limit: usize) -> Vec<Show>);
#[cfg(not(target_arch = "wasm32"))]
idb_unavailable_fn!(list_top_venues(_limit: usize) -> Vec<Venue>);
#[cfg(not(target_arch = "wasm32"))]
idb_unavailable_fn!(list_top_guests(_limit: usize) -> Vec<Guest>);
#[cfg(not(target_arch = "wasm32"))]
idb_unavailable_fn!(list_recent_tours(_limit: usize) -> Vec<Tour>);
#[cfg(not(target_arch = "wasm32"))]
idb_unavailable_fn!(list_recent_releases(_limit: usize) -> Vec<Release>);
#[cfg(not(target_arch = "wasm32"))]
idb_unavailable_fn!(list_all_releases() -> Vec<Release>);
#[cfg(not(target_arch = "wasm32"))]
idb_unavailable_fn!(list_setlist_entries(_show_id: i32) -> Vec<SetlistEntry>);
#[cfg(not(target_arch = "wasm32"))]
idb_unavailable_fn!(list_release_tracks(_release_id: i32) -> Vec<ReleaseTrack>);
#[cfg(not(target_arch = "wasm32"))]
idb_unavailable_fn!(list_liberation_entries(_limit: usize) -> Vec<LiberationEntry>);
#[cfg(not(target_arch = "wasm32"))]
idb_unavailable_fn!(list_curated_lists() -> Vec<CuratedList>);
#[cfg(not(target_arch = "wasm32"))]
idb_unavailable_fn!(list_curated_list_items(_list_id: i32, _limit: usize) -> Vec<CuratedListItem>);
#[cfg(not(target_arch = "wasm32"))]
idb_unavailable_fn!(list_user_attended_shows() -> Vec<UserAttendedShow>);

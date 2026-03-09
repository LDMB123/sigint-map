use wasm_bindgen::JsValue;

use dmb_core::Song;

#[cfg(target_arch = "wasm32")]
type Result<T> = std::result::Result<T, JsValue>;

#[cfg(target_arch = "wasm32")]
async fn song_debuts_by_year_from_store(store: &idb::ObjectStore) -> Result<Vec<(u32, u32)>> {
    use crate::JsResultExt;
    use js_sys::Array;
    use std::collections::BTreeMap;
    use wasm_bindgen::JsCast;

    let mut year_hist = [0u32; 60]; // 1991..=2050
    let mut overflow_counts: BTreeMap<u32, u32> = BTreeMap::new();
    let mut last_song_id: Option<i32> = None;

    let index = store.index("songId+year").js()?;
    let mut request = index
        .open_key_cursor(None, Some(idb::CursorDirection::Next))
        .js()?;
    let mut cursor_opt = request.await.js()?;
    while let Some(cursor) = cursor_opt {
        let key = cursor.key().js()?;
        let Ok(key_parts) = key.dyn_into::<Array>() else {
            request = cursor.next(None).js()?;
            cursor_opt = request.await.js()?;
            continue;
        };
        if key_parts.length() < 2 {
            request = cursor.next(None).js()?;
            cursor_opt = request.await.js()?;
            continue;
        }
        let Some(song_id_raw) = key_parts.get(0).as_f64() else {
            request = cursor.next(None).js()?;
            cursor_opt = request.await.js()?;
            continue;
        };
        let Some(year_raw) = key_parts.get(1).as_f64() else {
            request = cursor.next(None).js()?;
            cursor_opt = request.await.js()?;
            continue;
        };
        if !song_id_raw.is_finite() || !year_raw.is_finite() || year_raw < 0.0 {
            request = cursor.next(None).js()?;
            cursor_opt = request.await.js()?;
            continue;
        }

        let song_id = song_id_raw as i32;
        if last_song_id == Some(song_id) {
            request = cursor.next(None).js()?;
            cursor_opt = request.await.js()?;
            continue;
        }
        last_song_id = Some(song_id);

        let year = year_raw as u32;
        if (1991..=2050).contains(&year) {
            year_hist[(year - 1991) as usize] += 1;
        } else {
            *overflow_counts.entry(year).or_insert(0) += 1;
        }

        request = cursor.next(None).js()?;
        cursor_opt = request.await.js()?;
    }

    let mut counts: Vec<(u32, u32)> = Vec::with_capacity(
        overflow_counts.len() + year_hist.iter().filter(|count| **count > 0).count(),
    );
    for (year, count) in overflow_counts.iter().filter(|(year, _)| **year < 1991) {
        counts.push((*year, *count));
    }
    for (idx, count) in year_hist.iter().enumerate() {
        if *count > 0 {
            counts.push((1991 + idx as u32, *count));
        }
    }
    for (year, count) in overflow_counts.iter().filter(|(year, _)| **year > 2050) {
        counts.push((*year, *count));
    }
    Ok(counts)
}

#[cfg(target_arch = "wasm32")]
pub async fn stats_songs_panel_data(
    top_played_limit: usize,
    top_openers_limit: usize,
    top_closers_limit: usize,
    top_encores_limit: usize,
) -> Result<(Vec<Song>, Vec<Song>, Vec<Song>, Vec<Song>, Vec<(u32, u32)>)> {
    use crate::JsResultExt;

    let db = crate::open_db().await?;
    let tx = db
        .transaction(
            &[crate::TABLE_SONGS, crate::TABLE_SETLIST_ENTRIES],
            idb::TransactionMode::ReadOnly,
        )
        .js()?;

    let songs_store = tx.object_store(crate::TABLE_SONGS).js()?;
    let top_played = crate::panel_support::top_rows_by_index_from_store::<Song>(
        &songs_store,
        "totalPerformances",
        top_played_limit,
    )
    .await?;
    let top_openers = crate::panel_support::top_rows_by_index_from_store::<Song>(
        &songs_store,
        "openerCount",
        top_openers_limit,
    )
    .await?;
    let top_closers = crate::panel_support::top_rows_by_index_from_store::<Song>(
        &songs_store,
        "closerCount",
        top_closers_limit,
    )
    .await?;
    let top_encores = crate::panel_support::top_rows_by_index_from_store::<Song>(
        &songs_store,
        "encoreCount",
        top_encores_limit,
    )
    .await?;

    let setlist_store = tx.object_store(crate::TABLE_SETLIST_ENTRIES).js()?;
    let debuts_by_year = song_debuts_by_year_from_store(&setlist_store).await?;

    tx.await.js()?;
    Ok((
        top_played,
        top_openers,
        top_closers,
        top_encores,
        debuts_by_year,
    ))
}

#[cfg(target_arch = "wasm32")]
pub async fn stats_song_debuts_by_year() -> Result<Vec<(u32, u32)>> {
    use crate::JsResultExt;

    let db = crate::open_db().await?;
    let tx = db
        .transaction(
            &[crate::TABLE_SETLIST_ENTRIES],
            idb::TransactionMode::ReadOnly,
        )
        .js()?;
    let store = tx.object_store(crate::TABLE_SETLIST_ENTRIES).js()?;
    let counts = song_debuts_by_year_from_store(&store).await?;

    tx.await.js()?;
    Ok(counts)
}

#[cfg(not(target_arch = "wasm32"))]
type Result<T> = std::result::Result<T, JsValue>;

#[cfg(not(target_arch = "wasm32"))]
pub async fn stats_songs_panel_data(
    _top_played_limit: usize,
    _top_openers_limit: usize,
    _top_closers_limit: usize,
    _top_encores_limit: usize,
) -> Result<(Vec<Song>, Vec<Song>, Vec<Song>, Vec<Song>, Vec<(u32, u32)>)> {
    crate::idb_fallback::idb_unavailable()
}

#[cfg(not(target_arch = "wasm32"))]
pub async fn stats_song_debuts_by_year() -> Result<Vec<(u32, u32)>> {
    crate::idb_fallback::idb_unavailable()
}

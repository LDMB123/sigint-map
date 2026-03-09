use wasm_bindgen::JsValue;

use dmb_core::SearchResult;

#[cfg(target_arch = "wasm32")]
type Result<T> = std::result::Result<T, JsValue>;

#[cfg(target_arch = "wasm32")]
struct SearchQueryWindow<'a> {
    lower: &'a JsValue,
    upper: &'a JsValue,
    limit: usize,
}

#[cfg(target_arch = "wasm32")]
#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct SongSearchRow {
    id: i32,
    slug: String,
    title: String,
}

#[cfg(target_arch = "wasm32")]
#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct VenueSearchRow {
    id: i32,
    name: String,
}

#[cfg(target_arch = "wasm32")]
#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct TourSearchRow {
    year: i32,
    name: String,
}

#[cfg(target_arch = "wasm32")]
#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct GuestSearchRow {
    id: i32,
    slug: String,
    name: String,
}

#[cfg(target_arch = "wasm32")]
#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct ReleaseSearchRow {
    id: i32,
    slug: String,
    title: String,
}

#[cfg(target_arch = "wasm32")]
async fn collect_search<T: serde::de::DeserializeOwned>(
    tx: &idb::Transaction,
    store_name: &str,
    index_name: &str,
    query_window: &SearchQueryWindow<'_>,
    max_collect: usize,
    out: &mut Vec<SearchResult>,
    map_fn: impl Fn(T) -> SearchResult,
) -> Result<()> {
    if max_collect == 0 {
        return Ok(());
    }
    let store = tx
        .object_store(store_name)
        .map_err(|err| JsValue::from_str(&format!("{err:?}")))?;
    let index = store
        .index(index_name)
        .map_err(|err| JsValue::from_str(&format!("{err:?}")))?;
    let range = idb::KeyRange::bound(
        query_window.lower,
        query_window.upper,
        Some(false),
        Some(false),
    )
    .map_err(|err| JsValue::from_str(&format!("{err:?}")))?;
    let mut request = index
        .open_cursor(
            Some(idb::Query::KeyRange(range)),
            Some(idb::CursorDirection::Next),
        )
        .map_err(|err| JsValue::from_str(&format!("{err:?}")))?;
    let mut cursor_opt = request
        .await
        .map_err(|err| JsValue::from_str(&format!("{err:?}")))?;
    let max = query_window.limit.min(max_collect);
    let start_len = out.len();
    while let Some(cursor) = cursor_opt {
        let value = cursor
            .value()
            .map_err(|err| JsValue::from_str(&format!("{err:?}")))?;
        let entity: T = crate::deserialize_value(value)?;
        out.push(map_fn(entity));
        if out.len().saturating_sub(start_len) >= max {
            break;
        }
        request = cursor
            .next(None)
            .map_err(|err| JsValue::from_str(&format!("{err:?}")))?;
        cursor_opt = request
            .await
            .map_err(|err| JsValue::from_str(&format!("{err:?}")))?;
    }
    Ok(())
}

#[cfg(target_arch = "wasm32")]
pub async fn search_global(query: &str) -> Result<Vec<SearchResult>> {
    let query_norm = dmb_core::normalize_query(query);
    if query_norm.is_empty() {
        return Ok(vec![]);
    }
    const SEARCH_PER_STORE_LIMIT: usize = 50;
    const GLOBAL_SEARCH_LIMIT: usize = 100;
    let db = crate::open_db().await?;
    let search_stores = [
        crate::TABLE_SONGS,
        crate::TABLE_VENUES,
        crate::TABLE_TOURS,
        crate::TABLE_GUESTS,
        crate::TABLE_RELEASES,
    ];
    let tx = db
        .transaction(&search_stores, idb::TransactionMode::ReadOnly)
        .map_err(|err| JsValue::from_str(&format!("{err:?}")))?;
    let mut results: Vec<SearchResult> = Vec::with_capacity(GLOBAL_SEARCH_LIMIT);
    let lower = JsValue::from_str(&query_norm);
    let upper = JsValue::from_str(&format!("{}\u{FFFF}", query_norm));
    let query_window = SearchQueryWindow {
        lower: &lower,
        upper: &upper,
        limit: SEARCH_PER_STORE_LIMIT,
    };

    let mut remaining = GLOBAL_SEARCH_LIMIT;
    collect_search::<SongSearchRow>(
        &tx,
        crate::TABLE_SONGS,
        "searchText",
        &query_window,
        remaining,
        &mut results,
        |song| SearchResult {
            result_type: "song".to_string(),
            id: song.id,
            slug: Some(song.slug),
            label: song.title,
            score: 1.0,
        },
    )
    .await?;
    remaining = GLOBAL_SEARCH_LIMIT.saturating_sub(results.len());

    if remaining > 0 {
        collect_search::<VenueSearchRow>(
            &tx,
            crate::TABLE_VENUES,
            "searchText",
            &query_window,
            remaining,
            &mut results,
            |venue| SearchResult {
                result_type: "venue".to_string(),
                id: venue.id,
                slug: None,
                label: venue.name,
                score: 1.0,
            },
        )
        .await?;
        remaining = GLOBAL_SEARCH_LIMIT.saturating_sub(results.len());
    }

    if remaining > 0 {
        collect_search::<TourSearchRow>(
            &tx,
            crate::TABLE_TOURS,
            "searchText",
            &query_window,
            remaining,
            &mut results,
            |tour| SearchResult {
                result_type: "tour".to_string(),
                id: tour.year,
                slug: None,
                label: tour.name,
                score: 1.0,
            },
        )
        .await?;
        remaining = GLOBAL_SEARCH_LIMIT.saturating_sub(results.len());
    }

    if remaining > 0 {
        collect_search::<GuestSearchRow>(
            &tx,
            crate::TABLE_GUESTS,
            "searchText",
            &query_window,
            remaining,
            &mut results,
            |guest| SearchResult {
                result_type: "guest".to_string(),
                id: guest.id,
                slug: Some(guest.slug),
                label: guest.name,
                score: 1.0,
            },
        )
        .await?;
        remaining = GLOBAL_SEARCH_LIMIT.saturating_sub(results.len());
    }

    if remaining > 0 {
        collect_search::<ReleaseSearchRow>(
            &tx,
            crate::TABLE_RELEASES,
            "searchText",
            &query_window,
            remaining,
            &mut results,
            |release| SearchResult {
                result_type: "release".to_string(),
                id: release.id,
                slug: Some(release.slug),
                label: release.title,
                score: 1.0,
            },
        )
        .await?;
    }
    tx.await
        .map_err(|err| JsValue::from_str(&format!("{err:?}")))?;

    if results.len() > GLOBAL_SEARCH_LIMIT {
        results.truncate(GLOBAL_SEARCH_LIMIT);
    }
    Ok(results)
}

#[cfg(not(target_arch = "wasm32"))]
pub async fn search_global(_query: &str) -> Result<Vec<SearchResult>, JsValue> {
    crate::idb_fallback::idb_unavailable()
}

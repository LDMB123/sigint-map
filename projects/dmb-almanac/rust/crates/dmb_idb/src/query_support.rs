use wasm_bindgen::JsValue;

#[cfg(target_arch = "wasm32")]
type Result<T> = std::result::Result<T, JsValue>;

#[cfg(target_arch = "wasm32")]
pub(crate) async fn collect_cursor_values<T: serde::de::DeserializeOwned>(
    mut request: idb::request::OpenCursorStoreRequest,
    limit: Option<usize>,
) -> Result<Vec<T>> {
    use crate::JsResultExt;

    if matches!(limit, Some(0)) {
        return Ok(Vec::new());
    }
    let mut out = Vec::with_capacity(limit.unwrap_or(64));
    let mut cursor_opt = request.await.js()?;
    match limit {
        Some(max) => {
            while let Some(cursor) = cursor_opt {
                let value = cursor.value().js()?;
                let item: T = crate::deserialize_value(value)?;
                out.push(item);
                if out.len() >= max {
                    break;
                }
                request = cursor.next(None).js()?;
                cursor_opt = request.await.js()?;
            }
        }
        None => {
            while let Some(cursor) = cursor_opt {
                let value = cursor.value().js()?;
                let item: T = crate::deserialize_value(value)?;
                out.push(item);
                request = cursor.next(None).js()?;
                cursor_opt = request.await.js()?;
            }
        }
    }
    Ok(out)
}

#[cfg(target_arch = "wasm32")]
pub(crate) async fn list_by_index_query<T: serde::de::DeserializeOwned>(
    store_name: &str,
    index_name: &str,
    query: Option<idb::Query>,
    direction: Option<idb::CursorDirection>,
    limit: Option<usize>,
) -> Result<Vec<T>> {
    use crate::JsResultExt;

    let db = crate::open_db().await?;
    let tx = db
        .transaction(&[store_name], idb::TransactionMode::ReadOnly)
        .js()?;
    let store = tx.object_store(store_name).js()?;
    let index = store.index(index_name).js()?;
    let request = index.open_cursor(query, direction).js()?;
    let out = collect_cursor_values::<T>(request, limit).await?;
    tx.await.js()?;
    Ok(out)
}

#[cfg(target_arch = "wasm32")]
pub(crate) async fn list_all_by_index<T: serde::de::DeserializeOwned>(
    store_name: &str,
    index_name: &str,
    direction: idb::CursorDirection,
) -> Result<Vec<T>> {
    list_by_index_query(store_name, index_name, None, Some(direction), None).await
}

#[cfg(target_arch = "wasm32")]
pub(crate) async fn list_by_index_key<T: serde::de::DeserializeOwned>(
    store_name: &str,
    index_name: &str,
    key: JsValue,
    limit: Option<usize>,
    direction: idb::CursorDirection,
) -> Result<Vec<T>> {
    list_by_index_query(
        store_name,
        index_name,
        Some(idb::Query::Key(key)),
        Some(direction),
        limit,
    )
    .await
}

#[cfg(target_arch = "wasm32")]
pub(crate) async fn list_by_index_range<T: serde::de::DeserializeOwned>(
    store_name: &str,
    index_name: &str,
    lower: JsValue,
    upper: JsValue,
    limit: Option<usize>,
) -> Result<Vec<T>> {
    use crate::JsResultExt;

    let range = idb::KeyRange::bound(&lower, &upper, Some(false), Some(false)).js()?;
    list_by_index_query(
        store_name,
        index_name,
        Some(idb::Query::KeyRange(range)),
        Some(idb::CursorDirection::Next),
        limit,
    )
    .await
}

#[cfg(target_arch = "wasm32")]
pub(crate) fn compound_i32_pair_key(first: i32, second: i32) -> JsValue {
    let key = js_sys::Array::new_with_length(2);
    key.set(0, JsValue::from_f64(first as f64));
    key.set(1, JsValue::from_f64(second as f64));
    key.into()
}

#[cfg(target_arch = "wasm32")]
pub(crate) async fn top_by_index<T: serde::de::DeserializeOwned>(
    store_name: &str,
    index_name: &str,
    limit: usize,
) -> Result<Vec<T>> {
    list_by_index_query(
        store_name,
        index_name,
        None,
        Some(idb::CursorDirection::Prev),
        Some(limit),
    )
    .await
}

#[cfg(target_arch = "wasm32")]
pub(crate) async fn list_all<T: serde::de::DeserializeOwned>(store_name: &str) -> Result<Vec<T>> {
    use crate::JsResultExt;

    let db = crate::open_db().await?;
    let tx = db
        .transaction(&[store_name], idb::TransactionMode::ReadOnly)
        .js()?;
    let store = tx.object_store(store_name).js()?;
    let request = store
        .open_cursor(None, Some(idb::CursorDirection::Next))
        .js()?;
    let values = collect_cursor_values::<T>(request, None).await?;
    tx.await.js()?;
    Ok(values)
}

#[cfg(not(target_arch = "wasm32"))]
pub(crate) async fn list_all<T: serde::de::DeserializeOwned>(
    _store_name: &str,
) -> std::result::Result<Vec<T>, JsValue> {
    crate::idb_fallback::idb_unavailable()
}

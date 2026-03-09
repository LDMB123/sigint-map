use wasm_bindgen::JsValue;

#[cfg(target_arch = "wasm32")]
type Result<T> = std::result::Result<T, JsValue>;

#[cfg(target_arch = "wasm32")]
pub(crate) async fn count_store_in_db(db: &idb::Database, store_name: &str) -> Result<u32> {
    use crate::JsResultExt;

    let tx = db
        .transaction(&[store_name], idb::TransactionMode::ReadOnly)
        .js()?;
    let store = tx.object_store(store_name).js()?;
    let count = store.count(None).js()?.await.js()?;
    tx.await.js()?;
    Ok(count)
}

#[cfg(target_arch = "wasm32")]
pub async fn count_store(store_name: &str) -> Result<u32> {
    let db = crate::open_db().await?;
    count_store_in_db(&db, store_name).await
}

#[cfg(target_arch = "wasm32")]
pub async fn count_stores_with_missing(
    store_names: &[&str],
) -> Result<(Vec<(String, u32)>, Vec<String>)> {
    use crate::JsResultExt;

    if store_names.is_empty() {
        return Ok((Vec::new(), Vec::new()));
    }

    let db = crate::open_db().await?;
    let known_store_names: std::collections::HashSet<String> =
        db.store_names().iter().cloned().collect();
    let mut existing: Vec<&str> = Vec::with_capacity(store_names.len());
    let mut missing: Vec<String> = Vec::with_capacity(store_names.len());
    for store in store_names {
        if known_store_names.contains(*store) {
            existing.push(*store);
        } else {
            missing.push((*store).to_string());
        }
    }

    if existing.is_empty() {
        return Ok((Vec::new(), missing));
    }

    let tx = db
        .transaction(&existing, idb::TransactionMode::ReadOnly)
        .js()?;
    let mut pending_counts = Vec::with_capacity(existing.len());
    for store_name in &existing {
        let store = tx.object_store(store_name).js()?;
        let count_request = store.count(None).js()?;
        pending_counts.push((*store_name, count_request));
    }
    let mut counts = Vec::with_capacity(pending_counts.len());
    for (store_name, count_request) in pending_counts {
        let count = count_request.await.js()?;
        counts.push((store_name.to_string(), count));
    }
    tx.await.js()?;
    Ok((counts, missing))
}

#[cfg(target_arch = "wasm32")]
pub async fn delete_db() -> Result<()> {
    use crate::JsResultExt;

    let factory = idb::Factory::new().js()?;
    crate::close_cached_db();
    if let Ok(request) = factory.delete(crate::DB_NAME) {
        let _ = request.await;
    }
    Ok(())
}

#[cfg(not(target_arch = "wasm32"))]
type Result<T> = std::result::Result<T, JsValue>;

#[cfg(not(target_arch = "wasm32"))]
pub async fn count_store(_store_name: &str) -> Result<u32> {
    crate::idb_fallback::idb_unavailable()
}

#[cfg(not(target_arch = "wasm32"))]
pub async fn count_stores_with_missing(
    _store_names: &[&str],
) -> Result<(Vec<(String, u32)>, Vec<String>)> {
    crate::idb_fallback::idb_unavailable()
}

#[cfg(not(target_arch = "wasm32"))]
pub async fn delete_db() -> Result<()> {
    crate::idb_fallback::idb_unavailable()
}

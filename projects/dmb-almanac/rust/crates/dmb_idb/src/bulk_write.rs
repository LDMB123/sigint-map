use wasm_bindgen::JsValue;

use crate::{BulkPutOptions, BulkPutStats};

#[cfg(target_arch = "wasm32")]
type Result<T> = std::result::Result<T, JsValue>;

#[cfg(target_arch = "wasm32")]
fn performance_now_ms() -> f64 {
    web_sys::window()
        .and_then(|window| window.performance())
        .map(|performance| performance.now())
        .unwrap_or_else(js_sys::Date::now)
}

#[cfg(target_arch = "wasm32")]
fn normalized_tx_batch_size(batch_size: usize) -> usize {
    batch_size.max(1)
}

#[cfg(target_arch = "wasm32")]
pub(crate) async fn write_batch(
    db: &idb::Database,
    store_name: &str,
    values: &[JsValue],
) -> Result<()> {
    if values.is_empty() {
        return Ok(());
    }
    let tx_write = db
        .transaction(&[store_name], idb::TransactionMode::ReadWrite)
        .map_err(|err| JsValue::from_str(&format!("{err:?}")))?;
    let store_write = tx_write
        .object_store(store_name)
        .map_err(|err| JsValue::from_str(&format!("{err:?}")))?;
    for value in values {
        // Queue writes and rely on transaction commit to validate success.
        store_write
            .put(value, None)
            .map_err(|err| JsValue::from_str(&format!("{err:?}")))?;
    }
    tx_write
        .await
        .map_err(|err| JsValue::from_str(&format!("{err:?}")))?;
    Ok(())
}

#[cfg(target_arch = "wasm32")]
pub async fn bulk_put(store_name: &str, values: &[JsValue]) -> Result<u32> {
    if values.is_empty() {
        return Ok(0);
    }
    let tx_batch_size = normalized_tx_batch_size(BulkPutOptions::default().tx_batch_size);
    let db = crate::open_db().await?;
    let mut inserted = 0u32;
    for chunk in values.chunks(tx_batch_size) {
        write_batch(&db, store_name, chunk).await?;
        inserted = inserted.saturating_add(chunk.len() as u32);
    }
    Ok(inserted)
}

#[cfg(target_arch = "wasm32")]
pub async fn bulk_put_with_options(
    store_name: &str,
    values: &[JsValue],
    options: BulkPutOptions,
) -> Result<BulkPutStats> {
    if values.is_empty() {
        return Ok(BulkPutStats::default());
    }
    let tx_batch_size = normalized_tx_batch_size(options.tx_batch_size);
    let db = crate::open_db().await?;
    let mut stats = BulkPutStats::default();
    for chunk in values.chunks(tx_batch_size) {
        let tx_started_at = performance_now_ms();
        write_batch(&db, store_name, chunk).await?;
        let tx_elapsed_ms = (performance_now_ms() - tx_started_at).max(0.0);
        stats.max_tx_ms = stats.max_tx_ms.max(tx_elapsed_ms);
        stats.inserted = stats.inserted.saturating_add(chunk.len() as u32);
        stats.transaction_count = stats.transaction_count.saturating_add(1);
    }
    Ok(stats)
}

#[cfg(not(target_arch = "wasm32"))]
pub async fn bulk_put(_store_name: &str, _values: &[JsValue]) -> Result<u32, JsValue> {
    crate::idb_fallback::idb_unavailable()
}

#[cfg(not(target_arch = "wasm32"))]
pub async fn bulk_put_with_options(
    _store_name: &str,
    _values: &[JsValue],
    _options: BulkPutOptions,
) -> Result<BulkPutStats, JsValue> {
    crate::idb_fallback::idb_unavailable()
}

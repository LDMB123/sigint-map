use serde::{de::DeserializeOwned, Serialize};
use wasm_bindgen::JsValue;

use dmb_core::{AnnIndexMeta, EmbeddingChunk, EmbeddingManifest};

#[cfg(target_arch = "wasm32")]
type Result<T> = std::result::Result<T, JsValue>;

#[cfg(target_arch = "wasm32")]
pub async fn put_sync_meta<T: Serialize>(value: &T) -> Result<()> {
    crate::put_serialized_in_store(crate::TABLE_SYNC_META, value).await
}

#[cfg(not(target_arch = "wasm32"))]
pub async fn put_sync_meta<T: Serialize>(_value: &T) -> Result<(), JsValue> {
    crate::idb_fallback::idb_unavailable()
}

#[cfg(target_arch = "wasm32")]
pub async fn get_sync_meta<T: DeserializeOwned>(id: &str) -> Result<Option<T>> {
    crate::get_by_key(crate::TABLE_SYNC_META, JsValue::from_str(id)).await
}

#[cfg(not(target_arch = "wasm32"))]
pub async fn get_sync_meta<T: DeserializeOwned>(_id: &str) -> Result<Option<T>, JsValue> {
    crate::idb_fallback::idb_unavailable()
}

#[cfg(target_arch = "wasm32")]
pub async fn delete_sync_meta(id: &str) -> Result<()> {
    crate::delete_by_key(crate::TABLE_SYNC_META, JsValue::from_str(id)).await
}

#[cfg(not(target_arch = "wasm32"))]
pub async fn delete_sync_meta(_id: &str) -> Result<(), JsValue> {
    crate::idb_fallback::idb_unavailable()
}

#[cfg(target_arch = "wasm32")]
pub async fn clear_store(store_name: &str) -> Result<()> {
    let db = crate::open_db().await?;
    let tx = db
        .transaction(&[store_name], idb::TransactionMode::ReadWrite)
        .map_err(|err| JsValue::from_str(&format!("{err:?}")))?;
    let store = tx
        .object_store(store_name)
        .map_err(|err| JsValue::from_str(&format!("{err:?}")))?;
    let request = store
        .clear()
        .map_err(|err| JsValue::from_str(&format!("{err:?}")))?;
    request
        .await
        .map_err(|err| JsValue::from_str(&format!("{err:?}")))?;
    tx.await
        .map_err(|err| JsValue::from_str(&format!("{err:?}")))?;
    Ok(())
}

#[cfg(not(target_arch = "wasm32"))]
pub async fn clear_store(_store_name: &str) -> Result<(), JsValue> {
    crate::idb_fallback::idb_unavailable()
}

#[cfg(target_arch = "wasm32")]
pub async fn store_embedding_chunk(chunk: &EmbeddingChunk) -> Result<()> {
    crate::put_serialized_in_store(crate::TABLE_EMBEDDING_CHUNKS, chunk).await
}

#[cfg(not(target_arch = "wasm32"))]
pub async fn store_embedding_chunk(_chunk: &EmbeddingChunk) -> Result<(), JsValue> {
    crate::idb_fallback::idb_unavailable()
}

#[cfg(target_arch = "wasm32")]
pub async fn get_embedding_chunk(chunk_id: u32) -> Result<Option<EmbeddingChunk>> {
    crate::get_by_key(
        crate::TABLE_EMBEDDING_CHUNKS,
        JsValue::from_f64(chunk_id as f64),
    )
    .await
}

#[cfg(not(target_arch = "wasm32"))]
pub async fn get_embedding_chunk(_chunk_id: u32) -> Result<Option<EmbeddingChunk>, JsValue> {
    crate::idb_fallback::idb_unavailable()
}

#[cfg(target_arch = "wasm32")]
pub async fn store_embedding_manifest(manifest: &EmbeddingManifest) -> Result<()> {
    crate::put_serialized_in_store(crate::TABLE_EMBEDDING_META, manifest).await
}

#[cfg(not(target_arch = "wasm32"))]
pub async fn store_embedding_manifest(_manifest: &EmbeddingManifest) -> Result<(), JsValue> {
    crate::idb_fallback::idb_unavailable()
}

#[cfg(target_arch = "wasm32")]
pub async fn get_embedding_manifest(version: &str) -> Result<Option<EmbeddingManifest>> {
    crate::get_by_key(crate::TABLE_EMBEDDING_META, JsValue::from_str(version)).await
}

#[cfg(not(target_arch = "wasm32"))]
pub async fn get_embedding_manifest(_version: &str) -> Result<Option<EmbeddingManifest>, JsValue> {
    crate::idb_fallback::idb_unavailable()
}

#[cfg(target_arch = "wasm32")]
pub async fn store_ann_index(meta: &AnnIndexMeta) -> Result<()> {
    crate::put_serialized_in_store(crate::TABLE_ANN_INDEX, meta).await
}

#[cfg(not(target_arch = "wasm32"))]
pub async fn store_ann_index(_meta: &AnnIndexMeta) -> Result<(), JsValue> {
    crate::idb_fallback::idb_unavailable()
}

#[cfg(target_arch = "wasm32")]
pub async fn get_ann_index(id: &str) -> Result<Option<AnnIndexMeta>> {
    crate::get_by_key(crate::TABLE_ANN_INDEX, JsValue::from_str(id)).await
}

#[cfg(not(target_arch = "wasm32"))]
pub async fn get_ann_index(_id: &str) -> Result<Option<AnnIndexMeta>, JsValue> {
    crate::idb_fallback::idb_unavailable()
}

#[cfg(target_arch = "wasm32")]
pub async fn delete_ann_index(id: &str) -> Result<()> {
    crate::delete_by_key(crate::TABLE_ANN_INDEX, JsValue::from_str(id)).await
}

#[cfg(not(target_arch = "wasm32"))]
pub async fn delete_ann_index(_id: &str) -> Result<(), JsValue> {
    crate::idb_fallback::idb_unavailable()
}

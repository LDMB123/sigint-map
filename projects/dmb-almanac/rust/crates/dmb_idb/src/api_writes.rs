use serde::{Serialize, de::DeserializeOwned};

use dmb_core::{AnnIndexMeta, EmbeddingChunk, EmbeddingManifest};

use crate::{BulkPutOptions, BulkPutStats, IdbRuntimeMetrics};

cfg_if::cfg_if! {
    if #[cfg(target_arch = "wasm32")] {
        use wasm_bindgen::{prelude::wasm_bindgen, JsValue};

        type Result<T> = std::result::Result<T, JsValue>;

        pub async fn add_user_attended_show(show_id: i32, show_date: Option<String>) -> Result<()> {
            crate::attendance::add_user_attended_show(show_id, show_date).await
        }

        pub async fn remove_user_attended_show(show_id: i32) -> Result<()> {
            crate::attendance::remove_user_attended_show(show_id).await
        }

        pub async fn migrate_previous_db() -> Result<bool> {
            crate::migration_support::migrate_previous_db().await
        }

        pub async fn bulk_put(store_name: &str, values: &[JsValue]) -> Result<u32> {
            crate::bulk_write::bulk_put(store_name, values).await
        }

        pub async fn bulk_put_with_options(
            store_name: &str,
            values: &[JsValue],
            options: BulkPutOptions,
        ) -> Result<BulkPutStats> {
            crate::bulk_write::bulk_put_with_options(store_name, values, options).await
        }

        pub async fn put_sync_meta<T: Serialize>(value: &T) -> Result<()> {
            crate::store_maintenance::put_sync_meta(value).await
        }

        pub async fn get_sync_meta<T: DeserializeOwned>(id: &str) -> Result<Option<T>> {
            crate::store_maintenance::get_sync_meta(id).await
        }

        pub async fn delete_sync_meta(id: &str) -> Result<()> {
            crate::store_maintenance::delete_sync_meta(id).await
        }

        pub async fn clear_store(store_name: &str) -> Result<()> {
            crate::store_maintenance::clear_store(store_name).await
        }

        pub async fn store_embedding_chunk(chunk: &EmbeddingChunk) -> Result<()> {
            crate::store_maintenance::store_embedding_chunk(chunk).await
        }

        pub async fn get_embedding_chunk(chunk_id: u32) -> Result<Option<EmbeddingChunk>> {
            crate::store_maintenance::get_embedding_chunk(chunk_id).await
        }

        pub async fn store_embedding_manifest(manifest: &EmbeddingManifest) -> Result<()> {
            crate::store_maintenance::store_embedding_manifest(manifest).await
        }

        pub async fn get_embedding_manifest(version: &str) -> Result<Option<EmbeddingManifest>> {
            crate::store_maintenance::get_embedding_manifest(version).await
        }

        pub async fn store_ann_index(meta: &AnnIndexMeta) -> Result<()> {
            crate::store_maintenance::store_ann_index(meta).await
        }

        pub async fn get_ann_index(id: &str) -> Result<Option<AnnIndexMeta>> {
            crate::store_maintenance::get_ann_index(id).await
        }

        pub async fn delete_ann_index(id: &str) -> Result<()> {
            crate::store_maintenance::delete_ann_index(id).await
        }

        pub async fn delete_db() -> Result<()> {
            crate::db_admin::delete_db().await
        }

        #[wasm_bindgen]
        pub async fn js_open_db() -> std::result::Result<(), JsValue> {
            crate::open_db()
                .await
                .map(|_| ())
                .map_err(|e| JsValue::from_str(&format!("{e:?}")))
        }

        #[wasm_bindgen]
        pub async fn js_migrate_previous_db() -> std::result::Result<bool, JsValue> {
            migrate_previous_db()
                .await
                .map_err(|e| JsValue::from_str(&format!("{e:?}")))
        }

        pub fn idb_runtime_metrics() -> Result<IdbRuntimeMetrics> {
            crate::runtime_metrics::idb_runtime_metrics()
        }

        #[wasm_bindgen]
        pub fn js_idb_runtime_metrics() -> std::result::Result<JsValue, JsValue> {
            crate::runtime_metrics::idb_runtime_metrics_js()
        }
    } else {
        use wasm_bindgen::JsValue;

        type Result<T> = std::result::Result<T, JsValue>;

        macro_rules! idb_stub {
            ($name:ident ( $( $arg:ident : $arg_ty:ty ),* $(,)? ) -> $ret:ty) => {
                pub async fn $name( $( $arg : $arg_ty ),* ) -> Result<$ret> {
                    crate::idb_fallback::idb_unavailable()
                }
            };
        }

        pub fn idb_runtime_metrics() -> Result<IdbRuntimeMetrics> {
            crate::runtime_metrics::idb_runtime_metrics()
        }

        pub fn js_idb_runtime_metrics() -> std::result::Result<JsValue, JsValue> {
            crate::runtime_metrics::idb_runtime_metrics_js()
        }

        idb_stub!(open_db() -> ());

        pub async fn delete_db() -> Result<()> {
            crate::db_admin::delete_db().await
        }

        pub async fn add_user_attended_show(
            show_id: i32,
            show_date: Option<String>,
        ) -> Result<()> {
            crate::attendance::add_user_attended_show(show_id, show_date).await
        }

        pub async fn remove_user_attended_show(show_id: i32) -> Result<()> {
            crate::attendance::remove_user_attended_show(show_id).await
        }

        pub async fn bulk_put(store_name: &str, values: &[JsValue]) -> Result<u32> {
            crate::bulk_write::bulk_put(store_name, values).await
        }

        pub async fn bulk_put_with_options(
            store_name: &str,
            values: &[JsValue],
            options: BulkPutOptions,
        ) -> Result<BulkPutStats> {
            crate::bulk_write::bulk_put_with_options(store_name, values, options).await
        }

        pub async fn migrate_previous_db() -> Result<bool> {
            crate::migration_support::migrate_previous_db().await
        }

        pub async fn put_sync_meta<T: Serialize>(value: &T) -> Result<()> {
            crate::store_maintenance::put_sync_meta(value).await
        }

        pub async fn get_sync_meta<T: DeserializeOwned>(id: &str) -> Result<Option<T>> {
            crate::store_maintenance::get_sync_meta(id).await
        }

        pub async fn delete_sync_meta(id: &str) -> Result<()> {
            crate::store_maintenance::delete_sync_meta(id).await
        }

        pub async fn clear_store(store_name: &str) -> Result<()> {
            crate::store_maintenance::clear_store(store_name).await
        }

        pub async fn store_embedding_chunk(chunk: &EmbeddingChunk) -> Result<()> {
            crate::store_maintenance::store_embedding_chunk(chunk).await
        }

        pub async fn get_embedding_chunk(chunk_id: u32) -> Result<Option<EmbeddingChunk>> {
            crate::store_maintenance::get_embedding_chunk(chunk_id).await
        }

        pub async fn store_embedding_manifest(manifest: &EmbeddingManifest) -> Result<()> {
            crate::store_maintenance::store_embedding_manifest(manifest).await
        }

        pub async fn get_embedding_manifest(version: &str) -> Result<Option<EmbeddingManifest>> {
            crate::store_maintenance::get_embedding_manifest(version).await
        }

        pub async fn store_ann_index(meta: &AnnIndexMeta) -> Result<()> {
            crate::store_maintenance::store_ann_index(meta).await
        }

        pub async fn get_ann_index(id: &str) -> Result<Option<AnnIndexMeta>> {
            crate::store_maintenance::get_ann_index(id).await
        }

        pub async fn delete_ann_index(id: &str) -> Result<()> {
            crate::store_maintenance::delete_ann_index(id).await
        }
    }
}

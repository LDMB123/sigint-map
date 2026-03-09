#[cfg_attr(not(feature = "hydrate"), allow(unused_imports))]
use super::*;
#[cfg(feature = "hydrate")]
use futures::channel::oneshot;
#[cfg(feature = "hydrate")]
use js_sys::Array;
#[cfg(feature = "hydrate")]
use leptos::prelude::RwSignal;
#[cfg(feature = "hydrate")]
use leptos::task::spawn_local;
#[cfg(feature = "hydrate")]
use wasm_bindgen::JsValue;

#[path = "data_import_execution_adaptive.rs"]
mod adaptive;
#[path = "data_import_execution_fixed.rs"]
mod fixed;

#[cfg(feature = "hydrate")]
pub(super) type PrefetchedJsonArray = oneshot::Receiver<Result<Array, JsValue>>;

#[cfg(feature = "hydrate")]
fn refill_chunk_buffer(values: &Array, start: usize, end: usize, chunk: &mut Vec<JsValue>) {
    chunk.clear();
    let needed = end.saturating_sub(start);
    if chunk.capacity() < needed {
        chunk.reserve(needed - chunk.capacity());
    }
    for index in start..end {
        chunk.push(values.get(index as u32));
    }
}

#[cfg(feature = "hydrate")]
pub(super) fn prefetch_json_array(url: String) -> PrefetchedJsonArray {
    let (tx, rx) = oneshot::channel();
    spawn_local(async move {
        let _ = tx.send(fetch_json_array(&url).await);
    });
    rx
}

#[cfg(feature = "hydrate")]
pub(super) async fn take_prefetched_json_array(
    prefetched_values: Option<PrefetchedJsonArray>,
    url: &str,
) -> Result<Array, JsValue> {
    match prefetched_values {
        Some(receiver) => match receiver.await {
            Ok(result) => result,
            Err(_) => fetch_json_array(url).await,
        },
        None => fetch_json_array(url).await,
    }
}

#[cfg(feature = "hydrate")]
pub(crate) async fn import_work_items_with_resume(
    status: RwSignal<ImportStatus>,
    manifest_version: &str,
    import_work: &[ImportWorkItem],
    resume_file_index: usize,
    resume_chunk_index: usize,
    metrics: &mut ImportRunMetrics,
) -> Result<(), ImportStatus> {
    fixed::import_work_items_with_resume(
        status,
        manifest_version,
        import_work,
        resume_file_index,
        resume_chunk_index,
        metrics,
    )
    .await
}

#[cfg(feature = "hydrate")]
pub(crate) async fn import_work_items_with_adaptive_resume(
    status: RwSignal<ImportStatus>,
    manifest_version: &str,
    import_work: &[ImportWorkItem],
    resume_file_index: usize,
    resume_chunk_index: usize,
    resume_record_offset: Option<usize>,
    metrics: &mut ImportRunMetrics,
) -> Result<(), ImportStatus> {
    adaptive::import_work_items_with_adaptive_resume(
        status,
        manifest_version,
        import_work,
        resume_file_index,
        resume_chunk_index,
        resume_record_offset,
        metrics,
    )
    .await
}

#[cfg(feature = "hydrate")]
pub(crate) async fn persist_import_completion(manifest: &DataManifest, total_work_items: usize) {
    let manifest_version = manifest.version.clone();
    let marker = ImportMarker {
        id: IMPORT_MARKER_ID.to_string(),
        manifest_version: manifest_version.clone(),
        imported_at: js_sys::Date::new_0().to_string().into(),
        record_counts: manifest.record_counts_map(),
    };
    let _ = dmb_idb::put_sync_meta(&marker).await;

    let checkpoint = ImportCheckpoint {
        id: IMPORT_CHECKPOINT_ID.to_string(),
        manifest_version,
        file_index: total_work_items,
        chunk_index: 0,
        record_offset: None,
        total_files: total_work_items,
        chunk_total: 0,
        updated_at: js_sys::Date::new_0().to_string().into(),
        completed: true,
    };
    let _ = dmb_idb::put_sync_meta(&checkpoint).await;
}

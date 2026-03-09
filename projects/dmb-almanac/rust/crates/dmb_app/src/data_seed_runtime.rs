use super::*;
#[path = "data_seed_lifecycle.rs"]
mod lifecycle;
#[path = "data_seed_status.rs"]
mod status;

#[cfg(feature = "hydrate")]
use js_sys::Array;
use leptos::prelude::RwSignal;
#[cfg(feature = "hydrate")]
use leptos::prelude::Set;
#[cfg(feature = "hydrate")]
use wasm_bindgen::JsValue;

pub use lifecycle::detect_seed_data_state;
#[cfg(feature = "hydrate")]
pub(crate) use lifecycle::{
    check_existing_manifest_integrity, load_resume_position, load_seed_manifest,
    migrate_previous_version_data,
};
#[cfg(feature = "hydrate")]
pub(crate) use status::IMPORT_SPECS;
#[cfg(feature = "hydrate")]
pub(crate) use status::{
    build_import_work_items, import_error_status, set_import_progress,
    set_import_progress_with_tuning, set_import_ready,
};

#[cfg(feature = "hydrate")]
pub(crate) async fn fetch_json_array(url: &str) -> Result<Array, JsValue> {
    crate::browser::http::fetch_json_array(url).await
}

pub const STORAGE_PRESSURE_THRESHOLD: f64 = 0.85;

#[cfg(feature = "hydrate")]
const AI_CACHE_PATHS: [&str; 4] = [
    "/data/ann-index.bin",
    "/data/ann-index.json",
    "/data/ann-index.ivf.json",
    "/data/embedding-manifest.json",
];

#[cfg(feature = "hydrate")]
pub async fn ensure_seed_data(status: RwSignal<ImportStatus>) {
    clear_parity_diagnostics_cache();
    set_import_progress(status, "Checking offline data…", 0.0);
    migrate_previous_version_data(status).await;
    let tuning_enabled = import_tuning_enabled();
    let strategy = if tuning_enabled { "adaptive" } else { "fixed" };

    let Some((manifest, dry_run)) = load_seed_manifest(status).await else {
        let err_status = import_error_status(
            "Offline manifest missing".to_string(),
            0.0,
            "Missing /data/manifest.json".to_string(),
        );
        status.set(err_status.clone());
        publish_import_run_snapshot(&ImportRunMetrics::new(strategy, 0).finish(
            None,
            false,
            Some("Missing /data/manifest.json".to_string()),
            err_status.error,
            None,
        ));
        return;
    };

    if check_existing_manifest_integrity(status, &manifest, dry_run.as_ref()).await {
        return;
    }

    let import_work = build_import_work_items(&manifest);
    if let Err(preflight_failure) = validate_import_preflight(&manifest, &import_work) {
        let err_status = import_error_status(
            "Offline import preflight failed".to_string(),
            0.0,
            preflight_failure.clone(),
        );
        status.set(err_status.clone());
        publish_import_run_snapshot(&ImportRunMetrics::new(strategy, import_work.len()).finish(
            Some(manifest.version.clone()),
            false,
            Some(preflight_failure),
            err_status.error,
            None,
        ));
        return;
    }
    let total_work_items = import_work.len();
    let (resume_file_index, resume_chunk_index, resume_record_offset) =
        load_resume_position(&manifest, total_work_items).await;
    crate::browser::perf::ensure_perf_observers_started();
    let mut metrics = ImportRunMetrics::new(strategy, total_work_items);

    let import_result = if tuning_enabled {
        import_work_items_with_adaptive_resume(
            status,
            &manifest.version,
            &import_work,
            resume_file_index,
            resume_chunk_index,
            resume_record_offset,
            &mut metrics,
        )
        .await
    } else {
        import_work_items_with_resume(
            status,
            &manifest.version,
            &import_work,
            resume_file_index,
            resume_chunk_index,
            &mut metrics,
        )
        .await
    };

    if let Err(err_status) = import_result {
        let failure = err_status
            .error
            .clone()
            .unwrap_or_else(|| err_status.message.clone());
        status.set(err_status);
        publish_import_run_snapshot(&metrics.finish(
            Some(manifest.version.clone()),
            false,
            None,
            Some(failure),
            crate::browser::service_worker::count_all_cache_entries().await,
        ));
        return;
    }

    persist_import_completion(&manifest, total_work_items).await;

    if let Some(mismatches) = verify_import_integrity(&manifest, dry_run.as_ref()).await {
        if !mismatches.is_empty() {
            status.set(integrity_failure_status(&mismatches));
            publish_import_run_snapshot(&metrics.finish(
                Some(manifest.version.clone()),
                false,
                None,
                Some(format!(
                    "integrity check failed for {} stores",
                    mismatches.len()
                )),
                crate::browser::service_worker::count_all_cache_entries().await,
            ));
            return;
        }
    }

    set_import_ready(status);
    crate::browser::perf::mark_startup_metric("offline_ready_at_ms");
    publish_import_run_snapshot(&metrics.finish(
        Some(manifest.version.clone()),
        true,
        None,
        None,
        crate::browser::service_worker::count_all_cache_entries().await,
    ));
}

#[cfg(not(feature = "hydrate"))]
#[allow(clippy::unused_async)]
pub async fn ensure_seed_data(_status: RwSignal<ImportStatus>) {}

#[cfg(feature = "hydrate")]
pub async fn estimate_storage() -> Option<StorageInfo> {
    let (usage, quota) = crate::browser::storage::estimate_usage_quota().await?;
    Some(StorageInfo { usage, quota })
}

#[cfg(feature = "hydrate")]
pub async fn handle_storage_pressure() -> Option<bool> {
    let info = estimate_storage().await?;
    let usage = info.usage.unwrap_or(0.0);
    let quota = info.quota.unwrap_or(0.0);
    if quota <= 0.0 {
        return Some(false);
    }
    let ratio = usage / quota;
    if ratio < STORAGE_PRESSURE_THRESHOLD {
        return Some(false);
    }

    let _ = crate::browser::service_worker::delete_paths_from_data_caches(&AI_CACHE_PATHS).await;

    let _ = dmb_idb::delete_ann_index("default").await;
    Some(true)
}

#[cfg(not(feature = "hydrate"))]
#[allow(clippy::unused_async)]
pub async fn estimate_storage() -> Option<StorageInfo> {
    None
}

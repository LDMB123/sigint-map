#[cfg(feature = "hydrate")]
use super::set_import_ready;
use crate::data::SeedDataState;
#[cfg(feature = "hydrate")]
use crate::data::{
    DataManifest, DryRunReport, IMPORT_CHECKPOINT_ID, IMPORT_MARKER_ID, IMPORT_SPECS,
    ImportCheckpoint, ImportMarker, ImportStatus, fetch_json, import_error_status,
    set_import_progress, verify_import_integrity,
};
#[cfg(feature = "hydrate")]
use leptos::prelude::RwSignal;
#[cfg(feature = "hydrate")]
use leptos::prelude::Set;
#[cfg(feature = "hydrate")]
use wasm_bindgen::JsValue;

#[cfg(feature = "hydrate")]
pub async fn detect_seed_data_state() -> SeedDataState {
    if dmb_idb::get_sync_meta::<ImportMarker>(IMPORT_MARKER_ID)
        .await
        .ok()
        .flatten()
        .is_some()
    {
        return SeedDataState::Ready;
    }

    if let Ok(Some(checkpoint)) =
        dmb_idb::get_sync_meta::<ImportCheckpoint>(IMPORT_CHECKPOINT_ID).await
    {
        if checkpoint.completed {
            return SeedDataState::Ready;
        }
        return SeedDataState::Importing;
    }

    SeedDataState::Importing
}

#[cfg(not(feature = "hydrate"))]
#[allow(clippy::unused_async)]
pub async fn detect_seed_data_state() -> SeedDataState {
    SeedDataState::Ready
}

#[cfg(feature = "hydrate")]
pub(crate) async fn migrate_previous_version_data(status: RwSignal<ImportStatus>) {
    set_import_progress(status, "Checking previous-version data…", 0.0);
    match dmb_idb::migrate_previous_db().await {
        Ok(true) => set_import_progress(status, "Migrated previous-version data", 0.05),
        Ok(false) => {}
        Err(err) => {
            set_import_progress(
                status,
                "Previous-version migration failed; proceeding with fresh import",
                0.05,
            );
            web_sys::console::warn_1(&JsValue::from_str(&format!(
                "previous-version migration failed: {err:?}"
            )));
        }
    }
}

#[cfg(feature = "hydrate")]
pub(crate) async fn load_seed_manifest(
    status: RwSignal<ImportStatus>,
) -> Option<(DataManifest, Option<DryRunReport>)> {
    let (manifest_opt, dry_run) = futures::future::join(
        fetch_json::<DataManifest>("/data/manifest.json"),
        fetch_json::<DryRunReport>("/data/idb-migration-dry-run.json"),
    )
    .await;
    let manifest = manifest_opt?;
    if manifest.version.is_empty() {
        status.set(import_error_status(
            "Offline manifest missing".to_string(),
            0.0,
            "Missing /data/manifest.json".to_string(),
        ));
        return None;
    }
    Some((manifest, dry_run))
}

#[cfg(feature = "hydrate")]
pub(crate) async fn clear_seed_stores_for_repair() {
    for spec in IMPORT_SPECS {
        if let Err(err) = dmb_idb::clear_store(spec.store).await {
            tracing::warn!(
                store = spec.store,
                error = ?err,
                "failed to clear store during repair"
            );
        }
    }
    let _ = dmb_idb::delete_sync_meta(IMPORT_MARKER_ID).await;
    let _ = dmb_idb::delete_sync_meta(IMPORT_CHECKPOINT_ID).await;
}

#[cfg(feature = "hydrate")]
pub(crate) async fn check_existing_manifest_integrity(
    status: RwSignal<ImportStatus>,
    manifest: &DataManifest,
    dry_run: Option<&DryRunReport>,
) -> bool {
    let Ok(Some(marker)) = dmb_idb::get_sync_meta::<ImportMarker>(IMPORT_MARKER_ID).await else {
        return false;
    };
    if marker.manifest_version != manifest.version {
        return false;
    }

    if let Some(mismatches) = verify_import_integrity(manifest, dry_run).await {
        if mismatches.is_empty() {
            set_import_ready(status);
            return true;
        }
        tracing::warn!(
            mismatch_count = mismatches.len(),
            "integrity check failed for current manifest; clearing seed stores and reimporting"
        );
        set_import_progress(
            status,
            "Offline data integrity check failed; repairing…",
            0.02,
        );
        clear_seed_stores_for_repair().await;
        return false;
    }

    set_import_ready(status);
    true
}

#[cfg(feature = "hydrate")]
pub(crate) async fn load_resume_position(
    manifest: &DataManifest,
    total_work_items: usize,
) -> (usize, usize, Option<usize>) {
    let Ok(Some(checkpoint)) =
        dmb_idb::get_sync_meta::<ImportCheckpoint>(IMPORT_CHECKPOINT_ID).await
    else {
        return (0, 0, None);
    };
    if checkpoint.manifest_version != manifest.version || checkpoint.completed {
        return (0, 0, None);
    }
    (
        checkpoint.file_index.min(total_work_items),
        checkpoint.chunk_index,
        checkpoint.record_offset,
    )
}

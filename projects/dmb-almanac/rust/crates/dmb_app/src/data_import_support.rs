#[cfg(feature = "hydrate")]
use super::ImportRunMetrics;
#[cfg(feature = "hydrate")]
use serde::{Deserialize, Serialize};
#[cfg(feature = "hydrate")]
use std::collections::HashMap;

#[cfg(feature = "hydrate")]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ImportMarker {
    pub(crate) id: String,
    pub(crate) manifest_version: String,
    pub(crate) imported_at: String,
    pub(crate) record_counts: HashMap<String, u64>,
}

#[cfg(feature = "hydrate")]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ImportCheckpoint {
    pub(crate) id: String,
    pub(crate) manifest_version: String,
    pub(crate) file_index: usize,
    pub(crate) chunk_index: usize,
    #[serde(default)]
    pub(crate) record_offset: Option<usize>,
    pub(crate) total_files: usize,
    pub(crate) chunk_total: usize,
    pub(crate) updated_at: String,
    pub(crate) completed: bool,
}

#[cfg(feature = "hydrate")]
pub(crate) struct ImportSpec {
    pub(crate) file: &'static str,
    pub(crate) store: &'static str,
    pub(crate) chunk_prefix: Option<&'static str>,
}

#[cfg(feature = "hydrate")]
#[derive(Debug, Clone)]
pub(crate) struct ImportWorkItem {
    pub(crate) label: String,
    pub(crate) url: String,
    pub(crate) store: &'static str,
    pub(crate) prechunked: bool,
}

#[cfg(feature = "hydrate")]
pub(crate) struct ImportWorkContext<'a> {
    pub(crate) manifest_version: &'a str,
    pub(crate) file_index: usize,
    pub(crate) total_work_items: usize,
    pub(crate) total_files: f32,
}

#[cfg(feature = "hydrate")]
pub(crate) const IMPORT_MARKER_ID: &str = "data_import_v1";
#[cfg(feature = "hydrate")]
pub(crate) const IMPORT_CHECKPOINT_ID: &str = "data_import_checkpoint_v1";
#[cfg(feature = "hydrate")]
pub const IMPORT_TUNING_FLAG_KEY: &str = "pwa_import_tuning_v2";
#[cfg(feature = "hydrate")]
pub(crate) const DEFAULT_IMPORT_CHUNK_SIZE: usize = 1000;
#[cfg(feature = "hydrate")]
pub(crate) const LARGE_IMPORT_CHUNK_SIZE: usize = 10_000;
#[cfg(feature = "hydrate")]
pub(crate) const LARGE_IMPORT_RECORD_THRESHOLD: usize = 20_000;
#[cfg(feature = "hydrate")]
pub(crate) const CHECKPOINT_INTERVAL_MS: f64 = 5_000.0;
#[cfg(feature = "hydrate")]
pub(crate) const ADAPTIVE_CHUNK_RECORDS_START: usize = 2_000;
#[cfg(feature = "hydrate")]
pub(crate) const ADAPTIVE_TX_BATCH_START: usize = LARGE_IMPORT_CHUNK_SIZE;
#[cfg(feature = "hydrate")]
pub(crate) const ADAPTIVE_CHUNK_RECORDS_MIN: usize = 250;
#[cfg(feature = "hydrate")]
pub(crate) const ADAPTIVE_CHUNK_RECORDS_MAX: usize = LARGE_IMPORT_CHUNK_SIZE;
#[cfg(feature = "hydrate")]
pub(crate) const ADAPTIVE_TX_BATCH_MIN: usize = 128;
#[cfg(feature = "hydrate")]
pub(crate) const ADAPTIVE_TX_BATCH_MAX: usize = LARGE_IMPORT_CHUNK_SIZE;
#[cfg(feature = "hydrate")]
pub(crate) const ADAPTIVE_TARGET_CHUNK_MS: f64 = 90.0;
#[cfg(feature = "hydrate")]
pub(crate) const ADAPTIVE_SLOW_CHUNK_MS: f64 = 140.0;
#[cfg(feature = "hydrate")]
pub(crate) const ADAPTIVE_FAST_CHUNK_MS: f64 = 50.0;
#[cfg(feature = "hydrate")]
pub(crate) const ADAPTIVE_FAST_STREAK_REQUIRED: usize = 2;
#[cfg(feature = "hydrate")]
pub(crate) const ADAPTIVE_INTERACTION_WINDOW_MS: f64 = 150.0;

#[cfg(feature = "hydrate")]
#[inline]
fn import_chunk_size(total_records: usize) -> usize {
    if total_records >= LARGE_IMPORT_RECORD_THRESHOLD {
        LARGE_IMPORT_CHUNK_SIZE
    } else {
        DEFAULT_IMPORT_CHUNK_SIZE
    }
}

#[cfg(feature = "hydrate")]
pub(crate) fn import_chunk_size_for_work_item(
    work_item: &ImportWorkItem,
    total_records: usize,
) -> usize {
    if work_item.prechunked {
        total_records.max(1)
    } else {
        import_chunk_size(total_records)
    }
}

#[cfg(feature = "hydrate")]
pub(crate) fn parse_boolean_flag(raw: &str) -> Option<bool> {
    match raw.trim().to_ascii_lowercase().as_str() {
        "1" | "true" | "yes" | "on" => Some(true),
        "0" | "false" | "no" | "off" => Some(false),
        _ => None,
    }
}

#[cfg(feature = "hydrate")]
pub(crate) fn resolve_resume_record_offset(
    start_record_offset_hint: Option<usize>,
    start_chunk_hint: usize,
    total_records: usize,
) -> usize {
    if let Some(offset) = start_record_offset_hint {
        return offset.min(total_records);
    }
    if start_chunk_hint > 0 {
        return (start_chunk_hint * ADAPTIVE_CHUNK_RECORDS_START).min(total_records);
    }
    0
}

#[cfg(feature = "hydrate")]
pub(crate) async fn persist_import_checkpoint(
    manifest_version: &str,
    file_index: usize,
    chunk_number: usize,
    record_offset: Option<usize>,
    total_work_items: usize,
    chunk_total: usize,
) {
    let checkpoint = ImportCheckpoint {
        id: IMPORT_CHECKPOINT_ID.to_string(),
        manifest_version: manifest_version.to_string(),
        file_index,
        chunk_index: chunk_number,
        record_offset,
        total_files: total_work_items,
        chunk_total,
        updated_at: js_sys::Date::new_0().to_string().into(),
        completed: false,
    };
    let _ = dmb_idb::put_sync_meta(&checkpoint).await;
}

#[cfg(feature = "hydrate")]
pub(crate) async fn yield_to_browser_scheduler(
    metrics: &mut ImportRunMetrics,
    fairness_triggered: bool,
) {
    metrics.yield_count = metrics.yield_count.saturating_add(1);
    if fairness_triggered {
        metrics.fairness_yield_count = metrics.fairness_yield_count.saturating_add(1);
    }
    crate::browser::scheduler::yield_now().await;
}

#[cfg(feature = "hydrate")]
pub(crate) fn should_yield_after_adaptive_chunk(
    chunk_ms: f64,
    no_pending_interaction: bool,
    is_last_chunk: bool,
) -> bool {
    if is_last_chunk {
        return false;
    }
    if !no_pending_interaction {
        return true;
    }
    chunk_ms >= ADAPTIVE_TARGET_CHUNK_MS
}

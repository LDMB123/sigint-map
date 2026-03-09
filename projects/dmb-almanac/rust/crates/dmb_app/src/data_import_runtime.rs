#[cfg(feature = "hydrate")]
use super::data_import_support::{
    import_chunk_size_for_work_item, parse_boolean_flag, ImportWorkItem,
    ADAPTIVE_CHUNK_RECORDS_MAX, ADAPTIVE_CHUNK_RECORDS_MIN, ADAPTIVE_CHUNK_RECORDS_START,
    ADAPTIVE_FAST_CHUNK_MS, ADAPTIVE_FAST_STREAK_REQUIRED, ADAPTIVE_SLOW_CHUNK_MS,
    ADAPTIVE_TARGET_CHUNK_MS, ADAPTIVE_TX_BATCH_MAX, ADAPTIVE_TX_BATCH_MIN,
    ADAPTIVE_TX_BATCH_START, IMPORT_TUNING_FLAG_KEY,
};
#[cfg(feature = "hydrate")]
use serde::Serialize;
#[cfg(feature = "hydrate")]
use std::cell::RefCell;

#[derive(Clone, Debug, Default)]
pub struct ImportTuningSnapshot {
    pub chunk_records: usize,
    pub tx_batch_size: usize,
    pub last_chunk_ms: f64,
    pub long_task_count: u32,
}

#[derive(Clone, Debug, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportFileTimingSnapshot {
    pub label: String,
    pub total_records: usize,
    pub chunk_count: usize,
    pub elapsed_ms: f64,
}

#[derive(Clone, Debug, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportRunSnapshot {
    pub strategy: String,
    #[serde(default)]
    pub manifest_version: Option<String>,
    pub completed: bool,
    #[serde(default)]
    pub preflight_failure: Option<String>,
    #[serde(default)]
    pub failure: Option<String>,
    #[serde(default)]
    pub total_import_ms: Option<f64>,
    pub total_work_items: usize,
    pub chunk_count: usize,
    pub checkpoint_count: usize,
    pub yield_count: usize,
    pub fairness_yield_count: usize,
    pub long_frame_count: u32,
    #[serde(default)]
    pub final_cache_entry_count: Option<usize>,
    pub files: Vec<ImportFileTimingSnapshot>,
}

#[cfg(feature = "hydrate")]
pub(crate) fn publish_import_run_snapshot(snapshot: &ImportRunSnapshot) {
    IMPORT_RUN_SNAPSHOT.with(|slot| {
        *slot.borrow_mut() = Some(snapshot.clone());
    });
    let Some(window) = web_sys::window() else {
        return;
    };
    let Ok(js_value) = serde_wasm_bindgen::to_value(snapshot) else {
        return;
    };
    let _ = crate::browser::runtime::set_property(
        window.as_ref(),
        "__DMB_IMPORT_RUN_SNAPSHOT",
        &js_value,
    );
}

#[cfg(feature = "hydrate")]
pub fn latest_import_run_snapshot() -> Option<ImportRunSnapshot> {
    IMPORT_RUN_SNAPSHOT.with(|slot| slot.borrow().clone())
}

#[cfg(not(feature = "hydrate"))]
pub fn latest_import_run_snapshot() -> Option<ImportRunSnapshot> {
    None
}

#[cfg(feature = "hydrate")]
#[derive(Debug)]
pub(crate) struct ImportRunMetrics {
    strategy: &'static str,
    started_at_ms: f64,
    pub(crate) chunk_count: usize,
    pub(crate) checkpoint_count: usize,
    pub(crate) yield_count: usize,
    pub(crate) fairness_yield_count: usize,
    total_work_items: usize,
    files: Vec<ImportFileTimingSnapshot>,
}

#[cfg(feature = "hydrate")]
impl ImportRunMetrics {
    pub(crate) fn new(strategy: &'static str, total_work_items: usize) -> Self {
        Self {
            strategy,
            started_at_ms: performance_now_ms(),
            chunk_count: 0,
            checkpoint_count: 0,
            yield_count: 0,
            fairness_yield_count: 0,
            total_work_items,
            files: Vec::with_capacity(total_work_items),
        }
    }

    pub(crate) fn record_file(
        &mut self,
        label: String,
        total_records: usize,
        chunk_count: usize,
        elapsed_ms: f64,
    ) {
        self.chunk_count = self.chunk_count.saturating_add(chunk_count);
        self.files.push(ImportFileTimingSnapshot {
            label,
            total_records,
            chunk_count,
            elapsed_ms,
        });
    }

    pub(crate) fn finish(
        self,
        manifest_version: Option<String>,
        completed: bool,
        preflight_failure: Option<String>,
        failure: Option<String>,
        final_cache_entry_count: Option<usize>,
    ) -> ImportRunSnapshot {
        let long_frame_count = crate::browser::perf::latest_inp_metrics_snapshot()
            .map_or(0, |metrics| metrics.long_frame_count);
        ImportRunSnapshot {
            strategy: self.strategy.to_string(),
            manifest_version,
            completed,
            preflight_failure,
            failure,
            total_import_ms: Some((performance_now_ms() - self.started_at_ms).max(0.0)),
            total_work_items: self.total_work_items,
            chunk_count: self.chunk_count,
            checkpoint_count: self.checkpoint_count,
            yield_count: self.yield_count,
            fairness_yield_count: self.fairness_yield_count,
            long_frame_count,
            final_cache_entry_count,
            files: self.files,
        }
    }
}

#[cfg(feature = "hydrate")]
thread_local! {
    static IMPORT_RUN_SNAPSHOT: RefCell<Option<ImportRunSnapshot>> = const { RefCell::new(None) };
}

#[cfg(feature = "hydrate")]
pub(crate) fn import_tuning_enabled() -> bool {
    if let Some(raw) = crate::browser::storage::local_storage_item(IMPORT_TUNING_FLAG_KEY) {
        if let Some(enabled) = parse_boolean_flag(&raw) {
            return enabled;
        }
    }

    match crate::browser::runtime::location_hostname() {
        Some(host) => matches!(
            host.to_ascii_lowercase().as_str(),
            "localhost" | "127.0.0.1" | "::1"
        ),
        None => false,
    }
}

#[cfg(feature = "hydrate")]
pub(crate) fn performance_now_ms() -> f64 {
    crate::browser::runtime::performance_now_ms().unwrap_or_else(js_sys::Date::now)
}

#[cfg(feature = "hydrate")]
fn scale_usize_ratio_rounded(value: usize, numerator: usize, denominator: usize) -> usize {
    if denominator == 0 {
        return value;
    }
    let scaled = value.saturating_mul(numerator);
    scaled.saturating_add(denominator / 2) / denominator
}

#[cfg(feature = "hydrate")]
pub(crate) struct AdaptiveImportGovernor {
    pub(crate) chunk_records: usize,
    pub(crate) tx_batch_size: usize,
    fast_streak: usize,
}

#[cfg(feature = "hydrate")]
impl AdaptiveImportGovernor {
    pub(crate) fn new() -> Self {
        Self {
            chunk_records: ADAPTIVE_CHUNK_RECORDS_START,
            tx_batch_size: ADAPTIVE_TX_BATCH_START,
            fast_streak: 0,
        }
    }

    pub(crate) fn prepare_for_work_item(
        &mut self,
        work_item: &ImportWorkItem,
        total_records: usize,
    ) {
        let baseline_chunk_records = import_chunk_size_for_work_item(work_item, total_records)
            .clamp(ADAPTIVE_CHUNK_RECORDS_MIN, ADAPTIVE_CHUNK_RECORDS_MAX);
        let baseline_tx_batch_size = dmb_idb::DEFAULT_BULK_PUT_TX_BATCH_SIZE
            .min(baseline_chunk_records)
            .clamp(ADAPTIVE_TX_BATCH_MIN, ADAPTIVE_TX_BATCH_MAX);

        self.chunk_records = self.chunk_records.max(baseline_chunk_records);
        self.tx_batch_size = self.tx_batch_size.max(baseline_tx_batch_size);
        self.fast_streak = 0;
    }

    pub(crate) fn snapshot(
        &self,
        last_chunk_ms: f64,
        long_task_count: u32,
    ) -> ImportTuningSnapshot {
        ImportTuningSnapshot {
            chunk_records: self.chunk_records,
            tx_batch_size: self.tx_batch_size,
            last_chunk_ms,
            long_task_count,
        }
    }

    pub(crate) fn next_chunk_records(&self, remaining_records: usize) -> usize {
        self.chunk_records.min(remaining_records.max(1))
    }

    pub(crate) fn update_after_chunk(&mut self, chunk_ms: f64, no_pending_interaction: bool) {
        let slow_chunk = chunk_ms > ADAPTIVE_SLOW_CHUNK_MS;
        let fast_chunk = chunk_ms < ADAPTIVE_FAST_CHUNK_MS;

        if slow_chunk {
            self.fast_streak = 0;
            self.chunk_records = scale_usize_ratio_rounded(self.chunk_records, 3, 4);
            self.tx_batch_size = scale_usize_ratio_rounded(self.tx_batch_size, 3, 4);
        } else if fast_chunk && no_pending_interaction {
            self.fast_streak = self.fast_streak.saturating_add(1);
            if self.fast_streak >= ADAPTIVE_FAST_STREAK_REQUIRED {
                self.chunk_records = scale_usize_ratio_rounded(self.chunk_records, 115, 100);
                self.tx_batch_size = scale_usize_ratio_rounded(self.tx_batch_size, 115, 100);
                self.fast_streak = 0;
            }
        } else {
            self.fast_streak = 0;
            if chunk_ms > ADAPTIVE_TARGET_CHUNK_MS && no_pending_interaction {
                self.chunk_records = scale_usize_ratio_rounded(self.chunk_records, 9, 10);
                self.tx_batch_size = scale_usize_ratio_rounded(self.tx_batch_size, 9, 10);
            }
        }

        self.chunk_records = self
            .chunk_records
            .clamp(ADAPTIVE_CHUNK_RECORDS_MIN, ADAPTIVE_CHUNK_RECORDS_MAX);
        self.tx_batch_size = self
            .tx_batch_size
            .clamp(ADAPTIVE_TX_BATCH_MIN, ADAPTIVE_TX_BATCH_MAX);
    }
}

#[cfg(feature = "hydrate")]
pub fn current_import_tuning_enabled() -> bool {
    import_tuning_enabled()
}

#[cfg(not(feature = "hydrate"))]
pub fn current_import_tuning_enabled() -> bool {
    false
}

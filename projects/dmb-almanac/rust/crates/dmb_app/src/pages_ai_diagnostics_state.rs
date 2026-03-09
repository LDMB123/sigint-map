use super::*;

#[derive(Clone, Default, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct IdbRuntimeMetrics {
    #[serde(default)]
    pub(crate) open_blocked_count: u64,
    #[serde(default)]
    pub(crate) open_blocked_last_ms: Option<f64>,
    #[serde(default)]
    pub(crate) version_change_count: u64,
    #[serde(default)]
    pub(crate) version_change_last_ms: Option<f64>,
}

#[derive(Clone, Copy)]
pub(crate) struct AiDiagnosticsState {
    pub(crate) caps: RwSignal<crate::ai::AiCapabilities>,
    pub(crate) ann_meta: RwSignal<Option<AnnIndexMeta>>,
    pub(crate) ann_caps: RwSignal<Option<crate::ai::AnnCapDiagnostics>>,
    pub(crate) ann_caps_loading: RwSignal<bool>,
    pub(crate) ann_caps_error: RwSignal<Option<String>>,
    pub(crate) embed_meta: RwSignal<Option<EmbeddingManifest>>,
    pub(crate) bench: RwSignal<Option<crate::ai::AiBenchmark>>,
    pub(crate) bench_running: RwSignal<bool>,
    pub(crate) bench_progress: RwSignal<f32>,
    pub(crate) bench_stage: RwSignal<String>,
    pub(crate) bench_cancelled: RwSignal<bool>,
    pub(crate) worker_bench: RwSignal<Option<crate::ai::AiWorkerBenchmark>>,
    pub(crate) tuning: RwSignal<Option<crate::ai::AiTuning>>,
    pub(crate) tuning_result: RwSignal<Option<crate::ai::ProbeTuningResult>>,
    pub(crate) benchmark_history: RwSignal<Vec<crate::ai::AiBenchmarkSample>>,
    pub(crate) worker_threshold_input: RwSignal<String>,
    pub(crate) worker_threshold_current: RwSignal<Option<usize>>,
    pub(crate) worker_max_floats: RwSignal<Option<usize>>,
    pub(crate) ann_cap_override_input: RwSignal<String>,
    pub(crate) ann_cap_override_value: RwSignal<Option<u64>>,
    pub(crate) ai_config_seeded: RwSignal<bool>,
    pub(crate) ai_config_version: RwSignal<Option<String>>,
    pub(crate) ai_config_generated_at: RwSignal<Option<String>>,
    pub(crate) ai_config_mismatch: RwSignal<Option<String>>,
    pub(crate) embedding_sample_enabled: RwSignal<bool>,
    pub(crate) cross_origin_isolated: RwSignal<Option<bool>>,
    pub(crate) telemetry_snapshot: RwSignal<Option<crate::ai::AiTelemetrySnapshot>>,
    pub(crate) webgpu_disabled: RwSignal<bool>,
    pub(crate) ai_warnings: RwSignal<Vec<crate::ai::AiWarningEvent>>,
    pub(crate) worker_bench_timestamp: RwSignal<Option<f64>>,
    pub(crate) worker_failure: RwSignal<crate::ai::WorkerFailureStatus>,
    pub(crate) webgpu_probe: RwSignal<Option<bool>>,
    pub(crate) sqlite_parity_summary: RwSignal<Option<crate::data::SqliteParitySummaryReport>>,
    pub(crate) sqlite_parity: RwSignal<Option<crate::data::SqliteParityReport>>,
    pub(crate) integrity_report: RwSignal<Option<crate::data::IntegrityReport>>,
    pub(crate) parity_check_running: RwSignal<bool>,
    pub(crate) webgpu_runtime: RwSignal<Option<WebgpuRuntimeTelemetry>>,
    pub(crate) apple_silicon_profile: RwSignal<Option<AppleSiliconProfile>>,
    pub(crate) idb_runtime_metrics: RwSignal<Option<IdbRuntimeMetrics>>,
}

impl AiDiagnosticsState {
    pub(crate) fn new() -> Self {
        Self {
            caps: RwSignal::new(crate::ai::AiCapabilities::default()),
            ann_meta: RwSignal::new(None::<AnnIndexMeta>),
            ann_caps: RwSignal::new(None::<crate::ai::AnnCapDiagnostics>),
            ann_caps_loading: RwSignal::new(false),
            ann_caps_error: RwSignal::new(None::<String>),
            embed_meta: RwSignal::new(None::<EmbeddingManifest>),
            bench: RwSignal::new(None::<crate::ai::AiBenchmark>),
            bench_running: RwSignal::new(false),
            bench_progress: RwSignal::new(0.0_f32),
            bench_stage: RwSignal::new("Idle".to_string()),
            bench_cancelled: RwSignal::new(false),
            worker_bench: RwSignal::new(None::<crate::ai::AiWorkerBenchmark>),
            tuning: RwSignal::new(None::<crate::ai::AiTuning>),
            tuning_result: RwSignal::new(None::<crate::ai::ProbeTuningResult>),
            benchmark_history: RwSignal::new(Vec::<crate::ai::AiBenchmarkSample>::new()),
            worker_threshold_input: RwSignal::new(String::new()),
            worker_threshold_current: RwSignal::new(None::<usize>),
            worker_max_floats: RwSignal::new(None::<usize>),
            ann_cap_override_input: RwSignal::new(String::new()),
            ann_cap_override_value: RwSignal::new(None::<u64>),
            ai_config_seeded: RwSignal::new(false),
            ai_config_version: RwSignal::new(None::<String>),
            ai_config_generated_at: RwSignal::new(None::<String>),
            ai_config_mismatch: RwSignal::new(None::<String>),
            embedding_sample_enabled: RwSignal::new(false),
            cross_origin_isolated: RwSignal::new(None::<bool>),
            telemetry_snapshot: RwSignal::new(None::<crate::ai::AiTelemetrySnapshot>),
            webgpu_disabled: RwSignal::new(false),
            ai_warnings: RwSignal::new(Vec::<crate::ai::AiWarningEvent>::new()),
            worker_bench_timestamp: RwSignal::new(None::<f64>),
            worker_failure: RwSignal::new(crate::ai::WorkerFailureStatus::default()),
            webgpu_probe: RwSignal::new(None::<bool>),
            sqlite_parity_summary: RwSignal::new(None::<crate::data::SqliteParitySummaryReport>),
            sqlite_parity: RwSignal::new(None::<crate::data::SqliteParityReport>),
            integrity_report: RwSignal::new(None::<crate::data::IntegrityReport>),
            parity_check_running: RwSignal::new(false),
            webgpu_runtime: RwSignal::new(None::<WebgpuRuntimeTelemetry>),
            apple_silicon_profile: RwSignal::new(None::<AppleSiliconProfile>),
            idb_runtime_metrics: RwSignal::new(None::<IdbRuntimeMetrics>),
        }
    }
}

#[cfg(feature = "hydrate")]
pub(crate) fn refresh_worker_threshold_signals(state: AiDiagnosticsState) {
    let current = crate::ai::worker_threshold_value();
    let input = current.map(|value| value.to_string()).unwrap_or_default();
    batch(move || {
        state.worker_threshold_current.set(current);
        state.worker_threshold_input.set(input);
    });
}

#[cfg(feature = "hydrate")]
pub(crate) fn refresh_ann_cap_override_signals(state: AiDiagnosticsState) {
    let current = crate::ai::ann_cap_override_mb();
    let input = current.map(|value| value.to_string()).unwrap_or_default();
    batch(move || {
        state.ann_cap_override_value.set(current);
        state.ann_cap_override_input.set(input);
    });
}

#[cfg(feature = "hydrate")]
pub(crate) fn refresh_runtime_metrics_signals(state: AiDiagnosticsState) {
    let webgpu_runtime = crate::browser::webgpu_diagnostics::load_runtime_telemetry();
    let apple_silicon_profile = crate::browser::webgpu_diagnostics::load_apple_silicon_profile();
    let idb_runtime_metrics = dmb_idb::js_idb_runtime_metrics()
        .ok()
        .and_then(|value| serde_wasm_bindgen::from_value(value).ok());
    batch(move || {
        let _ = state.webgpu_runtime.try_set(webgpu_runtime);
        let _ = state.apple_silicon_profile.try_set(apple_silicon_profile);
        let _ = state.idb_runtime_metrics.try_set(idb_runtime_metrics);
    });
}

#[cfg(feature = "hydrate")]
pub(crate) fn refresh_ai_config_signals(state: AiDiagnosticsState) {
    let local_state = crate::ai::local_state_snapshot();
    batch(move || {
        let _ = state.ai_config_seeded.try_set(local_state.ai_config_seeded);
        let _ = state
            .ai_config_version
            .try_set(local_state.ai_config_version);
        let _ = state
            .ai_config_generated_at
            .try_set(local_state.ai_config_generated_at);
    });
}

#[cfg(feature = "hydrate")]
pub(crate) fn apply_worker_threshold_override(state: AiDiagnosticsState, value: Option<usize>) {
    crate::ai::set_worker_threshold_override(value);
    refresh_worker_threshold_signals(state);
}

#[cfg(feature = "hydrate")]
pub(crate) fn apply_ann_cap_override(state: AiDiagnosticsState, value: Option<u64>) {
    crate::ai::set_ann_cap_override_mb(value);
    refresh_ann_cap_override_signals(state);
}

#[cfg(feature = "hydrate")]
pub(crate) fn parse_optional_signal_value<T>(input: RwSignal<String>) -> Option<T>
where
    T: std::str::FromStr,
{
    input.get_untracked().trim().parse::<T>().ok()
}

#[cfg(feature = "hydrate")]
pub(crate) fn store_benchmark_sample_and_refresh_history(
    benchmark_history: RwSignal<Vec<crate::ai::AiBenchmarkSample>>,
    full: Option<crate::ai::AiBenchmark>,
    subset: Option<crate::ai::AiSubsetBenchmark>,
    worker: Option<crate::ai::AiWorkerBenchmark>,
) {
    crate::ai::store_benchmark_sample(full, subset, worker);
    benchmark_history.set(crate::ai::benchmark_history());
}

#[cfg(feature = "hydrate")]
pub(crate) fn set_benchmark_cancelled_state(
    bench_running: RwSignal<bool>,
    bench_stage: RwSignal<String>,
) {
    bench_running.set(false);
    bench_stage.set("Cancelled".to_string());
}

#[cfg(feature = "hydrate")]
pub(crate) fn cancel_benchmark_if_requested(
    bench_cancelled: RwSignal<bool>,
    bench_running: RwSignal<bool>,
    bench_stage: RwSignal<String>,
) -> bool {
    if !bench_cancelled.get_untracked() {
        return false;
    }
    set_benchmark_cancelled_state(bench_running, bench_stage);
    true
}

#[cfg(feature = "hydrate")]
pub(crate) fn apply_runtime_snapshot_values(state: AiDiagnosticsState) {
    let caps = crate::ai::detect_ai_capabilities();
    let worker_max_floats = crate::ai::worker_max_floats_value();
    let ann_caps = crate::ai::ann_cap_diagnostics();
    let worker_failure = crate::ai::worker_failure_status();
    let local_state = crate::ai::local_state_snapshot();

    let worker_threshold_input = local_state.worker_threshold_raw.clone().unwrap_or_else(|| {
        local_state
            .worker_threshold
            .map(|value| value.to_string())
            .unwrap_or_default()
    });
    let ann_cap_override_input = local_state
        .ann_cap_override_mb
        .map(|value| value.to_string())
        .unwrap_or_default();

    batch(move || {
        let _ = state.caps.try_set(caps);
        let _ = state.worker_max_floats.try_set(worker_max_floats);
        let _ = state.ann_caps.try_set(ann_caps);
        let _ = state.worker_failure.try_set(worker_failure);
        let _ = state
            .embedding_sample_enabled
            .try_set(local_state.embedding_sample_enabled);
        let _ = state.ai_warnings.try_set(local_state.ai_warnings);
        let _ = state
            .worker_bench_timestamp
            .try_set(local_state.worker_bench_timestamp);
        let _ = state
            .worker_threshold_current
            .try_set(local_state.worker_threshold);
        let _ = state.worker_threshold_input.try_set(worker_threshold_input);
        let _ = state
            .ann_cap_override_value
            .try_set(local_state.ann_cap_override_mb);
        let _ = state.ann_cap_override_input.try_set(ann_cap_override_input);
        let _ = state.ai_config_seeded.try_set(local_state.ai_config_seeded);
        let _ = state
            .ai_config_version
            .try_set(local_state.ai_config_version);
        let _ = state
            .ai_config_generated_at
            .try_set(local_state.ai_config_generated_at);
        let _ = state.webgpu_disabled.try_set(local_state.webgpu_disabled);
    });

    refresh_runtime_metrics_signals(state);

    let isolated = crate::browser::runtime::cross_origin_isolated().unwrap_or(false);
    let _ = state.cross_origin_isolated.try_set(Some(isolated));
}

#[cfg(feature = "hydrate")]
pub(crate) fn refresh_ai_config_meta_mismatch(state: AiDiagnosticsState) {
    let local_version = state.ai_config_version;
    let local_generated_at = state.ai_config_generated_at;
    let mismatch = state.ai_config_mismatch;
    spawn_local(async move {
        if let Some(reconciled) = crate::ai::fetch_and_reconcile_ai_config_meta(
            local_version.try_get_untracked().flatten(),
            local_generated_at.try_get_untracked().flatten(),
        )
        .await
        {
            batch(move || {
                let _ = local_version.try_set(reconciled.local_version.clone());
                let _ = local_generated_at.try_set(reconciled.local_generated_at.clone());
                let _ = mismatch.try_set(crate::ai::ai_config_mismatch_status_message(
                    &reconciled,
                    "Remote AI config differs (",
                    ").",
                ));
            });
        }
    });
}

#[cfg(feature = "hydrate")]
pub(crate) fn benchmark_diff_json(history: &[crate::ai::AiBenchmarkSample]) -> serde_json::Value {
    let mut full_samples: Vec<_> = history
        .iter()
        .filter_map(|sample| sample.full.clone())
        .collect();
    if full_samples.len() < 2 {
        return serde_json::json!(null);
    }

    match (full_samples.pop(), full_samples.pop()) {
        (Some(current), Some(previous)) => serde_json::json!({
            "cpuMsDelta": current.cpu_ms - previous.cpu_ms,
            "gpuMsDelta": current.gpu_ms.unwrap_or(0.0) - previous.gpu_ms.unwrap_or(0.0),
            "backend": current.backend
        }),
        _ => serde_json::json!(null),
    }
}

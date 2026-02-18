use super::*;

#[derive(Clone, Default, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct WebgpuRuntimeTelemetry {
    #[serde(default)]
    counters: std::collections::HashMap<String, u64>,
    #[serde(default)]
    last_event: Option<String>,
    #[serde(default)]
    last_event_ts: Option<f64>,
}

#[derive(Clone, Default, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct AppleSiliconWorkgroup {
    #[serde(default)]
    dot: Option<usize>,
    #[serde(default)]
    score: Option<usize>,
}

#[derive(Clone, Default, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct AppleSiliconWorkerProfile {
    #[serde(default)]
    threshold_floats: Option<usize>,
    #[serde(default)]
    max_floats: Option<usize>,
}

#[derive(Clone, Default, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct AppleSiliconProfile {
    #[serde(default)]
    is_apple_silicon: bool,
    #[serde(default)]
    cpu_cores: Option<f64>,
    #[serde(default)]
    device_memory_gb: Option<f64>,
    #[serde(default)]
    workgroup: Option<AppleSiliconWorkgroup>,
    #[serde(default)]
    worker: Option<AppleSiliconWorkerProfile>,
}

#[derive(Clone, Default, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct IdbRuntimeMetrics {
    #[serde(default)]
    open_blocked_count: u64,
    #[serde(default)]
    open_blocked_last_ms: Option<f64>,
    #[serde(default)]
    version_change_count: u64,
    #[serde(default)]
    version_change_last_ms: Option<f64>,
}

#[cfg(feature = "hydrate")]
#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = window, js_name = dmbGetWebgpuTelemetry, catch)]
    fn js_get_webgpu_runtime_telemetry() -> Result<JsValue, JsValue>;

    #[wasm_bindgen(js_namespace = window, js_name = dmbResetWebgpuTelemetry, catch)]
    fn js_reset_webgpu_runtime_telemetry() -> Result<(), JsValue>;

    #[wasm_bindgen(js_namespace = window, js_name = dmbGetAppleSiliconProfile, catch)]
    fn js_get_apple_silicon_profile() -> Result<JsValue, JsValue>;
}

#[cfg(feature = "hydrate")]
pub(super) fn load_webgpu_runtime_telemetry() -> Option<WebgpuRuntimeTelemetry> {
    let value = js_get_webgpu_runtime_telemetry().ok()?;
    serde_wasm_bindgen::from_value(value).ok()
}

#[cfg(feature = "hydrate")]
pub(super) fn reset_webgpu_runtime_telemetry() {
    let _ = js_reset_webgpu_runtime_telemetry();
}

#[cfg(feature = "hydrate")]
pub(super) fn load_apple_silicon_profile() -> Option<AppleSiliconProfile> {
    let value = js_get_apple_silicon_profile().ok()?;
    serde_wasm_bindgen::from_value(value).ok()
}

#[cfg(feature = "hydrate")]
pub(super) fn load_idb_runtime_metrics() -> Option<IdbRuntimeMetrics> {
    dmb_idb::js_idb_runtime_metrics()
        .ok()
        .and_then(|value| serde_wasm_bindgen::from_value(value).ok())
}

pub(super) fn benchmark_metrics_list(
    count_label: &str,
    count_value: usize,
    cpu_label: &str,
    cpu_ms: f64,
    gpu_ms: Option<f64>,
    backend: &str,
) -> impl IntoView {
    view! {
        <ul class="list">
            <li>{format!("{count_label}: {count_value}")}</li>
            <li>{format!("{cpu_label}: {cpu_ms:.2} ms")}</li>
            <li>{format!("GPU: {}", format_ms(gpu_ms))}</li>
            <li>{format!("Backend: {backend}")}</li>
        </ul>
    }
}

pub(super) fn display_or_na<T: std::fmt::Display>(value: Option<T>) -> String {
    value
        .map(|value| value.to_string())
        .unwrap_or_else(|| "n/a".to_string())
}

pub(super) fn display_or_none<T: std::fmt::Display>(value: Option<T>) -> String {
    value
        .map(|value| value.to_string())
        .unwrap_or_else(|| "none".to_string())
}

pub(super) fn map_or_na<T>(value: Option<T>, map: impl FnOnce(T) -> String) -> String {
    value.map(map).unwrap_or_else(|| "n/a".to_string())
}

pub(super) fn format_ms<T>(value: Option<T>) -> String
where
    T: Into<f64>,
{
    display_or_na(value.map(|ms| format!("{:.2} ms", ms.into())))
}

pub(super) fn bool_label_yes_no(value: bool) -> &'static str {
    if value {
        "yes"
    } else {
        "no"
    }
}

pub(super) fn bool_label_on_off(value: bool) -> &'static str {
    if value {
        "on"
    } else {
        "off"
    }
}

pub(super) fn opt_bool_label_yes_no(value: Option<bool>) -> &'static str {
    value.map(bool_label_yes_no).unwrap_or("n/a")
}

pub(super) fn opt_bool_label_on_off(value: Option<bool>) -> &'static str {
    value.map(bool_label_on_off).unwrap_or("n/a")
}

pub(super) fn minutes_ago(timestamp_ms: Option<f64>) -> String {
    timestamp_ms
        .map(|ts| {
            format!(
                "{:.1}m ago",
                ((js_sys::Date::now() - ts) / 60000.0).max(0.0)
            )
        })
        .unwrap_or_else(|| "n/a".to_string())
}

pub(super) fn cooldown_seconds(remaining_ms: Option<f64>) -> String {
    remaining_ms
        .map(|ms| format!("{:.0}s", (ms / 1000.0).max(0.0)))
        .unwrap_or_else(|| "none".to_string())
}

pub(super) fn idb_integrity_status(report: Option<crate::data::IntegrityReport>) -> String {
    report
        .map(|report| {
            if report.total_mismatches == 0 {
                "IDB integrity: ok".to_string()
            } else {
                format!("IDB integrity: {} mismatch(es)", report.total_mismatches)
            }
        })
        .unwrap_or_else(|| "IDB integrity: n/a".to_string())
}

pub(super) fn sqlite_parity_status(report: Option<crate::data::SqliteParityReport>) -> String {
    report
        .map(|report| {
            if !report.available {
                "SQLite parity: unavailable".to_string()
            } else if report.total_mismatches == 0 {
                "SQLite parity: ok".to_string()
            } else {
                format!("SQLite parity: {} mismatch(es)", report.total_mismatches)
            }
        })
        .unwrap_or_else(|| "SQLite parity: n/a".to_string())
}

fn webgpu_probe_status_label(status: Option<bool>) -> &'static str {
    status
        .map(|ok| if ok { "ready" } else { "failed" })
        .unwrap_or("n/a")
}

pub(super) fn ai_warnings_list(warnings: Vec<crate::ai::AiWarningEvent>) -> impl IntoView {
    if warnings.is_empty() {
        return view! { <p class="muted">"No AI warnings recorded."</p> }.into_any();
    }
    let items = warnings
        .into_iter()
        .rev()
        .take(5)
        .map(|event| {
            let detail = display_or_na(event.details);
            let line = format!("{} – {}", event.event, detail);
            view! { <li>{line}</li> }
        })
        .collect_view();
    view! { <ul class="list">{items}</ul> }.into_any()
}

pub(super) fn worker_threshold_summary(threshold: usize, dim: usize) -> String {
    let effective_dim = dim.max(1);
    let approx_vectors = threshold / effective_dim;
    format!(
        "Current threshold: {threshold} floats (~{approx_vectors} vectors @ dim {effective_dim})"
    )
}

pub(super) struct AiCapabilitiesViewModel {
    pub(super) caps: crate::ai::AiCapabilities,
    pub(super) webgpu_probe: Option<bool>,
    pub(super) cross_origin_isolated: Option<bool>,
    pub(super) ai_config_seeded: bool,
    pub(super) ai_config_version: Option<String>,
    pub(super) ai_config_generated_at: Option<String>,
    pub(super) worker_bench_timestamp: Option<f64>,
    pub(super) worker_max_floats: Option<usize>,
    pub(super) worker_failure: crate::ai::WorkerFailureStatus,
}

pub(super) fn ai_capabilities_list(data: AiCapabilitiesViewModel) -> impl IntoView {
    let worker_cooldown = cooldown_seconds(data.worker_failure.cooldown_remaining_ms);
    let worker_last_error = display_or_none(data.worker_failure.last_error);
    let lines = vec![
        format!(
            "WebGPU available: {}",
            bool_label_yes_no(data.caps.webgpu_available)
        ),
        format!(
            "WebGPU device probe: {}",
            webgpu_probe_status_label(data.webgpu_probe)
        ),
        format!(
            "WebGPU enabled: {}",
            bool_label_yes_no(data.caps.webgpu_enabled)
        ),
        format!("GPU Worker: {}", bool_label_on_off(data.caps.webgpu_worker)),
        format!("WebNN: {}", bool_label_on_off(data.caps.webnn)),
        format!("SIMD: {}", bool_label_on_off(data.caps.wasm_simd)),
        format!("Threads: {}", bool_label_on_off(data.caps.threads)),
        format!(
            "Scoring backend: {}",
            if data.caps.webgpu_enabled {
                "WebGPU"
            } else {
                "WASM SIMD"
            }
        ),
        format!(
            "Cross-Origin Isolated: {}",
            opt_bool_label_on_off(data.cross_origin_isolated)
        ),
        format!(
            "AI config seeded: {}",
            bool_label_yes_no(data.ai_config_seeded)
        ),
        format!(
            "AI config version: {}",
            display_or_na(data.ai_config_version)
        ),
        format!(
            "AI config generated: {}",
            display_or_na(data.ai_config_generated_at)
        ),
        format!("Worker bench: {}", minutes_ago(data.worker_bench_timestamp)),
        format!(
            "Worker max floats: {}",
            display_or_na(data.worker_max_floats)
        ),
        format!("Worker cooldown: {worker_cooldown}"),
        format!("Worker last error: {worker_last_error}"),
    ];
    view! {
        <ul class="list">
            {lines
                .into_iter()
                .map(|line| view! { <li>{line}</li> })
                .collect_view()}
        </ul>
    }
}

pub(super) fn ai_benchmark_history_list(
    history: Vec<crate::ai::AiBenchmarkSample>,
) -> impl IntoView {
    if history.is_empty() {
        return view! { <p class="muted">"No benchmark history yet."</p> }.into_any();
    }
    let rows = history
        .into_iter()
        .rev()
        .take(5)
        .map(|sample| {
            let label = benchmark_history_label(&sample);
            format!("{:.0} ms – {label}", sample.timestamp_ms)
        })
        .collect::<Vec<_>>();
    view! {
        <ul class="list">
            {rows
                .into_iter()
                .map(|row| view! { <li>{row}</li> })
                .collect_view()}
        </ul>
    }
    .into_any()
}

pub(super) fn ai_embedding_manifest_list(meta: EmbeddingManifest) -> impl IntoView {
    view! {
        <ul class="list">
            <li>{format!("Version: {}", meta.version)}</li>
            <li>{format!("Dim: {}", meta.dim)}</li>
            <li>{format!("Chunks: {}", meta.chunk_count)}</li>
        </ul>
    }
}

fn benchmark_history_label(sample: &crate::ai::AiBenchmarkSample) -> String {
    if let Some(full) = &sample.full {
        format!(
            "Full: {:.2} ms ({} samples)",
            full.gpu_ms.unwrap_or(full.cpu_ms),
            full.sample_count
        )
    } else if let Some(subset) = &sample.subset {
        format!(
            "Subset: {:.2} ms ({} candidates)",
            subset.gpu_ms.unwrap_or(subset.cpu_ms),
            subset.candidate_count
        )
    } else if let Some(worker) = &sample.worker {
        format!(
            "Worker: {} vectors (winner: {})",
            worker.vector_count,
            display_or_na(worker.winner.clone())
        )
    } else {
        "Unknown benchmark".to_string()
    }
}

pub(super) fn ai_tuning_state_list(state: crate::ai::AiTuning) -> impl IntoView {
    view! {
        <ul class="list">
            <li>{format!(
                "Probe Override: {}",
                display_or_none(state.probe_override)
            )}</li>
            <li>{format!("Target Latency: {:.1} ms", state.target_latency_ms)}</li>
            <li>{format!("Last Latency: {}", format_ms(state.last_latency_ms))}</li>
        </ul>
    }
}

pub(super) fn ai_tuning_result_summary_list(result: crate::ai::ProbeTuningResult) -> impl IntoView {
    view! {
        <ul class="list">
            <li>{format!("Selected Probe: {}", result.selected_probe)}</li>
            <li>{format!("Target: {:.1} ms", result.target_latency_ms)}</li>
        </ul>
    }
}

pub(super) fn ai_tuning_result_metrics_list(result: crate::ai::ProbeTuningResult) -> impl IntoView {
    view! {
        <div class="list">
            {result
                .metrics
                .into_iter()
                .map(|metric| view! {
                    <div class="muted">{format!(
                        "Probe {} → {} candidates, {:.2} ms",
                        metric.probe_count,
                        metric.candidate_count,
                        metric.avg_latency_ms
                    )}</div>
                })
                .collect_view()}
        </div>
    }
}

pub(super) fn ai_ann_index_list(meta: AnnIndexMeta) -> impl IntoView {
    view! {
        <ul class="list">
            <li>{format!("Method: {}", meta.method)}</li>
            <li>{format!("Dim: {}", meta.dim)}</li>
            <li>{format!("Records: {}", meta.record_count)}</li>
            <li>{format!("Built: {}", meta.built_at)}</li>
            <li>{format!("Source: {}", meta.source_manifest)}</li>
            <li>{format!("Index File: {}", display_or_na(meta.index_file))}</li>
            <li>{format!("Clusters: {}", meta.cluster_count.unwrap_or(0))}</li>
            <li>{format!("Probes: {}", meta.probe_count.unwrap_or(0))}</li>
        </ul>
    }
}

pub(super) fn ai_ann_cap_list(cap: crate::ai::AnnCapDiagnostics) -> impl IntoView {
    view! {
        <ul class="list">
            <li>{format!("Cap: {:.1} MB", cap.cap_bytes as f64 / 1_000_000.0)}</li>
            <li>{format!(
                "Override: {}",
                display_or_none(cap.cap_override_mb.map(|v| format!("{v} MB")))
            )}</li>
            <li>{format!(
                "Before: {:.1} MB ({} vectors)",
                cap.matrix_bytes_before as f64 / 1_000_000.0,
                cap.vectors_before
            )}</li>
            <li>{format!(
                "After: {:.1} MB ({} vectors)",
                cap.matrix_bytes_after as f64 / 1_000_000.0,
                cap.vectors_after
            )}</li>
            <li>{format!(
                "IVF bytes: {}",
                map_or_na(cap.ivf_bytes, |v| format!("{:.1} MB", v as f64 / 1_000_000.0))
            )}</li>
            <li>{format!(
                "IVF cap: {}",
                map_or_na(cap.ivf_cap_bytes, |v| format!("{:.1} MB", v as f64 / 1_000_000.0))
            )}</li>
            <li>{format!("Chunks loaded: {}", cap.chunks_loaded.unwrap_or(0))}</li>
            <li>{format!("Records loaded: {}", cap.records_loaded.unwrap_or(0))}</li>
            <li>{format!("IVF Dropped: {}", bool_label_yes_no(cap.ivf_dropped))}</li>
            <li>{format!("Used ANN: {}", bool_label_yes_no(cap.used_ann))}</li>
            <li>{format!("Capped: {}", bool_label_yes_no(cap.capped))}</li>
            <li>{format!(
                "Budget capped: {}",
                bool_label_yes_no(cap.budget_capped)
            )}</li>
            <li>{format!(
                "Device Memory: {}",
                map_or_na(cap.device_memory_gb, |v| format!("{v:.1} GB"))
            )}</li>
            <li>{format!("Tier: {}", cap.policy_tier)}</li>
        </ul>
    }
}

pub(super) fn ai_worker_benchmark_list(result: crate::ai::AiWorkerBenchmark) -> impl IntoView {
    view! {
        <ul class="list">
            <li>{format!("Vectors: {}", result.vector_count)}</li>
            <li>{format!("Dim: {}", result.dim)}</li>
            <li>{format!("Direct: {}", format_ms(result.direct_ms))}</li>
            <li>{format!("Worker: {}", format_ms(result.worker_ms))}</li>
            <li>{format!("Winner: {}", display_or_na(result.winner))}</li>
            <li>{format!(
                "Recommended threshold (floats): {}",
                display_or_na(result.recommended_threshold)
            )}</li>
        </ul>
    }
}

pub(super) fn ai_webgpu_runtime_list(telemetry: WebgpuRuntimeTelemetry) -> impl IntoView {
    let direct_calls = telemetry
        .counters
        .get("direct_scores_calls")
        .copied()
        .unwrap_or(0);
    let worker_success = telemetry
        .counters
        .get("worker_success")
        .copied()
        .unwrap_or(0);
    let worker_fallback = telemetry
        .counters
        .get("worker_fallback_runtime_failed")
        .copied()
        .unwrap_or(0)
        + telemetry
            .counters
            .get("worker_fallback_init_failed")
            .copied()
            .unwrap_or(0);
    let subset_success = telemetry
        .counters
        .get("subset_worker_success")
        .copied()
        .unwrap_or(0);
    let last_event = display_or_none(telemetry.last_event);
    let last_event_age = minutes_ago(telemetry.last_event_ts);
    view! {
        <ul class="list">
            <li>{format!("Direct score calls: {direct_calls}")}</li>
            <li>{format!("Worker successes: {worker_success}")}</li>
            <li>{format!("Worker fallback errors: {worker_fallback}")}</li>
            <li>{format!("Subset worker successes: {subset_success}")}</li>
            <li>{format!("Last event: {last_event}")}</li>
            <li>{format!("Last event age: {last_event_age}")}</li>
        </ul>
    }
}

pub(super) fn ai_apple_silicon_profile_list(profile: AppleSiliconProfile) -> impl IntoView {
    let workgroup_dot = profile.workgroup.as_ref().and_then(|group| group.dot);
    let workgroup_score = profile.workgroup.as_ref().and_then(|group| group.score);
    let threshold = profile
        .worker
        .as_ref()
        .and_then(|worker| worker.threshold_floats);
    let max_floats = profile.worker.as_ref().and_then(|worker| worker.max_floats);
    view! {
        <ul class="list">
            <li>{format!(
                "Apple Silicon detected: {}",
                bool_label_yes_no(profile.is_apple_silicon)
            )}</li>
            <li>{format!(
                "CPU cores: {}",
                map_or_na(profile.cpu_cores, |v| format!("{v:.0}"))
            )}</li>
            <li>{format!(
                "Device memory: {}",
                map_or_na(profile.device_memory_gb, |v| format!("{v:.1} GB"))
            )}</li>
            <li>{format!("Workgroup dot: {}", display_or_na(workgroup_dot))}</li>
            <li>{format!("Workgroup score: {}", display_or_na(workgroup_score))}</li>
            <li>{format!("Worker threshold: {}", display_or_na(threshold))}</li>
            <li>{format!("Worker max floats: {}", display_or_na(max_floats))}</li>
        </ul>
    }
}

pub(super) fn ai_idb_runtime_metrics_list(metrics: IdbRuntimeMetrics) -> impl IntoView {
    let blocked_age = minutes_ago(metrics.open_blocked_last_ms);
    let version_age = minutes_ago(metrics.version_change_last_ms);
    view! {
        <ul class="list">
            <li>{format!("Open blocked events: {}", metrics.open_blocked_count)}</li>
            <li>{format!("Last open blocked: {blocked_age}")}</li>
            <li>{format!("Version change events: {}", metrics.version_change_count)}</li>
            <li>{format!("Last version change: {version_age}")}</li>
        </ul>
    }
}

pub(super) fn ai_telemetry_snapshot_list(
    snapshot: crate::ai::AiTelemetrySnapshot,
) -> impl IntoView {
    view! {
        <ul class="list">
            <li>{format!("Last update: {}", minutes_ago(Some(snapshot.timestamp_ms)))}</li>
            <li>{format!(
                "Worker threshold: {}",
                display_or_na(snapshot.worker_threshold)
            )}</li>
            <li>{format!(
                "Worker max floats: {}",
                display_or_na(snapshot.worker_max_floats)
            )}</li>
            <li>{format!(
                "Worker cooldown: {}",
                cooldown_seconds(snapshot.worker_failure_remaining_ms)
            )}</li>
            <li>{format!(
                "Worker last error: {}",
                display_or_none(snapshot.worker_failure_reason)
            )}</li>
            <li>{format!(
                "ANN cap recorded: {}",
                bool_label_yes_no(snapshot.ann_cap.is_some())
            )}</li>
            <li>{format!(
                "ANN cap override: {}",
                display_or_none(snapshot.ann_cap_override_mb.map(|v| format!("{v} MB")))
            )}</li>
            <li>{format!(
                "WebGPU enabled: {}",
                opt_bool_label_yes_no(snapshot.webgpu_enabled)
            )}</li>
            <li>{format!(
                "WebGPU available: {}",
                opt_bool_label_yes_no(snapshot.webgpu_available)
            )}</li>
            <li>{format!(
                "WebNN: {}",
                opt_bool_label_yes_no(snapshot.webnn)
            )}</li>
            <li>{format!(
                "AI config version: {}",
                display_or_na(snapshot.ai_config_version)
            )}</li>
            <li>{format!(
                "AI config generated: {}",
                display_or_na(snapshot.ai_config_generated_at)
            )}</li>
            <li>{format!(
                "AI config seeded: {}",
                opt_bool_label_yes_no(snapshot.ai_config_seeded)
            )}</li>
            <li>{format!(
                "Embedding sample: {}",
                opt_bool_label_on_off(snapshot.embedding_sample_enabled)
            )}</li>
        </ul>
    }
}

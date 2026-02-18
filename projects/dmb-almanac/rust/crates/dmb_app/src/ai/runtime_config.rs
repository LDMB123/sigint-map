use super::*;

#[cfg(feature = "hydrate")]
pub(super) fn read_worker_threshold() -> Option<usize> {
    storage_parse(WORKER_THRESHOLD_KEY)
}

#[cfg(feature = "hydrate")]
pub(super) fn read_worker_max_floats() -> Option<usize> {
    let value = dmb_get_worker_limits().ok()?;
    serde_wasm_bindgen::from_value::<WorkerLimitsResult>(value)
        .ok()
        .and_then(|limits| limits.max_floats)
        .map(|max_floats| max_floats as usize)
}

#[cfg(feature = "hydrate")]
pub fn worker_threshold_value() -> Option<usize> {
    read_worker_threshold()
}

#[cfg(feature = "hydrate")]
pub fn worker_max_floats_value() -> Option<usize> {
    read_worker_max_floats()
}

#[cfg(feature = "hydrate")]
pub(super) fn read_worker_failure_until() -> Option<f64> {
    storage_parse(WORKER_FAILURE_UNTIL_KEY)
}

#[cfg(feature = "hydrate")]
pub(super) fn read_worker_failure_reason() -> Option<String> {
    storage_get(WORKER_FAILURE_REASON_KEY)
}

#[cfg(feature = "hydrate")]
pub fn worker_failure_status() -> WorkerFailureStatus {
    let now = js_sys::Date::now();
    let until = read_worker_failure_until();
    let remaining = until.and_then(|ts| if ts <= now { None } else { Some(ts - now) });
    if remaining.is_some() && storage_get(WORKER_COOLDOWN_WARN_KEY).is_none() {
        storage_set(WORKER_COOLDOWN_WARN_KEY, "1");
        record_ai_warning(
            "webgpu_worker_cooldown",
            Some("WebGPU worker in cooldown; using direct scoring".to_string()),
        );
    }
    WorkerFailureStatus {
        cooldown_until_ms: until,
        cooldown_remaining_ms: remaining,
        last_error: read_worker_failure_reason(),
    }
}

#[cfg(not(feature = "hydrate"))]
pub fn worker_failure_status() -> WorkerFailureStatus {
    WorkerFailureStatus::default()
}

#[cfg(feature = "hydrate")]
pub fn clear_worker_failure_status() {
    storage_remove(WORKER_FAILURE_UNTIL_KEY);
    storage_remove(WORKER_FAILURE_REASON_KEY);
    storage_remove(WORKER_COOLDOWN_WARN_KEY);
    let _ = dmb_clear_worker_failure_status();
}

#[cfg(feature = "hydrate")]
pub fn set_worker_threshold_override(value: Option<usize>) {
    if browser_storage().is_none() {
        return;
    }
    match value {
        Some(val) => {
            let clamped = clamp_worker_threshold(val);
            store_worker_threshold(clamped);
        }
        None => {
            storage_remove(WORKER_THRESHOLD_KEY);
            ensure_default_worker_threshold();
        }
    }
}

#[cfg(feature = "hydrate")]
pub(super) fn read_ann_cap_override_mb() -> Option<u64> {
    storage_get(ANN_CAP_OVERRIDE_KEY)?
        .parse::<u64>()
        .ok()
        .map(|mb| mb.clamp(MIN_ANN_CAP_MB, MAX_ANN_CAP_MB))
}

#[cfg(feature = "hydrate")]
pub fn ann_cap_override_mb() -> Option<u64> {
    read_ann_cap_override_mb()
}

#[cfg(feature = "hydrate")]
pub fn set_ann_cap_override_mb(value: Option<u64>) {
    if browser_storage().is_none() {
        return;
    }
    match value {
        Some(mb) => {
            let clamped = mb.clamp(MIN_ANN_CAP_MB, MAX_ANN_CAP_MB);
            storage_set(ANN_CAP_OVERRIDE_KEY, &clamped.to_string());
        }
        None => {
            storage_remove(ANN_CAP_OVERRIDE_KEY);
        }
    }
    store_ai_telemetry_snapshot(ann_cap_diagnostics().as_ref());
}

#[cfg(feature = "hydrate")]
pub(super) fn read_webgpu_disabled() -> Option<bool> {
    let value = storage_get(WEBGPU_DISABLE_KEY)?;
    Some(value == "1" || value.eq_ignore_ascii_case("true"))
}

#[cfg(feature = "hydrate")]
pub fn set_webgpu_disabled(disabled: bool) {
    if browser_storage().is_none() {
        return;
    }
    let value = if disabled { "1" } else { "0" };
    storage_set(WEBGPU_DISABLE_KEY, value);
}

#[cfg(feature = "hydrate")]
pub(super) fn store_worker_threshold(value: usize) {
    let Some(storage) = browser_storage() else {
        return;
    };
    let _ = storage.set_item(WORKER_THRESHOLD_KEY, &value.to_string());
    let _ = dmb_set_worker_threshold(value as f64);
}

#[cfg(feature = "hydrate")]
pub(super) fn auto_worker_threshold() -> Option<usize> {
    let window = web_sys::window()?;
    let navigator = window.navigator();
    let device_memory = navigator_property(&navigator, "deviceMemory").as_f64();
    let cores = window.navigator().hardware_concurrency().max(1.0) as usize;

    let mut threshold = if device_memory.unwrap_or(0.0) >= 16.0 || cores >= 12 {
        15_000
    } else if device_memory.unwrap_or(0.0) <= 4.0 || cores <= 4 {
        60_000
    } else if device_memory.unwrap_or(0.0) >= 8.0 || cores >= 8 {
        25_000
    } else {
        35_000
    };

    threshold = clamp_worker_threshold(threshold);
    Some(threshold)
}

#[cfg(feature = "hydrate")]
pub(super) fn ensure_default_worker_threshold() {
    if read_worker_threshold().is_some() {
        return;
    }
    if let Some(value) = auto_worker_threshold() {
        store_worker_threshold(value);
    }
}

#[cfg(feature = "hydrate")]
pub(super) fn clamp_worker_threshold(value: usize) -> usize {
    value.clamp(MIN_WORKER_THRESHOLD, MAX_WORKER_THRESHOLD)
}

#[cfg(feature = "hydrate")]
pub(super) fn recommend_worker_threshold(result: &AiWorkerBenchmark) -> Option<usize> {
    let (direct, worker) = match (result.direct_ms, result.worker_ms) {
        (Some(direct), Some(worker)) => (direct, worker),
        _ => return None,
    };
    let delta_ratio = (direct - worker).abs() / direct.max(1.0);
    if delta_ratio < 0.05 {
        return None;
    }
    let floats = result.floats.max(1);
    let suggested = if worker < direct {
        (floats as f64 * 0.75) as usize
    } else {
        (floats as f64 * 1.25) as usize
    };
    Some(clamp_worker_threshold(suggested))
}

#[cfg(feature = "hydrate")]
pub(super) fn store_ai_telemetry_snapshot(ann_cap: Option<&AnnCapDiagnostics>) {
    if browser_storage().is_none() {
        return;
    }
    let caps = detect_ai_capabilities();
    let worker_status = worker_failure_status();
    let payload = serde_json::json!({
        "timestampMs": js_sys::Date::now(),
        "annCap": ann_cap,
        "annCapOverrideMb": ann_cap_override_mb(),
        "workerThreshold": read_worker_threshold(),
        "workerMaxFloats": read_worker_max_floats(),
        "workerFailureUntilMs": worker_status.cooldown_until_ms,
        "workerFailureRemainingMs": worker_status.cooldown_remaining_ms,
        "workerFailureReason": worker_status.last_error,
        "webgpuAvailable": caps.webgpu_available,
        "webgpuEnabled": caps.webgpu_enabled,
        "webgpuWorker": caps.webgpu_worker,
        "webnn": caps.webnn,
        "threads": caps.threads,
        "aiConfigVersion": ai_config_version(),
        "aiConfigGeneratedAt": ai_config_generated_at(),
        "aiConfigSeeded": Some(ai_config_seeded()),
        "embeddingSampleEnabled": Some(embedding_sample_enabled()),
    });
    storage_set_json(AI_TELEMETRY_KEY, &payload);
}

#[cfg(feature = "hydrate")]
pub fn load_ai_telemetry_snapshot() -> Option<AiTelemetrySnapshot> {
    let payload = storage_get(AI_TELEMETRY_KEY)?;
    match serde_json::from_str::<AiTelemetrySnapshot>(&payload) {
        Ok(snapshot) => Some(snapshot),
        Err(err) => {
            web_sys::console::warn_1(&wasm_bindgen::JsValue::from_str(&format!(
                "Failed to parse AI telemetry snapshot: {err}"
            )));
            None
        }
    }
}

#[cfg(feature = "hydrate")]
pub(super) fn record_ai_warning(event: &str, details: Option<String>) {
    if browser_storage().is_none() {
        return;
    }
    let mut events: Vec<AiWarningEvent> =
        storage_get_json(AI_WARNING_EVENTS_KEY).unwrap_or_default();
    events.push(AiWarningEvent {
        timestamp_ms: js_sys::Date::now(),
        event: event.to_string(),
        details,
    });
    if events.len() > AI_WARNING_EVENTS_LIMIT {
        let excess = events.len() - AI_WARNING_EVENTS_LIMIT;
        events.drain(0..excess);
    }
    storage_set_json(AI_WARNING_EVENTS_KEY, &events);
}

#[cfg(not(feature = "hydrate"))]
pub(super) fn record_ai_warning(_event: &str, _details: Option<String>) {}

#[cfg(feature = "hydrate")]
pub fn load_ai_warning_events() -> Vec<AiWarningEvent> {
    storage_get_json(AI_WARNING_EVENTS_KEY).unwrap_or_default()
}

#[cfg(feature = "hydrate")]
pub(super) async fn fetch_json<T: serde::de::DeserializeOwned>(url: &str) -> Option<T> {
    use wasm_bindgen::JsCast;
    use wasm_bindgen_futures::JsFuture;
    use web_sys::Response;

    let window = web_sys::window()?;
    let resp_value = JsFuture::from(window.fetch_with_str(url)).await.ok()?;
    let resp: Response = resp_value.dyn_into().ok()?;
    if !resp.ok() {
        return None;
    }
    let json = JsFuture::from(resp.json().ok()?).await.ok()?;
    serde_wasm_bindgen::from_value(json).ok()
}

#[cfg(feature = "hydrate")]
pub async fn fetch_ai_config_meta() -> Option<AiConfigMeta> {
    fetch_json::<AiConfigMeta>(AI_CONFIG_URL).await
}

#[cfg(feature = "hydrate")]
pub fn sync_ai_config_meta(version: Option<&str>, generated_at: Option<&str>) -> bool {
    if browser_storage().is_none() {
        return false;
    }
    if let Some(version) = version {
        storage_set(AI_CONFIG_VERSION_KEY, version);
    }
    if let Some(generated_at) = generated_at {
        storage_set(AI_CONFIG_GENERATED_AT_KEY, generated_at);
    }
    storage_set(AI_CONFIG_SEEDED_KEY, "1");
    true
}

#[cfg(feature = "hydrate")]
pub(super) async fn fetch_f32_array_with_cap(url: &str, cap_bytes: u64) -> Option<Vec<f32>> {
    use wasm_bindgen::JsCast;
    use wasm_bindgen_futures::JsFuture;
    use web_sys::Response;

    let window = web_sys::window()?;
    let resp_value = JsFuture::from(window.fetch_with_str(url)).await.ok()?;
    let resp: Response = resp_value.dyn_into().ok()?;
    if !resp.ok() {
        record_ai_warning(
            "ann_index_fetch_failed",
            Some(format!("{url} status {}", resp.status())),
        );
        return None;
    }
    if cap_bytes > 0 {
        if let Ok(Some(value)) = resp.headers().get("Content-Length") {
            if let Ok(len) = value.parse::<u64>() {
                if len > cap_bytes {
                    web_sys::console::warn_1(&wasm_bindgen::JsValue::from_str(&format!(
                        "ANN index fetch skipped ({} MB > cap).",
                        len as f64 / 1_000_000.0
                    )));
                    record_ai_warning(
                        "ann_index_fetch_skipped_over_cap",
                        Some(format!("{len} bytes > {cap_bytes} bytes")),
                    );
                    return None;
                }
            }
        }
    }
    let buffer = JsFuture::from(resp.array_buffer().ok()?).await.ok()?;
    let array = js_sys::Float32Array::new(&buffer);
    let array_bytes = array.length() as u64 * 4;
    if cap_bytes > 0 && array_bytes > cap_bytes {
        web_sys::console::warn_1(&wasm_bindgen::JsValue::from_str(&format!(
            "ANN index over cap after download ({} MB > cap).",
            array_bytes as f64 / 1_000_000.0
        )));
        record_ai_warning(
            "ann_index_over_cap_after_download",
            Some(format!("{array_bytes} bytes > {cap_bytes} bytes")),
        );
        return None;
    }
    let mut out = vec![0.0f32; array.length() as usize];
    array.copy_to(&mut out);
    Some(out)
}

#[cfg(feature = "hydrate")]
pub async fn load_ann_meta() -> Option<dmb_core::AnnIndexMeta> {
    let mut meta = dmb_idb::get_ann_index("default").await.ok().flatten();
    if meta.is_none() {
        let fetched = fetch_json::<dmb_core::AnnIndexMeta>("/data/ann-index.json").await?;
        let _ = dmb_idb::store_ann_index(&fetched).await;
        meta = Some(fetched);
    }
    meta
}

#[cfg(feature = "hydrate")]
pub(super) fn default_tuning() -> AiTuning {
    AiTuning {
        probe_override: None,
        target_latency_ms: 12.0,
        last_latency_ms: None,
    }
}

#[cfg(feature = "hydrate")]
pub async fn load_ai_tuning() -> AiTuning {
    if let Some(tuning) = storage_get_json::<AiTuning>(AI_TUNING_KEY) {
        return tuning;
    }
    default_tuning()
}

#[cfg(feature = "hydrate")]
pub async fn store_ai_tuning(tuning: &AiTuning) {
    storage_set_json(AI_TUNING_KEY, tuning);
}

#[cfg(feature = "hydrate")]
const BENCHMARK_HISTORY_KEY: &str = "dmb-ai-benchmark-history";
#[cfg(feature = "hydrate")]
const BENCHMARK_HISTORY_LIMIT: usize = 12;

#[cfg(feature = "hydrate")]
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct AiConfigSeed {
    #[serde(default)]
    version: Option<String>,
    #[serde(default)]
    generated_at: Option<String>,
    #[serde(default)]
    tuning: Option<AiTuning>,
    #[serde(default)]
    benchmark_history: Option<Vec<AiBenchmarkSample>>,
    #[serde(default)]
    worker_threshold_default: Option<usize>,
    #[serde(default)]
    ann_cap_override_mb: Option<u64>,
}

#[cfg(feature = "hydrate")]
pub(super) fn load_benchmark_history() -> Vec<AiBenchmarkSample> {
    storage_get_json(BENCHMARK_HISTORY_KEY).unwrap_or_default()
}

#[cfg(feature = "hydrate")]
fn apply_ai_config_seed(storage: &web_sys::Storage, seed: AiConfigSeed, overwrite: bool) {
    let should_set = |key: &str| overwrite || storage.get_item(key).ok().flatten().is_none();
    if should_set(AI_CONFIG_VERSION_KEY) {
        if let Some(version) = seed.version.as_ref() {
            let _ = storage.set_item(AI_CONFIG_VERSION_KEY, version);
        }
    }
    if should_set(AI_CONFIG_GENERATED_AT_KEY) {
        if let Some(generated_at) = seed.generated_at.as_ref() {
            let _ = storage.set_item(AI_CONFIG_GENERATED_AT_KEY, generated_at);
        }
    }
    if should_set(AI_TUNING_KEY) {
        if let Some(tuning) = seed.tuning {
            if let Ok(payload) = serde_json::to_string(&tuning) {
                let _ = storage.set_item(AI_TUNING_KEY, &payload);
            }
        }
    }
    if should_set(BENCHMARK_HISTORY_KEY) {
        if let Some(history) = seed.benchmark_history {
            if let Ok(payload) = serde_json::to_string(&history) {
                let _ = storage.set_item(BENCHMARK_HISTORY_KEY, &payload);
            }
        }
    }
    if read_worker_threshold().is_none() || overwrite {
        if let Some(default_threshold) = seed.worker_threshold_default {
            store_worker_threshold(default_threshold);
        }
    }
    if read_ann_cap_override_mb().is_none() || overwrite {
        if let Some(override_mb) = seed.ann_cap_override_mb {
            set_ann_cap_override_mb(Some(override_mb));
        }
    }
    let _ = storage.set_item(AI_CONFIG_SEEDED_KEY, "1");
}

#[cfg(feature = "hydrate")]
pub(super) async fn maybe_seed_ai_config() {
    let Some(storage) = browser_storage() else {
        return;
    };
    if matches!(storage_get(AI_CONFIG_SEEDED_KEY).as_deref(), Some("1")) {
        return;
    }
    let seed = match fetch_json::<AiConfigSeed>(AI_CONFIG_URL).await {
        Some(seed) => seed,
        None => return,
    };
    apply_ai_config_seed(&storage, seed, false);
}

#[cfg(feature = "hydrate")]
pub async fn refresh_ai_config() -> bool {
    let Some(storage) = browser_storage() else {
        return false;
    };
    let seed = match fetch_json::<AiConfigSeed>(AI_CONFIG_URL).await {
        Some(seed) => seed,
        None => return false,
    };
    apply_ai_config_seed(&storage, seed, true);
    true
}

#[cfg(feature = "hydrate")]
pub(super) fn should_run_worker_benchmark() -> bool {
    browser_storage().is_some() && storage_get(WEBGPU_WORKER_BENCH_KEY).is_none()
}

#[cfg(feature = "hydrate")]
pub(super) fn mark_worker_benchmark_ran() {
    if browser_storage().is_some() {
        storage_set(WEBGPU_WORKER_BENCH_KEY, &js_sys::Date::now().to_string());
    }
}

#[cfg(feature = "hydrate")]
pub fn ai_config_seeded() -> bool {
    matches!(storage_get(AI_CONFIG_SEEDED_KEY).as_deref(), Some("1"))
}

#[cfg(feature = "hydrate")]
pub fn ai_config_version() -> Option<String> {
    storage_get(AI_CONFIG_VERSION_KEY)
}

#[cfg(feature = "hydrate")]
pub fn ai_config_generated_at() -> Option<String> {
    storage_get(AI_CONFIG_GENERATED_AT_KEY)
}

#[cfg(feature = "hydrate")]
pub fn webgpu_worker_bench_timestamp() -> Option<f64> {
    storage_parse(WEBGPU_WORKER_BENCH_KEY)
}

#[cfg(feature = "hydrate")]
pub fn embedding_sample_enabled() -> bool {
    matches!(storage_get(EMBEDDING_SAMPLE_KEY).as_deref(), Some("1"))
}

#[cfg(feature = "hydrate")]
pub fn set_embedding_sample_enabled(enabled: bool) {
    if browser_storage().is_none() {
        return;
    }
    storage_set(EMBEDDING_SAMPLE_KEY, if enabled { "1" } else { "0" });
}

#[cfg(feature = "hydrate")]
pub fn benchmark_history() -> Vec<AiBenchmarkSample> {
    load_benchmark_history()
}

#[cfg(feature = "hydrate")]
pub(super) fn store_benchmark_history(samples: &[AiBenchmarkSample]) {
    if browser_storage().is_none() {
        return;
    }
    storage_set_json(BENCHMARK_HISTORY_KEY, samples);
}

#[cfg(feature = "hydrate")]
pub fn store_benchmark_sample(
    full: Option<AiBenchmark>,
    subset: Option<AiSubsetBenchmark>,
    worker: Option<AiWorkerBenchmark>,
) {
    if full.is_none() && subset.is_none() && worker.is_none() {
        return;
    }
    let mut history = load_benchmark_history();
    history.push(AiBenchmarkSample {
        timestamp_ms: js_sys::Date::now(),
        full,
        subset,
        worker,
    });
    if history.len() > BENCHMARK_HISTORY_LIMIT {
        let trim = history.len() - BENCHMARK_HISTORY_LIMIT;
        history.drain(0..trim);
    }
    store_benchmark_history(&history);
    store_ai_telemetry_snapshot(ann_cap_diagnostics().as_ref());
}

#[cfg(feature = "hydrate")]
pub(super) fn benchmark_latency_ms(sample: &AiBenchmarkSample) -> Option<f64> {
    if let Some(subset) = &sample.subset {
        return Some(subset.gpu_ms.unwrap_or(subset.cpu_ms));
    }
    if let Some(full) = &sample.full {
        return Some(full.gpu_ms.unwrap_or(full.cpu_ms));
    }
    None
}

#[cfg(feature = "hydrate")]
pub fn suggest_target_latency_from_history() -> Option<f64> {
    let mut latencies: Vec<f64> = load_benchmark_history()
        .iter()
        .filter_map(benchmark_latency_ms)
        .collect();
    if latencies.is_empty() {
        return None;
    }
    latencies.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
    let percentile = 0.75_f64;
    let raw_index = ((latencies.len().saturating_sub(1) as f64) * percentile).ceil() as usize;
    let raw = latencies[raw_index.min(latencies.len() - 1)];
    let target = (raw * 1.15).clamp(6.0, 40.0);
    Some(target)
}

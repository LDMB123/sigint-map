use super::*;

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
fn load_benchmark_history() -> Vec<AiBenchmarkSample> {
    local_storage_json(BENCHMARK_HISTORY_KEY).unwrap_or_default()
}

#[cfg(feature = "hydrate")]
fn should_set_seed_storage_key(storage: &web_sys::Storage, key: &str, overwrite: bool) -> bool {
    overwrite || storage.get_item(key).ok().flatten().is_none()
}

#[cfg(feature = "hydrate")]
fn set_seed_string_field(
    storage: &web_sys::Storage,
    key: &str,
    value: Option<&str>,
    overwrite: bool,
) {
    if !should_set_seed_storage_key(storage, key, overwrite) {
        return;
    }
    if let Some(value) = value {
        set_storage_item(storage, key, value);
    }
}

#[cfg(feature = "hydrate")]
fn set_seed_json_field<T: Serialize>(
    storage: &web_sys::Storage,
    key: &str,
    value: Option<&T>,
    overwrite: bool,
) {
    if !should_set_seed_storage_key(storage, key, overwrite) {
        return;
    }
    if let Some(value) = value {
        set_storage_json(storage, key, value);
    }
}

#[cfg(feature = "hydrate")]
fn apply_ai_config_seed(storage: &web_sys::Storage, seed: AiConfigSeed, overwrite: bool) {
    set_seed_string_field(
        storage,
        AI_CONFIG_VERSION_KEY,
        seed.version.as_deref(),
        overwrite,
    );
    set_seed_string_field(
        storage,
        AI_CONFIG_GENERATED_AT_KEY,
        seed.generated_at.as_deref(),
        overwrite,
    );
    set_seed_json_field(storage, "dmb-ai-tuning", seed.tuning.as_ref(), overwrite);
    set_seed_json_field(
        storage,
        BENCHMARK_HISTORY_KEY,
        seed.benchmark_history.as_ref(),
        overwrite,
    );
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
    set_storage_item(storage, AI_CONFIG_SEEDED_KEY, "1");
}

#[cfg(feature = "hydrate")]
pub(crate) async fn fetch_and_apply_ai_config_seed(overwrite: bool) -> bool {
    let Some(storage) = local_storage() else {
        return false;
    };
    let seed = match crate::browser::http::fetch_json::<AiConfigSeed>(AI_CONFIG_URL).await {
        Some(seed) => seed,
        None => return false,
    };
    apply_ai_config_seed(&storage, seed, overwrite);
    true
}

#[cfg(feature = "hydrate")]
pub async fn refresh_ai_config() -> bool {
    fetch_and_apply_ai_config_seed(true).await
}

#[cfg(feature = "hydrate")]
pub fn ai_config_seeded() -> bool {
    local_storage_flag_enabled(AI_CONFIG_SEEDED_KEY)
}

#[derive(Debug, Clone, Default)]
pub struct AiLocalStateSnapshot {
    pub worker_threshold: Option<usize>,
    pub worker_threshold_raw: Option<String>,
    pub ann_cap_override_mb: Option<u64>,
    pub ai_config_seeded: bool,
    pub ai_config_version: Option<String>,
    pub ai_config_generated_at: Option<String>,
    pub embedding_sample_enabled: bool,
    pub ai_warnings: Vec<AiWarningEvent>,
    pub worker_bench_timestamp: Option<f64>,
    pub webgpu_disabled: bool,
}

#[cfg(feature = "hydrate")]
pub fn local_state_snapshot() -> AiLocalStateSnapshot {
    with_local_storage(|storage| {
        let worker_threshold_raw = storage_item(storage, WORKER_THRESHOLD_KEY);
        let worker_threshold = parse_worker_threshold(worker_threshold_raw.clone());

        let ann_cap_override_mb = storage_item(storage, ANN_CAP_OVERRIDE_KEY)
            .and_then(|raw| raw.parse::<u64>().ok())
            .map(|mb| mb.clamp(MIN_ANN_CAP_MB, MAX_ANN_CAP_MB));

        let ai_config_seeded = matches!(
            storage_item(storage, AI_CONFIG_SEEDED_KEY).as_deref(),
            Some("1")
        );
        let ai_config_version = storage_item(storage, AI_CONFIG_VERSION_KEY);
        let ai_config_generated_at = storage_item(storage, AI_CONFIG_GENERATED_AT_KEY);
        let embedding_sample_enabled = matches!(
            storage_item(storage, EMBEDDING_SAMPLE_KEY).as_deref(),
            Some("1")
        );
        let ai_warnings = storage_item(storage, AI_WARNING_EVENTS_KEY)
            .and_then(|payload| serde_json::from_str::<Vec<AiWarningEvent>>(&payload).ok())
            .unwrap_or_default();
        let worker_bench_timestamp =
            storage_item(storage, WEBGPU_WORKER_BENCH_KEY).and_then(|raw| raw.parse::<f64>().ok());
        let webgpu_disabled = parse_webgpu_disabled(storage_item(storage, WEBGPU_DISABLE_KEY));

        AiLocalStateSnapshot {
            worker_threshold,
            worker_threshold_raw,
            ann_cap_override_mb,
            ai_config_seeded,
            ai_config_version,
            ai_config_generated_at,
            embedding_sample_enabled,
            ai_warnings,
            worker_bench_timestamp,
            webgpu_disabled,
        }
    })
    .unwrap_or_default()
}

#[cfg(not(feature = "hydrate"))]
pub fn local_state_snapshot() -> AiLocalStateSnapshot {
    AiLocalStateSnapshot::default()
}

#[cfg(feature = "hydrate")]
pub fn ai_config_version() -> Option<String> {
    local_storage_item(AI_CONFIG_VERSION_KEY)
}

#[cfg(not(feature = "hydrate"))]
pub fn ai_config_version() -> Option<String> {
    None
}

#[cfg(feature = "hydrate")]
pub fn ai_config_generated_at() -> Option<String> {
    local_storage_item(AI_CONFIG_GENERATED_AT_KEY)
}

#[cfg(not(feature = "hydrate"))]
pub fn ai_config_generated_at() -> Option<String> {
    None
}

#[cfg(feature = "hydrate")]
pub fn webgpu_worker_bench_timestamp() -> Option<f64> {
    local_storage_parse(WEBGPU_WORKER_BENCH_KEY)
}

#[cfg(not(feature = "hydrate"))]
pub fn webgpu_worker_bench_timestamp() -> Option<f64> {
    None
}

#[cfg(feature = "hydrate")]
pub fn embedding_sample_enabled() -> bool {
    local_storage_flag_enabled(EMBEDDING_SAMPLE_KEY)
}

#[cfg(not(feature = "hydrate"))]
pub fn embedding_sample_enabled() -> bool {
    false
}

#[cfg(feature = "hydrate")]
pub fn set_embedding_sample_enabled(enabled: bool) {
    set_local_storage_flag(EMBEDDING_SAMPLE_KEY, enabled);
}

#[cfg(not(feature = "hydrate"))]
pub fn set_embedding_sample_enabled(_enabled: bool) {}

#[cfg(feature = "hydrate")]
pub fn store_ai_tuning(tuning: &AiTuning) {
    set_local_storage_json("dmb-ai-tuning", tuning);
}

#[cfg(not(feature = "hydrate"))]
pub fn store_ai_tuning(_tuning: &AiTuning) {}

#[cfg(feature = "hydrate")]
pub fn benchmark_history() -> Vec<AiBenchmarkSample> {
    load_benchmark_history()
}

#[cfg(not(feature = "hydrate"))]
pub fn benchmark_history() -> Vec<AiBenchmarkSample> {
    Vec::new()
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
    set_local_storage_json(BENCHMARK_HISTORY_KEY, &history);
    store_ai_telemetry_snapshot(ann_cap_diagnostics().as_ref());
}

#[cfg(not(feature = "hydrate"))]
pub fn store_benchmark_sample(
    _full: Option<AiBenchmark>,
    _subset: Option<AiSubsetBenchmark>,
    _worker: Option<AiWorkerBenchmark>,
) {
}

#[cfg(feature = "hydrate")]
pub fn suggest_target_latency_from_history() -> Option<f64> {
    let mut latencies: Vec<f64> = load_benchmark_history()
        .iter()
        .filter_map(|sample| {
            if let Some(subset) = &sample.subset {
                return Some(subset.gpu_ms.unwrap_or(subset.cpu_ms));
            }
            sample
                .full
                .as_ref()
                .map(|full| full.gpu_ms.unwrap_or(full.cpu_ms))
        })
        .collect();
    if latencies.is_empty() {
        return None;
    }
    latencies.sort_unstable_by(|a, b| a.total_cmp(b));
    let raw_index = latencies.len().saturating_mul(3) / 4;
    let index = raw_index.min(latencies.len().saturating_sub(1));
    latencies.get(index).copied()
}

#[cfg(not(feature = "hydrate"))]
pub fn suggest_target_latency_from_history() -> Option<f64> {
    None
}

#[cfg(not(feature = "hydrate"))]
#[allow(clippy::unused_async)]
pub async fn refresh_ai_config() -> bool {
    false
}

#[cfg(not(feature = "hydrate"))]
pub fn ai_config_seeded() -> bool {
    false
}

use serde::{Deserialize, Serialize};
use std::sync::Arc;

#[cfg(feature = "hydrate")]
use dmb_core::EMBEDDING_DIM;
use dmb_core::{hashed_embedding, AnnIvfIndex, EmbeddingRecord, SearchResult};

#[cfg(feature = "hydrate")]
use leptos::task::spawn_local;

#[cfg(feature = "hydrate")]
use dmb_core::{EmbeddingChunk, EmbeddingManifest, CORE_SCHEMA_VERSION};
#[cfg(feature = "hydrate")]
use once_cell::sync::OnceCell;
#[cfg(feature = "hydrate")]
use wasm_bindgen::prelude::wasm_bindgen;
#[cfg(feature = "hydrate")]
use wasm_bindgen::JsValue;

#[derive(Debug, Clone, Copy, Serialize, Deserialize, Default)]
pub struct AiCapabilities {
    pub webgpu_available: bool,
    pub webgpu_enabled: bool,
    pub webgpu_worker: bool,
    pub webnn: bool,
    pub wasm_simd: bool,
    pub threads: bool,
}

#[cfg(feature = "hydrate")]
#[derive(Debug, Clone, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct WebgpuProbeResult {
    #[serde(default)]
    available: bool,
}

#[cfg(feature = "hydrate")]
#[derive(Debug, Clone, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct WebgpuWarmResult {
    #[serde(default)]
    warmed: bool,
    #[serde(default)]
    reason: Option<String>,
}

#[cfg(feature = "hydrate")]
#[derive(Debug, Clone, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct WorkerLimitsResult {
    #[serde(default)]
    max_floats: Option<f64>,
}

#[cfg(feature = "hydrate")]
#[derive(Debug, Clone, Copy)]
enum WebgpuScoreFn {
    Direct,
    Worker,
}

#[cfg(feature = "hydrate")]
#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = window, js_name = dmbWebgpuProbe, catch)]
    fn dmb_webgpu_probe() -> Result<js_sys::Promise, JsValue>;

    #[wasm_bindgen(js_namespace = window, js_name = dmbWarmWebgpuWorker, catch)]
    fn dmb_warm_webgpu_worker() -> Result<js_sys::Promise, JsValue>;

    #[wasm_bindgen(js_namespace = window, js_name = dmbGetWorkerLimits, catch)]
    fn dmb_get_worker_limits() -> Result<JsValue, JsValue>;

    #[wasm_bindgen(js_namespace = window, js_name = dmbClearWorkerFailureStatus, catch)]
    fn dmb_clear_worker_failure_status() -> Result<(), JsValue>;

    #[wasm_bindgen(js_namespace = window, js_name = dmbSetWorkerThreshold, catch)]
    fn dmb_set_worker_threshold(value: f64) -> Result<(), JsValue>;

    #[wasm_bindgen(js_namespace = window, js_name = dmbWebgpuScores, catch)]
    fn dmb_webgpu_scores_js(
        query: &js_sys::Float32Array,
        matrix: &js_sys::Float32Array,
        dim: f64,
    ) -> Result<js_sys::Promise, JsValue>;

    #[wasm_bindgen(js_namespace = window, js_name = dmbWebgpuScoresWorker, catch)]
    fn dmb_webgpu_scores_worker_js(
        query: &js_sys::Float32Array,
        matrix: &js_sys::Float32Array,
        dim: f64,
    ) -> Result<js_sys::Promise, JsValue>;
}

#[cfg(feature = "hydrate")]
fn js_value_exists(value: &JsValue) -> bool {
    !value.is_null() && !value.is_undefined()
}

#[cfg(feature = "hydrate")]
fn get_js_property(target: &JsValue, name: &str) -> JsValue {
    js_sys::Reflect::get(target, &JsValue::from_str(name)).unwrap_or(JsValue::UNDEFINED)
}

#[cfg(feature = "hydrate")]
fn navigator_property(navigator: &web_sys::Navigator, name: &str) -> JsValue {
    get_js_property(navigator.as_ref(), name)
}

#[cfg(feature = "hydrate")]
fn window_property(window: &web_sys::Window, name: &str) -> JsValue {
    get_js_property(window.as_ref(), name)
}

#[cfg(feature = "hydrate")]
fn window_cross_origin_isolated(window: &web_sys::Window) -> bool {
    window_property(window, "crossOriginIsolated")
        .as_bool()
        .unwrap_or(false)
}

#[cfg(feature = "hydrate")]
pub fn detect_ai_capabilities() -> AiCapabilities {
    let Some(window) = web_sys::window() else {
        return AiCapabilities::default();
    };
    ensure_default_worker_threshold();
    let navigator = window.navigator();

    let webgpu = js_value_exists(&navigator_property(&navigator, "gpu"));
    let webgpu_helper = window_property(&window, "dmbWebgpuScores").is_function();
    let webgpu_available = webgpu && webgpu_helper;
    if webgpu && !webgpu_helper {
        if let Ok(Some(storage)) = window.local_storage() {
            if storage
                .get_item(WEBGPU_HELPER_WARN_KEY)
                .ok()
                .flatten()
                .is_none()
            {
                let _ = storage.set_item(WEBGPU_HELPER_WARN_KEY, "1");
                record_ai_warning(
                    "webgpu_helper_missing",
                    Some("navigator.gpu present but WebGPU helper missing".to_string()),
                );
            }
        }
    }
    let webgpu_disabled = read_webgpu_disabled().unwrap_or(false);
    let webgpu_worker = window_property(&window, "dmbWebgpuScoresWorker").is_function();
    let webnn = js_value_exists(&navigator_property(&navigator, "ml"));
    let threads = window_cross_origin_isolated(&window);

    let webgpu_enabled = webgpu_available && !webgpu_disabled;
    AiCapabilities {
        webgpu_available,
        webgpu_enabled,
        webgpu_worker: webgpu_worker && webgpu_enabled,
        webnn,
        wasm_simd: true,
        threads,
    }
}

#[cfg(not(feature = "hydrate"))]
pub fn detect_ai_capabilities() -> AiCapabilities {
    AiCapabilities::default()
}

#[cfg(feature = "hydrate")]
pub async fn probe_webgpu_device() -> Option<bool> {
    use wasm_bindgen_futures::JsFuture;

    let promise = dmb_webgpu_probe().ok()?;
    let result = JsFuture::from(promise).await.ok()?;
    serde_wasm_bindgen::from_value::<WebgpuProbeResult>(result)
        .ok()
        .map(|probe| probe.available)
}

#[cfg(feature = "hydrate")]
async fn warm_webgpu_worker() {
    use wasm_bindgen_futures::JsFuture;

    let Ok(promise) = dmb_warm_webgpu_worker() else {
        return;
    };
    let result = JsFuture::from(promise).await.ok();
    if let Some(value) = result {
        if let Ok(status) = serde_wasm_bindgen::from_value::<WebgpuWarmResult>(value) {
            if !status.warmed {
                record_ai_warning("webgpu_worker_warm_failed", status.reason);
            }
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AiBenchmark {
    pub sample_count: usize,
    pub cpu_ms: f64,
    pub gpu_ms: Option<f64>,
    pub backend: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AiSubsetBenchmark {
    pub candidate_count: usize,
    pub cpu_ms: f64,
    pub gpu_ms: Option<f64>,
    pub backend: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AiWorkerBenchmark {
    pub vector_count: usize,
    pub dim: usize,
    pub floats: usize,
    pub direct_ms: Option<f64>,
    pub worker_ms: Option<f64>,
    pub winner: Option<String>,
    pub recommended_threshold: Option<usize>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AiBenchmarkSample {
    pub timestamp_ms: f64,
    #[serde(default)]
    pub full: Option<AiBenchmark>,
    #[serde(default)]
    pub subset: Option<AiSubsetBenchmark>,
    #[serde(default)]
    pub worker: Option<AiWorkerBenchmark>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct WorkerFailureStatus {
    pub cooldown_until_ms: Option<f64>,
    pub cooldown_remaining_ms: Option<f64>,
    pub last_error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ProbeCandidateMetric {
    pub probe_count: u32,
    pub candidate_count: usize,
    pub avg_latency_ms: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ProbeTuningResult {
    pub selected_probe: u32,
    pub target_latency_ms: f64,
    pub metrics: Vec<ProbeCandidateMetric>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AiTuning {
    pub probe_override: Option<u32>,
    pub target_latency_ms: f64,
    pub last_latency_ms: Option<f64>,
}

#[derive(Debug, Clone)]
pub struct EmbeddingIndex {
    pub dim: usize,
    pub records: Vec<EmbeddingRecord>,
    pub matrix: Vec<f32>,
    pub ivf: Option<AnnIvfIndex>,
}

#[derive(Debug, Clone)]
pub struct BenchmarkSample {
    pub sample_count: usize,
    pub dim: usize,
    pub query_vec: Vec<f32>,
    pub matrix: Vec<f32>,
}

#[cfg(feature = "hydrate")]
#[derive(Debug, Clone, Serialize, Deserialize)]
struct EmbeddingSampleEntry {
    id: i32,
    kind: String,
    #[serde(default)]
    text: Option<String>,
    #[serde(default)]
    slug: Option<String>,
    #[serde(default)]
    label: Option<String>,
    #[serde(default)]
    vector: Option<Vec<f32>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AnnCapDiagnostics {
    pub cap_bytes: u64,
    #[serde(default)]
    pub cap_override_mb: Option<u64>,
    pub matrix_bytes_before: u64,
    pub matrix_bytes_after: u64,
    #[serde(default)]
    pub ivf_bytes: Option<u64>,
    #[serde(default)]
    pub ivf_cap_bytes: Option<u64>,
    pub vectors_before: usize,
    pub vectors_after: usize,
    pub dim: usize,
    pub ivf_dropped: bool,
    pub used_ann: bool,
    pub capped: bool,
    pub device_memory_gb: Option<f64>,
    pub policy_tier: String,
    #[serde(default)]
    pub chunks_loaded: Option<usize>,
    #[serde(default)]
    pub records_loaded: Option<usize>,
    #[serde(default)]
    pub budget_capped: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct AiTelemetrySnapshot {
    pub timestamp_ms: f64,
    #[serde(default)]
    pub ann_cap: Option<AnnCapDiagnostics>,
    #[serde(default)]
    pub ann_cap_override_mb: Option<u64>,
    #[serde(default)]
    pub worker_threshold: Option<usize>,
    #[serde(default)]
    pub worker_max_floats: Option<usize>,
    #[serde(default)]
    pub worker_failure_until_ms: Option<f64>,
    #[serde(default)]
    pub worker_failure_remaining_ms: Option<f64>,
    #[serde(default)]
    pub worker_failure_reason: Option<String>,
    #[serde(default)]
    pub webgpu_available: Option<bool>,
    #[serde(default)]
    pub webgpu_enabled: Option<bool>,
    #[serde(default)]
    pub webgpu_worker: Option<bool>,
    #[serde(default)]
    pub webnn: Option<bool>,
    #[serde(default)]
    pub threads: Option<bool>,
    #[serde(default)]
    pub ai_config_version: Option<String>,
    #[serde(default)]
    pub ai_config_generated_at: Option<String>,
    #[serde(default)]
    pub ai_config_seeded: Option<bool>,
    #[serde(default)]
    pub embedding_sample_enabled: Option<bool>,
}

const DEFAULT_MAX_MATRIX_BYTES: u64 = 512 * 1024 * 1024;
#[cfg(feature = "hydrate")]
const HIGH_MEM_MAX_MATRIX_BYTES: u64 = 1024 * 1024 * 1024;
const WEBGPU_MATRIX_CAP_BYTES: u64 = 128 * 1024 * 1024;
#[cfg(any(feature = "hydrate", test))]
const MIN_SAMPLE_RECORDS: usize = 500;
#[cfg(feature = "hydrate")]
const MAX_BENCH_SAMPLE_VECTORS: usize = 12_000;
#[cfg(feature = "hydrate")]
const AI_TELEMETRY_KEY: &str = "dmb-ai-telemetry";
#[cfg(feature = "hydrate")]
const WORKER_THRESHOLD_KEY: &str = "dmb-webgpu-worker-threshold";
#[cfg(feature = "hydrate")]
const WEBGPU_DISABLE_KEY: &str = "dmb-webgpu-disabled";
#[cfg(feature = "hydrate")]
const ANN_CAP_OVERRIDE_KEY: &str = "dmb-ann-cap-mb";
#[cfg(feature = "hydrate")]
const WORKER_FAILURE_UNTIL_KEY: &str = "dmb-webgpu-worker-failure-until";
#[cfg(feature = "hydrate")]
const WORKER_FAILURE_REASON_KEY: &str = "dmb-webgpu-worker-failure-reason";
#[cfg(feature = "hydrate")]
const WEBGPU_HELPER_WARN_KEY: &str = "dmb-webgpu-helper-warned";
#[cfg(feature = "hydrate")]
const WORKER_COOLDOWN_WARN_KEY: &str = "dmb-webgpu-worker-cooldown-warned";
#[cfg(feature = "hydrate")]
const AI_CONFIG_SEEDED_KEY: &str = "dmb-ai-config-seeded";
#[cfg(feature = "hydrate")]
const AI_CONFIG_VERSION_KEY: &str = "dmb-ai-config-version";
#[cfg(feature = "hydrate")]
const AI_CONFIG_GENERATED_AT_KEY: &str = "dmb-ai-config-generated-at";
#[cfg(feature = "hydrate")]
const AI_CONFIG_URL: &str = "/data/ai-config.json";
#[cfg(feature = "hydrate")]
const WEBGPU_WORKER_BENCH_KEY: &str = "dmb-webgpu-worker-bench";
#[cfg(feature = "hydrate")]
const EMBEDDING_SAMPLE_KEY: &str = "dmb-embedding-sample";
#[cfg(feature = "hydrate")]
const MIN_WORKER_THRESHOLD: usize = 5_000;
#[cfg(feature = "hydrate")]
const MAX_WORKER_THRESHOLD: usize = 1_000_000;
#[cfg(feature = "hydrate")]
const WORKER_BENCH_MAX_FLOATS: usize = 400_000;
#[cfg(feature = "hydrate")]
const MIN_ANN_CAP_MB: u64 = 128;
#[cfg(feature = "hydrate")]
const MAX_ANN_CAP_MB: u64 = 2048;
#[cfg(any(feature = "hydrate", test))]
const IVF_CAP_RATIO: f64 = 0.15;
#[cfg(any(feature = "hydrate", test))]
const IVF_MIN_CAP_BYTES: u64 = 32 * 1024 * 1024;
#[cfg(any(feature = "hydrate", test))]
const IVF_MAX_CAP_BYTES: u64 = 256 * 1024 * 1024;
#[cfg(feature = "hydrate")]
const AI_WARNING_EVENTS_KEY: &str = "dmb-ai-warning-events";
#[cfg(feature = "hydrate")]
const AI_WARNING_EVENTS_LIMIT: usize = 20;

#[derive(Debug, Clone)]
#[cfg_attr(not(feature = "hydrate"), allow(dead_code))]
struct CapPolicy {
    cap_bytes: u64,
    device_memory_gb: Option<f64>,
    tier: String,
    cap_override_mb: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiWarningEvent {
    pub timestamp_ms: f64,
    pub event: String,
    #[serde(default)]
    pub details: Option<String>,
}

#[cfg(feature = "hydrate")]
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiConfigMeta {
    #[serde(default)]
    pub version: Option<String>,
    #[serde(default)]
    pub generated_at: Option<String>,
}

#[cfg(feature = "hydrate")]
fn cap_policy_from_device_memory(device_memory: Option<f64>) -> CapPolicy {
    let device_memory = device_memory.filter(|v| *v > 0.0);
    let (mut cap_bytes, mut tier) = match device_memory {
        Some(mem) if mem >= 16.0 => (HIGH_MEM_MAX_MATRIX_BYTES, "high-memory".to_string()),
        Some(mem) if mem >= 8.0 => (
            (DEFAULT_MAX_MATRIX_BYTES as f64 * 1.5) as u64,
            "mid-memory".to_string(),
        ),
        Some(_) => (DEFAULT_MAX_MATRIX_BYTES, "baseline".to_string()),
        None => (DEFAULT_MAX_MATRIX_BYTES, "unknown".to_string()),
    };

    let mut cap_override_mb = None;
    if let Some(override_mb) = read_ann_cap_override_mb() {
        cap_bytes = override_mb.saturating_mul(1024 * 1024);
        tier = "override".to_string();
        cap_override_mb = Some(override_mb);
    }

    CapPolicy {
        cap_bytes,
        device_memory_gb: device_memory,
        tier,
        cap_override_mb,
    }
}

#[cfg(feature = "hydrate")]
fn cap_policy_from_navigator() -> CapPolicy {
    let Some(window) = web_sys::window() else {
        return cap_policy_from_device_memory(None);
    };
    let navigator = window.navigator();
    let device_memory = navigator_property(&navigator, "deviceMemory").as_f64();
    cap_policy_from_device_memory(device_memory)
}

#[cfg(not(feature = "hydrate"))]
fn cap_policy_from_navigator() -> CapPolicy {
    CapPolicy {
        cap_bytes: DEFAULT_MAX_MATRIX_BYTES,
        device_memory_gb: None,
        tier: "ssr".to_string(),
        cap_override_mb: None,
    }
}

fn webgpu_matrix_allowed(matrix_bytes: u64, policy_cap: u64) -> bool {
    matrix_bytes <= policy_cap.min(WEBGPU_MATRIX_CAP_BYTES)
}

#[cfg(feature = "hydrate")]
fn cap_embedding_index_inner(
    records: Vec<EmbeddingRecord>,
    matrix: Vec<f32>,
    dim: usize,
    ivf: Option<AnnIvfIndex>,
    use_ann: bool,
) -> (
    Vec<EmbeddingRecord>,
    Vec<f32>,
    Option<AnnIvfIndex>,
    AnnCapDiagnostics,
) {
    let policy = cap_policy_from_navigator();
    cap_embedding_index_with_policy(records, matrix, dim, ivf, use_ann, policy)
}

#[cfg(any(feature = "hydrate", test))]
fn estimate_ivf_bytes(ivf: &AnnIvfIndex) -> u64 {
    let centroid_floats: usize = ivf.centroids.iter().map(std::vec::Vec::len).sum();
    let list_entries: usize = ivf.lists.iter().map(std::vec::Vec::len).sum();
    (centroid_floats as u64 * 4).saturating_add(list_entries as u64 * 4)
}

#[cfg(feature = "hydrate")]
fn estimate_ivf_bytes_from_meta(meta: &dmb_core::AnnIndexMeta) -> Option<u64> {
    let clusters = meta.cluster_count.unwrap_or(0);
    if clusters == 0 || meta.dim == 0 {
        return None;
    }
    let centroid_bytes = (clusters as u64)
        .saturating_mul(meta.dim as u64)
        .saturating_mul(4);
    let list_bytes = (meta.record_count as u64).saturating_mul(4);
    Some(centroid_bytes.saturating_add(list_bytes))
}

#[cfg(any(feature = "hydrate", test))]
fn ivf_cap_bytes_for_matrix(cap_bytes: u64) -> u64 {
    let scaled = (cap_bytes as f64 * IVF_CAP_RATIO) as u64;
    scaled.clamp(IVF_MIN_CAP_BYTES, IVF_MAX_CAP_BYTES)
}

#[cfg(any(feature = "hydrate", test))]
fn target_vectors_for_cap(cap_bytes: u64, dim: usize, record_count: usize) -> usize {
    let max_vectors = (cap_bytes / (dim as u64 * 4)).max(1) as usize;
    max_vectors.max(MIN_SAMPLE_RECORDS).min(record_count.max(1))
}

#[cfg(any(feature = "hydrate", test))]
fn truncate_for_ann_cap(
    mut records: Vec<EmbeddingRecord>,
    mut matrix: Vec<f32>,
    dim: usize,
    target_vectors: usize,
) -> (Vec<EmbeddingRecord>, Vec<f32>) {
    let keep = target_vectors.min(matrix.len() / dim);
    records.truncate(keep);
    matrix.truncate(keep * dim);
    (records, matrix)
}

#[cfg(any(feature = "hydrate", test))]
fn sample_for_cap(
    records: Vec<EmbeddingRecord>,
    matrix: Vec<f32>,
    dim: usize,
    target_vectors: usize,
) -> (Vec<EmbeddingRecord>, Vec<f32>) {
    let total = records.len().max(1);
    let step = ((total as f64) / (target_vectors as f64)).ceil() as usize;
    let mut new_records = Vec::with_capacity(target_vectors);
    let mut new_matrix = Vec::with_capacity(target_vectors * dim);
    for (idx, record) in records.into_iter().enumerate() {
        if idx % step != 0 {
            continue;
        }
        let start = idx * dim;
        let end = start + dim;
        if end > matrix.len() {
            break;
        }
        new_matrix.extend_from_slice(&matrix[start..end]);
        new_records.push(record);
        if new_records.len() >= target_vectors {
            break;
        }
    }
    (new_records, new_matrix)
}

#[cfg(any(feature = "hydrate", test))]
fn cap_embedding_index_with_policy(
    records: Vec<EmbeddingRecord>,
    matrix: Vec<f32>,
    dim: usize,
    mut ivf: Option<AnnIvfIndex>,
    use_ann: bool,
    policy: CapPolicy,
) -> (
    Vec<EmbeddingRecord>,
    Vec<f32>,
    Option<AnnIvfIndex>,
    AnnCapDiagnostics,
) {
    let cap_bytes = policy.cap_bytes;
    let matrix_bytes = matrix.len() as u64 * 4;
    let ivf_bytes = ivf.as_ref().map(estimate_ivf_bytes);
    let ivf_cap_bytes = ivf_bytes.map(|_| ivf_cap_bytes_for_matrix(cap_bytes));
    let mut ivf_dropped = false;
    if let (Some(bytes), Some(cap)) = (ivf_bytes, ivf_cap_bytes) {
        if bytes > cap {
            ivf = None;
            ivf_dropped = true;
            #[cfg(all(feature = "hydrate", target_arch = "wasm32"))]
            record_ai_warning(
                "ivf_cap_exceeded",
                Some(format!("{bytes} bytes > {cap} bytes")),
            );
        }
    }
    let vectors_before = if dim == 0 { 0 } else { matrix.len() / dim };
    let mut diagnostics = AnnCapDiagnostics {
        cap_bytes,
        cap_override_mb: policy.cap_override_mb,
        matrix_bytes_before: matrix_bytes,
        matrix_bytes_after: matrix_bytes,
        ivf_bytes,
        ivf_cap_bytes,
        vectors_before,
        vectors_after: vectors_before,
        dim,
        ivf_dropped,
        used_ann: use_ann,
        capped: false,
        device_memory_gb: policy.device_memory_gb,
        policy_tier: policy.tier.clone(),
        chunks_loaded: None,
        records_loaded: None,
        budget_capped: false,
    };
    if dim == 0 || matrix_bytes <= cap_bytes {
        return (records, matrix, ivf, diagnostics);
    }

    let target_vectors = target_vectors_for_cap(cap_bytes, dim, records.len());

    let (new_records, new_matrix) = if use_ann {
        truncate_for_ann_cap(records, matrix, dim, target_vectors)
    } else {
        sample_for_cap(records, matrix, dim, target_vectors)
    };

    if ivf.is_some() {
        ivf = None;
        ivf_dropped = true;
    }

    let vectors_after = if dim == 0 { 0 } else { new_matrix.len() / dim };
    #[cfg(all(feature = "hydrate", target_arch = "wasm32"))]
    record_ai_warning(
        "ann_cap_exceeded",
        Some(format!("{matrix_bytes} bytes > {cap_bytes} bytes")),
    );
    diagnostics.matrix_bytes_after = new_matrix.len() as u64 * 4;
    diagnostics.vectors_after = vectors_after;
    diagnostics.ivf_dropped = ivf_dropped;
    diagnostics.capped = true;
    diagnostics.budget_capped = true;

    #[cfg(all(feature = "hydrate", target_arch = "wasm32"))]
    web_sys::console::warn_1(&wasm_bindgen::JsValue::from_str(&format!(
        "Embedding matrix capped to {} vectors ({:.1}MB).",
        new_records.len(),
        (new_matrix.len() as f64 * 4.0) / 1_000_000.0
    )));

    (new_records, new_matrix, ivf, diagnostics)
}

#[cfg(feature = "hydrate")]
static EMBEDDING_INDEX: OnceCell<Arc<EmbeddingIndex>> = OnceCell::new();

#[cfg(feature = "hydrate")]
static ANN_CAP_DIAGNOSTICS: OnceCell<AnnCapDiagnostics> = OnceCell::new();

#[cfg(feature = "hydrate")]
static WEBGPU_PROBE_CACHE: OnceCell<bool> = OnceCell::new();

pub fn ann_cap_diagnostics() -> Option<AnnCapDiagnostics> {
    #[cfg(feature = "hydrate")]
    {
        ANN_CAP_DIAGNOSTICS.get().cloned()
    }
    #[cfg(not(feature = "hydrate"))]
    {
        None
    }
}

#[cfg(feature = "hydrate")]
async fn webgpu_probe_ok() -> bool {
    if let Some(value) = WEBGPU_PROBE_CACHE.get() {
        return *value;
    }
    let probed = matches!(probe_webgpu_device().await, Some(true));
    let _ = WEBGPU_PROBE_CACHE.set(probed);
    if !probed {
        record_ai_warning("webgpu_probe_failed", None);
    }
    probed
}

#[cfg(not(feature = "hydrate"))]
async fn webgpu_probe_ok() -> bool {
    false
}

#[cfg(feature = "hydrate")]
fn read_worker_threshold() -> Option<usize> {
    let window = web_sys::window()?;
    let storage = window.local_storage().ok().flatten()?;
    let value = storage.get_item(WORKER_THRESHOLD_KEY).ok().flatten()?;
    value.parse::<usize>().ok()
}

#[cfg(feature = "hydrate")]
fn read_worker_max_floats() -> Option<usize> {
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
fn read_worker_failure_until() -> Option<f64> {
    let window = web_sys::window()?;
    let storage = window.local_storage().ok().flatten()?;
    let value = storage.get_item(WORKER_FAILURE_UNTIL_KEY).ok().flatten()?;
    value.parse::<f64>().ok()
}

#[cfg(feature = "hydrate")]
fn read_worker_failure_reason() -> Option<String> {
    let window = web_sys::window()?;
    let storage = window.local_storage().ok().flatten()?;
    storage.get_item(WORKER_FAILURE_REASON_KEY).ok().flatten()
}

#[cfg(feature = "hydrate")]
pub fn worker_failure_status() -> WorkerFailureStatus {
    let now = js_sys::Date::now();
    let until = read_worker_failure_until();
    let remaining = until.and_then(|ts| if ts <= now { None } else { Some(ts - now) });
    if remaining.is_some() {
        if let Some(window) = web_sys::window() {
            if let Ok(Some(storage)) = window.local_storage() {
                if storage
                    .get_item(WORKER_COOLDOWN_WARN_KEY)
                    .ok()
                    .flatten()
                    .is_none()
                {
                    let _ = storage.set_item(WORKER_COOLDOWN_WARN_KEY, "1");
                    record_ai_warning(
                        "webgpu_worker_cooldown",
                        Some("WebGPU worker in cooldown; using direct scoring".to_string()),
                    );
                }
            }
        }
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
    let Some(window) = web_sys::window() else {
        return;
    };
    if let Ok(Some(storage)) = window.local_storage() {
        let _ = storage.remove_item(WORKER_FAILURE_UNTIL_KEY);
        let _ = storage.remove_item(WORKER_FAILURE_REASON_KEY);
        let _ = storage.remove_item(WORKER_COOLDOWN_WARN_KEY);
    }
    let _ = dmb_clear_worker_failure_status();
}

#[cfg(feature = "hydrate")]
pub fn set_worker_threshold_override(value: Option<usize>) {
    let Some(window) = web_sys::window() else {
        return;
    };
    let Ok(Some(storage)) = window.local_storage() else {
        return;
    };
    match value {
        Some(val) => {
            let clamped = clamp_worker_threshold(val);
            store_worker_threshold(clamped);
        }
        None => {
            let _ = storage.remove_item(WORKER_THRESHOLD_KEY);
            ensure_default_worker_threshold();
        }
    }
}

#[cfg(feature = "hydrate")]
fn read_ann_cap_override_mb() -> Option<u64> {
    let window = web_sys::window()?;
    let storage = window.local_storage().ok().flatten()?;
    let value = storage.get_item(ANN_CAP_OVERRIDE_KEY).ok().flatten()?;
    value
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
    let Some(window) = web_sys::window() else {
        return;
    };
    let Ok(Some(storage)) = window.local_storage() else {
        return;
    };
    match value {
        Some(mb) => {
            let clamped = mb.clamp(MIN_ANN_CAP_MB, MAX_ANN_CAP_MB);
            let _ = storage.set_item(ANN_CAP_OVERRIDE_KEY, &clamped.to_string());
        }
        None => {
            let _ = storage.remove_item(ANN_CAP_OVERRIDE_KEY);
        }
    }
    store_ai_telemetry_snapshot(ann_cap_diagnostics().as_ref());
}

#[cfg(feature = "hydrate")]
fn read_webgpu_disabled() -> Option<bool> {
    let window = web_sys::window()?;
    let storage = window.local_storage().ok()??;
    let value = storage.get_item(WEBGPU_DISABLE_KEY).ok()??;
    Some(value == "1" || value.eq_ignore_ascii_case("true"))
}

#[cfg(feature = "hydrate")]
pub fn set_webgpu_disabled(disabled: bool) {
    let Some(window) = web_sys::window() else {
        return;
    };
    let Ok(Some(storage)) = window.local_storage() else {
        return;
    };
    let value = if disabled { "1" } else { "0" };
    let _ = storage.set_item(WEBGPU_DISABLE_KEY, value);
}

#[cfg(feature = "hydrate")]
fn store_worker_threshold(value: usize) {
    let Some(window) = web_sys::window() else {
        return;
    };
    let Ok(Some(storage)) = window.local_storage() else {
        return;
    };
    let _ = storage.set_item(WORKER_THRESHOLD_KEY, &value.to_string());
    let _ = dmb_set_worker_threshold(value as f64);
}

#[cfg(feature = "hydrate")]
fn auto_worker_threshold() -> Option<usize> {
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
fn ensure_default_worker_threshold() {
    if read_worker_threshold().is_some() {
        return;
    }
    if let Some(value) = auto_worker_threshold() {
        store_worker_threshold(value);
    }
}

#[cfg(feature = "hydrate")]
fn clamp_worker_threshold(value: usize) -> usize {
    value.clamp(MIN_WORKER_THRESHOLD, MAX_WORKER_THRESHOLD)
}

#[cfg(feature = "hydrate")]
fn recommend_worker_threshold(result: &AiWorkerBenchmark) -> Option<usize> {
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
fn store_ai_telemetry_snapshot(ann_cap: Option<&AnnCapDiagnostics>) {
    let Some(window) = web_sys::window() else {
        return;
    };
    let Ok(Some(storage)) = window.local_storage() else {
        return;
    };
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
    if let Ok(json) = serde_json::to_string(&payload) {
        let _ = storage.set_item(AI_TELEMETRY_KEY, &json);
    }
}

#[cfg(feature = "hydrate")]
pub fn load_ai_telemetry_snapshot() -> Option<AiTelemetrySnapshot> {
    let window = web_sys::window()?;
    let storage = window.local_storage().ok().flatten()?;
    let payload = storage.get_item(AI_TELEMETRY_KEY).ok().flatten()?;
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
fn record_ai_warning(event: &str, details: Option<String>) {
    let Some(window) = web_sys::window() else {
        return;
    };
    let Ok(Some(storage)) = window.local_storage() else {
        return;
    };
    let mut events: Vec<AiWarningEvent> = storage
        .get_item(AI_WARNING_EVENTS_KEY)
        .ok()
        .flatten()
        .and_then(|payload| serde_json::from_str(&payload).ok())
        .unwrap_or_default();
    events.push(AiWarningEvent {
        timestamp_ms: js_sys::Date::now(),
        event: event.to_string(),
        details,
    });
    if events.len() > AI_WARNING_EVENTS_LIMIT {
        let excess = events.len() - AI_WARNING_EVENTS_LIMIT;
        events.drain(0..excess);
    }
    if let Ok(payload) = serde_json::to_string(&events) {
        let _ = storage.set_item(AI_WARNING_EVENTS_KEY, &payload);
    }
}

#[cfg(not(feature = "hydrate"))]
fn record_ai_warning(_event: &str, _details: Option<String>) {}

#[cfg(feature = "hydrate")]
pub fn load_ai_warning_events() -> Vec<AiWarningEvent> {
    let Some(window) = web_sys::window() else {
        return Vec::new();
    };
    let Ok(Some(storage)) = window.local_storage() else {
        return Vec::new();
    };
    storage
        .get_item(AI_WARNING_EVENTS_KEY)
        .ok()
        .flatten()
        .and_then(|payload| serde_json::from_str(&payload).ok())
        .unwrap_or_default()
}

#[cfg(feature = "hydrate")]
async fn fetch_json<T: serde::de::DeserializeOwned>(url: &str) -> Option<T> {
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
    let Some(window) = web_sys::window() else {
        return false;
    };
    let Ok(Some(storage)) = window.local_storage() else {
        return false;
    };
    if let Some(version) = version {
        let _ = storage.set_item(AI_CONFIG_VERSION_KEY, version);
    }
    if let Some(generated_at) = generated_at {
        let _ = storage.set_item(AI_CONFIG_GENERATED_AT_KEY, generated_at);
    }
    let _ = storage.set_item(AI_CONFIG_SEEDED_KEY, "1");
    true
}

#[cfg(feature = "hydrate")]
async fn fetch_f32_array_with_cap(url: &str, cap_bytes: u64) -> Option<Vec<f32>> {
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
fn default_tuning() -> AiTuning {
    AiTuning {
        probe_override: None,
        target_latency_ms: 12.0,
        last_latency_ms: None,
    }
}

#[cfg(feature = "hydrate")]
pub async fn load_ai_tuning() -> AiTuning {
    if let Some(window) = web_sys::window() {
        if let Ok(Some(storage)) = window.local_storage() {
            if let Ok(Some(payload)) = storage.get_item("dmb-ai-tuning") {
                if let Ok(tuning) = serde_json::from_str::<AiTuning>(&payload) {
                    return tuning;
                }
            }
        }
    }
    default_tuning()
}

#[cfg(feature = "hydrate")]
pub async fn store_ai_tuning(tuning: &AiTuning) {
    if let Some(window) = web_sys::window() {
        if let Ok(Some(storage)) = window.local_storage() {
            if let Ok(payload) = serde_json::to_string(tuning) {
                let _ = storage.set_item("dmb-ai-tuning", &payload);
            }
        }
    }
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
fn load_benchmark_history() -> Vec<AiBenchmarkSample> {
    let Some(window) = web_sys::window() else {
        return Vec::new();
    };
    let Ok(Some(storage)) = window.local_storage() else {
        return Vec::new();
    };
    let Ok(Some(payload)) = storage.get_item(BENCHMARK_HISTORY_KEY) else {
        return Vec::new();
    };
    serde_json::from_str::<Vec<AiBenchmarkSample>>(&payload).unwrap_or_default()
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
    if should_set("dmb-ai-tuning") {
        if let Some(tuning) = seed.tuning {
            if let Ok(payload) = serde_json::to_string(&tuning) {
                let _ = storage.set_item("dmb-ai-tuning", &payload);
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
async fn maybe_seed_ai_config() {
    let Some(window) = web_sys::window() else {
        return;
    };
    let Ok(Some(storage)) = window.local_storage() else {
        return;
    };
    if let Ok(Some(value)) = storage.get_item(AI_CONFIG_SEEDED_KEY) {
        if value == "1" {
            return;
        }
    }
    let seed = match fetch_json::<AiConfigSeed>(AI_CONFIG_URL).await {
        Some(seed) => seed,
        None => return,
    };
    apply_ai_config_seed(&storage, seed, false);
}

#[cfg(feature = "hydrate")]
pub async fn refresh_ai_config() -> bool {
    let Some(window) = web_sys::window() else {
        return false;
    };
    let Ok(Some(storage)) = window.local_storage() else {
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
fn should_run_worker_benchmark() -> bool {
    let Some(window) = web_sys::window() else {
        return false;
    };
    let Ok(Some(storage)) = window.local_storage() else {
        return false;
    };
    !matches!(storage.get_item(WEBGPU_WORKER_BENCH_KEY), Ok(Some(_)))
}

#[cfg(feature = "hydrate")]
fn mark_worker_benchmark_ran() {
    if let Some(window) = web_sys::window() {
        if let Ok(Some(storage)) = window.local_storage() {
            let _ = storage.set_item(WEBGPU_WORKER_BENCH_KEY, &js_sys::Date::now().to_string());
        }
    }
}

#[cfg(feature = "hydrate")]
pub fn ai_config_seeded() -> bool {
    let Some(window) = web_sys::window() else {
        return false;
    };
    let Ok(Some(storage)) = window.local_storage() else {
        return false;
    };
    matches!(storage.get_item(AI_CONFIG_SEEDED_KEY), Ok(Some(ref v)) if v == "1")
}

#[cfg(feature = "hydrate")]
pub fn ai_config_version() -> Option<String> {
    let window = web_sys::window()?;
    let storage = window.local_storage().ok().flatten()?;
    storage.get_item(AI_CONFIG_VERSION_KEY).ok().flatten()
}

#[cfg(feature = "hydrate")]
pub fn ai_config_generated_at() -> Option<String> {
    let window = web_sys::window()?;
    let storage = window.local_storage().ok().flatten()?;
    storage.get_item(AI_CONFIG_GENERATED_AT_KEY).ok().flatten()
}

#[cfg(feature = "hydrate")]
pub fn webgpu_worker_bench_timestamp() -> Option<f64> {
    let window = web_sys::window()?;
    let storage = window.local_storage().ok().flatten()?;
    storage
        .get_item(WEBGPU_WORKER_BENCH_KEY)
        .ok()
        .flatten()
        .and_then(|value| value.parse::<f64>().ok())
}

#[cfg(feature = "hydrate")]
pub fn embedding_sample_enabled() -> bool {
    let Some(window) = web_sys::window() else {
        return false;
    };
    let Ok(Some(storage)) = window.local_storage() else {
        return false;
    };
    matches!(storage.get_item(EMBEDDING_SAMPLE_KEY), Ok(Some(ref v)) if v == "1")
}

#[cfg(feature = "hydrate")]
pub fn set_embedding_sample_enabled(enabled: bool) {
    let Some(window) = web_sys::window() else {
        return;
    };
    let Ok(Some(storage)) = window.local_storage() else {
        return;
    };
    let _ = storage.set_item(EMBEDDING_SAMPLE_KEY, if enabled { "1" } else { "0" });
}

#[cfg(feature = "hydrate")]
pub fn benchmark_history() -> Vec<AiBenchmarkSample> {
    load_benchmark_history()
}

#[cfg(feature = "hydrate")]
fn store_benchmark_history(samples: &[AiBenchmarkSample]) {
    let Some(window) = web_sys::window() else {
        return;
    };
    let Ok(Some(storage)) = window.local_storage() else {
        return;
    };
    if let Ok(payload) = serde_json::to_string(samples) {
        let _ = storage.set_item(BENCHMARK_HISTORY_KEY, &payload);
    }
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
fn benchmark_latency_ms(sample: &AiBenchmarkSample) -> Option<f64> {
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

#[cfg(feature = "hydrate")]
pub async fn load_embedding_manifest_meta() -> Option<EmbeddingManifest> {
    let version = CORE_SCHEMA_VERSION;
    if let Some(existing) = dmb_idb::get_embedding_manifest(version)
        .await
        .ok()
        .flatten()
    {
        return Some(existing);
    }
    let fetched = fetch_json::<EmbeddingManifest>("/data/embedding-manifest.json").await?;
    let _ = dmb_idb::store_embedding_manifest(&fetched).await;
    Some(fetched)
}

#[cfg(feature = "hydrate")]
async fn load_ann_vectors(meta: &dmb_core::AnnIndexMeta, expected_dim: u32) -> Option<Vec<f32>> {
    if meta.dim != expected_dim {
        record_ai_warning(
            "ann_index_dim_mismatch",
            Some(format!(
                "meta_dim {} != expected {}",
                meta.dim, expected_dim
            )),
        );
        return None;
    }
    let policy = cap_policy_from_navigator();
    let estimated_bytes = meta.record_count as u64 * meta.dim as u64 * 4;
    if estimated_bytes > policy.cap_bytes {
        web_sys::console::warn_1(&wasm_bindgen::JsValue::from_str(&format!(
            "ANN index too large for device ({} MB > {:.1} MB cap).",
            estimated_bytes as f64 / 1_000_000.0,
            policy.cap_bytes as f64 / 1_000_000.0
        )));
        record_ai_warning(
            "ann_index_cap_exceeded",
            Some(format!(
                "{estimated_bytes} bytes > {} bytes",
                policy.cap_bytes
            )),
        );
        return None;
    }
    let vectors = fetch_f32_array_with_cap("/data/ann-index.bin", policy.cap_bytes).await?;
    let expected_len = meta
        .record_count
        .checked_mul(meta.dim)
        .map(|v| v as usize)?;
    if vectors.len() != expected_len {
        web_sys::console::warn_1(&wasm_bindgen::JsValue::from_str(
            "ann-index size mismatch; falling back to embedded vectors",
        ));
        record_ai_warning(
            "ann_index_size_mismatch",
            Some(format!("expected {expected_len}, got {}", vectors.len())),
        );
        return None;
    }
    Some(vectors)
}

#[cfg(feature = "hydrate")]
async fn load_ivf_index(meta: &dmb_core::AnnIndexMeta) -> Option<AnnIvfIndex> {
    if meta.method != "ivf-flat" {
        return None;
    }
    let file = meta.index_file.as_deref()?;
    let policy = cap_policy_from_navigator();
    if let Some(estimate) = estimate_ivf_bytes_from_meta(meta) {
        let cap = ivf_cap_bytes_for_matrix(policy.cap_bytes);
        if estimate > cap {
            record_ai_warning(
                "ivf_estimate_cap_exceeded",
                Some(format!("{estimate} bytes > {cap} bytes")),
            );
            return None;
        }
    }
    let url = format!("/data/{file}");
    let ivf = fetch_json::<AnnIvfIndex>(&url).await?;
    if ivf.dim != meta.dim || ivf.cluster_count == 0 {
        return None;
    }
    Some(ivf)
}

#[cfg(feature = "hydrate")]
async fn read_cached_embedding_manifest(version: &str) -> Option<EmbeddingManifest> {
    dmb_idb::get_embedding_manifest(version)
        .await
        .ok()
        .flatten()
}

#[cfg(feature = "hydrate")]
async fn hydrate_missing_embedding_chunks(manifest: &EmbeddingManifest) {
    for chunk in &manifest.chunks {
        if dmb_idb::get_embedding_chunk(chunk.chunk_id)
            .await
            .ok()
            .flatten()
            .is_some()
        {
            continue;
        }
        let url = format!("/data/{}", chunk.file);
        if let Some(payload) = fetch_json::<EmbeddingChunk>(&url).await {
            let _ = dmb_idb::store_embedding_chunk(&payload).await;
        } else {
            record_ai_warning("embedding_chunk_fetch_failed", Some(chunk.file.clone()));
        }
    }
}

#[cfg(feature = "hydrate")]
async fn load_embedding_manifest_with_cache(version: &str) -> Option<EmbeddingManifest> {
    if let Some(manifest) = read_cached_embedding_manifest(version).await {
        return Some(manifest);
    }

    let fetched = match fetch_json::<EmbeddingManifest>("/data/embedding-manifest.json").await {
        Some(payload) => payload,
        None => {
            record_ai_warning("embedding_manifest_fetch_failed", None);
            return None;
        }
    };
    dmb_idb::store_embedding_manifest(&fetched).await.ok()?;
    hydrate_missing_embedding_chunks(&fetched).await;
    read_cached_embedding_manifest(version).await
}

#[cfg(feature = "hydrate")]
async fn load_ann_backing(manifest_dim: u32) -> (Vec<f32>, bool, Option<AnnIvfIndex>) {
    let ann_meta = load_ann_meta().await;
    let matrix = if let Some(meta) = ann_meta.as_ref() {
        load_ann_vectors(meta, manifest_dim)
            .await
            .unwrap_or_else(Vec::new)
    } else {
        Vec::new()
    };
    let use_ann = !matrix.is_empty();
    let ivf = if use_ann {
        if let Some(meta) = ann_meta.as_ref() {
            load_ivf_index(meta).await
        } else {
            None
        }
    } else {
        None
    };
    (matrix, use_ann, ivf)
}

#[cfg(feature = "hydrate")]
fn target_vectors_for_manifest(policy: &CapPolicy, dim: u32) -> usize {
    let max_vectors = if dim == 0 {
        0usize
    } else {
        (policy.cap_bytes / (dim as u64 * 4)).max(1) as usize
    };
    max_vectors.max(MIN_SAMPLE_RECORDS)
}

#[cfg(feature = "hydrate")]
async fn load_records_and_matrix_from_chunks(
    manifest: &EmbeddingManifest,
    mut matrix: Vec<f32>,
    use_ann: bool,
    target_vectors: usize,
) -> (Vec<EmbeddingRecord>, Vec<f32>, usize, bool) {
    let mut records = Vec::new();
    let mut chunks_loaded = 0usize;
    let mut budget_capped = false;

    for meta in &manifest.chunks {
        if let Some(chunk) = dmb_idb::get_embedding_chunk(meta.chunk_id)
            .await
            .ok()
            .flatten()
        {
            for mut record in chunk.records {
                if !use_ann {
                    matrix.extend_from_slice(&record.vector);
                }
                // Keep vectors only in the contiguous matrix to avoid doubling memory.
                record.vector.clear();
                records.push(record);
                if !use_ann && records.len() >= target_vectors {
                    budget_capped = true;
                    break;
                }
            }
            chunks_loaded += 1;
            if budget_capped {
                break;
            }
        }
    }

    (records, matrix, chunks_loaded, budget_capped)
}

#[cfg(feature = "hydrate")]
fn schedule_embedding_background_tasks(caps: AiCapabilities) {
    if caps.webgpu_enabled && should_run_worker_benchmark() {
        spawn_local(async move {
            let _ = benchmark_worker_threshold().await;
            mark_worker_benchmark_ran();
        });
    }
    if caps.webgpu_worker {
        spawn_local(async move {
            warm_webgpu_worker().await;
        });
    }
}

#[cfg(feature = "hydrate")]
pub async fn load_embedding_index() -> Option<Arc<EmbeddingIndex>> {
    if let Some(existing) = EMBEDDING_INDEX.get() {
        return Some(existing.clone());
    }
    maybe_seed_ai_config().await;
    if embedding_sample_enabled() {
        if let Some(sample_index) = load_embedding_sample_index().await {
            let _ = EMBEDDING_INDEX.set(sample_index.clone());
            return Some(sample_index);
        }
    }
    let manifest = load_embedding_manifest_with_cache(CORE_SCHEMA_VERSION).await?;
    let policy = cap_policy_from_navigator();
    let target_vectors = target_vectors_for_manifest(&policy, manifest.dim);
    let (matrix, use_ann, ivf) = load_ann_backing(manifest.dim).await;
    let (records, matrix, chunks_loaded, budget_capped) =
        load_records_and_matrix_from_chunks(&manifest, matrix, use_ann, target_vectors).await;

    if budget_capped {
        record_ai_warning(
            "embedding_budget_capped",
            Some(format!(
                "records_loaded {} / target {}",
                records.len(),
                target_vectors
            )),
        );
    }

    if records.is_empty() {
        return None;
    }

    let dim = manifest.dim as usize;
    let (records, matrix, ivf, mut diagnostics) =
        cap_embedding_index_inner(records, matrix, dim, ivf, use_ann);
    diagnostics.chunks_loaded = Some(chunks_loaded);
    diagnostics.records_loaded = Some(records.len());
    diagnostics.budget_capped = budget_capped;
    let _ = ANN_CAP_DIAGNOSTICS.set(diagnostics.clone());
    store_ai_telemetry_snapshot(Some(&diagnostics));
    let index = Arc::new(EmbeddingIndex {
        dim,
        records,
        matrix,
        ivf,
    });
    let _ = EMBEDDING_INDEX.set(index.clone());
    schedule_embedding_background_tasks(detect_ai_capabilities());
    Some(index)
}

#[cfg(not(feature = "hydrate"))]
pub async fn load_embedding_index() -> Option<Arc<EmbeddingIndex>> {
    None
}

#[cfg(feature = "hydrate")]
async fn load_embedding_sample_index() -> Option<Arc<EmbeddingIndex>> {
    let entries = fetch_json::<Vec<EmbeddingSampleEntry>>("/data/embedding-sample.json").await?;
    if entries.is_empty() {
        return None;
    }
    let dim = EMBEDDING_DIM;
    let mut records = Vec::with_capacity(entries.len());
    let mut matrix = Vec::with_capacity(entries.len() * dim);
    for entry in entries {
        let vector = if let Some(vector) = entry.vector.clone() {
            vector
        } else {
            let text = entry.text.clone().unwrap_or_default();
            hashed_embedding(&text, dim)
        };
        matrix.extend_from_slice(&vector);
        records.push(EmbeddingRecord {
            id: entry.id,
            kind: entry.kind,
            slug: entry.slug,
            label: entry.label.or(entry.text).filter(|v| !v.is_empty()),
            vector,
        });
    }
    let diagnostics = AnnCapDiagnostics {
        cap_bytes: (matrix.len() as u64).saturating_mul(4),
        cap_override_mb: None,
        matrix_bytes_before: (matrix.len() as u64).saturating_mul(4),
        matrix_bytes_after: (matrix.len() as u64).saturating_mul(4),
        ivf_bytes: None,
        ivf_cap_bytes: None,
        vectors_before: records.len(),
        vectors_after: records.len(),
        dim,
        ivf_dropped: false,
        used_ann: false,
        capped: false,
        device_memory_gb: None,
        policy_tier: "sample".to_string(),
        chunks_loaded: Some(1),
        records_loaded: Some(records.len()),
        budget_capped: false,
    };
    let _ = ANN_CAP_DIAGNOSTICS.set(diagnostics.clone());
    store_ai_telemetry_snapshot(Some(&diagnostics));
    Some(Arc::new(EmbeddingIndex {
        dim,
        records,
        matrix,
        ivf: None,
    }))
}

pub async fn semantic_search(
    query: &str,
    index: &EmbeddingIndex,
    limit: usize,
) -> Vec<SearchResult> {
    if query.trim().is_empty() {
        return Vec::new();
    }
    let dim = index.dim.max(1);
    let mut query_vec = hashed_embedding(query, dim);
    if query_vec.len() != dim {
        query_vec.resize(dim, 0.0);
    }

    let caps = detect_ai_capabilities();
    let total_vectors = index.matrix.len() / dim;
    if total_vectors < 64 {
        let scored = top_k_cosine_native(&query_vec, &index.matrix, dim, limit);
        return scored
            .into_iter()
            .filter_map(|entry| {
                index.records.get(entry.index).map(|record| SearchResult {
                    result_type: record.kind.clone(),
                    id: record.id,
                    slug: record.slug.clone(),
                    label: record
                        .label
                        .clone()
                        .unwrap_or_else(|| format!("{} {}", record.kind, record.id)),
                    score: entry.score,
                })
            })
            .collect();
    }
    let policy = cap_policy_from_navigator();
    let matrix_bytes = (index.matrix.len() as u64).saturating_mul(4);
    let webgpu_matrix_allowed = webgpu_matrix_allowed(matrix_bytes, policy.cap_bytes);
    if caps.webgpu_enabled && !webgpu_matrix_allowed {
        record_ai_warning(
            "webgpu_matrix_cap_exceeded",
            Some(format!("{matrix_bytes} bytes > cap {}", policy.cap_bytes)),
        );
    }
    let scored = if let Some(ivf) = &index.ivf {
        let probe_override = {
            #[cfg(feature = "hydrate")]
            {
                load_ai_tuning().await.probe_override
            }
            #[cfg(not(feature = "hydrate"))]
            {
                None
            }
        };
        let candidates = collect_ivf_candidates_with_probe(&query_vec, ivf, probe_override);
        score_candidates(&query_vec, index, &candidates, limit, caps, dim).await
    } else if caps.webgpu_enabled && webgpu_matrix_allowed && webgpu_probe_ok().await {
        #[cfg(feature = "hydrate")]
        {
            match dmb_wasm::webgpu_scores(query_vec.clone(), index.matrix.clone(), dim).await {
                Ok(scores) => top_k_from_scores(scores, limit),
                Err(_) => top_k_cosine_native(&query_vec, &index.matrix, dim, limit),
            }
        }
        #[cfg(not(feature = "hydrate"))]
        {
            top_k_cosine_native(&query_vec, &index.matrix, dim, limit)
        }
    } else {
        top_k_cosine_native(&query_vec, &index.matrix, dim, limit)
    };

    scored
        .into_iter()
        .filter_map(|entry| {
            index.records.get(entry.index).map(|record| SearchResult {
                result_type: record.kind.clone(),
                id: record.id,
                slug: record.slug.clone(),
                label: record
                    .label
                    .clone()
                    .unwrap_or_else(|| format!("{} {}", record.kind, record.id)),
                score: entry.score,
            })
        })
        .collect()
}

#[cfg(feature = "hydrate")]
pub async fn benchmark_scoring(sample_count: usize) -> Option<AiBenchmark> {
    let sample = prepare_benchmark_sample(sample_count).await?;
    let cpu_ms = benchmark_cpu(&sample)?;
    let (gpu_ms, backend) = benchmark_gpu(&sample).await;

    Some(AiBenchmark {
        sample_count: sample.sample_count,
        cpu_ms,
        gpu_ms,
        backend,
    })
}

#[cfg(feature = "hydrate")]
pub async fn benchmark_subset_scoring(limit: usize) -> Option<AiSubsetBenchmark> {
    let index = load_embedding_index().await?;
    let ivf = index.ivf.as_ref()?;
    let tuning = load_ai_tuning().await;
    let probe_override = tuning.probe_override;
    let query_vec = hashed_embedding("benchmark", index.dim);
    let candidates = collect_ivf_candidates_with_probe(&query_vec, ivf, probe_override);
    if candidates.is_empty() {
        return None;
    }

    let perf = web_sys::window()?.performance()?;
    let cpu_start = perf.now();
    let _ = top_k_cosine_candidates_cpu(&query_vec, &index.matrix, index.dim, &candidates, limit);
    let cpu_ms = perf.now() - cpu_start;

    let caps = detect_ai_capabilities();
    let mut gpu_ms = None;
    let mut backend = "cpu-subset".to_string();

    if caps.webgpu_enabled {
        let indices: Vec<u32> = candidates.iter().map(|&idx| idx as u32).collect();
        let gpu_start = perf.now();
        if let Ok(scores) = dmb_wasm::webgpu_scores_subset(
            query_vec.clone(),
            index.matrix.clone(),
            index.dim,
            indices,
        )
        .await
        {
            let _ = top_k_from_subset(scores, &candidates, limit);
            gpu_ms = Some(perf.now() - gpu_start);
            backend = if caps.webgpu_worker {
                "webgpu-worker-subset".to_string()
            } else {
                "webgpu-subset".to_string()
            };
        }
    }

    Some(AiSubsetBenchmark {
        candidate_count: candidates.len(),
        cpu_ms,
        gpu_ms,
        backend,
    })
}

#[cfg(feature = "hydrate")]
pub async fn prepare_benchmark_sample(sample_count: usize) -> Option<BenchmarkSample> {
    let index = load_embedding_index().await?;
    let dim = index.dim.max(1);
    let total = index.matrix.len() / dim;
    if total == 0 {
        return None;
    }
    let mut sample_total = sample_count.min(total).max(1);
    if sample_total > MAX_BENCH_SAMPLE_VECTORS {
        sample_total = MAX_BENCH_SAMPLE_VECTORS;
        tracing::warn!(
            "benchmark sample capped at {} vectors to avoid long-running benchmark",
            MAX_BENCH_SAMPLE_VECTORS
        );
    }
    let sample_matrix = index.matrix[..sample_total * dim].to_vec();
    let query_vec = hashed_embedding("benchmark", dim);

    Some(BenchmarkSample {
        sample_count: sample_total,
        dim,
        query_vec,
        matrix: sample_matrix,
    })
}

#[cfg(feature = "hydrate")]
pub fn benchmark_cpu(sample: &BenchmarkSample) -> Option<f64> {
    let perf = web_sys::window()?.performance()?;
    let cpu_start = perf.now();
    let _ = top_k_cosine_native(&sample.query_vec, &sample.matrix, sample.dim, 5);
    Some(perf.now() - cpu_start)
}

#[cfg(feature = "hydrate")]
pub async fn benchmark_gpu(sample: &BenchmarkSample) -> (Option<f64>, String) {
    let caps = detect_ai_capabilities();
    let mut gpu_ms = None;
    let mut backend = "cpu".to_string();
    if caps.webgpu_enabled {
        let policy = cap_policy_from_navigator();
        let matrix_bytes = (sample.matrix.len() as u64).saturating_mul(4);
        if matrix_bytes > policy.cap_bytes.min(WEBGPU_MATRIX_CAP_BYTES) {
            record_ai_warning(
                "webgpu_benchmark_skipped",
                Some(format!("{matrix_bytes} bytes > cap {}", policy.cap_bytes)),
            );
            return (None, backend);
        }
        let perf = web_sys::window().and_then(|w| w.performance());
        if let Some(perf) = perf {
            let gpu_start = perf.now();
            if let Ok(scores) =
                dmb_wasm::webgpu_scores(sample.query_vec.clone(), sample.matrix.clone(), sample.dim)
                    .await
            {
                let _ = top_k_from_scores(scores, 5);
                gpu_ms = Some(perf.now() - gpu_start);
                backend = if caps.webgpu_worker {
                    "webgpu-worker".to_string()
                } else {
                    "webgpu".to_string()
                };
            }
        }
    }
    (gpu_ms, backend)
}

#[cfg(feature = "hydrate")]
async fn measure_webgpu_scores(
    variant: WebgpuScoreFn,
    query: &js_sys::Float32Array,
    matrix: &js_sys::Float32Array,
    dim: usize,
) -> Option<f64> {
    use wasm_bindgen::JsCast;
    use wasm_bindgen_futures::JsFuture;

    let window = web_sys::window()?;
    let perf = window.performance()?;
    let start = perf.now();
    let promise = match variant {
        WebgpuScoreFn::Direct => dmb_webgpu_scores_js(query, matrix, dim as f64).ok()?,
        WebgpuScoreFn::Worker => dmb_webgpu_scores_worker_js(query, matrix, dim as f64).ok()?,
    };
    let result = JsFuture::from(promise).await.ok()?;
    if result.is_null() || result.is_undefined() {
        return None;
    }
    let array: js_sys::Float32Array = result.dyn_into().ok()?;
    let _ = array.length();
    Some(perf.now() - start)
}

#[cfg(feature = "hydrate")]
pub async fn benchmark_worker_threshold() -> Option<AiWorkerBenchmark> {
    let index = load_embedding_index().await?;
    let dim = index.dim.max(1);
    let matrix_len = index.matrix.len();
    let capped_len = if matrix_len > WORKER_BENCH_MAX_FLOATS {
        (WORKER_BENCH_MAX_FLOATS / dim) * dim
    } else {
        (matrix_len / dim) * dim
    };
    if capped_len == 0 {
        return None;
    }
    let sampled = capped_len < matrix_len;
    let vector_count = capped_len / dim;
    let query_vec = hashed_embedding("benchmark", dim);
    let query_array = js_sys::Float32Array::from(query_vec.as_slice());
    let matrix_slice = &index.matrix[..capped_len];
    let matrix_array = js_sys::Float32Array::from(matrix_slice);

    let direct_ms =
        measure_webgpu_scores(WebgpuScoreFn::Direct, &query_array, &matrix_array, dim).await;
    let worker_ms =
        measure_webgpu_scores(WebgpuScoreFn::Worker, &query_array, &matrix_array, dim).await;

    let winner = match (direct_ms, worker_ms) {
        (Some(direct), Some(worker)) => Some(if worker < direct {
            "worker".to_string()
        } else {
            "direct".to_string()
        }),
        (Some(_), None) => Some("direct".to_string()),
        (None, Some(_)) => Some("worker".to_string()),
        _ => None,
    };

    let mut result = AiWorkerBenchmark {
        vector_count,
        dim,
        floats: index.matrix.len(),
        direct_ms,
        worker_ms,
        winner,
        recommended_threshold: None,
    };
    if let Some(recommended) = recommend_worker_threshold(&result) {
        store_worker_threshold(recommended);
        result.recommended_threshold = Some(recommended);
    }
    if sampled {
        record_ai_warning(
            "worker_bench_sampled",
            Some(format!(
                "matrix_floats {} capped to {}",
                matrix_len, capped_len
            )),
        );
    }
    store_ai_telemetry_snapshot(ann_cap_diagnostics().as_ref());
    Some(result)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_records(count: usize, dim: usize) -> (Vec<EmbeddingRecord>, Vec<f32>) {
        let mut records = Vec::with_capacity(count);
        let mut matrix = Vec::with_capacity(count * dim);
        for idx in 0..count {
            let mut vector = Vec::with_capacity(dim);
            for j in 0..dim {
                let value = (idx * dim + j) as f32 / 100.0;
                vector.push(value);
                matrix.push(value);
            }
            records.push(EmbeddingRecord {
                id: idx as i32,
                kind: "test".to_string(),
                slug: None,
                label: None,
                vector,
            });
        }
        (records, matrix)
    }

    fn make_ivf(dim: usize) -> AnnIvfIndex {
        AnnIvfIndex {
            method: "ivf-flat".to_string(),
            dim: dim as u32,
            cluster_count: 2,
            probe_count: 1,
            centroids: vec![vec![0.0; dim], vec![1.0; dim]],
            lists: vec![vec![0], vec![1]],
        }
    }

    #[test]
    fn cap_embedding_index_drops_ivf_when_over_limit() {
        let dim = 8;
        let (records, matrix) = make_records(100, dim);
        let policy = CapPolicy {
            cap_bytes: 8 * 10 * 4, // ~10 vectors
            device_memory_gb: Some(4.0),
            tier: "test".to_string(),
            cap_override_mb: None,
        };
        let ivf = Some(make_ivf(dim));
        let (new_records, new_matrix, new_ivf, diagnostics) =
            cap_embedding_index_with_policy(records, matrix, dim, ivf, true, policy);
        assert!(diagnostics.capped);
        assert!(diagnostics.ivf_dropped);
        assert!(new_ivf.is_none());
        assert!(new_records.len() <= 100);
        assert_eq!(new_matrix.len() % dim, 0);
        assert!(new_matrix.len() / dim <= new_records.len());
    }

    #[test]
    fn cap_embedding_index_noop_when_under_limit() {
        let dim = 8;
        let (records, matrix) = make_records(10, dim);
        let policy = CapPolicy {
            cap_bytes: 8 * 10 * 4 * 2,
            device_memory_gb: Some(16.0),
            tier: "test".to_string(),
            cap_override_mb: None,
        };
        let ivf = Some(make_ivf(dim));
        let (new_records, new_matrix, new_ivf, diagnostics) =
            cap_embedding_index_with_policy(records, matrix, dim, ivf, false, policy);
        assert!(!diagnostics.capped);
        assert!(!diagnostics.ivf_dropped);
        assert!(new_ivf.is_some());
        assert_eq!(new_records.len(), 10);
        assert_eq!(new_matrix.len(), 10 * dim);
    }

    #[test]
    fn webgpu_matrix_cap_enforced() {
        let policy_cap = DEFAULT_MAX_MATRIX_BYTES * 2;
        let over_webgpu = WEBGPU_MATRIX_CAP_BYTES + 1;
        let under_webgpu = WEBGPU_MATRIX_CAP_BYTES.saturating_sub(1);
        assert!(!webgpu_matrix_allowed(over_webgpu, policy_cap));
        assert!(webgpu_matrix_allowed(under_webgpu, policy_cap));
        let tight_policy = WEBGPU_MATRIX_CAP_BYTES / 2;
        assert!(!webgpu_matrix_allowed(
            WEBGPU_MATRIX_CAP_BYTES,
            tight_policy
        ));
    }
}

#[cfg(feature = "hydrate")]
pub async fn tune_ivf_probe(index: &EmbeddingIndex, limit: usize) -> Option<ProbeTuningResult> {
    let ivf = index.ivf.as_ref()?;
    let caps = detect_ai_capabilities();
    let tuning = load_ai_tuning().await;
    let mut target_latency_ms = tuning.target_latency_ms;
    if let Some(telemetry_target) = suggest_target_latency_from_history() {
        target_latency_ms = telemetry_target;
    }

    let mut probes: Vec<u32> = vec![2, 4, 8, 12, 16, ivf.probe_count];
    probes.sort();
    probes.dedup();
    probes.retain(|probe| *probe <= ivf.cluster_count && *probe >= 1);

    let sample_queries = ["crash", "grace", "two step", "ants"];
    let mut metrics = Vec::new();
    let mut best_probe = ivf.probe_count;
    let mut best_latency = f64::MAX;

    for probe in probes {
        let mut total_ms = 0.0;
        let mut candidate_count = 0usize;
        for query in sample_queries {
            let query_vec = hashed_embedding(query, index.dim);
            let candidates = collect_ivf_candidates_with_probe(&query_vec, ivf, Some(probe));
            candidate_count = candidate_count.max(candidates.len());
            let perf = web_sys::window()?.performance()?;
            let start = perf.now();
            let _ = score_candidates(&query_vec, index, &candidates, limit, caps, index.dim).await;
            total_ms += perf.now() - start;
        }
        let avg_latency = total_ms / sample_queries.len() as f64;
        metrics.push(ProbeCandidateMetric {
            probe_count: probe,
            candidate_count,
            avg_latency_ms: avg_latency,
        });

        if avg_latency <= target_latency_ms && candidate_count >= (limit * 4).max(50) {
            best_probe = probe;
            best_latency = avg_latency;
            break;
        }
        if avg_latency < best_latency {
            best_latency = avg_latency;
            best_probe = probe;
        }
    }

    let tuning = AiTuning {
        probe_override: Some(best_probe),
        target_latency_ms,
        last_latency_ms: Some(best_latency),
    };
    store_ai_tuning(&tuning).await;

    Some(ProbeTuningResult {
        selected_probe: best_probe,
        target_latency_ms,
        metrics,
    })
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ScoredIndex {
    index: usize,
    score: f32,
}

fn top_k_cosine_native(query: &[f32], matrix: &[f32], dim: usize, k: usize) -> Vec<ScoredIndex> {
    if dim == 0 || query.len() != dim {
        return Vec::new();
    }
    let count = matrix.len() / dim;
    let mut scored = Vec::with_capacity(count);
    for idx in 0..count {
        let start = idx * dim;
        let end = start + dim;
        if end > matrix.len() {
            break;
        }
        let mut score = 0.0;
        for (a, b) in query.iter().zip(&matrix[start..end]) {
            score += a * b;
        }
        scored.push(ScoredIndex { index: idx, score });
    }
    scored.sort_by(|a, b| b.score.total_cmp(&a.score));
    scored.truncate(k.max(1));
    scored
}

#[cfg(feature = "hydrate")]
fn top_k_from_scores(scores: Vec<f32>, k: usize) -> Vec<ScoredIndex> {
    let mut scored: Vec<ScoredIndex> = scores
        .into_iter()
        .enumerate()
        .map(|(index, score)| ScoredIndex { index, score })
        .collect();
    scored.sort_by(|a, b| b.score.total_cmp(&a.score));
    scored.truncate(k.max(1));
    scored
}

fn collect_ivf_candidates_with_probe(
    query: &[f32],
    ivf: &AnnIvfIndex,
    probe_override: Option<u32>,
) -> Vec<usize> {
    if ivf.centroids.is_empty() {
        return Vec::new();
    }
    let mut centroid_scores: Vec<(usize, f32)> = ivf
        .centroids
        .iter()
        .enumerate()
        .map(|(idx, centroid)| {
            let score = centroid
                .iter()
                .zip(query.iter())
                .map(|(a, b)| a * b)
                .sum::<f32>();
            (idx, score)
        })
        .collect();

    centroid_scores.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));

    let probe = probe_override.unwrap_or(ivf.probe_count);
    let probe = probe
        .max(1)
        .min(ivf.cluster_count)
        .min(ivf.lists.len() as u32) as usize;
    let mut seen = std::collections::HashSet::new();
    let mut candidates = Vec::new();
    for (cluster_idx, _) in centroid_scores.into_iter().take(probe) {
        if let Some(list) = ivf.lists.get(cluster_idx) {
            for idx in list {
                let idx = *idx as usize;
                if seen.insert(idx) {
                    candidates.push(idx);
                }
            }
        }
    }
    candidates
}

fn top_k_cosine_candidates_cpu(
    query: &[f32],
    matrix: &[f32],
    dim: usize,
    candidates: &[usize],
    k: usize,
) -> Vec<ScoredIndex> {
    let mut scored = Vec::with_capacity(candidates.len());
    for &idx in candidates {
        let start = idx * dim;
        let end = start + dim;
        if end > matrix.len() {
            continue;
        }
        let score = matrix[start..end]
            .iter()
            .zip(query.iter())
            .map(|(a, b)| a * b)
            .sum::<f32>();
        scored.push(ScoredIndex { index: idx, score });
    }
    scored.sort_by(|a, b| {
        b.score
            .partial_cmp(&a.score)
            .unwrap_or(std::cmp::Ordering::Equal)
    });
    scored.truncate(k.max(1));
    scored
}

#[cfg(feature = "hydrate")]
fn top_k_from_subset(scores: Vec<f32>, candidates: &[usize], k: usize) -> Vec<ScoredIndex> {
    let mut scored = Vec::with_capacity(scores.len());
    for (idx, score) in scores.into_iter().enumerate() {
        if let Some(&candidate) = candidates.get(idx) {
            scored.push(ScoredIndex {
                index: candidate,
                score,
            });
        }
    }
    scored.sort_by(|a, b| {
        b.score
            .partial_cmp(&a.score)
            .unwrap_or(std::cmp::Ordering::Equal)
    });
    scored.truncate(k.max(1));
    scored
}

async fn score_candidates(
    query_vec: &[f32],
    index: &EmbeddingIndex,
    candidates: &[usize],
    limit: usize,
    caps: AiCapabilities,
    dim: usize,
) -> Vec<ScoredIndex> {
    if candidates.is_empty() {
        return Vec::new();
    }
    let policy = cap_policy_from_navigator();
    let matrix_bytes = (index.matrix.len() as u64).saturating_mul(4);
    let webgpu_matrix_allowed = webgpu_matrix_allowed(matrix_bytes, policy.cap_bytes);
    if caps.webgpu_enabled && candidates.len() > 256 && webgpu_matrix_allowed {
        #[cfg(feature = "hydrate")]
        {
            if !webgpu_probe_ok().await {
                return top_k_cosine_candidates_cpu(
                    query_vec,
                    &index.matrix,
                    dim,
                    candidates,
                    limit,
                );
            }
            let indices: Vec<u32> = candidates.iter().map(|&idx| idx as u32).collect();
            match dmb_wasm::webgpu_scores_subset(
                query_vec.to_vec(),
                index.matrix.clone(),
                dim,
                indices,
            )
            .await
            {
                Ok(scores) => top_k_from_subset(scores, candidates, limit),
                Err(_) => {
                    top_k_cosine_candidates_cpu(query_vec, &index.matrix, dim, candidates, limit)
                }
            }
        }
        #[cfg(not(feature = "hydrate"))]
        {
            top_k_cosine_candidates_cpu(query_vec, &index.matrix, dim, candidates, limit)
        }
    } else {
        top_k_cosine_candidates_cpu(query_vec, &index.matrix, dim, candidates, limit)
    }
}

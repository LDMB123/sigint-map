use serde::{Deserialize, Serialize};
use std::cmp::Reverse;
use std::collections::{BinaryHeap, HashMap};
use std::sync::Arc;

#[cfg(feature = "hydrate")]
use std::cell::RefCell;

#[cfg(feature = "hydrate")]
use dmb_core::EMBEDDING_DIM;
use dmb_core::{hashed_embedding, AnnIvfIndex, EmbeddingRecord, SearchResult};

#[cfg(feature = "hydrate")]
use leptos::task::spawn_local;

#[cfg(feature = "hydrate")]
use crate::browser::storage::{
    local_storage, local_storage_flag_enabled, local_storage_item, local_storage_json,
    local_storage_parse, remove_local_storage_item, remove_storage_item, set_local_storage_flag,
    set_local_storage_item, set_local_storage_json, set_storage_item, set_storage_json,
    storage_flag_enabled, storage_item, with_local_storage,
};
#[cfg(feature = "hydrate")]
use dmb_core::{EmbeddingChunk, EmbeddingManifest, CORE_SCHEMA_VERSION};
#[cfg(feature = "hydrate")]
use once_cell::sync::OnceCell;
#[cfg(feature = "hydrate")]
use wasm_bindgen::{prelude::*, JsValue};

#[derive(Debug, Clone, Copy, Serialize, Deserialize, Default)]
#[allow(clippy::struct_excessive_bools)]
pub struct AiCapabilities {
    pub webgpu_available: bool,
    pub webgpu_enabled: bool,
    pub webgpu_worker: bool,
    pub webnn: bool,
    pub wasm_simd: bool,
    pub threads: bool,
}

#[cfg(feature = "hydrate")]
#[derive(Debug, Clone, Copy)]
enum WebgpuScoreFn {
    Direct,
    Worker,
}

#[cfg(feature = "hydrate")]
fn js_value_exists(value: &JsValue) -> bool {
    !value.is_null() && !value.is_undefined()
}

#[cfg(feature = "hydrate")]
fn navigator_property(name: &str) -> JsValue {
    crate::browser::runtime::navigator_property_or_undefined(name)
}

#[cfg(feature = "hydrate")]
thread_local! {
    static WEBGPU_DISABLED_CACHE: RefCell<Option<bool>> = const { RefCell::new(None) };
    static WORKER_THRESHOLD_READY: RefCell<bool> = const { RefCell::new(false) };
    static WEBGPU_MATRIX_JS_CACHE: RefCell<Option<WebgpuMatrixJsCache>> = const { RefCell::new(None) };
    static WEBGPU_WORKER_MATRIX_SIGNATURE: RefCell<Option<WebgpuMatrixJsSignature>> = const { RefCell::new(None) };
    static WEBGPU_SUBSET_MATRIX_BUFFER: RefCell<Vec<f32>> = const { RefCell::new(Vec::new()) };
}

#[cfg(feature = "hydrate")]
#[wasm_bindgen(inline_js = r#"
function dmbTopKScores(scores, sourceIndices, k) {
  const scoresLen = scores?.length ?? 0;
  const indicesLen = sourceIndices?.length ?? scoresLen;
  const len = Math.min(scoresLen, indicesLen);
  if (len === 0) {
    return [new Uint32Array(0), new Float32Array(0)];
  }

  const keep = Math.max(1, Math.min((k >>> 0) || 1, len));
  const topIndices = new Uint32Array(keep);
  const topScores = new Float32Array(keep);
  let topLen = 0;

  for (let index = 0; index < len; index += 1) {
    const score = scores[index];
    const sourceIndex = sourceIndices ? sourceIndices[index] : index;
    if (topLen === keep) {
      const last = topLen - 1;
      const worstScore = topScores[last];
      const worstIndex = topIndices[last];
      if (score < worstScore || (score === worstScore && sourceIndex <= worstIndex)) {
        continue;
      }
    }

    let insertAt = topLen;
    while (insertAt > 0) {
      const prev = insertAt - 1;
      const prevScore = topScores[prev];
      const prevIndex = topIndices[prev];
      if (score < prevScore || (score === prevScore && sourceIndex <= prevIndex)) {
        break;
      }
      insertAt = prev;
    }

    if (topLen < keep) {
      topLen += 1;
    }
    for (let shift = topLen - 1; shift > insertAt; shift -= 1) {
      topScores[shift] = topScores[shift - 1];
      topIndices[shift] = topIndices[shift - 1];
    }
    topScores[insertAt] = score;
    topIndices[insertAt] = sourceIndex;
  }

  return [topIndices.subarray(0, topLen), topScores.subarray(0, topLen)];
}

export function dmb_top_k_scores(scores, k) {
  return dmbTopKScores(scores, null, k);
}

export function dmb_top_k_subset_scores(scores, candidates, k) {
  return dmbTopKScores(scores, candidates, k);
}
"#)]
extern "C" {
    fn dmb_top_k_scores(scores: &JsValue, k: u32) -> js_sys::Array;
    fn dmb_top_k_subset_scores(scores: &JsValue, candidates: &JsValue, k: u32) -> js_sys::Array;
}

#[cfg(feature = "hydrate")]
#[derive(Clone)]
struct WebgpuMatrixJsCache {
    signature: WebgpuMatrixJsSignature,
    array: js_sys::Float32Array,
}

#[cfg(feature = "hydrate")]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
struct WebgpuMatrixJsSignature {
    ptr: usize,
    len: usize,
    first_bits: u32,
    middle_bits: u32,
    last_bits: u32,
}

#[cfg(feature = "hydrate")]
fn matrix_js_signature(matrix: &[f32]) -> WebgpuMatrixJsSignature {
    let len = matrix.len();
    let first = matrix.first().copied().unwrap_or_default().to_bits();
    let middle = matrix.get(len / 2).copied().unwrap_or_default().to_bits();
    let last = matrix.last().copied().unwrap_or_default().to_bits();
    WebgpuMatrixJsSignature {
        ptr: matrix.as_ptr() as usize,
        len,
        first_bits: first,
        middle_bits: middle,
        last_bits: last,
    }
}

#[cfg(feature = "hydrate")]
fn worker_matrix_requires_init(signature: WebgpuMatrixJsSignature) -> bool {
    WEBGPU_WORKER_MATRIX_SIGNATURE.with(|cache| {
        cache
            .borrow()
            .as_ref()
            .is_none_or(|existing| *existing != signature)
    })
}

#[cfg(feature = "hydrate")]
fn set_worker_matrix_signature(signature: WebgpuMatrixJsSignature) {
    WEBGPU_WORKER_MATRIX_SIGNATURE.with(|cache| {
        *cache.borrow_mut() = Some(signature);
    });
}

#[cfg(feature = "hydrate")]
fn clear_worker_matrix_signature() {
    WEBGPU_WORKER_MATRIX_SIGNATURE.with(|cache| {
        *cache.borrow_mut() = None;
    });
}

#[cfg(feature = "hydrate")]
fn parse_webgpu_disabled(value: Option<String>) -> bool {
    value
        .map(|item| item == "1" || item.eq_ignore_ascii_case("true"))
        .unwrap_or(false)
}

#[cfg(feature = "hydrate")]
fn webgpu_disabled_value() -> bool {
    WEBGPU_DISABLED_CACHE.with(|cache| {
        if let Some(value) = *cache.borrow() {
            return value;
        }
        let loaded = parse_webgpu_disabled(local_storage_item(WEBGPU_DISABLE_KEY));
        *cache.borrow_mut() = Some(loaded);
        loaded
    })
}

#[cfg(feature = "hydrate")]
fn worker_threshold_ready() -> bool {
    WORKER_THRESHOLD_READY.with(|ready| *ready.borrow())
}

#[cfg(feature = "hydrate")]
fn mark_worker_threshold_ready() {
    WORKER_THRESHOLD_READY.with(|ready| {
        *ready.borrow_mut() = true;
    });
}

#[cfg(feature = "hydrate")]
fn reset_worker_threshold_ready() {
    WORKER_THRESHOLD_READY.with(|ready| {
        *ready.borrow_mut() = false;
    });
}

#[cfg(feature = "hydrate")]
fn record_ai_warning_once(warn_key: &str, event: &str, details: &str) {
    let _ = with_local_storage(|storage| {
        if storage_item(storage, warn_key).is_some() {
            return;
        }
        set_storage_item(storage, warn_key, "1");
        record_ai_warning(event, Some(details.to_string()));
    });
}

#[cfg(feature = "hydrate")]
pub fn preload_webgpu_runtime() {
    spawn_local(async {
        let _ = dmb_wasm::ensure_webgpu_helpers_loaded().await;
    });
}

#[cfg(not(feature = "hydrate"))]
pub fn preload_webgpu_runtime() {}

#[cfg(feature = "hydrate")]
pub fn detect_ai_capabilities() -> AiCapabilities {
    ensure_default_worker_threshold();
    let webgpu_disabled = webgpu_disabled_value();
    detect_ai_capabilities_with_webgpu_disabled(webgpu_disabled)
}

#[cfg(not(feature = "hydrate"))]
#[must_use]
pub fn detect_ai_capabilities() -> AiCapabilities {
    AiCapabilities::default()
}

#[cfg(feature = "hydrate")]
pub async fn probe_webgpu_device() -> Option<bool> {
    dmb_wasm::webgpu_probe_available().await
}

#[cfg(feature = "hydrate")]
async fn warm_webgpu_worker() {
    if let Some(status) = dmb_wasm::warm_webgpu_worker().await {
        if !status.warmed {
            record_ai_warning("webgpu_worker_warm_failed", status.reason);
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
#[serde(rename_all = "camelCase")]
pub struct WebgpuPolicyTelemetry {
    #[serde(default)]
    pub counters: HashMap<String, u64>,
    #[serde(default)]
    pub last_event: Option<String>,
    #[serde(default)]
    pub last_event_ts: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct WebgpuPolicySnapshot {
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
    pub telemetry: WebgpuPolicyTelemetry,
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
#[allow(clippy::struct_excessive_bools)]
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
    pub webgpu_policy: Option<WebgpuPolicySnapshot>,
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
pub(crate) const AI_TELEMETRY_KEY: &str = "dmb-ai-telemetry";
#[cfg(feature = "hydrate")]
pub(crate) const WEBGPU_POLICY_KEY: &str = "dmb-webgpu-policy";
#[cfg(feature = "hydrate")]
pub(crate) const WORKER_THRESHOLD_KEY: &str = "dmb-webgpu-worker-threshold";
#[cfg(feature = "hydrate")]
pub(crate) const WEBGPU_DISABLE_KEY: &str = "dmb-webgpu-disabled";
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
pub(crate) const AI_CONFIG_SEEDED_KEY: &str = "dmb-ai-config-seeded";
#[cfg(feature = "hydrate")]
pub(crate) const AI_CONFIG_VERSION_KEY: &str = "dmb-ai-config-version";
#[cfg(feature = "hydrate")]
pub(crate) const AI_CONFIG_GENERATED_AT_KEY: &str = "dmb-ai-config-generated-at";
#[cfg(feature = "hydrate")]
const AI_CONFIG_URL: &str = "/data/ai-config.json";
#[cfg(feature = "hydrate")]
const WEBGPU_WORKER_BENCH_KEY: &str = "dmb-webgpu-worker-bench";
#[cfg(feature = "hydrate")]
pub(crate) const EMBEDDING_SAMPLE_KEY: &str = "dmb-embedding-sample";
#[cfg(feature = "hydrate")]
const MIN_WORKER_THRESHOLD: usize = 5_000;
#[cfg(feature = "hydrate")]
const MAX_WORKER_THRESHOLD: usize = 1_000_000;
#[cfg(feature = "hydrate")]
const WORKER_FAIL_COOLDOWN_MS: f64 = 10.0 * 60.0 * 1000.0;
#[cfg(feature = "hydrate")]
const WORKER_MAX_FLOATS_FALLBACK: usize = 2_000_000;
#[cfg(feature = "hydrate")]
const WORKER_BENCH_MAX_FLOATS: usize = 400_000;
#[cfg(feature = "hydrate")]
const MIN_ANN_CAP_MB: u64 = 128;
#[cfg(feature = "hydrate")]
const MAX_ANN_CAP_MB: u64 = 2048;
#[cfg(any(feature = "hydrate", test))]
const IVF_CAP_RATIO_NUMERATOR: u64 = 15;
#[cfg(any(feature = "hydrate", test))]
const IVF_CAP_RATIO_DENOMINATOR: u64 = 100;
#[cfg(any(feature = "hydrate", test))]
const IVF_MIN_CAP_BYTES: u64 = 32 * 1024 * 1024;
#[cfg(any(feature = "hydrate", test))]
const IVF_MAX_CAP_BYTES: u64 = 256 * 1024 * 1024;
#[cfg(feature = "hydrate")]
pub(crate) const AI_WARNING_EVENTS_KEY: &str = "dmb-ai-warning-events";
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
            scale_u64_ratio(DEFAULT_MAX_MATRIX_BYTES, 3, 2),
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

fn cap_policy_from_navigator() -> CapPolicy {
    #[cfg(feature = "hydrate")]
    {
        cap_policy_from_device_memory(crate::browser::runtime::navigator_device_memory_gb())
    }
    #[cfg(not(feature = "hydrate"))]
    {
        CapPolicy {
            cap_bytes: DEFAULT_MAX_MATRIX_BYTES,
            device_memory_gb: None,
            tier: "ssr".to_string(),
            cap_override_mb: None,
        }
    }
}

fn webgpu_matrix_allowed(matrix_bytes: u64, policy_cap: u64) -> bool {
    matrix_bytes <= policy_cap.min(WEBGPU_MATRIX_CAP_BYTES)
}

#[cfg(any(feature = "hydrate", test))]
fn scale_u64_ratio(value: u64, numerator: u64, denominator: u64) -> u64 {
    if denominator == 0 {
        return value;
    }
    value.saturating_mul(numerator) / denominator
}

#[cfg(any(feature = "hydrate", test))]
fn max_vectors_for_cap_bytes(cap_bytes: u64, dim: usize) -> usize {
    if dim == 0 {
        return 0;
    }
    let bytes_per_vector = u64::try_from(dim)
        .ok()
        .and_then(|value| value.checked_mul(4))
        .filter(|value| *value > 0)
        .unwrap_or(u64::MAX);
    let max_vectors = (cap_bytes / bytes_per_vector).max(1);
    usize::try_from(max_vectors).unwrap_or(usize::MAX)
}

#[cfg(any(feature = "hydrate", test))]
fn ivf_cap_bytes_for_matrix(cap_bytes: u64) -> u64 {
    let scaled = scale_u64_ratio(
        cap_bytes,
        IVF_CAP_RATIO_NUMERATOR,
        IVF_CAP_RATIO_DENOMINATOR,
    );
    scaled.clamp(IVF_MIN_CAP_BYTES, IVF_MAX_CAP_BYTES)
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
    let ivf_bytes = ivf.as_ref().map(|ivf| {
        let centroid_floats: usize = ivf.centroids.iter().map(std::vec::Vec::len).sum();
        let list_entries: usize = ivf.lists.iter().map(std::vec::Vec::len).sum();
        (centroid_floats as u64 * 4).saturating_add(list_entries as u64 * 4)
    });
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

    let max_vectors = max_vectors_for_cap_bytes(cap_bytes, dim);
    let target_vectors = max_vectors
        .max(MIN_SAMPLE_RECORDS)
        .min(records.len().max(1));

    let (new_records, new_matrix) = if use_ann {
        let mut records = records;
        let mut matrix = matrix;
        let keep = target_vectors.min(matrix.len() / dim);
        records.truncate(keep);
        matrix.truncate(keep * dim);
        (records, matrix)
    } else {
        let total = records.len().max(1);
        let step = total.div_ceil(target_vectors.max(1));
        let mut new_records = Vec::with_capacity(target_vectors);
        let mut new_matrix = Vec::with_capacity(target_vectors * dim);
        for (idx, record) in records.into_iter().enumerate() {
            if idx % step != 0 {
                continue;
            }
            let start = idx * dim;
            let end = start + dim;
            let Some(vector_slice) = matrix.get(start..end) else {
                break;
            };
            new_matrix.extend_from_slice(vector_slice);
            new_records.push(record);
            if new_records.len() >= target_vectors {
                break;
            }
        }
        (new_records, new_matrix)
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

#[must_use]
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
#[allow(clippy::unused_async)]
async fn webgpu_probe_ok() -> bool {
    false
}

#[cfg(feature = "hydrate")]
fn read_worker_threshold() -> Option<usize> {
    local_storage_parse(WORKER_THRESHOLD_KEY)
}

#[cfg(feature = "hydrate")]
fn parse_worker_threshold(raw: Option<String>) -> Option<usize> {
    raw.and_then(|value| value.parse::<usize>().ok())
        .map(clamp_worker_threshold)
}

#[cfg(feature = "hydrate")]
fn read_worker_max_floats() -> Option<usize> {
    let device_memory = crate::browser::runtime::navigator_device_memory_gb();
    let cores = crate::browser::runtime::navigator_hardware_concurrency().unwrap_or(1);
    let max_floats = if device_memory.unwrap_or(0.0) >= 16.0 || cores >= 12 {
        4_000_000
    } else if device_memory.unwrap_or(0.0) >= 8.0 || cores >= 8 {
        2_500_000
    } else if device_memory.unwrap_or(0.0) >= 4.0 {
        1_500_000
    } else {
        900_000
    };
    Some(max_floats)
}

#[cfg(feature = "hydrate")]
fn load_webgpu_policy_telemetry(storage: &web_sys::Storage) -> WebgpuPolicyTelemetry {
    storage_item(storage, WEBGPU_POLICY_KEY)
        .and_then(|payload| serde_json::from_str::<WebgpuPolicyTelemetry>(&payload).ok())
        .unwrap_or_default()
}

#[cfg(feature = "hydrate")]
fn store_webgpu_policy_telemetry(storage: &web_sys::Storage, telemetry: &WebgpuPolicyTelemetry) {
    set_storage_json(storage, WEBGPU_POLICY_KEY, telemetry);
}

#[cfg(feature = "hydrate")]
fn bump_webgpu_policy_metric(storage: &web_sys::Storage, event: &str) {
    let mut telemetry = load_webgpu_policy_telemetry(storage);
    *telemetry.counters.entry(event.to_string()).or_insert(0) += 1;
    telemetry.last_event = Some(event.to_string());
    telemetry.last_event_ts = Some(js_sys::Date::now());
    store_webgpu_policy_telemetry(storage, &telemetry);
}

#[cfg(feature = "hydrate")]
fn reset_webgpu_policy_telemetry_storage(storage: &web_sys::Storage) {
    remove_storage_item(storage, WEBGPU_POLICY_KEY);
}

#[cfg(feature = "hydrate")]
pub fn worker_threshold_value() -> Option<usize> {
    ensure_default_worker_threshold();
    read_worker_threshold()
}

#[cfg(feature = "hydrate")]
pub fn worker_max_floats_value() -> Option<usize> {
    read_worker_max_floats()
}

#[cfg_attr(not(feature = "hydrate"), must_use)]
pub fn worker_failure_status() -> WorkerFailureStatus {
    #[cfg(feature = "hydrate")]
    {
        with_local_storage(worker_failure_status_from_storage).unwrap_or_default()
    }
    #[cfg(not(feature = "hydrate"))]
    {
        WorkerFailureStatus::default()
    }
}

#[cfg(feature = "hydrate")]
pub fn clear_worker_failure_status() {
    let _ = with_local_storage(|storage| {
        clear_worker_failure_storage(storage);
        bump_webgpu_policy_metric(storage, "worker_failure_cleared");
    });
    store_ai_telemetry_snapshot(ann_cap_diagnostics().as_ref());
}

#[cfg(feature = "hydrate")]
pub fn set_worker_threshold_override(value: Option<usize>) {
    match value {
        Some(val) => {
            let clamped = clamp_worker_threshold(val);
            store_worker_threshold(clamped);
        }
        None => {
            remove_local_storage_item(WORKER_THRESHOLD_KEY);
            reset_worker_threshold_ready();
            ensure_default_worker_threshold();
        }
    }
    store_ai_telemetry_snapshot(ann_cap_diagnostics().as_ref());
}

#[cfg(feature = "hydrate")]
fn read_ann_cap_override_mb() -> Option<u64> {
    local_storage_parse::<u64>(ANN_CAP_OVERRIDE_KEY)
        .map(|mb| mb.clamp(MIN_ANN_CAP_MB, MAX_ANN_CAP_MB))
}

#[cfg(feature = "hydrate")]
pub fn ann_cap_override_mb() -> Option<u64> {
    read_ann_cap_override_mb()
}

#[cfg(feature = "hydrate")]
pub fn set_ann_cap_override_mb(value: Option<u64>) {
    match value {
        Some(mb) => {
            let clamped = mb.clamp(MIN_ANN_CAP_MB, MAX_ANN_CAP_MB);
            set_local_storage_item(ANN_CAP_OVERRIDE_KEY, &clamped.to_string());
        }
        None => {
            remove_local_storage_item(ANN_CAP_OVERRIDE_KEY);
        }
    }
    store_ai_telemetry_snapshot(ann_cap_diagnostics().as_ref());
}

#[cfg(feature = "hydrate")]
pub fn set_webgpu_disabled(disabled: bool) {
    set_local_storage_flag(WEBGPU_DISABLE_KEY, disabled);
    if disabled {
        clear_worker_matrix_signature();
        dmb_wasm::reset_webgpu_worker_runtime();
    }
    WEBGPU_DISABLED_CACHE.with(|cache| {
        *cache.borrow_mut() = Some(disabled);
    });
}

#[cfg(feature = "hydrate")]
fn store_worker_threshold(value: usize) {
    set_local_storage_item(WORKER_THRESHOLD_KEY, &value.to_string());
    let _ = with_local_storage(|storage| {
        bump_webgpu_policy_metric(storage, "worker_threshold_updated");
    });
    mark_worker_threshold_ready();
}

#[cfg(feature = "hydrate")]
fn ensure_default_worker_threshold() {
    if worker_threshold_ready() {
        return;
    }
    if read_worker_threshold().is_some() {
        mark_worker_threshold_ready();
        return;
    }
    let device_memory = crate::browser::runtime::navigator_device_memory_gb();
    let cores = crate::browser::runtime::navigator_hardware_concurrency().unwrap_or(1);
    let threshold = if device_memory.unwrap_or(0.0) >= 16.0 || cores >= 12 {
        15_000
    } else if device_memory.unwrap_or(0.0) <= 4.0 || cores <= 4 {
        60_000
    } else if device_memory.unwrap_or(0.0) >= 8.0 || cores >= 8 {
        25_000
    } else {
        35_000
    };
    store_worker_threshold(clamp_worker_threshold(threshold));
}

#[cfg(feature = "hydrate")]
fn clamp_worker_threshold(value: usize) -> usize {
    value.clamp(MIN_WORKER_THRESHOLD, MAX_WORKER_THRESHOLD)
}

#[cfg(feature = "hydrate")]
fn detect_ai_capabilities_with_webgpu_disabled(webgpu_disabled: bool) -> AiCapabilities {
    let webgpu = js_value_exists(&navigator_property("gpu"));
    let webgpu_helper_failed = dmb_wasm::webgpu_helpers_failed();
    let webgpu_worker = dmb_wasm::webgpu_worker_supported();
    let webgpu_available = webgpu && !webgpu_helper_failed;
    if webgpu && webgpu_helper_failed {
        record_ai_warning_once(
            WEBGPU_HELPER_WARN_KEY,
            "webgpu_helper_missing",
            "navigator.gpu present but WebGPU module failed to load",
        );
    }
    let webnn = js_value_exists(&navigator_property("ml"));
    let threads = crate::browser::runtime::cross_origin_isolated().unwrap_or(false);

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

#[cfg(feature = "hydrate")]
fn worker_failure_status_from_storage(storage: &web_sys::Storage) -> WorkerFailureStatus {
    let now = js_sys::Date::now();
    let until =
        storage_item(storage, WORKER_FAILURE_UNTIL_KEY).and_then(|raw| raw.parse::<f64>().ok());
    let remaining = until.and_then(|ts| if ts <= now { None } else { Some(ts - now) });
    if remaining.is_some() {
        record_ai_warning_once(
            WORKER_COOLDOWN_WARN_KEY,
            "webgpu_worker_cooldown",
            "WebGPU worker in cooldown; using direct scoring",
        );
    }
    WorkerFailureStatus {
        cooldown_until_ms: until,
        cooldown_remaining_ms: remaining,
        last_error: storage_item(storage, WORKER_FAILURE_REASON_KEY),
    }
}

#[cfg(feature = "hydrate")]
fn set_worker_failure_cooldown(storage: &web_sys::Storage, reason: &str) {
    let until = js_sys::Date::now() + WORKER_FAIL_COOLDOWN_MS;
    set_storage_item(storage, WORKER_FAILURE_UNTIL_KEY, &until.to_string());
    set_storage_item(storage, WORKER_FAILURE_REASON_KEY, reason);
    remove_storage_item(storage, WORKER_COOLDOWN_WARN_KEY);
    bump_webgpu_policy_metric(storage, "worker_failure_marked");
}

#[cfg(feature = "hydrate")]
fn clear_worker_failure_storage(storage: &web_sys::Storage) {
    for key in [
        WORKER_FAILURE_UNTIL_KEY,
        WORKER_FAILURE_REASON_KEY,
        WORKER_COOLDOWN_WARN_KEY,
    ] {
        remove_storage_item(storage, key);
    }
}

#[cfg(feature = "hydrate")]
fn worker_preflight_allows(
    storage: &web_sys::Storage,
    matrix_floats: usize,
    metric_prefix: &str,
) -> bool {
    let failure = worker_failure_status_from_storage(storage);
    if failure.cooldown_remaining_ms.is_some() {
        bump_webgpu_policy_metric(storage, &format!("{metric_prefix}_fallback_cooldown"));
        return false;
    }

    let worker_max_floats = read_worker_max_floats().unwrap_or(WORKER_MAX_FLOATS_FALLBACK);
    if matrix_floats > worker_max_floats {
        bump_webgpu_policy_metric(storage, &format!("{metric_prefix}_fallback_maxfloats"));
        return false;
    }

    let threshold = parse_worker_threshold(storage_item(storage, WORKER_THRESHOLD_KEY))
        .unwrap_or(MIN_WORKER_THRESHOLD);
    if matrix_floats < threshold {
        bump_webgpu_policy_metric(
            storage,
            &format!("{metric_prefix}_fallback_below_threshold"),
        );
        return false;
    }

    true
}

#[cfg(feature = "hydrate")]
fn webgpu_policy_snapshot_from_storage(storage: &web_sys::Storage) -> WebgpuPolicySnapshot {
    let failure = worker_failure_status_from_storage(storage);
    WebgpuPolicySnapshot {
        worker_threshold: parse_worker_threshold(storage_item(storage, WORKER_THRESHOLD_KEY)),
        worker_max_floats: read_worker_max_floats(),
        worker_failure_until_ms: failure.cooldown_until_ms,
        worker_failure_remaining_ms: failure.cooldown_remaining_ms,
        worker_failure_reason: failure.last_error,
        telemetry: load_webgpu_policy_telemetry(storage),
    }
}

#[cfg(feature = "hydrate")]
pub fn load_webgpu_policy_snapshot() -> Option<WebgpuPolicySnapshot> {
    with_local_storage(webgpu_policy_snapshot_from_storage)
}

#[cfg(feature = "hydrate")]
pub fn reset_webgpu_policy_telemetry() {
    let _ = with_local_storage(reset_webgpu_policy_telemetry_storage);
}

#[cfg(feature = "hydrate")]
#[derive(Debug, Clone, Default)]
struct TelemetryStorageSnapshot {
    ann_cap_override_mb: Option<u64>,
    worker_threshold: Option<usize>,
    worker_failure: WorkerFailureStatus,
    webgpu_policy: WebgpuPolicySnapshot,
    ai_config_version: Option<String>,
    ai_config_generated_at: Option<String>,
    ai_config_seeded: bool,
    embedding_sample_enabled: bool,
    webgpu_disabled: bool,
}

#[cfg(feature = "hydrate")]
fn telemetry_storage_snapshot(storage: &web_sys::Storage) -> TelemetryStorageSnapshot {
    TelemetryStorageSnapshot {
        ann_cap_override_mb: storage_item(storage, ANN_CAP_OVERRIDE_KEY)
            .and_then(|raw| raw.parse::<u64>().ok())
            .map(|mb| mb.clamp(MIN_ANN_CAP_MB, MAX_ANN_CAP_MB)),
        worker_threshold: parse_worker_threshold(storage_item(storage, WORKER_THRESHOLD_KEY)),
        worker_failure: worker_failure_status_from_storage(storage),
        webgpu_policy: webgpu_policy_snapshot_from_storage(storage),
        ai_config_version: storage_item(storage, AI_CONFIG_VERSION_KEY),
        ai_config_generated_at: storage_item(storage, AI_CONFIG_GENERATED_AT_KEY),
        ai_config_seeded: storage_flag_enabled(storage, AI_CONFIG_SEEDED_KEY),
        embedding_sample_enabled: storage_flag_enabled(storage, EMBEDDING_SAMPLE_KEY),
        webgpu_disabled: parse_webgpu_disabled(storage_item(storage, WEBGPU_DISABLE_KEY)),
    }
}

#[cfg(feature = "hydrate")]
fn store_ai_telemetry_snapshot(ann_cap: Option<&AnnCapDiagnostics>) {
    ensure_default_worker_threshold();
    let local_state = with_local_storage(telemetry_storage_snapshot).unwrap_or_default();
    let caps = detect_ai_capabilities_with_webgpu_disabled(local_state.webgpu_disabled);
    let payload = serde_json::json!({
        "timestampMs": js_sys::Date::now(),
        "annCap": ann_cap,
        "annCapOverrideMb": local_state.ann_cap_override_mb,
        "workerThreshold": local_state.worker_threshold,
        "workerMaxFloats": read_worker_max_floats(),
        "workerFailureUntilMs": local_state.worker_failure.cooldown_until_ms,
        "workerFailureRemainingMs": local_state.worker_failure.cooldown_remaining_ms,
        "workerFailureReason": local_state.worker_failure.last_error,
        "webgpuPolicy": local_state.webgpu_policy,
        "webgpuAvailable": caps.webgpu_available,
        "webgpuEnabled": caps.webgpu_enabled,
        "webgpuWorker": caps.webgpu_worker,
        "webnn": caps.webnn,
        "threads": caps.threads,
        "aiConfigVersion": local_state.ai_config_version,
        "aiConfigGeneratedAt": local_state.ai_config_generated_at,
        "aiConfigSeeded": Some(local_state.ai_config_seeded),
        "embeddingSampleEnabled": Some(local_state.embedding_sample_enabled),
    });
    set_local_storage_json(AI_TELEMETRY_KEY, &payload);
}

#[cfg(feature = "hydrate")]
pub fn load_ai_telemetry_snapshot() -> Option<AiTelemetrySnapshot> {
    let payload = local_storage_item(AI_TELEMETRY_KEY)?;
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

#[cfg_attr(not(feature = "hydrate"), allow(clippy::needless_pass_by_value))]
fn record_ai_warning(event: &str, details: Option<String>) {
    #[cfg(feature = "hydrate")]
    {
        let _ = with_local_storage(|storage| {
            let mut events: Vec<AiWarningEvent> = storage_item(storage, AI_WARNING_EVENTS_KEY)
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
            set_storage_json(storage, AI_WARNING_EVENTS_KEY, &events);
        });
    }
    #[cfg(not(feature = "hydrate"))]
    {
        let _ = event;
        let _ = details;
    }
}

#[cfg(feature = "hydrate")]
pub fn load_ai_warning_events() -> Vec<AiWarningEvent> {
    local_storage_json(AI_WARNING_EVENTS_KEY).unwrap_or_default()
}

#[cfg(feature = "hydrate")]
async fn fetch_json<T: serde::de::DeserializeOwned>(url: &str) -> Option<T> {
    crate::browser::http::fetch_json(url).await
}

#[cfg(feature = "hydrate")]
pub async fn fetch_ai_config_meta() -> Option<AiConfigMeta> {
    fetch_json::<AiConfigMeta>(AI_CONFIG_URL).await
}

#[cfg(feature = "hydrate")]
fn normalize_ai_config_meta_field(value: Option<String>) -> Option<String> {
    value
        .map(|item| item.trim().to_string())
        .filter(|item| !item.is_empty())
}

#[cfg(feature = "hydrate")]
#[derive(Debug, Clone)]
pub struct AiConfigMetaReconcile {
    pub remote_version: Option<String>,
    pub remote_generated_at: Option<String>,
    pub local_version: Option<String>,
    pub local_generated_at: Option<String>,
    pub mismatched: bool,
}

#[cfg(feature = "hydrate")]
pub async fn reconcile_ai_config_meta(
    remote: AiConfigMeta,
    local_version: Option<String>,
    local_generated_at: Option<String>,
) -> AiConfigMetaReconcile {
    let remote_version = normalize_ai_config_meta_field(remote.version);
    let remote_generated_at = normalize_ai_config_meta_field(remote.generated_at);
    let mut next_local_version = normalize_ai_config_meta_field(local_version);
    let mut next_local_generated_at = normalize_ai_config_meta_field(local_generated_at);
    let mut mismatched =
        remote_version != next_local_version || remote_generated_at != next_local_generated_at;

    if mismatched {
        if refresh_ai_config().await {
            next_local_version = normalize_ai_config_meta_field(ai_config_version());
            next_local_generated_at = normalize_ai_config_meta_field(ai_config_generated_at());
            mismatched = remote_version != next_local_version
                || remote_generated_at != next_local_generated_at;
        }

        if mismatched
            && sync_ai_config_meta(remote_version.as_deref(), remote_generated_at.as_deref())
        {
            next_local_version = remote_version.clone();
            next_local_generated_at = remote_generated_at.clone();
            mismatched = false;
        }
    }

    AiConfigMetaReconcile {
        remote_version,
        remote_generated_at,
        local_version: next_local_version,
        local_generated_at: next_local_generated_at,
        mismatched,
    }
}

#[cfg(feature = "hydrate")]
pub async fn fetch_and_reconcile_ai_config_meta(
    local_version: Option<String>,
    local_generated_at: Option<String>,
) -> Option<AiConfigMetaReconcile> {
    let remote = fetch_ai_config_meta().await?;
    Some(reconcile_ai_config_meta(remote, local_version, local_generated_at).await)
}

#[cfg(feature = "hydrate")]
pub fn ai_config_remote_meta_label(
    remote_version: Option<&str>,
    remote_generated_at: Option<&str>,
) -> String {
    format!(
        "{} @ {}",
        remote_version.unwrap_or("n/a"),
        remote_generated_at.unwrap_or("n/a")
    )
}

#[cfg(feature = "hydrate")]
pub fn ai_config_mismatch_status_message(
    reconciled: &AiConfigMetaReconcile,
    prefix: &str,
    suffix: &str,
) -> Option<String> {
    if !reconciled.mismatched {
        return None;
    }
    Some(format!(
        "{prefix}{}{suffix}",
        ai_config_remote_meta_label(
            reconciled.remote_version.as_deref(),
            reconciled.remote_generated_at.as_deref()
        )
    ))
}

#[cfg(feature = "hydrate")]
pub fn sync_ai_config_meta(version: Option<&str>, generated_at: Option<&str>) -> bool {
    with_local_storage(|storage| {
        if let Some(version) = version {
            set_storage_item(storage, AI_CONFIG_VERSION_KEY, version);
        }
        if let Some(generated_at) = generated_at {
            set_storage_item(storage, AI_CONFIG_GENERATED_AT_KEY, generated_at);
        }
        set_storage_item(storage, AI_CONFIG_SEEDED_KEY, "1");
    })
    .is_some()
}

#[cfg(feature = "hydrate")]
async fn fetch_f32_array_with_cap(url: &str, cap_bytes: u64) -> Option<Vec<f32>> {
    use wasm_bindgen_futures::JsFuture;

    let resp = crate::browser::http::fetch_response(url).await.ok()?;
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
pub fn load_ai_tuning() -> AiTuning {
    local_storage_json("dmb-ai-tuning").unwrap_or(AiTuning {
        probe_override: None,
        target_latency_ms: 12.0,
        last_latency_ms: None,
    })
}

#[cfg(feature = "hydrate")]
pub fn store_ai_tuning(tuning: &AiTuning) {
    set_local_storage_json("dmb-ai-tuning", tuning);
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
async fn fetch_and_apply_ai_config_seed(overwrite: bool) -> bool {
    let Some(storage) = local_storage() else {
        return false;
    };
    let seed = match fetch_json::<AiConfigSeed>(AI_CONFIG_URL).await {
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

#[cfg(feature = "hydrate")]
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

#[cfg(feature = "hydrate")]
pub fn ai_config_version() -> Option<String> {
    local_storage_item(AI_CONFIG_VERSION_KEY)
}

#[cfg(feature = "hydrate")]
pub fn ai_config_generated_at() -> Option<String> {
    local_storage_item(AI_CONFIG_GENERATED_AT_KEY)
}

#[cfg(feature = "hydrate")]
pub fn webgpu_worker_bench_timestamp() -> Option<f64> {
    local_storage_parse(WEBGPU_WORKER_BENCH_KEY)
}

#[cfg(feature = "hydrate")]
pub fn embedding_sample_enabled() -> bool {
    local_storage_flag_enabled(EMBEDDING_SAMPLE_KEY)
}

#[cfg(feature = "hydrate")]
pub fn set_embedding_sample_enabled(enabled: bool) {
    set_local_storage_flag(EMBEDDING_SAMPLE_KEY, enabled);
}

#[cfg(feature = "hydrate")]
pub fn benchmark_history() -> Vec<AiBenchmarkSample> {
    load_benchmark_history()
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
    let raw_index = latencies
        .len()
        .saturating_sub(1)
        .saturating_mul(3)
        .div_ceil(4);
    let selected = raw_index.min(latencies.len().saturating_sub(1));
    let raw = latencies.get(selected).copied().unwrap_or_default();
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
pub async fn load_embedding_index() -> Option<Arc<EmbeddingIndex>> {
    if let Some(existing) = EMBEDDING_INDEX.get() {
        return Some(existing.clone());
    }
    if !ai_config_seeded() {
        let _ = fetch_and_apply_ai_config_seed(false).await;
    }
    if embedding_sample_enabled() {
        let entries =
            fetch_json::<Vec<EmbeddingSampleEntry>>("/data/embedding-sample.json").await?;
        if !entries.is_empty() {
            let dim = EMBEDDING_DIM;
            let mut records = Vec::with_capacity(entries.len());
            let mut matrix = Vec::with_capacity(entries.len() * dim);
            for entry in entries {
                let EmbeddingSampleEntry {
                    id,
                    kind,
                    slug,
                    label,
                    text,
                    vector,
                } = entry;
                let vector = if let Some(vector) = vector {
                    vector
                } else {
                    hashed_embedding(text.as_deref().unwrap_or_default(), dim)
                };
                let mut normalized_label = label.or(text).filter(|v| !v.is_empty());
                if normalized_label.is_none() {
                    normalized_label = Some(format!("{kind} {id}"));
                }
                matrix.extend_from_slice(&vector);
                records.push(EmbeddingRecord {
                    id,
                    kind,
                    slug,
                    label: normalized_label,
                    // Keep vectors only in the contiguous matrix to avoid doubling memory.
                    vector: Vec::new(),
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
            let sample_index = Arc::new(EmbeddingIndex {
                dim,
                records,
                matrix,
                ivf: None,
            });
            let _ = EMBEDDING_INDEX.set(sample_index.clone());
            return Some(sample_index);
        }
    }
    let manifest = if let Some(manifest) = dmb_idb::get_embedding_manifest(CORE_SCHEMA_VERSION)
        .await
        .ok()
        .flatten()
    {
        manifest
    } else {
        let fetched = match fetch_json::<EmbeddingManifest>("/data/embedding-manifest.json").await {
            Some(payload) => payload,
            None => {
                record_ai_warning("embedding_manifest_fetch_failed", None);
                return None;
            }
        };
        dmb_idb::store_embedding_manifest(&fetched).await.ok()?;
        for chunk in &fetched.chunks {
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
        dmb_idb::get_embedding_manifest(CORE_SCHEMA_VERSION)
            .await
            .ok()
            .flatten()?
    };
    // Snapshot cap policy once so all loading decisions use a consistent memory budget.
    let policy = cap_policy_from_navigator();
    let max_vectors = max_vectors_for_cap_bytes(
        policy.cap_bytes,
        usize::try_from(manifest.dim).unwrap_or(usize::MAX),
    );
    let target_vectors = max_vectors.max(MIN_SAMPLE_RECORDS);
    let ann_meta = load_ann_meta().await;
    let matrix = if let Some(meta) = ann_meta.as_ref() {
        let vectors = if meta.dim != manifest.dim {
            record_ai_warning(
                "ann_index_dim_mismatch",
                Some(format!(
                    "meta_dim {} != expected {}",
                    meta.dim, manifest.dim
                )),
            );
            None
        } else {
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
                None
            } else {
                match fetch_f32_array_with_cap("/data/ann-index.bin", policy.cap_bytes).await {
                    Some(vectors) => {
                        let expected_len =
                            meta.record_count.checked_mul(meta.dim).map(|v| v as usize);
                        if let Some(expected_len) = expected_len {
                            if vectors.len() != expected_len {
                                web_sys::console::warn_1(&wasm_bindgen::JsValue::from_str(
                                    "ann-index size mismatch; falling back to embedded vectors",
                                ));
                                record_ai_warning(
                                    "ann_index_size_mismatch",
                                    Some(format!("expected {expected_len}, got {}", vectors.len())),
                                );
                                None
                            } else {
                                Some(vectors)
                            }
                        } else {
                            None
                        }
                    }
                    None => None,
                }
            }
        };
        vectors.unwrap_or_else(Vec::new)
    } else {
        Vec::new()
    };
    let use_ann = !matrix.is_empty();
    let ivf = if use_ann {
        if let Some(meta) = ann_meta.as_ref() {
            if meta.method != "ivf-flat" {
                None
            } else if let Some(file) = meta.index_file.as_deref() {
                let clusters = meta.cluster_count.unwrap_or(0);
                let estimate = if clusters == 0 || meta.dim == 0 {
                    None
                } else {
                    let centroid_bytes = (clusters as u64)
                        .saturating_mul(meta.dim as u64)
                        .saturating_mul(4);
                    let list_bytes = (meta.record_count as u64).saturating_mul(4);
                    Some(centroid_bytes.saturating_add(list_bytes))
                };
                if let Some(estimate) = estimate {
                    let cap = ivf_cap_bytes_for_matrix(policy.cap_bytes);
                    if estimate > cap {
                        record_ai_warning(
                            "ivf_estimate_cap_exceeded",
                            Some(format!("{estimate} bytes > {cap} bytes")),
                        );
                        None
                    } else {
                        let url = format!("/data/{file}");
                        match fetch_json::<AnnIvfIndex>(&url).await {
                            Some(ivf) if ivf.dim == meta.dim && ivf.cluster_count > 0 => Some(ivf),
                            _ => None,
                        }
                    }
                } else {
                    let url = format!("/data/{file}");
                    match fetch_json::<AnnIvfIndex>(&url).await {
                        Some(ivf) if ivf.dim == meta.dim && ivf.cluster_count > 0 => Some(ivf),
                        _ => None,
                    }
                }
            } else {
                None
            }
        } else {
            None
        }
    } else {
        None
    };
    let dim = manifest.dim as usize;
    let (records, matrix, chunks_loaded, budget_capped) = {
        let estimated_records = manifest
            .chunks
            .iter()
            .map(|chunk| chunk.count as usize)
            .sum::<usize>();
        let record_capacity = if use_ann {
            estimated_records
        } else {
            estimated_records.min(target_vectors)
        };
        let mut records = Vec::with_capacity(record_capacity);
        let mut matrix = matrix;
        if !use_ann {
            let reserve_vectors = estimated_records.min(target_vectors);
            matrix.reserve(reserve_vectors.saturating_mul(dim));
        }
        let mut chunks_loaded = 0usize;
        let mut budget_capped = false;

        for meta in &manifest.chunks {
            if let Some(chunk) = dmb_idb::get_embedding_chunk(meta.chunk_id)
                .await
                .ok()
                .flatten()
            {
                for mut record in chunk.records {
                    if record.label.is_none() {
                        record.label = Some(format!("{} {}", record.kind, record.id));
                    }
                    if !use_ann {
                        matrix.extend_from_slice(&record.vector);
                    }
                    // Keep vectors only in the contiguous matrix to avoid doubling memory.
                    record.vector = Vec::new();
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
    };

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

    let (records, matrix, ivf, mut diagnostics) =
        cap_embedding_index_with_policy(records, matrix, dim, ivf, use_ann, policy);
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
    let caps = detect_ai_capabilities();
    if caps.webgpu_enabled && local_storage_item(WEBGPU_WORKER_BENCH_KEY).is_none() {
        spawn_local(async move {
            let _ = benchmark_worker_threshold().await;
            set_local_storage_item(WEBGPU_WORKER_BENCH_KEY, &js_sys::Date::now().to_string());
        });
    }
    if caps.webgpu_worker {
        spawn_local(async move {
            warm_webgpu_worker().await;
        });
    }
    Some(index)
}

#[cfg(not(feature = "hydrate"))]
#[allow(clippy::unused_async)]
pub async fn load_embedding_index() -> Option<Arc<EmbeddingIndex>> {
    None
}

#[cfg(feature = "hydrate")]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum WebgpuPolicyBackend {
    Worker,
    Direct,
}

#[cfg(feature = "hydrate")]
fn webgpu_policy_event(event: &str) {
    let _ = with_local_storage(|storage| {
        bump_webgpu_policy_metric(storage, event);
    });
}

#[cfg(feature = "hydrate")]
fn mark_worker_runtime_failure(reason: &str, fallback_event: &str) {
    clear_worker_matrix_signature();
    dmb_wasm::reset_webgpu_worker_runtime();
    let _ = with_local_storage(|storage| {
        set_worker_failure_cooldown(storage, reason);
        bump_webgpu_policy_metric(storage, fallback_event);
    });
}

#[cfg(feature = "hydrate")]
fn clear_worker_runtime_failure() {
    let _ = with_local_storage(clear_worker_failure_storage);
}

#[cfg(feature = "hydrate")]
fn matrix_to_js_array(matrix: &[f32], use_cache: bool) -> js_sys::Float32Array {
    if !use_cache {
        return js_sys::Float32Array::from(matrix);
    }
    let signature = matrix_js_signature(matrix);
    WEBGPU_MATRIX_JS_CACHE.with(|cache| {
        let mut cache_ref = cache.borrow_mut();
        if let Some(existing) = cache_ref.as_ref() {
            if existing.signature == signature {
                return existing.array.clone();
            }
        }
        let array = js_sys::Float32Array::from(matrix);
        *cache_ref = Some(WebgpuMatrixJsCache {
            signature,
            array: array.clone(),
        });
        array
    })
}

#[cfg(feature = "hydrate")]
fn with_subset_matrix_slice<T>(
    matrix: &[f32],
    dim: usize,
    indices: &[u32],
    run: impl FnOnce(&[f32]) -> T,
) -> T {
    if dim == 0 || indices.is_empty() {
        return run(&[]);
    }
    let row_count = matrix.len() / dim;
    let target_len = indices.len().saturating_mul(dim);
    WEBGPU_SUBSET_MATRIX_BUFFER.with(|buffer| {
        let mut buffer_ref = buffer.borrow_mut();
        buffer_ref.resize(target_len, 0.0);
        for (pos, idx) in indices.iter().copied().enumerate() {
            let dst_start = pos.saturating_mul(dim);
            let dst_end = dst_start + dim;
            let Some(dst_row) = buffer_ref.get_mut(dst_start..dst_end) else {
                continue;
            };
            let idx = idx as usize;
            if idx < row_count {
                let src_start = idx.saturating_mul(dim);
                if let Some(src_row) = matrix.get(src_start..src_start + dim) {
                    dst_row.copy_from_slice(src_row);
                    continue;
                }
            }
            dst_row.fill(0.0);
        }
        run(&buffer_ref[..target_len])
    })
}

#[cfg(feature = "hydrate")]
async fn webgpu_scores_worker_with_rust_init_state(
    query_array: &js_sys::Float32Array,
    matrix_array: &js_sys::Float32Array,
    dim: usize,
    worker_signature: WebgpuMatrixJsSignature,
) -> Option<js_sys::Float32Array> {
    let requires_init = worker_matrix_requires_init(worker_signature);
    if let Some(scores) = dmb_wasm::webgpu_scores_worker_loaded_with_init(
        query_array,
        matrix_array,
        dim,
        requires_init,
    )
    .await
    {
        set_worker_matrix_signature(worker_signature);
        return Some(scores);
    }

    if !requires_init {
        clear_worker_matrix_signature();
        if let Some(scores) =
            dmb_wasm::webgpu_scores_worker_loaded_with_init(query_array, matrix_array, dim, true)
                .await
        {
            set_worker_matrix_signature(worker_signature);
            return Some(scores);
        }
    }

    None
}

#[cfg(feature = "hydrate")]
async fn webgpu_scores_with_policy(
    query_vec: &[f32],
    matrix: &[f32],
    dim: usize,
    caps: AiCapabilities,
    cache_matrix: bool,
) -> Option<(js_sys::Float32Array, WebgpuPolicyBackend)> {
    if !caps.webgpu_enabled || dim == 0 {
        return None;
    }
    if !dmb_wasm::ensure_webgpu_helpers_loaded().await {
        return None;
    }

    ensure_default_worker_threshold();
    let query_array = js_sys::Float32Array::from(query_vec);
    let matrix_array = matrix_to_js_array(matrix, cache_matrix);

    if caps.webgpu_worker {
        let can_use_worker =
            with_local_storage(|storage| worker_preflight_allows(storage, matrix.len(), "worker"))
                .unwrap_or(false);
        if can_use_worker {
            let worker_signature = matrix_js_signature(matrix);
            webgpu_policy_event("worker_attempts");
            if let Some(scores) = webgpu_scores_worker_with_rust_init_state(
                &query_array,
                &matrix_array,
                dim,
                worker_signature,
            )
            .await
            {
                clear_worker_runtime_failure();
                webgpu_policy_event("worker_success");
                return Some((scores, WebgpuPolicyBackend::Worker));
            }
            mark_worker_runtime_failure(
                "WebGPU worker scoring failed",
                "worker_fallback_runtime_failed",
            );
        }
    } else {
        webgpu_policy_event("worker_fallback_worker_unavailable");
    }

    webgpu_policy_event("direct_scores_calls");
    let direct = dmb_wasm::webgpu_scores_direct_loaded(&query_array, &matrix_array, dim).await?;
    Some((direct, WebgpuPolicyBackend::Direct))
}

#[cfg(feature = "hydrate")]
async fn webgpu_scores_subset_with_policy(
    query_vec: &[f32],
    matrix: &[f32],
    dim: usize,
    indices: &[u32],
    caps: AiCapabilities,
) -> Option<(js_sys::Float32Array, WebgpuPolicyBackend)> {
    if !caps.webgpu_enabled || dim == 0 || indices.is_empty() {
        return None;
    }
    if !dmb_wasm::ensure_webgpu_helpers_loaded().await {
        return None;
    }

    ensure_default_worker_threshold();
    let subset_matrix_floats = indices.len().saturating_mul(dim);
    let query_array = js_sys::Float32Array::from(query_vec);
    let (subset_worker_signature, subset_matrix_array) =
        with_subset_matrix_slice(matrix, dim, indices, |subset| {
            (
                matrix_js_signature(subset),
                js_sys::Float32Array::from(subset),
            )
        });
    if subset_matrix_array.length() == 0 {
        return Some((
            js_sys::Float32Array::new_with_length(0),
            WebgpuPolicyBackend::Direct,
        ));
    }

    if caps.webgpu_worker {
        let can_use_worker = with_local_storage(|storage| {
            worker_preflight_allows(storage, subset_matrix_floats, "subset_worker")
        })
        .unwrap_or(false);
        if can_use_worker {
            webgpu_policy_event("subset_worker_attempts");
            if let Some(scores) = webgpu_scores_worker_with_rust_init_state(
                &query_array,
                &subset_matrix_array,
                dim,
                subset_worker_signature,
            )
            .await
            {
                clear_worker_runtime_failure();
                webgpu_policy_event("subset_worker_success");
                return Some((scores, WebgpuPolicyBackend::Worker));
            }
            mark_worker_runtime_failure(
                "WebGPU subset worker scoring failed",
                "subset_worker_fallback_runtime_failed",
            );
        }
    } else {
        webgpu_policy_event("subset_worker_fallback_worker_unavailable");
    }

    webgpu_policy_event("subset_direct_scores_calls");
    let direct =
        dmb_wasm::webgpu_scores_direct_loaded(&query_array, &subset_matrix_array, dim).await?;
    Some((direct, WebgpuPolicyBackend::Direct))
}

fn scored_to_search_results(index: &EmbeddingIndex, scored: Vec<ScoredIndex>) -> Vec<SearchResult> {
    let mut results = Vec::with_capacity(scored.len());
    for entry in scored {
        if let Some(record) = index.records.get(entry.index) {
            results.push(SearchResult {
                result_type: record.kind.clone(),
                id: record.id,
                slug: record.slug.clone(),
                label: record
                    .label
                    .clone()
                    .unwrap_or_else(|| format!("{} {}", record.kind, record.id)),
                score: entry.score,
            });
        }
    }
    results
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
    let query_vec = hashed_embedding(query, dim);

    let caps = detect_ai_capabilities();
    let total_vectors = index.matrix.len() / dim;
    if total_vectors < 64 {
        let scored = top_k_cosine_native(&query_vec, &index.matrix, dim, limit);
        return scored_to_search_results(index, scored);
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
                load_ai_tuning().probe_override
            }
            #[cfg(not(feature = "hydrate"))]
            {
                None
            }
        };
        let selected_clusters = select_ivf_clusters_with_probe(&query_vec, ivf, probe_override);
        let candidate_count = ivf_candidate_count_for_clusters(ivf, &selected_clusters);
        if candidate_count == 0 {
            Vec::new()
        } else if candidate_count >= total_vectors {
            if caps.webgpu_enabled && webgpu_matrix_allowed && webgpu_probe_ok().await {
                #[cfg(feature = "hydrate")]
                {
                    match webgpu_scores_with_policy(&query_vec, &index.matrix, dim, caps, true)
                        .await
                    {
                        Some((scores, _backend)) => top_k_from_scores_array(&scores, limit),
                        None => top_k_cosine_native(&query_vec, &index.matrix, dim, limit),
                    }
                }
                #[cfg(not(feature = "hydrate"))]
                {
                    top_k_cosine_native(&query_vec, &index.matrix, dim, limit)
                }
            } else {
                top_k_cosine_native(&query_vec, &index.matrix, dim, limit)
            }
        } else if caps.webgpu_enabled && webgpu_matrix_allowed && candidate_count > 256 {
            #[cfg(feature = "hydrate")]
            {
                if webgpu_probe_ok().await {
                    let candidates = collect_ivf_candidates_for_clusters(ivf, &selected_clusters);
                    match webgpu_scores_subset_with_policy(
                        &query_vec,
                        &index.matrix,
                        dim,
                        &candidates,
                        caps,
                    )
                    .await
                    {
                        Some((scores, _backend)) => {
                            top_k_from_subset_array(&scores, &candidates, limit)
                        }
                        None => top_k_cosine_ivf_clusters_cpu(
                            &query_vec,
                            &index.matrix,
                            dim,
                            ivf,
                            &selected_clusters,
                            limit,
                            candidate_count,
                        ),
                    }
                } else {
                    top_k_cosine_ivf_clusters_cpu(
                        &query_vec,
                        &index.matrix,
                        dim,
                        ivf,
                        &selected_clusters,
                        limit,
                        candidate_count,
                    )
                }
            }
            #[cfg(not(feature = "hydrate"))]
            {
                top_k_cosine_ivf_clusters_cpu(
                    &query_vec,
                    &index.matrix,
                    dim,
                    ivf,
                    &selected_clusters,
                    limit,
                    candidate_count,
                )
            }
        } else {
            top_k_cosine_ivf_clusters_cpu(
                &query_vec,
                &index.matrix,
                dim,
                ivf,
                &selected_clusters,
                limit,
                candidate_count,
            )
        }
    } else if caps.webgpu_enabled && webgpu_matrix_allowed && webgpu_probe_ok().await {
        #[cfg(feature = "hydrate")]
        {
            match webgpu_scores_with_policy(&query_vec, &index.matrix, dim, caps, true).await {
                Some((scores, _backend)) => top_k_from_scores_array(&scores, limit),
                None => top_k_cosine_native(&query_vec, &index.matrix, dim, limit),
            }
        }
        #[cfg(not(feature = "hydrate"))]
        {
            top_k_cosine_native(&query_vec, &index.matrix, dim, limit)
        }
    } else {
        top_k_cosine_native(&query_vec, &index.matrix, dim, limit)
    };

    scored_to_search_results(index, scored)
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
    let tuning = load_ai_tuning();
    let probe_override = tuning.probe_override;
    let query_vec = hashed_embedding("benchmark", index.dim);
    let candidates = collect_ivf_candidates_with_probe(&query_vec, ivf, probe_override);
    if candidates.is_empty() {
        return None;
    }

    let cpu_start = crate::browser::runtime::performance_now_ms()?;
    let _ = top_k_cosine_candidates_cpu(&query_vec, &index.matrix, index.dim, &candidates, limit);
    let cpu_ms = crate::browser::runtime::performance_now_ms().unwrap_or(cpu_start) - cpu_start;

    let caps = detect_ai_capabilities();
    let mut gpu_ms = None;
    let mut backend = "cpu-subset".to_string();

    if caps.webgpu_enabled {
        let gpu_start = crate::browser::runtime::performance_now_ms().unwrap_or(cpu_start);
        if let Some((scores, path)) = webgpu_scores_subset_with_policy(
            &query_vec,
            &index.matrix,
            index.dim,
            &candidates,
            caps,
        )
        .await
        {
            let _ = top_k_from_subset_array(&scores, &candidates, limit);
            gpu_ms = crate::browser::runtime::performance_now_ms().map(|now| now - gpu_start);
            backend = match path {
                WebgpuPolicyBackend::Worker => "webgpu-worker-subset".to_string(),
                WebgpuPolicyBackend::Direct => "webgpu-subset".to_string(),
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
    let sample_len = sample_total.saturating_mul(dim);
    let sample_matrix = index.matrix.get(..sample_len)?.to_vec();
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
    let cpu_start = crate::browser::runtime::performance_now_ms()?;
    let _ = top_k_cosine_native(&sample.query_vec, &sample.matrix, sample.dim, 5);
    Some(crate::browser::runtime::performance_now_ms().unwrap_or(cpu_start) - cpu_start)
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
        if let Some(gpu_start) = crate::browser::runtime::performance_now_ms() {
            if let Some((scores, path)) = webgpu_scores_with_policy(
                &sample.query_vec,
                &sample.matrix,
                sample.dim,
                caps,
                false,
            )
            .await
            {
                let _ = top_k_from_scores_array(&scores, 5);
                gpu_ms = crate::browser::runtime::performance_now_ms().map(|now| now - gpu_start);
                backend = match path {
                    WebgpuPolicyBackend::Worker => "webgpu-worker".to_string(),
                    WebgpuPolicyBackend::Direct => "webgpu".to_string(),
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
    if !dmb_wasm::ensure_webgpu_helpers_loaded().await {
        return None;
    }
    let start = crate::browser::runtime::performance_now_ms()?;
    let array = match variant {
        WebgpuScoreFn::Direct => dmb_wasm::webgpu_scores_direct_loaded(query, matrix, dim).await?,
        WebgpuScoreFn::Worker => {
            dmb_wasm::webgpu_scores_worker_loaded_with_init(query, matrix, dim, true).await?
        }
    };
    let _ = array.length();
    Some(crate::browser::runtime::performance_now_ms().unwrap_or(start) - start)
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
    let matrix_slice = index.matrix.get(..capped_len)?;
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
    if let (Some(direct), Some(worker)) = (result.direct_ms, result.worker_ms) {
        let delta_ratio = (direct - worker).abs() / direct.max(1.0);
        if delta_ratio >= 0.05 {
            let floats = result.floats.max(1);
            let suggested = if worker < direct {
                floats.saturating_mul(3) / 4
            } else {
                floats.saturating_mul(5) / 4
            };
            let recommended = clamp_worker_threshold(suggested);
            store_worker_threshold(recommended);
            result.recommended_threshold = Some(recommended);
        }
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
                id: i32::try_from(idx).unwrap_or(i32::MAX),
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
            dim: u32::try_from(dim).unwrap_or(u32::MAX),
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
    let tuning = load_ai_tuning();
    let mut target_latency_ms = tuning.target_latency_ms;
    if let Some(telemetry_target) = suggest_target_latency_from_history() {
        target_latency_ms = telemetry_target;
    }

    let mut probes: Vec<u32> = vec![2, 4, 8, 12, 16, ivf.probe_count];
    probes.sort();
    probes.dedup();
    probes.retain(|probe| *probe <= ivf.cluster_count && *probe >= 1);

    let sample_queries = ["crash", "grace", "two step", "ants"];
    let query_vectors: Vec<Vec<f32>> = sample_queries
        .iter()
        .map(|query| hashed_embedding(query, index.dim))
        .collect();
    let mut metrics = Vec::new();
    let mut best_probe = ivf.probe_count;
    let mut best_latency = f64::MAX;
    let policy = cap_policy_from_navigator();
    let matrix_bytes = (index.matrix.len() as u64).saturating_mul(4);
    let webgpu_matrix_allowed = webgpu_matrix_allowed(matrix_bytes, policy.cap_bytes);

    for probe in probes {
        let mut total_ms = 0.0;
        let mut candidate_count = 0usize;
        for query_vec in &query_vectors {
            let candidates = collect_ivf_candidates_with_probe(query_vec, ivf, Some(probe));
            candidate_count = candidate_count.max(candidates.len());
            let start = crate::browser::runtime::performance_now_ms()?;
            let _ = score_candidates(
                query_vec,
                index,
                &candidates,
                limit,
                caps,
                webgpu_matrix_allowed,
                index.dim,
            )
            .await;
            let end = crate::browser::runtime::performance_now_ms().unwrap_or(start);
            total_ms += end - start;
        }
        let avg_latency = total_ms / query_vectors.len() as f64;
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
    store_ai_tuning(&tuning);

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

#[inline]
fn dot_product(a: &[f32], b: &[f32]) -> f32 {
    let len = a.len().min(b.len());
    let mut index = 0usize;
    let mut sum = 0.0f32;

    while index + 4 <= len {
        sum += a[index] * b[index];
        sum += a[index + 1] * b[index + 1];
        sum += a[index + 2] * b[index + 2];
        sum += a[index + 3] * b[index + 3];
        index += 4;
    }

    while index < len {
        sum += a[index] * b[index];
        index += 1;
    }

    sum
}

#[inline]
fn matrix_row_unchecked(matrix: &[f32], dim: usize, row_index: usize) -> &[f32] {
    let start = row_index * dim;
    &matrix[start..start + dim]
}

#[derive(Debug, Clone, Copy)]
struct HeapScoreEntry {
    index: usize,
    score: f32,
}

impl PartialEq for HeapScoreEntry {
    fn eq(&self, other: &Self) -> bool {
        self.index == other.index && self.score.to_bits() == other.score.to_bits()
    }
}

impl Eq for HeapScoreEntry {}

impl PartialOrd for HeapScoreEntry {
    fn partial_cmp(&self, other: &Self) -> Option<std::cmp::Ordering> {
        Some(self.cmp(other))
    }
}

impl Ord for HeapScoreEntry {
    fn cmp(&self, other: &Self) -> std::cmp::Ordering {
        self.score
            .total_cmp(&other.score)
            .then_with(|| self.index.cmp(&other.index))
    }
}

#[inline]
fn push_top_k_heap(
    heap: &mut BinaryHeap<Reverse<HeapScoreEntry>>,
    keep: usize,
    entry: HeapScoreEntry,
) {
    if heap.len() < keep {
        heap.push(Reverse(entry));
        return;
    }
    if let Some(mut min_entry) = heap.peek_mut() {
        if entry > min_entry.0 {
            *min_entry = Reverse(entry);
        }
    }
}

#[inline]
fn scored_vec_from_heap(mut heap: BinaryHeap<Reverse<HeapScoreEntry>>) -> Vec<ScoredIndex> {
    let mut scored = Vec::with_capacity(heap.len());
    while let Some(Reverse(entry)) = heap.pop() {
        scored.push(ScoredIndex {
            index: entry.index,
            score: entry.score,
        });
    }
    scored.reverse();
    scored
}

#[cfg(all(feature = "hydrate", test))]
fn top_k_from_scored_iter<I>(entries: I, k: usize) -> Vec<ScoredIndex>
where
    I: IntoIterator<Item = HeapScoreEntry>,
{
    let keep = k.max(1);
    let mut iter = entries.into_iter();
    if keep == 1 {
        let mut best = match iter.next() {
            Some(entry) => entry,
            None => return Vec::new(),
        };
        for entry in iter {
            if entry > best {
                best = entry;
            }
        }
        return vec![ScoredIndex {
            index: best.index,
            score: best.score,
        }];
    }
    let mut heap: BinaryHeap<Reverse<HeapScoreEntry>> = BinaryHeap::with_capacity(keep + 1);
    for entry in iter {
        push_top_k_heap(&mut heap, keep, entry);
    }
    scored_vec_from_heap(heap)
}

fn top_k_cosine_native(query: &[f32], matrix: &[f32], dim: usize, k: usize) -> Vec<ScoredIndex> {
    if dim == 0 || query.len() != dim {
        return Vec::new();
    }
    let row_count = matrix.len() / dim;
    if row_count == 0 {
        return Vec::new();
    }
    let keep = k.max(1).min(row_count);
    if keep == 1 {
        let mut best: Option<HeapScoreEntry> = None;
        for idx in 0..row_count {
            let row = matrix_row_unchecked(matrix, dim, idx);
            let entry = HeapScoreEntry {
                index: idx,
                score: dot_product(query, row),
            };
            if best.is_none_or(|current| entry > current) {
                best = Some(entry);
            }
        }
        return best
            .map(|entry| {
                vec![ScoredIndex {
                    index: entry.index,
                    score: entry.score,
                }]
            })
            .unwrap_or_default();
    }

    let mut heap: BinaryHeap<Reverse<HeapScoreEntry>> = BinaryHeap::with_capacity(keep + 1);
    for idx in 0..row_count {
        let row = matrix_row_unchecked(matrix, dim, idx);
        let entry = HeapScoreEntry {
            index: idx,
            score: dot_product(query, row),
        };
        push_top_k_heap(&mut heap, keep, entry);
    }
    scored_vec_from_heap(heap)
}

#[cfg(feature = "hydrate")]
fn scored_indices_from_js_top_k(arrays: js_sys::Array) -> Vec<ScoredIndex> {
    let indices = js_sys::Uint32Array::new(&arrays.get(0));
    let top_scores = js_sys::Float32Array::new(&arrays.get(1));
    let len = indices.length().min(top_scores.length()) as usize;
    let mut scored = Vec::with_capacity(len);
    for idx in 0..len {
        let offset = idx as u32;
        scored.push(ScoredIndex {
            index: indices.get_index(offset) as usize,
            score: top_scores.get_index(offset),
        });
    }
    scored
}

#[cfg(feature = "hydrate")]
fn top_k_from_scores_array(scores: &js_sys::Float32Array, k: usize) -> Vec<ScoredIndex> {
    let keep = u32::try_from(k.max(1)).unwrap_or(u32::MAX);
    scored_indices_from_js_top_k(dmb_top_k_scores(scores.as_ref(), keep))
}

fn select_ivf_clusters_with_probe(
    query: &[f32],
    ivf: &AnnIvfIndex,
    probe_override: Option<u32>,
) -> Vec<usize> {
    if ivf.centroids.is_empty() {
        return Vec::new();
    }
    let probe = probe_override.unwrap_or(ivf.probe_count);
    let probe = probe
        .max(1)
        .min(ivf.cluster_count)
        .min(u32::try_from(ivf.lists.len()).unwrap_or(u32::MAX));
    let probe = usize::try_from(probe).unwrap_or(usize::MAX);
    if probe == 0 {
        return Vec::new();
    }
    if probe >= ivf.centroids.len() {
        return (0..ivf.centroids.len()).collect();
    }

    if probe == 1 {
        let mut best = 0usize;
        let mut best_score = f32::MIN;
        for (idx, centroid) in ivf.centroids.iter().enumerate() {
            let score = dot_product(centroid, query);
            if score > best_score {
                best_score = score;
                best = idx;
            }
        }
        return vec![best];
    }

    let mut top_centroids: BinaryHeap<Reverse<HeapScoreEntry>> =
        BinaryHeap::with_capacity(probe.saturating_add(1));
    for (idx, centroid) in ivf.centroids.iter().enumerate() {
        push_top_k_heap(
            &mut top_centroids,
            probe,
            HeapScoreEntry {
                index: idx,
                score: dot_product(centroid, query),
            },
        );
    }
    top_centroids
        .into_iter()
        .map(|Reverse(entry)| entry.index)
        .collect()
}

#[inline]
fn ivf_candidate_count_for_clusters(ivf: &AnnIvfIndex, selected_clusters: &[usize]) -> usize {
    selected_clusters
        .iter()
        .map(|cluster_idx| &ivf.lists[*cluster_idx])
        .map(std::vec::Vec::len)
        .sum()
}

#[cfg(feature = "hydrate")]
fn collect_ivf_candidates_for_clusters(ivf: &AnnIvfIndex, selected_clusters: &[usize]) -> Vec<u32> {
    let estimated_candidates = ivf_candidate_count_for_clusters(ivf, selected_clusters);
    let mut candidates = Vec::with_capacity(estimated_candidates);
    // IVF lists are disjoint by construction in the pipeline assignment step.
    for &cluster_idx in selected_clusters {
        let list = &ivf.lists[cluster_idx];
        candidates.extend_from_slice(list);
    }
    candidates
}

#[cfg(feature = "hydrate")]
fn collect_ivf_candidates_with_probe(
    query: &[f32],
    ivf: &AnnIvfIndex,
    probe_override: Option<u32>,
) -> Vec<u32> {
    let selected_clusters = select_ivf_clusters_with_probe(query, ivf, probe_override);
    collect_ivf_candidates_for_clusters(ivf, &selected_clusters)
}

fn top_k_cosine_ivf_clusters_cpu(
    query: &[f32],
    matrix: &[f32],
    dim: usize,
    ivf: &AnnIvfIndex,
    selected_clusters: &[usize],
    k: usize,
    candidate_upper_bound: usize,
) -> Vec<ScoredIndex> {
    if dim == 0 || query.len() != dim {
        return Vec::new();
    }
    if candidate_upper_bound == 0 {
        return Vec::new();
    }
    let row_count = matrix.len() / dim;
    let keep = k.max(1).min(candidate_upper_bound.max(1));
    if keep == 1 {
        let mut best: Option<HeapScoreEntry> = None;
        for &cluster_idx in selected_clusters {
            let list = &ivf.lists[cluster_idx];
            for &idx in list {
                let idx = idx as usize;
                if idx >= row_count {
                    continue;
                }
                let row = matrix_row_unchecked(matrix, dim, idx);
                let entry = HeapScoreEntry {
                    index: idx,
                    score: dot_product(query, row),
                };
                if best.is_none_or(|current| entry > current) {
                    best = Some(entry);
                }
            }
        }
        return best
            .map(|entry| {
                vec![ScoredIndex {
                    index: entry.index,
                    score: entry.score,
                }]
            })
            .unwrap_or_default();
    }

    let mut heap: BinaryHeap<Reverse<HeapScoreEntry>> = BinaryHeap::with_capacity(keep + 1);
    for &cluster_idx in selected_clusters {
        let list = &ivf.lists[cluster_idx];
        for &idx in list {
            let idx = idx as usize;
            if idx >= row_count {
                continue;
            }
            let row = matrix_row_unchecked(matrix, dim, idx);
            let entry = HeapScoreEntry {
                index: idx,
                score: dot_product(query, row),
            };
            push_top_k_heap(&mut heap, keep, entry);
        }
    }
    scored_vec_from_heap(heap)
}

#[cfg(feature = "hydrate")]
fn top_k_cosine_candidates_cpu(
    query: &[f32],
    matrix: &[f32],
    dim: usize,
    candidates: &[u32],
    k: usize,
) -> Vec<ScoredIndex> {
    if dim == 0 || query.len() != dim {
        return Vec::new();
    }
    if candidates.is_empty() {
        return Vec::new();
    }
    let row_count = matrix.len() / dim;
    let keep = k.max(1).min(candidates.len());
    if keep == 1 {
        let mut best: Option<HeapScoreEntry> = None;
        for &idx in candidates {
            let idx = idx as usize;
            if idx >= row_count {
                continue;
            }
            let row = matrix_row_unchecked(matrix, dim, idx);
            let entry = HeapScoreEntry {
                index: idx,
                score: dot_product(query, row),
            };
            if best.is_none_or(|current| entry > current) {
                best = Some(entry);
            }
        }
        return best
            .map(|entry| {
                vec![ScoredIndex {
                    index: entry.index,
                    score: entry.score,
                }]
            })
            .unwrap_or_default();
    }

    let mut heap: BinaryHeap<Reverse<HeapScoreEntry>> = BinaryHeap::with_capacity(keep + 1);
    for &idx in candidates {
        let idx = idx as usize;
        if idx >= row_count {
            continue;
        }
        let row = matrix_row_unchecked(matrix, dim, idx);
        let entry = HeapScoreEntry {
            index: idx,
            score: dot_product(query, row),
        };
        push_top_k_heap(&mut heap, keep, entry);
    }
    scored_vec_from_heap(heap)
}

#[cfg(feature = "hydrate")]
fn top_k_from_subset_array(
    scores: &js_sys::Float32Array,
    candidates: &[u32],
    k: usize,
) -> Vec<ScoredIndex> {
    if candidates.is_empty() {
        return Vec::new();
    }
    let keep = u32::try_from(k.max(1)).unwrap_or(u32::MAX);
    let candidates = js_sys::Uint32Array::from(candidates);
    scored_indices_from_js_top_k(dmb_top_k_subset_scores(
        scores.as_ref(),
        candidates.as_ref(),
        keep,
    ))
}

#[cfg(feature = "hydrate")]
#[cfg(test)]
mod top_k_tests {
    use super::{top_k_from_scored_iter, HeapScoreEntry};

    #[test]
    fn top_k_heap_keeps_highest_scores_sorted() {
        let entries = vec![
            HeapScoreEntry {
                index: 0,
                score: 0.2,
            },
            HeapScoreEntry {
                index: 1,
                score: 0.9,
            },
            HeapScoreEntry {
                index: 2,
                score: -0.1,
            },
            HeapScoreEntry {
                index: 3,
                score: 0.5,
            },
        ];
        let top = top_k_from_scored_iter(entries, 2);
        assert_eq!(top.len(), 2);
        assert_eq!(top[0].index, 1);
        assert_eq!(top[1].index, 3);
        assert!(top[0].score >= top[1].score);
    }

    #[test]
    fn top_k_heap_with_zero_limit_returns_single_best() {
        let entries = vec![
            HeapScoreEntry {
                index: 0,
                score: 0.1,
            },
            HeapScoreEntry {
                index: 1,
                score: 0.8,
            },
        ];
        let top = top_k_from_scored_iter(entries, 0);
        assert_eq!(top.len(), 1);
        assert_eq!(top[0].index, 1);
    }
}

#[cfg(feature = "hydrate")]
async fn score_candidates(
    query_vec: &[f32],
    index: &EmbeddingIndex,
    candidates: &[u32],
    limit: usize,
    caps: AiCapabilities,
    webgpu_matrix_allowed: bool,
    dim: usize,
) -> Vec<ScoredIndex> {
    if candidates.is_empty() {
        return Vec::new();
    }
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
            match webgpu_scores_subset_with_policy(query_vec, &index.matrix, dim, candidates, caps)
                .await
            {
                Some((scores, _backend)) => top_k_from_subset_array(&scores, candidates, limit),
                None => {
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

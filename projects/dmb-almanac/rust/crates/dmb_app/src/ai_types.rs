use dmb_core::{AnnIvfIndex, EmbeddingRecord};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

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
pub(crate) struct WorkerBenchmarkSample {
    pub(crate) vector_count: usize,
    pub(crate) dim: usize,
    pub(crate) floats: usize,
    pub(crate) matrix_len: usize,
    pub(crate) capped_len: usize,
    pub(crate) query_array: js_sys::Float32Array,
    pub(crate) matrix_array: js_sys::Float32Array,
}

#[cfg(feature = "hydrate")]
impl WorkerBenchmarkSample {
    pub(crate) fn sampled(&self) -> bool {
        self.capped_len < self.matrix_len
    }
}

#[cfg(feature = "hydrate")]
pub(crate) struct ProbeTuningEvaluation {
    pub(crate) selected_probe: u32,
    pub(crate) last_latency_ms: f64,
    pub(crate) metrics: Vec<ProbeCandidateMetric>,
}

#[cfg(feature = "hydrate")]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub(crate) struct EmbeddingSampleEntry {
    pub(crate) id: i32,
    pub(crate) kind: String,
    #[serde(default)]
    pub(crate) text: Option<String>,
    #[serde(default)]
    pub(crate) slug: Option<String>,
    #[serde(default)]
    pub(crate) label: Option<String>,
    #[serde(default)]
    pub(crate) vector: Option<Vec<f32>>,
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

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiWarningEvent {
    pub timestamp_ms: f64,
    pub event: String,
    #[serde(default)]
    pub details: Option<String>,
}

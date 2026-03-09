#[cfg(feature = "hydrate")]
use super::*;

#[path = "ai_bench_probe.rs"]
mod probe;
#[path = "ai_bench_worker.rs"]
mod worker;

#[cfg(all(feature = "hydrate", test))]
pub(crate) fn probe_candidate_satisfies_target(
    metric: &ProbeCandidateMetric,
    target_latency_ms: f64,
    limit: usize,
) -> bool {
    probe::probe_candidate_satisfies_target(metric, target_latency_ms, limit)
}

#[cfg(all(feature = "hydrate", test))]
pub(crate) fn probe_candidates_for_tuning(ivf: &AnnIvfIndex) -> Vec<u32> {
    probe::probe_candidates_for_tuning(ivf)
}

#[cfg(feature = "hydrate")]
pub async fn tune_ivf_probe(index: &EmbeddingIndex, limit: usize) -> Option<ProbeTuningResult> {
    probe::tune_ivf_probe(index, limit).await
}

#[cfg(feature = "hydrate")]
pub async fn benchmark_worker_threshold() -> Option<AiWorkerBenchmark> {
    worker::benchmark_worker_threshold().await
}

#[cfg(all(feature = "hydrate", test))]
pub(crate) fn with_worker_threshold_recommendation(result: AiWorkerBenchmark) -> AiWorkerBenchmark {
    worker::with_worker_threshold_recommendation(result)
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
        if let Some(((scores, path), elapsed_ms)) = measure_optional_future_from(
            gpu_start,
            webgpu_scores_subset_with_policy(
                &query_vec,
                &index.matrix,
                index.dim,
                &candidates,
                caps,
            ),
        )
        .await
        {
            let _ = top_k_from_subset_array(&scores, &candidates, limit);
            gpu_ms = Some(elapsed_ms);
            backend = webgpu_backend_label(path, true).to_string();
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
fn elapsed_ms_or(start_ms: f64) -> f64 {
    crate::browser::runtime::performance_now_ms().unwrap_or(start_ms) - start_ms
}

#[cfg(feature = "hydrate")]
async fn measure_future_from<T>(start_ms: f64, future: impl Future<Output = T>) -> (T, f64) {
    let value = future.await;
    (value, elapsed_ms_or(start_ms))
}

#[cfg(feature = "hydrate")]
async fn measure_optional_future_from<T>(
    start_ms: f64,
    future: impl Future<Output = Option<T>>,
) -> Option<(T, f64)> {
    let (value, elapsed_ms) = measure_future_from(start_ms, future).await;
    Some((value?, elapsed_ms))
}

#[cfg(feature = "hydrate")]
pub fn benchmark_cpu(sample: &BenchmarkSample) -> Option<f64> {
    let cpu_start = crate::browser::runtime::performance_now_ms()?;
    let _ = top_k_cosine_native(&sample.query_vec, &sample.matrix, sample.dim, 5);
    Some(elapsed_ms_or(cpu_start))
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
        if let Some(gpu_start) = crate::browser::runtime::performance_now_ms()
            && let Some(((scores, path), elapsed_ms)) = measure_optional_future_from(
                gpu_start,
                webgpu_scores_with_policy(
                    &sample.query_vec,
                    &sample.matrix,
                    sample.dim,
                    caps,
                    false,
                ),
            )
            .await
        {
            let _ = top_k_from_scores_array(&scores, 5);
            gpu_ms = Some(elapsed_ms);
            backend = webgpu_backend_label(path, false).to_string();
        }
    }
    (gpu_ms, backend)
}

#[cfg(feature = "hydrate")]
async fn measure_webgpu_scores(
    backend: WebgpuPolicyBackend,
    query: &js_sys::Float32Array,
    matrix: &js_sys::Float32Array,
    dim: usize,
) -> Option<f64> {
    if !dmb_wasm::ensure_webgpu_helpers_loaded().await {
        return None;
    }
    let start = crate::browser::runtime::performance_now_ms()?;
    let (array, elapsed_ms) = measure_optional_future_from(
        start,
        execute_webgpu_backend(backend, query, matrix, dim, true),
    )
    .await?;
    let _ = top_k_from_scores_array(&array, 5);
    Some(elapsed_ms)
}

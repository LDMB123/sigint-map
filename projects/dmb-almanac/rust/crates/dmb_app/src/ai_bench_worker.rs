#[cfg(feature = "hydrate")]
use super::*;

#[cfg(feature = "hydrate")]
fn benchmark_worker_winner(direct_ms: Option<f64>, worker_ms: Option<f64>) -> Option<&'static str> {
    match (direct_ms, worker_ms) {
        (Some(direct), Some(worker)) => Some(if worker < direct { "worker" } else { "direct" }),
        (Some(_), None) => Some("direct"),
        (None, Some(_)) => Some("worker"),
        (None, None) => None,
    }
}

#[cfg(feature = "hydrate")]
pub(crate) fn recommended_worker_threshold(
    floats: usize,
    direct_ms: f64,
    worker_ms: f64,
) -> Option<usize> {
    let delta_ratio = (direct_ms - worker_ms).abs() / direct_ms.max(1.0);
    if delta_ratio < 0.1 {
        return None;
    }
    let suggested = if worker_ms < direct_ms {
        floats.saturating_mul(3) / 4
    } else {
        floats.saturating_mul(5) / 4
    };
    Some(clamp_worker_threshold(suggested))
}

#[cfg(feature = "hydrate")]
fn prepare_worker_benchmark_sample(index: &EmbeddingIndex) -> Option<WorkerBenchmarkSample> {
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
    let vector_count = capped_len / dim;
    let query_vec = hashed_embedding("benchmark", dim);
    let query_array = js_sys::Float32Array::from(query_vec.as_slice());
    let matrix_slice = index.matrix.get(..capped_len)?;
    let matrix_array = js_sys::Float32Array::from(matrix_slice);

    Some(WorkerBenchmarkSample {
        vector_count,
        dim,
        floats: matrix_len,
        matrix_len,
        capped_len,
        query_array,
        matrix_array,
    })
}

#[cfg(feature = "hydrate")]
pub(crate) fn with_worker_threshold_recommendation(
    mut result: AiWorkerBenchmark,
) -> AiWorkerBenchmark {
    result.winner = benchmark_worker_winner(result.direct_ms, result.worker_ms).map(str::to_string);
    if let (Some(direct), Some(worker)) = (result.direct_ms, result.worker_ms) {
        result.recommended_threshold =
            recommended_worker_threshold(result.floats.max(1), direct, worker);
    }
    result
}

#[cfg(feature = "hydrate")]
async fn evaluate_worker_benchmark(sample: &WorkerBenchmarkSample) -> AiWorkerBenchmark {
    let direct_ms = measure_webgpu_scores(
        WebgpuPolicyBackend::Direct,
        &sample.query_array,
        &sample.matrix_array,
        sample.dim,
    )
    .await;
    let worker_ms = measure_webgpu_scores(
        WebgpuPolicyBackend::Worker,
        &sample.query_array,
        &sample.matrix_array,
        sample.dim,
    )
    .await;

    with_worker_threshold_recommendation(AiWorkerBenchmark {
        vector_count: sample.vector_count,
        dim: sample.dim,
        floats: sample.floats,
        direct_ms,
        worker_ms,
        winner: None,
        recommended_threshold: None,
    })
}

#[cfg(feature = "hydrate")]
fn persist_worker_benchmark(sample: &WorkerBenchmarkSample, result: &AiWorkerBenchmark) {
    if let Some(recommended) = result.recommended_threshold {
        store_worker_threshold(recommended);
    }
    if sample.sampled() {
        record_ai_warning(
            "worker_bench_sampled",
            Some(format!(
                "matrix_floats {} capped to {}",
                sample.matrix_len, sample.capped_len
            )),
        );
    }
    store_ai_telemetry_snapshot(ann_cap_diagnostics().as_ref());
}

#[cfg(feature = "hydrate")]
pub async fn benchmark_worker_threshold() -> Option<AiWorkerBenchmark> {
    let index = load_embedding_index().await?;
    let sample = prepare_worker_benchmark_sample(&index)?;
    let result = evaluate_worker_benchmark(&sample).await;
    persist_worker_benchmark(&sample, &result);
    Some(result)
}

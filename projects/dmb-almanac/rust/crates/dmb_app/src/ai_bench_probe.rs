use super::*;

#[cfg(feature = "hydrate")]
fn resolved_target_latency_ms(tuning: &AiTuning) -> f64 {
    suggest_target_latency_from_history().unwrap_or(tuning.target_latency_ms)
}

#[cfg(feature = "hydrate")]
pub(crate) fn probe_candidates_for_tuning(ivf: &AnnIvfIndex) -> Vec<u32> {
    let mut probes: Vec<u32> = vec![2, 4, 8, 12, 16, ivf.probe_count];
    probes.sort();
    probes.dedup();
    probes.retain(|probe| *probe <= ivf.cluster_count && *probe >= 1);
    probes
}

#[cfg(feature = "hydrate")]
pub(crate) fn probe_candidate_satisfies_target(
    metric: &ProbeCandidateMetric,
    target_latency_ms: f64,
    limit: usize,
) -> bool {
    metric.avg_latency_ms <= target_latency_ms
        && metric.candidate_count >= (limit.saturating_mul(4)).max(50)
}

#[cfg(feature = "hydrate")]
async fn measure_probe_candidate_metric(
    index: &EmbeddingIndex,
    ivf: &AnnIvfIndex,
    query_vectors: &[Vec<f32>],
    probe: u32,
    limit: usize,
    caps: AiCapabilities,
    webgpu_matrix_allowed: bool,
) -> Option<ProbeCandidateMetric> {
    let mut total_ms = 0.0;
    let mut candidate_count = 0usize;

    for query_vec in query_vectors {
        let candidates = collect_ivf_candidates_with_probe(query_vec, ivf, Some(probe));
        candidate_count = candidate_count.max(candidates.len());
        let start = crate::browser::runtime::performance_now_ms()?;
        let (_, elapsed_ms) = measure_future_from(
            start,
            score_candidates(
                query_vec,
                index,
                &candidates,
                limit,
                caps,
                webgpu_matrix_allowed,
                index.dim,
            ),
        )
        .await;
        total_ms += elapsed_ms;
    }

    Some(ProbeCandidateMetric {
        probe_count: probe,
        candidate_count,
        avg_latency_ms: total_ms / query_vectors.len().max(1) as f64,
    })
}

#[cfg(feature = "hydrate")]
async fn evaluate_probe_tuning(
    index: &EmbeddingIndex,
    ivf: &AnnIvfIndex,
    limit: usize,
    caps: AiCapabilities,
    target_latency_ms: f64,
    webgpu_matrix_allowed: bool,
) -> Option<ProbeTuningEvaluation> {
    let sample_queries = ["crash", "grace", "two step", "ants"];
    let query_vectors: Vec<Vec<f32>> = sample_queries
        .iter()
        .map(|query| hashed_embedding(query, index.dim))
        .collect();
    let probes = probe_candidates_for_tuning(ivf);
    if probes.is_empty() {
        return None;
    }

    let mut metrics = Vec::with_capacity(probes.len());
    let mut selected_probe = ivf.probe_count;
    let mut best_latency = f64::MAX;

    for probe in probes {
        let metric = measure_probe_candidate_metric(
            index,
            ivf,
            &query_vectors,
            probe,
            limit,
            caps,
            webgpu_matrix_allowed,
        )
        .await?;

        if metric.avg_latency_ms < best_latency {
            best_latency = metric.avg_latency_ms;
            selected_probe = probe;
        }

        let reached_target = probe_candidate_satisfies_target(&metric, target_latency_ms, limit);
        metrics.push(metric);
        if reached_target {
            selected_probe = probe;
            best_latency = metrics
                .last()
                .map_or(best_latency, |entry| entry.avg_latency_ms);
            break;
        }
    }

    Some(ProbeTuningEvaluation {
        selected_probe,
        last_latency_ms: best_latency,
        metrics,
    })
}

#[cfg(feature = "hydrate")]
fn store_probe_tuning_result(selected_probe: u32, target_latency_ms: f64, last_latency_ms: f64) {
    let tuning = AiTuning {
        probe_override: Some(selected_probe),
        target_latency_ms,
        last_latency_ms: Some(last_latency_ms),
    };
    store_ai_tuning(&tuning);
}

#[cfg(feature = "hydrate")]
pub async fn tune_ivf_probe(index: &EmbeddingIndex, limit: usize) -> Option<ProbeTuningResult> {
    let ivf = index.ivf.as_ref()?;
    let caps = detect_ai_capabilities();
    let tuning = load_ai_tuning();
    let target_latency_ms = resolved_target_latency_ms(&tuning);
    let policy = cap_policy_from_navigator();
    let matrix_bytes = (index.matrix.len() as u64).saturating_mul(4);
    let webgpu_matrix_allowed = webgpu_matrix_allowed(matrix_bytes, policy.cap_bytes);
    let evaluation = evaluate_probe_tuning(
        index,
        ivf,
        limit,
        caps,
        target_latency_ms,
        webgpu_matrix_allowed,
    )
    .await?;
    store_probe_tuning_result(
        evaluation.selected_probe,
        target_latency_ms,
        evaluation.last_latency_ms,
    );

    Some(ProbeTuningResult {
        selected_probe: evaluation.selected_probe,
        target_latency_ms,
        metrics: evaluation.metrics,
    })
}

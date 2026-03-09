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
        cap_bytes: 8 * 10 * 4,
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

#[cfg(feature = "hydrate")]
#[test]
fn apple_silicon_defaults_lower_worker_threshold() {
    assert_eq!(
        ai_policy_state::default_worker_threshold_for_profile(Some(16.0), 10, true),
        12_000
    );
    assert_eq!(
        ai_policy_state::default_worker_threshold_for_profile(Some(8.0), 8, true),
        20_000
    );
    assert_eq!(
        ai_policy_state::default_worker_threshold_for_profile(Some(8.0), 8, false),
        25_000
    );
}

#[cfg(feature = "hydrate")]
#[test]
fn apple_silicon_defaults_raise_worker_matrix_cap() {
    assert_eq!(
        ai_policy_state::default_worker_max_floats_for_profile(Some(16.0), 10, true),
        5_000_000
    );
    assert_eq!(
        ai_policy_state::default_worker_max_floats_for_profile(Some(8.0), 8, true),
        3_500_000
    );
    assert_eq!(
        ai_policy_state::default_worker_max_floats_for_profile(Some(8.0), 8, false),
        2_500_000
    );
}

#[cfg(feature = "hydrate")]
#[test]
fn apple_silicon_cache_policy_allows_larger_hot_buffers() {
    assert_eq!(
        default_matrix_cache_max_bytes_for_profile(Some(16.0), 10, true),
        32 * 1024 * 1024
    );
    assert_eq!(
        default_result_cache_max_bytes_for_profile(Some(16.0), 10, true),
        8 * 1024 * 1024
    );
    assert_eq!(
        default_cache_idle_ms_for_profile(Some(16.0), 10, true),
        30_000
    );
}

#[cfg(feature = "hydrate")]
#[test]
fn low_memory_profiles_shrink_webgpu_cache_policy() {
    assert_eq!(
        default_matrix_cache_max_bytes_for_profile(Some(4.0), 4, true),
        8 * 1024 * 1024
    );
    assert_eq!(
        default_result_cache_max_bytes_for_profile(Some(4.0), 4, false),
        512 * 1024
    );
    assert_eq!(
        default_cache_idle_ms_for_profile(Some(4.0), 4, false),
        5_000
    );
}

#[cfg(feature = "hydrate")]
#[test]
fn worker_matrix_priming_prefers_apple_silicon_mid_and_high_tiers() {
    assert!(default_prime_matrix_on_worker_init_for_profile(
        Some(16.0),
        10,
        true
    ));
    assert!(default_prime_matrix_on_worker_init_for_profile(
        Some(8.0),
        8,
        true
    ));
    assert!(!default_prime_matrix_on_worker_init_for_profile(
        Some(4.0),
        4,
        true
    ));
    assert!(!default_prime_matrix_on_worker_init_for_profile(
        Some(16.0),
        12,
        false
    ));
}

#[cfg(feature = "hydrate")]
#[test]
fn worker_threshold_recommendation_requires_meaningful_delta() {
    let result = with_worker_threshold_recommendation(AiWorkerBenchmark {
        floats: 20_000,
        direct_ms: Some(10.0),
        worker_ms: Some(9.8),
        ..AiWorkerBenchmark::default()
    });

    assert_eq!(result.winner.as_deref(), Some("worker"));
    assert_eq!(result.recommended_threshold, None);
}

#[cfg(feature = "hydrate")]
#[test]
fn worker_threshold_recommendation_tracks_faster_worker() {
    let result = with_worker_threshold_recommendation(AiWorkerBenchmark {
        floats: 20_000,
        direct_ms: Some(20.0),
        worker_ms: Some(10.0),
        ..AiWorkerBenchmark::default()
    });

    assert_eq!(result.winner.as_deref(), Some("worker"));
    assert_eq!(result.recommended_threshold, Some(15_000));
}

#[cfg(feature = "hydrate")]
#[test]
fn probe_candidates_for_tuning_are_sorted_unique_and_bounded() {
    let mut ivf = make_ivf(8);
    ivf.cluster_count = 10;
    ivf.probe_count = 8;

    assert_eq!(probe_candidates_for_tuning(&ivf), vec![2, 4, 8]);
}

#[cfg(feature = "hydrate")]
#[test]
fn probe_candidate_satisfies_target_checks_latency_and_budget() {
    let fast_but_small = ProbeCandidateMetric {
        probe_count: 4,
        candidate_count: 20,
        avg_latency_ms: 8.0,
    };
    let slow_enough = ProbeCandidateMetric {
        probe_count: 8,
        candidate_count: 80,
        avg_latency_ms: 18.0,
    };
    let acceptable = ProbeCandidateMetric {
        probe_count: 12,
        candidate_count: 80,
        avg_latency_ms: 8.0,
    };

    assert!(!probe_candidate_satisfies_target(&fast_but_small, 12.0, 10));
    assert!(!probe_candidate_satisfies_target(&slow_enough, 12.0, 10));
    assert!(probe_candidate_satisfies_target(&acceptable, 12.0, 10));
}

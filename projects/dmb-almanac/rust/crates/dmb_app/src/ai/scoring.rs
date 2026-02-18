use super::*;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub(super) struct ScoredIndex {
    pub(super) index: usize,
    pub(super) score: f32,
}

pub(super) fn top_k_cosine_native(
    query: &[f32],
    matrix: &[f32],
    dim: usize,
    k: usize,
) -> Vec<ScoredIndex> {
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
pub(super) fn top_k_from_scores(scores: Vec<f32>, k: usize) -> Vec<ScoredIndex> {
    let mut scored: Vec<ScoredIndex> = scores
        .into_iter()
        .enumerate()
        .map(|(index, score)| ScoredIndex { index, score })
        .collect();
    scored.sort_by(|a, b| b.score.total_cmp(&a.score));
    scored.truncate(k.max(1));
    scored
}

pub(super) fn collect_ivf_candidates_with_probe(
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

pub(super) fn top_k_cosine_candidates_cpu(
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
pub(super) fn top_k_from_subset(
    scores: Vec<f32>,
    candidates: &[usize],
    k: usize,
) -> Vec<ScoredIndex> {
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

pub(super) async fn score_candidates(
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

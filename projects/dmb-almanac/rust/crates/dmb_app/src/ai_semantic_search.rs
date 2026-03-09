use super::*;

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

#[cfg(feature = "hydrate")]
fn semantic_search_probe_override() -> Option<u32> {
    if browser_runtime_supported() {
        load_ai_tuning().probe_override
    } else {
        None
    }
}

#[cfg(not(feature = "hydrate"))]
const fn semantic_search_probe_override() -> Option<u32> {
    None
}

struct SemanticSearchContext<'a> {
    query_vec: &'a [f32],
    index: &'a EmbeddingIndex,
    dim: usize,
    limit: usize,
    caps: AiCapabilities,
    webgpu_matrix_allowed: bool,
}

#[cfg_attr(not(feature = "hydrate"), allow(dead_code))]
struct CandidateScoreRequest<'a> {
    query_vec: &'a [f32],
    matrix: &'a [f32],
    dim: usize,
    candidates: &'a [u32],
    limit: usize,
    caps: AiCapabilities,
    webgpu_matrix_allowed: bool,
}

async fn score_full_matrix_search(context: &SemanticSearchContext<'_>) -> Vec<ScoredIndex> {
    if !(context.caps.webgpu_enabled && context.webgpu_matrix_allowed && webgpu_probe_ok().await) {
        return top_k_cosine_native(
            context.query_vec,
            &context.index.matrix,
            context.dim,
            context.limit,
        );
    }

    #[cfg(feature = "hydrate")]
    {
        match webgpu_scores_with_policy(
            context.query_vec,
            &context.index.matrix,
            context.dim,
            context.caps,
            true,
        )
        .await
        {
            Some((scores, _backend)) => top_k_from_scores_array(&scores, context.limit),
            None => top_k_cosine_native(
                context.query_vec,
                &context.index.matrix,
                context.dim,
                context.limit,
            ),
        }
    }
    #[cfg(not(feature = "hydrate"))]
    {
        top_k_cosine_native(
            context.query_vec,
            &context.index.matrix,
            context.dim,
            context.limit,
        )
    }
}

async fn score_candidate_subset_or_fallback<F>(
    request: CandidateScoreRequest<'_>,
    cpu_fallback: F,
) -> Vec<ScoredIndex>
where
    F: FnOnce() -> Vec<ScoredIndex>,
{
    if request.candidates.is_empty() {
        return Vec::new();
    }
    if !(request.caps.webgpu_enabled
        && request.candidates.len() > 256
        && request.webgpu_matrix_allowed)
    {
        return cpu_fallback();
    }

    #[cfg(feature = "hydrate")]
    {
        if !webgpu_probe_ok().await {
            return cpu_fallback();
        }
        match webgpu_scores_subset_with_policy(
            request.query_vec,
            request.matrix,
            request.dim,
            request.candidates,
            request.caps,
        )
        .await
        {
            Some((scores, _backend)) => {
                top_k_from_subset_array(&scores, request.candidates, request.limit)
            }
            None => cpu_fallback(),
        }
    }
    #[cfg(not(feature = "hydrate"))]
    {
        cpu_fallback()
    }
}

#[cfg(feature = "hydrate")]
pub(crate) async fn score_candidates(
    query_vec: &[f32],
    index: &EmbeddingIndex,
    candidates: &[u32],
    limit: usize,
    caps: AiCapabilities,
    webgpu_matrix_allowed: bool,
    dim: usize,
) -> Vec<ScoredIndex> {
    score_candidate_subset_or_fallback(
        CandidateScoreRequest {
            query_vec,
            matrix: &index.matrix,
            dim,
            candidates,
            limit,
            caps,
            webgpu_matrix_allowed,
        },
        || top_k_cosine_candidates_cpu(query_vec, &index.matrix, dim, candidates, limit),
    )
    .await
}

async fn score_ivf_search(
    context: &SemanticSearchContext<'_>,
    ivf: &AnnIvfIndex,
) -> Vec<ScoredIndex> {
    let selected_clusters =
        select_ivf_clusters_with_probe(context.query_vec, ivf, semantic_search_probe_override());
    let candidate_count = ivf_candidate_count_for_clusters(ivf, &selected_clusters);
    if candidate_count == 0 {
        return Vec::new();
    }
    let total_vectors = context.index.matrix.len() / context.dim;
    if candidate_count >= total_vectors {
        return score_full_matrix_search(context).await;
    }

    let cpu_fallback = || {
        top_k_cosine_ivf_clusters_cpu(
            context.query_vec,
            &context.index.matrix,
            context.dim,
            ivf,
            &selected_clusters,
            context.limit,
            candidate_count,
        )
    };

    let candidates = collect_ivf_candidates_for_clusters(ivf, &selected_clusters);
    score_candidate_subset_or_fallback(
        CandidateScoreRequest {
            query_vec: context.query_vec,
            matrix: &context.index.matrix,
            dim: context.dim,
            candidates: &candidates,
            limit: context.limit,
            caps: context.caps,
            webgpu_matrix_allowed: context.webgpu_matrix_allowed,
        },
        cpu_fallback,
    )
    .await
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
    let context = SemanticSearchContext {
        query_vec: &query_vec,
        index,
        dim,
        limit,
        caps,
        webgpu_matrix_allowed,
    };
    let scored = if let Some(ivf) = &index.ivf {
        score_ivf_search(&context, ivf).await
    } else {
        score_full_matrix_search(&context).await
    };

    scored_to_search_results(index, scored)
}

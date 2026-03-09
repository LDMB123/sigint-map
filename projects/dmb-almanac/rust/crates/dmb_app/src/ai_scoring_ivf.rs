use super::*;
use super::{
    dot_product, matrix_row_unchecked, push_top_k_heap, scored_vec_from_heap, HeapScoreEntry,
    ScoredIndex,
};

pub(crate) fn select_ivf_clusters_with_probe(
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
pub(crate) fn ivf_candidate_count_for_clusters(
    ivf: &AnnIvfIndex,
    selected_clusters: &[usize],
) -> usize {
    selected_clusters
        .iter()
        .map(|cluster_idx| &ivf.lists[*cluster_idx])
        .map(std::vec::Vec::len)
        .sum()
}

pub(crate) fn collect_ivf_candidates_for_clusters(
    ivf: &AnnIvfIndex,
    selected_clusters: &[usize],
) -> Vec<u32> {
    let estimated_candidates = ivf_candidate_count_for_clusters(ivf, selected_clusters);
    let mut candidates = Vec::with_capacity(estimated_candidates);
    for &cluster_idx in selected_clusters {
        let list = &ivf.lists[cluster_idx];
        candidates.extend_from_slice(list);
    }
    candidates
}

#[cfg(feature = "hydrate")]
pub(crate) fn collect_ivf_candidates_with_probe(
    query: &[f32],
    ivf: &AnnIvfIndex,
    probe_override: Option<u32>,
) -> Vec<u32> {
    let selected_clusters = select_ivf_clusters_with_probe(query, ivf, probe_override);
    collect_ivf_candidates_for_clusters(ivf, &selected_clusters)
}

pub(crate) fn top_k_cosine_ivf_clusters_cpu(
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

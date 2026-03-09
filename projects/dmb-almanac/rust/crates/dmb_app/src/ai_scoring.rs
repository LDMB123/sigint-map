use super::*;

#[path = "ai_scoring_ivf.rs"]
mod ai_scoring_ivf;

#[cfg(feature = "hydrate")]
pub(crate) use ai_scoring_ivf::collect_ivf_candidates_with_probe;
pub(crate) use ai_scoring_ivf::{
    collect_ivf_candidates_for_clusters, ivf_candidate_count_for_clusters,
    select_ivf_clusters_with_probe, top_k_cosine_ivf_clusters_cpu,
};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub(crate) struct ScoredIndex {
    pub(crate) index: usize,
    pub(crate) score: f32,
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

pub(crate) fn top_k_cosine_native(
    query: &[f32],
    matrix: &[f32],
    dim: usize,
    k: usize,
) -> Vec<ScoredIndex> {
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
pub(crate) fn top_k_from_scores_array(scores: &js_sys::Float32Array, k: usize) -> Vec<ScoredIndex> {
    let keep = u32::try_from(k.max(1)).unwrap_or(u32::MAX);
    scored_indices_from_js_top_k(dmb_top_k_scores(scores.as_ref(), keep))
}

#[cfg(feature = "hydrate")]
pub(crate) fn top_k_cosine_candidates_cpu(
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
pub(crate) fn remap_subset_scored_indices(
    scored: Vec<ScoredIndex>,
    candidates: &[u32],
) -> Vec<ScoredIndex> {
    let mut remapped = Vec::with_capacity(scored.len());
    for entry in scored {
        let Some(&candidate_index) = candidates.get(entry.index) else {
            continue;
        };
        remapped.push(ScoredIndex {
            index: candidate_index as usize,
            score: entry.score,
        });
    }
    remapped
}

#[cfg(feature = "hydrate")]
pub(crate) fn top_k_from_subset_array(
    scores: &js_sys::Float32Array,
    candidates: &[u32],
    k: usize,
) -> Vec<ScoredIndex> {
    if candidates.is_empty() {
        return Vec::new();
    }
    let keep = u32::try_from(k.max(1)).unwrap_or(u32::MAX);
    let local_top_k = scored_indices_from_js_top_k(dmb_top_k_scores(scores.as_ref(), keep));
    remap_subset_scored_indices(local_top_k, candidates)
}

#[cfg(feature = "hydrate")]
#[cfg(test)]
mod top_k_tests {
    use super::{remap_subset_scored_indices, top_k_from_scored_iter, HeapScoreEntry, ScoredIndex};

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

    #[test]
    fn subset_top_k_remap_projects_local_winners_back_to_source_indices() {
        let local = vec![
            ScoredIndex {
                index: 1,
                score: 0.9,
            },
            ScoredIndex {
                index: 0,
                score: 0.8,
            },
        ];
        let candidates = vec![42, 99];

        let remapped = remap_subset_scored_indices(local, &candidates);
        assert_eq!(remapped.len(), 2);
        assert_eq!(remapped[0].index, 99);
        assert_eq!(remapped[1].index, 42);
    }
}

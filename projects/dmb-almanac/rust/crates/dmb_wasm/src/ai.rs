use serde::{Deserialize, Serialize};
use std::cmp::Ordering;
use wasm_bindgen::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ScoredIndex {
    index: usize,
    score: f32,
}

fn dot(a: &[f32], b: &[f32]) -> f32 {
    a.iter().zip(b.iter()).map(|(x, y)| x * y).sum()
}

#[wasm_bindgen]
pub fn cosine_similarity(a: Vec<f32>, b: Vec<f32>) -> f32 {
    if a.is_empty() || b.is_empty() || a.len() != b.len() {
        return 0.0;
    }
    dot(&a, &b)
}

#[wasm_bindgen]
pub fn top_k_cosine(query: Vec<f32>, matrix: Vec<f32>, dim: usize, k: usize) -> JsValue {
    if dim == 0 || k == 0 || query.len() != dim {
        return serde_wasm_bindgen::to_value(&Vec::<ScoredIndex>::new())
            .unwrap_or_else(|_| js_sys::Array::new().into());
    }
    let count = matrix.len() / dim;
    let mut scored = Vec::with_capacity(count);
    for idx in 0..count {
        let start = idx * dim;
        let end = start + dim;
        if end > matrix.len() {
            break;
        }
        let score = dot(&query, &matrix[start..end]);
        if !score.is_finite() {
            continue;
        }
        scored.push(ScoredIndex { index: idx, score });
    }
    scored.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap_or(Ordering::Equal));
    let top = scored.into_iter().take(k).collect::<Vec<_>>();
    serde_wasm_bindgen::to_value(&top).unwrap_or_else(|_| js_sys::Array::new().into())
}

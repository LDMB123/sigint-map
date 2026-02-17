use js_sys::Float32Array;
use wasm_bindgen::{prelude::*, JsCast};
use wasm_bindgen_futures::JsFuture;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = window, js_name = dmbWebgpuDot, catch)]
    fn dmb_webgpu_dot_js(a: &Float32Array, b: &Float32Array) -> Result<js_sys::Promise, JsValue>;

    #[wasm_bindgen(js_namespace = window, js_name = dmbWebgpuScoresWorker, catch)]
    fn dmb_webgpu_scores_worker_js(
        query: &Float32Array,
        matrix: &Float32Array,
        dim: f64,
    ) -> Result<js_sys::Promise, JsValue>;

    #[wasm_bindgen(js_namespace = window, js_name = dmbWebgpuScores, catch)]
    fn dmb_webgpu_scores_js(
        query: &Float32Array,
        matrix: &Float32Array,
        dim: f64,
    ) -> Result<js_sys::Promise, JsValue>;

    #[wasm_bindgen(js_namespace = window, js_name = dmbWebgpuScoresSubsetWorker, catch)]
    fn dmb_webgpu_scores_subset_worker_js(
        query: &Float32Array,
        matrix: &Float32Array,
        dim: f64,
        indices: &js_sys::Uint32Array,
    ) -> Result<js_sys::Promise, JsValue>;

    #[wasm_bindgen(js_namespace = window, js_name = dmbWebgpuScoresSubset, catch)]
    fn dmb_webgpu_scores_subset_js(
        query: &Float32Array,
        matrix: &Float32Array,
        dim: f64,
        indices: &js_sys::Uint32Array,
    ) -> Result<js_sys::Promise, JsValue>;
}

fn cpu_dot(a: &[f32], b: &[f32]) -> f32 {
    a.iter().zip(b.iter()).map(|(x, y)| x * y).sum()
}

fn cpu_scores(query: &[f32], matrix: &[f32], dim: usize) -> Vec<f32> {
    if dim == 0 || query.len() != dim {
        return Vec::new();
    }
    let count = matrix.len() / dim;
    let mut scores = Vec::with_capacity(count);
    for idx in 0..count {
        let start = idx * dim;
        let end = start + dim;
        if end > matrix.len() {
            break;
        }
        scores.push(cpu_dot(query, &matrix[start..end]));
    }
    scores
}

fn cpu_scores_subset(query: &[f32], matrix: &[f32], dim: usize, indices: &[u32]) -> Vec<f32> {
    let mut scores = Vec::with_capacity(indices.len());
    for idx in indices {
        let idx = *idx as usize;
        let start = idx * dim;
        let end = start + dim;
        if end > matrix.len() {
            scores.push(0.0);
            continue;
        }
        scores.push(cpu_dot(query, &matrix[start..end]));
    }
    scores
}

#[wasm_bindgen]
pub async fn webgpu_dot_product(a: Vec<f32>, b: Vec<f32>) -> Result<f32, JsValue> {
    if a.len() != b.len() {
        return Err(JsValue::from_str("Input length mismatch"));
    }

    let _window = web_sys::window().ok_or_else(|| JsValue::from_str("window unavailable"))?;
    let a_array = Float32Array::from(a.as_slice());
    let b_array = Float32Array::from(b.as_slice());
    let Ok(promise) = dmb_webgpu_dot_js(&a_array, &b_array) else {
        return Ok(cpu_dot(&a, &b));
    };
    let result = JsFuture::from(promise).await?;
    if result.is_null() {
        return Ok(cpu_dot(&a, &b));
    }
    Ok(result.as_f64().unwrap_or_default() as f32)
}

#[wasm_bindgen]
pub async fn webgpu_scores(
    query: Vec<f32>,
    matrix: Vec<f32>,
    dim: usize,
) -> Result<Vec<f32>, JsValue> {
    if dim == 0 || query.len() != dim {
        return Ok(Vec::new());
    }
    if !matrix.len().is_multiple_of(dim) {
        return Err(JsValue::from_str("Matrix length not divisible by dim"));
    }

    let _window = web_sys::window().ok_or_else(|| JsValue::from_str("window unavailable"))?;
    let query_array = Float32Array::from(query.as_slice());
    let matrix_array = Float32Array::from(matrix.as_slice());
    let promise =
        if let Ok(worker) = dmb_webgpu_scores_worker_js(&query_array, &matrix_array, dim as f64) {
            worker
        } else if let Ok(direct) = dmb_webgpu_scores_js(&query_array, &matrix_array, dim as f64) {
            direct
        } else {
            return Ok(cpu_scores(&query, &matrix, dim));
        };
    let result = JsFuture::from(promise).await?;
    if result.is_null() || result.is_undefined() {
        return Ok(cpu_scores(&query, &matrix, dim));
    }
    let array: Float32Array = result.dyn_into()?;
    let mut scores = vec![0.0; array.length() as usize];
    array.copy_to(&mut scores);
    Ok(scores)
}

#[wasm_bindgen]
pub async fn webgpu_scores_subset(
    query: Vec<f32>,
    matrix: Vec<f32>,
    dim: usize,
    indices: Vec<u32>,
) -> Result<Vec<f32>, JsValue> {
    if dim == 0 || query.len() != dim {
        return Ok(Vec::new());
    }
    if !matrix.len().is_multiple_of(dim) {
        return Err(JsValue::from_str("Matrix length not divisible by dim"));
    }
    if indices.is_empty() {
        return Ok(Vec::new());
    }

    let _window = web_sys::window().ok_or_else(|| JsValue::from_str("window unavailable"))?;
    let query_array = Float32Array::from(query.as_slice());
    let matrix_array = Float32Array::from(matrix.as_slice());
    let indices_array = js_sys::Uint32Array::from(indices.as_slice());
    let promise = if let Ok(worker) =
        dmb_webgpu_scores_subset_worker_js(&query_array, &matrix_array, dim as f64, &indices_array)
    {
        worker
    } else if let Ok(direct) =
        dmb_webgpu_scores_subset_js(&query_array, &matrix_array, dim as f64, &indices_array)
    {
        direct
    } else {
        return Ok(cpu_scores_subset(&query, &matrix, dim, &indices));
    };
    let result = JsFuture::from(promise).await?;
    if result.is_null() || result.is_undefined() {
        return Ok(cpu_scores_subset(&query, &matrix, dim, &indices));
    }
    let array: Float32Array = result.dyn_into()?;
    let mut scores = vec![0.0; array.length() as usize];
    array.copy_to(&mut scores);
    Ok(scores)
}

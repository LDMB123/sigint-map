use js_sys::{Float32Array, Function, Reflect};
use wasm_bindgen::{prelude::*, JsCast};
use wasm_bindgen_futures::JsFuture;

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

    let window = web_sys::window().ok_or_else(|| JsValue::from_str("window unavailable"))?;
    let func = Reflect::get(&window, &JsValue::from_str("dmbWebgpuDot"))?;
    if !func.is_function() {
        return Ok(cpu_dot(&a, &b));
    }

    let func: Function = func.dyn_into()?;
    let a_array = Float32Array::from(a.as_slice());
    let b_array = Float32Array::from(b.as_slice());
    let promise = func.call2(&JsValue::NULL, &a_array, &b_array)?;
    let promise: js_sys::Promise = promise
        .dyn_into()
        .map_err(|_| JsValue::from_str("WebGPU helper did not return a Promise"))?;
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

    let window = web_sys::window().ok_or_else(|| JsValue::from_str("window unavailable"))?;
    let func = Reflect::get(&window, &JsValue::from_str("dmbWebgpuScoresWorker"))
        .ok()
        .filter(|value| value.is_function())
        .or_else(|| Reflect::get(&window, &JsValue::from_str("dmbWebgpuScores")).ok());

    let Some(func) = func else {
        return Ok(cpu_scores(&query, &matrix, dim));
    };

    if !func.is_function() {
        return Ok(cpu_scores(&query, &matrix, dim));
    }

    let func: Function = func.dyn_into()?;
    let query_array = Float32Array::from(query.as_slice());
    let matrix_array = Float32Array::from(matrix.as_slice());
    let promise = func.call3(
        &JsValue::NULL,
        &query_array,
        &matrix_array,
        &JsValue::from_f64(dim as f64),
    )?;
    let promise: js_sys::Promise = promise
        .dyn_into()
        .map_err(|_| JsValue::from_str("WebGPU helper did not return a Promise"))?;
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

    let window = web_sys::window().ok_or_else(|| JsValue::from_str("window unavailable"))?;
    let func = Reflect::get(&window, &JsValue::from_str("dmbWebgpuScoresSubsetWorker"))
        .ok()
        .filter(|value| value.is_function())
        .or_else(|| Reflect::get(&window, &JsValue::from_str("dmbWebgpuScoresSubset")).ok());

    let Some(func) = func else {
        return Ok(cpu_scores_subset(&query, &matrix, dim, &indices));
    };

    if !func.is_function() {
        return Ok(cpu_scores_subset(&query, &matrix, dim, &indices));
    }

    let func: Function = func.dyn_into()?;
    let query_array = Float32Array::from(query.as_slice());
    let matrix_array = Float32Array::from(matrix.as_slice());
    let indices_array = js_sys::Uint32Array::from(indices.as_slice());
    let promise = func.call4(
        &JsValue::NULL,
        &query_array,
        &matrix_array,
        &JsValue::from_f64(dim as f64),
        &indices_array,
    )?;
    let promise: js_sys::Promise = promise
        .dyn_into()
        .map_err(|_| JsValue::from_str("WebGPU helper did not return a Promise"))?;
    let result = JsFuture::from(promise).await?;
    if result.is_null() || result.is_undefined() {
        return Ok(cpu_scores_subset(&query, &matrix, dim, &indices));
    }
    let array: Float32Array = result.dyn_into()?;
    let mut scores = vec![0.0; array.length() as usize];
    array.copy_to(&mut scores);
    Ok(scores)
}

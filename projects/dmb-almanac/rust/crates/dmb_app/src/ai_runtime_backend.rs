#[cfg(feature = "hydrate")]
use super::*;

#[cfg(feature = "hydrate")]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum WebgpuPolicyBackend {
    Worker,
    Direct,
}

#[cfg(feature = "hydrate")]
struct WebgpuPolicyRequest<'a> {
    matrix_array: &'a js_sys::Float32Array,
    matrix_float_len: usize,
    worker_preflight_key: &'static str,
    worker_attempt_event: &'static str,
    worker_success_event: &'static str,
    worker_unavailable_event: &'static str,
    worker_failure_reason: &'static str,
    worker_failure_event: &'static str,
    direct_event: &'static str,
    worker_signature: Option<WebgpuMatrixJsSignature>,
}

#[cfg(feature = "hydrate")]
fn webgpu_policy_event(event: &str) {
    let _ = with_local_storage(|storage| {
        bump_webgpu_policy_metric(storage, event);
    });
}

#[cfg(feature = "hydrate")]
fn mark_worker_runtime_failure(reason: &str, fallback_event: &str) {
    clear_worker_matrix_signature();
    dmb_wasm::reset_webgpu_worker_runtime();
    let _ = with_local_storage(|storage| {
        set_worker_failure_cooldown(storage, reason);
        bump_webgpu_policy_metric(storage, fallback_event);
    });
}

#[cfg(feature = "hydrate")]
fn clear_worker_runtime_failure() {
    let _ = with_local_storage(clear_worker_failure_storage);
}

#[cfg(feature = "hydrate")]
fn matrix_to_js_array(matrix: &[f32], use_cache: bool) -> js_sys::Float32Array {
    if !use_cache {
        return js_sys::Float32Array::from(matrix);
    }
    let signature = matrix_js_signature(matrix);
    WEBGPU_MATRIX_JS_CACHE.with(|cache| {
        let mut cache_ref = cache.borrow_mut();
        if let Some(existing) = cache_ref.as_ref()
            && existing.signature == signature
        {
            return existing.array.clone();
        }
        let array = js_sys::Float32Array::from(matrix);
        *cache_ref = Some(WebgpuMatrixJsCache {
            signature,
            array: array.clone(),
        });
        array
    })
}

#[cfg(feature = "hydrate")]
fn with_subset_matrix_slice<T>(
    matrix: &[f32],
    dim: usize,
    indices: &[u32],
    run: impl FnOnce(&[f32]) -> T,
) -> T {
    if dim == 0 || indices.is_empty() {
        return run(&[]);
    }
    let row_count = matrix.len() / dim;
    let target_len = indices.len().saturating_mul(dim);
    WEBGPU_SUBSET_MATRIX_BUFFER.with(|buffer| {
        let mut buffer_ref = buffer.borrow_mut();
        buffer_ref.resize(target_len, 0.0);
        for (pos, idx) in indices.iter().copied().enumerate() {
            let dst_start = pos.saturating_mul(dim);
            let dst_end = dst_start + dim;
            let Some(dst_row) = buffer_ref.get_mut(dst_start..dst_end) else {
                continue;
            };
            let idx = idx as usize;
            if idx < row_count {
                let src_start = idx.saturating_mul(dim);
                if let Some(src_row) = matrix.get(src_start..src_start + dim) {
                    dst_row.copy_from_slice(src_row);
                    continue;
                }
            }
            dst_row.fill(0.0);
        }
        run(&buffer_ref[..target_len])
    })
}

#[cfg(feature = "hydrate")]
async fn webgpu_scores_worker_with_rust_init_state(
    query_array: &js_sys::Float32Array,
    matrix_array: &js_sys::Float32Array,
    dim: usize,
    worker_signature: Option<WebgpuMatrixJsSignature>,
) -> Option<js_sys::Float32Array> {
    let Some(worker_signature) = worker_signature else {
        clear_worker_matrix_signature();
        return dmb_wasm::webgpu_scores_worker_loaded_with_init(
            query_array,
            matrix_array,
            dim,
            true,
        )
        .await;
    };

    let requires_init = worker_matrix_requires_init(worker_signature);
    if let Some(scores) = dmb_wasm::webgpu_scores_worker_loaded_with_init(
        query_array,
        matrix_array,
        dim,
        requires_init,
    )
    .await
    {
        set_worker_matrix_signature(worker_signature);
        return Some(scores);
    }

    if !requires_init {
        clear_worker_matrix_signature();
        if let Some(scores) =
            dmb_wasm::webgpu_scores_worker_loaded_with_init(query_array, matrix_array, dim, true)
                .await
        {
            set_worker_matrix_signature(worker_signature);
            return Some(scores);
        }
    }

    None
}

#[cfg(feature = "hydrate")]
async fn run_webgpu_scores_policy(
    query_array: &js_sys::Float32Array,
    dim: usize,
    caps: AiCapabilities,
    request: WebgpuPolicyRequest<'_>,
) -> Option<(js_sys::Float32Array, WebgpuPolicyBackend)> {
    if !caps.webgpu_enabled || dim == 0 {
        return None;
    }
    if !dmb_wasm::ensure_webgpu_helpers_loaded().await {
        return None;
    }

    ensure_default_worker_threshold();
    if caps.webgpu_worker {
        let can_use_worker = with_local_storage(|storage| {
            worker_preflight_allows(
                storage,
                request.matrix_float_len,
                request.worker_preflight_key,
            )
        })
        .unwrap_or(false);
        if can_use_worker {
            webgpu_policy_event(request.worker_attempt_event);
            if let Some(scores) = webgpu_scores_worker_with_rust_init_state(
                query_array,
                request.matrix_array,
                dim,
                request.worker_signature,
            )
            .await
            {
                clear_worker_runtime_failure();
                webgpu_policy_event(request.worker_success_event);
                return Some((scores, WebgpuPolicyBackend::Worker));
            }
            mark_worker_runtime_failure(
                request.worker_failure_reason,
                request.worker_failure_event,
            );
        }
    } else {
        webgpu_policy_event(request.worker_unavailable_event);
    }

    webgpu_policy_event(request.direct_event);
    let direct =
        dmb_wasm::webgpu_scores_direct_loaded(query_array, request.matrix_array, dim).await?;
    Some((direct, WebgpuPolicyBackend::Direct))
}

#[cfg(feature = "hydrate")]
pub(crate) async fn execute_webgpu_backend(
    backend: WebgpuPolicyBackend,
    query: &js_sys::Float32Array,
    matrix: &js_sys::Float32Array,
    dim: usize,
    worker_requires_init: bool,
) -> Option<js_sys::Float32Array> {
    match backend {
        WebgpuPolicyBackend::Direct => {
            dmb_wasm::webgpu_scores_direct_loaded(query, matrix, dim).await
        }
        WebgpuPolicyBackend::Worker => {
            dmb_wasm::webgpu_scores_worker_loaded_with_init(
                query,
                matrix,
                dim,
                worker_requires_init,
            )
            .await
        }
    }
}

#[cfg(feature = "hydrate")]
pub(crate) const fn webgpu_backend_label(
    backend: WebgpuPolicyBackend,
    subset: bool,
) -> &'static str {
    match (backend, subset) {
        (WebgpuPolicyBackend::Worker, true) => "webgpu-worker-subset",
        (WebgpuPolicyBackend::Direct, true) => "webgpu-subset",
        (WebgpuPolicyBackend::Worker, false) => "webgpu-worker",
        (WebgpuPolicyBackend::Direct, false) => "webgpu",
    }
}

#[cfg(feature = "hydrate")]
pub(crate) async fn webgpu_scores_with_policy(
    query_vec: &[f32],
    matrix: &[f32],
    dim: usize,
    caps: AiCapabilities,
    cache_matrix: bool,
) -> Option<(js_sys::Float32Array, WebgpuPolicyBackend)> {
    if !caps.webgpu_enabled || dim == 0 {
        return None;
    }
    let query_array = js_sys::Float32Array::from(query_vec);
    let matrix_array = matrix_to_js_array(matrix, cache_matrix);
    let request = WebgpuPolicyRequest {
        matrix_array: &matrix_array,
        matrix_float_len: matrix.len(),
        worker_preflight_key: "worker",
        worker_attempt_event: "worker_attempts",
        worker_success_event: "worker_success",
        worker_unavailable_event: "worker_fallback_worker_unavailable",
        worker_failure_reason: "WebGPU worker scoring failed",
        worker_failure_event: "worker_fallback_runtime_failed",
        direct_event: "direct_scores_calls",
        worker_signature: Some(matrix_js_signature(matrix)),
    };
    run_webgpu_scores_policy(&query_array, dim, caps, request).await
}

#[cfg(feature = "hydrate")]
pub(crate) async fn webgpu_scores_subset_with_policy(
    query_vec: &[f32],
    matrix: &[f32],
    dim: usize,
    indices: &[u32],
    caps: AiCapabilities,
) -> Option<(js_sys::Float32Array, WebgpuPolicyBackend)> {
    if !caps.webgpu_enabled || dim == 0 || indices.is_empty() {
        return None;
    }
    let subset_matrix_floats = indices.len().saturating_mul(dim);
    let query_array = js_sys::Float32Array::from(query_vec);
    let subset_matrix_array = with_subset_matrix_slice(matrix, dim, indices, |subset| {
        js_sys::Float32Array::from(subset)
    });
    if subset_matrix_array.length() == 0 {
        return Some((
            js_sys::Float32Array::new_with_length(0),
            WebgpuPolicyBackend::Direct,
        ));
    }
    let request = WebgpuPolicyRequest {
        matrix_array: &subset_matrix_array,
        matrix_float_len: subset_matrix_floats,
        worker_preflight_key: "subset_worker",
        worker_attempt_event: "subset_worker_attempts",
        worker_success_event: "subset_worker_success",
        worker_unavailable_event: "subset_worker_fallback_worker_unavailable",
        worker_failure_reason: "WebGPU subset worker scoring failed",
        worker_failure_event: "subset_worker_fallback_runtime_failed",
        direct_event: "subset_direct_scores_calls",
        worker_signature: None,
    };
    run_webgpu_scores_policy(&query_array, dim, caps, request).await
}

use js_sys::Float32Array;
use std::cell::RefCell;
use std::collections::HashMap;
use std::rc::Rc;
use wasm_bindgen::{JsCast, prelude::*};
use wasm_bindgen_futures::JsFuture;

use super::{
    WEBGPU_RUNTIME_CONFIG, WEBGPU_WORKER_RUNTIME, WEBGPU_WORKER_TIMEOUT_MS, WEBGPU_WORKER_URL,
    bindings::{
        build_worker_init_request_js, build_worker_scores_request_js, js_error_message,
        module_worker_supported, promise_with_timeout, worker_message_id, worker_message_value,
    },
    dim_u32,
};

struct WorkerPending {
    resolve: js_sys::Function,
    reject: js_sys::Function,
}

pub(super) struct WebgpuWorkerRuntime {
    pub(super) worker: web_sys::Worker,
    pending: Rc<RefCell<HashMap<u32, WorkerPending>>>,
    next_id: u32,
    pub(super) initialized: bool,
    _onmessage: Closure<dyn FnMut(web_sys::MessageEvent)>,
    _onerror: Closure<dyn FnMut(web_sys::ErrorEvent)>,
    _onmessageerror: Closure<dyn FnMut(web_sys::Event)>,
}

#[derive(Clone, Copy)]
pub(super) enum WorkerRequestKind {
    Init,
    Scores,
}

pub(super) fn webgpu_worker_supported_impl() -> bool {
    module_worker_supported()
}

fn worker_message_id_u32(value: &JsValue) -> Option<u32> {
    let number = worker_message_id(value).as_f64()?;
    if !number.is_finite() || number < 0.0 || number > u32::MAX as f64 {
        return None;
    }
    if number.fract() != 0.0 {
        return None;
    }
    Some(number as u32)
}

fn reject_all_worker_pending(pending: &Rc<RefCell<HashMap<u32, WorkerPending>>>, reason: &str) {
    let mut pending_ref = pending.borrow_mut();
    for (_, request) in pending_ref.drain() {
        let _ = request
            .reject
            .call1(&JsValue::NULL, &JsValue::from_str(reason));
    }
}

pub(super) fn clear_worker_runtime_with_reason(reason: &str) {
    WEBGPU_WORKER_RUNTIME.with(|slot| {
        let mut slot_ref = slot.borrow_mut();
        let Some(runtime) = slot_ref.take() else {
            return;
        };
        runtime.worker.terminate();
        reject_all_worker_pending(&runtime.pending, reason);
    });
}

pub(super) fn worker_error_reason(prefix: &str, detail: Option<&str>) -> String {
    let detail = detail.unwrap_or("").trim();
    if detail.is_empty() {
        prefix.to_string()
    } else {
        format!("{prefix}: {detail}")
    }
}

pub(super) fn worker_runtime_initialized() -> bool {
    WEBGPU_WORKER_RUNTIME.with(|slot| {
        slot.borrow()
            .as_ref()
            .is_some_and(|runtime| runtime.initialized)
    })
}

pub(super) fn set_worker_runtime_initialized(initialized: bool) {
    WEBGPU_WORKER_RUNTIME.with(|slot| {
        if let Some(runtime) = slot.borrow_mut().as_mut() {
            runtime.initialized = initialized;
        }
    });
}

fn ensure_worker_runtime() -> bool {
    if !webgpu_worker_supported_impl() {
        return false;
    }
    WEBGPU_WORKER_RUNTIME.with(|slot| {
        if slot.borrow().is_some() {
            return true;
        }

        let options = web_sys::WorkerOptions::new();
        options.set_type(web_sys::WorkerType::Module);
        let Ok(worker) = web_sys::Worker::new_with_options(WEBGPU_WORKER_URL, &options) else {
            return false;
        };
        let pending: Rc<RefCell<HashMap<u32, WorkerPending>>> =
            Rc::new(RefCell::new(HashMap::with_capacity(4)));

        let pending_for_message = pending.clone();
        let onmessage = Closure::wrap(Box::new(move |event: web_sys::MessageEvent| {
            let data = event.data();
            let Some(id) = worker_message_id_u32(&data) else {
                return;
            };

            let request = pending_for_message.borrow_mut().remove(&id);
            let Some(request) = request else {
                return;
            };

            let value = worker_message_value(&data);
            let _ = request.resolve.call1(&JsValue::NULL, &value);
        }) as Box<dyn FnMut(_)>);
        worker.set_onmessage(Some(onmessage.as_ref().unchecked_ref()));

        let onerror = Closure::wrap(Box::new(move |event: web_sys::ErrorEvent| {
            let reason = worker_error_reason("WebGPU worker error", Some(&event.message()));
            clear_worker_runtime_with_reason(reason.as_str());
        }) as Box<dyn FnMut(_)>);
        worker.set_onerror(Some(onerror.as_ref().unchecked_ref()));

        let onmessageerror = Closure::wrap(Box::new(move |_event: web_sys::Event| {
            clear_worker_runtime_with_reason("WebGPU worker message error");
        }) as Box<dyn FnMut(_)>);
        worker.set_onmessageerror(Some(onmessageerror.as_ref().unchecked_ref()));

        *slot.borrow_mut() = Some(WebgpuWorkerRuntime {
            worker,
            pending,
            next_id: 1,
            initialized: false,
            _onmessage: onmessage,
            _onerror: onerror,
            _onmessageerror: onmessageerror,
        });
        true
    })
}

fn create_worker_pending_promise() -> (js_sys::Promise, WorkerPending) {
    let mut resolve: Option<js_sys::Function> = None;
    let mut reject: Option<js_sys::Function> = None;
    let promise = js_sys::Promise::new(&mut |resolve_fn, reject_fn| {
        resolve = Some(resolve_fn);
        reject = Some(reject_fn);
    });
    let (Some(resolve), Some(reject)) = (resolve, reject) else {
        unreachable!("Promise constructor must provide resolve and reject functions");
    };
    (promise, WorkerPending { resolve, reject })
}

pub(super) fn direct_score_payload_valid(query_len: u32, matrix_len: u32, dim: usize) -> bool {
    dim > 0 && query_len as usize == dim && (matrix_len as usize).is_multiple_of(dim)
}

pub(super) fn score_query_payload_valid(query_len: u32, dim: usize) -> bool {
    dim > 0 && query_len as usize == dim
}

pub(super) fn worker_init_payload_valid(matrix_len: u32, dim: usize) -> bool {
    dim > 0 && matrix_len > 0 && (matrix_len as usize).is_multiple_of(dim)
}

pub(super) fn worker_request_requires_init(
    runtime_initialized: bool,
    caller_requires_init: bool,
) -> bool {
    caller_requires_init || !runtime_initialized
}

fn build_worker_init_request(
    id: u32,
    matrix: &Float32Array,
    dim: usize,
) -> Option<(js_sys::Object, js_sys::Array)> {
    if !worker_init_payload_valid(matrix.length(), dim) {
        return None;
    }

    let transfer = js_sys::Array::new();
    let matrix_copy = Float32Array::new(matrix.as_ref());
    let matrix_buffer = matrix_copy.buffer();
    let dim = dim_u32(dim)?;
    let config = WEBGPU_RUNTIME_CONFIG
        .with(|slot| slot.borrow().as_ref().cloned())
        .unwrap_or(JsValue::NULL);
    let payload = build_worker_init_request_js(id, dim, matrix_buffer.as_ref(), &config);
    transfer.push(matrix_buffer.as_ref());

    Some((payload, transfer))
}

fn build_worker_scores_request(
    id: u32,
    query: &Float32Array,
    dim: usize,
) -> Option<(js_sys::Object, js_sys::Array)> {
    if !score_query_payload_valid(query.length(), dim) {
        return None;
    }

    let transfer = js_sys::Array::new();
    let query_copy = Float32Array::new(query.as_ref());
    let query_buffer = query_copy.buffer();
    let payload = build_worker_scores_request_js(id, query_buffer.as_ref());
    transfer.push(query_buffer.as_ref());

    Some((payload, transfer))
}

pub(super) async fn run_worker_request(
    kind: WorkerRequestKind,
    query: &Float32Array,
    matrix: &Float32Array,
    dim: usize,
) -> Option<JsValue> {
    if !ensure_worker_runtime() {
        return None;
    }

    let promise = match WEBGPU_WORKER_RUNTIME.with(|slot| {
        let mut slot_ref = slot.borrow_mut();
        let runtime = slot_ref.as_mut()?;
        let id = runtime.next_id;
        runtime.next_id = runtime.next_id.wrapping_add(1);
        if runtime.next_id == 0 {
            runtime.next_id = 1;
        }
        let (promise, pending_request) = create_worker_pending_promise();
        let request = match kind {
            WorkerRequestKind::Init => build_worker_init_request(id, matrix, dim),
            WorkerRequestKind::Scores => build_worker_scores_request(id, query, dim),
        };
        let Some((payload, transfer)) = request else {
            return Some(Ok(None));
        };

        runtime.pending.borrow_mut().insert(id, pending_request);
        if runtime
            .worker
            .post_message_with_transfer(payload.as_ref(), transfer.as_ref())
            .is_err()
        {
            runtime.pending.borrow_mut().remove(&id);
            return Some(Err(()));
        }
        Some(Ok(Some(promise)))
    })? {
        Ok(Some(promise)) => promise,
        Ok(None) => return None,
        Err(()) => {
            clear_worker_runtime_with_reason("WebGPU worker request postMessage failed");
            return None;
        }
    };

    let timed = promise_with_timeout(promise, WEBGPU_WORKER_TIMEOUT_MS, "WebGPU worker timed out");
    match JsFuture::from(timed).await {
        Ok(value) => Some(value),
        Err(error) => {
            let reason = js_error_message(&error)
                .unwrap_or_else(|| "WebGPU worker request failed".to_string());
            clear_worker_runtime_with_reason(reason.as_str());
            None
        }
    }
}

pub(super) fn js_value_to_scores_array(value: JsValue) -> Option<Float32Array> {
    if value.is_null() || value.is_undefined() {
        return None;
    }
    if value.is_instance_of::<js_sys::ArrayBuffer>() {
        return Some(Float32Array::new(&value));
    }
    value.dyn_into::<Float32Array>().ok()
}

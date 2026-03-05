use js_sys::Float32Array;
use std::cell::{Cell, RefCell};
use std::collections::HashMap;
use std::rc::Rc;
use wasm_bindgen::{prelude::*, JsCast};
use wasm_bindgen_futures::JsFuture;

#[wasm_bindgen(inline_js = r#"
let webgpuModulePromise = null;

function loadWebgpuModule() {
  try {
    if (webgpuModulePromise) return webgpuModulePromise;
    webgpuModulePromise = import('/webgpu.js').catch((error) => {
      webgpuModulePromise = null;
      throw error;
    });
    return webgpuModulePromise;
  } catch (error) {
    return Promise.reject(error);
  }
}

export function dmb_load_webgpu_helpers() {
  return loadWebgpuModule().then(() => true).catch(() => false);
}

export function dmb_webgpu_scores(query, matrix, dim) {
  return loadWebgpuModule().then((module) => module.webgpuScores(query, matrix, dim));
}

export function dmb_worker_message_id(data) {
  const id = data?.id;
  return Number.isInteger(id) && id >= 0 && id <= 0xFFFFFFFF ? id : undefined;
}

export function dmb_worker_message_value(data) {
  return data?.scores ?? data?.ok;
}

export function dmb_build_worker_init_request(id, dim, matrixBuffer) {
  return { id, dim, matrix: matrixBuffer };
}

export function dmb_build_worker_scores_request(id, queryBuffer) {
  return { id, query: queryBuffer };
}

export function dmb_js_error_message(value) {
  if (typeof value === 'string') {
    return value;
  }
  return value?.message;
}

export function dmb_module_worker_supported() {
  try {
    if (typeof Worker === 'undefined' || typeof URL === 'undefined' || typeof Blob === 'undefined') {
      return false;
    }
    const url = URL.createObjectURL(new Blob([''], { type: 'text/javascript' }));
    try {
      const worker = new Worker(url, { type: 'module' });
      worker.terminate();
      return true;
    } finally {
      URL.revokeObjectURL(url);
    }
  } catch (_) {
    return false;
  }
}

export function dmb_promise_with_timeout(promise, timeoutMs, timeoutMessage) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(timeoutMessage || 'WebGPU worker timed out'));
    }, timeoutMs);

    Promise.resolve(promise).then(
      (value) => {
        clearTimeout(timeoutId);
        resolve(value);
      },
      (error) => {
        clearTimeout(timeoutId);
        reject(error);
      }
    );
  });
}
"#)]
extern "C" {
    fn dmb_load_webgpu_helpers() -> js_sys::Promise;
    fn dmb_webgpu_scores(query: &JsValue, matrix: &JsValue, dim: u32) -> js_sys::Promise;
    fn dmb_worker_message_id(data: &JsValue) -> JsValue;
    fn dmb_worker_message_value(data: &JsValue) -> JsValue;
    fn dmb_build_worker_init_request(id: u32, dim: u32, matrix_buffer: &JsValue) -> js_sys::Object;
    fn dmb_build_worker_scores_request(id: u32, query_buffer: &JsValue) -> js_sys::Object;
    fn dmb_js_error_message(value: &JsValue) -> JsValue;
    fn dmb_module_worker_supported() -> bool;
    fn dmb_promise_with_timeout(
        promise: js_sys::Promise,
        timeout_ms: u32,
        timeout_message: &str,
    ) -> js_sys::Promise;
}

thread_local! {
    static WEBGPU_HELPERS_READY: Cell<bool> = const { Cell::new(false) };
    static WEBGPU_HELPERS_FAILED: Cell<bool> = const { Cell::new(false) };
    static WEBGPU_WORKER_RUNTIME: RefCell<Option<WebgpuWorkerRuntime>> = const { RefCell::new(None) };
}

const WEBGPU_PROBE_DIM: usize = 1;
const WEBGPU_WORKER_WARM_DIM: usize = 8;
const WEBGPU_WORKER_WARM_COUNT: usize = 64;
const WEBGPU_WORKER_TIMEOUT_MS: u32 = 8_000;
const WEBGPU_WORKER_URL: &str = "/webgpu-worker.js";

struct WorkerPending {
    resolve: js_sys::Function,
    reject: js_sys::Function,
}

struct WebgpuWorkerRuntime {
    worker: web_sys::Worker,
    pending: Rc<RefCell<HashMap<u32, WorkerPending>>>,
    next_id: u32,
    initialized: bool,
    _onmessage: Closure<dyn FnMut(web_sys::MessageEvent)>,
    _onerror: Closure<dyn FnMut(web_sys::ErrorEvent)>,
    _onmessageerror: Closure<dyn FnMut(web_sys::Event)>,
}

#[derive(Debug, Clone, Default)]
pub struct WarmWebgpuStatus {
    pub warmed: bool,
    pub reason: Option<String>,
}

#[inline]
fn mark_webgpu_helpers_ready() {
    WEBGPU_HELPERS_READY.with(|ready| ready.set(true));
    WEBGPU_HELPERS_FAILED.with(|failed| failed.set(false));
}

pub fn webgpu_worker_supported() -> bool {
    dmb_module_worker_supported()
}

pub fn webgpu_helpers_failed() -> bool {
    WEBGPU_HELPERS_FAILED.with(Cell::get)
}

pub fn reset_webgpu_worker_runtime() {
    clear_worker_runtime_with_reason("WebGPU worker reset");
}

pub async fn ensure_webgpu_helpers_loaded() -> bool {
    if WEBGPU_HELPERS_READY.with(Cell::get) {
        return true;
    }
    let result = JsFuture::from(dmb_load_webgpu_helpers()).await;
    let loaded = result
        .ok()
        .and_then(|value| value.as_bool())
        .unwrap_or(false);
    if loaded {
        mark_webgpu_helpers_ready();
    } else {
        WEBGPU_HELPERS_FAILED.with(|failed| failed.set(true));
    }
    loaded
}

pub async fn webgpu_probe_available() -> Option<bool> {
    if !ensure_webgpu_helpers_loaded().await {
        return Some(false);
    }
    let query = Float32Array::from(&[1.0f32][..]);
    let matrix = Float32Array::from(&[1.0f32][..]);
    let probe_scores = webgpu_scores_direct_loaded(&query, &matrix, WEBGPU_PROBE_DIM).await;
    Some(probe_scores.is_some_and(|scores| scores.length() == 1))
}

pub async fn warm_webgpu_worker() -> Option<WarmWebgpuStatus> {
    if !ensure_webgpu_helpers_loaded().await {
        return Some(WarmWebgpuStatus {
            warmed: false,
            reason: Some("webgpu helpers unavailable".to_string()),
        });
    }
    let query_data = vec![0.01f32; WEBGPU_WORKER_WARM_DIM];
    let matrix_data = vec![0.01f32; WEBGPU_WORKER_WARM_DIM * WEBGPU_WORKER_WARM_COUNT];
    let query = Float32Array::from(query_data.as_slice());
    let matrix = Float32Array::from(matrix_data.as_slice());
    let warm_scores = webgpu_scores_worker_loaded(&query, &matrix, WEBGPU_WORKER_WARM_DIM).await;
    let status = match warm_scores {
        Some(scores) if scores.length() as usize == WEBGPU_WORKER_WARM_COUNT => WarmWebgpuStatus {
            warmed: true,
            reason: None,
        },
        Some(scores) => WarmWebgpuStatus {
            warmed: false,
            reason: Some(format!(
                "worker warm returned {} scores; expected {}",
                scores.length(),
                WEBGPU_WORKER_WARM_COUNT
            )),
        },
        None => WarmWebgpuStatus {
            warmed: false,
            reason: Some("worker warm unavailable".to_string()),
        },
    };
    Some(status)
}

async fn resolve_scores_promise(promise: js_sys::Promise) -> Option<Float32Array> {
    let result = JsFuture::from(promise).await.ok()?;
    if result.is_null() || result.is_undefined() {
        return None;
    }
    result.dyn_into().ok()
}

fn worker_message_id(value: &JsValue) -> Option<u32> {
    let number = dmb_worker_message_id(value).as_f64()?;
    if !number.is_finite() || number < 0.0 || number > u32::MAX as f64 {
        return None;
    }
    if number.fract() != 0.0 {
        return None;
    }
    Some(number as u32)
}

fn js_error_message(value: &JsValue) -> Option<String> {
    dmb_js_error_message(value).as_string()
}

fn dim_u32(dim: usize) -> Option<u32> {
    u32::try_from(dim).ok()
}

fn reject_all_worker_pending(pending: &Rc<RefCell<HashMap<u32, WorkerPending>>>, reason: &str) {
    let mut pending_ref = pending.borrow_mut();
    for (_, request) in pending_ref.drain() {
        let _ = request
            .reject
            .call1(&JsValue::NULL, &JsValue::from_str(reason));
    }
}

fn clear_worker_runtime_with_reason(reason: &str) {
    WEBGPU_WORKER_RUNTIME.with(|slot| {
        let mut slot_ref = slot.borrow_mut();
        let Some(runtime) = slot_ref.take() else {
            return;
        };
        runtime.worker.terminate();
        reject_all_worker_pending(&runtime.pending, reason);
    });
}

fn worker_error_reason(prefix: &str, detail: Option<&str>) -> String {
    let detail = detail.unwrap_or("").trim();
    if detail.is_empty() {
        prefix.to_string()
    } else {
        format!("{prefix}: {detail}")
    }
}

fn worker_runtime_initialized() -> bool {
    WEBGPU_WORKER_RUNTIME.with(|slot| {
        slot.borrow()
            .as_ref()
            .is_some_and(|runtime| runtime.initialized)
    })
}

fn set_worker_runtime_initialized(initialized: bool) {
    WEBGPU_WORKER_RUNTIME.with(|slot| {
        if let Some(runtime) = slot.borrow_mut().as_mut() {
            runtime.initialized = initialized;
        }
    });
}

fn ensure_worker_runtime() -> bool {
    if !webgpu_worker_supported() {
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
            let Some(id) = worker_message_id(&data) else {
                return;
            };

            let request = pending_for_message.borrow_mut().remove(&id);
            let Some(request) = request else {
                return;
            };

            let value = dmb_worker_message_value(&data);
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

#[derive(Clone, Copy)]
enum WorkerRequestKind {
    Init,
    Scores,
}

fn direct_score_payload_valid(query_len: u32, matrix_len: u32, dim: usize) -> bool {
    dim > 0 && query_len as usize == dim && (matrix_len as usize).is_multiple_of(dim)
}

fn score_query_payload_valid(query_len: u32, dim: usize) -> bool {
    dim > 0 && query_len as usize == dim
}

fn worker_init_payload_valid(matrix_len: u32, dim: usize) -> bool {
    dim > 0 && matrix_len > 0 && (matrix_len as usize).is_multiple_of(dim)
}

fn worker_request_requires_init(runtime_initialized: bool, caller_requires_init: bool) -> bool {
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
    let payload = dmb_build_worker_init_request(id, dim, matrix_buffer.as_ref());
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
    let payload = dmb_build_worker_scores_request(id, query_buffer.as_ref());
    transfer.push(query_buffer.as_ref());

    Some((payload, transfer))
}

async fn run_worker_request(
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

    let timed =
        dmb_promise_with_timeout(promise, WEBGPU_WORKER_TIMEOUT_MS, "WebGPU worker timed out");
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

fn js_value_to_scores_array(value: JsValue) -> Option<Float32Array> {
    if value.is_null() || value.is_undefined() {
        return None;
    }
    if value.is_instance_of::<js_sys::ArrayBuffer>() {
        return Some(Float32Array::new(&value));
    }
    value.dyn_into::<Float32Array>().ok()
}

pub async fn webgpu_scores_direct(
    query: &Float32Array,
    matrix: &Float32Array,
    dim: usize,
) -> Option<Float32Array> {
    if !ensure_webgpu_helpers_loaded().await {
        return None;
    }
    webgpu_scores_direct_loaded(query, matrix, dim).await
}

pub async fn webgpu_scores_direct_loaded(
    query: &Float32Array,
    matrix: &Float32Array,
    dim: usize,
) -> Option<Float32Array> {
    if !direct_score_payload_valid(query.length(), matrix.length(), dim) {
        return None;
    }
    let dim = dim_u32(dim)?;
    let promise = dmb_webgpu_scores(query.as_ref(), matrix.as_ref(), dim);
    resolve_scores_promise(promise).await
}

pub async fn webgpu_scores_worker(
    query: &Float32Array,
    matrix: &Float32Array,
    dim: usize,
) -> Option<Float32Array> {
    if !ensure_webgpu_helpers_loaded().await {
        return None;
    }
    webgpu_scores_worker_loaded(query, matrix, dim).await
}

pub async fn webgpu_scores_worker_loaded(
    query: &Float32Array,
    matrix: &Float32Array,
    dim: usize,
) -> Option<Float32Array> {
    webgpu_scores_worker_loaded_with_init(query, matrix, dim, true).await
}

pub async fn webgpu_scores_worker_loaded_with_init(
    query: &Float32Array,
    matrix: &Float32Array,
    dim: usize,
    requires_init: bool,
) -> Option<Float32Array> {
    if !webgpu_worker_supported() {
        return None;
    }

    let requires_init = worker_request_requires_init(worker_runtime_initialized(), requires_init);
    if requires_init {
        run_worker_request(WorkerRequestKind::Init, query, matrix, dim).await?;
        set_worker_runtime_initialized(true);
    }

    let result = run_worker_request(WorkerRequestKind::Scores, query, matrix, dim).await?;
    js_value_to_scores_array(result)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn worker_init_payload_requires_positive_divisible_matrix() {
        assert!(worker_init_payload_valid(8, 4));
        assert!(worker_init_payload_valid(16, 8));
        assert!(!worker_init_payload_valid(0, 4));
        assert!(!worker_init_payload_valid(8, 0));
        assert!(!worker_init_payload_valid(10, 4));
    }

    #[test]
    fn direct_score_payload_requires_matching_query_and_matrix_shape() {
        assert!(direct_score_payload_valid(4, 0, 4));
        assert!(direct_score_payload_valid(4, 8, 4));
        assert!(!direct_score_payload_valid(3, 8, 4));
        assert!(!direct_score_payload_valid(4, 10, 4));
        assert!(!direct_score_payload_valid(4, 8, 0));
    }

    #[test]
    fn score_query_payload_requires_query_dim_match() {
        assert!(score_query_payload_valid(4, 4));
        assert!(!score_query_payload_valid(3, 4));
        assert!(!score_query_payload_valid(4, 0));
    }

    #[test]
    fn worker_request_requires_init_when_runtime_is_cold() {
        assert!(worker_request_requires_init(false, false));
        assert!(worker_request_requires_init(false, true));
        assert!(worker_request_requires_init(true, true));
        assert!(!worker_request_requires_init(true, false));
    }

    #[test]
    fn worker_error_reason_prefers_detail_when_present() {
        assert_eq!(
            worker_error_reason("WebGPU worker error", Some("boom")),
            "WebGPU worker error: boom"
        );
        assert_eq!(
            worker_error_reason("WebGPU worker error", Some("   ")),
            "WebGPU worker error"
        );
        assert_eq!(
            worker_error_reason("WebGPU worker error", None),
            "WebGPU worker error"
        );
    }
}

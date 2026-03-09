use wasm_bindgen::prelude::*;

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

export function dmb_set_webgpu_runtime_config(config) {
  return loadWebgpuModule().then((module) => {
    if (typeof module.setWebgpuRuntimeConfig === 'function') {
      module.setWebgpuRuntimeConfig(config || {});
    }
    return true;
  }).catch(() => false);
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

export function dmb_build_worker_init_request(id, dim, matrixBuffer, config) {
  return { id, dim, matrix: matrixBuffer, config };
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
    fn dmb_set_webgpu_runtime_config(config: &JsValue) -> js_sys::Promise;
    fn dmb_webgpu_scores(query: &JsValue, matrix: &JsValue, dim: u32) -> js_sys::Promise;
    fn dmb_worker_message_id(data: &JsValue) -> JsValue;
    fn dmb_worker_message_value(data: &JsValue) -> JsValue;
    fn dmb_build_worker_init_request(
        id: u32,
        dim: u32,
        matrix_buffer: &JsValue,
        config: &JsValue,
    ) -> js_sys::Object;
    fn dmb_build_worker_scores_request(id: u32, query_buffer: &JsValue) -> js_sys::Object;
    fn dmb_js_error_message(value: &JsValue) -> JsValue;
    fn dmb_module_worker_supported() -> bool;
    fn dmb_promise_with_timeout(
        promise: js_sys::Promise,
        timeout_ms: u32,
        timeout_message: &str,
    ) -> js_sys::Promise;
}

pub(super) fn load_webgpu_helpers() -> js_sys::Promise {
    dmb_load_webgpu_helpers()
}

pub(super) fn set_webgpu_runtime_config_js(config: &JsValue) -> js_sys::Promise {
    dmb_set_webgpu_runtime_config(config)
}

pub(super) fn webgpu_scores_js(query: &JsValue, matrix: &JsValue, dim: u32) -> js_sys::Promise {
    dmb_webgpu_scores(query, matrix, dim)
}

pub(super) fn worker_message_id(value: &JsValue) -> JsValue {
    dmb_worker_message_id(value)
}

pub(super) fn worker_message_value(value: &JsValue) -> JsValue {
    dmb_worker_message_value(value)
}

pub(super) fn build_worker_init_request_js(
    id: u32,
    dim: u32,
    matrix_buffer: &JsValue,
    config: &JsValue,
) -> js_sys::Object {
    dmb_build_worker_init_request(id, dim, matrix_buffer, config)
}

pub(super) fn build_worker_scores_request_js(id: u32, query_buffer: &JsValue) -> js_sys::Object {
    dmb_build_worker_scores_request(id, query_buffer)
}

pub(super) fn js_error_message(value: &JsValue) -> Option<String> {
    dmb_js_error_message(value).as_string()
}

pub(super) fn module_worker_supported() -> bool {
    dmb_module_worker_supported()
}

pub(super) fn promise_with_timeout(
    promise: js_sys::Promise,
    timeout_ms: u32,
    timeout_message: &str,
) -> js_sys::Promise {
    dmb_promise_with_timeout(promise, timeout_ms, timeout_message)
}

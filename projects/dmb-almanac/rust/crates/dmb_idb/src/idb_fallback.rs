#[cfg(not(target_arch = "wasm32"))]
use wasm_bindgen::JsValue;

#[cfg(not(target_arch = "wasm32"))]
pub(crate) fn idb_unavailable<T>() -> std::result::Result<T, JsValue> {
    Err(JsValue::from_str("IndexedDB not available on server"))
}

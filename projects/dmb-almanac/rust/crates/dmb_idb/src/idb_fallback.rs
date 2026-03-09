use wasm_bindgen::JsValue;

pub(crate) fn idb_unavailable<T>() -> std::result::Result<T, JsValue> {
    Err(JsValue::from_str("IndexedDB not available on server"))
}

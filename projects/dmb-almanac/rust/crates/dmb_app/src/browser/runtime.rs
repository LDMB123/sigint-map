#[cfg(feature = "hydrate")]
use wasm_bindgen::JsValue;

#[cfg(feature = "hydrate")]
pub fn cross_origin_isolated() -> Option<bool> {
    let window = web_sys::window()?;
    js_sys::Reflect::get(window.as_ref(), &JsValue::from_str("crossOriginIsolated"))
        .ok()
        .and_then(|value| value.as_bool())
}

#[cfg(not(feature = "hydrate"))]
pub fn cross_origin_isolated() -> Option<bool> {
    None
}

#[cfg(feature = "hydrate")]
pub fn is_secure_context() -> Option<bool> {
    let window = web_sys::window()?;
    Some(window.is_secure_context())
}

#[cfg(not(feature = "hydrate"))]
pub fn is_secure_context() -> Option<bool> {
    None
}

#[cfg(test)]
mod tests {
    #[cfg(not(feature = "hydrate"))]
    #[test]
    fn runtime_apis_are_noops_without_hydrate() {
        assert_eq!(super::cross_origin_isolated(), None);
        assert_eq!(super::is_secure_context(), None);
    }
}

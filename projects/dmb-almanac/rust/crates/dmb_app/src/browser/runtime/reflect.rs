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

#[cfg(feature = "hydrate")]
pub fn property_or_undefined(target: &JsValue, name: &str) -> JsValue {
    js_sys::Reflect::get(target, &JsValue::from_str(name)).unwrap_or(JsValue::UNDEFINED)
}

#[cfg(not(feature = "hydrate"))]
pub fn property_or_undefined(_target: &JsValue, _name: &str) -> JsValue {
    JsValue::UNDEFINED
}

#[cfg(feature = "hydrate")]
pub fn set_property(target: &JsValue, name: &str, value: &JsValue) -> bool {
    js_sys::Reflect::set(target, &JsValue::from_str(name), value).unwrap_or(false)
}

#[cfg(not(feature = "hydrate"))]
pub fn set_property(_target: &JsValue, _name: &str, _value: &JsValue) -> bool {
    false
}

#[cfg(feature = "hydrate")]
pub fn window_property_or_undefined(name: &str) -> JsValue {
    let Some(window) = web_sys::window() else {
        return JsValue::UNDEFINED;
    };
    property_or_undefined(window.as_ref(), name)
}

#[cfg(not(feature = "hydrate"))]
pub fn window_property_or_undefined(_name: &str) -> JsValue {
    JsValue::UNDEFINED
}

#[cfg(feature = "hydrate")]
pub fn navigator_property_or_undefined(name: &str) -> JsValue {
    let Some(window) = web_sys::window() else {
        return JsValue::UNDEFINED;
    };
    property_or_undefined(window.navigator().as_ref(), name)
}

#[cfg(not(feature = "hydrate"))]
pub fn navigator_property_or_undefined(_name: &str) -> JsValue {
    JsValue::UNDEFINED
}

#[cfg(feature = "hydrate")]
pub fn property_f64(target: &JsValue, name: &str) -> Option<f64> {
    property_or_undefined(target, name).as_f64()
}

#[cfg(not(feature = "hydrate"))]
pub fn property_f64(_target: &JsValue, _name: &str) -> Option<f64> {
    None
}

#[cfg(feature = "hydrate")]
pub fn set_window_bool(name: &str, value: bool) -> bool {
    let Some(window) = web_sys::window() else {
        return false;
    };
    set_property(window.as_ref(), name, &JsValue::from_bool(value))
}

#[cfg(not(feature = "hydrate"))]
pub fn set_window_bool(_name: &str, _value: bool) -> bool {
    false
}

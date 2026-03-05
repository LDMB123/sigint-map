#[cfg(feature = "hydrate")]
use wasm_bindgen::JsCast;
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
pub fn navigator_device_memory_gb() -> Option<f64> {
    navigator_property_or_undefined("deviceMemory").as_f64()
}

#[cfg(not(feature = "hydrate"))]
pub fn navigator_device_memory_gb() -> Option<f64> {
    None
}

#[cfg(feature = "hydrate")]
pub fn navigator_hardware_concurrency() -> Option<usize> {
    let window = web_sys::window()?;
    Some(window.navigator().hardware_concurrency().max(1.0) as usize)
}

#[cfg(not(feature = "hydrate"))]
pub fn navigator_hardware_concurrency() -> Option<usize> {
    None
}

#[cfg(feature = "hydrate")]
pub fn navigator_on_line() -> Option<bool> {
    let window = web_sys::window()?;
    Some(window.navigator().on_line())
}

#[cfg(not(feature = "hydrate"))]
pub fn navigator_on_line() -> Option<bool> {
    None
}

#[cfg(feature = "hydrate")]
pub fn set_window_bool(name: &str, value: bool) -> bool {
    let Some(window) = web_sys::window() else {
        return false;
    };
    js_sys::Reflect::set(
        window.as_ref(),
        &JsValue::from_str(name),
        &JsValue::from_bool(value),
    )
    .unwrap_or(false)
}

#[cfg(not(feature = "hydrate"))]
pub fn set_window_bool(_name: &str, _value: bool) -> bool {
    false
}

#[cfg(feature = "hydrate")]
pub fn location_search_param(name: &str) -> Option<String> {
    let window = web_sys::window()?;
    let search = window.location().search().ok()?;
    let params = web_sys::UrlSearchParams::new_with_str(&search).ok()?;
    params.get(name)
}

#[cfg(not(feature = "hydrate"))]
pub fn location_search_param(_name: &str) -> Option<String> {
    None
}

#[cfg(feature = "hydrate")]
pub fn location_hostname() -> Option<String> {
    let window = web_sys::window()?;
    window.location().hostname().ok()
}

#[cfg(not(feature = "hydrate"))]
pub fn location_hostname() -> Option<String> {
    None
}

#[cfg(feature = "hydrate")]
pub fn performance_now_ms() -> Option<f64> {
    let window = web_sys::window()?;
    let performance = window.performance()?;
    Some(performance.now())
}

#[cfg(not(feature = "hydrate"))]
pub fn performance_now_ms() -> Option<f64> {
    None
}

#[cfg(feature = "hydrate")]
pub fn location_href() -> Option<String> {
    let window = web_sys::window()?;
    window.location().href().ok()
}

#[cfg(not(feature = "hydrate"))]
pub fn location_href() -> Option<String> {
    None
}

#[cfg(feature = "hydrate")]
pub fn location_pathname() -> Option<String> {
    let window = web_sys::window()?;
    window.location().pathname().ok()
}

#[cfg(not(feature = "hydrate"))]
pub fn location_pathname() -> Option<String> {
    None
}

#[cfg(feature = "hydrate")]
pub fn location_search() -> Option<String> {
    let window = web_sys::window()?;
    window.location().search().ok()
}

#[cfg(not(feature = "hydrate"))]
pub fn location_search() -> Option<String> {
    None
}

#[cfg(feature = "hydrate")]
pub fn location_hash() -> Option<String> {
    let window = web_sys::window()?;
    window.location().hash().ok()
}

#[cfg(not(feature = "hydrate"))]
pub fn location_hash() -> Option<String> {
    None
}

#[cfg(feature = "hydrate")]
pub fn history_replace_url(url: &str) -> bool {
    let Some(window) = web_sys::window() else {
        return false;
    };
    let Ok(history) = window.history() else {
        return false;
    };
    history
        .replace_state_with_url(&JsValue::NULL, "", Some(url))
        .is_ok()
}

#[cfg(not(feature = "hydrate"))]
pub fn history_replace_url(_url: &str) -> bool {
    false
}

#[cfg(feature = "hydrate")]
pub fn location_reload() -> bool {
    let Some(window) = web_sys::window() else {
        return false;
    };
    window.location().reload().is_ok()
}

#[cfg(not(feature = "hydrate"))]
pub fn location_reload() -> bool {
    false
}

#[cfg(feature = "hydrate")]
pub fn set_timeout_once(timeout_ms: i32, callback: impl FnOnce() + 'static) -> bool {
    let Some(window) = web_sys::window() else {
        return false;
    };
    let cb = wasm_bindgen::closure::Closure::once(callback);
    let result = window
        .set_timeout_with_callback_and_timeout_and_arguments_0(
            cb.as_ref().unchecked_ref(),
            timeout_ms,
        )
        .is_ok();
    cb.forget();
    result
}

#[cfg(not(feature = "hydrate"))]
pub fn set_timeout_once(_timeout_ms: i32, _callback: impl FnOnce() + 'static) -> bool {
    false
}

#[cfg(feature = "hydrate")]
pub fn register_online_offline_listeners(
    on_online: impl Fn() + 'static,
    on_offline: impl Fn() + 'static,
) -> Option<bool> {
    let window = web_sys::window()?;
    let initial_online = window.navigator().on_line();

    let online_cb = wasm_bindgen::closure::Closure::wrap(Box::new(on_online) as Box<dyn Fn()>);
    let offline_cb = wasm_bindgen::closure::Closure::wrap(Box::new(on_offline) as Box<dyn Fn()>);

    window
        .add_event_listener_with_callback("online", online_cb.as_ref().unchecked_ref())
        .ok()?;
    window
        .add_event_listener_with_callback("offline", offline_cb.as_ref().unchecked_ref())
        .ok()?;

    online_cb.forget();
    offline_cb.forget();
    Some(initial_online)
}

#[cfg(not(feature = "hydrate"))]
pub fn register_online_offline_listeners(
    _on_online: impl Fn() + 'static,
    _on_offline: impl Fn() + 'static,
) -> Option<bool> {
    None
}

#[cfg(feature = "hydrate")]
pub fn focus_element_by_id(id: &str) -> bool {
    let Some(window) = web_sys::window() else {
        return false;
    };
    let Some(document) = window.document() else {
        return false;
    };
    let Some(element) = document.get_element_by_id(id) else {
        return false;
    };
    let Ok(element) = element.dyn_into::<web_sys::HtmlElement>() else {
        return false;
    };
    element.focus().is_ok()
}

#[cfg(not(feature = "hydrate"))]
pub fn focus_element_by_id(_id: &str) -> bool {
    false
}

#[cfg(feature = "hydrate")]
pub async fn write_clipboard_text(text: &str) -> bool {
    let Some(window) = web_sys::window() else {
        return false;
    };
    let clipboard = window.navigator().clipboard();
    wasm_bindgen_futures::JsFuture::from(clipboard.write_text(text))
        .await
        .is_ok()
}

#[cfg(not(feature = "hydrate"))]
pub async fn write_clipboard_text(_text: &str) -> bool {
    false
}

#[cfg(test)]
mod tests {
    #[cfg(not(feature = "hydrate"))]
    #[test]
    fn runtime_apis_are_noops_without_hydrate() {
        assert_eq!(super::cross_origin_isolated(), None);
        assert_eq!(super::is_secure_context(), None);
        let _ = super::window_property_or_undefined("__DMB_TEST");
        let _ = super::navigator_property_or_undefined("gpu");
        assert!(!super::set_window_bool("__DMB_TEST", true));
        assert_eq!(super::navigator_device_memory_gb(), None);
        assert_eq!(super::navigator_hardware_concurrency(), None);
        assert_eq!(super::navigator_on_line(), None);
        assert_eq!(super::location_search_param("q"), None);
        assert_eq!(super::location_hostname(), None);
        assert_eq!(super::performance_now_ms(), None);
        assert_eq!(super::location_href(), None);
        assert_eq!(super::location_pathname(), None);
        assert_eq!(super::location_search(), None);
        assert_eq!(super::location_hash(), None);
        assert!(!super::history_replace_url("/search"));
        assert!(!super::location_reload());
        assert!(!super::set_timeout_once(10, || {}));
        assert_eq!(super::register_online_offline_listeners(|| {}, || {}), None);
        assert!(!super::focus_element_by_id("stats-tab-0"));
        let _ = super::write_clipboard_text;
    }
}

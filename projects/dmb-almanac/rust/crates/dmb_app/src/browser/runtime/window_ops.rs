#[cfg(feature = "hydrate")]
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;

#[cfg(feature = "hydrate")]
fn with_window_location_string(
    read: impl FnOnce(&web_sys::Window) -> std::result::Result<String, JsValue>,
) -> Option<String> {
    let window = web_sys::window()?;
    read(&window).ok()
}

#[cfg(feature = "hydrate")]
pub fn location_search_param(name: &str) -> Option<String> {
    let search = location_search()?;
    let params = web_sys::UrlSearchParams::new_with_str(&search).ok()?;
    params.get(name)
}

#[cfg(not(feature = "hydrate"))]
pub fn location_search_param(_name: &str) -> Option<String> {
    None
}

#[cfg(feature = "hydrate")]
pub fn location_hostname() -> Option<String> {
    with_window_location_string(|window| window.location().hostname())
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
    with_window_location_string(|window| window.location().href())
}

#[cfg(not(feature = "hydrate"))]
pub fn location_href() -> Option<String> {
    None
}

#[cfg(feature = "hydrate")]
pub fn location_pathname() -> Option<String> {
    with_window_location_string(|window| window.location().pathname())
}

#[cfg(not(feature = "hydrate"))]
pub fn location_pathname() -> Option<String> {
    None
}

#[cfg(feature = "hydrate")]
pub fn location_search() -> Option<String> {
    with_window_location_string(|window| window.location().search())
}

#[cfg(not(feature = "hydrate"))]
pub fn location_search() -> Option<String> {
    None
}

#[cfg(feature = "hydrate")]
pub fn location_hash() -> Option<String> {
    with_window_location_string(|window| window.location().hash())
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
pub fn location_assign(url: &str) -> bool {
    let Some(window) = web_sys::window() else {
        return false;
    };
    window.location().set_href(url).is_ok()
}

#[cfg(not(feature = "hydrate"))]
pub fn location_assign(_url: &str) -> bool {
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

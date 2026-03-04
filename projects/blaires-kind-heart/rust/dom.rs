use std::fmt::Write;
use wasm_bindgen::closure::Closure;
use wasm_bindgen::{intern, JsCast, JsValue, UnwrapThrowExt};
use web_sys::{
    CustomEvent, CustomEventInit, Document, Element, Event, EventTarget, HtmlElement, Window,
};
#[inline]
pub fn window() -> Window {
    web_sys::window().unwrap_throw()
}
#[inline]
pub fn document() -> Document {
    window().document().unwrap_throw()
}
#[inline]
pub fn body() -> HtmlElement {
    document().body().unwrap_throw()
}
pub fn warn(msg: &str) {
    web_sys::console::warn_1(&msg.into());
}
pub fn query(selector: &str) -> Option<Element> {
    document()
        .query_selector(wasm_bindgen::intern(selector))
        .ok()
        .flatten()
}
pub fn closest(el: &Element, selector: &str) -> Option<Element> {
    el.closest(selector).ok().flatten()
}
pub fn query_in(parent: &Element, selector: &str) -> Option<Element> {
    parent
        .query_selector(wasm_bindgen::intern(selector))
        .ok()
        .flatten()
}

fn with_query_matches(selector: &str, mut f: impl FnMut(Element)) {
    if let Ok(list) = document().query_selector_all(wasm_bindgen::intern(selector)) {
        for idx in 0..list.length() {
            if let Some(node) = list.get(idx) {
                if let Ok(el) = node.dyn_into::<Element>() {
                    f(el);
                }
            }
        }
    }
}

pub fn query_all(selector: &str) -> Vec<Element> {
    let mut out = Vec::new();
    with_query_matches(selector, |el| out.push(el));
    out
}
/// Count matching elements without allocating a Vec (just returns NodeList.length)
pub fn query_count(selector: &str) -> u32 {
    document()
        .query_selector_all(wasm_bindgen::intern(selector))
        .map(|list| list.length())
        .unwrap_or(0)
}
/// Iterate matching elements without allocating a Vec (iterates NodeList in-place)
pub fn for_each_match(selector: &str, f: impl FnMut(Element)) {
    with_query_matches(selector, f);
}
pub fn set_text(selector: &str, text: &str) {
    if let Some(el) = query(selector) {
        el.set_text_content(Some(text));
    }
}
pub fn show(selector: &str) {
    if let Some(el) = query(selector) {
        remove_attr(&el, "hidden");
    }
}
pub fn hide(selector: &str) {
    if let Some(el) = query(selector) {
        set_attr(&el, "hidden", "");
    }
}
pub fn set_dataset(el: &Element, key: &str, value: &str) {
    if let Some(html) = el.dyn_ref::<HtmlElement>() {
        let _ = html.dataset().set(key, value);
    }
}
pub fn prefers_reduced_motion() -> bool {
    window()
        .match_media("(prefers-reduced-motion: reduce)")
        .ok()
        .flatten()
        .is_some_and(|mql| mql.matches())
}
pub fn toast(message: &str) {
    if let Some(el) = crate::state::get_cached_toast_element() {
        el.set_text_content(Some(message));
        let popover: &crate::bindings::PopoverElement = el.unchecked_ref();
        popover.show_popover();
        set_timeout_once(crate::constants::TOAST_DISPLAY_MS, || {
            if let Some(el) = crate::state::get_cached_toast_element() {
                let popover: &crate::bindings::PopoverElement = el.unchecked_ref();
                popover.hide_popover();
            }
        });
    }
}
use std::cell::RefCell;
thread_local! {
    static TT_POLICY: RefCell<Option<crate::bindings::TrustedTypePolicy>> = const { RefCell::new(None) };
    static TEXT_BUF: RefCell<String> = const { RefCell::new(String::new()) };
}
pub fn init_trusted_types() {
    // Safety: Both "kindheart" and "default" policies are passthrough identity
    // callbacks. This is intentional — all HTML written through safe_set_inner_html
    // is app-controlled (never user-supplied), so no sanitisation step is needed.
    // The policy existence satisfies the CSP `require-trusted-types-for 'script'`
    // directive, which blocks third-party scripts that lack a TT policy.
    let window = window();
    let nav_win: &crate::bindings::NavigationWindow = window.unchecked_ref();
    let tt_factory: crate::bindings::TrustedTypePolicyFactory =
        nav_win.trusted_types().unchecked_into();
    let policy_opts = crate::bindings::TrustedTypePolicyOptions::new();
    let create_html_cb = Closure::<dyn FnMut(String) -> String>::new(|input: String| input);
    policy_opts.set_create_html(create_html_cb.as_ref().unchecked_ref());
    create_html_cb.forget();
    let create_script_url_cb = Closure::<dyn FnMut(String) -> String>::new(|input: String| input);
    policy_opts.set_create_script_url(create_script_url_cb.as_ref().unchecked_ref());
    create_script_url_cb.forget();
    let policy = tt_factory.create_policy("kindheart", policy_opts.as_ref());
    TT_POLICY.with(|cell| {
        *cell.borrow_mut() = Some(policy);
    });
    let default_opts = crate::bindings::TrustedTypePolicyOptions::new();
    let default_html = Closure::<dyn FnMut(String) -> String>::new(|input: String| input);
    default_opts.set_create_html(default_html.as_ref().unchecked_ref());
    default_html.forget();
    let default_url = Closure::<dyn FnMut(String) -> String>::new(|input: String| input);
    default_opts.set_create_script_url(default_url.as_ref().unchecked_ref());
    default_url.forget();
    let _ = tt_factory.create_policy("default", default_opts.as_ref());
}
pub fn safe_set_inner_html(el: &Element, html: &str) {
    let used_tt = TT_POLICY.with(|cell| {
        let guard = cell.borrow();
        if let Some(policy) = guard.as_ref() {
            let trusted = policy.create_html(html);
            let trusted_el: &crate::bindings::TrustedElement = el.unchecked_ref();
            trusted_el.set_inner_html_trusted(&trusted);
            return true;
        }
        false
    });
    if !used_tt {
        el.set_inner_html(html);
    }

    // Decorative sticker images are injected as inline text embellishments.
    // Ensure they are consistently excluded from accessible name computation.
    if let Ok(node_list) = el.query_selector_all("img.inline-emoji") {
        for idx in 0..node_list.length() {
            if let Some(node) = node_list.get(idx) {
                if let Ok(img) = node.dyn_into::<Element>() {
                    if !img.has_attribute("alt") {
                        let _ = img.set_attribute("alt", "");
                    }
                    let _ = img.set_attribute("aria-hidden", "true");
                    let _ = img.set_attribute("role", "presentation");
                }
            }
        }
    }
}
pub fn trusted_script_url(url: &str) -> Option<crate::bindings::TrustedScriptURL> {
    TT_POLICY.with(|cell| {
        let guard = cell.borrow();
        guard.as_ref().map(|policy| policy.create_script_url(url))
    })
}
pub fn active_element() -> Option<Element> {
    document().active_element()
}
pub fn focus_first(container: &Element) {
    let focusable = wasm_bindgen::intern("button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex=\"-1\"])");
    if let Ok(Some(el)) = container.query_selector(focusable) {
        if let Ok(html) = el.dyn_into::<HtmlElement>() {
            let _ = html.focus();
            return;
        }
    }
    if let Some(html) = container.dyn_ref::<HtmlElement>() {
        let _ = html.focus();
    }
}
pub fn focus_element(el: &Element) {
    if let Some(html) = el.dyn_ref::<HtmlElement>() {
        let _ = html.focus();
    }
}
pub fn event_target_element(event: &Event) -> Option<Element> {
    event.target().and_then(|t| {
        if let Ok(node) = t.clone().dyn_into::<web_sys::Node>() {
            if node.node_type() == web_sys::Node::TEXT_NODE {
                return node.parent_element();
            }
        }
        t.dyn_into::<Element>().ok()
    })
}
pub fn pin_closure_to_arena(key: &str, cb: &JsValue) {
    if let Some(arena) = query(crate::constants::SELECTOR_GAME_ARENA) {
        let k = JsValue::from_str(key);
        let _ = js_sys::Reflect::set(&arena, &k, cb);
    }
}
pub fn on(target: &EventTarget, event: &str, handler: impl FnMut(Event) + 'static) {
    let cb = Closure::<dyn FnMut(Event)>::new(handler);
    let _ = target.add_event_listener_with_callback(event, cb.as_ref().unchecked_ref());
    cb.forget();
}
const USER_UNLOCK_EVENTS: [&str; 4] = ["pointerdown", "touchstart", "mousedown", "keydown"];
pub fn bind_unlock_gesture_listeners(handler: impl FnMut() + 'static) {
    let document = document();
    let target: &EventTarget = document.as_ref();
    let handler = std::rc::Rc::new(RefCell::new(handler));
    for event_name in USER_UNLOCK_EVENTS {
        let handler_ref = handler.clone();
        let cb = Closure::<dyn FnMut(Event)>::new(move |_: Event| {
            (handler_ref.borrow_mut())();
        });
        let _ = target.add_event_listener_with_callback(event_name, cb.as_ref().unchecked_ref());
        cb.forget();
    }
}
pub fn on_with_signal(
    target: &EventTarget,
    event: &str,
    signal: &web_sys::AbortSignal,
    handler: impl FnMut(Event) + 'static,
) {
    add_listener_with_signal(target, event, signal, Closure::<dyn FnMut(Event)>::new(handler));
}
pub fn on_pointer_with_signal(
    target: &EventTarget,
    event: &str,
    signal: &web_sys::AbortSignal,
    handler: impl FnMut(web_sys::PointerEvent) + 'static,
) {
    add_listener_with_signal(
        target,
        event,
        signal,
        Closure::<dyn FnMut(web_sys::PointerEvent)>::new(handler),
    );
}

fn add_listener_with_signal<E>(
    target: &EventTarget,
    event: &str,
    signal: &web_sys::AbortSignal,
    cb: Closure<dyn FnMut(E)>,
) where
    E: wasm_bindgen::convert::FromWasmAbi + 'static,
{
    let opts = web_sys::AddEventListenerOptions::new();
    opts.set_signal(signal);
    let _ = target.add_event_listener_with_callback_and_add_event_listener_options(
        event,
        cb.as_ref().unchecked_ref(),
        &opts,
    );
    cb.forget();
}
pub fn set_timeout_once(ms: i32, callback: impl FnOnce() + 'static) {
    let cb = Closure::once_into_js(callback);
    let _ = window().set_timeout_with_callback_and_timeout_and_arguments_0(cb.unchecked_ref(), ms);
}
pub fn set_timeout_cancelable(ms: i32, callback: impl FnOnce() + 'static) -> i32 {
    let cb = Closure::once_into_js(callback);
    window()
        .set_timeout_with_callback_and_timeout_and_arguments_0(cb.unchecked_ref(), ms)
        .unwrap_or(0)
}
pub fn delayed_remove(el: Element, ms: i32) {
    set_timeout_once(ms, move || {
        el.remove();
    });
}
pub fn fmt_text(selector: &str, f: impl FnOnce(&mut String)) {
    TEXT_BUF.with(|b| {
        let mut buf = b.borrow_mut();
        buf.clear();
        f(&mut buf);
        set_text(selector, &buf);
    });
}
pub fn with_buf<R>(f: impl FnOnce(&mut String) -> R) -> R {
    TEXT_BUF.with(|b| {
        let mut buf = b.borrow_mut();
        buf.clear();
        f(&mut buf)
    })
}
pub fn set_active_class(active_class: &str, new_active: &Element) {
    // Build selector and release with_buf borrow before calling for_each_match,
    // which may invoke callbacks that also call with_buf.
    let selector = with_buf(|buf| {
        buf.push('.');
        buf.push_str(active_class);
        buf.clone()
    });
    for_each_match(&selector, |old| {
        let _ = old.class_list().remove_1(active_class);
    });
    let _ = new_active.class_list().add_1(active_class);
}
pub fn delayed_class_remove(el: Element, class: &str, ms: i32) {
    let class = class.to_string();
    set_timeout_once(ms, move || {
        let _ = el.class_list().remove_1(&class);
    });
}
pub fn dispatch_custom_event(event_name: &str, detail: JsValue) {
    let init = CustomEventInit::new();
    init.set_detail(&detail);
    if let Ok(event) = CustomEvent::new_with_event_init_dict(event_name, &init) {
        let _ = document().dispatch_event(&event);
    }
}
pub fn delayed_set_attr(el: Element, attr: &str, value: &str, ms: i32) {
    let attr = attr.to_string();
    let value = value.to_string();
    set_timeout_once(ms, move || {
        let _ = el.set_attribute(intern(&attr), intern(&value));
    });
}
pub fn set_attr(el: &Element, key: &str, value: &str) {
    let _ = el.set_attribute(intern(key), intern(value));
}
fn set_centered_position_style(el: &Element, position: &str, x: f64, y: f64, z_index: i32) {
    with_buf(|buf| {
        let _ = write!(
            buf,
            "position: {position}; left: {x}px; top: {y}px; transform: translate(-50%, -50%); z-index: {z_index};"
        );
        set_attr(el, "style", buf);
    });
}
pub fn set_centered_fixed_style(el: &Element, x: f64, y: f64, z_index: i32) {
    set_centered_position_style(el, "fixed", x, y, z_index);
}
pub fn set_centered_absolute_style(el: &Element, x: f64, y: f64, z_index: i32) {
    set_centered_position_style(el, "absolute", x, y, z_index);
}
pub fn remove_attr(el: &Element, key: &str) {
    let _ = el.remove_attribute(intern(key));
}
pub fn get_attr(el: &Element, key: &str) -> Option<String> {
    el.get_attribute(intern(key))
}
pub fn has_attr(el: &Element, key: &str) -> bool {
    el.has_attribute(intern(key))
}
pub fn query_data(attr: &str, value: &str) -> Option<Element> {
    with_buf(|buf| {
        let _ = write!(buf, "[data-{attr}=\"{value}\"]");
        document().query_selector(buf).ok().flatten()
    })
}
pub fn query_child_data(parent: &Element, attr: &str, value: &str) -> Option<Element> {
    with_buf(|buf| {
        let _ = write!(buf, "[data-{attr}=\"{value}\"]");
        parent.query_selector(buf).ok().flatten()
    })
}
pub fn announce_live(message: &str) {
    let live_region = query("[data-aria-live]").or_else(|| {
        let region = document().create_element("div").ok()?;
        for (k, v) in [
            ("data-aria-live", ""),
            ("aria-live", "polite"),
            ("aria-atomic", "true"),
            ("class", "sr-only"),
        ] {
            set_attr(&region, k, v);
        }
        let _ = body().append_child(&region);
        Some(region)
    });
    if let Some(region) = live_region {
        region.set_text_content(Some(message));
    }
}

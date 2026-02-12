//! DOM utilities — event delegation, toasts, element queries, dataset helpers.
//! Safari 26.2 guarantees globals exist, so unwrap_throw() is safe and explicit.
//!
//! Key patterns:
//! - Event delegation via `on()` with CSS selectors
//! - Toast notifications with auto-dismiss
//! - Dataset attribute manipulation
//! - Focus management for accessibility

use wasm_bindgen::closure::Closure;
use wasm_bindgen::{JsCast, JsValue, UnwrapThrowExt};
use web_sys::{CustomEvent, CustomEventInit, Document, Element, Event, EventTarget, HtmlElement, Window};

// Safari 26.2 guarantees these globals exist — trust the platform
pub fn window() -> Window {
    web_sys::window().unwrap_throw()
}

pub fn document() -> Document {
    window().document().unwrap_throw()
}

pub fn body() -> HtmlElement {
    document().body().unwrap_throw()
}

pub fn query(selector: &str) -> Option<Element> {
    let _interned = wasm_bindgen::intern(selector);
    document().query_selector(selector).ok().flatten()
}

pub fn query_all(selector: &str) -> Vec<Element> {
    let _interned = wasm_bindgen::intern(selector);
    document()
        .query_selector_all(selector)
        .map(|list| {
            let mut out = Vec::with_capacity(list.length() as usize);
            for idx in 0..list.length() {
                if let Some(node) = list.get(idx) {
                    if let Ok(el) = node.dyn_into::<Element>() {
                        out.push(el);
                    }
                }
            }
            out
        })
        .unwrap_or_default()
}

pub fn set_text(selector: &str, text: &str) {
    if let Some(el) = query(selector) {
        el.set_text_content(Some(text));
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
        .map(|mql| mql.matches())
        .unwrap_or(false)
}

/// Toast via Popover API (Safari 26.2 top-layer, no z-index issues).
/// Phase 4.2: Use cached element (saves 2 DOM queries per notification)
pub fn toast(message: &str) {
    if let Some(el) = crate::state::get_cached_toast_element() {
        el.set_text_content(Some(message));
        let popover: &crate::bindings::PopoverElement = el.unchecked_ref();
        popover.show_popover();
        set_timeout_once(2400, || {
            if let Some(el) = crate::state::get_cached_toast_element() {
                let popover: &crate::bindings::PopoverElement = el.unchecked_ref();
                popover.hide_popover();
            }
        });
    }
}

// ── Trusted Types ──

use std::cell::RefCell;

thread_local! {
    static TT_POLICY: RefCell<Option<crate::bindings::TrustedTypePolicy>> = const { RefCell::new(None) };
}

pub fn init_trusted_types() {
    let window = window();
    let nav_win: &crate::bindings::NavigationWindow = window.unchecked_ref();
    let tt_factory: crate::bindings::TrustedTypePolicyFactory = nav_win.trusted_types().unchecked_into();

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

    // Register a `default` policy to cover third-party sinks (e.g. SQLite WASM
    // creating Workers internally). The default policy is a passthrough.
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
            // Typed via custom wasm_bindgen extern — zero Reflect calls
            let trusted_el: &crate::bindings::TrustedElement = el.unchecked_ref();
            trusted_el.set_inner_html_trusted(&trusted);
            return true;
        }
        false
    });
    if !used_tt {
        el.set_inner_html(html);
    }
}

/// Create a TrustedScriptURL for use with Worker constructors under Trusted Types.
/// Returns None if Trusted Types is not active (policy not initialized).
pub fn trusted_script_url(url: &str) -> Option<crate::bindings::TrustedScriptURL> {
    TT_POLICY.with(|cell| {
        let guard = cell.borrow();
        guard.as_ref().map(|policy| policy.create_script_url(url))
    })
}

// ── Focus management ──

pub fn active_element() -> Option<Element> {
    document().active_element()
}

pub fn focus_first(container: &Element) {
    let focusable = "button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex=\"-1\"])";
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

// ── Event helpers ──

pub fn on(target: &EventTarget, event: &str, handler: impl FnMut(Event) + 'static) {
    let cb = Closure::<dyn FnMut(Event)>::new(handler);
    let _ = target.add_event_listener_with_callback(event, cb.as_ref().unchecked_ref());
    cb.forget();
}

/// Register an event listener that is automatically removed when the AbortSignal fires.
/// The Closure is intentionally forgotten — the browser's signal-based removal handles cleanup.
/// When the AbortController aborts, the browser removes the listener AND releases the closure
/// reference, so the closure (and everything it captures) is eligible for GC.
pub fn on_with_signal(
    target: &EventTarget,
    event: &str,
    signal: &web_sys::AbortSignal,
    handler: impl FnMut(Event) + 'static,
) {
    let cb = Closure::<dyn FnMut(Event)>::new(handler);
    let opts = web_sys::AddEventListenerOptions::new();
    opts.set_signal(signal);
    let _ = target.add_event_listener_with_callback_and_add_event_listener_options(
        event,
        cb.as_ref().unchecked_ref(),
        &opts,
    );
    cb.forget();
}

/// Like `on_with_signal` but for PointerEvent handlers.
pub fn on_pointer_with_signal(
    target: &EventTarget,
    event: &str,
    signal: &web_sys::AbortSignal,
    handler: impl FnMut(web_sys::PointerEvent) + 'static,
) {
    let cb = Closure::<dyn FnMut(web_sys::PointerEvent)>::new(handler);
    let opts = web_sys::AddEventListenerOptions::new();
    opts.set_signal(signal);
    let _ = target.add_event_listener_with_callback_and_add_event_listener_options(
        event,
        cb.as_ref().unchecked_ref(),
        &opts,
    );
    cb.forget();
}

// ── Timer utilities ──

/// Fire-and-forget setTimeout — replaces `Closure::once + setTimeout + forget` boilerplate.
pub fn set_timeout_once(ms: i32, callback: impl FnOnce() + 'static) {
    let cb = Closure::once_into_js(callback);
    let _ = window().set_timeout_with_callback_and_timeout_and_arguments_0(
        cb.unchecked_ref(),
        ms,
    );
}

/// Cancelable setTimeout — returns timeout ID that can be cleared with window.clearTimeout()
pub fn set_timeout_cancelable(ms: i32, callback: impl FnOnce() + 'static) -> i32 {
    let cb = Closure::once_into_js(callback);
    window().set_timeout_with_callback_and_timeout_and_arguments_0(
        cb.unchecked_ref(),
        ms,
    ).unwrap_or(0)
}

/// Remove an element after `ms` milliseconds — replaces `spawn_local { sleep_ms(N).await; el.remove(); }`.
pub fn delayed_remove(el: Element, ms: i32) {
    set_timeout_once(ms, move || {
        el.remove();
    });
}

/// Remove a CSS class from an element after `ms` milliseconds.
pub fn delayed_class_remove(el: Element, class: &str, ms: i32) {
    let class = class.to_string();
    set_timeout_once(ms, move || {
        let _ = el.class_list().remove_1(&class);
    });
}

/// Dispatch a custom event on the document with optional detail data.
pub fn dispatch_custom_event(event_name: &str, detail: JsValue) {
    let init = CustomEventInit::new();
    init.set_detail(&detail);

    if let Ok(event) = CustomEvent::new_with_event_init_dict(event_name, &init) {
        let _ = document().dispatch_event(&event);
    }
}

/// Set an attribute on an element after `ms` milliseconds.
pub fn delayed_set_attr(el: Element, attr: &str, value: &str, ms: i32) {
    let attr = attr.to_string();
    let value = value.to_string();
    set_timeout_once(ms, move || {
        let _ = el.set_attribute(&attr, &value);
    });
}

// ── ARIA Live Regions ──

/// Announce a message to screen readers via a polite live region.
/// Creates or updates a global [data-aria-live] element for accessibility.
pub fn announce_live(message: &str) {
    let live_region = match query("[data-aria-live]") {
        Some(el) => el,
        None => {
            // Create live region on first use
            let doc = document();
            let region = doc.create_element("div").unwrap();
            let _ = region.set_attribute("data-aria-live", "");
            let _ = region.set_attribute("aria-live", "polite");
            let _ = region.set_attribute("aria-atomic", "true");
            let _ = region.set_attribute("class", "sr-only");
            if let Some(body) = query("body") {
                let _ = body.append_child(&region);
            }
            region
        }
    };

    live_region.set_text_content(Some(message));
}



//! Panel navigation via Navigation API + View Transitions (Safari 26.2).
//! 5 panels: home-scene, panel-tracker, panel-quests, panel-stories, panel-rewards.
//! The browser's Navigation API handles history + back/forward.
//! View Transitions API handles animation. Rust just connects them.

use wasm_bindgen::closure::Closure;
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;
use web_sys::{CustomEvent, CustomEventInit, Element, Event};

use crate::animations;
use crate::bindings;
use crate::constants::*;
use crate::dom;
use crate::speech;

use std::cell::RefCell;

/// Build `{panel: "..."}` as a JS object — replaces serde PanelState.
fn panel_state_js(panel_id: &str) -> JsValue {
    let obj = js_sys::Object::new();
    let _ = js_sys::Reflect::set(&obj, &"panel".into(), &panel_id.into());
    obj.into()
}

/// Extract `panel` field from a JS object — replaces serde PanelState deserialization.
fn panel_from_js(state: &JsValue) -> Option<String> {
    if state.is_null() || state.is_undefined() {
        return None;
    }
    js_sys::Reflect::get(state, &"panel".into())
        .ok()
        .and_then(|v| v.as_string())
}

/// Build `{state: {panel: "..."}, history: "push"}` — replaces serde NavigateOptions.
fn navigate_opts_js(panel_id: &str) -> JsValue {
    let obj = js_sys::Object::new();
    let _ = js_sys::Reflect::set(&obj, &"state".into(), &panel_state_js(panel_id));
    let _ = js_sys::Reflect::set(&obj, &"history".into(), &"push".into());
    obj.into()
}

thread_local! {
    static FOCUS_BEFORE_PANEL: RefCell<Option<Element>> = const { RefCell::new(None) };
}

// ── Init ──

pub fn init() {
    listen_navigate_event();
    listen_navigate_error();
    if !try_restore_current_entry() {
        // Replace current entry with state instead of pushing to avoid duplicate entries
        replace_panel_state(PANEL_HOME);
    }
    bind_panel_buttons();
}

// ── Navigation API listeners ──

fn listen_navigate_event() {
    let Some(nav) = get_navigation_object() else { return };
    dom::on(nav.as_ref(), "navigate", move |event: Event| {
        let Ok(nav_event) = event.dyn_into::<bindings::NavigateEvent>() else { return };
        if !nav_event.can_intercept() { return; }
        if !nav_event.download_request().is_null() && !nav_event.download_request().is_undefined() {
            return;
        }
        let nav_type = nav_event.navigation_type();
        let dest = nav_event.destination();
        let state = dest.get_state();
        let Some(panel) = panel_from_js(&state) else { return };

        if nav_type == "traverse" {
            let id = panel;
            let handler = Closure::<dyn FnMut()>::once(move || {
                apply_panel_transition(&id);
            });
            let opts = bindings::InterceptOptions::new();
            opts.set_handler(handler.as_ref().unchecked_ref());
            nav_event.intercept(opts.as_ref());
            handler.forget();
        }
    });
}

fn listen_navigate_error() {
    let Some(nav) = get_navigation_object() else { return };
    dom::on(nav.as_ref(), "navigateerror", move |event: Event| {
        let err_event: &bindings::NavigateErrorEvent = event.unchecked_ref();
        let message = err_event.message().unwrap_or_else(|| "unknown".into());
        web_sys::console::warn_1(&format!("[nav] error: {message}").into());
    });
}

// ── Programmatic navigation ──

fn push_panel_state(panel_id: &str) {
    let Some(nav) = get_navigation_object() else {
        // Fallback: use location.hash if Navigation API unavailable
        fallback_navigate_hash(panel_id);
        return;
    };
    let mut url = String::with_capacity(1 + panel_id.len());
    url.push('#');
    url.push_str(panel_id);

    // Phase 7: Wrap in try-catch pattern for error handling
    // If navigation fails (returns error), fall back to location.hash
    let result = nav.navigate(&url, &navigate_opts_js(panel_id));

    // Check if result indicates an error (JavaScript exceptions become JsValue errors)
    // In practice, Navigation API errors are caught by navigateerror event listener
    // This is defensive fallback in case of synchronous failures
    if result.is_undefined() || result.is_null() {
        web_sys::console::warn_1(&"[nav] Navigation API returned null/undefined, using fallback".into());
        fallback_navigate_hash(panel_id);
    }
}

/// Replace current entry's state without pushing a new history entry.
/// Used to add state to the initial page load without creating duplicates.
fn replace_panel_state(panel_id: &str) {
    let Some(nav) = get_navigation_object() else { return };
    let update_opts = js_sys::Object::new();
    let _ = js_sys::Reflect::set(&update_opts, &"state".into(), &panel_state_js(panel_id));
    nav.update_current_entry(&update_opts.into());
}

pub fn go_back() {
    let Some(nav) = get_navigation_object() else {
        close_panel_to_home();
        return;
    };
    if !nav.can_go_back() {
        close_panel_to_home();
        return;
    }
    let _ = nav.back();
}

fn try_restore_current_entry() -> bool {
    let Some(nav) = get_navigation_object() else { return false };
    let current = nav.current_entry();
    if current.is_null() || current.is_undefined() { return false; }
    let entry: bindings::NavigationHistoryEntry = match current.dyn_into() {
        Ok(e) => e,
        Err(_) => return false,
    };
    let state = entry.entry_get_state();
    match panel_from_js(&state) {
        Some(panel) if panel != "home-scene" => {
            apply_panel_transition(&panel);
            true
        }
        Some(_) => true,
        None => false,
    }
}

fn get_navigation_object() -> Option<bindings::Navigation> {
    let window = dom::window();
    let win: &bindings::NavigationWindow = window.unchecked_ref();
    win.navigation().dyn_into::<bindings::Navigation>().ok()
}

/// Fallback navigation using location.hash when Navigation API fails
fn fallback_navigate_hash(panel_id: &str) {
    let window = dom::window();
    let location = window.location();
    let mut hash = String::with_capacity(1 + panel_id.len());
    hash.push('#');
    hash.push_str(panel_id);
    let _ = location.set_hash(&hash);
}

// ── Button bindings (event delegation — 1 listener for all buttons) ──

fn bind_panel_buttons() {
    let doc = dom::document();
    let cb = Closure::<dyn FnMut(Event)>::new(move |event: Event| {
        let target = event.target().and_then(|t| t.dyn_into::<Element>().ok());
        let Some(el) = target else { return };

        if let Ok(Some(open_btn)) = el.closest(&format!("[{ATTR_PANEL_OPEN}]")) {
            if let Some(panel_id) = open_btn.get_attribute(ATTR_PANEL_OPEN) {
                open_panel(&panel_id);
            }
            return;
        }
        if let Ok(Some(close_btn)) = el.closest(&format!("[{ATTR_PANEL_CLOSE}]")) {
            if let Ok(Some(panel)) = close_btn.closest(SELECTOR_PANEL) {
                if let Some(id) = panel.get_attribute("id") {
                    close_panel(&id);
                }
            }
        }
    });
    let _ = doc.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
}

// ── Panel open / close ──

fn open_panel(panel_id: &str) {
    FOCUS_BEFORE_PANEL.with(|cell| {
        if let Ok(mut guard) = cell.try_borrow_mut() {
            *guard = dom::active_element();
        }
    });

    push_panel_state(panel_id);

    apply_panel_transition(panel_id);

    let id = panel_id.to_string();
    if let Some(panel) = dom::query(&format!("#{id}")) {
        dom::focus_first(&panel);
    }
}

fn close_panel(_panel_id: &str) {
    go_back();
}

fn close_panel_to_home() {
    with_view_transition(|| {
        // Hide all panels
        for panel in dom::query_all(SELECTOR_PANEL) {
            let _ = panel.set_attribute(ATTR_HIDDEN, "");
        }
        // Restore home hub (#app.home-scene)
        if let Some(home) = dom::query(SELECTOR_APP) {
            let _ = home.remove_attribute(ATTR_ARIA_HIDDEN);
            let _ = home.remove_attribute(ATTR_INERT);
            dom::set_dataset(&home, ATTR_ACTIVE_PANEL, PANEL_HOME);
        }
    });

    FOCUS_BEFORE_PANEL.with(|cell| {
        if let Some(el) = cell.try_borrow_mut().ok().and_then(|mut g| g.take()) {
            dom::focus_element(&el);
        }
    });
}

fn apply_panel_transition(panel_id: &str) {
    // Cancel any ongoing speech when navigating away
    speech::stop();

    // Phase 3 Optimization: Add will-change hint for GPU layer before View Transition
    // This allows browser to prepare compositor layer in advance for smoother animation
    if let Some(panel) = dom::query(&format!("[data-panel='{}']", panel_id)) {
        let _ = panel.class_list().add_1("transitioning");
    }

    // Phase 3: GPU particles now render during View Transitions (separate compositor layer)
    // No need to pause - will-change creates isolated layer avoiding contention

    let id = panel_id.to_string();
    let event_id = panel_id.to_string();

    dispatch_event(EVENT_PANEL_LEAVING, "target_panel", panel_id);

    with_view_transition(move || {
        let going_home = id == PANEL_HOME;

        // Show/hide panels
        for panel in dom::query_all(SELECTOR_PANEL) {
            let pid = panel.get_attribute("id").unwrap_or_default();
            if pid == id {
                let _ = panel.remove_attribute(ATTR_HIDDEN);
                let _ = panel.remove_attribute(ATTR_ARIA_HIDDEN);
                // Magic entrance animation for opening panel
                animations::magic_entrance(&panel);
            } else {
                let _ = panel.set_attribute(ATTR_HIDDEN, "");
            }
        }

        // Handle the home hub (#app is the home scene, not a .panel)
        if let Some(home) = dom::query(SELECTOR_APP) {
            if going_home {
                let _ = home.remove_attribute(ATTR_ARIA_HIDDEN);
                let _ = home.remove_attribute(ATTR_INERT);
            } else {
                let _ = home.set_attribute(ATTR_ARIA_HIDDEN, "true");
                let _ = home.set_attribute(ATTR_INERT, "");
            }
            dom::set_dataset(&home, ATTR_ACTIVE_PANEL, &id);
        }
    });

    // Phase 3: Remove will-change after View Transition completes (~300ms)
    // Avoids excessive GPU memory usage when animation is done
    let panel_id_cleanup = panel_id.to_string();
    crate::dom::set_timeout_once(350, move || {
        if let Some(panel) = dom::query(&format!("[data-panel='{}']", panel_id_cleanup)) {
            let _ = panel.class_list().remove_1("transitioning");
        }
    });

    dispatch_event(EVENT_PANEL_OPENED, "target_panel", &event_id);
}

fn dispatch_event(name: &str, key: &str, value: &str) {
    let init = CustomEventInit::new();
    let detail = js_sys::Object::new();
    let _ = js_sys::Reflect::set(&detail, &key.into(), &value.into());
    init.set_detail(&detail.into());
    if let Ok(event) = CustomEvent::new_with_event_init_dict(name, &init) {
        let _ = dom::document().dispatch_event(&event);
    }
}

// ── View Transition wrapper ──

pub fn with_view_transition<F: FnOnce() + 'static>(update: F) {
    use js_sys::Reflect;
    use wasm_bindgen::JsValue;

    let doc = dom::document();
    let cb = Closure::<dyn FnMut()>::once(update);

    // Safari 26.2 View Transitions API via reflection (web-sys bindings incomplete)
    if let Ok(start_vt) = Reflect::get(&doc, &JsValue::from_str("startViewTransition")) {
        if let Ok(func) = start_vt.dyn_into::<js_sys::Function>() {
            let _ = func.call1(&doc, cb.as_ref().unchecked_ref());
        }
    }

    cb.forget();
}

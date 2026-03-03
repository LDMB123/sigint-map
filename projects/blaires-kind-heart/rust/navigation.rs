use crate::bindings;
use crate::companion;
use crate::constants::*;
use crate::dom;
use crate::native_apis;
use crate::speech;
use crate::synth_audio;
use std::cell::{Cell, RefCell};
use std::fmt::Write;
use std::rc::Rc;
use wasm_bindgen::closure::Closure;
use wasm_bindgen::{JsCast, JsValue};
use web_sys::{Element, Event};
thread_local! {
    static LAST_NAV_MS: Cell<f64> = const { Cell::new(0.0) };
}
fn panel_state_js(panel_id: &str) -> JsValue {
    let obj = js_sys::Object::new();
    let _ = js_sys::Reflect::set(&obj, &"panel".into(), &panel_id.into());
    obj.into()
}
fn panel_from_js(state: &JsValue) -> Option<String> {
    if state.is_null() || state.is_undefined() {
        return None;
    }
    js_sys::Reflect::get(state, &"panel".into())
        .ok()
        .and_then(|v| v.as_string())
}
thread_local! {
    static FOCUS_BEFORE_PANEL: RefCell<Option<Element>> = const { RefCell::new(None) };
}
pub fn init() {
    listen_navigate_event();
    listen_navigate_error();
    if !try_restore_current_entry() && !try_restore_hash_panel() {
        replace_panel_state(PANEL_HOME);
    }
    bind_panel_buttons();
    bind_swipe_back();
}
fn listen_navigate_event() {
    let Some(nav) = get_navigation_object() else {
        return;
    };
    dom::on(nav.as_ref(), "navigate", move |event: Event| {
        let Ok(nav_event) = event.dyn_into::<bindings::NavigateEvent>() else {
            return;
        };
        if !nav_event.can_intercept() {
            return;
        }
        if !nav_event.download_request().is_null() && !nav_event.download_request().is_undefined() {
            return;
        }
        let nav_type = nav_event.navigation_type();
        let dest = nav_event.destination();
        let state = dest.get_state();
        let Some(panel) = panel_from_js(&state) else {
            return;
        };
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
    let Some(nav) = get_navigation_object() else {
        return;
    };
    dom::on(nav.as_ref(), "navigateerror", move |event: Event| {
        let err_event: &bindings::NavigateErrorEvent = event.unchecked_ref();
        let message = err_event.message().unwrap_or_else(|| "unknown".into());
        dom::warn(&format!("[nav] error: {message}"));
    });
}
fn push_panel_state(panel_id: &str) {
    let Some(nav) = get_navigation_object() else {
        fallback_navigate_hash(panel_id);
        return;
    };
    let opts = js_sys::Object::new();
    let _ = js_sys::Reflect::set(&opts, &"state".into(), &panel_state_js(panel_id));
    let _ = js_sys::Reflect::set(&opts, &"history".into(), &"push".into());
    let result = dom::with_buf(|buf| {
        let _ = write!(buf, "#{panel_id}");
        nav.navigate(buf, &opts.into())
    });
    if result.is_undefined() || result.is_null() {
        dom::warn("[nav] Navigation API returned null/undefined, using fallback");
        fallback_navigate_hash(panel_id);
    }
}
fn replace_panel_state(panel_id: &str) {
    let Some(nav) = get_navigation_object() else {
        return;
    };
    let update_opts = js_sys::Object::new();
    let _ = js_sys::Reflect::set(&update_opts, &"state".into(), &panel_state_js(panel_id));
    nav.update_current_entry(&update_opts.into());
}
fn go_back() {
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
    let Some(nav) = get_navigation_object() else {
        return false;
    };
    let current = nav.current_entry();
    if current.is_null() || current.is_undefined() {
        return false;
    }
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
fn try_restore_hash_panel() -> bool {
    let hash = dom::window().location().hash().unwrap_or_default();
    let panel_id = hash.trim_start_matches('#');
    if panel_id.is_empty() {
        return false;
    }
    let panel_exists = dom::with_buf(|buf| {
        let _ = write!(buf, "#{panel_id}.panel");
        dom::query(buf).is_some()
    });
    if !panel_exists {
        return false;
    }
    apply_panel_transition(panel_id);
    replace_panel_state(panel_id);
    true
}
fn get_navigation_object() -> Option<bindings::Navigation> {
    let window = dom::window();
    let win: &bindings::NavigationWindow = window.unchecked_ref();
    win.navigation().dyn_into::<bindings::Navigation>().ok()
}
fn fallback_navigate_hash(panel_id: &str) {
    let window = dom::window();
    let location = window.location();
    dom::with_buf(|buf| {
        let _ = write!(buf, "#{panel_id}");
        let _ = location.set_hash(buf);
    });
}
fn set_transition_direction(direction: &str) {
    if let Some(root) = dom::document().document_element() {
        dom::set_attr(&root, "data-transition", direction);
    }
}
fn bind_panel_buttons() {
    dom::on(
        dom::document().unchecked_ref(),
        "click",
        move |event: Event| {
            let Some(el) = dom::event_target_element(&event) else {
                return;
            };
            if dom::closest(&el, "[data-nav-home]").is_some() {
                close_panel_to_home();
                return;
            }
            if let Some(btn) = dom::closest(&el, "[data-nav-panel]") {
                if let Some(panel_id) = dom::get_attr(&btn, "data-nav-panel") {
                    close_panel_to_home();
                    let panel = panel_id;
                    dom::set_timeout_once(50, move || {
                        open_panel(&panel);
                    });
                    return;
                }
            }
            if let Some(open_btn) = dom::closest(&el, "[data-panel-open]") {
                if let Some(panel_id) = dom::get_attr(&open_btn, ATTR_PANEL_OPEN) {
                    // Debounce: ignore double-tap within 300ms to prevent duplicate history entries
                    let now = js_sys::Date::now();
                    let last = LAST_NAV_MS.with(|c| c.get());
                    if now - last >= 300.0 {
                        LAST_NAV_MS.with(|c| c.set(now));
                        open_panel(&panel_id);
                    }
                }
                return;
            }
            if let Some(close_btn) = dom::closest(&el, "[data-panel-close]") {
                if let Some(panel) = dom::closest(&close_btn, SELECTOR_PANEL) {
                    if dom::get_attr(&panel, "id").is_some() {
                        go_back();
                    }
                }
                return;
            }
            if let Some(tab_btn) = dom::closest(&el, "[data-tab]") {
                if let Some(tab_id) = dom::get_attr(&tab_btn, "data-tab") {
                    switch_tab(&tab_btn, &tab_id);
                }
            }
        },
    );
}
fn switch_tab(clicked_btn: &Element, tab_id: &str) {
    let Some(panel_body) = dom::closest(clicked_btn, ".panel-body--tabs") else {
        return;
    };
    if let Ok(tabs) = panel_body.query_selector_all("[data-tab]") {
        for i in 0..tabs.length() {
            if let Some(btn) = tabs.item(i) {
                if let Some(el) = btn.dyn_ref::<Element>() {
                    dom::set_attr(el, "aria-selected", "false");
                    let _ = el.class_list().remove_1("tab-btn--active");
                }
            }
        }
    }
    dom::set_attr(clicked_btn, "aria-selected", "true");
    let _ = clicked_btn.class_list().add_1("tab-btn--active");
    if let Ok(contents) = panel_body.query_selector_all("[data-tab-content]") {
        for i in 0..contents.length() {
            if let Some(content) = contents.item(i) {
                if let Some(el) = content.dyn_ref::<Element>() {
                    if dom::get_attr(el, "data-tab-content").as_deref() == Some(tab_id) {
                        dom::remove_attr(el, "hidden");
                    } else {
                        dom::set_attr(el, ATTR_HIDDEN, "");
                    }
                }
            }
        }
    }
}
fn play_panel_sound(panel_id: &str) {
    match panel_id {
        "panel-tracker" => synth_audio::gentle(),
        "panel-quests" => synth_audio::fanfare(),
        "panel-stories" => synth_audio::dreamy(),
        "panel-rewards" => synth_audio::sparkle(),
        "panel-gardens" => synth_audio::gentle(),
        "panel-games" => synth_audio::chime(),
        "panel-adventures" => synth_audio::magic_wand(),
        "panel-mystuff" => synth_audio::sparkle(),
        _ => {}
    }
}
fn narrate_panel(panel_id: &str) {
    let phrase = match panel_id {
        "panel-tracker" => "Be Kind!",
        "panel-adventures" => "Adventures!",
        "panel-mystuff" => "My Stuff!",
        "panel-quests" => "Let's do a quest!",
        "panel-stories" => "Story time!",
        "panel-games" => "Let's play!",
        "panel-rewards" => "Your stickers!",
        "panel-gardens" => "Your gardens!",
        _ => return,
    };
    speech::speak(phrase);
}
pub fn open_panel(panel_id: &str) {
    set_transition_direction("forward");
    FOCUS_BEFORE_PANEL.with(|cell| {
        if let Ok(mut guard) = cell.try_borrow_mut() {
            *guard = dom::active_element();
        }
    });
    push_panel_state(panel_id);
    apply_panel_transition(panel_id);
    play_panel_sound(panel_id);
    native_apis::vibrate_tap();
    narrate_panel(panel_id);
    companion::check_first_visit(panel_id);
    dom::with_buf(|buf| {
        let _ = write!(buf, "#{panel_id}");
        if let Some(panel) = dom::query(buf) {
            dom::focus_first(&panel);
        }
    });
}
pub fn close_panel_to_home() {
    set_transition_direction("back");
    native_apis::vibrate_tap();
    with_view_transition(|| {
        dom::for_each_match(SELECTOR_PANEL, |panel| {
            dom::set_attr(&panel, ATTR_HIDDEN, "");
        });
        if let Some(home) = dom::query(SELECTOR_APP) {
            dom::remove_attr(&home, ATTR_ARIA_HIDDEN);
            dom::remove_attr(&home, ATTR_INERT);
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
    speech::stop();
    dom::with_buf(|buf| {
        let _ = write!(buf, "[data-panel='{panel_id}']");
        if let Some(panel) = dom::query(buf) {
            let _ = panel.class_list().add_1("transitioning");
        }
    });
    let id = panel_id.to_string();
    dom::dispatch_kv_event(EVENT_PANEL_LEAVING, "target_panel", panel_id);
    with_view_transition(move || {
        let going_home = id == PANEL_HOME;
        dom::for_each_match(SELECTOR_PANEL, |panel| {
            if dom::get_attr(&panel, "id").unwrap_or_default() == id {
                dom::remove_attr(&panel, ATTR_HIDDEN);
                dom::remove_attr(&panel, ATTR_ARIA_HIDDEN);
            } else {
                dom::set_attr(&panel, ATTR_HIDDEN, "");
            }
        });
        if let Some(home) = dom::query(SELECTOR_APP) {
            if going_home {
                dom::remove_attr(&home, ATTR_ARIA_HIDDEN);
                dom::remove_attr(&home, ATTR_INERT);
            } else {
                dom::set_attr(&home, ATTR_ARIA_HIDDEN, "true");
                dom::set_attr(&home, ATTR_INERT, "");
            }
            dom::set_dataset(&home, ATTR_ACTIVE_PANEL, &id);
        }
    });
    let panel_id_cleanup = panel_id.to_string();
    crate::dom::set_timeout_once(350, move || {
        dom::with_buf(|buf| {
            let _ = write!(buf, "[data-panel='{panel_id_cleanup}']");
            if let Some(panel) = dom::query(buf) {
                let _ = panel.class_list().remove_1("transitioning");
            }
        });
    });
    dom::dispatch_kv_event(EVENT_PANEL_OPENED, "target_panel", panel_id);
}
fn bind_swipe_back() {
    let start_x: Rc<RefCell<Option<f64>>> = Rc::new(RefCell::new(None));
    let start_y: Rc<RefCell<Option<f64>>> = Rc::new(RefCell::new(None));

    let sx = start_x.clone();
    let sy = start_y.clone();
    let touchstart = Closure::<dyn Fn(web_sys::TouchEvent)>::new(move |e: web_sys::TouchEvent| {
        if let Some(touch) = e.touches().get(0) {
            let x = f64::from(touch.client_x());
            if x < 30.0 {
                *sx.borrow_mut() = Some(x);
                *sy.borrow_mut() = Some(f64::from(touch.client_y()));
            } else {
                *sx.borrow_mut() = None;
            }
        }
    });

    let sx2 = start_x;
    let sy2 = start_y;
    let touchend = Closure::<dyn Fn(web_sys::TouchEvent)>::new(move |e: web_sys::TouchEvent| {
        let Some(start) = *sx2.borrow() else { return };
        let Some(start_vert) = *sy2.borrow() else {
            return;
        };
        if let Some(touch) = e.changed_touches().get(0) {
            let dx = f64::from(touch.client_x()) - start;
            let dy = (f64::from(touch.client_y()) - start_vert).abs();
            if dx > 80.0 && dy < dx * 0.5 {
                go_back();
            }
        }
        *sx2.borrow_mut() = None;
    });

    let doc = dom::document();
    let _ = doc.add_event_listener_with_callback("touchstart", touchstart.as_ref().unchecked_ref());
    let _ = doc.add_event_listener_with_callback("touchend", touchend.as_ref().unchecked_ref());
    touchstart.forget();
    touchend.forget();
}
pub fn with_view_transition<F: FnOnce() + 'static>(update: F) {
    use js_sys::Reflect;
    use wasm_bindgen::JsValue;
    let doc = dom::document();
    let vt_func = Reflect::get(&doc, &JsValue::from_str("startViewTransition"))
        .ok()
        .and_then(|v| v.dyn_into::<js_sys::Function>().ok());

    match vt_func {
        Some(func) => {
            let cb = Closure::<dyn FnMut()>::once(update);
            let result = func.call1(&doc, cb.as_ref().unchecked_ref());
            if result.is_err() {
                // If startViewTransition throws (e.g. already active), run update manually
                crate::dom::warn("View transition skipped (already active or failed), applying update immediately.");
                if let Ok(js_cb) = cb.into_js_value().dyn_into::<js_sys::Function>() {
                    let _ = js_cb.call0(&js_sys::global());
                }
            } else {
                cb.forget();
            }
        }
        None => {
            update();
        }
    }
}

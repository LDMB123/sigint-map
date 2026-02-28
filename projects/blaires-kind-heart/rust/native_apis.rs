use crate::dom;
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;
use wasm_bindgen_futures::JsFuture;
pub fn set_app_badge(count: u32) {
    let nav = dom::window().navigator();
    let badge_nav: &crate::bindings::BadgeNavigator = nav.unchecked_ref();
    let _ = badge_nav.set_app_badge(count);
}
use std::cell::{Cell, RefCell};
thread_local! { static WAKE_LOCK: RefCell<Option<JsValue>> = const { RefCell::new(None) }; static HAPTIC_UNLOCKED: Cell<bool> = const { Cell::new(false) }; static HAPTIC_LISTENERS_BOUND: Cell<bool> = const { Cell::new(false) }; }
pub async fn request_wake_lock() -> bool {
    use js_sys::Reflect;
    let nav = dom::window().navigator();
    let Ok(wake_lock) = Reflect::get(&nav, &JsValue::from_str("wakeLock")) else {
        return false;
    };
    let Ok(request_fn) = Reflect::get(&wake_lock, &JsValue::from_str("request")) else {
        return false;
    };
    let Ok(request_fn) = request_fn.dyn_into::<js_sys::Function>() else {
        return false;
    };
    let Ok(promise) = request_fn.call1(&wake_lock, &JsValue::from_str("screen")) else {
        return false;
    };
    match JsFuture::from(js_sys::Promise::from(promise)).await {
        Ok(sentinel_val) => {
            WAKE_LOCK.with(|cell| {
                *cell.borrow_mut() = Some(sentinel_val);
            });
            true
        }
        Err(_) => false,
    }
}
pub async fn release_wake_lock() {
    use js_sys::Reflect;
    let sentinel = WAKE_LOCK.with(|cell| cell.borrow_mut().take());
    if let Some(s) = sentinel {
        if let Ok(release_fn) = Reflect::get(&s, &JsValue::from_str("release")) {
            if let Ok(func) = release_fn.dyn_into::<js_sys::Function>() {
                if let Ok(promise) = func.call0(&s) {
                    let _ = JsFuture::from(js_sys::Promise::from(promise)).await;
                }
            }
        }
    }
}
pub async fn share(title: &str, text: &str) -> bool {
    let nav = dom::window().navigator();
    let share_data = web_sys::ShareData::new();
    share_data.set_title(title);
    share_data.set_text(text);
    if !nav.can_share_with_data(&share_data) {
        return false;
    }
    let promise = nav.share_with_data(&share_data);
    JsFuture::from(promise).await.is_ok()
}
pub fn can_share() -> bool {
    dom::window().navigator().can_share()
}
pub fn init_haptics() {
    ensure_haptic_unlock_listener();
}
pub fn vibrate_tap() {
    vibrate(&[10]);
}
pub fn vibrate_success() {
    vibrate(&[30, 50, 30]);
}
pub fn vibrate_celebration() {
    vibrate(&[50, 30, 50, 30, 100]);
}
fn mark_haptics_unlocked() {
    HAPTIC_UNLOCKED.with(|flag| flag.set(true));
}
fn ensure_haptic_unlock_listener() {
    HAPTIC_LISTENERS_BOUND.with(|bound| {
        if bound.get() {
            return;
        }
        bound.set(true);
        let document = dom::document();
        let target: &web_sys::EventTarget = document.as_ref();
        for event_name in ["pointerdown", "touchstart", "mousedown", "keydown"] {
            let cb = wasm_bindgen::closure::Closure::<dyn FnMut(web_sys::Event)>::new(
                |_: web_sys::Event| {
                    mark_haptics_unlocked();
                },
            );
            let _ =
                target.add_event_listener_with_callback(event_name, cb.as_ref().unchecked_ref());
            cb.forget();
        }
    });
}
fn is_automation_env(nav: &web_sys::Navigator) -> bool {
    let is_webdriver = js_sys::Reflect::get(nav.as_ref(), &JsValue::from_str("webdriver"))
        .ok()
        .and_then(|value| value.as_bool())
        .unwrap_or(false);
    if is_webdriver {
        return true;
    }
    nav.user_agent()
        .ok()
        .is_some_and(|ua| ua.contains("HeadlessChrome"))
}
fn can_vibrate(nav: &web_sys::Navigator) -> bool {
    if is_automation_env(nav) {
        return false;
    }
    ensure_haptic_unlock_listener();
    HAPTIC_UNLOCKED.with(|flag| flag.get())
}
fn vibrate(pattern: &[u32]) {
    let nav = dom::window().navigator();
    if !can_vibrate(&nav) {
        return;
    }
    let arr = js_sys::Array::new();
    for &ms in pattern {
        arr.push(&JsValue::from_f64(f64::from(ms)));
    }
    nav.vibrate_with_pattern(&arr);
}
pub fn request_animation_frame(callback: &wasm_bindgen::closure::Closure<dyn FnMut(f64)>) -> i32 {
    dom::window()
        .request_animation_frame(callback.as_ref().unchecked_ref())
        .unwrap_or(0)
}
pub fn cancel_animation_frame(id: i32) {
    let _ = dom::window().cancel_animation_frame(id);
}

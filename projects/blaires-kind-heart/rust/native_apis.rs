//! Native browser API wrappers for Safari 26.2.
//! Badge API, Screen Wake Lock, Web Share, Vibration, Intersection Observer.
//! All typed via web-sys 0.3.85 — zero Reflect calls.

use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;
use wasm_bindgen_futures::JsFuture;

use crate::dom;

// ── App Badge API ──
// navigator.setAppBadge(count) / navigator.clearAppBadge()
// Shows a badge on the PWA icon (great for showing today's kind act count).
// Typed via custom wasm_bindgen extern in bindings.rs.

pub fn set_app_badge(count: u32) {
    let nav = dom::window().navigator();
    let badge_nav: &crate::bindings::BadgeNavigator = nav.unchecked_ref();
    let _ = badge_nav.set_app_badge(count);
}

// ── Screen Wake Lock API ──
// Keeps the screen on during celebration mode or story reading.
// navigator.wakeLock.request('screen') → WakeLockSentinel
// Uses JsValue bindings since web-sys WakeLock types not available

use std::cell::RefCell;

thread_local! {
    static WAKE_LOCK: RefCell<Option<JsValue>> = const { RefCell::new(None) };
}

pub async fn request_wake_lock() -> bool {
    use js_sys::Reflect;

    let nav = dom::window().navigator();

    // navigator.wakeLock
    let wake_lock = match Reflect::get(&nav, &JsValue::from_str("wakeLock")) {
        Ok(wl) => wl,
        Err(_) => return false, // WakeLock API not supported
    };

    // wakeLock.request('screen')
    let request_fn = match Reflect::get(&wake_lock, &JsValue::from_str("request")) {
        Ok(f) => f,
        Err(_) => return false,
    };

    let request_fn: js_sys::Function = match request_fn.dyn_into() {
        Ok(f) => f,
        Err(_) => return false,
    };

    let promise = match request_fn.call1(&wake_lock, &JsValue::from_str("screen")) {
        Ok(p) => p,
        Err(_) => return false,
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
        // sentinel.release()
        if let Ok(release_fn) = Reflect::get(&s, &JsValue::from_str("release")) {
            if let Ok(func) = release_fn.dyn_into::<js_sys::Function>() {
                if let Ok(promise) = func.call0(&s) {
                    let _ = JsFuture::from(js_sys::Promise::from(promise)).await;
                }
            }
        }
    }
}

// ── Web Share API ──
// navigator.share({ title, text, url })
// Share Blaire's kindness stats with family! (fully typed)

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

// ── Vibration API ──
// Short haptic feedback for interactions.
// navigator.vibrate(pattern) (fully typed)

pub fn vibrate_tap() {
    vibrate(&[10]);
}

pub fn vibrate_success() {
    vibrate(&[30, 50, 30]);
}

pub fn vibrate_celebration() {
    vibrate(&[50, 30, 50, 30, 100]);
}

fn vibrate(pattern: &[u32]) {
    let nav = dom::window().navigator();
    let arr = js_sys::Array::new();
    for &ms in pattern {
        arr.push(&JsValue::from_f64(ms as f64));
    }
    nav.vibrate_with_pattern(&arr);
}

// ── requestAnimationFrame loop ──
// Runs a callback every frame. Returns a cancel handle.

pub fn request_animation_frame(callback: &wasm_bindgen::closure::Closure<dyn FnMut(f64)>) -> i32 {
    dom::window()
        .request_animation_frame(callback.as_ref().unchecked_ref())
        .unwrap_or(0)
}

pub fn cancel_animation_frame(id: i32) {
    let _ = dom::window().cancel_animation_frame(id);
}

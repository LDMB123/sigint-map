//! PWA setup — Service Worker registration + storage quota check.
//! Let the platform handle caching. We just register and monitor.

use wasm_bindgen::JsCast;
use wasm_bindgen_futures::JsFuture;

use crate::{dom, storage_pressure};

pub fn init() {
    register_service_worker();
    wasm_bindgen_futures::spawn_local(async {
        request_persistent_storage().await;
        storage_pressure::warn_if_low().await;
    });
}

fn register_service_worker() {
    let window = dom::window();
    let navigator = window.navigator();
    let sw_container = navigator.service_worker();
    let promise = sw_container.register("./sw.js");
    wasm_bindgen_futures::spawn_local(async move {
        match JsFuture::from(promise).await {
            Ok(reg_val) => {
                web_sys::console::log_1(&"[pwa] SW registered".into());
                // Detect waiting SW and prompt user to update
                if let Ok(reg) = reg_val.dyn_into::<web_sys::ServiceWorkerRegistration>() {
                    detect_sw_update(&reg);
                }
            }
            Err(e) => web_sys::console::warn_1(&format!("[pwa] SW failed: {:?}", e).into()),
        }
    });
}

/// Listen for a new SW waiting and show an update toast.
/// When the user taps the toast, send SKIP_WAITING to the new SW.
fn detect_sw_update(reg: &web_sys::ServiceWorkerRegistration) {
    use wasm_bindgen::closure::Closure;

    // If there's already a waiting SW (e.g. from a previous visit)
    if reg.waiting().is_some() {
        show_update_prompt(reg);
        return;
    }

    // Listen for new installing SW
    let reg_clone = reg.clone();
    let on_update = Closure::<dyn FnMut()>::new(move || {
        if let Some(installing) = reg_clone.installing() {
            let reg_inner = reg_clone.clone();
            let on_state = Closure::<dyn FnMut()>::new(move || {
                if reg_inner.waiting().is_some() {
                    show_update_prompt(&reg_inner);
                }
            });
            installing.set_onstatechange(Some(on_state.as_ref().unchecked_ref()));
            on_state.forget();
        }
    });
    reg.set_onupdatefound(Some(on_update.as_ref().unchecked_ref()));
    on_update.forget();
}

fn show_update_prompt(reg: &web_sys::ServiceWorkerRegistration) {
    use wasm_bindgen::closure::Closure;

    // Show a toast prompting the user to update
    dom::toast("\u{1F31F} Update available! Tap to refresh");

    // Also listen for clicks on the toast to trigger update
    if let Some(toast_el) = dom::query("[data-toast]") {
        let reg_clone = reg.clone();
        let cb = Closure::<dyn FnMut(web_sys::Event)>::once(move |_: web_sys::Event| {
            if let Some(waiting) = reg_clone.waiting() {
                let _ = waiting.post_message(&wasm_bindgen::JsValue::from_str("{\"type\":\"SKIP_WAITING\"}"));
            }
            // Reload once the new SW takes over
            let _ = dom::window().location().reload();
        });
        let _ = toast_el.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
        cb.forget();
    }
}

/// Request persistent storage so Safari doesn't evict our SQLite OPFS data.
/// iPadOS may still deny the request (e.g. if not installed as PWA), but asking is free.
async fn request_persistent_storage() {
    let navigator = dom::window().navigator();
    let storage = navigator.storage();
    let Ok(promise) = storage.persist() else {
        web_sys::console::warn_1(&"[pwa] navigator.storage.persist() not available".into());
        return;
    };
    match JsFuture::from(promise).await {
        Ok(val) => {
            let granted = val.as_bool().unwrap_or(false);
            if granted {
                web_sys::console::log_1(&"[pwa] Persistent storage granted".into());
            } else {
                web_sys::console::log_1(&"[pwa] Persistent storage denied (non-fatal)".into());
            }
        }
        Err(_) => {
            web_sys::console::warn_1(&"[pwa] navigator.storage.persist() failed".into());
        }
    }
}


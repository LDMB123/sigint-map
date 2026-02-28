use crate::{dom, storage_pressure};
use wasm_bindgen::JsCast;
use wasm_bindgen_futures::JsFuture;
pub fn init() {
    register_service_worker();
    crate::browser_apis::spawn_local_logged("pwa-init", async {
        request_persistent_storage().await;
        storage_pressure::warn_if_low().await;
        Ok(())
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
                dom::warn("[pwa] SW registered");
                if let Ok(reg) = reg_val.dyn_into::<web_sys::ServiceWorkerRegistration>() {
                    detect_sw_update(&reg);
                }
            }
            Err(e) => dom::warn(&format!("[pwa] SW failed: {e:?}")),
        }
    });
}
fn detect_sw_update(reg: &web_sys::ServiceWorkerRegistration) {
    use wasm_bindgen::closure::Closure;
    if reg.waiting().is_some() {
        show_update_prompt(reg);
        return;
    }
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
fn post_skip_waiting(waiting: &web_sys::ServiceWorker) {
    let msg = js_sys::Object::new();
    let _ = js_sys::Reflect::set(
        &msg,
        &wasm_bindgen::JsValue::from_str("type"),
        &wasm_bindgen::JsValue::from_str("SKIP_WAITING"),
    );
    let _ = waiting.post_message(&msg);
}
fn show_update_prompt(reg: &web_sys::ServiceWorkerRegistration) {
    use wasm_bindgen::closure::Closure;
    dom::toast("\u{1F31F} Update available! Tap to refresh");
    if let Some(toast_el) = dom::query("[data-toast]") {
        let reg_clone = reg.clone();
        let cb = Closure::<dyn FnMut(web_sys::Event)>::once(move |_: web_sys::Event| {
            let game_active =
                dom::query("#game-arena").is_some_and(|el| !dom::has_attr(&el, "hidden"));
            let story_active = dom::query(".story-reader").is_some();
            if game_active || story_active {
                dom::toast("Update will install after you finish playing!");
                let reg_deferred = reg_clone.clone();
                dom::set_timeout_once(30_000, move || {
                    show_update_prompt_force(&reg_deferred);
                });
                return;
            }
            if let Some(waiting) = reg_clone.waiting() {
                post_skip_waiting(&waiting);
            }
            let _ = dom::window().location().reload();
        });
        let _ = toast_el.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
        cb.forget();
    }
}
fn show_update_prompt_force(reg: &web_sys::ServiceWorkerRegistration) {
    use wasm_bindgen::closure::Closure;
    dom::toast("\u{1F31F} Update ready! Tap to refresh now");
    if let Some(toast_el) = dom::query("[data-toast]") {
        let reg_clone = reg.clone();
        let cb = Closure::<dyn FnMut(web_sys::Event)>::once(move |_: web_sys::Event| {
            if let Some(waiting) = reg_clone.waiting() {
                post_skip_waiting(&waiting);
            }
            let _ = dom::window().location().reload();
        });
        let _ = toast_el.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
        cb.forget();
    }
}
async fn request_persistent_storage() {
    let navigator = dom::window().navigator();
    let storage = navigator.storage();
    let Ok(promise) = storage.persist() else {
        dom::warn("[pwa] navigator.storage.persist() not available");
        return;
    };
    match JsFuture::from(promise).await {
        Ok(val) => {
            let granted = val.as_bool().unwrap_or(false);
            if granted {
                dom::warn("[pwa] Persistent storage granted");
            } else {
                dom::warn("[pwa] Persistent storage denied (non-fatal)");
            }
        }
        Err(_) => {
            dom::warn("[pwa] navigator.storage.persist() failed");
        }
    }
}

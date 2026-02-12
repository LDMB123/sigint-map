//! Gesture detection for debug panel activation.
//! Triple-tap anywhere on screen → toggle debug panel.

use std::cell::RefCell;
use wasm_bindgen::closure::Closure;
use wasm_bindgen::{JsCast, UnwrapThrowExt};
use web_sys::PointerEvent;
use crate::{browser_apis, dom};

thread_local! {
    static TAP_TIMES: RefCell<Vec<f64>> = const { RefCell::new(Vec::new()) };
}

/// Setup triple-tap gesture detector on document.
/// Activates debug panel when user taps 3 times within 1 second.
pub fn setup_debug_gesture() {
    let closure = Closure::wrap(Box::new(move |event: PointerEvent| {
        // Only trigger on touchend/pointerup (not mouse move)
        if event.pointer_type() != "touch" && event.pointer_type() != "pen" {
            return;
        }

        let now = browser_apis::now_ms();

        TAP_TIMES.with(|times| {
            let mut tap_times = times.borrow_mut();

            // Add current tap
            tap_times.push(now);

            // Remove taps older than 1 second
            tap_times.retain(|&t| now - t < 1000.0);

            // Check for triple-tap
            if tap_times.len() >= 3 {
                web_sys::console::log_1(&"[gestures] Triple-tap detected - toggling debug panel".into());
                #[cfg(debug_assertions)]
                crate::debug::toggle();
                tap_times.clear();
            }
        });
    }) as Box<dyn FnMut(_)>);

    dom::document()
        .add_event_listener_with_callback("pointerup", closure.as_ref().unchecked_ref())
        .unwrap_throw();

    closure.forget();
}

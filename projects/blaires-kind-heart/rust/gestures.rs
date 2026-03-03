use crate::{browser_apis, dom};
use std::cell::RefCell;
use wasm_bindgen::closure::Closure;
use wasm_bindgen::{JsCast, UnwrapThrowExt};
use web_sys::PointerEvent;
thread_local! {
    static TAP_TIMES: RefCell<Vec<f64>> = const { RefCell::new(Vec::new()) };
}
pub fn setup_debug_gesture() {
    let closure = Closure::wrap(Box::new(move |event: PointerEvent| {
        if event.pointer_type() != "touch" && event.pointer_type() != "pen" {
            return;
        }
        let now = browser_apis::now_ms();
        TAP_TIMES.with(|times| {
            let mut tap_times = times.borrow_mut();
            tap_times.push(now);
            tap_times.retain(|&t| now - t < 1000.0);
            if tap_times.len() >= 3 {
                #[cfg(debug_assertions)]
                {
                    web_sys::console::log_1(
                        &"[gestures] Triple-tap detected - toggling debug panel".into(),
                    );
                    crate::debug::toggle();
                }
                tap_times.clear();
            }
        });
    }) as Box<dyn FnMut(_)>);
    dom::document()
        .add_event_listener_with_callback("pointerup", closure.as_ref().unchecked_ref())
        .unwrap_throw();
    closure.forget();
}

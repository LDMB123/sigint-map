//! Page Visibility API integration
//! Pauses CSS animations and reduces GPU load when tab is hidden

use wasm_bindgen::prelude::*;
use web_sys::{Document, HtmlElement};

/// Initialize Page Visibility API listener
/// Pauses animations when tab hidden, resumes when visible
pub fn init() {
    let window = crate::dom::window();
    let Some(document) = window.document() else { return };

    // Set initial state
    update_animation_state(&document);

    // Listen for visibility changes
    let closure = Closure::wrap(Box::new(move |_: web_sys::Event| {
        if let Some(doc) = crate::dom::window().document() {
            update_animation_state(&doc);
        }
    }) as Box<dyn FnMut(_)>);

    let _ = document.add_event_listener_with_callback(
        "visibilitychange",
        closure.as_ref().unchecked_ref()
    );
    closure.forget(); // Keep listener alive
}

/// Update animation play state based on document visibility
fn update_animation_state(document: &Document) {
    let is_hidden = document.hidden();

    if let Some(body) = document.body() {
        let html_body: &HtmlElement = body.unchecked_ref();

        if is_hidden {
            // Pause all animations when hidden
            let _ = html_body.set_attribute("data-animations-paused", "true");
        } else {
            // Resume animations when visible
            let _ = html_body.remove_attribute("data-animations-paused");
        }
    }
}

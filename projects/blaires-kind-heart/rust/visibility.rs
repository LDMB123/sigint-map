use crate::dom;
use wasm_bindgen::prelude::*;
use web_sys::{Document, HtmlElement};
pub fn init() {
    let window = crate::dom::window();
    let Some(document) = window.document() else {
        return;
    };
    update_animation_state(&document);
    let closure = Closure::wrap(Box::new(move |_: web_sys::Event| {
        if let Some(doc) = crate::dom::window().document() {
            update_animation_state(&doc);
        }
    }) as Box<dyn FnMut(_)>);
    let _ = document
        .add_event_listener_with_callback("visibilitychange", closure.as_ref().unchecked_ref());
    closure.forget();
}
fn update_animation_state(document: &Document) {
    let is_hidden = document.hidden();
    if let Some(body) = document.body() {
        let html_body: &HtmlElement = body.unchecked_ref();
        if is_hidden {
            dom::set_attr(html_body, "data-animations-paused", "true");
        } else {
            dom::remove_attr(html_body.as_ref(), "data-animations-paused");
        }
    }
}

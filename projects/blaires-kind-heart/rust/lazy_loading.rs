//! IntersectionObserver-based lazy loading for heavy image assets
//! Delays loading of off-screen garden images until they scroll into view

use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;
use web_sys::{IntersectionObserver, IntersectionObserverEntry, IntersectionObserverInit};

/// Initialize lazy loading for garden cards using IntersectionObserver
pub fn init_gardens() {
    let window = crate::dom::window();
    let Some(document) = window.document() else { return };

    // Configure observer: load when card is 200px from viewport
    let options = IntersectionObserverInit::new();
    options.set_root_margin("200px");

    // Callback: load image when card enters viewport
    let callback = Closure::wrap(Box::new(move |entries: Vec<IntersectionObserverEntry>, _observer: IntersectionObserver| {
        for entry in entries {
            if entry.is_intersecting() {
                if let Ok(target) = entry.target().dyn_into::<web_sys::HtmlElement>() {
                    // Find img element inside card
                    if let Some(img) = target.query_selector("[data-lazy-src]").ok().flatten() {
                        if let Ok(img_el) = img.dyn_into::<web_sys::HtmlImageElement>() {
                            // Move data-lazy-src to src to trigger load
                            if let Some(src) = img_el.get_attribute("data-lazy-src") {
                                let _ = img_el.set_attribute("src", &src);
                                let _ = img_el.remove_attribute("data-lazy-src");
                            }
                        }
                    }
                }
            }
        }
    }) as Box<dyn FnMut(Vec<IntersectionObserverEntry>, IntersectionObserver)>);

    let Ok(observer) = IntersectionObserver::new_with_options(
        callback.as_ref().unchecked_ref(),
        &options
    ) else { return };

    // Observe all garden cards
    let cards = document.query_selector_all("[data-garden-card]").ok();
    if let Some(cards) = cards {
        for i in 0..cards.length() {
            if let Some(card) = cards.get(i) {
                if let Some(element) = card.dyn_ref::<web_sys::Element>() {
                    observer.observe(element);
                }
            }
        }
    }

    callback.forget(); // Keep callback alive
}

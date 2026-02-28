use crate::dom;
use wasm_bindgen::closure::Closure;
use wasm_bindgen::JsCast;
use web_sys::{IntersectionObserver, IntersectionObserverEntry, IntersectionObserverInit};
pub fn init_gardens() {
    let options = IntersectionObserverInit::new();
    options.set_root_margin("200px");
    let callback = Closure::wrap(Box::new(
        move |entries: Vec<IntersectionObserverEntry>, _: IntersectionObserver| {
            for entry in entries {
                if !entry.is_intersecting() {
                    continue;
                }
                let Ok(target) = entry.target().dyn_into::<web_sys::HtmlElement>() else {
                    continue;
                };
                let Some(img) = dom::query_in(target.as_ref(), "[data-lazy-src]") else {
                    continue;
                };
                let Ok(img_el) = img.dyn_into::<web_sys::HtmlImageElement>() else {
                    continue;
                };
                if let Some(src) = dom::get_attr(img_el.as_ref(), "data-lazy-src") {
                    dom::set_attr(img_el.as_ref(), "src", &src);
                    dom::remove_attr(img_el.as_ref(), "data-lazy-src");
                }
            }
        },
    )
        as Box<dyn FnMut(Vec<IntersectionObserverEntry>, IntersectionObserver)>);
    let Ok(observer) =
        IntersectionObserver::new_with_options(callback.as_ref().unchecked_ref(), &options)
    else {
        return;
    };
    for card in dom::query_all("[data-garden-card]") {
        observer.observe(&card);
    }
    callback.forget();
}

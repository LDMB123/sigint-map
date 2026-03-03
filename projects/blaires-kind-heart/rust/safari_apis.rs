use crate::dom;
use wasm_bindgen::JsCast;
use web_sys::{Element, HtmlElement};

fn set_scrollbar_theme(el: &Element, thumb_color: &str, track_color: &str) {
    if let Some(html) = el.dyn_ref::<HtmlElement>() {
        let style = html.style();
        let _ = style.set_property("scrollbar-color", &format!("{thumb_color} {track_color}"));
        let _ = style.set_property("scrollbar-width", "thin");
    }
}
fn set_scroll_driven_animation(el: &Element, animation_name: &str) {
    if let Some(html) = el.dyn_ref::<HtmlElement>() {
        let style = html.style();
        let _ = style.set_property("animation-name", animation_name);
        let _ = style.set_property("animation-timeline", "view()");
        let _ = style.set_property("animation-range", "entry 0% entry 100%");
        let _ = style.set_property("animation-fill-mode", "both");
        let _ = style.set_property("animation-duration", "1ms"); // required placeholder
    }
}
pub fn init() {
    for el in dom::query_all("[data-scrollable]") {
        set_scrollbar_theme(&el, "#9333ea", "transparent");
    }
    for el in dom::query_all("[data-scroll-animate]") {
        set_scroll_driven_animation(&el, "fade-slide-up");
    }
}

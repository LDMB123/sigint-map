//! DOM element builders — thin wrappers over document.createElement.
//! The browser's DOM API does the work. These just reduce boilerplate.

use web_sys::{Document, Element};

pub fn create_el(doc: &Document, tag: &str) -> Element {
    doc.create_element(tag).expect("create_element failed")
}

pub fn create_el_with_class(doc: &Document, tag: &str, class: &str) -> Element {
    let el = create_el(doc, tag);
    let _ = el.set_attribute("class", class);
    el
}

pub fn create_button(doc: &Document, class: &str, text: &str) -> Element {
    let btn = create_el_with_class(doc, "button", class);
    btn.set_text_content(Some(text));
    let _ = btn.set_attribute("type", "button");
    btn
}

/// Create an <img> element with src, alt, and optional class.
pub fn create_img(doc: &Document, src: &str, alt: &str, class: &str) -> Element {
    create_img_with_priority(doc, src, alt, class, "auto")
}

/// Create an <img> element with src, alt, optional class, and fetchpriority.
/// priority: "high", "low", or "auto" (default)
pub fn create_img_with_priority(
    doc: &Document,
    src: &str,
    alt: &str,
    class: &str,
    priority: &str,
) -> Element {
    let img = if class.is_empty() {
        create_el(doc, "img")
    } else {
        create_el_with_class(doc, "img", class)
    };
    let _ = img.set_attribute("src", src);
    let _ = img.set_attribute("alt", alt);
    let _ = img.set_attribute("loading", "lazy");
    let _ = img.set_attribute("decoding", "async");

    // Add fetchpriority if not "auto"
    if priority != "auto" && !priority.is_empty() {
        let _ = img.set_attribute("fetchpriority", priority);
    }

    img
}

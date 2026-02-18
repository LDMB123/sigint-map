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

/// Build a game picker scaffold inside `#game-arena`.
///
/// Clears the arena, creates the `memory-select` container with title and
/// empty `memory-select-buttons` div, appends everything, and returns
/// `(arena, buttons_el)`.  Callers append their option buttons to `buttons_el`
/// and then bind their own click/abort handlers on `arena`.
///
/// Returns `None` if `#game-arena` is not found in the DOM.
pub fn build_game_picker(title: &str) -> Option<(web_sys::Element, web_sys::Element)> {
    let arena = crate::dom::query("#game-arena")?;
    let doc = crate::dom::document();
    crate::dom::safe_set_inner_html(&arena, "");

    let container = create_el_with_class(&doc, "div", "memory-select");
    let title_el = create_el_with_class(&doc, "div", "memory-select-title");
    title_el.set_text_content(Some(title));
    let buttons = create_el_with_class(&doc, "div", "memory-select-buttons");

    let _ = container.append_child(&title_el);
    let _ = container.append_child(&buttons);
    let _ = arena.append_child(&container);

    Some((arena, buttons))
}

/// Create an <img> element with src, alt, and optional class.
pub fn create_img(doc: &Document, src: &str, alt: &str, class: &str) -> Element {
    create_img_with_priority(doc, src, alt, class, "auto")
}

/// Create an <img> element with src, alt, optional class, and fetchpriority.
/// priority: "high", "low", or "auto" (default)
fn create_img_with_priority(
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

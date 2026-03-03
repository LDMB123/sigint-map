use crate::dom;
use wasm_bindgen::intern;
use web_sys::{Document, Element};
fn create_el(doc: &Document, tag: &str) -> Option<Element> {
    doc.create_element(intern(tag)).ok()
}
pub fn create_el_with_class(doc: &Document, tag: &str, class: &str) -> Option<Element> {
    let el = create_el(doc, tag)?;
    dom::set_attr(&el, "class", class);
    Some(el)
}
pub fn create_el_with_data(
    doc: &Document,
    tag: &str,
    class: &str,
    data_attr: &str,
) -> Option<Element> {
    let el = create_el_with_class(doc, tag, class)?;
    dom::set_attr(&el, data_attr, "");
    Some(el)
}
pub fn text_el(doc: &Document, tag: &str, class: &str, text: &str) -> Option<Element> {
    let el = create_el_with_class(doc, tag, class)?;
    el.set_text_content(Some(text));
    Some(el)
}
pub fn text_el_with_data(
    doc: &Document,
    tag: &str,
    class: &str,
    text: &str,
    data_attr: &str,
) -> Option<Element> {
    let el = text_el(doc, tag, class, text)?;
    dom::set_attr(&el, data_attr, "");
    Some(el)
}
pub fn append_text(
    doc: &Document,
    parent: &Element,
    tag: &str,
    class: &str,
    text: &str,
) -> Option<Element> {
    let el = text_el(doc, tag, class, text)?;
    let _ = parent.append_child(&el);
    Some(el)
}
pub fn create_button(doc: &Document, class: &str, text: &str) -> Option<Element> {
    let btn = text_el(doc, intern("button"), class, text)?;
    dom::set_attr(&btn, "type", "button");
    Some(btn)
}
pub fn create_button_with_data(
    doc: &Document,
    class: &str,
    text: &str,
    data_attr: &str,
) -> Option<Element> {
    let btn = create_button(doc, class, text)?;
    dom::set_attr(&btn, data_attr, "");
    Some(btn)
}
pub fn build_game_picker(title: &str) -> Option<(web_sys::Element, web_sys::Element)> {
    let arena = crate::dom::query(crate::constants::SELECTOR_GAME_ARENA)?;
    let doc = crate::dom::document();
    crate::dom::safe_set_inner_html(&arena, "");
    let container = create_el_with_class(&doc, "div", "memory-select")?;
    append_text(&doc, &container, "div", "memory-select-title", title);
    let buttons = create_el_with_class(&doc, "div", "memory-select-buttons")?;
    let _ = container.append_child(&buttons);
    let _ = arena.append_child(&container);
    Some((arena, buttons))
}
pub fn build_skeleton(
    doc: &Document,
    container_class: &str,
    child_class: &str,
    n: usize,
) -> Option<Element> {
    let container = create_el_with_class(doc, "div", container_class)?;
    for _ in 0..n {
        let Some(cell) = create_el_with_class(doc, "div", child_class) else {
            continue;
        };
        let _ = container.append_child(&cell);
    }
    Some(container)
}
pub fn create_img(doc: &Document, src: &str, alt: &str, class: &str) -> Option<Element> {
    create_img_with_priority(doc, src, alt, class, "auto")
}
fn create_img_with_priority(
    doc: &Document,
    src: &str,
    alt: &str,
    class: &str,
    priority: &str,
) -> Option<Element> {
    let img = if class.is_empty() {
        create_el(doc, intern("img"))?
    } else {
        create_el_with_class(doc, intern("img"), class)?
    };
    for (k, v) in [
        (intern("src"), src),
        (intern("alt"), alt),
        (intern("loading"), intern("lazy")),
        (intern("decoding"), intern("async")),
    ] {
        let _ = img.set_attribute(k, v);
    }
    if priority != "auto" && !priority.is_empty() {
        let _ = img.set_attribute(intern("fetchpriority"), priority);
    }
    Some(img)
}

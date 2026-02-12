//! Animation helpers — thin wrappers over Web Animations API + View Transitions.
//! The browser's animation engine does all the work.

use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;
use web_sys::Element;
use crate::dom;

/// Build a single keyframe JS object: { transform: value }
fn keyframe(transform: &str) -> JsValue {
    let obj = js_sys::Object::new();
    let _ = js_sys::Reflect::set(&obj, &"transform".into(), &transform.into());
    obj.into()
}

/// Bounce an element using Web Animations API (Safari 14+).
/// Direct JS object construction — no serde overhead.
pub fn bounce(el: &Element) {
    if dom::prefers_reduced_motion() { return; }
    let keyframes = js_sys::Array::of3(
        &keyframe("scale(1)"),
        &keyframe("scale(1.2)"),
        &keyframe("scale(1)"),
    );

    let options = crate::bindings::KeyframeAnimationOptions::new();
    options.set_duration(&JsValue::from_f64(300.0));
    options.set_easing("cubic-bezier(0.34, 1.56, 0.64, 1)");

    let animatable: &crate::bindings::AnimatableElement = el.unchecked_ref();
    let _ = animatable.animate_with_keyframe_animation_options(Some(&keyframes.into()), &options);
}

/// Float-up "+1" animation for heart counter.
pub fn float_up_heart(container: &Element) {
    if dom::prefers_reduced_motion() { return; }
    let doc = dom::document();
    let el = doc.create_element("span").unwrap();
    let _ = el.set_attribute("class", "float-heart");
    el.set_text_content(Some("+1 \u{2764}"));
    let _ = container.append_child(&el);

    // CSS animation handles the float-up + fade-out, then we remove
    dom::delayed_remove(el, 800);
}

/// Sparkle animation for new sticker reveal.
pub fn sparkle_reveal(el: &Element) {
    if dom::prefers_reduced_motion() { return; }
    let _ = el.class_list().add_1("sparkle-reveal");
    dom::delayed_class_remove(el.clone(), "sparkle-reveal", 600);
}

/// Jelly wobble — playful squish effect for buttons/cards.
pub fn jelly_wobble(el: &Element) {
    if dom::prefers_reduced_motion() { return; }
    let _ = el.class_list().add_1("jelly-wobble");
    dom::delayed_class_remove(el.clone(), "jelly-wobble", 500);
}

/// Magic entrance — blur reveal for panels/overlays.
pub fn magic_entrance(el: &Element) {
    if dom::prefers_reduced_motion() { return; }
    let _ = el.class_list().add_1("magic-entrance");
}

/// Gentle pulse animation for loading states.
#[allow(dead_code)]
pub fn animate_gentle_pulse(el: &Element) {
    if dom::prefers_reduced_motion() { return; }
    let _ = el.class_list().add_1("gentle-pulse");
}

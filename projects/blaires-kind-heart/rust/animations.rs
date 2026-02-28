use crate::{dom, render, theme};
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;
use web_sys::Element;
fn keyframe(transform: &str) -> JsValue {
    let obj = js_sys::Object::new();
    let _ = js_sys::Reflect::set(
        &obj,
        &wasm_bindgen::intern("transform").into(),
        &wasm_bindgen::intern(transform).into(),
    );
    obj.into()
}
pub fn bounce(el: &Element) {
    if dom::prefers_reduced_motion() {
        return;
    }
    let keyframes = js_sys::Array::of3(
        &keyframe("scale(1)"),
        &keyframe("scale(1.2)"),
        &keyframe("scale(1)"),
    );
    let options = crate::bindings::KeyframeAnimationOptions::new();
    options.set_duration(&JsValue::from_f64(f64::from(theme::BOUNCE_DURATION_MS)));
    options.set_easing(wasm_bindgen::intern("cubic-bezier(0.34, 1.56, 0.64, 1)"));
    let animatable: &crate::bindings::AnimatableElement = el.unchecked_ref();
    let _ = animatable.animate_with_keyframe_animation_options(Some(&keyframes.into()), &options);
}
pub fn float_up_heart(container: &Element) {
    if dom::prefers_reduced_motion() {
        return;
    }
    let Some(el) = render::append_text(
        &dom::document(),
        container,
        "span",
        "float-heart",
        "+1 \u{2764}",
    ) else {
        return;
    };
    dom::delayed_remove(el, theme::FLOAT_HEART_REMOVAL_MS);
}
pub fn sparkle_reveal(el: &Element) {
    if dom::prefers_reduced_motion() {
        return;
    }
    let cls = wasm_bindgen::intern("sparkle-reveal");
    let _ = el.class_list().add_1(cls);
    dom::delayed_class_remove(el.clone(), cls, theme::SPARKLE_REVEAL_MS);
}
pub fn jelly_wobble(el: &Element) {
    if dom::prefers_reduced_motion() {
        return;
    }
    let cls = wasm_bindgen::intern("jelly-wobble");
    let _ = el.class_list().add_1(cls);
    dom::delayed_class_remove(el.clone(), cls, theme::JELLY_WOBBLE_MS);
}
pub fn magic_entrance(el: &Element) {
    if dom::prefers_reduced_motion() {
        return;
    }
    let _ = el
        .class_list()
        .add_1(wasm_bindgen::intern("magic-entrance"));
}

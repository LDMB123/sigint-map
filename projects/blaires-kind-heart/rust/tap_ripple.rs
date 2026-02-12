//! Tap ripple effect — visual feedback on every button press.
//! Uses a single persistent DOM element + Web Animations API.
//! No DOM creation/removal per click — just repositions and replays.
//! Single global listener using event delegation.

use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;
use web_sys::{Element, Event, MouseEvent};

use crate::dom;

pub fn init() {
    // Create a single persistent ripple element once
    let doc = dom::document();
    let ripple = doc.create_element("div").unwrap();
    let _ = ripple.set_attribute("class", "tap-ripple");
    let _ = ripple.set_attribute("aria-hidden", "true");
    let _ = ripple.set_attribute("style", "position:fixed;pointer-events:none;z-index:50;display:none");
    if let Some(body) = doc.body() {
        let _ = body.append_child(&ripple);
    }

    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |event: Event| {
        if dom::prefers_reduced_motion() { return; }

        let Some(target) = event.target().and_then(|t| t.dyn_into::<Element>().ok()) else { return };

        // Only ripple on interactive elements
        let tag = target.tag_name();
        let is_button = tag == "BUTTON" || target.has_attribute("role") && target.get_attribute("role").as_deref() == Some("button");
        let is_clickable = target.has_attribute("data-story") || target.has_attribute("data-action") || target.has_attribute("data-panel-open");
        let in_clickable_parent = target.closest("[data-story], [data-action], [data-panel-open], button").ok().flatten().is_some();

        if !is_button && !is_clickable && !in_clickable_parent { return; }

        let mouse: MouseEvent = match event.dyn_into() {
            Ok(m) => m,
            Err(_) => return,
        };
        let x = mouse.client_x();
        let y = mouse.client_y();

        // Reposition the persistent element
        if let Some(html) = ripple.dyn_ref::<web_sys::HtmlElement>() {
            let style = html.style();
            let _ = style.set_property("left", &format!("{x}px"));
            let _ = style.set_property("top", &format!("{y}px"));
            let _ = style.set_property("display", "block");
        }

        // Animate via Web Animations API — browser composites, zero DOM churn
        let kf_start = js_sys::Object::new();
        let _ = js_sys::Reflect::set(&kf_start, &"transform".into(), &"translate(-50%, -50%) scale(0)".into());
        let _ = js_sys::Reflect::set(&kf_start, &"opacity".into(), &JsValue::from_f64(1.0));

        let kf_end = js_sys::Object::new();
        let _ = js_sys::Reflect::set(&kf_end, &"transform".into(), &"translate(-50%, -50%) scale(5)".into());
        let _ = js_sys::Reflect::set(&kf_end, &"opacity".into(), &JsValue::from_f64(0.0));

        let keyframes = js_sys::Array::of2(&kf_start.into(), &kf_end.into());

        let opts = crate::bindings::KeyframeAnimationOptions::new();
        opts.set_duration(&JsValue::from_f64(500.0));
        opts.set_easing("cubic-bezier(0.4, 0, 0.2, 1)");
        opts.set_fill("forwards");

        let animatable: &crate::bindings::AnimatableElement = ripple.unchecked_ref();
        let _ = animatable.animate_with_keyframe_animation_options(Some(&keyframes.into()), &opts);
    });
    let _ = dom::document().add_event_listener_with_callback("click", cb.as_ref().unchecked_ref());
    cb.forget();
}

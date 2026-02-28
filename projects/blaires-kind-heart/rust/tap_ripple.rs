use crate::{dom, render};
use std::cell::RefCell;
use std::fmt::Write;
use wasm_bindgen::intern;
use wasm_bindgen::JsCast;
use wasm_bindgen::JsValue;
use web_sys::{Event, MouseEvent};
thread_local! { static CACHED_KEYFRAMES: RefCell<Option<JsValue>> = const { RefCell::new(None) }; static CACHED_OPTS: RefCell<Option<js_sys::Object>> = const { RefCell::new(None) }; }
fn get_or_init_keyframes() -> JsValue {
    CACHED_KEYFRAMES.with(|c| {
        let mut cell = c.borrow_mut();
        if let Some(ref kf) = *cell {
            return kf.clone();
        }
        let transform_key: JsValue = intern("transform").into();
        let opacity_key: JsValue = intern("opacity").into();
        let kf_start = js_sys::Object::new();
        let _ = js_sys::Reflect::set(
            &kf_start,
            &transform_key,
            &intern("translate(-50%, -50%) scale(0)").into(),
        );
        let _ = js_sys::Reflect::set(&kf_start, &opacity_key, &JsValue::from_f64(1.0));
        let kf_end = js_sys::Object::new();
        let _ = js_sys::Reflect::set(
            &kf_end,
            &transform_key,
            &intern("translate(-50%, -50%) scale(5)").into(),
        );
        let _ = js_sys::Reflect::set(&kf_end, &opacity_key, &JsValue::from_f64(0.0));
        let keyframes = js_sys::Array::of2(&kf_start.into(), &kf_end.into());
        let kf_val: JsValue = keyframes.into();
        *cell = Some(kf_val.clone());
        kf_val
    })
}
fn get_or_init_opts() -> crate::bindings::KeyframeAnimationOptions {
    CACHED_OPTS.with(|c| {
        let mut cell = c.borrow_mut();
        if let Some(ref cached_obj) = *cell {
            return cached_obj.clone().unchecked_into();
        }
        let opts = crate::bindings::KeyframeAnimationOptions::new();
        opts.set_duration(&JsValue::from_f64(450.0));
        opts.set_easing(intern("cubic-bezier(0.34, 1.56, 0.2, 1.05)"));
        opts.set_fill(intern("forwards"));
        let obj: js_sys::Object = opts.unchecked_into();
        *cell = Some(obj.clone());
        obj.unchecked_into()
    })
}
pub fn init() {
    let doc = dom::document();
    let Some(ripple) = render::create_el_with_class(&doc, "div", "tap-ripple") else {
        return;
    };
    for (k, v) in [
        ("aria-hidden", "true"),
        (
            "style",
            "position:fixed;pointer-events:none;z-index:50;display:none",
        ),
    ] {
        dom::set_attr(&ripple, k, v);
    }
    if let Some(body) = doc.body() {
        let _ = body.append_child(&ripple);
    }
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(Event)>::new(move |event: Event| {
        if dom::prefers_reduced_motion() {
            return;
        }
        let Some(target) = dom::event_target_element(&event) else {
            return;
        };
        let tag = target.tag_name();
        let is_button = tag == "BUTTON"
            || dom::has_attr(&target, "role")
                && dom::get_attr(&target, "role").as_deref() == Some("button");
        let is_clickable = dom::has_attr(&target, "data-story")
            || dom::has_attr(&target, "data-action")
            || dom::has_attr(&target, "data-panel-open");
        let in_clickable_parent = dom::closest(
            &target,
            intern("[data-story], [data-action], [data-panel-open], button"),
        )
        .is_some();
        if !is_button && !is_clickable && !in_clickable_parent {
            return;
        }
        let mouse: MouseEvent = match event.dyn_into() {
            Ok(m) => m,
            Err(_) => return,
        };
        let x = mouse.client_x();
        let y = mouse.client_y();
        if let Some(html) = ripple.dyn_ref::<web_sys::HtmlElement>() {
            let style = html.style();
            dom::with_buf(|buf| {
                let _ = write!(buf, "{x}px");
                let _ = style.set_property(intern("left"), buf);
            });
            dom::with_buf(|buf| {
                let _ = write!(buf, "{y}px");
                let _ = style.set_property(intern("top"), buf);
            });
            let _ = style.set_property(intern("display"), intern("block"));
        }
        let keyframes = get_or_init_keyframes();
        let opts = get_or_init_opts();
        let animatable: &crate::bindings::AnimatableElement = ripple.unchecked_ref();
        let _ = animatable.animate_with_keyframe_animation_options(Some(&keyframes), &opts);
    });
    let _ = dom::document()
        .add_event_listener_with_callback(intern("click"), cb.as_ref().unchecked_ref());
    cb.forget();
}

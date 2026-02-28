use crate::{companion, confetti, constants, dom, render, speech, synth_audio};
use wasm_bindgen::JsCast;
use web_sys::Event;

use std::cell::RefCell;

thread_local! {
    static PENDING_TIMEOUTS: RefCell<Vec<i32>> = const { RefCell::new(Vec::new()) };
}

const FEELINGS: [(&str, &str, &str); 3] = [
    ("happy", "Happy \u{1F60A}", "feel-happy"),
    ("proud", "Proud \u{1F60C}", "feel-proud"),
    ("loving", "Loving \u{1F495}", "feel-loving"),
];

pub fn init() {
    let body = dom::body();
    dom::on(
        body.unchecked_ref(),
        "kindheart-reflection-ready",
        move |event: Event| {
            let Some(custom_event) = event.dyn_ref::<web_sys::CustomEvent>() else {
                return;
            };
            let detail = custom_event.detail();
            let act_id = js_sys::Reflect::get(&detail, &"act_id".into())
                .ok()
                .and_then(|v| v.as_string());
            let category = js_sys::Reflect::get(&detail, &"category".into())
                .ok()
                .and_then(|v| v.as_string());
            if let (Some(id), Some(_cat)) = (act_id, category) {
                show_feeling_prompt(&id);
            }
        },
    );

    dom::on(&dom::window(), "beforeunload", |_event: Event| {
        cancel_pending_timeouts();
    });
}

fn show_feeling_prompt(act_id: &str) {
    // Don't show if one is already visible
    if dom::query("[data-feeling-prompt]").is_some() {
        return;
    }

    synth_audio::gentle();

    let doc = dom::document();
    let Some(popover) = render::create_el_with_class(&doc, "div", "feeling-prompt") else {
        return;
    };
    for (k, v) in [("data-feeling-prompt", "true"), ("popover", "manual")] {
        dom::set_attr(&popover, k, v);
    }

    // Sparkle asks "How do you feel?"
    let Some(header) = render::create_el_with_class(&doc, "div", "feeling-header") else {
        return;
    };
    if let Some(sparkle_img) = render::create_img(
        &doc,
        "companions/default_happy.webp",
        "Sparkle",
        "feeling-sparkle",
    ) {
        let _ = header.append_child(&sparkle_img);
    }
    render::append_text(&doc, &header, "div", "feeling-question", "How do you feel?");
    let _ = popover.append_child(&header);

    // 3 big face buttons
    let Some(faces) = render::create_el_with_class(&doc, "div", "feeling-faces") else {
        return;
    };
    for &(value, label, css_class) in &FEELINGS {
        let Some(btn) =
            render::text_el(&doc, "button", &format!("feeling-face {css_class}"), label)
        else {
            continue;
        };
        dom::set_attr(&btn, "data-feeling", value);
        dom::set_attr(&btn, "data-act-id", act_id);
        let _ = faces.append_child(&btn);
    }
    let _ = popover.append_child(&faces);

    // Skip button
    if let Some(skip) = render::text_el(
        &doc,
        "button",
        "feeling-skip",
        "Maybe later! \u{1F3C3}\u{200D}\u{2640}\u{FE0F}",
    ) {
        dom::set_attr(&skip, "data-action", "skip");
        let _ = popover.append_child(&skip);
    }

    // Click handler
    dom::on(popover.unchecked_ref(), "click", move |event: Event| {
        let Some(target) = event.target() else { return };
        let Some(element) = target.dyn_ref::<web_sys::Element>() else {
            return;
        };

        if dom::get_attr(element, "data-action").as_deref() == Some("skip") {
            dismiss_prompt();
            return;
        }

        if let Some(feeling) = dom::get_attr(element, "data-feeling") {
            if let Some(act_id) = dom::get_attr(element, "data-act-id") {
                handle_feeling_choice(&act_id, &feeling);
            }
            dismiss_prompt();
        }
    });

    let _ = doc.body().and_then(|b| b.append_child(&popover).ok());
    if let Some(el) = popover.dyn_ref::<web_sys::HtmlElement>() {
        let _ = el.show_popover();
    }

    speech::speak("How do you feel?");

    // Auto-dismiss after 10s — clear stale IDs before adding new one
    let timeout_id = dom::set_timeout_cancelable(constants::REFLECTION_POPOVER_DISMISS_MS, || {
        dismiss_prompt();
    });
    PENDING_TIMEOUTS.with(|t| {
        let mut timeouts = t.borrow_mut();
        // Guard: only one popover exists at a time, so Vec should be tiny.
        // Defensive cap prevents unbounded growth if dismiss fails.
        if timeouts.len() >= 4 {
            let window = dom::window();
            for id in timeouts.drain(..) {
                window.clear_timeout_with_handle(id);
            }
        }
        timeouts.push(timeout_id);
    });
}

fn handle_feeling_choice(act_id: &str, feeling: &str) {
    let id = act_id.to_string();
    let feeling_str = feeling.to_string();

    // Feeling-specific celebration
    match feeling {
        "proud" => {
            confetti::burst_stars();
        }
        "loving" => {
            confetti::burst_unicorn();
        }
        _ => {
            confetti::burst_hearts();
        }
    }

    synth_audio::chime();
    dom::toast("Thanks for sharing! +1 \u{2764}\u{FE0F}");
    companion::celebrate_reflection();

    // Save to DB + award bonus heart
    let id_clone = id;
    wasm_bindgen_futures::spawn_local(async move {
        if let Err(e) = crate::offline_queue::queued_exec(
            "UPDATE kind_acts SET reflection_type = ?1, hearts_earned = hearts_earned + 1 WHERE id = ?2",
            vec![feeling_str, id_clone],
        ).await {
            dom::warn(&format!("[reflection] Failed to save: {e:?}"));
        }
    });
}

fn dismiss_prompt() {
    cancel_pending_timeouts();
    if let Some(popover) = dom::query("[data-feeling-prompt]") {
        if let Some(el) = popover.dyn_ref::<web_sys::HtmlElement>() {
            let _ = el.hide_popover();
        }
        popover.remove();
    }
}

fn cancel_pending_timeouts() {
    PENDING_TIMEOUTS.with(|timeouts| {
        let window = dom::window();
        for timeout_id in timeouts.borrow().iter() {
            window.clear_timeout_with_handle(*timeout_id);
        }
        timeouts.borrow_mut().clear();
    });
}

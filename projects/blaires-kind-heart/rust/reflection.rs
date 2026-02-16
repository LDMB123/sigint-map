//! Reflection prompt system — "Why was that kind?"
//! Shows 3 emoji buttons 3s after kind act logging.
//! Awards +1 bonus heart for engagement, skippable always.
//! Uses Popover API (Safari 26.2) for native overlay.

use wasm_bindgen::JsCast;
use web_sys::Event;

use crate::{companion, confetti, dom, emotion_vocabulary, speech, story_moments, synth_audio};

// Timing constants (Bug Fix #6: Extract magic numbers)
const STORY_DISPLAY_DURATION_MS: i32 = 2000;
const EMOTION_FADE_DURATION_MS: i32 = 2000;
const EMOTION_TAP_DEBOUNCE_MS: f64 = 300.0;

// Thread-local storage for cleanup (Bug Fix #2: Timeout cancellation, Bug Fix #8: Debouncing)
use std::cell::RefCell;

thread_local! {
    static PENDING_TIMEOUTS: RefCell<Vec<i32>> = const { RefCell::new(Vec::new()) };
    static LAST_EMOTION_TAP: RefCell<f64> = const { RefCell::new(0.0) };
}

/// 10 dynamic reflection prompts for variety
const REFLECTION_PROMPTS: [&str; 10] = [
    "Why was that kind?",
    "How did that help someone?",
    "What made you want to do that?",
    "Who smiled because of you?",
    "What kindness did you show?",
    "How did you make someone's day better?",
    "What did you share or give?",
    "Why is that a good thing to do?",
    "How would you feel if someone did that for you?",
    "What kindness superpower did you use?",
];

/// Selects a random reflection prompt from the pool
fn select_reflection_prompt() -> &'static str {
    let len = REFLECTION_PROMPTS.len();
    let idx = ((js_sys::Math::random() * len as f64).floor() as usize).min(len - 1);
    REFLECTION_PROMPTS[idx]
}

/// Init reflection system by binding to custom event
pub fn init() {
    let body = dom::body();

    // Listen for kindheart-reflection-ready custom event from tracker
    dom::on(body.unchecked_ref(), "kindheart-reflection-ready", move |event: Event| {
        let Some(custom_event) = event.dyn_ref::<web_sys::CustomEvent>() else { return };
        let detail = custom_event.detail();

        // Extract act_id and category from event detail
        let act_id = js_sys::Reflect::get(&detail, &"act_id".into())
            .ok()
            .and_then(|v| v.as_string());
        let category = js_sys::Reflect::get(&detail, &"category".into())
            .ok()
            .and_then(|v| v.as_string());

        if let (Some(id), Some(cat)) = (act_id, category) {
            show_reflection_prompt(&cat, &id);
        }
    });

    // Clean up timeouts on page unload to prevent memory leaks
    if let Some(window) = web_sys::window() {
        dom::on(&window, "beforeunload", |_event: Event| {
            cancel_pending_timeouts();
        });
    }
}

/// Show reflection prompt with 3 emoji buttons + skip
fn show_reflection_prompt(category: &str, act_id: &str) {
    // Don't stack prompts (Bug Fix #5: Check both reflection AND emotion prompts)
    if dom::query("[data-reflection-active]").is_some()
        || dom::query("[data-emotion-checkin]").is_some() {
        return;
    }

    synth_audio::gentle();

    // Select random prompt from pool
    let prompt_text = select_reflection_prompt();

    // Default emoji response options (category-agnostic)
    let options = vec![
        "Made someone happy 😊".to_string(),
        "Helped someone 🤝".to_string(),
        "Shared something 💝".to_string(),
    ];

    render_reflection_prompt(act_id, category, prompt_text, &options);
}

/// Render reflection popover with emoji buttons
fn render_reflection_prompt(act_id: &str, category: &str, prompt_text: &str, options: &[String]) {
    let Some(doc) = web_sys::window().and_then(|w| w.document()) else { return };

    // Create popover container
    let Ok(popover) = doc.create_element("div") else { return };
    let _ = popover.set_attribute("class", "reflection-popover");
    let _ = popover.set_attribute("data-reflection-active", "true");
    let _ = popover.set_attribute("data-category", category); // Store for later
    let _ = popover.set_attribute("popover", "manual");

    // Sparkle says prompt
    let Ok(prompt_div) = doc.create_element("div") else { return };
    let _ = prompt_div.set_attribute("class", "reflection-prompt");

    let Ok(sparkle_img) = doc.create_element("img") else { return };
    let _ = sparkle_img.set_attribute("src", "illustrations/companion-sparkle-excited.webp");
    let _ = sparkle_img.set_attribute("alt", "Sparkle");
    let _ = sparkle_img.set_attribute("class", "reflection-sparkle");
    let _ = prompt_div.append_child(&sparkle_img);

    let Ok(bubble) = doc.create_element("div") else { return };
    let _ = bubble.set_attribute("class", "speech-bubble");
    bubble.set_text_content(Some(prompt_text));
    let _ = prompt_div.append_child(&bubble);

    let _ = popover.append_child(&prompt_div);

    // Button container
    let Ok(buttons_div) = doc.create_element("div") else { return };
    let _ = buttons_div.set_attribute("class", "reflection-buttons");

    // Create 3 emoji option buttons
    // Use data attributes instead of closures to prevent memory leaks
    for (i, option) in options.iter().enumerate().take(3) {
        let Ok(btn) = doc.create_element("button") else { continue };
        let _ = btn.set_attribute("class", "reflection-option");
        let _ = btn.set_attribute("data-choice", &format!("choice-{}", i));
        let _ = btn.set_attribute("data-act-id", act_id);
        let _ = btn.set_attribute("data-option-text", option);
        btn.set_text_content(Some(option));

        let _ = buttons_div.append_child(&btn);
    }

    // Skip button (always visible)
    let Ok(skip_btn) = doc.create_element("button") else { return };
    let _ = skip_btn.set_attribute("class", "reflection-skip");
    let _ = skip_btn.set_attribute("data-action", "skip");
    skip_btn.set_text_content(Some("Maybe later! 🏃‍♀️"));

    let _ = buttons_div.append_child(&skip_btn);
    let _ = popover.append_child(&buttons_div);

    // Event delegation on popover to avoid closure memory leaks
    dom::on(popover.unchecked_ref(), "click", move |event: Event| {
        let Some(target) = event.target() else { return };
        let Some(element) = target.dyn_ref::<web_sys::Element>() else { return };

        // Check if clicked skip button
        if element.get_attribute("data-action").as_deref() == Some("skip") {
            dismiss_prompt();
            return;
        }

        // Check if clicked reflection option button
        if element.get_attribute("class").as_deref() == Some("reflection-option") {
            if let (Some(act_id), Some(choice)) = (
                element.get_attribute("data-act-id"),
                element.get_attribute("data-option-text"),
            ) {
                handle_reflection_choice(&act_id, &choice);
                dismiss_prompt();
            }
        }
    });

    // Add to body
    let _ = doc.body().and_then(|b| b.append_child(&popover).ok());

    // Show popover
    if let Some(popover_el) = popover.dyn_ref::<web_sys::HtmlElement>() {
        let _ = popover_el.show_popover();
    }

    // Narrate prompt
    speech::speak(prompt_text);

    // Auto-dismiss after 10s
    dom::set_timeout_once(10000, || {
        dismiss_prompt();
    });
}

/// Handle reflection choice - award bonus heart, show story, then emotion check-in
fn handle_reflection_choice(act_id: &str, choice: &str) {
    let id = act_id.to_string();
    let choice_str = choice.to_string();

    // Bug Fix #1: Capture category from DOM immediately, not via function
    let category_str = if let Some(popover) = dom::query("[data-reflection-active]") {
        popover.get_attribute("data-category")
            .unwrap_or_else(|| {
                // Bug Fix #7: Warn when falling back to default
                web_sys::console::warn_1(&"Category not found in popover, defaulting to 'hug'".into());
                "hug".to_string()
            })
    } else {
        web_sys::console::warn_1(&"Popover not found, defaulting to 'hug'".into());
        "hug".to_string()
    };

    // Award bonus heart
    synth_audio::chime();
    confetti::burst_hearts();
    dom::toast("Thanks for sharing! +1 ❤️");

    // Sparkle praises
    companion::celebrate_reflection();

    // Update DB with reflection data (Bug Fix #4: Add error handling)
    // CRITICAL: Use offline_queue to prevent data loss when offline
    let id_clone = id.clone();
    let choice_clone = choice_str.clone();
    wasm_bindgen_futures::spawn_local(async move {
        // Update kind_acts with reflection_type and increment hearts_earned by 1
        match crate::offline_queue::queued_exec(
            "UPDATE kind_acts SET reflection_type = ?1, hearts_earned = hearts_earned + 1 WHERE id = ?2",
            vec![choice_clone, id_clone],
        ).await {
            Ok(_) => {
                // Success - reflection saved (or queued if offline)
            }
            Err(e) => {
                web_sys::console::error_1(&format!("Failed to save reflection: {:?}", e).into());
            }
        }
    });

    // Show story moment after reflection (Bug Fix #6: Use constant, Bug Fix #2: Store timeout handle)
    let id_for_story = id.clone();
    let cat_for_story = category_str.clone();
    let timeout_id = dom::set_timeout_cancelable(STORY_DISPLAY_DURATION_MS, move || {
        show_story_moment(&cat_for_story, &id_for_story);
    });

    // Store timeout handle for cleanup on dismiss
    PENDING_TIMEOUTS.with(|timeouts| {
        timeouts.borrow_mut().push(timeout_id);
    });
}

/// Show Sparkle story moment explaining kindness impact
fn show_story_moment(category: &str, act_id: &str) {
    // Select random story from category pool
    let story_text = story_moments::select_random_story(category);

    // Show story moment (toast + speech)
    dom::toast(story_text);
    speech::speak(story_text);

    // After fade duration, show emotion check-in (Bug Fix #6: Use constant, Bug Fix #2: Store timeout)
    let id_for_emotion = act_id.to_string();
    let timeout_id = dom::set_timeout_cancelable(EMOTION_FADE_DURATION_MS, move || {
        show_emotion_checkin(&id_for_emotion);
    });

    // Store timeout handle for cleanup
    PENDING_TIMEOUTS.with(|timeouts| {
        timeouts.borrow_mut().push(timeout_id);
    });
}

/// Show emotion check-in prompt with 16 emotion buttons
fn show_emotion_checkin(act_id: &str) {
    let Some(doc) = web_sys::window().and_then(|w| w.document()) else { return };

    // Create emotion check-in UI using emotion_vocabulary module
    let Ok(checkin_ui) = emotion_vocabulary::create_emotion_checkin_ui(&doc) else { return };

    // Add to body
    let _ = doc.body().and_then(|b| b.append_child(&checkin_ui).ok());

    // Narrate prompt
    speech::speak("How did YOU feel?");

    // Event delegation for emotion button clicks
    let id_for_handler = act_id.to_string();
    dom::on(checkin_ui.unchecked_ref(), "click", move |event: Event| {
        let Some(target) = event.target() else { return };
        let Some(element) = target.dyn_ref::<web_sys::Element>() else { return };

        // Check if clicked element is emotion button
        if let Some(emotion_name) = element.get_attribute("data-emotion") {
            handle_emotion_selection(&id_for_handler, &emotion_name);
            dismiss_emotion_checkin();
        }

        // Check if clicked skip button
        if element.get_attribute("data-emotion-skip").is_some() {
            dismiss_emotion_checkin();
        }
    });
}

/// Handle emotion selection - update DB with emotion
fn handle_emotion_selection(act_id: &str, emotion: &str) {
    // Bug Fix #8: Debounce rapid taps (300ms)
    let now = js_sys::Date::now();
    let should_process = LAST_EMOTION_TAP.with(|last| {
        let last_time = *last.borrow();
        if now - last_time < EMOTION_TAP_DEBOUNCE_MS {
            false // Too soon, ignore
        } else {
            *last.borrow_mut() = now;
            true
        }
    });

    if !should_process {
        return;
    }

    // CRITICAL: Validate emotion exists in EMOTIONS array before saving
    if emotion_vocabulary::get_emotion_by_name(emotion).is_none() {
        web_sys::console::error_1(&format!("Invalid emotion: {}", emotion).into());
        return;
    }

    let id = act_id.to_string();
    let emotion_str = emotion.to_string();

    // Wobble animation on selection
    synth_audio::tap();
    dom::toast(&format!("You felt {}! 💜", emotion));

    // Update DB with emotion data (Bug Fix #4: Add error handling)
    // CRITICAL: Use offline_queue to prevent data loss when offline
    wasm_bindgen_futures::spawn_local(async move {
        match crate::offline_queue::queued_exec(
            "UPDATE kind_acts SET emotion_selected = ?1 WHERE id = ?2",
            vec![emotion_str, id],
        ).await {
            Ok(_) => {
                // Success - emotion saved (or queued if offline)
            }
            Err(e) => {
                web_sys::console::error_1(&format!("Failed to save emotion: {:?}", e).into());
                dom::toast("Couldn't save emotion - try again?");
            }
        }
    });
}

/// Dismiss emotion check-in UI
fn dismiss_emotion_checkin() {
    // Bug Fix #2: Cancel all pending timeouts before dismissing
    cancel_pending_timeouts();

    if let Some(checkin) = dom::query("[data-emotion-checkin]") {
        checkin.remove();
    }
}

/// Dismiss reflection prompt
fn dismiss_prompt() {
    // Bug Fix #2: Cancel all pending timeouts before dismissing
    cancel_pending_timeouts();

    if let Some(popover) = dom::query("[data-reflection-active]") {
        if let Some(popover_el) = popover.dyn_ref::<web_sys::HtmlElement>() {
            let _ = popover_el.hide_popover();
        }
        popover.remove();
    }
}

/// Cancel all pending timeouts to prevent race conditions (Bug Fix #2)
fn cancel_pending_timeouts() {
    PENDING_TIMEOUTS.with(|timeouts| {
        if let Some(window) = web_sys::window() {
            for timeout_id in timeouts.borrow().iter() {
                window.clear_timeout_with_handle(*timeout_id);
            }
        }
        timeouts.borrow_mut().clear();
    });
}

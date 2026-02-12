//! Mom Mode — parent dashboard with PIN protection.
//! Long-press (3s) on app title → PIN entry overlay → goal setting + notes.
//! PIN stored in `settings` table as `parent_pin`.

use std::cell::RefCell;
use std::rc::Rc;
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;
use web_sys::{Element, Event};

use crate::{
    db_client, dom, render, speech, state::AppState, synth_audio, utils, weekly_goals,
};

thread_local! {
    static MOM_STATE: RefCell<Option<MomModeState>> = const { RefCell::new(None) };
}

struct MomModeState {
    state: Rc<RefCell<AppState>>,
    pin_set: bool,
}

pub fn init(state: Rc<RefCell<AppState>>) {
    MOM_STATE.with(|m| {
        *m.borrow_mut() = Some(MomModeState {
            state: state.clone(),
            pin_set: false,
        });
    });

    bind_long_press();

    // Check if PIN exists on boot
    let s = state.clone();
    wasm_bindgen_futures::spawn_local(async move {
        check_pin_exists(s).await;
    });
}

async fn check_pin_exists(state: Rc<RefCell<AppState>>) {
    if let Ok(rows) = db_client::query(
        "SELECT value FROM settings WHERE key = 'parent_pin'",
        vec![],
    ).await {
        let has_pin = rows.as_array().map(|a| !a.is_empty()).unwrap_or(false);
        MOM_STATE.with(|m| {
            if let Some(mom) = m.borrow_mut().as_mut() {
                mom.pin_set = has_pin;
            }
        });
        state.borrow_mut().parent_pin_set = has_pin;
    }
}

/// Long-press on the app title (3 seconds) to trigger Mom Mode.
fn bind_long_press() {
    let Some(title) = dom::query(".home-title") else { return };

    let timer_id: Rc<RefCell<Option<i32>>> = Rc::new(RefCell::new(None));

    // Pointer down — start timer
    let timer_down = timer_id.clone();
    dom::on(title.unchecked_ref(), "pointerdown", move |_: Event| {
        let timer_ref = timer_down.clone();
        let cb = Closure::<dyn FnMut()>::once(move || {
            *timer_ref.borrow_mut() = None;
            synth_audio::chime();
            show_pin_overlay();
        });
        let id = dom::window()
            .set_timeout_with_callback_and_timeout_and_arguments_0(
                cb.as_ref().unchecked_ref(), 3000,
            ).unwrap_or(0);
        cb.forget();
        *timer_down.borrow_mut() = Some(id);
    });

    // Pointer up / cancel — clear timer
    let timer_up = timer_id.clone();
    let cancel = move |_: Event| {
        if let Some(id) = timer_up.borrow_mut().take() {
            dom::window().clear_timeout_with_handle(id);
        }
    };
    let cancel2 = cancel.clone();
    dom::on(title.unchecked_ref(), "pointerup", cancel);
    dom::on(title.unchecked_ref(), "pointercancel", cancel2);
}

fn show_pin_overlay() {
    let is_setup = MOM_STATE.with(|m| {
        m.borrow().as_ref().map(|s| !s.pin_set).unwrap_or(true)
    });

    let doc = dom::document();
    let overlay = render::create_el_with_class(&doc, "dialog", "mom-overlay");
    let _ = overlay.set_attribute("data-mom-overlay", "");
    let _ = overlay.set_attribute("aria-label", "Enter PIN");

    let card = render::create_el_with_class(&doc, "div", "mom-pin-card");

    let title = render::create_el_with_class(&doc, "h2", "mom-pin-title");
    if is_setup {
        title.set_text_content(Some("\u{1F49C} Hi Mom! Set a 4-digit code"));
    } else {
        title.set_text_content(Some("\u{1F512} Enter your PIN"));
    }
    let _ = card.append_child(&title);

    // PIN display dots
    let dots = render::create_el_with_class(&doc, "div", "mom-pin-dots");
    let _ = dots.set_attribute("data-pin-dots", "");
    for i in 0..4 {
        let dot = render::create_el_with_class(&doc, "span", "mom-pin-dot");
        let _ = dot.set_attribute("data-dot", &i.to_string());
        dot.set_text_content(Some("\u{25CB}")); // empty circle
        let _ = dots.append_child(&dot);
    }
    let _ = card.append_child(&dots);

    // Number pad (1-9, 0, backspace)
    let pad = render::create_el_with_class(&doc, "div", "mom-numpad");
    for n in 1..=9 {
        let btn = render::create_button(&doc, "mom-numpad-btn", &n.to_string());
        let _ = btn.set_attribute("data-pin-digit", &n.to_string());
        let _ = pad.append_child(&btn);
    }
    // Empty cell + 0 + backspace
    let empty = render::create_el_with_class(&doc, "div", "mom-numpad-spacer");
    let _ = pad.append_child(&empty);

    let zero_btn = render::create_button(&doc, "mom-numpad-btn", "0");
    let _ = zero_btn.set_attribute("data-pin-digit", "0");
    let _ = pad.append_child(&zero_btn);

    let del_btn = render::create_button(&doc, "mom-numpad-btn mom-numpad-btn--del", "\u{232B}");
    let _ = del_btn.set_attribute("data-pin-delete", "");
    let _ = pad.append_child(&del_btn);

    let _ = card.append_child(&pad);

    // Error message (hidden)
    let error = render::create_el_with_class(&doc, "p", "mom-pin-error");
    let _ = error.set_attribute("data-pin-error", "");
    let _ = error.set_attribute("hidden", "");
    error.set_text_content(Some("Wrong PIN — try again!"));
    let _ = card.append_child(&error);

    // Cancel button
    let cancel = render::create_button(&doc, "mom-cancel-btn", "\u{2715} Cancel");
    let _ = cancel.set_attribute("data-mom-cancel", "");
    let _ = card.append_child(&cancel);

    let _ = overlay.append_child(&card);

    if let Some(body) = doc.body() {
        let _ = body.append_child(&overlay);
    }

    // Native <dialog> showModal() provides focus trap + Escape + backdrop
    let dialog: &web_sys::HtmlDialogElement = overlay.unchecked_ref();
    if let Err(e) = dialog.show_modal() {
        web_sys::console::warn_1(&format!("[mom_mode] PIN dialog.show_modal() failed: {:?}", e).into());
        return;  // Don't show broken PIN UI
    }

    bind_pin_interactions(is_setup);
}

fn bind_pin_interactions(is_setup: bool) {
    let Some(overlay) = dom::query("[data-mom-overlay]") else { return };
    let entered = Rc::new(RefCell::new(String::new()));

    // Cancel button
    if let Some(cancel) = dom::query("[data-mom-cancel]") {
        dom::on(cancel.unchecked_ref(), "click", move |_: Event| {
            close_pin_overlay();
        });
    }

    // Native <dialog> fires "cancel" on Escape — no manual keydown listener needed
    dom::on(overlay.unchecked_ref(), "cancel", move |_: Event| {
        close_pin_overlay();
    });

    // Digit buttons (event delegation on numpad)
    let entered_click = entered.clone();
    let setup = is_setup;
    dom::on(overlay.unchecked_ref(), "click", move |event: Event| {
        let target = event.target().and_then(|t| t.dyn_into::<Element>().ok());
        let Some(el) = target else { return };

        // Handle delete
        if el.closest("[data-pin-delete]").ok().flatten().is_some() {
            let mut pin = entered_click.borrow_mut();
            pin.pop();
            update_pin_dots(pin.len());
            // Hide error
            if let Some(err) = dom::query("[data-pin-error]") {
                let _ = err.set_attribute("hidden", "");
            }
            return;
        }

        // Handle digit
        if let Ok(Some(btn)) = el.closest("[data-pin-digit]") {
            if let Some(digit) = btn.get_attribute("data-pin-digit") {
                let mut pin = entered_click.borrow_mut();
                if pin.len() < 4 {
                    pin.push_str(&digit);
                    update_pin_dots(pin.len());

                    if pin.len() == 4 {
                        let full_pin = pin.clone();
                        drop(pin);
                        if setup {
                            // Save new PIN
                            let pin_val = full_pin.clone();
                            wasm_bindgen_futures::spawn_local(async move {
                                save_pin(&pin_val).await;
                            });
                        } else {
                            // Verify PIN — clone entered Rc so we can clear it on failure
                            let pin_val = full_pin.clone();
                            let entered_reset = entered_click.clone();
                            wasm_bindgen_futures::spawn_local(async move {
                                let ok = verify_pin(&pin_val).await;
                                if !ok {
                                    // Clear entered state so user can retry
                                    entered_reset.borrow_mut().clear();
                                }
                            });
                        }
                    }
                }
            }
        }
    });
}

fn update_pin_dots(count: usize) {
    for i in 0..4 {
        let selector = format!("[data-dot=\"{i}\"]");
        if let Some(dot) = dom::query(&selector) {
            if i < count {
                dot.set_text_content(Some("\u{25CF}")); // filled circle
                let _ = dot.set_attribute("class", "mom-pin-dot mom-pin-dot--filled");
            } else {
                dot.set_text_content(Some("\u{25CB}")); // empty circle
                let _ = dot.set_attribute("class", "mom-pin-dot");
            }
        }
    }
}

async fn save_pin(pin: &str) {
    let _ = db_client::exec(
        "INSERT OR REPLACE INTO settings (key, value) VALUES ('parent_pin', ?1)",
        vec![pin.to_string()],
    ).await;

    MOM_STATE.with(|m| {
        if let Some(mom) = m.borrow_mut().as_mut() {
            mom.pin_set = true;
            mom.state.borrow_mut().parent_pin_set = true;
        }
    });

    // Close PIN overlay and show dashboard
    close_pin_overlay();
    speech::speak("PIN set! Welcome to Mom Mode!");
    show_dashboard();
}

async fn verify_pin(entered: &str) -> bool {
    if let Ok(rows) = db_client::query(
        "SELECT value FROM settings WHERE key = 'parent_pin'",
        vec![],
    ).await {
        let stored = rows.as_array()
            .and_then(|a| a.first())
            .and_then(|r| r.get("value"))
            .and_then(|v| v.as_str())
            .unwrap_or("");

        if entered == stored {
            close_pin_overlay();
            synth_audio::chime();
            show_dashboard();
            return true;
        } else {
            // Wrong PIN — show error, reset dots
            if let Some(err) = dom::query("[data-pin-error]") {
                let _ = err.remove_attribute("hidden");
            }
            update_pin_dots(0);
            return false;
        }
    }
    false
}

/// Get stored parent PIN or default "1234"
pub async fn get_parent_pin() -> String {
    if let Ok(rows) = db_client::query(
        "SELECT value FROM settings WHERE key = 'parent_pin'",
        vec![],
    ).await {
        rows.as_array()
            .and_then(|a| a.first())
            .and_then(|r| r.get("value"))
            .and_then(|v| v.as_str())
            .map(|s| s.to_string())
            .unwrap_or_else(|| "1234".to_string())
    } else {
        "1234".to_string()
    }
}

fn close_pin_overlay() {
    if let Some(overlay) = dom::query("[data-mom-overlay]") {
        let dialog: &web_sys::HtmlDialogElement = overlay.unchecked_ref();
        dialog.close();
        overlay.remove();
    }
}

fn show_dashboard() {
    let doc = dom::document();
    let overlay = render::create_el_with_class(&doc, "dialog", "mom-overlay mom-overlay--dashboard");
    let _ = overlay.set_attribute("data-mom-dashboard", "");
    let _ = overlay.set_attribute("aria-label", "Mom's Dashboard");

    let card = render::create_el_with_class(&doc, "div", "mom-dashboard-card");

    // Header
    let header = render::create_el_with_class(&doc, "div", "mom-dashboard-header");
    let title = render::create_el_with_class(&doc, "h2", "mom-dashboard-title");
    title.set_text_content(Some("\u{1F49C} Mom's Dashboard"));
    let _ = header.append_child(&title);
    let close_btn = render::create_button(&doc, "mom-close-btn", "\u{2715}");
    let _ = close_btn.set_attribute("data-mom-close", "");
    let _ = header.append_child(&close_btn);
    let _ = card.append_child(&header);

    // Current week
    let week = utils::week_key();
    let week_label = render::create_el_with_class(&doc, "p", "mom-week-label");
    week_label.set_text_content(Some(&format!("\u{1F4C5} Week: {week}")));
    let _ = card.append_child(&week_label);

    // Goal setting section
    let goals_section = render::create_el_with_class(&doc, "div", "mom-goals-section");
    let goals_title = render::create_el_with_class(&doc, "h3", "mom-section-title");
    goals_title.set_text_content(Some("\u{2B50} Set Weekly Goals"));
    let _ = goals_section.append_child(&goals_title);

    // Goal type cards
    let goal_types = [
        ("acts", "\u{1F49D}", "Kind Acts", "How many kind acts this week?", 5, 30, 10),
        ("quests", "\u{2B50}", "Quest Days", "Complete quests on how many days?", 1, 7, 3),
        ("stories", "\u{1F4D6}", "Stories", "Read how many stories?", 1, 5, 2),
        ("games", "\u{1F3AE}", "Games", "Play how many games?", 1, 10, 5),
        ("hearts", "\u{1F49C}", "Hearts", "Earn how many hearts?", 10, 100, 25),
    ];

    for (goal_type, emoji, label, desc, _min, _max, default) in &goal_types {
        let goal_card = render::create_el_with_class(&doc, "div", "mom-goal-card");
        let _ = goal_card.set_attribute("data-goal-type", goal_type);

        let goal_header = render::create_el_with_class(&doc, "div", "mom-goal-header");
        let emoji_el = render::create_el_with_class(&doc, "span", "mom-goal-emoji");
        emoji_el.set_text_content(Some(emoji));
        let label_el = render::create_el_with_class(&doc, "span", "mom-goal-label");
        label_el.set_text_content(Some(label));
        let _ = goal_header.append_child(&emoji_el);
        let _ = goal_header.append_child(&label_el);
        let _ = goal_card.append_child(&goal_header);

        let desc_el = render::create_el_with_class(&doc, "p", "mom-goal-desc");
        desc_el.set_text_content(Some(desc));
        let _ = goal_card.append_child(&desc_el);

        // Slider row: [-] [value] [+]
        let slider_row = render::create_el_with_class(&doc, "div", "mom-slider-row");

        let minus_btn = render::create_button(&doc, "mom-slider-btn", "\u{2796}");
        let _ = minus_btn.set_attribute("data-slider-minus", goal_type);
        let _ = slider_row.append_child(&minus_btn);

        let value_el = render::create_el_with_class(&doc, "span", "mom-slider-value");
        let _ = value_el.set_attribute("data-slider-value", goal_type);
        value_el.set_text_content(Some(&default.to_string()));
        let _ = slider_row.append_child(&value_el);

        let plus_btn = render::create_button(&doc, "mom-slider-btn", "\u{2795}");
        let _ = plus_btn.set_attribute("data-slider-plus", goal_type);
        let _ = slider_row.append_child(&plus_btn);

        let _ = goal_card.append_child(&slider_row);

        // Toggle: active/inactive
        let toggle_btn = render::create_button(&doc, "mom-goal-toggle mom-goal-toggle--off", "Add Goal");
        let _ = toggle_btn.set_attribute("data-goal-toggle", goal_type);
        let _ = goal_card.append_child(&toggle_btn);

        let _ = goals_section.append_child(&goal_card);
    }

    let _ = card.append_child(&goals_section);

    // Mom's note section
    let note_section = render::create_el_with_class(&doc, "div", "mom-note-section");
    let note_title = render::create_el_with_class(&doc, "h3", "mom-section-title");
    note_title.set_text_content(Some("\u{1F4DD} Note for Blaire"));
    let _ = note_section.append_child(&note_title);

    let note_input = render::create_el_with_class(&doc, "textarea", "mom-note-input");
    let _ = note_input.set_attribute("data-mom-note", "");
    let _ = note_input.set_attribute("placeholder", "Write an encouragement note for Blaire...");
    // Note: Removed rows="3" — Safari 26.2 field-sizing:content handles auto-grow
    let _ = note_section.append_child(&note_input);
    let _ = card.append_child(&note_section);

    // Save button
    let save_btn = render::create_button(&doc, "mom-save-btn", "\u{1F49C} Save Goals");
    let _ = save_btn.set_attribute("data-mom-save", "");
    let _ = card.append_child(&save_btn);

    let _ = overlay.append_child(&card);

    if let Some(body) = doc.body() {
        let _ = body.append_child(&overlay);
    }

    // Native <dialog> showModal() provides focus trap + Escape + backdrop
    let dialog: &web_sys::HtmlDialogElement = overlay.unchecked_ref();
    if let Err(e) = dialog.show_modal() {
        web_sys::console::warn_1(&format!("[mom_mode] dashboard dialog.show_modal() failed: {:?}", e).into());
        return;  // Don't show broken dashboard UI
    }

    bind_dashboard_interactions();

    // Load existing goals for this week
    wasm_bindgen_futures::spawn_local(async move {
        load_existing_goals().await;
    });
}

fn bind_dashboard_interactions() {
    let Some(dashboard) = dom::query("[data-mom-dashboard]") else { return };

    // Close button
    let dash_close = dashboard.clone();
    if let Some(close_btn) = dom::query("[data-mom-close]") {
        dom::on(close_btn.unchecked_ref(), "click", move |_: Event| {
            dash_close.remove();
        });
    }

    // Goal toggles and sliders (event delegation)
    dom::on(dashboard.unchecked_ref(), "click", move |event: Event| {
        let target = event.target().and_then(|t| t.dyn_into::<Element>().ok());
        let Some(el) = target else { return };

        // Toggle goal on/off
        if let Some(goal_type) = el.get_attribute("data-goal-toggle") {
            toggle_goal(&el, &goal_type);
            return;
        }

        // Slider minus
        if let Some(goal_type) = el.get_attribute("data-slider-minus")
            .or_else(|| el.closest("[data-slider-minus]").ok().flatten()
                .and_then(|e| e.get_attribute("data-slider-minus")))
        {
            adjust_slider(&goal_type, -1);
            return;
        }

        // Slider plus
        if let Some(goal_type) = el.get_attribute("data-slider-plus")
            .or_else(|| el.closest("[data-slider-plus]").ok().flatten()
                .and_then(|e| e.get_attribute("data-slider-plus")))
        {
            adjust_slider(&goal_type, 1);
            return;
        }

        // Save goals
        if el.closest("[data-mom-save]").ok().flatten().is_some() {
            wasm_bindgen_futures::spawn_local(async move {
                save_goals().await;
            });
        }
    });
}

fn toggle_goal(btn: &Element, _goal_type: &str) {
    let current_class = btn.get_attribute("class").unwrap_or_default();
    if current_class.contains("--off") {
        let _ = btn.set_attribute("class", "mom-goal-toggle mom-goal-toggle--on");
        btn.set_text_content(Some("\u{2705} Active"));
    } else {
        let _ = btn.set_attribute("class", "mom-goal-toggle mom-goal-toggle--off");
        btn.set_text_content(Some("Add Goal"));
    }
}

fn adjust_slider(goal_type: &str, delta: i32) {
    let selector = format!("[data-slider-value=\"{goal_type}\"]");
    let Some(value_el) = dom::query(&selector) else { return };

    let current: i32 = value_el.text_content()
        .and_then(|s| s.parse().ok())
        .unwrap_or(0);

    let (min, max) = match goal_type {
        "acts" => (5, 30),
        "quests" => (1, 7),
        "stories" => (1, 5),
        "games" => (1, 10),
        "hearts" => (10, 100),
        _ => (1, 100),
    };

    let step = if goal_type == "hearts" { 5 } else { 1 };
    let new_val = (current + delta * step).max(min).min(max);
    value_el.set_text_content(Some(&new_val.to_string()));
}

async fn save_goals() {
    let week = utils::week_key();
    let now = utils::now_epoch_ms() as i64;

    // Clear existing goals for this week
    let _ = db_client::exec(
        "DELETE FROM weekly_goals WHERE week_key = ?1",
        vec![week.clone()],
    ).await;

    // Collect active goals
    let goal_types = ["acts", "quests", "stories", "games", "hearts"];
    for goal_type in &goal_types {
        let toggle_sel = format!("[data-goal-toggle=\"{goal_type}\"]");
        let Some(toggle) = dom::query(&toggle_sel) else { continue };
        let class = toggle.get_attribute("class").unwrap_or_default();
        if !class.contains("--on") { continue; }

        let value_sel = format!("[data-slider-value=\"{goal_type}\"]");
        let target: u32 = dom::query(&value_sel)
            .and_then(|el| el.text_content())
            .and_then(|s| s.parse().ok())
            .unwrap_or(10);

        let id = utils::create_id();
        let _ = db_client::exec(
            "INSERT INTO weekly_goals (id, week_key, goal_type, target, progress, created_at) VALUES (?1, ?2, ?3, ?4, 0, ?5)",
            vec![id, week.clone(), goal_type.to_string(), target.to_string(), now.to_string()],
        ).await;
    }

    // Save mom's note
    if let Some(note_el) = dom::query("[data-mom-note]") {
        let note_text = js_sys::Reflect::get(note_el.as_ref(), &"value".into())
            .ok()
            .and_then(|v| v.as_string())
            .unwrap_or_default();
        if !note_text.trim().is_empty() {
            let note_id = utils::create_id();
            let _ = db_client::exec(
                "INSERT OR REPLACE INTO mom_notes (id, week_key, note_text, created_at) VALUES (?1, ?2, ?3, ?4)",
                vec![note_id, week.clone(), note_text.trim().to_string(), now.to_string()],
            ).await;
        }
    }

    // Close dashboard
    close_dashboard();

    // Notify weekly_goals module to refresh
    weekly_goals::refresh_goals();

    speech::speak("Goals saved! Let's have a great week!");
    synth_audio::chime();
}

fn close_dashboard() {
    if let Some(dash) = dom::query("[data-mom-dashboard]") {
        let dialog: &web_sys::HtmlDialogElement = dash.unchecked_ref();
        dialog.close();
        dash.remove();
    }
}

async fn load_existing_goals() {
    let week = utils::week_key();
    if let Ok(rows) = db_client::query(
        "SELECT goal_type, target FROM weekly_goals WHERE week_key = ?1",
        vec![week.clone()],
    ).await {
        if let Some(arr) = rows.as_array() {
            for row in arr {
                let Some(goal_type) = row.get("goal_type").and_then(|v| v.as_str()) else { continue };
                let target = row.get("target").and_then(|v| v.as_u64()).unwrap_or(10) as u32;

                // Set slider value
                let value_sel = format!("[data-slider-value=\"{goal_type}\"]");
                if let Some(value_el) = dom::query(&value_sel) {
                    value_el.set_text_content(Some(&target.to_string()));
                }

                // Activate toggle
                let toggle_sel = format!("[data-goal-toggle=\"{goal_type}\"]");
                if let Some(toggle) = dom::query(&toggle_sel) {
                    let _ = toggle.set_attribute("class", "mom-goal-toggle mom-goal-toggle--on");
                    toggle.set_text_content(Some("\u{2705} Active"));
                }
            }
        }
    }

    // Load existing note
    if let Ok(rows) = db_client::query(
        "SELECT note_text FROM mom_notes WHERE week_key = ?1 ORDER BY created_at DESC LIMIT 1",
        vec![week],
    ).await {
        if let Some(note) = rows.as_array()
            .and_then(|a| a.first())
            .and_then(|r| r.get("note_text"))
            .and_then(|v| v.as_str())
        {
            if let Some(note_el) = dom::query("[data-mom-note]") {
                let _ = js_sys::Reflect::set(note_el.as_ref(), &"value".into(), &note.into());
            }
        }
    }
}


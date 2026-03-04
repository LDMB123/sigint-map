use crate::{
    browser_apis, constants,
    db_messages::{DB_SCHEMA_VERSION, EXPORT_FORMAT_VERSION},
    dom, domain_services, feature_flags, mom_mode_store, parent_insights, reliability, render, speech,
    state::AppState, synth_audio, utils,
};
use std::cell::RefCell;
use std::rc::Rc;
use wasm_bindgen::JsCast;
use web_sys::{Element, Event};
thread_local! {
    static MOM_STATE: RefCell<Option<MomModeState>> = const { RefCell::new(None) };
}
struct MomModeState {
    state: Rc<RefCell<AppState>>,
    pin_set: bool,
}

const DASHBOARD_FEATURE_TOGGLES: &[(&str, &str, &str)] = &[
    (
        feature_flags::FEATURE_SKILL_PROGRESSION,
        "Skill Progression",
        "Track mastery updates and badge progression.",
    ),
    (
        feature_flags::FEATURE_ADAPTIVE_QUESTS,
        "Adaptive Quests",
        "Use least-practiced skill focus to pick quests.",
    ),
    (
        feature_flags::FEATURE_REFLECTION,
        "Reflection Prompts",
        "Show delayed reflection prompt after kind acts.",
    ),
    (
        feature_flags::FEATURE_PARENT_INSIGHTS,
        "Mom Insights",
        "Generate and show weekly insights analytics.",
    ),
];

const RELIABILITY_DOMAINS: &[(&str, &str)] = &[
    (reliability::DOMAIN_PROGRESSION, "Progression"),
    (reliability::DOMAIN_REFLECTION, "Reflection"),
    (reliability::DOMAIN_INSIGHTS, "Insights"),
];
pub fn init(state: Rc<RefCell<AppState>>) {
    MOM_STATE.with(|m| {
        *m.borrow_mut() = Some(MomModeState {
            state: state.clone(),
            pin_set: false,
        });
    });
    bind_long_press();
    wasm_bindgen_futures::spawn_local(check_pin_exists(state));
}
async fn check_pin_exists(state: Rc<RefCell<AppState>>) {
    let has_pin = mom_mode_store::has_parent_pin().await;
    MOM_STATE.with(|m| {
        if let Some(mom) = m.borrow_mut().as_mut() {
            mom.pin_set = has_pin;
        }
    });
    state.borrow_mut().parent_pin_set = has_pin;
}
fn bind_long_press() {
    let Some(title) = dom::query(".home-title") else {
        return;
    };
    let timer_id: Rc<RefCell<Option<i32>>> = Rc::new(RefCell::new(None));
    let timer_down = timer_id.clone();
    dom::on(title.unchecked_ref(), "pointerdown", move |_: Event| {
        let timer_ref = timer_down.clone();
        let id = dom::set_timeout_cancelable(constants::MOM_MODE_LONG_PRESS_MS, move || {
            *timer_ref.borrow_mut() = None;
            synth_audio::chime();
            show_pin_overlay();
        });
        *timer_down.borrow_mut() = Some(id);
    });
    let timer_up = timer_id;
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
    let is_setup = MOM_STATE.with(|m| m.borrow().as_ref().is_none_or(|s| !s.pin_set));
    let doc = dom::document();
    let Some(overlay) =
        render::create_el_with_data(&doc, "dialog", "mom-overlay", "data-mom-overlay")
    else {
        return;
    };
    dom::set_attr(&overlay, "aria-label", "Enter PIN");
    let Some(card) = render::create_el_with_class(&doc, "div", "mom-pin-card") else {
        return;
    };
    let Some(title) = render::create_el_with_class(&doc, "h2", "mom-pin-title") else {
        return;
    };
    if is_setup {
        title.set_text_content(None);
        dom::safe_set_inner_html(
            &title,
            r#"<img src="illustrations/stickers/heart-purple.webp" class="inline-emoji"/> Hi Mom! Set a 4-digit code"#,
        );
    } else {
        title.set_text_content(None);
        dom::safe_set_inner_html(
            &title,
            r#"<img src="illustrations/stickers/lock-gold.webp" class="inline-emoji"/> Enter your PIN"#,
        );
    }
    let _ = card.append_child(&title);
    let Some(dots) = render::create_el_with_data(&doc, "div", "mom-pin-dots", "data-pin-dots")
    else {
        return;
    };
    for i in 0..4 {
        let Some(dot) = render::create_el_with_class(&doc, "span", "mom-pin-dot") else {
            continue;
        };
        dom::set_attr(&dot, "data-dot", &i.to_string());
        dot.set_text_content(Some("\u{25CB}"));
        let _ = dots.append_child(&dot);
    }
    let _ = card.append_child(&dots);
    let Some(pad) = render::create_el_with_class(&doc, "div", "mom-numpad") else {
        return;
    };
    for n in 1..=9 {
        let Some(btn) = render::create_button(&doc, "mom-numpad-btn", &n.to_string()) else {
            continue;
        };
        dom::set_attr(&btn, "data-pin-digit", &n.to_string());
        dom::set_attr(&btn, "aria-label", &format!("digit {n}"));
        let _ = pad.append_child(&btn);
    }
    let Some(empty) = render::create_el_with_class(&doc, "div", "mom-numpad-spacer") else {
        return;
    };
    let _ = pad.append_child(&empty);
    let Some(zero_btn) = render::create_button(&doc, "mom-numpad-btn", "0") else {
        return;
    };
    dom::set_attr(&zero_btn, "data-pin-digit", "0");
    dom::set_attr(&zero_btn, "aria-label", "digit 0");
    let _ = pad.append_child(&zero_btn);
    let Some(del_btn) = render::create_button_with_data(
        &doc,
        "mom-numpad-btn mom-numpad-btn--del",
        "\u{232B}",
        "data-pin-delete",
    ) else {
        return;
    };
    dom::set_attr(&del_btn, "aria-label", "Delete");
    let _ = pad.append_child(&del_btn);
    let _ = card.append_child(&pad);
    let Some(error) = render::create_el_with_data(&doc, "p", "mom-pin-error", "data-pin-error")
    else {
        return;
    };
    dom::set_attr(&error, "hidden", "");
    error.set_text_content(Some("\u{1F512} That\u{2019}s not quite right \u{2014} try again!"));
    let _ = card.append_child(&error);
    let Some(cancel) = render::create_button_with_data(
        &doc,
        "mom-cancel-btn",
        "\u{2715} Cancel",
        "data-mom-cancel",
    ) else {
        return;
    };
    let _ = card.append_child(&cancel);
    let _ = overlay.append_child(&card);
    let _ = dom::body().append_child(&overlay);
    let dialog: &web_sys::HtmlDialogElement = overlay.unchecked_ref();
    if let Err(e) = dialog.show_modal() {
        dom::warn(&format!("[mom_mode] PIN dialog.show_modal() failed: {e:?}"));
        return;
    }
    bind_pin_interactions(is_setup);
}
fn bind_pin_interactions(is_setup: bool) {
    let Some(overlay) = dom::query("[data-mom-overlay]") else {
        return;
    };
    let entered = Rc::new(RefCell::new(String::new()));
    if let Some(cancel) = dom::query("[data-mom-cancel]") {
        dom::on(cancel.unchecked_ref(), "click", move |_: Event| {
            close_pin_overlay();
        });
    }
    dom::on(overlay.unchecked_ref(), "cancel", move |_: Event| {
        close_pin_overlay();
    });
    let entered_click = entered;
    let setup = is_setup;
    dom::on(overlay.unchecked_ref(), "click", move |event: Event| {
        let Some(el) = dom::event_target_element(&event) else {
            return;
        };
        if dom::closest(&el, "[data-pin-delete]").is_some() {
            let mut pin = entered_click.borrow_mut();
            pin.pop();
            update_pin_dots(pin.len());
            dom::hide("[data-pin-error]");
            return;
        }
        if let Some(btn) = dom::closest(&el, "[data-pin-digit]") {
            if let Some(digit) = dom::get_attr(&btn, "data-pin-digit") {
                let mut pin = entered_click.borrow_mut();
                if pin.len() < 4 {
                    pin.push_str(&digit);
                    update_pin_dots(pin.len());
                    if pin.len() == 4 {
                        let full_pin = pin.clone();
                        drop(pin);
                        if setup {
                            let pin_val = full_pin;
                            wasm_bindgen_futures::spawn_local(async move {
                                save_pin(&pin_val).await;
                            });
                        } else {
                            let pin_val = full_pin;
                            let entered_reset = entered_click.clone();
                            wasm_bindgen_futures::spawn_local(async move {
                                let ok = verify_pin(&pin_val).await;
                                if !ok {
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
    use std::fmt::Write;
    for i in 0..4 {
        let selector = dom::with_buf(|buf| {
            let _ = write!(buf, "{i}");
            buf.clone()
        });
        if let Some(dot) = dom::query_data("dot", &selector) {
            if i < count {
                dot.set_text_content(Some("\u{25CF}"));
                dom::set_attr(&dot, "class", "mom-pin-dot mom-pin-dot--filled");
            } else {
                dot.set_text_content(Some("\u{25CB}"));
                dom::set_attr(&dot, "class", "mom-pin-dot");
            }
        }
    }
}
async fn save_pin(pin: &str) {
    mom_mode_store::set_parent_pin(pin).await;
    MOM_STATE.with(|m| {
        if let Some(mom) = m.borrow_mut().as_mut() {
            mom.pin_set = true;
            mom.state.borrow_mut().parent_pin_set = true;
        }
    });
    close_pin_overlay();
    speech::speak("PIN set! Welcome to Mom Mode!");
    show_dashboard();
}
async fn verify_pin(entered: &str) -> bool {
    // Rate limiting: check lockout before anything else
    let now_ms = utils::now_epoch_ms();
    if let Some(locked_until) = mom_mode_store::get_pin_lockout_until().await {
        if now_ms < locked_until {
            let remaining_secs = ((locked_until - now_ms) / 1000.0).ceil() as u32;
            dom::warn(&format!("[mom_mode] PIN locked for {}s", remaining_secs));
            dom::show("[data-pin-error]");
            update_pin_dots(0);
            return false;
        }
    }

    let Some(stored) = get_parent_pin().await else {
        dom::warn("[mom_mode] No PIN stored — cannot verify");
        dom::show("[data-pin-error]");
        update_pin_dots(0);
        return false;
    };

    if entered == stored {
        // Clear rate-limit counters on success
        mom_mode_store::clear_pin_rate_limit().await;
        close_pin_overlay();
        synth_audio::chime();
        show_dashboard();
        true
    } else {
        // Increment failure counter
        let attempts = mom_mode_store::get_pin_failed_attempts().await + 1;
        mom_mode_store::set_pin_failed_attempts(attempts).await;

        // Progressive delay: 1s after attempt 3, 2s after attempt 4; lockout after 5
        if attempts >= 5 {
            let lockout_until = now_ms + 300_000.0; // 5-minute lockout
            mom_mode_store::set_pin_lockout_until(lockout_until as u64).await;
            dom::warn("[mom_mode] PIN locked for 5 minutes after 5 failed attempts");
        } else if attempts >= 4 {
            browser_apis::sleep_ms(2000).await;
        } else if attempts >= 3 {
            browser_apis::sleep_ms(1000).await;
        }

        dom::show("[data-pin-error]");
        update_pin_dots(0);
        false
    }
}
pub async fn get_parent_pin() -> Option<String> {
    mom_mode_store::get_parent_pin().await
}
fn close_dialog(selector: &str) {
    if let Some(el) = dom::query(selector) {
        el.unchecked_ref::<web_sys::HtmlDialogElement>().close();
        el.remove();
    }
}
fn close_pin_overlay() {
    close_dialog("[data-mom-overlay]");
}
fn show_dashboard() {
    let doc = dom::document();
    let Some(overlay) = render::create_el_with_data(
        &doc,
        "dialog",
        "mom-overlay mom-overlay--dashboard",
        "data-mom-dashboard",
    ) else {
        return;
    };
    dom::set_attr(&overlay, "aria-label", "Mom's Dashboard");
    let Some(card) = render::create_el_with_class(&doc, "div", "mom-dashboard-card") else {
        return;
    };
    let Some(header) = render::create_el_with_class(&doc, "div", "mom-dashboard-header") else {
        return;
    };
    let Some(title) = render::create_el_with_class(&doc, "h2", "mom-dashboard-title") else {
        return;
    };
    dom::safe_set_inner_html(&title, r#"<img src="illustrations/stickers/heart-purple.webp" class="inline-emoji"/> Mom's Dashboard"#);
    let _ = header.append_child(&title);
    let Some(close_btn) =
        render::create_button_with_data(&doc, "mom-close-btn", "\u{2715}", "data-mom-close")
    else {
        return;
    };
    let _ = header.append_child(&close_btn);
    let _ = card.append_child(&header);
    let week = utils::week_key();
    let Some(week_label) = render::create_el_with_class(&doc, "p", "mom-week-label") else {
        return;
    };
    if let Some(img) = render::create_img(&doc, "illustrations/stickers/calendar-magic.webp", "Calendar", "inline-emoji") {
        let _ = week_label.append_child(&img);
    }
    render::append_text(&doc, &week_label, "span", "", &format!(" Week: {week}"));
    let _ = card.append_child(&week_label);
    let Some(insights_section) =
        render::create_el_with_data(&doc, "div", "mom-insights-section", "data-mom-insights")
    else {
        return;
    };
    let Some(insights_title) = render::create_el_with_class(&doc, "h3", "mom-section-title") else {
        return;
    };
    dom::safe_set_inner_html(&insights_title, r#"<img src="illustrations/stickers/chart-sparkle.webp" class="inline-emoji"/> Weekly Insights"#);
    let _ = insights_section.append_child(&insights_title);
    let Some(insights_loader) = render::create_el_with_class(&doc, "div", "mom-insights-loader")
    else {
        return;
    };
    insights_loader.set_text_content(Some("Loading Blaire's analytics..."));
    let _ = insights_section.append_child(&insights_loader);
    let _ = card.append_child(&insights_section);
    let Some(toggle_section) = render::create_el_with_data(
        &doc,
        "div",
        "mom-goals-section",
        "data-mom-feature-toggles",
    ) else {
        return;
    };
    let Some(toggle_title) = render::create_el_with_class(&doc, "h3", "mom-section-title") else {
        return;
    };
    dom::safe_set_inner_html(
        &toggle_title,
        r#"<img src="illustrations/stickers/lock-gold.webp" class="inline-emoji"/> Safety Toggles (Local)"#,
    );
    let _ = toggle_section.append_child(&toggle_title);
    for (feature_key, feature_label, feature_desc) in DASHBOARD_FEATURE_TOGGLES {
        let Some(toggle_card) = render::create_el_with_class(&doc, "div", "mom-goal-card") else {
            continue;
        };
        let Some(toggle_header) =
            render::create_el_with_class(&doc, "div", "mom-goal-header")
        else {
            continue;
        };
        render::append_text(&doc, &toggle_header, "span", "mom-goal-label", feature_label);
        let _ = toggle_card.append_child(&toggle_header);
        render::append_text(&doc, &toggle_card, "p", "mom-goal-desc", feature_desc);
        let Some(toggle_btn) =
            render::create_button(&doc, "mom-goal-toggle mom-goal-toggle--off", "Disabled")
        else {
            continue;
        };
        dom::set_attr(&toggle_btn, "data-feature-toggle", feature_key);
        let _ = toggle_card.append_child(&toggle_btn);
        let _ = toggle_section.append_child(&toggle_card);
    }
    let _ = card.append_child(&toggle_section);
    let Some(reliability_section) = render::create_el_with_data(
        &doc,
        "div",
        "mom-insights-section",
        "data-mom-reliability",
    ) else {
        return;
    };
    let Some(reliability_title) = render::create_el_with_class(&doc, "h3", "mom-section-title")
    else {
        return;
    };
    dom::safe_set_inner_html(
        &reliability_title,
        r#"<img src="illustrations/stickers/chart-sparkle.webp" class="inline-emoji"/> Runtime Reliability"#,
    );
    let _ = reliability_section.append_child(&reliability_title);
    let Some(reliability_loader) =
        render::create_el_with_class(&doc, "div", "mom-insights-loader")
    else {
        return;
    };
    reliability_loader.set_text_content(Some("Loading runtime counters..."));
    let _ = reliability_section.append_child(&reliability_loader);
    let _ = card.append_child(&reliability_section);
    let Some(goals_section) = render::create_el_with_class(&doc, "div", "mom-goals-section") else {
        return;
    };
    let Some(goals_title) = render::create_el_with_class(&doc, "h3", "mom-section-title") else {
        return;
    };
    dom::safe_set_inner_html(&goals_title, r#"<img src="illustrations/stickers/glowing-star.webp" class="inline-emoji"/> Set Weekly Goals"#);
    let _ = goals_section.append_child(&goals_title);
    let goal_types = [
        (
            "acts",
            r#"<img src="illustrations/stickers/heart-sparkling.webp" class="inline-emoji"/>"#,
            "Kind Acts",
            "How many kind acts this week?",
            5,
            30,
            10,
        ),
        (
            "quests",
            r#"<img src="illustrations/stickers/star-gold.webp" class="inline-emoji"/>"#,
            "Quest Days",
            "Complete quests on how many days?",
            1,
            7,
            3,
        ),
        (
            "stories",
            r#"<img src="illustrations/stickers/rainbow.webp" class="inline-emoji"/>"#,
            "Stories",
            "Read how many stories?",
            1,
            5,
            2,
        ),
        (
            "games",
            r#"<img src="illustrations/stickers/confetti-ball.webp" class="inline-emoji"/>"#,
            "Games",
            "Play how many games?",
            1,
            10,
            5,
        ),
        (
            "hearts",
            r#"<img src="illustrations/stickers/heart-purple.webp" class="inline-emoji"/>"#,
            "Hearts",
            "Earn how many hearts?",
            10,
            100,
            25,
        ),
    ];
    for (goal_type, emoji, label, desc, _min, _max, default) in &goal_types {
        let Some(goal_card) = render::create_el_with_class(&doc, "div", "mom-goal-card") else {
            continue;
        };
        dom::set_attr(&goal_card, "data-goal-type", goal_type);
        let Some(goal_header) = render::create_el_with_class(&doc, "div", "mom-goal-header") else {
            continue;
        };
        if emoji.starts_with("<img") {
            let Some(spark_span) = render::create_el_with_class(&doc, "span", "mom-goal-emoji") else { continue; };
            dom::safe_set_inner_html(&spark_span, emoji);
            let _ = goal_header.append_child(&spark_span);
        } else {
            render::append_text(&doc, &goal_header, "span", "mom-goal-emoji", emoji);
        }
        render::append_text(&doc, &goal_header, "span", "mom-goal-label", label);
        let _ = goal_card.append_child(&goal_header);
        render::append_text(&doc, &goal_card, "p", "mom-goal-desc", desc);
        let Some(slider_row) = render::create_el_with_class(&doc, "div", "mom-slider-row") else {
            continue;
        };
        let Some(minus_btn) = render::create_button(&doc, "mom-slider-btn", "\u{2796}") else {
            continue;
        };
        dom::set_attr(&minus_btn, "data-slider-minus", goal_type);
        let _ = slider_row.append_child(&minus_btn);
        let Some(value_el) = render::create_el_with_class(&doc, "span", "mom-slider-value") else {
            continue;
        };
        dom::set_attr(&value_el, "data-slider-value", goal_type);
        value_el.set_text_content(Some(&default.to_string()));
        let _ = slider_row.append_child(&value_el);
        let Some(plus_btn) = render::create_button(&doc, "mom-slider-btn", "\u{2795}") else {
            continue;
        };
        dom::set_attr(&plus_btn, "data-slider-plus", goal_type);
        let _ = slider_row.append_child(&plus_btn);
        let _ = goal_card.append_child(&slider_row);
        let Some(toggle_btn) =
            render::create_button(&doc, "mom-goal-toggle mom-goal-toggle--off", "Add Goal")
        else {
            continue;
        };
        dom::set_attr(&toggle_btn, "data-goal-toggle", goal_type);
        let _ = goal_card.append_child(&toggle_btn);
        let _ = goals_section.append_child(&goal_card);
    }
    let _ = card.append_child(&goals_section);
    let Some(note_section) = render::create_el_with_class(&doc, "div", "mom-note-section") else {
        return;
    };
    let Some(note_title) = render::create_el_with_class(&doc, "h3", "mom-section-title") else {
        return;
    };
    dom::safe_set_inner_html(&note_title, r#"<img src="illustrations/stickers/pencil-star.webp" class="inline-emoji"/> Note for Blaire"#);
    let _ = note_section.append_child(&note_title);
    let Some(note_input) =
        render::create_el_with_data(&doc, "textarea", "mom-note-input", "data-mom-note")
    else {
        return;
    };
    dom::set_attr(
        &note_input,
        "placeholder",
        "Write an encouragement note for Blaire...",
    );
    let _ = note_section.append_child(&note_input);
    let _ = card.append_child(&note_section);
    let Some(save_btn) = render::create_button_with_data(
        &doc,
        "mom-save-btn",
        "\u{1F49C} Save Goals",
        "data-mom-save",
    ) else {
        return;
    };
    let _ = card.append_child(&save_btn);
    let Some(export_row) = render::create_el_with_class(&doc, "div", "mom-export-row") else {
        return;
    };
    let Some(export_json) = render::create_button_with_data(
        &doc,
        "mom-export-btn",
        "\u{1F4E6} Export JSON",
        "data-mom-export-json",
    ) else {
        return;
    };
    let _ = export_row.append_child(&export_json);
    let Some(export_csv) = render::create_button_with_data(
        &doc,
        "mom-export-btn",
        "\u{1F4CA} Export CSV",
        "data-mom-export-csv",
    ) else {
        return;
    };
    let _ = export_row.append_child(&export_csv);
    let Some(restore_json) = render::create_button_with_data(
        &doc,
        "mom-export-btn",
        "\u{1F504} Restore JSON",
        "data-mom-restore-json",
    ) else {
        return;
    };
    let _ = export_row.append_child(&restore_json);
    let _ = card.append_child(&export_row);
    let Some(restore_input) = render::create_el_with_class(&doc, "input", "mom-restore-input")
    else {
        return;
    };
    for (k, v) in [
        ("data-mom-restore-input", ""),
        ("type", "file"),
        ("accept", "application/json"),
        ("hidden", ""),
    ] {
        dom::set_attr(&restore_input, k, v);
    }
    let _ = card.append_child(&restore_input);
    let _ = overlay.append_child(&card);
    let _ = dom::body().append_child(&overlay);
    let dialog: &web_sys::HtmlDialogElement = overlay.unchecked_ref();
    if let Err(e) = dialog.show_modal() {
        dom::warn(&format!(
            "[mom_mode] dashboard dialog.show_modal() failed: {e:?}"
        ));
        return;
    }
    bind_dashboard_interactions();
    wasm_bindgen_futures::spawn_local(load_existing_goals());
    wasm_bindgen_futures::spawn_local(load_feature_toggles());
    wasm_bindgen_futures::spawn_local(load_reliability_counters());
}
fn bind_dashboard_interactions() {
    let Some(dashboard) = dom::query("[data-mom-dashboard]") else {
        return;
    };
    let dash_close = dashboard.clone();
    if let Some(close_btn) = dom::query("[data-mom-close]") {
        dom::on(close_btn.unchecked_ref(), "click", move |_: Event| {
            dash_close.remove();
        });
    }
    dom::on(dashboard.unchecked_ref(), "click", move |event: Event| {
        let Some(el) = dom::event_target_element(&event) else {
            return;
        };
        if let Some(feature_key) = closest_attr(&el, "data-feature-toggle") {
            let key = feature_key.clone();
            wasm_bindgen_futures::spawn_local(async move {
                toggle_feature(&key).await;
            });
            return;
        }
        if let Some(goal_type) = dom::get_attr(&el, "data-goal-toggle") {
            toggle_goal(&el, &goal_type);
            return;
        }
        for (attr, delta) in [("data-slider-minus", -1), ("data-slider-plus", 1)] {
            if let Some(goal_type) = closest_attr(&el, attr) {
                adjust_slider(&goal_type, delta);
                return;
            }
        }
        let spawn_if =
            |sel: &str, f: std::pin::Pin<Box<dyn std::future::Future<Output = ()>>>| -> bool {
                if dom::closest(&el, sel).is_some() {
                    wasm_bindgen_futures::spawn_local(f);
                    true
                } else {
                    false
                }
            };
        if spawn_if("[data-mom-save]", Box::pin(save_goals())) {
            return;
        }
        if spawn_if("[data-mom-export-json]", Box::pin(export_json_backup())) {
            return;
        }
        if spawn_if("[data-mom-export-csv]", Box::pin(export_kind_acts_csv())) {
            return;
        }
        if dom::closest(&el, "[data-mom-restore-json]").is_some() {
            if let Some(input_el) = dom::query("[data-mom-restore-input]") {
                let _ = js_sys::Reflect::get(input_el.as_ref(), &"click".into())
                    .ok()
                    .and_then(|f| f.dyn_into::<js_sys::Function>().ok())
                    .and_then(|f| f.call0(input_el.as_ref()).ok());
            }
        }
    });
    if let Some(restore_input) = dom::query("[data-mom-restore-input]") {
        dom::on(
            restore_input.unchecked_ref(),
            "change",
            move |event: Event| {
                let Some(target) = event.target() else { return };
                let files = js_sys::Reflect::get(target.as_ref(), &"files".into()).ok();
                let file = files.and_then(|fl| {
                    js_sys::Reflect::get(&fl, &wasm_bindgen::JsValue::from(0u32)).ok()
                });
                let Some(file) = file.filter(|f| !f.is_undefined() && !f.is_null()) else {
                    return;
                };
                let text_fn = js_sys::Reflect::get(&file, &"text".into())
                    .ok()
                    .and_then(|f| f.dyn_into::<js_sys::Function>().ok());
                let Some(text_fn) = text_fn else { return };
                let Ok(promise) = text_fn.call0(&file) else { return };
                let promise = js_sys::Promise::from(promise);
                wasm_bindgen_futures::spawn_local(async move {
                    match wasm_bindgen_futures::JsFuture::from(promise).await {
                        Ok(text_val) => {
                            if let Some(snapshot_json) = text_val.as_string() {
                                if let Err(e) = mom_mode_store::restore_snapshot(snapshot_json).await {
                                    dom::warn(&format!(
                                        "[mom_mode] restore_snapshot failed: {e:?}"
                                    ));
                                    dom::toast("Restore failed \u{274C}");
                                } else {
                                    dom::toast("Restored! \u{2705}");
                                    speech::speak("Restore complete!");
                                }
                            }
                        }
                        Err(e) => {
                            dom::warn(&format!("[mom_mode] file read failed: {e:?}"));
                            dom::toast("Could not read file \u{274C}");
                        }
                    }
                });
            },
        );
    }
}
fn closest_attr(el: &Element, attr: &str) -> Option<String> {
    dom::get_attr(el, attr).or_else(|| {
        dom::with_buf(|buf| {
            buf.push('[');
            buf.push_str(attr);
            buf.push(']');
            dom::closest(el, buf).and_then(|e| dom::get_attr(&e, attr))
        })
    })
}

fn set_feature_toggle_visual(btn: &Element, enabled: bool) {
    if enabled {
        dom::set_attr(btn, "class", "mom-goal-toggle mom-goal-toggle--on");
        btn.set_text_content(Some("Enabled"));
    } else {
        dom::set_attr(btn, "class", "mom-goal-toggle mom-goal-toggle--off");
        btn.set_text_content(Some("Disabled"));
    }
}

fn feature_label(feature_key: &str) -> &'static str {
    match feature_key {
        feature_flags::FEATURE_SKILL_PROGRESSION => "Skill Progression",
        feature_flags::FEATURE_ADAPTIVE_QUESTS => "Adaptive Quests",
        feature_flags::FEATURE_REFLECTION => "Reflection Prompts",
        feature_flags::FEATURE_PARENT_INSIGHTS => "Mom Insights",
        _ => "Feature",
    }
}

async fn load_feature_toggles() {
    let statuses = feature_flags::get_all().await;
    for (feature_key, enabled) in statuses {
        if let Some(btn) = dom::query_data("feature-toggle", &feature_key) {
            set_feature_toggle_visual(&btn, enabled);
        }
    }
}

async fn toggle_feature(feature_key: &str) {
    let enabled = feature_flags::is_enabled(feature_key).await;
    let next_state = !enabled;
    feature_flags::set_enabled(feature_key, next_state).await;
    if let Some(btn) = dom::query_data("feature-toggle", feature_key) {
        set_feature_toggle_visual(&btn, next_state);
    }
    dom::toast(&format!(
        "{} {}",
        feature_label(feature_key),
        if next_state { "enabled" } else { "disabled" }
    ));
    if feature_key == feature_flags::FEATURE_PARENT_INSIGHTS {
        if next_state {
            render_insights(&utils::week_key()).await;
        } else if let Some(insights_box) = dom::query("[data-mom-insights]") {
            if let Ok(Some(loader)) = insights_box.query_selector(".mom-insights-loader") {
                loader.remove();
            }
            if let Ok(nodes) = insights_box.query_selector_all(".mom-insight-summary, .mom-insight-bars, .mom-insight-empty") {
                for idx in 0..nodes.length() {
                    if let Some(node) = nodes.item(idx) {
                        if let Some(el) = node.dyn_ref::<Element>() {
                            el.remove();
                        }
                    }
                }
            }
            let doc = dom::document();
            render::append_text(
                &doc,
                &insights_box,
                "p",
                "mom-insight-empty",
                "Insights disabled via local safety toggle.",
            );
        }
    }
}

async fn load_reliability_counters() {
    let Some(section) = dom::query("[data-mom-reliability]") else {
        return;
    };
    if let Ok(Some(loader)) = section.query_selector(".mom-insights-loader") {
        loader.remove();
    }
    let doc = dom::document();
    let Some(rows) = render::create_el_with_class(&doc, "div", "mom-insight-bars") else {
        return;
    };
    for (domain, label_text) in RELIABILITY_DOMAINS {
        let (success, failure) = reliability::read_counts(domain).await;
        let total = success + failure;
        let success_rate = if total == 0 {
            100
        } else {
            ((success as f64 / total as f64) * 100.0).round() as u32
        };
        let Some(row) = render::create_el_with_class(&doc, "div", "mom-skill-row") else {
            continue;
        };
        let Some(label) = render::create_el_with_class(&doc, "div", "mom-skill-label") else {
            continue;
        };
        label.set_text_content(Some(&format!(
            "{} · {}✅ {}❌",
            label_text, success, failure
        )));
        let _ = row.append_child(&label);
        let Some(track) = render::create_el_with_class(&doc, "div", "mom-skill-track") else {
            continue;
        };
        let Some(fill) = render::create_el_with_class(&doc, "div", "mom-skill-fill") else {
            continue;
        };
        dom::set_attr(&fill, "style", &format!("width: {}%;", success_rate.min(100)));
        let _ = track.append_child(&fill);
        let _ = row.append_child(&track);
        let Some(pct) = render::create_el_with_class(&doc, "div", "mom-skill-pct") else {
            continue;
        };
        pct.set_text_content(Some(&format!("{}%", success_rate.min(100))));
        let _ = row.append_child(&pct);
        let _ = rows.append_child(&row);
    }
    let _ = section.append_child(&rows);
}

fn toggle_goal(btn: &Element, _goal_type: &str) {
    if dom::get_attr(btn, "class")
        .unwrap_or_default()
        .contains("--off")
    {
        dom::set_attr(btn, "class", "mom-goal-toggle mom-goal-toggle--on");
        btn.set_text_content(Some("\u{2705} Active"));
    } else {
        dom::set_attr(btn, "class", "mom-goal-toggle mom-goal-toggle--off");
        btn.set_text_content(Some("Add Goal"));
    }
}
fn adjust_slider(goal_type: &str, delta: i32) {
    let Some(value_el) = dom::query_data("slider-value", goal_type) else {
        return;
    };
    let current: i32 = value_el
        .text_content()
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
    value_el.set_text_content(Some(
        &(current + delta * step).max(min).min(max).to_string(),
    ));
}
async fn save_goals() {
    let week = utils::week_key();
    let now = utils::now_epoch_ms() as i64;
    let mut goals_to_insert: Vec<mom_mode_store::GoalInsert> = Vec::new();
    let goal_types = ["acts", "quests", "stories", "games", "hearts"];
    for goal_type in &goal_types {
        let Some(toggle) = dom::query_data("goal-toggle", goal_type) else {
            continue;
        };
        let class = dom::get_attr(&toggle, "class").unwrap_or_default();
        if !class.contains("--on") {
            continue;
        }
        let target: u32 = dom::query_data("slider-value", goal_type)
            .and_then(|el| el.text_content())
            .and_then(|s| s.parse().ok())
            .unwrap_or(10);
        let id = utils::create_id();
        goals_to_insert.push(mom_mode_store::GoalInsert {
            id,
            goal_type: goal_type.to_string(),
            target,
        });
    }

    mom_mode_store::replace_weekly_goals(&week, &goals_to_insert, now).await;

    if let Some(note_el) = dom::query("[data-mom-note]") {
        let note_text = js_sys::Reflect::get(note_el.as_ref(), &"value".into())
            .ok()
            .and_then(|v| v.as_string())
            .unwrap_or_default();
        if !note_text.trim().is_empty() {
            mom_mode_store::upsert_mom_note(&week, note_text.trim(), now).await;
        }
    }
    close_dashboard();
    domain_services::refresh_weekly_goals();
    speech::speak("Goals saved! Let's have a great week!");
    synth_audio::chime();
}
fn close_dashboard() {
    close_dialog("[data-mom-dashboard]");
}
async fn load_existing_goals() {
    let week = utils::week_key();
    let (goals_rows, note_rows) = mom_mode_store::load_existing_goals_and_note(&week).await;

    if let Ok(rows) = goals_rows {
        if let Some(arr) = rows.as_array() {
            for row in arr {
                let Some(goal_type) = row.get("goal_type").and_then(|v| v.as_str()) else {
                    continue;
                };
                let target = row.get("target").and_then(|v| v.as_u64()).unwrap_or(10) as u32;
                if let Some(value_el) = dom::query_data("slider-value", goal_type) {
                    value_el.set_text_content(Some(&target.to_string()));
                }
                if let Some(toggle) = dom::query_data("goal-toggle", goal_type) {
                    dom::set_attr(&toggle, "class", "mom-goal-toggle mom-goal-toggle--on");
                    toggle.set_text_content(Some("\u{2705} Active"));
                }
            }
        }
    }

    if let Ok(rows) = note_rows {
        if let Some(note) = rows
            .as_array()
            .and_then(|a| a.first())
            .and_then(|r| r.get("note_text"))
            .and_then(|v| v.as_str())
        {
            if let Some(note_el) = dom::query("[data-mom-note]") {
                let _ = js_sys::Reflect::set(note_el.as_ref(), &"value".into(), &note.into());
            }
        }
    }

    render_insights(&week).await;
}

async fn render_insights(week_key: &str) {
    let Some(insights_box) = dom::query("[data-mom-insights]") else {
        return;
    };
    if let Ok(Some(loader)) = insights_box.query_selector(".mom-insights-loader") {
        loader.remove();
    }
    if let Ok(nodes) =
        insights_box.query_selector_all(".mom-insight-summary, .mom-insight-bars, .mom-insight-empty")
    {
        for idx in 0..nodes.length() {
            if let Some(node) = nodes.item(idx) {
                if let Some(el) = node.dyn_ref::<Element>() {
                    el.remove();
                }
            }
        }
    }

    if !feature_flags::is_parent_insights_enabled().await {
        let doc = dom::document();
        render::append_text(
            &doc,
            &insights_box,
            "p",
            "mom-insight-empty",
            "Insights disabled via local safety toggle.",
        );
        return;
    }

    let doc = dom::document();
    let insights_opt = parent_insights::get_weekly_insights(week_key).await;

    let Some(insights) = insights_opt else {
        render::append_text(
            &doc,
            &insights_box,
            "p",
            "mom-insight-empty",
            "\u{2728} No kindness acts logged yet this week! Play some games to generate insights.",
        );
        return;
    };

    let Some(summary) = render::create_el_with_class(&doc, "div", "mom-insight-summary") else {
        return;
    };
    render::append_text(
        &doc,
        &summary,
        "p",
        "mom-insight-pattern",
        &insights.pattern_text,
    );

    dom::with_buf(|buf| {
        use std::fmt::Write;
        let _ = write!(
            buf,
            "Reflection Rate: {}% of acts were followed by an emotional reflection",
            insights.reflection_rate
        );
        render::append_text(&doc, &summary, "p", "mom-insight-reflection", buf);
    });
    let _ = insights_box.append_child(&summary);

    if !insights.skill_breakdown.is_empty() {
        let Some(bars) = render::create_el_with_class(&doc, "div", "mom-insight-bars") else {
            return;
        };
        for skill in insights.skill_breakdown {
            let Some(row) = render::create_el_with_class(&doc, "div", "mom-skill-row") else {
                continue;
            };
            let Some(label) = render::create_el_with_class(&doc, "div", "mom-skill-label") else {
                continue;
            };

            let emoji = match skill.skill_type.as_str() {
                "hug" => "\u{1F917}",
                "helping" => "\u{1F91D}",
                "sharing" => "\u{1F381}",
                "love" => "\u{1F49C}",
                "comforting" => "\u{1F917}",
                "bravery" => "\u{1F981}",
                "patience" => "\u{23F3}",
                "inclusion" => "\u{1F46D}",
                "gratitude" => "\u{1F64F}",
                "listening" => "\u{1F442}",
                _ => "\u{1F49C}",
            };

            dom::with_buf(|buf| {
                use std::fmt::Write;
                let _ = write!(
                    buf,
                    "{} {}",
                    emoji,
                    domain_services::skill_to_friendly_name(&skill.skill_type)
                );
                label.set_text_content(Some(buf));
            });
            let _ = row.append_child(&label);

            let Some(track) = render::create_el_with_class(&doc, "div", "mom-skill-track") else {
                continue;
            };
            let Some(fill) = render::create_el_with_class(&doc, "div", "mom-skill-fill") else {
                continue;
            };

            dom::with_buf(|buf| {
                use std::fmt::Write;
                let _ = write!(buf, "width: {}%;", skill.percentage);
                dom::set_attr(&fill, "style", buf);
            });
            let _ = track.append_child(&fill);
            let _ = row.append_child(&track);

            let Some(pct) = render::create_el_with_class(&doc, "div", "mom-skill-pct") else {
                continue;
            };
            dom::with_buf(|buf| {
                use std::fmt::Write;
                let _ = write!(buf, "{}%", skill.percentage);
                pct.set_text_content(Some(buf));
            });
            let _ = row.append_child(&pct);

            let _ = bars.append_child(&row);
        }
        let _ = insights_box.append_child(&bars);
    }
}
fn trigger_text_download(file_name: &str, text: &str, mime_type: &str) {
    let encoded = js_sys::encode_uri_component(text)
        .as_string()
        .unwrap_or_default();
    let href = format!("data:{mime_type};charset=utf-8,{encoded}");
    let Ok(a) = dom::document().create_element("a") else {
        return;
    };
    dom::set_attr(&a, "href", &href);
    dom::set_attr(&a, "download", file_name);
    let _ = dom::body().append_child(&a);
    let _ = js_sys::Reflect::get(a.as_ref(), &"click".into())
        .ok()
        .and_then(|f| f.dyn_into::<js_sys::Function>().ok())
        .and_then(|f| f.call0(a.as_ref()).ok());
    a.remove();
}
fn today_iso_day() -> String {
    let stamp = js_sys::Date::new_0()
        .to_iso_string()
        .as_string()
        .unwrap_or_default();
    stamp.split('T').next().unwrap_or("unknown-day").to_string()
}
async fn export_json_backup() {
    let day = today_iso_day();
    let file_name = format!("blaires-kind-heart-export-{day}.json");
    let stamp = js_sys::Date::new_0()
        .to_iso_string()
        .as_string()
        .unwrap_or_default();
    let Some(export_tables) = mom_mode_store::export_json_tables().await else {
        dom::toast("Export failed \u{2014} please try again.");
        return;
    };
    let payload = serde_json::json!({
        "export_format_version": EXPORT_FORMAT_VERSION,
        "schema_version": DB_SCHEMA_VERSION,
        "exported_at": stamp,
        "tables": {
            "kind_acts": export_tables.kind_acts,
            "settings": export_tables.settings,
            "quests": export_tables.quests
        }
    });
    if let Ok(json) = serde_json::to_string_pretty(&payload) {
        trigger_text_download(&file_name, &json, "application/json");
    }
}
/// RFC 4180 CSV field quoting: wraps field in double quotes, escapes embedded
/// quotes as `""`. Also strips leading formula-injection chars (=, +, -, @).
fn csv_field(s: &str) -> String {
    let s = s.trim_start_matches(['=', '+', '-', '@']);
    format!("\"{}\"", s.replace('"', "\"\""))
}
async fn export_kind_acts_csv() {
    let day = today_iso_day();
    let file_name = format!("blaires-kind-heart-kind-acts-{day}.csv");
    let header = "id,category,description,hearts_earned,created_at,day_key,reflection_type,emotion_selected,bonus_context,combo_day";
    let rows = mom_mode_store::export_kind_acts_rows().await;
    let mut csv = String::from(header);
    if let Some(array) = rows.as_array() {
        for row in array {
            let id = csv_field(row.get("id").and_then(|v| v.as_str()).unwrap_or(""));
            let category = csv_field(row.get("category").and_then(|v| v.as_str()).unwrap_or(""));
            let description = csv_field(row.get("description").and_then(|v| v.as_str()).unwrap_or(""));
            let hearts_earned = row.get("hearts_earned")
                .and_then(|v| v.as_i64())
                .unwrap_or(0)
                .to_string();
            let created_at = row.get("created_at")
                .and_then(|v| v.as_i64())
                .unwrap_or(0)
                .to_string();
            let day_key = csv_field(row.get("day_key").and_then(|v| v.as_str()).unwrap_or(""));
            let reflection_type = csv_field(row.get("reflection_type").and_then(|v| v.as_str()).unwrap_or(""));
            let emotion_selected = csv_field(row.get("emotion_selected").and_then(|v| v.as_str()).unwrap_or(""));
            let bonus_context = csv_field(row.get("bonus_context").and_then(|v| v.as_str()).unwrap_or(""));
            let combo_day = row.get("combo_day")
                .and_then(|v| v.as_i64())
                .unwrap_or(0)
                .to_string();
            csv.push('\n');
            csv.push_str(&format!("{id},{category},{description},{hearts_earned},{created_at},{day_key},{reflection_type},{emotion_selected},{bonus_context},{combo_day}"));
        }
    }
    trigger_text_download(&file_name, &csv, "text/csv");
}

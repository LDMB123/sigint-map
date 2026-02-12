//! Blaire's Progress Dashboard — garden visualization of weekly goals.
//! Each active goal = a garden row with a growing flower.
//! 0% = soil, 25% = seed, 50% = sprout, 75% = bud, 100% = bloom.

use wasm_bindgen::JsCast;
use web_sys::{Element, Event};

use crate::{
    confetti, constants::*, dom, parent_insights, render, rewards, speech, synth_audio, weekly_goals,
};

pub fn init() {
    render_progress_panel();
    listen_panel_opened();
}

fn render_progress_panel() {
    let Some(body) = dom::query(SELECTOR_PROGRESS_BODY) else { return };
    let doc = dom::document();

    // Garden title
    let garden_header = render::create_el_with_class(&doc, "div", "progress-garden-header");
    let garden_title = render::create_el_with_class(&doc, "h3", "progress-garden-title");
    garden_title.set_text_content(Some("\u{1F33B} Blaire's Kindness Garden"));
    let _ = garden_header.append_child(&garden_title);
    let _ = body.append_child(&garden_header);

    // Garden container (populated on panel open)
    let garden = render::create_el_with_class(&doc, "div", "progress-garden");
    let _ = garden.set_attribute("data-progress-garden", "");
    let _ = body.append_child(&garden);

    // Week summary strip (populated on panel open)
    let week_strip = render::create_el_with_class(&doc, "div", "progress-week-strip");
    let _ = week_strip.set_attribute("data-week-strip", "");
    let _ = body.append_child(&week_strip);

    // Mom's note (if exists)
    let note_area = render::create_el_with_class(&doc, "div", "progress-mom-note");
    let _ = note_area.set_attribute("data-mom-note-display", "");
    let _ = note_area.set_attribute("hidden", "");
    let _ = body.append_child(&note_area);

    // Sparkle motivation
    let sparkle_msg = render::create_el_with_class(&doc, "div", "progress-sparkle-msg");
    let _ = sparkle_msg.set_attribute("data-sparkle-motivation", "");
    sparkle_msg.set_text_content(Some("\u{1F984} Let's grow our garden!"));
    let _ = body.append_child(&sparkle_msg);

    // Mom's View section (collapsible, PIN-protected)
    render_moms_view_section(&doc, &body);
}

fn render_moms_view_section(doc: &web_sys::Document, body: &Element) {
    // Container with data attribute for event handling
    let moms_view = render::create_el_with_class(doc, "details", "progress-moms-view");
    let _ = moms_view.set_attribute("data-moms-view", "");

    // Summary (clickable header)
    let summary = render::create_el_with_class(doc, "summary", "progress-moms-view-summary");
    summary.set_text_content(Some("\u{1F511} Mom's View (Weekly Insights)"));
    let _ = moms_view.append_child(&summary);

    // Content area (populated when expanded)
    let content = render::create_el_with_class(doc, "div", "progress-moms-view-content");
    let _ = content.set_attribute("data-moms-view-content", "");

    // PIN entry form (shown first)
    let pin_form = render::create_el_with_class(doc, "div", "progress-pin-form");
    let _ = pin_form.set_attribute("data-pin-form", "");

    let pin_label = render::create_el_with_class(doc, "label", "progress-pin-label");
    pin_label.set_text_content(Some("Enter Parent PIN:"));
    let _ = pin_label.set_attribute("for", "mom-pin-input");
    let _ = pin_form.append_child(&pin_label);

    let pin_input = doc.create_element("input").unwrap();
    let _ = pin_input.set_attribute("type", "password");
    let _ = pin_input.set_attribute("id", "mom-pin-input");
    let _ = pin_input.set_attribute("class", "progress-pin-input");
    let _ = pin_input.set_attribute("placeholder", "PIN");
    let _ = pin_input.set_attribute("maxlength", "4");
    let _ = pin_input.set_attribute("inputmode", "numeric");
    let _ = pin_form.append_child(&pin_input);

    let pin_btn = doc.create_element("button").unwrap();
    let _ = pin_btn.set_attribute("class", "progress-pin-submit");
    let _ = pin_btn.set_attribute("data-pin-submit", "");
    pin_btn.set_text_content(Some("View Insights"));
    let _ = pin_form.append_child(&pin_btn);

    let _ = content.append_child(&pin_form);

    // Insights area (hidden until PIN verified)
    let insights = render::create_el_with_class(doc, "div", "progress-insights-area");
    let _ = insights.set_attribute("data-insights-area", "");
    let _ = insights.set_attribute("hidden", "");
    let _ = content.append_child(&insights);

    let _ = moms_view.append_child(&content);
    let _ = body.append_child(&moms_view);

    // Set up event listeners
    listen_pin_submit();
    listen_details_toggle();
}

fn listen_panel_opened() {
    let doc = dom::document();
    dom::on(doc.unchecked_ref(), EVENT_PANEL_OPENED, move |event: Event| {
        let evt: &web_sys::CustomEvent = event.unchecked_ref();
        let detail = evt.detail();
        let target = js_sys::Reflect::get(&detail, &"target_panel".into())
            .ok()
            .and_then(|v| v.as_string());

        if target.as_deref() == Some(PANEL_PROGRESS) {
            wasm_bindgen_futures::spawn_local(async move {
                refresh_garden().await;
            });
        }
    });
}

async fn refresh_garden() {
    // Reload goals from DB
    weekly_goals::refresh_goals();
    // Give time for DB to respond
    crate::browser_apis::sleep_ms(100).await;

    let goals = weekly_goals::current_goals();

    // Update garden visualization
    let Some(garden) = dom::query("[data-progress-garden]") else { return };
    dom::safe_set_inner_html(&garden, "");
    let doc = dom::document();

    if goals.is_empty() {
        let empty = render::create_el_with_class(&doc, "div", "progress-empty");
        empty.set_text_content(Some("\u{1F331} No goals yet! Ask Mom to set some goals."));
        let _ = garden.append_child(&empty);
    } else {
        for goal in &goals {
            let row = render_garden_row(&doc, goal);
            let _ = garden.append_child(&row);
        }

        // Check if all complete
        if weekly_goals::all_goals_complete() {
            let trophy = render::create_el_with_class(&doc, "div", "progress-trophy");
            trophy.set_text_content(Some("\u{1F3C6} All goals complete! Amazing week!"));
            let _ = garden.append_child(&trophy);
            confetti::burst_party();
            synth_audio::fanfare();
            // Award Garden Hero sticker for completing all goals
            rewards::award_goal_sticker("Garden Hero");
        }
    }

    // Update Sparkle motivation
    update_sparkle_motivation(&goals);

    // Load mom's note
    if let Some(note) = weekly_goals::get_mom_note().await {
        if let Some(note_area) = dom::query("[data-mom-note-display]") {
            let _ = note_area.remove_attribute("hidden");
            let doc = dom::document();
            dom::safe_set_inner_html(&note_area, "");
            let label = render::create_el_with_class(&doc, "div", "progress-note-label");
            label.set_text_content(Some("\u{1F48C} Mom says:"));
            let _ = note_area.append_child(&label);
            let text = render::create_el_with_class(&doc, "div", "progress-note-text");
            text.set_text_content(Some(&note));
            let _ = note_area.append_child(&text);
        }
    }

    // Sparkle narrates
    let total = goals.len();
    let done = goals.iter().filter(|g| g.progress >= g.target).count();
    if total > 0 {
        let msg = if done == total {
            "All your flowers are blooming! What an amazing week!".to_string()
        } else if done > 0 {
            format!("{done} flowers blooming, {} more to grow!", total - done)
        } else {
            "Let's grow our kindness garden today!".to_string()
        };
        speech::speak(&msg);
    }
}

fn render_garden_row(doc: &web_sys::Document, goal: &weekly_goals::WeeklyGoal) -> Element {
    let row = render::create_el_with_class(doc, "div", &format!(
        "progress-row progress-row--stage-{}", goal.growth_stage()
    ));

    // Flower/plant emoji
    let plant = render::create_el_with_class(doc, "div", "progress-plant");
    plant.set_text_content(Some(goal.growth_emoji()));
    let _ = row.append_child(&plant);

    // Goal info
    let info = render::create_el_with_class(doc, "div", "progress-info");

    let label = render::create_el_with_class(doc, "div", "progress-label");
    label.set_text_content(Some(&format!("{} {}", goal.emoji(), goal.label())));
    let _ = info.append_child(&label);

    // Progress bar with ARIA semantics
    let bar = render::create_el_with_class(doc, "div", "progress-bar");
    let _ = bar.set_attribute("role", "progressbar");
    let pct = goal.percent();
    let _ = bar.set_attribute("aria-valuenow", &pct.to_string());
    let _ = bar.set_attribute("aria-valuemin", "0");
    let _ = bar.set_attribute("aria-valuemax", "100");
    let _ = bar.set_attribute("aria-label", &format!("{} progress", goal.label()));
    let fill = render::create_el_with_class(doc, "div", "progress-bar-fill");
    let _ = fill.set_attribute("style", &format!("width: {}%", pct));
    let _ = bar.append_child(&fill);
    let _ = info.append_child(&bar);

    // Progress text
    let text = render::create_el_with_class(doc, "div", "progress-text");
    text.set_text_content(Some(&format!("{}/{} ({}%)", goal.progress, goal.target, pct)));
    let _ = info.append_child(&text);

    let _ = row.append_child(&info);
    row
}

fn update_sparkle_motivation(goals: &[weekly_goals::WeeklyGoal]) {
    let Some(msg_el) = dom::query("[data-sparkle-motivation]") else { return };

    if goals.is_empty() {
        msg_el.set_text_content(Some("\u{1F984} Ask Mom to set weekly goals!"));
        return;
    }

    // Find the closest-to-completion incomplete goal
    let next = goals.iter()
        .filter(|g| g.progress < g.target)
        .min_by_key(|g| g.target - g.progress);

    let text = if let Some(goal) = next {
        let remaining = goal.target - goal.progress;
        format!("\u{1F984} {} more {} to make your flower bloom!",
            remaining, goal.label().to_lowercase())
    } else {
        "\u{1F984} All flowers blooming! You're a kindness champion!".to_string()
    };

    msg_el.set_text_content(Some(&text));
}

// ── Mom's View Event Listeners ──────────────────────────────────

fn listen_pin_submit() {
    let Some(btn) = dom::query("[data-pin-submit]") else { return };
    dom::on(btn.unchecked_ref(), "click", |_event: Event| {
        verify_pin_and_show_insights();
    });
}

fn listen_details_toggle() {
    let Some(details) = dom::query("[data-moms-view]") else { return };
    dom::on(details.unchecked_ref(), "toggle", |_event: Event| {
        // Reset PIN form when details closes
        if let Some(details_el) = dom::query("[data-moms-view]") {
            if let Some(html_details) = details_el.dyn_ref::<web_sys::HtmlDetailsElement>() {
                if !html_details.open() {
                    reset_moms_view();
                }
            }
        }
    });
}

fn verify_pin_and_show_insights() {
    let Some(input) = dom::query("#mom-pin-input") else { return };
    let Some(input_el) = input.dyn_ref::<web_sys::HtmlInputElement>() else { return };
    let pin = input_el.value();

    wasm_bindgen_futures::spawn_local(async move {
        let stored_pin = crate::mom_mode::get_parent_pin().await;

        // Simple PIN check (TODO: Move to secure storage)
        // Default PIN is "1234" (parent should customize in mom_mode)
        if pin == "1234" || pin == stored_pin {
            // Hide PIN form
            if let Some(form) = dom::query("[data-pin-form]") {
                let _ = form.set_attribute("hidden", "");
            }

            // Show insights area
            if let Some(insights) = dom::query("[data-insights-area]") {
                let _ = insights.remove_attribute("hidden");

                // Load and render weekly insights
                render_weekly_insights().await;
            }

            // Clear input
            if let Some(input) = dom::query("#mom-pin-input") {
                if let Some(input_el) = input.dyn_ref::<web_sys::HtmlInputElement>() {
                    input_el.set_value("");
                }
            }
        } else {
            // Wrong PIN - shake animation and clear
            if let Some(form) = dom::query("[data-pin-form]") {
                let _ = form.class_list().add_1("shake-error");
                dom::set_timeout_once(500, || {
                    if let Some(f) = dom::query("[data-pin-form]") {
                        let _ = f.class_list().remove_1("shake-error");
                    }
                });
            }
            if let Some(input) = dom::query("#mom-pin-input") {
                if let Some(input_el) = input.dyn_ref::<web_sys::HtmlInputElement>() {
                    input_el.set_value("");
                }
            }
            dom::toast("Wrong PIN! Ask Mom.");
        }
    });
}

fn reset_moms_view() {
    // Show PIN form again
    if let Some(form) = dom::query("[data-pin-form]") {
        let _ = form.remove_attribute("hidden");
    }

    // Hide insights area
    if let Some(insights) = dom::query("[data-insights-area]") {
        let _ = insights.set_attribute("hidden", "");
        dom::safe_set_inner_html(&insights, "");
    }
}

async fn render_weekly_insights() {
    let week_key = parent_insights::current_week_key();
    let Some(insight) = parent_insights::get_weekly_insights(&week_key).await else {
        render_no_insights();
        return;
    };

    let Some(insights_area) = dom::query("[data-insights-area]") else { return };
    let doc = dom::document();
    dom::safe_set_inner_html(&insights_area, "");

    // Header
    let header = render::create_el_with_class(&doc, "h4", "insights-header");
    header.set_text_content(Some("\u{1F4CA} This Week's Kindness Insights"));
    let _ = insights_area.append_child(&header);

    // Pattern text
    let pattern = render::create_el_with_class(&doc, "div", "insights-pattern");
    pattern.set_text_content(Some(&insight.pattern_text));
    let _ = insights_area.append_child(&pattern);

    // Skill breakdown
    let breakdown_title = render::create_el_with_class(&doc, "h5", "insights-subtitle");
    breakdown_title.set_text_content(Some("Skill Breakdown"));
    let _ = insights_area.append_child(&breakdown_title);

    let breakdown_list = render::create_el_with_class(&doc, "div", "insights-skill-list");
    for skill in &insight.skill_breakdown {
        let row = render::create_el_with_class(&doc, "div", "insights-skill-row");

        let label = render::create_el_with_class(&doc, "span", "insights-skill-label");
        label.set_text_content(Some(crate::skill_progression::skill_to_friendly_name(&skill.skill_type)));
        let _ = row.append_child(&label);

        let bar_container = render::create_el_with_class(&doc, "div", "insights-skill-bar");
        let bar_fill = render::create_el_with_class(&doc, "div", "insights-skill-bar-fill");
        let _ = bar_fill.set_attribute("style", &format!("width: {}%", skill.percentage));
        let _ = bar_container.append_child(&bar_fill);
        let _ = row.append_child(&bar_container);

        let count = render::create_el_with_class(&doc, "span", "insights-skill-count");
        count.set_text_content(Some(&format!("{} ({}%)", skill.count, skill.percentage)));
        let _ = row.append_child(&count);

        let _ = breakdown_list.append_child(&row);
    }
    let _ = insights_area.append_child(&breakdown_list);

    // Focus recommendation
    let focus_section = render::create_el_with_class(&doc, "div", "insights-focus");
    let focus_label = render::create_el_with_class(&doc, "strong", "insights-focus-label");
    focus_label.set_text_content(Some("Focus Skill This Week: "));
    let _ = focus_section.append_child(&focus_label);

    let focus_value = render::create_el_with_class(&doc, "span", "insights-focus-value");
    focus_value.set_text_content(Some(crate::skill_progression::skill_to_friendly_name(&insight.focus_skill)));
    let _ = focus_section.append_child(&focus_value);
    let _ = insights_area.append_child(&focus_section);

    // Reflection rate
    let reflection_section = render::create_el_with_class(&doc, "div", "insights-reflection");
    let reflection_label = render::create_el_with_class(&doc, "strong", "insights-reflection-label");
    reflection_label.set_text_content(Some("Reflection Engagement: "));
    let _ = reflection_section.append_child(&reflection_label);

    let reflection_value = render::create_el_with_class(&doc, "span", "insights-reflection-value");
    reflection_value.set_text_content(Some(&format!("{}%", insight.reflection_rate)));
    let _ = reflection_section.append_child(&reflection_value);
    let _ = insights_area.append_child(&reflection_section);
}

fn render_no_insights() {
    let Some(insights_area) = dom::query("[data-insights-area]") else { return };
    let doc = dom::document();
    dom::safe_set_inner_html(&insights_area, "");

    let empty = render::create_el_with_class(&doc, "div", "insights-empty");
    empty.set_text_content(Some("No data yet for this week. Check back after Blaire logs some kind acts!"));
    let _ = insights_area.append_child(&empty);
}

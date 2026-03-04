use crate::{
    confetti, constants::*, dom, domain_services, render, speech, synth_audio, weekly_goals,
};
use wasm_bindgen::JsCast;
use web_sys::{Element, Event};
pub fn init() {
    render_progress_panel();
    listen_panel_opened();
}
fn render_progress_panel() {
    let Some(body) = dom::query(SELECTOR_PROGRESS_BODY) else {
        return;
    };
    let doc = dom::document();
    let Some(garden_header) = render::create_el_with_class(&doc, "div", "progress-garden-header")
    else {
        return;
    };
    render::append_text(
        &doc,
        &garden_header,
        "h3",
        "progress-garden-title",
        "\u{1F33B} Blaire's Kindness Garden",
    );
    let _ = body.append_child(&garden_header);
    let Some(garden) =
        render::create_el_with_data(&doc, "div", "progress-garden", "data-progress-garden")
    else {
        return;
    };
    let _ = body.append_child(&garden);
    if let Some(week_strip) =
        render::create_el_with_data(&doc, "div", "progress-week-strip", "data-week-strip")
    {
        let _ = body.append_child(&week_strip);
    }
    let Some(note_area) =
        render::create_el_with_data(&doc, "div", "progress-mom-note", "data-mom-note-display")
    else {
        return;
    };
    dom::set_attr(&note_area, "hidden", "");
    let _ = body.append_child(&note_area);
    let Some(sparkle_msg) = render::create_el_with_data(
        &doc,
        "div",
        "progress-sparkle-msg",
        "data-sparkle-motivation",
    ) else {
        return;
    };
    sparkle_msg.set_text_content(Some("\u{1F984} Let's grow our garden!"));
    let _ = body.append_child(&sparkle_msg);
    render_moms_view_section(&doc, &body);
}
fn render_moms_view_section(doc: &web_sys::Document, body: &Element) {
    let Some(moms_view) =
        render::create_el_with_data(doc, "details", "progress-moms-view", "data-moms-view")
    else {
        return;
    };
    render::append_text(
        doc,
        &moms_view,
        "summary",
        "progress-moms-view-summary",
        "\u{1F511} Mom's View (Weekly Insights)",
    );
    let Some(content) = render::create_el_with_data(
        doc,
        "div",
        "progress-moms-view-content",
        "data-moms-view-content",
    ) else {
        return;
    };
    let Some(pin_form) =
        render::create_el_with_data(doc, "div", "progress-pin-form", "data-pin-form")
    else {
        return;
    };
    let Some(pin_label) = render::text_el(doc, "label", "progress-pin-label", "Enter Parent PIN:")
    else {
        return;
    };
    dom::set_attr(&pin_label, "for", "mom-pin-input");
    let _ = pin_form.append_child(&pin_label);
    let Some(pin_input) = doc.create_element("input").ok() else {
        return;
    };
    for (k, v) in [
        ("type", "password"),
        ("id", "mom-pin-input"),
        ("class", "progress-pin-input"),
        ("placeholder", "PIN"),
        ("maxlength", "4"),
        ("inputmode", "numeric"),
    ] {
        dom::set_attr(&pin_input, k, v);
    }
    let _ = pin_form.append_child(&pin_input);
    let Some(pin_btn) = render::create_button_with_data(
        doc,
        "progress-pin-submit",
        "View Insights",
        "data-pin-submit",
    ) else {
        return;
    };
    let _ = pin_form.append_child(&pin_btn);
    let _ = content.append_child(&pin_form);
    let Some(insights) =
        render::create_el_with_data(doc, "div", "progress-insights-area", "data-insights-area")
    else {
        return;
    };
    dom::set_attr(&insights, "hidden", "");
    let _ = content.append_child(&insights);
    let _ = moms_view.append_child(&content);
    let _ = body.append_child(&moms_view);
    listen_pin_submit();
    listen_details_toggle();
}
fn listen_panel_opened() {
    let doc = dom::document();
    dom::on(
        doc.unchecked_ref(),
        EVENT_PANEL_OPENED,
        move |event: Event| {
            let evt: &web_sys::CustomEvent = event.unchecked_ref();
            let detail = evt.detail();
            let target = js_sys::Reflect::get(&detail, &"target_panel".into())
                .ok()
                .and_then(|v| v.as_string());
            if target.as_deref() == Some(PANEL_PROGRESS) {
                crate::browser_apis::spawn_local_logged("progress-refresh", async {
                    refresh_garden().await;
                    Ok(())
                });
            }
        },
    );
}
async fn refresh_garden() {
    weekly_goals::refresh_goals();
    crate::browser_apis::sleep_ms(100).await;
    let goals = weekly_goals::current_goals();
    let Some(garden) = dom::query("[data-progress-garden]") else {
        return;
    };
    dom::safe_set_inner_html(&garden, "");
    let doc = dom::document();
    if goals.is_empty() {
        render::append_text(
            &doc,
            &garden,
            "div",
            "progress-empty",
            "\u{1F331} Your garden is getting ready to grow! \u{2728}",
        );
    } else {
        let frag = doc.create_document_fragment();
        for goal in &goals {
            if let Some(row) = render_garden_row(&doc, goal) {
                let _ = frag.append_child(&row);
            }
        }
        let _ = garden.append_child(&frag);
        if weekly_goals::all_goals_complete() {
            render::append_text(
                &doc,
                &garden,
                "div",
                "progress-trophy",
                "\u{1F3C6} All goals complete! Amazing week!",
            );
            confetti::burst_party();
            synth_audio::fanfare();
            domain_services::award_goal_sticker("Garden Hero");
        }
    }
    update_sparkle_motivation(&goals);
    if let Some(note) = weekly_goals::get_mom_note().await {
        if let Some(note_area) = dom::query("[data-mom-note-display]") {
            dom::remove_attr(&note_area, "hidden");
            let doc = dom::document();
            dom::safe_set_inner_html(&note_area, "");
            render::append_text(
                &doc,
                &note_area,
                "div",
                "progress-note-label",
                "\u{1F48C} Mom says:",
            );
            render::append_text(&doc, &note_area, "div", "progress-note-text", &note);
        }
    }
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
fn render_garden_row(doc: &web_sys::Document, goal: &weekly_goals::WeeklyGoal) -> Option<Element> {
    let row = render::create_el_with_class(
        doc,
        "div",
        &format!("progress-row progress-row--stage-{}", goal.growth_stage()),
    )?;
    render::append_text(doc, &row, "div", "progress-plant", goal.growth_emoji());
    let info = render::create_el_with_class(doc, "div", "progress-info")?;
    let (emoji, goal_label) = goal.meta();
    render::append_text(
        doc,
        &info,
        "div",
        "progress-label",
        &format!("{emoji} {goal_label}"),
    );
    let pct = goal.percent();
    let bar = render::create_el_with_class(doc, "div", "progress-bar")?;
    for (k, v) in [
        ("role", "progressbar"),
        ("aria-valuemin", "0"),
        ("aria-valuemax", "100"),
    ] {
        dom::set_attr(&bar, k, v);
    }
    dom::set_attr(&bar, "aria-valuenow", &pct.to_string());
    dom::set_attr(&bar, "aria-label", &format!("{goal_label} progress"));
    let fill = render::create_el_with_class(doc, "div", "progress-bar-fill")?;
    let scale = f64::from(pct) / 100.0;
    dom::set_attr(&fill, "style", &format!("--progress-scale: {scale:.4}"));
    let _ = bar.append_child(&fill);
    let _ = info.append_child(&bar);
    render::append_text(
        doc,
        &info,
        "div",
        "progress-text",
        &format!("{}/{} ({}%)", goal.progress, goal.target, pct),
    );
    let _ = row.append_child(&info);
    Some(row)
}
fn update_sparkle_motivation(goals: &[weekly_goals::WeeklyGoal]) {
    let Some(msg_el) = dom::query("[data-sparkle-motivation]") else {
        return;
    };
    if goals.is_empty() {
        msg_el.set_text_content(Some("\u{1F984} Your goals will appear here soon! \u{2728}"));
        return;
    }
    let next = goals
        .iter()
        .filter(|g| g.progress < g.target)
        .min_by_key(|g| g.target - g.progress);
    let text = if let Some(goal) = next {
        let remaining = goal.target - goal.progress;
        let (_, lbl) = goal.meta();
        format!(
            "\u{1F984} {remaining} more {} to make your flower bloom!",
            lbl.to_lowercase()
        )
    } else {
        "\u{1F984} All flowers blooming! You're a kindness champion!".to_string()
    };
    msg_el.set_text_content(Some(&text));
}
fn listen_pin_submit() {
    let Some(btn) = dom::query("[data-pin-submit]") else {
        return;
    };
    dom::on(btn.unchecked_ref(), "click", |_: Event| {
        verify_pin_and_show_insights()
    });
}
fn listen_details_toggle() {
    let Some(details) = dom::query("[data-moms-view]") else {
        return;
    };
    dom::on(details.unchecked_ref(), "toggle", |_event: Event| {
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
    let Some(input) = dom::query("#mom-pin-input") else {
        return;
    };
    let Some(input_el) = input.dyn_ref::<web_sys::HtmlInputElement>() else {
        return;
    };
    let pin = input_el.value();
    wasm_bindgen_futures::spawn_local(async move {
        let stored_pin = domain_services::get_parent_pin().await;
        if stored_pin.is_some_and(|s| pin == s) {
            dom::hide("[data-pin-form]");
            if let Some(insights) = dom::query("[data-insights-area]") {
                dom::remove_attr(&insights, "hidden");
                render_weekly_insights().await;
            }
            clear_pin_input();
        } else {
            if let Some(form) = dom::query("[data-pin-form]") {
                let _ = form.class_list().add_1("shake-error");
                dom::delayed_class_remove(form, "shake-error", 500);
            }
            clear_pin_input();
            dom::toast("\u{1F512} Oops! That\u{2019}s not the right code. Ask a grown-up for help! \u{1F49C}");
        }
    });
}
fn clear_pin_input() {
    if let Some(input) = dom::query("#mom-pin-input") {
        if let Some(input_el) = input.dyn_ref::<web_sys::HtmlInputElement>() {
            input_el.set_value("");
        }
    }
}
fn reset_moms_view() {
    dom::show("[data-pin-form]");
    dom::hide("[data-insights-area]");
    clear_insights_area();
}
async fn render_weekly_insights() {
    let week_key = domain_services::current_week_key();
    let Some(insight) = domain_services::get_weekly_insights(&week_key).await else {
        render_no_insights();
        return;
    };
    let Some((doc, insights_area)) = fresh_insights_area() else {
        return;
    };
    render::append_text(
        &doc,
        &insights_area,
        "h4",
        "insights-header",
        "\u{1F4CA} This Week's Kindness Insights",
    );
    render::append_text(
        &doc,
        &insights_area,
        "div",
        "insights-pattern",
        &insight.pattern_text,
    );
    render::append_text(
        &doc,
        &insights_area,
        "h5",
        "insights-subtitle",
        "Skill Breakdown",
    );
    let Some(breakdown_list) = render::create_el_with_class(&doc, "div", "insights-skill-list")
    else {
        return;
    };
    for skill in &insight.skill_breakdown {
        let Some(row) = render::create_el_with_class(&doc, "div", "insights-skill-row") else {
            continue;
        };
        render::append_text(
            &doc,
            &row,
            "span",
            "insights-skill-label",
            crate::skill_progression::skill_to_friendly_name(&skill.skill_type),
        );
        let Some(bar_container) = render::create_el_with_class(&doc, "div", "insights-skill-bar")
        else {
            continue;
        };
        let Some(bar_fill) = render::create_el_with_class(&doc, "div", "insights-skill-bar-fill")
        else {
            continue;
        };
        dom::set_attr(&bar_fill, "style", &format!("width: {}%", skill.percentage));
        let _ = bar_container.append_child(&bar_fill);
        let _ = row.append_child(&bar_container);
        render::append_text(
            &doc,
            &row,
            "span",
            "insights-skill-count",
            &format!("{} ({}%)", skill.count, skill.percentage),
        );
        let _ = breakdown_list.append_child(&row);
    }
    let _ = insights_area.append_child(&breakdown_list);
    append_label_value(
        &doc,
        &insights_area,
        "insights-focus",
        "insights-focus-label",
        "insights-focus-value",
        "Focus Skill This Week: ",
        crate::skill_progression::skill_to_friendly_name(&insight.focus_skill),
    );
    append_label_value(
        &doc,
        &insights_area,
        "insights-reflection",
        "insights-reflection-label",
        "insights-reflection-value",
        "Reflection Engagement: ",
        &format!("{}%", insight.reflection_rate),
    );
}
fn append_label_value(
    doc: &web_sys::Document,
    parent: &web_sys::Element,
    section_class: &str,
    label_class: &str,
    value_class: &str,
    label: &str,
    value: &str,
) {
    let Some(section) = render::create_el_with_class(doc, "div", section_class) else {
        return;
    };
    render::append_text(doc, &section, "strong", label_class, label);
    render::append_text(doc, &section, "span", value_class, value);
    let _ = parent.append_child(&section);
}
fn render_no_insights() {
    let Some((doc, insights_area)) = fresh_insights_area() else {
        return;
    };
    render::append_text(
        &doc,
        &insights_area,
        "div",
        "insights-empty",
        "No data yet for this week. Check back after Blaire logs some kind acts!",
    );
}

fn clear_insights_area() {
    if let Some(insights_area) = dom::query("[data-insights-area]") {
        dom::safe_set_inner_html(&insights_area, "");
    }
}

fn fresh_insights_area() -> Option<(web_sys::Document, Element)> {
    let insights_area = dom::query("[data-insights-area]")?;
    let doc = dom::document();
    dom::safe_set_inner_html(&insights_area, "");
    Some((doc, insights_area))
}

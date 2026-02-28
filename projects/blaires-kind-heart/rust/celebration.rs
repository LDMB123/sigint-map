use crate::{
    animations, confetti, dom, native_apis, render, speech, state, synth_audio, weekly_goals,
};
use std::fmt::Write;
use wasm_bindgen::JsCast;
use web_sys::{Element, Event};
pub fn init() {
    bind_show_mom();
}
fn bind_show_mom() {
    if let Some(btn) = dom::query("[data-show-mom]") {
        dom::on(btn.unchecked_ref(), "click", move |_: Event| {
            wasm_bindgen_futures::spawn_local(show_celebration());
        });
    }
}
async fn show_celebration() {
    let (hearts_total, hearts_today, streak, quests, games_played) = state::with_state(|s| {
        (
            s.hearts_total,
            s.hearts_today,
            s.streak_days,
            s.quests_completed_today,
            s.games_played_today,
        )
    });
    native_apis::request_wake_lock().await;
    native_apis::vibrate_celebration();
    let doc = dom::document();
    let _ = dom::body().request_fullscreen();
    let Some(overlay) =
        render::create_el_with_data(&doc, "dialog", "celebration-overlay", "data-celebration")
    else {
        return;
    };
    dom::set_attr(
        &overlay,
        "aria-label",
        "Celebration - Blaire's Week of Kindness",
    );
    render::append_text(
        &doc,
        &overlay,
        "div",
        "celebration-emoji",
        "\u{1F984}\u{1F389}\u{1F49C}",
    );
    render::append_text(
        &doc,
        &overlay,
        "h1",
        "celebration-title",
        "Blaire's Week of Kindness!",
    );
    let goals = weekly_goals::current_goals();
    if !goals.is_empty() {
        let Some(garden_section) = render::create_el_with_class(&doc, "div", "celebration-garden")
        else {
            return;
        };
        render::append_text(
            &doc,
            &garden_section,
            "div",
            "celebration-section-label",
            "\u{1F33B} Kindness Garden",
        );
        let Some(garden_row) = render::create_el_with_class(&doc, "div", "celebration-garden-row")
        else {
            return;
        };
        for goal in &goals {
            let Some(flower) = render::create_el_with_class(&doc, "div", "celebration-flower")
            else {
                continue;
            };
            render::append_text(
                &doc,
                &flower,
                "span",
                "celebration-flower-icon",
                goal.growth_emoji(),
            );
            let Some(label) =
                render::create_el_with_class(&doc, "span", "celebration-flower-label")
            else {
                continue;
            };
            let status = if goal.progress >= goal.target {
                "\u{2705}"
            } else {
                &format!("{}/{}", goal.progress, goal.target)
            };
            label.set_text_content(Some(status));
            let _ = flower.append_child(&label);
            let _ = garden_row.append_child(&flower);
        }
        let _ = garden_section.append_child(&garden_row);
        if weekly_goals::all_goals_complete() {
            render::append_text(
                &doc,
                &garden_section,
                "div",
                "celebration-trophy-msg",
                "\u{1F3C6} All goals complete! Garden Champion!",
            );
        }
        let _ = overlay.append_child(&garden_section);
    }
    let Some(stats) = render::create_el_with_class(&doc, "div", "celebration-stats") else {
        return;
    };
    add_stat(
        &doc,
        &stats,
        &format!("\u{1F49C} {hearts_today} hearts earned today!"),
    );
    add_stat(
        &doc,
        &stats,
        &format!("\u{1F496} {hearts_total} hearts all time!"),
    );
    if quests > 0 {
        add_stat(
            &doc,
            &stats,
            &format!("\u{2B50} {quests} quests completed!"),
        );
    }
    if games_played > 0 {
        add_stat(
            &doc,
            &stats,
            &format!("\u{1F3AE} {games_played} games played!"),
        );
    }
    if streak > 1 {
        add_stat(
            &doc,
            &stats,
            &format!("\u{1F525} {streak} day kindness streak!"),
        );
    }
    let _ = overlay.append_child(&stats);
    let Some(sparkle_quote) =
        render::create_el_with_class(&doc, "div", "celebration-sparkle-quote")
    else {
        return;
    };
    let quote_text = if weekly_goals::all_goals_complete() {
        "\u{1F984} \"I'm SO proud of Blaire! Every goal complete — what a superstar!\""
    } else if hearts_today >= 5 {
        "\u{1F984} \"Blaire is the kindest person I know! So many hearts today!\""
    } else if streak > 3 {
        "\u{1F984} \"Look at that streak! Blaire is kind every single day!\""
    } else {
        "\u{1F984} \"I'm so proud of Blaire! Every kind act makes the world brighter!\""
    };
    sparkle_quote.set_text_content(Some(quote_text));
    let _ = overlay.append_child(&sparkle_quote);
    if let Some(note) = weekly_goals::get_mom_note().await {
        let Some(note_section) = render::create_el_with_class(&doc, "div", "celebration-mom-note")
        else {
            return;
        };
        render::append_text(
            &doc,
            &note_section,
            "div",
            "celebration-note-label",
            "\u{1F48C} Mom says:",
        );
        render::append_text(&doc, &note_section, "div", "celebration-note-text", &note);
        let _ = overlay.append_child(&note_section);
    }
    let goals_done = goals.iter().filter(|g| g.progress >= g.target).count();
    let goals_total = goals.len();
    if native_apis::can_share() {
        let Some(share_btn) = render::create_button(
            &doc,
            "celebration-share-btn",
            "\u{1F4E4} Share Blaire's Kindness!",
        ) else {
            return;
        };
        let share_hearts = hearts_today;
        let share_streak = streak;
        let share_quests = quests;
        dom::on(share_btn.unchecked_ref(), "click", move |e: Event| {
            e.stop_propagation();
            let mut text = format!("Blaire earned {share_hearts} hearts today!");
            if share_quests > 0 {
                let _ = write!(text, " Completed {share_quests} quests!");
            }
            if share_streak > 1 {
                let _ = write!(text, " {share_streak} day streak!");
            }
            if goals_total > 0 {
                let _ = write!(text, " {goals_done}/{goals_total} weekly goals complete!");
            }
            text.push_str(" \u{1F49C}\u{1F984}");
            wasm_bindgen_futures::spawn_local(async move {
                native_apis::share("Blaire's Kind Heart", &text).await;
            });
        });
        let _ = overlay.append_child(&share_btn);
    }
    render::append_text(
        &doc,
        &overlay,
        "p",
        "celebration-hint",
        "Tap anywhere to close",
    );
    let _ = dom::body().append_child(&overlay);
    let dialog: &web_sys::HtmlDialogElement = overlay.unchecked_ref();
    if let Err(e) = dialog.show_modal() {
        dom::warn(&format!("[celebration] dialog.show_modal() failed: {e:?}"));
        return;
    }
    animations::magic_entrance(&overlay);
    synth_audio::fanfare();
    confetti::burst_party();
    native_apis::set_app_badge(hearts_today);
    let mut message =
        format!("Look what Blaire did this week! {hearts_today} hearts earned today!");
    if quests > 0 {
        let _ = write!(message, " And {quests} quests completed!");
    }
    if streak > 1 {
        let _ = write!(message, " That's a {streak} day kindness streak!");
    }
    if goals_total > 0 {
        let _ = write!(
            message,
            " {goals_done} out of {goals_total} garden flowers are blooming!"
        );
    }
    if weekly_goals::all_goals_complete() {
        message.push_str(" All goals complete! What an amazing week!");
    }
    message.push_str(" I'm so proud of you Blaire!");
    speech::celebrate(&message);
    let overlay_click = overlay.clone();
    dom::on(overlay.unchecked_ref(), "click", move |e: Event| {
        if let Some(target) = dom::event_target_element(&e) {
            if dom::closest(&target, ".celebration-share-btn").is_some() {
                return;
            }
        }
        close_celebration(&overlay_click);
    });
    let overlay_cancel = overlay.clone();
    dom::on(overlay.unchecked_ref(), "cancel", move |_: Event| {
        close_celebration(&overlay_cancel);
    });
}
fn add_stat(doc: &web_sys::Document, stats: &Element, text: &str) {
    render::append_text(doc, stats, "p", "celebration-stat", text);
}
fn close_celebration(overlay_el: &Element) {
    let dialog: &web_sys::HtmlDialogElement = overlay_el.unchecked_ref();
    dialog.close();
    overlay_el.remove();
    let doc = dom::document();
    doc.exit_fullscreen();
    speech::stop();
    crate::browser_apis::spawn_local_logged("wake-lock-release", async {
        native_apis::release_wake_lock().await;
        Ok(())
    });
}

//! "Show Mom!" celebration mode — fullscreen weekly report + confetti.
//! Blaire taps "Show Mom!" → iPad goes fullscreen, keeps screen on,
//! shows weekly progress garden, today's kindness, goal completion, speaks it aloud.

use wasm_bindgen::JsCast;
use web_sys::{Element, Event};

use crate::{animations, confetti, dom, native_apis, render, speech, synth_audio, state, weekly_goals};

pub fn init() {
    bind_show_mom();
}

fn bind_show_mom() {
    if let Some(btn) = dom::query("[data-show-mom]") {
        dom::on(btn.unchecked_ref(), "click", move |_: Event| {
            wasm_bindgen_futures::spawn_local(async move {
                show_celebration().await;
            });
        });
    }
}

async fn show_celebration() {
    let (hearts_total, hearts_today, streak, quests, games_played) =
        state::with_state(|s| {
            (s.hearts_total, s.hearts_today, s.streak_days, s.quests_completed_today, s.games_played_today)
        });

    // Keep screen on during celebration (Wake Lock API)
    native_apis::request_wake_lock().await;

    // Haptic celebration pattern
    native_apis::vibrate_celebration();

    // Try fullscreen (best effort — Safari may block if not user-gesture chained)
    let doc = dom::document();
    if let Some(body) = doc.body() {
        let el: &web_sys::Element = body.as_ref();
        let _ = el.request_fullscreen();
    }

    // Build celebration dialog (native <dialog> provides focus trap + Escape + backdrop)
    let overlay = render::create_el_with_class(&doc, "dialog", "celebration-overlay");
    let _ = overlay.set_attribute("data-celebration", "");
    let _ = overlay.set_attribute("aria-label", "Celebration - Blaire's Week of Kindness");

    // Animated title
    let emoji = render::create_el_with_class(&doc, "div", "celebration-emoji");
    emoji.set_text_content(Some("\u{1F984}\u{1F389}\u{1F49C}"));
    let _ = overlay.append_child(&emoji);

    let title = render::create_el_with_class(&doc, "h1", "celebration-title");
    title.set_text_content(Some("Blaire's Week of Kindness!"));
    let _ = overlay.append_child(&title);

    // === Weekly Goals Garden ===
    let goals = weekly_goals::current_goals();
    if !goals.is_empty() {
        let garden_section = render::create_el_with_class(&doc, "div", "celebration-garden");

        let garden_label = render::create_el_with_class(&doc, "div", "celebration-section-label");
        garden_label.set_text_content(Some("\u{1F33B} Kindness Garden"));
        let _ = garden_section.append_child(&garden_label);

        let garden_row = render::create_el_with_class(&doc, "div", "celebration-garden-row");
        for goal in &goals {
            let flower = render::create_el_with_class(&doc, "div", "celebration-flower");
            let flower_icon = render::create_el_with_class(&doc, "span", "celebration-flower-icon");
            flower_icon.set_text_content(Some(goal.growth_emoji()));
            let _ = flower.append_child(&flower_icon);

            let flower_label = render::create_el_with_class(&doc, "span", "celebration-flower-label");
            let status = if goal.progress >= goal.target {
                "\u{2705}"
            } else {
                &format!("{}/{}", goal.progress, goal.target)
            };
            flower_label.set_text_content(Some(status));
            let _ = flower.append_child(&flower_label);

            let _ = garden_row.append_child(&flower);
        }
        let _ = garden_section.append_child(&garden_row);

        // All goals complete trophy
        if weekly_goals::all_goals_complete() {
            let trophy = render::create_el_with_class(&doc, "div", "celebration-trophy-msg");
            trophy.set_text_content(Some("\u{1F3C6} All goals complete! Garden Champion!"));
            let _ = garden_section.append_child(&trophy);
        }

        let _ = overlay.append_child(&garden_section);
    }

    // === Today's Stats ===
    let stats = render::create_el_with_class(&doc, "div", "celebration-stats");

    let heart_line = render::create_el_with_class(&doc, "p", "celebration-stat");
    heart_line.set_text_content(Some(&format!("\u{1F49C} {} hearts earned today!", hearts_today)));
    let _ = stats.append_child(&heart_line);

    let total_line = render::create_el_with_class(&doc, "p", "celebration-stat");
    total_line.set_text_content(Some(&format!("\u{1F496} {} hearts all time!", hearts_total)));
    let _ = stats.append_child(&total_line);

    if quests > 0 {
        let quest_line = render::create_el_with_class(&doc, "p", "celebration-stat");
        quest_line.set_text_content(Some(&format!("\u{2B50} {} quests completed!", quests)));
        let _ = stats.append_child(&quest_line);
    }

    if games_played > 0 {
        let games_line = render::create_el_with_class(&doc, "p", "celebration-stat");
        games_line.set_text_content(Some(&format!("\u{1F3AE} {} games played!", games_played)));
        let _ = stats.append_child(&games_line);
    }

    if streak > 1 {
        let streak_line = render::create_el_with_class(&doc, "p", "celebration-stat");
        streak_line.set_text_content(Some(&format!("\u{1F525} {} day kindness streak!", streak)));
        let _ = stats.append_child(&streak_line);
    }

    let _ = overlay.append_child(&stats);

    // === Sparkle's Quote ===
    let sparkle_quote = render::create_el_with_class(&doc, "div", "celebration-sparkle-quote");
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

    // === Mom's Note ===
    if let Some(note) = weekly_goals::get_mom_note().await {
        let note_section = render::create_el_with_class(&doc, "div", "celebration-mom-note");
        let note_label = render::create_el_with_class(&doc, "div", "celebration-note-label");
        note_label.set_text_content(Some("\u{1F48C} Mom says:"));
        let _ = note_section.append_child(&note_label);
        let note_text = render::create_el_with_class(&doc, "div", "celebration-note-text");
        note_text.set_text_content(Some(&note));
        let _ = note_section.append_child(&note_text);
        let _ = overlay.append_child(&note_section);
    }

    // Share button (if Web Share API available)
    if native_apis::can_share() {
        let share_btn = render::create_button(&doc, "celebration-share-btn", "\u{1F4E4} Share Blaire's Kindness!");
        let share_hearts = hearts_today;
        let share_streak = streak;
        let share_quests = quests;
        let share_goals_done = goals.iter().filter(|g| g.progress >= g.target).count();
        let share_goals_total = goals.len();
        dom::on(share_btn.unchecked_ref(), "click", move |e: Event| {
            e.stop_propagation(); // Don't close overlay
            let mut text = format!("Blaire earned {} hearts today!", share_hearts);
            if share_quests > 0 {
                text.push_str(&format!(" Completed {} quests!", share_quests));
            }
            if share_streak > 1 {
                text.push_str(&format!(" {} day streak!", share_streak));
            }
            if share_goals_total > 0 {
                text.push_str(&format!(" {}/{} weekly goals complete!", share_goals_done, share_goals_total));
            }
            text.push_str(" \u{1F49C}\u{1F984}");
            wasm_bindgen_futures::spawn_local(async move {
                native_apis::share("Blaire's Kind Heart", &text).await;
            });
        });
        let _ = overlay.append_child(&share_btn);
    }

    let hint = render::create_el_with_class(&doc, "p", "celebration-hint");
    hint.set_text_content(Some("Tap anywhere to close"));
    let _ = overlay.append_child(&hint);

    // Add to DOM and show as modal (native focus trap + Escape + backdrop)
    if let Some(body) = doc.body() {
        let _ = body.append_child(&overlay);
    }
    let dialog: &web_sys::HtmlDialogElement = overlay.unchecked_ref();
    if let Err(e) = dialog.show_modal() {
        web_sys::console::warn_1(&format!("[celebration] dialog.show_modal() failed: {:?}", e).into());
        return;  // Don't show broken celebration UI
    }
    animations::magic_entrance(&overlay);

    // Fire confetti + fanfare for the big celebration!
    synth_audio::fanfare();
    confetti::burst_party();

    // Update app badge with today's heart count
    native_apis::set_app_badge(hearts_today);

    // Speak the celebration
    let mut message = format!("Look what Blaire did this week! {} hearts earned today!", hearts_today);
    if quests > 0 {
        message.push_str(&format!(" And {} quests completed!", quests));
    }
    if streak > 1 {
        message.push_str(&format!(" That's a {} day kindness streak!", streak));
    }
    let goals_done = goals.iter().filter(|g| g.progress >= g.target).count();
    if !goals.is_empty() {
        message.push_str(&format!(" {} out of {} garden flowers are blooming!", goals_done, goals.len()));
    }
    if weekly_goals::all_goals_complete() {
        message.push_str(" All goals complete! What an amazing week!");
    }
    message.push_str(" I'm so proud of you Blaire!");
    speech::celebrate(&message);

    // Close on tap (skip if tapping share button)
    let overlay_click = overlay.clone();
    dom::on(overlay.unchecked_ref(), "click", move |e: Event| {
        if let Some(target) = e.target().and_then(|t: web_sys::EventTarget| t.dyn_into::<Element>().ok()) {
            if target.closest(".celebration-share-btn").ok().flatten().is_some() {
                return;
            }
        }
        close_celebration(&overlay_click);
    });

    // Native <dialog> fires "cancel" on Escape — no manual keydown listener needed
    let overlay_cancel = overlay.clone();
    dom::on(overlay.unchecked_ref(), "cancel", move |_: Event| {
        close_celebration(&overlay_cancel);
    });
}

fn close_celebration(overlay_el: &Element) {
    let dialog: &web_sys::HtmlDialogElement = overlay_el.unchecked_ref();
    dialog.close();
    overlay_el.remove();
    let doc = dom::document();
    doc.exit_fullscreen();
    speech::stop();
    wasm_bindgen_futures::spawn_local(async move {
        native_apis::release_wake_lock().await;
    });
}

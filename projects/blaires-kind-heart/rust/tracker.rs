//! Kindness tracker — event delegation on the tracker panel.
//! User taps a category → SQLite write → heart counter bounce.
//! The DOM events and Web Animations API do the heavy lifting.

use std::cell::RefCell;
use std::rc::Rc;
use wasm_bindgen::JsCast;
use web_sys::{Element, Event};

use crate::{animations, companion, confetti, constants::SELECTOR_TRACKER_BODY, dom, native_apis, rewards, skill_progression, state, streaks, synth_audio, theme, ui, utils, weekly_goals};

/// Kindness categories Blaire can tap.
/// (emoji_fallback, label, action, image_path)
const CATEGORIES: &[(&str, &str, &str, &str)] = &[
    ("\u{1F917}", "Hug", "hug", "illustrations/buttons/btn-act-hug.webp"),
    ("\u{1F60A}", "Nice Words", "nice-words", "illustrations/buttons/btn-act-nice-words.webp"),
    ("\u{1F91D}", "Sharing", "sharing", "illustrations/buttons/btn-act-sharing.webp"),
    ("\u{1F64F}", "Helping", "helping", "illustrations/buttons/btn-act-helping.webp"),
    ("\u{1F49C}", "Love", "love", "illustrations/buttons/btn-act-love.webp"),
    ("\u{1F984}", "Unicorn Kindness", "unicorn", "illustrations/buttons/btn-act-unicorn.webp"),
];

pub fn init() {
    render_categories();
    bind_tracker_clicks();

    // Render mastery badges on category buttons
    wasm_bindgen_futures::spawn_local(async {
        skill_progression::render_mastery_indicators().await;
    });
}

fn render_categories() {
    let Some(body) = dom::query(SELECTOR_TRACKER_BODY) else { return };
    let doc = dom::document();
    let grid = doc.create_element("div").unwrap();
    let _ = grid.set_attribute("class", "kind-grid");

    for &(emoji, label, action, image) in CATEGORIES {
        let btn = ui::big_emoji_button(emoji, label, action, action, Some(image));
        let _ = grid.append_child(&btn);
    }

    let _ = body.append_child(&grid);
}

/// Single event-delegated click handler on the tracker panel body.
fn bind_tracker_clicks() {
    if let Some(body) = dom::query(SELECTOR_TRACKER_BODY) {
        dom::on(body.unchecked_ref(), "click", move |event: Event| {
            let target = event.target().and_then(|t| t.dyn_into::<Element>().ok());
            let Some(el) = target else { return };
            if let Ok(Some(btn)) = el.closest("[data-action]") {
                if let Some(category) = btn.get_attribute("data-action") {
                    log_kind_act(&category);
                    animations::jelly_wobble(&btn);
                }
            }
        });
    }
}

fn log_kind_act(category: &str) {
    // Immediate haptic feedback for tactile responsiveness
    native_apis::vibrate_tap();

    let id = utils::create_id();
    let day_key = utils::today_key();
    let now = utils::now_epoch_ms();
    let cat = category.to_string();

    // Update in-memory state (OPTIMIZED: Single borrow instead of 3)
    let (hearts, is_first_act_today) = state::with_state_mut(|s| {
        s.hearts_today += theme::HEARTS_PER_KIND_ACT;
        s.hearts_total += theme::HEARTS_PER_KIND_ACT;
        (s.hearts_total, s.hearts_today == theme::HEARTS_PER_KIND_ACT)
    });

    ui::update_heart_counter(hearts);

    // Check Ultimate Heart badge (500 total hearts)
    wasm_bindgen_futures::spawn_local(async move {
        crate::badges::check_ultimate_heart(hearts).await;
    });

    // Phase 2.4: Use cached counter elements with fallback
    let tracker_hearts = state::get_cached_tracker_hearts_counter()
        .or_else(|| dom::query("[data-tracker-hearts-count]"));

    if let Some(el) = &tracker_hearts {
        el.set_text_content(Some(&format!("{hearts}")));
    }

    // Float-up animation on both home counter and tracker counter
    let hearts_counter = state::get_cached_hearts_counter()
        .or_else(|| dom::query("[data-hearts]"));

    if let Some(counter) = hearts_counter {
        animations::float_up_heart(&counter);
    }

    // Note: [data-tracker-hearts] is the container, different from [data-tracker-hearts-count]
    if let Some(counter) = dom::query("[data-tracker-hearts]") {
        animations::float_up_heart(&counter);
    }

    // SQLite write with offline queue (async, non-blocking, guaranteed persistence)
    let id_for_db = id.clone();
    wasm_bindgen_futures::spawn_local(async move {
        let _ = crate::offline_queue::queued_exec(
            "INSERT INTO kind_acts (id, category, hearts_earned, created_at, day_key) VALUES (?1, ?2, ?3, ?4, ?5)",
            vec![id_for_db, cat, theme::HEARTS_PER_KIND_ACT.to_string(), now.to_string(), day_key],
        ).await;
    });

    // MEGA CELEBRATION for first act of the day!
    if is_first_act_today {
        confetti::celebrate(confetti::CelebrationTier::Epic);
        companion::celebrate_first_act_today();
    } else {
        // Regular sound + confetti feedback
        synth_audio::chime();
        confetti::burst_hearts();
    }

    dom::toast("That was kind! \u{1F49C}");
    companion::on_kind_act();

    // Record today for streak tracking
    // Phase 3.1: Unified state eliminates boot/game split
    let temp_state = Rc::new(RefCell::new(
        state::with_state(|s| s.clone())
    ));
    streaks::record_today(temp_state);

    // Increment weekly goal progress for kind acts and hearts
    weekly_goals::increment_progress("acts", 1);
    weekly_goals::increment_progress("hearts", theme::HEARTS_PER_KIND_ACT);

    // Award sticker every 5 hearts
    if hearts.is_multiple_of(theme::STICKER_EVERY_N_HEARTS) {
        synth_audio::sparkle();
        confetti::burst_stars();
        rewards::award_sticker("kind-act");
    }

    // Track skill progression (async)
    let cat_clone = category.to_string();
    wasm_bindgen_futures::spawn_local(async move {
        skill_progression::track_skill_practice(&cat_clone).await;
    });

    // Trigger reflection prompt after 3s delay
    let id_clone = id.clone();
    let cat_clone2 = category.to_string();
    dom::set_timeout_once(3000, move || {
        // Dispatch custom event for reflection system
        let detail = js_sys::Object::new();
        let _ = js_sys::Reflect::set(&detail, &"act_id".into(), &id_clone.into());
        let _ = js_sys::Reflect::set(&detail, &"category".into(), &cat_clone2.into());
        dom::dispatch_custom_event("kindheart-reflection-ready", detail.into());
    });
}

/// Record a kind act completed via a game, without UI/haptic/celebration side effects.
/// Games handle their own celebrations — this just handles DB, quests, stickers, badges, skills.
///
/// `suppress_celebration` must be `true` from game call sites.
/// When `false`, full celebration fires (same as `log_kind_act`) — reserved for future use.
pub fn record_game_kind_act(category: &str, suppress_celebration: bool) {
    let id = utils::create_id();
    let day_key = utils::today_key();
    let now = utils::now_epoch_ms();

    // Map game category to skill category for mastery tracking
    let skill_cat = match category {
        "game-catcher"  => "helping",
        "game-memory"   => "sharing",
        "game-hug"      => "hug",
        "game-paint"    => "sharing",
        "game-unicorn"  => "unicorn",
        other => {
            crate::errors::log_diagnostic("skill_mapping", &format!("unknown game category: {other}"));
            other
        }
    };
    let skill_cat = skill_cat.to_string();

    let (hearts, _is_first) = state::with_state_mut(|s| {
        s.hearts_today += theme::HEARTS_PER_KIND_ACT;
        s.hearts_total += theme::HEARTS_PER_KIND_ACT;
        (s.hearts_total, s.hearts_today == theme::HEARTS_PER_KIND_ACT)
    });

    // SQLite write — same offline-safe path as manual acts
    let cat = category.to_string();
    wasm_bindgen_futures::spawn_local(async move {
        let _ = crate::offline_queue::queued_exec(
            "INSERT INTO kind_acts (id, category, hearts_earned, created_at, day_key) VALUES (?1, ?2, ?3, ?4, ?5)",
            vec![id, cat, theme::HEARTS_PER_KIND_ACT.to_string(), now.to_string(), day_key],
        ).await;
    });

    // Sticker threshold check
    if hearts.is_multiple_of(theme::STICKER_EVERY_N_HEARTS) {
        if !suppress_celebration {
            synth_audio::sparkle();
            confetti::burst_stars();
        }
        rewards::award_sticker("game");
    }

    // Skill mastery tracking
    wasm_bindgen_futures::spawn_local(async move {
        skill_progression::track_skill_practice(&skill_cat).await;
    });

    // Weekly goals
    weekly_goals::increment_progress("acts", 1);
    weekly_goals::increment_progress("hearts", theme::HEARTS_PER_KIND_ACT);
}

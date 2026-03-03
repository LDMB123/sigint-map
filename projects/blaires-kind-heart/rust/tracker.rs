use crate::{
    animations, companion, confetti, constants, constants::SELECTOR_TRACKER_BODY, db_client, dom,
    native_apis, rewards, skill_progression, speech, state, streaks, synth_audio, theme, ui, utils,
    weekly_goals,
};
use std::cell::Cell;
use wasm_bindgen::JsCast;
use web_sys::Event;
thread_local! {
    static SESSION_ACTS: Cell<u32> = const { Cell::new(0) };
}
const CATEGORIES: &[(&str, &str, &str, &str)] = &[
    (
        "\u{1F917}",
        "Hug",
        "hug",
        "illustrations/buttons/btn-act-hug.webp",
    ),
    (
        "\u{1F91D}",
        "Sharing",
        "sharing",
        "illustrations/buttons/btn-act-sharing.webp",
    ),
    (
        "\u{1F64F}",
        "Helping",
        "helping",
        "illustrations/buttons/btn-act-helping.webp",
    ),
    (
        "\u{1F49C}",
        "Love",
        "love",
        "illustrations/buttons/btn-act-love.webp",
    ),
];
const DAILY_KINDNESS: &[(&str, &str, &str)] = &[
    ("\u{1F917}", "hug", "Give someone a big hug!"),
    ("\u{1F91D}", "sharing", "Share your favorite toy!"),
    ("\u{1F64F}", "helping", "Help clean up!"),
    ("\u{1F49C}", "love", "Tell someone you love them!"),
    ("\u{263A}\u{FE0F}", "love", "Give someone a big smile!"),
    ("\u{1F31F}", "helping", "Help set the table!"),
    ("\u{1F3A8}", "sharing", "Draw a picture for someone!"),
    ("\u{1F9F8}", "sharing", "Share a stuffie!"),
    ("\u{1F48C}", "love", "Make a card for someone!"),
    ("\u{1F308}", "hug", "Give a rainbow hug!"),
    ("\u{1F98B}", "love", "Say something nice!"),
    ("\u{1F3B5}", "love", "Sing a happy song for someone!"),
    ("\u{1F33B}", "helping", "Water a plant!"),
    ("\u{1F36A}", "sharing", "Share a snack!"),
    ("\u{1F9F9}", "helping", "Pick up your toys!"),
    ("\u{1F490}", "love", "Give someone a flower!"),
    ("\u{1F932}", "helping", "Carry something for someone!"),
    ("\u{1F381}", "sharing", "Make a surprise gift!"),
    ("\u{1F319}", "love", "Give a goodnight hug!"),
    ("\u{2600}\u{FE0F}", "love", "Say good morning to everyone!"),
    ("\u{1F984}", "love", "Tell someone they're special!"),
    ("\u{1F388}", "sharing", "Share your balloons!"),
    ("\u{1F34E}", "helping", "Help make lunch!"),
    ("\u{1F4D6}", "sharing", "Read a story together!"),
    ("\u{1F9E9}", "sharing", "Share your puzzle!"),
    ("\u{1F3AA}", "love", "Make someone laugh!"),
    ("\u{1F30A}", "helping", "Help with bath time!"),
    ("\u{1F3E0}", "helping", "Help tidy a room!"),
    ("\u{1F49D}", "love", "Whisper I love you!"),
    ("\u{2B50}", "love", "Be a star helper today!"),
];
const ACHIEVEMENTS: &[(&str, &str, &str)] = &[
    (
        "first_act",
        "First Kind Act!",
        "You did your very first kind act!",
    ),
    (
        "first_hug",
        "First Hug!",
        "Your first hug made someone so happy!",
    ),
    ("first_sharing", "First Sharing!", "Sharing is caring!"),
    ("first_helping", "First Helping!", "What a great helper!"),
    ("first_love", "First Love!", "Spreading love everywhere!"),
    ("ten_hearts", "10 Hearts!", "You've earned 10 hearts!"),
    (
        "twenty_five_hearts",
        "25 Hearts!",
        "25 hearts! You're incredible!",
    ),
    (
        "fifty_hearts",
        "50 Hearts!",
        "50 hearts! Kindness champion!",
    ),
    (
        "hundred_hearts",
        "100 Hearts!",
        "100 hearts! You're LEGENDARY!",
    ),
    ("streak_3", "3 Day Streak!", "3 days of kindness in a row!"),
    ("streak_7", "Week of Kindness!", "7 days in a row!"),
    ("streak_14", "2 Week Champion!", "14 days of kindness!"),
    (
        "five_acts_day",
        "Super Kind Day!",
        "5 kind acts in one day!",
    ),
    (
        "ten_acts_day",
        "Kindness Superstar!",
        "10 kind acts in one day!",
    ),
    (
        "all_categories",
        "Kind All Ways!",
        "You did every type of kindness!",
    ),
];
pub fn init() {
    render_categories();
    bind_tracker_clicks();
    wasm_bindgen_futures::spawn_local(skill_progression::render_mastery_indicators());
}
pub fn render_daily_kindness() {
    let Some(parent) = dom::query("#app") else {
        return;
    };
    let day = js_sys::Date::new_0().get_date() as usize;
    let (emoji, category, text) = DAILY_KINDNESS[day % DAILY_KINDNESS.len()];
    let doc = dom::document();
    let Some(card) = crate::render::create_el_with_class(&doc, "div", "daily-kindness") else {
        return;
    };
    dom::set_attr(&card, "data-kindness-category", category);
    let Some(emoji_el) = crate::render::text_el(&doc, "span", "daily-kindness__emoji", emoji)
    else {
        return;
    };
    let Some(text_el) = crate::render::text_el(&doc, "span", "daily-kindness__text", text) else {
        return;
    };
    let _ = card.append_child(&emoji_el);
    let _ = card.append_child(&text_el);
    let cat = category.to_string();
    dom::on(card.unchecked_ref(), "click", move |_: Event| {
        synth_audio::chime();
        if let Some(card_el) = dom::query(".daily-kindness") {
            animations::jelly_wobble(&card_el);
        }
        log_kind_act(&cat);
        speech::celebrate("You did today's kindness!");
        confetti::burst_hearts();
    });
    // Insert before the streak section if it exists, otherwise append
    if let Some(streak) = dom::query_in(&parent, ".home-streak") {
        let _ = parent.insert_before(&card, Some(&streak));
    } else {
        let _ = parent.append_child(&card);
    }
    let narrate_text = text.to_string();
    dom::set_timeout_once(1500, move || {
        speech::narrate(&narrate_text);
    });
}
fn render_categories() {
    let Some(body) = dom::query(SELECTOR_TRACKER_BODY) else {
        return;
    };
    let doc = dom::document();
    let Some(grid) = crate::render::create_el_with_class(&doc, "div", "kind-grid") else {
        return;
    };
    for &(emoji, label, action, image) in CATEGORIES {
        let Some(btn) = ui::big_emoji_button(emoji, label, action, action, Some(image)) else {
            continue;
        };
        let _ = grid.append_child(&btn);
    }
    let _ = body.append_child(&grid);
}
fn bind_tracker_clicks() {
    if let Some(body) = dom::query(SELECTOR_TRACKER_BODY) {
        dom::on(body.unchecked_ref(), "click", move |event: Event| {
            let Some(el) = dom::event_target_element(&event) else {
                return;
            };
            if let Some(btn) = dom::closest(&el, "[data-action]") {
                if let Some(category) = dom::get_attr(&btn, "data-action") {
                    log_kind_act(&category);
                    animations::jelly_wobble(&btn);
                }
            }
        });
    }
}
fn log_kind_act(category: &str) {
    native_apis::vibrate_tap();
    let id = utils::create_id();
    let day_key = utils::today_key();
    let now = utils::now_epoch_ms();
    let cat = category.to_string();
    let (hearts, is_first_act_today) = state::with_state_mut(|s| {
        s.hearts_today += theme::HEARTS_PER_KIND_ACT;
        s.hearts_total += theme::HEARTS_PER_KIND_ACT;
        (s.hearts_total, s.hearts_today == theme::HEARTS_PER_KIND_ACT)
    });
    ui::update_heart_counter(hearts);
    crate::badges::check_ultimate_heart_spawn(hearts);
    if let Some(el) = state::get_cached_tracker_hearts_counter()
        .or_else(|| dom::query(crate::constants::SELECTOR_TRACKER_HEARTS))
    {
        el.set_text_content(Some(&hearts.to_string()));
    }
    if let Some(c) = state::get_cached_hearts_counter().or_else(|| dom::query(crate::constants::SELECTOR_HEARTS)) {
        animations::float_up_heart(&c);
    }
    if let Some(c) = dom::query("[data-tracker-hearts]") {
        animations::float_up_heart(&c);
    }
    let id_for_reflect = id.clone();
    let cat_for_reflect = cat.clone();
    wasm_bindgen_futures::spawn_local(async move {
        let _ = crate::offline_queue::queued_exec(
            "INSERT INTO kind_acts (id, category, hearts_earned, created_at, day_key) VALUES (?1, ?2, ?3, ?4, ?5)",
            vec![id, cat.clone(), theme::HEARTS_PER_KIND_ACT.to_string(), now.to_string(), day_key],
        )
        .await;
        skill_progression::track_skill_practice(&cat).await;
    });
    let session_count = SESSION_ACTS.with(|c| {
        let n = c.get() + 1;
        c.set(n);
        n
    });
    if is_first_act_today {
        confetti::celebrate(confetti::CelebrationTier::Epic);
        companion::celebrate_first_act_today();
    } else {
        match session_count {
            1..=2 => {
                synth_audio::chime();
                confetti::burst_hearts();
            }
            3..=4 => {
                confetti::celebrate(confetti::CelebrationTier::Great);
                speech::speak("You're on a roll!");
            }
            5..=9 => {
                confetti::celebrate(confetti::CelebrationTier::Amazing);
                speech::speak("So many kind acts!");
            }
            _ => {
                confetti::celebrate(confetti::CelebrationTier::Epic);
                speech::speak("You're AMAZING, Blaire!");
            }
        }
    }
    dom::toast("That was kind! \u{1F49C}");
    companion::on_kind_act();
    streaks::record_today(state::snapshot());
    weekly_goals::increment_progress("acts", 1);
    weekly_goals::increment_progress("hearts", theme::HEARTS_PER_KIND_ACT);
    if hearts.is_multiple_of(theme::STICKER_EVERY_N_HEARTS) {
        synth_audio::sparkle();
        confetti::burst_stars();
        rewards::award_sticker("kind-act");
    }
    if hearts > 0 && hearts.is_multiple_of(10) {
        dom::set_timeout_once(2000, || {
            companion::discover_treasure();
        });
    }
    dom::dispatch_custom_event("kindheart-kind-act-logged", wasm_bindgen::JsValue::NULL);
    dom::set_timeout_once(constants::REFLECTION_PROMPT_DELAY_MS, move || {
        let detail = js_sys::Object::new();
        let _ = js_sys::Reflect::set(&detail, &"act_id".into(), &id_for_reflect.into());
        let _ = js_sys::Reflect::set(&detail, &"category".into(), &cat_for_reflect.into());
        dom::dispatch_custom_event("kindheart-reflection-ready", detail.into());
    });
    // Personal bests and achievements
    let today_acts = state::with_state(|s| s.hearts_today / theme::HEARTS_PER_KIND_ACT);
    check_personal_best(today_acts);
    check_achievements(category);
}
fn check_personal_best(today_count: u32) {
    crate::browser_apis::spawn_local_logged("tracker-personal-best", async move {
        let prev_best: u32 = db_client::get_setting("personal_best_daily")
            .await
            .and_then(|s| s.parse().ok())
            .unwrap_or(0);
        if today_count > prev_best && today_count > 1 {
            db_client::set_setting("personal_best_daily", &today_count.to_string()).await;
            let msg = format!("New record, Blaire! {today_count} kind acts in one day!");
            synth_audio::level_up();
            companion::on_kind_act();
            speech::celebrate(&msg);
            confetti::burst_party();
        }
        Ok(())
    });
}
fn check_achievements(category: &str) {
    let cat = category.to_string();
    crate::browser_apis::spawn_local_logged("tracker-achievements", async move {
        let (hearts_total, hearts_today, streak_days) =
            state::with_state(|s| (s.hearts_total, s.hearts_today, s.streak_days));
        let mut to_award: Vec<&str> = Vec::with_capacity(5);
        // Heart milestones
        if hearts_total >= 10 {
            to_award.push("ten_hearts");
        }
        if hearts_total >= 25 {
            to_award.push("twenty_five_hearts");
        }
        if hearts_total >= 50 {
            to_award.push("fifty_hearts");
        }
        if hearts_total >= 100 {
            to_award.push("hundred_hearts");
        }
        // Streak milestones
        if streak_days >= 3 {
            to_award.push("streak_3");
        }
        if streak_days >= 7 {
            to_award.push("streak_7");
        }
        if streak_days >= 14 {
            to_award.push("streak_14");
        }
        // Daily milestones
        if hearts_today >= 5 * theme::HEARTS_PER_KIND_ACT {
            to_award.push("five_acts_day");
        }
        if hearts_today >= 10 * theme::HEARTS_PER_KIND_ACT {
            to_award.push("ten_acts_day");
        }
        // First act overall
        if hearts_total == theme::HEARTS_PER_KIND_ACT {
            to_award.push("first_act");
        }
        // Category-specific firsts
        let first_id = match cat.as_str() {
            "hug" => Some("first_hug"),
            "sharing" => Some("first_sharing"),
            "helping" => Some("first_helping"),
            "love" => Some("first_love"),
            _ => None,
        };
        if let Some(achievement_id) = first_id {
            let count_result = db_client::query(
                "SELECT COUNT(*) as cnt FROM kind_acts WHERE category = ?1",
                vec![cat.clone()],
            )
            .await;
            let count: u32 = count_result
                .ok()
                .and_then(|rows| rows.get(0)?.get("cnt")?.as_u64().map(|v| v as u32))
                .unwrap_or(0);
            if count == 1 {
                to_award.push(achievement_id);
            }
        }
        for achievement_id in to_award {
            let settings_key = format!("achievement_{}", achievement_id);
            let already_earned = db_client::get_setting(&settings_key).await.is_some();
            if !already_earned {
                // Award via settings table since these are hidden achievements not in badges table
                db_client::set_setting(&settings_key, "1").await;
                if let Some((_, title, desc)) =
                    ACHIEVEMENTS.iter().find(|(id, _, _)| *id == achievement_id)
                {
                    synth_audio::level_up();
                    speech::celebrate(title);
                    confetti::burst_party();
                    let desc_text = desc.to_string();
                    dom::set_timeout_once(2000, move || {
                        speech::speak(&desc_text);
                    });
                }
                // Only celebrate one achievement at a time
                break;
            }
        }
        Ok(())
    });
}

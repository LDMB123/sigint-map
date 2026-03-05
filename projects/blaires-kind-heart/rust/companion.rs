use crate::{
    animations, browser_apis, companion_care, companion_speech, confetti, db_client, dom, render,
    panel_registry, session_timer, speech, state, synth_audio, theme, time_awareness,
};
use crate::tracker_store;
use std::cell::{Cell, RefCell};
use std::thread::LocalKey;
use wasm_bindgen::JsCast;
use web_sys::{Element, Event};
thread_local! {
    static PENDING_RENDER_ABORT: RefCell<Option<web_sys::AbortController>> = const { RefCell::new(None) };
    static EXPRESSION_RENDER_ABORT: RefCell<Option<web_sys::AbortController>> = const { RefCell::new(None) };
    static TYPEWRITER_ABORT: RefCell<Option<web_sys::AbortController>> = const { RefCell::new(None) };
    static COMPANION_TAP_BOUND: Cell<bool> = const { Cell::new(false) };
    static TICKLE_TAP_COUNT: Cell<u32> = const { Cell::new(0) };
    static TICKLE_LAST_TAP_MS: Cell<f64> = const { Cell::new(0.0) };
    static LAST_PLAY_ANIM: Cell<u32> = const { Cell::new(99) };
}
fn spawn_skin_render(
    abort_key: &'static LocalKey<RefCell<Option<web_sys::AbortController>>>,
    expression: &'static str,
) {
    abort_key.with(|cell| {
        if let Some(c) = cell.borrow().as_ref() {
            c.abort();
        }
    });
    let ctrl = web_sys::AbortController::new().ok();
    let signal = ctrl.as_ref().map(|c| c.signal());
    abort_key.with(|cell| {
        *cell.borrow_mut() = ctrl;
    });
    wasm_bindgen_futures::spawn_local(async move {
        let skin_id = crate::companion_skins::get_active_skin()
            .await
            .unwrap_or_else(|| "default".to_string());
        if signal.as_ref().is_some_and(|s| s.aborted()) {
            return;
        }
        render_companion_with_skin(&skin_id, expression);
        abort_key.with(|cell| *cell.borrow_mut() = None);
    });
}
const CELEBRATE_PHRASES: &[&str] = &[
    "Yay Blaire! That was so kind!",
    "Blaire, you did it! Amazing!",
    "Sparkle is SO proud of you, Blaire!",
    "Blaire is doing a happy dance!",
    "That made someone so happy, Blaire!",
    "Wow Blaire! You're incredible!",
    "Kindness looks great on you, Blaire!",
    "Sparkle is cheering for you!",
    "That was beautiful!",
    "What a kind heart!",
    "Blaire, you're a kindness superstar!",
    "Another act of kindness! Keep going, Blaire!",
];
const QUEST_PHRASES: &[&str] = &[
    "You did it, Blaire! Quest complete!",
    "Amazing Blaire! Another quest done!",
    "Sparkle knew you could do it!",
    "Quest champion! You're unstoppable!",
    "Blaire finished a quest! Hooray!",
    "That quest was no match for you!",
];
const STICKER_PHRASES: &[&str] = &[
    "Ooh Blaire! A new sticker! So pretty!",
    "Look at that beautiful sticker, Blaire!",
    "Your collection is growing!",
    "Sparkle loves that sticker!",
    "What a sparkly sticker! Add it!",
    "Blaire, your stickers are amazing!",
];
const STORY_PHRASES: &[&str] = &[
    "What a great story, Blaire!",
    "Blaire, I love that story!",
    "Stories are magical!",
    "Tell me another one, Blaire!",
    "Sparkle loves story time!",
    "That story made me smile!",
];
const GAME_PHRASES: &[&str] = &[
    "Great job, Blaire!",
    "Blaire, you did it!",
    "That was so fun!",
    "Play again! Play again!",
    "Blaire is a game champion!",
    "Sparkle loves watching you play!",
];
const FIRST_ACT_PHRASES: &[&str] = &[
    "WOW Blaire! First kind act today! AMAZING!",
    "YES Blaire! The kindness streak begins!",
    "First kindness of the day! You're incredible!",
    "Blaire is starting the day with kindness!",
    "The very first act! What a great start!",
    "Sparkle is SO excited! Here we go!",
];
const IDLE_BEHAVIORS: &[(&str, &str)] = &[
    ("companion--excited", "Ooh!"),
    ("companion--dancing", "La la la!"),
    ("companion--sleepy", "*yawn*"),
    ("companion--cheering", "Go Blaire!"),
    ("companion--happy", "Hee hee!"),
    ("companion--surprised", "Wow!"),
    ("companion--proud", "I'm so proud!"),
    ("companion--silly", "Hee hee hee!"),
    ("companion--curious", "Ooh, interesting!"),
    ("companion--loving", "💖"),
    ("companion--thinking", "Hmm..."),
    ("companion--celebrating", "Hooray!"),
];
const MORNING_GREETINGS: &[&str] = &[
    "Good morning, Blaire! Let's be kind today!",
    "Rise and shine, Blaire!",
    "What a beautiful morning, Blaire!",
    "Good morning! Ready for adventures?",
    "Blaire, the morning is so sparkly!",
];
const AFTERNOON_GREETINGS: &[&str] = &[
    "Having a great day, Blaire?",
    "What fun today, Blaire!",
    "Hi Blaire! Ready to be kind?",
    "Let's have an adventure, Blaire!",
    "Blaire, you make the world brighter!",
];
const EVENING_GREETINGS: &[&str] = &[
    "What a day we had, Blaire!",
    "Evening sparkles, Blaire!",
    "What a kind day, Blaire!",
    "The stars are coming out for you, Blaire!",
    "What adventures today, Blaire!",
];
const NIGHT_GREETINGS: &[&str] = &[
    "Time for one more story, Blaire?",
    "Sleepy sparkles, Blaire!",
    "Getting sleepy? One more story!",
    "Goodnight hugs, Blaire!",
    "Sweet dreams are coming, Blaire!",
];
fn pick_phrase<'a>(phrases: &'a [&'a str]) -> &'a str {
    let idx = (browser_apis::now_ms() as usize) % phrases.len();
    phrases[idx]
}
fn pick_index(n: usize, salt: u32) -> usize {
    ((browser_apis::now_ms() as u64).wrapping_add(u64::from(salt)) as usize) % n
}
pub fn get_companion() -> Option<Element> {
    state::get_cached_companion().or_else(|| dom::query(crate::constants::SELECTOR_COMPANION))
}
pub fn init() {
    let companion = get_companion();
    if let Some(el) = companion {
        el.set_text_content(Some("\u{1F984}")); // unicorn emoji fallback during async load
        dom::set_attr(&el, "aria-label", "Sparkle the Unicorn");
        dom::set_attr(&el, "role", "img");
        let mood_str = crate::state::with_state(|s| s.sparkle_mood.clone());
        let mood_expr = crate::companion_skins::mood_to_expression(&mood_str);
        spawn_skin_render(&PENDING_RENDER_ABORT, mood_expr);
        let _ = el.class_list().add_1("companion--idle");
        let _ = el.class_list().add_1("glow-breathe");
        bind_companion_tap(&el);
    }
    start_idle_loop();
}
fn bind_companion_tap(el: &Element) {
    if COMPANION_TAP_BOUND.with(|c| c.replace(true)) {
        return;
    }
    dom::on(el.unchecked_ref(), "click", move |_: Event| {
        let now = browser_apis::now_ms();
        let last = TICKLE_LAST_TAP_MS.with(Cell::get);
        if now - last < 500.0 {
            TICKLE_TAP_COUNT.with(|c| c.set(c.get() + 1));
        } else {
            TICKLE_TAP_COUNT.with(|c| c.set(1));
        }
        TICKLE_LAST_TAP_MS.with(|l| l.set(now));
        let count = TICKLE_TAP_COUNT.with(Cell::get);
        if count >= 5 {
            TICKLE_TAP_COUNT.with(|c| c.set(0));
            on_tickle();
        } else if count == 1 {
            dom::set_timeout_once(550, || {
                let current_count = TICKLE_TAP_COUNT.with(Cell::get);
                if current_count == 1 {
                    TICKLE_TAP_COUNT.with(|c| c.set(0));
                    show_conversation_menu();
                }
            });
        }
    });
}
fn on_tickle() {
    synth_audio::giggle();
    speech::celebrate("You found my tickle spot!");
    set_expression("companion--silly");
    confetti::burst_unicorn();
    if let Some(el) = get_companion() {
        animations::bounce(&el);
    }
}
fn show_conversation_menu() {
    // Remove any existing care menu
    if let Some(old) = dom::query("[data-care-menu]") {
        old.remove();
    }
    let doc = dom::document();
    let Some(menu) = render::create_el_with_class(&doc, "div", "care-menu") else {
        return;
    };
    dom::set_attr(&menu, "data-care-menu", "");
    dom::set_attr(&menu, "popover", "auto");
    // Create 3 care buttons: Feed, Pet, Play
    for (emoji, label, key) in [
        ("\u{1F36A}", "Feed", "feed"),
        ("\u{1F917}", "Pet", "pet"),
        ("\u{1F3AA}", "Play", "play"),
    ] {
        let Some(btn) = render::create_el_with_class(&doc, "button", "care-btn") else {
            continue;
        };
        dom::set_attr(&btn, "type", "button");
        dom::set_attr(&btn, "data-care", key);
        dom::set_attr(&btn, "aria-label", label);
        btn.set_text_content(Some(emoji));
        let Some(lbl) = render::create_el_with_class(&doc, "span", "care-btn-label") else {
            continue;
        };
        lbl.set_text_content(Some(label));
        let _ = btn.append_child(&lbl);
        let _ = menu.append_child(&btn);
    }
    let _ = doc.body().map(|b| b.append_child(&menu));
    // Show popover via togglePopover
    if let Ok(toggle_fn) =
        js_sys::Reflect::get(&menu, &wasm_bindgen::JsValue::from_str("togglePopover"))
    {
        if let Ok(func) = toggle_fn.dyn_into::<js_sys::Function>() {
            let _ = func.call0(&menu);
        }
    }
    // Event delegation on click
    dom::on(menu.unchecked_ref(), "click", move |e: Event| {
        let Some(target) = dom::event_target_element(&e) else {
            return;
        };
        let el = if dom::has_attr(&target, "data-care") {
            target
        } else if let Some(parent) = dom::closest(&target, "[data-care]") {
            parent
        } else {
            return;
        };
        let Some(kind) = dom::get_attr(&el, "data-care") else {
            return;
        };
        match kind.as_str() {
            "feed" => on_care_feed(),
            "pet" => on_care_pet(),
            "play" => on_care_play(),
            _ => {}
        }
    });
    // Auto-dismiss after 5 seconds
    dom::set_timeout_once(5000, || {
        if let Some(m) = dom::query("[data-care-menu]") {
            hide_and_remove_popover(&m);
        }
    });
    synth_audio::chime();
}
fn dismiss_care_menu() {
    if let Some(m) = dom::query("[data-care-menu]") {
        hide_and_remove_popover(&m);
    }
}
fn hide_and_remove_popover(menu: &Element) {
    if let Ok(hide_fn) = js_sys::Reflect::get(menu, &wasm_bindgen::JsValue::from_str("hidePopover")) {
        if let Ok(func) = hide_fn.dyn_into::<js_sys::Function>() {
            let _ = func.call0(menu);
        }
    }
    menu.remove();
}
fn on_care_feed() {
    if companion_care::feed_cooldown_remaining() > 0.0 {
        dismiss_care_menu();
        if let Some(companion) = get_companion() {
            show_bubble_typewriter(&companion, "Sparkle isn't hungry yet!");
        }
        return;
    }
    // Replace care menu content with food sub-menu
    let Some(menu) = dom::query("[data-care-menu]") else {
        return;
    };
    dom::safe_set_inner_html(&menu, "");
    let _ = menu.class_list().add_1("food-menu");
    let hearts = state::with_state(|s| s.hearts_total);
    let foods: &[(&str, &str, u32)] = &[
        ("\u{1F308}\u{1F36A}", "cookie", 0),  // Rainbow Cookie — always
        ("\u{2B50}\u{1F34E}", "fruit", 25),   // Star Fruit — 25+ hearts
        ("\u{1F48E}\u{1FAD0}", "berry", 100), // Crystal Berry — 100+ hearts
    ];
    let doc = dom::document();
    for &(emoji, key, required_hearts) in foods {
        let Some(btn) = render::create_el_with_class(&doc, "button", "food-btn") else {
            continue;
        };
        dom::set_attr(&btn, "type", "button");
        dom::set_attr(&btn, "data-food", key);
        btn.set_text_content(Some(emoji));
        if hearts < required_hearts {
            dom::set_attr(&btn, "data-locked", "");
            dom::set_attr(&btn, "disabled", "");
        }
        let _ = menu.append_child(&btn);
    }
    // Event delegation for food choice
    dom::on(menu.unchecked_ref(), "click", move |e: Event| {
        let Some(target) = dom::event_target_element(&e) else {
            return;
        };
        let el = if dom::has_attr(&target, "data-food") {
            target
        } else if let Some(parent) = dom::closest(&target, "[data-food]") {
            parent
        } else {
            return;
        };
        if dom::has_attr(&el, "data-locked") {
            return;
        }
        dismiss_care_menu();
        synth_audio::chomp();
        // Check if first feed today before recording
        let feeds_before = state::with_state(|s| s.sparkle_feeds_today);
        browser_apis::spawn_local_logged("care-feed", async move {
            companion_care::record_feed().await;
            synth_audio::munch();
            if let Some(companion) = get_companion() {
                animations::bounce(&companion);
            }
            companion_speech::on_feed();
            // First feed today bonus heart — record as kind_acts entry so it persists across reloads
            if feeds_before == 0 {
                state::with_state_mut(|s| {
                    s.hearts_total += 1;
                    s.hearts_today += 1;
                });
                let id = format!("care-feed-{}", crate::utils::today_key());
                let now = js_sys::Date::now().to_string();
                let day_key = crate::utils::today_key();
                tracker_store::insert_care_feed_bonus_fire_and_forget(&id, &now, &day_key);
            }
            Ok(())
        });
    });
}
fn on_care_pet() {
    dismiss_care_menu();
    synth_audio::purr();
    confetti::float_emoji(crate::constants::SELECTOR_COMPANION, "\u{2728}");
    if let Some(el) = get_companion() {
        animations::bounce(&el);
    }
    set_expression("companion--happy");
    browser_apis::spawn_local_logged("care-pet", async {
        companion_care::record_pet().await;
        companion_speech::on_pet();
        Ok(())
    });
}
fn on_care_play() {
    if companion_care::play_cooldown_remaining() > 0.0 {
        return;
    }
    dismiss_care_menu();
    // Pick random animation index 0-3, avoid repeating last
    let last = LAST_PLAY_ANIM.with(Cell::get);
    let mut idx = (browser_apis::now_ms() as u32) % 4;
    if idx == last {
        idx = (idx + 1) % 4;
    }
    LAST_PLAY_ANIM.with(|c| c.set(idx));
    const ANIM_CLASSES: &[&str] = &[
        "companion--anim-spin",
        "companion--anim-jump",
        "companion--anim-rainbow",
        "companion--anim-burst",
    ];
    let class: &'static str = ANIM_CLASSES[idx as usize];
    // Play corresponding sound
    match idx {
        0 => synth_audio::whoosh(),
        1 => synth_audio::boing(),
        2 => synth_audio::shimmer(),
        3 => synth_audio::twinkle(),
        _ => {}
    }
    // Apply animation class (class is &'static str from anim_classes, safe to move into closure)
    if let Some(el) = get_companion() {
        let _ = el.class_list().add_1(class);
        dom::set_timeout_once(1200, move || {
            if let Some(el) = get_companion() {
                let _ = el.class_list().remove_1(class);
            }
        });
    }
    browser_apis::spawn_local_logged("care-play", async {
        companion_care::record_play().await;
        companion_speech::on_play();
        Ok(())
    });
}
pub fn render_companion_with_skin(skin_id: &str, expression: &str) {
    use wasm_bindgen::JsCast;
    let Some(companion_el) = get_companion() else {
        return;
    };
    let skin = crate::companion_skins::SKINS
        .iter()
        .find(|s| s.id == skin_id)
        .unwrap_or(&crate::companion_skins::SKINS[0]); // Fallback to default
    let expression_name = match expression {
        "celebrating" => "celebrate",
        "proud" => "encourage",
        _ => "happy",
    };
    let asset_path = skin
        .get_asset(expression_name)
        .unwrap_or("companions/default_happy.webp"); // Emergency fallback
    if let Some(old_img) = dom::query_in(&companion_el, "img") {
        old_img.remove();
    }
    let doc = dom::document();
    let Some(img) = crate::render::create_img(&doc, asset_path, "Sparkle the Unicorn", "") else {
        return;
    };
    dom::set_attr(&img, "width", "256");
    dom::set_attr(&img, "height", "256");
    if let Ok(html_img) = img.clone().dyn_into::<web_sys::HtmlImageElement>() {
        let companion_clone = companion_el.clone();
        let error_closure = wasm_bindgen::closure::Closure::once_into_js(move || {
            companion_clone.set_text_content(Some("\u{1F984}"));
        });
        html_img.set_onerror(Some(error_closure.as_ref().unchecked_ref()));
    }
    let _ = companion_el.append_child(&img);
}
const fn no_op() {}
struct Reaction {
    phrases: &'static [&'static str],
    expression: &'static str,
    confetti: &'static str,
    extra_sound: fn(),
}
fn fire_reaction(r: &Reaction) {
    let phrase = pick_phrase(r.phrases);
    set_expression(r.expression);
    react(phrase);
    confetti::float_emoji(crate::constants::SELECTOR_COMPANION, r.confetti);
    (r.extra_sound)();
}
const R_KIND_ACT: Reaction = Reaction {
    phrases: CELEBRATE_PHRASES,
    expression: "companion--excited",
    confetti: "\u{1F49C}",
    extra_sound: no_op,
};
const R_QUEST: Reaction = Reaction {
    phrases: QUEST_PHRASES,
    expression: "companion--cheering",
    confetti: "\u{2B50}",
    extra_sound: no_op,
};
const R_STICKER: Reaction = Reaction {
    phrases: STICKER_PHRASES,
    expression: "companion--dancing",
    confetti: "\u{1F984}",
    extra_sound: synth_audio::gentle as fn(),
};
const R_STORY: Reaction = Reaction {
    phrases: STORY_PHRASES,
    expression: "companion--curious",
    confetti: "\u{1F4D6}",
    extra_sound: no_op,
};
const R_GAME: Reaction = Reaction {
    phrases: GAME_PHRASES,
    expression: "companion--silly",
    confetti: "\u{1F389}",
    extra_sound: synth_audio::chime as fn(),
};
const R_FIRST_ACT: Reaction = Reaction {
    phrases: FIRST_ACT_PHRASES,
    expression: "companion--celebrating",
    confetti: "\u{2B50}",
    extra_sound: no_op,
};
pub fn on_kind_act() {
    fire_reaction(&R_KIND_ACT);
    browser_apis::spawn_local_logged("mood-update-act", async {
        companion_care::update_mood().await;
        Ok(())
    });
}
pub fn on_quest_complete() {
    fire_reaction(&R_QUEST);
}
pub fn on_sticker_earned() {
    fire_reaction(&R_STICKER);
}
pub fn on_story_complete() {
    fire_reaction(&R_STORY);
}
pub fn on_game_complete() {
    fire_reaction(&R_GAME);
}
pub fn celebrate_first_act_today() {
    fire_reaction(&R_FIRST_ACT);
    browser_apis::spawn_local_logged("mood-update-first", async {
        companion_care::update_mood().await;
        Ok(())
    });
}
const TREASURE_PHRASES: &[&str] = &[
    "Blaire! I found a treasure!",
    "Ooh look! A hidden treasure!",
    "Treasure time! You earned it, Blaire!",
    "Sparkle found something shiny!",
];
pub fn discover_treasure() {
    synth_audio::treasure_reveal();
    let phrase = pick_phrase(TREASURE_PHRASES);
    set_expression("companion--surprised");
    react(phrase);
    confetti::burst_party();
}
pub fn on_reunion(days_away: u32) {
    synth_audio::reunion_sparkle();
    set_expression("companion--excited");
    let greeting = match days_away {
        1..=2 => "Blaire! I missed you! Let's be kind today!",
        3..=6 => "BLAIRE! You're back! I missed you SO much!",
        _ => "BLAIRE!! I missed you SO SO much! I'm so happy you're here!",
    };
    react(greeting);
    confetti::burst_unicorn();
    let followup = "Let's see what's new!".to_string();
    dom::set_timeout_once(2500, move || {
        if let Some(companion) = get_companion() {
            show_bubble_typewriter(&companion, &followup);
        }
        speech::speak(&followup);
    });
}
const REFLECTION_PHRASES: &[&str] = &[
    "Thank you for sharing, Blaire!",
    "Blaire, I love learning about kindness!",
    "That's so thoughtful!",
    "You're helping me understand!",
];
pub fn celebrate_reflection() {
    let phrase = pick_phrase(REFLECTION_PHRASES);
    set_expression("companion--happy");
    if let Some(el) = get_companion() {
        show_bubble_typewriter(&el, phrase);
    }
    speech::speak(phrase);
}
pub fn greet() {
    let phrases = match time_awareness::detect() {
        time_awareness::TimeOfDay::Morning => MORNING_GREETINGS,
        time_awareness::TimeOfDay::Afternoon => AFTERNOON_GREETINGS,
        time_awareness::TimeOfDay::Evening => EVENING_GREETINGS,
        time_awareness::TimeOfDay::Night => NIGHT_GREETINGS,
    };
    let phrase = pick_phrase(phrases);
    if let Some(el) = get_companion() {
        show_bubble_typewriter(&el, phrase);
    }
    speech::speak(phrase);
}
fn react(phrase: &str) {
    if let Some(el) = get_companion() {
        animations::bounce(&el);
        show_bubble_typewriter(&el, phrase);
    }
    speech::celebrate(phrase);
}
const EXPRESSION_CLASSES: &[&str] = &[
    "companion--idle",
    "companion--happy",
    "companion--excited",
    "companion--sleepy",
    "companion--cheering",
    "companion--dancing",
    "companion--surprised",
    "companion--proud",
    "companion--silly",
    "companion--curious",
    "companion--loving",
    "companion--thinking",
    "companion--celebrating",
];
fn set_expression(class: &'static str) {
    if let Some(el) = get_companion() {
        for &c in EXPRESSION_CLASSES {
            let _ = el.class_list().remove_1(c);
        }
        let _ = el.class_list().add_1(class);
        let asset_expr = match class {
            "companion--celebrating" | "companion--cheering" | "companion--dancing" => {
                "celebrating"
            }
            "companion--proud" | "companion--loving" => "proud",
            _ => "happy",
        };
        spawn_skin_render(&EXPRESSION_RENDER_ABORT, asset_expr);
        dom::set_timeout_once(theme::COMPANION_EXPRESSION_TIMEOUT_MS, move || {
            if let Some(el) = get_companion() {
                let _ = el.class_list().remove_1(class);
                let _ = el.class_list().add_1("companion--idle");
                spawn_skin_render(&EXPRESSION_RENDER_ABORT, "happy");
            }
        });
    }
}
fn start_idle_loop() {
    wasm_bindgen_futures::spawn_local(async {
        loop {
            let wait = theme::COMPANION_IDLE_BASE_MS
                + (pick_index(theme::COMPANION_IDLE_BASE_MS as usize, 7919) as i32);
            browser_apis::sleep_ms(wait).await;
            time_awareness::refresh_if_changed();
            let on_home = dom::query("[data-panel='home']:not([hidden])").is_some();
            let transitioning = dom::query("[data-panel='home'][data-transitioning]").is_some();
            if !on_home || transitioning {
                continue;
            }
            let is_night = time_awareness::detect() == time_awareness::TimeOfDay::Night;
            let deep_wind = session_timer::is_deep_wind_down();
            let wind = session_timer::is_wind_down();
            let (class, phrase) = if deep_wind {
                let phrases: &[&str] = &[
                    "Maybe one more story before bed?",
                    "Are we getting sleepy?",
                    "*yawn* What a fun day...",
                    "Sparkle is getting sleepy...",
                    "Time to rest soon, Blaire?",
                ];
                (
                    "companion--sleepy",
                    phrases[pick_index(phrases.len(), 6173)],
                )
            } else if (is_night || wind) && pick_index(3, 4219) == 0 {
                ("companion--sleepy", "*yawn* Sleepy time...")
            } else {
                let idx = pick_index(IDLE_BEHAVIORS.len(), 3571);
                IDLE_BEHAVIORS[idx]
            };
            set_expression(class);
            if let Some(el) = get_companion() {
                show_bubble_typewriter(&el, phrase);
            }
            match class {
                "companion--dancing" => synth_audio::giggle(),
                "companion--sleepy" => synth_audio::dreamy(),
                "companion--excited" => synth_audio::magic_wand(),
                "companion--cheering" => synth_audio::chime(),
                _ => {}
            }
        }
    });
}
pub(crate) fn show_bubble_typewriter(companion: &Element, text: &str) {
    TYPEWRITER_ABORT.with(|cell| {
        if let Some(c) = cell.borrow().as_ref() {
            c.abort();
        }
    });
    let ctrl = web_sys::AbortController::new().ok();
    let signal = ctrl.as_ref().map(|c| c.signal());
    TYPEWRITER_ABORT.with(|cell| {
        *cell.borrow_mut() = ctrl;
    });
    if let Some(old) = dom::query("[data-companion-bubble]") {
        old.remove();
    }
    let doc = dom::document();
    let Some(bubble) =
        render::create_el_with_data(&doc, "div", "companion-bubble", "data-companion-bubble")
    else {
        return;
    };
    dom::set_attr(&bubble, "aria-live", "polite");
    let _ = companion.append_child(&bubble);
    let full_text = text.to_string();
    wasm_bindgen_futures::spawn_local(async move {
        // Query once before the character loop to avoid repeated DOM queries per character.
        let Some(bubble) = dom::query("[data-companion-bubble]") else {
            return;
        };
        let chars: Vec<char> = full_text.chars().collect();
        let mut shown = String::new();
        for ch in &chars {
            if signal.as_ref().is_some_and(|s| s.aborted()) {
                return;
            }
            shown.push(*ch);
            bubble.set_text_content(Some(&shown));
            browser_apis::sleep_ms(theme::COMPANION_TYPEWRITER_CHAR_MS).await;
        }
        if signal.as_ref().is_some_and(|s| s.aborted()) {
            return;
        }
        browser_apis::sleep_ms(theme::COMPANION_BUBBLE_DWELL_MS).await;
        if signal.as_ref().is_some_and(|s| s.aborted()) {
            return;
        }
        bubble.remove();
        TYPEWRITER_ABORT.with(|cell| *cell.borrow_mut() = None);
    });
}
pub fn check_first_visit(panel_id: &str) {
    let panel = panel_id.to_string();
    wasm_bindgen_futures::spawn_local(async move {
        let Some(meta) = panel_registry::get_panel(&panel) else {
            return;
        };
        let key = format!("visited_{}", meta.id);
        let visited = db_client::get_setting(&key).await.is_some();
        if visited {
            return;
        }
        db_client::set_setting(&key, "1").await;
        if let Some(tip) = meta.first_visit_tip {
            let tip_text = tip.to_string();
            dom::set_timeout_once(600, move || {
                speech::narrate(&tip_text);
                if let Some(companion) = get_companion() {
                    show_bubble_typewriter(&companion, &tip_text);
                }
            });
        }
    });
}

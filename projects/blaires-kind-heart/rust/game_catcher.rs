//! Kindness Catcher — multi-level endless arcade.
//! Hearts, stars, unicorns fall — tap to catch! Avoid rain clouds.
//! Lives system (no timer), combo chains, power-ups, level progression.
//! Uses requestAnimationFrame game loop for smooth 60fps.

use std::cell::RefCell;
use std::rc::Rc;
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;
use web_sys::{Element, Event};

use crate::{
    browser_apis, confetti, db_client, dom, games, native_apis, render, speech,
    state::AppState, synth_audio, theme, ui, utils, weekly_goals,
};

// ── Item types ──────────────────────────────────────────────────────

#[derive(Clone, Copy, PartialEq)]
enum ItemKind {
    Heart,        // 1 point
    Star,         // 2 points
    Unicorn,      // 5 points
    RainCloud,    // lose a life
    GoldenHeart,  // 2x points for 8s
    ShieldBubble, // blocks next cloud
    Magnet,       // items drift to center 5s
    RainbowStar,  // 10pts + instant x3 combo
    TimeFreeze,   // slows items for 4s
    StarShower,   // spawns 5 bonus stars
    SizeBoost,    // makes items bigger for 6s
}

impl ItemKind {
    fn emoji(&self) -> &str {
        match self {
            Self::Heart => "\u{1F496}",
            Self::Star => "\u{2B50}",
            Self::Unicorn => "\u{1F984}",
            Self::RainCloud => "\u{1F327}",
            Self::GoldenHeart => "\u{1F49B}",
            Self::ShieldBubble => "\u{1F6E1}",
            Self::Magnet => "\u{1FA84}",
            Self::RainbowStar => "\u{1F308}",
            Self::TimeFreeze => "\u{23F3}",
            Self::StarShower => "\u{2728}",
            Self::SizeBoost => "\u{1F50D}",
        }
    }

    fn base_points(&self) -> u32 {
        match self {
            Self::Heart => 1,
            Self::Star => 2,
            Self::Unicorn => 5,
            Self::RainbowStar => 10,
            Self::GoldenHeart | Self::ShieldBubble | Self::Magnet |
            Self::TimeFreeze | Self::StarShower | Self::SizeBoost => 1,
            Self::RainCloud => 0,
        }
    }

    fn css_class(&self) -> &str {
        match self {
            Self::Heart => "catcher-item catcher-item--heart",
            Self::Star => "catcher-item catcher-item--star",
            Self::Unicorn => "catcher-item catcher-item--unicorn",
            Self::RainCloud => "catcher-item catcher-item--cloud",
            Self::GoldenHeart => "catcher-item catcher-item--golden",
            Self::ShieldBubble => "catcher-item catcher-item--shield",
            Self::Magnet => "catcher-item catcher-item--magnet",
            Self::RainbowStar => "catcher-item catcher-item--rainbow",
            Self::TimeFreeze => "catcher-item catcher-item--freeze",
            Self::StarShower => "catcher-item catcher-item--shower",
            Self::SizeBoost => "catcher-item catcher-item--size",
        }
    }

    fn kind_attr(&self) -> &str {
        match self {
            Self::Heart => "heart",
            Self::Star => "star",
            Self::Unicorn => "unicorn",
            Self::RainCloud => "cloud",
            Self::GoldenHeart => "golden",
            Self::ShieldBubble => "shield",
            Self::Magnet => "magnet",
            Self::RainbowStar => "rainbow",
            Self::TimeFreeze => "freeze",
            Self::StarShower => "shower",
            Self::SizeBoost => "size",
        }
    }

    fn is_power_up(&self) -> bool {
        matches!(self,
            Self::GoldenHeart | Self::ShieldBubble | Self::Magnet |
            Self::RainbowStar | Self::TimeFreeze | Self::StarShower | Self::SizeBoost
        )
    }
}

// ── Active power-up state ───────────────────────────────────────────

#[derive(Default)]
struct PowerUpState {
    golden_until_ms: f64,    // 2x points active until this timestamp
    shield_active: bool,     // blocks next cloud
    magnet_until_ms: f64,    // items drift to center until this timestamp
    freeze_until_ms: f64,    // slow items until this timestamp
    size_until_ms: f64,      // bigger items until this timestamp
}

impl PowerUpState {
    fn is_golden(&self, now: f64) -> bool { now < self.golden_until_ms }
    fn is_magnet(&self, now: f64) -> bool { now < self.magnet_until_ms }
    fn is_freeze(&self, now: f64) -> bool { now < self.freeze_until_ms }
    #[allow(dead_code)]
    fn is_size(&self, now: f64) -> bool { now < self.size_until_ms }
}

// ── Game state ──────────────────────────────────────────────────────

struct CatcherState {
    score: u32,
    level: u32,
    lives: u32,
    combo_chain: u32,
    combo_best: u32,
    last_catch_ms: f64,
    active: bool,
    raf_id: Option<i32>,
    spawn_interval_id: Option<i32>,
    state: Rc<RefCell<AppState>>,
    abort: browser_apis::AbortHandle,
    power_ups: PowerUpState,
    start_time_ms: f64,
}

thread_local! {
    static GAME: RefCell<Option<CatcherState>> = const { RefCell::new(None) };
}

// ── Public API ──────────────────────────────────────────────────────


pub fn start(state: Rc<RefCell<AppState>>) {
    let Some(arena) = dom::query("#game-arena") else { return };
    let doc = dom::document();

    let container = render::create_el_with_class(&doc, "div", "catcher-container");

    // HUD: lives + score + level + combo
    let hud = render::create_el_with_class(&doc, "div", "catcher-hud");

    let lives_el = render::create_el_with_class(&doc, "span", "catcher-lives");
    lives_el.set_text_content(Some(&"\u{1F496}".repeat(theme::CATCHER_STARTING_LIVES as usize)));
    let _ = lives_el.set_attribute("data-catcher-lives", "");
    let _ = lives_el.set_attribute("aria-label", "Lives");

    let score_el = render::create_el_with_class(&doc, "span", "catcher-score");
    score_el.set_text_content(Some("\u{2B50} 0"));
    let _ = score_el.set_attribute("data-catcher-score", "");
    let _ = score_el.set_attribute("aria-live", "polite");

    let level_el = render::create_el_with_class(&doc, "span", "catcher-level");
    level_el.set_text_content(Some("Lv 1"));
    let _ = level_el.set_attribute("data-catcher-level", "");

    let combo_el = render::create_el_with_class(&doc, "span", "catcher-combo");
    let _ = combo_el.set_attribute("data-catcher-combo", "");
    let _ = combo_el.set_attribute("hidden", "");

    let powerup_el = render::create_el_with_class(&doc, "span", "catcher-powerup-indicator");
    let _ = powerup_el.set_attribute("data-catcher-powerup", "");
    let _ = powerup_el.set_attribute("hidden", "");

    let _ = hud.append_child(&lives_el);
    let _ = hud.append_child(&score_el);
    let _ = hud.append_child(&level_el);
    let _ = hud.append_child(&combo_el);
    let _ = hud.append_child(&powerup_el);

    // Play area
    let play_area = render::create_el_with_class(&doc, "div", "catcher-play-area");
    let _ = play_area.set_attribute("data-catcher-area", "");

    // Start message
    let start_msg = render::create_el_with_class(&doc, "div", "catcher-start-msg");
    start_msg.set_text_content(Some("Tap to Start! \u{1F496}"));
    let _ = start_msg.set_attribute("data-catcher-start", "");

    let _ = container.append_child(&hud);
    let _ = container.append_child(&play_area);
    let _ = container.append_child(&start_msg);
    let _ = arena.append_child(&container);

    let abort = browser_apis::new_abort_handle();
    let signal = abort.signal();

    if let Some(start_el) = dom::query("[data-catcher-start]") {
        let signal_inner = signal.clone();
        dom::on_with_signal(start_el.unchecked_ref(), "click", &signal, move |_: Event| {
            begin_round(&signal_inner);
        });
    }

    GAME.with(|g| {
        *g.borrow_mut() = Some(CatcherState {
            score: 0,
            level: 1,
            lives: theme::CATCHER_STARTING_LIVES,
            combo_chain: 0,
            combo_best: 0,
            last_catch_ms: 0.0,
            active: false,
            raf_id: None,
            spawn_interval_id: None,
            state: state.clone(),
            abort,
            power_ups: PowerUpState::default(),
            start_time_ms: 0.0,
        });
    });
}

fn begin_round(signal: &web_sys::AbortSignal) {
    if let Some(msg) = dom::query("[data-catcher-start]") {
        let _ = msg.set_attribute("hidden", "");
    }

    let now = browser_apis::now_ms();
    GAME.with(|g| {
        if let Some(game) = g.borrow_mut().as_mut() {
            game.active = true;
            game.start_time_ms = now;
        }
    });

    bind_catch_clicks(signal);
    run_game_loop();

    synth_audio::whoosh();
}

// ── Catch handling ──────────────────────────────────────────────────

fn bind_catch_clicks(signal: &web_sys::AbortSignal) {
    if let Some(area) = dom::query("[data-catcher-area]") {
        dom::on_with_signal(area.unchecked_ref(), "click", signal, move |event: Event| {
            let target = event.target().and_then(|t| t.dyn_into::<Element>().ok());
            let Some(el) = target else { return };
            if let Ok(Some(item)) = el.closest(".catcher-item") {
                catch_item(&item);
            }
        });
    }
}

fn catch_item(item: &Element) {
    let kind_str = item.get_attribute("data-item-kind").unwrap_or_default();
    let kind = match kind_str.as_str() {
        "heart" => ItemKind::Heart,
        "star" => ItemKind::Star,
        "unicorn" => ItemKind::Unicorn,
        "cloud" => ItemKind::RainCloud,
        "golden" => ItemKind::GoldenHeart,
        "shield" => ItemKind::ShieldBubble,
        "magnet" => ItemKind::Magnet,
        "rainbow" => ItemKind::RainbowStar,
        "freeze" => ItemKind::TimeFreeze,
        "shower" => ItemKind::StarShower,
        "size" => ItemKind::SizeBoost,
        _ => return,
    };

    let now = browser_apis::now_ms();

    // Get item position for score float
    let item_rect = item.get_bounding_client_rect();
    let float_x = item_rect.left() + item_rect.width() / 2.0;
    let float_y = item_rect.top();

    // Catch animation — scale up then remove
    let existing_class = item.get_attribute("class").unwrap_or_default();
    let _ = item.set_attribute("class", &format!("{existing_class} catcher-item--caught"));

    dom::delayed_remove(item.clone(), 300);

    GAME.with(|g| {
        let mut borrow = g.borrow_mut();
        let Some(game) = borrow.as_mut() else { return };

        if kind == ItemKind::RainCloud {
            handle_cloud_hit(game, now);
            return;
        }

        // Power-up activation
        match kind {
            ItemKind::GoldenHeart => {
                game.power_ups.golden_until_ms = now + theme::CATCHER_POWERUP_DURATION_MS as f64;
                show_powerup_indicator("\u{1F49B} 2x!", theme::CATCHER_POWERUP_DURATION_MS);
                synth_audio::dreamy();
                native_apis::vibrate_success();
            }
            ItemKind::ShieldBubble => {
                game.power_ups.shield_active = true;
                show_powerup_indicator("\u{1F6E1} Shield!", 3000);
                synth_audio::dreamy();
                native_apis::vibrate_tap();
            }
            ItemKind::Magnet => {
                game.power_ups.magnet_until_ms = now + 5000.0;
                show_powerup_indicator("\u{1FA84} Magnet!", 5000);
                synth_audio::dreamy();
                native_apis::vibrate_tap();
            }
            ItemKind::RainbowStar => {
                // Instant x3 combo
                game.combo_chain = game.combo_chain.max(5); // jump to x3 multiplier
                synth_audio::rainbow_burst();
                confetti::burst_unicorn();
                native_apis::vibrate_success();
            }
            ItemKind::TimeFreeze => {
                game.power_ups.freeze_until_ms = now + 4000.0;
                show_powerup_indicator("\u{23F3} Slow Time!", 4000);
                synth_audio::chime();
                native_apis::vibrate_tap();
            }
            ItemKind::StarShower => {
                // Spawn 5 bonus stars
                for _ in 0..5 {
                    spawn_item_immediate(ItemKind::Star);
                }
                show_powerup_indicator("\u{2728} Star Shower!", 2000);
                synth_audio::sparkle();
                confetti::burst_stars();
                native_apis::vibrate_success();
            }
            ItemKind::SizeBoost => {
                game.power_ups.size_until_ms = now + 6000.0;
                show_powerup_indicator("\u{1F50D} Big Items!", 6000);
                synth_audio::magic_wand();
                native_apis::vibrate_tap();
                // Add visual class to catcher area
                if let Some(area) = dom::query("[data-catcher-area]") {
                    let _ = area.class_list().add_1("catcher-area--size-boost");
                    dom::delayed_class_remove(area, "catcher-area--size-boost", 6000);
                }
            }
            _ => {}
        }

        // Calculate points with multipliers
        let mut points = kind.base_points();
        if game.power_ups.is_golden(now) {
            points *= 2;
        }

        // Combo system
        let time_since_last = now - game.last_catch_ms;
        if time_since_last < theme::CATCHER_COMBO_WINDOW_MS {
            game.combo_chain += 1;
        } else {
            game.combo_chain = 1;
        }
        game.last_catch_ms = now;

        let multiplier = combo_multiplier(game.combo_chain);
        points *= multiplier;

        if game.combo_chain > game.combo_best {
            game.combo_best = game.combo_chain;
        }

        game.score += points;

        // Sound based on item type
        match kind {
            ItemKind::Heart | ItemKind::GoldenHeart => synth_audio::chime(),
            ItemKind::Star => synth_audio::sparkle(),
            ItemKind::Unicorn => synth_audio::magic_wand(),
            ItemKind::RainbowStar => {} // already played rainbow_burst above
            _ => synth_audio::tap(),
        }
        native_apis::vibrate_tap();

        // Combo sound escalation
        if game.combo_chain == 3 {
            synth_audio::sparkle();
        } else if game.combo_chain >= 5 {
            synth_audio::rainbow_burst();
        }

        // Level-up check
        let old_level = game.level;
        let new_level = 1 + game.score / theme::CATCHER_POINTS_PER_LEVEL;
        if new_level > old_level {
            game.level = new_level;
            trigger_level_up(new_level, game);
        }

        // Update displays
        update_score_display(game.score);
        update_level_display(game.level);
        update_combo_display(game.combo_chain);

        // Float score text at catch position
        spawn_score_float(float_x, float_y, points, multiplier > 1);

        // Small confetti on good catches
        if kind == ItemKind::Unicorn {
            confetti::burst_unicorn();
        } else if game.combo_chain >= 5 {
            confetti::burst_stars();
        }
    });
}

fn handle_cloud_hit(game: &mut CatcherState, _now: f64) {
    if game.power_ups.shield_active {
        // Shield absorbs the hit
        game.power_ups.shield_active = false;
        hide_powerup_indicator();
        synth_audio::whoosh();
        spawn_shield_pop();
        return;
    }

    game.lives = game.lives.saturating_sub(1);
    game.combo_chain = 0; // break combo
    update_lives_display(game.lives);
    update_combo_display(0);

    synth_audio::whoops();
    native_apis::vibrate_tap();
    trigger_screen_shake();

    if game.lives == 0 {
        game.active = false;
        // Defer end_round to avoid borrow conflict (we're inside GAME.with)
        wasm_bindgen_futures::spawn_local(async {
            end_round();
        });
    }
}

fn combo_multiplier(chain: u32) -> u32 {
    match chain {
        0..=2 => 1,
        3..=4 => 2,
        5..=7 => 3,
        _ => 5,
    }
}

// ── Game loop ───────────────────────────────────────────────────────

fn run_game_loop() {
    // Spawn items on interval (rate increases with level)
    let spawn_interval = Closure::<dyn FnMut()>::new(move || {
        GAME.with(|g| {
            let borrow = g.borrow();
            let Some(game) = borrow.as_ref() else { return };
            if !game.active { return; }
            spawn_falling_item(game.level);
        });
    });

    let spawn_id = dom::window().set_interval_with_callback_and_timeout_and_arguments_0(
        spawn_interval.as_ref().unchecked_ref(),
        400, // spawn check every 400ms (faster than before)
    ).unwrap_or(0);
    spawn_interval.forget();

    start_gravity_loop();

    GAME.with(|g| {
        if let Some(game) = g.borrow_mut().as_mut() {
            game.spawn_interval_id = Some(spawn_id);
        }
    });
}

fn spawn_falling_item(level: u32) {
    let Some(area) = dom::query("[data-catcher-area]") else { return };

    let current_items = dom::query_all("[data-catcher-area] [data-item-kind]");
    if current_items.len() >= theme::CATCHER_MAX_ITEMS { return; }

    let rand = js_sys::Math::random();
    let kind = pick_item_kind(level, rand);

    let doc = dom::document();
    let item = render::create_el_with_class(&doc, "div", kind.css_class());
    item.set_text_content(Some(kind.emoji()));
    let _ = item.set_attribute("data-item-kind", kind.kind_attr());

    // Random horizontal position
    let x = 5.0 + js_sys::Math::random() * 80.0;
    // Random starting rotation for wobble
    let rot = (js_sys::Math::random() * 30.0 - 15.0) as i32;
    let _ = item.set_attribute("data-y", "0");
    let _ = item.set_attribute("data-left", &format!("{x:.1}"));
    let _ = item.set_attribute("data-wobble", &format!("{rot}"));
    let _ = item.set_attribute("style",
        &format!("left:{x:.0}%;top:-10%;--wobble-start:{rot}deg"));

    // Power-up items get a glow
    if kind.is_power_up() {
        let _ = item.class_list().add_1("catcher-item--powerup");
    }

    let _ = area.append_child(&item);
}

fn spawn_item_immediate(kind: ItemKind) {
    let Some(area) = dom::query("[data-catcher-area]") else { return };

    let doc = dom::document();
    let item = render::create_el_with_class(&doc, "div", kind.css_class());
    item.set_text_content(Some(kind.emoji()));
    let _ = item.set_attribute("data-item-kind", kind.kind_attr());

    // Random horizontal position
    let x = 5.0 + js_sys::Math::random() * 80.0;
    let rot = (js_sys::Math::random() * 30.0 - 15.0) as i32;
    let _ = item.set_attribute("data-y", "0");
    let _ = item.set_attribute("data-left", &format!("{x:.1}"));
    let _ = item.set_attribute("data-wobble", &format!("{rot}"));
    let _ = item.set_attribute("style",
        &format!("left:{x:.0}%;top:-10%;--wobble-start:{rot}deg"));

    let _ = area.append_child(&item);
}

fn pick_item_kind(level: u32, rand: f64) -> ItemKind {
    // Level determines available items and spawn rates
    match level {
        1 => {
            // Hearts only, occasional cloud
            if rand < 0.85 { ItemKind::Heart }
            else { ItemKind::RainCloud }
        }
        2 => {
            if rand < 0.50 { ItemKind::Heart }
            else if rand < 0.75 { ItemKind::Star }
            else if rand < 0.80 { ItemKind::ShieldBubble } // first power-up!
            else { ItemKind::RainCloud }
        }
        3 => {
            if rand < 0.35 { ItemKind::Heart }
            else if rand < 0.60 { ItemKind::Star }
            else if rand < 0.75 { ItemKind::Unicorn }
            else if rand < 0.78 { ItemKind::GoldenHeart }
            else if rand < 0.82 { ItemKind::ShieldBubble }
            else { ItemKind::RainCloud }
        }
        4 => {
            if rand < 0.30 { ItemKind::Heart }
            else if rand < 0.50 { ItemKind::Star }
            else if rand < 0.65 { ItemKind::Unicorn }
            else if rand < 0.68 { ItemKind::GoldenHeart }
            else if rand < 0.71 { ItemKind::ShieldBubble }
            else if rand < 0.74 { ItemKind::Magnet }
            else { ItemKind::RainCloud }
        }
        _ => {
            // Level 5+: everything available, more clouds
            if rand < 0.20 { ItemKind::Heart }
            else if rand < 0.38 { ItemKind::Star }
            else if rand < 0.52 { ItemKind::Unicorn }
            else if rand < 0.55 { ItemKind::GoldenHeart }
            else if rand < 0.58 { ItemKind::ShieldBubble }
            else if rand < 0.61 { ItemKind::Magnet }
            else if rand < 0.63 { ItemKind::RainbowStar }
            else if rand < 0.65 { ItemKind::TimeFreeze }
            else if rand < 0.67 { ItemKind::StarShower }
            else if rand < 0.69 { ItemKind::SizeBoost }
            else { ItemKind::RainCloud }
        }
    }
}

fn start_gravity_loop() {
    thread_local! {
        static LAST_TIME: RefCell<f64> = const { RefCell::new(0.0) };
    }
    LAST_TIME.with(|lt| *lt.borrow_mut() = 0.0);

    let cb = Rc::new(RefCell::new(None::<Closure<dyn FnMut(f64)>>));
    let cb_clone = cb.clone();

    *cb.borrow_mut() = Some(Closure::new(move |timestamp: f64| {
        let is_active = GAME.with(|g| {
            g.borrow().as_ref().map(|game| game.active).unwrap_or(false)
        });
        if !is_active { return; }

        let dt = LAST_TIME.with(|lt| {
            let last = *lt.borrow();
            *lt.borrow_mut() = timestamp;
            if last == 0.0 { 16.0 } else { (timestamp - last).min(100.0) }
        });

        apply_gravity(dt);

        if let Some(ref closure) = *cb_clone.borrow() {
            let id = dom::window()
                .request_animation_frame(closure.as_ref().unchecked_ref())
                .unwrap_or(0);
            GAME.with(|g| {
                if let Some(game) = g.borrow_mut().as_mut() {
                    game.raf_id = Some(id);
                }
            });
        }
    }));

    if let Some(ref closure) = *cb.borrow() {
        let id = dom::window()
            .request_animation_frame(closure.as_ref().unchecked_ref())
            .unwrap_or(0);
        GAME.with(|g| {
            if let Some(game) = g.borrow_mut().as_mut() {
                game.raf_id = Some(id);
            }
        });
    }

    if let Some(closure) = cb.borrow_mut().take() {
        closure.forget();
    };
}

fn apply_gravity(dt_ms: f64) {
    let (level, is_magnet, is_freeze) = GAME.with(|g| {
        let borrow = g.borrow();
        let Some(game) = borrow.as_ref() else { return (1u32, false, false) };
        if !game.active { return (1, false, false) };
        let now = browser_apis::now_ms();
        (game.level, game.power_ups.is_magnet(now), game.power_ups.is_freeze(now))
    });

    // Speed increases with level
    let speed_mult = 1.0 + (level as f64 - 1.0) * theme::CATCHER_SPEED_INCREASE;
    let speed_per_sec = theme::CATCHER_BASE_SPEED * speed_mult;

    // TimeFreeze slows items by 50%
    let freeze_mult = if is_freeze { 0.5 } else { 1.0 };
    let speed = speed_per_sec * dt_ms / 50.0 * freeze_mult;

    let items = dom::query_all("[data-catcher-area] [data-item-kind]");
    let mut to_remove: Vec<Element> = Vec::new();

    // Reuse a single String buffer across all items (avoids per-item allocation)
    let mut buf = String::with_capacity(24);

    for item in &items {
        let current_y: f64 = item.get_attribute("data-y")
            .and_then(|s: String| s.parse::<f64>().ok())
            .unwrap_or(0.0);
        let new_y = current_y + speed;

        if new_y > 110.0 {
            to_remove.push(item.clone());
        } else {
            buf.clear();
            use std::fmt::Write;
            let _ = write!(buf, "{new_y:.1}");
            let _ = item.set_attribute("data-y", &buf);

            let left_pct: f64 = item.get_attribute("data-left")
                .and_then(|s| s.parse::<f64>().ok())
                .unwrap_or(50.0);

            let left_final = if is_magnet {
                let drift = (50.0 - left_pct) * 0.02 * (dt_ms / 16.0);
                let new_left = left_pct + drift;
                buf.clear();
                let _ = write!(buf, "{new_left:.1}");
                let _ = item.set_attribute("data-left", &buf);
                new_left
            } else {
                left_pct
            };

            // style.setProperty() — avoids rebuilding full style string each frame
            if let Some(html) = item.dyn_ref::<web_sys::HtmlElement>() {
                let style = html.style();
                buf.clear();
                let _ = write!(buf, "{left_final:.1}%");
                let _ = style.set_property("left", &buf);
                buf.clear();
                let _ = write!(buf, "{new_y:.1}%");
                let _ = style.set_property("top", &buf);
            }
        }
    }

    for item in &to_remove {
        item.remove();
    }
}

// ── Level up ────────────────────────────────────────────────────────

fn trigger_level_up(new_level: u32, game: &mut CatcherState) {
    synth_audio::level_up();
    confetti::burst_stars();
    native_apis::vibrate_success();

    // Bonus life at every N levels
    if new_level.is_multiple_of(theme::CATCHER_BONUS_LIFE_INTERVAL)
        && game.lives < theme::CATCHER_MAX_LIVES
    {
        game.lives += 1;
        update_lives_display(game.lives);
        spawn_bonus_life_text();
    }

    // Flash level-up overlay
    if let Some(area) = dom::query("[data-catcher-area]") {
        let doc = dom::document();
        let flash = render::create_el_with_class(&doc, "div", "catcher-level-up");
        flash.set_text_content(Some(&format!("\u{2B50} Level {new_level}! \u{2B50}")));
        let _ = area.append_child(&flash);

        dom::delayed_remove(flash.clone(), 1200);
    }

    // Sparkle cheers
    speech::speak(&format!("Level {}!", new_level));
}

// ── End round ───────────────────────────────────────────────────────

fn end_round() {
    let Some((score, level, combo_best, state, start_ms)) = GAME.with(|g| {
        let borrow = g.borrow();
        let game = borrow.as_ref()?;
        Some((game.score, game.level, game.combo_best, game.state.clone(), game.start_time_ms))
    }) else { return };

    // Stop spawning
    GAME.with(|g| {
        if let Some(game) = g.borrow_mut().as_mut() {
            let window = dom::window();
            if let Some(id) = game.spawn_interval_id.take() {
                window.clear_interval_with_handle(id);
            }
        }
    });

    // Clear play area
    if let Some(area) = dom::query("[data-catcher-area]") {
        dom::safe_set_inner_html(&area, "");
    }

    let hearts_earned = score / theme::HEARTS_PER_CATCHER_POINT;
    let duration_ms = (browser_apis::now_ms() - start_ms) as u64;

    let end_signal = GAME.with(|g| {
        g.borrow().as_ref().map(|game| game.abort.signal())
    });

    // Check if new high score / best combo
    let (prev_high, _prev_level, prev_combo) = {
        let s = state.borrow();
        (s.catcher_high_score, s.catcher_best_level, s.catcher_best_combo)
    };
    let is_new_high = score > prev_high;
    let is_new_combo = combo_best > prev_combo;

    show_end_screen(EndScreenParams {
        score,
        level,
        combo_best,
        hearts: hearts_earned,
        is_new_high,
        is_new_combo,
        prev_high,
        state: state.clone(),
        signal: end_signal.as_ref(),
    });

    // Save score to DB
    let id = utils::create_id();
    let day_key = utils::today_key();
    let now = utils::now_epoch_ms();
    db_client::exec_fire_and_forget(
        "catcher-save",
        "INSERT INTO game_scores (id, game_id, score, level, duration_ms, played_at, day_key) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        vec![id, "catcher".into(), score.to_string(), level.to_string(),
             duration_ms.to_string(), now.to_string(), day_key],
    );

    // Award hearts + update state
    {
        let mut s = state.borrow_mut();
        if hearts_earned > 0 {
            s.hearts_total += hearts_earned;
            s.hearts_today += hearts_earned;
        }
        s.games_played_today += 1;
        if score > s.catcher_high_score { s.catcher_high_score = score; }
        if level > s.catcher_best_level { s.catcher_best_level = level; }
        if combo_best > s.catcher_best_combo { s.catcher_best_combo = combo_best; }
    }

    let total = state.borrow().hearts_total;
    ui::update_heart_counter(total);
    weekly_goals::increment_progress("games", 1);
    if hearts_earned > 0 {
        weekly_goals::increment_progress("hearts", hearts_earned);
    }

    if is_new_high {
        synth_audio::fanfare();
        confetti::burst_party();
    } else {
        synth_audio::fanfare();
        confetti::burst_stars();
    }
    speech::speak("Amazing catcher!");
}

struct EndScreenParams<'a> {
    score: u32,
    level: u32,
    combo_best: u32,
    hearts: u32,
    is_new_high: bool,
    is_new_combo: bool,
    prev_high: u32,
    state: Rc<RefCell<AppState>>,
    signal: Option<&'a web_sys::AbortSignal>,
}

fn show_end_screen(params: EndScreenParams) {
    let EndScreenParams { score, level, combo_best, hearts, is_new_high, is_new_combo, prev_high, state, signal } = params;
    let Some(arena) = dom::query("#game-arena") else { return };
    let doc = dom::document();
    dom::safe_set_inner_html(&arena, "");

    let screen = render::create_el_with_class(&doc, "div", "game-end-screen");

    // Title
    let title = render::create_el_with_class(&doc, "div", "game-end-title");
    if is_new_high {
        title.set_text_content(Some("\u{1F389} NEW HIGH SCORE! \u{1F389}"));
        let _ = title.class_list().add_1("game-end-title--new-record");
    } else {
        title.set_text_content(Some("\u{1F389} Great Catching! \u{1F389}"));
    }

    // Stats
    let stats = render::create_el_with_class(&doc, "div", "game-end-stats");

    let score_line = render::create_el_with_class(&doc, "div", "game-end-stat");
    score_line.set_text_content(Some(&format!("\u{2B50} Score: {score}")));
    let _ = stats.append_child(&score_line);

    if is_new_high && prev_high > 0 {
        let beat_line = render::create_el_with_class(&doc, "div", "game-end-stat game-end-stat--beat");
        beat_line.set_text_content(Some(&format!("Beat your record by {}!", score - prev_high)));
        let _ = stats.append_child(&beat_line);
    }

    let level_line = render::create_el_with_class(&doc, "div", "game-end-stat");
    level_line.set_text_content(Some(&format!("\u{1F525} Level reached: {level}")));
    let _ = stats.append_child(&level_line);

    if combo_best > 1 {
        let combo_line = render::create_el_with_class(&doc, "div", "game-end-stat");
        let mult = combo_multiplier(combo_best);
        combo_line.set_text_content(Some(&format!("\u{26A1} Best combo: {combo_best}x (x{mult})")));
        if is_new_combo {
            let _ = combo_line.class_list().add_1("game-end-stat--new-record");
        }
        let _ = stats.append_child(&combo_line);
    }

    let hearts_line = render::create_el_with_class(&doc, "div", "game-end-stat game-end-stat--hearts");
    hearts_line.set_text_content(Some(&format!("\u{1F49C} +{hearts} hearts earned!")));
    let _ = stats.append_child(&hearts_line);

    // Buttons
    let buttons = render::create_el_with_class(&doc, "div", "game-end-buttons");
    let again_btn = render::create_button(&doc, "game-end-btn game-end-btn--again", "\u{1F504} Play Again");
    let _ = again_btn.set_attribute("data-game-again", "catcher");
    let back_btn = render::create_button(&doc, "game-end-btn game-end-btn--back", "\u{2190} Back to Games");
    let _ = back_btn.set_attribute("data-game-back", "");
    let _ = buttons.append_child(&again_btn);
    let _ = buttons.append_child(&back_btn);

    let _ = screen.append_child(&title);
    let _ = screen.append_child(&stats);
    let _ = screen.append_child(&buttons);
    let _ = arena.append_child(&screen);

    bind_end_buttons(state, signal);
}

fn bind_end_buttons(state: Rc<RefCell<AppState>>, signal: Option<&web_sys::AbortSignal>) {
    let s = state.clone();
    games::bind_end_buttons(
        signal,
        move || { cleanup(); start(s.clone()); },
        || { cleanup(); games::return_to_menu(); },
    );
}

// ── HUD updates ─────────────────────────────────────────────────────

fn update_score_display(score: u32) {
    dom::set_text("[data-catcher-score]", &format!("\u{2B50} {score}"));
}

fn update_level_display(level: u32) {
    dom::set_text("[data-catcher-level]", &format!("Lv {level}"));
}

fn update_lives_display(lives: u32) {
    let hearts = "\u{1F496}".repeat(lives as usize);
    let empties = "\u{1F5A4}".repeat((theme::CATCHER_STARTING_LIVES.saturating_sub(lives)) as usize);
    dom::set_text("[data-catcher-lives]", &format!("{hearts}{empties}"));

    // Flash red on life loss
    if let Some(el) = dom::query("[data-catcher-lives]") {
        let _ = el.class_list().add_1("catcher-lives--lost");
        dom::delayed_class_remove(el, "catcher-lives--lost", 400);
    }
}

fn update_combo_display(chain: u32) {
    if let Some(el) = dom::query("[data-catcher-combo]") {
        if chain >= 2 {
            let mult = combo_multiplier(chain);
            el.set_text_content(Some(&format!("\u{26A1}{chain}x (x{mult})")));
            let _ = el.remove_attribute("hidden");

            // Scale up combo display based on chain
            let scale_class = if chain >= 8 { "catcher-combo--x5" }
                else if chain >= 5 { "catcher-combo--x3" }
                else { "catcher-combo--x2" };
            let _ = el.set_attribute("class", &format!("catcher-combo {scale_class}"));
        } else {
            let _ = el.set_attribute("hidden", "");
            let _ = el.set_attribute("class", "catcher-combo");
        }
    }
}

fn show_powerup_indicator(text: &str, duration_ms: u32) {
    if let Some(el) = dom::query("[data-catcher-powerup]") {
        el.set_text_content(Some(text));
        let _ = el.remove_attribute("hidden");
        dom::delayed_set_attr(el, "hidden", "", duration_ms as i32);
    }
}

fn hide_powerup_indicator() {
    if let Some(el) = dom::query("[data-catcher-powerup]") {
        let _ = el.set_attribute("hidden", "");
    }
}

// ── Visual juice ────────────────────────────────────────────────────

fn spawn_score_float(x: f64, y: f64, points: u32, is_boosted: bool) {
    let doc = dom::document();
    let float = render::create_el_with_class(&doc, "div", "catcher-score-float");
    let text = if is_boosted {
        format!("+{points} \u{2728}")
    } else {
        format!("+{points}")
    };
    float.set_text_content(Some(&text));
    let _ = float.set_attribute("style",
        &format!("left:{x:.0}px;top:{y:.0}px;position:fixed;"));
    if is_boosted {
        let _ = float.class_list().add_1("catcher-score-float--boosted");
    }

    if let Some(body) = dom::query("body") {
        let _ = body.append_child(&float);
    }

    dom::delayed_remove(float, 800);
}

fn trigger_screen_shake() {
    if let Some(container) = dom::query(".catcher-container") {
        let _ = container.class_list().add_1("catcher-container--shake");
        dom::delayed_class_remove(container, "catcher-container--shake", 300);
    }
}

fn spawn_shield_pop() {
    if let Some(area) = dom::query("[data-catcher-area]") {
        let doc = dom::document();
        let pop = render::create_el_with_class(&doc, "div", "catcher-shield-pop");
        pop.set_text_content(Some("\u{1F6E1}\u{1F4A5}"));
        let _ = area.append_child(&pop);
        dom::delayed_remove(pop, 600);
    }
}

fn spawn_bonus_life_text() {
    if let Some(area) = dom::query("[data-catcher-area]") {
        let doc = dom::document();
        let txt = render::create_el_with_class(&doc, "div", "catcher-bonus-life");
        txt.set_text_content(Some("\u{1F496} +1 Life!"));
        let _ = area.append_child(&txt);
        dom::delayed_remove(txt, 1200);
    }
}

// ── Cleanup ─────────────────────────────────────────────────────────

pub fn cleanup() {
    GAME.with(|g| {
        if let Some(game) = g.borrow_mut().as_mut() {
            game.active = false;
            let window = dom::window();
            if let Some(id) = game.spawn_interval_id.take() {
                window.clear_interval_with_handle(id);
            }
            if let Some(id) = game.raf_id.take() {
                let _ = window.cancel_animation_frame(id);
            }
        }
        *g.borrow_mut() = None;
    });
}

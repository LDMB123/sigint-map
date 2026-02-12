//! Sparkle's Hug Machine — multi-stage affection game with 8 interaction types.
//! Each session picks 5 random stages from 8 for variety. Rich reactions per stage,
//! between-stage celebrations, and a dramatic grand finale.

use std::cell::RefCell;
use std::rc::Rc;
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;
use web_sys::{Element, Event, PointerEvent};

use crate::{
    animations, browser_apis, confetti, db_client, dom, games, native_apis, render, speech,
    state, state::AppState, synth_audio, theme, ui, utils, weekly_goals,
};

// ---------------------------------------------------------------------------
// Stage definitions — 8 interaction types, data-driven
// ---------------------------------------------------------------------------

#[derive(Clone, Copy, PartialEq, Debug)]
enum HugStage {
    GentlePat     = 0,
    BigHug        = 1,
    TickleTime    = 2,
    SleepyLullaby = 3,
    WakeUpKiss    = 4,
    HighFive      = 5,
    BellyRub      = 6,
    NoseBoops     = 7,
    SpinDance     = 8,  // new: spin Sparkle around
    GentleRock    = 9,  // new: soothing rocking motion
    StarCatch     = 10, // new: catch falling stars
}

/// Static per-stage data. Sounds use `fn()` pointers since closures can't be const.
struct StageData {
    instruction: &'static str,
    mood: &'static str,
    reaction: &'static str,
    bubble: &'static str,
    bg: &'static str,
    pulse_sound: fn(),
    complete_sound: fn(),
    is_hold: bool,
}

fn complete_gentle_pat()     { synth_audio::sparkle(); }
fn complete_big_hug()        { synth_audio::dreamy(); }
fn complete_tickle()         { synth_audio::giggle(); confetti::burst_hearts(); }
fn complete_sleepy()         { synth_audio::gentle(); }
fn complete_kiss()           { synth_audio::magic_wand(); confetti::burst_stars(); }
fn complete_highfive()       { synth_audio::level_up(); confetti::burst_stars(); }
fn complete_belly()          { synth_audio::dreamy(); confetti::burst_hearts(); }
fn complete_nose()           { synth_audio::sparkle(); confetti::burst_party(); }
fn complete_spin()           { synth_audio::rainbow_burst(); confetti::burst_unicorn(); }
fn complete_rock()           { synth_audio::lullaby(); confetti::burst_hearts(); }
fn complete_star()           { synth_audio::magic_wand(); confetti::burst_stars(); }

const STAGE_DATA: [StageData; 11] = [
    // GentlePat
    StageData {
        instruction: "Gently pat Sparkle! (tap 5 times)",
        mood: "\u{1F60A}", reaction: "\u{1F60C}", bubble: "so gentle...",
        bg: "linear-gradient(180deg, #FFE0E6 0%, #FFB7C5 100%)",
        pulse_sound: synth_audio::gentle, complete_sound: complete_gentle_pat, is_hold: false,
    },
    // BigHug
    StageData {
        instruction: "Give Sparkle a big hug! (press and hold)",
        mood: "\u{1F970}", reaction: "\u{1F496}", bubble: "so warm!",
        bg: "linear-gradient(180deg, #FFF5D0 0%, #FFD700 100%)",
        pulse_sound: synth_audio::dreamy, complete_sound: complete_big_hug, is_hold: true,
    },
    // TickleTime
    StageData {
        instruction: "Tickle Sparkle! (tap really fast!)",
        mood: "\u{1F923}", reaction: "\u{1F606}", bubble: "hehehehe!",
        bg: "linear-gradient(180deg, #E0FFE6 0%, #82DDA0 100%)",
        pulse_sound: synth_audio::giggle, complete_sound: complete_tickle, is_hold: false,
    },
    // SleepyLullaby
    StageData {
        instruction: "Sing Sparkle to sleep... (hold gently)",
        mood: "\u{1F634}", reaction: "\u{1F4A4}", bubble: "zzz...",
        bg: "linear-gradient(180deg, #D6EFFF 0%, #7B9FD4 100%)",
        pulse_sound: synth_audio::lullaby, complete_sound: complete_sleepy, is_hold: true,
    },
    // WakeUpKiss
    StageData {
        instruction: "Give Sparkle a wake-up kiss! (tap once)",
        mood: "\u{1F929}", reaction: "\u{1F31F}", bubble: "good morning!",
        bg: "linear-gradient(180deg, #FFE0E6 0%, #FF6B9D 50%, #FFD700 100%)",
        pulse_sound: synth_audio::magic_wand, complete_sound: complete_kiss, is_hold: false,
    },
    // HighFive
    StageData {
        instruction: "High five! Tap Sparkle's hoof!",
        mood: "\u{270B}", reaction: "\u{1F4A5}", bubble: "yeah!",
        bg: "linear-gradient(180deg, #FFF4C7 0%, #FFB800 100%)",
        pulse_sound: synth_audio::tap, complete_sound: complete_highfive, is_hold: false,
    },
    // BellyRub
    StageData {
        instruction: "Rub Sparkle's belly! (move in circles)",
        mood: "\u{1F60D}", reaction: "\u{1F618}", bubble: "mmmm nice...",
        bg: "linear-gradient(180deg, #E8D5FF 0%, #B57EFF 100%)",
        pulse_sound: synth_audio::chime, complete_sound: complete_belly, is_hold: false,
    },
    // NoseBoops
    StageData {
        instruction: "Boop the nose! (tap the nose 5 times!)",
        mood: "\u{1F525}", reaction: "\u{1F927}", bubble: "boop!",
        bg: "linear-gradient(180deg, #FFD6D6 0%, #FF5252 100%)",
        pulse_sound: synth_audio::sparkle, complete_sound: complete_nose, is_hold: false,
    },
    // SpinDance
    StageData {
        instruction: "Spin Sparkle around! (swipe in a circle)",
        mood: "\u{1F483}", reaction: "\u{1F60D}", bubble: "wheee!",
        bg: "linear-gradient(180deg, #E0D5FF 0%, #9D7FFF 50%, #FFB7E5 100%)",
        pulse_sound: synth_audio::chime, complete_sound: complete_spin, is_hold: false,
    },
    // GentleRock
    StageData {
        instruction: "Rock Sparkle gently... (hold and sway)",
        mood: "\u{1F60C}", reaction: "\u{1F634}", bubble: "so peaceful...",
        bg: "linear-gradient(180deg, #C7E9FF 0%, #87CEEB 100%)",
        pulse_sound: synth_audio::lullaby, complete_sound: complete_rock, is_hold: true,
    },
    // StarCatch
    StageData {
        instruction: "Catch the falling stars! (tap 8 stars)",
        mood: "\u{1F929}", reaction: "\u{2728}", bubble: "got one!",
        bg: "linear-gradient(180deg, #1a0033 0%, #5533FF 50%, #FFB700 100%)",
        pulse_sound: synth_audio::sparkle, complete_sound: complete_star, is_hold: false,
    },
];

/// All 11 stage types for random selection.
const ALL_STAGES: [HugStage; 11] = [
    HugStage::GentlePat, HugStage::BigHug, HugStage::TickleTime, HugStage::SleepyLullaby,
    HugStage::WakeUpKiss, HugStage::HighFive, HugStage::BellyRub, HugStage::NoseBoops,
    HugStage::SpinDance, HugStage::GentleRock, HugStage::StarCatch,
];

impl HugStage {
    fn data(&self) -> &'static StageData { &STAGE_DATA[*self as usize] }
    fn instruction(&self) -> &'static str { self.data().instruction }
    fn sparkle_mood(&self) -> &'static str { self.data().mood }
    fn reaction_emoji(&self) -> &'static str { self.data().reaction }
    fn mid_bubble(&self) -> &'static str { self.data().bubble }
    fn bg_color(&self) -> &'static str { self.data().bg }
    fn pulse_sound(&self) { (self.data().pulse_sound)(); }
    fn complete_sound(&self) { (self.data().complete_sound)(); }
    fn id(&self) -> u8 { *self as u8 }
    fn is_hold(&self) -> bool { self.data().is_hold }
}

// ---------------------------------------------------------------------------
// Game state
// ---------------------------------------------------------------------------

struct HugState {
    /// The 5 randomly-selected stages for this session.
    stages: Vec<HugStage>,
    /// Index into `stages` (0..4).
    stage_index: usize,
    tap_count: u32,
    hold_start: Option<f64>,
    stages_completed: u32,
    active: bool,
    hold_interval_id: Option<i32>,
    state: Rc<RefCell<AppState>>,
    abort: browser_apis::AbortHandle,
    /// Bitmask of unique stage types seen across all games.
    /// u16 supports up to 16 stages (currently using 11: stages 0-10).
    stages_seen_mask: u16,
    /// BellyRub: track pointer positions for circular motion detection.
    motion_points: Vec<(f64, f64)>,
    /// BellyRub: number of detected circles.
    circle_count: u32,
    /// Between-stage celebration timeout ID.
    celebration_timeout: Option<i32>,
    /// SpinDance: rotation tracking
    spin_count: u32,
    spin_start_angle: Option<f64>,
    /// GentleRock: sway tracking
    rock_count: u32,
    rock_direction: i8, // -1 left, 0 center, 1 right
    /// StarCatch: falling stars
    stars_caught: u32,
    star_targets: Vec<(f64, f64, String)>, // (x, y, id)
}

impl HugState {
    fn current_stage(&self) -> HugStage {
        self.stages[self.stage_index]
    }
}

thread_local! {
    static GAME: RefCell<Option<HugState>> = const { RefCell::new(None) };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------


pub fn start(state: Rc<RefCell<AppState>>) {
    let abort = browser_apis::new_abort_handle();
    let signal = abort.signal();

    // Pick 5 random stages from 8 (Fisher-Yates partial shuffle)
    let stages = pick_random_stages(theme::HUG_STAGES_PER_GAME);

    GAME.with(|g| {
        *g.borrow_mut() = Some(HugState {
            stages,
            stage_index: 0,
            tap_count: 0,
            hold_start: None,
            stages_completed: 0,
            active: true,
            hold_interval_id: None,
            state: state.clone(),
            abort,
            stages_seen_mask: 0,
            motion_points: Vec::with_capacity(64),
            circle_count: 0,
            celebration_timeout: None,
            spin_count: 0,
            spin_start_angle: None,
            rock_count: 0,
            rock_direction: 0,
            stars_caught: 0,
            star_targets: Vec::new(),
        });
    });

    // Phase 2.4: Cache game elements during start
    let arena = dom::query("#game-arena");

    if arena.is_none() {
        web_sys::console::warn_1(&"⚠ #game-arena not found during hug game start".into());
    }

    state::with_state_mut(|game| {
        game.game_arena = arena;
        // sparkle will be cached after render_stage creates it
        game.hug_sparkle_container = None; // Clear previous game's cache
    });

    let first_stage = GAME.with(|g| {
        g.borrow().as_ref().map(|game| game.stages[0]).unwrap_or(HugStage::GentlePat)
    });
    render_stage(first_stage);

    // Cache sparkle element after it's created by render_stage
    let sparkle = dom::query("[data-hug-sparkle]");
    if sparkle.is_none() {
        web_sys::console::warn_1(&"⚠ [data-hug-sparkle] not found after render_stage".into());
    }
    state::with_state_mut(|game| {
        game.hug_sparkle_container = sparkle;
    });

    bind_interactions(state, &signal);
}

pub fn cleanup() {
    GAME.with(|g| {
        if let Some(game) = g.borrow_mut().as_mut() {
            game.active = false;
            if let Some(id) = game.hold_interval_id.take() {
                dom::window().clear_interval_with_handle(id);
            }
            if let Some(id) = game.celebration_timeout.take() {
                dom::window().clear_timeout_with_handle(id);
            }
        }
        *g.borrow_mut() = None;
    });

    // Phase 2.4: Clear game element caches on cleanup
    crate::state::with_state_mut(|game| {
        game.game_arena = None;
        game.hug_sparkle_container = None;
    });
}

// ---------------------------------------------------------------------------
// Stage selection — Fisher-Yates partial shuffle
// ---------------------------------------------------------------------------

fn pick_random_stages(count: usize) -> Vec<HugStage> {
    let mut pool: Vec<HugStage> = ALL_STAGES.to_vec();
    let n = pool.len();
    for i in 0..count.min(n) {
        let j = i + (utils::random_u32() as usize % (n - i));
        pool.swap(i, j);
    }
    pool.truncate(count);
    pool
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

fn render_stage(stage: HugStage) {
    let arena = state::get_cached_game_arena()
        .or_else(|| dom::query("#game-arena"));
    let Some(arena) = arena else { return };
    let doc = dom::document();

    // Clear arena (destroys all child elements including sparkle)
    dom::safe_set_inner_html(&arena, "");

    // Phase 2.4: Invalidate sparkle cache since element was just destroyed
    crate::state::with_state_mut(|game| {
        game.hug_sparkle_container = None;
    });

    let container = render::create_el_with_class(&doc, "div", "hug-container");
    let _ = container.set_attribute("style", &format!("background: {}", stage.bg_color()));

    // Instruction text
    let instruction = render::create_el_with_class(&doc, "div", "hug-instruction");
    instruction.set_text_content(Some(stage.instruction()));
    let _ = instruction.set_attribute("data-hug-instruction", "");

    // Sparkle character — hero size for hug game
    let sparkle_wrap = render::create_el_with_class(&doc, "div", "hug-sparkle-wrap");
    let _ = sparkle_wrap.set_attribute("data-hug-sparkle-wrap", "");

    let sparkle = render::create_el_with_class(&doc, "div", "hug-sparkle hug-sparkle--hero");
    sparkle.set_text_content(Some(stage.sparkle_mood()));
    let _ = sparkle.set_attribute("data-hug-sparkle", "");
    let _ = sparkle_wrap.append_child(&sparkle);

    // Text bubble (hidden by default, shown during interaction)
    let bubble = render::create_el_with_class(&doc, "div", "hug-text-bubble hug-text-bubble--hidden");
    bubble.set_text_content(Some(stage.mid_bubble()));
    let _ = bubble.set_attribute("data-hug-bubble", "");
    let _ = sparkle_wrap.append_child(&bubble);

    // Stage-specific target zones
    match stage {
        HugStage::HighFive => {
            let target = render::create_el_with_class(&doc, "div", "hug-highfive-target");
            target.set_text_content(Some("\u{270B}")); // raised hand
            let _ = target.set_attribute("data-hug-highfive", "");
            let _ = sparkle_wrap.append_child(&target);
        }
        HugStage::NoseBoops => {
            let target = render::create_el_with_class(&doc, "div", "hug-nose-target");
            target.set_text_content(Some("\u{1F4A2}")); // anger (red dot for nose)
            let _ = target.set_attribute("data-hug-nose", "");
            let _ = sparkle_wrap.append_child(&target);
        }
        HugStage::BellyRub => {
            let zone = render::create_el_with_class(&doc, "div", "hug-belly-zone");
            let _ = zone.set_attribute("data-hug-belly", "");
            // Visual hint: dashed circle
            let hint = render::create_el_with_class(&doc, "div", "hug-belly-hint");
            hint.set_text_content(Some("\u{1F300}")); // cyclone emoji as circular hint
            let _ = zone.append_child(&hint);
            let _ = sparkle_wrap.append_child(&zone);
        }
        HugStage::SpinDance => {
            let hint = render::create_el_with_class(&doc, "div", "hug-spin-hint");
            hint.set_text_content(Some("\u{1F300}")); // cyclone
            let _ = hint.set_attribute("data-hug-spin-hint", "");
            let _ = sparkle_wrap.append_child(&hint);
        }
        HugStage::StarCatch => {
            // Stars container
            let stars_zone = render::create_el_with_class(&doc, "div", "hug-stars-zone");
            let _ = stars_zone.set_attribute("data-hug-stars-zone", "");
            let _ = container.append_child(&stars_zone);
            // Stars will be spawned dynamically
        }
        _ => {}
    }

    // Progress dots
    let progress = render::create_el_with_class(&doc, "div", "hug-progress");
    let completed = GAME.with(|g| {
        g.borrow().as_ref().map(|game| game.stages_completed).unwrap_or(0)
    });
    let total = theme::HUG_STAGES_PER_GAME as u32;
    for i in 0..total {
        let dot = render::create_el_with_class(&doc, "span",
            if i < completed { "hug-dot hug-dot--done" }
            else if i == completed { "hug-dot hug-dot--current" }
            else { "hug-dot" });
        dot.set_text_content(Some(if i < completed { "\u{1F49C}" } else { "\u{25CB}" }));
        let _ = dot.set_attribute("data-hug-dot", &i.to_string());
        let _ = progress.append_child(&dot);
    }

    // Counter / meter display
    let counter = render::create_el_with_class(&doc, "div", "hug-counter");
    let _ = counter.set_attribute("data-hug-counter", "");
    match stage {
        HugStage::GentlePat => counter.set_text_content(Some("0 / 5 pats")),
        HugStage::TickleTime => counter.set_text_content(Some("0 / 10 tickles")),
        HugStage::NoseBoops => counter.set_text_content(Some("0 / 5 boops")),
        HugStage::BigHug | HugStage::SleepyLullaby | HugStage::GentleRock => {
            let meter = render::create_el_with_class(&doc, "div", "hug-meter");
            let fill = render::create_el_with_class(&doc, "div", "hug-meter-fill");
            let _ = fill.set_attribute("data-hug-meter", "");
            let _ = meter.append_child(&fill);
            counter.set_text_content(None);
            let _ = counter.append_child(&meter);
        }
        HugStage::WakeUpKiss => counter.set_text_content(Some("\u{1F48B} Tap to wake up!")),
        HugStage::HighFive => counter.set_text_content(Some("\u{270B} Tap the hoof!")),
        HugStage::BellyRub => counter.set_text_content(Some("0 / 3 circles")),
        HugStage::SpinDance => counter.set_text_content(Some("0 / 3 spins")),
        HugStage::StarCatch => counter.set_text_content(Some("0 / 8 stars")),
    }

    let _ = container.append_child(&instruction);
    let _ = container.append_child(&sparkle_wrap);
    let _ = container.append_child(&counter);
    let _ = container.append_child(&progress);
    let _ = arena.append_child(&container);

    // Phase 2.4: Re-cache sparkle element after creation
    let sparkle_element = dom::query("[data-hug-sparkle]");
    if sparkle_element.is_none() {
        web_sys::console::warn_1(&"⚠ [data-hug-sparkle] not found after render_stage".into());
    }
    crate::state::with_state_mut(|game| {
        game.hug_sparkle_container = sparkle_element.clone();
    });

    // Entrance animation for Sparkle with particle trail
    let sparkle = sparkle_element;
    if let Some(s) = sparkle {
        animations::magic_entrance(&s);
        // Add particle trail on entrance
        spawn_entrance_particles();
    }

    // Stage-specific initialization
    if stage == HugStage::StarCatch {
        spawn_falling_stars();
    }
}

/// Spawn entrance particles for smoother transitions
fn spawn_entrance_particles() {
    let sparkle = state::get_cached_hug_sparkle()
        .or_else(|| dom::query("[data-hug-sparkle]"));
    if let Some(sparkle) = sparkle {
        for _ in 0..8 {
            let particle = render::create_el_with_class(&dom::document(), "div", "hug-entrance-particle");
            let offset_x = (js_sys::Math::random() - 0.5) * 80.0;
            let offset_y = (js_sys::Math::random() - 0.5) * 80.0;
            let _ = particle.set_attribute("style", &format!(
                "left: 50%; top: 50%; transform: translate({}px, {}px); animation-delay: {}ms",
                offset_x, offset_y, (js_sys::Math::random() * 300.0) as u32
            ));
            if let Some(parent) = sparkle.parent_element() {
                let _ = parent.append_child(&particle);
            }
        }
    }
}

/// Spawn falling stars for StarCatch stage
fn spawn_falling_stars() {
    GAME.with(|g| {
        let mut borrow = g.borrow_mut();
        let Some(game) = borrow.as_mut() else { return };

        // Generate 8 star targets at random positions
        game.star_targets.clear();
        let Some(zone) = dom::query("[data-hug-stars-zone]") else { return };

        for i in 0..8 {
            let star = render::create_el_with_class(&dom::document(), "div", "hug-falling-star");
            let star_id = format!("star-{}", i);
            star.set_text_content(Some("\u{2B50}"));
            let _ = star.set_attribute("data-star-id", &star_id);

            // Random horizontal position
            let x = 10.0 + js_sys::Math::random() * 80.0;
            // Stagger fall times
            let delay = (i as f64 * 800.0) + js_sys::Math::random() * 400.0;
            let _ = star.set_attribute("style", &format!(
                "left: {}%; animation-delay: {}ms",
                x, delay as u32
            ));

            let _ = zone.append_child(&star);
            game.star_targets.push((x, 0.0, star_id));
        }
    });
}

// ---------------------------------------------------------------------------
// Event binding
// ---------------------------------------------------------------------------

fn bind_interactions(state: Rc<RefCell<AppState>>, signal: &web_sys::AbortSignal) {
    let arena = state::get_cached_game_arena()
        .or_else(|| dom::query("#game-arena"));
    let Some(arena) = arena else { return };

    // Click/tap handler
    let s = state.clone();
    dom::on_with_signal(arena.unchecked_ref(), "click", signal, move |event: Event| {
        let target = event.target().and_then(|t| t.dyn_into::<Element>().ok());
        let Some(el) = target else { return };
        // Check which target was tapped
        if let Ok(Some(_)) = el.closest("[data-hug-highfive]") {
            on_highfive_tap(s.clone());
        } else if let Ok(Some(_)) = el.closest("[data-hug-nose]") {
            on_nose_boop(s.clone());
        } else if let Ok(Some(star)) = el.closest("[data-star-id]") {
            on_star_catch(star, s.clone());
        } else if let Ok(Some(_)) = el.closest("[data-hug-sparkle]") {
            on_sparkle_tap(s.clone());
        } else if let Ok(Some(_)) = el.closest("[data-hug-sparkle-wrap]") {
            on_sparkle_tap(s.clone());
        }
    });

    // Pointer down — for hold stages
    dom::on_with_signal(arena.unchecked_ref(), "pointerdown", signal, move |event: Event| {
        let target = event.target().and_then(|t| t.dyn_into::<Element>().ok());
        let Some(el) = target else { return };
        if let Ok(Some(_)) = el.closest("[data-hug-sparkle]") {
            on_hold_start();
        }
    });

    // Pointer up — for hold stages
    let s3 = state.clone();
    dom::on_with_signal(arena.unchecked_ref(), "pointerup", signal, move |_: Event| {
        on_hold_end(s3.clone());
    });

    // Pointer move — for BellyRub circular motion detection
    dom::on_with_signal(arena.unchecked_ref(), "pointermove", signal, {
        let s4 = state.clone();
        move |event: Event| {
            let pe: PointerEvent = event.unchecked_into();
            on_pointer_move(pe, s4.clone());
        }
    });
}

// ---------------------------------------------------------------------------
// Interaction handlers
// ---------------------------------------------------------------------------

fn on_sparkle_tap(state: Rc<RefCell<AppState>>) {
    GAME.with(|g| {
        let mut borrow = g.borrow_mut();
        let Some(game) = borrow.as_mut() else { return };
        if !game.active { return; }

        let stage = game.current_stage();
        match stage {
            HugStage::GentlePat => {
                game.tap_count += 1;
                stage.pulse_sound();
                native_apis::vibrate_tap();

                // Float a heart at tap location
                let sparkle = state::get_cached_hug_sparkle()
        .or_else(|| dom::query("[data-hug-sparkle]"));
    if let Some(sparkle) = sparkle {
                    animations::float_up_heart(&sparkle);
                }
                confetti::float_emoji("[data-hug-sparkle]", "\u{1F49C}");

                // Show bubble on tap 3+
                if game.tap_count >= 3 {
                    show_bubble();
                }

                dom::set_text("[data-hug-counter]", &format!("{} / 5 pats", game.tap_count));

                if game.tap_count >= 5 {
                    complete_stage(game, state);
                }
            }
            HugStage::TickleTime => {
                game.tap_count += 1;
                stage.pulse_sound();
                native_apis::vibrate_tap();

                // Wobble Sparkle
                let sparkle = state::get_cached_hug_sparkle()
        .or_else(|| dom::query("[data-hug-sparkle]"));
    if let Some(sparkle) = sparkle {
                    animations::jelly_wobble(&sparkle);
                }

                // Show bubble mid-way
                if game.tap_count == 5 {
                    show_bubble();
                }

                // Float laugh emoji every 3 taps
                if game.tap_count % 3 == 0 {
                    confetti::float_emoji("[data-hug-sparkle]", "\u{1F602}");
                }

                dom::set_text("[data-hug-counter]", &format!("{} / 10 tickles", game.tap_count));

                if game.tap_count >= 10 {
                    complete_stage(game, state);
                }
            }
            HugStage::WakeUpKiss => {
                stage.pulse_sound();
                native_apis::vibrate_success();
                confetti::float_emoji("[data-hug-sparkle]", "\u{1F48B}");
                show_bubble();
                complete_stage(game, state);
            }
            _ => {} // Hold/motion stages handled separately
        }
    });
}

fn on_highfive_tap(state: Rc<RefCell<AppState>>) {
    GAME.with(|g| {
        let mut borrow = g.borrow_mut();
        let Some(game) = borrow.as_mut() else { return };
        if !game.active { return; }
        if game.current_stage() != HugStage::HighFive { return; }

        game.current_stage().pulse_sound();
        native_apis::vibrate_success();

        // Star burst on the target
        confetti::float_emoji("[data-hug-highfive]", "\u{2B50}");
        confetti::float_emoji("[data-hug-highfive]", "\u{1F4A5}");

        // Sparkle reaction
        let sparkle = state::get_cached_hug_sparkle()
        .or_else(|| dom::query("[data-hug-sparkle]"));
    if let Some(sparkle) = sparkle {
            sparkle.set_text_content(Some("\u{1F929}")); // star eyes
            animations::bounce(&sparkle);
        }

        show_bubble();
        complete_stage(game, state);
    });
}

fn on_nose_boop(state: Rc<RefCell<AppState>>) {
    GAME.with(|g| {
        let mut borrow = g.borrow_mut();
        let Some(game) = borrow.as_mut() else { return };
        if !game.active { return; }
        if game.current_stage() != HugStage::NoseBoops { return; }

        game.tap_count += 1;
        game.current_stage().pulse_sound();
        native_apis::vibrate_tap();

        // Wobble on each boop
        let sparkle = state::get_cached_hug_sparkle()
        .or_else(|| dom::query("[data-hug-sparkle]"));
    if let Some(sparkle) = sparkle {
            animations::jelly_wobble(&sparkle);
        }

        // Float boop emoji
        confetti::float_emoji("[data-hug-nose]", "\u{1F4A2}");

        dom::set_text("[data-hug-counter]", &format!("{} / 5 boops", game.tap_count));

        // Show bubble at 3 boops
        if game.tap_count == 3 {
            show_bubble();
        }

        // On 5th boop: Sparkle "sneezes" with confetti!
        if game.tap_count >= 5 {
            // Change to sneezing face before complete
            let sparkle = state::get_cached_hug_sparkle()
        .or_else(|| dom::query("[data-hug-sparkle]"));
    if let Some(sparkle) = sparkle {
                sparkle.set_text_content(Some("\u{1F927}")); // sneezing
            }
            complete_stage(game, state);
        }
    });
}

fn on_star_catch(star: Element, state: Rc<RefCell<AppState>>) {
    GAME.with(|g| {
        let mut borrow = g.borrow_mut();
        let Some(game) = borrow.as_mut() else { return };
        if !game.active { return };
        if game.current_stage() != HugStage::StarCatch { return };

        game.stars_caught += 1;
        game.current_stage().pulse_sound();
        native_apis::vibrate_tap();

        // Get star ID for selector
        let star_id = star.get_attribute("data-star-id").unwrap_or_default();

        // Remove the star with sparkle animation
        let _ = star.class_list().add_1("hug-star--caught");
        confetti::float_emoji(&format!("[data-star-id=\"{}\"]", star_id), "\u{2728}");

        // Remove star after animation
        dom::set_timeout_once(400, move || {
            star.remove();
        });

        dom::set_text("[data-hug-counter]", &format!("{} / 8 stars", game.stars_caught));

        if game.stars_caught == 4 {
            show_bubble();
        }

        if game.stars_caught >= 8 {
            // Sparkle celebrates
            let sparkle = state::get_cached_hug_sparkle()
        .or_else(|| dom::query("[data-hug-sparkle]"));
    if let Some(sparkle) = sparkle {
                sparkle.set_text_content(Some("\u{2728}")); // sparkles
                animations::bounce(&sparkle);
            }
            complete_stage(game, state);
        }
    });
}

fn on_hold_start() {
    GAME.with(|g| {
        let mut borrow = g.borrow_mut();
        let Some(game) = borrow.as_mut() else { return };
        if !game.active { return; }

        let stage = game.current_stage();
        if stage.is_hold() {
            game.hold_start = Some(utils::now_epoch_ms());
            start_hold_meter(stage);
        }
    });
}

fn on_hold_end(_state: Rc<RefCell<AppState>>) {
    GAME.with(|g| {
        let mut borrow = g.borrow_mut();
        let Some(game) = borrow.as_mut() else { return };
        if !game.active { return; }
        game.hold_start = None;

        // Reset meter if not completed
        if let Some(meter) = dom::query("[data-hug-meter]") {
            let _ = meter.set_attribute("style", "width: 0%");
        }

        // Clear belly rub motion data too
        game.motion_points.clear();
    });
}

fn on_pointer_move(pe: PointerEvent, state: Rc<RefCell<AppState>>) {
    // Only track when pointer is down (buttons > 0)
    if pe.buttons() == 0 { return; }

    GAME.with(|g| {
        let mut borrow = g.borrow_mut();
        let Some(game) = borrow.as_mut() else { return };
        if !game.active { return; }

        let x = pe.client_x() as f64;
        let y = pe.client_y() as f64;
        let stage = game.current_stage();

        match stage {
            HugStage::BellyRub => {
                game.motion_points.push((x, y));

                // Check for circular motion every 20 points
                if game.motion_points.len() >= 20 {
                    if detect_circle(&game.motion_points) {
                        game.circle_count += 1;
                        game.motion_points.clear();
                        game.current_stage().pulse_sound();
                        native_apis::vibrate_tap();

                        // Wobble Sparkle happily
                        let sparkle = state::get_cached_hug_sparkle()
        .or_else(|| dom::query("[data-hug-sparkle]"));
    if let Some(sparkle) = sparkle {
                            animations::jelly_wobble(&sparkle);
                        }
                        confetti::float_emoji("[data-hug-belly]", "\u{1F49C}");

                        dom::set_text("[data-hug-counter]", &format!("{} / 3 circles", game.circle_count));

                        if game.circle_count == 2 {
                            show_bubble();
                        }

                        if game.circle_count >= 3 {
                            // Change Sparkle to happy rolled-over pose
                            let sparkle = state::get_cached_hug_sparkle()
        .or_else(|| dom::query("[data-hug-sparkle]"));
    if let Some(sparkle) = sparkle {
                                sparkle.set_text_content(Some("\u{1F618}")); // kissing face
                            }
                            complete_stage(game, state.clone());
                        }
                    }

                    // Keep last 10 points for continuity if no circle detected
                    if game.motion_points.len() > 10 {
                        let keep = game.motion_points.len() - 10;
                        game.motion_points.drain(0..keep);
                    }
                }
            }
            HugStage::SpinDance => {
                // Detect circular spins around Sparkle
                game.motion_points.push((x, y));

                if game.motion_points.len() >= 20 {
                    if detect_circle(&game.motion_points) {
                        game.spin_count += 1;
                        game.motion_points.clear();
                        game.current_stage().pulse_sound();
                        native_apis::vibrate_tap();

                        // Spin Sparkle!
                        let sparkle = state::get_cached_hug_sparkle()
        .or_else(|| dom::query("[data-hug-sparkle]"));
    if let Some(sparkle) = sparkle {
                            let _ = sparkle.class_list().add_1("hug-sparkle--spin");
                            animations::jelly_wobble(&sparkle);
                        }

                        confetti::float_emoji("[data-hug-sparkle]", "\u{1F300}");
                        dom::set_text("[data-hug-counter]", &format!("{} / 3 spins", game.spin_count));

                        if game.spin_count == 2 {
                            show_bubble();
                        }

                        if game.spin_count >= 3 {
                            complete_stage(game, state.clone());
                        }
                    }

                    // Keep last 10 points
                    if game.motion_points.len() > 10 {
                        let keep = game.motion_points.len() - 10;
                        game.motion_points.drain(0..keep);
                    }
                }
            }
            HugStage::GentleRock => {
                // Detect left-right swaying motion
                let Some(sparkle) = dom::query("[data-hug-sparkle]") else { return };
                let rect = sparkle.get_bounding_client_rect();
                let center_x = rect.left() + rect.width() / 2.0;

                // Detect sway direction
                let new_direction = if x < center_x - 30.0 {
                    -1 // left
                } else if x > center_x + 30.0 {
                    1 // right
                } else {
                    0 // center
                };

                // Count complete swings (left -> right or right -> left)
                if new_direction != 0 && new_direction != game.rock_direction && game.rock_direction != 0 {
                    game.rock_count += 1;
                    game.current_stage().pulse_sound();
                    native_apis::vibrate_tap();

                    // Visual sway effect
                    let tilt = if new_direction == -1 { -15.0 } else { 15.0 };
                    let _ = sparkle.set_attribute("style", &format!("transform: rotate({}deg)", tilt));

                    confetti::float_emoji("[data-hug-sparkle]", "\u{1F49C}");

                    if game.rock_count == 4 {
                        show_bubble();
                    }

                    // Need 6 complete swings
                    if game.rock_count >= 6 {
                        complete_stage(game, state.clone());
                    }
                }
                game.rock_direction = new_direction;
            }
            _ => {}
        }
    });
}

/// Detect if a sequence of points forms approximately a circle.
/// Uses the angle-accumulation method: sum up the angles between consecutive
/// vectors from centroid. A full circle accumulates ~2*PI radians.
fn detect_circle(points: &[(f64, f64)]) -> bool {
    if points.len() < 12 { return false; }

    // Compute centroid
    let n = points.len() as f64;
    let cx: f64 = points.iter().map(|p| p.0).sum::<f64>() / n;
    let cy: f64 = points.iter().map(|p| p.1).sum::<f64>() / n;

    // Sum angular displacement
    let mut total_angle: f64 = 0.0;
    for i in 1..points.len() {
        let (x0, y0) = (points[i-1].0 - cx, points[i-1].1 - cy);
        let (x1, y1) = (points[i].0 - cx, points[i].1 - cy);
        let dot = x0 * x1 + y0 * y1;
        let cross = x0 * y1 - y0 * x1;
        let angle = cross.atan2(dot);
        total_angle += angle;
    }

    // A full circle ≈ ±2π. Accept ≈ 70% of a circle (generous for kids).
    total_angle.abs() > std::f64::consts::PI * 1.4
}

// ---------------------------------------------------------------------------
// Hold meter (BigHug, SleepyLullaby)
// ---------------------------------------------------------------------------

fn start_hold_meter(stage: HugStage) {
    let target_ms = match stage {
        HugStage::BigHug => 3000.0,
        HugStage::SleepyLullaby => 5000.0,
        HugStage::GentleRock => 4000.0,
        _ => return,
    };

    // Show the bubble during hold
    let bubble_shown = RefCell::new(false);

    let cb = Closure::<dyn FnMut()>::new(move || {
        let result = GAME.with(|g| {
            let borrow = g.borrow();
            let Some(game) = borrow.as_ref() else { return (true, false); };
            if !game.active { return (true, false); }
            let Some(start) = game.hold_start else { return (true, false); };

            let elapsed = utils::now_epoch_ms() - start;
            let pct = (elapsed / target_ms * 100.0).min(100.0);

            // Update meter fill with rainbow gradient at high %
            if let Some(meter) = dom::query("[data-hug-meter]") {
                if pct > 75.0 {
                    let _ = meter.set_attribute("style", &format!(
                        "width: {}%; background: var(--gradient-rainbow)",
                        pct as u32
                    ));
                } else {
                    let _ = meter.set_attribute("style", &format!("width: {}%", pct as u32));
                }
            }

            // Show bubble at 50%
            if pct > 50.0 && !*bubble_shown.borrow() {
                *bubble_shown.borrow_mut() = true;
                // Can't call show_bubble here (already borrowing GAME), so set text directly
                if let Some(b) = dom::query("[data-hug-bubble]") {
                    let _ = b.class_list().remove_1("hug-text-bubble--hidden");
                }
            }

            (false, elapsed >= target_ms)
        });

        let (should_stop, completed) = result;
        if should_stop { return; }

        if completed {
            GAME.with(|g| {
                let mut borrow = g.borrow_mut();
                let Some(game) = borrow.as_mut() else { return };
                game.hold_start = None;
                let state = game.state.clone();
                complete_stage(game, state);
            });
        }
    });

    let interval_id = dom::window().set_interval_with_callback_and_timeout_and_arguments_0(
        cb.as_ref().unchecked_ref(), 100).unwrap_or(0);
    cb.forget();

    GAME.with(|g| {
        if let Some(game) = g.borrow_mut().as_mut() {
            game.hold_interval_id = Some(interval_id);
        }
    });
}

// ---------------------------------------------------------------------------
// Stage completion & celebration
// ---------------------------------------------------------------------------

fn show_bubble() {
    if let Some(bubble) = dom::query("[data-hug-bubble]") {
        let _ = bubble.class_list().remove_1("hug-text-bubble--hidden");
        let _ = bubble.class_list().add_1("hug-text-bubble--visible");
    }
}

fn complete_stage(game: &mut HugState, state: Rc<RefCell<AppState>>) {
    let stage = game.current_stage();
    game.stages_completed += 1;
    game.tap_count = 0;
    game.hold_start = None;
    game.motion_points.clear();
    game.circle_count = 0;
    game.spin_count = 0;
    game.spin_start_angle = None;
    game.rock_count = 0;
    game.rock_direction = 0;
    game.stars_caught = 0;
    game.star_targets.clear();

    // Track unique stages seen
    game.stages_seen_mask |= 1 << stage.id();

    // Cancel any running hold meter
    if let Some(id) = game.hold_interval_id.take() {
        dom::window().clear_interval_with_handle(id);
    }

    // Play stage-specific completion sound
    stage.complete_sound();
    native_apis::vibrate_success();

    // Show reaction emoji on Sparkle
    let sparkle = state::get_cached_hug_sparkle()
        .or_else(|| dom::query("[data-hug-sparkle]"));
    if let Some(sparkle) = sparkle {
        sparkle.set_text_content(Some(stage.reaction_emoji()));
        animations::bounce(&sparkle);
    }

    // Award 1 heart per stage
    // Phase 3.1: Direct state access eliminates sync requirement
    let total = crate::state::with_state_mut(|s| {
        s.hearts_total += theme::HEARTS_HUG_PER_STAGE;
        s.hearts_today += theme::HEARTS_HUG_PER_STAGE;
        s.hearts_total
    });

    ui::update_heart_counter(total);

    // Float heart from Sparkle to progress bar
    confetti::float_emoji("[data-hug-sparkle]", "\u{1F49C}");

    // Animate the progress dot for this completed stage
    let dot_idx = game.stages_completed - 1;
    let dot_sel = format!("[data-hug-dot=\"{}\"]", dot_idx);
    if let Some(dot) = dom::query(&dot_sel) {
        dot.set_text_content(Some("\u{1F49C}"));
        let _ = dot.set_attribute("class", "hug-dot hug-dot--done hug-dot--pop");
        animations::bounce(&dot);
    }

    // Ascending pitch chime per completed stage (higher pitch = more done)
    match game.stages_completed {
        1 => synth_audio::chime(),
        2 => synth_audio::sparkle(),
        3 => synth_audio::chime(),
        4 => synth_audio::sparkle(),
        _ => synth_audio::fanfare(),
    }

    // Check if all stages done
    let is_final = game.stage_index + 1 >= game.stages.len();

    if is_final {
        // Grand finale!
        game.active = false;
        let s = state.clone();
        let mask = game.stages_seen_mask;
        let cb = Closure::<dyn FnMut()>::once(move || {
            trigger_grand_finale(s, mask);
        });
        let timeout_id = dom::window().set_timeout_with_callback_and_timeout_and_arguments_0(
            cb.as_ref().unchecked_ref(), 1200).unwrap_or(0);
        cb.forget();
        game.celebration_timeout = Some(timeout_id);
    } else {
        // Between-stage celebration, then transition to next stage
        game.stage_index += 1;
        let next_stage = game.stages[game.stage_index];
        let celebration_cb = Closure::<dyn FnMut()>::once(move || {
            // Render next stage after celebration
            render_stage(next_stage);
        });
        let timeout_id = dom::window().set_timeout_with_callback_and_timeout_and_arguments_0(
            celebration_cb.as_ref().unchecked_ref(), 1500).unwrap_or(0);
        celebration_cb.forget();
        game.celebration_timeout = Some(timeout_id);

        // Show between-stage celebration: Sparkle bounce + dance
        show_between_stage_celebration(game.stages_completed);
    }
}

/// Animated celebration between stages.
fn show_between_stage_celebration(completed: u32) {
    // Sparkle does a happy dance
    let sparkle = state::get_cached_hug_sparkle()
        .or_else(|| dom::query("[data-hug-sparkle]"));
    if let Some(sparkle) = sparkle {
        let _ = sparkle.class_list().add_1("hug-sparkle--dance");
        sparkle.set_text_content(Some("\u{1F60D}")); // heart eyes during dance
    }

    // Float celebration text
    let phrases = ["Good job!", "So sweet!", "Amazing!", "You're the best!"];
    let phrase = phrases.get((completed as usize).saturating_sub(1) % phrases.len())
        .unwrap_or(&"Yay!");

    // Show floating text via instruction area
    if let Some(inst) = dom::query("[data-hug-instruction]") {
        inst.set_text_content(Some(phrase));
        let _ = inst.class_list().add_1("hug-instruction--celebration");
    }
}

// ---------------------------------------------------------------------------
// Grand finale
// ---------------------------------------------------------------------------

fn trigger_grand_finale(state: Rc<RefCell<AppState>>, stages_seen_mask: u16) {
    let arena = state::get_cached_game_arena()
        .or_else(|| dom::query("#game-arena"));
    let Some(arena) = arena else { return };
    let doc = dom::document();
    dom::safe_set_inner_html(&arena, "");

    // 3-second celebration sequence
    let finale = render::create_el_with_class(&doc, "div", "hug-finale");
    let _ = finale.set_attribute("style", "background: var(--gradient-magic)");

    // Giant Sparkle
    let sparkle = render::create_el_with_class(&doc, "div", "hug-sparkle hug-sparkle--hero hug-sparkle--finale-spin");
    sparkle.set_text_content(Some("\u{1F984}")); // unicorn!
    let _ = sparkle.set_attribute("data-hug-finale-sparkle", "");

    // "You're the BEST friend ever!" text
    let msg = render::create_el_with_class(&doc, "div", "hug-finale-text");
    msg.set_text_content(Some("You're the BEST friend ever!"));

    // All progress dots pulsing
    let dots = render::create_el_with_class(&doc, "div", "hug-finale-dots");
    for _ in 0..theme::HUG_STAGES_PER_GAME {
        let dot = render::create_el_with_class(&doc, "span", "hug-dot hug-dot--done hug-dot--pulse");
        dot.set_text_content(Some("\u{1F49C}"));
        let _ = dots.append_child(&dot);
    }

    let _ = finale.append_child(&sparkle);
    let _ = finale.append_child(&msg);
    let _ = finale.append_child(&dots);
    let _ = arena.append_child(&finale);

    // Layer sounds & confetti
    synth_audio::fanfare();
    confetti::burst_party();
    confetti::burst_hearts();
    native_apis::vibrate_celebration();

    // Speech
    speech::celebrate("You're the best friend ever!");

    // After 2.5s, second wave of confetti
    {
        let s = state.clone();
        dom::set_timeout_once(2500, move || {
            confetti::burst_unicorn();
            synth_audio::rainbow_burst();

            // After another 1.5s, show end screen
            dom::set_timeout_once(1500, move || {
                show_hug_end(s, stages_seen_mask);
            });
        });
    }
}

// ---------------------------------------------------------------------------
// End screen
// ---------------------------------------------------------------------------

fn show_hug_end(state: Rc<RefCell<AppState>>, stages_seen_mask: u16) {
    let arena = state::get_cached_game_arena()
        .or_else(|| dom::query("#game-arena"));
    let Some(arena) = arena else { return };
    let doc = dom::document();
    dom::safe_set_inner_html(&arena, "");

    let hearts_earned = theme::HEARTS_HUG_PER_STAGE * theme::HUG_STAGES_PER_GAME as u32;

    // Save to DB
    let id = utils::create_id();
    let day_key = utils::today_key();
    let now = utils::now_epoch_ms();
    db_client::exec_fire_and_forget(
        "hug-save",
        "INSERT INTO game_scores (id, game_id, score, level, duration_ms, played_at, day_key) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        vec![
            id,
            "hug".into(),
            hearts_earned.to_string(),
            theme::HUG_STAGES_PER_GAME.to_string(),
            "0".into(),
            now.to_string(),
            day_key,
        ],
    );

    // Update state
    let unique_seen = stages_seen_mask.count_ones();
    {
        let mut s = state.borrow_mut();
        s.games_played_today += 1;
        s.hug_completions += 1;
        s.hug_unique_stages_seen = s.hug_unique_stages_seen.max(unique_seen);
    }

    // Weekly goals
    weekly_goals::increment_progress("games", 1);
    weekly_goals::increment_progress("hearts", hearts_earned);

    // Build end screen
    let screen = render::create_el_with_class(&doc, "div", "game-end-screen");

    let title = render::create_el_with_class(&doc, "div", "game-end-title");
    title.set_text_content(Some("\u{1F49C} Sparkle Loves You! \u{1F49C}"));

    let stats = render::create_el_with_class(&doc, "div", "game-end-stats");

    // Hearts earned
    let hearts_line = render::create_el_with_class(&doc, "div", "game-end-stat game-end-stat--hearts");
    hearts_line.set_text_content(Some(&format!("\u{1F49C} +{} hearts earned!", hearts_earned)));
    let _ = stats.append_child(&hearts_line);

    // Unique stages discovered
    let unique_line = render::create_el_with_class(&doc, "div", "game-end-stat");
    let total_types = theme::HUG_TOTAL_STAGE_TYPES;
    let unique_text = if unique_seen as usize >= total_types {
        format!("\u{1F31F} Best Friend! All {} interactions discovered!", total_types)
    } else {
        format!("\u{1F50E} {}/{} interactions discovered", unique_seen, total_types)
    };
    unique_line.set_text_content(Some(&unique_text));
    let _ = stats.append_child(&unique_line);

    // Completions count
    let completions = state.borrow().hug_completions;
    let comp_line = render::create_el_with_class(&doc, "div", "game-end-stat");
    comp_line.set_text_content(Some(&format!("\u{1F917} Hug sessions: {}", completions)));
    let _ = stats.append_child(&comp_line);

    // Buttons
    let buttons = render::create_el_with_class(&doc, "div", "game-end-buttons");
    let again_btn = render::create_button(&doc, "game-end-btn game-end-btn--again", "\u{1F504} Play Again");
    let _ = again_btn.set_attribute("data-game-again", "hug");
    let back_btn = render::create_button(&doc, "game-end-btn game-end-btn--back", "\u{2190} Back to Games");
    let _ = back_btn.set_attribute("data-game-back", "");
    let _ = buttons.append_child(&again_btn);
    let _ = buttons.append_child(&back_btn);

    let _ = screen.append_child(&title);
    let _ = screen.append_child(&stats);
    let _ = screen.append_child(&buttons);
    let _ = arena.append_child(&screen);

    // Bind end-screen buttons
    let end_signal = GAME.with(|g| {
        g.borrow().as_ref().map(|game| game.abort.signal())
    });
    let s = state.clone();
    games::bind_end_buttons(
        end_signal.as_ref(),
        move || { cleanup(); crate::game_hug::start(s.clone()); },
        || { cleanup(); games::return_to_menu(); },
    );
}

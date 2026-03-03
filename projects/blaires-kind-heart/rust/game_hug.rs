use crate::{
    animations, browser_apis, confetti, dom, games, native_apis, render, speech, state,
    state::AppState, synth_audio, theme, ui, utils, weekly_goals,
};
use std::cell::RefCell;
use std::fmt::Write;
use std::rc::Rc;
use wasm_bindgen::prelude::*;
use web_sys::{Element, Event, PointerEvent};
fn get_sparkle() -> Option<Element> {
    state::get_cached_hug_sparkle().or_else(|| dom::query("[data-hug-sparkle]"))
}
#[derive(Clone, Copy, PartialEq, Debug)]
enum HugStage {
    GentlePat = 0,
    BigHug = 1,
    TickleTime = 2,
    SleepyLullaby = 3,
    WakeUpKiss = 4,
    HighFive = 5,
    BellyRub = 6,
    NoseBoops = 7,
    SpinDance = 8,
    GentleRock = 9,
    StarCatch = 10,
    PeekaBoo = 11,
    PattyKake = 12,
    BlowKisses = 13,
    MagicSpell = 14,
}
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
fn complete_tickle() {
    synth_audio::giggle();
    confetti::burst_hearts();
}
fn complete_kiss() {
    synth_audio::magic_wand();
    confetti::burst_stars();
}
fn complete_highfive() {
    synth_audio::level_up();
    confetti::burst_stars();
}
fn complete_belly() {
    synth_audio::dreamy();
    confetti::burst_hearts();
}
fn complete_nose() {
    synth_audio::sparkle();
    confetti::burst_party();
}
fn complete_spin() {
    synth_audio::rainbow_burst();
    confetti::burst_unicorn();
}
fn complete_rock() {
    synth_audio::lullaby();
    confetti::burst_hearts();
}
fn complete_peekaboo() {
    synth_audio::giggle();
    confetti::burst_party();
}
fn complete_pattykake() {
    synth_audio::tap();
    confetti::burst_stars();
}
fn complete_magicspell() {
    synth_audio::magic_wand();
    confetti::burst_unicorn();
}
fn sparkle_float(emoji: &str) {
    confetti::float_emoji("[data-hug-sparkle]", emoji);
}
const STAGE_DATA: [StageData; 15] = [
    StageData {
        instruction: "Gently pat Sparkle! (tap 5 times)",
        mood: "\u{1F60A}",
        reaction: "\u{1F60C}",
        bubble: "so gentle...",
        bg: "linear-gradient(180deg, #FFE0E6 0%, #FFB7C5 100%)",
        pulse_sound: synth_audio::gentle,
        complete_sound: synth_audio::sparkle,
        is_hold: false,
    },
    StageData {
        instruction: "Give Sparkle a big hug! (press and hold)",
        mood: "\u{1F970}",
        reaction: "\u{1F496}",
        bubble: "so warm!",
        bg: "linear-gradient(180deg, #FFF5D0 0%, #FFD700 100%)",
        pulse_sound: synth_audio::dreamy,
        complete_sound: synth_audio::dreamy,
        is_hold: true,
    },
    StageData {
        instruction: "Tickle Sparkle! (tap really fast!)",
        mood: "\u{1F923}",
        reaction: "\u{1F606}",
        bubble: "hehehehe!",
        bg: "linear-gradient(180deg, #E0FFE6 0%, #82DDA0 100%)",
        pulse_sound: synth_audio::giggle,
        complete_sound: complete_tickle,
        is_hold: false,
    },
    StageData {
        instruction: "Sing Sparkle to sleep... (hold gently)",
        mood: "\u{1F634}",
        reaction: "\u{1F4A4}",
        bubble: "zzz...",
        bg: "linear-gradient(180deg, #D6EFFF 0%, #7B9FD4 100%)",
        pulse_sound: synth_audio::lullaby,
        complete_sound: synth_audio::gentle,
        is_hold: true,
    },
    StageData {
        instruction: "Give Sparkle a wake-up kiss! (tap once)",
        mood: "\u{1F929}",
        reaction: "\u{1F31F}",
        bubble: "good morning!",
        bg: "linear-gradient(180deg, #FFE0E6 0%, #FF6B9D 50%, #FFD700 100%)",
        pulse_sound: synth_audio::magic_wand,
        complete_sound: complete_kiss,
        is_hold: false,
    },
    StageData {
        instruction: "High five! Tap Sparkle's hoof!",
        mood: "\u{270B}",
        reaction: "\u{1F4A5}",
        bubble: "yeah!",
        bg: "linear-gradient(180deg, #FFF4C7 0%, #FFB800 100%)",
        pulse_sound: synth_audio::tap,
        complete_sound: complete_highfive,
        is_hold: false,
    },
    StageData {
        instruction: "Rub Sparkle's belly! (move in circles)",
        mood: "\u{1F60D}",
        reaction: "\u{1F618}",
        bubble: "mmmm nice...",
        bg: "linear-gradient(180deg, #E8D5FF 0%, #B57EFF 100%)",
        pulse_sound: synth_audio::chime,
        complete_sound: complete_belly,
        is_hold: false,
    },
    StageData {
        instruction: "Boop the nose! (tap the nose 5 times!)",
        mood: "\u{1F525}",
        reaction: "\u{1F927}",
        bubble: "boop!",
        bg: "linear-gradient(180deg, #FFD6D6 0%, #FF5252 100%)",
        pulse_sound: synth_audio::sparkle,
        complete_sound: complete_nose,
        is_hold: false,
    },
    StageData {
        instruction: "Spin Sparkle around! (swipe in a circle)",
        mood: "\u{1F483}",
        reaction: "\u{1F60D}",
        bubble: "wheee!",
        bg: "linear-gradient(180deg, #E0D5FF 0%, #9D7FFF 50%, #FFB7E5 100%)",
        pulse_sound: synth_audio::chime,
        complete_sound: complete_spin,
        is_hold: false,
    },
    StageData {
        instruction: "Rock Sparkle gently... (hold and sway)",
        mood: "\u{1F60C}",
        reaction: "\u{1F634}",
        bubble: "so peaceful...",
        bg: "linear-gradient(180deg, #C7E9FF 0%, #87CEEB 100%)",
        pulse_sound: synth_audio::lullaby,
        complete_sound: complete_rock,
        is_hold: true,
    },
    StageData {
        instruction: "Catch the falling stars! (tap 8 stars)",
        mood: "\u{1F929}",
        reaction: "\u{2728}",
        bubble: "got one!",
        bg: "linear-gradient(180deg, #1a0033 0%, #5533FF 50%, #FFB700 100%)",
        pulse_sound: synth_audio::sparkle,
        complete_sound: complete_kiss,
        is_hold: false,
    },
    StageData {
        instruction: "Peek-a-boo! Tap to hide and find Sparkle!",
        mood: "\u{1F648}",
        reaction: "\u{1F601}",
        bubble: "peek-a-boo!",
        bg: "linear-gradient(180deg, #FFE4B5 0%, #FFA07A 100%)",
        pulse_sound: synth_audio::giggle,
        complete_sound: complete_peekaboo,
        is_hold: false,
    },
    StageData {
        instruction: "Patty-cake! Tap Sparkle's hands!",
        mood: "\u{1F44F}",
        reaction: "\u{1F60A}",
        bubble: "patty-cake!",
        bg: "linear-gradient(180deg, #FFFDE7 0%, #FFF176 100%)",
        pulse_sound: synth_audio::tap,
        complete_sound: complete_pattykake,
        is_hold: false,
    },
    StageData {
        instruction: "Blow Sparkle kisses! (quick taps!)",
        mood: "\u{1F618}",
        reaction: "\u{1F970}",
        bubble: "mwah!",
        bg: "linear-gradient(180deg, #FFE0EC 0%, #FF80AB 100%)",
        pulse_sound: synth_audio::chime,
        complete_sound: complete_belly,
        is_hold: false,
    },
    StageData {
        instruction: "Cast a spell! (draw a circle!)",
        mood: "\u{2728}",
        reaction: "\u{1FA84}",
        bubble: "abracadabra!",
        bg: "linear-gradient(180deg, #E1BEE7 0%, #7B1FA2 50%, #311B92 100%)",
        pulse_sound: synth_audio::magic_wand,
        complete_sound: complete_magicspell,
        is_hold: false,
    },
];
const ALL_STAGES: [HugStage; 15] = [
    HugStage::GentlePat,
    HugStage::BigHug,
    HugStage::TickleTime,
    HugStage::SleepyLullaby,
    HugStage::WakeUpKiss,
    HugStage::HighFive,
    HugStage::BellyRub,
    HugStage::NoseBoops,
    HugStage::SpinDance,
    HugStage::GentleRock,
    HugStage::StarCatch,
    HugStage::PeekaBoo,
    HugStage::PattyKake,
    HugStage::BlowKisses,
    HugStage::MagicSpell,
];
const GENTLE_STAGES: &[HugStage] = &[
    HugStage::GentlePat,
    HugStage::SleepyLullaby,
    HugStage::GentleRock,
    HugStage::WakeUpKiss,
    HugStage::BlowKisses,
];
const SILLY_STAGES: &[HugStage] = &[
    HugStage::TickleTime,
    HugStage::HighFive,
    HugStage::NoseBoops,
    HugStage::PeekaBoo,
    HugStage::PattyKake,
];
impl HugStage {
    const fn data(self) -> &'static StageData {
        &STAGE_DATA[self as usize]
    }
    fn instruction(self) -> &'static str {
        self.data().instruction
    }
    fn sparkle_mood(self) -> &'static str {
        self.data().mood
    }
    fn reaction_emoji(self) -> &'static str {
        self.data().reaction
    }
    fn mid_bubble(self) -> &'static str {
        self.data().bubble
    }
    fn bg_color(self) -> &'static str {
        self.data().bg
    }
    fn pulse_sound(self) {
        (self.data().pulse_sound)();
    }
    fn complete_sound(self) {
        (self.data().complete_sound)();
    }
    const fn id(self) -> u8 {
        self as u8
    }
    fn is_hold(self) -> bool {
        self.data().is_hold
    }
}
struct HugState {
    stages: [HugStage; 5],
    stage_index: usize,
    tap_count: u32,
    hold_start: Option<f64>,
    stages_completed: u32,
    active: bool,
    hold_interval_id: Option<i32>,
    state: Rc<RefCell<AppState>>,
    abort: browser_apis::AbortHandle,
    stages_seen_mask: u16,
    motion_points: Vec<(f64, f64)>,
    circle_count: u32,
    celebration_timeout: Option<i32>,
    spin_count: u32,
    spin_start_angle: Option<f64>,
    rock_count: u32,
    rock_direction: i8,
    stars_caught: u32,
    star_targets: Vec<(f64, f64, String)>,
}
impl HugState {
    const fn current_stage(&self) -> HugStage {
        self.stages[self.stage_index]
    }
}
thread_local! {
    static GAME: RefCell<Option<HugState>> = const { RefCell::new(None) };
    static PICKER_ABORT: RefCell<Option<browser_apis::AbortHandle>> = const { RefCell::new(None) };
}
pub fn start(state: Rc<RefCell<AppState>>) {
    show_mood_picker(state);
}
fn show_mood_picker(state: Rc<RefCell<AppState>>) {
    let Some((arena, buttons)) = render::build_game_picker("\u{1F917} How Should We Play?") else {
        return;
    };
    let doc = dom::document();
    for (label, mood) in [
        ("\u{1F60C} Gentle", "gentle"),
        ("\u{1F923} Silly", "silly"),
        ("\u{1F381} Surprise!", "surprise"),
    ] {
        let Some(btn) = render::create_button(&doc, "game-card game-card--hug", label) else {
            continue;
        };
        dom::set_attr(&btn, "data-hug-mood", mood);
        let _ = buttons.append_child(&btn);
    }
    let Some(picker_abort) = browser_apis::new_abort_handle() else {
        return;
    };
    let picker_signal = picker_abort.signal();
    let s = state;
    dom::on_with_signal(
        arena.unchecked_ref(),
        "click",
        &picker_signal,
        move |event: Event| {
            let Some(el) = dom::event_target_element(&event) else {
                return;
            };
            if let Some(mood_attr) = dom::closest(&el, "[data-hug-mood]")
                .and_then(|e| dom::get_attr(&e, "data-hug-mood"))
            {
                PICKER_ABORT.with(|p| {
                    p.borrow_mut().take();
                });
                let stages = match mood_attr.as_str() {
                    "gentle" => pick_from_pool(GENTLE_STAGES, theme::HUG_STAGES_PER_GAME),
                    "silly" => pick_from_pool(SILLY_STAGES, theme::HUG_STAGES_PER_GAME),
                    _ => pick_from_pool(&ALL_STAGES, theme::HUG_STAGES_PER_GAME),
                };
                start_with_stages(s.clone(), stages);
            }
        },
    );
    PICKER_ABORT.with(|p| {
        *p.borrow_mut() = Some(picker_abort);
    });
}
fn pick_from_pool(pool: &[HugStage], count: usize) -> [HugStage; 5] {
    let mut buf = [HugStage::GentlePat; 5];
    let n = pool.len();
    let pick = count.min(n).min(5);
    if n <= 5 {
        buf[..n].copy_from_slice(&pool[..n]);
        for i in 0..pick {
            let j = i + (utils::random_u32() as usize % (n - i));
            buf.swap(i, j);
        }
    } else {
        let mut work = [HugStage::GentlePat; 16];
        work[..n.min(16)].copy_from_slice(&pool[..n.min(16)]);
        for i in 0..pick {
            let j = i + (utils::random_u32() as usize % (n.min(16) - i));
            work.swap(i, j);
        }
        buf[..pick].copy_from_slice(&work[..pick]);
    }
    buf
}
fn start_with_stages(state: Rc<RefCell<AppState>>, stages: [HugStage; 5]) {
    let Some(abort) = browser_apis::new_abort_handle() else {
        return;
    };
    let signal = abort.signal();
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
    let arena = dom::query(crate::constants::SELECTOR_GAME_ARENA);
    if arena.is_none() {
        dom::warn("⚠ #game-arena not found during hug game start");
    }
    state::with_state_mut(|game| {
        game.game_arena = arena;
    });
    let first_stage = GAME.with(|g| {
        g.borrow()
            .as_ref()
            .map_or(HugStage::GentlePat, |game| game.stages[0])
    });
    render_stage(first_stage);
    cache_sparkle_element();
    bind_interactions(state, &signal);
}
fn cache_sparkle_element() -> Option<web_sys::Element> {
    let el = dom::query("[data-hug-sparkle]");
    if el.is_none() {
        dom::warn("⚠ [data-hug-sparkle] not found after render_stage");
    }
    state::with_state_mut(|game| {
        game.hug_sparkle_container.clone_from(&el);
    });
    el
}
pub fn cleanup() {
    PICKER_ABORT.with(|p| {
        *p.borrow_mut() = None;
    });
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
    crate::state::with_state_mut(|game| {
        game.game_arena = None;
        game.hug_sparkle_container = None;
    });
}
fn render_stage(stage: HugStage) {
    let arena = games::get_arena();
    let Some(arena) = arena else { return };
    let doc = dom::document();
    dom::safe_set_inner_html(&arena, "");
    crate::state::with_state_mut(|game| {
        game.hug_sparkle_container = None;
    });
    let Some(container) = render::create_el_with_class(&doc, "div", "hug-container") else {
        return;
    };
    dom::with_buf(|buf| {
        let _ = write!(buf, "background: {}", stage.bg_color());
        dom::set_attr(&container, "style", buf);
    });
    let Some(instruction) = render::text_el_with_data(
        &doc,
        "div",
        "hug-instruction",
        stage.instruction(),
        "data-hug-instruction",
    ) else {
        return;
    };
    let Some(sparkle_wrap) =
        render::create_el_with_data(&doc, "div", "hug-sparkle-wrap", "data-hug-sparkle-wrap")
    else {
        return;
    };
    let Some(sparkle) = render::text_el_with_data(
        &doc,
        "div",
        "hug-sparkle hug-sparkle--hero",
        stage.sparkle_mood(),
        "data-hug-sparkle",
    ) else {
        return;
    };
    let _ = sparkle_wrap.append_child(&sparkle);
    let Some(bubble) = render::text_el_with_data(
        &doc,
        "div",
        "hug-text-bubble hug-text-bubble--hidden",
        stage.mid_bubble(),
        "data-hug-bubble",
    ) else {
        return;
    };
    let _ = sparkle_wrap.append_child(&bubble);
    match stage {
        HugStage::HighFive => {
            if let Some(target) = render::text_el_with_data(
                &doc,
                "div",
                "hug-highfive-target",
                "\u{270B}",
                "data-hug-highfive",
            ) {
                let _ = sparkle_wrap.append_child(&target);
            }
        }
        HugStage::NoseBoops => {
            if let Some(target) = render::text_el_with_data(
                &doc,
                "div",
                "hug-nose-target",
                "\u{1F443}",
                "data-hug-nose",
            ) {
                let _ = sparkle_wrap.append_child(&target);
            }
        }
        HugStage::BellyRub => {
            if let Some(zone) =
                render::create_el_with_data(&doc, "div", "hug-belly-zone", "data-hug-belly")
            {
                render::append_text(&doc, &zone, "div", "hug-belly-hint", "\u{1F300}");
                let _ = sparkle_wrap.append_child(&zone);
            }
        }
        HugStage::SpinDance => {
            if let Some(hint) = render::text_el_with_data(
                &doc,
                "div",
                "hug-spin-hint",
                "\u{1F300}",
                "data-hug-spin-hint",
            ) {
                let _ = sparkle_wrap.append_child(&hint);
            }
        }
        HugStage::StarCatch => {
            if let Some(stars_zone) =
                render::create_el_with_data(&doc, "div", "hug-stars-zone", "data-hug-stars-zone")
            {
                let _ = container.append_child(&stars_zone);
            }
        }
        _ => {}
    }
    let Some(progress) = render::create_el_with_class(&doc, "div", "hug-progress") else {
        return;
    };
    let completed = GAME.with(|g| g.borrow().as_ref().map_or(0, |game| game.stages_completed));
    let total = theme::HUG_STAGES_PER_GAME as u32;
    for i in 0..total {
        let Some(dot) = render::create_el_with_class(
            &doc,
            "span",
            if i < completed {
                "hug-dot hug-dot--done"
            } else if i == completed {
                "hug-dot hug-dot--current"
            } else {
                "hug-dot"
            },
        ) else {
            continue;
        };
        dot.set_text_content(Some(if i < completed {
            "\u{1F49C}"
        } else {
            "\u{25CB}"
        }));
        dom::set_attr(&dot, "data-hug-dot", &i.to_string());
        let _ = progress.append_child(&dot);
    }
    let Some(counter) = render::create_el_with_data(&doc, "div", "hug-counter", "data-hug-counter")
    else {
        return;
    };
    match stage {
        HugStage::GentlePat => counter.set_text_content(Some("0 / 5 pats")),
        HugStage::TickleTime => counter.set_text_content(Some("0 / 10 tickles")),
        HugStage::NoseBoops => counter.set_text_content(Some("0 / 5 boops")),
        HugStage::BigHug | HugStage::SleepyLullaby | HugStage::GentleRock => {
            let Some(meter) = render::create_el_with_class(&doc, "div", "hug-meter") else {
                return;
            };
            let Some(fill) =
                render::create_el_with_data(&doc, "div", "hug-meter-fill", "data-hug-meter")
            else {
                return;
            };
            let _ = meter.append_child(&fill);
            counter.set_text_content(None);
            let _ = counter.append_child(&meter);
        }
        HugStage::WakeUpKiss => counter.set_text_content(Some("\u{1F48B} Tap to wake up!")),
        HugStage::HighFive => counter.set_text_content(Some("\u{270B} Tap the hoof!")),
        HugStage::BellyRub => counter.set_text_content(Some("0 / 3 circles")),
        HugStage::SpinDance => counter.set_text_content(Some("0 / 3 spins")),
        HugStage::StarCatch => counter.set_text_content(Some("0 / 8 stars")),
        HugStage::PeekaBoo => counter.set_text_content(Some("0 / 6 peeks")),
        HugStage::PattyKake => counter.set_text_content(Some("0 / 8 claps")),
        HugStage::BlowKisses => counter.set_text_content(Some("0 / 6 kisses")),
        HugStage::MagicSpell => counter.set_text_content(Some("0 / 3 spells")),
    }
    for child in [&instruction, &sparkle_wrap, &counter, &progress] {
        let _ = container.append_child(child);
    }
    let _ = arena.append_child(&container);
    let sparkle = cache_sparkle_element();
    if let Some(s) = sparkle {
        animations::magic_entrance(&s);
        spawn_entrance_particles();
    }
    if stage == HugStage::StarCatch {
        spawn_falling_stars();
    }
}
fn spawn_entrance_particles() {
    let Some(sparkle) = get_sparkle() else { return };
    let doc = dom::document();
    let parent = sparkle.parent_element();
    let Some(parent) = parent else { return };
    dom::with_buf(|buf| {
        for _ in 0..8 {
            let Some(particle) = render::create_el_with_class(&doc, "div", "hug-entrance-particle")
            else {
                continue;
            };
            let offset_x = (js_sys::Math::random() - 0.5) * 80.0;
            let offset_y = (js_sys::Math::random() - 0.5) * 80.0;
            let delay = (js_sys::Math::random() * 300.0) as u32;
            buf.clear();
            let _ = write!(buf, "left: 50%; top: 50%; transform: translate({offset_x:.0}px, {offset_y:.0}px); animation-delay: {delay}ms");
            dom::set_attr(&particle, "style", buf);
            let _ = parent.append_child(&particle);
        }
    });
}
fn spawn_falling_stars() {
    GAME.with(|g| {
        let mut borrow = g.borrow_mut();
        let Some(game) = borrow.as_mut() else { return };
        game.star_targets.clear();
        let Some(zone) = dom::query("[data-hug-stars-zone]") else {
            return;
        };
        let doc = dom::document();
        dom::with_buf(|buf| {
            for i in 0..8u32 {
                let Some(star) = render::create_el_with_class(&doc, "div", "hug-falling-star")
                else {
                    continue;
                };
                buf.clear();
                let _ = write!(buf, "star-{i}");
                star.set_text_content(Some("\u{2B50}"));
                dom::set_attr(&star, "data-star-id", buf);
                let star_id = buf.clone();
                let x = 10.0 + js_sys::Math::random() * 80.0;
                let delay = (f64::from(i) * 800.0) + js_sys::Math::random() * 400.0;
                buf.clear();
                let _ = write!(buf, "left: {x:.0}%; animation-delay: {delay:.0}ms");
                dom::set_attr(&star, "style", buf);
                let _ = zone.append_child(&star);
                game.star_targets.push((x, 0.0, star_id));
            }
        });
    });
}
fn bind_interactions(state: Rc<RefCell<AppState>>, signal: &web_sys::AbortSignal) {
    let arena = games::get_arena();
    let Some(arena) = arena else { return };
    let s = state.clone();
    dom::on_with_signal(
        arena.unchecked_ref(),
        "click",
        signal,
        move |event: Event| {
            let Some(el) = dom::event_target_element(&event) else {
                return;
            };
            if dom::closest(&el, "[data-hug-highfive]").is_some() {
                on_highfive_tap(s.clone());
            } else if dom::closest(&el, "[data-hug-nose]").is_some() {
                on_nose_boop(s.clone());
            } else if let Some(star) = dom::closest(&el, "[data-star-id]") {
                on_star_catch(star, s.clone());
            } else if dom::closest(&el, "[data-hug-sparkle]").is_some()
                || dom::closest(&el, "[data-hug-sparkle-wrap]").is_some()
            {
                on_sparkle_tap(s.clone());
            }
        },
    );
    dom::on_with_signal(
        arena.unchecked_ref(),
        "pointerdown",
        signal,
        move |event: Event| {
            let Some(el) = dom::event_target_element(&event) else {
                return;
            };
            if dom::closest(&el, "[data-hug-sparkle]").is_some() {
                on_hold_start();
            }
        },
    );
    dom::on_with_signal(
        arena.unchecked_ref(),
        "pointerup",
        signal,
        move |_: Event| on_hold_end(),
    );
    dom::on_with_signal(
        arena.unchecked_ref(),
        "pointercancel",
        signal,
        move |_: Event| on_hold_end(),
    );
    dom::on_with_signal(arena.unchecked_ref(), "pointermove", signal, {
        let s4 = state;
        move |event: Event| {
            let pe: PointerEvent = event.unchecked_into();
            on_pointer_move(pe, s4.clone());
        }
    });
}
fn tap_and_vibrate(game: &mut HugState, stage: HugStage) {
    game.tap_count += 1;
    stage.pulse_sound();
    native_apis::vibrate_tap();
}
fn tap_progress(
    game: &mut HugState,
    state: Rc<RefCell<AppState>>,
    bubble_at: u32,
    max: u32,
    label: &str,
) {
    if game.tap_count >= bubble_at {
        show_bubble();
    }
    dom::fmt_text("[data-hug-counter]", |buf| {
        let _ = write!(buf, "{} / {max} {label}", game.tap_count);
    });
    if game.tap_count >= max {
        complete_stage(game, state);
    }
}
fn on_sparkle_tap(state: Rc<RefCell<AppState>>) {
    GAME.with(|g| {
        let mut borrow = g.borrow_mut();
        let Some(game) = borrow.as_mut() else { return };
        if !game.active {
            return;
        }
        let stage = game.current_stage();
        match stage {
            HugStage::GentlePat => {
                tap_and_vibrate(game, stage);
                if let Some(sparkle) = get_sparkle() {
                    animations::float_up_heart(&sparkle);
                }
                sparkle_float("\u{1F49C}");
                tap_progress(game, state, 3, 5, "pats");
            }
            HugStage::TickleTime => {
                tap_and_vibrate(game, stage);
                if let Some(sparkle) = get_sparkle() {
                    animations::jelly_wobble(&sparkle);
                }
                if game.tap_count % 3 == 0 {
                    sparkle_float("\u{1F602}");
                }
                tap_progress(game, state, 5, 10, "tickles");
            }
            HugStage::WakeUpKiss => {
                stage.pulse_sound();
                native_apis::vibrate_success();
                sparkle_float("\u{1F48B}");
                show_bubble();
                complete_stage(game, state);
            }
            HugStage::PeekaBoo => {
                tap_and_vibrate(game, stage);
                if let Some(sparkle) = get_sparkle() {
                    if game.tap_count % 2 == 1 {
                        sparkle.set_text_content(Some("\u{1F648}"));
                    } else {
                        sparkle.set_text_content(Some("\u{1F601}"));
                        sparkle_float("\u{2728}");
                    }
                    animations::jelly_wobble(&sparkle);
                }
                tap_progress(game, state, 3, 6, "peeks");
            }
            HugStage::PattyKake => {
                tap_and_vibrate(game, stage);
                if let Some(sparkle) = get_sparkle() {
                    if game.tap_count % 2 == 1 {
                        sparkle.set_text_content(Some("\u{1F44F}"));
                    } else {
                        sparkle.set_text_content(Some("\u{1F60A}"));
                    }
                    animations::bounce(&sparkle);
                }
                sparkle_float("\u{1F44F}");
                tap_progress(game, state, 4, 8, "claps");
            }
            HugStage::BlowKisses => {
                tap_and_vibrate(game, stage);
                sparkle_float("\u{1F48B}");
                if let Some(sparkle) = get_sparkle() {
                    sparkle.set_text_content(Some("\u{1F970}"));
                    animations::jelly_wobble(&sparkle);
                }
                tap_progress(game, state, 3, 6, "kisses");
            }
            _ => {}
        }
    });
}
fn on_highfive_tap(state: Rc<RefCell<AppState>>) {
    GAME.with(|g| {
        let mut borrow = g.borrow_mut();
        let Some(game) = borrow.as_mut() else { return };
        if !game.active {
            return;
        }
        if game.current_stage() != HugStage::HighFive {
            return;
        }
        game.current_stage().pulse_sound();
        native_apis::vibrate_success();
        confetti::float_emoji("[data-hug-highfive]", "\u{2B50}");
        confetti::float_emoji("[data-hug-highfive]", "\u{1F4A5}");
        if let Some(sparkle) = get_sparkle() {
            sparkle.set_text_content(Some("\u{1F929}"));
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
        if !game.active {
            return;
        }
        if game.current_stage() != HugStage::NoseBoops {
            return;
        }
        game.tap_count += 1;
        game.current_stage().pulse_sound();
        native_apis::vibrate_tap();
        if let Some(sparkle) = get_sparkle() {
            animations::jelly_wobble(&sparkle);
        }
        confetti::float_emoji("[data-hug-nose]", "\u{1F4A2}");
        dom::fmt_text("[data-hug-counter]", |buf| {
            let _ = write!(buf, "{} / 5 boops", game.tap_count);
        });
        if game.tap_count == 3 {
            show_bubble();
        }
        if game.tap_count >= 5 {
            if let Some(sparkle) = get_sparkle() {
                sparkle.set_text_content(Some("\u{1F927}"));
            }
            complete_stage(game, state);
        }
    });
}
fn on_star_catch(star: Element, state: Rc<RefCell<AppState>>) {
    if star.class_list().contains("hug-star--caught") {
        return;
    }
    GAME.with(|g| {
        let mut borrow = g.borrow_mut();
        let Some(game) = borrow.as_mut() else { return };
        if !game.active {
            return;
        }
        if game.current_stage() != HugStage::StarCatch {
            return;
        }
        game.stars_caught += 1;
        game.current_stage().pulse_sound();
        native_apis::vibrate_tap();
        let star_id = dom::get_attr(&star, "data-star-id").unwrap_or_default();
        let _ = star.class_list().add_1("hug-star--caught");
        dom::with_buf(|buf| {
            let _ = write!(buf, "[data-star-id=\"{star_id}\"]");
            confetti::float_emoji(buf, "\u{2728}");
        });
        dom::set_timeout_once(400, move || {
            star.remove();
        });
        dom::fmt_text("[data-hug-counter]", |buf| {
            let _ = write!(buf, "{} / 8 stars", game.stars_caught);
        });
        if game.stars_caught == 4 {
            show_bubble();
        }
        if game.stars_caught >= 8 {
            if let Some(sparkle) = get_sparkle() {
                sparkle.set_text_content(Some("\u{2728}"));
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
        if !game.active {
            return;
        }
        let stage = game.current_stage();
        if stage.is_hold() {
            game.hold_start = Some(utils::now_epoch_ms());
            start_hold_meter(stage);
        }
    });
}
fn on_hold_end() {
    GAME.with(|g| {
        let mut borrow = g.borrow_mut();
        let Some(game) = borrow.as_mut() else { return };
        if !game.active {
            return;
        }
        game.hold_start = None;
        if let Some(meter) = dom::query("[data-hug-meter]") {
            dom::set_attr(&meter, "style", "width: 0%");
        }
        game.motion_points.clear();
    });
}
fn on_pointer_move(pe: PointerEvent, state: Rc<RefCell<AppState>>) {
    if pe.buttons() == 0 {
        return;
    }
    GAME.with(|g| {
        let mut borrow = g.borrow_mut();
        let Some(game) = borrow.as_mut() else { return };
        if !game.active {
            return;
        }
        let x = f64::from(pe.client_x());
        let y = f64::from(pe.client_y());
        let stage = game.current_stage();
        match stage {
            HugStage::BellyRub | HugStage::SpinDance | HugStage::MagicSpell => {
                game.motion_points.push((x, y));
                if game.motion_points.len() < 20 {
                    return;
                }
                if detect_circle(&game.motion_points) {
                    let count = match stage {
                        HugStage::SpinDance => {
                            game.spin_count += 1;
                            game.spin_count
                        }
                        _ => {
                            game.circle_count += 1;
                            game.circle_count
                        }
                    };
                    game.motion_points.clear();
                    game.current_stage().pulse_sound();
                    native_apis::vibrate_tap();
                    match stage {
                        HugStage::BellyRub => {
                            if let Some(sparkle) = get_sparkle() {
                                animations::jelly_wobble(&sparkle);
                            }
                            confetti::float_emoji("[data-hug-belly]", "\u{1F49C}");
                        }
                        HugStage::SpinDance => {
                            if let Some(sparkle) = get_sparkle() {
                                let _ = sparkle.class_list().add_1("hug-sparkle--spin");
                                animations::jelly_wobble(&sparkle);
                            }
                            sparkle_float("\u{1F300}");
                        }
                        HugStage::MagicSpell => {
                            if let Some(sparkle) = get_sparkle() {
                                let emoji = match count {
                                    1 => "\u{2728}",
                                    2 => "\u{1FA84}",
                                    _ => "\u{1F31F}",
                                };
                                sparkle.set_text_content(Some(emoji));
                                animations::bounce(&sparkle);
                            }
                            sparkle_float("\u{2728}");
                        }
                        _ => {}
                    }
                    let label = match stage {
                        HugStage::SpinDance => "spins",
                        HugStage::MagicSpell => "spells",
                        _ => "circles",
                    };
                    dom::fmt_text("[data-hug-counter]", |buf| {
                        let _ = write!(buf, "{count} / 3 {label}");
                    });
                    if count == 2 {
                        show_bubble();
                    }
                    if count >= 3 {
                        if stage == HugStage::BellyRub {
                            if let Some(sparkle) = get_sparkle() {
                                sparkle.set_text_content(Some("\u{1F618}"));
                            }
                        }
                        complete_stage(game, state.clone());
                    }
                }
                if game.motion_points.len() > 10 {
                    game.motion_points.drain(0..game.motion_points.len() - 10);
                }
            }
            HugStage::GentleRock => {
                let Some(sparkle) = dom::query("[data-hug-sparkle]") else {
                    return;
                };
                let rect = sparkle.get_bounding_client_rect();
                let center_x = rect.left() + rect.width() / 2.0;
                let new_direction = if x < center_x - 30.0 {
                    -1
                } else {
                    i8::from(x > center_x + 30.0)
                };
                if new_direction != 0
                    && new_direction != game.rock_direction
                    && game.rock_direction != 0
                {
                    game.rock_count += 1;
                    game.current_stage().pulse_sound();
                    native_apis::vibrate_tap();
                    let tilt = if new_direction == -1 { -15.0 } else { 15.0 };
                    dom::with_buf(|buf| {
                        let _ = write!(buf, "transform: rotate({tilt}deg)");
                        dom::set_attr(&sparkle, "style", buf);
                    });
                    sparkle_float("\u{1F49C}");
                    if game.rock_count == 4 {
                        show_bubble();
                    }
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
fn detect_circle(points: &[(f64, f64)]) -> bool {
    if points.len() < 12 {
        return false;
    }
    let n = points.len() as f64;
    let cx: f64 = points.iter().map(|p| p.0).sum::<f64>() / n;
    let cy: f64 = points.iter().map(|p| p.1).sum::<f64>() / n;
    let mut total_angle: f64 = 0.0;
    for i in 1..points.len() {
        let (x0, y0) = (points[i - 1].0 - cx, points[i - 1].1 - cy);
        let (x1, y1) = (points[i].0 - cx, points[i].1 - cy);
        let dot = x0 * x1 + y0 * y1;
        let cross = x0 * y1 - y0 * x1;
        let angle = cross.atan2(dot);
        total_angle += angle;
    }
    total_angle.abs() > std::f64::consts::PI * 1.4
}
fn start_hold_meter(stage: HugStage) {
    let target_ms = match stage {
        HugStage::BigHug => 3000.0,
        HugStage::SleepyLullaby => 3000.0,
        HugStage::GentleRock => 4000.0,
        _ => return,
    };
    let bubble_shown = std::cell::Cell::new(false);
    let cb = Closure::<dyn FnMut()>::new(move || {
        let result = GAME.with(|g| {
            let Ok(borrow) = g.try_borrow() else {
                return (true, false);
            };
            let Some(game) = borrow.as_ref() else {
                return (true, false);
            };
            if !game.active {
                return (true, false);
            }
            let Some(start) = game.hold_start else {
                return (true, false);
            };
            let elapsed = utils::now_epoch_ms() - start;
            let pct = (elapsed / target_ms * 100.0).min(100.0);
            if let Some(meter) = dom::query("[data-hug-meter]") {
                dom::with_buf(|buf| {
                    if pct > 75.0 {
                        let _ = write!(
                            buf,
                            "width: {}%; background: var(--gradient-rainbow)",
                            pct as u32
                        );
                    } else {
                        let _ = write!(buf, "width: {}%", pct as u32);
                    }
                    dom::set_attr(&meter, "style", buf);
                });
            }
            if pct > 50.0 && !bubble_shown.get() {
                bubble_shown.set(true);
                if let Some(b) = dom::query("[data-hug-bubble]") {
                    let _ = b.class_list().remove_1("hug-text-bubble--hidden");
                }
            }
            (false, elapsed >= target_ms)
        });
        let (should_stop, completed) = result;
        if should_stop {
            GAME.with(|g| {
                if let Some(game) = g.borrow_mut().as_mut() {
                    if let Some(id) = game.hold_interval_id.take() {
                        dom::window().clear_interval_with_handle(id);
                    }
                }
            });
            return;
        }
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
    let interval_id = dom::window()
        .set_interval_with_callback_and_timeout_and_arguments_0(cb.as_ref().unchecked_ref(), 100)
        .unwrap_or(0);
    dom::pin_closure_to_arena("__hug_hold_closure", cb.as_ref().unchecked_ref());
    cb.forget();
    GAME.with(|g| {
        if let Some(game) = g.borrow_mut().as_mut() {
            game.hold_interval_id = Some(interval_id);
        }
    });
}
fn show_bubble() {
    if let Some(bubble) = dom::query("[data-hug-bubble]") {
        let _ = bubble.class_list().remove_1("hug-text-bubble--hidden");
        let _ = bubble.class_list().add_1("hug-text-bubble--visible");
    }
}
fn complete_stage(game: &mut HugState, state: Rc<RefCell<AppState>>) {
    let stage = game.current_stage();
    let mask = 1u16 << stage.id();
    if game.stages_seen_mask & mask != 0 {
        return;
    }
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
    game.stages_seen_mask |= 1 << stage.id();
    if let Some(id) = game.hold_interval_id.take() {
        dom::window().clear_interval_with_handle(id);
    }
    stage.complete_sound();
    native_apis::vibrate_success();
    let sparkle = get_sparkle();
    if let Some(sparkle) = sparkle {
        sparkle.set_text_content(Some(stage.reaction_emoji()));
        animations::bounce(&sparkle);
    }
    let total = crate::state::with_state_mut(|s| {
        s.hearts_total += theme::HEARTS_HUG_PER_STAGE;
        s.hearts_today += theme::HEARTS_HUG_PER_STAGE;
        s.hearts_total
    });
    ui::update_heart_counter(total);
    sparkle_float("\u{1F49C}");
    let dot_idx = game.stages_completed - 1;
    if let Some(dot) = dom::query_data("hug-dot", &dot_idx.to_string()) {
        dot.set_text_content(Some("\u{1F49C}"));
        dom::set_attr(&dot, "class", "hug-dot hug-dot--done hug-dot--pop");
        animations::bounce(&dot);
    }
    match game.stages_completed {
        1 | 3 => synth_audio::chime(),
        2 | 4 => synth_audio::sparkle(),
        _ => synth_audio::fanfare(),
    }
    let is_final = game.stage_index + 1 >= game.stages.len();
    if is_final {
        game.active = false;
        let s = state;
        let mask = game.stages_seen_mask;
        game.celebration_timeout = Some(dom::set_timeout_cancelable(1200, move || {
            trigger_grand_finale(s, mask);
        }));
    } else {
        game.stage_index += 1;
        let next_stage = game.stages[game.stage_index];
        game.celebration_timeout = Some(dom::set_timeout_cancelable(1500, move || {
            render_stage(next_stage);
        }));
        if let Some(sparkle) = get_sparkle() {
            let _ = sparkle.class_list().add_1("hug-sparkle--dance");
            sparkle.set_text_content(Some("\u{1F60D}"));
        }
        let phrases = ["Good job!", "So sweet!", "Amazing!", "You're the best!"];
        let phrase = phrases[(game.stages_completed as usize).saturating_sub(1) % phrases.len()];
        if let Some(inst) = dom::query("[data-hug-instruction]") {
            inst.set_text_content(Some(phrase));
            let _ = inst.class_list().add_1("hug-instruction--celebration");
        }
    }
}
fn trigger_grand_finale(state: Rc<RefCell<AppState>>, stages_seen_mask: u16) {
    let Some((arena, doc)) = games::clear_game_arena() else {
        return;
    };
    let Some(finale) = render::create_el_with_class(&doc, "div", "hug-finale") else {
        return;
    };
    dom::set_attr(&finale, "style", "background: var(--gradient-magic)");
    let Some(sparkle) = render::text_el_with_data(
        &doc,
        "div",
        "hug-sparkle hug-sparkle--hero hug-sparkle--finale-spin",
        "\u{1F984}",
        "data-hug-finale-sparkle",
    ) else {
        return;
    };
    let Some(msg) = render::text_el(
        &doc,
        "div",
        "hug-finale-text",
        "You're the BEST friend ever!",
    ) else {
        return;
    };
    let Some(dots) = render::create_el_with_class(&doc, "div", "hug-finale-dots") else {
        return;
    };
    for _ in 0..theme::HUG_STAGES_PER_GAME {
        render::append_text(
            &doc,
            &dots,
            "span",
            "hug-dot hug-dot--done hug-dot--pulse",
            "\u{1F49C}",
        );
    }
    let _ = finale.append_child(&sparkle);
    let _ = finale.append_child(&msg);
    let _ = finale.append_child(&dots);
    let _ = arena.append_child(&finale);
    synth_audio::fanfare();
    confetti::burst_party();
    confetti::burst_hearts();
    native_apis::vibrate_celebration();
    speech::celebrate("You're the best friend ever!");
    {
        let s = state;
        let cb = move || {
            confetti::burst_unicorn();
            synth_audio::rainbow_burst();
            GAME.with(|g| {
                if let Some(game) = g.borrow_mut().as_mut() {
                    let s_clone = s.clone();
                    game.celebration_timeout = Some(dom::set_timeout_cancelable(1500, move || {
                        show_hug_end(s_clone, stages_seen_mask);
                    }));
                }
            });
        };
        GAME.with(|g| {
            if let Some(game) = g.borrow_mut().as_mut() {
                game.celebration_timeout = Some(dom::set_timeout_cancelable(2500, cb));
            }
        });
    }
}
fn show_hug_end(state: Rc<RefCell<AppState>>, stages_seen_mask: u16) {
    let Some((arena, _doc)) = games::clear_game_arena() else {
        return;
    };
    let hearts_earned = theme::HEARTS_HUG_PER_STAGE * theme::HUG_STAGES_PER_GAME as u32;
    games::save_game_score(
        "hug-save",
        "hug",
        u64::from(hearts_earned),
        theme::HUG_STAGES_PER_GAME as u64,
        0,
        0,
    );
    let unique_seen = stages_seen_mask.count_ones();
    let completions = {
        let mut s = state.borrow_mut();
        s.games_played_today += 1;
        s.hug_completions += 1;
        s.hug_unique_stages_seen = s.hug_unique_stages_seen.max(unique_seen);
        s.hug_completions
    };
    weekly_goals::record_game_played(hearts_earned);
    let Some((screen, title, stats)) = games::build_end_screen() else {
        return;
    };
    title.set_text_content(Some("\u{1F49C} Sparkle Loves You! \u{1F49C}"));
    games::append_hearts_line(&stats, hearts_earned);
    let total_types = theme::HUG_TOTAL_STAGE_TYPES;
    dom::with_buf(|buf| {
        if unique_seen as usize >= total_types {
            let _ = write!(
                buf,
                "\u{1F31F} Best Friend! All {total_types} interactions discovered!"
            );
        } else {
            let _ = write!(
                buf,
                "\u{1F50E} {unique_seen}/{total_types} interactions discovered"
            );
        }
        games::append_stat_line(&stats, "", buf);
    });
    dom::with_buf(|buf| {
        let _ = write!(buf, "\u{1F917} Hug sessions: {completions}");
        games::append_stat_line(&stats, "", buf);
    });
    games::finish_end_screen(&screen, &stats, &arena, "hug");
    let sig = GAME.with(|g| g.borrow().as_ref().map(|game| game.abort.signal()));
    let s = state;
    games::bind_end_buttons(
        sig.as_ref(),
        move || {
            cleanup();
            show_mood_picker(s.clone());
        },
        || {
            cleanup();
            games::return_to_menu();
        },
    );
}

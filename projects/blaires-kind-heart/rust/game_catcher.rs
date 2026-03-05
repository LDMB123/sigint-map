use crate::{
    browser_apis, confetti, dom, games, native_apis, render, speech, state::AppState, synth_audio,
    theme, ui, weekly_goals,
};
use std::cell::RefCell;
use std::fmt::Write;
use std::rc::Rc;
use wasm_bindgen::prelude::*;
use web_sys::{Element, Event};
type RafClosure = Rc<RefCell<Option<Closure<dyn FnMut(f64)>>>>;
#[derive(Clone, Copy, PartialEq)]
enum CatcherTheme {
    Classic,
    GardenParty,
    SweetTreats,
    StarryNight,
}
struct CatcherThemeData {
    name: &'static str,
    catch_items: &'static [&'static str],
    hazard: &'static str,
    bg_gradient: &'static str,
    picker_emoji: &'static str,
}
impl CatcherTheme {
    const fn data(self) -> &'static CatcherThemeData {
        match self {
            Self::Classic => &THEME_CLASSIC,
            Self::GardenParty => &THEME_GARDEN,
            Self::SweetTreats => &THEME_SWEETS,
            Self::StarryNight => &THEME_STARRY,
        }
    }
    fn name(self) -> &'static str {
        self.data().name
    }
    fn picker_emoji(self) -> &'static str {
        self.data().picker_emoji
    }
    const fn attr(self) -> &'static str {
        match self {
            Self::Classic => "classic",
            Self::GardenParty => "garden",
            Self::SweetTreats => "sweets",
            Self::StarryNight => "starry",
        }
    }
}
const THEME_CLASSIC: CatcherThemeData = CatcherThemeData {
    name: "Classic",
    catch_items: &["\u{1F496}", "\u{2B50}", "\u{1F984}"],
    hazard: "\u{1F327}",
    bg_gradient: "linear-gradient(180deg, #87CEEB 0%, #B0E0FF 100%)",
    picker_emoji: "\u{1F496}",
};
const THEME_GARDEN: CatcherThemeData = CatcherThemeData {
    name: "Garden Party",
    catch_items: &["\u{1F33A}", "\u{1F98B}", "\u{1F41E}"],
    hazard: "\u{1F4A7}",
    bg_gradient: "linear-gradient(180deg, #90EE90 0%, #228B22 100%)",
    picker_emoji: "\u{1F33A}",
};
const THEME_SWEETS: CatcherThemeData = CatcherThemeData {
    name: "Sweet Treats",
    catch_items: &["\u{1F9C1}", "\u{1F36A}", "\u{1F366}"],
    hazard: "\u{1F966}",
    bg_gradient: "linear-gradient(180deg, #FFB6C1 0%, #FF69B4 100%)",
    picker_emoji: "\u{1F9C1}",
};
const THEME_STARRY: CatcherThemeData = CatcherThemeData {
    name: "Starry Night",
    catch_items: &["\u{1F319}", "\u{1F320}", "\u{1FA90}"],
    hazard: "\u{2604}",
    bg_gradient: "linear-gradient(180deg, #1a0033 0%, #2d1b69 100%)",
    picker_emoji: "\u{1F319}",
};
#[derive(Clone, Copy, PartialEq)]
enum ItemKind {
    Heart,
    Star,
    Unicorn,
    RainCloud,
    GoldenHeart,
    ShieldBubble,
    Magnet,
    RainbowStar,
    TimeFreeze,
    StarShower,
    SizeBoost,
}
impl ItemKind {
    const fn emoji(self) -> &'static str {
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
    const fn base_points(self) -> u32 {
        match self {
            Self::Heart => 1,
            Self::Star => 2,
            Self::Unicorn => 5,
            Self::RainbowStar => 10,
            Self::GoldenHeart
            | Self::ShieldBubble
            | Self::Magnet
            | Self::TimeFreeze
            | Self::StarShower
            | Self::SizeBoost => 1,
            Self::RainCloud => 0,
        }
    }
    const fn kind_attr(self) -> &'static str {
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
    const fn is_power_up(self) -> bool {
        matches!(
            self,
            Self::GoldenHeart
                | Self::ShieldBubble
                | Self::Magnet
                | Self::RainbowStar
                | Self::TimeFreeze
                | Self::StarShower
                | Self::SizeBoost
        )
    }
    fn themed_emoji(self, theme: CatcherTheme) -> &'static str {
        let data = theme.data();
        match self {
            Self::Heart => data.catch_items[0],
            Self::Star => data.catch_items[1],
            Self::Unicorn => data.catch_items[2],
            Self::RainCloud => data.hazard,
            _ => self.emoji(),
        }
    }
}
#[derive(Default)]
struct PowerUpState {
    golden_until_ms: f64,
    shield_until_ms: f64,
    magnet_until_ms: f64,
    freeze_until_ms: f64,
    size_until_ms: f64,
}
impl PowerUpState {
    fn is_golden(&self, now: f64) -> bool {
        now < self.golden_until_ms
    }
    fn is_magnet(&self, now: f64) -> bool {
        now < self.magnet_until_ms
    }
    fn is_freeze(&self, now: f64) -> bool {
        now < self.freeze_until_ms
    }
}
struct CatcherState {
    score: u32,
    level: u32,
    lives: u32,
    combo_chain: u32,
    combo_best: u32,
    last_catch_ms: f64,
    active: bool,
    raf_id: Option<i32>,
    spawn_accumulator_ms: f64,
    state: Rc<RefCell<AppState>>,
    abort: browser_apis::AbortHandle,
    power_ups: PowerUpState,
    start_time_ms: f64,
    theme: CatcherTheme,
    play_area: Element,
    falling_items: Vec<FallingItemState>,
}

struct FallingItemState {
    element: Element,
    kind: ItemKind,
    y: f64,
    left: f64,
    speed_mult: f64,
    wobble_start: f64,
}
thread_local! {
    static GAME: RefCell<Option<CatcherState>> = const { RefCell::new(None) };
    static PICKER_ABORT: RefCell<Option<browser_apis::AbortHandle>> = const { RefCell::new(None) };
}
fn show_theme_picker(state: Rc<RefCell<AppState>>) {
    let Some(picker) = games::setup_picker_with_abort(&PICKER_ABORT, "\u{1F496} Choose a Theme!")
    else {
        return;
    };
    let arena = picker.arena;
    let buttons = picker.buttons;
    let doc = picker.doc;
    for theme in [
        CatcherTheme::Classic,
        CatcherTheme::GardenParty,
        CatcherTheme::SweetTreats,
        CatcherTheme::StarryNight,
    ] {
        let Some(btn) = dom::with_buf(|buf| {
            let _ = write!(buf, "{} {}", theme.picker_emoji(), theme.name());
            render::create_button(&doc, "game-card game-card--catcher", buf)
        }) else {
            continue;
        };
        dom::set_attr(&btn, "data-catcher-theme", theme.attr());
        let _ = buttons.append_child(&btn);
    }
    let state_click = state;
    games::bind_picker_selection(&arena, &picker.signal, "[data-catcher-theme]", move |btn| {
        games::clear_picker_abort(&PICKER_ABORT);
        let theme = match dom::get_attr(&btn, "data-catcher-theme")
            .unwrap_or_default()
            .as_str()
        {
            "garden" => CatcherTheme::GardenParty,
            "sweets" => CatcherTheme::SweetTreats,
            "starry" => CatcherTheme::StarryNight,
            _ => CatcherTheme::Classic,
        };
        start_with_theme(state_click.clone(), theme);
    });
    games::store_picker_abort(&PICKER_ABORT, picker.abort);
}
pub fn start(state: Rc<RefCell<AppState>>) {
    show_theme_picker(state);
}
fn start_with_theme(state: Rc<RefCell<AppState>>, theme: CatcherTheme) {
    games::clear_picker_abort(&PICKER_ABORT);
    let Some((arena, doc)) = games::clear_game_arena() else {
        return;
    };
    let Some(container) = render::create_el_with_class(&doc, "div", "catcher-container") else {
        return;
    };
    dom::with_buf(|buf| {
        let _ = write!(buf, "background: {};", theme.data().bg_gradient);
        dom::set_attr(&container, "style", buf);
    });
    let Some(hud) = render::create_el_with_class(&doc, "div", "catcher-hud") else {
        return;
    };
    let Some(lives_el) = render::text_el_with_data(
        &doc,
        "span",
        "catcher-lives",
        &theme.data().catch_items[0].repeat(theme::CATCHER_STARTING_LIVES as usize),
        "data-catcher-lives",
    ) else {
        return;
    };
    dom::set_attr(&lives_el, "aria-label", "Lives");
    let Some(score_el) = render::text_el_with_data(
        &doc,
        "span",
        "catcher-score",
        "\u{2B50} 0",
        "data-catcher-score",
    ) else {
        return;
    };
    dom::set_attr(&score_el, "aria-live", "polite");
    let Some(level_el) =
        render::text_el_with_data(&doc, "span", "catcher-level", "Level 1", "data-catcher-level")
    else {
        return;
    };
    let Some(combo_el) =
        render::create_el_with_data(&doc, "span", "catcher-combo", "data-catcher-combo")
    else {
        return;
    };
    dom::set_attr(&combo_el, "hidden", "");
    let Some(powerup_el) = render::create_el_with_data(
        &doc,
        "span",
        "catcher-powerup-indicator",
        "data-catcher-powerup",
    ) else {
        return;
    };
    dom::set_attr(&powerup_el, "hidden", "");
    for child in [&lives_el, &score_el, &level_el, &combo_el, &powerup_el] {
        let _ = hud.append_child(child);
    }
    let Some(play_area) =
        render::create_el_with_data(&doc, "div", "catcher-play-area", "data-catcher-area")
    else {
        return;
    };
    let Some(start_msg) = render::text_el_with_data(
        &doc,
        "div",
        "catcher-start-msg",
        "Tap to Start! \u{1F496}",
        "data-catcher-start",
    ) else {
        return;
    };
    let _ = container.append_child(&hud);
    let _ = container.append_child(&play_area);
    let _ = container.append_child(&start_msg);
    let _ = arena.append_child(&container);
    let Some(abort) = browser_apis::new_abort_handle() else {
        return;
    };
    let signal = abort.signal();
    if let Some(start_el) = dom::query("[data-catcher-start]") {
        let signal_inner = signal.clone();
        dom::on_with_signal(
            start_el.unchecked_ref(),
            "click",
            &signal,
            move |_: Event| {
                begin_round(&signal_inner);
            },
        );
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
            spawn_accumulator_ms: 0.0,
            state: state.clone(),
            abort,
            power_ups: PowerUpState::default(),
            start_time_ms: 0.0,
            theme,
            play_area: play_area.clone(),
            falling_items: Vec::new(),
        });
    });
}
fn begin_round(signal: &web_sys::AbortSignal) {
    if let Some(msg) = dom::query("[data-catcher-start]") {
        dom::set_attr(&msg, "hidden", "");
    }
    let now = browser_apis::now_ms();
    GAME.with(|g| {
        if let Some(game) = g.borrow_mut().as_mut() {
            game.active = true;
            game.start_time_ms = now;
            game.spawn_accumulator_ms = 0.0;
        }
    });
    bind_catch_clicks(signal);
    run_game_loop();
    synth_audio::whoosh();
}
fn bind_catch_clicks(signal: &web_sys::AbortSignal) {
    if let Some(area) = dom::query("[data-catcher-area]") {
        dom::on_with_signal(
            area.unchecked_ref(),
            "click",
            signal,
            move |event: Event| {
                let Some(el) = dom::event_target_element(&event) else {
                    return;
                };
                if let Some(item) = dom::closest(&el, ".catcher-item") {
                    catch_item(&item);
                }
            },
        );
    }
}
fn catch_item(item: &Element) {
    let kind = GAME.with(|g| {
        let mut borrow = g.borrow_mut();
        let game = borrow.as_mut()?;
        let idx = game
            .falling_items
            .iter()
            .position(|entry| js_sys::Object::is(entry.element.as_ref(), item.as_ref()))?;
        Some(game.falling_items.swap_remove(idx).kind)
    });
    let Some(kind) = kind else {
        return;
    };
    let now = browser_apis::now_ms();
    let item_rect = item.get_bounding_client_rect();
    let float_x = item_rect.left() + item_rect.width() / 2.0;
    let float_y = item_rect.top();
    let _ = item.class_list().add_1("catcher-item--caught");
    dom::delayed_remove(item.clone(), 300);
    GAME.with(|g| {
        let mut borrow = g.borrow_mut();
        let Some(game) = borrow.as_mut() else { return };
        if kind == ItemKind::RainCloud {
            handle_cloud_hit(game);
            return;
        }
        match kind {
            ItemKind::GoldenHeart => {
                game.power_ups.golden_until_ms =
                    now + f64::from(theme::CATCHER_POWERUP_DURATION_MS);
                show_powerup_indicator("\u{1F49B} 2x!", theme::CATCHER_POWERUP_DURATION_MS);
                synth_audio::dreamy();
                native_apis::vibrate_success();
            }
            ItemKind::ShieldBubble => {
                game.power_ups.shield_until_ms =
                    now + theme::CATCHER_SHIELD_DURATION_MS;
                show_powerup_indicator(
                    "\u{1F6E1} Shield!",
                    theme::CATCHER_SHIELD_DURATION_MS as u32,
                );
                synth_audio::dreamy();
                native_apis::vibrate_tap();
            }
            ItemKind::Magnet => {
                game.power_ups.magnet_until_ms = now + theme::CATCHER_MAGNET_DURATION_MS;
                show_powerup_indicator(
                    "\u{1FA84} Magnet!",
                    theme::CATCHER_MAGNET_DURATION_MS as u32,
                );
                synth_audio::dreamy();
                native_apis::vibrate_tap();
            }
            ItemKind::RainbowStar => {
                game.combo_chain = game.combo_chain.max(5);
                synth_audio::rainbow_burst();
                confetti::burst_unicorn();
                native_apis::vibrate_success();
            }
            ItemKind::TimeFreeze => {
                game.power_ups.freeze_until_ms = now + theme::CATCHER_FREEZE_DURATION_MS;
                show_powerup_indicator(
                    "\u{23F3} Slow Time!",
                    theme::CATCHER_FREEZE_DURATION_MS as u32,
                );
                synth_audio::chime();
                native_apis::vibrate_tap();
            }
            ItemKind::StarShower => {
                for _ in 0..5 {
                    spawn_item_immediate(ItemKind::Star);
                }
                show_powerup_indicator(
                    "\u{2728} Star Shower!",
                    theme::CATCHER_STAR_SHOWER_OVERLAY_MS as u32,
                );
                synth_audio::sparkle();
                confetti::burst_stars();
                native_apis::vibrate_success();
            }
            ItemKind::SizeBoost => {
                game.power_ups.size_until_ms = now + theme::CATCHER_SIZE_BOOST_DURATION_MS;
                show_powerup_indicator(
                    "\u{1F50D} Big Items!",
                    theme::CATCHER_SIZE_BOOST_DURATION_MS as u32,
                );
                synth_audio::magic_wand();
                native_apis::vibrate_tap();
                if let Some(area) = dom::query("[data-catcher-area]") {
                    let _ = area.class_list().add_1("catcher-area--size-boost");
                    dom::delayed_class_remove(
                        area,
                        "catcher-area--size-boost",
                        theme::CATCHER_SIZE_BOOST_DURATION_MS as i32,
                    );
                }
            }
            _ => {}
        }
        let mut points = kind.base_points();
        if game.power_ups.is_golden(now) {
            points *= 2;
        }
        if now - game.last_catch_ms < theme::CATCHER_COMBO_WINDOW_MS {
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
        match kind {
            ItemKind::Heart | ItemKind::GoldenHeart => synth_audio::chime(),
            ItemKind::Star => synth_audio::sparkle(),
            ItemKind::Unicorn => synth_audio::magic_wand(),
            ItemKind::RainbowStar => {}
            _ => synth_audio::tap(),
        }
        native_apis::vibrate_tap();
        if game.combo_chain == 3 {
            synth_audio::sparkle();
        } else if game.combo_chain >= 5 {
            synth_audio::rainbow_burst();
        }
        let old_level = game.level;
        let new_level = 1 + game.score / theme::CATCHER_POINTS_PER_LEVEL;
        if new_level > old_level {
            game.level = new_level;
            trigger_level_up(new_level, game);
        }
        dom::fmt_text("[data-catcher-score]", |buf| {
            let _ = write!(buf, "\u{2B50} {}", game.score);
        });
        dom::fmt_text("[data-catcher-level]", |buf| {
            let _ = write!(buf, "Level {}", game.level);
        });
        update_combo_display(game.combo_chain);
        spawn_score_float(float_x, float_y, points, multiplier > 1);
        if kind == ItemKind::Unicorn {
            confetti::burst_unicorn();
        } else if game.combo_chain >= 5 {
            confetti::burst_stars();
        }
    });
}
fn handle_cloud_hit(game: &mut CatcherState) {
    let now = browser_apis::now_ms();
    if now < game.power_ups.shield_until_ms {
        game.power_ups.shield_until_ms = 0.0;
        dom::hide("[data-catcher-powerup]");
        synth_audio::whoosh();
        spawn_catcher_overlay("catcher-shield-pop", "\u{1F6E1}\u{1F4A5}", 600);
        return;
    }
    game.lives = game.lives.saturating_sub(1);
    game.combo_chain = 0;
    update_lives_display(game.lives);
    update_combo_display(0);
    synth_audio::whoops();
    native_apis::vibrate_tap();
    trigger_screen_shake();
    if game.lives == 0 {
        game.active = false;
        wasm_bindgen_futures::spawn_local(async {
            end_round();
        });
    }
}
const fn combo_multiplier(chain: u32) -> u32 {
    match chain {
        0..=2 => 1,
        3..=4 => 2,
        5..=7 => 3,
        _ => 5,
    }
}
fn run_game_loop() {
    start_gravity_loop();
}
fn build_catcher_item(
    area: &Element,
    kind: ItemKind,
    catcher_theme: CatcherTheme,
) -> Option<FallingItemState> {
    let doc = dom::document();
    let class = format!("catcher-item catcher-item--{}", kind.kind_attr());
    let item = render::text_el(&doc, "div", &class, kind.themed_emoji(catcher_theme))?;
    dom::set_attr(&item, "data-item-kind", kind.kind_attr());
    let x = 5.0 + js_sys::Math::random() * 80.0;
    let rot = (js_sys::Math::random() * 30.0 - 15.0) as i32;
    let speed_mult = match kind {
        ItemKind::RainCloud => 0.7 + js_sys::Math::random() * 0.2,
        ItemKind::SizeBoost | ItemKind::TimeFreeze | ItemKind::StarShower | ItemKind::Magnet => {
            1.3 + js_sys::Math::random() * 0.4
        }
        _ => 0.9 + js_sys::Math::random() * 0.4,
    };
    dom::with_buf(|buf| {
        let _ = write!(buf, "left:{x:.0}%;top:-10%;--wobble-start:{rot}deg");
        dom::set_attr(&item, "style", buf);
    });
    if kind.is_power_up() {
        let _ = item.class_list().add_1("catcher-item--powerup");
    }
    let _ = area.append_child(&item);
    Some(FallingItemState {
        element: item,
        kind,
        y: 0.0,
        left: x,
        speed_mult,
        wobble_start: f64::from(rot),
    })
}
fn spawn_falling_item(level: u32) {
    GAME.with(|g| {
        let mut borrow = g.borrow_mut();
        let Some(game) = borrow.as_mut() else {
            return;
        };
        if game.falling_items.len() >= theme::CATCHER_MAX_ITEMS {
            return;
        }
        let kind = pick_item_kind(level, js_sys::Math::random());
        let Some(item_state) = build_catcher_item(&game.play_area, kind, game.theme) else {
            return;
        };
        game.falling_items.push(item_state);
    });
}
fn spawn_item_immediate(kind: ItemKind) {
    GAME.with(|g| {
        let mut borrow = g.borrow_mut();
        let Some(game) = borrow.as_mut() else {
            return;
        };
        if game.falling_items.len() >= theme::CATCHER_MAX_ITEMS {
            return;
        }
        if let Some(item_state) = build_catcher_item(&game.play_area, kind, game.theme) {
            game.falling_items.push(item_state);
        }
    });
}
fn pick_item_kind(level: u32, rand: f64) -> ItemKind {
    match level {
        1 => {
            if rand < 0.85 {
                ItemKind::Heart
            } else {
                ItemKind::RainCloud
            }
        }
        2 => {
            if rand < 0.50 {
                ItemKind::Heart
            } else if rand < 0.75 {
                ItemKind::Star
            } else if rand < 0.80 {
                ItemKind::ShieldBubble
            } else {
                ItemKind::RainCloud
            }
        }
        3 => {
            if rand < 0.35 {
                ItemKind::Heart
            } else if rand < 0.60 {
                ItemKind::Star
            } else if rand < 0.75 {
                ItemKind::Unicorn
            } else if rand < 0.78 {
                ItemKind::GoldenHeart
            } else if rand < 0.82 {
                ItemKind::ShieldBubble
            } else {
                ItemKind::RainCloud
            }
        }
        4 => {
            if rand < 0.30 {
                ItemKind::Heart
            } else if rand < 0.50 {
                ItemKind::Star
            } else if rand < 0.65 {
                ItemKind::Unicorn
            } else if rand < 0.68 {
                ItemKind::GoldenHeart
            } else if rand < 0.71 {
                ItemKind::ShieldBubble
            } else if rand < 0.74 {
                ItemKind::Magnet
            } else {
                ItemKind::RainCloud
            }
        }
        _ => {
            if rand < 0.20 {
                ItemKind::Heart
            } else if rand < 0.38 {
                ItemKind::Star
            } else if rand < 0.52 {
                ItemKind::Unicorn
            } else if rand < 0.55 {
                ItemKind::GoldenHeart
            } else if rand < 0.58 {
                ItemKind::ShieldBubble
            } else if rand < 0.61 {
                ItemKind::Magnet
            } else if rand < 0.63 {
                ItemKind::RainbowStar
            } else if rand < 0.65 {
                ItemKind::TimeFreeze
            } else if rand < 0.67 {
                ItemKind::StarShower
            } else if rand < 0.69 {
                ItemKind::SizeBoost
            } else {
                ItemKind::RainCloud
            }
        }
    }
}
fn start_gravity_loop() {
    use std::cell::Cell;

    let last_ts: Rc<Cell<f64>> = Rc::new(Cell::new(0.0));

    let closure_rc: RafClosure = Rc::new(RefCell::new(None));
    let closure_for_raf = closure_rc.clone();
    let last_ts_inner = last_ts.clone();

    *closure_rc.borrow_mut() = Some(Closure::new(move |timestamp: f64| {
        if !GAME.with(|g| g.borrow().as_ref().is_some_and(|game| game.active)) {
            return; // loop stopped; cleanup() cancelled the RAF
        }
        if !browser_apis::is_document_visible() {
            // Prevent hidden-tab delta spikes and keep physics/spawn suspended.
            last_ts_inner.set(0.0);
            schedule_next_gravity_frame(&closure_for_raf);
            return;
        }

        let prev_ts = last_ts_inner.get();
        let delta_ms = if prev_ts == 0.0 {
            16.0
        } else {
            (timestamp - prev_ts).min(50.0)
        };
        last_ts_inner.set(timestamp);

        let (spawn_count, spawn_level) = GAME.with(|g| {
            let mut borrow = g.borrow_mut();
            let Some(game) = borrow.as_mut() else {
                return (0usize, 1u32);
            };
            let mut spawn_count = 0usize;
            let spawn_interval_ms = f64::from(theme::CATCHER_SPAWN_INTERVAL_MS);
            game.spawn_accumulator_ms += delta_ms;
            while game.spawn_accumulator_ms >= spawn_interval_ms {
                game.spawn_accumulator_ms -= spawn_interval_ms;
                spawn_count += 1;
            }
            (spawn_count, game.level)
        });
        for _ in 0..spawn_count {
            spawn_falling_item(spawn_level);
        }
        apply_gravity(delta_ms);

        // Schedule next frame
        schedule_next_gravity_frame(&closure_for_raf);
    }));

    // Kick off the first frame
    if let Some(cb) = closure_rc.borrow().as_ref() {
        let func: &js_sys::Function = cb.as_ref().unchecked_ref();
        dom::pin_closure_to_arena("__catcher_gravity_closure", func);
        schedule_gravity_frame(cb);
    }

    std::mem::forget(closure_rc);
}

fn schedule_next_gravity_frame(closure: &RafClosure) {
    if let Some(cb) = closure.borrow().as_ref() {
        schedule_gravity_frame(cb);
    }
}

fn schedule_gravity_frame(cb: &Closure<dyn FnMut(f64)>) {
    let win = dom::window();
    if let Ok(id) = win.request_animation_frame(cb.as_ref().unchecked_ref()) {
        GAME.with(|g| {
            if let Some(game) = g.borrow_mut().as_mut() {
                game.raf_id = Some(id);
            }
        });
    }
}

fn apply_gravity(dt_ms: f64) {
    let now_ms = browser_apis::now_ms();
    GAME.with(|g| {
        let mut borrow = g.borrow_mut();
        let Some(game) = borrow.as_mut() else {
            return;
        };
        if !game.active {
            return;
        }

        let is_magnet = game.power_ups.is_magnet(now_ms);
        let is_freeze = game.power_ups.is_freeze(now_ms);
        let speed_per_sec = theme::CATCHER_BASE_SPEED * 1.0
            + (f64::from(game.level) - 1.0) * theme::CATCHER_SPEED_INCREASE;
        let freeze_mult = if is_freeze { 0.5 } else { 1.0 };
        let speed = speed_per_sec * dt_ms / 50.0 * freeze_mult;

        let mut idx = 0usize;
        while idx < game.falling_items.len() {
            let mut remove_item = false;
            {
                let item = &mut game.falling_items[idx];
                item.y += speed * item.speed_mult;
                if item.y > 110.0 {
                    remove_item = true;
                } else {
                    let sway_amount = (item.y * 0.1 + item.wobble_start).sin() * 0.5;
                    let left_final = if is_magnet {
                        let drift = (50.0 - item.left) * 0.02 * (dt_ms / 16.0);
                        item.left += drift;
                        item.left
                    } else {
                        item.left + sway_amount
                    };
                    let jiggle_amp = 15.0 * (item.speed_mult - 0.7).max(0.0);
                    let jiggle_rot = (now_ms / 150.0 + item.y).sin() * jiggle_amp;

                    if let Some(html) = item.element.dyn_ref::<web_sys::HtmlElement>() {
                        let style = html.style();
                        dom::with_buf(|buf| {
                            let _ = write!(buf, "{left_final:.1}%");
                            let _ = style.set_property(wasm_bindgen::intern("left"), buf);
                        });
                        dom::with_buf(|buf| {
                            let _ = write!(buf, "{:.1}%", item.y);
                            let _ = style.set_property(wasm_bindgen::intern("top"), buf);
                        });
                        dom::with_buf(|buf| {
                            let _ = write!(buf, "rotate({jiggle_rot:.1}deg)");
                            let _ = style.set_property(wasm_bindgen::intern("transform"), buf);
                        });
                    }
                }
            }

            if remove_item {
                let removed = game.falling_items.swap_remove(idx);
                removed.element.remove();
                continue;
            }

            idx += 1;
        }
    });
}
fn trigger_level_up(new_level: u32, game: &mut CatcherState) {
    synth_audio::level_up();
    confetti::burst_stars();
    native_apis::vibrate_success();
    if new_level.is_multiple_of(theme::CATCHER_BONUS_LIFE_INTERVAL)
        && game.lives < theme::CATCHER_MAX_LIVES
    {
        game.lives += 1;
        update_lives_display(game.lives);
        spawn_catcher_overlay("catcher-bonus-life", "\u{1F496} +1 Life!", 1200);
    }
    dom::with_buf(|buf| {
        let _ = write!(buf, "\u{2B50} Level {new_level}! \u{2B50}");
        spawn_catcher_overlay("catcher-level-up", buf, 1200);
    });
    dom::with_buf(|buf| {
        let _ = write!(buf, "Level {new_level}!");
        speech::speak(buf);
    });
}
fn end_round() {
    let Some((score, level, combo_best, state, start_ms)) = GAME.with(|g| {
        let borrow = g.borrow();
        let game = borrow.as_ref()?;
        Some((
            game.score,
            game.level,
            game.combo_best,
            game.state.clone(),
            game.start_time_ms,
        ))
    }) else {
        return;
    };
    GAME.with(|g| {
        if let Some(game) = g.borrow_mut().as_mut() {
            game.falling_items.clear();
        }
    });
    if let Some(area) = dom::query("[data-catcher-area]") {
        dom::safe_set_inner_html(&area, "");
    }
    let hearts_earned = score / theme::HEARTS_PER_CATCHER_POINT;
    let duration_ms = (browser_apis::now_ms() - start_ms) as u64;
    let end_signal = GAME.with(|g| g.borrow().as_ref().map(|game| game.abort.signal()));
    let (prev_high, _prev_level, prev_combo) = {
        let s = state.borrow();
        (
            s.catcher_high_score,
            s.catcher_best_level,
            s.catcher_best_combo,
        )
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
    games::save_game_score(
        "catcher-save",
        "catcher",
        u64::from(score),
        u64::from(level),
        u64::from(combo_best),
        duration_ms,
    );
    let total = {
        let mut s = state.borrow_mut();
        if hearts_earned > 0 {
            s.hearts_total += hearts_earned;
            s.hearts_today += hearts_earned;
        }
        s.games_played_today += 1;
        if score > s.catcher_high_score {
            s.catcher_high_score = score;
        }
        if level > s.catcher_best_level {
            s.catcher_best_level = level;
        }
        if combo_best > s.catcher_best_combo {
            s.catcher_best_combo = combo_best;
        }
        s.hearts_total
    };
    ui::update_heart_counter(total);
    weekly_goals::record_game_played(hearts_earned);
    synth_audio::fanfare();
    if is_new_high {
        confetti::burst_party();
    } else {
        confetti::burst_stars();
    }
    if is_new_high {
        speech::speak("New record! You're a star!");
    } else if score > 0 {
        speech::speak("Great job!");
    } else {
        speech::speak("Good try!");
    }
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
    let EndScreenParams {
        score,
        level,
        combo_best,
        hearts,
        is_new_high,
        is_new_combo,
        prev_high,
        state,
        signal,
    } = params;
    let Some((arena, _doc)) = games::clear_game_arena() else {
        return;
    };
    let Some((screen, title, stats)) = games::build_end_screen() else {
        return;
    };
    games::set_end_title(&title, is_new_high, "\u{1F389} Great Catching! \u{1F389}");
    dom::with_buf(|buf| {
        let _ = write!(buf, "\u{2B50} Score: {score}");
        games::append_stat_line(&stats, "", buf);
    });
    games::append_beat_record_line(&stats, is_new_high, score, prev_high);
    dom::with_buf(|buf| {
        let _ = write!(buf, "\u{1F525} Level reached: {level}");
        games::append_stat_line(&stats, "", buf);
    });
    if combo_best > 1 {
        let mult = combo_multiplier(combo_best);
        let cls = if is_new_combo {
            "game-end-stat--new-record"
        } else {
            ""
        };
        dom::with_buf(|buf| {
            let _ = write!(buf, "\u{26A1} Best combo: {combo_best}x (x{mult})");
            games::append_stat_line(&stats, cls, buf);
        });
    }
    games::append_hearts_line(&stats, hearts);
    games::finish_end_screen(&screen, &stats, &arena, "catcher");
    let s = state;
    games::bind_end_buttons(
        signal,
        move || {
            cleanup();
            start(s.clone());
        },
        || {
            cleanup();
            games::return_to_menu();
        },
    );
}
fn update_lives_display(lives: u32) {
    let heart_emoji = GAME.with(|g| {
        g.borrow()
            .as_ref()
            .map_or("\u{1F496}", |game| game.theme.data().catch_items[0])
    });
    let hearts = heart_emoji.repeat(lives as usize);
    let empties =
        "\u{1F5A4}".repeat((theme::CATCHER_STARTING_LIVES.saturating_sub(lives)) as usize);
    if let Some(el) = dom::query("[data-catcher-lives]") {
        dom::with_buf(|buf| {
            buf.push_str(&hearts);
            buf.push_str(&empties);
            el.set_text_content(Some(buf));
        });
        let _ = el.class_list().add_1("catcher-lives--lost");
        dom::delayed_class_remove(el, "catcher-lives--lost", 400);
    }
}
fn update_combo_display(chain: u32) {
    if let Some(el) = dom::query("[data-catcher-combo]") {
        if chain >= 2 {
            let mult = combo_multiplier(chain);
            dom::with_buf(|buf| {
                let _ = write!(buf, "\u{26A1}{chain}x (x{mult})");
                el.set_text_content(Some(buf));
            });
            dom::remove_attr(&el, "hidden");
            let scale_class = if chain >= 8 {
                "catcher-combo--x5"
            } else if chain >= 5 {
                "catcher-combo--x3"
            } else {
                "catcher-combo--x2"
            };
            dom::with_buf(|buf| {
                let _ = write!(buf, "catcher-combo {scale_class}");
                dom::set_attr(&el, "class", buf);
            });
        } else {
            dom::set_attr(&el, "hidden", "");
            dom::set_attr(&el, "class", "catcher-combo");
        }
    }
}
fn show_powerup_indicator(text: &str, duration_ms: u32) {
    if let Some(el) = dom::query("[data-catcher-powerup]") {
        el.set_text_content(Some(text));
        dom::remove_attr(&el, "hidden");
        dom::delayed_set_attr(el, "hidden", "", duration_ms as i32);
    }
}
fn spawn_score_float(x: f64, y: f64, points: u32, is_boosted: bool) {
    let doc = dom::document();
    let Some(float) = render::create_el_with_class(&doc, "div", "catcher-score-float") else {
        return;
    };
    dom::with_buf(|buf| {
        if is_boosted {
            let _ = write!(buf, "+{points} \u{2728}");
        } else {
            let _ = write!(buf, "+{points}");
        }
        float.set_text_content(Some(buf));
    });
    dom::with_buf(|buf| {
        let _ = write!(buf, "left:{x:.0}px;top:{y:.0}px;position:fixed;");
        dom::set_attr(&float, "style", buf);
    });
    if is_boosted {
        let _ = float.class_list().add_1("catcher-score-float--boosted");
    }
    let _ = dom::body().append_child(&float);
    dom::delayed_remove(float, 800);
}
fn trigger_screen_shake() {
    if let Some(container) = dom::query(".catcher-container") {
        let _ = container.class_list().add_1("catcher-container--shake");
        dom::delayed_class_remove(container, "catcher-container--shake", 300);
    }
}
fn spawn_catcher_overlay(class: &str, text: &str, ms: i32) {
    if let Some(area) = dom::query("[data-catcher-area]") {
        let doc = dom::document();
        if let Some(el) = render::append_text(&doc, &area, "div", class, text) {
            dom::delayed_remove(el, ms);
        }
    }
}
pub fn cleanup() {
    games::clear_picker_abort(&PICKER_ABORT);
    GAME.with(|g| {
        if let Some(game) = g.borrow_mut().as_mut() {
            game.active = false;
            let window = dom::window();
            if let Some(id) = game.raf_id.take() {
                window.cancel_animation_frame(id).ok();
            }
        }
        *g.borrow_mut() = None;
    });
}

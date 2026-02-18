//! Unicorn Adventure — canvas game mini-game.
//! Guide Blaire the unicorn to collect forest friends and earn hearts.
//! Full RAF game loop, touch/pointer + keyboard input, ambient soundscape.

use std::cell::RefCell;
use std::rc::Rc;
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;
use web_sys::{
    CanvasRenderingContext2d, Event, HtmlCanvasElement, HtmlImageElement,
    KeyboardEvent, PointerEvent,
};

use crate::{
    browser_apis, confetti, dom, games, native_apis, render,
    speech, state::AppState, synth_audio, ui, weekly_goals,
    game_unicorn_audio, game_unicorn_friends, game_unicorn_sparkles,
    game_unicorn_unicorn,
};

// ── Input state ──────────────────────────────────────────────────

struct InputState {
    active: bool,
    x: f64,
    y: f64,
}

// ── Game state ───────────────────────────────────────────────────

/// Game session duration in seconds.
const SESSION_SECONDS: f64 = 60.0;

// Struct fields accessed via pattern matching and direct field access
// Kept for game state management and future performance monitoring
#[allow(dead_code)]
struct UnicornGameState {
    canvas: HtmlCanvasElement,
    ctx: CanvasRenderingContext2d,
    canvas_w: f64,
    canvas_h: f64,
    dpr: f64,

    unicorn: game_unicorn_unicorn::Unicorn,
    friends: game_unicorn_friends::FriendManager,
    sparkles: game_unicorn_sparkles::SparkleSystem,
    input: InputState,

    reduced_motion: bool,
    active: bool,
    raf_id: Option<i32>,
    last_timestamp: f64,
    idle_timer: f64,     // time since last input (for idle states)

    /// Countdown timer — game ends when this hits 0.
    time_remaining: f64,
    /// Hearts earned this session (for end screen).
    session_hearts: u32,

    state: Rc<RefCell<AppState>>,
    abort: browser_apis::AbortHandle,

    // Background image
    bg_image: Option<HtmlImageElement>,
    bg_loaded: bool,

    // Ambient flowers — tap-spawned decorative elements
    flowers: Vec<FlowerDecor>,

    // Active biome
    biome: &'static game_unicorn_friends::Biome,
}

struct FlowerDecor {
    x: f64,
    y: f64,
    life: f64,
    scale: f64,
    emoji: &'static str,
}

const FLOWER_EMOJIS: &[&str] = &[
    "\u{1F33C}", // sunflower
    "\u{1F33A}", // hibiscus
    "\u{1F337}", // tulip
    "\u{1F338}", // cherry blossom
    "\u{1F33B}", // sunflower 2
    "\u{2728}",  // sparkles
];

type RafClosure = Closure<dyn FnMut(f64)>;

thread_local! {
    static GAME: RefCell<Option<UnicornGameState>> = const { RefCell::new(None) };
    static RAF_CLOSURE: RefCell<Option<RafClosure>> = const { RefCell::new(None) };
    static PICKER_ABORT: RefCell<Option<browser_apis::AbortHandle>> = const { RefCell::new(None) };
}

// ── Public API ───────────────────────────────────────────────────

pub fn init() {
    // Audio init is done once, stays alive between games
    game_unicorn_audio::init();
}

pub fn start(state: Rc<RefCell<AppState>>) {
    show_biome_picker(state);
}

fn show_biome_picker(state: Rc<RefCell<AppState>>) {
    // Clean up any previous picker listener
    PICKER_ABORT.with(|p| { p.borrow_mut().take(); });

    let Some(arena) = dom::query("#game-arena") else { return };
    let doc = dom::document();
    dom::safe_set_inner_html(&arena, "");

    let container = render::create_el_with_class(&doc, "div", "memory-select");

    let title = render::create_el_with_class(&doc, "div", "memory-select-title");
    title.set_text_content(Some("\u{1F984} Choose Your World!"));

    let buttons = render::create_el_with_class(&doc, "div", "memory-select-buttons");

    for biome in game_unicorn_friends::ALL_BIOMES {
        let label = format!("{} {}", biome.picker_emoji, biome.name);
        let btn = render::create_button(&doc, "game-card game-card--unicorn", &label);
        let _ = btn.set_attribute("data-unicorn-biome", biome.name);
        let _ = buttons.append_child(&btn);
    }

    let _ = container.append_child(&title);
    let _ = container.append_child(&buttons);
    let _ = arena.append_child(&container);

    // Bind click handler via event delegation on arena
    let abort = browser_apis::new_abort_handle();
    let signal = abort.signal();
    let s = state.clone();

    dom::on_with_signal(
        arena.unchecked_ref(),
        "click",
        &signal,
        move |event: Event| {
            let Some(target) = event.target() else { return };
            let el: &web_sys::Element = target.unchecked_ref();
            let Some(btn) = el.closest("[data-unicorn-biome]").ok().flatten() else { return };
            let Some(biome_name) = btn.get_attribute("data-unicorn-biome") else { return };

            // Find the biome by name
            let Some(biome) = game_unicorn_friends::ALL_BIOMES.iter().find(|b| b.name == biome_name) else { return };

            synth_audio::tap();
            native_apis::vibrate_tap();

            start_with_biome(s.clone(), biome);
        },
    );

    PICKER_ABORT.with(|p| { *p.borrow_mut() = Some(abort); });
}

fn start_with_biome(state: Rc<RefCell<AppState>>, biome: &'static game_unicorn_friends::Biome) {
    // Clean up picker listener
    PICKER_ABORT.with(|p| { p.borrow_mut().take(); });

    let Some(arena) = dom::query("#game-arena") else { return };
    let doc = dom::document();
    dom::safe_set_inner_html(&arena, "");

    // Container
    let container = render::create_el_with_class(&doc, "div", "unicorn-container");

    // HUD: back button, score, timer, mute
    let hud = render::create_el_with_class(&doc, "div", "unicorn-hud");

    // Back button (leftmost)
    let back_btn = render::create_button(&doc, "unicorn-back", "\u{2190}");
    let _ = back_btn.set_attribute("data-unicorn-back", "");
    let _ = back_btn.set_attribute("aria-label", "Back to games menu");
    let _ = hud.append_child(&back_btn);

    // Score
    let score_el = render::create_el_with_class(&doc, "span", "unicorn-score");
    score_el.set_text_content(Some("\u{1F496} 0"));
    let _ = score_el.set_attribute("data-unicorn-score", "");
    let _ = score_el.set_attribute("aria-live", "polite");
    let _ = hud.append_child(&score_el);

    // Timer
    let timer_el = render::create_el_with_class(&doc, "span", "unicorn-timer");
    timer_el.set_text_content(Some(&format_time(SESSION_SECONDS)));
    let _ = timer_el.set_attribute("data-unicorn-timer", "");
    let _ = hud.append_child(&timer_el);

    // Mute button (rightmost)
    let mute_btn = render::create_button(&doc, "unicorn-mute", "\u{1F50A}");
    let _ = mute_btn.set_attribute("data-unicorn-mute", "");
    let _ = mute_btn.set_attribute("aria-label", "Toggle sound");
    let _ = hud.append_child(&mute_btn);

    // Canvas
    let Ok(canvas_el) = doc.create_element("canvas") else {
        web_sys::console::error_1(&"Failed to create canvas element for unicorn game".into());
        dom::toast("Sorry, unicorn game couldn't start. Try again?");
        games::return_to_menu();
        return;
    };
    let _ = canvas_el.set_attribute("class", "unicorn-canvas");
    let _ = canvas_el.set_attribute("data-unicorn-canvas", "");
    let canvas: HtmlCanvasElement = canvas_el.unchecked_into();

    let _ = container.append_child(&hud);
    let _ = container.append_child(&canvas);
    let _ = arena.append_child(&container);

    // Size canvas to container
    let dpr = dom::window().device_pixel_ratio();
    let rect = container.get_bounding_client_rect();
    let css_w = rect.width();
    let css_h = rect.height() - 48.0; // minus HUD height
    canvas.set_width((css_w * dpr) as u32);
    canvas.set_height((css_h * dpr) as u32);
    let canvas_style: &web_sys::HtmlElement = canvas.unchecked_ref();
    let _ = canvas_style.style().set_property("width", &format!("{css_w}px"));
    let _ = canvas_style.style().set_property("height", &format!("{css_h}px"));

    let ctx: CanvasRenderingContext2d = match canvas.get_context("2d") {
        Ok(Some(context)) => context.unchecked_into(),
        _ => {
            web_sys::console::error_1(&"Failed to get 2d context for unicorn canvas".into());
            dom::toast("Sorry, unicorn game couldn't start. Try again?");
            games::return_to_menu();
            return;
        }
    };
    ctx.scale(dpr, dpr).ok();

    let reduced_motion = dom::prefers_reduced_motion();

    // Unicorn
    let mut unicorn = game_unicorn_unicorn::Unicorn::new();
    unicorn.center_in(css_w, css_h);

    // Friends — use biome's friend types
    let friends = game_unicorn_friends::FriendManager::new(biome.friends);

    // Sparkles
    let sparkles = game_unicorn_sparkles::SparkleSystem::new();

    // Background image
    let bg_image = HtmlImageElement::new().ok();
    if let Some(ref img) = bg_image {
        img.set_src("game-sprites/forest_background.png");
    }

    // Input + events
    let abort = browser_apis::new_abort_handle();
    let signal = abort.signal();

    bind_pointer_events(&canvas, &signal, css_w, css_h);
    bind_keyboard_events(&signal);
    bind_mute_button(&signal);
    bind_back_button(&signal, state.clone());

    // Start ambient soundscape with biome frequency
    game_unicorn_audio::start_ambient(biome.ambient_freq);

    // Announcements
    if let Some(arena_el) = dom::query("#game-arena") {
        let announce = render::create_el_with_class(&doc, "div", "sr-only");
        let _ = announce.set_attribute("data-unicorn-announce", "");
        let _ = announce.set_attribute("aria-live", "polite");
        let _ = announce.set_attribute("aria-atomic", "true");
        let _ = arena_el.append_child(&announce);
    }

    // Store game state
    GAME.with(|g| {
        *g.borrow_mut() = Some(UnicornGameState {
            canvas,
            ctx,
            canvas_w: css_w,
            canvas_h: css_h,
            dpr,
            unicorn,
            friends,
            sparkles,
            input: InputState { active: false, x: 0.0, y: 0.0 },
            reduced_motion,
            active: true,
            raf_id: None,
            last_timestamp: 0.0,
            idle_timer: 0.0,
            time_remaining: SESSION_SECONDS,
            session_hearts: 0,
            state: state.clone(),
            abort,
            bg_image,
            bg_loaded: false,
            flowers: Vec::new(),
            biome,
        });
    });

    // Start game loop
    start_game_loop();

    synth_audio::magic_wand();
    speech::speak("Unicorn Adventure!");
}

// ── Game Loop ────────────────────────────────────────────────────

fn start_game_loop() {
    // Store the RAF closure in a thread-local so it can re-schedule itself.
    let closure = Closure::<dyn FnMut(f64)>::new(move |timestamp: f64| {
        let should_continue = GAME.with(|g| {
            let mut borrow = g.borrow_mut();
            let Some(game) = borrow.as_mut() else { return false };
            if !game.active { return false; }

            // Delta time
            let dt = if game.last_timestamp == 0.0 {
                0.016 // ~60fps first frame
            } else {
                ((timestamp - game.last_timestamp) / 1000.0).min(0.1) // cap at 100ms
            };
            game.last_timestamp = timestamp;

            // Update
            update_game(game, dt);

            // Draw
            draw_game(game);

            true
        });

        if should_continue {
            RAF_CLOSURE.with(|rc| {
                if let Some(ref closure) = *rc.borrow() {
                    let id = native_apis::request_animation_frame(closure);
                    GAME.with(|g| {
                        if let Some(game) = g.borrow_mut().as_mut() {
                            game.raf_id = Some(id);
                        }
                    });
                }
            });
        }
    });

    // Schedule the first frame
    let id = native_apis::request_animation_frame(&closure);
    GAME.with(|g| {
        if let Some(game) = g.borrow_mut().as_mut() {
            game.raf_id = Some(id);
        }
    });

    // Store the closure in thread-local so it stays alive and the callback can access it
    RAF_CLOSURE.with(|rc| *rc.borrow_mut() = Some(closure));
}

// ── Update ───────────────────────────────────────────────────────

fn update_game(game: &mut UnicornGameState, dt: f64) {
    // Timer countdown
    game.time_remaining -= dt;
    if game.time_remaining <= 0.0 {
        game.time_remaining = 0.0;
        game.active = false;
        end_game(game);
        return;
    }
    update_timer(game.time_remaining);

    // Input -> unicorn target
    if game.input.active {
        game.unicorn.target_x = game.input.x;
        game.unicorn.target_y = game.input.y;
        game.idle_timer = 0.0;
    } else {
        game.idle_timer += dt;
    }

    // Idle state machine
    if game.idle_timer > 8.0 {
        game.unicorn.idle_state = game_unicorn_unicorn::IdleState::Sitting;
    } else if game.idle_timer > 4.0 {
        game.unicorn.idle_state = game_unicorn_unicorn::IdleState::Looking;
    } else {
        game.unicorn.idle_state = game_unicorn_unicorn::IdleState::Active;
    }

    // Update unicorn
    let moved = game.unicorn.update(dt, game.reduced_motion);
    if moved {
        game_unicorn_audio::step();
    }

    // Spawn sparkles while moving
    if moved && !game.reduced_motion && js_sys::Math::random() < 0.3 {
        game.sparkles.spawn(
            game.unicorn.x + (js_sys::Math::random() * 40.0 - 20.0),
            game.unicorn.y + (js_sys::Math::random() * 40.0 + 20.0),
        );
    }

    // Update friends — returns collected type IDs
    let collected = game.friends.update(
        dt,
        game.unicorn.x,
        game.unicorn.y,
        game.canvas_w,
        game.canvas_h,
        game.reduced_motion,
    );

    // Handle collections
    for type_id in &collected {
        game_unicorn_audio::collect_friend(type_id);
        native_apis::vibrate_tap();

        // Sparkle burst at collection point
        if !game.reduced_motion {
            for _ in 0..5 {
                game.sparkles.spawn(
                    game.unicorn.x + (js_sys::Math::random() * 60.0 - 30.0),
                    game.unicorn.y + (js_sys::Math::random() * 60.0 - 30.0),
                );
            }
        }

        // Audio spawn sound for next friend
        synth_audio::sparkle();

        // Combo detection
        let combo = game_unicorn_audio::combo_count();
        if combo >= 2 {
            synth_audio::level_up();
        }

        // Hearts integration
        {
            let mut s = game.state.borrow_mut();
            s.hearts_total += 1;
            s.hearts_today += 1;
            s.unicorn_friends_collected += 1;
        }
        game.session_hearts += 1;
        let total = game.state.borrow().hearts_total;
        ui::update_heart_counter(total);
        weekly_goals::increment_progress("hearts", 1);

        // Update score display
        update_score(game.friends.score);

        // Announce for screen readers
        announce(&format!("{} collected! {} friends total", type_id, game.friends.total_collected));
    }

    // Milestone every 5 friends
    if !collected.is_empty() && game.friends.total_collected.is_multiple_of(5) && game.friends.total_collected > 0 {
        synth_audio::fanfare();
        confetti::burst_stars();
        native_apis::vibrate_success();
        speech::speak(&format!("{} friends!", game.friends.total_collected));
    }

    // Update sparkles
    game.sparkles.update(dt);

    // Update flowers
    for flower in &mut game.flowers {
        flower.life -= dt * 0.5;
        flower.scale = (flower.scale + dt * 4.0).min(1.0);
    }
    game.flowers.retain(|f| f.life > 0.0);
}

// ── Draw ─────────────────────────────────────────────────────────

fn draw_game(game: &mut UnicornGameState) {
    let ctx = &game.ctx;
    let w = game.canvas_w;
    let h = game.canvas_h;

    // Check background loaded
    if !game.bg_loaded {
        if let Some(ref img) = game.bg_image {
            if img.complete() && img.natural_width() > 0 {
                game.bg_loaded = true;
            }
        }
    }

    // Clear
    ctx.clear_rect(0.0, 0.0, w, h);

    // Background
    if game.bg_loaded {
        if let Some(ref img) = game.bg_image {
            ctx.draw_image_with_html_image_element_and_dw_and_dh(
                img, 0.0, 0.0, w, h,
            ).ok();
        }
    } else {
        // Gradient fallback — uses biome colors
        let grad = ctx.create_linear_gradient(0.0, 0.0, 0.0, h);
        grad.add_color_stop(0.0, game.biome.bg_gradient.0).ok();
        grad.add_color_stop(0.6, game.biome.bg_gradient.1).ok();
        grad.add_color_stop(1.0, game.biome.bg_gradient.2).ok();
        ctx.set_fill_style_canvas_gradient(&grad);
        ctx.fill_rect(0.0, 0.0, w, h);
    }

    // Flowers (under friends/unicorn)
    for flower in &game.flowers {
        if flower.life <= 0.0 { continue; }
        ctx.save();
        ctx.set_global_alpha(flower.life.min(1.0));
        ctx.translate(flower.x, flower.y).ok();
        let s = flower.scale;
        ctx.scale(s, s).ok();
        ctx.set_font("28px serif");
        ctx.set_text_align("center");
        ctx.set_text_baseline("middle");
        ctx.fill_text(flower.emoji, 0.0, 0.0).ok();
        ctx.restore();
    }

    // Friends (behind unicorn)
    game.friends.draw(ctx, game.reduced_motion);

    // Unicorn
    game.unicorn.draw(ctx, game.reduced_motion);

    // Sparkles (on top)
    game.sparkles.draw(ctx);
}

// ── Input Binding ────────────────────────────────────────────────

fn bind_pointer_events(
    canvas: &HtmlCanvasElement,
    signal: &web_sys::AbortSignal,
    canvas_w: f64,
    canvas_h: f64,
) {
    // Pointer down
    {
        let cw = canvas_w;
        let ch = canvas_h;
        dom::on_pointer_with_signal(
            canvas.unchecked_ref(),
            "pointerdown",
            signal,
            move |e: PointerEvent| {
                let (x, y) = pointer_to_canvas(&e, cw, ch);
                GAME.with(|g| {
                    if let Some(game) = g.borrow_mut().as_mut() {
                        game.input.active = true;
                        game.input.x = x;
                        game.input.y = y;

                        // Tap on unicorn -> giggle
                        if game.unicorn.contains_point(x, y) {
                            game.unicorn.giggle();
                            synth_audio::giggle();
                            native_apis::vibrate_tap();
                        } else {
                            // Tap on ground -> flower
                            spawn_flower(game, x, y);
                        }
                    }
                });
            },
        );
    }

    // Pointer move
    {
        let cw = canvas_w;
        let ch = canvas_h;
        dom::on_pointer_with_signal(
            canvas.unchecked_ref(),
            "pointermove",
            signal,
            move |e: PointerEvent| {
                let (x, y) = pointer_to_canvas(&e, cw, ch);
                GAME.with(|g| {
                    if let Some(game) = g.borrow_mut().as_mut() {
                        if game.input.active {
                            game.input.x = x;
                            game.input.y = y;
                        }
                    }
                });
            },
        );
    }

    // Pointer up / cancel
    for event_name in &["pointerup", "pointercancel"] {
        dom::on_pointer_with_signal(
            canvas.unchecked_ref(),
            event_name,
            signal,
            move |_: PointerEvent| {
                GAME.with(|g| {
                    if let Some(game) = g.borrow_mut().as_mut() {
                        game.input.active = false;
                    }
                });
            },
        );
    }
}

fn pointer_to_canvas(e: &PointerEvent, canvas_w: f64, canvas_h: f64) -> (f64, f64) {
    // offsetX/Y gives coordinates relative to the element
    let x = (e.offset_x() as f64).clamp(0.0, canvas_w);
    let y = (e.offset_y() as f64).clamp(0.0, canvas_h);
    (x, y)
}

fn bind_keyboard_events(signal: &web_sys::AbortSignal) {
    let doc = dom::document();

    // Key down — dom::on_with_signal expects FnMut(Event), downcast inside
    dom::on_with_signal(
        doc.unchecked_ref(),
        "keydown",
        signal,
        move |event: Event| {
            let Some(e) = event.dyn_ref::<KeyboardEvent>() else { return };
            let key = e.key();
            let speed = 10.0; // pixels per keypress

            GAME.with(|g| {
                if let Some(game) = g.borrow_mut().as_mut() {
                    let (dx, dy) = match key.as_str() {
                        "ArrowUp" | "w" | "W" => (0.0, -speed),
                        "ArrowDown" | "s" | "S" => (0.0, speed),
                        "ArrowLeft" | "a" | "A" => (-speed, 0.0),
                        "ArrowRight" | "d" | "D" => (speed, 0.0),
                        " " => {
                            // Space = giggle
                            game.unicorn.giggle();
                            synth_audio::giggle();
                            (0.0, 0.0)
                        }
                        _ => return,
                    };

                    if dx != 0.0 || dy != 0.0 {
                        game.unicorn.target_x = (game.unicorn.target_x + dx).clamp(0.0, game.canvas_w);
                        game.unicorn.target_y = (game.unicorn.target_y + dy).clamp(0.0, game.canvas_h);
                        game.idle_timer = 0.0;
                        e.prevent_default(); // prevent page scroll
                    }
                }
            });
        },
    );
}

fn bind_mute_button(signal: &web_sys::AbortSignal) {
    if let Some(btn) = dom::query("[data-unicorn-mute]") {
        dom::on_with_signal(
            btn.unchecked_ref(),
            "click",
            signal,
            move |_: Event| {
                let is_muted = !game_unicorn_audio::is_muted_state();
                game_unicorn_audio::set_muted(is_muted);
                if let Some(el) = dom::query("[data-unicorn-mute]") {
                    el.set_text_content(Some(if is_muted { "\u{1F507}" } else { "\u{1F50A}" }));
                }
            },
        );
    }
}

fn spawn_flower(game: &mut UnicornGameState, x: f64, y: f64) {
    synth_audio::gentle();
    let idx = (js_sys::Math::random() * FLOWER_EMOJIS.len() as f64) as usize;
    let emoji = FLOWER_EMOJIS[idx.min(FLOWER_EMOJIS.len() - 1)];
    if game.flowers.len() < 20 {
        game.flowers.push(FlowerDecor {
            x, y, life: 3.0, scale: 0.0, emoji,
        });
    }
}

// ── HUD Updates ──────────────────────────────────────────────────

fn update_score(score: u32) {
    dom::set_text("[data-unicorn-score]", &format!("\u{1F496} {score}"));
}

fn update_timer(time_remaining: f64) {
    dom::set_text("[data-unicorn-timer]", &format_time(time_remaining));
}

fn format_time(seconds: f64) -> String {
    let secs = seconds.ceil().max(0.0) as u32;
    let m = secs / 60;
    let s = secs % 60;
    format!("{m}:{s:02}")
}

fn announce(text: &str) {
    if let Some(el) = dom::query("[data-unicorn-announce]") {
        el.set_text_content(Some(text));
    }
}

// ── Back Button ──────────────────────────────────────────────────

fn bind_back_button(signal: &web_sys::AbortSignal, _state: Rc<RefCell<AppState>>) {
    if let Some(btn) = dom::query("[data-unicorn-back]") {
        dom::on_with_signal(
            btn.unchecked_ref(),
            "click",
            signal,
            move |_: Event| {
                cleanup();
                games::return_to_menu();
            },
        );
    }
}

// ── End Game ─────────────────────────────────────────────────────

fn end_game(game: &mut UnicornGameState) {
    let score = game.friends.score;
    let friends_collected = game.friends.total_collected;
    let session_hearts = game.session_hearts;
    let state = game.state.clone();

    // Check / update high score
    let prev_high = state.borrow().unicorn_high_score;
    let is_new_high = score > prev_high;
    if is_new_high {
        state.borrow_mut().unicorn_high_score = score;
    }

    // Save score to database
    let duration_ms = (SESSION_SECONDS * 1000.0) as u64;
    games::save_game_score("unicorn-save", "unicorn", score as u64, friends_collected as u64, duration_ms);

    // Stop audio
    game_unicorn_audio::stop_ambient();

    // Celebration
    if is_new_high && score > 0 {
        synth_audio::fanfare();
        confetti::burst_stars();
        native_apis::vibrate_success();
    } else {
        synth_audio::chime();
    }

    speech::speak(&format!("{friends_collected} friends collected!"));

    // Show end screen (must happen after RAF stops)
    show_end_screen(score, friends_collected, session_hearts, is_new_high, prev_high, state);
}

fn show_end_screen(
    score: u32,
    friends_collected: u32,
    session_hearts: u32,
    is_new_high: bool,
    prev_high: u32,
    state: Rc<RefCell<AppState>>,
) {
    let Some(arena) = dom::query("#game-arena") else { return };
    let doc = dom::document();
    dom::safe_set_inner_html(&arena, "");

    let (screen, title, stats) = games::build_end_screen();

    // Title
    if is_new_high && score > 0 {
        title.set_text_content(Some("\u{1F389} NEW HIGH SCORE! \u{1F389}"));
        let _ = title.class_list().add_1("game-end-title--new-record");
    } else {
        title.set_text_content(Some("\u{1F389} Great Adventure! \u{1F389}"));
    }
    let _ = screen.append_child(&title);

    let score_line = render::create_el_with_class(&doc, "div", "game-end-stat");
    score_line.set_text_content(Some(&format!("\u{2B50} Score: {score}")));
    let _ = stats.append_child(&score_line);

    if is_new_high && prev_high > 0 {
        let beat_line = render::create_el_with_class(&doc, "div", "game-end-stat game-end-stat--beat");
        beat_line.set_text_content(Some(&format!("Beat your record by {}!", score - prev_high)));
        let _ = stats.append_child(&beat_line);
    }

    let friends_line = render::create_el_with_class(&doc, "div", "game-end-stat");
    friends_line.set_text_content(Some(&format!("\u{1F43E} Friends collected: {friends_collected}")));
    let _ = stats.append_child(&friends_line);

    let hearts_line = render::create_el_with_class(&doc, "div", "game-end-stat game-end-stat--hearts");
    hearts_line.set_text_content(Some(&format!("\u{1F49C} +{session_hearts} hearts earned!")));
    let _ = stats.append_child(&hearts_line);

    games::finish_end_screen(&screen, &stats, &arena, "unicorn");

    bind_end_screen_buttons(state);
}

fn bind_end_screen_buttons(state: Rc<RefCell<AppState>>) {
    let s = state.clone();
    games::bind_end_buttons(
        None,
        move || { cleanup(); show_biome_picker(s.clone()); },
        || { cleanup(); games::return_to_menu(); },
    );
}

// ── Cleanup ──────────────────────────────────────────────────────

pub fn cleanup() {
    PICKER_ABORT.with(|p| { p.borrow_mut().take(); });
    game_unicorn_audio::stop_ambient();
    game_unicorn_audio::cleanup();

    GAME.with(|g| {
        if let Some(game) = g.borrow_mut().as_mut() {
            game.active = false;
            if let Some(id) = game.raf_id.take() {
                native_apis::cancel_animation_frame(id);
            }
            game.abort.abort();
        }
        *g.borrow_mut() = None;
    });

    // Drop the RAF closure to free memory
    RAF_CLOSURE.with(|rc| *rc.borrow_mut() = None);
}

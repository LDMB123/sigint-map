use crate::{
    browser_apis, confetti, dom, game_unicorn_audio, game_unicorn_friends, game_unicorn_sparkles,
    game_unicorn_unicorn, games, native_apis, render, speech, state::AppState, synth_audio, ui,
    weekly_goals,
};
use std::cell::RefCell;
use std::fmt::Write;
use std::rc::Rc;
use wasm_bindgen::prelude::*;
use web_sys::{
    CanvasRenderingContext2d, Event, HtmlCanvasElement, HtmlImageElement, KeyboardEvent,
    PointerEvent,
};
struct InputState {
    active: bool,
    x: f64,
    y: f64,
}
const SESSION_SECONDS: f64 = 60.0;
struct UnicornGameState {
    ctx: CanvasRenderingContext2d,
    canvas_w: f64,
    canvas_h: f64,
    unicorn: game_unicorn_unicorn::Unicorn,
    friends: game_unicorn_friends::FriendManager,
    sparkles: game_unicorn_sparkles::SparkleSystem,
    input: InputState,
    reduced_motion: bool,
    active: bool,
    raf_id: Option<i32>,
    last_timestamp: f64,
    idle_timer: f64, // time since last input (for idle states)
    time_remaining: f64,
    session_hearts: u32,
    state: Rc<RefCell<AppState>>,
    abort: browser_apis::AbortHandle,
    bg_image: Option<HtmlImageElement>,
    bg_loaded: bool,
    flowers: Vec<FlowerDecor>,
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
    "\u{1F33C}",
    "\u{1F33A}",
    "\u{1F337}",
    "\u{1F338}",
    "\u{1F33B}",
    "\u{2728}",
];
type RafClosure = Closure<dyn FnMut(f64)>;
thread_local! { static GAME: RefCell<Option<UnicornGameState>> = const { RefCell::new(None) }; static RAF_CLOSURE: RefCell<Option<RafClosure>> = const { RefCell::new(None) }; static PICKER_ABORT: RefCell<Option<browser_apis::AbortHandle>> = const { RefCell::new(None) }; }
pub fn start(state: Rc<RefCell<AppState>>) {
    show_biome_picker(state);
}
fn show_biome_picker(state: Rc<RefCell<AppState>>) {
    PICKER_ABORT.with(|p| {
        p.borrow_mut().take();
    });
    let Some((arena, buttons)) = render::build_game_picker("\u{1F984} Choose Your World!") else {
        return;
    };
    let doc = dom::document();
    for biome in game_unicorn_friends::ALL_BIOMES {
        let Some(btn) = dom::with_buf(|buf| {
            let _ = write!(buf, "{} {}", biome.picker_emoji, biome.name);
            render::create_button(&doc, "game-card game-card--unicorn", buf)
        }) else {
            continue;
        };
        dom::set_attr(&btn, "data-unicorn-biome", biome.name);
        let _ = buttons.append_child(&btn);
    }
    let Some(abort) = browser_apis::new_abort_handle() else {
        return;
    };
    let signal = abort.signal();
    let s = state;
    dom::on_with_signal(
        arena.unchecked_ref(),
        "click",
        &signal,
        move |event: Event| {
            let Some(el) = dom::event_target_element(&event) else {
                return;
            };
            let Some(btn) = dom::closest(&el, "[data-unicorn-biome]") else {
                return;
            };
            let Some(biome_name) = dom::get_attr(&btn, "data-unicorn-biome") else {
                return;
            };
            let Some(biome) = game_unicorn_friends::ALL_BIOMES
                .iter()
                .find(|b| b.name == biome_name)
            else {
                return;
            };
            synth_audio::tap();
            native_apis::vibrate_tap();
            start_with_biome(s.clone(), biome);
        },
    );
    PICKER_ABORT.with(|p| {
        *p.borrow_mut() = Some(abort);
    });
}
fn start_with_biome(state: Rc<RefCell<AppState>>, biome: &'static game_unicorn_friends::Biome) {
    PICKER_ABORT.with(|p| {
        p.borrow_mut().take();
    });
    let Some((arena, doc)) = games::clear_game_arena() else {
        return;
    };
    let Some(container) = render::create_el_with_class(&doc, "div", "unicorn-container") else {
        return;
    };
    let Some(hud) = render::create_el_with_class(&doc, "div", "unicorn-hud") else {
        return;
    };
    let Some(back_btn) =
        render::create_button_with_data(&doc, "unicorn-back", "\u{2190}", "data-unicorn-back")
    else {
        return;
    };
    dom::set_attr(&back_btn, "aria-label", "Back to games menu");
    let _ = hud.append_child(&back_btn);
    let Some(score_el) = render::text_el_with_data(
        &doc,
        "span",
        "unicorn-score",
        "\u{1F496} 0",
        "data-unicorn-score",
    ) else {
        return;
    };
    dom::set_attr(&score_el, "aria-live", "polite");
    let _ = hud.append_child(&score_el);
    let Some(timer_el) = dom::with_buf(|buf| {
        let secs = SESSION_SECONDS.ceil().max(0.0) as u32;
        let _ = write!(buf, "{}:{:02}", secs / 60, secs % 60);
        render::text_el_with_data(&doc, "span", "unicorn-timer", buf, "data-unicorn-timer")
    }) else {
        return;
    };
    let _ = hud.append_child(&timer_el);
    let Some(mute_btn) =
        render::create_button_with_data(&doc, "unicorn-mute", "\u{1F50A}", "data-unicorn-mute")
    else {
        return;
    };
    dom::set_attr(&mute_btn, "aria-label", "Toggle sound");
    let _ = hud.append_child(&mute_btn);
    let Some(canvas_el) = games::create_canvas_or_bail(&doc, "unicorn") else {
        return;
    };
    dom::set_attr(&canvas_el, "class", "unicorn-canvas");
    dom::set_attr(&canvas_el, "data-unicorn-canvas", "");
    let canvas: HtmlCanvasElement = canvas_el.unchecked_into();
    let _ = container.append_child(&hud);
    let _ = container.append_child(&canvas);
    let _ = arena.append_child(&container);
    let dpr = dom::window().device_pixel_ratio();
    let rect = container.get_bounding_client_rect();
    let css_w = rect.width();
    let css_h = rect.height() - 48.0;
    canvas.set_width((css_w * dpr) as u32);
    canvas.set_height((css_h * dpr) as u32);
    let canvas_style: &web_sys::HtmlElement = canvas.unchecked_ref();
    dom::with_buf(|buf| {
        let _ = write!(buf, "{css_w}px");
        let _ = canvas_style.style().set_property("width", buf);
    });
    dom::with_buf(|buf| {
        let _ = write!(buf, "{css_h}px");
        let _ = canvas_style.style().set_property("height", buf);
    });
    let ctx: CanvasRenderingContext2d = match canvas.get_context("2d") {
        Ok(Some(context)) => context.unchecked_into(),
        _ => {
            dom::warn("Failed to get 2d context for unicorn canvas");
            dom::toast("Sorry, unicorn game couldn't start. Try again?");
            games::return_to_menu();
            return;
        }
    };
    ctx.scale(dpr, dpr).ok();
    let reduced_motion = dom::prefers_reduced_motion();
    let mut unicorn = game_unicorn_unicorn::Unicorn::new();
    unicorn.center_in(css_w, css_h);
    let friends = game_unicorn_friends::FriendManager::new(biome.friends);
    let sparkles = game_unicorn_sparkles::SparkleSystem::new();
    let bg_image = HtmlImageElement::new().ok();
    if let Some(ref img) = bg_image {
        img.set_src("game-sprites/forest_background.webp");
    }
    let Some(abort) = browser_apis::new_abort_handle() else {
        return;
    };
    let signal = abort.signal();
    bind_pointer_events(&canvas, &signal, css_w, css_h);
    bind_keyboard_events(&signal);
    bind_mute_button(&signal);
    bind_back_button(&signal);
    game_unicorn_audio::start_ambient(biome.ambient_freq);
    if let Some(arena_el) = dom::query("#game-arena") {
        if let Some(announce) = render::create_el_with_class(&doc, "div", "sr-only") {
            for (k, v) in [
                ("data-unicorn-announce", ""),
                ("aria-live", "polite"),
                ("aria-atomic", "true"),
            ] {
                dom::set_attr(&announce, k, v);
            }
            let _ = arena_el.append_child(&announce);
        }
    }
    GAME.with(|g| {
        *g.borrow_mut() = Some(UnicornGameState {
            ctx,
            canvas_w: css_w,
            canvas_h: css_h,
            unicorn,
            friends,
            sparkles,
            input: InputState {
                active: false,
                x: 0.0,
                y: 0.0,
            },
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
    start_game_loop();
    synth_audio::magic_wand();
    speech::speak("Unicorn Adventure!");
}
fn start_game_loop() {
    let closure = Closure::<dyn FnMut(f64)>::new(move |timestamp: f64| {
        let should_continue = GAME.with(|g| {
            let mut borrow = g.borrow_mut();
            let Some(game) = borrow.as_mut() else {
                return false;
            };
            if !game.active {
                return false;
            }
            let dt = if game.last_timestamp == 0.0 {
                0.016
            } else {
                ((timestamp - game.last_timestamp) / 1000.0).min(0.1)
            };
            game.last_timestamp = timestamp;
            update_game(game, dt);
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
    let id = native_apis::request_animation_frame(&closure);
    GAME.with(|g| {
        if let Some(game) = g.borrow_mut().as_mut() {
            game.raf_id = Some(id);
        }
    });
    RAF_CLOSURE.with(|rc| *rc.borrow_mut() = Some(closure));
}
fn update_game(game: &mut UnicornGameState, dt: f64) {
    game.time_remaining -= dt;
    if game.time_remaining <= 0.0 {
        game.time_remaining = 0.0;
        game.active = false;
        end_game(game);
        return;
    }
    update_timer_if_changed(game.time_remaining);

    if game.input.active {
        game.unicorn.target_x = game.input.x;
        game.unicorn.target_y = game.input.y;
        game.idle_timer = 0.0;
    } else {
        game.idle_timer += dt;
    }

    if game.idle_timer > 8.0 {
        game.unicorn.idle_state = game_unicorn_unicorn::IdleState::Sitting;
    } else if game.idle_timer > 4.0 {
        game.unicorn.idle_state = game_unicorn_unicorn::IdleState::Looking;
    } else {
        game.unicorn.idle_state = game_unicorn_unicorn::IdleState::Active;
    }

    let moved = game.unicorn.update(dt, game.reduced_motion);
    if moved {
        game_unicorn_audio::step();
        if game.unicorn.star_timer <= 0.0 {
            game.sparkles.spawn(game.unicorn.x, game.unicorn.y + 10.0);
            game.unicorn.star_timer = 0.1;
        }
    }

    let collected = game.friends.update(
        dt,
        game.unicorn.x,
        game.unicorn.y,
        game.canvas_w,
        game.canvas_h,
        game.reduced_motion,
    );

    for type_id in &collected {
        game_unicorn_audio::collect_friend(type_id);
        native_apis::vibrate_tap();
        if !game.reduced_motion {
            for _ in 0..5 {
                game.sparkles.spawn(
                    game.unicorn.x + (js_sys::Math::random() * 60.0 - 30.0),
                    game.unicorn.y + (js_sys::Math::random() * 60.0 - 30.0),
                );
            }
        }
        synth_audio::sparkle();
        if game_unicorn_audio::combo_count() >= 2 {
            synth_audio::level_up();
        }
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
        update_score(game.friends.score);
        if let Some(el) = dom::query("[data-unicorn-announce]") {
            dom::with_buf(|buf| {
                let _ = write!(
                    buf,
                    "{} collected! {} friends total",
                    type_id, game.friends.total_collected
                );
                el.set_text_content(Some(buf));
            });
        }
    }

    if !collected.is_empty()
        && game.friends.total_collected.is_multiple_of(5)
        && game.friends.total_collected > 0
    {
        synth_audio::fanfare();
        confetti::burst_stars();
        native_apis::vibrate_success();
        dom::with_buf(|buf| {
            let _ = write!(buf, "{} friends!", game.friends.total_collected);
            speech::speak(buf);
        });
    }

    game.sparkles.update(dt);
    for f in game.flowers.iter_mut() {
        f.life -= dt;
        f.scale = (f.scale + dt * 4.0).min(1.0);
    }
    game.flowers.retain(|f| f.life > 0.0);
}
fn draw_game(game: &mut UnicornGameState) {
    let ctx = &game.ctx;
    let w = game.canvas_w;
    let h = game.canvas_h;
    if !game.bg_loaded {
        if let Some(ref img) = game.bg_image {
            if img.complete() && img.natural_width() > 0 {
                game.bg_loaded = true;
            }
        }
    }
    ctx.clear_rect(0.0, 0.0, w, h);
    if game.bg_loaded {
        if let Some(ref img) = game.bg_image {
            ctx.draw_image_with_html_image_element_and_dw_and_dh(img, 0.0, 0.0, w, h)
                .ok();
        }
    } else {
        let grad = ctx.create_linear_gradient(0.0, 0.0, 0.0, h);
        grad.add_color_stop(0.0, game.biome.bg_gradient.0).ok();
        grad.add_color_stop(0.6, game.biome.bg_gradient.1).ok();
        grad.add_color_stop(1.0, game.biome.bg_gradient.2).ok();
        ctx.set_fill_style_canvas_gradient(&grad);
        ctx.fill_rect(0.0, 0.0, w, h);
    }
    for flower in &game.flowers {
        if flower.life <= 0.0 {
            continue;
        }
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
    game.friends.draw(ctx, game.reduced_motion);
    game.unicorn.draw(ctx, game.reduced_motion);
    game.sparkles.draw(ctx);
}
fn bind_pointer_events(
    canvas: &HtmlCanvasElement,
    signal: &web_sys::AbortSignal,
    canvas_w: f64,
    canvas_h: f64,
) {
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
                        if game.unicorn.contains_point(x, y) {
                            game.unicorn.dash();
                            synth_audio::magic_wand();
                            native_apis::vibrate_tap();
                            for _ in 0..15 {
                                game.sparkles.spawn(game.unicorn.x, game.unicorn.y);
                            }
                        } else {
                            spawn_flower(game, x, y);
                        }
                    }
                });
            },
        );
    }
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
    let x = f64::from(e.offset_x()).clamp(0.0, canvas_w);
    let y = f64::from(e.offset_y()).clamp(0.0, canvas_h);
    (x, y)
}
fn bind_keyboard_events(signal: &web_sys::AbortSignal) {
    let doc = dom::document();
    dom::on_with_signal(
        doc.unchecked_ref(),
        "keydown",
        signal,
        move |event: Event| {
            let Some(e) = event.dyn_ref::<KeyboardEvent>() else {
                return;
            };
            let key = e.key();
            let speed = 25.0;
            GAME.with(|g| {
                if let Some(game) = g.borrow_mut().as_mut() {
                    let (dx, dy) = match key.as_str() {
                        "ArrowUp" | "w" | "W" => (0.0, -speed),
                        "ArrowDown" | "s" | "S" => (0.0, speed),
                        "ArrowLeft" | "a" | "A" => (-speed, 0.0),
                        "ArrowRight" | "d" | "D" => (speed, 0.0),
                        " " => {
                            game.unicorn.dash();
                            synth_audio::magic_wand();
                            for _ in 0..15 {
                                game.sparkles.spawn(game.unicorn.x, game.unicorn.y);
                            }
                            (0.0, 0.0)
                        }
                        _ => return,
                    };
                    if dx != 0.0 || dy != 0.0 {
                        game.unicorn.target_x =
                            (game.unicorn.target_x + dx).clamp(0.0, game.canvas_w);
                        game.unicorn.target_y =
                            (game.unicorn.target_y + dy).clamp(0.0, game.canvas_h);
                        game.idle_timer = 0.0;
                        e.prevent_default();
                    }
                }
            });
        },
    );
}
fn bind_mute_button(signal: &web_sys::AbortSignal) {
    if let Some(btn) = dom::query("[data-unicorn-mute]") {
        dom::on_with_signal(btn.unchecked_ref(), "click", signal, move |_: Event| {
            let is_muted = !game_unicorn_audio::is_muted_state();
            game_unicorn_audio::set_muted(is_muted);
            if let Some(el) = dom::query("[data-unicorn-mute]") {
                el.set_text_content(Some(if is_muted { "\u{1F507}" } else { "\u{1F50A}" }));
            }
        });
    }
}
fn spawn_flower(game: &mut UnicornGameState, x: f64, y: f64) {
    synth_audio::gentle();
    let idx = (js_sys::Math::random() * FLOWER_EMOJIS.len() as f64) as usize;
    let emoji = FLOWER_EMOJIS[idx.min(FLOWER_EMOJIS.len() - 1)];
    if game.flowers.len() < 20 {
        game.flowers.push(FlowerDecor {
            x,
            y,
            life: 3.0,
            scale: 0.0,
            emoji,
        });
    }
}
fn update_score(score: u32) {
    dom::fmt_text("[data-unicorn-score]", |buf| {
        let _ = write!(buf, "\u{1F496} {score}");
    });
}
fn update_timer_if_changed(time_remaining: f64) {
    thread_local! { static LAST_SECS: std::cell::Cell<u32> = const { std::cell::Cell::new(u32::MAX) }; }
    let secs = time_remaining.ceil().max(0.0) as u32;
    if LAST_SECS.with(|c| c.get()) == secs {
        return;
    }
    LAST_SECS.with(|c| c.set(secs));
    dom::fmt_text("[data-unicorn-timer]", |buf| {
        let m = secs / 60;
        let s = secs % 60;
        let _ = write!(buf, "{m}:{s:02}");
    });
}

fn bind_back_button(signal: &web_sys::AbortSignal) {
    if let Some(btn) = dom::query("[data-unicorn-back]") {
        dom::on_with_signal(btn.unchecked_ref(), "click", signal, move |_: Event| {
            cleanup();
            games::return_to_menu();
        });
    }
}
fn end_game(game: &mut UnicornGameState) {
    let score = game.friends.score;
    let friends_collected = game.friends.total_collected;
    let session_hearts = game.session_hearts;
    let state = game.state.clone();
    let prev_high = state.borrow().unicorn_high_score;
    let is_new_high = score > prev_high;
    if is_new_high {
        state.borrow_mut().unicorn_high_score = score;
    }
    let duration_ms = (SESSION_SECONDS * 1000.0) as u64;
    games::save_game_score(
        "unicorn-save",
        "unicorn",
        u64::from(score),
        u64::from(friends_collected),
        0,
        duration_ms,
    );
    game_unicorn_audio::stop_ambient();
    if is_new_high && score > 0 {
        synth_audio::fanfare();
        confetti::burst_stars();
        native_apis::vibrate_success();
    } else {
        synth_audio::chime();
    }
    dom::with_buf(|buf| {
        let _ = write!(buf, "{friends_collected} friends collected!");
        speech::speak(buf);
    });
    show_end_screen(
        score,
        friends_collected,
        session_hearts,
        is_new_high,
        prev_high,
        state,
    );
}
fn show_end_screen(
    score: u32,
    friends_collected: u32,
    session_hearts: u32,
    is_new_high: bool,
    prev_high: u32,
    state: Rc<RefCell<AppState>>,
) {
    let Some((arena, _doc)) = games::clear_game_arena() else {
        return;
    };
    let Some((screen, title, stats)) = games::build_end_screen() else {
        return;
    };
    games::set_end_title(
        &title,
        is_new_high && score > 0,
        "\u{1F389} Great Adventure! \u{1F389}",
    );
    dom::with_buf(|buf| {
        let _ = write!(buf, "\u{2B50} Score: {score}");
        games::append_stat_line(&stats, "", buf);
    });
    games::append_beat_record_line(&stats, is_new_high, score, prev_high);
    dom::with_buf(|buf| {
        let _ = write!(buf, "\u{1F43E} Friends collected: {friends_collected}");
        games::append_stat_line(&stats, "", buf);
    });
    games::append_hearts_line(&stats, session_hearts);
    games::finish_end_screen(&screen, &stats, &arena, "unicorn");
    let s = state;
    games::bind_end_buttons(
        None,
        move || {
            cleanup();
            show_biome_picker(s.clone());
        },
        || {
            cleanup();
            games::return_to_menu();
        },
    );
}
pub fn cleanup() {
    PICKER_ABORT.with(|p| {
        p.borrow_mut().take();
    });
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
    RAF_CLOSURE.with(|rc| *rc.borrow_mut() = None);
}

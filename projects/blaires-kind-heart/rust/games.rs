use crate::{
    browser_apis, companion, constants::*, db_client, dom, game_catcher, game_hug, game_memory,
    game_paint, game_unicorn, render, state, synth_audio, utils,
};
use crate::state::AppState;
use std::cell::RefCell;
use std::fmt::Write;
use std::rc::Rc;
use std::thread::LocalKey;
use wasm_bindgen::JsCast;
use web_sys::{Element, Event};
thread_local! {
    static GAME_PLAYED: std::cell::Cell<bool> = const { std::cell::Cell::new(false) };
}
const GAME_CARDS: &[(&str, &str, &str, &str, &str, &str)] = &[
    (
        "\u{1F496}",
        "Kindness Catcher",
        "Catch falling hearts! \u{00B7} 4 themes",
        "catcher",
        "catcher",
        "illustrations/buttons/btn-game-catcher.webp",
    ),
    (
        "\u{1F0CF}",
        "Memory Match",
        "Find the matching pairs! \u{00B7} 6 themes",
        "memory",
        "memory",
        "illustrations/buttons/btn-game-memory.webp",
    ),
    (
        "\u{1F917}",
        "Hug Machine",
        "Give Sparkle hugs! \u{00B7} 3 moods",
        "hug",
        "hug",
        "illustrations/buttons/btn-game-hug.webp",
    ),
    (
        "\u{1F3A8}",
        "Magic Painting",
        "Paint and create art! \u{00B7} 5 styles",
        "paint",
        "paint",
        "illustrations/buttons/btn-game-paint.webp",
    ),
    (
        "\u{1F984}",
        "Unicorn Adventure",
        "Collect forest friends! \u{00B7} 4 worlds",
        "unicorn",
        "unicorn",
        "illustrations/buttons/btn-game-unicorn.webp",
    ),
];

type GameStartFn = fn(Rc<RefCell<AppState>>);
type GameCleanupFn = fn();

struct GameLifecycle {
    id: &'static str,
    start: GameStartFn,
    cleanup: GameCleanupFn,
}

const GAME_LIFECYCLES: &[GameLifecycle] = &[
    GameLifecycle {
        id: "catcher",
        start: game_catcher::start,
        cleanup: game_catcher::cleanup,
    },
    GameLifecycle {
        id: "memory",
        start: game_memory::start,
        cleanup: game_memory::cleanup,
    },
    GameLifecycle {
        id: "hug",
        start: game_hug::start,
        cleanup: game_hug::cleanup,
    },
    GameLifecycle {
        id: "paint",
        start: game_paint::start,
        cleanup: game_paint::cleanup,
    },
    GameLifecycle {
        id: "unicorn",
        start: game_unicorn::start,
        cleanup: game_unicorn::cleanup,
    },
];

pub struct PickerSetup {
    pub arena: Element,
    pub buttons: Element,
    pub doc: web_sys::Document,
    pub abort: browser_apis::AbortHandle,
    pub signal: web_sys::AbortSignal,
}

pub type PickerAbortSlot = &'static LocalKey<RefCell<Option<browser_apis::AbortHandle>>>;

pub fn clear_picker_abort(slot: PickerAbortSlot) {
    slot.with(|cell| {
        cell.borrow_mut().take();
    });
}

pub fn store_picker_abort(slot: PickerAbortSlot, abort: browser_apis::AbortHandle) {
    slot.with(|cell| {
        *cell.borrow_mut() = Some(abort);
    });
}

pub fn setup_picker_with_abort(slot: PickerAbortSlot, title: &str) -> Option<PickerSetup> {
    clear_picker_abort(slot);
    setup_picker(title)
}

fn game_lifecycle(game_id: &str) -> Option<&'static GameLifecycle> {
    GAME_LIFECYCLES.iter().find(|entry| entry.id == game_id)
}

fn cleanup_all_games() {
    for game in GAME_LIFECYCLES {
        (game.cleanup)();
    }
}

pub fn setup_picker(title: &str) -> Option<PickerSetup> {
    let (arena, buttons) = render::build_game_picker(title)?;
    let abort = browser_apis::new_abort_handle()?;
    let signal = abort.signal();
    let doc = dom::document();
    Some(PickerSetup {
        arena,
        buttons,
        doc,
        abort,
        signal,
    })
}

pub fn bind_picker_selection(
    arena: &Element,
    signal: &web_sys::AbortSignal,
    selector: &str,
    mut on_select: impl FnMut(Element) + 'static,
) {
    let selector = selector.to_string();
    dom::on_with_signal(
        arena.unchecked_ref(),
        "click",
        signal,
        move |event: Event| {
            let Some(el) = dom::event_target_element(&event) else {
                return;
            };
            if let Some(target) = dom::closest(&el, &selector) {
                on_select(target);
            }
        },
    );
}

pub fn init() {
    if let Some(body) = dom::query(SELECTOR_GAMES_BODY) {
        let doc = dom::document();
        if let Some(skeleton) =
            render::build_skeleton(&doc, "games-skeleton", "skeleton-game-card shimmer", 6)
        {
            dom::set_attr(&skeleton, "data-games-skeleton", "");
            let _ = body.append_child(&skeleton);
        }
    }
    dom::set_timeout_once(100, move || {
        if let Some(skeleton) = dom::query("[data-games-skeleton]") {
            skeleton.remove();
        }
        render_game_menu();
        bind_game_clicks();
        bind_exit_btn();
        listen_panel_leaving();
    });
}
fn render_game_menu() {
    let Some(body) = dom::query(SELECTOR_GAMES_BODY) else {
        return;
    };
    let doc = dom::document();
    let Some(grid) = render::create_el_with_class(&doc, "div", "games-grid") else {
        return;
    };
    for &(_emoji, title, desc, game_id, color, image) in GAME_CARDS {
        let Some(card) = render::create_el_with_class(&doc, "button", "game-card") else {
            continue;
        };
        dom::with_buf(|buf| {
            let _ = write!(buf, "game-card--{color}");
            let _ = card.class_list().add_1(buf);
        });
        dom::set_attr(&card, "type", "button");
        dom::set_attr(&card, "data-game", game_id);
        let Some(emoji_el) = render::create_img(&doc, image, title, "game-card-img") else {
            continue;
        };
        for (k, v) in [("aria-hidden", "true"), ("width", "256"), ("height", "256")] {
            dom::set_attr(&emoji_el, k, v);
        }
        let Some(content) = render::create_el_with_class(&doc, "div", "game-card-content") else {
            continue;
        };
        let Some(title_el) = render::text_el(&doc, "div", "game-card-title", title) else {
            continue;
        };
        let Some(desc_el) = render::text_el(&doc, "div", "game-card-desc", desc) else {
            continue;
        };
        let Some(stats_el) = render::create_el_with_class(&doc, "div", "game-card-stats") else {
            continue;
        };
        dom::set_attr(&stats_el, "data-game-stats", game_id);
        stats_el.set_text_content(Some(""));
        let _ = content.append_child(&title_el);
        let _ = content.append_child(&desc_el);
        let _ = content.append_child(&stats_el);
        let Some(new_badge) = render::create_el_with_class(&doc, "span", "game-card-new") else {
            continue;
        };
        dom::set_attr(&new_badge, "data-game-new", game_id);
        dom::set_attr(&new_badge, "hidden", "");
        new_badge.set_text_content(Some("NEW!"));
        let Some(check) = render::create_el_with_class(&doc, "span", "game-card-check") else {
            continue;
        };
        dom::set_attr(&check, "data-game-check", game_id);
        dom::set_attr(&check, "hidden", "");
        check.set_text_content(Some("\u{2705}"));
        let Some(play_badge) = render::text_el(&doc, "span", "game-card-play", "Play \u{25B6}")
        else {
            continue;
        };
        for child in [&emoji_el, &content, &new_badge, &check, &play_badge] {
            let _ = card.append_child(child);
        }
        let _ = grid.append_child(&card);
    }
    let _ = body.append_child(&grid);
}
pub fn hydrate_hub_stats() {
    crate::browser_apis::spawn_local_logged("games-hub-stats", async {
        let today = crate::utils::today_key();
        if let Ok(rows) = db_client::query( "SELECT \
                COALESCE(MAX(CASE WHEN game_id = 'catcher' THEN score END), 0) as catcher_best, \
                COALESCE(MAX(CASE WHEN game_id = 'catcher' THEN level END), 0) as catcher_lvl, \
                COALESCE(MIN(CASE WHEN game_id LIKE 'memory_%' AND duration_ms > 0 THEN duration_ms END), 0) / 1000 as memory_best, \
                COALESCE(SUM(CASE WHEN game_id = 'hug' THEN 1 ELSE 0 END), 0) as hug_cnt, \
                COALESCE(SUM(CASE WHEN game_id = 'paint' AND day_key = ?1 THEN 1 ELSE 0 END), 0) as paint_today, \
                COALESCE(MAX(CASE WHEN game_id = 'unicorn' THEN score END), 0) as unicorn_best \
             FROM game_scores", vec![today.clone()],).await {
            if let Some(row) = rows.get(0) {
                let catcher_best = row.get("catcher_best").and_then(|v| v.as_u64()).unwrap_or(0);
                if catcher_best > 0 {
                    let lvl = row.get("catcher_lvl").and_then(|v| v.as_u64()).unwrap_or(1);
                    dom::fmt_text("[data-game-stats=\"catcher\"]", |buf| {
                        let _ = write!(buf, "\u{1F3C6} {catcher_best} pts \u{00B7} Lvl {lvl}");
                    });
                }
                let memory_best = row.get("memory_best").and_then(|v| v.as_u64()).unwrap_or(0);
                if memory_best > 0 {
                    dom::fmt_text("[data-game-stats=\"memory\"]", |buf| {
                        let _ = write!(buf, "\u{2B50} Best: {memory_best}s");
                    });
                }
                let hug_cnt = row.get("hug_cnt").and_then(|v| v.as_u64()).unwrap_or(0);
                if hug_cnt > 0 {
                    dom::fmt_text("[data-game-stats=\"hug\"]", |buf| {
                        let _ = write!(buf, "\u{1F49C} {hug_cnt} hugs given");
                    });
                }
                let paint_today = row.get("paint_today").and_then(|v| v.as_u64()).unwrap_or(0);
                if paint_today > 0 {
                    dom::fmt_text("[data-game-stats=\"paint\"]", |buf| {
                        let _ = write!(buf, "\u{1F3A8} {paint_today} paintings today");
                    });
                }
                let unicorn_best = row.get("unicorn_best").and_then(|v| v.as_u64()).unwrap_or(0);
                if unicorn_best > 0 {
                    dom::fmt_text("[data-game-stats=\"unicorn\"]", |buf| {
                        let _ = write!(buf, "\u{1F496} {unicorn_best} friends");
                    });
                }
            }
        }
        if let Ok(rows) = db_client::query(
            "SELECT \
                CASE \
                    WHEN game_id LIKE 'catcher%' THEN 'catcher' \
                    WHEN game_id LIKE 'memory%' THEN 'memory' \
                    WHEN game_id LIKE 'hug%' THEN 'hug' \
                    WHEN game_id LIKE 'paint%' THEN 'paint' \
                    WHEN game_id LIKE 'unicorn%' THEN 'unicorn' \
                END as gid \
             FROM game_scores WHERE day_key = ?1 \
             GROUP BY gid HAVING gid IS NOT NULL",
            vec![today],
        )
        .await
        {
            let mut played_set = std::collections::HashSet::new();
            if let Some(arr) = rows.as_array() {
                for row in arr {
                    if let Some(gid) = row.get("gid").and_then(|v| v.as_str()) {
                        played_set.insert(gid.to_string());
                    }
                }
            }
            for game_id in &["catcher", "memory", "hug", "paint", "unicorn"] {
                if played_set.contains(*game_id) {
                    if let Some(el) = dom::query_data("game-check", game_id) {
                        dom::remove_attr(&el, "hidden");
                    }
                } else if let Some(el) = dom::query_data("game-new", game_id) {
                    dom::remove_attr(&el, "hidden");
                }
            }
        }
        Ok(())
    });
}
fn bind_game_clicks() {
    if let Some(body) = dom::query(SELECTOR_GAMES_BODY) {
        if dom::has_attr(&body, "data-bound-clicks") {
            return;
        }
        dom::set_attr(&body, "data-bound-clicks", "true");
        dom::on(body.unchecked_ref(), "click", move |event: Event| {
            let Some(el) = dom::event_target_element(&event) else {
                return;
            };
            if let Some(card) = dom::closest(&el, "[data-game]") {
                if let Some(game_id) = dom::get_attr(&card, "data-game") {
                    launch_game(&game_id);
                }
            }
        });
    }
}
fn bind_exit_btn() {
    if let Some(btn) = dom::query(SELECTOR_GAME_EXIT) {
        if dom::has_attr(&btn, "data-bound-exit") {
            return;
        }
        dom::set_attr(&btn, "data-bound-exit", "true");
        dom::on(btn.unchecked_ref(), "click", |_| {
            crate::synth_audio::tap();
            cleanup_all_games();
            return_to_menu();
        });
    }
}

fn set_game_view(show_arena: bool) {
    if show_arena {
        dom::hide(SELECTOR_GAMES_BODY);
        dom::show(SELECTOR_GAME_ARENA);
        if let Some(btn) = dom::query(SELECTOR_GAME_EXIT) {
            dom::remove_attr(&btn, "hidden");
        }
    } else {
        dom::show(SELECTOR_GAMES_BODY);
        dom::hide(SELECTOR_GAME_ARENA);
        if let Some(btn) = dom::query(SELECTOR_GAME_EXIT) {
            dom::set_attr(&btn, "hidden", "");
        }
    }
    if let Some(arena) = dom::query(SELECTOR_GAME_ARENA) {
        dom::safe_set_inner_html(&arena, "");
    }
}
fn launch_game(game_id: &str) {
    GAME_PLAYED.with(|g| g.set(true));
    set_game_view(true);
    synth_audio::start_game_music(game_id);
    let temp_state = state::snapshot();
    if let Some(game) = game_lifecycle(game_id) {
        (game.start)(temp_state);
    }
}
pub fn return_to_menu() {
    synth_audio::stop_game_music();
    set_game_view(false);
    hydrate_hub_stats();
}
pub fn clear_game_arena() -> Option<(Element, web_sys::Document)> {
    let arena = dom::query(SELECTOR_GAME_ARENA)?;
    let doc = dom::document();
    dom::safe_set_inner_html(&arena, "");
    Some((arena, doc))
}
pub fn create_canvas_or_bail(doc: &web_sys::Document, game_name: &str) -> Option<Element> {
    match doc.create_element("canvas") {
        Ok(el) => Some(el),
        Err(_) => {
            dom::warn(&format!(
                "Failed to create canvas element for {game_name} game"
            ));
            dom::toast(&format!(
                "Sorry, {game_name} game couldn't start. Try again?"
            ));
            return_to_menu();
            None
        }
    }
}
pub fn build_end_screen() -> Option<(Element, Element, Element)> {
    let doc = dom::document();
    let screen = render::create_el_with_class(&doc, "div", "game-end-screen")?;
    let title = render::create_el_with_class(&doc, "div", "game-end-title")?;
    let stats = render::create_el_with_class(&doc, "div", "game-end-stats")?;
    let _ = screen.append_child(&title);
    let _ = screen.append_child(&stats);
    Some((screen, title, stats))
}
pub fn set_end_title(title: &Element, is_new_high: bool, fallback_text: &str) {
    if is_new_high {
        title.set_text_content(Some("\u{1F389} NEW HIGH SCORE! \u{1F389}"));
        let _ = title.class_list().add_1("game-end-title--new-record");
    } else {
        title.set_text_content(Some(fallback_text));
    }
}
pub fn append_beat_record_line(stats: &Element, is_new_high: bool, score: u32, prev_high: u32) {
    if !is_new_high || prev_high == 0 {
        return;
    }
    append_stat_line(
        stats,
        "game-end-stat--beat",
        &format!("Beat your record by {}!", score - prev_high),
    );
}
pub fn append_hearts_line(stats: &Element, hearts: u32) {
    append_stat_line(
        stats,
        "game-end-stat--hearts",
        &format!("\u{1F49C} +{hearts} hearts earned!"),
    );
}
pub fn append_stat_line(stats: &Element, extra_class: &str, text: &str) {
    let doc = dom::document();
    if extra_class.is_empty() {
        render::append_text(&doc, stats, "div", "game-end-stat", text);
    } else {
        dom::with_buf(|buf| {
            let _ = write!(buf, "game-end-stat {extra_class}");
            render::append_text(&doc, stats, "div", buf, text);
        });
    }
}
pub fn get_arena() -> Option<Element> {
    state::get_cached_game_arena().or_else(|| dom::query(SELECTOR_GAME_ARENA))
}
pub fn finish_end_screen(screen: &Element, stats: &Element, arena: &Element, game_id: &str) {
    let doc = dom::document();
    let Some(buttons) = render::create_el_with_class(&doc, "div", "game-end-buttons") else {
        return;
    };
    let Some(again_btn) = render::create_button(
        &doc,
        "game-end-btn game-end-btn--again",
        "\u{1F504} Play Again",
    ) else {
        return;
    };
    dom::set_attr(&again_btn, "data-game-again", game_id);
    let Some(back_btn) = render::create_button_with_data(
        &doc,
        "game-end-btn game-end-btn--back",
        "\u{2190} Back to Games",
        "data-game-back",
    ) else {
        return;
    };
    let _ = buttons.append_child(&again_btn);
    let _ = buttons.append_child(&back_btn);
    let _ = screen.append_child(stats);
    let _ = screen.append_child(&buttons);
    let _ = arena.append_child(screen);
}
pub fn save_game_score(
    op_name: &'static str,
    game_id: &str,
    score: u64,
    level: u64,
    combo: u64,
    duration_ms: u64,
) {
    let id = utils::create_id();
    let day_key = utils::today_key();
    let now = utils::now_epoch_ms();
    db_client::exec_fire_and_forget(
        op_name,
        "INSERT INTO game_scores (id, game_id, score, level, combo, duration_ms, played_at, day_key) \
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        vec![
            id,
            game_id.to_string(),
            score.to_string(),
            level.to_string(),
            combo.to_string(),
            duration_ms.to_string(),
            now.to_string(),
            day_key,
        ],
    );
}
pub fn bind_end_buttons(
    signal: Option<&web_sys::AbortSignal>,
    on_again: impl Fn() + 'static,
    on_back: impl Fn() + 'static,
) {
    let Some(arena) = dom::query(SELECTOR_GAME_ARENA) else {
        return;
    };
    let handler = move |event: Event| {
        let Some(el) = dom::event_target_element(&event) else {
            return;
        };
        if dom::closest(&el, "[data-game-again]").is_some() {
            on_again();
        } else if dom::closest(&el, "[data-game-back]").is_some() {
            on_back();
        }
    };
    if let Some(sig) = signal {
        dom::on_with_signal(arena.unchecked_ref(), "click", sig, handler);
    } else {
        dom::on(arena.unchecked_ref(), "click", handler);
    }
}
fn listen_panel_leaving() {
    thread_local! {
        static REGISTERED: std::cell::Cell<bool> = const { std::cell::Cell::new(false) };
    }
    if REGISTERED.with(|r| r.replace(true)) {
        return;
    }
    let doc = dom::document();
    dom::on(
        doc.unchecked_ref(),
        EVENT_PANEL_LEAVING,
        move |event: Event| {
            let evt: &web_sys::CustomEvent = event.unchecked_ref();
            let detail = evt.detail();
            let target = js_sys::Reflect::get(&detail, &"target_panel".into())
                .ok()
                .and_then(|v| v.as_string());
            let from_panel = js_sys::Reflect::get(&detail, &"from_panel".into())
                .ok()
                .and_then(|v| v.as_string());
            if from_panel.as_deref() != Some(PANEL_GAMES) || target.as_deref() == Some(PANEL_GAMES)
            {
                return;
            }
            synth_audio::stop_game_music();
            cleanup_all_games();
            return_to_menu();
            if GAME_PLAYED.with(|g| g.replace(false)) {
                companion::on_game_complete();
            }
        },
    );
}

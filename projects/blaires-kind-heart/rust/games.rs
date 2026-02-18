//! Games hub — 5 illustrated game cards with personal stats, routing to sub-games.
//! Event delegation on the games panel body.

use std::cell::RefCell;
use std::rc::Rc;
use wasm_bindgen::JsCast;
use wasm_bindgen_futures::spawn_local;
use web_sys::{Element, Event};

use crate::{companion, constants::*, dom, render, state, db_client, utils, game_catcher, game_memory, game_hug, game_paint, game_unicorn};

/// Game definitions: (emoji_fallback, title, description, game_id, color_variant, image_path)
const GAME_CARDS: &[(&str, &str, &str, &str, &str, &str)] = &[
    ("\u{1F496}", "Kindness Catcher", "Catch falling hearts! \u{00B7} 4 themes", "catcher", "catcher", "illustrations/buttons/btn-game-catcher.webp"),
    ("\u{1F0CF}", "Memory Match", "Find the matching pairs! \u{00B7} 6 themes", "memory", "memory", "illustrations/buttons/btn-game-memory.webp"),
    ("\u{1F917}", "Hug Machine", "Give Sparkle hugs! \u{00B7} 3 moods", "hug", "hug", "illustrations/buttons/btn-game-hug.webp"),
    ("\u{1F3A8}", "Magic Painting", "Paint and create art! \u{00B7} 5 styles", "paint", "paint", "illustrations/buttons/btn-game-paint.webp"),
    ("\u{1F984}", "Unicorn Adventure", "Collect forest friends! \u{00B7} 4 worlds", "unicorn", "unicorn", "illustrations/buttons/btn-game-unicorn.webp"),
];

pub fn init() {
    // Show loading skeleton before rendering
    show_loading_skeleton();

    // Delay actual render to show skeleton (100ms)
    dom::set_timeout_once(100, move || {
        remove_loading_skeleton();
        render_game_menu();
        bind_game_clicks();
        listen_panel_leaving();

        // Init sub-games (only unicorn needs init)
        game_unicorn::init();
    });
}

/// Show loading skeleton while game hub stats are being fetched.
fn show_loading_skeleton() {
    let Some(body) = dom::query(SELECTOR_GAMES_BODY) else { return };
    let doc = dom::document();

    let skeleton = render::create_el_with_class(&doc, "div", "games-skeleton");
    let _ = skeleton.set_attribute("data-games-skeleton", "");

    // Create 5 placeholder game cards
    for _ in 0..5 {
        let card = render::create_el_with_class(&doc, "div", "skeleton-game-card shimmer");
        let _ = skeleton.append_child(&card);
    }

    let _ = body.append_child(&skeleton);
}

/// Remove loading skeleton when real content is ready.
fn remove_loading_skeleton() {
    if let Some(skeleton) = dom::query("[data-games-skeleton]") {
        skeleton.remove();
    }
}

fn render_game_menu() {
    let Some(body) = dom::query(SELECTOR_GAMES_BODY) else { return };
    let doc = dom::document();
    let grid = render::create_el_with_class(&doc, "div", "games-grid");

    for &(_emoji, title, desc, game_id, color, image) in GAME_CARDS {
        let card = render::create_el_with_class(&doc, "button", &format!("game-card game-card--{color}"));
        let _ = card.set_attribute("type", "button");
        let _ = card.set_attribute("data-game", game_id);

        let emoji_el = render::create_img(&doc, image, title, "game-card-img");
        let _ = emoji_el.set_attribute("aria-hidden", "true");
        let _ = emoji_el.set_attribute("width", "256");
        let _ = emoji_el.set_attribute("height", "256");

        let content = render::create_el_with_class(&doc, "div", "game-card-content");
        let title_el = render::create_el_with_class(&doc, "div", "game-card-title");
        title_el.set_text_content(Some(title));
        let desc_el = render::create_el_with_class(&doc, "div", "game-card-desc");
        desc_el.set_text_content(Some(desc));

        // Stats line — shows personal best, populated async
        let stats_el = render::create_el_with_class(&doc, "div", "game-card-stats");
        let _ = stats_el.set_attribute("data-game-stats", game_id);
        stats_el.set_text_content(Some("...")); // filled by hydrate_hub_stats

        let _ = content.append_child(&title_el);
        let _ = content.append_child(&desc_el);
        let _ = content.append_child(&stats_el);

        // "NEW!" badge — hidden by default, shown if not played today
        let new_badge = render::create_el_with_class(&doc, "span", "game-card-new");
        let _ = new_badge.set_attribute("data-game-new", game_id);
        let _ = new_badge.set_attribute("hidden", "");
        new_badge.set_text_content(Some("NEW!"));

        // Played-today checkmark — hidden by default
        let check = render::create_el_with_class(&doc, "span", "game-card-check");
        let _ = check.set_attribute("data-game-check", game_id);
        let _ = check.set_attribute("hidden", "");
        check.set_text_content(Some("\u{2705}")); // green checkmark

        let play_badge = render::create_el_with_class(&doc, "span", "game-card-play");
        play_badge.set_text_content(Some("Play \u{25B6}"));

        let _ = card.append_child(&emoji_el);
        let _ = card.append_child(&content);
        let _ = card.append_child(&new_badge);
        let _ = card.append_child(&check);
        let _ = card.append_child(&play_badge);
        let _ = grid.append_child(&card);
    }

    let _ = body.append_child(&grid);
}

/// Hydrate hub stats from DB — called after DB is ready (from lib.rs hydrate_state).
/// Shows personal bests and played-today status on each game card.
/// Uses 2 queries instead of 8: one for all-time stats, one for today's play status.
pub fn hydrate_hub_stats() {
    spawn_local(async {
        let today = crate::utils::today_key();

        // Query 1: All-time stats — catcher best, memory best time, hug count, paint today
        if let Ok(rows) = db_client::query(
            "SELECT \
                COALESCE(MAX(CASE WHEN game_id = 'catcher' THEN score END), 0) as catcher_best, \
                COALESCE(MAX(CASE WHEN game_id = 'catcher' THEN level END), 0) as catcher_lvl, \
                COALESCE(MIN(CASE WHEN game_id LIKE 'memory_%' AND duration_ms > 0 THEN duration_ms END), 0) / 1000 as memory_best, \
                COALESCE(SUM(CASE WHEN game_id = 'hug' THEN 1 ELSE 0 END), 0) as hug_cnt, \
                COALESCE(SUM(CASE WHEN game_id = 'paint' AND day_key = ?1 THEN 1 ELSE 0 END), 0) as paint_today, \
                COALESCE(MAX(CASE WHEN game_id = 'unicorn' THEN score END), 0) as unicorn_best \
             FROM game_scores",
            vec![today.clone()],
        ).await {
            if let Some(row) = rows.get(0) {
                let catcher_best = row.get("catcher_best").and_then(|v| v.as_u64()).unwrap_or(0);
                if catcher_best > 0 {
                    let lvl = row.get("catcher_lvl").and_then(|v| v.as_u64()).unwrap_or(1);
                    set_stat("catcher", &format!("\u{1F3C6} {} pts \u{00B7} Lvl {}", catcher_best, lvl));
                }

                let memory_best = row.get("memory_best").and_then(|v| v.as_u64()).unwrap_or(0);
                if memory_best > 0 {
                    set_stat("memory", &format!("\u{2B50} Best: {}s", memory_best));
                }

                let hug_cnt = row.get("hug_cnt").and_then(|v| v.as_u64()).unwrap_or(0);
                if hug_cnt > 0 {
                    set_stat("hug", &format!("\u{1F49C} {} hugs given", hug_cnt));
                }

                let paint_today = row.get("paint_today").and_then(|v| v.as_u64()).unwrap_or(0);
                if paint_today > 0 {
                    set_stat("paint", &format!("\u{1F3A8} {} paintings today", paint_today));
                }

                let unicorn_best = row.get("unicorn_best").and_then(|v| v.as_u64()).unwrap_or(0);
                if unicorn_best > 0 {
                    set_stat("unicorn", &format!("\u{1F496} {} friends", unicorn_best));
                }
            }
        }

        // Query 2: Played-today status — one row per game prefix played today
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
        ).await {
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
                    if let Some(el) = dom::query(&format!("[data-game-check=\"{}\"]", game_id)) {
                        let _ = el.remove_attribute("hidden");
                    }
                } else if let Some(el) = dom::query(&format!("[data-game-new=\"{}\"]", game_id)) {
                    let _ = el.remove_attribute("hidden");
                }
            }
        }
    });
}

fn set_stat(game_id: &str, text: &str) {
    if let Some(el) = dom::query(&format!("[data-game-stats=\"{}\"]", game_id)) {
        el.set_text_content(Some(text));
    }
}

/// Event-delegated click handler on games panel body.
fn bind_game_clicks() {
    if let Some(body) = dom::query(SELECTOR_GAMES_BODY) {
        dom::on(body.unchecked_ref(), "click", move |event: Event| {
            let target = event.target().and_then(|t| t.dyn_into::<Element>().ok());
            let Some(el) = target else { return };
            if let Ok(Some(card)) = el.closest("[data-game]") {
                if let Some(game_id) = card.get_attribute("data-game") {
                    launch_game(&game_id);
                }
            }
        });
    }
}

/// Launch a specific game — hide the menu, show the arena, delegate to sub-game.
pub fn launch_game(game_id: &str) {
    // Hide game menu, show arena
    if let Some(body) = dom::query(SELECTOR_GAMES_BODY) {
        let _ = body.set_attribute("hidden", "");
    }
    if let Some(arena) = dom::query("#game-arena") {
        let _ = arena.remove_attribute("hidden");
        // Clear previous game content
        dom::safe_set_inner_html(&arena, "");
    }

    // Phase 3.1: Unified state eliminates boot/game split
    let temp_state = Rc::new(RefCell::new(
        state::with_state(|s| s.clone())
    ));

    match game_id {
        "catcher" => game_catcher::start(temp_state.clone()),
        "memory" => game_memory::start(temp_state.clone()),
        "hug" => game_hug::start(temp_state.clone()),
        "paint" => game_paint::start(temp_state.clone()),
        "unicorn" => game_unicorn::start(temp_state),
        _ => {}
    }
}

/// Return to games menu from a game (called by sub-games on complete/exit).
pub fn return_to_menu() {
    // Show game menu, hide arena
    if let Some(body) = dom::query(SELECTOR_GAMES_BODY) {
        let _ = body.remove_attribute("hidden");
    }
    if let Some(arena) = dom::query("#game-arena") {
        let _ = arena.set_attribute("hidden", "");
        dom::safe_set_inner_html(&arena, "");
    }
    // Refresh stats when returning to hub
    hydrate_hub_stats();
}

/// Build the common end-screen scaffold used by all 5 games.
/// Returns `(screen, title, stats)` — caller appends game-specific stat lines to `stats`,
/// then calls `finish_end_screen(screen, stats, arena, game_id)` to attach buttons + insert.
pub fn build_end_screen() -> (Element, Element, Element) {
    let doc = dom::document();
    let screen = render::create_el_with_class(&doc, "div", "game-end-screen");
    let title  = render::create_el_with_class(&doc, "div", "game-end-title");
    let stats  = render::create_el_with_class(&doc, "div", "game-end-stats");
    (screen, title, stats)
}

/// Append buttons to `screen`, insert `screen` into `arena`.
/// `game_id`: e.g. "catcher", "memory", "hug", "paint", "unicorn" — used for `data-game-again`.
/// Caller must have already appended all stat children into `stats` and `title` into `screen`.
pub fn finish_end_screen(screen: &Element, stats: &Element, arena: &Element, game_id: &str) {
    let doc = dom::document();
    let buttons = render::create_el_with_class(&doc, "div", "game-end-buttons");
    let again_btn = render::create_button(&doc, "game-end-btn game-end-btn--again", "\u{1F504} Play Again");
    let _ = again_btn.set_attribute("data-game-again", game_id);
    let back_btn = render::create_button(&doc, "game-end-btn game-end-btn--back", "\u{2190} Back to Games");
    let _ = back_btn.set_attribute("data-game-back", "");
    let _ = buttons.append_child(&again_btn);
    let _ = buttons.append_child(&back_btn);
    let _ = screen.append_child(stats);
    let _ = screen.append_child(&buttons);
    let _ = arena.append_child(screen);
}

/// Save a completed game round to the `game_scores` table (fire-and-forget).
/// Handles id/day_key/now generation and the shared SQL — callers only supply game-specific values.
/// `op_name`: unique label for the DB operation (e.g. "catcher-save", "memory-save").
/// `game_id`: stored in the `game_id` column — may include variant suffix (e.g. "memory_hard").
/// `score`, `level`, `duration_ms`: game-specific numeric values.
pub fn save_game_score(op_name: &'static str, game_id: &str, score: u64, level: u64, duration_ms: u64) {
    let id = utils::create_id();
    let day_key = utils::today_key();
    let now = utils::now_epoch_ms();
    db_client::exec_fire_and_forget(
        op_name,
        "INSERT INTO game_scores (id, game_id, score, level, duration_ms, played_at, day_key) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        vec![id, game_id.to_string(), score.to_string(), level.to_string(),
             duration_ms.to_string(), now.to_string(), day_key],
    );
}

/// Bind end-screen "Play Again" and "Back" buttons via event delegation on `#game-arena`.
/// `on_again` is called for "Play Again"; `on_back` is called for "Back to Menu".
/// Used by catcher, hug, and paint end screens (memory uses its own unified handler).
pub fn bind_end_buttons(
    signal: Option<&web_sys::AbortSignal>,
    on_again: impl Fn() + 'static,
    on_back: impl Fn() + 'static,
) {
    let Some(arena) = dom::query("#game-arena") else { return };
    let handler = move |event: Event| {
        let target = event.target().and_then(|t| t.dyn_into::<Element>().ok());
        let Some(el) = target else { return };
        if let Ok(Some(_)) = el.closest("[data-game-again]") {
            on_again();
        } else if let Ok(Some(_)) = el.closest("[data-game-back]") {
            on_back();
        }
    };
    if let Some(sig) = signal {
        dom::on_with_signal(arena.unchecked_ref(), "click", sig, handler);
    } else {
        dom::on(arena.unchecked_ref(), "click", handler);
    }
}

/// Cleanup games when leaving the panel — stop any running game loops.
fn listen_panel_leaving() {
    let doc = dom::document();
    dom::on(doc.unchecked_ref(), EVENT_PANEL_LEAVING, move |event: Event| {
        // When leaving games panel, return to menu state and cleanup
        let evt: &web_sys::CustomEvent = event.unchecked_ref();
        let detail = evt.detail();
        let target = js_sys::Reflect::get(&detail, &"target_panel".into())
            .ok()
            .and_then(|v| v.as_string());

        // If we're navigating away from games, cleanup and celebrate
        if target.as_deref() != Some(PANEL_GAMES) {
            game_catcher::cleanup();
            game_memory::cleanup();
            game_hug::cleanup();
            game_paint::cleanup();
            game_unicorn::cleanup();
            return_to_menu();

            // Companion reacts to game completion
            companion::on_game_complete();
        }
    });
}

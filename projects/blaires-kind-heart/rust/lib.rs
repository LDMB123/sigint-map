//! # Blaire's Kind Heart
//!
//! Fully offline kindness tracker PWA for a 4-year-old, targeting iPad mini 6
//! (A15 chip, 4GB RAM) with Safari 26.2 exclusively.
//!
//! ## Architecture
//!
//! - **Language**: Rust → WASM via `wasm-bindgen` + `web-sys` (zero JS frameworks)
//! - **Storage**: SQLite in OPFS via JS Web Worker (`db-worker.js`)
//! - **Navigation**: Navigation API + View Transitions (5 panels)
//! - **State**: `Rc<RefCell<AppState>>` shared via thread_local
//! - **Graphics**: WebGPU (Metal backend) for GPU particles + CSS animations
//! - **Audio**: Web Audio API with synthesized sounds (no audio files)
//!
//! ## Key Modules
//!
//! - [`tracker`] - Kind act logging with 8 categories
//! - [`quests`] - Daily quest system (adaptive + rotation)
//! - [`games`] - 5 interactive mini-games (Catcher, Memory, Hug, Paint, Unicorn)
//! - [`companion`] - Sparkle the companion with 6 customizable skins
//! - [`synth_audio`] - 15 synthesized sound effects (chime, sparkle, fanfare, etc.)
//! - [`confetti`] - GPU-accelerated particle celebrations with fallback
//! - [`stories`] - Story library with embedded reader UI
//! - [`rewards`] - Heart-based reward system with streaks
//!
//! ## Safari 26.2 APIs Used
//!
//! Navigation API, View Transitions, Popover API, `Scheduler.yield()`,
//! Web Locks API, OPFS (Origin Private File System), `SharedArrayBuffer` (resizable),
//! `AbortSignal.timeout()`, `SpeechSynthesis`, Web Audio API, WebGPU (Metal backend)
//!
//! ## Design Principles
//!
//! - **Safari 26.2 only** - No cross-browser fallbacks
//! - **Fully offline** - All assets precached, SQLite in OPFS
//! - **Kid-friendly UX** - Large touch targets (48px min), bright colors, emoji-heavy
//! - **Zero JS frameworks** - Direct DOM manipulation from Rust
//! - **Performance-first** - Batched init, lazy loading, GPU acceleration

// Targeted allows added per-item below instead of blanket suppression

pub(crate) mod bindings;
pub(crate) mod constants;
mod assets;
mod dom;
mod browser_apis;
pub(crate) mod navigation;
mod pwa;
mod state;
mod render;
mod ui;
mod theme;
mod animations;
mod db_messages;
mod db_client;
mod db_worker;
mod offline_queue;
mod tracker;
mod quests;
mod stories;
mod story_engine;
mod story_data;
mod rewards;
mod streaks;
mod audio;
mod synth_audio;
mod speech;
mod companion;
mod visibility;
mod lazy_loading;
mod celebration;
mod confetti;
mod games;
mod game_catcher;
mod game_memory;
mod game_hug;
mod game_paint;
mod game_unicorn;
mod game_unicorn_audio;
mod game_unicorn_unicorn;
mod game_unicorn_friends;
mod game_unicorn_sparkles;
mod gpu;
mod gpu_particles;
mod mom_mode;
mod weekly_goals;
mod progress;
mod native_apis;
mod tap_ripple;
mod onboarding;
mod utils;
mod storage_pressure;
mod safari_apis;
// Dead Code Cleanup: quest_chains module removed - entire module unused
mod badges;
mod companion_skins;
mod gardens;
// Dead Code Cleanup: weekly_themes module removed - entire module unused
#[cfg(debug_assertions)]
mod debug;
mod gestures;
mod metrics;
mod errors;
mod skill_progression;
mod reflection;
mod adaptive_quests;
mod parent_insights;
mod story_moments;
mod emotion_vocabulary;

use std::cell::RefCell;
use std::rc::Rc;

use wasm_bindgen::prelude::*;
use wasm_bindgen_futures::spawn_local;
use futures::join;

use crate::state::AppState;

fn boot(state: Rc<RefCell<AppState>>) {
  let s = state.clone();
  spawn_local(async move {
    boot_async(s).await;
  });
}

/// Update loading screen progress bar (0-100).
fn update_loading_progress(percent: u32) {
  if let Some(bar) = dom::query(constants::SELECTOR_LOADING_BAR) {
    let _ = bar.set_attribute("style", &format!("width: {}%", percent));
  }
  // Also update ARIA for screen readers
  if let Some(container) = dom::query(constants::SELECTOR_LOADING_CONTAINER) {
    let _ = container.set_attribute(constants::ARIA_VALUENOW, &percent.to_string());
  }
}

/// Async boot sequence that yields to the browser between module batches.
/// Uses `scheduler.yield()` (Safari 26.2+) to avoid long tasks and keep INP low.
async fn boot_async(state: Rc<RefCell<AppState>>) {
  metrics::mark("boot:start");
  #[cfg(debug_assertions)]
  debug::memory::capture_snapshot("boot:start");
  web_sys::console::log_1(&"[boot] start".into());
  update_loading_progress(0);

  // -- Batch 1: Critical infra -- navigation + DB worker (features need DB on click)
  metrics::mark("boot:batch1:start");
  web_sys::console::log_1(&"[boot] navigation::init".into());
  navigation::init();
  web_sys::console::log_1(&"[boot] db_worker::init".into());
  db_worker::init();
  metrics::mark("boot:batch1:end");
  metrics::measure("boot:batch1", "boot:batch1:start", "boot:batch1:end");
  // GPU init runs in background — non-fatal, falls back to DOM confetti if unavailable
  web_sys::console::log_1(&"[boot] gpu::init (background)".into());
  spawn_local(async { gpu::init().await; });
  update_loading_progress(25);
  web_sys::console::log_1(&"[boot] scheduler_yield #1".into());
  browser_apis::scheduler_yield().await;

  // -- Batch 2: Core features -- tracker, quests, stories, rewards, companion
  metrics::mark("boot:batch2:start");
  web_sys::console::log_1(&"[boot] batch 2: core features".into());
  companion::init();

  // Phase 2.4: Cache boot-time elements after companion init (elements guaranteed to exist)
  cache_boot_elements();

  tracker::init();
  quests::init(state.clone());
  stories::init();
  rewards::init();
  streaks::init();
  games::init();
  mom_mode::init(state.clone());
  weekly_goals::init();
  progress::init();
  reflection::init();  // Reflection prompt system
  // Dead Code Cleanup: quest_chains module removed - entire module unused
  // quest_chains::init();
  badges::init();
  companion_skins::init();
  gardens::init();
  // Dead Code Cleanup: weekly_themes module removed - entire module unused
  // weekly_themes::init();
  metrics::mark("boot:batch2:end");
  metrics::measure("boot:batch2", "boot:batch2:start", "boot:batch2:end");
  update_loading_progress(50);
  web_sys::console::log_1(&"[boot] scheduler_yield #2".into());
  browser_apis::scheduler_yield().await;

  // -- Batch 3: Audio, speech, PWA, celebration, interactions, Safari enhancements
  metrics::mark("boot:batch3:start");
  web_sys::console::log_1(&"[boot] batch 3: audio/PWA/safari".into());
  visibility::init(); // Phase 4.6: Page Visibility API for animation pausing
  audio::init();
  synth_audio::init();
  tap_ripple::init();
  pwa::init();
  celebration::init();
  safari_apis::init(); // scrollend, INP monitoring, themed scrollbars, scroll animations
  metrics::init_web_vitals(); // Phase 6: Web Vitals monitoring (LCP, CLS, FCP, INP)
  metrics::mark("boot:batch3:end");
  metrics::measure("boot:batch3", "boot:batch3:start", "boot:batch3:end");
  update_loading_progress(75);
  web_sys::console::log_1(&"[boot] scheduler_yield #3".into());
  browser_apis::scheduler_yield().await;

  // -- Batch 4: State hydration from SQLite
  // Wait for DB worker Init response instead of a fixed delay
  metrics::mark("boot:batch4:start");
  web_sys::console::log_1(&"[boot] batch 4: hydrate state (waiting for DB)".into());
  db_client::wait_for_ready().await;

  // Initialize offline queue table for write persistence
  if let Err(e) = offline_queue::init().await {
    web_sys::console::warn_1(&format!("[boot] offline_queue::init failed: {:?}", e).into());
  }

  // Initialize error logging table for production debugging
  if let Err(e) = errors::init_schema().await {
    web_sys::console::warn_1(&format!("[boot] errors::init_schema failed: {:?}", e).into());
  }

  hydrate_state().await;
  metrics::mark("boot:batch4:end");
  metrics::measure("boot:batch4", "boot:batch4:start", "boot:batch4:end");
  update_loading_progress(95);
  web_sys::console::log_1(&"[boot] scheduler_yield #4".into());
  browser_apis::scheduler_yield().await;

  // Visibility change: suspend audio when tab hidden (iPad kills background audio after ~30s)
  // Also flush offline mutation queue when tab becomes visible
  {
    let _state_vis = state.clone();
    browser_apis::on_visibility_change(move |visible| {
      audio::on_visibility_change(visible);
      synth_audio::on_visibility_change(visible);

      // Flush queued writes when coming back online
      if visible {
        browser_apis::spawn_local_logged("offline_queue::flush", async {
          offline_queue::flush_queue().await
        });
      }
    });
  }

  // pagehide: flush DB to prevent data loss when tab closes / navigates away
  {
    let cb = wasm_bindgen::closure::Closure::<dyn FnMut(web_sys::Event)>::new(|_: web_sys::Event| {
      db_client::flush_sync();
    });
    let _ = dom::window().add_event_listener_with_callback(
      "pagehide",
      cb.as_ref().unchecked_ref(),
    );
    cb.forget();
  }

  // Resize GPU canvas on orientation change / window resize
  if gpu::is_available() {
    let resize_cb = wasm_bindgen::closure::Closure::<dyn FnMut()>::new(|| {
      gpu::resize_canvas();
    });
    let _ = dom::window().add_event_listener_with_callback(
      "resize",
      resize_cb.as_ref().unchecked_ref(),
    );
    resize_cb.forget();
  }

  // Dismiss loading screen with exit animation
  update_loading_progress(100);
  web_sys::console::log_1(&"[boot] dismissing loading screen".into());
  if let Some(screen) = dom::query("#loading-screen") {
    let _ = screen.class_list().add_1("loading-screen--exit");
    // Wait for CSS exit animation (600ms) then hide
    browser_apis::sleep_ms(600).await;
    let _ = screen.set_attribute("hidden", "");
  }

  // Phase 1.3: Stagger entrance via CSS animation-delay (non-blocking, saves ~650ms)
  web_sys::console::log_1(&"[boot] stagger entrance".into());
  // Apply entrance-visible to all elements at once — CSS handles timing
  if let Some(el) = dom::query("[data-home-title]") {
    let _ = el.class_list().add_1("entrance-visible");
  }
  if let Some(el) = dom::query("[data-heart-counter]") {
    let _ = el.class_list().add_1("entrance-visible");
  }
  let btns = dom::query_all("[data-home-btn]");
  for btn in &btns {
    let _ = btn.class_list().add_1("entrance-visible");
  }
  if let Some(el) = dom::query("[data-companion]") {
    let _ = el.class_list().add_1("entrance-visible");
  }
  synth_audio::magic_wand();

  // Onboarding flow (first launch only — checks DB)
  onboarding::init();

  // Debug panel gesture (triple-tap to activate)
  gestures::setup_debug_gesture();

  // Web Vitals tracking (LCP, FID, CLS, INP)
  metrics::init_web_vitals();

  // Sparkle greets Blaire after everything is ready
  companion::greet();

  // Boot complete - record total duration
  metrics::mark("boot:end");
  metrics::measure("boot:total", "boot:start", "boot:end");
  #[cfg(debug_assertions)]
  debug::memory::capture_snapshot("boot:end");

  // Log performance summary
  if let Some(duration) = metrics::duration("boot:start", "boot:end") {
    web_sys::console::log_1(&format!("[boot] Total boot time: {:.2}ms", duration).into());
  }
}

/// Load persisted state from SQLite after DB is ready.
/// Populates hearts_total, hearts_today, streak_days, and sticker collection.
async fn hydrate_state() {
    let today = utils::today_key();

    // Seed companion skins and gardens on first boot (idempotent)
    companion_skins::seed_companion_skins().await;
    gardens::seed_gardens().await;

    // Phase 3: Batched counters + streak query — 4 queries → 2 parallel (eliminating 1 Worker round-trip)
    let (counters_result, streak_result) = join!(
        // Batched counters: hearts_total, hearts_today, quests_completed_today
        db_client::query(
            "SELECT
                COALESCE(SUM(hearts_earned), 0) as hearts_total,
                COALESCE(SUM(CASE WHEN day_key = ?1 THEN hearts_earned ELSE 0 END), 0) as hearts_today,
                (SELECT COUNT(*) FROM quests WHERE day_key = ?1 AND completed = 1) as quests_today
            FROM kind_acts",
            vec![today.clone()],
        ),
        // Streak days query (now parallelized with counters)
        db_client::query(
            "SELECT day_key FROM streaks ORDER BY day_key DESC LIMIT 60",
            vec![]
        )
    );

    // Process counters result
    if let Ok(rows) = counters_result {
        if let Some(row) = rows.get(0) {
            state::with_state_mut(|s| {
                if let Some(total) = row.get("hearts_total").and_then(|v| v.as_u64()) {
                    s.hearts_total = total as u32;
                }
                if let Some(today_hearts) = row.get("hearts_today").and_then(|v| v.as_u64()) {
                    s.hearts_today = today_hearts as u32;
                }
                if let Some(quests) = row.get("quests_today").and_then(|v| v.as_u64()) {
                    s.quests_completed_today = quests as u32;
                }
            });
        }
    }

    // WEEK 1 OPTIMIZATION: Parallel hydration queries (remaining async operations)
    // Run remaining independent hydration queries concurrently using join! (from futures crate)
    let (sticker_result, quest_result, story_result) = join!(
        // Sticker hydration query
        db_client::query(
            "SELECT sticker_type FROM stickers ORDER BY earned_at ASC",
            vec![]
        ),
        // Quest query removed - quest count already obtained in batched counters query (line 271)
        // TODO: Lazy load quest titles on panel navigation instead of hydration
        async { Ok::<serde_json::Value, wasm_bindgen::JsValue>(serde_json::Value::Array(vec![])) },
        // Story progress query
        db_client::query(
            "SELECT story_id FROM stories_progress WHERE completed = 1",
            vec![]
        )
    );

    // Process streak days result
    let streak_days_set: std::collections::HashSet<String> = if let Ok(rows) = streak_result {
        let streak = count_streak_from_rows(&rows, &today);
        state::with_state_mut(|s| {
            s.streak_days = streak;
        });

        rows.as_array()
            .map(|arr| arr.iter()
                .filter_map(|r| r.get("day_key").and_then(|v| v.as_str()).map(String::from))
                .collect::<std::collections::HashSet<String>>())
            .unwrap_or_default()
    } else {
        web_sys::console::error_1(&"Streak query failed during hydration".into());
        std::collections::HashSet::new()
    };

    // Process sticker hydration result
    if let Ok(rows) = sticker_result {
        if let Some(arr) = rows.as_array() {
            let mut sticker_types: Vec<String> = Vec::new();
            for row in arr {
                if let Some(stype) = row.get("sticker_type").and_then(|v| v.as_str()) {
                    sticker_types.push(stype.to_string());
                }
            }
            let earned_count = sticker_types.len();

            rewards::hydrate_stickers_batch(&sticker_types);
            rewards::update_sticker_count_value(earned_count);
        }
    } else {
        web_sys::console::error_1(&"Sticker query failed during hydration".into());
    }

    // Process quest hydration result (currently disabled - see line 322-324)
    if let Ok(rows) = quest_result {
        if let Some(arr) = rows.as_array() {
            for row in arr {
                let Some(title) = row.get("title").and_then(|v| v.as_str()) else { continue };
                quests::hydrate_completed_quest(title);
            }
        }
    } else {
        web_sys::console::error_1(&"Quest query failed during hydration".into());
    }

    // Process story progress result
    if let Ok(rows) = story_result {
        if let Some(arr) = rows.as_array() {
            for row in arr {
                let Some(sid) = row.get("story_id").and_then(|v| v.as_str()) else { continue };
                stories::hydrate_completed_story(sid);
            }
        }
    } else {
        web_sys::console::error_1(&"Story progress query failed during hydration".into());
    }

    // Streak calendar hydration — fill dots for last 7 days using the HashSet from the single query
    {
        let mut day = today.clone();
        for offset in 0..7u32 {
            let selector = format!("[data-day-offset=\"{offset}\"]");
            if let Some(dot) = dom::query(&selector) {
                if streak_days_set.contains(&day) {
                    dot.set_text_content(Some("\u{1F49C}")); // purple heart
                    let _ = dot.set_attribute("class", "streak-day streak-day--active");
                }

                if offset == 0 {
                    let _ = dot.class_list().add_1("streak-day--today");
                }
            }
            day = prev_day_key(&day);
        }
    }

    // Hydrate streak milestones — mark earned ones
    {
        let streak = state::with_state(|s| s.streak_days);
        for &milestone in theme::STREAK_MILESTONES {
            if streak >= milestone {
                let selector = format!("[data-milestone=\"{milestone}\"]");
                if let Some(badge) = dom::query(&selector) {
                    let _ = badge.set_attribute("class", "streak-milestone streak-milestone--earned");
                }
            }
        }
    }

    // Batched game stats query — comprehensive all-time and daily stats in 1 query
    if let Ok(rows) = db_client::query(
        "SELECT
            COALESCE(MAX(CASE WHEN game_id = 'catcher' THEN score END), 0) as catcher_score,
            COALESCE(MAX(CASE WHEN game_id = 'catcher' THEN level END), 0) as catcher_level,
            COALESCE(MAX(CASE WHEN game_id = 'catcher' THEN combo END), 0) as catcher_combo,
            COUNT(CASE WHEN game_id = 'memory_medium' THEN 1 END) as memory_medium_wins,
            COALESCE(MIN(CASE WHEN game_id = 'memory_easy' AND duration_ms > 0 THEN duration_ms END), 0) as memory_easy_time,
            COALESCE(MIN(CASE WHEN game_id = 'memory_medium' AND duration_ms > 0 THEN duration_ms END), 0) as memory_medium_time,
            COALESCE(MIN(CASE WHEN game_id = 'memory_hard' AND duration_ms > 0 THEN duration_ms END), 0) as memory_hard_time,
            COALESCE(MAX(CASE WHEN game_id = 'unicorn' THEN score END), 0) as unicorn_score,
            COUNT(CASE WHEN game_id = 'hug' THEN 1 END) as hug_total,
            COUNT(CASE WHEN game_id = 'paint' AND day_key = ?1 THEN 1 END) as paint_today,
            COUNT(CASE WHEN day_key = ?1 THEN 1 END) as games_today
        FROM game_scores",
        vec![today.clone()],
    ).await {
        if let Some(row) = rows.get(0) {
            state::with_state_mut(|s| {
                if let Some(score) = row.get("catcher_score").and_then(|v| v.as_u64()) {
                    s.catcher_high_score = score as u32;
                }
                if let Some(level) = row.get("catcher_level").and_then(|v| v.as_u64()) {
                    s.catcher_best_level = level as u32;
                }
                if let Some(combo) = row.get("catcher_combo").and_then(|v| v.as_u64()) {
                    s.catcher_best_combo = combo as u32;
                }
                if let Some(wins) = row.get("memory_medium_wins").and_then(|v| v.as_u64()) {
                    s.memory_wins_medium = wins as u32;
                }
                if let Some(time_ms) = row.get("memory_easy_time").and_then(|v| v.as_u64()) {
                    s.memory_best_time_easy = time_ms as u32;
                }
                if let Some(time_ms) = row.get("memory_medium_time").and_then(|v| v.as_u64()) {
                    s.memory_best_time_medium = time_ms as u32;
                }
                if let Some(time_ms) = row.get("memory_hard_time").and_then(|v| v.as_u64()) {
                    s.memory_best_time_hard = time_ms as u32;
                }
                if let Some(score) = row.get("unicorn_score").and_then(|v| v.as_u64()) {
                    s.unicorn_high_score = score as u32;
                }
                if let Some(hug_cnt) = row.get("hug_total").and_then(|v| v.as_u64()) {
                    s.hug_completions = hug_cnt as u32;
                }
                if let Some(paint_cnt) = row.get("paint_today").and_then(|v| v.as_u64()) {
                    s.paintings_today = paint_cnt as u32;
                }
                if let Some(today_games) = row.get("games_today").and_then(|v| v.as_u64()) {
                    s.games_played_today = today_games as u32;
                }
            });
        }
    }

    // Dead Code Cleanup: quest_chains and weekly_themes modules removed - features unimplemented
    // Quest chain progress hydration (DISABLED)
    // let week_key = weekly_themes::get_week_key();
    // if let Ok(rows) = db_client::query(
    //     "SELECT progress, total_quests, chain_name, theme_emoji FROM quest_chains WHERE week_key = ?1",
    //     vec![week_key.into()],
    // ).await {
    //     if let Some(row) = rows.get(0) {
    //         if let (Some(progress), Some(total)) = (
    //             row.get("progress").and_then(|v| v.as_u64()),
    //             row.get("total_quests").and_then(|v| v.as_u64()),
    //         ) {
    //             state::with_game_state_mut(|s| {
    //                 s.chain_progress = progress as u32;
    //                 s.chain_total = total as u32;
    //             });
    //         }
    //     }
    // }

    // Phase 1.1: Batched queries (badges, active skin, unlocked gardens) — parallel execution
    // Saves 60-90ms by running 3 queries in parallel instead of sequentially
    let (badges_result, skin_result, gardens_result) = futures::join!(
        db_client::query(
            "SELECT COUNT(*) as earned_count FROM badges WHERE earned = 1",
            vec![],
        ),
        db_client::query(
            "SELECT id FROM companion_skins WHERE is_active = 1 LIMIT 1",
            vec![],
        ),
        db_client::query(
            "SELECT COUNT(*) as unlocked_count FROM gardens WHERE unlocked_at IS NOT NULL",
            vec![],
        )
    );

    // Process badges result
    if let Ok(rows) = badges_result {
        if let Some(row) = rows.get(0) {
            if let Some(count) = row.get("earned_count").and_then(|v| v.as_u64()) {
                state::with_state_mut(|s| {
                    s.badges_earned = count as u32;
                });
            }
        }
    }

    // Process active skin result
    if let Ok(rows) = skin_result {
        if let Some(row) = rows.get(0) {
            if let Some(skin_id) = row.get("id").and_then(|v| v.as_str()) {
                state::with_state_mut(|s| {
                    s.active_skin = skin_id.to_string();
                });
            }
        }
    }

    // Process unlocked gardens result
    if let Ok(rows) = gardens_result {
        if let Some(row) = rows.get(0) {
            if let Some(count) = row.get("unlocked_count").and_then(|v| v.as_u64()) {
                state::with_state_mut(|s| {
                    s.gardens_unlocked = count as u32;
                });
            }
        }
    }

    // Update UI with hydrated values
    let (hearts_total, streak_days) = state::with_state(|s| (s.hearts_total, s.streak_days));
    ui::update_heart_counter(hearts_total);
    ui::update_streak(streak_days);

    // Game hub stats (personal bests, played-today badges)
    games::hydrate_hub_stats();
}

/// Count consecutive days from the rows result.
fn count_streak_from_rows(rows: &serde_json::Value, today: &str) -> u32 {
    let Some(arr) = rows.as_array() else { return 0; };
    let mut streak = 0u32;
    let mut expected = today.to_string();
    for row in arr {
        let Some(dk) = row.get("day_key").and_then(|v| v.as_str()) else { continue; };
        if dk == expected {
            streak += 1;
            // Compute previous day (simple: subtract 1 from YYYY-MM-DD)
            expected = prev_day_key(&expected);
        } else {
            break;
        }
    }
    streak
}

/// Delegate to `utils::prev_day_key` (single source of truth for date arithmetic).
fn prev_day_key(day: &str) -> String {
    utils::prev_day_key(day)
}

/// Phase 2.4: Cache boot-time DOM elements (Tier 1 hot path)
/// Call after companion::init() to ensure elements exist in DOM
fn cache_boot_elements() {
    use crate::dom;

    let companion = dom::query("[data-companion]");
    let hearts = dom::query("[data-hearts]");
    let tracker_hearts = dom::query("[data-tracker-hearts-count]");
    // Phase 4.2: Cache toast element (save 2 DOM queries per notification)
    let toast = dom::query("[data-toast]");

    // Warn if elements missing (defensive logging)
    if companion.is_none() {
        web_sys::console::warn_1(&"⚠ [data-companion] not found during boot".into());
    }
    if hearts.is_none() {
        web_sys::console::warn_1(&"⚠ [data-hearts] not found during boot".into());
    }
    if tracker_hearts.is_none() {
        web_sys::console::warn_1(&"⚠ [data-tracker-hearts-count] not found during boot".into());
    }
    if toast.is_none() {
        web_sys::console::warn_1(&"⚠ [data-toast] not found during boot".into());
    }

    state::with_state_mut(|s| {
        s.companion_element = companion;
        s.hearts_counter = hearts;
        s.tracker_hearts_counter = tracker_hearts;
        s.toast_element = toast;
    });
}

#[wasm_bindgen]
pub async fn restore_snapshot_for_test(snapshot_json: String) -> Result<(), JsValue> {
    db_client::restore_snapshot(snapshot_json).await
}

#[wasm_bindgen(start)]
pub fn start() {
  console_error_panic_hook::set_once();
  dom::init_trusted_types();
  let state = Rc::new(RefCell::new(AppState::default()));
  let document = dom::document();
  if document.ready_state() == "loading" {
    let state_clone = state.clone();
    let cb = wasm_bindgen::closure::Closure::once(move || {
      boot(state_clone.clone());
    });
    let _ = document.add_event_listener_with_callback("DOMContentLoaded", cb.as_ref().unchecked_ref());
    cb.forget();
  } else {
    boot(state.clone());
  }
}

#![allow(clippy::possible_missing_else)]
mod adaptive_quests;
mod animations;
mod assets;
mod badges;
pub(crate) mod bindings;
mod browser_apis;
mod celebration;
mod companion;
mod companion_care;
mod companion_skins;
mod companion_speech;
mod confetti;
pub(crate) mod constants;
mod db_client;
mod db_messages;
mod db_worker;
#[cfg(debug_assertions)]
mod debug;
mod domain_services;
mod dom;
mod errors;
mod family_board;
mod feature_flags;
mod game_catcher;
mod game_hug;
mod game_memory;
mod game_paint;
mod game_unicorn;
mod game_unicorn_audio;
mod game_unicorn_friends;
mod game_unicorn_sparkles;
mod game_unicorn_unicorn;
mod games;
mod garden_timeline;
mod gardens;
#[cfg(debug_assertions)]
mod gestures;
mod gpu;
mod gpu_particles;
mod lazy_loading;
mod metrics;
mod mom_mode;
mod native_apis;
pub(crate) mod navigation;
mod offline_queue;
mod onboarding;
mod parent_insights;
mod panel_registry;
mod progress;
mod pwa;
mod quests;
mod reflection;
mod reliability;
mod render;
mod rewards;
mod session_timer;
mod skill_progression;
mod skill_taxonomy;
mod sparkle_mail;
mod speech;
mod state;
mod storage_pressure;
mod stories;
mod story_data;
mod story_engine;
mod streaks;
mod synth_audio;
mod tap_ripple;
mod theme;
mod time_awareness;
mod tracker;
mod ui;
mod utils;
mod visibility;
mod weekly_goals;
use crate::state::AppState;
use futures::join;
use std::cell::RefCell;
use std::rc::Rc;
use wasm_bindgen::prelude::*;
use wasm_bindgen_futures::spawn_local;
fn boot(state: Rc<RefCell<AppState>>) {
    spawn_local(boot_async(state));
}
const fn update_loading_progress(_percent: u32) {
    // Loading screen now shows animated Sparkle bounce — no progress bar
}
async fn boot_async(state: Rc<RefCell<AppState>>) {
    metrics::mark("boot:start");
    #[cfg(debug_assertions)]
    debug::memory::capture_snapshot("boot:start");
    update_loading_progress(0);
    metrics::mark("boot:batch1:start");
    time_awareness::apply();
    session_timer::reset();
    navigation::init();
    native_apis::init_haptics();
    db_worker::init();
    metrics::mark("boot:batch1:end");
    metrics::measure("boot:batch1", "boot:batch1:start", "boot:batch1:end");
    spawn_local(async {
        gpu::init().await;
    });
    update_loading_progress(25);
    browser_apis::scheduler_yield().await;
    metrics::mark("boot:batch2:start");
    companion::init();
    cache_boot_elements();
    tracker::init();
    quests::init(state.clone());
    stories::init();
    rewards::init();
    streaks::init();
    games::init();
    mom_mode::init(state.clone());
    weekly_goals::refresh_goals();
    progress::init();
    reflection::init();
    gardens::init();
    family_board::init();
    garden_timeline::init();
    metrics::mark("boot:batch2:end");
    metrics::measure("boot:batch2", "boot:batch2:start", "boot:batch2:end");
    update_loading_progress(50);
    browser_apis::scheduler_yield().await;
    metrics::mark("boot:batch3:start");
    visibility::init();
    synth_audio::init();
    tap_ripple::init();
    pwa::init();
    celebration::init();
    metrics::init_web_vitals();
    metrics::mark("boot:batch3:end");
    metrics::measure("boot:batch3", "boot:batch3:start", "boot:batch3:end");
    update_loading_progress(75);
    browser_apis::scheduler_yield().await;
    metrics::mark("boot:batch4:start");
    db_client::wait_for_ready().await;
    feature_flags::ensure_defaults().await;
    if let Err(e) = offline_queue::init().await {
        dom::warn(&format!("[boot] offline_queue::init failed: {e:?}"));
    }
    if let Err(e) = errors::init_schema().await {
        dom::warn(&format!("[boot] errors::init_schema failed: {e:?}"));
    }
    hydrate_state().await;
    companion_care::hydrate().await;
    companion_care::update_mood().await;
    metrics::mark("boot:batch4:end");
    metrics::measure("boot:batch4", "boot:batch4:start", "boot:batch4:end");
    update_loading_progress(95);
    browser_apis::scheduler_yield().await;
    {
        browser_apis::on_visibility_change(move |visible| {
            synth_audio::on_visibility_change(visible);
            gpu_particles::set_paused(!visible);
            if visible {
                session_timer::reset();
                browser_apis::spawn_local_logged("offline_queue::flush", async {
                    offline_queue::flush_queue().await
                });
            }
        });
    }
    dom::on(
        dom::window().unchecked_ref(),
        "pagehide",
        |_: web_sys::Event| {
            db_client::flush_sync();
        },
    );
    if gpu::is_available() {
        dom::on(
            dom::window().unchecked_ref(),
            "resize",
            |_: web_sys::Event| {
                gpu::resize_canvas();
            },
        );
    }
    update_loading_progress(100);
    if let Some(screen) = dom::query("#loading-screen") {
        let _ = screen.class_list().add_1("loading-screen--exit");
        browser_apis::sleep_ms(600).await;
        dom::set_attr(&screen, "hidden", "");
    }
    if let Some(companion) = dom::query(constants::SELECTOR_COMPANION) {
        let _ = companion.class_list().add_1("entrance-visible");
    }
    for btn in dom::query_all("[data-home-btn]") {
        let _ = btn.class_list().add_1("entrance-visible");
    }
    // Image error fallback: mark failed images so CSS shows emoji
    if let Some(grid) = dom::query(".home-grid") {
        let cb = wasm_bindgen::closure::Closure::<dyn FnMut(web_sys::Event)>::new(
            move |event: web_sys::Event| {
                if let Some(target) = event.target() {
                    if let Ok(el) = target.dyn_into::<web_sys::Element>() {
                        if el.class_list().contains("home-btn-img") {
                            dom::set_attr(&el, "data-failed", "");
                        }
                    }
                }
            },
        );
        let opts = web_sys::AddEventListenerOptions::new();
        opts.set_capture(true);
        let _ = grid.add_event_listener_with_callback_and_add_event_listener_options(
            "error",
            cb.as_ref().unchecked_ref(),
            &opts,
        );
        cb.forget();
    }
    tracker::render_daily_kindness();
    synth_audio::magic_wand();
    onboarding::init();
    #[cfg(debug_assertions)]
    gestures::setup_debug_gesture();
    spawn_local(check_reunion());
    companion::greet();
    browser_apis::spawn_local_logged("sparkle-mail", async {
        sparkle_mail::check_and_deliver().await;
        Ok(())
    });
    metrics::mark("boot:end");
    metrics::measure("boot:total", "boot:start", "boot:end");
    #[cfg(debug_assertions)]
    debug::memory::capture_snapshot("boot:end");
    #[cfg(debug_assertions)]
    if let Some(duration) = metrics::duration("boot:start", "boot:end") {
        dom::warn(&format!("[boot] Total boot time: {duration:.2}ms"));
    }
}
async fn check_reunion() {
    let now = utils::now_epoch_ms();
    let now_str = (now as u64).to_string();
    let prev = db_client::get_setting("last_session_ms").await;
    db_client::set_setting("last_session_ms", &now_str).await;
    if let Some(val_str) = prev {
        if let Ok(prev_ms) = val_str.parse::<f64>() {
            let elapsed_ms = now - prev_ms;
            let days_away = (elapsed_ms / 86_400_000.0) as u32;
            if days_away >= 1 {
                browser_apis::sleep_ms(800).await;
                companion::on_reunion(days_away);
            }
        }
    }
}
async fn hydrate_state() {
    let today = utils::today_key();
    companion_skins::seed_companion_skins().await;
    gardens::seed_gardens().await;
    let (counters_result, streak_result) = join!(
        db_client::query(
            "SELECT \
                COALESCE(SUM(hearts_earned), 0) as hearts_total, \
                COALESCE(SUM(CASE WHEN day_key = ?1 THEN hearts_earned ELSE 0 END), 0) as hearts_today, \
                (SELECT COUNT(*) FROM quests WHERE day_key = ?1 AND completed = 1) as quests_today \
            FROM kind_acts",
            vec![today.clone()],
        ),
        db_client::query(
            "SELECT day_key FROM streaks ORDER BY day_key DESC LIMIT 365",
            vec![],
        )
    );
    if let Ok(rows) = counters_result {
        if let Some(row) = rows.get(0) {
            let u = |k: &str| row.get(k).and_then(|v| v.as_u64()).map(|v| v as u32);
            state::with_state_mut(|s| {
                if let Some(v) = u("hearts_total") {
                    s.hearts_total = v;
                }
                if let Some(v) = u("hearts_today") {
                    s.hearts_today = v;
                }
                if let Some(v) = u("quests_today") {
                    s.quests_completed_today = v;
                }
            });
        }
    }
    let (sticker_result, story_result) = join!(
        db_client::query(
            "SELECT sticker_type FROM stickers ORDER BY earned_at ASC",
            vec![]
        ),
        db_client::query(
            "SELECT story_id FROM stories_progress WHERE completed = 1",
            vec![]
        )
    );
    let streak_days_set: std::collections::HashSet<String> = if let Ok(rows) = streak_result {
        let streak = count_streak_from_rows(&rows, &today);
        state::with_state_mut(|s| {
            s.streak_days = streak;
        });
        rows.as_array()
            .map(|arr| {
                arr.iter()
                    .filter_map(|r| r.get("day_key").and_then(|v| v.as_str()).map(String::from))
                    .collect::<std::collections::HashSet<String>>()
            })
            .unwrap_or_default()
    } else {
        dom::warn("Streak query failed during hydration");
        std::collections::HashSet::new()
    };
    if let Ok(rows) = sticker_result {
        if let Some(arr) = rows.as_array() {
            let sticker_types: Vec<String> = arr
                .iter()
                .filter_map(|r| r.get("sticker_type")?.as_str().map(String::from))
                .collect();
            let earned_count = sticker_types.len();
            rewards::hydrate_stickers_batch(&sticker_types);
            rewards::update_sticker_count(earned_count);
        }
    } else {
        dom::warn("Sticker query failed during hydration");
    }
    if let Ok(rows) = story_result {
        if let Some(arr) = rows.as_array() {
            for row in arr {
                let Some(sid) = row.get("story_id").and_then(|v| v.as_str()) else {
                    continue;
                };
                stories::hydrate_completed_story(sid);
            }
        }
    } else {
        dom::warn("Story progress query failed during hydration");
    }
    {
        const DAY_SELECTORS: [&str; 7] = [
            "[data-day-offset=\"0\"]",
            "[data-day-offset=\"1\"]",
            "[data-day-offset=\"2\"]",
            "[data-day-offset=\"3\"]",
            "[data-day-offset=\"4\"]",
            "[data-day-offset=\"5\"]",
            "[data-day-offset=\"6\"]",
        ];
        let mut day = today.clone();
        for (offset, selector) in DAY_SELECTORS.iter().enumerate() {
            if let Some(dot) = dom::query(selector) {
                if streak_days_set.contains(&day) {
                    dot.set_text_content(Some("\u{1F49C}"));
                    dom::set_attr(&dot, "class", "streak-day streak-day--active");
                }
                if offset == 0 {
                    let _ = dot.class_list().add_1("streak-day--today");
                }
            }
            day = utils::prev_day_key(&day);
        }
    }
    {
        let streak = state::with_state(|s| s.streak_days);
        for &milestone in theme::STREAK_MILESTONES {
            if streak >= milestone {
                if let Some(badge) = dom::query_data("milestone", &milestone.to_string()) {
                    dom::set_attr(&badge, "class", "streak-milestone streak-milestone--earned");
                }
            }
        }
    }
    if let Ok(rows) = db_client::query(
        "SELECT \
            COALESCE(MAX(CASE WHEN game_id = 'catcher' THEN score END), 0) as catcher_score, \
            COALESCE(MAX(CASE WHEN game_id = 'catcher' THEN level END), 0) as catcher_level, \
            COALESCE(MAX(CASE WHEN game_id = 'catcher' THEN combo END), 0) as catcher_combo, \
            COUNT(CASE WHEN game_id = 'memory_medium' THEN 1 END) as memory_medium_wins, \
            COALESCE(MIN(CASE WHEN game_id = 'memory_easy' AND duration_ms > 0 THEN duration_ms END), 0) as memory_easy_time, \
            COALESCE(MIN(CASE WHEN game_id = 'memory_medium' AND duration_ms > 0 THEN duration_ms END), 0) as memory_medium_time, \
            COALESCE(MIN(CASE WHEN game_id = 'memory_hard' AND duration_ms > 0 THEN duration_ms END), 0) as memory_hard_time, \
            COALESCE(MAX(CASE WHEN game_id = 'unicorn' THEN score END), 0) as unicorn_score, \
            COUNT(CASE WHEN game_id = 'hug' THEN 1 END) as hug_total, \
            COUNT(CASE WHEN game_id = 'paint' AND day_key = ?1 THEN 1 END) as paint_today, \
            COUNT(CASE WHEN day_key = ?1 THEN 1 END) as games_today \
        FROM game_scores",
        vec![today],
    )
    .await
    {
        if let Some(row) = rows.get(0) {
            let u = |k: &str| row.get(k).and_then(|v| v.as_u64()).map(|v| v as u32);
            state::with_state_mut(|s| {
                if let Some(v) = u("catcher_score") { s.catcher_high_score = v; }
                if let Some(v) = u("catcher_level") { s.catcher_best_level = v; }
                if let Some(v) = u("catcher_combo") { s.catcher_best_combo = v; }
                if let Some(v) = u("memory_medium_wins") { s.memory_wins_medium = v; }
                if let Some(v) = u("memory_easy_time") { s.memory_best_time_easy = v; }
                if let Some(v) = u("memory_medium_time") { s.memory_best_time_medium = v; }
                if let Some(v) = u("memory_hard_time") { s.memory_best_time_hard = v; }
                if let Some(v) = u("unicorn_score") { s.unicorn_high_score = v; }
                if let Some(v) = u("hug_total") { s.hug_completions = v; }
                if let Some(v) = u("paint_today") { s.paintings_today = v; }
                if let Some(v) = u("games_today") { s.games_played_today = v; }
            });
        }
    }
    let (badges_result, skin_result, gardens_result) = join!(
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
    if let Ok(rows) = badges_result {
        if let Some(v) = rows
            .get(0)
            .and_then(|r| r.get("earned_count"))
            .and_then(|v| v.as_u64())
        {
            state::with_state_mut(|s| {
                s.badges_earned = v as u32;
            });
        }
    }
    if let Ok(rows) = skin_result {
        if let Some(skin_id) = rows
            .get(0)
            .and_then(|r| r.get("id"))
            .and_then(|v| v.as_str())
        {
            state::with_state_mut(|s| {
                s.active_skin = skin_id.to_string();
            });
        }
    }
    if let Ok(rows) = gardens_result {
        if let Some(v) = rows
            .get(0)
            .and_then(|r| r.get("unlocked_count"))
            .and_then(|v| v.as_u64())
        {
            state::with_state_mut(|s| {
                s.gardens_unlocked = v as u32;
            });
        }
    }
    let (hearts_total, streak_days) = state::with_state(|s| (s.hearts_total, s.streak_days));
    ui::update_heart_counter(hearts_total);
    ui::update_streak(streak_days);
    games::hydrate_hub_stats();
}
fn count_streak_from_rows(rows: &serde_json::Value, today: &str) -> u32 {
    let Some(arr) = rows.as_array() else {
        return 0;
    };
    let mut streak = 0u32;
    let mut expected = today.to_string();
    for row in arr {
        let Some(dk) = row.get("day_key").and_then(|v| v.as_str()) else {
            continue;
        };
        if dk == expected {
            streak += 1;
            expected = utils::prev_day_key(&expected);
        } else {
            break;
        }
    }
    streak
}
fn cache_boot_elements() {
    use crate::dom;
    let companion = dom::query(constants::SELECTOR_COMPANION);
    let hearts = dom::query(constants::SELECTOR_HEARTS);
    let home_tracker_hearts = dom::query(constants::SELECTOR_HOME_TRACKER_HEARTS);
    let tracker_hearts = dom::query(constants::SELECTOR_TRACKER_HEARTS);
    let toast = dom::query(constants::SELECTOR_TOAST);
    for (el, sel) in [
        (&companion, constants::SELECTOR_COMPANION),
        (&hearts, constants::SELECTOR_HEARTS),
        (&home_tracker_hearts, constants::SELECTOR_HOME_TRACKER_HEARTS),
        (&tracker_hearts, constants::SELECTOR_TRACKER_HEARTS),
        (&toast, constants::SELECTOR_TOAST),
    ] {
        if el.is_none() {
            dom::warn(&format!("⚠ {sel} not found during boot"));
        }
    }
    state::with_state_mut(|s| {
        s.companion_element = companion;
        s.hearts_counter = hearts;
        s.home_tracker_hearts_counter = home_tracker_hearts;
        s.tracker_hearts_counter = tracker_hearts;
        s.toast_element = toast;
    });
}

#[cfg_attr(not(test), wasm_bindgen(start))]
pub fn start() {
    console_error_panic_hook::set_once();
    dom::init_trusted_types();
    let state = Rc::new(RefCell::new(AppState::default()));
    let document = dom::document();
    if document.ready_state() == "loading" {
        let state_clone = state;
        let cb = wasm_bindgen::closure::Closure::once_into_js(move || {
            boot(state_clone);
        });
        let _ = document.add_event_listener_with_callback("DOMContentLoaded", cb.unchecked_ref());
    } else {
        boot(state);
    }
}

#[cfg(all(test, target_arch = "wasm32"))]
mod wasm_tests {
    use super::count_streak_from_rows;
    use wasm_bindgen_test::wasm_bindgen_test;

    #[wasm_bindgen_test]
    fn streak_counts_contiguous_days() {
        let rows = serde_json::json!([
            { "day_key": "2026-03-03" },
            { "day_key": "2026-03-02" },
            { "day_key": "2026-03-01" }
        ]);
        assert_eq!(count_streak_from_rows(&rows, "2026-03-03"), 3);
    }

    #[wasm_bindgen_test]
    fn streak_stops_on_first_gap() {
        let rows = serde_json::json!([
            { "day_key": "2026-03-03" },
            { "day_key": "2026-03-01" },
            { "day_key": "2026-02-28" }
        ]);
        assert_eq!(count_streak_from_rows(&rows, "2026-03-03"), 1);
    }
}

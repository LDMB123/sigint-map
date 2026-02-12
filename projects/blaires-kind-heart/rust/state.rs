//! App state — unified AppState with hot/cold field annotations.
//! Data lives in SQLite (IndexedDB OPFS). This is the in-memory working state.
//!
//! Phase 3.1: Consolidated from split BootState/GameState into single AppState.
//! Hot/cold distinction preserved via doc comments for clarity.

/// Unified application state
/// Fields marked HOT: accessed frequently (>2x per session)
/// Fields marked COLD: write-only or boot-cached (0-2 reads after boot)
#[derive(Default, Clone)]
pub struct AppState {
    // ═══════════════════════════════════════════════════════════
    // HOT FIELDS — Daily counters (accessed every action)
    // ═══════════════════════════════════════════════════════════
    pub hearts_total: u32,        // Every kind act, UI counter updates
    pub hearts_today: u32,         // Daily tracking, celebration display
    pub streak_days: u32,          // Streak display, milestone celebrations
    pub quests_completed_today: u32, // Quest completion UI
    pub games_played_today: u32,   // Celebration display

    // ═══════════════════════════════════════════════════════════
    // HOT FIELDS — Game personal bests (displayed in games hub)
    // ═══════════════════════════════════════════════════════════
    pub catcher_high_score: u32,   // Catcher game high score display
    pub catcher_best_level: u32,   // Catcher game level display
    pub catcher_best_combo: u32,   // Catcher game combo display (read 2-3x)
    pub memory_wins_medium: u32,   // Memory unlock gate (hard mode)
    pub memory_best_time_easy: u32,   // Memory game best time
    pub memory_best_time_medium: u32, // Memory game best time
    pub memory_best_time_hard: u32,   // Memory game best time
    pub unicorn_high_score: u32,   // Unicorn game high score
    pub hug_completions: u32,      // Hug game completion count (read 2-3x)
    pub paintings_today: u32,      // Daily paintings created (read 2-3x)

    // ═══════════════════════════════════════════════════════════
    // HOT FIELDS — UI state (accessed on every companion render)
    // ═══════════════════════════════════════════════════════════
    pub active_skin: String,       // Active companion skin ID

    // ═══════════════════════════════════════════════════════════
    // HOT FIELDS — Cached DOM elements (initialized during boot)
    // ═══════════════════════════════════════════════════════════
    pub companion_element: Option<web_sys::Element>,     // [data-companion] — 9x per session
    pub hearts_counter: Option<web_sys::Element>,        // [data-hearts] — every kind act
    pub tracker_hearts_counter: Option<web_sys::Element>, // [data-tracker-hearts-count] — every kind act
    pub toast_element: Option<web_sys::Element>,         // [data-toast] — 2x per notification

    // ═══════════════════════════════════════════════════════════
    // COLD FIELDS — Write-only (updated during game, never read after)
    // ═══════════════════════════════════════════════════════════
    pub hug_unique_stages_seen: u32,  // Hug game stage variety
    pub unicorn_friends_collected: u32, // Unicorn game collectibles

    // ═══════════════════════════════════════════════════════════
    // COLD FIELDS — Boot-cached (loaded once, never accessed during gameplay)
    // ═══════════════════════════════════════════════════════════
    #[allow(dead_code)]  // Reserved for future quest chain UI
    pub chain_progress: u32,          // Quest chain current progress
    #[allow(dead_code)]  // Reserved for future quest chain UI
    pub chain_total: u32,             // Quest chain total required
    pub badges_earned: u32,           // Total badges earned count
    pub gardens_unlocked: u32,        // Gardens unlocked count

    // ═══════════════════════════════════════════════════════════
    // COLD FIELDS — Async loaded (loaded separately from main hydration)
    // ═══════════════════════════════════════════════════════════
    pub parent_pin_set: bool,         // Mom Mode PIN protection flag

    // ═══════════════════════════════════════════════════════════
    // COLD FIELDS — Cached game DOM elements (lazy initialized during game start)
    // ═══════════════════════════════════════════════════════════
    pub game_arena: Option<web_sys::Element>,          // #game-arena — 20x per session
    pub hug_sparkle_container: Option<web_sys::Element>, // [data-hug-sparkle] — 14x per game
    #[allow(dead_code)]  // Reserved for future emoji catch game
    pub catcher_area: Option<web_sys::Element>,         // [data-catcher-area] — 8x per game
}

// ============================================================================
// Phase 3.1: Unified thread_local! static infrastructure
// ============================================================================

use std::cell::RefCell;

thread_local! {
    /// Global AppState storage — unified hot + cold fields
    static APP_STATE: RefCell<AppState> = RefCell::new(AppState::default());
}

/// Read-only access to AppState
/// Returns result of closure applied to borrowed state
pub fn with_state<F, R>(f: F) -> R
where
    F: FnOnce(&AppState) -> R,
{
    APP_STATE.with(|state| f(&state.borrow()))
}

/// Mutable access to AppState
/// Returns result of closure applied to mutably borrowed state
pub fn with_state_mut<F, R>(f: F) -> R
where
    F: FnOnce(&mut AppState) -> R,
{
    APP_STATE.with(|state| f(&mut state.borrow_mut()))
}

// ============================================================================
// Phase 3.1: Element cache accessor helpers (simplified)
// ============================================================================

/// Read-only access to cached companion element
/// Returns None if element not yet cached
pub fn get_cached_companion() -> Option<web_sys::Element> {
    with_state(|state| state.companion_element.clone())
}

/// Read-only access to cached hearts counter element
/// Returns None if element not yet cached
pub fn get_cached_hearts_counter() -> Option<web_sys::Element> {
    with_state(|state| state.hearts_counter.clone())
}

/// Read-only access to cached tracker hearts counter element
/// Returns None if element not yet cached
pub fn get_cached_tracker_hearts_counter() -> Option<web_sys::Element> {
    with_state(|state| state.tracker_hearts_counter.clone())
}

/// Read-only access to cached game arena element
/// Returns None if element not yet cached
pub fn get_cached_game_arena() -> Option<web_sys::Element> {
    with_state(|state| state.game_arena.clone())
}

/// Read-only access to cached hug sparkle container element
/// Returns None if element not yet cached
pub fn get_cached_hug_sparkle() -> Option<web_sys::Element> {
    with_state(|state| state.hug_sparkle_container.clone())
}

/// Read-only access to cached toast element
/// Returns None if element not yet cached
pub fn get_cached_toast_element() -> Option<web_sys::Element> {
    with_state(|state| state.toast_element.clone())
}

// Dead Code Cleanup: get_cached_catcher_area() removed - never used
// Game elements are accessed directly via with_state() where needed

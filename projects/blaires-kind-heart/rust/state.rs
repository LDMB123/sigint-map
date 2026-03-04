#[derive(Default, Clone)]
pub struct AppState {
    pub hearts_total: u32,
    pub hearts_today: u32,
    pub streak_days: u32,
    pub quests_completed_today: u32,
    pub games_played_today: u32,
    pub catcher_high_score: u32,
    pub catcher_best_level: u32,
    pub catcher_best_combo: u32,
    pub memory_wins_medium: u32,
    pub memory_best_time_easy: u32,
    pub memory_best_time_medium: u32,
    pub memory_best_time_hard: u32,
    pub unicorn_high_score: u32,
    pub hug_completions: u32,
    pub paintings_today: u32,
    pub active_skin: String,
    pub companion_element: Option<web_sys::Element>,
    pub hearts_counter: Option<web_sys::Element>,
    pub home_tracker_hearts_counter: Option<web_sys::Element>,
    pub tracker_hearts_counter: Option<web_sys::Element>,
    pub toast_element: Option<web_sys::Element>,
    pub hug_unique_stages_seen: u32,
    pub unicorn_friends_collected: u32,
    pub badges_earned: u32,
    pub gardens_unlocked: u32,
    pub sparkle_mood: String,
    pub sparkle_last_fed_ms: f64,
    pub sparkle_last_pet_ms: f64,
    pub sparkle_last_play_ms: f64,
    pub sparkle_feeds_today: u32,
    pub parent_pin_set: bool,                 // Mom Mode PIN protection flag
    pub game_arena: Option<web_sys::Element>, // #game-arena — 20x per session
    pub hug_sparkle_container: Option<web_sys::Element>,
}
use std::cell::RefCell;
thread_local! {
    static APP_STATE: RefCell<AppState> = RefCell::new(AppState::default());
}
#[inline]
pub fn with_state<F, R>(f: F) -> R
where
    F: FnOnce(&AppState) -> R,
{
    APP_STATE.with(|state| f(&state.borrow()))
}
#[inline]
pub fn with_state_mut<F, R>(f: F) -> R
where
    F: FnOnce(&mut AppState) -> R,
{
    APP_STATE.with(|state| f(&mut state.borrow_mut()))
}
pub fn snapshot() -> std::rc::Rc<std::cell::RefCell<AppState>> {
    std::rc::Rc::new(std::cell::RefCell::new(with_state(|s| s.clone())))
}
#[inline]
pub fn get_cached_companion() -> Option<web_sys::Element> {
    with_state(|s| s.companion_element.clone())
}
#[inline]
pub fn get_cached_hearts_counter() -> Option<web_sys::Element> {
    with_state(|s| s.hearts_counter.clone())
}
#[inline]
pub fn get_cached_home_tracker_hearts_counter() -> Option<web_sys::Element> {
    with_state(|s| s.home_tracker_hearts_counter.clone())
}
#[inline]
pub fn get_cached_tracker_hearts_counter() -> Option<web_sys::Element> {
    with_state(|s| s.tracker_hearts_counter.clone())
}
#[inline]
pub fn get_cached_game_arena() -> Option<web_sys::Element> {
    with_state(|s| s.game_arena.clone())
}
#[inline]
pub fn get_cached_hug_sparkle() -> Option<web_sys::Element> {
    with_state(|s| s.hug_sparkle_container.clone())
}
#[inline]
pub fn get_cached_toast_element() -> Option<web_sys::Element> {
    with_state(|s| s.toast_element.clone())
}

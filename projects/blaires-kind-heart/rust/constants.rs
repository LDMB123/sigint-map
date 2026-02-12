//! String constants for DOM selectors, panel IDs, event names, etc.
//! Using &'static str instead of String to avoid repeated allocations.

// ──── Panel IDs ────
pub const PANEL_HOME: &str = "home-scene";
pub const PANEL_GAMES: &str = "panel-games";
pub const PANEL_PROGRESS: &str = "panel-progress";

// ──── CSS Selectors ────
pub const SELECTOR_PANEL: &str = ".panel";
pub const SELECTOR_APP: &str = "#app";
pub const SELECTOR_LOADING_BAR: &str = "[data-loading-bar]";
pub const SELECTOR_LOADING_CONTAINER: &str = ".loading-bar";
pub const SELECTOR_TRACKER_BODY: &str = "#tracker-body";
pub const SELECTOR_QUESTS_BODY: &str = "#quests-body";
pub const SELECTOR_STORIES_BODY: &str = "#stories-body";
pub const SELECTOR_REWARDS_BODY: &str = "#rewards-body";
pub const SELECTOR_PROGRESS_BODY: &str = "#progress-body";
pub const SELECTOR_GAMES_BODY: &str = "#games-body";

// ──── Data Attributes ────
pub const ATTR_PANEL_OPEN: &str = "data-panel-open";
pub const ATTR_PANEL_CLOSE: &str = "data-panel-close";
pub const ATTR_ACTIVE_PANEL: &str = "activePanel";

// ──── Custom Events ────
pub const EVENT_PANEL_LEAVING: &str = "panel-leaving";
pub const EVENT_PANEL_OPENED: &str = "panel-opened";

// ──── Misc ────
pub const ATTR_HIDDEN: &str = "hidden";
pub const ATTR_ARIA_HIDDEN: &str = "aria-hidden";
pub const ATTR_INERT: &str = "inert";
pub const ARIA_VALUENOW: &str = "aria-valuenow";

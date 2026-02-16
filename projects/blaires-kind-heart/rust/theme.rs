//! Color and layout constants. CSS custom properties do the real theming.
//! This module exists only so Rust code can reference theme values by name.

pub const HEARTS_PER_KIND_ACT: u32 = 1;
pub const HEARTS_PER_QUEST: u32 = 2;
pub const STICKER_EVERY_N_HEARTS: u32 = 5;

// Game reward constants
pub const HEARTS_PER_CATCHER_POINT: u32 = 3; // hearts = score / 3
pub const HEARTS_MEMORY_EASY: u32 = 1;
pub const HEARTS_MEMORY_MEDIUM: u32 = 3;
pub const HEARTS_MEMORY_HARD: u32 = 5;
pub const HEARTS_HUG_PER_STAGE: u32 = 1; // 5 stages = 5 hearts
pub const HEARTS_PER_PAINTING: u32 = 2;
pub const CATCHER_MAX_ITEMS: usize = 12;
pub const CATCHER_BASE_SPEED: f64 = 1.5; // pixels per frame at level 1
pub const MEMORY_PEEK_EASY_MS: u32 = 3000;
pub const MEMORY_PEEK_MEDIUM_MS: u32 = 2000;
pub const MEMORY_PEEK_HARD_MS: u32 = 1000;
pub const PAINT_MAX_UNDO: usize = 10;

// Catcher — multi-level arcade
pub const CATCHER_POINTS_PER_LEVEL: u32 = 15;
pub const CATCHER_SPEED_INCREASE: f64 = 0.15; // multiplier increase per level
pub const CATCHER_STARTING_LIVES: u32 = 3;
pub const CATCHER_MAX_LIVES: u32 = 5;
pub const CATCHER_COMBO_WINDOW_MS: f64 = 1500.0;
pub const CATCHER_BONUS_LIFE_INTERVAL: u32 = 5; // bonus life every N levels
pub const CATCHER_POWERUP_DURATION_MS: u32 = 8000;

// Memory — time stars
pub const MEMORY_3STAR_EASY_S: u32 = 30;
pub const MEMORY_3STAR_MEDIUM_S: u32 = 60;
pub const MEMORY_3STAR_HARD_S: u32 = 90;

// Hug — stage counts
pub const HUG_STAGES_PER_GAME: usize = 5;
pub const HUG_TOTAL_STAGE_TYPES: usize = 15;

// Paint
pub const PAINT_MIN_CANVAS: u32 = 300;

pub const STREAK_MILESTONES: &[u32] = &[3, 7, 14, 30];

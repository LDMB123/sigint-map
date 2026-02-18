//! Sparkle's Memory Match — progressive difficulty card matching game.
//! Easy (2x2), Medium (3x4), Hard (4x4).
//! Features: match streaks, time-based star rating, hints (Easy),
//! expanded 16-emoji card pool, move counter with efficiency bonus.
//! 3D flip animation via CSS rotateY + backface-visibility.

use std::cell::RefCell;
use std::rc::Rc;
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;
use web_sys::{Element, Event};

use crate::{
    browser_apis, confetti, dom, games, native_apis, render, speech,
    state::AppState, synth_audio, theme, ui, weekly_goals,
};

#[derive(Clone, Copy, PartialEq)]
enum Difficulty {
    Easy,   // 2x2 = 2 pairs
    Medium, // 3x4 = 6 pairs
    Hard,   // 4x4 = 8 pairs
}

impl Difficulty {
    fn pairs(&self) -> usize {
        match self {
            Self::Easy => 2,
            Self::Medium => 6,
            Self::Hard => 8,
        }
    }

    fn cols(&self) -> usize {
        match self {
            Self::Easy => 2,
            Self::Medium => 3,
            Self::Hard => 4,
        }
    }

    fn peek_ms(&self) -> u32 {
        match self {
            Self::Easy => theme::MEMORY_PEEK_EASY_MS,
            Self::Medium => theme::MEMORY_PEEK_MEDIUM_MS,
            Self::Hard => theme::MEMORY_PEEK_HARD_MS,
        }
    }

    fn hearts(&self) -> u32 {
        match self {
            Self::Easy => theme::HEARTS_MEMORY_EASY,
            Self::Medium => theme::HEARTS_MEMORY_MEDIUM,
            Self::Hard => theme::HEARTS_MEMORY_HARD,
        }
    }

    fn star_target_s(&self) -> u32 {
        match self {
            Self::Easy => theme::MEMORY_3STAR_EASY_S,
            Self::Medium => theme::MEMORY_3STAR_MEDIUM_S,
            Self::Hard => theme::MEMORY_3STAR_HARD_S,
        }
    }

    fn min_moves(&self) -> u32 {
        // Perfect play = exactly pairs() moves (each move flips 2 cards = 1 pair)
        self.pairs() as u32
    }
}

/// Card theme sets — player picks before game start
#[derive(Clone, Copy, PartialEq)]
enum CardTheme {
    MagicalForest,
    OceanFriends,
    SpaceAdventure,
    GardenBugs,
    YummyFood,
    MusicParty,
}

impl CardTheme {
    fn name(&self) -> &str {
        match self {
            Self::MagicalForest => "\u{1F332} Magical Forest",
            Self::OceanFriends => "\u{1F30A} Ocean Friends",
            Self::SpaceAdventure => "\u{1F680} Space Adventure",
            Self::GardenBugs => "\u{1F98B} Garden Bugs",
            Self::YummyFood => "\u{1F355} Yummy Food",
            Self::MusicParty => "\u{1F3B8} Music Party",
        }
    }

    fn attr(&self) -> &'static str {
        match self {
            Self::MagicalForest => "forest",
            Self::OceanFriends => "ocean",
            Self::SpaceAdventure => "space",
            Self::GardenBugs => "bugs",
            Self::YummyFood => "food",
            Self::MusicParty => "music",
        }
    }

    fn class_suffix(&self) -> &'static str {
        self.attr()
    }

    fn faces(&self) -> &[(&str, &str, f32)] {
        match self {
            Self::MagicalForest => &[
                ("\u{1F984}", "Unicorn", 523.25),      // C5
                ("\u{1F430}", "Bunny", 587.33),        // D5
                ("\u{1F98A}", "Fox", 659.25),          // E5
                ("\u{1F98B}", "Butterfly", 698.46),    // F5
                ("\u{1F33B}", "Sunflower", 783.99),    // G5
                ("\u{1F409}", "Dragon", 880.0),        // A5
                ("\u{1F451}", "Crown", 987.77),        // B5
                ("\u{1F48E}", "Diamond", 1046.50),     // C6
            ],
            Self::OceanFriends => &[
                ("\u{1F42C}", "Dolphin", 523.25),      // C5
                ("\u{1F427}", "Penguin", 587.33),      // D5
                ("\u{1F419}", "Octopus", 659.25),      // E5
                ("\u{1F420}", "Fish", 698.46),         // F5
                ("\u{1F41A}", "Shell", 783.99),        // G5
                ("\u{1F40B}", "Whale", 880.0),         // A5
                ("\u{1F988}", "Shark", 987.77),        // B5
                ("\u{1F9AD}", "Seal", 1046.50),        // C6
            ],
            Self::SpaceAdventure => &[
                ("\u{1F680}", "Rocket", 523.25),       // C5
                ("\u{1F319}", "Moon", 587.33),         // D5
                ("\u{2B50}", "Star", 659.25),          // E5
                ("\u{1F52D}", "Telescope", 698.46),    // F5
                ("\u{1FA90}", "Ringed Planet", 783.99),// G5
                ("\u{1F6F8}", "UFO", 880.0),           // A5
                ("\u{1F47D}", "Alien", 987.77),        // B5
                ("\u{2604}", "Comet", 1046.50),        // C6
            ],
            Self::GardenBugs => &[
                ("\u{1FAB1}", "Worm", 523.25),
                ("\u{1F41E}", "Ladybug", 587.33),
                ("\u{1F41D}", "Bee", 659.25),
                ("\u{1F41B}", "Caterpillar", 698.46),
                ("\u{1F40C}", "Snail", 783.99),
                ("\u{1F41C}", "Ant", 880.0),
                ("\u{1FAB2}", "Beetle", 987.77),
                ("\u{1F997}", "Cricket", 1046.50),
            ],
            Self::YummyFood => &[
                ("\u{1F355}", "Pizza", 523.25),
                ("\u{1F36A}", "Cookie", 587.33),
                ("\u{1F366}", "Ice Cream", 659.25),
                ("\u{1F349}", "Watermelon", 698.46),
                ("\u{1F34C}", "Banana", 783.99),
                ("\u{1F9C1}", "Cupcake", 880.0),
                ("\u{1F369}", "Donut", 987.77),
                ("\u{1F353}", "Strawberry", 1046.50),
            ],
            Self::MusicParty => &[
                ("\u{1F3B8}", "Guitar", 523.25),
                ("\u{1F941}", "Drums", 587.33),
                ("\u{1F3B9}", "Piano", 659.25),
                ("\u{1F3BA}", "Trumpet", 698.46),
                ("\u{1F3BB}", "Violin", 783.99),
                ("\u{1FA87}", "Maracas", 880.0),
                ("\u{1F3A4}", "Microphone", 987.77),
                ("\u{1F3B7}", "Saxophone", 1046.50),
            ],
        }
    }
}

/// Flip animation styles
#[derive(Clone, Copy, PartialEq)]
enum FlipStyle {
    Classic,  // Standard 3D rotateY
    Bounce,   // Bounce + flip
    Spiral,   // Spiral in
}

impl FlipStyle {
    fn class(&self) -> &str {
        match self {
            Self::Classic => "flip-classic",
            Self::Bounce => "flip-bounce",
            Self::Spiral => "flip-spiral",
        }
    }
}

struct MemoryState {
    difficulty: Difficulty,
    theme: CardTheme,
    flip_style: FlipStyle,
    cards: Vec<MemoryCard>,
    /// Maps internal card face index → theme face for this game
    face_map: Vec<usize>,
    flipped: Vec<usize>,
    matched: usize,
    moves: u32,
    total_pairs: usize,
    active: bool,
    locked: bool,
    phase: MemoryPhase,
    state: Rc<RefCell<AppState>>,
    _abort: browser_apis::AbortHandle,
    // Streak tracking
    consecutive_matches: u32,
    best_streak: u32,
    streak_bonus_hearts: u32,
    // Timer
    start_time_ms: f64,
    elapsed_s: u32,
    timer_interval: Option<i32>,
    // Hints (Easy only)
    hints_remaining: u32,
    hint_timeout: Option<i32>,
    no_match_timer: Option<i32>,
}

#[derive(Clone, Copy, PartialEq)]
enum MemoryPhase {
    ThemeSelect,
    DifficultySelect,
    Playing,
    EndScreen,
}

struct MemoryCard {
    face_idx: usize, // index into face_map
    matched: bool,
    flipped: bool,
}

thread_local! {
    static GAME: RefCell<Option<MemoryState>> = const { RefCell::new(None) };
}


pub fn start(state: Rc<RefCell<AppState>>) {
    let abort = browser_apis::new_abort_handle();
    let signal = abort.signal();

    GAME.with(|g| {
        *g.borrow_mut() = Some(MemoryState {
            difficulty: Difficulty::Easy,
            theme: CardTheme::MagicalForest,
            flip_style: FlipStyle::Classic,
            cards: Vec::new(),
            face_map: Vec::new(),
            flipped: Vec::new(),
            matched: 0,
            moves: 0,
            total_pairs: 0,
            active: false,
            locked: false,
            phase: MemoryPhase::ThemeSelect,
            state: state.clone(),
            _abort: abort,
            consecutive_matches: 0,
            best_streak: 0,
            streak_bonus_hearts: 0,
            start_time_ms: 0.0,
            elapsed_s: 0,
            timer_interval: None,
            hints_remaining: 0,
            hint_timeout: None,
            no_match_timer: None,
        });
    });

    show_theme_select(state.clone());
    bind_unified_click_handler(state, &signal);
}

/// Single unified click handler for all memory game phases.
fn bind_unified_click_handler(state: Rc<RefCell<AppState>>, signal: &web_sys::AbortSignal) {
    let Some(arena) = dom::query("#game-arena") else { return };
    let s = state.clone();
    dom::on_with_signal(arena.unchecked_ref(), "click", signal, move |event: Event| {
        let target = event.target().and_then(|t| t.dyn_into::<Element>().ok());
        let Some(el) = target else { return };

        let phase = GAME.with(|g| {
            g.borrow().as_ref().map(|game| game.phase)
        });
        let Some(phase) = phase else { return };

        match phase {
            MemoryPhase::ThemeSelect => {
                if let Ok(Some(btn)) = el.closest("[data-memory-theme]") {
                    let theme_str = btn.get_attribute("data-memory-theme").unwrap_or_default();
                    let theme = match theme_str.as_str() {
                        "forest" => CardTheme::MagicalForest,
                        "ocean" => CardTheme::OceanFriends,
                        "space" => CardTheme::SpaceAdventure,
                        "bugs" => CardTheme::GardenBugs,
                        "food" => CardTheme::YummyFood,
                        "music" => CardTheme::MusicParty,
                        _ => return,
                    };
                    GAME.with(|g| {
                        if let Some(game) = g.borrow_mut().as_mut() {
                            game.theme = theme;
                            // Pick random flip style
                            let rand = js_sys::Math::random();
                            game.flip_style = if rand < 0.33 {
                                FlipStyle::Classic
                            } else if rand < 0.66 {
                                FlipStyle::Bounce
                            } else {
                                FlipStyle::Spiral
                            };
                        }
                    });
                    show_difficulty_select(s.clone());
                }
            }
            MemoryPhase::DifficultySelect => {
                if let Ok(Some(btn)) = el.closest("[data-memory-diff]") {
                    let diff_str = btn.get_attribute("data-memory-diff").unwrap_or_default();
                    if btn.get_attribute("disabled").is_some() { return; }
                    let diff = match diff_str.as_str() {
                        "easy" => Difficulty::Easy,
                        "medium" => Difficulty::Medium,
                        "hard" => Difficulty::Hard,
                        _ => return,
                    };
                    start_game(diff, s.clone());
                }
            }
            MemoryPhase::Playing => {
                // Hint button
                if let Ok(Some(_)) = el.closest("[data-memory-hint]") {
                    use_hint();
                    return;
                }
                if let Ok(Some(card)) = el.closest("[data-card-idx]") {
                    let idx_str = card.get_attribute("data-card-idx").unwrap_or_default();
                    let Ok(idx) = idx_str.parse::<usize>() else { return };
                    on_card_tap(idx, &card);
                }
            }
            MemoryPhase::EndScreen => {
                if let Ok(Some(_)) = el.closest("[data-game-again]") {
                    GAME.with(|g| {
                        if let Some(game) = g.borrow_mut().as_mut() {
                            game.phase = MemoryPhase::ThemeSelect;
                        }
                    });
                    show_theme_select(s.clone());
                } else if let Ok(Some(_)) = el.closest("[data-game-back]") {
                    cleanup();
                    games::return_to_menu();
                }
            }
        }
    });
}

fn show_theme_select(_state: Rc<RefCell<AppState>>) {
    let Some((_arena, buttons)) = render::build_game_picker("\u{1F0CF} Choose Your Theme!") else { return };

    GAME.with(|g| {
        if let Some(game) = g.borrow_mut().as_mut() {
            game.phase = MemoryPhase::ThemeSelect;
        }
    });

    let doc = dom::document();
    for theme in [
        CardTheme::MagicalForest,
        CardTheme::OceanFriends,
        CardTheme::SpaceAdventure,
        CardTheme::GardenBugs,
        CardTheme::YummyFood,
        CardTheme::MusicParty,
    ] {
        let css = format!("game-card game-card--{}", theme.class_suffix());
        let btn = render::create_button(&doc, &css, theme.name());
        let _ = btn.set_attribute("data-memory-theme", theme.attr());
        let _ = buttons.append_child(&btn);
    }
}

fn show_difficulty_select(state: Rc<RefCell<AppState>>) {
    let Some((_arena, buttons)) = render::build_game_picker("\u{1F0CF} Pick a Level!") else { return };
    let doc = dom::document();

    GAME.with(|g| {
        if let Some(game) = g.borrow_mut().as_mut() {
            game.phase = MemoryPhase::DifficultySelect;
        }
    });

    // Show best times on buttons if available
    let (best_easy, best_med, best_hard, medium_wins) = {
        let s = state.borrow();
        (s.memory_best_time_easy, s.memory_best_time_medium, s.memory_best_time_hard, s.memory_wins_medium)
    };

    let easy_label = if best_easy > 0 {
        format!("\u{1F31F} Easy (2\u{00D7}2) \u{2022} Best: {}s", best_easy)
    } else {
        "\u{1F31F} Easy (2\u{00D7}2)".into()
    };
    let medium_label = if best_med > 0 {
        format!("\u{2B50} Medium (3\u{00D7}4) \u{2022} Best: {}s", best_med)
    } else {
        "\u{2B50} Medium (3\u{00D7}4)".into()
    };

    let easy_btn = render::create_button(&doc, "game-card game-card--easy", &easy_label);
    let _ = easy_btn.set_attribute("data-memory-diff", "easy");
    let medium_btn = render::create_button(&doc, "game-card game-card--medium", &medium_label);
    let _ = medium_btn.set_attribute("data-memory-diff", "medium");
    let hard_btn = render::create_button(&doc, "game-card game-card--hard", "");
    let _ = hard_btn.set_attribute("data-memory-diff", "hard");

    // Lock hard mode until 3 medium wins
    if medium_wins < 3 {
        let _ = hard_btn.set_attribute("disabled", "");
        hard_btn.set_text_content(Some(&format!("\u{1F512} Hard (win Medium {}/3)", medium_wins)));
    } else {
        let hard_label = if best_hard > 0 {
            format!("\u{1F525} Hard (4\u{00D7}4) \u{2022} Best: {}s", best_hard)
        } else {
            "\u{1F525} Hard (4\u{00D7}4)".into()
        };
        hard_btn.set_text_content(Some(&hard_label));
    }

    let _ = buttons.append_child(&easy_btn);
    let _ = buttons.append_child(&medium_btn);
    let _ = buttons.append_child(&hard_btn);
}

fn start_game(difficulty: Difficulty, _state: Rc<RefCell<AppState>>) {
    let pairs = difficulty.pairs();

    let (theme, flip_style) = GAME.with(|g| {
        g.borrow().as_ref().map(|game| (game.theme, game.flip_style))
            .unwrap_or((CardTheme::MagicalForest, FlipStyle::Classic))
    });

    // Pick random card faces from the theme
    let face_map = pick_random_faces(theme, pairs);

    // Build card pairs using local indices (0..pairs)
    let mut card_indices: Vec<usize> = Vec::new();
    for i in 0..pairs {
        card_indices.push(i);
        card_indices.push(i);
    }
    // Fisher-Yates shuffle
    for i in (1..card_indices.len()).rev() {
        let j = (js_sys::Math::random() * (i + 1) as f64) as usize;
        card_indices.swap(i, j);
    }

    let cards: Vec<MemoryCard> = card_indices.iter().map(|&idx| MemoryCard {
        face_idx: idx,
        matched: false,
        flipped: false,
    }).collect();

    let now = js_sys::Date::now();
    let hints = if difficulty == Difficulty::Easy { 3 } else { 0 };

    GAME.with(|g| {
        if let Some(game) = g.borrow_mut().as_mut() {
            game.difficulty = difficulty;
            game.cards = cards;
            game.face_map = face_map.clone();
            game.flipped = Vec::new();
            game.matched = 0;
            game.moves = 0;
            game.total_pairs = pairs;
            game.active = true;
            game.locked = false;
            game.phase = MemoryPhase::Playing;
            game.consecutive_matches = 0;
            game.best_streak = 0;
            game.streak_bonus_hearts = 0;
            game.start_time_ms = now;
            game.elapsed_s = 0;
            game.hints_remaining = hints;
            game.hint_timeout = None;
            game.no_match_timer = None;
        }
    });

    render_board(difficulty, theme, flip_style, &card_indices, &face_map, hints);
    peek_cards(difficulty);

    // Start timer after peek ends
    let peek_ms = difficulty.peek_ms();
    dom::set_timeout_once(peek_ms as i32, move || {
        start_timer();
        // Start hint timer for Easy mode
        if difficulty == Difficulty::Easy {
            reset_hint_timer();
        }
    });
}

/// Pick N random unique faces from the chosen theme
fn pick_random_faces(theme: CardTheme, n: usize) -> Vec<usize> {
    let total = theme.faces().len();
    let mut indices: Vec<usize> = (0..total).collect();
    // Fisher-Yates partial shuffle: pick first n
    for i in 0..n.min(total) {
        let j = i + (js_sys::Math::random() * (total - i) as f64) as usize;
        indices.swap(i, j);
    }
    indices[..n.min(total)].to_vec()
}

fn render_board(difficulty: Difficulty, theme: CardTheme, flip_style: FlipStyle, card_indices: &[usize], face_map: &[usize], hints: u32) {
    let Some(arena) = dom::query("#game-arena") else { return };
    let doc = dom::document();
    dom::safe_set_inner_html(&arena, "");

    let container = render::create_el_with_class(&doc, "div", "memory-container");

    // HUD row 1: moves + pairs
    let hud = render::create_el_with_class(&doc, "div", "memory-hud");

    let moves_el = render::create_el_with_class(&doc, "span", "memory-moves");
    moves_el.set_text_content(Some("Moves: 0"));
    let _ = moves_el.set_attribute("data-memory-moves", "");

    let pairs_el = render::create_el_with_class(&doc, "span", "memory-pairs");
    pairs_el.set_text_content(Some(&format!("Pairs: 0/{}", difficulty.pairs())));
    let _ = pairs_el.set_attribute("data-memory-pairs", "");

    let timer_el = render::create_el_with_class(&doc, "span", "memory-timer");
    timer_el.set_text_content(Some("\u{23F1} 0s"));
    let _ = timer_el.set_attribute("data-memory-timer", "");

    let _ = hud.append_child(&moves_el);
    let _ = hud.append_child(&pairs_el);
    let _ = hud.append_child(&timer_el);

    // HUD row 2: streak + hints
    let hud2 = render::create_el_with_class(&doc, "div", "memory-hud memory-hud--row2");

    let streak_el = render::create_el_with_class(&doc, "span", "memory-streak");
    let _ = streak_el.set_attribute("data-memory-streak", "");
    let _ = hud2.append_child(&streak_el);

    // Hint button (Easy only)
    if hints > 0 {
        let hint_btn = render::create_button(&doc, "memory-hint-btn", &format!("\u{1F4A1} Hint ({})", hints));
        let _ = hint_btn.set_attribute("data-memory-hint", "");
        let _ = hud2.append_child(&hint_btn);
    }

    // Grid with flip style
    let grid = render::create_el_with_class(&doc, "div",
        &format!("memory-grid memory-grid--{} memory-grid--{}", difficulty.cols(), flip_style.class()));

    let faces = theme.faces();
    for (i, &face_idx) in card_indices.iter().enumerate() {
        let card = render::create_el_with_class(&doc, "div", "memory-card");
        let _ = card.set_attribute("data-card-idx", &i.to_string());

        let card_inner = render::create_el_with_class(&doc, "div", "memory-card-inner");

        let card_front = render::create_el_with_class(&doc, "div", "memory-card-front");
        card_front.set_text_content(Some("\u{2753}")); // question mark

        let card_back = render::create_el_with_class(&doc, "div", "memory-card-back");
        let theme_face_idx = face_map[face_idx];
        let (emoji, _name, _freq) = faces[theme_face_idx];
        card_back.set_text_content(Some(emoji));

        let _ = card_inner.append_child(&card_front);
        let _ = card_inner.append_child(&card_back);
        let _ = card.append_child(&card_inner);
        let _ = grid.append_child(&card);
    }

    let _ = container.append_child(&hud);
    let _ = container.append_child(&hud2);
    let _ = container.append_child(&grid);
    let _ = arena.append_child(&container);
}

fn peek_cards(difficulty: Difficulty) {
    let cards = dom::query_all(".memory-card");
    for card in &cards {
        let _ = card.class_list().add_1("memory-card--flipped");
    }

    let peek_ms = difficulty.peek_ms();
    dom::set_timeout_once(peek_ms as i32, move || {
        let cards = dom::query_all(".memory-card");
        for card in &cards {
            let _ = card.class_list().remove_1("memory-card--flipped");
        }
    });
}

/// Start the game timer (ticks every second)
fn start_timer() {
    let cb = Closure::<dyn FnMut()>::new(move || {
        GAME.with(|g| {
            let mut borrow = g.borrow_mut();
            let Some(game) = borrow.as_mut() else { return };
            if !game.active { return; }
            let now = js_sys::Date::now();
            game.elapsed_s = ((now - game.start_time_ms) / 1000.0) as u32;
            dom::set_text("[data-memory-timer]", &format!("\u{23F1} {}s", game.elapsed_s));
        });
    });
    let window = dom::window();
    let id = window.set_interval_with_callback_and_timeout_and_arguments_0(
        cb.as_ref().unchecked_ref(), 1000,
    ).unwrap_or(0);
    // Store closure on arena element — GC'd when arena is cleared instead of leaked
    if let Some(arena) = dom::query("#game-arena") {
        let key = wasm_bindgen::JsValue::from_str("__memory_timer_closure");
        let _ = js_sys::Reflect::set(&arena, &key, cb.as_ref().unchecked_ref());
    }
    cb.forget();

    GAME.with(|g| {
        if let Some(game) = g.borrow_mut().as_mut() {
            game.timer_interval = Some(id);
        }
    });
}

/// Stop the game timer
fn stop_timer() {
    GAME.with(|g| {
        if let Some(game) = g.borrow_mut().as_mut() {
            if let Some(id) = game.timer_interval.take() {
                dom::window().clear_interval_with_handle(id);
            }
        }
    });
}

/// Use a hint: briefly glow one unmatched card
fn use_hint() {
    GAME.with(|g| {
        let mut borrow = g.borrow_mut();
        let Some(game) = borrow.as_mut() else { return };
        if game.hints_remaining == 0 || !game.active { return; }
        game.hints_remaining -= 1;

        // Update hint button text
        if game.hints_remaining > 0 {
            dom::set_text("[data-memory-hint]", &format!("\u{1F4A1} Hint ({})", game.hints_remaining));
        } else {
            // Disable hint button
            if let Some(btn) = dom::query("[data-memory-hint]") {
                btn.set_text_content(Some("\u{1F4A1} No hints"));
                let _ = btn.set_attribute("disabled", "");
            }
        }

        // Find an unmatched, unflipped card
        let unmatched: Vec<usize> = game.cards.iter().enumerate()
            .filter(|(_, c)| !c.matched && !c.flipped)
            .map(|(i, _)| i)
            .collect();
        if unmatched.is_empty() { return; }

        let pick = unmatched[(js_sys::Math::random() * unmatched.len() as f64) as usize];
        let selector = format!("[data-card-idx=\"{pick}\"]");
        if let Some(card_el) = dom::query(&selector) {
            let _ = card_el.class_list().add_1("memory-card--hint");
            synth_audio::dreamy();
            // Remove hint glow after 800ms
            let sel = selector.clone();
            dom::set_timeout_once(800, move || {
                if let Some(el) = dom::query(&sel) {
                    let _ = el.class_list().remove_1("memory-card--hint");
                }
            });
        }
    });
}

/// Reset the no-match timer (for auto-hint on Easy)
fn reset_hint_timer() {
    // Clear existing
    GAME.with(|g| {
        if let Some(game) = g.borrow_mut().as_mut() {
            if let Some(id) = game.no_match_timer.take() {
                dom::window().clear_timeout_with_handle(id);
            }
        }
    });

    // Set new 10s timer: auto-glow hint if no match
    let cb = Closure::<dyn FnMut()>::once(move || {
        let should_hint = GAME.with(|g| {
            let borrow = g.borrow();
            let Some(game) = borrow.as_ref() else { return false };
            game.active && game.hints_remaining > 0 && game.difficulty == Difficulty::Easy
        });
        if should_hint {
            // Auto-glow a card (but don't consume a hint — just a gentle nudge)
            auto_glow_hint();
        }
    });
    let id = dom::window().set_timeout_with_callback_and_timeout_and_arguments_0(
        cb.as_ref().unchecked_ref(), 10_000,
    ).unwrap_or(0);
    // Store closure on arena element — GC'd when arena is cleared instead of leaked
    if let Some(arena) = dom::query("#game-arena") {
        let key = wasm_bindgen::JsValue::from_str("__memory_hint_closure");
        let _ = js_sys::Reflect::set(&arena, &key, cb.as_ref().unchecked_ref());
    }
    cb.forget();

    GAME.with(|g| {
        if let Some(game) = g.borrow_mut().as_mut() {
            game.no_match_timer = Some(id);
        }
    });
}

/// Auto-glow an unmatched card after 10s of no progress (doesn't consume hints)
fn auto_glow_hint() {
    GAME.with(|g| {
        let borrow = g.borrow();
        let Some(game) = borrow.as_ref() else { return };
        if !game.active { return; }

        let unmatched: Vec<usize> = game.cards.iter().enumerate()
            .filter(|(_, c)| !c.matched && !c.flipped)
            .map(|(i, _)| i)
            .collect();
        if unmatched.is_empty() { return; }

        let pick = unmatched[(js_sys::Math::random() * unmatched.len() as f64) as usize];
        let selector = format!("[data-card-idx=\"{pick}\"]");
        if let Some(card_el) = dom::query(&selector) {
            let _ = card_el.class_list().add_1("memory-card--hint");
            let sel = selector.clone();
            dom::set_timeout_once(500, move || {
                if let Some(el) = dom::query(&sel) {
                    let _ = el.class_list().remove_1("memory-card--hint");
                }
            });
        }
    });
}

fn on_card_tap(idx: usize, card_el: &Element) {
    GAME.with(|g| {
        let mut borrow = g.borrow_mut();
        let Some(game) = borrow.as_mut() else { return };
        if !game.active || game.locked { return; }
        if idx >= game.cards.len() { return; }
        if game.cards[idx].matched || game.cards[idx].flipped { return; }

        // Flip the card
        game.cards[idx].flipped = true;
        game.flipped.push(idx);
        let _ = card_el.class_list().add_1("memory-card--flipped");

        // Play theme-specific flip sound
        match game.theme {
            CardTheme::MagicalForest => synth_audio::chime(),
            CardTheme::OceanFriends => synth_audio::dreamy(),
            CardTheme::SpaceAdventure => synth_audio::whoosh(),
            CardTheme::GardenBugs => synth_audio::sparkle(),
            CardTheme::YummyFood => synth_audio::tap(),
            CardTheme::MusicParty => synth_audio::magic_wand(),
        }

        // Spawn particle trail
        spawn_flip_particles(card_el);
        native_apis::vibrate_tap();

        if game.flipped.len() == 2 {
            game.moves += 1;
            dom::set_text("[data-memory-moves]", &format!("Moves: {}", game.moves));

            let idx_a = game.flipped[0];
            let idx_b = game.flipped[1];

            if game.cards[idx_a].face_idx == game.cards[idx_b].face_idx {
                // ===== MATCH! =====
                game.cards[idx_a].matched = true;
                game.cards[idx_b].matched = true;
                game.matched += 1;
                game.flipped.clear();
                game.consecutive_matches += 1;
                if game.consecutive_matches > game.best_streak {
                    game.best_streak = game.consecutive_matches;
                }

                let streak = game.consecutive_matches;
                let matched = game.matched;
                let total = game.total_pairs;

                dom::set_text("[data-memory-pairs]", &format!("Pairs: {matched}/{total}"));

                // Streak bonus hearts
                let streak_bonus = match streak {
                    3 => 1,
                    4 => 2,
                    s if s >= 5 => 3,
                    _ => 0,
                };
                game.streak_bonus_hearts += streak_bonus;

                // Sound — pitch rises with streak
                match streak {
                    1 => synth_audio::chime(),
                    2 => synth_audio::sparkle(),
                    3 => { synth_audio::sparkle(); synth_audio::chime(); }
                    4 => synth_audio::magic_wand(),
                    _ => synth_audio::rainbow_burst(),
                }

                // Update streak display
                update_streak_display(streak);

                // Mark matched cards with pulse animation
                let sel_a = format!("[data-card-idx=\"{idx_a}\"]");
                let sel_b = format!("[data-card-idx=\"{idx_b}\"]");
                if let Some(ca) = dom::query(&sel_a) {
                    let _ = ca.class_list().add_1("memory-card--matched");
                    // Glow brighter per streak
                    if streak >= 3 {
                        let _ = ca.class_list().add_1(&format!("memory-card--streak-{}", streak.min(5)));
                    }
                }
                if let Some(cb_el) = dom::query(&sel_b) {
                    let _ = cb_el.class_list().add_1("memory-card--matched");
                    if streak >= 3 {
                        let _ = cb_el.class_list().add_1(&format!("memory-card--streak-{}", streak.min(5)));
                    }
                }

                // Float "+1" per match + streak bonus
                if streak_bonus > 0 {
                    spawn_match_bonus_text(&sel_b, streak_bonus);
                }

                // Confetti on streak milestones
                if streak == 3 {
                    confetti::burst_stars();
                } else if streak == 5 {
                    confetti::burst_party();
                }

                // Reset hint timer on Easy
                if game.difficulty == Difficulty::Easy {
                    // Drop borrow before calling reset_hint_timer
                    drop(borrow);
                    reset_hint_timer();
                    // Re-borrow to check win
                    let mut reborrow = g.borrow_mut();
                    let Some(game2) = reborrow.as_mut() else { return };
                    if game2.matched == game2.total_pairs {
                        let difficulty = game2.difficulty;
                        let moves = game2.moves;
                        let elapsed = game2.elapsed_s;
                        let best_streak = game2.best_streak;
                        let streak_bonus = game2.streak_bonus_hearts;
                        let state = game2.state.clone();
                        game2.active = false;
                        drop(reborrow);
                        stop_timer();
                        trigger_win_sequence(difficulty, moves, elapsed, best_streak, streak_bonus, state);
                    }
                    return;
                }

                // Check win (non-Easy path)
                if game.matched == game.total_pairs {
                    let difficulty = game.difficulty;
                    let moves = game.moves;
                    let elapsed = game.elapsed_s;
                    let best_streak = game.best_streak;
                    let streak_bonus = game.streak_bonus_hearts;
                    let state = game.state.clone();
                    game.active = false;
                    drop(borrow);
                    stop_timer();
                    trigger_win_sequence(difficulty, moves, elapsed, best_streak, streak_bonus, state);
                }
            } else {
                // ===== NO MATCH =====
                game.locked = true;
                let flip_a = game.flipped[0];
                let flip_b = game.flipped[1];
                game.flipped.clear();

                // Break streak
                let had_streak = game.consecutive_matches >= 2;
                game.consecutive_matches = 0;

                if had_streak {
                    update_streak_display(0);
                }

                synth_audio::gentle();

                // Cards briefly blush pink on miss
                let sel_a = format!("[data-card-idx=\"{flip_a}\"]");
                let sel_b = format!("[data-card-idx=\"{flip_b}\"]");
                if let Some(ca) = dom::query(&sel_a) {
                    let _ = ca.class_list().add_1("memory-card--miss");
                }
                if let Some(cb_el) = dom::query(&sel_b) {
                    let _ = cb_el.class_list().add_1("memory-card--miss");
                }

                let diff = game.difficulty;
                drop(borrow);

                // Flip back after delay
                dom::set_timeout_once(1000, move || {
                    GAME.with(|g| {
                        let mut borrow = g.borrow_mut();
                        let Some(game) = borrow.as_mut() else { return };
                        if flip_a < game.cards.len() { game.cards[flip_a].flipped = false; }
                        if flip_b < game.cards.len() { game.cards[flip_b].flipped = false; }
                        game.locked = false;
                    });
                    let sel_a = format!("[data-card-idx=\"{flip_a}\"]");
                    let sel_b = format!("[data-card-idx=\"{flip_b}\"]");
                    if let Some(ca) = dom::query(&sel_a) {
                        let _ = ca.class_list().remove_1("memory-card--flipped");
                        let _ = ca.class_list().remove_1("memory-card--miss");
                    }
                    if let Some(cb_el) = dom::query(&sel_b) {
                        let _ = cb_el.class_list().remove_1("memory-card--flipped");
                        let _ = cb_el.class_list().remove_1("memory-card--miss");
                    }
                });

                // Reset hint timer on Easy
                if diff == Difficulty::Easy {
                    reset_hint_timer();
                }
            }
        }
    });
}

/// Update the streak counter display
fn update_streak_display(streak: u32) {
    if let Some(el) = dom::query("[data-memory-streak]") {
        if streak >= 2 {
            let label = match streak {
                2 => "\u{1F525} 2 in a row!",
                3 => "\u{1F525}\u{1F525} 3 in a row!",
                4 => "\u{2728} 4 in a row!",
                _ => "\u{1F31F} AMAZING!",
            };
            el.set_text_content(Some(label));
            let _ = el.set_attribute("class", "memory-streak memory-streak--active");
        } else {
            el.set_text_content(Some(""));
            let _ = el.set_attribute("class", "memory-streak");
        }
    }
}

/// Spawn floating bonus text near a matched card
fn spawn_match_bonus_text(card_selector: &str, bonus: u32) {
    let Some(card) = dom::query(card_selector) else { return };
    let doc = dom::document();
    let float = render::create_el_with_class(&doc, "div", "memory-bonus-float");
    float.set_text_content(Some(&format!("+{bonus}\u{1F49C}")));
    let _ = card.append_child(&float);

    // Remove after animation
    dom::delayed_remove(float, 1200);
}

/// Spawn particle trail when flipping a card
fn spawn_flip_particles(card_el: &Element) {
    let doc = dom::document();
    for _ in 0..5 {
        let particle = render::create_el_with_class(&doc, "div", "memory-flip-particle");
        // Random offset from card center
        let offset_x = (js_sys::Math::random() - 0.5) * 60.0;
        let offset_y = (js_sys::Math::random() - 0.5) * 60.0;
        let _ = particle.set_attribute("style", &format!(
            "left: 50%; top: 50%; --offset-x: {}px; --offset-y: {}px; animation-delay: {}ms",
            offset_x, offset_y, (js_sys::Math::random() * 200.0) as i32
        ));
        let _ = card_el.append_child(&particle);
        dom::delayed_remove(particle, 800);
    }
}

/// Calculate star rating based on time
fn calc_stars(difficulty: Difficulty, elapsed_s: u32) -> u32 {
    let target = difficulty.star_target_s();
    if elapsed_s <= target {
        3
    } else if elapsed_s <= target * 2 {
        2
    } else {
        1
    }
}

/// Trigger the win celebration sequence
fn trigger_win_sequence(
    difficulty: Difficulty,
    moves: u32,
    elapsed_s: u32,
    best_streak: u32,
    streak_bonus: u32,
    state: Rc<RefCell<AppState>>,
) {
    // Wave animation across all cards first
    let cards = dom::query_all(".memory-card--matched");
    for (i, card) in cards.iter().enumerate() {
        let delay = i as i32 * 100;
        let card_clone = card.clone();
        dom::set_timeout_once(delay, move || {
            let _ = card_clone.class_list().add_1("memory-card--wave");
        });
    }

    // After wave, show end screen
    let total_delay = cards.len() as i32 * 100 + 800;
    dom::set_timeout_once(total_delay, move || {
        on_win(difficulty, moves, elapsed_s, best_streak, streak_bonus, state);
    });
}

fn on_win(
    difficulty: Difficulty,
    moves: u32,
    elapsed_s: u32,
    best_streak: u32,
    streak_bonus: u32,
    state: Rc<RefCell<AppState>>,
) {
    let stars = calc_stars(difficulty, elapsed_s);
    let base_hearts = difficulty.hearts();
    let perfect_bonus = if moves == difficulty.min_moves() { 3 } else { 0 };
    let star_bonus = if stars == 3 { 2 } else { 0 };
    let total_hearts = base_hearts + streak_bonus + perfect_bonus + star_bonus;

    // Check if new best time
    let prev_best = match difficulty {
        Difficulty::Easy => state.borrow().memory_best_time_easy,
        Difficulty::Medium => state.borrow().memory_best_time_medium,
        Difficulty::Hard => state.borrow().memory_best_time_hard,
    };
    let is_new_best = prev_best == 0 || elapsed_s < prev_best;

    // Update state
    {
        let mut s = state.borrow_mut();
        s.hearts_total += total_hearts;
        s.hearts_today += total_hearts;
        s.games_played_today += 1;
        if difficulty == Difficulty::Medium {
            s.memory_wins_medium += 1;
        }
        // Update best times
        if is_new_best {
            match difficulty {
                Difficulty::Easy => s.memory_best_time_easy = elapsed_s,
                Difficulty::Medium => s.memory_best_time_medium = elapsed_s,
                Difficulty::Hard => s.memory_best_time_hard = elapsed_s,
            }
        }
    }
    let total = state.borrow().hearts_total;
    ui::update_heart_counter(total);

    weekly_goals::increment_progress("games", 1);
    weekly_goals::increment_progress("hearts", total_hearts);

    // Save score
    let diff_str = match difficulty {
        Difficulty::Easy => "easy",
        Difficulty::Medium => "medium",
        Difficulty::Hard => "hard",
    };
    games::save_game_score("memory-save", &format!("memory_{diff_str}"), moves as u64, stars as u64, (elapsed_s as f64 * 1000.0) as u64);

    // Celebration sounds
    if is_new_best {
        synth_audio::fanfare();
        confetti::burst_party();
        speech::speak("New record! You're amazing!");
    } else if stars == 3 {
        synth_audio::fanfare();
        confetti::burst_stars();
        speech::speak("Three stars! Incredible!");
    } else {
        synth_audio::sparkle();
        confetti::burst_hearts();
        speech::speak("You found them all!");
    }

    if perfect_bonus > 0 {
        synth_audio::rainbow_burst();
    }

    native_apis::vibrate_success();

    show_memory_end(MemoryEndParams {
        difficulty,
        moves,
        elapsed_s,
        stars,
        total_hearts,
        best_streak,
        streak_bonus,
        perfect_bonus,
        star_bonus,
        is_new_best,
        prev_best,
        _state: state,
    });
}

struct MemoryEndParams {
    difficulty: Difficulty,
    moves: u32,
    elapsed_s: u32,
    stars: u32,
    total_hearts: u32,
    best_streak: u32,
    streak_bonus: u32,
    perfect_bonus: u32,
    star_bonus: u32,
    is_new_best: bool,
    prev_best: u32,
    _state: Rc<RefCell<AppState>>,
}

fn show_memory_end(params: MemoryEndParams) {
    let MemoryEndParams { difficulty, moves, elapsed_s, stars, total_hearts, best_streak,
                          streak_bonus, perfect_bonus, star_bonus, is_new_best, prev_best, _state } = params;
    let Some(arena) = dom::query("#game-arena") else { return };
    let doc = dom::document();
    dom::safe_set_inner_html(&arena, "");

    GAME.with(|g| {
        if let Some(game) = g.borrow_mut().as_mut() {
            game.phase = MemoryPhase::EndScreen;
        }
    });

    let (screen, title, stats) = games::build_end_screen();

    // Title
    if is_new_best {
        title.set_text_content(Some("\u{1F3C6} New Best Time! \u{1F3C6}"));
        let _ = title.set_attribute("class", "game-end-title game-end-title--record");
    } else {
        title.set_text_content(Some("\u{1F389} All Matched! \u{1F389}"));
    }
    let _ = screen.append_child(&title);

    // Stars display (memory-only — inserted between title and stats)
    let stars_el = render::create_el_with_class(&doc, "div", "memory-end-stars");
    let star_str: String = (0..3).map(|i| {
        if i < stars { "\u{2B50}" } else { "\u{2606}" }
    }).collect();
    stars_el.set_text_content(Some(&star_str));
    let _ = screen.append_child(&stars_el);

    // Time
    let time_line = render::create_el_with_class(&doc, "div", "game-end-stat");
    let time_text = if is_new_best && prev_best > 0 {
        format!("\u{23F1} {}s (beat your {}s record!)", elapsed_s, prev_best)
    } else {
        format!("\u{23F1} Time: {}s", elapsed_s)
    };
    time_line.set_text_content(Some(&time_text));

    // Moves
    let moves_line = render::create_el_with_class(&doc, "div", "game-end-stat");
    let min_moves = difficulty.min_moves();
    let moves_text = if moves == min_moves {
        format!("\u{1F4A1} {} moves — PERFECT! \u{2728}", moves)
    } else {
        format!("\u{1F4A1} {} moves (perfect is {})", moves, min_moves)
    };
    moves_line.set_text_content(Some(&moves_text));

    // Streak
    let streak_line = render::create_el_with_class(&doc, "div", "game-end-stat");
    if best_streak >= 2 {
        streak_line.set_text_content(Some(&format!("\u{1F525} Best streak: {} in a row!", best_streak)));
    } else {
        streak_line.set_text_content(Some("\u{1F525} No streaks this time"));
    }

    // Hearts earned breakdown
    let hearts_line = render::create_el_with_class(&doc, "div", "game-end-stat game-end-stat--hearts");
    let mut parts: Vec<String> = vec![format!("+{} base", difficulty.hearts())];
    if streak_bonus > 0 { parts.push(format!("+{streak_bonus} streak")); }
    if perfect_bonus > 0 { parts.push(format!("+{perfect_bonus} perfect")); }
    if star_bonus > 0 { parts.push(format!("+{star_bonus} stars")); }
    hearts_line.set_text_content(Some(&format!("\u{1F49C} {} hearts! ({})", total_hearts, parts.join(", "))));

    let _ = stats.append_child(&time_line);
    let _ = stats.append_child(&moves_line);
    let _ = stats.append_child(&streak_line);
    let _ = stats.append_child(&hearts_line);

    games::finish_end_screen(&screen, &stats, &arena, "memory");
}

pub fn cleanup() {
    stop_timer();
    GAME.with(|g| {
        // Clear hint timers
        if let Some(game) = g.borrow().as_ref() {
            if let Some(id) = game.no_match_timer {
                dom::window().clear_timeout_with_handle(id);
            }
        }
        *g.borrow_mut() = None;
    });
}

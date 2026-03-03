use crate::{
    browser_apis, confetti, dom, games, native_apis, render, speech, state::AppState, synth_audio,
    theme, ui, weekly_goals,
};
use std::cell::RefCell;
use std::fmt::Write;
use std::rc::Rc;
use wasm_bindgen::prelude::*;
use web_sys::{Element, Event};
#[derive(Clone, Copy, PartialEq)]
enum Difficulty {
    Easy,
    Medium,
    Hard,
}
struct DifficultyData {
    pairs: usize,
    cols: usize,
    peek_ms: u32,
    hearts: u32,
    star_target_s: u32,
    name: &'static str,
    label: &'static str,
}
const DIFFICULTY_TABLE: [DifficultyData; 3] = [
    DifficultyData {
        pairs: 2,
        cols: 2,
        peek_ms: theme::MEMORY_PEEK_EASY_MS,
        hearts: theme::HEARTS_MEMORY_EASY,
        star_target_s: theme::MEMORY_3STAR_EASY_S,
        name: "easy",
        label: "\u{1F31F} Easy (2\u{00D7}2)",
    },
    DifficultyData {
        pairs: 6,
        cols: 3,
        peek_ms: theme::MEMORY_PEEK_MEDIUM_MS,
        hearts: theme::HEARTS_MEMORY_MEDIUM,
        star_target_s: theme::MEMORY_3STAR_MEDIUM_S,
        name: "medium",
        label: "\u{2B50} Medium (3\u{00D7}4)",
    },
    DifficultyData {
        pairs: 8,
        cols: 4,
        peek_ms: theme::MEMORY_PEEK_HARD_MS,
        hearts: theme::HEARTS_MEMORY_HARD,
        star_target_s: theme::MEMORY_3STAR_HARD_S,
        name: "hard",
        label: "\u{1F525} Hard (4\u{00D7}4)",
    },
];
impl Difficulty {
    const fn data(self) -> &'static DifficultyData {
        &DIFFICULTY_TABLE[self as usize]
    }
    fn pairs(self) -> usize {
        self.data().pairs
    }
    fn cols(self) -> usize {
        self.data().cols
    }
    fn peek_ms(self) -> u32 {
        self.data().peek_ms
    }
    fn hearts(self) -> u32 {
        self.data().hearts
    }
    fn star_target_s(self) -> u32 {
        self.data().star_target_s
    }
    fn min_moves(self) -> u32 {
        self.pairs() as u32
    }
    fn as_str(self) -> &'static str {
        self.data().name
    }
    fn label(self) -> &'static str {
        self.data().label
    }
    fn label_with_best(self, best: u32) -> String {
        if best > 0 {
            format!("{} \u{2022} Best: {best}s", self.label())
        } else {
            self.label().into()
        }
    }
}
fn for_card_pair(a: usize, b: usize, mut f: impl FnMut(&Element)) {
    for idx in [a, b] {
        let selector = idx.to_string();
        if let Some(el) = dom::query_data("card-idx", &selector) {
            f(&el);
        }
    }
}
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
    const fn name(self) -> &'static str {
        match self {
            Self::MagicalForest => "\u{1F332} Magical Forest",
            Self::OceanFriends => "\u{1F30A} Ocean Friends",
            Self::SpaceAdventure => "\u{1F680} Space Adventure",
            Self::GardenBugs => "\u{1F98B} Garden Bugs",
            Self::YummyFood => "\u{1F355} Yummy Food",
            Self::MusicParty => "\u{1F3B8} Music Party",
        }
    }
    const fn attr(self) -> &'static str {
        match self {
            Self::MagicalForest => "forest",
            Self::OceanFriends => "ocean",
            Self::SpaceAdventure => "space",
            Self::GardenBugs => "bugs",
            Self::YummyFood => "food",
            Self::MusicParty => "music",
        }
    }
    const fn faces(self) -> &'static [(&'static str, &'static str, f32, &'static str)] {
        match self {
            Self::MagicalForest => &[
                (
                    "\u{1F984}",
                    "Unicorn",
                    523.25,
                    "illustrations/stickers/unicorn-rainbow.webp",
                ),
                (
                    "\u{1F430}",
                    "Bunny",
                    587.33,
                    "illustrations/stickers/bunny.webp",
                ),
                (
                    "\u{1F426}",
                    "Bird",
                    659.25,
                    "illustrations/stickers/bird.webp",
                ),
                (
                    "\u{1F98B}",
                    "Butterfly",
                    698.46,
                    "illustrations/stickers/butterfly.webp",
                ),
                (
                    "\u{1F33B}",
                    "Sunflower",
                    783.99,
                    "illustrations/stickers/sunflower.webp",
                ),
                (
                    "\u{1F431}",
                    "Kitty",
                    880.0,
                    "illustrations/stickers/kitty.webp",
                ),
                (
                    "\u{1F436}",
                    "Puppy",
                    987.77,
                    "illustrations/stickers/puppy.webp",
                ),
                (
                    "\u{1F48E}",
                    "Star",
                    1046.50,
                    "illustrations/stickers/glowing-star.webp",
                ),
            ],
            Self::OceanFriends => &[
                ("\u{1F42C}", "Dolphin", 523.25, ""),
                ("\u{1F427}", "Penguin", 587.33, ""),
                ("\u{1F419}", "Octopus", 659.25, ""),
                ("\u{1F420}", "Fish", 698.46, ""),
                ("\u{1F41A}", "Shell", 783.99, ""),
                ("\u{1F40B}", "Whale", 880.0, ""),
                ("\u{1F988}", "Shark", 987.77, ""),
                ("\u{1F9AD}", "Seal", 1046.50, ""),
            ],
            Self::SpaceAdventure => &[
                ("\u{1F680}", "Rocket", 523.25, ""),
                ("\u{1F319}", "Moon", 587.33, ""),
                (
                    "\u{2B50}",
                    "Star",
                    659.25,
                    "illustrations/stickers/star-gold.webp",
                ),
                ("\u{1F52D}", "Telescope", 698.46, ""),
                ("\u{1FA90}", "Ringed Planet", 783.99, ""),
                ("\u{1F6F8}", "UFO", 880.0, ""),
                ("\u{1F47D}", "Alien", 987.77, ""),
                ("\u{2604}", "Comet", 1046.50, ""),
            ],
            Self::GardenBugs => &[
                ("\u{1FAB1}", "Worm", 523.25, ""),
                ("\u{1F41E}", "Ladybug", 587.33, ""),
                ("\u{1F41D}", "Bee", 659.25, ""),
                ("\u{1F41B}", "Caterpillar", 698.46, ""),
                ("\u{1F40C}", "Snail", 783.99, ""),
                ("\u{1F41C}", "Ant", 880.0, ""),
                ("\u{1FAB2}", "Beetle", 987.77, ""),
                ("\u{1F997}", "Cricket", 1046.50, ""),
            ],
            Self::YummyFood => &[
                ("\u{1F355}", "Pizza", 523.25, ""),
                ("\u{1F36A}", "Cookie", 587.33, ""),
                ("\u{1F366}", "Ice Cream", 659.25, ""),
                ("\u{1F349}", "Watermelon", 698.46, ""),
                ("\u{1F34C}", "Banana", 783.99, ""),
                ("\u{1F9C1}", "Cupcake", 880.0, ""),
                ("\u{1F369}", "Donut", 987.77, ""),
                ("\u{1F353}", "Strawberry", 1046.50, ""),
            ],
            Self::MusicParty => &[
                ("\u{1F3B8}", "Guitar", 523.25, ""),
                ("\u{1F941}", "Drums", 587.33, ""),
                ("\u{1F3B9}", "Piano", 659.25, ""),
                ("\u{1F3BA}", "Trumpet", 698.46, ""),
                ("\u{1F3BB}", "Violin", 783.99, ""),
                ("\u{1FA87}", "Maracas", 880.0, ""),
                ("\u{1F3A4}", "Microphone", 987.77, ""),
                ("\u{1F3B7}", "Saxophone", 1046.50, ""),
            ],
        }
    }
}
#[derive(Clone, Copy, PartialEq)]
enum FlipStyle {
    Classic, // Standard 3D rotateY
    Bounce,
    Spiral,
}
impl FlipStyle {
    const fn class(self) -> &'static str {
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
    consecutive_matches: u32,
    best_streak: u32,
    streak_bonus_hearts: u32,
    start_time_ms: f64,
    elapsed_s: u32,
    timer_interval: Option<i32>,
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
    face_idx: usize,
    matched: bool,
    flipped: bool,
}
thread_local! {
    static GAME: RefCell<Option<MemoryState>> = const { RefCell::new(None) };
}
pub fn start(state: Rc<RefCell<AppState>>) {
    let Some(abort) = browser_apis::new_abort_handle() else {
        return;
    };
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
    show_theme_select();
    bind_unified_click_handler(state, &signal);
}
fn bind_unified_click_handler(state: Rc<RefCell<AppState>>, signal: &web_sys::AbortSignal) {
    let Some(arena) = dom::query(crate::constants::SELECTOR_GAME_ARENA) else {
        return;
    };
    let s = state;
    dom::on_with_signal(
        arena.unchecked_ref(),
        "click",
        signal,
        move |event: Event| {
            let Some(el) = dom::event_target_element(&event) else {
                return;
            };
            let phase = GAME.with(|g| g.borrow().as_ref().map(|game| game.phase));
            let Some(phase) = phase else { return };
            match phase {
                MemoryPhase::ThemeSelect => {
                    if let Some(btn) = dom::closest(&el, "[data-memory-theme]") {
                        let theme = match dom::get_attr(&btn, "data-memory-theme")
                            .unwrap_or_default()
                            .as_str()
                        {
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
                    if let Some(btn) = dom::closest(&el, "[data-memory-diff]") {
                        let diff_str = dom::get_attr(&btn, "data-memory-diff").unwrap_or_default();
                        if dom::get_attr(&btn, "disabled").is_some() {
                            return;
                        }
                        let diff = match diff_str.as_str() {
                            "easy" => Difficulty::Easy,
                            "medium" => Difficulty::Medium,
                            "hard" => Difficulty::Hard,
                            _ => return,
                        };
                        start_game(diff);
                    }
                }
                MemoryPhase::Playing => {
                    if dom::closest(&el, "[data-memory-hint]").is_some() {
                        use_hint();
                        return;
                    }
                    if let Some(card) = dom::closest(&el, "[data-card-idx]") {
                        let idx_str = dom::get_attr(&card, "data-card-idx").unwrap_or_default();
                        let Ok(idx) = idx_str.parse::<usize>() else {
                            return;
                        };
                        on_card_tap(idx, &card);
                    }
                }
                MemoryPhase::EndScreen => {
                    if dom::closest(&el, "[data-game-again]").is_some() {
                        GAME.with(|g| {
                            if let Some(game) = g.borrow_mut().as_mut() {
                                game.phase = MemoryPhase::ThemeSelect;
                            }
                        });
                        show_theme_select();
                    } else if dom::closest(&el, "[data-game-back]").is_some() {
                        cleanup();
                        games::return_to_menu();
                    }
                }
            }
        },
    );
}
fn show_theme_select() {
    let Some((_arena, buttons)) = render::build_game_picker("\u{1F308} Choose Your Theme!") else {
        return;
    };
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
        let Some(btn) = dom::with_buf(|buf| {
            let _ = write!(buf, "game-card game-card--{}", theme.attr());
            render::create_button(&doc, buf, theme.name())
        }) else {
            continue;
        };
        dom::set_attr(&btn, "data-memory-theme", theme.attr());
        let _ = buttons.append_child(&btn);
    }
}
fn show_difficulty_select(state: Rc<RefCell<AppState>>) {
    let Some((_arena, buttons)) = render::build_game_picker("\u{2B50} Pick a Level!") else {
        return;
    };
    let doc = dom::document();
    GAME.with(|g| {
        if let Some(game) = g.borrow_mut().as_mut() {
            game.phase = MemoryPhase::DifficultySelect;
        }
    });
    let (best_easy, best_med, best_hard, medium_wins) = {
        let s = state.borrow();
        (
            s.memory_best_time_easy,
            s.memory_best_time_medium,
            s.memory_best_time_hard,
            s.memory_wins_medium,
        )
    };
    let Some(easy_btn) = render::create_button(
        &doc,
        "game-card game-card--easy",
        &Difficulty::Easy.label_with_best(best_easy),
    ) else {
        return;
    };
    dom::set_attr(&easy_btn, "data-memory-diff", "easy");
    let Some(medium_btn) = render::create_button(
        &doc,
        "game-card game-card--medium",
        &Difficulty::Medium.label_with_best(best_med),
    ) else {
        return;
    };
    dom::set_attr(&medium_btn, "data-memory-diff", "medium");
    let Some(hard_btn) = render::create_button(&doc, "game-card game-card--hard", "") else {
        return;
    };
    dom::set_attr(&hard_btn, "data-memory-diff", "hard");
    if medium_wins < 3 {
        dom::set_attr(&hard_btn, "disabled", "");
        dom::with_buf(|buf| {
            let _ = write!(buf, "\u{1F512} Hard \u{2014} play Medium {medium_wins}/3 first!");
            hard_btn.set_text_content(Some(buf));
        });
    } else {
        hard_btn.set_text_content(Some(&Difficulty::Hard.label_with_best(best_hard)));
    }
    let _ = buttons.append_child(&easy_btn);
    let _ = buttons.append_child(&medium_btn);
    let _ = buttons.append_child(&hard_btn);
}
fn start_game(difficulty: Difficulty) {
    let pairs = difficulty.pairs();
    let (theme, flip_style) = GAME.with(|g| {
        g.borrow()
            .as_ref()
            .map_or((CardTheme::MagicalForest, FlipStyle::Classic), |game| {
                (game.theme, game.flip_style)
            })
    });
    let face_map = pick_random_faces(theme, pairs);
    let mut card_indices: Vec<usize> = Vec::with_capacity(pairs * 2);
    for i in 0..pairs {
        card_indices.push(i);
        card_indices.push(i);
    }
    for i in (1..card_indices.len()).rev() {
        let j = (js_sys::Math::random() * (i + 1) as f64) as usize;
        card_indices.swap(i, j);
    }
    let cards: Vec<MemoryCard> = card_indices
        .iter()
        .map(|&idx| MemoryCard {
            face_idx: idx,
            matched: false,
            flipped: false,
        })
        .collect();
    let now = js_sys::Date::now();
    let hints = if difficulty == Difficulty::Easy { 3 } else { 0 };
    GAME.with(|g| {
        if let Some(game) = g.borrow_mut().as_mut() {
            game.difficulty = difficulty;
            game.cards = cards;
            game.face_map.clone_from(&face_map);
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
    render_board(
        difficulty,
        theme,
        flip_style,
        &card_indices,
        &face_map,
        hints,
    );
    peek_cards(difficulty);
    let peek_ms = difficulty.peek_ms();
    dom::set_timeout_once(peek_ms as i32, move || {
        start_timer();
        if difficulty == Difficulty::Easy {
            reset_hint_timer();
        }
    });
}
fn pick_random_faces(theme: CardTheme, n: usize) -> Vec<usize> {
    let total = theme.faces().len();
    let mut indices: Vec<usize> = (0..total).collect();
    for i in 0..n.min(total) {
        let j = i + (js_sys::Math::random() * (total - i) as f64) as usize;
        indices.swap(i, j);
    }
    indices.truncate(n.min(total));
    indices
}
fn render_board(
    difficulty: Difficulty,
    theme: CardTheme,
    flip_style: FlipStyle,
    card_indices: &[usize],
    face_map: &[usize],
    hints: u32,
) {
    let Some((arena, doc)) = games::clear_game_arena() else {
        return;
    };
    let Some(container) = render::create_el_with_class(&doc, "div", "memory-container") else {
        return;
    };
    let Some(hud) = render::create_el_with_class(&doc, "div", "memory-hud") else {
        return;
    };
    let Some(moves_el) = render::text_el_with_data(
        &doc,
        "span",
        "memory-moves",
        "Moves: 0",
        "data-memory-moves",
    ) else {
        return;
    };
    let Some(pairs_el) = dom::with_buf(|buf| {
        let _ = write!(buf, "Pairs: 0/{}", difficulty.pairs());
        render::text_el_with_data(&doc, "span", "memory-pairs", buf, "data-memory-pairs")
    }) else {
        return;
    };
    let Some(timer_el) = render::text_el_with_data(
        &doc,
        "span",
        "memory-timer",
        "\u{23F1} 0s",
        "data-memory-timer",
    ) else {
        return;
    };
    let _ = hud.append_child(&moves_el);
    let _ = hud.append_child(&pairs_el);
    let _ = hud.append_child(&timer_el);
    let Some(hud2) = render::create_el_with_class(&doc, "div", "memory-hud memory-hud--row2")
    else {
        return;
    };
    if let Some(streak_el) =
        render::create_el_with_data(&doc, "span", "memory-streak", "data-memory-streak")
    {
        let _ = hud2.append_child(&streak_el);
    }
    if hints > 0 {
        if let Some(hint_btn) = dom::with_buf(|buf| {
            let _ = write!(buf, "\u{1F4A1} Hint ({hints})");
            render::create_button_with_data(&doc, "memory-hint-btn", buf, "data-memory-hint")
        }) {
            let _ = hud2.append_child(&hint_btn);
        }
    }
    let Some(grid) = dom::with_buf(|buf| {
        let _ = write!(
            buf,
            "memory-grid memory-grid--{} memory-grid--{}",
            difficulty.cols(),
            flip_style.class()
        );
        render::create_el_with_class(&doc, "div", buf)
    }) else {
        return;
    };
    let faces = theme.faces();
    for (i, &face_idx) in card_indices.iter().enumerate() {
        let Some(card) = render::create_el_with_class(&doc, "div", "memory-card") else {
            continue;
        };
        dom::with_buf(|buf| {
            let _ = write!(buf, "{i}");
            dom::set_attr(&card, "data-card-idx", buf);
        });
        let Some(card_inner) = render::create_el_with_class(&doc, "div", "memory-card-inner")
        else {
            continue;
        };
        let Some(card_front) = render::text_el(&doc, "div", "memory-card-front", "\u{2753}") else {
            continue;
        };
        let Some(card_back) = render::create_el_with_class(&doc, "div", "memory-card-back") else {
            continue;
        };
        let theme_face_idx = face_map[face_idx];
        let (emoji, _name, _freq, img_src) = faces[theme_face_idx];
        if img_src.is_empty() {
            card_back.set_text_content(Some(emoji));
        } else if let Ok(img) = doc.create_element("img") {
            dom::set_attr(&img, "src", img_src);
            dom::set_attr(&img, "class", "memory-card-img");
            let _ = card_back.append_child(&img);
        }
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
    dom::for_each_match(".memory-card", |card| {
        let _ = card.class_list().add_1("memory-card--flipped");
    });
    let peek_ms = difficulty.peek_ms();
    dom::set_timeout_once(peek_ms as i32, move || {
        dom::for_each_match(".memory-card", |card| {
            let _ = card.class_list().remove_1("memory-card--flipped");
        });
    });
}
fn start_timer() {
    if !GAME.with(|g| g.borrow().as_ref().is_some_and(|g| g.active)) {
        return;
    }
    let cb = Closure::<dyn FnMut()>::new(move || {
        if !browser_apis::is_document_visible() {
            return;
        }
        GAME.with(|g| {
            let mut borrow = g.borrow_mut();
            let Some(game) = borrow.as_mut() else { return };
            if !game.active {
                return;
            }
            // Increment by 1 each tick instead of computing from wall clock.
            // Prevents timer inflation when iPad sleeps — Date::now() advances
            // during sleep but intervals fire less often, keeping elapsed accurate.
            game.elapsed_s += 1;
            dom::fmt_text("[data-memory-timer]", |buf| {
                let _ = write!(buf, "\u{23F1} {}s", game.elapsed_s);
            });
        });
    });
    dom::pin_closure_to_arena("__memory_timer_closure", cb.as_ref().unchecked_ref());
    if let Ok(id) = dom::window()
        .set_interval_with_callback_and_timeout_and_arguments_0(cb.as_ref().unchecked_ref(), 1000)
    {
        GAME.with(|g| {
            if let Some(game) = g.borrow_mut().as_mut() {
                game.timer_interval = Some(id);
            }
        });
    }
    cb.forget();
}
fn stop_timer() {
    GAME.with(|g| {
        if let Some(game) = g.borrow_mut().as_mut() {
            if let Some(id) = game.timer_interval.take() {
                dom::window().clear_interval_with_handle(id);
            }
        }
    });
}
fn use_hint() {
    GAME.with(|g| {
        let mut borrow = g.borrow_mut();
        let Some(game) = borrow.as_mut() else { return };
        if game.hints_remaining == 0 || !game.active {
            return;
        }
        game.hints_remaining -= 1;
        if game.hints_remaining > 0 {
            dom::fmt_text("[data-memory-hint]", |buf| {
                let _ = write!(buf, "\u{1F4A1} Hint ({})", game.hints_remaining);
            });
        } else if let Some(btn) = dom::query("[data-memory-hint]") {
            btn.set_text_content(Some("\u{1F4A1} No hints"));
            dom::set_attr(&btn, "disabled", "");
        }
        glow_random_unmatched(&game.cards, 800);
        synth_audio::dreamy();
    });
}
fn reset_hint_timer() {
    GAME.with(|g| {
        if let Some(game) = g.borrow_mut().as_mut() {
            if let Some(id) = game.no_match_timer.take() {
                dom::window().clear_timeout_with_handle(id);
            }
        }
    });
    if !GAME.with(|g| g.borrow().as_ref().is_some_and(|g| g.active)) {
        return;
    }
    let id = dom::set_timeout_cancelable(10_000, || {
        let should_hint = GAME.with(|g| {
            let borrow = g.borrow();
            let Some(game) = borrow.as_ref() else {
                return false;
            };
            game.active && game.hints_remaining > 0 && game.difficulty == Difficulty::Easy
        });
        if should_hint {
            GAME.with(|g| {
                let borrow = g.borrow();
                let Some(game) = borrow.as_ref() else { return };
                if !game.active {
                    return;
                }
                glow_random_unmatched(&game.cards, 500);
            });
        }
    });
    GAME.with(|g| {
        if let Some(game) = g.borrow_mut().as_mut() {
            game.no_match_timer = Some(id);
        }
    });
}
fn glow_random_unmatched(cards: &[MemoryCard], ms: i32) {
    let unmatched: Vec<usize> = cards
        .iter()
        .enumerate()
        .filter(|(_, c)| !c.matched && !c.flipped)
        .map(|(i, _)| i)
        .collect();
    if unmatched.is_empty() {
        return;
    }
    let pick = unmatched[(js_sys::Math::random() * unmatched.len() as f64) as usize];
    let pick_str = pick.to_string();
    if let Some(card_el) = dom::query_data("card-idx", &pick_str) {
        let _ = card_el.class_list().add_1("memory-card--hint");
        dom::set_timeout_once(ms, move || {
            if let Some(el) = dom::query_data("card-idx", &pick_str) {
                let _ = el.class_list().remove_1("memory-card--hint");
            }
        });
    }
}
fn on_card_tap(idx: usize, card_el: &Element) {
    GAME.with(|g| {
        let mut borrow = g.borrow_mut();
        let Some(game) = borrow.as_mut() else { return };
        if !game.active || game.locked {
            return;
        }
        if idx >= game.cards.len() {
            return;
        }
        if game.cards[idx].matched || game.cards[idx].flipped {
            return;
        }
        game.cards[idx].flipped = true;
        game.flipped.push(idx);
        let _ = card_el.class_list().add_1("memory-card--flipped");
        match game.theme {
            CardTheme::MagicalForest => synth_audio::chime(),
            CardTheme::OceanFriends => synth_audio::dreamy(),
            CardTheme::SpaceAdventure => synth_audio::whoosh(),
            CardTheme::GardenBugs => synth_audio::sparkle(),
            CardTheme::YummyFood => synth_audio::tap(),
            CardTheme::MusicParty => synth_audio::magic_wand(),
        }
        spawn_flip_particles(card_el);
        native_apis::vibrate_tap();
        if game.flipped.len() == 2 {
            game.moves += 1;
            dom::fmt_text("[data-memory-moves]", |buf| {
                let _ = write!(buf, "Moves: {}", game.moves);
            });
            let idx_a = game.flipped[0];
            let idx_b = game.flipped[1];
            if game.cards[idx_a].face_idx == game.cards[idx_b].face_idx {
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
                dom::fmt_text("[data-memory-pairs]", |buf| {
                    let _ = write!(buf, "Pairs: {matched}/{total}");
                });
                let streak_bonus = match streak {
                    3 => 1,
                    4 => 2,
                    s if s >= 5 => 3,
                    _ => 0,
                };
                game.streak_bonus_hearts += streak_bonus;
                match streak {
                    1 => synth_audio::chime(),
                    2 => synth_audio::sparkle(),
                    3 => {
                        synth_audio::sparkle();
                        synth_audio::chime();
                    }
                    4 => synth_audio::magic_wand(),
                    _ => synth_audio::rainbow_burst(),
                }
                update_streak_display(streak);
                for_card_pair(idx_a, idx_b, |el| {
                    let _ = el.class_list().add_1("memory-card--matched");
                    /* Magical exploding merge animation! */
                    let _ = el.class_list().add_1("memory-card--explode");
                    spawn_flip_particles(el);
                    if streak >= 3 {
                        dom::with_buf(|buf| {
                            let _ = write!(buf, "memory-card--streak-{}", streak.min(5));
                            let _ = el.class_list().add_1(buf);
                        });
                    }
                });
                spawn_combo_explosion(idx_b, streak, streak_bonus);
                if streak == 3 {
                    confetti::burst_stars();
                    crate::gpu_particles::burst(&crate::gpu_particles::BURST_STARS);
                } else if streak >= 5 {
                    confetti::burst_party();
                    crate::gpu_particles::burst(&crate::gpu_particles::BURST_PARTY);
                }
                let was_easy = game.difficulty == Difficulty::Easy;
                let win_data = if game.matched == game.total_pairs {
                    game.active = false;
                    Some((
                        game.difficulty,
                        game.moves,
                        game.elapsed_s,
                        game.best_streak,
                        game.streak_bonus_hearts,
                        game.state.clone(),
                    ))
                } else {
                    None
                };
                drop(borrow);
                if was_easy {
                    reset_hint_timer();
                }
                if let Some((d, m, e, bs, sb, st)) = win_data {
                    stop_timer();
                    trigger_win_sequence(d, m, e, bs, sb, st);
                }
            } else {
                game.locked = true;
                let flip_a = game.flipped[0];
                let flip_b = game.flipped[1];
                game.flipped.clear();
                let had_streak = game.consecutive_matches >= 2;
                game.consecutive_matches = 0;
                if had_streak {
                    update_streak_display(0);
                }
                synth_audio::gentle();
                for_card_pair(flip_a, flip_b, |el| {
                    let _ = el.class_list().add_1("memory-card--miss");
                });
                let diff = game.difficulty;
                drop(borrow);
                dom::set_timeout_once(1000, move || {
                    GAME.with(|g| {
                        let mut borrow = g.borrow_mut();
                        let Some(game) = borrow.as_mut() else { return };
                        if flip_a < game.cards.len() {
                            game.cards[flip_a].flipped = false;
                        }
                        if flip_b < game.cards.len() {
                            game.cards[flip_b].flipped = false;
                        }
                        game.locked = false;
                    });
                    for_card_pair(flip_a, flip_b, |el| {
                        let _ = el.class_list().remove_1("memory-card--flipped");
                        let _ = el.class_list().remove_1("memory-card--miss");
                    });
                });
                if diff == Difficulty::Easy {
                    reset_hint_timer();
                }
            }
        }
    });
}
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
            dom::set_attr(&el, "class", "memory-streak memory-streak--active");
        } else {
            el.set_text_content(Some(""));
            dom::set_attr(&el, "class", "memory-streak");
        }
    }
}
fn spawn_combo_explosion(card_idx: usize, streak: u32, bonus: u32) {
    let selector = dom::with_buf(|buf| {
        let _ = write!(buf, "{card_idx}");
        buf.clone()
    });
    let Some(card) = dom::query_data("card-idx", &selector) else {
        return;
    };
    let doc = dom::document();
    if streak >= 2 {
        dom::with_buf(|buf| {
            let _ = write!(buf, "COMBO x{streak}!");
            if let Some(float) = render::append_text(&doc, &card, "div", "memory-combo-float", buf)
            {
                dom::delayed_remove(float, 2000);
            }
        });
    }
    if bonus > 0 {
        dom::with_buf(|buf| {
            let _ = write!(buf, "+{bonus}\u{1F49C}");
            if let Some(float) = render::append_text(&doc, &card, "div", "memory-bonus-float", buf)
            {
                dom::delayed_remove(float, 1200);
            }
        });
    }
}
fn spawn_flip_particles(card_el: &Element) {
    let doc = dom::document();
    for _ in 0..5 {
        let Some(particle) = render::create_el_with_class(&doc, "div", "memory-flip-particle")
        else {
            continue;
        };
        let offset_x = (js_sys::Math::random() - 0.5) * 60.0;
        let offset_y = (js_sys::Math::random() - 0.5) * 60.0;
        let delay = (js_sys::Math::random() * 200.0) as i32;
        dom::with_buf(|buf| {
            let _ = write!(buf, "left: 50%; top: 50%; --offset-x: {offset_x}px; --offset-y: {offset_y}px; animation-delay: {delay}ms");
            dom::set_attr(&particle, "style", buf);
        });
        let _ = card_el.append_child(&particle);
        dom::delayed_remove(particle, 800);
    }
}
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
fn trigger_win_sequence(
    difficulty: Difficulty,
    moves: u32,
    elapsed_s: u32,
    best_streak: u32,
    streak_bonus: u32,
    state: Rc<RefCell<AppState>>,
) {
    let mut i: i32 = 0;
    dom::for_each_match(".memory-card--matched", |card| {
        let delay = i * 100;
        dom::set_timeout_once(delay, move || {
            let _ = card.class_list().add_1("memory-card--wave");
        });
        i += 1;
    });
    dom::set_timeout_once(i * 100 + 800, move || {
        on_win(
            difficulty,
            moves,
            elapsed_s,
            best_streak,
            streak_bonus,
            state,
        );
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
    let perfect_bonus = if moves == difficulty.min_moves() {
        3
    } else {
        0
    };
    let star_bonus = if stars == 3 { 2 } else { 0 };
    let total_hearts = base_hearts + streak_bonus + perfect_bonus + star_bonus;
    let (total, prev_best, is_new_best) = {
        let s = state.borrow();
        let prev_best = match difficulty {
            Difficulty::Easy => s.memory_best_time_easy,
            Difficulty::Medium => s.memory_best_time_medium,
            Difficulty::Hard => s.memory_best_time_hard,
        };
        drop(s);
        let is_new_best = prev_best == 0 || elapsed_s < prev_best;
        let mut s = state.borrow_mut();
        s.hearts_total += total_hearts;
        s.hearts_today += total_hearts;
        s.games_played_today += 1;
        if difficulty == Difficulty::Medium {
            s.memory_wins_medium += 1;
        }
        if is_new_best {
            match difficulty {
                Difficulty::Easy => s.memory_best_time_easy = elapsed_s,
                Difficulty::Medium => s.memory_best_time_medium = elapsed_s,
                Difficulty::Hard => s.memory_best_time_hard = elapsed_s,
            }
        }
        (s.hearts_total, prev_best, is_new_best)
    };
    ui::update_heart_counter(total);
    weekly_goals::record_game_played(total_hearts);
    dom::with_buf(|buf| {
        let _ = write!(buf, "memory_{}", difficulty.as_str());
        games::save_game_score(
            "memory-save",
            buf,
            u64::from(moves),
            u64::from(stars),
            0,
            (f64::from(elapsed_s) * 1000.0) as u64,
        );
    });
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
}
fn show_memory_end(params: MemoryEndParams) {
    let MemoryEndParams {
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
    } = params;
    let Some((arena, doc)) = games::clear_game_arena() else {
        return;
    };
    GAME.with(|g| {
        if let Some(game) = g.borrow_mut().as_mut() {
            game.phase = MemoryPhase::EndScreen;
        }
    });
    let Some((screen, title, stats)) = games::build_end_screen() else {
        return;
    };
    if is_new_best {
        title.set_text_content(Some("\u{1F3C6} New Best Time! \u{1F3C6}"));
        dom::set_attr(&title, "class", "game-end-title game-end-title--record");
    } else {
        title.set_text_content(Some("\u{1F389} All Matched! \u{1F389}"));
    }
    let Some(stars_el) = render::create_el_with_class(&doc, "div", "memory-end-stars") else {
        return;
    };
    let star_str: String = (0..3)
        .map(|i| if i < stars { "\u{2B50}" } else { "\u{2606}" })
        .collect();
    stars_el.set_text_content(Some(&star_str));
    let _ = screen.append_child(&stars_el);
    dom::with_buf(|buf| {
        if is_new_best && prev_best > 0 {
            let _ = write!(
                buf,
                "\u{23F1} {elapsed_s}s (beat your {prev_best}s record!)"
            );
        } else {
            let _ = write!(buf, "\u{23F1} Time: {elapsed_s}s");
        }
        games::append_stat_line(&stats, "", buf);
    });
    let min_moves = difficulty.min_moves();
    dom::with_buf(|buf| {
        if moves == min_moves {
            let _ = write!(buf, "\u{1F4A1} {moves} moves — PERFECT! \u{2728}");
        } else {
            let _ = write!(buf, "\u{1F4A1} {moves} moves (perfect is {min_moves})");
        }
        games::append_stat_line(&stats, "", buf);
    });
    dom::with_buf(|buf| {
        if best_streak >= 2 {
            let _ = write!(buf, "\u{1F525} Best streak: {best_streak} in a row!");
        } else {
            let _ = write!(buf, "\u{1F525} Keep going for a streak!");
        }
        games::append_stat_line(&stats, "", buf);
    });
    dom::with_buf(|buf| {
        let _ = write!(
            buf,
            "\u{1F49C} {total_hearts} hearts! (+{} base",
            difficulty.hearts()
        );
        if streak_bonus > 0 {
            let _ = write!(buf, ", +{streak_bonus} streak");
        }
        if perfect_bonus > 0 {
            let _ = write!(buf, ", +{perfect_bonus} perfect");
        }
        if star_bonus > 0 {
            let _ = write!(buf, ", +{star_bonus} stars");
        }
        buf.push(')');
        games::append_stat_line(&stats, "game-end-stat--hearts", buf);
    });
    games::finish_end_screen(&screen, &stats, &arena, "memory");
}
pub fn cleanup() {
    stop_timer();
    GAME.with(|g| {
        if let Some(game) = g.borrow_mut().as_mut() {
            if let Some(id) = game.no_match_timer.take() {
                dom::window().clear_timeout_with_handle(id);
            }
        }
        *g.borrow_mut() = None;
    });
}

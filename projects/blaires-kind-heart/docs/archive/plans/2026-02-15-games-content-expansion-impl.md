# Games Content Expansion + Polish Implementation Plan

- Archive Path: `docs/archive/plans/2026-02-15-games-content-expansion-impl.md`
- Normalized On: `2026-03-04`
- Source Title: `Games Content Expansion + Polish Implementation Plan`

## Summary
> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

## Context
> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add theme pickers and new content variants to all 5 games for daily replayability, plus execute the existing 17-task debug-and-polish plan.

**Architecture:** Phase 1 executes bug fixes (Tasks 1-6 from polish plan). Phases 2-7 add theme pickers + content to each game following Memory Match's existing picker pattern. Phase 8 updates the hub + remaining polish. All content is emoji-based data — no asset generation needed.

**Tech Stack:** Rust/WASM (wasm-bindgen + web-sys), Trunk build, Safari 26.2 only, CSS custom properties, event delegation.

---

### Phase 1: Bug Fixes (from debug-and-polish-impl.md)

> Execute Tasks 1-6 from `docs/plans/2026-02-15-debug-and-polish-impl.md` exactly as written. Those tasks cover:
> - Task 1: Add 12 missing CSS `<link data-trunk>` tags in `index.html`
> - Task 2: Clean up stale CSS paths in `public/sw-assets.js`
> - Task 3: Replace `contrast-color()` in `src/styles/tracker.css`
> - Task 4: Fix catcher timer closure leaks (`.forget()` → `Reflect::set`)
> - Task 5: Fix memory timer closure leaks
> - Task 6: Fix hug timer closure leaks
>
> After completing all 6, run `trunk build` to verify everything compiles.
> Commit after each task per the polish plan's instructions.

---

### Task 7: Add CatcherTheme Data Structure

**Files:**
- Modify: `rust/game_catcher.rs:17-32`

**Step 1: Add `CatcherTheme` enum and data above `ItemKind`**

Insert before the `ItemKind` enum (line 17):

```rust
// ── Theme packs ─────────────────────────────────────────────────
#[derive(Clone, Copy, PartialEq)]
enum CatcherTheme {
    Classic,
    GardenParty,
    SweetTreats,
    StarryNight,
}

struct CatcherThemeData {
    name: &'static str,
    catch_items: &'static [(&'static str, &'static str, u32)], // (emoji, name, base_points)
    hazard: (&'static str, &'static str),                       // (emoji, name)
    bg_gradient: &'static str,
    picker_emoji: &'static str,
}

impl CatcherTheme {
    fn data(&self) -> &'static CatcherThemeData {
        match self {
            Self::Classic => &THEME_CLASSIC,
            Self::GardenParty => &THEME_GARDEN,
            Self::SweetTreats => &THEME_SWEETS,
            Self::StarryNight => &THEME_STARRY,
        }
    fn name(&self) -> &str { self.data().name }
    fn picker_emoji(&self) -> &str { self.data().picker_emoji }
    fn attr(&self) -> &str {
        match self {
            Self::Classic => "classic",
            Self::GardenParty => "garden",
            Self::SweetTreats => "sweets",
            Self::StarryNight => "starry",
        }

const THEME_CLASSIC: CatcherThemeData = CatcherThemeData {
    name: "Classic",
    catch_items: &[
        ("\u{1F496}", "Heart", 1),
        ("\u{2B50}", "Star", 2),
        ("\u{1F984}", "Unicorn", 5),
    ],
    hazard: ("\u{1F327}", "Rain Cloud"),
    bg_gradient: "linear-gradient(180deg, #87CEEB 0%, #B0E0FF 100%)",
    picker_emoji: "\u{1F496}",
};

const THEME_GARDEN: CatcherThemeData = CatcherThemeData {
    name: "Garden Party",
    catch_items: &[
        ("\u{1F33A}", "Flower", 1),
        ("\u{1F98B}", "Butterfly", 2),
        ("\u{1F41E}", "Ladybug", 5),
    ],
    hazard: ("\u{1F4A7}", "Mud Puddle"),
    bg_gradient: "linear-gradient(180deg, #90EE90 0%, #228B22 100%)",
    picker_emoji: "\u{1F33A}",
};

const THEME_SWEETS: CatcherThemeData = CatcherThemeData {
    name: "Sweet Treats",
    catch_items: &[
        ("\u{1F9C1}", "Cupcake", 1),
        ("\u{1F36A}", "Cookie", 2),
        ("\u{1F366}", "Ice Cream", 5),
    ],
    hazard: ("\u{1F966}", "Broccoli"),
    bg_gradient: "linear-gradient(180deg, #FFB6C1 0%, #FF69B4 100%)",
    picker_emoji: "\u{1F9C1}",
};

const THEME_STARRY: CatcherThemeData = CatcherThemeData {
    name: "Starry Night",
    catch_items: &[
        ("\u{1F319}", "Moon", 1),
        ("\u{1F320}", "Shooting Star", 2),
        ("\u{1FA90}", "Planet", 5),
    ],
    hazard: ("\u{2604}", "Asteroid"),
    bg_gradient: "linear-gradient(180deg, #1a0033 0%, #2d1b69 100%)",
    picker_emoji: "\u{1F319}",
};
```

**Step 2: Verify build compiles**

Run: `trunk build 2>&1 | tail -5`
Expected: Build succeeds (the new types are defined but not yet used — no warnings for unused in data-only structs).

**Step 3: Commit**

```bash
git add rust/game_catcher.rs
git commit -m "feat(catcher): add CatcherTheme data structure with 4 theme packs

Classic (existing items), Garden Party (flowers/butterflies/ladybugs),
Sweet Treats (cupcakes/cookies/ice cream), Starry Night (moons/stars/planets).
Each theme defines catch items, hazard, background gradient, and picker emoji."
```

---

### Task 8: Add Catcher Theme Picker UI

**Files:**
- Modify: `rust/game_catcher.rs:147` (`start()` function)

**Step 1: Add a `show_theme_picker()` function**

Add this function before `start()`:

```rust
fn show_theme_picker(state: Rc<RefCell<AppState>>) {
    let Some(arena) = dom::query("#game-arena") else { return };
    let doc = dom::document();
    dom::safe_set_inner_html(&arena, "");

    let container = render::create_el_with_class(&doc, "div", "memory-select");

    let title = render::create_el_with_class(&doc, "div", "memory-select-title");
    title.set_text_content(Some("\u{1F496} Choose a Theme!"));

    let buttons = render::create_el_with_class(&doc, "div", "memory-select-buttons");

    for theme in [CatcherTheme::Classic, CatcherTheme::GardenParty, CatcherTheme::SweetTreats, CatcherTheme::StarryNight] {
        let label = format!("{} {}", theme.picker_emoji(), theme.name());
        let btn = render::create_button(&doc, &format!("game-card game-card--catcher"), &label);
        let _ = btn.set_attribute("data-catcher-theme", theme.attr());
        let _ = buttons.append_child(&btn);
    }

    let _ = container.append_child(&title);
    let _ = container.append_child(&buttons);
    let _ = arena.append_child(&container);
}
```

**Step 2: Modify `start()` to show picker first**

In `start()` (line 147), replace the body that immediately creates the game with:

```rust
pub fn start(state: Rc<RefCell<AppState>>) {
    show_theme_picker(state);
}
```

**Step 3: Add theme selection handler**

Add a new function `start_with_theme()` that contains the original `start()` body (everything from `let Some(arena) = dom::query("#game-arena")` through the end of the current `start()`). Add a `theme: CatcherTheme` parameter.

Then add theme click handling. In the existing event handler for `#game-arena` clicks (which games.rs delegates), add detection for `[data-catcher-theme]`:

```rust
// Inside the game's event handling, detect theme selection:
if let Some(theme_attr) = el.closest("[data-catcher-theme]")
    .ok().flatten()
    .and_then(|e| e.get_attribute("data-catcher-theme"))
{
    let theme = match theme_attr.as_str() {
        "garden" => CatcherTheme::GardenParty,
        "sweets" => CatcherTheme::SweetTreats,
        "starry" => CatcherTheme::StarryNight,
        _ => CatcherTheme::Classic,
    };
    start_with_theme(state.clone(), theme);
    return;
}
```

**Step 4: Verify build compiles**

Run: `trunk build 2>&1 | tail -5`
Expected: Build succeeds.

**Step 5: Commit**

```bash
git add rust/game_catcher.rs
git commit -m "feat(catcher): add theme picker UI before game start

Reuses memory-select CSS classes. Shows 4 theme buttons (Classic,
Garden Party, Sweet Treats, Starry Night). Selecting a theme
launches the game with that theme's content."
```

---

### Task 9: Wire Catcher Theme Into Gameplay

**Files:**
- Modify: `rust/game_catcher.rs`

**Step 1: Store selected theme in `CatcherState`**

Add `theme: CatcherTheme` field to the `CatcherState` struct (around line 120). Initialize it in `start_with_theme()`.

**Step 2: Update `ItemKind::emoji()` to use theme**

Modify `ItemKind::emoji()` so that `Heart`, `Star`, `Unicorn` map to `theme.data().catch_items[0..2]` emoji. The `RainCloud` hazard maps to `theme.data().hazard.0`. Power-up emojis stay the same across all themes.

In `spawn_falling_item()` (line 487), read the theme from GAME state:

```rust
GAME.with(|g| {
    if let Some(game) = g.borrow().as_ref() {
        let theme = game.theme;
        // Use theme.data().catch_items and theme.data().hazard
    }
});
```

**Step 3: Apply theme background gradient**

In `start_with_theme()`, set the container background:

```rust
let _ = container.set_attribute("style",
    &format!("background: {};", theme.data().bg_gradient));
```

**Step 4: Update "Play Again" to return to theme picker**

In the end-screen "Play Again" handler, call `show_theme_picker(state)` instead of directly restarting.

**Step 5: Verify build compiles**

Run: `trunk build 2>&1 | tail -5`
Expected: Build succeeds.

**Step 6: Commit**

```bash
git add rust/game_catcher.rs
git commit -m "feat(catcher): wire theme into gameplay

Catch items, hazard emoji, and background gradient now change per theme.
Power-ups remain universal. Play Again returns to theme picker."
```

---

### Task 10: Add 3 New Memory Match Card Themes

**Files:**
- Modify: `rust/game_memory.rs:72-123`

**Step 1: Add 3 new variants to `CardTheme` enum**

After `SpaceAdventure` (line 77), add:

```rust
    GardenBugs,
    YummyFood,
    MusicParty,
```

**Step 2: Add `name()` entries**

In the `name()` match (lines 81-87), add:

```rust
            Self::GardenBugs => "\u{1F98B} Garden Bugs",
            Self::YummyFood => "\u{1F355} Yummy Food",
            Self::MusicParty => "\u{1F3B8} Music Party",
```

**Step 3: Add `faces()` entries**

In the `faces()` match (lines 89-122), add before the closing `}`:

```rust
            Self::GardenBugs => &[
                ("\u{1F98B}", "Butterfly", 523.25),
                ("\u{1F41E}", "Ladybug", 587.33),
                ("\u{1F41D}", "Bee", 659.25),
                ("\u{1F41B}", "Caterpillar", 698.46),
                ("\u{1F40C}", "Snail", 783.99),
                ("\u{1F41C}", "Ant", 880.0),
                ("\u{1FA78}", "Dragonfly", 987.77),
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
```

**Step 4: Verify build compiles**

Run: `trunk build 2>&1 | tail -5`
Expected: Build succeeds.

**Step 5: Commit**

```bash
git add rust/game_memory.rs
git commit -m "feat(memory): add 3 new card themes — Garden Bugs, Yummy Food, Music Party

Each theme has 8 emoji pairs with display names and audio frequencies.
Total themes: 6 (was 3)."
```

---

### Task 11: Update Memory Theme Picker for 6 Themes

**Files:**
- Modify: `rust/game_memory.rs:310-344` (`show_theme_select()`)
- Modify: `src/styles/games.css` (add new color variants)

**Step 1: Add theme buttons for the 3 new themes**

In `show_theme_select()` (line 310), after the existing 3 theme buttons (lines 328-335), add:

```rust
    let bugs_btn = render::create_button(&doc, "game-card game-card--bugs", CardTheme::GardenBugs.name());
    let _ = bugs_btn.set_attribute("data-memory-theme", "bugs");

    let food_btn = render::create_button(&doc, "game-card game-card--food", CardTheme::YummyFood.name());
    let _ = food_btn.set_attribute("data-memory-theme", "food");

    let music_btn = render::create_button(&doc, "game-card game-card--music", CardTheme::MusicParty.name());
    let _ = music_btn.set_attribute("data-memory-theme", "music");

    let _ = buttons.append_child(&bugs_btn);
    let _ = buttons.append_child(&food_btn);
    let _ = buttons.append_child(&music_btn);
```

**Step 2: Handle new theme selections in the click handler**

Find the match arm that converts `data-memory-theme` attribute to `CardTheme` (search for `"forest"` match). Add:

```rust
    "bugs" => CardTheme::GardenBugs,
    "food" => CardTheme::YummyFood,
    "music" => CardTheme::MusicParty,
```

**Step 3: Add CSS color variants for new themes**

In `src/styles/games.css`, after the existing `.game-card--space` variant (around line 190), add:

```css
.game-card--bugs {
  --card-bg: linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%);
  --card-border: #81C784;
}
.game-card--food {
  --card-bg: linear-gradient(135deg, #FFF8E1 0%, #FFE082 100%);
  --card-border: #FFB300;
}
.game-card--music {
  --card-bg: linear-gradient(135deg, #FCE4EC 0%, #F48FB1 100%);
  --card-border: #E91E63;
}
```

**Step 4: Verify build compiles**

Run: `trunk build 2>&1 | tail -5`
Expected: Build succeeds.

**Step 5: Commit**

```bash
git add rust/game_memory.rs src/styles/games.css
git commit -m "feat(memory): update theme picker for 6 themes + CSS color variants

Add buttons for Garden Bugs, Yummy Food, Music Party. New CSS variants
for --bugs (green), --food (yellow/gold), --music (pink/coral)."
```

---

### Task 12: Add 4 New Hug Machine Stages

**Files:**
- Modify: `rust/game_hug.rs:20-137`

**Step 1: Add 4 new enum variants**

In `HugStage` enum (line 20), add after `StarCatch = 10`:

```rust
    PeekaBoo    = 11,
    PattyKake   = 12,
    BlowKisses  = 13,
    MagicSpell  = 14,
```

**Step 2: Add completion sound functions**

After `complete_star()` (line 57), add:

```rust
fn complete_peekaboo()    { synth_audio::giggle(); confetti::burst_party(); }
fn complete_pattykake()   { synth_audio::tap(); confetti::burst_stars(); }
fn complete_blowkisses()  { synth_audio::dreamy(); confetti::burst_hearts(); }
fn complete_magicspell()  { synth_audio::magic_wand(); confetti::burst_unicorn(); }
```

**Step 3: Add StageData entries**

In `STAGE_DATA` array (line 59), change size from `[StageData; 11]` to `[StageData; 15]` and add 4 entries after the StarCatch entry:

```rust
    // PeekaBoo
    StageData {
        instruction: "Peek-a-boo! Tap to hide and find Sparkle!",
        mood: "\u{1F648}", reaction: "\u{1F601}", bubble: "peek-a-boo!",
        bg: "linear-gradient(180deg, #FFE4B5 0%, #FFA07A 100%)",
        pulse_sound: synth_audio::giggle, complete_sound: complete_peekaboo, is_hold: false,
    },
    // PattyKake
    StageData {
        instruction: "Patty-cake! Tap left then right!",
        mood: "\u{1F44F}", reaction: "\u{1F60A}", bubble: "patty-cake!",
        bg: "linear-gradient(180deg, #FFFDE7 0%, #FFF176 100%)",
        pulse_sound: synth_audio::tap, complete_sound: complete_pattykake, is_hold: false,
    },
    // BlowKisses
    StageData {
        instruction: "Blow Sparkle kisses! (quick taps!)",
        mood: "\u{1F618}", reaction: "\u{1F970}", bubble: "mwah!",
        bg: "linear-gradient(180deg, #FFE0EC 0%, #FF80AB 100%)",
        pulse_sound: synth_audio::chime, complete_sound: complete_blowkisses, is_hold: false,
    },
    // MagicSpell
    StageData {
        instruction: "Cast a spell! (draw a circle!)",
        mood: "\u{2728}", reaction: "\u{1FA84}", bubble: "abracadabra!",
        bg: "linear-gradient(180deg, #E1BEE7 0%, #7B1FA2 50%, #311B92 100%)",
        pulse_sound: synth_audio::magic_wand, complete_sound: complete_magicspell, is_hold: false,
    },
```

**Step 4: Update ALL_STAGES array**

Change `ALL_STAGES` (line 139) from `[HugStage; 11]` to `[HugStage; 15]` and add the 4 new entries:

```rust
const ALL_STAGES: [HugStage; 15] = [
    HugStage::GentlePat, HugStage::BigHug, HugStage::TickleTime, HugStage::SleepyLullaby,
    HugStage::WakeUpKiss, HugStage::HighFive, HugStage::BellyRub, HugStage::NoseBoops,
    HugStage::SpinDance, HugStage::GentleRock, HugStage::StarCatch,
    HugStage::PeekaBoo, HugStage::PattyKake, HugStage::BlowKisses, HugStage::MagicSpell,
];
```

**Step 5: Verify build compiles**

Run: `trunk build 2>&1 | tail -5`
Expected: Build succeeds.

**Step 6: Commit**

```bash
git add rust/game_hug.rs
git commit -m "feat(hug): add 4 new stages — PeekaBoo, PattyKake, BlowKisses, MagicSpell

Total stages: 15 (was 11). Each has instruction text, mood/reaction
emojis, bubble text, background gradient, and completion sounds."
```

---

### Task 13: Add Hug Machine Mood Picker

**Files:**
- Modify: `rust/game_hug.rs`

**Step 1: Define mood groups**

Add after `ALL_STAGES`:

```rust
const GENTLE_STAGES: &[HugStage] = &[
    HugStage::GentlePat, HugStage::SleepyLullaby, HugStage::GentleRock,
    HugStage::WakeUpKiss, HugStage::BlowKisses,
];

const SILLY_STAGES: &[HugStage] = &[
    HugStage::TickleTime, HugStage::HighFive, HugStage::NoseBoops,
    HugStage::PeekaBoo, HugStage::PattyKake,
];
```

**Step 2: Add `show_mood_picker()` function**

```rust
fn show_mood_picker(state: Rc<RefCell<AppState>>) {
    let Some(arena) = dom::query("#game-arena") else { return };
    let doc = dom::document();
    dom::safe_set_inner_html(&arena, "");

    let container = render::create_el_with_class(&doc, "div", "memory-select");

    let title = render::create_el_with_class(&doc, "div", "memory-select-title");
    title.set_text_content(Some("\u{1F917} How Should We Play?"));

    let buttons = render::create_el_with_class(&doc, "div", "memory-select-buttons");

    let gentle = render::create_button(&doc, "game-card game-card--hug", "\u{1F60C} Gentle");
    let _ = gentle.set_attribute("data-hug-mood", "gentle");

    let silly = render::create_button(&doc, "game-card game-card--hug", "\u{1F923} Silly");
    let _ = silly.set_attribute("data-hug-mood", "silly");

    let surprise = render::create_button(&doc, "game-card game-card--hug", "\u{1F381} Surprise!");
    let _ = surprise.set_attribute("data-hug-mood", "surprise");

    let _ = buttons.append_child(&gentle);
    let _ = buttons.append_child(&silly);
    let _ = buttons.append_child(&surprise);

    let _ = container.append_child(&title);
    let _ = container.append_child(&buttons);
    let _ = arena.append_child(&container);
}
```

**Step 3: Modify `start()` to show mood picker**

Change `start()` to call `show_mood_picker(state)` instead of immediately starting the game.

**Step 4: Add mood selection handler**

In the click handler, detect `[data-hug-mood]` clicks:

```rust
if let Some(mood_attr) = el.closest("[data-hug-mood]")
    .ok().flatten()
    .and_then(|e| e.get_attribute("data-hug-mood"))
{
    let stages = match mood_attr.as_str() {
        "gentle" => pick_from_pool(GENTLE_STAGES, 5),
        "silly" => pick_from_pool(SILLY_STAGES, 5),
        _ => pick_random_stages(5), // surprise = random from all 15
    };
    start_with_stages(state.clone(), stages);
    return;
}
```

**Step 5: Add `pick_from_pool()` helper**

```rust
fn pick_from_pool(pool: &[HugStage], count: usize) -> Vec<HugStage> {
    let mut v: Vec<HugStage> = pool.to_vec();
    let n = v.len();
    for i in 0..count.min(n) {
        let j = i + (utils::random_u32() as usize % (n - i));
        v.swap(i, j);
    }
    v.truncate(count);
    v
}
```

**Step 6: Extract original game start logic into `start_with_stages()`**

Move the existing `start()` body into `start_with_stages(state, stages)` where `stages` replaces the `pick_random_stages(5)` call.

**Step 7: Update "Play Again" to return to mood picker**

In the end-screen handler, change "Play Again" to call `show_mood_picker(state)`.

**Step 8: Verify build compiles**

Run: `trunk build 2>&1 | tail -5`
Expected: Build succeeds.

**Step 9: Commit**

```bash
git add rust/game_hug.rs
git commit -m "feat(hug): add mood picker — Gentle, Silly, Surprise

Gentle picks from calm stages (GentlePat, SleepyLullaby, GentleRock,
WakeUpKiss, BlowKisses). Silly picks from active stages (TickleTime,
HighFive, NoseBoops, PeekaBoo, PattyKake). Surprise picks randomly
from all 15 stages."
```

---

### Task 14: Add New Paint Stamps, Templates, and Patterns

**Files:**
- Modify: `rust/game_paint.rs:41-79,277-284`

**Step 1: Add 6 new stamps to STAMPS array**

In `STAMPS` (line 41), add after the existing 18 entries:

```rust
    "\u{1F3F0}", // castle
    "\u{1F98B}", // butterfly (already exists above — use "\u{1F41B}" caterpillar instead)
    "\u{1F995}", // dinosaur
    "\u{1F697}", // car
    "\u{1F451}", // crown (already exists — use "\u{1F680}" rocket instead)
    "\u{1F339}", // rose
```

Actually, check for duplicates first. Existing stamps already include butterfly (`\u{1F98B}`) and crown (`\u{1F451}`). Replace duplicates:

```rust
    "\u{1F3F0}", // castle
    "\u{1F995}", // dinosaur
    "\u{1F697}", // car
    "\u{1F680}", // rocket
    "\u{1F339}", // rose
    "\u{1F47B}", // ghost
```

**Step 2: Add 3 new templates**

In `TEMPLATES` (line 72), add:

```rust
    ("castle", "\u{1F3F0} Castle"),
    ("butterfly", "\u{1F98B} Butterfly"),
    ("dinosaur", "\u{1F995} Dinosaur"),
```

**Step 3: Add 3 new patterns**

In the `patterns` array (line 277), add:

```rust
    ("clouds", "\u{2601} Clouds"),
    ("polkadots", "\u{25CF} Polka Dots"),
    ("zigzag", "\u{26A1} Zigzag"),
```

**Step 4: Implement template outlines for new templates**

Find the `draw_template()` function and add `"castle"`, `"butterfly"`, `"dinosaur"` arms. Each draws a simple outline using `ctx.begin_path()`, `ctx.move_to()`, `ctx.line_to()`, `ctx.stroke()`. Keep outlines simple (5-10 lines each) — these are for a 4-year-old.

**Step 5: Implement pattern rendering for new patterns**

Find the pattern rendering code and add `"clouds"`, `"polkadots"`, `"zigzag"` arms:

```rust
"clouds" => {
    // Repeating cloud shapes using arcs
    for row in (0..h as i32).step_by(60) {
        for col in (0..w as i32).step_by(80) {
            ctx.begin_path();
            ctx.arc(col as f64 + 40.0, row as f64 + 30.0, 20.0, 0.0, std::f64::consts::TAU).ok();
            ctx.arc(col as f64 + 55.0, row as f64 + 25.0, 15.0, 0.0, std::f64::consts::TAU).ok();
            ctx.fill();
        }
"polkadots" => {
    for row in (0..h as i32).step_by(40) {
        for col in (0..w as i32).step_by(40) {
            ctx.begin_path();
            ctx.arc(col as f64 + 20.0, row as f64 + 20.0, 8.0, 0.0, std::f64::consts::TAU).ok();
            ctx.fill();
        }
"zigzag" => {
    ctx.begin_path();
    for row in (0..h as i32).step_by(30) {
        for col in (0..w as i32).step_by(20) {
            let y = row as f64 + if col / 20 % 2 == 0 { 0.0 } else { 15.0 };
            if col == 0 { ctx.move_to(col as f64, y); }
            else { ctx.line_to(col as f64, y); }
        }
    ctx.stroke();
}
```

**Step 6: Verify build compiles**

Run: `trunk build 2>&1 | tail -5`
Expected: Build succeeds.

**Step 7: Commit**

```bash
git add rust/game_paint.rs
git commit -m "feat(paint): add 6 stamps, 3 templates, 3 patterns

New stamps: castle, dinosaur, car, rocket, rose, ghost (total 24).
New templates: castle, butterfly, dinosaur outlines (total 9).
New patterns: clouds, polka dots, zigzag (total 9)."
```

---

### Task 15: Add Paint Category Picker

**Files:**
- Modify: `rust/game_paint.rs`

**Step 1: Define categories**

Add near the top of the file:

```rust
const PAINT_CATEGORIES: &[(&str, &str, &str)] = &[
    ("free", "\u{1F58C}", "Free Draw"),
    ("animals", "\u{1F98B}", "Animals"),
    ("fantasy", "\u{1F3F0}", "Fantasy"),
    ("food", "\u{1F355}", "Food"),
    ("space", "\u{1F680}", "Space"),
];
```

**Step 2: Add `show_category_picker()` function**

```rust
fn show_category_picker(state: Rc<RefCell<AppState>>) {
    let Some(arena) = dom::query("#game-arena") else { return };
    let doc = dom::document();
    dom::safe_set_inner_html(&arena, "");

    let container = render::create_el_with_class(&doc, "div", "memory-select");

    let title = render::create_el_with_class(&doc, "div", "memory-select-title");
    title.set_text_content(Some("\u{1F3A8} What Do You Want to Paint?"));

    let buttons = render::create_el_with_class(&doc, "div", "memory-select-buttons");

    for &(id, emoji, label) in PAINT_CATEGORIES {
        let text = format!("{} {}", emoji, label);
        let btn = render::create_button(&doc, "game-card game-card--paint", &text);
        let _ = btn.set_attribute("data-paint-category", id);
        let _ = buttons.append_child(&btn);
    }

    let _ = container.append_child(&title);
    let _ = container.append_child(&buttons);
    let _ = arena.append_child(&container);
}
```

**Step 3: Modify `start()` to show category picker**

Change `start()` to call `show_category_picker(state)`. Extract existing body to `start_with_category(state, category)`.

**Step 4: Handle category selection**

In click handler, detect `[data-paint-category]` and auto-select the first stamp/template from that category when starting the paint canvas.

**Step 5: Verify build compiles**

Run: `trunk build 2>&1 | tail -5`
Expected: Build succeeds.

**Step 6: Commit**

```bash
git add rust/game_paint.rs
git commit -m "feat(paint): add category picker — Free Draw, Animals, Fantasy, Food, Space

Shows category selection before canvas opens. Each category groups
related stamps and templates."
```

---

### Task 16: Add Unicorn Biome Data Structure

**Files:**
- Modify: `rust/game_unicorn_friends.rs:1-22`
- Modify: `rust/game_unicorn.rs`

**Step 1: Create `Biome` struct in `game_unicorn_friends.rs`**

Add before `FRIEND_TYPES`:

```rust
pub struct Biome {
    pub name: &'static str,
    pub picker_emoji: &'static str,
    pub friends: &'static [(&'static str, &'static str, u32, u32)],
    pub bg_gradient: (&'static str, &'static str, &'static str),
    pub ambient_freq: f32,
}

pub const BIOME_FOREST: Biome = Biome {
    name: "Enchanted Forest",
    picker_emoji: "\u{1F332}",
    friends: FRIEND_TYPES,
    bg_gradient: ("#87CEEB", "#90EE90", "#228B22"),
    ambient_freq: 110.0,
};

pub const BIOME_CAVE: Biome = Biome {
    name: "Crystal Cave",
    picker_emoji: "\u{1F48E}",
    friends: &[
        ("bat", "\u{1F987}", 1, 40),
        ("glowworm", "\u{1F41B}", 2, 25),
        ("crystal_spider", "\u{1F577}", 3, 20),
        ("cave_fish", "\u{1F420}", 2, 25),
        ("mushroom", "\u{1F344}", 1, 35),
        ("gem_dragon", "\u{1F432}", 5, 10),
        ("mole", "\u{1F401}", 1, 35),
        ("firefly", "\u{2728}", 2, 30),
    ],
    bg_gradient: ("#2d1b69", "#4a148c", "#1a0033"),
    ambient_freq: 85.0,
};

pub const BIOME_CLOUD: Biome = Biome {
    name: "Cloud Kingdom",
    picker_emoji: "\u{2601}",
    friends: &[
        ("cloud_bunny", "\u{1F430}", 1, 40),
        ("sky_fish", "\u{1F41F}", 2, 25),
        ("rainbow_bird", "\u{1F426}", 3, 20),
        ("wind_sprite", "\u{1F4A8}", 2, 25),
        ("star_mouse", "\u{1F42D}", 1, 35),
        ("moon_cat", "\u{1F431}", 2, 30),
        ("sun_bear", "\u{1F43B}", 3, 15),
        ("thunder_pup", "\u{1F436}", 5, 10),
    ],
    bg_gradient: ("#E3F2FD", "#BBDEFB", "#87CEEB"),
    ambient_freq: 165.0,
};

pub const BIOME_OCEAN: Biome = Biome {
    name: "Ocean Shore",
    picker_emoji: "\u{1F30A}",
    friends: &[
        ("crab", "\u{1F980}", 1, 40),
        ("starfish", "\u{2B50}", 2, 25),
        ("seahorse", "\u{1F40E}", 3, 20),
        ("dolphin", "\u{1F42C}", 2, 25),
        ("turtle", "\u{1F422}", 1, 35),
        ("octopus", "\u{1F419}", 3, 15),
        ("jellyfish", "\u{1FAB8}", 2, 30),
        ("clownfish", "\u{1F420}", 1, 40),
    ],
    bg_gradient: ("#00BCD4", "#80DEEA", "#FFECB3"),
    ambient_freq: 130.0,
};

pub const ALL_BIOMES: &[&Biome] = &[&BIOME_FOREST, &BIOME_CAVE, &BIOME_CLOUD, &BIOME_OCEAN];
```

**Step 2: Make `FriendManager` accept dynamic friend types**

Modify `FriendManager::new()` to accept a `&[(&str, &str, u32, u32)]` parameter instead of using the hardcoded `FRIEND_TYPES`.

**Step 3: Verify build compiles**

Run: `trunk build 2>&1 | tail -5`
Expected: Build succeeds.

**Step 4: Commit**

```bash
git add rust/game_unicorn_friends.rs rust/game_unicorn.rs
git commit -m "feat(unicorn): add Biome data structure with 4 biomes

Enchanted Forest (existing), Crystal Cave (purple/dark),
Cloud Kingdom (white/sky blue), Ocean Shore (teal/sand).
Each biome has 8 unique friends, background gradient, and ambient frequency."
```

---

### Task 17: Add Unicorn Biome Picker

**Files:**
- Modify: `rust/game_unicorn.rs`

**Step 1: Add `show_biome_picker()` function**

```rust
fn show_biome_picker(state: Rc<RefCell<AppState>>) {
    let Some(arena) = dom::query("#game-arena") else { return };
    let doc = dom::document();
    dom::safe_set_inner_html(&arena, "");

    let container = render::create_el_with_class(&doc, "div", "memory-select");

    let title = render::create_el_with_class(&doc, "div", "memory-select-title");
    title.set_text_content(Some("\u{1F984} Choose Your World!"));

    let buttons = render::create_el_with_class(&doc, "div", "memory-select-buttons");

    for biome in game_unicorn_friends::ALL_BIOMES {
        let label = format!("{} {}", biome.picker_emoji, biome.name);
        let btn = render::create_button(&doc, "game-card game-card--unicorn", &label);
        let _ = btn.set_attribute("data-unicorn-biome", biome.name);
        let _ = buttons.append_child(&btn);
    }

    let _ = container.append_child(&title);
    let _ = container.append_child(&buttons);
    let _ = arena.append_child(&container);
}
```

**Step 2: Modify `start()` to show biome picker**

Change `start()` to call `show_biome_picker(state)`.

**Step 3: Add biome selection handler**

Detect `[data-unicorn-biome]` clicks and launch game with selected biome's friends, background, and ambient frequency.

**Step 4: Wire biome background into `draw_game()`**

In `draw_game()` (line 419), use the biome's `bg_gradient` tuple for the gradient fallback colors instead of hardcoded values.

**Step 5: Wire biome ambient frequency into audio**

In `game_unicorn_audio.rs:38`, use the biome's `ambient_freq` instead of hardcoded `110.0`.

**Step 6: Verify build compiles**

Run: `trunk build 2>&1 | tail -5`
Expected: Build succeeds.

**Step 7: Commit**

```bash
git add rust/game_unicorn.rs rust/game_unicorn_friends.rs rust/game_unicorn_audio.rs
git commit -m "feat(unicorn): add biome picker + wire biome into gameplay

Shows 4 biome buttons before game. Selected biome controls friend types,
background gradient, and ambient audio frequency."
```

---

### Task 18: Update Hub Cards with Theme Counts

**Files:**
- Modify: `rust/games.rs:13-19`

**Step 1: Update GAME_CARDS descriptions to show theme counts**

Change the descriptions in `GAME_CARDS`:

```rust
const GAME_CARDS: &[(&str, &str, &str, &str, &str, &str)] = &[
    ("\u{1F496}", "Kindness Catcher", "Catch falling hearts! \u{00B7} 4 themes", "catcher", "catcher", "illustrations/buttons/btn-game-catcher.webp"),
    ("\u{1F0CF}", "Memory Match", "Find the matching pairs! \u{00B7} 6 themes", "memory", "memory", "illustrations/buttons/btn-game-memory.webp"),
    ("\u{1F917}", "Hug Machine", "Give Sparkle hugs! \u{00B7} 3 moods", "hug", "hug", "illustrations/buttons/btn-game-hug.webp"),
    ("\u{1F3A8}", "Magic Painting", "Paint and create art! \u{00B7} 5 styles", "paint", "paint", "illustrations/buttons/btn-game-paint.webp"),
    ("\u{1F984}", "Unicorn Adventure", "Collect forest friends! \u{00B7} 4 worlds", "unicorn", "unicorn", "illustrations/buttons/btn-game-unicorn.webp"),
];
```

**Step 2: Verify build compiles**

Run: `trunk build 2>&1 | tail -5`
Expected: Build succeeds.

**Step 3: Commit**

```bash
git add rust/games.rs
git commit -m "feat(hub): update game card descriptions with theme/mood/world counts"
```

---

### Task 19: Execute Remaining Polish Tasks (7-17)

> Execute Tasks 7-17 from `docs/plans/2026-02-15-debug-and-polish-impl.md` exactly as written. Those tasks cover:
> - Task 7: Sound effect — reflection prompt
> - Task 8: Sound effect — all-quests-done sparkle
> - Task 9: Shimmer animation on loading skeletons
> - Task 10: Replace hardcoded sizes with design tokens
> - Task 11: Focus-visible states for emotion buttons
> - Task 12: Z-index scale in design tokens
> - Task 13: Bloom animation performance
> - Task 14: SW image fallback
> - Task 15: PIN storage documentation
> - Task 16: Game stats placeholder text (already done in Task 18 above — the "..." is at games.rs:85)
> - Task 17: Final build verification
>
> Commit after each task per the polish plan's instructions.

---

## Actions
_No actions recorded._

## Validation
**Step 1: Full release build**

Run: `trunk build --release 2>&1 | tail -10`
Expected: Build succeeds with no errors or warnings.

**Step 2: Verify all CSS in dist**

Run: `ls dist/*.css | wc -l`
Expected: 16.

**Step 3: Verify no .forget() in game files**

Run: `grep -n "\.forget()" rust/game_catcher.rs rust/game_memory.rs rust/game_hug.rs`
Expected: No matches.

**Step 4: Verify no contrast-color() remaining**

Run: `grep -r "contrast-color" src/styles/`
Expected: No matches.

**Step 5: Verify theme/biome data compiles**

Run: `grep -c "CatcherTheme\|CardTheme\|HugStage\|Biome\|PAINT_CATEGORIES" rust/game_*.rs`
Expected: Multiple matches confirming all new types are in use.

**Step 6: Commit any remaining changes**

```bash
git status
```

If clean, done. If not, commit remaining.

**Step 7: Final commit**

```bash
git add -A
git commit -m "chore: games content expansion + polish complete

Added theme pickers and new content to all 5 games:
- Catcher: 4 theme packs (Classic, Garden, Sweets, Starry)
- Memory: 6 card themes (was 3)
- Hug: 15 stages (was 11) + 3 mood picker
- Paint: 24 stamps, 9 templates, 9 patterns + category picker
- Unicorn: 4 biomes (Forest, Cave, Cloud, Ocean)

Plus 17 debug/polish fixes from the polish plan."
```

## References
_No references recorded._


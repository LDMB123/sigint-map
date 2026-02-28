# Wave 7: Companion Care & Personality — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform Sparkle into a living companion with mood, feeding, petting, play animations, and contextual speech — driven by kindness activity, zero negative states.

**Architecture:** New `companion_care.rs` module owns all care state (mood, feed, pet, play) + DB persistence via `companion_state` table. New `companion_speech.rs` owns contextual messages. Existing `companion.rs` gets care menu UI (replacing current conversation menu). Existing `synth_audio.rs` gets 6 new sounds. No new image assets — reuse 18 companion WebPs.

**Tech Stack:** Rust/WASM, web-sys, wasm-bindgen, Popover API, View Transitions API, Web Audio API, Safari 26.2

---

### Task 1: DB schema + companion_care.rs data layer

**Goal:** Add `companion_state` table and Rust module for reading/writing care state.

**Files:**
- Modify: `public/db-worker.js` — add `companion_state` CREATE TABLE (after line 289, the last CREATE TABLE)
- Create: `rust/companion_care.rs` — care state CRUD + mood calculation
- Modify: `rust/lib.rs` — add `mod companion_care;` declaration
- Modify: `rust/state.rs` — add care fields to `AppState`

**Context for implementer:**

The DB worker is in `public/db-worker.js`. All CREATE TABLE statements are in the `initializeDatabase()` function. Add after the last one (`family_acts`):

```sql
CREATE TABLE IF NOT EXISTS companion_state (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
```

The `rust/state.rs` file has `AppState` struct on line 1 (single-line, minified). Add these fields before the `parent_pin_set` field:

```rust
pub sparkle_mood: String,
pub sparkle_last_fed_ms: f64,
pub sparkle_last_pet_ms: f64,
pub sparkle_last_play_ms: f64,
pub sparkle_feeds_today: u32,
```

Default values: `sparkle_mood` = `"sleepy".to_string()`, others = `0.0` / `0`.

For `companion_care.rs`, implement:
- `pub async fn get_state(key: &str) -> Option<String>` — reads from companion_state table
- `pub async fn set_state(key: &str, value: &str)` — upserts into companion_state
- `pub async fn hydrate()` — reads all keys, populates AppState fields
- `pub fn calculate_mood(hearts_today: u32, streak: u32, fed_today: bool) -> &'static str` — returns "sleepy", "happy", or "excited"
  - Rules: 0 acts + not fed = "sleepy"; 1-2 acts OR fed = "happy"; 3+ acts OR streak >= 7 = "excited"
- `pub async fn update_mood()` — recalculates mood from current state, saves to DB, updates AppState
- `pub async fn record_feed()` — writes last_fed_at, increments feeds_today + total_feeds, calls update_mood
- `pub async fn record_pet()` — writes last_pet_at, increments total_pets, calls update_mood
- `pub async fn record_play()` — writes last_play_at, increments total_plays
- `pub fn feed_cooldown_remaining() -> f64` — returns ms until next feed allowed (600_000ms = 10min)
- `pub fn play_cooldown_remaining() -> f64` — returns ms until next play allowed (3_000ms)

Use `crate::db_client::query` and `crate::db_client::exec` for all DB access. Use `crate::browser_apis::now_ms()` for timestamps. Use `crate::state::with_state` / `with_state_mut` for AppState access. Use `crate::utils::today_key()` to check if feeds_today needs reset (compare stored day_key vs today).

In `rust/lib.rs`, add `mod companion_care;` after `mod companion_skins;` (around position in the module list on line 0). Then in `boot_async`, add `companion_care::hydrate().await;` in batch 4 after `hydrate_state().await;` and before `update_loading_progress(95)`.

**Verify:** `cargo build --release --target wasm32-unknown-unknown` passes with 0 errors.

**Commit:** `feat: add companion_state DB table and companion_care data layer`

---

### Task 2: Synth audio — 6 new care sounds

**Goal:** Add chomp, purr, boing, shimmer, twinkle, and munch sounds to `synth_audio.rs`.

**Files:**
- Modify: `rust/synth_audio.rs` — add 6 new sound presets and public functions

**Context for implementer:**

`synth_audio.rs` has a `get_sound_preset(sound: &str) -> SoundPreset` match block (line 10) and public convenience functions (lines 23-38). Follow the exact same pattern.

Add these 6 presets to the match block (before the `_ =>` default arm):

1. **"chomp"** — Quick bite sound. Triangle + sine, fast attack (10ms), short decay (40ms), sustain 0.4, release 200ms. Layers: Triangle 1.0x/0°/1.0, Sine 2.0x/0°/0.3.

2. **"purr"** — Low rumbling purr. Sine + sine with detuning for beating. Very slow attack (200ms), long decay (300ms), sustain 0.85, release 2000ms. Layers: Sine 1.0x/0°/1.0, Sine 1.0x/3°/0.8, Triangle 0.5x/0°/0.4.

3. **"boing"** — Bouncy spring sound. Sine, fast attack (15ms), short decay (50ms), sustain 0.5, release 400ms. Layers: Sine 1.0x/0°/1.0, Triangle 2.0x/0°/0.2.

4. **"shimmer"** — Ethereal rainbow shimmer. Triangle + sine chorus. Attack 80ms, decay 150ms, sustain 0.7, release 1200ms. Layers: Triangle 1.0x/0°/1.0, Sine 1.0x/5°/0.6, Sine 2.0x/-3°/0.3, Triangle 3.0x/0°/0.15.

5. **"twinkle"** — Quick sparkly twinkle. Sine, fast attack (20ms), decay 60ms, sustain 0.5, release 500ms. Layers: Sine 1.0x/0°/1.0, Sine 3.0x/0°/0.25, Triangle 2.0x/7°/0.2.

6. **"munch"** — Repeated chomping (uses chomp preset). Not a new preset — just a convenience function.

Add these public functions after `reunion_sparkle()` (line 38):

```rust
pub fn chomp() { with_audio("chomp", |preset| { play_layered_note(220.0, 0.06, 0.0, &preset); play_layered_note(180.0, 0.04, 0.05, &preset); }); }

pub fn purr() { with_audio("purr", |preset| { play_layered_note(80.0, 2.0, 0.0, &preset); }); }

pub fn boing() { with_audio("boing", |preset| { play_sweep(200.0, 600.0, 0.15, 0.0, &preset); play_sweep(600.0, 300.0, 0.15, 0.12, &preset); }); }

pub fn shimmer() { with_audio("shimmer", |preset| { play_layered_note(880.0, 0.15, 0.0, &preset); play_layered_note(1046.5, 0.15, 0.08, &preset); play_layered_note(1318.5, 0.15, 0.16, &preset); play_layered_note(1568.0, 0.20, 0.24, &preset); }); }

pub fn twinkle() { with_audio("twinkle", |preset| { play_layered_note(1568.0, 0.06, 0.0, &preset); play_layered_note(2093.0, 0.06, 0.06, &preset); play_layered_note(1568.0, 0.06, 0.12, &preset); play_layered_note(2637.0, 0.10, 0.18, &preset); }); }

pub fn munch() { with_audio("chomp", |preset| { for i in 0..3 { play_layered_note(220.0, 0.05, i as f64 * 0.12, &preset); play_layered_note(180.0, 0.04, i as f64 * 0.12 + 0.04, &preset); } }); }
```

**Verify:** `cargo build --release --target wasm32-unknown-unknown` passes with 0 errors.

**Commit:** `feat: add 6 companion care sounds (chomp, purr, boing, shimmer, twinkle, munch)`

---

### Task 3: companion_speech.rs — contextual speech bubbles

**Goal:** Create module with all 20 contextual messages and trigger logic with rate-limiting.

**Files:**
- Create: `rust/companion_speech.rs` — message data + trigger functions
- Modify: `rust/lib.rs` — add `mod companion_speech;`

**Context for implementer:**

Add `mod companion_speech;` in `rust/lib.rs` after `mod companion_care;`.

Create `rust/companion_speech.rs` with:

```rust
use crate::{browser_apis, companion, speech};
use std::cell::Cell;

thread_local! {
    static LAST_BUBBLE_MS: Cell<f64> = const { Cell::new(0.0) };
}

const RATE_LIMIT_MS: f64 = 30_000.0; // Max 1 bubble per 30 seconds

const FEED_PHRASES: &[&str] = &[
    "Yummy! Thank you! 🌈",
    "That was delicious! 😋",
    "My tummy is happy! 💜",
    "You take such good care of me! 🦄",
];

const PET_PHRASES: &[&str] = &[
    "That feels so nice! 💜",
    "I love cuddles! 🤗",
    "You're the best friend! ⭐",
    "Purrrr! 😊",
];

const PLAY_PHRASES: &[&str] = &[
    "Wheee! So fun! 🎪",
    "Again! Again! 🌟",
    "That was amazing! ✨",
    "I love playing with you! 💜",
];

const MOOD_UP_PHRASES: &[&str] = &[
    "I feel so happy! 💜",
    "Kindness makes me sparkle! ✨",
    "What a wonderful day! 🌈",
    "You make everything better! ⭐",
];
```

Public functions:
- `pub fn on_feed()` — rate-limited bubble from FEED_PHRASES + TTS
- `pub fn on_pet()` — rate-limited bubble from PET_PHRASES + TTS
- `pub fn on_play()` — rate-limited bubble from PLAY_PHRASES + TTS
- `pub fn on_mood_change(mood: &str)` — rate-limited bubble from MOOD_UP_PHRASES when mood improves + TTS
- `fn try_show_bubble(phrases: &[&str]) -> bool` — checks rate limit, shows bubble if allowed, returns true if shown

Use `browser_apis::now_ms()` for rate limiting. Use `companion::show_bubble_typewriter` for display (note: this is currently a private fn in companion.rs — you'll need to make it `pub(crate)`). Use `speech::speak()` for TTS.

The phrase picker pattern: `let idx = (browser_apis::now_ms() as usize) % phrases.len(); phrases[idx]` (matches existing pattern in companion.rs).

**Important:** In `companion.rs`, change `fn show_bubble_typewriter` to `pub(crate) fn show_bubble_typewriter` (line 194) so companion_speech.rs can access it.

**Verify:** `cargo build --release --target wasm32-unknown-unknown` passes with 0 errors.

**Commit:** `feat: add companion_speech module with 20 contextual messages`

---

### Task 4: Care menu UI — replace conversation menu with feed/pet/play

**Goal:** Replace existing joke/mood/suggest menu with feed/pet/play care menu using Popover API.

**Files:**
- Modify: `rust/companion.rs` — replace `show_conversation_menu` with care menu, add petting gesture, wire play animations
- Modify: `src/styles/home.css` — add care menu styles, play animation keyframes

**Context for implementer:**

In `companion.rs`, the current `show_conversation_menu()` (line 72) creates a bubble with 3 buttons: joke, mood, suggest. Replace this with a care menu:

Replace the `show_conversation_menu()` function body to:
1. Create a popover div with `data-care-menu` attribute and `popover="auto"` attribute
2. 3 buttons: "🍪 Feed" (`data-care="feed"`), "🤗 Pet" (`data-care="pet"`), "🎪 Play" (`data-care="play"`)
3. Use `el.toggle_popover()` via web_sys (call `js_sys::Reflect::apply` on element's `togglePopover` method)
4. Event delegation on click: match `data-care` attribute → call respective handler

Feed handler (`on_care_feed`):
- Check `companion_care::feed_cooldown_remaining()` > 0 → show "Sparkle isn't hungry yet!" bubble, return
- Check hearts_total from state to determine which foods are unlocked
- Show food sub-menu (1-3 food buttons depending on unlocked)
- On food tap → call `companion_care::record_feed()`, play `synth_audio::munch()`, bounce animation, `companion_speech::on_feed()`, if first feed today add +1 heart via existing kind_act pattern

Pet handler — handled separately (see below).

Play handler (`on_care_play`):
- Check `companion_care::play_cooldown_remaining()` > 0 → ignore
- Pick random animation (0-3), avoid repeating last (store in thread_local Cell)
- Apply CSS class for animation, play corresponding sound
- Call `companion_care::record_play()`, `companion_speech::on_play()`

For **petting**, modify `bind_companion_tap` (line 12):
- Add `pointerdown` + `pointerup` listeners alongside the existing click handler
- On pointerdown: start a timer. If held 500ms → enter "petting" mode, play `synth_audio::purr()`, show sparkle particles
- On pointerup: if petting duration >= 3000ms → bounce + "Sparkle Love" micro-sticker float, call `companion_care::record_pet()`, `companion_speech::on_pet()`
- If pointerup before 500ms → fall through to existing click behavior (care menu)

The existing tickle behavior (5 rapid taps) should remain — it's a fun easter egg.

For **play animations CSS**, add to `src/styles/home.css` after the `.companion-conversation button:active` block (line 688):

```css
/* ── Care menu ── */
.care-menu {
  position: fixed;
  bottom: calc(var(--space-md) + 260px);
  right: var(--space-md);
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 1.5rem;
  padding: 0.75rem;
  display: flex;
  gap: 0.5rem;
  border: 2px solid var(--purple-300, #c084fc);
  box-shadow: 0 4px 20px rgba(147, 51, 234, 0.2);
  z-index: 100;
}

.care-menu[popover] { margin: 0; inset: unset; bottom: calc(var(--space-md) + 260px); right: var(--space-md); }

.care-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 0.75rem 1rem;
  border: none;
  background: var(--purple-100, #f3e8ff);
  border-radius: 1rem;
  font-size: 2rem;
  min-width: 4.5rem;
  min-height: 4.5rem;
  touch-action: manipulation;
  cursor: pointer;
}

.care-btn-label { font-size: 0.7rem; font-weight: 600; color: var(--purple-700, #7c3aed); }

.care-btn:active { transform: scale(0.9); }

.care-btn[disabled] { opacity: 0.4; }

/* ── Food sub-menu ── */
.food-menu { display: flex; gap: 0.5rem; padding: 0.5rem; }

.food-btn {
  font-size: 2.5rem;
  padding: 0.75rem;
  border: 2px solid var(--purple-200, #e9d5ff);
  border-radius: 1rem;
  background: white;
  min-width: 4rem;
  min-height: 4rem;
  touch-action: manipulation;
}

.food-btn:active { transform: scale(0.9); background: var(--purple-50, #faf5ff); }

.food-btn[data-locked] { opacity: 0.3; pointer-events: none; }

/* ── Play animations ── */
@keyframes sparkle-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
@keyframes sparkle-jump { 0%, 100% { transform: translateY(0); } 40% { transform: translateY(-80px); } }
@keyframes sparkle-rainbow { 0% { filter: hue-rotate(0deg); } 100% { filter: hue-rotate(360deg); } }
@keyframes sparkle-burst { 0% { transform: scale(1); } 50% { transform: scale(1.3); } 100% { transform: scale(1); } }

.companion--anim-spin { animation: sparkle-spin 1.2s ease-in-out; }
.companion--anim-jump { animation: sparkle-jump 1.2s ease-in-out; }
.companion--anim-rainbow { animation: sparkle-rainbow 1.2s linear; }
.companion--anim-burst { animation: sparkle-burst 1.2s ease-in-out; }

/* ── Micro-sticker float ── */
@keyframes micro-sticker-float {
  0% { opacity: 1; transform: translateY(0) scale(1); }
  100% { opacity: 0; transform: translateY(-120px) scale(1.5); }
}

.micro-sticker {
  position: absolute;
  bottom: 100%;
  right: 50%;
  font-size: 2rem;
  pointer-events: none;
  animation: micro-sticker-float 1.5s ease-out forwards;
}
```

**Verify:** `cargo build --release --target wasm32-unknown-unknown` passes. Also verify `trunk build --release` passes (if asset-manifest files are dirty, run `git checkout -- public/asset-manifest.js public/asset-manifest.json` first).

**Commit:** `feat: companion care menu with feed, pet, play interactions`

---

### Task 5: Wire mood into companion expressions + boot hydration

**Goal:** Connect mood system to visual expression rendering. Mood drives Sparkle's default expression at boot and after interactions.

**Files:**
- Modify: `rust/companion.rs` — use mood for initial expression, update after care actions
- Modify: `rust/companion_skins.rs` — add `pub fn mood_to_expression(mood: &str) -> &'static str`
- Modify: `rust/lib.rs` — call `companion_care::update_mood()` at boot after hydration

**Context for implementer:**

In `companion_skins.rs`, add after `seed_companion_skins()`:
```rust
pub fn mood_to_expression(mood: &str) -> &'static str {
    match mood {
        "excited" => "celebrate",
        "happy" => "happy",
        _ => "encourage", // "sleepy" default
    }
}
```

In `companion.rs` `init()` (line 9), change the initial `spawn_skin_render(&PENDING_RENDER_ABORT, "happy")` to use mood:
```rust
let expression = crate::companion_skins::mood_to_expression(
    &crate::state::with_state(|s| s.sparkle_mood.clone())
);
spawn_skin_render(&PENDING_RENDER_ABORT, expression);
```

Note: `spawn_skin_render` takes `&'static str`, so you'll need to match the mood string to a static str. Use a match block returning the static str reference.

In `lib.rs` `boot_async`, after `companion_care::hydrate().await;`, add:
```rust
companion_care::update_mood().await;
```

Also wire mood updates into existing reaction handlers. In `companion.rs`, after `on_kind_act()` fires its reaction, spawn an async task to update mood:
```rust
pub fn on_kind_act() {
    fire_reaction(&R_KIND_ACT);
    browser_apis::spawn_local_logged("mood-update-act", async {
        companion_care::update_mood().await;
        Ok(())
    });
}
```

Do the same for `celebrate_first_act_today()`.

**Verify:** `cargo build --release --target wasm32-unknown-unknown` passes with 0 errors.

**Commit:** `feat: wire mood system into companion expressions and boot sequence`

---

### Task 6: SW cache bump + final verification

**Goal:** Bump SW cache version to v10 for Wave 7. Verify complete build.

**Files:**
- Modify: `public/sw.js` — line 10: change `kindheart-v9` to `kindheart-v10`, update comment

**Context for implementer:**

In `public/sw.js`, line 10 currently reads:
```js
const CACHE_NAME = 'kindheart-v9'; // Wave 6: sticker art completion (22 illustrations)
```

Change to:
```js
const CACHE_NAME = 'kindheart-v10'; // Wave 7: companion care & personality
```

No new assets to add to `sw-assets.js` — this wave reuses existing companion WebPs.

**Verification checklist:**
1. `cargo build --release --target wasm32-unknown-unknown` — 0 errors
2. `trunk build --release` — succeeds (clean asset-manifest first: `git checkout -- public/asset-manifest.js public/asset-manifest.json`)
3. `grep -c 'companion_state' public/db-worker.js` — returns 1
4. `grep -c 'companion_care' rust/lib.rs` — returns at least 1
5. `grep -c 'companion_speech' rust/lib.rs` — returns at least 1
6. `grep 'kindheart-v10' public/sw.js` — returns match
7. `grep -c 'pub fn chomp\|pub fn purr\|pub fn boing\|pub fn shimmer\|pub fn twinkle\|pub fn munch' rust/synth_audio.rs` — returns 6

**Commit:** `feat: bump SW cache to v10 for Wave 7 companion care`

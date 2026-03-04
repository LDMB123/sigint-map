# Wave 8: Zero Warnings Polish — Blaire's Kind Heart

- Archive Path: `docs/archive/plans/2026-02-20-zero-warnings-polish.md`
- Normalized On: `2026-03-04`
- Source Title: `Wave 8: Zero Warnings Polish — Blaire's Kind Heart`

## Summary
> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

## Context
> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Eliminate all 4 compiler warnings by wiring unused companion mood functions into the live codebase, achieving 0 warnings for launch.

**Architecture:** No new modules or DB tables. 4 surgical wiring changes: connect `companion_speech::on_mood_change()` to `companion_care::update_mood()`, use `companion_skins::mood_to_expression()` in companion init, replace `synth_audio::munch()` call with `synth_audio::chomp()` in feed handler, and add `role`/`aria-label` on category panel. All changes are ≤10 lines each.

**Tech Stack:** Rust/WASM, web-sys, wasm-bindgen

**Git state:** Branch `main`, HEAD `a5f4253`, build passes with 4 warnings, SW cache at v11

---

### Task 1: Wire `companion_speech::on_mood_change()` into `companion_care::update_mood()`

**Files:**
- Modify: `rust/companion_care.rs` — add `on_mood_change` call at end of `update_mood()`

**Context:** `companion_care::update_mood()` (line 93-104) calculates the new mood and persists it. `companion_speech::on_mood_change(mood)` (line 65-70 of `companion_speech.rs`) shows a speech bubble when mood becomes "happy" or "excited". Currently `on_mood_change` and its `MOOD_UP_PHRASES` constant are never called, producing 2 compiler warnings.

**Step 1:** In `rust/companion_care.rs`, add `crate::companion_speech::on_mood_change(mood);` after line 103 (after `state::with_state_mut` sets the mood), before the closing brace of `update_mood()`.

The function should become:
```rust
pub async fn update_mood() {
    let (hearts_today, streak, feeds_today) = state::with_state(|s| {
        (s.hearts_today, s.streak_days, s.sparkle_feeds_today)
    });
    let fed_today = feeds_today > 0;
    let mood = calculate_mood(hearts_today, streak, fed_today);

    set_state("mood", mood).await;
    state::with_state_mut(|s| {
        s.sparkle_mood = mood.to_string();
    });

    crate::companion_speech::on_mood_change(mood);
}
```

**Step 2:** Run `trunk build --release` — verify `on_mood_change` and `MOOD_UP_PHRASES` warnings are gone (2 fewer warnings).

**Step 3:** Commit: `feat: wire mood speech bubbles into companion mood updates`

---

### Task 2: Wire `companion_skins::mood_to_expression()` into `companion::init()`

**Files:**
- Modify: `rust/companion.rs` — replace hardcoded mood→expression mapping with `mood_to_expression()` call

**Context:** `companion::init()` (line 9-16 of `companion.rs`) has a hardcoded `match` that converts mood strings to expression strings. `companion_skins::mood_to_expression()` (line 11-17 of `companion_skins.rs`) does the same mapping but is never called, producing 1 compiler warning.

Currently in `companion.rs` init (lines 10-14):
```rust
let mood_expr = match crate::state::with_state(|s| s.sparkle_mood.clone()).as_str() {
    "excited" => "celebrate",
    "happy" => "happy",
    _ => "happy",
};
```

**Step 1:** Replace the above with:
```rust
let mood_str = crate::state::with_state(|s| s.sparkle_mood.clone());
let mood_expr = crate::companion_skins::mood_to_expression(&mood_str);
```

Note: `mood_to_expression` maps `"excited"` → `"celebrate"`, `"happy"` → `"happy"`, `_` → `"encourage"`. The old code mapped `_` → `"happy"`. The `"encourage"` asset exists for all skins, so this is a harmless behavior improvement — sleepy companions show "encourage" expression instead of "happy".

**Step 2:** Run `trunk build --release` — verify `mood_to_expression` warning is gone (1 fewer warning).

**Step 3:** Commit: `feat: use mood_to_expression for companion init expression`

---

### Task 3: Wire `synth_audio::chomp()` into Feed Handler

**Files:**
- Modify: `rust/companion.rs` — add `chomp()` call in `on_care_feed()` before `munch()`

**Context:** `synth_audio::chomp()` (line 39 of `synth_audio.rs`) plays a quick bite sound (220Hz→180Hz, 0.1s). It's never called, producing 1 compiler warning. `synth_audio::munch()` (line 44) plays 3 repeated chomps (0.36s) and uses the same "chomp" preset. The feed handler at line 149 calls `munch()` but never `chomp()`.

Best wiring: Play `chomp()` as the immediate feedback sound when the food button is tapped, before the `munch()` plays in the async block. This gives instant audio feedback on tap.

**Step 1:** In `rust/companion.rs`, inside the `on_care_feed()` food selection click handler (around line 144, just before `dismiss_care_menu();` in the food button click handler), the flow is:
1. User taps food button
2. `dismiss_care_menu()` closes menu
3. Async block runs `record_feed`, then `munch()`

Add `synth_audio::chomp();` immediately after `dismiss_care_menu();` and before the `browser_apis::spawn_local_logged` block. This provides instant tap feedback.

The food button click handler section should become:
```rust
        if el.has_attribute("data-locked") { return; }
        dismiss_care_menu();
        synth_audio::chomp();
        // Check if first feed today before recording
        let feeds_before = state::with_state(|s| s.sparkle_feeds_today);
        browser_apis::spawn_local_logged("care-feed", async move {
```

**Step 2:** Run `trunk build --release` — verify `chomp` warning is gone (1 fewer warning). Should now have **0 warnings**.

**Step 3:** Commit: `feat: play chomp sound on food button tap`

---

## Actions
_No actions recorded._

## Validation
**Files:**
- Modify: `public/sw.js` — bump `CACHE_VERSION`

**Step 1:** Run `trunk build --release` — verify **0 errors, 0 warnings**.

**Step 2:** Bump `CACHE_NAME` in `public/sw.js` from `'kindheart-v11'` to `'kindheart-v12'` with comment `// Wave 8: zero warnings polish`.

**Step 3:** Commit: `chore: bump SW cache to v12 for Wave 8 zero warnings`

---

1. `trunk build --release` — **0 errors, 0 warnings**
2. Mood speech bubbles: Log 1+ kind act → mood becomes "happy" → Sparkle shows mood bubble ("I feel so happy! 💜", etc.)
3. Companion init expression: Fresh boot with "sleepy" mood → companion shows "encourage" expression asset
4. Feed chomp sound: Tap companion → Feed → Tap food → hear quick "chomp" snap immediately, then "munch" in async
5. All existing features unchanged

---

### Critical Files

| File | Changes |
|------|---------|
| `rust/companion_care.rs` | Add `on_mood_change(mood)` call in `update_mood()` |
| `rust/companion.rs` | Replace hardcoded mood match with `mood_to_expression()`, add `chomp()` in feed |
| `public/sw.js` | Bump CACHE_NAME v11 → v12 |

### Existing utilities to reuse

- `companion_speech::on_mood_change(mood)` — `rust/companion_speech.rs:65`
- `companion_skins::mood_to_expression(mood)` — `rust/companion_skins.rs:11`
- `synth_audio::chomp()` — `rust/synth_audio.rs:39`

## References
_No references recorded._


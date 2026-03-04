# Debug & Polish Implementation Plan

- Archive Path: `docs/archive/plans/2026-02-15-debug-and-polish-impl.md`
- Normalized On: `2026-03-04`
- Source Title: `Debug & Polish Implementation Plan`

## Summary
> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

## Context
> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix 1 critical CSS loading bug, 3 high-priority code issues, 4 medium UX polish items, and 4 low cosmetic improvements across ~15 files.

**Architecture:** Batch-ordered fixes: CSS loading first (unblocks all panel styling), then code fixes (contrast-color, game cleanup), then UX polish (sounds, skeletons, tokens, focus-visible), then cosmetic (z-index, bloom, SW, PIN).

**Tech Stack:** Rust/WASM (wasm-bindgen + web-sys), Trunk build, Safari 26.2 only, SQLite OPFS, CSS custom properties.

---

## Actions
_No actions recorded._

## Validation
**Step 1: Clean build**

Run: `trunk build --release 2>&1 | tail -10`
Expected: Build succeeds with no errors.

**Step 2: Verify all CSS files in dist**

Run: `ls dist/*.css | wc -l`
Expected: 16.

**Step 3: Verify no contrast-color() remaining**

Run: `grep -r "contrast-color" src/styles/`
Expected: No matches.

**Step 4: Verify no .forget() in game files**

Run: `grep -n "\.forget()" rust/game_catcher.rs rust/game_memory.rs rust/game_hug.rs`
Expected: No matches (all replaced with Reflect::set).

**Step 5: Commit all remaining changes (if any unstaged)**

```bash
git status
```

If clean, this task is done.

## References
**Files:**
- Modify: `index.html:64-66`

**Step 1: Add the 12 missing `<link data-trunk>` CSS tags**

Replace lines 64-66 in `index.html`:

```html
  <!-- DEFERRED CSS: Panel-specific (will be loaded by Service Worker on-demand) -->
  <!-- Removed broken Trunk data-trunk-attrs approach - relying on SW cache instead -->
  <!-- All panel CSS files are in DEFERRED_ASSETS and load on first panel navigation -->
```

With:

```html
  <!-- Panel-specific CSS: Trunk bundles all, browser loads on parse -->
  <link data-trunk rel="css" href="src/styles/tracker.css" />
  <link data-trunk rel="css" href="src/styles/quests.css" />
  <link data-trunk rel="css" href="src/styles/stories.css" />
  <link data-trunk rel="css" href="src/styles/rewards.css" />
  <link data-trunk rel="css" href="src/styles/games.css" />
  <link data-trunk rel="css" href="src/styles/mom.css" />
  <link data-trunk rel="css" href="src/styles/progress.css" />
  <link data-trunk rel="css" href="src/styles/gardens.css" />
  <link data-trunk rel="css" href="src/styles/particles.css" />
  <link data-trunk rel="css" href="src/styles/scroll-effects.css" />
  <link data-trunk rel="css" href="src/styles/particle-effects.css" />
  <link data-trunk rel="css" href="src/styles/demo-overhaul.css" />
```

**Step 2: Verify with `trunk build`**

Run: `trunk build 2>&1 | head -30`
Expected: Build succeeds, no CSS errors.

**Step 3: Verify all 16 CSS files now exist in dist/**

Run: `ls dist/*.css | wc -l`
Expected: 16 (was 4 before).

**Step 4: Commit**

```bash
git add index.html
git commit -m "fix: add 12 missing CSS panel links to index.html

Trunk only builds CSS files referenced via <link data-trunk>. The 12
panel-specific CSS files (tracker, quests, stories, rewards, games, mom,
progress, gardens, particles, scroll-effects, particle-effects, demo-overhaul)
were listed in sw-assets.js DEFERRED_ASSETS but never linked in index.html,
so they were never built into dist/ and all panel styling was missing."
```

---

### Task 2: Clean Up sw-assets.js CSS Entries

**Files:**
- Modify: `public/sw-assets.js:97-109`

**Step 1: Remove CSS entries from DEFERRED_ASSETS**

Now that Trunk bundles all CSS into the build, the SW no longer needs to cache bare CSS paths. Replace lines 97-109 in `public/sw-assets.js`:

```javascript
  // Panel CSS (not needed until panel opens):
  '/tracker.css',
  '/quests.css',
  '/stories.css',
  '/rewards.css',
  '/games.css',
  '/mom.css',
  '/progress.css',
  '/particles.css',
  '/gardens.css',
  '/scroll-effects.css',
  '/particle-effects.css',
```

With:

```javascript
  // Panel CSS: Now bundled by Trunk via <link data-trunk> in index.html.
  // Trunk hashes filenames, so they're covered by the Trunk output cache.
```

**Step 2: Verify sw-assets.js is valid JS**

Run: `node -e "require('./public/sw-assets.js')" 2>&1 || echo "Note: importScripts won't work in Node, checking syntax only" && node --check public/sw-assets.js 2>&1`
Expected: No syntax errors (importScripts error is expected since it's a SW-only API).

**Step 3: Commit**

```bash
git add public/sw-assets.js
git commit -m "chore: remove bare CSS paths from SW deferred assets

CSS files are now Trunk-bundled with hashed filenames. The bare paths
('/tracker.css', etc.) would never match the actual dist/ output."
```

---

### Task 3: Replace contrast-color() with Explicit Colors

**Files:**
- Modify: `src/styles/tracker.css:82,99,116,133,150,167`

**Step 1: Replace all 6 `contrast-color()` calls**

In `src/styles/tracker.css`, replace each `contrast-color()` with the correct explicit color:

- Line 82 (`--hug`, pink bg): `color: contrast-color(var(--color-pink));` → `color: var(--color-white);`
- Line 99 (`--nice-words`, blue bg): `color: contrast-color(var(--color-blue));` → `color: var(--color-white);`
- Line 116 (`--sharing`, green bg): `color: contrast-color(var(--color-green));` → `color: var(--color-white);`
- Line 133 (`--helping`, yellow bg): `color: contrast-color(var(--color-yellow));` → `color: var(--color-text);`
- Line 150 (`--love`, purple bg): `color: contrast-color(var(--color-purple));` → `color: var(--color-white);`
- Line 167 (`--unicorn`, orange bg): `color: contrast-color(var(--color-orange));` → `color: var(--color-white);`

Rationale: Yellow is the only light background — needs dark text. All others (pink, blue, green, purple, orange) are dark enough for white text.

**Step 2: Verify no remaining contrast-color() usage**

Run: `grep -r "contrast-color" src/styles/`
Expected: No matches.

**Step 3: Commit**

```bash
git add src/styles/tracker.css
git commit -m "fix: replace contrast-color() with explicit text colors

contrast-color() is a CSS draft spec not supported in Safari 26.2.
Use white text on dark backgrounds (pink, blue, green, purple, orange)
and dark text on yellow background."
```

---

### Task 4: Fix Game Timer Closure Leaks — Catcher

**Files:**
- Modify: `rust/game_catcher.rs`

**Step 1: Store spawn interval closure on arena element**

Find the `.forget()` call near line 476 in `game_catcher.rs` (spawn interval closure). Replace the `.forget()` pattern with storing on the arena element:

Before (approximate):
```rust
closure.forget();
```

After:
```rust
// Store closure on arena element — GC'd when arena innerHTML cleared
let key = wasm_bindgen::JsValue::from_str("__catcher_spawn_closure");
let _ = js_sys::Reflect::set(&arena, &key, closure.as_ref().unchecked_ref());
```

Repeat for the second `.forget()` near line 634 (gravity loop closure):
```rust
let key = wasm_bindgen::JsValue::from_str("__catcher_gravity_closure");
let _ = js_sys::Reflect::set(&arena, &key, closure.as_ref().unchecked_ref());
```

**Note:** The `arena` variable must be in scope. It's the game arena element obtained from `dom::query("#game-arena")`. If it's not directly available at the `.forget()` call site, capture it in the surrounding scope.

**Step 2: Verify build compiles**

Run: `trunk build 2>&1 | tail -5`
Expected: Build succeeds.

**Step 3: Commit**

```bash
git add rust/game_catcher.rs
git commit -m "fix: store catcher game closures on arena element

Replace .forget() with Reflect::set on game arena. When arena innerHTML
is cleared on game exit, closures become eligible for GC."
```

---

### Task 5: Fix Game Timer Closure Leaks — Memory

**Files:**
- Modify: `rust/game_memory.rs`

**Step 1: Store timer closures on arena element**

Find the two `.forget()` calls (near lines 593 and 681). Replace each with the same pattern as Task 4:

```rust
// Near line 593 (game timer interval)
let key = wasm_bindgen::JsValue::from_str("__memory_timer_closure");
let _ = js_sys::Reflect::set(&arena, &key, closure.as_ref().unchecked_ref());

// Near line 681 (timeout)
let key = wasm_bindgen::JsValue::from_str("__memory_timeout_closure");
let _ = js_sys::Reflect::set(&arena, &key, closure.as_ref().unchecked_ref());
```

**Step 2: Verify build compiles**

Run: `trunk build 2>&1 | tail -5`
Expected: Build succeeds.

**Step 3: Commit**

```bash
git add rust/game_memory.rs
git commit -m "fix: store memory game closures on arena element

Same pattern as catcher — replace .forget() with Reflect::set on arena."
```

---

### Task 6: Fix Game Timer Closure Leaks — Hug

**Files:**
- Modify: `rust/game_hug.rs`

**Step 1: Store timer closures on arena element**

Find the three `.forget()` calls (near lines 1004, 1102, 1114). Replace each:

```rust
// Near line 1004 (hold interval)
let key = wasm_bindgen::JsValue::from_str("__hug_hold_closure");
let _ = js_sys::Reflect::set(&arena, &key, closure.as_ref().unchecked_ref());

// Near line 1102 (celebration timeout 1)
let key = wasm_bindgen::JsValue::from_str("__hug_celebrate1_closure");
let _ = js_sys::Reflect::set(&arena, &key, closure.as_ref().unchecked_ref());

// Near line 1114 (celebration timeout 2)
let key = wasm_bindgen::JsValue::from_str("__hug_celebrate2_closure");
let _ = js_sys::Reflect::set(&arena, &key, closure.as_ref().unchecked_ref());
```

**Step 2: Verify build compiles**

Run: `trunk build 2>&1 | tail -5`
Expected: Build succeeds.

**Step 3: Commit**

```bash
git add rust/game_hug.rs
git commit -m "fix: store hug game closures on arena element

Three .forget() calls replaced with Reflect::set on arena for GC."
```

---

### Task 7: Add Sound Effects — Emotion Check-in

**Files:**
- Modify: `rust/reflection.rs:76` (show_reflection_prompt)
- Modify: `rust/reflection.rs:329` (handle_emotion_selection)

**Step 1: Add gentle sound when reflection prompt appears**

In `show_reflection_prompt()` (line 76), add before the `render_reflection_prompt` call:

```rust
    synth_audio::gentle();
```

**Step 2: Verify `synth_audio::tap()` already exists in handle_emotion_selection**

Read `reflection.rs:329` — line 329 already has `synth_audio::tap();`. This is correct.

**Step 3: Verify build compiles**

Run: `trunk build 2>&1 | tail -5`
Expected: Build succeeds.

**Step 4: Commit**

```bash
git add rust/reflection.rs
git commit -m "feat: add gentle sound on reflection prompt appearance"
```

---

### Task 8: Add Sound Effect — Quest Completion Sparkle

**Files:**
- Modify: `rust/quests.rs:318`

**Step 1: Verify sound already exists**

Read `quests.rs:318` — line 318 already has `synth_audio::chime();` on quest completion. This covers the quest completion sound.

**Step 2: Add sparkle sound for all-quests-done celebration**

In the `if completed >= 3` block (around line 353), add before the toast:

```rust
            synth_audio::sparkle();
```

**Step 3: Verify build compiles**

Run: `trunk build 2>&1 | tail -5`
Expected: Build succeeds.

**Step 4: Commit**

```bash
git add rust/quests.rs
git commit -m "feat: add sparkle sound on all-quests-done celebration"
```

---

### Task 9: Add Shimmer Animation to Loading Skeletons

**Files:**
- Modify: `src/styles/quests.css:60`
- Modify: `src/styles/rewards.css:76`

**Step 1: Add shimmer to quest skeleton cards**

In `src/styles/quests.css`, update `.skeleton-quest-card` (line 57-61):

```css
.skeleton-quest-card {
  height: 120px;
  border-radius: var(--radius-lg);
  background: linear-gradient(90deg, var(--color-surface-alt) 25%, var(--color-surface-raised) 50%, var(--color-surface-alt) 75%);
  background-size: 200% 100%;
  animation: shimmer-loading 1.5s ease infinite;
}
```

**Step 2: Add shimmer to reward skeleton cells**

In `src/styles/rewards.css`, update `.skeleton-cell` (line 71-76):

```css
.skeleton-cell {
  width: 80px;
  height: 80px;
  border-radius: var(--radius-lg);
  background: linear-gradient(90deg, var(--color-surface-alt) 25%, var(--color-surface-raised) 50%, var(--color-surface-alt) 75%);
  background-size: 200% 100%;
  animation: shimmer-loading 1.5s ease infinite;
}
```

**Step 3: Verify `shimmer-loading` keyframe exists**

Confirm `animations.css:82-85` has the keyframe (already verified — it does).

**Step 4: Commit**

```bash
git add src/styles/quests.css src/styles/rewards.css
git commit -m "feat: add shimmer animation to loading skeleton cells

Uses existing shimmer-loading keyframe from animations.css."
```

---

### Task 10: Replace Hardcoded Sizes with Design Tokens

**Files:**
- Modify: `src/styles/tracker.css:391`
- Modify: `src/styles/rewards.css:72-73,276`
- Modify: `src/styles/stories.css:364`

**Step 1: Fix tracker emotion button min-height**

In `tracker.css` line 391, change:
```css
min-height: 80px;
```
To:
```css
min-height: var(--touch-large);
```
(`--touch-large: 88px` is closest to 80px and more appropriate for emotion buttons.)

**Step 2: Fix rewards skeleton cell size**

In `rewards.css` lines 72-73, change:
```css
  width: 80px;
  height: 80px;
```
To:
```css
  width: var(--touch-large);
  height: var(--touch-large);
```

**Step 3: Fix milestone badge min-width**

In `rewards.css` line 276, change:
```css
  min-width: 90px;
```
To:
```css
  min-width: var(--touch-large);
```

**Step 4: Fix stories emoji size**

In `stories.css` line 364, change:
```css
  font-size: 4rem;
```
To:
```css
  font-size: var(--font-size-4xl);
```
(`--font-size-4xl: 3.5rem` — close match, slightly smaller but consistent with token scale.)

**Step 5: Commit**

```bash
git add src/styles/tracker.css src/styles/rewards.css src/styles/stories.css
git commit -m "refactor: replace hardcoded sizes with design tokens

Use --touch-large for button/cell dimensions, --font-size-4xl for
emoji display sizes."
```

---

### Task 11: Add :focus-visible States to Emotion Buttons

**Files:**
- Modify: `src/styles/tracker.css`

**Step 1: Add focus-visible styling to kind-btn**

Add after the `.kind-btn:active` block (around line 76) in `tracker.css`:

```css
  &:focus-visible {
    outline: 3px solid var(--color-purple);
    outline-offset: 3px;
    box-shadow:
      var(--shadow-md),
      0 0 0 6px rgba(181, 126, 255, 0.2);
  }
```

**Step 2: Add focus-visible to quest cards**

In `quests.css`, add after the `.quest-card:active` block:

```css
  &:focus-visible {
    outline: 3px solid var(--color-yellow);
    outline-offset: 3px;
    box-shadow:
      0 2px 4px rgba(45, 27, 48, 0.05),
      0 6px 16px rgba(45, 27, 48, 0.1),
      0 0 0 6px rgba(255, 211, 45, 0.2);
  }
```

**Step 3: Commit**

```bash
git add src/styles/tracker.css src/styles/quests.css
git commit -m "a11y: add :focus-visible states for keyboard navigation

Kind act buttons get purple focus ring, quest cards get yellow."
```

---

### Task 12: Add Z-index Scale to Design Tokens

**Files:**
- Modify: `src/styles/tokens.css:119-123`

**Step 1: Expand the existing z-index tokens**

Replace lines 119-123 in `tokens.css`:

```css
  /* Z-index layers */
  --z-panel: 10;
  --z-toast: 100;
  --z-loading: 1000;
```

With:

```css
  /* Z-index layers — ordered scale for stacking context */
  --z-base: 1;
  --z-panel: 10;
  --z-game: 50;
  --z-modal: 100;
  --z-toast: 200;
  --z-confetti: 500;
  --z-overlay: 1000;
  --z-loading: 3000;
```

**Step 2: Update hardcoded z-index values in CSS files**

- `src/styles/tracker.css:349`: `z-index: 1000;` → `z-index: var(--z-overlay);`
- `src/styles/rewards.css:331`: `z-index: 2000;` → `z-index: var(--z-overlay);`
- `src/styles/app.css:89`: `z-index: 9999;` → `z-index: var(--z-loading);`

**Step 3: Commit**

```bash
git add src/styles/tokens.css src/styles/tracker.css src/styles/rewards.css src/styles/app.css
git commit -m "refactor: add z-index scale to design tokens

Replace magic z-index numbers with semantic --z-* custom properties."
```

---

### Task 13: Optimize Bloom Animation Performance

**Files:**
- Modify: `src/styles/animations.css:121`

**Step 1: Replace blur filter with opacity fade**

In `animations.css` line 121, change:

```css
    filter: blur(4px);
```

To:

```css
    filter: opacity(0);
```

This avoids the GPU-intensive blur at the start of the bloom animation while still providing a fade-in effect. The `opacity: 0` on line 120 already handles the fade, but `filter: opacity(0)` keeps the filter property in the animation pipeline for smooth transitions to the later keyframes that may use filter.

Alternatively, simply remove the `filter` line entirely since `opacity: 0` already handles the visual:

```css
    /* filter removed — opacity:0 handles fade, avoids GPU blur cost */
```

**Step 2: Commit**

```bash
git add src/styles/animations.css
git commit -m "perf: remove blur from bloom animation start keyframe

filter: blur(4px) at 0% caused GPU cost on A15. opacity:0 already
handles the fade-in effect."
```

---

### Task 14: Fix SW Image Fallback

**Files:**
- Modify: `public/sw.js:153-154`

**Step 1: Replace fetch(dataURI) with direct Response**

In `public/sw.js`, replace lines 153-154:

```javascript
        const transparentWebP = 'data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA=';
        return fetch(transparentWebP);
```

With:

```javascript
        const bytes = Uint8Array.from(atob('UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA='), c => c.charCodeAt(0));
        return new Response(bytes, { headers: { 'Content-Type': 'image/webp' } });
```

This avoids a `fetch()` call for a data URI (which may fail or be slow in some offline scenarios) and directly constructs the Response.

**Step 2: Commit**

```bash
git add public/sw.js
git commit -m "fix: use direct Response for offline image fallback

Replace fetch(dataURI) with new Response(bytes) for reliability."
```

---

### Task 15: Document PIN Storage as Intentional v1

**Files:**
- Modify: `rust/progress.rs:287` (approximate)

**Step 1: Find and document the PIN TODO**

Search for the PIN check in `progress.rs`:

```bash
grep -n "PIN\|pin\|password" rust/progress.rs
```

Add a comment documenting the intentional v1 decision:

```rust
// v1: PIN stored in SQLite (not encrypted). Acceptable for child-facing
// app on a single shared iPad — no secrets to protect, just mild gating.
// Future: Use Web Crypto SubtleCrypto.digest() for hashed PIN storage.
```

**Step 2: Commit**

```bash
git add rust/progress.rs
git commit -m "docs: document PIN storage as intentional v1 tradeoff"
```

---

### Task 16: Game Stats Placeholder Text

**Files:**
- Modify: `rust/games.rs`

**Step 1: Find the empty string placeholder for game stats**

Search for empty string stats:

```bash
grep -n '""' rust/games.rs | head -10
```

Replace empty strings `""` used as stat placeholders with `"..."`:

```rust
// Before:
set_text_content(Some(""))
// After:
set_text_content(Some("..."))
```

**Step 2: Commit**

```bash
git add rust/games.rs
git commit -m "ux: show '...' placeholder while game stats load"
```

---


# Production Polish Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all confirmed production gaps so Blaire can install and use the PWA on her iPad mini 6 immediately.

**Architecture:** Two targeted code fixes (sw.js + gardens.rs), one image-path verification sweep across remaining game files, then full QA suite + release build verification. No new features — purely hardening existing code.

**Tech Stack:** Rust/WASM + Trunk, `public/sw.js` (vanilla JS), `npm run qa:*`, `cargo clippy`, `trunk build --release`

---

## Confirmed Bugs

1. **`public/sw.js`** — Missing `importScripts("./runtime-diagnostics.js")` and `scope: "sw"`. Causes `npm run qa:runtime` to fail.
2. **`rust/gardens.rs:9`** — Fallback path `"assets/gardens/default_stage_1.webp"` doesn't exist in dist. Path prefix `assets/` is wrong (Trunk copies to `dist/gardens/...`). Valid fallback is `"gardens/bunny_stage_1.webp"`.

## Known-Good Image Paths (verified against disk)

- Companion skins: 18 WebP in `assets/companions/`, manifest-keyed → `companion.rs` ✅
- Garden stages: 60 WebP in `assets/gardens/`, manifest-keyed → `gardens.rs` ✅ (except fallback bug)
- Tracker buttons: `illustrations/buttons/btn-act-{hug,sharing,helping,love}.webp` → all 4 exist ✅
- Game cards: `illustrations/buttons/btn-game-{catcher,hug,memory,paint,unicorn}.webp` → all 5 exist ✅
- `game_unicorn.rs`: `game-sprites/forest_background.webp` → exists ✅
- `game_unicorn_sparkles.rs`: `game-sprites/sparkle_effect.webp` → exists ✅
- Unverified: `game_memory.rs`, `game_catcher.rs`, `game_paint.rs` image refs → Task 3

---

### Task 1: Fix sw.js runtime-diagnostics wiring

**Files:**
- Modify: `public/sw.js` (add 2 lines after the existing `importScripts('./sw-assets.js');`, bump CACHE_NAME)

**Step 1: Read current sw.js to see exact insertion point**

Run: Read `public/sw.js` lines 10-14 to confirm `importScripts('./sw-assets.js');` is at line 13.

**Step 2: Add runtime-diagnostics wiring**

After the existing `importScripts('./sw-assets.js');` line, add:

```js
importScripts("./runtime-diagnostics.js");
self.__BKH_RUNTIME_DIAGNOSTICS__?.install({ scope: "sw" });
```

CRITICAL: Use double-quotes `"` — the contract regex `/importScripts\("\.\/runtime-diagnostics\.js"\);/` requires double quotes. Single quotes will fail the check.

**Step 3: Bump CACHE_NAME**

Change:
```js
const CACHE_NAME = 'kindheart-v73';
```
To:
```js
const CACHE_NAME = 'kindheart-v74'; // runtime-diagnostics wired in SW
```

Bumping ensures iPad gets the updated SW on next visit — old SW (v73) will be replaced.

**Step 4: Run qa:runtime to verify**

Run: `npm run qa:runtime`
Expected: `[qa-runtime] PASS runtime diagnostics contract checks`

If it fails, read the exact failure message — it will name the missing regex pattern.

**Step 5: Commit**

```bash
git add public/sw.js
git commit -m "fix: wire runtime-diagnostics into service worker, bump to v74"
```

---

### Task 2: Fix garden image fallback path

**Files:**
- Modify: `rust/gardens.rs` (line 9, inside `render_garden_card`)

**Step 1: Confirm the broken line**

In `rust/gardens.rs` line 9, `render_garden_card` function, find:

```rust
let asset_path = garden.get_stage_asset(stage_num as u32).unwrap_or("assets/gardens/default_stage_1.webp");
```

**Step 2: Fix to a valid path**

`"assets/gardens/default_stage_1.webp"` is wrong for two reasons:
1. `assets/` prefix doesn't exist in dist — Trunk copies `assets/gardens/` → `dist/gardens/`
2. No `default_stage_1.webp` exists on disk — the 60 garden images are named by garden key (e.g. `bunny_stage_1.webp`)

Change to:
```rust
let asset_path = garden.get_stage_asset(stage_num as u32).unwrap_or("gardens/bunny_stage_1.webp");
```

`bunny_stage_1.webp` is the first garden's first stage — it always exists. The `onerror` closure on the `<img>` already handles failures with an emoji fallback, so this fallback path is only a last resort before the DOM error handler fires.

**Step 3: Run cargo clippy**

Run: `cargo clippy 2>&1 | tail -10`
Expected: 0 errors, ≤ 3 warnings (the 3 allowed dead-code items from FUTURE.md scaffolding)

**Step 4: Commit**

```bash
git add rust/gardens.rs
git commit -m "fix: correct garden image fallback path (assets/gardens/ -> gardens/)"
```

---

### Task 3: Verify remaining game image paths

**Files to read:**
- `rust/game_memory.rs`
- `rust/game_catcher.rs`
- `rust/game_paint.rs`

**Step 1: Search for image references**

Run these greps:
```bash
grep -n "set_src\|create_img\|webp\|\.png" rust/game_memory.rs rust/game_catcher.rs rust/game_paint.rs
```

**Step 2: For each path found, verify it exists**

Known files in `assets/game-sprites/`:
- `forest_background.webp`
- `sparkle_effect.webp`
- `bunny_sprite.webp`
- `fox_sprite.webp`
- `hedgehog_sprite.webp`
- `owl_sprite.webp`
- `unicorn_sprite.webp`
- `deer_sprite.webp`

Known files in `assets/illustrations/buttons/`:
- `btn-game-catcher.webp`, `btn-game-hug.webp`, `btn-game-memory.webp`, `btn-game-paint.webp`, `btn-game-unicorn.webp`

If a referenced path does NOT appear in the above lists and does NOT appear in `asset-manifest.json`, it's a bug.

**Step 3: Fix any broken paths found**

For game-sprite paths: correct prefix should be `game-sprites/` (no `assets/` prefix).
For illustration paths: correct prefix should be `illustrations/buttons/` (no `assets/` prefix).

**Step 4: Commit only if changes were needed**

```bash
git add rust/game_*.rs
git commit -m "fix: correct game image src paths"
```

If no paths were broken, skip the commit and note "Task 3: no issues found."

---

### Task 4: Full QA suite

Run every QA script in sequence and verify all pass.

**Step 1: Runtime contract**
```bash
npm run qa:runtime
```
Expected: `PASS`

**Step 2: PWA contract**
```bash
npm run qa:pwa-contract
```
Expected: `PASS (ok: true)`

**Step 3: DB contract**
```bash
npm run qa:db-contract
```
Expected: `PASS (2 passed)`

**Step 4: E2E tests (Chromium)**
```bash
npm run test:e2e
```
Expected: `39 passed, 1 skipped`

**Step 5: Rust warning drift**
```bash
npm run qa:rust-warning-drift
```
Expected: `PASS (warning_count=3, baseline=3)` or `warning_count=0` if gardens.rs fix resolved a warning

**Step 6: Docs budget**
```bash
npm run qa:docs-budget
```
Expected: `PASS (budget=25000)`

**Step 7: Docs links**
```bash
npm run qa:docs-links
```
Expected: `PASS`

**Step 8: Fix any failures before continuing**

If any step fails, do NOT move to Task 5. Read the error, find the root cause (systematic-debugging skill), fix it, re-run the failing check. All QA must be green before proceeding.

---

### Task 5: Production release build + dist verification

**Step 1: Build**
```bash
trunk build --release
```
Expected: `Finished release profile [optimized] target(s)` with 0 errors.

**Step 2: Verify asset directories in dist**
```bash
ls dist/companions/ | wc -l       # Expect: 18
ls dist/gardens/ | wc -l          # Expect: 60
ls dist/game-sprites/ | wc -l     # Expect: 8
ls dist/illustrations/buttons/ | wc -l  # Expect: 18
```

**Step 3: Verify sw.js in dist has runtime-diagnostics**
```bash
grep -c "runtime-diagnostics" dist/sw.js
```
Expected: 2 (one for importScripts, one for the install call)

**Step 4: Verify asset-manifest in dist has 78 entries**
```bash
node -e "const m = require('./dist/asset-manifest.json'); console.log('Total entries:', Object.keys(m).length)"
```
Expected: 78

**Step 5: Commit updated public/ manifests if Trunk regenerated them**

Check if `public/asset-manifest.json` or `public/asset-manifest.js` changed:
```bash
git diff --name-only public/asset-manifest.json public/asset-manifest.js
```
If changed:
```bash
git add public/asset-manifest.json public/asset-manifest.js
git commit -m "build: update asset manifests"
```

---

### Task 6: Update STATUS_LEDGER with verification results

**Files:**
- Modify: `docs/STATUS_LEDGER.md`

**Step 1: Read current STATUS_LEDGER.md**

Read `docs/STATUS_LEDGER.md` to see current format.

**Step 2: Add new entry**

Add entry for 2026-02-20 with:
- `qa:runtime`: PASS (fixed)
- `qa:pwa-contract`: PASS
- `qa:db-contract`: PASS
- `test:e2e`: PASS (39 passed, 1 skipped)
- `trunk build --release`: PASS
- 78 assets verified in dist
- gardens.rs fallback path fixed
- sw.js runtime-diagnostics wired

**Step 3: Commit**

```bash
git add docs/STATUS_LEDGER.md
git commit -m "docs: record 2026-02-20 production polish verification"
```

---

## iPad Install Steps (reference — no code needed)

After completing all tasks above, serve the built app for iPad install:

1. `trunk serve --address 0.0.0.0`
2. On iPad Safari: navigate to `http://<your-mac-ip>:8080`
3. Tap Share icon → "Add to Home Screen"
4. Name it "Blaire's Kind Heart" → Add
5. Open from home screen → verify it loads without Safari UI

The app runs fully offline after the first load (all 78 assets + WASM precached by service worker).

---

## Success Criteria

All of the following must be true before declaring production-ready:

- [ ] `npm run qa:runtime` → PASS
- [ ] `npm run qa:pwa-contract` → PASS
- [ ] `npm run qa:db-contract` → PASS
- [ ] `npm run test:e2e` → 39 passed
- [ ] `cargo clippy` → 0 errors, ≤ 3 warnings
- [ ] `trunk build --release` → 0 errors
- [ ] 78 assets present in `dist/`
- [ ] `dist/sw.js` contains runtime-diagnostics wiring
- [ ] No broken image paths in any Rust source file

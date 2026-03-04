# Production Polish Design

- Archive Path: `docs/archive/plans/2026-02-20-production-polish-design.md`
- Normalized On: `2026-03-04`
- Source Title: `Production Polish Design`

## Summary
**Date:** 2026-02-20

## Context
**Date:** 2026-02-20
**Goal:** Get app production-ready for immediate iPad mini 6 PWA install
**Approach:** Full parallel audit + fix across 4 independent domains

---

- Target: Blaire (age 4), iPad mini 6 (A15), iPadOS 26.2, Safari 26.2
- Deployment: PWA installed to home screen from local network
- Current state: 39/40 E2E pass, zero clippy warnings, simulator regression complete
- Known issues: `qa:runtime` failing, garden image fallback path bug

---

### Audit Domains

### Agent 1 — Image Wiring Audit

**Scope:** Every image render path in every Rust module

- Verify `get_companion_asset(skin, expression)` called with correct keys for all 6 skins × 3 expressions (`happy`, `celebrate`, `encourage`)
- Verify `get_garden_asset(garden_key, stage)` called with correct keys for all 12 gardens × stages 1–5
- Check game sprites referenced in `game_paint.rs`, `game_unicorn*.rs`, `game_catcher.rs`, `game_memory.rs`, `game_hug.rs`
- Check illustrations referenced in `index.html` and `render.rs` (loading splash, etc.)
- Fix garden fallback path (`"assets/gardens/default_stage_1.webp"` → emoji fallback or valid path)
- Identify any image referenced in code but missing from manifest or disk
- Verify `asset-manifest.json` keys match exactly what code passes to lookup functions

**Success:** Zero broken image paths; all fallbacks are valid

---

### Agent 2 — Service Worker & QA Health

**Scope:** Runtime-diagnostics wiring + all QA scripts

- Wire `runtime-diagnostics.js` into `public/sw.js` per contract:
  - Add `importScripts("./runtime-diagnostics.js");`
  - Add `scope: "sw"` integration
- Wire into `public/db-worker.js` per contract:
  - Add `import "./runtime-diagnostics.js";`
  - Add `scope: "db-worker"` integration
- Wire into `wasm-init.js` per contract:
  - Add `import './runtime-diagnostics.js';`
  - Add `__BKH_RUNTIME_DIAGNOSTICS__?.install({ scope: 'wasm-init', captureInp: true, captureLoaf: true })`
- Add `"runtime-diagnostics.js"` to `sw-assets.js` precache list
- Bump `CACHE_NAME` in `sw.js` after changes
- Verify all QA scripts pass: `qa:pwa-contract`, `qa:runtime`, `qa:db-contract`, `qa:docs-budget`, `qa:rust-warning-drift`

**Success:** All `npm run qa:*` scripts pass

---

### Agent 3 — CSS/UX Polish

**Scope:** All 14 CSS files + HTML structure, kid-friendly audit

- Touch targets: all interactive elements ≥ 48px (minimum for a 4-year-old)
- Font sizes: body text ≥ 18px, headers ≥ 24px, emoji ≥ 32px on main actions
- Animations: check for `prefers-reduced-motion` respect; verify GPU-accelerated (`transform`, `opacity` only)
- Color contrast: ensure all text passes AA on bright backgrounds
- Loading states: every async panel has a loading indicator or graceful empty state
- Empty states: gardens (no unlocked), quests (none today), stories, rewards (no stickers yet)
- Check every panel for rough edges, misaligned elements, overflow issues
- Verify iPad safe area insets applied (`env(safe-area-inset-*)`)

**Success:** No touch targets under 48px; all panels have graceful empty states

---

### Agent 4 — Rust Module Completeness

**Scope:** Every `.rs` module, flag anything Blaire could hit that's broken or unfinished

- Scan for `todo!()`, `unimplemented!()`, `panic!()` calls in non-debug paths
- Check every `init()` function is called from `lib.rs` boot sequence
- Verify all navigation panel transitions wire up correctly (home → tracker → quests → stories → rewards → games → gardens)
- Check `onboarding.rs` — does first-run flow work?
- Check `sparkle_mail.rs` — what does it do, is it complete?
- Check `reflection.rs`, `parent_insights.rs`, `skill_progression.rs`, `adaptive_quests.rs` — are any wired to UI? Are unfinished ones safely dormant?
- Check `errors.rs` — is error schema init'd and silent on first run?
- Verify `mom_mode.rs` — parent dashboard accessible and functional
- Flag any module that has no `init()` call but should

**Success:** No `todo!()`/`unimplemented!()` in user-facing paths; all panels boot without panics

---

### Integration & Build

After all agents return and fixes are applied:

1. `cargo clippy` — must be zero warnings
2. `npm run qa:pwa-contract`
3. `npm run qa:runtime`
4. `npm run qa:db-contract`
5. `npm run qa:rust-warning-drift`
6. `trunk build --release`
7. Verify `dist/` contains all 78 WebP images (`companions/` × 18, `gardens/` × 60)
8. `npm run test:e2e` — must be 39+ passing

---

### iPad Install Steps (post-build)

1. `trunk serve --address 0.0.0.0 --release` (or serve `dist/` with `python3 -m http.server`)
2. On iPad: open Safari → navigate to `http://<mac-ip>:8080`
3. Tap Share → Add to Home Screen → name "Blaire's Kind Heart" → Add
4. Launch from home screen, verify offline after airplane mode

---

### Success Criteria

- All `npm run qa:*` pass
- Zero clippy warnings
- `trunk build --release` succeeds clean
- All 78 WebP images in `dist/`
- All E2E tests pass (≥ 39)
- App installs and runs offline on iPad mini 6

## Actions
_No actions recorded._

## Validation
_Validation details not recorded._

## References
_No references recorded._


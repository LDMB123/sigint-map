# Status Ledger

Last updated: 2026-03-03 (session 18)

## QA Gate Results

| Gate | Command | Status | Date |
|------|---------|--------|------|
| Runtime diagnostics | `npm run qa:runtime` | PASS | 2026-03-03 |
| PWA contract | `npm run qa:pwa-contract` | PASS | 2026-03-03 |
| DB contract | `npm run qa:db-contract` | PASS | 2026-03-03 |
| Rust wasm32 compile gate | `cargo check --target wasm32-unknown-unknown` | PASS | 2026-03-03 |
| WASM tests (wasm-bindgen runner) | `cargo test --target wasm32-unknown-unknown` | PASS | 2026-03-03 |
| Symbolized release verification | `npm run build:verify:release` | PASS | 2026-03-03 |
| WebKit smoke | `npm run test:e2e:webkit` | PASS | 2026-03-03 |
| Full E2E suite (64/1 skip) | `npm run test:e2e:all` | PASS* | 2026-03-03 |
| Visual regression (16 snapshots) | `npm run test:e2e -- e2e/visual.spec.ts` | PASS | 2026-03-03 |
| Rust warning drift (baseline=5) | `npm run qa:rust-warning-drift` | PASS | 2026-03-02 |
| Docs budget | `npm run qa:docs-budget` | PASS | 2026-03-03 |
| Docs links | `npm run qa:docs-links` | PASS | 2026-03-03 |
| Lighthouse CI | `npm run lighthouse:ci` | PASS | 2026-02-21 |

\* `1 skipped` is the expected non-blocking probe skip in the full Playwright matrix.

## E2E Summary

- 64 passed, 1 skipped (+18 new tests vs session 5)
- Critical flows: tracker, quests, stories all PASS
- A11y: axe critical checks PASS across core panels
- Visual gate: desktop + mobile snapshots PASS (panel-quests baseline refreshed)
- DB contract runtime flows PASS (including mom export/restore)
- WebKit smoke PASS
- New: heart economy (TG-1–5), games, companion, DB atomicity, security, mom mode (TG-6–19)

## Build Status

- `npm run build:release` PASS on 2026-02-21
- Release WASM build completed cleanly
- Source maps retained in `dist` per `scripts/build-verify-release.sh`

## Work Completed 2026-03-03 (session 18)

Workspace markdown cleanup and organization pass.

**Documentation structure updates**:
- Added workspace docs hub: `docs/WORKSPACE_DOCS_MAP.md`
- Added archive hub: `docs/archive/INDEX.md`
- Added archive folder indexes:
  - `docs/archive/audits/INDEX.md`
  - `docs/archive/plans/INDEX.md`
  - `docs/archive/phase-docs/INDEX.md`
  - `docs/archive/reference-full/INDEX.md`
  - `docs/archive/reports/INDEX.md`
  - `docs/archive/root-docs/INDEX.md`
  - `docs/archive/sessions/INDEX.md`
  - `docs/archive/snapshots/INDEX.md`
  - `docs/archive/testing/INDEX.md`
- Added deployment docs entrypoints:
  - `docs/deployment/README.md`
  - `deploy/README.md`

**Consistency cleanup**:
- Updated active doc cross-links and entry points in:
  - `README.md`
  - `docs/INDEX.md`
  - `docs/HANDOFF.md`
  - `docs/reports/README.md`
  - `docs/testing/README.md`
  - `docs/ICONS.md`
- Refreshed deployment/assets README metadata and navigation links.

**Validation**:
- `npm run qa:docs-links` PASS
- `npm run qa:docs-budget` PASS (`active_est_tokens=10923`)
- repo-wide markdown link audit: PASS (`BROKEN_LINKS=0`)
- directory entrypoint audit: PASS (`MISSING_ENTRYPOINT_COUNT=0`)

## Work Completed 2026-03-03 (session 17)

Final deep Apple-Silicon browser optimization pass focused on iPad mini 6 Safari/WebKit balance (GPU cost, loop timers, and hidden-tab behavior).

**GPU particle and shader tuning (6 fixes)**:
- `shaders/particles_render.wgsl`: expanded `Uniforms` (`sparkle_strength`, `rotation_enabled` + padding), rotation trig bypass when disabled, and sparkle pulse bypass when disabled
- `shaders/particles_compute.wgsl`: mirrored uniform layout to keep compute/render bind compatibility
- `rust/gpu_particles.rs`: increased uniform payload, writes low-power controls each frame, iPad profile defaults set to `sparkle_strength=0.0` and `rotation_enabled=0.0`
- `rust/gpu_particles.rs`: moved bind-group creation out of per-frame path, reused bind groups, and switched particle upload path to borrowed `Uint8Array::view` writeBuffer strategy
- `rust/gpu.rs`: added iPad mini 6 profile detection and profile-specific GPU canvas resolution scaling (`0.75`) with body `data-device-profile` attrs
- `rust/confetti.rs`: GPU burst routing for named emoji sets and reduced aura particle count on iPad profile

**Timer and power guard updates (4 fixes)**:
- `rust/game_catcher.rs`: removed interval-based spawner (`spawn_interval_id`) and replaced with RAF-driven `spawn_accumulator_ms` loop at `theme::CATCHER_SPAWN_INTERVAL_MS`
- `rust/game_catcher.rs`: hidden-tab guard resets RAF timestamp baseline and skips physics/spawn for that tick
- `rust/game_memory.rs`: timer callback early-return when document hidden
- `rust/game_hug.rs`: hold-meter callback early-return when document hidden

**Shared visibility helper (1 addition)**:
- `rust/browser_apis.rs`: added `is_document_visible() -> bool`

**Validation**:
- `cargo check --target wasm32-unknown-unknown` PASS
- `npm run qa:pwa-contract` PASS
- `npm run test:e2e:webkit` PASS (`1 passed`)

## Work Completed 2026-03-03 (session 16)

WASM/Rust + loader debug hardening with targeted verification and release warning elimination.

**WASM test runner + smoke coverage (2 fixes)**:
- Added wasm target runner in `.cargo/config.toml`: `runner = "wasm-bindgen-test-runner"`
- Added 2 `wasm_bindgen_test` cases in `rust/lib.rs` for contiguous/gap streak behavior and guarded `#[wasm_bindgen(start)]` with `#[cfg_attr(not(test), ...)]`

**Release minifier warning root-cause fix (3 fixes)**:
- Switched Trunk rust asset to `data-bindgen-target="no-modules"` in `index.html` to avoid `export ... default` parser failure during minification
- Updated `wasm-init.js` to initialize from no-modules `wasm_bindgen` binding while preserving perf instrumentation and compile fallback
- Replaced dynamic script injection (blocked by Trusted Types CSP) with static bindgen script include in `index.html`

**Validation**:
- `cargo test --target wasm32-unknown-unknown` PASS (`2 passed`)
- `cargo test` PASS
- `npm run build:verify:release` PASS with no JS minify warning
- `npm run qa:runtime` PASS
- `npm run qa:db-contract` PASS
- `node scripts/run-e2e.mjs --grep "window.wasmBindings"` PASS

## Work Completed 2026-03-03 (session 15)

Debug & code review — deep source audit with 3 parallel agents, 7 potential issues investigated, 3 defensive fixes:

**Rust hardening (2 fixes)**:
- `storage_pressure.rs`: Added `.max(1.0)` guard on storage quota to prevent edge-case division by zero if API returns 0
- `utils.rs`: Updated 3 stale fallback year defaults from `2025` → `2026` in `prev_day_key`, `week_key_from_day`, `week_key_end`

**Visual regression (1 fix)**:
- Refreshed `mobile-panel-quests` snapshot (32,934 pixel diff from asset manifest cache version change)

**Audit findings (4 false positives dismissed)**:
- ISO week u32 underflow: SAFE — `doy + 10` always >= 11, `iso_weekday` max 7
- SQL string interpolation in offline_queue: SAFE — constant `MAX_QUEUE_SIZE / 10 = 50`, not user input
- Image error handler memory leak: FALSE — single delegated listener on `.home-grid`, not per-image
- GPU init race condition: FALSE — WASM is single-threaded, no actual races

**QA**: All gates PASS (64 E2E + 1 skip, runtime, PWA, DB contract)

## Work Completed 2026-03-02 (session 14)

Comprehensive audit — 4 parallel deep audits (audio/speech, animation/RAF, edge-case logic, SW/offline):

**DB contract fix (1 fix)**:
- `check-db-contract.mjs`: Updated regex `openMomDashboard()` → `openMomDashboard(page)` to match session 12's deduplicated helper signature

**Audit results (all clean — no new bugs found)**:
- Audio/Speech: Single AudioContext, proper cancel-before-speak, voice pool tuned for iPad (16 max)
- Animation/RAF: All RAF IDs cancelled on cleanup, delta caps correct (50-100ms), View Transitions safe
- Edge-case logic: Heart economy secure (add-only, no negatives), game scores atomic, quest double-completion prevented by DOM guards
- SW/Offline: pagehide export fully wired (Rust → flush_sync → Export → exportToBlob), FATAL pattern detection correct, cold boot works

**QA**: All 8 gates PASS (64 E2E + 1 skip, runtime, PWA, DB contract, rust drift, docs budget, docs links)

## Work Completed 2026-03-02 (session 13)

Deep audit — 6 parallel audits (JS, Rust, HTML/CSS, build config, DB integrity, race conditions), 15 fixes:

**CSS (4 fixes)**:
- `mom.css`: `overflow:hidden` → `overflow-x:hidden` (Mom dashboard scroll was blocked)
- `home.css`: badge font `0.75rem` → `1rem` (too small for 4yo)
- `app.css`: panel header `z-index:1` → `2` (content painted over sticky header)
- `tracker.css`: added `touch-action:manipulation` to feeling buttons (300ms tap delay)

**JS — db-worker.js (4 fixes)**:
- `sqlite3_deserialize` flags `0` → `3` (FREEONCLOSE + RESIZEABLE) — DB couldn't grow past initial OPFS blob size
- Wrapped skill_mastery + reflection_prompts seed transactions in try/catch with ROLLBACK
- Added `stmt.clearBindings()` after `stmt.reset()` to prevent stale parameter retention

**Rust (6 fixes)**:
- `streaks.rs`: ON CONFLICT UPDATE `hearts_total+1` → `excluded.hearts_total` (incorrect streak heart count)
- `lib.rs`: streak hydration `LIMIT 60` → `365` (truncated long streaks)
- `db_client.rs`: send error via oneshot on serialization failure (prevents silent hangup)
- `game_memory.rs`: wall-clock elapsed → incremental `+= 1` (iPad sleep timer inflation)
- `navigation.rs`: 300ms debounce on panel-open (prevents duplicate history entries)
- `tracker.rs`: removed dead `LAST_ACT_MS` thread_local

**Infrastructure**:
- `.gitignore`: added `node_modules/` and `.lighthouseci/`
- SW v79 → v80

**QA**: 64 E2E PASS (1 expected skip), cargo check clean

## Work Completed 2026-03-02 (session 12)

Pre-deployment verification — SW cache audit, bundle audit, Rust safety audit, E2E quality:

**SW Cache Completeness**:
- Found 5 dist files not in SW precache: 1 home button (`btn-gardens.webp`), 4 mom_mode stickers (`lock-gold`, `calendar-magic`, `chart-sparkle`, `pencil-star`)
- Found 1 stale entry: `/icons/sparkle-unicorn.svg` (source template, not runtime asset)
- Fixed: added button to CRITICAL_ASSETS, stickers to DEFERRED_ASSETS, removed stale ref
- SW v78 → v79

**Bundle Size Audit**:
- WASM: 1.0 MB (app) + 840 KB (sqlite) = 1.8 MB total
- JS: 536.5 KB (sqlite3.js 365KB dominant)
- CSS: 154.6 KB across 14 files
- Images: 11.2 MB (78 WebP assets)
- Grand total: ~15 MB — acceptable for offline-first PWA

**Rust Safety Audit**:
- 2 justified `unsafe` blocks (GPU buffer reinterpret, thread-local pointer)
- Zero `.expect()`, `.unwrap()`, `panic!()`, `todo!()`, `unimplemented!()`
- All array indexing verified safe

**E2E Test Quality**:
- Fixed silent pass: TG-5 quest confirm `Promise.race` result was never asserted
- Added assertion on collected-but-unused gardens `cardCount`
- Removed commented-out dead code in `db-contract.spec.ts`
- Deduplicated helpers: `readHearts` (2→1), `openMomDashboard` (3→1), `dismissOnboardingIfPresent` (4→1)
- Net: -87 lines across 6 spec files, zero behavior change (64 pass)

**QA**: 64 E2E PASS (1 expected skip), release build clean

## Work Completed 2026-03-02 (session 11)

Deep pass — redundancy removal, asset fixes, production hygiene, JS hardening, SW safety, panic elimination:

**Redundant Observer Removal** (`rust/safari_apis.rs`):
- Removed 128-line INP/LCP PerformanceObserver that duplicated `runtime-diagnostics.js` (INP with rich breakdowns) and `web_vitals.rs` (debug panel INP max)
- `safari_apis.rs` reduced from 158 to 30 lines — retains scrollbar theming and scroll-driven animation only

**Asset & DOM Fixes**:
- Fixed undefined CSS token `--touch-target` → `--touch-comfortable` in `home.css` (Show Mom button had no min-height)
- Fixed 3 missing sticker asset refs in `mom_mode.rs`: `heart-sparkle` → `heart-sparkling`, `book-magic` → `rainbow`, `game-controller` → `confetti-ball`
- Added null-check in `offline.js` for retry button getElementById

**JS Hardening** (`db-worker.js`, `wasm-init.js`):
- Check `sqlite3_deserialize` return code (was silently ignoring failure → data loss)
- Fix init race condition — concurrent Init messages now queue and receive results
- Guard error message formatting against non-Error throw values
- Wrap wasm-init error handler DOM access in try/catch for early failures

**Service Worker Safety** (`sw.js`):
- Navigate/HTML catch returns inline 503 Response when `offline.html` missing (was returning `undefined` → Safari network error)
- Remove `await` on deferred asset precache to unblock SW activation lifecycle
- SW v76 → v78

**Panic Elimination**:
- Replaced all `.expect()` with `.unwrap_throw()` in `debug/panel.rs` (8 calls) and `debug/memory.rs` (4 calls)
- Guarded `friend_types[0]` with `.first()` in `game_unicorn_friends.rs` to prevent empty-slice panic
- Gated 4 `web_vitals.rs` console.log calls behind `#[cfg(debug_assertions)]`

**Selector Consolidation**:
- Consolidated 28 selector strings from 14 files into `constants.rs` (single source of truth)
- Removed 11 unused `data-*` attributes from `index.html`
- Replaced `.expect()` with `.unwrap_throw()` in `browser_apis.rs`, added `role=status` to toast

**Codebase State**: Zero `.expect()`, zero `.unwrap()`, zero `todo!()`/`unimplemented!()` in Rust. All array indexing verified safe.

**QA**: 64 E2E PASS (1 expected skip), cargo check clean, all asset refs validated

## Work Completed 2026-03-02 (session 10)

10x deep code quality pass — static analysis, borrow safety, timer/closure leaks, async correctness:

**Deep Pass Results (7 areas — all clean except one fixed bug)**:
- RefCell/borrow panic risks: CLEAN — all double-borrow patterns safe (RefMut drops before second borrow_mut)
- Closure::forget leaks: CLEAN — 36 forgets all in global event handlers (correct JS memory model)
- Async correctness: CLEAN — no RefCell borrows across await points anywhere in codebase
- Game state reset between sessions: CLEAN — menu hidden while active, all-cleanup on panel nav
- Integer overflow: CLEAN — u32 counters safe for 4-year-old usage, wrapping_add on request IDs
- Silent .ok() abuse: CLEAN — canvas transform ops and standard correct patterns only
- DB layer: CLEAN — no nested locks, oneshot cancellation clean, borrows drop before await

**Timer Leak Bug Fixed** (`rust/game_memory.rs`):
- `start_timer()` and `reset_hint_timer()` could be called from peek timeout after `cleanup()` sets GAME to None
- If GAME is None, timer ID can't be stored → interval/timeout leaked (runs forever as no-op)
- Fix: added `is_some_and(|g| g.active)` early-return guard to both functions
- E2E: 64 pass, 1 skip (unchanged)

**Clippy & Code Quality** (earlier in session, committed separately):
- Resolved all clippy warnings: unused import, type complexity, char comparison
- Deep quality pass: explicit enum variants, remove spurious Option, let-else, redundant closures

## Work Completed 2026-03-02 (session 9)

Pre-deployment polish — 3 UX improvements, SW bump, iPad regression prep:

**Speech Variety**:
- `companion.rs`: Expanded 5 phrase arrays (3→6 each): QUEST, STICKER, STORY, GAME, FIRST_ACT
- `companion_speech.rs`: Expanded 4 phrase arrays (4→7 each): FEED, PET, PLAY, MOOD_UP

**Show Mom Button**:
- Wired disconnected celebration feature — `celebration.rs` already bound `[data-show-mom]` but no HTML element existed
- Added `data-show-mom` button to `index.html` with `btn-show-mom.webp` asset (already precached)
- Styled in `home.css` with glassmorphic design and press animation

**Heart Counter Pop Animation**:
- `ui.rs`: `update_heart_counter()` adds/removes `heart-count-pop` CSS class with 300ms timeout
- `home.css`: Scale 1→1.35→1 elastic animation on heart increment

**Infrastructure**:
- SW v75→v76 (`public/sw.js`)
- Created `docs/IPAD_REGRESSION_TEMPLATE.md` — physical device testing checklist
- Updated rust warning drift baseline (3→5, accounts for clippy summary line counting)

## Earlier Work (condensed — see History table for commits)

- **Sessions 7-8** (2026-03-01): Rust refactoring (47 files, ~20 wrappers eliminated) + CSS optimization (13 files, -736 lines, tokenization) + 2 bug fixes (html_escape type, CSV export field type)
- **Session 6** (2026-03-01): Code review — 11 correctness fixes (CR-1–11), 8 security fixes (SEC-1–8), 19 new E2E tests (TG-1–19, 64 total)
- **Session 5** (2026-02-28): Doc cleanup — archived stale docs, fixed dangling refs, reorganized archive
- **Session 4** (2026-02-28): Safari 26.2 debug — `scheduler.yield()` via JS reflection, RAF gravity physics, SW `clients.claim()` priority fix, splash PNGs, TT audit clean
- **Session 3** (2026-02-28): Dead code audit — Rust 80 files clean, CSS 11 dead class refs removed, orphaned `public/wasm-init.js` deleted
- **Session 2** (2026-02-28): CSS polish — all 16 files, 3-stop gradients, gloss layers, 3D press, gradient text, particle system
- **Session 1** (2026-02-28): Quest card transition freeze fix, Trunk infinite rebuild loop fix
- **2026-02-27**: Deep game polish — 23 fixes (catcher/paint/unicorn/hug/memory), a11y, security cleanup
- **2026-02-21**: Production hardening — Lighthouse CI assertions, favicon, haptics routing

## Outstanding Release Task

- Physical iPad mini 6 (iPadOS 26.2 / Safari 26.2) regression evidence still required before final deployment approval.

## History

| Date | Milestone | Commits |
|------|-----------|---------|
| 2026-03-03 | Documentation cleanup + archive indexing + docs hub reorganization | (this commit) |
| 2026-03-03 | Final deep Apple-Silicon pass — GPU quality path + visibility/timer guards | (this commit) |
| 2026-03-03 | WASM debug hardening — test runner, wasm smoke tests, bindgen target/loader minify fix | (recorded in prior session) |
| 2026-03-03 | Debug & code review — 3 defensive fixes (quota guard, stale year, snapshot) | 319ab1a |
| 2026-03-02 | Comprehensive audit (audio/RAF/logic/SW) — DB contract regex fix | 575ee2a |
| 2026-03-02 | Deep audit — 15 fixes (CSS/JS/Rust), SW v80 | d3658ab |
| 2026-03-02 | Pre-deploy verify — SW cache fix, E2E dedup + assertion fixes | 31cbfa1–2161c0f |
| 2026-03-02 | Deep pass — observers, JS hardening, SW safety, panic elimination, selector consolidation | 4943b69–da43297 |
| 2026-03-02 | 10x deep pass — clippy fixes, code quality, timer leak fix (game_memory) | db5c36f–e0f60b0 |
| 2026-03-02 | Pre-deploy polish — speech variety, Show Mom button, heart pop, SW v76 | be2c8d3–b8828a9 |
| 2026-03-01 | CSS optimization — 13 files, -736 lines, tokenize values | de43ea0–ac3e924 |
| 2026-03-01 | Rust refactoring — 47 files, eliminate wrappers/duplicates | ecc2f29–39f366f |
| 2026-03-01 | Bug fix — 2 bugs from session 6 code-quality pass | dd7458f |
| 2026-03-01 | Code review + security pass (CR-1–11, SEC-1–8) + 19 new E2E tests (TG-1–19) | 0fce67d |
| 2026-02-28 | Doc cleanup pass — archive stale docs, fix links, reorganize | fada4ca, a0b71cb, 3308ab0, 7c71edf |
| 2026-02-28 | Safari 26.2 debug & opt pass — 11 fixes, splash screen | 71ee341 |
| 2026-02-28 | Extreme CSS polish pass — all 16 CSS files | eb4ab32, 54dcb49 |
| 2026-02-28 | Quest card transition freeze fix + data-focus cleanup | 2cc1bef |
| 2026-02-27 | Deep game polish — 23 fixes across gameplay, CSS, a11y | 1273877, 63defdf, 30a20ba, 772cef5 |
| 2026-02-21 | Production hardening + full gate rerun complete | (working tree) |
| 2026-02-20 | Production polish complete — all QA gates PASS | 8026800, 37fec45 |
| 2026-02-20 | Reentrant with_buf fixes (rewards, game_memory) | 629cfd7 |
| 2026-02-20 | Asset manifests, docs, e2e specs committed | aec8aae, 5957c05, bde4062 |

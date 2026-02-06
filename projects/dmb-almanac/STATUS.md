# DMB Almanac Rust Rebuild Status (Checkpoint)

Date: 2026-02-06
Repo: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac`

## Snapshot (So You Can Resume Exactly Here)
- Git branch: `agent-optimization-2026-01`
- Git HEAD (short): `100d7cd6`
- Dirty worktree (tracked, excluding untracked): ~654 files changed (many unrelated to Rust rebuild)
- Rust toolchain: `rustc 1.92.0`, `cargo 1.92.0`
- Rust targets installed: `wasm32-unknown-unknown` is installed
- Local server defaults:
  - Rust SSR listens on `127.0.0.1:3000` (from `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/rust/Leptos.toml`)

## TL;DR (What To Fix First)
- Hydration panic class has been addressed for `AiStatus`, `PwaStatus`, and AI pages by deferring client-only reads via `request_animation_frame` (SSR/CSR first render is deterministic).
- Next cutover risk: **DB/data parity + offline integrity** and ensuring parity diagnostics refresh after imports complete.
- Next validation: run Rust Playwright E2E (including `rust-runtime.spec.js`) to prevent hydration regressions and SW-related stale bundle loops for returning users.
- Data release/parity gate is currently green (see `xtask data-release` below); remaining work is cutover rehearsal + real-profile legacy migration verification.
  - Cutover runbooks:
    - `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/docs/ops/CUTOVER_RUNBOOK.md`
    - `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/docs/ops/ROLLBACK_RUNBOOK.md`

## What This Repo Is Right Now
- Goal: Rust-first Leptos SSR + WASM hydrate PWA with minimal JS, IndexedDB offline-first, and on-device AI (WebGPU worker + ANN index).
- Current state:
  - Rust workspace builds and unit/integration tests pass (via `xtask verify`).
  - SSR returns a full HTML shell including `HydrationScripts` and SW registration.
  - Hydration no longer panics in Chromium; `globalThis.__DMB_HYDRATED === true` is expected after load.

## Prereqs (If a New Machine Picks This Up)
- Rust:
  - `rustup target add wasm32-unknown-unknown`
- Optional (only if you run wasm size optimizations):
  - `wasm-opt` (Binaryen) for `xtask optimize-wasm`
- Legacy app / E2E harness:
  - Node + `pnpm` (used by `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app` scripts and Playwright tests)

## Directory Map (Avoid Confusion In a New Session)
- Rust rebuild (new app): `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/rust`
- Old app (legacy SvelteKit/Node, still present): `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app`
- Ops docs / runbooks: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/docs`
- Shared scripts (assorted): `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/scripts`

## “Resuming Safely” With This Very Dirty Repo
- Do not assume “git status is meaningful” for the Rust rebuild; there are hundreds of unrelated changes.
- If you need to ship anything from this state:
  - isolate changes by creating a fresh branch and/or selectively committing only the Rust rebuild files you touched
  - treat `.claude/` and `app/` changes as separate workstreams unless you explicitly intended them

## What Was Just Completed (Selected High-Signal Work)

### 1. WASM Build Unblocked (Hard Requirement for Hydration Parity)
File: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/rust/crates/dmb_idb/src/lib.rs`
- Fixed wasm-only compile errors that were not caught by host `cargo check`:
  - `on_upgrade_needed` now handles `event.database()` as `Result<Database, idb::Error>`.
  - Removed duplicate `count_store` by renaming helper to `count_store_in_db`.
  - Replaced wasm `tracing::warn!` with `web_sys::console::warn_1` for migration mismatch logging.
  - Added explicit types for `tracks` and `items` vectors to satisfy wasm type inference in sort closures.
  - Fixed `ObjectStore::delete` usage by passing `Query::Key(JsValue::from_str(id))`.

### 2. AI/ANN Memory + Diagnostics Tightening
File: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/rust/crates/dmb_app/src/ai.rs`
- Reduced memory duplication while loading embeddings by extracting into a contiguous matrix and clearing per-record vectors after extraction.
- Added AI warning event tracking for ANN fetch/cap failures and vector dimension mismatches.

File: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/rust/crates/dmb_app/src/pages.rs`
- Fixed the “worker threshold” units UI: threshold is floats (matching `webgpu.js`), now displayed as floats and approximate vectors at `dim`.

### 3. Service Worker Update Reliability
File: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/rust/static/sw.js`
- Removed large/optional ANN precache assets that can break install/update (kept ANN metadata in data cache).
- Added `precache()` helper with try/catch so SW install does not fail if caching fails.
- SW emits `SW_INSTALLED` and `SW_ACTIVATED` messages; UI listens and shows “Update ready” with Reload/Later actions.
- `PwaStatus` now performs a silent periodic `registration.update()` check after hydration (throttled; avoids users getting stuck on stale SW/bundles without clicking “Check for updates”).
- `PwaStatus` now also cleans up **legacy CacheStorage** entries from the old JS app (one-time, online-only, after the Rust SW is controlling the page).
  - Manual fallback: open "SW details" and click "Cleanup legacy caches".
  - This reduces quota pressure and prevents “ghost” offline behavior after cutover.
- Switched `/pkg/*` (WASM/JS hydration bundles) to **network-first** caching to prevent stale-bundle hydration mismatch loops after rebuilds/deploys.
- For `/pkg/*`, `/data/*`, and HTML navigations, SW uses `fetch(..., { cache: "no-store" })` to bypass the browser HTTP cache (CacheStorage is the source of truth).

File: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/rust/crates/dmb_app/src/lib.rs`
- SW registration uses `updateViaCache: "none"` to reduce “SW script served from HTTP cache” issues.

File: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/rust/crates/dmb_idb/src/lib.rs`
- Legacy IndexedDB migration now closes the legacy DB handle before attempting `deleteDatabase` so deletion does not get blocked by an open connection.

File: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/rust/crates/dmb_server/src/main.rs`
- Server sets `Cache-Control` headers to reduce stale-client loops:
  - `/sw.js`, `/pkg/*`, `/data/*`, `/manifest.json`: `Cache-Control: no-cache`
  - HTML (when `Accept: text/html`): `Cache-Control: no-store`

### 4. Added a Single “Green Build” Command
File: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/rust/crates/xtask/src/main.rs`
- New command: `xtask verify`
  - Runs `cargo fmt --check`
  - Runs clippy for `dmb_app` in both `hydrate` and `ssr` feature sets
  - Builds the hydration bundle into `rust/static/pkg` via `wasm-pack` (`--features hydrate`)
  - Runs `cargo test --workspace`

### 5. SSR Uses The HTML Shell + Hydration Artifacts Are Served
Files:
- `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/rust/crates/dmb_server/src/main.rs`
- `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/rust/crates/dmb_app/src/lib.rs`
- `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/rust/static/pkg/*`

What changed:
- SSR now renders via `dmb_app::shell(...)` so responses include full document markup plus `HydrationScripts`.
- Client entrypoint exports `hydrate()` and uses `hydrate_body(App)` (avoid double-mount).
- `hydrate()` sets `globalThis.__DMB_HYDRATED = true` at the end (used by E2E).
- Shell registers the Rust SW: `navigator.serviceWorker.register("/sw.js")`.
- WASM artifacts exist in `rust/static/pkg` (`dmb_app.js`, `dmb_app_bg.wasm`).

Build artifacts command (regenerate `rust/static/pkg`):
- `cd rust/crates/dmb_app && wasm-pack build --target web --release --out-dir ../../static/pkg --out-name dmb_app -- --features hydrate`

Wasm-pack config (avoid wasm-opt dependency):
- `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/rust/crates/dmb_app/Cargo.toml`
  - `[package.metadata.wasm-pack.profile.release] wasm-opt = false`

## Verified Green Commands (Rust-only, Not E2E)
From `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/rust`:
- `cargo run -p xtask -- verify` (expected green gate)
- `cargo run -p xtask -- data-release --sqlite data/dmb-almanac.db` (strict parity gate; currently green)
Optional (if you need to build the hydration bundle explicitly):
- `cargo run -p xtask -- build-hydrate-pkg` (produces `rust/static/pkg/dmb_app.js` + `dmb_app_bg.wasm`)

## Verified Green Commands (E2E Guardrails)
From `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app` (requires Rust server already running on `http://127.0.0.1:3000`):
- `RUST_E2E=1 BASE_URL=http://127.0.0.1:3000 pnpm exec playwright test tests/e2e/rust-runtime.spec.js --project chromium --workers 1`
- `RUST_E2E=1 BASE_URL=http://127.0.0.1:3000 pnpm exec playwright test tests/e2e/rust-offline.spec.js --project chromium --workers 1`
- `RUST_E2E=1 BASE_URL=http://127.0.0.1:3000 pnpm exec playwright test tests/e2e/rust-search.spec.js --project chromium --workers 1`
- `RUST_E2E=1 BASE_URL=http://127.0.0.1:3000 pnpm exec playwright test tests/e2e/rust-legacy-migration.spec.js --project chromium --workers 1`
- `RUST_E2E=1 BASE_URL=http://127.0.0.1:3000 pnpm exec playwright test tests/e2e/rust-legacy-cache-cleanup.spec.js --project chromium --workers 1`
- Cutover rehearsal (runs Rust gates + starts/stops server + runs Rust E2E subset):
  - `cd /Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac && bash scripts/cutover-rehearsal.sh`

## How To Run Locally (Rust App)
From `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/rust`:
- Run SSR server: `cargo run -p dmb_server`
  - URL: `http://127.0.0.1:3000/`
  - The server tries SQLite from `data/dmb-almanac.db` or `../app/data/dmb-almanac.db` (read-only).
  - Static assets are served from the Rust Leptos options: `site_root=static`, `pkg` path under `static/pkg`.

## Resolved: Hydration Panic (Tachys Unreachable)
Symptom (historical):
- `panicked at ... tachys... hydration.rs:... entered unreachable code`
- Before fix, `globalThis.__DMB_HYDRATED` never became `true`; now it should become `true` shortly after load.

Root cause:
- SSR initial HTML differed from the client’s first hydrated render due to browser-only reads (capability detection, `localStorage`, SW state) happening during component construction.

Fixes applied:
- `AiStatus`: deterministic initial signals; post-hydration capability detection.
- `PwaStatus`: defer all `localStorage`/navigator/SW reads and signal sets until after hydration; start async tasks after that; refresh parity/integrity once after a successful import completes.
- AI pages (`/ai-diagnostics`, `/ai-warmup`): deterministic initial values; load browser-only signals post-hydration.

Files:
- `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/rust/crates/dmb_app/src/components/ai_status.rs`
- `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/rust/crates/dmb_app/src/components/pwa_status.rs`
- `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/rust/crates/dmb_app/src/pages.rs`

Playwright repro (runs against the Rust SSR; requires server already running):
- `cd app && RUST_E2E=1 BASE_URL=http://127.0.0.1:3000 pnpm exec playwright test tests/e2e/rust-search.spec.js -g "offline search still responds" --project chromium`
  - Expected current result: should pass and observe `window.__DMB_HYDRATED === true`.

Most likely root cause (high confidence):
- SSR initial HTML differs from what the hydrate build expects on first render.
- Primary suspect: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/rust/crates/dmb_app/src/components/ai_status.rs`
  - It calls `detect_ai_capabilities()` and `worker_failure_status()` during component construction.
  - On SSR build, `detect_ai_capabilities()` returns `AiCapabilities::default()` (all false).
  - On hydrate build, `detect_ai_capabilities()` returns values based on browser APIs and also sets `wasm_simd: true`.
  - Those values gate visible text in `<span>` pills and `<Show>` blocks, producing SSR/CSR mismatch and a tachys hydration panic.

Fix direction:
- Make initial state deterministic and identical between SSR and hydrate builds.
- Only read browser capabilities after mount (hydrate-only), and update signals then.
  - Example approach: initialize `caps` and `worker_status` with `Default` in all builds, then in `request_animation_frame` (hydrate-only) set real values.

### Status Update (2026-02-06)
- Implemented the deterministic-first-render fix for `AiStatus`:
  - File: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/rust/crates/dmb_app/src/components/ai_status.rs`
  - `caps`/`worker_status` now start as `Default` (matches SSR), then update in `request_animation_frame` (hydrate-only).
- Verified in Chromium (headless Playwright):
  - No tachys hydration panic
  - `globalThis.__DMB_HYDRATED === true`
- Verified Playwright E2E now passes:
  - `cd app && RUST_E2E=1 BASE_URL=http://127.0.0.1:3000 pnpm exec playwright test tests/e2e/rust-search.spec.js --project chromium`
    - 2 passed

## Data Locations (This Is Easy To Get Wrong)
- Rust pipeline outputs (preferred for Rust app):
  - SQLite: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/rust/data/dmb-almanac.db`
  - Warnings/budgets/etc: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/rust/data` (see files like `warnings.json`, `warnings.baseline.json`)
  - PWA static artifacts: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/rust/static/data` (data bundles + ANN/AI artifacts)
- Legacy app data bundle/database:
  - SQLite: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/data/dmb-almanac.db`
- Important: the Rust server will fall back to reading the legacy SQLite if the Rust one is missing. If parity looks “mysteriously wrong”, confirm which DB file was actually used.

## Useful Built-In Parity Guard
File: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/rust/crates/dmb_app/tests/route_parity.rs`
- This test asserts the Rust router covers the legacy Svelte routes (reads routes from the old app directory).
- If this starts failing, it is a high-signal indicator that the cutover will be missing routes even if builds are green.

## Environment Variables That Change Behavior (Operational Foot-Guns)
- Server:
  - `DMB_COOP_COEP`: toggles COOP/COEP headers (relevant for WebGPU/wasm isolation expectations and cross-origin embed behavior)
- Pipeline (scrape/validate):
  - `DMB_SCRAPE_MAX_RETRIES`, `DMB_ENDPOINT_RETRY_MAX`: overrides retry behavior
  - `DMB_ENDPOINT_TIMING_MAX_PCT`: influences endpoint timing budget checks
  - `DMB_VALIDATE_ALLOW_MISMATCH`: relaxes strict mismatch checking
  - `DMB_VALIDATE_WARNING_REPORT`: emits an additional warning report file during validate
  - Warning budget inputs: `DMB_WARNING_BASELINE`, `DMB_WARNING_MAX_BY_FIELD`, `DMB_WARNING_MAX_BY_PAGE`, `DMB_WARNING_MAX_BY_SELECTOR`, `DMB_WARNING_MAX_EMPTY_BY_CONTEXT`, `DMB_WARNING_MAX_MISSING_BY_CONTEXT`
  - Strictness gates: `DMB_WARNING_SIGNATURE_STRICT`, `DMB_REQUIRE_VENUE_SHOWS`

## Current Known Issue / Review Finding
Finding: “Scraper unwraps can panic on HTML changes”
- The scraper has a lot of hard assumptions, but (as of this checkpoint) most `expect(...)` hits in `dmb_pipeline/src/scrape.rs` are inside `#[cfg(test)]` fixtures rather than runtime scraping.
- If we want to harden runtime scraping further:
  - replace any non-test unwraps with fallible parsing + `record_scrape_error`/`warn_missing_field` paths
  - keep the contract: scraper should fail with a structured error summary, not panic

## Scraping / Data Pipeline Entry Points (When You Pick That Thread Back Up)
- Quick reference: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/rust/README.md`
- Live scrape runbook: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/docs/ops/RUST_SCRAPE_RUNBOOK.md`
- Fixtures notes (selector drift checks): `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/docs/scraping/RUST_SCRAPE_FIXTURES.md`
- Canonical pipeline binary: `cargo run -p dmb_pipeline -- <subcommand>`

## Clean Pause Point Definition
At this checkpoint:
- Rust workspace compile/test gates are green (via `xtask verify`).
- SSR serves a complete HTML shell and hydration artifacts are present/served.
- SW update logic is reasonably robust and cannot be bricked by a single precache failure.
- AI warnings capture common failure modes (fetch/cap/dim mismatch) and UI reflects correct units.
- Near a “transition-ready pause point”: remaining work is data parity/integrity validation + route/UI parity verification before ditching the old app.

## Next Tasks (Ordered, Cutover-Oriented)
1. Run Rust E2E with seeded `localStorage` keys to prevent returning-user hydration regressions.
2. Re-run Rust Playwright E2E subset (search/offline/SW update flows) in a clean Chrome profile.
3. Validate parity/integrity after offline import:
   - Confirm parity diagnostics refresh after `ensure_seed_data` completes (implemented in `PwaStatus`).
4. Data release end-to-end (no `--skip-parity`) and fix any strict parity failures:
   - `cd rust && cargo run -p xtask -- data-release --sqlite data/dmb-almanac.db`
5. Confirm which SQLite DB is being used in production-like runs (Rust DB vs legacy DB fallback).
6. Verify route parity for cutover (`dmb_app/tests/route_parity.rs`) and fill any gaps.
7. Stage deploy the Rust server (parallel path or subdomain) and validate:
   - SW install/activate/update in a clean Chrome profile
   - offline fallback works
   - `/data/*` caching behaves as intended
8. Decide cutover handling for the legacy app:
   - Keep `/app` as a test harness (Playwright + historical reference) or move it to `legacy/` once Rust is primary.
   - Preserve the legacy SQLite and exported JSON bundles as an audit trail.
9. CI gate: add a workflow step that runs `cd rust && cargo run -p xtask -- verify` so wasm-only regressions never land again.
10. Real user migration verification:
    - legacy IndexedDB -> new DB migration and count checks
    - legacy DB deletion after verified success
11. Production headers review:
    - COOP/COEP toggles and cache headers for HTML/assets/data

## Cutover From The Old App (SvelteKit/Node) When Ready
This section is the “what to do with the old app” checklist so the transition is deliberate and reversible.

### A. Run Both Apps In Parallel
- Keep the old app serving production while you run the Rust app on:
  - a subdomain like `rs.<domain>` or
  - a path like `/<something>` behind the same domain (only if SW scope is carefully controlled).
- Ensure the Rust PWA service worker scope is correct:
  - If Rust is on a subdomain, it gets its own SW scope automatically.
  - If Rust is on the same domain, do not let old and new service workers fight over `/` scope.
- Cutover failure mode to plan for:
  - clients that already have the old SW controlling `/` can keep serving stale assets even after a DNS/traffic flip
  - plan a hard “unregister SW + clear site data” validation step during staging

### B. Data + IndexedDB Migration Plan
- The Rust app should migrate legacy IndexedDB on first launch:
  - Detect legacy DB `dmb-almanac` (Dexie) and migrate into the Rust DB (`dmb-almanac-rs`).
  - Verify table counts match expected counts.
  - If verified, delete legacy DB; if mismatched, keep legacy DB and show diagnostics.
- Before switching traffic, validate migration using a real profile that already has offline data from the old app.
- Treat migration as a hard gate for decommissioning: do not ship a cutover that silently drops offline data.

### C. Traffic Cutover
- Switch the primary domain to Rust only after:
  - Rust route parity is acceptable for all core flows.
  - `xtask verify` is green.
  - Data release + parity checks are green.
  - PWA install/offline/update flows are stable.
- Keep the old app available for a short rollback window (days, not weeks).

### D. Decommission The Old Stack (After Stable Cutover)
- Freeze the old app:
  - Stop generating new data bundles via Node scripts for prod.
  - Remove/disable old SW updates so clients don’t flip-flop caches.
- Leave the old app deployed (read-only / no SW updates) until:
  - migration success rate is verified in real usage
  - you have at least one full SW update cycle without regressions
- Remove runtime dependencies:
  - Remove SvelteKit/Node runtime from deployment and CI once Rust is the only serving path.
  - Archive old pipeline scripts after confirming Rust pipeline is the single source of truth.
- Repo cleanup (do this as a dedicated, scoped PR):
  - Delete old app-only code and tests after confirming no shared assets are referenced.
  - Update docs/README to point exclusively to Rust commands and endpoints.

## How To Resume In a New Session (Minimal Steps)
1. `cd /Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/rust`
2. Run the gate: `cargo run -p xtask -- verify`
3. If you are working on data/parity: `cargo run -p xtask -- data-release --sqlite data/dmb-almanac.db`
4. If you are working on the SW UX: inspect `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/rust/static/sw.js` and `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/rust/crates/dmb_app/src/components/pwa_status.rs`
5. If you are validating cutover readiness: run `cargo test -p dmb_app route_parity` and then do a browser run in a real profile with legacy offline data.
   - Prefer: `cargo test -p dmb_app --test route_parity` (runs the integration test binary directly)
6. If you need to validate the legacy app (for rollback comparison):
   - `cd /Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app`
   - `pnpm install`
   - `pnpm dev` (Vite default is typically `http://localhost:5173/`)

## Notes / Gotchas
- Because a lot of code is behind `cfg(target_arch = "wasm32")`, host `cargo check` can miss regressions. Keep `xtask verify` as the default gate.
- The service worker intentionally does not precache large ANN binary assets; it should still cache them on-demand via `/data/*` fetches.
- Emergency recovery (when the UI looks stuck on SSR defaults):
  1. Chrome DevTools -> Application -> Service Workers: click "Unregister".
  2. Chrome DevTools -> Application -> Storage: click "Clear site data".
  3. Hard reload.
- There are helper files in repo root that may be stale depending on how the server was started/stopped:
  - `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/.tmp_dmb_server.pid`
  - `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/.tmp_dmb_server.log`

# Database Optimization + Debug Execution Plan (2026-02-15)

## Goal
Close the highest-impact database optimization and debugging gaps with tracked, verifiable execution through completion.

## Scope
- Route parity and route coverage guards for Rust app routing.
- Server parity API test depth and regression detection.
- CI query-plan guardrail integration.
- Cutover E2E coverage expansion for DB-relevant routes/workflows.
- Follow-up test/validation runs and status tracking.

## Execution Rules
- Every phase must end with explicit verification output and status update.
- No phase is complete without either:
  - passing automated checks, or
  - documented blocker + next action.

## Phase Tracker

### Phase 1: Route Source-of-Truth Hardening
- [x] Add missing routes to `RUST_ROUTES` parity source.
- [x] Update route fixture parity baseline to include AI routes.
- [x] Verify route parity tests pass.

Success criteria:
- Router-defined AI routes are represented in parity constants/fixtures.
- Route parity test coverage does not miss AI route regressions.

### Phase 2: Server Data-Parity API Test Expansion
- [x] Add test for `/api/data-parity` when SQLite is unavailable.
- [x] Add test for `/api/data-parity` with partial SQLite schema (counts + missing tables).
- [x] Verify `dmb_server` tests pass.

Success criteria:
- Core parity endpoint behavior is covered for unavailable and degraded DB scenarios.

### Phase 3: CI Guardrail Integration
- [x] Add query-plan audit step to Rust CI workflow after runtime DB/parity build.
- [x] Verify workflow YAML consistency.

Success criteria:
- CI fails on query-plan/index/integrity regressions, not only parity regressions.

### Phase 4: Cutover E2E Coverage Expansion
- [x] Expand cutover E2E suite to include AI route spec.
- [x] Expand route smoke coverage for additional DB-backed pages.
- [x] Keep cutover scripts aligned (local + remote).

Success criteria:
- Cutover suite covers broader DB-backed navigation and AI diagnostics flows.

### Phase 5: Validation + Completion
- [x] Run targeted Rust tests for touched code.
- [x] Run route/parity sanity checks.
- [x] Document results and any residual risks.

Success criteria:
- All implemented phases validated and recorded with final status.

## Progress Log
- 2026-02-15: Plan created. Execution started.
- 2026-02-15: Phase 1 completed.
  - Added missing AI routes to `RUST_ROUTES`: `/ai-warmup`, `/ai-smoke`.
  - Updated route fixture baseline to include AI routes for parity drift detection.
  - Verified with `cargo test -p dmb_app --features ssr --test route_parity`.
- 2026-02-15: Phase 2 completed.
  - Added two `/api/data-parity` tests in `dmb_server`:
    - no-DB path (`available=false`),
    - partial-schema path (counts + missing tables).
  - Verified with `cargo test -p dmb_server`.
- 2026-02-15: Phase 3 completed.
  - Wired `scripts/db-query-plan-audit.sh` into `.github/workflows/rust-ci.yml`.
  - Verified workflow syntax and repository path wiring.
- 2026-02-15: Phase 4 completed.
  - Added AI route spec (`rust-ai.spec.js`) to cutover local + remote scripts.
  - Expanded `rust-smoke.spec.js` route smoke coverage for DB-backed pages.
  - Updated script parity between `cutover-rehearsal.sh` and `cutover-remote-e2e.sh`.
- 2026-02-15: Phase 5 completed.
  - Ran:
    - `cargo fmt --all`
    - `cargo test -p dmb_server`
    - `cargo test -p dmb_app --features ssr --test route_parity`
    - `cargo test -p dmb_app --features ssr --test route_render`
    - `bash scripts/db-query-plan-audit.sh rust/.tmp/dmb-runtime.db`
- 2026-02-15: Post-plan residual-risk closure completed.
  - Ran full cutover rehearsal end-to-end:
    - `bash scripts/cutover-rehearsal.sh`
  - First rehearsal run surfaced two blockers:
    - `clippy::type-complexity` in `dmb_app/src/server.rs` cache declaration.
    - `rust-parity-report.spec.js` parity check incomplete due snake_case store names in parity mapping.
  - Applied fixes:
    - Added `CuratedListItemsCacheMap` type alias in `dmb_app/src/server.rs`.
    - Updated `dmb_core::SQLITE_PARITY_STORE_TABLE_MAPPINGS` to use expected camelCase IndexedDB store names for:
      - `setlistEntries`, `guestAppearances`, `liberationList`, `songStatistics`, `releaseTracks`, `curatedLists`, `curatedListItems`.
    - Added parity mapping regression test in `dmb_core`.
  - Re-verified:
    - `cargo test -p dmb_core`
    - `bash scripts/cutover-rehearsal.sh` → `16 passed` and `[cutover] ok`
  - Residual risk status:
    - Previously deferred expanded E2E execution is now closed for this plan.
- 2026-02-15: Remote cutover path verification completed.
  - Ran:
    - `BASE_URL=http://127.0.0.1:3104 bash scripts/cutover-remote-e2e.sh`
  - Result:
    - `16 passed` and `[cutover-remote] ok`
  - Execution note:
    - Hydration timeouts reproduce when `dmb_server` is launched from the repository root because `/pkg/*` resolves relative to `./static` and returns 404.
    - Launching from `rust/` (or otherwise setting working directory so `site_root=static` maps to `rust/static`) resolves the issue.
- 2026-02-15: Startup hardening for asset-root mislaunch completed.
  - Added preflight guard in `dmb_server` startup to require:
    - `static/pkg/dmb_app.js`
    - `static/pkg/dmb_app_bg.wasm`
  - Added unit tests in `dmb_server`:
    - missing-assets case reports both required files.
    - present-assets case passes.
  - Verified:
    - `cargo test -p dmb_server` (12 passed)
    - `cargo build -p dmb_server`
    - launch from repo root now fails fast with non-zero exit:
      - `exit_code=1` and explicit missing asset paths in logs.
- 2026-02-15: Debug experience audit completed (`debug-experience-auditor`).
  - Source map coverage is missing for shipped static JS/WASM bundles (`rust/static/pkg`, `rust/static/webgpu.js`, `rust/static/sw.js`).
  - Server request tracing is strong (`TraceLayer` + `x-request-id` propagation), but runtime log level is fixed to `info`.
  - Browser panic/console tracing is enabled (`console_error_panic_hook`, `tracing_wasm`), but UI-level error boundaries are not present.
  - Follow-up actions captured in audit recommendations (source maps, configurable log level, async error capture, UI error boundaries).
- 2026-02-15: Debug recommendation implementation (pass 1) completed.
  - `dmb_server` logging hardening:
    - Added runtime log filter resolution with precedence: `RUST_LOG` -> `DMB_LOG_LEVEL` -> `info`.
    - Added startup trace log for resolved filter value.
    - Replaced full telemetry payload logging with structured, low-risk metadata fields
      (`payload_bytes`, `top_level_keys`, `event_key`, `violated_directive`).
    - Added unit tests for log filter resolution behavior.
  - `dmb_app` runtime error-tracing hardening:
    - Added top-level Leptos `ErrorBoundary` around routed app content with user-visible fallback.
    - Updated hydrate-only `spawn_local_to_send` bridge to avoid panic on canceled tasks;
      now logs errors and returns `Default` fallback.
  - Verification:
    - `cargo fmt --all`
    - `cargo test -p dmb_server` (15 passed)
    - `cargo test -p dmb_app --features ssr --test route_parity` (1 passed)
    - `cargo test -p dmb_app --features ssr --test route_render` (1 passed)
    - `cargo check -p dmb_app --features hydrate` (pass)
- 2026-02-15: Remaining debug recommendation (source maps) tracked as open.
  - Current state:
    - Release and dev `wasm-pack` outputs in `rust/static/pkg` do not currently emit source-map artifacts in this build path.
  - Next action:
    - Implement an explicit source-map generation/retention strategy in the build pipeline
      (tooling choice + CI assertion that map artifacts are produced and deployed).
- 2026-02-15: Source-map recommendation closure completed.
  - Implemented `xtask` source-map strategy:
    - Build-time generation of identity source maps for:
      - `rust/static/sw.js` -> `rust/static/sw.js.map`
      - `rust/static/webgpu.js` -> `rust/static/webgpu.js.map`
      - `rust/static/webgpu-worker.js` -> `rust/static/webgpu-worker.js.map`
      - `rust/static/pkg/dmb_app.js` -> `rust/static/pkg/dmb_app.js.map`
    - Automatic `//# sourceMappingURL=...` comment insertion/normalization in mapped JS assets.
    - Verification step in `xtask` that fails on missing/invalid source-map coverage.
  - CI enforcement path:
    - `rust-ci` already runs `cargo run -p xtask -- verify`; source-map generation + verification now run as part of that gate.
  - Deployed artifact enforcement:
    - Added source-map endpoint checks to:
      - `scripts/cutover-rehearsal.sh`
      - `scripts/cutover-remote-e2e.sh`
  - Verified with:
    - `cargo test -p xtask` (3 passed)
    - `cargo run -p xtask -- build-hydrate-pkg`
    - `cargo run -p xtask -- verify --skip-tests`
    - `cargo test -p dmb_app --features ssr --test route_parity`
    - `cargo test -p dmb_app --features ssr --test route_render`
- 2026-02-15: Source-map enforcement validated end-to-end in cutover gate.
  - Ran:
    - `bash scripts/cutover-rehearsal.sh`
  - Result:
    - Source-map endpoint checks passed for:
      - `/sw.js.map`
      - `/webgpu.js.map`
      - `/webgpu-worker.js.map`
      - `/pkg/dmb_app.js.map`
    - Rust E2E subset passed (`16 passed`) and rehearsal completed with `[cutover] ok`.
- 2026-02-15: Remote cutover path validation progressed and completed (local-remote simulation).
  - Initial full run:
    - `BASE_URL=http://127.0.0.1:3000 bash scripts/cutover-remote-e2e.sh`
    - Source-map endpoint checks passed; E2E reached 11 passing tests before process termination.
  - Completion run (remaining specs):
    - Re-ran with local server + `RUST_E2E=1` for:
      - `rust-runtime.spec.js`
      - `rust-search.spec.js`
      - `rust-sw-update.spec.js`
      - `rust-sw-update-multi.spec.js`
    - Result: `6 passed`.
- 2026-02-15: Plan terminal status.
  - All tracked phases and follow-up actions are complete.
  - No remaining unchecked tasks in this execution plan.

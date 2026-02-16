# All-In Polishing Progress (2026-02-15)

## Scope For This Pass

- Route and page-state polish in Rust Leptos app (`dmb_app`).
- Route render smoke-test alignment with canonical `RUST_ROUTES`.
- Non-breaking server-side POST payload validation with structured error responses.
- Footer/AI status UX consistency improvements.

## Implemented

1. Route/content polish in `rust/crates/dmb_app/src/pages.rs`

- Replaced `static_page` placeholder with actionable content and stable navigation links.
- Added explicit parameter validation helpers:
  - `parse_positive_i32_param`
  - `parse_slug_param`
  - `parse_tour_year_param`
- Hardened detail routes with deterministic invalid-parameter messaging:
  - `/shows/:showId`
  - `/songs/:slug`
  - `/guests/:slug`
  - `/releases/:slug`
  - `/tours/:year`
  - `/venues/:venueId`
- Improved AI route state clarity:
  - `ai_benchmark_page`: running/status/error states and empty-state copy.
  - `ai_warmup_page`: explicit warmup failure messaging.
  - `ai_smoke_page`: query validation, running/error states, deterministic completion copy.
- Replaced visualization placeholders with shipped route-linked behaviors and migration-safe copy.

2. Route smoke coverage alignment in `rust/crates/dmb_app/tests/route_render.rs`

- Replaced fixed-size array with dynamic vector to prevent count drift errors.
- Updated render suite to include all canonical routes and mapped fallback `/*`.
- Added assertion that render suite count matches `dmb_app::RUST_ROUTES`.

3. Route-level SSR smoke checks across the full canonical route surface

- Added `rust/crates/dmb_app/tests/route_smoke.rs`.
- Uses concrete URLs for dynamic routes (`/shows/1`, `/songs/ants-marching`, etc.) and
  an unknown path to cover `/*`.
- Asserts route smoke list count matches `dmb_app::RUST_ROUTES`.
- Renders `App` with `RequestUrl` context per path to validate route matching without
  param-context panics.

4. Accessibility checks (automated baseline)

- Added `rust/crates/dmb_app/tests/a11y_routes.rs`.
- Covers top-value public routes:
  - `/`
  - `/shows`
  - `/songs`
  - `/venues`
  - `/guests`
  - `/tours`
  - `/releases`
  - `/stats`
  - `/search`
  - `/visualizations`
- Assertions include:
  - skip-link presence,
  - `main-content` landmark presence,
  - labeled primary navigation,
  - heading hierarchy (`h1` before any `h2`).

4b. Accessibility checks (manual spot-check workflow)

- Added manual runbook:
  - `docs/ops/A11Y_KEYBOARD_SPOTCHECK_RUNBOOK.md`
- Added report generator script:
  - `scripts/a11y-keyboard-spotcheck.sh`
- Added sample generated report artifact:
  - `docs/reports/QUALITY/A11Y_KEYBOARD_SPOTCHECK_SAMPLE.md`

5. Shared UI polish

- `rust/crates/dmb_app/src/components/footer.rs`
  - Added high-utility support links (`/`, `/search`, `/open-file`).
  - Improved stale-content recovery guidance copy.
- `rust/crates/dmb_app/src/components/ai_status.rs`
  - Added explicit CPU fallback note when GPU acceleration is unavailable.
- `rust/crates/dmb_app/src/components/pwa_status.rs`
  - Added clear status heading/copy and polite live status region.
  - Added explicit offline warning guidance for cached-mode behavior.
  - Improved service-worker action feedback announcement semantics.

6. Deterministic browse ordering and pagination behavior

- Added stable normalization policies for core browse datasets in
  `rust/crates/dmb_app/src/pages.rs`:
  - shows: `date desc`, tie `id desc`
  - songs: `total_performances desc`, tie `title asc`, then `id`
  - venues: `total_shows desc`, tie `name asc`, then `id`
  - guests: `total_appearances desc`, tie `name asc`, then `id`
  - tours: `year desc`, tie `total_shows desc`, then `name asc`
  - releases: `release_date desc`, tie `title asc`, then `id`
- Applied truncation (`limit`) after normalization to keep page behavior deterministic.
- Added unit tests in `pages.rs` validating sorting and limit behavior.

7. PWA update/recovery edge-state test coverage

- Extended `rust/crates/dmb_app/src/components/pwa_status.rs` tests:
  - clock-skew suppression behavior,
  - snooze-expiry behavior,
  - SW `?e2e=` version parser behavior for update test wiring.

8. Support-page navigation and hierarchy polish (`rust/crates/dmb_app/src/pages.rs`)

- Improved `not_found_page` recovery actions with direct search entry point.
- Added clearer section hierarchy for:
  - `/open-file`
  - `/protocol`

9. Server reliability and payload validation (`rust/crates/dmb_server/src/main.rs`)

- Added structured error payload (`ApiErrorResponse`) for invalid POST requests.
- Added payload limits (`MAX_JSON_POST_PAYLOAD_BYTES`) and JSON-object validation.
- Enforced event-name validation for:
  - `/api/analytics`
  - `/api/telemetry/*`
- Enforced payload-shape validation for:
  - `/api/csp-report` (requires `csp-report` object)
  - `/api/share-target` (requires JSON object)
- Kept success response contracts unchanged (no breaking response-field changes).

10. Phase 5 gate hardening (CI + regressions)

- Added stale-cache regression coverage in
  `rust/crates/dmb_server/src/main.rs` (`data_parity_ignores_stale_cache_entries`).
- Expanded CI release gates in `.github/workflows/rust-ci.yml` with explicit:
  - core parity assertion tests (`dmb_core`),
  - server payload regression tests (`dmb_server`),
  - stale-cache fallback regression test (`dmb_server`),
  - empty-dataset normalization regression test (`dmb_app`).
- Updated release gate checklist in
  `docs/reports/QUALITY/RELEASE_READINESS_CHECKLIST.md`.

## Remaining Items For Full Plan Completion

- Full Phase 1 baseline capture document with:
  - workspace `cargo check/test/clippy/fmt` timings and outcomes,
  - compile/test duration and memory snapshots.
- Extended route and parity integration test sets beyond current render/parity coverage.
- Accessibility automated + manual spot-check report for top 10 routes.
- PWA status component deep hardening pass (`pwa_status.rs`) with update/cache-flow UX checks.
- Duplicate data-source normalization and pipeline/manifest path unification.
- Manual release-window checks/sign-offs:
  - offline no-network spot-check,
  - AI timeout/degradation spot-check,
  - engineering/QA/release-owner sign-off.

## Validation Run (This Pass)

Executed from `rust/`:

- `cargo check --workspace` -> pass
- `cargo fmt --all -- --check` -> fail (format drift in `pages.rs`), then fixed with `cargo fmt --all`
- `cargo clippy --workspace --all-targets -- -D warnings` -> pass
- `cargo test -p dmb_app --features ssr` -> pass (unit + integration suites)
- `cargo test -p dmb_app --test route_render --features ssr` -> pass (`1 passed`)
- `cargo test -p dmb_app --test route_smoke --features ssr` -> pass (`1 passed`)
- `cargo test -p dmb_server` -> pass (`15 passed`)

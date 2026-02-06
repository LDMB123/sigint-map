# DMB Almanac Context Pack (For A New LLM Session)

Repo: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac`

Use this file as the first message in a new session to resume work quickly and safely. It is intentionally short and biased toward "what is broken, where, and what to do next".

## Goal
Replace the legacy SvelteKit app (`app/`) with the Rust Leptos SSR + WASM hydrate PWA (`rust/`) while preserving:
- Route parity (all critical pages exist)
- Offline-first behavior (IndexedDB + SW caching)
- Data parity (SQLite and shipped `/data/*` bundles are consistent)
- Upgrade/migration safety (old IndexedDB migrated or kept safely)

## Current Snapshot
- Branch: `agent-optimization-2026-01`
- HEAD: `100d7cd6` (short)
- Worktree: extremely dirty (hundreds of unrelated changes). Avoid "commit all".

## Directory Map
- New app (Rust): `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/rust`
- Legacy app (SvelteKit): `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app`
- Project docs: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/docs` and `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/docs`

## What Works
- Rust workspace compile + unit/integration tests pass via:
  - `cd rust && cargo run -p xtask -- verify`
- SSR serves a full HTML shell (doctype/head/body) and includes hydration scripts + SW registration:
  - Shell: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/rust/crates/dmb_app/src/lib.rs`
  - Server: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/rust/crates/dmb_server/src/main.rs`
- Hydration artifacts exist and are served:
  - `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/rust/static/pkg/dmb_app.js`
  - `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/rust/static/pkg/dmb_app_bg.wasm`

## Previously-Broken But Now Resolved
### 1) Hydration Panic (Tachys “entered unreachable code”)
- Fix: make SSR + hydrate initial render deterministic, then update browser-only signals after mount (hydrate-only) using `request_animation_frame`.
- Key files:
  - `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/rust/crates/dmb_app/src/components/ai_status.rs`
  - `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/rust/crates/dmb_app/src/components/pwa_status.rs`
  - `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/rust/crates/dmb_app/src/pages.rs`

### 2) “Stuck SSR UI” Loops From Stale Service Worker Bundle Caching
Symptom:
- UI looks stuck on SSR defaults (example: “Checking offline data…”, “Threads disabled…”) because hydration never successfully runs.

Root cause (most common):
- SW served stale `/pkg/*` WASM/JS bundles after rebuild/deploy, causing SSR/CSR mismatch and hydration failure.

Fix:
- Service worker uses **network-first** for `/pkg/` so bundles stay in sync with SSR HTML.
  - File: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/rust/static/sw.js`
  - Server also sets `Cache-Control: no-cache` for `/sw.js` and `/pkg/*` to avoid HTTP-cache interference.
    - File: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/rust/crates/dmb_server/src/main.rs`

Recovery (when you hit this in a real browser profile):
0. In-app first (less destructive):
   - Open the PWA Status panel -> "SW details" -> "Cleanup legacy caches"
   - Click "Check for updates" and use "Reload" if an update is ready
1. Chrome DevTools -> Application -> Service Workers: click "Unregister" for the app.
2. Chrome DevTools -> Application -> Storage: click "Clear site data".
3. Hard reload the page.

## Scraper Hardening Note (Review Finding Context)
- `rust/crates/dmb_pipeline/src/scrape.rs` now has `cfg_attr(not(test), deny(clippy::unwrap_used, clippy::expect_used))` so unwrap/expect regressions in runtime scraper code are caught by `xtask verify`.

## Key Commands
Rust server:
- `cd rust && cargo run -p dmb_server`

Rebuild hydration bundle:
- `cd rust/crates/dmb_app && wasm-pack build --target web --release --out-dir ../../static/pkg --out-name dmb_app -- --features hydrate`

Rust gate:
- `cd rust && cargo run -p xtask -- verify`

Rust data release/parity:
- `cd rust && cargo run -p xtask -- data-release --sqlite data/dmb-almanac.db`

Cutover rehearsal (Rust gates + Rust E2E subset):
- `cd /Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac && bash scripts/cutover-rehearsal.sh`

## Fast QA Checks (Rust App)
Browser-level guardrails (server must be running on `http://127.0.0.1:3000`):
- `cd app && RUST_E2E=1 BASE_URL=http://127.0.0.1:3000 pnpm exec playwright test tests/e2e/rust-runtime.spec.js --project chromium --workers 1`
- `cd app && RUST_E2E=1 BASE_URL=http://127.0.0.1:3000 pnpm exec playwright test tests/e2e/rust-offline.spec.js --project chromium --workers 1`
- `cd app && RUST_E2E=1 BASE_URL=http://127.0.0.1:3000 pnpm exec playwright test tests/e2e/rust-search.spec.js --project chromium --workers 1`
- `cd app && RUST_E2E=1 BASE_URL=http://127.0.0.1:3000 pnpm exec playwright test tests/e2e/rust-legacy-migration.spec.js --project chromium --workers 1`
- `cd app && RUST_E2E=1 BASE_URL=http://127.0.0.1:3000 pnpm exec playwright test tests/e2e/rust-legacy-cache-cleanup.spec.js --project chromium --workers 1`

## Data/DB Foot-Guns
The Rust server uses SQLite read-only and will fall back to the legacy DB if the Rust DB is missing:
- Preferred: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/rust/data/dmb-almanac.db`
- Fallback: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/app/data/dmb-almanac.db`
If "parity looks wrong", confirm which DB got opened (server logs show the path).

## Old App (What To Do When Ready)
Legacy app dev server:
- `cd app && pnpm dev` (defaults to `http://localhost:5173`)

Cutover approach (high level):
- Run Rust app in parallel first (subdomain is safest to avoid SW scope conflicts).
- Validate:
  - Route parity (`rust/crates/dmb_app/tests/route_parity.rs`)
  - PWA install/offline/update flow in a clean profile
  - IndexedDB migration behavior in a real profile with existing offline data
- Only then flip traffic.
- Keep old app available for rollback during at least one SW update cycle.

## Next 10 Tasks (Pragmatic Order)
1. Run `xtask data-release` (no `--skip-parity`) and fix strict parity issues.
2. Confirm parity/integrity refresh behavior after offline import completes (UI should refresh parity).
3. Add an E2E test for the SW update UX path (updatefound -> waiting -> “Reload”).
4. Validate legacy IndexedDB migration in a real Chrome profile with existing offline data.
5. Confirm `/api/data-parity` and any “export parity report” UI is correct and stable.
6. Confirm COOP/COEP headers are present in the deployment environment (crossOriginIsolated stays true).
7. Add CI step for `xtask verify` (WASM build included) plus a small Rust E2E subset.
8. Stage deploy Rust app (subdomain strongly preferred to avoid SW scope conflicts).
9. Prepare explicit cutover + rollback checklist (including SW unregistration + cache clear guidance).
10. Decide what to do with the old app:
    - keep `app/` as read-only rollback + Playwright harness, or
    - move it to `legacy/` after cutover and disable its SW updates permanently.

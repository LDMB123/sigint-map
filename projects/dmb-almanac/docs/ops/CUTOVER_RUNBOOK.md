# Cutover Runbook (Legacy `app/` -> Rust `rust/`)

Repo: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac`

Goal: Transition production traffic from the legacy SvelteKit app (`app/`) to the Rust Leptos SSR + WASM hydrate PWA (`rust/`) without losing offline data or bricking clients via stale service worker caches.

This runbook assumes:
- Rust app is served from `rust/crates/dmb_server`.
- Legacy app remains in `app/` and also contains the Playwright E2E harness.

## Definitions
- New app: Rust Leptos SSR + WASM hydrate PWA in `rust/`.
- Old app: legacy SvelteKit app in `app/`.
- Legacy IDB: IndexedDB created by the old app (Dexie).
- Rust IDB: IndexedDB created by the Rust app.

## Cutover Preconditions (Hard Gates)
Run these locally and in CI for the commit you intend to deploy.

Fast path (recommended):
- `cd /Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac && bash scripts/cutover-rehearsal.sh`

1. Rust compile and test gate:
   - `cd rust && cargo run -p xtask -- verify`
2. Data release + strict SQLite parity gate:
   - `cd rust && cargo run -p xtask -- data-release --sqlite data/dmb-almanac.db`
3. Route parity gate (Rust router covers legacy routes):
   - `cd rust && cargo test -p dmb_app --test route_parity`
4. Rust E2E suite (against a running Rust server):
   - Start server: `cd rust && cargo run -p dmb_server`
   - Run E2E: `cd app && RUST_E2E=1 BASE_URL=http://127.0.0.1:3000 npm run test:e2e -- tests/e2e/rust-runtime.spec.js tests/e2e/rust-offline.spec.js tests/e2e/rust-search.spec.js tests/e2e/rust-legacy-migration.spec.js tests/e2e/rust-legacy-cache-cleanup.spec.js tests/e2e/rust-sw-update.spec.js --project=chromium --workers=1`

If any gate fails, do not cut over.

## Staging Deployment Strategy (Recommended)
Use a subdomain for staging and initial production rollout.

1. Deploy Rust app to `rust.<your-domain>` (or similar).
2. Verify service worker scope:
   - The Rust SW should control only the Rust origin.
   - Avoid putting Rust under the legacy domain root until you have a firm plan for existing legacy SW clients.
3. Validate client behavior in a clean browser profile:
   - Install PWA.
   - Go offline and reload core pages (shows, songs, venues, search).
   - Trigger SW update flow and confirm UI offers Reload and version changes.
4. Validate in a real profile with legacy offline data:
   - Open Rust app.
   - Confirm legacy IndexedDB migration completes.
   - Confirm counts match and legacy DB is deleted only when verified.

## Production Cutover Plan (Phased)
Do not attempt a one-shot flip unless you have a rollback window.

1. Freeze the legacy app (operationally):
   - Stop deploying changes that mutate caching, SW, or data schema.
   - Keep it stable for rollback.
2. Deploy Rust app behind a small percentage of traffic:
   - Prefer a CDN or reverse-proxy split.
3. Observe for at least one full service worker update cycle:
   - New install, update available, update applied, reload success.
4. Ramp to 100%.

## What To Do With The Old App
Keep `app/` initially, but treat it as legacy.

1. Keep `app/` for:
   - Playwright E2E harness.
   - Route parity fixture source (`rust/crates/dmb_app/tests/route_parity.rs` reads `app/src/routes`).
   - Rollback deploy for a defined window.
2. After stable cutover:
   - Disable legacy service worker updates.
   - Remove legacy cache priming and any aggressive precaching.
   - Optionally move `app/` to `legacy/` and update paths in:
     - `rust/crates/dmb_app/tests/route_parity.rs`
     - any docs referencing `app/`
3. Preserve legacy SQLite and exported bundles:
   - Keep `app/data/dmb-almanac.db` as an audit artifact.
   - Keep a tagged release or archive for the legacy build for forensic debugging.

## Known Foot-Guns (Preventable Failures)
1. Service worker scope conflict:
   - If both apps run under the same origin and both try to control `/`, clients can get stuck on stale bundles.
   - Subdomain rollout avoids this.
2. SQLite fallback confusion:
   - Rust server will fall back to `app/data/dmb-almanac.db` if the Rust DB is missing.
   - Always confirm which DB file opened via server logs.
3. Silent data mismatch:
   - Use strict parity gate and keep the parity report export available.
4. Legacy offline data loss:
   - Treat legacy IDB migration as a go/no-go for decommissioning.
   - Do not delete legacy IDB unless verified counts match.

## Post-Cutover Checklist
1. Confirm PWA Status panel:
   - Online/offline state is accurate.
   - Integrity/parity signals do not show mismatches.
   - Export parity report works.
2. Confirm SW update UX:
   - "Update ready" appears when expected.
   - Reload updates controller script URL.
3. Confirm offline:
   - Offline navigation works for core pages.
   - Search remains functional offline to expected degree.

## Where CI Enforces This
- Rust-only gates live in `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/.github/workflows/rust-ci.yml`.
- App-only gates (legacy) live in `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/.github/workflows/ci.yml`.

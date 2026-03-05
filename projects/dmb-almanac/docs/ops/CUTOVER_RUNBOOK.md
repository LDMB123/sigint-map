# Cutover Runbook (Rust-First Offline PWA)

Repo: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac`

Goal: Transition to the Rust Leptos SSR + WASM hydrate PWA (`rust/`) without losing offline data or bricking clients via stale service worker caches.

This runbook assumes:
- Rust app is served from `rust/crates/dmb_server`.
- Rust-only Playwright E2E harness lives in `e2e/`.

## Definitions
- New app: Rust Leptos SSR + WASM hydrate PWA in `rust/`.
- Prior data: IndexedDB + CacheStorage created by earlier local prototypes (Dexie + JS service worker).
- Rust IDB: IndexedDB created by the Rust app.

## Cutover Preconditions (Hard Gates)
Run these locally and in CI for the commit you intend to deploy.

Fast path (recommended):
- `cd /Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac && bash scripts/cutover-rehearsal.sh`

1. Rust compile and test gate:
   - `cd rust && cargo run -p xtask -- verify`
2. Data release + strict SQLite parity gate:
   - `cd rust && cargo run -p xtask -- data-release --sqlite data/dmb-almanac.db`
3. Route parity gate (Rust router covers previously-supported routes):
   - `cd rust && cargo test -p dmb_app --test route_parity`
   - Note: parity compares against `rust/crates/dmb_app/tests/fixtures/routes_fixture.json` (a checked-in snapshot from a prior router).
4. Rust E2E suite (against a running Rust server):
   - Build hydrate package: `cd rust && cargo run -p xtask -- build-hydrate-pkg`
   - Start server: `cd rust && cargo run -p dmb_server`
   - Run E2E: `cd e2e && BASE_URL=http://127.0.0.1:3000 npm run test:e2e -- tests/e2e/rust-runtime.spec.js tests/e2e/rust-offline.spec.js tests/e2e/rust-import-completes.spec.js tests/e2e/rust-search.spec.js tests/e2e/rust-previous-idb-migration.spec.js tests/e2e/rust-previous-cache-cleanup.spec.js tests/e2e/rust-sw-update.spec.js --project=chromium --workers=1`

If any gate fails, do not cut over.

### Server Bind Overrides (Staging/CI Friendly)
`dmb_server` binds to the Leptos `site_addr` by default, but can be overridden for staging/CI and to avoid port collisions:
- Set `DMB_SITE_ADDR` to a full socket address like `127.0.0.1:4000` or `[::1]:4000`
- Or set `PORT` (or `DMB_PORT`) to override only the port while keeping the default IP

## Remote/Staging E2E (Against An Existing Origin)
When you have a staging/prod Rust server already running (separate origin strongly recommended), run:
- `cd /Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac && BASE_URL=https://staging.example.com bash scripts/cutover-remote-e2e.sh`

This validates:
- Prior IndexedDB migration (Dexie -> Rust IDB)
- Prior CacheStorage cleanup (old SW caches -> Rust caches)
- SW update flow and update-loop resistance (multi-deploy test)
It does NOT currently gate on full offline seed import completion; that gate is part of `scripts/cutover-rehearsal.sh` via `e2e/tests/e2e/rust-import-completes.spec.js`.

### Local-Only “Staging Origin” (Different Port)
For local-only cutover rehearsal without DNS/subdomains, simulate a separate origin by using a different port:
- `cd /Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac && BASE_URL=http://127.0.0.1:3100 bash scripts/cutover-rehearsal.sh`

CI option (manual trigger):
- GitHub Actions workflow: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/.github/workflows/cutover-remote-e2e.yml`
- Provide `base_url` input pointing at your staging origin.

## Staging Deployment Strategy (Recommended)
Use a subdomain for staging and initial production rollout.

1. Deploy Rust app to `rust.<your-domain>` (or similar).
2. Verify service worker scope:
   - The Rust SW should control only the Rust origin.
   - Avoid putting Rust under the previous app’s domain root until you have a firm plan for existing SW clients.
3. Do not “previous-first then Rust” on the same origin without a rollback-safe SW plan:
   - Same-origin cutover can create SW scope collisions (both apps try to control `/`).
   - If you must do it, use a dedicated cutover window and validate upgrade paths in real user profiles first.
   - Staging recommendation: use a dedicated same-origin staging host (for example `staging.<domain>`) where you can:
     - first deploy the previous app to install its SW + seed prior IDB/cache state
     - then deploy Rust to the same host and validate upgrade behavior end-to-end
4. Validate client behavior in a clean browser profile:
   - Install PWA.
   - Go offline and reload core pages (shows, songs, venues, search).
   - Trigger SW update flow and confirm UI offers Reload and version changes.
5. Validate in a real profile with prior offline data:
   - Open Rust app.
   - Confirm prior IndexedDB migration completes.
   - Confirm counts match and the old DB is deleted only when verified.

## Production Cutover Plan (Phased)
Do not attempt a one-shot flip unless you have a rollback window.

1. Freeze SW/caching/schema changes during cutover:
   - Stop deploying changes that mutate caching behavior, SW update semantics, or IndexedDB schema.
2. Deploy Rust app behind a small percentage of traffic:
   - Prefer a CDN or reverse-proxy split.
3. Observe for at least one full service worker update cycle:
   - New install, update available, update applied, reload success.
4. Ramp to 100%.

## What To Do With The Old App
The old UI code is intentionally not part of this repo. If you need forensics, use git history/tags in a separate checkout so the mainline stays Rust-first.

## Known Foot-Guns (Preventable Failures)
1. Service worker scope conflict:
   - If both apps run under the same origin and both try to control `/`, clients can get stuck on stale bundles.
   - Subdomain rollout avoids this.
2. SQLite fallback confusion:
   - Ensure `DMB_SQLITE_PATH` points at the intended SQLite file.
   - Default local choices are `rust/data/dmb-almanac.db` (when launched from `rust/`) or `data/dmb-almanac.db` (repo root).
   - The server also includes parent-relative fallback candidates for compatibility when launched from nested paths.
   - Confirm which DB was opened via server logs.
3. Silent data mismatch:
   - Use strict parity gate and keep the parity report export available.
4. Previous-version offline data loss:
   - Treat prior IDB migration as a go/no-go for decommissioning.
   - Do not delete the old IDB unless verified counts match.

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
- Cutover rehearsal gate lives in `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/.github/workflows/cutover-rehearsal.yml`.

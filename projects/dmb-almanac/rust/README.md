# DMB Almanac (Rust Workspace)

## Overview
This workspace contains the Rust-first rebuild of the DMB Almanac PWA, including SSR, WASM hydration, offline data pipeline, and AI/ANN tooling.

## Release Checklist
1. Scrape and validate data: `cargo run -p dmb_pipeline -- scrape --warnings-output data/warnings.json --warnings-max 0`
2. Validate warning budgets and endpoint retries: `cargo run -p dmb_pipeline -- validate`
3. Build SQLite DB: `cargo run -p dmb_pipeline -- build-db`
4. Export JSON bundles: `cargo run -p dmb_pipeline -- export-json`
5. Build embedding inputs and ANN index if enabled: `cargo run -p dmb_pipeline -- build-embedding-input` then `cargo run -p dmb_pipeline -- ann-index --input-dir static/data --output static/data/ann-index.json`
6. Build AI config: `cargo run -p dmb_pipeline -- build-ai-config --output-dir static/data`
7. Build data manifest: `cargo run -p dmb_pipeline -- build-data-manifest`
8. Run Rust tests: `cargo test -p dmb_app -p dmb_server -p dmb_pipeline -p dmb_core`
9. Run clippy: `cargo clippy -p dmb_core -p dmb_pipeline -p dmb_server --all-targets -D warnings` and `cargo clippy -p dmb_app --features ssr --all-targets -D warnings`
10. Run E2E (Playwright): `cd ../e2e && npm ci && BASE_URL=http://127.0.0.1:3000 npm run test:e2e -- --project=chromium --workers=1`
11. Verify PWA installability and offline flows in Chrome 143 (macOS 26.2): install, offline navigation, share-target
12. Verify AI diagnostics: WebGPU enabled status, ANN cap diagnostics, storage pressure handling
13. Deploy and smoke test `/`, `/search`, `/shows/:id`, `/offline`

## Cutover Readiness Checklist
1. Rust pipeline artifacts present in `static/data/`:
   - `manifest.json`
   - `ai-config.json`
   - `idb-migration-dry-run.json`
2. Server smoke endpoints:
   - `/api/health` returns schema `version`
   - `/api/ai-health` returns `status: ok` and shows static artifacts present
   - `/api/data-parity` returns `available: true` when SQLite is mounted
3. In-app parity signals:
   - `/ai-diagnostics` shows `IDB integrity: ok` and `SQLite parity: ok` (or `unavailable` when SQLite is not mounted)
   - PWA Status panel shows no mismatches and can export `dmb-parity-report.json`
4. Service worker update UX:
   - Update prompt appears when a new SW is available
   - Manual "check update" reports "no update found" when current
5. Offline-first flows:
   - Install PWA
   - Go offline
   - Navigate across key routes (home, search, show detail)
6. Previous-version cutover gate:
   - Route parity confirmed for top traffic pages
   - If migrating prior IndexedDB, first-run migration completes and counts match (no mismatches in parity UI)

## Notes
- Storage pressure threshold and integrity checks surface in the PWA status panel.
- WebGPU can be toggled in AI Diagnostics for testing fallback paths.

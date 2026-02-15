# Blaire's Kind Heart

Offline-first kindness PWA for a young child, built with Rust/WASM plus browser-native PWA features.

Target platform: iPad mini 6 (A15, 4GB RAM), iPadOS 26.2, Safari 26.2.

## Start Here
- Fast takeover runbook: `docs/HANDOFF.md`
- Project standing: `docs/PROJECT_STANDING.md`
- Latest verified checks: `docs/APP_STATUS.md`
- Command-by-command evidence: `docs/STATUS_LEDGER.md`
- Full documentation map: `docs/INDEX.md`

## Current Standing (verified on 2026-02-15)
- PWA contract check: PASS (`npm run qa:pwa-contract`)
- Runtime diagnostics check: PASS (`npm run qa:runtime`)
- DB contract check: PASS (`npm run qa:db-contract`)
- Core E2E suite: PASS (`npm run test:e2e` -> `39 passed`, `1 skipped`)
- Full E2E suite: PASS (`npm run test:e2e:all` -> `40 passed`, `1 skipped`)
- Docs link gate: PASS (`npm run qa:docs-links`)
- Rust warning drift gate: PASS (`npm run qa:rust-warning-drift`, baseline=`4`)
- Docs token budget check: PASS (`npm run qa:docs-budget`)
- Token baseline currently within target (`active_est_tokens=24465`)
- Xcode iPad simulator regression evidence captured; physical iPad mini 6 rerun still pending for this cycle

## Quick Commands
```bash
# Cleanup generated outputs and Rust cache
npm run clean

# One-time browser install for Playwright suites
npx playwright install chromium webkit

# Dev
trunk serve

# Release
trunk build --release

# Health and contracts
npm run qa:pwa-contract
npm run qa:runtime
npm run qa:db-contract

# Full E2E gate
npm run test:e2e:all

# Doc/token footprint
npm run token:baseline
npm run qa:docs-budget
```

## Repository Layout
- `rust/` core application runtime
- `public/` service worker, worker scripts, runtime diagnostics, static assets
- `src/styles/` panel and theme stylesheets
- `e2e/` Playwright tests + visual snapshots
- `scripts/` quality, build, and audit automation
- `docs/` active documentation
- `docs/archive/` historical/low-frequency documentation and artifacts

Last updated: 2026-02-15

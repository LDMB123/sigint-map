# Testing Guide (Operational Summary)

Last updated: 2026-03-03
Full reference: `docs/archive/reference-full/TESTING.full.md`
Historical test reports index: `docs/testing/README.md`

## Core Gates
Run these before release-impacting changes:

```bash
# One-time setup on a new machine
npx playwright install chromium webkit

# Core QA gates
npm run qa:pwa-contract
npm run qa:runtime
npm run qa:db-contract
npm run test:e2e:all

# WASM unit tests (runs in wasm-bindgen test runner)
cargo test --target wasm32-unknown-unknown

# Release verification (symbolized build + source maps)
npm run build:verify:release
```

## Device-Specific Validation
- Required target: iPad mini 6 on iPadOS 26.2 Safari 26.2.
- Template: `docs/IPAD_REGRESSION_TEMPLATE.md` — copy as `IPAD_REGRESSION_RUN_<date>.md` for each run.

## High-Risk Areas to Recheck
- Reflection flow timing and dismissal behavior.
- Emotion selection persistence.
- Offline queue correctness and DB integrity.
- Service worker behavior and offline navigation.
- Visual regressions on key panels (re-run after CSS changes; snapshots updated 2026-02-28).
- WASM loader and init path (`wasm-init.js`) after bindgen target or CSP/Trusted Types changes.

## Minimum Release Evidence
1. Latest PASS outputs in `docs/STATUS_LEDGER.md`.
2. Physical iPad run status noted in `docs/STATUS_LEDGER.md` (Outstanding Release Task section).
3. No unexplained new warnings in release/test logs.

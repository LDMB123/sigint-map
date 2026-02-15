# Testing Guide (Operational Summary)

Last updated: 2026-02-15
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
```

## Device-Specific Validation
- Required target: iPad mini 6 on iPadOS 26.2 Safari 26.2.
- Keep physical-device run records in dated files under `docs/` using the `IPAD_REGRESSION_RUN_<date>.md` naming pattern.

## High-Risk Areas to Recheck
- Reflection flow timing and dismissal behavior.
- Emotion selection persistence.
- Offline queue correctness and DB integrity.
- Service worker behavior and offline navigation.
- Visual regressions on key panels.

## Minimum Release Evidence
1. Latest PASS outputs in `docs/STATUS_LEDGER.md`.
2. Physical iPad run status noted in `docs/APP_STATUS.md`.
3. No unexplained new warnings in release/test logs.

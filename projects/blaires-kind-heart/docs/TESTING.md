# Testing Guide (Operational Summary)

Last updated: 2026-03-04
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
npm run qa:critical-token-sync
npm run qa:generated-sync
npm run qa:taxonomy-contract
npm run qa:e2e-skip-waivers
npm run qa:rc-gates
npm run qa:phase5-kpi
npm run qa:phase5-kpi:baseline
npm run qa:ipad-performance-budget
npm run qa:index-shell-config
npm run qa:index-shell-contract
npm run qa:index-shell-deep
npm run test:e2e:webkit
npm run test:e2e:all

# Fast compile safety check for wasm target
cargo check --target wasm32-unknown-unknown

# WASM unit tests (runs in wasm-bindgen test runner)
cargo test --target wasm32-unknown-unknown

# Release verification (symbolized build + source maps)
npm run build:verify:release

# Optional: include product KPI if you have a Mom JSON export snapshot
node scripts/checks/phase5-kpi-report.mjs --snapshot <path-to-export.json>
```

## Device-Specific Validation
- Required target: iPad mini 6 on iPadOS 26.2 Safari 26.2.
- Template: `docs/IPAD_REGRESSION_TEMPLATE.md` — copy as `IPAD_REGRESSION_RUN_<date>.md` for each run.
- Automated iPad-profile performance proxy gate: `npm run qa:ipad-performance-budget` (uses `config/ipad-performance-budget.json`).
- Release evidence pack: `docs/testing/release-evidence/` (manifest + run docs + waivers).

## Release Go/No-Go (Canonical Sequence)

1. `npm run qa:rc-gates`
2. `npm run build:verify:release`
3. `npm run qa:release-evidence`
4. Release-tag workflow `.github/workflows/release-readiness.yml` must pass on `v*`.

## High-Risk Areas to Recheck
- Reflection flow timing and dismissal behavior.
- Emotion selection persistence.
- Offline queue correctness and DB integrity.
- Service worker behavior and offline navigation.
- Visual regressions on key panels (re-run after CSS changes; snapshots updated 2026-02-28).
- WASM loader and init path (`wasm-init.js`) after bindgen target or CSP/Trusted Types changes.
- iPad mini 6 particle path behavior (sparkle/rotation-disabled low-power mode still renders confetti bursts correctly).
- Hidden-tab power behavior (Memory/Hug/Catcher state should not advance while document is hidden).

## Minimum Release Evidence
1. `docs/testing/release-evidence/manifest.json` validates against schema.
2. Two physical iPad runs (`rc3_run_01`, `rc4_run_02`) are `PASS` with `p0_open=0` and `p1_open=0`.
3. If `db_reduction_status=FAIL`, waiver `phase5-db-reduction-rc4` is `APPROVED` and unexpired.
4. Release-tag workflow pass is required.

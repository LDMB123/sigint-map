# Project Standing

Last updated: 2026-02-15

## What This Repo Is
`blaires-kind-heart` is an offline-first Rust/WASM PWA with:
- A child-focused kindness UI and mini-games.
- Service worker + offline shell behavior.
- Browser-side persistence and diagnostics contracts.
- Playwright-based quality gates (runtime, DB, a11y, visual, smoke).

## Where It Stands Right Now

### Verified on 2026-02-15
- `node --check public/runtime-diagnostics.js`: PASS
- `node --check public/db-worker.js`: PASS
- `npm run qa:pwa-contract`: PASS (`ok: true`, managed server mode)
- `npm run qa:runtime`: PASS (`1 passed`)
- `npm run qa:db-contract`: PASS (`2 passed`)
- `npm run test:e2e`: PASS (`39 passed`, `1 skipped`)
- `npm run test:e2e:all`: PASS (`40 passed`, `1 skipped`)
- `npm run qa:docs-links`: PASS
- `npm run qa:rust-warning-drift`: PASS (`warning_count=3`, `baseline=3`, improved from previous `4`)
- `npm run test:e2e:webkit`: PASS (`1 passed`)
- `npx playwright install webkit`: PASS (local WebKit runtime installed for cross-browser gate)
- `npm run token:baseline`: PASS (`active_est_tokens=24465`)
- `npm run qa:docs-budget`: PASS (`budget=25000`)
- Xcode iPad simulator regression capture: PASS (`home/stories/tracker` panels captured)

### Current Risk Snapshot
1. Physical iPad mini 6 regression has not been re-run for this exact verification cycle (simulator run complete).
2. Rust compile emits 3 dead-code warnings during QA runs (debug utilities preserved with `#[allow(dead_code)]`).

### Immediate Priorities
1. Run and record a physical-device iPad regression cycle.
2. Keep active docs under the 25k budget gate as docs evolve.
3. Keep dead-code warnings from drifting upward (baseline enforced at 3 warnings).

## Repository Reorganization Performed
- Moved root screenshot files into `docs/archive/assets/root-screenshots/`.
- Removed duplicated active docs that already existed in archive:
  - Removed duplicate active testing docs (archived copies retained under `docs/archive/testing/`).
  - Removed duplicate active report copy (archived canonical copy at `docs/archive/reports/safari-26.2-simplification-deep-dive.md`).
- Added shared ignore rules for local/generated outputs in `.gitignore`.

## Canonical Documentation Flow
1. `docs/PROJECT_STANDING.md` (this file): high-level project state.
2. `docs/APP_STATUS.md`: latest gate snapshot and operational status.
3. `docs/STATUS_LEDGER.md`: command evidence and dated changes.
4. `docs/INDEX.md`: active vs archived document map.

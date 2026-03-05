# Rust PWA Optimization Report

## Scope
- Objective: improve first-import interaction responsiveness and reduce base hydration payload size.
- Source of truth: `/Users/louisherman/Downloads/DMBAlmanacRust1.md`.

## Baseline (Before This Pass)
- Date: 2026-03-04
- `dmb_app_bg.wasm` raw: 3,038,065 bytes
- `dmb_app_bg.wasm` gzip: 1,023,156 bytes
- Import duration (cold, local): ~53s with tuning off and on (no meaningful delta)

## Commands
- Import perf sample (3 runs each, tuning off/on):
  - `node scripts/rust-import-perf.mjs --base-url http://127.0.0.1:3000 --runs 3 --out-json docs/wasm/rust-import-perf.json`
- WASM size gate (10% gzip reduction target):
  - `bash scripts/check-wasm-size.sh --baseline-gzip 1023156`

## Post-Change Results
- Date: 2026-03-04
- `dmb_app_bg.wasm` raw: 2,549,868 bytes
- `dmb_app_bg.wasm` gzip: 872,368 bytes
- Import perf report: `docs/wasm/rust-import-perf.json`
- Import timing (3 cold runs each):
  - Tuning `false`: avg duration 53,441.0 ms; p75 duration 54,294.0 ms; avg p75 interaction 16.0 ms; avg long-frame count 0.0
  - Tuning `true`: avg duration 56,420.7 ms; p75 duration 57,058.0 ms; avg p75 interaction 16.0 ms; avg long-frame count 0.0
- Derived deltas:
  - Interaction p75 improvement: 0.0% (not improved)
  - Long-frame reduction: not computable from baseline=0 (no observed long frames in either bucket)
  - WASM gzip reduction: 14.74% (pass)

## Rust-Only Transition Progress

- App bootstrap ownership moved to Rust hydrate:
  - service worker registration now initiated from Rust.
  - WebGPU helper preload now initiated from Rust.
- AI runtime interop consolidation:
  - app-level AI module (`dmb_app::ai`) now calls Rust wrappers in `dmb_wasm` for probe/warm/limits/score paths.
  - browser JS interop boundary centralized in `rust/crates/dmb_wasm/src/webgpu.rs`.

## Acceptance Gate Tracking
- [ ] p75 interaction duration during first-import improved by >=25% (current: 0.0%)
- [ ] long animation frame count during import reduced by >=40% (baseline long-frame count is 0.0)
- [x] `dmb_app_bg.wasm` gzip improved by >=10% (current: 14.75%)
- [x] offline/update/repair E2E suites remain green (`rust-offline`, `rust-sw-update`, `rust-idb-repair`, `rust-import-completes`)
- [ ] setlist chunk max file size remains <2MB (not verifiable in this workspace snapshot; no `setlists*.json` files present under `rust/static/data`)

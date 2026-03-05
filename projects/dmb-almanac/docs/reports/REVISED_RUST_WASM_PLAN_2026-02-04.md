# Revised Plan — Rust/WASM-First Runtime (Current)

## Summary

- Keep Rust Leptos SSR + WASM hydration as the only active app path.
- Keep canonical data in `data/static-data/`, mirrored to `rust/static/data/` for serving.
- Keep IndexedDB (`dmb_idb`) as the offline primary store.
- Keep AI retrieval available when WebGPU/worker acceleration degrades.
- Keep route parity, PWA update behavior, and data parity as release gates.

## Current Architecture Decisions

- **App runtime**: `rust/crates/dmb_app`
- **Server/runtime API**: `rust/crates/dmb_server`
- **Offline DB layer**: `rust/crates/dmb_idb`
- **Pipeline/export layer**: `rust/crates/dmb_pipeline`
- **WASM compute layer**: `rust/crates/dmb_wasm`
- **Static payloads**: `rust/static/data/`

## Phase Status

### Phase 0 - Governance and Baselines (Complete)

- Rust-first scope locked.
- Canonical runbooks established (`docs/ops/CUTOVER_RUNBOOK.md`, `docs/ops/ROLLBACK_RUNBOOK.md`).
- Baseline quality gates in place (`scripts/cutover-rehearsal.sh`, `scripts/pristine-check.sh`).

### Phase 1 - Data Plane Consolidation (Complete)

- Canonical checked-in data corpus consolidated under `data/static-data/`.
- Runtime mirror and manifest generation flow stabilized in `dmb_pipeline`.
- Strict manifest + parity validation integrated into release scripts.

### Phase 2 - WASM Runtime Hardening (Complete)

- Hydration build flow stabilized via `cargo run -p xtask -- build-hydrate-pkg`.
- Browser interop wrappers centralized under `rust/crates/dmb_app/src/browser/`.
- Rust-only route rendering and smoke checks added for SSR/hydration stability.

### Phase 3 - PWA and Update Safety (Complete)

- Service worker update UX and stale-cache controls are tested in Rust E2E.
- Prior cache cleanup and prior IndexedDB migration gates are codified.
- Offline import and core route offline behavior are part of cutover rehearsal.

### Phase 4 - AI Runtime Guardrails (In Progress, Gated)

- AI diagnostics routes and controls are live in full diagnostics builds.
- Worker cooldown and degraded WebGPU paths are release-window tested.
- Fallback behavior remains available when GPU/worker paths are unavailable.

## Non-Negotiable Gates

- `bash scripts/pristine-check.sh`
- `bash scripts/cutover-rehearsal.sh`
- `cargo run -p xtask -- verify` (from `rust/`)
- AI degradation gate for diagnostics builds:
  - `RUST_E2E=1 RUST_AI_DIAGNOSTICS_FULL=1 BASE_URL=http://127.0.0.1:3000 npx playwright test tests/e2e/rust-ai-degradation.spec.js --project=chromium --workers=1` (from `e2e/`)

## Remaining Work

1. Keep browser interop wrappers centralized and remove any direct ad-hoc window/reflect calls from feature modules.
2. Continue reducing stale historical documentation in non-archived report paths.
3. Keep parity and degradation reports current for each release window.

## Acceptance Criteria

- Rust workspace checks are green (`fmt`, `clippy`, targeted `check`, targeted `test`).
- Cutover rehearsal gate is green.
- AI degradation diagnostics gate is green when diagnostics are enabled.
- No route parity or PWA update regressions in the current release candidate.

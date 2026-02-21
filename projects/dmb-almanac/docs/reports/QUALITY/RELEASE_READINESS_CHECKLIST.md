# Release Readiness Checklist (Rust App)

Date: 2026-02-21  
Repo: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac`

This checklist is the Phase 5 quality gate for release decisions.

## Quality Gates

- [x] Formatting gate passes (`cargo fmt --all -- --check`).
- [x] Lint gate passes (`cargo clippy --workspace --all-targets -- -D warnings`).
- [x] Workspace compile/test baseline passes.
- [x] Route parity gate passes (`rust/crates/dmb_app/tests/route_parity.rs`).
- [x] Route render smoke gate passes (`rust/crates/dmb_app/tests/route_render.rs`).
- [x] Route full-path smoke gate passes (`rust/crates/dmb_app/tests/route_smoke.rs`).
- [x] Accessibility baseline automation passes (`rust/crates/dmb_app/tests/a11y_routes.rs`).
- [x] Core parity assertions pass (`cargo test -p dmb_core parity`).
- [x] Server API regression suite passes (`cargo test -p dmb_server`).

## Regression Scenarios

- [x] Empty dataset handling covered by deterministic normalization/unit tests in
  `rust/crates/dmb_app/src/pages.rs`.
- [x] Server parity and availability edge cases are covered in
  `rust/crates/dmb_server/src/main.rs`:
  - sqlite-unavailable responses stay deterministic,
  - partial-schema responses report missing tables,
  - stale parity cache entries are ignored.
- [x] PWA update edge-state behavior covered by tests in
  `rust/crates/dmb_app/src/components/pwa_status.rs`
  (snooze window, clock skew, parser reliability).
- [x] Offline no-network behavior validated by Rust E2E (`tests/e2e/rust-offline.spec.js`)
  via `bash scripts/cutover-rehearsal.sh` on 2026-02-21.
- [x] AI timeout/degradation release-window check completed via Rust E2E
  (`e2e/tests/e2e/rust-ai-degradation.spec.js`) on 2026-02-21.

## UX and Content

- [x] No known placeholder copy remains in route surfaces.
- [x] Error and empty-state messaging exists for AI and support flows.
- [x] 404 route includes recovery actions.

## CI Policy

- [x] CI workflow includes explicit format + route parity/render/a11y smoke steps:
  - `.github/workflows/rust-ci.yml`
- [x] CI enforces clippy warnings as errors.
- [x] CI includes explicit Phase 5 regression gates for parity and server payload/cache validation.

## Sign-off

- [ ] Engineering sign-off
- [ ] QA sign-off
- [ ] Release owner sign-off

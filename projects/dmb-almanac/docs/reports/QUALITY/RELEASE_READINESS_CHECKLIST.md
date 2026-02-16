# Release Readiness Checklist (Rust App)

Date: 2026-02-15  
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
- [x] Server payload validation regressions pass (`cargo test -p dmb_server rejects_` and `cargo test -p dmb_server csp_report_requires_report_object`).

## Regression Scenarios

- [x] Empty dataset handling covered by deterministic normalization/unit tests in
  `rust/crates/dmb_app/src/pages.rs`.
- [x] Corrupted input handling covered by server validation tests in
  `rust/crates/dmb_server/src/main.rs`:
  - non-object payload rejection,
  - missing event key rejection,
  - missing CSP report object rejection,
  - oversized payload rejection.
- [x] Stale cache fallback covered by `data_parity_ignores_stale_cache_entries`
  in `rust/crates/dmb_server/src/main.rs`.
- [x] PWA update edge-state behavior covered by tests in
  `rust/crates/dmb_app/src/components/pwa_status.rs`
  (snooze window, clock skew, parser reliability).
- [ ] Offline no-network manual spot-check completed for this release window
  (use `docs/ops/A11Y_KEYBOARD_SPOTCHECK_RUNBOOK.md` and generated report).
- [ ] AI timeout/degradation manual pass completed on target runtime profile.

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

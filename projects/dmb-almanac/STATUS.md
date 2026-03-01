# DMB Almanac Status (Canonical)

Date: 2026-02-21
Repo: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac`

`STATUS.md` is the single source of truth for current repo state.  
`CONTEXT.md` is intentionally minimal and links here.

## Current Snapshot

- Rust-first, local-only offline PWA.
- Active branch: `main`
- Latest stabilization commit: `fef41d58` (`chore: finalize production readiness gates`)
- Primary confidence gate is green:
  - `bash scripts/cutover-rehearsal.sh`
- Remote Rust E2E gate is available:
  - `BASE_URL=http://127.0.0.1:<port> bash scripts/cutover-remote-e2e.sh`
- Legacy JS prototype UI tree is removed; active implementation is Rust workspace only.
- Latest full validation (2026-02-21) is green:
  - `cargo fmt --all --check`
  - `cargo clippy --workspace --all-targets -- -D warnings`
  - `cargo test --workspace`
  - `RUST_E2E=1 BASE_URL=http://127.0.0.1:3000 npm run test:e2e` (`23 passed`)

## Current Priorities

1. Keep cutover and pristine gates green while refining Rust-first flows.
2. Continue reducing duplicate docs/context to lower token usage per session.
3. Keep cleanup/disk-budget scripts in regular use to avoid local storage bloat.

## All-In Polish Progress (2026-02-21)

- Phase coverage advanced on route polish, UI state consistency, and server payload validation.
- New progress report:
  - `docs/reports/QUALITY/ALL_IN_POLISH_PROGRESS_2026-02-15.md`
- Key completed files this pass:
  - `rust/crates/dmb_app/src/pages.rs`
  - `rust/crates/dmb_app/tests/route_render.rs`
  - `rust/crates/dmb_app/tests/route_smoke.rs`
  - `rust/crates/dmb_app/tests/a11y_routes.rs`
  - `rust/crates/dmb_app/src/components/footer.rs`
  - `rust/crates/dmb_app/src/components/ai_status.rs`
  - `rust/crates/dmb_app/src/components/pwa_status.rs`
  - `rust/crates/dmb_server/src/main.rs`
  - `.github/workflows/rust-ci.yml`
  - `docs/reports/QUALITY/RELEASE_READINESS_CHECKLIST.md`
  - `docs/ops/A11Y_KEYBOARD_SPOTCHECK_RUNBOOK.md`
  - `scripts/a11y-keyboard-spotcheck.sh`
  - `docs/reports/QUALITY/A11Y_KEYBOARD_SPOTCHECK_SAMPLE.md`
- Validation snapshot for this pass:
  - `cargo check --workspace` (pass)
  - `cargo clippy --workspace --all-targets -- -D warnings` (pass)
  - `cargo test -p dmb_app --features ssr` (pass)
  - `cargo test -p dmb_app --test route_render --features ssr` (pass)
  - `cargo test -p dmb_app --test route_smoke --features ssr` (pass)
  - `cargo test -p dmb_server` (pass)
- Phase 5 CI gate definitions and release checklist updates are now in place.
- Manual release-window checks still pending: offline no-network pass, AI timeout/degradation pass, and sign-offs.

## Recommended Verification

```bash
bash scripts/pristine-check.sh
bash scripts/pristine-check.sh --with-disk-budget
bash scripts/cutover-rehearsal.sh
```

## Key Paths

- App (SSR + hydrate): `rust/crates/dmb_app/`
- Server: `rust/crates/dmb_server/`
- IndexedDB: `rust/crates/dmb_idb/`
- Pipeline: `rust/crates/dmb_pipeline/`
- E2E: `e2e/`
- Scripts: `scripts/`

## Entry Points

- Docs home: `docs/README.md`
- Docs index: `docs/INDEX.md`
- Cutover runbook: `docs/ops/CUTOVER_RUNBOOK.md`
- Token workflow: `docs/guides/TOKEN_CONTEXT_WORKFLOW.md`

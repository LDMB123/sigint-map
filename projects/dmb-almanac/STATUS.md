# DMB Almanac Status (Canonical)

Date: 2026-03-05
Repo: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac`

`STATUS.md` is the single source of truth for current repo state.
`CONTEXT.md` is intentionally minimal and links here.

## Current Snapshot

- Rust-first, local-only offline PWA.
- Active implementation lives in `rust/` (`dmb_app`, `dmb_server`, `dmb_idb`, `dmb_pipeline`, `dmb_wasm`).
- Legacy JS prototype UI is removed from the active tree.
- Primary confidence gate is:
  - `bash scripts/cutover-rehearsal.sh`
- Remote Rust E2E gate is available:
  - `BASE_URL=http://127.0.0.1:<port> bash scripts/cutover-remote-e2e.sh`

## Latest Verified Checks

- Rust workspace validation completed for migration/interop wrapper work:
  - `cargo fmt --all`
  - `cargo clippy -p dmb_app --features ssr --all-targets -- -D warnings`
  - `cargo clippy -p dmb_app --features hydrate --all-targets -- -D warnings`
  - `cargo check -p dmb_wasm`
  - `cargo check -p dmb_app --features hydrate --target wasm32-unknown-unknown`
  - `cargo check -p dmb_app --features ssr`
  - `cargo check -p xtask`
  - `cargo test -p dmb_app --features ssr --lib`
  - `cargo test -p dmb_app --features hydrate --lib`
  - `cargo test -p xtask`
- Rust AI diagnostics/degradation gate re-verified (2026-03-05):
  - `RUST_E2E=1 RUST_AI_DIAGNOSTICS_FULL=1 BASE_URL=http://127.0.0.1:3000 npx playwright test tests/e2e/rust-ai-degradation.spec.js --project=chromium --workers=1` (`3 passed`)
  - `RUST_E2E=1 RUST_AI_DIAGNOSTICS_FULL=1 BASE_URL=http://127.0.0.1:3000 npx playwright test tests/e2e/rust-ai.spec.js tests/e2e/rust-ai-degradation.spec.js --project=chromium --workers=1` (`7 passed`)

## Current Priorities

1. Keep cutover and pristine gates green while refining Rust-first runtime wrappers.
2. Keep route parity, PWA update behavior, and AI degradation guardrails stable.
3. Keep docs and runbooks synchronized with actual paths/commands.

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

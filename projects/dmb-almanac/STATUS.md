# DMB Almanac Status (Canonical)

Date: 2026-02-15  
Repo: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac`

`STATUS.md` is the single source of truth for current repo state.  
`CONTEXT.md` is intentionally minimal and links here.

## Current Snapshot

- Rust-first, local-only offline PWA.
- Primary confidence gate is green:
  - `bash scripts/cutover-rehearsal.sh`
- Remote Rust E2E gate is available:
  - `BASE_URL=http://127.0.0.1:<port> bash scripts/cutover-remote-e2e.sh`
- Legacy JS prototype UI tree is removed; active implementation is Rust workspace only.

## Current Priorities

1. Keep cutover and pristine gates green while refining Rust-first flows.
2. Continue reducing duplicate docs/context to lower token usage per session.
3. Keep cleanup/disk-budget scripts in regular use to avoid local storage bloat.

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

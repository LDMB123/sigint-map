# DMB Almanac Status (Checkpoint)

Date: 2026-02-06
Repo: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac`

## Snapshot (Resume From Here)

- Rust-first, local-only offline PWA.
- Git is very dirty; avoid broad commits.
- Previous JS prototype UI tree (`app/`) is removed from this workspace; remaining cutover code is in Rust.

## What Is Green

- Cutover gate script passes:
  - `bash scripts/cutover-rehearsal.sh`
- The cutover gate includes SW-update + offline + migration E2Es (runs Playwright Rust subset).
- Remote E2E runner works against a running Rust server:
  - `BASE_URL=http://127.0.0.1:<port> bash scripts/cutover-remote-e2e.sh`
- Documentation has been updated to remove references to the removed UI tree:
  - `rg -n "\\bapp/" docs -S` is empty

## Key Paths

- App (SSR + hydrate): `rust/crates/dmb_app/`
- Server: `rust/crates/dmb_server/`
- IndexedDB schema + APIs: `rust/crates/dmb_idb/`
- Data pipeline (scrape/export/validate/parity): `rust/crates/dmb_pipeline/`
- Static data served at `/data/*`: `rust/static/data/`
- Hydration bundle served at `/pkg/*`: `rust/static/pkg/`
- E2E tests: `e2e/`

## Known Open Items
- Scraper hardening is largely done in practice: `scrape.rs` has warning/reporting and unit fixtures, and the cutover gate includes strict parity + warning reports. If you see a new panic, address it surgically with a fixture.

## Next Work (High-Signal Order)

1. If you want “clean repo”: isolate/commit only `projects/dmb-almanac/**` changes (ignore unrelated monorepo `.claude/**` churn).
2. Do one more rehearsal from a brand new Chrome profile (no storage) plus an “old profile” (with `dmb-almanac` IDB + old caches) to confirm upgrade paths stay stable.
3. When ready, delete the remaining compat reads for the old prototype keys once you are sure you will not reuse old browser profiles.

## Pointers

- Docs index: `docs/INDEX.md`
- Deployment: `docs/guides/DEPLOYMENT_REFERENCE.md`
- Cutover runbook: `docs/ops/CUTOVER_RUNBOOK.md`

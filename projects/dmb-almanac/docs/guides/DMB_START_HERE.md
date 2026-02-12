# DMB Almanac (Rust-First Offline PWA) - Start Here

Repo: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac`

This repo is a local-only, offline-first PWA built with Rust (Leptos SSR + WASM hydration). The current workflow is Rust-first; the old UI code is intentionally removed.

## Fast Path (Recommended)

Run the full green gate (Rust verify + data release + server + E2E subset):

```bash
cd /Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac
bash scripts/cutover-rehearsal.sh
```

If this is green, the core offline + SW update flows are working end-to-end.

## Key Commands

Run the Rust server:

```bash
cd rust
cargo run -p dmb_server
```

Run Rust-only E2E tests (against a running server):

```bash
cd /Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/e2e
BASE_URL=http://127.0.0.1:3000 npm run test:e2e
```

Rebuild runtime SQLite and validate strict parity:

```bash
cd rust
cargo run -p xtask -- data-release --sqlite ../data/dmb-almanac.db
```

## Repo Layout (What To Read First)

- App UI (SSR + hydration): `rust/crates/dmb_app/`
- Server: `rust/crates/dmb_server/`
- IndexedDB schema + client: `rust/crates/dmb_idb/`
- Pipeline (scrape/export/validate/parity): `rust/crates/dmb_pipeline/`
- WASM compute: `rust/crates/dmb_wasm/`
- Static data bundle: `rust/static/data/`

## Operational Docs

- Deployment + verification: `docs/guides/DEPLOYMENT_REFERENCE.md`
- Cutover gates + staging strategy: `docs/ops/CUTOVER_RUNBOOK.md`
- Rollback guidance (Rust builds): `docs/ops/ROLLBACK_RUNBOOK.md`
- Scrape pipeline reference: `docs/scraping/SCRAPING_REFERENCE.md`

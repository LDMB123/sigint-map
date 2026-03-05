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
cargo run -p xtask -- build-hydrate-pkg
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

## Current Source Of Truth

- Canonical repo/runtime state: `STATUS.md`
- Workspace overview + release flow: `rust/README.md`
- Wasm/browser bridge reference: `docs/wasm/WASM_REFERENCE.md`
- WebGPU scoring/runtime reference: `docs/gpu/GPU_REFERENCE.md`
- Full documentation map: `docs/README.md`, `docs/INDEX.md`

## If You Are Touching...

- Routes, hydration, or browser state: `rust/crates/dmb_app/`, then `rust/README.md`
- AI search or WebGPU scoring: `rust/crates/dmb_app/src/ai.rs`, `rust/crates/dmb_wasm/src/webgpu.rs`, then `docs/wasm/WASM_REFERENCE.md` and `docs/gpu/GPU_REFERENCE.md`
- Offline data/runtime schema: `rust/crates/dmb_idb/`, then `docs/references/DATABASE_SCHEMA_REFERENCE.md`
- Scraping, validation, or release bundles: `rust/crates/dmb_pipeline/`, then `docs/scraping/SCRAPING_REFERENCE.md`
- Release/cutover operations: `docs/ops/CUTOVER_RUNBOOK.md`, `docs/reports/QUALITY/RELEASE_READINESS_CHECKLIST.md`

## Operational Docs

- Deployment + verification: `docs/guides/DEPLOYMENT_REFERENCE.md`
- Testing checklist: `docs/guides/TESTING_CHECKLIST.md`
- Cutover gates + staging strategy: `docs/ops/CUTOVER_RUNBOOK.md`
- Rollback guidance (Rust builds): `docs/ops/ROLLBACK_RUNBOOK.md`
- Scrape pipeline reference: `docs/scraping/SCRAPING_REFERENCE.md`
- Architecture + roadmap summaries: `docs/reports/REVISED_RUST_WASM_PLAN_2026-02-04.md`, `docs/reports/STRATEGIC_ROADMAP_2026.md`
- Policy docs: `docs/reports/DMB_DEPENDENCY_ELIMINATION_MASTER_PLAN.md`, `docs/reports/ENCRYPTION_SECURITY_POLICY.md`
- Release quality docs: `docs/reports/QUALITY/RELEASE_READINESS_CHECKLIST.md`, `docs/reports/QUALITY/PRODUCTION_READINESS_2026-03-03.md`

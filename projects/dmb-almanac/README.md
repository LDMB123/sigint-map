# DMB Almanac

Rust-first, offline-first Dave Matthews Band concert database PWA.

## Quick Start

1. Run the full green gate (verify + data release + server + Rust E2E subset):

```bash
bash scripts/cutover-rehearsal.sh
```

2. Or run the app server directly:

```bash
cd rust
cargo run -p xtask -- build-hydrate-pkg
cargo run -p dmb_server
```

3. Open `http://127.0.0.1:3000`.

## Daily Commands

| Goal | Command |
|---|---|
| Full verification | `cd rust && cargo run -p xtask -- verify` |
| Local cutover rehearsal | `bash scripts/cutover-rehearsal.sh` |
| Remote E2E against running env | `BASE_URL=https://your-env bash scripts/cutover-remote-e2e.sh` |
| Deploy helper (local) | `bash scripts/deploy.sh local` |
| Docs + hygiene checks | `python3 scripts/check-doc-integrity.py && bash scripts/check-repo-hygiene.sh` |
| Pristine gate (fast) | `bash scripts/pristine-check.sh` |
| Pristine + disk budget gate | `bash scripts/pristine-check.sh --with-disk-budget` |
| Autonomous DB optimize pass | `bash scripts/autonomous-db-optimize.sh` |
| SQLite query-plan audit | `bash scripts/db-query-plan-audit.sh rust/.tmp/dmb-runtime.db` |
| Token context report | `python3 scripts/token-context-report.py --budget 12000` |
| Clean generated artifacts | `bash scripts/clean-workspace.sh --include-generated-data` |
| Clean global browser/test caches | `bash scripts/clean-global-test-caches.sh` |
| Disk budget check (warn) | `bash scripts/check-disk-budget.sh` |
| Disk budget check (fail in CI) | `bash scripts/check-disk-budget.sh --enforce` |

## Repository Layout

| Path | Purpose |
|---|---|
| `rust/` | Rust workspace: app (`dmb_app`), server (`dmb_server`), IDB (`dmb_idb`), pipeline (`dmb_pipeline`) |
| `data/` | Canonical static data artifacts and dataset notes (see `data/README.md`) |
| `e2e/` | Playwright test harness (see `e2e/README.md`) |
| `scripts/` | Operational and verification scripts (see `scripts/README.md`) |
| `docs/` | Architecture, runbooks, reports, migration docs (start at `docs/README.md`) |

## Architecture At A Glance

- Browser app (SSR + hydration): `rust/crates/dmb_app/`
- WASM + WebGPU bridge: `rust/crates/dmb_wasm/`
- Server: `rust/crates/dmb_server/`
- IndexedDB/runtime data layer: `rust/crates/dmb_idb/`
- Scrape/export/validation pipeline: `rust/crates/dmb_pipeline/`

## Documentation

- Current repo state (canonical): `STATUS.md`
- Documentation home: `docs/README.md`
- Full docs index: `docs/INDEX.md`
- Getting started guide: `docs/guides/DMB_START_HERE.md`
- Runtime architecture: `rust/README.md`, `docs/wasm/WASM_REFERENCE.md`, `docs/gpu/GPU_REFERENCE.md`
- Cutover runbook: `docs/ops/CUTOVER_RUNBOOK.md`
- Deployment reference: `docs/guides/DEPLOYMENT_REFERENCE.md`
- QA + release docs: `docs/guides/QUALITY_ASSURANCE_STRATEGY.md`, `docs/reports/QUALITY/RELEASE_READINESS_CHECKLIST.md`, `docs/reports/QUALITY/PRODUCTION_READINESS_2026-03-03.md`
- Token workflow: `docs/guides/TOKEN_CONTEXT_WORKFLOW.md`
- Repository organization policy: `docs/guides/REPO_ORGANIZATION_POLICY.md`

## Contributing

See `CONTRIBUTING.md` for workflow, quality gates, and documentation standards.

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
| Clean generated artifacts | `bash scripts/clean-workspace.sh --include-generated-data` |

## Repository Layout

| Path | Purpose |
|---|---|
| `rust/` | Rust workspace: app (`dmb_app`), server (`dmb_server`), IDB (`dmb_idb`), pipeline (`dmb_pipeline`) |
| `data/static-data/` | Versioned static data artifacts (canonical checked-in data) |
| `e2e/` | Playwright test harness |
| `scripts/` | Operational and verification scripts (see `scripts/README.md`) |
| `docs/` | Architecture, runbooks, reports, migration docs (start at `docs/README.md`) |

## Documentation

- Documentation home: `docs/README.md`
- Full docs index: `docs/INDEX.md`
- Getting started guide: `docs/guides/DMB_START_HERE.md`
- Cutover runbook: `docs/ops/CUTOVER_RUNBOOK.md`
- Deployment reference: `docs/guides/DEPLOYMENT_REFERENCE.md`
- Repository organization policy: `docs/guides/REPO_ORGANIZATION_POLICY.md`

## Contributing

See `CONTRIBUTING.md` for workflow, quality gates, and documentation standards.

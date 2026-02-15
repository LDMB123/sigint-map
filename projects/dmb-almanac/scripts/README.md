# Scripts Reference

## Primary Scripts

| Script | Purpose | Typical Use |
|---|---|---|
| `scripts/cutover-rehearsal.sh` | Full local green gate (verify + data release + server + Rust E2E subset) | `bash scripts/cutover-rehearsal.sh` |
| `scripts/cutover-remote-e2e.sh` | Run Rust E2E subset against an existing remote/staging server | `BASE_URL=https://env bash scripts/cutover-remote-e2e.sh` |
| `scripts/deploy.sh` | Local deploy helper for Rust server | `bash scripts/deploy.sh local` |

## CI and Environment

| Script | Purpose |
|---|---|
| `scripts/setup-ci.sh` | Print CI setup expectations |
| `scripts/verify-ci-setup.sh` | Validate required CI/workflow files and local tooling |
| `scripts/validate-env.sh` | Validate required environment variables |

## Data / Warning Utilities

| Script | Purpose |
|---|---|
| `scripts/update-warning-baseline.sh` | Regenerate warning report baseline |
| `scripts/compare-warning-reports.py` | Compare two warning report JSON files |
| `scripts/validate-cache-metadata.js` | Validate `.claude/cache-metadata.json` and related references |

## Repo Hygiene Utilities

| Script | Purpose | Typical Use |
|---|---|---|
| `scripts/check-doc-integrity.py` | Validate markdown references, docs section landing pages, docs index links, and script catalog drift | `python3 scripts/check-doc-integrity.py` |
| `scripts/check-repo-hygiene.sh` | Fail on tracked generated artifacts and legacy root clutter | `bash scripts/check-repo-hygiene.sh` |
| `scripts/clean-workspace.sh` | Remove local runtime/build artifacts and optional generated data duplicates | `bash scripts/clean-workspace.sh --include-generated-data` |
| `scripts/pristine-check.sh` | Run combined repo integrity checks with optional deep gates (`--with-rust-verify`, `--with-cutover-rehearsal`) | `bash scripts/pristine-check.sh` |
| `scripts/token-context-report.py` | Generate approximate token budgets and recommended context packs for active docs | `python3 scripts/token-context-report.py --budget 12000` |
| `scripts/autonomous-db-optimize.sh` | Run DB-focused Rust quality gates + parity validation + query-plan audit in one pass | `bash scripts/autonomous-db-optimize.sh` |
| `scripts/db-query-plan-audit.sh` | Enforce SQLite plan/index expectations for key product queries | `bash scripts/db-query-plan-audit.sh rust/.tmp/dmb-runtime.db` |

## Notes

- Run scripts from repository root unless stated otherwise.
- Most scripts assume Rust toolchain, Node.js, and Playwright dependencies are available.
- Prefer `scripts/cutover-rehearsal.sh` as the default pre-merge confidence gate.

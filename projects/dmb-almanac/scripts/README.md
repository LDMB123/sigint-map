# Scripts Reference

## Primary Scripts

| Script | Purpose | Typical Use |
|---|---|---|
| `scripts/cutover-rehearsal.sh` | Full local green gate (verify + data release + server + Rust E2E subset) | `bash scripts/cutover-rehearsal.sh` |
| `scripts/cutover-remote-e2e.sh` | Run Rust E2E subset against an existing remote/staging server | `BASE_URL=https://env bash scripts/cutover-remote-e2e.sh` |
| `scripts/deploy.sh` | Local deploy helper for Rust server | `bash scripts/deploy.sh local` |
| `scripts/a11y-keyboard-spotcheck.sh` | Generate dated manual keyboard accessibility spot-check template | `bash scripts/a11y-keyboard-spotcheck.sh` |
| `scripts/rust-import-perf.mjs` | Run repeatable cold-import timing + INP/long-frame sampling with tuning OFF vs ON | `node scripts/rust-import-perf.mjs --base-url http://127.0.0.1:3000 --runs 3` |
| `scripts/check-wasm-size.sh` | Report raw/gzip WASM size and optionally enforce 10% gzip reduction gate against baseline | `bash scripts/check-wasm-size.sh --baseline-gzip 1023156` |

## Data / Warning Utilities

| Script | Purpose |
|---|---|
| `scripts/update-warning-baseline.sh` | Regenerate warning report baseline |
| `scripts/compare-warning-reports.py` | Compare two warning report JSON files |

## Repo Hygiene Utilities

| Script | Purpose | Typical Use |
|---|---|---|
| `scripts/check-doc-integrity.py` | Validate markdown references, docs section landing pages, docs index links, and script catalog drift | `python3 scripts/check-doc-integrity.py` |
| `scripts/check-repo-hygiene.sh` | Fail on tracked generated artifacts and legacy root clutter | `bash scripts/check-repo-hygiene.sh` |
| `scripts/security-audit.sh` | Run `cargo audit` with temporary, expiring advisory dispositions enforced | `bash scripts/security-audit.sh` |
| `scripts/clean-workspace.sh` | Remove local runtime/build artifacts and optional generated data duplicates | `bash scripts/clean-workspace.sh --include-generated-data` |
| `scripts/clean-global-test-caches.sh` | Remove global Playwright/Cypress browser caches from user cache dirs | `bash scripts/clean-global-test-caches.sh` |
| `scripts/check-disk-budget.sh` | Report project/cache size budgets and optionally fail when exceeded | `bash scripts/check-disk-budget.sh --enforce` |
| `scripts/pristine-check.sh` | Run combined repo integrity checks with optional deep gates (`--with-rust-verify`, `--with-cutover-rehearsal`, `--with-disk-budget`) | `bash scripts/pristine-check.sh --with-disk-budget` |
| `scripts/token-context-report.py` | Generate approximate token budgets and recommended context packs for active docs | `python3 scripts/token-context-report.py --budget 12000` |
| `scripts/autonomous-db-optimize.sh` | Run DB-focused Rust quality gates + parity validation + query-plan audit in one pass | `bash scripts/autonomous-db-optimize.sh` |
| `scripts/db-query-plan-audit.sh` | Enforce SQLite plan/index expectations for key product queries | `bash scripts/db-query-plan-audit.sh rust/.tmp/dmb-runtime.db` |

## Notes

- Run scripts from repository root unless stated otherwise.
- Most scripts assume Rust toolchain, Node.js, and Playwright dependencies are available.
- Prefer `scripts/cutover-rehearsal.sh` as the default pre-merge confidence gate.

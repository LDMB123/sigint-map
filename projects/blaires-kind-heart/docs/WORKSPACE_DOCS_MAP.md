# Workspace Markdown Map

Last updated: 2026-03-05

This file is the fastest way to locate any Markdown documentation in this repository.

## Inventory Summary

- Exact Markdown counts are intentionally omitted here because they drift quickly.
- Active operational docs live under `docs/` (excluding `docs/archive/`) and are kept intentionally small.
- Historical docs live under `docs/archive/`.
- Non-docs Markdown locations:
  - Root: `README.md`, `CLAUDE.md`
  - Deploy: `deploy/**/README.md`
  - Assets: `assets/icons/README.md`
  - Committed evidence reports: `scripts/reports/*.md`
- If you need point-in-time counts, generate them locally:
  - `find docs -path 'docs/archive' -prune -o -name '*.md' -print | wc -l`
  - `find docs/archive -name '*.md' | wc -l`

## Where To Start

1. Product/runtime status: `docs/STATUS_LEDGER.md`
2. Session takeover: `docs/HANDOFF.md`
3. Active docs navigation: `docs/INDEX.md`
4. Archive navigation: `docs/archive/INDEX.md`
5. Deployment navigation: `deploy/README.md`
6. Index-shell deep gate context: `npm run qa:index-shell-deep` and the related status/history notes in `docs/STATUS_LEDGER.md`

## Active Documentation Areas

- `docs/`:
  - `INDEX.md` (active docs hub)
  - `HANDOFF.md` (takeover runbook)
  - `STATUS_LEDGER.md` (QA + history)
  - `TESTING.md` (operational test guide)
  - `TROUBLESHOOTING.md` (operational troubleshooting)
  - `ICONS.md` (icon workflow)
  - `PERSISTENCE_CONTRACT.md` (DB/export/restore invariants)
  - `IPAD_REGRESSION_TEMPLATE.md` (physical device checklist)
- `docs/testing/README.md`: links historical testing writeups
- `docs/testing/release-evidence/`: machine-verifiable release-evidence pack
  - `README.md` (operator guide)
  - `IPAD_REGRESSION_RUN_TEMPLATE.md` / `ISSUE_LOG_TEMPLATE.md` (run templates)
  - `runs/rc3_run_01.md`, `runs/rc4_run_02.md` (active physical-run records)
  - `waivers/phase5-db-reduction-rc4.md` (resolved historical waiver record)
- `docs/reports/README.md`: links archived deep-dive reports
- `docs/deployment/README.md`: deployment doc entrypoint
- `docs/deployment/PWA_HEADERS.md`: required HTTP header policy

## Archive Documentation Areas

Use `docs/archive/INDEX.md` as the root, then per-folder indexes:

- `docs/archive/audits/INDEX.md`
- `docs/archive/plans/INDEX.md`
- `docs/archive/phase-docs/INDEX.md`
- `docs/archive/reference-full/INDEX.md`
- `docs/archive/reports/INDEX.md`
- `docs/archive/root-docs/INDEX.md`
- `docs/archive/sessions/INDEX.md`
- `docs/archive/snapshots/INDEX.md`
- `docs/archive/testing/INDEX.md`

## Documentation Hygiene Rules

- Add new operational docs under `docs/` only when they are needed in normal development flow.
- Add historical writeups, completed plans, or deep snapshots under `docs/archive/`.
- Link active docs to committed evidence or stable output patterns, not disposable one-off local reports.
- Keep `docs/INDEX.md` and `docs/archive/INDEX.md` updated when adding or moving Markdown files.

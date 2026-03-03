# Workspace Markdown Map

Last updated: 2026-03-03

This file is the fastest way to locate any Markdown documentation in this repository.

## Inventory Summary

- Total Markdown files: `148`
- Active docs (`docs/` excluding archive): `~15`
- Archive docs (under `docs/archive/`): `142`
- Non-docs Markdown locations:
  - Root: `README.md`, `CLAUDE.md`
  - Deploy: `deploy/**/README.md`
  - Assets: `assets/icons/README.md`

## Where To Start

1. Product/runtime status: `docs/STATUS_LEDGER.md`
2. Session takeover: `docs/HANDOFF.md`
3. Active docs navigation: `docs/INDEX.md`
4. Archive navigation: `docs/archive/INDEX.md`
5. Deployment navigation: `deploy/README.md`

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
- `docs/reports/README.md`: links archived deep-dive reports
- `docs/deployment/README.md`: deployment doc entrypoint

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
- Keep `docs/INDEX.md` and `docs/archive/INDEX.md` updated when adding or moving Markdown files.

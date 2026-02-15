# Database Audit Reference (Condensed)

Date: 2026-02-15

## Purpose

Quick operational reference for database quality checks in the Rust-first DMB Almanac repo.

## Active Data Layers

- Runtime/server DB: SQLite (Rust pipeline + server paths)
- Client DB: IndexedDB via `dmb_idb`
- Data flow: pipeline build/export -> runtime static bundle -> hydrate/import/parity

## Core Audit Gates

```bash
# End-to-end DB optimization + integrity + parity + query-plan checks
bash scripts/autonomous-db-optimize.sh

# Explicit query-plan/index/integrity guardrail
bash scripts/db-query-plan-audit.sh rust/.tmp/dmb-runtime.db

# Cutover gate with Rust E2E subset
bash scripts/cutover-rehearsal.sh
```

## What These Gates Must Prove

- Runtime SQLite integrity checks are clean.
- Strict parity checks pass against manifest/tables.
- High-traffic query plans remain index-backed (no temp-sort regressions).
- Cutover flow remains healthy for SSR/hydrate and DB-backed routes.

## High-Risk Failure Classes

- Missing or regressed indexes causing temp-sort/query-plan drift.
- Parity mapping drift between runtime SQLite tables and IndexedDB stores.
- IndexedDB upgrade drift (missing stores/indexes after schema bumps).
- Asset/cutover startup misconfiguration that hides DB regressions behind boot failures.

## Fast Triage Playbook

1. Run `bash scripts/db-query-plan-audit.sh rust/.tmp/dmb-runtime.db`.
2. If failing, rebuild via `bash scripts/autonomous-db-optimize.sh`.
3. Re-run `bash scripts/cutover-rehearsal.sh`.
4. Confirm current state and open items in `STATUS.md`.

## Canonical References

- Current state: `STATUS.md`
- Cutover runbook: `docs/ops/CUTOVER_RUNBOOK.md`
- Migration execution evidence: `docs/migration/AUTONOMOUS_DATABASE_DEBUG_OPTIMIZATION_PLAN_2026-02-14.md`
- DB debug execution evidence: `docs/migration/DB_OPTIMIZATION_DEBUG_EXECUTION_PLAN_2026-02-15.md`

## Historical Note

This file intentionally replaces a longer implementation-heavy audit writeup to reduce token overhead in day-to-day sessions.

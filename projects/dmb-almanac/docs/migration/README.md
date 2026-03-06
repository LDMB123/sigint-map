# Migration Docs

This section is only for migration artifacts that still matter to the current Rust-first app.
It is not the default starting point for feature work or everyday debugging.

## Use This Area When

- Changing how the static data bundle is produced or consumed.
- Validating cutover assumptions and prior storage decisions.
- Reviewing why a historical migration choice was made.

## Current References

- `docs/migration/DATA_BUNDLE.md`
- `docs/references/DATA_BUNDLE_REFERENCE.md`
- `docs/ops/CUTOVER_RUNBOOK.md`
- `docs/reports/REVISED_RUST_WASM_PLAN_2026-02-04.md`
- `STATUS.md`

## Dated Execution Records

These files describe work that has already been executed. Keep them for context, not as current policy.

- `docs/migration/AUTONOMOUS_DATABASE_DEBUG_OPTIMIZATION_PLAN_2026-02-14.md`
- `docs/migration/DB_OPTIMIZATION_DEBUG_EXECUTION_PLAN_2026-02-15.md`

## Archived Historical Planning

Earlier OPFS, Dexie, and exploratory planning material lives under:

- `docs/reports/_archived/migration-planning-2026-03-05/`

## Related Commands

From repo root:

```bash
# End-to-end DB optimization pass (fmt/clippy/tests/parity/query-plans)
bash scripts/autonomous-db-optimize.sh

# Standalone SQLite query-plan/index audit
bash scripts/db-query-plan-audit.sh rust/.tmp/dmb-runtime.db
```

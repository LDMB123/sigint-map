# Migration Docs

Rust-first migration references and completed execution records.

## Current References

- `docs/migration/DATA_BUNDLE.md`
- `docs/reports/REVISED_RUST_WASM_PLAN_2026-02-04.md`
- `STATUS.md`

## Completed Execution Records

- `docs/migration/AUTONOMOUS_DATABASE_DEBUG_OPTIMIZATION_PLAN_2026-02-14.md`
- `docs/migration/DB_OPTIMIZATION_DEBUG_EXECUTION_PLAN_2026-02-15.md`

## Historical Planning Artifacts

Earlier OPFS/Dexie and exploratory migration-planning docs were archived under:

- `docs/reports/_archived/migration-planning-2026-03-05/`

## Related Commands

From repo root:

```bash
# End-to-end DB optimization pass (fmt/clippy/tests/parity/query-plans)
bash scripts/autonomous-db-optimize.sh

# Standalone SQLite query-plan/index audit
bash scripts/db-query-plan-audit.sh rust/.tmp/dmb-runtime.db
```

# Migration Docs

Rust-first migration planning and execution artifacts.

## Suggested Reading Order

1. `docs/migration/MIGRATION_MILESTONES.md`
2. `docs/migration/BRANCH_STRATEGY.md`
3. `docs/migration/FEATURE_FREEZE.md`

## Active Execution Plans

- `docs/migration/AUTONOMOUS_DATABASE_DEBUG_OPTIMIZATION_PLAN_2026-02-14.md`
- `docs/migration/DB_OPTIMIZATION_DEBUG_EXECUTION_PLAN_2026-02-15.md`

## Related Commands

From repo root:

```bash
# End-to-end DB optimization pass (fmt/clippy/tests/parity/query-plans)
bash scripts/autonomous-db-optimize.sh

# Standalone SQLite query-plan/index audit
bash scripts/db-query-plan-audit.sh rust/.tmp/dmb-runtime.db
```

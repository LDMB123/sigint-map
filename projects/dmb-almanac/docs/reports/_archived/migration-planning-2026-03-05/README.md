# Migration Planning Archive (2026-03-05)

This folder contains migration-planning documents moved out of `docs/migration/` during cleanup on 2026-03-05.

Why archived:
- They described an earlier OPFS/Dexie or exploratory browser-API roadmap that no longer matches the current Rust-first app contract.
- Several were short planning stubs with no active inbound references.
- Keeping them in `docs/migration/` made the migration landing page misleading.

Archived files:
- `BRANCH_STRATEGY.md`
- `COMPOSITOR_BUDGET.md`
- `DATA_PLANE_RISK_REGISTER.md`
- `FEATURE_FREEZE.md`
- `MIGRATION_MILESTONES.md`
- `NATIVE_API_REPLACEMENT.md`
- `RAG_EVAL_SET.md`

Current replacements:
- Runtime/data contract: `docs/migration/DATA_BUNDLE.md`
- Current architecture/status: `docs/reports/REVISED_RUST_WASM_PLAN_2026-02-04.md`, `STATUS.md`
- Completed DB execution evidence: remaining docs in `docs/migration/`

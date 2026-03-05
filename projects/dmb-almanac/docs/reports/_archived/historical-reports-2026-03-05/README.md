# Historical Reports Archive (2026-03-05)

This folder contains root report documents moved out of `docs/reports/` during the 2026-03-05 cleanup pass.

Why archived:
- They were not referenced by active repo docs outside the reports index.
- They primarily captured historical analysis or JS-era implementation context.
- Keeping them in the root reports folder made them look current alongside live Rust-first summaries and policy docs.

Archived files:
- `ARCHIVAL_SUMMARY.md`
- `DEVILS_ADVOCATE_STACK_DECISIONS_2026-02-04.md`
- `MEMORY_AUDIT_INDEX.md`
- `PERFORMANCE_COMPARISON.md`

Notes:
- `DEVILS_ADVOCATE_STACK_DECISIONS_2026-02-04.md` reflects an earlier Dexie/OPFS hybrid discussion and should not be treated as the current storage/runtime contract.
- `MEMORY_AUDIT_INDEX.md` was a redundant wrapper around the current summary and was removed to keep one active memory entry point.
- `PERFORMANCE_COMPARISON.md` reflects earlier JS-era batch-processing behavior.
- `ARCHIVAL_SUMMARY.md` is preserved as documentation-organization history.

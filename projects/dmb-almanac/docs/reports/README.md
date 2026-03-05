# Reports Index

This directory contains project reports and reference-style summaries for the Rust-first, local-only DMB Almanac PWA.

## Current Summaries And Policy Docs

- `STRATEGIC_ROADMAP_2026.md`
- `REVISED_RUST_WASM_PLAN_2026-02-04.md`
- `PWA_AUDIT_SUMMARY.md`
- `ACCESSIBILITY_AUDIT_SUMMARY.md`
- `ENCRYPTION_SECURITY_POLICY.md`
- `DMB_DEPENDENCY_ELIMINATION_MASTER_PLAN.md`

## Quality Evidence

- `QUALITY/RELEASE_READINESS_CHECKLIST.md`
- `QUALITY/PRODUCTION_READINESS_2026-03-03.md`
- `QUALITY/README.md`

Use the checklist as the reusable gate and the dated production-readiness doc as the current release snapshot.

## Memory Notes

- `MEMORY_AUDIT_SUMMARY.md`
- `MEMORY_LEAK_SOURCES.md`

Use `MEMORY_AUDIT_SUMMARY.md` as the single active entry point. Legacy JS-specific findings are historical and should not override current Rust implementation behavior.

## Current vs Historical

- Current operational state: `STATUS.md`
- Current runtime architecture: `rust/README.md`, `docs/wasm/WASM_REFERENCE.md`, `docs/gpu/GPU_REFERENCE.md`
- Condensed organization history: `COMPRESSION_ORGANIZATION_REPORT_2026-02-12.md`
- Historical deep dives: `_full_audits/`

## Doc Hygiene

- `COMPRESSION_ORGANIZATION_REPORT_2026-02-12.md` (current compression and organization policy)

## Large / Historical

- `_full_audits/` - long-form audits (prefer summaries unless you need details)
- `_archived/` - older reports kept for reference
- `_archived/historical-reports-2026-03-05/` - root historical reports moved out of current summaries
- `_archived/migration-planning-2026-03-05/` - stale migration-planning docs removed from active migration references
- `_archived/quality-history-2026-03-05/` - dated quality progress logs removed from current quality docs
- `_archived/superseded-guides-2026-03-05/` - JS-era and speculative guides removed from active developer docs
- `_archived/ui-ux-drafts-2026-03-05/` - exploratory V2 UI/UX drafts removed from active guides

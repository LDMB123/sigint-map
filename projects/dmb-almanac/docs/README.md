# Documentation Home

Use this page as the entry point for current repository documentation.
Start with `STATUS.md` when you need the exact repo/runtime state on `main`.

## Fast Paths

- New to the project: `docs/guides/DMB_START_HERE.md`
- Need current canonical state: `STATUS.md`
- Need runtime architecture: `rust/README.md`, `docs/wasm/WASM_REFERENCE.md`, `docs/gpu/GPU_REFERENCE.md`
- Need full navigation: `docs/INDEX.md`
- Need operational cutover steps: `docs/ops/CUTOVER_RUNBOOK.md`
- Need current testing flow: `docs/guides/TESTING_CHECKLIST.md`
- Need reusable release gate: `docs/reports/QUALITY/RELEASE_READINESS_CHECKLIST.md`
- Need latest dated readiness snapshot: `docs/reports/QUALITY/PRODUCTION_READINESS_2026-03-03.md`
- Need manual keyboard a11y checks: `docs/ops/A11Y_KEYBOARD_SPOTCHECK_RUNBOOK.md`
- Need current architecture/roadmap summaries: `docs/reports/REVISED_RUST_WASM_PLAN_2026-02-04.md`, `docs/reports/STRATEGIC_ROADMAP_2026.md`
- Need current policy docs: `docs/reports/DMB_DEPENDENCY_ELIMINATION_MASTER_PLAN.md`, `docs/reports/ENCRYPTION_SECURITY_POLICY.md`
- Need minimal context pack: `CONTEXT.md`

## Documentation Map

| Directory | Landing Page | Contains |
|---|---|
| `docs/guides/` | `docs/guides/README.md` | Onboarding, deployment, testing, architecture and design guides |
| `docs/ops/` | `docs/ops/README.md` | Runbooks for cutover, rollback, and operational checks |
| `docs/api/` | `docs/api/README.md` | API contract definitions |
| `docs/migration/` | `docs/migration/README.md` | Current migration references and completed execution records |
| `docs/reports/` | `docs/reports/README.md` | Summaries, audits, and strategic reports |
| `docs/references/` | `docs/references/README.md` | Technical reference docs for schema/data/modules |
| `docs/quick-references/` | `docs/quick-references/README.md` | Short command/reference cheat sheets |
| `docs/audits/` | `docs/audits/README.md` | Domain-specific audit references |
| `docs/gpu/` | `docs/gpu/README.md` | GPU-specific reference docs |
| `docs/wasm/` | `docs/wasm/README.md` | Wasm architecture and roadmap docs |
| `docs/scraping/` | `docs/scraping/README.md` | Scraping fixtures and extraction references |

## Documentation Maintenance Rules

- Keep top-level docs brief and task-oriented.
- Prefer linking to canonical docs over duplicating instructions.
- Archive obsolete docs under `docs/reports/_archived/`.
- Keep `docs/INDEX.md` updated when files are moved or added.
- Prefer direct links to the reusable release checklist and latest dated readiness snapshot over directory-only quality links.

# Documentation Home

Use this page to get to the current operating docs quickly.
If you need the exact verified state of the app on `main`, start with `STATUS.md`.

## Start Here

- Current repo and runtime state: `STATUS.md`
- First-pass onboarding: `docs/guides/DMB_START_HERE.md`
- Minimal context pack: `CONTEXT.md`
- Runtime architecture: `rust/README.md`, `docs/wasm/WASM_REFERENCE.md`, `docs/gpu/GPU_REFERENCE.md`
- Testing and release gates: `docs/guides/TESTING_CHECKLIST.md`, `docs/reports/QUALITY/RELEASE_READINESS_CHECKLIST.md`
- Latest dated readiness snapshot: `docs/reports/QUALITY/PRODUCTION_READINESS_2026-03-03.md`
- Cutover and rollback operations: `docs/ops/CUTOVER_RUNBOOK.md`, `docs/ops/ROLLBACK_RUNBOOK.md`
- Full tree browser: `docs/INDEX.md`

## How The Tree Is Organized

- `docs/guides/` for day-to-day developer workflows.
- `docs/ops/` for runbooks, release steps, and operational spot checks.
- `docs/references/` for stable technical facts such as schema and data-bundle shape.
- `docs/reports/` for dated evidence, policy docs, and strategic summaries.
- `docs/migration/` for the small set of migration artifacts still relevant to the current Rust-first app.
- `docs/audits/` for durable audit references and future audit drop zones.
- `docs/reports/_archived/` and `docs/reports/_full_audits/` for historical material that should not drive day-to-day work.

## Section Landing Pages

- `docs/guides/README.md`
- `docs/ops/README.md`
- `docs/api/README.md`
- `docs/migration/README.md`
- `docs/references/README.md`
- `docs/reports/README.md`
- `docs/quick-references/README.md`
- `docs/audits/README.md`
- `docs/gpu/README.md`
- `docs/wasm/README.md`
- `docs/scraping/README.md`

## Maintenance Rules

- Keep this page short and task-first.
- Prefer linking to one canonical doc instead of duplicating instructions.
- Move superseded material into `docs/reports/_archived/`.
- Update `docs/INDEX.md` whenever files move or a new top-level doc area becomes active.

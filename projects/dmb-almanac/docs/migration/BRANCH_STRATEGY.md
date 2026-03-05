# Migration Branch Strategy

- Base branch: `main`
- Migration branch prefix: `codex/migration-*`
- Weekly checkpoint branch pattern: codex/migration-week-<nn> (for example codex/migration-week-interop-consolidation)
- Keep feature work on prefixed branches and merge through reviewed PRs.
- All freeze exceptions must be documented in `docs/migration/FEATURE_FREEZE.md` with date and rationale.

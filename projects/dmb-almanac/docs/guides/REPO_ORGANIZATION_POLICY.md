# Repository Organization Policy

## Goal

Keep the repository clean, navigable, and deterministic for developers and CI.

## Canonical Data Source

- Canonical checked-in static dataset: `data/static-data/`

## Generated Data and Build Artifacts

These are generated and should not be committed:

- `rust/static/data/`
- `rust/data/raw/`
- `rust/target/`
- `rust/static/pkg/`
- `e2e/playwright-report/`
- `e2e/test-results/`

## Cleanup Commands

Standard cleanup:

```bash
bash scripts/clean-workspace.sh
```

Aggressive cleanup including generated data duplicates:

```bash
bash scripts/clean-workspace.sh --include-generated-data
```

Dry-run preview:

```bash
bash scripts/clean-workspace.sh --dry-run --include-generated-data
```

## Integrity and Hygiene Checks

Run locally:

```bash
python3 scripts/check-doc-integrity.py
bash scripts/check-repo-hygiene.sh
```

CI workflow:

- `.github/workflows/docs-integrity.yml`

## Documentation Organization Rules

- Keep repository root minimal: only active entrypoint docs and configs.
- Archive obsolete docs under `docs/reports/_archived/`.
- Keep a `README.md` landing page in each top-level `docs/*` section.
- Keep `docs/INDEX.md` current when moving or adding docs.

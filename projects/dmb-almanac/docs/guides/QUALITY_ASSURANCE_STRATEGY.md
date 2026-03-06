# Quality Assurance Strategy

This document defines the quality architecture for the Rust-first DMB Almanac repo.

## Gate Tiers

### Tier 1: Fast Pristine Gate

Use for local iteration and docs/ops/script changes.

```bash
bash scripts/pristine-check.sh
```

What it enforces:

- Docs integrity (`scripts/check-doc-integrity.py`)
- Repo hygiene (`scripts/check-repo-hygiene.sh`)

Optional companion report for docs-heavy sessions:

```bash
python3 scripts/token-context-report.py --budget 12000
```

### Tier 2: Engineering Gate

Use before merging Rust or pipeline code.

```bash
bash scripts/pristine-check.sh --with-rust-verify
```

What it adds:

- `cargo run -p xtask -- verify`

### Tier 3: Release Confidence Gate

Use for cutover and production readiness.

```bash
bash scripts/cutover-rehearsal.sh
```

What it adds:

- Data release checks
- Server startup checks
- Rust E2E subset checks

## Test Pyramid Targets

The project should maintain a practical test distribution:

- Unit-heavy base: core logic and data transforms
- Integration layer: API/data boundaries and pipeline validation
- Focused E2E layer: critical user journeys only

## CI Alignment

- Rust quality checks: [.github/workflows/rust-ci.yml](../../.github/workflows/rust-ci.yml)
- Docs and structure checks: [.github/workflows/docs-integrity.yml](../../.github/workflows/docs-integrity.yml)

## PR Expectations

- Run at least Tier 1 for all PRs.
- Run Tier 2 for Rust code changes.
- Use Tier 3 for release/cutover work.

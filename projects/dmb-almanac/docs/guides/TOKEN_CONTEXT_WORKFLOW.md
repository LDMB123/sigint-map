# Token Context Workflow

This guide standardizes how to build low-noise, token-efficient context packs for coding sessions.

## Goal

- Keep context focused on active docs and operational entry points.
- Avoid loading archived reports unless explicitly needed.
- Track approximate token usage before sharing large context bundles.
- Use `STATUS.md` as the only detailed state source to avoid duplicate status reads.

## Fast Report

From repo root:

```bash
python3 scripts/token-context-report.py
```

This prints:

- Total approximate tokens in the active doc scope
- Top token-heavy files
- Token totals by top-level area
- A recommended context pack under the default budget

## Budgeted Pack Example

```bash
python3 scripts/token-context-report.py --budget 8000 --top 12
```

## JSON Output (for automation)

```bash
python3 scripts/token-context-report.py --json-output .tmp/context-report.json
```

## Scope Modes

- `--scope active` (default): curated docs/readmes used for day-to-day development.
- `--scope all-markdown`: all markdown files except archived report trees.

## Suggested Usage

1. Run `scripts/pristine-check.sh`.
2. Run `scripts/token-context-report.py`.
3. Load only the recommended pack unless a specific deep-dive file is required.
4. Prefer linking to `STATUS.md` instead of duplicating status sections in other docs.

## DMB Minimal Context Pack

For most DMB coding tasks, start with this small pack first:

- `README.md`
- `STATUS.md`
- `docs/README.md`
- `docs/INDEX.md`
- `scripts/README.md`

Then add only one domain-specific file set as needed:

- DB/parity work: `docs/references/DATABASE_SCHEMA_REFERENCE.md`, `rust/crates/dmb_core/src/parity.rs`
- Migration/cutover work: `docs/migration/README.md`, `docs/ops/CUTOVER_RUNBOOK.md`
- Pipeline/scraping work: `docs/scraping/README.md`, `docs/scraping/SCRAPING_REFERENCE.md`

## CI Integration

`docs-integrity.yml` generates and uploads two JSON artifacts on PRs:

- `token-context-active` JSON artifact
- `token-context-all` JSON artifact

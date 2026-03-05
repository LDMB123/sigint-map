# Codex Cache Warming Strategy

Purpose: keep session startup context small, current, and Rust-first.

## Primary Goal

- Load only high-signal references at session start.
- Avoid large historical docs unless explicitly needed.
- Keep cache warming aligned with `STATUS.md` as the canonical state source.

## Default Warm Set

Use this set at session start:

```bash
cat STATUS.md
cat docs/ops/CUTOVER_RUNBOOK.md
cat docs/references/DATA_BUNDLE_REFERENCE.md
cat docs/scraping/SCRAPING_REFERENCE.md
cat docs/reports/PWA_AUDIT_SUMMARY.md
```

## Why This Set

- `STATUS.md`: current state and next actions.
- `docs/ops/CUTOVER_RUNBOOK.md`: operational gate procedures.
- `docs/references/DATA_BUNDLE_REFERENCE.md`: data bundle shape and contracts.
- `docs/scraping/SCRAPING_REFERENCE.md`: active scrape pipeline commands.
- `docs/reports/PWA_AUDIT_SUMMARY.md`: current PWA risk snapshot.

## Exclusions

Do not preload these paths by default:

- `docs/reports/_full_audits/`
- `docs/reports/_archived/`
- `data/static-data/**`
- `rust/static/data/**`
- `rust/data/**`
- `**/*.db`
- `**/*.json.br`
- `**/*.json.gz`

Read excluded files only for targeted deep dives.

## Cache Metadata Example

```json
{
  "version": "1.0",
  "project": "dmb-almanac",
  "warmOnSessionStart": [
    "STATUS.md",
    "docs/ops/CUTOVER_RUNBOOK.md",
    "docs/references/DATA_BUNDLE_REFERENCE.md",
    "docs/scraping/SCRAPING_REFERENCE.md",
    "docs/reports/PWA_AUDIT_SUMMARY.md"
  ]
}
```

## Maintenance Rules

- If status format changes, update `STATUS.md` first and keep other docs linking to it.
- If warm-set files move, update this document and any cache metadata in the same change.
- Prefer summary docs over long-form audits for default warming.

## Verification

```bash
python3 scripts/check-doc-integrity.py
python3 scripts/token-context-report.py --scope active --budget 12000
```

## Escalation Path

If the default warm set is insufficient:

1. Add one domain doc from `docs/guides/` or `docs/references/`.
2. Re-run token report.
3. Stop before loading `_full_audits` unless debugging requires it.

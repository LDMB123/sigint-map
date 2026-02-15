# Chromium 143+ Audit Reference (Condensed)

## Purpose

Track high-impact browser-native opportunities and remaining migration work for a Chromium-targeted runtime.

## Current Snapshot

- Native API adoption is high across motion, layout, interaction, and utility layers.
- Most legacy utility/library categories are already replaced or constrained.
- Remaining opportunities are focused on selective D3 and CSS fallback cleanup.

## Keep / Remove Guidance

Keep where replacement cost is high and value is proven:
- `dexie`
- targeted `d3-*` modules for specialized layouts/projections

Candidate removals/replacements:
- `d3-axis` via existing native axis utility
- `d3-scale` where native scale utility is equivalent
- `d3-drag` via Pointer Events where behavior parity is acceptable

## High-Value Cleanup Targets

- Remove dead `@supports not (...)` blocks for features fully supported in current target browser.
- Remove obsolete vendor prefixes that do not affect current support matrix.
- Continue replacing date-only parsing hotspots that risk timezone drift.

## Priority Actions

1. Complete low-effort bundle wins (`d3-axis`, dead CSS fallback paths).
2. Finish medium-effort D3 replacement where parity is verified.
3. Keep expensive rewrites (raw IDB, deep D3 replacement) deprioritized unless measurable ROI appears.

## Audit Commands (Practical)

```bash
python3 scripts/check-doc-integrity.py
bash scripts/pristine-check.sh
python3 scripts/token-context-report.py --scope all-markdown --top 20
```

## Risk Controls

- Any replacement must preserve functional parity for key visualizations.
- Keep lazy-loading behavior for heavy visualization modules.
- Treat browser feature assumptions as testable contracts, not static truths.

## Note

This condensed reference replaces long dependency/catalog details to keep operational context lightweight.

# UI/UX Rebuild Risk Register

Status: Exploratory support doc for the dormant V2 UI draft. Not part of the current Rust-first release path.

| Risk | Impact | Mitigation | Owner |
|---|---|---|---|
| Shell boot complexity | Breaks PWA/data initialization; blank screens | Keep init in +layout, replace only visual shell; feature flag | UI |
| PWA banner regression | Install/update cues disappear | Keep PWA components outside new shell wrappers | UI |
| Performance regression | LCP/INP/CLS worsen | Maintain virtualization, limit heavy CSS effects, perf tests in CI | Perf |
| A11y regressions | WCAG failure, nav unusable | Preserve skip links, focus states, dialog patterns; run a11y tests | A11y |
| Data contract drift | UI expects shape changes | Keep view models stable; derive UI props in stores | Data |
| CSS cascade conflicts | V1 and V2 styles clash | Scope V2 to `.ui-v2` wrapper only | UI |
| Mobile nav usability | Popover/menu breaks | Keep popover or explicit mobile panel with aria | UI |

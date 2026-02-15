# Status Ledger

Last updated: 2026-02-15
Purpose: concise evidence and change log for current app status.

## Latest Verified Validation Entries
| Date | Command | Result | Key Output |
|---|---|---|---|
| 2026-02-15 | `npm run qa:rust-warning-drift` | PASS | warning_count `3` within baseline `3` (improved from baseline `4`) |
| 2026-02-15 | `npm run test:e2e` | PASS | `39 passed`, `1 skipped` (post-warning-fix verification) |
| 2026-02-15 | `npx playwright install webkit` | PASS | Installed local WebKit browser runtime (`webkit-2248`) |
| 2026-02-15 | `npm run test:e2e:all` | PASS | `40 passed`, `1 skipped` |
| 2026-02-15 | `npm run qa:docs-links` | PASS | Active docs local-link validation passed |
| 2026-02-15 | `npm run qa:docs-budget` | PASS | active docs within budget (`25000`) |
| 2026-02-15 | `npm run token:baseline` | PASS | active docs `31`, active est tokens `24,465`, archive files `83` |
| 2026-02-15 | `npm run qa:sim:ipad -- 2026-02-15` | PASS | Captured simulator evidence (`home/stories/tracker` + `http.log`) in docs archive |
| 2026-02-15 | `xcrun simctl boot + openurl + io screenshot` (iPad mini simulator, iOS 26.2) | PASS | Captured `home.png`, `stories.png`, `tracker.png` |
| 2026-02-15 | `xcrun xctrace list devices` | PASS | No physical iPad listed; only host Mac + simulators |
| 2026-02-15 | `npm run test:e2e:webkit` | PASS | `1 passed` |

Historical entries for 2026-02-13 through 2026-02-14 are archived in:
`docs/archive/reports/status-ledger-history-2026-02-13-to-2026-02-14.md`.

## Notable Test Signal
- Latest core regression run completed cleanly with `39 passed`, `1 skipped`.
- Latest cross-browser regression run completed cleanly with `40 passed`, `1 skipped`.
- Current iPad regression preflight run is documented in `docs/IPAD_REGRESSION_RUN_2026-02-15.md` with physical-device steps still pending.

## Change Entries
| Date | Change | Status |
|---|---|---|
| 2026-02-15 | Fixed 3 dead-code warnings (added `#[allow(dead_code)]` to debug utilities) and updated baseline from 4→3 | Completed |
| 2026-02-15 | Added reusable iPad simulator regression script (`qa:sim:ipad`) with archived evidence output path | Completed |
| 2026-02-15 | Added active docs link-check gate (`qa:docs-links`) and CI enforcement | Completed |
| 2026-02-15 | Added strict Rust warning-drift baseline gate (`qa:rust-warning-drift`) in CI | Completed |
| 2026-02-15 | Added docs token budget gate script + CI enforcement (`qa:docs-budget`) | Completed |
| 2026-02-15 | Archived full versions of largest active docs and replaced active files with summaries | Completed |
| 2026-02-15 | Added dated iPad regression run report with explicit physical-device blocker | Completed |
| 2026-02-15 | Moved root screenshot artifacts to `docs/archive/assets/root-screenshots/` | Completed |
| 2026-02-15 | Removed duplicate active docs in `docs/testing/` (archived copies retained) | Completed |
| 2026-02-15 | Removed duplicate report file from `docs/reports/` (archived copy retained) | Completed |
| 2026-02-15 | Added shared ignore rules for local build/QA artifacts in `.gitignore` | Completed |
| 2026-02-15 | Introduced canonical repo standing document (`docs/PROJECT_STANDING.md`) | Completed |

## Current Token Baseline
- Active docs: 31 files, 97,861 bytes, ~24,465 estimated tokens.
- Archive docs: 83 files, 774,662 bytes, ~193,665 estimated tokens.

## Next Validation Queue
1. Run physical iPad regression and record results.
2. Re-run `npm run test:e2e:all` after next runtime-affecting change.
3. Keep `npm run qa:docs-budget` green after docs updates.

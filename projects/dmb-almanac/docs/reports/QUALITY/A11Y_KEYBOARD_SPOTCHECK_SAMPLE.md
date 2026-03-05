# A11y Keyboard Spot-Check (2026-02-15)

Generated: 2026-02-15 14:21:57
Operator: louisherman
Base URL: http://127.0.0.1:3000
Reachable: YES

## Global Checks

- [ ] Skip-link is visible on first Tab and moves focus to main content.
- [ ] Focus ring is visible for interactive controls.
- [ ] No keyboard trap on tested routes.
- [ ] Enter/Space activates actionable controls.
- [ ] Shift+Tab reverse navigation works predictably.

## Route Matrix

| Route | Keyboard Path | Skip-Link | Focus Visibility | Focus Order | No Trap | Result | Notes |
|---|---|---|---|---|---|---|---|
| `/` | Tab -> main controls -> footer | PASS/FAIL | PASS/FAIL | PASS/FAIL | PASS/FAIL | PASS/FAIL | |
| `/shows` | Tab -> main controls -> footer | PASS/FAIL | PASS/FAIL | PASS/FAIL | PASS/FAIL | PASS/FAIL | |
| `/songs` | Tab -> main controls -> footer | PASS/FAIL | PASS/FAIL | PASS/FAIL | PASS/FAIL | PASS/FAIL | |
| `/venues` | Tab -> main controls -> footer | PASS/FAIL | PASS/FAIL | PASS/FAIL | PASS/FAIL | PASS/FAIL | |
| `/guests` | Tab -> main controls -> footer | PASS/FAIL | PASS/FAIL | PASS/FAIL | PASS/FAIL | PASS/FAIL | |
| `/tours` | Tab -> main controls -> footer | PASS/FAIL | PASS/FAIL | PASS/FAIL | PASS/FAIL | PASS/FAIL | |
| `/releases` | Tab -> main controls -> footer | PASS/FAIL | PASS/FAIL | PASS/FAIL | PASS/FAIL | PASS/FAIL | |
| `/stats` | Tab -> main controls -> footer | PASS/FAIL | PASS/FAIL | PASS/FAIL | PASS/FAIL | PASS/FAIL | |
| `/search` | Tab -> main controls -> footer | PASS/FAIL | PASS/FAIL | PASS/FAIL | PASS/FAIL | PASS/FAIL | |
| `/visualizations` | Tab -> main controls -> footer | PASS/FAIL | PASS/FAIL | PASS/FAIL | PASS/FAIL | PASS/FAIL | |

## Findings

- Critical:
- Major:
- Minor:

## Follow-ups

1. 
2. 

## Sign-off

- [ ] Manual keyboard-only spot-check completed.
- [ ] Failures triaged and linked.
- [ ] Report attached to release gate.

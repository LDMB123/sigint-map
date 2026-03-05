# Accessibility Keyboard Spot-Check Runbook

Repo: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac`

Goal: run a repeatable manual keyboard-only accessibility spot-check for top public routes before release.

## Scope

- Keyboard-only navigation (no mouse).
- Focus visibility and focus order.
- Landmark and heading sanity checks.
- Top-value routes only (fast release gate).

## Preconditions

1. Start the Rust app:
   - `cd /Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac/rust`
   - `cargo run -p xtask -- build-hydrate-pkg`
   - `cargo run -p dmb_server`
2. Confirm app is reachable:
   - `curl -fsS http://127.0.0.1:3000/ >/dev/null`
3. Use a clean browser profile if possible.

## Generate Spot-Check Report

From repo root:

- `bash scripts/a11y-keyboard-spotcheck.sh`

Optional:

- `bash scripts/a11y-keyboard-spotcheck.sh --base-url http://127.0.0.1:3000 --operator "<name>"`
- `bash scripts/a11y-keyboard-spotcheck.sh --output docs/reports/QUALITY/A11Y_KEYBOARD_SPOTCHECK_SAMPLE.md --force`

The script creates a dated report template in `docs/reports/QUALITY/`.

## Manual Procedure

For each route in the generated checklist:

1. Open route directly in browser.
2. Press `Tab` from page start.
3. Verify skip-link appears and can move focus to main content.
4. Continue tabbing through interactive elements:
   - focus ring/indicator is visible,
   - focus order is logical,
   - no keyboard trap,
   - Enter/Space activates controls.
5. Use `Shift+Tab` to verify reverse focus path.
6. Confirm main heading intent is clear (`h1` first content heading).
7. Record `PASS`/`FAIL` with short notes.

## Minimum Pass Criteria

- All global keyboard checks pass.
- No critical route has keyboard trap.
- No critical route lacks visible focus indication.
- No critical route blocks primary actions from keyboard only.

## Failure Triage

- `Critical`: keyboard trap, inaccessible core action, broken skip-link.
- `Major`: focus order confusion that risks incorrect action.
- `Minor`: non-blocking inconsistencies in secondary controls.

For `Critical` or repeated `Major` findings:

1. Open issue with route, reproduction steps, expected vs actual behavior.
2. Link generated spot-check report.
3. Block release until fixed or explicitly waived.

## Artifacts

- Latest manual report:
  - `docs/reports/QUALITY/A11Y_KEYBOARD_SPOTCHECK_SAMPLE.md`
- Automated baseline test:
  - `rust/crates/dmb_app/tests/a11y_routes.rs`

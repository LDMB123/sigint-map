# Accessibility Audit Summary

This summary is the current accessibility entry point for the Rust-first app.
Older audits that referenced removed UI prototypes are historical and should not override the baseline below.

## Current Status

- Automated SSR accessibility baseline now exists for top routes:
  - `rust/crates/dmb_app/tests/a11y_routes.rs`
- Manual keyboard-only spot-check runbook is available:
  - `docs/ops/A11Y_KEYBOARD_SPOTCHECK_RUNBOOK.md`
- Spot-check report template generator is available:
  - `scripts/a11y-keyboard-spotcheck.sh`

## Remaining Work

- Full keyboard-only pass across primary routes
- Screen reader pass (VoiceOver/NVDA)
- Focus-management review for navigation and dialogs
- Color-contrast and text-sizing review

## Where New Audit Material Belongs

- Dated accessibility audits: `docs/audits/accessibility/`
- Operational keyboard checks: `docs/ops/A11Y_KEYBOARD_SPOTCHECK_RUNBOOK.md`

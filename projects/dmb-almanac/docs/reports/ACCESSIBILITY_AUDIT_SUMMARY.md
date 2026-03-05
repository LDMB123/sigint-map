# Accessibility Audit Summary

This repo is currently Rust-first and local-only. Older accessibility audits that referenced removed UI prototypes are intentionally not treated as current guidance.

## Current Status

- Automated SSR accessibility baseline now exists for top routes:
  - `rust/crates/dmb_app/tests/a11y_routes.rs`
- Manual keyboard-only spot-check runbook is available:
  - `docs/ops/A11Y_KEYBOARD_SPOTCHECK_RUNBOOK.md`
- Spot-check report template generator is available:
  - `scripts/a11y-keyboard-spotcheck.sh`
- A full WCAG audit summary is still pending and should replace this placeholder summary before broad publish.

## Suggested Next Audit Inputs

- Keyboard-only navigation for all primary routes
- Screen reader pass (VoiceOver/NVDA)
- Focus management for navigation and dialogs
- Color contrast and text sizing

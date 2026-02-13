# Blaire's Kind Heart

Offline-first kindness PWA for a 4-year-old.
Target device: iPad mini 6 (A15, 4GB RAM), iPadOS 26.2, Safari 26.2.

## Current Status (2026-02-13)
- Core web build: green on latest verified run.
- End-to-end suite: green on latest verified run.
- PWA health: green on latest verified run.
- Whole-app simplification plan: complete (Wave 7 closed).
- `pwa:health` script has been hardened to be server-agnostic for local execution.
- Physical iPad regression pass: pending.

## Canonical Commands
```bash
# Dev
trunk serve

# Release build
trunk build --release

# PWA health (managed local server in script)
trunk build
npm run pwa:health

# E2E gate
npm run test:e2e:all

# Docs token baseline
npm run token:baseline
```

## Project Surfaces in This App
1. Rust/WASM runtime (`Cargo.toml`).
2. Node/Playwright validation tooling (`package.json`).

## Current Documentation Entry Points
- `docs/APP_STATUS.md` - authoritative engineering snapshot.
- `docs/STATUS_LEDGER.md` - command evidence and change ledger.
- `docs/PWA_STATUS.md` - service worker and offline behavior state.
- `docs/TOKEN_ECONOMY_REPORT.md` - token-economy orchestrator findings.
- `docs/TOKEN_OPTIMIZATION.md` - active token budget governance.
- `docs/AUTONOMOUS_WHOLE_APP_SIMPLIFICATION_PLAN.md` - wave-based simplification execution plan.
- `docs/simplification-contracts.md` - frozen no-breakage contract (exports, storage, metrics).
- `docs/CODEX_WORKING_CONTEXT_PLAN.md` - persistent resume context and next-action order.

Last updated: 2026-02-13

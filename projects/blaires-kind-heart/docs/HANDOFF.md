# Handoff Runbook

Last updated: 2026-03-03 (session 15)

## Fast Takeover Checklist

1. Read `CLAUDE.md` — project scope, tech stack, commands
2. Read `docs/STATUS_LEDGER.md` — latest QA gate results
3. Run `npm run test:e2e` to verify build is green

## Key Commands

```bash
# Development
trunk serve

# Production build
trunk build --release

# iPad testing (serve over network)
trunk serve --address 0.0.0.0

# Full QA suite
npm run qa:runtime
npm run qa:pwa-contract
npm run qa:db-contract
npm run test:e2e
npm run qa:rust-warning-drift
npm run qa:docs-budget
npm run qa:docs-links
```

## Architecture Notes

- All logic in Rust → WASM. No JS frameworks.
- 5 JS files only: `wasm-init.js`, `public/sw.js`, `public/db-worker.js`, `public/offline.js`, `public/runtime-diagnostics.js`
- SQLite stored in OPFS, access serialized via Web Locks
- State: `thread_local! { static STATE: RefCell<AppState> }`
- DOM: event delegation via data-* attributes, Trusted Types enforced

## Critical Patterns

- `dom::with_buf()` is NOT reentrant — never call `dom::query_data()` from inside a `with_buf()` closure
- DB writes use fire-and-forget or `exec_fire_and_forget()` — check `browser_apis::with_web_lock` for serialized writes
- Service worker v80 current; v74+ required for runtime diagnostics contract

## Files to Know

- `rust/lib.rs` — app boot and init sequence
- `rust/state.rs` — AppState definition
- `rust/dom.rs` — DOM utilities (with_buf, query, etc.)
- `rust/db_client.rs` — SQLite async client
- `rust/navigation.rs` — panel navigation and view transitions

## Current State (2026-03-03)

**All code quality, polish, and QA passes complete (sessions 6-15).**

- **Session 15**: Debug & code review — deep source audit with 3 parallel agents found 7 potential issues, 4 dismissed as false positives (ISO week math, SQL interpolation, image handler, GPU races). Applied 3 defensive fixes: storage quota `.max(1.0)` guard, stale year defaults `2025→2026`, visual snapshot refresh. All gates PASS.
- **Session 14**: Comprehensive audit — 4 parallel deep audits (audio/speech, animation/RAF, edge-case logic, SW/offline). All clean, no new bugs. Fixed DB contract QA gate regression from session 12's helper deduplication. All 8 QA gates PASS.
- **Session 13**: Deep audit — 6 parallel audits across all layers found 15 issues. Fixed: 4 CSS (mom scroll, badge font, header z-index, touch-action), 4 JS (deserialize flags, seed rollback, stmt cache), 6 Rust (streak hearts, limit 365, db_client hangup, timer inflation, nav debounce). SW v80. 64 E2E PASS.
- **Session 12**: Pre-deploy verify — SW cache audit found 5 uncached assets + 1 stale ref (fixed, SW v79). Bundle audit (15 MB total, acceptable). Rust safety clean (2 justified unsafe, zero panics). E2E quality: fixed 1 silent-pass assertion, deduplicated 4 helper functions across 6 spec files (-87 lines).
- **Session 11**: Deep pass — 8 commits: removed redundant INP/LCP observers, fixed missing asset refs + CSS token, hardened db-worker (deserialize check, init race, error formatting), fixed SW undefined respondWith fallback + deferred asset blocking activation, eliminated all `.expect()`/`.unwrap()` from Rust (zero remaining), consolidated selectors to constants.rs, gated web_vitals console.log, SW v78
- **Session 10**: 10x deep pass — 7 analysis areas (borrow safety, closure leaks, async correctness, game state reset, overflow, silent .ok(), DB layer). All clean except one real bug: timer leak in `game_memory.rs` `start_timer()`/`reset_hint_timer()` when called after cleanup via peek timeout. Fixed with `is_some_and(|g| g.active)` guards. Clippy + deep code quality commits also landed.
- **Session 9**: Pre-deploy polish — expanded companion speech variety, wired Show Mom celebration button, added heart counter pop animation, SW v76, iPad regression template
- **Session 8**: CSS optimization — 6 commits, 13 files, -736 lines (dead CSS, tokenization, webkit cleanup)
- **Session 7**: Rust refactoring — 15 commits, 47 files, eliminated ~20 forwarding/duplicate wrappers
- **Session 6**: Code review — 11 correctness fixes, 8 security fixes, 19 new E2E tests (64 total)

**All gates green:** 64 E2E PASS (1 expected skip), visual 16/16 PASS, QA runtime/pwa/db PASS.

**Outstanding**: Physical iPad mini 6 (iPadOS 26.2 / Safari 26.2) regression testing before final deployment. See `docs/IPAD_REGRESSION_TEMPLATE.md` for checklist. No other blockers.

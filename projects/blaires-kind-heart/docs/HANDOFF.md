# Handoff Runbook

Last updated: 2026-02-28 (session 5)

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
- 3 JS files only: `wasm-init.js`, `public/sw.js`, `public/db-worker.js`
- SQLite stored in OPFS, access serialized via Web Locks
- State: `thread_local! { static STATE: RefCell<AppState> }`
- DOM: event delegation via data-* attributes, Trusted Types enforced

## Critical Patterns

- `dom::with_buf()` is NOT reentrant — never call `dom::query_data()` from inside a `with_buf()` closure
- DB writes use fire-and-forget or `exec_fire_and_forget()` — check `browser_apis::with_web_lock` for serialized writes
- Service worker v74+ required for runtime diagnostics contract

## Files to Know

- `rust/lib.rs` — app boot and init sequence
- `rust/state.rs` — AppState definition
- `rust/dom.rs` — DOM utilities (with_buf, query, etc.)
- `rust/db_client.rs` — SQLite async client
- `rust/navigation.rs` — panel navigation and view transitions

## Current State (2026-02-28)

**Safari 26.2 debug & optimization pass complete (session 4).** 11 static-analysis issues fixed:
- `scheduler_yield()` now calls real `scheduler.yield()` via JS reflection (queueMicrotask fallback)
- Catcher game loop: `setInterval(16ms)` → RAF with delta-time physics; gravity frame-rate-independent
- Companion typewriter: 30–60 DOM queries per phrase reduced to 1 (cache element before loop)
- SW `clients.claim()` fires immediately on activate (not after 60 deferred WebP downloads)
- `db-worker.js` `request_id = 0` default on all message types; `wasm-init.js` `arrayBuffer()` fallback
- iPad mini 6 splash PNGs added (`assets/icons/splash-1488x2266.png`, `splash-2266x1488.png`)
- Trusted Types audit: `default` policy confirmed registered; sqlite-wasm confirmed safe

**All gates green:** 46 E2E PASS, visual 16/16 PASS, QA runtime/pwa/db PASS. Merge: `71ee341`.

**Also complete (session 3):** Dead code + feature audit — Rust 80 files clean, CSS dead class refs removed, orphaned `public/wasm-init.js` deleted.

**Also complete (session 2):** Extreme UI/UX polish — all 16 CSS files (gloss layers, 3D press, gradient text, richer shadows).

**Outstanding**: Physical iPad mini 6 (iPadOS 26.2 / Safari 26.2) regression testing before final deployment. No other blockers.

# Handoff Runbook

Last updated: 2026-02-27

## Fast Takeover Checklist

1. Read `CLAUDE.md` — project scope, tech stack, commands
2. Read `docs/APP_STATUS.md` — current app state and device targets
3. Read `docs/STATUS_LEDGER.md` — latest QA gate results
4. Run `npm run test:e2e` to verify build is green

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

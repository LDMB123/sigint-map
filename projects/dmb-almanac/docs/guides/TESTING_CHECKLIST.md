# Testing Checklist (Rust-First)

This repo is Rust-first and local-only (offline PWA). Older test steps for the removed UI implementation have been deleted to keep the docs and repo structure consistent.

## Fast Gate (Recommended)

```bash
bash scripts/cutover-rehearsal.sh
```

What it covers (high-signal, Rust-only):
- Rust server boots with a fresh runtime SQLite in `.tmp/`
- Rust-only Playwright E2E subset runs from `e2e/`
- Import completion and IDB repair paths are exercised

## Rust Unit/Integration Tests

```bash
cd rust
cargo test
```

Focused gates (if you want to run them explicitly):

```bash
cd rust
cargo test -p dmb_app --test route_parity
```

## Rust E2E (Playwright)

```bash
cd e2e
npm ci
BASE_URL=http://127.0.0.1:3000 npm run test:e2e -- --project=chromium --workers=1
```

## Manual Smoke (Local)
1. Build hydrate package and start server: `cd rust && cargo run -p xtask -- build-hydrate-pkg && cargo run -p dmb_server`
2. Visit `http://127.0.0.1:3000`
3. Confirm:
   - PWA Status panel reports Online
   - Offline data hydration/import completes
   - Search works
   - Service worker update prompt appears after a rebuild/restart (optional)

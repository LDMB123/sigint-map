# DMB Almanac

Dave Matthews Band concert database PWA, Rust-first and local-only (offline-first).

## Quick Start

```bash
# Runs the “green gate” locally (data release + server + E2E subset)
bash scripts/cutover-rehearsal.sh
```

Or run the server directly:

```bash
cd rust
cargo run -p dmb_server
```

## Repo Layout

- `rust/` Rust workspace (SSR + hydration app, server, pipeline, IndexedDB, WASM)
- `data/` SQLite source DB and generated artifacts
- `e2e/` Playwright E2E tests
- `docs/` Documentation (see `docs/INDEX.md`)

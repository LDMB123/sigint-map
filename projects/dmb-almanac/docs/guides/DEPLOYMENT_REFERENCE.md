# DMB Almanac Deployment Reference (Rust-First)

This repo is Rust-first and local-only (offline PWA). Older deployment notes for the removed UI implementation have been deleted to keep the docs and repo structure consistent.

## Prerequisites
- Rust toolchain (stable) and `cargo`
- Node.js v20+ and npm (for the `e2e/` Playwright harness)

```bash
rustc --version
cargo --version
node --version
npm --version
```

## Quick Start (Local)
Run the Rust server:

```bash
cd rust
cargo run -p dmb_server
```

Recommended local cutover gate (starts server, builds runtime SQLite into `.tmp/`, runs Rust-only E2E subset):

```bash
cd ..
bash scripts/cutover-rehearsal.sh
```

## Server Environment Variables
Primary runtime knobs for local/staging:

```bash
# Bind address for the Rust server (full socket address)
DMB_SITE_ADDR=127.0.0.1:3000

# Common hosting convention: override port only
PORT=3000
# or:
DMB_PORT=3000

# SQLite path for server-side queries (optional)
DMB_SQLITE_PATH=./data/dmb-almanac.db

# Logging
RUST_LOG=info
```

## Data Inputs
- Canonical static seed data (used by cutover scripts/pipeline): `data/static-data`
- Default SQLite location (when present): `data/dmb-almanac.db`

## Rust E2E (Playwright)
The Rust-only Playwright harness lives in `e2e/`:

```bash
cd e2e
npm ci
BASE_URL=http://127.0.0.1:3000 npm run test:e2e -- --project=chromium --workers=1
```

## Operational Runbook
- Cutover runbook: `docs/ops/CUTOVER_RUNBOOK.md`
- Canonical repo status checkpoint: `STATUS.md`

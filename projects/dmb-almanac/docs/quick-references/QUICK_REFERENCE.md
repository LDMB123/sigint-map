# Quick Reference (Rust-first Local PWA)

## Common Commands

```bash
# Full local cutover rehearsal (data release + server + E2E subset)
bash scripts/cutover-rehearsal.sh

# Run the Rust server (dev)
cd rust
cargo run -p dmb_server
```

## Data Release

Static data bundle lives under `rust/static/data/` and is served at `/data/*`.

```bash
cd rust

# Generate AI config + manifest (and other release steps handled by xtask)
cargo run -p xtask -- data-release --sqlite ../data/dmb-almanac.db
```

## Storage / Databases

- SQLite source DB (pipeline input): `data/dmb-almanac.db`
- IndexedDB runtime DB (client): schema + APIs in `rust/crates/dmb_idb`
- Parity checks:

```bash
cd rust
cargo run -p dmb_pipeline -- validate-parity \
  --manifest static/data/manifest.json \
  --sqlite ../data/dmb-almanac.db
```

## Project Layout

```text
dmb-almanac/
  rust/                 Rust workspace (app, server, pipeline, idb, wasm)
  data/                 SQLite + generated artifacts (warning reports, etc.)
  e2e/                  Playwright E2E tests (including SW update flows)
  scripts/              Cutover + helper scripts
  docs/                 Documentation (Rust-first)
```

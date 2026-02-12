# DMB Almanac Context Pack (For A New LLM Session)

Repo: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac`

This repo is Rust-first and local-only (offline PWA).

## What Matters

- SSR + hydration correctness (avoid any SSR/CSR mismatch)
- Service Worker update reliability (avoid stale bundle loops)
- Offline hydration/import correctness (IndexedDB)
- Data parity between shipped static bundle and the SQLite source DB

## Key Commands

```bash
# Green gate
bash scripts/cutover-rehearsal.sh

# Rust verify gate
cd rust
cargo run -p xtask -- verify

# Run server
cargo run -p dmb_server
```

## Key Locations

- App + UI: `rust/crates/dmb_app/`
- Server: `rust/crates/dmb_server/`
- IndexedDB schema + client: `rust/crates/dmb_idb/`
- Pipeline (scrape/export/validate/parity): `rust/crates/dmb_pipeline/`
- Static data bundle: `rust/static/data/`
- E2E tests: `e2e/`

# DMB Almanac (Rust-first) Developer Runbook

## Quick Commands

```bash
# Full local gate (data release + server + E2E subset)
bash scripts/cutover-rehearsal.sh

# Run server
cd rust
cargo run -p dmb_server

# Rust verification gate (fmt, clippy, hydrate pkg build, tests)
cargo run -p xtask -- verify
```

## Docs

- Docs index: `docs/INDEX.md`
- Deployment: `docs/guides/DEPLOYMENT_REFERENCE.md`
- Cutover runbook: `docs/ops/CUTOVER_RUNBOOK.md`
- Scraping (Rust pipeline): `docs/scraping/SCRAPING_REFERENCE.md`
- IndexedDB schema reference: `docs/references/DATABASE_SCHEMA_REFERENCE.md`

## Project Structure

- Rust workspace: `rust/`
- Offline data inputs/artifacts: `data/`
- E2E tests: `e2e/`

## Notes

- The app is local-only right now; treat Service Worker and offline data integrity as first-class release criteria.

# Dataset Bundle Strategy

## Files
- `data/static-data/manifest.json` — canonical manifest (counts + checksums)
- `data/static-data/*.json` allowlist — runtime-seeded data corpus
- Optional AI assets in `data/static-data/` (ANN index files and embedding manifest/chunk files)

## Storage
- For the Rust-first app, the primary offline store is IndexedDB (seeded from `rust/static/data/*`).
- The pipeline now enforces a strict data-file allowlist instead of bundle/index artifacts.

## Versioning & Integrity
- `manifest.version` is pinned to `CORE_SCHEMA_VERSION`
- each manifest file entry includes checksum + size (+ optional row counts)
- unsupported files are rejected during manifest validation

## Loader
- Rust import/hydration logic: `rust/crates/dmb_app/src/data.rs`
- The Rust app serves the mirrored data set at `/data/*` from `rust/static/data/*`.

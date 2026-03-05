# Data Bundle Reference

**Purpose**: compact reference for the static JSON corpus seeded into IndexedDB.

## Canonical Source

- Checked-in canonical dataset: `data/static-data/`
- Runtime-served mirror used by the Rust app: `rust/static/data/`

## Required Files

- `data/static-data/manifest.json` - dataset manifest (record counts, sizes, checksums)
- `data/static-data/ai-config.json` - AI/runtime tuning config
- `data/static-data/venues.json`
- `data/static-data/songs.json`
- `data/static-data/tours.json`
- `data/static-data/shows.json`
- `data/static-data/setlist-entries.json`
- `data/static-data/guests.json`
- `data/static-data/guest-appearances.json`
- `data/static-data/liberation-list.json`
- `data/static-data/song-statistics.json`
- `data/static-data/releases.json`
- `data/static-data/release-tracks.json`
- `data/static-data/curated-lists.json`
- `data/static-data/curated-list-items.json`

## Optional AI Assets

If generated for AI diagnostics/search acceleration, these may exist in
`data/static-data/` and `rust/static/data/`:

- ANN index artifacts (JSON/IVF/BIN variants)
- Embedding manifest and embedding chunk artifacts
- Optional embedding sample artifacts

## Loader + Integrity

- Rust import/hydration logic: `rust/crates/dmb_app/src/data.rs`
- Manifest generation/validation: `rust/crates/dmb_pipeline/src/main.rs`
- Export generation: `rust/crates/dmb_pipeline/src/export.rs`

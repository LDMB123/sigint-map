# Data Bundle Reference

**Purpose**: compact reference for the static JSON corpus seeded into IndexedDB.

## Canonical Files (`data/static-data`)
- `manifest.json` - dataset manifest (record counts, sizes, checksums)
- `ai-config.json` - AI/runtime tuning config
- `venues.json`
- `songs.json`
- `tours.json`
- `shows.json`
- `setlist-entries.json`
- `guests.json`
- `guest-appearances.json`
- `liberation-list.json`
- `song-statistics.json`
- `releases.json`
- `release-tracks.json`
- `curated-lists.json`
- `curated-list-items.json`

## Optional AI Assets
- `ann-index.json`
- `ann-index.bin`
- `ann-index.ivf.json`
- `embedding-manifest.json`
- `embedding-chunk-*.json`
- `embedding-sample.json`

## Loader + Integrity
- Rust import/hydration logic: `rust/crates/dmb_app/src/data.rs`
- Manifest generation/validation: `rust/crates/dmb_pipeline/src/main.rs`
- Export generation: `rust/crates/dmb_pipeline/src/export.rs`

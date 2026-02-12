# Dataset Bundle Strategy

## Files
- `data/static-data/bundle.json` — read-only corpus payload (canonical source)
- `data/static-data/index.json` — lookup indexes + checksum (canonical source)
- Both are also compressed (`.br` + `.gz`) as release artifacts.

## Storage
- For the Rust-first app, the primary offline store is IndexedDB (seeded from `rust/static/data/*`).
- The bundle + index remain useful for integrity checks and (optional) client-side search acceleration.

## Index Contents
- `slug_to_id.songs`: song slug → song ID
- `slug_to_id.venues`: venue ID (string) → venue ID
- `slug_to_id.shows`: show date → array of show IDs
- `slug_to_id.guests`: guest slug → guest ID
- `slug_to_id.tours`: tour year → tour ID
- `year_index.shows`: year → show IDs
- `song_entry_index` + `song_entry_offsets`: setlist entries by song
- `show_entry_index` + `show_entry_offsets`: setlist entries by show
- `venue_show_index`: shows by venue ID
- `tour_show_index`: shows by tour ID

## Versioning & Integrity
- `bundle.version` and `index.version` are pinned to the corpus release date
- `index.bundleSha256` must match the downloaded `bundle.json`
- Loader rejects checksum mismatch and retries from network

## Loader
- Rust import/hydration logic: `rust/crates/dmb_app/src/data.rs`
- The Rust app serves the mirrored data set at `/data/*` from `rust/static/data/*`.

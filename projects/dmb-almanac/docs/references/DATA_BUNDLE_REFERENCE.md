# Data Bundle Reference

**Purpose**: Compact reference for bundled JSON corpus + indexes (avoid loading large data files into context)

**Version**: bundle/index 2026-02-04 (see `data/static-data/bundle.json`, `data/static-data/index.json`)

---

## Canonical Files
- `data/static-data/bundle.json` (+ `.br`/`.gz`) - master corpus payload
- `data/static-data/index.json` (+ `.br`/`.gz`) - lookup indexes + checksum
- `data/static-data/manifest.json` - dataset manifest (record counts, sizes)

## Bundle Top-Level Keys
- version
- generatedAt
- songs
- shows
- venues
- tours
- guests
- guestAppearances
- releases
- releaseTracks
- liberationList
- setlistEntries

## Index Top-Level Keys
- version
- generatedAt
- bundleSha256
- counts
- slug_to_id
- year_index
- song_entry_index
- song_entry_offsets
- show_entry_index
- show_entry_offsets
- venue_show_index
- tour_show_index

## Index Notes
- counts: guestAppearances, guests, liberationList, releaseTracks, releases, setlistEntries, shows, songs, tours, venues
- slug_to_id: lookup maps for songs, venues, shows, guests, tours
- * entry indexes: packed indices + offsets for fast slicing

## Standalone Data Files (`data/static-data`)
- manifest.json - dataset manifest (record counts, sizes, paths)
- songs.json - full song catalog (also in bundle.songs)
- shows.json - show list (also in bundle.shows)
- setlist-entries.json - per-song per-show entries (also in bundle.setlistEntries)
- show-details.json - expanded show info (large)
- venues.json - venue list (also in bundle.venues)
- tours.json - tour list (also in bundle.tours)
- guests.json - guest list (also in bundle.guests)
- guest-appearances.json - guest appearances (also in bundle.guestAppearances)
- releases.json - releases (also in bundle.releases)
- release-tracks.json - release tracks (also in bundle.releaseTracks)
- liberation-list.json - liberation list (also in bundle.liberationList)
- curated-lists.json / curated-list-items.json - editorial lists
- song-statistics.json / song-stats.json - analytics
- recent-shows.json - recency subset
- this-day-in-history.json - day-of-year index
- venue-top-songs.json - large aggregate by venue

## Loader + Integrity
- Rust import/hydration logic: `rust/crates/dmb_app/src/data.rs`
- REQUIRED_SCHEMA_VERSION: 2026-02-04
- Checksum: index.bundleSha256 must match bundle.json
- Compression artifacts (`.br`/`.gz`) are treated as release outputs.

## Usage Guidance
- Prefer bundle + index via corpus loader for queries
- Avoid loading full JSON into context; use references or sample slices
- Use rust/static/data only for pipeline verification

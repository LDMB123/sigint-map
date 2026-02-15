# Database Schema Reference (Rust-first IndexedDB)

This project’s offline database is IndexedDB. The schema is defined and enforced by the Rust client via `dmb_idb`.

## Canonical Schema Source

- Store + index definitions: `rust/crates/dmb_idb/src/schema.rs`
- Store creation + upgrade logic: `rust/crates/dmb_idb/src/lib.rs`
- IDB-to-SQLite parity mapping: `rust/crates/dmb_core/src/parity.rs`

## Database Names / Versioning

- Current DB: `dmb-almanac-rs` (`DB_NAME`)
- Prior DB name (for migration/cleanup tooling): `dmb-almanac` (`PREVIOUS_DB_NAME`)
- Current schema version: `DB_VERSION` (bump this when `SCHEMA_V12_REFERENCE` changes)

`dmb_idb::open_db()` registers an `on_upgrade_needed` handler. On upgrade it creates any missing object stores and indexes described by `SCHEMA_V12_REFERENCE`.

## Stores (Object Stores)

The store list below is sourced from `SCHEMA_V12_REFERENCE`:

- `venues`
- `songs`
- `tours`
- `shows`
- `setlistEntries`
- `guests`
- `guestAppearances`
- `liberationList`
- `songStatistics`
- `releases`
- `releaseTracks`
- `syncMeta`
- `userAttendedShows`
- `userFavoriteSongs`
- `userFavoriteVenues`
- `curatedLists`
- `curatedListItems`
- `offlineMutationQueue`
- `telemetryQueue`
- `pageCache`
- `scrapeCache`
- `scrapeSyncQueue`
- `scrapeImportLog`
- `embeddingChunks`
- `embeddingMeta`
- `annIndex`

## Schema String Syntax

`SCHEMA_V12_REFERENCE` uses a Dexie-style schema string that `dmb_idb` parses to create IndexedDB stores/indexes:

- Primary key:
  - `&field` = primary key on `field` (no auto-increment)
  - `++field` = auto-increment primary key on `field`
- Secondary indexes:
  - `field` = non-unique index on `field`
  - `&field` = unique index on `field`
  - `[a+b]` = compound index on `(a, b)`
  - Prefix `*` = multi-entry index (array values)

## Debugging / Parity Checks

The pipeline can compare the static data bundle against the runtime SQLite DB:

```bash
cd rust
cargo run -p dmb_pipeline -- validate-parity \
  --manifest static/data/manifest.json \
  --sqlite ../data/dmb-almanac.db \
  --strict-manifest \
  --strict-tables
```

For migration regression tests:

- Browser migration tests: `rust/crates/dmb_idb/tests/migration.rs`

To validate query plans and index usage on the generated runtime SQLite:

```bash
bash scripts/db-query-plan-audit.sh rust/.tmp/dmb-runtime.db
```

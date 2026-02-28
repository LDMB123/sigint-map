# Persistence Contract

Defines the invariants that must hold between the Rust client (`db_client.rs`),
the JS worker (`public/db-worker.js`), and the Mom Mode export/restore flow
(`rust/mom_mode.rs`). Verified by `npm run qa:db-contract`.

## Worker Protocol

The Rust client and the DB worker communicate via a versioned message protocol.
`DB_WORKER_API_VERSION` must match on both sides:

- **Rust** (`rust/db_messages.rs`): `DB_WORKER_API_VERSION: u16 = 1`
- **Worker** (`public/db-worker.js`): `self.DB_WORKER_API_VERSION = 1`

If the client version is below `DB_WORKER_MIN_CLIENT_API_VERSION`, the worker
rejects the connection and the app shows a hard error.

## Schema Version

The worker tracks `meta.schema_version` in the `meta` table. On every open:

1. Read the stored `meta.schema_version`.
2. If stored version > `DB_SCHEMA_VERSION` → throw (downgrade protection).
3. Apply any pending migrations in order.
4. Write the new `meta.schema_version`.

## Export Contract

Mom Mode surfaces three data-export actions in the dashboard:

- **Export JSON** (`data-mom-export-json`): Full snapshot of all tables.
  Filename: `blaires-kind-heart-export-<date>.json`.
  The payload includes `export_format_version: 1`.
  `parent_pin` is excluded from the exported settings rows
  (`SELECT key, value FROM settings WHERE key != 'parent_pin'`).

- **Export Acts CSV** (`data-mom-export-csv`): Kind-acts log only.
  Filename: `blaires-kind-heart-kind-acts-<date>.csv`.
  Columns: `id,category,description,hearts_earned,created_at,day_key,reflection_type,emotion_selected,bonus_context,combo_day`.

## Restore Contract

- **Restore JSON** (`data-mom-restore-json`): Re-imports a previously exported
  snapshot via `data-mom-restore-input` (hidden `<input type="file">`).
- Dispatches `restore_snapshot_for_test` / `db_client::restore_snapshot` which
  sends a `Restore` request to the worker.
- The worker calls `restoreFromSnapshot(snapshotJson)`, deletes all rows, and
  re-inserts from the snapshot.
- `parent_pin` in settings is preserved across restores
  (`DELETE FROM settings WHERE key != 'parent_pin'`).
- After import, `writeSchemaVersion(db, DB_SCHEMA_VERSION)` re-stamps the
  schema version.

## QA Gate

Run `npm run qa:db-contract` to verify all static + runtime invariants listed
above. The check covers source patterns in `db-worker.js`, `db_messages.rs`,
`offline_queue.rs`, `errors/reporter.rs`, `mom_mode.rs`, and this document.

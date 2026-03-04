# Persistence Contract

Last updated: 2026-03-04

Defines the invariants that must hold between the Rust client (`db_client.rs`),
the JS worker (`public/db-worker.js`), and the Mom Mode export/restore flow
(`rust/mom_mode.rs`). Verified by `npm run qa:db-contract`.

## Worker Protocol

The Rust client and DB worker communicate via a versioned message protocol.
Version constants are now sourced from:

- Source-of-truth: `config/db-contract.json`
- Generated Rust constants: `rust/db_contract_generated.rs` (included by `rust/db_messages.rs`)
- Generated JS constants: `public/db-contract.js` (imported by `public/db-worker.js`)

`DB_WORKER_API_VERSION` and `DB_WORKER_MIN_CLIENT_API_VERSION` must stay aligned
across Rust and JS via the generated files.

If the client version is below `DB_WORKER_MIN_CLIENT_API_VERSION`, the worker
rejects the connection and the app shows a hard error.

## Schema Version

The worker tracks `meta.schema_version` in the `meta` table. On every open:

1. Read the stored `meta.schema_version`.
2. If stored version > `DB_SCHEMA_VERSION` → throw (downgrade protection).
3. Apply any pending migrations in order.
4. Write the new `meta.schema_version`.

Current contract baseline is **schema v2** (`DB_SCHEMA_VERSION=2`) with:

- `kind_acts.canonical_category` (canonical analytics path)
- `skill_aliases` table (legacy-to-canonical mapping)
- `stories_progress.unlock_tier` and `weekly_insights.skill_breakdown`

## Export Contract

Mom Mode surfaces three data-export actions in the dashboard:

- **Export JSON** (`data-mom-export-json`): Full snapshot of all tables.
  Filename: `blaires-kind-heart-export-<date>.json`.
  The payload includes `export_format_version: EXPORT_FORMAT_VERSION` and
  `schema_version: DB_SCHEMA_VERSION` (from generated Rust contract constants).
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
- The worker accepts:
  - current snapshots (`export_format_version=2`)
  - legacy v1 snapshots (`export_format_version=1`) through an explicit
    normalization layer that backfills v2 fields and canonicalizes taxonomy data.
- The worker rejects unknown versions (future or malformed exports).
- `parent_pin` and local rollback feature keys (`feature.*`) are preserved across restores
  (`DELETE FROM settings WHERE key != 'parent_pin' AND key NOT LIKE 'feature.%'`).
- After import, `writeSchemaVersion(db, DB_SCHEMA_VERSION)` re-stamps the
  schema version.

## QA Gate

Run `npm run qa:db-contract` to verify all static + runtime invariants listed
above. The check covers source patterns in `config/db-contract.json`,
`rust/db_contract_generated.rs`, `public/db-contract.js`, `db-worker.js`,
`db_messages.rs`, `offline_queue.rs`, `errors/reporter.rs`, `mom_mode.rs`, and
this document.

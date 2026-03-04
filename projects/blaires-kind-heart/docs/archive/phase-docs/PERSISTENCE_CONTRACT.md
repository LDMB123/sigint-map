# Persistence Contract

- Archive Path: `docs/archive/phase-docs/PERSISTENCE_CONTRACT.md`
- Normalized On: `2026-03-04`
- Source Title: `Persistence Contract`

## Summary
Last updated: 2026-02-14

## Context
Last updated: 2026-02-14
Owner: Engineering

This document defines the data-layer contract for local persistence and the required checks that protect it.

### Scope
- SQLite worker schema and migration behavior.
- Rust/worker protocol compatibility.
- Storage backend probe behavior and fallback chain.
- Queue/error table lifecycle that is owned outside the worker schema bootstrap.
- Required verification gate: `npm run qa:db-contract`.

### Canonical Sources
- `/Users/louisherman/ClaudeCodeProjects/projects/blaires-kind-heart/public/db-worker.js`
- `/Users/louisherman/ClaudeCodeProjects/projects/blaires-kind-heart/rust/db_messages.rs`
- `/Users/louisherman/ClaudeCodeProjects/projects/blaires-kind-heart/rust/offline_queue.rs`
- `/Users/louisherman/ClaudeCodeProjects/projects/blaires-kind-heart/rust/errors/reporter.rs`
- `/Users/louisherman/ClaudeCodeProjects/projects/blaires-kind-heart/scripts/check-db-contract.mjs`
- `/Users/louisherman/ClaudeCodeProjects/projects/blaires-kind-heart/e2e/db-contract.spec.ts`

### Protocol Contract
- `DB_WORKER_API_VERSION` in Rust must match `self.DB_WORKER_API_VERSION` in the worker.
- Worker must reject incompatible legacy clients below `self.DB_WORKER_MIN_CLIENT_API_VERSION`.
- Required request types: `Init`, `Exec`, `Query`, `Export`, `Restore`.
- `Init` response may include additive metadata fields (`backend`, `backend_probe_*`) and clients must ignore unknown fields for forward compatibility.

### Backend Probe Contract
- Probe mode is native-capability-only (`backend_probe_mode=native`).
- Legacy UA probe path has been removed (probe version `3`).
- `db_probe` URL query parameter is deprecated and must not be relied on by clients.
- Native probe requirements:
  - OPFS sync path must require both `navigator.storage.getDirectory` and `FileSystemSyncAccessHandle`.
  - If native capability check fails, worker must continue fallback chain (`kvvfs` then `memory+blob`).
- Compatibility rule:
  - `Init` response remains additive and must preserve `backend_probe_*` metadata fields.

### Schema Version Contract
- Worker schema version is defined by `DB_SCHEMA_VERSION` in `/Users/louisherman/ClaudeCodeProjects/projects/blaires-kind-heart/public/db-worker.js`.
- Persisted value is stored at `meta.schema_version`.
- On startup, worker must fail fast if persisted `meta.schema_version` is newer than `DB_SCHEMA_VERSION` (downgrade protection).
- After successful migrations/bootstrap, worker must write current `DB_SCHEMA_VERSION` into `meta.schema_version`.
- Any schema change that affects storage shape must include:
  1. migration update,
  2. `DB_SCHEMA_VERSION` bump when compatibility boundary changes,
  3. gate/doc updates in this file and `qa:db-contract`.

### Schema Contract
Required core tables in worker bootstrap schema:
- `kind_acts`
- `quests`
- `streaks`
- `stories_progress`
- `stickers`
- `settings`
- `ai_cache`
- `meta`
- `game_scores`
- `weekly_goals`
- `mom_notes`
- `skill_mastery`
- `weekly_insights`
- `reflection_prompts`
- `badges`
- `companion_skins`
- `gardens`

Required worker migrations:
- `kind_acts.reflection_type`
- `kind_acts.bonus_context`
- `kind_acts.emotion_selected`
- `kind_acts.combo_day`
- `stories_progress.unlock_tier`
- `weekly_insights.skill_breakdown`

Externally-owned persistence tables:
- `offline_queue` is created/managed by `/Users/louisherman/ClaudeCodeProjects/projects/blaires-kind-heart/rust/offline_queue.rs`.
- `errors` is created/managed by `/Users/louisherman/ClaudeCodeProjects/projects/blaires-kind-heart/rust/errors/reporter.rs`.

### Integrity and Durability Contract
- DB integrity must pass: `PRAGMA integrity_check = ok`.
- Foreign key check must be empty: `PRAGMA foreign_key_check` returns zero rows.
- Queue flush order must be deterministic (`ORDER BY timestamp ASC`).
- Successful queue entries must be selectively deleted (not full-table destructive cleanup).

### Export Contract
- Parent dashboard must expose both:
  - JSON backup export (`data-mom-export-json`)
  - Kind acts CSV export (`data-mom-export-csv`)
- Exported settings data must exclude `parent_pin`.
- Filename contract:
  - `blaires-kind-heart-export-YYYY-MM-DD.json`
  - `blaires-kind-heart-kind-acts-YYYY-MM-DD.csv`
- Runtime gate must validate downloaded payload content:
  - JSON has `export_format_version = 1` and valid `schema_version`
  - JSON `tables.settings` excludes `parent_pin`
  - CSV header matches the canonical kind-acts export columns

### Restore Contract
- Parent dashboard must expose restore controls:
  - Restore trigger (`data-mom-restore-json`)
  - Hidden file input (`data-mom-restore-input`)
- Restore payload must be a JSON backup with:
  - `export_format_version = 1`
  - `schema_version` present and `<= DB_SCHEMA_VERSION`
  - `tables` object payload
- Worker restore behavior requirements:
  - Apply restore in one transaction.
  - Preserve current `settings.parent_pin` even when restoring settings data.
  - Rewrite `meta.schema_version` to current `DB_SCHEMA_VERSION` after restore.
- Runtime gate must validate round-trip behavior:
  - Post-export mutations are removed after restore.
  - Pre-export rows are restored.
  - `parent_pin` remains intact after restore.

### QA Gate
Run:
```bash
npm run qa:db-contract
```

This gate executes:
1. Static contract checks (`scripts/check-db-contract.mjs`).
2. Runtime worker contract test (`e2e/db-contract.spec.ts` via Playwright).

### Change Process
Any persistence-affecting change must:
1. Update canonical implementation files.
2. Update this document if behavior/ownership changes.
3. Update static/runtime contract checks when schema/protocol changes.
4. Run `npm run qa:db-contract` locally before merge.
5. Keep migrations additive/backward-compatible unless an explicit breaking migration plan is approved.

### Pending Decisions
- Keep or retire `quest_chains` and `weekly_themes` schema surfaces.
- Define schema-version bump policy for additive vs compatibility-breaking migrations.
- Expand export scope beyond current JSON+CSV baseline (for example, signed archive or selective export UI).

## Actions
_No actions recorded._

## Validation
_Validation details not recorded._

## References
_No references recorded._


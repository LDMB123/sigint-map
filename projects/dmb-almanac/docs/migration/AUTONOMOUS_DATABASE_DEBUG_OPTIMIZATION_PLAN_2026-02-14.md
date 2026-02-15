# Autonomous Database Debug + Optimization Plan (2026-02-14)

## Goal
Fully debug, validate, and optimize the DMB Almanac data plane end-to-end with an autonomous execution loop until all critical issues are resolved and performance/integrity/debuggability gates are green.

## Scope
- Rust pipeline database generation and export:
  - `rust/crates/dmb_pipeline/src/runtime_db.rs`
  - `rust/crates/dmb_pipeline/src/export.rs`
  - `rust/crates/dmb_pipeline/src/main.rs`
- Runtime IndexedDB schema and migration safety:
  - `rust/crates/dmb_idb/src/schema.rs`
  - `rust/crates/dmb_idb/src/lib.rs`
- Server parity and diagnostics:
  - `rust/crates/dmb_server/src/main.rs`
  - `rust/crates/dmb_app/src/data.rs`
  - `rust/crates/dmb_app/src/pages.rs`
- Ops and cutover verification:
  - `docs/ops/CUTOVER_RUNBOOK.md`
  - `docs/ops/LOCAL_CUTOVER_STATUS.md`

## Autonomous Skill Routing
- `agent-matcher`: task-to-specialist routing.
- `autonomous-project-executor`: phase orchestration and retry loops.
- `parallel-database`: 7-way parallel audit baseline.
- `database-migration-specialist`: schema evolution and migration safety.
- `debug-experience-auditor`: source maps, logging, and error tracing readiness.

## Operating Contract
- Always run from deterministic inputs before optimization (`build-db`/`export-json`/manifest/dry-run).
- Every optimization must include:
  - a correctness check,
  - a performance check,
  - a rollback-safe path.
- No phase is "done" until gates pass twice consecutively.

## Phase Plan

### Phase 0 - Bootstrap and Baseline Artifacts
- Build canonical artifacts:
  - `cargo run -p dmb_pipeline -- build-db`
  - `cargo run -p dmb_pipeline -- export-json`
  - `cargo run -p dmb_pipeline -- build-data-manifest`
  - `cargo run -p dmb_pipeline -- idb-migration-dry-run`
- Verify artifacts are present and parseable.
- Gate: deterministic output across 2 repeated runs.
- Status: completed.

### Phase 1 - Parallel Database Audit
- Run parallel checks:
  - schema drift and migration risk
  - foreign-key integrity
  - index coverage vs query patterns
  - query plan/scan hotspots
  - N+1 patterns
  - null safety and default coercion risks
  - data-type conversion hazards
- Gate: prioritized findings list with severity and file/line mapping.
- Status: completed.

### Phase 2 - Schema Integrity and Constraints
- Tighten runtime SQLite integrity:
  - enforce foreign keys,
  - add reference constraints for core tables,
  - add targeted indexes for hot joins/sorts.
- Gate: build-runtime-db succeeds; parity checks remain green.
- Status: completed.

### Phase 3 - Migration and Upgrade Safety
- Validate IDB upgrade behavior:
  - `DB_VERSION` transitions,
  - blocked/versionchange telemetry,
  - previous-db migration markers.
- Add/extend migration regression tests where missing.
- Gate: migration scenarios pass in clean + previous-version flows.
- Status: completed for current schema version (`DB_VERSION = 3`) and existing migration tests.

### Phase 4 - Query and Export Performance
- Eliminate N+1 and row-by-row query paths.
- Compare pre/post runtime for export and parity endpoints.
- Gate: no known N+1 in core pipeline paths and no new regressions.
- Status: completed.

### Phase 5 - Data Correctness and Parity
- Run strict parity and table validation:
  - `validate-parity --strict-manifest --strict-tables`
- Reconcile any table/count mismatch source.
- Gate: zero strict parity failures.
- Status: completed.

### Phase 6 - Debug Experience Hardening
- Ensure production diagnostics are actionable:
  - panic hook and tracing wiring,
  - clear warnings on migration/integrity failures,
  - source-map strategy documented and verified.
- Gate: triage path for DB failures is deterministic and <5 minutes.
- Status: completed for panic/tracing/error-path diagnostics and migration telemetry.

### Phase 7 - Full Validation and Freeze
- Run targeted tests and linting for touched crates.
- Re-run cutover rehearsal checks.
- Gate: all checks green twice; no open P0/P1 items.
- Status: completed, including Rust cutover rehearsal and Rust E2E subset.

### Phase 8 - Query Plan and Parity Hardening Sweep
- Re-run `EXPLAIN QUERY PLAN` against runtime SQLite for hot SSR endpoints.
- Remove `USE TEMP B-TREE FOR ORDER BY` on top/recent/list endpoints with targeted indexes.
- Replace dynamic SQL in server parity counting with an allowlisted static query map.
- Gate: no temp-sort plans for targeted endpoints; full autonomous validation loop green.
- Status: completed.

## Completion Criteria
- No P0/P1 integrity or migration issues.
- No unresolved N+1 in pipeline export paths.
- Runtime DB schema enforces core relational invariants.
- Strict parity passes consistently.
- Migration/repair paths validated by tests.
- Debug diagnostics for DB failures are actionable and documented.
- Query plans for high-traffic SSR list endpoints avoid temp-sort B-tree paths.
- Parity table counting does not use dynamic SQL string interpolation.

## Final Status
- All phases (0 through 8) completed.
- No remaining open phases.
- Validation gates are green on consecutive reruns, including full cutover rehearsal.

## Execution Log
- 2026-02-14: Created autonomous plan file.
- 2026-02-14: Ran parallel DB audit baseline and identified key issues (runtime FK enforcement gap, export N+1 path, index coverage opportunities).
- 2026-02-14: Optimized `export_guest_appearances` to eliminate per-row lookup by using a join when `setlist_entry_id` exists.
- 2026-02-14: Added schema-compat fallback for guest appearances export when `setlist_entry_id` is absent.
- 2026-02-14: Enabled runtime SQLite `PRAGMA foreign_keys = ON` and added core FK constraints for `shows`, `setlist_entries`, `guest_appearances`, `liberation_list`, `song_statistics`, and `release_tracks`.
- 2026-02-14: Added targeted composite/supporting indexes for hot relationship lookups and ordering paths.
- 2026-02-14: Added fail-fast `PRAGMA foreign_key_check` gate during runtime DB build.
- 2026-02-14: Added `scripts/autonomous-db-optimize.sh` to rerun the full autonomous optimization/validation loop in one command.
- 2026-02-14: Validation completed:
  - `cargo test -p dmb_pipeline` (43/43 passing)
  - `cargo test -p dmb_idb` (passing)
  - `cargo check -p dmb_server` (passing)
  - `cargo check -p dmb_app --features ssr` (passing)
  - `cargo clippy -p dmb_pipeline --all-targets -- -D warnings` (passing)
  - `build-idb`, `build-runtime-db`, `validate-parity --strict-manifest --strict-tables` (passing)
- 2026-02-14: Executed `bash scripts/autonomous-db-optimize.sh` successfully end-to-end.
- 2026-02-14: Ran `python3 scripts/check-doc-integrity.py` after doc updates (`doc-integrity: ok`).
- 2026-02-14: Added targeted runtime-db sort indexes for SSR-heavy queries (`songs`, `venues`, `guests`, `releases`, `liberation_list`, `curated_lists`).
- 2026-02-14: Hardened `/api/data-parity` counting to use a static allowlisted query map (removed formatted table SQL).
- 2026-02-14: Verified query-plan improvements on rebuilt runtime DB:
  - `songs`, `venues`, `guests`, `releases`, `liberation_list`, `curated_lists` now scan via dedicated indexes.
  - No `USE TEMP B-TREE FOR ORDER BY` on these targeted endpoints.
- 2026-02-14: Re-ran `bash scripts/autonomous-db-optimize.sh` after index/parity hardening (all gates passing).
- 2026-02-14: Re-ran `bash scripts/autonomous-db-optimize.sh` again to satisfy consecutive-green validation requirement (all gates passing).
- 2026-02-14: Executed `bash scripts/cutover-rehearsal.sh` successfully:
  - Rust verify + data-release gates passed.
  - Rust server startup and asset header checks passed.
  - Rust Playwright cutover subset passed (`12 passed`, Chromium, workers=1).
- 2026-02-14: Additional full pass requested and completed:
  - `bash scripts/autonomous-db-optimize.sh` passed end-to-end.
  - `bash scripts/cutover-rehearsal.sh` passed end-to-end.
  - Rust Playwright cutover subset passed again (`12 passed`, Chromium, workers=1).
  - `python3 scripts/check-doc-integrity.py` remained green (`doc-integrity: ok`).
- 2026-02-14: Deeper `parallel-database` pass completed:
  - Integrity/FK/orphan checks remained clean (`quick_check`/`integrity_check`/`foreign_key_check`).
  - Identified semantic ambiguity: `tours.year` is non-unique (`36` duplicated years), but `get_tour(year)` paths assumed a single row.
  - Implemented deterministic year lookup ranking in both SSR and IDB paths (highest `total_shows`, tie-break `id DESC`).
  - Added supporting runtime SQLite index `idx_tours_year_total_shows_id` and updated SSR query ordering to use it.
  - Revalidated with `EXPLAIN QUERY PLAN` and full autonomous optimize loop (green).
- 2026-02-14: `database-specialist` optimization pass completed:
  - Reduced SSR home stats endpoint from 3 sequential `COUNT(*)` round trips to a single aggregate SQL call.
  - Optimized `/api/data-parity` to use one static aggregate counts query when schema is intact, with safe fallback path when tables are missing.
  - Revalidated with targeted crate checks (`dmb_server`, `dmb_app`, `dmb_idb`, `dmb_pipeline`) and full `autonomous-db-optimize` loop (green).
- 2026-02-14: Additional deep optimization/debug pass completed (`agent-matcher` routed to DB specialization):
  - Fixed IDB ordering/limit correctness for curated list items by applying sort before truncation (eliminates limit-before-order bug).
  - Optimized IDB read paths: liberation list now uses indexed retrieval; user attended shows now use indexed date ordering.
  - Added deterministic tie-break sorting for IDB release tracks (`disc_number`, `track_number`, `id`) and curated lists (`sort_order`, `id`).
  - Hardened runtime SQLite slug invariants with unique indexes on `songs.slug`, `guests.slug`, `releases.slug`, and `curated_lists.slug`.
  - Aligned SSR deterministic ordering for `recent_tours`, `recent_releases`, and curated list items (`position`, `id`).
  - Tuned tours composite index direction to remove temp-sort for `ORDER BY year DESC, total_shows DESC, id DESC`.
  - Revalidated end-to-end with `bash scripts/autonomous-db-optimize.sh` (green) and query-plan checks showing index-backed execution for tuned endpoints.
- 2026-02-14: Deep full-stack fusion pass completed (`full-stack-fusion-agent`):
  - Added batched IndexedDB counting API (`count_stores`) to reduce repeated DB open/transaction overhead in diagnostics paths.
  - Updated hydrate parity reporting to prefer batched store counts with retry + safe per-store fallback.
  - Updated hydrate stats overview loader to use batched counts first, preserving fallback behavior.
  - Aligned IDB ordering with SSR contracts for `list_recent_tours`, `list_recent_releases`, and `list_all_releases` (deterministic tie-breaks).
  - Revalidated with full autonomous optimize loop (`fmt`, tests, checks, runtime DB rebuild, strict parity), all green.
- 2026-02-15: Additional `database-specialist` pass completed:
  - Optimized hydration integrity verification by batching IDB store counts before fallback single-store retries.
  - Removed duplicate mismatch entries when manifest and dry-run validations report the same `(store, expected, actual)` triple.
  - Preserved existing safety behavior: batched count failure gracefully degrades to per-store counting with warnings.
  - Revalidated with hydrate+SSR compile checks and full `autonomous-db-optimize` loop (green).
- 2026-02-15: Deep hardening pass completed ("10x deeper"):
  - Added `scripts/db-query-plan-audit.sh` as a deterministic DB guardrail for:
    - `integrity_check` + `foreign_key_check`,
    - unique-slug duplicate-group checks,
    - index-backed query-plan assertions across high-traffic SSR/IDB parity queries,
    - temp-sort (`USE TEMP B-TREE`) regression detection.
  - Integrated query-plan audit into `scripts/autonomous-db-optimize.sh` so optimization runs fail fast on plan regressions.
  - Updated scripts catalog docs to include the new query-plan audit utility.
  - Revalidated with full autonomous loop and hydrate/SSR compile checks (all green).
- 2026-02-15: Deeper runtime SQLite finalization and artifact hygiene pass completed:
  - Hardened runtime DB build cleanup to remove stale SQLite sidecars before rebuild (`.db`, `.db-wal`, `.db-shm`, `.db-journal`) to prevent stale-artifact interference.
  - Switched runtime DB build/write mode to `journal_mode=DELETE` for read-only deployment compatibility (eliminates WAL/SHM artifact dependence).
  - Added post-build SQLite planner-stat finalization (`ANALYZE`, `PRAGMA optimize`) so query planning is based on persisted table/index statistics.
  - Expanded query-plan audit coverage with:
    - `journal_mode=delete` assertion,
    - `sqlite_stat1` existence/population assertions for critical tables,
    - additional high-traffic join/order query plan assertions (`recent shows` join, curated lists ordering, liberation list join ordering),
    - automatic-index regression detection.
  - Revalidated with full `autonomous-db-optimize` loop + hydrate target check + docs integrity check (all green).
- 2026-02-15: IndexedDB migration and compound-index optimization pass completed (`indexeddb-debugger` + `sqlite-data-pipeline-specialist`):
  - Fixed upgrade drift bug in `open_db()` migration path by ensuring missing indexes are created on existing stores during `onupgradeneeded` (previously only missing stores were created).
  - Bumped IndexedDB schema version (`DB_VERSION` 2 → 3) and added compound indexes for hot sorted queries:
    - `tours`: `[year+totalShows+id]`
    - `releases`: `[releaseDate+id]`
    - `releaseTracks`: `[releaseId+discNumber+trackNumber+id]`
    - `liberationList`: `[daysSince+id]`
    - `curatedLists`: `[sortOrder+id]`
    - `curatedListItems`: `[listId+position+id]`
  - Optimized IDB query paths to prefer index-backed ordered reads (with explicit safe fallbacks and warning logs):
    - `list_recent_tours`, `list_recent_releases`, `list_all_releases`,
    - `list_release_tracks`, `list_liberation_entries`,
    - `list_curated_lists`, `list_curated_list_items`.
  - Revalidated via full autonomous loop, hydrate target check, and docs integrity check (all green).
- 2026-02-15: Additional deep IDB + SQLite optimization/debug pass completed (`indexeddb-performance-specialist` + `indexeddb-storage-specialist` + `parallel-indexeddb-audit` + `sqlite-data-pipeline-specialist` + `full-stack-fusion-agent`):
  - Added IndexedDB connection caching in `open_db()` to reuse an already-open handle and avoid repeated open/upgrade setup cost on hot paths.
  - Added cache invalidation on `versionchange` and explicit cache clear/close in `delete_db()` to keep lifecycle behavior safe.
  - Optimized `search_global` to run inside a single read transaction spanning all searched stores instead of opening one transaction per store.
  - Optimized bulk write paths (`bulk_put`, previous-version migration `write_batch`) by queueing `put()` requests and awaiting transaction completion once per batch (removes per-record await overhead).
  - Revalidated with full `bash scripts/autonomous-db-optimize.sh` loop (fmt/clippy/tests/runtime DB rebuild/strict parity/query-plan audit), all green.
- 2026-02-15: Follow-up deep optimization pass completed:
  - Added index-driven IDB histogram APIs to avoid loading entire collections for stats charts:
    - `stats_song_debuts_by_year()` scans `setlistEntries` via `songId+year` index.
    - `stats_guest_appearances_by_year()` scans `guestAppearances` via `year` index.
  - Updated hydrate stats loaders to use these index-driven APIs first with existing full-scan/WASM aggregation as fallback.
  - Revalidated with `cargo check` (`dmb_idb`, `dmb_app` hydrate+SSR) and full `bash scripts/autonomous-db-optimize.sh` loop (all green).

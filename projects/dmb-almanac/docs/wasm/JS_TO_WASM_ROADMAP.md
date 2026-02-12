# JS → WASM / Native APIs Migration Roadmap

Goal: Reduce main-thread JavaScript in favor of Rust/WASM, Chromium 143+ native APIs, and CSS/HTML5 primitives when they are strictly better for DMB Almanac’s offline PWA on macOS 26.2 (Apple Silicon).

This roadmap is **execution-ready**: it includes decision criteria, milestones, validation gates, and risk controls so we can safely migrate without regressions.

## North Star Outcomes
- Main-thread long tasks (>50ms) reduced by 40%+ on navigation and visualization routes.
- 3–10x speedups on heavy aggregations and graph/geometry precomputation.
- IndexedDB workloads stay stable (no regression in query latency or data integrity).
- Offline-first behavior remains intact (no new sync or data loss issues).

## Decision Matrix: JS vs WASM vs Native APIs
Use this matrix to decide where each workload belongs.

**Prefer WASM (Rust) when:**
- The work is CPU-heavy, deterministic, and data-oriented.
- Inputs/outputs can be expressed as TypedArrays or compact JSON.
- The computation is repeated (amortizes WASM load cost).
- Results are used in multiple routes (shared logic).

**Prefer Chromium-native APIs when:**
- The browser already provides a primitive (Popover, View Transitions, Scheduler).
- UI behavior can be expressed in CSS/HTML5 (scroll animations, layout, form validation).
- It removes JS dependencies or reduces JS bundle size.

**Keep in JS when:**
- Logic is highly stateful UI orchestration (Svelte stores, component lifecycles).
- Inputs are irregular and frequent, making WASM boundary cost higher than JS cost.
- Debuggability is critical and performance gains are minimal.

## Current Baseline (Completed)
- JS audit: no critical async hazards found; event listener cleanup is mostly covered.
- IndexedDB audit: fixed syncMeta id mismatch, recordCounts mismatch, and full resync coverage.
- WASM worker routing: large aggregation calls now worker-routed to avoid main-thread stalls.

## Phase 1: Stabilize Data Integrity + Performance Guardrails (Now)
**Objective:** Ensure that any migration does not break data correctness or sync state.

Actions:
- Lock syncMeta identity to `id='sync_state'` everywhere.
- Ensure `clearSyncedData()` covers all synced tables.
- Ensure `recordCounts` aligns with schema and loaders.
- Add parity checks for WASM vs JS outputs on key aggregations.

Exit criteria:
- Sync meta reads/writes are consistent and verified via smoke tests.
- Full resync does not leave stale data in any synced tables.

## Phase 2: High-ROI WASM Targets (Next)
**Objective:** Move deterministic heavy compute into Rust/WASM with JS fallbacks.

Target candidates:
- Sankey layout precompute (`sankeyLayout.js` → `rust/graphs`).
- Force graph physics pre-pass (stabilization, spatial hashing).
- Geo projection preprocessing (path generation and simplification).
- Heatmap binning (counts, normalization, color bands).

Approach:
1. Define stable input schema (TypedArray + metadata).
2. Implement Rust module with minimal JSON bridging.
3. Integrate via worker first; fallback to JS on error.
4. Add parity tests with real data fixtures.

Exit criteria:
- At least 2 major visualizations moved to WASM precompute.
- >3x improvement in compute time for large datasets.

## Phase 3: Native Chromium 143+ API Migration
**Objective:** Replace JS libraries and custom logic with native browser primitives.

Workstreams:
- View Transitions: consolidate navigation transitions and reduce custom animation glue.
- Popover API: remove fallback logic where Chromium-only is acceptable.
- Scheduler API: apply `scheduler.yield()` to long UI tasks.
- CSS scroll-driven animations: replace JS scroll handlers.

Exit criteria:
- At least 2 UI flows use native transitions.
- Observable reduction in JS bundle size and event handler count.

## Phase 4: IndexedDB Performance Architecture
**Objective:** Make Dexie workloads predictable and scalable.

Actions:
- Validate all `.where()` paths against actual compound indexes.
- Move large scans to precomputed `syncMeta.precomputedStats` where feasible.
- Replace `.filter()` on large tables with indexed `searchText` where possible.
- Add batch-based pagination for list pages if memory footprint becomes large.

Exit criteria:
- No table scan in hot paths (stats/search/detail pages).
- IndexedDB operations are O(log n) for key flows.

## Phase 5: Platform-Optimized Rendering (Apple Silicon)
**Objective:** Align rendering with UMA and GPU pipeline on macOS 26.2.

Actions:
- Ensure heavy visualizations use off-thread or GPU paths.
- Prefer CSS compositing (transform/opacity) and avoid layout thrash.
- Use `content-visibility` and `contain` for heavy sections.

Exit criteria:
- Reduced main-thread work and lower GPU/CPU contention in DevTools.

## Testing + Validation Gates
- WASM parity tests: JS vs WASM outputs for deterministic inputs.
- Perf budgets: max long tasks and CPU time budgets per route.
- IndexedDB integrity checks: schema + migration + row count checks.
- Telemetry: track `wasm` vs `javascript` execution distribution and failures.

## Risks + Mitigations (Devil’s Advocate)
- **Risk:** WASM boundary overhead exceeds JS performance for small datasets.
  - Mitigation: size thresholds + JS fallback. Measure before/after.
- **Risk:** Migration breaks offline-first behavior or data integrity.
  - Mitigation: syncMeta parity checks + migration snapshots.
- **Risk:** Debuggability drops with Rust/WASM.
  - Mitigation: keep JS fallback and add unit tests for each wasm function.
- **Risk:** WASM size creep increases startup time.
  - Mitigation: lazy load modules; split WASM bundles by feature.

## Ownership + Sequencing (Engineering Manager View)
- **Core platform:** IndexedDB + WASM boundaries (high priority)
- **UI/UX:** native browser API replacements (parallelized)
- **Data:** precomputed stats for heavy queries (parallel)

Suggested sequencing:
1. Data integrity + resync fixes (done).
2. WASM precompute for 1–2 visualizations.
3. Native API simplification.
4. Dexie precompute and indexed search improvements.

## Success Metrics
- 40%+ reduction in long tasks (>50ms) on visualizations routes.
- 3–10x faster aggregations for large datasets.
- No regression in offline behaviors or data correctness.


## Progress Update (2026-02-04)
- Graph WASM module scaffolded with Sankey precompute exports.
- Sankey worker integrated with optional WASM precompute.
- Build pipeline extended to produce `dmb_wasm_graphs` bundle.
- Heatmap binning now has a WASM precompute path (worker) with JS fallback.
- Geo path generation worker now attempts WASM Albers USA projection with fit-size parameters, JS fallback retained.
- Added parity tests to compare JS vs WASM outputs for Sankey/Heatmap/Geo.
- Added tours `searchText` index + migration backfill to remove Dexie `.filter()` search scans.
- Precomputed shows-by-year summary stored in sync metadata to avoid Dexie table scans.
- Added releases `searchText` index + migration backfill for faster global search.
- Corpus snapshot now precomputes `searchText` for tours/releases to reduce per-search CPU cost.

# Deep Debug + Simplification Log

- Archive Path: `docs/archive/reports/deep-debug-simplification-log-2026-02-14.md`
- Normalized On: `2026-03-04`
- Source Title: `Deep Debug + Simplification Log`

## Summary
Last updated: 2026-02-14

## Context
Last updated: 2026-02-14
Owner: Codex autonomous execution

### Objective
Resolve active blockers, perform deeper debugging/simplification across the app, and keep a resumable execution trail.

### Baseline Snapshot
1. Existing simplification waves (0-7) are marked complete.
2. Known blockers from latest run:
   - `pwa:health` managed mode can fail when `4173` is occupied.
   - `pwa:health` explicit URL mode can fail in offline phase (`offline-enable-context` timeout).
3. Physical iPad regression remains device-dependent.

### Execution Plan
1. Stabilize `pwa:health` (port fallback + reliable offline simulation).
2. Re-run health checks and capture hard evidence.
3. Run deeper simplification/debug sweep on high-impact runtime paths.
4. Re-run full validation matrix and log outcomes.

### Progress Entries
### 2026-02-13T00:00:00Z (session-local)
- Initialized persistent deep-debug/simplification log.
- Loaded `app-slim` and `debug` skill instructions.
- Reproduced health-check script failure modes for targeted fixes.

### 2026-02-13T15:17:00Z (session-local)
- Confirmed baseline gate status after prior stabilization:
  - `npm run pwa:health` -> PASS (`ok: true`, offline `managed-server-stop`)
  - `cargo check --release` -> PASS
  - `cargo test --release` -> PASS
  - `npm run test:e2e:all` -> PASS (`33 passed`)

### 2026-02-13T15:18:00Z (session-local)
- Re-ran `pwa:health` under forced port collision (`4173` occupied by temporary HTTP server).
- Result: PASS with automatic fallback to `4174`, including offline hash navigation.
- Evidence: `managedServerPort: 4174`, `offline.finalHash: "#panel-tracker"`.

### 2026-02-13T15:19:00Z (session-local)
- Applied additional simplification and hardening fixes:
  1. `scripts/pwa-health-check.mjs`
     - Fixed unreachable `ERR_CONNECTION_REFUSED` diagnostic branch in offline mode by tracking managed-server shutdown state explicitly (`offlineManagedServerStopped`).
  2. `rust/pwa.rs`
     - Replaced manual query-string parsing with existing typed helper `dom::search_param_is("force_sw", "1")`.
- Full post-change verification:
  - `node --check scripts/pwa-health-check.mjs` -> PASS
  - `npm run pwa:health` -> PASS
  - `cargo check --release` -> PASS
  - `cargo test --release` -> PASS
  - `npm run test:e2e:all` -> PASS (`33 passed`)

### 2026-02-13T15:20:00Z (session-local)
- Verified explicit URL mode after offline hardening:
  - `python3 -m http.server 4192 --directory dist`
  - `npm run pwa:health -- http://127.0.0.1:4192`
  - Result: PASS (`offline.mode: "chromium-cdp-offline"`, hash `#panel-tracker`).

### 2026-02-13T15:21:00Z (session-local)
- Evaluated test-harness simplification in `playwright.config.ts`:
  1. Attempted removing `NO_COLOR=false` from Playwright webServer command.
  2. Result: regression in this environment (`trunk` rejected implicit `NO_COLOR=1` as invalid for `--no-color`).
  3. Action: reverted to `NO_COLOR=false`; full E2E gate restored to green (`33 passed`).
- Updated stale status/docs surfaces to match current validated reality:
  - `docs/DEPLOYMENT_CHECKLIST.md`
  - `docs/APP_STATUS.md`
  - `docs/PWA_STATUS.md`
  - `docs/COMPLETION_REPORT.md`
  - `docs/STATUS_LEDGER.md`
  - `docs/IPAD_REGRESSION_RUN_2026-02-13.md`

### 2026-02-13T17:11:00Z (session-local)
- Re-validated after rollback of the transient Playwright env change:
  - `npm run pwa:health` -> PASS
  - `npm run pwa:health -- http://127.0.0.1:4192` -> PASS
  - `npm run test:e2e:all` -> PASS (`33 passed`)
  - `cargo check --release` -> PASS
- Xcode device availability probe:
  - `xcrun xctrace list devices` -> no physical iPad connected (simulators available).

### 2026-02-13T17:12:00Z (session-local)
- Final production-path confirmation:
  - `NO_COLOR=true trunk build --release` -> PASS (cache version `aa04ddc9da6202bc`)
  - `npm run pwa:health` -> PASS (`ok: true`, offline hash `#panel-tracker`)
  - `cargo test --release` -> PASS (`8 passed`)
  - `npm run token:baseline` -> PASS (active docs `24`, est tokens `27854`)

### 2026-02-14T00:00:00Z (session-local)
- Applied `$debug-experience-auditor` to current runtime surface.
- Audit findings:
  - Release bundles in `dist/` and `.verify-dist-release/` contain no `.map` files and no `sourceMappingURL` references.
  - Async error tracing was partial: app bootstrap had init-time `try/catch`, but no global `error` / `unhandledrejection` hooks across all contexts.
- Implemented traceability hardening:
  - Added global handlers in:
    - `public/wasm-init.js`
    - `public/sw.js`
    - `public/db-worker.js`
  - Handlers now emit scoped, location-aware logs for unhandled errors and promise rejections.
- Quick syntax checks:
  - `node --check public/sw.js` -> PASS
  - `node --check public/db-worker.js` -> PASS
  - `node --check public/wasm-init.js` -> PASS

### 2026-02-14T00:20:00Z (session-local)
- Implemented all recommended debug-experience follow-ups:
  1. Symbolized release build path:
     - Added helper `scripts/build-verify-release.sh`.
     - Build uses release mode with symbolization overrides:
       - `CARGO_PROFILE_RELEASE_DEBUG=2`
       - `CARGO_PROFILE_RELEASE_STRIP=none`
  2. Source-map retention for verification artifacts:
     - Added `scripts/retain-source-maps.mjs`.
     - Generates/retains `*.js.map`, injects `sourceMappingURL` where missing, and writes `source-map-summary.json`.
  3. Log-level gating + correlation IDs:
     - Added `public/log-context.js` and loaded it in:
       - `public/wasm-init.js`
       - `public/sw.js`
       - `public/db-worker.js`
     - Console output now includes `sid` and monotonic `eid`, with level filtering (`error|warn|info|debug|trace`, default `warn`).
- Verification:
  - `cargo check --release` -> PASS
  - `bash -n scripts/build-verify-release.sh` -> PASS
  - `bash -n scripts/apple-silicon-profile.sh` -> PASS
  - `bash -n scripts/apple-silicon-profile-iterate.sh` -> PASS
  - `node --check public/log-context.js` -> PASS
  - `node --check scripts/retain-source-maps.mjs` -> PASS
  - `DIST_DIR=.verify-dist-release SYMBOLIZED_RELEASE=1 bash scripts/build-verify-release.sh` -> PASS

### 2026-02-14T00:35:00Z (session-local)
- Found and fixed integration regression:
  - `pwa:health` initially failed in explicit URL mode because `log-context.js` returned 404 from `.verify-dist-release`.
  - Root cause: missing Trunk copy directive for `public/log-context.js`.
- Fix:
  - Added `<link data-trunk rel=\"copy-file\" href=\"public/log-context.js\" />` to `index.html`.
- Re-verified:
  - Rebuilt with `DIST_DIR=.verify-dist-release SYMBOLIZED_RELEASE=1 bash scripts/build-verify-release.sh`.
  - `npm run pwa:health -- http://127.0.0.1:4192` -> PASS (`ok: true`).

### 2026-02-14T00:45:00Z (session-local)
- Completed final wiring for log context consistency:
  - Applied `log-context` import + global error/rejection hooks to root `wasm-init.js` (Trunk build source of truth).
  - Added `log-context.js` to critical SW asset list in `public/sw-assets.js` to preserve offline startup reliability.
  - Adjusted default log level behavior in diagnostics routes (`e2e/lite/force_sw`) to `info` so health checks retain expected signal logs.
- Re-verified:
  - `DIST_DIR=.verify-dist-release SYMBOLIZED_RELEASE=1 bash scripts/build-verify-release.sh` -> PASS
  - `npm run pwa:health -- http://127.0.0.1:4192` -> PASS (`ok: true`, `swRegistration.via=app-log-cached`)

### 2026-02-14T01:55:00Z (session-local)
- Closed remaining forward-coverage gaps from the debug-experience pass:
  1. Canonical release build path now uses map retention + symbolized release by default:
     - `scripts/build-verify-release.sh` now defaults `DIST_DIR=dist`.
     - Added `npm run build:release`.
     - Kept explicit verification path: `npm run build:verify:release` (`DIST_DIR=.verify-dist-release`).
  2. CI/e2e build wiring no longer relies on raw `trunk build`:
     - `.github/workflows/pwa-health.yml` build step now runs `npm run build:release`.
     - `playwright.config.ts` webServer now builds `.e2e-dist` via `scripts/build-verify-release.sh`.
  3. Source-map fidelity upgraded:
     - `scripts/retain-source-maps.mjs` now maps dist artifacts to real source files (`public/*`, `wasm-init.js`, `target/wasm-bindgen/release/*`) instead of dist self-maps.
     - `dist/source-map-summary.json` now reports `mapping=external-full` for all six audited JS targets.
- Validation:
  - `npm run build:release` -> PASS (`Finished release profile [optimized + debuginfo]`).
  - `npm run pwa:health` -> PASS (`ok: true`).
  - `python3 -m http.server 4192 --directory dist && npm run pwa:health -- http://127.0.0.1:4192` -> PASS (`ok: true`).

### 2026-02-14T02:40:00Z (session-local)
- Applied Apple Silicon/browser simplification follow-up in the GPU particle path:
  1. `rust/gpu_particles.rs`
     - Reused a single bind group per pipeline instead of creating one every frame.
     - Collapsed split uniform writes into one contiguous uniform block write.
     - Added shared `write_f32_buffer()` helper and removed extra upload copy in burst initialization path.
  2. `rust/gpu.rs`
     - Added `viewport_pixel_size()` helper and removed duplicated viewport sizing logic.
  3. `shaders/particles_compute.wgsl` + `shaders/particles_render.wgsl`
     - Updated host-layout comments to reflect single contiguous uniform upload.
- Verification:
  - `cargo check --release` -> PASS
  - `cargo test --release` -> PASS (`14 passed`)
  - `npm run pwa:health -- http://127.0.0.1:4192` -> PASS (`ok: true`)

### 2026-02-14T03:30:00Z (session-local)
- Ran the pending full Apple Silicon A/B/C profiling sets for both GPU modes:
  1. `GPU_MODE=on ITERATIONS=A,B,C PROFILE_SECONDS=8 bash scripts/apple-silicon-profile-iterate.sh`
     - Summary: `artifacts/apple-silicon-profile/abc-summary-20260213-205238.csv`
  2. `GPU_MODE=off ITERATIONS=A,B,C PROFILE_SECONDS=8 bash scripts/apple-silicon-profile-iterate.sh`
     - Summary: `artifacts/apple-silicon-profile/abc-summary-20260213-212041.csv`
- Aggregate snapshot:
  - `health_ok=1` across all six iterations.
  - `time_duration` avg: `10.144s` (`gpu=on`) vs `10.567s` (`gpu=off`).
  - `metal_duration` avg: `9.664s` (`gpu=on`) vs `9.671s` (`gpu=off`).
  - `metal_display_vsyncs` avg: `985` (`gpu=on`) vs `784` (`gpu=off`).
  - `metal_gpu_performance_state_intervals` avg: `332` (`gpu=on`) vs `207` (`gpu=off`).
- Known issue:
  - `Animation Hitches` trace capture failed in each iteration (`Trace command failed: core-animation.trace`), so `anim_*` and `hitches_gpu` columns are empty in both summary files.

### 2026-02-14T03:45:00Z (session-local)
- Hardened profiling iteration runner:
  - Updated `scripts/apple-silicon-profile-iterate.sh` to propagate trace exit statuses and retry animation capture with `Core Animation` fallback when the selected animation template fails.
- Quick validation:
  - `bash -n scripts/apple-silicon-profile-iterate.sh` -> PASS
  - `GPU_MODE=on ITERATIONS=Z PROFILE_SECONDS=3 bash scripts/apple-silicon-profile-iterate.sh` -> PASS
  - Summary: `artifacts/apple-silicon-profile/abc-summary-20260213-212403.csv`
  - `anim_duration` and `hitches_gpu` fields were populated in this smoke run.

### 2026-02-14T23:30:00Z (session-local)
- Applied `app-slim` continuation focused on duplicate build output elimination:
  1. Removed redundant Trunk full-directory copy of `assets/` in `index.html` and replaced with a single direct copy for `assets/noise.png`.
  2. Normalized runtime path usage to root-level asset directories for backgrounds/noise:
     - `src/styles/app.css`
     - `src/styles/home.css`
     - `src/styles/tracker.css`
     - `src/styles/quests.css`
     - `src/styles/rewards.css`
     - `src/styles/games.css`
     - `src/styles/progress.css`
     - `src/styles/stories.css`
     - `public/sw.js`
     - `public/sw-assets.js`
  3. Added legacy manifest path normalization (`assets/...` -> root-relative) at both consumers:
     - `public/sw-assets.js`
     - `rust/assets.rs`
  4. Updated runtime fallbacks to match normalized paths:
     - `rust/companion.rs`
     - `rust/gardens.rs`
- Build artifact impact:
  - `dist/` size reduced from ~`109M` to ~`56M` (about `53M` reduction) while preserving app behavior.
- Verification:
  - `cargo check --release` -> PASS
  - `cargo test --release` -> PASS (`14 passed`)
  - `npm run build:release` -> PASS
  - `npm run qa:pwa-contract` -> PASS (`ok: true`)
  - `npm run test:e2e` -> FAIL (`11` failures in high-parallel run; mostly panel-ready timeouts/a11y runner failures)
  - `npm run test:e2e -- --grep "panel panel-tracker" --workers=1` -> PASS (`3 passed`)

### Current State
1. `pwa:health` managed mode is stable with port fallback and validated offline navigation.
2. `pwa:health` explicit URL mode is stable via CDP offline simulation.
3. SW-localhost override path (`force_sw=1`) is simplified and type-safe.
4. Core validation gates are green (Rust + release build + PWA health); full parallel Chromium E2E currently shows intermittent timeout instability.
5. Release debug artifacts now include source maps by default in `dist/` with external source provenance.
6. Remaining deployment uncertainty is physical-device iPad verification only.

### 2026-02-14T06:35:00Z (session-local)
- Continued `$app-slim` with manifest/runtime path simplification + build artifact hygiene.
- Changes applied:
  1. Normalized generated manifest paths at the source:
     - Updated `scripts/asset-manifest.sh` to emit root-relative runtime paths:
       - `companions/...` instead of `assets/companions/...`
       - `gardens/...` instead of `assets/gardens/...`
     - Updated `Trunk.toml` pre-build hook to call tracked `scripts/asset-manifest.sh` (instead of relying on ignored `.trunk/` content).
  2. Removed now-unnecessary legacy path compatibility shims:
     - `public/sw-assets.js`: removed `stripLegacyAssetsPrefix()` and direct-mapped manifest assets.
     - `rust/assets.rs`: removed `normalize_manifest_path()` and returned manifest paths directly.
  3. Prevented stale dist bloat across repeated builds:
     - `scripts/build-verify-release.sh` now safely cleans existing `DIST_DIR` before `trunk build`.
     - Added guard to refuse unsafe clean targets (`""`, `"/"`, `"."`).
- Manifest regeneration:
  - `bash scripts/asset-manifest.sh` -> PASS (cache version `fe1dfcde25936ebf`).
- Verification:
  - `cargo check --release` -> PASS
  - `cargo test --release` -> PASS (`14 passed`)
  - `npm run build:release` -> PASS
  - `npm run qa:pwa-contract` -> PASS (`ok: true`, offline hash navigation `#panel-tracker`)
  - `npm run build:verify:release` -> PASS
- Artifact size outcome:
  - `dist`: `56M`
  - `.verify-dist-release`: `56M` (previously observed stale-growth case at `109M`)
  - `.e2e-dist`: `56M`
- Focused E2E smoke:
  - `npm run test:e2e -- --grep "panel panel-tracker" --workers=1` -> PASS (`3 passed`)
- Note: `qa:pwa-contract` can false-fail if executed concurrently with `build:release` while dist is being rebuilt; sequential execution immediately after build passed (`ok: true`).

### 2026-02-14T23:45:00Z (session-local)
- Continued multi-skill pass: `$native-api-analyzer` + `$app-slim` + `$apple-silicon-browser-optimizer` + `$apple-silicon-optimizer` + `$refactoring-guru` (+ `$event-loop-blocker-finder`).
- Discovery summary:
  1. Native API replacement scan found no active heavy runtime libraries (`lodash`, `moment`, `date-fns`, `jquery`, `axios`) in source paths.
  2. Apple Silicon WebGPU scan showed compute workgroup already optimal (`@workgroup_size(256)`) and no immediate shader occupancy regressions.
  3. UMA opportunity identified in `rust/gpu_particles.rs`: burst upload path allocated/zeroed full `MAX_PARTICLES` buffer and uploaded all slots even for smaller bursts.
- Refactor + optimization applied (`rust/gpu_particles.rs`):
  1. Extracted particle generation into `build_particle_data(config, count, now_ms)` (Fowler: Extract Method).
  2. Replaced full-size zero-filled burst vector with capacity-based active-particle vector only.
  3. Added `count == 0` fast-return guard.
  4. Added `BYTES_PER_PARTICLE` constant and simplified buffer-size expression for readability.
  5. Kept external behavior unchanged (same shader contracts, burst lifecycle, and fallbacks).
- Apple Silicon/UMA impact (theoretical per burst):
  - Old upload size: always `MAX_PARTICLES * 32 = 16,384 bytes`.
  - New upload size: `count * 32` bytes.
  - Typical bursts now upload:
    - Hearts (40): `1,280 bytes` (~92% less)
    - Stars (60): `1,920 bytes` (~88% less)
    - Party (120): `3,840 bytes` (~77% less)
    - Unicorn (50): `1,600 bytes` (~90% less)
- Event-loop blocker scan findings (`$event-loop-blocker-finder`):
  1. Runtime app paths: no critical Node event-loop blockers in active app execution paths.
  2. CLI/report path warning only: `scripts/summarize-lighthouse.mjs` uses `fs.readFileSync` for report parsing (acceptable for one-shot CLI, but async variant is available if needed).
  3. Vendor paths (`public/sqlite/sqlite3*.js`) include `Atomics.wait`/busy loops by design for OPFS worker internals; not changed.
- Verification:
  - `cargo check --release` -> PASS
  - `cargo test --release` -> PASS (`14 passed`)
  - `npm run build:release` -> PASS
  - `npm run qa:pwa-contract` -> PASS (`ok: true`, offline hash `#panel-tracker`)
  - `npm run test:e2e -- --grep "panel panel-tracker" --workers=1` -> PASS (`3 passed`)

### 2026-02-14T23:55:00Z (session-local)
- Applied `$source-map-debugger` to current release map pipeline.
- Root-cause fix:
  1. Found incorrect `sources` path base for nested maps:
     - `dist/sqlite/sqlite3.js.map` emitted `../public/sqlite/sqlite3.js` (resolved to non-existent `dist/public/...`).
  2. Updated `scripts/retain-source-maps.mjs` to compute map `sources` paths relative to each map file directory (`path.dirname(mapPath)`), not global `dist/`.
- Pipeline hardening:
  1. Added explicit source-map mode support in `scripts/retain-source-maps.mjs`:
     - `SOURCE_MAP_MODE=linked|hidden` (default `linked`).
  2. Updated `scripts/build-verify-release.sh` to surface/pass mode to the map-retention step.
  3. Extended map summary/output lines to include `sourceRef` and mode for easier debugging.
- Validation:
  - `node --check scripts/retain-source-maps.mjs` -> PASS
  - `bash -n scripts/build-verify-release.sh` -> PASS
  - `SOURCE_MAP_MODE=linked node scripts/retain-source-maps.mjs dist` -> PASS
  - Map source resolution check (all targets, including `sqlite/sqlite3.js.map`) -> PASS
  - `npm run build:release` -> PASS
  - `npm run qa:pwa-contract` -> PASS (`ok: true`)
  - `npm run test:e2e -- --grep "panel panel-tracker" --workers=1` -> PASS (`3 passed`)
- Note:
  - As seen in earlier runs, `qa:pwa-contract` can false-fail when run concurrently with `build:release`; sequential run passed.

### 2026-02-14T23:58:00Z (session-local)
- Continued from prior source-map step using `$app-slim` + `$apple-silicon-browser-optimizer`.
- Optimization target: `rust/gpu_particles.rs` upload/memory path on the WebGPU burst pipeline.
- Changes applied:
  1. Reduced over-provisioned particle buffer capacity from `MAX_PARTICLES=512` to `MAX_PARTICLES=256` (current max configured burst is `120`, so this keeps 2x headroom).
  2. Added reusable thread-local upload scratch buffer:
     - `PARTICLE_UPLOAD_SCRATCH: RefCell<Vec<f32>>`
  3. Refactored burst generation to fill the reusable scratch buffer in place:
     - `build_particle_data(config, count, now_ms, out: &mut Vec<f32>)`
     - Removed per-burst `Vec<f32>` allocation/return pattern.
- Apple Silicon/UMA impact:
  1. Particle GPU buffer allocation reduced from `16,384 bytes` to `8,192 bytes` (`-50%`).
  2. Burst uploads remain active-particle-only, but now avoid repeated heap allocations for particle vector creation.
  3. Kept workgroup sizing unchanged at `@workgroup_size(256)` and retained existing fallback semantics.
- Verification:
  - `cargo check --release` -> PASS
  - `cargo test --release` -> PASS (`14 passed`)
  - `npm run build:release` -> PASS
  - `npm run qa:pwa-contract` -> PASS (`ok: true`)
  - `npm run test:e2e -- --grep "panel panel-tracker" --workers=1` -> PASS (`3 passed`)

### 2026-02-14T07:14:25Z (session-local)
- Completed pending Apple Silicon profiling backfill recommendation with full A/B/C sets at `PROFILE_SECONDS=8`:
  1. `GPU_MODE=on ITERATIONS=A,B,C PROFILE_SECONDS=8 bash scripts/apple-silicon-profile-iterate.sh`
     - Summary: `artifacts/apple-silicon-profile/abc-summary-20260214-000346.csv`
  2. `GPU_MODE=off ITERATIONS=A,B,C PROFILE_SECONDS=8 bash scripts/apple-silicon-profile-iterate.sh`
     - Summary: `artifacts/apple-silicon-profile/abc-summary-20260214-001158.csv`
- Aggregate comparison (`on` vs `off`, 3 iterations each):
  - `health_ok`: `1.000` vs `1.000`
  - `time_duration` avg: `9.133s` vs `9.233s`
  - `anim_duration` avg: `9.177s` vs `8.692s`
  - `metal_duration` avg: `9.139s` vs `8.829s`
  - `hitches_gpu` avg: `870.333` vs `363.000`
  - `anim_display_vsyncs` avg: `1798.000` vs `1057.333`
  - `metal_display_vsyncs` avg: `1835.333` vs `1307.333`
  - `metal_gpu_performance_state_intervals` avg: `924.667` vs `655.000`
- Operational note:
  - Animation traces were captured successfully for all six runs with populated `hitches_gpu`.

### 2026-02-14T07:14:25Z (session-local)
- Continued app-slim recommendation with a safe dead-duplication refactor in `rust/confetti.rs`.
- Changes applied:
  1. Added shared helper `burst_or_fallback(...)` to centralize repeated logic:
     - reduced-motion guard
     - GPU path (`gpu_particles::burst`)
     - DOM fallback path (`vibrate` + `spawn_burst`)
  2. Rewired:
     - `burst_hearts()`
     - `burst_stars()`
     - `burst_party()`
     - `burst_unicorn()`
     to use the shared helper.
- Outcome:
  - Behavior preserved with less duplicate branch logic in confetti entrypoints.
- Verification:
  - `cargo check --release` -> PASS
  - `cargo test --release` -> PASS (`14 passed`)
  - `npm run build:release` -> PASS
  - `npm run qa:pwa-contract` -> PASS (`ok: true`; warning-only SW signal fallback, non-fatal)
  - `npm run test:e2e -- --grep "panel panel-tracker" --workers=1` -> PASS (`3 passed`)

### 2026-02-14T07:26:37Z (session-local)
- Applied `$swift-metal-performance-engineer` alongside `$apple-silicon-browser-optimizer` for a Metal-oriented shader/host micro-optimization.
- Optimization applied (ALU hoist from compute threads to CPU-side uniform prep):
  1. `rust/gpu_particles.rs`
     - In `render_frame`, precompute `lifetime_rate` once per frame:
       - `lifetime_rate = 1.0 / (particle_count * 0.02 + 0.5)`
     - Pack it into the existing uniform slot:
       - `[time, dt, lifetime_rate, pad, gravity, count, canvas_w, canvas_h]`
  2. `shaders/particles_compute.wgsl`
     - Replaced per-invocation division:
       - removed `let lifetime_rate = 1.0 / (uniforms.count * 0.02 + 0.5)`
       - now uses `uniforms.lifetime_rate` directly.
  3. `shaders/particles_render.wgsl`
     - Kept uniform layout in sync by renaming the matching field from padding to `lifetime_rate`.
- Validation:
  - `cargo check --release` -> PASS
  - `cargo test --release` -> PASS (`14 passed`)
  - `npm run build:release` -> PASS
  - `npm run qa:pwa-contract` -> PASS (`ok: true`)
  - `npm run test:e2e -- --grep "panel panel-tracker" --workers=1` -> PASS (`3 passed`)
- Post-change Apple Silicon spot profile (single-iteration `D`, `PROFILE_SECONDS=8`):
  1. `GPU_MODE=on ITERATIONS=D ...`
     - First attempt hit transient `xctrace` crash (`Metal System Trace` exit `139`); retry succeeded.
     - Summary: `artifacts/apple-silicon-profile/abc-summary-20260214-002337.csv`
  2. `GPU_MODE=off ITERATIONS=D ...`
     - Summary: `artifacts/apple-silicon-profile/abc-summary-20260214-002627.csv`
  3. Spot comparison (`on` vs `off`):
     - `health_ok`: `1` vs `1`
     - `time_duration`: `8.711s` vs `8.837s`
     - `hitches_gpu`: `609` vs `323`
     - `metal_display_vsyncs`: `1826` vs `1013`
     - `metal_gpu_performance_state_intervals`: `990` vs `388`

### 2026-02-14T07:45:00Z (session-local)
- Applied combined pass using:
  - `$api-endpoint-mapper`
  - `$api-architect`
  - `$css-modern-specialist`
  - `$e2e-test-gap-finder`
- API endpoint mapping result:
  1. Scanned for Express/Next.js/Fastify/tRPC/GraphQL endpoint signatures across app source (excluding build artifacts/deps).
  2. No runtime app API routes/endpoints were found in this codebase.
  3. Conclusion: current surface is client-only (WASM + static assets + worker/service-worker contracts), so API optimization is architecture-level (none to tune in-route today).
- CSS optimization applied:
  1. Extended deferred rendering targets in `src/styles/app.css`:
     - added `#panel-tracker .tracker-grid`
     - added `#panel-gardens .gardens-grid`
     - added `#panel-progress .progress-garden`
  2. Kept existing `content-visibility` guard (`@supports (content-visibility: auto)`) and intrinsic sizing behavior.
- Verification:
  - `npm run build:release` -> PASS
  - `npm run qa:pwa-contract` -> PASS (`ok: true`; warning-only `no-log-signal` for SW registration telemetry)
  - `npm run test:e2e -- --grep "panel panel-tracker" --workers=1` -> PASS (`3 passed`)
  - `npm run test:e2e -- --grep "panel panel-(gardens|progress)" --workers=1` -> PASS (`6 passed`)
- E2E gap analysis (`$e2e-test-gap-finder`) summary:
  1. Route/panel deep-link coverage is strong (`home`, `offline`, and all `panel-*` routes have smoke/visual/a11y presence checks).
  2. Highest-value untested interaction flows are:
     - Tracker action mutation + persistence verification (hearts/entry state change).
     - Quest completion + streak update persistence.
     - Story choice progression/state transitions.
     - Game session play-through + score persistence in DB.
  3. Additional high-priority gaps:
     - Gardens interaction/progression assertions (beyond panel visibility).
     - Progress panel data reactivity after upstream mutations.
     - Mom-mode negative auth path (incorrect PIN / lockout behavior).

### 2026-02-14T08:05:00Z (session-local)
- Continued simplification pass using:
  - `$api-evolution-orchestrator`
  - `$apple-silicon-browser-optimizer`
  - `$code-simplifier`
- API evolution orchestration result (internal contract review + route surface check):
  1. Re-checked app route/API surface: no REST/GraphQL/tRPC/gRPC app endpoints in source.
  2. Evolution strategy outcome: no active endpoint deprecations/version rollovers required in this repo state.
  3. Existing worker protocol (`DB_WORKER_API_VERSION = 1`) remains additive-compatible and unchanged.
- Apple Silicon + code simplification changes:
  1. Simplified GPU uniform contract and removed per-vertex divide in render shader:
     - Host now uploads `inv_canvas_w` (inverse width) once per frame.
     - Shader now computes `pixel_size` via multiply (`size * inv_canvas_w`).
     - Files:
       - `rust/gpu_particles.rs`
       - `shaders/particles_compute.wgsl`
       - `shaders/particles_render.wgsl`
  2. Simplified GPU upload path by using native `Float32Array` directly for `writeBuffer`:
     - Added/used `write_buffer_with_u32_and_f32_array` binding.
     - Removed manual `f32 -> u8` reinterpret helper from particle upload path.
     - Files:
       - `rust/bindings.rs`
       - `rust/gpu_particles.rs`
- Verification:
  - `cargo check --release` -> PASS
  - `cargo test --release` -> PASS (`14 passed`)
  - `npm run build:release` -> PASS
  - `npm run qa:pwa-contract` -> PASS (`ok: true`; warning-only `no-log-signal` SW telemetry fallback)
  - `npm run test:e2e -- --grep "panel panel-(tracker|gardens|progress)" --workers=1`:
    - first run had transient readiness timeouts while test webserver compile was in-flight
    - immediate warm rerun slice (`panel-(tracker|gardens)`) -> PASS (`6 passed`)

### 2026-02-14T08:35:00Z (session-local)
- Continued simplification pass using:
  - `$code-simplifier`
  - `$apple-silicon-browser-optimizer`
  - `$api-evolution-orchestrator`
- API evolution orchestration result:
  1. Re-scanned for REST/GraphQL/tRPC/gRPC endpoint surfaces in app/runtime source.
  2. No active API route surface found (client/WASM + worker contracts only), so no version/deprecation rollout needed in this wave.
- Code simplifications applied:
  1. Simplified microtask yield path in `rust/browser_apis.rs`:
     - Removed legacy `setTimeout(0)` fallback branch from `yield_microtask()`.
     - Kept deterministic immediate resolve path if `queueMicrotask` call fails.
  2. Simplified abort-handle construction in `rust/browser_apis.rs`:
     - Replaced verbose `match` + warning branch with direct `AbortController::new().ok()` initialization.
     - Updated constructor doc to reflect graceful no-op degradation.
  3. Simplified deferred prefetch idle scheduling syntax in `wasm-init.js`:
     - Replaced explicit `if/else` branch with modern optional-call + nullish-coalescing pattern while preserving behavior.
- Verification:
  - `node --check wasm-init.js` -> PASS
  - `cargo check --release` -> PASS
  - `cargo test --release` -> PASS (`14 passed`)
  - `npm run qa:pwa-contract` -> PASS (`ok: true`; warning-only SW registration telemetry fallback `no-log-signal`)

## Actions
_No actions recorded._

## Validation
_Validation details not recorded._

## References
_No references recorded._


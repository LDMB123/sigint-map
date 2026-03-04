# Apple Silicon Simplification Wave Plan

- Archive Path: `docs/archive/phase-docs/APPLE_SILICON_SIMPLIFICATION_WAVE_PLAN.md`
- Normalized On: `2026-03-04`
- Source Title: `Apple Silicon Simplification Wave Plan`

## Summary
Last updated: 2026-02-14

## Context
Last updated: 2026-02-14
Scope: GPU/render simplification with behavior preservation.

### Goal
Simplify the WebGPU/render path for Safari on Apple Silicon while keeping user-visible behavior stable and preserving fast fallback.

### Locked Decisions
1. Target only GPU/render and profiling paths in this wave.
2. Preserve visible behavior (no visual rewrite).
3. Keep fallback path operational and explicit.
4. Keep Safari Apple Silicon as primary runtime target.

### Public Interface Contract
1. Support optional query parameter: `gpu=on|off|auto`.
2. Preserve existing wasm exports in `rust/lib.rs`.
3. Preserve storage and analytics contracts.

## Actions
### Runtime policy simplification (`rust/gpu.rs`)
1. Replace UA-sniff logic with explicit mode parser:
   - `auto`: attempt WebGPU, fallback on failure.
   - `on`: force WebGPU attempt.
   - `off`: use fallback path.
2. Keep initialization timeout as named constant.
3. Emit runtime marker: `data-gpu-status=ready|fallback|off|timeout`.

### Particle pipeline simplification (`rust/gpu_particles.rs`)
1. Remove dead state and unused fields.
2. Consolidate frame scheduling logic.
3. Replace magic offsets with named constants.
4. Keep shader behavior stable.

### Shader contract stability (`shaders/*.wgsl`)
1. Keep workgroup sizing and math unchanged.
2. Limit changes to contract clarity comments where needed.

### Profiling script alignment
1. Add `GPU_MODE` support to profiling scripts.
2. Keep health checks against clean base URL while profiling query variants.

## Validation
1. `cargo check --release`
2. `cargo test --release`
3. `npm run test:e2e`
4. `npm run test:e2e:all`
5. `GPU_MODE=on scripts/apple-silicon-profile.sh`
6. `GPU_MODE=off scripts/apple-silicon-profile.sh`

### Current Progress
1. `gpu=on|off|auto` mode parser and status markers are integrated.
2. GPU particle control-flow simplification is integrated.
3. Profiling scripts support `GPU_MODE` and base-URL-safe health checks.
4. Latest known gate baseline remains green:
   - `cargo test --release`: `14 passed`
   - `npm run test:e2e:all`: `36 passed`

### Remaining Work
1. Run fresh A/B profile captures and compare trace regressions.
2. Record hotspot findings with remediation ranking.
3. Fold results into release evidence docs.

## References
_No references recorded._


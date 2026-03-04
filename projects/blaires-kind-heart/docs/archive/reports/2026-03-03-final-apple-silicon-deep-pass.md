# Final Deep Apple-Silicon Browser Pass

- Archive Path: `docs/archive/reports/2026-03-03-final-apple-silicon-deep-pass.md`
- Normalized On: `2026-03-04`
- Source Title: `Final Deep Apple-Silicon Browser Pass`

## Summary
Implemented a final balanced optimization pass focused on:
- lowering WebGPU particle shader/render cost on iPad mini 6 while preserving style,
- eliminating avoidable timer wakeups in game loops,
- keeping the current WebGPU upload strategy (`writeBuffer` + `Uint8Array::view`) with no mapped-buffer binding expansion.

### Scope Applied

- In scope:
  - `rust/gpu_particles.rs`
  - `shaders/particles_render.wgsl`
  - `shaders/particles_compute.wgsl`
  - `rust/game_catcher.rs`
  - `rust/game_memory.rs`
  - `rust/game_hug.rs`
  - `rust/browser_apis.rs`
  - iPad profile tuning in `rust/gpu.rs`, `src/styles/tokens.css`, `src/styles/app.css`
- Out of scope:
  - no new mapped-buffer APIs in `rust/bindings.rs`
  - no gameplay rule changes

## Context
Date: 2026-03-03
Target: Safari 26.2 / iPad mini 6 (A15, 4 GB RAM)

## Actions
### 1) GPU Particle Low-Power Quality Path (iPad mini 6)

- Extended particle uniforms in both WGSL shaders:
  - added `sparkle_strength`
  - added `rotation_enabled`
  - added padding to keep 16-byte alignment/bind compatibility
- Vertex shader:
  - skips trig rotation when `rotation_enabled <= 0.5`
- Fragment shader:
  - disables sparkle pulse path when `sparkle_strength == 0.0`
- `rust/gpu_particles.rs`:
  - increased uniform payload size and writes new fields each frame
  - iPad profile defaults: `sparkle_strength=0.0`, `rotation_enabled=0.0`
  - non-iPad defaults: `1.0 / 1.0`
  - retained workgroup size `256`
  - reuses prebuilt bind groups (removed per-frame bind-group creation)
  - retains upload strategy: `writeBuffer` with `Uint8Array::view` (no mapped API expansion)

### 2) Catcher Spawn Scheduling Consolidation

- Removed interval-based spawn scheduling from `rust/game_catcher.rs`:
  - dropped `spawn_interval_id`
  - added `spawn_accumulator_ms: f64`
- Spawn cadence now runs inside RAF loop:
  - accumulates elapsed ms
  - emits spawns in `while accumulator >= CATCHER_SPAWN_INTERVAL_MS`
  - subtracts interval per spawn
- Kept existing guardrails:
  - `theme::CATCHER_SPAWN_INTERVAL_MS`
  - `CATCHER_MAX_ITEMS`

### 3) Visibility-Aware Power Guards

- Added `browser_apis::is_document_visible() -> bool`
- Added hidden-document early returns in:
  - Memory timer interval callback (`rust/game_memory.rs`)
  - Hug hold-meter interval callback (`rust/game_hug.rs`)
- Catcher RAF loop (`rust/game_catcher.rs`):
  - when hidden, resets timestamp baseline and skips physics/spawn update for that tick

### 4) Related iPad Profile Tuning

- `rust/gpu.rs`:
  - added iPad mini 6 profile detection and profile attrs on `<body>`
  - applies profile GPU canvas scale (`0.75`)
- `rust/confetti.rs`:
  - routes known confetti sets to GPU burst path when available
  - reduces aura particle count on iPad profile
- CSS token/style profile overrides:
  - reduced blur/shadow intensity and lowered expensive compositing pressure for iPad profile

## Validation
Commands run after implementation:

```bash
cargo check --target wasm32-unknown-unknown
npm run qa:pwa-contract
npm run test:e2e:webkit
```

Results:
- `cargo check` PASS
- PWA contract PASS
- WebKit smoke PASS (`1 passed`)

### Notes

- Physical iPad mini 6 end-to-end regression evidence is still required before final deployment approval.

## References
_No references recorded._


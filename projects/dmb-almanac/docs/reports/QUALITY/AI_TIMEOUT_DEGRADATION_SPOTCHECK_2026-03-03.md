# AI Timeout/Degradation Spot-Check (2026-03-03)

Generated: 2026-03-03  
Operator: codex  
Base URL: `http://127.0.0.1:3000`

## Scope

- Verify AI diagnostics surface cooldown/failure state without crashing.
- Verify degraded WebGPU path exposes recovery controls.

## Command

```bash
bash scripts/cutover-rehearsal.sh
# includes:
# tests/e2e/rust-ai-degradation.spec.js
```

## Result

- `18 passed (3.0m)` for the full Rust cutover E2E subset.
- `2/2` AI degradation assertions passed inside
  `e2e/tests/e2e/rust-ai-degradation.spec.js`.

## Assertions Covered

1. Worker cooldown state is visible and recoverable:
   - `Clear worker cooldown` action present in diagnostics.
   - cooldown warning event is present (`webgpu_worker_cooldown`).
   - cooldown clear path removes the active cooldown state on reload.
2. Explicit degraded GPU path is visible:
   - WebGPU disabled override surfaces `Enable WebGPU` control.
   - capability listing reflects `WebGPU enabled: no`.

## Sign-off

- [x] AI timeout/degradation release-window check executed.
- [ ] Engineering sign-off
- [ ] QA sign-off
- [ ] Release owner sign-off

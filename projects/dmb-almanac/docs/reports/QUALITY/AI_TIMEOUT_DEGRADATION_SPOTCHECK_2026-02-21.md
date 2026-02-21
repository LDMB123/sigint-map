# AI Timeout/Degradation Spot-Check (2026-02-21)

Generated: 2026-02-21  
Operator: codex  
Base URL: `http://127.0.0.1:3000`

## Scope

- Verify AI diagnostics surface cooldown/failure state without crashing.
- Verify degraded WebGPU path exposes recovery controls.

## Command

```bash
cd e2e
RUST_E2E=1 BASE_URL=http://127.0.0.1:3000 \
  npm run test:e2e -- tests/e2e/rust-ai-degradation.spec.js --project=chromium --workers=1
```

## Result

- `2 passed (2.9s)`
- Spec: `e2e/tests/e2e/rust-ai-degradation.spec.js`

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

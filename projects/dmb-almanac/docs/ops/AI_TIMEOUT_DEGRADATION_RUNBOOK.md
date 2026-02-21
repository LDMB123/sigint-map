# AI Timeout/Degradation Runbook

Repo: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac`

Goal: verify AI diagnostics degrade gracefully when worker/GPU paths are unavailable or cooling down.

## Scope

- Worker cooldown/error state is visible to users.
- Degraded mode controls are actionable (`Clear worker cooldown`, `Enable WebGPU`).
- No hard crash when AI acceleration is degraded.

## Preconditions

1. Start Rust server from `rust/`:
   - `cargo run -p xtask -- build-hydrate-pkg`
   - `cargo run -p dmb_server`
2. Confirm app is reachable:
   - `curl -fsS http://127.0.0.1:3000/ >/dev/null`
3. Ensure Playwright deps are installed:
   - `cd e2e && npm ci`

## Release-Window Gate Command

From repo root:

```bash
cd e2e
RUST_E2E=1 BASE_URL=http://127.0.0.1:3000 \
  npm run test:e2e -- tests/e2e/rust-ai-degradation.spec.js --project=chromium --workers=1
```

Expected result:
- All tests pass.
- Degradation labels/status copy render without hydration errors.

## Artifact

Record run output in:

- `docs/reports/QUALITY/AI_TIMEOUT_DEGRADATION_SPOTCHECK_<date>.md`

## Sign-off

- Engineering: confirms guardrail behavior is correct.
- QA: confirms release-window run output and no regressions.
- Release owner: approves release with this gate attached.

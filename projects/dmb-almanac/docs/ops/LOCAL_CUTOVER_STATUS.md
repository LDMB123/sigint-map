# Local Cutover Status (Pointer)

Date: 2026-03-05
Repo: `project root`

Detailed current status is canonical in `STATUS.md`.

## Last Verified Baseline

- This file is only a local verification pointer. It should not override `STATUS.md`.
- Rust AI diagnostics/degradation E2E:
  - `RUST_E2E=1 RUST_AI_DIAGNOSTICS_FULL=1 BASE_URL=http://127.0.0.1:3000 npx playwright test tests/e2e/rust-ai-degradation.spec.js --project=chromium --workers=1` (`4 passed`)
- Rust AI page smoke + degradation E2E:
  - `RUST_E2E=1 RUST_AI_DIAGNOSTICS_FULL=1 BASE_URL=http://127.0.0.1:3000 npx playwright test tests/e2e/rust-ai.spec.js tests/e2e/rust-ai-degradation.spec.js --project=chromium --workers=1` (`8 passed`)

## Local Cutover Commands

```bash
# Full local gate (recommended)
bash scripts/cutover-rehearsal.sh

# Remote-style run against already-running origin
BASE_URL=http://127.0.0.1:3100 bash scripts/cutover-remote-e2e.sh
```

## Operational References

- Global status: `STATUS.md`
- Cutover runbook: `docs/ops/CUTOVER_RUNBOOK.md`
- Rollback runbook: `docs/ops/ROLLBACK_RUNBOOK.md`

# Local Cutover Status (Pointer)

Date: 2026-02-15  
Repo: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac`

Detailed current status is canonical in `STATUS.md`.

## Last Verified Baseline

- Branch: `codex/dmb-almanac-handoff-20260215`
- Commit: `c928bd74`
- Local E2E: `RUST_E2E=1 BASE_URL=http://127.0.0.1:3000 npm run test:e2e` passed (`23 passed`)

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

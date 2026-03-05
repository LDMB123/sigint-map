# DMB Almanac Context Pack (Minimal)

Repo: `/Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac`

Use this file as a low-token session starter.
For full current state, always read `STATUS.md`.

## Load First

1. `README.md`
2. `STATUS.md`
3. `docs/README.md`
4. `docs/INDEX.md`
5. `docs/ops/CUTOVER_RUNBOOK.md`

## Core Commands

```bash
bash scripts/pristine-check.sh
bash scripts/cutover-rehearsal.sh
python3 scripts/token-context-report.py --scope active
```

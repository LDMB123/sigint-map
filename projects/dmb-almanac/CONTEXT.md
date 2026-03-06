# DMB Almanac Context Pack (Minimal)

Repo: `project root`

Use this file as a low-token session starter.
For full current state, always read `STATUS.md`.

## Load First

1. `README.md`
2. `STATUS.md`
3. `docs/guides/DMB_START_HERE.md`
4. `docs/README.md`
5. `rust/README.md`

If you are touching AI/runtime paths, also load:

- `docs/wasm/WASM_REFERENCE.md`
- `docs/gpu/GPU_REFERENCE.md`

## Core Commands

```bash
bash scripts/pristine-check.sh
bash scripts/cutover-rehearsal.sh
python3 scripts/token-context-report.py --scope active
```

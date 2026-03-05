# E2E Smoke Tests (Speakeasy v9)

## Quick Start

```bash
/Users/louisherman/ClaudeCodeProjects/projects/imagen-experiments/scripts/vegas/tests/run-e2e-smoke.sh
```

This runs:

1. `prompt-pack-qa.mjs` (always)  
   - Validates prompt IDs `81..100`, required ASQL/scene-graph/spatial-scratchpad/micro-physics sections, strict attire constraints, and word-budget envelopes.
   - Detects prompt drift before any model calls.

2. `e2e-smoke-mocked.mjs` (always)  
   - Uses local mock endpoints (`IMAGE_ENDPOINT`, `SCORER_ENDPOINT`) and `STATIC_ACCESS_TOKEN`.
   - Validates runner execution, quality-gate flow, and summary artifact integrity.

3. `e2e-smoke-scorer-hardfail.mjs` (always)  
   - Uses mock image success + mock scorer `503`.
   - Validates `SCORER_UNAVAILABLE_POLICY=hard_fail` blocks acceptance (no false positives).

4. `e2e-smoke-launcher-strict-mode.mjs` (always)  
   - Uses mock endpoints through `run-speakeasy-v9-default.sh --strict-mode hard`.
   - Validates launcher-enforced strict flags are reflected in `summary.runInfo`.
   - Runs launcher twice and asserts fresh-run isolation (`runNonce`, prompt hash, and run directory all change).

5. `e2e-smoke-microdetail-guard.mjs` (always)  
   - Intentionally injects profile-breaking env values (`MICRO_PHYSICS_LANGUAGE_ENFORCEMENT=0`, `MICRO_PHYSICS_BANNED_TERMS=off`).
   - Verifies microdetail profile guard fails fast with explicit invariant errors.

6. `e2e-smoke-live-gated.sh` (gated)  
   - Skips by default.
   - Uses a fresh per-attempt output base to prevent stale-run false positives.
   - Verifies strict-mode invariants from `summary.runInfo` (hard-fail scorer policy, quality gate, schema enforcement, checklist enforcement).
   - Verifies run freshness (run directory must live under the current attempt base and `createdAt` must be current-attempt timestamp).
   - Enable with:
   ```bash
   RUN_LIVE_IMAGE_E2E=1 \
   REFERENCE_IMAGE=/absolute/path/to/reference.jpg \
   /Users/louisherman/ClaudeCodeProjects/projects/imagen-experiments/scripts/vegas/tests/run-e2e-smoke.sh
   ```

Optional live knobs:
- `MAX_PROMPTS_LIVE` (default `1`)
- `OUTPUT_BASE_LIVE` (default `$HOME/nanobanana-output/projects/e2e-live-smoke`)
- `LIVE_SMOKE_MAX_TRIES` (default `3`, retries transient 429/no-image failures)
- `LIVE_SMOKE_RETRY_WAIT_S` (default `10`)

## Strict Mode

`run-speakeasy-v9-default.sh` now defaults to `--strict-mode hard`, which enforces:
- `SCORER_UNAVAILABLE_POLICY=hard_fail`
- `ENABLE_QUALITY_GATE=1`
- `SCORER_FORCE_SCHEMA=1`
- `SCORER_COMPACT_PROMPT=1`
- `SCORER_HEURISTIC_MIN_FIELDS=8`
- `PRIMARY_RESCUE_MAX_ATTEMPTS=2`
- `PHYSICS_REALISM_PRIORITY_MULTIPLIER=2`
- `PHYSICS_CHECKLIST_ENFORCE=1`
- `SKIP_SAFE_FALLBACK_ON_PRIMARY_REJECT=0`
- `PROMPT_DIRECTION_SUPREMACY_MODE=1`
- `RATE_LIMIT_ADAPTIVE_COOLDOWN=1` (with strict-mode adaptive cooldown defaults for 429 resilience)

Use `--strict-mode soft` only when troubleshooting scorer instability.

# Batch 1-40 Daring Micro-Physics Runbook

## Goal
Run prompts `01..40` with identity lock, non-explicit edgy editorial styling, and physics-rich micro-detail, while preserving high-fidelity output quality. All variants (primary/safe/rescue/retry) now route through a first-principles compiler to improve acceptance and consistency.

## Prompt Packs
- Batch 01-20: `/Users/louisherman/ClaudeCodeProjects/projects/imagen-experiments/scripts/vegas/prompt-packs/speakeasy_20_prompts_two_piece_cutting_edge_v17_daring_microphysics_1500.md`
- Batch 21-40: `/Users/louisherman/ClaudeCodeProjects/projects/imagen-experiments/scripts/vegas/prompt-packs/speakeasy_prompts_21_40_ultra_edge_v21_daring_microphysics_1500.md`

## Launchers
- Full sequential run: `/Users/louisherman/ClaudeCodeProjects/projects/imagen-experiments/scripts/vegas/run-speakeasy-1-40-seq-v17-v21.sh`
- Batch-2 quality run: `/Users/louisherman/ClaudeCodeProjects/projects/imagen-experiments/scripts/vegas/run-speakeasy-batch2-v21-quality-tuned.sh`

## Current High-Fidelity Defaults
- Throughput: `WAIT_BEFORE_ATTEMPT_S=61`, `RATE_LIMIT_RETRY_FLOOR_S=61`, `RATE_LIMIT_RETRY_MAX_S=120`
- Rate-limit resilience: `RATE_LIMIT_ADAPTIVE_COOLDOWN=1`, `RATE_LIMIT_COOLDOWN_BASE_S=61`, `RATE_LIMIT_COOLDOWN_MAX_S=300`, `ATTEMPT_WAIT_JITTER_S=2`
- Output profile: `OUTPUT_IMAGE_SIZE=2K`, `OUTPUT_ASPECT_RATIO=4:5`
- Resolution optimization: `RESOLUTION_OPTIMIZATION_MODE=1`, `RESOLUTION_MICRODETAIL_LEVEL=3`
- Prompt windows:
- Primary `1200..2200`
- Safe `1050..2000`
- Rescue `1200..2200`
- Hard-cap policy: `ENABLE_PROMPT_HARD_CAP=0` (disabled by default)
- First-principles compiler:
- `FIRST_PRINCIPLES_RECOMPILER_MODE=1`
- `FIRST_PRINCIPLES_SIGNAL_LEVEL=3`
- `NO_IMAGE_RECOVERY_RECOMPILER_MODE=1`
- Safety/quality recovery:
- `IMAGE_SAFETY_COMPLIANCE_DROP_LINES=0`
- `SAFE_QUALITY_RESCUE_MAX_ATTEMPTS=2`
- Near-pass quality policy:
- `QUALITY_NEAR_PASS_ENABLE=1`
- `QUALITY_NEAR_PASS_MIN_OVERALL=9.45`
- `QUALITY_NEAR_PASS_MAX_FAILED_DIMS=1`
- `QUALITY_NEAR_PASS_ALLOWED_KEYS=edge`
- Scorer policy: `SCORER_COMPACT_PROMPT=0`, `QUALITY_GATE_MAX_OUTPUT_TOKENS=1800`, strict requery schema enabled
- Safe retry caps: `SAFE_IMAGE_SAFETY_RETRY_PROMPT_WORD_CAP=2800`, `SAFE_IMAGE_SAFETY_RETRY_ULTRA_WORD_CAP=2600`

## Recommended Launch
```bash
cd /Users/louisherman/ClaudeCodeProjects/projects/imagen-experiments/scripts/vegas
REFERENCE_IMAGE=/Users/louisherman/Documents/Sierra1.jpeg \
./run-speakeasy-1-40-seq-v17-v21.sh
```

## Monitoring Artifacts
- Terminal stream + launcher log files under `/Users/louisherman/nanobanana-output/projects/img_1300`
- Per-run artifacts:
- `run-info.json`
- `summary.json`
- `prompt-build-diagnostics.json` (enabled when `PROMPT_BUILD_DIAGNOSTICS=1`)

## Notes
- The runner preserves true thigh-high semantics and no longer rewrites `thigh-high` to `knee-high` in safety transforms.
- If batch `01..20` fails in sequential mode, batch `21..40` does not start.

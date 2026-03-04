# Batch 1 Audit -> Batch 2 Quality Tuning (2026-03-03)

## Scope
- Batch 1 log: `/Users/louisherman/nanobanana-output/projects/img_1300/speakeasy-batch1-v17-20260303-171523.log`
- Batch 1 run dir: `/Users/louisherman/nanobanana-output/projects/img_1300/speakeasy-safe-fallback-20260303-171524-022-p6402`

## Batch-1 Failure Pattern
- Prompts were often over-expanded and then truncated by hard caps, degrading late prompt constraints.
- Scorer parse instability reduced ranking reliability during rescue selection.
- 429 retries introduced churn in rescue loops.

## Recovery Applied (Current Pipeline State)
- Runner: `/Users/louisherman/ClaudeCodeProjects/projects/imagen-experiments/scripts/vegas/prompt-packs/run_speakeasy_safe_fallback_batch.mjs`
- Launcher: `/Users/louisherman/ClaudeCodeProjects/projects/imagen-experiments/scripts/vegas/run-speakeasy-batch2-v21-quality-tuned.sh`

### Prompt Build and Windowing
- Variant-aware rich-prompt detection with separate thresholds:
- primary `5`
- safe `3`
- rescue `3`
- Dynamic windows:
- primary `1200..2200`
- safe `1050..2000`
- rescue `1200..2200`
- Hard cap now disabled by default (`ENABLE_PROMPT_HARD_CAP=0`) for fidelity-first image generation.
- First-principles recompilation now enabled by default:
- `FIRST_PRINCIPLES_RECOMPILER_MODE=1`
- `FIRST_PRINCIPLES_SIGNAL_LEVEL=3`
- `NO_IMAGE_RECOVERY_RECOMPILER_MODE=1`
- Every primary/safe/rescue/retry prompt is rebuilt from identity/scene/wardrobe/pose/physics fundamentals.
- Safe quality recovery is enabled (`SAFE_QUALITY_RESCUE_MAX_ATTEMPTS=2`) to recover quality-gate failures after a safe image is successfully generated.
- Safety compliance uses lexical replacement without aggressive line-dropping (`IMAGE_SAFETY_COMPLIANCE_DROP_LINES=0`) to preserve edge-scoring signals.

### Resolution Utilization
- Output defaults locked to high-fidelity portrait profile:
- `OUTPUT_IMAGE_SIZE=2K`
- `OUTPUT_ASPECT_RATIO=4:5`
- Added resolution-aware micro-detail block in primary, safe, and rescue prompt paths.
- Added controls:
- `RESOLUTION_OPTIMIZATION_MODE=1`
- `RESOLUTION_MICRODETAIL_LEVEL=3`

### Scorer Robustness
- Compact scorer prompt disabled by default (`SCORER_COMPACT_PROMPT=0`).
- Larger scorer budgets:
- `QUALITY_GATE_MAX_OUTPUT_TOKENS=1800`
- `SCORER_PARSE_REQUERY_MAX_OUTPUT_TOKENS=1400`
- `SCORER_REPAIR_MAX_OUTPUT_TOKENS=900`
- Strict schema-preserving requery is enabled before heuristic fallback.

### Reliability and Observability
- Baseline pacing remains 61s with retry floor 61s.
- Adaptive 429 controls enabled: `RATE_LIMIT_ADAPTIVE_COOLDOWN=1`, `RATE_LIMIT_COOLDOWN_BASE_S=61`, `RATE_LIMIT_COOLDOWN_MAX_S=300`, `ATTEMPT_WAIT_JITTER_S=2`.
- Near-pass policy enabled to reduce false-negative gate rejections on high-overall renders with a single allowed miss: `QUALITY_NEAR_PASS_ALLOWED_KEYS=edge`.
- Added per-prompt telemetry aggregation for 429s/retries/final failure reason.
- Added stale-run reconciler + PID-based run-state hygiene.
- Added `prompt-build-diagnostics.json` artifact.

## Operator Note
Use the quality launcher for batch 2:
```bash
/Users/louisherman/ClaudeCodeProjects/projects/imagen-experiments/scripts/vegas/run-speakeasy-batch2-v21-quality-tuned.sh
```

## Authoritative References Used
- Google Cloud Vertex AI model card for Gemini 3 Pro Image (updated `2026-03-03`): output behaviors, supported aspect ratios, and model-specific generation constraints.
  - https://cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/3-0-pro-image?authuser=3
- Google Cloud Vertex AI image generation documentation: image generation API patterns and image config usage.
  - https://cloud.google.com/vertex-ai/generative-ai/docs/multimodal/image-generation?authuser=3

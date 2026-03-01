#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VEGAS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
LAUNCHER="$VEGAS_DIR/run-speakeasy-v9-default.sh"

if [ "${RUN_LIVE_IMAGE_E2E:-0}" != "1" ]; then
  echo "[SKIP] Live E2E smoke is gated. Set RUN_LIVE_IMAGE_E2E=1 to enable."
  exit 0
fi

REFERENCE_IMAGE="${REFERENCE_IMAGE:-}"
if [ -z "$REFERENCE_IMAGE" ]; then
  echo "REFERENCE_IMAGE is required when RUN_LIVE_IMAGE_E2E=1" >&2
  exit 1
fi
if [ "${REFERENCE_IMAGE:0:1}" != "/" ] || [ ! -f "$REFERENCE_IMAGE" ]; then
  echo "REFERENCE_IMAGE must be an existing absolute path" >&2
  exit 1
fi

MAX_PROMPTS_LIVE="${MAX_PROMPTS_LIVE:-1}"
if ! [[ "$MAX_PROMPTS_LIVE" =~ ^[0-9]+$ ]]; then
  echo "MAX_PROMPTS_LIVE must be an integer" >&2
  exit 1
fi
LIVE_SMOKE_MAX_TRIES="${LIVE_SMOKE_MAX_TRIES:-3}"
if ! [[ "$LIVE_SMOKE_MAX_TRIES" =~ ^[0-9]+$ ]] || [ "$LIVE_SMOKE_MAX_TRIES" -lt 1 ]; then
  echo "LIVE_SMOKE_MAX_TRIES must be an integer >= 1" >&2
  exit 1
fi
LIVE_SMOKE_RETRY_WAIT_S="${LIVE_SMOKE_RETRY_WAIT_S:-10}"
if ! [[ "$LIVE_SMOKE_RETRY_WAIT_S" =~ ^[0-9]+$ ]] || [ "$LIVE_SMOKE_RETRY_WAIT_S" -lt 1 ]; then
  echo "LIVE_SMOKE_RETRY_WAIT_S must be an integer >= 1" >&2
  exit 1
fi

OUTPUT_BASE_LIVE="${OUTPUT_BASE_LIVE:-$HOME/nanobanana-output/projects/e2e-live-smoke}"
mkdir -p "$OUTPUT_BASE_LIVE"

echo "[LIVE] Starting gated live smoke run (max-prompts=$MAX_PROMPTS_LIVE, max-tries=$LIVE_SMOKE_MAX_TRIES)"
PASS=0
LATEST_RUN=""
LATEST_ATTEMPT_BASE=""
for ATTEMPT in $(seq 1 "$LIVE_SMOKE_MAX_TRIES"); do
  echo "[LIVE] Attempt $ATTEMPT/$LIVE_SMOKE_MAX_TRIES"
  LATEST_ATTEMPT_BASE="$(mktemp -d "$OUTPUT_BASE_LIVE/attempt-${ATTEMPT}-XXXXXX")"
  if [ -z "$LATEST_ATTEMPT_BASE" ] || [ ! -d "$LATEST_ATTEMPT_BASE" ]; then
    echo "[LIVE] Failed to create attempt output base under $OUTPUT_BASE_LIVE" >&2
    if [ "$ATTEMPT" -lt "$LIVE_SMOKE_MAX_TRIES" ]; then
      sleep "$LIVE_SMOKE_RETRY_WAIT_S"
    fi
    continue
  fi
  echo "[LIVE] Attempt output base: $LATEST_ATTEMPT_BASE"
  ATTEMPT_STARTED_EPOCH="$(date +%s)"

  if ! OUTPUT_BASE="$LATEST_ATTEMPT_BASE" WAIT_BEFORE_ATTEMPT_S="${WAIT_BEFORE_ATTEMPT_S:-1}" \
    "$LAUNCHER" --reference "$REFERENCE_IMAGE" --max-prompts "$MAX_PROMPTS_LIVE" --strict-mode hard; then
    echo "[LIVE] Launcher command failed on attempt $ATTEMPT (continuing)" >&2
  fi

  LATEST_RUN="$(ls -dt "$LATEST_ATTEMPT_BASE"/speakeasy-safe-fallback-* 2>/dev/null | head -n1 || true)"
  if [ -z "$LATEST_RUN" ]; then
    echo "[LIVE] No output folder detected after attempt $ATTEMPT in $LATEST_ATTEMPT_BASE" >&2
    if [ "$ATTEMPT" -lt "$LIVE_SMOKE_MAX_TRIES" ]; then
      sleep "$LIVE_SMOKE_RETRY_WAIT_S"
    fi
    continue
  fi

  SUMMARY_PATH="$LATEST_RUN/summary.json"
  if [ ! -f "$SUMMARY_PATH" ]; then
    echo "[LIVE] Missing summary.json after attempt $ATTEMPT: $SUMMARY_PATH" >&2
    if [ "$ATTEMPT" -lt "$LIVE_SMOKE_MAX_TRIES" ]; then
      sleep "$LIVE_SMOKE_RETRY_WAIT_S"
    fi
    continue
  fi

  if node - "$SUMMARY_PATH" "$MAX_PROMPTS_LIVE" "$LATEST_ATTEMPT_BASE" "$LATEST_RUN" "$ATTEMPT_STARTED_EPOCH" <<'NODE'
const fs = require('node:fs');
const path = require('node:path');
const summaryPath = process.argv[2];
const expectedPrompts = Number(process.argv[3]);
const expectedAttemptBase = process.argv[4];
const expectedRunPath = process.argv[5];
const attemptStartedEpoch = Number(process.argv[6]);
const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
const totals = summary?.totals || {};
const runInfo = summary?.runInfo || {};
const promptCount = Number(totals.prompts || 0);
const primarySuccess = Number(totals.primarySuccess || 0);
const safeSuccess = Number(totals.safeSuccess || 0);
const failed = Number(totals.failed || 0);
const attempted = primarySuccess + safeSuccess + failed;
if (promptCount !== expectedPrompts) {
  throw new Error(`Expected ${expectedPrompts} prompts, got ${promptCount}`);
}
if (attempted !== expectedPrompts) {
  throw new Error(`Expected ${expectedPrompts} attempts, got ${attempted}`);
}
if ((primarySuccess + safeSuccess) < 1) {
  throw new Error('Live smoke completed but produced zero successful outputs');
}
if (String(runInfo.scorerUnavailablePolicy || '').toLowerCase() !== 'hard_fail') {
  throw new Error(`Expected scorerUnavailablePolicy=hard_fail, got ${runInfo.scorerUnavailablePolicy}`);
}
if (runInfo.enableQualityGate !== true) {
  throw new Error(`Expected enableQualityGate=true, got ${runInfo.enableQualityGate}`);
}
if (runInfo.scorerForceSchema !== true) {
  throw new Error(`Expected scorerForceSchema=true, got ${runInfo.scorerForceSchema}`);
}
if (runInfo.physicsChecklistEnforce !== true) {
  throw new Error(`Expected physicsChecklistEnforce=true, got ${runInfo.physicsChecklistEnforce}`);
}
if (runInfo.skipSafeFallbackOnPrimaryReject !== false) {
  throw new Error(
    `Expected skipSafeFallbackOnPrimaryReject=false, got ${runInfo.skipSafeFallbackOnPrimaryReject}`
  );
}
if (runInfo.rateLimitAdaptiveCooldown !== true) {
  throw new Error(
    `Expected rateLimitAdaptiveCooldown=true, got ${runInfo.rateLimitAdaptiveCooldown}`
  );
}
if (!runInfo.runNonce || typeof runInfo.runNonce !== 'string') {
  throw new Error('Expected non-empty runNonce in runInfo');
}
if (runInfo.outputDirectory !== expectedRunPath) {
  throw new Error(`Expected runInfo.outputDirectory=${expectedRunPath}, got ${runInfo.outputDirectory}`);
}
if (path.dirname(expectedRunPath) !== expectedAttemptBase) {
  throw new Error(`Expected run folder inside attempt base ${expectedAttemptBase}, got ${expectedRunPath}`);
}
const createdAtMs = Date.parse(runInfo.createdAt || '');
if (!Number.isFinite(createdAtMs)) {
  throw new Error(`Expected parseable runInfo.createdAt, got ${runInfo.createdAt}`);
}
if (Math.floor(createdAtMs / 1000) < (attemptStartedEpoch - 2)) {
  throw new Error(
    `Expected runInfo.createdAt >= attempt start (${attemptStartedEpoch}), got ${runInfo.createdAt}`
  );
}
console.log(`PASS live gated E2E smoke: prompts=${promptCount}, successes=${primarySuccess + safeSuccess}, failed=${failed}`);
NODE
  then
    PASS=1
    break
  fi

  if [ "$ATTEMPT" -lt "$LIVE_SMOKE_MAX_TRIES" ]; then
    echo "[LIVE] Retrying in ${LIVE_SMOKE_RETRY_WAIT_S}s due to transient failure..."
    sleep "$LIVE_SMOKE_RETRY_WAIT_S"
  fi
done

if [ -z "$LATEST_RUN" ]; then
  echo "Live smoke run did not produce an output folder in any attempt base under $OUTPUT_BASE_LIVE" >&2
  exit 1
fi

SUMMARY_PATH="$LATEST_RUN/summary.json"
if [ ! -f "$SUMMARY_PATH" ]; then
  echo "Missing summary.json: $SUMMARY_PATH" >&2
  exit 1
fi

if [ "$PASS" -ne 1 ]; then
  echo "Live smoke failed after ${LIVE_SMOKE_MAX_TRIES} attempt(s). Last artifacts: $LATEST_RUN" >&2
  exit 1
fi

echo "[LIVE] Artifacts: $LATEST_RUN"

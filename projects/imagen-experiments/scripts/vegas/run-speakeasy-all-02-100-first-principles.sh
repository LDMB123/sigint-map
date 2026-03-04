#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUNNER="$SCRIPT_DIR/prompt-packs/run_speakeasy_safe_fallback_batch.mjs"
PROMPT_PACK="${PROMPT_PACK:-$SCRIPT_DIR/prompt-packs/speakeasy_prompts_02_100_first_principles_rewrite_v1.md}"
REFERENCE_IMAGE="${REFERENCE_IMAGE:-/Users/louisherman/Documents/Sierra1.jpeg}"
GCLOUD_BIN="${GCLOUD_BIN:-/Users/louisherman/google-cloud-sdk/bin/gcloud}"

if [[ ! -f "$RUNNER" ]]; then
  echo "Runner not found: $RUNNER" >&2
  exit 1
fi
if [[ ! -f "$PROMPT_PACK" ]]; then
  echo "Prompt pack not found: $PROMPT_PACK" >&2
  exit 1
fi
if [[ ! -f "$REFERENCE_IMAGE" ]]; then
  echo "Reference image not found: $REFERENCE_IMAGE" >&2
  exit 1
fi
if [[ ! -x "$GCLOUD_BIN" ]]; then
  echo "gcloud binary not executable: $GCLOUD_BIN" >&2
  exit 1
fi

TS="$(date +%Y%m%d-%H%M%S)"
LOG_ROOT="${LOG_ROOT:-$HOME/nanobanana-output/projects/img_1300}"
mkdir -p "$LOG_ROOT"

RUN_DIR="${RUN_DIR:-$LOG_ROOT/speakeasy-safe-fallback-${TS}-02-100-first-principles}"
mkdir -p "$RUN_DIR"
LOG_FILE="${LOG_FILE:-$LOG_ROOT/speakeasy-02-100-first-principles-${TS}.log}"
SUMMARY_PATH="$RUN_DIR/summary.json"

export STRICT_61S_ATTEMPT_PACING="${STRICT_61S_ATTEMPT_PACING:-1}"
export WAIT_BEFORE_ATTEMPT_S="${WAIT_BEFORE_ATTEMPT_S:-61}"
export REQUEST_TIMEOUT_MS="${REQUEST_TIMEOUT_MS:-90000}"
export IMAGE_HTTP_RETRIES="${IMAGE_HTTP_RETRIES:-0}"
export RATE_LIMIT_RETRY_FLOOR_S="${RATE_LIMIT_RETRY_FLOOR_S:-61}"
export RATE_LIMIT_RETRY_MAX_S="${RATE_LIMIT_RETRY_MAX_S:-61}"
export RATE_LIMIT_COOLDOWN_BASE_S="${RATE_LIMIT_COOLDOWN_BASE_S:-61}"
export RATE_LIMIT_COOLDOWN_MAX_S="${RATE_LIMIT_COOLDOWN_MAX_S:-61}"
export RATE_LIMIT_COOLDOWN_GROWTH="${RATE_LIMIT_COOLDOWN_GROWTH:-1}"
export RATE_LIMIT_FAIL_FAST_COOLDOWN_S="${RATE_LIMIT_FAIL_FAST_COOLDOWN_S:-61}"
export RATE_LIMIT_FAIL_FAST_MIN_CONSECUTIVE_429="${RATE_LIMIT_FAIL_FAST_MIN_CONSECUTIVE_429:-1}"
export ATTEMPT_WAIT_JITTER_S="${ATTEMPT_WAIT_JITTER_S:-0}"

export PHYSICS_DENSITY_MULTIPLIER="${PHYSICS_DENSITY_MULTIPLIER:-5}"
export PHYSICS_DENSITY_BASELINE_PROMPT_ID="${PHYSICS_DENSITY_BASELINE_PROMPT_ID:-21}"
export PHYSICS_DENSITY_MIN_RATIO="${PHYSICS_DENSITY_MIN_RATIO:-5.0}"
export MICRO_PHYSICS_BANNED_TERMS="${MICRO_PHYSICS_BANNED_TERMS:-strict}"
export MICRO_PHYSICS_LANGUAGE_ENFORCEMENT="${MICRO_PHYSICS_LANGUAGE_ENFORCEMENT:-1}"

export PRESSURE_PAUSE_ENABLED="${PRESSURE_PAUSE_ENABLED:-1}"
export PRESSURE_PAUSE_CONSECUTIVE_PROMPTS="${PRESSURE_PAUSE_CONSECUTIVE_PROMPTS:-2}"
export PRESSURE_PAUSE_COOLDOWN_MIN="${PRESSURE_PAUSE_COOLDOWN_MIN:-15}"
export PRESSURE_PAUSE_MAX_CYCLES="${PRESSURE_PAUSE_MAX_CYCLES:-6}"
export AUTO_RESUME_ENABLED="${AUTO_RESUME_ENABLED:-1}"
export AUTO_RESUME_POLL_S="${AUTO_RESUME_POLL_S:-30}"

export RATE_LIMIT_SKIP_SAFE_FALLBACK_ON_PRESSURE="${RATE_LIMIT_SKIP_SAFE_FALLBACK_ON_PRESSURE:-0}"
export SKIP_SAFE_FALLBACK_ON_PRIMARY_REJECT="${SKIP_SAFE_FALLBACK_ON_PRIMARY_REJECT:-0}"

export ENABLE_RESEARCH_MICRODETAIL_EXPANSION="${ENABLE_RESEARCH_MICRODETAIL_EXPANSION:-1}"
export PROMPT_REINFORCEMENT_MAX_PASSES="${PROMPT_REINFORCEMENT_MAX_PASSES:-4}"
export TARGETED_MICRODETAIL_MODE="${TARGETED_MICRODETAIL_MODE:-1}"
export MICRODETAIL_MODULE_CAP="${MICRODETAIL_MODULE_CAP:-6}"
export PROMPT_BUILD_DIAGNOSTICS="${PROMPT_BUILD_DIAGNOSTICS:-1}"
export FIRST_PRINCIPLES_RECOMPILER_MODE="${FIRST_PRINCIPLES_RECOMPILER_MODE:-1}"
export FIRST_PRINCIPLES_SIGNAL_LEVEL="${FIRST_PRINCIPLES_SIGNAL_LEVEL:-3}"
export IMAGE_SAFETY_COMPLIANCE_MODE="${IMAGE_SAFETY_COMPLIANCE_MODE:-1}"
export IMAGE_SAFETY_COMPLIANCE_DROP_LINES="${IMAGE_SAFETY_COMPLIANCE_DROP_LINES:-0}"

export DARING_EDITORIAL_MODE="${DARING_EDITORIAL_MODE:-0}"
export SENSUAL_EDITORIAL_BOOST="${SENSUAL_EDITORIAL_BOOST:-0}"
export SENSUAL_VARIANCE_GUARD="${SENSUAL_VARIANCE_GUARD:-0}"
export SKIN_FORWARD_STYLING="${SKIN_FORWARD_STYLING:-0}"
export ATTIRE_BOLD_BOOST="${ATTIRE_BOLD_BOOST:-0}"

export RUN_OUTPUT_DIR="$RUN_DIR"
export MAX_PROMPTS="${MAX_PROMPTS:-99}"
RESUME_FROM_PROMPT_ID="${RESUME_FROM_PROMPT_ID:-02}"

printf "=== Full Rewrite Run (02-100, first-principles) ===\n"
printf "Reference image : %s\n" "$REFERENCE_IMAGE"
printf "Prompt pack     : %s\n" "$PROMPT_PACK"
printf "Run dir         : %s\n" "$RUN_DIR"
printf "Log             : %s\n" "$LOG_FILE"
printf "Pacing          : strict=%s wait=%ss retryFloor=%ss retryMax=%ss\n" "$STRICT_61S_ATTEMPT_PACING" "$WAIT_BEFORE_ATTEMPT_S" "$RATE_LIMIT_RETRY_FLOOR_S" "$RATE_LIMIT_RETRY_MAX_S"
printf "Density gate    : multiplier=%s baselinePrompt=%s minRatio=%s\n" "$PHYSICS_DENSITY_MULTIPLIER" "$PHYSICS_DENSITY_BASELINE_PROMPT_ID" "$PHYSICS_DENSITY_MIN_RATIO"
printf "Pause/resume    : enabled=%s threshold=%s cooldownMin=%s maxCycles=%s poll=%ss\n\n" "$PRESSURE_PAUSE_ENABLED" "$PRESSURE_PAUSE_CONSECUTIVE_PROMPTS" "$PRESSURE_PAUSE_COOLDOWN_MIN" "$PRESSURE_PAUSE_MAX_CYCLES" "$AUTO_RESUME_POLL_S"

refresh_access_token() {
  local token
  if ! token="$($GCLOUD_BIN auth print-access-token 2>/dev/null)"; then
    echo "Failed to obtain access token via $GCLOUD_BIN auth print-access-token" >&2
    return 1
  fi
  token="${token//$'\n'/}"
  if [[ -z "$token" ]]; then
    echo "Access token is empty." >&2
    return 1
  fi
  export STATIC_ACCESS_TOKEN="$token"
}

while true; do
  export RESUME_FROM_PROMPT_ID
  refresh_access_token

  set +e
  node "$RUNNER" "$PROMPT_PACK" "$REFERENCE_IMAGE" > >(tee -a "$LOG_FILE") 2>&1
  RUNNER_STATUS=$?
  set -e

  if [[ ! -f "$SUMMARY_PATH" ]]; then
    echo "Summary not found after runner exit: $SUMMARY_PATH" >&2
    exit 1
  fi

  RUN_STATUS="$(node -e 'const fs=require("fs");const s=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));process.stdout.write(String(s?.runState?.status||"unknown"));' "$SUMMARY_PATH")"

  if [[ "$RUN_STATUS" == "completed" ]]; then
    printf "\nFull rewrite run complete.\nSummary: %s\nLog: %s\n" "$SUMMARY_PATH" "$LOG_FILE"
    exit 0
  fi

  if [[ "$RUN_STATUS" == "paused_pressure" ]]; then
    NEXT_RESUME_AT="$(node -e 'const fs=require("fs");const s=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));process.stdout.write(String(s?.runState?.nextResumeAt||""));' "$SUMMARY_PATH")"
    RESUME_FROM_PROMPT_ID="$(node -e 'const fs=require("fs");const s=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));process.stdout.write(String(s?.runState?.resumeFromPromptId||""));' "$SUMMARY_PATH")"
    if [[ -z "$RESUME_FROM_PROMPT_ID" || -z "$NEXT_RESUME_AT" ]]; then
      echo "Paused state missing resume metadata in summary." >&2
      exit 1
    fi
    printf "\nPaused on pressure. Next resume at %s from prompt %s.\n" "$NEXT_RESUME_AT" "$RESUME_FROM_PROMPT_ID" | tee -a "$LOG_FILE"

    while true; do
      REMAINING_S="$(node -e 'const fs=require("fs");const s=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));const t=Date.parse(s?.runState?.nextResumeAt||"");const now=Date.now();const rem=Number.isFinite(t)?Math.max(0,Math.ceil((t-now)/1000)):0;process.stdout.write(String(rem));' "$SUMMARY_PATH")"
      if [[ "$REMAINING_S" -le 0 ]]; then
        break
      fi
      SLEEP_S="$AUTO_RESUME_POLL_S"
      if [[ "$REMAINING_S" -lt "$SLEEP_S" ]]; then
        SLEEP_S="$REMAINING_S"
      fi
      sleep "$SLEEP_S"
    done
    continue
  fi

  echo "Runner exited with status $RUNNER_STATUS and terminal runState.status=$RUN_STATUS" >&2
  echo "Summary: $SUMMARY_PATH" >&2
  echo "Log: $LOG_FILE" >&2
  exit "${RUNNER_STATUS:-1}"
done

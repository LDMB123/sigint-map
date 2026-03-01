#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUNNER="$SCRIPT_DIR/prompt-packs/run_speakeasy_safe_fallback_batch.mjs"
PROMPT_FILE="$SCRIPT_DIR/prompt-packs/speakeasy_prompts_81_100_luxury_suite_v9_devils_advocate_hardened.md"

usage() {
  cat <<'EOF'
Usage:
  run-speakeasy-v9-default.sh --reference /abs/path/reference.jpg [--max-prompts N] [--strict-mode MODE]

Options:
  --reference PATH    Absolute path to reference image (required)
  --max-prompts N     Override MAX_PROMPTS (default runner value: 20)
  --strict-mode MODE  hard (default) | soft
  --help              Show this help

Notes:
  - Uses the hardened v9 intimate luxury-suite two-piece lace prompt pack by default.
  - You can still override prompt file by invoking the node runner directly.
EOF
}

REFERENCE_IMAGE=""
MAX_PROMPTS_OVERRIDE=""
STRICT_MODE="hard"

while [ $# -gt 0 ]; do
  case "$1" in
    --reference)
      REFERENCE_IMAGE="${2:-}"; shift 2 ;;
    --max-prompts)
      MAX_PROMPTS_OVERRIDE="${2:-}"; shift 2 ;;
    --strict-mode)
      STRICT_MODE="${2:-}"; shift 2 ;;
    --help|-h)
      usage; exit 0 ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1 ;;
  esac
done

if [ -z "$REFERENCE_IMAGE" ]; then
  echo "Missing --reference" >&2
  usage
  exit 1
fi
if [ "${REFERENCE_IMAGE:0:1}" != "/" ] || [ ! -f "$REFERENCE_IMAGE" ]; then
  echo "--reference must be an existing absolute path" >&2
  exit 1
fi
if [ -n "$MAX_PROMPTS_OVERRIDE" ] && ! [[ "$MAX_PROMPTS_OVERRIDE" =~ ^[0-9]+$ ]]; then
  echo "--max-prompts must be an integer" >&2
  exit 1
fi
if [ "$STRICT_MODE" != "hard" ] && [ "$STRICT_MODE" != "soft" ]; then
  echo "--strict-mode must be hard or soft" >&2
  exit 1
fi

if [ "$STRICT_MODE" = "hard" ]; then
  STRICT_ENV=(
    SCORER_UNAVAILABLE_POLICY=hard_fail
    ENABLE_QUALITY_GATE=1
    SCORER_FORCE_SCHEMA=1
    SCORER_COMPACT_PROMPT=1
    SCORER_SELF_HEAL_RETRIES="${SCORER_SELF_HEAL_RETRIES:-2}"
    SCORER_PARSE_REPAIR_RETRIES="${SCORER_PARSE_REPAIR_RETRIES:-3}"
    SCORER_PARSE_REQUERY_ON_FAIL="${SCORER_PARSE_REQUERY_ON_FAIL:-1}"
    SCORER_PARSE_REQUERY_MAX_OUTPUT_TOKENS="${SCORER_PARSE_REQUERY_MAX_OUTPUT_TOKENS:-700}"
    SCORER_HEURISTIC_MIN_FIELDS="${SCORER_HEURISTIC_MIN_FIELDS:-8}"
    SCORER_INTENT_DIGEST_MAX_CHARS="${SCORER_INTENT_DIGEST_MAX_CHARS:-420}"
    QUALITY_GATE_MAX_OUTPUT_TOKENS="${QUALITY_GATE_MAX_OUTPUT_TOKENS:-1000}"
    SCORER_REPAIR_MAX_OUTPUT_TOKENS="${SCORER_REPAIR_MAX_OUTPUT_TOKENS:-520}"
    PHYSICS_CHECKLIST_ENFORCE=1
    PHYSICS_REALISM_PRIORITY_MULTIPLIER="${PHYSICS_REALISM_PRIORITY_MULTIPLIER:-2}"
    PHYSICS_REALISM_PROMPT_DENSITY="${PHYSICS_REALISM_PROMPT_DENSITY:-3}"
    ENABLE_RESEARCH_MICRODETAIL_EXPANSION="${ENABLE_RESEARCH_MICRODETAIL_EXPANSION:-1}"
    PROMPT_TARGET_WORDS="${PROMPT_TARGET_WORDS:-1500}"
    SAFE_POLICY_HARDENING="${SAFE_POLICY_HARDENING:-1}"
    SAFE_FALLBACK_SOURCE="${SAFE_FALLBACK_SOURCE:-safe_prompt}"
    SAFE_TRANSFER_PRIMARY_ANCHORS="${SAFE_TRANSFER_PRIMARY_ANCHORS:-1}"
    PRIMARY_RESCUE_MAX_ATTEMPTS="${PRIMARY_RESCUE_MAX_ATTEMPTS:-2}"
    SKIP_SAFE_FALLBACK_ON_PRIMARY_REJECT=0
    PROMPT_DIRECTION_SUPREMACY_MODE=1
    RATE_LIMIT_ADAPTIVE_COOLDOWN=1
    RATE_LIMIT_COOLDOWN_BASE_S="${RATE_LIMIT_COOLDOWN_BASE_S:-10}"
    RATE_LIMIT_COOLDOWN_MAX_S="${RATE_LIMIT_COOLDOWN_MAX_S:-90}"
    RATE_LIMIT_COOLDOWN_GROWTH="${RATE_LIMIT_COOLDOWN_GROWTH:-1.6}"
  )
else
  STRICT_ENV=()
fi

if [ -n "$MAX_PROMPTS_OVERRIDE" ]; then
  env "${STRICT_ENV[@]}" MAX_PROMPTS="$MAX_PROMPTS_OVERRIDE" node "$RUNNER" "$PROMPT_FILE" "$REFERENCE_IMAGE"
else
  env "${STRICT_ENV[@]}" node "$RUNNER" "$PROMPT_FILE" "$REFERENCE_IMAGE"
fi

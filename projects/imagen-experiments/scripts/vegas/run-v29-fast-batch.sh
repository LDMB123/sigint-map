#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MANAGED_RUNNER="$SCRIPT_DIR/run-v29-managed.sh"

PROJECTS_ROOT_DEFAULT="$HOME/nanobanana-output/projects"
INTERNAL_ROOT_DEFAULT="$HOME/nanobanana-output/_internal"
MIN_CONCEPT_ID=521
MAX_CONCEPT_ID=540

usage() {
  cat <<'EOF'
Usage:
  run-v29-fast-batch.sh --reference /abs/path/IMG_4947.jpeg --range 521 540 [options]

Required:
  --reference PATH          Absolute path to reference image
  --range START END         Inclusive concept id range (521..540)

Options:
  --quality MODE            full (default) | passA
  --run-profile PROFILE     simple (default) | streamlined | full
  --max-attempts N          Max attempts per concept (default: 1)
  --retry-wait S            Retry wait seconds (default: 90)
  --beam-order ORDER        FRONTIER_BEAM_ORDER override
  --project-root PATH       Project root (default: $HOME/nanobanana-output/projects)
  --internal-root PATH      Internal root for logs/runs/summary (default: $HOME/nanobanana-output/_internal)
  --help                    Show this help

Behavior:
  - Runs global phased mode in one process:
      Phase A (all concepts) -> Phase B (all concepts) -> Phase C (all concepts)
  - Writes one batch folder with:
      Pass A/, Pass B/, Pass C/
EOF
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing required command: $1" >&2
    exit 1
  }
}

sanitize_tag() {
  local in="$1"
  local out
  out="$(printf '%s' "$in" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9._-]+/-/g; s/^-+//; s/-+$//')"
  if [ -z "$out" ]; then
    out="reference"
  fi
  printf '%s\n' "$out"
}

REFERENCE_IMAGE=""
RUN_START=""
RUN_END=""
QUALITY_MODE="full"
RUN_PROFILE="simple"
MAX_ATTEMPTS=1
RETRY_WAIT=90
BEAM_ORDER=""
PROJECTS_ROOT="$PROJECTS_ROOT_DEFAULT"
INTERNAL_ROOT="$INTERNAL_ROOT_DEFAULT"

while [ $# -gt 0 ]; do
  case "$1" in
    --reference)
      REFERENCE_IMAGE="${2:-}"; shift 2 ;;
    --range)
      RUN_START="${2:-}"; RUN_END="${3:-}"; shift 3 ;;
    --quality)
      QUALITY_MODE="${2:-}"; shift 2 ;;
    --run-profile)
      RUN_PROFILE="${2:-}"; shift 2 ;;
    --max-attempts)
      MAX_ATTEMPTS="${2:-}"; shift 2 ;;
    --retry-wait)
      RETRY_WAIT="${2:-}"; shift 2 ;;
    --beam-order)
      BEAM_ORDER="${2:-}"; shift 2 ;;
    --project-root)
      PROJECTS_ROOT="${2:-}"; shift 2 ;;
    --internal-root)
      INTERNAL_ROOT="${2:-}"; shift 2 ;;
    --help|-h)
      usage; exit 0 ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1 ;;
  esac
done

need_cmd rg

if [ -z "$REFERENCE_IMAGE" ]; then
  echo "Missing --reference" >&2
  usage
  exit 1
fi
if [ "${REFERENCE_IMAGE:0:1}" != "/" ] || [ ! -f "$REFERENCE_IMAGE" ]; then
  echo "--reference must be an existing absolute path" >&2
  exit 1
fi
if [ -z "$RUN_START" ] || [ -z "$RUN_END" ]; then
  echo "Missing --range START END" >&2
  usage
  exit 1
fi
if ! [[ "$RUN_START" =~ ^[0-9]+$ ]] || ! [[ "$RUN_END" =~ ^[0-9]+$ ]]; then
  echo "Concept range must be integers." >&2
  exit 1
fi
if [ "$RUN_START" -lt "$MIN_CONCEPT_ID" ] || [ "$RUN_END" -gt "$MAX_CONCEPT_ID" ] || [ "$RUN_START" -gt "$RUN_END" ]; then
  echo "Concept range must be within ${MIN_CONCEPT_ID}..${MAX_CONCEPT_ID} and start<=end." >&2
  exit 1
fi
if [ "$QUALITY_MODE" != "passA" ] && [ "$QUALITY_MODE" != "full" ]; then
  echo "--quality must be passA or full" >&2
  exit 1
fi
if [ "$RUN_PROFILE" != "simple" ] && [ "$RUN_PROFILE" != "streamlined" ] && [ "$RUN_PROFILE" != "full" ]; then
  echo "--run-profile must be simple, streamlined, or full" >&2
  exit 1
fi
if ! [[ "$MAX_ATTEMPTS" =~ ^[0-9]+$ ]] || [ "$MAX_ATTEMPTS" -lt 1 ]; then
  echo "--max-attempts must be >= 1" >&2
  exit 1
fi
if ! [[ "$RETRY_WAIT" =~ ^[0-9]+$ ]] || [ "$RETRY_WAIT" -lt 90 ]; then
  echo "--retry-wait must be >= 90" >&2
  exit 1
fi
if [ "${INTERNAL_ROOT:0:1}" != "/" ]; then
  echo "--internal-root must be an absolute path" >&2
  exit 1
fi

REF_BASE="$(basename "$REFERENCE_IMAGE")"
REF_STEM="${REF_BASE%.*}"
REF_TAG="$(sanitize_tag "$REF_STEM")"
BATCH_TS="$(date +%Y-%m-%dT%H-%M-%S)"
PROJECT_DIR="$PROJECTS_ROOT/$REF_TAG"
INTERNAL_PROJECT_DIR="$INTERNAL_ROOT/$REF_TAG"
LOG_DIR="$INTERNAL_PROJECT_DIR/logs/three-phase/$BATCH_TS"
BATCH_STAGE_DIR="$PROJECT_DIR/batch-$BATCH_TS"
RUN_LOG="$LOG_DIR/run.log"

mkdir -p "$LOG_DIR" "$BATCH_STAGE_DIR/Pass A" "$BATCH_STAGE_DIR/Pass B" "$BATCH_STAGE_DIR/Pass C"

echo "=== V29 Three-Phase Batch ==="
echo "Reference      : $REFERENCE_IMAGE"
echo "Range          : ${RUN_START}-${RUN_END}"
echo "Quality        : $QUALITY_MODE"
echo "Run profile    : $RUN_PROFILE"
echo "Max attempts   : $MAX_ATTEMPTS"
echo "Project folder : $PROJECT_DIR"
echo "Stage outputs  : $BATCH_STAGE_DIR"
echo "Internal logs  : $LOG_DIR"
echo "Phase order    : A(all) -> B(all) -> C(all)"
echo

cmd=(
  "$MANAGED_RUNNER"
  --reference "$REFERENCE_IMAGE"
  --range "$RUN_START" "$RUN_END"
  --quality "$QUALITY_MODE"
  --run-profile "$RUN_PROFILE"
  --max-attempts "$MAX_ATTEMPTS"
  --retry-wait "$RETRY_WAIT"
  --project-root "$PROJECTS_ROOT"
  --internal-root "$INTERNAL_ROOT"
  --simple-stage-root "$BATCH_STAGE_DIR"
)
if [ -n "$BEAM_ORDER" ]; then
  cmd+=(--beam-order "$BEAM_ORDER")
fi

set +e
PHASED_BATCH_MODE=1 "${cmd[@]}" 2>&1 | tee "$RUN_LOG"
status=${PIPESTATUS[0]}
set -e

count_a=$(find "$BATCH_STAGE_DIR/Pass A" -maxdepth 1 -type f | wc -l | tr -d ' ')
count_b=$(find "$BATCH_STAGE_DIR/Pass B" -maxdepth 1 -type f | wc -l | tr -d ' ')
count_c=$(find "$BATCH_STAGE_DIR/Pass C" -maxdepth 1 -type f | wc -l | tr -d ' ')

echo
echo "=== Batch Folder Summary ==="
echo "Pass A files  : $count_a"
echo "Pass B files  : $count_b"
echo "Pass C files  : $count_c"
echo "Batch folder  : $BATCH_STAGE_DIR"
echo "Run log       : $RUN_LOG"

exit "$status"

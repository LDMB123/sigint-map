#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SELF_SCRIPT="$SCRIPT_DIR/$(basename "${BASH_SOURCE[0]}")"
BASE_RUNNER="$SCRIPT_DIR/run-v29-bold-safe-5x.sh"
FACE_ID_SCRIPT="$SCRIPT_DIR/vegas-face-identity-vision.swift"

PROJECTS_ROOT_DEFAULT="$HOME/nanobanana-output/projects"
INTERNAL_ROOT_DEFAULT="$HOME/nanobanana-output/_internal"
MIN_CONCEPT_ID=521
MAX_CONCEPT_ID=540

usage() {
  cat <<'EOF'
Usage:
  run-v29-managed.sh --reference /abs/path/IMG_4947.jpeg --concept 527 [options]
  run-v29-managed.sh --reference /abs/path/IMG_4947.jpeg --range 521 540 [options]

Required:
  --reference PATH          Absolute path to reference image
  --concept ID              Single concept id (521..540), OR
  --range START END         Inclusive concept id range (521..540)

Options:
  --quality MODE            full (default) | passA
  --run-profile PROFILE     simple (default) | streamlined | full
  --max-attempts N          Max concept attempts (default: 1)
  --retry-wait S            Retry wait seconds (default: 90)
  --rescue-below SCORE      Optional: if passA score < SCORE, rerun those concepts once in full mode
  --rescue-max-attempts N   Attempts for rescue reruns (default: 1)
  --rescue-run-profile P    Rescue profile: simple (default) | streamlined | full
  --project-root PATH       Root for organized projects (default: $HOME/nanobanana-output/projects)
  --internal-root PATH      Root for internal runs/logs/summary (default: $HOME/nanobanana-output/_internal)
  --simple-stage-root PATH  Optional: write Pass A/Pass B/Pass C into this shared folder
  --beam-order ORDER        FRONTIER_BEAM_ORDER, e.g. balanced,clean,intimate
  --help                    Show this help

Notes:
  - This wrapper enforces a clean structure:
      <project-root>/<reference-stem>/
        batch-<timestamp>/Pass A|Pass B|Pass C
      <internal-root>/<reference-stem>/
        runs/<timestamp>-cXXX/...
        latest/<id>.png (symlink to current image for each concept)
        best/by-score.png
        best/by-identity.png
        summary.json
        history.jsonl
  - It does not modify legacy batch folders.
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

concept_to_index() {
  local cid="$1"
  echo $((cid - MIN_CONCEPT_ID))
}

extract_score_from_log() {
  local run_log="$1"
  local cid="$2"
  local score profile source line winner score_a score_b score_c

  # Prefer explicit A/B/C audit winner scoring when available.
  line="$(rg -n "ABC AUDIT ${cid}-.* winner=[ABC] .* scoreA=[0-9]+\\.[0-9]+ scoreB=[0-9]+\\.[0-9]+ scoreC=[0-9]+\\.[0-9]+" "$run_log" | tail -n1 || true)"
  if [ -n "$line" ]; then
    winner="$(printf '%s' "$line" | sed -E 's/.* winner=([ABC]) .*/\1/')"
    score_a="$(printf '%s' "$line" | sed -E 's/.* scoreA=([0-9]+\.[0-9]+) .*/\1/')"
    score_b="$(printf '%s' "$line" | sed -E 's/.* scoreB=([0-9]+\.[0-9]+) .*/\1/')"
    score_c="$(printf '%s' "$line" | sed -E 's/.* scoreC=([0-9]+\.[0-9]+) .*/\1/')"
    case "$winner" in
      A) score="$score_a" ;;
      B) score="$score_b" ;;
      C) score="$score_c" ;;
      *) score="$score_a" ;;
    esac
    source="ABC AUDIT winner=${winner}"
    printf '%s\t%s\n' "$score" "$source"
    return 0
  fi

  # Next, prefer accepted Pass B frontier gain checks (candidate is the accepted score).
  line="$(rg -n "Pass B frontier gain check \\([A-Z]/[^)]*\\): .*candidate=[0-9]+\\.[0-9]+ .* pass=yes" "$run_log" | tail -n1 || true)"
  if [ -n "$line" ]; then
    score="$(printf '%s' "$line" | sed -E 's/.*candidate=([0-9]+\.[0-9]+).*/\1/')"
    profile="$(printf '%s' "$line" | sed -E 's/.*gain check \(([A-Z]\/[^)]*)\).*/\1/')"
    source="Pass B frontier gain check (${profile}) pass=yes"
    printf '%s\t%s\n' "$score" "$source"
    return 0
  fi

  # Then allow explicit phase2 best score lines.
  line="$(rg -n "SAVED FINAL \\(PHASE2 BEST v[0-9]+\\): .* score=[0-9]+\\.[0-9]+" "$run_log" | tail -n1 || true)"
  if [ -n "$line" ]; then
    score="$(printf '%s' "$line" | sed -E 's/.* score=([0-9]+\.[0-9]+).*/\1/')"
    source="SAVED FINAL (PHASE2 BEST)"
    printf '%s\t%s\n' "$score" "$source"
    return 0
  fi

  line="$(rg -n "SAVED PASS A \\(FRONTIER\\): .*${cid}-.* score=" "$run_log" | tail -n1 || true)"
  if [ -n "$line" ]; then
    score="$(printf '%s' "$line" | sed -E 's/.* score=([0-9]+\.[0-9]+).*/\1/')"
    profile="$(printf '%s' "$line" | sed -E 's/.* profile=([^ ]+) score=.*/\1/')"
    source="SAVED PASS A (FRONTIER) profile=${profile}"
    printf '%s\t%s\n' "$score" "$source"
    return 0
  fi

  line="$(rg -n "Frontier score approach=A profile=.*overall=" "$run_log" | tail -n1 || true)"
  if [ -n "$line" ]; then
    score="$(printf '%s' "$line" | sed -E 's/.*overall=([0-9]+\.[0-9]+).*/\1/')"
    profile="$(printf '%s' "$line" | sed -E 's/.*profile=([^:]+):.*/\1/')"
    source="Frontier score approach=A profile=${profile}"
    printf '%s\t%s\n' "$score" "$source"
    return 0
  fi

  printf '0.00\tunknown\n'
}

REFERENCE_IMAGE=""
QUALITY_MODE="full"
RUN_PROFILE="simple"
MAX_ATTEMPTS=1
RETRY_WAIT=90
RESCUE_BELOW=""
RESCUE_MAX_ATTEMPTS=1
RESCUE_RUN_PROFILE="simple"
PROJECTS_ROOT="$PROJECTS_ROOT_DEFAULT"
INTERNAL_ROOT="$INTERNAL_ROOT_DEFAULT"
BEAM_ORDER=""
SIMPLE_STAGE_ROOT_ARG=""
RUN_SINGLE=""
RUN_START=""
RUN_END=""

while [ $# -gt 0 ]; do
  case "$1" in
    --reference)
      REFERENCE_IMAGE="${2:-}"; shift 2 ;;
    --concept)
      RUN_SINGLE="${2:-}"; shift 2 ;;
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
    --rescue-below)
      RESCUE_BELOW="${2:-}"; shift 2 ;;
    --rescue-max-attempts)
      RESCUE_MAX_ATTEMPTS="${2:-}"; shift 2 ;;
    --rescue-run-profile)
      RESCUE_RUN_PROFILE="${2:-}"; shift 2 ;;
    --project-root)
      PROJECTS_ROOT="${2:-}"; shift 2 ;;
    --internal-root)
      INTERNAL_ROOT="${2:-}"; shift 2 ;;
    --simple-stage-root)
      SIMPLE_STAGE_ROOT_ARG="${2:-}"; shift 2 ;;
    --beam-order)
      BEAM_ORDER="${2:-}"; shift 2 ;;
    --help|-h)
      usage; exit 0 ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1 ;;
  esac
done

need_cmd jq
need_cmd rg
need_cmd swift
need_cmd sips

if [ -z "$REFERENCE_IMAGE" ]; then
  echo "Missing --reference" >&2
  usage
  exit 1
fi
if [ "${REFERENCE_IMAGE:0:1}" != "/" ]; then
  echo "--reference must be an absolute path" >&2
  exit 1
fi
if [ ! -f "$REFERENCE_IMAGE" ]; then
  echo "Reference image not found: $REFERENCE_IMAGE" >&2
  exit 1
fi

if [ -n "$RUN_SINGLE" ] && [ -n "$RUN_START" ]; then
  echo "Use either --concept or --range, not both." >&2
  exit 1
fi
if [ -z "$RUN_SINGLE" ] && [ -z "$RUN_START" ]; then
  echo "Must provide --concept or --range." >&2
  exit 1
fi

if [ -n "$RUN_SINGLE" ]; then
  RUN_START="$RUN_SINGLE"
  RUN_END="$RUN_SINGLE"
fi

if ! [[ "$RUN_START" =~ ^[0-9]+$ ]] || ! [[ "$RUN_END" =~ ^[0-9]+$ ]]; then
  echo "Concept ids must be integers." >&2
  exit 1
fi
if [ "$RUN_START" -lt "$MIN_CONCEPT_ID" ] || [ "$RUN_END" -gt "$MAX_CONCEPT_ID" ] || [ "$RUN_START" -gt "$RUN_END" ]; then
  echo "Concept range must be within ${MIN_CONCEPT_ID}..${MAX_CONCEPT_ID} and start<=end." >&2
  exit 1
fi

if [ "$QUALITY_MODE" != "full" ] && [ "$QUALITY_MODE" != "passA" ]; then
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
if [ -n "$SIMPLE_STAGE_ROOT_ARG" ] && [ "${SIMPLE_STAGE_ROOT_ARG:0:1}" != "/" ]; then
  echo "--simple-stage-root must be an absolute path" >&2
  exit 1
fi
if [ -n "$RESCUE_BELOW" ]; then
  if ! [[ "$RESCUE_BELOW" =~ ^[0-9]+([.][0-9]+)?$ ]]; then
    echo "--rescue-below must be a numeric score, e.g. 8.0" >&2
    exit 1
  fi
fi
if ! [[ "$RESCUE_MAX_ATTEMPTS" =~ ^[0-9]+$ ]] || [ "$RESCUE_MAX_ATTEMPTS" -lt 1 ]; then
  echo "--rescue-max-attempts must be >= 1" >&2
  exit 1
fi
if [ "$RESCUE_RUN_PROFILE" != "simple" ] && [ "$RESCUE_RUN_PROFILE" != "streamlined" ] && [ "$RESCUE_RUN_PROFILE" != "full" ]; then
  echo "--rescue-run-profile must be simple, streamlined, or full" >&2
  exit 1
fi

REF_BASE="$(basename "$REFERENCE_IMAGE")"
REF_STEM="${REF_BASE%.*}"
REF_TAG="$(sanitize_tag "$REF_STEM")"

PROJECT_DIR="$PROJECTS_ROOT/$REF_TAG"
INTERNAL_PROJECT_DIR="$INTERNAL_ROOT/$REF_TAG"
RUNS_DIR="$INTERNAL_PROJECT_DIR/runs"
CONCEPTS_DIR="$INTERNAL_PROJECT_DIR/latest"
BEST_DIR="$INTERNAL_PROJECT_DIR/best"
SUMMARY_JSON="$INTERNAL_PROJECT_DIR/summary.json"
HISTORY_JSONL="$INTERNAL_PROJECT_DIR/history.jsonl"
LEGACY_SUMMARY_JSON="$PROJECT_DIR/reports/summary.json"
LEGACY_HISTORY_JSONL="$PROJECT_DIR/reports/history.jsonl"
LEGACY_ROOT_SUMMARY_JSON="$PROJECT_DIR/summary.json"
LEGACY_ROOT_HISTORY_JSONL="$PROJECT_DIR/history.jsonl"

mkdir -p "$PROJECT_DIR" "$RUNS_DIR" "$CONCEPTS_DIR" "$BEST_DIR"

# One-time migration from older project-root files into internal storage.
if [ ! -f "$SUMMARY_JSON" ] && [ -f "$LEGACY_SUMMARY_JSON" ]; then
  cp "$LEGACY_SUMMARY_JSON" "$SUMMARY_JSON"
fi
if [ ! -f "$HISTORY_JSONL" ] && [ -f "$LEGACY_HISTORY_JSONL" ]; then
  cp "$LEGACY_HISTORY_JSONL" "$HISTORY_JSONL"
fi
if [ ! -f "$SUMMARY_JSON" ] && [ -f "$LEGACY_ROOT_SUMMARY_JSON" ]; then
  cp "$LEGACY_ROOT_SUMMARY_JSON" "$SUMMARY_JSON"
fi
if [ ! -f "$HISTORY_JSONL" ] && [ -f "$LEGACY_ROOT_HISTORY_JSONL" ]; then
  cp "$LEGACY_ROOT_HISTORY_JSONL" "$HISTORY_JSONL"
fi

TS="$(date +%Y-%m-%dT%H-%M-%S)"
RUN_TOKEN="c${RUN_START}-${RUN_END}"
RUN_DIR="$RUNS_DIR/${TS}-${RUN_TOKEN}"
SIMPLE_PROJECT_DIR=""

START_IDX="$(concept_to_index "$RUN_START")"
END_IDX_EXCL="$(( $(concept_to_index "$RUN_END") + 1 ))"

if [ "$RUN_PROFILE" = "simple" ]; then
  if [ -n "$SIMPLE_STAGE_ROOT_ARG" ]; then
    SIMPLE_PROJECT_DIR="$SIMPLE_STAGE_ROOT_ARG"
  else
    SIMPLE_PROJECT_DIR="$PROJECT_DIR/batch-${TS}"
  fi
  mkdir -p "$SIMPLE_PROJECT_DIR/Pass A" "$SIMPLE_PROJECT_DIR/Pass B" "$SIMPLE_PROJECT_DIR/Pass C"
fi

echo "=== Managed V29 Run ==="
echo "Reference   : $REFERENCE_IMAGE"
echo "Range       : ${RUN_START}-${RUN_END} (idx ${START_IDX}..${END_IDX_EXCL})"
echo "Quality     : $QUALITY_MODE"
echo "Run profile : $RUN_PROFILE"
echo "Attempts    : $MAX_ATTEMPTS"
if [ -n "$RESCUE_BELOW" ]; then
  echo "Rescue      : enabled (threshold < $RESCUE_BELOW, attempts=$RESCUE_MAX_ATTEMPTS, profile=$RESCUE_RUN_PROFILE)"
else
  echo "Rescue      : disabled"
fi
if [ -n "$SIMPLE_PROJECT_DIR" ]; then
  echo "Simple dir  : $SIMPLE_PROJECT_DIR"
fi
echo "Project dir : $PROJECT_DIR"
echo "Internal dir: $INTERNAL_PROJECT_DIR"
echo "Run dir     : $RUN_DIR"
echo

export OUT_DIR="$RUN_DIR"
export RUN_PROFILE="$RUN_PROFILE"
if [ -n "$SIMPLE_PROJECT_DIR" ]; then
  export SIMPLE_STAGE_ROOT="$SIMPLE_PROJECT_DIR"
else
  unset SIMPLE_STAGE_ROOT || true
fi
export MAX_CONCEPT_ATTEMPTS="$MAX_ATTEMPTS"
export RETRY_WAIT_S="$RETRY_WAIT"
if [ -n "$BEAM_ORDER" ]; then
  export FRONTIER_BEAM_ORDER="$BEAM_ORDER"
fi
if [ "$QUALITY_MODE" = "passA" ]; then
  export PASS_A_ONLY=1
  export PHASED_BATCH_MODE=0
  unset PHASED_STRICT_ORDER || true
else
  unset PASS_A_ONLY || true
  : "${PHASED_BATCH_MODE:=1}"
  : "${PHASED_STRICT_ORDER:=1}"
  export PHASED_BATCH_MODE
  export PHASED_STRICT_ORDER
fi

bash "$BASE_RUNNER" "$REFERENCE_IMAGE" "$START_IDX" "$END_IDX_EXCL"

RUN_LOG="$RUN_DIR/run.log"
if [ ! -f "$RUN_LOG" ]; then
  echo "Run log missing: $RUN_LOG" >&2
  exit 1
fi

mapfile -t FINAL_IMAGES < <(find "$RUN_DIR" -maxdepth 1 -type f -name '[0-9][0-9][0-9]-*.png' | sort)
if [ "${#FINAL_IMAGES[@]}" -eq 0 ]; then
  echo "No final images found in $RUN_DIR" >&2
  exit 1
fi

NEW_JSONL="$(mktemp)"
for img in "${FINAL_IMAGES[@]}"; do
  base="$(basename "$img")"
  cid="${base%%-*}"
  label="${base#${cid}-}"
  label="${label%.png}"

  if [ -n "$SIMPLE_PROJECT_DIR" ]; then
    # Mirror final output into the correct stage when stage artifacts are missing.
    # passA runs must never populate Pass C.
    mirror_stage="Pass C"
    if [ "$QUALITY_MODE" = "passA" ]; then
      mirror_stage="Pass A"
    fi
    mirror_path="$SIMPLE_PROJECT_DIR/$mirror_stage/$base"
    if [ ! -f "$mirror_path" ]; then
      cp -f "$img" "$mirror_path"
    fi
  fi

  score_pair="$(extract_score_from_log "$RUN_LOG" "$cid")"
  score="${score_pair%%$'\t'*}"
  source="${score_pair#*$'\t'}"

  w="$(sips -g pixelWidth "$img" | awk '/pixelWidth/ {print $2}')"
  h="$(sips -g pixelHeight "$img" | awk '/pixelHeight/ {print $2}')"
  sz="$(stat -f '%z' "$img")"
  dist_json="$(swift "$FACE_ID_SCRIPT" "$REFERENCE_IMAGE" "$img")"
  dist="$(printf '%s' "$dist_json" | jq -r '.distance')"

  jq -n \
    --argjson concept_id "$cid" \
    --arg label "$label" \
    --arg batch_dir "$RUN_DIR" \
    --arg final_image "$img" \
    --arg score_source "$source" \
    --argjson known_overall_score "${score:-0}" \
    --argjson identity_distance "${dist:-null}" \
    --argjson width "${w:-0}" \
    --argjson height "${h:-0}" \
    --argjson file_size_bytes "${sz:-0}" \
    --arg reference_image "$REFERENCE_IMAGE" \
    --arg run_token "$RUN_TOKEN" \
    --arg updated_at "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    '{
      concept_id: $concept_id,
      label: $label,
      batch_dir: $batch_dir,
      final_image: $final_image,
      score_source: $score_source,
      known_overall_score: $known_overall_score,
      identity_distance: $identity_distance,
      width: $width,
      height: $height,
      file_size_bytes: $file_size_bytes,
      reference_image: $reference_image,
      run_token: $run_token,
      updated_at: $updated_at
    }' \
    >> "$NEW_JSONL"
done

if [ -f "$SUMMARY_JSON" ]; then
  OLD_SUMMARY_JSON="$(mktemp)"
  cp "$SUMMARY_JSON" "$OLD_SUMMARY_JSON"
else
  OLD_SUMMARY_JSON="$(mktemp)"
  printf '{"reference_image":"","results":[]}\n' > "$OLD_SUMMARY_JSON"
fi

NEW_ARRAY_JSON="$(mktemp)"
jq -s '.' "$NEW_JSONL" > "$NEW_ARRAY_JSON"

UPDATED_JSON="$(mktemp)"
jq \
  --arg ref "$REFERENCE_IMAGE" \
  --slurpfile new "$NEW_ARRAY_JSON" \
  '
  . as $root
  | (($root.results // []) | map(select(.concept_id != null))) as $old
  | (($new[0] // []) | map(select(.concept_id != null))) as $incoming
  | reduce $incoming[] as $n ($old;
      (map(.concept_id) | index($n.concept_id)) as $idx
      | if $idx == null then
          . + [$n]
        else
          (.[ $idx ]) as $o
          | if (($n.known_overall_score // 0) > ($o.known_overall_score // 0))
               or (
                 (($n.known_overall_score // 0) == ($o.known_overall_score // 0))
                 and (($n.identity_distance // 999) < ($o.identity_distance // 999))
               )
            then .[$idx] = $n
            else .
            end
        end
    ) as $merged
  | {
      reference_image: (if $root.reference_image == "" then $ref else $root.reference_image end),
      generated_at_utc: (now | strftime("%Y-%m-%dT%H:%M:%SZ")),
      ranking_basis: "known_overall_score_desc",
      identity_note: "Lower distance means closer facial identity to reference.",
      results: $merged
    }
  | .ranked_by_known_overall_desc = (.results | sort_by(-(.known_overall_score // 0)) | map(.concept_id))
  | .best_by_known_overall = (.ranked_by_known_overall_desc[0] // null)
  | .best_by_identity_distance = (
      .results
      | map(select(.identity_distance != null))
      | sort_by(.identity_distance)
      | .[0].concept_id
    )
  ' "$OLD_SUMMARY_JSON" > "$UPDATED_JSON"

mv "$UPDATED_JSON" "$SUMMARY_JSON"

cat "$NEW_JSONL" >> "$HISTORY_JSONL"

# Promote concept symlinks and best pointers from summary.
jq -c '.results[]' "$SUMMARY_JSON" | while IFS= read -r row; do
  cid="$(printf '%s' "$row" | jq -r '.concept_id')"
  img="$(printf '%s' "$row" | jq -r '.final_image')"
  ln -sfn "$img" "$CONCEPTS_DIR/${cid}.png"
done

BEST_SCORE_ID="$(jq -r '.best_by_known_overall // empty' "$SUMMARY_JSON")"
BEST_IDENTITY_ID="$(jq -r '.best_by_identity_distance // empty' "$SUMMARY_JSON")"

if [ -n "$BEST_SCORE_ID" ]; then
  BEST_SCORE_IMG="$(jq -r --argjson cid "$BEST_SCORE_ID" '.results[] | select(.concept_id == $cid) | .final_image' "$SUMMARY_JSON")"
  ln -sfn "$BEST_SCORE_IMG" "$BEST_DIR/by-score.png"
  ln -sfn "$BEST_SCORE_IMG" "$BEST_DIR/by-score-${BEST_SCORE_ID}.png"
fi

if [ -n "$BEST_IDENTITY_ID" ]; then
  BEST_IDENTITY_IMG="$(jq -r --argjson cid "$BEST_IDENTITY_ID" '.results[] | select(.concept_id == $cid) | .final_image' "$SUMMARY_JSON")"
  ln -sfn "$BEST_IDENTITY_IMG" "$BEST_DIR/by-identity.png"
  ln -sfn "$BEST_IDENTITY_IMG" "$BEST_DIR/by-identity-${BEST_IDENTITY_ID}.png"
fi

echo
echo "=== Managed Update Complete ==="
echo "Run dir            : $RUN_DIR"
echo "Summary            : $SUMMARY_JSON"
echo "Latest images      : $CONCEPTS_DIR"
echo "Best by score      : $BEST_DIR/by-score.png"
echo "Best by identity   : $BEST_DIR/by-identity.png"
if [ -n "$SIMPLE_PROJECT_DIR" ]; then
  echo "Simple A/B/C dir   : $SIMPLE_PROJECT_DIR"
fi
echo
echo "Top 5 (score):"
jq -r '.results | sort_by(-(.known_overall_score // 0)) | .[0:5] | .[] | "  \(.concept_id): score=\(.known_overall_score) dist=\(.identity_distance)"' "$SUMMARY_JSON"

# Optional rescue pass: only for concepts under threshold after a passA run.
if [ -n "$RESCUE_BELOW" ] && [ "$QUALITY_MODE" = "passA" ] && [ "${MANAGED_RESCUE_ACTIVE:-0}" != "1" ]; then
  mapfile -t RESCUE_IDS < <(
    jq -r \
      --argjson start "$RUN_START" \
      --argjson end "$RUN_END" \
      --argjson threshold "$RESCUE_BELOW" \
      '
      .results[]
      | select(.concept_id >= $start and .concept_id <= $end and ((.known_overall_score // 0) < $threshold))
      | .concept_id
      ' "$SUMMARY_JSON" \
    | sort -n
  )

  if [ "${#RESCUE_IDS[@]}" -eq 0 ]; then
    echo
    echo "Rescue pass: no concepts below threshold $RESCUE_BELOW"
  else
    echo
    echo "Rescue pass: rerunning ${#RESCUE_IDS[@]} concept(s) below threshold $RESCUE_BELOW -> ${RESCUE_IDS[*]}"
    for cid in "${RESCUE_IDS[@]}"; do
      cmd=(
        "$SELF_SCRIPT"
        --reference "$REFERENCE_IMAGE"
        --concept "$cid"
        --quality full
        --run-profile "$RESCUE_RUN_PROFILE"
        --max-attempts "$RESCUE_MAX_ATTEMPTS"
        --retry-wait "$RETRY_WAIT"
        --project-root "$PROJECTS_ROOT"
        --internal-root "$INTERNAL_ROOT"
      )
      if [ -n "$SIMPLE_STAGE_ROOT_ARG" ]; then
        cmd+=(--simple-stage-root "$SIMPLE_STAGE_ROOT_ARG")
      fi
      if [ -n "$BEAM_ORDER" ]; then
        cmd+=(--beam-order "$BEAM_ORDER")
      fi
      MANAGED_RESCUE_ACTIVE=1 "${cmd[@]}"
    done
  fi
fi

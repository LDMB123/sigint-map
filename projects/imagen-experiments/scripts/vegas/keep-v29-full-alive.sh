#!/usr/bin/env bash
set -u
set +e
set -o pipefail

RUN_LOG="${RUN_LOG:-/Users/louisherman/gen-pool-luxe-lace-v29-full.log}"
KEEPER_LOG="${KEEPER_LOG:-/Users/louisherman/gen-pool-luxe-lace-v29-keeper.log}"
WORKDIR="${WORKDIR:-/Users/louisherman/ClaudeCodeProjects/projects/imagen-experiments/scripts/vegas}"
INPUT_IMAGE="${INPUT_IMAGE:-/Users/louisherman/Documents/491231442_10232851854971067_1036101440880166670_n.jpeg}"
OUT_DIR="${OUT_DIR:-/Users/louisherman/nanobanana-output/pool-luxe-lace-v1-dual-ab-batch-20260213}"
START_IDX="${START_IDX:-0}"
END_IDX="${END_IDX:-20}"
TARGET_COUNT="${TARGET_COUNT:-20}"
PHASE_A_RESUME_FROM_NUM="${PHASE_A_RESUME_FROM_NUM:-526}"
RUN_STALE_S="${RUN_STALE_S:-420}"
NO_PROGRESS_S="${NO_PROGRESS_S:-900}"
LOCK_DIR="${LOCK_DIR:-/tmp/v29_keeper.lock}"
PHASED_BATCH_MODE="${PHASED_BATCH_MODE:-1}"
FRONTIER_MODE="${FRONTIER_MODE:-1}"
DUAL_STRATEGY_MODE="${DUAL_STRATEGY_MODE:-1}"
RETRY_WAIT_S="${RETRY_WAIT_S:-90}"
CACHE_REUSE_WAIT_S="${CACHE_REUSE_WAIT_S:-90}"
REQUEST_PACING_BASE_S="${REQUEST_PACING_BASE_S:-90}"
REQUEST_PACING_MAX_S="${REQUEST_PACING_MAX_S:-180}"
MIN_API_ATTEMPT_INTERVAL_S="${MIN_API_ATTEMPT_INTERVAL_S:-90}"
MAX_CONCEPT_ATTEMPTS="${MAX_CONCEPT_ATTEMPTS:-1}"
REQUIRE_STRATEGY_C_FOR_COMPLETE="${REQUIRE_STRATEGY_C_FOR_COMPLETE:-1}"
RESUME_SKIP_COMPLETED_AB="${RESUME_SKIP_COMPLETED_AB:-1}"
FRONTIER_BEAM_ORDER="${FRONTIER_BEAM_ORDER:-intimate,balanced,clean}"
HAIL_MARY_MODE="${HAIL_MARY_MODE:-1}"
LESSON_MAX_PER_PROMPT="${LESSON_MAX_PER_PROMPT:-12}"
C_STRATEGY_LESSON_MAX="${C_STRATEGY_LESSON_MAX:-10}"
C_PROFILE_FOLLOW_AB="${C_PROFILE_FOLLOW_AB:-0}"
PHASE2_VARIANTS_PER_ROUND="${PHASE2_VARIANTS_PER_ROUND:-2}"
PHASE2_VARIANT_INTENSITY_STEP="${PHASE2_VARIANT_INTENSITY_STEP:-0.08}"
AB_ITERATION_ROUNDS_MAX="${AB_ITERATION_ROUNDS_MAX:-2}"
APPROACH_SELF_ITERATION_ROUNDS_MAX="${APPROACH_SELF_ITERATION_ROUNDS_MAX:-1}"
C_SELF_ITERATION_ROUNDS_MAX="${C_SELF_ITERATION_ROUNDS_MAX:-1}"
FINAL_AUDIT_BOOST_ROUNDS_MAX="${FINAL_AUDIT_BOOST_ROUNDS_MAX:-1}"
TARGET_QUALITY_GAIN_PCT="${TARGET_QUALITY_GAIN_PCT:-50}"
LOCK_AB_VARIATION="${LOCK_AB_VARIATION:-1}"
LOCK_C_VARIATION_TO_AB="${LOCK_C_VARIATION_TO_AB:-1}"
STRICT_QUALITY_GATE="${STRICT_QUALITY_GATE:-1}"
MIN_FINAL_MULTIPLIER_GATE="${MIN_FINAL_MULTIPLIER_GATE:-2.0}"
QUALITY_ESCALATION_ENABLE="${QUALITY_ESCALATION_ENABLE:-1}"

CMD="cd $WORKDIR && OUTPUT_DIR=$OUT_DIR PHASED_BATCH_MODE=$PHASED_BATCH_MODE FRONTIER_MODE=$FRONTIER_MODE DUAL_STRATEGY_MODE=$DUAL_STRATEGY_MODE RETRY_WAIT_S=$RETRY_WAIT_S CACHE_REUSE_WAIT_S=$CACHE_REUSE_WAIT_S REQUEST_PACING_BASE_S=$REQUEST_PACING_BASE_S REQUEST_PACING_MAX_S=$REQUEST_PACING_MAX_S MIN_API_ATTEMPT_INTERVAL_S=$MIN_API_ATTEMPT_INTERVAL_S PHASE_A_RESUME_FROM_NUM=$PHASE_A_RESUME_FROM_NUM MAX_CONCEPT_ATTEMPTS=$MAX_CONCEPT_ATTEMPTS REQUIRE_STRATEGY_C_FOR_COMPLETE=$REQUIRE_STRATEGY_C_FOR_COMPLETE RESUME_SKIP_COMPLETED_AB=$RESUME_SKIP_COMPLETED_AB FRONTIER_BEAM_ORDER=$FRONTIER_BEAM_ORDER HAIL_MARY_MODE=$HAIL_MARY_MODE LESSON_MAX_PER_PROMPT=$LESSON_MAX_PER_PROMPT C_STRATEGY_LESSON_MAX=$C_STRATEGY_LESSON_MAX C_PROFILE_FOLLOW_AB=$C_PROFILE_FOLLOW_AB PHASE2_VARIANTS_PER_ROUND=$PHASE2_VARIANTS_PER_ROUND PHASE2_VARIANT_INTENSITY_STEP=$PHASE2_VARIANT_INTENSITY_STEP AB_ITERATION_ROUNDS_MAX=$AB_ITERATION_ROUNDS_MAX APPROACH_SELF_ITERATION_ROUNDS_MAX=$APPROACH_SELF_ITERATION_ROUNDS_MAX C_SELF_ITERATION_ROUNDS_MAX=$C_SELF_ITERATION_ROUNDS_MAX FINAL_AUDIT_BOOST_ROUNDS_MAX=$FINAL_AUDIT_BOOST_ROUNDS_MAX TARGET_QUALITY_GAIN_PCT=$TARGET_QUALITY_GAIN_PCT LOCK_AB_VARIATION=$LOCK_AB_VARIATION LOCK_C_VARIATION_TO_AB=$LOCK_C_VARIATION_TO_AB STRICT_QUALITY_GATE=$STRICT_QUALITY_GATE MIN_FINAL_MULTIPLIER_GATE=$MIN_FINAL_MULTIPLIER_GATE QUALITY_ESCALATION_ENABLE=$QUALITY_ESCALATION_ENABLE node ./vegas-v29-apex.js $INPUT_IMAGE $START_IDX $END_IDX | tee -a $RUN_LOG"

ts(){ date '+%Y-%m-%d %H:%M:%S'; }

# Singleton guard: prevent multiple keepers from racing each other.
if ! mkdir "$LOCK_DIR" 2>/dev/null; then
  if [ -f "$LOCK_DIR/pid" ]; then
    old_pid="$(cat "$LOCK_DIR/pid" 2>/dev/null || true)"
    if [ -n "$old_pid" ] && kill -0 "$old_pid" 2>/dev/null; then
      echo "[$(ts)] keeper_exit reason=already_running pid=$old_pid" | tee -a "$KEEPER_LOG"
      exit 0
    fi
    rm -rf "$LOCK_DIR" 2>/dev/null || true
  else
    rm -rf "$LOCK_DIR" 2>/dev/null || true
  fi
  mkdir "$LOCK_DIR" 2>/dev/null || {
    echo "[$(ts)] keeper_exit reason=lock_acquire_failed path=$LOCK_DIR" | tee -a "$KEEPER_LOG"
    exit 1
  }
fi
echo $$ > "$LOCK_DIR/pid"
cleanup_lock() { rm -rf "$LOCK_DIR" 2>/dev/null || true; }
trap cleanup_lock EXIT INT TERM

is_v29_full_up() {
  ps -Aww -o command | awk -v input="$INPUT_IMAGE" -v s="$START_IDX" -v e="$END_IDX" '
    $0 ~ "^node[[:space:]]+\\./vegas-v29-apex\\.js[[:space:]]+" input "[[:space:]]+" s "[[:space:]]+" e "([[:space:]]|$)" { found=1 }
    END { exit(found ? 0 : 1) }
  '
}

run_log_age_s() {
  python3 - "$RUN_LOG" <<'PY'
import os
import sys
import time
from pathlib import Path

fp = Path(sys.argv[1])
if not fp.exists():
    print(-1)
    raise SystemExit(0)
try:
    age = int(max(0, time.time() - fp.stat().st_mtime))
except Exception:
    age = -1
print(age)
PY
}

is_complete() {
  python3 - "$OUT_DIR" "$TARGET_COUNT" <<'PY'
import sys
from pathlib import Path

out = Path(sys.argv[1])
target = int(sys.argv[2])
c_count = len(list((out / "strategy-C").glob("*.png"))) if (out / "strategy-C").exists() else 0
final_count = len(list(out.glob("*.png"))) if out.exists() else 0
print("1" if (c_count >= target and final_count >= target) else "0")
PY
}

progress_signature() {
  python3 - "$OUT_DIR" "$RUN_LOG" <<'PY'
import re
import sys
from pathlib import Path

out = Path(sys.argv[1])
run_log = Path(sys.argv[2])

def count_png(path: Path) -> int:
    return len(list(path.glob("*.png"))) if path.exists() else 0

def read_tail_text(path: Path, max_bytes: int = 2 * 1024 * 1024) -> str:
    if not path.exists():
        return ""
    with path.open("rb") as fh:
        fh.seek(0, 2)
        size = fh.tell()
        fh.seek(max(size - max_bytes, 0))
        return fh.read().decode("utf-8", errors="ignore")

a_count = count_png(out / "strategy-A")
b_count = count_png(out / "strategy-B")
c_count = count_png(out / "strategy-C")
final_count = count_png(out)

tail = read_tail_text(run_log)
a_done = 0
b_done = 0
c_audit = "n/a"
current_pass = "n/a"
if tail:
    m_a = re.findall(r"PHASE A DONE \[(\d+)/(\d+)\]", tail)
    if m_a:
        a_done = int(m_a[-1][0])
    m_b = re.findall(r"PHASE B DONE \[(\d+)/(\d+)\]", tail)
    if m_b:
        b_done = int(m_b[-1][0])
    m_c = re.findall(r"PHASE C AUDIT ([^:]+):", tail)
    if m_c:
        c_audit = m_c[-1].strip()
    m_pass = re.findall(r"\[(\d+)/(\d+)\]\s+PASS\s+([ABC])\s+([^\n]+)", tail)
    if m_pass:
        p_idx, p_total, p_letter, p_concept = m_pass[-1]
        current_pass = f"{p_letter}{p_idx}/{p_total}:{p_concept.strip()}"

print(
    f"A={a_count};B={b_count};C={c_count};F={final_count};"
    f"a_done={a_done};b_done={b_done};c_audit={c_audit};current={current_pass}"
)
PY
}

if ! [[ "$NO_PROGRESS_S" =~ ^[0-9]+$ ]]; then
  NO_PROGRESS_S=900
fi
if ! [[ "$RUN_STALE_S" =~ ^[0-9]+$ ]]; then
  RUN_STALE_S=420
fi
LAST_PROGRESS_SIG="$(progress_signature)"
LAST_PROGRESS_CHANGE_EPOCH="$(date +%s)"

while true; do
  now_epoch="$(date +%s)"
  progress_sig="$(progress_signature)"
  if [ "$progress_sig" != "$LAST_PROGRESS_SIG" ]; then
    LAST_PROGRESS_SIG="$progress_sig"
    LAST_PROGRESS_CHANGE_EPOCH="$now_epoch"
  fi
  stagnant_s=$(( now_epoch - LAST_PROGRESS_CHANGE_EPOCH ))

  if [ "$(is_complete)" = "1" ]; then
    echo "[$(ts)] keeper_done target=${TARGET_COUNT} (strategy-C/root complete)" | tee -a "$KEEPER_LOG"
    exit 0
  fi

  if is_v29_full_up; then
    if [ "$NO_PROGRESS_S" -gt 0 ] && [ "$stagnant_s" -ge "$NO_PROGRESS_S" ]; then
      echo "[$(ts)] keeper_action=restart_stagnant_v29_full stagnant_s=${stagnant_s} no_progress_s=${NO_PROGRESS_S} progress_sig=${progress_sig}" | tee -a "$KEEPER_LOG"
      pkill -f "node ./vegas-v29-apex.js $INPUT_IMAGE $START_IDX $END_IDX" >/dev/null 2>&1 || true
      screen -S v29_full -X quit >/dev/null 2>&1 || true
      sleep 2
      LAST_PROGRESS_CHANGE_EPOCH="$now_epoch"
      stagnant_s=0
    fi
    age_s="$(run_log_age_s)"
    if [[ "$age_s" =~ ^[0-9]+$ ]] && [ "$age_s" -ge "$RUN_STALE_S" ]; then
      echo "[$(ts)] keeper_action=restart_stale_v29_full log_age_s=${age_s} stale_threshold_s=${RUN_STALE_S}" | tee -a "$KEEPER_LOG"
      pkill -f "node ./vegas-v29-apex.js $INPUT_IMAGE $START_IDX $END_IDX" >/dev/null 2>&1 || true
      screen -S v29_full -X quit >/dev/null 2>&1 || true
      sleep 2
    fi
  fi

  if ! is_v29_full_up; then
    echo "[$(ts)] keeper_action=start_v29_full" | tee -a "$KEEPER_LOG"
    screen -S v29_full -X quit >/dev/null 2>&1 || true
    screen -dmS v29_full bash -lc "$CMD"
  fi
  age_s="$(run_log_age_s)"
  echo "[$(ts)] keeper_heartbeat v29_full=$(is_v29_full_up && echo up || echo down) run_log_age_s=${age_s} stagnant_s=${stagnant_s} progress_sig=${progress_sig}" | tee -a "$KEEPER_LOG"
  sleep 60
done

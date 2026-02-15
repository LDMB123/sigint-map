#!/usr/bin/env bash
set -u
set +e
set -o pipefail

NODE_BIN="${NODE_BIN:-/Users/louisherman/.nvm/versions/node/v22.22.0/bin/node}"
SCRIPT="/Users/louisherman/ClaudeCodeProjects/projects/imagen-experiments/scripts/vegas/vegas-v29-apex.js"
INPUT_IMG="${INPUT_IMG:-/Users/louisherman/Documents/491231442_10232851854971067_1036101440880166670_n.jpeg}"
OUT_DIR="${OUT_DIR:-/Users/louisherman/nanobanana-output/pool-luxe-lace-v1-dual-ab-batch-20260213}"
LOG="${LOG:-/Users/louisherman/gen-pool-luxe-lace-dual-ab-watchdog.log}"
SUMMARY_FILE="${SUMMARY_FILE:-${OUT_DIR}/ab-comparison-summary.json}"
LEARNING_PLAN_FILE="${LEARNING_PLAN_FILE:-${OUT_DIR}/learning-plan.json}"
AB_AUDIT_FILE="${AB_AUDIT_FILE:-${OUT_DIR}/ab-comparison-audit.jsonl}"
INCOMPLETE_NO_C_DIR="${INCOMPLETE_NO_C_DIR:-${OUT_DIR}/_incomplete-without-strategy-c}"

START_IDX="${START_IDX:-0}"
END_IDX="${END_IDX:-100}"   # exclusive
RESTART_GAP_S="${RESTART_GAP_S:-95}"  # keep >= 90s between restart attempts
CHILD_SIGNAL_RETRY_WAIT_S="${CHILD_SIGNAL_RETRY_WAIT_S:-5}"
WATCHDOG_CHILD_IDLE_TIMEOUT_S="${WATCHDOG_CHILD_IDLE_TIMEOUT_S:-0}"
WATCHDOG_CHILD_MONITOR_POLL_S="${WATCHDOG_CHILD_MONITOR_POLL_S:-15}"
WATCHDOG_CHILD_IDLE_HEARTBEAT_S="${WATCHDOG_CHILD_IDLE_HEARTBEAT_S:-180}"
LOCK_DIR="${LOCK_DIR:-${HOME}/.run-v29-dual-ab-watchdog.lockdir}"
LOCK_PID_FILE="${LOCK_DIR}/pid"
MAX_CONCEPT_ATTEMPTS="${MAX_CONCEPT_ATTEMPTS:-5}"
RETRY_WAIT_S="${RETRY_WAIT_S:-91}"
CACHE_REUSE_WAIT_S="${CACHE_REUSE_WAIT_S:-90}"
RATE_LIMIT_BACKOFF_MIN_S="${RATE_LIMIT_BACKOFF_MIN_S:-120}"
RATE_LIMIT_BACKOFF_MAX_S="${RATE_LIMIT_BACKOFF_MAX_S:-180}"
API_REQUEST_TIMEOUT_MS="${API_REQUEST_TIMEOUT_MS:-240000}"
NETWORK_RETRIES_MAX="${NETWORK_RETRIES_MAX:-2}"
NETWORK_RETRY_WAIT_S="${NETWORK_RETRY_WAIT_S:-20}"
SERVER_RETRIES_MAX="${SERVER_RETRIES_MAX:-2}"
SERVER_RETRY_WAIT_S="${SERVER_RETRY_WAIT_S:-45}"
HEARTBEAT_INTERVAL_S="${HEARTBEAT_INTERVAL_S:-20}"
AUTH_TIMEOUT_MS="${AUTH_TIMEOUT_MS:-45000}"
AUTH_RETRIES_MAX="${AUTH_RETRIES_MAX:-2}"
AUTH_RETRY_WAIT_S="${AUTH_RETRY_WAIT_S:-8}"
ACCESS_TOKEN_EARLY_REFRESH_S="${ACCESS_TOKEN_EARLY_REFRESH_S:-90}"
REUSE_PASSA_ON_FAILURE="${REUSE_PASSA_ON_FAILURE:-1}"
RESUME_SKIP_COMPLETED_AB="${RESUME_SKIP_COMPLETED_AB:-1}"
REQUEST_PACING_BASE_S="${REQUEST_PACING_BASE_S:-90}"
REQUEST_PACING_MAX_S="${REQUEST_PACING_MAX_S:-180}"
MIN_WAIT_FLOOR_S="${MIN_WAIT_FLOOR_S:-5}"
RATE_LIMIT_BACKOFF_STEP_S="${RATE_LIMIT_BACKOFF_STEP_S:-45}"
RATE_LIMIT_STREAK_STEP_S="${RATE_LIMIT_STREAK_STEP_S:-20}"
RATE_LIMIT_MAX_BACKOFF_S="${RATE_LIMIT_MAX_BACKOFF_S:-64}"
RATE_LIMIT_RETRY_DEADLINE_S="${RATE_LIMIT_RETRY_DEADLINE_S:-600}"
RATE_LIMIT_CONSECUTIVE_FAILFAST="${RATE_LIMIT_CONSECUTIVE_FAILFAST:-3}"
RATE_LIMIT_PROFILE_NARROW_STREAK="${RATE_LIMIT_PROFILE_NARROW_STREAK:-2}"
RATE_LIMIT_FORCE_CACHE_STREAK="${RATE_LIMIT_FORCE_CACHE_STREAK:-3}"
PHASE2_VARIANTS_PER_ROUND="${PHASE2_VARIANTS_PER_ROUND:-4}"
PHASE2_VARIANT_INTENSITY_STEP="${PHASE2_VARIANT_INTENSITY_STEP:-0.08}"
APPROACH_SELF_ITERATION_ROUNDS_MAX="${APPROACH_SELF_ITERATION_ROUNDS_MAX:-2}"
C_SELF_ITERATION_ROUNDS_MAX="${C_SELF_ITERATION_ROUNDS_MAX:-2}"
AB_ITERATION_ROUNDS_MAX="${AB_ITERATION_ROUNDS_MAX:-3}"
FINAL_AUDIT_BOOST_ROUNDS_MAX="${FINAL_AUDIT_BOOST_ROUNDS_MAX:-2}"
FINAL_AUDIT_SHORTFALL_STEP="${FINAL_AUDIT_SHORTFALL_STEP:-0.35}"
FINAL_AUDIT_SHORTFALL_EXTRA_ROUNDS_MAX="${FINAL_AUDIT_SHORTFALL_EXTRA_ROUNDS_MAX:-3}"
LAST_PASS_REDO_ENABLED="${LAST_PASS_REDO_ENABLED:-1}"
LAST_PASS_REDO_ROUNDS_MAX="${LAST_PASS_REDO_ROUNDS_MAX:-2}"
LAST_PASS_REDO_TIE_BAND_ADD="${LAST_PASS_REDO_TIE_BAND_ADD:-0.08}"
LAST_PASS_REDO_SHORTFALL_TRIGGER="${LAST_PASS_REDO_SHORTFALL_TRIGGER:-0.15}"
HARDEN_ITERATION_PROCESS="${HARDEN_ITERATION_PROCESS:-1}"
HARDEN_MAX_EXTRA_PHASE2_VARIANTS="${HARDEN_MAX_EXTRA_PHASE2_VARIANTS:-3}"
HARDEN_MAX_EXTRA_ROUNDS="${HARDEN_MAX_EXTRA_ROUNDS:-4}"
HARDEN_MAX_EXTRA_SELF_ROUNDS="${HARDEN_MAX_EXTRA_SELF_ROUNDS:-3}"
HARDEN_MAX_EXTRA_LAST_PASS_ROUNDS="${HARDEN_MAX_EXTRA_LAST_PASS_ROUNDS:-3}"
QUALITY_ESCALATION_ENABLE="${QUALITY_ESCALATION_ENABLE:-1}"
QUALITY_ESCALATION_SCORE_TRIGGER="${QUALITY_ESCALATION_SCORE_TRIGGER:-9.45}"
QUALITY_ESCALATION_TIE_TRIGGER="${QUALITY_ESCALATION_TIE_TRIGGER:-0.18}"
QUALITY_ESCALATION_MAX_EXTRA_ROUNDS="${QUALITY_ESCALATION_MAX_EXTRA_ROUNDS:-3}"
QUALITY_ESCALATION_MAX_EXTRA_VARIANTS="${QUALITY_ESCALATION_MAX_EXTRA_VARIANTS:-3}"
MIN_FINAL_MULTIPLIER_GATE="${MIN_FINAL_MULTIPLIER_GATE:-2.1}"
STRICT_QUALITY_GATE="${STRICT_QUALITY_GATE:-1}"
LOCK_AB_VARIATION="${LOCK_AB_VARIATION:-1}"
LOCK_C_VARIATION_TO_AB="${LOCK_C_VARIATION_TO_AB:-1}"
ADAPT_FROM_LEARNING_PLAN="${ADAPT_FROM_LEARNING_PLAN:-1}"
REQUIRE_STRATEGY_C_FOR_COMPLETE="${REQUIRE_STRATEGY_C_FOR_COMPLETE:-1}"
WATCHDOG_SHUTDOWN_REASON="unknown"
TERM_SIGNAL_MODE="${TERM_SIGNAL_MODE:-ignore}" # ignore|grace|exit
TERM_SIGNAL_GRACE_COUNT="${TERM_SIGNAL_GRACE_COUNT:-1}"
TERM_SIGNAL_SEEN=0

if (( RETRY_WAIT_S < MIN_WAIT_FLOOR_S )); then
  RETRY_WAIT_S="$MIN_WAIT_FLOOR_S"
fi
if (( CACHE_REUSE_WAIT_S < MIN_WAIT_FLOOR_S )); then
  CACHE_REUSE_WAIT_S="$MIN_WAIT_FLOOR_S"
fi
if (( REQUEST_PACING_BASE_S < MIN_WAIT_FLOOR_S )); then
  REQUEST_PACING_BASE_S="$MIN_WAIT_FLOOR_S"
fi
if (( REQUEST_PACING_MAX_S < REQUEST_PACING_BASE_S )); then
  REQUEST_PACING_MAX_S="$REQUEST_PACING_BASE_S"
fi

ts() { date '+%Y-%m-%d %H:%M:%S'; }
log() { echo "[$(ts)] $*" | tee -a "$LOG"; }

acquire_lock() {
  if mkdir "$LOCK_DIR" 2>/dev/null; then
    echo "$$" > "$LOCK_PID_FILE"
    return 0
  fi
  if [[ -f "$LOCK_PID_FILE" ]]; then
    holder_pid="$(cat "$LOCK_PID_FILE" 2>/dev/null || true)"
    holder_cmd="$(ps -p "$holder_pid" -o command= 2>/dev/null || true)"
    if [[ -n "${holder_pid:-}" ]] && kill -0 "$holder_pid" 2>/dev/null \
      && [[ "$holder_cmd" == *"run-v29-dual-ab-watchdog.sh"* ]]; then
      return 1
    fi
    rm -rf "$LOCK_DIR" 2>/dev/null || true
    if mkdir "$LOCK_DIR" 2>/dev/null; then
      echo "$$" > "$LOCK_PID_FILE"
      return 0
    fi
  fi
  return 1
}

release_lock() {
  rm -rf "$LOCK_DIR" 2>/dev/null || true
}

concept_has_strategy_c_artifact() {
  local concept_name="$1"
  [[ -f "${OUT_DIR}/strategy-C/${concept_name}.png" ]]
}

concept_is_complete() {
  local concept_name="$1"
  local canonical_path="${OUT_DIR}/${concept_name}.png"
  [[ -f "$canonical_path" ]] || return 1
  if [[ "$REQUIRE_STRATEGY_C_FOR_COMPLETE" == "1" ]]; then
    concept_has_strategy_c_artifact "$concept_name" || return 1
  fi
  return 0
}

archive_incomplete_without_strategy_c() {
  local concept_name="$1"
  local canonical_path="${OUT_DIR}/${concept_name}.png"
  local backup_path="${INCOMPLETE_NO_C_DIR}/${concept_name}.png"
  if [[ "$REQUIRE_STRATEGY_C_FOR_COMPLETE" != "1" ]]; then
    return 0
  fi
  if [[ ! -f "$canonical_path" ]]; then
    return 0
  fi
  if concept_has_strategy_c_artifact "$concept_name"; then
    return 0
  fi
  mkdir -p "$INCOMPLETE_NO_C_DIR" || return 1
  mv -f "$canonical_path" "$backup_path" 2>/dev/null || return 1
  log "WATCHDOG_INCOMPLETE_C archived=${canonical_path} backup=${backup_path} reason=strategy_c_missing"
  return 0
}

archive_all_incomplete_without_strategy_c() {
  local concept_name canonical_path backup_path archived_count
  local -a concepts_without_c

  if [[ "$REQUIRE_STRATEGY_C_FOR_COMPLETE" != "1" ]]; then
    return 0
  fi

  mapfile -t concepts_without_c < <(python3 - "$SCRIPT" "$OUT_DIR" "$START_IDX" "$END_IDX" <<'PY'
import re
import sys
from pathlib import Path

try:
    script = Path(sys.argv[1]).read_text()
    out = Path(sys.argv[2])
    start = int(sys.argv[3])
    end = int(sys.argv[4])
    body = re.search(r"const concepts = \[(.*)\n\];\n", script, re.S).group(1)
    names = [m.group(1) for m in re.finditer(r"name:\s*'([^']+)'", body)]
    for name in names[start:end]:
        root = out / f"{name}.png"
        c = out / "strategy-C" / f"{name}.png"
        if root.exists() and not c.exists():
            print(name)
except Exception:
    pass
PY
)

  if (( ${#concepts_without_c[@]} == 0 )); then
    return 0
  fi

  mkdir -p "$INCOMPLETE_NO_C_DIR" || return 1
  archived_count=0

  for concept_name in "${concepts_without_c[@]}"; do
    canonical_path="${OUT_DIR}/${concept_name}.png"
    backup_path="${INCOMPLETE_NO_C_DIR}/${concept_name}.png"
    if [[ -f "$canonical_path" ]]; then
      mv -f "$canonical_path" "$backup_path" 2>/dev/null || continue
      archived_count=$((archived_count + 1))
      log "WATCHDOG_INCOMPLETE_C archived=${canonical_path} backup=${backup_path} reason=strategy_c_missing"
    fi
  done

  if (( archived_count > 0 )); then
    log "WATCHDOG_INCOMPLETE_C_SWEEP archived_count=${archived_count}"
  fi
}

promote_best_available_artifact() {
  local concept_name="$1"
  local canonical_path="${OUT_DIR}/${concept_name}.png"
  local strategy_c_path="${OUT_DIR}/strategy-C/${concept_name}.png"
  local best_path=""
  local best_mtime=0
  local candidate mtime
  local candidates=(
    "${OUT_DIR}/strategy-A/${concept_name}.png"
    "${OUT_DIR}/strategy-B/${concept_name}.png"
    "${OUT_DIR}/strategy-C/${concept_name}.png"
  )

  if [[ "$REQUIRE_STRATEGY_C_FOR_COMPLETE" == "1" ]] && [[ ! -f "$strategy_c_path" ]]; then
    log "WATCHDOG_PROMOTE_SKIP concept=${concept_name} reason=strategy_c_missing"
    return 1
  fi

  for candidate in "${candidates[@]}"; do
    if [[ -f "$candidate" ]]; then
      mtime="$(stat -f %m "$candidate" 2>/dev/null || echo 0)"
      if (( mtime > best_mtime )); then
        best_mtime="$mtime"
        best_path="$candidate"
      fi
    fi
  done

  if [[ -n "$best_path" ]]; then
    cp -f "$best_path" "$canonical_path" 2>/dev/null || return 1
    log "WATCHDOG_PROMOTE concept=${concept_name} source=${best_path} target=${canonical_path}"
    return 0
  fi

  return 1
}

on_watchdog_exit() {
  local rc=$?
  if [[ "$WATCHDOG_SHUTDOWN_REASON" == "unknown" ]]; then
    if (( rc == 0 )); then
      WATCHDOG_SHUTDOWN_REASON="normal"
    else
      WATCHDOG_SHUTDOWN_REASON="error"
    fi
  fi
  log "WATCHDOG_STOP rc=${rc} reason=${WATCHDOG_SHUTDOWN_REASON}"
  release_lock
}

on_watchdog_signal() {
  local sig="$1"
  case "$sig" in
    INT)
      WATCHDOG_SHUTDOWN_REASON="signal_INT"
      log "WATCHDOG_SIGNAL INT; shutting down"
      exit 130
      ;;
    TERM)
      case "$TERM_SIGNAL_MODE" in
        ignore)
          log "WATCHDOG_SIGNAL TERM ignored by policy."
          return 0
          ;;
        grace)
          TERM_SIGNAL_SEEN=$((TERM_SIGNAL_SEEN + 1))
          if (( TERM_SIGNAL_SEEN <= TERM_SIGNAL_GRACE_COUNT )); then
            log "WATCHDOG_SIGNAL TERM received (${TERM_SIGNAL_SEEN}/${TERM_SIGNAL_GRACE_COUNT}); ignoring by grace policy."
            return 0
          fi
          WATCHDOG_SHUTDOWN_REASON="signal_TERM"
          log "WATCHDOG_SIGNAL TERM threshold exceeded (${TERM_SIGNAL_SEEN}/${TERM_SIGNAL_GRACE_COUNT}); shutting down"
          exit 143
          ;;
        exit)
          WATCHDOG_SHUTDOWN_REASON="signal_TERM"
          log "WATCHDOG_SIGNAL TERM; shutting down"
          exit 143
          ;;
        *)
          log "WATCHDOG_SIGNAL TERM mode=${TERM_SIGNAL_MODE} unrecognized; ignoring."
          return 0
          ;;
      esac
      ;;
  esac
}

run_single_concept() {
  local next_idx="$1"
  local next_end="$2"
  local run_log child_pid tail_pid rc last_bytes current_bytes idle_elapsed idle_heartbeat_elapsed
  local -a child_cmd

  run_log="$(mktemp "${LOG}.child.${next_idx}.XXXXXX")"
  idle_elapsed=0
  idle_heartbeat_elapsed=0
  last_bytes=0

  child_cmd=(
      env FRONTIER_MODE=1 \
      DUAL_STRATEGY_MODE=1 \
      OUTPUT_DIR="$OUT_DIR" \
      MAX_CONCEPT_ATTEMPTS="$MAX_CONCEPT_ATTEMPTS" \
      RETRY_WAIT_S="$RETRY_WAIT_S" \
      CACHE_REUSE_WAIT_S="$CACHE_REUSE_WAIT_S" \
      RATE_LIMIT_BACKOFF_MIN_S="$RATE_LIMIT_BACKOFF_MIN_S" \
      RATE_LIMIT_BACKOFF_MAX_S="$RATE_LIMIT_BACKOFF_MAX_S" \
      API_REQUEST_TIMEOUT_MS="$API_REQUEST_TIMEOUT_MS" \
      NETWORK_RETRIES_MAX="$NETWORK_RETRIES_MAX" \
      NETWORK_RETRY_WAIT_S="$NETWORK_RETRY_WAIT_S" \
      SERVER_RETRIES_MAX="$SERVER_RETRIES_MAX" \
      SERVER_RETRY_WAIT_S="$SERVER_RETRY_WAIT_S" \
      HEARTBEAT_INTERVAL_S="$HEARTBEAT_INTERVAL_S" \
      AUTH_TIMEOUT_MS="$AUTH_TIMEOUT_MS" \
      AUTH_RETRIES_MAX="$AUTH_RETRIES_MAX" \
      AUTH_RETRY_WAIT_S="$AUTH_RETRY_WAIT_S" \
      ACCESS_TOKEN_EARLY_REFRESH_S="$ACCESS_TOKEN_EARLY_REFRESH_S" \
      REUSE_PASSA_ON_FAILURE="$REUSE_PASSA_ON_FAILURE" \
      RESUME_SKIP_COMPLETED_AB="$RESUME_SKIP_COMPLETED_AB" \
      REQUEST_PACING_BASE_S="$REQUEST_PACING_BASE_S" \
      REQUEST_PACING_MAX_S="$REQUEST_PACING_MAX_S" \
      RATE_LIMIT_BACKOFF_STEP_S="$RATE_LIMIT_BACKOFF_STEP_S" \
      RATE_LIMIT_STREAK_STEP_S="$RATE_LIMIT_STREAK_STEP_S" \
      RATE_LIMIT_MAX_BACKOFF_S="$RATE_LIMIT_MAX_BACKOFF_S" \
      RATE_LIMIT_RETRY_DEADLINE_S="$RATE_LIMIT_RETRY_DEADLINE_S" \
      RATE_LIMIT_CONSECUTIVE_FAILFAST="$RATE_LIMIT_CONSECUTIVE_FAILFAST" \
      RATE_LIMIT_PROFILE_NARROW_STREAK="$RATE_LIMIT_PROFILE_NARROW_STREAK" \
      RATE_LIMIT_FORCE_CACHE_STREAK="$RATE_LIMIT_FORCE_CACHE_STREAK" \
      PHASE2_VARIANTS_PER_ROUND="$PHASE2_VARIANTS_PER_ROUND" \
      PHASE2_VARIANT_INTENSITY_STEP="$PHASE2_VARIANT_INTENSITY_STEP" \
      APPROACH_SELF_ITERATION_ROUNDS_MAX="$APPROACH_SELF_ITERATION_ROUNDS_MAX" \
      C_SELF_ITERATION_ROUNDS_MAX="$C_SELF_ITERATION_ROUNDS_MAX" \
      AB_ITERATION_ROUNDS_MAX="$AB_ITERATION_ROUNDS_MAX" \
      FINAL_AUDIT_BOOST_ROUNDS_MAX="$FINAL_AUDIT_BOOST_ROUNDS_MAX" \
      FINAL_AUDIT_SHORTFALL_STEP="$FINAL_AUDIT_SHORTFALL_STEP" \
      FINAL_AUDIT_SHORTFALL_EXTRA_ROUNDS_MAX="$FINAL_AUDIT_SHORTFALL_EXTRA_ROUNDS_MAX" \
      LAST_PASS_REDO_ENABLED="$LAST_PASS_REDO_ENABLED" \
      LAST_PASS_REDO_ROUNDS_MAX="$LAST_PASS_REDO_ROUNDS_MAX" \
      LAST_PASS_REDO_TIE_BAND_ADD="$LAST_PASS_REDO_TIE_BAND_ADD" \
      LAST_PASS_REDO_SHORTFALL_TRIGGER="$LAST_PASS_REDO_SHORTFALL_TRIGGER" \
      HARDEN_ITERATION_PROCESS="$HARDEN_ITERATION_PROCESS" \
      HARDEN_MAX_EXTRA_PHASE2_VARIANTS="$HARDEN_MAX_EXTRA_PHASE2_VARIANTS" \
      HARDEN_MAX_EXTRA_ROUNDS="$HARDEN_MAX_EXTRA_ROUNDS" \
      HARDEN_MAX_EXTRA_SELF_ROUNDS="$HARDEN_MAX_EXTRA_SELF_ROUNDS" \
      HARDEN_MAX_EXTRA_LAST_PASS_ROUNDS="$HARDEN_MAX_EXTRA_LAST_PASS_ROUNDS" \
      QUALITY_ESCALATION_ENABLE="$QUALITY_ESCALATION_ENABLE" \
      QUALITY_ESCALATION_SCORE_TRIGGER="$QUALITY_ESCALATION_SCORE_TRIGGER" \
      QUALITY_ESCALATION_TIE_TRIGGER="$QUALITY_ESCALATION_TIE_TRIGGER" \
      QUALITY_ESCALATION_MAX_EXTRA_ROUNDS="$QUALITY_ESCALATION_MAX_EXTRA_ROUNDS" \
      QUALITY_ESCALATION_MAX_EXTRA_VARIANTS="$QUALITY_ESCALATION_MAX_EXTRA_VARIANTS" \
      MIN_FINAL_MULTIPLIER_GATE="$MIN_FINAL_MULTIPLIER_GATE" \
      STRICT_QUALITY_GATE="$STRICT_QUALITY_GATE" \
      LOCK_AB_VARIATION="$LOCK_AB_VARIATION" \
      LOCK_C_VARIATION_TO_AB="$LOCK_C_VARIATION_TO_AB" \
      "$NODE_BIN" "$SCRIPT" "$INPUT_IMG" "$next_idx" "$next_end"
  )
  if command -v setsid >/dev/null 2>&1; then
    setsid "${child_cmd[@]}" >"$run_log" 2>&1 &
  else
    "${child_cmd[@]}" >"$run_log" 2>&1 &
  fi
  child_pid=$!

  tail -n +1 -F "$run_log" | tee -a "$LOG" &
  tail_pid=$!

  while kill -0 "$child_pid" 2>/dev/null; do
    current_bytes="$(wc -c < "$run_log" 2>/dev/null || echo 0)"
    if [[ "$current_bytes" -gt "$last_bytes" ]]; then
      last_bytes="$current_bytes"
      idle_elapsed=0
      idle_heartbeat_elapsed=0
    else
      idle_elapsed=$((idle_elapsed + WATCHDOG_CHILD_MONITOR_POLL_S))
      idle_heartbeat_elapsed=$((idle_heartbeat_elapsed + WATCHDOG_CHILD_MONITOR_POLL_S))
      if (( WATCHDOG_CHILD_IDLE_TIMEOUT_S > 0 )); then
        if (( idle_elapsed >= WATCHDOG_CHILD_IDLE_TIMEOUT_S )); then
          log "WATCHDOG_STALL concept_idx=${next_idx} pid=${child_pid} idle=${idle_elapsed}s threshold=${WATCHDOG_CHILD_IDLE_TIMEOUT_S}s; terminating child"
          kill "$child_pid" 2>/dev/null || true
          sleep 5
          if kill -0 "$child_pid" 2>/dev/null; then
            kill -9 "$child_pid" 2>/dev/null || true
          fi
          break
        fi
      elif (( WATCHDOG_CHILD_IDLE_HEARTBEAT_S > 0 )) && (( idle_heartbeat_elapsed >= WATCHDOG_CHILD_IDLE_HEARTBEAT_S )); then
        log "WATCHDOG_IDLE_HEARTBEAT concept_idx=${next_idx} pid=${child_pid} idle=${idle_elapsed}s timeout=disabled"
        idle_heartbeat_elapsed=0
      fi
    fi
    sleep "$WATCHDOG_CHILD_MONITOR_POLL_S"
  done

  wait "$child_pid"
  rc=$?

  if kill -0 "$tail_pid" 2>/dev/null; then
    kill "$tail_pid" 2>/dev/null || true
  fi
  wait "$tail_pid" 2>/dev/null || true
  rm -f "$run_log"
  return "$rc"
}

log_iteration_snapshot() {
  python3 - "$SUMMARY_FILE" "$LEARNING_PLAN_FILE" <<'PY'
import json
import sys
from pathlib import Path

fp = Path(sys.argv[1])
lp = Path(sys.argv[2])
if not fp.exists():
    print("ITERATION_SUMMARY summary_file_missing")
    raise SystemExit(0)

try:
    data = json.loads(fp.read_text())
except Exception:
    print("ITERATION_SUMMARY summary_parse_error")
    raise SystemExit(0)

concepts = data.get("concepts", 0)
wins = data.get("wins", {})
avg = data.get("avg_overall", {})
cg = data.get("c_gain_percent_vs_best_ab", {})
top_lessons = data.get("top_lessons", [])

top = []
for item in top_lessons[:3]:
    lesson = (item.get("lesson") or item.get("hint") or "").strip()
    count = item.get("count", 0)
    if lesson:
        top.append(f"({count}x) {lesson}")

msg = (
    f"ITERATION_SUMMARY concepts={concepts} "
    f"wins=A:{wins.get('A',0)}|B:{wins.get('B',0)}|C:{wins.get('C',0)} "
    f"avg=A:{avg.get('A',0):.2f}|B:{avg.get('B',0):.2f}|C:{avg.get('C',0):.2f} "
    f"c_gain_avg={cg.get('avg',0):.1f}% "
    f"target={cg.get('target',0)}% "
    f"hits={cg.get('target_hit_count',0)}"
)
print(msg)
for i, item in enumerate(top, 1):
    print(f"ITERATION_LESSON {i}: {item}")

if lp.exists():
    try:
        plan = json.loads(lp.read_text())
    except Exception:
        plan = {}
    objs = plan.get("next_round_objectives", []) or []
    for i, obj in enumerate(objs[:3], 1):
        print(f"ITERATION_OBJECTIVE {i}: {obj}")
PY
}

apply_learning_plan_recommendations() {
  if [[ "$ADAPT_FROM_LEARNING_PLAN" != "1" ]]; then
    return
  fi
  if [[ ! -f "$LEARNING_PLAN_FILE" ]]; then
    return
  fi

  local cfg
  cfg="$(python3 - "$LEARNING_PLAN_FILE" <<'PY'
import json
import sys
from pathlib import Path

fp = Path(sys.argv[1])
try:
    data = json.loads(fp.read_text())
except Exception:
    print("")
    raise SystemExit(0)

cfg = data.get("recommended_config") or {}
try:
    phase2 = int(cfg.get("phase2_variants_per_round", 3))
except Exception:
    phase2 = 3
try:
    step = float(cfg.get("phase2_variant_intensity_step", 0.08))
except Exception:
    step = 0.08
try:
    self_rounds = int(cfg.get("approach_self_iteration_rounds_max", 1))
except Exception:
    self_rounds = 1
try:
    c_self_rounds = int(cfg.get("c_self_iteration_rounds_max", 1))
except Exception:
    c_self_rounds = 1
try:
    ab_rounds = int(cfg.get("ab_iteration_rounds_max", 2))
except Exception:
    ab_rounds = 2
try:
    final_audit_rounds = int(cfg.get("final_audit_boost_rounds_max", 1))
except Exception:
    final_audit_rounds = 1
try:
    lock_ab = int(cfg.get("lock_ab_variation", 1))
except Exception:
    lock_ab = 1
try:
    lock_c = int(cfg.get("lock_c_variation_to_ab", 1))
except Exception:
    lock_c = 1
try:
    resume_skip = int(cfg.get("resume_skip_completed_ab", 1))
except Exception:
    resume_skip = 1

phase2 = max(1, phase2)
self_rounds = max(0, self_rounds)
c_self_rounds = max(0, c_self_rounds)
ab_rounds = max(1, ab_rounds)
final_audit_rounds = max(0, final_audit_rounds)
step = max(0.02, step)
lock_ab = 1 if lock_ab else 0
lock_c = 1 if lock_c else 0
resume_skip = 1 if resume_skip else 0

print(f"{phase2}\t{step:.2f}\t{self_rounds}\t{c_self_rounds}\t{ab_rounds}\t{final_audit_rounds}\t{lock_ab}\t{lock_c}\t{resume_skip}")
PY
)"
  if [[ -z "$cfg" ]]; then
    return
  fi

  local lp_phase2 lp_step lp_self lp_c_self lp_ab lp_final_audit lp_lock_ab lp_lock_c lp_resume_skip
  IFS=$'\t' read -r lp_phase2 lp_step lp_self lp_c_self lp_ab lp_final_audit lp_lock_ab lp_lock_c lp_resume_skip <<<"$cfg"
  [[ -n "${lp_phase2:-}" ]] && PHASE2_VARIANTS_PER_ROUND="$lp_phase2"
  [[ -n "${lp_step:-}" ]] && PHASE2_VARIANT_INTENSITY_STEP="$lp_step"
  [[ -n "${lp_self:-}" ]] && APPROACH_SELF_ITERATION_ROUNDS_MAX="$lp_self"
  [[ -n "${lp_c_self:-}" ]] && C_SELF_ITERATION_ROUNDS_MAX="$lp_c_self"
  [[ -n "${lp_ab:-}" ]] && AB_ITERATION_ROUNDS_MAX="$lp_ab"
  [[ -n "${lp_final_audit:-}" ]] && FINAL_AUDIT_BOOST_ROUNDS_MAX="$lp_final_audit"
  [[ -n "${lp_lock_ab:-}" ]] && LOCK_AB_VARIATION="$lp_lock_ab"
  [[ -n "${lp_lock_c:-}" ]] && LOCK_C_VARIATION_TO_AB="$lp_lock_c"
  [[ -n "${lp_resume_skip:-}" ]] && RESUME_SKIP_COMPLETED_AB="$lp_resume_skip"
}

missing_count() {
  python3 - "$SCRIPT" "$OUT_DIR" "$START_IDX" "$END_IDX" "$REQUIRE_STRATEGY_C_FOR_COMPLETE" <<'PY'
import re
import sys
from pathlib import Path

try:
    script = Path(sys.argv[1]).read_text()
    out = Path(sys.argv[2])
    start = int(sys.argv[3])
    end = int(sys.argv[4])
    require_c = sys.argv[5] == "1"
    body = re.search(r"const concepts = \[(.*)\n\];\n", script, re.S).group(1)
    names = [m.group(1) for m in re.finditer(r"name:\s*'([^']+)'", body)]
    target = names[start:end]
    missing = []
    for n in target:
      root_exists = (out / f"{n}.png").exists()
      c_exists = (out / "strategy-C" / f"{n}.png").exists()
      done = root_exists and (c_exists if require_c else True)
      if not done:
        missing.append(n)
    print(len(missing))
except Exception:
    print(-1)
PY
}

next_missing_idx_and_name() {
  python3 - "$SCRIPT" "$OUT_DIR" "$START_IDX" "$END_IDX" "$REQUIRE_STRATEGY_C_FOR_COMPLETE" <<'PY'
import re
import sys
from pathlib import Path

script = Path(sys.argv[1]).read_text()
out = Path(sys.argv[2])
start = int(sys.argv[3])
end = int(sys.argv[4])
require_c = sys.argv[5] == "1"

body = re.search(r"const concepts = \[(.*)\n\];\n", script, re.S).group(1)
names = [m.group(1) for m in re.finditer(r"name:\s*'([^']+)'", body)]
for idx in range(start, end):
    name = names[idx]
    root_exists = (out / f"{name}.png").exists()
    c_exists = (out / "strategy-C" / f"{name}.png").exists()
    done = root_exists and (c_exists if require_c else True)
    if not done:
        print(f"{idx}\t{name}")
        raise SystemExit(0)
print("")
PY
}

mkdir -p "$OUT_DIR" "$OUT_DIR/passA"
touch "$LOG"

if ! acquire_lock; then
  WATCHDOG_SHUTDOWN_REASON="lock_held"
  log "WATCHDOG_NOTE another instance is already running; exiting."
  exit 0
fi

trap on_watchdog_exit EXIT
trap 'on_watchdog_signal INT' INT
trap 'on_watchdog_signal TERM' TERM
trap 'log "WATCHDOG_SIGNAL HUP ignored (detach-safe)"' HUP

log "WATCHDOG_START range=${START_IDX}-${END_IDX} out=${OUT_DIR}"
log "WATCHDOG_CONFIG retry_wait=${RETRY_WAIT_S}s cache_reuse_wait=${CACHE_REUSE_WAIT_S}s max_attempts=${MAX_CONCEPT_ATTEMPTS} timeout_ms=${API_REQUEST_TIMEOUT_MS} network_retries=${NETWORK_RETRIES_MAX} server_retries=${SERVER_RETRIES_MAX} heartbeat=${HEARTBEAT_INTERVAL_S}s child_idle_timeout=${WATCHDOG_CHILD_IDLE_TIMEOUT_S}s poll=${WATCHDOG_CHILD_MONITOR_POLL_S}s child_idle_heartbeat=${WATCHDOG_CHILD_IDLE_HEARTBEAT_S}s require_strategy_c=${REQUIRE_STRATEGY_C_FOR_COMPLETE}"
archive_all_incomplete_without_strategy_c || true

while true; do
  archive_all_incomplete_without_strategy_c || true
  miss="$(missing_count)"
  if ! [[ "$miss" =~ ^[0-9]+$ ]]; then
    log "WATCHDOG_NOTE missing_count parse error (value='${miss}'); sleeping ${CHILD_SIGNAL_RETRY_WAIT_S}s"
    sleep "$CHILD_SIGNAL_RETRY_WAIT_S"
    continue
  fi
  if [[ "$miss" == "0" ]]; then
    WATCHDOG_SHUTDOWN_REASON="range_complete"
    log "WATCHDOG_DONE all outputs present for range ${START_IDX}-${END_IDX}"
    exit 0
  fi

  next_line="$(next_missing_idx_and_name)"
  if [[ "$next_line" != *$'\t'* ]]; then
    log "WATCHDOG_NOTE missing_count=${miss} but missing index unresolved; sleeping ${CHILD_SIGNAL_RETRY_WAIT_S}s"
    sleep "$CHILD_SIGNAL_RETRY_WAIT_S"
    continue
  fi
  if [[ -z "$next_line" ]]; then
    log "WATCHDOG_NOTE missing_count=${miss} but no missing index resolved; sleeping ${CHILD_SIGNAL_RETRY_WAIT_S}s"
    sleep "$CHILD_SIGNAL_RETRY_WAIT_S"
    continue
  fi

  next_idx="${next_line%%$'\t'*}"
  next_name="${next_line#*$'\t'}"
  next_end="$((next_idx + 1))"
  archive_incomplete_without_strategy_c "$next_name" || true
  apply_learning_plan_recommendations
  log "WATCHDOG_ITER_CONFIG phase2_variants=${PHASE2_VARIANTS_PER_ROUND} phase2_step=${PHASE2_VARIANT_INTENSITY_STEP} self_rounds=${APPROACH_SELF_ITERATION_ROUNDS_MAX} c_self_rounds=${C_SELF_ITERATION_ROUNDS_MAX} ab_rounds=${AB_ITERATION_ROUNDS_MAX} final_audit_rounds=${FINAL_AUDIT_BOOST_ROUNDS_MAX} final_shortfall_step=${FINAL_AUDIT_SHORTFALL_STEP} final_shortfall_extra_max=${FINAL_AUDIT_SHORTFALL_EXTRA_ROUNDS_MAX} last_pass_redo=${LAST_PASS_REDO_ENABLED} last_pass_rounds=${LAST_PASS_REDO_ROUNDS_MAX} last_pass_tie_add=${LAST_PASS_REDO_TIE_BAND_ADD} last_pass_shortfall_trigger=${LAST_PASS_REDO_SHORTFALL_TRIGGER} harden_iter=${HARDEN_ITERATION_PROCESS} harden_phase2_extra=${HARDEN_MAX_EXTRA_PHASE2_VARIANTS} harden_rounds_extra=${HARDEN_MAX_EXTRA_ROUNDS} harden_self_extra=${HARDEN_MAX_EXTRA_SELF_ROUNDS} harden_last_pass_extra=${HARDEN_MAX_EXTRA_LAST_PASS_ROUNDS} quality_escalation=${QUALITY_ESCALATION_ENABLE} quality_score_trigger=${QUALITY_ESCALATION_SCORE_TRIGGER} quality_tie_trigger=${QUALITY_ESCALATION_TIE_TRIGGER} quality_extra_rounds=${QUALITY_ESCALATION_MAX_EXTRA_ROUNDS} quality_extra_variants=${QUALITY_ESCALATION_MAX_EXTRA_VARIANTS} quality_gate_min=${MIN_FINAL_MULTIPLIER_GATE} quality_gate_strict=${STRICT_QUALITY_GATE} auth_timeout=${AUTH_TIMEOUT_MS}ms auth_retries=${AUTH_RETRIES_MAX} auth_retry_wait=${AUTH_RETRY_WAIT_S}s auth_early_refresh=${ACCESS_TOKEN_EARLY_REFRESH_S}s reuse_passa=${REUSE_PASSA_ON_FAILURE} resume_skip_ab=${RESUME_SKIP_COMPLETED_AB} waits=${RETRY_WAIT_S}/${CACHE_REUSE_WAIT_S}s request_pacing=${REQUEST_PACING_BASE_S}-${REQUEST_PACING_MAX_S}s rl_step=${RATE_LIMIT_BACKOFF_STEP_S}s rl_streak_step=${RATE_LIMIT_STREAK_STEP_S}s rl_max=${RATE_LIMIT_MAX_BACKOFF_S}s rl_deadline=${RATE_LIMIT_RETRY_DEADLINE_S}s rl_failfast=${RATE_LIMIT_CONSECUTIVE_FAILFAST} rl_profile_narrow=${RATE_LIMIT_PROFILE_NARROW_STREAK} rl_force_cache=${RATE_LIMIT_FORCE_CACHE_STREAK} lock_ab=${LOCK_AB_VARIATION} lock_c=${LOCK_C_VARIATION_TO_AB}"
  log "WATCHDOG_RUN missing=${miss:-unknown}; next=${next_idx}:${next_name}; launching single-concept run"
  run_single_concept "$next_idx" "$next_end"
  rc=$?
  miss_after="$(missing_count)"
  if [[ -z "$miss_after" ]]; then
    miss_after="unknown"
  fi
  produced="no"
  if concept_is_complete "$next_name"; then
    produced="yes"
  elif promote_best_available_artifact "$next_name" && concept_is_complete "$next_name"; then
    produced="yes"
  fi
  sleep_after="$RESTART_GAP_S"
  if (( rc >= 128 )) && [[ "$produced" != "yes" ]]; then
    sleep_after="$CHILD_SIGNAL_RETRY_WAIT_S"
    log "WATCHDOG_CHILD_SIGNAL concept=${next_name} rc=${rc}; quick-retrying in ${sleep_after}s"
  fi
  log "WATCHDOG_CHILD_EXIT rc=${rc} concept=${next_name} produced=${produced} missing_after=${miss_after}; sleeping ${sleep_after}s"
  while IFS= read -r line; do
    log "$line"
  done < <(log_iteration_snapshot)
  sleep "$sleep_after"
done

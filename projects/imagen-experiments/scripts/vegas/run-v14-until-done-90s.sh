#!/usr/bin/env bash
set -u
set -o pipefail

OUT_DIR="${HOME}/nanobanana-output/pool-luxe-lace-v14-10x-no-nylons"
INPUT_IMG="/Users/louisherman/Documents/IMG_4385.jpeg"
NODE_BIN="/Users/louisherman/.nvm/versions/node/v22.22.0/bin/node"
SCRIPT="/Users/louisherman/ClaudeCodeProjects/projects/imagen-experiments/scripts/vegas/vegas-v29-apex.js"
LOG="${HOME}/gen-pool-luxe-lace-v14-10x-until-done.log"
ATTEMPT_LOG_DIR="${OUT_DIR}/attempt-logs"
FAIL_LOG_JSONL="${HOME}/gen-pool-luxe-lace-v14-10x-failures.jsonl"
ATTEMPT_RESULTS_JSONL="${HOME}/gen-pool-luxe-lace-v14-10x-attempt-results.jsonl"
FAIL_QUEUE_JSON="${HOME}/gen-pool-luxe-lace-v14-10x-fail-queue.json"
LOCK_DIR="${HOME}/.run-v14-until-done-90s.lockdir"
LOCK_PID_FILE="${LOCK_DIR}/pid"
LOCK_META_FILE="${LOCK_DIR}/meta"
ATTEMPT_TIMEOUT_S="${ATTEMPT_TIMEOUT_S:-2400}"
HEARTBEAT_S="${HEARTBEAT_S:-30}"
ATTEMPT_GAP_S="${ATTEMPT_GAP_S:-91}"
START_NUM="${START_NUM:-581}"
END_NUM="${END_NUM:-620}"
HEARTBEAT_FILE="${OUT_DIR}/runner-heartbeat.txt"

mkdir -p "${OUT_DIR}" "${OUT_DIR}/passA" "${ATTEMPT_LOG_DIR}"
touch "${FAIL_LOG_JSONL}" "${ATTEMPT_RESULTS_JSONL}"

RUN_ONE_RC=""
RUN_ONE_LOG=""

# Single-instance guard: portable lock for macOS/Linux without requiring flock.
acquire_lock() {
  if mkdir "$LOCK_DIR" 2>/dev/null; then
    echo "$$" > "$LOCK_PID_FILE"
    printf 'pid=%s\nts=%s\nscript=%s\n' "$$" "$(date '+%Y-%m-%dT%H:%M:%S%z')" "$0" > "$LOCK_META_FILE"
    return 0
  fi

  if [[ -f "$LOCK_PID_FILE" ]]; then
    local holder_pid
    local holder_cmd
    holder_pid="$(cat "$LOCK_PID_FILE" 2>/dev/null || true)"
    holder_cmd="$(ps -p "$holder_pid" -o command= 2>/dev/null || true)"

    # Valid lock only if PID is alive and still this runner (protect against PID reuse).
    if [[ -n "$holder_pid" ]] && kill -0 "$holder_pid" 2>/dev/null \
      && [[ "$holder_cmd" == *"run-v14-until-done-90s.sh"* ]]; then
      return 1
    fi

    rm -rf "$LOCK_DIR"
    if mkdir "$LOCK_DIR" 2>/dev/null; then
      echo "$$" > "$LOCK_PID_FILE"
      printf 'pid=%s\nts=%s\nscript=%s\n' "$$" "$(date '+%Y-%m-%dT%H:%M:%S%z')" "$0" > "$LOCK_META_FILE"
      return 0
    fi
  fi
  return 1
}

release_lock() {
  rm -rf "$LOCK_DIR" 2>/dev/null || true
}

if ! acquire_lock; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] another run-v14-until-done-90s instance is already active; exiting." | tee -a "$LOG"
  exit 0
fi

ts() { date '+%Y-%m-%d %H:%M:%S'; }

log() {
  echo "[$(ts)] $*" | tee -a "$LOG" >&2
  printf '%s\n' "$(date '+%Y-%m-%dT%H:%M:%S%z')" > "$HEARTBEAT_FILE"
}

on_exit() {
  local rc="$1"
  log "RUNNER_EXIT rc=${rc}"
  release_lock
}

trap 'on_exit $?' EXIT
trap 'log "RUNNER_SIGNAL INT"; exit 130' INT
trap 'log "RUNNER_SIGNAL TERM"; exit 143' TERM

has_output() {
  local n="$1"
  ls "${OUT_DIR}/${n}-"*.png >/dev/null 2>&1
}

classify_failure() {
  local rc="$1"
  local attempt_log="$2"

  if [[ "$rc" -eq 124 ]]; then
    echo "timeout"
    return
  fi
  if grep -Eq 'IMAGE_SAFETY|IMAGE_PROHIBITED_CONTENT' "$attempt_log"; then
    echo "safety"
    return
  fi
  if grep -Eq 'Rate limited|status 429|HTTP 429' "$attempt_log"; then
    echo "ratelimit"
    return
  fi
  if grep -Eqi 'network|fetch failed|ENOTFOUND|ECONNRESET|ETIMEDOUT' "$attempt_log"; then
    echo "network"
    return
  fi
  echo "unknown"
}

record_failure() {
  local n="$1"
  local idx="$2"
  local profile="$3"
  local rc="$4"
  local reason="$5"
  local attempt_log="$6"

  printf '{"ts":"%s","concept":%s,"idx":%s,"profile":"%s","rc":%s,"reason":"%s","attempt_log":"%s"}\n' \
    "$(date '+%Y-%m-%dT%H:%M:%S%z')" "$n" "$idx" "$profile" "$rc" "$reason" "$attempt_log" >> "$FAIL_LOG_JSONL"
}

record_attempt_result() {
  local n="$1"
  local idx="$2"
  local profile="$3"
  local rc="$4"
  local reason="$5"
  local status="$6"
  local attempt_log="$7"

  printf '{"ts":"%s","concept":%s,"idx":%s,"profile":"%s","status":"%s","rc":%s,"reason":"%s","attempt_log":"%s"}\n' \
    "$(date '+%Y-%m-%dT%H:%M:%S%z')" "$n" "$idx" "$profile" "$status" "$rc" "$reason" "$attempt_log" >> "$ATTEMPT_RESULTS_JSONL"
}

queue_failures_json() {
  local -n fail_map_ref=$1
  local first=1
  printf '[' > "$FAIL_QUEUE_JSON"
  for n in "${!fail_map_ref[@]}"; do
    if [[ $first -eq 0 ]]; then
      printf ',' >> "$FAIL_QUEUE_JSON"
    fi
    first=0
    printf '{"concept":%s,"reason":"%s"}' "$n" "${fail_map_ref[$n]}" >> "$FAIL_QUEUE_JSON"
  done
  printf ']\n' >> "$FAIL_QUEUE_JSON"
}

get_reason_from_attempt_log() {
  local attempt_log="$1"
  if grep -Eq 'NO IMAGE generated in pass A|IMAGE_PROHIBITED_CONTENT|IMAGE_SAFETY' "$attempt_log"; then
    echo "safety"
    return
  fi
  if grep -Eq 'Rate limited|status 429|HTTP 429' "$attempt_log"; then
    echo "ratelimit"
    return
  fi
  if grep -Eqi 'network|fetch failed|ENOTFOUND|ECONNRESET|ETIMEDOUT' "$attempt_log"; then
    echo "network"
    return
  fi
  echo "unknown"
}

parse_attempt_result() {
  local raw="$1"
  local out_rc_var="$2"
  local out_log_var="$3"
  local parsed_rc parsed_log line

  # Accept only the last machine-readable payload line in case stdout was noisy.
  line="$(printf '%s\n' "$raw" | grep -E '^[0-9]+\|.+' | tail -n 1)"
  if [[ -z "$line" ]]; then
    return 1
  fi

  parsed_rc="${line%%|*}"
  parsed_log="${line#*|}"

  if [[ ! "$parsed_rc" =~ ^[0-9]+$ ]] || [[ -z "$parsed_log" ]]; then
    return 1
  fi

  printf -v "$out_rc_var" '%s' "$parsed_rc"
  printf -v "$out_log_var" '%s' "$parsed_log"
  return 0
}

run_one_attempt() {
  local n="$1"
  local idx="$2"
  local profile="$3"

  local timeout_s="$ATTEMPT_TIMEOUT_S"
  local retry_wait_s="${RETRY_WAIT_S:-91}"
  local backoff_min_s="${DEFAULT_BACKOFF_MIN_S:-60}"
  local backoff_max_s="${DEFAULT_BACKOFF_MAX_S:-120}"
  local pass_a_only=0

  case "$profile" in
    ratelimit)
      backoff_min_s="${RATELIMIT_BACKOFF_MIN_S:-120}"
      backoff_max_s="${RATELIMIT_BACKOFF_MAX_S:-240}"
      ;;
    safety)
      pass_a_only=1
      ;;
    timeout)
      timeout_s=$((ATTEMPT_TIMEOUT_S + 1200))
      ;;
  esac

  if [[ "${FORCE_PASS_A_ONLY:-0}" == "1" ]]; then
    pass_a_only=1
  fi

  local attempt_log="${ATTEMPT_LOG_DIR}/$(date '+%Y%m%d-%H%M%S')-${n}-${profile}.log"
  RUN_ONE_RC=""
  RUN_ONE_LOG="$attempt_log"

  log "ATTEMPT concept=${n} idx=${idx} profile=${profile} timeout=${timeout_s}s pass_a_only=${pass_a_only} backoff=${backoff_min_s}-${backoff_max_s}s"
  log "ATTEMPT_LOG ${attempt_log}"

  OUTPUT_DIR="${OUT_DIR}" \
  MAX_CONCEPT_ATTEMPTS=1 \
  RETRY_WAIT_S="$retry_wait_s" \
  RATE_LIMIT_BACKOFF_MIN_S="$backoff_min_s" \
  RATE_LIMIT_BACKOFF_MAX_S="$backoff_max_s" \
  PASS_A_ONLY="$pass_a_only" \
  "$NODE_BIN" "$SCRIPT" "$INPUT_IMG" "$idx" "$((idx+1))" >>"$attempt_log" 2>&1 &

  local child_pid=$!
  local start_ts
  start_ts="$(date +%s)"

  log "RUN pid=${child_pid} concept=${n} profile=${profile}"

  while kill -0 "$child_pid" 2>/dev/null; do
    local now_ts elapsed
    now_ts="$(date +%s)"
    elapsed=$((now_ts - start_ts))

    if (( elapsed >= timeout_s )); then
      log "TIMEOUT concept=${n} pid=${child_pid} elapsed=${elapsed}s; killing"
      kill "$child_pid" 2>/dev/null || true
      sleep 2
      kill -9 "$child_pid" 2>/dev/null || true
      wait "$child_pid" 2>/dev/null || true
      RUN_ONE_RC="124"
      return 0
    fi

    log "HEARTBEAT concept=${n} pid=${child_pid} profile=${profile} elapsed=${elapsed}s"
    sleep "$HEARTBEAT_S"
  done

  wait "$child_pid"
  local rc=$?
  RUN_ONE_RC="$rc"
  return 0
}

log "START run-v14-until-done-90s range=${START_NUM}-${END_NUM} timeout=${ATTEMPT_TIMEOUT_S}s heartbeat=${HEARTBEAT_S}s gap=${ATTEMPT_GAP_S}s"

while true; do
  all_done=1
  declare -A cycle_fail_reason=()

  # Primary pass
  for n in $(seq "$START_NUM" "$END_NUM"); do
    if has_output "$n"; then
      log "SKIP done ${n}"
      continue
    fi

    all_done=0
    idx=$((n-521))

    run_one_attempt "$n" "$idx" "default"
    rc="${RUN_ONE_RC:-}"
    attempt_log="${RUN_ONE_LOG:-}"
    if [[ -z "$rc" || -z "$attempt_log" ]]; then
      rc=1
      attempt_log="${ATTEMPT_LOG_DIR}/$(date '+%Y%m%d-%H%M%S')-${n}-runner-payload.log"
      printf '%s\n' "<missing run_one result>" > "$attempt_log"
      reason="runner_payload"
      cycle_fail_reason["$n"]="$reason"
      record_failure "$n" "$idx" "default" "$rc" "$reason" "$attempt_log"
      record_attempt_result "$n" "$idx" "default" "$rc" "$reason" "failed" "$attempt_log"
      log "MISS ${n} reason=${reason} (invalid attempt result payload; continuing)"
      log "SLEEP ${ATTEMPT_GAP_S}s"
      sleep "$ATTEMPT_GAP_S"
      continue
    fi
    log "EXIT concept=${n} profile=default rc=${rc}"

    if has_output "$n"; then
      log "DONE ${n}"
      record_attempt_result "$n" "$idx" "default" "$rc" "none" "success" "$attempt_log"
    else
      reason="$(classify_failure "$rc" "$attempt_log")"
      reason_from_log="$(get_reason_from_attempt_log "$attempt_log")"
      if [[ "$reason" == "unknown" && "$reason_from_log" != "unknown" ]]; then
        reason="$reason_from_log"
      fi
      cycle_fail_reason["$n"]="$reason"
      record_failure "$n" "$idx" "default" "$rc" "$reason" "$attempt_log"
      record_attempt_result "$n" "$idx" "default" "$rc" "$reason" "failed" "$attempt_log"
      log "MISS ${n} reason=${reason} (queued for follow-up)"
    fi

    log "SLEEP ${ATTEMPT_GAP_S}s"
    sleep "$ATTEMPT_GAP_S"
  done

  if [[ "$all_done" -eq 1 ]]; then
    log "COMPLETE all ${START_NUM}-${END_NUM} present"
    break
  fi

  # Follow-up retry pass with tweaks based on failure reason.
  if [[ "${#cycle_fail_reason[@]}" -gt 0 ]]; then
    queue_failures_json cycle_fail_reason
    log "FOLLOWUP start failed_count=${#cycle_fail_reason[@]}"

    for n in "${!cycle_fail_reason[@]}"; do
      if has_output "$n"; then
        continue
      fi

      idx=$((n-521))
      reason="${cycle_fail_reason[$n]}"
      profile="default"
      case "$reason" in
        safety) profile="safety" ;;
        ratelimit|network) profile="ratelimit" ;;
        timeout) profile="timeout" ;;
      esac

      run_one_attempt "$n" "$idx" "$profile"
      rc="${RUN_ONE_RC:-}"
      attempt_log="${RUN_ONE_LOG:-}"
      if [[ -z "$rc" || -z "$attempt_log" ]]; then
        rc=1
        attempt_log="${ATTEMPT_LOG_DIR}/$(date '+%Y%m%d-%H%M%S')-${n}-${profile}-runner-payload.log"
        printf '%s\n' "<missing run_one result>" > "$attempt_log"
        reason2="runner_payload"
        record_failure "$n" "$idx" "$profile" "$rc" "$reason2" "$attempt_log"
        record_attempt_result "$n" "$idx" "$profile" "$rc" "$reason2" "failed" "$attempt_log"
        log "MISS ${n} after follow-up profile=${profile} reason=${reason2} (invalid attempt result payload; continuing)"
        log "SLEEP ${ATTEMPT_GAP_S}s"
        sleep "$ATTEMPT_GAP_S"
        continue
      fi
      log "EXIT concept=${n} profile=${profile} rc=${rc}"

      if has_output "$n"; then
        log "DONE ${n} (follow-up profile=${profile})"
        record_attempt_result "$n" "$idx" "$profile" "$rc" "none" "success" "$attempt_log"
      else
        reason2="$(classify_failure "$rc" "$attempt_log")"
        reason2_from_log="$(get_reason_from_attempt_log "$attempt_log")"
        if [[ "$reason2" == "unknown" && "$reason2_from_log" != "unknown" ]]; then
          reason2="$reason2_from_log"
        fi
        record_failure "$n" "$idx" "$profile" "$rc" "$reason2" "$attempt_log"
        record_attempt_result "$n" "$idx" "$profile" "$rc" "$reason2" "failed" "$attempt_log"
        log "MISS ${n} after follow-up profile=${profile} reason=${reason2}"
      fi

      log "SLEEP ${ATTEMPT_GAP_S}s"
      sleep "$ATTEMPT_GAP_S"
    done

    log "FOLLOWUP end"
  fi

done

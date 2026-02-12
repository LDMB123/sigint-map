#!/usr/bin/env bash
set -u
set -o pipefail

WORKER_SCRIPT="/Users/louisherman/ClaudeCodeProjects/projects/imagen-experiments/scripts/vegas/run-v14-until-done-90s.sh"
OUT_DIR="${HOME}/nanobanana-output/pool-luxe-lace-v14-10x-no-nylons"
LOG="${HOME}/gen-pool-luxe-lace-v14-10x-supervisor.log"
LOCK_DIR="${HOME}/.run-v14-supervisor.lockdir"
LOCK_PID_FILE="${LOCK_DIR}/pid"

START_NUM="${START_NUM:-581}"
END_NUM="${END_NUM:-620}"
ATTEMPT_GAP_S="${ATTEMPT_GAP_S:-91}"
RETRY_WAIT_S="${RETRY_WAIT_S:-91}"
SUPERVISOR_RESTART_S="${SUPERVISOR_RESTART_S:-20}"
STOP_FILE="${HOME}/.run-v14-supervisor.stop"

mkdir -p "$OUT_DIR"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG" >&2
}

release_lock() {
  rm -rf "$LOCK_DIR" 2>/dev/null || true
}

acquire_lock() {
  if mkdir "$LOCK_DIR" 2>/dev/null; then
    echo "$$" > "$LOCK_PID_FILE"
    return 0
  fi

  if [[ -f "$LOCK_PID_FILE" ]]; then
    local pid
    pid="$(cat "$LOCK_PID_FILE" 2>/dev/null || true)"
    if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
      local cmd
      cmd="$(ps -p "$pid" -o command= 2>/dev/null || true)"
      if [[ "$cmd" == *"run-v14-supervisor.sh"* ]]; then
        return 1
      fi
    fi
  fi

  rm -rf "$LOCK_DIR"
  if mkdir "$LOCK_DIR" 2>/dev/null; then
    echo "$$" > "$LOCK_PID_FILE"
    return 0
  fi
  return 1
}

all_done() {
  local n
  for n in $(seq "$START_NUM" "$END_NUM"); do
    if ! ls "${OUT_DIR}/${n}-"*.png >/dev/null 2>&1; then
      return 1
    fi
  done
  return 0
}

on_exit() {
  local rc="$1"
  log "SUPERVISOR_EXIT rc=${rc}"
  release_lock
}

trap 'on_exit $?' EXIT
trap 'log "SUPERVISOR_SIGNAL INT"; exit 130' INT
trap 'log "SUPERVISOR_SIGNAL TERM"; exit 143' TERM

if ! acquire_lock; then
  log "another supervisor instance is active; exiting"
  exit 0
fi

log "SUPERVISOR_START range=${START_NUM}-${END_NUM} gap=${ATTEMPT_GAP_S}s retry_wait=${RETRY_WAIT_S}s restart_wait=${SUPERVISOR_RESTART_S}s"

while true; do
  if [[ -f "$STOP_FILE" ]]; then
    log "stop file detected (${STOP_FILE}); exiting"
    rm -f "$STOP_FILE"
    break
  fi

  if all_done; then
    log "all outputs present for ${START_NUM}-${END_NUM}; done"
    break
  fi

  log "launching worker"
  START_NUM="$START_NUM" \
  END_NUM="$END_NUM" \
  ATTEMPT_GAP_S="$ATTEMPT_GAP_S" \
  RETRY_WAIT_S="$RETRY_WAIT_S" \
  "$WORKER_SCRIPT"
  rc=$?

  if all_done; then
    log "worker exited rc=${rc}; outputs complete"
    break
  fi

  log "worker exited rc=${rc} before completion; restarting in ${SUPERVISOR_RESTART_S}s"
  sleep "$SUPERVISOR_RESTART_S"
done

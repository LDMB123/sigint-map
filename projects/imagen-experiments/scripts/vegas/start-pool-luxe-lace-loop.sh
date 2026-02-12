#!/usr/bin/env bash
set -euo pipefail

# Convenience wrapper to daemonize the loop with nohup.
#
# Example:
#   ./start-pool-luxe-lace-loop.sh \
#     --output-dir "$HOME/nanobanana-output/pool-luxe-lace-v13-no-nylons" \
#     --input-image "/Users/louisherman/Documents/IMG_4385.jpeg" \
#     --start 40 --end 60 --interval 90

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
LOOP="$SCRIPT_DIR/run-pool-luxe-lace-loop.sh"

PID_FILE="$HOME/pool-luxe-lace-loop.pid"
NOHUP_LOG="$HOME/pool-luxe-lace-loop.nohup.log"

if [[ -f "$PID_FILE" ]]; then
  old_pid="$(cat "$PID_FILE" 2>/dev/null || true)"
  if [[ -n "${old_pid:-}" ]] && kill -0 "$old_pid" 2>/dev/null; then
    echo "Loop already running (pid=$old_pid). Stop it first or delete $PID_FILE." >&2
    exit 1
  fi
fi

nohup "$LOOP" "$@" >>"$NOHUP_LOG" 2>&1 &
pid=$!
echo "$pid" >"$PID_FILE"
echo "Started loop pid=$pid"
echo "nohup log: $NOHUP_LOG"
echo "pid file:  $PID_FILE"


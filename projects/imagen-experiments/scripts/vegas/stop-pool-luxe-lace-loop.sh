#!/usr/bin/env bash
set -euo pipefail

PID_FILE="$HOME/pool-luxe-lace-loop.pid"

if [[ ! -f "$PID_FILE" ]]; then
  echo "No pid file found at $PID_FILE" >&2
  exit 1
fi

pid="$(cat "$PID_FILE" 2>/dev/null || true)"
if [[ -z "${pid:-}" ]]; then
  echo "Empty pid file: $PID_FILE" >&2
  exit 1
fi

if kill -0 "$pid" 2>/dev/null; then
  kill "$pid" 2>/dev/null || true
  echo "Stopped loop pid=$pid"
else
  echo "Loop not running (stale pid=$pid)."
fi

rm -f "$PID_FILE"


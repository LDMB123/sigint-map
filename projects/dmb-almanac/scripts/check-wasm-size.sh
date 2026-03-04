#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WASM_PATH="$ROOT_DIR/rust/static/pkg/dmb_app_bg.wasm"
BASELINE_GZIP="${WASM_GZIP_BASELINE:-}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --wasm)
      WASM_PATH="$2"
      shift 2
      ;;
    --baseline-gzip)
      BASELINE_GZIP="$2"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 2
      ;;
  esac
done

if [[ ! -f "$WASM_PATH" ]]; then
  echo "WASM file not found: $WASM_PATH" >&2
  exit 1
fi

RAW_BYTES="$(wc -c < "$WASM_PATH" | tr -d '[:space:]')"
GZIP_BYTES="$(gzip -c "$WASM_PATH" | wc -c | tr -d '[:space:]')"

echo "wasm path:  $WASM_PATH"
echo "raw bytes:  $RAW_BYTES"
echo "gzip bytes: $GZIP_BYTES"

if [[ -n "$BASELINE_GZIP" ]]; then
  if ! [[ "$BASELINE_GZIP" =~ ^[0-9]+$ ]]; then
    echo "Invalid --baseline-gzip value: $BASELINE_GZIP" >&2
    exit 2
  fi

  TARGET_GZIP="$(( BASELINE_GZIP * 90 / 100 ))"
  echo "baseline gzip bytes: $BASELINE_GZIP"
  echo "target (<=90%):      $TARGET_GZIP"

  if (( GZIP_BYTES > TARGET_GZIP )); then
    echo "FAIL: gzip size gate not met" >&2
    exit 1
  fi

  echo "PASS: gzip size gate met"
fi

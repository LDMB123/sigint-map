#!/usr/bin/env bash
set -euo pipefail

BASELINE_FILE="${RUST_WARNING_BASELINE_FILE:-scripts/qa-baselines/rust-warning-count.txt}"
OUT_FILE="$(mktemp -t rust-warning-drift.XXXXXX.log)"

if [ ! -f "${BASELINE_FILE}" ]; then
  echo "[rust-warning-drift] FAIL: baseline file not found: ${BASELINE_FILE}"
  exit 1
fi

BASELINE_COUNT="$(tr -d '[:space:]' < "${BASELINE_FILE}")"
if ! [[ "${BASELINE_COUNT}" =~ ^[0-9]+$ ]]; then
  echo "[rust-warning-drift] FAIL: invalid baseline value '${BASELINE_COUNT}' in ${BASELINE_FILE}"
  exit 1
fi

echo "[rust-warning-drift] running clippy against baseline ${BASELINE_COUNT}"

if ! cargo clippy --all-targets --all-features -- -W dead_code -W unused -W unreachable_code >"${OUT_FILE}" 2>&1; then
  cat "${OUT_FILE}"
  echo "[rust-warning-drift] FAIL: cargo clippy exited non-zero"
  rm -f "${OUT_FILE}"
  exit 1
fi

WARNING_COUNT="$(awk '/^warning:/{c++} END {print c+0}' "${OUT_FILE}")"
if ! [[ "${WARNING_COUNT}" =~ ^[0-9]+$ ]]; then
  cat "${OUT_FILE}"
  echo "[rust-warning-drift] FAIL: unable to parse warning count '${WARNING_COUNT}'"
  rm -f "${OUT_FILE}"
  exit 1
fi
echo "[rust-warning-drift] warning_count=${WARNING_COUNT}"
echo "[rust-warning-drift] baseline=${BASELINE_COUNT}"

if [ "${WARNING_COUNT}" -gt "${BASELINE_COUNT}" ]; then
  cat "${OUT_FILE}"
  echo "[rust-warning-drift] FAIL: warning count ${WARNING_COUNT} exceeded baseline ${BASELINE_COUNT}"
  rm -f "${OUT_FILE}"
  exit 1
fi

echo "[rust-warning-drift] PASS"
rm -f "${OUT_FILE}"

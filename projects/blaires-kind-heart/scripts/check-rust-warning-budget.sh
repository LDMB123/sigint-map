#!/usr/bin/env bash
set -euo pipefail

MAX_WARNINGS="${RUST_WARNING_BUDGET:-4}"
OUT_FILE="$(mktemp -t rust-warning-budget.XXXXXX.log)"

echo "[rust-warning-budget] running clippy with warning budget ${MAX_WARNINGS}"

if ! cargo clippy --all-targets --all-features -- -W dead_code -W unused -W unreachable_code >"${OUT_FILE}" 2>&1; then
  cat "${OUT_FILE}"
  echo "[rust-warning-budget] FAIL: cargo clippy exited non-zero"
  rm -f "${OUT_FILE}"
  exit 1
fi

WARNING_COUNT="$(rg -c "^warning:" "${OUT_FILE}" || true)"
echo "[rust-warning-budget] warning_count=${WARNING_COUNT}"
echo "[rust-warning-budget] budget=${MAX_WARNINGS}"

if [ "${WARNING_COUNT}" -gt "${MAX_WARNINGS}" ]; then
  cat "${OUT_FILE}"
  echo "[rust-warning-budget] FAIL: warning count ${WARNING_COUNT} exceeds budget ${MAX_WARNINGS}"
  rm -f "${OUT_FILE}"
  exit 1
fi

echo "[rust-warning-budget] PASS"
rm -f "${OUT_FILE}"

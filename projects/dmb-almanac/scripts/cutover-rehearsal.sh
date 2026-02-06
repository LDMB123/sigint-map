#!/usr/bin/env bash
set -euo pipefail

# Cutover rehearsal: run Rust gates + bring up Rust server + run Rust-focused Playwright E2E subset.
#
# Usage:
#   cd /Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac
#   bash scripts/cutover-rehearsal.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
RUST_DIR="${PROJECT_DIR}/rust"
APP_DIR="${PROJECT_DIR}/app"

BASE_URL="${BASE_URL:-http://127.0.0.1:3000}"
RUST_E2E="${RUST_E2E:-1}"

TMP_DIR="${PROJECT_DIR}/.tmp/cutover-rehearsal"
SERVER_LOG="${TMP_DIR}/server.log"
SERVER_PID_FILE="${TMP_DIR}/server.pid"
SQLITE_PATH="${TMP_DIR}/dmb-almanac.db"

mkdir -p "${TMP_DIR}"

on_error() {
  echo "[cutover] failed; last server logs:"
  if [[ -f "${SERVER_LOG}" ]]; then
    tail -n 80 "${SERVER_LOG}" || true
  else
    echo "(no server log at ${SERVER_LOG})"
  fi
}
trap on_error ERR

cleanup() {
  if [[ -f "${SERVER_PID_FILE}" ]]; then
    local pid
    pid="$(cat "${SERVER_PID_FILE}" || true)"
    if [[ -n "${pid}" ]] && kill -0 "${pid}" >/dev/null 2>&1; then
      kill "${pid}" >/dev/null 2>&1 || true
      # Give the process a moment to exit; then hard-kill if needed.
      for _ in $(seq 1 20); do
        if ! kill -0 "${pid}" >/dev/null 2>&1; then
          break
        fi
        sleep 0.1
      done
      kill -9 "${pid}" >/dev/null 2>&1 || true
    fi
    rm -f "${SERVER_PID_FILE}" || true
  fi
}
trap cleanup EXIT INT TERM

echo "[cutover] rust xtask verify"
(cd "${RUST_DIR}" && cargo run -p xtask -- verify)

PKG_JS="${RUST_DIR}/static/pkg/dmb_app.js"
if [[ ! -f "${PKG_JS}" ]]; then
  echo "[cutover] build hydrate pkg (missing ${PKG_JS})"
  (cd "${RUST_DIR}" && cargo run -p xtask -- build-hydrate-pkg)
fi

echo "[cutover] seed rust static/data from legacy bundle"
(cd "${RUST_DIR}" && cargo run -p dmb_pipeline -- build-idb --source-dir ../app/static/data --output-dir static/data)

echo "[cutover] build runtime sqlite (${SQLITE_PATH})"
(cd "${RUST_DIR}" && cargo run -p dmb_pipeline -- build-runtime-db --source-dir static/data --output "${SQLITE_PATH}")

echo "[cutover] rust data-release (strict parity; no SW bump)"
(cd "${RUST_DIR}" && cargo run -p xtask -- data-release --sqlite "${SQLITE_PATH}" --skip-sw-bump)

echo "[cutover] validate data manifest includes ANN index files"
(cd "${RUST_DIR}" && DMB_STATIC_DATA_REQUIRED=1 cargo test -p dmb_app --test manifest_files)

echo "[cutover] start rust server (${BASE_URL})"
(
  cd "${RUST_DIR}"
  cargo build -p dmb_server >/dev/null
  # Run the built binary directly so the PID we capture is the server process.
  DMB_SQLITE_PATH="${SQLITE_PATH}" "${RUST_DIR}/target/debug/dmb_server" >"${SERVER_LOG}" 2>&1 &
  echo "$!" >"${SERVER_PID_FILE}"
)

echo "[cutover] wait for server"
for _ in $(seq 1 80); do
  if curl -fsS "${BASE_URL}/" >/dev/null 2>&1; then
    break
  fi
  sleep 0.25
done
curl -fsS "${BASE_URL}/" >/dev/null

echo "[cutover] ensure app deps (npm ci if needed)"
if [[ ! -d "${APP_DIR}/node_modules" ]]; then
  (cd "${APP_DIR}" && npm ci)
fi

echo "[cutover] run Rust E2E subset"
(cd "${APP_DIR}" && RUST_E2E="${RUST_E2E}" BASE_URL="${BASE_URL}" npm run test:e2e -- \
  tests/e2e/rust-runtime.spec.js \
  tests/e2e/rust-offline.spec.js \
  tests/e2e/rust-search.spec.js \
  tests/e2e/rust-legacy-migration.spec.js \
  tests/e2e/rust-legacy-cache-cleanup.spec.js \
  tests/e2e/rust-sw-update.spec.js \
  tests/e2e/rust-sw-update-multi.spec.js \
  --project=chromium \
  --workers=1)

echo "[cutover] ok"

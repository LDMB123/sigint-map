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
E2E_DIR="${PROJECT_DIR}/e2e"
DATA_SOURCE_DIR="${PROJECT_DIR}/data/static-data"

BASE_URL="${BASE_URL:-http://127.0.0.1:3000}"
RUST_E2E="${RUST_E2E:-1}"

TMP_DIR="${PROJECT_DIR}/.tmp/cutover-rehearsal"
SERVER_LOG="${TMP_DIR}/server.log"
SERVER_PID_FILE="${TMP_DIR}/server.pid"
SQLITE_PATH="${TMP_DIR}/dmb-almanac.db"

mkdir -p "${TMP_DIR}"

derive_site_addr_from_base_url() {
  local url="$1"
  local scheme="http"
  if [[ "${url}" == *"://"* ]]; then
    scheme="${url%%://*}"
  fi

  local no_scheme="${url#*://}"
  local hostport="${no_scheme%%/*}"

  local host=""
  local port=""

  # IPv6 in URLs is typically bracketed: http://[::1]:3000/
  if [[ "${hostport}" == \[*\]*:* ]]; then
    host="${hostport%%]:*}]"
    port="${hostport#*]:}"
  elif [[ "${hostport}" == \[*\]* ]]; then
    host="${hostport}"
    port=""
  else
    host="${hostport%%:*}"
    port="${hostport#*:}"
  fi

  if [[ -z "${host}" ]]; then
    host="127.0.0.1"
  fi

  # No explicit port (hostport == host for non-IPv6, or port empty for IPv6).
  if [[ "${hostport}" == "${host}" ]] || [[ -z "${port}" ]] || [[ "${port}" == "${hostport}" ]]; then
    if [[ "${scheme}" == "https" ]]; then
      port="443"
    else
      port="80"
    fi
  fi

  echo "${host}:${port}"
}

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

echo "[cutover] seed rust static/data from static seed bundle"
(cd "${RUST_DIR}" && cargo run -p dmb_pipeline -- build-idb --source-dir "${DATA_SOURCE_DIR}" --output-dir static/data)

echo "[cutover] build runtime sqlite (${SQLITE_PATH})"
(cd "${RUST_DIR}" && cargo run -p dmb_pipeline -- build-runtime-db --source-dir static/data --output "${SQLITE_PATH}")

echo "[cutover] rust data-release (strict parity; no SW bump)"
(cd "${RUST_DIR}" && cargo run -p xtask -- data-release --sqlite "${SQLITE_PATH}" --skip-sw-bump)

echo "[cutover] validate data manifest includes ANN index files"
(cd "${RUST_DIR}" && DMB_STATIC_DATA_REQUIRED=1 cargo test -p dmb_app --test manifest_files)

echo "[cutover] start rust server (${BASE_URL})"
SITE_ADDR="${DMB_SITE_ADDR:-$(derive_site_addr_from_base_url "${BASE_URL}")}"
(
  cd "${RUST_DIR}"
  cargo build -p dmb_server >/dev/null
  # Run the built binary directly so the PID we capture is the server process.
  DMB_SITE_ADDR="${SITE_ADDR}" DMB_SQLITE_PATH="${SQLITE_PATH}" "${RUST_DIR}/target/debug/dmb_server" >"${SERVER_LOG}" 2>&1 &
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

echo "[cutover] basic PWA asset header checks"
sw_headers="$(curl -fsSI "${BASE_URL}/sw.js" | tr -d '\r' | tr '[:upper:]' '[:lower:]')"
if command -v rg >/dev/null 2>&1; then
  has_sw_ct="$(echo "${sw_headers}" | rg -q "^content-type:.*javascript" && echo 1 || echo 0)"
else
  has_sw_ct="$(echo "${sw_headers}" | grep -qE "^content-type:.*javascript" && echo 1 || echo 0)"
fi
if [[ "${has_sw_ct}" != "1" ]]; then
  echo "[cutover] error: /sw.js missing javascript content-type" >&2
  echo "${sw_headers}" >&2
  exit 1
fi
manifest_headers="$(curl -fsSI "${BASE_URL}/manifest.json" | tr -d '\r' | tr '[:upper:]' '[:lower:]')"
if command -v rg >/dev/null 2>&1; then
  has_manifest_ct="$(echo "${manifest_headers}" | rg -q "^content-type:.*json" && echo 1 || echo 0)"
else
  has_manifest_ct="$(echo "${manifest_headers}" | grep -qE "^content-type:.*json" && echo 1 || echo 0)"
fi
if [[ "${has_manifest_ct}" != "1" ]]; then
  echo "[cutover] error: /manifest.json missing json content-type" >&2
  echo "${manifest_headers}" >&2
  exit 1
fi
offline_headers="$(curl -fsSI "${BASE_URL}/offline.html" | tr -d '\r' | tr '[:upper:]' '[:lower:]')"
if command -v rg >/dev/null 2>&1; then
  has_offline_ct="$(echo "${offline_headers}" | rg -q "^content-type:.*text/html" && echo 1 || echo 0)"
else
  has_offline_ct="$(echo "${offline_headers}" | grep -qE "^content-type:.*text/html" && echo 1 || echo 0)"
fi
if [[ "${has_offline_ct}" != "1" ]]; then
  echo "[cutover] error: /offline.html missing text/html content-type" >&2
  echo "${offline_headers}" >&2
  exit 1
fi

echo "[cutover] ensure app deps (npm ci if needed)"
if [[ ! -d "${E2E_DIR}/node_modules" ]]; then
  (cd "${E2E_DIR}" && npm ci)
fi

echo "[cutover] ensure Playwright Chromium (install if needed)"
(cd "${E2E_DIR}" && npx playwright install --with-deps chromium >/dev/null)

		echo "[cutover] run Rust E2E subset"
		(cd "${E2E_DIR}" && RUST_E2E="${RUST_E2E}" BASE_URL="${BASE_URL}" npm run test:e2e -- \
		  tests/e2e/rust-runtime.spec.js \
		  tests/e2e/rust-offline.spec.js \
		  tests/e2e/rust-import-completes.spec.js \
		  tests/e2e/rust-visual.spec.js \
		  tests/e2e/rust-search.spec.js \
		  tests/e2e/rust-previous-idb-migration.spec.js \
		  tests/e2e/rust-previous-cache-cleanup.spec.js \
		  tests/e2e/rust-idb-repair.spec.js \
		  tests/e2e/rust-parity-report.spec.js \
		  tests/e2e/rust-sw-update.spec.js \
		  tests/e2e/rust-sw-update-multi.spec.js \
		  --project=chromium \
		  --workers=1)

echo "[cutover] ok"

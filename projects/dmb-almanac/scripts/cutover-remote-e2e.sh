#!/usr/bin/env bash
set -euo pipefail

# Run the Rust-focused Playwright E2E subset against an already-running Rust server.
# This is intended for staging/prod-like origins where you do not want the script to
# build DBs or start/stop the server process.
#
# Usage:
#   cd /Users/louisherman/ClaudeCodeProjects/projects/dmb-almanac
#   BASE_URL=https://staging.example.com bash scripts/cutover-remote-e2e.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
E2E_DIR="${PROJECT_DIR}/e2e"

BASE_URL="${BASE_URL:-}"
RUST_E2E="${RUST_E2E:-1}"

if [[ -z "${BASE_URL}" ]]; then
  echo "[cutover-remote] BASE_URL is required (example: https://staging.example.com)" >&2
  exit 2
fi

echo "[cutover-remote] smoke: GET ${BASE_URL}/"
curl -fsS "${BASE_URL}/" >/dev/null

echo "[cutover-remote] check COOP/COEP headers (best effort)"
headers="$(curl -fsSI "${BASE_URL}/" | tr -d '\r' | tr '[:upper:]' '[:lower:]' || true)"
if command -v rg >/dev/null 2>&1; then
  has_coop="$(echo "${headers}" | rg -q "^cross-origin-opener-policy:" && echo 1 || echo 0)"
  has_coep="$(echo "${headers}" | rg -q "^cross-origin-embedder-policy:" && echo 1 || echo 0)"
else
  has_coop="$(echo "${headers}" | grep -qE "^cross-origin-opener-policy:" && echo 1 || echo 0)"
  has_coep="$(echo "${headers}" | grep -qE "^cross-origin-embedder-policy:" && echo 1 || echo 0)"
fi
if [[ "${has_coop}" != "1" ]]; then
  echo "[cutover-remote] warn: missing cross-origin-opener-policy header"
fi
if [[ "${has_coep}" != "1" ]]; then
  echo "[cutover-remote] warn: missing cross-origin-embedder-policy header"
fi

echo "[cutover-remote] ensure app deps (npm ci if needed)"
if [[ ! -d "${E2E_DIR}/node_modules" ]]; then
  (cd "${E2E_DIR}" && npm ci)
fi

echo "[cutover-remote] ensure Playwright Chromium (install if needed)"
(cd "${E2E_DIR}" && npx playwright install --with-deps chromium >/dev/null)

echo "[cutover-remote] run Rust E2E subset against ${BASE_URL}"
(cd "${E2E_DIR}" && RUST_E2E="${RUST_E2E}" BASE_URL="${BASE_URL}" npm run test:e2e -- \
  tests/e2e/rust-runtime.spec.js \
  tests/e2e/rust-offline.spec.js \
  tests/e2e/rust-import-completes.spec.js \
  tests/e2e/rust-search.spec.js \
  tests/e2e/rust-previous-idb-migration.spec.js \
  tests/e2e/rust-previous-cache-cleanup.spec.js \
  tests/e2e/rust-idb-repair.spec.js \
  tests/e2e/rust-parity-report.spec.js \
  tests/e2e/rust-sw-update.spec.js \
  tests/e2e/rust-sw-update-multi.spec.js \
  --project=chromium \
  --workers=1)

echo "[cutover-remote] ok"

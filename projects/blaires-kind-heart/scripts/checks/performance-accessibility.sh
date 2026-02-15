#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="$ROOT_DIR/dist"
REPORT_ROOT="$ROOT_DIR/scripts/reports/perf-a11y-$(date +%Y%m%d-%H%M%S)"
PORT="${1:-4173}"

mkdir -p "$REPORT_ROOT"

if [[ ! -d "$DIST_DIR" || ! -f "$DIST_DIR/index.html" ]]; then
  echo "dist build missing. Running trunk build --release first."
  (cd "$ROOT_DIR" && trunk build --release)
fi

run_lighthouse() {
  local page_path="$1"
  local report_prefix="$2"
  local categories="$3"

  echo "Running Lighthouse on ${page_path} (${categories})"
  if npx -y lighthouse@11.6.0 \
    "${BASE_URL}${page_path}" \
    --output=json --output=html --output-path="${report_prefix}" \
    --disable-full-page-screenshot \
    --max-wait-for-load=15000 \
    --screenEmulation.disabled \
    --throttling-method=provided \
    --chrome-flags='--headless --no-sandbox --disable-gpu --disable-dev-shm-usage' \
    --quiet \
    --only-categories="${categories}"; then
    echo "Lighthouse complete -> ${report_prefix}.report.json/.report.html"
    return 0
  else
    echo "Lighthouse failed for ${page_path}."
    return 1
  fi
}

run_axe() {
  local page_path="$1"
  local report_path="$2"

  echo "Running axe on ${page_path}"
  if npx -y @axe-core/cli "${BASE_URL}${page_path}" \
    --browser chrome \
    --timeout 120 \
    --load-delay 1500 \
    --show-errors \
    --stdout > "${report_path}"; then
    echo "axe complete -> ${report_path}"
    return 0
  else
    echo "axe failed for ${page_path}."
    return 1
  fi
}

cleanup() {
  if [[ -n "${SERVER_PID:-}" ]]; then
    kill "$SERVER_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

BASE_URL="http://127.0.0.1:${PORT}"

cd "$DIST_DIR"
python3 -m http.server "$PORT" >/tmp/blaires-kind-heart-perf-a11y.log 2>&1 &
SERVER_PID=$!
sleep 1

echo "Serving dist at ${BASE_URL}"

run_lighthouse "/offline.html" "${REPORT_ROOT}/lighthouse-offline" "accessibility,best-practices"

if run_axe "/offline.html" "${REPORT_ROOT}/axe-offline.json"; then
  echo "offline accessibility snapshot complete"
else
  echo "offline accessibility snapshot failed"
fi

if ! run_lighthouse "/index.html" "${REPORT_ROOT}/lighthouse-index" "performance,accessibility,best-practices"; then
  echo "Index Lighthouse run is flaky in this environment; use offline report for stable baseline."
fi

if ! run_axe "/index.html" "${REPORT_ROOT}/axe-index.json"; then
  echo "Index axe audit did not complete in automation; captured only offline-page accessibility baseline."
fi

echo "Reports written to ${REPORT_ROOT}"

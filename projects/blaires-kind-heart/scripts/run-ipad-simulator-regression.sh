#!/usr/bin/env bash
set -euo pipefail

# Reproducible iPad simulator visual regression capture.
# Outputs screenshots + HTTP log under docs/archive/assets/simulator-regression/<date>.

DEVICE_NAME="${SIM_DEVICE_NAME:-iPad mini (A17 Pro)}"
PORT="${SIM_SERVE_PORT:-4192}"
DATE_TAG="${1:-$(date +%F)}"
OUT_DIR="docs/archive/assets/simulator-regression/${DATE_TAG}"
BASE_QUERY="?e2e=1&lite=1"

if ! command -v xcrun >/dev/null 2>&1; then
  echo "[sim-regression] xcrun not found. Install Xcode command line tools."
  exit 1
fi

if [ ! -d "dist" ]; then
  echo "[sim-regression] dist/ not found. Build first (e.g. trunk build --release)."
  exit 1
fi

UDID="$(xcrun simctl list devices available | awk -v name="${DEVICE_NAME}" '
  index($0, name) {
    if (match($0, /\(([A-F0-9-]{36})\)/)) {
      print substr($0, RSTART + 1, RLENGTH - 2);
      exit;
    }
  }
')"

if [ -z "${UDID}" ]; then
  echo "[sim-regression] Could not find simulator device: ${DEVICE_NAME}"
  exit 1
fi

HOST_IP="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true)"
if [ -z "${HOST_IP}" ]; then
  echo "[sim-regression] Could not determine host IP (en0/en1)."
  exit 1
fi

mkdir -p "${OUT_DIR}"

echo "[sim-regression] Booting simulator ${DEVICE_NAME} (${UDID})"
open -a Simulator
xcrun simctl boot "${UDID}" >/dev/null 2>&1 || true
xcrun simctl bootstatus "${UDID}" -b

LOG_FILE="${OUT_DIR}/http.log"
python3 -m http.server "${PORT}" --directory dist >"${LOG_FILE}" 2>&1 &
SERVER_PID=$!
cleanup() {
  kill "${SERVER_PID}" >/dev/null 2>&1 || true
}
trap cleanup EXIT

sleep 1
BASE_URL="http://${HOST_IP}:${PORT}/${BASE_QUERY}"

echo "[sim-regression] Capturing home panel"
xcrun simctl openurl "${UDID}" "${BASE_URL}"
sleep 10
xcrun simctl io "${UDID}" screenshot "${OUT_DIR}/home.png" >/dev/null

echo "[sim-regression] Capturing stories panel"
xcrun simctl openurl "${UDID}" "${BASE_URL}#panel-stories"
sleep 4
xcrun simctl io "${UDID}" screenshot "${OUT_DIR}/stories.png" >/dev/null

echo "[sim-regression] Capturing tracker panel"
xcrun simctl openurl "${UDID}" "${BASE_URL}#panel-tracker"
sleep 4
xcrun simctl io "${UDID}" screenshot "${OUT_DIR}/tracker.png" >/dev/null

echo "[sim-regression] Done. Artifacts:"
ls -1 "${OUT_DIR}"

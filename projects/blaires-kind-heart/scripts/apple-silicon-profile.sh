#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="${DIST_DIR:-.verify-dist-release}"
PORT="${PORT:-4173}"
BASE_URL="${BASE_URL:-http://127.0.0.1:${PORT}}"
GPU_MODE="${GPU_MODE:-auto}"
PERF_MODE="${PERF_MODE:-auto}"
RUST_PROFILE="${RUST_PROFILE:-release}"
SYMBOLIZED_RELEASE="${SYMBOLIZED_RELEASE:-1}"
PROFILE_SECONDS="${PROFILE_SECONDS:-20}"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT_DIR="${OUT_DIR:-${ROOT_DIR}/artifacts/apple-silicon-profile/${STAMP}}"
HEALTH_BASE_URL="${BASE_URL%%\#*}"
HEALTH_BASE_URL="${HEALTH_BASE_URL%%\?*}"

log() {
  printf '[apple-silicon-profile] %s\n' "$*"
}

SERVER_PID=""
SERVER_LOG=""

start_server() {
  SERVER_LOG="${OUT_DIR}/server.log"
  python3 -m http.server "${PORT}" --bind 127.0.0.1 --directory "${DIST_DIR}" >"${SERVER_LOG}" 2>&1 &
  SERVER_PID=$!
  sleep 1
  if ! kill -0 "${SERVER_PID}" 2>/dev/null; then
    log "Failed to start local server at ${BASE_URL}"
    tail -n 40 "${SERVER_LOG}" 2>/dev/null || true
    exit 1
  fi
}

stop_server() {
  if [[ -n "${SERVER_PID}" ]]; then
    kill "${SERVER_PID}" 2>/dev/null || true
  fi
}

if [[ "$(uname -s)" != "Darwin" ]]; then
  log "This script targets macOS on Apple Silicon."
  exit 1
fi

case "${GPU_MODE}" in
  auto|on|off) ;;
  *)
    log "Invalid GPU_MODE='${GPU_MODE}', defaulting to auto"
    GPU_MODE="auto"
    ;;
esac

case "${PERF_MODE}" in
  auto|throughput|balanced|quality) ;;
  *)
    log "Invalid PERF_MODE='${PERF_MODE}', defaulting to auto"
    PERF_MODE="auto"
    ;;
esac

if [[ "${BASE_URL}" == *\?* ]]; then
  PROFILE_URL="${BASE_URL}&gpu=${GPU_MODE}&perf=${PERF_MODE}"
else
  PROFILE_URL="${BASE_URL}?gpu=${GPU_MODE}&perf=${PERF_MODE}"
fi

mkdir -p "${OUT_DIR}"

log "Collecting host metadata"
sw_vers > "${OUT_DIR}/os.txt" 2>/dev/null || true
sysctl -n machdep.cpu.brand_string > "${OUT_DIR}/cpu.txt" 2>/dev/null || true
sysctl hw.memsize > "${OUT_DIR}/memory.txt" 2>/dev/null || true
system_profiler SPHardwareDataType > "${OUT_DIR}/hardware.txt" 2>/dev/null || true

log "Building dist -> ${DIST_DIR} (symbolized_release=${SYMBOLIZED_RELEASE})"
cd "${ROOT_DIR}"
DIST_DIR="${DIST_DIR}" RUST_PROFILE="${RUST_PROFILE}" SYMBOLIZED_RELEASE="${SYMBOLIZED_RELEASE}" \
  "${ROOT_DIR}/scripts/build-verify-release.sh" \
  | tee "${OUT_DIR}/build-verify-release.txt"

log "Starting local server at ${BASE_URL}"
start_server
cleanup() {
  stop_server
}
trap cleanup EXIT

log "Profiling URL: ${PROFILE_URL}"
log "GPU mode query enabled: ${GPU_MODE} (runtime sets data-gpu-mode/data-gpu-status)"
log "Perf mode query enabled: ${PERF_MODE} (runtime sets data-perf-mode)"
log "Running PWA health check"
npm run pwa:health -- "${HEALTH_BASE_URL}" | tee "${OUT_DIR}/pwa-health.txt"

if command -v xcrun >/dev/null 2>&1; then
  ANIMATION_TEMPLATE="Core Animation"
  TEMPLATE_LIST="$(xcrun xctrace list templates 2>/dev/null || true)"
  if ! grep -Fxq "Core Animation" <<<"${TEMPLATE_LIST}"; then
    if grep -Fxq "Animation Hitches" <<<"${TEMPLATE_LIST}"; then
      ANIMATION_TEMPLATE="Animation Hitches"
    fi
  fi
  log "Using animation trace template: ${ANIMATION_TEMPLATE}"

  log "Writing xctrace command templates"
  cat > "${OUT_DIR}/xctrace-commands.txt" <<EOF
# Open Safari with the app
open -a Safari "${PROFILE_URL}"

# Optional: run deterministic Safari interaction flow while tracing
scripts/apple-silicon-profile-flow.sh "${PROFILE_URL}" $((PROFILE_SECONDS * 3 + 10)) &
FLOW_PID=\$!

# Record Time Profiler (${PROFILE_SECONDS}s)
xcrun xctrace record --template "Time Profiler" --time-limit ${PROFILE_SECONDS}s --output "${OUT_DIR}/time-profiler.trace" --attach Safari

# Record animation/compositor trace (${PROFILE_SECONDS}s)
xcrun xctrace record --template "${ANIMATION_TEMPLATE}" --time-limit ${PROFILE_SECONDS}s --output "${OUT_DIR}/core-animation.trace" --attach Safari

# Record Metal System Trace (${PROFILE_SECONDS}s)
xcrun xctrace record --template "Metal System Trace" --time-limit ${PROFILE_SECONDS}s --output "${OUT_DIR}/metal-system-trace.trace" --attach Safari

# Wait for scripted interaction flow to complete
wait \$FLOW_PID || true
EOF
fi

log "Profile scaffold complete"
log "Artifacts: ${OUT_DIR}"

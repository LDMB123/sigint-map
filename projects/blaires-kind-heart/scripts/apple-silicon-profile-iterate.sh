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
FLOW_SECONDS="${FLOW_SECONDS:-$((PROFILE_SECONDS + 12))}"
TRACE_TIMEOUT_SECONDS="${TRACE_TIMEOUT_SECONDS:-$((PROFILE_SECONDS + 90))}"
ITERATIONS="${ITERATIONS:-A,B,C}"
HEALTH_RETRIES="${HEALTH_RETRIES:-2}"
OUT_ROOT="${OUT_ROOT:-${ROOT_DIR}/artifacts/apple-silicon-profile}"
TIME_ATTACH_KIND="${TIME_ATTACH_KIND:-safari}"
ANIMATION_ATTACH_KIND="${ANIMATION_ATTACH_KIND:-webkit-webcontent}"
METAL_ATTACH_KIND="${METAL_ATTACH_KIND:-webkit-gpu}"
ATTACH_RESOLVE_RETRIES="${ATTACH_RESOLVE_RETRIES:-5}"
ATTACH_RESOLVE_SLEEP_SECONDS="${ATTACH_RESOLVE_SLEEP_SECONDS:-1}"
HEALTH_BASE_URL="${BASE_URL%%\#*}"
HEALTH_BASE_URL="${HEALTH_BASE_URL%%\?*}"
# shellcheck source=/dev/null
source "${ROOT_DIR}/scripts/lib/apple-silicon-profile-common.sh"

log() {
  printf '[apple-silicon-iterate] %s\n' "$*"
}

SERVER_PID=""
SERVER_LOG="/tmp/apple-silicon-iterate-server.log"

start_server() {
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
    SERVER_PID=""
  fi
}

ensure_server() {
  if [[ -z "${SERVER_PID}" ]] || ! kill -0 "${SERVER_PID}" 2>/dev/null; then
    log "Local server is unavailable; restarting"
    stop_server
    start_server
  fi
}

first_pid_matching() {
  local pattern="$1"
  ps -axo pid=,command= -ww \
    | awk -v pat="${pattern}" '$0 ~ pat && $0 !~ /System\/iOSSupport/ {print $1}' \
    | sort -n \
    | tail -n 1
}

first_child_pid_matching() {
  local parent_pid="$1"
  local pattern="$2"
  ps -axo pid=,ppid=,command= -ww \
    | awk -v p="${parent_pid}" -v pat="${pattern}" '$2 == p && $0 ~ pat && $0 !~ /System\/iOSSupport/ {print $1}' \
    | sort -n \
    | tail -n 1
}

resolve_attach_pid() {
  local attach_kind="$1"
  local try=1
  local safari_pid=""
  local webcontent_pid=""
  local webkit_gpu_pid=""
  local selected_pid=""

  case "${attach_kind}" in
    safari|webkit-webcontent|webkit-gpu) ;;
    *)
      attach_kind="safari"
      ;;
  esac

  while [[ "${try}" -le "${ATTACH_RESOLVE_RETRIES}" ]]; do
    safari_pid="$(first_pid_matching 'Safari.app/Contents/MacOS/Safari' || true)"

    if [[ -n "${safari_pid}" ]]; then
      webcontent_pid="$(first_child_pid_matching "${safari_pid}" 'com\\.apple\\.WebKit\\.WebContent' || true)"
      webkit_gpu_pid="$(first_child_pid_matching "${safari_pid}" 'com\\.apple\\.WebKit\\.GPU' || true)"
    else
      webcontent_pid=""
      webkit_gpu_pid=""
    fi

    if [[ -z "${webcontent_pid}" ]]; then
      webcontent_pid="$(first_pid_matching 'com\\.apple\\.WebKit\\.WebContent' || true)"
    fi
    if [[ -z "${webkit_gpu_pid}" ]]; then
      webkit_gpu_pid="$(first_pid_matching 'com\\.apple\\.WebKit\\.GPU' || true)"
    fi

    case "${attach_kind}" in
      safari)
        selected_pid="${safari_pid}"
        ;;
      webkit-webcontent)
        selected_pid="${webcontent_pid:-${safari_pid}}"
        ;;
      webkit-gpu)
        selected_pid="${webkit_gpu_pid:-${safari_pid}}"
        ;;
    esac

    if [[ -n "${selected_pid}" ]]; then
      echo "${selected_pid}"
      return 0
    fi

    sleep "${ATTACH_RESOLVE_SLEEP_SECONDS}"
    try=$((try + 1))
  done

  return 1
}

resolve_attach_target() {
  local attach_kind="$1"
  local attach_pid=""

  if [[ "${attach_kind}" == "safari" ]]; then
    echo "Safari"
    return 0
  fi

  if attach_pid="$(resolve_attach_pid "${attach_kind}")"; then
    echo "${attach_pid}"
    return 0
  fi

  echo "Safari"
}

if [[ "$(uname -s)" != "Darwin" ]]; then
  log "This script targets macOS on Apple Silicon."
  exit 1
fi

mode_resolution="$(resolve_modes_or_default "${GPU_MODE}" "${PERF_MODE}")"
IFS='|' read -r GPU_MODE PERF_MODE <<< "${mode_resolution}"

PROFILE_URL="$(profile_url_with_modes "${BASE_URL}" "${GPU_MODE}" "${PERF_MODE}")"

mkdir -p "${OUT_ROOT}"

log "Building dist -> ${DIST_DIR} (symbolized_release=${SYMBOLIZED_RELEASE})"
cd "${ROOT_DIR}"
DIST_DIR="${DIST_DIR}" RUST_PROFILE="${RUST_PROFILE}" SYMBOLIZED_RELEASE="${SYMBOLIZED_RELEASE}" \
  "${ROOT_DIR}/scripts/build-verify-release.sh" \
  | tee "${OUT_ROOT}/build-verify-release.txt"

log "Starting local server at ${BASE_URL}"
start_server

cleanup() {
  stop_server
}
trap cleanup EXIT

ANIMATION_TEMPLATE="Core Animation"
TEMPLATE_LIST="$(xcrun xctrace list templates 2>/dev/null || true)"
HAS_CORE_ANIMATION=0
if grep -Fxq "Core Animation" <<<"${TEMPLATE_LIST}"; then
  HAS_CORE_ANIMATION=1
fi
if ! grep -Fxq "Core Animation" <<<"${TEMPLATE_LIST}"; then
  if grep -Fxq "Animation Hitches" <<<"${TEMPLATE_LIST}"; then
    ANIMATION_TEMPLATE="Animation Hitches"
  fi
fi
log "Using animation template: ${ANIMATION_TEMPLATE}"
log "Profiling URL: ${PROFILE_URL}"
log "GPU mode query enabled: ${GPU_MODE} (runtime sets data-gpu-mode/data-gpu-status)"
log "Perf mode query enabled: ${PERF_MODE} (runtime sets data-perf-mode)"
log "Attach strategy: time=${TIME_ATTACH_KIND}, animation=${ANIMATION_ATTACH_KIND}, metal=${METAL_ATTACH_KIND}"

run_with_timeout() {
  local limit="$1"
  shift

  "$@" &
  local cmd_pid=$!
  (
    sleep "${limit}"
    if kill -0 "${cmd_pid}" 2>/dev/null; then
      kill -TERM "${cmd_pid}" 2>/dev/null || true
      sleep 3
      kill -KILL "${cmd_pid}" 2>/dev/null || true
    fi
  ) &
  local killer_pid=$!
  local status=0
  wait "${cmd_pid}" || status=$?
  kill "${killer_pid}" 2>/dev/null || true
  return "${status}"
}

count_rows() {
  local trace_file="$1"
  local schema="$2"
  local rows=""
  rows="$(xcrun xctrace export --input "${trace_file}" --xpath "/trace-toc/run[@number='1']/data/table[@schema='${schema}']" 2>/dev/null | rg -c "<row>" || true)"
  if [[ -z "${rows}" ]]; then
    rows="0"
  fi
  echo "${rows}"
}

extract_duration() {
  local toc_file="$1"
  rg -o "<duration>[0-9.]+" "${toc_file}" | head -n1 | sed 's/<duration>//'
}

run_health_with_retries() {
  local out_dir="$1"
  local attempts=$((HEALTH_RETRIES + 1))
  local i=1
  local ok=0

  while [[ "${i}" -le "${attempts}" ]]; do
    ensure_server
    local attempt_file="${out_dir}/pwa-health.attempt${i}.txt"
    if npm run pwa:health -- "${HEALTH_BASE_URL}" >"${attempt_file}" 2>&1; then
      ok=1
      cp "${attempt_file}" "${out_dir}/pwa-health.txt"
      break
    fi
    if rg -q "ERR_CONNECTION_REFUSED" "${attempt_file}"; then
      log "pwa:health saw connection refusal; restarting local server"
      stop_server
      start_server
    fi
    i=$((i + 1))
  done

  if [[ "${ok}" -eq 0 ]]; then
    cp "${out_dir}/pwa-health.attempt${attempts}.txt" "${out_dir}/pwa-health.txt" || true
  fi

  echo "${ok}"
}

record_trace() {
  local out_dir="$1"
  local template="$2"
  local trace_name="$3"
  local attach_kind="$4"
  local flow_pid=""
  local trace_status=0
  local attach_target=""

  "${ROOT_DIR}/scripts/apple-silicon-profile-flow.sh" "${PROFILE_URL}" "${FLOW_SECONDS}" >/dev/null 2>&1 &
  flow_pid=$!

  attach_target="$(resolve_attach_target "${attach_kind}")"
  log "Trace attach target (${trace_name}): ${attach_kind} -> ${attach_target}"

  if run_with_timeout "${TRACE_TIMEOUT_SECONDS}" xcrun xctrace record --template "${template}" --time-limit "${PROFILE_SECONDS}s" --output "${out_dir}/${trace_name}" --attach "${attach_target}"; then
    :
  else
    trace_status=$?
    log "Trace command failed: ${trace_name} (template=${template}, exit=${trace_status})"
    if [[ "${attach_target}" != "Safari" ]]; then
      log "Retrying ${trace_name} with Safari fallback attach"
      rm -rf "${out_dir:?}/${trace_name}"
      if run_with_timeout "${TRACE_TIMEOUT_SECONDS}" xcrun xctrace record --template "${template}" --time-limit "${PROFILE_SECONDS}s" --output "${out_dir}/${trace_name}" --attach "Safari"; then
        trace_status=0
      else
        trace_status=$?
        log "Fallback trace command failed: ${trace_name} (template=${template}, exit=${trace_status})"
      fi
    fi
  fi

  wait "${flow_pid}" 2>/dev/null || true
  return "${trace_status}"
}

IFS=',' read -r -a LABELS <<<"${ITERATIONS}"
RUN_DIRS=()

for raw_label in "${LABELS[@]}"; do
  label="$(echo "${raw_label}" | tr -d '[:space:]')"
  [[ -z "${label}" ]] && continue

  stamp="$(date +%Y%m%d-%H%M%S)"
  out_dir="${OUT_ROOT}/${stamp}-${label}"
  RUN_DIRS+=("${out_dir}")
  mkdir -p "${out_dir}"

  log "Iteration ${label} -> ${out_dir}"

  sw_vers >"${out_dir}/os.txt" 2>/dev/null || true
  sysctl -n machdep.cpu.brand_string >"${out_dir}/cpu.txt" 2>/dev/null || true
  sysctl hw.memsize >"${out_dir}/memory.txt" 2>/dev/null || true
  system_profiler SPHardwareDataType >"${out_dir}/hardware.txt" 2>/dev/null || true

  ensure_server
  health_ok="$(run_health_with_retries "${out_dir}")"
  log "pwa:health status for ${label}: ${health_ok}"

  open -a Safari "${PROFILE_URL}" >/dev/null 2>&1 || true
  sleep 1

  record_trace "${out_dir}" "Time Profiler" "time-profiler.trace" "${TIME_ATTACH_KIND}"
  if ! record_trace "${out_dir}" "${ANIMATION_TEMPLATE}" "core-animation.trace" "${ANIMATION_ATTACH_KIND}"; then
    if [[ "${ANIMATION_TEMPLATE}" != "Core Animation" && "${HAS_CORE_ANIMATION}" -eq 1 ]]; then
      log "Retrying animation trace with Core Animation fallback"
      record_trace "${out_dir}" "Core Animation" "core-animation.trace" "${ANIMATION_ATTACH_KIND}" || true
    fi
  fi
  record_trace "${out_dir}" "Metal System Trace" "metal-system-trace.trace" "${METAL_ATTACH_KIND}"

  xcrun xctrace export --input "${out_dir}/time-profiler.trace" --toc --output "${out_dir}/time-profiler.toc.xml" >/dev/null 2>&1 || true
  xcrun xctrace export --input "${out_dir}/core-animation.trace" --toc --output "${out_dir}/core-animation.toc.xml" >/dev/null 2>&1 || true
  xcrun xctrace export --input "${out_dir}/metal-system-trace.trace" --toc --output "${out_dir}/metal-system-trace.toc.xml" >/dev/null 2>&1 || true

  time_duration="$(extract_duration "${out_dir}/time-profiler.toc.xml" || true)"
  anim_duration="$(extract_duration "${out_dir}/core-animation.toc.xml" || true)"
  metal_duration="$(extract_duration "${out_dir}/metal-system-trace.toc.xml" || true)"

  hitches_gpu="$(count_rows "${out_dir}/core-animation.trace" "hitches-gpu")"
  anim_hangs="$(count_rows "${out_dir}/core-animation.trace" "potential-hangs")"
  anim_vsyncs="$(count_rows "${out_dir}/core-animation.trace" "display-vsyncs-interval")"
  metal_errors="$(count_rows "${out_dir}/metal-system-trace.trace" "metal-command-buffer-error")"
  metal_hangs="$(count_rows "${out_dir}/metal-system-trace.trace" "potential-hangs")"
  metal_vsyncs="$(count_rows "${out_dir}/metal-system-trace.trace" "display-vsyncs-interval")"
  perf_states="$(count_rows "${out_dir}/metal-system-trace.trace" "gpu-performance-state-intervals")"

  cat >"${out_dir}/metrics.env" <<EOF
iteration=${label}
health_ok=${health_ok}
time_duration=${time_duration}
anim_duration=${anim_duration}
metal_duration=${metal_duration}
hitches_gpu=${hitches_gpu}
anim_potential_hangs=${anim_hangs}
anim_display_vsyncs=${anim_vsyncs}
metal_command_buffer_error=${metal_errors}
metal_potential_hangs=${metal_hangs}
metal_display_vsyncs=${metal_vsyncs}
metal_gpu_performance_state_intervals=${perf_states}
EOF
done

summary_file="${OUT_ROOT}/abc-summary-$(date +%Y%m%d-%H%M%S).csv"
echo "iteration,health_ok,time_duration,anim_duration,metal_duration,hitches_gpu,anim_potential_hangs,anim_display_vsyncs,metal_command_buffer_error,metal_potential_hangs,metal_display_vsyncs,metal_gpu_performance_state_intervals,artifact_dir" >"${summary_file}"

for out_dir in "${RUN_DIRS[@]}"; do
  metrics_file="${out_dir}/metrics.env"
  iteration="$(rg '^iteration=' "${metrics_file}" | cut -d'=' -f2)"
  health_ok="$(rg '^health_ok=' "${metrics_file}" | cut -d'=' -f2)"
  time_duration="$(rg '^time_duration=' "${metrics_file}" | cut -d'=' -f2)"
  anim_duration="$(rg '^anim_duration=' "${metrics_file}" | cut -d'=' -f2)"
  metal_duration="$(rg '^metal_duration=' "${metrics_file}" | cut -d'=' -f2)"
  hitches_gpu="$(rg '^hitches_gpu=' "${metrics_file}" | cut -d'=' -f2)"
  anim_potential_hangs="$(rg '^anim_potential_hangs=' "${metrics_file}" | cut -d'=' -f2)"
  anim_display_vsyncs="$(rg '^anim_display_vsyncs=' "${metrics_file}" | cut -d'=' -f2)"
  metal_command_buffer_error="$(rg '^metal_command_buffer_error=' "${metrics_file}" | cut -d'=' -f2)"
  metal_potential_hangs="$(rg '^metal_potential_hangs=' "${metrics_file}" | cut -d'=' -f2)"
  metal_display_vsyncs="$(rg '^metal_display_vsyncs=' "${metrics_file}" | cut -d'=' -f2)"
  metal_gpu_performance_state_intervals="$(rg '^metal_gpu_performance_state_intervals=' "${metrics_file}" | cut -d'=' -f2)"
  echo "${iteration},${health_ok},${time_duration},${anim_duration},${metal_duration},${hitches_gpu},${anim_potential_hangs},${anim_display_vsyncs},${metal_command_buffer_error},${metal_potential_hangs},${metal_display_vsyncs},${metal_gpu_performance_state_intervals},${out_dir}" >>"${summary_file}"
done

log "Completed iterations: ${ITERATIONS}"
log "Summary: ${summary_file}"

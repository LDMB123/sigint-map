#!/usr/bin/env bash

validate_gpu_mode() {
  local mode="${1:-auto}"
  case "${mode}" in
    auto|on|off)
      printf '%s\n' "${mode}"
      ;;
    *)
      printf 'auto\n'
      return 1
      ;;
  esac
}

validate_perf_mode() {
  local mode="${1:-auto}"
  case "${mode}" in
    auto|throughput|balanced|quality)
      printf '%s\n' "${mode}"
      ;;
    *)
      printf 'auto\n'
      return 1
      ;;
  esac
}

profile_url_with_modes() {
  local base_url="$1"
  local gpu_mode="$2"
  local perf_mode="$3"

  if [[ "${base_url}" == *\?* ]]; then
    printf '%s&gpu=%s&perf=%s\n' "${base_url}" "${gpu_mode}" "${perf_mode}"
  else
    printf '%s?gpu=%s&perf=%s\n' "${base_url}" "${gpu_mode}" "${perf_mode}"
  fi
}

normalize_profile_modes() {
  local raw_gpu_mode="${1:-auto}"
  local raw_perf_mode="${2:-auto}"
  local normalized_gpu_mode=""
  local normalized_perf_mode=""
  local gpu_invalid=0
  local perf_invalid=0

  normalized_gpu_mode="$(validate_gpu_mode "${raw_gpu_mode}" || true)"
  normalized_perf_mode="$(validate_perf_mode "${raw_perf_mode}" || true)"

  if [[ "${normalized_gpu_mode}" != "${raw_gpu_mode}" ]]; then
    gpu_invalid=1
  fi
  if [[ "${normalized_perf_mode}" != "${raw_perf_mode}" ]]; then
    perf_invalid=1
  fi

  printf '%s|%s|%s|%s\n' "${normalized_gpu_mode}" "${normalized_perf_mode}" "${gpu_invalid}" "${perf_invalid}"
}

resolve_modes_or_default() {
  local raw_gpu_mode="${1:-auto}"
  local raw_perf_mode="${2:-auto}"
  local mode_resolution=""
  local normalized_gpu_mode=""
  local normalized_perf_mode=""
  local gpu_invalid=0
  local perf_invalid=0

  mode_resolution="$(normalize_profile_modes "${raw_gpu_mode}" "${raw_perf_mode}")"
  IFS='|' read -r normalized_gpu_mode normalized_perf_mode gpu_invalid perf_invalid <<< "${mode_resolution}"

  if [[ "${gpu_invalid}" == "1" ]]; then
    if declare -F log >/dev/null 2>&1; then
      log "Invalid GPU_MODE='${raw_gpu_mode}', defaulting to auto"
    else
      printf "Invalid GPU_MODE='%s', defaulting to auto\n" "${raw_gpu_mode}" >&2
    fi
  fi

  if [[ "${perf_invalid}" == "1" ]]; then
    if declare -F log >/dev/null 2>&1; then
      log "Invalid PERF_MODE='${raw_perf_mode}', defaulting to auto"
    else
      printf "Invalid PERF_MODE='%s', defaulting to auto\n" "${raw_perf_mode}" >&2
    fi
  fi

  printf '%s|%s\n' "${normalized_gpu_mode}" "${normalized_perf_mode}"
}

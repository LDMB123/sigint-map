#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="${DIST_DIR:-dist}"
RUST_PROFILE="${RUST_PROFILE:-release}"
SYMBOLIZED_RELEASE="${SYMBOLIZED_RELEASE:-1}"
SOURCE_MAP_MODE="${SOURCE_MAP_MODE:-linked}"

log() {
  printf '[build-verify-release] %s\n' "$*"
}

cd "${ROOT_DIR}"

if [[ "${RUST_PROFILE}" != "release" ]]; then
  log "Trunk only supports the release toggle; ignoring RUST_PROFILE='${RUST_PROFILE}'"
fi

if [[ -z "${DIST_DIR}" || "${DIST_DIR}" == "/" || "${DIST_DIR}" == "." ]]; then
  log "Refusing to clean unsafe DIST_DIR='${DIST_DIR}'"
  exit 1
fi

if [[ -d "${DIST_DIR}" ]]; then
  log "Cleaning existing dist directory '${DIST_DIR}' to avoid stale artifacts"
  rm -rf "${DIST_DIR}"
fi

if [[ "${SYMBOLIZED_RELEASE}" == "1" ]]; then
  log "Building symbolized release dist='${DIST_DIR}' (debug info + no strip)"
  CARGO_PROFILE_RELEASE_DEBUG=2 CARGO_PROFILE_RELEASE_STRIP=none NO_COLOR=false \
    trunk build --release --dist "${DIST_DIR}"
else
  log "Building release dist='${DIST_DIR}'"
  NO_COLOR=false trunk build --release --dist "${DIST_DIR}"
fi

log "Retaining source maps in ${DIST_DIR} (mode=${SOURCE_MAP_MODE})"
SOURCE_MAP_MODE="${SOURCE_MAP_MODE}" node scripts/retain-source-maps.mjs "${DIST_DIR}"

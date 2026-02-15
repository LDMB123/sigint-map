#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

log() {
  printf '[clean-workspace] %s\n' "$*"
}

remove_dir() {
  local path="$1"
  if [[ -d "${path}" ]]; then
    log "Removing ${path}"
    rm -rf "${path}"
  fi
}

cd "${ROOT_DIR}"

remove_dir "dist"
remove_dir ".e2e-dist"
remove_dir ".pwa-diag-dist"
remove_dir ".sw-check-dist"
remove_dir ".verify-dist"
remove_dir ".verify-dist-ci"
remove_dir ".verify-dist-open"
remove_dir ".verify-dist-release"
remove_dir "playwright-report"
remove_dir "test-results"
remove_dir "artifacts/playwright"
remove_dir "artifacts/simulator-regression"

log "Running cargo clean"
cargo clean

log "Workspace cleanup complete"

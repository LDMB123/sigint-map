#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

DRY_RUN=0
INCLUDE_GENERATED_DATA=0

for arg in "$@"; do
  case "$arg" in
    --dry-run)
      DRY_RUN=1
      ;;
    --include-generated-data)
      INCLUDE_GENERATED_DATA=1
      ;;
    *)
      echo "unknown option: $arg" >&2
      echo "usage: bash scripts/clean-workspace.sh [--dry-run] [--include-generated-data]" >&2
      exit 2
      ;;
  esac
done

remove_path() {
  local path="$1"
  if [[ ! -e "$path" ]]; then
    return
  fi
  if [[ $DRY_RUN -eq 1 ]]; then
    echo "would remove: $path"
    return
  fi
  rm -rf "$path"
  echo "removed: $path"
}

echo "clean-workspace: removing runtime/build artifacts"
remove_path ".tmp"
remove_path ".tmp_dmb_server.log"
remove_path ".tmp_dmb_server.pid"
remove_path "firebase-debug.log"
remove_path "e2e/playwright-report"
remove_path "e2e/test-results"
remove_path "rust/target"
remove_path "rust/static/pkg"

if [[ $INCLUDE_GENERATED_DATA -eq 1 ]]; then
  echo "clean-workspace: removing generated data duplicates"
  remove_path "rust/static/data"
  remove_path "rust/data/raw"
  remove_path "rust/data/dmb-almanac.db"
  remove_path "rust/data/dmb-almanac.db-shm"
  remove_path "rust/data/dmb-almanac.db-wal"
fi

echo "clean-workspace: complete"

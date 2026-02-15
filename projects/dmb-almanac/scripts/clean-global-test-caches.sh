#!/usr/bin/env bash
set -euo pipefail

DRY_RUN=0

for arg in "$@"; do
  case "$arg" in
    --dry-run)
      DRY_RUN=1
      ;;
    *)
      echo "unknown option: $arg" >&2
      echo "usage: bash scripts/clean-global-test-caches.sh [--dry-run]" >&2
      exit 2
      ;;
  esac
done

remove_dir_contents() {
  local path="$1"
  if [[ ! -d "$path" ]]; then
    return
  fi

  if [[ $DRY_RUN -eq 1 ]]; then
    local size
    size="$(du -sh "$path" 2>/dev/null | awk '{print $1}')"
    echo "would clear: $path (${size:-unknown})"
    return
  fi

  find "$path" -mindepth 1 -delete 2>/dev/null || true
  rmdir "$path" 2>/dev/null || true
  echo "cleared: $path"
}

echo "clean-global-test-caches: removing global browser/test caches"
remove_dir_contents "$HOME/Library/Caches/ms-playwright"
remove_dir_contents "$HOME/Library/Caches/playwright"
remove_dir_contents "$HOME/.cache/ms-playwright"
remove_dir_contents "$HOME/Library/Caches/Cypress"
echo "clean-global-test-caches: complete"

#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENFORCE=0

# Full release/cutover rehearsals can exceed 75 GiB in `rust/target`
# once debug + release + wasm + test artifacts are present.
TARGET_BUDGET_GB="${TARGET_BUDGET_GB:-80}"
RUST_TMP_BUDGET_GB="${RUST_TMP_BUDGET_GB:-1}"
PLAYWRIGHT_CACHE_BUDGET_GB="${PLAYWRIGHT_CACHE_BUDGET_GB:-5}"
# Keep project-root budget above rust-target by default so aggregate checks are coherent.
PROJECT_BUDGET_GB="${PROJECT_BUDGET_GB:-$((TARGET_BUDGET_GB + 10))}"

for arg in "$@"; do
  case "$arg" in
    --enforce)
      ENFORCE=1
      ;;
    *)
      echo "unknown option: $arg" >&2
      echo "usage: bash scripts/check-disk-budget.sh [--enforce]" >&2
      exit 2
      ;;
  esac
done

bytes_for_dir() {
  local dir="$1"
  if [[ ! -e "$dir" ]]; then
    echo 0
    return
  fi
  du -sk "$dir" 2>/dev/null | awk '{print $1 * 1024}'
}

human_size() {
  local bytes="$1"
  if command -v numfmt >/dev/null 2>&1; then
    numfmt --to=iec-i --suffix=B "$bytes"
  else
    python3 - "$bytes" <<'PY'
import sys
n = int(sys.argv[1])
units = ["B","KiB","MiB","GiB","TiB"]
u = 0
while n >= 1024 and u < len(units)-1:
    n /= 1024.0
    u += 1
print(f"{n:.1f}{units[u]}")
PY
  fi
}

budget_exceeded=0

check_budget() {
  local label="$1"
  local path="$2"
  local budget_gb="$3"
  local bytes budget_bytes
  bytes="$(bytes_for_dir "$path")"
  budget_bytes=$((budget_gb * 1024 * 1024 * 1024))

  local status="OK"
  if (( bytes > budget_bytes )); then
    status="OVER"
    budget_exceeded=1
  fi

  printf '%-28s %-5s size=%-10s budget=%sGiB path=%s\n' \
    "$label" "$status" "$(human_size "$bytes")" "$budget_gb" "$path"
}

echo "check-disk-budget: scanning local + global caches"
check_budget "project-root" "$ROOT_DIR" "$PROJECT_BUDGET_GB"
check_budget "rust-target" "$ROOT_DIR/rust/target" "$TARGET_BUDGET_GB"
check_budget "rust-tmp" "$ROOT_DIR/rust/.tmp" "$RUST_TMP_BUDGET_GB"
check_budget "playwright-cache" "$HOME/Library/Caches/ms-playwright" "$PLAYWRIGHT_CACHE_BUDGET_GB"

if (( budget_exceeded == 1 )); then
  echo
  echo "One or more budgets exceeded."
  echo "Recommended:"
  echo "  bash scripts/clean-workspace.sh"
  echo "  bash scripts/clean-global-test-caches.sh"
  if (( ENFORCE == 1 )); then
    exit 1
  fi
fi

echo "check-disk-budget: complete"

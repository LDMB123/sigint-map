#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

FAIL=0

check_tracked_forbidden() {
  local pattern="$1"
  local label="$2"
  if git ls-files -- "$pattern" | grep -q .; then
    echo "repo-hygiene: error: tracked files found in ${label} (${pattern})"
    git ls-files -- "$pattern" | sed 's/^/  - /'
    FAIL=1
  fi
}

check_required_file() {
  local path="$1"
  if [[ ! -f "$path" ]]; then
    echo "repo-hygiene: error: required file missing: $path"
    FAIL=1
  fi
}

check_missing_legacy_root_file() {
  local path="$1"
  if [[ -e "$path" ]]; then
    echo "repo-hygiene: error: legacy root file should be archived, found: $path"
    FAIL=1
  fi
}

check_unexpected_root_markdown() {
  while IFS= read -r path; do
    local name
    name="$(basename "$path")"
    case "$name" in
      README.md|CONTRIBUTING.md|CLAUDE.md|CONTEXT.md|STATUS.md)
        ;;
      *)
        echo "repo-hygiene: error: unexpected root markdown file: $name"
        FAIL=1
        ;;
    esac
  done < <(find . -maxdepth 1 -type f -name '*.md' | sort)
}

echo "repo-hygiene: checking tracked generated-artifact paths"
check_tracked_forbidden "rust/static/data/**" "generated static data"
check_tracked_forbidden "rust/data/raw/**" "pipeline raw data"
check_tracked_forbidden "rust/target/**" "Rust target artifacts"
check_tracked_forbidden "e2e/node_modules/**" "E2E node_modules"
check_tracked_forbidden "e2e/playwright-report/**" "Playwright report artifacts"
check_tracked_forbidden "e2e/test-results/**" "Playwright test-results artifacts"

echo "repo-hygiene: checking root-level legacy documentation clutter"
check_missing_legacy_root_file "JSDOC_EXTRACTION_CHECKLIST.md"
check_missing_legacy_root_file "JSDOC_EXTRACTION_INDEX.md"
check_missing_legacy_root_file "JSDOC_EXTRACTION_SUMMARY.md"

echo "repo-hygiene: checking expected top-level documentation files"
check_required_file "data/README.md"
check_required_file "e2e/README.md"

echo "repo-hygiene: checking for unexpected root markdown files"
check_unexpected_root_markdown

if [[ $FAIL -ne 0 ]]; then
  echo "repo-hygiene: FAILED"
  exit 1
fi

echo "repo-hygiene: ok"

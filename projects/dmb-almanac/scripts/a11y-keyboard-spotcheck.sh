#!/usr/bin/env bash
set -euo pipefail

# Generate a manual keyboard-only accessibility spot-check template.
#
# Usage:
#   bash scripts/a11y-keyboard-spotcheck.sh
#   bash scripts/a11y-keyboard-spotcheck.sh --base-url http://127.0.0.1:3000 --operator "Your Name"
#   bash scripts/a11y-keyboard-spotcheck.sh --output docs/reports/QUALITY/A11Y_KEYBOARD_SPOTCHECK_2026-02-15.md --force

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

BASE_URL="${BASE_URL:-http://127.0.0.1:3000}"
OPERATOR="${OPERATOR:-${USER:-unknown}}"
DATE_STAMP="$(date +%F)"
TIME_STAMP="$(date +%H:%M:%S)"
OUTPUT="${PROJECT_DIR}/docs/reports/QUALITY/A11Y_KEYBOARD_SPOTCHECK_${DATE_STAMP}.md"
FORCE=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --base-url)
      BASE_URL="${2:-}"
      shift 2
      ;;
    --operator)
      OPERATOR="${2:-}"
      shift 2
      ;;
    --output)
      OUTPUT="${PROJECT_DIR}/${2:-}"
      shift 2
      ;;
    --force)
      FORCE=1
      shift
      ;;
    --help|-h)
      cat <<'EOF'
Usage:
  bash scripts/a11y-keyboard-spotcheck.sh [options]

Options:
  --base-url <url>   Base URL to spot-check (default: http://127.0.0.1:3000)
  --operator <name>  Tester/operator name
  --output <path>    Output markdown path (repo-relative)
  --force            Overwrite output if it exists
  --help             Show this help
EOF
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

mkdir -p "$(dirname "${OUTPUT}")"

if [[ -f "${OUTPUT}" ]] && [[ "${FORCE}" -ne 1 ]]; then
  echo "Output exists: ${OUTPUT}" >&2
  echo "Use --force to overwrite or --output to choose a new file." >&2
  exit 1
fi

ROUTES=(
  "/"
  "/shows"
  "/songs"
  "/venues"
  "/guests"
  "/tours"
  "/releases"
  "/stats"
  "/search"
  "/visualizations"
)

REACHABLE="UNKNOWN"
if command -v curl >/dev/null 2>&1; then
  if curl -fsS "${BASE_URL}/" >/dev/null 2>&1; then
    REACHABLE="YES"
  else
    REACHABLE="NO"
  fi
fi

{
  echo "# A11y Keyboard Spot-Check (${DATE_STAMP})"
  echo
  echo "Generated: ${DATE_STAMP} ${TIME_STAMP}"
  echo "Operator: ${OPERATOR}"
  echo "Base URL: ${BASE_URL}"
  echo "Reachable: ${REACHABLE}"
  echo
  echo "## Global Checks"
  echo
  echo "- [ ] Skip-link is visible on first Tab and moves focus to main content."
  echo "- [ ] Focus ring is visible for interactive controls."
  echo "- [ ] No keyboard trap on tested routes."
  echo "- [ ] Enter/Space activates actionable controls."
  echo "- [ ] Shift+Tab reverse navigation works predictably."
  echo
  echo "## Route Matrix"
  echo
  echo "| Route | Keyboard Path | Skip-Link | Focus Visibility | Focus Order | No Trap | Result | Notes |"
  echo "|---|---|---|---|---|---|---|---|"

  for route in "${ROUTES[@]}"; do
    echo "| \`${route}\` | Tab -> main controls -> footer | PASS/FAIL | PASS/FAIL | PASS/FAIL | PASS/FAIL | PASS/FAIL | |"
  done

  echo
  echo "## Findings"
  echo
  echo "- Critical:"
  echo "- Major:"
  echo "- Minor:"
  echo
  echo "## Follow-ups"
  echo
  echo "1. "
  echo "2. "
  echo
  echo "## Sign-off"
  echo
  echo "- [ ] Manual keyboard-only spot-check completed."
  echo "- [ ] Failures triaged and linked."
  echo "- [ ] Report attached to release gate."
} > "${OUTPUT}"

echo "Created ${OUTPUT}"

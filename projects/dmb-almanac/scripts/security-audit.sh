#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Temporary advisory disposition:
# - ID: RUSTSEC-2024-0436 (paste unmaintained)
# - Owner: dmb-core-engineering
# - Review by: 2026-06-30
ALLOWED_ADVISORY_ID="${ALLOWED_ADVISORY_ID:-RUSTSEC-2024-0436}"
ALLOWED_UNTIL="${ALLOWED_UNTIL:-2026-06-30}"
ALLOWED_OWNER="${ALLOWED_OWNER:-dmb-core-engineering}"

TODAY="$(date +%F)"
if [[ "${TODAY}" > "${ALLOWED_UNTIL}" ]]; then
  echo "security-audit: advisory allow expired (${ALLOWED_ADVISORY_ID}, owner=${ALLOWED_OWNER}, review-by=${ALLOWED_UNTIL})" >&2
  exit 1
fi

echo "security-audit: running cargo audit with temporary advisory allow"
echo "security-audit: allow ${ALLOWED_ADVISORY_ID} (owner=${ALLOWED_OWNER}, review-by=${ALLOWED_UNTIL})"
(
  cd "${ROOT_DIR}/rust"
  cargo audit -D warnings --ignore "${ALLOWED_ADVISORY_ID}"
)

echo "security-audit: ok"

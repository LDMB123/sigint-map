#!/usr/bin/env bash
set -euo pipefail

: "${ADMIN_API_TOKEN:?ADMIN_API_TOKEN must be set}"

BASE_URL="${BASE_URL:-http://127.0.0.1:8000}"

curl \
  --fail \
  --show-error \
  --silent \
  --header "Authorization: Bearer ${ADMIN_API_TOKEN}" \
  --request POST \
  "${BASE_URL}/api/sync"

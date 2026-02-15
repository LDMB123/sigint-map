#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
REPORT_ROOT="${ROOT_DIR}/scripts/reports"
STAMP="$(date +%Y%m%d-%H%M%S)"
REPORT_PATH="${1:-${REPORT_ROOT}/audit-baseline-${STAMP}.md}"
MAX_LINES="${MAX_LINES:-200}"

mkdir -p "$(dirname "${REPORT_PATH}")"

RG_EXCLUDES=(
  --hidden
  --glob '!.git/**'
  --glob '!artifacts/**'
  --glob '!.e2e-dist/**'
  --glob '!.pwa-diag-dist/**'
  --glob '!.sw-check-dist/**'
  --glob '!.verify-dist/**'
  --glob '!.verify-dist-ci/**'
  --glob '!.verify-dist-open/**'
  --glob '!.verify-dist-release/**'
  --glob '!target/**'
  --glob '!node_modules/**'
  --glob '!dist/**'
)

AUDIT_PATHS=(
  "${ROOT_DIR}/rust"
  "${ROOT_DIR}/public"
  "${ROOT_DIR}/src"
  "${ROOT_DIR}/scripts"
  "${ROOT_DIR}/index.html"
  "${ROOT_DIR}/package.json"
)

write_header() {
  {
    echo "# Full-Stack Audit Baseline"
    echo
    echo "- generated_at: ${STAMP}"
    echo "- root: ${ROOT_DIR}"
    echo "- exclusions: artifacts, generated dist folders, target, node_modules, .git"
    echo
  } >"${REPORT_PATH}"
}

run_rg_section() {
  local title="$1"
  local pattern="$2"
  local tmp_file
  tmp_file="$(mktemp)"

  if rg -n "${RG_EXCLUDES[@]}" "${pattern}" "${AUDIT_PATHS[@]}" >"${tmp_file}" 2>/dev/null; then
    :
  fi

  local count
  count="$(wc -l <"${tmp_file}" | tr -d ' ')"

  {
    echo "## ${title}"
    echo
    echo "- pattern: \`${pattern}\`"
    echo "- matches: ${count}"
    echo
    if [[ "${count}" -gt 0 ]]; then
      head -n "${MAX_LINES}" "${tmp_file}"
      if [[ "${count}" -gt "${MAX_LINES}" ]]; then
        echo
        echo "... truncated to first ${MAX_LINES} matches ..."
      fi
    else
      echo "_No matches found._"
    fi
    echo
  } >>"${REPORT_PATH}"

  rm -f "${tmp_file}"
}

run_query_hotspot_section() {
  local tmp_file
  tmp_file="$(mktemp)"

  if rg -n "${RG_EXCLUDES[@]}" "db_client::query\\(" "${ROOT_DIR}/rust" \
    | cut -d: -f1 \
    | sort \
    | uniq -c \
    | sort -nr >"${tmp_file}" 2>/dev/null; then
    :
  fi

  local count
  count="$(wc -l <"${tmp_file}" | tr -d ' ')"

  {
    echo "## DB Query Hotspots"
    echo
    echo "- metric: query call count by file (\`db_client::query(\`)"
    echo "- files_with_queries: ${count}"
    echo
    if [[ "${count}" -gt 0 ]]; then
      head -n 40 "${tmp_file}"
    else
      echo "_No query usage found._"
    fi
    echo
  } >>"${REPORT_PATH}"

  rm -f "${tmp_file}"
}

write_header

run_rg_section "Security: Secret-Like Tokens" "(API_KEY|SECRET|TOKEN|BEGIN RSA PRIVATE KEY|BEGIN EC PRIVATE KEY|password\\s*=\\s*['\\\"])"
run_rg_section "Security: XSS / Dynamic Code Surfaces" "(dangerouslySetInnerHTML|innerHTML\\s*=|insertAdjacentHTML|eval\\(|new Function\\()"
run_rg_section "Database: SQL Construction Hotspots" "(format!\\(\\\"(SELECT|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER)|db_client::query\\()"
run_query_hotspot_section
run_rg_section "Performance: Timer / Loop Triggers" "(setInterval\\(|setTimeout\\(|requestAnimationFrame\\()"
run_rg_section "Quality: Unsafe Panics in Runtime Code" "\\b(unwrap\\(|expect\\()"
run_rg_section "Quality: TODO / FIXME / HACK / XXX" "(TODO|FIXME|HACK|XXX)"

echo "Audit baseline report written to ${REPORT_PATH}"

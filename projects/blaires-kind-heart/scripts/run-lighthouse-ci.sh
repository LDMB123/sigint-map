#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG_PATH="${LHCI_CONFIG_PATH:-${ROOT_DIR}/lighthouserc.json}"
MAX_ATTEMPTS="${LHCI_MAX_ATTEMPTS:-2}"
COMMAND_TIMEOUT_SECONDS="${LHCI_COMMAND_TIMEOUT_SECONDS:-600}"

run_lhci_autorun() {
  npx --no-install lhci autorun --config="${CONFIG_PATH}" &
  local cmd_pid=$!
  local elapsed=0

  while kill -0 "${cmd_pid}" 2>/dev/null; do
    sleep 1
    elapsed=$((elapsed + 1))

    if (( elapsed >= COMMAND_TIMEOUT_SECONDS )); then
      printf '[lighthouse-ci] command timed out after %ss\n' "${COMMAND_TIMEOUT_SECONDS}" >&2
      kill -TERM -- "-${cmd_pid}" 2>/dev/null || kill -TERM "${cmd_pid}" 2>/dev/null || true
      sleep 5
      kill -KILL -- "-${cmd_pid}" 2>/dev/null || kill -KILL "${cmd_pid}" 2>/dev/null || true
      wait "${cmd_pid}" 2>/dev/null || true
      return 124
    fi
  done

  if wait "${cmd_pid}"; then
    return 0
  fi

  local cmd_status=$?
  return "${cmd_status}"
}

validate_assertion_results() {
  local assertion_path="${ROOT_DIR}/.lighthouseci/assertion-results.json"

  if [[ ! -f "${assertion_path}" ]]; then
    return 0
  fi

  node - "${assertion_path}" <<'NODE'
const fs = require("node:fs");

const path = process.argv[2];
let assertions;

try {
  assertions = JSON.parse(fs.readFileSync(path, "utf8"));
} catch (error) {
  console.error(`[lighthouse-ci] failed to parse ${path}: ${error.message}`);
  process.exit(2);
}

if (!Array.isArray(assertions)) {
  process.exit(0);
}

const failingErrors = assertions.filter(
  (item) => item && item.level === "error" && item.passed === false,
);

if (failingErrors.length === 0) {
  process.exit(0);
}

console.error(`[lighthouse-ci] ${failingErrors.length} error-level assertion failure(s):`);
for (const failure of failingErrors.slice(0, 10)) {
  const audit = failure.auditId ?? "unknown-audit";
  const url = failure.url ?? "unknown-url";
  const message = failure.message ?? `${failure.name ?? "assertion"} failed`;
  console.error(`  - ${audit} @ ${url}: ${message}`);
}

process.exit(3);
NODE
}

attempt=1
while (( attempt <= MAX_ATTEMPTS )); do
  printf '[lighthouse-ci] attempt %s/%s\n' "${attempt}" "${MAX_ATTEMPTS}"

  rm -rf "${ROOT_DIR}/.lighthouseci" "${ROOT_DIR}/artifacts/lighthouse"

  if run_lhci_autorun; then
    exit_code=0
  else
    exit_code=$?
  fi

  if (( exit_code == 0 )); then
    if validate_assertion_results; then
      printf '[lighthouse-ci] completed successfully\n'
      exit 0
    fi
    exit_code=$?
  fi

  if (( attempt == MAX_ATTEMPTS )); then
    printf '[lighthouse-ci] failed after %s attempt(s) (last exit=%s)\n' "${MAX_ATTEMPTS}" "${exit_code}" >&2
    exit "${exit_code}"
  fi

  printf '[lighthouse-ci] retrying after transient failure (exit=%s)\n' "${exit_code}" >&2
  attempt=$((attempt + 1))
  sleep 3
done

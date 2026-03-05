#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUST_DIR="${ROOT_DIR}/rust"
TMP_DIR="${RUST_DIR}/.tmp"
IDB_DIR="${TMP_DIR}/data"
RUNTIME_DB="${TMP_DIR}/dmb-runtime.db"

run() {
  echo "==> $*"
  "$@"
}

mkdir -p "${TMP_DIR}"

pushd "${RUST_DIR}" >/dev/null

run cargo fmt --all
run cargo clippy -p dmb_pipeline --all-targets -- -D warnings
run cargo test -p dmb_pipeline
run cargo test -p dmb_idb
run cargo check -p dmb_server
run cargo check -p dmb_app --features ssr

run cargo run -p dmb_pipeline -- build-idb --source-dir ../data/static-data --output-dir "${IDB_DIR}"
run cargo run -p dmb_pipeline -- build-runtime-db --source-dir "${IDB_DIR}" --output "${RUNTIME_DB}"
run cargo run -p dmb_pipeline -- validate-parity --manifest "${IDB_DIR}/manifest.json" --sqlite "${RUNTIME_DB}" --strict-manifest --strict-tables
run bash "${ROOT_DIR}/scripts/db-query-plan-audit.sh" "${RUNTIME_DB}"

popd >/dev/null

echo "Autonomous DB optimize pass complete."
echo "Runtime DB: ${RUNTIME_DB}"

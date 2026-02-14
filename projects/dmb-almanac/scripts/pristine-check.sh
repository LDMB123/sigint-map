#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

RUN_RUST_VERIFY=0
RUN_CUTOVER_REHEARSAL=0

for arg in "$@"; do
  case "$arg" in
    --with-rust-verify)
      RUN_RUST_VERIFY=1
      ;;
    --with-cutover-rehearsal)
      RUN_CUTOVER_REHEARSAL=1
      ;;
    *)
      echo "unknown option: $arg" >&2
      echo "usage: bash scripts/pristine-check.sh [--with-rust-verify] [--with-cutover-rehearsal]" >&2
      exit 2
      ;;
  esac
done

echo "pristine-check: docs integrity"
python3 scripts/check-doc-integrity.py

echo "pristine-check: repository hygiene"
bash scripts/check-repo-hygiene.sh

if [[ $RUN_RUST_VERIFY -eq 1 ]]; then
  echo "pristine-check: rust verify"
  (
    cd rust
    cargo run -p xtask -- verify
  )
fi

if [[ $RUN_CUTOVER_REHEARSAL -eq 1 ]]; then
  echo "pristine-check: cutover rehearsal"
  bash scripts/cutover-rehearsal.sh
fi

echo "pristine-check: ok"

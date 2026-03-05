#!/bin/bash

# Rust-first deploy helper.
#
# Current scope for this repo: local-only offline PWA transition.
#
# Usage:
#   ./scripts/deploy.sh local [addr]
#
# Examples:
#   ./scripts/deploy.sh local
#   ./scripts/deploy.sh local 127.0.0.1:3100

set -euo pipefail

MODE="${1:-local}"
ADDR="${2:-}"

case "$MODE" in
  local)
    cd "$(dirname "$0")/../rust"
    if [ -n "$ADDR" ]; then
      export DMB_SITE_ADDR="$ADDR"
      echo "Starting Rust server with DMB_SITE_ADDR=${DMB_SITE_ADDR}"
    else
      echo "Starting Rust server with default bind address (override via DMB_SITE_ADDR=IP:PORT)"
    fi
    cargo run -p dmb_server
    ;;
  *)
    echo "Unknown mode: $MODE" >&2
    echo "Usage: ./scripts/deploy.sh local [addr]" >&2
    exit 2
    ;;
esac

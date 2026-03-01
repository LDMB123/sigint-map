#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "[1/5] Running prompt-pack QA..."
node "$SCRIPT_DIR/prompt-pack-qa.mjs"

echo "[2/5] Running mocked E2E smoke..."
node "$SCRIPT_DIR/e2e-smoke-mocked.mjs"

echo "[3/5] Running scorer hard-fail E2E smoke..."
node "$SCRIPT_DIR/e2e-smoke-scorer-hardfail.mjs"

echo "[4/5] Running strict launcher E2E smoke..."
node "$SCRIPT_DIR/e2e-smoke-launcher-strict-mode.mjs"

echo "[5/5] Running live gated E2E smoke..."
"$SCRIPT_DIR/e2e-smoke-live-gated.sh"

echo "E2E smoke suite complete."

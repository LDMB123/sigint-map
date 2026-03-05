#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "[1/6] Running prompt-pack QA..."
node "$SCRIPT_DIR/prompt-pack-qa.mjs"

echo "[2/6] Running mocked E2E smoke..."
node "$SCRIPT_DIR/e2e-smoke-mocked.mjs"

echo "[3/6] Running scorer hard-fail E2E smoke..."
node "$SCRIPT_DIR/e2e-smoke-scorer-hardfail.mjs"

echo "[4/6] Running strict launcher E2E smoke..."
node "$SCRIPT_DIR/e2e-smoke-launcher-strict-mode.mjs"

echo "[5/6] Running microdetail guard E2E smoke..."
node "$SCRIPT_DIR/e2e-smoke-microdetail-guard.mjs"

echo "[6/6] Running live gated E2E smoke..."
"$SCRIPT_DIR/e2e-smoke-live-gated.sh"

echo "E2E smoke suite complete."

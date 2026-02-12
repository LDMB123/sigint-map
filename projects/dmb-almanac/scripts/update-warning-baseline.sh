#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR/rust"

echo "Generating warning report from seed scrape..."
cargo run -p dmb_pipeline -- scrape --warnings-output data/warnings.json --warnings-max 0

echo "Updating baseline..."
cp data/warnings.json data/warnings.baseline.json
echo "Baseline updated at rust/data/warnings.baseline.json"

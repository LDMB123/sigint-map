#!/bin/bash
# Build WASM modules from Rust source
# Generates JavaScript bindings and .wasm files

set -e # Exit on any error

echo "🦀 Building DMB Almanac WASM modules..."
echo ""

# Navigate to Rust workspace root
cd "$(dirname "$0")/../rust"

# Build aggregations module
echo "📊 Building aggregations module..."
cd aggregations
wasm-pack build \
  --target web \
  --out-dir ../../app/src/lib/wasm/aggregations \
  --out-name dmb_wasm_aggregations

echo ""
echo "✅ WASM build complete!"
echo ""

# Show generated files and sizes
echo "📦 Generated files:"
ls -lh ../../app/src/lib/wasm/aggregations/
echo ""

# Show .wasm file size
WASM_SIZE=$(du -h ../../app/src/lib/wasm/aggregations/*.wasm | cut -f1)
echo "📏 WASM binary size: $WASM_SIZE"
echo ""

echo "🎉 Ready to use in JavaScript with:"
echo "   import { aggregate_by_year } from '\$lib/wasm/aggregations';"

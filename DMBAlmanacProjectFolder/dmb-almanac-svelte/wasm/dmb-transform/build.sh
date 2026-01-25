#!/bin/bash
# DMB Almanac - WASM Build Script
#
# Builds the Rust WASM module and copies outputs to the SvelteKit project.
#
# Usage:
#   ./build.sh              # Production build (standard)
#   ./build.sh dev          # Development build
#   ./build.sh parallel     # Production build with Rayon parallel processing
#   ./build.sh dev-parallel # Development build with Rayon parallel processing
#
# Notes:
#   - Standard builds are smaller (~50KB less) and work in all environments
#   - Parallel builds enable Rayon for multi-threaded processing on large datasets
#   - Parallel builds require SharedArrayBuffer support (COOP/COEP headers)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"
PKG_DIR="$SCRIPT_DIR/pkg"
DEST_DIR="$PROJECT_DIR/src/lib/wasm/dmb-transform"

echo "=== DMB Almanac WASM Build ==="
echo "Script dir: $SCRIPT_DIR"
echo "Project dir: $PROJECT_DIR"
echo ""

# Check for wasm-pack
if ! command -v wasm-pack &> /dev/null; then
    echo "Error: wasm-pack is not installed"
    echo "Install with: cargo install wasm-pack"
    exit 1
fi

# Determine build mode and features
BUILD_MODE="${1:-release}"
FEATURES=""
IS_DEV=false
IS_PARALLEL=false

case "$BUILD_MODE" in
    dev)
        IS_DEV=true
        echo "Building in DEVELOPMENT mode (standard)..."
        ;;
    dev-parallel)
        IS_DEV=true
        IS_PARALLEL=true
        FEATURES="--features parallel"
        echo "Building in DEVELOPMENT mode with PARALLEL processing..."
        ;;
    parallel)
        IS_PARALLEL=true
        FEATURES="--features parallel"
        echo "Building in RELEASE mode with PARALLEL processing..."
        ;;
    release|*)
        echo "Building in RELEASE mode (standard)..."
        ;;
esac

# Show feature status
if [ "$IS_PARALLEL" = true ]; then
    echo "  - Rayon parallel iterators: ENABLED"
    echo "  - Note: Requires SharedArrayBuffer (COOP/COEP headers)"
else
    echo "  - Rayon parallel iterators: DISABLED (smaller bundle)"
fi
echo ""

# Build command
if [ "$IS_DEV" = true ]; then
    if [ -n "$FEATURES" ]; then
        wasm-pack build --target web --dev -- $FEATURES
    else
        wasm-pack build --target web --dev
    fi
else
    if [ -n "$FEATURES" ]; then
        wasm-pack build --target web --release -- $FEATURES
    else
        wasm-pack build --target web --release
    fi
fi

echo ""
echo "Build complete!"

# Show output sizes
echo ""
echo "Output files:"
ls -lh "$PKG_DIR"/*.wasm 2>/dev/null || true
ls -lh "$PKG_DIR"/*.js 2>/dev/null || true

# Copy to SvelteKit project
echo ""
echo "Copying to SvelteKit project..."

mkdir -p "$DEST_DIR"
cp "$PKG_DIR/dmb_transform.js" "$DEST_DIR/"
cp "$PKG_DIR/dmb_transform_bg.wasm" "$DEST_DIR/"
cp "$PKG_DIR/dmb_transform.d.ts" "$DEST_DIR/"

echo "Copied files to: $DEST_DIR"

# Show final sizes
WASM_SIZE=$(ls -lh "$DEST_DIR/dmb_transform_bg.wasm" | awk '{print $5}')
JS_SIZE=$(ls -lh "$DEST_DIR/dmb_transform.js" | awk '{print $5}')

echo ""
echo "=== Build Summary ==="
echo "WASM binary: $WASM_SIZE"
echo "JS glue:     $JS_SIZE"
echo ""
echo "Integration: import from '\$lib/wasm/transform'"
echo "Done!"

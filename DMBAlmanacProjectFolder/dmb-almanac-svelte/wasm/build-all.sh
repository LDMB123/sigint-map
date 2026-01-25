#!/bin/bash
# DMB Almanac - Unified WASM Build Script
#
# Builds all WASM modules with maximum performance optimizations.
#
# Usage:
#   ./build-all.sh              # Production build (all modules)
#   ./build-all.sh dev          # Development build (all modules)
#   ./build-all.sh transform    # Build only dmb-transform
#   ./build-all.sh segue        # Build only dmb-segue-analysis
#   ./build-all.sh date         # Build only dmb-date-utils
#   ./build-all.sh clean        # Clean all build artifacts
#
# Performance optimizations enabled:
#   - LTO (Link-Time Optimization)
#   - Single codegen unit
#   - wasm-opt with -Oz and bulk-memory
#   - Symbol stripping
#   - Panic=abort (removes panic infrastructure)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Module directories
TRANSFORM_DIR="$SCRIPT_DIR/dmb-transform"
SEGUE_DIR="$SCRIPT_DIR/dmb-segue-analysis"
DATE_DIR="$SCRIPT_DIR/dmb-date-utils"

# Output directories
WASM_OUTPUT_DIR="$PROJECT_DIR/static/wasm"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo ""
    echo -e "${BLUE}=== $1 ===${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

check_dependencies() {
    print_header "Checking dependencies"

    if ! command -v wasm-pack &> /dev/null; then
        print_error "wasm-pack is not installed"
        echo "Install with: cargo install wasm-pack"
        exit 1
    fi
    print_success "wasm-pack found: $(wasm-pack --version)"

    if ! command -v rustc &> /dev/null; then
        print_error "Rust is not installed"
        echo "Install from: https://rustup.rs"
        exit 1
    fi
    print_success "Rust found: $(rustc --version)"

    # Check for wasm32 target
    if ! rustup target list --installed | grep -q "wasm32-unknown-unknown"; then
        print_warning "Adding wasm32-unknown-unknown target..."
        rustup target add wasm32-unknown-unknown
    fi
    print_success "wasm32-unknown-unknown target installed"
}

build_module() {
    local module_name=$1
    local module_dir=$2
    local is_dev=$3

    print_header "Building $module_name"

    if [ ! -d "$module_dir" ]; then
        print_error "Module directory not found: $module_dir"
        return 1
    fi

    cd "$module_dir"

    local start_time=$(date +%s)

    if [ "$is_dev" = true ]; then
        echo "Mode: Development (debug symbols, faster builds)"
        wasm-pack build --target web --dev
    else
        echo "Mode: Release (maximum optimization)"
        wasm-pack build --target web --release
    fi

    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    # Get output size
    local wasm_file="$module_dir/pkg/${module_name//-/_}_bg.wasm"
    if [ -f "$wasm_file" ]; then
        local wasm_size=$(ls -lh "$wasm_file" | awk '{print $5}')
        print_success "Built $module_name in ${duration}s (WASM: $wasm_size)"
    else
        print_warning "Built $module_name in ${duration}s (WASM file not found)"
    fi

    cd "$SCRIPT_DIR"
}

copy_outputs() {
    print_header "Copying outputs to SvelteKit"

    # Create output directories
    mkdir -p "$WASM_OUTPUT_DIR/dmb-transform/pkg"
    mkdir -p "$WASM_OUTPUT_DIR/dmb-segue-analysis/pkg"
    mkdir -p "$WASM_OUTPUT_DIR/dmb-date-utils/pkg"

    # Also create src/lib/wasm directories for TypeScript imports
    mkdir -p "$PROJECT_DIR/src/lib/wasm/dmb-transform"
    mkdir -p "$PROJECT_DIR/src/lib/wasm/dmb-segue-analysis"
    mkdir -p "$PROJECT_DIR/src/lib/wasm/dmb-date-utils"

    # Copy dmb-transform
    if [ -d "$TRANSFORM_DIR/pkg" ]; then
        cp "$TRANSFORM_DIR/pkg/dmb_transform.js" "$PROJECT_DIR/src/lib/wasm/dmb-transform/"
        cp "$TRANSFORM_DIR/pkg/dmb_transform_bg.wasm" "$PROJECT_DIR/src/lib/wasm/dmb-transform/"
        cp "$TRANSFORM_DIR/pkg/dmb_transform.d.ts" "$PROJECT_DIR/src/lib/wasm/dmb-transform/" 2>/dev/null || true
        # Also copy to static for direct fetch
        cp "$TRANSFORM_DIR/pkg/"* "$WASM_OUTPUT_DIR/dmb-transform/pkg/" 2>/dev/null || true
        print_success "Copied dmb-transform outputs"
    fi

    # Copy dmb-segue-analysis
    if [ -d "$SEGUE_DIR/pkg" ]; then
        cp "$SEGUE_DIR/pkg/dmb_segue_analysis.js" "$PROJECT_DIR/src/lib/wasm/dmb-segue-analysis/"
        cp "$SEGUE_DIR/pkg/dmb_segue_analysis_bg.wasm" "$PROJECT_DIR/src/lib/wasm/dmb-segue-analysis/"
        cp "$SEGUE_DIR/pkg/dmb_segue_analysis.d.ts" "$PROJECT_DIR/src/lib/wasm/dmb-segue-analysis/" 2>/dev/null || true
        cp "$SEGUE_DIR/pkg/"* "$WASM_OUTPUT_DIR/dmb-segue-analysis/pkg/" 2>/dev/null || true
        print_success "Copied dmb-segue-analysis outputs"
    fi

    # Copy dmb-date-utils
    if [ -d "$DATE_DIR/pkg" ]; then
        cp "$DATE_DIR/pkg/dmb_date_utils.js" "$PROJECT_DIR/src/lib/wasm/dmb-date-utils/"
        cp "$DATE_DIR/pkg/dmb_date_utils_bg.wasm" "$PROJECT_DIR/src/lib/wasm/dmb-date-utils/"
        cp "$DATE_DIR/pkg/dmb_date_utils.d.ts" "$PROJECT_DIR/src/lib/wasm/dmb-date-utils/" 2>/dev/null || true
        cp "$DATE_DIR/pkg/"* "$WASM_OUTPUT_DIR/dmb-date-utils/pkg/" 2>/dev/null || true
        print_success "Copied dmb-date-utils outputs"
    fi
}

print_summary() {
    print_header "Build Summary"

    echo "Output locations:"
    echo "  - TypeScript imports: src/lib/wasm/<module>/"
    echo "  - Static assets:      static/wasm/<module>/pkg/"
    echo ""

    echo "Bundle sizes:"
    for module in dmb-transform dmb-segue-analysis dmb-date-utils; do
        local module_snake="${module//-/_}"
        local wasm_file="$PROJECT_DIR/src/lib/wasm/$module/${module_snake}_bg.wasm"
        local js_file="$PROJECT_DIR/src/lib/wasm/$module/${module_snake}.js"

        if [ -f "$wasm_file" ]; then
            local wasm_size=$(ls -lh "$wasm_file" | awk '{print $5}')
            local js_size=$(ls -lh "$js_file" 2>/dev/null | awk '{print $5}' || echo "N/A")
            echo "  $module: WASM=$wasm_size, JS=$js_size"
        fi
    done

    echo ""
    echo "Import examples:"
    echo "  import init, { version } from '\$wasm/dmb-transform/pkg/dmb_transform';"
    echo "  import init, { SetlistPredictor } from '\$wasm/dmb-segue-analysis/pkg/dmb_segue_analysis';"
    echo "  import init, { daysSince } from '\$wasm/dmb-date-utils/pkg/dmb_date_utils';"
    echo ""
}

clean_all() {
    print_header "Cleaning build artifacts"

    rm -rf "$TRANSFORM_DIR/pkg" "$TRANSFORM_DIR/target"
    rm -rf "$SEGUE_DIR/pkg" "$SEGUE_DIR/target"
    rm -rf "$DATE_DIR/pkg" "$DATE_DIR/target"
    rm -rf "$PROJECT_DIR/src/lib/wasm/dmb-transform"
    rm -rf "$PROJECT_DIR/src/lib/wasm/dmb-segue-analysis"
    rm -rf "$PROJECT_DIR/src/lib/wasm/dmb-date-utils"
    rm -rf "$WASM_OUTPUT_DIR"

    print_success "Cleaned all build artifacts"
}

# Main execution
BUILD_MODE="${1:-all}"
IS_DEV=false

if [ "$BUILD_MODE" = "dev" ]; then
    IS_DEV=true
    BUILD_MODE="all"
elif [[ "$BUILD_MODE" == dev-* ]]; then
    IS_DEV=true
    BUILD_MODE="${BUILD_MODE#dev-}"
fi

print_header "DMB Almanac WASM Build System"
echo "Mode: $([ "$IS_DEV" = true ] && echo "Development" || echo "Release")"
echo "Target: $BUILD_MODE"

case "$BUILD_MODE" in
    clean)
        clean_all
        ;;
    transform)
        check_dependencies
        build_module "dmb-transform" "$TRANSFORM_DIR" "$IS_DEV"
        copy_outputs
        print_summary
        ;;
    segue)
        check_dependencies
        build_module "dmb-segue-analysis" "$SEGUE_DIR" "$IS_DEV"
        copy_outputs
        print_summary
        ;;
    date)
        check_dependencies
        build_module "dmb-date-utils" "$DATE_DIR" "$IS_DEV"
        copy_outputs
        print_summary
        ;;
    all|*)
        check_dependencies

        # Build all modules in parallel for faster builds
        build_module "dmb-transform" "$TRANSFORM_DIR" "$IS_DEV" &
        PID1=$!
        build_module "dmb-segue-analysis" "$SEGUE_DIR" "$IS_DEV" &
        PID2=$!
        build_module "dmb-date-utils" "$DATE_DIR" "$IS_DEV" &
        PID3=$!

        # Wait for all builds
        wait $PID1 $PID2 $PID3

        copy_outputs
        print_summary
        ;;
esac

print_success "Build complete!"

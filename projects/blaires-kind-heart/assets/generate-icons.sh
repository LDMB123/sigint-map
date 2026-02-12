#!/bin/bash

# Generate Blaire's Kind Heart PWA Icons
# This script creates all required app icons from a single Python generation script

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ICONS_DIR="$SCRIPT_DIR/icons"
GENERATOR="$SCRIPT_DIR/generate_icons.py"

echo "Blaire's Kind Heart - Icon Generator"
echo "====================================="
echo ""

# Check if Python 3 is available
if ! command -v python3 &> /dev/null; then
    echo "ERROR: python3 is required but not installed"
    echo "Install Python 3 and the Pillow library:"
    echo "  pip3 install Pillow"
    exit 1
fi

# Check if Pillow is installed
if ! python3 -c "import PIL" 2>/dev/null; then
    echo "ERROR: Pillow library is not installed"
    echo "Install it with:"
    echo "  pip3 install Pillow"
    exit 1
fi

# Run the generator
echo "Generating icons in: $ICONS_DIR"
echo ""
python3 "$GENERATOR"

echo ""
echo "Icon generation complete!"
echo "Icons are ready in: $ICONS_DIR"
echo ""
echo "Icons created:"
echo "  - icon-512.png (512x512)"
echo "  - icon-192.png (192x192)"
echo "  - icon-180.png (180x180 - Apple touch icon)"
echo "  - icon-512-maskable.png (512x512 - maskable)"
echo "  - icon-192-maskable.png (192x192 - maskable)"

.PHONY: icons icons-check icons-clean help

# Blaire's Kind Heart - Icon Generation Makefile

help:
	@echo "Blaire's Kind Heart - Icon Generation"
	@echo "======================================"
	@echo ""
	@echo "Available targets:"
	@echo "  make icons         Generate all PWA app icons (Python)"
	@echo "  make icons-svg     Convert SVG to PNG icons (requires ImageMagick)"
	@echo "  make icons-check   Verify generated icons"
	@echo "  make icons-clean   Remove generated icons"
	@echo "  make help          Show this help message"
	@echo ""
	@echo "Prerequisites:"
	@echo "  Python 3.7+: python3 --version"
	@echo "  Pillow:      pip3 install Pillow"
	@echo "  ImageMagick: brew install imagemagick (for SVG method)"
	@echo ""

# Check if Python 3 and Pillow are available
check-python:
	@command -v python3 >/dev/null 2>&1 || (echo "ERROR: python3 not found"; exit 1)
	@python3 -c "import PIL" 2>/dev/null || (echo "ERROR: Pillow not installed. Run: pip3 install Pillow"; exit 1)
	@echo "✓ Python 3 and Pillow ready"

# Check if ImageMagick is available
check-imagemagick:
	@command -v convert >/dev/null 2>&1 || (echo "ERROR: ImageMagick not found. Run: brew install imagemagick"; exit 1)
	@echo "✓ ImageMagick ready"

# Generate icons using Python script
icons: check-python
	@echo "Generating Blaire's Kind Heart app icons..."
	@python3 generate_icons.py
	@echo ""
	@echo "Icons generated successfully!"
	@ls -lh icons/icon-*.png

# Generate icons from SVG using ImageMagick
icons-svg: check-imagemagick icons/sparkle-unicorn.svg
	@echo "Converting SVG to PNG icons..."
	@cd icons && \
		convert -density 150 -resize 512x512 sparkle-unicorn.svg icon-512.png && \
		convert -density 150 -resize 192x192 sparkle-unicorn.svg icon-192.png && \
		convert -density 150 -resize 180x180 sparkle-unicorn.svg icon-180.png && \
		cp icon-512.png icon-512-maskable.png && \
		cp icon-192.png icon-192-maskable.png && \
		echo "✓ Icons converted from SVG"
	@echo ""
	@ls -lh icons/icon-*.png

# Verify generated icons
icons-check:
	@echo "Checking generated icons..."
	@echo ""
	@if [ ! -d "icons" ]; then echo "ERROR: icons directory not found"; exit 1; fi
	@echo "Icon files:"
	@ls -lh icons/icon-*.png 2>/dev/null || (echo "No icon files found"; exit 1)
	@echo ""
	@echo "File sizes:"
	@du -h icons/icon-*.png
	@echo ""
	@echo "Dimensions check (macOS):"
	@command -v sips >/dev/null 2>&1 && \
		(cd icons && for f in icon-*.png; do echo "$$f: $$(sips -g pixelWidth $$f | grep pixelWidth | awk '{print $$2}') x $$(sips -g pixelHeight $$f | grep pixelHeight | awk '{print $$2}')"; done) || \
		echo "Note: sips not available for dimension check"
	@echo ""
	@echo "✓ Icon verification complete"

# Remove generated icons
icons-clean:
	@echo "Removing generated icons..."
	@rm -f icons/icon-*.png
	@echo "✓ Icons cleaned"

# Default target
.DEFAULT_GOAL := help

#!/bin/bash
# Convert all illustration PNGs to WebP (keeps originals for fallback)
# Icons stay as PNG (manifest requires it)
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

for f in "$ROOT"/assets/illustrations/**/*.png "$ROOT"/assets/illustrations/**/**/*.png; do
  [ -f "$f" ] || continue
  webp="${f%.png}.webp"
  if [ ! -f "$webp" ] || [ "$f" -nt "$webp" ]; then
    cwebp -q 85 "$f" -o "$webp" 2>/dev/null
    echo "Converted: $(basename "$webp")"
  fi
done
echo "Done."

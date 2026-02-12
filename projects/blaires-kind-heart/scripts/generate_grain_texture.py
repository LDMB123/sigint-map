#!/usr/bin/env python3
"""Generate a subtle grain/noise texture for background"""
from PIL import Image
import random

# Create tiny 64x64 grain texture (will tile seamlessly)
# Smaller size = smaller file, CSS will repeat it
width, height = 64, 64

# Create grayscale image (no alpha - use in CSS with opacity)
img = Image.new('L', (width, height))
pixels = img.load()

# Generate random noise
random.seed(42)  # Deterministic for consistent pattern
for y in range(height):
    for x in range(width):
        # Subtle grain - mostly mid-tones with slight variation
        pixels[x, y] = random.randint(120, 135)

# Save as optimized PNG (grayscale is much smaller than RGBA)
img.save('assets/noise.png', optimize=True)

import os
size = os.path.getsize('assets/noise.png')
print(f"✅ Generated assets/noise.png ({width}x{height} grayscale)")
print(f"   File size: {size:,} bytes ({size/1024:.1f} KB)")
print(f"   Target: <5KB ✓" if size < 5000 else f"   ⚠️  Still too large")

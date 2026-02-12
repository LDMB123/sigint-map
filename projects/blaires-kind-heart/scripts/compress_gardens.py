#!/usr/bin/env python3
"""Re-compress oversized garden WebP files"""
from PIL import Image
import os

# Files that exceed 30KB target
files = [
    'assets/gardens/magic_stage_2.webp',
    'assets/gardens/dream_stage_5.webp',
    'assets/gardens/hug_stage_5.webp'
]

for filepath in files:
    if not os.path.exists(filepath):
        print(f"⚠️  File not found: {filepath}")
        continue

    # Get original size
    orig_size = os.path.getsize(filepath)

    # Load and resize if too large, then compress with quality=50
    img = Image.open(filepath)

    # If image is larger than 300x300, resize it
    if img.width > 300 or img.height > 300:
        img.thumbnail((300, 300), Image.Resampling.LANCZOS)
        print(f"   Resized to {img.width}x{img.height}")

    img.save(filepath, 'WebP', quality=50, method=6)

    # Get new size
    new_size = os.path.getsize(filepath)
    reduction = ((orig_size - new_size) / orig_size) * 100

    print(f"✅ {os.path.basename(filepath)}: {orig_size:,} → {new_size:,} bytes ({reduction:.1f}% reduction)")

    # Check if still over target
    if new_size > 30000:
        print(f"   ⚠️  Still over 30KB target")

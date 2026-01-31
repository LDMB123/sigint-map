#!/bin/bash

# Add ultra-photorealism prefix to all concept prompts

ULTRA_REAL="ULTRA PHOTOREALISTIC REAL-LIFE PHOTOGRAPH - NOT AI GENERATED: Authentic unretouched photo with visible skin pores, fine lines, natural imperfections. Real fabric with wrinkles, pulls, texture variations. Genuine camera sensor grain (NOT artificial). Actual lens imperfections with chromatic aberration, vignetting, slight softness. Real lighting physics with inverse square falloff, color temperature shifts, mixed light sources. Authentic dive bar setting with visible dirt, wear, scuffs, stains. Natural candid moment with slight motion blur, NOT perfectly posed. Zero AI smoothing, zero perfect symmetry, zero artificial beauty filters. This must be indistinguishable from a real photograph. "

# Read each concept file and add prefix to every camera spec line
for file in dive-bar-concepts-31-40.md dive-bar-concepts-41-50.md dive-bar-concepts-51-60.md dive-bar-concepts-61-80.md dive-bar-concepts-81-90.md; do
    if [ -f "$file" ]; then
        # Create backup
        cp "$file" "${file}.backup"
        
        # Process file - add ULTRA_REAL before any line starting with camera specs
        sed -E "s|^(Sony A7|Canon|Nikon|Fuji|iPhone)|${ULTRA_REAL}\1|" "$file" > "${file}.tmp"
        mv "${file}.tmp" "$file"
        
        echo "Updated $file with ultra-photorealism instructions"
    fi
done

echo "All concept files updated!"

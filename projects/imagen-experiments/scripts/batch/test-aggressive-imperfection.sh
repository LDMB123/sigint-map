#!/bin/bash

# Test AGGRESSIVE IMPERFECTION approach with 4K output
# Concept: Woman in burgundy leather mini dress at Hotel Vegas
# Reference: /Users/louisherman/Documents/Image 56.jpeg

IMAGE="/Users/louisherman/Documents/Image 56.jpeg"
NANOSCRIPT="/Users/louisherman/ClaudeCodeProjects/projects/imagen-experiments/scripts/nanobanana-direct.js"

# Read the aggressive constraint prefix
CONSTRAINT_PREFIX=$(cat /Users/louisherman/ClaudeCodeProjects/CONSTRAINT-BASED-PREFIX-AGGRESSIVE.md)

# Build the complete prompt
PROMPT="${CONSTRAINT_PREFIX}

Shot on iPhone 15 Pro rear camera, ISO 3200, f/1.6, 1/60s. Woman at Hotel Vegas outdoor patio wearing burgundy leather mini dress, structured bodice with princess seams, cap sleeves. The leather has visible grain texture, slight scuffing on hem, one pulled thread near zipper. Black opaque tights with slight pilling on thighs, burgundy suede ankle boots with brass zipper - scuff marks on toes.

Hair: Dark brunette in loose waves, but GREASY near scalp line - shine visible on roots. Frizz halo from Austin humidity. Several flyaway strands catching backlight. One side tucked behind ear showing natural peach fuzz along jawline.

Skin: VISIBLE PORES on nose bridge (0.1-0.2mm diameter). Oil shine on forehead and nose tip creating specular highlights. Slight redness on cheeks from heat. Fine expression lines around eyes from smiling. Uneven skin tone - darker under eyes, slight blemish on chin. Peach fuzz visible along cheekbone catching rim light.

Setting: Hotel Vegas outdoor patio at night. String lights with Edison bulbs overhead - some bulbs BLOWN OUT creating clipped highlights. Weathered picnic tables, graffiti-covered plywood walls. Single yellow bug light creating harsh side-lighting with sickly greenish cast. Background has neon beer signs - motion blur streaks from camera shake.

Lighting problems: Mixed color temperatures - warm tungsten string lights (3000K) vs cool bug light (4500K) creating color cast on face. Harsh shadows under chin, NO fill light. Deep shadows on right side of face going pure black. Specular highlights on forehead blown to white.

Technical imperfections:
- ISO 3200 GRAIN visible throughout - speckled texture on skin, fabric, background
- Color noise in shadows - red/green speckles visible in dark areas
- Slightly OUT OF FOCUS - focus missed eyes by 2 inches, landed on her shoulder
- Motion blur on her left hand holding beer can - 1/60s shutter too slow
- Chromatic aberration - magenta fringe on left edge of her silhouette, green on right
- JPEG compression artifacts - slight blockiness in gradient from light to shadow on face
- Lens vignetting - corners 30% darker than center
- Soft corners from cheap lens - background details 20% less sharp at edges

Fabric detail: Leather shows wrinkles across lap from sitting. Individual thread stitching visible on seams. Brass zipper has tarnish spots. Black tights have slight shine from synthetic fiber, loose thread on left knee.

This must look like: Late-night snapshot by friend at dive bar using phone camera. NOT professional photography. Emphasize authentic imperfections - grain, blur, harsh lighting, skin texture, fabric wear. Real candid moment.

CRITICAL: This is IMAGE EDIT - preserve EXACT facial features, bone structure, eyes, nose, mouth of reference woman. ONLY change: outfit (burgundy leather dress), setting (Hotel Vegas), lighting, hair as described. Face must remain 100% identical. She is looking directly at the camera with direct eye contact."

echo "================================================================"
echo "TESTING AGGRESSIVE IMPERFECTION APPROACH"
echo "================================================================"
echo "Output: 4K resolution"
echo "Concept: Burgundy leather dress at Hotel Vegas"
echo "Reference: Image 56.jpeg"
echo "================================================================"
echo ""
echo "Prompt preview (first 500 chars):"
echo "${PROMPT:0:500}..."
echo ""
echo "================================================================"
echo ""

# Execute with 4K output
# Note: We need to pass the full prompt including constraint prefix
# We'll use a temporary file to handle the multi-line prompt properly

TEMP_PROMPT_FILE="/tmp/aggressive-imperfection-prompt-$$.txt"
echo "$PROMPT" > "$TEMP_PROMPT_FILE"

# Read prompt from file and pass to node
if PROMPT_TEXT=$(cat "$TEMP_PROMPT_FILE") && node "$NANOSCRIPT" edit "$IMAGE" "$PROMPT_TEXT"; then
    echo ""
    echo "================================================================"
    echo "✅ GENERATION COMPLETE"
    echo "================================================================"
    echo ""
    echo "Check output directory: ~/nanobanana-output/"
    echo ""
    echo "Visual assessment checklist:"
    echo "  [ ] Heavy ISO 3200 grain visible throughout"
    echo "  [ ] Visible pores on nose, cheeks"
    echo "  [ ] Skin oil shine on T-zone"
    echo "  [ ] Slight out of focus (not tack sharp)"
    echo "  [ ] Motion blur on hands"
    echo "  [ ] JPEG compression artifacts"
    echo "  [ ] Chromatic aberration on edges"
    echo "  [ ] Harsh shadows, no fill light"
    echo "  [ ] Clipped highlights on lights"
    echo "  [ ] Color noise in shadows"
    echo "  [ ] Fabric showing thread texture"
    echo "  [ ] Hair frizz and flyaways"
    echo ""

    # Get the most recent file
    LATEST_IMAGE=$(ls -t ~/nanobanana-output/nanobanana_*.png 2>/dev/null | head -1)
    if [ -n "$LATEST_IMAGE" ]; then
        FILE_SIZE=$(ls -lh "$LATEST_IMAGE" | awk '{print $5}')
        echo "Latest output: $LATEST_IMAGE"
        echo "File size: $FILE_SIZE"
        echo ""
        echo "Open with: open \"$LATEST_IMAGE\""
    fi
else
    echo ""
    echo "================================================================"
    echo "❌ GENERATION FAILED"
    echo "================================================================"
fi

# Cleanup
rm -f "$TEMP_PROMPT_FILE"

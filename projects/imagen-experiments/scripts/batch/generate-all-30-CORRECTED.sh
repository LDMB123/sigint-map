#!/bin/bash

# Generate all 30 dive bar portrait concepts from reference image
# Uses Nano Banana Pro image editing to transform the reference woman
# Estimated time: ~40-45 minutes with 75-second delays

IMAGE_PATH="/Users/louisherman/Documents/LWMMoms - 374.jpeg"
DELAY=75
TOTAL=30
SUCCESS=0
FAILED=0

echo "=========================================================================="
echo "GENERATING 30 UNIQUE DIVE BAR PORTRAITS"
echo "=========================================================================="
echo "Reference image: $IMAGE_PATH"
echo "Total concepts: $TOTAL"
echo "Delay between: $DELAY seconds"
echo "Estimated time: ~40-45 minutes"
echo "=========================================================================="
echo ""
echo "Press Ctrl+C to cancel, or Enter to begin..."
read

START_TIME=$(date +%s)

# Function to run generation
generate() {
    local num=$1
    local desc=$2
    local prompt=$3

    echo "=========================================================================="
    echo "CONCEPT $num/$TOTAL - $desc"
    echo "=========================================================================="

    if node nanobanana-direct.js edit "$IMAGE_PATH" "$prompt"; then
        echo "✅ Concept $num completed successfully"
        SUCCESS=$((SUCCESS + 1))
    else
        echo "❌ Concept $num failed"
        FAILED=$((FAILED + 1))
    fi

    if [ $num -lt $TOTAL ]; then
        echo ""
        echo "⏳ Waiting $DELAY seconds before next concept..."
        echo "Progress: $num/$TOTAL complete"
        sleep $DELAY
        echo ""
    fi
}

# Note: Each prompt will use the EDIT mode which maintains the reference woman's face
# while transforming the scene, outfit, and styling

# CONCEPT 1 - Black leather dress at Ego's Lounge
generate 1 "Black leather at Ego's" "Candid portrait photograph of a woman in a red mini dress sitting at a dark wooden dive bar in Austin Texas, shot on a Canon EOS R5 with a 50mm f/1.4 lens wide open at ISO 6400, 1/80 shutter speed. She fills 70-80% of the frame, positioned slightly left of center with her eyes on the upper third line. Direct eye contact with the camera, expression is confident and relaxed with a slight asymmetric half-smile, head tilted just barely two degrees. Three-quarter body angle, right shoulder slightly closer to camera. The lighting is entirely practical and imperfect: a warm amber tungsten fixture above and to the left creates a key light on her face with hard shadows falling to the right side, a red-and-blue neon beer sign behind her to the right casts a faint cool accent on her shoulder and the edge of her hair, the overall scene is underexposed by about one stop with deep muddy shadows. Her skin shows real texture under the harsh warm light, visible pores on forehead, slight shine from humidity, foundation catching the warm tungsten and shifting slightly warm-orange. The red dress fabric catches the overhead light unevenly, bright on the left shoulder and dark matte in the creased fabric below. Background is shallow depth of field f/1.4 bokeh with slight optical aberrations: blurred warm bokeh circles from backlit liquor bottles on shelves, an out-of-focus Lone Star neon sign creating a soft red-white glow, the dark shape of another patron two seats down, worn dark wood paneling with layered band stickers and flyers barely visible. The bokeh circles show slight cat-eye distortion toward the edges of the frame. Natural lens vignetting darkens the corners. The image has visible luminance grain from high ISO especially in the shadow areas, slight chromatic aberration on high contrast edges, the white balance is set incorrectly warm around 3400K giving the whole image an amber cast. The color palette is dominated by deep amber, dark brown, black shadows with murky warm tone, and the red of her dress appears as a rich warm crimson under the tungsten light rather than a true neutral red. No fill light, no reflectors, no artificial smoothing. This looks like it was taken by a friend with a good camera at 11pm on a Saturday night on East 6th Street, handheld, one shot, slightly imperfect and completely authentic. CRITICAL: Maintain the exact facial features, eyes, nose, mouth, and face structure of the woman in the reference image - only change outfit to black leather mini dress, setting to Ego's Lounge, and apply described lighting."

echo ""
echo "=========================================================================="
echo "NOTE: This is a template with Concept 1"
echo "Full script with all 30 concepts needs all prompts added"
echo "Each prompt must end with: CRITICAL: Maintain exact facial features of reference woman"
echo "=========================================================================="

END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))
MINUTES=$((ELAPSED / 60))
SECONDS=$((ELAPSED % 60))

echo ""
echo "=========================================================================="
echo "GENERATION COMPLETE"
echo "=========================================================================="
echo "✅ Successful: $SUCCESS"
echo "❌ Failed: $FAILED"
echo "⏱️  Time elapsed: ${MINUTES}m ${SECONDS}s"
echo "📁 Output: ~/nanobanana-output/"
echo "=========================================================================="

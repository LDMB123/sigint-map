#!/bin/bash

IMAGE="/Users/louisherman/Documents/LWMMoms - 374.jpeg"
DELAY=120
EYE_CONTACT=" She is looking directly at the camera with direct eye contact."
FACE_LOCK=" CRITICAL: This is IMAGE EDIT - preserve EXACT facial features, bone structure, eyes, nose, mouth of reference woman. ONLY change: outfit, setting, lighting, hair as described. Face must remain 100% identical."
NANOSCRIPT="/Users/louisherman/ClaudeCodeProjects/projects/imagen-experiments/scripts/nanobanana-4k-edit.js"

echo "================================================================"
echo "ULTRA-REAL 4K - Concepts 31-60"
echo "================================================================"

START=$(date +%s)
SUCCESS=0
FAIL=0

run() {
    echo ""
    echo "=== CONCEPT $1/60 - $2 ==="
    if node "$NANOSCRIPT" edit "$IMAGE" "$3$EYE_CONTACT$FACE_LOCK"; then
        echo "✅ Complete"
        SUCCESS=$((SUCCESS+1))
    else
        echo "❌ Failed"
        FAIL=$((FAIL+1))
    fi
    [ $1 -lt 60 ] && echo "⏳ Waiting $DELAY sec..." && sleep $DELAY
}

# Read prompts from ULTRA-REAL-concepts-31-60.md and extract them
# For now, using inline prompts with ULTRA-REAL prefix

ULTRA_REAL="ULTRA PHOTOREALISTIC REAL-LIFE PHOTOGRAPH - NOT AI GENERATED: Authentic unretouched photo with visible skin pores, fine lines, natural imperfections, blemishes. Real fabric with actual wrinkles, pulls, loose threads, texture variations. Genuine camera sensor grain from high ISO (NOT artificial smoothing). Actual lens imperfections: chromatic aberration, vignetting, slight corner softness, dust spots. Real lighting physics with inverse square falloff, color temperature shifts 2700K-5500K, mixed light sources creating color casts. Authentic dive bar setting with visible dirt, wear, scuffs, stains, peeling paint, scratched surfaces. Natural candid moment with micro-expressions, slight motion blur, asymmetry. Zero AI smoothing, zero perfect symmetry, zero artificial beauty filters, zero plastic skin. This must be indistinguishable from a real photograph shot on actual film or digital sensor with all its imperfections. "

run 31 "Champagne sequin + wet hair + fog" "${ULTRA_REAL}Sony A7 III 35mm f/1.8, ISO 3200, f/2.0, 1/60s. Woman at White Owl Social Club entrance wearing champagne sequin slip dress with spaghetti straps, black diamond-pattern fishnet tights, burgundy patent stilettos. Hair wet slicked-back look with water droplets, just stepped in from rain. Dense fog from machine diffusing amber string lights into soft golden orbs. Vintage taxidermy owl on wood paneling background. Red exit sign crimson glow. Handheld slight 1.2-degree tilt. Chromatic aberration magenta fringing on sequins. Fog creates natural diffusion. Motion blur on left hand pushing wet hair behind ear. 2 AM stepped-inside-from-rain glamour moment."

run 32 "Forest green bandage + blacklight" "${ULTRA_REAL}Canon R6 50mm f/1.2, ISO 6400, f/1.4, 1/50s. Woman leaning on pool table at Grizzly Hall wearing forest green bandage dress with horizontal ribbing, square neck, long sleeves. Black leather knee-high boots with silver buckles. Sleek low ponytail, not a strand out of place. Blacklight UV tubes behind bar, white elements glow purple-blue. Pool table felt bright green under UV. Blue Pabst + orange Lone Star signs background. Shallow DOF bokeh orbs. Lens flare streak upper right. Low angle across pool table. Prominent grain ISO 6400. Pool cue visible foreground out of focus. Otherworldly club atmosphere."

END=$(date +%s)
DURATION=$((END - START))
echo "Success: $SUCCESS | Failed: $FAIL | Time: $((DURATION / 60))m"

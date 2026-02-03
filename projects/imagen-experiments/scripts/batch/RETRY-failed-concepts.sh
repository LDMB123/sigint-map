#!/bin/bash

# Retry the 13 failed concepts from batch 1-30 with longer delays

IMAGE="/Users/louisherman/Documents/LWMMoms - 374.jpeg"
DELAY=120  # Increased to 120 seconds
FACE_LOCK=" CRITICAL: This is IMAGE EDIT - preserve EXACT facial features, bone structure, eyes, nose, mouth of reference woman. ONLY change: outfit, setting, lighting, hair as described. Face must remain 100% identical."

echo "================================================================"
echo "RETRYING 13 FAILED CONCEPTS (Longer 120-second delays)"
echo "================================================================"
echo ""
read -p "Press Enter to begin..."

START=$(date +%s)
SUCCESS=0
FAIL=0

run() {
    echo ""
    echo "=== RETRY CONCEPT $1/30 - $2 ==="
    if node nanobanana-direct.js edit "$IMAGE" "$3$FACE_LOCK"; then
        echo "✅ Complete"
        SUCCESS=$((SUCCESS+1))
    else
        echo "❌ Failed"
        FAIL=$((FAIL+1))
    fi
    echo "⏳ Waiting $DELAY sec..."
    sleep $DELAY
}

# Only the 13 failed concepts (based on log analysis)
# Concepts that hit 429 errors: 2, 4, 5, 8, 11, 14, 15, 17, 18, 20, 23, 27, 28, 30

run 2 "Emerald velvet + thigh-highs" "Woman in emerald velvet mini dress, black thigh-high stockings with lace. Hole in the Wall Austin, poster wall. Wild messy hair. 78% frame, serious expression. Edison bulbs + purple neon. Nikon Z6 III 85mm f/1.4, ISO 5000, grain, bokeh."

run 4 "Burgundy wrap" "Woman in burgundy wrap dress, gold strappy heels. Carousel Lounge Austin, at bar. Hair in falling-apart bun, messy. 76% frame, mid-laugh. Rotating carousel light + pendants. Fuji X-T5 56mm f/1.4, ISO 5000, motion blur."

run 5 "Royal blue sequin + thigh-highs" "Woman in royal blue sequined dress, black opaque thigh-highs. Mean-Eyed Cat Austin, picnic table. Hair in waves, one side tucked. 74% frame, calm steady gaze. Caged work light + Christmas lights. Canon R6 II 50mm f/1.6, ISO 4000."

run 8 "Gold metallic + fishnet thigh-highs" "Woman in gold metallic halter dress, nude fishnet thigh-highs. White Horse Austin, crowded Saturday. Long straight center-part hair. 73% frame, flirty knowing smile. Stage lights + exit sign + Christmas lights. Sony A7R V 50mm f/1.2, ISO 6400, bokeh chaos."

run 11 "Teal satin + thigh-highs" "Woman in teal satin slip dress with lace trim, black lace-top thigh-highs. Sahara Lounge Austin, corner walls. Loose undone side braid. 74% frame, serious direct. Edison bulbs + green fluorescent + tin lanterns. Sony A7C II 50mm f/1.4, ISO 4000, swirly bokeh."

run 14 "Yellow chiffon + white thigh-highs" "Woman in yellow chiffon tiered ruffle dress, white opaque thigh-highs. Barfly's Austin, pool table. Long beachy salt-textured waves. 75% frame, secretive smile. Pool table lamp green bounce + Dos Equis neon. Canon R8 50mm f/2.0, ISO 3600."

run 15 "Black cutout" "Woman in black cutout architectural dress, red patent pumps. Ellow Austin, cocktail table. Slicked-back wet-look gel hair. 78% frame, intense flat stare. LED tape + halogen spot. Sony A1 85mm f/1.4, ISO 4000, compressed background."

run 17 "Dark green leather + thigh-highs" "Woman in dark green leather halter crop + skirt set, black ribbed thigh-highs. Scoot Inn Austin, backstage area. Slicked ponytail with flyaways. 77% frame, sultry smirk. Bare stage bulbs + colored gels. Ricoh GR IIIx 40mm f/2.8, ISO 6400, compact sensor grain."

run 18 "White lace" "Woman in white lace mini dress, silver heeled sandals. Continental Club Austin, red vinyl booth. Loose romantic curls. 75% frame, soft dreamy smile. Red booth lighting + stage spots + mirror ball. Nikon Z6 III 50mm f/1.4, ISO 4000, red glow."

run 20 "Dusty rose + wild curly hair" "Woman in dusty rose pink wrap dress, nude ankle-strap heels. Workhorse Bar Austin, corner banquette. Natural curly hair big and free, full halo. 72% frame, genuine warm laugh. Pendant lamps + window street light + candles. Sony A7 III 50mm f/1.8, ISO 4000."

run 23 "Deep plum satin + boots" "Woman in deep plum satin cowl dress, burgundy leather boots. Barton Springs Saloon Austin, wooden bar. Elegant low chignon. 73% frame, serene closed-lip smile. Pendant brass lamps + backlit bottles + string lights. Nikon Zf 40mm f/2.0, ISO 4000, retro sensor."

run 27 "Electric blue sequin + wild hair" "Woman in electric blue sequined bodycon dress, silver metallic heels. Cheer Up Charlies Austin, dance floor edge. Completely wrecked sweaty hair. 77% frame, euphoric dancing smile. DJ booth lights + colored strobes + fog. Leica M11-P 50mm f/1.4, ISO 6400, rangefinder rendering."

run 28 "Mauve knit + gray thigh-highs" "Woman in mauve pink ribbed knit dress, charcoal gray thigh-highs. Kitty Cohen's Austin, vintage armchair. Messy French twist coming undone. 75% frame, flirty wink. Vintage lamps + candelabra + velvet curtain backdrop. Canon R7 35mm f/1.4, ISO 4000, APS-C crop."

run 30 "Midnight black jersey" "Woman in midnight black jersey wrap dress, nude pointed pumps. Yellow Jacket Social Club Austin, cozy booth. Effortless tousled waves. 74% frame, warm knowing smile. Warm Edison clusters + candles + wood warmth. Canon 5D IV 50mm f/1.4, ISO 5000, closing shot aesthetic."

END=$(date +%s)
ELAPSED=$((END - START))
MIN=$((ELAPSED / 60))
SEC=$((ELAPSED % 60))

echo ""
echo "================================================================"
echo "RETRY COMPLETE!"
echo "================================================================"
echo "✅ Success: $SUCCESS"
echo "❌ Failed: $FAIL"
echo "⏱️  Time: ${MIN}m ${SEC}s"
echo "📁 ~/nanobanana-output/"
echo "================================================================"

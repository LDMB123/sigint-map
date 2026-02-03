#!/bin/bash

# FINAL: Generate all 30 dive bar portrait concepts
# Maintains reference woman's face while transforming outfits and settings

IMAGE="/Users/louisherman/Documents/LWMMoms - 374.jpeg"
DELAY=75
FACE_LOCK=" CRITICAL: This is IMAGE EDIT - preserve EXACT facial features, bone structure, eyes, nose, mouth of reference woman. ONLY change: outfit, setting, lighting, hair as described. Face must remain 100% identical."

echo "================================================================"
echo "GENERATING 30 UNIQUE DIVE BAR PORTRAITS"
echo "================================================================"
echo "Preserving reference woman's facial features in all concepts"
echo "Estimated time: 40-45 minutes"
echo "================================================================"
echo ""
read -p "Press Enter to begin..."

START=$(date +%s)
SUCCESS=0
FAIL=0

run() {
    echo ""
    echo "=== CONCEPT $1/30 - $2 ==="
    if node nanobanana-direct.js edit "$IMAGE" "$3$FACE_LOCK"; then
        echo "✅ Complete"
        SUCCESS=$((SUCCESS+1))
    else
        echo "❌ Failed"
        FAIL=$((FAIL+1))
    fi
    [ $1 -lt 30 ] && echo "⏳ Waiting $DELAY sec..." && sleep $DELAY
}

# All 30 concepts with condensed prompts + face-lock
run 1 "Black leather" "Woman in black leather mini dress, bare legs, stilettos. Ego's Lounge Austin. Seated on red vinyl stool, 75% frame, confident smirk. Lone Star neon + bulb lighting. Canon R5 50mm f/1.4, ISO 4000, warm WB 4200K, underexposed 1 stop, grain, vignetting."

run 2 "Emerald velvet + thigh-highs" "Woman in emerald velvet mini dress, black thigh-high stockings with lace. Hole in the Wall Austin, poster wall. Wild messy hair. 78% frame, serious expression. Edison bulbs + purple neon. Nikon Z6 III 85mm f/1.4, ISO 5000, grain, bokeh."

run 3 "Hot pink + boots" "Woman in hot pink satin one-shoulder dress, cream knee-high suede boots. Nickel City Austin, leather booth. Sleek hair over shoulder. 72% frame, soft smile. Pool table lamp + Miller neon. Sony A7 IV 35mm f/1.8, ISO 3200, green bounce light."

run 4 "Burgundy wrap" "Woman in burgundy wrap dress, gold strappy heels. Carousel Lounge Austin, at bar. Hair in falling-apart bun, messy. 76% frame, mid-laugh. Rotating carousel light + pendants. Fuji X-T5 56mm f/1.4, ISO 5000, motion blur."

run 5 "Royal blue sequin + thigh-highs" "Woman in royal blue sequined dress, black opaque thigh-highs. Mean-Eyed Cat Austin, picnic table. Hair in waves, one side tucked. 74% frame, calm steady gaze. Caged work light + Christmas lights. Canon R6 II 50mm f/1.6, ISO 4000."

run 6 "White eyelet + wild hair" "Woman in white eyelet puff-sleeve dress, tan fringe boots. Ginny's Longhorn Austin, doorway. Windblown tangled hair. 70% frame, playful defiant smile. Backlit doorway + chili lights. Leica SL2-S 50mm f/1.4, ISO 6400, lens flare."

run 7 "Orange knit" "Woman in orange ribbed turtleneck dress, black ankle boots. Deep Eddy Cabaret Austin, leather chair near jukebox. Straight blunt bob. 77% frame, sultry intense. Jukebox glow + pendant lamp. Nikon Z8 50mm f/1.2, ISO 3600, color bands."

run 8 "Gold metallic + fishnet thigh-highs" "Woman in gold metallic halter dress, nude fishnet thigh-highs. White Horse Austin, crowded Saturday. Long straight center-part hair. 73% frame, flirty knowing smile. Stage lights + exit sign + Christmas lights. Sony A7R V 50mm f/1.2, ISO 6400, bokeh chaos."

run 9 "Navy off-shoulder + boots" "Woman in navy off-shoulder dress, brown leather riding boots. Broken Spoke Austin, dance floor edge. High sleek ponytail. 72% frame, warm easy smile. Overhead fluorescent + Tecate neon. Canon R3 35mm f/1.8, ISO 3200, floor angle."

run 10 "Silver holographic + wild curls" "Woman in silver holographic cowl dress, clear perspex heels. Donn's Depot Austin, bar stool. Big voluminous frizzy curls, wild. 75% frame, sleepy satisfied smile. Rotating mirror ball + backlit bottles. Fuji GFX 80mm f/1.7, ISO 5000, medium format bokeh."

run 11 "Teal satin + thigh-highs" "Woman in teal satin slip dress with lace trim, black lace-top thigh-highs. Sahara Lounge Austin, corner walls. Loose undone side braid. 74% frame, serious direct. Edison bulbs + green fluorescent + tin lanterns. Sony A7C II 50mm f/1.4, ISO 4000, swirly bokeh."

run 12 "Coral bodycon" "Woman in coral ribbed mock-neck dress, nude block heels. Skylark Lounge Austin, leaning on bar. Straight mid-back hair tucked behind ears. 76% frame, skeptical smirk. Red-gelled track lights + blue neon + candle. Pentax K-1 III 50mm f/1.6, ISO 5000, red-dominant."

run 13 "Purple velvet + boots + wild hair" "Woman in purple velvet bell-sleeve dress, gray suede knee-high boots. The Liberty Austin, wooden bench. Just-removed-hat hair, flat on top. 73% frame, wide toothy grin. Rattan lamp dappled light + PBR clock. Nikon Z5 50mm f/2.0, ISO 4000."

run 14 "Yellow chiffon + white thigh-highs" "Woman in yellow chiffon tiered ruffle dress, white opaque thigh-highs. Barfly's Austin, pool table. Long beachy salt-textured waves. 75% frame, secretive smile. Pool table lamp green bounce + Dos Equis neon. Canon R8 50mm f/2.0, ISO 3600."

run 15 "Black cutout" "Woman in black cutout architectural dress, red patent pumps. Ellow Austin, cocktail table. Slicked-back wet-look gel hair. 78% frame, intense flat stare. LED tape + halogen spot. Sony A1 85mm f/1.4, ISO 4000, compressed background."

run 16 "Champagne satin + wild hair" "Woman in champagne gold satin slip dress, nude strappy heels. Sam's Town Point Austin, vintage booth. Hair falling from updo, bobby pins visible. 74% frame, knowing half-smile. Amber wall sconces + Edison string + neon beer clock. Leica Q3 28mm f/1.7, ISO 5000, wide environmental."

run 17 "Dark green leather + thigh-highs" "Woman in dark green leather halter crop + skirt set, black ribbed thigh-highs. Scoot Inn Austin, backstage area. Slicked ponytail with flyaways. 77% frame, sultry smirk. Bare stage bulbs + colored gels. Ricoh GR IIIx 40mm f/2.8, ISO 6400, compact sensor grain."

run 18 "White lace" "Woman in white lace mini dress, silver heeled sandals. Continental Club Austin, red vinyl booth. Loose romantic curls. 75% frame, soft dreamy smile. Red booth lighting + stage spots + mirror ball. Nikon Z6 III 50mm f/1.4, ISO 4000, red glow."

run 19 "Bright red bandage + OTK boots" "Woman in bright red bandage dress, black over-knee suede boots. Stay Gold Austin, standing by vintage pinball. Side-swept waves. 76% frame, confident direct smirk. Pinball machine glow + neon beer signs. Canon R5 II 35mm f/1.4, ISO 5000, colorful chaos."

run 20 "Dusty rose + wild curly hair" "Woman in dusty rose pink wrap dress, nude ankle-strap heels. Workhorse Bar Austin, corner banquette. Natural curly hair big and free, full halo. 72% frame, genuine warm laugh. Pendant lamps + window street light + candles. Sony A7 III 50mm f/1.8, ISO 4000."

run 21 "Olive green utility" "Woman in olive green twill mini shirtdress, combat boots. Longbranch Inn Austin, high-top table. Messy low bun with escaped pieces. 75% frame, thoughtful slight smile. Overhead can lights + neon Lone Star + TVs. Hasselblad X2D 55mm f/2.5, ISO 3200, medium format depth."

run 22 "Bright orange mesh" "Woman in bright orange mesh overlay dress, black platform heels. Violet Crown Social Club Austin, velvet couch. Half-up top knot, face-framing pieces. 78% frame, playful tongue-out smile. Colored LED strips + disco ball + uplighting. Olympus OM-1 II 25mm f/1.2, ISO 5000, MFT sensor."

run 23 "Deep plum satin + boots" "Woman in deep plum satin cowl dress, burgundy leather boots. Barton Springs Saloon Austin, wooden bar. Elegant low chignon. 73% frame, serene closed-lip smile. Pendant brass lamps + backlit bottles + string lights. Nikon Zf 40mm f/2.0, ISO 4000, retro sensor."

run 24 "Midnight navy velvet + wild hair" "Woman in midnight navy velvet off-shoulder dress, black stilettos. Hotel Vegas Austin, outdoor patio. Post-dancing messy hair stuck to face. 76% frame, exhilarated breathless expression. String cafe lights + fire pit glow + neon signs. Sigma fp L 45mm f/2.8, ISO 6400."

run 25 "Ivory silk + blush thigh-highs" "Woman in ivory silk charmeuse slip dress, blush pink sheer thigh-highs. Draught House Austin, beer garden table. Soft waves with vintage hair clips. 74% frame, gentle serene smile. Hanging lanterns + fairy lights + oak tree shadows. Fuji X-H2S 56mm f/1.2, ISO 4000."

run 26 "Rust suede + cowboy boots" "Woman in rust suede mini dress, black leather cowboy boots. Poodle Dog Lounge Austin, pool table. Braided crown, loose ends. 72% frame, competitive smirk. Pool table overhead + jukebox glow + beer signs. Panasonic S5 IIX 50mm f/1.4, ISO 5000."

run 27 "Electric blue sequin + wild hair" "Woman in electric blue sequined bodycon dress, silver metallic heels. Cheer Up Charlies Austin, dance floor edge. Completely wrecked sweaty hair. 77% frame, euphoric dancing smile. DJ booth lights + colored strobes + fog. Leica M11-P 50mm f/1.4, ISO 6400, rangefinder rendering."

run 28 "Mauve knit + gray thigh-highs" "Woman in mauve pink ribbed knit dress, charcoal gray thigh-highs. Kitty Cohen's Austin, vintage armchair. Messy French twist coming undone. 75% frame, flirty wink. Vintage lamps + candelabra + velvet curtain backdrop. Canon R7 35mm f/1.4, ISO 4000, APS-C crop."

run 29 "Leopard print mesh" "Woman in leopard print mesh overlay dress, black patent boots. Lost Well Austin, graffiti wall. Wild teased volume hair. 78% frame, fierce confident stare. Neon signs + blacklight + industrial pendants. Sony A7C 28mm f/2.0, ISO 6400, wide punchy."

run 30 "Midnight black jersey" "Woman in midnight black jersey wrap dress, nude pointed pumps. Yellow Jacket Social Club Austin, cozy booth. Effortless tousled waves. 74% frame, warm knowing smile. Warm Edison clusters + candles + wood warmth. Canon 5D IV 50mm f/1.4, ISO 5000, closing shot aesthetic."

END=$(date +%s)
ELAPSED=$((END - START))
MIN=$((ELAPSED / 60))
SEC=$((ELAPSED % 60))

echo ""
echo "================================================================"
echo "COMPLETE!"
echo "================================================================"
echo "✅ Success: $SUCCESS"
echo "❌ Failed: $FAIL"
echo "⏱️  Time: ${MIN}m ${SEC}s"
echo "📁 ~/nanobanana-output/"
echo "================================================================"

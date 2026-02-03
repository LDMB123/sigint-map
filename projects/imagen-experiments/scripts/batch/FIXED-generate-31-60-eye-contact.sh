#!/bin/bash

# FIXED: Generate concepts 31-60 with DIRECT EYE CONTACT enforcement
# Adding explicit "looking directly at camera" to every prompt

IMAGE="/Users/louisherman/Documents/LWMMoms - 374.jpeg"
DELAY=120
EYE_CONTACT=" She is looking directly at the camera with direct eye contact."
FACE_LOCK=" CRITICAL: This is IMAGE EDIT - preserve EXACT facial features, bone structure, eyes, nose, mouth of reference woman. ONLY change: outfit, setting, lighting, hair as described. Face must remain 100% identical."
NANOSCRIPT="/Users/louisherman/ClaudeCodeProjects/projects/imagen-experiments/scripts/nanobanana-direct.js"

echo "================================================================"
echo "FIXED GENERATION: Concepts 31-60 with DIRECT EYE CONTACT"
echo "================================================================"
echo "Adding explicit eye contact instruction to every prompt"
echo "================================================================"
echo ""

START=$(date +%s)
SUCCESS=0
FAIL=0

run() {
    echo ""
    echo "=== CONCEPT $1/60 - $2 ==="
    # Insert eye contact instruction BEFORE face lock
    if node "$NANOSCRIPT" edit "$IMAGE" "$3$EYE_CONTACT$FACE_LOCK"; then
        echo "✅ Complete"
        SUCCESS=$((SUCCESS+1))
    else
        echo "❌ Failed"
        FAIL=$((FAIL+1))
    fi
    [ $1 -lt 60 ] && echo "⏳ Waiting $DELAY sec..." && sleep $DELAY
}

# Resume from concept 40
run 40 "Burgundy leather + amber uplighting" "Nikon Z8 58mm f/1.4, ISO 5000, f/1.6, 1/60s. Woman on velvet bench at Garage Bar wearing burgundy leather mini dress, structured bodice, cap sleeves. Gold metallic tights, burgundy suede ankle boots gold zipper. Slicked-back wet-look hair gel. Amber LED uplighting from floor creates dramatic shadows upward on face. Concrete walls, exposed ductwork, industrial aesthetic. Red neon sign background blurred. 58mm focal length shallow DOF. Amber glow makes burgundy appear almost brown in highlights. Chromatic aberration magenta/green. Lens vignetting heavy. Upward-cast shadows unflattering but dramatic. Underground club vibe. ISO grain textured. Moody atmospheric portrait."

run 41 "Powder blue slip + colored gels" "Canon 5D IV 85mm f/1.2, ISO 5000, f/1.4, 1/60s. Woman at Midnight Cowboy dimly lit intimate space wearing powder blue silk slip dress, lace trim, cowl neckline, bias cut. Silver metallic strappy heels. Side-swept waves pinned with rhinestone clips. Stage with colored gel lights - magenta + cyan throwing theatrical colored shadows on her face and dress. Velvet curtain backdrop deep burgundy. Single spotlight harsh from above. Very dark except light pools. 85mm compression stacks background elements. Extreme shallow DOF. Bokeh has colored halation. Grain visible. Film noir theatrical atmosphere. Performer waiting backstage vibe."

run 42 "Tangerine silk + bathroom mirror + wet hair" "iPhone 15 Pro Max rear camera wide, ISO 4000, computational processing. Woman in bathroom mirror at Weather Up wearing tangerine silk mini dress, high neck, keyhole back. Black ankle-strap heels. Hair wet post-shower look, dripping water droplets on shoulders. Harsh overhead bathroom fluorescent creating unflattering shadows. Mirror has edge lighting LED creating cool blue border. Tile wall background, paper towel dispenser visible. Mirror slightly smudged. Natural messy bathroom candid. Fluorescent green-tinted shadows. Genuine bathroom mirror selfie aesthetic authentic lighting."

run 43 "Mint green two-piece + boots" "Nikon Z9 24mm f/1.8, ISO 2800, f/2.2, 1/80s. Woman at Roosevelt Room sitting in booth wearing mint green knit two-piece: cropped turtleneck + high-waisted mini skirt. Burgundy leather knee-high riding boots flat heel. Loose romantic curls. Candlelight only - multiple candles on booth table creating intimate warm glow. Background very dark. Wide 24mm shows more environment. Art deco cocktail bar styling. Crystal chandelier bokeh background. Her hand holding crystal cocktail glass catches candlelight. Warm vs cool split toning. Shallow DOF but wider than 50mm. Candle flame sharp star points."

run 44 "Emerald velvet + opera gloves" "Fuji X-H2S 56mm f/1.2, ISO 3200, f/1.4, 1/80s. Woman leaning on brick wall outside backdoor of The Liberty wearing emerald green velvet mini dress, sweetheart neckline, fitted bodice. Black opera gloves satin above elbow. Black fishnet stockings, emerald satin pumps. Victory rolls vintage hairstyle. Single yellow bug light above back door creating sickly greenish cast. Brick texture, metal fire escape ladder background. Cigarette smoke curling up (no cigarette visible). Bug light attracts moths, one mid-flight motion blur. Extremely shallow DOF on 56mm. Velvet texture rich detail. Urban alley glamour. Stepped outside for air moment."

run 45 "Lavender chiffon + flower crown" "Canon R3 35mm f/1.4, ISO 2000, f/1.8, 1/100s. Woman on outdoor patio at Cosmic Coffee + Beer Garden wearing lavender chiffon mini dress, tiered ruffles, off-shoulder sleeves. Bare legs, white platform espadrilles. Fresh flower crown - baby's breath + small lavender roses. Late afternoon dappled sunlight through string lights and tree canopy. Picnic tables, string lights with Edison bulbs. Ivy-covered fence background. Shallow DOF bokeh. Chiffon catches breeze, slight motion blur on ruffles. Warm 6 PM summer light. Beer garden casual festival vibe. Natural candid reportage style. Dreamy romantic atmosphere."

run 46 "Plum sequin halter + braided updo" "Sony A1 50mm f/1.2, ISO 6400, f/1.2, 1/50s. Woman at karaoke stage at High Noon wearing plum purple sequin halter mini dress, deep V neck, backless. Black sheer tights with vertical seam, black patent platform heels. Hair in intricate braided crown updo. Karaoke stage lighting - single moving head spotlight cycling colors, currently magenta. Background very dark, microphone stand silhouette. TV monitor with lyrics blue glow background. Shallow DOF isolates her from background. Sequins create bokeh reflections. Motion blur on arm gesturing. Spotlight overexposes sequins creating glow. About to sing moment. Grain prominent ISO 6400."

run 47 "Rose gold metallic + high ponytail" "Nikon Z6 III 85mm f/1.8, ISO 4000, f/1.8, 1/80s. Woman at dart board at The Cavalier wearing rose gold metallic bodycon mini dress, long sleeves, crew neck. Black leather thigh-high stiletto boots. High ponytail, slicked edges, hair wrapped around base. Dart board background with yellow/red/green segments. Single overhead pendant light creating spotlight effect. Wood paneling dark brown. Beer taps blurred background. 85mm compression. Dart in hand mid-throw motion blur. Metallic dress catches overhead light, dark everywhere else. Heavy vignetting. Grain texture. Candid action shot. Competitive dart game moment."

run 48 "Ivory lace overlay + messy French twist" "Canon EOS R5 50mm f/1.2, ISO 3200, f/1.4, 1/60s. Woman at window booth at craft cocktail bar Midnight Cowboy wearing ivory lace overlay mini dress, scalloped edges, cap sleeves, nude slip underneath. Nude sheer stockings, ivory satin kitten heels pearl detail. Hair in messy French twist, pieces falling out. Natural window light late afternoon, soft diffused overcast sky. Interior dim by comparison. Window creates natural softbox. Lace detail sharp, background bar shelves bokeh. Split lighting - bright window side, dark bar side. Chromatic aberration on lace edges. Romantic portrait lighting. Waiting for someone moment."

run 49 "Mustard knit + ankle boots" "Fuji X-T5 23mm f/1.4, ISO 2500, f/2.0, 1/90s. Woman sitting backward on chair at Deep Eddy Cabaret wearing mustard yellow ribbed knit mini dress, turtleneck, long sleeves. Brown suede ankle boots block heel. Hair in low messy bun, flyaways. Arms crossed on chair back. Vintage beer signs, wood paneling, pool table background. Overhead fluorescent bar lighting unflattering greenish cast. 23mm wider perspective shows environment. Chair in foreground creates depth. Grain visible. Casual relaxed pose. Neighborhood dive bar afternoon. Slightly underexposed, shadows dark. Authentic candid moment."

run 50 "Hot pink bandage + slicked side part" "Sony A7R V 55mm f/1.8, ISO 5000, f/1.8, 1/60s. Woman at neon-lit booth at Barbarella wearing hot pink bandage dress, horizontal ribbed texture, square neck. Black patent leather thigh-high boots. Hair slicked deep side part, tucked behind ear. Neon lights - pink + blue + purple creating colored shadows and highlights on face and dress. Chrome table surface reflects neon. Very dark except neon pools. 55mm portrait length. Shallow DOF. Pink dress almost glowing under pink neon. Chromatic aberration rainbow fringing. Grain texture prominent. Retro 80s nightclub aesthetic. Electronic music venue vibe."

run 51 "Steel blue satin + victory rolls" "Nikon Z9 35mm f/1.4, ISO 3200, f/1.8, 1/100s. Woman at vintage jukebox at Skylark Lounge wearing steel blue satin slip dress, cowl neck, bias cut. Black seamed stockings, black T-strap heels. Hair in perfect victory rolls, 1940s style. Jukebox colored lights reflecting on satin - red, blue, yellow. Vintage vinyl records on wall background. Red vinyl booth. Chrome accents. Period-accurate retro aesthetic. Satin has realistic pooling and wrinkles. Jukebox light creates colored reflections on her face. Shallow DOF. Chromatic aberration. Warm nostalgic atmosphere. Vintage glamour moment."

run 52 "Teal sequin mini + space buns" "Canon R6 II 50mm f/1.2, ISO 8000, f/1.2, 1/40s. Woman at packed dance floor edge at Mohawk wearing teal sequin mini dress, spaghetti straps, straight across neckline. Fishnet tights, black combat boots. Two space buns, neon pink scrunchies. Stage lights in background - moving heads, colored beams cutting through haze. Crowd silhouettes background. Very dark, only stage wash lighting. Sequins catch light creating sparkle. Motion blur on background crowd. ISO 8000 heavy grain. Purple + green stage wash. Lens flare from stage lights. Concert venue energy. About to dance moment."

run 53 "Chocolate brown suede + loose waves" "Fuji X-S20 35mm f/1.4, ISO 2000, f/2.0, 1/80s. Woman at firepit patio at Cosmic Coffee wearing chocolate brown suede mini dress, fringe details, long sleeves. Tan leather knee-high boots western style. Hair in loose beachy waves. Firepit creating warm orange glow on face, flickering light. Adirondack chairs, string lights overhead unlit, dusk blue hour sky. Natural twilight fill light. Fire creates warm key light. Smoke wisps. Motion blur on fire flames. Split toning warm fire vs cool twilight. Shallow DOF. Cozy outdoor fire gathering vibe."

run 54 "Champagne lace bodycon + sleek low bun" "Sony A7 IV 85mm f/1.4, ISO 4000, f/1.4, 1/60s. Woman at marble bar top at Firehouse Lounge wearing champagne nude lace bodycon mini dress, high neck, long sleeves, illusion panels. Nude heels. Hair in sleek low bun, center part. Upscale cocktail bar, marble bar top, brass fixtures. Pendant lights Edison bulbs creating warm overhead glow. Liquor bottles backlit shelf background bokeh. 85mm compression. Extremely shallow DOF. Lace texture detail. Classy sophisticated atmosphere. Cocktail glass foreground out of focus. Elegant evening moment."

run 55 "Scarlet wrap dress + textured ponytail" "Nikon Z8 50mm f/1.2, ISO 3200, f/1.4, 1/80s. Woman at booth at Dozen Street wearing scarlet red wrap mini dress, deep V, tie waist, long sleeves. Black sheer tights, black suede ankle boots. High textured ponytail, bumped crown, crimped texture. Booth's red vinyl matching dress. Neon beer signs background - Shiner Bock orange glow. Wood paneling. Overhead pendant light. Red-on-red tonal challenge. Shallow DOF. Motion blur on hand adjusting dress tie. Warm incandescent lighting. Neighborhood bar casual elegance. Grain visible."

run 56 "Periwinkle chiffon + half-up twist" "Canon R5 C 24mm f/1.4, ISO 2500, f/1.8, 1/100s. Woman on outdoor string-light patio at Meanwhile Brewing wearing periwinkle blue chiffon mini dress, flutter sleeves, smocked bodice. Bare legs, nude strappy sandals. Hair half-up half-down with twist, loose curls below. Golden hour magic hour lighting, warm 7 PM glow. String lights with Edison bulbs overhead creating bokeh. Picnic tables, beer garden, oak trees background. Wide 24mm shows environment. Chiffon catches golden light, semi-transparent. Lens flare from setting sun. Dappled light through leaves. Dreamy beer garden summer evening."

run 57 "Graphite leather + edgy pixie cut" "Sony A9 III 35mm f/1.4, ISO 6400, f/1.4, 1/50s. Woman leaning on brick wall outside Barracuda wearing graphite grey leather mini dress, asymmetric zipper, structured shoulders, long sleeves. Black fishnet tights, black leather ankle boots silver hardware. Edgy pixie cut, swept to one side. Single exterior wall light creating harsh side-lighting. Brick texture, graffiti background, metal door. Urban gritty aesthetic. Shallow DOF. Leather texture detail. Heavy grain ISO 6400. Chromatic aberration on zipper. Cool-toned moonlight vs warm artificial light. Stepped outside for air rockstar moment."

run 58 "Blush pink satin + romantic updo" "Fuji X-H2 56mm f/1.2, ISO 2000, f/1.2, 1/60s. Woman at candlelit corner table at Small Victory wearing blush pink satin mini dress, cowl neck, spaghetti straps. Nude heels. Romantic updo with loose curls framing face, baby's breath flowers tucked in. Almost entirely candlelight - pillar candles and tea lights creating soft warm glow. Background very dark. Champagne coupe catches candlelight. 56mm portrait focal length. Extremely shallow DOF, f/1.2. Satin has subtle wrinkles and realistic sheen. Candlelight creates warm flattering skin tones. Bokeh orbs from background candles. Intimate date night atmosphere."

run 59 "Slate grey knit + casual ponytail" "Nikon Z6 II 35mm f/1.8, ISO 3200, f/2.0, 1/90s. Woman at outdoor picnic table at Hold Out Brewing afternoon wearing slate grey ribbed knit mini sweater dress, mock turtleneck. White crew socks, white Converse sneakers. Hair in casual low ponytail, loose and easy. Afternoon overcast diffused natural light, no harsh shadows. Picnic table, beer flights, brewery warehouse background. 35mm documentary style. Grain visible. Casual Sunday brewery hang. Natural candid reportage. Slightly underexposed. Authentic brewery patio atmosphere."

run 60 "Magenta velvet + glam waves" "Canon R3 50mm f/1.2, ISO 5000, f/1.2, 1/60s. Woman at velvet booth at Volstead Lounge wearing magenta fuschia velvet mini dress, square neckline, puff sleeves. Black sheer tights, black velvet pumps. Hair in Old Hollywood glam waves, deep side part. Art deco bar interior, brass fixtures, green glass lamp. Booth velvet deep emerald contrasts magenta dress. Low warm tungsten lighting. Cocktail glass Art Deco coupe style. 50mm shallow DOF. Velvet texture rich detail. Chromatic aberration warm edges. Grain texture. Prohibition-era glamour. Sophisticated speakeasy atmosphere."

END=$(date +%s)
DURATION=$((END - START))
MINUTES=$((DURATION / 60))
SECONDS=$((DURATION % 60))

echo ""
echo "================================================================"
echo "FIXED BATCH COMPLETE"
echo "Success: $SUCCESS | Failed: $FAIL"
echo "Time: ${MINUTES}m ${SECONDS}s"
echo "================================================================"

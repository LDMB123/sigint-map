#!/bin/bash

# Generate concepts 81-90 using NEW reference image
# Using 120-second delays to avoid rate limits

IMAGE="/Users/louisherman/Documents/463976510_8492755290802616_5918817029264776918_n.jpeg"
DELAY=120
EYE_CONTACT=" She is looking directly at the camera with direct eye contact."
FACE_LOCK=" CRITICAL: This is IMAGE EDIT - preserve EXACT facial features, bone structure, eyes, nose, mouth of reference woman. ONLY change: outfit, setting, lighting, hair as described. Face must remain 100% identical."
NANOSCRIPT="/Users/louisherman/ClaudeCodeProjects/projects/imagen-experiments/scripts/nanobanana-4k-edit.js"

echo "================================================================"
echo "GENERATING CONCEPTS 81-90 - 4K PHOTOREALISTIC - THIRD REFERENCE IMAGE"
echo "================================================================"
echo "10 new concepts using blonde reference image"
echo "Estimated time: ~21 minutes"
echo "================================================================"
echo ""

START=$(date +%s)
SUCCESS=0
FAIL=0

run() {
    echo ""
    echo "=== CONCEPT $1/90 - $2 ==="
    if node "$NANOSCRIPT" edit "$IMAGE" "$3$EYE_CONTACT$FACE_LOCK"; then
        echo "✅ Complete"
        SUCCESS=$((SUCCESS+1))
    else
        echo "❌ Failed"
        FAIL=$((FAIL+1))
    fi
    [ $1 -lt 90 ] && echo "⏳ Waiting $DELAY sec..." && sleep $DELAY
}

run 81 "Electric blue sequin + voluminous waves + dance floor lights" "Sony A7R V with FE 35mm f/1.4 GM lens at f/1.4. ISO 8000, shutter speed 1/40s. White balance 5000K daylight creating cool cast. Woman at edge of dance floor at Empire Control Room wearing electric blue sequin mini dress with deep V-neckline and thin straps. Black sheer tights with subtle shimmer, electric blue metallic stiletto heels. Hair in voluminous blonde waves with maximum body and lift, swept to one side. Moving head stage lights creating colored beams cutting through haze - cyan, magenta, amber. Background crowd silhouettes with motion blur. Very high ISO creating heavy grain texture and color noise in shadows. Sequins create thousands of micro-reflections catching every light source. Lens flare from stage spots. 35mm allows environmental context. Chromatic aberration creates rainbow fringing around sequin highlights. Concert venue energy."

run 82 "Crimson velvet + sleek straight + candlelit booth" "Nikon Z8 with Z 50mm f/1.2 S lens at f/1.2. ISO 2500, shutter speed 1/60s. White balance 3200K warm. Woman in curved booth at Péché wearing crimson red velvet mini dress with high mock neckline and long sleeves. Nude sheer stockings, crimson velvet pumps. Hair sleek straight platinum blonde with center part, glossy and smooth. Multiple pillar candles varying heights on table creating 2400K flickering warm illumination - constantly shifting highlights on velvet texture. Background almost black. Shot from across intimate table at eye level. Extremely shallow f/1.2 depth of field. Candle flames create natural star patterns. Background candles rendered as warm amber bokeh orbs. Velvet shows directional pile texture. Martini glass catches candlelight creating caustic patterns."

run 83 "Rose gold metallic + high ponytail + rooftop sunset" "Canon EOS R5 with RF 24mm f/1.4L USM at f/1.8. ISO 1600, shutter speed 1/250s. White balance 5200K for sunset. Woman on rooftop patio at Sunset Strip wearing rose gold metallic mini dress with halter neckline and low back. Bare legs, rose gold strappy sandals with ankle ties. Hair in ultra-high sleek ponytail, platinum blonde hair wrapped around base. Golden hour sunset 7:15 PM creating warm 4500K directional backlight. Austin skyline silhouette background, string lights not yet lit. Wide 24mm shows environmental context. Metallic dress shifts from rose to champagne gold. Natural sunset creates rim lighting on hair. Lens flare from setting sun creating hazy dreamy quality. Motion blur on ponytail swinging."

run 84 "Jet black leather + tousled waves + motorcycle headlight" "Fuji X-T5 with XF 56mm f/1.2 R APD lens at f/1.2. ISO 6400, shutter speed 1/50s. White balance 4800K cool. Woman leaning against vintage motorcycle outside Handlebar wearing jet black leather mini dress with asymmetric zipper and structured shoulders. Black fishnet tights, black leather ankle boots with silver buckles. Hair in tousled voluminous waves, platinum blonde with dark roots showing. Single motorcycle headlight creating harsh key light with hard shadows. Brick wall texture, chrome motorcycle details catching light. Urban gritty aesthetic. 56mm creates extreme shallow depth. Leather shows texture detail and realistic creases. Heavy grain from high ISO. Cool moonlight provides subtle fill vs warm headlight. Smoke or breath vapor visible."

run 85 "Lavender chiffon + braided crown + firefly string lights" "Canon R6 Mark II with RF 35mm f/1.8 IS STM at f/1.8. ISO 3200, shutter speed 1/100s. White balance 3400K warm. Woman at outdoor garden patio at Whisler's Mezcal Bar wearing lavender purple chiffon mini dress with flutter sleeves and smocked waist. Bare legs, nude espadrille wedges. Hair in intricate braided crown with platinum blonde strands woven together, loose waves cascading down. Fairy string lights overhead creating tiny warm bokeh points like fireflies. Dappled 8:30 PM blue hour twilight creating 7500K cool ambient fill. Potted plants, wooden picnic tables background. Chiffon semi-transparent catches backlight creating ethereal glow. Motion blur on chiffon fabric in evening breeze. Split toning - cool twilight vs warm string lights."

run 86 "Onyx sequin + side-swept glam + mirror ball" "Sony A1 with FE 85mm f/1.4 GM lens at f/1.4. ISO 5000, shutter speed 1/60s. White balance 3800K. Woman at vintage disco area at Barbarella wearing onyx black sequin mini dress with square neckline and cap sleeves. Black sheer tights, black patent leather platform heels. Hair side-swept over one shoulder in platinum blonde waves with glamorous volume. Vintage mirror ball rotating overhead creating hundreds of moving light spots across scene. Colored gel spotlights - pink, blue, purple creating retro 70s disco atmosphere. 85mm compression isolates subject. Sequins create specular highlights that shift with every mirror ball reflection. Background rendered as colored bokeh with moving light spots. Heavy grain texture. Motion blur on some mirror ball reflections."

run 87 "Sage green satin + messy low bun + afternoon patio" "Nikon Z6 III with Z 24mm f/1.8 S lens at f/2.0. ISO 2000, shutter speed 1/125s. White balance 5800K daylight. Woman at sunny afternoon patio at Easy Tiger Bake Shop wearing sage green satin mini dress with tie straps and A-line cut. White ribbed knee-high socks, brown leather loafers. Hair in genuinely messy low bun with flyaways and texture, platinum blonde with pieces falling out. Afternoon overcast diffused natural light 3 PM - soft shadowless illumination. Picnic tables, beer steins, bakery building background. Wide 24mm documentary environmental style. Satin shows realistic wrinkles and matte sheen in natural light. Casual Sunday afternoon brewery vibe. Motion blur on swinging leg. Natural candid reportage aesthetic."

run 88 "Fuchsia bandage + slicked back wet look + neon reflections" "Canon EOS R3 with RF 50mm f/1.2L USM at f/1.2. ISO 6400, shutter speed 1/50s. White balance 5500K daylight creating cool tone. Woman at neon-lit bar at Barbarella wearing fuchsia pink bandage dress with horizontal ribbed texture and high neck. Black patent leather thigh-high boots. Hair slicked back completely off face in wet-look gel, platinum blonde hair showing texture. Multiple neon signs - pink BAR, blue martini glass, purple script creating colored reflections on glossy bar top. Chrome and mirror surfaces multiply reflections. Very dark except neon pools. 50mm at f/1.2 creates razor-thin depth. Fuchsia dress almost glowing under pink neon. Chromatic aberration creates intense rainbow fringing. Heavy grain and color noise. Retro 80s aesthetic."

run 89 "Ivory lace + loose romantic curls + chapel candles" "Fuji X-H2S with XF 50mm f/1.0 R WR lens at f/1.0. ISO 1600, shutter speed 1/60s. White balance 3000K very warm. Woman at candlelit corner of Hotel San José bar wearing ivory cream lace mini dress with scalloped hem and three-quarter sleeves. Nude sheer stockings, ivory satin kitten heels with pearl detail. Hair in loose romantic curls, platinum blonde with volume and soft waves. Dozens of votive candles creating 2300K warm romantic glow. Background almost completely dark. Shot with f/1.0 creating impossibly shallow depth - only eyes in focus. Candles create warm bokeh orbs filling background. Lace texture shows intricate detail where sharp. Chromatic aberration creates warm soft halos. Intimate ethereal atmosphere."

run 90 "Tangerine silk + space buns + karaoke spotlight" "Sony A9 III with FE 35mm f/1.4 GM lens at f/1.4. ISO 10000, shutter speed 1/30s. White balance 4200K. Woman on karaoke stage at High Noon Saloon wearing tangerine orange silk mini dress with cowl neckline and spaghetti straps. Black opaque tights, tangerine satin platform heels. Hair in two high space buns, platinum blonde creating playful aesthetic. Single moving head spotlight currently amber/orange creating monochromatic orange glow. Background completely black. TV monitor with lyrics creating blue accent light from side. Microphone on stand foreground out of focus. 35mm environmental stage context. Extremely high ISO creates heavy grain almost like film texture. Color noise prominent in shadows. Silk fabric shows realistic draping and highlights. Motion blur on hand mid-gesture."

END=$(date +%s)
DURATION=$((END - START))
MINUTES=$((DURATION / 60))
SECONDS=$((DURATION % 60))

echo ""
echo "================================================================"
echo "BATCH 81-90 COMPLETE"
echo "Success: $SUCCESS | Failed: $FAIL"
echo "Time: ${MINUTES}m ${SECONDS}s"
echo "================================================================"

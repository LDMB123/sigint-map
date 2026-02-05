#!/bin/bash

# Generate concepts 61-80 using NEW reference image (Image 56.jpeg)
# Using 120-second delays to avoid rate limits

IMAGE="/Users/louisherman/Documents/Image 56.jpeg"
DELAY=120
EYE_CONTACT=" She is looking directly at the camera with direct eye contact."
FACE_LOCK=" CRITICAL: This is IMAGE EDIT - preserve EXACT facial features, bone structure, eyes, nose, mouth of reference woman. ONLY change: outfit, setting, lighting, hair as described. Face must remain 100% identical."
NANOSCRIPT="/Users/louisherman/ClaudeCodeProjects/projects/imagen-experiments/scripts/nanobanana-direct.js"

echo "================================================================"
echo "GENERATING CONCEPTS 61-80 - NEW REFERENCE IMAGE"
echo "================================================================"
echo "20 new concepts using Image 56.jpeg"
echo "Estimated time: ~43 minutes"
echo "================================================================"
echo ""

START=$(date +%s)
SUCCESS=0
FAIL=0

run() {
    echo ""
    echo "=== CONCEPT $1/80 - $2 ==="
    if node "$NANOSCRIPT" edit "$IMAGE" "$3$EYE_CONTACT$FACE_LOCK"; then
        echo "✅ Complete"
        SUCCESS=$((SUCCESS+1))
    else
        echo "❌ Failed"
        FAIL=$((FAIL+1))
    fi
    [ $1 -lt 80 ] && echo "⏳ Waiting $DELAY sec..." && sleep $DELAY
}

# Concepts 61-70
run 61 "Black velvet + sleek ponytail + Edison bulbs" "Canon EOS R5 with RF 50mm f/1.2L USM lens at f/1.4. ISO 3200, shutter speed 1/80s. White balance set to 3800K. Woman at Yellow Jacket Social Club wearing black velvet mini dress with square neckline and three-quarter sleeves. Black sheer tights with back seam, black suede ankle boots with block heel. Hair pulled back in sleek high ponytail with center part, baby hairs smoothed down with gel. Vintage Edison bulb string lights overhead creating warm 2800K amber pools with inverse square falloff. Exposed brick wall background, wooden bar top foreground. Shot from 6 feet away at slight downward angle. Shallow depth of field isolates subject from background. Chromatic aberration creates magenta fringing on dress edges in highlights. Natural lens vignetting darkens corners. Visible grain structure from high ISO. Velvet texture catches light creating directional sheen. Motion blur on dangling earring."

run 62 "Ruby red sequin + messy bun + neon signs" "Sony A7 IV with 35mm f/1.4 GM lens at f/1.8. ISO 6400, shutter speed 1/60s. White balance daylight 5600K creating cool cast against warm neon. Woman at Friends Bar wearing ruby red sequin mini dress with spaghetti straps and cowl neckline. Fishnet tights with large diamond pattern, black patent leather platform heels. Hair in genuinely messy bun - chunks falling out, bobby pins visible, textured and imperfect. Multiple neon beer signs background - red Budweiser, blue Pabst Blue Ribbon, green Heineken creating colored glow on her face and dress. Signs slightly out of focus creating bokeh halos. Compressed 35mm perspective. Handheld shooting creating 0.8-degree tilt. Heavy grain texture from extreme ISO. Sequins create specular highlights and micro-reflections. Color noise visible in shadow areas. Pool table felt visible foreground."

run 63 "Navy blue satin + side braid + candlelight" "Nikon Z6 III with Z 50mm f/1.2 S lens at f/1.4. ISO 2000, shutter speed 1/50s. White balance set too warm at 4500K. Woman in booth at Nickel City wearing navy blue satin slip dress with lace trim and bias cut. Nude sheer stockings, navy velvet pumps with ankle strap. Hair in loose side braid over right shoulder with face-framing pieces. Multiple pillar candles on table varying heights creating flickering 2400K warm glow - constantly shifting highlights and shadows. Background very dark, booth leather barely visible. Tea lights in amber glass holders. Shot from across booth at eye level. Extremely shallow depth of field at f/1.4. Candle flames create natural lens flare star patterns. Background candles rendered as warm bokeh orbs. Satin fabric shows realistic wrinkles and light pooling."

run 64 "Emerald green wrap + beach waves + fireplace glow" "Fuji X-T5 with XF 56mm f/1.2 R lens at f/1.4. ISO 3200, shutter speed 1/60s. White balance auto struggling between 2900K fireplace and 3200K bar lighting. Woman on leather couch near fireplace at The Grand wearing emerald green wrap mini dress with tie waist and long sleeves. Black opaque tights, brown leather ankle boots. Hair in natural beach waves with subtle texture and movement. Wood-burning fireplace right side creating intense 2200K orange-yellow glow with inverse square falloff. Fire creates constantly flickering highlights. Smoke heat distortion visible in air near flames. Exposed brick, stacked firewood background. Wall sconces providing 3200K fill light. Split toning - warm fire side, cooler ambient side. Motion blur in fire flames."

run 65 "Burgundy leather + victory rolls + pool table lights" "Canon R6 Mark II with RF 85mm f/1.2L USM at f/1.4. ISO 5000, shutter speed 1/80s. White balance tungsten 3200K. Woman leaning against pool table at Dive Bar wearing burgundy leather mini dress with structured bodice and cap sleeves. Black fishnet tights, burgundy suede knee-high boots. Hair styled in perfect 1940s victory rolls with deep side part. Overhead pool table pendant light creating hard top-down illumination with dramatic shadows. Green felt pool table bright under direct light. Background very dark with scattered neon signs out of focus. 85mm focal length creates extreme compression and shallow depth of field. Pool balls foreground soft focus creating depth. Chromatic aberration on leather highlights. Heavy vignetting from natural lens falloff."

run 66 "Hot pink bandage + space buns + blacklight" "Sony A7R V with FE 50mm f/1.2 GM lens at f/1.2. ISO 8000, shutter speed 1/40s. White balance cool 6500K for blacklight. Woman at bar at Barracuda wearing hot pink bandage dress with horizontal ribbed texture and mock neck. White fishnet tights glowing under UV, hot pink platform heels. Hair in two high space buns with loose tendrils. Blacklight UV tubes behind bar making white elements glow purple-blue. Pool table felt glows bright green. Tonic water in glasses glows blue. Neon beer signs - Lone Star orange, Miller Lite blue. Shallow depth creates bokeh orbs from neon. Lens flare from UV lights. Very high ISO creates heavy grain and color noise. Hot pink dress creates unusual glow under blacklight."

run 67 "Champagne sequin + low chignon + jukebox glow" "Nikon Z8 with Z 35mm f/1.8 S lens at f/2.0. ISO 4000, shutter speed 1/100s. White balance 3600K. Woman at vintage Wurlitzer jukebox at Skylark Lounge wearing champagne gold sequin mini dress with V-neck and flutter sleeves. Nude sheer stockings with reinforced toe, champagne satin pumps. Hair in elegant low chignon at nape with textured finish. Jukebox cycling through colored lights - red, blue, amber, yellow creating constantly changing colored reflections on sequins and face. Vinyl records on wall background. Chrome jukebox details. 35mm wider perspective shows more environment. Sequins create thousands of specular highlights. Jukebox light creates colored rim lighting. Motion blur on hand selecting song."

run 68 "Forest green velvet + crimped hair + fog machine" "Canon EOS R3 with RF 24mm f/1.4L USM at f/1.8. ISO 3200, shutter speed 1/125s. White balance 3400K. Woman near entrance at Mohawk wearing forest green velvet mini dress with sweetheart neckline and puff sleeves. Black seamed stockings, forest green velvet ankle boots. Hair crimped 80s style creating wild textured volume. Dense fog from machine filling space, diffusing all light sources into soft glowing orbs. Red exit sign creating crimson glow through fog. String lights become diffused amber spheres. Fog creates natural atmospheric perspective. Wide 24mm shows environmental context. Handheld with slight 1.5-degree tilt. Velvet texture rich in sharp areas. Motion blur on fog wisps."

run 69 "Plum purple satin + sleek bob + amber uplighting" "Sony A1 with FE 55mm f/1.8 ZA lens at f/1.8. ISO 5000, shutter speed 1/60s. White balance 3000K warm. Woman on velvet bench at Small Victory wearing plum purple satin mini dress with halter neckline and open back. Black sheer tights, plum satin d'Orsay heels. Hair in sleek bob cut at chin length with blunt ends and shine. Amber LED uplighting from floor creating dramatic upward shadows on face - unconventional and moody. Concrete walls, industrial exposed ductwork ceiling. Red neon sign distant background bokeh. 55mm portrait focal length. Shallow depth of field. Satin shows realistic light pooling and wrinkles. Upward lighting creates film noir aesthetic."

run 70 "Ivory lace + half-up twist + window light" "Fuji X-H2S with XF 50mm f/1.0 R WR lens at f/1.2. ISO 1600, shutter speed 1/80s. White balance 5500K daylight. Woman at window booth at Rio Rita wearing ivory lace mini dress with scalloped edges and cap sleeves over nude slip. Nude sheer stockings, ivory satin kitten heels. Hair half-up with twist, loose waves below. Natural window light late afternoon creating soft diffused illumination - window acts as giant softbox. Interior dim by comparison creating strong contrast. Split lighting - bright window side, dark bar side. Lace texture sharp where light hits, shadow side soft. Background bar shelves and bottles bokeh. Chromatic aberration on lace edge details."

# Concepts 71-80
run 71 "Copper metallic + top knot + colored gels" "Canon R5 C with RF 85mm f/1.2L USM at f/1.2. ISO 6400, shutter speed 1/50s. White balance 4000K. Woman at stage area at Mohawk wearing copper metallic mini dress with asymmetric one-shoulder design. Black fishnet tights, copper metallic platform sandals. Hair in high textured top knot with volume. Stage lighting with colored gel filters - magenta and cyan creating theatrical colored shadows across face and dress. Single spotlight from above creating key light. Background very dark except colored light pools. 85mm extreme compression. Shallow depth of field at f/1.2 isolates subject completely. Metallic dress shifts rose gold to bronze in different angles. Colored shadows create surreal lighting. Heavy grain texture."

run 72 "Slate grey knit + loose ponytail + patio string lights" "Nikon Z9 with Z 24mm f/1.8 S lens at f/2.0. ISO 2500, shutter speed 1/100s. White balance 3200K warm tungsten. Woman at outdoor picnic table at Meanwhile Brewing wearing slate grey ribbed knit sweater dress with turtleneck. White crew socks, grey suede ankle boots. Hair in casual loose low ponytail with flyaways and texture. String lights with Edison bulbs overhead creating warm bokeh orbs. Dappled late afternoon light through oak tree leaves creating moving shadow patterns. Beer garden atmosphere - picnic tables, cooler visible, other patrons blurred background. Wide 24mm environmental context. Natural candid aesthetic. Motion blur on swinging leg."

run 73 "Scarlet red wrap + textured waves + booth leather" "Sony A7 IV with FE 50mm f/1.4 ZA lens at f/1.4. ISO 4000, shutter speed 1/60s. White balance 3400K. Woman in red vinyl booth at Dozen Street wearing scarlet red wrap mini dress with deep V-neckline and tie waist. Black sheer tights, black suede pumps. Hair in textured waves with volume and movement. Red vinyl booth matching dress color creating tonal challenge. Neon beer signs background - Shiner Bock orange glow, Lone Star blue. Overhead pendant light with metal shade creating focused downlight. Red-on-red requires careful exposure. Shallow depth of field. Motion blur on hand adjusting wrap tie. Warm incandescent 2900K lighting."

run 74 "Mint green satin + braided crown + candlelit table" "Canon R6 with RF 35mm f/1.8 IS STM at f/1.8. ISO 2000, shutter speed 1/60s. White balance 3000K very warm. Woman at candlelit table at Firehouse Lounge wearing mint green satin mini dress with cowl neckline. Tan sheer stockings, mint green satin ankle-strap heels. Hair in braided crown around head with textured finish. Multiple candles on marble table - pillar candles and votives creating 2400K warm romantic glow. Background very dark with liquor bottles catching candlelight. Upscale cocktail bar atmosphere. Satin shows realistic sheen and wrinkles. Candle flames create star flare. Background bokeh warm orbs."

run 75 "Charcoal leather + edgy pixie + exterior wall light" "Fuji X-T4 with XF 35mm f/1.4 R lens at f/1.4. ISO 6400, shutter speed 1/50s. White balance 4200K cool. Woman leaning on brick wall outside The Liberty wearing charcoal grey leather mini dress with asymmetric zipper and structured shoulders. Black fishnet tights, black leather combat boots. Hair in edgy pixie cut swept to one side with texture paste. Single exterior wall-mounted light creating harsh side lighting. Brick wall texture, metal door, graffiti tag background. Urban gritty aesthetic. Shallow depth of field. Leather texture detail sharp. Heavy grain from high ISO. Chromatic aberration on metal zipper. Cool moonlight vs warm artificial light color contrast."

run 76 "Periwinkle chiffon + flower crown + golden hour" "Sony A9 III with FE 24mm f/1.4 GM lens at f/1.8. ISO 2000, shutter speed 1/125s. White balance 4800K for golden hour. Woman on outdoor patio at Cosmic Coffee + Beer Garden wearing periwinkle blue chiffon mini dress with flutter sleeves and smocked bodice. Bare legs, nude strappy sandals. Fresh flower crown - baby's breath and small periwinkle flowers. Golden hour magic hour lighting 6:45 PM - warm directional sunlight at low angle. String lights overhead creating bokeh when backlit. Dappled light through tree leaves. Beer garden picnic tables, ivy fence background. Wide 24mm environmental shot. Chiffon semi-transparent catches backlight. Lens flare from setting sun creating hazy glow."

run 77 "Magenta velvet + glam waves + Art Deco interior" "Nikon Z7 II with Z 50mm f/1.2 S lens at f/1.2. ISO 3200, shutter speed 1/60s. White balance 2900K warm tungsten. Woman at velvet booth at Volstead Lounge wearing magenta fuchsia velvet mini dress with square neckline and puff sleeves. Black sheer tights, black velvet pumps. Hair in Old Hollywood glam waves with deep side part and shine. Art Deco cocktail bar - brass fixtures, green glass banker's lamp, geometric patterns. Booth in deep emerald velvet contrasting magenta dress. Low warm tungsten lighting. Art Deco coupe cocktail glass. Extremely shallow depth of field. Velvet texture rich detail where sharp. Prohibition-era glamour."

run 78 "Tangerine silk + wet hair + bathroom mirror" "iPhone 15 Pro Max computational photography. ISO 4000, f/1.78 equivalent, 1/30s. White balance auto 4500K. Woman in bathroom at Weather Up wearing tangerine orange silk mini dress with high neck and keyhole back. Black ankle-strap heels. Hair wet slicked back - just washed, water droplets on shoulders and visible in hair. Harsh overhead bathroom fluorescent lighting 5000K creating unflattering shadows. LED mirror border creating cool blue 6000K edge lighting. Tile wall background, paper towel dispenser, mirror slightly smudged. Genuine messy bathroom candid aesthetic. Fluorescent creates green-tinted shadows."

run 79 "Dusty rose sequin + messy French twist + karaoke stage" "Canon EOS R with RF 50mm f/1.2L USM at f/1.2. ISO 8000, shutter speed 1/40s. White balance 3800K. Woman at karaoke stage at High Noon wearing dusty rose sequin mini dress with halter neckline and backless design. Nude sheer tights, dusty rose satin platform heels. Hair in messy French twist with pieces falling out. Karaoke stage lighting - moving head spotlight currently in pink/magenta color. Background very dark. TV monitor with lyrics creating blue glow in background. Microphone stand silhouette. Shallow depth of field isolates her completely. Sequins create bokeh reflections and specular highlights. Motion blur on arm mid-gesture."

run 80 "Chocolate brown suede + loose curls + firepit patio" "Fuji X-S20 with XF 35mm f/1.4 R lens at f/2.0. ISO 2500, shutter speed 1/80s. White balance 2800K for firelight. Woman at outdoor firepit at Cosmic Coffee wearing chocolate brown suede mini dress with fringe details and long sleeves. Tan leather western-style knee-high boots. Hair in loose natural curls with volume and texture. Firepit creating warm 2200K orange flickering glow on face - constantly changing highlights. Adirondack chairs, string lights overhead (unlit), dusk blue hour sky 8 PM creating cool 8000K fill light. Natural twilight ambient vs warm fire key light. Smoke wisps from fire. Motion blur on flames. Split toning warm/cool. Shallow depth of field."

END=$(date +%s)
DURATION=$((END - START))
MINUTES=$((DURATION / 60))
SECONDS=$((DURATION % 60))

echo ""
echo "================================================================"
echo "BATCH 61-80 COMPLETE"
echo "Success: $SUCCESS | Failed: $FAIL"
echo "Time: ${MINUTES}m ${SECONDS}s"
echo "================================================================"

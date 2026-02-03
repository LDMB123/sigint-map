#!/bin/bash

# Generate concepts 31-60 (NEW batch with Sonnet thinking)
# Using 120-second delays to avoid rate limits

IMAGE="/Users/louisherman/Documents/LWMMoms - 374.jpeg"
DELAY=120
FACE_LOCK=" CRITICAL: This is IMAGE EDIT - preserve EXACT facial features, bone structure, eyes, nose, mouth of reference woman. ONLY change: outfit, setting, lighting, hair as described. Face must remain 100% identical."

echo "================================================================"
echo "GENERATING CONCEPTS 31-60 (NEW BATCH - Sonnet Concepts)"
echo "================================================================"
echo "30 brand new concepts with 120-second delays"
echo "Estimated time: ~65-70 minutes"
echo "================================================================"
echo ""
read -p "Press Enter to begin..."

START=$(date +%s)
SUCCESS=0
FAIL=0

run() {
    echo ""
    echo "=== CONCEPT $1/60 - $2 ==="
    if node nanobanana-direct.js edit "$IMAGE" "$3$FACE_LOCK"; then
        echo "✅ Complete"
        SUCCESS=$((SUCCESS+1))
    else
        echo "❌ Failed"
        FAIL=$((FAIL+1))
    fi
    [ $1 -lt 60 ] && echo "⏳ Waiting $DELAY sec..." && sleep $DELAY
}

# Concepts 31-40
run 31 "Champagne sequin + wet hair + fog" "Sony A7 III 35mm f/1.8, ISO 3200, f/2.0, 1/60s. Woman at White Owl Social Club entrance wearing champagne sequin slip dress with spaghetti straps, black diamond-pattern fishnet tights, burgundy patent stilettos. Hair wet slicked-back look with water droplets, just stepped in from rain. Dense fog from machine diffusing amber string lights into soft golden orbs. Vintage taxidermy owl on wood paneling background. Red exit sign crimson glow. Handheld slight 1.2-degree tilt. Chromatic aberration magenta fringing on sequins. Fog creates natural diffusion. Motion blur on left hand pushing wet hair behind ear. 2 AM stepped-inside-from-rain glamour moment."

run 32 "Forest green bandage + blacklight" "Canon R6 50mm f/1.2, ISO 6400, f/1.4, 1/50s. Woman leaning on pool table at Grizzly Hall wearing forest green bandage dress with horizontal ribbing, square neck, long sleeves. Black leather knee-high boots with silver buckles. Sleek low ponytail, not a strand out of place. Blacklight UV tubes behind bar, white elements glow purple-blue. Pool table felt bright green under UV. Blue Pabst + orange Lone Star signs background. Shallow DOF bokeh orbs. Lens flare streak upper right. Low angle across pool table. Prominent grain ISO 6400. Pool cue visible foreground out of focus. Otherworldly club atmosphere."

run 33 "Copper metallic asymmetric + space buns" "Nikon Z6 II 35mm f/1.8, ISO 2500, f/2.2, 1/80s. Woman sideways on vintage leather barstool at Volstead Lounge wearing copper metallic asymmetric one-shoulder dress, diagonal hemline. Brushed copper shifts orange to rose gold. Sheer nude shimmer thigh-highs, black platform ankle-strap heels. Two high space buns, loose strands framing face. Prohibition-era dark wood, vintage Edison bulbs. Green glass shade table lamp film noir side-lighting. Mason jar candle warm flicker. Shot from behind bar looking back. Vignetting corners. Motion blur on swinging dangling leg. Ornate mirror reflects bottles. Copper dress reflection on dark wood bar. 8 PM golden hour of bar time."

run 34 "Charcoal sweater dress + fireplace" "Fuji X-T4 23mm f/1.4, ISO 1600, f/1.8, 1/60s. Woman cross-legged on worn leather couch near fireplace at Aristocrat Lounge wearing charcoal grey cable-knit sweater dress, turtleneck, ribbed cuffs. White athletic ankle socks above black patent Mary Jane chunky heels. Hair in genuinely messy bun, chunks falling out. Wood-burning fireplace right side creating flickering warm orange-yellow light, constantly shifting highlights. Wall sconces amber glass secondary fill. Stacked firewood, exposed brick, vintage armchairs background. Smoke/heat distortion waviness right side. Split-toned warm fire vs cool bar ambient. Camera resting on chair arm, low angle. Underexposed shadows make fire highlights dramatic. Wine glass foreground soft focus. Cozy Sunday afternoon day-drinking."

run 35 "Fuchsia cutout + crimped hair + jukebox" "Canon R5 28mm f/1.8, ISO 4000, f/2.0, 1/100s. Woman at jukebox at King Bee wearing fuchsia pink mini dress, geometric waist cutouts, mock neck, long sleeves. Black tights large white polka dots, black leather combat boots yellow stitching. Hair crimped 80s style, wild textured volume halo. Partially turned away looking at jukebox, finger pointing at glass. Vintage Wurlitzer cycling red/blue/amber colored reflections. String lights exposed filament warm bokeh. Green Heineken + red Budweiser neon out of focus. Handheld slight angle, 8 feet away. Lens flare star burst from jukebox light. Motion blur on pointing hand. Fuchsia slightly overexposed soft glow. Grain ISO 4000. Beer bottle on jukebox top. Compressed 28mm perspective. Picking perfect song moment."

run 36 "Cream satin two-piece + candles" "Sony A7R IV 55mm f/1.8, ISO 800, f/2.0, 1/50s. Woman at small round table Drinks Lounge wearing cream satin two-piece: cropped V-neck long-sleeve top + high-waisted mini skirt, champagne-cream lustrous. Tan suede thigh-high stiletto boots. Vintage finger waves hair, old Hollywood S-shaped waves. Almost entirely candlelight - multiple pillar candles varying heights, soft flattering illumination. Tea lights amber glass votives. Background very dark, silhouettes only. Dusk window cool blue-purple fill vs warm candle. Shot from across table seated eye level. Shallow DOF background candles warm bokeh orbs. Chromatic aberration warm halos around flames. Satin has realistic wrinkles. Cocktail coupe glass catches candlelight. Special date night elegant moment."

run 37 "Cobalt backless + windswept + window" "Nikon Z7 II 50mm f/1.4, ISO 1250, f/1.8, 1/125s. Woman near large open window at Rio Rita during golden hour wearing cobalt blue high-neck completely backless dress, thin neck strap. Bare legs, nude strappy thin ankle-tie sandals. Hair windswept blown across face by window breeze, strands mid-motion blur. Natural late afternoon sunlight streaming through window bright backlight, hair rim light glow effect, lens flare streaks. Warm golden 5:30 PM spring light. Copper shade pendant lights dim compared to natural. Colorful wall murals pink/yellow background out of focus. Ceiling fan subtle motion blur. Shot inside looking toward window, silhouette with edge lighting. Strong lens flare hazy dreamy reduced contrast. Blue dress glows along edges. Dust particles visible in light shaft. Hand raised catching windblown hair. Spontaneous window-wind movie drama."

run 38 "Black mesh + bedhead + phone glow" "Canon R6 35mm f/1.4, ISO 12800, f/1.4, 1/30s. Woman in booth at Whisler's dark back section wearing black mini dress with mesh semi-sheer overlay, long sleeves. Red fishnet tights, black platform boots chunky soles silver buckles. Genuine bedhead hair - flat one side, volume other, pieces sticking out odd angles. Extremely dark, lit primarily by phone screen she looks down at, blue-white glow illuminating face from below unflattering but authentic. Dramatic under-lighting shadows cast upward. Small red LED beer sign distance subtle red rim light on hair. Background nearly black, booth edges dark shapes. ISO 12800 very prominent grain almost textured. Phone screen rectangular reflection on table. Color noise darkest shadows. Shot across booth looking down. Motion blur on scrolling thumb. Extreme low light purple/green color casts. Soft focus overall. Authentic late-night checking phone in dark corner."

run 39 "Sage shirt dress + knee socks" "Fuji X-T4 35mm f/1.4, ISO 2000, f/2.0, 1/60s. Woman leaning on bar at Small Victory Bar wearing sage green button-front shirt dress, collar, rolled sleeves three-quarter, fabric belt at waist. Borrowed-from-boys casual aesthetic. White knee-high cable knit socks, burgundy leather penny loafers. Dramatic deep side part hair, one side swept pinned behind ear, other side volume. Directly under industrial copper cone pendant creating pool of warm spotlight illumination from above. Strong face/shoulder definition, bar falls to darkness. Natural overhead vignette. Chalkboard menus colored chalk background. Backlit bottles small colored points. Dark wood bar with grain and glass rings. Craft beer tulip glass amber liquid. Slight upward angle bartender perspective. Pendant lens flare top edge. Shallow DOF. Sage muted natural color. Happy hour conversation moment."

run 40 "Burgundy leather + amber uplighting" "Sony A7 III 50mm f/1.2, ISO 3200, f/1.6, 1/60s. Woman on leather wingback chair at Seven Grand wearing burgundy leather wrap dress, deep V, three-quarter sleeves, asymmetric wrap hemline. Supple leather slight sheen realistic creasing. Black opaque matte thigh-highs, black suede ankle boots stacked wooden heel. Hair low loose bun at nape, soft face-framing pieces. Whiskey-library aesthetic: dark wood, taxidermy, vintage leather. Amber uplights hidden behind chair + baseboards creating warm wall glow dramatic shadows. Green-shaded banker's lamp nearby warm task light. Very warm amber 2700K dominant. Low angle shot from floor looking up, editorial fashion perspective. Blurred backlit whiskey bottles warm bokeh. Extreme shallow f/1.6 only face/upper body sharp. Cigar smoke haze diffuses light. Burgundy leather specular highlights. Stepped-out-of-luxury-ad moment."

# Concepts 41-50
run 41 "Powder blue slip + colored gels" "Canon 5D IV 85mm f/1.2, ISO 5000, f/1.4, 1/60s. Woman at Midnight Cowboy dimly lit intimate space wearing powder blue silk slip dress, lace trim, cowl neckline, bias cut. Silver metallic strappy heels. Side-swept waves pinned with rhinestone clips. Stage with colored gel lights - magenta + cyan throwing theatrical colored shadows on her face and dress. Velvet curtain backdrop deep burgundy. Single spotlight harsh from above. Very dark except light pools. 85mm compression stacks background elements. Extreme shallow DOF. Bokeh has colored halation. Grain visible. Film noir theatrical atmosphere. Performer waiting backstage vibe."

run 42 "Tangerine silk + bathroom mirror + wet hair" "iPhone 15 Pro Max rear camera wide, ISO 4000, computational processing. Woman in bathroom mirror at Weather Up wearing tangerine silk mini dress, high neck, keyhole back. Black ankle-strap heels. Hair wet post-shower look, dripping water droplets on shoulders. Harsh overhead bathroom fluorescent creating unflattering shadows. Mirror has edge lighting LED creating cool blue border. Tile wall background, paper towel dispenser visible. She's taking mirror selfie, phone visible in reflection. Mirror slightly smudged. Natural messy bathroom candid. Fluorescent green-tinted shadows. Phone screen also illuminating her face warm. Genuine bathroom selfie aesthetic authentic lighting."

run 43 "Mint green two-piece + boots" "Nikon Z9 24mm f/1.8, ISO 2800, f/2.2, 1/80s. Woman at Roosevelt Room sitting in booth wearing mint green knit two-piece: cropped turtleneck + high-waisted mini skirt. Burgundy leather knee-high riding boots flat heel. Loose romantic curls. Candlelight only - multiple candles on booth table creating intimate warm glow. Background very dark. Wide 24mm shows more environment. Art deco cocktail bar styling. Crystal chandelier bokeh background. Her hand holding crystal cocktail glass catches candlelight. Warm vs cool split toning. Shallow DOF but wider than 50mm. Candle flame sharp star points."

run 44 "Wine velvet + dancing + strobes" "Sony A1 35mm f/1.4, ISO 6400, f/1.8, 1/125s. Woman mid-dance move at Garage Bar wearing wine-colored crushed velvet bodycon dress, spaghetti straps. Black tights, platform heels. High ponytail swinging with motion. Colored strobe lights - red/blue/green flashing creating motion blur trails. Disco ball fragments of light. Other dancers blurred around her. Her arms raised mid-movement slight blur. Fast shutter freezes her but blur on extremities. High ISO grain texture. Chromatic aberration on bright light sources. Energy and movement. Dance floor chaos captured."

run 45 "Steel blue strapless + lightning" "Fuji GFX 100S 63mm f/2.8, ISO 1600, f/3.2, 1/250s. Woman on covered patio at Liberty Bar during thunderstorm wearing steel blue strapless mini dress with sweetheart neckline, structured bodice. Nude pumps. Blown-out hair from wind. Lightning flash illuminating scene from outside - bright white harsh light from storm creating dramatic lighting, freeze-frame effect. Rain visible in background. String lights swaying in wind slight motion blur. Wet concrete floor reflecting lights. Medium format depth, fine detail. Lightning creates edge lighting, hard shadows. Caught in storm moment thriller movie aesthetic."

run 46 "Peach linen + afternoon patio" "Canon R8 50mm f/1.8, ISO 400, f/2.8, 1/500s. Woman on sunny afternoon patio at Easy Tiger wearing peach linen mini dress, button-front, short sleeves, casual summer vibe. Espadrille wedges. Natural wavy hair, sunglasses pushed up on head. Bright afternoon sunlight dappled through patio umbrella creating spotted light/shadow pattern on her and table. Background shows other afternoon patrons, bright and social. Natural daylight photography - properly exposed, vibrant colors, sharp detail. Beer flight on table. Happy hour crowd energy. Caught laughing at something. Natural cheerful daytime bar atmosphere totally different from nighttime concepts."

run 47 "Raspberry pink + patio string lights" "Nikon Z5 35mm f/1.8, ISO 2000, f/2.0, 1/60s. Woman on outdoor patio at Cosmic Coffee + Beer Garden dusk wearing raspberry pink wrap mini dress, flutter sleeves. Ankle boots. Hair in messy French braid falling apart. String lights overhead create warm glow as natural light fades. Blue hour sky background. Picnic table casual seating. Fairy lights in trees. Mix of fading natural + warm string light. Transition time golden blue. Relaxed weekend evening vibe."

run 48 "Camel suede + firepit" "Sony A7C 40mm f/2.5, ISO 3200, f/2.5, 1/60s. Woman near outdoor firepit at Batch Craft Beer + Kolaches wearing camel suede mini shirt dress, fringe details. Brown knee-high suede boots. Hair in low braid over shoulder. Firepit flames creating warm flickering orange light on her face, primary light source. Dark night background, stars visible. Other people silhouettes around fire. Smoke wisps. Natural outdoor night scene. Compact camera rendering. Firelight creates authentic warmth, shadows dance. Campfire storytelling intimate vibe."

run 49 "Mustard yellow + karaoke stage" "Canon R6 II 24mm f/2.8, ISO 5000, f/2.8, 1/80s. Woman on small karaoke stage at Friends Bar wearing mustard yellow mini dress with collar, short sleeves, mod 60s vibe. White go-go boots. Hair in high ponytail with bow. Stage lights overhead - bright spotlights harsh shadows. Microphone in hand mid-song. Small crowd visible in darkness watching. Wide angle shows full stage scene. Harsh stage lighting unflattering but authentic. Karaoke screen glow background. Performing moment energy. Caught mid-performance, mouth open singing."

run 50 "Lavender satin + velvet couch" "Leica Q3 28mm f/1.7, ISO 1600, f/1.7, 1/60s. Woman reclining on tufted purple velvet couch at WatcherBar wearing lavender satin slip dress, cowl neck, thin straps. Silver heels kicked off, barefoot. Hair loose messy waves. Low ambient lounge lighting - table lamps with fabric shades creating soft pools. Vintage bar aesthetic plush furniture. She's relaxed, candid not posed. Leica rendering smooth tonality. Shallow 28mm f/1.7 DOF. Background lounge setting elegant. End of night relaxed moment."

# Concepts 51-60
run 51 "Terracotta suede + thigh-highs + mirror ball" "Nikon Z6 III 50mm f/1.2, ISO 4000, f/1.2, 1/60s. Woman at Dance Across Texas wearing terracotta suede mini dress, fringe hem, sleeveless. Black opaque thigh-highs, tan heeled mules. Hair in high messy bun, pieces everywhere. Mirror ball overhead throwing moving light squares across scene, constantly shifting. Country dance hall vibe. Colored Christmas lights background. Motion in lighting creates dynamic feel. Her holding beer bottle. Western dance hall authentic Texas vibe."

run 52 "Black sequin + afternoon patio braids" "Fuji X-S20 18-55mm at 35mm f/4, ISO 800, f/4, 1/250s. Woman on sunny patio at Lustre Pearl wearing black sequin mini tank dress, daytime sequins. Combat boots. Hair in two messy Dutch braids. Bright afternoon sunlight, properly exposed. Picnic table, food trucks background. Casual Austin daylight scene. Sequins catching sun creating sparkle. APS-C kit lens rendering. Snapshot aesthetic natural light. Weekend afternoon vibe relaxed."

run 53 "Olive green + dancing + disco ball" "Sony A7 III 35mm f/2.8, ISO 6400, f/2.8, 1/125s. Woman dancing at Club de Ville outdoor dance floor wearing olive green mini dress, halter neck. Black tights, platform sneakers. Natural curly hair wild and free. Disco ball fragments of white light everywhere. DJ booth background. Dance crowd around her blurred motion. Arms raised mid-dance joy. Captured movement energy. Night outdoor dance party atmosphere. Authentic club energy."

run 54 "Rose gold metallic + pool table + bun" "Canon R7 50mm f/1.8, ISO 3200, f/2.0, 1/80s. Woman leaning over pool table at Billy's on Burnet lining up shot wearing rose gold metallic mini dress, long sleeves. Black knee-high boots. Hair in high bun with messy pieces. Pool table overhead lamp bright green felt. She's concentrated on shot, body bent over table. Pool cue in hands. APS-C crop sensor. Overhead lamp bright pool of light. Background darker. Caught mid-game focus moment."

run 55 "Graphite grey + thigh-highs + candles" "Nikon Zf 50mm f/2.0, ISO 2500, f/2.0, 1/60s. Woman in dim corner at Firehouse Lounge wearing graphite grey ribbed knit dress, turtleneck. Black sheer thigh-highs with back seam, black heels. Hair in low chignon. Only candlelight - cluster of candles on table. Very dark intimate. Retro Zf rendering. Warm soft candlelight romantic. Background falls to black. Quiet intimate corner conversation. Classic noir lighting."

run 56 "Ivory linen + jukebox + afternoon" "Olympus OM-1 25mm f/1.2, ISO 1600, f/1.8, 1/60s. Woman at jukebox at Crown & Anchor Pub afternoon wearing ivory linen mini dress, button-front, casual. Brown leather sandals. Natural wavy hair. Afternoon light through windows mixing with jukebox colored lights. MFT sensor characteristics. Jukebox creating colored glow. Daytime bar quiet afternoon vibe. Selecting music casual moment."

run 57 "Magenta velvet + outdoor patio dusk" "Panasonic S5 IIX 50mm f/1.4, ISO 2000, f/1.8, 1/60s. Woman on patio at Meanwhile Brewing dusk wearing magenta velvet mini dress, cap sleeves. Black tights, heeled booties. Side braid loose. Dusk natural blue hour light + warm patio string lights. Brewery casual vibe, picnic tables. Other patrons blurred background. Transition lighting natural + artificial mix. Relaxed weekend evening brewery scene."

run 58 "Chocolate brown + boots + low lighting" "Canon 5D IV 85mm f/1.2, ISO 5000, f/1.2, 1/60s. Woman at corner booth at Easy Tiger (downtown) wearing chocolate brown suede mini dress, wrap style. Cognac knee-high boots. Hair half-up half-down. Very low ambient lighting, single candle on table. 85mm compression, extreme shallow DOF. Background bokeh warm lights. Intimate date night lighting. Classic portrait rendering. Warm brown tones throughout monochromatic palette."

run 59 "Sky blue mesh + band watching + wild hair" "Sony A7C 28mm f/2.0, ISO 6400, f/2.0, 1/80s. Woman watching live band at Empire Control Room wearing sky blue mini dress with black mesh overlay. Combat boots. Hair completely wild messy from dancing, stuck to neck with sweat. Stage lights behind band creating backlight, lens flare. Fog machine haze in air. Wide showing her watching band, stage in background. Concert photography feel. Energy of live music. Authentic concert moment sweaty dancing."

run 60 "Midnight blue + last call + phone glow" "iPhone 15 Pro computational, ISO 8000. Woman at bar at Whiskey Thursdays last call 2 AM wearing midnight blue jersey wrap dress. Black heels. Hair messy end of night. Looking at phone for Uber, phone screen illuminating face. Bar closing, lights coming up slightly. Bartender cleaning background. End of night exhausted but happy look. Computational phone photography. Last call waiting for ride authentic end of night scene. Real closing time atmosphere."

END=$(date +%s)
ELAPSED=$((END - START))
MIN=$((ELAPSED / 60))
SEC=$((ELAPSED % 60))

echo ""
echo "================================================================"
echo "BATCH 31-60 COMPLETE!"
echo "================================================================"
echo "✅ Success: $SUCCESS"
echo "❌ Failed: $FAIL"
echo "⏱️  Time: ${MIN}m ${SEC}s"
echo "📁 ~/nanobanana-output/"
echo "================================================================"

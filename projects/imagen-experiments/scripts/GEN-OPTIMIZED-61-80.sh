#!/bin/bash

################################################################################
# GEN-OPTIMIZED-61-80.sh
# Generate concepts 61-80 using research-optimized prompts
#
# Source: OPTIMIZED-concepts-61-80.md
# Reference: /Users/louisherman/Documents/Image 56.jpeg
# Wrapper: nanobanana-4k-edit.js
# Output: /Users/louisherman/nanobanana-output/optimized-61-80/
################################################################################

set -e  # Exit on error, but we'll catch and continue

# Configuration
REFERENCE_IMAGE="/Users/louisherman/Documents/Image 56.jpeg"
WRAPPER_SCRIPT="/Users/louisherman/ClaudeCodeProjects/projects/imagen-experiments/scripts/nanobanana-4k-edit.js"
OUTPUT_DIR="/Users/louisherman/nanobanana-output/optimized-61-80"
DELAY=120  # 120 seconds between generations

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$OUTPUT_DIR/generation.log"
}

log "Starting optimized concept generation (61-80)"
log "Reference image: $REFERENCE_IMAGE"
log "Output directory: $OUTPUT_DIR"

# Concept 61: Barton Springs Saloon - Emerald Silk Cami Dress
log "Generating Concept 61: Barton Springs Saloon - Emerald Silk Cami Dress"
if node "$WRAPPER_SCRIPT" edit "$REFERENCE_IMAGE" "IMAGE EDIT: Preserve exact facial bone structure, eye spacing, nose width, lip shape, jawline, ear shape, skin tone, eye color, eyebrow arch from reference photo. No changes to facial proportions or identity markers.

Camera capture physics: Shot on iPhone 15 Pro rear camera, ISO 2800, f/1.6, 1/60s handheld in dim bar lighting. Phone autofocus hunted in low light, landed 1-2 inches off intended focus plane. Full sensor noise preserved with no computational photography noise reduction, no HDR stacking, no AI smoothing. JPEG compression from phone processing pipeline with 8-bit color depth showing banding in smooth gradients.

Scene narrative: Woman leans against wooden bar rail at Barton Springs Saloon wearing emerald green silk cami dress with delicate straps and bias-cut construction creating fluid drape. Dress hits mid-thigh with lace trim at neckline. Dark opaque hosiery with matte finish, black ankle boots with block heel. Hair styled in loose waves cascading over one shoulder. She holds craft cocktail in coupe glass, condensation visible on glass surface. Bar's rustic Texas aesthetic includes reclaimed wood walls, vintage neon Lone Star sign casting warm amber glow, Edison bulb string lights creating pools of warm illumination overhead.

Light transport and sensor capture: ISO 2800 luminance grain on all surfaces creating texture, color noise speckles (red/green) visible in shadow regions below 18% gray, blue channel 40% noisier than red/green channels. Single overhead Edison bulb cluster at 2700K creating warm color cast on skin, inverse square law producing dramatic falloff where face receives 4x more brightness than background 6 feet behind. Hard shadows under jawline from overhead source, no fill light causing right side of face to fall 3 stops darker. Specular highlights on silk fabric clipping to pure white, deep shadows in bar corners crushing to black.

Imperfection anchors: Phone autofocus locked on cocktail glass in foreground leaving eyes 2 inches behind focus plane creating soft blur, natural 1.5-degree tilt from handheld grip, slight motion blur in left hand as it adjusts hair strand, luminance grain visible across all mid-tone areas." 2>&1 | tee -a "$OUTPUT_DIR/generation.log"; then
    log "Concept 61 completed successfully"
else
    log "ERROR: Concept 61 failed, continuing..."
fi
sleep $DELAY

# Concept 62: Violet Crown Social Club - Coral Linen Wrap Dress
log "Generating Concept 62: Violet Crown Social Club - Coral Linen Wrap Dress"
if node "$WRAPPER_SCRIPT" edit "$REFERENCE_IMAGE" "IMAGE EDIT: Preserve exact facial bone structure, eye spacing, nose width, lip shape, jawline, ear shape, skin tone, eye color, eyebrow arch from reference photo. No changes to facial proportions or identity markers.

Camera capture physics: Shot on iPhone 15 Pro rear camera, ISO 3200, f/1.8, 1/50s handheld in dark speakeasy lighting. Phone autofocus hunted between face and background neon, settled on nose creating front-focus. Full sensor noise preserved with no computational photography processing, no Smart HDR, no Deep Fusion smoothing. JPEG compression artifacts visible in gradient transitions from highlight to shadow.

Scene narrative: Woman sits on velvet barstool at Violet Crown Social Club wearing coral linen wrap dress with tie waist, three-quarter sleeves, asymmetric hemline from wrap construction. Natural linen texture shows wrinkles and creases. Tall dark legwear with sheer appearance, nude platform heels with ankle strap. Hair pulled into high messy bun with strands falling around face and neck. She reads vintage cocktail menu, face tilted down toward pages. Speakeasy setting features dark wood paneling, antique mirrors with aged silvering, green banker's lamp on bar creating focused task light.

Light transport and sensor capture: ISO 3200 sensor noise pattern with luminance grain and red/green color speckles in shadows below 18% gray, blue channel showing 40% more noise than red/green creating visible color mottling in dark booth areas. Green banker's lamp at 2800K creating warm side light on left side of face, inverse square falloff producing 10:1 brightness ratio from near side to far side. Purple neon sign 8 feet distant creating cool rim light at 5500K producing color temperature split. Shadow side of face falling 4 stops below key light with detail loss in darkest areas.

Imperfection anchors: Autofocus front-focused on nose leaving eyes slightly soft, natural 2-degree camera tilt from casual phone grip, color noise creating green and magenta speckles in dark velvet booth background, fixed pattern noise creating faint vertical banding in shadow regions." 2>&1 | tee -a "$OUTPUT_DIR/generation.log"; then
    log "Concept 62 completed successfully"
else
    log "ERROR: Concept 62 failed, continuing..."
fi
sleep $DELAY

# Concept 63: Sahara Lounge - Plum Velvet Square Neck Dress
log "Generating Concept 63: Sahara Lounge - Plum Velvet Square Neck Dress"
if node "$WRAPPER_SCRIPT" edit "$REFERENCE_IMAGE" "IMAGE EDIT: Preserve exact facial bone structure, eye spacing, nose width, lip shape, jawline, ear shape, skin tone, eye color, eyebrow arch from reference photo. No changes to facial proportions or identity markers.

Camera capture physics: Shot on iPhone 15 Pro rear camera, ISO 4000, f/1.6, 1/60s handheld near outdoor stage area. Phone autofocus pulsed three times before locking, creating focus uncertainty. Full sensor noise with no computational reduction, no night mode stacking, no neural engine processing. JPEG compression showing banding in smooth gradient areas like stage smoke.

Scene narrative: Woman stands near outdoor stage at Sahara Lounge wearing plum velvet mini dress with square neckline, long sleeves, body-skimming silhouette. Velvet nap creates directional light and dark tones in fabric. Black ribbed-knit hosiery, dark heeled ankle boots with silver buckle. Hair styled in deep side part swept across forehead, tucked behind one ear. She watches band perform, face lit by colored stage lights. Venue's eclectic atmosphere includes corrugated metal walls, string lights overhead, vintage concert posters, outdoor bar area with mismatched furniture.

Light transport and sensor capture: ISO 4000 luminance grain visible across entire frame creating textured appearance, color noise prominent in shadow areas with red/green speckles below 18% gray, blue channel 40% noisier creating visible color mottling. Stage PAR lights creating colored illumination - magenta gel from left at 3200K tinted purple, amber gel from right at 2900K creating warm orange cast, cyan backlight at 5500K producing cool rim light. Inverse square law creating 8:1 brightness ratio from stage area to dark background 10 feet back. Smoke machine haze in air scattering light creating visible beam paths and reducing contrast.

Imperfection anchors: Motion blur in background guitarist's hands during performance, natural 1-degree tilt from handheld stance, lens flare creating small magenta ghost from brightest stage light, focus hunting artifact creating slight double-edge on one side of face." 2>&1 | tee -a "$OUTPUT_DIR/generation.log"; then
    log "Concept 63 completed successfully"
else
    log "ERROR: Concept 63 failed, continuing..."
fi
sleep $DELAY

# Concept 64: Moontower Saloon - Mustard Knit Bodycon Dress
log "Generating Concept 64: Moontower Saloon - Mustard Knit Bodycon Dress"
if node "$WRAPPER_SCRIPT" edit "$REFERENCE_IMAGE" "IMAGE EDIT: Preserve exact facial bone structure, eye spacing, nose width, lip shape, jawline, ear shape, skin tone, eye color, eyebrow arch from reference photo. No changes to facial proportions or identity markers.

Camera capture physics: Shot on iPhone 15 Pro rear camera, ISO 2500, f/1.8, 1/80s handheld in outdoor beer garden dusk light. Phone autofocus locked on nose creating sharp center with depth falloff. Full sensor noise preserved with no computational smoothing, no photographic styles processing, no tone mapping. JPEG compression creating visible artifacts in high-frequency detail areas like knit texture.

Scene narrative: Woman sits on wooden picnic bench at Moontower Saloon outdoor area wearing mustard yellow ribbed knit bodycon mini dress with mock turtleneck, long sleeves, horizontal rib texture throughout. Fitted silhouette shows fabric stretch. Black cable-knit knee socks, brown leather combat boots with yellow stitching. Hair in low loose ponytail with elastic band, pieces pulled out framing face. She leans forward on picnic table, elbows resting on weathered wood surface. Beer garden setting includes string lights beginning to glow at dusk, corrugated metal roof, food truck visible in background, gravel ground.

Light transport and sensor capture: ISO 2500 sensor noise with luminance grain across mid-tones and shadows, color noise speckles (red/green) visible in darker areas below 18% gray, blue channel showing 40% higher noise creating visible color variation. Fading daylight at 6500K mixing with warm string lights at 2700K creating color temperature split - cool natural fill from overcast sky, warm accent from string bulbs. Inverse square falloff from string lights creating 6:1 brightness ratio from illuminated foreground to darker background. Dusk ambiguity creating exposure compromise - highlights approaching clip while shadows approaching crush.

Imperfection anchors: Natural 1.8-degree tilt from casual phone grip, slight motion blur in hand reaching for beer bottle, chromatic aberration creating magenta fringe on bright string light edges, JPEG compression artifacts visible in mustard knit high-frequency texture." 2>&1 | tee -a "$OUTPUT_DIR/generation.log"; then
    log "Concept 64 completed successfully"
else
    log "ERROR: Concept 64 failed, continuing..."
fi
sleep $DELAY

# Concept 65: C-Boy's Heart & Soul - Navy Sequin Tank Dress
log "Generating Concept 65: C-Boy's Heart & Soul - Navy Sequin Tank Dress"
if node "$WRAPPER_SCRIPT" edit "$REFERENCE_IMAGE" "IMAGE EDIT: Preserve exact facial bone structure, eye spacing, nose width, lip shape, jawline, ear shape, skin tone, eye color, eyebrow arch from reference photo. No changes to facial proportions or identity markers.

Camera capture physics: Shot on iPhone 15 Pro rear camera, ISO 5000, f/1.6, 1/60s handheld near dance floor. Phone autofocus confused by moving lights, settled on sequins instead of face creating back-focus. Full sensor noise with no computational processing, no ProRAW smoothing, no Smart HDR tone mapping. JPEG compression showing block artifacts in areas of similar tone.

Scene narrative: Woman dances near jukebox at C-Boy's Heart & Soul wearing navy blue sequin tank dress with scooped neckline, sequins reflecting every light point individually. Dress hits upper thigh with A-line cut. Sheer textured hosiery in neutral tone, black platform heels with chunky sole. Hair styled in space buns on crown of head with face-framing pieces loose. She's mid-movement, one arm raised, looking toward vintage Wurlitzer jukebox. Honky-tonk interior features wood paneling, neon beer signs (red Budweiser, blue Miller), Texas flag on wall, scuffed wood floor.

Light transport and sensor capture: ISO 5000 luminance grain creating visible texture across entire image, color noise prominent with red/green speckles in shadow regions below 18% gray, blue channel 40% noisier creating color mottling in dark areas. Jukebox internal lights at 3000K creating warm amber glow on right side, red neon beer sign at 1800K creating crimson cast from left, blue neon at 6500K providing cool fill. Inverse square law creating dramatic falloff - jukebox surface brightness 16x higher than background 8 feet away. Sequins creating hundreds of specular highlights clipping to pure white.

Imperfection anchors: Motion blur from dance movement in raised hand and hair, autofocus back-focused on sequins leaving face 3 inches in front of focus plane creating softness, lens flare creating cyan and magenta ghosts from jukebox lights, natural 2.5-degree tilt from handheld movement." 2>&1 | tee -a "$OUTPUT_DIR/generation.log"; then
    log "Concept 65 completed successfully"
else
    log "ERROR: Concept 65 failed, continuing..."
fi
sleep $DELAY

# Concept 66: Garage Bar - Rust Orange Suede Shift Dress
log "Generating Concept 66: Garage Bar - Rust Orange Suede Shift Dress"
if node "$WRAPPER_SCRIPT" edit "$REFERENCE_IMAGE" "IMAGE EDIT: Preserve exact facial bone structure, eye spacing, nose width, lip shape, jawline, ear shape, skin tone, eye color, eyebrow arch from reference photo. No changes to facial proportions or identity markers.

Camera capture physics: Shot on iPhone 15 Pro rear camera, ISO 2200, f/1.8, 1/60s handheld in garage door opening. Phone autofocus locked on metal door frame then re-focused creating focus pulse artifact. Full sensor noise preserved with no computational smoothing, no night mode, no lens correction. JPEG compression visible in smooth gradient transitions from indoor to outdoor light.

Scene narrative: Woman leans against open garage door frame at Garage Bar wearing rust orange suede shift dress with short sleeves, straight silhouette, authentic suede nap texture. Dress hits mid-thigh with minimal shaping. Dark fitted hosiery, tan suede ankle boots with fringe detail. Hair in messy half-up topknot, bottom half hanging loose and wavy. She holds local craft beer in can, condensation dripping down aluminum surface. Garage bar setting features roll-up doors fully open, concrete floor, metal stools, string lights, view to outdoor patio area beyond.

Light transport and sensor capture: ISO 2200 sensor noise with luminance grain across all surfaces, color noise speckles (red/green) in shadow regions below 18% gray, blue channel showing 40% increased noise. Transition lighting zone - bright outdoor daylight at 5500K from patio area behind creating backlight, warm indoor Edison bulbs at 2700K providing frontal fill creating color temperature conflict. Inverse square law producing edge lighting effect where back of shoulders receive 8x more light than front of dress. Exposure compromise creating partial silhouette with blown highlights in outdoor background and lifted shadows showing noise in indoor foreground.

Imperfection anchors: Focus pulse artifact creating slight double-edge on garage door frame, natural 1.2-degree tilt from leaning posture affecting horizon line, chromatic aberration creating color fringing on high-contrast door edge, motion blur in condensation drip falling from beer can." 2>&1 | tee -a "$OUTPUT_DIR/generation.log"; then
    log "Concept 66 completed successfully"
else
    log "ERROR: Concept 66 failed, continuing..."
fi
sleep $DELAY

# Concept 67: Yellow Jacket Social Club - Teal Satin Slip Dress
log "Generating Concept 67: Yellow Jacket Social Club - Teal Satin Slip Dress"
if node "$WRAPPER_SCRIPT" edit "$REFERENCE_IMAGE" "IMAGE EDIT: Preserve exact facial bone structure, eye spacing, nose width, lip shape, jawline, ear shape, skin tone, eye color, eyebrow arch from reference photo. No changes to facial proportions or identity markers.

Camera capture physics: Shot on iPhone 15 Pro rear camera, ISO 6400, f/1.6, 1/50s handheld in extremely dark corner booth. Phone autofocus struggled for 2 seconds hunting back and forth before settling. Full sensor noise with no computational reduction, no Deep Fusion multi-frame processing, no neural smoothing. JPEG compression showing severe banding in dark gradient areas.

Scene narrative: Woman sits in corner booth at Yellow Jacket Social Club wearing teal satin bias-cut slip dress with thin adjustable straps, cowl neckline creating elegant drape, hem hitting mid-thigh. Satin showing realistic wrinkles and crease lines from sitting. Black opaque hosiery with decorative top band, black strappy heeled sandals. Hair styled in finger waves creating vintage 1920s sculptural S-curves close to scalp. She looks down at phone screen, face illuminated by device glow. Dark booth with tufted velvet upholstery, small table with single votive candle in red glass holder.

Light transport and sensor capture: ISO 6400 extreme sensor noise with heavy luminance grain creating almost textured appearance, color noise very prominent with large red/green/blue speckles in all shadow areas below 18% gray, fixed pattern noise creating visible vertical banding in darkest regions. Phone screen at 6500K creating blue-white rectangular light source illuminating face from below in unflattering under-lighting pattern, single votive candle at 1900K creating warm amber glow on table and dress fabric. Inverse square law creating 20:1 brightness ratio from phone-lit face to background booth wall 3 feet away falling into deep shadow approaching pure black.

Imperfection anchors: Severe color noise creating RGB speckle pattern in booth shadows, autofocus hunting artifact creating focus uncertainty visible as slight edge softness, natural 2-degree tilt from phone held in lap affecting frame level, motion blur in thumb scrolling across phone screen." 2>&1 | tee -a "$OUTPUT_DIR/generation.log"; then
    log "Concept 67 completed successfully"
else
    log "ERROR: Concept 67 failed, continuing..."
fi
sleep $DELAY

# Concept 68: Lala's Little Nugget - Brick Red Corduroy Dress
log "Generating Concept 68: Lala's Little Nugget - Brick Red Corduroy Dress"
if node "$WRAPPER_SCRIPT" edit "$REFERENCE_IMAGE" "IMAGE EDIT: Preserve exact facial bone structure, eye spacing, nose width, lip shape, jawline, ear shape, skin tone, eye color, eyebrow arch from reference photo. No changes to facial proportions or identity markers.

Camera capture physics: Shot on iPhone 15 Pro rear camera, ISO 3500, f/1.6, 1/60s handheld near pool table. Phone autofocus locked on pool cue in mid-ground creating focus behind subject. Full sensor noise preserved with no computational photography smoothing, no HDR processing, no ProRAW tone mapping. JPEG compression creating artifacts in corduroy's high-frequency texture detail.

Scene narrative: Woman leans over pool table at Lala's Little Nugget lining up shot, wearing brick red wide-wale corduroy mini dress with button-front closure, collar, long sleeves rolled to three-quarter length. Visible corduroy ridges creating directional texture. White athletic ankle socks, black patent Mary Jane shoes with chunky heel and strap. Hair parted in center and tucked behind both ears, hanging straight. She concentrates on pool shot, pool cue extended. Dive bar interior includes green felt pool table, pendant light with green shade hanging low, beer signs on wood paneling, vintage beer mirrors.

Light transport and sensor capture: ISO 3500 luminance grain visible across entire frame, color noise speckles (red/green) appearing in shadow areas below 18% gray, blue channel 40% noisier creating color variation in dark wood paneling background. Green-shaded pool table pendant at 2900K creating focused cone of warm light on felt and upper body, inverse square law producing 12:1 brightness ratio from table surface to background wall 6 feet away. Green felt reflecting light upward onto underside of face and chin creating unusual bottom-fill with green color cast. Beer sign neon creating colored accents - orange Lone Star glow from left, blue Pabst glow from right.

Imperfection anchors: Autofocus locked on pool cue leaving face 4 inches in front of focus plane creating soft blur, natural 1.5-degree tilt from bent-over posture, chalk dust particles suspended in air visible in pool table light beam, motion blur in pool balls rolling on felt after break shot." 2>&1 | tee -a "$OUTPUT_DIR/generation.log"; then
    log "Concept 68 completed successfully"
else
    log "ERROR: Concept 68 failed, continuing..."
fi
sleep $DELAY

# Concept 69: Cisco's Restaurant Bakery Bar - Blush Pink Chiffon Dress
log "Generating Concept 69: Cisco's Restaurant Bakery Bar - Blush Pink Chiffon Dress"
if node "$WRAPPER_SCRIPT" edit "$REFERENCE_IMAGE" "IMAGE EDIT: Preserve exact facial bone structure, eye spacing, nose width, lip shape, jawline, ear shape, skin tone, eye color, eyebrow arch from reference photo. No changes to facial proportions or identity markers.

Camera capture physics: Shot on iPhone 15 Pro rear camera, ISO 800, f/2.0, 1/125s handheld in bright outdoor patio daylight. Phone autofocus locked quickly and accurately in high-light conditions. Full sensor noise minimal at low ISO but JPEG compression still present, no HDR processing needed in even light. 8-bit color depth showing subtle banding in smooth sky gradient.

Scene narrative: Woman sits at outdoor patio table at Cisco's during Sunday brunch wearing blush pink chiffon mini dress with flutter sleeves, tiered ruffle construction creating layered movement, semi-sheer fabric over nude lining. Dress has elastic waist and flows loosely. Bare legs natural and unstyled, nude flat sandals with ankle ties. Hair in loose low braid falling over shoulder with ribbon woven through, many pieces pulled out for texture. She sips mimosa from champagne flute, condensation on glass. Bright patio setting includes colorful Mexican tiles, potted succulents, papel picado banners, metal chairs painted turquoise.

Light transport and sensor capture: ISO 800 minimal luminance grain due to abundant light, color noise nearly absent in bright conditions, sensor performing in optimal light range. Overhead sun at 5500K creating neutral color temperature, patio umbrella providing shade creating soft diffused lighting with gentle shadows under facial features. Inverse square law less dramatic in outdoor diffused conditions creating more even 3:1 brightness ratio from foreground to background. Bright highlights in white umbrella fabric approaching clip, shadows under table maintaining detail due to ambient light bounce from concrete patio floor.

Imperfection anchors: Natural 1-degree tilt from casual grip, slight motion blur in chiffon flutter sleeve caught by breeze, chromatic aberration on high-contrast umbrella edge against sky, JPEG compression banding visible in smooth blue sky gradient." 2>&1 | tee -a "$OUTPUT_DIR/generation.log"; then
    log "Concept 69 completed successfully"
else
    log "ERROR: Concept 69 failed, continuing..."
fi
sleep $DELAY

# Concept 70: White Horse - Charcoal Knit Sweater Dress
log "Generating Concept 70: White Horse - Charcoal Knit Sweater Dress"
if node "$WRAPPER_SCRIPT" edit "$REFERENCE_IMAGE" "IMAGE EDIT: Preserve exact facial bone structure, eye spacing, nose width, lip shape, jawline, ear shape, skin tone, eye color, eyebrow arch from reference photo. No changes to facial proportions or identity markers.

Camera capture physics: Shot on iPhone 15 Pro rear camera, ISO 4500, f/1.6, 1/60s handheld near outdoor dance floor at night. Phone autofocus hunted between string lights and face, creating focus uncertainty. Full sensor noise with no computational reduction, no night mode multi-frame stacking, no Smart HDR. JPEG compression visible in smooth gradient from light to shadow.

Scene narrative: Woman stands near outdoor dance floor at White Horse wearing charcoal grey cable-knit sweater dress with cowl neck, long sleeves, ribbed cuffs and hem, chunky knit texture visible. Dress hits mid-thigh with relaxed fit. Black opaque knee-high socks, brown leather ankle boots with stacked heel. Hair in messy bun on top of head secured with scrunchie, significant pieces falling out around face and neck. She watches two-step dancers, body turned partially away from camera. Outdoor honky-tonk setting includes string lights overhead, wooden dance floor, hay bales for seating, Texas flags.

Light transport and sensor capture: ISO 4500 luminance grain creating texture across all surfaces, color noise speckles (red/green) prominent in shadow areas below 18% gray, blue channel 40% noisier creating color mottling in dark background areas. Warm string lights at 2700K creating pools of amber illumination overhead, inverse square law creating 10:1 brightness ratio from directly-lit areas to spaces between lights. Cool moonlight at 4100K providing subtle fill from above mixing with warm artificial light creating color temperature split. Specular highlights on metal dance floor edge clipping to pure white, deep shadows under hay bales crushing to near black.

Imperfection anchors: Focus uncertainty from autofocus hunting creating slight softness across frame, natural 2-degree tilt from standing handheld, lens flare creating warm bokeh halos around string light bulbs, motion blur in background dancers' boots during two-step movement." 2>&1 | tee -a "$OUTPUT_DIR/generation.log"; then
    log "Concept 70 completed successfully"
else
    log "ERROR: Concept 70 failed, continuing..."
fi
sleep $DELAY

# Concept 71: Cosmic Coffee + Beer Garden - Lilac Ribbed Tank Dress
log "Generating Concept 71: Cosmic Coffee + Beer Garden - Lilac Ribbed Tank Dress"
if node "$WRAPPER_SCRIPT" edit "$REFERENCE_IMAGE" "IMAGE EDIT: Preserve exact facial bone structure, eye spacing, nose width, lip shape, jawline, ear shape, skin tone, eye color, eyebrow arch from reference photo. No changes to facial proportions or identity markers.

Camera capture physics: Shot on iPhone 15 Pro rear camera, ISO 1600, f/1.8, 1/80s handheld in shaded outdoor garden area. Phone autofocus locked on coffee cup in foreground creating front-focus error. Full sensor noise preserved with no computational smoothing, no photographic styles processing, no tone mapping. JPEG compression showing artifacts in ribbed texture detail.

Scene narrative: Woman sits at picnic table in beer garden at Cosmic Coffee wearing lilac purple ribbed tank mini dress with square neckline, thick shoulder straps, body-hugging silhouette. Horizontal rib texture creates dimensional fabric surface. Ivory opaque hosiery, white platform sneakers with chunky sole. Hair styled in two low pigtails at nape of neck tied with white ribbons, intentionally youthful and playful. She holds iced coffee in clear plastic cup, condensation and ice visible. Beer garden setting includes wooden picnic tables, potted plants, mural wall art, string lights not yet illuminated in afternoon light.

Light transport and sensor capture: ISO 1600 sensor noise with luminance grain across mid-tones and shadows, color noise speckles (red/green) visible in darker areas below 18% gray, blue channel showing 40% higher noise level. Dappled shade from tree canopy creating complex light pattern - bright spots of sunlight at 5500K mixed with cool shade at 6500K producing color temperature variation. Inverse square law creating 5:1 brightness ratio from sunlit patches to shaded areas. Bright highlight spots on table surface clipping to pure white, shadows under table maintaining detail with lifted exposure showing noise.

Imperfection anchors: Autofocus front-focused on coffee cup leaving face 5 inches behind focus plane creating soft blur, natural 1.3-degree tilt from seated position, chromatic aberration creating purple fringe on bright sunlit leaf edges, motion blur in hand stirring iced coffee with straw." 2>&1 | tee -a "$OUTPUT_DIR/generation.log"; then
    log "Concept 71 completed successfully"
else
    log "ERROR: Concept 71 failed, continuing..."
fi
sleep $DELAY

# Concept 72: Skylark Lounge - Chocolate Brown Leather Dress
log "Generating Concept 72: Skylark Lounge - Chocolate Brown Leather Dress"
if node "$WRAPPER_SCRIPT" edit "$REFERENCE_IMAGE" "IMAGE EDIT: Preserve exact facial bone structure, eye spacing, nose width, lip shape, jawline, ear shape, skin tone, eye color, eyebrow arch from reference photo. No changes to facial proportions or identity markers.

Camera capture physics: Shot on iPhone 15 Pro rear camera, ISO 3200, f/1.6, 1/60s handheld in dim retro cocktail lounge. Phone autofocus pulsed twice hunting for contrast before locking. Full sensor noise with no computational photography reduction, no Deep Fusion processing, no HDR stacking. JPEG compression creating banding in smooth gradient areas from spotlight to shadow.

Scene narrative: Woman sits in booth at Skylark Lounge wearing chocolate brown leather mini dress with cap sleeves, zippered front closure, vintage 1960s mod silhouette. Leather has authentic texture with natural grain and slight sheen. Tan sheer hosiery with subtle shimmer, brown suede heeled ankle boots with pointed toe. Hair styled in bouffant updo with teased crown and smooth sides, authentic mid-century styling. She holds martini glass with olive garnish. Retro lounge interior features tufted vinyl booths in burnt orange, wood paneling, vintage pendant lights with amber glass globes, brass fixtures.

Light transport and sensor capture: ISO 3200 luminance grain visible across entire image creating texture, color noise speckles (red/green) appearing in shadow regions below 18% gray, blue channel 40% noisier creating visible color variation in dark booth shadows. Amber glass pendant light at 2700K creating warm focused illumination from above, inverse square law producing 8:1 brightness ratio from her face to booth back 4 feet away. Brass wall sconce at 2800K providing warm side fill. Hard shadows under chin and nose from overhead pendant creating defined facial modeling.

Imperfection anchors: Focus hunting artifact creating slight edge doubling on one side, natural 1.8-degree tilt from booth seating angle, lens flare creating warm glow around pendant light, motion blur in hand raising martini glass to lips." 2>&1 | tee -a "$OUTPUT_DIR/generation.log"; then
    log "Concept 72 completed successfully"
else
    log "ERROR: Concept 72 failed, continuing..."
fi
sleep $DELAY

# Concept 73: Hotel Vegas - Hot Pink Mesh Overlay Dress
log "Generating Concept 73: Hotel Vegas - Hot Pink Mesh Overlay Dress"
if node "$WRAPPER_SCRIPT" edit "$REFERENCE_IMAGE" "IMAGE EDIT: Preserve exact facial bone structure, eye spacing, nose width, lip shape, jawline, ear shape, skin tone, eye color, eyebrow arch from reference photo. No changes to facial proportions or identity markers.

Camera capture physics: Shot on iPhone 15 Pro rear camera, ISO 8000, f/1.6, 1/60s handheld near outdoor stage. Phone autofocus confused by moving stage lights, settled on background creating back-focus. Full sensor noise with no computational reduction, no night mode, no neural processing. JPEG compression showing severe artifacts in high-frequency mesh texture.

Scene narrative: Woman stands in front of outdoor stage at Hotel Vegas wearing hot pink mini dress with black mesh overlay creating semi-sheer effect, fitted silhouette, long sleeves of sheer mesh. Opaque pink underlayer visible beneath mesh. Black patterned tights with geometric shapes, black platform boots with silver buckles. Hair in high ponytail with scrunchie, ponytail crimped for volume and texture. She watches band perform, colored stage lights hitting her. Outdoor venue includes corrugated metal stage backdrop, graffiti walls, beer garden seating, food truck lights in distance.

Light transport and sensor capture: ISO 8000 heavy luminance grain creating very textured appearance, color noise extremely prominent with large red/green/blue speckles in all shadow areas, fixed pattern noise creating visible banding in darkest regions, blue channel 40% noisier creating severe color mottling. Stage PAR lights creating colored illumination - magenta gel from right at 3200K tinted purple, green gel from left at 5500K creating cyan cast, amber backlight at 2900K creating warm rim light. Inverse square law creating 15:1 brightness ratio from stage-lit foreground to dark background 12 feet back. Stage smoke diffusing light creating visible beam paths.

Imperfection anchors: Autofocus back-focused on stage creating face 6 inches in front of focus plane with significant softness, severe color noise creating RGB mosaic pattern in shadows, natural 2.5-degree tilt from standing on uneven ground, motion blur in guitarist visible behind her." 2>&1 | tee -a "$OUTPUT_DIR/generation.log"; then
    log "Concept 73 completed successfully"
else
    log "ERROR: Concept 73 failed, continuing..."
fi
sleep $DELAY

# Concept 74: The Library Bar - Olive Satin Wrap Dress
log "Generating Concept 74: The Library Bar - Olive Satin Wrap Dress"
if node "$WRAPPER_SCRIPT" edit "$REFERENCE_IMAGE" "IMAGE EDIT: Preserve exact facial bone structure, eye spacing, nose width, lip shape, jawline, ear shape, skin tone, eye color, eyebrow arch from reference photo. No changes to facial proportions or identity markers.

Camera capture physics: Shot on iPhone 15 Pro rear camera, ISO 2500, f/1.8, 1/60s handheld in library-themed bar. Phone autofocus locked on book spine on shelf behind subject creating focus error. Full sensor noise preserved with no computational smoothing, no Smart HDR, no ProRAW processing. JPEG compression visible in smooth satin fabric gradient areas.

Scene narrative: Woman sits in leather reading chair at The Library Bar wearing olive green satin wrap dress with tie waist, three-quarter sleeves, plunging wrap neckline, asymmetric hem from wrap closure. Satin has fluid drape and subtle sheen. Black ribbed tights, black leather loafers with gold hardware. Hair in low loose bun at nape with pieces falling around face, reading glasses perched on nose. She reads hardcover book, actual concentration on pages. Bar setting features floor-to-ceiling bookshelves filled with vintage books, rolling library ladder, green banker's lamps, leather furniture, dark wood.

Light transport and sensor capture: ISO 2500 sensor noise with luminance grain across surfaces, color noise speckles (red/green) in shadow areas below 18% gray, blue channel 40% noisier creating color variation in dark bookshelf shadows. Green banker's lamp on side table at 2800K creating warm focused task light, inverse square law producing 12:1 brightness ratio from lamp-lit book pages to background bookshelves 8 feet away. Warm amber sconce lighting at 2700K providing fill light. Hard shadow from book falling across lower face and chest.

Imperfection anchors: Autofocus locked on background book spines leaving face 8 inches in front of focus plane creating softness, natural 1.5-degree tilt from seated posture, chromatic aberration creating green fringe on bright lamp shade edge, motion blur in hand turning book page." 2>&1 | tee -a "$OUTPUT_DIR/generation.log"; then
    log "Concept 74 completed successfully"
else
    log "ERROR: Concept 74 failed, continuing..."
fi
sleep $DELAY

# Concept 75: Radio Coffee & Beer - Aqua Linen Button-Front Dress
log "Generating Concept 75: Radio Coffee & Beer - Aqua Linen Button-Front Dress"
if node "$WRAPPER_SCRIPT" edit "$REFERENCE_IMAGE" "IMAGE EDIT: Preserve exact facial bone structure, eye spacing, nose width, lip shape, jawline, ear shape, skin tone, eye color, eyebrow arch from reference photo. No changes to facial proportions or identity markers.

Camera capture physics: Shot on iPhone 15 Pro rear camera, ISO 640, f/2.2, 1/200s handheld in bright outdoor patio. Phone autofocus locked accurately in abundant daylight. Minimal sensor noise at low ISO but JPEG compression still present, no HDR needed in even light. 8-bit color depth showing banding in smooth areas.

Scene narrative: Woman sits at outdoor patio table at Radio Coffee & Beer during afternoon wearing aqua blue linen button-front shirt dress with collar, short sleeves, fabric belt at waist. Natural linen wrinkles throughout creating authentic casual texture. Bare legs, tan leather sandals with braided straps. Hair in messy fishtail braid over shoulder, loose and deconstructed with pieces escaped. She works on laptop, coffee cup and local beer bottle on table. Bright patio includes metal tables, umbrellas, potted plants, food trailers visible in background, other patrons out of focus.

Light transport and sensor capture: ISO 640 minimal luminance grain due to bright conditions, color noise nearly absent in well-lit scene, sensor operating in optimal range. Midday sun at 5500K creating neutral color temperature filtered through patio umbrella providing diffused lighting with soft shadows. Inverse square law minimal in diffused outdoor conditions creating even 2:1 brightness ratio. Bright highlights on metal table edge approaching clip, shadows under umbrella maintaining full detail without noise. Concrete patio floor bouncing light creating fill from below.

Imperfection anchors: Natural 0.8-degree tilt from casual grip, slight motion blur in hands typing on laptop keyboard, chromatic aberration on high-contrast umbrella pole edge, JPEG compression banding visible in smooth umbrella fabric gradient." 2>&1 | tee -a "$OUTPUT_DIR/generation.log"; then
    log "Concept 75 completed successfully"
else
    log "ERROR: Concept 75 failed, continuing..."
fi
sleep $DELAY

# Concept 76: Armadillo Den - Wine Velvet Turtleneck Dress
log "Generating Concept 76: Armadillo Den - Wine Velvet Turtleneck Dress"
if node "$WRAPPER_SCRIPT" edit "$REFERENCE_IMAGE" "IMAGE EDIT: Preserve exact facial bone structure, eye spacing, nose width, lip shape, jawline, ear shape, skin tone, eye color, eyebrow arch from reference photo. No changes to facial proportions or identity markers.

Camera capture physics: Shot on iPhone 15 Pro rear camera, ISO 5500, f/1.6, 1/50s handheld in dark music venue. Phone autofocus hunted extensively in low contrast scene before settling with uncertainty. Full sensor noise with no computational reduction, no night mode stacking, no Deep Fusion. JPEG compression showing banding in velvet's smooth tonal transitions.

Scene narrative: Woman leans against brick wall at Armadillo Den near small stage wearing wine burgundy velvet turtleneck mini dress with long sleeves, body-skimming fit. Velvet nap creating directional sheen and depth. Black opaque tall legwear, burgundy velvet ankle boots matching dress creating monochrome burgundy palette. Hair styled in victory rolls at front with back hanging in waves, vintage 1940s aesthetic. She watches band soundcheck, drum kit visible in background. Venue interior includes exposed brick, vintage concert posters, string lights, wood floor scuffed from years of shows.

Light transport and sensor capture: ISO 5500 heavy luminance grain creating visible texture, color noise very prominent with red/green speckles in shadow regions below 18% gray, blue channel 40% noisier creating color mottling in brick wall texture, fixed pattern noise creating subtle vertical banding. Single stage spotlight at 3200K creating hard side light from left, inverse square law producing 18:1 brightness ratio from lit side of face to shadow side. Warm Edison string lights at 2700K providing minimal ambient fill. Hard shadow line down center of face from directional spotlight, shadow side falling 5 stops darker with significant detail loss.

Imperfection anchors: Focus uncertainty from low-contrast hunting creating overall soft focus, natural 2.2-degree tilt from leaning posture, severe color noise in brick wall shadows creating RGB speckle pattern, motion blur in bassist's hand during soundcheck visible in background." 2>&1 | tee -a "$OUTPUT_DIR/generation.log"; then
    log "Concept 76 completed successfully"
else
    log "ERROR: Concept 76 failed, continuing..."
fi
sleep $DELAY

# Concept 77: Butterfly Bar - Peach Satin Halter Dress
log "Generating Concept 77: Butterfly Bar - Peach Satin Halter Dress"
if node "$WRAPPER_SCRIPT" edit "$REFERENCE_IMAGE" "IMAGE EDIT: Preserve exact facial bone structure, eye spacing, nose width, lip shape, jawline, ear shape, skin tone, eye color, eyebrow arch from reference photo. No changes to facial proportions or identity markers.

Camera capture physics: Shot on iPhone 15 Pro rear camera, ISO 3800, f/1.6, 1/60s handheld near neon butterfly sign. Phone autofocus locked on neon tube creating back-focus error. Full sensor noise preserved with no computational photography smoothing, no HDR processing, no AI enhancement. JPEG compression creating artifacts in satin's smooth specular highlights.

Scene narrative: Woman stands beneath large neon butterfly sign at Butterfly Bar wearing peach satin halter mini dress with tied neck, open back, A-line skirt. Satin has lustrous finish with realistic wrinkles from movement. Nude sheer hosiery with subtle shimmer, clear acrylic heeled sandals. Hair styled in high sleek ponytail pulled tight, wrapped at base with hair strand. She looks up at neon sign, face illuminated by pink and blue neon glow. Bar interior includes vintage neon signs, dark wood paneling, vinyl booth seating, retro jukebox.

Light transport and sensor capture: ISO 3800 luminance grain visible across entire frame, color noise speckles (red/green) in shadow areas below 18% gray, blue channel 40% noisier creating color variation. Large butterfly neon sign creating colored illumination - pink neon at 2200K on upper half, blue neon at 6500K on lower half, creating color temperature split on face and dress. Inverse square law creating 10:1 brightness ratio from neon-lit foreground to dark background 6 feet back. Neon creating soft glow without hard shadows. Peach satin reflecting colored light showing pink where pink neon dominates, blue-white where blue neon hits.

Imperfection anchors: Autofocus back-focused on neon tubes leaving face 4 inches forward creating soft blur, natural 1.6-degree tilt from looking upward affecting horizon, lens flare creating magenta and cyan ghosts from brightest neon sections, motion blur in ponytail swinging from head turn." 2>&1 | tee -a "$OUTPUT_DIR/generation.log"; then
    log "Concept 77 completed successfully"
else
    log "ERROR: Concept 77 failed, continuing..."
fi
sleep $DELAY

# Concept 78: Drinks Lounge - Steel Grey Asymmetric Dress
log "Generating Concept 78: Drinks Lounge - Steel Grey Asymmetric Dress"
if node "$WRAPPER_SCRIPT" edit "$REFERENCE_IMAGE" "IMAGE EDIT: Preserve exact facial bone structure, eye spacing, nose width, lip shape, jawline, ear shape, skin tone, eye color, eyebrow arch from reference photo. No changes to facial proportions or identity markers.

Camera capture physics: Shot on iPhone 15 Pro rear camera, ISO 12000, f/1.6, 1/30s handheld in extremely dark late-night conditions. Phone autofocus struggled severely, taking 4 seconds to lock with multiple hunt cycles. Full sensor noise with no computational reduction, no night mode, no multi-frame stacking. JPEG compression showing severe banding in dark gradient areas.

Scene narrative: Woman sits in dark corner booth at Drinks Lounge during last call wearing steel grey one-shoulder mini dress with single sleeve on right shoulder, asymmetric neckline, fitted silhouette. Fabric has slight metallic thread creating subtle sheen. Black patterned tights with small dots, black heeled ankle boots. Hair parted on side and tucked behind ear on one side, hanging loose on other creating asymmetry matching dress. She's illuminated primarily by phone screen held in hand, blue-white glow on face. Extremely dark bar environment with only distant red exit sign visible.

Light transport and sensor capture: ISO 12000 extreme sensor noise with very heavy luminance grain creating almost grainy film texture, color noise extremely severe with large RGB speckles throughout all areas, fixed pattern noise creating strong vertical banding in darkest regions, blue channel 40% noisier creating severe color corruption. Phone screen at 6500K creating small rectangular blue-white light source illuminating face from below in unflattering bottom lighting, inverse square falloff creating face brightness 30x higher than background 2 feet away. Distant red exit sign at 1800K creating barely visible crimson rim light. Most of frame approaching pure black with crushed shadow detail.

Imperfection anchors: Extreme color noise creating severe RGB mosaic corruption across entire image, autofocus multiple hunting cycles creating focus uncertainty and slight motion trail, natural 2.8-degree tilt from dark conditions making framing difficult, motion blur in thumb scrolling phone screen." 2>&1 | tee -a "$OUTPUT_DIR/generation.log"; then
    log "Concept 78 completed successfully"
else
    log "ERROR: Concept 78 failed, continuing..."
fi
sleep $DELAY

# Concept 79: Far Out Lounge - Canary Yellow Wrap Top and Skirt Set
log "Generating Concept 79: Far Out Lounge - Canary Yellow Wrap Top and Skirt Set"
if node "$WRAPPER_SCRIPT" edit "$REFERENCE_IMAGE" "IMAGE EDIT: Preserve exact facial bone structure, eye spacing, nose width, lip shape, jawline, ear shape, skin tone, eye color, eyebrow arch from reference photo. No changes to facial proportions or identity markers.

Camera capture physics: Shot on iPhone 15 Pro rear camera, ISO 4200, f/1.6, 1/60s handheld near outdoor stage at dusk. Phone autofocus locked on stage light creating significant back-focus. Full sensor noise with no computational smoothing, no HDR stacking, no photographic styles. JPEG compression visible in smooth fabric gradient areas.

Scene narrative: Woman stands near outdoor stage at Far Out Lounge wearing canary yellow two-piece set - cropped wrap top with tie closure and matching high-waisted wrap mini skirt creating coordinated outfit. Both pieces in matte crepe fabric. Tall dark hosiery with matte finish, yellow platform heels matching outfit. Hair in high double buns creating Mickey Mouse silhouette, face-framing pieces loose. She dances near stage edge, arms raised, caught mid-movement. Outdoor venue includes concrete pad stage, metal roof structure, string lights, food trucks, inflatable decorations.

Light transport and sensor capture: ISO 4200 luminance grain creating texture across image, color noise prominent with red/green speckles in shadow areas below 18% gray, blue channel 40% noisier creating color mottling in darker regions. Stage PAR lights creating colored illumination - amber gel from above at 2900K creating warm top light, magenta gel from side at 3200K tinted purple creating colored fill. Inverse square law creating 12:1 brightness ratio from stage area to background food trucks 15 feet away. Dusk sky at 4500K providing cool ambient fill mixing with warm artificial lights creating color temperature conflict.

Imperfection anchors: Autofocus back-focused on stage lights leaving subject 8 inches forward creating significant softness, motion blur from dance movement in raised arms and double buns, natural 3-degree tilt from movement affecting frame level, lens flare creating warm streak from brightest stage light." 2>&1 | tee -a "$OUTPUT_DIR/generation.log"; then
    log "Concept 79 completed successfully"
else
    log "ERROR: Concept 79 failed, continuing..."
fi
sleep $DELAY

# Concept 80: Revelry Kitchen + Bar - Burgundy Sequin One-Shoulder Dress
log "Generating Concept 80: Revelry Kitchen + Bar - Burgundy Sequin One-Shoulder Dress"
if node "$WRAPPER_SCRIPT" edit "$REFERENCE_IMAGE" "IMAGE EDIT: Preserve exact facial bone structure, eye spacing, nose width, lip shape, jawline, ear shape, skin tone, eye color, eyebrow arch from reference photo. No changes to facial proportions or identity markers.

Camera capture physics: Shot on iPhone 15 Pro rear camera, ISO 2800, f/1.8, 1/60s handheld in upscale-casual bar interior. Phone autofocus locked on sequin highlights creating front-focus. Full sensor noise preserved with no computational photography reduction, no Deep Fusion, no Smart HDR. JPEG compression showing artifacts in sequin high-frequency detail.

Scene narrative: Woman sits at modern bar counter at Revelry Kitchen wearing burgundy sequin one-shoulder mini dress with single diagonal strap across right shoulder, fitted bodice, slight flare at hem. Each sequin reflects light individually creating sparkle texture. Black sheer hosiery with back seam detail, black suede pointed-toe heeled ankle boots. Hair styled in deep side part swept dramatically across forehead, ends curled under in vintage wave. She holds craft cocktail in coupe glass, garnish of dehydrated citrus wheel. Modern bar interior includes white subway tile, brass fixtures, Edison bulb pendants, marble countertop, shelves of premium spirits.

Light transport and sensor capture: ISO 2800 sensor noise with luminance grain across mid-tones and shadows, color noise speckles (red/green) visible in darker areas below 18% gray, blue channel 40% noisier creating color variation in shadow regions. Edison bulb pendant directly overhead at 2700K creating warm focused downlight, inverse square law producing 8:1 brightness ratio from bar counter to background wall 5 feet away. Brass fixtures reflecting warm light creating additional highlights. Sequins creating hundreds of individual specular highlights clipping to pure white where brightest. Marble counter creating specular reflection of dress and glass.

Imperfection anchors: Autofocus front-focused on sequin highlights leaving face 2 inches behind focus plane creating slight softness, natural 1.4-degree tilt from barstool seating position, chromatic aberration creating magenta fringe on bright pendant bulb edge, motion blur in hand raising cocktail glass." 2>&1 | tee -a "$OUTPUT_DIR/generation.log"; then
    log "Concept 80 completed successfully"
else
    log "ERROR: Concept 80 failed, continuing..."
fi

log "================================"
log "Generation batch complete!"
log "All 20 concepts (61-80) processed"
log "Check output directory: $OUTPUT_DIR"
log "================================"

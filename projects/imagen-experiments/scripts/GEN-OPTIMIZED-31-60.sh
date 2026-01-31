#!/bin/bash

################################################################################
# GEN-OPTIMIZED-31-60.sh
# Generate images for optimized concepts 31-60 using research-backed prompts
#
# Reference: /Users/louisherman/Documents/LWMMoms - 374.jpeg
# Wrapper: nanobanana-4k-edit.js (4K, no rewriting, optimal safety settings)
# Delay: 120 seconds between generations
# Output: /Users/louisherman/nanobanana-output/optimized-31-60/
#
# Created: 2026-01-29
################################################################################

set +e  # Continue on error - we want to log failures and keep going

# Configuration
REFERENCE_IMAGE="/Users/louisherman/Documents/LWMMoms - 374.jpeg"
WRAPPER_SCRIPT="/Users/louisherman/ClaudeCodeProjects/projects/imagen-experiments/scripts/nanobanana-4k-edit.js"
OUTPUT_DIR="/Users/louisherman/nanobanana-output/optimized-31-60"
DELAY_SECONDS=120

# Create output directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

# Logging function with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$OUTPUT_DIR/generation.log"
}

log "========================================="
log "Starting optimized concepts 31-60 generation"
log "Reference image: $REFERENCE_IMAGE"
log "Output directory: $OUTPUT_DIR"
log "========================================="

# Verify reference image exists
if [ ! -f "$REFERENCE_IMAGE" ]; then
    log "ERROR: Reference image not found at $REFERENCE_IMAGE"
    exit 1
fi

# Verify wrapper script exists
if [ ! -f "$WRAPPER_SCRIPT" ]; then
    log "ERROR: Wrapper script not found at $WRAPPER_SCRIPT"
    exit 1
fi

# Function to run generation with error handling
generate_concept() {
    local concept_num=$1
    local prompt=$2

    log "------------------------------------------------------------"
    log "Starting CONCEPT $concept_num"
    log "Prompt length: ${#prompt} characters"

    # Run generation
    cd /Users/louisherman/ClaudeCodeProjects/projects/imagen-experiments/scripts
    if node "$WRAPPER_SCRIPT" edit "$REFERENCE_IMAGE" "$prompt" 2>&1 | tee -a "$OUTPUT_DIR/generation.log"; then
        log "SUCCESS: Concept $concept_num completed"
    else
        log "ERROR: Concept $concept_num failed (exit code: $?)"
        log "Continuing to next concept..."
    fi

    # Wait before next generation (skip delay after last concept)
    if [ "$concept_num" != "60" ]; then
        log "Waiting $DELAY_SECONDS seconds before next generation..."
        sleep $DELAY_SECONDS
    fi
}

################################################################################
# CONCEPT 31
################################################################################
generate_concept 31 "IMAGE EDIT: Preserve exact facial bone structure, eye spacing, nose width, lip shape, jawline, ear shape, skin tone, eye color, eyebrow arch from reference photo. No changes to facial proportions or identity markers.

Camera capture physics: Shot on iPhone 15 Pro rear camera, ISO 2500-3200, f/1.6-1.8, 1/60s handheld in dim bar lighting. Phone autofocus hunted in low light - landed 1-2 inches off intended focus plane. Full sensor noise preserved - no computational photography noise reduction, no HDR stacking, no AI smoothing. JPEG compression from phone processing pipeline with 8-bit color depth showing banding in smooth gradients.

Scene: Woman at The White Horse wearing emerald green velvet mini dress with scoop neck and long sleeves, dark opaque hosiery with matte finish, black ankle boots. Hair loose with natural wave and humidity frizz. Standing near vintage jukebox, one hand resting on wooden bar rail, direct confident gaze at camera. Saturday night 11pm.

Authentic skin texture captured by sensor: Visible pores on nose bridge and cheeks (0.1-0.2mm diameter), sebaceous filaments creating dark dots on nose, fine expression lines radiating from outer eye corners, uneven skin tone with darker areas under eyes and slight redness on cheeks/chin, oil shine on T-zone creating specular reflection where light hits forehead.

Real fabric physics: Velvet nap showing directional sheen variation, individual thread weave visible in dress fabric, slight pulls creating small snags, wrinkles with shadow depth showing fabric memory from sitting, lint particles caught in dark fibers, hosiery showing matte surface texture.

Light transport and sensor capture: ISO 2800 luminance grain on all surfaces creating texture, color noise speckles (red/green) visible in shadow regions below 18% gray, blue channel 40% noisier than red/green channels. Single overhead Edison bulb at 2700K creating harsh top-down shadow under chin and nose, warm orange color cast on skin from tungsten source. Inverse square law creating dramatic light falloff - one side of face 4x darker than illuminated side. Specular highlights clipping to pure white on forehead oil shine.

Key imperfections: Handheld camera shake creating 1-2 pixel motion blur, phone auto-exposure compromising between bright neon beer signs and dark wood paneling, autofocus hunt artifact during focus search, natural 1.5° tilt from casual hand position."

################################################################################
# CONCEPT 32
################################################################################
generate_concept 32 "IMAGE EDIT: Preserve exact facial bone structure, eye spacing, nose width, lip shape, jawline, ear shape, skin tone, eye color, eyebrow arch from reference photo. No changes to facial proportions or identity markers.

Camera capture physics: Shot on iPhone 15 Pro rear camera, ISO 2500-3200, f/1.6-1.8, 1/60s handheld in dim bar lighting. Phone autofocus hunted in low light - landed 1-2 inches off intended focus plane. Full sensor noise preserved - no computational photography noise reduction, no HDR stacking, no AI smoothing. JPEG compression from phone processing pipeline with 8-bit color depth showing banding in smooth gradients.

Scene: Woman at Spider House wearing burgundy satin mini dress with thin straps and cowl neck, sheer neutral-toned textured hosiery, cognac leather heeled booties. Hair pulled back in messy low bun with loose strands framing face. Leaning against graffiti-covered brick wall in outdoor courtyard, arms crossed casually, slight smile. Friday night 10pm under string lights.

Authentic skin texture captured by sensor: Visible pores on nose bridge and cheeks (0.1-0.2mm diameter), sebaceous filaments creating dark dots on nose, fine expression lines radiating from outer eye corners, uneven skin tone with darker areas under eyes and slight redness on cheeks/chin, oil shine on T-zone creating specular reflection where light hits forehead.

Real fabric physics: Satin showing directional light reflection creating bright highlights and deep shadows in folds, individual thread weave visible in fabric, slight wrinkles from body movement, lint particles caught in fibers, hosiery showing subtle mesh texture pattern.

Light transport and sensor capture: ISO 2900 luminance grain on all surfaces creating texture, color noise speckles (red/green) visible in shadow regions below 18% gray, blue channel 40% noisier than red/green channels. Overhead string lights at 2800K creating multiple small hard shadows pointing downward, warm amber color cast on skin. Mixed lighting from green neon sign in background creating color contamination on hair. Specular highlights clipping to pure white on satin dress fabric.

Key imperfections: Handheld shake creating motion trail in hair strands, slight chromatic aberration on high-contrast edges from phone lens, off-center composition showing natural casual framing, background string lights fully defocused into bokeh circles."

################################################################################
# CONCEPT 33
################################################################################
generate_concept 33 "IMAGE EDIT: Preserve exact facial bone structure, eye spacing, nose width, lip shape, jawline, ear shape, skin tone, eye color, eyebrow arch from reference photo. No changes to facial proportions or identity markers.

Camera capture physics: Shot on iPhone 15 Pro rear camera, ISO 2500-3200, f/1.6-1.8, 1/60s handheld in dim bar lighting. Phone autofocus hunted in low light - landed 1-2 inches off intended focus plane. Full sensor noise preserved - no computational photography noise reduction, no HDR stacking, no AI smoothing. JPEG compression from phone processing pipeline with 8-bit color depth showing banding in smooth gradients.

Scene: Woman at C-Boy's wearing black sequined mini dress with three-quarter sleeves and crew neck, dark ribbed-knit hosiery, silver metallic heeled shoes. Hair in loose curls with volume spray creating stiff texture in some sections. Sitting on red vinyl barstool at wooden bar, one elbow on bar surface, hand supporting chin, looking over shoulder at camera. Thursday night 9pm.

Authentic skin texture captured by sensor: Visible pores on nose bridge and cheeks (0.1-0.2mm diameter), sebaceous filaments creating dark dots on nose, fine expression lines radiating from outer eye corners, uneven skin tone with darker areas under eyes and slight redness on cheeks/chin, oil shine on T-zone creating specular reflection where light hits forehead.

Real fabric physics: Individual sequins showing geometric flat surfaces reflecting light as discrete points, thread securing sequins visible, fabric bunching at waist from seated position creating compression wrinkles, hosiery ribbing showing vertical texture pattern, minor sequin threads loose at hemline.

Light transport and sensor capture: ISO 3100 luminance grain on all surfaces creating texture, color noise speckles (red/green) visible in shadow regions below 18% gray, blue channel 40% noisier than red/green channels. Overhead track lighting at 3000K creating hard shadows under nose and chin, each sequin creating individual specular highlight point. Red vinyl barstool creating color bounce light on underside of jaw. Background neon signs fully defocused creating colored bokeh.

Key imperfections: Motion blur in turning hair from head rotation during exposure, phone lens corner softness reducing sharpness at frame edges, compression artifacts visible in smooth gradient of red vinyl, natural 0.8° camera tilt."

################################################################################
# CONCEPT 34
################################################################################
generate_concept 34 "IMAGE EDIT: Preserve exact facial bone structure, eye spacing, nose width, lip shape, jawline, ear shape, skin tone, eye color, eyebrow arch from reference photo. No changes to facial proportions or identity markers.

Camera capture physics: Shot on iPhone 15 Pro rear camera, ISO 2500-3200, f/1.6-1.8, 1/60s handheld in dim bar lighting. Phone autofocus hunted in low light - landed 1-2 inches off intended focus plane. Full sensor noise preserved - no computational photography noise reduction, no HDR stacking, no AI smoothing. JPEG compression from phone processing pipeline with 8-bit color depth showing banding in smooth gradients.

Scene: Woman at Bus Stop wearing rust orange linen mini dress with short sleeves and V-neck, ivory opaque hosiery, tan suede ankle boots. Hair in side braid over one shoulder showing loose braiding technique with wispy pieces escaping. Standing at vintage pinball machine, hands on machine controls, leaning forward slightly, concentrating on game with mouth slightly open. Sunday evening 8pm.

Authentic skin texture captured by sensor: Visible pores on nose bridge and cheeks (0.1-0.2mm diameter), sebaceous filaments creating dark dots on nose, fine expression lines radiating from outer eye corners, uneven skin tone with darker areas under eyes and slight redness on cheeks/chin, oil shine on T-zone creating specular reflection where light hits forehead.

Real fabric physics: Linen showing natural slub texture with irregular thread thickness, wrinkles with sharp creases from fabric memory, small pulls in weave creating snags, color variation showing natural dye imperfections, hosiery showing opaque matte surface, suede showing directional nap.

Light transport and sensor capture: ISO 2700 luminance grain on all surfaces creating texture, color noise speckles (red/green) visible in shadow regions below 18% gray, blue channel 40% noisier than red/green channels. Pinball machine lights creating multicolored upward illumination on face - blue, red, yellow light sources at 8000K+ creating unnatural color cast. Overhead pendant lamp at 2700K mixing with machine lights. Face illuminated from below creating reversed shadow pattern with shadows pointing upward.

Key imperfections: Handheld shake during exposure creating slight double image in hair highlights, phone struggling with mixed color temperature creating white balance error, lens flare from bright pinball lights creating geometric artifacts, autofocus confused by bright foreground lights."

################################################################################
# CONCEPT 35
################################################################################
generate_concept 35 "IMAGE EDIT: Preserve exact facial bone structure, eye spacing, nose width, lip shape, jawline, ear shape, skin tone, eye color, eyebrow arch from reference photo. No changes to facial proportions or identity markers.

Camera capture physics: Shot on iPhone 15 Pro rear camera, ISO 2500-3200, f/1.6-1.8, 1/60s handheld in dim bar lighting. Phone autofocus hunted in low light - landed 1-2 inches off intended focus plane. Full sensor noise preserved - no computational photography noise reduction, no HDR stacking, no AI smoothing. JPEG compression from phone processing pipeline with 8-bit color depth showing banding in smooth gradients.

Scene: Woman at Barbarella wearing cobalt blue bodycon knit mini dress with cap sleeves and boat neck, black opaque hosiery with subtle sheen, black platform heeled shoes. Hair straightened with flat iron showing heat damage at ends, tucked behind ears. Dancing near DJ booth with arms raised above head, eyes closed, mouth open mid-laugh. Saturday midnight under dance floor lighting.

Authentic skin texture captured by sensor: Visible pores on nose bridge and cheeks (0.1-0.2mm diameter), sebaceous filaments creating dark dots on nose, fine expression lines radiating from outer eye corners, uneven skin tone with darker areas under eyes and slight redness on cheeks/chin, oil shine on T-zone creating specular reflection where light hits forehead.

Real fabric physics: Knit ribbing showing horizontal texture pattern, fabric stretched tight around body showing individual thread loops, sweat dampness creating darker color patches in blue fabric, pilling visible on high-friction areas, hosiery showing slight wrinkles at knee backs from movement.

Light transport and sensor capture: ISO 3200 luminance grain on all surfaces creating texture, color noise speckles (red/green) visible in shadow regions below 18% gray, blue channel 40% noisier than red/green channels. Rotating magenta and cyan LED spotlights creating moving color patches on skin and clothing, hard shadows rotating as lights move. Mixed color temperatures creating extreme color casts - magenta LED at 8000K on one side, cyan LED at 9000K on other side. Motion during rotating light creating ghosting artifact.

Key imperfections: Significant motion blur in raised arms from movement during 1/60s exposure, phone autofocus hunting between moving subject and background, compression artifacts in solid color areas of dress, natural 2° camera tilt from handheld shooting while moving."

################################################################################
# CONCEPT 36
################################################################################
generate_concept 36 "IMAGE EDIT: Preserve exact facial bone structure, eye spacing, nose width, lip shape, jawline, ear shape, skin tone, eye color, eyebrow arch from reference photo. No changes to facial proportions or identity markers.

Camera capture physics: Shot on iPhone 15 Pro rear camera, ISO 2500-3200, f/1.6-1.8, 1/60s handheld in dim bar lighting. Phone autofocus hunted in low light - landed 1-2 inches off intended focus plane. Full sensor noise preserved - no computational photography noise reduction, no HDR stacking, no AI smoothing. JPEG compression from phone processing pipeline with 8-bit color depth showing banding in smooth gradients.

Scene: Woman at Voodoo Room wearing plum purple velvet mini dress with halter neck and open back, semi-transparent dark legwear, burgundy suede heeled booties. Hair in high ponytail with crimped texture showing 90s styling tool marks, baby hairs at hairline. Standing at vintage wooden bar holding rocks glass with whiskey, leaning back against bar edge, direct eye contact. Wednesday night 10pm.

Authentic skin texture captured by sensor: Visible pores on nose bridge and cheeks (0.1-0.2mm diameter), sebaceous filaments creating dark dots on nose, fine expression lines radiating from outer eye corners, uneven skin tone with darker areas under eyes and slight redness on cheeks/chin, oil shine on T-zone creating specular reflection where light hits forehead.

Real fabric physics: Velvet nap showing directional sheen creating light and dark patches depending on angle, individual thread weave visible, fabric compression wrinkles at waist from leaning position, lint particles caught in purple fibers, hosiery showing subtle mesh texture, suede showing matte surface with directional brushing marks.

Light transport and sensor capture: ISO 2600 luminance grain on all surfaces creating texture, color noise speckles (red/green) visible in shadow regions below 18% gray, blue channel 40% noisier than red/green channels. Red theatrical gel lighting from ceiling at 2500K creating deep red color cast on skin and clothing, single overhead source creating harsh shadow under chin. Whiskey in glass creating amber color transmission and refraction. Backlit from neon sign creating rim light on ponytail hair.

Key imperfections: Condensation on whiskey glass creating water droplets with refraction distortion, handheld shake during exposure, phone lens flare from bright neon background, chromatic aberration on high-contrast hair edge against bright background."

################################################################################
# CONCEPT 37
################################################################################
generate_concept 37 "IMAGE EDIT: Preserve exact facial bone structure, eye spacing, nose width, lip shape, jawline, ear shape, skin tone, eye color, eyebrow arch from reference photo. No changes to facial proportions or identity markers.

Camera capture physics: Shot on iPhone 15 Pro rear camera, ISO 2500-3200, f/1.6-1.8, 1/60s handheld in dim bar lighting. Phone autofocus hunted in low light - landed 1-2 inches off intended focus plane. Full sensor noise preserved - no computational photography noise reduction, no HDR stacking, no AI smoothing. JPEG compression from phone processing pipeline with 8-bit color depth showing banding in smooth gradients.

Scene: Woman at Moontower Saloon wearing cream knit sweater mini dress with long sleeves and turtleneck, brown semi-sheer hosiery, cream leather ankle boots. Hair in space buns on top of head with sections pulled through showing uneven sizing between buns. Sitting at outdoor picnic table under string lights, elbows on table, holding beer bottle, slight smile. Friday night 9pm in outdoor beer garden.

Authentic skin texture captured by sensor: Visible pores on nose bridge and cheeks (0.1-0.2mm diameter), sebaceous filaments creating dark dots on nose, fine expression lines radiating from outer eye corners, uneven skin tone with darker areas under eyes and slight redness on cheeks/chin, oil shine on T-zone creating specular reflection where light hits forehead.

Real fabric physics: Knit sweater showing cable knit pattern with interlocking loops, pilling on sleeves from friction, stretched collar from repeated wear, color variation in cream dye showing manufacture imperfections, hosiery showing sheer texture revealing skin tone beneath, leather showing natural grain texture.

Light transport and sensor capture: ISO 2500 luminance grain on all surfaces creating texture, color noise speckles (red/green) visible in shadow regions below 18% gray, blue channel 40% noisier than red/green channels. Overhead string lights at 2800K creating multiple small point sources, each creating individual hard shadow downward. Cold blue ambient twilight from sky mixing with warm string lights creating color temperature conflict - skin showing orange where lit by bulbs, blue in shadows. Beer bottle creating amber transmission color.

Key imperfections: Natural outdoor breeze creating motion blur in loose hair wisps during exposure, phone struggling with mixed daylight and tungsten white balance, slight overexposure on cream dress from auto-exposure metering, background defocused showing bokeh circles from string lights."

################################################################################
# CONCEPT 38
################################################################################
generate_concept 38 "IMAGE EDIT: Preserve exact facial bone structure, eye spacing, nose width, lip shape, jawline, ear shape, skin tone, eye color, eyebrow arch from reference photo. No changes to facial proportions or identity markers.

Camera capture physics: Shot on iPhone 15 Pro rear camera, ISO 2500-3200, f/1.6-1.8, 1/60s handheld in dim bar lighting. Phone autofocus hunted in low light - landed 1-2 inches off intended focus plane. Full sensor noise preserved - no computational photography noise reduction, no HDR stacking, no AI smoothing. JPEG compression from phone processing pipeline with 8-bit color depth showing banding in smooth gradients.

Scene: Woman at Sidewinder wearing hot pink leather mini dress with short sleeves and crew neck, dark fishnet-textured hosiery, white platform sneakers. Hair in two high pigtails with neon pink scrunchies, intentionally messy teasing at crown. Standing near stage with arms crossed, hip cocked to one side, skeptical expression with raised eyebrow. Thursday night 11pm during band setup.

Authentic skin texture captured by sensor: Visible pores on nose bridge and cheeks (0.1-0.2mm diameter), sebaceous filaments creating dark dots on nose, fine expression lines radiating from outer eye corners, uneven skin tone with darker areas under eyes and slight redness on cheeks/chin, oil shine on T-zone creating specular reflection where light hits forehead.

Real fabric physics: Leather showing natural grain texture with pebbled surface, slight creasing at movement points, color variation in dye application, stitching visible at seams, hosiery showing diamond mesh pattern texture, sneaker canvas showing dirt marks and scuff marks from wear.

Light transport and sensor capture: ISO 3000 luminance grain on all surfaces creating texture, color noise speckles (red/green) visible in shadow regions below 18% gray, blue channel 40% noisier than red/green channels. Stage lights at 3200K creating bright hot spots, one side of face overexposed from stage spotlight, other side falling into shadow. Pink LED accent lighting creating color contamination on pink dress and skin. Harsh theatrical lighting creating deep eye socket shadows.

Key imperfections: Lens flare from bright stage lights creating hexagonal artifacts, overexposure clipping highlights on pink leather to pure white, handheld shake, compression artifacts in solid pink color areas, autofocus struggling with high contrast stage lighting."

################################################################################
# CONCEPT 39
################################################################################
generate_concept 39 "IMAGE EDIT: Preserve exact facial bone structure, eye spacing, nose width, lip shape, jawline, ear shape, skin tone, eye color, eyebrow arch from reference photo. No changes to facial proportions or identity markers.

Camera capture physics: Shot on iPhone 15 Pro rear camera, ISO 2500-3200, f/1.6-1.8, 1/60s handheld in dim bar lighting. Phone autofocus hunted in low light - landed 1-2 inches off intended focus plane. Full sensor noise preserved - no computational photography noise reduction, no HDR stacking, no AI smoothing. JPEG compression from phone processing pipeline with 8-bit color depth showing banding in smooth gradients.

Scene: Woman at Violet Crown wearing navy blue satin slip mini dress with thin straps and V-neck, nude sheer hosiery with control top visible through sheer dress fabric, nude heeled sandals. Hair in loose waves with visible root growth showing darker roots, tucked behind one ear. Sitting in vintage theater seat, legs crossed, arm draped over seat back, looking to the side at projection screen glow. Tuesday night 10pm during movie screening.

Authentic skin texture captured by sensor: Visible pores on nose bridge and cheeks (0.1-0.2mm diameter), sebaceous filaments creating dark dots on nose, fine expression lines radiating from outer eye corners, uneven skin tone with darker areas under eyes and slight redness on cheeks/chin, oil shine on T-zone creating specular reflection where light hits forehead.

Real fabric physics: Satin showing directional sheen with bright highlights on curved surfaces, fabric draping showing weight and gravity, slight wrinkles from sitting position, lint particles visible on dark blue fabric, hosiery showing sheer texture with slight run starting at ankle, sandal straps creating compression marks on skin.

Light transport and sensor capture: ISO 3200 luminance grain on all surfaces creating texture, color noise speckles (red/green) visible in shadow regions below 18% gray, blue channel 40% noisier than red/green channels. Dim ambient theater lighting at 2700K creating low overall illumination, blue projection screen light at 6500K illuminating one side of face creating cool color cast. Face half in shadow, half in cool blue light. Inverse square falloff creating dark shadows away from screen light.

Key imperfections: High ISO noise very prominent due to extremely low light, phone struggling with exposure creating underexposed areas, autofocus hunting in near-darkness, motion blur from subject looking to side during exposure, blue light creating unnatural skin tones."

################################################################################
# CONCEPT 40
################################################################################
generate_concept 40 "IMAGE EDIT: Preserve exact facial bone structure, eye spacing, nose width, lip shape, jawline, ear shape, skin tone, eye color, eyebrow arch from reference photo. No changes to facial proportions or identity markers.

Camera capture physics: Shot on iPhone 15 Pro rear camera, ISO 2500-3200, f/1.6-1.8, 1/60s handheld in dim bar lighting. Phone autofocus hunted in low light - landed 1-2 inches off intended focus plane. Full sensor noise preserved - no computational photography noise reduction, no HDR stacking, no AI smoothing. JPEG compression from phone processing pipeline with 8-bit color depth showing banding in smooth gradients.

Scene: Woman at Radio Coffee & Beer wearing forest green corduroy mini dress with short sleeves and square neck, mustard yellow tights, brown leather combat boots. Hair in messy bun on top of head with pencil stuck through bun, loose pieces falling around face. Standing at coffee bar holding ceramic mug, looking down at phone in other hand, slight frown of concentration. Sunday afternoon 4pm in natural window light mixing with interior lights.

Authentic skin texture captured by sensor: Visible pores on nose bridge and cheeks (0.1-0.2mm diameter), sebaceous filaments creating dark dots on nose, fine expression lines radiating from outer eye corners, uneven skin tone with darker areas under eyes and slight redness on cheeks/chin, oil shine on T-zone creating specular reflection where light hits forehead.

Real fabric physics: Corduroy showing vertical ribbed texture with individual wale ridges, fabric showing wear patterns with shiny areas on high-friction zones, wrinkles with shadow depth, lint caught between wales, tights showing knit texture pattern, boots showing scuff marks and creasing at flex points.

Light transport and sensor capture: ISO 1200 luminance grain on all surfaces creating texture, color noise speckles (red/green) visible in shadow regions below 18% gray, blue channel 40% noisier than red/green channels. Large window at 5500K daylight creating soft directional side lighting, warm incandescent pendant lights at 2700K creating orange color cast mixing with blue daylight. Face showing two different color temperatures - cool blue on window side, warm orange on pendant light side. Phone screen creating bright blue upward light on face at 6500K.

Key imperfections: Mixed lighting creating white balance confusion with phone struggling between daylight and tungsten, chromatic aberration on phone screen edge, slight motion blur in hand holding phone, natural 1° tilt, coffee mug steam creating slight haze."

################################################################################
# CONCEPT 41
################################################################################
generate_concept 41 "IMAGE EDIT: Preserve exact facial bone structure, eye spacing, nose width, lip shape, jawline, ear shape, skin tone, eye color, eyebrow arch from reference photo. No changes to facial proportions or identity markers.

Camera capture physics: Shot on iPhone 15 Pro rear camera, ISO 2500-3200, f/1.6-1.8, 1/60s handheld in dim bar lighting. Phone autofocus hunted in low light - landed 1-2 inches off intended focus plane. Full sensor noise preserved - no computational photography noise reduction, no HDR stacking, no AI smoothing. JPEG compression from phone processing pipeline with 8-bit color depth showing banding in smooth gradients.

Scene: Woman at Hole in the Wall wearing black denim mini dress with button front and short sleeves, black opaque hosiery, red Converse high-tops. Hair dyed bright red with visible grow-out showing natural brown roots at scalp, styled in shaggy layers. Leaning against graffiti-covered wall outside venue, one foot propped against wall, smoking cigarette, exhaling smoke, looking directly at camera with neutral expression. Saturday night 11pm.

Authentic skin texture captured by sensor: Visible pores on nose bridge and cheeks (0.1-0.2mm diameter), sebaceous filaments creating dark dots on nose, fine expression lines radiating from outer eye corners, uneven skin tone with darker areas under eyes and slight redness on cheeks/chin, oil shine on T-zone creating specular reflection where light hits forehead.

Real fabric physics: Denim showing diagonal twill weave pattern, fading on high-wear areas, loose threads at button holes, wrinkles with sharp creases, hosiery showing matte opaque surface, canvas sneakers showing dirt accumulation and scuff marks on rubber toe caps, laces slightly frayed.

Light transport and sensor capture: ISO 2800 luminance grain on all surfaces creating texture, color noise speckles (red/green) visible in shadow regions below 18% gray, blue channel 40% noisier than red/green channels. Single overhead sodium vapor street light at 2100K creating deep orange color cast on skin and clothing, harsh top-down lighting creating dark shadows under nose and chin. Cigarette ember creating small bright orange point light source. Smoke particles scattering light creating visible smoke texture with backlight from street lamp.

Key imperfections: Handheld shake during exposure, smoke movement creating motion blur and ghosting, sodium vapor light creating extreme orange color cast with poor color rendering, lens flare from street light, underexposed areas crushing to black."

################################################################################
# CONCEPT 42
################################################################################
generate_concept 42 "IMAGE EDIT: Preserve exact facial bone structure, eye spacing, nose width, lip shape, jawline, ear shape, skin tone, eye color, eyebrow arch from reference photo. No changes to facial proportions or identity markers.

Camera capture physics: Shot on iPhone 15 Pro rear camera, ISO 2500-3200, f/1.6-1.8, 1/60s handheld in dim bar lighting. Phone autofocus hunted in low light - landed 1-2 inches off intended focus plane. Full sensor noise preserved - no computational photography noise reduction, no HDR stacking, no AI smoothing. JPEG compression from phone processing pipeline with 8-bit color depth showing banding in smooth gradients.

Scene: Woman at Hotel Vegas wearing white eyelet lace mini dress with short sleeves and scoop neck, white opaque hosiery, white platform heeled shoes. Hair in Dutch braids on both sides of head with small flowers woven in, some petals falling out. Standing at outdoor bar under fairy lights, holding margarita glass, mid-laugh with eyes squinted shut and head tilted back. Friday night 10pm in outdoor patio.

Authentic skin texture captured by sensor: Visible pores on nose bridge and cheeks (0.1-0.2mm diameter), sebaceous filaments creating dark dots on nose, fine expression lines radiating from outer eye corners, uneven skin tone with darker areas under eyes and slight redness on cheeks/chin, oil shine on T-zone creating specular reflection where light hits forehead.

Real fabric physics: Eyelet lace showing individual holes with reinforced edges, cotton fabric texture visible, slight yellowing on white fabric in creases, wrinkles from body movement, hosiery showing matte opaque surface, platform shoes showing scuff marks on white material.

Light transport and sensor capture: ISO 2400 luminance grain on all surfaces creating texture, color noise speckles (red/green) visible in shadow regions below 18% gray, blue channel 40% noisier than red/green channels. Overhead string fairy lights at 2800K creating multiple small warm point sources, each creating tiny hard shadow. Face tilted back showing under-chin lighting creating unusual shadow pattern. Margarita glass creating green lime color transmission. White dress overexposing in bright areas, clipping to pure white.

Key imperfections: Motion blur in head and hair from laughing movement during exposure, phone auto-exposure struggling with bright white dress causing underexposed face, lens flare from fairy lights creating artifacts, background bokeh showing light circles, compression artifacts in white blown-out areas."

################################################################################
# CONCEPT 43
################################################################################
generate_concept 43 "IMAGE EDIT: Preserve exact facial bone structure, eye spacing, nose width, lip shape, jawline, ear shape, skin tone, eye color, eyebrow arch from reference photo. No changes to facial proportions or identity markers.

Camera capture physics: Shot on iPhone 15 Pro rear camera, ISO 2500-3200, f/1.6-1.8, 1/60s handheld in dim bar lighting. Phone autofocus hunted in low light - landed 1-2 inches off intended focus plane. Full sensor noise preserved - no computational photography noise reduction, no HDR stacking, no AI smoothing. JPEG compression from phone processing pipeline with 8-bit color depth showing banding in smooth gradients.

Scene: Woman at The Liberty wearing charcoal gray wool blend mini dress with long sleeves and mock neck, patterned semi-sheer hosiery showing small geometric design, black leather ankle boots. Hair in sleek low ponytail with center part, edges gelled down showing product shine. Sitting in leather booth, arm draped along booth back, legs crossed, direct confident gaze at camera. Wednesday night 9pm.

Authentic skin texture captured by sensor: Visible pores on nose bridge and cheeks (0.1-0.2mm diameter), sebaceous filaments creating dark dots on nose, fine expression lines radiating from outer eye corners, uneven skin tone with darker areas under eyes and slight redness on cheeks/chin, oil shine on T-zone creating specular reflection where light hits forehead.

Real fabric physics: Wool blend showing subtle texture with small fiber ends visible, pilling starting on sleeves, wrinkles at elbow bend, lint particles caught in fibers, hosiery showing geometric pattern texture, leather boots showing natural grain and creasing, booth leather showing worn patina with cracking.

Light transport and sensor capture: ISO 2700 luminance grain on all surfaces creating texture, color noise speckles (red/green) visible in shadow regions below 18% gray, blue channel 40% noisier than red/green channels. Overhead pendant lamp at 2700K creating single hard light source, deep shadows in booth creating high contrast ratio. Dark leather booth absorbing light creating even darker background. Face illuminated from above creating shadows in eye sockets. Hair gel creating specular highlights on slicked edges.

Key imperfections: Handheld shake, phone struggling with high contrast scene creating crushed blacks in booth shadows, slight vignetting in corners from booth darkness, compression artifacts in solid gray dress areas, autofocus hunting between subject and dark background."

################################################################################
# CONCEPT 44
################################################################################
generate_concept 44 "IMAGE EDIT: Preserve exact facial bone structure, eye spacing, nose width, lip shape, jawline, ear shape, skin tone, eye color, eyebrow arch from reference photo. No changes to facial proportions or identity markers.

Camera capture physics: Shot on iPhone 15 Pro rear camera, ISO 2500-3200, f/1.6-1.8, 1/60s handheld in dim bar lighting. Phone autofocus hunted in low light - landed 1-2 inches off intended focus plane. Full sensor noise preserved - no computational photography noise reduction, no HDR stacking, no AI smoothing. JPEG compression from phone processing pipeline with 8-bit color depth showing banding in smooth gradients.

Scene: Woman at White Owl wearing mustard yellow ribbed knit mini dress with short sleeves and crew neck, brown textured hosiery, tan suede heeled booties. Hair in half-up half-down style with top section in messy bun, bottom section loose and wavy. Standing at vintage jukebox selecting song, one hand on jukebox, body turned to side showing profile, concentrated expression looking down at song list. Thursday night 10pm.

Authentic skin texture captured by sensor: Visible pores on nose bridge and cheeks (0.1-0.2mm diameter), sebaceous filaments creating dark dots on nose, fine expression lines radiating from outer eye corners, uneven skin tone with darker areas under eyes and slight redness on cheeks/chin, oil shine on T-zone creating specular reflection where light hits forehead.

Real fabric physics: Ribbed knit showing horizontal texture ridges, fabric stretched showing individual thread loops, pilling on high-friction areas, color variation in mustard dye, hosiery showing textured surface pattern, suede showing directional nap with darker and lighter patches.

Light transport and sensor capture: ISO 2600 luminance grain on all surfaces creating texture, color noise speckles (red/green) visible in shadow regions below 18% gray, blue channel 40% noisier than red/green channels. Jukebox interior lights at 3000K creating multicolored upward illumination on face from song list display - blue, yellow, red light mixing. Overhead pendant at 2700K creating downward top light. Profile lighting showing half face illuminated, half in shadow. Jukebox glass surface creating reflections.

Key imperfections: Reflection of jukebox lights in glass creating lens flare, mixed color temperatures confusing phone white balance, slight motion blur in hand on jukebox from movement, compression artifacts in solid yellow dress, autofocus struggling with bright jukebox lights."

################################################################################
# CONCEPT 45
################################################################################
generate_concept 45 "IMAGE EDIT: Preserve exact facial bone structure, eye spacing, nose width, lip shape, jawline, ear shape, skin tone, eye color, eyebrow arch from reference photo. No changes to facial proportions or identity markers.

Camera capture physics: Shot on iPhone 15 Pro rear camera, ISO 2500-3200, f/1.6-1.8, 1/60s handheld in dim bar lighting. Phone autofocus hunted in low light - landed 1-2 inches off intended focus plane. Full sensor noise preserved - no computational photography noise reduction, no HDR stacking, no AI smoothing. JPEG compression from phone processing pipeline with 8-bit color depth showing banding in smooth gradients.

Scene: Woman at Yellow Jacket wearing lilac purple satin mini dress with spaghetti straps and sweetheart neckline, black semi-sheer hosiery, black strappy heeled sandals. Hair in high ponytail with 80s-style crimped texture throughout, volume teased at crown. Dancing near bar with one arm raised, other hand holding beer bottle, mid-movement with blurred motion, mouth open singing along to music. Saturday midnight.

Authentic skin texture captured by sensor: Visible pores on nose bridge and cheeks (0.1-0.2mm diameter), sebaceous filaments creating dark dots on nose, fine expression lines radiating from outer eye corners, uneven skin tone with darker areas under eyes and slight redness on cheeks/chin, oil shine on T-zone creating specular reflection where light hits forehead.

Real fabric physics: Satin showing directional sheen with bright highlight areas and dark shadow areas in folds, fabric in motion showing movement blur, slight wrinkles from dancing, sweat dampness creating darker color patches, hosiery showing sheer texture, sandal straps creating compression on skin.

Light transport and sensor capture: ISO 3100 luminance grain on all surfaces creating texture, color noise speckles (red/green) visible in shadow regions below 18% gray, blue channel 40% noisier than red/green channels. Overhead track lighting at 3000K creating hard shadows, colored LED accent lights creating magenta and cyan color patches on skin and dress. Motion during exposure creating significant blur in raised arm and hair. Beer bottle creating amber glass transmission color.

Key imperfections: Significant motion blur in moving body parts - arm showing motion trail, hair showing blur from movement, phone struggling with fast movement creating focus issues, compression artifacts in solid satin color, overexposure on shiny satin highlights clipping to white."

################################################################################
# CONCEPT 46
################################################################################
generate_concept 46 "IMAGE EDIT: Preserve exact facial bone structure, eye spacing, nose width, lip shape, jawline, ear shape, skin tone, eye color, eyebrow arch from reference photo. No changes to facial proportions or identity markers.

Camera capture physics: Shot on iPhone 15 Pro rear camera, ISO 2500-3200, f/1.6-1.8, 1/60s handheld in dim bar lighting. Phone autofocus hunted in low light - landed 1-2 inches off intended focus plane. Full sensor noise preserved - no computational photography noise reduction, no HDR stacking, no AI smoothing. JPEG compression from phone processing pipeline with 8-bit color depth showing banding in smooth gradients.

Scene: Woman at Nickel City wearing teal velvet mini dress with long sleeves and high neck, burgundy patterned tights showing small floral design, burgundy velvet heeled booties. Hair in vintage pin curls all around head showing roller marks, hair spray making hair stiff and shiny. Sitting at vintage arcade game console, both hands on joystick, leaning forward toward screen, intense concentrated expression with furrowed brow. Friday night 11pm.

Authentic skin texture captured by sensor: Visible pores on nose bridge and cheeks (0.1-0.2mm diameter), sebaceous filaments creating dark dots on nose, fine expression lines radiating from outer eye corners, uneven skin tone with darker areas under eyes and slight redness on cheeks/chin, oil shine on T-zone creating specular reflection where light hits forehead.

Real fabric physics: Velvet nap showing directional sheen variation, individual thread weave visible, fabric compression wrinkles from leaning forward, lint particles caught in teal fibers, tights showing knit pattern with small floral motif texture, velvet booties showing directional nap.

Light transport and sensor capture: ISO 3000 luminance grain on all surfaces creating texture, color noise speckles (red/green) visible in shadow regions below 18% gray, blue channel 40% noisier than red/green channels. Arcade screen at 6500K creating bright blue-white light illuminating face from below, reversing normal shadow pattern with shadows pointing upward. Overhead pendant at 2700K creating warm top light mixing with cool screen light. Face showing blue color cast from screen light, creating unnatural skin tones.

Key imperfections: Screen light creating extreme contrast with dark shadows away from screen, handheld shake, compression artifacts in smooth screen glow gradient, autofocus confused by bright screen, chromatic aberration on high-contrast screen edge."

################################################################################
# CONCEPT 47
################################################################################
generate_concept 47 "IMAGE EDIT: Preserve exact facial bone structure, eye spacing, nose width, lip shape, jawline, ear shape, skin tone, eye color, eyebrow arch from reference photo. No changes to facial proportions or identity markers.

Camera capture physics: Shot on iPhone 15 Pro rear camera, ISO 2500-3200, f/1.6-1.8, 1/60s handheld in dim bar lighting. Phone autofocus hunted in low light - landed 1-2 inches off intended focus plane. Full sensor noise preserved - no computational photography noise reduction, no HDR stacking, no AI smoothing. JPEG compression from phone processing pipeline with 8-bit color depth showing banding in smooth gradients.

Scene: Woman at Grizzly Hall wearing camel brown suede mini dress with fringe detail at hemline and short sleeves, tan sheer hosiery, brown leather cowboy boots. Hair in two low pigtails with bandanas tied as bows, intentionally messy with pieces pulled out. Standing near mechanical bull, one hand on bull safety rail, other hand on hip, playful smile. Wednesday night 9pm.

Authentic skin texture captured by sensor: Visible pores on nose bridge and cheeks (0.1-0.2mm diameter), sebaceous filaments creating dark dots on nose, fine expression lines radiating from outer eye corners, uneven skin tone with darker areas under eyes and slight redness on cheeks/chin, oil shine on T-zone creating specular reflection where light hits forehead.

Real fabric physics: Suede showing matte nap texture with directional brushing, fringe showing individual leather strips with uneven lengths, slight wear marks on high-friction areas, hosiery showing sheer texture revealing skin beneath, cowboy boots showing leather creasing at flex points and scuff marks.

Light transport and sensor capture: ISO 2500 luminance grain on all surfaces creating texture, color noise speckles (red/green) visible in shadow regions below 18% gray, blue channel 40% noisier than red/green channels. Overhead barn-style pendant lamps at 2800K creating warm directional light, red neon sign in background creating color contamination on hair and shoulder. Single hard light creating defined shadow under chin and nose. Brown suede absorbing light creating darker material appearance.

Key imperfections: Handheld shake creating slight motion blur, red neon creating color fringing on edges, phone lens corner softness, natural 1.2° tilt from casual shooting position, background mechanical bull slightly out of focus."

################################################################################
# CONCEPT 48
################################################################################
generate_concept 48 "IMAGE EDIT: Preserve exact facial bone structure, eye spacing, nose width, lip shape, jawline, ear shape, skin tone, eye color, eyebrow arch from reference photo. No changes to facial proportions or identity markers.

Camera capture physics: Shot on iPhone 15 Pro rear camera, ISO 2500-3200, f/1.6-1.8, 1/60s handheld in dim bar lighting. Phone autofocus hunted in low light - landed 1-2 inches off intended focus plane. Full sensor noise preserved - no computational photography noise reduction, no HDR stacking, no AI smoothing. JPEG compression from phone processing pipeline with 8-bit color depth showing banding in smooth gradients.

Scene: Woman at King Bee wearing bright coral pink bodycon mini dress with off-shoulder neckline and short sleeves, nude control-top hosiery, nude patent leather heeled pumps. Hair in sleek high bun with gel edges and center part, baby hairs laid down with edge control. Standing at bar ordering drink, leaning slightly forward on bar with forearms on bar surface, looking up at bartender, mid-conversation with slight smile. Saturday night 11pm.

Authentic skin texture captured by sensor: Visible pores on nose bridge and cheeks (0.1-0.2mm diameter), sebaceous filaments creating dark dots on nose, fine expression lines radiating from outer eye corners, uneven skin tone with darker areas under eyes and slight redness on cheeks/chin, oil shine on T-zone creating specular reflection where light hits forehead.

Real fabric physics: Bodycon knit showing horizontal ribbing texture, fabric stretched tight showing individual thread loops, slight pilling on friction areas, color saturation showing bright coral, hosiery control top visible as darker band through dress fabric, patent leather showing high gloss reflection with bright highlights.

Light transport and sensor capture: ISO 2600 luminance grain on all surfaces creating texture, color noise speckles (red/green) visible in shadow regions below 18% gray, blue channel 40% noisier than red/green channels. Overhead pendant lamps at 2900K creating warm directional light from above, backlit by bar back bottles creating rim light on hair bun. Face looking up creating under-lighting effect. Patent leather pumps creating bright specular reflections. Edge control gel on hair creating specular highlights.

Key imperfections: Handheld shake, phone struggling with bright coral color creating slight color clipping, compression artifacts in solid coral areas, slight overexposure on patent leather highlights, autofocus hunting between face and bright bar back."

################################################################################
# CONCEPT 49
################################################################################
generate_concept 49 "IMAGE EDIT: Preserve exact facial bone structure, eye spacing, nose width, lip shape, jawline, ear shape, skin tone, eye color, eyebrow arch from reference photo. No changes to facial proportions or identity markers.

Camera capture physics: Shot on iPhone 15 Pro rear camera, ISO 2500-3200, f/1.6-1.8, 1/60s handheld in dim bar lighting. Phone autofocus hunted in low light - landed 1-2 inches off intended focus plane. Full sensor noise preserved - no computational photography noise reduction, no HDR stacking, no AI smoothing. JPEG compression from phone processing pipeline with 8-bit color depth showing banding in smooth gradients.

Scene: Woman at Drinks Lounge wearing slate gray satin slip mini dress with thin straps and bias cut, black opaque hosiery, black velvet platform heeled shoes. Hair in messy French twist with loose pieces falling around face and neck, bobby pins visible. Sitting in velvet lounge chair, legs crossed, holding cocktail glass with garnish, looking to the side away from camera showing profile. Tuesday night 10pm in dimly lit lounge area.

Authentic skin texture captured by sensor: Visible pores on nose bridge and cheeks (0.1-0.2mm diameter), sebaceous filaments creating dark dots on nose, fine expression lines radiating from outer eye corners, uneven skin tone with darker areas under eyes and slight redness on cheeks/chin, oil shine on T-zone creating specular reflection where light hits forehead.

Real fabric physics: Satin showing directional sheen with bright highlights on draped areas, bias cut creating diagonal fabric grain, wrinkles from sitting showing shadow depth, hosiery showing matte opaque surface, velvet platform shoes showing directional nap, visible bobby pins creating small metal reflections in hair.

Light transport and sensor capture: ISO 3100 luminance grain on all surfaces creating texture, color noise speckles (red/green) visible in shadow regions below 18% gray, blue channel 40% noisier than red/green channels. Single dim table lamp at 2600K creating soft warm light from side, profile lighting with face half illuminated half in shadow. Cocktail glass creating liquid transmission color from garnish. Deep shadows in lounge creating very dark background areas crushing to black.

Key imperfections: High ISO noise prominent in dark areas, phone struggling with low light creating underexposed regions, handheld shake, compression artifacts in dark shadow gradients, autofocus hunting in darkness, slight motion blur in loose hair pieces."

################################################################################
# CONCEPT 50
################################################################################
generate_concept 50 "IMAGE EDIT: Preserve exact facial bone structure, eye spacing, nose width, lip shape, jawline, ear shape, skin tone, eye color, eyebrow arch from reference photo. No changes to facial proportions or identity markers.

Camera capture physics: Shot on iPhone 15 Pro rear camera, ISO 2500-3200, f/1.6-1.8, 1/60s handheld in dim bar lighting. Phone autofocus hunted in low light - landed 1-2 inches off intended focus plane. Full sensor noise preserved - no computational photography noise reduction, no HDR stacking, no AI smoothing. JPEG compression from phone processing pipeline with 8-bit color depth showing banding in smooth gradients.

Scene: Woman at Rio Rita wearing electric blue sequined mini dress with long sleeves and mock neck, black semi-sheer textured hosiery, electric blue platform heeled shoes. Hair in high voluminous ponytail with extreme teasing creating 80s big hair, hair spray making hair stiff. Dancing on small dance floor, arms raised above head, eyes closed, head tilted back, mid-movement. Saturday midnight under disco ball.

Authentic skin texture captured by sensor: Visible pores on nose bridge and cheeks (0.1-0.2mm diameter), sebaceous filaments creating dark dots on nose, fine expression lines radiating from outer eye corners, uneven skin tone with darker areas under eyes and slight redness on cheeks/chin, oil shine on T-zone creating specular reflection where light hits forehead.

Real fabric physics: Sequins showing individual geometric flat surfaces each reflecting light differently creating sparkle pattern, sequin threads visible, fabric stretching from arm movement, sweat dampness visible on fabric, hosiery showing mesh texture pattern, platform shoes showing blue metallic finish.

Light transport and sensor capture: ISO 2900 luminance grain on all surfaces creating texture, color noise speckles (red/green) visible in shadow regions below 18% gray, blue channel 40% noisier than red/green channels. Rotating disco ball creating moving points of light across scene, each mirror facet creating individual specular reflection on sequins. Colored LED uplighting creating cyan and magenta color casts. Motion during rotation creating light trails and ghosting. Sequins creating hundreds of tiny specular highlights.

Key imperfections: Significant motion blur in raised arms and hair from dancing movement, phone struggling with moving lights creating exposure variation across frame, disco ball reflections creating moving bright spots, compression artifacts in solid blue sequined areas, overexposure on brightest sequin reflections."

################################################################################
# CONCEPT 51
################################################################################
generate_concept 51 "IMAGE EDIT: Preserve exact facial bone structure, eye spacing, nose width, lip shape, jawline, ear shape, skin tone, eye color, eyebrow arch from reference photo. No changes to facial proportions or identity markers.

Camera capture physics: Shot on iPhone 15 Pro rear camera, ISO 2500-3200, f/1.6-1.8, 1/60s handheld in dim bar lighting. Phone autofocus hunted in low light - landed 1-2 inches off intended focus plane. Full sensor noise preserved - no computational photography noise reduction, no HDR stacking, no AI smoothing. JPEG compression from phone processing pipeline with 8-bit color depth showing banding in smooth gradients.

Scene: Woman at East Side Showroom wearing wine red leather mini dress with cap sleeves and crew neck, dark patterned hosiery showing small polka dot design, black leather heeled ankle boots. Hair in Dutch braid crown around head with loose waves below, some braid pieces loosening. Standing near vintage velvet curtain backdrop, one hand touching curtain, body angled to side, direct eye contact with camera. Friday night 10pm.

Authentic skin texture captured by sensor: Visible pores on nose bridge and cheeks (0.1-0.2mm diameter), sebaceous filaments creating dark dots on nose, fine expression lines radiating from outer eye corners, uneven skin tone with darker areas under eyes and slight redness on cheeks/chin, oil shine on T-zone creating specular reflection where light hits forehead.

Real fabric physics: Leather showing natural grain texture with pebbled surface, slight creasing at movement points, color variation in wine red dye, stitching visible at seams, hosiery showing polka dot pattern texture, boots showing leather creasing and scuff marks, velvet curtain showing directional nap texture.

Light transport and sensor capture: ISO 2700 luminance grain on all surfaces creating texture, color noise speckles (red/green) visible in shadow regions below 18% gray, blue channel 40% noisier than red/green channels. Theatrical spotlight at 3200K creating hard directional light from upper left, deep shadows on right side of face. Red leather and red curtain creating monochromatic color scheme with subtle tonal variation. Leather creating specular highlights where light hits directly.

Key imperfections: Handheld shake, red-on-red color scheme creating compression artifacts with limited color variation, slight overexposure on leather highlights, natural 1.5° camera tilt, background curtain texture slightly out of focus."

################################################################################
# CONCEPT 52
################################################################################
generate_concept 52 "IMAGE EDIT: Preserve exact facial bone structure, eye spacing, nose width, lip shape, jawline, ear shape, skin tone, eye color, eyebrow arch from reference photo. No changes to facial proportions or identity markers.

Camera capture physics: Shot on iPhone 15 Pro rear camera, ISO 2500-3200, f/1.6-1.8, 1/60s handheld in dim bar lighting. Phone autofocus hunted in low light - landed 1-2 inches off intended focus plane. Full sensor noise preserved - no computational photography noise reduction, no HDR stacking, no AI smoothing. JPEG compression from phone processing pipeline with 8-bit color depth showing banding in smooth gradients.

Scene: Woman at Whistler's wearing olive green linen blend mini dress with short sleeves and square neckline, brown ribbed knit hosiery, olive green suede ankle boots. Hair in low messy bun at nape of neck with face-framing layers loose, natural texture with slight wave. Sitting on outdoor patio bench under string lights, elbows on knees, holding wine glass, leaning forward, talking to someone off-camera with animated expression. Thursday night 9pm.

Authentic skin texture captured by sensor: Visible pores on nose bridge and cheeks (0.1-0.2mm diameter), sebaceous filaments creating dark dots on nose, fine expression lines radiating from outer eye corners, uneven skin tone with darker areas under eyes and slight redness on cheeks/chin, oil shine on T-zone creating specular reflection where light hits forehead.

Real fabric physics: Linen showing natural slub texture with irregular thread thickness, wrinkles with sharp creases from sitting position, color variation in olive dye, hosiery showing ribbed texture pattern, suede showing matte directional nap, wine glass creating curved glass reflections.

Light transport and sensor capture: ISO 2500 luminance grain on all surfaces creating texture, color noise speckles (red/green) visible in shadow regions below 18% gray, blue channel 40% noisier than red/green channels. Overhead string lights at 2800K creating multiple small point sources, face leaning forward showing top lighting. Outdoor ambient light from twilight sky at 5500K mixing with warm string lights. Wine creating red transmission color in glass. Face showing mixed color temperatures.

Key imperfections: Natural outdoor breeze creating slight motion blur in loose hair pieces, phone white balance struggling with mixed daylight and tungsten, handheld shake, background string lights creating bokeh circles when defocused, compression artifacts in olive green solid areas."

################################################################################
# CONCEPT 53
################################################################################
generate_concept 53 "IMAGE EDIT: Preserve exact facial bone structure, eye spacing, nose width, lip shape, jawline, ear shape, skin tone, eye color, eyebrow arch from reference photo. No changes to facial proportions or identity markers.

Camera capture physics: Shot on iPhone 15 Pro rear camera, ISO 2500-3200, f/1.6-1.8, 1/60s handheld in dim bar lighting. Phone autofocus hunted in low light - landed 1-2 inches off intended focus plane. Full sensor noise preserved - no computational photography noise reduction, no HDR stacking, no AI smoothing. JPEG compression from phone processing pipeline with 8-bit color depth showing banding in smooth gradients.

Scene: Woman at Barfly's wearing chocolate brown velvet mini dress with spaghetti straps and sweetheart neckline, nude sheer hosiery, brown suede platform heeled shoes. Hair in vintage victory rolls on both sides of head with center section smooth, hair spray creating stiff texture and visible product buildup. Sitting at bar on leather stool, turned to face camera, legs crossed, one hand on knee, other hand holding whiskey glass, slight smirk. Wednesday night 10pm.

Authentic skin texture captured by sensor: Visible pores on nose bridge and cheeks (0.1-0.2mm diameter), sebaceous filaments creating dark dots on nose, fine expression lines radiating from outer eye corners, uneven skin tone with darker areas under eyes and slight redness on cheeks/chin, oil shine on T-zone creating specular reflection where light hits forehead.

Real fabric physics: Velvet nap showing directional sheen creating light and dark variation, individual thread weave visible in dress, wrinkles from sitting creating shadow depth, hosiery showing sheer texture revealing skin tone, suede platform showing matte texture, hair product buildup visible as white flaking in victory rolls.

Light transport and sensor capture: ISO 2800 luminance grain on all surfaces creating texture, color noise speckles (red/green) visible in shadow regions below 18% gray, blue channel 40% noisier than red/green channels. Overhead pendant lamp at 2700K creating warm top-down light, side illumination from bar back bottles creating rim light. Brown velvet absorbing most light creating darker dress appearance. Whiskey glass creating amber transmission color and specular reflection.

Key imperfections: Handheld shake, compression artifacts in dark brown velvet, slight overexposure on whiskey glass highlights, natural 0.7° camera tilt, leather stool showing worn patina with cracking texture, autofocus hunting between subject and bright bar back."

################################################################################
# CONCEPT 54
################################################################################
generate_concept 54 "IMAGE EDIT: Preserve exact facial bone structure, eye spacing, nose width, lip shape, jawline, ear shape, skin tone, eye color, eyebrow arch from reference photo. No changes to facial proportions or identity markers.

Camera capture physics: Shot on iPhone 15 Pro rear camera, ISO 2500-3200, f/1.6-1.8, 1/60s handheld in dim bar lighting. Phone autofocus hunted in low light - landed 1-2 inches off intended focus plane. Full sensor noise preserved - no computational photography noise reduction, no HDR stacking, no AI smoothing. JPEG compression from phone processing pipeline with 8-bit color depth showing banding in smooth gradients.

Scene: Woman at The Jackalope wearing neon yellow knit mini dress with short sleeves and boat neck, white opaque hosiery, white platform sneakers with neon yellow laces. Hair in space buns on top of head with neon yellow scrunchies, intentional messy texture with pieces sticking out. Standing at pinball machine, both hands on flipper buttons, leaning into game, tongue sticking out in concentration. Friday night 11pm.

Authentic skin texture captured by sensor: Visible pores on nose bridge and cheeks (0.1-0.2mm diameter), sebaceous filaments creating dark dots on nose, fine expression lines radiating from outer eye corners, uneven skin tone with darker areas under eyes and slight redness on cheeks/chin, oil shine on T-zone creating specular reflection where light hits forehead.

Real fabric physics: Knit showing horizontal ribbing texture, fabric stretched showing individual thread loops, pilling on friction areas, bright neon yellow color showing slight color variation in dye, hosiery showing matte opaque surface, sneaker canvas showing dirt marks and creasing.

Light transport and sensor capture: ISO 2900 luminance grain on all surfaces creating texture, color noise speckles (red/green) visible in shadow regions below 18% gray, blue channel 40% noisier than red/green channels. Pinball machine lights creating multicolored upward illumination - blue, red, yellow, green LEDs at various color temperatures creating complex mixed lighting on face. Neon yellow dress overexposing in bright areas. Face lit from below by game lights creating reversed shadow pattern.

Key imperfections: Phone camera struggling with extremely bright neon yellow creating color clipping and compression artifacts, mixed color temperature lights confusing white balance, handheld shake, lens flare from bright pinball lights creating artifacts, slight motion blur in hands on buttons."

################################################################################
# CONCEPT 55
################################################################################
generate_concept 55 "IMAGE EDIT: Preserve exact facial bone structure, eye spacing, nose width, lip shape, jawline, ear shape, skin tone, eye color, eyebrow arch from reference photo. No changes to facial proportions or identity markers.

Camera capture physics: Shot on iPhone 15 Pro rear camera, ISO 2500-3200, f/1.6-1.8, 1/60s handheld in dim bar lighting. Phone autofocus hunted in low light - landed 1-2 inches off intended focus plane. Full sensor noise preserved - no computational photography noise reduction, no HDR stacking, no AI smoothing. JPEG compression from phone processing pipeline with 8-bit color depth showing banding in smooth gradients.

Scene: Woman at Cheer Up Charlies wearing rainbow gradient sequined mini dress transitioning from red at top through orange, yellow, green, blue to purple at hem, black opaque hosiery, black platform heeled boots. Hair in high pigtails with rainbow temporary color spray showing uneven application, some natural brown showing through. Dancing near DJ booth, one arm raised, other hand holding phone taking selfie, mid-laugh. Saturday midnight under colored stage lights.

Authentic skin texture captured by sensor: Visible pores on nose bridge and cheeks (0.1-0.2mm diameter), sebaceous filaments creating dark dots on nose, fine expression lines radiating from outer eye corners, uneven skin tone with darker areas under eyes and slight redness on cheeks/chin, oil shine on T-zone creating specular reflection where light hits forehead.

Real fabric physics: Sequins in multiple colors each showing individual geometric surfaces reflecting light, sequin threads visible, fabric stretching from arm movement, sweat dampness creating darker patches, hosiery showing matte opaque surface, boots showing platform texture and scuff marks.

Light transport and sensor capture: ISO 3200 luminance grain on all surfaces creating texture, color noise speckles (red/green) visible in shadow regions below 18% gray, blue channel 40% noisier than red/green channels. Rotating colored LED stage lights creating moving color patches - magenta, cyan, yellow spots moving across scene. Each colored sequin reflecting different color depending on angle. Phone screen creating bright blue upward light on face. Extreme color confusion with multiple competing light sources.

Key imperfections: Significant motion blur from dancing and raised arm, phone struggling with rainbow colors creating compression and color artifacts, overexposure on sequin specular highlights, handheld shake, phone selfie screen visible in frame creating bright spot, autofocus confused by movement and bright lights."

################################################################################
# CONCEPT 56
################################################################################
generate_concept 56 "IMAGE EDIT: Preserve exact facial bone structure, eye spacing, nose width, lip shape, jawline, ear shape, skin tone, eye color, eyebrow arch from reference photo. No changes to facial proportions or identity markers.

Camera capture physics: Shot on iPhone 15 Pro rear camera, ISO 2500-3200, f/1.6-1.8, 1/60s handheld in dim bar lighting. Phone autofocus hunted in low light - landed 1-2 inches off intended focus plane. Full sensor noise preserved - no computational photography noise reduction, no HDR stacking, no AI smoothing. JPEG compression from phone processing pipeline with 8-bit color depth showing banding in smooth gradients.

Scene: Woman at Stay Gold wearing dusty rose satin slip mini dress with thin straps and cowl neck, nude control-top sheer hosiery, rose gold metallic heeled sandals. Hair in low loose chignon at nape with wispy pieces around face, natural texture showing. Sitting in vintage armchair, legs tucked to side, holding coffee cup, looking out window at street, profile view showing contemplative expression. Sunday afternoon 5pm in natural window light.

Authentic skin texture captured by sensor: Visible pores on nose bridge and cheeks (0.1-0.2mm diameter), sebaceous filaments creating dark dots on nose, fine expression lines radiating from outer eye corners, uneven skin tone with darker areas under eyes and slight redness on cheeks/chin, oil shine on T-zone creating specular reflection where light hits forehead.

Real fabric physics: Satin showing directional sheen with highlights on draped cowl neck, bias cut creating diagonal fabric grain, wrinkles from sitting position, hosiery control top visible as darker band, rose gold metallic sandals showing reflective surface with specular highlights.

Light transport and sensor capture: ISO 800 luminance grain on all surfaces creating texture, color noise speckles (red/green) visible in shadow regions below 18% gray, blue channel 40% noisier than red/green channels. Large window at 5500K daylight creating soft directional side lighting, face in profile with window side brightly lit, opposite side in shadow. Satin dress creating bright highlight where window light hits directly. Natural light showing true color rendering unlike tungsten bar lights. Soft shadow transition from light to dark side of face.

Key imperfections: Window light creating high contrast ratio with deep shadows, slight overexposure on window-facing side, handheld shake, natural 1° tilt, background street scene through window slightly out of focus, compression artifacts in smooth satin gradients."

################################################################################
# CONCEPT 57
################################################################################
generate_concept 57 "IMAGE EDIT: Preserve exact facial bone structure, eye spacing, nose width, lip shape, jawline, ear shape, skin tone, eye color, eyebrow arch from reference photo. No changes to facial proportions or identity markers.

Camera capture physics: Shot on iPhone 15 Pro rear camera, ISO 2500-3200, f/1.6-1.8, 1/60s handheld in dim bar lighting. Phone autofocus hunted in low light - landed 1-2 inches off intended focus plane. Full sensor noise preserved - no computational photography noise reduction, no HDR stacking, no AI smoothing. JPEG compression from phone processing pipeline with 8-bit color depth showing banding in smooth gradients.

Scene: Woman at Sahara Lounge wearing burnt orange velvet mini dress with long sleeves and high neck, dark brown opaque hosiery, cognac leather knee-high heeled boots. Hair in long loose waves with deep side part, natural volume with slight frizz from humidity. Standing on small stage near microphone stand, one hand on mic stand, other hand gesturing while talking, mouth open mid-sentence. Thursday night 9pm under stage lights.

Authentic skin texture captured by sensor: Visible pores on nose bridge and cheeks (0.1-0.2mm diameter), sebaceous filaments creating dark dots on nose, fine expression lines radiating from outer eye corners, uneven skin tone with darker areas under eyes and slight redness on cheeks/chin, oil shine on T-zone creating specular reflection where light hits forehead.

Real fabric physics: Velvet nap showing directional sheen variation, individual thread weave visible, fabric showing movement wrinkles from gesturing, lint particles caught in orange fibers, hosiery showing matte opaque surface, leather boots showing natural grain and creasing at knee bend.

Light transport and sensor capture: ISO 2600 luminance grain on all surfaces creating texture, color noise speckles (red/green) visible in shadow regions below 18% gray, blue channel 40% noisier than red/green channels. Overhead stage spotlight at 3200K creating harsh top-down lighting, deep shadows under chin and in eye sockets. Side stage light creating rim light on hair. Metallic microphone stand creating specular reflections. High contrast stage lighting creating dramatic shadow patterns.

Key imperfections: Motion blur in gesturing hand from movement during exposure, handheld shake, lens flare from bright stage lights creating hexagonal artifacts, compression artifacts in solid orange velvet, overexposure on brightest stage-lit areas, autofocus struggling with high contrast lighting."

################################################################################
# CONCEPT 58
################################################################################
generate_concept 58 "IMAGE EDIT: Preserve exact facial bone structure, eye spacing, nose width, lip shape, jawline, ear shape, skin tone, eye color, eyebrow arch from reference photo. No changes to facial proportions or identity markers.

Camera capture physics: Shot on iPhone 15 Pro rear camera, ISO 2500-3200, f/1.6-1.8, 1/60s handheld in dim bar lighting. Phone autofocus hunted in low light - landed 1-2 inches off intended focus plane. Full sensor noise preserved - no computational photography noise reduction, no HDR stacking, no AI smoothing. JPEG compression from phone processing pipeline with 8-bit color depth showing banding in smooth gradients.

Scene: Woman at Little Longhorn wearing denim mini dress with button front and short sleeves, white opaque hosiery, white leather cowboy boots with decorative stitching. Hair in two braided pigtails with red bandanas tied as bows, baby hairs and flyaways escaping braids. Standing near pool table holding pool cue, leaning on cue, watching game, slight smile. Sunday afternoon 3pm under fluorescent bar lights.

Authentic skin texture captured by sensor: Visible pores on nose bridge and cheeks (0.1-0.2mm diameter), sebaceous filaments creating dark dots on nose, fine expression lines radiating from outer eye corners, uneven skin tone with darker areas under eyes and slight redness on cheeks/chin, oil shine on T-zone creating specular reflection where light hits forehead.

Real fabric physics: Denim showing diagonal twill weave pattern, fading on seams and high-wear areas, button holes showing thread wear, wrinkles with sharp creases, hosiery showing matte opaque surface, leather boots showing decorative stitching texture and scuff marks on white leather.

Light transport and sensor capture: ISO 1600 luminance grain on all surfaces creating texture, color noise speckles (red/green) visible in shadow regions below 18% gray, blue channel 40% noisier than red/green channels. Overhead fluorescent tubes at 4000K creating harsh flat lighting with minimal shadows, green-blue color cast typical of fluorescent lights. Even illumination across scene with reduced dimensionality. Wood pool cue showing grain texture. Pool table felt creating green color bounce light.

Key imperfections: Fluorescent flicker creating slight banding in image, harsh flat lighting reducing depth, green fluorescent color cast creating unnatural skin tones, handheld shake, compression artifacts in denim blue areas, natural 0.5° tilt."

################################################################################
# CONCEPT 59
################################################################################
generate_concept 59 "IMAGE EDIT: Preserve exact facial bone structure, eye spacing, nose width, lip shape, jawline, ear shape, skin tone, eye color, eyebrow arch from reference photo. No changes to facial proportions or identity markers.

Camera capture physics: Shot on iPhone 15 Pro rear camera, ISO 2500-3200, f/1.6-1.8, 1/60s handheld in dim bar lighting. Phone autofocus hunted in low light - landed 1-2 inches off intended focus plane. Full sensor noise preserved - no computational photography noise reduction, no HDR stacking, no AI smoothing. JPEG compression from phone processing pipeline with 8-bit color depth showing banding in smooth gradients.

Scene: Woman at Carousel Lounge wearing seafoam green sequined mini dress with cap sleeves and scoop neck, silver metallic textured hosiery, silver platform heeled shoes. Hair in voluminous curls all over with 80s-style volume at crown, hair spray creating stiff texture. Sitting on vintage carousel horse prop, sidesaddle position, one hand on carousel pole, other hand on thigh, playful expression with tongue between teeth. Friday night 11pm under colored carousel lights.

Authentic skin texture captured by sensor: Visible pores on nose bridge and cheeks (0.1-0.2mm diameter), sebaceous filaments creating dark dots on nose, fine expression lines radiating from outer eye corners, uneven skin tone with darker areas under eyes and slight redness on cheeks/chin, oil shine on T-zone creating specular reflection where light hits forehead.

Real fabric physics: Sequins showing individual geometric surfaces each reflecting light differently, sequin threads visible, fabric draping over carousel horse, hosiery showing metallic sheen with textured pattern, platform shoes showing silver reflective surface with scuff marks on platforms.

Light transport and sensor capture: ISO 2800 luminance grain on all surfaces creating texture, color noise speckles (red/green) visible in shadow regions below 18% gray, blue channel 40% noisier than red/green channels. Rotating colored carousel lights creating moving patches of red, blue, yellow, green illumination. Sequins creating hundreds of tiny specular reflections at different angles. Vintage carousel horse paint showing peeling and wear. Motion during rotating lights creating color shifts across frame.

Key imperfections: Rotating lights creating uneven exposure across frame, handheld shake, compression artifacts in sequined areas, overexposure on brightest sequin reflections clipping to white, phone struggling with moving colored lights creating white balance shifts, slight motion blur from carousel movement."

################################################################################
# CONCEPT 60
################################################################################
generate_concept 60 "IMAGE EDIT: Preserve exact facial bone structure, eye spacing, nose width, lip shape, jawline, ear shape, skin tone, eye color, eyebrow arch from reference photo. No changes to facial proportions or identity markers.

Camera capture physics: Shot on iPhone 15 Pro rear camera, ISO 2500-3200, f/1.6-1.8, 1/60s handheld in dim bar lighting. Phone autofocus hunted in low light - landed 1-2 inches off intended focus plane. Full sensor noise preserved - no computational photography noise reduction, no HDR stacking, no AI smoothing. JPEG compression from phone processing pipeline with 8-bit color depth showing banding in smooth gradients.

Scene: Woman at Drink.Well wearing burgundy leather mini dress with long sleeves and mock neck, black semi-sheer patterned hosiery showing vertical stripe design, burgundy suede heeled ankle boots. Hair in sleek middle part with straight flat-ironed texture showing heat tool lines, tucked behind ears. Standing at craft cocktail bar, leaning forward on bar with both elbows on surface, holding elaborate garnished cocktail, examining drink with curious expression. Wednesday night 10pm under pendant bar lights.

Authentic skin texture captured by sensor: Visible pores on nose bridge and cheeks (0.1-0.2mm diameter), sebaceous filaments creating dark dots on nose, fine expression lines radiating from outer eye corners, uneven skin tone with darker areas under eyes and slight redness on cheeks/chin, oil shine on T-zone creating specular reflection where light hits forehead.

Real fabric physics: Leather showing natural grain texture with pebbled surface, slight creasing at elbow bends from leaning position, color variation in burgundy dye showing manufacture imperfections, stitching visible at seams, hosiery showing vertical stripe pattern texture, suede boots showing matte directional nap.

Light transport and sensor capture: ISO 2700 luminance grain on all surfaces creating texture, color noise speckles (red/green) visible in shadow regions below 18% gray, blue channel 40% noisier than red/green channels. Industrial pendant lamps at 2900K creating warm directional downlight, face leaning forward showing top lighting creating shadows in eye sockets. Elaborate cocktail garnish creating interesting shapes and colors, liquid in glass creating transmission color. Leather creating subtle specular highlights where light hits directly. Backlit by bar back bottles creating rim light.

Key imperfections: Handheld shake creating slight motion blur, compression artifacts in burgundy leather solid color areas, slight overexposure on cocktail glass highlights, natural 1.3° camera tilt from casual shooting position, background bar bottles slightly defocused, autofocus hunting between face and bright bar back lighting."

################################################################################
# GENERATION COMPLETE
################################################################################
log "========================================="
log "Batch complete: All 30 concepts processed"
log "Check $OUTPUT_DIR for generated images"
log "Review generation.log for any errors"
log "========================================="

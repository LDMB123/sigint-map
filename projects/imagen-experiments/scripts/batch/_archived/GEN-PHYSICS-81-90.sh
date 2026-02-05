#!/bin/bash

################################################################################
# GEN-PHYSICS-81-90.sh
# Deep Physics Enforcement for Dive Bar Portrait Concepts 81-90
#
# Reference Image: /Users/louisherman/Documents/463976510_8492755290802616_5918817029264776918_n.jpeg
# Physics Prefix: /Users/louisherman/ClaudeCodeProjects/PHYSICS-BASED-PREFIX.md
# Concepts: /Users/louisherman/ClaudeCodeProjects/ULTRA-REAL-concepts-81-90.md
# 4K Wrapper: /Users/louisherman/ClaudeCodeProjects/projects/imagen-experiments/scripts/nanobanana-4k-edit.js
#
# Usage: ./GEN-PHYSICS-81-90.sh
# Background: nohup ./GEN-PHYSICS-81-90.sh > physics-81-90.log 2>&1 &
################################################################################

set -e  # Exit on error

REFERENCE_IMAGE="/Users/louisherman/Documents/463976510_8492755290802616_5918817029264776918_n.jpeg"
WRAPPER_SCRIPT="/Users/louisherman/ClaudeCodeProjects/projects/imagen-experiments/scripts/nanobanana-4k-edit.js"
DELAY=120  # 120 seconds between generations

# ANSI colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Physics-Enforced Generation: Concepts 81-90${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Reference Image: $REFERENCE_IMAGE"
echo "4K Wrapper: $WRAPPER_SCRIPT"
echo "Delay between generations: ${DELAY}s"
echo ""

# Verify files exist
if [ ! -f "$REFERENCE_IMAGE" ]; then
    echo "ERROR: Reference image not found: $REFERENCE_IMAGE"
    exit 1
fi

if [ ! -f "$WRAPPER_SCRIPT" ]; then
    echo "ERROR: 4K wrapper script not found: $WRAPPER_SCRIPT"
    exit 1
fi

################################################################################
# PHYSICS PREFIX - Applied to every prompt
################################################################################

read -r -d '' PHYSICS_PREFIX << 'EOF' || true
**CRITICAL PHYSICS ENFORCEMENT - NOT AI GENERATED:**

**OPTICAL ABERRATIONS (Lens Imperfections):**
- Spherical aberration: Progressive blur increasing from center to edges, outer rays focus differently than center rays
- Coma: Off-axis light sources show asymmetric comet-tail streaking pointing radially outward from optical axis
- Astigmatism: Different focus planes for meridional vs sagittal directions, bokeh shows directional elongation
- Field curvature (Petzval): Center sharp but edges progressively out of focus even when perfectly focused center
- Chromatic aberration MUST follow physics: Red/blue separation at all edges with red displaced outward (longer wavelength = lower refraction), 1-3 pixel color shift at frame edges, stronger at wide apertures
- Airy disk diffraction at f/8+: No detail finer than 1.22λf/D (approximately 8-12 micrometers at f/8, 3-4 sensor pixels), inherent softness that sharpening cannot fix

**LENS VIGNETTING (cos⁴ law):**
- Optical vignetting follows cos⁴(θ) where θ is off-axis angle: ~20% brightness loss at corners at f/2.0, ~5% at f/8
- Mechanical vignetting from lens barrel creates sharper darkening edge with subtle aperture blade polygon shape (7-blade = heptagonal darkening pattern, 9-blade = smoother)
- NOT perfectly radially symmetric - slight asymmetry from lens element decentering
- Cat's eye pupil shape at extreme corners (entrance pupil appears elliptical when viewed off-axis)

**SENSOR PHYSICS (Digital Artifacts):**
- Bayer filter demosaicing artifacts: Moiré patterns on fine detail matching sensor pitch, zipper artifacts on diagonal edges, false color fringing at high-contrast boundaries
- Shot noise follows Poisson distribution NOT Gaussian: σ = √(Signal), shadows grainier than midtones, noise is signal-dependent
- Read noise pattern: Column banding from amplifier variations, specific hot pixels at reproducible locations, thermal noise increases at high ISO
- Fixed pattern noise: Same pixel locations show consistent bias across frames
- Color channel quantum efficiency: Green channel captures more photons (less grainy), blue channel noisiest, red intermediate - grain is NOT uniform across RGB
- Dark current hot pixels: Specific bright pixels at consistent locations, worsen with sensor temperature and long exposures

**LIGHT TRANSPORT PHYSICS:**
- Inverse square law ENFORCED: Light intensity = I₀/r², doubling distance = 1/4 brightness (NOT linear falloff), close subjects show dramatic 10:1 brightness ratio from near to far side
- Fresnel equations for reflections: Grazing angles (60-85°) show near-total reflection following R(θ) = ((n₁cosθ - n₂√(1-(n₁/n₂sinθ)²))/(n₁cosθ + n₂√(1-(n₁/n₂sinθ)²)))², skin at temples appears shinier at shallow angles, water shows mirror reflection at extreme angles
- Subsurface scattering in skin: Red/IR penetrates 2-3mm creating internal glow separate from surface texture, ears glow red when backlit, cheeks show warm color bleeding from beneath surface, blue light <1mm penetration (surface only)
- Rayleigh scattering: Atmospheric haze is BLUE not gray, distant objects shift blue proportional to distance following 1/λ⁴ scattering, intensity proportional to fourth power of wavelength
- Mie scattering (fog/water droplets): White/neutral haze NOT blue, strong forward scattering creates bright halos around backlit light sources, wavelength-independent scattering

**BOKEH PHYSICS:**
- Aperture blade geometry determines bokeh shape: 7 straight blades = heptagonal bokeh with hard edges and 7-fold symmetry, 9 rounded blades = nearly circular, blade count = polygon vertex count
- Spherical aberration creates "onion ring" concentric patterns inside bokeh orbs (budget lenses), aspherical elements smooth this (high-end lenses)
- Chromatic aberration extends into bokeh: Color fringing at bokeh edges with red outer ring and blue inner ring following glass dispersion curve
- Cat's eye bokeh at frame edges from mechanical vignetting (entrance pupil appears elliptical when viewed off-axis)

**MOTION & TEMPORAL PHYSICS:**
- Camera shake frequency spectrum: Hand tremor peaks at 1-3 Hz with harmonics at 5-10 Hz, 2-5 pixel displacement creates coherent motion at specific frequencies NOT white noise blur
- CMOS rolling shutter artifacts: Top-to-bottom readout over 5-40ms, fast horizontal motion creates slanted vertical lines, rotating objects show warping, distortion proportional to velocity and inversely proportional to readout speed
- Motion blur direction MUST match motion vector exactly, blur kernel width = (velocity in pixels/sec) × (shutter time), high frequencies blur more than low frequencies, NO introduction of new colors or textures

**LENS FLARE & INTERNAL REFLECTIONS:**
- Ghost reflections: Secondary images of bright light sources in line between source and optical center, position determined by optical geometry (calculable), ~4-5% brightness per ghost (uncoated glass) or <0.5% (modern coatings)
- Lens flare haze: Localized contrast reduction and brightening near bright sources from dust/glass scatter, more pronounced in zoom lenses (15-20 elements) than primes (4-8 elements)
- Ghost positions follow physical lens element spacing and are reproducible (same light position = identical ghost pattern for that lens model)

**RECIPROCITY FAILURE:**
- High ISO response is NON-LINEAR: Exposure law E × t^p where p ≈ 0.8-0.9 (NOT 1.0), long exposures at high ISO show paradoxical underexposure compared to reciprocity prediction, shadow clipping differs between ISO 3200/1/30s vs ISO 100/1s despite equal total light

**REAL CAMERA BEHAVIOR ENFORCEMENT:**
- Handheld images show 0.5-2° rotation from perfectly level, micro-tilt from hand position
- Dust spots on sensor: 1-3 small dark spots from dust particles, more visible at f/11+ due to diffraction, same locations across shots
- Focus breathing: Slight magnification change when focus distance changes (NOT constant framing across focus)
- Purple fringing: Severe chromatic aberration in high-contrast edges (bright sky meeting dark trees) showing magenta/purple glow from lens dispersion

**WHAT ZERO AI MEANS:**
- NO perfectly smooth skin - visible enlarged pores on nose/cheeks/forehead (30-50 micrometers diameter), sebaceous filaments, fine lines, slight redness, healing blemishes, skin tone variation, surface oil shine
- NO uniform bokeh - aperture blade count determines polygon shape, chromatic fringing at edges, onion rings from spherical aberration
- NO symmetric vignetting - slight asymmetry from element decentering, cos⁴ falloff not linear
- NO Gaussian noise - Poisson shot noise (σ = √Signal), color channel-specific grain (blue grainiest), Bayer demosaicing artifacts, fixed pattern noise
- NO linear light falloff - strict inverse square law (1/r²), dramatic falloff at close distances
- NO gray atmospheric haze - blue haze from Rayleigh scattering (1/λ⁴), white fog from Mie forward scatter
- NO perfect edge sharpness - chromatic aberration (1-3 pixel R/B shift), field curvature (edges softer), diffraction limit at f/8+ (Airy disk 3-4 pixels)
- NO rolling shutter immunity - fast motion creates slanted verticals and temporal warping over 5-40ms readout
- NO reciprocal exposure - high ISO shows non-linear response (E × t^p where p < 1)

**VERIFICATION SIGNATURES:**
Must exhibit ALL of these measurable physics signatures or it's AI-generated:
1. ✓ Chromatic aberration: 1-3 pixel R/B color shift at frame edges, red displaced outward
2. ✓ Inverse square falloff: Close subjects show 10:1 brightness ratio near-to-far (NOT linear)
3. ✓ Vignetting: ~20% corner darkening at f/2.0 following cos⁴(θ), NOT radially perfect
4. ✓ Aperture-shaped bokeh: 7-blade = heptagon, 9-blade = near-circle with subtle vertices
5. ✓ Poisson noise: Shadow grain √Signal dependent, blue channel grainiest, NOT uniform RGB
6. ✓ Atmospheric blue haze: Distant objects shift blue from Rayleigh scattering, NOT gray
7. ✓ Subsurface skin glow: Red/warm internal glow separate from surface texture
8. ✓ Rolling shutter: Fast horizontal motion creates slanted verticals (5-40ms readout)
9. ✓ Field curvature: Edges softer than center even when center perfectly focused
10. ✓ Demosaicing artifacts: Moiré, zipper edges, false color at high-contrast boundaries

This is a REAL PHOTOGRAPH captured with ACTUAL OPTICAL PHYSICS, not neural network generation. Every aberration, every noise pattern, every light transport behavior MUST follow measurable physical laws.

ULTRA PHOTOREALISTIC REAL-LIFE PHOTOGRAPH - NOT AI GENERATED: Authentic unretouched photo with visible skin pores, fine lines, natural imperfections, blemishes. Real fabric with actual wrinkles, pulls, loose threads, texture variations. Genuine camera sensor grain from high ISO (NOT artificial smoothing). Actual lens imperfections: chromatic aberration, vignetting, slight corner softness, dust spots. Real lighting physics with inverse square falloff, color temperature shifts 2700K-5500K, mixed light sources creating color casts. Authentic dive bar setting with visible dirt, wear, scuffs, stains, peeling paint, scratched surfaces. Natural candid moment with micro-expressions, slight motion blur, asymmetry. Zero AI smoothing, zero perfect symmetry, zero artificial beauty filters, zero plastic skin. This must be indistinguishable from a real photograph shot on actual film or digital sensor with all its imperfections.

EOF

################################################################################
# Concept 81: Small Victory Bar - Mustard Yellow Sweater Dress
################################################################################

echo -e "${BLUE}[$(date +%H:%M:%S)]${NC} Generating Concept 81: Small Victory Bar - Mustard Yellow Sweater Dress"

PROMPT_81="${PHYSICS_PREFIX}

A 35mm photograph captured on a Sony A7 III with a 50mm f/1.2 lens at ISO 2800, f/2.0, 1/60s. The woman leans against bar at Small Victory wearing mustard yellow cable-knit sweater dress with visible texture, pilling on elbows, and ribbed cuffs. Black opaque tights showing slight pilling paired with burgundy leather loafers with worn penny slots. Hair in genuinely messy bun with huge pieces fallen out secured with visible elastic. She is looking directly at the camera with direct eye contact, face showing visible enlarged pores especially on nose, fine lines around eyes, natural skin texture, slight redness on cheeks, and friendly smile. Lit by warm pendant light with copper shade overhead creating spotlight effect with harsh shadows and chalkboard menu visible behind. Background shows craft beer taps and bottles. Shot from bar level. Moderate grain at ISO 2800. Mustard color pops against dark bar. Pendant creates natural vignette. This captures happy hour bar conversation moment with cozy autumn aesthetic showing real textures."

node "$WRAPPER_SCRIPT" edit "$REFERENCE_IMAGE" "$PROMPT_81"

echo -e "${YELLOW}[$(date +%H:%M:%S)]${NC} Waiting ${DELAY}s before next generation..."
sleep $DELAY

################################################################################
# Concept 82: The Aristocrat Lounge - Charcoal Velvet Dress
################################################################################

echo -e "${BLUE}[$(date +%H:%M:%S)]${NC} Generating Concept 82: The Aristocrat Lounge - Charcoal Velvet Dress"

PROMPT_82="${PHYSICS_PREFIX}

A 35mm photograph captured on a Canon EOS R6 with a 50mm f/1.2 lens at ISO 2000, f/1.6, 1/60s. The woman sits on leather armchair near fireplace wearing charcoal velvet mini dress with directional nap creating tone variation and crushed texture at waist. Bare legs showing natural skin texture and slight goosebumps from temperature paired with black stiletto heels with worn tips. Hair in loose natural waves with slight frizz and flyaways catching firelight. She is looking directly at camera with direct eye contact showing visible enlarged pores, natural texture, fine lines, and warm expression. Lit primarily by wood-burning fireplace creating intense orange flickering light at 2200K from right side with amber sconces providing fill. Fire creates constantly shifting shadows and highlights with visible flames. Background shows brick wall with soot and stacked wood. Shot from low angle. Slight motion blur in fire reflections. Smoke creating air distortion. Charcoal appears to shift between black and grey. This captures cozy fireside atmosphere with genuine warmth."

node "$WRAPPER_SCRIPT" edit "$REFERENCE_IMAGE" "$PROMPT_82"

echo -e "${YELLOW}[$(date +%H:%M:%S)]${NC} Waiting ${DELAY}s before next generation..."
sleep $DELAY

################################################################################
# Concept 83: Seven Grand - Navy Leather Wrap Dress
################################################################################

echo -e "${BLUE}[$(date +%H:%M:%S)]${NC} Generating Concept 83: Seven Grand - Navy Leather Wrap Dress"

PROMPT_83="${PHYSICS_PREFIX}

A 35mm photograph captured on a Nikon Z6 II with a 50mm f/1.2 lens at ISO 3500, f/1.6, 1/60s. The woman sits in leather wingback chair at Seven Grand wearing navy blue leather wrap dress with natural creasing, tie waist, and visible wear on leather. Black thigh-high stockings with small run paired with black suede ankle boots with scuffed toes. Hair in loose low bun with soft pieces framing face and visible bobby pins. She is looking directly at camera with direct eye contact showing visible pores, natural texture, fine lines, and sophisticated expression. Lit by amber-colored uplights behind chair creating warm glow traveling up wood paneling and green banker's lamp providing task light. Scene has very warm color temperature at 2700K. Background shows whiskey bottles backlit creating bokeh and taxidermy with dust. Shot from floor level looking up. Extreme shallow depth at f/1.6. Cigar smoke creating haze. Navy leather creates specular highlights. This captures whiskey library atmosphere with editorial angle."

node "$WRAPPER_SCRIPT" edit "$REFERENCE_IMAGE" "$PROMPT_83"

echo -e "${YELLOW}[$(date +%H:%M:%S)]${NC} Waiting ${DELAY}s before next generation..."
sleep $DELAY

################################################################################
# Concept 84: Midnight Cowboy - Powder Pink Bandeau Dress
################################################################################

echo -e "${BLUE}[$(date +%H:%M:%S)]${NC} Generating Concept 84: Midnight Cowboy - Powder Pink Bandeau Dress"

PROMPT_84="${PHYSICS_PREFIX}

A 35mm photograph captured on a Sony A7R IV with a 85mm f/1.4 lens at ISO 5500, f/1.4, 1/60s. The woman stands near speakeasy entrance wearing powder pink strapless bandeau mini dress with ruching and wrinkles. White lace-top thigh-high stockings with floral pattern and runs paired with silver stilettos with scratched metallic finish. Hair in very low loose pigtails with uneven sections tied with black elastics. She is looking directly at camera with direct eye contact showing visible pores, natural texture, heavy makeup settling into lines, and sultry expression. Scene dramatically lit with red theatrical gel lighting from ceiling creating intense crimson color cast and single white spotlight creating cool rim light from side. Background shows velvet curtains and vintage wallpaper rendered in red tones. Shot with 85mm compression from distance. Extreme shallow depth at f/1.4 creating creamy bokeh. Strong chromatic aberration with magenta and cyan fringing. Powder pink appears lavender under red light. Motion blur on hand adjusting pigtail. This captures exclusive speakeasy drama with harsh color lighting revealing all textures."

node "$WRAPPER_SCRIPT" edit "$REFERENCE_IMAGE" "$PROMPT_84"

echo -e "${YELLOW}[$(date +%H:%M:%S)]${NC} Waiting ${DELAY}s before next generation..."
sleep $DELAY

################################################################################
# Concept 85: Weather Up - Tangerine Silk Slip Dress
################################################################################

echo -e "${BLUE}[$(date +%H:%M:%S)]${NC} Generating Concept 85: Weather Up - Tangerine Silk Slip Dress"

PROMPT_85="${PHYSICS_PREFIX}

A 35mm photograph captured on a Fujifilm X-T4 with a 35mm f/1.8 lens at ISO 2800, f/2.0, 1/50s. The woman stands taking bathroom mirror selfie wearing tangerine orange silk slip dress with bias cut showing extensive wrinkles and dark water spots on shoulders from dripping hair. Bare legs showing natural texture paired with black backless mules with worn insoles. Her hair genuinely wet and dripping creating visible water beads, pushed back from face showing wet strands and scalp. Phone visible in her hand with reflection showing. She glances at camera through mirror with direct eye contact showing completely bare face with no makeup revealing visible pores, slight redness, natural texture, small breakout, and wet face with water droplets. Harsh overhead Edison bulb lighting creating unflattering shadows under eyes and chin. Mirror has extensive smudges, water spots, toothpaste splatter, and lipstick marks. Walls covered in graffiti and sticker layers. Paper towel dispenser and soap bottles visible on counter showing grime. Someone washing hands in background out of focus. Water droplets on mirror creating distortions. Tangerine pops against grey-green bathroom tiles with chipped grout. This captures real bathroom freshening-up moment in harsh honest lighting."

node "$WRAPPER_SCRIPT" edit "$REFERENCE_IMAGE" "$PROMPT_85"

echo -e "${YELLOW}[$(date +%H:%M:%S)]${NC} Waiting ${DELAY}s before next generation..."
sleep $DELAY

################################################################################
# Concept 86: Roosevelt Room - Camel Suede Mini Dress
################################################################################

echo -e "${BLUE}[$(date +%H:%M:%S)]${NC} Generating Concept 86: Roosevelt Room - Camel Suede Mini Dress"

PROMPT_86="${PHYSICS_PREFIX}

A 35mm photograph captured on a Canon EOS R5 with a 56mm f/1.2 lens at ISO 1800, f/1.4, 1/60s. The woman leans over high cocktail table reading menu wearing camel tan suede mini dress with mock neck, visible stitching, and nap texture variation with small stain. Chocolate brown leather knee-high boots with pointed toe showing creasing and scuffs. Hair in sleek low ponytail with leather cord and escaped shorter pieces. Face partially obscured by menu she's holding showing fingernails with chipped polish. When visible, direct eye contact showing visible pores, natural texture, and concentrated expression. Lit by cluster of votive candles on table creating warm upward lighting and vintage brass sconces providing ambient fill. Background shows speakeasy shelves with bitters bottles and glassware with water spots. Shot from across table. Candlelight creates orange-yellow tones while brass lighting adds cooler tones. Razor-thin depth at f/1.4. Candles create lens flares and star bursts. Wax drips visible. Suede absorbs light creating rich shadows. Craft cocktail in foreground slightly out of focus. This captures menu-studying moment in warm intimate lighting."

node "$WRAPPER_SCRIPT" edit "$REFERENCE_IMAGE" "$PROMPT_86"

echo -e "${YELLOW}[$(date +%H:%M:%S)]${NC} Waiting ${DELAY}s before next generation..."
sleep $DELAY

################################################################################
# Concept 87: Whistler's - Mint Green Mesh Cutout Dress
################################################################################

echo -e "${BLUE}[$(date +%H:%M:%S)]${NC} Generating Concept 87: Whistler's - Mint Green Mesh Cutout Dress"

PROMPT_87="${PHYSICS_PREFIX}

A 35mm photograph captured on a Nikon Z7 II with a 35mm f/1.4 lens at ISO 7000, f/1.8, 1/80s. The woman dances near patio entrance wearing mint green mini dress with mesh side cutouts showing snags and black mesh contrast. Black and white vertical striped tights with runs creating optical effect paired with black patent platforms with scuffed edges. Hair in two high space buns with visible bobby pins and pieces pulled free. She is mid-dance with arms raised looking at camera with direct eye contact showing visible pores, flushed perspiring face, and laughing expression with eyes partially closed. Lit by multiple colored gel lights—cyan from left, magenta from right, amber from above—creating complex color mixing and multiple colored shadows. String lights creating bokeh background. Heavy motion blur on raised hands. Shot handheld at tilted angle. Very heavy grain at ISO 7000. Mint dress shifts colors under different lights. Colored lens flares across frame. This captures dance floor joy with chaotic energy."

node "$WRAPPER_SCRIPT" edit "$REFERENCE_IMAGE" "$PROMPT_87"

echo -e "${YELLOW}[$(date +%H:%M:%S)]${NC} Waiting ${DELAY}s before next generation..."
sleep $DELAY

################################################################################
# Concept 88: The Liberty Bar - Wine Velvet Wrap Dress
################################################################################

echo -e "${BLUE}[$(date +%H:%M:%S)]${NC} Generating Concept 88: The Liberty Bar - Wine Velvet Wrap Dress"

PROMPT_88="${PHYSICS_PREFIX}

A 35mm photograph captured on a Sony A7 III with a 24mm f/1.4 lens at ISO 11000, f/1.8, 1/30s. The woman sits in booth near window during thunderstorm wearing deep wine velvet wrap dress with crushed texture and tie waist. Burgundy velvet thigh-high boots matching dress with scuffing and water spots. Hair in very messy low bun destroyed by humidity with large pieces fallen and frizz everywhere. She glances toward camera with direct eye contact showing visible pores emphasized by humidity, smudged makeup, and flush from humidity. Scene mostly dark lit by dim amber pendants but lightning flash outside creates intense blue-white burst illuminating her from side during exposure. Creates dramatic split-second side lighting with blown highlights. Heavy rain visible streaking on window. Interior at 2700K while lightning at 6500K creating extreme temperature contrast. Shot with 24mm capturing her and window. Significant camera shake motion blur at 1/30s. Extreme grain at ISO 11000 with severe color noise. Lightning overexposes right side. Car headlights through rain creating streaky bokeh. Face half shadow half lightning. Whiskey glass reflecting lightning. This captures dramatic storm moment with lucky timing showing chaos."

node "$WRAPPER_SCRIPT" edit "$REFERENCE_IMAGE" "$PROMPT_88"

echo -e "${YELLOW}[$(date +%H:%M:%S)]${NC} Waiting ${DELAY}s before next generation..."
sleep $DELAY

################################################################################
# Concept 89: The Porch - Peach Linen Mini Dress
################################################################################

echo -e "${BLUE}[$(date +%H:%M:%S)]${NC} Generating Concept 89: The Porch - Peach Linen Mini Dress"

PROMPT_89="${PHYSICS_PREFIX}

A 35mm photograph captured on a Canon EOS R6 with a 50mm f/1.8 lens at ISO 500, f/2.5, 1/250s. The woman sits on outdoor porch during lazy Sunday afternoon wearing peach linen button-front mini dress with square neckline, puff sleeves, and extensive natural wrinkles throughout showing every crease. Cream ribbed ankle socks with dirt on bottom paired with tan canvas espadrille wedges with frayed rope and dirty canvas. Hair in loose side braid over shoulder with pieces pulled out and uneven tension creating lumps. She is looking directly at camera with direct eye contact showing visible pores, natural skin texture with freckles intensified by sun, slight sunburn on nose, and genuine relaxed smile. Lit by bright natural daylight around 3 PM at 5000K with porch roof providing dappled shade creating even soft lighting. Dappled sunlight through hanging plants creating light and shadow patterns on her and wooden planks. Background shows other patio tables, potted plants with dead leaves, and street beyond. Ceiling fan with dust creating slight motion blur. Shot from across table at seated level. Low ISO creating clean crisp detail with minimal grain. Colors completely natural and accurate. Beer bottle sweating with condensation creating wet ring on table. Natural shadows under jaw. Linen showing every realistic wrinkle. Gentle natural bokeh at f/2.5. Visible pollen in sunlight. Spider web in porch corner. Peeling paint on wood. This captures honest daytime dive bar experience in full sunlight."

node "$WRAPPER_SCRIPT" edit "$REFERENCE_IMAGE" "$PROMPT_89"

echo -e "${YELLOW}[$(date +%H:%M:%S)]${NC} Waiting ${DELAY}s before next generation..."
sleep $DELAY

################################################################################
# Concept 90: Drinks - Sky Blue Halter Dress
################################################################################

echo -e "${BLUE}[$(date +%H:%M:%S)]${NC} Generating Concept 90: Drinks - Sky Blue Halter Dress"

PROMPT_90="${PHYSICS_PREFIX}

A 35mm photograph captured on a Fujifilm X-T4 with a 50mm f/1.2 lens at ISO 18000, f/1.2, 1/30s. The woman sits slumped in booth at Drinks during extremely dark last call around 2 AM wearing sky blue satin halter mini dress with tied neck and extensive wrinkles. White sheer thigh-high stockings with lace tops and runs paired with silver metallic stilettos with severely scuffed finish. Hair parted exactly in middle hanging sleek and straight with slight length asymmetry and dry ends. She is looking toward camera with direct eye contact showing exhausted tired expression, extremely visible enlarged pores across entire face, fine lines intensified by harsh light, makeup mostly worn off showing bare patches, severe under-eye bags, and end-of-night fatigue. Scene almost completely dark with bar lights dimmed for last call. Only significant light is friend's phone flashlight held off-camera right approximately 2 feet away creating single harsh white LED beam at 5500K. Creates extremely dramatic side lighting with one side intensely illuminated showing every texture and other side in deep shadow with crushed blacks. Phone flashlight creates small focused beam with harsh falloff. Background nearly completely black with only tiny red exit sign glows. At ISO 18000, extreme aggressive grain and noise creating heavily textured rough quality with visible noise reduction artifacts. Color noise extremely prominent with large green and magenta splotches in shadows. Phone flashlight at 5500K contrasts harshly with warm amber bar lighting at 2400K creating 3100K difference. Shot from across booth. Sky blue appears almost white in direct light with blown highlights and disappears in shadow. Eyes squinting severely from direct flashlight creating pronounced lines. Phone screen glow in far background. Heavy vignetting. Significant camera shake at 1/30s. This captures brutal honest end-of-night reality with improvised phone lighting showing every exhausted detail."

node "$WRAPPER_SCRIPT" edit "$REFERENCE_IMAGE" "$PROMPT_90"

################################################################################
# Completion
################################################################################

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}All 10 concepts generated successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Completed at: $(date)${NC}"

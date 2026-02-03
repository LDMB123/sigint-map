#!/bin/bash

################################################################################
# GEN-PHYSICS-61-80.sh
# Deep Physics Enforcement for Ultra-Real Dive Bar Concepts 61-80
#
# Features:
# - Full physics-based prefix for optical/sensor authenticity
# - 4K output via nanobanana-4k-edit.js wrapper
# - 120-second delays between generations
# - Comprehensive error handling and logging
# - Reference: /Users/louisherman/Documents/Image 56.jpeg
#
# Usage:
#   chmod +x GEN-PHYSICS-61-80.sh
#   nohup ./GEN-PHYSICS-61-80.sh > physics-61-80.log 2>&1 &
################################################################################

set -euo pipefail

# Configuration
SCRIPT_DIR="/Users/louisherman/ClaudeCodeProjects/projects/imagen-experiments/scripts"
REFERENCE_IMAGE="/Users/louisherman/Documents/Image 56.jpeg"
WRAPPER_SCRIPT="${SCRIPT_DIR}/nanobanana-4k-edit.js"
DELAY=120

# Output directory
OUTPUT_DIR="${SCRIPT_DIR}/output/physics-61-80"
mkdir -p "${OUTPUT_DIR}"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

# Error handler
error_exit() {
    log "ERROR: $1"
    exit 1
}

# Check prerequisites
log "Starting GEN-PHYSICS-61-80.sh"
log "Checking prerequisites..."

[[ -f "${REFERENCE_IMAGE}" ]] || error_exit "Reference image not found: ${REFERENCE_IMAGE}"
[[ -f "${WRAPPER_SCRIPT}" ]] || error_exit "Wrapper script not found: ${WRAPPER_SCRIPT}"
[[ -x "${WRAPPER_SCRIPT}" ]] || chmod +x "${WRAPPER_SCRIPT}"

log "All prerequisites satisfied"
log "Output directory: ${OUTPUT_DIR}"
log "Reference image: ${REFERENCE_IMAGE}"

# Physics-based prefix
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
# CONCEPT 61: The White Horse - Coral Pink Cowl Neck Slip Dress
################################################################################
log "=== CONCEPT 61: The White Horse - Coral Pink Cowl Neck Slip Dress ==="

CONCEPT_61_PROMPT="${PHYSICS_PREFIX}

A 35mm photograph captured on a Sony A7 III with a 50mm f/1.2 lens at ISO 4500, f/1.4, 1/60s. The woman leans against the worn wooden bar at The White Horse with visible scratches and beer rings, wearing a coral pink satin cowl neck slip dress with thin straps showing fabric rolling and bias-cut construction creating natural draping with extensive wrinkles throughout. Her legs are bare showing natural skin texture, visible leg hair, small bruises, and natural skin tone variation, paired with nude ankle strap heels with scuffed leather and worn heel caps. Her hair falls in loose natural waves showing slightly greasy roots and split ends at the bottom. She is looking directly at the camera with direct eye contact, face showing visible enlarged pores especially on nose and cheeks, fine lines around eyes, natural skin texture with freckles, slight oil shine on T-zone, and relaxed smile. The scene is lit by classic neon honky-tonk signs—a red Lone Star Beer sign with one tube flickering, a blue Shiner Bock sign with visible dust, and a yellow cowboy boot-shaped neon—creating overlapping colored light. Additional warm light comes from vintage wagon wheel chandeliers with some bulbs burned out. The background shows country music band equipment with visible duct tape on cases, a mechanical bull with worn padding slightly out of focus, and sawdust on wooden floor visible at bottom of frame. Shot at eye level creating natural conversation perspective. At ISO 4500, prominent grain creates gritty texture with visible color noise. Her coral dress appears to shift between pink and orange depending on which neon dominates creating realistic color confusion. Lens flare from bright neon creates warm streaks. Visible cigarette smoke haze in air. This captures the authentic Texas honky-tonk dive bar atmosphere shot by a friend between sets."

log "Generating Concept 61..."
node "${WRAPPER_SCRIPT}" edit "${REFERENCE_IMAGE}" "${CONCEPT_61_PROMPT}" || log "WARNING: Concept 61 generation failed"
log "Concept 61 complete. Waiting ${DELAY}s..."
sleep ${DELAY}

################################################################################
# CONCEPT 62: Spider House Cafe - Olive Green Ribbed Tank Dress
################################################################################
log "=== CONCEPT 62: Spider House Cafe - Olive Green Ribbed Tank Dress ==="

CONCEPT_62_PROMPT="${PHYSICS_PREFIX}

A 35mm photograph captured on a Fujifilm X-T4 with a 35mm f/1.4 lens at ISO 800, f/2.2, 1/200s. The woman sits at an outdoor picnic table at Spider House Cafe with visible graffiti carved into wood during bright afternoon, wearing an olive green ribbed tank mini dress with thick straps showing slight pilling and fabric stretching at chest. Mustard yellow knee-high socks with visible slouching at ankles and slight pilling create color contrast, paired with white canvas sneakers with dirty rubber soles and frayed laces. Her hair is pulled into an extremely messy bun with huge sections fallen out secured with visible scrunchie. She is looking directly at the camera with direct eye contact, face showing visible enlarged pores, freckles intensified by sunlight, natural skin texture, slight sunburn on nose, and squinting from brightness. Lit by bright natural daylight at 5200K around 3 PM with dappled shade from tree branches creating moving shadow patterns. Background shows Austin skyline slightly out of focus, other patio-goers, and vintage camper trailer bar with peeling paint. Shot from across table at seated level. Lower ISO creates clean detail. Colors are natural and accurate. Beer in plastic cup with condensation sits on table showing wet rings. Natural shadows under jawline. Visible pollen in sunlight shafts. This captures casual daytime dive bar hangout in honest sunlight."

log "Generating Concept 62..."
node "${WRAPPER_SCRIPT}" edit "${REFERENCE_IMAGE}" "${CONCEPT_62_PROMPT}" || log "WARNING: Concept 62 generation failed"
log "Concept 62 complete. Waiting ${DELAY}s..."
sleep ${DELAY}

################################################################################
# CONCEPT 63: C-Boy's Heart & Soul - Burnt Orange Velvet Mini Dress
################################################################################
log "=== CONCEPT 63: C-Boy's Heart & Soul - Burnt Orange Velvet Mini Dress ==="

CONCEPT_63_PROMPT="${PHYSICS_PREFIX}

A 35mm photograph captured on a Canon EOS R6 with a 50mm f/1.2 lens at ISO 7500, f/1.8, 1/60s. The woman stands near the stage at C-Boy's during a soul music set wearing a burnt orange velvet mini dress with short sleeves showing crushed velvet texture and directional nap variation. Tan fishnet tights with large runs showing skin underneath paired with worn brown leather cowboy boots with scuffed toes and stacked heels. Her hair pulled to side in low loose ponytail with elastic showing and pieces escaped. She is looking directly at the camera with direct eye contact showing visible enlarged pores, perspiration creating shine, smudged eyeliner, and flushed cheeks. Scene lit by stage lights—warm amber and cool blue creating split lighting. Moving lights create beams through smoke showing visible haze. Background shows band on stage as motion-blurred silhouettes. Shot from audience at standing level. Heavy grain at ISO 7500 with aggressive color noise. Orange dress shifts between red and yellow under different lights. Motion blur on raised hand. Lens flare from stage lights. This captures live music energy with authentic chaos."

log "Generating Concept 63..."
node "${WRAPPER_SCRIPT}" edit "${REFERENCE_IMAGE}" "${CONCEPT_63_PROMPT}" || log "WARNING: Concept 63 generation failed"
log "Concept 63 complete. Waiting ${DELAY}s..."
sleep ${DELAY}

################################################################################
# CONCEPT 64: The Bus Stop - Navy Blue Slip Dress
################################################################################
log "=== CONCEPT 64: The Bus Stop - Navy Blue Slip Dress ==="

CONCEPT_64_PROMPT="${PHYSICS_PREFIX}

A 35mm photograph captured on a Nikon Z6 II with a 35mm f/1.8 lens at ISO 6400, f/1.8, 1/50s. The woman sits in a dark corner booth at The Bus Stop with visible duct-taped vinyl wearing a navy blue satin slip dress with lace trim showing loose threads and wrinkles. Sheer nude thigh-high stockings with runs and twisted seam paired with black patent Mary Janes with scratched finish. Her dark hair hangs straight down showing flat roots and slight frizz. She is looking directly at the camera with direct eye contact, face showing visible pores, tired eyes with bags, natural texture, and contemplative expression. Lighting from single overhead pendant creating harsh downward shadows. Background nearly black with hints of bar shelves. Heavy grain at ISO 6400 with color noise throughout. Navy appears almost black in shadows. Slight camera shake from 1/50s handheld. This captures late-night solitude in authentic dim bar corner."

log "Generating Concept 64..."
node "${WRAPPER_SCRIPT}" edit "${REFERENCE_IMAGE}" "${CONCEPT_64_PROMPT}" || log "WARNING: Concept 64 generation failed"
log "Concept 64 complete. Waiting ${DELAY}s..."
sleep ${DELAY}

################################################################################
# CONCEPT 65: Barbarella - Hot Pink Metallic Bodycon Dress
################################################################################
log "=== CONCEPT 65: Barbarella - Hot Pink Metallic Bodycon Dress ==="

CONCEPT_65_PROMPT="${PHYSICS_PREFIX}

A 35mm photograph captured on a Sony A7R IV with a 35mm f/1.4 lens at ISO 8000, f/1.8, 1/80s. The woman dances on the floor at Barbarella wearing hot pink metallic bodycon mini dress with visible compression lines and fabric stress. White platform go-go boots with scuffed platforms and dirty white leather. Hair in two space buns with bobby pins showing and pieces falling. She is mid-dance with direct eye contact, face showing visible pores, heavy perspiration, smudged makeup, and euphoric expression. Lit by rotating disco ball creating moving light spots, colored LED panels creating cyan and magenta washes, and UV blacklights. Heavy fog creating visible beams. Background shows other dancers as motion blurs. Shot handheld at tilted angle. Extreme grain at ISO 8000. Pink dress glows under UV. Significant motion blur. Multiple lens flares. This captures dance floor chaos."

log "Generating Concept 65..."
node "${WRAPPER_SCRIPT}" edit "${REFERENCE_IMAGE}" "${CONCEPT_65_PROMPT}" || log "WARNING: Concept 65 generation failed"
log "Concept 65 complete. Waiting ${DELAY}s..."
sleep ${DELAY}

################################################################################
# CONCEPT 66: Voodoo Room - Black Lace Overlay Dress
################################################################################
log "=== CONCEPT 66: Voodoo Room - Black Lace Overlay Dress ==="

CONCEPT_66_PROMPT="${PHYSICS_PREFIX}

A 35mm photograph captured on a Canon EOS R5 with a 85mm f/1.2 lens at ISO 3200, f/1.6, 1/60s. The woman sits at intimate table at Voodoo Room wearing black lace overlay mini dress with floral pattern over nude lining showing snags. Black seamed stockings with visible seams twisted and small run paired with black stilettos with worn heel caps. Hair styled in vintage victory rolls with visible bobby pins and one roll coming loose. She is looking directly at the camera with direct eye contact showing visible pores, natural texture, red lipstick slightly smudged, and mysterious smile. Lit by candelabra on table with flickering candles creating moving shadows. Background shows velvet curtains and taxidermy. Shallow depth creates strong bokeh. Warm candlelight at 1900K. Slight motion blur on candle flames. This captures vintage speakeasy atmosphere."

log "Generating Concept 66..."
node "${WRAPPER_SCRIPT}" edit "${REFERENCE_IMAGE}" "${CONCEPT_66_PROMPT}" || log "WARNING: Concept 66 generation failed"
log "Concept 66 complete. Waiting ${DELAY}s..."
sleep ${DELAY}

################################################################################
# CONCEPT 67: Moontower Saloon - Denim Mini Dress
################################################################################
log "=== CONCEPT 67: Moontower Saloon - Denim Mini Dress ==="

CONCEPT_67_PROMPT="${PHYSICS_PREFIX}

A 35mm photograph captured on a Fujifilm X-T4 with a 35mm f/1.4 lens at ISO 3200, f/2.0, 1/60s. The woman sits by outdoor fire pit at Moontower Saloon wearing light wash denim button-front mini dress with frayed hem and visible wear. Bare legs with natural texture paired with tan leather cowboy boots with heavy scuffing. Hair in two braided pigtails with uneven braiding. She is looking directly at camera with direct eye contact showing visible pores, freckles, sunburn, and genuine smile. Lit by fire pit creating warm orange glow from left and string lights overhead. Fire creates flickering highlights and smoke haze. Background shows other patrons and outdoor seating. Shot from across fire. Moderate grain. Denim appears golden in firelight. Visible ash particles. This captures Texas outdoor bar atmosphere."

log "Generating Concept 67..."
node "${WRAPPER_SCRIPT}" edit "${REFERENCE_IMAGE}" "${CONCEPT_67_PROMPT}" || log "WARNING: Concept 67 generation failed"
log "Concept 67 complete. Waiting ${DELAY}s..."
sleep ${DELAY}

################################################################################
# CONCEPT 68: The Sidewinder - Emerald Green Halter Dress
################################################################################
log "=== CONCEPT 68: The Sidewinder - Emerald Green Halter Dress ==="

CONCEPT_68_PROMPT="${PHYSICS_PREFIX}

A 35mm photograph captured on a Nikon Z7 II with a 50mm f/1.4 lens at ISO 4000, f/1.8, 1/80s. The woman leans over pool table at The Sidewinder wearing emerald green halter mini dress with tied neck and backless design showing wrinkles. Black fishnet tights with multiple runs paired with black platform sandals with scuffed platforms. Hair in high tight ponytail with elastic visible. She is concentrating on pool shot but eyes glance at camera with direct eye contact showing visible pores, natural texture, and focused expression. Lit by green-shaded pool table pendant creating cone of light and green color cast from felt. Background dark with beer signs creating bokeh. Shot with 50mm from table end. Noticeable grain. Green dress enhanced by pool light. Chalk dust visible in air. This captures pool game moment."

log "Generating Concept 68..."
node "${WRAPPER_SCRIPT}" edit "${REFERENCE_IMAGE}" "${CONCEPT_68_PROMPT}" || log "WARNING: Concept 68 generation failed"
log "Concept 68 complete. Waiting ${DELAY}s..."
sleep ${DELAY}

################################################################################
# CONCEPT 69: Violet Crown Social Club - Cream Knit Dress
################################################################################
log "=== CONCEPT 69: Violet Crown Social Club - Cream Knit Dress ==="

CONCEPT_69_PROMPT="${PHYSICS_PREFIX}

A 35mm photograph captured on a Sony A7 III with a 55mm f/1.8 lens at ISO 1250, f/2.0, 1/125s. The woman sits by window at Violet Crown wearing cream cable-knit turtleneck mini dress with visible texture and pilling. Tan suede thigh-high boots with scuffing and water stains. Hair in low messy bun with pieces fallen. She is looking directly at camera with direct eye contact showing visible pores, freckles, natural texture, and contemplative expression. Lit by natural window light creating bright side lighting and warm interior lights. Background shows bar interior slightly out of focus. Shot from across table. Moderate grain. Cream dress appears golden in mixed light. Dust particles in window light. This captures afternoon golden hour in bar."

log "Generating Concept 69..."
node "${WRAPPER_SCRIPT}" edit "${REFERENCE_IMAGE}" "${CONCEPT_69_PROMPT}" || log "WARNING: Concept 69 generation failed"
log "Concept 69 complete. Waiting ${DELAY}s..."
sleep ${DELAY}

################################################################################
# CONCEPT 70: Radio Coffee & Beer - Rust Midi Shirt Dress
################################################################################
log "=== CONCEPT 70: Radio Coffee & Beer - Rust Midi Shirt Dress ==="

CONCEPT_70_PROMPT="${PHYSICS_PREFIX}

A 35mm photograph captured on a Canon EOS R6 with a 35mm f/1.8 lens at ISO 640, f/2.5, 1/250s. The woman sits at outdoor picnic table at Radio in morning wearing rust-colored linen button-front shirt dress with extensive wrinkles. Black suede ankle boots with wear. Dark hair loose and natural with morning bedhead texture. She is looking directly at camera with direct eye contact showing visible pores, no makeup showing natural skin, slight bags under eyes, and genuine morning smile. Lit by bright morning sunlight at 5500K creating natural even lighting. Background shows other morning patrons and street. Shot from across table. Clean low ISO detail. Colors accurate and natural. Coffee cup with visible steam. Natural shadows. This captures morning hangout reality."

log "Generating Concept 70..."
node "${WRAPPER_SCRIPT}" edit "${REFERENCE_IMAGE}" "${CONCEPT_70_PROMPT}" || log "WARNING: Concept 70 generation failed"
log "Concept 70 complete. Waiting ${DELAY}s..."
sleep ${DELAY}

################################################################################
# CONCEPT 71: Hole in the Wall - Wine Red Satin Dress
################################################################################
log "=== CONCEPT 71: Hole in the Wall - Wine Red Satin Dress ==="

CONCEPT_71_PROMPT="${PHYSICS_PREFIX}

A 35mm photograph captured on a Fujifilm X-T4 with a 35mm f/1.4 lens at ISO 5000, f/1.8, 1/60s. The woman stands at bar wearing wine red satin cowl mini dress with wrinkles and liquid draping. Black opaque tights with pilling paired with black leather ankle boots with scuffing. Hair in loose side braid coming apart. She is looking directly at camera with direct eye contact showing visible pores, natural texture, wine-stained lips, and relaxed expression. Lit by neon beer signs creating colored overlapping light—red, blue, yellow creating mixed temperature. Background shows bar bottles and patrons. Shot at bar level. Heavy grain at ISO 5000. Red dress shifts colors under different neon. Visible haze. This captures classic neon bar atmosphere."

log "Generating Concept 71..."
node "${WRAPPER_SCRIPT}" edit "${REFERENCE_IMAGE}" "${CONCEPT_71_PROMPT}" || log "WARNING: Concept 71 generation failed"
log "Concept 71 complete. Waiting ${DELAY}s..."
sleep ${DELAY}

################################################################################
# CONCEPT 72: Hotel Vegas - Black Sequin Tank Dress
################################################################################
log "=== CONCEPT 72: Hotel Vegas - Black Sequin Tank Dress ==="

CONCEPT_72_PROMPT="${PHYSICS_PREFIX}

A 35mm photograph captured on a Sony A7R IV with a 35mm f/1.4 lens at ISO 9000, f/1.8, 1/80s. The woman stands near stage at Hotel Vegas wearing black sequin tank mini dress with missing sequins. Black tights with extensive rips and holes paired with black combat boots heavily worn. Hair in extremely messy updo falling apart. She is mid-concert watching band with direct eye contact showing visible pores, heavy perspiration, completely smudged makeup, and ecstatic expression. Lit by stage lights through heavy fog creating visible beams—amber and cyan creating split tones. Background shows stage and crowd as motion blurs. Shot from crowd. Extreme grain at ISO 9000. Sequins create chaotic reflections. Heavy motion blur. Multiple lens flares. This captures concert chaos perfectly."

log "Generating Concept 72..."
node "${WRAPPER_SCRIPT}" edit "${REFERENCE_IMAGE}" "${CONCEPT_72_PROMPT}" || log "WARNING: Concept 72 generation failed"
log "Concept 72 complete. Waiting ${DELAY}s..."
sleep ${DELAY}

################################################################################
# CONCEPT 73: The Liberty - Champagne Slip Dress
################################################################################
log "=== CONCEPT 73: The Liberty - Champagne Slip Dress ==="

CONCEPT_73_PROMPT="${PHYSICS_PREFIX}

A 35mm photograph captured on a Nikon Z6 II with a 50mm f/1.8 lens at ISO 1600, f/2.0, 1/50s. The woman sits at booth wearing champagne satin slip dress with bias cut showing all wrinkles. Nude strappy heels with wear. Hair in vintage finger waves with visible product and some waves loosening. She is looking directly at camera with direct eye contact showing visible pores, natural texture, period makeup, and elegant expression. Lit by multiple table candles creating warm flickering light at 1900K. Background shows dark booth and ambient sconces. Shot across table. Moderate grain. Champagne fabric glows in candlelight. Wax drips visible. Slight motion blur on flames. This captures romantic candlelit elegance with vintage styling."

log "Generating Concept 73..."
node "${WRAPPER_SCRIPT}" edit "${REFERENCE_IMAGE}" "${CONCEPT_73_PROMPT}" || log "WARNING: Concept 73 generation failed"
log "Concept 73 complete. Waiting ${DELAY}s..."
sleep ${DELAY}

################################################################################
# CONCEPT 74: The White Owl - Teal Mesh Dress
################################################################################
log "=== CONCEPT 74: The White Owl - Teal Mesh Dress ==="

CONCEPT_74_PROMPT="${PHYSICS_PREFIX}

A 35mm photograph captured on a Canon EOS R5 with a 35mm f/1.8 lens at ISO 1000, f/2.2, 1/160s. The woman sits by window wearing teal mesh overlay mini dress with visible snags over black lining. Black athletic leggings with pilling paired with white sneakers showing dirt. Hair in messy top knot with scrunchie. She is looking directly at camera with direct eye contact showing visible pores, freckles, minimal makeup, and casual expression. Lit by bright afternoon window light creating natural illumination mixed with dim interior lights. Background shows bar interior. Shot from nearby table. Moderate grain. Teal appears vibrant in natural light. Dust visible in light shaft. This captures casual afternoon dive bar hangout."

log "Generating Concept 74..."
node "${WRAPPER_SCRIPT}" edit "${REFERENCE_IMAGE}" "${CONCEPT_74_PROMPT}" || log "WARNING: Concept 74 generation failed"
log "Concept 74 complete. Waiting ${DELAY}s..."
sleep ${DELAY}

################################################################################
# CONCEPT 75: Yellow Jacket - Burgundy Leather Dress
################################################################################
log "=== CONCEPT 75: Yellow Jacket - Burgundy Leather Dress ==="

CONCEPT_75_PROMPT="${PHYSICS_PREFIX}

A 35mm photograph captured on a Fujifilm X-T4 with a 56mm f/1.2 lens at ISO 3600, f/1.4, 1/60s. The woman stands by jukebox wearing burgundy leather wrap mini dress with visible creasing. Black thigh-high stockings with run paired with black heeled ankle boots with worn heels. Hair in loose waves with natural texture. She is selecting music looking toward camera with direct eye contact showing visible pores, natural texture, and focused expression. Lit by jukebox internal warm glow creating side lighting mixed with neon beer signs creating colored fill. Background shows bar walls with stickers. Shot from slight angle. Noticeable grain. Burgundy appears richer in jukebox light. Chrome reflections. This captures jukebox selection moment."

log "Generating Concept 75..."
node "${WRAPPER_SCRIPT}" edit "${REFERENCE_IMAGE}" "${CONCEPT_75_PROMPT}" || log "WARNING: Concept 75 generation failed"
log "Concept 75 complete. Waiting ${DELAY}s..."
sleep ${DELAY}

################################################################################
# CONCEPT 76: Nickel City - Silver Metallic Mini Dress
################################################################################
log "=== CONCEPT 76: Nickel City - Silver Metallic Mini Dress ==="

CONCEPT_76_PROMPT="${PHYSICS_PREFIX}

A 35mm photograph captured on a Sony A7 III with a 50mm f/1.2 lens at ISO 6000, f/1.4, 1/60s. The woman leans against arcade game wearing silver metallic mini dress with wrinkles catching light. Bare legs showing natural texture paired with silver platform heels with scuffed finish. Hair in two space buns with bobby pins visible. She is looking directly at camera with direct eye contact showing visible pores, natural texture, glitter makeup partially worn off, and playful expression. Lit by arcade game screens creating colored light and neon beer signs creating overlapping colors. Background shows more arcade games and pinball machines. Shot slightly low angle. Heavy grain at ISO 6000. Silver dress reflects all colors chaotically. Strong chromatic aberration. This captures arcade bar aesthetic perfectly."

log "Generating Concept 76..."
node "${WRAPPER_SCRIPT}" edit "${REFERENCE_IMAGE}" "${CONCEPT_76_PROMPT}" || log "WARNING: Concept 76 generation failed"
log "Concept 76 complete. Waiting ${DELAY}s..."
sleep ${DELAY}

################################################################################
# CONCEPT 77: Grizzly Hall - Camel Suede Dress
################################################################################
log "=== CONCEPT 77: Grizzly Hall - Camel Suede Dress ==="

CONCEPT_77_PROMPT="${PHYSICS_PREFIX}

A 35mm photograph captured on a Nikon Z7 II with a 35mm f/1.8 lens at ISO 3500, f/2.0, 1/80s. The woman sits at pool table edge wearing camel suede mini dress with visible nap texture and wear. Brown leather knee-high boots with scuffing and creasing. Hair in sleek low ponytail with some pieces escaped. She is looking directly at camera with direct eye contact showing visible pores, freckles, natural texture, and relaxed smile. Lit by green-shaded pool table pendant creating warm downward light and green color cast from felt reflecting up. Background dark with beer signs creating bokeh. Shot from across table. Noticeable grain. Camel suede absorbs light creating depth. Chalk dust visible in light cone. This captures pool hall atmosphere authentically."

log "Generating Concept 77..."
node "${WRAPPER_SCRIPT}" edit "${REFERENCE_IMAGE}" "${CONCEPT_77_PROMPT}" || log "WARNING: Concept 77 generation failed"
log "Concept 77 complete. Waiting ${DELAY}s..."
sleep ${DELAY}

################################################################################
# CONCEPT 78: King Bee - Electric Blue Cutout Dress
################################################################################
log "=== CONCEPT 78: King Bee - Electric Blue Cutout Dress ==="

CONCEPT_78_PROMPT="${PHYSICS_PREFIX}

A 35mm photograph captured on a Canon EOS R6 with a 28mm f/1.8 lens at ISO 4500, f/2.0, 1/100s. The woman stands at jukebox wearing electric blue mini dress with geometric cutouts showing skin. Black opaque tights with slight pilling paired with black patent Mary Janes with scratched finish. Hair in two low pigtails with uneven volume. She is pointing at jukebox looking toward camera with direct eye contact showing visible pores, natural texture, and concentrated expression. Lit by jukebox cycling colored lights—red, blue, amber creating color shifts and beer sign neon creating additional colors. Background shows bar interior. Shot from nearby capturing her and jukebox. Noticeable grain. Blue dress pops against dim bar. Motion blur on pointing hand. Lens flare from jukebox. This captures song selection moment with authentic lighting."

log "Generating Concept 78..."
node "${WRAPPER_SCRIPT}" edit "${REFERENCE_IMAGE}" "${CONCEPT_78_PROMPT}" || log "WARNING: Concept 78 generation failed"
log "Concept 78 complete. Waiting ${DELAY}s..."
sleep ${DELAY}

################################################################################
# CONCEPT 79: Drinks Lounge - Emerald Satin Wrap Dress
################################################################################
log "=== CONCEPT 79: Drinks Lounge - Emerald Satin Wrap Dress ==="

CONCEPT_79_PROMPT="${PHYSICS_PREFIX}

A 35mm photograph captured on a Sony A7R IV with a 55mm f/1.8 lens at ISO 1200, f/2.0, 1/50s. The woman sits at intimate table wearing emerald green satin wrap dress with all wrinkles visible. Nude thigh-high stockings with shimmer paired with nude heels with scuffing. Hair swept to side with visible bobby pin. She is looking directly at camera with direct eye contact showing visible pores, natural texture, and mysterious smile. Lit by low table candles creating warm flickering light and amber sconces providing fill. Background shows dark lounge interior. Shot across table. Moderate grain. Emerald appears rich in warm candlelight. Wax drips on candles. Slight flame motion blur. This captures intimate lounge atmosphere with elegant styling."

log "Generating Concept 79..."
node "${WRAPPER_SCRIPT}" edit "${REFERENCE_IMAGE}" "${CONCEPT_79_PROMPT}" || log "WARNING: Concept 79 generation failed"
log "Concept 79 complete. Waiting ${DELAY}s..."
sleep ${DELAY}

################################################################################
# CONCEPT 80: Rio Rita - Coral Bodycon Dress
################################################################################
log "=== CONCEPT 80: Rio Rita - Coral Bodycon Dress ==="

CONCEPT_80_PROMPT="${PHYSICS_PREFIX}

A 35mm photograph captured on a Fujifilm X-T4 with a 35mm f/1.4 lens at ISO 1600, f/1.8, 1/125s. The woman stands by window during sunset wearing coral ribbed bodycon dress with visible compression. Black suede ankle boots with scuffing. Hair in messy bun with sections fallen. She is silhouetted by window looking toward camera with direct eye contact visible showing visible pores in fill light, natural texture, and contemplative expression. Lit by bright sunset backlight creating rim lighting and warm interior lights providing fill. Background shows colorful wall murals. Shot from inside looking toward window. Moderate grain. Coral dress glows at edges from backlight. Strong lens flare creating hazy quality. Dust particles visible in light. This captures golden hour window moment with dramatic backlighting showing real textures."

log "Generating Concept 80..."
node "${WRAPPER_SCRIPT}" edit "${REFERENCE_IMAGE}" "${CONCEPT_80_PROMPT}" || log "WARNING: Concept 80 generation failed"
log "Concept 80 complete."

################################################################################
# COMPLETION
################################################################################
log "=== ALL CONCEPTS COMPLETE ==="
log "Generated 20 physics-enforced concepts (61-80)"
log "Output directory: ${OUTPUT_DIR}"
log "Check individual generation logs for any warnings or errors"
log "GEN-PHYSICS-61-80.sh finished successfully"

#!/bin/bash
# Physics-Enforced Generation Script for Concepts 31-60
# Generated: 2026-01-29

REFERENCE_IMAGE="/Users/louisherman/Documents/LWMMoms - 374.jpeg"
WRAPPER_SCRIPT="/Users/louisherman/ClaudeCodeProjects/projects/imagen-experiments/scripts/nanobanana-4k-edit.js"
DELAY=120

echo "Starting Physics-Enforced Generation: Concepts 31-60"
echo "Started at: $(date)"
echo ""

# Concept 31: The White Owl Social Club - Champagne Sequin Slip Dress
# Metadata: Wild hair (wet look), fishnet tights, stilettos, fog lighting
echo "Generating Concept 31: The White Owl Social Club - Champagne Sequin Slip Dress"
node "$WRAPPER_SCRIPT" edit \
  "$REFERENCE_IMAGE" \
  "**CRITICAL PHYSICS ENFORCEMENT - NOT AI GENERATED:**

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
- Spherical aberration creates \"onion ring\" concentric patterns inside bokeh orbs (budget lenses), aspherical elements smooth this (high-end lenses)
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

A 35mm photograph captured on a Sony A7 III with a 35mm f/1.8 lens at ISO 3200, f/2.0, 1/60s. The woman stands near the entrance of The White Owl Social Club during a foggy midnight moment, wearing a champagne sequin slip dress that catches every fragment of light like scattered diamonds. The dress features delicate spaghetti straps and hits mid-thigh, with individual sequins creating pinpoint reflections. Individual sequins show slight tarnishing, thread pulls between sequin rows, and uneven attachment creating authentic fabric imperfection. Black fishnet tights with a diamond pattern cover her legs, showing small snags near the ankle and slight runs, paired with burgundy patent leather stilettos with 4-inch heels showing scuff marks on the toe box and worn heel caps. Her dark hair has a wet, slicked-back look as if she just stepped in from the rain, with water droplets still visible on the strands creating actual beads of moisture, creating a glossy, intentionally messy appearance with visible scalp texture and individual hair strands clumping together with product. Dense fog fills the foreground from a fog machine near the door, diffusing the amber string lights overhead into soft golden orbs. The background shows the bar's vintage taxidermy owl mounted on distressed wood paneling with visible termite damage, water stains, and peeling varnish, slightly out of focus at f/2.0. A red exit sign creates a crimson glow on the left edge of the frame, the plastic cover cracked and yellowed with age. The camera is handheld, creating a slight 1.2-degree tilt to the right. Chromatic aberration appears as magenta fringing around the bright sequins. The fog creates natural diffusion, softening highlights on her face showing visible skin texture with enlarged pores on nose and cheeks, fine lines around eyes, slight redness on chin, and a small healing blemish on forehead while the sequins remain sharp and glittery. A slight motion blur affects her left hand as she pushes wet hair behind her ear. She is looking directly at the camera with direct eye contact, showing slight asymmetry in eye shape and one eyebrow slightly higher than the other. The scene captures that 2 AM moment when someone steps inside from unexpected weather, all glamour and resilience, still looking stunning despite being caught in the rain. The photograph has the spontaneous quality of a friend noticing she looks incredible even soaking wet and grabbing a quick shot before the moment passes, fog swirling around her ankles like a movie scene. Dust particles visible in air, cigarette smoke residue creating haze, actual dirt on floor visible at bottom of frame."

if [ $? -eq 0 ]; then
  echo "✓ Concept 31 completed at $(date)"
else
  echo "✗ Concept 31 FAILED at $(date)"
fi

echo "Waiting $DELAY seconds before next generation..."
sleep $DELAY
echo ""

# Concept 32: Grizzly Hall - Forest Green Bandage Dress
# Metadata: Knee-high boots, sleek ponytail, blacklight
echo "Generating Concept 32: Grizzly Hall - Forest Green Bandage Dress"
node "$WRAPPER_SCRIPT" edit \
  "$REFERENCE_IMAGE" \
  "**CRITICAL PHYSICS ENFORCEMENT - NOT AI GENERATED:**

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
- Spherical aberration creates \"onion ring\" concentric patterns inside bokeh orbs (budget lenses), aspherical elements smooth this (high-end lenses)
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

A 35mm photograph captured on a Canon EOS R6 with a 50mm f/1.2 lens at ISO 6400, f/1.4, 1/50s. The woman leans against the edge of the pool table at Grizzly Hall, wearing a forest green bandage dress with thick horizontal ribbing that creates texture and structure showing slight compression marks where the tight bands dig into skin. The dress has a square neckline and long sleeves, hitting mid-thigh with the distinctive tight, body-hugging fit of bandage construction with visible stress lines at seams and slight pilling at friction points on hips. Black leather knee-high boots with a slight heel and silver buckle details showing tarnish and wear complete the look, with visible creasing across the foot flex point and scuff marks on heels. Her dark hair is pulled back in a sleek low ponytail with not a strand out of place except for fine baby hairs along hairline catching light, creating an elegant contrast to the dive bar setting, with visible hair tie indent and slight scalp tension. She is looking directly at the camera with direct eye contact, showing natural eye asymmetry and visible sclera veins. The scene is lit primarily by blacklight UV tubes mounted behind the bar, causing white elements in the frame to glow purple-blue while her dress appears darker with an ethereal edge glow, and revealing lint particles on fabric glowing brightly. The pool table felt glows bright green under the UV light showing cigarette burns and beer stains. Fluorescent beer signs in the background create additional colored light sources—a blue Pabst sign with one flickering tube and an orange Lone Star sign with visible dust coating. The shallow depth of field at f/1.4 renders the background into soft bokeh orbs of colored light. A slight lens flare streak crosses the upper right corner from the Pabst sign. The camera angle is slightly low, shot from across the pool table, making her appear statuesque. Grain structure is prominent at ISO 6400, giving the image a gritty texture with visible color noise in shadows that matches the dive bar aesthetic. Her left hand rests on the pool table edge showing natural skin texture, visible knuckle creases, and unpainted nails with slight dirt under them, a pool cue visible but out of focus in the foreground with chalk dust on its tip. The UV lighting creates an otherworldly club atmosphere while maintaining the divey authenticity with visible grime on surfaces. Her face shows visible skin texture with enlarged pores, slight oil shine on T-zone, fine lines at eye corners, and natural facial asymmetry. This is the kind of shot a friend takes during a weird theme night, when the lighting turns everyone into glowing characters from a neon dream."

if [ $? -eq 0 ]; then
  echo "✓ Concept 32 completed at $(date)"
else
  echo "✗ Concept 32 FAILED at $(date)"
fi

echo "Waiting $DELAY seconds before next generation..."
sleep $DELAY
echo ""

# Concept 33: Volstead Lounge - Copper Metallic Asymmetric Dress
# Metadata: Thigh-high stockings (nude), platform heels, space buns
echo "Generating Concept 33: Volstead Lounge - Copper Metallic Asymmetric Dress"
node "$WRAPPER_SCRIPT" edit \
  "$REFERENCE_IMAGE" \
  "**CRITICAL PHYSICS ENFORCEMENT - NOT AI GENERATED:**

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
- Spherical aberration creates \"onion ring\" concentric patterns inside bokeh orbs (budget lenses), aspherical elements smooth this (high-end lenses)
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

A 35mm photograph captured on a Nikon Z6 II with a 35mm f/1.8 lens at ISO 2500, f/2.2, 1/80s. The woman sits sideways on a vintage leather barstool at Volstead Lounge showing cracked leather with foam padding visible through splits, wearing a copper metallic asymmetric dress with one shoulder exposed and the hemline cutting diagonally from upper thigh on one side to just above the knee on the other. The metallic fabric has a brushed copper finish that shifts between warm orange and rose gold depending on the angle of light, with visible wrinkle lines at waist and slight pulling at side seam. Sheer nude thigh-high stockings with a slight shimmer catch the ambient light showing a small run starting near the knee and visible silicone grip band at top, paired with black platform heels with ankle straps showing worn sole treads and scratched platform edges. Her hair is styled in two high space buns with a few intentionally loose strands framing her face, creating a playful, editorial look, with visible bobby pins securing buns and flyaway hairs catching light, plus natural scalp texture where hair parts. She is looking directly at the camera with direct eye contact, face showing visible skin pores especially on nose and cheeks, fine lines around eyes, slight redness on chin, and natural facial asymmetry with one eye slightly larger. The bar's Prohibition-era styling includes dark wood paneling with water damage rings and scratches and vintage Edison bulb fixtures creating warm pools of amber light with visible filaments. A large ornate mirror behind the bar with age-spotted silvering and slight warping reflects blurred bottles and creates depth. The lighting is primarily from a table lamp with a green glass shade on the bar to her right with a visible crack in the shade, creating a film noir side-lighting effect with one side of her face brighter than the other. Candlelight from a mason jar candle on the bar with wax drips down the sides adds warm flickering highlights and visible soot marks on glass. The composition is shot from slightly behind the bar, looking back at her, creating an insider's perspective. Vignetting darkens the corners naturally with visible dust on lens creating slight softness. A slight motion blur affects her dangling leg as she swings it gently. Focus is sharp on her face and dress while the mirror reflection behind her is softer. The copper dress creates beautiful light reflection that pools on the dark wooden bar surface showing ring stains and scratches. Grain structure visible throughout with color noise in darker areas. This captures the golden hour of bar time, around 8 PM when the evening is just beginning and everyone still looks fresh and put-together, shot by a friend who appreciates good light and angle."

if [ $? -eq 0 ]; then
  echo "✓ Concept 33 completed at $(date)"
else
  echo "✗ Concept 33 FAILED at $(date)"
fi

echo "Waiting $DELAY seconds before next generation..."
sleep $DELAY
echo ""

# Concept 34: The Aristocrat Lounge - Charcoal Grey Sweater Dress
# Metadata: Ankle socks with heels, messy bun, fireplace glow
echo "Generating Concept 34: The Aristocrat Lounge - Charcoal Grey Sweater Dress"
node "$WRAPPER_SCRIPT" edit \
  "$REFERENCE_IMAGE" \
  "**CRITICAL PHYSICS ENFORCEMENT - NOT AI GENERATED:**

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
- Spherical aberration creates \"onion ring\" concentric patterns inside bokeh orbs (budget lenses), aspherical elements smooth this (high-end lenses)
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

A 35mm photograph captured on a Fujifilm X-T4 with a 23mm f/1.4 lens at ISO 1600, f/1.8, 1/60s. The woman sits cross-legged on a worn leather couch near the fireplace at The Aristocrat Lounge showing cracked leather with visible wear patterns and stuffing compressed unevenly, wearing a charcoal grey cable-knit sweater dress that falls to mid-thigh, with a relaxed turtleneck and ribbed cuffs. The chunky knit texture is clearly visible with some pulled threads, slight pilling on elbows, and natural fabric stretch creating depth and shadow within the fabric's weave. White athletic ankle socks with grey toe reinforcement and slight bunching peek above black patent leather Mary Jane heels with a chunky heel showing scuffs and worn toe caps, creating an intentionally mismatched casual-dressy aesthetic. Her hair is twisted up in a genuinely messy bun with chunks falling out in multiple directions, secured with a simple elastic showing visible hair tie dents, looking like she put it up without a mirror, with baby hairs framing face and natural texture visible. She is looking directly at the camera with direct eye contact, face showing visible enlarged pores on nose, fine lines around eyes and mouth, slight under-eye shadows, natural skin texture with small mole on cheek, and slight facial asymmetry. The primary light source is a wood-burning fireplace to her right with visible flames and glowing embers, creating warm orange-yellow light that flickers across the scene showing genuine color temperature variation. The fire's dancing light creates constantly shifting highlights and shadows, giving the image an alive, dynamic quality with motion blur in the flame reflections. Wall-mounted sconces with amber glass shades showing dust provide secondary fill light. The background shows stacked firewood with bark pieces on floor, exposed brick walls with soot marks and mortar gaps, and vintage leather armchairs with visible wear slightly out of focus. Smoke or heat distortion from the fireplace creates a slight waviness in the air on the right side of the frame. The warm firelight contrasts with cooler ambient bar lighting deeper in the space, creating a split-toned color palette. Shot with the camera resting on the arm of an adjacent chair, creating a relaxed, low angle with slight camera shake. Slight underexposure in the shadows makes the firelight highlights more dramatic. A wine glass with fingerprints and lipstick mark on rim sits on the coffee table showing water rings in soft focus in the foreground. Visible dust particles illuminated by firelight. Sensor grain visible throughout with warmer grain structure in fire-lit areas. This captures a cozy Sunday afternoon moment, the kind where you're day-drinking by a fire and someone comments you look adorable all curled up, grabbing their phone for a casual shot."

if [ $? -eq 0 ]; then
  echo "✓ Concept 34 completed at $(date)"
else
  echo "✗ Concept 34 FAILED at $(date)"
fi

echo "Waiting $DELAY seconds before next generation..."
sleep $DELAY
echo ""

# Concept 35: King Bee - Fuchsia Cut-Out Mini Dress
# Metadata: Patterned tights (polka dot), combat boots, crimped hair
echo "Generating Concept 35: King Bee - Fuchsia Cut-Out Mini Dress"
node "$WRAPPER_SCRIPT" edit \
  "$REFERENCE_IMAGE" \
  "**CRITICAL PHYSICS ENFORCEMENT - NOT AI GENERATED:**

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
- Spherical aberration creates \"onion ring\" concentric patterns inside bokeh orbs (budget lenses), aspherical elements smooth this (high-end lenses)
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

A 35mm photograph captured on a Canon EOS R5 with a 28mm f/1.8 lens at ISO 4000, f/2.0, 1/100s. The woman stands at the jukebox at King Bee with visible fingerprint smudges on glass, wearing a fuchsia pink mini dress with strategic geometric cut-outs at the waist revealing skin showing natural texture and slight stretch marks, long sleeves with slight pilling at cuffs, and a mock neck. The bright fuchsia pops intensely against the dim bar with visible seam stress and fabric pulling at cutout edges. Black tights with large white polka dots showing slight runs and pilling at inner thighs create bold graphic contrast, paired with black leather combat boots with yellow stitching and thick soles showing mud on treads, worn leather, and scuffed toe caps. Her hair is crimped in a throwback 80s style with uneven crimp pattern, creating a wild, textured volume halo around her head with frizz and flyaways catching light, visible scalp at part line. She's partially turned away from camera, looking at the jukebox selections with visible reflection on glass, finger pointing at the glass showing unpainted nail with slight dirt underneath and visible knuckle wrinkles. She is visible in partial profile but when she glances at camera there is direct eye contact. The jukebox itself is a vintage Wurlitzer with colored lights cycling through red, blue, and amber showing dust on bulb covers, creating colored reflections on her dress and face showing visible skin pores, fine lines, and natural imperfections. The bar's lighting includes string lights with exposed filament bulbs creating warm bokeh in the background with some bulbs burned out, and neon beer signs—a green Heineken with slight flicker and a red Budweiser with visible neon tube supports—out of focus behind her. The camera is handheld at a slight angle with visible camera shake, shot from about 8 feet away, capturing her full body with the jukebox. Lens flare creates a small star burst from one of the jukebox lights in the upper right with rainbow chromatic aberration. Motion blur slightly affects her pointing hand. The fuchsia dress is slightly overexposed due to its brightness, creating a soft glow effect with blown highlights around the edges. Grain is visible and prominent throughout at ISO 4000 with color noise in shadows. A beer bottle with condensation and peeling label sits on top of the jukebox, slightly out of focus with visible drip marks. The compressed perspective at 28mm makes the background jukebox lights appear closer than they are. Dirty floor visible showing scuff marks and sticky residue. This is that classic bar moment someone captures when their friend is intensely focused on picking the perfect song, unaware they look fantastic in their bold outfit, the jukebox lights painting her face in colors."

if [ $? -eq 0 ]; then
  echo "✓ Concept 35 completed at $(date)"
else
  echo "✗ Concept 35 FAILED at $(date)"
fi

echo "Waiting $DELAY seconds before next generation..."
sleep $DELAY
echo ""

# Concept 36: Drinks Lounge - Cream Satin Two-Piece Set
# Metadata: Thigh-high boots (tan), finger waves, candle lighting
echo "Generating Concept 36: Drinks Lounge - Cream Satin Two-Piece Set"
node "$WRAPPER_SCRIPT" edit \
  "$REFERENCE_IMAGE" \
  "**CRITICAL PHYSICS ENFORCEMENT - NOT AI GENERATED:**

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
- Spherical aberration creates \"onion ring\" concentric patterns inside bokeh orbs (budget lenses), aspherical elements smooth this (high-end lenses)
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

A 35mm photograph captured on a Sony A7R IV with a 55mm f/1.8 lens at ISO 800, f/2.0, 1/50s. The woman sits at a small round table at Drinks Lounge with visible ring stains on surface, wearing a cream satin two-piece set consisting of a cropped long-sleeve top with a deep V-neck and a matching high-waisted mini skirt, both in lustrous champagne-cream satin that catches light like liquid but shows realistic wrinkle lines, slight pulling at shoulder seams, and creasing at waist where she's sitting. The satin fabric has visible pressure marks and doesn't lie perfectly smooth. Tan suede thigh-high boots with a stiletto heel showing salt stains, slight scuffing on toes, and natural suede nap variation create a monochromatic nude-toned palette. Her hair is styled in vintage finger waves creating an old Hollywood glamour look with precise S-shaped waves close to the scalp showing visible styling product residue, slight frizz at hairline, and natural hair texture peeking through where waves separate. She is looking directly at the camera with direct eye contact, face showing visible enlarged pores particularly on nose and forehead, fine lines around eyes, slight smile lines, natural skin texture with small beauty mark, and subtle facial asymmetry. The scene is lit almost entirely by candles—multiple pillar candles of varying heights on her table showing wax drips, uneven burning, and soot marks, and surrounding tables create a romantic, intimate atmosphere with realistic flame flicker causing constant light variation. The warm candlelight creates soft, flattering illumination with gentle shadows under her cheekbones and jawline showing natural face contours. Small tea lights in amber glass votives with visible fingerprints add additional warm points of light. The background is very dark, falling off into shadow, with only hints of other patrons and the bar visible as dark silhouettes. A small amount of natural dusk light comes through a nearby window with visible dirt on glass, creating a cool blue-purple fill light that contrasts with the warm candlelight. Shot from across the table at a seated eye level, creating an intimate, conversation-like perspective with slight lens tilt. The shallow depth of field renders the background candles into soft, warm bokeh orbs with flame motion creating elongated streaks. Slight chromatic aberration creates warm halos around the brightest candle flames. A cocktail in a coupe glass with fingerprints on stem sits on the table, the liquid catching candlelight with visible condensation on glass. Smoke from extinguished candle visible rising in background. Dust particles illuminated by candlelight. This has the feeling of a special date night or sophisticated evening out, captured by a friend at the table who wants to preserve how beautiful and elegant she looks in the candlelight, the kind of shot you take discreetly so you don't interrupt the moment."

if [ $? -eq 0 ]; then
  echo "✓ Concept 36 completed at $(date)"
else
  echo "✗ Concept 36 FAILED at $(date)"
fi

echo "Waiting $DELAY seconds before next generation..."
sleep $DELAY
echo ""

# Concept 37: Rio Rita - Cobalt Blue Backless Dress
# Metadata: Bare legs, strappy sandals, windswept hair, natural window light
echo "Generating Concept 37: Rio Rita - Cobalt Blue Backless Dress"
node "$WRAPPER_SCRIPT" edit \
  "$REFERENCE_IMAGE" \
  "**CRITICAL PHYSICS ENFORCEMENT - NOT AI GENERATED:**

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
- Spherical aberration creates \"onion ring\" concentric patterns inside bokeh orbs (budget lenses), aspherical elements smooth this (high-end lenses)
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

A 35mm photograph captured on a Nikon Z7 II with a 50mm f/1.4 lens at ISO 1250, f/1.8, 1/125s. The woman stands near a large open window at Rio Rita with visible smudges and dirt on glass during golden hour, wearing a cobalt blue mini dress with a high neck in front but completely backless with visible spine and shoulder blade definition, the fabric draping and held by a thin strap behind the neck showing slight fabric stress at connection point. The electric blue color is rich and saturated with slight color variation in the fabric weave. Her legs are bare showing natural skin texture, visible leg hair, small bruises on shins, and natural skin tone variation, paired with nude strappy sandals with thin ankle ties showing worn leather and dirty sole edges. Her dark hair appears windswept, blown across her face by the breeze coming through the open window, creating dynamic movement with some strands caught mid-motion blur, others stuck to lipgloss on lips, and visible scalp and natural hair texture. She is looking toward the camera with direct eye contact visible between wind-blown hair strands, face showing visible skin pores, fine lines, squinting from bright light, and natural imperfections. The primary light source is natural late afternoon sunlight streaming through the window with visible dust and particles illuminated in the shaft, creating a bright backlight that gives her hair a glowing rim light effect and creates multiple lens flare streaks across the frame reducing contrast. The window light is warm and golden, around 5:30 PM in spring at approximately 3200K. Interior bar lighting includes hanging pendant lights with copper shades showing verdigris and dents, currently dim compared to the natural light. The background shows the bar's colorful wall murals with peeling paint slightly out of focus, with vibrant pinks and yellows faded from sun exposure. A ceiling fan creates subtle motion blur in the background with visible dust on blades. The composition is shot from inside the bar looking toward the window, placing her in silhouette with edge lighting but enough fill light bouncing back to define her features. Strong lens flare creates a hazy, dreamy quality with washed out colors and multiple ghost images across frame. The backlight makes the blue dress appear to glow along the edges with overexposed highlights. Dust particles and possibly pollen are visible floating in the window light shaft. Her hand is raised near her face catching hair blown by wind showing natural hand texture and short unpainted nails with visible cuticles. Window frame shows chipped paint and weather damage. This captures a spontaneous moment when someone opened a window and the breeze created movie-like drama, the kind of shot a friend takes quickly because the light and wind aligned perfectly for just a few seconds before the moment passes."

if [ $? -eq 0 ]; then
  echo "✓ Concept 37 completed at $(date)"
else
  echo "✗ Concept 37 FAILED at $(date)"
fi

echo "Waiting $DELAY seconds before next generation..."
sleep $DELAY
echo ""

# Concept 38: Whisler's - Black Mesh Overlay Mini Dress
# Metadata: Fishnets (red), platform boots, bedhead hair, phone screen glow
echo "Generating Concept 38: Whisler's - Black Mesh Overlay Mini Dress"
node "$WRAPPER_SCRIPT" edit \
  "$REFERENCE_IMAGE" \
  "**CRITICAL PHYSICS ENFORCEMENT - NOT AI GENERATED:**

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
- Spherical aberration creates \"onion ring\" concentric patterns inside bokeh orbs (budget lenses), aspherical elements smooth this (high-end lenses)
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

A 35mm photograph captured on a Canon EOS R6 with a 35mm f/1.4 lens at ISO 12800, f/1.4, 1/30s. The woman sits in a booth at Whisler's with visible cracked vinyl and duct tape repairs in the very dark back section, wearing a black mini dress with a mesh overlay creating a semi-sheer effect with visible snagging in mesh, long sleeves with slight pilling, and a fitted silhouette showing fabric stress lines. Red fishnet tights with visible runs and repairs create a bold pop of color against the black dress, paired with black platform boots with chunky soles showing heavy wear, scuff marks, and silver buckles with tarnish. Her hair has a genuine bedhead texture—flattened on one side from sleeping, volume on the other, pieces sticking out at odd angles in multiple directions, visible natural hair texture, grease from not washing, and dry shampoo residue—like she woke up from a nap and came straight out. She is looking at her phone but her eyes glance toward camera showing direct eye contact with tired expression, face showing visible enlarged pores, smudged makeup from earlier in the day, mascara flaking, foundation worn off in patches, natural skin texture, under-eye bags, and slight breakout on chin. The scene is extremely dark, lit primarily by her phone screen as she looks down at it with visible screen content reflected in her eyes, the blue-white glow illuminating her face from below in an unflattering but authentic way that casts shadows upward. This creates dramatic under-lighting with shadows cast upward onto features showing every texture and imperfection. A small red LED light from a beer sign in the distance with buzzing electrical hum provides a subtle red rim light on her hair. The background is nearly black with extreme color noise and grain, with only hints of booth edges and other patrons visible as dark shapes. At ISO 12800, the grain structure is extremely prominent, creating a heavily textured appearance with aggressive color noise showing purple and green splotches throughout. The phone screen creates a bright rectangular reflection on the sticky table surface showing fingerprints. Color noise is intense and visible in all darkest shadows creating magenta and green patches. The composition is shot from across the booth, slightly looking down with handheld camera shake. Motion blur affects her thumb as it scrolls on the phone. The extreme low light situation creates purple and green color casts in the shadows with white balance struggling. Focus is soft overall due to the challenging lighting and wide aperture with missed focus plane. Visible dust on sensor appearing as dark spots. This captures the authentic late-night bar reality—checking your phone in a dark corner, not posed, not trying, looking rough and tired, just existing in the space, shot by a friend who finds the dramatic phone glow lighting accidentally beautiful in its harsh honesty."

if [ $? -eq 0 ]; then
  echo "✓ Concept 38 completed at $(date)"
else
  echo "✗ Concept 38 FAILED at $(date)"
fi

echo "Waiting $DELAY seconds before next generation..."
sleep $DELAY
echo ""

# Concept 39: Small Victory Bar - Sage Green Shirt Dress
# Metadata: Knee-high socks (white), loafers, deep side part, overhead pendant light
echo "Generating Concept 39: Small Victory Bar - Sage Green Shirt Dress"
node "$WRAPPER_SCRIPT" edit \
  "$REFERENCE_IMAGE" \
  "**CRITICAL PHYSICS ENFORCEMENT - NOT AI GENERATED:**

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
- Spherical aberration creates \"onion ring\" concentric patterns inside bokeh orbs (budget lenses), aspherical elements smooth this (high-end lenses)
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

A 35mm photograph captured on a Fujifilm X-T4 with a 35mm f/1.4 lens at ISO 2000, f/2.0, 1/60s. The woman leans against the bar at Small Victory Bar with visible scratched wooden surface, wearing a sage green button-front shirt dress with a collar showing slight wear on points, rolled-up sleeves to three-quarter length with creased fabric, and a fabric belt tied at the waist creating bunching. The dress hits mid-thigh and has a casual, borrowed-from-the-boys aesthetic with visible button stress, wrinkled fabric throughout, and a small stain on the hem. White knee-high socks with a subtle cable knit pattern showing slight pilling and slouching at ankles create a schoolgirl contrast, paired with burgundy leather penny loafers with visible scuffing, worn penny slots, and creased leather. Her hair is styled with a dramatic deep side part with visible scalp texture, with one side swept over and pinned behind her ear with visible bobby pin, the other side creating volume with slight frizz and natural hair texture showing. She is looking directly at the camera with direct eye contact, face showing visible enlarged pores especially on nose, fine lines around mouth from smiling, natural skin texture, slight redness on cheeks, freckles, and one eyebrow slightly higher than the other. She's directly under an industrial-style pendant light with a copper cone shade showing dents and scratches, creating a pool of warm light that illuminates her from above like a spotlight with harsh shadows. This creates strong definition on her face with pronounced shadows under nose and brows and shoulders while the rest of the bar falls into relative darkness. The overhead light creates a natural heavy vignette effect. Behind her, the bar's back wall features chalkboard menus with colored chalk writing and smudges, slightly out of focus. Bottles on backlit glass shelves with dust visible create small points of colored light with some bottles showing low levels. The bar surface is dark wood with visible grain, deep scratches, and rings from cold glasses plus sticky residue. A craft beer in a tulip glass with foam residue on sides sits on the bar next to her elbow, amber liquid catching light with visible carbonation bubbles. Shot at a slight upward angle from the other side of the bar, creating a casual bartender's perspective. The pendant light creates lens flare at the top edge of the frame with multiple ghost images. Shallow depth of field keeps focus on her face and the texture of the shirt dress fabric. The sage green color is muted and natural, not overly saturated with slight color variation in fabric. Sensor grain visible with noise in darker areas. Visible dust in air illuminated by pendant light. This captures a happy hour conversation moment, the kind of shot a friend takes when you're telling a story and the light hits just right, making the mundane moment feel cinematic."

if [ $? -eq 0 ]; then
  echo "✓ Concept 39 completed at $(date)"
else
  echo "✗ Concept 39 FAILED at $(date)"
fi

echo "Waiting $DELAY seconds before next generation..."
sleep $DELAY
echo ""

# Concept 40: Seven Grand - Burgundy Leather Wrap Dress
# Metadata: Thigh-high stockings (black), ankle boots, low bun, amber uplighting
echo "Generating Concept 40: Seven Grand - Burgundy Leather Wrap Dress"
node "$WRAPPER_SCRIPT" edit \
  "$REFERENCE_IMAGE" \
  "**CRITICAL PHYSICS ENFORCEMENT - NOT AI GENERATED:**

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
- Spherical aberration creates \"onion ring\" concentric patterns inside bokeh orbs (budget lenses), aspherical elements smooth this (high-end lenses)
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

A 35mm photograph captured on a Sony A7 III with a 50mm f/1.2 lens at ISO 3200, f/1.6, 1/60s. The woman sits on a leather wingback chair at Seven Grand showing cracked leather, exposed brass tacks, and worn armrests, wearing a burgundy leather wrap dress with a deep V-neckline, three-quarter sleeves with creasing at elbows, and the wrap creating an asymmetric hemline. The supple leather has a slight sheen but realistic texture with natural creasing patterns, tiny scratches in finish, and slight color variation across panels. Black opaque thigh-high stockings with a matte finish stay up without visible bands showing slight pilling and a small run starting near knee, paired with black suede ankle boots with a stacked wooden heel showing heel wear, scuffed suede with water stains, and sole separation beginning at toe. Her hair is pulled back in a low, loose bun at the nape of her neck with soft pieces framing her face, visible bobby pins trying to hold strays, and natural texture with some frizz and baby hairs catching light. She is looking directly at the camera with direct eye contact, face showing visible skin pores especially across nose and cheeks, fine lines around eyes, slight creasing on forehead, natural skin texture, small mole on neck, and asymmetric nostril size. The bar's distinctive whiskey-library aesthetic includes dark wood paneling with visible scratches and water rings, taxidermy with dust accumulation, and vintage leather furniture with worn patina. The lighting comes primarily from amber-colored uplights hidden behind the wingback chair showing visible dust on bulbs and along baseboards, creating a warm glow that travels up the walls creating dramatic shadows and showing every crack in plaster. A green-shaded banker's lamp on a nearby table with tarnished brass base provides additional warm task lighting. The scene has a very warm, amber-dominant color temperature around 2700K creating orange color cast. Shot from a low angle, sitting on the floor looking slightly up at her in the chair, creating an editorial, fashion-forward perspective. The background shows blurred whiskey bottles backlit on wooden shelves with dust visible, creating warm bokeh. Extreme shallow depth of field at f/1.6 means only her face and upper body are in sharp focus, with foreground and background strongly blurred with focus fall-off. A slight haze in the air from cigar smoke diffuses the light creating visible beams and reducing contrast. The burgundy leather dress creates subtle specular highlights where light hits the material's surface showing every crease. Heavy vignetting from wide aperture. Prominent grain at ISO 3200. This is the kind of shot someone takes when they realize their friend looks like they stepped out of a luxury whiskey ad, grabbing a low angle to make it feel more dramatic and editorial, though the wear and imperfections keep it grounded in reality."

if [ $? -eq 0 ]; then
  echo "✓ Concept 40 completed at $(date)"
else
  echo "✗ Concept 40 FAILED at $(date)"
fi

echo "Waiting $DELAY seconds before next generation..."
sleep $DELAY
echo ""

# Concept 41: Midnight Cowboy - Powder Blue Strapless Mini Dress
# Metadata: Thigh-high stockings (white lace), stilettos, pigtails, red gel lighting
echo "Generating Concept 41: Midnight Cowboy - Powder Blue Strapless Mini Dress"
node "$WRAPPER_SCRIPT" edit \
  "$REFERENCE_IMAGE" \
  "**CRITICAL PHYSICS ENFORCEMENT - NOT AI GENERATED:**

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
- Spherical aberration creates \"onion ring\" concentric patterns inside bokeh orbs (budget lenses), aspherical elements smooth this (high-end lenses)
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

A 35mm photograph captured on a Canon EOS R5 with a 85mm f/1.2 lens at ISO 5000, f/1.4, 1/60s. The woman stands near the speakeasy entrance at Midnight Cowboy with visible worn carpet and scuffed walls, wearing a powder blue strapless bandeau-style mini dress with subtle ruching across the bust showing fabric stress and slight pilling. The pale blue fabric has a slight texture with wrinkles and creasing. White lace-top thigh-high stockings with delicate floral patterns showing slight runs and silicone grip bands creating visible skin indentation stay in place, paired with silver metallic stilettos with ankle straps showing scratched metallic finish and worn heel tips. Her hair is styled in low, loose pigtails tied with simple black elastics showing hair tie creases, creating a playful contrast to the sophisticated dress, with uneven volume between pigtails, visible natural hair texture, and some flyaways. She is looking directly at the camera with direct eye contact, face showing visible enlarged pores, fine lines around eyes, natural skin texture, slight makeup settling into fine lines, and one eye slightly more hooded than the other. The scene is dramatically lit with red theatrical gel lighting from stage lights mounted on the ceiling with visible barn doors and lighting clamps, bathing the entire scene in crimson tones creating intense red color cast. This creates a sultry, film noir atmosphere with deep red shadows and hot pink highlights on skin. A single white spotlight creates a cool-toned rim light on her left side showing 5500K vs 2800K temperature contrast, creating color temperature clash. The background shows velvet curtains with dust and wear and vintage wallpaper with peeling edges and water stains, all rendered in shades of red and maroon. Shot with compression from the 85mm lens at a distance of about 12 feet, creating a voyeuristic, observational quality. The extreme shallow depth of field at f/1.4 renders the background into creamy, out-of-focus shapes with no detail retention and smooth bokeh. Chromatic aberration creates strong magenta and cyan fringing around high-contrast edges especially where white spotlight meets red gel lighting. The red lighting creates deep burgundy color cast in shadows, making blacks appear wine-colored. Her skin takes on warm peachy-pink tones under the red light showing every texture and pore. Slight motion blur affects her left hand as it adjusts a pigtail. The powder blue dress appears almost lavender-pink under the red lighting due to color mixing. Heavy grain at ISO 5000 with color noise. Visible dust particles in air illuminated by spotlight. This captures that exclusive speakeasy moment when someone looks impossibly glamorous in dramatic lighting, shot by a friend who managed to get the doorman to let them bring a camera into the secret space, though the harsh realities of skin texture and fabric imperfection remain visible."

if [ $? -eq 0 ]; then
  echo "✓ Concept 41 completed at $(date)"
else
  echo "✗ Concept 41 FAILED at $(date)"
fi

echo "Waiting $DELAY seconds before next generation..."
sleep $DELAY
echo ""

# Concept 42: Weather Up - Tangerine Silk Slip Dress
# Metadata: Bare legs, mules, post-shower wet hair, bathroom mirror
echo "Generating Concept 42: Weather Up - Tangerine Silk Slip Dress"
node "$WRAPPER_SCRIPT" edit \
  "$REFERENCE_IMAGE" \
  "**CRITICAL PHYSICS ENFORCEMENT - NOT AI GENERATED:**

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
- Spherical aberration creates \"onion ring\" concentric patterns inside bokeh orbs (budget lenses), aspherical elements smooth this (high-end lenses)
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

A 35mm photograph captured on a Nikon Z6 II with a 35mm f/1.8 lens at ISO 2500, f/2.0, 1/50s. The woman stands in the bathroom mirror at Weather Up with visible graffiti, marker tags, and sticker residue, wearing a tangerine orange silk slip dress with delicate spaghetti straps showing fabric rolling at edges, bias-cut construction that drapes beautifully with natural wrinkles and bunching, and lace trim at the hem hitting mid-thigh with one stitch coming loose. The silk has natural wrinkles throughout and a liquid-like drape with dark water spots on shoulders. Her legs are bare showing natural skin texture, visible leg hair, small bruise on shin, and natural skin tone variation, paired with black backless mules with a kitten heel showing scuffed heels and worn insole impressions. Her hair is genuinely wet, freshly washed, dripping water onto her shoulders creating dark spreading spots on the silk that are visibly growing, pushed back from her face with visible wet texture showing individual wet strands clumped together, no styling, water dripping onto floor, and natural scalp visible. She's taking a mirror selfie with her phone visible in frame showing her hand with visible knuckle wrinkles and short unpainted nails holding phone. She is looking at phone screen but eyes visible in mirror showing direct eye contact with camera reflection, face showing completely bare skin with no makeup revealing visible enlarged pores, slight redness, natural skin texture, small breakout on forehead, freckles, and wet face showing water droplets. The bathroom has industrial-style lighting—exposed Edison bulbs in wire cages above the mirror creating harsh, bright white light at approximately 4500K with strong shadows under eyes and chin creating unflattering overhead lighting. The mirror has extensive visible smudges, water spots, toothpaste splatter, lipstick marks from previous patrons, and slight silvering damage at edges. Graffiti and band stickers completely cover the walls visible in the reflection showing layered stickers peeling at edges. Paper towel dispenser with jammed towels and hand soap bottles with dried soap drips are visible on the counter showing grime buildup. The image is framed as a phone photo within the frame—we see her phone in her hand at slight angle creating perspective distortion, the bathroom scene in the mirror, creating a meta, self-aware composition. The lighting is intentionally unflattering overhead fluorescent bathroom light, creating real harsh shadows and blown-out highlights on forehead and nose tip. Shot from her POV as she holds the phone with arm extended creating slight arm extension distortion and phone visible in foreground. The mirror reflection shows someone else washing hands at the sink in the background at different focal plane, slightly out of focus and motion-blurred. Water droplets on the mirror surface showing surface tension create small distortions and light refraction. The tangerine color pops intensely against the institutional grey-green bathroom tiles with chipped grout. Focus is on the mirror reflection rather than on the phone itself, creating interesting focus dynamics with phone slightly soft. Visible paper towel on wet floor. Harsh fluorescent lighting creates minimal chromatic aberration but intense highlights with clipping. This captures that moment when someone freshens up in the bar bathroom and catches themselves looking unexpectedly good despite (or because of) the wet hair and bare face, taking a quick mirror pic that a friend later steals from their phone, completely real and unfiltered."

if [ $? -eq 0 ]; then
  echo "✓ Concept 42 completed at $(date)"
else
  echo "✗ Concept 42 FAILED at $(date)"
fi

echo "Waiting $DELAY seconds before next generation..."
sleep $DELAY
echo ""

# Concept 43: Roosevelt Room - Camel Suede Mini Dress
# Metadata: Knee-high boots (brown), low ponytail, cocktail table candlelight
echo "Generating Concept 43: Roosevelt Room - Camel Suede Mini Dress"
node "$WRAPPER_SCRIPT" edit \
  "$REFERENCE_IMAGE" \
  "**CRITICAL PHYSICS ENFORCEMENT - NOT AI GENERATED:**

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
- Spherical aberration creates \"onion ring\" concentric patterns inside bokeh orbs (budget lenses), aspherical elements smooth this (high-end lenses)
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

A 35mm photograph captured on a Fujifilm X-T4 with a 56mm f/1.2 lens at ISO 1600, f/1.4, 1/60s. The woman leans over a high cocktail table at Roosevelt Room with visible water rings and sticky surface, wearing a camel tan suede mini dress with a mock neck showing slight wear on edge, long sleeves with natural suede creasing at elbows, and visible top-stitching details creating subtle panels with some stitching pulling loose. The suede has authentic nap texture and directional variations with slight discoloration from handling and a small stain on hip. Chocolate brown leather knee-high boots with a pointed toe showing creased leather and stacked heel with worn heel cap complete the monochromatic earth-tone palette, boots showing scuff marks and salt lines. Her hair is pulled back in a sleek low ponytail secured with a leather cord creating visible tension on scalp, creating clean lines with some shorter hairs escaped around face and visible natural hair texture. She's leaning on the table reading a cocktail menu with visible fingerprints on laminated surface, face partially obscured by the menu she's holding showing visible fingernails with chipped nail polish and cuticle detail. When visible, she has direct eye contact with camera, face showing visible skin pores, fine lines around eyes, natural texture, slight bags under eyes, and freckles. The primary light source is a cluster of small votive candles with uneven burning in amber glass holders on the cocktail table with visible wax drips on glass, creating warm, intimate lighting from below that illuminates her face and the underside of the menu casting shadows upward. The bar's speakeasy-style dim lighting includes vintage brass sconces with tarnished finish and milk glass shades with visible cracks providing soft ambient fill with bulbs of different color temperatures creating mixed lighting. The background shows blurred shelves of cocktail ingredients with visible dust, bitters bottles with faded labels, and glassware with water spots. Shot from across the table at a slight angle, creating a natural, conversational perspective. The candlelight creates warm orange-yellow tones at 2400K while the ambient bar lighting adds cooler brass tones at 3800K, creating subtle color temperature variation and split toning. At f/1.4, the depth of field is razor-thin—the menu in her hands is sharp but her face behind it is slightly softer showing focus transition. The candles create small lens flares and star-burst effects with diffraction spikes. Wax drips are visible running down the sides of the votive holders with solidified wax pools. The suede dress absorbs light, creating deep, rich shadows in the fabric's folds with subtle sheen on raised nap. A craft cocktail in a nick and nora glass with condensation and lime garnish sits on the table, slightly out of focus in the foreground showing liquid meniscus. Smoke from one candle that was just blown out visible rising. Heavy vignetting from wide aperture. This captures the studious moment of deciding what to order, unaware someone is photographing, focused entirely on choosing between mezcal or bourbon, the candlelight making everything feel more significant while showing every real texture and imperfection."

if [ $? -eq 0 ]; then
  echo "✓ Concept 43 completed at $(date)"
else
  echo "✗ Concept 43 FAILED at $(date)"
fi

echo "Waiting $DELAY seconds before next generation..."
sleep $DELAY
echo ""

# Concept 44: Whistler's - Mint Green Mesh Cut-Out Dress
# Metadata: Patterned tights (vertical stripes), platform heels, space buns, colored gel lights
echo "Generating Concept 44: Whistler's - Mint Green Mesh Cut-Out Dress"
node "$WRAPPER_SCRIPT" edit \
  "$REFERENCE_IMAGE" \
  "**CRITICAL PHYSICS ENFORCEMENT - NOT AI GENERATED:**

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
- Spherical aberration creates \"onion ring\" concentric patterns inside bokeh orbs (budget lenses), aspherical elements smooth this (high-end lenses)
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

A 35mm photograph captured on a Sony A7R IV with a 35mm f/1.4 lens at ISO 6400, f/1.8, 1/80s. The woman dances near the back patio entrance at Whistler's with visible worn threshold and dirty floor, wearing a mint green mini dress with mesh panels showing small snags and pulls creating cut-outs along the sides and a high neck with sheer mesh sleeves revealing skin texture underneath. The opaque mint green fabric with slight pilling contrasts with the black mesh showing thread distortion. Black and white vertical striped tights with runs starting near ankle create an optical illusion effect, paired with black patent platform heels with an ankle strap showing scuffed platform edges and worn heel caps. Her hair is styled in two high space buns with the hair wrapped around to create imperfect spheres with visible bobby pins securing them, lumpy texture, and a few face-framing pieces left loose plus flyaways catching light everywhere. She is captured mid-movement with her face toward camera showing direct eye contact, visible motion blur, enlarged pores, flushed cheeks from dancing, slight perspiration on forehead, and smudged eye makeup. The scene is lit with multiple colored gel stage lights—a cyan light from the left, a magenta light from the right, and an amber light from above—creating complex color mixing and colored shadows with each light creating its own shadow direction. This produces a vibrant, club-like atmosphere with colors overlapping on her dress and skin creating unnatural skin tones and color confusion. String lights with large bulbs and some burned out create bokeh in the background. The background shows parts of the outdoor patio through an open door with visible cigarette smoke, with bistro lights with dead bulbs visible in the distance. Shot from a slightly low angle looking up, with the camera handheld and tilted about 3 degrees creating Dutch angle, capturing her mid-dance move with her arms raised showing motion blur in hands. Motion blur affects her hands, hair, and edges due to movement during 1/80s exposure. The multiple colored lights create confusion in the camera's white balance at 4200K setting, producing mixed color temperatures and unpredictable color casts. Lens flare creates colored streaks across the frame from the cyan light source with internal reflections. At ISO 6400, prominent grain with heavy color noise adds texture especially in darker areas. The mint green dress appears to shift colors dramatically as different colored lights hit it—cyan-blue where blue light dominates, yellow-green in amber light, pink-tinted in magenta areas. Her expression is mid-laugh with eyes closed and mouth open showing teeth, caught in genuine movement with natural facial distortion from motion. Visible dust and possibly fog machine haze in air illuminated by colored lights. One space bun is slightly collapsed from dancing. This is the kind of spontaneous shot a friend captures when someone is lost in the music, all joy and motion and sweat, the colored lights creating accidental art from chaos."

if [ $? -eq 0 ]; then
  echo "✓ Concept 44 completed at $(date)"
else
  echo "✗ Concept 44 FAILED at $(date)"
fi

echo "Waiting $DELAY seconds before next generation..."
sleep $DELAY
echo ""

# Concept 45: The Liberty Bar - Wine Colored Velvet Wrap Dress
# Metadata: Thigh-high boots (burgundy), messy low bun, lightning from window
echo "Generating Concept 45: The Liberty Bar - Wine Colored Velvet Wrap Dress"
node "$WRAPPER_SCRIPT" edit \
  "$REFERENCE_IMAGE" \
  "**CRITICAL PHYSICS ENFORCEMENT - NOT AI GENERATED:**

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
- Spherical aberration creates \"onion ring\" concentric patterns inside bokeh orbs (budget lenses), aspherical elements smooth this (high-end lenses)
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

A 35mm photograph captured on a Canon EOS R6 with a 24mm f/1.4 lens at ISO 10000, f/1.8, 1/30s. The woman sits in a booth near the window at The Liberty Bar with visible duct-tape repairs on vinyl during a thunderstorm, wearing a deep wine-colored velvet wrap dress with three-quarter sleeves showing crushed velvet texture and compression marks, a tie waist with visible knot stress, and the wrap creating a plunging neckline. The velvet has strong directional nap creating light and dark tone variation with some areas appearing black, slight sheen on compressed areas, and visible wear pattern on sleeves. Burgundy velvet thigh-high boots with a block heel showing crushed nap, scuff marks, water spots from rain, and visible creasing match the dress in a monochromatic burgundy palette. Her hair is pulled back in a very messy low bun completely destroyed by humidity, with significant large pieces fallen out in multiple directions, wisps plastered around her face from moisture, looking extremely disheveled with frizz halo, and visible hair texture gone wild. She glances toward camera showing direct eye contact, face showing visible enlarged pores made more prominent by humidity, frizzy baby hairs stuck to sweaty forehead and temples, smudged makeup, mascara migration, and flush from humidity. The scene is mostly dark, lit by dim amber pendant lights inside showing dust and dead bugs, but a flash of lightning outside the window creates a brief, intense burst of blue-white light at approximately 6500K that illuminates her from the side during this specific 1/30s exposure. This creates a split-second of dramatic side lighting with extreme contrast between lit side and shadow side. The lightning flash creates a silhouette effect, with bright blown-out rim light along her profile and the window frame with halation. Rain is heavily visible on the window glass with complex water patterns, streaking diagonally from wind, and completely blurring the street view beyond showing only colored lights. The interior bar lighting is very warm (2700K) while the lightning is very cool (6500K), creating extreme 3900K color temperature contrast and split color grading. Shot from across the booth with the wide 24mm lens showing perspective distortion, capturing both her and the rain-streaked window in the frame. The image has significant natural motion blur from the handheld camera at 1/30s with visible camera shake. At ISO 10000, extremely heavy grain creates an atmospheric, intense film-like quality with severe luminance noise and color noise creating colored patches throughout shadows. The lightning overexposes the entire right side of the frame with blown highlights and loss of detail while the rest remains very dark with crushed blacks. Car headlights visible through the rainy window create streaky motion-blurred bokeh showing light trails. Her face is half in deep shadow, half caught by lightning flash, creating dramatic chiaroscuro with no detail in shadow areas. A whiskey glass on the table with fingerprint smudges reflects the lightning with specular highlight. Visible rain drops on her side of window glass. Heavy vignetting. Thunder vibration causing slight image shake. This captures that dramatic storm moment when lightning creates Hollywood lighting for just a fraction of a second, shot by a friend who got incredibly lucky with the timing but the extreme ISO and harsh conditions show in every grain of the chaotic image."

if [ $? -eq 0 ]; then
  echo "✓ Concept 45 completed at $(date)"
else
  echo "✗ Concept 45 FAILED at $(date)"
fi

echo "Waiting $DELAY seconds before next generation..."
sleep $DELAY
echo ""

# Concept 46: The Porch - Peach Linen Mini Dress
# Metadata: Ankle socks (cream), espadrilles, side braid, natural afternoon light
echo "Generating Concept 46: The Porch - Peach Linen Mini Dress"
node "$WRAPPER_SCRIPT" edit \
  "$REFERENCE_IMAGE" \
  "**CRITICAL PHYSICS ENFORCEMENT - NOT AI GENERATED:**

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
- Spherical aberration creates \"onion ring\" concentric patterns inside bokeh orbs (budget lenses), aspherical elements smooth this (high-end lenses)
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

A 35mm photograph captured on a Nikon Z7 II with a 50mm f/1.8 lens at ISO 400, f/2.2, 1/250s. The woman sits on the actual outdoor porch at The Porch with visible weathered wooden planks, splinters, and dirt during a lazy Sunday afternoon, wearing a peach-colored linen mini dress with a square neckline, puff sleeves with visible gathered stitching, and button details down the front with one button slightly loose. The linen has extensive natural texture and wrinkles throughout showing every crease and crumple, typical linen relaxed appearance with visible weave pattern. Cream-colored ribbed ankle socks showing slight pilling and dirt on bottom create a casual, relaxed vibe, paired with tan canvas espadrille wedges with ankle ties showing frayed rope edging and dirty canvas with visible stains on toe. Her hair is styled in a loose side braid over one shoulder with pieces pulled out to create texture and softness, visible flyaways catching sunlight, uneven braid tension creating lumpy sections, and natural hair texture showing. She is looking directly at the camera with direct eye contact, face showing visible skin pores particularly on nose, fine lines around eyes, natural skin texture with freckles intensified by sun, slight sunburn on nose, and relaxed genuine smile. The scene is lit by natural daylight around 3 PM—bright but not harsh at approximately 5000K, with the porch roof providing dappled shade that creates even, soft lighting with natural contrast. Dappled sunlight filters through hanging plants with visible leaves creating small spots of harsh sunlight and shadow across her and the wooden porch planks showing wood grain, creating natural light patterns. The background shows other patio tables with visible wear, potted plants with some dead leaves, and the street beyond with cars slightly out of focus. A ceiling fan creates very slight motion blur in the blades above showing dust on blades. Shot from across the patio table at a seated perspective, creating an intimate, friend-having-lunch vibe. The natural daylight means lower ISO, creating clean, crisp detail with minimal grain showing sensor clarity. Colors are natural and accurate—the peach dress appears true to life, not oversaturated with realistic color rendering and visible color variation in fabric. A beer bottle sweating with visible condensation droplets running down sits on the table showing wet table surface around it, catching sunlight. Her face has natural shadows under her jawline and nose from the overhead porch roof creating realistic directional lighting. The linen dress shows every wrinkle and fold realistically with no smoothing. Background bokeh is gentle and natural at f/2.2, not creamy or artificial with recognizable shapes. Visible pollen or dust particles in sunlight shafts. A small spider web in corner of porch roof visible in background. Wooden porch showing paint peeling and sun damage. This captures a completely different dive bar experience—the day drinking, sunshine, fresh air version—shot by a friend who appreciates how the afternoon light makes everything feel peaceful and golden, catching a moment of genuine contentment in honest daylight showing every real texture."

if [ $? -eq 0 ]; then
  echo "✓ Concept 46 completed at $(date)"
else
  echo "✗ Concept 46 FAILED at $(date)"
fi

echo "Waiting $DELAY seconds before next generation..."
sleep $DELAY
echo ""

# Concept 47: Easy Tiger - Steel Blue Asymmetric One-Shoulder Dress
# Metadata: Bare legs, strappy sandals, hair tucked behind one ear, beer garden string lights
echo "Generating Concept 47: Easy Tiger - Steel Blue Asymmetric One-Shoulder Dress"
node "$WRAPPER_SCRIPT" edit \
  "$REFERENCE_IMAGE" \
  "**CRITICAL PHYSICS ENFORCEMENT - NOT AI GENERATED:**

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
- Spherical aberration creates \"onion ring\" concentric patterns inside bokeh orbs (budget lenses), aspherical elements smooth this (high-end lenses)
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

A 35mm photograph captured on a Fujifilm X-T4 with a 35mm f/1.4 lens at ISO 3200, f/1.8, 1/60s. The woman stands near the outdoor beer garden area at Easy Tiger on gravel ground with visible rocks and cigarette butts, wearing a steel blue asymmetric one-shoulder mini dress with the single sleeve on the right shoulder showing slight fabric stress at attachment point, a fitted bodice with creasing, and a slightly flared skirt. The fabric has a subtle metallic sheen with visible wrinkles and slight discoloration from wear. Her legs are bare and natural showing visible skin texture, light leg hair, small scars on knees, natural skin tone variation with visible veins, paired with nude strappy sandals with thin ankle ties showing worn leather straps and dirty sole edges and a stiletto heel with tip wear. Her hair is dark and straight, tucked behind one ear on the side facing camera showing ear clearly, the other side falling forward covering part of face, creating an asymmetric style that mirrors the dress, with visible flyaways and natural hair texture with slight frizz from humidity. She is looking directly at the camera with direct eye contact, face showing visible enlarged pores on nose and cheeks, fine lines around eyes, natural skin texture, freckles, and slight asymmetry in facial features. The beer garden is lit with extensive warm white string lights creating a canopy of bulbs overhead with some bulbs burned out creating dark spots in pattern, producing hundreds of bokeh circles in the background. Additional bistro lights outline the seating area showing wear on wiring. The string lights create a magical, romantic ambiance at approximately 2800K. A few beer garden lanterns on tables with visible rust add warm orange glows. Shot from about 8 feet away, capturing her three-quarter length, standing near one of the communal wooden picnic tables showing carved initials and drink stains. The shallow depth of field renders all the background string lights into perfectly circular and hexagonal bokeh orbs of varying sizes depending on distance from focal plane. The steel blue dress appears almost silver in the warm light with color shift. A slight breeze moves her hair, creating minimal motion blur on loose strands. At ISO 3200, moderate grain adds texture without being excessive with some color noise in darker areas. Lens flare creates a few soft glowing spots from the brightest string lights with internal lens reflections. The wooden picnic table in the foreground is out of focus showing heavy bokeh but adds environmental context with visible beer bottles. Other beer garden patrons are visible as soft, out-of-focus silhouettes with string light bokeh surrounding them, creating depth. The composition places her slightly off-center with the bokeh creating a beautiful background. Visible mosquitoes or moths attracted to lights creating tiny motion blur trails. Gravel ground texture visible. The composition has natural slight tilt from handheld shooting. This captures the outdoor beer garden magic hour around 9 PM when the lights have just come on and everything feels festive, shot by a friend who stepped back to capture the whole atmosphere, the worn reality of the space mixing with the romantic lighting."

if [ $? -eq 0 ]; then
  echo "✓ Concept 47 completed at $(date)"
else
  echo "✗ Concept 47 FAILED at $(date)"
fi

echo "Waiting $DELAY seconds before next generation..."
sleep $DELAY
echo ""

# Concept 48: Lustre Pearl - Slate Grey Bodycon Dress
# Metadata: Knee-high socks (black), combat boots, sleek middle part, fire pit glow
echo "Generating Concept 48: Lustre Pearl - Slate Grey Bodycon Dress"
node "$WRAPPER_SCRIPT" edit \
  "$REFERENCE_IMAGE" \
  "**CRITICAL PHYSICS ENFORCEMENT - NOT AI GENERATED:**

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
- Spherical aberration creates \"onion ring\" concentric patterns inside bokeh orbs (budget lenses), aspherical elements smooth this (high-end lenses)
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

A 35mm photograph captured on a Canon EOS R5 with a 50mm f/1.2 lens at ISO 2500, f/1.4, 1/50s. The woman sits on a weathered wooden bench near the outdoor fire pit at Lustre Pearl showing splintered wood and carved graffiti, wearing a slate grey ribbed bodycon mini dress with a high neck, long sleeves, and thick horizontal ribbing creating texture. The stretchy fabric shows realistic compression and fit with visible stress lines across chest, pulling at shoulder seams, and fabric slightly rolled at neckline and cuffs. Black cable-knit knee-high socks showing heavy texture and slight slouching at ankles create visible pattern and a casual-meets-dressy aesthetic, paired with black leather combat boots with red laces showing dirty and frayed ends and yellow stitching, boots showing severe scuff marks, worn leather with creasing, and heavy sole wear with visible tread dirt. Her hair is parted exactly in the middle showing visible scalp and natural hair texture and hangs straight down, creating a sleek, minimalist style with some flyaways catching firelight. She is looking directly at the camera with direct eye contact, face showing visible skin pores especially across nose, fine lines, natural skin texture, slight shine from firelight heat, and relaxed expression. The primary light source is the fire pit approximately 4 feet to her left showing visible flames and glowing wood embers creating warm orange-yellow light around 2200K with dancing, flickering highlights. The fire creates constantly shifting light and shadow, with sparks occasionally visible as small bright streaks with motion blur, producing dynamic lighting that changes throughout the exposure. This produces warm illumination with inverse square falloff on the left side of her face creating graduated lighting while the right side falls into cooler shadow filled by ambient bar lights at approximately 3800K creating color temperature split. String lights in the background with some bulbs burned out create additional warm bokeh. The fire pit's metal bowl rim reflects intense orange light showing rust and wear. Smoke from the fire creates visible haze and distortion in the air between camera and subject reducing contrast. Shot from across the fire pit at a low angle with handheld camera, with the fire partially visible in the out-of-focus foreground creating large orange blur and light leaks. The firelight creates warm specular highlights with blown-out areas on her hair showing halation. At f/1.4, depth of field is extremely shallow—her face is sharp but her hands in her lap are already going soft showing focus fall-off. The fire's movement means the lighting is constantly changing intensity and direction, captured in this specific 1/50s moment frozen in time. Other fire pit patrons are visible as dark silhouettes with orange rim lighting from other fires creating environmental context. The slate grey dress appears to shift between cool grey in shadow and warm taupe depending on the light hitting it showing realistic color temperature interaction. Heavy grain at ISO 2500. Visible ash particles floating in air illuminated by firelight. This captures the cozy outdoor fire gathering vibe, shot by a friend sitting across from her who notices how beautiful the firelight makes her look while also showing every real texture and imperfection in the harsh but flattering glow."

if [ $? -eq 0 ]; then
  echo "✓ Concept 48 completed at $(date)"
else
  echo "✗ Concept 48 FAILED at $(date)"
fi

echo "Waiting $DELAY seconds before next generation..."
sleep $DELAY
echo ""

# Concept 49: Star Bar - Raspberry Pink Halter Mini Dress
# Metadata: Thigh-high stockings (sheer black), ankle boots, crimped hair, karaoke stage lights
echo "Generating Concept 49: Star Bar - Raspberry Pink Halter Mini Dress"
node "$WRAPPER_SCRIPT" edit \
  "$REFERENCE_IMAGE" \
  "**CRITICAL PHYSICS ENFORCEMENT - NOT AI GENERATED:**

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
- Spherical aberration creates \"onion ring\" concentric patterns inside bokeh orbs (budget lenses), aspherical elements smooth this (high-end lenses)
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

A 35mm photograph captured on a Sony A7 III with a 35mm f/1.4 lens at ISO 8000, f/1.8, 1/80s. The woman stands on the small karaoke stage at Star Bar with visible scuffed plywood floor and tangled cables, wearing a raspberry pink satin halter mini dress with a tied neck showing knot with visible wrinkle stress, open back, and A-line skirt. The satin catches stage lights creating intense bright highlights with blown detail and deep dark shadows in the folds showing extreme contrast. Sheer black thigh-high stockings with a subtle shimmer and back seam detail showing slight runs and twisted seam alignment complete the look, paired with black leather ankle boots with a chunky heel and silver hardware showing tarnished finish and scuff marks. Her hair is fully crimped in an 80s style with uneven crimp pattern creating maximum volume and chaotic texture that catches light like a textured halo, individual crimped sections visible, with frizz halo and visible roots showing natural hair color. She's holding a wireless microphone in one hand showing visible finger grip and unpainted nails, mid-performance with mouth open singing. She is looking toward the audience but eyes catching camera showing direct eye contact, face showing visible enlarged pores intensified by harsh stage lights, perspiration creating shine across forehead and upper lip, smudged eye makeup, and natural facial distortion from singing. The scene is lit by three small stage spotlights with visible barn doors—one cyan, one magenta, one amber—creating overlapping colored light and colored shadows creating three separate shadow directions on her and the backdrop. Moving head lights with visible dust in beams create sweeping light beams through heavy artificial haze in the air creating visible light shafts and reducing contrast. The background shows the karaoke screen displaying scrolling lyrics with visible pixel structure and screen glare, out of focus but creating blue light spill. Bar patrons are visible in the very dark foreground as silhouettes with raised drinks showing bokeh highlights from their phones, creating environmental depth. Shot from the audience perspective about 10 feet back with handheld camera, slightly off-center with Dutch tilt. The microphone and cord partially obscure her torso. Significant motion blur affects the swinging microphone cord. At ISO 8000, very prominent heavy grain creates a live music, documentary feel with intense color noise especially in the shadows. Lens flare from the stage lights creates multiple streaks and ghost images across the frame with internal reflections. The colored stage lights make her skin take on completely unnatural mixed tones—cyan on left side, magenta on right side, amber from above—creating color confusion and unrealistic skin rendering. The raspberry dress appears to change color dramatically under different lights from hot pink to deep magenta to orange-tinted. Her mouth is wide open mid-singing showing teeth and tongue, captured in authentic performance expression rather than posed with unflattering facial distortion. Visible fog machine haze throughout creating atmospheric scattering. Karaoke screen flicker creating slight strobing effect. This is the classic dive bar karaoke moment, shot by a supportive friend in the crowd capturing their friend's brave stage moment with all the chaos of lights and motion and nervous energy visible in every grainy pixel."

if [ $? -eq 0 ]; then
  echo "✓ Concept 49 completed at $(date)"
else
  echo "✗ Concept 49 FAILED at $(date)"
fi

echo "Waiting $DELAY seconds before next generation..."
sleep $DELAY
echo ""

# Concept 50: The Volstead - Mustard Yellow Turtleneck Dress
# Metadata: Patterned tights (geometric), Mary Janes, messy top knot, prohibition-era amber lights
echo "Generating Concept 50: The Volstead - Mustard Yellow Turtleneck Dress"
node "$WRAPPER_SCRIPT" edit \
  "$REFERENCE_IMAGE" \
  "**CRITICAL PHYSICS ENFORCEMENT - NOT AI GENERATED:**

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
- Spherical aberration creates \"onion ring\" concentric patterns inside bokeh orbs (budget lenses), aspherical elements smooth this (high-end lenses)
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

A 35mm photograph captured on a Nikon Z6 II with a 35mm f/1.8 lens at ISO 2000, f/2.0, 1/60s. The woman sits in a velvet booth at The Volstead with visible crushed velvet showing wear patterns and small stains, wearing a mustard yellow ribbed turtleneck mini dress with long sleeves and a fitted silhouette showing fabric compression at chest. The rich yellow color pops against the dark bar with visible ribbing creating texture and slight pilling at friction points. Black and gold geometric patterned tights creating Art Deco-style visual interest with slight runs at ankle and pattern distortion from leg shape, paired with black patent leather Mary Jane heels with a chunky heel and gold buckle showing tarnish and scratches on patent finish. Her hair is twisted up in a messy top knot on the crown of her head with very lumpy construction, secured with a visible scrunchie with fabric pilling, with large pieces falling out around her face and neck creating genuine mess, visible bobby pins failing to hold strays. She is looking down at menu but eyes flick toward camera showing direct eye contact, face showing visible enlarged pores, natural skin texture, fine lines around eyes, and slight double chin from looking down. The bar's Prohibition-era aesthetic includes vintage amber glass pendant lights with cracks in glass creating warm, focused pools of light at 2400K. A green banker's lamp on a nearby ledge with tarnished brass base adds a secondary colored light source creating green color cast. The wall sconces have amber-tinted filament bulbs with visible glowing filaments creating a 1920s speakeasy atmosphere. Dark wood paneling with water damage and scratches and brass fixtures showing heavy patina dominate the background. Shot from across the booth at a conversational angle creating natural perspective, with a vintage cocktail coupe glass showing lipstick marks on rim on the table between her and camera, the glass creating foreground framing and soft focus bokeh with liquid visible. The depth of field keeps her face sharp while the background Art Deco wallpaper details with visible wear blur into patterns. The mustard dress creates a vintage color palette that fits the 1920s aesthetic with warm color harmony. Heavy vignetting darkens the frame corners. The amber lighting creates an overall intense warm color cast around 2400K making everything orange-toned. Her skin tones appear very golden and warm almost orange. A vintage cigarette case with art deco engraving sits on the table as a period detail with visible tarnish. Leather booth edge visible showing cracking and wear. Moderate grain at ISO 2000 with warmer grain structure. This captures the immersive speakeasy experience, shot by a friend who appreciates the aesthetic cohesion of the outfit and environment, making her look like she time-traveled from the Jazz Age, though the modern imperfections and wear keep it grounded in reality."

if [ $? -eq 0 ]; then
  echo "✓ Concept 50 completed at $(date)"
else
  echo "✗ Concept 50 FAILED at $(date)"
fi

echo "Waiting $DELAY seconds before next generation..."
sleep $DELAY
echo ""

# Concept 51: Nickel City - Lavender Satin Cowl Neck Dress
# Metadata: Thigh-high boots (patent leather), sleek high ponytail, neon beer signs
echo "Generating Concept 51: Nickel City - Lavender Satin Cowl Neck Dress"
node "$WRAPPER_SCRIPT" edit \
  "$REFERENCE_IMAGE" \
  "**CRITICAL PHYSICS ENFORCEMENT - NOT AI GENERATED:**

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
- Spherical aberration creates \"onion ring\" concentric patterns inside bokeh orbs (budget lenses), aspherical elements smooth this (high-end lenses)
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

A 35mm photograph captured on a Canon EOS R6 with a 50mm f/1.2 lens at ISO 5000, f/1.4, 1/60s. The woman leans against the vintage arcade game wall at Nickel City with visible scratched screens and worn buttons, wearing a lavender satin cowl neck mini dress with thin straps and a draped neckline that creates elegant folds with visible wrinkle lines throughout. The satin has a lustrous finish catching colored neon light but showing realistic fabric behavior with bunching at hips. Black patent leather thigh-high boots with a stiletto heel and high mirror-like shine showing fingerprint smudges and scuff marks on toe create dramatic contrast. Her hair is pulled up in a very sleek, tight high ponytail without a visible single flyaway on top but with baby hairs around hairline catching neon glow, creating a polished, editorial look, visible hair tie creating bump, and severe tension on scalp visible in facial features. She is looking directly at the camera with direct eye contact, face showing visible skin pores especially on nose and forehead, fine lines around eyes, natural skin texture, and slight redness from ponytail tension. The scene is lit primarily by vintage neon beer signs with visible neon tube structure—a blue Hamm's sign with slight flicker, a red Miller High Life sign with one section dimmer, and a green Rolling Rock sign with visible transformer box—creating overlapping colored light without other significant light sources. This produces a vibrant, saturated color palette with intense neon glow and color contamination. The arcade game screens behind her (Galaga, Pac-Man) showing visible pixel structure and screen dirt create additional colored light sources with their gameplay graphics creating color flicker. The mixed neon lighting creates complex color casts—her lavender dress appears purple where blue light hits, pink where red light dominates, creating color confusion and unnatural fabric color rendering. Shot from slightly below at an upward angle making her appear statuesque against the glowing arcade games. The shallow depth of field at f/1.4 renders the neon signs into glowing colored shapes without readable text, pure color blobs. Chromatic aberration creates intense rainbow fringing around the brightest neon elements with red and cyan separation. At ISO 5000, noticeable heavy grain adds texture with color noise prominent. The patent boots create sharp bright specular highlights reflecting the colored neon with mirror reflections showing distorted sign reflections. Motion blur slightly affects a pinball machine's rapidly flashing lights in the background creating light streaks. The composition is slightly off-center with a bright neon sign creating an intense hot spot in the upper corner with blown highlights. Her skin takes on multi-colored tones from the mixed lighting looking completely unnatural with green, blue, and red zones. Visible dust particles illuminated by neon glow. Sticky floor visible with grime. This captures the dive bar arcade aesthetic perfectly, shot by a friend who positioned her in front of the most colorful concentration of neon, creating an accidentally perfect editorial lighting setup from vintage beer signs, though the harsh neon reveals every skin texture and fabric imperfection."

if [ $? -eq 0 ]; then
  echo "✓ Concept 51 completed at $(date)"
else
  echo "✗ Concept 51 FAILED at $(date)"
fi

echo "Waiting $DELAY seconds before next generation..."
sleep $DELAY
echo ""

# Concept 52: The Grackle - Terracotta Suede Wrap Dress
# Metadata: Bare legs, slides, hair in low pigtails, outdoor patio sunset
echo "Generating Concept 52: The Grackle - Terracotta Suede Wrap Dress"
node "$WRAPPER_SCRIPT" edit \
  "$REFERENCE_IMAGE" \
  "**CRITICAL PHYSICS ENFORCEMENT - NOT AI GENERATED:**

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
- Spherical aberration creates \"onion ring\" concentric patterns inside bokeh orbs (budget lenses), aspherical elements smooth this (high-end lenses)
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

A 35mm photograph captured on a Fujifilm X-T4 with a 35mm f/1.4 lens at ISO 800, f/2.0, 1/125s. The woman sits on the outdoor patio at The Grackle on weathered wooden picnic table with visible splinters during sunset, wearing a terracotta-colored suede wrap dress with a tie waist showing knot detail, short sleeves, and the wrap creating a V-neckline. The suede has authentic matte texture with natural nap variation, directional texture differences, and slight discoloration from sun exposure. Her legs are bare showing natural skin texture, visible leg hair, small scars, freckles, natural skin tone variation with visible veins on thighs, paired with simple tan leather slides with a flat sole showing worn footbed impressions and dirt on edges creating ultimate casual comfort. Her hair is styled in two very low pigtails at the nape of her neck showing uneven sections, tied with thin brown leather cords, creating a sweet, understated look with visible natural texture and flyaways. She is looking directly at the camera with direct eye contact, face showing visible enlarged pores, natural skin texture, freckles enhanced by golden hour light, fine lines around eyes from squinting, and genuine relaxed smile. The scene is lit by natural sunset light around 7:15 PM at approximately 2800K, with the sun low on the horizon creating warm, intense golden-orange light from behind and to the left. This produces beautiful rim lighting on her hair and shoulder with glowing halo effect, with her face in relative shade filled by ambient blue sky light at approximately 7000K creating color temperature split. The sunset creates dramatic warm tones at 2800K, bathing everything in orange-red tones with long shadows. String lights that aren't yet bright in the remaining daylight with visible filaments create small highlights in the background. The patio's picnic tables with carved graffiti and spilled drink stains and surrounding trees visible and slightly out of focus with natural background blur at f/2.0. Shot from across the table at a natural, conversational perspective creating authentic interaction feel. The golden hour light creates a soft, flattering glow with gentle shadows showing natural face contours. Lens flare from the low sun creates a strong hazy, dreamy quality with significantly reduced contrast, washed out blacks, and a warm diagonal streak across the frame with internal reflections and ghost images. The terracotta dress appears to glow intensely in the sunset light with near-overexposure, matching the warm color palette creating tonal harmony. A sweating beer bottle with visible condensation droplets and peeling label on the table creates foreground interest with liquid level visible. Her face has natural directional contouring from the sunset light. The low pigtails catch intense rim light making individual strands visible like fiber optics. Visible pollen or dust particles in golden light creating sparkle effect. Moderate grain at ISO 800. This captures the magic of outdoor day-drinking during golden hour, shot by a friend who recognizes perfect natural lighting when they see it, taking advantage of the fleeting sunset glow before it disappears, everything bathed in warm honest light showing real textures."

if [ $? -eq 0 ]; then
  echo "✓ Concept 52 completed at $(date)"
else
  echo "✗ Concept 52 FAILED at $(date)"
fi

echo "Waiting $DELAY seconds before next generation..."
sleep $DELAY
echo ""

# Concept 53: Shangri-La - Black Sequin Cutout Dress
# Metadata: Fishnet tights (blue), platform heels, wet-look slicked hair, disco ball
echo "Generating Concept 53: Shangri-La - Black Sequin Cutout Dress"
node "$WRAPPER_SCRIPT" edit \
  "$REFERENCE_IMAGE" \
  "**CRITICAL PHYSICS ENFORCEMENT - NOT AI GENERATED:**

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
- Spherical aberration creates \"onion ring\" concentric patterns inside bokeh orbs (budget lenses), aspherical elements smooth this (high-end lenses)
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

A 35mm photograph captured on a Sony A7R IV with a 85mm f/1.4 lens at ISO 6400, f/1.8, 1/60s. The woman stands near the dance floor at Shangri-La with visible sticky floor, wearing a black sequin mini dress with strategic cutouts at the sides revealing skin with natural texture, long sleeves with some sequins missing leaving dark patches, and a high neck. Every sequin catches and reflects light individually creating complex sparkle pattern with some sequins loose or missing. Bright electric blue fishnet tights with large diamond pattern showing multiple runs and snags create unexpected bold color contrast, paired with silver holographic platform heels with ankle straps showing scuffed holographic finish and worn platform edges. Her hair is slicked back extremely tight to her head with excessive gel creating a wet-look finish that appears painted on, not a single strand out of place on top but with visible product buildup and scalp texture, appearing almost helmet-like with unnatural sheen. She is looking directly at the camera with direct eye contact, face showing visible enlarged pores, perspiration creating shine, smudged makeup from dancing, mascara migration, flushed cheeks, and intense expression. The scene is lit primarily by a rotating mirror disco ball with visible mounting chain creating hundreds of moving square light spots across everything. White spotlights aimed at the disco ball with visible beam edges create the reflection pattern. The moving lights create a dynamic, ever-changing lighting situation with spots of light traveling across her dress, face showing light spots moving during exposure, and the background creating motion trails. Additional colored dance floor lights—purple LED and amber incandescent—create colored fill light with mixed color temperatures. The background shows other dancers as heavy motion-blurred figures from movement during 1/60s exposure. Shot from the edge of the dance floor with the 85mm lens creating strong compression and a voyeuristic, observational quality with flattened perspective. The disco ball lights create constantly moving specular highlights on the sequins creating hundreds of tiny star-like reflections, making the dress shimmer and sparkle chaotically with some highlights blown out. Significant motion blur affects the moving light spots despite the 1/60s shutter speed creating elongated spot trails. At ISO 6400, prominent grain with heavy color noise adds to the nightclub aesthetic especially in darker areas. The blue fishnets glow intensely under UV lights mixed into the dance floor lighting creating unnatural blue color. Lens flare creates multiple star bursts from the brightest disco ball reflections with diffraction spikes and internal reflections creating complex patterns. The compressed perspective makes the background dancers appear closer and more cramped than they are. Her expression is mid-dance showing motion with eyes half-closed and mouth slightly open showing teeth, caught in movement with slight blur on edges. Visible fog machine haze creating atmospheric scattering and reducing contrast. One sequin section on shoulder has come completely loose hanging by thread. This captures the classic dance floor moment under a disco ball, shot by a friend who stepped back to get the full sparkle effect, lights swimming across the frame like stars, everything slightly chaotic and sweaty and real showing the beautiful mess of a night out dancing."

if [ $? -eq 0 ]; then
  echo "✓ Concept 53 completed at $(date)"
else
  echo "✗ Concept 53 FAILED at $(date)"
fi

echo "Waiting $DELAY seconds before next generation..."
sleep $DELAY
echo ""

# Concept 54: Barfly's - Olive Green Cargo Mini Dress
# Metadata: Knee-high boots (combat style), messy bun, pool table pendant light
echo "Generating Concept 54: Barfly's - Olive Green Cargo Mini Dress"
node "$WRAPPER_SCRIPT" edit \
  "$REFERENCE_IMAGE" \
  "**CRITICAL PHYSICS ENFORCEMENT - NOT AI GENERATED:**

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
- Spherical aberration creates \"onion ring\" concentric patterns inside bokeh orbs (budget lenses), aspherical elements smooth this (high-end lenses)
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

A 35mm photograph captured on a Canon EOS R5 with a 24mm f/1.4 lens at ISO 3200, f/2.0, 1/80s. The woman leans over the pool table at Barfly's with visible cigarette burns and beer stains on felt lining up a shot with intense concentration, wearing an olive green cargo-style mini dress with multiple pockets with visible stitching and fraying, a belted waist with worn belt showing cracks, and short sleeves. The utilitarian fabric has matte texture with visible wrinkles and functional details like working zipper pulls and button closures. Black leather combat-style knee-high boots with multiple buckles showing tarnish, thick tread soles with visible dirt in treads, scuff marks everywhere, and worn leather with deep creasing create an edgy aesthetic. Her hair is pulled up in a genuinely messy bun secured with a plain elastic showing visible tension, with significant large pieces fallen out and hanging around her face in multiple directions, created while in active motion not styled intentionally, with visible natural hair texture and grease from not being freshly washed. She is focused on pool shot but eyes flick toward camera showing direct eye contact with intense concentration, face showing visible enlarged pores especially on nose, natural skin texture, fine lines, furrowed brow creating forehead wrinkles, and squinted eyes. The primary light source is the classic green-shaded pool table pendant light with visible chain and dust on shade hanging low over the table creating a focused cone of warm light at 3200K on the green felt and her. This creates dramatic lighting with her upper body illuminated and the background falling into complete darkness. The green felt reflects light upward onto her face creating an unusual unflattering under-lighting effect with a strong green color cast making skin look sickly. Bar lights in the background showing Edison bulbs create small colored bokeh—red exit signs with visible plastic cracks, yellow wall sconces with dead bulbs. Shot with a wide 24mm lens from the opposite end of the pool table creating strong perspective distortion that makes the table appear dramatically larger and her lean appear more extreme with exaggerated angles. The pool cue creates a strong diagonal line through the composition. Several pool balls with visible scuffs and chalk marks are visible on the felt in sharp focus due to the wide angle capturing more depth. Her concentration face on lining up the shot creates authentic facial expression—squinted eyes creating crow's feet, slight frown creating expression lines, pursed lips, and furrowed brow creating genuine tension. The olive dress blends with the ambient bar darkness but pops in the pool table light creating separation. A beer bottle with peeling label and condensation sits on the table edge violating pool hall rules, slightly out of focus. Chalk dust is visible floating in the air caught by the light beam. Slightly dirty pool table felt visible with wear patterns. Perspective distortion from 24mm making her extended arms appear longer. This captures the dive bar competitive pool game, shot by a friend waiting their turn who notices the dramatic lighting makes it look more serious and cinematic than it is, documenting the moment of intense concentration while showing every real texture of the worn space."

if [ $? -eq 0 ]; then
  echo "✓ Concept 54 completed at $(date)"
else
  echo "✗ Concept 54 FAILED at $(date)"
fi

echo "Waiting $DELAY seconds before next generation..."
sleep $DELAY
echo ""

# Concept 55: The Liberty - Rose Gold Metallic Mini Dress
# Metadata: Thigh-high stockings (champagne shimmer), strappy heels, pin curls, candelabra
echo "Generating Concept 55: The Liberty - Rose Gold Metallic Mini Dress"
node "$WRAPPER_SCRIPT" edit \
  "$REFERENCE_IMAGE" \
  "**CRITICAL PHYSICS ENFORCEMENT - NOT AI GENERATED:**

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
- Spherical aberration creates \"onion ring\" concentric patterns inside bokeh orbs (budget lenses), aspherical elements smooth this (high-end lenses)
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

A 35mm photograph captured on a Nikon Z7 II with a 50mm f/1.8 lens at ISO 1600, f/2.0, 1/50s. The woman sits at a corner table at The Liberty with visible scratched tabletop, wearing a rose gold metallic mini dress with a square neckline, cap sleeves with slight pulling at seams, and a straight silhouette. The metallic fabric shifts between copper, pink, and gold depending on the angle of light with visible wrinkle lines throughout. Champagne-colored sheer thigh-high stockings with a subtle shimmer showing reinforced toe section and back seam slightly twisted and visible silicone band at top create a monochromatic metallic palette, paired with nude strappy heels with delicate ankle ties showing worn heel caps and scuffed straps. Her hair is styled in vintage pin curls all over her head with visible bobby pins and pin marks, creating tight, sculptural curls in a 1940s style with some curls already loosening and losing shape, visible hair spray buildup. She is looking directly at the camera with direct eye contact, face showing visible skin pores, fine lines around eyes and mouth, natural skin texture, period-appropriate makeup with visible powder settling into lines, and slight asymmetry in features. The scene is lit by an actual ornate multi-armed candelabra on her table holding five taper candles of varying heights with uneven burning creating different flame sizes and visible wax drips running down tapers, creating romantic, constantly flickering illumination at approximately 1900K. The candles produce warm, soft light with gentle shadows and constantly shifting highlights due to the flames' movement creating dynamic lighting with flicker visible. Additional ambient light comes from wall-mounted brass sconces with tarnished finish and amber glass shades with cracks providing warm fill. The background shows ornate Victorian-style wallpaper with peeling sections and water stains and dark wood wainscoting with visible scratches, slightly out of focus. Shot from across the table at a low angle with slight camera tilt, creating intimacy. The candlelight creates complex warm specular highlights on the metallic dress showing every fabric peak, making it appear to glow from within with shifting hot spots. The multiple candle flames at different heights create complex, multi-directional lighting with overlapping shadows in different directions and shadow density variation. Slight motion blur affects the candle flames themselves during 1/50s exposure creating elongated flame shapes. The rose gold color appears more copper-orange in the extremely warm candlelight. Her pin curls create dimensional shadows and highlights with each curl catching light differently showing sculptural quality. A vintage coupe glass with lipstick marks on rim and a cocktail showing liquid meniscus sits on the table, the liquid reflecting multiple candle flames creating sparkle points. The shallow depth of field keeps her face and upper body sharp while the background softly blurs with bokeh. Visible smoke rising from candles creating slight haze. Heavy vignetting. This captures an elegant, dressed-up dive bar moment, shot by a friend who appreciates how the vintage hair and metallic dress create an old Hollywood aesthetic in the candlelight, though the wear of the environment and imperfections in styling keep it grounded in reality."

if [ $? -eq 0 ]; then
  echo "✓ Concept 55 completed at $(date)"
else
  echo "✗ Concept 55 FAILED at $(date)"
fi

echo "Waiting $DELAY seconds before next generation..."
sleep $DELAY
echo ""

# Concept 56: Casino El Camino - Graphite Grey Asymmetric Hem Dress
# Metadata: Patterned tights (houndstooth), ankle boots, side-swept hair, jukebox glow
echo "Generating Concept 56: Casino El Camino - Graphite Grey Asymmetric Hem Dress"
node "$WRAPPER_SCRIPT" edit \
  "$REFERENCE_IMAGE" \
  "**CRITICAL PHYSICS ENFORCEMENT - NOT AI GENERATED:**

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
- Spherical aberration creates \"onion ring\" concentric patterns inside bokeh orbs (budget lenses), aspherical elements smooth this (high-end lenses)
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

A 35mm photograph captured on a Fujifilm X-T4 with a 35mm f/1.4 lens at ISO 4000, f/1.8, 1/60s. The woman stands next to the vintage jukebox at Casino El Camino with visible scratched chrome and fingerprint smudges, wearing a graphite grey jersey mini dress with an asymmetric hem—short on one side revealing more thigh with visible skin texture, longer on the other hitting above the knee showing fabric draping. The dress has a mock neck and long sleeves with slight pilling and fabric stress lines. Black and white houndstooth patterned tights showing small runs and pattern distortion over curves create bold graphic interest, paired with black suede ankle boots with a stacked wooden heel showing worn heel caps and scuffed suede with water stains. Her hair is swept dramatically to one side and tucked behind her ear with visible bobby pin, creating an asymmetric style with exaggerated volume on one side and flat on the other showing visible natural hair texture and slight grease. She is looking down at jukebox selections but eyes glance up toward camera showing direct eye contact, face showing visible enlarged pores especially on nose and cheeks, fine lines, natural skin texture, concentrated expression with slightly furrowed brow, and one side of face more illuminated. The primary light source is the jukebox itself, which glows with warm amber and red internal lighting at mixed temperatures creating colored light on her right side showing warm color cast, creating dramatic side lighting. The jukebox's chrome trim with visible scratches and wear reflects light in sharp specular highlights with distorted reflections. Additional lighting comes from neon beer signs—a blue Lone Star sign with one tube section flickering and a red Shiner sign with visible neon tube bends—creating colored fill light from different directions with color temperature mixing. The background shows the bar's dark walls covered densely in band stickers, venue stickers, and graffiti with layers of stickers peeling at edges, slightly out of focus creating texture. Shot from a slight angle capturing both her three-quarter view and the jukebox's glowing facade with chrome details. The jukebox light creates warm illumination on her right side at approximately 3000K while the left side is lit by the cooler neon signs at approximately 5500K, creating strong color temperature contrast and split lighting. Focus is on her face with jukebox slightly soft. At ISO 4000, very noticeable grain adds texture and a gritty film-like quality throughout with color noise visible in darker areas. The grey dress appears warmer where jukebox light hits it and cooler in the blue neon-lit areas showing realistic color temperature interaction. The houndstooth pattern creates visual complexity and authentic fabric detail with pattern visible. Lens flare creates a small warm glow from the jukebox's brightest amber section with internal reflections. A clear reflection of her silhouette is visible in the jukebox's curved glass front showing layered composition. Visible dust on jukebox glass. Sticky floor visible at bottom of frame. This captures the classic jukebox selection moment, shot by a friend who appreciates how the internal jukebox glow creates perfect moody side lighting, making the simple act of choosing songs look cinematic while showing every worn detail of the dive bar environment."

if [ $? -eq 0 ]; then
  echo "✓ Concept 56 completed at $(date)"
else
  echo "✗ Concept 56 FAILED at $(date)"
fi

echo "Waiting $DELAY seconds before next generation..."
sleep $DELAY
echo ""

# Concept 57: Deep Eddy Cabaret - Ivory Linen Shirt Dress
# Metadata: Bare legs, sandals, hair half-up half-down, outdoor afternoon light
echo "Generating Concept 57: Deep Eddy Cabaret - Ivory Linen Shirt Dress"
node "$WRAPPER_SCRIPT" edit \
  "$REFERENCE_IMAGE" \
  "**CRITICAL PHYSICS ENFORCEMENT - NOT AI GENERATED:**

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
- Spherical aberration creates \"onion ring\" concentric patterns inside bokeh orbs (budget lenses), aspherical elements smooth this (high-end lenses)
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

A 35mm photograph captured on a Canon EOS R6 with a 50mm f/1.8 lens at ISO 640, f/2.5, 1/200s. The woman sits on the outdoor patio at Deep Eddy Cabaret with visible weathered wood and peeling paint during a bright Sunday afternoon, wearing an ivory linen button-front shirt dress with a collar showing slight wear on points, rolled-up sleeves to three-quarter length with deep creases, and a relaxed, oversized fit that hits mid-thigh. The linen has extensive natural texture and deep wrinkles throughout showing every crease, crumple, and fold typical of completely relaxed linen with visible weave pattern and slight color variation. Her legs are bare and natural showing visible skin texture, light leg hair, freckles, small scars, natural skin tone variation with visible veins, paired with simple brown leather flat sandals with worn leather straps and dirty sole edges. Her hair is styled half-up half-down with the top section twisted loosely and clipped back with a visible plastic claw clip, while the bottom flows loose showing natural wave and texture with flyaways catching sunlight and creating halo effect, creating a casual, effortless look. She is looking directly at the camera with direct eye contact, face showing visible enlarged pores across nose and cheeks, fine lines around eyes enhanced by bright sunlight, natural skin texture with freckles made prominent by sun, slight sunburn creating redness on nose and cheeks, and genuine relaxed smile creating smile lines. The scene is lit by bright natural daylight around 2 PM at approximately 5000K—bright but not harsh, with the porch roof providing partial dappled shade that creates even, soft lighting with natural shadows. Dappled sunlight filters through large oak tree leaves creating small spots of harsh bright sunlight and distinct shadow shapes across her and the wooden porch planks showing deep wood grain and sun damage, creating organic natural light patterns that move slightly in breeze. The background shows other patio tables with visible wear and sun damage, potted plants with some dead brown leaves visible, and the street beyond with parked cars and pedestrians slightly out of focus at f/2.5 creating natural background separation. A ceiling fan visible above creates very slight motion blur in the wooden blades with visible dust accumulation. Shot from across the weathered picnic table showing carved graffiti at a natural, seated perspective creating authentic intimate conversation feel. The bright natural daylight means lower ISO creating clean, crisp detail with minimal grain showing fine sensor detail and texture. Colors are completely natural and accurate—the ivory dress appears true cream-white without any color casts with realistic rendering and visible linen color variation in weave. A beer bottle in brown glass sweating with extensive visible condensation droplets running down sides creating water trails sits on the table showing wet ring on wooden surface around it, catching direct sunlight creating bright specular highlight. Her face has natural realistic shadows under her jawline and nose from the overhead porch roof structure creating directional lighting showing real depth. The linen dress shows every single wrinkle and fold realistically with absolutely no smoothing or retouching. Background bokeh is gentle and natural at f/2.5, not creamy or artificial with still recognizable background shapes and details. Visible pollen particles or dust floating in direct sunlight shafts creating sparkle. A small spider web in upper corner of porch roof visible in background. Wooden porch floor showing paint peeling in multiple places and severe sun damage with bleached wood. Visible rust on metal chair legs. This captures a completely different dive bar experience—the casual day drinking, bright sunshine, fresh air version—shot by a friend who appreciates how the afternoon light makes everything feel peaceful and golden and honest, catching a moment of genuine relaxed contentment in harsh honest daylight showing every real texture, imperfection, and worn detail with nothing hidden."

if [ $? -eq 0 ]; then
  echo "✓ Concept 57 completed at $(date)"
else
  echo "✗ Concept 57 FAILED at $(date)"
fi

echo "Waiting $DELAY seconds before next generation..."
sleep $DELAY
echo ""

# Concept 58: The Jackelope - Magenta Velvet Turtleneck Dress
# Metadata: Knee-high boots (patent), crimped hair, taxidermy wall, warm spot lighting
echo "Generating Concept 58: The Jackelope - Magenta Velvet Turtleneck Dress"
node "$WRAPPER_SCRIPT" edit \
  "$REFERENCE_IMAGE" \
  "**CRITICAL PHYSICS ENFORCEMENT - NOT AI GENERATED:**

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
- Spherical aberration creates \"onion ring\" concentric patterns inside bokeh orbs (budget lenses), aspherical elements smooth this (high-end lenses)
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

A 35mm photograph captured on a Sony A7 III with a 85mm f/1.2 lens at ISO 2500, f/1.6, 1/60s. The woman stands in front of the taxidermy jackalope mount at The Jackelope with visible wood panel wall showing water damage, wearing a bright magenta velvet turtleneck mini dress with long sleeves showing crushed velvet texture at elbows and a body-skimming fit with visible compression lines. The velvet has strong directional nap creating dramatic light and dark tone variation with depth and richness in the color, showing wear pattern on high-friction areas. Black patent leather knee-high boots with a pointed toe showing scuff marks and stiletto heel with worn heel tip create sleek, dramatic contrast with mirror-like shine showing fingerprints. Her hair is fully crimped in tight aggressive zigzag waves with uneven crimp pattern creating maximum volume and intense 80s texture with frizz halo and visible natural hair roots showing different color. She is looking directly at the camera with direct eye contact, face showing visible enlarged pores especially across T-zone, fine lines around eyes and mouth, natural skin texture, slight shine from oil, and confident expression. The scene is lit by a warm spotlight with visible barn doors and dust on lens mounted on the ceiling aimed directly at the taxidermy display creating a pool of intense amber light at approximately 2900K. This spotlight illuminates both her and the mounted jackalope behind her with focused beam. Additional ambient lighting comes from vintage wall sconces with tarnished brass fixtures and Edison bulbs showing glowing filaments creating warm fill light with color temperature variation. The taxidermy jackalope (a rabbit with antlers) showing visible dust accumulation on fur, glass eyes with slight cloudiness, and mounting wear is visible on the wood-paneled wall behind her, creating quirky, authentic dive bar atmosphere that's slightly creepy. Shot with the 85mm lens from about 12 feet away creating strong compression that makes the jackalope appear much closer to her head than it actually is creating forced perspective. The extreme shallow depth of field at f/1.6 means only her face and upper body are in sharp focus—the jackalope behind her is recognizable but significantly soft showing heavy bokeh, and any foreground bar stools are strongly blurred into abstract shapes with complete detail loss. The magenta velvet is rich and intensely saturated, creating powerful color that pops dramatically against the dark wood paneling with water stains showing color contrast. The spotlight creates a strong natural vignette with the edges and corners of the frame much darker than the center creating dramatic falloff. Her crimped hair catches light on every single textured zigzag surface, creating complex highlights showing dimensional texture. A slight lens flare creates a warm glow streak from the spotlight with internal reflections. The velvet texture is clearly visible showing realistic fabric behavior with natural pile direction. Heavy grain at ISO 2500 with color noise in darker areas. Visible dust particles in spotlight beam creating sparkle. Wood paneling showing deep scratches and carved graffiti. This is shot by a friend who positions her directly in front of the venue's namesake quirky taxidermy for the perfect dive bar portrait showing local character, the weird Americana decor making it unmistakably authentic and slightly unsettling, though the magenta dress and perfect lighting keep it fashion-forward while showing every real texture and worn detail of this strange wonderful space."

if [ $? -eq 0 ]; then
  echo "✓ Concept 58 completed at $(date)"
else
  echo "✗ Concept 58 FAILED at $(date)"
fi

echo "Waiting $DELAY seconds before next generation..."
sleep $DELAY
echo ""

# Concept 59: Hole in the Wall - Chocolate Brown Slip Dress
# Metadata: Fishnet tights (black), platform sandals, messy side braid, stage lights
echo "Generating Concept 59: Hole in the Wall - Chocolate Brown Slip Dress"
node "$WRAPPER_SCRIPT" edit \
  "$REFERENCE_IMAGE" \
  "**CRITICAL PHYSICS ENFORCEMENT - NOT AI GENERATED:**

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
- Spherical aberration creates \"onion ring\" concentric patterns inside bokeh orbs (budget lenses), aspherical elements smooth this (high-end lenses)
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

A 35mm photograph captured on a Nikon Z6 II with a 35mm f/1.4 lens at ISO 10000, f/1.8, 1/60s. The woman stands near the small stage at Hole in the Wall with visible scuffed floor and equipment cables during a band's loud set, wearing a chocolate brown satin slip dress with thin straps showing fabric rolling, bias-cut construction creating diagonal draping, and lace trim at the neckline and hem with loose threads. The satin has a soft sheen with extensive wrinkles and drapes fluidly showing every fold. Black fishnet tights with a classic diamond pattern showing multiple large runs and holes add edge, paired with black platform sandals with chunky heels showing worn platform covering and ankle straps with scuffed buckles. Her hair is pulled to one side in a loose, messy braid that's actively coming apart with pieces escaped throughout entire length, the end barely secured with small elastic about to fail, and visible natural texture with frizz everywhere plus some strands stuck to neck from heat and humidity. She is watching the band intently but glances toward camera showing direct eye contact, face showing visible enlarged pores, perspiration creating shine across entire face, smudged eye makeup with mascara running slightly, flushed cheeks from heat and crowd, and entranced expression. The scene is lit by stage lights aimed at the performing band—multiple colored PAR cans with visible gel frames creating overlapping pools of saturated color. A magenta light from the left, an amber light from the right, and a cyan backlight with visible beam edges create complex color mixing and multiple colored shadows. Moving head lights create sweeping beams through heavy smoke or fog machine haze in the air creating dense visible light shafts and strong atmospheric scattering. The background shows parts of the stage setup with visible duct tape on cables, instrument cases with band stickers, and beer signs on the walls with burned-out sections, all heavily out of focus creating abstract color shapes. She's watching the band from side angle, shot from slightly behind and to the side at approximately 45 degrees, capturing her as an absorbed audience member lost in the music. The smoke in the air heavily diffuses the light creating intensely visible light beams with defined edges and a hazy, atmospheric quality throughout reducing overall contrast significantly. Shot from crowd perspective creating authentic concert feel. At ISO 10000, extremely heavy grain creates an intense, gritty documentary feel absolutely appropriate for loud live music photography with severe luminance noise and aggressive color noise creating colored patches throughout. Color noise is intense and visible in all darkest shadows showing magenta and green splotches. The brown dress appears to change colors dramatically under different stage lights—appearing reddish-burgundy in magenta light, golden-tan in amber light, creating color confusion. Heavy motion blur affects people moshing and moving in the background during 1/60s exposure creating ghost trails. The stage lights create significant lens flare with colored streaks and reduce overall contrast heavily creating washed-out blacks. Visible fog machine output creating thick haze. Band members visible on stage as motion-blurred silhouettes with instrument highlights. Volume and bass causing visible vibration blur in image. Extremely challenging mixed lighting creating white balance confusion. This captures the authentic intense dive bar live music experience, shot by a friend in the crowd during a show surrounded by chaos, all raw atmosphere and energy and heat, nothing polished or controlled showing the beautiful reality of live music in a tiny venue."

if [ $? -eq 0 ]; then
  echo "✓ Concept 59 completed at $(date)"
else
  echo "✗ Concept 59 FAILED at $(date)"
fi

echo "Waiting $DELAY seconds before next generation..."
sleep $DELAY
echo ""

# Concept 60: Drinks - Sky Blue Halter Dress
# Metadata: Thigh-high stockings (white sheer), stilettos, sleek middle part, phone flashlight
echo "Generating Concept 60: Drinks - Sky Blue Halter Dress"
node "$WRAPPER_SCRIPT" edit \
  "$REFERENCE_IMAGE" \
  "**CRITICAL PHYSICS ENFORCEMENT - NOT AI GENERATED:**

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
- Spherical aberration creates \"onion ring\" concentric patterns inside bokeh orbs (budget lenses), aspherical elements smooth this (high-end lenses)
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

A 35mm photograph captured on a Canon EOS R5 with a 50mm f/1.2 lens at ISO 16000, f/1.2, 1/30s. The woman sits in a booth at Drinks with heavily cracked vinyl showing duct tape repairs during the extremely dark last call hour around 2 AM, wearing a sky blue satin halter mini dress with a tied neck showing knot stress, open back, and A-line skirt. The light blue satin has a soft sheen with extensive wrinkles throughout. White sheer thigh-high stockings with delicate lace tops showing visible lace pattern and a slight shimmer with small runs starting create a delicate, feminine look, paired with silver metallic stilettos showing severely scuffed metallic finish. Her hair is parted exactly in the middle showing very visible scalp texture and hangs sleek and straight down both sides, creating minimalist, modern styling with slight asymmetry in length and some ends looking dry. She is looking toward camera showing direct eye contact with tired expression, face showing extremely visible enlarged pores across entire face, fine lines around eyes and mouth intensified by harsh light, natural skin texture with every imperfection visible, makeup mostly worn off showing bare skin patches, tired under-eye bags with darkness, and exhausted end-of-night expression. The scene is almost completely dark—the bar lights have been dimmed significantly for last call with most lights turned off. The only significant light source is a friend's phone flashlight being held off-camera to the right approximately 2 feet away, creating a single point of harsh white LED light at approximately 5500K. This creates extremely dramatic harsh side lighting with one side of her face intensely brightly illuminated showing every skin texture detail and the other side falling into deep shadow with crushed blacks and only minimal ambient bar light providing barely any fill. The phone flashlight creates a small, focused beam rather than broad illumination with visible beam edge and harsh falloff. The background is nearly completely black with only slight hints of booth edges and distant exit signs visible as tiny red glows. At ISO 16000, extreme aggressive grain and noise create a very heavily textured, rough image quality that's barely acceptable with visible noise reduction artifacts. Color noise is extremely prominent and severe in the shadows, creating large green and magenta splotches in all the darkest areas looking almost like film damage. The phone flashlight creates an unnatural blue-white quality at 5500K that contrasts harshly with the very warm amber bar lighting at approximately 2400K creating 3100K temperature difference. Shot from across the booth looking at her as she sits slumped back against the booth wall showing exhausted posture. The sky blue dress appears almost white in the direct phone light with blown highlights and disappears completely into shadow where direct light doesn't reach showing no detail. Her eyes squint significantly from the harsh direct flashlight creating pronounced crow's feet. A phone screen glow from someone else's phone creates a small rectangle of blue light in the far background. Heavy vignetting from wide aperture and low light. Significant visible camera shake from 1/30s handheld in darkness. This captures the authentic end-of-night dive bar reality—lights coming down, everyone exhausted, using phone flashlights to see in the darkness, shot by a friend who wants one last photo before everyone leaves, working with whatever light they can create with a phone, harsh and unflattering and completely real showing every tired detail and texture, the beautiful honest mess of a long night out finally ending."

if [ $? -eq 0 ]; then
  echo "✓ Concept 60 completed at $(date)"
else
  echo "✗ Concept 60 FAILED at $(date)"
fi

echo "Waiting $DELAY seconds before next generation..."
sleep $DELAY
echo ""

echo "All concepts completed at: $(date)"

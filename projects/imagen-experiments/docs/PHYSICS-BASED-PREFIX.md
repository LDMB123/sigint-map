# PHYSICS-BASED PHOTOREALISM PREFIX

## The Ultimate Anti-AI Instruction Set

Use this prefix on EVERY prompt to enforce actual optical and sensor physics that AI cannot naturally replicate:

---

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

---

## Usage

Prepend this to every single image generation prompt. Then follow with your specific scene description.

Example:
```
[ENTIRE PHYSICS PREFIX ABOVE]

A 35mm photograph captured on a Sony A7 III with a 35mm f/1.8 lens at ISO 3200, f/2.0, 1/60s. [Your scene description here...]
```

#!/usr/bin/env node

/**
 * V12 EXOTIC - COMPOUND PHYSICS + SCENE-SPECIFIC LAYERS + NEW PHENOMENA
 *
 * New physics over V11:
 * - Mechanoluminescence: ZnS:Cu stress→520nm green glow at tension zones
 * - Electroluminescence: ZnS:Mn AC-driven 585nm amber fiber-optic circuit traces
 * - Photoelastic birefringence: Acrylic Δn=C·σ rainbow stress fringes under polarized light
 * - Laser speckle: Coherent 532nm creates granular interference on skin/fabric
 * - Brewster polarization: Glass/vinyl at θ_B=56° fully s-polarized reflections
 * - Marangoni convection: Cocktail wine tears surface-tension gradient flow
 * - Surface plasmon resonance: Au nanoparticle 50nm plasmonic spectral sharpening
 * - Cholesteric thermochromic: Body-heat→color map blue(24°C)→gold(33°C)
 * - Triboluminescence: SrAl₂O₄:Eu²⁺ friction→468nm sparks at movement zones
 *
 * Structural improvements over V11:
 * - Compressed negation preamble (51w→28w, saves 23w)
 * - Scene-specific light physics (pool≠casino≠nightclub≠speakeasy≠penthouse)
 * - Compound physics chains (causal linking saves 24-32w)
 * - Physics operator notation (saves 16-24w)
 * - ~70w freed for new phenomena per prompt
 *
 * Concepts: 31-35 (exotic physics showcase)
 * Resolution: 4:5 at 1K
 * Target: 750-950w (maximizing within 1100w safety ceiling)
 */

import { GoogleAuth } from 'google-auth-library';
import fs from 'fs/promises';
import path from 'path';

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || 'gen-lang-client-0925343693';
const LOCATION = 'global';
const MODEL = 'gemini-3-pro-image-preview';
const ENDPOINT = `https://aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL}:generateContent`;
const OUTPUT_DIR = process.env.OUTPUT_DIR || path.join(process.env.HOME, 'nanobanana-output', 'vegas-v12-exotic');
const INPUT_IMAGE = process.argv[2] || '/Users/louisherman/Documents/518355716_10109335899644328_1380496532632646402_n.jpeg';

const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
await fs.mkdir(OUTPUT_DIR, { recursive: true });

// === SCENE-SPECIFIC LIGHT PHYSICS ===
const LIGHT_PHYSICS = {
  nightclub: `3D LIGHT: Primary tungsten 2800K CRI=100 hard shadows. Neon colored spill inverse-square. UV blacklight 365nm overhead strips driving fluorescent response. LED matrix wall cycling RGB at 2Hz. Laser 532nm coherent beams through fog creating speckle: random constructive/destructive interference on skin roughness σ=20μm, grain d=1.22λz/D=0.3mm, speckle boils with body motion. Fog Mie r=0.5μm tau=0.12/m volumetric forward-scatter g=0.7. Dual-illuminant WB error amber/cyan at overlap. Strobe frozen motion 1/8000s equivalent.`,

  speakeasy: `3D LIGHT: Candle clusters 1800K CRI=100 flickering 1-3Hz warm animate. Amber sconce 2200K warm pools inverse-square falloff. Crossed-polarizer accent from brass fixtures: reveals photoelastic stress in transparent materials. Smoke wisps Mie r=0.3μm tau=0.05/m thin volumetric. Schlieren: dn/dT=-1e-4 K⁻¹ density gradient above candle creates refractive lens deflecting background light 0.3-0.8mrad visible as wavy neon edge. Warm brick bounce. Gaslight replica flicker.`,

  penthouse: `3D LIGHT: City panoramic three walls warm golden multiple point-sources inverse-square. Fireplace 1600K linear gas flame animate 1-3Hz warm. Designer pendant 2800K focused spot. Brewster polarization: floor-ceiling glass at θ_B=56.3° reflected light fully s-polarized creating intensity modulation varying with viewing angle. Glass transmission: Strip skyline refracted n=1.52. Stars atmospheric scintillation. Environmental wrap-around panoramic reflection mapping onto specular surfaces.`,

  casino: `3D LIGHT: Chandelier warm 2800K overhead key. Triband fluorescent 4100K CRI=62 metameric failure: reds→brown, blues→grey-green under fluorescent zones. Cigar smoke Mie r=0.4μm tau=0.06/m thin wisps volumetric catching chandelier as warm halos. Neon colored spill. Dual-illuminant WB error amber/cyan-green at overlap boundary. Mahogany warm diffuse bounce. Green baize reflection from felt surfaces.`,

  lounge: `3D LIGHT: LED color-wash panels shifting slow 0.2Hz cycling through spectrum. Champagne sparkler approaching broadband white 5500K revealing maximum color simultaneously. Fog low floor Mie tau=0.08/m. Mirror panels recursive reflection multiplying all sources. Bass 40Hz vibration modulating fog density creating pulsing scatter. Purple underglow 405nm LED table-bounce. Chrome fixtures specular point-source multiplied.`,
};

// === COMPRESSED SKIN PHYSICS (saves ~20w vs V11) ===
const SKIN_PHYSICS = `SKIN BIO-OPTICAL: 3-layer Monte Carlo SSS μ_s'=22/18cm⁻¹ epidermis/dermis, μ_a=0.24 melanin, ℓ_s=1.4mm, g=0.82 Henyey-Greenstein. HbO₂ flush cheeks earlobes decolletage. Schlick R(θ)→1 grazing rim over warm SSS. Vasodilation blotchy. Collagen autofluorescence 340→400nm violet UV zones. Perspiration plano-convex micro-lenslets: inverted source images + meniscus thin-film iridescent fringe. Marschner R/TT/TRT hair triple-highlight. Piloerection: AC cold arrector pili micro-bumps upper arms with vellus hair catching rim. Nail lacquer: clear-coat specular over colored substrate double-reflection.`;

// === COMPRESSED CAMERA PHYSICS (saves ~15w vs V11) ===
const CAMERA_PHYSICS = `CAMERA+SENSOR: Canon R5 II 45MP BSI-CMOS. RF 50mm f/1.2L wide-open. Lens breathing 4% at 2.2m→48.1mm effective. Zernike Z4 defocus + Z7/Z8 coma 0.15λ + Z11 spherical 0.08 + Z5/Z6 astigmatism 0.05. Focus 2.2m: 1.5m/3.0m defocused blobs. ISO 3200 Poisson σ=√N SNR=28dB chroma noise. JPEG DCT 8×8 faint in dark gradients. Hot pixels 2-3 fixed RGB dots. Rolling shutter 8.2ms neon 2-3px skew. 15-blade Fraunhofer starburst. Barrel 0.8%. Clipping magenta fringe. Bayer demosaic false color. cos⁴θ vignetting 0.7-stop.`;

// === COMPRESSED GAZE PHYSICS (saves ~10w vs V11) ===
const GAZE_PHYSICS = `GAZE+EYE: Both eyes vergence 1.8° inward (2.2m) confirming binocular fixation on lens. Purkinje P1: bright venue light on anterior cornea CENTERED ON PUPIL confirming direct gaze. P2 faint inverted. P3-P4 barely visible. Iris radial collarette. Pupil 5-6mm low-light. Eyelash Fraunhofer: fine strands create spectral fringes on bright backlit sources as colored streaks from lash tips. Limbal ring 0.3mm. Scleral vessels faint. Tear film meniscus lower lid bright line.`;

// === COMPRESSED PREAMBLE (saves 23w vs V11) ===
function buildPreamble(expression) {
  return `Edit this photograph into raw candid nightlife photography shot by a friend with a professional camera at a real bar. RAW unretouched candid -- zero: softboxes|beauty-dishes|fill-cards|HMU|symmetrical-light|Photoshop|frequency-separation|dodge-burn|color-grading|Lightroom. Shot as-if by friend with Canon R5. She looks directly into the camera with ${expression}.`;
}

// === NEW PHYSICS BLOCKS ===
const PHYSICS_BLOCKS = {
  mechanoluminescence: `MECHANOLUMINESCENCE: ZnS:Cu phosphor 0.5wt% in polyester weave. Stress σ_xx>60MPa creates crystal defect emission via dislocation motion→520nm green photons. Φ_ML=0.005. Emission I(t)=I₀·exp(-t/τ) decay τ=180ms. Visible as faint green glow at maximum tension: waist cinch σ=85MPa→180cd/m², bust apex σ=75MPa→140cd/m², hip σ=60MPa→95cd/m². Intensity I∝σ² quadratic. Bass 40Hz modulates stress creating green flicker at tension zones.`,

  electroluminescence: `ELECTROLUMINESCENCE: ZnS:Mn phosphor AC-driven 400Hz 8mA. Mn²⁺ 3d⁵→⁴T₁(⁴G) transition 585nm amber Φ=0.18. Woven as 50μm fiber-optic strands in mesh creating glowing circuit-board traces. Total-internal-reflection light-pipe distributes emission along full strand length. 400Hz exceeds CFF flicker-free. Current modulation 8→12mA shifts 585→605nm warmer. Fiber crossings: additive brightness. Coverage ~15% mesh area glowing, 85% transparent. Fog creates halo scatter around each strand.`,

  photoelastic: `PHOTOELASTIC BIREFRINGENCE: Clear acrylic n_o=1.49 isotropic at rest. Applied stress σ→birefringence Δn=C·σ, C=85×10⁻¹² Pa⁻¹. Under crossed-polarizer accent light: colored isochromatic fringes where retardation δ=2π·Δn·t/λ=mπ. Fringe sequence blue→green→yellow→red repeating each 550nm retardation. Max stress at waist bone σ=120MPa→8 complete rainbow orders. Edge bones σ=60MPa→3-4 fringes. Grommet stress concentration: intense rainbow burst. Transparent skeleton with physics-driven color visualization.`,

  speckle: `LASER SPECKLE: DJ laser 532nm coherent on skin roughness σ=20μm creates objective speckle grain d=1.22λz/D=0.3mm. Random constructive/destructive granular intensity. Speckle boils with body micro-motion creating shimmering pattern. On fabric: speckle scale modulated by surface roughness — fine mesh 0.15mm grain, smooth vinyl 0.4mm grain, chainmail each ring independent speckle field. Speckle contrast C=1.0 fully developed for single-mode laser.`,

  brewster: `BREWSTER POLARIZATION: Glass surface θ_B=arctan(n₂/n₁)=56.3°: reflected fully s-polarized. Vinyl θ_B=57°. Bar surface θ_B=55°. Cross-polarized neon reflections create intensity modulation varying with viewing angle on all glossy surfaces. Partial polarization below θ_B follows Fresnel Rs/Rp divergence. Window reflections: city lights partially polarized, intensity varies with head position.`,

  marangoni: `MARANGONI: Cocktail ethanol evaporation creates surface-tension gradient dσ/dc driving upward climbing film visible as 'wine tears' λ_Marangoni=2mm spacing, periodic 0.3Hz droplet release. Condensation rivulet Rayleigh-Plateau R=0.8mm breaks into droplets at λ=9.02R=7.2mm, each sphere acting as fish-eye micro-lens imaging venue inverted.`,

  plasmon: `SURFACE PLASMON: Chainmail Au-nanoparticle coating 50nm creates localized SPR absorption 535nm. Plasmonic gold: sharper spectral selectivity Q=8 vs broadband bulk R=0.82. Appears warmer-redder than conventional gold with iridescent quality from resonance narrowband. Near-field enhancement 10²× at nanoparticle surface intensifies Raman signal of adjacent molecules.`,

  thermochromic: `CHOLESTERIC THERMOCHROMIC: Liquid crystal ink pitch p(T) temperature-dependent. Skin contact 33°C→pitch reflects 580nm warm gold. Free-hang 24°C→pitch reflects 480nm cool blue. 9°C ΔT drives visible blue-to-gold color transition across garment creating full-spectrum body-heat map. High-contact zones (waist, bust, inner arm) warm gold. Exposed zones (hem, shoulders) cool blue. Dynamic: movement shifts heat map in real-time.`,

  triboluminescence: `TRIBOLUMINESCENCE: SrAl₂O₄:Eu²⁺ phosphor crystals. Friction→crystal symmetry breaking→charge separation→468nm/520nm blue-green sparks. Flash duration 8ms visible. At fabric-on-skin friction zones: waist twist, hip sway, fabric shift against thighs. Each movement event produces 2-5 discrete spark flashes along friction line. Afterglow τ=3-5s persistent trail behind motion direction — long-persistence phosphor creates visible ghost of movement path.`,
};

// === COMPRESSED IMPERFECTIONS (scene-specific, saves ~15w) ===
function buildImperfections(sceneType) {
  const base = `ISO 3200 grain. Motion blur fingertips. Flyaway hair Marschner R-lobe. Bokeh 15-blade. Flare veiling 2-3 green ghosts. Rolling shutter neon skew. JPEG DCT shadows. Hot pixels 2-3. Lens breathing field narrowing. Preserve face identical.`;
  const sceneExtras = {
    nightclub: `Glass refraction foreground blur. Fog scatter volumetric. Laser speckle shimmer. Bass 40-80Hz fabric flutter.`,
    speakeasy: `Candle wax drip. Smoke wisps. Brick dust. Condensation ring napkin. Schlieren shimmer above flame.`,
    penthouse: `Glass transmission city. Fireplace shimmer. Condensation on cold glass. City light caustics.`,
    casino: `Cigar smoke wisps. Chip stack reflections. Felt green spill. Marble reflections. Condensation ring.`,
    lounge: `Fog low floor. Mirror recursive. Sparkler bright saturate. Bass fabric flutter. Chrome flare multiply.`,
  };
  return `RAW IMPERFECTIONS: ${base} ${sceneExtras[sceneType] || sceneExtras.nightclub}`;
}

// === EXPRESSIONS (30 unique from V11 + 5 new for V12) ===
const expressions = [
  'quiet confidence, slight upward chin tilt, one eyebrow barely raised',
  'playful half-smile, eyes slightly narrowed with amusement',
  'sultry intensity, lips barely parted, heavy-lidded gaze',
  'warm genuine smile reaching the eyes, crow-foot crinkles forming',
  'mysterious composure, Mona Lisa micro-smile, unreadable expression',
  'bold direct stare, chin level, unapologetic presence',
  'soft vulnerability, eyes wide and luminous, gentle parted lips',
  'knowing smirk, one corner of mouth lifted, eyes sparkling',
  'fierce determination, jaw set, eyes locked and unwavering',
  'relaxed elegance, slight head tilt, effortless poise',
  'coy glance through lowered lashes, chin dipped, eyes up',
  'radiant joy, broad genuine smile, eyes crescent-shaped',
  'cool detachment, perfectly composed, model stillness',
  'intimate warmth, as if recognizing someone beloved',
  'defiant edge, slight nostril flare, commanding presence',
  'dreamy softness, eyes slightly unfocused then snapping to lens',
  'sharp wit, compressed smile suppressing laughter',
  'regal bearing, elongated neck, imperious but inviting gaze',
  'candid surprise, caught mid-laugh, natural and unposed',
  'magnetic pull, steady unblinking gaze, gravitational eye contact',
  'tender amusement, gentle head shake, fond expression',
  'electric energy, wide eyes, barely contained excitement',
  'languid ease, heavy-lidded relaxation, unhurried presence',
  'conspiratorial wink-adjacent, one eye slightly more closed',
  'dignified grace, serene half-smile, classical composure',
  'provocative challenge, tilted chin up, daring the camera',
  'genuine surprise transitioning to delight, eyes widening',
  'contemplative depth, thoughtful gaze, intelligence visible',
  'victorious satisfaction, earned confidence, subtle triumph',
  'pure magnetism, the look that stops conversations mid-sentence',
  // V12 new expressions
  'fascinated discovery, eyes bright with wonder, slight open-mouth awe',
  'dangerous calm, perfectly still, predatory patience behind warm eyes',
  'unguarded laughter caught between breaths, eyes squeezed with joy',
  'sovereign poise, the look of someone who owns the room and knows it',
  'raw authenticity, no mask no performance, just presence meeting lens',
];

// === V12 PROMPT BUILDER ===
function buildPrompt(concept, index) {
  // Offset by 30 so V12 concepts (indices 0-4) use V12 expressions (indices 30-34)
  const expression = expressions[(index + 30) % expressions.length];
  const preamble = buildPreamble(expression);
  const lightBlock = LIGHT_PHYSICS[concept.sceneType] || LIGHT_PHYSICS.nightclub;
  const imperfections = buildImperfections(concept.sceneType);

  // Compose physics blocks based on concept's selected phenomena
  const exoticPhysics = (concept.physics || [])
    .map(p => PHYSICS_BLOCKS[p])
    .filter(Boolean)
    .join('\n\n');

  return `${preamble} ${concept.attire}

SCENE: ${concept.scene}

${CAMERA_PHYSICS}

${GAZE_PHYSICS}

${lightBlock}

${SKIN_PHYSICS}

${concept.fabric}

${exoticPhysics}

${concept.hosiery}

${imperfections}`;
}

// === V12 EXOTIC CONCEPTS (31-35) ===
const concepts = [
  // === CONCEPT 31: MECHANOLUMINESCENT STRESS-REACTIVE ===
  {
    name: '31-mechanoluminescent-stress-reactive-nightclub',
    sceneType: 'nightclub',
    physics: [],  // Described inline in fabric block to avoid duplication
    attire: 'She wears a jet black ultra-tight bodycon micro dress embedded with mechanoluminescent ZnS:Cu phosphor creating stress-reactive glow. Maximum body tension at waist cinch, bust apex, hip curve. Black at rest, glows faint 520nm green at high-stress zones >60MPa. Sleeveless halter behind neck bare back. Ultra-short hemline. Stress distribution visible as green light pattern mapping body geometry.',
    scene: 'Underground nightclub: UV blacklight 365nm overhead strips, DJ laser 532nm cutting fog beams, moving-head RGB sweeping, bass bins 40Hz shaking floor, fog machine dense low, crowd silhouettes, bottle sparklers approaching, LED matrix wall cycling, crushed ice bucket, bass vibration in drink surface.',
    fabric: `MECHANOLUMINESCENT BODYCON: Polyester-elastane 4-way stretch with ZnS:Cu phosphor 0.5wt% throughout. At rest: jet black R=0.03 absorption. Applied stress σ_xx creates crystal defect emission 520nm green via dislocation motion. Waist cinch σ=85MPa→I=180cd/m² bright green glow ring. Bust apex σ=75MPa→I=140cd/m². Hip curve σ=60MPa→I=95cd/m² threshold glow. I∝σ² quadratic scaling. Emission decay I(t)=I₀·exp(-t/τ) τ=180ms creating motion trails. UV 365nm excites residual phosphorescence faint background. Bass 40Hz micro-vibration modulates stress creating 40Hz green flicker at tension zones — fabric pulses with music. Body-mapped zero-ease stretched to elastic limit. Laser 532nm speckle overlays green glow creating granular modulation. Fabric-on-skin friction at movement zones triggers micro-sparks from crystal shear at contact points.`,
    hosiery: 'HOSIERY [N66 15d T=0.76 warp-knit, compression gradient]: Black seamless extending void. UV creates faint purple shin glow. Mechanoluminescent green reflects as secondary tint. Bass vibration. Laser speckle 0.3mm grain on nylon.',
  },

  // === CONCEPT 32: ELECTROLUMINESCENT FIBER-OPTIC CIRCUIT ===
  {
    name: '32-electroluminescent-circuit-mesh-nightclub',
    sceneType: 'nightclub',
    physics: [],  // Described inline in fabric block to avoid duplication
    attire: 'She wears a black mesh micro dress with electroluminescent ZnS:Mn fiber-optic strands woven in circuit-board pattern. 50μm glowing amber 585nm fibers trace geometric paths across semi-transparent mesh. Halter behind neck completely bare back to waist. Mesh semi-transparent skin visible through non-glowing 85% area. Ultra-short hemline. Glowing technical schematic overlaying visible skin.',
    scene: 'Tech-forward nightclub: LED matrix walls holographic patterns, UV strip floor lighting 365nm, chrome fixtures everywhere, fog machine light-beams visible, mirror panels recursive, moving-head RGB beams, DJ holographic display, future aesthetic, polished black concrete floor.',
    fabric: `ELECTROLUMINESCENT CIRCUIT MESH: Base hexagonal mesh 1.2mm aperture black nylon T=0.70. Through mesh: skin visible as warm shadow. Woven 50μm fiber-optic strands ZnS:Mn phosphor AC 400Hz 8mA. Mn²⁺ 3d⁵→⁴T₁(⁴G) 585nm amber Φ=0.18. Each strand total-internal-reflection light-pipe distributing emission along full length. Circuit pattern: geometric traces creating glowing schematic visible through and on top of mesh simultaneously. Fiber-to-mesh contrast: dark transparent windows vs bright amber circuit traces. 400Hz exceeds CFF flicker-free. Current modulation 8→12mA shifts 585→605nm warmer at high-load zones. Crossings: additive brightness where strands overlap creating bright nodes. Coverage 15% glowing 85% transparent. LED matrix: colored reflections between glowing fibers in mesh windows. Fog: volumetric scatter creating amber halo around each strand. Bare back: no fibers, skin directly lit by LED matrix through mesh framework.`,
    hosiery: 'HOSIERY [N66 15d T=0.76 warp-knit, compression gradient]: Black with thin amber fiber-optic thread welt. UV floor strip purple shin glow. EL dress 585nm amber reflects on stockings as warm accent. LED matrix color catches. Mesh-to-stocking transition at hemline.',
  },

  // === CONCEPT 33: PHOTOELASTIC ACRYLIC STRESS-VIZ CORSET ===
  {
    name: '33-photoelastic-stress-rainbow-speakeasy',
    sceneType: 'speakeasy',
    physics: ['photoelastic', 'marangoni'],
    attire: 'She wears a clear transparent acrylic structured corset micro dress with 12 photoelastic acrylic bones visible as structural skeleton showing rainbow stress fringes. Black silk base layer beneath transparent acrylic panels. Sweetheart bustline very low. Open lace-up back through brass grommets extreme waist cinch. Ultra-short hemline. Stress distribution rendered as rainbow interference pattern — physics made visible as art.',
    scene: 'Modern speakeasy: crossed-polarizer accent lighting from brass fixtures, candle clusters amber glass 1800K flickering, exposed brick low ceiling, cracked leather booth deep, absinthe fountain ornate brass dripping, vintage gramophone, prohibition-era bottles dusty, cocktail coupe with wine tears visible, gaslight replica, wax pooling.',
    fabric: `PHOTOELASTIC ACRYLIC CORSET: Base layer 22-momme black duchess satin opaque. Outer structural corset clear acrylic panels n_o=1.49 isotropic at rest. 12 acrylic boning channels 12mm×3mm under extreme compression from cinch. Applied stress σ→birefringence Δn=C·σ where C=85×10⁻¹² Pa⁻¹ stress-optic coefficient. Crossed-polarizer accent reveals isochromatic fringe pattern: retardation δ=2π·Δn·t/λ at mπ creates colored fringes. Sequence blue→green→yellow→red repeating each 550nm retardation order. Waist center bone σ=120MPa→8 complete rainbow orders creating concentrated burst. Edge bones lower σ=60MPa→3-4 fringes wider spaced. Grommet holes: stress concentration creates intense rainbow spot where brass compresses acrylic. Transparent panels: black silk visible through clear creating dark background for rainbow pattern. Candle 1800K + crossed-polarizer: warm-toned rainbow fringes. Breathing modulates stress creating living rainbow shift with each inhale/exhale. Lace-up tension: radial stress lines emanating from each grommet as colored fan.`,
    hosiery: 'HOSIERY [N66 15d T=0.76 warp-knit, compression gradient]: Black with thin brass-thread welt. Candle warm catches shin. Rainbow caustics from photoelastic bones project onto stockings as colored spots. Crossed-polarizer accent subtle vertical shin. Wax pooling light warm.',
  },

  // === CONCEPT 34: THERMOCHROMIC BODY-HEAT MAP + PLASMON ===
  {
    name: '34-thermochromic-heat-map-plasmon-lounge',
    sceneType: 'lounge',
    physics: [],  // Described inline in fabric block to avoid duplication
    attire: 'She wears a cholesteric thermochromic liquid crystal one-shoulder micro dress that maps body heat as visible color — warm gold at skin contact transitioning through spectrum to cool blue at exposed edges. Single strap left shoulder right side bare. Au-nanoparticle chainmail accent belt at waist with plasmonic spectral sharpening. Ultra-short hemline. Living color map following body temperature contours.',
    scene: 'VIP bottle service lounge: LED color-wash panels shifting slow purple-to-blue, champagne magnum sparkler approaching bright broadband, crystal flutes refracting light, floor-ceiling mirror panels recursive, fog low floor, floor-ceiling glass wall panoramic city view, chrome everywhere, DJ bass 40Hz through glass, cocktail with visible Marangoni wine tears.',
    fabric: `THERMOCHROMIC HEAT-MAP: Cholesteric liquid crystal ink throughout fabric. Pitch p(T) temperature-dependent Bragg reflection. Skin contact 33°C→pitch reflects 580nm warm gold. Moderate contact 29°C→550nm green. Free-hang 24°C→pitch reflects 480nm cool blue. 9°C ΔT driving full blue→green→gold color transition across garment = body-heat visualization. High-contact zones warm gold: waist band, inner arm, bust contact, behind knee. Exposed zones cool blue: hem flutter, shoulder drape, any gap between skin and fabric. Dynamic: body movement shifts contact creating real-time color migration — sit down and seat-contact zone blooms gold. Sparkler broadband reveals maximum color range simultaneously. LED purple underglow: shifts perceived color cooler. Mirror panels: recursive multiplication of heat-map pattern.
PLASMONIC BELT: Chainmail waist accent 2mm Au-nanoparticle coated 50nm. Localized SPR absorption 535nm Q=8 sharp. Plasmonic gold: warmer-redder than conventional gold with iridescent quality from resonance narrowband. Each chain ring: toroidal micro-mirror with plasmonic spectral sharpening. Thermochromic-to-plasmonic transition at waist: blue-gold heat-map meets sharp plasmonic gold creating distinct warm boundary.`,
    hosiery: 'HOSIERY [N66 10d T=0.87 ultra-sheer, compression gradient]: Nude with gold plasmonic-shimmer thread welt. Thermochromic dress heat-map colors reflect. LED purple catches ultra-sheer. Fog haze around ankles. Sparkler bright catches welt. Mirror doubles below.',
  },

  // === CONCEPT 35: 5-PHYSICS COMPOUND FINALE ===
  {
    name: '35-compound-5-physics-mega-penthouse',
    sceneType: 'penthouse',
    physics: [],  // All 5 physics described inline in fabric block to stay under 1100w ceiling
    attire: 'She wears a jet black bodycon micro dress combining FIVE exotic physics simultaneously: mechanoluminescent ZnS:Cu stress-reactive green glow zones, cholesteric thermochromic panels shifting blue→gold with body heat, triboluminescent SrAl₂O₄ friction sparks at movement seams. Halter behind neck completely bare back. Ultra-short hemline. Five physics visible simultaneously on single garment — stress map + heat map + friction sparks creating unprecedented compound visualization.',
    scene: 'Ultimate penthouse sky lounge: floor-ceiling glass three walls corner, entire Strip visible south warm golden, mountains dark west, fireplace linear gas warm animate, designer pendant 2800K focused, Baccarat crystal champagne coupe with Marangoni wine tears climbing glass, white marble bar, city carpet below, stars desert sky clear, cocktail hour golden light.',
    fabric: `5-PHYSICS COMPOUND BODYCON: Base polyester-elastane 4-way stretch black.
[1] MECHANOLUMINESCENT ZnS:Cu 0.5wt%: waist σ=85MPa→520nm green glow I∝σ², bust 75MPa, hip 60MPa threshold. τ=180ms decay creates motion trails.
[2] THERMOCHROMIC cholesteric LC panels at side insets: skin contact 33°C→580nm gold, free-hang 24°C→480nm blue. 9°C ΔT full spectrum heat-map. Side panels show warm gold at hip contact transitioning to cool blue at hem.
[3] TRIBOLUMINESCENT SrAl₂O₄:Eu²⁺ at fabric seams: movement friction→468nm/520nm blue-green sparks 8ms flash at waist twist, hip sway, fabric-skin shift. 2-5 discrete spark flashes per movement event along friction line. Afterglow τ=3-5s persistent trail.
[4] BREWSTER at glass walls: θ_B=56.3° city panoramic partially s-polarized. Intensity varies with head position. Strip skyline modulated by polarization.
[5] MARANGONI in champagne coupe: ethanol surface-tension gradient drives wine tears λ=2mm, 0.3Hz droplet release.
COMPOUND: Green stress glow + gold/blue heat-map + blue-green friction sparks ALL simultaneously visible. Mechanoluminescent green strongest at waist where thermochromic also shows gold (warm contact = high stress) creating green+gold compound. Friction sparks flash at boundaries between thermal zones. Fireplace 1600K warm animate catches all three self-emission physics differently.`,
    hosiery: 'HOSIERY [N66 15d T=0.76 warp-knit, compression gradient]: Black. All three dress emission physics reflect: green mechanoluminescent, gold/blue thermochromic, spark triboluminescent. Fireplace warm shin. City panoramic through glass. Wine tears in champagne catching city light.',
  },
];

// === GENERATION ENGINE (same as V11 with V12 prompt builder) ===
async function generateEdit(concept, inputImage, index, retries = 0) {
  const prompt = buildPrompt(concept, index);
  const wordCount = prompt.split(/\s+/).length;

  console.log(`\n${'='.repeat(60)}`);
  console.log(`[${index + 1}/${concepts.length}] ${concept.name}`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Prompt: ${wordCount} words | Physics: ${(concept.physics || []).join(', ')}`);
  console.log(`Scene: ${concept.sceneType} | Expression: ${expressions[index % expressions.length].substring(0, 50)}...`);

  if (wordCount > 1100) {
    console.error(`ABORT: ${wordCount}w exceeds 1100w safety ceiling! Skipping concept.`);
    return null;
  }

  const imageBuffer = await fs.readFile(inputImage);
  const base64Image = imageBuffer.toString('base64');
  const ext = path.extname(inputImage).toLowerCase();
  const mimeType = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : ext === '.webp' ? 'image/webp' : 'image/png';

  const requestBody = {
    contents: [{ role: 'user', parts: [
      { text: prompt },
      { inlineData: { mimeType, data: base64Image } },
    ]}],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
      imageConfig: { aspectRatio: '4:5', imageSize: '1K' },
    },
  };

  const client = await auth.getClient();
  const token = await client.getAccessToken();

  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.text();
    if (response.status === 429) {
      if (retries >= 10) throw new Error('Rate limited 10x - giving up. Try again later.');
      const wait = 90;
      console.log(`Rate limited (${retries + 1}/10) - waiting ${wait}s... [${error.substring(0, 150)}]`);
      await new Promise(r => setTimeout(r, wait * 1000));
      return generateEdit(concept, inputImage, index, retries + 1);
    }
    throw new Error(`API ${response.status}: ${error.substring(0, 300)}`);
  }

  const data = await response.json();
  if (data.candidates?.[0]?.content?.parts) {
    for (const part of data.candidates[0].content.parts) {
      if (part.text && !part.thought) console.log(`Model: ${part.text.substring(0, 100)}...`);
      if (part.inlineData?.data) {
        const img = Buffer.from(part.inlineData.data, 'base64');
        const fp = path.join(OUTPUT_DIR, `${concept.name}.png`);
        await fs.writeFile(fp, img);
        console.log(`SAVED: ${fp} (${(img.length / 1024 / 1024).toFixed(2)} MB)`);
        return fp;
      }
    }
  }
  console.error('NO IMAGE generated');
  return null;
}

// === MAIN EXECUTION ===
const s = parseInt(process.argv[3] || '0');
const e = parseInt(process.argv[4] || String(concepts.length));
const results = [];

const existingFiles = await fs.readdir(OUTPUT_DIR).catch(() => []);
const existingNames = new Set(existingFiles.filter(f => f.endsWith('.png')).map(f => f.replace('.png', '')));

console.log(`\n=== V12 EXOTIC - 4:5 1K - COMPOUND PHYSICS + SCENE-SPECIFIC LAYERS ===`);
console.log(`Range: ${s + 1}-${Math.min(e, concepts.length)} | Input: ${path.basename(INPUT_IMAGE)}`);
console.log(`Output: ${OUTPUT_DIR}`);
console.log(`Already generated: ${existingNames.size} | Physics library: ${Object.keys(PHYSICS_BLOCKS).length} phenomena\n`);

for (let i = s; i < Math.min(e, concepts.length); i++) {
  if (existingNames.has(concepts[i].name)) {
    console.log(`SKIP [${i + 1}/${concepts.length}] ${concepts[i].name} (already exists)`);
    results.push({ name: concepts[i].name, path: 'exists', ok: true });
    continue;
  }
  try {
    const fp = await generateEdit(concepts[i], INPUT_IMAGE, i);
    results.push({ name: concepts[i].name, path: fp, ok: !!fp });
  } catch (err) {
    console.error(`FAIL: ${concepts[i].name} - ${err.message}`);
    results.push({ name: concepts[i].name, path: null, ok: false, err: err.message });
  }
  if (i < Math.min(e, concepts.length) - 1) {
    console.log('Waiting 45s...');
    await new Promise(r => setTimeout(r, 45000));
  }
}

console.log(`\n${'='.repeat(60)}`);
console.log(`V12 EXOTIC RESULTS`);
console.log(`${'='.repeat(60)}`);
const ok = results.filter(r => r.ok);
const fail = results.filter(r => !r.ok);
console.log(`Success: ${ok.length}/${results.length}`);
ok.forEach(r => console.log(`  OK ${r.name}`));
if (fail.length) {
  console.log(`Failed: ${fail.length}`);
  fail.forEach(r => console.log(`  FAIL ${r.name}: ${r.err}`));
}
console.log(`\nOutput: ${OUTPUT_DIR}`);

#!/usr/bin/env node

/**
 * V13 TWO-PIECE - DARING TWO-PIECE ATTIRE + V12 PHYSICS ARCHITECTURE
 *
 * Same physics engine as V12:
 * - Compressed shared blocks (camera, gaze, skin, imperfections)
 * - Scene-specific light physics (5 variants)
 * - 9 exotic physics phenomena available
 * - Compressed negation preamble
 *
 * New: Two-piece attire (crop tops, bralettes, skirt sets, etc.)
 * Concepts: 36-45 (10 two-piece concepts across 5 scene types)
 * Resolution: 4:5 at 1K
 * Target: 650-900w (within 1100w safety ceiling)
 */

import path from 'path';
import {
  LIGHT_PHYSICS, SKIN_PHYSICS, CAMERA_PHYSICS, GAZE_PHYSICS,
  buildPreamble, buildImperfections, expressions,
  createGenerationEngine,
} from './lib/physics-engine.js';

const OUTPUT_DIR = process.env.OUTPUT_DIR || path.join(process.env.HOME, 'nanobanana-output', 'vegas-v13-two-piece');
const INPUT_IMAGE = process.argv[2] || '/Users/louisherman/Documents/518355716_10109335899644328_1380496532632646402_n.jpeg';

// === V13 PROMPT BUILDER ===
function buildPrompt(concept, index) {
  // Offset by 35 so V13 concepts (indices 0-9) use V13 expressions (indices 35-44)
  const expression = expressions[(index + 35) % expressions.length];
  const preamble = buildPreamble(expression);
  const lightBlock = LIGHT_PHYSICS[concept.sceneType] || LIGHT_PHYSICS.nightclub;
  const imperfections = buildImperfections(concept.sceneType);

  return `${preamble} ${concept.attire}

SCENE: ${concept.scene}

${CAMERA_PHYSICS}

${GAZE_PHYSICS}

${lightBlock}

${SKIN_PHYSICS}

${concept.topFabric}

${concept.bottomFabric}

${concept.hosiery}

${imperfections}`;
}

// === V13 TWO-PIECE CONCEPTS (36-45) ===
const concepts = [
  // === CONCEPT 36: SEQUIN BRALETTE + VINYL MINI SKIRT (NIGHTCLUB) ===
  {
    name: '36-sequin-bralette-vinyl-mini-nightclub',
    sceneType: 'nightclub',
    attire: 'She wears a two-piece: black micro-sequin triangle bralette with thin spaghetti straps and exposed midriff, paired with ultra-high-waist jet black PVC vinyl micro mini skirt. Maximum bare midriff between bralette hem and skirt waistband. Bralette barely covers, sequins catching every light. Skirt skin-tight ultra-short hemline.',
    scene: 'Underground nightclub: massive LED wall cycling behind DJ, laser 532nm beams cutting fog, strobe frozen motion, bottle sparklers approaching, black leather booth corner, bass 40Hz vibrating drink surface, crushed ice bucket, fog machine dense low.',
    topFabric: `SEQUIN BRALETTE: Triangle cups 4mm flat-disc sequins overlapping fish-scale. Each sequin: aluminum substrate Au-PVD coating R=0.88 specular mirror. Tilt angles vary ±15° from body curvature creating distributed reflection field — each sequin reflects different light source creating pointillist light map of venue. LED wall: individual sequins reflect red/blue/green depending on tilt angle. Laser 532nm: bright coherent specular flash on aligned sequins. Strobe: simultaneous flash across all sequins creating starburst. Thin black satin binding. Spaghetti straps 3mm catching collarbone highlights.`,
    bottomFabric: `VINYL MINI SKIRT: PVC vinyl 0.4mm glossy n=1.54 R_specular=0.12 near-mirror. Body-mapped zero-ease. Fresnel reflectance: near-normal R=4% transparent-look, grazing R→80% mirror-bright at hip curve and hem edge. LED wall: full venue reflection mapped onto curved vinyl surface creating distorted panoramic mirror of entire nightclub. Laser: bright green streak across vinyl. Fog: vinyl reflects scattered volumetric light as diffuse glow. Ultra-high waist hits narrowest point. Ultra-short hemline. Sitting creases at hip creating caustic bright lines in vinyl reflection.`,
    hosiery: 'HOSIERY [N66 15d T=0.76 warp-knit, compression gradient]: Black seamless. LED catches shin colored specular. Vinyl skirt hem-to-stocking transition: mirror finish ends, matte black begins. Laser speckle 0.3mm grain on nylon. Fog scatter around ankles.',
  },

  // === CONCEPT 37: VELVET BANDEAU + CHAINMAIL MICRO SKIRT (SPEAKEASY) ===
  {
    name: '37-velvet-bandeau-chainmail-micro-speakeasy',
    sceneType: 'speakeasy',
    attire: 'She wears a two-piece: deep burgundy crushed velvet strapless bandeau top and a gold chainmail micro skirt sitting low on hips. Wide bare midriff. Bandeau strapless held by body tension. Chainmail skirt drapes liquid-metal from hip bones, each ring catching candlelight individually. Ultra-short hemline chainmail swaying with movement.',
    scene: 'Modern speakeasy: candle clusters amber glass 1800K flickering, exposed brick low ceiling, cracked leather booth deep, absinthe fountain ornate brass dripping, cocktail coupe on marble bar, gaslight replica warm, prohibition-era bottles dusty, wax pooling, vintage gramophone brass horn.',
    topFabric: `VELVET BANDEAU: Crushed velvet pile height 1.2mm silk-rayon. Anisotropic BRDF: pile direction creates dark/bright zones shifting with body breathing. Burgundy deep λ_peak=680nm absorbing blue-green. Crushed texture: random pile orientation creates light/dark mottled pattern unique to each wearing. Candle 1800K: velvet absorbs blue, reflects warm creating ultra-deep burgundy-amber. Strapless: body tension compresses top edge creating bright horizontal highlight line. Pile catches smoke wisps as texture shadow.`,
    bottomFabric: `CHAINMAIL MICRO SKIRT: Interlocking 4mm rings brass-plated steel. Each ring: toroidal mirror reflecting candle as individual point-source creating distributed warm constellation across skirt surface. Ring-to-ring: micro-shadow in interlock gaps. Drape: chainmail follows gravity + body curve creating catenary between hip bones. Movement: rings slide against each other with audible metallic whisper, reflections shift as each ring rotates. Hem: individual rings hang free creating fringe of tiny pendulums. Weight ~800g pulling fabric taut from hip. Candlelight through gaps: warm light between rings illuminating skin beneath as glowing grid.`,
    hosiery: 'HOSIERY [N66 15d T=0.76 warp-knit, compression gradient]: Black with thin brass-thread welt matching chainmail warmth. Candle warm shin highlight. Chainmail hem rings cast tiny moving shadows onto stocking tops. Smoke wisps around calves. Wax pooling light warm bounce.',
  },

  // === CONCEPT 38: MESH CROP TOP + LEATHER MINI SKIRT (NIGHTCLUB) ===
  {
    name: '38-mesh-crop-leather-mini-nightclub',
    sceneType: 'nightclub',
    attire: 'She wears a two-piece: black sheer mesh long-sleeve crop top ending above navel with visible skin through mesh everywhere, paired with ultra-high-waist matte black leather micro mini skirt. Mesh fully transparent showing bralette beneath. Bare midriff below crop above skirt. Leather skirt skin-tight ultra-short.',
    scene: 'Underground nightclub: UV blacklight 365nm strips overhead, moving-head RGB beams sweeping, LED matrix wall, fog machine dense, bass bins shaking floor, crowd silhouettes dancing, bottle service sparklers, chrome fixtures, black leather seating.',
    topFabric: `MESH CROP TOP: Hexagonal knit mesh 0.8mm aperture black nylon monofilament T=0.75. Through mesh: skin texture visible everywhere modulated by hex grid moire at camera pixel pitch. Black satin bralette visible beneath mesh as geometric dark shape. Long sleeves: mesh on arms shows bicep/forearm skin with UV 365nm creating purple fluorescent response on any brightener in mesh fiber. Mesh-on-skin: slight gap creates shadow layer between mesh surface and skin, visible as depth when lit from side. LED colors pass through mesh illuminating skin beneath with colored wash. Crop hem: mesh ends above navel, clean horizontal cut.`,
    bottomFabric: `LEATHER MINI SKIRT: Full-grain matte black leather 0.8mm. Matte finish: micro-rough surface BRDF broad specular lobe 45° half-width. Not mirror like vinyl — soft diffuse highlights spreading across curves. UV 365nm: leather absorbs completely, appears void-black under blacklight creating stark contrast with UV-fluorescent mesh above. Sitting creases: leather holds compression wrinkles catching edge light. Body-mapped tight. Ultra-high waist. Ultra-short hemline. Edge-lit rim: leather edge bright line from side sources. Bass 40Hz: leather too stiff to flutter, holds rigid shape.`,
    hosiery: 'HOSIERY [N66 15d T=0.76 warp-knit, compression gradient]: Black seamless. UV 365nm: nylon brightener fluoresces faint blue-white on shins. Leather skirt hem-to-stocking: matte-to-sheer material transition. LED colored catches. Bass vibration subtle at ankle.',
  },

  // === CONCEPT 39: CRYSTAL HALTER + SATIN WRAP MINI (PENTHOUSE) ===
  {
    name: '39-crystal-halter-satin-wrap-penthouse',
    sceneType: 'penthouse',
    attire: 'She wears a two-piece: plunging crystal-encrusted halter bralette with deep V between cups entirely covered in Swarovski crystals, and a champagne gold satin bias-cut wrap micro mini skirt. Halter ties behind neck leaving entire back bare. Wide bare midriff. Satin skirt draped bias-cut with high slit. Ultra-short.',
    scene: 'Ultimate penthouse: floor-ceiling glass three walls corner panoramic Strip south warm golden, fireplace linear gas flame animate, designer pendant 2800K focused, white marble bar, Baccarat crystal champagne flutes refracting light, city carpet below, stars desert sky clear, cocktail hour golden.',
    topFabric: `CRYSTAL HALTER BRALETTE: Swarovski crystal 4mm point-back hot-fix dense coverage on black mesh substrate. Each crystal: faceted n=1.54 creating prismatic dispersion→rainbow caustic projection onto nearby skin from each crystal. Deep V plunge: crystals follow V-edge creating bright border highlighting negative space. Fireplace 1600K: warm amber enters each crystal, exits as dispersed warm rainbow micro-caustics. City panoramic: thousands of city point-lights each creating individual refraction in crystals nearest that angle. Designer pendant: single bright source creates maximum caustic burst. Neck tie: two crystal-encrusted straps converging at nape. Total crystal count ~800 creating 800 independent light engines.`,
    bottomFabric: `SATIN WRAP MINI SKIRT: Champagne gold 22-momme silk charmeuse bias-cut. Satin weave: float threads create anisotropic specular — bright highlight perpendicular to weave, dark parallel. Bias cut: fabric drapes on 45° creating diagonal highlight bands following body curves. Champagne gold λ_peak=580nm warm matching city glow. Wrap construction: overlap creates double-layer zone thicker/more opaque vs single-layer slightly translucent at light angles. High slit: reveals leg line, single-layer edge. Fireplace: animate warm creates shifting highlights across satin. Glass reflection: satin appears in floor-ceiling glass as warm golden ghost.`,
    hosiery: 'HOSIERY [N66 10d T=0.87 ultra-sheer, compression gradient]: Nude with gold shimmer thread welt. Crystal caustics from bralette project tiny rainbows onto stocking tops. Satin gold reflects warm onto sheer surface. City panoramic through glass catches. Fireplace warm shin glow.',
  },

  // === CONCEPT 40: METALLIC TUBE TOP + CARGO MICRO SKIRT (LOUNGE) ===
  {
    name: '40-metallic-tube-cargo-micro-lounge',
    sceneType: 'lounge',
    attire: 'She wears a two-piece: silver metallic stretch tube top strapless and a black cargo micro mini skirt with oversized utility pockets and chrome hardware. Tube top chrome-bright reflecting entire venue. Bare midriff. Cargo skirt utilitarian contrast with chrome buckles zippers D-rings catching light. Ultra-short hemline.',
    scene: 'VIP lounge: LED color-wash panels cycling purple-to-blue, champagne sparkler approaching, floor-ceiling mirror panels recursive, fog low floor, chrome tables reflecting everything, DJ bass 40Hz through floor, crystal flutes, purple underglow 405nm.',
    topFabric: `METALLIC TUBE TOP: Stretch lamé silver R=0.75 high-specular mirror-like. Strapless body-tension held. LED color-wash: tube top reflects cycling colors creating full-spectrum color shift across surface in real-time. Mirror panels: recursive reflection of tube top in mirrors creating infinite silver regression. Sparkler: broadband white reveals maximum mirror brightness simultaneously. Chrome-to-chrome: tube top reflects chrome tables which reflect tube top creating inter-reflection loop. Fog: scattered light creates soft silver glow halo. Compression wrinkles: horizontal gathered folds each catching different light angle. Purple 405nm underglow: silver reflects purple as cool violet band at lower edge.`,
    bottomFabric: `CARGO MICRO SKIRT: Black cotton-canvas matte 200gsm. Oversized flap pockets: geometric shadow boxes on hip surfaces. Chrome hardware: D-rings 25mm R=0.82 specular, zipper teeth 4mm sequential specular dots, buckle prong catching point-light as individual starburst. Hardware-to-LED: each chrome piece reflects cycling color independently based on angle. Matte black absorbs most light creating void background for chrome punctuation. Pocket flap edges: crisp geometric shadow lines. Ultra-short hemline. Belt loops: chrome-tipped catching rim light. Bass 40Hz: pocket flaps flutter slightly, chrome hardware vibrates creating micro-jitter in reflections.`,
    hosiery: 'HOSIERY [N66 15d T=0.76 warp-knit, compression gradient]: Black seamless. Chrome hardware on skirt reflects as bright dots at stocking tops. LED color catches cycling on nylon. Fog around ankles. Mirror panels double everything. Purple underglow violet shins.',
  },

  // === CONCEPT 41: LACE BRALETTE + SEQUIN MINI SKIRT (CASINO) ===
  {
    name: '41-lace-bralette-sequin-mini-casino',
    sceneType: 'casino',
    attire: 'She wears a two-piece: black French lace bralette with scalloped edges and thin straps showing intricate floral lace pattern, and a gold sequin ultra-high-waist micro mini skirt. Lace semi-transparent revealing skin through pattern. Bare midriff. Sequin skirt blazing gold under chandelier. Ultra-short.',
    scene: 'High-roller casino floor: crystal chandelier 2800K overhead warm, green baize tables felt reflection, mahogany warm wood, brass rail polished, cigar smoke thin wisps, neon colored signs, marble floor polished, chip stacks colorful, cocktail on mahogany bar.',
    topFabric: `LACE BRALETTE: Chantilly lace floral motif on hexagonal tulle ground. Floral cord: opaque black thread creating pattern visible as dark tracery. Tulle ground: semi-transparent T=0.65 skin visible through hexagonal mesh between floral elements. Scalloped edge: curved floral border creating organic hem line at cups and band. Chandelier 2800K: warm light passes through tulle illuminating skin beneath as warm glow between dark lace pattern. Cigar smoke: wisps caught in lace texture creating micro-haze layer. Thin straps: 5mm catching collarbone chandelier highlight. Structure: underwire beneath lace creating smooth cup shape, wire edge visible through thin lace at certain angles.`,
    bottomFabric: `SEQUIN MINI SKIRT: Flat-disc 5mm gold sequins R=0.85 overlapping on mesh substrate. Each sequin: circular mirror reflecting chandelier as individual warm point. Ultra-high waist: sequin field starts at narrowest point. Chandelier: dominant warm source reflected as bright constellation across entire skirt — each sequin at different body-curve angle reflects chandelier from different position. Green baize: sequins near hem pick up green felt reflection from below. Neon: colored neon creates individual colored sequin reflections scattered through gold. Cigar smoke: haze softens sequin reflections into warm diffuse glow. Movement: sequin tilt-shift creates shimmering wave pattern. Mahogany warm bounce fills shadow between sequin rows.`,
    hosiery: 'HOSIERY [N66 15d T=0.76 warp-knit, compression gradient]: Black with gold thread welt. Chandelier warm catches shin. Sequin skirt hem reflects warm constellation onto stocking tops. Green baize tint faint. Cigar smoke wisps around calves. Marble floor reflection.',
  },

  // === CONCEPT 42: CROPPED BLAZER + VINYL HOT PANTS (SPEAKEASY) ===
  {
    name: '42-cropped-blazer-vinyl-hotpants-speakeasy',
    sceneType: 'speakeasy',
    attire: 'She wears a two-piece: cropped black tuxedo blazer open over bare skin — no shirt beneath, deep V lapels revealing sternum and inner curves. Paired with ultra-high-waist deep red PVC vinyl hot pants. Blazer cropped just below bust. Maximum bare midriff. Hot pants ultra-short vinyl catching every candle flicker.',
    scene: 'Upscale speakeasy: candle clusters 1800K amber glass flickering animate, ornate brass bar fixtures, exposed brick arches, leather tufted booth deep burgundy, cocktail coupe with wine tears, absinthe drip, jazz stage warm spot, smoke machine thin artistic wisps, vintage mirror ornate frame.',
    topFabric: `CROPPED BLAZER: Wool-blend suiting 280gsm matte black structured. Tuxedo satin lapels: narrow satin stripe n=1.54 catching candle as bright warm highlight line tracing V-opening. Cropped hem: blazer ends just below bust creating extremely short coverage. Open front: no buttons, lapels fall naturally creating deep V revealing bare sternum. Shoulder structure: padded creating sharp silhouette line. Single button at bust: brass catching candle as warm point. Satin lining visible at open edge: burgundy flash catching side light. Lapel satin vs wool matte: dual BRDF creating specular vs diffuse contrast on same garment. Candle flicker: animate warm shifting highlight on satin lapels.`,
    bottomFabric: `VINYL HOT PANTS: Deep red PVC R_specular=0.12 glossy n=1.54. Body-mapped zero-ease. Deep red λ_peak=660nm absorbing blue-green. Candle 1800K: red vinyl appears rich warm deep-crimson, specular highlights amber-warm. Fresnel: near-normal darker red, grazing angles mirror-bright creating bright rim at hip curve and hem. Vintage mirror: vinyl reflected as deep red shape with warm highlight streaks. Ultra-high waist. Ultra-short. Smoke wisps: vinyl reflects scattered smoke-light as soft warm glow. Sitting creases: vinyl compression wrinkles at hip creating bright caustic lines. Leather booth: red vinyl against burgundy leather subtle warm contrast.`,
    hosiery: 'HOSIERY [N66 15d T=0.76 warp-knit, compression gradient]: Black seamless. Candle warm catches shin. Vinyl hotpant hem: mirror-bright edge at stocking top transition. Smoke wisps around calves. Brick warm bounce. Vintage mirror doubles legs.',
  },

  // === CONCEPT 43: RHINESTONE BRALETTE + FEATHER MINI SKIRT (LOUNGE) ===
  {
    name: '43-rhinestone-bralette-feather-mini-lounge',
    sceneType: 'lounge',
    attire: 'She wears a two-piece: rhinestone-chain bralette made entirely of connected rhinestone strands with no fabric — just chains of crystals crossing chest, and a black ostrich feather micro mini skirt. Rhinestone chains drape and swing with movement. Feather skirt ultra-voluminous short. Bare midriff between crystal chains and feather volume.',
    scene: 'VIP bottle service lounge: LED color-wash slow cycling, champagne magnum sparkler approaching bright, mirror panels floor-ceiling recursive, fog low floor, chrome tables, DJ bass through floor, crystal flutes everywhere, purple underglow 405nm, velvet rope.',
    topFabric: `RHINESTONE CHAIN BRALETTE: No fabric — structure entirely from rhinestone chains 4mm crystals linked by fine wire. 8 chains per cup: each chain a strand of faceted crystals creating linear prismatic element. Each crystal n=1.54: incident light→dispersed rainbow micro-caustic projected forward. LED cycling: crystals scatter cycling colors creating constantly shifting prismatic display. Sparkler broadband: maximum prismatic burst, all crystals fire simultaneously. Chains drape: gravity creates catenary curves, movement makes chains swing independently creating phase-shifted shimmer. Mirror panels: rhinestones reflected recursively creating infinite crystalline regression. Gaps between chains: bare skin visible between crystal strands. Purple 405nm: crystals fluoresce faint blue undertone.`,
    bottomFabric: `FEATHER MINI SKIRT: Ostrich plume 15-20cm barbs layered 3-deep on mesh waistband. Feather BRDF: barb micro-structure creates angle-dependent iridescence — slight green-blue sheen shifting with viewing angle. Each barb: fine filament 0.1mm catching LED color individually. Volume: feathers project 8cm from body creating voluminous silhouette that moves 0.5s after body (momentum delay). Bass 40Hz: feathers oscillate visibly creating wave ripple through plume layers. LED color-wash: each feather layer catches different color at different depth creating color-gradient through volume. Fog: trapped in feather volume creating internal volumetric glow. Ultra-short: feather tips at upper thigh. Sparkler: feather tips brighten individually catching broadband.`,
    hosiery: 'HOSIERY [N66 10d T=0.87 ultra-sheer, compression gradient]: Nude shimmer. Feather skirt hem: individual ostrich barbs brush stocking tops. LED color catches cycling. Rhinestone caustic dots scatter past midriff onto thighs. Fog around ankles. Mirror doubles.',
  },

  // === CONCEPT 44: SATIN CORSET CROP + CHAIN MINI SKIRT (CASINO) ===
  {
    name: '44-satin-corset-chain-mini-casino',
    sceneType: 'casino',
    attire: 'She wears a two-piece: midnight blue satin overbust corset crop top with visible boning channels and front hook-eye closure, and a silver chain-link micro mini skirt where each link is a polished steel ring. Corset extreme cinch. Bare midriff below corset to chain skirt. Chain skirt liquid-metal drape.',
    scene: 'High-roller casino: crystal chandelier massive 2800K, green baize blackjack tables, mahogany paneling warm, brass rail polished gleaming, marble floor checkerboard, chip stacks towers, cigar lounge adjacent smoke wisps drifting, neon casino signs colored, cocktail on felt.',
    topFabric: `SATIN CORSET CROP: Midnight blue duchesse satin 22-momme. Overbust structure: 14 boning channels visible as vertical ridge lines catching chandelier as parallel bright stripes. Steel boning beneath satin: rigid structure creating smooth conical silhouette. Front hook-eye: 12 pairs polished steel catching light as vertical dot-dash pattern. Satin anisotropic BRDF: bright perpendicular to weave, dark parallel — boning ridges create alternating bright/dark vertical stripes as surface angle changes across body curve. Extreme cinch: waist compressed creating dramatic hourglass. Midnight blue λ_peak=460nm: chandelier 2800K warm shifts blue→deep teal-navy appearing richer than daylight. Cigar smoke: satin catches scattered warm haze as soft overlay.`,
    bottomFabric: `CHAIN-LINK MINI SKIRT: Polished steel links 6mm interlocking rings R=0.78 specular. Each ring: tiny toroidal mirror. Chandelier overhead: hundreds of warm point-reflections distributed across chain surface creating warm constellation. Chain drape: follows gravity creating catenary curves from hip bones, heavier than chainmail (~1.2kg). Link-to-link: each ring rotates independently with movement creating phase-shifted reflection shimmer. Green baize: chains near hem reflect green felt from below. Neon: individual colored reflections scattered through chain field. Marble floor: chains reflected in polished marble creating doubled chain pattern below. Sound: metallic whisper with movement.`,
    hosiery: 'HOSIERY [N66 15d T=0.76 warp-knit, compression gradient]: Black with silver thread welt matching chain skirt. Chandelier warm shin. Chain skirt rings cast tiny circular shadow patterns onto stocking tops. Green baize faint tint. Marble floor reflects stockings. Cigar smoke wisps.',
  },

  // === CONCEPT 45: THERMOCHROMIC CROP + MECHANOLUMINESCENT MINI (PENTHOUSE) ===
  {
    name: '45-thermochromic-crop-mechanoluminescent-mini-penthouse',
    sceneType: 'penthouse',
    attire: 'She wears a two-piece with exotic physics: cholesteric thermochromic sleeveless crop top mapping body heat as blue-to-gold color gradient, and a mechanoluminescent ZnS:Cu micro mini skirt that glows green at stress zones. Crop top shows warm gold at body contact, cool blue at loose edges. Skirt glows faint green where tension is highest. Bare midriff between heat-map top and stress-reactive skirt.',
    scene: 'Ultimate penthouse: floor-ceiling glass panoramic Strip south warm golden, mountains dark west, fireplace 1600K linear gas animate, designer pendant 2800K focused, Baccarat crystal champagne coupe, white marble bar, city carpet below, stars desert sky, cocktail hour warm light.',
    topFabric: `THERMOCHROMIC CROP TOP: Cholesteric liquid crystal ink throughout fabric. Sleeveless crew-neck cropped above navel. Pitch p(T) temperature-dependent Bragg reflection. Skin contact 33°C→580nm warm gold. Moderate 29°C→550nm green. Loose 24°C→480nm cool blue. 9°C ΔT creates full blue→green→gold body-heat color map. Crop top heat map: bust contact warm gold, side seams cooler green, armholes and hem blue where fabric separates from skin. Breathing shifts contact: inhale loosens→blue shift, exhale tightens→gold shift. Fireplace 1600K warm: biases all colors warmer. City panoramic: cool blue window light on back side shifts rear cooler. Pendant 2800K: reveals maximum color range.`,
    bottomFabric: `MECHANOLUMINESCENT MINI SKIRT: Polyester-elastane 4-way stretch with ZnS:Cu phosphor 0.5wt%. At rest: jet black R=0.03. Stress σ_xx→crystal defect emission 520nm green via dislocation motion. Sitting stress map: hip curve σ=60MPa→95cd/m² green threshold. Waist band σ=85MPa→180cd/m² bright green ring. Hem tension: pulled taut over thighs creates glow band at hem edge. I∝σ² quadratic. Decay τ=180ms creates motion trails — stand up and stress-map shifts creating green light animation. Fireplace warm catches non-glowing black areas. City panoramic: green glow reflects in glass creating doubled green points. Both physics simultaneously: gold heat-map above, green stress-map below.`,
    hosiery: 'HOSIERY [N66 15d T=0.76 warp-knit, compression gradient]: Black. Mechanoluminescent green from skirt reflects on stocking tops. Fireplace warm shin. City panoramic through glass catches. Green stress-glow creates colored accent at hem-to-stocking transition.',
  },
];

// === MAIN EXECUTION (uses shared generation engine) ===
const engine = await createGenerationEngine({
  outputDir: OUTPUT_DIR,
  inputImage: INPUT_IMAGE,
  expressionOffset: 35,
  banner: 'V13 TWO-PIECE - 4:5 1K - DARING TWO-PIECE ATTIRE',
});

await engine.runBatch(concepts, buildPrompt);

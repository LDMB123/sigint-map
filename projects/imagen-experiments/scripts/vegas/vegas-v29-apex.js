#!/usr/bin/env node

/**
 * V29 APEX - Two-pass, multi-turn refinement for max photorealism
 *
 * Pass A: scene + camera + light transport + skin physics + core attire
 * Pass B: garment microstructure + swimwear physics + imperfections, preserving pass A
 *
 * Model: gemini-3-pro-image-preview
 * Output: 1K, 4:5 (physics-max, ~1450 words)
 * Word target per pass: 1400-1500
 */

import { GoogleAuth } from 'google-auth-library';
import fs from 'fs/promises';
import path from 'path';

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || 'gen-lang-client-0925343693';
const LOCATION = 'global';
const MODEL = 'gemini-3-pro-image-preview';
const ENDPOINT = `https://aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL}:generateContent`;
const OUTPUT_DIR = process.env.OUTPUT_DIR || path.join(process.env.HOME, 'nanobanana-output', 'pool-luxe-lace-v1');
const PASSA_DIR = path.join(OUTPUT_DIR, 'passA');
const INPUT_IMAGE = process.argv[2] || '/Users/louisherman/Documents/IMG_4385.jpeg';

const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
await fs.mkdir(OUTPUT_DIR, { recursive: true });
await fs.mkdir(PASSA_DIR, { recursive: true });

const expressions = [
  'smoldering gaze, half-lidded eyes, subtle lip part, slow exhale',
  'sultry half-smile, chin slightly lowered, eyes up through lashes',
  'quiet magnetism, soft eyelids, relaxed jaw, steady gaze',
  'intimate composure, lips gently parted, lingering eye contact',
  'mysterious allure, micro-smile, eyes glinting, unhurried',
  'bold seduction, direct gaze, subtle smile, poised stillness',
  'warm tease, small smile with low eyelids, gentle head tilt',
  'knowing smirk, eyes sparkling, chin slightly down',
  'fierce allure, jaw relaxed, eyes locked, confident presence',
  'relaxed elegance, soft gaze, effortless poise',
  'coy glance through lowered lashes, chin dipped, eyes up',
  'radiant charm, soft smile, luminous eyes',
  'cool detachment with a sultry edge, composed and still',
  'intimate warmth, subtle smile, steady eye contact',
  'defiant edge, slight nostril flare, controlled breath',
  'dreamy softness, half-lidded eyes, calm gaze',
  'sharp wit, compressed smile, eyes teasing',
  'regal allure, elongated neck, inviting gaze',
  'candid heat, mid-laugh softening into a smolder',
  'magnetic pull, unblinking gaze, quiet intensity',
];

const ROTATION_SEQUENCE = [
  'yaw -15° (right shoulder forward), subtle hip counter-rotation, chin to camera',
  'yaw -35° three-quarter left, torso rotated, face to camera',
  'yaw -85° near-profile left, face turned slightly to camera',
  'yaw +35° three-quarter right, torso rotated, face to camera',
  'yaw +85° near-profile right, face turned slightly to camera',
  'yaw +150° back three-quarter left, shoulder blade visible, head turned to camera',
  'yaw +210° back three-quarter right, head turned to camera',
  'yaw 0° front-facing, micro-tilt',
];

const THEME_BEATS = [
  { name: 'Nocturne Lattice', note: 'angular geometry, nocturnal luxury, electric edges' },
  { name: 'Neon Mirage', note: 'liquid highlights, neon spill, glassy reflections' },
  { name: 'Velvet Voltage', note: 'soft depth, sculpted shadow, plush glow' },
  { name: 'Chrome Ember', note: 'warm metallic glints, ember accents, firelight contrast' },
  { name: 'Glass Orchid', note: 'delicate translucency, botanical lines, crystalline accents' },
  { name: 'Obsidian Pulse', note: 'dark mass, pulsing edge light, graphite sheen' },
  { name: 'Starlight Noir', note: 'fine sparkle noise, tiny caustics, deep night palette' },
  { name: 'Ion Silk', note: 'smooth specular flow, cool gradients, high polish' },
];

const VIBE_BEATS = [
  { name: 'Ultra‑sexy poolside', note: 'low‑breath tension, daring cuts, couture heat' },
  { name: 'Glossed‑couture', note: 'liquid sheen, sculpted curves, high polish' },
  { name: 'Dark‑glam edge', note: 'obsidian mass, sharp highlights, seductive control' },
  { name: 'Neon‑charged', note: 'vibrant spill, electric accents, high contrast' },
  { name: 'Velvet‑smoke', note: 'soft depth, plush drape, warm glow' },
];

const COLORWAYS = [
  { name: 'midnight sapphire + mercury', primary: 'midnight sapphire', accent: 'liquid mercury', highlight: 'ice blue', spectral: 'PRIMARY peak ~460nm, low reflectance <10% in red; ACCENT broadband metallic; HIGHLIGHT ~500–520nm shoulder.' },
  { name: 'garnet noir + ember', primary: 'garnet noir', accent: 'ember copper', highlight: 'warm gold', spectral: 'PRIMARY peak ~620–650nm with suppressed blue; ACCENT metallic with warm 580–620nm bias; HIGHLIGHT ~560–590nm.' },
  { name: 'ion teal + graphite', primary: 'ion teal', accent: 'graphite', highlight: 'cool silver', spectral: 'PRIMARY peak ~500–520nm; ACCENT low reflectance neutral; HIGHLIGHT broadband metallic with cool bias.' },
  { name: 'obsidian + ice', primary: 'obsidian black', accent: 'ice blue', highlight: 'frosted chrome', spectral: 'PRIMARY reflectance <5% across spectrum; ACCENT peak ~480–500nm; HIGHLIGHT broadband metallic with soft blue tint.' },
  { name: 'amethyst smoke + rose gold', primary: 'amethyst smoke', accent: 'rose gold', highlight: 'soft champagne', spectral: 'PRIMARY peak ~410–430nm with muted green; ACCENT metallic with warm 570–600nm; HIGHLIGHT ~560nm soft.' },
  { name: 'copper oxide + charcoal', primary: 'copper oxide', accent: 'charcoal', highlight: 'brass glow', spectral: 'PRIMARY peak ~590–620nm with green dip; ACCENT low reflectance neutral; HIGHLIGHT ~560–590nm.' },
  { name: 'liquid bronze + onyx', primary: 'liquid bronze', accent: 'onyx', highlight: 'amber spark', spectral: 'PRIMARY metallic warm 560–610nm; ACCENT low reflectance; HIGHLIGHT ~580nm narrow sparkle.' },
  { name: 'pearl gunmetal + violet', primary: 'pearl gunmetal', accent: 'violet ink', highlight: 'cool pearl', spectral: 'PRIMARY neutral with slight blue lift; ACCENT peak ~400–420nm; HIGHLIGHT broadband with cool bias.' },
  { name: 'crimson lacquer + black chrome', primary: 'crimson lacquer', accent: 'black chrome', highlight: 'blood orange', spectral: 'PRIMARY peak ~640–680nm; ACCENT metallic neutral; HIGHLIGHT ~600–620nm.' },
  { name: 'electric cerulean + ink', primary: 'electric cerulean', accent: 'ink navy', highlight: 'cyan spark', spectral: 'PRIMARY peak ~470–490nm; ACCENT low reflectance in red; HIGHLIGHT ~500nm.' },
  { name: 'champagne quartz + onyx', primary: 'champagne quartz', accent: 'onyx', highlight: 'soft ivory', spectral: 'PRIMARY broad ~540–580nm; ACCENT low reflectance; HIGHLIGHT ~560nm soft.' },
  { name: 'emerald dusk + brass', primary: 'emerald dusk', accent: 'antique brass', highlight: 'forest glow', spectral: 'PRIMARY peak ~520–540nm; ACCENT metallic warm 560–600nm; HIGHLIGHT ~540–560nm.' },
  { name: 'ultraviolet ink + platinum', primary: 'ultraviolet ink', accent: 'platinum', highlight: 'cool pearl', spectral: 'PRIMARY peak ~400–420nm; ACCENT broadband metallic; HIGHLIGHT ~520nm.' },
  { name: 'ruby heat + graphite', primary: 'ruby heat', accent: 'graphite', highlight: 'warm copper', spectral: 'PRIMARY peak ~640nm; ACCENT low reflectance; HIGHLIGHT ~580–600nm.' },
  { name: 'aqua neon + obsidian', primary: 'aqua neon', accent: 'obsidian', highlight: 'ice mint', spectral: 'PRIMARY peak ~490–510nm; ACCENT <5% reflectance; HIGHLIGHT ~510–520nm.' },
  { name: 'rose smoke + black chrome', primary: 'rose smoke', accent: 'black chrome', highlight: 'soft champagne', spectral: 'PRIMARY peak ~560–580nm; ACCENT metallic neutral; HIGHLIGHT ~560nm.' },
  { name: 'golden haze + onyx', primary: 'golden haze', accent: 'onyx', highlight: 'amber spark', spectral: 'PRIMARY ~560–590nm; ACCENT low reflectance; HIGHLIGHT ~580nm.' },
  { name: 'cobalt shock + graphite', primary: 'cobalt shock', accent: 'graphite', highlight: 'cool silver', spectral: 'PRIMARY peak ~460nm; ACCENT low reflectance; HIGHLIGHT broadband.' },
  { name: 'scarlet neon + gunmetal', primary: 'scarlet neon', accent: 'gunmetal', highlight: 'blood orange', spectral: 'PRIMARY peak ~650–670nm; ACCENT neutral metallic; HIGHLIGHT ~600nm.' },
  { name: 'jade night + brass', primary: 'jade night', accent: 'brass', highlight: 'green glow', spectral: 'PRIMARY peak ~520–540nm; ACCENT warm metallic; HIGHLIGHT ~540–560nm.' },
  { name: 'smoke quartz + chrome', primary: 'smoke quartz', accent: 'chrome', highlight: 'cool pearl', spectral: 'PRIMARY ~520–560nm muted; ACCENT metallic broadband; HIGHLIGHT ~520nm.' },
  { name: 'ember rose + obsidian', primary: 'ember rose', accent: 'obsidian', highlight: 'warm gold', spectral: 'PRIMARY ~600–620nm; ACCENT low reflectance; HIGHLIGHT ~570–590nm.' },
  { name: 'neon lime + graphite', primary: 'neon lime', accent: 'graphite', highlight: 'acid green', spectral: 'PRIMARY peak ~550–565nm; ACCENT low reflectance; HIGHLIGHT ~560–570nm.' },
  { name: 'icy lilac + black chrome', primary: 'icy lilac', accent: 'black chrome', highlight: 'cool silver', spectral: 'PRIMARY peak ~420–440nm; ACCENT neutral metallic; HIGHLIGHT broadband.' },
];

const SILHOUETTES = [
  'lace one-piece: dagger plunge to navel + tensioned mesh cradle + high-cut hips',
  'lace one-piece: keyhole plunge with split-cup illusion + lattice side cutouts',
  'lace one-piece: asymmetric one-shoulder strap + diagonal plunge + open back',
  'lace one-piece: cowl-drape plunge + sculpted underbust seam + high-cut hips',
  'lace one-piece: deep V-plunge + ring-anchored side cutouts + T-strap back',
  'lace one-piece: spiral seam mapping around plunge + open back to waist',
  'lace one-piece: arc cutouts + scalloped neckline edge + high-cut hips',
  'lace one-piece: veil panel over plunge + open back + razor-thin bridges',
  'lace one-piece: cathedral-arch lace paneling + narrow center gore + high-cut hips',
  'lace one-piece: chevron-lace bodice + corset-laced spine + open back',
  'lace one-piece: petal-applique plunge + negative-space windows + high-cut hips',
  'lace one-piece: double-strap halo + plunge to navel + open back to waist',
];

const DESIGN_TWISTS = [
  'corset-laced spine with micro-grommets under high tension',
  'scalloped eyelash-lace neckline with bonded edge thickness',
  'interlocked ring anchors at side seams with visible tension gradients',
  'offset ruched spine with measured tension bands and micro-folds',
  'diagonal seam tessellation across the bodice with bias-tension mapping',
  'micro-pleated edge fins that flicker in warm highlights',
  'folded petal panels overlapping with soft shadow pockets',
  'double-cowl overlay with tight inner tension line and secure underbust seam',
  'split-strap harness that converges at the center gore',
  'vertical rib channels that sculpt the plunge with stiffened lace ribs',
];

const SURFACE_TREATMENTS = [
  'satin-backed lace overlay with sheer illusion mesh',
  'matte crepe base with lace filaments at grazing angles',
  'hydrophobic wet-look finish on lace with micro-bead sparkle',
  'thin-film foil accents on lace edges for angle-dependent hue shifts',
  'sheer lace veil panel with soft diffusion and high-frequency thread sparkle',
  'micro-bead scatter embedded in lace motifs with caustic pinpoints',
  'glass-bead clusters stitched into lace patterns with anisotropic glints',
  'polished nylon base beneath lace overlay for crisp specular bands',
  'metallic filament lace with anisotropic sheen aligned to weave',
  'tonal ombre dye on lace filaments with stable metamerism',
];

const LACE_MOTIFS = [
  'corded guipure floral scrollwork with raised edges',
  'art-deco fan lattice with scalloped eyelash fringe',
  'hexagonal honeycomb lace with micro-beaded nodes',
  'cathedral-arch motif with vertical ribs and open vaults',
  'iris-petal lace applique over sheer tulle',
  'baroque arabesque lace with dense center and open perimeter',
  'geometric chevron lace with alternating open/closed cells',
  'micro-dot tulle with lace filigree overlays',
  'gothic rose-window lace with radial ribs',
  'wave-loop lace with repeating crescent apertures',
];

const HARDWARE_ACCENTS = [
  'brushed brass ringlets',
  'black chrome micro-clasps',
  'titanium micro-buckles',
  'onyx chain links',
  'crystal ring connectors',
  'micro-grommet lace-up eyelets',
  'graphite zipper teeth',
];

const EVENT_MOTIFS = [
  { name: 'Projection Facets', physics: 'triangular seam tessellation with alternating specular roughness; edge normals flip to mimic projected light breaks' },
  { name: 'Holo-Gauze', physics: 'ultra-thin organza overlay with phase-shift shimmer; interference bands align to warp direction' },
  { name: 'Wristband Ripple', physics: 'radial strap array with tension gradients that read like concentric ripples' },
  { name: 'Stage Halo', physics: 'circular harness geometry with even curvature and uniform strap tension' },
  { name: 'CO2 Plume', physics: 'vertical pleat channels that expand and collapse with airflow micro-lift' },
  { name: 'Laser Grid', physics: 'fine lattice cutouts with 90-degree intersections and clean bevel edges' },
  { name: 'Confetti Cascade', physics: 'micro-bead scatter zones with tiny caustic specks and randomized spark distribution' },
  { name: 'Firelight Pulse', physics: 'gradient roughness zones that intensify highlight flicker under warm light' },
];

function rand(min, max, step = 1) {
  const n = Math.floor((max - min) / step);
  return min + Math.floor(Math.random() * (n + 1)) * step;
}

function buildMeasurements() {
  return {
    strapWidthMm: rand(3, 8, 1),
    cutoutMajorMm: rand(240, 340, 5),
    cutoutMinorMm: rand(130, 210, 5),
    plungeDepthMm: rand(280, 350, 5),
    navelOffsetMm: rand(0, 2, 1),
    necklineAngleDeg: rand(78, 90, 2),
    cutoutRiseMm: rand(190, 245, 5),
    bridgeSpanMm: rand(22, 45, 1),
    negSpacePercent: rand(45, 60, 1),
    seamPitchMm: rand(8, 18, 2),
    stitchLengthMm: rand(2, 4, 0.5),
    panelBiasDeg: rand(20, 55, 3),
    boningWidthMm: rand(4, 9, 1),
    claspWidthMm: rand(6, 12, 1),
  };
}

const usedVariations = new Set();
const usedColorways = new Set();
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildVariation() {
  for (let i = 0; i < 40; i++) {
    const theme = pick(THEME_BEATS);
    const availableColors = COLORWAYS.filter(c => !usedColorways.has(c.name));
    const colorway = (availableColors.length > 0 ? pick(availableColors) : pick(COLORWAYS));
    const vibe = pick(VIBE_BEATS);
    const silhouette = pick(SILHOUETTES);
    const twist = pick(DESIGN_TWISTS);
    const surface = pick(SURFACE_TREATMENTS);
    const laceMotif = pick(LACE_MOTIFS);
    const hardware = pick(HARDWARE_ACCENTS);
    const motif = pick(EVENT_MOTIFS);
    const measurements = buildMeasurements();
    const key = `${theme.name}|${vibe.name}|${colorway.name}|${silhouette}|${twist}|${surface}|${laceMotif}|${hardware}|${motif.name}|${measurements.strapWidthMm}`;
    if (!usedVariations.has(key)) {
      usedVariations.add(key);
      usedColorways.add(colorway.name);
      return {
        theme,
        vibe,
        colorway,
        silhouette,
        twist,
        surface,
        laceMotif,
        hardware,
        motif,
        measurements,
        desc: `Theme: ${theme.name} (${theme.note}). Vibe: ${vibe.name} (${vibe.note}). Colorway: ${colorway.name} — primary ${colorway.primary}, accent ${colorway.accent}, highlight ${colorway.highlight}. Silhouette: ${silhouette}. Design twist: ${twist}. Lace motif: ${laceMotif}. Surface: ${surface}. Hardware: ${hardware}. Event motif: ${motif.name}.`,
      };
    }
  }
  const theme = pick(THEME_BEATS);
  const vibe = pick(VIBE_BEATS);
  const colorway = pick(COLORWAYS);
  const motif = pick(EVENT_MOTIFS);
  const laceMotif = pick(LACE_MOTIFS);
  return {
    theme,
    vibe,
    colorway,
    silhouette: pick(SILHOUETTES),
    twist: pick(DESIGN_TWISTS),
    surface: pick(SURFACE_TREATMENTS),
    laceMotif,
    hardware: pick(HARDWARE_ACCENTS),
    motif,
    measurements: buildMeasurements(),
    desc: `Theme: ${theme.name}. Vibe: ${vibe.name}. Colorway: ${colorway.name}. Silhouette: ${pick(SILHOUETTES)}. Design twist: ${pick(DESIGN_TWISTS)}. Lace motif: ${laceMotif}. Event motif: ${motif.name}.`,
  };
}

function composeDesignSpec(concept, variation, fallback = false) {
  const materialBase = fallback ? concept.materialFallback : concept.material;
  const microBase = fallback ? concept.microFallback : concept.micro;
  const color = `COLORWAY: ${variation.colorway.name} — primary ${variation.colorway.primary}, accent ${variation.colorway.accent}, highlight ${variation.colorway.highlight}. SPECTRAL: ${variation.colorway.spectral}`;
  const brief = `GARMENT DESIGN BRIEF: ${variation.theme.name} (${variation.theme.note}); VIBE: ${variation.vibe.name} (${variation.vibe.note}); ${variation.silhouette}; ${variation.twist}; lace motif: ${variation.laceMotif}; ${variation.surface}; ${variation.hardware}; event motif: ${variation.motif.name}.`;
  const material = `${materialBase} + ${variation.surface}; lace motif: ${variation.laceMotif}; hardware accents in ${variation.hardware}; adhere to ${variation.colorway.name} palette.`;
  const micro = `${microBase} | ${variation.surface} microphysics; lace microstructure: ${variation.laceMotif}; hardware glints: ${variation.hardware}; motif physics: ${variation.motif.physics}.`;
  const m = variation.measurements;
  const physics = `PHYSICS-ONLY GARMENT SPEC: panel thickness 0.3–0.6mm with lining 0.2–0.4mm; strap width ${m.strapWidthMm}mm; cutout ellipse major ${m.cutoutMajorMm}mm × minor ${m.cutoutMinorMm}mm; cutout rise ${m.cutoutRiseMm}mm toward iliac crest; neckline plunge depth ${m.plungeDepthMm}mm with apex ${m.navelOffsetMm}mm above the navel; neckline angle ${m.necklineAngleDeg}°; bridge span ${m.bridgeSpanMm}mm between cutout edges; negative-space ratio ${m.negSpacePercent}% of front panel; sheer illusion mesh thickness 0.2–0.4mm; seam pitch ${m.seamPitchMm}mm with stitch length ${m.stitchLengthMm}mm; panel bias angle ${m.panelBiasDeg}°; boning width ${m.boningWidthMm}mm; clasp width ${m.claspWidthMm}mm; reinforcement tape follows cutout edges with 1–2mm shadow offset; lace motif geometry: ${variation.laceMotif}; tension gradient strongest at strap anchors and relaxes toward hem. Motif physics: ${variation.motif.physics}.`;
  return { color, brief, material, micro, physics };
}

const CAMERA_BLOCK = `CAMERA SENSOR PHYSICS: Canon EOS R5 II full-frame 45MP BSI-CMOS, RF 50mm f/1.2 at f/1.2; focus at 2.2m, 14cm depth-of-field. ISO 3200 with visible luminance grain and chroma noise in shadows; shutter 1/125s with slight motion blur on fingertips. Dual-pixel AF locked on nearest iris; creamy bokeh discs with mild onion-ring. 0.7 stop corner vignetting, 0.3px purple fringing at high-contrast edges. No flash, available light only; crushed blacks below noise floor.`;

const LIGHT_BLOCK = `3D LIGHT TRANSPORT: pool LEDs ~4700K (cool spill), fire bowls ~1900K (warm points), lanterns ~2400K, ambient skyline ~6000K. Deep shadow side, warm bounce off wet stone, faint mist scatter, AO at body‑deck contact.`;

const SKIN_BLOCK = `SKIN BIO-OPTICAL RENDERING: natural subsurface scattering, visible pores and fine expression lines, no smoothing. T-zone sheen, faint vellus hair rim-light, tiny perspiration micro-specs. Preserve face, bone structure, and eye color exactly.`;

const NO_TOUCH_BLOCK = `SUBJECT IS SOLO: No other people touching or overlapping her. No extra arms or hands near her shoulders or body. Keep both shoulders clear. No stray hands in frame behind her. Background patrons, if present, are distant and fully separated.`;

const IMPERFECTIONS_BLOCK = `RAW PHOTOGRAPHIC IMPERFECTIONS: ISO 3200 grain in shadows, flyaway hair, faint lens flare ghosts, slight barrel distortion, subtle CA, 1–3px bloom on hot highlights. Fingerprints on brass, crumpled napkin. No retouching, RAW WB only.`;

const CLOTH_PHYSICS_BLOCK = `CLOTH + BODY PHYSICS: gravity-driven drape with measurable weight; leg openings show slight bias stretch and a 2–4mm outward curl. Bending stiffness varies by panel; shear distortion appears where the swimsuit wraps the hip. Strap bridges indent skin with subtle compression and rebound; seam puckering at stitch lines under tension. Micro-wrinkles at waist/hip, directional stretch lines in high-tension zones, and fabric thickness reads at all cutout edges. Satin shows anisotropic highlights aligned to the weave; matte panels show broader diffuse lobes.`;

const SCENE_PHYSICS_BLOCK = `ENVIRONMENT PHYSICS: water surface shows small‑amplitude ripples; caustics dance on adjacent stone; mist varies with distance; wet deck shows glossy micro‑puddles; reflections obey Fresnel and distort with wave curvature.`;

const OPTICS_BLOCK = `OPTICAL SURFACES: marble = glossy dielectric with sharp reflections; mirrors show slight distortion/ghosting; glass stems show caustic streaks and internal reflection; metal rails show tight specular bands with faint dispersion.`;

const MICROSTRUCTURE_BLOCK = `MATERIAL MICROSTRUCTURE: visible weave frequency, subtle moire; fiber sparkle in satin highlights; sheer inserts show clean edges and soft diffusion.`;

const CONTACT_PRESSURE_BLOCK = `CONTACT + PRESSURE: micro-occlusion at seams, slight skin displacement at strap anchors, pressure gradients soften toward edges; keep natural micro-shadowing.`;

const SPECTRAL_PHYSICS_BLOCK = `SPECTRAL + POLARIZATION: satin highlights show polarization dimming; thin-film areas show soft interference bands; haze scatters warmer near-field, cooler far-field.`;

const SULTRY_MOOD_BLOCK = `SULTRY EDITORIAL MOOD: ultra‑seductive, inviting, confidently alluring. Luxury pool pre‑party energy with slow‑burn tension and glossy nightlife mood; she reads as magnetic and beckoning without overt performance. Keep expression sultry but natural, not exaggerated.`;

const PHYSICS_INNOVATION_BLOCK = `PHYSICS INNOVATION PRIORITY: energy‑conserving microfacet BRDF with proper Fresnel roll‑off; anisotropic lobes aligned to weave; multi‑layer cloth (sheen + diffuse + spec). Secondary bounce GI visible in metallic highlights; cloth treated as mass‑spring with realistic bend + shear. Preserve micro‑occlusion at seams and edge thickness at cutouts.`;

const MEASURED_CONSTRAINTS_BLOCK = `MEASURED CONSTRAINTS: strap compression 1–3mm; seam puckering 1–2mm; hem curl 2–4mm; cutout edge thickness 0.6–1.2mm; fabric thickness 0.3–0.6mm with lining 0.2–0.4mm; microfold wavelengths 8–20mm; specular roughness 0.08–0.22; negative‑space ratio 45–60% with continuous load paths; bridge span 22–45mm; neckline angle 78–90°.`;

const CREATIVE_ATTIRE_BLOCK = `CREATIVE ATTIRE MANDATE: For every attempt, invent a distinct couture lace‑swimsuit design and a new color take. Do not reuse prior design layouts in this batch. Vary lace motif architecture, seam maps, plunge geometry, cutouts, hardware, harness routing, and surface treatments while staying within luxe poolside goals. Designs should read ultra‑daring but fully coverage‑safe.`;

const PHYSICS_ONLY_ATTIRE_BLOCK = `PHYSICS-ONLY ATTIRE INSTRUCTION: prioritize mechanical and optical constraints (dimensions, curvature, tension, stiffness, load paths, stitch pitch, material properties, biaxial stretch %, shear response, edge binding tension, compression fit). Keep aesthetic wording brief but allow concise lace‑motif descriptors when they serve the physics spec.`;

const DARING_CUT_BLOCK = `DARING NECKLINE + CUTOUTS (MAX): plunge apex sits 0–2mm above the navel; center gore width 6–12mm; neckline angle 78–90° with base width 40–70mm; sheer illusion mesh stabilization 0.2–0.4mm thick; lace overlays are semi‑transparent but strategically backed where needed. Bust coverage is maintained by opaque micro‑cups and internal stays while underbust curvature remains visible; no areola/nipple exposure. Side cutouts rise to within 2–5mm of the iliac crest, with ultra‑narrow strap bridges 3–6mm and bonded edges. Open back to the waistline. Negative space is extreme but coverage is intact (no genital exposure).`;

const NEGATIVE_SPACE_BLOCK = `NEGATIVE-SPACE GEOMETRY: front-panel void ratio 35–50% with continuous load paths; cutout edges reinforced and beveled; tension lines radiate from strap anchors and converge toward the waist seam.`;
const NEGATIVE_SPACE_MAX_BLOCK = `NEGATIVE-SPACE (MAX): front-panel void ratio 45–60% with continuous load paths; cutout edges reinforced and beveled; tension lines radiate from strap anchors and converge toward the waist seam; strap bridges remain under high tension without warping.`;

const AIRFLOW_PHYSICS_BLOCK = `AIRFLOW + HEAT: subtle HVAC airflow lifts a few hair strands; candle heat shimmer distorts background highlights; micro-cloth flutter at loose edges.`;

const WARDROBE_CONSTRUCTION_BLOCK = `WARDROBE CONSTRUCTION: internal boning and micro-stays stabilize the neckline; hidden clear tape prevents slip. Seams align to body landmarks with subtle stitch puckering; clasp hardware shows tiny specular edges; closures sit under tension without warping the fabric.`;

const SAFETY_BLOCK = `FASHION SAFETY: daring couture but fully covered; no explicit nudity; no see‑through exposure of nipples/areola or genitalia.`;

const LIGHT_TRANSPORT_DEEP_BLOCK = `LIGHT TRANSPORT: multi‑bounce radiance; tungsten pools hard falloff, neon spill adds wavelength tint. Specular obeys Fresnel; diffuse bounce warms near‑field. Haze adds soft halos; reflection sharpness varies with micro‑roughness.`;

const MATERIAL_MECHANICS_BLOCK = `MATERIAL MECHANICS: orthotropic cloth (warp/weft stiffness); Young’s modulus 0.2–1.2 GPa, shear 0.05–0.25 GPa, bending 0.4–1.6 N·mm. Damping 0.08–0.18; seams act as stiffened beams; collision thickness prevents interpenetration.`;

const SENSOR_PIPELINE_BLOCK = `SENSOR PIPELINE: raw Bayer demosaic; preserve noise floor; gentle S‑curve rolloff; no beauty smoothing; keep micro‑contrast at pores and weave.`;

const FIT_TAILORING_BLOCK = `BESPOKE FIT (TAILORED TO THIS WOMAN): garment is drafted to her exact torso/waist/hip proportions, with contour seams aligned to her natural body landmarks. Bust shaping uses narrow‑span cups + internal stays + tensioned mesh to support a deep plunge without slip; waist suppression is subtle but precise; hip line follows her curvature without gapping. Strap tension and seam alignment are tuned to her posture and pose, producing realistic micro‑compression and rebound at anchor points.`;

const BIOMECH_BLOCK = `BIOMECHANICS: posture and pose remain identical, but fabric load paths respond to gravity and body curvature. Straps carry tensile load; seams carry shear; cutout edges behave as stiffened beams. The dress is stable without slipping; tension gradients are strongest at anchors and relax toward hem.`;

const ANATOMY_ANCHOR_BLOCK = `ANATOMY ANCHORS: neckline apex aligns just above the navel; strap anchors align to clavicle and posterior deltoid; waist seam aligns to her natural waist; hip cutout apex aligns near iliac crest. No geometry should drift off these landmarks.`;

const ATTIRE_GEOMETRY_DEEP_BLOCK = `GARMENT GEOMETRY DEEP DIVE: define curvature radii along the neckline lip (18–40mm), underbust arc (22–40mm), armhole arcs (35–60mm), and cutout edges (20–55mm). Edge bevels are 0.6–1.2mm with visible thickness. Load paths: straps -> neckline stays -> waist seam -> hip anchors. Keep continuous tensile paths; no slack bridges.`;

const COLOR_METAMERISM_BLOCK = `COLOR + METAMERISM: color appearance must remain stable under mixed tungsten/neon lighting; metallic highlights shift hue subtly with angle due to thin-film interference; avoid flat color patches.`;

const SCENE_CAUSTICS_BLOCK = `SCENE CAUSTICS: pool water casts moving caustic patterns on stone and nearby surfaces; wet deck shows glossy specular streaks; glassware shows small refractive streaks.`;

const SWIMSUIT_BLOCK = `LACE SWIMSUIT RULE: couture lace monokini/one‑piece with dagger plunge to the navel, illusion‑mesh cradle, opaque micro‑cups, razor‑thin bridges, high‑cut hips, and open back to waistline; include micro‑ring or grommet harness accents that channel tension. Lace motif and cutout map must be unique each attempt; use scalloped or bonded edge finishes, ring/grommet connectors, and visible tension paths. Coverage must remain intact (no nipple/areola/genital exposure).`;

const EDGY_ATTITUDE_BLOCK = `EDGY ATTITUDE: confident, nightlife‑forward energy; bold, dominant presence with magnetic eye contact, predatory calm, and controlled power without changing the base pose.`;
const POSE_TENSION_BLOCK = `POSE ENERGY (WITHOUT REPOSING): maintain the exact pose, but intensify muscular tension in shoulders, core, and hip line; subtle ribcage lift, waist engagement, and hip cant conveyed purely through tension, not repositioning.`;
const AGGRESSIVE_SEDUCTION_BLOCK = `AGGRESSIVE SEDUCTION: push the plunge to navel‑line, keep opaque cups with visible underbust curvature; razor‑thin bridges, severe side cutouts, and high‑cut hips read poolside‑daring while remaining fully covered.`;
const PLUNGE_ENGINEERING_BLOCK = `PLUNGE ENGINEERING: opaque micro‑cups with internal stays + tensioned mesh cradle the plunge; narrow center gore 6–12mm; underbust contour seam carries load; no slippage or gaping; coverage maintained.`;
const HIP_CUTOUT_BLOCK = `HIP CUTOUT GEOMETRY: high‑cut hips with cutout apex 2–5mm from iliac crest; bonded edge thickness 0.6–1.2mm; strap bridges 3–6mm under high tension; negative space reads extreme but stable.`;

const SCENE_BASE = `LUXURY POOL SETTING (FIRST PRINCIPLES): High-end rooftop or resort infinity pool at night. Wet limestone or basalt decking, teak loungers, white cabanas with sheer drapes, fire bowls, palm silhouettes, and soft architectural lighting. Underwater pool lights cast caustic patterns on the waterline and nearby stone. Reflections show skyline or resort lights, with subtle breeze ripples.`;

const SCENE_SPECTACLE_BLOCK = `SCENE DESIGN + PHYSICS (EVENT-LEVEL): poolside lighting choreography with underwater LED gradients, glassy specular highlights on wet stone, and rippling caustics projected onto nearby surfaces. Mist is subtle and localized; reflections obey Fresnel and distort with wave curvature. Keep it high‑end and physically plausible.`;

const SEDUCTIVE_SCENE_BLOCK = `SEDUCTIVE SCENE (INVITING): warm fire bowls and candle clusters, chilled champagne on a marble side table, plush loungers angled toward camera, and soft poolside lanterns. Warm pools of light contrast with cool water glow; the scene feels intimate, inviting, and sensually charged without crowding the subject.`;

const ALLURE_ATTIRE_BLOCK = `ALLURE EMPHASIS: couture reads as ultra‑sexy and daring through an extreme navel‑line plunge, narrow center gore, razor‑thin bridges, underbust curve visibility, and high‑cut hips while remaining fully covered by opaque panels. Emphasize seductive silhouette, tensioned edges, and confident, nightlife‑forward styling.`;
const SENSUAL_INVITATION_BLOCK = `SENSUAL INVITATION: overall image should read as warmly inviting and intimate; sensual but refined. The subject appears welcoming and alluring within the luxury pool, with soft candle glow and rich textures enhancing the mood.`;

function buildPromptPassA(concept, expression, variation, fallback = false) {
  const variationLine = variation ? `\nCREATIVE VARIATION (UNIQUE THIS RUN): ${variation.desc}\n` : '';
  const rotation = ROTATION_SEQUENCE[expression ? (expressions.indexOf(expression) % ROTATION_SEQUENCE.length) : 0] || ROTATION_SEQUENCE[0];
  const design = variation ? composeDesignSpec(concept, variation, fallback) : { color: '', brief: '', material: fallback ? concept.materialFallback : concept.material };
  if (fallback) {
    return `Generate an image of this photograph edited into a raw real-life luxury pool photograph indistinguishable from an unretouched candid shot from a real poolside night. Preserve exact identity, face, bone structure, eyes, nose, mouth, and age. Keep pose, framing, and expression consistent: ${expression}. Only change outfit and environment as described. Avoid retouching.

FIRST-PRINCIPLES INVARIANTS:
- Identity, face, pose, framing, and expression remain unchanged.
- Camera, lens, and exposure physics remain realistic and consistent.
- Allow only the specified yaw rotation while keeping the same pose.
- Subject is solo with no contact from others.

PROMPT STRUCTURE:
SUBJECT: same woman from the source photo, same pose and expression.
ENVIRONMENT: ${SCENE_BASE} ${concept.scene}
STYLE: raw candid poolside documentary, unretouched.
TECHNICAL: real camera physics and lighting.

${SULTRY_MOOD_BLOCK}
${SENSUAL_INVITATION_BLOCK}
${EDGY_ATTITUDE_BLOCK}
${POSE_TENSION_BLOCK}

ROTATION DIRECTIVE: ${rotation}. Rotate torso/shoulders only to this yaw; keep facial identity and expression fixed.

${SCENE_SPECTACLE_BLOCK}
${SEDUCTIVE_SCENE_BLOCK}

${CREATIVE_ATTIRE_BLOCK}
${PHYSICS_ONLY_ATTIRE_BLOCK}
${SWIMSUIT_BLOCK}
${ALLURE_ATTIRE_BLOCK}
${AGGRESSIVE_SEDUCTION_BLOCK}
${variationLine}

${design.brief}
${design.color}
${design.physics}

${DARING_CUT_BLOCK}
${PLUNGE_ENGINEERING_BLOCK}
${HIP_CUTOUT_BLOCK}
${NEGATIVE_SPACE_MAX_BLOCK}
${FIT_TAILORING_BLOCK}

GARMENT GEOMETRY (COVERAGE + CUTOUTS): ${concept.geometry}
GARMENT MATERIAL CLASS (MACRO PHYSICS): ${design.material}

${NO_TOUCH_BLOCK}

${CAMERA_BLOCK}

${LIGHT_BLOCK}

${SKIN_BLOCK}

${CLOTH_PHYSICS_BLOCK}

${PHYSICS_INNOVATION_BLOCK}

${SAFETY_BLOCK}`;
  }
  return `Generate an image of this photograph edited into an ultra-raw real-life luxury pool photograph indistinguishable from an unretouched candid shot from a real poolside night. Raw documentary poolside photography. Preserve exact identity, face, bone structure, eyes, nose, mouth, and age. Keep pose, framing, and expression consistent: ${expression}. Only change outfit and environment as described. Avoid retouching.

FIRST-PRINCIPLES INVARIANTS:
- Identity, face, pose, framing, and expression remain unchanged.
- Camera, lens, and exposure physics remain realistic and consistent.
- Allow only the specified yaw rotation while keeping the same pose.
- Subject is solo with no contact from others.

PROMPT STRUCTURE:
SUBJECT: same woman from the source photo, same pose and expression.
ENVIRONMENT: ${SCENE_BASE} ${concept.scene}
STYLE: raw candid poolside documentary, unretouched.
TECHNICAL: real camera physics and lighting.

${SULTRY_MOOD_BLOCK}

ROTATION DIRECTIVE: ${rotation}. Rotate torso/shoulders only to this yaw; keep facial identity and expression fixed.

${SCENE_SPECTACLE_BLOCK}

${CREATIVE_ATTIRE_BLOCK}
${PHYSICS_ONLY_ATTIRE_BLOCK}
${SWIMSUIT_BLOCK}
${ALLURE_ATTIRE_BLOCK}
${AGGRESSIVE_SEDUCTION_BLOCK}
${variationLine}

${design.brief}
${design.color}
${design.physics}

${DARING_CUT_BLOCK}
${PLUNGE_ENGINEERING_BLOCK}
${HIP_CUTOUT_BLOCK}
${NEGATIVE_SPACE_MAX_BLOCK}
${FIT_TAILORING_BLOCK}

GARMENT GEOMETRY (COVERAGE + CUTOUTS): ${concept.geometry}
GARMENT MATERIAL CLASS (MACRO PHYSICS): ${design.material}

${NO_TOUCH_BLOCK}

${CAMERA_BLOCK}

${LIGHT_BLOCK}

${SKIN_BLOCK}

${CLOTH_PHYSICS_BLOCK}

${SCENE_PHYSICS_BLOCK}

${OPTICS_BLOCK}


${PHYSICS_INNOVATION_BLOCK}

${SAFETY_BLOCK}`;
}

function buildPromptPassACompact(concept, expression, variation) {
  const design = variation ? composeDesignSpec(concept, variation, true) : { color: '', brief: '', material: concept.materialFallback };
  const rotation = ROTATION_SEQUENCE[expression ? (expressions.indexOf(expression) % ROTATION_SEQUENCE.length) : 0] || ROTATION_SEQUENCE[0];
  return `Generate an image of this photograph edited into a raw, real-life luxury pool photo. Preserve exact identity, face, bone structure, eyes, nose, mouth, age, and the original pose and framing. Expression: ${expression}. Allow only the specified yaw rotation; no other pose changes. Subject is solo.

SCENE: ${SCENE_BASE} ${concept.scene}
MOOD: ${SULTRY_MOOD_BLOCK} ${SENSUAL_INVITATION_BLOCK} ${EDGY_ATTITUDE_BLOCK}
ROTATION: ${rotation}

ATTIRE (MANDATORY, LACE SWIMSUIT): ${SWIMSUIT_BLOCK}
ULTRA-DARING CUT: ${DARING_CUT_BLOCK} ${PLUNGE_ENGINEERING_BLOCK} ${HIP_CUTOUT_BLOCK}
ALLURE: ${ALLURE_ATTIRE_BLOCK} ${AGGRESSIVE_SEDUCTION_BLOCK}
DESIGN: ${design.brief} ${design.color}
GEOMETRY: ${concept.geometry}
MATERIAL: ${design.material}

CAMERA/LIGHT: ${CAMERA_BLOCK} ${LIGHT_BLOCK}
PHYSICS: ${CLOTH_PHYSICS_BLOCK} ${PHYSICS_INNOVATION_BLOCK}
SAFETY: ${SAFETY_BLOCK}
NO RETOUCHING; RAW LOOK.`;
}

function buildPromptPassAUltra(concept, expression, variation) {
  const design = variation ? composeDesignSpec(concept, variation, true) : { color: '', brief: '', material: concept.materialFallback };
  const rotation = ROTATION_SEQUENCE[expression ? (expressions.indexOf(expression) % ROTATION_SEQUENCE.length) : 0] || ROTATION_SEQUENCE[0];
  return `Generate an image of this photograph edited into a raw, real-life luxury pool photo. Preserve exact identity, face, bone structure, eyes, nose, mouth, age, and the original pose and framing. Expression: ${expression}. Allow only yaw rotation: ${rotation}. Subject is solo.

SCENE: high-floor luxury pool at night with skyline view, wet stone + teak + cabanas, underwater LED glow, fire bowls, and lanterns; intimate poolside vibe.
MOOD: ultra-sultry, inviting, magnetic. Eye contact is bold and alluring.

ATTIRE (MANDATORY): daring lace one-piece swimsuit — ultra‑low‑cut plunge to navel line, opaque micro‑cups, narrow center gore (6–12mm), sheer illusion mesh stabilization, razor‑thin bridges, severe side cutouts, high‑cut hips, open back to waist. Coverage intact (no nipple/areola/genital exposure).

GEOMETRY: ${concept.geometry}
MATERIAL: ${design.material}
COLOR: ${design.color}

SAFETY: fully covered; no nipples/areola or genital exposure. Raw, unretouched realism.`;
}

function buildPromptPassB(concept, expression, variation, fallback = false) {
  const design = variation ? composeDesignSpec(concept, variation, fallback) : { color: '', brief: '', micro: fallback ? concept.microFallback : concept.micro };
  const variationLine = variation ? `\nCREATIVE VARIATION (UNCHANGED): ${variation.desc}\n` : '';
  const rotation = ROTATION_SEQUENCE[expression ? (expressions.indexOf(expression) % ROTATION_SEQUENCE.length) : 0] || ROTATION_SEQUENCE[0];
  if (fallback) {
    return `Generate an image of this photograph edited from the previous pass. Preserve the same identity, face, pose, framing, expression, and scene. Keep camera, lighting, and color balance unchanged from pass A. Refine only garment microstructure (lace/mesh), swimwear physics, and realistic imperfections. Maintain raw documentary look with no retouching. Expression: ${expression}.

FIRST-PRINCIPLES REFINEMENT:
- Do not change pose, framing, or lighting.
- Preserve garment geometry and coverage.
- Only increase material microphysics fidelity.
- Rotation is locked from pass A: ${rotation}.

SCENE (UNCHANGED): ${SCENE_BASE} ${concept.scene}
SCENE SPECTACLE (UNCHANGED): poolside LED gradients, wet-deck speculars, and caustic patterns persist.
SEDUCTIVE SCENE (UNCHANGED): fire bowls, candle lanterns, and poolside lounge staging persist.

${SULTRY_MOOD_BLOCK}
${SENSUAL_INVITATION_BLOCK}

${CREATIVE_ATTIRE_BLOCK}
${PHYSICS_ONLY_ATTIRE_BLOCK}
${SWIMSUIT_BLOCK}
${variationLine}
${design.brief}
${design.color}

GARMENT GEOMETRY (UNCHANGED): ${concept.geometry}
MATERIAL MICROSTRUCTURE (MICRO PHYSICS): ${design.micro}
SWIMSUIT REFINEMENT: lace filaments, mesh tension, bonded edge thickness, and micro-shadowing.

${DARING_CUT_BLOCK}
${PLUNGE_ENGINEERING_BLOCK}
${HIP_CUTOUT_BLOCK}
${NEGATIVE_SPACE_MAX_BLOCK}
${FIT_TAILORING_BLOCK}
${ANATOMY_ANCHOR_BLOCK}
${ATTIRE_GEOMETRY_DEEP_BLOCK}
${SCENE_CAUSTICS_BLOCK}
${COLOR_METAMERISM_BLOCK}

${NO_TOUCH_BLOCK}

${CAMERA_BLOCK}

${LIGHT_BLOCK}

${SKIN_BLOCK}

${CLOTH_PHYSICS_BLOCK}

${OPTICS_BLOCK}

${PHYSICS_INNOVATION_BLOCK}

${SAFETY_BLOCK}`;
  }
  return `Generate an image of this photograph edited from the previous pass. Preserve the same identity, face, pose, framing, expression, and scene. Keep camera, lighting, and color balance unchanged from pass A. Refine only garment microstructure (lace/mesh), swimwear physics, and realistic imperfections. Maintain raw documentary look with no retouching. Expression: ${expression}.

FIRST-PRINCIPLES REFINEMENT:
- Do not change pose, framing, or lighting.
- Preserve garment geometry and coverage.
- Only increase material microphysics fidelity.
- Rotation is locked from pass A: ${rotation}.

SCENE (UNCHANGED): ${SCENE_BASE} ${concept.scene}
SCENE SPECTACLE (UNCHANGED): poolside LED gradients, wet-deck speculars, and caustic patterns persist.
SEDUCTIVE SCENE (UNCHANGED): fire bowls, candle lanterns, and poolside lounge staging persist.

${CREATIVE_ATTIRE_BLOCK}
${PHYSICS_ONLY_ATTIRE_BLOCK}
${SWIMSUIT_BLOCK}
${variationLine}
${design.brief}
${design.color}

GARMENT GEOMETRY (UNCHANGED): ${concept.geometry}
MATERIAL MICROSTRUCTURE (MICRO PHYSICS): ${design.micro}
SWIMSUIT REFINEMENT: lace filaments, mesh tension, bonded edge thickness, and micro-shadowing.

${DARING_CUT_BLOCK}
${PLUNGE_ENGINEERING_BLOCK}
${HIP_CUTOUT_BLOCK}
${NEGATIVE_SPACE_MAX_BLOCK}
${FIT_TAILORING_BLOCK}
${ANATOMY_ANCHOR_BLOCK}
${ATTIRE_GEOMETRY_DEEP_BLOCK}
${SCENE_CAUSTICS_BLOCK}
${COLOR_METAMERISM_BLOCK}

${SULTRY_MOOD_BLOCK}
${EDGY_ATTITUDE_BLOCK}
${SENSUAL_INVITATION_BLOCK}

${NO_TOUCH_BLOCK}

${CAMERA_BLOCK}

${LIGHT_BLOCK}

${SKIN_BLOCK}

${CLOTH_PHYSICS_BLOCK}

${SCENE_PHYSICS_BLOCK}

${OPTICS_BLOCK}


${PHYSICS_INNOVATION_BLOCK}

${SAFETY_BLOCK}
`;
}

function wordCount(text) {
  return text.split(/\s+/).filter(Boolean).length;
}

const BANNED_TOKENS = [
  'fishnet',
  'maximum',
  'minimal',
  'barely',
  'significantly',
];

function validatePrompt(prompt, label) {
  const lower = prompt.toLowerCase();
  const hits = BANNED_TOKENS.filter(t => lower.includes(t));
  if (hits.length > 0) {
    console.log(`WARN: ${label} contains banned tokens: ${hits.join(', ')}`);
  }
  if (!lower.includes('navel') && !lower.includes('high-cut')) {
    console.log(`WARN: ${label} missing navel-line or high-cut anchor.`);
  }
  if (!lower.includes('generate an image of')) {
    console.log(`WARN: ${label} missing explicit \"generate an image of\" directive.`);
  }
}

function partWithThoughtSignature(part) {
  const out = {};
  if (part.text) out.text = part.text;
  if (part.inlineData) out.inlineData = part.inlineData;
  if (part.thought_signature) out.thought_signature = part.thought_signature;
  if (part.thoughtSignature) out.thoughtSignature = part.thoughtSignature;
  return out;
}

async function callModel(contents, retries = 0, imageOnly = false) {
  const requestBody = {
    contents,
    generationConfig: {
      responseModalities: imageOnly ? ['IMAGE'] : ['TEXT', 'IMAGE'],
      imageConfig: { aspectRatio: '4:5', imageSize: '1K' },
    },
  };

  const client = await auth.getClient();
  const token = await client.getAccessToken();
  let response;
  try {
    response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });
  } catch (err) {
    if (retries >= 6) {
      throw err;
    }
    const wait = 30;
    console.log(`Network error (${retries + 1}/6) - waiting ${wait}s...`);
    await new Promise(r => setTimeout(r, wait * 1000));
    return callModel(contents, retries + 1);
  }

  if (!response.ok) {
    const error = await response.text();
    if (response.status === 429) {
      if (retries >= 24) {
        const cooldown = 600;
        console.log(`Rate limit cap reached. Cooling down ${cooldown}s before retry...`);
        await new Promise(r => setTimeout(r, cooldown * 1000));
        return callModel(contents, 0);
      }
      const wait = 65;
      console.log(`Rate limited (${retries + 1}/24) - waiting ${wait}s...`);
      await new Promise(r => setTimeout(r, wait * 1000));
      return callModel(contents, retries + 1);
    }
    if (response.status >= 500 && retries < 4) {
      const wait = 20 + Math.floor(Math.random() * 10);
      console.log(`Server error ${response.status} (${retries + 1}/4) - waiting ${wait}s...`);
      await new Promise(r => setTimeout(r, wait * 1000));
      return callModel(contents, retries + 1);
    }
    throw new Error(`API ${response.status}: ${error.substring(0, 300)}`);
  }

  return response.json();
}

async function generatePassA(concept, inputImage, index) {
  const expression = expressions[index % expressions.length];
  const variation = buildVariation();
  const prompt = buildPromptPassA(concept, expression, variation);
  const wc = wordCount(prompt);
  if (wc < 1400 || wc > 1500) {
      console.log(`WARN: Pass A word count ${wc} outside 1400-1500 target.`);
    }
  validatePrompt(prompt, 'Pass A');

  console.log(`\n${'='.repeat(60)}`);
  console.log(`[${index + 1}/20] PASS A ${concept.name}`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Prompt A: ${wc} words | Expression: ${expression.substring(0, 50)}...`);
  console.log(`Variation: ${variation.colorway.name} | ${variation.theme.name}`);

  const imageBuffer = await fs.readFile(inputImage);
  const base64Image = imageBuffer.toString('base64');
  const ext = path.extname(inputImage).toLowerCase();
  const mimeType = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : ext === '.webp' ? 'image/webp' : 'image/png';

  const contents = [{
    role: 'user',
    parts: [
      { text: prompt },
      { inlineData: { mimeType, data: base64Image } },
    ],
  }];

  let data = await callModel(contents, 0, true);
  const parts = data.candidates?.[0]?.content?.parts || [];
  let imageData = null;
  let modelParts = [];

  for (const part of parts) {
    if (part.text && !part.thought) {
      console.log(`Model A: ${part.text.substring(0, 100)}...`);
    }
    if (part.inlineData?.data) {
      imageData = part.inlineData;
    }
    modelParts.push(partWithThoughtSignature(part));
  }

  if (!imageData?.data) {
    console.log('Pass A fallback: simplifying material phrasing...');
    const promptFallback = buildPromptPassA(concept, expression, variation, true);
    validatePrompt(promptFallback, 'Pass A (fallback)');
    const contentsFallback = [{
      role: 'user',
      parts: [
        { text: promptFallback },
        { inlineData: { mimeType, data: base64Image } },
      ],
    }];
    data = await callModel(contentsFallback, 0, true);
    const partsFb = data.candidates?.[0]?.content?.parts || [];
    imageData = null;
    modelParts = [];
    for (const part of partsFb) {
      if (part.text && !part.thought) {
        console.log(`Model A(FB): ${part.text.substring(0, 100)}...`);
      }
      if (part.inlineData?.data) {
        imageData = part.inlineData;
      }
      modelParts.push(partWithThoughtSignature(part));
    }
    if (!imageData?.data) {
      console.log('Pass A compact fallback: minimal prompt + hard constraints...');
      const promptCompact = buildPromptPassACompact(concept, expression, variation);
      validatePrompt(promptCompact, 'Pass A (compact)');
      const contentsCompact = [{
        role: 'user',
        parts: [
          { text: promptCompact },
          { inlineData: { mimeType, data: base64Image } },
        ],
      }];
      data = await callModel(contentsCompact, 0, true);
      const partsC = data.candidates?.[0]?.content?.parts || [];
      imageData = null;
      modelParts = [];
      for (const part of partsC) {
        if (part.text && !part.thought) {
          console.log(`Model A(COMP): ${part.text.substring(0, 100)}...`);
        }
        if (part.inlineData?.data) {
          imageData = part.inlineData;
        }
        modelParts.push(partWithThoughtSignature(part));
      }
      if (!imageData?.data) {
        console.log('Pass A ULTRA fallback: shortest prompt...');
        const promptUltra = buildPromptPassAUltra(concept, expression, variation);
        validatePrompt(promptUltra, 'Pass A (ultra)');
        const contentsUltra = [{
          role: 'user',
          parts: [
            { text: promptUltra },
            { inlineData: { mimeType, data: base64Image } },
          ],
        }];
        data = await callModel(contentsUltra, 0, true);
        const partsU = data.candidates?.[0]?.content?.parts || [];
        imageData = null;
        modelParts = [];
        for (const part of partsU) {
          if (part.text && !part.thought) {
            console.log(`Model A(ULTRA): ${part.text.substring(0, 100)}...`);
          }
          if (part.inlineData?.data) {
            imageData = part.inlineData;
          }
          modelParts.push(partWithThoughtSignature(part));
        }
        if (!imageData?.data) {
          throw new Error('NO IMAGE generated in pass A (ultra)');
        }
      }
    }
  }

  const img = Buffer.from(imageData.data, 'base64');
  const fp = path.join(PASSA_DIR, `${concept.name}.png`);
  await fs.writeFile(fp, img);
  console.log(`SAVED PASS A: ${fp} (${(img.length / 1024 / 1024).toFixed(2)} MB)`);

  return { fp, mimeType: imageData.mimeType || 'image/png', modelParts, variation };
}

async function generatePassB(concept, passA, inputImage, index) {
  const expression = expressions[index % expressions.length];
  const variation = passA.variation || buildVariation();
  const prompt = buildPromptPassB(concept, expression, variation);
  const wc = wordCount(prompt);
  if (wc < 1400 || wc > 1500) {
      console.log(`WARN: Pass B word count ${wc} outside 1400-1500 target.`);
    }
  validatePrompt(prompt, 'Pass B');

  console.log(`\n${'='.repeat(60)}`);
  console.log(`[${index + 1}/20] PASS B ${concept.name}`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Prompt B: ${wc} words | Expression: ${expression.substring(0, 50)}...`);

  const baseImageBuffer = await fs.readFile(inputImage);
  const base64Image = baseImageBuffer.toString('base64');
  const baseExt = path.extname(inputImage).toLowerCase();
  const baseMimeType = baseExt === '.jpg' || baseExt === '.jpeg' ? 'image/jpeg' : baseExt === '.webp' ? 'image/webp' : 'image/png';

  const passAImageBuffer = await fs.readFile(passA.fp);
  const passAB64 = passAImageBuffer.toString('base64');

  const contents = [
    { role: 'user', parts: [{ text: buildPromptPassA(concept, expression, variation) }, { inlineData: { mimeType: baseMimeType, data: base64Image } }] },
    { role: 'model', parts: passA.modelParts },
    { role: 'user', parts: [{ text: prompt }, { inlineData: { mimeType: passA.mimeType, data: passAB64 } }] },
  ];

  let data = await callModel(contents, 0, true);
  let parts = data.candidates?.[0]?.content?.parts || [];

  for (const part of parts) {
    if (part.text && !part.thought) {
      console.log(`Model B: ${part.text.substring(0, 100)}...`);
    }
    if (part.inlineData?.data) {
      const img = Buffer.from(part.inlineData.data, 'base64');
      const fp = path.join(OUTPUT_DIR, `${concept.name}.png`);
      await fs.writeFile(fp, img);
      console.log(`SAVED FINAL: ${fp} (${(img.length / 1024 / 1024).toFixed(2)} MB)`);
      return fp;
    }
  }
  console.log('Pass B fallback: simplifying microstructure phrasing...');
  const promptFallback = buildPromptPassB(concept, expression, variation, true);
  validatePrompt(promptFallback, 'Pass B (fallback)');
  const contentsFallback = [
    { role: 'user', parts: [{ text: buildPromptPassA(concept, expression, variation, true) }, { inlineData: { mimeType: baseMimeType, data: base64Image } }] },
    { role: 'model', parts: passA.modelParts },
    { role: 'user', parts: [{ text: promptFallback }, { inlineData: { mimeType: passA.mimeType, data: passAB64 } }] },
  ];
  data = await callModel(contentsFallback, 0, true);
  parts = data.candidates?.[0]?.content?.parts || [];
  for (const part of parts) {
    if (part.text && !part.thought) {
      console.log(`Model B(FB): ${part.text.substring(0, 100)}...`);
    }
    if (part.inlineData?.data) {
      const img = Buffer.from(part.inlineData.data, 'base64');
      const fp = path.join(OUTPUT_DIR, `${concept.name}.png`);
      await fs.writeFile(fp, img);
      console.log(`SAVED FINAL: ${fp} (${(img.length / 1024 / 1024).toFixed(2)} MB)`);
      return fp;
    }
  }

  console.log('Pass B fallback failed - using Pass A output as final.');
  const passAImg = await fs.readFile(passA.fp);
  const fp = path.join(OUTPUT_DIR, `${concept.name}.png`);
  await fs.writeFile(fp, passAImg);
  console.log(`SAVED FINAL (PASS A): ${fp} (${(passAImg.length / 1024 / 1024).toFixed(2)} MB)`);
  return fp;
}

const concepts = [
  {
    name: '501-pool-lace-abyss',
    scene: 'Infinity pool edge, underwater glow, candle lanterns.',
    geometry: 'Lace one-piece with dagger plunge to navel, guipure floral panels, scalloped edges, micro-grommet side bridges, open back to waist.',
    material: 'Satin-backed lace with bonded edges and sheer illusion mesh.',
    materialFallback: 'Satin-backed lace with bonded edges.',
    micro: 'LACE: lace filaments catch specular pinpoints; mesh diffuses softly.',
    microFallback: 'Lace filaments and mesh diffusion visible.',
  },
  {
    name: '502-pool-lace-razor',
    scene: 'Fire bowls and wet stone reflections.',
    geometry: 'Lace one-piece with keyhole plunge and split-cup illusion, lattice side cutouts, double-strap harness, high-cut hips.',
    material: 'Glossy nylon base with lace lattice overlay.',
    materialFallback: 'Nylon base with lace lattice.',
    micro: 'LATTICE: tight specular ridges on lace threads; nylon gloss smooth.',
    microFallback: 'Lace ridges and nylon gloss visible.',
  },
  {
    name: '503-pool-lace-orchid',
    scene: 'Cabanas with sheer drapes and lantern glow.',
    geometry: 'Lace one-piece with asymmetric one-shoulder strap, diagonal plunge to navel, corset-laced side seam, open back.',
    material: 'Matte crepe base with lace overlay and bonded edges.',
    materialFallback: 'Crepe base with lace overlay.',
    micro: 'CREPE: soft diffuse lobe; lace filaments sparkle at grazing angles.',
    microFallback: 'Diffuse crepe and lace sparkle visible.',
  },
  {
    name: '504-pool-lace-emerald',
    scene: 'Underwater LEDs casting caustics on deck.',
    geometry: 'Lace one-piece with cowl-drape plunge, sculpted underbust seam, curved side cutouts, high-cut hips, open back.',
    material: 'Liquid satin base with lace panels.',
    materialFallback: 'Satin base with lace panels.',
    micro: 'SATIN: anisotropic highlight flow; lace threads cast micro-shadows.',
    microFallback: 'Satin highlights and lace shadows visible.',
  },
  {
    name: '505-pool-lace-onyx',
    scene: 'Palm silhouettes and skyline bokeh.',
    geometry: 'Lace one-piece with deep V-plunge to navel, ring-connected side cutouts, T-strap back, high-cut hips.',
    material: 'Polished nylon with lace veil.',
    materialFallback: 'Nylon with lace veil.',
    micro: 'VEIL: mesh grid catches highlights; nylon gloss smooth.',
    microFallback: 'Mesh grid and nylon gloss visible.',
  },
  {
    name: '506-pool-lace-helix',
    scene: 'Lantern glow along pool edge.',
    geometry: 'Lace one-piece with spiral seam mapping around plunge, cathedral-arch lace motif, open back to waist, high-cut hips.',
    material: 'Satin base with spiral lace seams.',
    materialFallback: 'Satin base with lace seams.',
    micro: 'HELIX: seam tension visible; lace filaments sparkle.',
    microFallback: 'Seam tension and lace sparkle visible.',
  },
  {
    name: '507-pool-lace-cerulean',
    scene: 'Infinity pool edge, waterline caustics.',
    geometry: 'Lace one-piece with narrow center gore plunge, arc cutouts, scalloped neckline edge, open back.',
    material: 'Satin-backed lace with thin-film accents.',
    materialFallback: 'Satin-backed lace.',
    micro: 'THIN-FILM: subtle hue shift in highlights; lace threads defined.',
    microFallback: 'Thin-film hue shift and lace threads visible.',
  },
  {
    name: '508-pool-lace-amber',
    scene: 'Fire bowls and wet deck specular streaks.',
    geometry: 'Lace one-piece with plunge to navel, vertical rib lace channels, double-cowl overlay, side cutouts rising to iliac crest.',
    material: 'Mirror lamé accents over lace.',
    materialFallback: 'Lamé accents over lace.',
    micro: 'LAMÉ: tight specular bands; lace filaments visible beneath.',
    microFallback: 'Lamé bands and lace filaments visible.',
  },
  {
    name: '509-pool-lace-sapphire',
    scene: 'Poolside lanterns and cabana drapes.',
    geometry: 'Lace one-piece with plunge to navel, chevron lace motif, micro-grommet lace-up spine, high-cut hips.',
    material: 'Velour-backed lace with bonded edges.',
    materialFallback: 'Velour-backed lace.',
    micro: 'VELOUR: nap direction visible; lace sparkle at edges.',
    microFallback: 'Velour nap and lace sparkle visible.',
  },
  {
    name: '510-pool-lace-rose',
    scene: 'Underwater LEDs casting blue caustics.',
    geometry: 'Lace one-piece with plunge, petal applique over mesh, negative-space windows, open back.',
    material: 'Glossy nylon with lace lattice.',
    materialFallback: 'Nylon with lace lattice.',
    micro: 'LATTICE: specular ridges on lace; nylon gloss smooth.',
    microFallback: 'Lace ridges and nylon gloss visible.',
  },
  {
    name: '511-pool-lace-jade',
    scene: 'Fire bowls and skyline reflection.',
    geometry: 'Lace one-piece with plunge and central keyhole, geometric hex lace, high-cut hips, open back.',
    material: 'Satin base with lace panels.',
    materialFallback: 'Satin base with lace panels.',
    micro: 'SATIN: anisotropic highlights; lace filaments defined.',
    microFallback: 'Satin highlights and lace filaments visible.',
  },
  {
    name: '512-pool-lace-obsidian',
    scene: 'Cabanas with sheer drapes and lantern glow.',
    geometry: 'Lace one-piece with plunge to navel, art-deco fan lace, side cutout windows, open back.',
    material: 'Matte crepe with lace overlay.',
    materialFallback: 'Crepe with lace overlay.',
    micro: 'CREPE: soft diffuse lobe; lace sparkle at grazing angles.',
    microFallback: 'Diffuse crepe and lace sparkle visible.',
  },
  {
    name: '513-pool-lace-ember',
    scene: 'Underwater lights and wet stone reflections.',
    geometry: 'Lace one-piece with plunge to navel, baroque arabesque lace, cage-like side bridges, high-cut hips.',
    material: 'Liquid satin with lace panels.',
    materialFallback: 'Satin with lace panels.',
    micro: 'SATIN: tight sheen bands; lace threads cast micro-shadows.',
    microFallback: 'Satin sheen and lace shadows visible.',
  },
  {
    name: '514-pool-lace-mirror',
    scene: 'Infinity edge and candle lanterns.',
    geometry: 'Lace one-piece with plunge to navel, thin-film metallic lace edge, open back to waist.',
    material: 'Lamé accents over lace.',
    materialFallback: 'Lamé over lace.',
    micro: 'LAMÉ: tight specular bands; lace filaments visible beneath.',
    microFallback: 'Lamé bands and lace filaments visible.',
  },
  {
    name: '515-pool-lace-cage',
    scene: 'Fire bowls and palm silhouettes.',
    geometry: 'Lace one-piece with plunge to navel, micro-beaded lace, ring anchors, high-cut hips.',
    material: 'Velour base with lace lattice.',
    materialFallback: 'Velour base with lace.',
    micro: 'CAGE: strap edges show thickness; velour nap directional.',
    microFallback: 'Strap thickness and velour nap visible.',
  },
  {
    name: '516-pool-lace-ivory',
    scene: 'Poolside lanterns with warm glow.',
    geometry: 'Lace one-piece with ultra-deep plunge to just above navel, chantilly lace scallops, illusion-mesh yoke, open back, high-cut hips.',
    material: 'Satin-backed lace with bonded edges and micro-ring anchors.',
    materialFallback: 'Satin-backed lace with bonded edges.',
    micro: 'LACE: filaments sparkle; bonded edges cast micro-shadows; mesh grid visible at grazing angles.',
    microFallback: 'Lace filaments, edge shadows, and mesh grid visible.',
  },
  {
    name: '517-pool-lace-cerulean',
    scene: 'Underwater LEDs and caustics on deck.',
    geometry: 'Lace one-piece with plunge to navel, iris-petal lace applique, side cutouts, open back.',
    material: 'Glossy nylon with lace veil.',
    materialFallback: 'Nylon with lace veil.',
    micro: 'VEIL: mesh grid catches highlights; nylon gloss smooth.',
    microFallback: 'Mesh grid and nylon gloss visible.',
  },
  {
    name: '518-pool-lace-amber-helix',
    scene: 'Fire bowls and wet stone reflections.',
    geometry: 'Lace one-piece with plunge to navel, honeycomb lace, lattice bridges, open back.',
    material: 'Satin base with spiral lace seams.',
    materialFallback: 'Satin base with lace seams.',
    micro: 'HELIX: seam tension visible; lace filaments sparkle.',
    microFallback: 'Seam tension and lace sparkle visible.',
  },
  {
    name: '519-pool-lace-obsidian-veil',
    scene: 'Cabanas with sheer drapes and lantern glow.',
    geometry: 'Lace one-piece with plunge to navel, translucent lace overlay panel along the plunge, lattice side bridges, open back.',
    material: 'Glossy nylon base with lace overlay and bonded edges.',
    materialFallback: 'Nylon base with lace overlay.',
    micro: 'OVERLAY: mesh grid catches highlights; nylon gloss smooth; edge binding visible.',
    microFallback: 'Mesh grid, nylon gloss, and edge binding visible.',
  },
  {
    name: '520-pool-lace-crimson',
    scene: 'Infinity edge and skyline reflection.',
    geometry: 'Lace one-piece with plunge to navel, crimson lace with black contrast, corset-laced spine, high-cut hips.',
    material: 'Lamé accents over lace.',
    materialFallback: 'Lamé over lace.',
    micro: 'LAMÉ: tight specular bands; lace filaments visible beneath.',
    microFallback: 'Lamé bands and lace filaments visible.',
  },
];

const s = parseInt(process.argv[3] || '0');
const e = parseInt(process.argv[4] || String(concepts.length));
const results = [];

const existingFiles = await fs.readdir(OUTPUT_DIR).catch(() => []);
const existingNums = new Set(
  existingFiles
    .filter(f => f.endsWith('.png'))
    .map(f => parseInt(f.split('-')[0], 10))
    .filter(n => !Number.isNaN(n))
);

console.log(`\n=== V29 APEX - Two-pass, multi-turn refinement ===`);
console.log(`Range: ${s + 1}-${e} | Input: ${path.basename(INPUT_IMAGE)}`);
console.log(`Output: ${OUTPUT_DIR}`);
console.log(`Already generated: ${existingNums.size} | Skipping: [${[...existingNums].sort((a,b)=>a-b).join(',')} ]\n`);

for (let i = s; i < Math.min(e, concepts.length); i++) {
  const parsedNum = parseInt(concepts[i].name.split('-')[0], 10);
  const conceptNum = Number.isNaN(parsedNum) ? (i + 1) : parsedNum;
  if (existingNums.has(conceptNum)) {
    console.log(`SKIP [${conceptNum}/250] ${concepts[i].name} (already exists)`);
    results.push({ name: concepts[i].name, path: 'exists', ok: true });
    continue;
  }
  try {
    const passA = await generatePassA(concepts[i], INPUT_IMAGE, i);
    if (process.env.PASS_A_ONLY === '1') {
      const passAImg = await fs.readFile(passA.fp);
      const fp = path.join(OUTPUT_DIR, `${concepts[i].name}.png`);
      await fs.writeFile(fp, passAImg);
      console.log(`PASS_A_ONLY: saved final from pass A -> ${fp}`);
      results.push({ name: concepts[i].name, path: fp, ok: true });
      continue;
    }
    console.log('Waiting 65s between passes...');
    await new Promise(r => setTimeout(r, 65000));
    const fp = await generatePassB(concepts[i], passA, INPUT_IMAGE, i);
    results.push({ name: concepts[i].name, path: fp, ok: !!fp });
  } catch (err) {
    console.error(`FAIL: ${concepts[i].name} - ${err.message}`);
    results.push({ name: concepts[i].name, path: null, ok: false, err: err.message });
  }
  if (i < Math.min(e, concepts.length) - 1) {
    console.log('Waiting 65s...');
    await new Promise(r => setTimeout(r, 65000));
  }
}

console.log(`\n${'='.repeat(60)}`);
console.log('V29 APEX RESULTS');
console.log(`${'='.repeat(60)}`);
const ok = results.filter(r => r.ok);
console.log(`Success: ${ok.length}/${results.length}`);
results.forEach(r => console.log(`  ${r.ok ? 'OK' : '!!'} ${r.name}${r.err ? ': ' + r.err : ''}`));
console.log(`\nOutput: ${OUTPUT_DIR}`);

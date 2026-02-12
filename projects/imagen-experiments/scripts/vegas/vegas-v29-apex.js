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
const RETRY_WAIT_S = parseInt(process.env.RETRY_WAIT_S || '91', 10);
const MAX_CONCEPT_ATTEMPTS = parseInt(process.env.MAX_CONCEPT_ATTEMPTS || '5', 10);
const RATE_LIMIT_BACKOFF_MIN_S = parseInt(process.env.RATE_LIMIT_BACKOFF_MIN_S || '120', 10);
const RATE_LIMIT_BACKOFF_MAX_S = parseInt(process.env.RATE_LIMIT_BACKOFF_MAX_S || '180', 10);
const RATE_LIMIT_RETRIES_MAX = parseInt(process.env.RATE_LIMIT_RETRIES_MAX || '6', 10);
const API_REQUEST_TIMEOUT_MS = parseInt(process.env.API_REQUEST_TIMEOUT_MS || '120000', 10);
const NETWORK_RETRIES_MAX = parseInt(process.env.NETWORK_RETRIES_MAX || '1', 10);
const NETWORK_RETRY_WAIT_S = parseInt(process.env.NETWORK_RETRY_WAIT_S || '15', 10);
const SERVER_RETRIES_MAX = parseInt(process.env.SERVER_RETRIES_MAX || '1', 10);
const SERVER_RETRY_WAIT_S = parseInt(process.env.SERVER_RETRY_WAIT_S || '30', 10);
const FORCE_ULTRA_PASS_A = process.env.FORCE_ULTRA_PASS_A === '1';
const INCLUDE_TEXT_MODALITY = process.env.INCLUDE_TEXT_MODALITY !== '0';
const FORCE_SAFE_MODE = process.env.FORCE_SAFE_MODE === '1';

const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
await fs.mkdir(OUTPUT_DIR, { recursive: true });
await fs.mkdir(PASSA_DIR, { recursive: true });

function compactSafety(ratings) {
  if (!Array.isArray(ratings) || ratings.length === 0) return '';
  return ratings
    .map(r => {
      const cat = r.category || r.name || 'unknown';
      const prob = r.probability || r.probabilityScore || r.severity || r.level || 'unknown';
      return `${cat}:${prob}`;
    })
    .join(', ');
}

function logModelDiagnostics(data, label) {
  const pf = data?.promptFeedback;
  const cand = data?.candidates?.[0];
  const finish = cand?.finishReason || cand?.finish_reason;
  const block = pf?.blockReason || pf?.block_reason || pf?.blockReasonMessage || pf?.block_reason_message;
  const pfSafety = compactSafety(pf?.safetyRatings || pf?.safety_ratings);
  const candSafety = compactSafety(cand?.safetyRatings || cand?.safety_ratings);
  if (finish || block || pfSafety || candSafety) {
    console.log(`DIAG ${label}: finish=${finish || 'n/a'} block=${block || 'n/a'} safety=[${candSafety || pfSafety || 'n/a'}]`);
  }
}

const expressions = [
  'confident gaze, relaxed eyelids, soft closed-mouth smile',
  'calm poise, gentle smile, steady eye contact',
  'serene confidence, neutral lips, relaxed jaw',
  'composed gaze, subtle smile, chin level',
  'quiet confidence, soft eyes, slight smile',
  'poised stillness, relaxed mouth, direct gaze',
  'warm friendliness, small smile, gentle head tilt',
  'knowing smile, eyes bright, chin slightly down',
  'cool composure, relaxed jaw, steady gaze',
  'relaxed elegance, soft gaze, effortless poise',
  'subtle smirk, eyes engaged, chin dipped',
  'radiant charm, soft smile, luminous eyes',
  'measured calm, composed and still',
  'intimate warmth, subtle smile, steady eye contact',
  'confident edge, focused eyes, controlled breath',
  'dreamy softness, calm gaze, relaxed mouth',
  'sharp wit, small smile, eyes lively',
  'regal poise, elongated neck, inviting gaze',
  'candid smile, relaxed face, direct gaze',
  'magnetic presence, unblinking gaze, quiet intensity',
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
  { name: 'Bold couture poolside', note: 'high-contrast glamour, strong cuts, couture energy' },
  { name: 'Glossed‑couture', note: 'liquid sheen, sculpted curves, high polish' },
  { name: 'Dark‑glam edge', note: 'obsidian mass, sharp highlights, controlled presence' },
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
  { name: 'sunset vermillion + graphite', primary: 'sunset vermillion', accent: 'graphite', highlight: 'ember gold', spectral: 'PRIMARY peak ~610–630nm; ACCENT low reflectance; HIGHLIGHT ~580–600nm.' },
  { name: 'arctic cyan + obsidian', primary: 'arctic cyan', accent: 'obsidian', highlight: 'ice white', spectral: 'PRIMARY peak ~485–505nm; ACCENT <5% reflectance; HIGHLIGHT broadband cool.' },
  { name: 'mocha noir + champagne', primary: 'mocha noir', accent: 'champagne', highlight: 'warm pearl', spectral: 'PRIMARY ~560–590nm with lowered blue; ACCENT metallic warm 560–590nm; HIGHLIGHT ~560nm.' },
  { name: 'opal mint + chrome', primary: 'opal mint', accent: 'chrome', highlight: 'seafoam', spectral: 'PRIMARY peak ~500–515nm; ACCENT metallic broadband; HIGHLIGHT ~510–520nm.' },
  { name: 'petrol blue + brass', primary: 'petrol blue', accent: 'brass', highlight: 'teal glow', spectral: 'PRIMARY peak ~470–490nm; ACCENT warm metallic 560–600nm; HIGHLIGHT ~500–520nm.' },
  { name: 'sunlit coral + onyx', primary: 'sunlit coral', accent: 'onyx', highlight: 'peach spark', spectral: 'PRIMARY peak ~585–610nm; ACCENT low reflectance; HIGHLIGHT ~580–590nm.' },
  { name: 'storm slate + silver', primary: 'storm slate', accent: 'silver', highlight: 'cool gray', spectral: 'PRIMARY neutral with slight blue lift; ACCENT metallic broadband; HIGHLIGHT ~520nm.' },
  { name: 'magenta dusk + gunmetal', primary: 'magenta dusk', accent: 'gunmetal', highlight: 'rose sheen', spectral: 'PRIMARY peak ~520–540nm with red lift; ACCENT metallic neutral; HIGHLIGHT ~560–580nm.' },
  { name: 'olive quartz + brass', primary: 'olive quartz', accent: 'brass', highlight: 'golden olive', spectral: 'PRIMARY peak ~540–560nm; ACCENT warm metallic; HIGHLIGHT ~560–580nm.' },
  { name: 'infrared ruby + black chrome', primary: 'infrared ruby', accent: 'black chrome', highlight: 'blood orange', spectral: 'PRIMARY peak ~650–680nm; ACCENT metallic neutral; HIGHLIGHT ~600–620nm.' },
  { name: 'blue steel + amber', primary: 'blue steel', accent: 'amber', highlight: 'cool steel', spectral: 'PRIMARY peak ~460–480nm; ACCENT warm 570–600nm; HIGHLIGHT ~480–500nm.' },
  { name: 'sandstone + espresso', primary: 'sandstone', accent: 'espresso', highlight: 'sunlit sand', spectral: 'PRIMARY ~560–590nm; ACCENT low reflectance; HIGHLIGHT ~580–590nm.' },
  { name: 'glacier teal + pewter', primary: 'glacier teal', accent: 'pewter', highlight: 'ice mint', spectral: 'PRIMARY peak ~495–510nm; ACCENT metallic neutral; HIGHLIGHT ~510–520nm.' },
  { name: 'ultramarine haze + gold', primary: 'ultramarine haze', accent: 'gold', highlight: 'pale cyan', spectral: 'PRIMARY peak ~440–460nm; ACCENT warm metallic; HIGHLIGHT ~500–520nm.' },
  { name: 'peach noir + graphite', primary: 'peach noir', accent: 'graphite', highlight: 'soft champagne', spectral: 'PRIMARY ~560–590nm; ACCENT low reflectance; HIGHLIGHT ~560–580nm.' },
  { name: 'forest emerald + copper', primary: 'forest emerald', accent: 'copper', highlight: 'green glow', spectral: 'PRIMARY peak ~520–540nm; ACCENT warm metallic 580–610nm; HIGHLIGHT ~540–560nm.' },
  { name: 'silicon gray + neon cyan', primary: 'silicon gray', accent: 'neon cyan', highlight: 'cool chrome', spectral: 'PRIMARY neutral; ACCENT peak ~490–510nm; HIGHLIGHT broadband cool.' },
  { name: 'midnight plum + rose gold', primary: 'midnight plum', accent: 'rose gold', highlight: 'lavender sheen', spectral: 'PRIMARY peak ~420–440nm; ACCENT warm metallic 570–600nm; HIGHLIGHT ~430–450nm.' },
  { name: 'turquoise smoke + titanium', primary: 'turquoise smoke', accent: 'titanium', highlight: 'sea glass', spectral: 'PRIMARY peak ~495–510nm; ACCENT metallic neutral; HIGHLIGHT ~510–520nm.' },
  { name: 'sunray gold + charcoal', primary: 'sunray gold', accent: 'charcoal', highlight: 'amber spark', spectral: 'PRIMARY ~560–590nm; ACCENT low reflectance; HIGHLIGHT ~580–600nm.' },
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
  const physics = fallback
    ? `PHYSICS-ONLY GARMENT SPEC: panel thickness 0.3–0.6mm with lining 0.2–0.4mm; strap width ${m.strapWidthMm}mm; cutout ellipse major ${m.cutoutMajorMm}mm × minor ${m.cutoutMinorMm}mm; cutout rise ${m.cutoutRiseMm}mm toward iliac crest; neckline plunge depth ${m.plungeDepthMm}mm with apex ${m.navelOffsetMm}mm above the lower-abdomen reference; neckline angle ${m.necklineAngleDeg}°; bridge span ${m.bridgeSpanMm}mm between cutout edges; negative-space ratio ${m.negSpacePercent}% of front panel; sheer illusion mesh thickness 0.2–0.4mm; seam pitch ${m.seamPitchMm}mm with stitch length ${m.stitchLengthMm}mm; panel bias angle ${m.panelBiasDeg}°; boning width ${m.boningWidthMm}mm; clasp width ${m.claspWidthMm}mm; reinforcement tape follows cutout edges with 1–2mm shadow offset; lace motif geometry: ${variation.laceMotif}; tension gradient strongest at strap anchors and relaxes toward hem. Motif physics: ${variation.motif.physics}.`
    : `PHYSICS-ONLY GARMENT SPEC: panel thickness 0.3–0.6mm with lining 0.2–0.4mm; strap width ${m.strapWidthMm}mm; cutout ellipse major ${m.cutoutMajorMm}mm × minor ${m.cutoutMinorMm}mm; cutout rise ${m.cutoutRiseMm}mm toward iliac crest; neckline plunge depth ${m.plungeDepthMm}mm with apex ${m.navelOffsetMm}mm above the navel; neckline angle ${m.necklineAngleDeg}°; bridge span ${m.bridgeSpanMm}mm between cutout edges; negative-space ratio ${m.negSpacePercent}% of front panel; sheer illusion mesh thickness 0.2–0.4mm; seam pitch ${m.seamPitchMm}mm with stitch length ${m.stitchLengthMm}mm; panel bias angle ${m.panelBiasDeg}°; boning width ${m.boningWidthMm}mm; clasp width ${m.claspWidthMm}mm; reinforcement tape follows cutout edges with 1–2mm shadow offset; lace motif geometry: ${variation.laceMotif}; tension gradient strongest at strap anchors and relaxes toward hem. Motif physics: ${variation.motif.physics}.`;
  return { color, brief, material, micro, physics };
}

const CAMERA_BLOCK = `CAMERA SENSOR PHYSICS: Canon EOS R5 II full-frame 45MP BSI-CMOS; RF 50mm f/1.2 (or 85mm) shot at f/1.4–f/2.0; focus distance matches framing (2–6m) with shallow DOF and natural bokeh. ISO 800–3200 with visible luminance grain and subtle chroma noise in shadows; shutter ~1/125s with slight motion blur on moving fingers. Dual-pixel AF locked on nearest iris. Mild vignetting; subtle CA at high-contrast edges. No flash; available light only.`;

const LIGHT_BLOCK = `3D LIGHT TRANSPORT: underwater pool LEDs 4200–4800K (cool spill), warm candle/lantern/torch points 1800–2400K (warm spec), architectural uplights 2700–3200K, ambient sky/city 5000–6500K. Deep shadow side, warm bounce off wet stone, faint mist scatter, AO at body‑deck contact.`;

const SKIN_BLOCK = `SKIN BIO-OPTICAL RENDERING: natural subsurface scattering, visible pores and fine expression lines, no smoothing. T-zone sheen, faint vellus hair rim-light, tiny perspiration micro-specs. Preserve face, bone structure, and eye color exactly.`;

const NO_TOUCH_BLOCK = `SUBJECT IS SOLO: No other people touching or overlapping her. No extra arms or hands near her shoulders or body. Keep both shoulders clear. No stray hands in frame behind her. Background patrons, if present, are distant and fully separated.`;

const IMPERFECTIONS_BLOCK = `RAW IMPERFECTIONS: visible ISO grain, mild CA, faint flare ghosts, slight barrel distortion, tiny highlight bloom; no retouching.`;

const CLOTH_PHYSICS_BLOCK = `CLOTH + BODY PHYSICS (3x): orthotropic stretch with distinct warp/weft response; Poisson ratio 0.25–0.35; surface mass 180–260 g/m². Wet fabric adds 6–12% effective weight and dampens flutter; capillary adhesion from a thin water film (20–80um) increases cling along abdomen/hip. Leg openings show bias stretch and a 2–4mm outward curl with visible edge thickness; bonded edges keep curvature stable. Bending stiffness varies by panel; shear distortion appears where fabric wraps the hip and underbust; compressive buckling appears as shallow micro-folds on the inner waist. Strap bridges indent skin with subtle compression and rebound; strap-skin friction mu_s 0.45–0.60, mu_k 0.35–0.45; seam puckering at stitch lines under tension; microfold wavelengths 8–20mm at waist/hip. Tension gradients flow from strap anchors through neckline stays into the waist seam; no slack bridges. Satin shows anisotropic highlights aligned to weave; matte panels show broader diffuse lobes with lower peak spec.`;

const SCENE_PHYSICS_BLOCK = `ENVIRONMENT PHYSICS (3x): water surface uses multi-scale ripples (small capillary + low-frequency swell); meniscus curls at pool edge; caustics move across stone with wave curvature. Beer-Lambert absorption gives depth tint; shallow areas show brighter cyan with faster caustic motion. Wet deck shows glossy micro-puddles with sharp spec cores and roughness halos; reflections obey Fresnel and distort with ripples. Mist has depth-varying extinction; candle glow produces localized volumetric bloom; droplets on rails/loungers refract tiny highlights.`;

const OPTICS_BLOCK = `OPTICAL SURFACES: marble = glossy dielectric with sharp reflections; mirrors show slight distortion/ghosting; glass stems show caustic streaks and internal reflection; metal rails show tight specular bands with faint dispersion. IF the concept calls for an underwater or split-level waterline viewpoint: use a realistic underwater housing/port, respect refraction at the port and surface, show Snell's window and total internal reflection outside it, and keep underwater contrast slightly reduced with plausible color shift.`;

const MICROSTRUCTURE_BLOCK = `MATERIAL MICROSTRUCTURE: visible weave frequency, subtle moire; fiber sparkle in satin highlights; sheer inserts show clean edges and soft diffusion.`;

const CONTACT_PRESSURE_BLOCK = `CONTACT + PRESSURE: micro-occlusion at seams, slight skin displacement at strap anchors, pressure gradients soften toward edges; keep natural micro-shadowing.`;

const SPECTRAL_PHYSICS_BLOCK = `SPECTRAL + POLARIZATION: satin highlights show polarization dimming; thin-film areas show soft interference bands; haze scatters warmer near-field, cooler far-field.`;

const SULTRY_MOOD_BLOCK = `GLAMOUR EDITORIAL MOOD: high-end poolside fashion editorial with confident gaze and natural expression; refined, cinematic, real-world candids (no exaggerated faces).`;

const PHYSICS_INNOVATION_BLOCK = `PHYSICS INNOVATION PRIORITY (3x): energy-conserving GGX/Smith microfacet BRDF with correct Fresnel roll-off (IOR 1.38–1.50 for synthetic fibers), anisotropic lobes aligned to weave direction, and multi-scattering compensation (Heitz-style) to avoid energy loss. Multi-layer cloth: diffuse base + sheen lobe + clear-coat micro-gloss; spectral response stable under mixed tungsten/neon. Secondary bounce GI visible in metallic hardware and wet stone; subsurface diffusion in skin and stone is subtle but present. Cloth simulated as mass-spring with realistic bend + shear + in-plane stretch, including contact friction against skin (mu 0.35–0.45) and collision thickness; seam tape acts as stiffened beams with torsion resistance. Preserve micro-occlusion at seams, visible edge thickness at cutouts, and stitch-level shadowing. Water/stone interactions obey Fresnel and micro-roughness maps; caustics remain coherent with wave motion; water IOR 1.333 and surface normal micro-variance are respected.`;
const WET_INTERACTION_BLOCK = `WET INTERACTION: thin water film on skin produces tight specular streaks; micro droplets bead on lace filaments and settle in concave weave cells; capillary bridges along cutout edges create darker wet lines; wet-to-dry transitions show a subtle roughness gradient.`;

const MEASURED_CONSTRAINTS_BLOCK = `MEASURED CONSTRAINTS: strap compression 1–3mm; seam puckering 1–2mm; hem curl 2–4mm; cutout edge thickness 0.6–1.2mm; fabric thickness 0.3–0.6mm with lining 0.2–0.4mm; microfold wavelengths 8–20mm; specular roughness 0.08–0.22; negative‑space ratio 45–60% with continuous load paths; bridge span 22–45mm; neckline angle 78–90°.`;

const CREATIVE_ATTIRE_BLOCK = `CREATIVE ATTIRE: every attempt must be a new couture lace‑swimsuit design plus a new colorway. Do not reuse layouts. Vary motif, seam map, plunge/cutouts, hardware/harness routing, and surface treatment; stay luxe and coverage‑safe.`;

const PHYSICS_ONLY_ATTIRE_BLOCK = `PHYSICS-FIRST ATTIRE: prioritize dimensions, curvature, tension, stiffness, load paths, stitch pitch, stretch/shear response, edge binding tension, and compression fit. Keep aesthetic wording concise except lace‑motif IDs that support physics.`;

// Keep this "daring" in an engineering sense (geometry/tension), not in sexualized language.
const DARING_CUT_BLOCK = `ENGINEERED NECKLINE + CUTOUTS: deep V or keyhole stabilized by illusion mesh; narrow center bridge supported by internal stays; anchored side windows with reinforced edges; open back to mid‑waist. Maintain full coverage via opaque lined panels (no explicit nudity; no see‑through).`;

const NEGATIVE_SPACE_BLOCK = `NEGATIVE-SPACE GEOMETRY: front-panel void ratio 35–50% with continuous load paths; cutout edges reinforced and beveled; tension lines radiate from strap anchors and converge toward the waist seam.`;
const NEGATIVE_SPACE_MAX_BLOCK = `NEGATIVE-SPACE (MAX): front-panel void ratio 45–60% with continuous load paths; cutout edges reinforced and beveled; tension lines radiate from strap anchors and converge toward the waist seam; strap bridges remain under high tension without warping.`;

const AIRFLOW_PHYSICS_BLOCK = `AIRFLOW + HEAT: subtle HVAC airflow lifts a few hair strands; candle heat shimmer distorts background highlights; micro-cloth flutter at loose edges.`;

const WARDROBE_CONSTRUCTION_BLOCK = `WARDROBE CONSTRUCTION: internal boning and micro-stays stabilize the neckline; hidden clear tape prevents slip. Seams align to body landmarks with subtle stitch puckering; clasp hardware shows tiny specular edges; closures sit under tension without warping the fabric.`;

const SAFETY_BLOCK = `FASHION SAFETY: daring couture swimwear but fully covered; no explicit nudity; no see-through.`;

const LIGHT_TRANSPORT_DEEP_BLOCK = `LIGHT TRANSPORT: multi‑bounce radiance; tungsten pools hard falloff, neon spill adds wavelength tint. Specular obeys Fresnel; diffuse bounce warms near‑field. Haze adds soft halos; reflection sharpness varies with micro‑roughness.`;

const MATERIAL_MECHANICS_BLOCK = `MATERIAL MECHANICS (3x): orthotropic cloth with warp/weft stiffness; Young’s modulus 0.2–1.2 GPa, shear 0.05–0.25 GPa, bending 0.4–1.6 N·mm. Damping 0.08–0.18; density 0.9–1.2 g/cm³; seam tape adds localized stiffness 1.5–2.5x. Seams act as stiffened beams with torsional resistance; collision thickness prevents interpenetration. Edge binding tension keeps cutouts stable; fasteners carry tensile loads without warping.`;

const SENSOR_PIPELINE_BLOCK = `SENSOR PIPELINE: raw Bayer demosaic; preserve noise floor; gentle S‑curve rolloff; no beauty smoothing; keep micro‑contrast at pores and weave.`;

const FIT_TAILORING_BLOCK = `BESPOKE FIT (TAILORED TO THIS WOMAN): garment is drafted to her exact torso/waist/hip proportions, with contour seams aligned to her natural body landmarks. Bust shaping uses narrow‑span cups + internal stays + tensioned mesh to support a deep plunge without slip; waist suppression is subtle but precise; hip line follows her curvature without gapping. Strap tension and seam alignment are tuned to her posture and pose, producing realistic micro‑compression and rebound at anchor points.`;

const BIOMECH_BLOCK = `BIOMECHANICS: posture and pose remain identical, but fabric load paths respond to gravity and body curvature. Straps carry tensile load; seams carry shear; cutout edges behave as stiffened beams. The dress is stable without slipping; tension gradients are strongest at anchors and relax toward hem.`;

const ANATOMY_ANCHOR_BLOCK = `ANATOMY ANCHORS: neckline apex aligns just above the navel; strap anchors align to clavicle and posterior deltoid; waist seam aligns to her natural waist; hip cutout apex aligns near iliac crest. No geometry should drift off these landmarks.`;

const ATTIRE_GEOMETRY_DEEP_BLOCK = `GARMENT GEOMETRY DEEP DIVE: define curvature radii along the neckline lip (18–40mm), underbust arc (22–40mm), armhole arcs (35–60mm), and cutout edges (20–55mm). Edge bevels are 0.6–1.2mm with visible thickness. Load paths: straps -> neckline stays -> waist seam -> hip anchors. Keep continuous tensile paths; no slack bridges.`;

const COLOR_METAMERISM_BLOCK = `COLOR + METAMERISM: color appearance must remain stable under mixed tungsten/neon lighting; metallic highlights shift hue subtly with angle due to thin-film interference; avoid flat color patches.`;

const SCENE_CAUSTICS_BLOCK = `SCENE CAUSTICS: pool water casts moving caustic patterns on stone and nearby surfaces; wet deck shows glossy specular streaks; glassware shows small refractive streaks.`;

const SWIMSUIT_BLOCK = `LACE SWIMWEAR (PHYSICS): couture lace one‑piece with an engineered deep V or keyhole; supportive illusion-mesh stabilization; anchored side windows; open back to mid‑waist; micro-rings/grommets/buckles that visibly carry load. Lace motif and cutout map must be unique each attempt. Coverage must remain intact via opaque lined panels (no explicit nudity; no see‑through).`;
const SAFE_SWIMSUIT_BLOCK = SWIMSUIT_BLOCK;

// Higher-signal physics guidance for realism without pushing safety boundaries.
const SWIMWEAR_PHYSICS_BLOCK = `SWIMWEAR PHYSICS (MANDATORY): wet fabric adhesion via surface tension; lace and mesh tension gradients strongest at anchors, relaxing between; bonded edge thickness 0.6–1.2mm with bevel; ring/grommet connectors show micro-speculars and contact pressure; water droplets create micro-caustic highlights; wet coping/deck show realistic spec streaks and damp micro-pitting; no plastic skin, no smoothing.`;

const EDGY_ATTITUDE_BLOCK = `EDGY ATTITUDE: confident, nightlife‑forward energy; bold presence with steady eye contact and controlled power.`;
const POSE_TENSION_BLOCK = `POSE ENERGY: within the specified pose, engage shoulders/core/hips with subtle tension; keep it natural and anatomically plausible.`;
// Removed: "AGGRESSIVE SEDUCTION" phrasing tends to correlate with model safety blocks.
const PLUNGE_ENGINEERING_BLOCK = `PLUNGE ENGINEERING: opaque micro‑cups with internal stays + tensioned mesh cradle the plunge; narrow center gore 6–12mm; underbust contour seam carries load; no slippage or gaping; coverage maintained.`;
const HIP_CUTOUT_BLOCK = `HIP CUTOUT GEOMETRY: high‑cut hips with cutout apex 2–5mm from iliac crest; bonded edge thickness 0.6–1.2mm; strap bridges 3–6mm under high tension; negative space reads extreme but stable.`;

const SCENE_BASE = `LUXURY POOL SETTING (BASE): high-end private luxury pool environment. Follow the concept-specific location, architecture, materials, props, and time-of-day. Wet surfaces, believable reflections, and pool-caustics where visible.`;

const POSE_PHYSICS_BLOCK = `POSE + CONTACT PHYSICS: anatomically plausible joint angles, balanced center of mass, believable contact pressure on deck/rail/lounger/waterline; no extra limbs; hands/feet count correct; no extra fingers; no fused hands.`;

const SCENE_SPECTACLE_BLOCK = `SCENE DESIGN + PHYSICS: underwater LED gradients, wet-deck speculars, rippling caustics on nearby surfaces, subtle haze; reflections obey Fresnel and distort with wave curvature.`;

const SEDUCTIVE_SCENE_BLOCK = `GLAMOUR SCENE: fire bowls + candles, chilled champagne on marble, plush loungers angled toward camera, soft poolside lanterns. Warm light pools against cool water glow; intimate, cinematic, uncrowded.`;

const ALLURE_ATTIRE_BLOCK = `EDITORIAL LINES: engineered deep V or keyhole, narrow stabilized bridge, anchored side windows, open back to mid‑waist; opaque panels maintain coverage. Emphasize tensioned edges, hardware load paths, and couture construction.`;
const SAFE_ALLURE_ATTIRE_BLOCK = `EDITORIAL FIT: bold couture lines, sculpted waist, high‑cut legline; coverage intact with opaque panels.`;
const SENSUAL_INVITATION_BLOCK = `EDITORIAL TONE: intimate but tasteful, refined, cinematic. Subject reads confident and magnetic; lighting and textures feel luxe and real (no explicit content).`;
const SAFE_DARING_CUT_BLOCK = `NECKLINE + CUTOUTS (SAFE): deep V neckline with narrow center gore, supportive mesh stabilization, and anchored side cutouts; open back to mid‑waist; coverage intact.`;
const SAFE_ANATOMY_ANCHOR_BLOCK = `ANATOMY ANCHORS (SAFE): neckline apex aligns to lower sternum; strap anchors align to clavicle and posterior deltoid; waist seam aligns to natural waist; hip cutout apex aligns near iliac crest.`;
const SAFEST_ATTIRE_BLOCK = `ATTIRE (SAFE BASELINE): high‑fashion lace swimwear, fully covered, no explicit content; unique motif and colorway; editorial styling with clean tension paths.`;

const PHYSICS_MAX_START = 601;
const PHYSICS_MAX_END = 620;

function conceptNumber(concept) {
  const n = parseInt((concept?.name || '').split('-')[0], 10);
  return Number.isNaN(n) ? null : n;
}

function isPhysicsMaxConcept(concept) {
  const n = conceptNumber(concept);
  return n !== null && n >= PHYSICS_MAX_START && n <= PHYSICS_MAX_END;
}

const PHYSICS_MAX_TONE_BLOCK = `EDITORIAL TONE (PHYSICS-MAX): documentary-fashion realism, composed and restrained expression, technical believability over stylization; no flirtatious framing language.`;
const PHYSICS_DRIVER_LOCK_BLOCK = `EVENT DRIVER LOCK (MANDATORY): keep exactly one dominant physical driver from the concept scene and at most one secondary support driver; do not add extra spectacle systems.`;
const PHYSICS_CAUSAL_CHAIN_BLOCK = `CAUSAL CHAIN (MANDATORY): explicitly preserve force field -> material response -> optical consequence -> camera evidence. If a detail does not support this chain, omit it.`;
const PHYSICS_CAMERA_EVIDENCE_BLOCK = `CAMERA EVIDENCE (MANDATORY): realism must be provable in-frame via coherent seam tension, wet/dry roughness separation, and highlight behavior consistent with lens/exposure settings.`;
const PHYSICS_ARTIFACT_EXCLUSION_BLOCK = `ARTIFACT EXCLUSIONS (HARD): no floating straps, no seam discontinuity, no texture swimming, no impossible reflections, no over-smoothed skin, no non-manifold garment geometry.`;
const DARING_5X_ALLURE_BLOCK = `ATTIRE INTENT (5X DARING): architectural couture swimwear with high-risk-looking engineering stabilized by hidden structure; severe linework, aggressive negative-space carving, and assertive high-cut geometry while preserving coverage-safe opaque support zones.`;
const DARING_5X_BLOCK = `ENGINEERED SILHOUETTE (5X DARING): plunge apex extends to navel line with rigid internal stabilization; side windows are larger and vertically stacked; open-back span reaches lower waist; bridge members are ultra-narrow but visibly tensioned and structurally plausible.`;
const DARING_5X_PLUNGE_BLOCK = `PLUNGE ENGINEERING (5X): plunge depth 300–360mm to navel line with center gore 4–9mm, dual hidden stays, tensioned mesh cradle, and underbust load transfer seam; zero slip, zero gaping, coverage-safe opaque support remains intact.`;
const DARING_5X_HIP_BLOCK = `HIP CUTOUT GEOMETRY (5X): high-cut legline with cutout apex 0–3mm from iliac crest, bridge width 2–5mm, bonded edge thickness 0.6–1.1mm; strong tension gradients at anchors with stable deformation.`;
const DARING_5X_NEGATIVE_SPACE_BLOCK = `NEGATIVE-SPACE (5X DARING): front and lateral void ratio 58–72% with uninterrupted load paths; beveled reinforced edges; strap bridges operate under high tension without twisting or buckling.`;
const PHYSICS_STANDARD_V2_BLOCK = `PHYSICS STANDARD V2 (MANDATORY): enforce causal coherence and energy plausibility. Highlights must map to explicit light sources only; shadows must share consistent direction families; caustics must remain wave/geometry-coupled; no orphan reflections, no contradictory rim lights, no non-causal glow halos.`;
const PHYSICS_MATERIAL_CAL_BLOCK = `MATERIAL CALIBRATION (MANDATORY): effective fabric areal density 160–280 g/m²; stretch response anisotropic with larger weft elongation than warp; wet-state mass increase 4–10%; bonded seam extension remains below adjacent panel strain; edge curl magnitude stays in 1–4mm regime unless mechanically constrained.`;
const PHYSICS_FLUID_CAL_BLOCK = `FLUID CALIBRATION (MANDATORY): water film thickness varies 10–120um; droplet radii distributed from 0.15–2.0mm; meniscus forms at boundaries; rivulet paths follow gravity and local surface curvature; splashes and spray show depth-dependent blur and plausible ballistic arcs.`;
const PHYSICS_OPTICS_CAL_BLOCK = `OPTICS CALIBRATION (MANDATORY): water IOR ~1.333, glass ~1.5; wet regions show lower roughness and narrower specular lobes than dry regions; Fresnel gain increases at grazing angles; mixed CCT lighting preserves neutral skin baseline while permitting controlled colored spill.`;
const PHYSICS_VALIDATION_GATE_BLOCK = `VALIDATION GATE (FAIL IF ANY BREAK): (1) seam tension continuity visible, (2) wet/dry roughness separation visible, (3) primary event driver visibly affects material and light, (4) reflection/refraction geometry is source-consistent, (5) no listed artifacts.`;
const PHYSICS_CAMERA_COMPACT_BLOCK = `CAMERA EVIDENCE CORE: full-frame capture, shallow-DOF natural optics, available-light exposure, visible ISO grain, and physically consistent highlight rolloff.`;
const PHYSICS_LIGHT_COMPACT_BLOCK = `LIGHT TRANSPORT CORE: one coherent key family plus controlled support spill; shadow-direction consistency; wet specular tracks tied only to actual emitters.`;
const PHYSICS_SENSOR_COMPACT_BLOCK = `RAW PIPELINE CORE: mild CA/vignette/compression and preserved microcontrast in pores, seams, and lace thread relief (no beauty smoothing).`;
const PHYSICS_CLOTH_COMPACT_BLOCK = `CLOTH CORE: anisotropic stretch/shear, anchor-to-seam tension continuity, visible edge thickness, local bridge compression/rebound, and stable motif scale under deformation.`;

function buildPromptPassA(concept, expression, variation, fallback = false) {
  const variationLine = variation
    ? `\nVARIATION TAG (UNIQUE): ${variation.theme.name} | ${variation.vibe.name} | ${variation.colorway.name} | ${variation.motif.name}\n`
    : '';
  const physicsMax = isPhysicsMaxConcept(concept);
  const design = variation ? composeDesignSpec(concept, variation, fallback) : { color: '', brief: '', material: fallback ? concept.materialFallback : concept.material };
  const physicsMaxPrimary = physicsMax && !fallback;
  const swimsuitBlock = fallback ? SAFE_SWIMSUIT_BLOCK : SWIMSUIT_BLOCK;
  const allureBlock = physicsMaxPrimary ? DARING_5X_ALLURE_BLOCK : (fallback ? SAFE_ALLURE_ATTIRE_BLOCK : ALLURE_ATTIRE_BLOCK);
  const daringBlock = physicsMaxPrimary ? DARING_5X_BLOCK : (fallback ? SAFE_DARING_CUT_BLOCK : DARING_CUT_BLOCK);
  const plungeBlock = physicsMaxPrimary ? DARING_5X_PLUNGE_BLOCK : PLUNGE_ENGINEERING_BLOCK;
  const hipBlock = physicsMaxPrimary ? DARING_5X_HIP_BLOCK : HIP_CUTOUT_BLOCK;
  const negativeSpaceBlock = physicsMaxPrimary ? DARING_5X_NEGATIVE_SPACE_BLOCK : NEGATIVE_SPACE_MAX_BLOCK;
  const moodBlock = physicsMax ? PHYSICS_MAX_TONE_BLOCK : SULTRY_MOOD_BLOCK;
  const invitationBlock = physicsMax ? '' : SENSUAL_INVITATION_BLOCK;
  const edgyBlock = physicsMax ? '' : EDGY_ATTITUDE_BLOCK;
  const sceneFlavorBlock = physicsMax ? '' : SEDUCTIVE_SCENE_BLOCK;
  const physicsMaxContractBlock = physicsMax
    ? `${PHYSICS_DRIVER_LOCK_BLOCK}\n${PHYSICS_CAUSAL_CHAIN_BLOCK}\n${PHYSICS_CAMERA_EVIDENCE_BLOCK}\n${PHYSICS_ARTIFACT_EXCLUSION_BLOCK}`
    : '';
  const physicsStandardBlock = physicsMax
    ? `${PHYSICS_STANDARD_V2_BLOCK}\n${PHYSICS_MATERIAL_CAL_BLOCK}\n${PHYSICS_FLUID_CAL_BLOCK}\n${PHYSICS_OPTICS_CAL_BLOCK}\n${PHYSICS_VALIDATION_GATE_BLOCK}`
    : '';
  if (fallback) {
    return `Generate an image of this photograph edited into a raw real-life luxury pool photograph indistinguishable from an unretouched candid shot from a real poolside night. Subject is an adult woman (21+). Preserve exact identity, face, bone structure, eyes, nose, mouth, and age. Use the photo as an identity reference; allow a different full-body pose. Expression: ${expression}. Change outfit and environment as described. Avoid retouching.

INVARIANTS:
- Preserve exact identity/face/age; keep the specified expression: ${expression}.
- Pose must be different for this concept; follow POSE DIRECTIVE precisely with realistic anatomy and camera physics.
- Only change environment + outfit; subject is solo; no retouching.
ENVIRONMENT: ${SCENE_BASE} ${concept.scene}
POSE DIRECTIVE (DIFFERENT EACH IMAGE): ${concept.pose}
${POSE_PHYSICS_BLOCK}

${moodBlock}
${invitationBlock}
${edgyBlock}
${POSE_TENSION_BLOCK}

${SCENE_SPECTACLE_BLOCK}
${sceneFlavorBlock}
${physicsMaxContractBlock}
${physicsStandardBlock}

${CREATIVE_ATTIRE_BLOCK}
${PHYSICS_ONLY_ATTIRE_BLOCK}
${swimsuitBlock}
${SWIMWEAR_PHYSICS_BLOCK}
${allureBlock}
${variationLine}

${design.brief}
${design.color}
${design.physics}

${daringBlock}
${plungeBlock}
${hipBlock}
${negativeSpaceBlock}
${FIT_TAILORING_BLOCK}

GARMENT GEOMETRY (COVERAGE + CUTOUTS): ${concept.geometry}
GARMENT MATERIAL CLASS (MACRO PHYSICS): ${design.material}

${NO_TOUCH_BLOCK}

${CAMERA_BLOCK}
${SENSOR_PIPELINE_BLOCK}
${IMPERFECTIONS_BLOCK}

${LIGHT_BLOCK}

${SKIN_BLOCK}

${CLOTH_PHYSICS_BLOCK}
${WET_INTERACTION_BLOCK}
${CONTACT_PRESSURE_BLOCK}

${PHYSICS_INNOVATION_BLOCK}

${SAFETY_BLOCK}`;
  }
  return `Generate an image of this photograph edited into an ultra-raw real-life luxury pool photograph indistinguishable from an unretouched candid shot from a real poolside night. Raw documentary poolside photography. Subject is an adult woman (21+). Preserve exact identity, face, bone structure, eyes, nose, mouth, and age. Use the photo as an identity reference; allow a different full-body pose. Expression: ${expression}. Change outfit and environment as described. Avoid retouching.

INVARIANTS:
- Preserve exact identity/face/age; keep the specified expression: ${expression}.
- Pose must be different for this concept; follow POSE DIRECTIVE precisely with realistic anatomy and camera physics.
- Only change environment + outfit; subject is solo; no retouching.
ENVIRONMENT: ${SCENE_BASE} ${concept.scene}
POSE DIRECTIVE (DIFFERENT EACH IMAGE): ${concept.pose}
${POSE_PHYSICS_BLOCK}

${moodBlock}
${physicsMaxContractBlock}
${physicsStandardBlock}

${SCENE_SPECTACLE_BLOCK}

${CREATIVE_ATTIRE_BLOCK}
${PHYSICS_ONLY_ATTIRE_BLOCK}
${swimsuitBlock}
${SWIMWEAR_PHYSICS_BLOCK}
${allureBlock}
${variationLine}

${design.brief}
${design.color}
${design.physics}

${daringBlock}
${plungeBlock}
${hipBlock}
${negativeSpaceBlock}
${FIT_TAILORING_BLOCK}

GARMENT GEOMETRY (COVERAGE + CUTOUTS): ${concept.geometry}
GARMENT MATERIAL CLASS (MACRO PHYSICS): ${design.material}

${NO_TOUCH_BLOCK}

${CAMERA_BLOCK}
${SENSOR_PIPELINE_BLOCK}
${IMPERFECTIONS_BLOCK}

${LIGHT_BLOCK}

${SKIN_BLOCK}

${CLOTH_PHYSICS_BLOCK}
${WET_INTERACTION_BLOCK}
${CONTACT_PRESSURE_BLOCK}

${SCENE_PHYSICS_BLOCK}

${OPTICS_BLOCK}


${PHYSICS_INNOVATION_BLOCK}

${SAFETY_BLOCK}`;
}

function buildPromptPassACompact(concept, expression, variation) {
  const physicsMax = isPhysicsMaxConcept(concept);
  const moodBlock = physicsMax ? PHYSICS_MAX_TONE_BLOCK : `${SULTRY_MOOD_BLOCK} ${SENSUAL_INVITATION_BLOCK} ${EDGY_ATTITUDE_BLOCK}`;
  const daringCompactBlock = physicsMax ? `${DARING_5X_ALLURE_BLOCK} ${DARING_5X_BLOCK} ${DARING_5X_PLUNGE_BLOCK} ${DARING_5X_HIP_BLOCK} ${DARING_5X_NEGATIVE_SPACE_BLOCK}` : '';
  const physicsMaxContractBlock = physicsMax
    ? `${PHYSICS_DRIVER_LOCK_BLOCK} ${PHYSICS_CAUSAL_CHAIN_BLOCK} ${PHYSICS_CAMERA_EVIDENCE_BLOCK} ${PHYSICS_ARTIFACT_EXCLUSION_BLOCK}`
    : '';
  const physicsStandardBlock = physicsMax
    ? `${PHYSICS_STANDARD_V2_BLOCK} ${PHYSICS_MATERIAL_CAL_BLOCK} ${PHYSICS_FLUID_CAL_BLOCK} ${PHYSICS_OPTICS_CAL_BLOCK} ${PHYSICS_VALIDATION_GATE_BLOCK}`
    : '';
  const design = variation ? composeDesignSpec(concept, variation, true) : { color: '', brief: '', material: concept.materialFallback };
  return `Generate an image of this photograph edited into a raw, real-life luxury pool photo. Subject is an adult woman (21+). Preserve exact identity, face, bone structure, eyes, nose, mouth, and age. Use the photo as identity reference; allow a different full-body pose. Expression: ${expression}. Subject is solo.

SCENE: ${SCENE_BASE} ${concept.scene}
MOOD: ${moodBlock}
${physicsMaxContractBlock}
${physicsStandardBlock}
POSE (DIFFERENT EACH IMAGE): ${concept.pose}
${POSE_PHYSICS_BLOCK}

ATTIRE (MANDATORY, LACE SWIMSUIT): ${SAFEST_ATTIRE_BLOCK}
${SWIMWEAR_PHYSICS_BLOCK}
${daringCompactBlock}
DESIGN: ${design.brief} ${design.color}
GEOMETRY: ${concept.geometry}
MATERIAL: ${design.material}

CAMERA/LIGHT: ${CAMERA_BLOCK} ${LIGHT_BLOCK}
PHYSICS: ${CLOTH_PHYSICS_BLOCK} ${WET_INTERACTION_BLOCK} ${CONTACT_PRESSURE_BLOCK} ${PHYSICS_INNOVATION_BLOCK}
RAW PIPELINE: ${SENSOR_PIPELINE_BLOCK}
SAFETY: ${SAFETY_BLOCK}
NO RETOUCHING; RAW LOOK.`;
}

function buildPromptPassAUltra(concept, expression, variation) {
  const physicsMax = isPhysicsMaxConcept(concept);
  const safeMoodBlock = 'confident editorial pool portrait tone, calm and poised, non-sexual expression, tasteful high-fashion energy';
  const safeModeAttireGuard = 'SAFE-MODE ATTIRE LOCK (MANDATORY): conservative couture one-piece; neckline stays above the sternum; closed side panels; full back panel to waist; opaque lining under lace overlay; moderate leg line; no plunging neckline; no transparent fabric; no explicit or suggestive framing.';
  const moodBlock = FORCE_SAFE_MODE
    ? safeMoodBlock
    : (physicsMax ? PHYSICS_MAX_TONE_BLOCK : `${SULTRY_MOOD_BLOCK} ${SENSUAL_INVITATION_BLOCK} ${EDGY_ATTITUDE_BLOCK}`);
  const daringUltraBlock = FORCE_SAFE_MODE
    ? ''
    : (physicsMax ? `${DARING_5X_ALLURE_BLOCK} ${DARING_5X_BLOCK} ${DARING_5X_PLUNGE_BLOCK} ${DARING_5X_HIP_BLOCK} ${DARING_5X_NEGATIVE_SPACE_BLOCK}` : '');
  const physicsMaxContractBlock = physicsMax
    ? `${PHYSICS_DRIVER_LOCK_BLOCK} ${PHYSICS_CAUSAL_CHAIN_BLOCK} ${PHYSICS_CAMERA_EVIDENCE_BLOCK} ${PHYSICS_ARTIFACT_EXCLUSION_BLOCK}`
    : '';
  const physicsStandardBlock = physicsMax
    ? `${PHYSICS_STANDARD_V2_BLOCK} ${PHYSICS_MATERIAL_CAL_BLOCK} ${PHYSICS_FLUID_CAL_BLOCK} ${PHYSICS_OPTICS_CAL_BLOCK} ${PHYSICS_VALIDATION_GATE_BLOCK}`
    : '';
  const design = variation ? composeDesignSpec(concept, variation, true) : { color: '', brief: '', material: concept.materialFallback };
  const safeGeometry = `conservative couture one-piece silhouette with high neckline above sternum, closed side panels, full back panel to waist, moderate leg line, reinforced seam architecture, and opaque lined lace overlay (${variation?.laceMotif || 'fine lace filigree'}).`;
  const geometryLine = FORCE_SAFE_MODE ? safeGeometry : concept.geometry;
  const materialLine = FORCE_SAFE_MODE
    ? `${design.material} Opaque-lined coverage only; no transparent zones; no deep plunge; no open-back cutout geometry.`
    : design.material;
  return `Generate an image of this photograph edited into a raw, real-life luxury pool photo. Subject is an adult woman (21+). Preserve exact identity, face, bone structure, eyes, nose, mouth, age. Use the photo as identity reference; allow a different full-body pose. Expression: ${expression}. Subject is solo.

SCENE: ${SCENE_BASE} ${concept.scene}
MOOD: ${moodBlock}
${physicsMaxContractBlock}
${physicsStandardBlock}
POSE (DIFFERENT EACH IMAGE): ${concept.pose}
${POSE_PHYSICS_BLOCK}

ATTIRE (MANDATORY): ${SAFEST_ATTIRE_BLOCK}
${SWIMWEAR_PHYSICS_BLOCK}
${daringUltraBlock}
${FORCE_SAFE_MODE ? safeModeAttireGuard : ''}

GEOMETRY: ${geometryLine}
MATERIAL: ${materialLine}
COLOR: ${design.color}

CAMERA/LIGHT: ${CAMERA_BLOCK} ${LIGHT_BLOCK}
RAW PIPELINE: ${SENSOR_PIPELINE_BLOCK}
IMPERFECTIONS: ${IMPERFECTIONS_BLOCK}
SAFETY: fully covered; no explicit nudity; no see-through. Raw, unretouched realism.`;
}

function buildPromptPassASafeEmergency(concept, expression, variation) {
  const design = variation ? composeDesignSpec(concept, variation, true) : { color: '', brief: '', material: concept.materialFallback };
  const safeGeometry = `conservative couture one-piece silhouette with high neckline above sternum, closed side panels, full back panel to waist, moderate leg line, reinforced seam architecture, and opaque lined lace overlay (${variation?.laceMotif || 'fine lace filigree'}).`;
  return `Generate an image of this photograph edited into a raw, real-life luxury pool photo. Subject is an adult woman (21+). Preserve exact identity, face, bone structure, eyes, nose, mouth, and age. Use the photo as identity reference; allow a different full-body pose. Expression: ${expression}. Subject is solo.

SCENE: ${SCENE_BASE} ${concept.scene}
POSE (DIFFERENT EACH IMAGE): ${concept.pose}
${POSE_PHYSICS_BLOCK}

MOOD: calm, poised, tasteful high-fashion editorial portrait; strictly non-sexual framing.
ATTIRE (MANDATORY SAFE): conservative couture one-piece swimsuit with fully opaque lining under lace overlay. Neckline stays above sternum, side panels remain closed, full back panel to waist, moderate leg line, no plunge, no transparent zones, no explicit or suggestive styling.
DESIGN: ${design.brief}
COLOR: ${design.color}
GEOMETRY: ${safeGeometry}
MATERIAL: ${design.material}

CAMERA/LIGHT: ${CAMERA_BLOCK} ${LIGHT_BLOCK}
RAW PIPELINE: ${SENSOR_PIPELINE_BLOCK}
IMPERFECTIONS: ${IMPERFECTIONS_BLOCK}
PHYSICS: ${CLOTH_PHYSICS_BLOCK} ${WET_INTERACTION_BLOCK} ${CONTACT_PRESSURE_BLOCK}
${NO_TOUCH_BLOCK}
SAFETY: fully covered; no explicit nudity; no see-through; no suggestive framing.`;
}

function buildPromptPassAPhysicsMax(concept, expression, variation, fallback = false) {
  if (FORCE_SAFE_MODE) {
    return buildPromptPassASafeEmergency(concept, expression, variation);
  }
  const design = variation ? composeDesignSpec(concept, variation, fallback) : { color: '', brief: '', material: fallback ? concept.materialFallback : concept.material };
  const swimsuitBlock = fallback ? SAFE_SWIMSUIT_BLOCK : SWIMSUIT_BLOCK;
  const allureBlock = fallback ? SAFE_ALLURE_ATTIRE_BLOCK : DARING_5X_ALLURE_BLOCK;
  const daringBlock = fallback ? SAFE_DARING_CUT_BLOCK : DARING_5X_BLOCK;
  const plungeBlock = fallback ? PLUNGE_ENGINEERING_BLOCK : DARING_5X_PLUNGE_BLOCK;
  const hipBlock = fallback ? HIP_CUTOUT_BLOCK : DARING_5X_HIP_BLOCK;
  const negSpaceBlock = fallback ? NEGATIVE_SPACE_MAX_BLOCK : DARING_5X_NEGATIVE_SPACE_BLOCK;
  const variationLine = variation
    ? `VARIATION TAG (UNIQUE): ${variation.theme.name} | ${variation.vibe.name} | ${variation.colorway.name} | ${variation.motif.name}`
    : '';

  return `Generate an image of this photograph edited into a raw, physically coherent luxury pool photograph. Subject is an adult woman (21+). Preserve exact identity, face, bone structure, eyes, nose, mouth, and age. Use the photo as identity reference; allow a different full-body pose. Expression: ${expression}. Subject is solo.

SCENE: ${SCENE_BASE} ${concept.scene}
POSE (DIFFERENT EACH IMAGE): ${concept.pose}
${POSE_PHYSICS_BLOCK}
${PHYSICS_MAX_TONE_BLOCK}

${PHYSICS_DRIVER_LOCK_BLOCK}
${PHYSICS_CAUSAL_CHAIN_BLOCK}
${PHYSICS_STANDARD_V2_BLOCK}
${PHYSICS_MATERIAL_CAL_BLOCK}
${PHYSICS_FLUID_CAL_BLOCK}
${PHYSICS_OPTICS_CAL_BLOCK}

ATTIRE: ${allureBlock}
${swimsuitBlock}
${SWIMWEAR_PHYSICS_BLOCK}
${daringBlock}
${plungeBlock}
${hipBlock}
${negSpaceBlock}
${MEASURED_CONSTRAINTS_BLOCK}
${variationLine}
DESIGN: ${design.brief}
COLOR: ${design.color}
GEOMETRY: ${concept.geometry}
MATERIAL: ${design.material}

CAMERA: ${PHYSICS_CAMERA_COMPACT_BLOCK}
LIGHT: ${PHYSICS_LIGHT_COMPACT_BLOCK}
RAW PIPELINE: ${PHYSICS_SENSOR_COMPACT_BLOCK}
IMPERFECTIONS: ${IMPERFECTIONS_BLOCK}
PHYSICS: ${PHYSICS_CLOTH_COMPACT_BLOCK} ${WET_INTERACTION_BLOCK} ${PHYSICS_FLUID_CAL_BLOCK} ${PHYSICS_OPTICS_CAL_BLOCK}

${PHYSICS_CAMERA_EVIDENCE_BLOCK}
${PHYSICS_ARTIFACT_EXCLUSION_BLOCK}
${PHYSICS_VALIDATION_GATE_BLOCK}
${NO_TOUCH_BLOCK}
${SAFETY_BLOCK}`;
}

function buildPromptPassB(concept, expression, variation, fallback = false) {
  const physicsMax = isPhysicsMaxConcept(concept);
  const physicsMaxPrimary = physicsMax && !fallback;
  const design = variation ? composeDesignSpec(concept, variation, fallback) : { color: '', brief: '', micro: fallback ? concept.microFallback : concept.micro };
  const variationLine = variation
    ? `\nVARIATION TAG (LOCKED): ${variation.theme.name} | ${variation.vibe.name} | ${variation.colorway.name} | ${variation.motif.name}\n`
    : '';
  const swimsuitBlock = fallback ? SAFE_SWIMSUIT_BLOCK : SWIMSUIT_BLOCK;
  const allureBlock = physicsMaxPrimary ? DARING_5X_ALLURE_BLOCK : '';
  const daringBlock = physicsMaxPrimary ? DARING_5X_BLOCK : (fallback ? SAFE_DARING_CUT_BLOCK : DARING_CUT_BLOCK);
  const plungeBlock = physicsMaxPrimary ? DARING_5X_PLUNGE_BLOCK : PLUNGE_ENGINEERING_BLOCK;
  const hipBlock = physicsMaxPrimary ? DARING_5X_HIP_BLOCK : HIP_CUTOUT_BLOCK;
  const negativeSpaceBlock = physicsMaxPrimary ? DARING_5X_NEGATIVE_SPACE_BLOCK : NEGATIVE_SPACE_MAX_BLOCK;
  const anatomyBlock = fallback ? SAFE_ANATOMY_ANCHOR_BLOCK : ANATOMY_ANCHOR_BLOCK;
  const moodBlock = physicsMax ? PHYSICS_MAX_TONE_BLOCK : SULTRY_MOOD_BLOCK;
  const invitationBlock = physicsMax ? '' : SENSUAL_INVITATION_BLOCK;
  const edgyBlock = physicsMax ? '' : EDGY_ATTITUDE_BLOCK;
  const physicsMaxContractBlock = physicsMax
    ? `${PHYSICS_DRIVER_LOCK_BLOCK}\n${PHYSICS_CAUSAL_CHAIN_BLOCK}\n${PHYSICS_CAMERA_EVIDENCE_BLOCK}\n${PHYSICS_ARTIFACT_EXCLUSION_BLOCK}`
    : '';
  const physicsStandardBlock = physicsMax
    ? `${PHYSICS_STANDARD_V2_BLOCK}\n${PHYSICS_MATERIAL_CAL_BLOCK}\n${PHYSICS_FLUID_CAL_BLOCK}\n${PHYSICS_OPTICS_CAL_BLOCK}\n${PHYSICS_VALIDATION_GATE_BLOCK}`
    : '';
  if (fallback) {
    return `Generate an image of this photograph edited from the previous pass. Preserve the same identity, face, pose, framing, expression, and scene. Keep camera, lighting, and color balance unchanged from pass A. Refine only garment microstructure (lace/mesh), swimwear physics, and realistic imperfections. Maintain raw documentary look with no retouching. Expression: ${expression}.

REFINEMENT LOCKS: do not change pose/framing/lighting; preserve garment geometry + coverage.
SCENE (LOCKED): ${SCENE_BASE} ${concept.scene}

${moodBlock}
${invitationBlock}
${physicsMaxContractBlock}
${physicsStandardBlock}

${CREATIVE_ATTIRE_BLOCK}
${PHYSICS_ONLY_ATTIRE_BLOCK}
${swimsuitBlock}
${SWIMWEAR_PHYSICS_BLOCK}
${allureBlock}
${variationLine}
${design.brief}
${design.color}

GARMENT GEOMETRY (UNCHANGED): ${concept.geometry}
MATERIAL MICROSTRUCTURE (MICRO PHYSICS): ${design.micro}
SWIMSUIT REFINEMENT: lace filaments, mesh tension, bonded edge thickness, and micro-shadowing.
${MICROSTRUCTURE_BLOCK}
${CONTACT_PRESSURE_BLOCK}

${daringBlock}
${plungeBlock}
${hipBlock}
${negativeSpaceBlock}
${FIT_TAILORING_BLOCK}
${anatomyBlock}
${ATTIRE_GEOMETRY_DEEP_BLOCK}
${SCENE_CAUSTICS_BLOCK}
${COLOR_METAMERISM_BLOCK}
${physicsMaxContractBlock}
${physicsStandardBlock}

${NO_TOUCH_BLOCK}

${CAMERA_BLOCK}

${LIGHT_BLOCK}

${SKIN_BLOCK}

${CLOTH_PHYSICS_BLOCK}
${WET_INTERACTION_BLOCK}

${OPTICS_BLOCK}

${PHYSICS_INNOVATION_BLOCK}

${SAFETY_BLOCK}`;
  }
  return `Generate an image of this photograph edited from the previous pass. Preserve the same identity, face, pose, framing, expression, and scene. Keep camera, lighting, and color balance unchanged from pass A. Refine only garment microstructure (lace/mesh), swimwear physics, and realistic imperfections. Maintain raw documentary look with no retouching. Expression: ${expression}.

REFINEMENT LOCKS: do not change pose/framing/lighting; preserve garment geometry + coverage.
SCENE (LOCKED): ${SCENE_BASE} ${concept.scene}

${CREATIVE_ATTIRE_BLOCK}
${PHYSICS_ONLY_ATTIRE_BLOCK}
${swimsuitBlock}
${SWIMWEAR_PHYSICS_BLOCK}
${allureBlock}
${variationLine}
${design.brief}
${design.color}

GARMENT GEOMETRY (UNCHANGED): ${concept.geometry}
MATERIAL MICROSTRUCTURE (MICRO PHYSICS): ${design.micro}
SWIMSUIT REFINEMENT: lace filaments, mesh tension, bonded edge thickness, and micro-shadowing.
${MICROSTRUCTURE_BLOCK}
${CONTACT_PRESSURE_BLOCK}

${daringBlock}
${plungeBlock}
${hipBlock}
${negativeSpaceBlock}
${FIT_TAILORING_BLOCK}
${anatomyBlock}
${ATTIRE_GEOMETRY_DEEP_BLOCK}
${SCENE_CAUSTICS_BLOCK}
${COLOR_METAMERISM_BLOCK}

${moodBlock}
${edgyBlock}
${invitationBlock}
${physicsMaxContractBlock}
${physicsStandardBlock}

${NO_TOUCH_BLOCK}

${CAMERA_BLOCK}

${LIGHT_BLOCK}

${SKIN_BLOCK}

${CLOTH_PHYSICS_BLOCK}
${WET_INTERACTION_BLOCK}

${SCENE_PHYSICS_BLOCK}

${OPTICS_BLOCK}


${PHYSICS_INNOVATION_BLOCK}

${SAFETY_BLOCK}
`;
}

function buildPromptPassBPhysicsMax(concept, expression, variation, fallback = false) {
  const design = variation ? composeDesignSpec(concept, variation, fallback) : { color: '', brief: '', micro: fallback ? concept.microFallback : concept.micro };
  const swimsuitBlock = fallback ? SAFE_SWIMSUIT_BLOCK : SWIMSUIT_BLOCK;
  const allureBlock = fallback ? SAFE_ALLURE_ATTIRE_BLOCK : DARING_5X_ALLURE_BLOCK;
  const daringBlock = fallback ? SAFE_DARING_CUT_BLOCK : DARING_5X_BLOCK;
  const plungeBlock = fallback ? PLUNGE_ENGINEERING_BLOCK : DARING_5X_PLUNGE_BLOCK;
  const hipBlock = fallback ? HIP_CUTOUT_BLOCK : DARING_5X_HIP_BLOCK;
  const negSpaceBlock = fallback ? NEGATIVE_SPACE_MAX_BLOCK : DARING_5X_NEGATIVE_SPACE_BLOCK;
  const variationLine = variation
    ? `VARIATION TAG (LOCKED): ${variation.theme.name} | ${variation.vibe.name} | ${variation.colorway.name} | ${variation.motif.name}`
    : '';

  return `Generate an image of this photograph edited from the previous pass. Preserve identity, pose, framing, scene, camera, and lighting. Refine only microstructure and physically causal interactions.

SCENE (LOCKED): ${SCENE_BASE} ${concept.scene}
${PHYSICS_MAX_TONE_BLOCK}
${PHYSICS_DRIVER_LOCK_BLOCK}
${PHYSICS_CAUSAL_CHAIN_BLOCK}
${PHYSICS_STANDARD_V2_BLOCK}

ATTIRE (LOCKED GEOMETRY, REFINED MICRO): ${allureBlock}
${swimsuitBlock}
${SWIMWEAR_PHYSICS_BLOCK}
${daringBlock}
${plungeBlock}
${hipBlock}
${negSpaceBlock}
${variationLine}
GEOMETRY (UNCHANGED): ${concept.geometry}
MACRO DESIGN (LOCKED): ${design.brief}
COLOR (LOCKED): ${design.color}
MICRO MATERIAL PHYSICS: ${design.micro}
${MICROSTRUCTURE_BLOCK}
${CONTACT_PRESSURE_BLOCK}
${MEASURED_CONSTRAINTS_BLOCK}

OPTICS + FLUID: ${PHYSICS_FLUID_CAL_BLOCK} ${PHYSICS_OPTICS_CAL_BLOCK} ${SCENE_PHYSICS_BLOCK} ${OPTICS_BLOCK}
CAMERA EVIDENCE: ${PHYSICS_CAMERA_EVIDENCE_BLOCK}
NO ARTIFACTS: ${PHYSICS_ARTIFACT_EXCLUSION_BLOCK}
VALIDATION: ${PHYSICS_VALIDATION_GATE_BLOCK}
${NO_TOUCH_BLOCK}
${SAFETY_BLOCK}`;
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
  if (!FORCE_SAFE_MODE && !lower.includes('navel') && !lower.includes('high-cut')) {
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

function jitteredRateLimitWaitSeconds() {
  const min = Math.min(RATE_LIMIT_BACKOFF_MIN_S, RATE_LIMIT_BACKOFF_MAX_S);
  const max = Math.max(RATE_LIMIT_BACKOFF_MIN_S, RATE_LIMIT_BACKOFF_MAX_S);
  const spread = Math.max(0, max - min);
  const jitter = Math.floor(Math.random() * (spread + 1));
  return min + jitter;
}

async function callModel(contents, retries = 0, imageOnly = false) {
  const requestBody = {
    contents,
    generationConfig: {
      responseModalities: INCLUDE_TEXT_MODALITY ? ['TEXT', 'IMAGE'] : ['IMAGE'],
      imageConfig: { aspectRatio: '4:5', imageSize: '1K' },
    },
  };

  const client = await auth.getClient();
  const token = await client.getAccessToken();
  let response;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_REQUEST_TIMEOUT_MS);
  try {
    response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeout);
    if (retries >= NETWORK_RETRIES_MAX) {
      throw err;
    }
    const wait = NETWORK_RETRY_WAIT_S;
    const reason = err?.name === 'AbortError'
      ? `Request timeout after ${API_REQUEST_TIMEOUT_MS}ms`
      : `Network error`;
    console.log(`${reason} (${retries + 1}/${NETWORK_RETRIES_MAX}) - waiting ${wait}s...`);
    await new Promise(r => setTimeout(r, wait * 1000));
    return callModel(contents, retries + 1);
  }
  clearTimeout(timeout);

  if (!response.ok) {
    const error = await response.text();
    if (response.status === 429) {
      if (retries >= RATE_LIMIT_RETRIES_MAX) {
        throw new Error(`RATE_LIMIT_RETRY_EXHAUSTED after ${RATE_LIMIT_RETRIES_MAX + 1} attempts`);
      }
      const wait = jitteredRateLimitWaitSeconds();
      console.log(`Rate limited (${retries + 1}/${RATE_LIMIT_RETRIES_MAX}) - waiting ${wait}s (adaptive backoff)...`);
      await new Promise(r => setTimeout(r, wait * 1000));
      return callModel(contents, retries + 1);
    }
    if (response.status >= 500 && retries < SERVER_RETRIES_MAX) {
      const wait = SERVER_RETRY_WAIT_S;
      console.log(`Server error ${response.status} (${retries + 1}/${SERVER_RETRIES_MAX}) - waiting ${wait}s...`);
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
  const physicsMax = isPhysicsMaxConcept(concept);
  const prompt = (FORCE_ULTRA_PASS_A || physicsMax)
    ? buildPromptPassAUltra(concept, expression, variation)
    : buildPromptPassA(concept, expression, variation);
  let promptUsed = prompt;
  const wc = wordCount(prompt);
  const passAMin = (FORCE_ULTRA_PASS_A || physicsMax) ? 500 : 1400;
  const passAMax = (FORCE_ULTRA_PASS_A || physicsMax) ? 1100 : 1500;
  if (wc < passAMin || wc > passAMax) {
      console.log(`WARN: Pass A word count ${wc} outside ${passAMin}-${passAMax} target.`);
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
  logModelDiagnostics(data, 'Pass A');
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
    if (physicsMax) {
      console.log('Pass A physics-max fallback: dense causal prompt...');
    } else {
      console.log('Pass A fallback: simplifying material phrasing...');
    }
    const promptFallback = FORCE_SAFE_MODE
      ? buildPromptPassASafeEmergency(concept, expression, variation)
      : (physicsMax
        ? buildPromptPassAPhysicsMax(concept, expression, variation)
        : buildPromptPassA(concept, expression, variation, true));
    promptUsed = promptFallback;
    validatePrompt(promptFallback, 'Pass A (fallback)');
    const contentsFallback = [{
      role: 'user',
      parts: [
        { text: promptFallback },
        { inlineData: { mimeType, data: base64Image } },
      ],
    }];
    data = await callModel(contentsFallback, 0, true);
    logModelDiagnostics(data, 'Pass A (fallback)');
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
    if (!imageData?.data && (FORCE_ULTRA_PASS_A || physicsMax)) {
      console.log('Pass A physics-max safety fallback: conservative constraints...');
      const promptSafe = FORCE_SAFE_MODE
        ? buildPromptPassASafeEmergency(concept, expression, variation)
        : buildPromptPassAPhysicsMax(concept, expression, variation, true);
      promptUsed = promptSafe;
      validatePrompt(promptSafe, 'Pass A (safety)');
      const contentsSafe = [{
        role: 'user',
        parts: [
          { text: promptSafe },
          { inlineData: { mimeType, data: base64Image } },
        ],
      }];
      data = await callModel(contentsSafe, 0, true);
      logModelDiagnostics(data, 'Pass A (safety)');
      const partsSafe = data.candidates?.[0]?.content?.parts || [];
      imageData = null;
      modelParts = [];
      for (const part of partsSafe) {
        if (part.text && !part.thought) {
          console.log(`Model A(SAFE): ${part.text.substring(0, 100)}...`);
        }
        if (part.inlineData?.data) {
          imageData = part.inlineData;
        }
        modelParts.push(partWithThoughtSignature(part));
      }
      if (!imageData?.data) {
        throw new Error('NO IMAGE generated in pass A (physics-max)');
      }
    } else if (!imageData?.data && !physicsMax) {
      console.log('Pass A compact fallback: minimal prompt + hard constraints...');
      const promptCompact = buildPromptPassACompact(concept, expression, variation);
      promptUsed = promptCompact;
      validatePrompt(promptCompact, 'Pass A (compact)');
      const contentsCompact = [{
        role: 'user',
        parts: [
          { text: promptCompact },
          { inlineData: { mimeType, data: base64Image } },
        ],
      }];
      data = await callModel(contentsCompact, 0, true);
      logModelDiagnostics(data, 'Pass A (compact)');
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
        promptUsed = promptUltra;
        validatePrompt(promptUltra, 'Pass A (ultra)');
        const contentsUltra = [{
          role: 'user',
          parts: [
            { text: promptUltra },
            { inlineData: { mimeType, data: base64Image } },
          ],
        }];
        data = await callModel(contentsUltra, 0, true);
        logModelDiagnostics(data, 'Pass A (ultra)');
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

  return { fp, mimeType: imageData.mimeType || 'image/png', modelParts, variation, promptUsed };
}

async function generatePassB(concept, passA, inputImage, index) {
  const expression = expressions[index % expressions.length];
  const variation = passA.variation || buildVariation();
  const physicsMax = isPhysicsMaxConcept(concept);
  const prompt = physicsMax
    ? buildPromptPassBPhysicsMax(concept, expression, variation)
    : buildPromptPassB(concept, expression, variation);
  const wc = wordCount(prompt);
  const passBMin = physicsMax ? 700 : 1400;
  const passBMax = physicsMax ? 1150 : 1500;
  if (wc < passBMin || wc > passBMax) {
      console.log(`WARN: Pass B word count ${wc} outside ${passBMin}-${passBMax} target.`);
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
  const passAPromptForContext = passA.promptUsed || (physicsMax
    ? buildPromptPassAUltra(concept, expression, variation)
    : buildPromptPassA(concept, expression, variation));

  const contents = [
    { role: 'user', parts: [{ text: passAPromptForContext }, { inlineData: { mimeType: baseMimeType, data: base64Image } }] },
    { role: 'model', parts: passA.modelParts },
    { role: 'user', parts: [{ text: prompt }, { inlineData: { mimeType: passA.mimeType, data: passAB64 } }] },
  ];

  let data;
  try {
    data = await callModel(contents, 0, true);
  } catch (err) {
    console.log(`Pass B error: ${err.message}. Falling back to Pass A output.`);
    const passAImg = await fs.readFile(passA.fp);
    const fp = path.join(OUTPUT_DIR, `${concept.name}.png`);
    await fs.writeFile(fp, passAImg);
    console.log(`SAVED FINAL (PASS A after Pass B error): ${fp} (${(passAImg.length / 1024 / 1024).toFixed(2)} MB)`);
    return fp;
  }
  logModelDiagnostics(data, 'Pass B');
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
  const promptFallback = physicsMax
    ? buildPromptPassBPhysicsMax(concept, expression, variation, true)
    : buildPromptPassB(concept, expression, variation, true);
  validatePrompt(promptFallback, 'Pass B (fallback)');
  const contentsFallback = [
    { role: 'user', parts: [{ text: passAPromptForContext }, { inlineData: { mimeType: baseMimeType, data: base64Image } }] },
    { role: 'model', parts: passA.modelParts },
    { role: 'user', parts: [{ text: promptFallback }, { inlineData: { mimeType: passA.mimeType, data: passAB64 } }] },
  ];
  try {
    data = await callModel(contentsFallback, 0, true);
  } catch (err) {
    console.log(`Pass B fallback error: ${err.message}. Using Pass A output as final.`);
    const passAImg = await fs.readFile(passA.fp);
    const fp = path.join(OUTPUT_DIR, `${concept.name}.png`);
    await fs.writeFile(fp, passAImg);
    console.log(`SAVED FINAL (PASS A after fallback error): ${fp} (${(passAImg.length / 1024 / 1024).toFixed(2)} MB)`);
    return fp;
  }
  logModelDiagnostics(data, 'Pass B (fallback)');
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
    name: '521-pool-lace-aegean-moon',
    scene: 'Santorini cliffside infinity pool above the dark Aegean at blue-hour. White stucco walls with cobalt trim, stone steps into water, oil lantern clusters, distant village twinkle. Cool pool LEDs cast caustics on plaster. Private, empty deck.',
    pose: 'Seated on the pool edge, torso rotated three-quarter to camera, one knee bent with toes grazing the water, left hand braced on wet coping, right hand lightly at hip; looking over her shoulder at the camera.',
    geometry: 'Halter-neck monokini with dagger plunge to navel, corded guipure floral scrollwork, scalloped eyelash edge binding, ring-connected side windows, open back to waist with T-strap anchor.',
    material: 'Satin-backed guipure lace with bonded edges and sheer illusion mesh cradle.',
    materialFallback: 'Satin-backed guipure lace with bonded edges.',
    micro: 'GUIPURE: raised cord edges catch pin highlights; satin base shows anisotropic sheen; illusion mesh softly diffuses; tiny water droplets cling to lace threads.',
    microFallback: 'Raised lace cord, satin sheen, and mesh diffusion visible; droplets on threads.',
  },
  {
    name: '522-pool-lace-skyglass-dubai',
    scene: 'Dubai rooftop sky pool with clear acrylic infinity edge and glass windbreak. Brushed brass rails, black marble bar, LED strip under coping. City neon reflections ripple across wet stone. Champagne bucket on side table. Private after-hours.',
    pose: 'Standing at the acrylic infinity edge, one hip popped, one arm resting on the brass rail, the other hand lightly at her collarbone (no adjusting); three-quarter body to camera, chin slightly down, eyes up.',
    geometry: 'Strapless illusion-corset monokini: deep V plunge to navel stabilized by sheer mesh yoke and internal boning, art-deco fan lace panels, micro-grommet hip bridges, lace-up spine, open back to waist.',
    material: 'Structured matte crepe swim base with lace overlay, bonded edges, and internal boning.',
    materialFallback: 'Matte crepe swim base with lace overlay and bonded edges.',
    micro: 'CORSET: boning channels read as stiff ribs; lace fan cells cast micro-shadows; crepe stays matte with soft diffuse; grommets show crisp specular edges.',
    microFallback: 'Boning ribs, lace micro-shadows, matte crepe, and grommet spec visible.',
  },
  {
    name: '523-pool-lace-riad-zellige',
    scene: 'Moroccan riad courtyard pool with zellige mosaic tiles (emerald/ivory), horseshoe arches, carved plaster, hanging brass lanterns, citrus trees. Candlelight glints dance on water and tile. Secluded, quiet, private.',
    pose: 'Kneeling on a low lounge cushion beside the pool, leaning forward with elbows lightly on thighs and a subtle back arch; head turned to the camera with an inviting gaze.',
    geometry: 'Off-shoulder cowl plunge to navel with baroque arabesque lace overlay, diagonal underbust seam, crescent side cutouts with crystal ring connectors, high-cut hips, open back to waist.',
    material: 'Liquid satin swim base with baroque lace overlay and crystal ring hardware.',
    materialFallback: 'Satin swim base with lace overlay and ring hardware.',
    micro: 'SATIN+LACE: tight sheen bands follow weave; lace filaments sparkle at grazing angles; crystal rings refract tiny caustic streaks; seam puckering visible under tension.',
    microFallback: 'Satin sheen bands, lace sparkle, ring caustics, and seam tension visible.',
  },
  {
    name: '524-pool-lace-kyoto-lantern',
    scene: 'Kyoto ryokan courtyard plunge pool framed by granite boulders and bamboo screen. Paper lanterns, soft steam, wet stone path. Maple leaves float near the edge. Moonlit reflections and gentle ripples. Private, serene.',
    pose: 'Perched on the stone steps inside the plunge pool, one leg submerged and one knee raised above the waterline; forearms resting on the raised knee, shoulders relaxed; face angled toward the camera.',
    geometry: 'High-neck choker collar with keyhole plunge to navel, cathedral-rib lace panels, narrow center gore, cutout waist windows, zipper back to waist, high-cut hips.',
    material: 'Matte neoprene-like swim base with lace ribs and sheer stabilization mesh.',
    materialFallback: 'Matte swim base with lace ribs and stabilization mesh.',
    micro: 'RIBS: lace ribs behave like stiffened beams; matte base absorbs light; zipper teeth show tiny specular dots; steam haze adds soft bloom on hot lantern highlights.',
    microFallback: 'Lace rib stiffness, matte base, zipper micro-spec, and haze bloom visible.',
  },
  {
    name: '525-pool-lace-jungle-mist',
    scene: 'Bali jungle canopy pool with dark basalt coping, bamboo pergola, torchlight, floating flower petals, humid mist layers, dripping leaves. Pool LEDs glow cool under water, reflecting palm silhouettes. Secluded and intimate.',
    pose: 'Reclined on a bamboo lounger under the pergola, one arm overhead and the other trailing fingertips along the wet basalt edge; legs extended with ankles crossed; gaze held on the camera.',
    geometry: 'One-shoulder diagonal plunge to navel with iris-petal applique over sheer tulle, corset-laced side seam, asymmetric hip cutouts, open back to waist with chain-link anchors.',
    material: 'Glossy stretch nylon base with applique lace petals over tulle and onyx-toned chain hardware.',
    materialFallback: 'Stretch nylon base with applique over tulle and chain hardware.',
    micro: 'APPLIQUE: petal edges show thickness and shadow; tulle grid visible at grazing; nylon specular is smooth; chain links show tight highlights with tiny water beads.',
    microFallback: 'Applique edge thickness, tulle grid, nylon spec, and chain highlights visible.',
  },
  {
    name: '526-pool-lace-alpine-steam',
    scene: 'Alpine rooftop heated pool in winter: snow banks around the deck, steam rising, warm chalet windows beyond. Stone coping wet with meltwater. Lanterns and warm firelight points reflect in water. Crisp starry sky. Private.',
    pose: 'Stepping up the ladder out of the steaming heated pool, both hands gripping the rails; water dripping from legs mid-step; torso turned slightly toward the camera while staying balanced and natural.',
    geometry: 'Double-strap harness monokini with split-cup illusion and narrow gore, hex honeycomb lace overlay, lattice side bridges (3–6mm), micro-buckle shoulder straps, open back to waist, high-cut hips.',
    material: 'High-gloss nylon base with honeycomb lace overlay and titanium micro-buckles.',
    materialFallback: 'Nylon base with honeycomb lace overlay and micro-buckles.',
    micro: 'HONEYCOMB: lace cells show clean bevel edges; buckles have sharp spec bands; steam adds soft volumetric scatter; wet deck shows micro-puddles and streaks.',
    microFallback: 'Honeycomb bevels, buckle spec, steam scatter, and wet deck micro-puddles visible.',
  },
  {
    name: '527-pool-lace-yacht-monaco',
    scene: 'Monaco superyacht aft-deck plunge pool: teak decking, stainless rails, marina lights, wind-tossed hair strands, subtle salt spray. Night sea bokeh beyond glass. Champagne flutes on a table. Private deck.',
    pose: 'Leaning back against the stainless rail beside the plunge pool, one knee bent with foot on the teak deck and the other leg straight; one hand holding a champagne flute; face turned directly to the camera.',
    geometry: 'Cross-back X harness with chevron lace panels, plunge to navel, ringlet-connected hip cutouts, high-cut legs, micro-grommet spine lacing, open waist back.',
    material: 'Satin-backed lace with chevron geometry, bonded edges, and micro-grommet lacing.',
    materialFallback: 'Satin-backed lace with bonded edges and micro-grommets.',
    micro: 'CHEVRON: directional lace ridges catch highlights; grommets show crisp rings; salt spray beads create spec points; teak shows damp grain with soft reflections.',
    microFallback: 'Chevron ridges, grommet rings, salt beads, and damp teak grain visible.',
  },
  {
    name: '528-pool-lace-vegas-neon',
    scene: 'Las Vegas penthouse terrace pool: neon signage reflections, mirrored cocktail cart, gold-trim loungers, LED wall wash, glass balustrade with Strip skyline. Wet marble shows specular streaks and footprints. Intimate after-party energy, no crowd.',
    pose: 'Sitting on the poolside marble bar ledge, one leg crossed over the other, one hand planted on the counter for support and the other resting on her thigh; torso angled toward the camera, shoulders open.',
    geometry: 'Sculpted plunge to navel with rose-window radial lace centered at sternum, circular halo harness strap, multiple micro-rings along cutout edges, high-cut hips, open back to waist.',
    material: 'Lamé-tinged lace over satin base with crystal ring connectors.',
    materialFallback: 'Lace over satin base with ring connectors.',
    micro: 'RADIAL: radial ribs cast precise micro-shadows; lamé flecks sparkle; rings show tiny refractive glints; neon spill causes subtle spectral tint shifts on highlights.',
    microFallback: 'Radial micro-shadows, lamé sparkle, ring glints, and spectral tint shifts visible.',
  },
  {
    name: '529-pool-lace-desert-stars',
    scene: 'Desert resort pool carved into warm sandstone: starry sky, fire pits, cactus silhouettes, amber lanterns, low stone walls. Wet stone glistens with micro-puddles. Faint breeze ripples water. Distant mountains. Private oasis.',
    pose: 'Standing near a fire pit at the pool edge, one hand on her waist and the other resting on the warm stone wall; weight on the back leg with the front knee soft; head turned to the camera.',
    geometry: 'Wave-loop crescent lace motif with serpentine side cutouts, plunge to navel, braided strap bridges, high-cut hips, backless waist with graphite zipper seam detail.',
    material: 'Matte crepe swim base with crescent lace overlay and graphite zipper hardware.',
    materialFallback: 'Crepe swim base with lace overlay and zipper hardware.',
    micro: 'CRESCENTS: repeating apertures show clean edge thickness; zipper teeth read as tiny spec dots; sandstone shows damp granular texture; lantern glow blooms softly.',
    microFallback: 'Aperture edge thickness, zipper micro-spec, damp sandstone grain, and highlight bloom visible.',
  },
  {
    name: '530-pool-lace-miami-deco',
    scene: 'Miami Art Deco hotel pool: pastel uplights on curved stucco, terrazzo deck wet from splashes, palm shadows, chrome railings, striped cabana fabric. Pool LEDs create cyan caustics on walls. Quiet private corner at night.',
    pose: 'Half-sitting on a cabana daybed corner, one knee drawn up and the other leg extended, one hand behind supporting on the wet terrazzo and the other hand at collarbone; gaze held on the camera.',
    geometry: 'Asymmetric one-sleeve sheer overlay with micro-dot tulle and lace filigree, dagger plunge to navel, rib cutouts with micro-clasps, high-cut hips, open back to waist.',
    material: 'Gloss nylon base with micro-dot tulle sleeve and black-chrome micro-clasps.',
    materialFallback: 'Nylon base with tulle sleeve and micro-clasps.',
    micro: 'TULLE: dot lattice is crisp; sleeve is semi-sheer with soft diffusion; clasps show tight spec bands; terrazzo wetness produces speckled reflections and puddle edges.',
    microFallback: 'Tulle dot lattice, clasp spec, and wet terrazzo reflections visible.',
  },
  {
    name: '531-pool-lace-singapore-skyline',
    scene: 'Singapore high-rise infinity pool with skyline panorama: dark stone deck, glass rail, sculptural lanterns, ambient city glow. Underwater LEDs create sharp caustics. Fine mist and tiny droplets on lens edge. Late-night quiet, private.',
    pose: 'Walking slowly along the infinity edge, mid-step with heel lifted and toes pointed, arms relaxed; torso three-quarter to the camera with light hair movement; eyes locked to the camera.',
    geometry: 'Deep plunge to navel with thin-film piped edges, vertical rib lace channels, lattice waist windows, micro-grommet lace-up spine, high-cut hips, open back to waist.',
    material: 'Satin swim base with thin-film piping, lace rib channels, and micro-grommets.',
    materialFallback: 'Satin base with lace ribs and micro-grommets.',
    micro: 'PIPING: thin-film edge shows subtle hue shift; rib channels show tension lines; grommets glint; micro-droplets on fabric sparkle under mixed lighting.',
    microFallback: 'Thin-film hue shift, rib tension lines, grommet glints, and droplets visible.',
  },
  {
    name: '532-pool-lace-lava-aurora',
    scene: 'Icelandic geothermal luxury lagoon pool: black lava rock edges, warm steam, faint aurora ribbons overhead. Amber lanterns on basalt shelves. Water surface oily-smooth with gentle ripples. Warm/cool mixed lighting, private and quiet.',
    pose: 'Elbows resting on the lava-rock pool edge with her torso lifted above the waterline, shoulders slightly forward; hands clasped loosely; chin tipped up toward the camera.',
    geometry: 'High-neck plunge with oval keyhole down to navel, gothic lace with eyelash fringe edges, severe side cutouts, ring-connected waist anchors, high-cut hips, open back to waist.',
    material: 'Velvet-backed lace panels with bonded edges and ring connectors.',
    materialFallback: 'Velvet-backed lace with bonded edges and ring connectors.',
    micro: 'VELVET: nap direction visible in low light; fringe edges cast fine shadows; steam scatters highlights; lava rock shows wet micro-gloss and rough pores.',
    microFallback: 'Velvet nap, fringe shadows, steam scatter, and wet lava rock pores visible.',
  },
  {
    name: '533-pool-lace-provence-string',
    scene: 'Provence villa pool at night: pale limestone coping, cypress silhouettes, string lights overhead, candle clusters on wrought-iron table, lavender in planters. Warm reflections ripple on water. Gentle breeze. Private and intimate.',
    pose: 'Seated on a wrought-iron chair near the pool, legs crossed, one arm draped over the chair back and the other hand holding a small towel; torso turned toward the camera.',
    geometry: 'Off-shoulder wrap plunge to navel with micro-beaded lace scatter zones, tapered side cutouts, crystal ring connectors, high-cut hips, open back to waist with clean waist seam.',
    material: 'Matte crepe base with micro-beaded lace overlays and crystal rings.',
    materialFallback: 'Crepe base with lace overlays and ring connectors.',
    micro: 'BEADS: micro-beads create tiny caustic specks; lace filaments sparkle; wrought-iron shows dull spec; candlelight produces soft bloom and warm bounce on skin.',
    microFallback: 'Micro-bead specks, lace sparkle, and candle bloom visible.',
  },
  {
    name: '534-pool-lace-soho-brick',
    scene: 'SoHo rooftop pool with brick parapet and steel beams: warm Edison bulbs, rain-slick concrete deck, skyline bokeh. Modern fire bowls near lounge chairs. Reflective puddles and wet footprints. Private after-hours.',
    pose: 'Leaning into a steel column by the rain-slick pool, one foot planted on the wall with knee bent, hands lightly gripping the column at shoulder height; face turned to the camera.',
    geometry: 'Strapped plunge to navel with laser-grid lattice cutouts, straight-line seams, micro-buckle shoulder straps, narrow side bridges, high-cut hips, open back to waist with clean strap anchors.',
    material: 'High-gloss nylon base with precise lattice cutouts and titanium micro-buckles.',
    materialFallback: 'Nylon base with lattice cutouts and micro-buckles.',
    micro: 'GRID: cutout intersections are crisp with bevel thickness; buckles reflect point lights; rain droplets form streaks; brick shows damp spec patches and mortar texture.',
    microFallback: 'Crisp bevels, buckle reflections, rain streaks, and damp brick texture visible.',
  },
  {
    name: '535-pool-lace-grotto-onyx',
    scene: 'Luxurious grotto pool in a natural rock cave: onyx wall panels backlit amber, rippling reflections across textured stone, narrow ledge with candle lanterns. Warm steam pockets in air. Hidden, intimate, private retreat.',
    pose: 'Sitting on the grotto stone ledge with feet in the water, one hand trailing fingertips through the surface to create ripples and the other hand resting on her thigh; torso angled toward the camera.',
    geometry: 'Cowl plunge to navel with bar-slim center gore, dense lace core with open perimeter, cutout ribs with ring anchors, high-cut hips, open back to waist with curved seam mapping.',
    material: 'Liquid satin base with dense lace core panels and brushed brass ringlets.',
    materialFallback: 'Satin base with lace core panels and brass ringlets.',
    micro: 'ONYX LIGHT: backlit onyx shows subsurface glow; lace core casts tight micro-shadows; brass ringlets show fingerprints and soft spec bands; cave steam adds localized haze.',
    microFallback: 'Onyx glow, tight lace shadows, brass spec with smudges, and steam haze visible.',
  },
  {
    name: '536-pool-lace-palm-springs',
    scene: 'Palm Springs mid-century resort pool: geometric concrete planters, neon accent tubes, low loungers, palm fronds, mountain silhouette. Wet terrazzo deck with reflective streaks. Pool LEDs glow cool. Private corner at night.',
    pose: 'Perched on a low lounger with knees together and angled to one side, hands behind on the cushion for support, subtle arch through the lower back; head tilted toward the camera.',
    geometry: 'One-shoulder harness with diagonal plunge to navel, chevron lace panels, double waist straps with micro-clasps, severe side cutouts, high-cut hips, open back to waist.',
    material: 'Satin-backed lace with chevron geometry and black chrome micro-clasps.',
    materialFallback: 'Satin-backed lace with chevron panels and micro-clasps.',
    micro: 'NEON: neon spill adds colored edge highlights; clasp metal shows tight glints; terrazzo wetness produces speckled reflections; lace chevrons show directional micro-ridges.',
    microFallback: 'Colored edge highlights, clasp glints, wet terrazzo speckles, and lace ridge direction visible.',
  },
  {
    name: '537-pool-lace-riviera-cliff',
    scene: 'French Riviera cliff-top pool overlooking the dark sea: pale limestone deck, glass balustrade, sculptural bronze lanterns, champagne on marble side table. Gentle wind ripples water and hair. Moon highlights offshore waves. Private.',
    pose: 'Standing at the glass balustrade, one hand on the railing and the other sweeping hair back; legs in a soft contrapposto stance; face turned toward the camera.',
    geometry: 'Halter plunge to navel with wave-loop lace motif, teardrop side windows with crystal rings, high-cut hips, open back to waist with T-strap and micro-grommet lacing.',
    material: 'Gloss nylon base with wave-loop lace overlay and crystal ring connectors.',
    materialFallback: 'Nylon base with lace overlay and ring connectors.',
    micro: 'SEA BOKEH: distant wave highlights sparkle; lace loops show clean thickness; rings refract tiny caustics; glass balustrade shows faint distortion and edge reflections.',
    microFallback: 'Lace loop thickness, ring refraction, and glass edge reflections visible.',
  },
  {
    name: '538-pool-lace-cenote-candle',
    scene: 'Tulum cenote pool inside a limestone sinkhole: hanging vines, candle lanterns on stone shelves, turquoise underwater LEDs. Moisture haze and dripping rock. Wet limestone has glossy streaks and mineral texture. Quiet, private atmosphere.',
    pose: 'Kneeling on a wet limestone shelf, one knee down and one foot planted, palm on the rock for balance; torso twisted slightly toward the camera; eyes locked to the lens.',
    geometry: 'High-neck choker with vertical plunge to navel, micro-dot tulle underlay with lace filigree overlays, side cutouts shaped as arcs, ring-connected waist anchors, high-cut hips, open back to waist.',
    material: 'Matte crepe base with micro-dot tulle underlay, lace filigree overlays, and ring connectors.',
    materialFallback: 'Crepe base with tulle underlay, lace overlays, and rings.',
    micro: 'MINERALS: wet limestone shows micro-gloss runs and pores; tulle dot lattice is crisp; lace filigree casts fine shadows; candlelight creates warm shimmer on waterline.',
    microFallback: 'Wet limestone pores, tulle dot lattice, lace shadows, and warm shimmer visible.',
  },
  {
    name: '539-pool-lace-maldives-glass',
    scene: 'Maldives overwater villa pool: teak deck, rattan lounger, soft lanterns, moonlight on lagoon. A glass floor panel reveals water below with gentle wave shimmer. Tiny salt spray bokeh. Private, quiet night.',
    pose: 'Lying on a floating mat in the pool, one arm trailing into the water and the other resting near her shoulder; one knee slightly bent; face turned toward the camera.',
    geometry: 'Sculpted plunge to navel with clear-mesh stabilization cradle, geometric lattice side cutouts, micro-buckle shoulder straps, high-cut hips, open back to waist with clean anchor points.',
    material: 'High-gloss nylon base with clear stabilization mesh and titanium micro-buckles.',
    materialFallback: 'Nylon base with stabilization mesh and micro-buckles.',
    micro: 'GLASS+SPRAY: salt spray beads sparkle; clear mesh grid shows soft diffusion; buckles reflect lantern points; teak shows damp grain and faint spec bands.',
    microFallback: 'Salt beads, mesh grid diffusion, buckle reflections, and damp teak grain visible.',
  },
  {
    name: '540-pool-lace-future-club',
    scene: 'Futuristic rooftop pool club set after hours, empty: LED light ribbons, chrome-and-onyx bar, projection-mapped wall patterns, wet black stone deck. Sharp caustics and reflections distort with water ripples. Skyline glow and haze. Private.',
    pose: 'Standing under the projection-mapped patterns by the pool bar, one forearm resting on the onyx counter and the other hand on her hip; torso three-quarter to camera, legs crossed at the ankle.',
    geometry: 'Strapped plunge to navel with precise laser-grid cutouts, ringlet chain bridges at hips, high-cut legs, open back to waist with spine grommet lacing and clean seam tessellation.',
    material: 'Lamé-tinted lace over gloss nylon with onyx chain links and micro-grommet lacing.',
    materialFallback: 'Lace over nylon with chain links and micro-grommets.',
    micro: 'PROJECTED LIGHT: projection patterns create believable light breaks on fabric; chain links show tight spec; wet black stone shows mirror-like streaks; lace cutout edges keep visible thickness.',
    microFallback: 'Light breaks, chain spec, wet stone streaks, and lace edge thickness visible.',
  },
  {
    name: '541-pool-lace-capri-grotto',
    scene: 'Capri sea‑cave grotto pool: deep cobalt water glowing from beneath, rough limestone walls, small lanterns on ledges, wet rock with glossy streaks. Subtle wave bokeh through the cave mouth. Private, intimate.',
    pose: 'Standing ankle‑deep at the grotto edge, one hand on a rock ledge for balance and the other resting at her waist; torso turned three‑quarter to camera, chin slightly lifted.',
    geometry: 'Halter neck with dagger plunge to navel, iris‑petal lace applique over sheer stabilization mesh, curved side cutouts with ring connectors, high‑cut hips, open back to waist with T‑strap.',
    material: 'Gloss nylon base with applique lace over tulle and crystal ring hardware.',
    materialFallback: 'Nylon base with applique lace and ring hardware.',
    micro: 'GROTTO: wet limestone shows darkened pores; lace petals show raised edges; ring connectors refract pin‑light highlights; water glow creates soft blue rim.',
    microFallback: 'Wet limestone pores, lace petal edges, ring highlights, and blue rim visible.',
  },
  {
    name: '542-pool-lace-ibiza-white',
    scene: 'Ibiza white‑stucco terrace pool: white walls, limewashed arches, olive trees, woven rattan loungers, warm candles on low tables, moonlit sea horizon. Wet stucco and marble show subtle sheen. Private.',
    pose: 'Seated sideways on the pool coping with one leg extended along the edge and the other bent, one palm behind for support, the other resting on her thigh; face turned toward the camera.',
    geometry: 'Asymmetric one‑shoulder plunge to navel with scalloped eyelash lace, diagonal seam map, narrow side bridges, high‑cut hips, open back to waist with micro‑grommet lacing.',
    material: 'Satin‑backed lace with bonded edges and micro‑grommet spine lacing.',
    materialFallback: 'Satin‑backed lace with bonded edges.',
    micro: 'STUCCO: wet limewash shows micro‑sheen; lace eyelash edges cast fine shadows; grommets show crisp spec; candlelight adds warm bounce.',
    microFallback: 'Wet limewash sheen, lace eyelash shadows, grommet spec, warm bounce visible.',
  },
  {
    name: '543-pool-lace-seoul-skyline',
    scene: 'Seoul high‑rise rooftop pool: glass balustrade, brushed steel rails, LED edge strips, skyline bokeh with neon signage, wet basalt deck. Cool pool LEDs cast cyan caustics. Private, quiet.',
    pose: 'Walking along the pool edge mid‑step, heel lifted, arms relaxed, torso three‑quarter to camera; eyes locked to the lens.',
    geometry: 'High‑neck collar with vertical plunge to navel, cathedral‑arch lace panels, narrow center gore, waist cutouts with micro‑ring anchors, high‑cut hips, open back to waist.',
    material: 'Matte crepe swim base with lace ribs and ring connectors.',
    materialFallback: 'Matte swim base with lace ribs and ring connectors.',
    micro: 'NEON: skyline glow adds spectral tint to highlights; lace ribs show stiffened beams; steel rails show tight spec bands; wet basalt shows micro‑puddles.',
    microFallback: 'Spectral tint, lace rib stiffness, rail spec, wet basalt visible.',
  },
  {
    name: '544-pool-lace-marrakech-rooftop',
    scene: 'Marrakech rooftop plunge pool: terracotta tiles, carved wood screens, brass lantern clusters, palm fronds in planters. Warm candlelight and cool pool glow mix on wet tile. Private, calm.',
    pose: 'Kneeling on a low cushion beside the pool, torso upright with a slight back arch, hands resting lightly on thighs; head turned toward the camera.',
    geometry: 'Off‑shoulder cowl plunge to navel with baroque arabesque lace overlay, crescent side cutouts, crystal ring connectors, high‑cut hips, open back to waist with curved seam map.',
    material: 'Liquid satin base with lace overlay and crystal ring hardware.',
    materialFallback: 'Satin base with lace overlay and ring hardware.',
    micro: 'TERRACOTTA: wet tile shows saturated color and glossy streaks; lace filaments sparkle; ring connectors cast tiny caustic dots; lantern glow blooms softly.',
    microFallback: 'Wet tile gloss, lace sparkle, ring caustics, lantern bloom visible.',
  },
  {
    name: '545-pool-lace-zermatt-igloo',
    scene: 'Zermatt alpine spa pool beside a glass igloo lounge: snow‑dusted stone, steam, warm interior light, distant peaks under starlight. Wet deck glistens with meltwater. Private, crisp air.',
    pose: 'Standing on the pool steps with one leg higher, both hands lightly on the rail, torso turned toward camera; steady, balanced stance.',
    geometry: 'Double‑strap harness with split‑cup illusion, plunge to navel, honeycomb lace overlay, lattice side bridges, high‑cut hips, open back to waist with micro‑buckle straps.',
    material: 'High‑gloss nylon base with honeycomb lace and titanium micro‑buckles.',
    materialFallback: 'Nylon base with honeycomb lace and micro‑buckles.',
    micro: 'STEAM: volumetric scatter softens highlights; lace cells show clean bevels; buckles reflect warm igloo light; snow shows granular sparkle.',
    microFallback: 'Steam scatter, lace bevels, buckle reflections, snow sparkle visible.',
  },
  {
    name: '546-pool-lace-cabo-crescent',
    scene: 'Cabo cliffside crescent pool: sandstone coping, fire bowls, desert plants, ocean moon path. Wet stone reflects warm firelight and cool water glow. Private, quiet.',
    pose: 'Leaning against a low stone wall with one foot on the coping and the other planted, one hand on the wall and the other at her waist; face angled to camera.',
    geometry: 'Deep V plunge to navel with chevron lace panels, diagonal seam tessellation, ring‑anchored side cutouts, high‑cut hips, open back to waist with lace‑up spine.',
    material: 'Matte crepe base with chevron lace and ring hardware.',
    materialFallback: 'Crepe base with lace and ring hardware.',
    micro: 'FIRELIGHT: warm spec flicker on hardware; lace chevrons show directional ridges; sandstone shows damp granular texture; fire bowls cast soft bloom.',
    microFallback: 'Warm spec flicker, lace ridges, damp sandstone grain, bloom visible.',
  },
  {
    name: '547-pool-lace-phuket-lagoon',
    scene: 'Phuket lagoon villa pool: teak deck, lush tropical foliage, bamboo screens, floating lilies, soft lanterns. Humid haze and water droplets on glass. Private, serene.',
    pose: 'Reclined on a low lounger with one knee bent and the other leg extended, one arm draped overhead and the other resting at her side; gaze toward camera.',
    geometry: 'One‑shoulder diagonal plunge to navel with iris‑petal lace applique, narrow side bridges, high‑cut hips, open back to waist with chain‑link anchors.',
    material: 'Gloss nylon base with applique lace over tulle and onyx chain links.',
    materialFallback: 'Nylon base with applique lace and chain links.',
    micro: 'HUMIDITY: tiny droplets bead on lace; chain links show crisp spec; teak shows damp grain; foliage bokeh adds soft green spill.',
    microFallback: 'Droplet beads, chain spec, damp teak grain, green spill visible.',
  },
  {
    name: '548-pool-lace-sydney-harbor',
    scene: 'Sydney Harbor rooftop pool: glass balustrade, stone coping, brass lanterns, distant bridge lights, city reflections. Wet deck with subtle puddles. Private, night breeze.',
    pose: 'Standing at the glass rail, one hand resting on the top rail and the other sweeping hair back; legs in soft contrapposto; face toward camera.',
    geometry: 'Halter plunge to navel with wave‑loop lace motif, teardrop side windows with crystal rings, high‑cut hips, open back to waist with T‑strap and micro‑grommet lacing.',
    material: 'Gloss nylon base with wave‑loop lace and crystal ring connectors.',
    materialFallback: 'Nylon base with lace and ring connectors.',
    micro: 'HARBOR: distant bridge lights sparkle; lace loops show clean edge thickness; rings refract pin‑lights; glass rail shows faint distortion.',
    microFallback: 'Bridge sparkle, lace edge thickness, ring refraction, glass distortion visible.',
  },
  {
    name: '549-pool-lace-berlin-industrial',
    scene: 'Berlin industrial rooftop pool: brick walls, steel beams, Edison bulbs, black stone deck, rain‑slick puddles. Neon sign glow from a nearby wall. Private, moody.',
    pose: 'Leaning into a steel column with one knee bent, hands lightly on the column at shoulder height, torso angled toward camera; eyes on lens.',
    geometry: 'Strapped plunge to navel with laser‑grid lattice cutouts, straight seam mapping, micro‑buckle shoulder straps, narrow side bridges, high‑cut hips, open back to waist.',
    material: 'High‑gloss nylon base with precise lattice cutouts and titanium micro‑buckles.',
    materialFallback: 'Nylon base with lattice cutouts and micro‑buckles.',
    micro: 'RAIN: droplets form streaks on fabric; cutout intersections show crisp bevels; brick shows damp spec patches; steel beams show tight highlights.',
    microFallback: 'Rain streaks, crisp bevels, damp brick spec, steel highlights visible.',
  },
  {
    name: '550-pool-lace-havana-patio',
    scene: 'Havana courtyard plunge pool: patterned tiles, pastel walls, wrought‑iron chairs, palms in clay pots, candlelight on water. Warm/cool mixed lighting, wet tile reflections. Private.',
    pose: 'Seated on a wrought‑iron chair near the pool, legs crossed, one arm draped over the chair back and the other resting on her knee; torso turned toward camera.',
    geometry: 'Off‑shoulder wrap plunge to navel with micro‑beaded lace scatter zones, tapered side cutouts, ring connectors, high‑cut hips, open back to waist.',
    material: 'Matte crepe base with micro‑beaded lace and crystal rings.',
    materialFallback: 'Crepe base with lace and ring connectors.',
    micro: 'TILE: wet tile shows color‑rich reflections; micro‑beads create tiny caustic specks; iron chair shows dull spec; candle glow warms skin.',
    microFallback: 'Wet tile reflections, bead caustics, iron spec, warm glow visible.',
  },
  {
    name: '551-pool-lace-bangkok-river',
    scene: 'Bangkok riverside hotel pool: river lights bokeh, teak deck, brass lanterns, tall palms, glass rail. Cool pool LEDs and warm lanterns mix on wet stone. Private, late night.',
    pose: 'Standing with one foot on a low step and the other on deck, one hand on the rail and the other at her waist; torso three‑quarter to camera.',
    geometry: 'High‑neck plunge with oval keyhole to navel, gothic lace with eyelash edges, severe side cutouts, ring‑anchored waist, high‑cut hips, open back to waist.',
    material: 'Velvet‑backed lace panels with bonded edges and ring connectors.',
    materialFallback: 'Velvet‑backed lace with ring connectors.',
    micro: 'RIVER: distant light bokeh sparkles; lace fringe casts fine shadows; velvet nap shows direction; wet stone shows micro‑puddles.',
    microFallback: 'Bokeh sparkle, lace fringe shadows, velvet nap, wet stone visible.',
  },
  {
    name: '552-pool-lace-mykonos-terrace',
    scene: 'Mykonos terrace pool: white stucco walls, blue shutters, bougainvillea, marble deck, candle clusters. Moonlit sea horizon. Wet marble reflects warm points. Private.',
    pose: 'Perched on the pool coping with one knee raised and arms resting lightly on the knee; shoulders relaxed; face angled to camera.',
    geometry: 'Strapless illusion‑corset monokini with deep V plunge to navel, art‑deco fan lace panels, micro‑grommet hip bridges, lace‑up spine, open back to waist.',
    material: 'Structured matte crepe base with lace overlay and internal boning.',
    materialFallback: 'Matte crepe base with lace overlay.',
    micro: 'STUCCO: wet limewash sheen; lace fan cells cast micro‑shadows; grommets show crisp spec; marble shows clean spec bands.',
    microFallback: 'Wet limewash sheen, lace fan shadows, grommet spec, marble spec visible.',
  },
  {
    name: '553-pool-lace-abu-dhabi-desert',
    scene: 'Abu Dhabi desert resort pool: golden sandstone, low fire bowls, desert dunes silhouette, palm planters, soft lanterns. Warm firelight contrasts cool pool glow. Private.',
    pose: 'Standing near the pool edge with one hand on the warm stone and the other resting at her hip; weight on back leg, front knee soft; gaze toward camera.',
    geometry: 'Cowl plunge to navel with dense lace core and open perimeter, ring‑anchored cutout ribs, high‑cut hips, open back to waist with curved seam mapping.',
    material: 'Liquid satin base with dense lace core and brushed brass ringlets.',
    materialFallback: 'Satin base with lace core and brass ringlets.',
    micro: 'DESERT: sandstone shows damp granular texture; lace core casts tight micro‑shadows; brass ringlets show soft spec bands; firelight adds warm flicker.',
    microFallback: 'Damp sandstone grain, tight lace shadows, brass spec, warm flicker visible.',
  },
  {
    name: '554-pool-lace-vancouver-rain',
    scene: 'Vancouver rain‑washed rooftop pool: slate deck, glass rail, cedar planters, misty skyline, rain droplets on surfaces. Cool ambient light with soft lanterns. Private, moody.',
    pose: 'Standing under a covered pergola, one hand on a cedar post and the other resting on her thigh; legs crossed at the ankle; face toward camera.',
    geometry: 'High‑neck choker with vertical plunge to navel, micro‑dot tulle underlay with lace filigree overlays, arc side cutouts, ring‑connected waist anchors, high‑cut hips, open back to waist.',
    material: 'Matte crepe base with micro‑dot tulle and lace filigree overlays.',
    materialFallback: 'Crepe base with tulle and lace overlays.',
    micro: 'RAIN: droplets bead on fabric and cedar; tulle dot lattice is crisp; lace filigree casts fine shadows; slate shows wet spec streaks.',
    microFallback: 'Droplet beads, tulle dot lattice, lace shadows, wet slate streaks visible.',
  },
  {
    name: '555-pool-lace-monterey-cypress',
    scene: 'Monterey coastal spa pool: wind‑bent cypress silhouettes, stone coping, lanterns, ocean haze, soft moonlight. Wet deck glistens with salt spray. Private, quiet.',
    pose: 'Seated on a low stone bench by the pool with legs angled to one side, one hand trailing fingertips in the water and the other resting on her thigh; torso angled to camera.',
    geometry: 'Deep V plunge to navel with wave‑loop lace motif, braided strap bridges at hips, high‑cut legs, open back to waist with clean anchor points.',
    material: 'Gloss nylon base with wave‑loop lace overlay and braided strap bridges.',
    materialFallback: 'Nylon base with lace overlay and braided bridges.',
    micro: 'COAST: salt spray beads sparkle; lace loops show edge thickness; stone shows damp micro‑pits; lantern glow creates soft halos.',
    microFallback: 'Salt beads, lace edge thickness, damp stone pits, lantern halos visible.',
  },
  {
    name: '556-pool-lace-oslo-fjord',
    scene: 'Oslo fjord rooftop pool: dark stone deck, glass balustrade, sauna glow nearby, city lights across water. Steam ribbons in cold air. Private, late night.',
    pose: 'Standing with one hand on the glass rail and the other resting at her collarbone; legs in soft contrapposto; face to camera.',
    geometry: 'Asymmetric one‑shoulder strap with diagonal plunge to navel, chevron lace panels, double waist straps with micro‑clasps, severe side cutouts, high‑cut hips, open back to waist.',
    material: 'Satin‑backed lace with chevron geometry and black chrome micro‑clasps.',
    materialFallback: 'Satin‑backed lace with chevron panels and micro‑clasps.',
    micro: 'FJORD: cold air haze softens highlights; chevron ridges show directional sheen; clasps reflect sauna glow; glass rail shows edge reflections.',
    microFallback: 'Cold haze, chevron sheen, clasp reflections, glass edge highlights visible.',
  },
  {
    name: '557-pool-lace-hongkong-peak',
    scene: 'Hong Kong Peak rooftop pool: skyline bokeh, glass rail, black marble bar, LED strips under coping, misty air. Wet marble shows crisp reflections. Private, high altitude.',
    pose: 'Standing beside the bar with one forearm on the marble and the other hand on her hip; torso three‑quarter to camera, legs crossed at the ankle.',
    geometry: 'Sculpted plunge to navel with rose‑window radial lace centered at sternum, circular halo harness strap, micro‑rings along cutout edges, high‑cut hips, open back to waist.',
    material: 'Lamé‑tinged lace over satin base with crystal ring connectors.',
    materialFallback: 'Lace over satin base with ring connectors.',
    micro: 'SKYLINE: neon spill adds subtle spectral tint; radial lace ribs cast precise micro‑shadows; rings show tiny refractive glints; wet marble shows sharp spec bands.',
    microFallback: 'Spectral tint, radial micro‑shadows, ring glints, marble spec visible.',
  },
  {
    name: '558-pool-lace-lake-como',
    scene: 'Lake Como villa pool: cypress trees, terracotta pots, stone balustrade, warm lanterns, calm lake reflections. Wet stone deck with subtle puddles. Private and elegant.',
    pose: 'Seated on a cushioned bench with one leg crossed over the other, one hand resting on the cushion and the other lightly at her waist; face angled to camera.',
    geometry: 'Cowl‑drape plunge to navel with bar‑slim center gore, lace core panel, side cutouts with ring anchors, high‑cut hips, open back to waist.',
    material: 'Liquid satin base with lace core and brushed brass ringlets.',
    materialFallback: 'Satin base with lace core and brass ringlets.',
    micro: 'VILLA: stone shows damp micro‑pits; lace core casts tight micro‑shadows; brass ringlets show soft spec bands; lanterns add warm bloom.',
    microFallback: 'Damp stone pits, lace shadows, brass spec, warm bloom visible.',
  },
  {
    name: '559-pool-lace-reykjavik-glass',
    scene: 'Reykjavik glass‑roof spa pool: warm steam, black basalt edge, glass ceiling with faint snow, warm interior lights, cool sky glow. Wet deck glistens. Private.',
    pose: 'Elbows resting on the pool edge with torso lifted above waterline, shoulders slightly forward; hands loosely clasped; chin tipped toward camera.',
    geometry: 'High‑neck plunge with oval keyhole to navel, gothic lace with eyelash fringe edges, severe side cutouts, ring‑connected waist anchors, high‑cut hips, open back to waist.',
    material: 'Velvet‑backed lace panels with bonded edges and ring connectors.',
    materialFallback: 'Velvet‑backed lace with ring connectors.',
    micro: 'GLASS ROOF: soft sky glow adds cool rim light; lace fringe casts fine shadows; basalt shows wet micro‑gloss; steam scatters highlights.',
    microFallback: 'Cool rim light, fringe shadows, wet basalt gloss, steam scatter visible.',
  },
  {
    name: '560-pool-lace-london-skygarden',
    scene: 'London sky garden pool: lush greenery, glass ceiling, city lights beyond, warm floor lanterns, polished stone coping. Wet stone reflects plant silhouettes. Private, cinematic.',
    pose: 'Standing near the greenery with one hand on a low stone ledge and the other resting on her thigh; torso angled to camera; relaxed stance.',
    geometry: 'Strapped plunge to navel with lattice cutouts, narrow side bridges, micro‑buckle straps, high‑cut hips, open back to waist with clean strap anchors.',
    material: 'High‑gloss nylon base with precise lattice cutouts and titanium micro‑buckles.',
    materialFallback: 'Nylon base with lattice cutouts and micro‑buckles.',
    micro: 'SKY GARDEN: plant silhouettes reflect on wet stone; lattice edges show crisp bevels; buckles reflect warm lantern points; glass ceiling shows faint reflections.',
    microFallback: 'Plant reflections, crisp bevels, buckle reflections, glass ceiling reflections visible.',
  },
  {
    name: '561-pool-lace-athens-marble',
    scene: 'Athens hillside pool terrace: pale marble coping, olive trees, distant Acropolis glow, warm lanterns, dry summer air. Water surface calm with faint ripples. Private, elegant.',
    pose: 'Seated on the marble edge with one leg crossed at the ankle and the other extended, one hand braced behind for support and the other resting at her waist; face angled to camera.',
    geometry: 'Deep V plunge to navel with art-deco fan lace panels, narrow center gore, side cutouts with ring anchors, high-cut hips, open back to waist.',
    material: 'Satin-backed lace over a matte crepe base with brushed brass ringlets.',
    materialFallback: 'Satin-backed lace over crepe base with brass ringlets.',
    micro: 'MARBLE: crisp stone veining visible in wet reflections; lace fan ribs cast micro-shadows; brass ringlets show soft spec bands; warm lantern glow adds gentle bloom.',
    microFallback: 'Wet marble veining, lace micro-shadows, brass spec bands, lantern bloom visible.',
  },
  {
    name: '562-pool-lace-tokyo-ginza-rooftop',
    scene: 'Tokyo Ginza rooftop pool: dark basalt deck, glass rail, neon skyline bokeh, chrome accents, light mist from cooling towers. Cool ambient light with sharp LED trims. Private, high-tech.',
    pose: 'Standing beside the glass rail, one forearm resting lightly on the top edge and the other hand at her collarbone; legs crossed at the ankle; gaze to camera.',
    geometry: 'High-neck choker with vertical keyhole plunge to navel, lattice waist windows, micro-grommet lace-up spine, high-cut hips, open back to waist.',
    material: 'High-gloss nylon base with fine lace lattice and black-chrome micro-grommets.',
    materialFallback: 'Nylon base with lace lattice and micro-grommets.',
    micro: 'GINZA: neon spill creates subtle spectral tint in highlights; lace lattice edges show clean bevels; grommets glint with crisp points; basalt deck shows wet spec streaks.',
    microFallback: 'Neon tint, lattice bevels, grommet glints, wet basalt streaks visible.',
  },
  {
    name: '563-pool-lace-rio-ledge',
    scene: 'Rio hillside infinity pool: stone coping, palms, distant ocean shimmer, warm sunset haze, soft breeze lifting hair strands. Pool LEDs add cool edge light. Private, cinematic.',
    // This concept was intermittently blocked; keep the same vibe but use a less body-revealing pose.
    pose: 'Waist-deep in the pool at the infinity edge, forearms resting on the coping, shoulders relaxed; chin slightly down, eyes to camera; waterline hides hips/upper legs.',
    geometry: 'High-neck asymmetric one-shoulder with a narrow vertical keyhole stabilized by illusion mesh to the navel line; chevron lace panels; controlled side windows with braided strap bridges; open back to waist.',
    material: 'Gloss nylon base with chevron lace overlay and braided strap bridges.',
    materialFallback: 'Nylon base with lace overlay and braided bridges.',
    micro: 'RIO: sunset haze softens edges; chevron lace ridges catch directional sheen; braided bridges show tight twist texture; stone coping shows damp micro-pits.',
    microFallback: 'Haze, chevron sheen, braided texture, damp stone pits visible.',
  },
  {
    name: '564-pool-lace-barcelona-tiles',
    scene: 'Barcelona modernist courtyard pool: mosaic tile murals, terracotta planters, wrought-iron accents, late afternoon sun casting geometric shadows. Water flickers on tile. Private and warm.',
    pose: 'Kneeling on a low bench by the pool, torso upright with hands resting softly on thighs; head turned toward camera with a calm gaze.',
    geometry: 'Cowl plunge to navel with scalloped eyelash lace edge, crescent side cutouts, micro-ring connectors, high-cut hips, open back to waist.',
    material: 'Liquid satin base with eyelash lace overlay and crystal ring connectors.',
    materialFallback: 'Satin base with lace overlay and ring connectors.',
    micro: 'TILES: mosaic grout lines remain crisp under wet sheen; lace eyelash fringe casts fine shadows; crystal rings add tiny refractive glints; sun shadows form sharp patterns.',
    microFallback: 'Wet tile sheen, fringe shadows, ring glints, sharp sun patterns visible.',
  },
  {
    name: '565-pool-lace-mallorca-terrace',
    scene: 'Mallorca cliffside terrace pool: pale limestone deck, Mediterranean horizon, striped cabana fabric, warm breeze, golden hour light. Private, relaxed luxury.',
    pose: 'Perched on a lounge chaise, one arm overhead and the other resting on the thigh; legs extended with ankles crossed; face to camera.',
    geometry: 'Strapless plunge to navel with veil panel over the center, lattice side cutouts, micro-buckle straps at the back, high-cut hips, open back to waist.',
    material: 'Matte crepe base with sheer veil lace panel and titanium micro-buckles.',
    materialFallback: 'Crepe base with lace veil panel and micro-buckles.',
    micro: 'MALLORCA: veil panel shows soft diffusion; buckle edges reflect warm gold; limestone shows damp granular texture; cabana stripes blur into bokeh.',
    microFallback: 'Veil diffusion, buckle spec, damp limestone grain, cabana bokeh visible.',
  },
  {
    name: '566-pool-lace-prague-riverlight',
    scene: 'Prague riverside spa pool: stone arches, warm lanterns, river reflections, mist over water, distant bridge lights. Night mood, private and moody.',
    pose: 'Standing near a stone column, one hand on the column and the other resting at her hip; weight on back leg; gaze to camera.',
    geometry: 'Keyhole plunge to navel with gothic lace panels, diagonal underbust seam, arc side cutouts, high-cut hips, open back to waist with zipper seam detail.',
    material: 'Matte crepe base with gothic lace panels and graphite zipper hardware.',
    materialFallback: 'Crepe base with lace panels and zipper hardware.',
    micro: 'RIVERLIGHT: mist adds soft bloom around lanterns; lace panels cast tight micro-shadows; zipper teeth read as tiny spec dots; stone arch shows wet patina.',
    microFallback: 'Lantern bloom, lace micro-shadows, zipper spec, wet stone patina visible.',
  },
  {
    name: '567-pool-lace-doha-glow',
    scene: 'Doha skyline pool deck: polished stone, gold trims, glass rail, city lights reflecting in water, warm desert air. Clean modern lines, private.',
    pose: 'Sitting on the pool edge with one leg dangling and the other bent, one hand braced on the coping and the other resting at her collarbone; eyes to camera.',
    geometry: 'Sculpted plunge to navel with rose-window radial lace, circular halo harness strap, micro-ring cutouts, high-cut hips, open back to waist.',
    material: 'Lame-tinged lace over satin base with crystal ring connectors.',
    materialFallback: 'Lace over satin base with ring connectors.',
    micro: 'DOHA: radial lace ribs cast precise micro-shadows; ring connectors show prismatic glints; polished stone reflects thin spec bands; warm skyline glow adds amber tint.',
    microFallback: 'Radial shadows, ring glints, stone spec bands, warm glow visible.',
  },
  {
    name: '568-pool-lace-bora-bora-overwater',
    scene: 'Bora Bora overwater bungalow pool: teak deck, turquoise lagoon, glass edge, gentle trade winds, soft morning sun. Private, serene.',
    pose: 'Leaning on the glass edge with forearms resting, shoulders relaxed; one knee bent slightly; face turned to camera.',
    geometry: 'Deep V plunge to navel with wave-loop lace motif, ring-anchored side windows, braided strap bridges, high-cut hips, open back to waist.',
    material: 'Gloss nylon base with wave-loop lace overlay and brushed brass ringlets.',
    materialFallback: 'Nylon base with lace overlay and brass ringlets.',
    micro: 'LAGOON: lagoon light adds cyan rim; lace loops show edge thickness; brass ringlets reflect warm sun points; teak deck shows damp grain with fine reflections.',
    microFallback: 'Cyan rim, lace edge thickness, brass spec points, damp teak grain visible.',
  },
  {
    name: '569-pool-lace-hanoi-lotus',
    scene: 'Hanoi courtyard pool: lotus planters, carved wood screens, warm lanterns, rain-fresh air, soft reflections on stone. Private, quiet.',
    pose: 'Seated on a low bench, torso angled to camera, one hand resting on the bench and the other at her thigh; relaxed posture.',
    geometry: 'High-neck choker with oval keyhole plunge to navel, cathedral-rib lace panels, side cutouts with ring anchors, high-cut hips, open back to waist.',
    material: 'Matte neoprene-like base with lace ribs and satin piping.',
    materialFallback: 'Matte base with lace ribs and piping.',
    micro: 'LOTUS: lace ribs read as stiffened beams; satin piping shows thin spec bands; wet stone shows micro-puddles; lanterns add soft warm bloom.',
    microFallback: 'Lace rib stiffness, piping spec, wet stone puddles, warm bloom visible.',
  },
  {
    name: '570-pool-lace-neworleans-courtyard',
    scene: 'New Orleans French Quarter courtyard pool: wrought iron balcony, brick walls with ivy, string lights, warm humid night. Water reflects amber bulbs. Private, intimate.',
    pose: 'Standing by a brick wall, one hand on the iron railing and the other resting at her waist; legs in soft contrapposto; gaze to camera.',
    geometry: 'Cowl-drape plunge to navel with bar-slim center gore, lace core panel, arc side cutouts, high-cut hips, open back to waist.',
    material: 'Liquid satin base with lace core and black-chrome ringlets.',
    materialFallback: 'Satin base with lace core and ringlets.',
    micro: 'COURTYARD: brick shows damp texture; lace core casts tight micro-shadows; ringlets glint under string lights; soft humidity adds slight highlight bloom.',
    microFallback: 'Damp brick texture, lace micro-shadows, ringlet glints, bloom visible.',
  },
  {
    name: '571-pool-lace-istanbul-hammam',
    scene: 'Istanbul courtyard hammam pool: carved stone, brass lanterns, shallow steam, patterned tiles, warm ambient glow. Private, ritual calm.',
    pose: 'Kneeling on a stone platform by the water, torso upright, hands resting lightly on thighs; head turned to camera.',
    geometry: 'Off-shoulder plunge to navel with baroque lace overlay, diagonal underbust seam, crescent side cutouts with ring connectors, high-cut hips, open back to waist.',
    material: 'Satin base with baroque lace overlay and brushed brass ring connectors.',
    materialFallback: 'Satin base with lace overlay and brass rings.',
    micro: 'HAMMAM: steam scatters highlights; lace baroque scrolls show edge thickness; brass rings show warm spec bands; tile grout lines remain crisp under wet sheen.',
    microFallback: 'Steam scatter, lace edge thickness, brass spec, wet tile grout visible.',
  },
  {
    name: '572-pool-lace-queenstown-lake',
    scene: 'Queenstown alpine lake pool: dark stone deck, glass rail, snowy peaks, crisp air, faint moonlight. Warm spa glow contrasts cool sky. Private.',
    pose: 'Standing at the glass rail, one hand lightly on the top edge and the other at her collarbone; legs crossed at the ankle; eyes to camera.',
    geometry: 'Asymmetric one-shoulder strap with diagonal plunge to navel, chevron lace panels, double waist straps with micro-clasps, high-cut hips, open back to waist.',
    material: 'Satin-backed lace with chevron geometry and black-chrome micro-clasps.',
    materialFallback: 'Satin-backed lace with chevron panels and micro-clasps.',
    micro: 'ALPINE: cold air haze softens edges; chevron ridges show directional sheen; clasps reflect warm spa glow; glass rail shows thin edge reflections.',
    microFallback: 'Cold haze, chevron sheen, clasp reflections, glass edge highlights visible.',
  },
  {
    name: '573-pool-lace-edinburgh-terrace',
    scene: 'Edinburgh terrace pool: dark slate coping, historic skyline silhouette, warm window lights, soft drizzle, moody blue hour. Private and cinematic.',
    pose: 'Seated on the coping with one leg bent and the other extended, one hand resting behind for support and the other at her thigh; gaze to camera.',
    geometry: 'Strapped plunge to navel with lattice cutouts, narrow side bridges, micro-buckle straps, high-cut hips, open back to waist.',
    material: 'High-gloss nylon base with precise lattice cutouts and titanium micro-buckles.',
    materialFallback: 'Nylon base with lattice cutouts and micro-buckles.',
    micro: 'EDINBURGH: drizzle beads on fabric; lattice edges show crisp bevels; buckles reflect warm window points; slate shows wet spec streaks.',
    microFallback: 'Droplet beads, lattice bevels, buckle reflections, wet slate streaks visible.',
  },
  {
    name: '574-pool-lace-lisbon-azulejo',
    scene: 'Lisbon azulejo courtyard pool: blue-and-white tile walls, citrus trees, warm lanterns, late afternoon sun. Water flickers across tile. Private, bright.',
    pose: 'Standing near the tile wall, one hand resting lightly on the coping and the other on her hip; torso three-quarter to camera.',
    geometry: 'Keyhole plunge to navel with art-deco fan lace panels, side cutouts with ring anchors, high-cut hips, open back to waist with clean strap anchors.',
    material: 'Satin-backed lace over matte crepe base with crystal ring connectors.',
    materialFallback: 'Lace over crepe base with ring connectors.',
    micro: 'AZULEJO: tile patterns remain crisp under wet sheen; lace fan ribs cast tight micro-shadows; ring connectors show tiny glints; sun adds warm highlight bloom.',
    microFallback: 'Wet tile sheen, lace micro-shadows, ring glints, warm bloom visible.',
  },
  {
    name: '575-pool-lace-mexico-city-jardin',
    scene: 'Mexico City garden pool: lush greenery, volcanic stone coping, soft string lights, humid air, gentle water ripples. Private, lush.',
    pose: 'Reclined on a daybed, one arm overhead and the other resting on the thigh; legs extended; face to camera.',
    geometry: 'Deep V plunge to navel with iris-petal applique over sheer tulle, side cutouts with chain-link anchors, high-cut hips, open back to waist.',
    material: 'Gloss nylon base with applique lace petals over tulle and onyx-toned chain hardware.',
    materialFallback: 'Nylon base with applique over tulle and chain hardware.',
    micro: 'JARDIN: petal edges show thickness and shadow; tulle grid visible at grazing; chain links show tight spec highlights; volcanic stone shows damp micro-pits.',
    microFallback: 'Applique edge thickness, tulle grid, chain highlights, damp stone pits visible.',
  },
  {
    name: '576-pool-lace-zurich-lakeview',
    scene: 'Zurich lakeview rooftop pool: pale concrete deck, glass rail, calm lake beyond, cool twilight, soft architectural lighting. Private, clean.',
    pose: 'Standing beside the pool edge, one hand on the rail and the other resting at her waist; relaxed contrapposto; gaze to camera.',
    geometry: 'High-neck choker with vertical plunge to navel, micro-dot tulle underlay with lace filigree overlays, arc side cutouts, high-cut hips, open back to waist.',
    material: 'Matte crepe base with micro-dot tulle and lace filigree overlays.',
    materialFallback: 'Crepe base with tulle and lace overlays.',
    micro: 'LAKEVIEW: cool ambient light lifts soft rim; tulle dot lattice is crisp; lace filigree casts fine shadows; concrete shows wet sheen and faint reflections.',
    microFallback: 'Cool rim, tulle lattice, lace shadows, wet concrete sheen visible.',
  },
  {
    name: '577-pool-lace-copenhagen-harbor',
    scene: 'Copenhagen harbor pool: light wood deck, modern glass rail, harbor lights, cool mist, clean Nordic lines. Private, calm.',
    pose: 'Sitting on a low bench, legs angled to one side, one hand resting on the bench and the other lightly at her collarbone; face to camera.',
    geometry: 'Asymmetric one-shoulder strap with diagonal plunge to navel, chevron lace panels, rib cutouts with micro-clasps, high-cut hips, open back to waist.',
    material: 'Satin-backed lace with chevron geometry and black-chrome micro-clasps.',
    materialFallback: 'Satin-backed lace with chevron panels and micro-clasps.',
    micro: 'HARBOR: cool mist adds soft bloom; chevron ridges show directional sheen; clasps reflect harbor points; wood deck shows damp grain and subtle reflections.',
    microFallback: 'Mist bloom, chevron sheen, clasp reflections, damp wood grain visible.',
  },
  {
    name: '578-pool-lace-scottsdale-saguaro',
    scene: 'Scottsdale desert resort pool: saguaro silhouettes, sandstone coping, fire bowls, warm amber light, cool pool glow. Dry air, private.',
    pose: 'Standing near a fire bowl, one hand on the warm stone and the other resting at her hip; weight on back leg; gaze to camera.',
    geometry: 'Cowl plunge to navel with dense lace core and open perimeter, ring-anchored cutout ribs, high-cut hips, open back to waist with curved seam mapping.',
    material: 'Liquid satin base with dense lace core and brushed brass ringlets.',
    materialFallback: 'Satin base with lace core and brass ringlets.',
    micro: 'DESERT: sandstone shows damp granular texture; lace core casts tight micro-shadows; brass ringlets show soft spec bands; firelight adds warm flicker.',
    microFallback: 'Damp sandstone grain, lace shadows, brass spec, warm flicker visible.',
  },
  {
    name: '579-pool-lace-seville-patio',
    scene: 'Seville patio pool: patterned tiles, orange trees, wrought iron details, warm dusk light, gentle water movement. Private, romantic.',
    pose: 'Kneeling on a tiled step with one hand resting on the step and the other on her thigh; torso angled to camera; calm gaze.',
    geometry: 'Off-shoulder bardot plunge to navel with scalloped lace edge, crescent side cutouts, ring connectors, high-cut hips, open back to waist.',
    material: 'Satin base with scalloped lace overlay and crystal ring connectors.',
    materialFallback: 'Satin base with lace overlay and ring connectors.',
    micro: 'SEVILLE: tile patterns remain crisp under wet sheen; scalloped lace edge casts fine shadows; ring connectors sparkle; warm dusk adds soft bloom.',
    microFallback: 'Wet tile sheen, lace shadows, ring sparkle, soft bloom visible.',
  },
  {
    name: '580-pool-lace-santafe-adobe',
    scene: 'Santa Fe adobe courtyard pool: terracotta walls, timber beams, desert plants, warm lanterns, clear night sky. Water reflects amber tones. Private, grounded.',
    pose: 'Standing beside the pool, one hand resting on the adobe wall and the other at her collarbone; relaxed stance; eyes to camera.',
    geometry: 'Strapless plunge to navel with veil panel over center, lattice side cutouts, micro-buckle straps at the back, high-cut hips, open back to waist.',
    material: 'Matte crepe base with sheer veil lace panel and titanium micro-buckles.',
    materialFallback: 'Crepe base with lace veil panel and micro-buckles.',
    micro: 'ADOBE: wall texture shows soft grain under warm light; veil panel diffuses highlights; buckle edges reflect small lantern points; wet stone shows thin spec bands.',
    microFallback: 'Adobe grain, veil diffusion, buckle spec, wet stone spec bands visible.',
  },
  {
    name: '581-pool-lace-glassline-splitlevel',
    scene: 'Glass-walled split-level pool at night: camera at the waterline with half-above/half-below view, underwater LEDs, warm lantern points, rain-fresh air. Waterline acts as a lens; droplets on glass edge; wet deck mirrors bokeh. Private, high-design.',
    pose: 'Chest-deep at the glass wall, both hands resting on the top edge; shoulders relaxed; head turned to camera; waterline crosses mid-torso with realistic refraction.',
    geometry: 'High-neck choker with vertical keyhole plunge to navel, engineered side windows with ring anchors, high-cut hips, open back to mid-waist.',
    material: 'Gloss nylon base with lace lattice overlay and black-chrome ring connectors.',
    materialFallback: 'Nylon base with lace overlay and ring connectors.',
    micro: 'SPLIT-LEVEL: waterline distorts anatomy and garment edges via refraction; lace filaments bead with micro-droplets; underwater LEDs create moving caustic bands; glass wall shows thin edge reflections and faint streaking.',
    microFallback: 'Waterline refraction, lace droplets, LED caustics, glass reflections visible.',
  },
  {
    name: '582-pool-lace-hongkong-monsoon',
    scene: 'Hong Kong rooftop pool in a warm monsoon downpour: neon skyline reflections, wind-driven rain streaks, puddled deck, misty air, distant thunder glow. Wet stone and metal surfaces show sharp spec cores with roughness halos. Private, cinematic.',
    pose: 'Standing on the wet deck near the pool edge, one hand gripping the glass rail and the other brushing wet hair back; shoulders slightly forward against the rain; gaze to camera.',
    geometry: 'Asymmetric one-shoulder strap with diagonal plunge to navel, reinforced cutout ribs with micro-clasps, high-cut hips, open back to mid-waist.',
    material: 'Satin-backed lace over a matte crepe base with black-chrome micro-clasps.',
    materialFallback: 'Lace over crepe base with micro-clasps.',
    micro: 'MONSOON: raindrops bead on lace and skin; micro-splashes on deck; neon spill adds subtle spectral tint; wet glass rail shows tiny droplets that refract point lights; motion blur appears in some rain streaks.',
    microFallback: 'Rain beads, neon tint, wet rail droplets, wet deck spec visible.',
  },
  {
    name: '583-pool-lace-hokkaido-snowsteam',
    scene: 'Hokkaido snow-and-steam spa pool at blue hour: snowflakes falling into warm water, basalt coping, paper lanterns, dense steam plumes, cold air haze. Condensation collects on surfaces; wet stone glows under warm light. Private, serene.',
    pose: 'Seated on the basalt edge with legs in the water, hands resting on the coping; shoulders wrapped in steam; face angled to camera with calm gaze.',
    geometry: 'Keyhole plunge to navel with cathedral-rib lace panels, narrow center gore, side cutouts with ring anchors, high-cut hips, open back to mid-waist.',
    material: 'Matte neoprene-like base with stiffened lace ribs and brushed brass ringlets.',
    materialFallback: 'Matte base with lace ribs and brass ringlets.',
    micro: 'SNOW+STEAM: steam scatters lantern highlights into soft bloom; snow melts into droplets on hair and straps; lace ribs read as stiff beams with wet sheen; basalt shows wet micro-gloss and patina.',
    microFallback: 'Steam bloom, melting snow droplets, lace rib stiffness, wet basalt gloss visible.',
  },
  {
    name: '584-pool-lace-starfield-fiberoptic',
    scene: 'Fiber-optic "starfield" pool at night: thousands of pin lights embedded in the pool floor, dark water with pin-caustics, wet teak deck, few lantern accents, deep black sky. Private, otherworldly.',
    pose: 'Reclined on a submerged bench with elbows on the coping, torso lifted above waterline; one knee bent; head turned to camera.',
    geometry: 'Deep V plunge to navel with rose-window radial lace core, halo harness strap routing, ring-anchored side windows, high-cut hips, open back to mid-waist.',
    material: 'Gloss nylon base with radial lace overlay and crystal ring connectors.',
    materialFallback: 'Nylon base with lace overlay and ring connectors.',
    micro: 'STARFIELD: pinpoint lights create tiny caustic specks on wet skin and lace; crystal rings throw micro-prismatic glints; teak shows damp grain with sharp pin reflections; water surface ripples break pin lights into short streaks.',
    microFallback: 'Pinpoint caustics, ring glints, damp teak grain, ripple streaks visible.',
  },
  {
    name: '585-pool-lace-projection-mapped-caustics',
    scene: 'Projection-mapped pool art installation at night: geometric light patterns projected onto water and deck, patterns warp with ripples and caustics, mild haze, wet stone reflects animated shapes. Private, high-fashion event energy without crowds.',
    pose: 'Standing in shallow water on a sun shelf, one knee bent with foot planted; arms relaxed slightly away from torso so projected patterns fall across garment and skin; eyes to camera.',
    geometry: 'Strapless plunge to navel stabilized by illusion mesh yoke, lattice side cutouts with micro-buckle anchors, high-cut hips, open back to mid-waist.',
    material: 'Matte crepe swim base with lace overlay, bonded edges, and titanium micro-buckles.',
    materialFallback: 'Crepe base with lace overlay and micro-buckles.',
    micro: 'PROJECTION: projected shapes show correct occlusion and wrap with body curvature; wet surface reflections obey Fresnel; lace microstructure modulates projected light into high-frequency breakup; buckles reflect sharp pattern highlights.',
    microFallback: 'Projected pattern wrap, wet Fresnel reflections, lace breakup, buckle highlights visible.',
  },
  {
    name: '586-pool-lace-brewster-polarizer-ledge',
    scene: 'Low-angle pool-ledge shot at dusk: strong low sun/spotlight grazing the water surface, reflections controlled by a circular polarizer look (reduced glare reveals tile pattern under the surface). Warm-to-cool gradient light, wet marble coping, calm ripples. Private, technical glamour.',
    pose: 'Leaning forward over the coping with hands on knees, torso angled three-quarter to camera; head turned to camera; water surface occupies foreground with visible tile detail beneath.',
    geometry: 'High-neck plunge with oval keyhole to navel, chevron lace panels, reinforced side windows with ring anchors, high-cut hips, open back to mid-waist.',
    material: 'Satin-backed lace over a gloss nylon base with black-chrome ring connectors.',
    materialFallback: 'Lace over nylon base with ring connectors.',
    micro: 'POLARIZATION: glare reduction reveals subsurface tile detail and deeper cyan; spec highlights dim in a physically plausible way; lace filaments show anisotropic sheen at grazing angles; marble coping shows wet veining with sharp reflections.',
    microFallback: 'Reduced glare, tile detail, lace sheen, wet marble reflections visible.',
  },
  {
    name: '587-pool-lace-seoul-neon-ladder',
    scene: 'Seoul neon alley rooftop pool: saturated cyan/magenta signage reflected in wet metal ladder rails and water, light mist, glossy black tile coping. Pool LEDs add cool edge light; neon adds spectral spill. Private, urban couture.',
    pose: 'Stepping up the pool ladder with one foot on a rung and one hand gripping the rail; torso rotated toward camera; water streams off the leg and drips from the suit edges; gaze to camera.',
    geometry: 'Diagonal plunge to navel with lattice cutouts, narrow reinforced side bridges, micro-grommet anchors, high-cut hips, open back to mid-waist.',
    material: 'High-gloss nylon base with lace lattice and black-chrome micro-grommets.',
    materialFallback: 'Nylon base with lace lattice and micro-grommets.',
    micro: 'NEON LADDER: wet metal rails show tight spec bands and tiny droplets; neon reflections smear slightly on wet tile; water drip trails form coherent beads and short streaks; lace edge thickness remains crisp under wet adhesion.',
    microFallback: 'Wet rail spec, neon wet reflections, drip trails, lace edges visible.',
  },
  {
    name: '588-pool-lace-cape-windspray',
    scene: 'Cliffside infinity pool in strong coastal wind: blown spray, hair strands lifted, distant ocean shimmer, cool sky glow plus warm lantern accents. Droplets occasionally hit the lens creating soft refractive bokeh. Wet stone coping shows damp micro-pitting. Private, dramatic.',
    pose: 'Standing at the infinity edge with both hands braced on the coping, weight forward into the wind; shoulders engaged; chin slightly down; eyes to camera.',
    geometry: 'Off-shoulder bardot plunge to navel with scalloped lace edge, controlled side windows with strap bridges, high-cut hips, open back to mid-waist.',
    material: 'Liquid satin base with scalloped lace overlay and brushed brass ringlets.',
    materialFallback: 'Satin base with lace overlay and brass ringlets.',
    micro: 'WIND+SPRAY: airborne droplets catch rim light; a few lens droplets create distorted bokeh; lace fringe casts fine shadows even when damp; wet stone shows sharp spec cores with roughness halos.',
    microFallback: 'Spray droplets, lens bokeh droplets, damp lace shadows, wet stone spec visible.',
  },
  {
    name: '589-pool-lace-milan-mirrorwall',
    scene: 'Milan modernist pool with a mirror-polished stainless wall: multiple reflections, slight distortion, wet black tile coping, warm pin lights and cool pool glow. Reflections obey Fresnel and show subtle ghosting. Private, architectural.',
    pose: 'Standing close to the mirror wall, one hand resting flat against the cool metal and the other at her waist; torso three-quarter to camera; gaze to camera; reflections show clean separation.',
    geometry: 'High-neck choker with vertical plunge to navel, micro-dot tulle underlay with lace filigree overlays, arc side cutouts, high-cut hips, open back to mid-waist.',
    material: 'Matte crepe base with micro-dot tulle and lace filigree overlays; black chrome hardware accents.',
    materialFallback: 'Crepe base with tulle and lace overlays.',
    micro: 'MIRRORWALL: polished steel shows tight spec bands and faint double-image ghosting; moire appears subtly in fine lace at distance; wet black tile shows crisp reflections; hardware glints are small and sharp.',
    microFallback: 'Steel reflections, subtle moire, wet tile reflections, sharp hardware glints visible.',
  },
  {
    name: '590-pool-lace-microbubble-volumetric',
    scene: 'Microbubble spa pool at night: aeration jets create a vertical "bubble curtain" that scatters underwater LEDs into a volumetric glow, warm lantern points above, wet stone deck with puddles. Private, luminous.',
    pose: 'Sitting on a submerged ledge near the bubble curtain, one hand trailing through the bubbles and the other resting on the coping; torso angled to camera; relaxed gaze.',
    geometry: 'Deep V plunge to navel with bar-slim center gore, ring-anchored side windows, high-cut hips, open back to mid-waist with clean strap routing.',
    material: 'Gloss nylon base with lace core panel and brushed brass ringlets.',
    materialFallback: 'Nylon base with lace core and brass ringlets.',
    micro: 'MICROBUBBLES: bubbles create soft volumetric shafts and glittering highlights; water surface shows turbulent breakup near jets; lace microstructure remains visible through scattering; wet deck reflects the glowing plume with distorted edges.',
    microFallback: 'Volumetric bubble glow, turbulent surface, lace visibility, wet deck reflections visible.',
  },
  {
    name: '591-pool-lace-underwater-snellswindow',
    scene: 'Underwater camera view in a clear pool at night: looking upward through the surface shows Snell\'s window and total internal reflection outside it; underwater LEDs add cyan gradients; warm lanterns shimmer as refracted streaks. Private, hyper-real.',
    pose: 'Leaning over the coping with forearms on the edge, head angled down toward the underwater camera; shoulders relaxed; eyes to camera through the waterline distortions.',
    geometry: 'High-neck asymmetric one-shoulder with narrow vertical keyhole stabilized by illusion mesh to the navel line; controlled side windows; open back to mid-waist.',
    material: 'Satin-backed lace over gloss nylon with crystal ring connectors.',
    materialFallback: 'Lace over nylon with ring connectors.',
    micro: 'UNDERWATER OPTICS: surface normals distort face and garment edges; total internal reflection shows mirrored deck lights; caustics dance across the suit; micro-bubbles and particulate add depth; ring hardware throws tiny caustic sparkles.',
    microFallback: 'Surface refraction, TIR reflections, caustics, particulate depth visible.',
  },
  {
    name: '592-pool-lace-caustic-gobo-pattern',
    scene: 'Night pool with patterned LED "gobo" lighting: a structured caustic grid projects onto wet deck and body, then breaks and flows with ripples. Polished stone coping, mild haze, crisp shadows. Private, engineered spectacle.',
    pose: 'Standing on the wet deck at poolside, one hand on hip and the other lightly on the coping; torso angled to camera; the patterned light clearly falls across garment panels.',
    geometry: 'Strapped plunge to navel with lattice cutouts, reinforced side bridges, micro-buckle anchors, high-cut hips, open back to mid-waist.',
    material: 'High-gloss nylon base with lace lattice and titanium micro-buckles.',
    materialFallback: 'Nylon base with lace lattice and micro-buckles.',
    micro: 'PATTERNED CAUSTICS: projected grid shows correct occlusion and contact shadows; wet stone reflections distort grid with micro-puddles; lace weave modulates the grid into high-frequency shimmer; buckles reflect crisp pattern highlights.',
    microFallback: 'Structured caustics, wet reflection distortion, lace modulation, buckle highlights visible.',
  },
  {
    name: '593-pool-lace-laminar-waterfall',
    scene: 'Luxury pool with a thin laminar spillway waterfall: sheet of water drops into the pool, transitioning from laminar to turbulent breakup; wet stone shows streaks; lantern points and pool LEDs create spec highlights in the falling sheet. Private, kinetic.',
    pose: 'Standing beside the spillway, one hand lightly intersecting the falling sheet water and the other braced on the coping; torso angled to camera; eyes to camera.',
    geometry: 'Cowl-drape plunge to navel with diagonal seam tessellation, arc side cutouts with ring connectors, high-cut hips, open back to mid-waist.',
    material: 'Liquid satin base with baroque lace overlay and brushed brass ring connectors.',
    materialFallback: 'Satin base with lace overlay and ring connectors.',
    micro: 'LAMINAR SHEET: falling water shows coherent sheet thickness then edge breakup into droplets; highlights stretch along the sheet; wet lace shows darker capillary lines at edges; stone shows wet streaking and micro-pits.',
    microFallback: 'Sheet water breakup, stretched highlights, wet lace edge lines, wet stone streaks visible.',
  },
  {
    name: '594-pool-lace-glassbottom-skybridge',
    scene: 'Glass-bottom skybridge pool at night: transparent floor reveals city lights below; glass rail, chrome accents, cool pool glow, warm pin lights. Reflections and refractions stack through glass and water layers. Private, vertigo luxe.',
    pose: 'Standing in shallow water above the glass floor, one hand on the rail and the other at her collarbone; feet planted; head turned to camera; city lights visible beneath.',
    geometry: 'High-neck choker with oval keyhole plunge to navel, cathedral-arch lace paneling, ring-anchored side windows, high-cut hips, open back to mid-waist.',
    material: 'Gloss nylon base with cathedral lace overlay and black-chrome ring connectors.',
    materialFallback: 'Nylon base with lace overlay and ring connectors.',
    micro: 'GLASS STACK: layered refraction through water+glass shifts the city lights; glass edges show thin highlights; wet surfaces show double reflections; lace microstructure remains crisp against complex light fields.',
    microFallback: 'Layered refraction, glass edge highlights, wet double reflections, crisp lace visible.',
  },
  {
    name: '595-pool-lace-cenote-sunshafts',
    scene: 'Limestone cenote pool: skylight opening above casts sharp sunbeam shafts through humid air and particulate; water depth gradients from emerald to deep blue; wet rock textures and mineral streaks. Quiet, private, primal luxury.',
    pose: 'Standing in shallow water near a rock ledge, one hand touching the limestone wall and the other resting at her waist; torso angled to camera; gaze steady.',
    geometry: 'Diagonal plunge to navel with iris-petal applique over tulle, reinforced side windows with chain-link anchors, high-cut hips, open back to mid-waist.',
    material: 'Matte crepe base with applique lace petals over tulle and onyx-toned chain hardware.',
    materialFallback: 'Crepe base with applique over tulle and chain hardware.',
    micro: 'CENOTE: volumetric sunshafts show depth falloff; particulate sparkles in beams; wet limestone has granular sheen and mineral streaks; tulle grid resolves at grazing angles; chain links flash tight highlights.',
    microFallback: 'Sunshafts, particulate sparkle, wet limestone texture, tulle grid visible.',
  },
  {
    name: '596-pool-lace-norway-aurora',
    scene: 'Norwegian fjord-side heated pool under aurora: green/purple ribbons reflect on wet stone and water; steam rises into cold air; dark mountains silhouette; warm lantern points. Private, unreal-but-real.',
    pose: 'Waist-deep in the pool with forearms on the coping, shoulders relaxed; chin slightly down; eyes to camera; aurora reflection streaks on the water surface.',
    geometry: 'Off-shoulder plunge to navel with baroque arabesque lace overlay, crescent side cutouts with ring connectors, high-cut hips, open back to mid-waist.',
    material: 'Satin-backed lace over gloss nylon with crystal ring connectors.',
    materialFallback: 'Lace over nylon with ring connectors.',
    micro: 'AURORA: colored sky glow casts soft spectral gradients on wet surfaces; steam scatters color into gentle bloom; lace filaments bead with condensation; crystal rings add tiny refractive glints.',
    microFallback: 'Aurora color gradients, steam bloom, condensation beads, ring glints visible.',
  },
  {
    name: '597-pool-lace-crystal-prism-flares',
    scene: 'Art-deco pool with a crystal sconce wall: faceted crystals create prismatic dispersion and small rainbow flares; wet marble coping, cool pool LEDs, warm tungsten points. Private, jewel-box.',
    pose: 'Seated on the marble edge, one hand braced behind and the other resting at her thigh; torso angled to camera; crystal light sources visible in background bokeh.',
    geometry: 'Deep V plunge to navel with rose-window radial lace core, micro-ring cutouts, high-cut hips, open back to mid-waist.',
    material: 'Liquid satin base with radial lace overlay and crystal ring connectors.',
    materialFallback: 'Satin base with lace overlay and ring connectors.',
    micro: 'PRISM: crystals throw tiny spectral flares and caustic streaks; wet marble veining stays crisp in reflections; lace micro-shadows remain visible; ring hardware refracts pin highlights into short colored streaks.',
    microFallback: 'Prismatic flares, wet marble reflections, lace shadows, colored ring streaks visible.',
  },
  {
    name: '598-pool-lace-obsidian-blackwater',
    scene: 'Obsidian black-tile pool at night: ultra-dark water, tight rim lighting, chrome rail accents, sparse warm lanterns, deep shadows. Reflections are sharp but limited; mood is high-contrast and sculptural. Private, severe.',
    pose: 'Standing at the edge with one foot on a wet step and the other on the deck, one hand on the coping and the other at her collarbone; torso three-quarter; gaze to camera.',
    geometry: 'High-neck plunge with narrow vertical keyhole to navel, chevron lace panels, ring-anchored side windows, high-cut hips, open back to mid-waist.',
    material: 'Gloss nylon base with metallic filament lace overlay and black-chrome ring connectors.',
    materialFallback: 'Nylon base with lace overlay and ring connectors.',
    micro: 'BLACKWATER: specular highlights ride the garment curvature; lace filaments show anisotropic glints against near-black; chrome rails show tight bands; wet tile shows micro-puddles with sharp spec cores and faint halos.',
    microFallback: 'Curvature spec, lace glints on dark, chrome bands, wet tile puddle spec visible.',
  },
  {
    name: '599-pool-lace-uyuni-mirrorhorizon',
    scene: 'Salt-flat mirror-horizon pool at dusk (Uyuni-inspired): thin wet deck film creates mirror reflections, huge sky gradient, distant horizon line, calm pool surface with subtle ripples. Warm lantern accents keep it luxury and intimate. Private, expansive.',
    pose: 'Standing on the wet deck with feet apart for balance, arms relaxed at sides; torso facing camera; head turned slightly; reflections of legs and lights appear in the wet film.',
    geometry: 'Cowl-drape plunge to navel with scalloped lace edge, arc side cutouts with ring anchors, high-cut hips, open back to mid-waist.',
    material: 'Satin-backed lace over a matte crepe base with brushed brass ringlets.',
    materialFallback: 'Lace over crepe base with brass ringlets.',
    micro: 'MIRROR HORIZON: thin water film creates crisp reflections with slight surface waviness; lace edges show visible thickness; brass ringlets catch warm pin lights; micro ripples distort reflections coherently.',
    microFallback: 'Wet-film reflections, lace edges, brass pin highlights, ripple distortion visible.',
  },
  {
    name: '600-pool-lace-underwater-glass-sculpture',
    scene: 'Gallery-grade pool with a submerged hand-blown glass sculpture: complex refraction and dispersion from the glass creates intricate caustic ribbons across wet stone and the suit; cool pool LEDs plus warm lantern points. Private, art-forward luxury.',
    pose: 'Standing in shallow water near the sculpture with one hand on the coping and the other lightly extended toward the water surface; torso angled to camera; gaze to camera.',
    geometry: 'Strapped plunge to navel with lattice cutouts, reinforced side bridges with ring anchors, high-cut hips, open back to mid-waist.',
    material: 'Gloss nylon base with lace lattice overlay and crystal ring connectors.',
    materialFallback: 'Nylon base with lace overlay and ring connectors.',
    micro: 'GLASS CAUSTICS: caustic ribbons are coherent with wave motion and glass curvature; dispersion produces subtle colored fringes; lace microstructure catches caustic pinpoints; wet stone shows layered reflections and micro-pitting.',
    microFallback: 'Caustic ribbons, subtle dispersion, lace pinpoints, wet stone micro-pits visible.',
  },
  {
    name: '601-pool-lace-laser-haze-lattice',
    scene: 'Night pool with low-lying haze and a precision laser lattice: beams traverse humid air above the water and form geometric intersections on wet stone. Warm sconces provide low-intensity fill to preserve skin tone realism. Private, engineered spectacle.',
    pose: 'Standing on a wet deck seam line with one foot half-turned and shoulders square to camera; one hand lightly touching the coping rail; eyes to camera.',
    geometry: 'High-neck one-piece with reinforced central keyhole ending above the sternum line, controlled side windows with narrow bridges, full back panel to mid-waist, high-cut hips.',
    material: 'Matte crepe base with corded guipure lace overlay and graphite micro-rings.',
    materialFallback: 'Crepe base with lace overlay and micro-rings.',
    micro: 'LASER VOLUMETRICS: beam segments show particulate-dependent brightness falloff; intersections brighten without overbloom; wet deck returns thin specular lines aligned to beam incidence; lace thread relief modulates line continuity at sub-centimeter scale.',
    microFallback: 'Volumetric beams, intersection brightening, beam-aligned wet reflections, lace relief modulation visible.',
  },
  {
    name: '602-pool-lace-co2-crossflow-ripples',
    scene: 'Concert-grade pool terrace with synchronized CO2 jets firing across the set, creating lateral vapor sheets that sweep over warm pool air. LED strip lighting remains subdued and directional. Private, kinetic event energy.',
    pose: 'Three-quarter stance at pool edge with knees softly flexed as if bracing against airflow; one hand on hip, the other resting on the rail; chin level to camera.',
    geometry: 'Asymmetric one-shoulder one-piece with narrow plunge panel to upper midline, diagonal side cutouts with reinforced mesh, full back panel with tensioned spine seam.',
    material: 'Satin-backed lace over gloss nylon with black-chrome clasp hardware.',
    materialFallback: 'Lace over nylon with clasp hardware.',
    micro: 'CROSSFLOW FORCES: vapor streaks indicate lateral wind vectors; garment edges show mild leeward lift while anchored seams remain stable; condensation beads cluster on windward lace ridges; specular highlights elongate along local flow direction.',
    microFallback: 'Lateral vapor flow, edge lift vs stable seams, windward condensation, flow-aligned highlights visible.',
  },
  {
    name: '603-pool-lace-projection-facet-drift',
    scene: 'Architectural pool court with projection-mapped facets moving across wall planes, water, and wet marble. The mapping is calibrated to structure and drifts slowly with designed parallax. Private, cinematic installation.',
    pose: 'Seated on the pool coping with torso upright and shoulders angled 20 degrees to camera; one hand braced behind, one hand resting on thigh; gaze direct.',
    geometry: 'High-collar one-piece with oval front aperture to upper midline, chevron side insets with narrow connectors, sculpted back with locked seam channels.',
    material: 'Liquid satin base with geometric lace overlay and titanium micro-buckles.',
    materialFallback: 'Satin base with lace overlay and micro-buckles.',
    micro: 'PROJECTION MAPPING: projected edges follow scene geometry and occlude correctly at body contour breaks; wet marble introduces controlled secondary reflections; lace mesh creates high-frequency luminance breakup; buckle faces retain crisp highlight rolloff.',
    microFallback: 'Geometry-locked projection edges, wet secondary reflections, lace luminance breakup, crisp buckle rolloff visible.',
  },
  {
    name: '604-pool-lace-confetti-caustic-rain',
    scene: 'Open-air luxury pool at night with a controlled confetti drop over the water plane. Floating fragments and wet surfaces create transient glints while pool caustics remain visible below. Private, celebratory but physically grounded.',
    pose: 'Standing mid-step on shallow entry ledge, weight over front leg; one arm relaxed by side, the other touching the collar line; head turned slightly back to camera.',
    geometry: 'Structured square-neck one-piece with centered key aperture above sternum, restrained lateral cutouts, full back panel with reinforced waist seam.',
    material: 'Polished nylon base with micro-dot tulle and lace filigree overlay; brushed brass ringlets.',
    materialFallback: 'Nylon base with tulle-lace overlay and brass ringlets.',
    micro: 'PARTICLE INTERACTION: confetti pieces show depth-sorted blur and realistic drag trajectories; wet film reflections flicker with fragment motion; lace catches sparse pin highlights without texture swim; ringlets produce short warm spec spikes.',
    microFallback: 'Depth-sorted confetti blur, flicker reflections, stable lace texture, warm ringlet spikes visible.',
  },
  {
    name: '605-pool-lace-wristband-spectral-orbit',
    scene: 'Festival-style pool venue with synchronized audience wristband lights orbiting the perimeter in timed color waves. Ambient light remains low to preserve contrast and realistic skin rendering. Private, immersive crowd-energy simulation.',
    pose: 'Waist-deep at pool edge with forearms resting on coping; shoulders relaxed; head rotated to camera with a calm expression.',
    geometry: 'High-neck one-piece with narrow vertical center slit to upper midline, side panels in scalloped lace, secure full back with tensioned shoulder anchors.',
    material: 'Matte crepe and satin hybrid with scalloped lace overlay and crystal micro-connectors.',
    materialFallback: 'Crepe-satin hybrid with lace overlay and micro-connectors.',
    micro: 'MULTI-POINT LIGHT FIELD: perimeter emitters produce soft phase-shifted chroma gradients; wet skin and garment show subtle cross-color spec separation; lace filaments retain local contrast under mixed hues; reflections decay with inverse-distance plausibility.',
    microFallback: 'Phase-shift chroma gradients, subtle cross-color spec, lace contrast retention, distance-based reflection decay visible.',
  },
  {
    name: '606-pool-lace-fireline-dual-cct',
    scene: 'High-end pool courtyard with parallel fireline features and cool underwater LEDs, creating a dual-CCT lighting split across the scene. Steam from warm water drifts through both color zones. Private, dramatic contrast.',
    pose: 'Standing on wet stone between fireline and pool edge; torso angled toward cool side while face turns to camera; one hand near waist seam.',
    geometry: 'Boat-neck one-piece with shallow angular front cut panel, controlled side windows, reinforced back lattice with low-stretch spine channels.',
    material: 'Satin-backed lace with metallic filament accents and black-chrome hardware.',
    materialFallback: 'Satin-backed lace with metallic accents and hardware.',
    micro: 'DUAL-CCT TRANSPORT: warm and cool highlights remain separable across curvature; steam blooms differently by color temperature; metallic threads show warmer anisotropic response on fire side and tighter cool spec on LED side; no channel clipping.',
    microFallback: 'Warm-cool highlight separation, temperature-dependent steam bloom, dual anisotropic thread response visible.',
  },
  {
    name: '607-pool-lace-bubble-drift-refraction',
    scene: 'Infinity pool with bubble curtain emitters near the far edge, sending rising micro-bubble columns through cyan-lit water. Wet deck and glass guardrail capture controlled reflections. Private, fluid mechanics focus.',
    pose: 'One knee on a submerged step and one foot planted on the ledge; torso upright and slightly twisted toward camera; one hand on rail.',
    geometry: 'High-coverage one-piece with curved upper aperture to upper midline, radial lace side panels, secure back yoke with reinforced seam anchors.',
    material: 'Gloss nylon base with radial lace overlay and titanium ring connectors.',
    materialFallback: 'Nylon base with lace overlay and ring connectors.',
    micro: 'BUBBLE OPTICS: bubble columns show size stratification with depth; refracted background lines warp through bubble clusters; wet garment spec remains coherent despite moving caustics; lace shadows maintain edge sharpness on curved surfaces.',
    microFallback: 'Size-stratified bubbles, bubble refraction warp, coherent garment spec, sharp lace-edge shadows visible.',
  },
  {
    name: '608-pool-lace-mirror-kaleidoscope-corridor',
    scene: 'Poolside mirror corridor with angled reflective panels creating controlled recursive reflections and depth illusions. Floor is wet but not flooded, preserving realistic highlight structure. Private, optical architecture.',
    pose: 'Walking slowly along corridor edge with shoulders parallel to mirror plane; one hand gliding near the panel seam; head turned to camera.',
    geometry: 'High-neck one-piece with restrained geometric front aperture, narrow side channels with bridge stitching, full back panel and reinforced shoulder seams.',
    material: 'Matte crepe base with geometric lace overlay and onyx micro-clasps.',
    materialFallback: 'Crepe base with lace overlay and micro-clasps.',
    micro: 'RECURSIVE REFLECTIONS: mirror bounces attenuate per recursion with slight contrast loss; panel seams remain physically aligned; wet floor adds first-order reflection only with mild ripple distortion; lace scale remains stable across reflections.',
    microFallback: 'Attenuated recursive reflections, aligned mirror seams, first-order wet reflections, stable lace scale visible.',
  },
  {
    name: '609-pool-lace-kinetic-fan-vortex',
    scene: 'Modern pool stage with silent kinetic fans generating a controlled vortex pattern in suspended mist over water. Architectural uplights provide stable base illumination. Private, motion-science aesthetic.',
    pose: 'Standing with weight on back leg and front toe angled outward; one hand at collar seam and one arm relaxed; chin slightly down to camera.',
    geometry: 'Asymmetric high-collar one-piece with offset center aperture, curved side panels with reinforced joins, full back with tensioned vertical seam channels.',
    material: 'Satin and matte-crepe composite with wave-loop lace overlay and graphite hardware.',
    materialFallback: 'Satin-crepe composite with lace overlay and hardware.',
    micro: 'VORTEX FIELD: mist forms spiral density bands consistent with fan vectoring; loose garment edges show minimal flutter while seam anchors remain fixed; condensation accumulates at lace relief peaks; specular streaks bend with local airflow direction.',
    microFallback: 'Spiral mist bands, anchored seams vs minor flutter, relief condensation, airflow-bent spec streaks visible.',
  },
  {
    name: '610-pool-lace-rain-curtain-strobe',
    scene: 'Luxury pool pavilion with a perimeter rain curtain and low-frequency strobe accents reflected in wet granite. Rain sheet is controlled and laminar near nozzle with turbulent breakup below. Private, performance-grade atmosphere.',
    pose: 'Near the rain curtain with torso angled away and head turned back to camera; one hand extended toward the water sheet without contact; stable stance on wet stone.',
    geometry: 'Square-neck one-piece with central mesh-backed aperture above midline, subtle side insets, full back panel with reinforced waist seam.',
    material: 'Gloss nylon underlayer with guipure lace overlay and micro-grommet detailing.',
    materialFallback: 'Nylon underlayer with lace overlay and grommet detailing.',
    micro: 'RAIN SHEET PHYSICS: droplet transition from laminar to turbulent is visible; strobe freezes selected droplet clusters while maintaining plausible motion blur tails; wet granite returns sharp spec cores with soft halos; lace darkens where saturation rises.',
    microFallback: 'Laminar-to-turbulent rain, selective strobe freeze, granite spec cores, saturation darkening visible.',
  },
  {
    name: '611-pool-lace-fiberoptic-floor-grid',
    scene: 'High-tech pool deck with embedded fiberoptic floor grid lines under translucent stone, producing precise linear light paths around the waterline. Ambient fill is minimal and neutral. Private, precision-luxury.',
    pose: 'Standing directly over a grid intersection with feet offset for balance; one arm bent lightly at waist, the other relaxed; torso facing camera.',
    geometry: 'High-neck one-piece with narrow center slit above sternum, controlled side mesh windows, structured back yoke with low-stretch seam rails.',
    material: 'Matte crepe base with art-deco fan lace overlay and brushed steel connectors.',
    materialFallback: 'Crepe base with lace overlay and steel connectors.',
    micro: 'LINEAR LIGHT CONSTRAINTS: fiberoptic lines remain straight through dry zones and slightly refracted through thin wet film; lace relief interrupts line continuity at micro scale; connector edges show clean Fresnel-like rim response; no blooming washout.',
    microFallback: 'Straight vs refracted light lines, micro relief interruptions, clean rim response, no bloom washout.',
  },
  {
    name: '612-pool-lace-hologauze-interference',
    scene: 'Pool atrium with suspended hologauze layers and controlled front projection, creating interference-like shimmer bands over the background while subject lighting remains physically grounded. Private, avant visual lab.',
    pose: 'Seated side-on on the pool coping with torso rotated toward camera; one hand resting behind for support and one at upper arm; gaze steady.',
    geometry: 'High-coverage one-piece with modest curved front aperture, side lace panels with narrow connectors, full back with reinforced shoulder and waist seams.',
    material: 'Satin-backed lace with micro-bead scatter and black-chrome clasp points.',
    materialFallback: 'Satin-backed lace with micro-bead scatter and clasp points.',
    micro: 'INTERFERENCE SHIMMER: background gauze bands shift with viewing angle but subject edges remain stable; micro-beads generate sparse anisotropic sparkles; wet surfaces show controlled secondary reflections without ghosting artifacts.',
    microFallback: 'Angle-shifting gauze bands, sparse bead sparkles, stable subject edges, controlled secondary reflections.',
  },
  {
    name: '613-pool-lace-photon-jet-prisms',
    scene: 'Contemporary pool with narrow water jets crossing through prism towers, splitting light into faint spectral fringes that travel over wet stone and water ripples. Private, optical engineering showcase.',
    pose: 'Standing between two prism towers with one hand near the nearest jet arc and the other resting at hip level; torso three-quarter to camera.',
    geometry: 'Boat-neck one-piece with centered upper aperture and geometric side channels, full back panel with seam reinforcement at shoulder anchors.',
    material: 'Liquid satin base with chevron lace overlay and crystal ring hardware.',
    materialFallback: 'Satin base with lace overlay and ring hardware.',
    micro: 'JET + PRISM OPTICS: water jets maintain coherent parabolic arcs; prism edges generate subtle wavelength-separated fringes; moving caustics slide over lace relief and preserve thread-scale detail; ring hardware produces brief chromatic spark points.',
    microFallback: 'Coherent jet arcs, subtle spectral fringes, moving caustics on lace relief, chromatic spark points visible.',
  },
  {
    name: '614-pool-lace-stage-smoke-bloom',
    scene: 'Poolside performance platform with low-density stage smoke drifting above warm water and backlit by narrow-beam fixtures. Architectural lighting remains soft and realistic. Private, cinematic atmosphere.',
    pose: 'Standing near the platform edge with shoulders relaxed; one hand touching rail, the other at waist seam; head turned slightly toward camera.',
    geometry: 'High-neck one-piece with minimal upper aperture, restrained side insets with reinforced bridges, full back panel with vertical seam stabilization.',
    material: 'Matte crepe base with baroque lace overlay and graphite micro-buckles.',
    materialFallback: 'Crepe base with lace overlay and micro-buckles.',
    micro: 'SMOKE SCATTER: backlights produce forward-scatter bloom cones with realistic decay; garment highlights retain edge definition despite haze; lace thread shadows remain legible at close range; wet floor shows softened but coherent reflections.',
    microFallback: 'Bloom cone decay, defined garment highlights, legible lace shadows, softened coherent reflections.',
  },
  {
    name: '615-pool-lace-ice-fog-thermal-split',
    scene: 'Cold-night pool deck with heated water and perimeter ice-fog emitters creating a thermal split: warm steam near surface, colder fog layers above. Blue-hour sky and low amber practicals. Private, atmospheric precision.',
    pose: 'At pool edge with one knee bent and one leg straight; one hand on coping and the other lightly touching upper arm; torso angled 25 degrees to camera.',
    geometry: 'Square-neck one-piece with mesh-backed center aperture above sternum, subtle side contours, full back panel and reinforced shoulder seams.',
    material: 'Satin-backed lace over matte crepe with titanium clasp details.',
    materialFallback: 'Lace over crepe with clasp details.',
    micro: 'THERMAL LAYERING: warm steam rises in buoyant plumes while cool fog stratifies and drifts laterally; condensation gradient increases from upper to lower garment zones; specular response broadens in saturated regions; seam continuity remains stable.',
    microFallback: 'Steam-vs-fog layering, vertical condensation gradient, saturation-broadened spec, stable seam continuity.',
  },
  {
    name: '616-pool-lace-circular-halo-array',
    scene: 'Circular halo-light array suspended above a private pool, producing concentric illumination bands on water and wet stone. Secondary warm sconces prevent color flattening. Private, geometric light sculpture.',
    pose: 'Centered beneath the halo array, standing upright with one arm relaxed and one hand lightly at collar seam; chin level and eyes to camera.',
    geometry: 'High-collar one-piece with narrow center aperture to upper midline, controlled side windows with mesh support, full back panel with aligned seam channels.',
    material: 'Gloss nylon base with cathedral-arch lace overlay and steel ring connectors.',
    materialFallback: 'Nylon base with lace overlay and ring connectors.',
    micro: 'CONCENTRIC LIGHTING: halo bands map coherently across curved body surfaces; water returns circular reflection distortions with ripple phase shifts; lace motifs modulate luminance locally without aliasing; connectors flash punctual highlights.',
    microFallback: 'Concentric band mapping, circular ripple reflections, stable lace luminance modulation, punctual connector highlights.',
  },
  {
    name: '617-pool-lace-metal-sparkler-microburst',
    scene: 'Poolside celebration with controlled cold-spark fountain effects (non-flame), reflecting in wet black stone and water edge. Ambient lighting is low and neutral for contrast. Private, high-energy finale aesthetic.',
    pose: 'Standing in profile-three-quarter with shoulders rotated toward camera; one hand near waist, one arm relaxed; stable stance on wet deck.',
    geometry: 'Asymmetric high-neck one-piece with compact front aperture, narrow side channels with reinforced bridges, full back yoke and structured seam spine.',
    material: 'Matte crepe and satin composite with metallic filament lace and onyx clasp hardware.',
    materialFallback: 'Crepe-satin composite with metallic lace and clasp hardware.',
    micro: 'COLD-SPARK PHYSICS: spark trajectories arc upward then decay under gravity; reflections appear as elongated streaklets on wet stone; metallic lace threads catch intermittent point highlights; no overexposed clipping blooms.',
    microFallback: 'Spark arc decay, streaklet reflections, intermittent metallic thread highlights, controlled clipping.',
  },
  {
    name: '618-pool-lace-helix-laser-waterwall',
    scene: 'Luxury pool with a thin waterwall and rotating helix laser pattern projected across it, creating spiraling light bands that refract into the pool. Warm perimeter lamps maintain natural color rendering. Private, advanced light art.',
    pose: 'Standing adjacent to the waterwall with torso angled to camera; one hand near the wall edge and one at thigh; head slightly tilted toward lens.',
    geometry: 'Boat-neck one-piece with restrained upper aperture, side lace channels with mesh backing, full back panel with reinforced waist seam.',
    material: 'Satin-backed lace over gloss nylon with crystal micro-rings.',
    materialFallback: 'Lace over nylon with micro-rings.',
    micro: 'HELIX PROJECTION: rotating bands maintain consistent angular velocity on waterwall; refracted helix fragments travel across pool floor caustics; wet garment shows moving highlight tracks without texture drift; ring crystals add brief refractive pinflashes.',
    microFallback: 'Consistent rotating helix bands, refracted fragments, moving highlight tracks, refractive pinflashes visible.',
  },
  {
    name: '619-pool-lace-spectral-shadow-theater',
    scene: 'Private pool theater setup with multi-source narrow RGB emitters casting layered colored shadows across wet architectural planes. Neutral key light keeps primary skin tone plausible. Private, controlled chromatic experiment.',
    pose: 'On the pool edge with one leg extended and one bent; torso upright and slightly turned to camera; one hand braced behind and one near collar seam.',
    geometry: 'High-neck one-piece with slim center aperture above midline, subtle side cut channels, full back panel with low-stretch vertical seam structure.',
    material: 'Matte crepe base with rose-window lace overlay and graphite ring connectors.',
    materialFallback: 'Crepe base with lace overlay and ring connectors.',
    micro: 'MULTI-SHADOW CHROMA: separate colored penumbras remain spatially coherent; wet stone carries low-contrast shadow echoes; lace relief preserves fine shadow segmentation; connectors produce neutral spec points without color contamination.',
    microFallback: 'Coherent colored penumbras, wet shadow echoes, fine lace shadow segmentation, neutral connector spec points.',
  },
  {
    name: '620-pool-lace-dawn-recovery-afterglow',
    scene: 'Post-event dawn pool with fading practicals, pale sky gradients, residual haze, and wet surfaces transitioning from night contrast to soft daylight. Private, calm high-end comedown.',
    pose: 'Standing quietly at pool edge with shoulders relaxed and arms naturally at sides; torso facing camera; slight head turn and soft eye contact.',
    geometry: 'High-coverage one-piece with gentle curved upper aperture, restrained side mesh insets, full back panel with reinforced shoulder and waist seams.',
    material: 'Satin-backed lace over matte crepe with brushed brass micro-clasps.',
    materialFallback: 'Lace over crepe with brass micro-clasps.',
    micro: 'DAWN TRANSITION: mixed-light balance shifts from tungsten remnants to cool skylight; wet surfaces show lower-contrast broader highlights; lace thread detail remains visible under softer key; haze density decreases with depth and time-of-day realism.',
    microFallback: 'Night-to-dawn light shift, broader wet highlights, visible lace thread detail, decreasing haze density.',
  },
];

const s = parseInt(process.argv[3] || '0');
const e = parseInt(process.argv[4] || String(concepts.length));
const results = [];

if (process.env.DRY_RUN === '1') {
  console.log(`DRY_RUN=1: printing prompt wordcounts only (no API calls).`);
  for (let i = s; i < Math.min(e, concepts.length); i++) {
    const expression = expressions[i % expressions.length];
    const variation = buildVariation();
    const physicsMax = isPhysicsMaxConcept(concepts[i]);
    const promptA = (FORCE_ULTRA_PASS_A || physicsMax) ? buildPromptPassAUltra(concepts[i], expression, variation) : buildPromptPassA(concepts[i], expression, variation);
    const promptB = physicsMax ? buildPromptPassBPhysicsMax(concepts[i], expression, variation) : buildPromptPassB(concepts[i], expression, variation);
    const promptU = buildPromptPassAUltra(concepts[i], expression, variation);
    console.log(`[${i + 1}/${concepts.length}] ${concepts[i].name}`);
    console.log(`  Mode  : ${(FORCE_ULTRA_PASS_A || physicsMax) ? 'ultra-primary' : 'standard'}`);
    console.log(`  Pass A: ${wordCount(promptA)} words`);
    console.log(`  Pass B: ${wordCount(promptB)} words`);
    console.log(`  Ultra : ${wordCount(promptU)} words`);
  }
  process.exit(0);
}

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
  let ok = false;
  let lastErr = null;
  for (let attempt = 1; attempt <= MAX_CONCEPT_ATTEMPTS; attempt++) {
    try {
      console.log(`\n--- ATTEMPT ${attempt}/${MAX_CONCEPT_ATTEMPTS} for ${concepts[i].name} ---`);
      const passA = await generatePassA(concepts[i], INPUT_IMAGE, i);
      if (process.env.PASS_A_ONLY === '1') {
        const passAImg = await fs.readFile(passA.fp);
        const fp = path.join(OUTPUT_DIR, `${concepts[i].name}.png`);
        await fs.writeFile(fp, passAImg);
        console.log(`PASS_A_ONLY: saved final from pass A -> ${fp}`);
        results.push({ name: concepts[i].name, path: fp, ok: true });
        ok = true;
        break;
      }
      console.log(`Waiting ${RETRY_WAIT_S}s between passes...`);
      await new Promise(r => setTimeout(r, RETRY_WAIT_S * 1000));
      const fp = await generatePassB(concepts[i], passA, INPUT_IMAGE, i);
      results.push({ name: concepts[i].name, path: fp, ok: !!fp, attempt });
      ok = true;
      break;
    } catch (err) {
      lastErr = err;
      console.error(`FAIL attempt ${attempt}/${MAX_CONCEPT_ATTEMPTS}: ${concepts[i].name} - ${err.message}`);
      if (attempt < MAX_CONCEPT_ATTEMPTS) {
        console.log(`Retrying ${concepts[i].name} after ${RETRY_WAIT_S}s...`);
        await new Promise(r => setTimeout(r, RETRY_WAIT_S * 1000));
      }
    }
  }
  if (!ok) {
    results.push({ name: concepts[i].name, path: null, ok: false, err: lastErr?.message || 'unknown error' });
  }
  if (i < Math.min(e, concepts.length) - 1) {
    console.log(`Waiting ${RETRY_WAIT_S}s...`);
    await new Promise(r => setTimeout(r, RETRY_WAIT_S * 1000));
  }
}

console.log(`\n${'='.repeat(60)}`);
console.log('V29 APEX RESULTS');
console.log(`${'='.repeat(60)}`);
const ok = results.filter(r => r.ok);
console.log(`Success: ${ok.length}/${results.length}`);
results.forEach(r => console.log(`  ${r.ok ? 'OK' : '!!'} ${r.name}${r.err ? ': ' + r.err : ''}`));
console.log(`\nOutput: ${OUTPUT_DIR}`);

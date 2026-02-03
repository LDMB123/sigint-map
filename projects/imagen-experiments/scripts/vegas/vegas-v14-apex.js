#!/usr/bin/env node

/**
 * V14 APEX - Two-pass, multi-turn refinement for max photorealism
 *
 * Pass A: scene + camera + light transport + skin physics + core attire
 * Pass B: garment microstructure + hosiery + imperfections, preserving pass A
 *
 * Model: gemini-3-pro-image-preview
 * Output: 1K, 4:5
 * Word target per pass: 700-900
 */

import { GoogleAuth } from 'google-auth-library';
import fs from 'fs/promises';
import path from 'path';

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || 'gen-lang-client-0925343693';
const LOCATION = 'global';
const MODEL = 'gemini-3-pro-image-preview';
const ENDPOINT = `https://aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL}:generateContent`;
const OUTPUT_DIR = process.env.OUTPUT_DIR || path.join(process.env.HOME, 'nanobanana-output', 'vegas-v14-apex');
const PASSA_DIR = path.join(OUTPUT_DIR, 'passA');
const INPUT_IMAGE = process.argv[2] || '/Users/louisherman/Documents/518355716_10109335899644328_1380496532632646402_n.jpeg';

const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
await fs.mkdir(OUTPUT_DIR, { recursive: true });
await fs.mkdir(PASSA_DIR, { recursive: true });

const expressions = [
  'quiet confidence, slight upward chin tilt, one eyebrow slightly raised',
  'playful half-smile, eyes slightly narrowed with amusement',
  'focused intensity, steady confident gaze, composed expression',
  'warm genuine smile reaching the eyes, crow-foot crinkles forming',
  'mysterious composure, Mona Lisa micro-smile, unreadable expression',
  'bold direct stare, chin level, unapologetic presence',
  'soft warmth, eyes wide and luminous, gentle natural expression',
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
];

const CAMERA_BLOCK = `CAMERA SENSOR PHYSICS: Canon EOS R5 II full-frame 45MP stacked BSI-CMOS sensor 36x24mm active silicon. RF 50mm f/1.2L USM wide open at f/1.2 creating razor-thin 14cm depth-of-field plane focused at 2.2m subject distance. ISO 3200 generating authentic high-ISO luminance noise following Poisson photon-counting statistics sigma=sqrt(N_photons) in shadow regions with SNR=28dB at midtones and visible chroma noise as red-blue channel decorrelation in underexposed zones. Shutter 1/125s allowing slight motion blur on gesturing hands. 759-point dual-pixel phase-detect AF locked precisely on nearest iris with gentle focus roll-off on far shoulder. 10-blade circular aperture producing creamy oval bokeh discs with onion-ring concentric artifact from aspherical element. Barrel distortion 0.8% at close focus distance. Purple fringing 0.3px longitudinal chromatic aberration on high-contrast edge transitions at frame corners. BSI stack veiling glare: inter-element scatter reducing shadow contrast 0.3 stops in deep blacks near bright specular sources. Highlight shoulder hue shift: warm-to-magenta cast at sensor clipping boundary visible on brightest neon reflections. White balance tungsten 3200K but mixed venue lighting creates unresolved color temperature casts across different spatial zones. Available light only - absolutely no flash used - crushed blacks where signal falls below sensor noise floor creating true zero detail. Sensor micro-lens array vignetting 0.7 stop at corners. Bayer CFA demosaicing artifact: false color moire at fine repeating fabric textures where spatial frequency approaches Nyquist limit. PDAF banding: faint horizontal stripe pattern in deep shadows from dual-pixel readout phase difference. Raw file 14-bit ADC quantization: visible posterization in smooth shadow gradient regions where bit depth insufficient to encode tonal transitions.`;

const LIGHT_BLOCK = `3D GLOBAL ILLUMINATION LIGHT TRANSPORT: Primary overhead recessed tungsten halogen track spots at 2800K creating hard directional pools with sharp penumbral shadow edges - NOT diffused fashion lighting. Secondary practical neon bar signage casting saturated colored spill with hard color boundaries following inverse-square falloff I=Phi/(4*pi*r^2). Tertiary weak distant ceiling fluorescent at 3-stop underexposure as faint cool fill. Steep 4-stop luminance gradient from bar surface to dark booths. NO supplemental fill light - deep unrecoverable shadows on shadow-side at 5+ stops below key creating true black zero detail. Mixed color temperature: 2800K tungsten warm on skin vs 4100K fluorescent blue-green background contamination. Multi-bounce warm color interreflection from mahogany bar surface adds 300K to indirect shadow fill. Beer glass caustic projection on bar surface from overhead spot refraction through curved glass. Ambient occlusion darkening at body-bar contact zones. Volumetric light scatter through atmospheric haze particles.`;

const SKIN_BLOCK = `SKIN BIO-OPTICAL RENDERING: Monte Carlo subsurface scattering 3-layer epidermis-dermis-hypodermis. Melanin mu_a=6.6*C_mel*(lambda/500nm)^(-3.33) varying 0.01-0.05 across body regions. HbO2 absorption 542nm 576nm warm flush cheeks earlobes decolletage knuckles. Hb blue-purple undertone temples inner wrists venous return. Hypodermis forward-scatter g=0.85 translucent backlit glow ear helices nostril edges. Real unretouched skin: visible pores nasal ala cheeks, expression lines forehead periorbital, zero smoothing. Sebaceous T-zone sheen forehead nose chin irregular specular patches. Vellus hair forearms jawline catching rim light as bright fiber strands. Light perspiration upper lip temples micro-specular water droplets. Preserve face bone structure eye color expression identical.`;

const NO_TOUCH_BLOCK = `SUBJECT IS SOLO: No other people touching or overlapping her. No extra arms or hands near her shoulders or body. Keep both shoulders clear. Background patrons, if present, are distant and fully separated.`;

const IMPERFECTIONS_BLOCK = `RAW PHOTOGRAPHIC IMPERFECTIONS: ISO 3200 grain visible in shadows. Motion blur fingertips 1/125s. Flyaway hair catching backlight as soft bright streaks. Background neon bokeh as large soft colored discs. Foreground glass edge refraction blur. Faint lens flare veiling glare and hexagonal ghost from brightest neon. Crumpled napkin bar surface. Condensation ring cold glass. Micro dust shadow upper corner as faint dark circle. Barrel distortion pulling straight lines at edges. Chromatic aberration: lateral CA 0.5px red-cyan fringe at frame edges on high-contrast boundary. Sensor bloom: bright neon specular highlights bleeding 2-3px beyond physical boundary into adjacent pixels. Acoustic dampener vibration: faint micro-shake from mirror mechanism creating 0.5px directional smear on point sources. No retouching no color grading - straight RAW with WB only. Preserve face identical.`;

function buildPromptPassA(concept, expression) {
  return `Generate an image of this photograph edited into an ultra-raw real-life Vegas cocktail bar photograph indistinguishable from an unretouched candid shot from a real night out. Raw documentary nightlife photography. Preserve exact identity, face, bone structure, eyes, nose, mouth, and age. Keep pose, framing, and expression consistent: ${expression}. Only change outfit, environment, lighting, hair styling as described. Avoid retouching.

STEP 1: Preserve identity, pose, framing, and expression.
STEP 2: Apply scene and lighting physics.
STEP 3: Apply camera sensor physics and skin bio-optics.
STEP 4: Apply raw photographic imperfections.

SCENE: ${concept.scene}

ATTIRE (CORE FORM): ${concept.attire}

${NO_TOUCH_BLOCK}

${CAMERA_BLOCK}

${LIGHT_BLOCK}

${SKIN_BLOCK}

${IMPERFECTIONS_BLOCK}`;
}

function buildPromptPassB(concept, expression) {
  return `Generate an image of this photograph edited from the previous pass. Preserve the same identity, face, pose, framing, expression, and scene. Keep camera, lighting, and color balance unchanged from pass A. Refine only garment microstructure, hosiery physics, and realistic imperfections. Maintain raw documentary look with no retouching. Expression: ${expression}.

STEP 1: Preserve pass A identity, pose, framing, lighting, and color balance.
STEP 2: Refine garment microstructure and hosiery physics only.
STEP 3: Reinforce raw sensor artifacts and imperfections without changing composition.

SCENE (UNCHANGED): ${concept.scene}

ATTIRE (REFINEMENT): ${concept.attire}

${NO_TOUCH_BLOCK}

MATERIAL MICROSTRUCTURE: ${concept.fabric}

HOSIERY REFINEMENT: ${concept.hosiery}

${CAMERA_BLOCK}

${LIGHT_BLOCK}

${SKIN_BLOCK}

${IMPERFECTIONS_BLOCK}`;
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
  'deep v',
  'plunging',
];

function validatePrompt(prompt, label) {
  const lower = prompt.toLowerCase();
  const hits = BANNED_TOKENS.filter(t => lower.includes(t));
  if (hits.length > 0) {
    console.log(`WARN: ${label} contains banned tokens: ${hits.join(', ')}`);
  }
  if (!lower.includes('48-50cm') && !lower.includes('48cm')) {
    console.log(`WARN: ${label} missing explicit hemline 48-50cm anchor.`);
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

async function callModel(contents) {
  const requestBody = {
    contents,
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
      throw new Error(`Rate limited: ${error.substring(0, 200)}`);
    }
    throw new Error(`API ${response.status}: ${error.substring(0, 300)}`);
  }

  return response.json();
}

async function generatePassA(concept, inputImage, index) {
  const expression = expressions[index % expressions.length];
  const prompt = buildPromptPassA(concept, expression);
  const wc = wordCount(prompt);
  if (wc < 700 || wc > 900) {
    console.log(`WARN: Pass A word count ${wc} outside 700-900 target.`);
  }
  validatePrompt(prompt, 'Pass A');

  console.log(`\n${'='.repeat(60)}`);
  console.log(`[${index + 1}/20] PASS A ${concept.name}`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Prompt A: ${wc} words | Expression: ${expression.substring(0, 50)}...`);

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

  const data = await callModel(contents);
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
    throw new Error('NO IMAGE generated in pass A');
  }

  const img = Buffer.from(imageData.data, 'base64');
  const fp = path.join(PASSA_DIR, `${concept.name}.png`);
  await fs.writeFile(fp, img);
  console.log(`SAVED PASS A: ${fp} (${(img.length / 1024 / 1024).toFixed(2)} MB)`);

  return { fp, mimeType: imageData.mimeType || 'image/png', modelParts };
}

async function generatePassB(concept, passA, inputImage, index) {
  const expression = expressions[index % expressions.length];
  const prompt = buildPromptPassB(concept, expression);
  const wc = wordCount(prompt);
  if (wc < 700 || wc > 900) {
    console.log(`WARN: Pass B word count ${wc} outside 700-900 target.`);
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
    { role: 'user', parts: [{ text: buildPromptPassA(concept, expression) }, { inlineData: { mimeType: baseMimeType, data: base64Image } }] },
    { role: 'model', parts: passA.modelParts },
    { role: 'user', parts: [{ text: prompt }, { inlineData: { mimeType: passA.mimeType, data: passAB64 } }] },
  ];

  const data = await callModel(contents);
  const parts = data.candidates?.[0]?.content?.parts || [];

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

  throw new Error('NO IMAGE generated in pass B');
}

const concepts = [
  {
    name: '51-prism-dichroic-bead-drape-backless',
    attire: 'She wears a midnight black satin mini with a high halter neckline and a fully open back to the waistline, finished with a draped prism-dichroic bead curtain across the back. Upper-thigh hemline 48-50cm. The bead drape is the focal point.',
    scene: 'Crystal lounge: mirrored columns, amber sconces, smoked glass shelves, polished bar with wet rings, faint haze, coupe glass condensation.',
    fabric: 'DICHROIC BEAD DRAPE: multilayer thin-film interference coating on glass beads creates angle-dependent color split (cyan→magenta) with spectral separation. Beads hang on fine filament strands producing 0.4-0.8s pendulum lag and micro-collisions that add subtle motion blur. Satin base shows dual-lobe specular and soft roll-off; bead weight creates tiny tension lines at attachment points.',
    hosiery: 'HOSIERY: Black thigh-high stockings with a thin prism metallic welt. 15-denier T=0.76 semi-sheer matte black.',
  },
  {
    name: '52-photonic-bandgap-structural-color-halter',
    attire: 'She wears a structural-color halter mini with a smooth open back and clean side seams. Upper-thigh hemline 48-50cm. The fabric shifts emerald to sapphire across curves.',
    scene: 'Speakeasy bar: brick arches, candle clusters, antique mirror, mahogany bar, soft haze, warm tungsten pools.',
    fabric: 'PHOTONIC BANDGAP WEAVE: 200-400nm periodic nanostructure in polymer fibers yields structural color without dye; Bragg reflection causes angle-dependent hue shift with sharp chroma edges. Warp-weft anisotropy creates directional sheen bands along the torso. Micro-wrinkle ridges at the waist add local color modulation.',
    hosiery: 'HOSIERY: Black thigh-high stockings with a thin emerald metallic welt. 15-denier T=0.76.',
  },
  {
    name: '53-mechanoluminescent-stretch-cutout',
    attire: 'She wears a charcoal stretch bodycon mini with geometric side cutouts and a halter neckline, fully open back to the waist. Upper-thigh hemline 48-50cm.',
    scene: 'Nightclub mezzanine: LED wall spill, glossy bar, haze beams, neon signage glow, bass vibration in glassware.',
    fabric: 'MECHANOLUMINESCENT ELASTANE: ZnS:Cu microcapsules embedded in elastane emit faint light at high strain zones (seams, cutout edges) under mechanical stress. Elastic tension yields diagonal strain fields with subtle brightness variation. Matte base absorbs 90% light while microcapsules add pinpoint emission at stress nodes.',
    hosiery: 'HOSIERY: Black thigh-high stockings with charcoal metallic welt. 15-denier T=0.76.',
  },
  {
    name: '54-retroreflective-microbead-illusion',
    attire: 'She wears a silver-grey retroreflective mini with a square neckline and open back, smooth side seams, upper-thigh hemline 48-50cm.',
    scene: 'Casino corridor bar: chandeliers, brass rails, marble floor reflections, slot glow spill, faint smoke haze.',
    fabric: 'RETROREFLECTIVE MICROBEADS: glass microbeads (50-80 microns) bonded to textile return light back to source, creating intense bright hotspots around speculars and dim falloff elsewhere. Bead density variation yields mottled reflectance; microbead abrasion produces sparse dark patches.',
    hosiery: 'HOSIERY: Black thigh-high stockings with silver satin welt. 15-denier T=0.76.',
  },
  {
    name: '55-electroluminescent-piped-one-shoulder',
    attire: 'She wears a black satin one-shoulder mini with a low open back and thin electroluminescent piping tracing the neckline and hem. Upper-thigh hemline 48-50cm.',
    scene: 'Rooftop bar: skyline bokeh, fire pit glow, glass railing, cool night air, cocktail garnish.',
    fabric: 'EL PIPING: low-voltage electroluminescent phosphor wire embedded under a clear sheath emits a thin, uniform line along seams. Satin base shows smooth specular rolls; EL line creates a crisp luminous contour without lighting the environment. Seam tension produces slight piping curvature distortions.',
    hosiery: 'HOSIERY: Black thigh-high stockings with thin electric-blue welt. 15-denier T=0.76.',
  },
  {
    name: '56-wet-silk-rain-soaked-backless',
    attire: 'She wears a rain-soaked silk slip mini with thin straps and a low open back. Upper-thigh hemline 48-50cm. The fabric clings with wet translucency.',
    scene: 'After-hours bar entry: wet stone floor, umbrella stand, amber sconces, rain haze at doorway, glass with condensation.',
    fabric: 'WET SILK OPTICS: water layer reduces surface roughness and increases specular clarity; transmittance shifts from 0.18 to 0.42 in soaked zones. Wet silk clings to body topology, creating sharper contour mapping and darker saturation in pooled regions. Micro-droplet lensing creates localized highlight blooms.',
    hosiery: 'HOSIERY: Black thigh-high stockings with thin satin welt. 15-denier T=0.76.',
  },
  {
    name: '57-photoelastic-polymer-corset',
    attire: 'She wears a structured mini with a translucent polymer corset bodice and a black satin mini skirt, open back with a halter strap. Upper-thigh hemline 48-50cm.',
    scene: 'Art deco lounge: brass fixtures, green marble bar, warm tungsten pools, mirror wall, low haze.',
    fabric: 'PHOTOELASTIC POLYMER: stress-induced birefringence creates subtle color bands along high-tension zones; band spacing tightens at waist compression. Polymer surface shows fine casting flow lines and micro-surface ripples. Satin skirt reflects warm light with soft specular highlights.',
    hosiery: 'HOSIERY: Black thigh-high stockings with thin graphite welt. 15-denier T=0.76.',
  },
  {
    name: '58-holographic-interference-lattice',
    attire: 'She wears a holographic lattice overlay mini with a one-shoulder strap and side cutouts, open back to the waist. Upper-thigh hemline 48-50cm.',
    scene: 'Neon lounge: LED gradients, mirror pillars, bokeh signage, soft haze beams.',
    fabric: 'HOLOGRAPHIC INTERFERENCE: 80-layer TiO2/SiO2 film produces diffraction rainbow highlights and angle-dependent spectral dispersion. Lattice overlay creates moire with the base layer; overlap zones show intensified color banding. Micro-scratch lines break up perfect reflections.',
    hosiery: 'HOSIERY: Black thigh-high stockings with opal shimmer welt. 15-denier T=0.76.',
  },
  {
    name: '59-liquid-latex-sculpted-wrap',
    attire: 'She wears a liquid latex sculpted wrap mini with an asymmetric high slit and open back scoop. Upper-thigh hemline 48-50cm.',
    scene: 'VIP lounge: low amber sconces, leather booths, brass rail, smoke haze, glossy bar top.',
    fabric: 'LIQUID LATEX: high-gloss polymer film with strong Fresnel reflectance; micro-wrinkles at bend zones form tight highlight ridges. Wrap tension creates diagonal stress lines with slightly darker bands where latex thins. Specular streaks remain sharp across curvature.',
    hosiery: 'HOSIERY: Black thigh-high stockings with satin welt. 15-denier T=0.76.',
  },
  {
    name: '60-stainless-mesh-panel-dress',
    attire: 'She wears a stainless micro-mesh panel mini over a black jersey base, halter neckline with open back. Upper-thigh hemline 48-50cm.',
    scene: 'Industrial bar: concrete walls, steel accents, bottle backlight, amber pendants, haze.',
    fabric: 'METAL MESH: stainless micro-mesh (0.4mm) creates anisotropic sparkle with occlusion shadows between links. Mesh drape forms catenary curves with slight weight sag at panels. Jersey base absorbs light, emphasizing metal highlights.',
    hosiery: 'HOSIERY: Black thigh-high stockings with steel metallic welt. 15-denier T=0.76.',
  },
  {
    name: '61-triboluminescent-crystal-fringe',
    attire: 'She wears a crystal-fringe mini with a high halter neck and fully open back. Upper-thigh hemline 48-50cm.',
    scene: 'Jazz lounge: warm tungsten pools, dark wood, vintage mirror, smoke haze, cocktail on bar.',
    fabric: 'TRIBOLUMINESCENT FRINGE: crystal beads emit tiny faint flashes at points of contact under friction. Fringe swing creates 0.2-0.5s motion lag; collision points produce micro-spark twinkles. Base fabric is black satin with soft specular roll.',
    hosiery: 'HOSIERY: Black thigh-high stockings with crystal metallic welt. 15-denier T=0.76.',
  },
  {
    name: '62-thermochromic-liquid-crystal-satin',
    attire: 'She wears a satin mini coated with thermochromic liquid crystal layers, off-shoulder neckline and open back. Upper-thigh hemline 48-50cm.',
    scene: 'Candlelit lounge: amber sconces, stone walls, warm reflections, soft haze.',
    fabric: 'THERMOCHROMIC LAYER: liquid crystal coating shifts hue with temperature gradients, producing subtle color bands across torso and hip where skin warmth varies. Satin underlayer provides smooth highlight roll; coating shows faint micro-mottle where temperature transitions meet.',
    hosiery: 'HOSIERY: Black thigh-high stockings with thin amber welt. 15-denier T=0.76.',
  },
  {
    name: '63-fiber-optic-weave-cowl-back',
    attire: 'She wears a graphite satin mini with a soft cowl back and fine fiber-optic weave accents along the side seams. Upper-thigh hemline 48-50cm.',
    scene: 'Rooftop bar: skyline bokeh, fire pit glow, glass railing, cool breeze.',
    fabric: 'FIBER-OPTIC WEAVE: micro optical fibers embedded in seam channels carry pinpoint light, creating tiny evenly spaced points along edges without lighting the environment. Satin base shows clear specular folds; cowl back drapes into soft U-shaped folds.',
    hosiery: 'HOSIERY: Black thigh-high stockings with graphite shimmer welt. 15-denier T=0.76.',
  },
  {
    name: '64-ceramic-microflake-metallic-sheath',
    attire: 'She wears a gunmetal metallic sheath mini with a square neckline and open back. Upper-thigh hemline 48-50cm.',
    scene: 'High-roller bar: crystal chandelier, mahogany panels, brass trim, whiskey glow.',
    fabric: 'CERAMIC MICROFLAKE PIGMENT: automotive-grade platelets create metallic flop with view-angle brightness shift. Microflake alignment produces directional sparkle bands; edge-on view darkens for depth. Clearcoat shows subtle orange-peel texture.',
    hosiery: 'HOSIERY: Black thigh-high stockings with gunmetal welt. 15-denier T=0.76.',
  },
  {
    name: '65-smoked-mirror-sequin-grid',
    attire: 'She wears a smoked-mirror sequin grid mini with a halter neckline and open back. Upper-thigh hemline 48-50cm.',
    scene: 'Mirror lounge: low amber lights, smoked glass shelves, reflective floor, haze.',
    fabric: 'SMOKED MIRROR SEQUINS: 5mm mirrored paillettes with grey tint reflect environment in softened highlights. Grid stitch pattern creates hard shadow lines and geometric sparkle. Some sequins show slight scuffs and corner chips for realism.',
    hosiery: 'HOSIERY: Black thigh-high stockings with smoked metallic welt. 15-denier T=0.76.',
  },
  {
    name: '66-translucent-organza-illusion-strapless',
    attire: 'She wears a strapless organza overlay mini with a satin base and side slits, open back line kept clean. Upper-thigh hemline 48-50cm.',
    scene: 'Chandelier lounge: crystal light spill, mirrored columns, warm reflections, soft haze.',
    fabric: 'TRANSLUCENT ORGANZA: forward scatter produces halo edges; layered organza causes gentle moire where folds overlap. Satin base provides smooth specular core; organza edges catch rim light as thin bright lines.',
    hosiery: 'HOSIERY: Nude thigh-high stockings with pearl welt. 12-denier T=0.82.',
  },
  {
    name: '67-iridescent-foil-laminate-ribbed',
    attire: 'She wears a ribbed knit mini with iridescent foil laminate panels and an open back. Upper-thigh hemline 48-50cm.',
    scene: 'Neon bar: LED signage, glass shelves, chrome accents, haze.',
    fabric: 'IRIDESCENT FOIL LAMINATE: thin-film interference foil bonded to ribbed knit creates color-shift bands across ribs. Foil micro-cracks at high-stretch zones break highlights into small islands. Rib compression yields tighter highlight spacing at waist.',
    hosiery: 'HOSIERY: Black thigh-high stockings with iridescent welt. 15-denier T=0.76.',
  },
  {
    name: '68-opalescent-resin-chainmail',
    attire: 'She wears an opalescent resin chainmail overlay mini over a satin base, halter neckline with open back. Upper-thigh hemline 48-50cm.',
    scene: 'VIP lounge: warm sconces, leather booths, brass rail, smoke haze.',
    fabric: 'OPALESCENT RESIN CHAINMAIL: translucent resin rings scatter light internally, producing soft edge glow and milky iridescence. Rings create occlusion shadows and layered depth; resin shows subtle casting flow lines and micro-bubbles.',
    hosiery: 'HOSIERY: Black thigh-high stockings with opal shimmer welt. 15-denier T=0.76.',
  },
  {
    name: '69-laser-cut-suede-geometry',
    attire: 'She wears a black suede mini with laser-cut geometric perforation panels and a halter neckline, open back to the waist. Upper-thigh hemline 48-50cm.',
    scene: 'Candlelit bar: warm pools, textured stone wall, amber glass, soft haze.',
    fabric: 'LASER-CUT SUEDE: suede pile absorbs light, while laser-cut edges show slight singe darkening and crisp geometry. Perforations cast patterned shadows onto skin; pile direction yields subtle sheen shifts.',
    hosiery: 'HOSIERY: Black thigh-high stockings with suede-textured welt. 15-denier T=0.76.',
  },
  {
    name: '70-ruby-hematite-beaded-spine-cascade',
    attire: 'She wears a ruby satin mini with a high neck and a fully open back adorned by a hematite beaded spine cascade from nape to waist. Upper-thigh hemline 48-50cm.',
    scene: 'Art deco bar: brass fixtures, warm tungsten pools, mirror wall, mahogany reflections.',
    fabric: 'BEADED SPINE CASCADE: hematite beads (3mm) form a vertical chain with metallic luster; beads act as micro-mirrors creating pin-point highlights and faint caustic dots on skin. Satin base shows smooth specular folds; bead weight produces slight skin compression along spine.',
    hosiery: 'HOSIERY: Black thigh-high stockings with ruby metallic welt. 15-denier T=0.76.',
  },
];

const s = parseInt(process.argv[3] || '0');
const e = parseInt(process.argv[4] || String(concepts.length));
const results = [];

const existingFiles = await fs.readdir(OUTPUT_DIR).catch(() => []);
const existingNums = new Set(existingFiles.filter(f => f.endsWith('.png')).map(f => parseInt(f.split('-')[0])));

console.log(`\n=== V14 APEX - Two-pass, multi-turn refinement ===`);
console.log(`Range: ${s + 1}-${e} | Input: ${path.basename(INPUT_IMAGE)}`);
console.log(`Output: ${OUTPUT_DIR}`);
console.log(`Already generated: ${existingNums.size} | Skipping: [${[...existingNums].sort((a,b)=>a-b).join(',')} ]\n`);

for (let i = s; i < Math.min(e, concepts.length); i++) {
  const conceptNum = i + 51;
  if (existingNums.has(conceptNum)) {
    console.log(`SKIP [${conceptNum}/70] ${concepts[i].name} (already exists)`);
    results.push({ name: concepts[i].name, path: 'exists', ok: true });
    continue;
  }
  try {
    const passA = await generatePassA(concepts[i], INPUT_IMAGE, i);
    console.log('Waiting 12s between passes...');
    await new Promise(r => setTimeout(r, 12000));
    const fp = await generatePassB(concepts[i], passA, INPUT_IMAGE, i);
    results.push({ name: concepts[i].name, path: fp, ok: !!fp });
  } catch (err) {
    console.error(`FAIL: ${concepts[i].name} - ${err.message}`);
    results.push({ name: concepts[i].name, path: null, ok: false, err: err.message });
  }
  if (i < Math.min(e, concepts.length) - 1) {
    console.log('Waiting 41s...');
    await new Promise(r => setTimeout(r, 41000));
  }
}

console.log(`\n${'='.repeat(60)}`);
console.log('V14 APEX RESULTS');
console.log(`${'='.repeat(60)}`);
const ok = results.filter(r => r.ok);
console.log(`Success: ${ok.length}/${results.length}`);
results.forEach(r => console.log(`  ${r.ok ? 'OK' : '!!'} ${r.name}${r.err ? ': ' + r.err : ''}`));
console.log(`\nOutput: ${OUTPUT_DIR}`);

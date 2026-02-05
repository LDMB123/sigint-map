#!/usr/bin/env node

/**
 * V17 APEX - Two-pass, multi-turn refinement for max photorealism
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
const OUTPUT_DIR = process.env.OUTPUT_DIR || path.join(process.env.HOME, 'nanobanana-output', 'vegas-v17-apex');
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
  return `Generate an image of this photograph edited into an ultra-raw real-life Vegas speakeasy cocktail bar photograph indistinguishable from an unretouched candid shot from a real night out. Raw documentary nightlife photography. Preserve exact identity, face, bone structure, eyes, nose, mouth, and age. Keep pose, framing, and expression consistent: ${expression}. Only change outfit, environment, lighting, hair styling as described. Avoid retouching.

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
  if (!lower.includes('44-46cm') && !lower.includes('44cm')) {
    console.log(`WARN: ${label} missing explicit hemline 44-46cm anchor.`);
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

async function callModel(contents, retries = 0) {
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
      if (retries >= 8) {
        throw new Error(`Rate limited: ${error.substring(0, 200)}`);
      }
      const wait = 70 + Math.floor(Math.random() * 20);
      console.log(`Rate limited (${retries + 1}/8) - waiting ${wait}s...`);
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
    name: '111-ferrofluid-spine-backless',
    attire: 'She wears a black satin mini with a high halter neckline and a fully open back to the waist. A magnetically stabilized ferrofluid bead spine forms glossy droplet ridges from nape to waist. Upper-thigh hemline 44-46cm.',
    scene: 'Vaulted Under-Strip speakeasy cocktail bar: steel vault door ajar, oxidized copper walls, smoked mirror panels, oiled walnut bar, backlit amber liquor wall, green banker lamps, candle clusters, low haze, water-glass caustics on the bar.',
    fabric: 'FERROFLUID SPINE: magnetic field lines hold glossy black droplets in a curved ribbed chain; micro-slumps form tiny meniscus bridges between beads. Droplets show high Fresnel reflectance with sharp highlight edges; minute surface waves appear where motion and vibration disturb the field. Satin base shows smooth dual-lobe specular.',
    hosiery: 'HOSIERY: Black thigh-high stockings with gunmetal welt. 15-denier T=0.76.',
  },
  {
    name: '112-auxetic-lattice-cutout',
    attire: 'She wears a graphite mini with dramatic side cutouts and a clean open back scoop. The side panels are auxetic lattice knit. Upper-thigh hemline 44-46cm.',
    scene: 'Vaulted Under-Strip speakeasy cocktail bar: copper patina walls, smoked mirrors, brass lattice ceiling, walnut bar, amber backlit bottles, candle clusters, haze.',
    fabric: 'AUXETIC LATTICE: re-entrant hex knit expands laterally under tension, creating widening apertures at the waist and hip. Edge nodes show concentrated stress brightening; lattice ribs cast micro-shadows onto skin through the cutouts. Core mini fabric remains matte to emphasize lattice geometry.',
    hosiery: 'HOSIERY: Black thigh-high stockings with graphite welt. 15-denier T=0.76.',
  },
  {
    name: '113-non-newtonian-shear-mesh',
    attire: 'She wears a black mesh overlay mini over a satin base with a low open back and asymmetric side cutout. Upper-thigh hemline 44-46cm.',
    scene: 'Vaulted Under-Strip speakeasy cocktail bar: bank vault corridor entry, brass handrail, mirror wall, candlelight pools, thin haze.',
    fabric: 'SHEAR-THICKENING MESH: polymer yarn shifts from soft drape to crisp ribs during movement, leaving temporary pleat memory lines that relax over seconds. Mesh parallax over the satin base yields moire bands; filament ends catch rim light as bright filaments.',
    hosiery: 'HOSIERY: Black thigh-high stockings with matte welt. 15-denier T=0.76.',
  },
  {
    name: '114-phase-change-heat-map-slip',
    attire: 'She wears a midnight satin slip mini with thin straps and a low open back. Upper-thigh hemline 44-46cm.',
    scene: 'Vaulted Under-Strip speakeasy cocktail bar: smoked mirror panels, oxidized copper walls, amber bottle wall, candle clusters, haze.',
    fabric: 'PHASE-CHANGE MICROCAPSULES: PCM microcapsules reveal localized tonal shifts where skin warms the fabric, forming soft heat maps at waist, hip, and back. Warm zones show subtle gloss increase; cooler zones remain darker with clean specular roll.',
    hosiery: 'HOSIERY: Black thigh-high stockings with satin welt. 15-denier T=0.76.',
  },
  {
    name: '115-electroactive-ripple-halter',
    attire: 'She wears a black satin halter mini with a fully open back and narrow side cutouts. Upper-thigh hemline 44-46cm.',
    scene: 'Vaulted Under-Strip speakeasy cocktail bar: brass lattice ceiling, walnut bar, green banker lamp spill, candle clusters, haze.',
    fabric: 'ELECTROACTIVE POLYMER PLEATS: micro-pleats create subtle traveling ripples across the torso, visible as moving highlight bands. Pleat ridges show sharp specular lines; valleys fall into deep shadow, creating a shifting relief effect.',
    hosiery: 'HOSIERY: Black thigh-high stockings with electric-blue welt. 15-denier T=0.76.',
  },
  {
    name: '116-piezo-jacquard-pulse',
    attire: 'She wears a charcoal mini with a high halter neckline and open back. Upper-thigh hemline 44-46cm.',
    scene: 'Vaulted Under-Strip speakeasy cocktail bar: onyx bar top, amber backlit bottles, smoked mirrors, candlelight, haze.',
    fabric: 'PIEZO-JACQUARD: piezo threads emit faint pinprick glow when flexed, concentrated at hip and waist creases. Jacquard weave creates anisotropic specular streaks; micro-wrinkles produce tight highlight bands.',
    hosiery: 'HOSIERY: Black thigh-high stockings with charcoal welt. 15-denier T=0.76.',
  },
  {
    name: '117-liquid-metal-microcapsule',
    attire: 'She wears a gunmetal mini with a low open back and one-shoulder strap. Upper-thigh hemline 44-46cm.',
    scene: 'Vaulted Under-Strip speakeasy cocktail bar: copper patina walls, amber bottle wall, brass trim, candle clusters, haze.',
    fabric: 'LIQUID-METAL MICROCAPSULES: galinstan microcapsules drift and merge into reflective islands that slowly migrate with gravity. Specular highlights fragment into shimmering patches; capsule boundaries show thin dark meniscus lines.',
    hosiery: 'HOSIERY: Black thigh-high stockings with gunmetal welt. 15-denier T=0.76.',
  },
  {
    name: '118-smectic-lc-film',
    attire: 'She wears a black mini with a one-shoulder strap, open back scoop, and a narrow side cutout. Upper-thigh hemline 44-46cm.',
    scene: 'Vaulted Under-Strip speakeasy cocktail bar: vault door glow, smoked mirrors, walnut bar, candle clusters, haze.',
    fabric: 'SMECTIC LIQUID-CRYSTAL FILM: layered LC domains produce razor-edged angle-dependent color bands that shift with posture. Film shows clean specular reflections with slight banded anisotropy; cutout edges show tension lines.',
    hosiery: 'HOSIERY: Black thigh-high stockings with sapphire welt. 15-denier T=0.76.',
  },
  {
    name: '119-microlens-caustic-organza',
    attire: 'She wears a black satin mini with a sheer organza overlay and a low open back. Upper-thigh hemline 44-46cm.',
    scene: 'Vaulted Under-Strip speakeasy cocktail bar: amber bottle wall, brass lattice ceiling, green banker lamps, haze.',
    fabric: 'MICROLENS ORGANZA: micro-lens array fibers project tiny caustic dots onto skin and bar surface. Overlay shows soft halo edges and fine fiber glints; satin base retains smooth specular roll.',
    hosiery: 'HOSIERY: Nude thigh-high stockings with pearl welt. 12-denier T=0.82.',
  },
  {
    name: '120-shape-memory-corset-mini',
    attire: 'She wears a black satin corset mini with a halter neckline and open back. Upper-thigh hemline 44-46cm.',
    scene: 'Vaulted Under-Strip speakeasy cocktail bar: smoked mirrors, brass rail, walnut bar, candlelight pools, haze.',
    fabric: 'SHAPE-MEMORY BONING: NiTi boning creates crisp waist sculpt with subtle recovery lines where the fabric flexes. Boning channels show narrow highlight ridges; satin panels display smooth dual-lobe specular.',
    hosiery: 'HOSIERY: Black thigh-high stockings with satin welt. 15-denier T=0.76.',
  },
  {
    name: '121-hydrogel-bead-fringe',
    attire: 'She wears a black satin halter mini with a fully open back and hydrogel bead fringe at the hem. Upper-thigh hemline 44-46cm.',
    scene: 'Vaulted Under-Strip speakeasy cocktail bar: candle clusters, oxidized copper walls, walnut bar, haze.',
    fabric: 'HYDROGEL BEAD FRINGE: refractive beads magnify highlights into tiny luminous orbs; elastic strands show delayed motion lag and damped oscillation. Beads cast soft micro-caustics onto skin; satin base remains smooth and dark.',
    hosiery: 'HOSIERY: Black thigh-high stockings with crystal welt. 15-denier T=0.76.',
  },
  {
    name: '122-metamaterial-opacity-panels',
    attire: 'She wears a sculpted mini with open back and angular side cutouts, built from opacity-switching panels. Upper-thigh hemline 44-46cm.',
    scene: 'Vaulted Under-Strip speakeasy cocktail bar: brass lattice ceiling, mirror wall, amber bottle glow, haze.',
    fabric: 'ANGLE-DEPENDENT OPACITY METAMATERIAL: panels transition from matte to translucent as viewing angle changes, creating crisp boundary lines across the torso. Panel edges show sharp specular seams; translucent zones reveal soft skin silhouettes.',
    hosiery: 'HOSIERY: Black thigh-high stockings with graphite welt. 15-denier T=0.76.',
  },
  {
    name: '123-magnetorheological-pleat',
    attire: 'She wears a black mini with a low open back and structured pleat skirt. Upper-thigh hemline 44-46cm.',
    scene: 'Vaulted Under-Strip speakeasy cocktail bar: brass rail, candlelight pools, smoked mirrors, haze.',
    fabric: 'MAGNETORHEOLOGICAL PLEATS: MR fluid stiffens under nearby bar magnets, creating alternating crisp and relaxed pleat bands. Pleat ridges show sharp highlights; relaxed zones show smoother drape with softer sheen.',
    hosiery: 'HOSIERY: Black thigh-high stockings with charcoal welt. 15-denier T=0.76.',
  },
  {
    name: '124-thermochromic-veil-hem',
    attire: 'She wears a black satin mini with a fully open back and a thermochromic veil hem. Upper-thigh hemline 44-46cm.',
    scene: 'Vaulted Under-Strip speakeasy cocktail bar: amber bottle wall, green banker lamps, walnut bar, haze.',
    fabric: 'THERMOCHROMIC VEIL: hemline shifts from charcoal to deep burgundy where heat accumulates, forming soft gradient bands. Veil layer shows translucent flutter with subtle moire over satin; satin base provides smooth specular roll.',
    hosiery: 'HOSIERY: Black thigh-high stockings with burgundy welt. 15-denier T=0.76.',
  },
  {
    name: '125-fractal-weave-moire',
    attire: 'She wears a black mini with side cutouts and open back, constructed from a dual-layer fractal weave. Upper-thigh hemline 44-46cm.',
    scene: 'Vaulted Under-Strip speakeasy cocktail bar: copper walls, smoked mirrors, candle clusters, haze.',
    fabric: 'FRACTAL WEAVE: two micro-offset layers create high-frequency moire shimmer that shifts with small movements. Weave nodes appear as tiny dark knots; alignment zones show bright interference bands.',
    hosiery: 'HOSIERY: Black thigh-high stockings with prism welt. 15-denier T=0.76.',
  },
  {
    name: '126-graphene-lace-conduction',
    attire: 'She wears a black lace mini with thin straps and a low open back, lace patterned with graphene thread. Upper-thigh hemline 44-46cm.',
    scene: 'Vaulted Under-Strip speakeasy cocktail bar: brass lattice ceiling, amber bottle glow, walnut bar, haze.',
    fabric: 'GRAPHENE LACE: conductive filaments produce subtle anisotropic sheen and faint conductivity bands. Lace edges show crisp specular glints; negative space reveals skin with clean contrast.',
    hosiery: 'HOSIERY: Black thigh-high stockings with matte welt. 15-denier T=0.76.',
  },
  {
    name: '127-photoelastic-strap-harness',
    attire: 'She wears a black satin mini with a fully open back and transparent strap harness. Upper-thigh hemline 44-46cm.',
    scene: 'Vaulted Under-Strip speakeasy cocktail bar: vault door glow, smoked mirrors, candle clusters, haze.',
    fabric: 'PHOTOELASTIC STRAPS: transparent polymer straps show rainbow stress bands at load points along shoulders and waist. Strap surfaces show fine casting flow lines; satin base remains smooth and dark.',
    hosiery: 'HOSIERY: Black thigh-high stockings with graphite welt. 15-denier T=0.76.',
  },
  {
    name: '128-aerogel-edge-halo',
    attire: 'She wears a black satin mini with a clean open back and aerogel-coated neckline and hem. Upper-thigh hemline 44-46cm.',
    scene: 'Vaulted Under-Strip speakeasy cocktail bar: copper patina walls, amber bottle wall, brass trim, haze.',
    fabric: 'AEROGEL EDGE: silica aerogel micro-layer creates soft halo scattering along edges with milky translucence. Edge halos show gentle bloom; satin panels keep tight specular highlights.',
    hosiery: 'HOSIERY: Black thigh-high stockings with silver welt. 15-denier T=0.76.',
  },
  {
    name: '129-magnetic-microsequin-flow',
    attire: 'She wears a black mini with a low open back and micro-sequin surface. Upper-thigh hemline 44-46cm.',
    scene: 'Vaulted Under-Strip speakeasy cocktail bar: brass lattice ceiling, candle clusters, walnut bar, haze.',
    fabric: 'MAGNETIC MICROSEQUINS: sequins align into directional sparkle streams in weak magnetic fields near the bar. Sparkle bands appear as flowing diagonals; misaligned zones create diffuse glitter noise.',
    hosiery: 'HOSIERY: Black thigh-high stockings with metallic welt. 15-denier T=0.76.',
  },
  {
    name: '130-viscoelastic-crystal-cowl',
    attire: 'She wears a black mini with a dramatic cowl back and viscoelastic crystal strands at the cowl edge. Upper-thigh hemline 44-46cm.',
    scene: 'Vaulted Under-Strip speakeasy cocktail bar: smoked mirrors, amber bottle wall, candlelight pools, haze.',
    fabric: 'VISCOELASTIC CRYSTAL STRANDS: strands show delayed motion lag and damped oscillation, with micro-collisions creating brief sparkle flashes. Cowl fabric shows smooth specular roll; crystal edges cast tiny caustic dots on skin.',
    hosiery: 'HOSIERY: Black thigh-high stockings with prism welt. 15-denier T=0.76.',
  },
];

const s = parseInt(process.argv[3] || '0');
const e = parseInt(process.argv[4] || String(concepts.length));
const results = [];

const existingFiles = await fs.readdir(OUTPUT_DIR).catch(() => []);
const existingNums = new Set(existingFiles.filter(f => f.endsWith('.png')).map(f => parseInt(f.split('-')[0])));

console.log(`\n=== V17 APEX - Two-pass, multi-turn refinement ===`);
console.log(`Range: ${s + 1}-${e} | Input: ${path.basename(INPUT_IMAGE)}`);
console.log(`Output: ${OUTPUT_DIR}`);
console.log(`Already generated: ${existingNums.size} | Skipping: [${[...existingNums].sort((a,b)=>a-b).join(',')} ]\n`);

for (let i = s; i < Math.min(e, concepts.length); i++) {
  const conceptNum = i + 111;
  if (existingNums.has(conceptNum)) {
    console.log(`SKIP [${conceptNum}/130] ${concepts[i].name} (already exists)`);
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
console.log('V17 APEX RESULTS');
console.log(`${'='.repeat(60)}`);
const ok = results.filter(r => r.ok);
console.log(`Success: ${ok.length}/${results.length}`);
results.forEach(r => console.log(`  ${r.ok ? 'OK' : '!!'} ${r.name}${r.err ? ': ' + r.err : ''}`));
console.log(`\nOutput: ${OUTPUT_DIR}`);

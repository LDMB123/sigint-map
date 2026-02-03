#!/usr/bin/env node

/**
 * V28 APEX - Two-pass, multi-turn refinement for max photorealism
 *
 * Pass A: scene + camera + light transport + skin physics + core attire
 * Pass B: garment microstructure + hosiery + imperfections, preserving pass A
 *
 * Model: gemini-3-pro-image-preview
 * Output: 4K, 4:5
 * Word target per pass: 900-1200
 */

import { GoogleAuth } from 'google-auth-library';
import fs from 'fs/promises';
import path from 'path';

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || 'gen-lang-client-0925343693';
const LOCATION = 'global';
const MODEL = 'gemini-3-pro-image-preview';
const ENDPOINT = `https://aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL}:generateContent`;
const OUTPUT_DIR = process.env.OUTPUT_DIR || path.join(process.env.HOME, 'nanobanana-output', 'vegas-v28-apex');
const PASSA_DIR = path.join(OUTPUT_DIR, 'passA');
const INPUT_IMAGE = process.argv[2] || '/Users/louisherman/Documents/IMG_4385.jpeg';

const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
await fs.mkdir(OUTPUT_DIR, { recursive: true });
await fs.mkdir(PASSA_DIR, { recursive: true });

const expressions = [
  'smoldering gaze, half-lidded eyes, subtle lip part',
  'sultry half-smile, chin slightly lowered, eyes up through lashes',
  'quiet magnetism, soft eyelids, relaxed jaw, steady gaze',
  'slow-breath composure, lips gently parted, intimate eye contact',
  'mysterious allure, micro-smile, eyes glinting, unhurried',
  'bold seduction, direct gaze, minimal smile, poised stillness',
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

const CAMERA_BLOCK = `CAMERA SENSOR PHYSICS: Canon EOS R5 II full-frame 45MP BSI-CMOS, RF 50mm f/1.2 at f/1.2; focus at 2.2m, 14cm depth-of-field. ISO 3200 with visible luminance grain and chroma noise in shadows; shutter 1/125s with slight motion blur on fingertips. Dual-pixel AF locked on nearest iris; creamy bokeh discs with mild onion-ring. 0.7 stop corner vignetting, 0.3px purple fringing at high-contrast edges. No flash, available light only; crushed blacks below noise floor.`;

const LIGHT_BLOCK = `3D GLOBAL ILLUMINATION LIGHT TRANSPORT: Tungsten track spots 2800K create hard pools; neon signage ~4500K throws saturated spill with hard boundaries; LED bottle wall is 3 stops under for faint cool fill. Candle cylinders ~1900K add localized pin highlights; EXIT sign ~6500K adds a faint green-blue edge cast. Strong 4-stop gradient bar to booths; no fill, deep shadow side. Warm bounce from black marble bar; water-channel caustics flicker on bar lip. Haze scatters light, ambient occlusion at body-bar contact.`;

const SKIN_BLOCK = `SKIN BIO-OPTICAL RENDERING: natural subsurface scattering, visible pores and fine expression lines, no smoothing. T-zone sheen, faint vellus hair rim-light, tiny perspiration micro-specs. Preserve face, bone structure, and eye color exactly.`;

const NO_TOUCH_BLOCK = `SUBJECT IS SOLO: No other people touching or overlapping her. No extra arms or hands near her shoulders or body. Keep both shoulders clear. No stray hands in frame behind her. Background patrons, if present, are distant and fully separated.`;

const IMPERFECTIONS_BLOCK = `RAW PHOTOGRAPHIC IMPERFECTIONS: ISO 3200 grain in shadows, flyaway hair streaks, neon bokeh discs, faint lens flare ghost from neon/candle, barrel distortion at edges, lateral CA 0.5px red-cyan fringe, sensor bloom 2–3px on hot highlights. Condensation rings on glass, fingerprints on brass rail and mirror, crumpled napkin. No retouching, RAW WB only.`;

const CLOTH_PHYSICS_BLOCK = `CLOTH + BODY PHYSICS: gravity-driven drape with measurable weight; hemline shows slight bias stretch and a 2–4mm outward curl. Bending stiffness varies by panel; shear distortion appears where the dress wraps the hip. Strap bridges indent skin with subtle compression and rebound; seam puckering at stitch lines under tension. Micro-wrinkles at waist/hip, directional stretch lines in high-tension zones, and fabric thickness reads at all cutout edges. Satin shows anisotropic highlights aligned to the weave; matte panels show broader diffuse lobes.`;

const SCENE_PHYSICS_BLOCK = `ENVIRONMENTAL PHYSICS: haze density varies with distance and light angle; candle heat causes faint shimmer. Glassware shows condensation beads, streaks, and thin water films; neon reflections obey inverse-square falloff and Fresnel roll-off on the marble bar. Specular highlights clamp and bloom; shadow penumbra softens with distance; ambient occlusion deepens at body-bar contact. Brass and onyx surfaces show micro-scratches and smudge patterns that catch grazing light.`;

const OPTICS_BLOCK = `OPTICAL SURFACES: black marble bar behaves like a glossy dielectric with sharp reflections and subtle surface roughness; mirror ceiling shows slight distortion and ghosting. Wet stone entry has clear water sheen with rippled reflections. Glass stems show caustic streaks and internal reflection; metal rails show tight specular bands with faint chromatic dispersion at edges.`;

const MICROSTRUCTURE_BLOCK = `MATERIAL MICROSTRUCTURE: weave frequency visible at macro scale with subtle moire in tight gradients; fiber cross-sections cause slight sparkle noise in satin highlights. Sheer inserts show clean edge transitions and soft light diffusion without harsh transparency artifacts.`;

const CONTACT_PRESSURE_BLOCK = `CONTACT + PRESSURE: cloth-to-skin contact shows micro-occlusion at seams, slight skin displacement at strap anchors, and pressure gradients that soften toward edges. No plastic smoothness; keep natural micro-shadowing in compression zones.`;

const SPECTRAL_PHYSICS_BLOCK = `SPECTRAL + POLARIZATION: satin highlights show subtle polarization-dependent dimming; thin-film areas show soft interference bands; haze exhibits wavelength-dependent scatter with slightly warmer near-field and cooler far-field.`;

const WARDROBE_CONSTRUCTION_BLOCK = `WARDROBE CONSTRUCTION: internal boning and micro-stays stabilize the neckline; hidden clear tape prevents slip. Seams align to body landmarks with subtle stitch puckering; clasp hardware shows tiny specular edges; closures sit under tension without warping the fabric.`;

const SAFETY_BLOCK = `FASHION SAFETY: daring couture but fully covered; no explicit nudity; no see-through exposure of nipples or genitalia.`;

const SCENE_BASE = `LUXURY SUITE SETTING (FIRST PRINCIPLES): High-floor luxury suite at night with floor-to-ceiling windows and a sweeping skyline view. Polished Calacatta marble, warm brass accents, walnut paneling, plush velvet seating, sculptural floor lamps, and a glass balcony door with faint reflections. Champagne cart, crystal glassware, silk drapes, and a low fire feature or candle cluster; deep ambient shadows with soft practicals and city light spill.`;

function buildPromptPassA(concept, expression, fallback = false) {
  const material = fallback ? concept.materialFallback : concept.material;
  return `Generate an image of this photograph edited into an ultra-raw real-life luxury suite photograph indistinguishable from an unretouched candid shot from a real night out. Raw documentary nightlife photography. Preserve exact identity, face, bone structure, eyes, nose, mouth, and age. Keep pose, framing, and expression consistent: ${expression}. Only change outfit and environment as described. Avoid retouching.

FIRST-PRINCIPLES INVARIANTS:
- Identity, face, pose, framing, and expression remain unchanged.
- Camera, lens, and exposure physics remain realistic and consistent.
- Subject is solo with no contact from others.

PROMPT STRUCTURE:
SUBJECT: same woman from the source photo, same pose and expression.
ENVIRONMENT: ${SCENE_BASE} ${concept.scene}
STYLE: raw candid nightlife documentary, unretouched.
TECHNICAL: real camera physics and lighting.

GARMENT GEOMETRY (COVERAGE + CUTOUTS): ${concept.geometry}
GARMENT MATERIAL CLASS (MACRO PHYSICS): ${material}

${NO_TOUCH_BLOCK}

${CAMERA_BLOCK}

${LIGHT_BLOCK}

${SKIN_BLOCK}

${CLOTH_PHYSICS_BLOCK}

${SCENE_PHYSICS_BLOCK}

${OPTICS_BLOCK}

${MICROSTRUCTURE_BLOCK}

${CONTACT_PRESSURE_BLOCK}

${SPECTRAL_PHYSICS_BLOCK}

${WARDROBE_CONSTRUCTION_BLOCK}

${SAFETY_BLOCK}

${IMPERFECTIONS_BLOCK}`;
}

function buildPromptPassB(concept, expression, fallback = false) {
  const micro = fallback ? concept.microFallback : concept.micro;
  return `Generate an image of this photograph edited from the previous pass. Preserve the same identity, face, pose, framing, expression, and scene. Keep camera, lighting, and color balance unchanged from pass A. Refine only garment microstructure, hosiery physics, and realistic imperfections. Maintain raw documentary look with no retouching. Expression: ${expression}.

FIRST-PRINCIPLES REFINEMENT:
- Do not change pose, framing, or lighting.
- Preserve garment geometry and coverage.
- Only increase material microphysics fidelity.

SCENE (UNCHANGED): ${SCENE_BASE} ${concept.scene}

GARMENT GEOMETRY (UNCHANGED): ${concept.geometry}
MATERIAL MICROSTRUCTURE (MICRO PHYSICS): ${micro}
HOSIERY REFINEMENT: ${concept.hosiery}

${NO_TOUCH_BLOCK}

${CAMERA_BLOCK}

${LIGHT_BLOCK}

${SKIN_BLOCK}

${CLOTH_PHYSICS_BLOCK}

${SCENE_PHYSICS_BLOCK}

${OPTICS_BLOCK}

${MICROSTRUCTURE_BLOCK}

${CONTACT_PRESSURE_BLOCK}

${SPECTRAL_PHYSICS_BLOCK}

${WARDROBE_CONSTRUCTION_BLOCK}

${SAFETY_BLOCK}

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
  if (!lower.includes('28-30cm') && !lower.includes('30cm')) {
    console.log(`WARN: ${label} missing explicit hemline 28-30cm anchor.`);
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
      imageConfig: { aspectRatio: '4:5', imageSize: '4K' },
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
  if (wc < 900 || wc > 1200) {
    console.log(`WARN: Pass A word count ${wc} outside 900-1200 target.`);
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

  let data = await callModel(contents);
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
    const promptFallback = buildPromptPassA(concept, expression, true);
    validatePrompt(promptFallback, 'Pass A (fallback)');
    const contentsFallback = [{
      role: 'user',
      parts: [
        { text: promptFallback },
        { inlineData: { mimeType, data: base64Image } },
      ],
    }];
    data = await callModel(contentsFallback);
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
      throw new Error('NO IMAGE generated in pass A (fallback)');
    }
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
  if (wc < 900 || wc > 1200) {
    console.log(`WARN: Pass B word count ${wc} outside 900-1200 target.`);
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

  let data = await callModel(contents);
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
  const promptFallback = buildPromptPassB(concept, expression, true);
  validatePrompt(promptFallback, 'Pass B (fallback)');
  const contentsFallback = [
    { role: 'user', parts: [{ text: buildPromptPassA(concept, expression, true) }, { inlineData: { mimeType: baseMimeType, data: base64Image } }] },
    { role: 'model', parts: passA.modelParts },
    { role: 'user', parts: [{ text: promptFallback }, { inlineData: { mimeType: passA.mimeType, data: passAB64 } }] },
  ];
  data = await callModel(contentsFallback);
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

  throw new Error('NO IMAGE generated in pass B (fallback)');
}

const concepts = [
  {
    name: '331-crosswrap-keyhole',
    scene: 'Floor-to-ceiling windows with skyline reflections; silk drapes pooled at the floor.',
    geometry: 'Crosswrap microdress with open back to the waist and high side cutouts; low square neckline with elongated center keyhole to the upper abdomen and sheer mesh backing. Upper-thigh hemline 28-30cm.',
    material: 'Satin base with crosswrap paneling.',
    materialFallback: 'Satin base with clean crosswrap panels and soft highlights.',
    micro: 'CROSSWRAP PANELS: smooth satin highlights with gentle shadow gradients at the wrap edge.',
    microFallback: 'Smooth satin highlights with gentle shadow gradients.',
    hosiery: 'HOSIERY: Black thigh-high stockings with graphite welt. 2-denier T=0.99 with silicone stay-up band.',
  },
  {
    name: '332-asymmetry-luxe-cowl',
    scene: 'Velvet sectional with warm lamp pools; city light spill on marble.',
    geometry: 'One-shoulder microdress with a dramatic back cowl and asymmetric hem, open back to the waist, and side cutout on the exposed shoulder side; low angled neckline with elongated keyhole to the upper abdomen and sheer mesh backing. Upper-thigh hemline 28-30cm.',
    material: 'Liquid satin with soft cowl drape.',
    materialFallback: 'Soft satin with flowing cowl drape.',
    micro: 'COWL DRAPE: smooth satin highlights with gentle shadow gradients at folds.',
    microFallback: 'Smooth satin highlights with gentle shadow gradients.',
    hosiery: 'HOSIERY: Black thigh-high stockings with midnight welt. 2-denier T=0.99 with silicone stay-up band.',
  },
  {
    name: '333-lattice-side-laceup',
    scene: 'Champagne cart and crystal glassware on a marble console.',
    geometry: 'Strapless microdress with wide side cutouts laced by thin cords, open back to the waist; low straight neckline with elongated keyhole to the upper abdomen and sheer mesh backing. Upper-thigh hemline 28-30cm.',
    material: 'Matte base with satin lace-up cords.',
    materialFallback: 'Matte base with satin cords and crisp highlights.',
    micro: 'LACE-UP TENSION: cords show micro-twist highlights and slight indentation where they meet skin; grommets show tiny metal speculars.',
    microFallback: 'Cords show twist highlights and slight skin indentation at anchors.',
    hosiery: 'HOSIERY: Black thigh-high stockings with steel welt. 2-denier T=0.99 with silicone stay-up band.',
  },
  {
    name: '334-glass-hip-window',
    scene: 'Glass balcony door with skyline bokeh and faint reflections.',
    geometry: 'Microdress with clear hip windows and an open back to the waist; ultra-low scoop neckline with a narrow sheer illusion insert to the upper abdomen. Upper-thigh hemline 28-30cm.',
    material: 'Satin base with clear polymer window panels.',
    materialFallback: 'Satin base with clear panels and sharp edge highlights.',
    micro: 'CLEAR PANELS: sharp specular edges, slight refraction, and faint internal reflections at panel boundaries.',
    microFallback: 'Clear panels with sharp edges and mild refraction.',
    hosiery: 'HOSIERY: Black thigh-high stockings with crystal welt. 2-denier T=0.99 with silicone stay-up band.',
  },
  {
    name: '335-chainmail-shear-bodice',
    scene: 'Marble fireplace glow with brass trim reflections.',
    geometry: 'Microdress with a chainmail bodice overlay, open back to the waist, and high side cutouts; low square neckline with elongated keyhole to the upper abdomen and sheer mesh backing. Upper-thigh hemline 28-30cm.',
    material: 'Satin base with lightweight chainmail overlay.',
    materialFallback: 'Satin base with metallic mesh overlay and crisp highlights.',
    micro: 'CHAINMAIL: interlinked rings create micro-glints and subtle drape sag; tiny caustic dots appear on skin at ring clusters.',
    microFallback: 'Metal mesh shows micro-glints with soft drape sag.',
    hosiery: 'HOSIERY: Black thigh-high stockings with chrome welt. 2-denier T=0.99 with silicone stay-up band.',
  },
  {
    name: '336-peekaboo-strap-bridges',
    scene: 'Sculptural floor lamp glow and walnut paneling.',
    geometry: 'Microdress with open sides bridged by thin straps across the waist and hip; open back to the waist; ultra-low scoop neckline with a narrow sheer illusion insert to the upper abdomen. Upper-thigh hemline 28-30cm.',
    material: 'Matte base with satin strap bridges.',
    materialFallback: 'Matte base with satin strap bridges and crisp edges.',
    micro: 'STRAP BRIDGES: taut straps show micro-compression at anchors and tight specular ridges along edges.',
    microFallback: 'Taut straps with crisp edges and subtle anchor compression.',
    hosiery: 'HOSIERY: Black thigh-high stockings with graphite welt. 2-denier T=0.99 with silicone stay-up band.',
  },
  {
    name: '337-ultra-slit-wrap',
    scene: 'Low table candles with skyline reflections in the window glass.',
    geometry: 'Wrap microdress with an ultra-high slit and open back to the waist; deep V neckline stabilized by sheer illusion mesh to the upper abdomen. Upper-thigh hemline 28-30cm.',
    material: 'Liquid satin wrap with soft drape.',
    materialFallback: 'Satin wrap with flowing folds and smooth highlights.',
    micro: 'WRAP DRAPE: fold overlap creates double-thickness highlight bands and subtle shadow gradients at the wrap edge.',
    microFallback: 'Wrap folds show smooth highlight bands and gentle shadow gradients.',
    hosiery: 'HOSIERY: Black thigh-high stockings with onyx welt. 2-denier T=0.99 with silicone stay-up band.',
  },
  {
    name: '338-sheer-panel-corset',
    scene: 'Marble console with crystal glasses and candle glow.',
    geometry: 'Corset microdress with sheer side panels, open back to the waist; low square neckline with elongated keyhole to the upper abdomen and sheer mesh backing. Upper-thigh hemline 28-30cm.',
    material: 'Satin corset base with sheer mesh panels.',
    materialFallback: 'Satin corset base with sheer mesh side panels.',
    micro: 'SHEER PANELS: clean edge transitions, soft diffusion, and visible weave grid without transparency artifacts.',
    microFallback: 'Sheer panels with clean edges and soft diffusion.',
    hosiery: 'HOSIERY: Black thigh-high stockings with ruby welt. 2-denier T=0.99 with silicone stay-up band.',
  },
  {
    name: '339-microcape-backless',
    scene: 'Skyline lights through the window; silk drapes and velvet seating.',
    geometry: 'Backless microdress with a short microcape collar, open sides, and a deep plunge stabilized by sheer illusion mesh to the upper abdomen. Upper-thigh hemline 28-30cm.',
    material: 'Matte base with satin microcape.',
    materialFallback: 'Matte base with satin collar cape and smooth highlights.',
    micro: 'MICROCAPE: small fabric folds show tight highlight bands; collar seam has slight puckering.',
    microFallback: 'Cape folds with tight highlights; subtle seam puckering.',
    hosiery: 'HOSIERY: Black thigh-high stockings with pearl welt. 2-denier T=0.99 with silicone stay-up band.',
  },
  {
    name: '340-sculpted-hip-aperture',
    scene: 'Warm lamp pools on marble and brass accents.',
    geometry: 'Microdress with sculpted hip apertures and open back to the waist; low angled neckline with elongated keyhole to the upper abdomen and sheer mesh backing. Upper-thigh hemline 28-30cm.',
    material: 'Satin base with structured hip cutouts.',
    materialFallback: 'Satin base with structured cutouts and crisp highlights.',
    micro: 'STRUCTURED CUTOUTS: edges read with thickness and subtle shadow bevel; high-tension zones show fine strain lines.',
    microFallback: 'Cutout edges show thickness and subtle shadow bevels.',
    hosiery: 'HOSIERY: Black thigh-high stockings with graphite welt. 2-denier T=0.99 with silicone stay-up band.',
  },
  {
    name: '341-crystal-chain-back',
    scene: 'Champagne cart and candle cluster with skyline bokeh.',
    geometry: 'Microdress with open back to the waist bridged by crystal chains; high side cutouts and low square neckline with elongated keyhole to the upper abdomen and sheer mesh backing. Upper-thigh hemline 28-30cm.',
    material: 'Satin base with crystal chain back.',
    materialFallback: 'Satin base with crystal chains and crisp glints.',
    micro: 'CRYSTAL CHAINS: tiny sparkle bursts at joints and small caustic dots on skin; chain sag shows slight tension curve.',
    microFallback: 'Chains sparkle with tiny glints and gentle sag curve.',
    hosiery: 'HOSIERY: Black thigh-high stockings with diamond welt. 2-denier T=0.99 with silicone stay-up band.',
  },
  {
    name: '342-iris-mesh-window',
    scene: 'Glass balcony door with skyline reflections and faint glare.',
    geometry: 'Microdress with front iris-shaped mesh window, open back to the waist, and high side cutouts; ultra-low scoop neckline with narrow sheer illusion insert to the upper abdomen. Upper-thigh hemline 28-30cm.',
    material: 'Iridescent mesh window over satin base.',
    materialFallback: 'Iridescent mesh insert with soft color shift.',
    micro: 'IRIS MESH: subtle color-shift bands with clean mesh grid; soft diffusion at the edges.',
    microFallback: 'Mesh insert with soft color shift and clean grid.',
    hosiery: 'HOSIERY: Black thigh-high stockings with sapphire welt. 2-denier T=0.99 with silicone stay-up band.',
  },
  {
    name: '343-asym-cutout-sash',
    scene: 'Velvet seating and marble console with candle glow.',
    geometry: 'Asymmetric microdress with one-shoulder cutout, open back to the waist, and a draped side sash; low angled neckline with elongated keyhole to the upper abdomen and sheer mesh backing. Upper-thigh hemline 28-30cm.',
    material: 'Liquid satin with soft sash drape.',
    materialFallback: 'Satin with draped sash and smooth highlights.',
    micro: 'SASH DRAPE: double-layer fold with tight highlight bands and soft shadow gradients; slight edge curl at the sash tip.',
    microFallback: 'Sash folds show tight highlights and gentle shadow gradients.',
    hosiery: 'HOSIERY: Black thigh-high stockings with onyx welt. 2-denier T=0.99 with silicone stay-up band.',
  },
  {
    name: '344-metallic-bustier-mini',
    scene: 'Marble fireplace glow and brass trim reflections.',
    geometry: 'Bustier microdress with open back to the waist and high side cutouts; low square neckline with elongated keyhole to the upper abdomen and sheer mesh backing. Upper-thigh hemline 28-30cm.',
    material: 'Metallic foil bustier over satin skirt.',
    materialFallback: 'Metallic foil bodice with crisp highlights.',
    micro: 'METALLIC FOIL: tight specular bands with micro-sparkle texture; subtle orange-peel on clearcoat.',
    microFallback: 'Tight specular bands and fine sparkle texture.',
    hosiery: 'HOSIERY: Black thigh-high stockings with gold welt. 2-denier T=0.99 with silicone stay-up band.',
  },
  {
    name: '345-pleated-mesh-hips',
    scene: 'Skyline reflections on window glass; soft lamp pools.',
    geometry: 'Microdress with pleated mesh hip panels, open back to the waist; ultra-low scoop neckline with narrow sheer illusion insert to the upper abdomen. Upper-thigh hemline 28-30cm.',
    material: 'Satin base with pleated mesh hip panels.',
    materialFallback: 'Satin base with pleated mesh panels and soft diffusion.',
    micro: 'PLEATED MESH: tight pleat ridges with alternating light/dark bands; clean mesh grid visible in highlights.',
    microFallback: 'Pleated mesh with alternating bands and clean grid.',
    hosiery: 'HOSIERY: Black thigh-high stockings with graphite welt. 2-denier T=0.99 with silicone stay-up band.',
  },
  {
    name: '346-lace-diamond-cutout',
    scene: 'Champagne cart and crystal glassware with candle glow.',
    geometry: 'Lace microdress with diamond cutout at the midriff, open back to the waist; low square neckline with elongated keyhole to the upper abdomen and sheer mesh backing. Upper-thigh hemline 28-30cm.',
    material: 'Lace overlay on satin base.',
    materialFallback: 'Iridescent lace with crisp edge glints.',
    micro: 'LACE: crisp edge glints and clean negative spaces; slight shadow spill from lace onto skin.',
    microFallback: 'Crisp lace edges with clean negative spaces and soft shadow spill.',
    hosiery: 'HOSIERY: Black thigh-high stockings with prism welt. 2-denier T=0.99 with silicone stay-up band.',
  },
  {
    name: '347-strap-belted-aperture',
    scene: 'Velvet seating and marble console with warm lamp glow.',
    geometry: 'Microdress with a wide underbust aperture, open back to the waist, and thin belt straps across the midriff; ultra-low scoop neckline with narrow sheer illusion insert to the upper abdomen. Upper-thigh hemline 28-30cm.',
    material: 'Matte base with satin belt straps.',
    materialFallback: 'Matte base with satin straps and crisp edges.',
    micro: 'BELT STRAPS: taut with micro-compression at anchors; clean specular ridges along edges.',
    microFallback: 'Taut straps with crisp edges and slight anchor compression.',
    hosiery: 'HOSIERY: Black thigh-high stockings with steel welt. 2-denier T=0.99 with silicone stay-up band.',
  },
  {
    name: '348-bodice-window-flares',
    scene: 'Glass balcony door with skyline bokeh and faint glare.',
    geometry: 'Microdress with side window flares at the waist, open back to the waist; low angled neckline with elongated keyhole to the upper abdomen and sheer mesh backing. Upper-thigh hemline 28-30cm.',
    material: 'Satin base with structured window flares.',
    materialFallback: 'Satin base with structured windows and crisp highlights.',
    micro: 'WINDOW FLARES: edge thickness reads with subtle bevel shadows; high-tension zones show fine strain lines.',
    microFallback: 'Window edges show thickness with subtle bevel shadows.',
    hosiery: 'HOSIERY: Black thigh-high stockings with graphite welt. 2-denier T=0.99 with silicone stay-up band.',
  },
  {
    name: '349-crystal-slit-halter',
    scene: 'Marble fireplace glow and brass trim reflections.',
    geometry: 'Halter microdress with deep diagonal slit, open back to the waist, and high side cutouts; ultra-low scoop neckline with narrow sheer illusion insert to the upper abdomen. Upper-thigh hemline 28-30cm.',
    material: 'Satin base with crystal trim along the slit.',
    materialFallback: 'Satin base with crystal trim and crisp glints.',
    micro: 'CRYSTAL TRIM: tiny sparkle bursts at joints and small caustic dots on skin; trim follows slit edge with slight tension.',
    microFallback: 'Trim sparkles with tiny glints and faint caustic dots.',
    hosiery: 'HOSIERY: Black thigh-high stockings with diamond welt. 2-denier T=0.99 with silicone stay-up band.',
  },
  {
    name: '350-architectural-cutout',
    scene: 'Sculptural floor lamp glow and walnut paneling; champagne cart nearby.',
    geometry: 'Architectural microdress with angular cutouts at the waist and hip, open back to the waist; low square neckline with elongated keyhole to the upper abdomen and sheer mesh backing. Upper-thigh hemline 28-30cm.',
    material: 'Matte base with structured cutouts and satin edges.',
    materialFallback: 'Matte base with structured cutouts and crisp satin edges.',
    micro: 'CUTOUT STRUCTURE: edge thickness reads with clean bevel shadows; satin edges show tight highlight bands.',
    microFallback: 'Cutout edges show thickness and tight highlight bands.',
    hosiery: 'HOSIERY: Black thigh-high stockings with obsidian welt. 2-denier T=0.99 with silicone stay-up band.',
  },
];

const s = parseInt(process.argv[3] || '0');
const e = parseInt(process.argv[4] || String(concepts.length));
const results = [];

const existingFiles = await fs.readdir(OUTPUT_DIR).catch(() => []);
const existingNums = new Set(existingFiles.filter(f => f.endsWith('.png')).map(f => parseInt(f.split('-')[0])));

console.log(`\n=== V28 APEX - Two-pass, multi-turn refinement ===`);
console.log(`Range: ${s + 1}-${e} | Input: ${path.basename(INPUT_IMAGE)}`);
console.log(`Output: ${OUTPUT_DIR}`);
console.log(`Already generated: ${existingNums.size} | Skipping: [${[...existingNums].sort((a,b)=>a-b).join(',')} ]\n`);

for (let i = s; i < Math.min(e, concepts.length); i++) {
  const conceptNum = i + 331;
  if (existingNums.has(conceptNum)) {
    console.log(`SKIP [${conceptNum}/250] ${concepts[i].name} (already exists)`);
    results.push({ name: concepts[i].name, path: 'exists', ok: true });
    continue;
  }
  try {
    const passA = await generatePassA(concepts[i], INPUT_IMAGE, i);
    console.log('Waiting 70s between passes...');
    await new Promise(r => setTimeout(r, 70000));
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
console.log('V28 APEX RESULTS');
console.log(`${'='.repeat(60)}`);
const ok = results.filter(r => r.ok);
console.log(`Success: ${ok.length}/${results.length}`);
results.forEach(r => console.log(`  ${r.ok ? 'OK' : '!!'} ${r.name}${r.err ? ': ' + r.err : ''}`));
console.log(`\nOutput: ${OUTPUT_DIR}`);

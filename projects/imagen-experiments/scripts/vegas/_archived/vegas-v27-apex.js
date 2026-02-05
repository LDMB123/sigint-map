#!/usr/bin/env node

/**
 * V27 APEX - Two-pass, multi-turn refinement for max photorealism
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
const OUTPUT_DIR = process.env.OUTPUT_DIR || path.join(process.env.HOME, 'nanobanana-output', 'vegas-v27-apex');
const PASSA_DIR = path.join(OUTPUT_DIR, 'passA');
const INPUT_IMAGE = process.argv[2] || '/Users/louisherman/Documents/IMG_4385.jpeg';

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
  if (!lower.includes('30-32cm') && !lower.includes('30cm')) {
    console.log(`WARN: ${label} missing explicit hemline 30-32cm anchor.`);
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
    name: '311-aerogel-window-slit',
    scene: 'Floor-to-ceiling windows with skyline reflections and faint glass glare; silk drapes pooled at the floor.',
    geometry: 'Microdress with an open back to the waist, extreme side cutouts, and a diagonal front slit; ultra-low scoop neckline stopping just above the bust line with a narrow sheer illusion insert to the upper abdomen. Upper-thigh hemline 30-32cm.',
    material: 'Aerogel-infused organza overlay on a satin base.',
    materialFallback: 'Soft translucent organza overlay on satin.',
    micro: 'AEROGEL ORGANZA: soft volumetric scatter with edge glow on folds; subtle depth haze through layers.',
    microFallback: 'Soft translucency with edge glow and gentle depth haze.',
    hosiery: 'HOSIERY: Black thigh-high stockings with smoke welt. 2-denier T=0.99 with silicone stay-up band.',
  },
  {
    name: '312-capillary-champagne-chain',
    scene: 'Champagne cart with crystal glassware and brass trim; candle cluster on a low table.',
    geometry: 'Microdress with open sides bridged by chain links, open back to the waist; low square neckline with an elongated center keyhole to the upper abdomen and sheer mesh backing. Upper-thigh hemline 30-32cm.',
    material: 'Satin base with capillary glass chain links.',
    materialFallback: 'Satin base with glossy chain links and mirror glints.',
    micro: 'CAPILLARY CHAINS: micro-meniscus beads collect in link curves, creating tiny specular hotspots and caustic dots on skin.',
    microFallback: 'Chain links show tiny specular hotspots and soft caustic dots.',
    hosiery: 'HOSIERY: Black thigh-high stockings with crystal welt. 2-denier T=0.99 with silicone stay-up band.',
  },
  {
    name: '313-stf-velvet-pleat',
    scene: 'Velvet sectional with warm lamp pools and city light spill.',
    geometry: 'Microdress with high side cutouts, open back to the waist, and a narrow underbust aperture; ultra-low scoop neckline with a narrow sheer illusion insert to the upper abdomen. Upper-thigh hemline 30-32cm.',
    material: 'Velvet base with shear-thickening pleat overlay.',
    materialFallback: 'Velvet base with crisp pleats at tension points.',
    micro: 'STF PLEATS: crisp pleat ridges at tension points; soft velvet elsewhere.',
    microFallback: 'Crisp pleats at tension points; soft velvet elsewhere.',
    hosiery: 'HOSIERY: Black thigh-high stockings with onyx welt. 2-denier T=0.99 with silicone stay-up band.',
  },
  {
    name: '314-liquid-metal-spine',
    scene: 'Marble fireplace or linear fire feature with warm glow and brass trims.',
    geometry: 'Microdress with a narrow spine opening, open back to the waist, and high side cutouts; straight neckline just below collarbones with an elongated center keyhole to the upper abdomen, backed by sheer mesh. Upper-thigh hemline 30-32cm.',
    material: 'Liquid-metal capillary tubes along spine and seams.',
    materialFallback: 'Thin metallic tubes with mirror glints along spine.',
    micro: 'LIQUID METAL: smooth mirror glints with gentle meniscus curvature at joints.',
    microFallback: 'Smooth mirror glints with gentle meniscus curvature.',
    hosiery: 'HOSIERY: Black thigh-high stockings with chrome welt. 2-denier T=0.99 with silicone stay-up band.',
  },
  {
    name: '315-quantum-dot-lounge-sheer',
    scene: 'Low table candles with skyline bokeh through the windows.',
    geometry: 'Sheer-panel microdress with open back to the waist and narrow side cutouts; ultra-low scoop neckline with a narrow sheer illusion insert to the upper abdomen. Upper-thigh hemline 30-32cm.',
    material: 'Sheer overlay embedded with quantum-dot luminophores.',
    materialFallback: 'Sheer overlay with tiny warm specks along seams.',
    micro: 'QUANTUM-DOT VEIL: micro-dots convert stray UV to warm pinpricks; dots cluster along seams forming constellation bands.',
    microFallback: 'Tiny warm specks cluster along seams; subtle parallax over base.',
    hosiery: 'HOSIERY: Black thigh-high stockings with crimson welt. 2-denier T=0.99 with silicone stay-up band.',
  },
  {
    name: '316-electroactive-strap-arch',
    scene: 'Sculptural floor lamps and walnut paneling with soft highlights.',
    geometry: 'Microdress with open sides bridged by thin straplines over the midriff; open back to the waist; low square neckline with an elongated center keyhole to the upper abdomen and sheer mesh backing. Upper-thigh hemline 30-32cm.',
    material: 'Matte base with electroactive polymer straplines.',
    materialFallback: 'Matte base with taut straplines and crisp highlights.',
    micro: 'EAP STRAPLINES: subtle tension waves and micro-compression at anchor points; tight specular ridges along strap edges.',
    microFallback: 'Straplines appear taut with fine tension ridges and crisp edges.',
    hosiery: 'HOSIERY: Black thigh-high stockings with graphite welt. 2-denier T=0.99 with silicone stay-up band.',
  },
  {
    name: '317-photonic-quasicrystal-lace',
    scene: 'Glass balcony door with faint reflections and city light spill.',
    geometry: 'Lace microdress, open back to the waist, high side cutouts; low square neckline with an elongated center keyhole to the upper abdomen and sheer mesh backing. Upper-thigh hemline 30-32cm.',
    material: 'Photonic quasicrystal lace overlay on satin base.',
    materialFallback: 'Iridescent lace overlay with crisp edge glints.',
    micro: 'QUASICRYSTAL LACE: angle-dependent iridescent patches with non-repeating symmetry; lace edges show crisp glints and clean negative spaces.',
    microFallback: 'Iridescent lace with crisp edge glints and clean negative spaces.',
    hosiery: 'HOSIERY: Black thigh-high stockings with prism welt. 2-denier T=0.99 with silicone stay-up band.',
  },
  {
    name: '318-ionic-gauze-aperture',
    scene: 'Marble bar counter in-suite with chrome accents and crystal glasses.',
    geometry: 'Microdress with wide underbust aperture, open back to the waist, and high side cutouts; ultra-low scoop neckline with a narrow sheer illusion insert to the upper abdomen. Upper-thigh hemline 30-32cm.',
    material: 'Ion-conductive gauze overlay on satin.',
    materialFallback: 'Conductive gauze overlay with faint edge glow.',
    micro: 'ION GAUZE: faint luminous edge lines along seams; subtle anisotropic sheen on conductive threads.',
    microFallback: 'Conductive threads show faint edge glow and anisotropic sheen.',
    hosiery: 'HOSIERY: Nude thigh-high stockings with pearl welt. 2-denier T=0.99 with silicone stay-up band.',
  },
  {
    name: '319-magnetorheological-panel',
    scene: 'Soft lamp pools on marble and velvet seating.',
    geometry: 'Strapless microdress with large side cutouts and open back; straight neckline just below collarbones with an elongated center keyhole to the upper abdomen, backed by sheer mesh. Upper-thigh hemline 30-32cm.',
    material: 'Magnetorheological gel panels over satin base.',
    materialFallback: 'Semi-gloss gel panels with tight highlights.',
    micro: 'MR GEL: stiffened zones form smooth convex bulges; low-field zones sag slightly; glossy highlights tighten on stiffened zones.',
    microFallback: 'Panels appear firm with tight highlights; relaxed zones softly sag.',
    hosiery: 'HOSIERY: Black thigh-high stockings with obsidian welt. 2-denier T=0.99 with silicone stay-up band.',
  },
  {
    name: '320-thermocapillary-seamflow',
    scene: 'Silk drapes and skyline reflections on the window glass.',
    geometry: 'Microdress with open sides bridged by thin straps and open back to the waist; ultra-low scoop neckline with a narrow sheer illusion insert to the upper abdomen. Upper-thigh hemline 30-32cm.',
    material: 'Thermocapillary flow seams over satin base.',
    materialFallback: 'Seams with thin glossy flow trails.',
    micro: 'THERMOCAPILLARY SEAMS: micro-fluid flows along seams, leaving thin glossy trails and faint shimmer at heat gradients.',
    microFallback: 'Seams show thin glossy flow trails and faint shimmer.',
    hosiery: 'HOSIERY: Black thigh-high stockings with bronze welt. 2-denier T=0.99 with silicone stay-up band.',
  },
  {
    name: '321-nanobubble-clear-hem',
    scene: 'Low cocktail table with candle cluster and crystal glassware.',
    geometry: 'Microdress with low open back and side cutouts; ultra-low scoop neckline with a narrow sheer illusion insert to the upper abdomen. Upper-thigh hemline 30-32cm with clear hem.',
    material: 'Clear hem with nanobubble lens layer over satin.',
    materialFallback: 'Clear hem with soft pearly scatter.',
    micro: 'NANOBUBBLE LAYER: micro-bubbles create soft pearly scattering and tiny lensing hotspots along the hemline.',
    microFallback: 'Clear hem shows soft pearly scatter and tiny hotspots.',
    hosiery: 'HOSIERY: Black thigh-high stockings with pearl welt. 2-denier T=0.99 with silicone stay-up band.',
  },
  {
    name: '322-birefringent-ribbon-grid',
    scene: 'Sculptural lamp glow and walnut paneling.',
    geometry: 'Microdress with open sides bridged by ribbon lattice and open back to the waist; low square neckline with an elongated center keyhole to the upper abdomen and sheer mesh backing. Upper-thigh hemline 30-32cm.',
    material: 'Birefringent ribbon lattice over matte base.',
    materialFallback: 'Ribbon lattice with subtle color shift.',
    micro: 'BIREFRINGENT RIBBONS: color shift with rotation; thin double-image highlights along ribbon edges.',
    microFallback: 'Ribbons show subtle color shift and twin highlights.',
    hosiery: 'HOSIERY: Black thigh-high stockings with violet welt. 2-denier T=0.99 with silicone stay-up band.',
  },
  {
    name: '323-microlouver-iris',
    scene: 'Glass balcony door with skyline lights; marble and brass accents.',
    geometry: 'Microdress with wide underbust aperture, open back to the waist; straight neckline just below collarbones with an elongated center keyhole to the upper abdomen, backed by sheer mesh. Upper-thigh hemline 30-32cm.',
    material: 'Microlouver iris panels over satin base.',
    materialFallback: 'Panel fabric that changes brightness with viewing angle.',
    micro: 'MICROLOUVER: viewing-angle dependent brightness; panels darken off-axis and brighten head-on, creating dynamic contrast.',
    microFallback: 'Panels change brightness by viewing angle with clean contrast.',
    hosiery: 'HOSIERY: Black thigh-high stockings with onyx welt. 2-denier T=0.99 with silicone stay-up band.',
  },
  {
    name: '324-chiral-coil-bridge',
    scene: 'Velvet seating with city light spill through the windows.',
    geometry: 'Microdress with chain bridges at the sides, open back to the waist; ultra-low scoop neckline with a narrow sheer illusion insert to the upper abdomen. Upper-thigh hemline 30-32cm.',
    material: 'Chiral microcoil chain over satin base.',
    materialFallback: 'Twisted chain links with shifting specular glints.',
    micro: 'CHIRAL COILS: twist-dependent speculars; tiny glints move with viewpoint, creating depth.',
    microFallback: 'Coils sparkle with viewpoint shifts and fine glints.',
    hosiery: 'HOSIERY: Black thigh-high stockings with silver welt. 2-denier T=0.99 with silicone stay-up band.',
  },
  {
    name: '325-graphene-aerogel-tulle',
    scene: 'Marble fireplace glow and brass trim reflections.',
    geometry: 'Tulle overlay microdress with open back to the waist and high side cutouts; low square neckline with an elongated center keyhole to the upper abdomen and sheer mesh backing. Upper-thigh hemline 30-32cm.',
    material: 'Graphene aerogel tulle overlay.',
    materialFallback: 'Soft volumetric tulle with edge glow.',
    micro: 'AEROGEL TULLE: soft volumetric scatter and edge glow on folds; slight translucency with depth.',
    microFallback: 'Soft volumetric tulle with edge glow and gentle translucency.',
    hosiery: 'HOSIERY: Black thigh-high stockings with smoke welt. 2-denier T=0.99 with silicone stay-up band.',
  },
  {
    name: '326-elastocaloric-ribbed-satin',
    scene: 'Soft lamp pools across marble and velvet seating.',
    geometry: 'One-shoulder microdress with diagonal front slit and open back to the waist; low angled neckline with an elongated center keyhole to the upper abdomen and sheer mesh backing. Upper-thigh hemline 30-32cm.',
    material: 'Elastocaloric ribbed satin panels.',
    materialFallback: 'Ribbed satin with subtle cool-warm sheen shift.',
    micro: 'ELASTOCALORIC RIBS: tension cools ribs slightly, shifting sheen cooler; relaxed zones remain warmer, creating subtle thermal banding.',
    microFallback: 'Ribs show cool-warm sheen shift with tension.',
    hosiery: 'HOSIERY: Black thigh-high stockings with sapphire welt. 2-denier T=0.99 with silicone stay-up band.',
  },
  {
    name: '327-perovskite-bead-drape',
    scene: 'Low cocktail table with candle cluster and city bokeh through windows.',
    geometry: 'Microdress with open back to the waist and high side cutouts; low square neckline with an elongated center keyhole to the upper abdomen and sheer mesh backing. Upper-thigh hemline 30-32cm with bead drape.',
    material: 'Glass bead drape with perovskite tint over satin.',
    materialFallback: 'Glass bead drape with warm edge glow.',
    micro: 'BEAD DRAPE: beads act as micro-lenses, casting tiny caustic dots; perovskite tint adds warm edge glow.',
    microFallback: 'Beads create tiny caustic dots with a warm edge glow.',
    hosiery: 'HOSIERY: Black thigh-high stockings with amber welt. 2-denier T=0.99 with silicone stay-up band.',
  },
  {
    name: '328-electrohydrodynamic-sheen',
    scene: 'Glass balcony door reflections with skyline lights and silk drapes.',
    geometry: 'Microdress with open sides bridged by chain links, open back to the waist; ultra-low scoop neckline with a narrow sheer illusion insert to the upper abdomen. Upper-thigh hemline 30-32cm.',
    material: 'Electrohydrodynamic thin film over satin.',
    materialFallback: 'Thin glossy film with faint directional streaks.',
    micro: 'EHD FILM: micro-flow lines align to electric field, producing faint directional streaks; highlights elongate along flow direction.',
    microFallback: 'Thin film shows faint directional streaks and elongated highlights.',
    hosiery: 'HOSIERY: Black thigh-high stockings with gunmetal welt. 2-denier T=0.99 with silicone stay-up band.',
  },
  {
    name: '329-ionized-crystal-strap',
    scene: 'Sculptural floor lamps and walnut paneling with warm highlights.',
    geometry: 'Microdress with open back to the waist, high side cutouts, and thin crystal straps; low square neckline with an elongated center keyhole to the upper abdomen and sheer mesh backing. Upper-thigh hemline 30-32cm.',
    material: 'Crystal straps with ionized edge glow over satin base.',
    materialFallback: 'Crystal straps with crisp edge glints.',
    micro: 'IONIZED STRAPS: faint edge glow and tiny sparkle bursts at joints; micro-caustic dots on skin.',
    microFallback: 'Crystal straps sparkle with tiny glints and faint edge glow.',
    hosiery: 'HOSIERY: Black thigh-high stockings with diamond welt. 2-denier T=0.99 with silicone stay-up band.',
  },
  {
    name: '330-spectral-slit-veil',
    scene: 'Marble fireplace glow and skyline reflections on the window glass.',
    geometry: 'Microdress with a deep diagonal slit, open back to the waist, and high side cutouts; ultra-low scoop neckline with a narrow sheer illusion insert to the upper abdomen. Upper-thigh hemline 30-32cm.',
    material: 'Spectral film veil over satin base.',
    materialFallback: 'Iridescent film veil with soft color shift.',
    micro: 'SPECTRAL VEIL: thin-film interference creates soft color-shift bands; highlights roll smoothly across the surface without harsh glare.',
    microFallback: 'Soft color-shift bands with smooth rolling highlights.',
    hosiery: 'HOSIERY: Black thigh-high stockings with prism welt. 2-denier T=0.99 with silicone stay-up band.',
  },
];

const s = parseInt(process.argv[3] || '0');
const e = parseInt(process.argv[4] || String(concepts.length));
const results = [];

const existingFiles = await fs.readdir(OUTPUT_DIR).catch(() => []);
const existingNums = new Set(existingFiles.filter(f => f.endsWith('.png')).map(f => parseInt(f.split('-')[0])));

console.log(`\n=== V27 APEX - Two-pass, multi-turn refinement ===`);
console.log(`Range: ${s + 1}-${e} | Input: ${path.basename(INPUT_IMAGE)}`);
console.log(`Output: ${OUTPUT_DIR}`);
console.log(`Already generated: ${existingNums.size} | Skipping: [${[...existingNums].sort((a,b)=>a-b).join(',')} ]\n`);

for (let i = s; i < Math.min(e, concepts.length); i++) {
  const conceptNum = i + 311;
  if (existingNums.has(conceptNum)) {
    console.log(`SKIP [${conceptNum}/250] ${concepts[i].name} (already exists)`);
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
console.log('V27 APEX RESULTS');
console.log(`${'='.repeat(60)}`);
const ok = results.filter(r => r.ok);
console.log(`Success: ${ok.length}/${results.length}`);
results.forEach(r => console.log(`  ${r.ok ? 'OK' : '!!'} ${r.name}${r.err ? ': ' + r.err : ''}`));
console.log(`\nOutput: ${OUTPUT_DIR}`);

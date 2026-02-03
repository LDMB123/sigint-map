#!/usr/bin/env node

/**
 * V29 APEX - Two-pass, multi-turn refinement for max photorealism
 *
 * Pass A: scene + camera + light transport + skin physics + core attire
 * Pass B: garment microstructure + hosiery + imperfections, preserving pass A
 *
 * Model: gemini-3-pro-image-preview
 * Output: 4K, 4:5
 * Word target per pass: 1000-1300
 */

import { GoogleAuth } from 'google-auth-library';
import fs from 'fs/promises';
import path from 'path';

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || 'gen-lang-client-0925343693';
const LOCATION = 'global';
const MODEL = 'gemini-3-pro-image-preview';
const ENDPOINT = `https://aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL}:generateContent`;
const OUTPUT_DIR = process.env.OUTPUT_DIR || path.join(process.env.HOME, 'nanobanana-output', 'vegas-v29-apex');
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

const SULTRY_MOOD_BLOCK = `SULTRY EDITORIAL MOOD: intimate luxury suite energy, low-breath stillness, slow-burn tension, glossy nightlife mood. Keep expression sultry but natural, not exaggerated.`;

const AIRFLOW_PHYSICS_BLOCK = `AIRFLOW + HEAT: subtle HVAC airflow lifts a few hair strands; candle heat shimmer distorts background highlights; micro-cloth flutter at loose edges.`;

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

${SULTRY_MOOD_BLOCK}

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

${AIRFLOW_PHYSICS_BLOCK}

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

${SULTRY_MOOD_BLOCK}

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

${AIRFLOW_PHYSICS_BLOCK}

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
  if (wc < 1000 || wc > 1300) {
    console.log(`WARN: Pass A word count ${wc} outside 1000-1300 target.`);
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
  if (wc < 1000 || wc > 1300) {
    console.log(`WARN: Pass B word count ${wc} outside 1000-1300 target.`);
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
    name: '351-velocity-plunge-halter',
    scene: 'Panoramic windows with skyline shimmer; velvet chaise and warm lamp pools.',
    geometry: 'Halter microdress with an ultra-deep plunge stabilized by sheer illusion mesh to the upper abdomen, open back to the waist, and high side cutouts. Upper-thigh hemline 28-30cm.',
    material: 'Liquid satin with a high-gloss clearcoat.',
    materialFallback: 'Liquid satin with tight specular highlights.',
    micro: 'PLUNGE SUPPORT: illusion mesh shows a fine weave grid and gentle tension lines; satin highlights streak along the bust curve with anisotropic sheen.',
    microFallback: 'Illusion mesh grid and tight satin highlight streaks.',
    hosiery: 'HOSIERY: Black thigh-high stockings with obsidian welt. 2-denier T=0.99 with silicone stay-up band.',
  },
  {
    name: '352-side-shear-ribbons',
    scene: 'Marble bar with candle clusters; soft skyline reflections in glass.',
    geometry: 'Microdress with open sides bridged by ultra-thin ribbon straps across waist and hip; open back to the waist; low square neckline with elongated keyhole to upper abdomen and sheer mesh backing. Upper-thigh hemline 28-30cm.',
    material: 'Matte base with satin ribbon bridges.',
    materialFallback: 'Matte base with satin ribbons and crisp edges.',
    micro: 'RIBBON TENSION: ribbons show micro-compression at anchors and tight specular ridges along edges; slight skin indentation at tension points.',
    microFallback: 'Ribbons show crisp edges and subtle anchor compression.',
    hosiery: 'HOSIERY: Black thigh-high stockings with graphite welt. 2-denier T=0.99 with silicone stay-up band.',
  },
  {
    name: '353-glass-bead-bodice',
    scene: 'Crystal glassware and warm lamp glow on marble.',
    geometry: 'Microdress with beaded bodice overlay, open back to the waist, and high side cutouts; ultra-low scoop neckline with narrow sheer illusion insert to upper abdomen. Upper-thigh hemline 28-30cm.',
    material: 'Satin base with glass bead overlay.',
    materialFallback: 'Satin base with glass beads and crisp glints.',
    micro: 'GLASS BEADS: tiny caustic dots and spark bursts; beads show micro-refraction with shallow depth-of-field bokeh.',
    microFallback: 'Beads sparkle with fine glints and faint caustic dots.',
    hosiery: 'HOSIERY: Black thigh-high stockings with crystal welt. 2-denier T=0.99 with silicone stay-up band.',
  },
  {
    name: '354-chainframe-deep-v',
    scene: 'Walnut panels and sculptural lamp glow; skyline bokeh.',
    geometry: 'Deep V microdress with chainframe straps, open back to the waist, and high side cutouts; plunge stabilized by sheer illusion mesh to upper abdomen. Upper-thigh hemline 28-30cm.',
    material: 'Matte base with metallic chainframe.',
    materialFallback: 'Matte base with metallic chains and crisp glints.',
    micro: 'CHAINFRAME: micro-glints at joints, gentle sag curve under gravity; tiny specular beads on skin from chain reflections.',
    microFallback: 'Chains sparkle with tight glints and subtle sag curve.',
    hosiery: 'HOSIERY: Black thigh-high stockings with chrome welt. 2-denier T=0.99 with silicone stay-up band.',
  },
  {
    name: '355-satin-drape-backlace',
    scene: 'Velvet sectional with warm lamp pools and silk drapes.',
    geometry: 'Microdress with backless lace-up spine, open back to the waist, and ultra-high slit; low angled neckline with elongated keyhole to upper abdomen and sheer mesh backing. Upper-thigh hemline 28-30cm.',
    material: 'Liquid satin with lace-up satin cords.',
    materialFallback: 'Liquid satin with lace-up cords and smooth highlights.',
    micro: 'LACE-UP SPINE: cords show micro-twist highlights and slight skin indentation; satin folds form tight highlight bands along the slit.',
    microFallback: 'Cords show twist highlights; satin folds show tight highlight bands.',
    hosiery: 'HOSIERY: Black thigh-high stockings with onyx welt. 2-denier T=0.99 with silicone stay-up band.',
  },
  {
    name: '356-corset-cutout-illusion',
    scene: 'Marble console and champagne cart with candle glow.',
    geometry: 'Corset microdress with sheer side windows and underbust cutout, open back to the waist; low straight neckline with elongated keyhole to upper abdomen and sheer mesh backing. Upper-thigh hemline 28-30cm.',
    material: 'Satin corset base with sheer mesh windows.',
    materialFallback: 'Satin corset base with clean mesh windows.',
    micro: 'MESH WINDOWS: clean edge transitions, visible weave grid, and soft diffusion without transparency artifacts.',
    microFallback: 'Mesh windows with clean edges and soft diffusion.',
    hosiery: 'HOSIERY: Black thigh-high stockings with ruby welt. 2-denier T=0.99 with silicone stay-up band.',
  },
  {
    name: '357-microfringe-slit',
    scene: 'Floor-to-ceiling windows with skyline reflections; candle glow.',
    geometry: 'Microdress with ultra-high slit and microfringe hem, open back to the waist; deep V neckline stabilized by sheer illusion mesh to upper abdomen. Upper-thigh hemline 28-30cm.',
    material: 'Liquid satin with microfringe trim.',
    materialFallback: 'Satin with fringe trim and smooth highlights.',
    micro: 'MICROFRINGE: fine strands show slight inertia lag and micro-motion blur; fringe tips catch pinprick highlights.',
    microFallback: 'Fringe tips catch pinprick highlights with subtle motion blur.',
    hosiery: 'HOSIERY: Black thigh-high stockings with pearl welt. 2-denier T=0.99 with silicone stay-up band.',
  },
  {
    name: '358-crystal-strap-void',
    scene: 'Brass-trimmed mirror and warm lamp pools on marble.',
    geometry: 'Microdress with open sides and crystal strap bridges across waist and hip; open back to the waist; ultra-low scoop neckline with narrow sheer illusion insert to upper abdomen. Upper-thigh hemline 28-30cm.',
    material: 'Satin base with crystal strap bridges.',
    materialFallback: 'Satin base with crystal straps and crisp glints.',
    micro: 'CRYSTAL STRAPS: tiny sparkle bursts at joints, faint caustic dots on skin, and gentle strap sag under gravity.',
    microFallback: 'Crystal straps sparkle with tiny glints and faint caustics.',
    hosiery: 'HOSIERY: Black thigh-high stockings with diamond welt. 2-denier T=0.99 with silicone stay-up band.',
  },
  {
    name: '359-liquid-metal-wrap',
    scene: 'Velvet seating with candle glow; skyline bokeh through glass.',
    geometry: 'Wrap microdress in liquid-metal finish, open back to the waist, and high side cutouts; low angled neckline with elongated keyhole to upper abdomen and sheer mesh backing. Upper-thigh hemline 28-30cm.',
    material: 'Liquid metal lamé with clearcoat.',
    materialFallback: 'Metallic lamé with tight highlights.',
    micro: 'LIQUID METAL: tight specular bands with micro-ripple texture; subtle polarization-dependent dimming on highlights.',
    microFallback: 'Tight specular bands and fine ripple texture.',
    hosiery: 'HOSIERY: Black thigh-high stockings with steel welt. 2-denier T=0.99 with silicone stay-up band.',
  },
  {
    name: '360-sheer-tulle-spiral',
    scene: 'Silk drapes and a marble console; candlelight reflections.',
    geometry: 'Microdress with sheer spiral tulle overlay, open back to the waist; ultra-low scoop neckline with narrow sheer illusion insert to upper abdomen. Upper-thigh hemline 28-30cm.',
    material: 'Satin base with sheer spiral tulle.',
    materialFallback: 'Satin base with sheer tulle overlay and soft diffusion.',
    micro: 'TULLE SPIRAL: fine mesh grid visible in highlights, soft diffusion at edges, subtle flutter at the hem.',
    microFallback: 'Tulle grid visible with soft diffusion and subtle flutter.',
    hosiery: 'HOSIERY: Black thigh-high stockings with sapphire welt. 2-denier T=0.99 with silicone stay-up band.',
  },
  {
    name: '361-astral-foil-halter',
    scene: 'Brass trim reflections and warm lamp pools on marble.',
    geometry: 'Halter microdress with deep plunge stabilized by sheer illusion mesh, open back to the waist, and high side cutouts. Upper-thigh hemline 28-30cm.',
    material: 'Iridescent foil with satin backing.',
    materialFallback: 'Iridescent foil with crisp highlight bands.',
    micro: 'IRIDESCENT FOIL: soft color-shift bands and tight specular streaks; subtle orange-peel texture on clearcoat.',
    microFallback: 'Color-shift bands and tight specular streaks.',
    hosiery: 'HOSIERY: Black thigh-high stockings with prism welt. 2-denier T=0.99 with silicone stay-up band.',
  },
  {
    name: '362-lace-up-back-veil',
    scene: 'Skyline reflections on glass; candle glow on marble.',
    geometry: 'Microdress with lace-up open back and sheer veil panel, high side cutouts; low square neckline with elongated keyhole to upper abdomen and sheer mesh backing. Upper-thigh hemline 28-30cm.',
    material: 'Matte base with sheer veil panel.',
    materialFallback: 'Matte base with sheer veil and soft diffusion.',
    micro: 'VEIL PANEL: clean edge transitions, visible weave grid, and soft shadow spill onto skin; lace-up cords show micro-twist highlights.',
    microFallback: 'Veil grid with soft shadow spill; lace-up cords with twist highlights.',
    hosiery: 'HOSIERY: Black thigh-high stockings with graphite welt. 2-denier T=0.99 with silicone stay-up band.',
  },
  {
    name: '363-heat-mapped-satin',
    scene: 'Velvet sectional with warm lamp pools and champagne cart.',
    geometry: 'Microdress with ultra-high slit and open back to the waist; low angled neckline with elongated keyhole to upper abdomen and sheer mesh backing. Upper-thigh hemline 28-30cm.',
    material: 'Thermochromic satin with subtle color shift.',
    materialFallback: 'Satin with gentle color-shift bands.',
    micro: 'THERMOCHROMIC: subtle gradient bands over warmth zones, sheen aligned to weave, micro-wrinkles at waist.',
    microFallback: 'Soft gradient bands with aligned satin sheen.',
    hosiery: 'HOSIERY: Black thigh-high stockings with onyx welt. 2-denier T=0.99 with silicone stay-up band.',
  },
  {
    name: '364-velvet-sculpt-open',
    scene: 'Marble fireplace glow; brass trim reflections.',
    geometry: 'Sculpted velvet microdress with cutout waist, open back to the waist; ultra-low scoop neckline with narrow sheer illusion insert to upper abdomen. Upper-thigh hemline 28-30cm.',
    material: 'Stretch velvet with satin edge binding.',
    materialFallback: 'Stretch velvet with soft pile highlights.',
    micro: 'VELVET PILE: directional sheen with soft lobe highlights; pile compression shows darker pressure patches along curves.',
    microFallback: 'Directional velvet sheen with subtle compression patches.',
    hosiery: 'HOSIERY: Black thigh-high stockings with obsidian welt. 2-denier T=0.99 with silicone stay-up band.',
  },
  {
    name: '365-lattice-bustier-open',
    scene: 'Sculptural lamp glow; walnut paneling; skyline bokeh.',
    geometry: 'Bustier microdress with lattice waist cutout, open back to the waist, and high side cutouts; low straight neckline with elongated keyhole to upper abdomen and sheer mesh backing. Upper-thigh hemline 28-30cm.',
    material: 'Satin bustier with matte lattice band.',
    materialFallback: 'Satin bustier with matte lattice and crisp highlights.',
    micro: 'LATTICE BAND: clean edge thickness, subtle bevel shadows, and micro-strain lines at anchors.',
    microFallback: 'Lattice edges show thickness and subtle bevel shadows.',
    hosiery: 'HOSIERY: Black thigh-high stockings with steel welt. 2-denier T=0.99 with silicone stay-up band.',
  },
  {
    name: '366-silver-slit-iris',
    scene: 'Glass balcony door with skyline reflections and faint glare.',
    geometry: 'Microdress with iris-shaped midriff window and ultra-high slit, open back to the waist; low angled neckline with elongated keyhole to upper abdomen and sheer mesh backing. Upper-thigh hemline 28-30cm.',
    material: 'Silver lamé with sheer iris window.',
    materialFallback: 'Silver lamé with crisp highlight bands.',
    micro: 'LAMÉ SHEEN: tight highlight bands with micro-sparkle texture; iris window shows clean mesh grid and soft diffusion.',
    microFallback: 'Lamé highlights with mesh grid at window.',
    hosiery: 'HOSIERY: Black thigh-high stockings with chrome welt. 2-denier T=0.99 with silicone stay-up band.',
  },
  {
    name: '367-mesh-inset-hipline',
    scene: 'Marble console and crystal glassware; candle glow.',
    geometry: 'Microdress with high hip mesh insets, open back to the waist; ultra-low scoop neckline with narrow sheer illusion insert to upper abdomen. Upper-thigh hemline 28-30cm.',
    material: 'Satin base with sheer mesh insets.',
    materialFallback: 'Satin base with clean mesh insets.',
    micro: 'HIP MESH: mesh grid visible in highlights; clean edge transitions and soft diffusion without artifacts.',
    microFallback: 'Mesh grid visible with clean edges and soft diffusion.',
    hosiery: 'HOSIERY: Black thigh-high stockings with graphite welt. 2-denier T=0.99 with silicone stay-up band.',
  },
  {
    name: '368-nylon-gloss-cowl',
    scene: 'Velvet seating and warm lamp pools; skyline reflections.',
    geometry: 'Asymmetric microdress with deep cowl neckline, open back to the waist, and high side cutouts; plunge stabilized by sheer illusion mesh to upper abdomen. Upper-thigh hemline 28-30cm.',
    material: 'High-gloss nylon with soft cowl drape.',
    materialFallback: 'Glossy nylon with flowing cowl folds.',
    micro: 'GLOSS COWL: tight specular bands and smooth shadow gradients; slight edge curl at cowl lip.',
    microFallback: 'Tight specular bands with smooth cowl gradients.',
    hosiery: 'HOSIERY: Black thigh-high stockings with midnight welt. 2-denier T=0.99 with silicone stay-up band.',
  },
  {
    name: '369-bonded-tape-arches',
    scene: 'Brass trim reflections on marble; candle glow.',
    geometry: 'Microdress with bonded tape arch cutouts at waist and hip, open back to the waist; low square neckline with elongated keyhole to upper abdomen and sheer mesh backing. Upper-thigh hemline 28-30cm.',
    material: 'Matte base with bonded satin tape arches.',
    materialFallback: 'Matte base with satin tape arches and crisp edges.',
    micro: 'TAPE ARCHES: edge thickness reads with clean bevel shadows; slight adhesive tension lines at anchor points.',
    microFallback: 'Tape edges show thickness and subtle tension lines.',
    hosiery: 'HOSIERY: Black thigh-high stockings with onyx welt. 2-denier T=0.99 with silicone stay-up band.',
  },
  {
    name: '370-prism-chain-skirt',
    scene: 'Skyline reflections on glass; candle glow and champagne cart.',
    geometry: 'Microdress with prism chain skirt overlay, open back to the waist, and high side cutouts; ultra-low scoop neckline with narrow sheer illusion insert to upper abdomen. Upper-thigh hemline 28-30cm.',
    material: 'Satin bodice with prism chain skirt overlay.',
    materialFallback: 'Satin bodice with prism chain overlay and crisp glints.',
    micro: 'PRISM CHAINS: tiny sparkle bursts and micro-caustic dots on skin; chain overlay drapes with gentle gravity sag.',
    microFallback: 'Chains sparkle with tiny glints and gentle sag.',
    hosiery: 'HOSIERY: Black thigh-high stockings with diamond welt. 2-denier T=0.99 with silicone stay-up band.',
  },
];

const s = parseInt(process.argv[3] || '0');
const e = parseInt(process.argv[4] || String(concepts.length));
const results = [];

const existingFiles = await fs.readdir(OUTPUT_DIR).catch(() => []);
const existingNums = new Set(existingFiles.filter(f => f.endsWith('.png')).map(f => parseInt(f.split('-')[0])));

console.log(`\n=== V29 APEX - Two-pass, multi-turn refinement ===`);
console.log(`Range: ${s + 1}-${e} | Input: ${path.basename(INPUT_IMAGE)}`);
console.log(`Output: ${OUTPUT_DIR}`);
console.log(`Already generated: ${existingNums.size} | Skipping: [${[...existingNums].sort((a,b)=>a-b).join(',')} ]\n`);

for (let i = s; i < Math.min(e, concepts.length); i++) {
  const conceptNum = i + 351;
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
console.log('V29 APEX RESULTS');
console.log(`${'='.repeat(60)}`);
const ok = results.filter(r => r.ok);
console.log(`Success: ${ok.length}/${results.length}`);
results.forEach(r => console.log(`  ${r.ok ? 'OK' : '!!'} ${r.name}${r.err ? ': ' + r.err : ''}`));
console.log(`\nOutput: ${OUTPUT_DIR}`);

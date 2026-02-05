#!/usr/bin/env node

/**
 * V24 APEX - Two-pass, multi-turn refinement for max photorealism
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
const OUTPUT_DIR = process.env.OUTPUT_DIR || path.join(process.env.HOME, 'nanobanana-output', 'vegas-v24-apex');
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

const CAMERA_BLOCK = `CAMERA SENSOR PHYSICS: Canon EOS R5 II full-frame 45MP BSI-CMOS, RF 50mm f/1.2 at f/1.2; focus at 2.2m, 14cm depth-of-field. ISO 3200 with visible luminance grain and chroma noise in shadows; shutter 1/125s with slight motion blur on fingertips. Dual-pixel AF locked on nearest iris; creamy bokeh discs with mild onion-ring. 0.7 stop corner vignetting, 0.3px purple fringing at high-contrast edges. No flash, available light only; crushed blacks below noise floor.`;

const LIGHT_BLOCK = `3D GLOBAL ILLUMINATION LIGHT TRANSPORT: Tungsten track spots 2800K create hard pools; neon signage ~4500K throws saturated spill with hard boundaries; LED bottle wall is 3 stops under for faint cool fill. Candle cylinders ~1900K add localized pin highlights; EXIT sign ~6500K adds a faint green-blue edge cast. Strong 4-stop gradient bar to booths; no fill, deep shadow side. Warm bounce from black marble bar; water-channel caustics flicker on bar lip. Haze scatters light, ambient occlusion at body-bar contact.`;

const SKIN_BLOCK = `SKIN BIO-OPTICAL RENDERING: natural subsurface scattering, visible pores and fine expression lines, no smoothing. T-zone sheen, faint vellus hair rim-light, tiny perspiration micro-specs. Preserve face, bone structure, and eye color exactly.`;

const NO_TOUCH_BLOCK = `SUBJECT IS SOLO: No other people touching or overlapping her. No extra arms or hands near her shoulders or body. Keep both shoulders clear. No stray hands in frame behind her. Background patrons, if present, are distant and fully separated.`;

const IMPERFECTIONS_BLOCK = `RAW PHOTOGRAPHIC IMPERFECTIONS: ISO 3200 grain in shadows, flyaway hair streaks, neon bokeh discs, faint lens flare ghost from neon/candle, barrel distortion at edges, lateral CA 0.5px red-cyan fringe, sensor bloom 2–3px on hot highlights. Condensation rings on glass, fingerprints on brass rail and mirror, crumpled napkin. No retouching, RAW WB only.`;

const CLOTH_PHYSICS_BLOCK = `CLOTH + BODY PHYSICS: gravity-driven drape with measurable weight; hemline shows slight bias stretch and a 2–4mm outward curl. Bending stiffness varies by panel; shear distortion appears where the dress wraps the hip. Strap bridges indent skin with subtle compression and rebound; seam puckering at stitch lines under tension. Micro-wrinkles at waist/hip, directional stretch lines in high-tension zones, and fabric thickness reads at all cutout edges. Satin shows anisotropic highlights aligned to the weave; matte panels show broader diffuse lobes.`;

const SCENE_PHYSICS_BLOCK = `ENVIRONMENTAL PHYSICS: haze density varies with distance and light angle; candle heat causes faint shimmer. Glassware shows condensation beads, streaks, and thin water films; neon reflections obey inverse-square falloff and Fresnel roll-off on the marble bar. Specular highlights clamp and bloom; shadow penumbra softens with distance; ambient occlusion deepens at body-bar contact. Brass and onyx surfaces show micro-scratches and smudge patterns that catch grazing light.`;

const OPTICS_BLOCK = `OPTICAL SURFACES: black marble bar behaves like a glossy dielectric with sharp reflections and subtle surface roughness; mirror ceiling shows slight distortion and ghosting. Wet stone entry has clear water sheen with rippled reflections. Glass stems show caustic streaks and internal reflection; metal rails show tight specular bands with faint chromatic dispersion at edges.`;

const WARDROBE_CONSTRUCTION_BLOCK = `WARDROBE CONSTRUCTION: internal boning and micro-stays stabilize the neckline; hidden clear tape prevents slip. Seams align to body landmarks with subtle stitch puckering; clasp hardware shows tiny specular edges; closures sit under tension without warping the fabric.`;

const SAFETY_BLOCK = `FASHION SAFETY: daring couture but fully covered; no explicit nudity; no see-through exposure of nipples or genitalia.`;

const SCENE_BASE = `ARIA LAS VEGAS COCKTAIL BAR SETTING (FIRST PRINCIPLES): Real-world Aria Las Vegas cocktail lounge ambience with polished black marble, warm brass, walnut, and sleek architectural lighting. Modern resort bar with a long curved marble counter, bronze foot rail, backlit liquor wall, mirrored columns, geometric ceiling light grid, sculptural pendants, plush banquettes, and floor-to-ceiling windows revealing CityCenter night lights; subtle neon reflections, candle clusters on the bar, and quiet lounge patrons in the deep background.`;

function buildPromptPassA(concept, expression, fallback = false) {
  const material = fallback ? concept.materialFallback : concept.material;
  return `Generate an image of this photograph edited into an ultra-raw real-life Aria Las Vegas cocktail bar photograph indistinguishable from an unretouched candid shot from a real night out. Raw documentary nightlife photography. Preserve exact identity, face, bone structure, eyes, nose, mouth, and age. Keep pose, framing, and expression consistent: ${expression}. Only change outfit and environment as described. Avoid retouching.

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
  if (!lower.includes('32-34cm') && !lower.includes('34cm')) {
    console.log(`WARN: ${label} missing explicit hemline 32-34cm anchor.`);
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
    name: '251-electrowetting-cascade-open-sides',
    scene: 'VIP rope stanchions and a discreet security post near the entry, soft reflections on wet stone floor.',
    geometry: 'Black satin microdress with a halter collar and an elongated center keyhole to the upper abdomen, fully open back to the waist, and extreme side cutouts bridged by micro-chain links at the ribcage and hip. Ultra-low scoop neckline stopping just above the bust line; a narrow sheer illusion insert drops to the upper abdomen for support. Upper-thigh hemline 32-34cm.',
    material: 'Satin base for clean specular roll; embedded electrowetting microchannels trace the torso.',
    materialFallback: 'Satin base with clear microchannels that carry tiny moving droplets.',
    micro: 'ELECTROWETTING MICROCHANNELS: applied field lowers contact angle, causing micro-droplets to spread and merge into glossy beads that slide along channels. Beads show sharp specular hotspots, thin meniscus shadows, and faint refractive halos.',
    microFallback: 'Moving glossy droplets slide and merge in thin channels, with meniscus shadows and small specular hotspots.',
    hosiery: 'HOSIERY: Black thigh-high stockings with gunmetal welt. 2-denier T=0.985 with silicone stay-up band.',
  },
  {
    name: '252-magnetoelastic-rib-cage',
    scene: 'Back-bar POS terminal glow and receipt printer spill a faint cool edge light.',
    geometry: 'Sculpted microdress with open back to the waist and vertical side cutouts up to the ribcage; wide underbust aperture and low square neckline at the upper bust line with an elongated center keyhole to the upper abdomen with sheer mesh backing. Upper-thigh hemline 32-34cm.',
    material: 'Matte-black base with magnetoelastic rib bands that stiffen under nearby field sources.',
    materialFallback: 'Matte base with reinforced elastic ribs that alternate between taut and relaxed.',
    micro: 'MAGNETOELASTIC RIBS: field-induced stiffening creates alternating taut and relaxed bands; taut zones show tight specular ridges while relaxed zones show soft drape. Micro-strain lines appear at anchor points.',
    microFallback: 'Rib bands alternate tight and soft, with fine strain lines and crisp highlights on taut sections.',
    hosiery: 'HOSIERY: Black thigh-high stockings with graphite welt. 2-denier T=0.985 with silicone stay-up band.',
  },
  {
    name: '253-acousto-optic-fringe-halter',
    scene: 'Ice bucket condensation and crystal coupe reflections add tiny specular points on the bar.',
    geometry: 'Halter microdress with a fully open back and high side cutouts; crystal fringe at hemline and an ultra-low scoop neckline stopping just above the bust line; a narrow sheer illusion insert drops to the upper abdomen for support. Upper-thigh hemline 32-34cm.',
    material: 'Matte base with acousto-optic fringe system.',
    materialFallback: 'Matte base with crystal fringe that sways and sparkles.',
    micro: 'ACOUSTO-OPTIC FRINGE: standing-wave vibration drives synchronized oscillation; bead collisions create brief sparkle flashes and tiny caustic dots on skin. Fringe lag shows 0.2–0.5s phase delay after motion.',
    microFallback: 'Fringe beads sway with delayed motion and produce short sparkle flashes at collisions.',
    hosiery: 'HOSIERY: Black thigh-high stockings with crystal welt. 2-denier T=0.985 with silicone stay-up band.',
  },
  {
    name: '254-liquid-crystal-elastomer-slit',
    scene: 'Smoked mirror ceiling doubles candle cylinders into repeating rows.',
    geometry: 'One-shoulder microdress with a diagonal front slit and open back to the waist; narrow side cutout and low angled neckline at the upper bust line with an elongated center keyhole to the upper abdomen with sheer mesh backing. Upper-thigh hemline 32-34cm.',
    material: 'Liquid-crystal elastomer panels bonded to a satin substrate.',
    materialFallback: 'Iridescent elastomer panels bonded to satin.',
    micro: 'LCE DOMAINS: strain shifts alignment, producing angle-dependent iridescent bands that compress at the waist and relax at the hip. Micro-creases produce tight highlight bands.',
    microFallback: 'Iridescent bands shift with tension; tight creases create bright highlight streaks.',
    hosiery: 'HOSIERY: Black thigh-high stockings with sapphire welt. 2-denier T=0.985 with silicone stay-up band.',
  },
  {
    name: '255-photonic-microprism-harness',
    scene: 'Neon signage creates soft color spill across booths and the bar edge.',
    geometry: 'Microdress with low open back and open sides bridged by a thin harness over the midriff; ultra-low scoop neckline stopping just above the bust line; a narrow sheer illusion insert drops to the upper abdomen for support. Upper-thigh hemline 32-34cm.',
    material: 'Satin base with photonic microprism harness.',
    materialFallback: 'Satin base with reflective microprism harness.',
    micro: 'MICROPRISM HARNESS: prism cells return light to source, creating intense pinpoint hotspots with sharp falloff. Scuffed zones break highlights into irregular patches.',
    microFallback: 'Harness sparkles with small directional hotspots and uneven scuffed patches.',
    hosiery: 'HOSIERY: Black thigh-high stockings with metallic welt. 2-denier T=0.985 with silicone stay-up band.',
  },
  {
    name: '256-thermochromic-iris-cutout',
    scene: 'Water-channel caustics flicker across the bar lip and lower wall.',
    geometry: 'Strapless microdress with large side cutouts and open back to the waist; straight neckline just below collarbones with an elongated center keyhole to the upper abdomen, backed by sheer mesh. Upper-thigh hemline 32-34cm.',
    material: 'Thermochromic film over satin base.',
    materialFallback: 'Heat-reactive film over satin base.',
    micro: 'THERMOCHROMIC FILM: heat blooms form soft concentric gradients around waist and hip contact zones; warm regions shift from charcoal to deep burgundy with slightly increased gloss.',
    microFallback: 'Heat blooms create soft color shifts and mild gloss changes around the waist.',
    hosiery: 'HOSIERY: Black thigh-high stockings with burgundy welt. 2-denier T=0.985 with silicone stay-up band.',
  },
  {
    name: '257-graphene-lace-suspension',
    scene: 'Brass lattice truss casts geometric shadow bands across the booths.',
    geometry: 'Lace microdress with thin straps, open back to the waist, and high side cutouts; ultra-low scoop neckline stopping just above the bust line; a narrow sheer illusion insert drops to the upper abdomen for support. Upper-thigh hemline 32-34cm.',
    material: 'Graphene-infused lace overlay with matte structural panels.',
    materialFallback: 'Fine lace overlay with matte structural panels.',
    micro: 'GRAPHENE LACE: conductive filaments create faint directional sheen; lace edges show crisp glints, negative spaces reveal skin with clean contrast and subtle shadow spill.',
    microFallback: 'Lace edges glint; open lace spacing shows clean negative space with soft shadow spill.',
    hosiery: 'HOSIERY: Black thigh-high stockings with matte welt. 2-denier T=0.985 with silicone stay-up band.',
  },
  {
    name: '258-quantum-dot-veil-bridges',
    scene: 'Neon spill paints soft color on the smoked mirror ceiling.',
    geometry: 'Black satin microdress with open sides linked by micro-chain bridges; low open back; ultra-low scoop neckline stopping just above the bust line; a narrow sheer illusion insert drops to the upper abdomen for support. Upper-thigh hemline 32-34cm.',
    material: 'Sheer overlay embedded with quantum-dot luminophores.',
    materialFallback: 'Sheer overlay with tiny luminous specks along seams.',
    micro: 'QUANTUM-DOT VEIL: micro-dots convert stray UV to warm red pinpricks; dots cluster along seams forming faint constellation bands. Overlay shows soft parallax over the satin base.',
    microFallback: 'Tiny warm specks cluster along seams; overlay shows subtle parallax over the base.',
    hosiery: 'HOSIERY: Black thigh-high stockings with crimson welt. 2-denier T=0.985 with silicone stay-up band.',
  },
  {
    name: '259-plasmonic-foil-tension',
    scene: 'Amber liquor wall glows behind the bar, reflecting in black marble.',
    geometry: 'Metallic foil microdress with a narrow underbust cutout and open back to the waist; low square neckline at the upper bust line with an elongated center keyhole to the upper abdomen with sheer mesh backing. Upper-thigh hemline 32-34cm.',
    material: 'Plasmonic foil laminate under tension.',
    materialFallback: 'Metallic foil laminate under tension with crisp highlights.',
    micro: 'PLASMONIC FOIL: resonance peaks intensify warm glints at grazing angles; micro-crack networks fragment highlights into small islands; clearcoat orange-peel adds fine sparkle noise.',
    microFallback: 'Warm glints fragment into small highlight islands with fine sparkle texture.',
    hosiery: 'HOSIERY: Black thigh-high stockings with gold welt. 2-denier T=0.985 with silicone stay-up band.',
  },
  {
    name: '260-auxetic-microgrid-expose',
    scene: 'LED bottle wall adds faint cool fill to the scene.',
    geometry: 'Microdress with open back to the waist and an auxetic microgrid midriff cage; high-cut sides and ultra-low scoop neckline stopping just above the bust line; a narrow sheer illusion insert drops to the upper abdomen for support. Upper-thigh hemline 32-34cm.',
    material: 'Matte base with auxetic microgrid cage.',
    materialFallback: 'Matte base with geometric microgrid cage.',
    micro: 'AUXETIC GRID: clean geometric windows with crisp ribs; subtle edge curl and consistent micro-shadows, minimal shimmer.',
    microFallback: 'Clean geometric grid with crisp ribs and subtle micro-shadows.',
    hosiery: 'HOSIERY: Black thigh-high stockings with graphite welt. 2-denier T=0.985 with silicone stay-up band.',
  },
  {
    name: '261-electrochromic-lamella-spine',
    scene: 'Blue-violet spill grazes the smoked mirror ceiling.',
    geometry: 'Panelled microdress with low open back; lamella side panels and a narrow spine opening; straight neckline just below collarbones with an elongated center keyhole to the upper abdomen, backed by sheer mesh. Upper-thigh hemline 32-34cm.',
    material: 'Electrochromic lamella panels bonded to a matte base.',
    materialFallback: 'Tint-shifting lamella panels bonded to a matte base.',
    micro: 'ELECTROCHROMIC LAMELLAE: panels shift from smoke to cobalt in stepped gradients; crisp refraction at panel edges creates fine bright seams.',
    microFallback: 'Panel tint shifts in steps; edges show thin bright seams.',
    hosiery: 'HOSIERY: Black thigh-high stockings with cobalt welt. 2-denier T=0.985 with silicone stay-up band.',
  },
  {
    name: '262-hydrogel-microlens-sheers',
    scene: 'Candle cylinders produce warm pools with deep shadow falloff.',
    geometry: 'Sheer-panel microdress with open back to the waist and narrow side cutouts; ultra-low scoop neckline stopping just above the bust line; a narrow sheer illusion insert drops to the upper abdomen for support. Upper-thigh hemline 32-34cm.',
    material: 'Hydrogel microlens overlay on sheer panels.',
    materialFallback: 'Sheer panels with tiny bead-like lenses.',
    micro: 'MICROLENS HYDROGEL: bead-like lenses magnify highlights into tiny luminous orbs; edge meniscus lines create thin dark rings. Sheer panels show soft halo scatter around lens clusters.',
    microFallback: 'Tiny lens beads create bright points and soft halo scatter.',
    hosiery: 'HOSIERY: Nude thigh-high stockings with pearl welt. 2-denier T=0.985 with silicone stay-up band.',
  },
  {
    name: '263-viscoelastic-crystal-cowl',
    scene: 'Low haze diffuses neon into soft bokeh.',
    geometry: 'Microdress with dramatic cowl back and open sides linked by fine straps; ultra-low scoop neckline stopping just above the bust line; a narrow sheer illusion insert drops to the upper abdomen for support. Upper-thigh hemline 32-34cm.',
    material: 'Satin base with viscoelastic crystal strands at cowl edge.',
    materialFallback: 'Satin base with crystal strands at the cowl edge.',
    micro: 'VISCOELASTIC STRANDS: delayed motion lag and damped oscillation; micro-collisions produce brief sparkle flashes and tiny caustic dots on skin.',
    microFallback: 'Crystal strands sway with delayed lag and produce small sparkle flashes.',
    hosiery: 'HOSIERY: Black thigh-high stockings with prism welt. 2-denier T=0.985 with silicone stay-up band.',
  },
  {
    name: '264-phase-change-banded-satin',
    scene: 'Glass reflections ripple across the bar surface.',
    geometry: 'Satin microdress with open back to the waist and asymmetric side cutout; low square neckline at the upper bust line with an elongated center keyhole to the upper abdomen with sheer mesh backing. Upper-thigh hemline 32-34cm.',
    material: 'Phase-change coated satin with heat-band response.',
    materialFallback: 'Heat-reactive satin with soft tonal bands.',
    micro: 'PCM BANDS: thermal gradients form soft rings around waist and hip; warm bands deepen to crimson with increased gloss, cool zones remain charcoal.',
    microFallback: 'Soft thermal bands deepen in color with a mild gloss increase.',
    hosiery: 'HOSIERY: Black thigh-high stockings with crimson welt. 2-denier T=0.985 with silicone stay-up band.',
  },
  {
    name: '265-microled-fiber-backchain',
    scene: 'Smoked mirror ceiling reflects the candle cylinders into a grid.',
    geometry: 'Microdress with low open back and thin straps; open sides linked by a micro-LED fiber chain; ultra-low scoop neckline stopping just above the bust line; a narrow sheer illusion insert drops to the upper abdomen for support. Upper-thigh hemline 32-34cm.',
    material: 'Matte base with micro-LED fiber chain and seam accents.',
    materialFallback: 'Matte base with tiny light points along seams and chain links.',
    micro: 'MICRO-LED FIBERS: pinpoint emitters align along seams and chain links with no ambient spill; points show crisp bloom and slight sensor bleed at edges.',
    microFallback: 'Pinpoint light nodes with crisp bloom and slight edge bleed.',
    hosiery: 'HOSIERY: Black thigh-high stockings with electric-blue welt. 2-denier T=0.985 with silicone stay-up band.',
  },
  {
    name: '266-photoelastic-strap-corset',
    scene: 'Neon sign reflection smears along the polished bar edge.',
    geometry: 'Corset microdress with open back to the waist; transparent strap harness across the midriff; straight neckline just below collarbones with an elongated center keyhole to the upper abdomen, backed by sheer mesh. Upper-thigh hemline 32-34cm.',
    material: 'Satin corset base with clear elastic harness straps.',
    materialFallback: 'Satin corset base with simple clear straps.',
    micro: 'CLEAR HARNESS: subtle rainbow stress sheen at load points, crisp edge highlights, and faint casting flow lines.',
    microFallback: 'Clear straps with small edge highlights and very faint stress sheen.',
    hosiery: 'HOSIERY: Black thigh-high stockings with graphite welt. 2-denier T=0.985 with silicone stay-up band.',
  },
  {
    name: '267-superhydrophobic-slit-silk',
    scene: 'Amber bottle wall glow reflects in the bar’s black marble surface.',
    geometry: 'Silk microdress with diagonal front slit and open back to the waist; thin straps; ultra-low scoop neckline stopping just above the bust line; a narrow sheer illusion insert drops to the upper abdomen for support. Upper-thigh hemline 32-34cm.',
    material: 'Superhydrophobic silk with bead formation.',
    materialFallback: 'Silk with visible water beads along seams.',
    micro: 'WATER BEADS: near-perfect spheres form along seams, acting as micro-lenses with bright hotspots; beads roll and pool at the hemline.',
    microFallback: 'Water beads act as tiny lenses with bright hotspots along seams.',
    hosiery: 'HOSIERY: Black thigh-high stockings with satin welt. 2-denier T=0.985 with silicone stay-up band.',
  },
  {
    name: '268-metaweave-interference',
    scene: 'Brass lattice truss creates repeating shadow grids across the bar.',
    geometry: 'Microdress with open back to the waist and high side cutouts; wide underbust aperture and low square neckline at the upper bust line with an elongated center keyhole to the upper abdomen with sheer mesh backing. Upper-thigh hemline 32-34cm.',
    material: 'Dual-layer metaweave over a matte base.',
    materialFallback: 'Dual-layer fine weave over a matte base.',
    micro: 'INTERFERENCE WEAVE: slight layer offset creates high-frequency moire shimmer; alignment zones show bright interference bands, misalignment yields diffuse sparkle noise.',
    microFallback: 'Weave layers create moire shimmer and small sparkle noise.',
    hosiery: 'HOSIERY: Black thigh-high stockings with prism welt. 2-denier T=0.985 with silicone stay-up band.',
  },
  {
    name: '269-tribo-mechano-chain',
    scene: 'LED bottle wall flickers subtly, adding cool fill.',
    geometry: 'Microdress with open sides bridged by chain links; open back to the waist; ultra-low scoop neckline stopping just above the bust line; a narrow sheer illusion insert drops to the upper abdomen for support. Upper-thigh hemline 32-34cm.',
    material: 'Satin base with tribo + mechanoluminescent chain links.',
    materialFallback: 'Satin base with chain links that sparkle under motion.',
    micro: 'TRIBO/MECHANO LINKS: friction at link joints emits tiny light flashes; stretch-induced microcapsules glow faintly under tension. Micro-vibration blur appears on fast-swinging links.',
    microFallback: 'Chain links sparkle with brief flashes; slight motion blur at joints.',
    hosiery: 'HOSIERY: Black thigh-high stockings with gunmetal welt. 2-denier T=0.985 with silicone stay-up band.',
  },
  {
    name: '270-acousto-optic-iris-drape',
    scene: 'Kinetic brass iris overhead throws moving specular highlights across the room.',
    geometry: 'One-shoulder microdress with open back to the waist and a narrow side cutout; soft drape at the hip; low angled neckline at the upper bust line with an elongated center keyhole to the upper abdomen with sheer mesh backing. Upper-thigh hemline 32-34cm.',
    material: 'Acousto-optic thin film over satin base.',
    materialFallback: 'Thin film over satin with subtle ripple highlights.',
    micro: 'ACOUSTO-OPTIC FILM: standing waves create ripple-like refractive bands that shift with subtle motion; specular streaks show gentle waviness as the film vibrates.',
    microFallback: 'Subtle ripple bands shift with motion; specular streaks show gentle waviness.',
    hosiery: 'HOSIERY: Black thigh-high stockings with sapphire welt. 2-denier T=0.985 with silicone stay-up band.',
  },
];

const s = parseInt(process.argv[3] || '0');
const e = parseInt(process.argv[4] || String(concepts.length));
const results = [];

const existingFiles = await fs.readdir(OUTPUT_DIR).catch(() => []);
const existingNums = new Set(existingFiles.filter(f => f.endsWith('.png')).map(f => parseInt(f.split('-')[0])));

console.log(`\n=== V24 APEX - Two-pass, multi-turn refinement ===`);
console.log(`Range: ${s + 1}-${e} | Input: ${path.basename(INPUT_IMAGE)}`);
console.log(`Output: ${OUTPUT_DIR}`);
console.log(`Already generated: ${existingNums.size} | Skipping: [${[...existingNums].sort((a,b)=>a-b).join(',')} ]\n`);

for (let i = s; i < Math.min(e, concepts.length); i++) {
  const conceptNum = i + 251;
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
console.log('V24 APEX RESULTS');
console.log(`${'='.repeat(60)}`);
const ok = results.filter(r => r.ok);
console.log(`Success: ${ok.length}/${results.length}`);
results.forEach(r => console.log(`  ${r.ok ? 'OK' : '!!'} ${r.name}${r.err ? ': ' + r.err : ''}`));
console.log(`\nOutput: ${OUTPUT_DIR}`);

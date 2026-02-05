#!/usr/bin/env node

/**
 * V21 APEX - Two-pass, multi-turn refinement for max photorealism
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
const OUTPUT_DIR = process.env.OUTPUT_DIR || path.join(process.env.HOME, 'nanobanana-output', 'vegas-v21-apex');
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

const LIGHT_BLOCK = `3D GLOBAL ILLUMINATION LIGHT TRANSPORT: Primary overhead recessed tungsten halogen track spots at 2800K create hard directional pools with sharp penumbral edges (no diffusion). Secondary neon signage at ~4500K casts saturated colored spill with hard boundaries following inverse-square falloff I=Phi/(4*pi*r^2). Tertiary LED bottle wall at 3-stop underexposure provides faint cool fill. Candle cylinders at ~1900K add localized warm pinprick highlights. Exit sign LED at ~6500K adds a faint green-blue edge cast at frame periphery. Steep 4-stop luminance gradient from bar surface to deep booths. NO supplemental fill light - deep unrecoverable shadows on shadow-side at 5+ stops below key creating true black zero detail. Mixed color temperature: 2800K tungsten warm on skin vs 4500K neon contamination. Multi-bounce warm interreflection from black marble bar adds ~300K to indirect shadow fill. Water-channel caustics flicker across bar lip from overhead spot refraction through shallow ripples. Ambient occlusion darkening at body-bar contact zones. Volumetric light scatter through atmospheric haze particles.`;

const SKIN_BLOCK = `SKIN BIO-OPTICAL RENDERING: Monte Carlo subsurface scattering 3-layer epidermis-dermis-hypodermis. Melanin mu_a=6.6*C_mel*(lambda/500nm)^(-3.33) varying 0.01-0.05 across body regions. HbO2 absorption 542nm 576nm warm flush cheeks earlobes decolletage knuckles. Hb blue-purple undertone temples inner wrists venous return. Hypodermis forward-scatter g=0.85 translucent backlit glow ear helices nostril edges. Real unretouched skin: visible pores nasal ala cheeks, expression lines forehead periorbital, zero smoothing. Sebaceous T-zone sheen forehead nose chin irregular specular patches. Vellus hair forearms jawline catching rim light as bright fiber strands. Light perspiration upper lip temples micro-specular water droplets. Preserve face bone structure eye color expression identical.`;

const NO_TOUCH_BLOCK = `SUBJECT IS SOLO: No other people touching or overlapping her. No extra arms or hands near her shoulders or body. Keep both shoulders clear. Background patrons, if present, are distant and fully separated.`;

const IMPERFECTIONS_BLOCK = `RAW PHOTOGRAPHIC IMPERFECTIONS: ISO 3200 grain visible in shadows. Motion blur fingertips 1/125s. Flyaway hair catching backlight as soft bright streaks. Background neon bokeh as large soft colored discs. Foreground glass edge refraction blur. Faint lens flare veiling glare and hexagonal ghost from brightest neon or candle highlight. Crumpled napkin bar surface. Condensation ring cold glass. Micro dust shadow upper corner as faint dark circle. Barrel distortion pulling straight lines at edges. Chromatic aberration: lateral CA 0.5px red-cyan fringe at frame edges on high-contrast boundary. Sensor bloom: bright specular highlights bleeding 2-3px beyond physical boundary into adjacent pixels. Acoustic dampener vibration: faint micro-shake from mirror mechanism creating 0.5px directional smear on point sources. No retouching no color grading - straight RAW with WB only. Preserve face identical.`;

const SCENE_BASE = `EVENT-DRIVEN SPEAKEASY SETTING (FIRST PRINCIPLES): Under-Strip Vault Lounge hidden below the boulevard. Black marble bar with mirrored underlip; smoked mirror ceiling; brass lattice truss; LED bottle wall; real neon signage; suspended candle cylinders; shallow water channel behind the bar generating caustic flicker; wet stone floor near entry; visible EXIT sign and sprinkler heads; bar mats, speed rail, garnish station, POS glow; discreet VIP rope stanchions; low haze in the room.`;

function buildPromptPassA(concept, expression, fallback = false) {
  const material = fallback ? concept.materialFallback : concept.material;
  return `Generate an image of this photograph edited into an ultra-raw real-life Vegas speakeasy cocktail bar photograph indistinguishable from an unretouched candid shot from a real night out. Raw documentary nightlife photography. Preserve exact identity, face, bone structure, eyes, nose, mouth, and age. Keep pose, framing, and expression consistent: ${expression}. Only change outfit and environment as described. Avoid retouching.

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
  if (!lower.includes('36-38cm') && !lower.includes('36cm')) {
    console.log(`WARN: ${label} missing explicit hemline 36-38cm anchor.`);
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
    name: '191-electrowetting-cascade-open-sides',
    scene: 'VIP rope stanchions and a discreet security post near the entry, soft reflections on wet stone floor.',
    geometry: 'Black satin microdress with a high halter neckline, fully open back to the waist, and extreme side cutouts bridged by micro-chain links at the ribcage and hip. Low scoop neckline ending just above the bust line with full coverage. Upper-thigh hemline 36-38cm.',
    material: 'Satin base for clean specular roll; embedded electrowetting microchannels trace the torso.',
    materialFallback: 'Satin base with clear microchannels that carry tiny moving droplets.',
    micro: 'ELECTROWETTING MICROCHANNELS: applied field lowers contact angle, causing micro-droplets to spread and merge into glossy beads that slide along channels. Beads show sharp specular hotspots, thin meniscus shadows, and faint refractive halos.',
    microFallback: 'Moving glossy droplets slide and merge in thin channels, with meniscus shadows and small specular hotspots.',
    hosiery: 'HOSIERY: Black thigh-high stockings with gunmetal welt. 4-denier T=0.97.',
  },
  {
    name: '192-magnetoelastic-rib-cage',
    scene: 'Back-bar POS terminal glow and receipt printer spill a faint cool edge light.',
    geometry: 'Sculpted microdress with open back to the waist and vertical side cutouts up to the ribcage; narrow underbust aperture and low square neckline at upper bust line with full coverage. Upper-thigh hemline 36-38cm.',
    material: 'Matte-black base with magnetoelastic rib bands that stiffen under nearby field sources.',
    materialFallback: 'Matte base with reinforced elastic ribs that alternate between taut and relaxed.',
    micro: 'MAGNETOELASTIC RIBS: field-induced stiffening creates alternating taut and relaxed bands; taut zones show tight specular ridges while relaxed zones show soft drape. Micro-strain lines appear at anchor points.',
    microFallback: 'Rib bands alternate tight and soft, with fine strain lines and crisp highlights on taut sections.',
    hosiery: 'HOSIERY: Black thigh-high stockings with graphite welt. 4-denier T=0.97.',
  },
  {
    name: '193-acousto-optic-fringe-halter',
    scene: 'Ice bucket condensation and crystal coupe reflections add tiny specular points on the bar.',
    geometry: 'Halter microdress with a fully open back and high side cutouts; crystal fringe at hemline and a low scoop neckline ending just above the bust line with full coverage. Upper-thigh hemline 36-38cm.',
    material: 'Matte base with acousto-optic fringe system.',
    materialFallback: 'Matte base with crystal fringe that sways and sparkles.',
    micro: 'ACOUSTO-OPTIC FRINGE: standing-wave vibration drives synchronized oscillation; bead collisions create brief sparkle flashes and tiny caustic dots on skin. Fringe lag shows 0.2–0.5s phase delay after motion.',
    microFallback: 'Fringe beads sway with delayed motion and produce short sparkle flashes at collisions.',
    hosiery: 'HOSIERY: Black thigh-high stockings with crystal welt. 4-denier T=0.97.',
  },
  {
    name: '194-liquid-crystal-elastomer-slit',
    scene: 'Smoked mirror ceiling doubles candle cylinders into repeating rows.',
    geometry: 'One-shoulder microdress with a diagonal front slit and open back to the waist; narrow side cutout and low angled neckline to upper bust line with full coverage. Upper-thigh hemline 36-38cm.',
    material: 'Liquid-crystal elastomer panels bonded to a satin substrate.',
    materialFallback: 'Iridescent elastomer panels bonded to satin.',
    micro: 'LCE DOMAINS: strain shifts alignment, producing angle-dependent iridescent bands that compress at the waist and relax at the hip. Micro-creases produce tight highlight bands.',
    microFallback: 'Iridescent bands shift with tension; tight creases create bright highlight streaks.',
    hosiery: 'HOSIERY: Black thigh-high stockings with sapphire welt. 4-denier T=0.97.',
  },
  {
    name: '195-photonic-microprism-harness',
    scene: 'Neon signage creates soft color spill across booths and the bar edge.',
    geometry: 'Microdress with low open back and open sides bridged by a thin harness over the midriff; low scoop neckline ending just above the bust line with full coverage. Upper-thigh hemline 36-38cm.',
    material: 'Satin base with photonic microprism harness.',
    materialFallback: 'Satin base with reflective microprism harness.',
    micro: 'MICROPRISM HARNESS: prism cells return light to source, creating intense pinpoint hotspots with sharp falloff. Scuffed zones break highlights into irregular patches.',
    microFallback: 'Harness sparkles with small directional hotspots and uneven scuffed patches.',
    hosiery: 'HOSIERY: Black thigh-high stockings with metallic welt. 4-denier T=0.97.',
  },
  {
    name: '196-thermochromic-iris-cutout',
    scene: 'Water-channel caustics flicker across the bar lip and lower wall.',
    geometry: 'Strapless microdress with large side cutouts and open back to the waist; low straight neckline just below collarbones. Upper-thigh hemline 36-38cm.',
    material: 'Thermochromic film over satin base.',
    materialFallback: 'Heat-reactive film over satin base.',
    micro: 'THERMOCHROMIC FILM: heat blooms form soft concentric gradients around waist and hip contact zones; warm regions shift from charcoal to deep burgundy with slightly increased gloss.',
    microFallback: 'Heat blooms create soft color shifts and mild gloss changes around the waist.',
    hosiery: 'HOSIERY: Black thigh-high stockings with burgundy welt. 4-denier T=0.97.',
  },
  {
    name: '197-graphene-lace-suspension',
    scene: 'Brass lattice truss casts geometric shadow bands across the booths.',
    geometry: 'Lace microdress with thin straps, open back to the waist, and high side cutouts; low scoop neckline ending just above the bust line with full coverage. Upper-thigh hemline 36-38cm.',
    material: 'Graphene-infused lace overlay with matte structural panels.',
    materialFallback: 'Fine lace overlay with matte structural panels.',
    micro: 'GRAPHENE LACE: conductive filaments create faint directional sheen; lace edges show crisp glints, negative spaces reveal skin with clean contrast and subtle shadow spill.',
    microFallback: 'Lace edges glint; open lace spacing shows clean negative space with soft shadow spill.',
    hosiery: 'HOSIERY: Black thigh-high stockings with matte welt. 4-denier T=0.97.',
  },
  {
    name: '198-quantum-dot-veil-bridges',
    scene: 'Neon spill paints soft color on the smoked mirror ceiling.',
    geometry: 'Black satin microdress with open sides linked by micro-chain bridges; low open back; low scoop neckline ending just above the bust line with full coverage. Upper-thigh hemline 36-38cm.',
    material: 'Sheer overlay embedded with quantum-dot luminophores.',
    materialFallback: 'Sheer overlay with tiny luminous specks along seams.',
    micro: 'QUANTUM-DOT VEIL: micro-dots convert stray UV to warm red pinpricks; dots cluster along seams forming faint constellation bands. Overlay shows soft parallax over the satin base.',
    microFallback: 'Tiny warm specks cluster along seams; overlay shows subtle parallax over the base.',
    hosiery: 'HOSIERY: Black thigh-high stockings with crimson welt. 4-denier T=0.97.',
  },
  {
    name: '199-plasmonic-foil-tension',
    scene: 'Amber liquor wall glows behind the bar, reflecting in black marble.',
    geometry: 'Metallic foil microdress with a narrow underbust cutout and open back to the waist; low square neckline to upper bust line with full coverage. Upper-thigh hemline 36-38cm.',
    material: 'Plasmonic foil laminate under tension.',
    materialFallback: 'Metallic foil laminate under tension with crisp highlights.',
    micro: 'PLASMONIC FOIL: resonance peaks intensify warm glints at grazing angles; micro-crack networks fragment highlights into small islands; clearcoat orange-peel adds fine sparkle noise.',
    microFallback: 'Warm glints fragment into small highlight islands with fine sparkle texture.',
    hosiery: 'HOSIERY: Black thigh-high stockings with gold welt. 4-denier T=0.97.',
  },
  {
    name: '200-auxetic-microgrid-expose',
    scene: 'LED bottle wall adds faint cool fill to the scene.',
    geometry: 'Microdress with open back to the waist and an auxetic microgrid midriff cage; high-cut sides and low scoop neckline ending just above the bust line with full coverage. Upper-thigh hemline 36-38cm.',
    material: 'Matte base with auxetic microgrid cage.',
    materialFallback: 'Matte base with geometric microgrid cage.',
    micro: 'AUXETIC GRID: re-entrant cells expand laterally under tension, opening geometric windows; grid ribs cast sharp micro-shadows and slight edge curl.',
    microFallback: 'Microgrid cells open under tension; ribs cast crisp small shadows.',
    hosiery: 'HOSIERY: Black thigh-high stockings with graphite welt. 4-denier T=0.97.',
  },
  {
    name: '201-electrochromic-lamella-spine',
    scene: 'Blue-violet spill grazes the smoked mirror ceiling.',
    geometry: 'Panelled microdress with low open back; lamella side panels and a narrow spine opening; low straight neckline below collarbones. Upper-thigh hemline 36-38cm.',
    material: 'Electrochromic lamella panels bonded to a matte base.',
    materialFallback: 'Tint-shifting lamella panels bonded to a matte base.',
    micro: 'ELECTROCHROMIC LAMELLAE: panels shift from smoke to cobalt in stepped gradients; crisp refraction at panel edges creates fine bright seams.',
    microFallback: 'Panel tint shifts in steps; edges show thin bright seams.',
    hosiery: 'HOSIERY: Black thigh-high stockings with cobalt welt. 4-denier T=0.97.',
  },
  {
    name: '202-hydrogel-microlens-sheers',
    scene: 'Candle cylinders produce warm pools with deep shadow falloff.',
    geometry: 'Sheer-panel microdress with open back to the waist and narrow side cutouts; low scoop neckline ending just above the bust line with full coverage. Upper-thigh hemline 36-38cm.',
    material: 'Hydrogel microlens overlay on sheer panels.',
    materialFallback: 'Sheer panels with tiny bead-like lenses.',
    micro: 'MICROLENS HYDROGEL: bead-like lenses magnify highlights into tiny luminous orbs; edge meniscus lines create thin dark rings. Sheer panels show soft halo scatter around lens clusters.',
    microFallback: 'Tiny lens beads create bright points and soft halo scatter.',
    hosiery: 'HOSIERY: Nude thigh-high stockings with pearl welt. 4-denier T=0.97.',
  },
  {
    name: '203-viscoelastic-crystal-cowl',
    scene: 'Low haze diffuses neon into soft bokeh.',
    geometry: 'Microdress with dramatic cowl back and open sides linked by fine straps; low scoop neckline ending just above the bust line with full coverage. Upper-thigh hemline 36-38cm.',
    material: 'Satin base with viscoelastic crystal strands at cowl edge.',
    materialFallback: 'Satin base with crystal strands at the cowl edge.',
    micro: 'VISCOELASTIC STRANDS: delayed motion lag and damped oscillation; micro-collisions produce brief sparkle flashes and tiny caustic dots on skin.',
    microFallback: 'Crystal strands sway with delayed lag and produce small sparkle flashes.',
    hosiery: 'HOSIERY: Black thigh-high stockings with prism welt. 4-denier T=0.97.',
  },
  {
    name: '204-phase-change-banded-satin',
    scene: 'Glass reflections ripple across the bar surface.',
    geometry: 'Satin microdress with open back to the waist and asymmetric side cutout; low square neckline to upper bust line with full coverage. Upper-thigh hemline 36-38cm.',
    material: 'Phase-change coated satin with heat-band response.',
    materialFallback: 'Heat-reactive satin with soft tonal bands.',
    micro: 'PCM BANDS: thermal gradients form soft rings around waist and hip; warm bands deepen to crimson with increased gloss, cool zones remain charcoal.',
    microFallback: 'Soft thermal bands deepen in color with a mild gloss increase.',
    hosiery: 'HOSIERY: Black thigh-high stockings with crimson welt. 4-denier T=0.97.',
  },
  {
    name: '205-microled-fiber-backchain',
    scene: 'Smoked mirror ceiling reflects the candle cylinders into a grid.',
    geometry: 'Microdress with low open back and thin straps; open sides linked by a micro-LED fiber chain; low scoop neckline ending just above the bust line with full coverage. Upper-thigh hemline 36-38cm.',
    material: 'Matte base with micro-LED fiber chain and seam accents.',
    materialFallback: 'Matte base with tiny light points along seams and chain links.',
    micro: 'MICRO-LED FIBERS: pinpoint emitters align along seams and chain links with no ambient spill; points show crisp bloom and slight sensor bleed at edges.',
    microFallback: 'Pinpoint light nodes with crisp bloom and slight edge bleed.',
    hosiery: 'HOSIERY: Black thigh-high stockings with electric-blue welt. 4-denier T=0.97.',
  },
  {
    name: '206-photoelastic-strap-corset',
    scene: 'Neon sign reflection smears along the polished bar edge.',
    geometry: 'Corset microdress with open back to the waist; transparent strap harness across the midriff; low straight neckline below collarbones. Upper-thigh hemline 36-38cm.',
    material: 'Satin corset base with clear elastic harness straps.',
    materialFallback: 'Satin corset base with simple clear straps.',
    micro: 'CLEAR HARNESS: subtle rainbow stress sheen at load points, crisp edge highlights, and faint casting flow lines.',
    microFallback: 'Clear straps with small edge highlights and very faint stress sheen.',
    hosiery: 'HOSIERY: Black thigh-high stockings with graphite welt. 4-denier T=0.97.',
  },
  {
    name: '207-superhydrophobic-slit-silk',
    scene: 'Amber bottle wall glow reflects in the bar’s black marble surface.',
    geometry: 'Silk microdress with diagonal front slit and open back to the waist; thin straps; low scoop neckline ending just above the bust line with full coverage. Upper-thigh hemline 36-38cm.',
    material: 'Superhydrophobic silk with bead formation.',
    materialFallback: 'Silk with visible water beads along seams.',
    micro: 'WATER BEADS: near-perfect spheres form along seams, acting as micro-lenses with bright hotspots; beads roll and pool at the hemline.',
    microFallback: 'Water beads act as tiny lenses with bright hotspots along seams.',
    hosiery: 'HOSIERY: Black thigh-high stockings with satin welt. 4-denier T=0.97.',
  },
  {
    name: '208-metaweave-interference',
    scene: 'Brass lattice truss creates repeating shadow grids across the bar.',
    geometry: 'Microdress with open back to the waist and high side cutouts; narrow underbust aperture and low square neckline to upper bust line with full coverage. Upper-thigh hemline 36-38cm.',
    material: 'Dual-layer metaweave over a matte base.',
    materialFallback: 'Dual-layer fine weave over a matte base.',
    micro: 'INTERFERENCE WEAVE: slight layer offset creates high-frequency moire shimmer; alignment zones show bright interference bands, misalignment yields diffuse sparkle noise.',
    microFallback: 'Weave layers create moire shimmer and small sparkle noise.',
    hosiery: 'HOSIERY: Black thigh-high stockings with prism welt. 4-denier T=0.97.',
  },
  {
    name: '209-tribo-mechano-chain',
    scene: 'LED bottle wall flickers subtly, adding cool fill.',
    geometry: 'Microdress with open sides bridged by chain links; open back to the waist; low scoop neckline ending just above the bust line with full coverage. Upper-thigh hemline 36-38cm.',
    material: 'Satin base with tribo + mechanoluminescent chain links.',
    materialFallback: 'Satin base with chain links that sparkle under motion.',
    micro: 'TRIBO/MECHANO LINKS: friction at link joints emits tiny light flashes; stretch-induced microcapsules glow faintly under tension. Micro-vibration blur appears on fast-swinging links.',
    microFallback: 'Chain links sparkle with brief flashes; slight motion blur at joints.',
    hosiery: 'HOSIERY: Black thigh-high stockings with gunmetal welt. 4-denier T=0.97.',
  },
  {
    name: '210-acousto-optic-iris-drape',
    scene: 'Kinetic brass iris overhead throws moving specular highlights across the room.',
    geometry: 'One-shoulder microdress with open back to the waist and a narrow side cutout; soft drape at the hip; low angled neckline to upper bust line with full coverage. Upper-thigh hemline 36-38cm.',
    material: 'Acousto-optic thin film over satin base.',
    materialFallback: 'Thin film over satin with subtle ripple highlights.',
    micro: 'ACOUSTO-OPTIC FILM: standing waves create ripple-like refractive bands that shift with subtle motion; specular streaks show gentle waviness as the film vibrates.',
    microFallback: 'Subtle ripple bands shift with motion; specular streaks show gentle waviness.',
    hosiery: 'HOSIERY: Black thigh-high stockings with sapphire welt. 4-denier T=0.97.',
  },
];

const s = parseInt(process.argv[3] || '0');
const e = parseInt(process.argv[4] || String(concepts.length));
const results = [];

const existingFiles = await fs.readdir(OUTPUT_DIR).catch(() => []);
const existingNums = new Set(existingFiles.filter(f => f.endsWith('.png')).map(f => parseInt(f.split('-')[0])));

console.log(`\n=== V21 APEX - Two-pass, multi-turn refinement ===`);
console.log(`Range: ${s + 1}-${e} | Input: ${path.basename(INPUT_IMAGE)}`);
console.log(`Output: ${OUTPUT_DIR}`);
console.log(`Already generated: ${existingNums.size} | Skipping: [${[...existingNums].sort((a,b)=>a-b).join(',')} ]\n`);

for (let i = s; i < Math.min(e, concepts.length); i++) {
  const conceptNum = i + 191;
  if (existingNums.has(conceptNum)) {
    console.log(`SKIP [${conceptNum}/210] ${concepts[i].name} (already exists)`);
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
console.log('V21 APEX RESULTS');
console.log(`${'='.repeat(60)}`);
const ok = results.filter(r => r.ok);
console.log(`Success: ${ok.length}/${results.length}`);
results.forEach(r => console.log(`  ${r.ok ? 'OK' : '!!'} ${r.name}${r.err ? ': ' + r.err : ''}`));
console.log(`\nOutput: ${OUTPUT_DIR}`);

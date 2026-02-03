#!/usr/bin/env node

/**
 * V18 APEX - Two-pass, multi-turn refinement for max photorealism
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
const OUTPUT_DIR = process.env.OUTPUT_DIR || path.join(process.env.HOME, 'nanobanana-output', 'vegas-v18-apex');
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
  if (!lower.includes('42-44cm') && !lower.includes('42cm')) {
    console.log(`WARN: ${label} missing explicit hemline 42-44cm anchor.`);
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
    name: '131-electrowetting-microfluidic-cutout',
    attire: 'She wears a black satin microdress with a high halter neckline, fully open back to the waist, and extreme side cutouts connected by micro-chain links. Upper-thigh hemline 42-44cm.',
    scene: 'Obsidian Skybridge speakeasy cocktail bar: glass floor over neon city lights, black marble bar, smoked mirror ceiling, brass lattice, suspended candle cylinders, faint blue-violet neon spill, slow haze, crystal glassware with condensation and caustic flicker.',
    fabric: 'ELECTROWETTING MICROFLUIDICS: transparent microchannels trace the torso; droplets slide and merge under electrowetting, forming moving glossy beads with specular hotspots and meniscus shadows. Satin base shows smooth dual-lobe specular with tight highlight roll-off.',
    hosiery: 'HOSIERY: Black thigh-high stockings with gunmetal welt. 10-denier T=0.86.',
  },
  {
    name: '132-graphene-illusion-cage',
    attire: 'She wears a sculpted mini with translucent graphene-polymer cage panels over the torso, opaque bust and hip panels, and a clean open back scoop. Upper-thigh hemline 42-44cm.',
    scene: 'Obsidian Skybridge speakeasy cocktail bar: black marble bar, smoked mirror ceiling, brass lattice, candle cylinders, faint neon spill, haze.',
    fabric: 'GRAPHENE CAGE: conductive lattice shows anisotropic sheen with faint conductivity bands; edges show crisp specular glints and subtle Moire at overlaps. Opaque panels remain matte to heighten contrast with the translucent cage.',
    hosiery: 'HOSIERY: Black thigh-high stockings with graphite welt. 10-denier T=0.86.',
  },
  {
    name: '133-chiral-nematic-slit',
    attire: 'She wears a one-shoulder mini with a diagonal front slit and a narrow side cutout; back is open to the waist. Upper-thigh hemline 42-44cm.',
    scene: 'Obsidian Skybridge speakeasy cocktail bar: glass floor glow, smoked mirrors, brass lattice, candle cylinders, blue-violet spill, haze.',
    fabric: 'CHIRAL NEMATIC FILM: selective reflection yields sharp angle-dependent color bands with crisp boundaries; band spacing compresses along tension lines. Surface shows tight specular streaks with low diffuse scatter.',
    hosiery: 'HOSIERY: Black thigh-high stockings with sapphire welt. 10-denier T=0.86.',
  },
  {
    name: '134-plasmonic-bubble-foil',
    attire: 'She wears a metallic foil mini with a narrow underbust cutout and a low open back; thin straps. Upper-thigh hemline 42-44cm.',
    scene: 'Obsidian Skybridge speakeasy cocktail bar: black marble bar, amber liquor glow, smoked mirror ceiling, candle cylinders, haze.',
    fabric: 'PLASMONIC MICRO-BUBBLES: nanobubble layers intensify warm glints at grazing angles; micro-crack networks fragment highlights into islands. Clearcoat shows subtle orange-peel texture and tight Fresnel peaks.',
    hosiery: 'HOSIERY: Black thigh-high stockings with gold welt. 10-denier T=0.86.',
  },
  {
    name: '135-metamaterial-vanish-panels',
    attire: 'She wears a strapless mini with large side panels that shift between matte and translucent; open back to the waist. Upper-thigh hemline 42-44cm.',
    scene: 'Obsidian Skybridge speakeasy cocktail bar: brass lattice ceiling, smoked mirrors, candle cylinders, blue-violet spill, haze.',
    fabric: 'ANGLE-DEPENDENT OPACITY METAMATERIAL: panels transition from matte to translucent with small view changes, creating crisp boundary lines and soft silhouettes beneath. Panel seams show sharp specular edges.',
    hosiery: 'HOSIERY: Black thigh-high stockings with graphite welt. 10-denier T=0.86.',
  },
  {
    name: '136-micro-led-fiber-harness',
    attire: 'She wears a black mini with thin straps, a low open back, and a micro-LED fiber harness tracing the torso. Upper-thigh hemline 42-44cm.',
    scene: 'Obsidian Skybridge speakeasy cocktail bar: black marble bar, smoked mirrors, brass lattice, candle cylinders, haze.',
    fabric: 'MICRO-LED FIBERS: embedded fiber strands emit pinpoint light with no scene spill; light points align along seams and harness lines. Base fabric remains matte to emphasize the luminous threads.',
    hosiery: 'HOSIERY: Black thigh-high stockings with electric-blue welt. 10-denier T=0.86.',
  },
  {
    name: '137-piezo-lace-cutout',
    attire: 'She wears a lace mini with high side cutouts and a fully open back; thin straps. Upper-thigh hemline 42-44cm.',
    scene: 'Obsidian Skybridge speakeasy cocktail bar: glass floor glow, brass lattice, candle cylinders, haze.',
    fabric: 'PIEZOELECTRIC LACE: lace filaments emit faint pinprick glow under flex; cutout edges show crisp specular glints. Negative space reveals skin with clean contrast and subtle shadow spill.',
    hosiery: 'HOSIERY: Black thigh-high stockings with matte welt. 10-denier T=0.86.',
  },
  {
    name: '138-phase-change-gradient',
    attire: 'She wears a black satin mini with an open back and asymmetric side cutout. Upper-thigh hemline 42-44cm.',
    scene: 'Obsidian Skybridge speakeasy cocktail bar: smoked mirrors, black marble bar, candle cylinders, faint neon spill, haze.',
    fabric: 'PCM GRADIENT COATING: phase-change microcapsules reveal soft thermal gradients across the waist and hip. Warm zones shift to deep crimson while cooler zones remain charcoal; specular highlights intensify along warm bands.',
    hosiery: 'HOSIERY: Black thigh-high stockings with crimson welt. 10-denier T=0.86.',
  },
  {
    name: '139-superhydrophobic-sheer-sides',
    attire: 'She wears a silk mini with sheer side panels and a low open back; thin straps. Upper-thigh hemline 42-44cm.',
    scene: 'Obsidian Skybridge speakeasy cocktail bar: candle cylinders, smoked mirrors, black marble bar, haze.',
    fabric: 'SUPERHYDROPHOBIC SILK: water beads form perfect spheres with micro-lens highlights; beads roll along seams and gather at panel edges. Silk shows smooth dual-lobe specular under warm candlelight.',
    hosiery: 'HOSIERY: Black thigh-high stockings with satin welt. 10-denier T=0.86.',
  },
  {
    name: '140-prismatic-microgrid-overlay',
    attire: 'She wears a black satin mini with a semi-sheer microgrid overlay, open back to the waist, and high-cut side cutouts. Upper-thigh hemline 42-44cm.',
    scene: 'Obsidian Skybridge speakeasy cocktail bar: neon city glow through glass floor, smoked mirrors, brass lattice, haze.',
    fabric: 'PRISMATIC MICROGRID: microstructured overlay produces subtle refractive shimmer and fine edge glints without full transparency. Grid cells cast tiny geometric shadows across the satin; overlay edges show crisp specular seams.',
    hosiery: 'HOSIERY: Black thigh-high stockings with graphite welt. 10-denier T=0.86.',
  },
  {
    name: '141-electrospun-veil',
    attire: 'She wears an ultra-sheer nanofiber veil mini over a satin base with a low open back and asymmetric side cut. Upper-thigh hemline 42-44cm.',
    scene: 'Obsidian Skybridge speakeasy cocktail bar: smoked mirrors, black marble bar, candle cylinders, haze.',
    fabric: 'ELECTROSPUN NANOFIBERS: sub-micron fibers create volumetric scatter and fine edge glow; veil overlaps produce moire bands. Satin base shows tight specular streaks through the veil.',
    hosiery: 'HOSIERY: Nude thigh-high stockings with pearl welt. 10-denier T=0.86.',
  },
  {
    name: '142-acoustic-standing-wave-fringe',
    attire: 'She wears a halter mini with an open back and crystal fringe at the hem; side cutouts rise to the hipbone. Upper-thigh hemline 42-44cm.',
    scene: 'Obsidian Skybridge speakeasy cocktail bar: brass lattice ceiling, candle cylinders, haze, blue-violet spill.',
    fabric: 'ACOUSTIC FRINGE: low-frequency standing waves induce synchronized fringe oscillation; bead collisions create brief sparkle flashes and micro-caustic dots on skin. Base fabric remains matte to emphasize fringe motion.',
    hosiery: 'HOSIERY: Black thigh-high stockings with crystal welt. 10-denier T=0.86.',
  },
  {
    name: '143-graphene-thermal-map',
    attire: 'She wears a black mini with a narrow underbust cutout and open back; thin straps. Upper-thigh hemline 42-44cm.',
    scene: 'Obsidian Skybridge speakeasy cocktail bar: smoked mirrors, amber liquor glow, candle cylinders, haze.',
    fabric: 'GRAPHENE THERMAL EMISSIVITY: subtle tonal heat map appears across torso; warmer zones show micro-sheen increase. Graphene filaments create faint directional gloss lines across the weave.',
    hosiery: 'HOSIERY: Black thigh-high stockings with graphite welt. 10-denier T=0.86.',
  },
  {
    name: '144-quantum-dot-veil',
    attire: 'She wears a black satin mini with a sheer veil overlay and open sides connected by micro-chain links; open back. Upper-thigh hemline 42-44cm.',
    scene: 'Obsidian Skybridge speakeasy cocktail bar: glass floor glow, smoked mirrors, brass lattice, candle cylinders, haze.',
    fabric: 'QUANTUM-DOT VEIL: micro-dot luminophores convert stray UV to warm red pinpricks across the sheer overlay; dots cluster in seams producing faint constellation bands. Satin base stays neutral and dark.',
    hosiery: 'HOSIERY: Black thigh-high stockings with crimson welt. 10-denier T=0.86.',
  },
  {
    name: '145-magnetorheological-chain-bridges',
    attire: 'She wears a black mini with open sides bridged by chain links; open back to the waist. Upper-thigh hemline 42-44cm.',
    scene: 'Obsidian Skybridge speakeasy cocktail bar: black marble bar, smoked mirrors, candle cylinders, haze.',
    fabric: 'MR-CHAIN LINKS: magnetorheological gel cores in the links stiffen near bar magnets, creating alternating rigid and slack segments. Links show sharp specular glints with micro-vibration blur at the joints.',
    hosiery: 'HOSIERY: Black thigh-high stockings with gunmetal welt. 10-denier T=0.86.',
  },
  {
    name: '146-electrochromic-lamella',
    attire: 'She wears a panelled mini with glass-like lamella side panels and a low open back; thin straps. Upper-thigh hemline 42-44cm.',
    scene: 'Obsidian Skybridge speakeasy cocktail bar: brass lattice, candle cylinders, smoked mirrors, blue-violet spill, haze.',
    fabric: 'ELECTROCHROMIC LAMELLAE: thin panels shift from smoke to deep cobalt in voltage zones, creating stepped gradients. Panel edges show crisp refraction; base fabric remains matte to heighten contrast.',
    hosiery: 'HOSIERY: Black thigh-high stockings with cobalt welt. 10-denier T=0.86.',
  },
  {
    name: '147-auxetic-microgrid-cage',
    attire: 'She wears a black mini with a high halter neckline, open back, and an auxetic microgrid midriff cage. Upper-thigh hemline 42-44cm.',
    scene: 'Obsidian Skybridge speakeasy cocktail bar: glass floor glow, smoked mirrors, brass lattice, candle cylinders, haze.',
    fabric: 'AUXETIC MICROGRID: re-entrant cells expand laterally under tension, opening geometric windows across the midriff. Grid ribs cast sharp micro-shadows; base panels remain matte and deep black.',
    hosiery: 'HOSIERY: Black thigh-high stockings with graphite welt. 10-denier T=0.86.',
  },
  {
    name: '148-volumetric-holo-thread',
    attire: 'She wears a black mini with a low open back and narrow side cutouts; thin straps. Upper-thigh hemline 42-44cm.',
    scene: 'Obsidian Skybridge speakeasy cocktail bar: candle cylinders, black marble bar, smoked mirrors, haze.',
    fabric: 'VOLUMETRIC HOLO THREAD: holographic threads create parallax shimmer with color-separated glints; interference bands shift with movement. Threads show crisp spectral edges against the matte base.',
    hosiery: 'HOSIERY: Black thigh-high stockings with prism welt. 10-denier T=0.86.',
  },
  {
    name: '149-phase-change-crystal-cowl',
    attire: 'She wears a black mini with a dramatic cowl back and open sides connected by fine straps. Upper-thigh hemline 42-44cm.',
    scene: 'Obsidian Skybridge speakeasy cocktail bar: smoked mirrors, candle cylinders, black marble bar, haze.',
    fabric: 'PCM CRYSTAL COWL: phase-change coating creates tonal gradients along the cowl folds; crystal strands at the edge show delayed motion lag and micro-collisions with sparkle flashes.',
    hosiery: 'HOSIERY: Black thigh-high stockings with silver welt. 10-denier T=0.86.',
  },
  {
    name: '150-microprism-retro-slit',
    attire: 'She wears a retroreflective mini with a high side cut and fully open back; thin straps. Upper-thigh hemline 42-44cm.',
    scene: 'Obsidian Skybridge speakeasy cocktail bar: brass lattice ceiling, smoked mirrors, candle cylinders, blue-violet spill, haze.',
    fabric: 'MICROPRISM RETROREFLECTIVE: prism array returns light to source, producing intense hotspots and sharp falloff. Scuffed zones reduce reflectance in patches; cut edges show sharp specular seams.',
    hosiery: 'HOSIERY: Black thigh-high stockings with metallic welt. 10-denier T=0.86.',
  },
];

const s = parseInt(process.argv[3] || '0');
const e = parseInt(process.argv[4] || String(concepts.length));
const results = [];

const existingFiles = await fs.readdir(OUTPUT_DIR).catch(() => []);
const existingNums = new Set(existingFiles.filter(f => f.endsWith('.png')).map(f => parseInt(f.split('-')[0])));

console.log(`\n=== V18 APEX - Two-pass, multi-turn refinement ===`);
console.log(`Range: ${s + 1}-${e} | Input: ${path.basename(INPUT_IMAGE)}`);
console.log(`Output: ${OUTPUT_DIR}`);
console.log(`Already generated: ${existingNums.size} | Skipping: [${[...existingNums].sort((a,b)=>a-b).join(',')} ]\n`);

for (let i = s; i < Math.min(e, concepts.length); i++) {
  const conceptNum = i + 131;
  if (existingNums.has(conceptNum)) {
    console.log(`SKIP [${conceptNum}/150] ${concepts[i].name} (already exists)`);
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
console.log('V18 APEX RESULTS');
console.log(`${'='.repeat(60)}`);
const ok = results.filter(r => r.ok);
console.log(`Success: ${ok.length}/${results.length}`);
results.forEach(r => console.log(`  ${r.ok ? 'OK' : '!!'} ${r.name}${r.err ? ': ' + r.err : ''}`));
console.log(`\nOutput: ${OUTPUT_DIR}`);

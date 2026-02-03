#!/usr/bin/env node

/**
 * V15 APEX - Two-pass, multi-turn refinement for max photorealism
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
const OUTPUT_DIR = process.env.OUTPUT_DIR || path.join(process.env.HOME, 'nanobanana-output', 'vegas-v15-apex');
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
    name: '71-quantum-dot-sequin-halter-open-back',
    attire: 'She wears a black satin halter mini with a mod-V front and fully open back to the waistline. Upper-thigh hemline 48-50cm. The front is covered in a mosaic of micro-sequins arranged in panels.',
    scene: 'VIP lounge: dark wood, brass rail, chandelier sparkle, bar glow, low haze, coupe glass condensation.',
    fabric: 'QUANTUM DOT SEQUINS: micro-sequins coated with quantum dots convert UV accent light into saturated warm reds and greens with narrowband emission. Plasmonic nanoparticle underlayers amplify local emission at grazing angles. Sequins pivot on thread with 10-18Hz sparkle under micro-movement; edge scuffs reduce some highlights. Satin base shows smooth dual-lobe specular beneath the mosaic.',
    hosiery: 'HOSIERY: Black thigh-high stockings with thin iridescent welt. 15-denier T=0.76.',
  },
  {
    name: '72-upconversion-phosphor-vinyl-sculpt',
    attire: 'She wears a high-gloss black vinyl mini with a side cutout and one-shoulder strap, open back scoop. Upper-thigh hemline 48-50cm.',
    scene: 'Neon bar: LED signage spill, glass shelves, chrome accents, haze beams.',
    fabric: 'UPCONVERSION PHOSPHOR VINYL: rare-earth micro-particles embedded in clearcoat convert near-IR into visible green-blue micro-glow at high-intensity IR hotspots. Vinyl shows strong Fresnel reflectance with sharp specular streaks; micro-wrinkles at bend zones create tight highlight ridges. Coating thickness variation yields subtle halo bands around bright reflections.',
    hosiery: 'HOSIERY: Black thigh-high stockings with electric-blue welt. 15-denier T=0.76.',
  },
  {
    name: '73-photoelastic-birefringent-mesh-corset',
    attire: 'She wears a translucent polymer corset bodice over a black satin mini skirt, halter neckline, open back. Upper-thigh hemline 48-50cm.',
    scene: 'Art deco lounge: brass fixtures, green marble bar, mirror wall, warm tungsten pools.',
    fabric: 'PHOTOELASTIC MESH: stress-induced birefringence produces faint rainbow isochromatic bands across high-tension zones. Micro-rib mesh yields polarization-dependent sheen; band spacing tightens at waist compression. Satin skirt provides smooth specular roll with seam relief at the waist.',
    hosiery: 'HOSIERY: Black thigh-high stockings with graphite welt. 15-denier T=0.76.',
  },
  {
    name: '74-tribo-mechano-fringe-backless',
    attire: 'She wears a black satin mini with a high halter neck and fully open back, finished with dense crystal fringe at the hem. Upper-thigh hemline 48-50cm.',
    scene: 'Jazz lounge: warm tungsten pools, dark wood, vintage mirror, soft smoke haze.',
    fabric: 'TRIBO + MECHANOLUMINESCENT FRINGE: crystal beads emit tiny flashes at friction contact points; ZnS:Cu microcapsules in the fringe threads emit faint light under stretch and swing. Fringe shows 0.2-0.6s motion lag with micro-collisions; occasional spark twinkles appear at bead contact. Satin base keeps soft dual-lobe specular under warm light.',
    hosiery: 'HOSIERY: Black thigh-high stockings with crystal metallic welt. 15-denier T=0.76.',
  },
  {
    name: '75-electrochromic-el-piped-one-shoulder',
    attire: 'She wears a charcoal satin one-shoulder mini with a low open back and fine electroluminescent piping along the neckline and hem. Upper-thigh hemline 48-50cm.',
    scene: 'Rooftop bar: skyline bokeh, fire pit glow, glass railing, cool night air.',
    fabric: 'ELECTROCHROMIC LAMINATE: thin film shifts from charcoal to deep blue in voltage-activated zones along the torso, creating subtle gradient bands. EL piping emits a thin, uniform line without lighting the environment. Satin base shows smooth highlight roll; seam tension bends the EL line into gentle arcs.',
    hosiery: 'HOSIERY: Black thigh-high stockings with thin electric-blue welt. 15-denier T=0.76.',
  },
  {
    name: '76-aerogel-organza-illusion-drape',
    attire: 'She wears a pale silver organza overlay mini with a satin base and a clean open back line. Upper-thigh hemline 48-50cm.',
    scene: 'Chandelier lounge: crystal light spill, mirrored columns, polished bar, soft haze.',
    fabric: 'AEROGEL-COATED ORGANZA: silica aerogel micro-layer creates extreme forward scattering, producing soft halo edges and milky translucence. Layer overlap yields gentle moire; micro-fiber ends catch rim light as bright filaments. Satin base gives smooth specular core.',
    hosiery: 'HOSIERY: Nude thigh-high stockings with pearl welt. 12-denier T=0.82.',
  },
  {
    name: '77-plasmonic-nanorod-foil-mini',
    attire: 'She wears a gold foil laminate mini with a mod-V neckline and open back scoop. Upper-thigh hemline 48-50cm.',
    scene: 'High-roller bar: chandelier sparkle, brass trim, mahogany reflections, whiskey glow.',
    fabric: 'PLASMONIC NANOROD FOIL: gold nanorod layers create sharp resonance peaks around 530-580nm, intensifying warm glints at grazing angles. Foil micro-cracks at high-stretch zones fragment highlights into small islands. Clearcoat shows subtle orange-peel texture.',
    hosiery: 'HOSIERY: Black thigh-high stockings with gold metallic welt. 15-denier T=0.76.',
  },
  {
    name: '78-phase-change-microcapsule-satin',
    attire: 'She wears a ruby satin mini with an asymmetric drape and open back. Upper-thigh hemline 48-50cm.',
    scene: 'Candlelit bar: warm pools, amber glass, textured stone wall, soft haze.',
    fabric: 'PHASE-CHANGE MICROCAPSULE COAT: microcapsules shift surface reflectance where temperature changes, creating subtle dark-to-bright zones along torso and hip. Satin base provides smooth specular roll; drape follows catenary curves with tension lines at the waist.',
    hosiery: 'HOSIERY: Black thigh-high stockings with ruby metallic welt. 15-denier T=0.76.',
  },
  {
    name: '79-liquid-crystal-elastomer-ribbed',
    attire: 'She wears a black ribbed mini with side cutouts and open back, one-shoulder strap. Upper-thigh hemline 48-50cm.',
    scene: 'Industrial bar: concrete walls, steel accents, bottle backlight, haze.',
    fabric: 'LIQUID CRYSTAL ELASTOMER: alignment domains shift under strain, producing faint iridescent bands along ribs. Rib compression yields alternating highlight valleys; cutout edges show tension lines and slight edge curl. Matte base absorbs light while LCE bands add angle-dependent color.',
    hosiery: 'HOSIERY: Black thigh-high stockings with graphite welt. 15-denier T=0.76.',
  },
  {
    name: '80-photoacoustic-ripple-metallic-film',
    attire: 'She wears a gunmetal metallic mini with a clean open back and thin halter strap. Upper-thigh hemline 48-50cm.',
    scene: 'Neon lounge: laser signage, LED wall gradients, mirror pillars, haze beams.',
    fabric: 'PHOTOACOUSTIC FILM: pulsed light from signage induces micro-acoustic vibrations in thin metallic film, creating 0.5-0.8mm ripple deformation along reflective highlights. Specular streaks show slight waviness; film thickness variation adds soft banding.',
    hosiery: 'HOSIERY: Black thigh-high stockings with gunmetal welt. 15-denier T=0.76.',
  },
  {
    name: '81-carbon-nanotube-velvet-void',
    attire: 'She wears a deep black velvet mini with geometric side cutouts and open back. Upper-thigh hemline 48-50cm.',
    scene: 'Speakeasy cellar: candle clusters, brick arches, mahogany bar, warm haze.',
    fabric: 'NANOTUBE FLOCK VELVET: vertically aligned carbon nanotube flock absorbs nearly all incident light, producing a deep void appearance. Pile edges show a thin rim where stray light grazes fibers; cutout edges create extreme contrast with warm skin. Subtle pile direction causes gentle sheen shifts.',
    hosiery: 'HOSIERY: Black thigh-high stockings with matte welt. 15-denier T=0.76.',
  },
  {
    name: '82-lotus-superhydrophobic-silk-slip',
    attire: 'She wears a navy silk slip mini with thin straps and low open back. Upper-thigh hemline 48-50cm.',
    scene: 'After-hours bar entry: wet stone floor, rain haze near doorway, amber sconces, glass condensation.',
    fabric: 'SUPERHYDROPHOBIC SILK: lotus-effect coating causes water to bead into near-perfect spheres, creating micro-lens highlights across the surface. Beads roll and cluster along seams; wet zones darken slightly while specular clarity increases. Silk retains smooth dual-lobe specular under warm light.',
    hosiery: 'HOSIERY: Black thigh-high stockings with satin welt. 15-denier T=0.76.',
  },
  {
    name: '83-birefringent-silk-polar-sheen',
    attire: 'She wears an ivory silk mini with a halter neckline and open back scoop. Upper-thigh hemline 48-50cm.',
    scene: 'Art deco lounge: brass rail, green marble bar, warm tungsten pools, mirror wall.',
    fabric: 'BIREFRINGENT SILK: polarization-dependent shimmer creates alternating bright and dark zones across folds. Warp-weft anisotropy produces directional sheen bands; fold curvature causes hue shift toward warm pearlescent highlights. Fine weave texture visible at edge light.',
    hosiery: 'HOSIERY: Ivory thigh-high stockings with satin welt. 12-denier T=0.82.',
  },
  {
    name: '84-bragg-microflake-satin-sheath',
    attire: 'She wears a silver satin sheath mini with a clean open back and narrow shoulder straps. Upper-thigh hemline 48-50cm.',
    scene: 'Chandelier lounge: crystal light spill, mirrored columns, polished bar, soft haze.',
    fabric: 'BRAGG MICROFLAKE PIGMENT: dielectric microflakes act as Bragg mirrors, producing angle-dependent color and brightness shifts with sharp spectral edges. Flake alignment yields banded highlight zones; scattered misalignment creates subtle sparkle noise. Satin base keeps soft specular roll.',
    hosiery: 'HOSIERY: Black thigh-high stockings with silver welt. 15-denier T=0.76.',
  },
  {
    name: '85-electrospun-nanofiber-mesh',
    attire: 'She wears a black mesh overlay mini over a satin base, with side cutouts and open back. Upper-thigh hemline 48-50cm.',
    scene: 'Neon bar: LED signage, chrome accents, haze beams, glass shelves.',
    fabric: 'ELECTROSPUN NANOFIBER MESH: sub-micron fibers create soft volumetric scatter and fine edge glow. Mesh parallax over the base yields moire at overlap zones; fiber clumps form tiny dark knots. Satin base shows smooth specular highlights beneath.',
    hosiery: 'HOSIERY: Black thigh-high stockings with matte welt. 15-denier T=0.76.',
  },
  {
    name: '86-gyroid-photonic-crystal-panel',
    attire: 'She wears a midnight blue mini with gyroid photonic panels at the sides and an open back. Upper-thigh hemline 48-50cm.',
    scene: 'VIP lounge: brass rail, leather booths, warm sconces, soft haze.',
    fabric: 'GYROID PHOTONIC CRYSTAL: 3D periodic microstructure yields structural color with sharp angle-dependent hue shifts. Panel edges show crisp color boundaries; internal scattering produces faint depth glow. Base fabric is matte to emphasize photonic panels.',
    hosiery: 'HOSIERY: Black thigh-high stockings with sapphire welt. 15-denier T=0.76.',
  },
  {
    name: '87-microprism-retroreflective-wrap',
    attire: 'She wears a graphite wrap mini with a halter neckline and open back. Upper-thigh hemline 48-50cm.',
    scene: 'Casino corridor bar: chandelier sparkle, marble reflections, brass trim, slot glow spill.',
    fabric: 'MICROPRISM RETROREFLECTIVE: prismatic cells return light to source, producing intense highlight hotspots and sharp falloff. Prism array causes geometric sparkle grid; edge scuffs reduce reflectance in patches. Wrap tension forms diagonal stress lines.',
    hosiery: 'HOSIERY: Black thigh-high stockings with graphite metallic welt. 15-denier T=0.76.',
  },
  {
    name: '88-quantum-dot-el-fiber-optic-cowl',
    attire: 'She wears a black satin mini with a soft cowl back and fine fiber-optic seam accents. Upper-thigh hemline 48-50cm.',
    scene: 'Rooftop bar: skyline bokeh, fire pit glow, glass railing, cool night air.',
    fabric: 'COMPOUND LUMINESCENCE: quantum-dot micro-points along seams convert UV to warm reds; fiber-optic strands emit tiny light points; EL micro-wire embedded along hem provides a thin constant glow. Satin base remains neutral, allowing luminous accents to pop without spill.',
    hosiery: 'HOSIERY: Black thigh-high stockings with thin crimson welt. 15-denier T=0.76.',
  },
  {
    name: '89-thin-film-interference-vinyl-prism',
    attire: 'She wears a high-gloss vinyl mini with side cutouts and open back, one-shoulder strap. Upper-thigh hemline 48-50cm.',
    scene: 'Neon lounge: laser signage, LED gradients, mirror pillars, haze beams.',
    fabric: 'THIN-FILM INTERFERENCE VINYL: multi-layer coating creates sharp rainbow interference bands that shift with angle. High-gloss base yields strong Fresnel highlights; micro-scratch lines break up specular streaks. Cutout edges show slight curl under tension.',
    hosiery: 'HOSIERY: Black thigh-high stockings with iridescent welt. 15-denier T=0.76.',
  },
  {
    name: '90-diffraction-prism-bead-spine',
    attire: 'She wears a black satin mini with a high neck and fully open back, adorned by a prism bead spine cascade from nape to waist. Upper-thigh hemline 48-50cm.',
    scene: 'Art deco bar: brass fixtures, warm tungsten pools, mirror wall, mahogany reflections.',
    fabric: 'PRISM BEAD SPINE: faceted beads produce diffraction rainbows and tiny caustic dots on skin; bead mass creates slight skin compression along spine. Satin base shows smooth specular folds; bead sway adds 0.3-0.6s lag with micro-collisions.',
    hosiery: 'HOSIERY: Black thigh-high stockings with prism metallic welt. 15-denier T=0.76.',
  },
];

const s = parseInt(process.argv[3] || '0');
const e = parseInt(process.argv[4] || String(concepts.length));
const results = [];

const existingFiles = await fs.readdir(OUTPUT_DIR).catch(() => []);
const existingNums = new Set(existingFiles.filter(f => f.endsWith('.png')).map(f => parseInt(f.split('-')[0])));

console.log(`\n=== V15 APEX - Two-pass, multi-turn refinement ===`);
console.log(`Range: ${s + 1}-${e} | Input: ${path.basename(INPUT_IMAGE)}`);
console.log(`Output: ${OUTPUT_DIR}`);
console.log(`Already generated: ${existingNums.size} | Skipping: [${[...existingNums].sort((a,b)=>a-b).join(',')} ]\n`);

for (let i = s; i < Math.min(e, concepts.length); i++) {
  const conceptNum = i + 71;
  if (existingNums.has(conceptNum)) {
    console.log(`SKIP [${conceptNum}/90] ${concepts[i].name} (already exists)`);
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
console.log('V15 APEX RESULTS');
console.log(`${'='.repeat(60)}`);
const ok = results.filter(r => r.ok);
console.log(`Success: ${ok.length}/${results.length}`);
results.forEach(r => console.log(`  ${r.ok ? 'OK' : '!!'} ${r.name}${r.err ? ': ' + r.err : ''}`));
console.log(`\nOutput: ${OUTPUT_DIR}`);

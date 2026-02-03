#!/usr/bin/env node

/**
 * V13 APEX - Two-pass, multi-turn refinement for max photorealism
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
const OUTPUT_DIR = process.env.OUTPUT_DIR || path.join(process.env.HOME, 'nanobanana-output', 'vegas-v13-apex');
const PASSA_DIR = path.join(OUTPUT_DIR, 'passA');
const INPUT_IMAGE = process.argv[2] || '/Users/louisherman/Documents/518355716_10109335899644328_1380496532632646402_n.jpeg';

const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
await fs.mkdir(OUTPUT_DIR, { recursive: true });
await fs.mkdir(PASSA_DIR, { recursive: true });

const expressions = [
  'quiet confidence, slight upward chin tilt, one eyebrow barely raised',
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

const CAMERA_BLOCK = `CAMERA SENSOR PHYSICS: Canon EOS R5 II full-frame 45MP stacked BSI-CMOS sensor 36x24mm active silicon. RF 50mm f/1.2L USM wide open at f/1.2 creating razor-thin 14cm depth-of-field plane focused at 2.2m subject distance. ISO 3200 generating authentic high-ISO luminance noise following Poisson photon-counting statistics sigma=sqrt(N_photons) in shadow regions with SNR=28dB at midtones and visible chroma noise as red-blue channel decorrelation in underexposed zones. Shutter 1/125s allowing slight motion blur on gesturing hands. 759-point dual-pixel phase-detect AF locked precisely on nearest iris with gentle focus roll-off on far shoulder. 10-blade circular aperture producing creamy oval bokeh discs with onion-ring concentric artifact from aspherical element. Barrel distortion 0.8% at close focus distance. Purple fringing 0.3px longitudinal chromatic aberration on maximum-contrast edge transitions at frame corners. BSI stack veiling glare: inter-element scatter reducing shadow contrast 0.3 stops in deep blacks near bright specular sources. Highlight shoulder hue shift: warm-to-magenta cast at sensor clipping boundary visible on brightest neon reflections. White balance tungsten 3200K but mixed venue lighting creates unresolved color temperature casts across different spatial zones. Available light only - absolutely no flash used - crushed blacks where signal falls below sensor noise floor creating true zero detail. Sensor micro-lens array vignetting 0.7 stop at corners. Bayer CFA demosaicing artifact: false color moire at fine repeating fabric textures where spatial frequency approaches Nyquist limit. PDAF banding: faint horizontal stripe pattern in deep shadows from dual-pixel readout phase difference. Raw file 14-bit ADC quantization: visible posterization in smooth shadow gradient regions where bit depth insufficient to encode tonal transitions.`;

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
    name: '31-iridium-liquid-metal-halter-spine-chain',
    attire: 'She wears an iridium liquid-metal halter mini dress with a mirror finish and an open back to the waistline. High sculpted halter neckline, single fine iridium-finish spine chain to a small clasp at the waist. Upper-thigh hemline 48-50cm. The liquid-metal surface warps room reflections.',
    scene: 'Mirror lounge speakeasy: low amber sconces, smoked glass shelves, antique mirror wall with foxed silvering, mahogany bar with wet rings, neon accent spill, coupe glass with condensation, light haze.',
    fabric: 'LIQUID-METAL JERSEY: micro-lamellae embedded in elastic knit yield anisotropic mirror reflectance with directional highlight streaks along curvature. Lamellae pivot under micro-movement producing 6-12Hz shimmer. Iridium spectral reflectance cool silver with faint blue shift at grazing angles. Seam tension forms subtle micro-wrinkles at waist and hip. Spine chain 1.8mm interlocked links act as micro-mirrors throwing pin-point speculars and tiny caustic flecks onto skin. Open back reveals warm skin contrast; chain pressure leaves faint compression lines.',
    hosiery: 'HOSIERY: Black thigh-high stockings with thin iridium metallic welt. 15-denier T=0.76 semi-sheer matte black. Welt catches amber as cool metallic points.',
  },
  {
    name: '32-obsidian-patent-geometric-cutout',
    attire: 'She wears an obsidian black patent leather bodycon mini with geometric side cutouts and a squared neckline. Clean center back zip, upper-thigh hemline 48-50cm. Cutouts reveal warm skin against glossy black.',
    scene: 'High-roller bar: crystal chandelier, glossy black marble, brass rail, amber whiskey tumbler, slot glow spill, velvet rope, low smoke haze.',
    fabric: 'PATENT LEATHER: polyurethane clearcoat over leather. Fresnel reflectance rises to near-total at grazing angles with sharp specular streaks. Micro-crazing and orange-peel texture in clearcoat, faint swirl scuffs from wear. Edge curl and seam puckering at cutout borders under tension. Gloss gradient changes across torso curvature.',
    hosiery: 'HOSIERY: Black thigh-high stockings with thin obsidian satin welt. 15-denier T=0.76 matte black.',
  },
  {
    name: '33-champagne-crystal-fringe-cowl-back',
    attire: 'She wears a champagne satin mini with a low cowl back and dense crystal fringe at the hem. Thin chain straps, upper-thigh hemline 48-50cm. The fringe moves with every step.',
    scene: 'Art deco lounge: brass fixtures, smoked glass bar shelves, warm tungsten pools, reflective terrazzo floor, coupe glass condensation, low jazz stage glow.',
    fabric: 'CRYSTAL FRINGE: 2-3mm faceted glass beads on fine threads; Cauchy dispersion produces spectral fire in highlights. Bead inertia creates 0.3-0.7s motion lag and subtle motion blur at the fringe tips. Fringe weight forms vertical drape lines at the hem and tiny impact sway when she shifts. Satin base shows dual-lobe specular with soft highlight roll.',
    hosiery: 'HOSIERY: Nude thigh-high stockings with champagne metallic welt. 12-denier T=0.82 ultra-sheer.',
  },
  {
    name: '34-oil-slick-lame-one-shoulder-slit',
    attire: 'She wears an oil-slick iridescent lame one-shoulder mini with a high side slit and open back scoop. Upper-thigh hemline 48-50cm, asymmetric neckline and hem.',
    scene: 'Neon rooftop bar: LED strip edges, skyline reflections, fire pit glow, glass railing, breeze moving hair, cocktail with citrus rim.',
    fabric: 'IRIDESCENT LAME: thin-film interference creates angle-dependent hue shifts from teal to magenta. Metallic warp with matte weft yields anisotropic specular streaks. Polarization-dependent color flip at grazing angles. Micro-shear wrinkles around the waist and slit edge add high-frequency shimmer.',
    hosiery: 'HOSIERY: Black thigh-high stockings with oil-slick metallic welt. 15-denier T=0.76 semi-sheer.',
  },
  {
    name: '35-sapphire-sequin-waist-clasp-open-back',
    attire: 'She wears a sapphire sequin mini with V front and fully open back held by a jeweled waist clasp. Upper-thigh hemline 48-50cm. Open back is the centerpiece.',
    scene: 'Casino private gaming room: dark wood, pendant spot, crystal decanter, brass sconce, velvet curtain, soft haze.',
    fabric: 'SAPPHIRE SEQUIN: 4mm sequins pivot-sewn on mesh with 15-20 degree tilt range; stochastic sparkle at 8-20Hz. Sequins show slight tarnish and edge scuffs. Jeweled clasp is prismatic glass n=1.65 throwing rainbow caustics onto lower back. Warm spot light creates one bright zone, rest falls into rich blue shadow.',
    hosiery: 'HOSIERY: Black thigh-high stockings with thin sapphire ribbon welt. 15-denier T=0.76 matte black.',
  },
  {
    name: '36-ivory-illusion-tulle-corset',
    attire: 'She wears an ivory corset mini with illusion tulle side panels and visible boning. Sweetheart neckline, lace-up back, upper-thigh hemline 48-50cm.',
    scene: 'Speakeasy cellar: candle clusters, worn leather banquettes, brick arches, amber pools, foxed mirror, coupe glass on bar.',
    fabric: 'ILLUSION TULLE CORSET: fine tulle forward-scatter produces soft glow around edges; layered tulle creates subtle moire. 14 boning channels form ridge highlights with sharp shadow transitions. Stitch lines show thread relief; corset compression creates smooth conical zones between boning.',
    hosiery: 'HOSIERY: Ivory thigh-high stockings with satin welt. 12-denier T=0.82 ultra-sheer.',
  },
  {
    name: '37-copper-chainmail-panel-halter',
    attire: 'She wears a copper chainmail front panel halter mini with matte jersey sides and a fully open back. Upper-thigh hemline 48-50cm.',
    scene: 'VIP lounge: low amber sconces, leather booths, brass rail, smoke haze, glossy bar top with water rings.',
    fabric: 'CHAINMAIL: interlocked rings create occlusion shadows and moving highlight chains; copper spectral reflectance warms at 650-700nm. Ring edges show micro-abrasion sparkle. Chainmail drape forms catenary curves and weight pulls at the neckline.',
    hosiery: 'HOSIERY: Black thigh-high stockings with copper metallic welt. 15-denier T=0.76 semi-sheer.',
  },
  {
    name: '38-emerald-wetlook-jersey-open-back',
    attire: 'She wears an emerald wet-look jersey mini with a low back and side ruching. One-shoulder strap, upper-thigh hemline 48-50cm.',
    scene: 'Nightclub mezzanine: LED wall spill, glossy bar, fog beams, bass haze, neon signage glow.',
    fabric: 'WET-LOOK COATING: clearcoat over knit yields strong Fresnel sheen; gloss varies with stretch. Ruching creates micro-pooling of highlights and viscous-looking streaks. Edge seams show slight ripples where coating tension changes.',
    hosiery: 'HOSIERY: Black thigh-high stockings with emerald ribbon welt. 15-denier T=0.76 semi-sheer.',
  },
  {
    name: '39-onyx-micropleat-lurex-vneck',
    attire: 'She wears an onyx micro-pleat lurex mini with V front and open back tie. Upper-thigh hemline 48-50cm.',
    scene: 'Cocktail terrace: string lights, city bokeh, glass railing, fire table, cool night air.',
    fabric: 'MICRO-PLEAT LUREX: knife pleats create self-shadow bands; Lurex filaments produce line speculars along pleat ridges. Pleat compression at waist forms tighter highlight spacing. High-frequency shimmer at small body movements.',
    hosiery: 'HOSIERY: Black thigh-high stockings with onyx shimmer welt. 15-denier T=0.76.',
  },
  {
    name: '40-magenta-patent-bandeau-wrap',
    attire: 'She wears a hot magenta patent strapless bandeau mini with an asymmetric wrap tie and high side slit. Upper-thigh hemline 48-50cm.',
    scene: 'Pool deck lounge: LED pool glow, cabana curtains, palm uplights, sparklers in the distance, humid haze.',
    fabric: 'PATENT WRAP: high-gloss clearcoat with Schlick Fresnel; wrap tension yields diagonal stress lines and subtle edge curl at the slit. Micro-surface haze from wear reduces contrast in midtones, but highlights remain sharp.',
    hosiery: 'HOSIERY: Black thigh-high stockings with magenta ribbon welt. 15-denier T=0.76.',
  },
  {
    name: '41-graphite-ribbed-spine-rings',
    attire: 'She wears a graphite ribbed knit mini with an oval spine cutout and three metal ring connectors. Long sleeves, upper-thigh hemline 48-50cm.',
    scene: 'Industrial bar: concrete walls, brass pendants, bottle backlight, scattered reflections on steel surfaces.',
    fabric: 'RIBBED KNIT: ribbed normal map catches side light with alternating highlight bands. Compression at curves densifies ribs with darker valleys. Metal rings show micro-scratches and throw tiny specular points; ring pressure leaves faint skin compression.',
    hosiery: 'HOSIERY: Black thigh-high stockings with graphite metallic welt. 15-denier T=0.76.',
  },
  {
    name: '42-pearlized-organza-wrap-high-slit',
    attire: 'She wears a pearlized organza wrap mini layered over a satin base, with a high side slit and soft waist tie. Upper-thigh hemline 48-50cm.',
    scene: 'Chandelier lounge: warm crystal light, mirrored columns, polished bar, soft haze in air.',
    fabric: 'PEARLIZED ORGANZA: forward-scatter creates soft glow; angle-dependent pearlescent sheen. Layer overlap produces subtle moire; edge fray fibers catch rim light. Satin base gives smooth specular underlayer.',
    hosiery: 'HOSIERY: Nude thigh-high stockings with pearl metallic welt. 12-denier T=0.82.',
  },
  {
    name: '43-rose-gold-foil-knit-asym',
    attire: 'She wears a rose-gold foil knit one-shoulder mini with diagonal hem and a back cutout. Upper-thigh hemline 48-50cm.',
    scene: 'Art deco mezzanine: brass rail, green marble, warm tungsten pools, mirror wall, coupe glass.',
    fabric: 'FOIL KNIT: foil coating micro-cracks at high-stretch zones, fragmenting highlights. Knit ridges show under-foil relief. Rose-gold spectral response shifts warm at grazing angles.',
    hosiery: 'HOSIERY: Black thigh-high stockings with rose-gold welt. 15-denier T=0.76.',
  },
  {
    name: '44-crimson-crushed-velvet-keyhole',
    attire: 'She wears a crimson crushed velvet mini with a keyhole chest and V back. Long sleeves, upper-thigh hemline 48-50cm.',
    scene: 'Candlelit wine bar: stone walls, iron candelabra, wax drips, amber glass, soft smoke.',
    fabric: 'CRUSHED VELVET: pile anisotropy yields sheen flips with angle; deep absorption in pile valleys creates near-black zones. Pile clumps at seams produce irregular highlight islands.',
    hosiery: 'HOSIERY: Black thigh-high stockings with crimson velvet welt. 15-denier T=0.76.',
  },
  {
    name: '45-silver-paillette-halter-open-sides',
    attire: 'She wears a silver 8mm paillette halter mini with open sides and a thin back strap. Upper-thigh hemline 48-50cm.',
    scene: 'Casino salon: chandelier sparkle, brass trim, roulette glow, warm mahogany reflections.',
    fabric: 'PAILLETTE ARMOR: large planar paillettes act as mirrors; hinge pivot produces intermittent flash sparkle. Edge scuffing softens some highlights. Overlap creates hard occlusion shadows and bright edge lines.',
    hosiery: 'HOSIERY: Black thigh-high stockings with silver lace welt. 15-denier T=0.76.',
  },
  {
    name: '46-citrine-satin-slip-chain-straps',
    attire: 'She wears a citrine satin slip mini with chain straps and a low back. Slight bias cut, upper-thigh hemline 48-50cm.',
    scene: 'Warm cocktail lounge: amber sconces, wood bar, glass shelves, condensation on glasses, light haze.',
    fabric: 'SATIN SLIP: dual-lobe specular highlights with soft roll-off; bias cut yields diagonal drape lines. Chain straps create tiny caustic pinpoints and leave faint shoulder compression lines.',
    hosiery: 'HOSIERY: Nude thigh-high stockings with citrine metallic welt. 12-denier T=0.82.',
  },
  {
    name: '47-opal-holo-micro-mesh-overlay',
    attire: 'She wears an opal holographic micro-mesh overlay mini over a solid base, with side slits and an open back tie. Upper-thigh hemline 48-50cm.',
    scene: 'Neon lounge: LED wall gradients, mirror pillars, bokeh signage, fog beams.',
    fabric: 'HOLO MICRO-MESH: diffraction film yields angle-dependent rainbow highlights. Mesh parallax over base creates shifting color interference; moire between mesh and base texture. Edge shimmer along slit borders.',
    hosiery: 'HOSIERY: Black thigh-high stockings with opal shimmer welt. 15-denier T=0.76.',
  },
  {
    name: '48-black-lace-illusion-bodice-satin',
    attire: 'She wears a single-piece dress with a black lace illusion bodice and a smooth black satin mini skirt. V front, open back, upper-thigh hemline 48-50cm.',
    scene: 'Jazz club: tungsten pools, dark wood, vintage mirror, smoke haze, cocktail on the bar.',
    fabric: 'LACE BODICE: thread occlusion and edge-highlighted filaments; fine lace texture shows tiny cast shadows on skin. Satin skirt shows clear specular folds and seam relief at waist.',
    hosiery: 'HOSIERY: Black thigh-high stockings with satin welt. 15-denier T=0.76.',
  },
  {
    name: '49-gunmetal-beaded-column-vback',
    attire: 'She wears a gunmetal beaded column mini with a V back and cap sleeves. Upper-thigh hemline 48-50cm.',
    scene: 'Private lounge: warm spotlights, dark leather booths, brass accents, decanter glow.',
    fabric: 'BEADED COLUMN: bead embroidery produces dense micro-speculars and occasional sparkle spikes. Bead weight creates vertical tension lines; thread shadowing adds depth. Bead abrasion yields occasional soft glints.',
    hosiery: 'HOSIERY: Black thigh-high stockings with gunmetal welt. 15-denier T=0.76.',
  },
  {
    name: '50-electric-cobalt-liquid-crepe-drape',
    attire: 'She wears an electric cobalt liquid crepe mini with an asymmetric drape and a waist cutout. One-shoulder strap, upper-thigh hemline 48-50cm.',
    scene: 'Rooftop bar: cool skyline, fire pit glow, glass railing, gentle breeze.',
    fabric: 'LIQUID CREPE: micro-grain diffuses highlights into soft streaks; asymmetric drape follows catenary curves with tension lines at the cutout. Saturated cobalt retains depth in shadows with cool specular edges.',
    hosiery: 'HOSIERY: Black thigh-high stockings with cobalt ribbon welt. 15-denier T=0.76.',
  },
];

const s = parseInt(process.argv[3] || '0');
const e = parseInt(process.argv[4] || String(concepts.length));
const results = [];

const existingFiles = await fs.readdir(OUTPUT_DIR).catch(() => []);
const existingNums = new Set(existingFiles.filter(f => f.endsWith('.png')).map(f => parseInt(f.split('-')[0])));

console.log(`\n=== V13 APEX - Two-pass, multi-turn refinement ===`);
console.log(`Range: ${s + 1}-${e} | Input: ${path.basename(INPUT_IMAGE)}`);
console.log(`Output: ${OUTPUT_DIR}`);
console.log(`Already generated: ${existingNums.size} | Skipping: [${[...existingNums].sort((a,b)=>a-b).join(',')} ]\n`);

for (let i = s; i < Math.min(e, concepts.length); i++) {
  const conceptNum = i + 31;
  if (existingNums.has(conceptNum)) {
    console.log(`SKIP [${conceptNum}/50] ${concepts[i].name} (already exists)`);
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
console.log('V13 APEX RESULTS');
console.log(`${'='.repeat(60)}`);
const ok = results.filter(r => r.ok);
console.log(`Success: ${ok.length}/${results.length}`);
results.forEach(r => console.log(`  ${r.ok ? 'OK' : '!!'} ${r.name}${r.err ? ': ' + r.err : ''}`));
console.log(`\nOutput: ${OUTPUT_DIR}`);

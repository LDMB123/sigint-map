/**
 * Shared physics engine for Vegas series (V12+)
 *
 * Contains: compressed physics blocks, scene-specific lighting,
 * expression library, prompt builder helpers, generation engine.
 *
 * Used by: vegas-v12-exotic.js, vegas-v13-two-piece.js
 */

import { GoogleAuth } from 'google-auth-library';
import fs from 'fs/promises';
import path from 'path';

// === SCENE-SPECIFIC LIGHT PHYSICS ===
export const LIGHT_PHYSICS = {
  nightclub: `3D LIGHT: Primary tungsten 2800K CRI=100 hard shadows. Neon colored spill inverse-square. UV blacklight 365nm overhead strips driving fluorescent response. LED matrix wall cycling RGB at 2Hz. Laser 532nm coherent beams through fog creating speckle: random constructive/destructive interference on skin roughness σ=20μm, grain d=1.22λz/D=0.3mm, speckle boils with body motion. Fog Mie r=0.5μm tau=0.12/m volumetric forward-scatter g=0.7. Dual-illuminant WB error amber/cyan at overlap. Strobe frozen motion 1/8000s equivalent.`,

  speakeasy: `3D LIGHT: Candle clusters 1800K CRI=100 flickering 1-3Hz warm animate. Amber sconce 2200K warm pools inverse-square falloff. Crossed-polarizer accent from brass fixtures: reveals photoelastic stress in transparent materials. Smoke wisps Mie r=0.3μm tau=0.05/m thin volumetric. Schlieren: dn/dT=-1e-4 K⁻¹ density gradient above candle creates refractive lens deflecting background light 0.3-0.8mrad visible as wavy neon edge. Warm brick bounce. Gaslight replica flicker.`,

  penthouse: `3D LIGHT: City panoramic three walls warm golden multiple point-sources inverse-square. Fireplace 1600K linear gas flame animate 1-3Hz warm. Designer pendant 2800K focused spot. Brewster polarization: floor-ceiling glass at θ_B=56.3° reflected light fully s-polarized creating intensity modulation varying with viewing angle. Glass transmission: Strip skyline refracted n=1.52. Stars atmospheric scintillation. Environmental wrap-around panoramic reflection mapping onto specular surfaces.`,

  casino: `3D LIGHT: Chandelier warm 2800K overhead key. Triband fluorescent 4100K CRI=62 metameric failure: reds→brown, blues→grey-green under fluorescent zones. Cigar smoke Mie r=0.4μm tau=0.06/m thin wisps volumetric catching chandelier as warm halos. Neon colored spill. Dual-illuminant WB error amber/cyan-green at overlap boundary. Mahogany warm diffuse bounce. Green baize reflection from felt surfaces.`,

  lounge: `3D LIGHT: LED color-wash panels shifting slow 0.2Hz cycling through spectrum. Champagne sparkler approaching broadband white 5500K revealing maximum color simultaneously. Fog low floor Mie tau=0.08/m. Mirror panels recursive reflection multiplying all sources. Bass 40Hz vibration modulating fog density creating pulsing scatter. Purple underglow 405nm LED table-bounce. Chrome fixtures specular point-source multiplied.`,
};

// === COMPRESSED SKIN PHYSICS ===
export const SKIN_PHYSICS = `SKIN BIO-OPTICAL: 3-layer Monte Carlo SSS μ_s'=22/18cm⁻¹ epidermis/dermis, μ_a=0.24 melanin, ℓ_s=1.4mm, g=0.82 Henyey-Greenstein. HbO₂ flush cheeks earlobes decolletage. Schlick R(θ)→1 grazing rim over warm SSS. Vasodilation blotchy. Collagen autofluorescence 340→400nm violet UV zones. Perspiration plano-convex micro-lenslets: inverted source images + meniscus thin-film iridescent fringe. Marschner R/TT/TRT hair triple-highlight. Piloerection: AC cold arrector pili micro-bumps upper arms with vellus hair catching rim. Nail lacquer: clear-coat specular over colored substrate double-reflection.`;

// === COMPRESSED CAMERA PHYSICS ===
export const CAMERA_PHYSICS = `CAMERA+SENSOR: Canon R5 II 45MP BSI-CMOS. RF 50mm f/1.2L wide-open. Lens breathing 4% at 2.2m→48.1mm effective. Zernike Z4 defocus + Z7/Z8 coma 0.15λ + Z11 spherical 0.08 + Z5/Z6 astigmatism 0.05. Focus 2.2m: 1.5m/3.0m defocused blobs. ISO 3200 Poisson σ=√N SNR=28dB chroma noise. JPEG DCT 8×8 faint in dark gradients. Hot pixels 2-3 fixed RGB dots. Rolling shutter 8.2ms neon 2-3px skew. 15-blade Fraunhofer starburst. Barrel 0.8%. Clipping magenta fringe. Bayer demosaic false color. cos⁴θ vignetting 0.7-stop.`;

// === COMPRESSED GAZE PHYSICS ===
export const GAZE_PHYSICS = `GAZE+EYE: Both eyes vergence 1.8° inward (2.2m) confirming binocular fixation on lens. Purkinje P1: bright venue light on anterior cornea CENTERED ON PUPIL confirming direct gaze. P2 faint inverted. P3-P4 barely visible. Iris radial collarette. Pupil 5-6mm low-light. Eyelash Fraunhofer: fine strands create spectral fringes on bright backlit sources as colored streaks from lash tips. Limbal ring 0.3mm. Scleral vessels faint. Tear film meniscus lower lid bright line.`;

// === COMPRESSED PREAMBLE ===
export function buildPreamble(expression) {
  return `Edit this photograph into raw candid nightlife photography shot by a friend with a professional camera at a real bar. RAW unretouched candid -- zero: softboxes|beauty-dishes|fill-cards|HMU|symmetrical-light|Photoshop|frequency-separation|dodge-burn|color-grading|Lightroom. Shot as-if by friend with Canon R5. She looks directly into the camera with ${expression}.`;
}

// === COMPRESSED IMPERFECTIONS (scene-specific) ===
export function buildImperfections(sceneType) {
  const base = `ISO 3200 grain. Motion blur fingertips. Flyaway hair Marschner R-lobe. Bokeh 15-blade. Flare veiling 2-3 green ghosts. Rolling shutter neon skew. JPEG DCT shadows. Hot pixels 2-3. Lens breathing field narrowing. Preserve face identical.`;
  const sceneExtras = {
    nightclub: `Glass refraction foreground blur. Fog scatter volumetric. Laser speckle shimmer. Bass 40-80Hz fabric flutter.`,
    speakeasy: `Candle wax drip. Smoke wisps. Brick dust. Condensation ring napkin. Schlieren shimmer above flame.`,
    penthouse: `Glass transmission city. Fireplace shimmer. Condensation on cold glass. City light caustics.`,
    casino: `Cigar smoke wisps. Chip stack reflections. Felt green spill. Marble reflections. Condensation ring.`,
    lounge: `Fog low floor. Mirror recursive. Sparkler bright saturate. Bass fabric flutter. Chrome flare multiply.`,
  };
  return `RAW IMPERFECTIONS: ${base} ${sceneExtras[sceneType] || sceneExtras.nightclub}`;
}

// === FULL EXPRESSION LIBRARY (V11 + V12 + V13) ===
export const expressions = [
  // V11 (0-29)
  'quiet confidence, slight upward chin tilt, one eyebrow barely raised',
  'playful half-smile, eyes slightly narrowed with amusement',
  'sultry intensity, lips barely parted, heavy-lidded gaze',
  'warm genuine smile reaching the eyes, crow-foot crinkles forming',
  'mysterious composure, Mona Lisa micro-smile, unreadable expression',
  'bold direct stare, chin level, unapologetic presence',
  'soft vulnerability, eyes wide and luminous, gentle parted lips',
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
  'tender amusement, gentle head shake, fond expression',
  'electric energy, wide eyes, barely contained excitement',
  'languid ease, heavy-lidded relaxation, unhurried presence',
  'conspiratorial wink-adjacent, one eye slightly more closed',
  'dignified grace, serene half-smile, classical composure',
  'provocative challenge, tilted chin up, daring the camera',
  'genuine surprise transitioning to delight, eyes widening',
  'contemplative depth, thoughtful gaze, intelligence visible',
  'victorious satisfaction, earned confidence, subtle triumph',
  'pure magnetism, the look that stops conversations mid-sentence',
  // V12 (30-34)
  'fascinated discovery, eyes bright with wonder, slight open-mouth awe',
  'dangerous calm, perfectly still, predatory patience behind warm eyes',
  'unguarded laughter caught between breaths, eyes squeezed with joy',
  'sovereign poise, the look of someone who owns the room and knows it',
  'raw authenticity, no mask no performance, just presence meeting lens',
  // V13 (35-44)
  'effortless command, shoulders back, gaze that settles arguments',
  'whispered secret behind the eyes, mouth almost speaking',
  'wild joy barely leashed, teeth visible, eyes alive with mischief',
  'midnight stillness, the calm of someone with nothing left to prove',
  'incandescent warmth, the smile you give only your closest people',
  'hunter focus, pupils locked, everything else dissolving to bokeh',
  'caught between thoughts, brow slightly furrowed then releasing into smile',
  'velvet authority, soft voice energy, gentle power radiating outward',
  'afterglow contentment, post-laughter ease, cheeks still flushed',
  'apex confidence, the exact moment before speaking something important',
];

// === NEW PHYSICS BLOCKS (V12 exotic phenomena) ===
export const PHYSICS_BLOCKS = {
  mechanoluminescence: `MECHANOLUMINESCENCE: ZnS:Cu phosphor 0.5wt% in polyester weave. Stress σ_xx>60MPa creates crystal defect emission via dislocation motion→520nm green photons. Φ_ML=0.005. Emission I(t)=I₀·exp(-t/τ) decay τ=180ms. Visible as faint green glow at maximum tension: waist cinch σ=85MPa→180cd/m², bust apex σ=75MPa→140cd/m², hip σ=60MPa→95cd/m². Intensity I∝σ² quadratic. Bass 40Hz modulates stress creating green flicker at tension zones.`,

  electroluminescence: `ELECTROLUMINESCENCE: ZnS:Mn phosphor AC-driven 400Hz 8mA. Mn²⁺ 3d⁵→⁴T₁(⁴G) transition 585nm amber Φ=0.18. Woven as 50μm fiber-optic strands in mesh creating glowing circuit-board traces. Total-internal-reflection light-pipe distributes emission along full strand length. 400Hz exceeds CFF flicker-free. Current modulation 8→12mA shifts 585→605nm warmer. Fiber crossings: additive brightness. Coverage ~15% mesh area glowing, 85% transparent. Fog creates halo scatter around each strand.`,

  photoelastic: `PHOTOELASTIC BIREFRINGENCE: Clear acrylic n_o=1.49 isotropic at rest. Applied stress σ→birefringence Δn=C·σ, C=85×10⁻¹² Pa⁻¹. Under crossed-polarizer accent light: colored isochromatic fringes where retardation δ=2π·Δn·t/λ=mπ. Fringe sequence blue→green→yellow→red repeating each 550nm retardation. Max stress at waist bone σ=120MPa→8 complete rainbow orders. Edge bones σ=60MPa→3-4 fringes. Grommet stress concentration: intense rainbow burst. Transparent skeleton with physics-driven color visualization.`,

  speckle: `LASER SPECKLE: DJ laser 532nm coherent on skin roughness σ=20μm creates objective speckle grain d=1.22λz/D=0.3mm. Random constructive/destructive granular intensity. Speckle boils with body micro-motion creating shimmering pattern. On fabric: speckle scale modulated by surface roughness — fine mesh 0.15mm grain, smooth vinyl 0.4mm grain, chainmail each ring independent speckle field. Speckle contrast C=1.0 fully developed for single-mode laser.`,

  brewster: `BREWSTER POLARIZATION: Glass surface θ_B=arctan(n₂/n₁)=56.3°: reflected fully s-polarized. Vinyl θ_B=57°. Bar surface θ_B=55°. Cross-polarized neon reflections create intensity modulation varying with viewing angle on all glossy surfaces. Partial polarization below θ_B follows Fresnel Rs/Rp divergence. Window reflections: city lights partially polarized, intensity varies with head position.`,

  marangoni: `MARANGONI: Cocktail ethanol evaporation creates surface-tension gradient dσ/dc driving upward climbing film visible as 'wine tears' λ_Marangoni=2mm spacing, periodic 0.3Hz droplet release. Condensation rivulet Rayleigh-Plateau R=0.8mm breaks into droplets at λ=9.02R=7.2mm, each sphere acting as fish-eye micro-lens imaging venue inverted.`,

  plasmon: `SURFACE PLASMON: Chainmail Au-nanoparticle coating 50nm creates localized SPR absorption 535nm. Plasmonic gold: sharper spectral selectivity Q=8 vs broadband bulk R=0.82. Appears warmer-redder than conventional gold with iridescent quality from resonance narrowband. Near-field enhancement 10²× at nanoparticle surface intensifies Raman signal of adjacent molecules.`,

  thermochromic: `CHOLESTERIC THERMOCHROMIC: Liquid crystal ink pitch p(T) temperature-dependent. Skin contact 33°C→pitch reflects 580nm warm gold. Free-hang 24°C→pitch reflects 480nm cool blue. 9°C ΔT drives visible blue-to-gold color transition across garment creating full-spectrum body-heat map. High-contact zones (waist, bust, inner arm) warm gold. Exposed zones (hem, shoulders) cool blue. Dynamic: movement shifts heat map in real-time.`,

  triboluminescence: `TRIBOLUMINESCENCE: SrAl₂O₄:Eu²⁺ phosphor crystals. Friction→crystal symmetry breaking→charge separation→468nm/520nm blue-green sparks. Flash duration 8ms visible. At fabric-on-skin friction zones: waist twist, hip sway, fabric shift against thighs. Each movement event produces 2-5 discrete spark flashes along friction line. Afterglow τ=3-5s persistent trail behind motion direction — long-persistence phosphor creates visible ghost of movement path.`,
};

// === GENERATION ENGINE ===
export async function createGenerationEngine(config) {
  const {
    projectId = process.env.GOOGLE_CLOUD_PROJECT || 'gen-lang-client-0925343693',
    location = 'global',
    model = 'gemini-3-pro-image-preview',
    outputDir,
    inputImage,
    aspectRatio = '4:5',
    imageSize = '1K',
    maxRetries = 10,
    retryWait = 90,
    interConceptDelay = 45,
    maxWords = 1100,
  } = config;

  const endpoint = `https://aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:generateContent`;
  const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
  await fs.mkdir(outputDir, { recursive: true });

  async function generateEdit(concept, buildPromptFn, index, retries = 0) {
    const prompt = buildPromptFn(concept, index);
    const wordCount = prompt.split(/\s+/).length;
    const expressionIdx = config.expressionOffset ? (index + config.expressionOffset) % expressions.length : index % expressions.length;

    console.log(`\n${'='.repeat(60)}`);
    console.log(`[${index + 1}/${config.totalConcepts}] ${concept.name}`);
    console.log(`${'='.repeat(60)}`);
    console.log(`Prompt: ${wordCount} words | Scene: ${concept.sceneType}`);
    console.log(`Expression: ${expressions[expressionIdx].substring(0, 50)}...`);

    if (wordCount > maxWords) {
      console.error(`ABORT: ${wordCount}w exceeds ${maxWords}w safety ceiling! Skipping concept.`);
      return null;
    }

    const imageBuffer = await fs.readFile(inputImage);
    const base64Image = imageBuffer.toString('base64');
    const ext = path.extname(inputImage).toLowerCase();
    const mimeType = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : ext === '.webp' ? 'image/webp' : 'image/png';

    const requestBody = {
      contents: [{ role: 'user', parts: [
        { text: prompt },
        { inlineData: { mimeType, data: base64Image } },
      ]}],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
        imageConfig: { aspectRatio, imageSize },
      },
    };

    const client = await auth.getClient();
    const token = await client.getAccessToken();

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.text();
      if (response.status === 429) {
        if (retries >= maxRetries) throw new Error(`Rate limited ${maxRetries}x - giving up. Try again later.`);
        console.log(`Rate limited (${retries + 1}/${maxRetries}) - waiting ${retryWait}s... [${error.substring(0, 150)}]`);
        await new Promise(r => setTimeout(r, retryWait * 1000));
        return generateEdit(concept, buildPromptFn, index, retries + 1);
      }
      throw new Error(`API ${response.status}: ${error.substring(0, 300)}`);
    }

    const data = await response.json();
    if (data.candidates?.[0]?.content?.parts) {
      for (const part of data.candidates[0].content.parts) {
        if (part.text && !part.thought) console.log(`Model: ${part.text.substring(0, 100)}...`);
        if (part.inlineData?.data) {
          const img = Buffer.from(part.inlineData.data, 'base64');
          const fp = path.join(outputDir, `${concept.name}.png`);
          await fs.writeFile(fp, img);
          console.log(`SAVED: ${fp} (${(img.length / 1024 / 1024).toFixed(2)} MB)`);
          return fp;
        }
      }
    }
    console.error('NO IMAGE generated');
    return null;
  }

  async function runBatch(concepts, buildPromptFn) {
    const s = parseInt(process.argv[3] || '0');
    const e = parseInt(process.argv[4] || String(concepts.length));
    const results = [];

    const existingFiles = await fs.readdir(outputDir).catch(() => []);
    const existingNames = new Set(existingFiles.filter(f => f.endsWith('.png')).map(f => f.replace('.png', '')));

    console.log(`\n=== ${config.banner || 'GENERATION'} ===`);
    console.log(`Range: ${s + 1}-${Math.min(e, concepts.length)} | Input: ${path.basename(inputImage)}`);
    console.log(`Output: ${outputDir}`);
    console.log(`Already generated: ${existingNames.size}\n`);

    for (let i = s; i < Math.min(e, concepts.length); i++) {
      if (existingNames.has(concepts[i].name)) {
        console.log(`SKIP [${i + 1}/${concepts.length}] ${concepts[i].name} (already exists)`);
        results.push({ name: concepts[i].name, path: 'exists', ok: true });
        continue;
      }
      try {
        config.totalConcepts = concepts.length;
        const fp = await generateEdit(concepts[i], buildPromptFn, i);
        results.push({ name: concepts[i].name, path: fp, ok: !!fp });
      } catch (err) {
        console.error(`FAIL: ${concepts[i].name} - ${err.message}`);
        results.push({ name: concepts[i].name, path: null, ok: false, err: err.message });
      }
      if (i < Math.min(e, concepts.length) - 1) {
        console.log(`Waiting ${interConceptDelay}s...`);
        await new Promise(r => setTimeout(r, interConceptDelay * 1000));
      }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`RESULTS`);
    console.log(`${'='.repeat(60)}`);
    const ok = results.filter(r => r.ok);
    const fail = results.filter(r => !r.ok);
    console.log(`Success: ${ok.length}/${results.length}`);
    ok.forEach(r => console.log(`  OK ${r.name}`));
    if (fail.length) {
      console.log(`Failed: ${fail.length}`);
      fail.forEach(r => console.log(`  FAIL ${r.name}: ${r.err}`));
    }
    console.log(`\nOutput: ${outputDir}`);
    return results;
  }

  return { generateEdit, runBatch };
}

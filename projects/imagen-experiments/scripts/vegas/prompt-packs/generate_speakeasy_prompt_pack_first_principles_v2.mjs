#!/usr/bin/env node

import fs from 'fs';

const outPath = '/Users/louisherman/ClaudeCodeProjects/projects/imagen-experiments/scripts/vegas/prompt-packs/speakeasy_20_prompts_first_principles_v2.md';

const prompts = [
  {
    id: 1,
    title: 'Emerald Booth Cipher',
    scene: 'hidden booth with emerald velvet banquette, brass table lamp, crystal coupe glasses, walnut wall panels, distant neon spill, low atmospheric haze',
    daringAttire: 'deep emerald liquid-satin cocktail dress with asymmetric neckline, high slit, sculpted side cut architecture, black sheer thigh-high hosiery, patent stiletto heels',
    safeAttire: 'emerald satin midi cocktail dress with asymmetric neckline, moderate slit, full side panel coverage, black thigh-high hosiery, classic pointed pumps',
    action: 'seated three-quarter pose transitioning to a poised stand, one hand on table edge, subtle torso twist toward camera'
  },
  {
    id: 2,
    title: 'Piano Noir Voltage',
    scene: 'intimate piano-bar corner with polished grand piano, candle clusters, brass lattice, smoky air volume, layered specular reflections',
    daringAttire: 'black beaded halter mini cocktail dress with open back, sharp thigh slit, black ultra-sheer thigh-high hosiery, metallic strap stilettos',
    safeAttire: 'black beaded cocktail dress with closed back, moderate slit, black thigh-high hosiery, metallic pumps',
    action: 'leaning on piano edge with shoulder rotation and leg extension, controlled balance through heels'
  },
  {
    id: 3,
    title: 'Roulette Ember Arc',
    scene: 'private roulette alcove with green felt, brass rail, dark lacquer trim, amber practical pools, haze-softened highlights',
    daringAttire: 'crimson silk cocktail dress with asymmetric shoulder, aggressive slit, curved waist cut geometry, black sheer thigh-high hosiery, crystal-accent heels',
    safeAttire: 'crimson silk cocktail dress with asymmetric shoulder, moderate slit, no waist cut geometry, black thigh-high hosiery, crystal-accent pumps',
    action: 'hip-forward contrapposto at roulette rail, fingers resting on brass edge, chin lowered slightly'
  },
  {
    id: 4,
    title: 'Staircase Blue Intent',
    scene: 'art deco staircase under chandelier bloom, brass handrail, patterned carpet, warm sconces, volumetric haze ribbons',
    daringAttire: 'midnight velvet corset cocktail silhouette with short hem, deep slit, sheer upper contour panel, black thigh-high hosiery, glossy stilettos',
    safeAttire: 'midnight velvet corset-inspired cocktail midi with reduced slit and opaque upper construction, black thigh-high hosiery, glossy pumps',
    action: 'mid-step ascent with rail contact, pelvis and shoulder counter-rotation, natural gait mechanics'
  },
  {
    id: 5,
    title: 'Mirrorline Silver Echo',
    scene: 'mirrored back-bar wall, stacked decanters, brass shelving, cool edge light with warm pendant fill, deep reflection field',
    daringAttire: 'silver sequin cocktail dress with sheer mesh side zones, high slit, black thigh-high hosiery, mirrored stilettos',
    safeAttire: 'silver sequin cocktail dress with opaque side zones, moderate slit, black thigh-high hosiery, mirrored pumps',
    action: 'standing with one hip loaded, forearm brushing bar edge, light torso twist'
  },
  {
    id: 6,
    title: 'Poker Room Obsidian',
    scene: 'private poker room with banker lamps, mahogany table, chip stacks, smoke haze and warm-cone lighting',
    daringAttire: 'black satin blazer-dress cocktail look with daring plunge architecture and high slit, black sheer thigh-high hosiery, needle heels',
    safeAttire: 'black satin blazer-dress cocktail look with closed neckline and moderate slit, black thigh-high hosiery, needle pumps',
    action: 'seated edge pose transitioning to stand, hand pressure on table felt'
  },
  {
    id: 7,
    title: 'Absinthe Green Current',
    scene: 'absinthe service station with antique glassware, perforated spoon ritual setup, emerald glow, brass taps, mirror scatter',
    daringAttire: 'forest cocktail dress with translucent contour panel, high slit, narrow side reveal lines, black thigh-high hosiery, jeweled heels',
    safeAttire: 'forest cocktail dress with opaque contour panel and moderate slit, black thigh-high hosiery, jeweled pumps',
    action: 'one leg forward at bar rail, shoulder offset, hand hovering near absinthe glass'
  },
  {
    id: 8,
    title: 'Rooftop Gold Drift',
    scene: 'rooftop speakeasy with Vegas skyline bokeh, string lights, wind-swept atmosphere, chrome rail, night haze',
    daringAttire: 'gold pleated cocktail dress with open back and high slit, black sheer thigh-high hosiery, metallic stilettos',
    safeAttire: 'gold pleated cocktail midi with closed back and moderate slit, black thigh-high hosiery, metallic pumps',
    action: 'standing near rail in wind, hair motion and garment flutter controlled by posture and heel-ground balance'
  },
  {
    id: 9,
    title: 'Swing Floor Ruby Pulse',
    scene: 'dance-floor perimeter near live jazz band, parquet reflections, warm practicals, drifting haze and moving highlights',
    daringAttire: 'ruby fringe cocktail dress with high slit and sculpted side reveal, black thigh-high hosiery, deco stilettos',
    safeAttire: 'ruby fringe cocktail dress with moderate slit and closed side panel, black thigh-high hosiery, deco pumps',
    action: 'dynamic turn-stop pose with one knee forward, fringe oscillation frozen naturally'
  },
  {
    id: 10,
    title: 'Lounge Plum Tension',
    scene: 'cigar lounge nook with leather club chair, walnut shelves, amber lamp pool, soft smoke diffusion',
    daringAttire: 'plum velvet cocktail bodycon with corset-laced structure and high slit, black sheer thigh-high hosiery, satin stilettos',
    safeAttire: 'plum velvet cocktail silhouette with restrained structure and moderate slit, black thigh-high hosiery, satin pumps',
    action: 'chair-edge lean with torso angle and lifted chin, hand grazing chair arm'
  },
  {
    id: 11,
    title: 'Cellar Burgundy Lacework',
    scene: 'bottle cellar corridor with amber practical bulbs, glass reflections, concrete texture, atmospheric depth',
    daringAttire: 'burgundy lace-over-satin cocktail dress with high slit and dramatic waist contour, black thigh-high hosiery, oxblood stilettos',
    safeAttire: 'burgundy lace-over-satin cocktail midi with moderate slit and softer waist contour, black thigh-high hosiery, oxblood pumps',
    action: 'walking-to-stop moment with one foot planted and one trailing, subtle shoulder turn'
  },
  {
    id: 12,
    title: 'Vault Lamé Resolve',
    scene: 'vault-door lounge with brushed steel, brass rivets, moody practical bulbs, clean noir shadows',
    daringAttire: 'silver lamé wrap cocktail dress with high slit and angular neckline, black sheer thigh-high hosiery, mirrored stilettos',
    safeAttire: 'silver lamé wrap cocktail dress with moderate slit and secure neckline, black thigh-high hosiery, mirrored pumps',
    action: 'hand near vault wheel, torso angled to light, one leg advanced for slit-driven motion physics'
  },
  {
    id: 13,
    title: 'Red Corridor Geometry',
    scene: 'red telephone corridor with checker tile reflections, narrow depth, red practical glow, smoky atmosphere',
    daringAttire: 'black structured cocktail dress with geometric side architecture and high slit, sheer black thigh-high hosiery, red stilettos',
    safeAttire: 'black structured cocktail dress with closed side architecture and moderate slit, black thigh-high hosiery, red pumps',
    action: 'one shoulder to wall, crossing step toward camera, controlled head tilt'
  },
  {
    id: 14,
    title: 'Rain Alley Black Metal',
    scene: 'speakeasy alley entrance at night with rain-wet cobblestone, neon reflections, brass door plaque, drifting mist',
    daringAttire: 'black metallic cocktail dress with open-back line and high slit, black sheer thigh-high hosiery, pointed stilettos',
    safeAttire: 'black metallic cocktail dress with closed back line and moderate slit, black thigh-high hosiery, pointed pumps',
    action: 'mid-stride approach to door, controlled motion and realistic wet-surface interaction'
  },
  {
    id: 15,
    title: 'Chandelier Ice Line',
    scene: 'chandelier lounge hall with mirrored columns, polished marble, gold sconces, layered volumetric light',
    daringAttire: 'ice-blue satin cocktail dress with deep cowl and high slit, black sheer thigh-high hosiery, silver stilettos',
    safeAttire: 'ice-blue satin cocktail midi with softened cowl and moderate slit, black thigh-high hosiery, silver pumps',
    action: 'full-body stance in center axis, one leg extended, hand near collarbone, precise posture under top light'
  },
  {
    id: 16,
    title: 'Service Bar Charcoal Vector',
    scene: 'back-of-house service bar with polished steel, stacked coupes, linear practical strips, warm spill from lounge',
    daringAttire: 'charcoal leather-panel cocktail dress with contour seams and high slit, semi-sheer black thigh-high hosiery, slingback stilettos',
    safeAttire: 'charcoal tailored cocktail dress with moderated slit and reduced panel drama, black thigh-high hosiery, slingback pumps',
    action: 'forearm on counter edge, torso angled, one heel lifted slightly to emphasize weight distribution'
  },
  {
    id: 17,
    title: 'Library Crystal Net',
    scene: 'private speakeasy library room with leather books, vintage lamp pools, polished wood cart, warm smoke haze',
    daringAttire: 'black crystal-net overlay cocktail dress with high slit and fitted underlayer, black sheer thigh-high hosiery, gemstone stilettos',
    safeAttire: 'black embellished cocktail dress with less transparent overlay and moderate slit, black thigh-high hosiery, gemstone pumps',
    action: 'leaning against wood cart with subtle hip shift, poised stillness with micro movement'
  },
  {
    id: 18,
    title: 'Last Call Ivory Edge',
    scene: 'after-hours speakeasy bar with stacked stools, single pendant pool, lacquer reflections, fading haze',
    daringAttire: 'ivory satin blazer-cocktail dress with daring neckline and high slit, black sheer thigh-high hosiery, black stilettos',
    safeAttire: 'ivory satin blazer-cocktail dress with closed neckline and moderate slit, black thigh-high hosiery, black pumps',
    action: 'bar-lean profile with one hand on edge and one at waist, composed end-of-night cinematic mood'
  },
  {
    id: 19,
    title: 'Rehearsal Tux Spark',
    scene: 'jazz rehearsal corner with upright bass, trumpet stand, mixed warm practical and cool edge light, textured haze',
    daringAttire: 'black tux-inspired cocktail mini with satin lapel and high slit, black sheer thigh-high hosiery, pointed stilettos',
    safeAttire: 'black tux-inspired cocktail midi with satin lapel and moderate slit, black thigh-high hosiery, pointed pumps',
    action: 'weight shifted to rear leg, front knee softened, one hand near instrument stand'
  },
  {
    id: 20,
    title: 'Rain Window Noir Finale',
    scene: 'window booth with rain-streaked glass, neon refraction, candle flame flicker, deep noir atmosphere',
    daringAttire: 'black crystal-embellished cocktail gown with dramatic slit and sculpted bodice, black sheer thigh-high hosiery, crystal stilettos',
    safeAttire: 'black embellished cocktail gown with reduced slit and fuller bodice coverage, black thigh-high hosiery, crystal pumps',
    action: 'seated-to-rise transition beside window booth, hand on tabletop, elegant balance'
  }
];

const innovationById = new Map([
  [1, 'Innovation motif: velvet contact compression + anisotropic satin BRDF transition under mixed tungsten/neon, with seam-load redistribution during sit-to-stand motion.'],
  [2, 'Innovation motif: polished piano lacquer Fresnel reflections + micro-scratched clearcoat response, synchronized with beaded garment sparkle attenuation by incident angle.'],
  [3, 'Innovation motif: roulette felt fiber occlusion + brass edge specular clipping thresholds; slit opening governed by hip torque and friction at garment contact seams.'],
  [4, 'Innovation motif: staircase locomotion biomechanics with heel impact force chain, cloth inertia lag, and chandelier multi-source penumbra layering on velvet surfaces.'],
  [5, 'Innovation motif: mirror recursion control with roughness-aware reflection decay; sequins exhibit non-uniform microfacet normals instead of uniform glitter noise.'],
  [6, 'Innovation motif: poker-felt friction coefficient effects on hand pressure deformation; blazer fabric buckling transitions at lapel fold lines under torso twist.'],
  [7, 'Innovation motif: absinthe-glass caustic spill and green spectral bias interacting with sheer textile translucency gradients and cuff compression lines.'],
  [8, 'Innovation motif: rooftop wind-field interaction on pleated fabric with directional flutter damping and skyline bokeh shaped by realistic aperture geometry.'],
  [9, 'Innovation motif: fringe oscillation freeze-frame physics with phase-offset strand motion and parquet reflection blur consistent with motion-stop timing.'],
  [10, 'Innovation motif: leather-chair contact pressure map with localized fabric sheen shift and smoke volumetric scattering tuned by lamp intensity falloff.'],
  [11, 'Innovation motif: cellar humidity micro-sheen on skin/fabric and glass-bottle refraction distortion that remains angle-consistent across frame depth.'],
  [12, 'Innovation motif: brushed steel anisotropy + rivet micro-shadowing, with lamé highlight breakup based on fold curvature and view-dependent reflectance.'],
  [13, 'Innovation motif: narrow corridor radiosity bounce from red practicals and checker-tile gloss variation driving physically coherent edge highlights.'],
  [14, 'Innovation motif: wet cobblestone thin-water-film reflectance with micro-puddled roughness variance; garment hem dampening alters drape mass response.'],
  [15, 'Innovation motif: chandelier crystal dispersion cues with controlled spectral split and satin cowl gravity vector behavior under slight torso rotation.'],
  [16, 'Innovation motif: stainless service-bar micro-scratch normals + strip-light specular streaking, matched to leather-panel stretch and seam tension ridges.'],
  [17, 'Innovation motif: library particulate haze depth stratification and crystal-net overlay interference-like sparkle rolloff with non-repeating microstructure.'],
  [18, 'Innovation motif: single-pendant inverse-square falloff with lacquer bar reflections and blazer fold memory from prior movement states.'],
  [19, 'Innovation motif: mixed warm/cool key conflict resolved through physically plausible skin/subsurface response and tux-lapel directional sheen anisotropy.'],
  [20, 'Innovation motif: rain-streaked window refraction vectors + neon chromatic bleed, synchronized with bodice tension topology during seated-to-rise transition.']
]);

const primaryTargetWords = 1050;
const safeTargetWords = 980;

const firstPrinciplesCore = `
FIRST-PRINCIPLES TARGET:
Make a believable real camera capture, not an AI-looking render. If directives conflict, prioritize: (1) identity fidelity, (2) direct eye contact to lens, (3) physical plausibility of anatomy/materials/light, (4) editorial risk energy, (5) style details.
`;

const identityBlock = `
Identity lock (non-negotiable): use the provided reference image as the sole identity source for the same adult woman (25+). Preserve face geometry and recognition cues: eye spacing, brow arc, orbital depth, nose bridge, mouth width, chin contour, jawline, hairline pattern, natural asymmetry, and skin undertone. Do not drift into a different person under any lighting or pose.
`;

const directGazeBlock = `
Gaze lock (hard rule): subject must look directly into the camera lens in the final frame. Keep iris/pupil direction lens-centered with believable vergence and eyelid tension. No off-camera gaze, no downcast eyes, no profile-only eye direction.
`;

const realismFoundation = `
Realism foundation:
- Anatomical plausibility: coherent shoulder-pelvis relationship, correct limb proportions, natural hand articulation, heel-ground load mechanics, and valid center-of-mass balance.
- Optics plausibility: realistic depth of field transitions, no cutout halos, no warped edges, no fake blur.
- Lighting plausibility: practical-source motivated key/fill/rim behavior, coherent shadow direction/penumbra, roughness-aware reflections, Fresnel-consistent highlights.
`;

const antiAiFoundation = `
Anti-AI authenticity constraints:
- Keep skin lifelike with pore detail, subtle tonal variation, and no porcelain smoothing.
- Keep hair lifelike with irregular strand grouping and minor flyaways.
- Keep fabric lifelike with non-repeating microtexture and seam irregularity.
- Preserve slight real-world asymmetry in makeup, textile tension, and prop placement.
- Reject outputs with uncanny eyes, plastic skin, rubber fabric, repeated texture stamps, or composited subject separation.
`;

const ultraPhysicsBlock = `
Frontier physics controls:
- Simulate wrinkle hierarchy from first principles: macro gravity folds, meso seam-anchored buckling, micro high-frequency creasing in strain concentration zones.
- Enforce contact mechanics: where body/garment/surface meet, show pressure flattening, shadow occlusion, and material-dependent friction behavior.
- Enforce textile constitutive behavior: stretch anisotropy, bias-direction drape differences, and edge curl response tied to fabric stiffness.
- Enforce optics coherence: polarization-like sheen behavior on satin/hosiery, roughness-dependent specular lobe width, and exposure-consistent highlight rolloff.
- Enforce sensor realism: realistic highlight clipping knees, subtle chroma noise in shadows, and no procedural overcleaning.
`;

const primaryPhysicsBlocks = [
  `
Attire impact through physics (primary):
- Build a body-skimming silhouette via strain maps, seam load paths, and controlled tension around waist/hip/upper leg.
- Use slit dynamics tied to pose/gravity so opening behavior follows leg angle and movement.
- Use sheer optical behavior through denier gradients and layered occlusion, never as flat painted transparency.
`,
  `
Material system (primary):
- Satin/silk: anisotropic highlight flow, gravity drape vectors, compression folds at contact points.
- Velvet: direction-dependent pile shading and contact darkening.
- Sequins/crystals: controlled spark distribution with micro-normal variation, no random glitter noise.
- Hosiery: thigh-band compression transition, stretch over knee contour, ankle micro-wrinkling, directional sheen.
`,
  `
Editorial risk energy (primary, non-explicit):
- Keep wardrobe and pose bold, assertive, and fashion-forward while staying non-explicit.
- Favor long leg-line projection, strong S-curve torso-leg flow, and confident chin/eye tension.
- Keep full outfit readable in frame with contour-defining light placement.
`,
  `
Camera and render intent:
- Vertical 4:5 framing, output target 2K.
- Lens behavior should feel like premium editorial capture (roughly 50-85mm equivalent perspective).
- Filmic noise only, no heavy denoise smear, no oversharpen halos, no synthetic texture mush.
`,
  `
Environment integration:
- Subject must physically belong in the set: contact shadows, reflection coherence, and interaction with nearby surfaces.
- Haze should add depth separation without washing contrast.
- Keep practical highlights and reflective cues consistent with object roughness and angle.
`,
  `
Extreme realism audit (primary):
- Validate physically causal links: pose -> tension map -> fold pattern -> highlight path -> shadow placement.
- Any non-causal cloth fold, reflection mismatch, or eye-direction inconsistency is a hard failure.
- Preserve cinematic boldness while remaining fully believable as a real photographed moment.
`,
  `
  Quality gate (primary):
- Real-camera believability under close inspection.
- No broken fingers, no warped feet, no fabric clipping, no face drift, no incorrect eye direction.
- Deliver a high-end Vegas editorial still with strong, daring style and uncompromised realism.
`
];

const safePhysicsBlocks = [
  `
Attire impact through physics (safe fallback):
- Keep safer coverage geometry while still maintaining a sexy editorial silhouette through fit tension and contour lighting.
- Preserve slit/hem movement logic and hosiery optics with the same physical rigor.
- Maintain non-explicit but bold visual energy via posture, gaze, and material response.
`,
  `
Material system (safe fallback):
- Preserve all high-fidelity fabric behavior: drape, crease hierarchy, seam stress, contact compression, and realistic sheen.
- Hosiery must remain physically convincing: denier gradients, stretch maps, cuff pressure transitions, and ankle micro-creases.
`,
  `
Editorial continuity (safe fallback):
- Keep the same scene, camera realism, and direct-lens eye contact as primary.
- Avoid making safe variant look plain; it must still read as premium nightlife couture.
- Preserve strong silhouette legibility and high-fashion intent.
`,
  `
Camera and render intent:
- Vertical 4:5 framing, output target 2K.
- Photographic realism over stylization, with coherent DOF and physically motivated lighting.
- Keep texture integrity in skin, hair, lace/mesh, and hosiery edges.
`,
  `
Environment integration:
- Keep subject physically anchored to set via contact shadows, reflection consistency, and realistic surface interactions.
- Maintain scene depth through controlled haze and practical-light separation.
`,
  `
Quality gate (safe fallback):
- No identity drift, no uncanny anatomy, no artificial skin smoothing, no fake transparency, no reflection mismatch.
- Final image must look camera-captured, luxurious, and believable.
`
];

function countWords(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function padToTarget(baseText, targetWords, blocks) {
  let out = baseText.trim();
  let idx = 0;
  while (countWords(out) < targetWords && idx < blocks.length) {
    out += `\n\n${blocks[idx].trim()}`;
    idx += 1;
  }
  let cycle = 1;
  while (countWords(out) < targetWords) {
    const block = blocks[(cycle - 1) % blocks.length].trim();
    out += `\n\nReinforcement cycle ${cycle}:\n${block}`;
    cycle += 1;
    if (cycle > 6) break;
  }
  return out.trim();
}

function buildPrimaryPrompt(item) {
  const innovation = innovationById.get(item.id) || '';
  const base = `
${firstPrinciplesCore.trim()}

${identityBlock.trim()}

${directGazeBlock.trim()}

Scene:
Vegas speakeasy environment with ${item.scene}. Build layered depth (foreground cues, subject mid-plane, background practicals). Subject must feel physically present in the environment.

Attire (primary daring variant):
${item.daringAttire}
Use reveal-by-physics rather than explicit framing: contour fit, strain gradients, seam tension maps, and pose-driven fabric behavior.

Pose and narrative:
${item.action}, direct eye contact into lens, confident expression, controlled editorial energy.

${realismFoundation.trim()}

${antiAiFoundation.trim()}

${ultraPhysicsBlock.trim()}

${innovation}
`;

  return padToTarget(base, primaryTargetWords, primaryPhysicsBlocks);
}

function buildSafePrompt(item) {
  const innovation = innovationById.get(item.id) || '';
  const base = `
${firstPrinciplesCore.trim()}

${identityBlock.trim()}

${directGazeBlock.trim()}

Scene:
Keep the same Vegas speakeasy environment with ${item.scene}. Maintain the same cinematic mood, depth layering, and practical-light logic.

Attire (safe fallback variant):
${item.safeAttire}
Coverage is safer, but the image must still read as bold and sexy through physically grounded fit, silhouette, hosiery optics, and pose confidence.

Pose and narrative:
${item.action}, direct eye contact into lens, poised confidence, premium editorial tone.

${realismFoundation.trim()}

${antiAiFoundation.trim()}

${ultraPhysicsBlock.trim()}

Safe adaptation of innovation motif:
${innovation}
`;

  return padToTarget(base, safeTargetWords, safePhysicsBlocks);
}

const lines = [];
lines.push('# Vegas Speakeasy Prompt Pack v2 (First Principles Rewrite)');
lines.push('');
lines.push('Design goal: maximize identity fidelity, direct lens eye contact, non-explicit risky editorial energy, and photoreal physics while suppressing AI artifacts.');
lines.push('');

for (const item of prompts) {
  const primary = buildPrimaryPrompt(item);
  const safe = buildSafePrompt(item);
  const primaryWords = countWords(primary);
  const safeWords = countWords(safe);

  lines.push(`## Prompt ${item.id.toString().padStart(2, '0')} - ${item.title}`);
  lines.push('');
  lines.push(`- Primary word count: ${primaryWords}`);
  lines.push(`- Safe word count: ${safeWords}`);
  lines.push('');
  lines.push('### Primary Prompt');
  lines.push('');
  lines.push(primary);
  lines.push('');
  lines.push('### Safe Backup Prompt');
  lines.push('');
  lines.push(safe);
  lines.push('');
  lines.push('---');
  lines.push('');
}

fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
console.log(`Wrote ${outPath}`);
console.log(`Total sections: ${prompts.length}`);

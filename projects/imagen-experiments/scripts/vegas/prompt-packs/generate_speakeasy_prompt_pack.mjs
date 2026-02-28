#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

const outPath = '/Users/louisherman/ClaudeCodeProjects/projects/imagen-experiments/scripts/vegas/prompt-packs/speakeasy_20_prompts_1800w.md';

const prompts = [
  {
    id: 1,
    title: 'Emerald Booth Cipher',
    scene: 'hidden booth with emerald velvet banquette, brass table lamp, crystal coupe glasses, walnut wall panels, distant neon spill, low atmospheric haze',
    daringAttire: 'deep emerald liquid-satin cocktail dress with asymmetric neckline, high slit, sculpted side cut architecture, black sheer thigh-high hosiery, patent stiletto heels',
    safeAttire: 'emerald satin midi cocktail dress with asymmetric neckline, moderate slit, full side panel coverage, black thigh-high hosiery, classic pointed pumps',
    action: 'seated three-quarter pose transitioning to a poised stand, one hand on table edge, subtle torso twist toward camera, controlled eye contact, composed confidence'
  },
  {
    id: 2,
    title: 'Piano Noir Voltage',
    scene: 'intimate piano-bar corner with polished grand piano, candle clusters, brass lattice, smoky air volume, layered specular reflections',
    daringAttire: 'black beaded halter mini cocktail dress with open back, sharp thigh slit, black ultra-sheer thigh-high hosiery, metallic strap stilettos',
    safeAttire: 'black beaded cocktail dress with closed back, moderate slit, black thigh-high hosiery, metallic pumps',
    action: 'leaning on piano edge with shoulder rotation and leg extension, controlled balance through heels, micro-expression of playful command'
  },
  {
    id: 3,
    title: 'Roulette Ember Arc',
    scene: 'private roulette alcove with green felt, brass rail, dark lacquer trim, amber practical pools, haze-softened highlights',
    daringAttire: 'crimson silk cocktail dress with asymmetric shoulder, aggressive slit, curved waist cut geometry, black sheer thigh-high hosiery, crystal-accent heels',
    safeAttire: 'crimson silk cocktail dress with asymmetric shoulder, moderate slit, no waist cut geometry, black thigh-high hosiery, crystal-accent pumps',
    action: 'hip-forward contrapposto at roulette rail, fingers resting on brass edge, chin lowered slightly, gaze lifted into lens'
  },
  {
    id: 4,
    title: 'Staircase Blue Intent',
    scene: 'art deco staircase under chandelier bloom, brass handrail, patterned carpet, warm sconces, volumetric haze ribbons',
    daringAttire: 'midnight velvet corset cocktail silhouette with short hem, deep slit, sheer upper contour panel, black thigh-high hosiery, glossy stilettos',
    safeAttire: 'midnight velvet corset-inspired cocktail midi with reduced slit and opaque upper construction, black thigh-high hosiery, glossy pumps',
    action: 'mid-step ascent with rail contact, pelvis and shoulder counter-rotation, natural gait mechanics, cinematic pause'
  },
  {
    id: 5,
    title: 'Mirrorline Silver Echo',
    scene: 'mirrored back-bar wall, stacked decanters, brass shelving, cool edge light with warm pendant fill, deep reflection field',
    daringAttire: 'silver sequin cocktail dress with sheer mesh side zones, high slit, black thigh-high hosiery, mirrored stilettos',
    safeAttire: 'silver sequin cocktail dress with opaque side zones, moderate slit, black thigh-high hosiery, mirrored pumps',
    action: 'standing with one hip loaded, forearm brushing bar edge, light torso twist to trigger sequined specular dynamics'
  },
  {
    id: 6,
    title: 'Poker Room Obsidian',
    scene: 'private poker room with banker lamps, mahogany table, chip stacks, smoke haze and warm-cone lighting',
    daringAttire: 'black satin blazer-dress cocktail look with daring plunge architecture and high slit, black sheer thigh-high hosiery, needle heels',
    safeAttire: 'black satin blazer-dress cocktail look with closed neckline and moderate slit, black thigh-high hosiery, needle pumps',
    action: 'seated edge pose transitioning to stand, hand pressure on table felt, measured confidence and controlled stillness'
  },
  {
    id: 7,
    title: 'Absinthe Green Current',
    scene: 'absinthe service station with antique glassware, perforated spoon ritual setup, emerald glow, brass taps, mirror scatter',
    daringAttire: 'forest cocktail dress with translucent contour panel, high slit, narrow side reveal lines, black thigh-high hosiery, jeweled heels',
    safeAttire: 'forest cocktail dress with opaque contour panel and moderate slit, black thigh-high hosiery, jeweled pumps',
    action: 'one leg forward at bar rail, shoulder offset, hand hovering near absinthe glass, subtle motion-ready stance'
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
    action: 'dynamic turn-stop pose with one knee forward, fringe oscillation frozen naturally, balanced weight transfer'
  },
  {
    id: 10,
    title: 'Lounge Plum Tension',
    scene: 'cigar lounge nook with leather club chair, walnut shelves, amber lamp pool, soft smoke diffusion',
    daringAttire: 'plum velvet cocktail bodycon with corset-laced structure and high slit, black sheer thigh-high hosiery, satin stilettos',
    safeAttire: 'plum velvet cocktail silhouette with restrained structure and moderate slit, black thigh-high hosiery, satin pumps',
    action: 'chair-edge lean with torso angle and lifted chin, hand grazing chair arm, controlled posture in heels'
  },
  {
    id: 11,
    title: 'Cellar Burgundy Lacework',
    scene: 'bottle cellar corridor with amber practical bulbs, glass reflections, concrete texture, atmospheric depth',
    daringAttire: 'burgundy lace-over-satin cocktail dress with high slit and dramatic waist contour, black thigh-high hosiery, oxblood stilettos',
    safeAttire: 'burgundy lace-over-satin cocktail midi with moderate slit and softer waist contour, black thigh-high hosiery, oxblood pumps',
    action: 'walking-to-stop moment with one foot planted and one trailing, subtle shoulder turn and focused gaze'
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
    action: 'one shoulder to wall, crossing step toward camera, controlled head tilt and assertive expression'
  },
  {
    id: 14,
    title: 'Rain Alley Black Metal',
    scene: 'speakeasy alley entrance at night with rain-wet cobblestone, neon reflections, brass door plaque, drifting mist',
    daringAttire: 'black metallic cocktail dress with open-back line and high slit, black sheer thigh-high hosiery, pointed stilettos',
    safeAttire: 'black metallic cocktail dress with closed back line and moderate slit, black thigh-high hosiery, pointed pumps',
    action: 'mid-stride approach to door, coatless rain scene, controlled motion and realistic wet-surface interaction'
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
    action: 'leaning against wood cart with subtle hip shift, eye line to lens, poised stillness with micro movement'
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
    action: 'weight shifted to rear leg, front knee softened, one hand near instrument stand, poised editorial command'
  },
  {
    id: 20,
    title: 'Rain Window Noir Finale',
    scene: 'window booth with rain-streaked glass, neon refraction, candle flame flicker, deep noir atmosphere',
    daringAttire: 'black crystal-embellished cocktail gown with dramatic slit and sculpted bodice, black sheer thigh-high hosiery, crystal stilettos',
    safeAttire: 'black embellished cocktail gown with reduced slit and fuller bodice coverage, black thigh-high hosiery, crystal pumps',
    action: 'seated-to-rise transition beside window booth, hand on tabletop, controlled gaze and elegant balance'
  }
];

const foundationIdentity = `
Use the provided reference image as a strict identity lock for the same adult woman (age 25+). Preserve face geometry with high fidelity: eye spacing, brow arc, orbital depth, nose bridge shape, philtrum length, lip contour, jawline, ear placement, and hairline topology. Preserve recognizable skin undertone and facial proportions under new lighting without drifting into a new person. Keep expression controlled, editorial, and confident. Do not stylize into cartoon or painterly mode; maintain premium photorealism suitable for luxury campaign key art. Ensure anatomical plausibility throughout: shoulder width to head ratio, clavicle placement, arm length relative to torso, hand scale, finger articulation, pelvis-leg relationship, and realistic heel posture mechanics. Subject must read as elegant, empowered, and cinematic, never caricatured.
`;

const foundationPhysics = `
Push physically grounded rendering aggressively. Garment mechanics must obey material-dependent behavior:
- Satin and silk: smooth drape vectors, gravity pooling at low points, anisotropic highlight roll-off, crease memory after movement, seam-driven tension fields, and realistic friction against skin and seating surfaces.
- Velvet: directional pile response, light absorption at off angles, brighter sheen where pile aligns to view/light vectors, compressed nap in contact zones.
- Sequins and embellishments: non-uniform micro-normal variation, controlled sparkle scatter, local mass effects that increase vertical pull and wrinkle frequency.
- Structured panels/corset zones: constrained deformation, localized stress concentration near seams and anchors, realistic soft-tissue displacement rather than rigid clipping.

For thigh-high hosiery physics, enforce denier-aware optical behavior and stretch mechanics:
- Translucency varies by strain: more transparent where stretched over knee and quad curvature, denser where relaxed.
- Subtle compression at thigh cuff with believable pressure transition, no harsh banding.
- Micro-wrinkle ladders near ankle and instep based on plantar flexion and dorsiflexion.
- Specular sheen should be directional and energy-consistent under mixed practical light.

Pose physics must remain coherent:
- Center of mass over support polygon in high heels.
- Pelvic tilt and shoulder counter-rotation during step or twist.
- Natural tendon/ligament cues in ankle and hand where load is present.
- Contact shadow and occlusion where body, garment, and surfaces meet.

Lighting physics and optics:
- Mixed tungsten practicals and colored ambient spill should produce plausible white-balance interplay.
- Haze should soften far highlights and create depth without milky washout.
- Reflections in lacquer, glass, and metal must track angle, roughness, and light source size.
- Depth of field should isolate subject while preserving face-critical features and garment-readability in focal plane.

Skin rendering:
- Maintain pore-level detail and fine texture.
- Controlled specular at forehead, cheekbone, shoulder, and collarbone.
- Subsurface scattering should respond to warm practicals naturally.
- Avoid plastic skin, over-smoothing, or wax artifacts.
`;

const foundationCamera = `
Camera intent: premium nightlife editorial, vertical 4:5 frame, full 4K fidelity. Use realistic lens behavior, no synthetic distortion gimmicks. Keep composition deliberate: foreground cues for depth, clear silhouette separation, and practical-light motivated contrast. Maintain micro-contrast and tonal richness in shadows. Preserve natural color separation between skin, attire, brass, wood, and neon accents. Keep noise controlled and filmic; avoid AI mush in hair strands, fingers, hosiery seams, and dress edges.
`;

const foundationGuardrails = `
Guardrails:
- Adult subject only (25+).
- Fashion-forward and daring, but presented as cinematic editorial, not explicit content.
- No nudity, no fetish framing, no anatomical exaggeration.
- No extra limbs, warped hands, malformed feet, or broken fabric topology.
- Keep identity from reference image stable across this frame.
`;

const safetyOverlay = `
Safety backup variant intent:
Keep the same identity, same scene architecture, same cinematic lensing, and the same rigorous physics constraints. Reduce exposure by using a more coverage-forward cocktail silhouette and a moderated slit height while preserving elegance and confidence. Prioritize upscale red-carpet styling, still with thigh-high hosiery and strong material realism. Maintain all cloth mechanics, hosiery strain behavior, lighting physics, contact shadows, and anatomical plausibility at the same quality bar.
`;

const reinforcementBlocksPrimary = [
  `
Physics reinforcement pass A:
Explicitly model wrinkle hierarchy: macro folds from gravity and pose, meso folds from seam anchoring and compression, and micro creasing in high-frequency zones around waist, hip hinge, elbow adjacency, and ankle articulation. Ensure folds do not randomize; they must align with force directions. Keep slit behavior consistent with leg angle and fabric stiffness. If the subject turns, redistribute tension lines logically rather than copying static crease maps.
`,
  `
Physics reinforcement pass B:
Treat hosiery as thin, anisotropic elastic textile. Stretch map should be continuous from thigh band to toe region, with visible directional strain around patella and gastrocnemius contour. Preserve realistic seam behavior if present. Avoid opaque "painted" legs; keep nuanced translucency with subsurface hint from skin underneath. Ankle and instep need tiny, believable bunching that reflects footwear geometry and foot pitch.
`,
  `
Physics reinforcement pass C:
Material interaction with the environment must be coherent. Velvet seating should compress and darken at contact. Lacquered tabletop should show clear but roughness-limited reflection. Glassware should include plausible Fresnel edges and refraction cues. Metallic details (heels, bar trim, sequins) should exhibit highlight clipping only where physically warranted. Candle/practical light should generate soft, directionally sensible shadow penumbra.
`,
  `
Identity reinforcement:
Do not allow the face to drift under dramatic lighting. Maintain cheekbone shape, orbital depth, brow spacing, mouth width, and chin contour. Hairline and parting geometry must remain consistent with the reference. Preserve recognizable likeness through pose changes, lens compression, and atmospheric effects.
`,
  `
Final quality gate:
Output must read as a high-budget Vegas speakeasy campaign still. No uncanny anatomy, no synthetic texture smearing, no duplicate fingers, no lace/hosiery aliasing, no broken heel contact, and no impossible reflections. Keep the visual narrative intentional: daring wardrobe, disciplined physics, and elite editorial finish.
`
];

const reinforcementBlocksSafe = [
  `
Safe-variant reinforcement A:
Keep identical scene architecture and physics budget while reducing exposure through fuller coverage and moderated slit geometry. Cloth simulation quality must remain unchanged: preserve drape vectors, seam stress realism, and contact compression. The safer look should feel equally premium, not simplified.
`,
  `
Safe-variant reinforcement B:
Maintain hosiery realism at the same technical level: denier-aware translucency, stretch gradients, cuff pressure transitions, and ankle wrinkle detail. Keep posture elegant and physically grounded in heels, with realistic center-of-mass and shadow anchoring.
`,
  `
Safe-variant reinforcement C:
Lighting, reflections, skin microtexture, and identity fidelity remain non-negotiable. The backup should be campaign-ready with conservative styling, not a lower-quality fallback. Preserve cinematic tone, noir depth, and polished finish.
`,
  `
Safe-variant quality gate:
No anatomy drift, no warped hands or feet, no fabric clipping, no noisy lace artifacts, no face mismatch to reference. Deliver a refined, coverage-forward cocktail aesthetic with uncompromised photoreal physics.
`
];

function countWords(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function padToTarget(text, target, blocks) {
  let output = text.trim();
  let i = 0;
  while (countWords(output) < target) {
    output += `\n\n${blocks[i % blocks.length].trim()}`;
    i += 1;
    if (i > 50) break;
  }
  return output;
}

function buildPrimaryPrompt(item) {
  const base = `
${foundationIdentity.trim()}

Scene direction:
Create a high-end Vegas speakeasy frame featuring ${item.scene}. The subject should inhabit the space with believable interaction and environmental integration, not appear composited. Build layered depth with foreground hints, mid-ground subject clarity, and background practical-light storytelling. Preserve realistic atmospheric perspective through haze and reflective surfaces.

Attire direction (daring):
Wardrobe is ${item.daringAttire}. Style should be daring, fashion-forward, and nightlife editorial. The garment must remain physically coherent at all seams, edges, and tension points. Emphasize material behavior under movement, seating pressure, and directional lighting. Hosiery must remain explicitly visible and physically accurate.

Pose and narrative:
Subject action is ${item.action}. Keep posture dynamic but plausible, with mechanically consistent weight transfer, foot pressure in heels, shoulder-pelvis counterbalance, and natural hand articulation.

${foundationPhysics.trim()}

${foundationCamera.trim()}

${foundationGuardrails.trim()}
`;
  return padToTarget(base, 1800, reinforcementBlocksPrimary);
}

function buildSafePrompt(item) {
  const base = `
${foundationIdentity.trim()}

Scene direction:
Keep the same Vegas speakeasy concept for ${item.scene}, with identical environmental quality, production value, and cinematic mood. Maintain the same practical-light logic, haze handling, and reflection fidelity.

Attire direction (safer backup):
Wardrobe is ${item.safeAttire}. This is a safer, coverage-forward variant intended for broader acceptance while preserving luxury impact. Keep the silhouette polished and elegant; retain thigh-high hosiery as a core styling element with the same rendering precision.

Pose and narrative:
Use the same narrative stance as the primary: ${item.action}. Preserve confidence and editorial intent with physically consistent balance and natural gesture mechanics.

${foundationPhysics.trim()}

${foundationCamera.trim()}

${safetyOverlay.trim()}

${foundationGuardrails.trim()}
`;
  return padToTarget(base, 1800, reinforcementBlocksSafe);
}

const lines = [];
lines.push('# Vegas Speakeasy Prompt Pack (20 Concepts, ~1,800 Words Each Primary + Safe Backup)');
lines.push('');
lines.push('Reference usage: lock identity to the provided reference image for an adult subject (25+).');
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

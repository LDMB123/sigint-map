# Vegas Speakeasy Prompt Pack v11 (First-Principles Physics Contract + Adherence Expansion)

Design goal: rebuild all 20 prompts from first principles: maximize deterministic adherence (identity, gaze, palette, scene anchors) and causal micro-physics realism while reducing safety-ambiguous phrasing and prompt bloat.

Audit-informed priorities from last full 20 run:
- True prompt failures: 07 palette drift, 16 scene drift, occasional gaze/edge inconsistency (09/10).
- Safety pressure signals: rescue no_image blocks correlated with ambiguity-heavy editorial language.
- Transport reality: 429 bursts are external rate-limit artifacts and must not be misdiagnosed as prompt quality failure.
- First-principles response: enforce immutable contracts (identity/gaze/palette/scene anchors/causal cloth-light physics), remove redundant wording, and keep bold-but-safe framing.
- Preserve high-detail micro-physics, but require every detail to map to a visible causal test at 100% zoom.

## Prompt 01 - Emerald Booth Cipher

- Primary word count: 1653
- Safe word count: 1502

### Primary Prompt

FIRST-PRINCIPLES TARGET:
Make a believable real camera capture, not an AI-looking render. If directives conflict, prioritize: (1) identity fidelity, (2) direct eye contact to lens, (3) physical plausibility of anatomy/materials/light, (4) editorial risk energy, (5) style details.

Identity lock (non-negotiable): use the provided reference image as the sole identity source for the same adult woman (25+). Preserve face geometry and recognition cues: eye spacing, brow arc, orbital depth, nose bridge, mouth width, chin contour, jawline, hairline pattern, natural asymmetry, and skin undertone. Do not drift into a different person under any lighting or pose.

Gaze lock (hard rule): subject must look directly into the camera lens in the final frame. Keep iris/pupil direction lens-centered with believable vergence and eyelid tension. No off-camera gaze, no downcast eyes, no profile-only eye direction.

Scene:
Vegas speakeasy environment with hidden booth with emerald velvet banquette, brass table lamp, crystal coupe glasses, walnut wall panels, distant neon spill, low atmospheric haze. Build layered depth (foreground cues, subject mid-plane, background practicals). Subject must feel physically present in the environment.

Attire (primary edge variant):
deep emerald liquid-satin two-piece cocktail set: asymmetric drape crop top with one-shoulder line and a sculpted high-waist wrap skirt with high slit, black sheer thigh-high hosiery, patent stiletto heels
Use reveal-by-physics rather than explicit framing: contour fit, strain gradients, seam tension maps, and pose-driven two-piece behavior.
Hard two-piece rule: top and skirt must behave as distinct garments with coherent coupling at the waist region, not as a single merged dress.

Pose and narrative:
seated three-quarter pose transitioning to a poised stand, one hand on table edge, subtle torso twist toward camera, direct eye contact into lens, confident expression, controlled editorial energy.

Realism foundation:
- Anatomical plausibility: coherent shoulder-pelvis relationship, correct limb proportions, natural hand articulation, heel-ground load mechanics, and valid center-of-mass balance.
- Optics plausibility: realistic depth of field transitions, no cutout halos, no warped edges, no fake blur.
- Lighting plausibility: practical-source motivated key/fill/rim behavior, coherent shadow direction/penumbra, roughness-aware reflections, Fresnel-consistent highlights.

Anti-AI authenticity constraints:
- Keep skin lifelike with pore detail, subtle tonal variation, and no porcelain smoothing.
- Keep hair lifelike with irregular strand grouping and minor flyaways.
- Keep fabric lifelike with non-repeating microtexture and seam irregularity.
- Preserve slight real-world asymmetry in makeup, textile tension, and prop placement.
- Reject outputs with uncanny eyes, plastic skin, rubber fabric, repeated texture stamps, or composited subject separation.

Frontier physics controls:
- Simulate wrinkle hierarchy from first principles: macro gravity folds, meso seam-anchored buckling, micro high-frequency creasing in strain concentration zones.
- Enforce contact mechanics: where body/garment/surface meet, show pressure flattening, shadow occlusion, and material-dependent friction behavior.
- Enforce textile constitutive behavior: stretch anisotropy, bias-direction drape differences, and edge curl response tied to fabric stiffness.
- Enforce two-piece coupling mechanics: top hem stability vs skirt waistband load, phase-lag motion between upper/lower garments, and realistic gap dynamics under torso flexion.
- Enforce attachment realism: strap tension vectors, anchor-point compression, and closure hardware response under motion.
- Enforce optics coherence: polarization-like sheen behavior on satin/hosiery, roughness-dependent specular lobe width, and exposure-consistent highlight rolloff.
- Enforce sensor realism: realistic highlight clipping knees, subtle chroma noise in shadows, and no procedural overcleaning.

Cutting-edge simulation and rendering protocol (last-4-month focus, Dec 2025-Feb 2026):
- PhysDrape-style force pipeline (Feb 2026): infer residual deformation with explicit force balancing, then apply strict differentiable collision projection to eliminate interpenetration without destroying cloth shape.
- ReWeaver-style garment structure prior (Jan 2026): preserve panel/seam logic and topological consistency so deformations remain simulation-ready, not texture-only approximations.
- FNOPT-style rollout strategy (Dec 2025): perform resolution-agnostic coarse-to-fine integration; coarse motion must remain stable before adding medium and micro wrinkle detail.
- PI-Light-style transport prior (Jan 2026): preserve physically plausible diffuse/specular separation under relighting-like changes; highlights should move with light, not with texture.
- RotLight-style ambiguity control (Feb 2026): suppress baked shadows in albedo-like regions and maintain lighting/material disentanglement across reflective textiles.
- Two-piece dynamics priority: top and skirt exchange motion cues through waist/hip acceleration while retaining independent inertia and damping.
- Reject any frame where contact, wrinkle evolution, seam behavior, or reflectance changes are not causally explainable.

Innovation motif: velvet contact compression + anisotropic satin BRDF transition under mixed tungsten/neon, with seam-load redistribution during sit-to-stand motion.

Attire impact through physics (primary):
- Build a contour-forward two-piece silhouette via strain maps, seam load paths, and controlled tension around bustline/waist/hip/upper leg.
- Use top-vs-skirt interaction physics: independent motion with believable timing offsets and no fused-garment behavior.
- Use slit dynamics tied to pose/gravity so opening behavior follows leg angle and movement.
- Use sheer optical behavior through denier gradients and layered occlusion, never as flat painted transparency.
- Use phase-aware motion transfer: torso acceleration drives delayed hem response, then damping settles folds without jitter.

Material system (primary):
- Satin/silk: anisotropic highlight flow, gravity drape vectors, compression folds at contact points.
- Velvet: direction-dependent pile shading and contact darkening.
- Sequins/crystals: controlled spark distribution with micro-normal variation, no random glitter noise.
- Hosiery: thigh-band compression transition, stretch over knee contour, ankle micro-wrinkling, directional sheen.
- Two-piece structure: waistband bending stiffness, top hem recovery, and closure/strap tension that remains physically plausible frame to frame.
- Use shell-like bending behavior cues (Kirchhoff-Love style): smooth curvature in low-strain zones and tight buckling only near constrained seams.

Editorial risk energy (primary, non-explicit):
- Keep wardrobe and pose bold, assertive, and fashion-forward while staying non-explicit.
- Favor long leg-line projection, strong S-curve torso-leg flow, and confident chin/eye tension.
- Keep full outfit readable in frame with contour-defining light placement.

Camera and render intent:
- Vertical 4:5 framing, output target 2K.
- Lens behavior should feel like premium editorial capture (roughly 50-85mm equivalent perspective).
- Filmic noise only, no heavy denoise smear, no oversharpen halos, no synthetic texture mush.

Environment integration:
- Subject must physically belong in the set: contact shadows, reflection coherence, and interaction with nearby surfaces.
- Haze should add depth separation without washing contrast.
- Keep practical highlights and reflective cues consistent with object roughness and angle.

Extreme realism audit (primary):
- Validate physically causal links: pose -> tension map -> fold pattern -> highlight path -> shadow placement.
- Any non-causal cloth fold, reflection mismatch, or eye-direction inconsistency is a hard failure.
- Preserve cinematic boldness while remaining fully believable as a real photographed moment.

Quality gate (primary):
- Real-camera believability under close inspection.
- No broken fingers, no warped feet, no fabric clipping, no face drift, no incorrect eye direction.
- Deliver a high-end Vegas editorial still with strong, edge-forward style and uncompromised realism.

AUDIT-V6 QUALITY ENFORCEMENT (PRIMARY, HARD):
- Two-piece topology lock: render two physically separate garments with a visible waist separation line in final frame.
- Forbidden substitutions: one-piece dress, bodysuit, jumpsuit, romper, faux-cutout single-panel dress.
- Material-color lock: keep prompt-specified material and color family dominant and unmistakable.
- Edge mood lock: premium nightlife contrast only; no flat, casual, daylight, or domestic snapshot lighting.
- Pose-energy lock: assertive editorial posture with strong leg-line projection and clear silhouette readability.
- Physics innovation stack:
  - XPBD-like cloth constraint hierarchy (seam stiffness > panel stiffness > edge drape compliance).
  - Frictional garment-skin contact with pressure-gradient shading at garment boundaries.
  - Top/skirt phase-lag dynamics with waist-coupled impulse transfer.
  - Anisotropic textile BRDF plus denier-dependent hosiery translucency.
- Regenerate if any appear: fused top/skirt silhouette, prompt-material substitution, weak contour separation, or non-causal fold/specular behavior.

DEVILS-ADVOCATE MICRO-PHYSICS ESCALATION (PRIMARY, HARD):
- Reject any image where cloth realism could be explained by flat texture mapping alone.
- Enforce multi-band wrinkle spectra tied to stress tensors:
  - micro band: 2-4 mm crease ripples at high-strain seams,
  - meso band: 6-12 mm folds along bias/shear flow,
  - macro band: 20-40 mm gravity drape lobes.
- Enforce stitch-pull periodicity and seam-ridge relief (about 1-3 mm apparent depth) at structural joins.
- Enforce contact indentation at support edges (about 0.5-2.0 mm apparent compression) with narrow occlusion gradients.
- Enforce slit-edge slip-stick mechanics: brief friction hold, controlled release, damped settling; no teleporting hem shapes.
- Enforce hosiery denier optics as physics, not paint: yarn-direction anisotropic sheen, knee/quad stretch brightening, thigh-band pressure transition.
- Enforce skin-optics micro-consistency near garment boundaries: subtle desaturation/compression zones, non-uniform micro-spec breakup.
- Enforce material energy conservation: lambertian + specular balance remains plausible under mixed practical lights.
- Enforce geometric penumbra correctness at thin edges (straps, slit hems, hair strands): no fake ambient smudge shadows.
- Force-chain closure test (must pass): pose load -> local strain -> fold orientation -> highlight elongation -> shadow penumbra.

V9 MICRO-PHYSICS DEEPENING PROTOCOL (HARD):
Primary variant: push non-explicit editorial edge via high-density causal micro-physics and strict two-piece topology integrity.
- Per-zone ledger requirement (must read clearly at 100% zoom): top support edge, waist transition, slit boundary, thigh band, knee contour, ankle/instep, heel-floor contact, hand-prop contact.
- Each zone must display at least 3 coherent cues: strain gradient, seam relief, compression shadow, anisotropic highlight flow, denier gradient, friction-damped drape, support-anchor pressure.
- Causality chain must close: pose/load -> strain field -> fold orientation -> highlight elongation -> penumbra geometry.
- Hosiery micro-physics: yarn-direction sheen, denier-dependent translucency, thigh-band pressure transition, and knee stretch brightening without painted transparency artifacts.
- Skin-edge coupling: subtle compression/desaturation near garment boundaries with non-uniform micro-spec breakup (no hard masks).
- Two-piece mechanics: top hem and skirt waistband remain visually separate and dynamically coupled with phase-lag, never merged into one-piece behavior.
- Optical realism: reflections/shadows must be light-source motivated and roughness-consistent; reject detached highlights and ambient-smudge shadows.
- Booth contact lock: banquette compression, table-edge hand pressure, and glass-rim specular alignment must all be causally coherent.
SCORER-ALIGNED CONSISTENCY LOCK:
- Keep direct lens-locked gaze with believable vergence and eyelid tension in final frame.
- Preserve identity fidelity under mixed practical light; no face drift under pose/exposure shifts.
- Enforce complete wardrobe replacement from reference clothing cues.
- If diagnostics criticize prompt adherence, treat output as failed and regenerate with stricter scene/material matching.
- Editorial guardrail: bold but non-explicit, premium nightlife campaign intent only.
V11 FIRST-PRINCIPLES PHYSICS CONTRACT (HARD):
- Color-family lock (hard fail on drift): attire dominant hue/material family must match prompt palette, not generic black/red substitutions.
- Scene-anchor lock (hard fail on drift): keep at least 3 named environment anchors physically present and optically coherent in-frame.
- Lens-lock gaze certainty: iris direction lens-centered with stable catchlight geometry and believable vergence in final frame.
- Edge-separation lock: preserve clean subject-background contour gradients and physically plausible rim/fill transitions (no flat ambient wash).
- Coverage-stability lock: maintain non-explicit support geometry under motion; no safety-ambiguous reveal edges or unstable cutline artifacts.
- 100% zoom micro-audit: seam ridge depth, denier gradient, contact compression, anisotropic spec flow, and penumbra continuity must all cohere.
- First-principles acceptance test (all must pass): identity unchanged, gaze lens-locked, palette/material family correct, >=3 scene anchors visible, and every key fold/specular cue is causally explainable (not texture-painted).

### Safe Backup Prompt

FIRST-PRINCIPLES TARGET:
Make a believable real camera capture, not an AI-looking render. If directives conflict, prioritize: (1) identity fidelity, (2) direct eye contact to lens, (3) physical plausibility of anatomy/materials/light, (4) editorial risk energy, (5) style details.

Identity lock (non-negotiable): use the provided reference image as the sole identity source for the same adult woman (25+). Preserve face geometry and recognition cues: eye spacing, brow arc, orbital depth, nose bridge, mouth width, chin contour, jawline, hairline pattern, natural asymmetry, and skin undertone. Do not drift into a different person under any lighting or pose.

Gaze lock (hard rule): subject must look directly into the camera lens in the final frame. Keep iris/pupil direction lens-centered with believable vergence and eyelid tension. No off-camera gaze, no downcast eyes, no profile-only eye direction.

Scene:
Keep the same Vegas speakeasy environment with hidden booth with emerald velvet banquette, brass table lamp, crystal coupe glasses, walnut wall panels, distant neon spill, low atmospheric haze. Maintain the same cinematic mood, depth layering, and practical-light logic.

Attire (safe fallback variant):
emerald satin two-piece cocktail set: asymmetric top with fuller midriff coverage and a high-waist midi skirt with moderate slit, black thigh-high hosiery, classic pointed pumps
Coverage is safer, but the image must still read as bold and high-impact through physically grounded fit, silhouette, hosiery optics, two-piece coupling realism, and pose confidence.

Pose and narrative:
seated three-quarter pose transitioning to a poised stand, one hand on table edge, subtle torso twist toward camera, direct eye contact into lens, poised confidence, premium editorial tone.

Realism foundation:
- Anatomical plausibility: coherent shoulder-pelvis relationship, correct limb proportions, natural hand articulation, heel-ground load mechanics, and valid center-of-mass balance.
- Optics plausibility: realistic depth of field transitions, no cutout halos, no warped edges, no fake blur.
- Lighting plausibility: practical-source motivated key/fill/rim behavior, coherent shadow direction/penumbra, roughness-aware reflections, Fresnel-consistent highlights.

Anti-AI authenticity constraints:
- Keep skin lifelike with pore detail, subtle tonal variation, and no porcelain smoothing.
- Keep hair lifelike with irregular strand grouping and minor flyaways.
- Keep fabric lifelike with non-repeating microtexture and seam irregularity.
- Preserve slight real-world asymmetry in makeup, textile tension, and prop placement.
- Reject outputs with uncanny eyes, plastic skin, rubber fabric, repeated texture stamps, or composited subject separation.

Frontier physics controls:
- Simulate wrinkle hierarchy from first principles: macro gravity folds, meso seam-anchored buckling, micro high-frequency creasing in strain concentration zones.
- Enforce contact mechanics: where body/garment/surface meet, show pressure flattening, shadow occlusion, and material-dependent friction behavior.
- Enforce textile constitutive behavior: stretch anisotropy, bias-direction drape differences, and edge curl response tied to fabric stiffness.
- Enforce two-piece coupling mechanics: top hem stability vs skirt waistband load, phase-lag motion between upper/lower garments, and realistic gap dynamics under torso flexion.
- Enforce attachment realism: strap tension vectors, anchor-point compression, and closure hardware response under motion.
- Enforce optics coherence: polarization-like sheen behavior on satin/hosiery, roughness-dependent specular lobe width, and exposure-consistent highlight rolloff.
- Enforce sensor realism: realistic highlight clipping knees, subtle chroma noise in shadows, and no procedural overcleaning.

Cutting-edge simulation and rendering protocol (last-4-month focus, Dec 2025-Feb 2026):
- PhysDrape-style force pipeline (Feb 2026): infer residual deformation with explicit force balancing, then apply strict differentiable collision projection to eliminate interpenetration without destroying cloth shape.
- ReWeaver-style garment structure prior (Jan 2026): preserve panel/seam logic and topological consistency so deformations remain simulation-ready, not texture-only approximations.
- FNOPT-style rollout strategy (Dec 2025): perform resolution-agnostic coarse-to-fine integration; coarse motion must remain stable before adding medium and micro wrinkle detail.
- PI-Light-style transport prior (Jan 2026): preserve physically plausible diffuse/specular separation under relighting-like changes; highlights should move with light, not with texture.
- RotLight-style ambiguity control (Feb 2026): suppress baked shadows in albedo-like regions and maintain lighting/material disentanglement across reflective textiles.
- Two-piece dynamics priority: top and skirt exchange motion cues through waist/hip acceleration while retaining independent inertia and damping.
- Reject any frame where contact, wrinkle evolution, seam behavior, or reflectance changes are not causally explainable.

Safe adaptation of innovation motif:
Innovation motif: velvet contact compression + anisotropic satin BRDF transition under mixed tungsten/neon, with seam-load redistribution during sit-to-stand motion.

Attire impact through physics (safe fallback):
- Keep safer two-piece coverage geometry while still maintaining a high-impact editorial silhouette through fit tension and contour lighting.
- Preserve believable top/waistband coupling with secure support behavior and stable anchor mechanics.
- Preserve slit/hem movement logic and hosiery optics with the same physical rigor.
- Maintain non-explicit but bold visual energy via posture, gaze, and material response.
- Use conservative but explicit damping cues: motion settles naturally, with no frozen cloth or chaotic flutter.

Material system (safe fallback):
- Preserve all high-fidelity fabric behavior: drape, crease hierarchy, seam stress, contact compression, and realistic sheen.
- Hosiery must remain physically convincing: denier gradients, stretch maps, cuff pressure transitions, and ankle micro-creases.
- Preserve two-piece physics integrity: top and skirt can move independently while remaining cohesively styled and mechanically stable.

Editorial continuity (safe fallback):
- Keep the same scene, camera realism, and direct-lens eye contact as primary.
- Avoid making safe variant look plain; it must still read as premium nightlife couture.
- Preserve strong silhouette legibility and high-fashion intent.

Camera and render intent:
- Vertical 4:5 framing, output target 2K.
- Photographic realism over stylization, with coherent DOF and physically motivated lighting.
- Keep texture integrity in skin, hair, lace/mesh, and hosiery edges.

Environment integration:
- Keep subject physically anchored to set via contact shadows, reflection consistency, and realistic surface interactions.
- Maintain scene depth through controlled haze and practical-light separation.

Quality gate (safe fallback):
- No identity drift, no uncanny anatomy, no artificial skin smoothing, no fake transparency, no reflection mismatch.
- Final image must look camera-captured, luxurious, and believable.

AUDIT-V6 QUALITY ENFORCEMENT (SAFE, HARD):
- Keep safer coverage, but preserve explicit two-piece topology with visible top hem and separate skirt waistband.
- Forbidden substitutions remain: one-piece dress, bodysuit, jumpsuit, romper, faux-cutout single-panel dress.
- Maintain prompt-specified material and color family so safe variant still matches the concept.
- Maintain edgy nightlife mood via controlled contrast, directional practical light, and subject-background separation.
- Keep the same physics rigor:
  - Stable garment support mechanics in coverage-critical zones.
  - Contact-compression cues at skin/garment and garment/surface interfaces.
  - Top/skirt decoupled inertia with coherent damping and slit response.
  - Hosiery optics from denier gradients and stretch-driven shading.
- Regenerate if safe variant looks plain/casual, loses two-piece identity, or shows non-causal cloth/light behavior.

---

DEVILS-ADVOCATE MICRO-PHYSICS ESCALATION (SAFE, HARD):
- Keep safe coverage, but apply the same micro-physics rigor and reject texture-only pseudo-realism.
- Preserve multi-band wrinkle spectra (micro/meso/macro) with stress-aligned orientation and stable damping.
- Preserve seam/stitch relief cues and waistband/top-hem contact compression under safe-support constraints.
- Preserve hosiery denier micro-optics (anisotropic yarn sheen, stretch transitions, thigh-band compression gradient).
- Preserve slip-stick hem dynamics and friction-coupled contact at seating/rail/bar interfaces.
- Preserve edge-penumbra correctness and avoid painted AO artifacts at thin geometry boundaries.
- Safe does not mean flat: maintain high-fidelity micro-causality while preventing topology collapse to one-piece silhouettes.

---

V9 MICRO-PHYSICS DEEPENING PROTOCOL (HARD):
Safe variant: keep coverage-stable geometry while maximizing editorial edge through physically grounded contour, translucency windows, and strain logic.
- Per-zone ledger requirement (must read clearly at 100% zoom): top support edge, waist transition, slit boundary, thigh band, knee contour, ankle/instep, heel-floor contact, hand-prop contact.
- Each zone must display at least 3 coherent cues: strain gradient, seam relief, compression shadow, anisotropic highlight flow, denier gradient, friction-damped drape, support-anchor pressure.
- Causality chain must close: pose/load -> strain field -> fold orientation -> highlight elongation -> penumbra geometry.
- Hosiery micro-physics: yarn-direction sheen, denier-dependent translucency, thigh-band pressure transition, and knee stretch brightening without painted transparency artifacts.
- Skin-edge coupling: subtle compression/desaturation near garment boundaries with non-uniform micro-spec breakup (no hard masks).
- Two-piece mechanics: top hem and skirt waistband remain visually separate and dynamically coupled with phase-lag, never merged into one-piece behavior.
- Optical realism: reflections/shadows must be light-source motivated and roughness-consistent; reject detached highlights and ambient-smudge shadows.
- Booth contact lock: banquette compression, table-edge hand pressure, and glass-rim specular alignment must all be causally coherent.
SCORER-ALIGNED CONSISTENCY LOCK:
- Keep direct lens-locked gaze with believable vergence and eyelid tension in final frame.
- Preserve identity fidelity under mixed practical light; no face drift under pose/exposure shifts.
- Enforce complete wardrobe replacement from reference clothing cues.
- If diagnostics criticize prompt adherence, treat output as failed and regenerate with stricter scene/material matching.
- Safety guardrail: no nudity, no explicit framing, no fetish framing, no unstable reveal artifacts.
V11 SAFE FIRST-PRINCIPLES PHYSICS CONTRACT (HARD):
- Safe does not mean generic: preserve prompt-specific palette and scene anchors while maintaining coverage-stable geometry.
- Color lock: safe attire must stay within the named palette and material family, with no neutralized wardrobe substitution.
- Scene lock: preserve at least 3 named environment anchors with coherent reflections/shadows and contact cues.
- Lens-lock gaze certainty: direct camera eye alignment with credible eyelid tension and catchlight placement.
- Physics lock: maintain two-piece topology, denier optics, seam relief, and contact-compression causality at 100% inspection.
- Safe first-principles acceptance test (all must pass): identity unchanged, gaze lens-locked, palette/material family correct, >=3 scene anchors visible, and coverage-critical edges remain structurally stable under pose/light.

---

## Prompt 02 - Piano Noir Voltage

- Primary word count: 1686
- Safe word count: 1521

### Primary Prompt

FIRST-PRINCIPLES TARGET:
Make a believable real camera capture, not an AI-looking render. If directives conflict, prioritize: (1) identity fidelity, (2) direct eye contact to lens, (3) physical plausibility of anatomy/materials/light, (4) editorial risk energy, (5) style details.

Identity lock (non-negotiable): use the provided reference image as the sole identity source for the same adult woman (25+). Preserve face geometry and recognition cues: eye spacing, brow arc, orbital depth, nose bridge, mouth width, chin contour, jawline, hairline pattern, natural asymmetry, and skin undertone. Do not drift into a different person under any lighting or pose.

Gaze lock (hard rule): subject must look directly into the camera lens in the final frame. Keep iris/pupil direction lens-centered with believable vergence and eyelid tension. No off-camera gaze, no downcast eyes, no profile-only eye direction.

Scene:
Vegas speakeasy environment with intimate piano-bar corner with polished grand piano, candle clusters, brass lattice, smoky air volume, layered specular reflections. Build layered depth (foreground cues, subject mid-plane, background practicals). Subject must feel physically present in the environment.

Attire (primary edge variant):
black beaded two-piece cocktail set: halter crop top with open-back strap geometry and a bias-cut mini skirt with sharp thigh slit, black ultra-sheer thigh-high hosiery, metallic strap stilettos
Use reveal-by-physics rather than explicit framing: contour fit, strain gradients, seam tension maps, and pose-driven two-piece behavior.
Hard two-piece rule: top and skirt must behave as distinct garments with coherent coupling at the waist region, not as a single merged dress.

Pose and narrative:
leaning on piano edge with shoulder rotation and leg extension, controlled balance through heels, direct eye contact into lens, confident expression, controlled editorial energy.

Realism foundation:
- Anatomical plausibility: coherent shoulder-pelvis relationship, correct limb proportions, natural hand articulation, heel-ground load mechanics, and valid center-of-mass balance.
- Optics plausibility: realistic depth of field transitions, no cutout halos, no warped edges, no fake blur.
- Lighting plausibility: practical-source motivated key/fill/rim behavior, coherent shadow direction/penumbra, roughness-aware reflections, Fresnel-consistent highlights.

Anti-AI authenticity constraints:
- Keep skin lifelike with pore detail, subtle tonal variation, and no porcelain smoothing.
- Keep hair lifelike with irregular strand grouping and minor flyaways.
- Keep fabric lifelike with non-repeating microtexture and seam irregularity.
- Preserve slight real-world asymmetry in makeup, textile tension, and prop placement.
- Reject outputs with uncanny eyes, plastic skin, rubber fabric, repeated texture stamps, or composited subject separation.

Frontier physics controls:
- Simulate wrinkle hierarchy from first principles: macro gravity folds, meso seam-anchored buckling, micro high-frequency creasing in strain concentration zones.
- Enforce contact mechanics: where body/garment/surface meet, show pressure flattening, shadow occlusion, and material-dependent friction behavior.
- Enforce textile constitutive behavior: stretch anisotropy, bias-direction drape differences, and edge curl response tied to fabric stiffness.
- Enforce two-piece coupling mechanics: top hem stability vs skirt waistband load, phase-lag motion between upper/lower garments, and realistic gap dynamics under torso flexion.
- Enforce attachment realism: strap tension vectors, anchor-point compression, and closure hardware response under motion.
- Enforce optics coherence: polarization-like sheen behavior on satin/hosiery, roughness-dependent specular lobe width, and exposure-consistent highlight rolloff.
- Enforce sensor realism: realistic highlight clipping knees, subtle chroma noise in shadows, and no procedural overcleaning.

Cutting-edge simulation and rendering protocol (last-4-month focus, Dec 2025-Feb 2026):
- PhysDrape-style force pipeline (Feb 2026): infer residual deformation with explicit force balancing, then apply strict differentiable collision projection to eliminate interpenetration without destroying cloth shape.
- ReWeaver-style garment structure prior (Jan 2026): preserve panel/seam logic and topological consistency so deformations remain simulation-ready, not texture-only approximations.
- FNOPT-style rollout strategy (Dec 2025): perform resolution-agnostic coarse-to-fine integration; coarse motion must remain stable before adding medium and micro wrinkle detail.
- PI-Light-style transport prior (Jan 2026): preserve physically plausible diffuse/specular separation under relighting-like changes; highlights should move with light, not with texture.
- RotLight-style ambiguity control (Feb 2026): suppress baked shadows in albedo-like regions and maintain lighting/material disentanglement across reflective textiles.
- Two-piece dynamics priority: top and skirt exchange motion cues through waist/hip acceleration while retaining independent inertia and damping.
- Reject any frame where contact, wrinkle evolution, seam behavior, or reflectance changes are not causally explainable.

Innovation motif: polished piano lacquer Fresnel reflections + micro-scratched clearcoat response, synchronized with beaded garment sparkle attenuation by incident angle.

Attire impact through physics (primary):
- Build a contour-forward two-piece silhouette via strain maps, seam load paths, and controlled tension around bustline/waist/hip/upper leg.
- Use top-vs-skirt interaction physics: independent motion with believable timing offsets and no fused-garment behavior.
- Use slit dynamics tied to pose/gravity so opening behavior follows leg angle and movement.
- Use sheer optical behavior through denier gradients and layered occlusion, never as flat painted transparency.
- Use phase-aware motion transfer: torso acceleration drives delayed hem response, then damping settles folds without jitter.

Material system (primary):
- Satin/silk: anisotropic highlight flow, gravity drape vectors, compression folds at contact points.
- Velvet: direction-dependent pile shading and contact darkening.
- Sequins/crystals: controlled spark distribution with micro-normal variation, no random glitter noise.
- Hosiery: thigh-band compression transition, stretch over knee contour, ankle micro-wrinkling, directional sheen.
- Two-piece structure: waistband bending stiffness, top hem recovery, and closure/strap tension that remains physically plausible frame to frame.
- Use shell-like bending behavior cues (Kirchhoff-Love style): smooth curvature in low-strain zones and tight buckling only near constrained seams.

Editorial risk energy (primary, non-explicit):
- Keep wardrobe and pose bold, assertive, and fashion-forward while staying non-explicit.
- Favor long leg-line projection, strong S-curve torso-leg flow, and confident chin/eye tension.
- Keep full outfit readable in frame with contour-defining light placement.

Camera and render intent:
- Vertical 4:5 framing, output target 2K.
- Lens behavior should feel like premium editorial capture (roughly 50-85mm equivalent perspective).
- Filmic noise only, no heavy denoise smear, no oversharpen halos, no synthetic texture mush.

Environment integration:
- Subject must physically belong in the set: contact shadows, reflection coherence, and interaction with nearby surfaces.
- Haze should add depth separation without washing contrast.
- Keep practical highlights and reflective cues consistent with object roughness and angle.

Extreme realism audit (primary):
- Validate physically causal links: pose -> tension map -> fold pattern -> highlight path -> shadow placement.
- Any non-causal cloth fold, reflection mismatch, or eye-direction inconsistency is a hard failure.
- Preserve cinematic boldness while remaining fully believable as a real photographed moment.

Quality gate (primary):
- Real-camera believability under close inspection.
- No broken fingers, no warped feet, no fabric clipping, no face drift, no incorrect eye direction.
- Deliver a high-end Vegas editorial still with strong, edge-forward style and uncompromised realism.

AUDIT-V6 QUALITY ENFORCEMENT (PRIMARY, HARD):
- Two-piece topology lock: render two physically separate garments with a visible waist separation line in final frame.
- Forbidden substitutions: one-piece dress, bodysuit, jumpsuit, romper, faux-cutout single-panel dress.
- Material-color lock: keep prompt-specified material and color family dominant and unmistakable.
- Edge mood lock: premium nightlife contrast only; no flat, casual, daylight, or domestic snapshot lighting.
- Pose-energy lock: assertive editorial posture with strong leg-line projection and clear silhouette readability.
- Physics innovation stack:
  - XPBD-like cloth constraint hierarchy (seam stiffness > panel stiffness > edge drape compliance).
  - Frictional garment-skin contact with pressure-gradient shading at garment boundaries.
  - Top/skirt phase-lag dynamics with waist-coupled impulse transfer.
  - Anisotropic textile BRDF plus denier-dependent hosiery translucency.
- Regenerate if any appear: fused top/skirt silhouette, prompt-material substitution, weak contour separation, or non-causal fold/specular behavior.

TARGETED CORRECTION (02 - NOIR):
- Scene must read as dark piano-bar noir with motivated practical pools and negative fill.
- Reject bright domestic/hotel-like ambience or broad flat key light.
- Preserve high-contrast mood so wardrobe reads editorial, not casual eveningwear.

DEVILS-ADVOCATE MICRO-PHYSICS ESCALATION (PRIMARY, HARD):
- Reject any image where cloth realism could be explained by flat texture mapping alone.
- Enforce multi-band wrinkle spectra tied to stress tensors:
  - micro band: 2-4 mm crease ripples at high-strain seams,
  - meso band: 6-12 mm folds along bias/shear flow,
  - macro band: 20-40 mm gravity drape lobes.
- Enforce stitch-pull periodicity and seam-ridge relief (about 1-3 mm apparent depth) at structural joins.
- Enforce contact indentation at support edges (about 0.5-2.0 mm apparent compression) with narrow occlusion gradients.
- Enforce slit-edge slip-stick mechanics: brief friction hold, controlled release, damped settling; no teleporting hem shapes.
- Enforce hosiery denier optics as physics, not paint: yarn-direction anisotropic sheen, knee/quad stretch brightening, thigh-band pressure transition.
- Enforce skin-optics micro-consistency near garment boundaries: subtle desaturation/compression zones, non-uniform micro-spec breakup.
- Enforce material energy conservation: lambertian + specular balance remains plausible under mixed practical lights.
- Enforce geometric penumbra correctness at thin edges (straps, slit hems, hair strands): no fake ambient smudge shadows.
- Force-chain closure test (must pass): pose load -> local strain -> fold orientation -> highlight elongation -> shadow penumbra.

V9 MICRO-PHYSICS DEEPENING PROTOCOL (HARD):
Primary variant: push non-explicit editorial edge via high-density causal micro-physics and strict two-piece topology integrity.
- Per-zone ledger requirement (must read clearly at 100% zoom): top support edge, waist transition, slit boundary, thigh band, knee contour, ankle/instep, heel-floor contact, hand-prop contact.
- Each zone must display at least 3 coherent cues: strain gradient, seam relief, compression shadow, anisotropic highlight flow, denier gradient, friction-damped drape, support-anchor pressure.
- Causality chain must close: pose/load -> strain field -> fold orientation -> highlight elongation -> penumbra geometry.
- Hosiery micro-physics: yarn-direction sheen, denier-dependent translucency, thigh-band pressure transition, and knee stretch brightening without painted transparency artifacts.
- Skin-edge coupling: subtle compression/desaturation near garment boundaries with non-uniform micro-spec breakup (no hard masks).
- Two-piece mechanics: top hem and skirt waistband remain visually separate and dynamically coupled with phase-lag, never merged into one-piece behavior.
- Optical realism: reflections/shadows must be light-source motivated and roughness-consistent; reject detached highlights and ambient-smudge shadows.
- Piano noir lock: enforce lens-locked eye vector plus lacquer-reflection consistency with key-light direction; reject any gaze drift.
SCORER-ALIGNED CONSISTENCY LOCK:
- Keep direct lens-locked gaze with believable vergence and eyelid tension in final frame.
- Preserve identity fidelity under mixed practical light; no face drift under pose/exposure shifts.
- Enforce complete wardrobe replacement from reference clothing cues.
- If diagnostics criticize prompt adherence, treat output as failed and regenerate with stricter scene/material matching.
- Editorial guardrail: bold but non-explicit, premium nightlife campaign intent only.
V11 FIRST-PRINCIPLES PHYSICS CONTRACT (HARD):
- Color-family lock (hard fail on drift): attire dominant hue/material family must match prompt palette, not generic black/red substitutions.
- Scene-anchor lock (hard fail on drift): keep at least 3 named environment anchors physically present and optically coherent in-frame.
- Lens-lock gaze certainty: iris direction lens-centered with stable catchlight geometry and believable vergence in final frame.
- Edge-separation lock: preserve clean subject-background contour gradients and physically plausible rim/fill transitions (no flat ambient wash).
- Coverage-stability lock: maintain non-explicit support geometry under motion; no safety-ambiguous reveal edges or unstable cutline artifacts.
- 100% zoom micro-audit: seam ridge depth, denier gradient, contact compression, anisotropic spec flow, and penumbra continuity must all cohere.

### Safe Backup Prompt

FIRST-PRINCIPLES TARGET:
Make a believable real camera capture, not an AI-looking render. If directives conflict, prioritize: (1) identity fidelity, (2) direct eye contact to lens, (3) physical plausibility of anatomy/materials/light, (4) editorial risk energy, (5) style details.

Identity lock (non-negotiable): use the provided reference image as the sole identity source for the same adult woman (25+). Preserve face geometry and recognition cues: eye spacing, brow arc, orbital depth, nose bridge, mouth width, chin contour, jawline, hairline pattern, natural asymmetry, and skin undertone. Do not drift into a different person under any lighting or pose.

Gaze lock (hard rule): subject must look directly into the camera lens in the final frame. Keep iris/pupil direction lens-centered with believable vergence and eyelid tension. No off-camera gaze, no downcast eyes, no profile-only eye direction.

Scene:
Keep the same Vegas speakeasy environment with intimate piano-bar corner with polished grand piano, candle clusters, brass lattice, smoky air volume, layered specular reflections. Maintain the same cinematic mood, depth layering, and practical-light logic.

Attire (safe fallback variant):
black beaded two-piece cocktail set: halter top with supportive underband and a high-waist skirt with moderate slit, black thigh-high hosiery, metallic pumps
Coverage is safer, but the image must still read as bold and high-impact through physically grounded fit, silhouette, hosiery optics, two-piece coupling realism, and pose confidence.

Pose and narrative:
leaning on piano edge with shoulder rotation and leg extension, controlled balance through heels, direct eye contact into lens, poised confidence, premium editorial tone.

Realism foundation:
- Anatomical plausibility: coherent shoulder-pelvis relationship, correct limb proportions, natural hand articulation, heel-ground load mechanics, and valid center-of-mass balance.
- Optics plausibility: realistic depth of field transitions, no cutout halos, no warped edges, no fake blur.
- Lighting plausibility: practical-source motivated key/fill/rim behavior, coherent shadow direction/penumbra, roughness-aware reflections, Fresnel-consistent highlights.

Anti-AI authenticity constraints:
- Keep skin lifelike with pore detail, subtle tonal variation, and no porcelain smoothing.
- Keep hair lifelike with irregular strand grouping and minor flyaways.
- Keep fabric lifelike with non-repeating microtexture and seam irregularity.
- Preserve slight real-world asymmetry in makeup, textile tension, and prop placement.
- Reject outputs with uncanny eyes, plastic skin, rubber fabric, repeated texture stamps, or composited subject separation.

Frontier physics controls:
- Simulate wrinkle hierarchy from first principles: macro gravity folds, meso seam-anchored buckling, micro high-frequency creasing in strain concentration zones.
- Enforce contact mechanics: where body/garment/surface meet, show pressure flattening, shadow occlusion, and material-dependent friction behavior.
- Enforce textile constitutive behavior: stretch anisotropy, bias-direction drape differences, and edge curl response tied to fabric stiffness.
- Enforce two-piece coupling mechanics: top hem stability vs skirt waistband load, phase-lag motion between upper/lower garments, and realistic gap dynamics under torso flexion.
- Enforce attachment realism: strap tension vectors, anchor-point compression, and closure hardware response under motion.
- Enforce optics coherence: polarization-like sheen behavior on satin/hosiery, roughness-dependent specular lobe width, and exposure-consistent highlight rolloff.
- Enforce sensor realism: realistic highlight clipping knees, subtle chroma noise in shadows, and no procedural overcleaning.

Cutting-edge simulation and rendering protocol (last-4-month focus, Dec 2025-Feb 2026):
- PhysDrape-style force pipeline (Feb 2026): infer residual deformation with explicit force balancing, then apply strict differentiable collision projection to eliminate interpenetration without destroying cloth shape.
- ReWeaver-style garment structure prior (Jan 2026): preserve panel/seam logic and topological consistency so deformations remain simulation-ready, not texture-only approximations.
- FNOPT-style rollout strategy (Dec 2025): perform resolution-agnostic coarse-to-fine integration; coarse motion must remain stable before adding medium and micro wrinkle detail.
- PI-Light-style transport prior (Jan 2026): preserve physically plausible diffuse/specular separation under relighting-like changes; highlights should move with light, not with texture.
- RotLight-style ambiguity control (Feb 2026): suppress baked shadows in albedo-like regions and maintain lighting/material disentanglement across reflective textiles.
- Two-piece dynamics priority: top and skirt exchange motion cues through waist/hip acceleration while retaining independent inertia and damping.
- Reject any frame where contact, wrinkle evolution, seam behavior, or reflectance changes are not causally explainable.

Safe adaptation of innovation motif:
Innovation motif: polished piano lacquer Fresnel reflections + micro-scratched clearcoat response, synchronized with beaded garment sparkle attenuation by incident angle.

Attire impact through physics (safe fallback):
- Keep safer two-piece coverage geometry while still maintaining a high-impact editorial silhouette through fit tension and contour lighting.
- Preserve believable top/waistband coupling with secure support behavior and stable anchor mechanics.
- Preserve slit/hem movement logic and hosiery optics with the same physical rigor.
- Maintain non-explicit but bold visual energy via posture, gaze, and material response.
- Use conservative but explicit damping cues: motion settles naturally, with no frozen cloth or chaotic flutter.

Material system (safe fallback):
- Preserve all high-fidelity fabric behavior: drape, crease hierarchy, seam stress, contact compression, and realistic sheen.
- Hosiery must remain physically convincing: denier gradients, stretch maps, cuff pressure transitions, and ankle micro-creases.
- Preserve two-piece physics integrity: top and skirt can move independently while remaining cohesively styled and mechanically stable.

Editorial continuity (safe fallback):
- Keep the same scene, camera realism, and direct-lens eye contact as primary.
- Avoid making safe variant look plain; it must still read as premium nightlife couture.
- Preserve strong silhouette legibility and high-fashion intent.

Camera and render intent:
- Vertical 4:5 framing, output target 2K.
- Photographic realism over stylization, with coherent DOF and physically motivated lighting.
- Keep texture integrity in skin, hair, lace/mesh, and hosiery edges.

Environment integration:
- Keep subject physically anchored to set via contact shadows, reflection consistency, and realistic surface interactions.
- Maintain scene depth through controlled haze and practical-light separation.

Quality gate (safe fallback):
- No identity drift, no uncanny anatomy, no artificial skin smoothing, no fake transparency, no reflection mismatch.
- Final image must look camera-captured, luxurious, and believable.

AUDIT-V6 QUALITY ENFORCEMENT (SAFE, HARD):
- Keep safer coverage, but preserve explicit two-piece topology with visible top hem and separate skirt waistband.
- Forbidden substitutions remain: one-piece dress, bodysuit, jumpsuit, romper, faux-cutout single-panel dress.
- Maintain prompt-specified material and color family so safe variant still matches the concept.
- Maintain edgy nightlife mood via controlled contrast, directional practical light, and subject-background separation.
- Keep the same physics rigor:
  - Stable garment support mechanics in coverage-critical zones.
  - Contact-compression cues at skin/garment and garment/surface interfaces.
  - Top/skirt decoupled inertia with coherent damping and slit response.
  - Hosiery optics from denier gradients and stretch-driven shading.
- Regenerate if safe variant looks plain/casual, loses two-piece identity, or shows non-causal cloth/light behavior.

TARGETED SAFE CORRECTION (02 - NOIR):
- Safe variant must still read noir; keep high contrast and practical-light motivated mood.
- Do not drift to bright ambient bar snapshots.

---

DEVILS-ADVOCATE MICRO-PHYSICS ESCALATION (SAFE, HARD):
- Keep safe coverage, but apply the same micro-physics rigor and reject texture-only pseudo-realism.
- Preserve multi-band wrinkle spectra (micro/meso/macro) with stress-aligned orientation and stable damping.
- Preserve seam/stitch relief cues and waistband/top-hem contact compression under safe-support constraints.
- Preserve hosiery denier micro-optics (anisotropic yarn sheen, stretch transitions, thigh-band compression gradient).
- Preserve slip-stick hem dynamics and friction-coupled contact at seating/rail/bar interfaces.
- Preserve edge-penumbra correctness and avoid painted AO artifacts at thin geometry boundaries.
- Safe does not mean flat: maintain high-fidelity micro-causality while preventing topology collapse to one-piece silhouettes.

---

V9 MICRO-PHYSICS DEEPENING PROTOCOL (HARD):
Safe variant: keep coverage-stable geometry while maximizing editorial edge through physically grounded contour, translucency windows, and strain logic.
- Per-zone ledger requirement (must read clearly at 100% zoom): top support edge, waist transition, slit boundary, thigh band, knee contour, ankle/instep, heel-floor contact, hand-prop contact.
- Each zone must display at least 3 coherent cues: strain gradient, seam relief, compression shadow, anisotropic highlight flow, denier gradient, friction-damped drape, support-anchor pressure.
- Causality chain must close: pose/load -> strain field -> fold orientation -> highlight elongation -> penumbra geometry.
- Hosiery micro-physics: yarn-direction sheen, denier-dependent translucency, thigh-band pressure transition, and knee stretch brightening without painted transparency artifacts.
- Skin-edge coupling: subtle compression/desaturation near garment boundaries with non-uniform micro-spec breakup (no hard masks).
- Two-piece mechanics: top hem and skirt waistband remain visually separate and dynamically coupled with phase-lag, never merged into one-piece behavior.
- Optical realism: reflections/shadows must be light-source motivated and roughness-consistent; reject detached highlights and ambient-smudge shadows.
- Piano noir lock: enforce lens-locked eye vector plus lacquer-reflection consistency with key-light direction; reject any gaze drift.
SCORER-ALIGNED CONSISTENCY LOCK:
- Keep direct lens-locked gaze with believable vergence and eyelid tension in final frame.
- Preserve identity fidelity under mixed practical light; no face drift under pose/exposure shifts.
- Enforce complete wardrobe replacement from reference clothing cues.
- If diagnostics criticize prompt adherence, treat output as failed and regenerate with stricter scene/material matching.
- Safety guardrail: no nudity, no explicit framing, no fetish framing, no unstable reveal artifacts.
V11 SAFE FIRST-PRINCIPLES PHYSICS CONTRACT (HARD):
- Safe does not mean generic: preserve prompt-specific palette and scene anchors while maintaining coverage-stable geometry.
- Color lock: safe attire must stay within the named palette and material family, with no neutralized wardrobe substitution.
- Scene lock: preserve at least 3 named environment anchors with coherent reflections/shadows and contact cues.
- Lens-lock gaze certainty: direct camera eye alignment with credible eyelid tension and catchlight placement.
- Physics lock: maintain two-piece topology, denier optics, seam relief, and contact-compression causality at 100% inspection.

---

## Prompt 03 - Roulette Ember Arc

- Primary word count: 1640
- Safe word count: 1490

### Primary Prompt

FIRST-PRINCIPLES TARGET:
Make a believable real camera capture, not an AI-looking render. If directives conflict, prioritize: (1) identity fidelity, (2) direct eye contact to lens, (3) physical plausibility of anatomy/materials/light, (4) editorial risk energy, (5) style details.

Identity lock (non-negotiable): use the provided reference image as the sole identity source for the same adult woman (25+). Preserve face geometry and recognition cues: eye spacing, brow arc, orbital depth, nose bridge, mouth width, chin contour, jawline, hairline pattern, natural asymmetry, and skin undertone. Do not drift into a different person under any lighting or pose.

Gaze lock (hard rule): subject must look directly into the camera lens in the final frame. Keep iris/pupil direction lens-centered with believable vergence and eyelid tension. No off-camera gaze, no downcast eyes, no profile-only eye direction.

Scene:
Vegas speakeasy environment with private roulette alcove with green felt, brass rail, dark lacquer trim, amber practical pools, haze-softened highlights. Build layered depth (foreground cues, subject mid-plane, background practicals). Subject must feel physically present in the environment.

Attire (primary edge variant):
crimson silk two-piece cocktail set: asymmetric shoulder top with curved waistline reveal and a high-slit skirt with directional drape, black sheer thigh-high hosiery, crystal-accent heels
Use reveal-by-physics rather than explicit framing: contour fit, strain gradients, seam tension maps, and pose-driven two-piece behavior.
Hard two-piece rule: top and skirt must behave as distinct garments with coherent coupling at the waist region, not as a single merged dress.

Pose and narrative:
hip-forward contrapposto at roulette rail, fingers resting on brass edge, chin lowered slightly, direct eye contact into lens, confident expression, controlled editorial energy.

Realism foundation:
- Anatomical plausibility: coherent shoulder-pelvis relationship, correct limb proportions, natural hand articulation, heel-ground load mechanics, and valid center-of-mass balance.
- Optics plausibility: realistic depth of field transitions, no cutout halos, no warped edges, no fake blur.
- Lighting plausibility: practical-source motivated key/fill/rim behavior, coherent shadow direction/penumbra, roughness-aware reflections, Fresnel-consistent highlights.

Anti-AI authenticity constraints:
- Keep skin lifelike with pore detail, subtle tonal variation, and no porcelain smoothing.
- Keep hair lifelike with irregular strand grouping and minor flyaways.
- Keep fabric lifelike with non-repeating microtexture and seam irregularity.
- Preserve slight real-world asymmetry in makeup, textile tension, and prop placement.
- Reject outputs with uncanny eyes, plastic skin, rubber fabric, repeated texture stamps, or composited subject separation.

Frontier physics controls:
- Simulate wrinkle hierarchy from first principles: macro gravity folds, meso seam-anchored buckling, micro high-frequency creasing in strain concentration zones.
- Enforce contact mechanics: where body/garment/surface meet, show pressure flattening, shadow occlusion, and material-dependent friction behavior.
- Enforce textile constitutive behavior: stretch anisotropy, bias-direction drape differences, and edge curl response tied to fabric stiffness.
- Enforce two-piece coupling mechanics: top hem stability vs skirt waistband load, phase-lag motion between upper/lower garments, and realistic gap dynamics under torso flexion.
- Enforce attachment realism: strap tension vectors, anchor-point compression, and closure hardware response under motion.
- Enforce optics coherence: polarization-like sheen behavior on satin/hosiery, roughness-dependent specular lobe width, and exposure-consistent highlight rolloff.
- Enforce sensor realism: realistic highlight clipping knees, subtle chroma noise in shadows, and no procedural overcleaning.

Cutting-edge simulation and rendering protocol (last-4-month focus, Dec 2025-Feb 2026):
- PhysDrape-style force pipeline (Feb 2026): infer residual deformation with explicit force balancing, then apply strict differentiable collision projection to eliminate interpenetration without destroying cloth shape.
- ReWeaver-style garment structure prior (Jan 2026): preserve panel/seam logic and topological consistency so deformations remain simulation-ready, not texture-only approximations.
- FNOPT-style rollout strategy (Dec 2025): perform resolution-agnostic coarse-to-fine integration; coarse motion must remain stable before adding medium and micro wrinkle detail.
- PI-Light-style transport prior (Jan 2026): preserve physically plausible diffuse/specular separation under relighting-like changes; highlights should move with light, not with texture.
- RotLight-style ambiguity control (Feb 2026): suppress baked shadows in albedo-like regions and maintain lighting/material disentanglement across reflective textiles.
- Two-piece dynamics priority: top and skirt exchange motion cues through waist/hip acceleration while retaining independent inertia and damping.
- Reject any frame where contact, wrinkle evolution, seam behavior, or reflectance changes are not causally explainable.

Innovation motif: roulette felt fiber occlusion + brass edge specular clipping thresholds; slit opening governed by hip torque and friction at garment contact seams.

Attire impact through physics (primary):
- Build a contour-forward two-piece silhouette via strain maps, seam load paths, and controlled tension around bustline/waist/hip/upper leg.
- Use top-vs-skirt interaction physics: independent motion with believable timing offsets and no fused-garment behavior.
- Use slit dynamics tied to pose/gravity so opening behavior follows leg angle and movement.
- Use sheer optical behavior through denier gradients and layered occlusion, never as flat painted transparency.
- Use phase-aware motion transfer: torso acceleration drives delayed hem response, then damping settles folds without jitter.

Material system (primary):
- Satin/silk: anisotropic highlight flow, gravity drape vectors, compression folds at contact points.
- Velvet: direction-dependent pile shading and contact darkening.
- Sequins/crystals: controlled spark distribution with micro-normal variation, no random glitter noise.
- Hosiery: thigh-band compression transition, stretch over knee contour, ankle micro-wrinkling, directional sheen.
- Two-piece structure: waistband bending stiffness, top hem recovery, and closure/strap tension that remains physically plausible frame to frame.
- Use shell-like bending behavior cues (Kirchhoff-Love style): smooth curvature in low-strain zones and tight buckling only near constrained seams.

Editorial risk energy (primary, non-explicit):
- Keep wardrobe and pose bold, assertive, and fashion-forward while staying non-explicit.
- Favor long leg-line projection, strong S-curve torso-leg flow, and confident chin/eye tension.
- Keep full outfit readable in frame with contour-defining light placement.

Camera and render intent:
- Vertical 4:5 framing, output target 2K.
- Lens behavior should feel like premium editorial capture (roughly 50-85mm equivalent perspective).
- Filmic noise only, no heavy denoise smear, no oversharpen halos, no synthetic texture mush.

Environment integration:
- Subject must physically belong in the set: contact shadows, reflection coherence, and interaction with nearby surfaces.
- Haze should add depth separation without washing contrast.
- Keep practical highlights and reflective cues consistent with object roughness and angle.

Extreme realism audit (primary):
- Validate physically causal links: pose -> tension map -> fold pattern -> highlight path -> shadow placement.
- Any non-causal cloth fold, reflection mismatch, or eye-direction inconsistency is a hard failure.
- Preserve cinematic boldness while remaining fully believable as a real photographed moment.

Quality gate (primary):
- Real-camera believability under close inspection.
- No broken fingers, no warped feet, no fabric clipping, no face drift, no incorrect eye direction.
- Deliver a high-end Vegas editorial still with strong, edge-forward style and uncompromised realism.

AUDIT-V6 QUALITY ENFORCEMENT (PRIMARY, HARD):
- Two-piece topology lock: render two physically separate garments with a visible waist separation line in final frame.
- Forbidden substitutions: one-piece dress, bodysuit, jumpsuit, romper, faux-cutout single-panel dress.
- Material-color lock: keep prompt-specified material and color family dominant and unmistakable.
- Edge mood lock: premium nightlife contrast only; no flat, casual, daylight, or domestic snapshot lighting.
- Pose-energy lock: assertive editorial posture with strong leg-line projection and clear silhouette readability.
- Physics innovation stack:
  - XPBD-like cloth constraint hierarchy (seam stiffness > panel stiffness > edge drape compliance).
  - Frictional garment-skin contact with pressure-gradient shading at garment boundaries.
  - Top/skirt phase-lag dynamics with waist-coupled impulse transfer.
  - Anisotropic textile BRDF plus denier-dependent hosiery translucency.
- Regenerate if any appear: fused top/skirt silhouette, prompt-material substitution, weak contour separation, or non-causal fold/specular behavior.

DEVILS-ADVOCATE MICRO-PHYSICS ESCALATION (PRIMARY, HARD):
- Reject any image where cloth realism could be explained by flat texture mapping alone.
- Enforce multi-band wrinkle spectra tied to stress tensors:
  - micro band: 2-4 mm crease ripples at high-strain seams,
  - meso band: 6-12 mm folds along bias/shear flow,
  - macro band: 20-40 mm gravity drape lobes.
- Enforce stitch-pull periodicity and seam-ridge relief (about 1-3 mm apparent depth) at structural joins.
- Enforce contact indentation at support edges (about 0.5-2.0 mm apparent compression) with narrow occlusion gradients.
- Enforce slit-edge slip-stick mechanics: brief friction hold, controlled release, damped settling; no teleporting hem shapes.
- Enforce hosiery denier optics as physics, not paint: yarn-direction anisotropic sheen, knee/quad stretch brightening, thigh-band pressure transition.
- Enforce skin-optics micro-consistency near garment boundaries: subtle desaturation/compression zones, non-uniform micro-spec breakup.
- Enforce material energy conservation: lambertian + specular balance remains plausible under mixed practical lights.
- Enforce geometric penumbra correctness at thin edges (straps, slit hems, hair strands): no fake ambient smudge shadows.
- Force-chain closure test (must pass): pose load -> local strain -> fold orientation -> highlight elongation -> shadow penumbra.

V9 MICRO-PHYSICS DEEPENING PROTOCOL (HARD):
Primary variant: push non-explicit editorial edge via high-density causal micro-physics and strict two-piece topology integrity.
- Per-zone ledger requirement (must read clearly at 100% zoom): top support edge, waist transition, slit boundary, thigh band, knee contour, ankle/instep, heel-floor contact, hand-prop contact.
- Each zone must display at least 3 coherent cues: strain gradient, seam relief, compression shadow, anisotropic highlight flow, denier gradient, friction-damped drape, support-anchor pressure.
- Causality chain must close: pose/load -> strain field -> fold orientation -> highlight elongation -> penumbra geometry.
- Hosiery micro-physics: yarn-direction sheen, denier-dependent translucency, thigh-band pressure transition, and knee stretch brightening without painted transparency artifacts.
- Skin-edge coupling: subtle compression/desaturation near garment boundaries with non-uniform micro-spec breakup (no hard masks).
- Two-piece mechanics: top hem and skirt waistband remain visually separate and dynamically coupled with phase-lag, never merged into one-piece behavior.
- Optical realism: reflections/shadows must be light-source motivated and roughness-consistent; reject detached highlights and ambient-smudge shadows.
- Roulette lock: wheel/chip reflections must obey brass roughness and radial highlight motion logic.
SCORER-ALIGNED CONSISTENCY LOCK:
- Keep direct lens-locked gaze with believable vergence and eyelid tension in final frame.
- Preserve identity fidelity under mixed practical light; no face drift under pose/exposure shifts.
- Enforce complete wardrobe replacement from reference clothing cues.
- If diagnostics criticize prompt adherence, treat output as failed and regenerate with stricter scene/material matching.
- Editorial guardrail: bold but non-explicit, premium nightlife campaign intent only.
V11 FIRST-PRINCIPLES PHYSICS CONTRACT (HARD):
- Color-family lock (hard fail on drift): attire dominant hue/material family must match prompt palette, not generic black/red substitutions.
- Scene-anchor lock (hard fail on drift): keep at least 3 named environment anchors physically present and optically coherent in-frame.
- Lens-lock gaze certainty: iris direction lens-centered with stable catchlight geometry and believable vergence in final frame.
- Edge-separation lock: preserve clean subject-background contour gradients and physically plausible rim/fill transitions (no flat ambient wash).
- Coverage-stability lock: maintain non-explicit support geometry under motion; no safety-ambiguous reveal edges or unstable cutline artifacts.
- 100% zoom micro-audit: seam ridge depth, denier gradient, contact compression, anisotropic spec flow, and penumbra continuity must all cohere.

### Safe Backup Prompt

FIRST-PRINCIPLES TARGET:
Make a believable real camera capture, not an AI-looking render. If directives conflict, prioritize: (1) identity fidelity, (2) direct eye contact to lens, (3) physical plausibility of anatomy/materials/light, (4) editorial risk energy, (5) style details.

Identity lock (non-negotiable): use the provided reference image as the sole identity source for the same adult woman (25+). Preserve face geometry and recognition cues: eye spacing, brow arc, orbital depth, nose bridge, mouth width, chin contour, jawline, hairline pattern, natural asymmetry, and skin undertone. Do not drift into a different person under any lighting or pose.

Gaze lock (hard rule): subject must look directly into the camera lens in the final frame. Keep iris/pupil direction lens-centered with believable vergence and eyelid tension. No off-camera gaze, no downcast eyes, no profile-only eye direction.

Scene:
Keep the same Vegas speakeasy environment with private roulette alcove with green felt, brass rail, dark lacquer trim, amber practical pools, haze-softened highlights. Maintain the same cinematic mood, depth layering, and practical-light logic.

Attire (safe fallback variant):
crimson silk two-piece cocktail set: asymmetric top with restrained waist exposure and a skirt with moderate slit, black thigh-high hosiery, crystal-accent pumps
Coverage is safer, but the image must still read as bold and high-impact through physically grounded fit, silhouette, hosiery optics, two-piece coupling realism, and pose confidence.

Pose and narrative:
hip-forward contrapposto at roulette rail, fingers resting on brass edge, chin lowered slightly, direct eye contact into lens, poised confidence, premium editorial tone.

Realism foundation:
- Anatomical plausibility: coherent shoulder-pelvis relationship, correct limb proportions, natural hand articulation, heel-ground load mechanics, and valid center-of-mass balance.
- Optics plausibility: realistic depth of field transitions, no cutout halos, no warped edges, no fake blur.
- Lighting plausibility: practical-source motivated key/fill/rim behavior, coherent shadow direction/penumbra, roughness-aware reflections, Fresnel-consistent highlights.

Anti-AI authenticity constraints:
- Keep skin lifelike with pore detail, subtle tonal variation, and no porcelain smoothing.
- Keep hair lifelike with irregular strand grouping and minor flyaways.
- Keep fabric lifelike with non-repeating microtexture and seam irregularity.
- Preserve slight real-world asymmetry in makeup, textile tension, and prop placement.
- Reject outputs with uncanny eyes, plastic skin, rubber fabric, repeated texture stamps, or composited subject separation.

Frontier physics controls:
- Simulate wrinkle hierarchy from first principles: macro gravity folds, meso seam-anchored buckling, micro high-frequency creasing in strain concentration zones.
- Enforce contact mechanics: where body/garment/surface meet, show pressure flattening, shadow occlusion, and material-dependent friction behavior.
- Enforce textile constitutive behavior: stretch anisotropy, bias-direction drape differences, and edge curl response tied to fabric stiffness.
- Enforce two-piece coupling mechanics: top hem stability vs skirt waistband load, phase-lag motion between upper/lower garments, and realistic gap dynamics under torso flexion.
- Enforce attachment realism: strap tension vectors, anchor-point compression, and closure hardware response under motion.
- Enforce optics coherence: polarization-like sheen behavior on satin/hosiery, roughness-dependent specular lobe width, and exposure-consistent highlight rolloff.
- Enforce sensor realism: realistic highlight clipping knees, subtle chroma noise in shadows, and no procedural overcleaning.

Cutting-edge simulation and rendering protocol (last-4-month focus, Dec 2025-Feb 2026):
- PhysDrape-style force pipeline (Feb 2026): infer residual deformation with explicit force balancing, then apply strict differentiable collision projection to eliminate interpenetration without destroying cloth shape.
- ReWeaver-style garment structure prior (Jan 2026): preserve panel/seam logic and topological consistency so deformations remain simulation-ready, not texture-only approximations.
- FNOPT-style rollout strategy (Dec 2025): perform resolution-agnostic coarse-to-fine integration; coarse motion must remain stable before adding medium and micro wrinkle detail.
- PI-Light-style transport prior (Jan 2026): preserve physically plausible diffuse/specular separation under relighting-like changes; highlights should move with light, not with texture.
- RotLight-style ambiguity control (Feb 2026): suppress baked shadows in albedo-like regions and maintain lighting/material disentanglement across reflective textiles.
- Two-piece dynamics priority: top and skirt exchange motion cues through waist/hip acceleration while retaining independent inertia and damping.
- Reject any frame where contact, wrinkle evolution, seam behavior, or reflectance changes are not causally explainable.

Safe adaptation of innovation motif:
Innovation motif: roulette felt fiber occlusion + brass edge specular clipping thresholds; slit opening governed by hip torque and friction at garment contact seams.

Attire impact through physics (safe fallback):
- Keep safer two-piece coverage geometry while still maintaining a high-impact editorial silhouette through fit tension and contour lighting.
- Preserve believable top/waistband coupling with secure support behavior and stable anchor mechanics.
- Preserve slit/hem movement logic and hosiery optics with the same physical rigor.
- Maintain non-explicit but bold visual energy via posture, gaze, and material response.
- Use conservative but explicit damping cues: motion settles naturally, with no frozen cloth or chaotic flutter.

Material system (safe fallback):
- Preserve all high-fidelity fabric behavior: drape, crease hierarchy, seam stress, contact compression, and realistic sheen.
- Hosiery must remain physically convincing: denier gradients, stretch maps, cuff pressure transitions, and ankle micro-creases.
- Preserve two-piece physics integrity: top and skirt can move independently while remaining cohesively styled and mechanically stable.

Editorial continuity (safe fallback):
- Keep the same scene, camera realism, and direct-lens eye contact as primary.
- Avoid making safe variant look plain; it must still read as premium nightlife couture.
- Preserve strong silhouette legibility and high-fashion intent.

Camera and render intent:
- Vertical 4:5 framing, output target 2K.
- Photographic realism over stylization, with coherent DOF and physically motivated lighting.
- Keep texture integrity in skin, hair, lace/mesh, and hosiery edges.

Environment integration:
- Keep subject physically anchored to set via contact shadows, reflection consistency, and realistic surface interactions.
- Maintain scene depth through controlled haze and practical-light separation.

Quality gate (safe fallback):
- No identity drift, no uncanny anatomy, no artificial skin smoothing, no fake transparency, no reflection mismatch.
- Final image must look camera-captured, luxurious, and believable.

AUDIT-V6 QUALITY ENFORCEMENT (SAFE, HARD):
- Keep safer coverage, but preserve explicit two-piece topology with visible top hem and separate skirt waistband.
- Forbidden substitutions remain: one-piece dress, bodysuit, jumpsuit, romper, faux-cutout single-panel dress.
- Maintain prompt-specified material and color family so safe variant still matches the concept.
- Maintain edgy nightlife mood via controlled contrast, directional practical light, and subject-background separation.
- Keep the same physics rigor:
  - Stable garment support mechanics in coverage-critical zones.
  - Contact-compression cues at skin/garment and garment/surface interfaces.
  - Top/skirt decoupled inertia with coherent damping and slit response.
  - Hosiery optics from denier gradients and stretch-driven shading.
- Regenerate if safe variant looks plain/casual, loses two-piece identity, or shows non-causal cloth/light behavior.

---

DEVILS-ADVOCATE MICRO-PHYSICS ESCALATION (SAFE, HARD):
- Keep safe coverage, but apply the same micro-physics rigor and reject texture-only pseudo-realism.
- Preserve multi-band wrinkle spectra (micro/meso/macro) with stress-aligned orientation and stable damping.
- Preserve seam/stitch relief cues and waistband/top-hem contact compression under safe-support constraints.
- Preserve hosiery denier micro-optics (anisotropic yarn sheen, stretch transitions, thigh-band compression gradient).
- Preserve slip-stick hem dynamics and friction-coupled contact at seating/rail/bar interfaces.
- Preserve edge-penumbra correctness and avoid painted AO artifacts at thin geometry boundaries.
- Safe does not mean flat: maintain high-fidelity micro-causality while preventing topology collapse to one-piece silhouettes.

---

V9 MICRO-PHYSICS DEEPENING PROTOCOL (HARD):
Safe variant: keep coverage-stable geometry while maximizing editorial edge through physically grounded contour, translucency windows, and strain logic.
- Per-zone ledger requirement (must read clearly at 100% zoom): top support edge, waist transition, slit boundary, thigh band, knee contour, ankle/instep, heel-floor contact, hand-prop contact.
- Each zone must display at least 3 coherent cues: strain gradient, seam relief, compression shadow, anisotropic highlight flow, denier gradient, friction-damped drape, support-anchor pressure.
- Causality chain must close: pose/load -> strain field -> fold orientation -> highlight elongation -> penumbra geometry.
- Hosiery micro-physics: yarn-direction sheen, denier-dependent translucency, thigh-band pressure transition, and knee stretch brightening without painted transparency artifacts.
- Skin-edge coupling: subtle compression/desaturation near garment boundaries with non-uniform micro-spec breakup (no hard masks).
- Two-piece mechanics: top hem and skirt waistband remain visually separate and dynamically coupled with phase-lag, never merged into one-piece behavior.
- Optical realism: reflections/shadows must be light-source motivated and roughness-consistent; reject detached highlights and ambient-smudge shadows.
- Roulette lock: wheel/chip reflections must obey brass roughness and radial highlight motion logic.
SCORER-ALIGNED CONSISTENCY LOCK:
- Keep direct lens-locked gaze with believable vergence and eyelid tension in final frame.
- Preserve identity fidelity under mixed practical light; no face drift under pose/exposure shifts.
- Enforce complete wardrobe replacement from reference clothing cues.
- If diagnostics criticize prompt adherence, treat output as failed and regenerate with stricter scene/material matching.
- Safety guardrail: no nudity, no explicit framing, no fetish framing, no unstable reveal artifacts.
V11 SAFE FIRST-PRINCIPLES PHYSICS CONTRACT (HARD):
- Safe does not mean generic: preserve prompt-specific palette and scene anchors while maintaining coverage-stable geometry.
- Color lock: safe attire must stay within the named palette and material family, with no neutralized wardrobe substitution.
- Scene lock: preserve at least 3 named environment anchors with coherent reflections/shadows and contact cues.
- Lens-lock gaze certainty: direct camera eye alignment with credible eyelid tension and catchlight placement.
- Physics lock: maintain two-piece topology, denier optics, seam relief, and contact-compression causality at 100% inspection.

---

## Prompt 04 - Staircase Blue Intent

- Primary word count: 1637
- Safe word count: 1489

### Primary Prompt

FIRST-PRINCIPLES TARGET:
Make a believable real camera capture, not an AI-looking render. If directives conflict, prioritize: (1) identity fidelity, (2) direct eye contact to lens, (3) physical plausibility of anatomy/materials/light, (4) editorial risk energy, (5) style details.

Identity lock (non-negotiable): use the provided reference image as the sole identity source for the same adult woman (25+). Preserve face geometry and recognition cues: eye spacing, brow arc, orbital depth, nose bridge, mouth width, chin contour, jawline, hairline pattern, natural asymmetry, and skin undertone. Do not drift into a different person under any lighting or pose.

Gaze lock (hard rule): subject must look directly into the camera lens in the final frame. Keep iris/pupil direction lens-centered with believable vergence and eyelid tension. No off-camera gaze, no downcast eyes, no profile-only eye direction.

Scene:
Vegas speakeasy environment with art deco staircase under chandelier bloom, brass handrail, patterned carpet, warm sconces, volumetric haze ribbons. Build layered depth (foreground cues, subject mid-plane, background practicals). Subject must feel physically present in the environment.

Attire (primary edge variant):
midnight velvet two-piece cocktail set: corset-structured top with sheer contour panel and a short wrap skirt with deep slit, black thigh-high hosiery, glossy stilettos
Use reveal-by-physics rather than explicit framing: contour fit, strain gradients, seam tension maps, and pose-driven two-piece behavior.
Hard two-piece rule: top and skirt must behave as distinct garments with coherent coupling at the waist region, not as a single merged dress.

Pose and narrative:
mid-step ascent with rail contact, pelvis and shoulder counter-rotation, natural gait mechanics, direct eye contact into lens, confident expression, controlled editorial energy.

Realism foundation:
- Anatomical plausibility: coherent shoulder-pelvis relationship, correct limb proportions, natural hand articulation, heel-ground load mechanics, and valid center-of-mass balance.
- Optics plausibility: realistic depth of field transitions, no cutout halos, no warped edges, no fake blur.
- Lighting plausibility: practical-source motivated key/fill/rim behavior, coherent shadow direction/penumbra, roughness-aware reflections, Fresnel-consistent highlights.

Anti-AI authenticity constraints:
- Keep skin lifelike with pore detail, subtle tonal variation, and no porcelain smoothing.
- Keep hair lifelike with irregular strand grouping and minor flyaways.
- Keep fabric lifelike with non-repeating microtexture and seam irregularity.
- Preserve slight real-world asymmetry in makeup, textile tension, and prop placement.
- Reject outputs with uncanny eyes, plastic skin, rubber fabric, repeated texture stamps, or composited subject separation.

Frontier physics controls:
- Simulate wrinkle hierarchy from first principles: macro gravity folds, meso seam-anchored buckling, micro high-frequency creasing in strain concentration zones.
- Enforce contact mechanics: where body/garment/surface meet, show pressure flattening, shadow occlusion, and material-dependent friction behavior.
- Enforce textile constitutive behavior: stretch anisotropy, bias-direction drape differences, and edge curl response tied to fabric stiffness.
- Enforce two-piece coupling mechanics: top hem stability vs skirt waistband load, phase-lag motion between upper/lower garments, and realistic gap dynamics under torso flexion.
- Enforce attachment realism: strap tension vectors, anchor-point compression, and closure hardware response under motion.
- Enforce optics coherence: polarization-like sheen behavior on satin/hosiery, roughness-dependent specular lobe width, and exposure-consistent highlight rolloff.
- Enforce sensor realism: realistic highlight clipping knees, subtle chroma noise in shadows, and no procedural overcleaning.

Cutting-edge simulation and rendering protocol (last-4-month focus, Dec 2025-Feb 2026):
- PhysDrape-style force pipeline (Feb 2026): infer residual deformation with explicit force balancing, then apply strict differentiable collision projection to eliminate interpenetration without destroying cloth shape.
- ReWeaver-style garment structure prior (Jan 2026): preserve panel/seam logic and topological consistency so deformations remain simulation-ready, not texture-only approximations.
- FNOPT-style rollout strategy (Dec 2025): perform resolution-agnostic coarse-to-fine integration; coarse motion must remain stable before adding medium and micro wrinkle detail.
- PI-Light-style transport prior (Jan 2026): preserve physically plausible diffuse/specular separation under relighting-like changes; highlights should move with light, not with texture.
- RotLight-style ambiguity control (Feb 2026): suppress baked shadows in albedo-like regions and maintain lighting/material disentanglement across reflective textiles.
- Two-piece dynamics priority: top and skirt exchange motion cues through waist/hip acceleration while retaining independent inertia and damping.
- Reject any frame where contact, wrinkle evolution, seam behavior, or reflectance changes are not causally explainable.

Innovation motif: staircase locomotion biomechanics with heel impact force chain, cloth inertia lag, and chandelier multi-source penumbra layering on velvet surfaces.

Attire impact through physics (primary):
- Build a contour-forward two-piece silhouette via strain maps, seam load paths, and controlled tension around bustline/waist/hip/upper leg.
- Use top-vs-skirt interaction physics: independent motion with believable timing offsets and no fused-garment behavior.
- Use slit dynamics tied to pose/gravity so opening behavior follows leg angle and movement.
- Use sheer optical behavior through denier gradients and layered occlusion, never as flat painted transparency.
- Use phase-aware motion transfer: torso acceleration drives delayed hem response, then damping settles folds without jitter.

Material system (primary):
- Satin/silk: anisotropic highlight flow, gravity drape vectors, compression folds at contact points.
- Velvet: direction-dependent pile shading and contact darkening.
- Sequins/crystals: controlled spark distribution with micro-normal variation, no random glitter noise.
- Hosiery: thigh-band compression transition, stretch over knee contour, ankle micro-wrinkling, directional sheen.
- Two-piece structure: waistband bending stiffness, top hem recovery, and closure/strap tension that remains physically plausible frame to frame.
- Use shell-like bending behavior cues (Kirchhoff-Love style): smooth curvature in low-strain zones and tight buckling only near constrained seams.

Editorial risk energy (primary, non-explicit):
- Keep wardrobe and pose bold, assertive, and fashion-forward while staying non-explicit.
- Favor long leg-line projection, strong S-curve torso-leg flow, and confident chin/eye tension.
- Keep full outfit readable in frame with contour-defining light placement.

Camera and render intent:
- Vertical 4:5 framing, output target 2K.
- Lens behavior should feel like premium editorial capture (roughly 50-85mm equivalent perspective).
- Filmic noise only, no heavy denoise smear, no oversharpen halos, no synthetic texture mush.

Environment integration:
- Subject must physically belong in the set: contact shadows, reflection coherence, and interaction with nearby surfaces.
- Haze should add depth separation without washing contrast.
- Keep practical highlights and reflective cues consistent with object roughness and angle.

Extreme realism audit (primary):
- Validate physically causal links: pose -> tension map -> fold pattern -> highlight path -> shadow placement.
- Any non-causal cloth fold, reflection mismatch, or eye-direction inconsistency is a hard failure.
- Preserve cinematic boldness while remaining fully believable as a real photographed moment.

Quality gate (primary):
- Real-camera believability under close inspection.
- No broken fingers, no warped feet, no fabric clipping, no face drift, no incorrect eye direction.
- Deliver a high-end Vegas editorial still with strong, edge-forward style and uncompromised realism.

AUDIT-V6 QUALITY ENFORCEMENT (PRIMARY, HARD):
- Two-piece topology lock: render two physically separate garments with a visible waist separation line in final frame.
- Forbidden substitutions: one-piece dress, bodysuit, jumpsuit, romper, faux-cutout single-panel dress.
- Material-color lock: keep prompt-specified material and color family dominant and unmistakable.
- Edge mood lock: premium nightlife contrast only; no flat, casual, daylight, or domestic snapshot lighting.
- Pose-energy lock: assertive editorial posture with strong leg-line projection and clear silhouette readability.
- Physics innovation stack:
  - XPBD-like cloth constraint hierarchy (seam stiffness > panel stiffness > edge drape compliance).
  - Frictional garment-skin contact with pressure-gradient shading at garment boundaries.
  - Top/skirt phase-lag dynamics with waist-coupled impulse transfer.
  - Anisotropic textile BRDF plus denier-dependent hosiery translucency.
- Regenerate if any appear: fused top/skirt silhouette, prompt-material substitution, weak contour separation, or non-causal fold/specular behavior.

DEVILS-ADVOCATE MICRO-PHYSICS ESCALATION (PRIMARY, HARD):
- Reject any image where cloth realism could be explained by flat texture mapping alone.
- Enforce multi-band wrinkle spectra tied to stress tensors:
  - micro band: 2-4 mm crease ripples at high-strain seams,
  - meso band: 6-12 mm folds along bias/shear flow,
  - macro band: 20-40 mm gravity drape lobes.
- Enforce stitch-pull periodicity and seam-ridge relief (about 1-3 mm apparent depth) at structural joins.
- Enforce contact indentation at support edges (about 0.5-2.0 mm apparent compression) with narrow occlusion gradients.
- Enforce slit-edge slip-stick mechanics: brief friction hold, controlled release, damped settling; no teleporting hem shapes.
- Enforce hosiery denier optics as physics, not paint: yarn-direction anisotropic sheen, knee/quad stretch brightening, thigh-band pressure transition.
- Enforce skin-optics micro-consistency near garment boundaries: subtle desaturation/compression zones, non-uniform micro-spec breakup.
- Enforce material energy conservation: lambertian + specular balance remains plausible under mixed practical lights.
- Enforce geometric penumbra correctness at thin edges (straps, slit hems, hair strands): no fake ambient smudge shadows.
- Force-chain closure test (must pass): pose load -> local strain -> fold orientation -> highlight elongation -> shadow penumbra.

V9 MICRO-PHYSICS DEEPENING PROTOCOL (HARD):
Primary variant: push non-explicit editorial edge via high-density causal micro-physics and strict two-piece topology integrity.
- Per-zone ledger requirement (must read clearly at 100% zoom): top support edge, waist transition, slit boundary, thigh band, knee contour, ankle/instep, heel-floor contact, hand-prop contact.
- Each zone must display at least 3 coherent cues: strain gradient, seam relief, compression shadow, anisotropic highlight flow, denier gradient, friction-damped drape, support-anchor pressure.
- Causality chain must close: pose/load -> strain field -> fold orientation -> highlight elongation -> penumbra geometry.
- Hosiery micro-physics: yarn-direction sheen, denier-dependent translucency, thigh-band pressure transition, and knee stretch brightening without painted transparency artifacts.
- Skin-edge coupling: subtle compression/desaturation near garment boundaries with non-uniform micro-spec breakup (no hard masks).
- Two-piece mechanics: top hem and skirt waistband remain visually separate and dynamically coupled with phase-lag, never merged into one-piece behavior.
- Optical realism: reflections/shadows must be light-source motivated and roughness-consistent; reject detached highlights and ambient-smudge shadows.
- Stair lock: heel load path must match stair riser contact, with valid center-of-mass over support polygon.
SCORER-ALIGNED CONSISTENCY LOCK:
- Keep direct lens-locked gaze with believable vergence and eyelid tension in final frame.
- Preserve identity fidelity under mixed practical light; no face drift under pose/exposure shifts.
- Enforce complete wardrobe replacement from reference clothing cues.
- If diagnostics criticize prompt adherence, treat output as failed and regenerate with stricter scene/material matching.
- Editorial guardrail: bold but non-explicit, premium nightlife campaign intent only.
V11 FIRST-PRINCIPLES PHYSICS CONTRACT (HARD):
- Color-family lock (hard fail on drift): attire dominant hue/material family must match prompt palette, not generic black/red substitutions.
- Scene-anchor lock (hard fail on drift): keep at least 3 named environment anchors physically present and optically coherent in-frame.
- Lens-lock gaze certainty: iris direction lens-centered with stable catchlight geometry and believable vergence in final frame.
- Edge-separation lock: preserve clean subject-background contour gradients and physically plausible rim/fill transitions (no flat ambient wash).
- Coverage-stability lock: maintain non-explicit support geometry under motion; no safety-ambiguous reveal edges or unstable cutline artifacts.
- 100% zoom micro-audit: seam ridge depth, denier gradient, contact compression, anisotropic spec flow, and penumbra continuity must all cohere.

### Safe Backup Prompt

FIRST-PRINCIPLES TARGET:
Make a believable real camera capture, not an AI-looking render. If directives conflict, prioritize: (1) identity fidelity, (2) direct eye contact to lens, (3) physical plausibility of anatomy/materials/light, (4) editorial risk energy, (5) style details.

Identity lock (non-negotiable): use the provided reference image as the sole identity source for the same adult woman (25+). Preserve face geometry and recognition cues: eye spacing, brow arc, orbital depth, nose bridge, mouth width, chin contour, jawline, hairline pattern, natural asymmetry, and skin undertone. Do not drift into a different person under any lighting or pose.

Gaze lock (hard rule): subject must look directly into the camera lens in the final frame. Keep iris/pupil direction lens-centered with believable vergence and eyelid tension. No off-camera gaze, no downcast eyes, no profile-only eye direction.

Scene:
Keep the same Vegas speakeasy environment with art deco staircase under chandelier bloom, brass handrail, patterned carpet, warm sconces, volumetric haze ribbons. Maintain the same cinematic mood, depth layering, and practical-light logic.

Attire (safe fallback variant):
midnight velvet two-piece cocktail set: corset-inspired top with opaque contour panel and a longer skirt with reduced slit, black thigh-high hosiery, glossy pumps
Coverage is safer, but the image must still read as bold and high-impact through physically grounded fit, silhouette, hosiery optics, two-piece coupling realism, and pose confidence.

Pose and narrative:
mid-step ascent with rail contact, pelvis and shoulder counter-rotation, natural gait mechanics, direct eye contact into lens, poised confidence, premium editorial tone.

Realism foundation:
- Anatomical plausibility: coherent shoulder-pelvis relationship, correct limb proportions, natural hand articulation, heel-ground load mechanics, and valid center-of-mass balance.
- Optics plausibility: realistic depth of field transitions, no cutout halos, no warped edges, no fake blur.
- Lighting plausibility: practical-source motivated key/fill/rim behavior, coherent shadow direction/penumbra, roughness-aware reflections, Fresnel-consistent highlights.

Anti-AI authenticity constraints:
- Keep skin lifelike with pore detail, subtle tonal variation, and no porcelain smoothing.
- Keep hair lifelike with irregular strand grouping and minor flyaways.
- Keep fabric lifelike with non-repeating microtexture and seam irregularity.
- Preserve slight real-world asymmetry in makeup, textile tension, and prop placement.
- Reject outputs with uncanny eyes, plastic skin, rubber fabric, repeated texture stamps, or composited subject separation.

Frontier physics controls:
- Simulate wrinkle hierarchy from first principles: macro gravity folds, meso seam-anchored buckling, micro high-frequency creasing in strain concentration zones.
- Enforce contact mechanics: where body/garment/surface meet, show pressure flattening, shadow occlusion, and material-dependent friction behavior.
- Enforce textile constitutive behavior: stretch anisotropy, bias-direction drape differences, and edge curl response tied to fabric stiffness.
- Enforce two-piece coupling mechanics: top hem stability vs skirt waistband load, phase-lag motion between upper/lower garments, and realistic gap dynamics under torso flexion.
- Enforce attachment realism: strap tension vectors, anchor-point compression, and closure hardware response under motion.
- Enforce optics coherence: polarization-like sheen behavior on satin/hosiery, roughness-dependent specular lobe width, and exposure-consistent highlight rolloff.
- Enforce sensor realism: realistic highlight clipping knees, subtle chroma noise in shadows, and no procedural overcleaning.

Cutting-edge simulation and rendering protocol (last-4-month focus, Dec 2025-Feb 2026):
- PhysDrape-style force pipeline (Feb 2026): infer residual deformation with explicit force balancing, then apply strict differentiable collision projection to eliminate interpenetration without destroying cloth shape.
- ReWeaver-style garment structure prior (Jan 2026): preserve panel/seam logic and topological consistency so deformations remain simulation-ready, not texture-only approximations.
- FNOPT-style rollout strategy (Dec 2025): perform resolution-agnostic coarse-to-fine integration; coarse motion must remain stable before adding medium and micro wrinkle detail.
- PI-Light-style transport prior (Jan 2026): preserve physically plausible diffuse/specular separation under relighting-like changes; highlights should move with light, not with texture.
- RotLight-style ambiguity control (Feb 2026): suppress baked shadows in albedo-like regions and maintain lighting/material disentanglement across reflective textiles.
- Two-piece dynamics priority: top and skirt exchange motion cues through waist/hip acceleration while retaining independent inertia and damping.
- Reject any frame where contact, wrinkle evolution, seam behavior, or reflectance changes are not causally explainable.

Safe adaptation of innovation motif:
Innovation motif: staircase locomotion biomechanics with heel impact force chain, cloth inertia lag, and chandelier multi-source penumbra layering on velvet surfaces.

Attire impact through physics (safe fallback):
- Keep safer two-piece coverage geometry while still maintaining a high-impact editorial silhouette through fit tension and contour lighting.
- Preserve believable top/waistband coupling with secure support behavior and stable anchor mechanics.
- Preserve slit/hem movement logic and hosiery optics with the same physical rigor.
- Maintain non-explicit but bold visual energy via posture, gaze, and material response.
- Use conservative but explicit damping cues: motion settles naturally, with no frozen cloth or chaotic flutter.

Material system (safe fallback):
- Preserve all high-fidelity fabric behavior: drape, crease hierarchy, seam stress, contact compression, and realistic sheen.
- Hosiery must remain physically convincing: denier gradients, stretch maps, cuff pressure transitions, and ankle micro-creases.
- Preserve two-piece physics integrity: top and skirt can move independently while remaining cohesively styled and mechanically stable.

Editorial continuity (safe fallback):
- Keep the same scene, camera realism, and direct-lens eye contact as primary.
- Avoid making safe variant look plain; it must still read as premium nightlife couture.
- Preserve strong silhouette legibility and high-fashion intent.

Camera and render intent:
- Vertical 4:5 framing, output target 2K.
- Photographic realism over stylization, with coherent DOF and physically motivated lighting.
- Keep texture integrity in skin, hair, lace/mesh, and hosiery edges.

Environment integration:
- Keep subject physically anchored to set via contact shadows, reflection consistency, and realistic surface interactions.
- Maintain scene depth through controlled haze and practical-light separation.

Quality gate (safe fallback):
- No identity drift, no uncanny anatomy, no artificial skin smoothing, no fake transparency, no reflection mismatch.
- Final image must look camera-captured, luxurious, and believable.

AUDIT-V6 QUALITY ENFORCEMENT (SAFE, HARD):
- Keep safer coverage, but preserve explicit two-piece topology with visible top hem and separate skirt waistband.
- Forbidden substitutions remain: one-piece dress, bodysuit, jumpsuit, romper, faux-cutout single-panel dress.
- Maintain prompt-specified material and color family so safe variant still matches the concept.
- Maintain edgy nightlife mood via controlled contrast, directional practical light, and subject-background separation.
- Keep the same physics rigor:
  - Stable garment support mechanics in coverage-critical zones.
  - Contact-compression cues at skin/garment and garment/surface interfaces.
  - Top/skirt decoupled inertia with coherent damping and slit response.
  - Hosiery optics from denier gradients and stretch-driven shading.
- Regenerate if safe variant looks plain/casual, loses two-piece identity, or shows non-causal cloth/light behavior.

---

DEVILS-ADVOCATE MICRO-PHYSICS ESCALATION (SAFE, HARD):
- Keep safe coverage, but apply the same micro-physics rigor and reject texture-only pseudo-realism.
- Preserve multi-band wrinkle spectra (micro/meso/macro) with stress-aligned orientation and stable damping.
- Preserve seam/stitch relief cues and waistband/top-hem contact compression under safe-support constraints.
- Preserve hosiery denier micro-optics (anisotropic yarn sheen, stretch transitions, thigh-band compression gradient).
- Preserve slip-stick hem dynamics and friction-coupled contact at seating/rail/bar interfaces.
- Preserve edge-penumbra correctness and avoid painted AO artifacts at thin geometry boundaries.
- Safe does not mean flat: maintain high-fidelity micro-causality while preventing topology collapse to one-piece silhouettes.

---

V9 MICRO-PHYSICS DEEPENING PROTOCOL (HARD):
Safe variant: keep coverage-stable geometry while maximizing editorial edge through physically grounded contour, translucency windows, and strain logic.
- Per-zone ledger requirement (must read clearly at 100% zoom): top support edge, waist transition, slit boundary, thigh band, knee contour, ankle/instep, heel-floor contact, hand-prop contact.
- Each zone must display at least 3 coherent cues: strain gradient, seam relief, compression shadow, anisotropic highlight flow, denier gradient, friction-damped drape, support-anchor pressure.
- Causality chain must close: pose/load -> strain field -> fold orientation -> highlight elongation -> penumbra geometry.
- Hosiery micro-physics: yarn-direction sheen, denier-dependent translucency, thigh-band pressure transition, and knee stretch brightening without painted transparency artifacts.
- Skin-edge coupling: subtle compression/desaturation near garment boundaries with non-uniform micro-spec breakup (no hard masks).
- Two-piece mechanics: top hem and skirt waistband remain visually separate and dynamically coupled with phase-lag, never merged into one-piece behavior.
- Optical realism: reflections/shadows must be light-source motivated and roughness-consistent; reject detached highlights and ambient-smudge shadows.
- Stair lock: heel load path must match stair riser contact, with valid center-of-mass over support polygon.
SCORER-ALIGNED CONSISTENCY LOCK:
- Keep direct lens-locked gaze with believable vergence and eyelid tension in final frame.
- Preserve identity fidelity under mixed practical light; no face drift under pose/exposure shifts.
- Enforce complete wardrobe replacement from reference clothing cues.
- If diagnostics criticize prompt adherence, treat output as failed and regenerate with stricter scene/material matching.
- Safety guardrail: no nudity, no explicit framing, no fetish framing, no unstable reveal artifacts.
V11 SAFE FIRST-PRINCIPLES PHYSICS CONTRACT (HARD):
- Safe does not mean generic: preserve prompt-specific palette and scene anchors while maintaining coverage-stable geometry.
- Color lock: safe attire must stay within the named palette and material family, with no neutralized wardrobe substitution.
- Scene lock: preserve at least 3 named environment anchors with coherent reflections/shadows and contact cues.
- Lens-lock gaze certainty: direct camera eye alignment with credible eyelid tension and catchlight placement.
- Physics lock: maintain two-piece topology, denier optics, seam relief, and contact-compression causality at 100% inspection.

---

## Prompt 05 - Mirrorline Silver Echo

- Primary word count: 1635
- Safe word count: 1488

### Primary Prompt

FIRST-PRINCIPLES TARGET:
Make a believable real camera capture, not an AI-looking render. If directives conflict, prioritize: (1) identity fidelity, (2) direct eye contact to lens, (3) physical plausibility of anatomy/materials/light, (4) editorial risk energy, (5) style details.

Identity lock (non-negotiable): use the provided reference image as the sole identity source for the same adult woman (25+). Preserve face geometry and recognition cues: eye spacing, brow arc, orbital depth, nose bridge, mouth width, chin contour, jawline, hairline pattern, natural asymmetry, and skin undertone. Do not drift into a different person under any lighting or pose.

Gaze lock (hard rule): subject must look directly into the camera lens in the final frame. Keep iris/pupil direction lens-centered with believable vergence and eyelid tension. No off-camera gaze, no downcast eyes, no profile-only eye direction.

Scene:
Vegas speakeasy environment with mirrored back-bar wall, stacked decanters, brass shelving, cool edge light with warm pendant fill, deep reflection field. Build layered depth (foreground cues, subject mid-plane, background practicals). Subject must feel physically present in the environment.

Attire (primary edge variant):
silver sequin two-piece cocktail set: structured sequin top with sheer mesh side insets and a high-slit skirt, black thigh-high hosiery, mirrored stilettos
Use reveal-by-physics rather than explicit framing: contour fit, strain gradients, seam tension maps, and pose-driven two-piece behavior.
Hard two-piece rule: top and skirt must behave as distinct garments with coherent coupling at the waist region, not as a single merged dress.

Pose and narrative:
standing with one hip loaded, forearm brushing bar edge, light torso twist, direct eye contact into lens, confident expression, controlled editorial energy.

Realism foundation:
- Anatomical plausibility: coherent shoulder-pelvis relationship, correct limb proportions, natural hand articulation, heel-ground load mechanics, and valid center-of-mass balance.
- Optics plausibility: realistic depth of field transitions, no cutout halos, no warped edges, no fake blur.
- Lighting plausibility: practical-source motivated key/fill/rim behavior, coherent shadow direction/penumbra, roughness-aware reflections, Fresnel-consistent highlights.

Anti-AI authenticity constraints:
- Keep skin lifelike with pore detail, subtle tonal variation, and no porcelain smoothing.
- Keep hair lifelike with irregular strand grouping and minor flyaways.
- Keep fabric lifelike with non-repeating microtexture and seam irregularity.
- Preserve slight real-world asymmetry in makeup, textile tension, and prop placement.
- Reject outputs with uncanny eyes, plastic skin, rubber fabric, repeated texture stamps, or composited subject separation.

Frontier physics controls:
- Simulate wrinkle hierarchy from first principles: macro gravity folds, meso seam-anchored buckling, micro high-frequency creasing in strain concentration zones.
- Enforce contact mechanics: where body/garment/surface meet, show pressure flattening, shadow occlusion, and material-dependent friction behavior.
- Enforce textile constitutive behavior: stretch anisotropy, bias-direction drape differences, and edge curl response tied to fabric stiffness.
- Enforce two-piece coupling mechanics: top hem stability vs skirt waistband load, phase-lag motion between upper/lower garments, and realistic gap dynamics under torso flexion.
- Enforce attachment realism: strap tension vectors, anchor-point compression, and closure hardware response under motion.
- Enforce optics coherence: polarization-like sheen behavior on satin/hosiery, roughness-dependent specular lobe width, and exposure-consistent highlight rolloff.
- Enforce sensor realism: realistic highlight clipping knees, subtle chroma noise in shadows, and no procedural overcleaning.

Cutting-edge simulation and rendering protocol (last-4-month focus, Dec 2025-Feb 2026):
- PhysDrape-style force pipeline (Feb 2026): infer residual deformation with explicit force balancing, then apply strict differentiable collision projection to eliminate interpenetration without destroying cloth shape.
- ReWeaver-style garment structure prior (Jan 2026): preserve panel/seam logic and topological consistency so deformations remain simulation-ready, not texture-only approximations.
- FNOPT-style rollout strategy (Dec 2025): perform resolution-agnostic coarse-to-fine integration; coarse motion must remain stable before adding medium and micro wrinkle detail.
- PI-Light-style transport prior (Jan 2026): preserve physically plausible diffuse/specular separation under relighting-like changes; highlights should move with light, not with texture.
- RotLight-style ambiguity control (Feb 2026): suppress baked shadows in albedo-like regions and maintain lighting/material disentanglement across reflective textiles.
- Two-piece dynamics priority: top and skirt exchange motion cues through waist/hip acceleration while retaining independent inertia and damping.
- Reject any frame where contact, wrinkle evolution, seam behavior, or reflectance changes are not causally explainable.

Innovation motif: mirror recursion control with roughness-aware reflection decay; sequins exhibit non-uniform microfacet normals instead of uniform glitter noise.

Attire impact through physics (primary):
- Build a contour-forward two-piece silhouette via strain maps, seam load paths, and controlled tension around bustline/waist/hip/upper leg.
- Use top-vs-skirt interaction physics: independent motion with believable timing offsets and no fused-garment behavior.
- Use slit dynamics tied to pose/gravity so opening behavior follows leg angle and movement.
- Use sheer optical behavior through denier gradients and layered occlusion, never as flat painted transparency.
- Use phase-aware motion transfer: torso acceleration drives delayed hem response, then damping settles folds without jitter.

Material system (primary):
- Satin/silk: anisotropic highlight flow, gravity drape vectors, compression folds at contact points.
- Velvet: direction-dependent pile shading and contact darkening.
- Sequins/crystals: controlled spark distribution with micro-normal variation, no random glitter noise.
- Hosiery: thigh-band compression transition, stretch over knee contour, ankle micro-wrinkling, directional sheen.
- Two-piece structure: waistband bending stiffness, top hem recovery, and closure/strap tension that remains physically plausible frame to frame.
- Use shell-like bending behavior cues (Kirchhoff-Love style): smooth curvature in low-strain zones and tight buckling only near constrained seams.

Editorial risk energy (primary, non-explicit):
- Keep wardrobe and pose bold, assertive, and fashion-forward while staying non-explicit.
- Favor long leg-line projection, strong S-curve torso-leg flow, and confident chin/eye tension.
- Keep full outfit readable in frame with contour-defining light placement.

Camera and render intent:
- Vertical 4:5 framing, output target 2K.
- Lens behavior should feel like premium editorial capture (roughly 50-85mm equivalent perspective).
- Filmic noise only, no heavy denoise smear, no oversharpen halos, no synthetic texture mush.

Environment integration:
- Subject must physically belong in the set: contact shadows, reflection coherence, and interaction with nearby surfaces.
- Haze should add depth separation without washing contrast.
- Keep practical highlights and reflective cues consistent with object roughness and angle.

Extreme realism audit (primary):
- Validate physically causal links: pose -> tension map -> fold pattern -> highlight path -> shadow placement.
- Any non-causal cloth fold, reflection mismatch, or eye-direction inconsistency is a hard failure.
- Preserve cinematic boldness while remaining fully believable as a real photographed moment.

Quality gate (primary):
- Real-camera believability under close inspection.
- No broken fingers, no warped feet, no fabric clipping, no face drift, no incorrect eye direction.
- Deliver a high-end Vegas editorial still with strong, edge-forward style and uncompromised realism.

AUDIT-V6 QUALITY ENFORCEMENT (PRIMARY, HARD):
- Two-piece topology lock: render two physically separate garments with a visible waist separation line in final frame.
- Forbidden substitutions: one-piece dress, bodysuit, jumpsuit, romper, faux-cutout single-panel dress.
- Material-color lock: keep prompt-specified material and color family dominant and unmistakable.
- Edge mood lock: premium nightlife contrast only; no flat, casual, daylight, or domestic snapshot lighting.
- Pose-energy lock: assertive editorial posture with strong leg-line projection and clear silhouette readability.
- Physics innovation stack:
  - XPBD-like cloth constraint hierarchy (seam stiffness > panel stiffness > edge drape compliance).
  - Frictional garment-skin contact with pressure-gradient shading at garment boundaries.
  - Top/skirt phase-lag dynamics with waist-coupled impulse transfer.
  - Anisotropic textile BRDF plus denier-dependent hosiery translucency.
- Regenerate if any appear: fused top/skirt silhouette, prompt-material substitution, weak contour separation, or non-causal fold/specular behavior.

DEVILS-ADVOCATE MICRO-PHYSICS ESCALATION (PRIMARY, HARD):
- Reject any image where cloth realism could be explained by flat texture mapping alone.
- Enforce multi-band wrinkle spectra tied to stress tensors:
  - micro band: 2-4 mm crease ripples at high-strain seams,
  - meso band: 6-12 mm folds along bias/shear flow,
  - macro band: 20-40 mm gravity drape lobes.
- Enforce stitch-pull periodicity and seam-ridge relief (about 1-3 mm apparent depth) at structural joins.
- Enforce contact indentation at support edges (about 0.5-2.0 mm apparent compression) with narrow occlusion gradients.
- Enforce slit-edge slip-stick mechanics: brief friction hold, controlled release, damped settling; no teleporting hem shapes.
- Enforce hosiery denier optics as physics, not paint: yarn-direction anisotropic sheen, knee/quad stretch brightening, thigh-band pressure transition.
- Enforce skin-optics micro-consistency near garment boundaries: subtle desaturation/compression zones, non-uniform micro-spec breakup.
- Enforce material energy conservation: lambertian + specular balance remains plausible under mixed practical lights.
- Enforce geometric penumbra correctness at thin edges (straps, slit hems, hair strands): no fake ambient smudge shadows.
- Force-chain closure test (must pass): pose load -> local strain -> fold orientation -> highlight elongation -> shadow penumbra.

V9 MICRO-PHYSICS DEEPENING PROTOCOL (HARD):
Primary variant: push non-explicit editorial edge via high-density causal micro-physics and strict two-piece topology integrity.
- Per-zone ledger requirement (must read clearly at 100% zoom): top support edge, waist transition, slit boundary, thigh band, knee contour, ankle/instep, heel-floor contact, hand-prop contact.
- Each zone must display at least 3 coherent cues: strain gradient, seam relief, compression shadow, anisotropic highlight flow, denier gradient, friction-damped drape, support-anchor pressure.
- Causality chain must close: pose/load -> strain field -> fold orientation -> highlight elongation -> penumbra geometry.
- Hosiery micro-physics: yarn-direction sheen, denier-dependent translucency, thigh-band pressure transition, and knee stretch brightening without painted transparency artifacts.
- Skin-edge coupling: subtle compression/desaturation near garment boundaries with non-uniform micro-spec breakup (no hard masks).
- Two-piece mechanics: top hem and skirt waistband remain visually separate and dynamically coupled with phase-lag, never merged into one-piece behavior.
- Optical realism: reflections/shadows must be light-source motivated and roughness-consistent; reject detached highlights and ambient-smudge shadows.
- Mirror lock: preserve single-subject identity in reflections; reject ghost duplicates, mirror warping, and unsafe over-reveal artifacts.
SCORER-ALIGNED CONSISTENCY LOCK:
- Keep direct lens-locked gaze with believable vergence and eyelid tension in final frame.
- Preserve identity fidelity under mixed practical light; no face drift under pose/exposure shifts.
- Enforce complete wardrobe replacement from reference clothing cues.
- If diagnostics criticize prompt adherence, treat output as failed and regenerate with stricter scene/material matching.
- Editorial guardrail: bold but non-explicit, premium nightlife campaign intent only.
V11 FIRST-PRINCIPLES PHYSICS CONTRACT (HARD):
- Color-family lock (hard fail on drift): attire dominant hue/material family must match prompt palette, not generic black/red substitutions.
- Scene-anchor lock (hard fail on drift): keep at least 3 named environment anchors physically present and optically coherent in-frame.
- Lens-lock gaze certainty: iris direction lens-centered with stable catchlight geometry and believable vergence in final frame.
- Edge-separation lock: preserve clean subject-background contour gradients and physically plausible rim/fill transitions (no flat ambient wash).
- Coverage-stability lock: maintain non-explicit support geometry under motion; no safety-ambiguous reveal edges or unstable cutline artifacts.
- 100% zoom micro-audit: seam ridge depth, denier gradient, contact compression, anisotropic spec flow, and penumbra continuity must all cohere.

### Safe Backup Prompt

FIRST-PRINCIPLES TARGET:
Make a believable real camera capture, not an AI-looking render. If directives conflict, prioritize: (1) identity fidelity, (2) direct eye contact to lens, (3) physical plausibility of anatomy/materials/light, (4) editorial risk energy, (5) style details.

Identity lock (non-negotiable): use the provided reference image as the sole identity source for the same adult woman (25+). Preserve face geometry and recognition cues: eye spacing, brow arc, orbital depth, nose bridge, mouth width, chin contour, jawline, hairline pattern, natural asymmetry, and skin undertone. Do not drift into a different person under any lighting or pose.

Gaze lock (hard rule): subject must look directly into the camera lens in the final frame. Keep iris/pupil direction lens-centered with believable vergence and eyelid tension. No off-camera gaze, no downcast eyes, no profile-only eye direction.

Scene:
Keep the same Vegas speakeasy environment with mirrored back-bar wall, stacked decanters, brass shelving, cool edge light with warm pendant fill, deep reflection field. Maintain the same cinematic mood, depth layering, and practical-light logic.

Attire (safe fallback variant):
silver sequin two-piece cocktail set: structured top with opaque side insets and a skirt with moderate slit, black thigh-high hosiery, mirrored pumps
Coverage is safer, but the image must still read as bold and high-impact through physically grounded fit, silhouette, hosiery optics, two-piece coupling realism, and pose confidence.

Pose and narrative:
standing with one hip loaded, forearm brushing bar edge, light torso twist, direct eye contact into lens, poised confidence, premium editorial tone.

Realism foundation:
- Anatomical plausibility: coherent shoulder-pelvis relationship, correct limb proportions, natural hand articulation, heel-ground load mechanics, and valid center-of-mass balance.
- Optics plausibility: realistic depth of field transitions, no cutout halos, no warped edges, no fake blur.
- Lighting plausibility: practical-source motivated key/fill/rim behavior, coherent shadow direction/penumbra, roughness-aware reflections, Fresnel-consistent highlights.

Anti-AI authenticity constraints:
- Keep skin lifelike with pore detail, subtle tonal variation, and no porcelain smoothing.
- Keep hair lifelike with irregular strand grouping and minor flyaways.
- Keep fabric lifelike with non-repeating microtexture and seam irregularity.
- Preserve slight real-world asymmetry in makeup, textile tension, and prop placement.
- Reject outputs with uncanny eyes, plastic skin, rubber fabric, repeated texture stamps, or composited subject separation.

Frontier physics controls:
- Simulate wrinkle hierarchy from first principles: macro gravity folds, meso seam-anchored buckling, micro high-frequency creasing in strain concentration zones.
- Enforce contact mechanics: where body/garment/surface meet, show pressure flattening, shadow occlusion, and material-dependent friction behavior.
- Enforce textile constitutive behavior: stretch anisotropy, bias-direction drape differences, and edge curl response tied to fabric stiffness.
- Enforce two-piece coupling mechanics: top hem stability vs skirt waistband load, phase-lag motion between upper/lower garments, and realistic gap dynamics under torso flexion.
- Enforce attachment realism: strap tension vectors, anchor-point compression, and closure hardware response under motion.
- Enforce optics coherence: polarization-like sheen behavior on satin/hosiery, roughness-dependent specular lobe width, and exposure-consistent highlight rolloff.
- Enforce sensor realism: realistic highlight clipping knees, subtle chroma noise in shadows, and no procedural overcleaning.

Cutting-edge simulation and rendering protocol (last-4-month focus, Dec 2025-Feb 2026):
- PhysDrape-style force pipeline (Feb 2026): infer residual deformation with explicit force balancing, then apply strict differentiable collision projection to eliminate interpenetration without destroying cloth shape.
- ReWeaver-style garment structure prior (Jan 2026): preserve panel/seam logic and topological consistency so deformations remain simulation-ready, not texture-only approximations.
- FNOPT-style rollout strategy (Dec 2025): perform resolution-agnostic coarse-to-fine integration; coarse motion must remain stable before adding medium and micro wrinkle detail.
- PI-Light-style transport prior (Jan 2026): preserve physically plausible diffuse/specular separation under relighting-like changes; highlights should move with light, not with texture.
- RotLight-style ambiguity control (Feb 2026): suppress baked shadows in albedo-like regions and maintain lighting/material disentanglement across reflective textiles.
- Two-piece dynamics priority: top and skirt exchange motion cues through waist/hip acceleration while retaining independent inertia and damping.
- Reject any frame where contact, wrinkle evolution, seam behavior, or reflectance changes are not causally explainable.

Safe adaptation of innovation motif:
Innovation motif: mirror recursion control with roughness-aware reflection decay; sequins exhibit non-uniform microfacet normals instead of uniform glitter noise.

Attire impact through physics (safe fallback):
- Keep safer two-piece coverage geometry while still maintaining a high-impact editorial silhouette through fit tension and contour lighting.
- Preserve believable top/waistband coupling with secure support behavior and stable anchor mechanics.
- Preserve slit/hem movement logic and hosiery optics with the same physical rigor.
- Maintain non-explicit but bold visual energy via posture, gaze, and material response.
- Use conservative but explicit damping cues: motion settles naturally, with no frozen cloth or chaotic flutter.

Material system (safe fallback):
- Preserve all high-fidelity fabric behavior: drape, crease hierarchy, seam stress, contact compression, and realistic sheen.
- Hosiery must remain physically convincing: denier gradients, stretch maps, cuff pressure transitions, and ankle micro-creases.
- Preserve two-piece physics integrity: top and skirt can move independently while remaining cohesively styled and mechanically stable.

Editorial continuity (safe fallback):
- Keep the same scene, camera realism, and direct-lens eye contact as primary.
- Avoid making safe variant look plain; it must still read as premium nightlife couture.
- Preserve strong silhouette legibility and high-fashion intent.

Camera and render intent:
- Vertical 4:5 framing, output target 2K.
- Photographic realism over stylization, with coherent DOF and physically motivated lighting.
- Keep texture integrity in skin, hair, lace/mesh, and hosiery edges.

Environment integration:
- Keep subject physically anchored to set via contact shadows, reflection consistency, and realistic surface interactions.
- Maintain scene depth through controlled haze and practical-light separation.

Quality gate (safe fallback):
- No identity drift, no uncanny anatomy, no artificial skin smoothing, no fake transparency, no reflection mismatch.
- Final image must look camera-captured, luxurious, and believable.

AUDIT-V6 QUALITY ENFORCEMENT (SAFE, HARD):
- Keep safer coverage, but preserve explicit two-piece topology with visible top hem and separate skirt waistband.
- Forbidden substitutions remain: one-piece dress, bodysuit, jumpsuit, romper, faux-cutout single-panel dress.
- Maintain prompt-specified material and color family so safe variant still matches the concept.
- Maintain edgy nightlife mood via controlled contrast, directional practical light, and subject-background separation.
- Keep the same physics rigor:
  - Stable garment support mechanics in coverage-critical zones.
  - Contact-compression cues at skin/garment and garment/surface interfaces.
  - Top/skirt decoupled inertia with coherent damping and slit response.
  - Hosiery optics from denier gradients and stretch-driven shading.
- Regenerate if safe variant looks plain/casual, loses two-piece identity, or shows non-causal cloth/light behavior.

---

DEVILS-ADVOCATE MICRO-PHYSICS ESCALATION (SAFE, HARD):
- Keep safe coverage, but apply the same micro-physics rigor and reject texture-only pseudo-realism.
- Preserve multi-band wrinkle spectra (micro/meso/macro) with stress-aligned orientation and stable damping.
- Preserve seam/stitch relief cues and waistband/top-hem contact compression under safe-support constraints.
- Preserve hosiery denier micro-optics (anisotropic yarn sheen, stretch transitions, thigh-band compression gradient).
- Preserve slip-stick hem dynamics and friction-coupled contact at seating/rail/bar interfaces.
- Preserve edge-penumbra correctness and avoid painted AO artifacts at thin geometry boundaries.
- Safe does not mean flat: maintain high-fidelity micro-causality while preventing topology collapse to one-piece silhouettes.

---

V9 MICRO-PHYSICS DEEPENING PROTOCOL (HARD):
Safe variant: keep coverage-stable geometry while maximizing editorial edge through physically grounded contour, translucency windows, and strain logic.
- Per-zone ledger requirement (must read clearly at 100% zoom): top support edge, waist transition, slit boundary, thigh band, knee contour, ankle/instep, heel-floor contact, hand-prop contact.
- Each zone must display at least 3 coherent cues: strain gradient, seam relief, compression shadow, anisotropic highlight flow, denier gradient, friction-damped drape, support-anchor pressure.
- Causality chain must close: pose/load -> strain field -> fold orientation -> highlight elongation -> penumbra geometry.
- Hosiery micro-physics: yarn-direction sheen, denier-dependent translucency, thigh-band pressure transition, and knee stretch brightening without painted transparency artifacts.
- Skin-edge coupling: subtle compression/desaturation near garment boundaries with non-uniform micro-spec breakup (no hard masks).
- Two-piece mechanics: top hem and skirt waistband remain visually separate and dynamically coupled with phase-lag, never merged into one-piece behavior.
- Optical realism: reflections/shadows must be light-source motivated and roughness-consistent; reject detached highlights and ambient-smudge shadows.
- Mirror lock: preserve single-subject identity in reflections; reject ghost duplicates, mirror warping, and unsafe over-reveal artifacts.
SCORER-ALIGNED CONSISTENCY LOCK:
- Keep direct lens-locked gaze with believable vergence and eyelid tension in final frame.
- Preserve identity fidelity under mixed practical light; no face drift under pose/exposure shifts.
- Enforce complete wardrobe replacement from reference clothing cues.
- If diagnostics criticize prompt adherence, treat output as failed and regenerate with stricter scene/material matching.
- Safety guardrail: no nudity, no explicit framing, no fetish framing, no unstable reveal artifacts.
V11 SAFE FIRST-PRINCIPLES PHYSICS CONTRACT (HARD):
- Safe does not mean generic: preserve prompt-specific palette and scene anchors while maintaining coverage-stable geometry.
- Color lock: safe attire must stay within the named palette and material family, with no neutralized wardrobe substitution.
- Scene lock: preserve at least 3 named environment anchors with coherent reflections/shadows and contact cues.
- Lens-lock gaze certainty: direct camera eye alignment with credible eyelid tension and catchlight placement.
- Physics lock: maintain two-piece topology, denier optics, seam relief, and contact-compression causality at 100% inspection.

---

## Prompt 06 - Poker Room Obsidian

- Primary word count: 1633
- Safe word count: 1487

### Primary Prompt

FIRST-PRINCIPLES TARGET:
Make a believable real camera capture, not an AI-looking render. If directives conflict, prioritize: (1) identity fidelity, (2) direct eye contact to lens, (3) physical plausibility of anatomy/materials/light, (4) editorial risk energy, (5) style details.

Identity lock (non-negotiable): use the provided reference image as the sole identity source for the same adult woman (25+). Preserve face geometry and recognition cues: eye spacing, brow arc, orbital depth, nose bridge, mouth width, chin contour, jawline, hairline pattern, natural asymmetry, and skin undertone. Do not drift into a different person under any lighting or pose.

Gaze lock (hard rule): subject must look directly into the camera lens in the final frame. Keep iris/pupil direction lens-centered with believable vergence and eyelid tension. No off-camera gaze, no downcast eyes, no profile-only eye direction.

Scene:
Vegas speakeasy environment with private poker room with banker lamps, mahogany table, chip stacks, smoke haze and warm-cone lighting. Build layered depth (foreground cues, subject mid-plane, background practicals). Subject must feel physically present in the environment.

Attire (primary edge variant):
black satin tux two-piece cocktail set: plunge-structured lapel top and a high-slit pencil skirt, black sheer thigh-high hosiery, needle heels
Use reveal-by-physics rather than explicit framing: contour fit, strain gradients, seam tension maps, and pose-driven two-piece behavior.
Hard two-piece rule: top and skirt must behave as distinct garments with coherent coupling at the waist region, not as a single merged dress.

Pose and narrative:
seated edge pose transitioning to stand, hand pressure on table felt, direct eye contact into lens, confident expression, controlled editorial energy.

Realism foundation:
- Anatomical plausibility: coherent shoulder-pelvis relationship, correct limb proportions, natural hand articulation, heel-ground load mechanics, and valid center-of-mass balance.
- Optics plausibility: realistic depth of field transitions, no cutout halos, no warped edges, no fake blur.
- Lighting plausibility: practical-source motivated key/fill/rim behavior, coherent shadow direction/penumbra, roughness-aware reflections, Fresnel-consistent highlights.

Anti-AI authenticity constraints:
- Keep skin lifelike with pore detail, subtle tonal variation, and no porcelain smoothing.
- Keep hair lifelike with irregular strand grouping and minor flyaways.
- Keep fabric lifelike with non-repeating microtexture and seam irregularity.
- Preserve slight real-world asymmetry in makeup, textile tension, and prop placement.
- Reject outputs with uncanny eyes, plastic skin, rubber fabric, repeated texture stamps, or composited subject separation.

Frontier physics controls:
- Simulate wrinkle hierarchy from first principles: macro gravity folds, meso seam-anchored buckling, micro high-frequency creasing in strain concentration zones.
- Enforce contact mechanics: where body/garment/surface meet, show pressure flattening, shadow occlusion, and material-dependent friction behavior.
- Enforce textile constitutive behavior: stretch anisotropy, bias-direction drape differences, and edge curl response tied to fabric stiffness.
- Enforce two-piece coupling mechanics: top hem stability vs skirt waistband load, phase-lag motion between upper/lower garments, and realistic gap dynamics under torso flexion.
- Enforce attachment realism: strap tension vectors, anchor-point compression, and closure hardware response under motion.
- Enforce optics coherence: polarization-like sheen behavior on satin/hosiery, roughness-dependent specular lobe width, and exposure-consistent highlight rolloff.
- Enforce sensor realism: realistic highlight clipping knees, subtle chroma noise in shadows, and no procedural overcleaning.

Cutting-edge simulation and rendering protocol (last-4-month focus, Dec 2025-Feb 2026):
- PhysDrape-style force pipeline (Feb 2026): infer residual deformation with explicit force balancing, then apply strict differentiable collision projection to eliminate interpenetration without destroying cloth shape.
- ReWeaver-style garment structure prior (Jan 2026): preserve panel/seam logic and topological consistency so deformations remain simulation-ready, not texture-only approximations.
- FNOPT-style rollout strategy (Dec 2025): perform resolution-agnostic coarse-to-fine integration; coarse motion must remain stable before adding medium and micro wrinkle detail.
- PI-Light-style transport prior (Jan 2026): preserve physically plausible diffuse/specular separation under relighting-like changes; highlights should move with light, not with texture.
- RotLight-style ambiguity control (Feb 2026): suppress baked shadows in albedo-like regions and maintain lighting/material disentanglement across reflective textiles.
- Two-piece dynamics priority: top and skirt exchange motion cues through waist/hip acceleration while retaining independent inertia and damping.
- Reject any frame where contact, wrinkle evolution, seam behavior, or reflectance changes are not causally explainable.

Innovation motif: poker-felt friction coefficient effects on hand pressure deformation; blazer fabric buckling transitions at lapel fold lines under torso twist.

Attire impact through physics (primary):
- Build a contour-forward two-piece silhouette via strain maps, seam load paths, and controlled tension around bustline/waist/hip/upper leg.
- Use top-vs-skirt interaction physics: independent motion with believable timing offsets and no fused-garment behavior.
- Use slit dynamics tied to pose/gravity so opening behavior follows leg angle and movement.
- Use sheer optical behavior through denier gradients and layered occlusion, never as flat painted transparency.
- Use phase-aware motion transfer: torso acceleration drives delayed hem response, then damping settles folds without jitter.

Material system (primary):
- Satin/silk: anisotropic highlight flow, gravity drape vectors, compression folds at contact points.
- Velvet: direction-dependent pile shading and contact darkening.
- Sequins/crystals: controlled spark distribution with micro-normal variation, no random glitter noise.
- Hosiery: thigh-band compression transition, stretch over knee contour, ankle micro-wrinkling, directional sheen.
- Two-piece structure: waistband bending stiffness, top hem recovery, and closure/strap tension that remains physically plausible frame to frame.
- Use shell-like bending behavior cues (Kirchhoff-Love style): smooth curvature in low-strain zones and tight buckling only near constrained seams.

Editorial risk energy (primary, non-explicit):
- Keep wardrobe and pose bold, assertive, and fashion-forward while staying non-explicit.
- Favor long leg-line projection, strong S-curve torso-leg flow, and confident chin/eye tension.
- Keep full outfit readable in frame with contour-defining light placement.

Camera and render intent:
- Vertical 4:5 framing, output target 2K.
- Lens behavior should feel like premium editorial capture (roughly 50-85mm equivalent perspective).
- Filmic noise only, no heavy denoise smear, no oversharpen halos, no synthetic texture mush.

Environment integration:
- Subject must physically belong in the set: contact shadows, reflection coherence, and interaction with nearby surfaces.
- Haze should add depth separation without washing contrast.
- Keep practical highlights and reflective cues consistent with object roughness and angle.

Extreme realism audit (primary):
- Validate physically causal links: pose -> tension map -> fold pattern -> highlight path -> shadow placement.
- Any non-causal cloth fold, reflection mismatch, or eye-direction inconsistency is a hard failure.
- Preserve cinematic boldness while remaining fully believable as a real photographed moment.

Quality gate (primary):
- Real-camera believability under close inspection.
- No broken fingers, no warped feet, no fabric clipping, no face drift, no incorrect eye direction.
- Deliver a high-end Vegas editorial still with strong, edge-forward style and uncompromised realism.

AUDIT-V6 QUALITY ENFORCEMENT (PRIMARY, HARD):
- Two-piece topology lock: render two physically separate garments with a visible waist separation line in final frame.
- Forbidden substitutions: one-piece dress, bodysuit, jumpsuit, romper, faux-cutout single-panel dress.
- Material-color lock: keep prompt-specified material and color family dominant and unmistakable.
- Edge mood lock: premium nightlife contrast only; no flat, casual, daylight, or domestic snapshot lighting.
- Pose-energy lock: assertive editorial posture with strong leg-line projection and clear silhouette readability.
- Physics innovation stack:
  - XPBD-like cloth constraint hierarchy (seam stiffness > panel stiffness > edge drape compliance).
  - Frictional garment-skin contact with pressure-gradient shading at garment boundaries.
  - Top/skirt phase-lag dynamics with waist-coupled impulse transfer.
  - Anisotropic textile BRDF plus denier-dependent hosiery translucency.
- Regenerate if any appear: fused top/skirt silhouette, prompt-material substitution, weak contour separation, or non-causal fold/specular behavior.

DEVILS-ADVOCATE MICRO-PHYSICS ESCALATION (PRIMARY, HARD):
- Reject any image where cloth realism could be explained by flat texture mapping alone.
- Enforce multi-band wrinkle spectra tied to stress tensors:
  - micro band: 2-4 mm crease ripples at high-strain seams,
  - meso band: 6-12 mm folds along bias/shear flow,
  - macro band: 20-40 mm gravity drape lobes.
- Enforce stitch-pull periodicity and seam-ridge relief (about 1-3 mm apparent depth) at structural joins.
- Enforce contact indentation at support edges (about 0.5-2.0 mm apparent compression) with narrow occlusion gradients.
- Enforce slit-edge slip-stick mechanics: brief friction hold, controlled release, damped settling; no teleporting hem shapes.
- Enforce hosiery denier optics as physics, not paint: yarn-direction anisotropic sheen, knee/quad stretch brightening, thigh-band pressure transition.
- Enforce skin-optics micro-consistency near garment boundaries: subtle desaturation/compression zones, non-uniform micro-spec breakup.
- Enforce material energy conservation: lambertian + specular balance remains plausible under mixed practical lights.
- Enforce geometric penumbra correctness at thin edges (straps, slit hems, hair strands): no fake ambient smudge shadows.
- Force-chain closure test (must pass): pose load -> local strain -> fold orientation -> highlight elongation -> shadow penumbra.

V9 MICRO-PHYSICS DEEPENING PROTOCOL (HARD):
Primary variant: push non-explicit editorial edge via high-density causal micro-physics and strict two-piece topology integrity.
- Per-zone ledger requirement (must read clearly at 100% zoom): top support edge, waist transition, slit boundary, thigh band, knee contour, ankle/instep, heel-floor contact, hand-prop contact.
- Each zone must display at least 3 coherent cues: strain gradient, seam relief, compression shadow, anisotropic highlight flow, denier gradient, friction-damped drape, support-anchor pressure.
- Causality chain must close: pose/load -> strain field -> fold orientation -> highlight elongation -> penumbra geometry.
- Hosiery micro-physics: yarn-direction sheen, denier-dependent translucency, thigh-band pressure transition, and knee stretch brightening without painted transparency artifacts.
- Skin-edge coupling: subtle compression/desaturation near garment boundaries with non-uniform micro-spec breakup (no hard masks).
- Two-piece mechanics: top hem and skirt waistband remain visually separate and dynamically coupled with phase-lag, never merged into one-piece behavior.
- Optical realism: reflections/shadows must be light-source motivated and roughness-consistent; reject detached highlights and ambient-smudge shadows.
- Poker lock: felt friction and forearm compression cues must align with table geometry and chip contact shadows.
SCORER-ALIGNED CONSISTENCY LOCK:
- Keep direct lens-locked gaze with believable vergence and eyelid tension in final frame.
- Preserve identity fidelity under mixed practical light; no face drift under pose/exposure shifts.
- Enforce complete wardrobe replacement from reference clothing cues.
- If diagnostics criticize prompt adherence, treat output as failed and regenerate with stricter scene/material matching.
- Editorial guardrail: bold but non-explicit, premium nightlife campaign intent only.
V11 FIRST-PRINCIPLES PHYSICS CONTRACT (HARD):
- Color-family lock (hard fail on drift): attire dominant hue/material family must match prompt palette, not generic black/red substitutions.
- Scene-anchor lock (hard fail on drift): keep at least 3 named environment anchors physically present and optically coherent in-frame.
- Lens-lock gaze certainty: iris direction lens-centered with stable catchlight geometry and believable vergence in final frame.
- Edge-separation lock: preserve clean subject-background contour gradients and physically plausible rim/fill transitions (no flat ambient wash).
- Coverage-stability lock: maintain non-explicit support geometry under motion; no safety-ambiguous reveal edges or unstable cutline artifacts.
- 100% zoom micro-audit: seam ridge depth, denier gradient, contact compression, anisotropic spec flow, and penumbra continuity must all cohere.

### Safe Backup Prompt

FIRST-PRINCIPLES TARGET:
Make a believable real camera capture, not an AI-looking render. If directives conflict, prioritize: (1) identity fidelity, (2) direct eye contact to lens, (3) physical plausibility of anatomy/materials/light, (4) editorial risk energy, (5) style details.

Identity lock (non-negotiable): use the provided reference image as the sole identity source for the same adult woman (25+). Preserve face geometry and recognition cues: eye spacing, brow arc, orbital depth, nose bridge, mouth width, chin contour, jawline, hairline pattern, natural asymmetry, and skin undertone. Do not drift into a different person under any lighting or pose.

Gaze lock (hard rule): subject must look directly into the camera lens in the final frame. Keep iris/pupil direction lens-centered with believable vergence and eyelid tension. No off-camera gaze, no downcast eyes, no profile-only eye direction.

Scene:
Keep the same Vegas speakeasy environment with private poker room with banker lamps, mahogany table, chip stacks, smoke haze and warm-cone lighting. Maintain the same cinematic mood, depth layering, and practical-light logic.

Attire (safe fallback variant):
black satin tux two-piece cocktail set: closed lapel top and a pencil skirt with moderate slit, black thigh-high hosiery, needle pumps
Coverage is safer, but the image must still read as bold and high-impact through physically grounded fit, silhouette, hosiery optics, two-piece coupling realism, and pose confidence.

Pose and narrative:
seated edge pose transitioning to stand, hand pressure on table felt, direct eye contact into lens, poised confidence, premium editorial tone.

Realism foundation:
- Anatomical plausibility: coherent shoulder-pelvis relationship, correct limb proportions, natural hand articulation, heel-ground load mechanics, and valid center-of-mass balance.
- Optics plausibility: realistic depth of field transitions, no cutout halos, no warped edges, no fake blur.
- Lighting plausibility: practical-source motivated key/fill/rim behavior, coherent shadow direction/penumbra, roughness-aware reflections, Fresnel-consistent highlights.

Anti-AI authenticity constraints:
- Keep skin lifelike with pore detail, subtle tonal variation, and no porcelain smoothing.
- Keep hair lifelike with irregular strand grouping and minor flyaways.
- Keep fabric lifelike with non-repeating microtexture and seam irregularity.
- Preserve slight real-world asymmetry in makeup, textile tension, and prop placement.
- Reject outputs with uncanny eyes, plastic skin, rubber fabric, repeated texture stamps, or composited subject separation.

Frontier physics controls:
- Simulate wrinkle hierarchy from first principles: macro gravity folds, meso seam-anchored buckling, micro high-frequency creasing in strain concentration zones.
- Enforce contact mechanics: where body/garment/surface meet, show pressure flattening, shadow occlusion, and material-dependent friction behavior.
- Enforce textile constitutive behavior: stretch anisotropy, bias-direction drape differences, and edge curl response tied to fabric stiffness.
- Enforce two-piece coupling mechanics: top hem stability vs skirt waistband load, phase-lag motion between upper/lower garments, and realistic gap dynamics under torso flexion.
- Enforce attachment realism: strap tension vectors, anchor-point compression, and closure hardware response under motion.
- Enforce optics coherence: polarization-like sheen behavior on satin/hosiery, roughness-dependent specular lobe width, and exposure-consistent highlight rolloff.
- Enforce sensor realism: realistic highlight clipping knees, subtle chroma noise in shadows, and no procedural overcleaning.

Cutting-edge simulation and rendering protocol (last-4-month focus, Dec 2025-Feb 2026):
- PhysDrape-style force pipeline (Feb 2026): infer residual deformation with explicit force balancing, then apply strict differentiable collision projection to eliminate interpenetration without destroying cloth shape.
- ReWeaver-style garment structure prior (Jan 2026): preserve panel/seam logic and topological consistency so deformations remain simulation-ready, not texture-only approximations.
- FNOPT-style rollout strategy (Dec 2025): perform resolution-agnostic coarse-to-fine integration; coarse motion must remain stable before adding medium and micro wrinkle detail.
- PI-Light-style transport prior (Jan 2026): preserve physically plausible diffuse/specular separation under relighting-like changes; highlights should move with light, not with texture.
- RotLight-style ambiguity control (Feb 2026): suppress baked shadows in albedo-like regions and maintain lighting/material disentanglement across reflective textiles.
- Two-piece dynamics priority: top and skirt exchange motion cues through waist/hip acceleration while retaining independent inertia and damping.
- Reject any frame where contact, wrinkle evolution, seam behavior, or reflectance changes are not causally explainable.

Safe adaptation of innovation motif:
Innovation motif: poker-felt friction coefficient effects on hand pressure deformation; blazer fabric buckling transitions at lapel fold lines under torso twist.

Attire impact through physics (safe fallback):
- Keep safer two-piece coverage geometry while still maintaining a high-impact editorial silhouette through fit tension and contour lighting.
- Preserve believable top/waistband coupling with secure support behavior and stable anchor mechanics.
- Preserve slit/hem movement logic and hosiery optics with the same physical rigor.
- Maintain non-explicit but bold visual energy via posture, gaze, and material response.
- Use conservative but explicit damping cues: motion settles naturally, with no frozen cloth or chaotic flutter.

Material system (safe fallback):
- Preserve all high-fidelity fabric behavior: drape, crease hierarchy, seam stress, contact compression, and realistic sheen.
- Hosiery must remain physically convincing: denier gradients, stretch maps, cuff pressure transitions, and ankle micro-creases.
- Preserve two-piece physics integrity: top and skirt can move independently while remaining cohesively styled and mechanically stable.

Editorial continuity (safe fallback):
- Keep the same scene, camera realism, and direct-lens eye contact as primary.
- Avoid making safe variant look plain; it must still read as premium nightlife couture.
- Preserve strong silhouette legibility and high-fashion intent.

Camera and render intent:
- Vertical 4:5 framing, output target 2K.
- Photographic realism over stylization, with coherent DOF and physically motivated lighting.
- Keep texture integrity in skin, hair, lace/mesh, and hosiery edges.

Environment integration:
- Keep subject physically anchored to set via contact shadows, reflection consistency, and realistic surface interactions.
- Maintain scene depth through controlled haze and practical-light separation.

Quality gate (safe fallback):
- No identity drift, no uncanny anatomy, no artificial skin smoothing, no fake transparency, no reflection mismatch.
- Final image must look camera-captured, luxurious, and believable.

AUDIT-V6 QUALITY ENFORCEMENT (SAFE, HARD):
- Keep safer coverage, but preserve explicit two-piece topology with visible top hem and separate skirt waistband.
- Forbidden substitutions remain: one-piece dress, bodysuit, jumpsuit, romper, faux-cutout single-panel dress.
- Maintain prompt-specified material and color family so safe variant still matches the concept.
- Maintain edgy nightlife mood via controlled contrast, directional practical light, and subject-background separation.
- Keep the same physics rigor:
  - Stable garment support mechanics in coverage-critical zones.
  - Contact-compression cues at skin/garment and garment/surface interfaces.
  - Top/skirt decoupled inertia with coherent damping and slit response.
  - Hosiery optics from denier gradients and stretch-driven shading.
- Regenerate if safe variant looks plain/casual, loses two-piece identity, or shows non-causal cloth/light behavior.

---

DEVILS-ADVOCATE MICRO-PHYSICS ESCALATION (SAFE, HARD):
- Keep safe coverage, but apply the same micro-physics rigor and reject texture-only pseudo-realism.
- Preserve multi-band wrinkle spectra (micro/meso/macro) with stress-aligned orientation and stable damping.
- Preserve seam/stitch relief cues and waistband/top-hem contact compression under safe-support constraints.
- Preserve hosiery denier micro-optics (anisotropic yarn sheen, stretch transitions, thigh-band compression gradient).
- Preserve slip-stick hem dynamics and friction-coupled contact at seating/rail/bar interfaces.
- Preserve edge-penumbra correctness and avoid painted AO artifacts at thin geometry boundaries.
- Safe does not mean flat: maintain high-fidelity micro-causality while preventing topology collapse to one-piece silhouettes.

---

V9 MICRO-PHYSICS DEEPENING PROTOCOL (HARD):
Safe variant: keep coverage-stable geometry while maximizing editorial edge through physically grounded contour, translucency windows, and strain logic.
- Per-zone ledger requirement (must read clearly at 100% zoom): top support edge, waist transition, slit boundary, thigh band, knee contour, ankle/instep, heel-floor contact, hand-prop contact.
- Each zone must display at least 3 coherent cues: strain gradient, seam relief, compression shadow, anisotropic highlight flow, denier gradient, friction-damped drape, support-anchor pressure.
- Causality chain must close: pose/load -> strain field -> fold orientation -> highlight elongation -> penumbra geometry.
- Hosiery micro-physics: yarn-direction sheen, denier-dependent translucency, thigh-band pressure transition, and knee stretch brightening without painted transparency artifacts.
- Skin-edge coupling: subtle compression/desaturation near garment boundaries with non-uniform micro-spec breakup (no hard masks).
- Two-piece mechanics: top hem and skirt waistband remain visually separate and dynamically coupled with phase-lag, never merged into one-piece behavior.
- Optical realism: reflections/shadows must be light-source motivated and roughness-consistent; reject detached highlights and ambient-smudge shadows.
- Poker lock: felt friction and forearm compression cues must align with table geometry and chip contact shadows.
SCORER-ALIGNED CONSISTENCY LOCK:
- Keep direct lens-locked gaze with believable vergence and eyelid tension in final frame.
- Preserve identity fidelity under mixed practical light; no face drift under pose/exposure shifts.
- Enforce complete wardrobe replacement from reference clothing cues.
- If diagnostics criticize prompt adherence, treat output as failed and regenerate with stricter scene/material matching.
- Safety guardrail: no nudity, no explicit framing, no fetish framing, no unstable reveal artifacts.
V11 SAFE FIRST-PRINCIPLES PHYSICS CONTRACT (HARD):
- Safe does not mean generic: preserve prompt-specific palette and scene anchors while maintaining coverage-stable geometry.
- Color lock: safe attire must stay within the named palette and material family, with no neutralized wardrobe substitution.
- Scene lock: preserve at least 3 named environment anchors with coherent reflections/shadows and contact cues.
- Lens-lock gaze certainty: direct camera eye alignment with credible eyelid tension and catchlight placement.
- Physics lock: maintain two-piece topology, denier optics, seam relief, and contact-compression causality at 100% inspection.

---

## Prompt 07 - Absinthe Green Current

- Primary word count: 1632
- Safe word count: 1482

### Primary Prompt

FIRST-PRINCIPLES TARGET:
Make a believable real camera capture, not an AI-looking render. If directives conflict, prioritize: (1) identity fidelity, (2) direct eye contact to lens, (3) physical plausibility of anatomy/materials/light, (4) editorial risk energy, (5) style details.

Identity lock (non-negotiable): use the provided reference image as the sole identity source for the same adult woman (25+). Preserve face geometry and recognition cues: eye spacing, brow arc, orbital depth, nose bridge, mouth width, chin contour, jawline, hairline pattern, natural asymmetry, and skin undertone. Do not drift into a different person under any lighting or pose.

Gaze lock (hard rule): subject must look directly into the camera lens in the final frame. Keep iris/pupil direction lens-centered with believable vergence and eyelid tension. No off-camera gaze, no downcast eyes, no profile-only eye direction.

Scene:
Vegas speakeasy environment with absinthe service station with antique glassware, perforated spoon ritual setup, emerald glow, brass taps, mirror scatter. Build layered depth (foreground cues, subject mid-plane, background practicals). Subject must feel physically present in the environment.

Attire (primary edge variant):
absinthe-green two-piece cocktail set: translucent contour top with narrow side reveal lines and a high-slit skirt, black thigh-high hosiery, jeweled heels
Use reveal-by-physics rather than explicit framing: contour fit, strain gradients, seam tension maps, and pose-driven two-piece behavior.
Hard two-piece rule: top and skirt must behave as distinct garments with coherent coupling at the waist region, not as a single merged dress.

Pose and narrative:
one leg forward at bar rail, shoulder offset, hand hovering near absinthe glass, direct eye contact into lens, confident expression, controlled editorial energy.

Realism foundation:
- Anatomical plausibility: coherent shoulder-pelvis relationship, correct limb proportions, natural hand articulation, heel-ground load mechanics, and valid center-of-mass balance.
- Optics plausibility: realistic depth of field transitions, no cutout halos, no warped edges, no fake blur.
- Lighting plausibility: practical-source motivated key/fill/rim behavior, coherent shadow direction/penumbra, roughness-aware reflections, Fresnel-consistent highlights.

Anti-AI authenticity constraints:
- Keep skin lifelike with pore detail, subtle tonal variation, and no porcelain smoothing.
- Keep hair lifelike with irregular strand grouping and minor flyaways.
- Keep fabric lifelike with non-repeating microtexture and seam irregularity.
- Preserve slight real-world asymmetry in makeup, textile tension, and prop placement.
- Reject outputs with uncanny eyes, plastic skin, rubber fabric, repeated texture stamps, or composited subject separation.

Frontier physics controls:
- Simulate wrinkle hierarchy from first principles: macro gravity folds, meso seam-anchored buckling, micro high-frequency creasing in strain concentration zones.
- Enforce contact mechanics: where body/garment/surface meet, show pressure flattening, shadow occlusion, and material-dependent friction behavior.
- Enforce textile constitutive behavior: stretch anisotropy, bias-direction drape differences, and edge curl response tied to fabric stiffness.
- Enforce two-piece coupling mechanics: top hem stability vs skirt waistband load, phase-lag motion between upper/lower garments, and realistic gap dynamics under torso flexion.
- Enforce attachment realism: strap tension vectors, anchor-point compression, and closure hardware response under motion.
- Enforce optics coherence: polarization-like sheen behavior on satin/hosiery, roughness-dependent specular lobe width, and exposure-consistent highlight rolloff.
- Enforce sensor realism: realistic highlight clipping knees, subtle chroma noise in shadows, and no procedural overcleaning.

Cutting-edge simulation and rendering protocol (last-4-month focus, Dec 2025-Feb 2026):
- PhysDrape-style force pipeline (Feb 2026): infer residual deformation with explicit force balancing, then apply strict differentiable collision projection to eliminate interpenetration without destroying cloth shape.
- ReWeaver-style garment structure prior (Jan 2026): preserve panel/seam logic and topological consistency so deformations remain simulation-ready, not texture-only approximations.
- FNOPT-style rollout strategy (Dec 2025): perform resolution-agnostic coarse-to-fine integration; coarse motion must remain stable before adding medium and micro wrinkle detail.
- PI-Light-style transport prior (Jan 2026): preserve physically plausible diffuse/specular separation under relighting-like changes; highlights should move with light, not with texture.
- RotLight-style ambiguity control (Feb 2026): suppress baked shadows in albedo-like regions and maintain lighting/material disentanglement across reflective textiles.
- Two-piece dynamics priority: top and skirt exchange motion cues through waist/hip acceleration while retaining independent inertia and damping.
- Reject any frame where contact, wrinkle evolution, seam behavior, or reflectance changes are not causally explainable.

Innovation motif: absinthe-glass caustic spill and green spectral bias interacting with sheer textile translucency gradients and cuff compression lines.

Attire impact through physics (primary):
- Build a contour-forward two-piece silhouette via strain maps, seam load paths, and controlled tension around bustline/waist/hip/upper leg.
- Use top-vs-skirt interaction physics: independent motion with believable timing offsets and no fused-garment behavior.
- Use slit dynamics tied to pose/gravity so opening behavior follows leg angle and movement.
- Use sheer optical behavior through denier gradients and layered occlusion, never as flat painted transparency.
- Use phase-aware motion transfer: torso acceleration drives delayed hem response, then damping settles folds without jitter.

Material system (primary):
- Satin/silk: anisotropic highlight flow, gravity drape vectors, compression folds at contact points.
- Velvet: direction-dependent pile shading and contact darkening.
- Sequins/crystals: controlled spark distribution with micro-normal variation, no random glitter noise.
- Hosiery: thigh-band compression transition, stretch over knee contour, ankle micro-wrinkling, directional sheen.
- Two-piece structure: waistband bending stiffness, top hem recovery, and closure/strap tension that remains physically plausible frame to frame.
- Use shell-like bending behavior cues (Kirchhoff-Love style): smooth curvature in low-strain zones and tight buckling only near constrained seams.

Editorial risk energy (primary, non-explicit):
- Keep wardrobe and pose bold, assertive, and fashion-forward while staying non-explicit.
- Favor long leg-line projection, strong S-curve torso-leg flow, and confident chin/eye tension.
- Keep full outfit readable in frame with contour-defining light placement.

Camera and render intent:
- Vertical 4:5 framing, output target 2K.
- Lens behavior should feel like premium editorial capture (roughly 50-85mm equivalent perspective).
- Filmic noise only, no heavy denoise smear, no oversharpen halos, no synthetic texture mush.

Environment integration:
- Subject must physically belong in the set: contact shadows, reflection coherence, and interaction with nearby surfaces.
- Haze should add depth separation without washing contrast.
- Keep practical highlights and reflective cues consistent with object roughness and angle.

Extreme realism audit (primary):
- Validate physically causal links: pose -> tension map -> fold pattern -> highlight path -> shadow placement.
- Any non-causal cloth fold, reflection mismatch, or eye-direction inconsistency is a hard failure.
- Preserve cinematic boldness while remaining fully believable as a real photographed moment.

Quality gate (primary):
- Real-camera believability under close inspection.
- No broken fingers, no warped feet, no fabric clipping, no face drift, no incorrect eye direction.
- Deliver a high-end Vegas editorial still with strong, edge-forward style and uncompromised realism.

AUDIT-V6 QUALITY ENFORCEMENT (PRIMARY, HARD):
- Two-piece topology lock: render two physically separate garments with a visible waist separation line in final frame.
- Forbidden substitutions: one-piece dress, bodysuit, jumpsuit, romper, faux-cutout single-panel dress.
- Material-color lock: keep prompt-specified material and color family dominant and unmistakable.
- Edge mood lock: premium nightlife contrast only; no flat, casual, daylight, or domestic snapshot lighting.
- Pose-energy lock: assertive editorial posture with strong leg-line projection and clear silhouette readability.
- Physics innovation stack:
  - XPBD-like cloth constraint hierarchy (seam stiffness > panel stiffness > edge drape compliance).
  - Frictional garment-skin contact with pressure-gradient shading at garment boundaries.
  - Top/skirt phase-lag dynamics with waist-coupled impulse transfer.
  - Anisotropic textile BRDF plus denier-dependent hosiery translucency.
- Regenerate if any appear: fused top/skirt silhouette, prompt-material substitution, weak contour separation, or non-causal fold/specular behavior.

DEVILS-ADVOCATE MICRO-PHYSICS ESCALATION (PRIMARY, HARD):
- Reject any image where cloth realism could be explained by flat texture mapping alone.
- Enforce multi-band wrinkle spectra tied to stress tensors:
  - micro band: 2-4 mm crease ripples at high-strain seams,
  - meso band: 6-12 mm folds along bias/shear flow,
  - macro band: 20-40 mm gravity drape lobes.
- Enforce stitch-pull periodicity and seam-ridge relief (about 1-3 mm apparent depth) at structural joins.
- Enforce contact indentation at support edges (about 0.5-2.0 mm apparent compression) with narrow occlusion gradients.
- Enforce slit-edge slip-stick mechanics: brief friction hold, controlled release, damped settling; no teleporting hem shapes.
- Enforce hosiery denier optics as physics, not paint: yarn-direction anisotropic sheen, knee/quad stretch brightening, thigh-band pressure transition.
- Enforce skin-optics micro-consistency near garment boundaries: subtle desaturation/compression zones, non-uniform micro-spec breakup.
- Enforce material energy conservation: lambertian + specular balance remains plausible under mixed practical lights.
- Enforce geometric penumbra correctness at thin edges (straps, slit hems, hair strands): no fake ambient smudge shadows.
- Force-chain closure test (must pass): pose load -> local strain -> fold orientation -> highlight elongation -> shadow penumbra.

V9 MICRO-PHYSICS DEEPENING PROTOCOL (HARD):
Primary variant: push non-explicit editorial edge via high-density causal micro-physics and strict two-piece topology integrity.
- Per-zone ledger requirement (must read clearly at 100% zoom): top support edge, waist transition, slit boundary, thigh band, knee contour, ankle/instep, heel-floor contact, hand-prop contact.
- Each zone must display at least 3 coherent cues: strain gradient, seam relief, compression shadow, anisotropic highlight flow, denier gradient, friction-damped drape, support-anchor pressure.
- Causality chain must close: pose/load -> strain field -> fold orientation -> highlight elongation -> penumbra geometry.
- Hosiery micro-physics: yarn-direction sheen, denier-dependent translucency, thigh-band pressure transition, and knee stretch brightening without painted transparency artifacts.
- Skin-edge coupling: subtle compression/desaturation near garment boundaries with non-uniform micro-spec breakup (no hard masks).
- Two-piece mechanics: top hem and skirt waistband remain visually separate and dynamically coupled with phase-lag, never merged into one-piece behavior.
- Optical realism: reflections/shadows must be light-source motivated and roughness-consistent; reject detached highlights and ambient-smudge shadows.
- Absinthe lock: glass caustics, liquid meniscus highlights, and lace-edge shadowing must remain optically consistent.
- Absinthe palette lock: attire must read absinthe/emerald dominant (hard fail if red, cobalt, or neutral-black dominance overtakes the look).
SCORER-ALIGNED CONSISTENCY LOCK:
- Keep direct lens-locked gaze with believable vergence and eyelid tension in final frame.
- Preserve identity fidelity under mixed practical light; no face drift under pose/exposure shifts.
- Enforce complete wardrobe replacement from reference clothing cues.
- If diagnostics criticize prompt adherence, treat output as failed and regenerate with stricter scene/material matching.
- Editorial guardrail: bold but non-explicit, premium nightlife campaign intent only.
V11 FIRST-PRINCIPLES PHYSICS CONTRACT (HARD):
- Color-family lock (hard fail on drift): attire dominant hue/material family must match prompt palette, not generic black/red substitutions.
- Scene-anchor lock (hard fail on drift): keep at least 3 named environment anchors physically present and optically coherent in-frame.
- Lens-lock gaze certainty: iris direction lens-centered with stable catchlight geometry and believable vergence in final frame.
- Edge-separation lock: preserve clean subject-background contour gradients and physically plausible rim/fill transitions (no flat ambient wash).
- Coverage-stability lock: maintain non-explicit support geometry under motion; no safety-ambiguous reveal edges or unstable cutline artifacts.
- 100% zoom micro-audit: seam ridge depth, denier gradient, contact compression, anisotropic spec flow, and penumbra continuity must all cohere.

### Safe Backup Prompt

FIRST-PRINCIPLES TARGET:
Make a believable real camera capture, not an AI-looking render. If directives conflict, prioritize: (1) identity fidelity, (2) direct eye contact to lens, (3) physical plausibility of anatomy/materials/light, (4) editorial risk energy, (5) style details.

Identity lock (non-negotiable): use the provided reference image as the sole identity source for the same adult woman (25+). Preserve face geometry and recognition cues: eye spacing, brow arc, orbital depth, nose bridge, mouth width, chin contour, jawline, hairline pattern, natural asymmetry, and skin undertone. Do not drift into a different person under any lighting or pose.

Gaze lock (hard rule): subject must look directly into the camera lens in the final frame. Keep iris/pupil direction lens-centered with believable vergence and eyelid tension. No off-camera gaze, no downcast eyes, no profile-only eye direction.

Scene:
Keep the same Vegas speakeasy environment with absinthe service station with antique glassware, perforated spoon ritual setup, emerald glow, brass taps, mirror scatter. Maintain the same cinematic mood, depth layering, and practical-light logic.

Attire (safe fallback variant):
absinthe-green two-piece cocktail set: opaque contour top and a skirt with moderate slit, black thigh-high hosiery, jeweled pumps
Coverage is safer, but the image must still read as bold and high-impact through physically grounded fit, silhouette, hosiery optics, two-piece coupling realism, and pose confidence.

Pose and narrative:
one leg forward at bar rail, shoulder offset, hand hovering near absinthe glass, direct eye contact into lens, poised confidence, premium editorial tone.

Realism foundation:
- Anatomical plausibility: coherent shoulder-pelvis relationship, correct limb proportions, natural hand articulation, heel-ground load mechanics, and valid center-of-mass balance.
- Optics plausibility: realistic depth of field transitions, no cutout halos, no warped edges, no fake blur.
- Lighting plausibility: practical-source motivated key/fill/rim behavior, coherent shadow direction/penumbra, roughness-aware reflections, Fresnel-consistent highlights.

Anti-AI authenticity constraints:
- Keep skin lifelike with pore detail, subtle tonal variation, and no porcelain smoothing.
- Keep hair lifelike with irregular strand grouping and minor flyaways.
- Keep fabric lifelike with non-repeating microtexture and seam irregularity.
- Preserve slight real-world asymmetry in makeup, textile tension, and prop placement.
- Reject outputs with uncanny eyes, plastic skin, rubber fabric, repeated texture stamps, or composited subject separation.

Frontier physics controls:
- Simulate wrinkle hierarchy from first principles: macro gravity folds, meso seam-anchored buckling, micro high-frequency creasing in strain concentration zones.
- Enforce contact mechanics: where body/garment/surface meet, show pressure flattening, shadow occlusion, and material-dependent friction behavior.
- Enforce textile constitutive behavior: stretch anisotropy, bias-direction drape differences, and edge curl response tied to fabric stiffness.
- Enforce two-piece coupling mechanics: top hem stability vs skirt waistband load, phase-lag motion between upper/lower garments, and realistic gap dynamics under torso flexion.
- Enforce attachment realism: strap tension vectors, anchor-point compression, and closure hardware response under motion.
- Enforce optics coherence: polarization-like sheen behavior on satin/hosiery, roughness-dependent specular lobe width, and exposure-consistent highlight rolloff.
- Enforce sensor realism: realistic highlight clipping knees, subtle chroma noise in shadows, and no procedural overcleaning.

Cutting-edge simulation and rendering protocol (last-4-month focus, Dec 2025-Feb 2026):
- PhysDrape-style force pipeline (Feb 2026): infer residual deformation with explicit force balancing, then apply strict differentiable collision projection to eliminate interpenetration without destroying cloth shape.
- ReWeaver-style garment structure prior (Jan 2026): preserve panel/seam logic and topological consistency so deformations remain simulation-ready, not texture-only approximations.
- FNOPT-style rollout strategy (Dec 2025): perform resolution-agnostic coarse-to-fine integration; coarse motion must remain stable before adding medium and micro wrinkle detail.
- PI-Light-style transport prior (Jan 2026): preserve physically plausible diffuse/specular separation under relighting-like changes; highlights should move with light, not with texture.
- RotLight-style ambiguity control (Feb 2026): suppress baked shadows in albedo-like regions and maintain lighting/material disentanglement across reflective textiles.
- Two-piece dynamics priority: top and skirt exchange motion cues through waist/hip acceleration while retaining independent inertia and damping.
- Reject any frame where contact, wrinkle evolution, seam behavior, or reflectance changes are not causally explainable.

Safe adaptation of innovation motif:
Innovation motif: absinthe-glass caustic spill and green spectral bias interacting with sheer textile translucency gradients and cuff compression lines.

Attire impact through physics (safe fallback):
- Keep safer two-piece coverage geometry while still maintaining a high-impact editorial silhouette through fit tension and contour lighting.
- Preserve believable top/waistband coupling with secure support behavior and stable anchor mechanics.
- Preserve slit/hem movement logic and hosiery optics with the same physical rigor.
- Maintain non-explicit but bold visual energy via posture, gaze, and material response.
- Use conservative but explicit damping cues: motion settles naturally, with no frozen cloth or chaotic flutter.

Material system (safe fallback):
- Preserve all high-fidelity fabric behavior: drape, crease hierarchy, seam stress, contact compression, and realistic sheen.
- Hosiery must remain physically convincing: denier gradients, stretch maps, cuff pressure transitions, and ankle micro-creases.
- Preserve two-piece physics integrity: top and skirt can move independently while remaining cohesively styled and mechanically stable.

Editorial continuity (safe fallback):
- Keep the same scene, camera realism, and direct-lens eye contact as primary.
- Avoid making safe variant look plain; it must still read as premium nightlife couture.
- Preserve strong silhouette legibility and high-fashion intent.

Camera and render intent:
- Vertical 4:5 framing, output target 2K.
- Photographic realism over stylization, with coherent DOF and physically motivated lighting.
- Keep texture integrity in skin, hair, lace/mesh, and hosiery edges.

Environment integration:
- Keep subject physically anchored to set via contact shadows, reflection consistency, and realistic surface interactions.
- Maintain scene depth through controlled haze and practical-light separation.

Quality gate (safe fallback):
- No identity drift, no uncanny anatomy, no artificial skin smoothing, no fake transparency, no reflection mismatch.
- Final image must look camera-captured, luxurious, and believable.

AUDIT-V6 QUALITY ENFORCEMENT (SAFE, HARD):
- Keep safer coverage, but preserve explicit two-piece topology with visible top hem and separate skirt waistband.
- Forbidden substitutions remain: one-piece dress, bodysuit, jumpsuit, romper, faux-cutout single-panel dress.
- Maintain prompt-specified material and color family so safe variant still matches the concept.
- Maintain edgy nightlife mood via controlled contrast, directional practical light, and subject-background separation.
- Keep the same physics rigor:
  - Stable garment support mechanics in coverage-critical zones.
  - Contact-compression cues at skin/garment and garment/surface interfaces.
  - Top/skirt decoupled inertia with coherent damping and slit response.
  - Hosiery optics from denier gradients and stretch-driven shading.
- Regenerate if safe variant looks plain/casual, loses two-piece identity, or shows non-causal cloth/light behavior.

---

DEVILS-ADVOCATE MICRO-PHYSICS ESCALATION (SAFE, HARD):
- Keep safe coverage, but apply the same micro-physics rigor and reject texture-only pseudo-realism.
- Preserve multi-band wrinkle spectra (micro/meso/macro) with stress-aligned orientation and stable damping.
- Preserve seam/stitch relief cues and waistband/top-hem contact compression under safe-support constraints.
- Preserve hosiery denier micro-optics (anisotropic yarn sheen, stretch transitions, thigh-band compression gradient).
- Preserve slip-stick hem dynamics and friction-coupled contact at seating/rail/bar interfaces.
- Preserve edge-penumbra correctness and avoid painted AO artifacts at thin geometry boundaries.
- Safe does not mean flat: maintain high-fidelity micro-causality while preventing topology collapse to one-piece silhouettes.

---

V9 MICRO-PHYSICS DEEPENING PROTOCOL (HARD):
Safe variant: keep coverage-stable geometry while maximizing editorial edge through physically grounded contour, translucency windows, and strain logic.
- Per-zone ledger requirement (must read clearly at 100% zoom): top support edge, waist transition, slit boundary, thigh band, knee contour, ankle/instep, heel-floor contact, hand-prop contact.
- Each zone must display at least 3 coherent cues: strain gradient, seam relief, compression shadow, anisotropic highlight flow, denier gradient, friction-damped drape, support-anchor pressure.
- Causality chain must close: pose/load -> strain field -> fold orientation -> highlight elongation -> penumbra geometry.
- Hosiery micro-physics: yarn-direction sheen, denier-dependent translucency, thigh-band pressure transition, and knee stretch brightening without painted transparency artifacts.
- Skin-edge coupling: subtle compression/desaturation near garment boundaries with non-uniform micro-spec breakup (no hard masks).
- Two-piece mechanics: top hem and skirt waistband remain visually separate and dynamically coupled with phase-lag, never merged into one-piece behavior.
- Optical realism: reflections/shadows must be light-source motivated and roughness-consistent; reject detached highlights and ambient-smudge shadows.
- Absinthe lock: glass caustics, liquid meniscus highlights, and lace-edge shadowing must remain optically consistent.
- Absinthe palette lock: attire must read absinthe/emerald dominant (hard fail if red, cobalt, or neutral-black dominance overtakes the look).
SCORER-ALIGNED CONSISTENCY LOCK:
- Keep direct lens-locked gaze with believable vergence and eyelid tension in final frame.
- Preserve identity fidelity under mixed practical light; no face drift under pose/exposure shifts.
- Enforce complete wardrobe replacement from reference clothing cues.
- If diagnostics criticize prompt adherence, treat output as failed and regenerate with stricter scene/material matching.
- Safety guardrail: no nudity, no explicit framing, no fetish framing, no unstable reveal artifacts.
V11 SAFE FIRST-PRINCIPLES PHYSICS CONTRACT (HARD):
- Safe does not mean generic: preserve prompt-specific palette and scene anchors while maintaining coverage-stable geometry.
- Color lock: safe attire must stay within the named palette and material family, with no neutralized wardrobe substitution.
- Scene lock: preserve at least 3 named environment anchors with coherent reflections/shadows and contact cues.
- Lens-lock gaze certainty: direct camera eye alignment with credible eyelid tension and catchlight placement.
- Physics lock: maintain two-piece topology, denier optics, seam relief, and contact-compression causality at 100% inspection.

---

## Prompt 08 - Rooftop Gold Drift

- Primary word count: 1667
- Safe word count: 1508

### Primary Prompt

FIRST-PRINCIPLES TARGET:
Make a believable real camera capture, not an AI-looking render. If directives conflict, prioritize: (1) identity fidelity, (2) direct eye contact to lens, (3) physical plausibility of anatomy/materials/light, (4) editorial risk energy, (5) style details.

Identity lock (non-negotiable): use the provided reference image as the sole identity source for the same adult woman (25+). Preserve face geometry and recognition cues: eye spacing, brow arc, orbital depth, nose bridge, mouth width, chin contour, jawline, hairline pattern, natural asymmetry, and skin undertone. Do not drift into a different person under any lighting or pose.

Gaze lock (hard rule): subject must look directly into the camera lens in the final frame. Keep iris/pupil direction lens-centered with believable vergence and eyelid tension. No off-camera gaze, no downcast eyes, no profile-only eye direction.

Scene:
Vegas speakeasy environment with rooftop speakeasy with Vegas skyline bokeh, string lights, wind-swept atmosphere, chrome rail, night haze. Build layered depth (foreground cues, subject mid-plane, background practicals). Subject must feel physically present in the environment.

Attire (primary edge variant):
gold pleated two-piece cocktail set: open-back pleated top and a high-slit skirt with wind-reactive pleat flow, black sheer thigh-high hosiery, metallic stilettos
Use reveal-by-physics rather than explicit framing: contour fit, strain gradients, seam tension maps, and pose-driven two-piece behavior.
Hard two-piece rule: top and skirt must behave as distinct garments with coherent coupling at the waist region, not as a single merged dress.

Pose and narrative:
standing near rail in wind, hair motion and garment flutter controlled by posture and heel-ground balance, direct eye contact into lens, confident expression, controlled editorial energy.

Realism foundation:
- Anatomical plausibility: coherent shoulder-pelvis relationship, correct limb proportions, natural hand articulation, heel-ground load mechanics, and valid center-of-mass balance.
- Optics plausibility: realistic depth of field transitions, no cutout halos, no warped edges, no fake blur.
- Lighting plausibility: practical-source motivated key/fill/rim behavior, coherent shadow direction/penumbra, roughness-aware reflections, Fresnel-consistent highlights.

Anti-AI authenticity constraints:
- Keep skin lifelike with pore detail, subtle tonal variation, and no porcelain smoothing.
- Keep hair lifelike with irregular strand grouping and minor flyaways.
- Keep fabric lifelike with non-repeating microtexture and seam irregularity.
- Preserve slight real-world asymmetry in makeup, textile tension, and prop placement.
- Reject outputs with uncanny eyes, plastic skin, rubber fabric, repeated texture stamps, or composited subject separation.

Frontier physics controls:
- Simulate wrinkle hierarchy from first principles: macro gravity folds, meso seam-anchored buckling, micro high-frequency creasing in strain concentration zones.
- Enforce contact mechanics: where body/garment/surface meet, show pressure flattening, shadow occlusion, and material-dependent friction behavior.
- Enforce textile constitutive behavior: stretch anisotropy, bias-direction drape differences, and edge curl response tied to fabric stiffness.
- Enforce two-piece coupling mechanics: top hem stability vs skirt waistband load, phase-lag motion between upper/lower garments, and realistic gap dynamics under torso flexion.
- Enforce attachment realism: strap tension vectors, anchor-point compression, and closure hardware response under motion.
- Enforce optics coherence: polarization-like sheen behavior on satin/hosiery, roughness-dependent specular lobe width, and exposure-consistent highlight rolloff.
- Enforce sensor realism: realistic highlight clipping knees, subtle chroma noise in shadows, and no procedural overcleaning.

Cutting-edge simulation and rendering protocol (last-4-month focus, Dec 2025-Feb 2026):
- PhysDrape-style force pipeline (Feb 2026): infer residual deformation with explicit force balancing, then apply strict differentiable collision projection to eliminate interpenetration without destroying cloth shape.
- ReWeaver-style garment structure prior (Jan 2026): preserve panel/seam logic and topological consistency so deformations remain simulation-ready, not texture-only approximations.
- FNOPT-style rollout strategy (Dec 2025): perform resolution-agnostic coarse-to-fine integration; coarse motion must remain stable before adding medium and micro wrinkle detail.
- PI-Light-style transport prior (Jan 2026): preserve physically plausible diffuse/specular separation under relighting-like changes; highlights should move with light, not with texture.
- RotLight-style ambiguity control (Feb 2026): suppress baked shadows in albedo-like regions and maintain lighting/material disentanglement across reflective textiles.
- Two-piece dynamics priority: top and skirt exchange motion cues through waist/hip acceleration while retaining independent inertia and damping.
- Reject any frame where contact, wrinkle evolution, seam behavior, or reflectance changes are not causally explainable.

Innovation motif: rooftop wind-field interaction on pleated fabric with directional flutter damping and skyline bokeh shaped by realistic aperture geometry.

Attire impact through physics (primary):
- Build a contour-forward two-piece silhouette via strain maps, seam load paths, and controlled tension around bustline/waist/hip/upper leg.
- Use top-vs-skirt interaction physics: independent motion with believable timing offsets and no fused-garment behavior.
- Use slit dynamics tied to pose/gravity so opening behavior follows leg angle and movement.
- Use sheer optical behavior through denier gradients and layered occlusion, never as flat painted transparency.
- Use phase-aware motion transfer: torso acceleration drives delayed hem response, then damping settles folds without jitter.

Material system (primary):
- Satin/silk: anisotropic highlight flow, gravity drape vectors, compression folds at contact points.
- Velvet: direction-dependent pile shading and contact darkening.
- Sequins/crystals: controlled spark distribution with micro-normal variation, no random glitter noise.
- Hosiery: thigh-band compression transition, stretch over knee contour, ankle micro-wrinkling, directional sheen.
- Two-piece structure: waistband bending stiffness, top hem recovery, and closure/strap tension that remains physically plausible frame to frame.
- Use shell-like bending behavior cues (Kirchhoff-Love style): smooth curvature in low-strain zones and tight buckling only near constrained seams.

Editorial risk energy (primary, non-explicit):
- Keep wardrobe and pose bold, assertive, and fashion-forward while staying non-explicit.
- Favor long leg-line projection, strong S-curve torso-leg flow, and confident chin/eye tension.
- Keep full outfit readable in frame with contour-defining light placement.

Camera and render intent:
- Vertical 4:5 framing, output target 2K.
- Lens behavior should feel like premium editorial capture (roughly 50-85mm equivalent perspective).
- Filmic noise only, no heavy denoise smear, no oversharpen halos, no synthetic texture mush.

Environment integration:
- Subject must physically belong in the set: contact shadows, reflection coherence, and interaction with nearby surfaces.
- Haze should add depth separation without washing contrast.
- Keep practical highlights and reflective cues consistent with object roughness and angle.

Extreme realism audit (primary):
- Validate physically causal links: pose -> tension map -> fold pattern -> highlight path -> shadow placement.
- Any non-causal cloth fold, reflection mismatch, or eye-direction inconsistency is a hard failure.
- Preserve cinematic boldness while remaining fully believable as a real photographed moment.

Quality gate (primary):
- Real-camera believability under close inspection.
- No broken fingers, no warped feet, no fabric clipping, no face drift, no incorrect eye direction.
- Deliver a high-end Vegas editorial still with strong, edge-forward style and uncompromised realism.

AUDIT-V6 QUALITY ENFORCEMENT (PRIMARY, HARD):
- Two-piece topology lock: render two physically separate garments with a visible waist separation line in final frame.
- Forbidden substitutions: one-piece dress, bodysuit, jumpsuit, romper, faux-cutout single-panel dress.
- Material-color lock: keep prompt-specified material and color family dominant and unmistakable.
- Edge mood lock: premium nightlife contrast only; no flat, casual, daylight, or domestic snapshot lighting.
- Pose-energy lock: assertive editorial posture with strong leg-line projection and clear silhouette readability.
- Physics innovation stack:
  - XPBD-like cloth constraint hierarchy (seam stiffness > panel stiffness > edge drape compliance).
  - Frictional garment-skin contact with pressure-gradient shading at garment boundaries.
  - Top/skirt phase-lag dynamics with waist-coupled impulse transfer.
  - Anisotropic textile BRDF plus denier-dependent hosiery translucency.
- Regenerate if any appear: fused top/skirt silhouette, prompt-material substitution, weak contour separation, or non-causal fold/specular behavior.

TARGETED CORRECTION (08 - TWO-PIECE INTEGRITY):
- Enforce explicit visible gap between top and skirt from camera viewpoint.
- Reject any output where garment reads as a continuous one-piece column dress.

DEVILS-ADVOCATE MICRO-PHYSICS ESCALATION (PRIMARY, HARD):
- Reject any image where cloth realism could be explained by flat texture mapping alone.
- Enforce multi-band wrinkle spectra tied to stress tensors:
  - micro band: 2-4 mm crease ripples at high-strain seams,
  - meso band: 6-12 mm folds along bias/shear flow,
  - macro band: 20-40 mm gravity drape lobes.
- Enforce stitch-pull periodicity and seam-ridge relief (about 1-3 mm apparent depth) at structural joins.
- Enforce contact indentation at support edges (about 0.5-2.0 mm apparent compression) with narrow occlusion gradients.
- Enforce slit-edge slip-stick mechanics: brief friction hold, controlled release, damped settling; no teleporting hem shapes.
- Enforce hosiery denier optics as physics, not paint: yarn-direction anisotropic sheen, knee/quad stretch brightening, thigh-band pressure transition.
- Enforce skin-optics micro-consistency near garment boundaries: subtle desaturation/compression zones, non-uniform micro-spec breakup.
- Enforce material energy conservation: lambertian + specular balance remains plausible under mixed practical lights.
- Enforce geometric penumbra correctness at thin edges (straps, slit hems, hair strands): no fake ambient smudge shadows.
- Force-chain closure test (must pass): pose load -> local strain -> fold orientation -> highlight elongation -> shadow penumbra.

V9 MICRO-PHYSICS DEEPENING PROTOCOL (HARD):
Primary variant: push non-explicit editorial edge via high-density causal micro-physics and strict two-piece topology integrity.
- Per-zone ledger requirement (must read clearly at 100% zoom): top support edge, waist transition, slit boundary, thigh band, knee contour, ankle/instep, heel-floor contact, hand-prop contact.
- Each zone must display at least 3 coherent cues: strain gradient, seam relief, compression shadow, anisotropic highlight flow, denier gradient, friction-damped drape, support-anchor pressure.
- Causality chain must close: pose/load -> strain field -> fold orientation -> highlight elongation -> penumbra geometry.
- Hosiery micro-physics: yarn-direction sheen, denier-dependent translucency, thigh-band pressure transition, and knee stretch brightening without painted transparency artifacts.
- Skin-edge coupling: subtle compression/desaturation near garment boundaries with non-uniform micro-spec breakup (no hard masks).
- Two-piece mechanics: top hem and skirt waistband remain visually separate and dynamically coupled with phase-lag, never merged into one-piece behavior.
- Optical realism: reflections/shadows must be light-source motivated and roughness-consistent; reject detached highlights and ambient-smudge shadows.
- Rooftop wind lock: two-piece separation must stay visible under gust-driven flutter; no one-piece topology collapse.
SCORER-ALIGNED CONSISTENCY LOCK:
- Keep direct lens-locked gaze with believable vergence and eyelid tension in final frame.
- Preserve identity fidelity under mixed practical light; no face drift under pose/exposure shifts.
- Enforce complete wardrobe replacement from reference clothing cues.
- If diagnostics criticize prompt adherence, treat output as failed and regenerate with stricter scene/material matching.
- Editorial guardrail: bold but non-explicit, premium nightlife campaign intent only.
V11 FIRST-PRINCIPLES PHYSICS CONTRACT (HARD):
- Color-family lock (hard fail on drift): attire dominant hue/material family must match prompt palette, not generic black/red substitutions.
- Scene-anchor lock (hard fail on drift): keep at least 3 named environment anchors physically present and optically coherent in-frame.
- Lens-lock gaze certainty: iris direction lens-centered with stable catchlight geometry and believable vergence in final frame.
- Edge-separation lock: preserve clean subject-background contour gradients and physically plausible rim/fill transitions (no flat ambient wash).
- Coverage-stability lock: maintain non-explicit support geometry under motion; no safety-ambiguous reveal edges or unstable cutline artifacts.
- 100% zoom micro-audit: seam ridge depth, denier gradient, contact compression, anisotropic spec flow, and penumbra continuity must all cohere.

### Safe Backup Prompt

FIRST-PRINCIPLES TARGET:
Make a believable real camera capture, not an AI-looking render. If directives conflict, prioritize: (1) identity fidelity, (2) direct eye contact to lens, (3) physical plausibility of anatomy/materials/light, (4) editorial risk energy, (5) style details.

Identity lock (non-negotiable): use the provided reference image as the sole identity source for the same adult woman (25+). Preserve face geometry and recognition cues: eye spacing, brow arc, orbital depth, nose bridge, mouth width, chin contour, jawline, hairline pattern, natural asymmetry, and skin undertone. Do not drift into a different person under any lighting or pose.

Gaze lock (hard rule): subject must look directly into the camera lens in the final frame. Keep iris/pupil direction lens-centered with believable vergence and eyelid tension. No off-camera gaze, no downcast eyes, no profile-only eye direction.

Scene:
Keep the same Vegas speakeasy environment with rooftop speakeasy with Vegas skyline bokeh, string lights, wind-swept atmosphere, chrome rail, night haze. Maintain the same cinematic mood, depth layering, and practical-light logic.

Attire (safe fallback variant):
gold pleated two-piece cocktail set: closed-back pleated top and a skirt with moderate slit, black thigh-high hosiery, metallic pumps
Coverage is safer, but the image must still read as bold and high-impact through physically grounded fit, silhouette, hosiery optics, two-piece coupling realism, and pose confidence.

Pose and narrative:
standing near rail in wind, hair motion and garment flutter controlled by posture and heel-ground balance, direct eye contact into lens, poised confidence, premium editorial tone.

Realism foundation:
- Anatomical plausibility: coherent shoulder-pelvis relationship, correct limb proportions, natural hand articulation, heel-ground load mechanics, and valid center-of-mass balance.
- Optics plausibility: realistic depth of field transitions, no cutout halos, no warped edges, no fake blur.
- Lighting plausibility: practical-source motivated key/fill/rim behavior, coherent shadow direction/penumbra, roughness-aware reflections, Fresnel-consistent highlights.

Anti-AI authenticity constraints:
- Keep skin lifelike with pore detail, subtle tonal variation, and no porcelain smoothing.
- Keep hair lifelike with irregular strand grouping and minor flyaways.
- Keep fabric lifelike with non-repeating microtexture and seam irregularity.
- Preserve slight real-world asymmetry in makeup, textile tension, and prop placement.
- Reject outputs with uncanny eyes, plastic skin, rubber fabric, repeated texture stamps, or composited subject separation.

Frontier physics controls:
- Simulate wrinkle hierarchy from first principles: macro gravity folds, meso seam-anchored buckling, micro high-frequency creasing in strain concentration zones.
- Enforce contact mechanics: where body/garment/surface meet, show pressure flattening, shadow occlusion, and material-dependent friction behavior.
- Enforce textile constitutive behavior: stretch anisotropy, bias-direction drape differences, and edge curl response tied to fabric stiffness.
- Enforce two-piece coupling mechanics: top hem stability vs skirt waistband load, phase-lag motion between upper/lower garments, and realistic gap dynamics under torso flexion.
- Enforce attachment realism: strap tension vectors, anchor-point compression, and closure hardware response under motion.
- Enforce optics coherence: polarization-like sheen behavior on satin/hosiery, roughness-dependent specular lobe width, and exposure-consistent highlight rolloff.
- Enforce sensor realism: realistic highlight clipping knees, subtle chroma noise in shadows, and no procedural overcleaning.

Cutting-edge simulation and rendering protocol (last-4-month focus, Dec 2025-Feb 2026):
- PhysDrape-style force pipeline (Feb 2026): infer residual deformation with explicit force balancing, then apply strict differentiable collision projection to eliminate interpenetration without destroying cloth shape.
- ReWeaver-style garment structure prior (Jan 2026): preserve panel/seam logic and topological consistency so deformations remain simulation-ready, not texture-only approximations.
- FNOPT-style rollout strategy (Dec 2025): perform resolution-agnostic coarse-to-fine integration; coarse motion must remain stable before adding medium and micro wrinkle detail.
- PI-Light-style transport prior (Jan 2026): preserve physically plausible diffuse/specular separation under relighting-like changes; highlights should move with light, not with texture.
- RotLight-style ambiguity control (Feb 2026): suppress baked shadows in albedo-like regions and maintain lighting/material disentanglement across reflective textiles.
- Two-piece dynamics priority: top and skirt exchange motion cues through waist/hip acceleration while retaining independent inertia and damping.
- Reject any frame where contact, wrinkle evolution, seam behavior, or reflectance changes are not causally explainable.

Safe adaptation of innovation motif:
Innovation motif: rooftop wind-field interaction on pleated fabric with directional flutter damping and skyline bokeh shaped by realistic aperture geometry.

Attire impact through physics (safe fallback):
- Keep safer two-piece coverage geometry while still maintaining a high-impact editorial silhouette through fit tension and contour lighting.
- Preserve believable top/waistband coupling with secure support behavior and stable anchor mechanics.
- Preserve slit/hem movement logic and hosiery optics with the same physical rigor.
- Maintain non-explicit but bold visual energy via posture, gaze, and material response.
- Use conservative but explicit damping cues: motion settles naturally, with no frozen cloth or chaotic flutter.

Material system (safe fallback):
- Preserve all high-fidelity fabric behavior: drape, crease hierarchy, seam stress, contact compression, and realistic sheen.
- Hosiery must remain physically convincing: denier gradients, stretch maps, cuff pressure transitions, and ankle micro-creases.
- Preserve two-piece physics integrity: top and skirt can move independently while remaining cohesively styled and mechanically stable.

Editorial continuity (safe fallback):
- Keep the same scene, camera realism, and direct-lens eye contact as primary.
- Avoid making safe variant look plain; it must still read as premium nightlife couture.
- Preserve strong silhouette legibility and high-fashion intent.

Camera and render intent:
- Vertical 4:5 framing, output target 2K.
- Photographic realism over stylization, with coherent DOF and physically motivated lighting.
- Keep texture integrity in skin, hair, lace/mesh, and hosiery edges.

Environment integration:
- Keep subject physically anchored to set via contact shadows, reflection consistency, and realistic surface interactions.
- Maintain scene depth through controlled haze and practical-light separation.

Quality gate (safe fallback):
- No identity drift, no uncanny anatomy, no artificial skin smoothing, no fake transparency, no reflection mismatch.
- Final image must look camera-captured, luxurious, and believable.

AUDIT-V6 QUALITY ENFORCEMENT (SAFE, HARD):
- Keep safer coverage, but preserve explicit two-piece topology with visible top hem and separate skirt waistband.
- Forbidden substitutions remain: one-piece dress, bodysuit, jumpsuit, romper, faux-cutout single-panel dress.
- Maintain prompt-specified material and color family so safe variant still matches the concept.
- Maintain edgy nightlife mood via controlled contrast, directional practical light, and subject-background separation.
- Keep the same physics rigor:
  - Stable garment support mechanics in coverage-critical zones.
  - Contact-compression cues at skin/garment and garment/surface interfaces.
  - Top/skirt decoupled inertia with coherent damping and slit response.
  - Hosiery optics from denier gradients and stretch-driven shading.
- Regenerate if safe variant looks plain/casual, loses two-piece identity, or shows non-causal cloth/light behavior.

TARGETED SAFE CORRECTION (08 - TWO-PIECE INTEGRITY):
- Safe coverage is allowed, but top and skirt must remain visually and physically separate.

---

DEVILS-ADVOCATE MICRO-PHYSICS ESCALATION (SAFE, HARD):
- Keep safe coverage, but apply the same micro-physics rigor and reject texture-only pseudo-realism.
- Preserve multi-band wrinkle spectra (micro/meso/macro) with stress-aligned orientation and stable damping.
- Preserve seam/stitch relief cues and waistband/top-hem contact compression under safe-support constraints.
- Preserve hosiery denier micro-optics (anisotropic yarn sheen, stretch transitions, thigh-band compression gradient).
- Preserve slip-stick hem dynamics and friction-coupled contact at seating/rail/bar interfaces.
- Preserve edge-penumbra correctness and avoid painted AO artifacts at thin geometry boundaries.
- Safe does not mean flat: maintain high-fidelity micro-causality while preventing topology collapse to one-piece silhouettes.

---

V9 MICRO-PHYSICS DEEPENING PROTOCOL (HARD):
Safe variant: keep coverage-stable geometry while maximizing editorial edge through physically grounded contour, translucency windows, and strain logic.
- Per-zone ledger requirement (must read clearly at 100% zoom): top support edge, waist transition, slit boundary, thigh band, knee contour, ankle/instep, heel-floor contact, hand-prop contact.
- Each zone must display at least 3 coherent cues: strain gradient, seam relief, compression shadow, anisotropic highlight flow, denier gradient, friction-damped drape, support-anchor pressure.
- Causality chain must close: pose/load -> strain field -> fold orientation -> highlight elongation -> penumbra geometry.
- Hosiery micro-physics: yarn-direction sheen, denier-dependent translucency, thigh-band pressure transition, and knee stretch brightening without painted transparency artifacts.
- Skin-edge coupling: subtle compression/desaturation near garment boundaries with non-uniform micro-spec breakup (no hard masks).
- Two-piece mechanics: top hem and skirt waistband remain visually separate and dynamically coupled with phase-lag, never merged into one-piece behavior.
- Optical realism: reflections/shadows must be light-source motivated and roughness-consistent; reject detached highlights and ambient-smudge shadows.
- Rooftop wind lock: two-piece separation must stay visible under gust-driven flutter; no one-piece topology collapse.
SCORER-ALIGNED CONSISTENCY LOCK:
- Keep direct lens-locked gaze with believable vergence and eyelid tension in final frame.
- Preserve identity fidelity under mixed practical light; no face drift under pose/exposure shifts.
- Enforce complete wardrobe replacement from reference clothing cues.
- If diagnostics criticize prompt adherence, treat output as failed and regenerate with stricter scene/material matching.
- Safety guardrail: no nudity, no explicit framing, no fetish framing, no unstable reveal artifacts.
V11 SAFE FIRST-PRINCIPLES PHYSICS CONTRACT (HARD):
- Safe does not mean generic: preserve prompt-specific palette and scene anchors while maintaining coverage-stable geometry.
- Color lock: safe attire must stay within the named palette and material family, with no neutralized wardrobe substitution.
- Scene lock: preserve at least 3 named environment anchors with coherent reflections/shadows and contact cues.
- Lens-lock gaze certainty: direct camera eye alignment with credible eyelid tension and catchlight placement.
- Physics lock: maintain two-piece topology, denier optics, seam relief, and contact-compression causality at 100% inspection.

---

## Prompt 09 - Swing Floor Ruby Pulse

- Primary word count: 1669
- Safe word count: 1504

### Primary Prompt

FIRST-PRINCIPLES TARGET:
Make a believable real camera capture, not an AI-looking render. If directives conflict, prioritize: (1) identity fidelity, (2) direct eye contact to lens, (3) physical plausibility of anatomy/materials/light, (4) editorial risk energy, (5) style details.

Identity lock (non-negotiable): use the provided reference image as the sole identity source for the same adult woman (25+). Preserve face geometry and recognition cues: eye spacing, brow arc, orbital depth, nose bridge, mouth width, chin contour, jawline, hairline pattern, natural asymmetry, and skin undertone. Do not drift into a different person under any lighting or pose.

Gaze lock (hard rule): subject must look directly into the camera lens in the final frame. Keep iris/pupil direction lens-centered with believable vergence and eyelid tension. No off-camera gaze, no downcast eyes, no profile-only eye direction.

Scene:
Vegas speakeasy environment with dance-floor perimeter near live jazz band, parquet reflections, warm practicals, drifting haze and moving highlights. Build layered depth (foreground cues, subject mid-plane, background practicals). Subject must feel physically present in the environment.

Attire (primary edge variant):
ruby fringe two-piece cocktail set: fitted fringe crop top and a sculpted split skirt with side reveal architecture, black thigh-high hosiery, deco stilettos
Use reveal-by-physics rather than explicit framing: contour fit, strain gradients, seam tension maps, and pose-driven two-piece behavior.
Hard two-piece rule: top and skirt must behave as distinct garments with coherent coupling at the waist region, not as a single merged dress.

Pose and narrative:
dynamic turn-stop pose with one knee forward, fringe oscillation frozen naturally, direct eye contact into lens, confident expression, controlled editorial energy.

Realism foundation:
- Anatomical plausibility: coherent shoulder-pelvis relationship, correct limb proportions, natural hand articulation, heel-ground load mechanics, and valid center-of-mass balance.
- Optics plausibility: realistic depth of field transitions, no cutout halos, no warped edges, no fake blur.
- Lighting plausibility: practical-source motivated key/fill/rim behavior, coherent shadow direction/penumbra, roughness-aware reflections, Fresnel-consistent highlights.

Anti-AI authenticity constraints:
- Keep skin lifelike with pore detail, subtle tonal variation, and no porcelain smoothing.
- Keep hair lifelike with irregular strand grouping and minor flyaways.
- Keep fabric lifelike with non-repeating microtexture and seam irregularity.
- Preserve slight real-world asymmetry in makeup, textile tension, and prop placement.
- Reject outputs with uncanny eyes, plastic skin, rubber fabric, repeated texture stamps, or composited subject separation.

Frontier physics controls:
- Simulate wrinkle hierarchy from first principles: macro gravity folds, meso seam-anchored buckling, micro high-frequency creasing in strain concentration zones.
- Enforce contact mechanics: where body/garment/surface meet, show pressure flattening, shadow occlusion, and material-dependent friction behavior.
- Enforce textile constitutive behavior: stretch anisotropy, bias-direction drape differences, and edge curl response tied to fabric stiffness.
- Enforce two-piece coupling mechanics: top hem stability vs skirt waistband load, phase-lag motion between upper/lower garments, and realistic gap dynamics under torso flexion.
- Enforce attachment realism: strap tension vectors, anchor-point compression, and closure hardware response under motion.
- Enforce optics coherence: polarization-like sheen behavior on satin/hosiery, roughness-dependent specular lobe width, and exposure-consistent highlight rolloff.
- Enforce sensor realism: realistic highlight clipping knees, subtle chroma noise in shadows, and no procedural overcleaning.

Cutting-edge simulation and rendering protocol (last-4-month focus, Dec 2025-Feb 2026):
- PhysDrape-style force pipeline (Feb 2026): infer residual deformation with explicit force balancing, then apply strict differentiable collision projection to eliminate interpenetration without destroying cloth shape.
- ReWeaver-style garment structure prior (Jan 2026): preserve panel/seam logic and topological consistency so deformations remain simulation-ready, not texture-only approximations.
- FNOPT-style rollout strategy (Dec 2025): perform resolution-agnostic coarse-to-fine integration; coarse motion must remain stable before adding medium and micro wrinkle detail.
- PI-Light-style transport prior (Jan 2026): preserve physically plausible diffuse/specular separation under relighting-like changes; highlights should move with light, not with texture.
- RotLight-style ambiguity control (Feb 2026): suppress baked shadows in albedo-like regions and maintain lighting/material disentanglement across reflective textiles.
- Two-piece dynamics priority: top and skirt exchange motion cues through waist/hip acceleration while retaining independent inertia and damping.
- Reject any frame where contact, wrinkle evolution, seam behavior, or reflectance changes are not causally explainable.

Innovation motif: fringe oscillation freeze-frame physics with phase-offset strand motion and parquet reflection blur consistent with motion-stop timing.

Attire impact through physics (primary):
- Build a contour-forward two-piece silhouette via strain maps, seam load paths, and controlled tension around bustline/waist/hip/upper leg.
- Use top-vs-skirt interaction physics: independent motion with believable timing offsets and no fused-garment behavior.
- Use slit dynamics tied to pose/gravity so opening behavior follows leg angle and movement.
- Use sheer optical behavior through denier gradients and layered occlusion, never as flat painted transparency.
- Use phase-aware motion transfer: torso acceleration drives delayed hem response, then damping settles folds without jitter.

Material system (primary):
- Satin/silk: anisotropic highlight flow, gravity drape vectors, compression folds at contact points.
- Velvet: direction-dependent pile shading and contact darkening.
- Sequins/crystals: controlled spark distribution with micro-normal variation, no random glitter noise.
- Hosiery: thigh-band compression transition, stretch over knee contour, ankle micro-wrinkling, directional sheen.
- Two-piece structure: waistband bending stiffness, top hem recovery, and closure/strap tension that remains physically plausible frame to frame.
- Use shell-like bending behavior cues (Kirchhoff-Love style): smooth curvature in low-strain zones and tight buckling only near constrained seams.

Editorial risk energy (primary, non-explicit):
- Keep wardrobe and pose bold, assertive, and fashion-forward while staying non-explicit.
- Favor long leg-line projection, strong S-curve torso-leg flow, and confident chin/eye tension.
- Keep full outfit readable in frame with contour-defining light placement.

Camera and render intent:
- Vertical 4:5 framing, output target 2K.
- Lens behavior should feel like premium editorial capture (roughly 50-85mm equivalent perspective).
- Filmic noise only, no heavy denoise smear, no oversharpen halos, no synthetic texture mush.

Environment integration:
- Subject must physically belong in the set: contact shadows, reflection coherence, and interaction with nearby surfaces.
- Haze should add depth separation without washing contrast.
- Keep practical highlights and reflective cues consistent with object roughness and angle.

Extreme realism audit (primary):
- Validate physically causal links: pose -> tension map -> fold pattern -> highlight path -> shadow placement.
- Any non-causal cloth fold, reflection mismatch, or eye-direction inconsistency is a hard failure.
- Preserve cinematic boldness while remaining fully believable as a real photographed moment.

Quality gate (primary):
- Real-camera believability under close inspection.
- No broken fingers, no warped feet, no fabric clipping, no face drift, no incorrect eye direction.
- Deliver a high-end Vegas editorial still with strong, edge-forward style and uncompromised realism.

AUDIT-V6 QUALITY ENFORCEMENT (PRIMARY, HARD):
- Two-piece topology lock: render two physically separate garments with a visible waist separation line in final frame.
- Forbidden substitutions: one-piece dress, bodysuit, jumpsuit, romper, faux-cutout single-panel dress.
- Material-color lock: keep prompt-specified material and color family dominant and unmistakable.
- Edge mood lock: premium nightlife contrast only; no flat, casual, daylight, or domestic snapshot lighting.
- Pose-energy lock: assertive editorial posture with strong leg-line projection and clear silhouette readability.
- Physics innovation stack:
  - XPBD-like cloth constraint hierarchy (seam stiffness > panel stiffness > edge drape compliance).
  - Frictional garment-skin contact with pressure-gradient shading at garment boundaries.
  - Top/skirt phase-lag dynamics with waist-coupled impulse transfer.
  - Anisotropic textile BRDF plus denier-dependent hosiery translucency.
- Regenerate if any appear: fused top/skirt silhouette, prompt-material substitution, weak contour separation, or non-causal fold/specular behavior.

TARGETED CORRECTION (09 - EDGE PRESENCE):
- Keep dance-motion physics, but prioritize couture silhouette readability over costume-like blur.
- Background extras must stay de-emphasized; subject remains dominant editorial focal point.
- Maintain clean contour lighting on torso/waist/leg geometry.

DEVILS-ADVOCATE MICRO-PHYSICS ESCALATION (PRIMARY, HARD):
- Reject any image where cloth realism could be explained by flat texture mapping alone.
- Enforce multi-band wrinkle spectra tied to stress tensors:
  - micro band: 2-4 mm crease ripples at high-strain seams,
  - meso band: 6-12 mm folds along bias/shear flow,
  - macro band: 20-40 mm gravity drape lobes.
- Enforce stitch-pull periodicity and seam-ridge relief (about 1-3 mm apparent depth) at structural joins.
- Enforce contact indentation at support edges (about 0.5-2.0 mm apparent compression) with narrow occlusion gradients.
- Enforce slit-edge slip-stick mechanics: brief friction hold, controlled release, damped settling; no teleporting hem shapes.
- Enforce hosiery denier optics as physics, not paint: yarn-direction anisotropic sheen, knee/quad stretch brightening, thigh-band pressure transition.
- Enforce skin-optics micro-consistency near garment boundaries: subtle desaturation/compression zones, non-uniform micro-spec breakup.
- Enforce material energy conservation: lambertian + specular balance remains plausible under mixed practical lights.
- Enforce geometric penumbra correctness at thin edges (straps, slit hems, hair strands): no fake ambient smudge shadows.
- Force-chain closure test (must pass): pose load -> local strain -> fold orientation -> highlight elongation -> shadow penumbra.

V9 MICRO-PHYSICS DEEPENING PROTOCOL (HARD):
Primary variant: push non-explicit editorial edge via high-density causal micro-physics and strict two-piece topology integrity.
- Per-zone ledger requirement (must read clearly at 100% zoom): top support edge, waist transition, slit boundary, thigh band, knee contour, ankle/instep, heel-floor contact, hand-prop contact.
- Each zone must display at least 3 coherent cues: strain gradient, seam relief, compression shadow, anisotropic highlight flow, denier gradient, friction-damped drape, support-anchor pressure.
- Causality chain must close: pose/load -> strain field -> fold orientation -> highlight elongation -> penumbra geometry.
- Hosiery micro-physics: yarn-direction sheen, denier-dependent translucency, thigh-band pressure transition, and knee stretch brightening without painted transparency artifacts.
- Skin-edge coupling: subtle compression/desaturation near garment boundaries with non-uniform micro-spec breakup (no hard masks).
- Two-piece mechanics: top hem and skirt waistband remain visually separate and dynamically coupled with phase-lag, never merged into one-piece behavior.
- Optical realism: reflections/shadows must be light-source motivated and roughness-consistent; reject detached highlights and ambient-smudge shadows.
- Dance-fringe lock: phase-offset fringe motion must remain physically damped and not blur into costume-like smear.
- Dance-floor edge lock: preserve strong contour separation from parquet/background practicals and keep lens-locked gaze unmistakable in final frame.
SCORER-ALIGNED CONSISTENCY LOCK:
- Keep direct lens-locked gaze with believable vergence and eyelid tension in final frame.
- Preserve identity fidelity under mixed practical light; no face drift under pose/exposure shifts.
- Enforce complete wardrobe replacement from reference clothing cues.
- If diagnostics criticize prompt adherence, treat output as failed and regenerate with stricter scene/material matching.
- Editorial guardrail: bold but non-explicit, premium nightlife campaign intent only.
V11 FIRST-PRINCIPLES PHYSICS CONTRACT (HARD):
- Color-family lock (hard fail on drift): attire dominant hue/material family must match prompt palette, not generic black/red substitutions.
- Scene-anchor lock (hard fail on drift): keep at least 3 named environment anchors physically present and optically coherent in-frame.
- Lens-lock gaze certainty: iris direction lens-centered with stable catchlight geometry and believable vergence in final frame.
- Edge-separation lock: preserve clean subject-background contour gradients and physically plausible rim/fill transitions (no flat ambient wash).
- Coverage-stability lock: maintain non-explicit support geometry under motion; no safety-ambiguous reveal edges or unstable cutline artifacts.
- 100% zoom micro-audit: seam ridge depth, denier gradient, contact compression, anisotropic spec flow, and penumbra continuity must all cohere.

### Safe Backup Prompt

FIRST-PRINCIPLES TARGET:
Make a believable real camera capture, not an AI-looking render. If directives conflict, prioritize: (1) identity fidelity, (2) direct eye contact to lens, (3) physical plausibility of anatomy/materials/light, (4) editorial risk energy, (5) style details.

Identity lock (non-negotiable): use the provided reference image as the sole identity source for the same adult woman (25+). Preserve face geometry and recognition cues: eye spacing, brow arc, orbital depth, nose bridge, mouth width, chin contour, jawline, hairline pattern, natural asymmetry, and skin undertone. Do not drift into a different person under any lighting or pose.

Gaze lock (hard rule): subject must look directly into the camera lens in the final frame. Keep iris/pupil direction lens-centered with believable vergence and eyelid tension. No off-camera gaze, no downcast eyes, no profile-only eye direction.

Scene:
Keep the same Vegas speakeasy environment with dance-floor perimeter near live jazz band, parquet reflections, warm practicals, drifting haze and moving highlights. Maintain the same cinematic mood, depth layering, and practical-light logic.

Attire (safe fallback variant):
ruby fringe two-piece cocktail set: fitted top and a split skirt with moderate slit and closed side panel, black thigh-high hosiery, deco pumps
Coverage is safer, but the image must still read as bold and high-impact through physically grounded fit, silhouette, hosiery optics, two-piece coupling realism, and pose confidence.

Pose and narrative:
dynamic turn-stop pose with one knee forward, fringe oscillation frozen naturally, direct eye contact into lens, poised confidence, premium editorial tone.

Realism foundation:
- Anatomical plausibility: coherent shoulder-pelvis relationship, correct limb proportions, natural hand articulation, heel-ground load mechanics, and valid center-of-mass balance.
- Optics plausibility: realistic depth of field transitions, no cutout halos, no warped edges, no fake blur.
- Lighting plausibility: practical-source motivated key/fill/rim behavior, coherent shadow direction/penumbra, roughness-aware reflections, Fresnel-consistent highlights.

Anti-AI authenticity constraints:
- Keep skin lifelike with pore detail, subtle tonal variation, and no porcelain smoothing.
- Keep hair lifelike with irregular strand grouping and minor flyaways.
- Keep fabric lifelike with non-repeating microtexture and seam irregularity.
- Preserve slight real-world asymmetry in makeup, textile tension, and prop placement.
- Reject outputs with uncanny eyes, plastic skin, rubber fabric, repeated texture stamps, or composited subject separation.

Frontier physics controls:
- Simulate wrinkle hierarchy from first principles: macro gravity folds, meso seam-anchored buckling, micro high-frequency creasing in strain concentration zones.
- Enforce contact mechanics: where body/garment/surface meet, show pressure flattening, shadow occlusion, and material-dependent friction behavior.
- Enforce textile constitutive behavior: stretch anisotropy, bias-direction drape differences, and edge curl response tied to fabric stiffness.
- Enforce two-piece coupling mechanics: top hem stability vs skirt waistband load, phase-lag motion between upper/lower garments, and realistic gap dynamics under torso flexion.
- Enforce attachment realism: strap tension vectors, anchor-point compression, and closure hardware response under motion.
- Enforce optics coherence: polarization-like sheen behavior on satin/hosiery, roughness-dependent specular lobe width, and exposure-consistent highlight rolloff.
- Enforce sensor realism: realistic highlight clipping knees, subtle chroma noise in shadows, and no procedural overcleaning.

Cutting-edge simulation and rendering protocol (last-4-month focus, Dec 2025-Feb 2026):
- PhysDrape-style force pipeline (Feb 2026): infer residual deformation with explicit force balancing, then apply strict differentiable collision projection to eliminate interpenetration without destroying cloth shape.
- ReWeaver-style garment structure prior (Jan 2026): preserve panel/seam logic and topological consistency so deformations remain simulation-ready, not texture-only approximations.
- FNOPT-style rollout strategy (Dec 2025): perform resolution-agnostic coarse-to-fine integration; coarse motion must remain stable before adding medium and micro wrinkle detail.
- PI-Light-style transport prior (Jan 2026): preserve physically plausible diffuse/specular separation under relighting-like changes; highlights should move with light, not with texture.
- RotLight-style ambiguity control (Feb 2026): suppress baked shadows in albedo-like regions and maintain lighting/material disentanglement across reflective textiles.
- Two-piece dynamics priority: top and skirt exchange motion cues through waist/hip acceleration while retaining independent inertia and damping.
- Reject any frame where contact, wrinkle evolution, seam behavior, or reflectance changes are not causally explainable.

Safe adaptation of innovation motif:
Innovation motif: fringe oscillation freeze-frame physics with phase-offset strand motion and parquet reflection blur consistent with motion-stop timing.

Attire impact through physics (safe fallback):
- Keep safer two-piece coverage geometry while still maintaining a high-impact editorial silhouette through fit tension and contour lighting.
- Preserve believable top/waistband coupling with secure support behavior and stable anchor mechanics.
- Preserve slit/hem movement logic and hosiery optics with the same physical rigor.
- Maintain non-explicit but bold visual energy via posture, gaze, and material response.
- Use conservative but explicit damping cues: motion settles naturally, with no frozen cloth or chaotic flutter.

Material system (safe fallback):
- Preserve all high-fidelity fabric behavior: drape, crease hierarchy, seam stress, contact compression, and realistic sheen.
- Hosiery must remain physically convincing: denier gradients, stretch maps, cuff pressure transitions, and ankle micro-creases.
- Preserve two-piece physics integrity: top and skirt can move independently while remaining cohesively styled and mechanically stable.

Editorial continuity (safe fallback):
- Keep the same scene, camera realism, and direct-lens eye contact as primary.
- Avoid making safe variant look plain; it must still read as premium nightlife couture.
- Preserve strong silhouette legibility and high-fashion intent.

Camera and render intent:
- Vertical 4:5 framing, output target 2K.
- Photographic realism over stylization, with coherent DOF and physically motivated lighting.
- Keep texture integrity in skin, hair, lace/mesh, and hosiery edges.

Environment integration:
- Keep subject physically anchored to set via contact shadows, reflection consistency, and realistic surface interactions.
- Maintain scene depth through controlled haze and practical-light separation.

Quality gate (safe fallback):
- No identity drift, no uncanny anatomy, no artificial skin smoothing, no fake transparency, no reflection mismatch.
- Final image must look camera-captured, luxurious, and believable.

AUDIT-V6 QUALITY ENFORCEMENT (SAFE, HARD):
- Keep safer coverage, but preserve explicit two-piece topology with visible top hem and separate skirt waistband.
- Forbidden substitutions remain: one-piece dress, bodysuit, jumpsuit, romper, faux-cutout single-panel dress.
- Maintain prompt-specified material and color family so safe variant still matches the concept.
- Maintain edgy nightlife mood via controlled contrast, directional practical light, and subject-background separation.
- Keep the same physics rigor:
  - Stable garment support mechanics in coverage-critical zones.
  - Contact-compression cues at skin/garment and garment/surface interfaces.
  - Top/skirt decoupled inertia with coherent damping and slit response.
  - Hosiery optics from denier gradients and stretch-driven shading.
- Regenerate if safe variant looks plain/casual, loses two-piece identity, or shows non-causal cloth/light behavior.

TARGETED SAFE CORRECTION (09 - EDGE PRESENCE):
- Keep motion tasteful and controlled with premium editorial clarity; avoid costume-like chaos.

---

DEVILS-ADVOCATE MICRO-PHYSICS ESCALATION (SAFE, HARD):
- Keep safe coverage, but apply the same micro-physics rigor and reject texture-only pseudo-realism.
- Preserve multi-band wrinkle spectra (micro/meso/macro) with stress-aligned orientation and stable damping.
- Preserve seam/stitch relief cues and waistband/top-hem contact compression under safe-support constraints.
- Preserve hosiery denier micro-optics (anisotropic yarn sheen, stretch transitions, thigh-band compression gradient).
- Preserve slip-stick hem dynamics and friction-coupled contact at seating/rail/bar interfaces.
- Preserve edge-penumbra correctness and avoid painted AO artifacts at thin geometry boundaries.
- Safe does not mean flat: maintain high-fidelity micro-causality while preventing topology collapse to one-piece silhouettes.

---

V9 MICRO-PHYSICS DEEPENING PROTOCOL (HARD):
Safe variant: keep coverage-stable geometry while maximizing editorial edge through physically grounded contour, translucency windows, and strain logic.
- Per-zone ledger requirement (must read clearly at 100% zoom): top support edge, waist transition, slit boundary, thigh band, knee contour, ankle/instep, heel-floor contact, hand-prop contact.
- Each zone must display at least 3 coherent cues: strain gradient, seam relief, compression shadow, anisotropic highlight flow, denier gradient, friction-damped drape, support-anchor pressure.
- Causality chain must close: pose/load -> strain field -> fold orientation -> highlight elongation -> penumbra geometry.
- Hosiery micro-physics: yarn-direction sheen, denier-dependent translucency, thigh-band pressure transition, and knee stretch brightening without painted transparency artifacts.
- Skin-edge coupling: subtle compression/desaturation near garment boundaries with non-uniform micro-spec breakup (no hard masks).
- Two-piece mechanics: top hem and skirt waistband remain visually separate and dynamically coupled with phase-lag, never merged into one-piece behavior.
- Optical realism: reflections/shadows must be light-source motivated and roughness-consistent; reject detached highlights and ambient-smudge shadows.
- Dance-fringe lock: phase-offset fringe motion must remain physically damped and not blur into costume-like smear.
- Dance-floor edge lock: preserve strong contour separation from parquet/background practicals and keep lens-locked gaze unmistakable in final frame.
SCORER-ALIGNED CONSISTENCY LOCK:
- Keep direct lens-locked gaze with believable vergence and eyelid tension in final frame.
- Preserve identity fidelity under mixed practical light; no face drift under pose/exposure shifts.
- Enforce complete wardrobe replacement from reference clothing cues.
- If diagnostics criticize prompt adherence, treat output as failed and regenerate with stricter scene/material matching.
- Safety guardrail: no nudity, no explicit framing, no fetish framing, no unstable reveal artifacts.
V11 SAFE FIRST-PRINCIPLES PHYSICS CONTRACT (HARD):
- Safe does not mean generic: preserve prompt-specific palette and scene anchors while maintaining coverage-stable geometry.
- Color lock: safe attire must stay within the named palette and material family, with no neutralized wardrobe substitution.
- Scene lock: preserve at least 3 named environment anchors with coherent reflections/shadows and contact cues.
- Lens-lock gaze certainty: direct camera eye alignment with credible eyelid tension and catchlight placement.
- Physics lock: maintain two-piece topology, denier optics, seam relief, and contact-compression causality at 100% inspection.

---

## Prompt 10 - Lounge Plum Tension

- Primary word count: 1628
- Safe word count: 1479

### Primary Prompt

FIRST-PRINCIPLES TARGET:
Make a believable real camera capture, not an AI-looking render. If directives conflict, prioritize: (1) identity fidelity, (2) direct eye contact to lens, (3) physical plausibility of anatomy/materials/light, (4) editorial risk energy, (5) style details.

Identity lock (non-negotiable): use the provided reference image as the sole identity source for the same adult woman (25+). Preserve face geometry and recognition cues: eye spacing, brow arc, orbital depth, nose bridge, mouth width, chin contour, jawline, hairline pattern, natural asymmetry, and skin undertone. Do not drift into a different person under any lighting or pose.

Gaze lock (hard rule): subject must look directly into the camera lens in the final frame. Keep iris/pupil direction lens-centered with believable vergence and eyelid tension. No off-camera gaze, no downcast eyes, no profile-only eye direction.

Scene:
Vegas speakeasy environment with cigar lounge nook with leather club chair, walnut shelves, amber lamp pool, soft smoke diffusion. Build layered depth (foreground cues, subject mid-plane, background practicals). Subject must feel physically present in the environment.

Attire (primary edge variant):
plum velvet two-piece cocktail set: corset-laced top with body-skimming fit and a high-slit skirt, black sheer thigh-high hosiery, satin stilettos
Use reveal-by-physics rather than explicit framing: contour fit, strain gradients, seam tension maps, and pose-driven two-piece behavior.
Hard two-piece rule: top and skirt must behave as distinct garments with coherent coupling at the waist region, not as a single merged dress.

Pose and narrative:
chair-edge lean with torso angle and lifted chin, hand grazing chair arm, direct eye contact into lens, confident expression, controlled editorial energy.

Realism foundation:
- Anatomical plausibility: coherent shoulder-pelvis relationship, correct limb proportions, natural hand articulation, heel-ground load mechanics, and valid center-of-mass balance.
- Optics plausibility: realistic depth of field transitions, no cutout halos, no warped edges, no fake blur.
- Lighting plausibility: practical-source motivated key/fill/rim behavior, coherent shadow direction/penumbra, roughness-aware reflections, Fresnel-consistent highlights.

Anti-AI authenticity constraints:
- Keep skin lifelike with pore detail, subtle tonal variation, and no porcelain smoothing.
- Keep hair lifelike with irregular strand grouping and minor flyaways.
- Keep fabric lifelike with non-repeating microtexture and seam irregularity.
- Preserve slight real-world asymmetry in makeup, textile tension, and prop placement.
- Reject outputs with uncanny eyes, plastic skin, rubber fabric, repeated texture stamps, or composited subject separation.

Frontier physics controls:
- Simulate wrinkle hierarchy from first principles: macro gravity folds, meso seam-anchored buckling, micro high-frequency creasing in strain concentration zones.
- Enforce contact mechanics: where body/garment/surface meet, show pressure flattening, shadow occlusion, and material-dependent friction behavior.
- Enforce textile constitutive behavior: stretch anisotropy, bias-direction drape differences, and edge curl response tied to fabric stiffness.
- Enforce two-piece coupling mechanics: top hem stability vs skirt waistband load, phase-lag motion between upper/lower garments, and realistic gap dynamics under torso flexion.
- Enforce attachment realism: strap tension vectors, anchor-point compression, and closure hardware response under motion.
- Enforce optics coherence: polarization-like sheen behavior on satin/hosiery, roughness-dependent specular lobe width, and exposure-consistent highlight rolloff.
- Enforce sensor realism: realistic highlight clipping knees, subtle chroma noise in shadows, and no procedural overcleaning.

Cutting-edge simulation and rendering protocol (last-4-month focus, Dec 2025-Feb 2026):
- PhysDrape-style force pipeline (Feb 2026): infer residual deformation with explicit force balancing, then apply strict differentiable collision projection to eliminate interpenetration without destroying cloth shape.
- ReWeaver-style garment structure prior (Jan 2026): preserve panel/seam logic and topological consistency so deformations remain simulation-ready, not texture-only approximations.
- FNOPT-style rollout strategy (Dec 2025): perform resolution-agnostic coarse-to-fine integration; coarse motion must remain stable before adding medium and micro wrinkle detail.
- PI-Light-style transport prior (Jan 2026): preserve physically plausible diffuse/specular separation under relighting-like changes; highlights should move with light, not with texture.
- RotLight-style ambiguity control (Feb 2026): suppress baked shadows in albedo-like regions and maintain lighting/material disentanglement across reflective textiles.
- Two-piece dynamics priority: top and skirt exchange motion cues through waist/hip acceleration while retaining independent inertia and damping.
- Reject any frame where contact, wrinkle evolution, seam behavior, or reflectance changes are not causally explainable.

Innovation motif: leather-chair contact pressure map with localized fabric sheen shift and smoke volumetric scattering tuned by lamp intensity falloff.

Attire impact through physics (primary):
- Build a contour-forward two-piece silhouette via strain maps, seam load paths, and controlled tension around bustline/waist/hip/upper leg.
- Use top-vs-skirt interaction physics: independent motion with believable timing offsets and no fused-garment behavior.
- Use slit dynamics tied to pose/gravity so opening behavior follows leg angle and movement.
- Use sheer optical behavior through denier gradients and layered occlusion, never as flat painted transparency.
- Use phase-aware motion transfer: torso acceleration drives delayed hem response, then damping settles folds without jitter.

Material system (primary):
- Satin/silk: anisotropic highlight flow, gravity drape vectors, compression folds at contact points.
- Velvet: direction-dependent pile shading and contact darkening.
- Sequins/crystals: controlled spark distribution with micro-normal variation, no random glitter noise.
- Hosiery: thigh-band compression transition, stretch over knee contour, ankle micro-wrinkling, directional sheen.
- Two-piece structure: waistband bending stiffness, top hem recovery, and closure/strap tension that remains physically plausible frame to frame.
- Use shell-like bending behavior cues (Kirchhoff-Love style): smooth curvature in low-strain zones and tight buckling only near constrained seams.

Editorial risk energy (primary, non-explicit):
- Keep wardrobe and pose bold, assertive, and fashion-forward while staying non-explicit.
- Favor long leg-line projection, strong S-curve torso-leg flow, and confident chin/eye tension.
- Keep full outfit readable in frame with contour-defining light placement.

Camera and render intent:
- Vertical 4:5 framing, output target 2K.
- Lens behavior should feel like premium editorial capture (roughly 50-85mm equivalent perspective).
- Filmic noise only, no heavy denoise smear, no oversharpen halos, no synthetic texture mush.

Environment integration:
- Subject must physically belong in the set: contact shadows, reflection coherence, and interaction with nearby surfaces.
- Haze should add depth separation without washing contrast.
- Keep practical highlights and reflective cues consistent with object roughness and angle.

Extreme realism audit (primary):
- Validate physically causal links: pose -> tension map -> fold pattern -> highlight path -> shadow placement.
- Any non-causal cloth fold, reflection mismatch, or eye-direction inconsistency is a hard failure.
- Preserve cinematic boldness while remaining fully believable as a real photographed moment.

Quality gate (primary):
- Real-camera believability under close inspection.
- No broken fingers, no warped feet, no fabric clipping, no face drift, no incorrect eye direction.
- Deliver a high-end Vegas editorial still with strong, edge-forward style and uncompromised realism.

AUDIT-V6 QUALITY ENFORCEMENT (PRIMARY, HARD):
- Two-piece topology lock: render two physically separate garments with a visible waist separation line in final frame.
- Forbidden substitutions: one-piece dress, bodysuit, jumpsuit, romper, faux-cutout single-panel dress.
- Material-color lock: keep prompt-specified material and color family dominant and unmistakable.
- Edge mood lock: premium nightlife contrast only; no flat, casual, daylight, or domestic snapshot lighting.
- Pose-energy lock: assertive editorial posture with strong leg-line projection and clear silhouette readability.
- Physics innovation stack:
  - XPBD-like cloth constraint hierarchy (seam stiffness > panel stiffness > edge drape compliance).
  - Frictional garment-skin contact with pressure-gradient shading at garment boundaries.
  - Top/skirt phase-lag dynamics with waist-coupled impulse transfer.
  - Anisotropic textile BRDF plus denier-dependent hosiery translucency.
- Regenerate if any appear: fused top/skirt silhouette, prompt-material substitution, weak contour separation, or non-causal fold/specular behavior.

DEVILS-ADVOCATE MICRO-PHYSICS ESCALATION (PRIMARY, HARD):
- Reject any image where cloth realism could be explained by flat texture mapping alone.
- Enforce multi-band wrinkle spectra tied to stress tensors:
  - micro band: 2-4 mm crease ripples at high-strain seams,
  - meso band: 6-12 mm folds along bias/shear flow,
  - macro band: 20-40 mm gravity drape lobes.
- Enforce stitch-pull periodicity and seam-ridge relief (about 1-3 mm apparent depth) at structural joins.
- Enforce contact indentation at support edges (about 0.5-2.0 mm apparent compression) with narrow occlusion gradients.
- Enforce slit-edge slip-stick mechanics: brief friction hold, controlled release, damped settling; no teleporting hem shapes.
- Enforce hosiery denier optics as physics, not paint: yarn-direction anisotropic sheen, knee/quad stretch brightening, thigh-band pressure transition.
- Enforce skin-optics micro-consistency near garment boundaries: subtle desaturation/compression zones, non-uniform micro-spec breakup.
- Enforce material energy conservation: lambertian + specular balance remains plausible under mixed practical lights.
- Enforce geometric penumbra correctness at thin edges (straps, slit hems, hair strands): no fake ambient smudge shadows.
- Force-chain closure test (must pass): pose load -> local strain -> fold orientation -> highlight elongation -> shadow penumbra.

V9 MICRO-PHYSICS DEEPENING PROTOCOL (HARD):
Primary variant: push non-explicit editorial edge via high-density causal micro-physics and strict two-piece topology integrity.
- Per-zone ledger requirement (must read clearly at 100% zoom): top support edge, waist transition, slit boundary, thigh band, knee contour, ankle/instep, heel-floor contact, hand-prop contact.
- Each zone must display at least 3 coherent cues: strain gradient, seam relief, compression shadow, anisotropic highlight flow, denier gradient, friction-damped drape, support-anchor pressure.
- Causality chain must close: pose/load -> strain field -> fold orientation -> highlight elongation -> penumbra geometry.
- Hosiery micro-physics: yarn-direction sheen, denier-dependent translucency, thigh-band pressure transition, and knee stretch brightening without painted transparency artifacts.
- Skin-edge coupling: subtle compression/desaturation near garment boundaries with non-uniform micro-spec breakup (no hard masks).
- Two-piece mechanics: top hem and skirt waistband remain visually separate and dynamically coupled with phase-lag, never merged into one-piece behavior.
- Optical realism: reflections/shadows must be light-source motivated and roughness-consistent; reject detached highlights and ambient-smudge shadows.
- Lounge lock: seated/lean posture must preserve pelvis-shoulder mechanics and clean contour-light continuity.
- Lounge edge-gaze lock: maintain direct lens engagement with clear eye catchlights and non-flat edge contrast at face/jaw/hair boundaries.
SCORER-ALIGNED CONSISTENCY LOCK:
- Keep direct lens-locked gaze with believable vergence and eyelid tension in final frame.
- Preserve identity fidelity under mixed practical light; no face drift under pose/exposure shifts.
- Enforce complete wardrobe replacement from reference clothing cues.
- If diagnostics criticize prompt adherence, treat output as failed and regenerate with stricter scene/material matching.
- Editorial guardrail: bold but non-explicit, premium nightlife campaign intent only.
V11 FIRST-PRINCIPLES PHYSICS CONTRACT (HARD):
- Color-family lock (hard fail on drift): attire dominant hue/material family must match prompt palette, not generic black/red substitutions.
- Scene-anchor lock (hard fail on drift): keep at least 3 named environment anchors physically present and optically coherent in-frame.
- Lens-lock gaze certainty: iris direction lens-centered with stable catchlight geometry and believable vergence in final frame.
- Edge-separation lock: preserve clean subject-background contour gradients and physically plausible rim/fill transitions (no flat ambient wash).
- Coverage-stability lock: maintain non-explicit support geometry under motion; no safety-ambiguous reveal edges or unstable cutline artifacts.
- 100% zoom micro-audit: seam ridge depth, denier gradient, contact compression, anisotropic spec flow, and penumbra continuity must all cohere.

### Safe Backup Prompt

FIRST-PRINCIPLES TARGET:
Make a believable real camera capture, not an AI-looking render. If directives conflict, prioritize: (1) identity fidelity, (2) direct eye contact to lens, (3) physical plausibility of anatomy/materials/light, (4) editorial risk energy, (5) style details.

Identity lock (non-negotiable): use the provided reference image as the sole identity source for the same adult woman (25+). Preserve face geometry and recognition cues: eye spacing, brow arc, orbital depth, nose bridge, mouth width, chin contour, jawline, hairline pattern, natural asymmetry, and skin undertone. Do not drift into a different person under any lighting or pose.

Gaze lock (hard rule): subject must look directly into the camera lens in the final frame. Keep iris/pupil direction lens-centered with believable vergence and eyelid tension. No off-camera gaze, no downcast eyes, no profile-only eye direction.

Scene:
Keep the same Vegas speakeasy environment with cigar lounge nook with leather club chair, walnut shelves, amber lamp pool, soft smoke diffusion. Maintain the same cinematic mood, depth layering, and practical-light logic.

Attire (safe fallback variant):
plum velvet two-piece cocktail set: restrained-structure top and a skirt with moderate slit, black thigh-high hosiery, satin pumps
Coverage is safer, but the image must still read as bold and high-impact through physically grounded fit, silhouette, hosiery optics, two-piece coupling realism, and pose confidence.

Pose and narrative:
chair-edge lean with torso angle and lifted chin, hand grazing chair arm, direct eye contact into lens, poised confidence, premium editorial tone.

Realism foundation:
- Anatomical plausibility: coherent shoulder-pelvis relationship, correct limb proportions, natural hand articulation, heel-ground load mechanics, and valid center-of-mass balance.
- Optics plausibility: realistic depth of field transitions, no cutout halos, no warped edges, no fake blur.
- Lighting plausibility: practical-source motivated key/fill/rim behavior, coherent shadow direction/penumbra, roughness-aware reflections, Fresnel-consistent highlights.

Anti-AI authenticity constraints:
- Keep skin lifelike with pore detail, subtle tonal variation, and no porcelain smoothing.
- Keep hair lifelike with irregular strand grouping and minor flyaways.
- Keep fabric lifelike with non-repeating microtexture and seam irregularity.
- Preserve slight real-world asymmetry in makeup, textile tension, and prop placement.
- Reject outputs with uncanny eyes, plastic skin, rubber fabric, repeated texture stamps, or composited subject separation.

Frontier physics controls:
- Simulate wrinkle hierarchy from first principles: macro gravity folds, meso seam-anchored buckling, micro high-frequency creasing in strain concentration zones.
- Enforce contact mechanics: where body/garment/surface meet, show pressure flattening, shadow occlusion, and material-dependent friction behavior.
- Enforce textile constitutive behavior: stretch anisotropy, bias-direction drape differences, and edge curl response tied to fabric stiffness.
- Enforce two-piece coupling mechanics: top hem stability vs skirt waistband load, phase-lag motion between upper/lower garments, and realistic gap dynamics under torso flexion.
- Enforce attachment realism: strap tension vectors, anchor-point compression, and closure hardware response under motion.
- Enforce optics coherence: polarization-like sheen behavior on satin/hosiery, roughness-dependent specular lobe width, and exposure-consistent highlight rolloff.
- Enforce sensor realism: realistic highlight clipping knees, subtle chroma noise in shadows, and no procedural overcleaning.

Cutting-edge simulation and rendering protocol (last-4-month focus, Dec 2025-Feb 2026):
- PhysDrape-style force pipeline (Feb 2026): infer residual deformation with explicit force balancing, then apply strict differentiable collision projection to eliminate interpenetration without destroying cloth shape.
- ReWeaver-style garment structure prior (Jan 2026): preserve panel/seam logic and topological consistency so deformations remain simulation-ready, not texture-only approximations.
- FNOPT-style rollout strategy (Dec 2025): perform resolution-agnostic coarse-to-fine integration; coarse motion must remain stable before adding medium and micro wrinkle detail.
- PI-Light-style transport prior (Jan 2026): preserve physically plausible diffuse/specular separation under relighting-like changes; highlights should move with light, not with texture.
- RotLight-style ambiguity control (Feb 2026): suppress baked shadows in albedo-like regions and maintain lighting/material disentanglement across reflective textiles.
- Two-piece dynamics priority: top and skirt exchange motion cues through waist/hip acceleration while retaining independent inertia and damping.
- Reject any frame where contact, wrinkle evolution, seam behavior, or reflectance changes are not causally explainable.

Safe adaptation of innovation motif:
Innovation motif: leather-chair contact pressure map with localized fabric sheen shift and smoke volumetric scattering tuned by lamp intensity falloff.

Attire impact through physics (safe fallback):
- Keep safer two-piece coverage geometry while still maintaining a high-impact editorial silhouette through fit tension and contour lighting.
- Preserve believable top/waistband coupling with secure support behavior and stable anchor mechanics.
- Preserve slit/hem movement logic and hosiery optics with the same physical rigor.
- Maintain non-explicit but bold visual energy via posture, gaze, and material response.
- Use conservative but explicit damping cues: motion settles naturally, with no frozen cloth or chaotic flutter.

Material system (safe fallback):
- Preserve all high-fidelity fabric behavior: drape, crease hierarchy, seam stress, contact compression, and realistic sheen.
- Hosiery must remain physically convincing: denier gradients, stretch maps, cuff pressure transitions, and ankle micro-creases.
- Preserve two-piece physics integrity: top and skirt can move independently while remaining cohesively styled and mechanically stable.

Editorial continuity (safe fallback):
- Keep the same scene, camera realism, and direct-lens eye contact as primary.
- Avoid making safe variant look plain; it must still read as premium nightlife couture.
- Preserve strong silhouette legibility and high-fashion intent.

Camera and render intent:
- Vertical 4:5 framing, output target 2K.
- Photographic realism over stylization, with coherent DOF and physically motivated lighting.
- Keep texture integrity in skin, hair, lace/mesh, and hosiery edges.

Environment integration:
- Keep subject physically anchored to set via contact shadows, reflection consistency, and realistic surface interactions.
- Maintain scene depth through controlled haze and practical-light separation.

Quality gate (safe fallback):
- No identity drift, no uncanny anatomy, no artificial skin smoothing, no fake transparency, no reflection mismatch.
- Final image must look camera-captured, luxurious, and believable.

AUDIT-V6 QUALITY ENFORCEMENT (SAFE, HARD):
- Keep safer coverage, but preserve explicit two-piece topology with visible top hem and separate skirt waistband.
- Forbidden substitutions remain: one-piece dress, bodysuit, jumpsuit, romper, faux-cutout single-panel dress.
- Maintain prompt-specified material and color family so safe variant still matches the concept.
- Maintain edgy nightlife mood via controlled contrast, directional practical light, and subject-background separation.
- Keep the same physics rigor:
  - Stable garment support mechanics in coverage-critical zones.
  - Contact-compression cues at skin/garment and garment/surface interfaces.
  - Top/skirt decoupled inertia with coherent damping and slit response.
  - Hosiery optics from denier gradients and stretch-driven shading.
- Regenerate if safe variant looks plain/casual, loses two-piece identity, or shows non-causal cloth/light behavior.

---

DEVILS-ADVOCATE MICRO-PHYSICS ESCALATION (SAFE, HARD):
- Keep safe coverage, but apply the same micro-physics rigor and reject texture-only pseudo-realism.
- Preserve multi-band wrinkle spectra (micro/meso/macro) with stress-aligned orientation and stable damping.
- Preserve seam/stitch relief cues and waistband/top-hem contact compression under safe-support constraints.
- Preserve hosiery denier micro-optics (anisotropic yarn sheen, stretch transitions, thigh-band compression gradient).
- Preserve slip-stick hem dynamics and friction-coupled contact at seating/rail/bar interfaces.
- Preserve edge-penumbra correctness and avoid painted AO artifacts at thin geometry boundaries.
- Safe does not mean flat: maintain high-fidelity micro-causality while preventing topology collapse to one-piece silhouettes.

---

V9 MICRO-PHYSICS DEEPENING PROTOCOL (HARD):
Safe variant: keep coverage-stable geometry while maximizing editorial edge through physically grounded contour, translucency windows, and strain logic.
- Per-zone ledger requirement (must read clearly at 100% zoom): top support edge, waist transition, slit boundary, thigh band, knee contour, ankle/instep, heel-floor contact, hand-prop contact.
- Each zone must display at least 3 coherent cues: strain gradient, seam relief, compression shadow, anisotropic highlight flow, denier gradient, friction-damped drape, support-anchor pressure.
- Causality chain must close: pose/load -> strain field -> fold orientation -> highlight elongation -> penumbra geometry.
- Hosiery micro-physics: yarn-direction sheen, denier-dependent translucency, thigh-band pressure transition, and knee stretch brightening without painted transparency artifacts.
- Skin-edge coupling: subtle compression/desaturation near garment boundaries with non-uniform micro-spec breakup (no hard masks).
- Two-piece mechanics: top hem and skirt waistband remain visually separate and dynamically coupled with phase-lag, never merged into one-piece behavior.
- Optical realism: reflections/shadows must be light-source motivated and roughness-consistent; reject detached highlights and ambient-smudge shadows.
- Lounge lock: seated/lean posture must preserve pelvis-shoulder mechanics and clean contour-light continuity.
- Lounge edge-gaze lock: maintain direct lens engagement with clear eye catchlights and non-flat edge contrast at face/jaw/hair boundaries.
SCORER-ALIGNED CONSISTENCY LOCK:
- Keep direct lens-locked gaze with believable vergence and eyelid tension in final frame.
- Preserve identity fidelity under mixed practical light; no face drift under pose/exposure shifts.
- Enforce complete wardrobe replacement from reference clothing cues.
- If diagnostics criticize prompt adherence, treat output as failed and regenerate with stricter scene/material matching.
- Safety guardrail: no nudity, no explicit framing, no fetish framing, no unstable reveal artifacts.
V11 SAFE FIRST-PRINCIPLES PHYSICS CONTRACT (HARD):
- Safe does not mean generic: preserve prompt-specific palette and scene anchors while maintaining coverage-stable geometry.
- Color lock: safe attire must stay within the named palette and material family, with no neutralized wardrobe substitution.
- Scene lock: preserve at least 3 named environment anchors with coherent reflections/shadows and contact cues.
- Lens-lock gaze certainty: direct camera eye alignment with credible eyelid tension and catchlight placement.
- Physics lock: maintain two-piece topology, denier optics, seam relief, and contact-compression causality at 100% inspection.

---

## Prompt 11 - Cellar Burgundy Lacework

- Primary word count: 1659
- Safe word count: 1500

### Primary Prompt

FIRST-PRINCIPLES TARGET:
Make a believable real camera capture, not an AI-looking render. If directives conflict, prioritize: (1) identity fidelity, (2) direct eye contact to lens, (3) physical plausibility of anatomy/materials/light, (4) editorial risk energy, (5) style details.

Identity lock (non-negotiable): use the provided reference image as the sole identity source for the same adult woman (25+). Preserve face geometry and recognition cues: eye spacing, brow arc, orbital depth, nose bridge, mouth width, chin contour, jawline, hairline pattern, natural asymmetry, and skin undertone. Do not drift into a different person under any lighting or pose.

Gaze lock (hard rule): subject must look directly into the camera lens in the final frame. Keep iris/pupil direction lens-centered with believable vergence and eyelid tension. No off-camera gaze, no downcast eyes, no profile-only eye direction.

Scene:
Vegas speakeasy environment with bottle cellar corridor with amber practical bulbs, glass reflections, concrete texture, atmospheric depth. Build layered depth (foreground cues, subject mid-plane, background practicals). Subject must feel physically present in the environment.

Attire (primary edge variant):
burgundy lace-over-satin two-piece cocktail set: structured lace top and a dramatic high-slit skirt with pronounced waist contour, black thigh-high hosiery, oxblood stilettos
Use reveal-by-physics rather than explicit framing: contour fit, strain gradients, seam tension maps, and pose-driven two-piece behavior.
Hard two-piece rule: top and skirt must behave as distinct garments with coherent coupling at the waist region, not as a single merged dress.

Pose and narrative:
walking-to-stop moment with one foot planted and one trailing, subtle shoulder turn, direct eye contact into lens, confident expression, controlled editorial energy.

Realism foundation:
- Anatomical plausibility: coherent shoulder-pelvis relationship, correct limb proportions, natural hand articulation, heel-ground load mechanics, and valid center-of-mass balance.
- Optics plausibility: realistic depth of field transitions, no cutout halos, no warped edges, no fake blur.
- Lighting plausibility: practical-source motivated key/fill/rim behavior, coherent shadow direction/penumbra, roughness-aware reflections, Fresnel-consistent highlights.

Anti-AI authenticity constraints:
- Keep skin lifelike with pore detail, subtle tonal variation, and no porcelain smoothing.
- Keep hair lifelike with irregular strand grouping and minor flyaways.
- Keep fabric lifelike with non-repeating microtexture and seam irregularity.
- Preserve slight real-world asymmetry in makeup, textile tension, and prop placement.
- Reject outputs with uncanny eyes, plastic skin, rubber fabric, repeated texture stamps, or composited subject separation.

Frontier physics controls:
- Simulate wrinkle hierarchy from first principles: macro gravity folds, meso seam-anchored buckling, micro high-frequency creasing in strain concentration zones.
- Enforce contact mechanics: where body/garment/surface meet, show pressure flattening, shadow occlusion, and material-dependent friction behavior.
- Enforce textile constitutive behavior: stretch anisotropy, bias-direction drape differences, and edge curl response tied to fabric stiffness.
- Enforce two-piece coupling mechanics: top hem stability vs skirt waistband load, phase-lag motion between upper/lower garments, and realistic gap dynamics under torso flexion.
- Enforce attachment realism: strap tension vectors, anchor-point compression, and closure hardware response under motion.
- Enforce optics coherence: polarization-like sheen behavior on satin/hosiery, roughness-dependent specular lobe width, and exposure-consistent highlight rolloff.
- Enforce sensor realism: realistic highlight clipping knees, subtle chroma noise in shadows, and no procedural overcleaning.

Cutting-edge simulation and rendering protocol (last-4-month focus, Dec 2025-Feb 2026):
- PhysDrape-style force pipeline (Feb 2026): infer residual deformation with explicit force balancing, then apply strict differentiable collision projection to eliminate interpenetration without destroying cloth shape.
- ReWeaver-style garment structure prior (Jan 2026): preserve panel/seam logic and topological consistency so deformations remain simulation-ready, not texture-only approximations.
- FNOPT-style rollout strategy (Dec 2025): perform resolution-agnostic coarse-to-fine integration; coarse motion must remain stable before adding medium and micro wrinkle detail.
- PI-Light-style transport prior (Jan 2026): preserve physically plausible diffuse/specular separation under relighting-like changes; highlights should move with light, not with texture.
- RotLight-style ambiguity control (Feb 2026): suppress baked shadows in albedo-like regions and maintain lighting/material disentanglement across reflective textiles.
- Two-piece dynamics priority: top and skirt exchange motion cues through waist/hip acceleration while retaining independent inertia and damping.
- Reject any frame where contact, wrinkle evolution, seam behavior, or reflectance changes are not causally explainable.

Innovation motif: cellar humidity micro-sheen on skin/fabric and glass-bottle refraction distortion that remains angle-consistent across frame depth.

Attire impact through physics (primary):
- Build a contour-forward two-piece silhouette via strain maps, seam load paths, and controlled tension around bustline/waist/hip/upper leg.
- Use top-vs-skirt interaction physics: independent motion with believable timing offsets and no fused-garment behavior.
- Use slit dynamics tied to pose/gravity so opening behavior follows leg angle and movement.
- Use sheer optical behavior through denier gradients and layered occlusion, never as flat painted transparency.
- Use phase-aware motion transfer: torso acceleration drives delayed hem response, then damping settles folds without jitter.

Material system (primary):
- Satin/silk: anisotropic highlight flow, gravity drape vectors, compression folds at contact points.
- Velvet: direction-dependent pile shading and contact darkening.
- Sequins/crystals: controlled spark distribution with micro-normal variation, no random glitter noise.
- Hosiery: thigh-band compression transition, stretch over knee contour, ankle micro-wrinkling, directional sheen.
- Two-piece structure: waistband bending stiffness, top hem recovery, and closure/strap tension that remains physically plausible frame to frame.
- Use shell-like bending behavior cues (Kirchhoff-Love style): smooth curvature in low-strain zones and tight buckling only near constrained seams.

Editorial risk energy (primary, non-explicit):
- Keep wardrobe and pose bold, assertive, and fashion-forward while staying non-explicit.
- Favor long leg-line projection, strong S-curve torso-leg flow, and confident chin/eye tension.
- Keep full outfit readable in frame with contour-defining light placement.

Camera and render intent:
- Vertical 4:5 framing, output target 2K.
- Lens behavior should feel like premium editorial capture (roughly 50-85mm equivalent perspective).
- Filmic noise only, no heavy denoise smear, no oversharpen halos, no synthetic texture mush.

Environment integration:
- Subject must physically belong in the set: contact shadows, reflection coherence, and interaction with nearby surfaces.
- Haze should add depth separation without washing contrast.
- Keep practical highlights and reflective cues consistent with object roughness and angle.

Extreme realism audit (primary):
- Validate physically causal links: pose -> tension map -> fold pattern -> highlight path -> shadow placement.
- Any non-causal cloth fold, reflection mismatch, or eye-direction inconsistency is a hard failure.
- Preserve cinematic boldness while remaining fully believable as a real photographed moment.

Quality gate (primary):
- Real-camera believability under close inspection.
- No broken fingers, no warped feet, no fabric clipping, no face drift, no incorrect eye direction.
- Deliver a high-end Vegas editorial still with strong, edge-forward style and uncompromised realism.

AUDIT-V6 QUALITY ENFORCEMENT (PRIMARY, HARD):
- Two-piece topology lock: render two physically separate garments with a visible waist separation line in final frame.
- Forbidden substitutions: one-piece dress, bodysuit, jumpsuit, romper, faux-cutout single-panel dress.
- Material-color lock: keep prompt-specified material and color family dominant and unmistakable.
- Edge mood lock: premium nightlife contrast only; no flat, casual, daylight, or domestic snapshot lighting.
- Pose-energy lock: assertive editorial posture with strong leg-line projection and clear silhouette readability.
- Physics innovation stack:
  - XPBD-like cloth constraint hierarchy (seam stiffness > panel stiffness > edge drape compliance).
  - Frictional garment-skin contact with pressure-gradient shading at garment boundaries.
  - Top/skirt phase-lag dynamics with waist-coupled impulse transfer.
  - Anisotropic textile BRDF plus denier-dependent hosiery translucency.
- Regenerate if any appear: fused top/skirt silhouette, prompt-material substitution, weak contour separation, or non-causal fold/specular behavior.

TARGETED CORRECTION (11 - TWO-PIECE INTEGRITY):
- Preserve distinct top hem and skirt waistband with non-fused topology under haze/low light.
- Reject one-piece look even if fabric texture and color are correct.

DEVILS-ADVOCATE MICRO-PHYSICS ESCALATION (PRIMARY, HARD):
- Reject any image where cloth realism could be explained by flat texture mapping alone.
- Enforce multi-band wrinkle spectra tied to stress tensors:
  - micro band: 2-4 mm crease ripples at high-strain seams,
  - meso band: 6-12 mm folds along bias/shear flow,
  - macro band: 20-40 mm gravity drape lobes.
- Enforce stitch-pull periodicity and seam-ridge relief (about 1-3 mm apparent depth) at structural joins.
- Enforce contact indentation at support edges (about 0.5-2.0 mm apparent compression) with narrow occlusion gradients.
- Enforce slit-edge slip-stick mechanics: brief friction hold, controlled release, damped settling; no teleporting hem shapes.
- Enforce hosiery denier optics as physics, not paint: yarn-direction anisotropic sheen, knee/quad stretch brightening, thigh-band pressure transition.
- Enforce skin-optics micro-consistency near garment boundaries: subtle desaturation/compression zones, non-uniform micro-spec breakup.
- Enforce material energy conservation: lambertian + specular balance remains plausible under mixed practical lights.
- Enforce geometric penumbra correctness at thin edges (straps, slit hems, hair strands): no fake ambient smudge shadows.
- Force-chain closure test (must pass): pose load -> local strain -> fold orientation -> highlight elongation -> shadow penumbra.

V9 MICRO-PHYSICS DEEPENING PROTOCOL (HARD):
Primary variant: push non-explicit editorial edge via high-density causal micro-physics and strict two-piece topology integrity.
- Per-zone ledger requirement (must read clearly at 100% zoom): top support edge, waist transition, slit boundary, thigh band, knee contour, ankle/instep, heel-floor contact, hand-prop contact.
- Each zone must display at least 3 coherent cues: strain gradient, seam relief, compression shadow, anisotropic highlight flow, denier gradient, friction-damped drape, support-anchor pressure.
- Causality chain must close: pose/load -> strain field -> fold orientation -> highlight elongation -> penumbra geometry.
- Hosiery micro-physics: yarn-direction sheen, denier-dependent translucency, thigh-band pressure transition, and knee stretch brightening without painted transparency artifacts.
- Skin-edge coupling: subtle compression/desaturation near garment boundaries with non-uniform micro-spec breakup (no hard masks).
- Two-piece mechanics: top hem and skirt waistband remain visually separate and dynamically coupled with phase-lag, never merged into one-piece behavior.
- Optical realism: reflections/shadows must be light-source motivated and roughness-consistent; reject detached highlights and ambient-smudge shadows.
- Cellar lace lock: burgundy lace material identity must stay explicit while maintaining safety-compatible framing.
SCORER-ALIGNED CONSISTENCY LOCK:
- Keep direct lens-locked gaze with believable vergence and eyelid tension in final frame.
- Preserve identity fidelity under mixed practical light; no face drift under pose/exposure shifts.
- Enforce complete wardrobe replacement from reference clothing cues.
- If diagnostics criticize prompt adherence, treat output as failed and regenerate with stricter scene/material matching.
- Editorial guardrail: bold but non-explicit, premium nightlife campaign intent only.
V11 FIRST-PRINCIPLES PHYSICS CONTRACT (HARD):
- Color-family lock (hard fail on drift): attire dominant hue/material family must match prompt palette, not generic black/red substitutions.
- Scene-anchor lock (hard fail on drift): keep at least 3 named environment anchors physically present and optically coherent in-frame.
- Lens-lock gaze certainty: iris direction lens-centered with stable catchlight geometry and believable vergence in final frame.
- Edge-separation lock: preserve clean subject-background contour gradients and physically plausible rim/fill transitions (no flat ambient wash).
- Coverage-stability lock: maintain non-explicit support geometry under motion; no safety-ambiguous reveal edges or unstable cutline artifacts.
- 100% zoom micro-audit: seam ridge depth, denier gradient, contact compression, anisotropic spec flow, and penumbra continuity must all cohere.

### Safe Backup Prompt

FIRST-PRINCIPLES TARGET:
Make a believable real camera capture, not an AI-looking render. If directives conflict, prioritize: (1) identity fidelity, (2) direct eye contact to lens, (3) physical plausibility of anatomy/materials/light, (4) editorial risk energy, (5) style details.

Identity lock (non-negotiable): use the provided reference image as the sole identity source for the same adult woman (25+). Preserve face geometry and recognition cues: eye spacing, brow arc, orbital depth, nose bridge, mouth width, chin contour, jawline, hairline pattern, natural asymmetry, and skin undertone. Do not drift into a different person under any lighting or pose.

Gaze lock (hard rule): subject must look directly into the camera lens in the final frame. Keep iris/pupil direction lens-centered with believable vergence and eyelid tension. No off-camera gaze, no downcast eyes, no profile-only eye direction.

Scene:
Keep the same Vegas speakeasy environment with bottle cellar corridor with amber practical bulbs, glass reflections, concrete texture, atmospheric depth. Maintain the same cinematic mood, depth layering, and practical-light logic.

Attire (safe fallback variant):
burgundy lace-over-satin two-piece cocktail set: structured lace top and a skirt with moderate slit and softer waist contour, black thigh-high hosiery, oxblood pumps
Coverage is safer, but the image must still read as bold and high-impact through physically grounded fit, silhouette, hosiery optics, two-piece coupling realism, and pose confidence.

Pose and narrative:
walking-to-stop moment with one foot planted and one trailing, subtle shoulder turn, direct eye contact into lens, poised confidence, premium editorial tone.

Realism foundation:
- Anatomical plausibility: coherent shoulder-pelvis relationship, correct limb proportions, natural hand articulation, heel-ground load mechanics, and valid center-of-mass balance.
- Optics plausibility: realistic depth of field transitions, no cutout halos, no warped edges, no fake blur.
- Lighting plausibility: practical-source motivated key/fill/rim behavior, coherent shadow direction/penumbra, roughness-aware reflections, Fresnel-consistent highlights.

Anti-AI authenticity constraints:
- Keep skin lifelike with pore detail, subtle tonal variation, and no porcelain smoothing.
- Keep hair lifelike with irregular strand grouping and minor flyaways.
- Keep fabric lifelike with non-repeating microtexture and seam irregularity.
- Preserve slight real-world asymmetry in makeup, textile tension, and prop placement.
- Reject outputs with uncanny eyes, plastic skin, rubber fabric, repeated texture stamps, or composited subject separation.

Frontier physics controls:
- Simulate wrinkle hierarchy from first principles: macro gravity folds, meso seam-anchored buckling, micro high-frequency creasing in strain concentration zones.
- Enforce contact mechanics: where body/garment/surface meet, show pressure flattening, shadow occlusion, and material-dependent friction behavior.
- Enforce textile constitutive behavior: stretch anisotropy, bias-direction drape differences, and edge curl response tied to fabric stiffness.
- Enforce two-piece coupling mechanics: top hem stability vs skirt waistband load, phase-lag motion between upper/lower garments, and realistic gap dynamics under torso flexion.
- Enforce attachment realism: strap tension vectors, anchor-point compression, and closure hardware response under motion.
- Enforce optics coherence: polarization-like sheen behavior on satin/hosiery, roughness-dependent specular lobe width, and exposure-consistent highlight rolloff.
- Enforce sensor realism: realistic highlight clipping knees, subtle chroma noise in shadows, and no procedural overcleaning.

Cutting-edge simulation and rendering protocol (last-4-month focus, Dec 2025-Feb 2026):
- PhysDrape-style force pipeline (Feb 2026): infer residual deformation with explicit force balancing, then apply strict differentiable collision projection to eliminate interpenetration without destroying cloth shape.
- ReWeaver-style garment structure prior (Jan 2026): preserve panel/seam logic and topological consistency so deformations remain simulation-ready, not texture-only approximations.
- FNOPT-style rollout strategy (Dec 2025): perform resolution-agnostic coarse-to-fine integration; coarse motion must remain stable before adding medium and micro wrinkle detail.
- PI-Light-style transport prior (Jan 2026): preserve physically plausible diffuse/specular separation under relighting-like changes; highlights should move with light, not with texture.
- RotLight-style ambiguity control (Feb 2026): suppress baked shadows in albedo-like regions and maintain lighting/material disentanglement across reflective textiles.
- Two-piece dynamics priority: top and skirt exchange motion cues through waist/hip acceleration while retaining independent inertia and damping.
- Reject any frame where contact, wrinkle evolution, seam behavior, or reflectance changes are not causally explainable.

Safe adaptation of innovation motif:
Innovation motif: cellar humidity micro-sheen on skin/fabric and glass-bottle refraction distortion that remains angle-consistent across frame depth.

Attire impact through physics (safe fallback):
- Keep safer two-piece coverage geometry while still maintaining a high-impact editorial silhouette through fit tension and contour lighting.
- Preserve believable top/waistband coupling with secure support behavior and stable anchor mechanics.
- Preserve slit/hem movement logic and hosiery optics with the same physical rigor.
- Maintain non-explicit but bold visual energy via posture, gaze, and material response.
- Use conservative but explicit damping cues: motion settles naturally, with no frozen cloth or chaotic flutter.

Material system (safe fallback):
- Preserve all high-fidelity fabric behavior: drape, crease hierarchy, seam stress, contact compression, and realistic sheen.
- Hosiery must remain physically convincing: denier gradients, stretch maps, cuff pressure transitions, and ankle micro-creases.
- Preserve two-piece physics integrity: top and skirt can move independently while remaining cohesively styled and mechanically stable.

Editorial continuity (safe fallback):
- Keep the same scene, camera realism, and direct-lens eye contact as primary.
- Avoid making safe variant look plain; it must still read as premium nightlife couture.
- Preserve strong silhouette legibility and high-fashion intent.

Camera and render intent:
- Vertical 4:5 framing, output target 2K.
- Photographic realism over stylization, with coherent DOF and physically motivated lighting.
- Keep texture integrity in skin, hair, lace/mesh, and hosiery edges.

Environment integration:
- Keep subject physically anchored to set via contact shadows, reflection consistency, and realistic surface interactions.
- Maintain scene depth through controlled haze and practical-light separation.

Quality gate (safe fallback):
- No identity drift, no uncanny anatomy, no artificial skin smoothing, no fake transparency, no reflection mismatch.
- Final image must look camera-captured, luxurious, and believable.

AUDIT-V6 QUALITY ENFORCEMENT (SAFE, HARD):
- Keep safer coverage, but preserve explicit two-piece topology with visible top hem and separate skirt waistband.
- Forbidden substitutions remain: one-piece dress, bodysuit, jumpsuit, romper, faux-cutout single-panel dress.
- Maintain prompt-specified material and color family so safe variant still matches the concept.
- Maintain edgy nightlife mood via controlled contrast, directional practical light, and subject-background separation.
- Keep the same physics rigor:
  - Stable garment support mechanics in coverage-critical zones.
  - Contact-compression cues at skin/garment and garment/surface interfaces.
  - Top/skirt decoupled inertia with coherent damping and slit response.
  - Hosiery optics from denier gradients and stretch-driven shading.
- Regenerate if safe variant looks plain/casual, loses two-piece identity, or shows non-causal cloth/light behavior.

TARGETED SAFE CORRECTION (11 - TWO-PIECE INTEGRITY):
- Preserve separate garments under low light with clear hem/waistband separation cues.

---

DEVILS-ADVOCATE MICRO-PHYSICS ESCALATION (SAFE, HARD):
- Keep safe coverage, but apply the same micro-physics rigor and reject texture-only pseudo-realism.
- Preserve multi-band wrinkle spectra (micro/meso/macro) with stress-aligned orientation and stable damping.
- Preserve seam/stitch relief cues and waistband/top-hem contact compression under safe-support constraints.
- Preserve hosiery denier micro-optics (anisotropic yarn sheen, stretch transitions, thigh-band compression gradient).
- Preserve slip-stick hem dynamics and friction-coupled contact at seating/rail/bar interfaces.
- Preserve edge-penumbra correctness and avoid painted AO artifacts at thin geometry boundaries.
- Safe does not mean flat: maintain high-fidelity micro-causality while preventing topology collapse to one-piece silhouettes.

---

V9 MICRO-PHYSICS DEEPENING PROTOCOL (HARD):
Safe variant: keep coverage-stable geometry while maximizing editorial edge through physically grounded contour, translucency windows, and strain logic.
- Per-zone ledger requirement (must read clearly at 100% zoom): top support edge, waist transition, slit boundary, thigh band, knee contour, ankle/instep, heel-floor contact, hand-prop contact.
- Each zone must display at least 3 coherent cues: strain gradient, seam relief, compression shadow, anisotropic highlight flow, denier gradient, friction-damped drape, support-anchor pressure.
- Causality chain must close: pose/load -> strain field -> fold orientation -> highlight elongation -> penumbra geometry.
- Hosiery micro-physics: yarn-direction sheen, denier-dependent translucency, thigh-band pressure transition, and knee stretch brightening without painted transparency artifacts.
- Skin-edge coupling: subtle compression/desaturation near garment boundaries with non-uniform micro-spec breakup (no hard masks).
- Two-piece mechanics: top hem and skirt waistband remain visually separate and dynamically coupled with phase-lag, never merged into one-piece behavior.
- Optical realism: reflections/shadows must be light-source motivated and roughness-consistent; reject detached highlights and ambient-smudge shadows.
- Cellar lace lock: burgundy lace material identity must stay explicit while maintaining safety-compatible framing.
SCORER-ALIGNED CONSISTENCY LOCK:
- Keep direct lens-locked gaze with believable vergence and eyelid tension in final frame.
- Preserve identity fidelity under mixed practical light; no face drift under pose/exposure shifts.
- Enforce complete wardrobe replacement from reference clothing cues.
- If diagnostics criticize prompt adherence, treat output as failed and regenerate with stricter scene/material matching.
- Safety guardrail: no nudity, no explicit framing, no fetish framing, no unstable reveal artifacts.
V11 SAFE FIRST-PRINCIPLES PHYSICS CONTRACT (HARD):
- Safe does not mean generic: preserve prompt-specific palette and scene anchors while maintaining coverage-stable geometry.
- Color lock: safe attire must stay within the named palette and material family, with no neutralized wardrobe substitution.
- Scene lock: preserve at least 3 named environment anchors with coherent reflections/shadows and contact cues.
- Lens-lock gaze certainty: direct camera eye alignment with credible eyelid tension and catchlight placement.
- Physics lock: maintain two-piece topology, denier optics, seam relief, and contact-compression causality at 100% inspection.

---

## Prompt 12 - Vault Lamé Resolve

- Primary word count: 1680
- Safe word count: 1502

### Primary Prompt

FIRST-PRINCIPLES TARGET:
Make a believable real camera capture, not an AI-looking render. If directives conflict, prioritize: (1) identity fidelity, (2) direct eye contact to lens, (3) physical plausibility of anatomy/materials/light, (4) editorial risk energy, (5) style details.

Identity lock (non-negotiable): use the provided reference image as the sole identity source for the same adult woman (25+). Preserve face geometry and recognition cues: eye spacing, brow arc, orbital depth, nose bridge, mouth width, chin contour, jawline, hairline pattern, natural asymmetry, and skin undertone. Do not drift into a different person under any lighting or pose.

Gaze lock (hard rule): subject must look directly into the camera lens in the final frame. Keep iris/pupil direction lens-centered with believable vergence and eyelid tension. No off-camera gaze, no downcast eyes, no profile-only eye direction.

Scene:
Vegas speakeasy environment with vault-door lounge with brushed steel, brass rivets, moody practical bulbs, clean noir shadows. Build layered depth (foreground cues, subject mid-plane, background practicals). Subject must feel physically present in the environment.

Attire (primary edge variant):
silver lamé two-piece cocktail set: angular wrap top and a high-slit skirt with directional lamé fold flow, black sheer thigh-high hosiery, mirrored stilettos
Use reveal-by-physics rather than explicit framing: contour fit, strain gradients, seam tension maps, and pose-driven two-piece behavior.
Hard two-piece rule: top and skirt must behave as distinct garments with coherent coupling at the waist region, not as a single merged dress.

Pose and narrative:
hand near vault wheel, torso angled to light, one leg advanced for slit-driven motion physics, direct eye contact into lens, confident expression, controlled editorial energy.

Realism foundation:
- Anatomical plausibility: coherent shoulder-pelvis relationship, correct limb proportions, natural hand articulation, heel-ground load mechanics, and valid center-of-mass balance.
- Optics plausibility: realistic depth of field transitions, no cutout halos, no warped edges, no fake blur.
- Lighting plausibility: practical-source motivated key/fill/rim behavior, coherent shadow direction/penumbra, roughness-aware reflections, Fresnel-consistent highlights.

Anti-AI authenticity constraints:
- Keep skin lifelike with pore detail, subtle tonal variation, and no porcelain smoothing.
- Keep hair lifelike with irregular strand grouping and minor flyaways.
- Keep fabric lifelike with non-repeating microtexture and seam irregularity.
- Preserve slight real-world asymmetry in makeup, textile tension, and prop placement.
- Reject outputs with uncanny eyes, plastic skin, rubber fabric, repeated texture stamps, or composited subject separation.

Frontier physics controls:
- Simulate wrinkle hierarchy from first principles: macro gravity folds, meso seam-anchored buckling, micro high-frequency creasing in strain concentration zones.
- Enforce contact mechanics: where body/garment/surface meet, show pressure flattening, shadow occlusion, and material-dependent friction behavior.
- Enforce textile constitutive behavior: stretch anisotropy, bias-direction drape differences, and edge curl response tied to fabric stiffness.
- Enforce two-piece coupling mechanics: top hem stability vs skirt waistband load, phase-lag motion between upper/lower garments, and realistic gap dynamics under torso flexion.
- Enforce attachment realism: strap tension vectors, anchor-point compression, and closure hardware response under motion.
- Enforce optics coherence: polarization-like sheen behavior on satin/hosiery, roughness-dependent specular lobe width, and exposure-consistent highlight rolloff.
- Enforce sensor realism: realistic highlight clipping knees, subtle chroma noise in shadows, and no procedural overcleaning.

Cutting-edge simulation and rendering protocol (last-4-month focus, Dec 2025-Feb 2026):
- PhysDrape-style force pipeline (Feb 2026): infer residual deformation with explicit force balancing, then apply strict differentiable collision projection to eliminate interpenetration without destroying cloth shape.
- ReWeaver-style garment structure prior (Jan 2026): preserve panel/seam logic and topological consistency so deformations remain simulation-ready, not texture-only approximations.
- FNOPT-style rollout strategy (Dec 2025): perform resolution-agnostic coarse-to-fine integration; coarse motion must remain stable before adding medium and micro wrinkle detail.
- PI-Light-style transport prior (Jan 2026): preserve physically plausible diffuse/specular separation under relighting-like changes; highlights should move with light, not with texture.
- RotLight-style ambiguity control (Feb 2026): suppress baked shadows in albedo-like regions and maintain lighting/material disentanglement across reflective textiles.
- Two-piece dynamics priority: top and skirt exchange motion cues through waist/hip acceleration while retaining independent inertia and damping.
- Reject any frame where contact, wrinkle evolution, seam behavior, or reflectance changes are not causally explainable.

Innovation motif: brushed steel anisotropy + rivet micro-shadowing, with lamé highlight breakup based on fold curvature and view-dependent reflectance.

Attire impact through physics (primary):
- Build a contour-forward two-piece silhouette via strain maps, seam load paths, and controlled tension around bustline/waist/hip/upper leg.
- Use top-vs-skirt interaction physics: independent motion with believable timing offsets and no fused-garment behavior.
- Use slit dynamics tied to pose/gravity so opening behavior follows leg angle and movement.
- Use sheer optical behavior through denier gradients and layered occlusion, never as flat painted transparency.
- Use phase-aware motion transfer: torso acceleration drives delayed hem response, then damping settles folds without jitter.

Material system (primary):
- Satin/silk: anisotropic highlight flow, gravity drape vectors, compression folds at contact points.
- Velvet: direction-dependent pile shading and contact darkening.
- Sequins/crystals: controlled spark distribution with micro-normal variation, no random glitter noise.
- Hosiery: thigh-band compression transition, stretch over knee contour, ankle micro-wrinkling, directional sheen.
- Two-piece structure: waistband bending stiffness, top hem recovery, and closure/strap tension that remains physically plausible frame to frame.
- Use shell-like bending behavior cues (Kirchhoff-Love style): smooth curvature in low-strain zones and tight buckling only near constrained seams.

Editorial risk energy (primary, non-explicit):
- Keep wardrobe and pose bold, assertive, and fashion-forward while staying non-explicit.
- Favor long leg-line projection, strong S-curve torso-leg flow, and confident chin/eye tension.
- Keep full outfit readable in frame with contour-defining light placement.

Camera and render intent:
- Vertical 4:5 framing, output target 2K.
- Lens behavior should feel like premium editorial capture (roughly 50-85mm equivalent perspective).
- Filmic noise only, no heavy denoise smear, no oversharpen halos, no synthetic texture mush.

Environment integration:
- Subject must physically belong in the set: contact shadows, reflection coherence, and interaction with nearby surfaces.
- Haze should add depth separation without washing contrast.
- Keep practical highlights and reflective cues consistent with object roughness and angle.

Extreme realism audit (primary):
- Validate physically causal links: pose -> tension map -> fold pattern -> highlight path -> shadow placement.
- Any non-causal cloth fold, reflection mismatch, or eye-direction inconsistency is a hard failure.
- Preserve cinematic boldness while remaining fully believable as a real photographed moment.

Quality gate (primary):
- Real-camera believability under close inspection.
- No broken fingers, no warped feet, no fabric clipping, no face drift, no incorrect eye direction.
- Deliver a high-end Vegas editorial still with strong, edge-forward style and uncompromised realism.

AUDIT-V6 QUALITY ENFORCEMENT (PRIMARY, HARD):
- Two-piece topology lock: render two physically separate garments with a visible waist separation line in final frame.
- Forbidden substitutions: one-piece dress, bodysuit, jumpsuit, romper, faux-cutout single-panel dress.
- Material-color lock: keep prompt-specified material and color family dominant and unmistakable.
- Edge mood lock: premium nightlife contrast only; no flat, casual, daylight, or domestic snapshot lighting.
- Pose-energy lock: assertive editorial posture with strong leg-line projection and clear silhouette readability.
- Physics innovation stack:
  - XPBD-like cloth constraint hierarchy (seam stiffness > panel stiffness > edge drape compliance).
  - Frictional garment-skin contact with pressure-gradient shading at garment boundaries.
  - Top/skirt phase-lag dynamics with waist-coupled impulse transfer.
  - Anisotropic textile BRDF plus denier-dependent hosiery translucency.
- Regenerate if any appear: fused top/skirt silhouette, prompt-material substitution, weak contour separation, or non-causal fold/specular behavior.

TARGETED CORRECTION (12 - LAME MATERIAL):
- Metallic lame appearance is mandatory: directional specular streaks, crisp micro-crinkle highlights, and foil-like light breakup.
- Reject matte knit/jersey substitutes even if silhouette is correct.
- Keep vault mood dark and premium so metallic response remains the visual anchor.

DEVILS-ADVOCATE MICRO-PHYSICS ESCALATION (PRIMARY, HARD):
- Reject any image where cloth realism could be explained by flat texture mapping alone.
- Enforce multi-band wrinkle spectra tied to stress tensors:
  - micro band: 2-4 mm crease ripples at high-strain seams,
  - meso band: 6-12 mm folds along bias/shear flow,
  - macro band: 20-40 mm gravity drape lobes.
- Enforce stitch-pull periodicity and seam-ridge relief (about 1-3 mm apparent depth) at structural joins.
- Enforce contact indentation at support edges (about 0.5-2.0 mm apparent compression) with narrow occlusion gradients.
- Enforce slit-edge slip-stick mechanics: brief friction hold, controlled release, damped settling; no teleporting hem shapes.
- Enforce hosiery denier optics as physics, not paint: yarn-direction anisotropic sheen, knee/quad stretch brightening, thigh-band pressure transition.
- Enforce skin-optics micro-consistency near garment boundaries: subtle desaturation/compression zones, non-uniform micro-spec breakup.
- Enforce material energy conservation: lambertian + specular balance remains plausible under mixed practical lights.
- Enforce geometric penumbra correctness at thin edges (straps, slit hems, hair strands): no fake ambient smudge shadows.
- Force-chain closure test (must pass): pose load -> local strain -> fold orientation -> highlight elongation -> shadow penumbra.

V9 MICRO-PHYSICS DEEPENING PROTOCOL (HARD):
Primary variant: push non-explicit editorial edge via high-density causal micro-physics and strict two-piece topology integrity.
- Per-zone ledger requirement (must read clearly at 100% zoom): top support edge, waist transition, slit boundary, thigh band, knee contour, ankle/instep, heel-floor contact, hand-prop contact.
- Each zone must display at least 3 coherent cues: strain gradient, seam relief, compression shadow, anisotropic highlight flow, denier gradient, friction-damped drape, support-anchor pressure.
- Causality chain must close: pose/load -> strain field -> fold orientation -> highlight elongation -> penumbra geometry.
- Hosiery micro-physics: yarn-direction sheen, denier-dependent translucency, thigh-band pressure transition, and knee stretch brightening without painted transparency artifacts.
- Skin-edge coupling: subtle compression/desaturation near garment boundaries with non-uniform micro-spec breakup (no hard masks).
- Two-piece mechanics: top hem and skirt waistband remain visually separate and dynamically coupled with phase-lag, never merged into one-piece behavior.
- Optical realism: reflections/shadows must be light-source motivated and roughness-consistent; reject detached highlights and ambient-smudge shadows.
- Lamé vault lock: metallic cloth anisotropy and attire replacement must dominate over any source-clothing carryover.
SCORER-ALIGNED CONSISTENCY LOCK:
- Keep direct lens-locked gaze with believable vergence and eyelid tension in final frame.
- Preserve identity fidelity under mixed practical light; no face drift under pose/exposure shifts.
- Enforce complete wardrobe replacement from reference clothing cues.
- If diagnostics criticize prompt adherence, treat output as failed and regenerate with stricter scene/material matching.
- Editorial guardrail: bold but non-explicit, premium nightlife campaign intent only.
V11 FIRST-PRINCIPLES PHYSICS CONTRACT (HARD):
- Color-family lock (hard fail on drift): attire dominant hue/material family must match prompt palette, not generic black/red substitutions.
- Scene-anchor lock (hard fail on drift): keep at least 3 named environment anchors physically present and optically coherent in-frame.
- Lens-lock gaze certainty: iris direction lens-centered with stable catchlight geometry and believable vergence in final frame.
- Edge-separation lock: preserve clean subject-background contour gradients and physically plausible rim/fill transitions (no flat ambient wash).
- Coverage-stability lock: maintain non-explicit support geometry under motion; no safety-ambiguous reveal edges or unstable cutline artifacts.
- 100% zoom micro-audit: seam ridge depth, denier gradient, contact compression, anisotropic spec flow, and penumbra continuity must all cohere.

### Safe Backup Prompt

FIRST-PRINCIPLES TARGET:
Make a believable real camera capture, not an AI-looking render. If directives conflict, prioritize: (1) identity fidelity, (2) direct eye contact to lens, (3) physical plausibility of anatomy/materials/light, (4) editorial risk energy, (5) style details.

Identity lock (non-negotiable): use the provided reference image as the sole identity source for the same adult woman (25+). Preserve face geometry and recognition cues: eye spacing, brow arc, orbital depth, nose bridge, mouth width, chin contour, jawline, hairline pattern, natural asymmetry, and skin undertone. Do not drift into a different person under any lighting or pose.

Gaze lock (hard rule): subject must look directly into the camera lens in the final frame. Keep iris/pupil direction lens-centered with believable vergence and eyelid tension. No off-camera gaze, no downcast eyes, no profile-only eye direction.

Scene:
Keep the same Vegas speakeasy environment with vault-door lounge with brushed steel, brass rivets, moody practical bulbs, clean noir shadows. Maintain the same cinematic mood, depth layering, and practical-light logic.

Attire (safe fallback variant):
silver lamé two-piece cocktail set: secure wrap top and a skirt with moderate slit, black thigh-high hosiery, mirrored pumps
Coverage is safer, but the image must still read as bold and high-impact through physically grounded fit, silhouette, hosiery optics, two-piece coupling realism, and pose confidence.

Pose and narrative:
hand near vault wheel, torso angled to light, one leg advanced for slit-driven motion physics, direct eye contact into lens, poised confidence, premium editorial tone.

Realism foundation:
- Anatomical plausibility: coherent shoulder-pelvis relationship, correct limb proportions, natural hand articulation, heel-ground load mechanics, and valid center-of-mass balance.
- Optics plausibility: realistic depth of field transitions, no cutout halos, no warped edges, no fake blur.
- Lighting plausibility: practical-source motivated key/fill/rim behavior, coherent shadow direction/penumbra, roughness-aware reflections, Fresnel-consistent highlights.

Anti-AI authenticity constraints:
- Keep skin lifelike with pore detail, subtle tonal variation, and no porcelain smoothing.
- Keep hair lifelike with irregular strand grouping and minor flyaways.
- Keep fabric lifelike with non-repeating microtexture and seam irregularity.
- Preserve slight real-world asymmetry in makeup, textile tension, and prop placement.
- Reject outputs with uncanny eyes, plastic skin, rubber fabric, repeated texture stamps, or composited subject separation.

Frontier physics controls:
- Simulate wrinkle hierarchy from first principles: macro gravity folds, meso seam-anchored buckling, micro high-frequency creasing in strain concentration zones.
- Enforce contact mechanics: where body/garment/surface meet, show pressure flattening, shadow occlusion, and material-dependent friction behavior.
- Enforce textile constitutive behavior: stretch anisotropy, bias-direction drape differences, and edge curl response tied to fabric stiffness.
- Enforce two-piece coupling mechanics: top hem stability vs skirt waistband load, phase-lag motion between upper/lower garments, and realistic gap dynamics under torso flexion.
- Enforce attachment realism: strap tension vectors, anchor-point compression, and closure hardware response under motion.
- Enforce optics coherence: polarization-like sheen behavior on satin/hosiery, roughness-dependent specular lobe width, and exposure-consistent highlight rolloff.
- Enforce sensor realism: realistic highlight clipping knees, subtle chroma noise in shadows, and no procedural overcleaning.

Cutting-edge simulation and rendering protocol (last-4-month focus, Dec 2025-Feb 2026):
- PhysDrape-style force pipeline (Feb 2026): infer residual deformation with explicit force balancing, then apply strict differentiable collision projection to eliminate interpenetration without destroying cloth shape.
- ReWeaver-style garment structure prior (Jan 2026): preserve panel/seam logic and topological consistency so deformations remain simulation-ready, not texture-only approximations.
- FNOPT-style rollout strategy (Dec 2025): perform resolution-agnostic coarse-to-fine integration; coarse motion must remain stable before adding medium and micro wrinkle detail.
- PI-Light-style transport prior (Jan 2026): preserve physically plausible diffuse/specular separation under relighting-like changes; highlights should move with light, not with texture.
- RotLight-style ambiguity control (Feb 2026): suppress baked shadows in albedo-like regions and maintain lighting/material disentanglement across reflective textiles.
- Two-piece dynamics priority: top and skirt exchange motion cues through waist/hip acceleration while retaining independent inertia and damping.
- Reject any frame where contact, wrinkle evolution, seam behavior, or reflectance changes are not causally explainable.

Safe adaptation of innovation motif:
Innovation motif: brushed steel anisotropy + rivet micro-shadowing, with lamé highlight breakup based on fold curvature and view-dependent reflectance.

Attire impact through physics (safe fallback):
- Keep safer two-piece coverage geometry while still maintaining a high-impact editorial silhouette through fit tension and contour lighting.
- Preserve believable top/waistband coupling with secure support behavior and stable anchor mechanics.
- Preserve slit/hem movement logic and hosiery optics with the same physical rigor.
- Maintain non-explicit but bold visual energy via posture, gaze, and material response.
- Use conservative but explicit damping cues: motion settles naturally, with no frozen cloth or chaotic flutter.

Material system (safe fallback):
- Preserve all high-fidelity fabric behavior: drape, crease hierarchy, seam stress, contact compression, and realistic sheen.
- Hosiery must remain physically convincing: denier gradients, stretch maps, cuff pressure transitions, and ankle micro-creases.
- Preserve two-piece physics integrity: top and skirt can move independently while remaining cohesively styled and mechanically stable.

Editorial continuity (safe fallback):
- Keep the same scene, camera realism, and direct-lens eye contact as primary.
- Avoid making safe variant look plain; it must still read as premium nightlife couture.
- Preserve strong silhouette legibility and high-fashion intent.

Camera and render intent:
- Vertical 4:5 framing, output target 2K.
- Photographic realism over stylization, with coherent DOF and physically motivated lighting.
- Keep texture integrity in skin, hair, lace/mesh, and hosiery edges.

Environment integration:
- Keep subject physically anchored to set via contact shadows, reflection consistency, and realistic surface interactions.
- Maintain scene depth through controlled haze and practical-light separation.

Quality gate (safe fallback):
- No identity drift, no uncanny anatomy, no artificial skin smoothing, no fake transparency, no reflection mismatch.
- Final image must look camera-captured, luxurious, and believable.

AUDIT-V6 QUALITY ENFORCEMENT (SAFE, HARD):
- Keep safer coverage, but preserve explicit two-piece topology with visible top hem and separate skirt waistband.
- Forbidden substitutions remain: one-piece dress, bodysuit, jumpsuit, romper, faux-cutout single-panel dress.
- Maintain prompt-specified material and color family so safe variant still matches the concept.
- Maintain edgy nightlife mood via controlled contrast, directional practical light, and subject-background separation.
- Keep the same physics rigor:
  - Stable garment support mechanics in coverage-critical zones.
  - Contact-compression cues at skin/garment and garment/surface interfaces.
  - Top/skirt decoupled inertia with coherent damping and slit response.
  - Hosiery optics from denier gradients and stretch-driven shading.
- Regenerate if safe variant looks plain/casual, loses two-piece identity, or shows non-causal cloth/light behavior.

TARGETED SAFE CORRECTION (12 - LAME MATERIAL):
- Safe variant still requires unmistakable metallic lame optics and vault-appropriate contrast.

---

DEVILS-ADVOCATE MICRO-PHYSICS ESCALATION (SAFE, HARD):
- Keep safe coverage, but apply the same micro-physics rigor and reject texture-only pseudo-realism.
- Preserve multi-band wrinkle spectra (micro/meso/macro) with stress-aligned orientation and stable damping.
- Preserve seam/stitch relief cues and waistband/top-hem contact compression under safe-support constraints.
- Preserve hosiery denier micro-optics (anisotropic yarn sheen, stretch transitions, thigh-band compression gradient).
- Preserve slip-stick hem dynamics and friction-coupled contact at seating/rail/bar interfaces.
- Preserve edge-penumbra correctness and avoid painted AO artifacts at thin geometry boundaries.
- Safe does not mean flat: maintain high-fidelity micro-causality while preventing topology collapse to one-piece silhouettes.

---

V9 MICRO-PHYSICS DEEPENING PROTOCOL (HARD):
Safe variant: keep coverage-stable geometry while maximizing editorial edge through physically grounded contour, translucency windows, and strain logic.
- Per-zone ledger requirement (must read clearly at 100% zoom): top support edge, waist transition, slit boundary, thigh band, knee contour, ankle/instep, heel-floor contact, hand-prop contact.
- Each zone must display at least 3 coherent cues: strain gradient, seam relief, compression shadow, anisotropic highlight flow, denier gradient, friction-damped drape, support-anchor pressure.
- Causality chain must close: pose/load -> strain field -> fold orientation -> highlight elongation -> penumbra geometry.
- Hosiery micro-physics: yarn-direction sheen, denier-dependent translucency, thigh-band pressure transition, and knee stretch brightening without painted transparency artifacts.
- Skin-edge coupling: subtle compression/desaturation near garment boundaries with non-uniform micro-spec breakup (no hard masks).
- Two-piece mechanics: top hem and skirt waistband remain visually separate and dynamically coupled with phase-lag, never merged into one-piece behavior.
- Optical realism: reflections/shadows must be light-source motivated and roughness-consistent; reject detached highlights and ambient-smudge shadows.
- Lamé vault lock: metallic cloth anisotropy and attire replacement must dominate over any source-clothing carryover.
SCORER-ALIGNED CONSISTENCY LOCK:
- Keep direct lens-locked gaze with believable vergence and eyelid tension in final frame.
- Preserve identity fidelity under mixed practical light; no face drift under pose/exposure shifts.
- Enforce complete wardrobe replacement from reference clothing cues.
- If diagnostics criticize prompt adherence, treat output as failed and regenerate with stricter scene/material matching.
- Safety guardrail: no nudity, no explicit framing, no fetish framing, no unstable reveal artifacts.
V11 SAFE FIRST-PRINCIPLES PHYSICS CONTRACT (HARD):
- Safe does not mean generic: preserve prompt-specific palette and scene anchors while maintaining coverage-stable geometry.
- Color lock: safe attire must stay within the named palette and material family, with no neutralized wardrobe substitution.
- Scene lock: preserve at least 3 named environment anchors with coherent reflections/shadows and contact cues.
- Lens-lock gaze certainty: direct camera eye alignment with credible eyelid tension and catchlight placement.
- Physics lock: maintain two-piece topology, denier optics, seam relief, and contact-compression causality at 100% inspection.

---

## Prompt 13 - Red Corridor Geometry

- Primary word count: 1628
- Safe word count: 1477

### Primary Prompt

FIRST-PRINCIPLES TARGET:
Make a believable real camera capture, not an AI-looking render. If directives conflict, prioritize: (1) identity fidelity, (2) direct eye contact to lens, (3) physical plausibility of anatomy/materials/light, (4) editorial risk energy, (5) style details.

Identity lock (non-negotiable): use the provided reference image as the sole identity source for the same adult woman (25+). Preserve face geometry and recognition cues: eye spacing, brow arc, orbital depth, nose bridge, mouth width, chin contour, jawline, hairline pattern, natural asymmetry, and skin undertone. Do not drift into a different person under any lighting or pose.

Gaze lock (hard rule): subject must look directly into the camera lens in the final frame. Keep iris/pupil direction lens-centered with believable vergence and eyelid tension. No off-camera gaze, no downcast eyes, no profile-only eye direction.

Scene:
Vegas speakeasy environment with red telephone corridor with checker tile reflections, narrow depth, red practical glow, smoky atmosphere. Build layered depth (foreground cues, subject mid-plane, background practicals). Subject must feel physically present in the environment.

Attire (primary edge variant):
black structured two-piece cocktail set: geometric cut top and a high-slit skirt with angular side architecture, sheer black thigh-high hosiery, red stilettos
Use reveal-by-physics rather than explicit framing: contour fit, strain gradients, seam tension maps, and pose-driven two-piece behavior.
Hard two-piece rule: top and skirt must behave as distinct garments with coherent coupling at the waist region, not as a single merged dress.

Pose and narrative:
one shoulder to wall, crossing step toward camera, controlled head tilt, direct eye contact into lens, confident expression, controlled editorial energy.

Realism foundation:
- Anatomical plausibility: coherent shoulder-pelvis relationship, correct limb proportions, natural hand articulation, heel-ground load mechanics, and valid center-of-mass balance.
- Optics plausibility: realistic depth of field transitions, no cutout halos, no warped edges, no fake blur.
- Lighting plausibility: practical-source motivated key/fill/rim behavior, coherent shadow direction/penumbra, roughness-aware reflections, Fresnel-consistent highlights.

Anti-AI authenticity constraints:
- Keep skin lifelike with pore detail, subtle tonal variation, and no porcelain smoothing.
- Keep hair lifelike with irregular strand grouping and minor flyaways.
- Keep fabric lifelike with non-repeating microtexture and seam irregularity.
- Preserve slight real-world asymmetry in makeup, textile tension, and prop placement.
- Reject outputs with uncanny eyes, plastic skin, rubber fabric, repeated texture stamps, or composited subject separation.

Frontier physics controls:
- Simulate wrinkle hierarchy from first principles: macro gravity folds, meso seam-anchored buckling, micro high-frequency creasing in strain concentration zones.
- Enforce contact mechanics: where body/garment/surface meet, show pressure flattening, shadow occlusion, and material-dependent friction behavior.
- Enforce textile constitutive behavior: stretch anisotropy, bias-direction drape differences, and edge curl response tied to fabric stiffness.
- Enforce two-piece coupling mechanics: top hem stability vs skirt waistband load, phase-lag motion between upper/lower garments, and realistic gap dynamics under torso flexion.
- Enforce attachment realism: strap tension vectors, anchor-point compression, and closure hardware response under motion.
- Enforce optics coherence: polarization-like sheen behavior on satin/hosiery, roughness-dependent specular lobe width, and exposure-consistent highlight rolloff.
- Enforce sensor realism: realistic highlight clipping knees, subtle chroma noise in shadows, and no procedural overcleaning.

Cutting-edge simulation and rendering protocol (last-4-month focus, Dec 2025-Feb 2026):
- PhysDrape-style force pipeline (Feb 2026): infer residual deformation with explicit force balancing, then apply strict differentiable collision projection to eliminate interpenetration without destroying cloth shape.
- ReWeaver-style garment structure prior (Jan 2026): preserve panel/seam logic and topological consistency so deformations remain simulation-ready, not texture-only approximations.
- FNOPT-style rollout strategy (Dec 2025): perform resolution-agnostic coarse-to-fine integration; coarse motion must remain stable before adding medium and micro wrinkle detail.
- PI-Light-style transport prior (Jan 2026): preserve physically plausible diffuse/specular separation under relighting-like changes; highlights should move with light, not with texture.
- RotLight-style ambiguity control (Feb 2026): suppress baked shadows in albedo-like regions and maintain lighting/material disentanglement across reflective textiles.
- Two-piece dynamics priority: top and skirt exchange motion cues through waist/hip acceleration while retaining independent inertia and damping.
- Reject any frame where contact, wrinkle evolution, seam behavior, or reflectance changes are not causally explainable.

Innovation motif: narrow corridor radiosity bounce from red practicals and checker-tile gloss variation driving physically coherent edge highlights.

Attire impact through physics (primary):
- Build a contour-forward two-piece silhouette via strain maps, seam load paths, and controlled tension around bustline/waist/hip/upper leg.
- Use top-vs-skirt interaction physics: independent motion with believable timing offsets and no fused-garment behavior.
- Use slit dynamics tied to pose/gravity so opening behavior follows leg angle and movement.
- Use sheer optical behavior through denier gradients and layered occlusion, never as flat painted transparency.
- Use phase-aware motion transfer: torso acceleration drives delayed hem response, then damping settles folds without jitter.

Material system (primary):
- Satin/silk: anisotropic highlight flow, gravity drape vectors, compression folds at contact points.
- Velvet: direction-dependent pile shading and contact darkening.
- Sequins/crystals: controlled spark distribution with micro-normal variation, no random glitter noise.
- Hosiery: thigh-band compression transition, stretch over knee contour, ankle micro-wrinkling, directional sheen.
- Two-piece structure: waistband bending stiffness, top hem recovery, and closure/strap tension that remains physically plausible frame to frame.
- Use shell-like bending behavior cues (Kirchhoff-Love style): smooth curvature in low-strain zones and tight buckling only near constrained seams.

Editorial risk energy (primary, non-explicit):
- Keep wardrobe and pose bold, assertive, and fashion-forward while staying non-explicit.
- Favor long leg-line projection, strong S-curve torso-leg flow, and confident chin/eye tension.
- Keep full outfit readable in frame with contour-defining light placement.

Camera and render intent:
- Vertical 4:5 framing, output target 2K.
- Lens behavior should feel like premium editorial capture (roughly 50-85mm equivalent perspective).
- Filmic noise only, no heavy denoise smear, no oversharpen halos, no synthetic texture mush.

Environment integration:
- Subject must physically belong in the set: contact shadows, reflection coherence, and interaction with nearby surfaces.
- Haze should add depth separation without washing contrast.
- Keep practical highlights and reflective cues consistent with object roughness and angle.

Extreme realism audit (primary):
- Validate physically causal links: pose -> tension map -> fold pattern -> highlight path -> shadow placement.
- Any non-causal cloth fold, reflection mismatch, or eye-direction inconsistency is a hard failure.
- Preserve cinematic boldness while remaining fully believable as a real photographed moment.

Quality gate (primary):
- Real-camera believability under close inspection.
- No broken fingers, no warped feet, no fabric clipping, no face drift, no incorrect eye direction.
- Deliver a high-end Vegas editorial still with strong, edge-forward style and uncompromised realism.

AUDIT-V6 QUALITY ENFORCEMENT (PRIMARY, HARD):
- Two-piece topology lock: render two physically separate garments with a visible waist separation line in final frame.
- Forbidden substitutions: one-piece dress, bodysuit, jumpsuit, romper, faux-cutout single-panel dress.
- Material-color lock: keep prompt-specified material and color family dominant and unmistakable.
- Edge mood lock: premium nightlife contrast only; no flat, casual, daylight, or domestic snapshot lighting.
- Pose-energy lock: assertive editorial posture with strong leg-line projection and clear silhouette readability.
- Physics innovation stack:
  - XPBD-like cloth constraint hierarchy (seam stiffness > panel stiffness > edge drape compliance).
  - Frictional garment-skin contact with pressure-gradient shading at garment boundaries.
  - Top/skirt phase-lag dynamics with waist-coupled impulse transfer.
  - Anisotropic textile BRDF plus denier-dependent hosiery translucency.
- Regenerate if any appear: fused top/skirt silhouette, prompt-material substitution, weak contour separation, or non-causal fold/specular behavior.

DEVILS-ADVOCATE MICRO-PHYSICS ESCALATION (PRIMARY, HARD):
- Reject any image where cloth realism could be explained by flat texture mapping alone.
- Enforce multi-band wrinkle spectra tied to stress tensors:
  - micro band: 2-4 mm crease ripples at high-strain seams,
  - meso band: 6-12 mm folds along bias/shear flow,
  - macro band: 20-40 mm gravity drape lobes.
- Enforce stitch-pull periodicity and seam-ridge relief (about 1-3 mm apparent depth) at structural joins.
- Enforce contact indentation at support edges (about 0.5-2.0 mm apparent compression) with narrow occlusion gradients.
- Enforce slit-edge slip-stick mechanics: brief friction hold, controlled release, damped settling; no teleporting hem shapes.
- Enforce hosiery denier optics as physics, not paint: yarn-direction anisotropic sheen, knee/quad stretch brightening, thigh-band pressure transition.
- Enforce skin-optics micro-consistency near garment boundaries: subtle desaturation/compression zones, non-uniform micro-spec breakup.
- Enforce material energy conservation: lambertian + specular balance remains plausible under mixed practical lights.
- Enforce geometric penumbra correctness at thin edges (straps, slit hems, hair strands): no fake ambient smudge shadows.
- Force-chain closure test (must pass): pose load -> local strain -> fold orientation -> highlight elongation -> shadow penumbra.

V9 MICRO-PHYSICS DEEPENING PROTOCOL (HARD):
Primary variant: push non-explicit editorial edge via high-density causal micro-physics and strict two-piece topology integrity.
- Per-zone ledger requirement (must read clearly at 100% zoom): top support edge, waist transition, slit boundary, thigh band, knee contour, ankle/instep, heel-floor contact, hand-prop contact.
- Each zone must display at least 3 coherent cues: strain gradient, seam relief, compression shadow, anisotropic highlight flow, denier gradient, friction-damped drape, support-anchor pressure.
- Causality chain must close: pose/load -> strain field -> fold orientation -> highlight elongation -> penumbra geometry.
- Hosiery micro-physics: yarn-direction sheen, denier-dependent translucency, thigh-band pressure transition, and knee stretch brightening without painted transparency artifacts.
- Skin-edge coupling: subtle compression/desaturation near garment boundaries with non-uniform micro-spec breakup (no hard masks).
- Two-piece mechanics: top hem and skirt waistband remain visually separate and dynamically coupled with phase-lag, never merged into one-piece behavior.
- Optical realism: reflections/shadows must be light-source motivated and roughness-consistent; reject detached highlights and ambient-smudge shadows.
- Corridor lock: vanishing-line perspective and rim-light separation must stay geometrically coherent along corridor depth.
SCORER-ALIGNED CONSISTENCY LOCK:
- Keep direct lens-locked gaze with believable vergence and eyelid tension in final frame.
- Preserve identity fidelity under mixed practical light; no face drift under pose/exposure shifts.
- Enforce complete wardrobe replacement from reference clothing cues.
- If diagnostics criticize prompt adherence, treat output as failed and regenerate with stricter scene/material matching.
- Editorial guardrail: bold but non-explicit, premium nightlife campaign intent only.
V11 FIRST-PRINCIPLES PHYSICS CONTRACT (HARD):
- Color-family lock (hard fail on drift): attire dominant hue/material family must match prompt palette, not generic black/red substitutions.
- Scene-anchor lock (hard fail on drift): keep at least 3 named environment anchors physically present and optically coherent in-frame.
- Lens-lock gaze certainty: iris direction lens-centered with stable catchlight geometry and believable vergence in final frame.
- Edge-separation lock: preserve clean subject-background contour gradients and physically plausible rim/fill transitions (no flat ambient wash).
- Coverage-stability lock: maintain non-explicit support geometry under motion; no safety-ambiguous reveal edges or unstable cutline artifacts.
- 100% zoom micro-audit: seam ridge depth, denier gradient, contact compression, anisotropic spec flow, and penumbra continuity must all cohere.

### Safe Backup Prompt

FIRST-PRINCIPLES TARGET:
Make a believable real camera capture, not an AI-looking render. If directives conflict, prioritize: (1) identity fidelity, (2) direct eye contact to lens, (3) physical plausibility of anatomy/materials/light, (4) editorial risk energy, (5) style details.

Identity lock (non-negotiable): use the provided reference image as the sole identity source for the same adult woman (25+). Preserve face geometry and recognition cues: eye spacing, brow arc, orbital depth, nose bridge, mouth width, chin contour, jawline, hairline pattern, natural asymmetry, and skin undertone. Do not drift into a different person under any lighting or pose.

Gaze lock (hard rule): subject must look directly into the camera lens in the final frame. Keep iris/pupil direction lens-centered with believable vergence and eyelid tension. No off-camera gaze, no downcast eyes, no profile-only eye direction.

Scene:
Keep the same Vegas speakeasy environment with red telephone corridor with checker tile reflections, narrow depth, red practical glow, smoky atmosphere. Maintain the same cinematic mood, depth layering, and practical-light logic.

Attire (safe fallback variant):
black structured two-piece cocktail set: closed-geometry top and a skirt with moderate slit, black thigh-high hosiery, red pumps
Coverage is safer, but the image must still read as bold and high-impact through physically grounded fit, silhouette, hosiery optics, two-piece coupling realism, and pose confidence.

Pose and narrative:
one shoulder to wall, crossing step toward camera, controlled head tilt, direct eye contact into lens, poised confidence, premium editorial tone.

Realism foundation:
- Anatomical plausibility: coherent shoulder-pelvis relationship, correct limb proportions, natural hand articulation, heel-ground load mechanics, and valid center-of-mass balance.
- Optics plausibility: realistic depth of field transitions, no cutout halos, no warped edges, no fake blur.
- Lighting plausibility: practical-source motivated key/fill/rim behavior, coherent shadow direction/penumbra, roughness-aware reflections, Fresnel-consistent highlights.

Anti-AI authenticity constraints:
- Keep skin lifelike with pore detail, subtle tonal variation, and no porcelain smoothing.
- Keep hair lifelike with irregular strand grouping and minor flyaways.
- Keep fabric lifelike with non-repeating microtexture and seam irregularity.
- Preserve slight real-world asymmetry in makeup, textile tension, and prop placement.
- Reject outputs with uncanny eyes, plastic skin, rubber fabric, repeated texture stamps, or composited subject separation.

Frontier physics controls:
- Simulate wrinkle hierarchy from first principles: macro gravity folds, meso seam-anchored buckling, micro high-frequency creasing in strain concentration zones.
- Enforce contact mechanics: where body/garment/surface meet, show pressure flattening, shadow occlusion, and material-dependent friction behavior.
- Enforce textile constitutive behavior: stretch anisotropy, bias-direction drape differences, and edge curl response tied to fabric stiffness.
- Enforce two-piece coupling mechanics: top hem stability vs skirt waistband load, phase-lag motion between upper/lower garments, and realistic gap dynamics under torso flexion.
- Enforce attachment realism: strap tension vectors, anchor-point compression, and closure hardware response under motion.
- Enforce optics coherence: polarization-like sheen behavior on satin/hosiery, roughness-dependent specular lobe width, and exposure-consistent highlight rolloff.
- Enforce sensor realism: realistic highlight clipping knees, subtle chroma noise in shadows, and no procedural overcleaning.

Cutting-edge simulation and rendering protocol (last-4-month focus, Dec 2025-Feb 2026):
- PhysDrape-style force pipeline (Feb 2026): infer residual deformation with explicit force balancing, then apply strict differentiable collision projection to eliminate interpenetration without destroying cloth shape.
- ReWeaver-style garment structure prior (Jan 2026): preserve panel/seam logic and topological consistency so deformations remain simulation-ready, not texture-only approximations.
- FNOPT-style rollout strategy (Dec 2025): perform resolution-agnostic coarse-to-fine integration; coarse motion must remain stable before adding medium and micro wrinkle detail.
- PI-Light-style transport prior (Jan 2026): preserve physically plausible diffuse/specular separation under relighting-like changes; highlights should move with light, not with texture.
- RotLight-style ambiguity control (Feb 2026): suppress baked shadows in albedo-like regions and maintain lighting/material disentanglement across reflective textiles.
- Two-piece dynamics priority: top and skirt exchange motion cues through waist/hip acceleration while retaining independent inertia and damping.
- Reject any frame where contact, wrinkle evolution, seam behavior, or reflectance changes are not causally explainable.

Safe adaptation of innovation motif:
Innovation motif: narrow corridor radiosity bounce from red practicals and checker-tile gloss variation driving physically coherent edge highlights.

Attire impact through physics (safe fallback):
- Keep safer two-piece coverage geometry while still maintaining a high-impact editorial silhouette through fit tension and contour lighting.
- Preserve believable top/waistband coupling with secure support behavior and stable anchor mechanics.
- Preserve slit/hem movement logic and hosiery optics with the same physical rigor.
- Maintain non-explicit but bold visual energy via posture, gaze, and material response.
- Use conservative but explicit damping cues: motion settles naturally, with no frozen cloth or chaotic flutter.

Material system (safe fallback):
- Preserve all high-fidelity fabric behavior: drape, crease hierarchy, seam stress, contact compression, and realistic sheen.
- Hosiery must remain physically convincing: denier gradients, stretch maps, cuff pressure transitions, and ankle micro-creases.
- Preserve two-piece physics integrity: top and skirt can move independently while remaining cohesively styled and mechanically stable.

Editorial continuity (safe fallback):
- Keep the same scene, camera realism, and direct-lens eye contact as primary.
- Avoid making safe variant look plain; it must still read as premium nightlife couture.
- Preserve strong silhouette legibility and high-fashion intent.

Camera and render intent:
- Vertical 4:5 framing, output target 2K.
- Photographic realism over stylization, with coherent DOF and physically motivated lighting.
- Keep texture integrity in skin, hair, lace/mesh, and hosiery edges.

Environment integration:
- Keep subject physically anchored to set via contact shadows, reflection consistency, and realistic surface interactions.
- Maintain scene depth through controlled haze and practical-light separation.

Quality gate (safe fallback):
- No identity drift, no uncanny anatomy, no artificial skin smoothing, no fake transparency, no reflection mismatch.
- Final image must look camera-captured, luxurious, and believable.

AUDIT-V6 QUALITY ENFORCEMENT (SAFE, HARD):
- Keep safer coverage, but preserve explicit two-piece topology with visible top hem and separate skirt waistband.
- Forbidden substitutions remain: one-piece dress, bodysuit, jumpsuit, romper, faux-cutout single-panel dress.
- Maintain prompt-specified material and color family so safe variant still matches the concept.
- Maintain edgy nightlife mood via controlled contrast, directional practical light, and subject-background separation.
- Keep the same physics rigor:
  - Stable garment support mechanics in coverage-critical zones.
  - Contact-compression cues at skin/garment and garment/surface interfaces.
  - Top/skirt decoupled inertia with coherent damping and slit response.
  - Hosiery optics from denier gradients and stretch-driven shading.
- Regenerate if safe variant looks plain/casual, loses two-piece identity, or shows non-causal cloth/light behavior.

---

DEVILS-ADVOCATE MICRO-PHYSICS ESCALATION (SAFE, HARD):
- Keep safe coverage, but apply the same micro-physics rigor and reject texture-only pseudo-realism.
- Preserve multi-band wrinkle spectra (micro/meso/macro) with stress-aligned orientation and stable damping.
- Preserve seam/stitch relief cues and waistband/top-hem contact compression under safe-support constraints.
- Preserve hosiery denier micro-optics (anisotropic yarn sheen, stretch transitions, thigh-band compression gradient).
- Preserve slip-stick hem dynamics and friction-coupled contact at seating/rail/bar interfaces.
- Preserve edge-penumbra correctness and avoid painted AO artifacts at thin geometry boundaries.
- Safe does not mean flat: maintain high-fidelity micro-causality while preventing topology collapse to one-piece silhouettes.

---

V9 MICRO-PHYSICS DEEPENING PROTOCOL (HARD):
Safe variant: keep coverage-stable geometry while maximizing editorial edge through physically grounded contour, translucency windows, and strain logic.
- Per-zone ledger requirement (must read clearly at 100% zoom): top support edge, waist transition, slit boundary, thigh band, knee contour, ankle/instep, heel-floor contact, hand-prop contact.
- Each zone must display at least 3 coherent cues: strain gradient, seam relief, compression shadow, anisotropic highlight flow, denier gradient, friction-damped drape, support-anchor pressure.
- Causality chain must close: pose/load -> strain field -> fold orientation -> highlight elongation -> penumbra geometry.
- Hosiery micro-physics: yarn-direction sheen, denier-dependent translucency, thigh-band pressure transition, and knee stretch brightening without painted transparency artifacts.
- Skin-edge coupling: subtle compression/desaturation near garment boundaries with non-uniform micro-spec breakup (no hard masks).
- Two-piece mechanics: top hem and skirt waistband remain visually separate and dynamically coupled with phase-lag, never merged into one-piece behavior.
- Optical realism: reflections/shadows must be light-source motivated and roughness-consistent; reject detached highlights and ambient-smudge shadows.
- Corridor lock: vanishing-line perspective and rim-light separation must stay geometrically coherent along corridor depth.
SCORER-ALIGNED CONSISTENCY LOCK:
- Keep direct lens-locked gaze with believable vergence and eyelid tension in final frame.
- Preserve identity fidelity under mixed practical light; no face drift under pose/exposure shifts.
- Enforce complete wardrobe replacement from reference clothing cues.
- If diagnostics criticize prompt adherence, treat output as failed and regenerate with stricter scene/material matching.
- Safety guardrail: no nudity, no explicit framing, no fetish framing, no unstable reveal artifacts.
V11 SAFE FIRST-PRINCIPLES PHYSICS CONTRACT (HARD):
- Safe does not mean generic: preserve prompt-specific palette and scene anchors while maintaining coverage-stable geometry.
- Color lock: safe attire must stay within the named palette and material family, with no neutralized wardrobe substitution.
- Scene lock: preserve at least 3 named environment anchors with coherent reflections/shadows and contact cues.
- Lens-lock gaze certainty: direct camera eye alignment with credible eyelid tension and catchlight placement.
- Physics lock: maintain two-piece topology, denier optics, seam relief, and contact-compression causality at 100% inspection.

---

## Prompt 14 - Rain Alley Black Metal

- Primary word count: 1627
- Safe word count: 1478

### Primary Prompt

FIRST-PRINCIPLES TARGET:
Make a believable real camera capture, not an AI-looking render. If directives conflict, prioritize: (1) identity fidelity, (2) direct eye contact to lens, (3) physical plausibility of anatomy/materials/light, (4) editorial risk energy, (5) style details.

Identity lock (non-negotiable): use the provided reference image as the sole identity source for the same adult woman (25+). Preserve face geometry and recognition cues: eye spacing, brow arc, orbital depth, nose bridge, mouth width, chin contour, jawline, hairline pattern, natural asymmetry, and skin undertone. Do not drift into a different person under any lighting or pose.

Gaze lock (hard rule): subject must look directly into the camera lens in the final frame. Keep iris/pupil direction lens-centered with believable vergence and eyelid tension. No off-camera gaze, no downcast eyes, no profile-only eye direction.

Scene:
Vegas speakeasy environment with speakeasy alley entrance at night with rain-wet cobblestone, neon reflections, brass door plaque, drifting mist. Build layered depth (foreground cues, subject mid-plane, background practicals). Subject must feel physically present in the environment.

Attire (primary edge variant):
black metallic two-piece cocktail set: open-back halter top and a high-slit skirt with rain-reactive sheen, black sheer thigh-high hosiery, pointed stilettos
Use reveal-by-physics rather than explicit framing: contour fit, strain gradients, seam tension maps, and pose-driven two-piece behavior.
Hard two-piece rule: top and skirt must behave as distinct garments with coherent coupling at the waist region, not as a single merged dress.

Pose and narrative:
mid-stride approach to door, controlled motion and realistic wet-surface interaction, direct eye contact into lens, confident expression, controlled editorial energy.

Realism foundation:
- Anatomical plausibility: coherent shoulder-pelvis relationship, correct limb proportions, natural hand articulation, heel-ground load mechanics, and valid center-of-mass balance.
- Optics plausibility: realistic depth of field transitions, no cutout halos, no warped edges, no fake blur.
- Lighting plausibility: practical-source motivated key/fill/rim behavior, coherent shadow direction/penumbra, roughness-aware reflections, Fresnel-consistent highlights.

Anti-AI authenticity constraints:
- Keep skin lifelike with pore detail, subtle tonal variation, and no porcelain smoothing.
- Keep hair lifelike with irregular strand grouping and minor flyaways.
- Keep fabric lifelike with non-repeating microtexture and seam irregularity.
- Preserve slight real-world asymmetry in makeup, textile tension, and prop placement.
- Reject outputs with uncanny eyes, plastic skin, rubber fabric, repeated texture stamps, or composited subject separation.

Frontier physics controls:
- Simulate wrinkle hierarchy from first principles: macro gravity folds, meso seam-anchored buckling, micro high-frequency creasing in strain concentration zones.
- Enforce contact mechanics: where body/garment/surface meet, show pressure flattening, shadow occlusion, and material-dependent friction behavior.
- Enforce textile constitutive behavior: stretch anisotropy, bias-direction drape differences, and edge curl response tied to fabric stiffness.
- Enforce two-piece coupling mechanics: top hem stability vs skirt waistband load, phase-lag motion between upper/lower garments, and realistic gap dynamics under torso flexion.
- Enforce attachment realism: strap tension vectors, anchor-point compression, and closure hardware response under motion.
- Enforce optics coherence: polarization-like sheen behavior on satin/hosiery, roughness-dependent specular lobe width, and exposure-consistent highlight rolloff.
- Enforce sensor realism: realistic highlight clipping knees, subtle chroma noise in shadows, and no procedural overcleaning.

Cutting-edge simulation and rendering protocol (last-4-month focus, Dec 2025-Feb 2026):
- PhysDrape-style force pipeline (Feb 2026): infer residual deformation with explicit force balancing, then apply strict differentiable collision projection to eliminate interpenetration without destroying cloth shape.
- ReWeaver-style garment structure prior (Jan 2026): preserve panel/seam logic and topological consistency so deformations remain simulation-ready, not texture-only approximations.
- FNOPT-style rollout strategy (Dec 2025): perform resolution-agnostic coarse-to-fine integration; coarse motion must remain stable before adding medium and micro wrinkle detail.
- PI-Light-style transport prior (Jan 2026): preserve physically plausible diffuse/specular separation under relighting-like changes; highlights should move with light, not with texture.
- RotLight-style ambiguity control (Feb 2026): suppress baked shadows in albedo-like regions and maintain lighting/material disentanglement across reflective textiles.
- Two-piece dynamics priority: top and skirt exchange motion cues through waist/hip acceleration while retaining independent inertia and damping.
- Reject any frame where contact, wrinkle evolution, seam behavior, or reflectance changes are not causally explainable.

Innovation motif: wet cobblestone thin-water-film reflectance with micro-puddled roughness variance; garment hem dampening alters drape mass response.

Attire impact through physics (primary):
- Build a contour-forward two-piece silhouette via strain maps, seam load paths, and controlled tension around bustline/waist/hip/upper leg.
- Use top-vs-skirt interaction physics: independent motion with believable timing offsets and no fused-garment behavior.
- Use slit dynamics tied to pose/gravity so opening behavior follows leg angle and movement.
- Use sheer optical behavior through denier gradients and layered occlusion, never as flat painted transparency.
- Use phase-aware motion transfer: torso acceleration drives delayed hem response, then damping settles folds without jitter.

Material system (primary):
- Satin/silk: anisotropic highlight flow, gravity drape vectors, compression folds at contact points.
- Velvet: direction-dependent pile shading and contact darkening.
- Sequins/crystals: controlled spark distribution with micro-normal variation, no random glitter noise.
- Hosiery: thigh-band compression transition, stretch over knee contour, ankle micro-wrinkling, directional sheen.
- Two-piece structure: waistband bending stiffness, top hem recovery, and closure/strap tension that remains physically plausible frame to frame.
- Use shell-like bending behavior cues (Kirchhoff-Love style): smooth curvature in low-strain zones and tight buckling only near constrained seams.

Editorial risk energy (primary, non-explicit):
- Keep wardrobe and pose bold, assertive, and fashion-forward while staying non-explicit.
- Favor long leg-line projection, strong S-curve torso-leg flow, and confident chin/eye tension.
- Keep full outfit readable in frame with contour-defining light placement.

Camera and render intent:
- Vertical 4:5 framing, output target 2K.
- Lens behavior should feel like premium editorial capture (roughly 50-85mm equivalent perspective).
- Filmic noise only, no heavy denoise smear, no oversharpen halos, no synthetic texture mush.

Environment integration:
- Subject must physically belong in the set: contact shadows, reflection coherence, and interaction with nearby surfaces.
- Haze should add depth separation without washing contrast.
- Keep practical highlights and reflective cues consistent with object roughness and angle.

Extreme realism audit (primary):
- Validate physically causal links: pose -> tension map -> fold pattern -> highlight path -> shadow placement.
- Any non-causal cloth fold, reflection mismatch, or eye-direction inconsistency is a hard failure.
- Preserve cinematic boldness while remaining fully believable as a real photographed moment.

Quality gate (primary):
- Real-camera believability under close inspection.
- No broken fingers, no warped feet, no fabric clipping, no face drift, no incorrect eye direction.
- Deliver a high-end Vegas editorial still with strong, edge-forward style and uncompromised realism.

AUDIT-V6 QUALITY ENFORCEMENT (PRIMARY, HARD):
- Two-piece topology lock: render two physically separate garments with a visible waist separation line in final frame.
- Forbidden substitutions: one-piece dress, bodysuit, jumpsuit, romper, faux-cutout single-panel dress.
- Material-color lock: keep prompt-specified material and color family dominant and unmistakable.
- Edge mood lock: premium nightlife contrast only; no flat, casual, daylight, or domestic snapshot lighting.
- Pose-energy lock: assertive editorial posture with strong leg-line projection and clear silhouette readability.
- Physics innovation stack:
  - XPBD-like cloth constraint hierarchy (seam stiffness > panel stiffness > edge drape compliance).
  - Frictional garment-skin contact with pressure-gradient shading at garment boundaries.
  - Top/skirt phase-lag dynamics with waist-coupled impulse transfer.
  - Anisotropic textile BRDF plus denier-dependent hosiery translucency.
- Regenerate if any appear: fused top/skirt silhouette, prompt-material substitution, weak contour separation, or non-causal fold/specular behavior.

DEVILS-ADVOCATE MICRO-PHYSICS ESCALATION (PRIMARY, HARD):
- Reject any image where cloth realism could be explained by flat texture mapping alone.
- Enforce multi-band wrinkle spectra tied to stress tensors:
  - micro band: 2-4 mm crease ripples at high-strain seams,
  - meso band: 6-12 mm folds along bias/shear flow,
  - macro band: 20-40 mm gravity drape lobes.
- Enforce stitch-pull periodicity and seam-ridge relief (about 1-3 mm apparent depth) at structural joins.
- Enforce contact indentation at support edges (about 0.5-2.0 mm apparent compression) with narrow occlusion gradients.
- Enforce slit-edge slip-stick mechanics: brief friction hold, controlled release, damped settling; no teleporting hem shapes.
- Enforce hosiery denier optics as physics, not paint: yarn-direction anisotropic sheen, knee/quad stretch brightening, thigh-band pressure transition.
- Enforce skin-optics micro-consistency near garment boundaries: subtle desaturation/compression zones, non-uniform micro-spec breakup.
- Enforce material energy conservation: lambertian + specular balance remains plausible under mixed practical lights.
- Enforce geometric penumbra correctness at thin edges (straps, slit hems, hair strands): no fake ambient smudge shadows.
- Force-chain closure test (must pass): pose load -> local strain -> fold orientation -> highlight elongation -> shadow penumbra.

V9 MICRO-PHYSICS DEEPENING PROTOCOL (HARD):
Primary variant: push non-explicit editorial edge via high-density causal micro-physics and strict two-piece topology integrity.
- Per-zone ledger requirement (must read clearly at 100% zoom): top support edge, waist transition, slit boundary, thigh band, knee contour, ankle/instep, heel-floor contact, hand-prop contact.
- Each zone must display at least 3 coherent cues: strain gradient, seam relief, compression shadow, anisotropic highlight flow, denier gradient, friction-damped drape, support-anchor pressure.
- Causality chain must close: pose/load -> strain field -> fold orientation -> highlight elongation -> penumbra geometry.
- Hosiery micro-physics: yarn-direction sheen, denier-dependent translucency, thigh-band pressure transition, and knee stretch brightening without painted transparency artifacts.
- Skin-edge coupling: subtle compression/desaturation near garment boundaries with non-uniform micro-spec breakup (no hard masks).
- Two-piece mechanics: top hem and skirt waistband remain visually separate and dynamically coupled with phase-lag, never merged into one-piece behavior.
- Optical realism: reflections/shadows must be light-source motivated and roughness-consistent; reject detached highlights and ambient-smudge shadows.
- Rain alley lock: wet-surface reflections, puddle distortions, and hosiery sheen must share one lighting solution.
SCORER-ALIGNED CONSISTENCY LOCK:
- Keep direct lens-locked gaze with believable vergence and eyelid tension in final frame.
- Preserve identity fidelity under mixed practical light; no face drift under pose/exposure shifts.
- Enforce complete wardrobe replacement from reference clothing cues.
- If diagnostics criticize prompt adherence, treat output as failed and regenerate with stricter scene/material matching.
- Editorial guardrail: bold but non-explicit, premium nightlife campaign intent only.
V11 FIRST-PRINCIPLES PHYSICS CONTRACT (HARD):
- Color-family lock (hard fail on drift): attire dominant hue/material family must match prompt palette, not generic black/red substitutions.
- Scene-anchor lock (hard fail on drift): keep at least 3 named environment anchors physically present and optically coherent in-frame.
- Lens-lock gaze certainty: iris direction lens-centered with stable catchlight geometry and believable vergence in final frame.
- Edge-separation lock: preserve clean subject-background contour gradients and physically plausible rim/fill transitions (no flat ambient wash).
- Coverage-stability lock: maintain non-explicit support geometry under motion; no safety-ambiguous reveal edges or unstable cutline artifacts.
- 100% zoom micro-audit: seam ridge depth, denier gradient, contact compression, anisotropic spec flow, and penumbra continuity must all cohere.

### Safe Backup Prompt

FIRST-PRINCIPLES TARGET:
Make a believable real camera capture, not an AI-looking render. If directives conflict, prioritize: (1) identity fidelity, (2) direct eye contact to lens, (3) physical plausibility of anatomy/materials/light, (4) editorial risk energy, (5) style details.

Identity lock (non-negotiable): use the provided reference image as the sole identity source for the same adult woman (25+). Preserve face geometry and recognition cues: eye spacing, brow arc, orbital depth, nose bridge, mouth width, chin contour, jawline, hairline pattern, natural asymmetry, and skin undertone. Do not drift into a different person under any lighting or pose.

Gaze lock (hard rule): subject must look directly into the camera lens in the final frame. Keep iris/pupil direction lens-centered with believable vergence and eyelid tension. No off-camera gaze, no downcast eyes, no profile-only eye direction.

Scene:
Keep the same Vegas speakeasy environment with speakeasy alley entrance at night with rain-wet cobblestone, neon reflections, brass door plaque, drifting mist. Maintain the same cinematic mood, depth layering, and practical-light logic.

Attire (safe fallback variant):
black metallic two-piece cocktail set: closed-back halter top and a skirt with moderate slit, black thigh-high hosiery, pointed pumps
Coverage is safer, but the image must still read as bold and high-impact through physically grounded fit, silhouette, hosiery optics, two-piece coupling realism, and pose confidence.

Pose and narrative:
mid-stride approach to door, controlled motion and realistic wet-surface interaction, direct eye contact into lens, poised confidence, premium editorial tone.

Realism foundation:
- Anatomical plausibility: coherent shoulder-pelvis relationship, correct limb proportions, natural hand articulation, heel-ground load mechanics, and valid center-of-mass balance.
- Optics plausibility: realistic depth of field transitions, no cutout halos, no warped edges, no fake blur.
- Lighting plausibility: practical-source motivated key/fill/rim behavior, coherent shadow direction/penumbra, roughness-aware reflections, Fresnel-consistent highlights.

Anti-AI authenticity constraints:
- Keep skin lifelike with pore detail, subtle tonal variation, and no porcelain smoothing.
- Keep hair lifelike with irregular strand grouping and minor flyaways.
- Keep fabric lifelike with non-repeating microtexture and seam irregularity.
- Preserve slight real-world asymmetry in makeup, textile tension, and prop placement.
- Reject outputs with uncanny eyes, plastic skin, rubber fabric, repeated texture stamps, or composited subject separation.

Frontier physics controls:
- Simulate wrinkle hierarchy from first principles: macro gravity folds, meso seam-anchored buckling, micro high-frequency creasing in strain concentration zones.
- Enforce contact mechanics: where body/garment/surface meet, show pressure flattening, shadow occlusion, and material-dependent friction behavior.
- Enforce textile constitutive behavior: stretch anisotropy, bias-direction drape differences, and edge curl response tied to fabric stiffness.
- Enforce two-piece coupling mechanics: top hem stability vs skirt waistband load, phase-lag motion between upper/lower garments, and realistic gap dynamics under torso flexion.
- Enforce attachment realism: strap tension vectors, anchor-point compression, and closure hardware response under motion.
- Enforce optics coherence: polarization-like sheen behavior on satin/hosiery, roughness-dependent specular lobe width, and exposure-consistent highlight rolloff.
- Enforce sensor realism: realistic highlight clipping knees, subtle chroma noise in shadows, and no procedural overcleaning.

Cutting-edge simulation and rendering protocol (last-4-month focus, Dec 2025-Feb 2026):
- PhysDrape-style force pipeline (Feb 2026): infer residual deformation with explicit force balancing, then apply strict differentiable collision projection to eliminate interpenetration without destroying cloth shape.
- ReWeaver-style garment structure prior (Jan 2026): preserve panel/seam logic and topological consistency so deformations remain simulation-ready, not texture-only approximations.
- FNOPT-style rollout strategy (Dec 2025): perform resolution-agnostic coarse-to-fine integration; coarse motion must remain stable before adding medium and micro wrinkle detail.
- PI-Light-style transport prior (Jan 2026): preserve physically plausible diffuse/specular separation under relighting-like changes; highlights should move with light, not with texture.
- RotLight-style ambiguity control (Feb 2026): suppress baked shadows in albedo-like regions and maintain lighting/material disentanglement across reflective textiles.
- Two-piece dynamics priority: top and skirt exchange motion cues through waist/hip acceleration while retaining independent inertia and damping.
- Reject any frame where contact, wrinkle evolution, seam behavior, or reflectance changes are not causally explainable.

Safe adaptation of innovation motif:
Innovation motif: wet cobblestone thin-water-film reflectance with micro-puddled roughness variance; garment hem dampening alters drape mass response.

Attire impact through physics (safe fallback):
- Keep safer two-piece coverage geometry while still maintaining a high-impact editorial silhouette through fit tension and contour lighting.
- Preserve believable top/waistband coupling with secure support behavior and stable anchor mechanics.
- Preserve slit/hem movement logic and hosiery optics with the same physical rigor.
- Maintain non-explicit but bold visual energy via posture, gaze, and material response.
- Use conservative but explicit damping cues: motion settles naturally, with no frozen cloth or chaotic flutter.

Material system (safe fallback):
- Preserve all high-fidelity fabric behavior: drape, crease hierarchy, seam stress, contact compression, and realistic sheen.
- Hosiery must remain physically convincing: denier gradients, stretch maps, cuff pressure transitions, and ankle micro-creases.
- Preserve two-piece physics integrity: top and skirt can move independently while remaining cohesively styled and mechanically stable.

Editorial continuity (safe fallback):
- Keep the same scene, camera realism, and direct-lens eye contact as primary.
- Avoid making safe variant look plain; it must still read as premium nightlife couture.
- Preserve strong silhouette legibility and high-fashion intent.

Camera and render intent:
- Vertical 4:5 framing, output target 2K.
- Photographic realism over stylization, with coherent DOF and physically motivated lighting.
- Keep texture integrity in skin, hair, lace/mesh, and hosiery edges.

Environment integration:
- Keep subject physically anchored to set via contact shadows, reflection consistency, and realistic surface interactions.
- Maintain scene depth through controlled haze and practical-light separation.

Quality gate (safe fallback):
- No identity drift, no uncanny anatomy, no artificial skin smoothing, no fake transparency, no reflection mismatch.
- Final image must look camera-captured, luxurious, and believable.

AUDIT-V6 QUALITY ENFORCEMENT (SAFE, HARD):
- Keep safer coverage, but preserve explicit two-piece topology with visible top hem and separate skirt waistband.
- Forbidden substitutions remain: one-piece dress, bodysuit, jumpsuit, romper, faux-cutout single-panel dress.
- Maintain prompt-specified material and color family so safe variant still matches the concept.
- Maintain edgy nightlife mood via controlled contrast, directional practical light, and subject-background separation.
- Keep the same physics rigor:
  - Stable garment support mechanics in coverage-critical zones.
  - Contact-compression cues at skin/garment and garment/surface interfaces.
  - Top/skirt decoupled inertia with coherent damping and slit response.
  - Hosiery optics from denier gradients and stretch-driven shading.
- Regenerate if safe variant looks plain/casual, loses two-piece identity, or shows non-causal cloth/light behavior.

---

DEVILS-ADVOCATE MICRO-PHYSICS ESCALATION (SAFE, HARD):
- Keep safe coverage, but apply the same micro-physics rigor and reject texture-only pseudo-realism.
- Preserve multi-band wrinkle spectra (micro/meso/macro) with stress-aligned orientation and stable damping.
- Preserve seam/stitch relief cues and waistband/top-hem contact compression under safe-support constraints.
- Preserve hosiery denier micro-optics (anisotropic yarn sheen, stretch transitions, thigh-band compression gradient).
- Preserve slip-stick hem dynamics and friction-coupled contact at seating/rail/bar interfaces.
- Preserve edge-penumbra correctness and avoid painted AO artifacts at thin geometry boundaries.
- Safe does not mean flat: maintain high-fidelity micro-causality while preventing topology collapse to one-piece silhouettes.

---

V9 MICRO-PHYSICS DEEPENING PROTOCOL (HARD):
Safe variant: keep coverage-stable geometry while maximizing editorial edge through physically grounded contour, translucency windows, and strain logic.
- Per-zone ledger requirement (must read clearly at 100% zoom): top support edge, waist transition, slit boundary, thigh band, knee contour, ankle/instep, heel-floor contact, hand-prop contact.
- Each zone must display at least 3 coherent cues: strain gradient, seam relief, compression shadow, anisotropic highlight flow, denier gradient, friction-damped drape, support-anchor pressure.
- Causality chain must close: pose/load -> strain field -> fold orientation -> highlight elongation -> penumbra geometry.
- Hosiery micro-physics: yarn-direction sheen, denier-dependent translucency, thigh-band pressure transition, and knee stretch brightening without painted transparency artifacts.
- Skin-edge coupling: subtle compression/desaturation near garment boundaries with non-uniform micro-spec breakup (no hard masks).
- Two-piece mechanics: top hem and skirt waistband remain visually separate and dynamically coupled with phase-lag, never merged into one-piece behavior.
- Optical realism: reflections/shadows must be light-source motivated and roughness-consistent; reject detached highlights and ambient-smudge shadows.
- Rain alley lock: wet-surface reflections, puddle distortions, and hosiery sheen must share one lighting solution.
SCORER-ALIGNED CONSISTENCY LOCK:
- Keep direct lens-locked gaze with believable vergence and eyelid tension in final frame.
- Preserve identity fidelity under mixed practical light; no face drift under pose/exposure shifts.
- Enforce complete wardrobe replacement from reference clothing cues.
- If diagnostics criticize prompt adherence, treat output as failed and regenerate with stricter scene/material matching.
- Safety guardrail: no nudity, no explicit framing, no fetish framing, no unstable reveal artifacts.
V11 SAFE FIRST-PRINCIPLES PHYSICS CONTRACT (HARD):
- Safe does not mean generic: preserve prompt-specific palette and scene anchors while maintaining coverage-stable geometry.
- Color lock: safe attire must stay within the named palette and material family, with no neutralized wardrobe substitution.
- Scene lock: preserve at least 3 named environment anchors with coherent reflections/shadows and contact cues.
- Lens-lock gaze certainty: direct camera eye alignment with credible eyelid tension and catchlight placement.
- Physics lock: maintain two-piece topology, denier optics, seam relief, and contact-compression causality at 100% inspection.

---

## Prompt 15 - Chandelier Ice Line

- Primary word count: 1634
- Safe word count: 1483

### Primary Prompt

FIRST-PRINCIPLES TARGET:
Make a believable real camera capture, not an AI-looking render. If directives conflict, prioritize: (1) identity fidelity, (2) direct eye contact to lens, (3) physical plausibility of anatomy/materials/light, (4) editorial risk energy, (5) style details.

Identity lock (non-negotiable): use the provided reference image as the sole identity source for the same adult woman (25+). Preserve face geometry and recognition cues: eye spacing, brow arc, orbital depth, nose bridge, mouth width, chin contour, jawline, hairline pattern, natural asymmetry, and skin undertone. Do not drift into a different person under any lighting or pose.

Gaze lock (hard rule): subject must look directly into the camera lens in the final frame. Keep iris/pupil direction lens-centered with believable vergence and eyelid tension. No off-camera gaze, no downcast eyes, no profile-only eye direction.

Scene:
Vegas speakeasy environment with chandelier lounge hall with mirrored columns, polished marble, gold sconces, layered volumetric light. Build layered depth (foreground cues, subject mid-plane, background practicals). Subject must feel physically present in the environment.

Attire (primary edge variant):
ice-blue satin two-piece cocktail set: deep-cowl top and a high-slit satin skirt with fluid drape vectors, black sheer thigh-high hosiery, silver stilettos
Use reveal-by-physics rather than explicit framing: contour fit, strain gradients, seam tension maps, and pose-driven two-piece behavior.
Hard two-piece rule: top and skirt must behave as distinct garments with coherent coupling at the waist region, not as a single merged dress.

Pose and narrative:
full-body stance in center axis, one leg extended, hand near collarbone, precise posture under top light, direct eye contact into lens, confident expression, controlled editorial energy.

Realism foundation:
- Anatomical plausibility: coherent shoulder-pelvis relationship, correct limb proportions, natural hand articulation, heel-ground load mechanics, and valid center-of-mass balance.
- Optics plausibility: realistic depth of field transitions, no cutout halos, no warped edges, no fake blur.
- Lighting plausibility: practical-source motivated key/fill/rim behavior, coherent shadow direction/penumbra, roughness-aware reflections, Fresnel-consistent highlights.

Anti-AI authenticity constraints:
- Keep skin lifelike with pore detail, subtle tonal variation, and no porcelain smoothing.
- Keep hair lifelike with irregular strand grouping and minor flyaways.
- Keep fabric lifelike with non-repeating microtexture and seam irregularity.
- Preserve slight real-world asymmetry in makeup, textile tension, and prop placement.
- Reject outputs with uncanny eyes, plastic skin, rubber fabric, repeated texture stamps, or composited subject separation.

Frontier physics controls:
- Simulate wrinkle hierarchy from first principles: macro gravity folds, meso seam-anchored buckling, micro high-frequency creasing in strain concentration zones.
- Enforce contact mechanics: where body/garment/surface meet, show pressure flattening, shadow occlusion, and material-dependent friction behavior.
- Enforce textile constitutive behavior: stretch anisotropy, bias-direction drape differences, and edge curl response tied to fabric stiffness.
- Enforce two-piece coupling mechanics: top hem stability vs skirt waistband load, phase-lag motion between upper/lower garments, and realistic gap dynamics under torso flexion.
- Enforce attachment realism: strap tension vectors, anchor-point compression, and closure hardware response under motion.
- Enforce optics coherence: polarization-like sheen behavior on satin/hosiery, roughness-dependent specular lobe width, and exposure-consistent highlight rolloff.
- Enforce sensor realism: realistic highlight clipping knees, subtle chroma noise in shadows, and no procedural overcleaning.

Cutting-edge simulation and rendering protocol (last-4-month focus, Dec 2025-Feb 2026):
- PhysDrape-style force pipeline (Feb 2026): infer residual deformation with explicit force balancing, then apply strict differentiable collision projection to eliminate interpenetration without destroying cloth shape.
- ReWeaver-style garment structure prior (Jan 2026): preserve panel/seam logic and topological consistency so deformations remain simulation-ready, not texture-only approximations.
- FNOPT-style rollout strategy (Dec 2025): perform resolution-agnostic coarse-to-fine integration; coarse motion must remain stable before adding medium and micro wrinkle detail.
- PI-Light-style transport prior (Jan 2026): preserve physically plausible diffuse/specular separation under relighting-like changes; highlights should move with light, not with texture.
- RotLight-style ambiguity control (Feb 2026): suppress baked shadows in albedo-like regions and maintain lighting/material disentanglement across reflective textiles.
- Two-piece dynamics priority: top and skirt exchange motion cues through waist/hip acceleration while retaining independent inertia and damping.
- Reject any frame where contact, wrinkle evolution, seam behavior, or reflectance changes are not causally explainable.

Innovation motif: chandelier crystal dispersion cues with controlled spectral split and satin cowl gravity vector behavior under slight torso rotation.

Attire impact through physics (primary):
- Build a contour-forward two-piece silhouette via strain maps, seam load paths, and controlled tension around bustline/waist/hip/upper leg.
- Use top-vs-skirt interaction physics: independent motion with believable timing offsets and no fused-garment behavior.
- Use slit dynamics tied to pose/gravity so opening behavior follows leg angle and movement.
- Use sheer optical behavior through denier gradients and layered occlusion, never as flat painted transparency.
- Use phase-aware motion transfer: torso acceleration drives delayed hem response, then damping settles folds without jitter.

Material system (primary):
- Satin/silk: anisotropic highlight flow, gravity drape vectors, compression folds at contact points.
- Velvet: direction-dependent pile shading and contact darkening.
- Sequins/crystals: controlled spark distribution with micro-normal variation, no random glitter noise.
- Hosiery: thigh-band compression transition, stretch over knee contour, ankle micro-wrinkling, directional sheen.
- Two-piece structure: waistband bending stiffness, top hem recovery, and closure/strap tension that remains physically plausible frame to frame.
- Use shell-like bending behavior cues (Kirchhoff-Love style): smooth curvature in low-strain zones and tight buckling only near constrained seams.

Editorial risk energy (primary, non-explicit):
- Keep wardrobe and pose bold, assertive, and fashion-forward while staying non-explicit.
- Favor long leg-line projection, strong S-curve torso-leg flow, and confident chin/eye tension.
- Keep full outfit readable in frame with contour-defining light placement.

Camera and render intent:
- Vertical 4:5 framing, output target 2K.
- Lens behavior should feel like premium editorial capture (roughly 50-85mm equivalent perspective).
- Filmic noise only, no heavy denoise smear, no oversharpen halos, no synthetic texture mush.

Environment integration:
- Subject must physically belong in the set: contact shadows, reflection coherence, and interaction with nearby surfaces.
- Haze should add depth separation without washing contrast.
- Keep practical highlights and reflective cues consistent with object roughness and angle.

Extreme realism audit (primary):
- Validate physically causal links: pose -> tension map -> fold pattern -> highlight path -> shadow placement.
- Any non-causal cloth fold, reflection mismatch, or eye-direction inconsistency is a hard failure.
- Preserve cinematic boldness while remaining fully believable as a real photographed moment.

Quality gate (primary):
- Real-camera believability under close inspection.
- No broken fingers, no warped feet, no fabric clipping, no face drift, no incorrect eye direction.
- Deliver a high-end Vegas editorial still with strong, edge-forward style and uncompromised realism.

AUDIT-V6 QUALITY ENFORCEMENT (PRIMARY, HARD):
- Two-piece topology lock: render two physically separate garments with a visible waist separation line in final frame.
- Forbidden substitutions: one-piece dress, bodysuit, jumpsuit, romper, faux-cutout single-panel dress.
- Material-color lock: keep prompt-specified material and color family dominant and unmistakable.
- Edge mood lock: premium nightlife contrast only; no flat, casual, daylight, or domestic snapshot lighting.
- Pose-energy lock: assertive editorial posture with strong leg-line projection and clear silhouette readability.
- Physics innovation stack:
  - XPBD-like cloth constraint hierarchy (seam stiffness > panel stiffness > edge drape compliance).
  - Frictional garment-skin contact with pressure-gradient shading at garment boundaries.
  - Top/skirt phase-lag dynamics with waist-coupled impulse transfer.
  - Anisotropic textile BRDF plus denier-dependent hosiery translucency.
- Regenerate if any appear: fused top/skirt silhouette, prompt-material substitution, weak contour separation, or non-causal fold/specular behavior.

DEVILS-ADVOCATE MICRO-PHYSICS ESCALATION (PRIMARY, HARD):
- Reject any image where cloth realism could be explained by flat texture mapping alone.
- Enforce multi-band wrinkle spectra tied to stress tensors:
  - micro band: 2-4 mm crease ripples at high-strain seams,
  - meso band: 6-12 mm folds along bias/shear flow,
  - macro band: 20-40 mm gravity drape lobes.
- Enforce stitch-pull periodicity and seam-ridge relief (about 1-3 mm apparent depth) at structural joins.
- Enforce contact indentation at support edges (about 0.5-2.0 mm apparent compression) with narrow occlusion gradients.
- Enforce slit-edge slip-stick mechanics: brief friction hold, controlled release, damped settling; no teleporting hem shapes.
- Enforce hosiery denier optics as physics, not paint: yarn-direction anisotropic sheen, knee/quad stretch brightening, thigh-band pressure transition.
- Enforce skin-optics micro-consistency near garment boundaries: subtle desaturation/compression zones, non-uniform micro-spec breakup.
- Enforce material energy conservation: lambertian + specular balance remains plausible under mixed practical lights.
- Enforce geometric penumbra correctness at thin edges (straps, slit hems, hair strands): no fake ambient smudge shadows.
- Force-chain closure test (must pass): pose load -> local strain -> fold orientation -> highlight elongation -> shadow penumbra.

V9 MICRO-PHYSICS DEEPENING PROTOCOL (HARD):
Primary variant: push non-explicit editorial edge via high-density causal micro-physics and strict two-piece topology integrity.
- Per-zone ledger requirement (must read clearly at 100% zoom): top support edge, waist transition, slit boundary, thigh band, knee contour, ankle/instep, heel-floor contact, hand-prop contact.
- Each zone must display at least 3 coherent cues: strain gradient, seam relief, compression shadow, anisotropic highlight flow, denier gradient, friction-damped drape, support-anchor pressure.
- Causality chain must close: pose/load -> strain field -> fold orientation -> highlight elongation -> penumbra geometry.
- Hosiery micro-physics: yarn-direction sheen, denier-dependent translucency, thigh-band pressure transition, and knee stretch brightening without painted transparency artifacts.
- Skin-edge coupling: subtle compression/desaturation near garment boundaries with non-uniform micro-spec breakup (no hard masks).
- Two-piece mechanics: top hem and skirt waistband remain visually separate and dynamically coupled with phase-lag, never merged into one-piece behavior.
- Optical realism: reflections/shadows must be light-source motivated and roughness-consistent; reject detached highlights and ambient-smudge shadows.
- Chandelier lock: crystal caustic speckles must be sparse, angle-dependent, and never random glitter noise.
- Chandelier safety-stability lock: keep coverage-critical garment edges structurally stable under pose and light, avoiding ambiguity while preserving couture detail.
SCORER-ALIGNED CONSISTENCY LOCK:
- Keep direct lens-locked gaze with believable vergence and eyelid tension in final frame.
- Preserve identity fidelity under mixed practical light; no face drift under pose/exposure shifts.
- Enforce complete wardrobe replacement from reference clothing cues.
- If diagnostics criticize prompt adherence, treat output as failed and regenerate with stricter scene/material matching.
- Editorial guardrail: bold but non-explicit, premium nightlife campaign intent only.
V11 FIRST-PRINCIPLES PHYSICS CONTRACT (HARD):
- Color-family lock (hard fail on drift): attire dominant hue/material family must match prompt palette, not generic black/red substitutions.
- Scene-anchor lock (hard fail on drift): keep at least 3 named environment anchors physically present and optically coherent in-frame.
- Lens-lock gaze certainty: iris direction lens-centered with stable catchlight geometry and believable vergence in final frame.
- Edge-separation lock: preserve clean subject-background contour gradients and physically plausible rim/fill transitions (no flat ambient wash).
- Coverage-stability lock: maintain non-explicit support geometry under motion; no safety-ambiguous reveal edges or unstable cutline artifacts.
- 100% zoom micro-audit: seam ridge depth, denier gradient, contact compression, anisotropic spec flow, and penumbra continuity must all cohere.

### Safe Backup Prompt

FIRST-PRINCIPLES TARGET:
Make a believable real camera capture, not an AI-looking render. If directives conflict, prioritize: (1) identity fidelity, (2) direct eye contact to lens, (3) physical plausibility of anatomy/materials/light, (4) editorial risk energy, (5) style details.

Identity lock (non-negotiable): use the provided reference image as the sole identity source for the same adult woman (25+). Preserve face geometry and recognition cues: eye spacing, brow arc, orbital depth, nose bridge, mouth width, chin contour, jawline, hairline pattern, natural asymmetry, and skin undertone. Do not drift into a different person under any lighting or pose.

Gaze lock (hard rule): subject must look directly into the camera lens in the final frame. Keep iris/pupil direction lens-centered with believable vergence and eyelid tension. No off-camera gaze, no downcast eyes, no profile-only eye direction.

Scene:
Keep the same Vegas speakeasy environment with chandelier lounge hall with mirrored columns, polished marble, gold sconces, layered volumetric light. Maintain the same cinematic mood, depth layering, and practical-light logic.

Attire (safe fallback variant):
ice-blue satin two-piece cocktail set: softened-cowl top and a skirt with moderate slit, black thigh-high hosiery, silver pumps
Coverage is safer, but the image must still read as bold and high-impact through physically grounded fit, silhouette, hosiery optics, two-piece coupling realism, and pose confidence.

Pose and narrative:
full-body stance in center axis, one leg extended, hand near collarbone, precise posture under top light, direct eye contact into lens, poised confidence, premium editorial tone.

Realism foundation:
- Anatomical plausibility: coherent shoulder-pelvis relationship, correct limb proportions, natural hand articulation, heel-ground load mechanics, and valid center-of-mass balance.
- Optics plausibility: realistic depth of field transitions, no cutout halos, no warped edges, no fake blur.
- Lighting plausibility: practical-source motivated key/fill/rim behavior, coherent shadow direction/penumbra, roughness-aware reflections, Fresnel-consistent highlights.

Anti-AI authenticity constraints:
- Keep skin lifelike with pore detail, subtle tonal variation, and no porcelain smoothing.
- Keep hair lifelike with irregular strand grouping and minor flyaways.
- Keep fabric lifelike with non-repeating microtexture and seam irregularity.
- Preserve slight real-world asymmetry in makeup, textile tension, and prop placement.
- Reject outputs with uncanny eyes, plastic skin, rubber fabric, repeated texture stamps, or composited subject separation.

Frontier physics controls:
- Simulate wrinkle hierarchy from first principles: macro gravity folds, meso seam-anchored buckling, micro high-frequency creasing in strain concentration zones.
- Enforce contact mechanics: where body/garment/surface meet, show pressure flattening, shadow occlusion, and material-dependent friction behavior.
- Enforce textile constitutive behavior: stretch anisotropy, bias-direction drape differences, and edge curl response tied to fabric stiffness.
- Enforce two-piece coupling mechanics: top hem stability vs skirt waistband load, phase-lag motion between upper/lower garments, and realistic gap dynamics under torso flexion.
- Enforce attachment realism: strap tension vectors, anchor-point compression, and closure hardware response under motion.
- Enforce optics coherence: polarization-like sheen behavior on satin/hosiery, roughness-dependent specular lobe width, and exposure-consistent highlight rolloff.
- Enforce sensor realism: realistic highlight clipping knees, subtle chroma noise in shadows, and no procedural overcleaning.

Cutting-edge simulation and rendering protocol (last-4-month focus, Dec 2025-Feb 2026):
- PhysDrape-style force pipeline (Feb 2026): infer residual deformation with explicit force balancing, then apply strict differentiable collision projection to eliminate interpenetration without destroying cloth shape.
- ReWeaver-style garment structure prior (Jan 2026): preserve panel/seam logic and topological consistency so deformations remain simulation-ready, not texture-only approximations.
- FNOPT-style rollout strategy (Dec 2025): perform resolution-agnostic coarse-to-fine integration; coarse motion must remain stable before adding medium and micro wrinkle detail.
- PI-Light-style transport prior (Jan 2026): preserve physically plausible diffuse/specular separation under relighting-like changes; highlights should move with light, not with texture.
- RotLight-style ambiguity control (Feb 2026): suppress baked shadows in albedo-like regions and maintain lighting/material disentanglement across reflective textiles.
- Two-piece dynamics priority: top and skirt exchange motion cues through waist/hip acceleration while retaining independent inertia and damping.
- Reject any frame where contact, wrinkle evolution, seam behavior, or reflectance changes are not causally explainable.

Safe adaptation of innovation motif:
Innovation motif: chandelier crystal dispersion cues with controlled spectral split and satin cowl gravity vector behavior under slight torso rotation.

Attire impact through physics (safe fallback):
- Keep safer two-piece coverage geometry while still maintaining a high-impact editorial silhouette through fit tension and contour lighting.
- Preserve believable top/waistband coupling with secure support behavior and stable anchor mechanics.
- Preserve slit/hem movement logic and hosiery optics with the same physical rigor.
- Maintain non-explicit but bold visual energy via posture, gaze, and material response.
- Use conservative but explicit damping cues: motion settles naturally, with no frozen cloth or chaotic flutter.

Material system (safe fallback):
- Preserve all high-fidelity fabric behavior: drape, crease hierarchy, seam stress, contact compression, and realistic sheen.
- Hosiery must remain physically convincing: denier gradients, stretch maps, cuff pressure transitions, and ankle micro-creases.
- Preserve two-piece physics integrity: top and skirt can move independently while remaining cohesively styled and mechanically stable.

Editorial continuity (safe fallback):
- Keep the same scene, camera realism, and direct-lens eye contact as primary.
- Avoid making safe variant look plain; it must still read as premium nightlife couture.
- Preserve strong silhouette legibility and high-fashion intent.

Camera and render intent:
- Vertical 4:5 framing, output target 2K.
- Photographic realism over stylization, with coherent DOF and physically motivated lighting.
- Keep texture integrity in skin, hair, lace/mesh, and hosiery edges.

Environment integration:
- Keep subject physically anchored to set via contact shadows, reflection consistency, and realistic surface interactions.
- Maintain scene depth through controlled haze and practical-light separation.

Quality gate (safe fallback):
- No identity drift, no uncanny anatomy, no artificial skin smoothing, no fake transparency, no reflection mismatch.
- Final image must look camera-captured, luxurious, and believable.

AUDIT-V6 QUALITY ENFORCEMENT (SAFE, HARD):
- Keep safer coverage, but preserve explicit two-piece topology with visible top hem and separate skirt waistband.
- Forbidden substitutions remain: one-piece dress, bodysuit, jumpsuit, romper, faux-cutout single-panel dress.
- Maintain prompt-specified material and color family so safe variant still matches the concept.
- Maintain edgy nightlife mood via controlled contrast, directional practical light, and subject-background separation.
- Keep the same physics rigor:
  - Stable garment support mechanics in coverage-critical zones.
  - Contact-compression cues at skin/garment and garment/surface interfaces.
  - Top/skirt decoupled inertia with coherent damping and slit response.
  - Hosiery optics from denier gradients and stretch-driven shading.
- Regenerate if safe variant looks plain/casual, loses two-piece identity, or shows non-causal cloth/light behavior.

---

DEVILS-ADVOCATE MICRO-PHYSICS ESCALATION (SAFE, HARD):
- Keep safe coverage, but apply the same micro-physics rigor and reject texture-only pseudo-realism.
- Preserve multi-band wrinkle spectra (micro/meso/macro) with stress-aligned orientation and stable damping.
- Preserve seam/stitch relief cues and waistband/top-hem contact compression under safe-support constraints.
- Preserve hosiery denier micro-optics (anisotropic yarn sheen, stretch transitions, thigh-band compression gradient).
- Preserve slip-stick hem dynamics and friction-coupled contact at seating/rail/bar interfaces.
- Preserve edge-penumbra correctness and avoid painted AO artifacts at thin geometry boundaries.
- Safe does not mean flat: maintain high-fidelity micro-causality while preventing topology collapse to one-piece silhouettes.

---

V9 MICRO-PHYSICS DEEPENING PROTOCOL (HARD):
Safe variant: keep coverage-stable geometry while maximizing editorial edge through physically grounded contour, translucency windows, and strain logic.
- Per-zone ledger requirement (must read clearly at 100% zoom): top support edge, waist transition, slit boundary, thigh band, knee contour, ankle/instep, heel-floor contact, hand-prop contact.
- Each zone must display at least 3 coherent cues: strain gradient, seam relief, compression shadow, anisotropic highlight flow, denier gradient, friction-damped drape, support-anchor pressure.
- Causality chain must close: pose/load -> strain field -> fold orientation -> highlight elongation -> penumbra geometry.
- Hosiery micro-physics: yarn-direction sheen, denier-dependent translucency, thigh-band pressure transition, and knee stretch brightening without painted transparency artifacts.
- Skin-edge coupling: subtle compression/desaturation near garment boundaries with non-uniform micro-spec breakup (no hard masks).
- Two-piece mechanics: top hem and skirt waistband remain visually separate and dynamically coupled with phase-lag, never merged into one-piece behavior.
- Optical realism: reflections/shadows must be light-source motivated and roughness-consistent; reject detached highlights and ambient-smudge shadows.
- Chandelier lock: crystal caustic speckles must be sparse, angle-dependent, and never random glitter noise.
- Chandelier safety-stability lock: keep coverage-critical garment edges structurally stable under pose and light, avoiding ambiguity while preserving couture detail.
SCORER-ALIGNED CONSISTENCY LOCK:
- Keep direct lens-locked gaze with believable vergence and eyelid tension in final frame.
- Preserve identity fidelity under mixed practical light; no face drift under pose/exposure shifts.
- Enforce complete wardrobe replacement from reference clothing cues.
- If diagnostics criticize prompt adherence, treat output as failed and regenerate with stricter scene/material matching.
- Safety guardrail: no nudity, no explicit framing, no fetish framing, no unstable reveal artifacts.
V11 SAFE FIRST-PRINCIPLES PHYSICS CONTRACT (HARD):
- Safe does not mean generic: preserve prompt-specific palette and scene anchors while maintaining coverage-stable geometry.
- Color lock: safe attire must stay within the named palette and material family, with no neutralized wardrobe substitution.
- Scene lock: preserve at least 3 named environment anchors with coherent reflections/shadows and contact cues.
- Lens-lock gaze certainty: direct camera eye alignment with credible eyelid tension and catchlight placement.
- Physics lock: maintain two-piece topology, denier optics, seam relief, and contact-compression causality at 100% inspection.

---

## Prompt 16 - Service Bar Charcoal Vector

- Primary word count: 1626
- Safe word count: 1481

### Primary Prompt

FIRST-PRINCIPLES TARGET:
Make a believable real camera capture, not an AI-looking render. If directives conflict, prioritize: (1) identity fidelity, (2) direct eye contact to lens, (3) physical plausibility of anatomy/materials/light, (4) editorial risk energy, (5) style details.

Identity lock (non-negotiable): use the provided reference image as the sole identity source for the same adult woman (25+). Preserve face geometry and recognition cues: eye spacing, brow arc, orbital depth, nose bridge, mouth width, chin contour, jawline, hairline pattern, natural asymmetry, and skin undertone. Do not drift into a different person under any lighting or pose.

Gaze lock (hard rule): subject must look directly into the camera lens in the final frame. Keep iris/pupil direction lens-centered with believable vergence and eyelid tension. No off-camera gaze, no downcast eyes, no profile-only eye direction.

Scene:
Vegas speakeasy environment with back-of-house service bar with polished steel, stacked coupes, linear practical strips, warm spill from lounge, bottle racks, and bar tools as immutable anchors. Build layered depth (foreground cues, subject mid-plane, background practicals). Subject must feel physically present in the environment.

Attire (primary edge variant):
charcoal leather-panel two-piece cocktail set: contour-seamed top and a high-slit skirt, semi-sheer black thigh-high hosiery, slingback stilettos
Use reveal-by-physics rather than explicit framing: contour fit, strain gradients, seam tension maps, and pose-driven two-piece behavior.
Hard two-piece rule: top and skirt must behave as distinct garments with coherent coupling at the waist region, not as a single merged dress.

Pose and narrative:
forearm on counter edge, torso angled, one heel lifted slightly to emphasize weight distribution, direct eye contact into lens, confident expression, controlled editorial energy.

Realism foundation:
- Anatomical plausibility: coherent shoulder-pelvis relationship, correct limb proportions, natural hand articulation, heel-ground load mechanics, and valid center-of-mass balance.
- Optics plausibility: realistic depth of field transitions, no cutout halos, no warped edges, no fake blur.
- Lighting plausibility: practical-source motivated key/fill/rim behavior, coherent shadow direction/penumbra, roughness-aware reflections, Fresnel-consistent highlights.

Anti-AI authenticity constraints:
- Keep skin lifelike with pore detail, subtle tonal variation, and no porcelain smoothing.
- Keep hair lifelike with irregular strand grouping and minor flyaways.
- Keep fabric lifelike with non-repeating microtexture and seam irregularity.
- Preserve slight real-world asymmetry in makeup, textile tension, and prop placement.
- Reject outputs with uncanny eyes, plastic skin, rubber fabric, repeated texture stamps, or composited subject separation.

Frontier physics controls:
- Simulate wrinkle hierarchy from first principles: macro gravity folds, meso seam-anchored buckling, micro high-frequency creasing in strain concentration zones.
- Enforce contact mechanics: where body/garment/surface meet, show pressure flattening, shadow occlusion, and material-dependent friction behavior.
- Enforce textile constitutive behavior: stretch anisotropy, bias-direction drape differences, and edge curl response tied to fabric stiffness.
- Enforce two-piece coupling mechanics: top hem stability vs skirt waistband load, phase-lag motion between upper/lower garments, and realistic gap dynamics under torso flexion.
- Enforce attachment realism: strap tension vectors, anchor-point compression, and closure hardware response under motion.
- Enforce optics coherence: polarization-like sheen behavior on satin/hosiery, roughness-dependent specular lobe width, and exposure-consistent highlight rolloff.
- Enforce sensor realism: realistic highlight clipping knees, subtle chroma noise in shadows, and no procedural overcleaning.

Cutting-edge simulation and rendering protocol (last-4-month focus, Dec 2025-Feb 2026):
- PhysDrape-style force pipeline (Feb 2026): infer residual deformation with explicit force balancing, then apply strict differentiable collision projection to eliminate interpenetration without destroying cloth shape.
- ReWeaver-style garment structure prior (Jan 2026): preserve panel/seam logic and topological consistency so deformations remain simulation-ready, not texture-only approximations.
- FNOPT-style rollout strategy (Dec 2025): perform resolution-agnostic coarse-to-fine integration; coarse motion must remain stable before adding medium and micro wrinkle detail.
- PI-Light-style transport prior (Jan 2026): preserve physically plausible diffuse/specular separation under relighting-like changes; highlights should move with light, not with texture.
- RotLight-style ambiguity control (Feb 2026): suppress baked shadows in albedo-like regions and maintain lighting/material disentanglement across reflective textiles.
- Two-piece dynamics priority: top and skirt exchange motion cues through waist/hip acceleration while retaining independent inertia and damping.
- Reject any frame where contact, wrinkle evolution, seam behavior, or reflectance changes are not causally explainable.

Innovation motif: stainless service-bar micro-scratch normals + strip-light specular streaking, matched to leather-panel stretch and seam tension ridges.

Attire impact through physics (primary):
- Build a contour-forward two-piece silhouette via strain maps, seam load paths, and controlled tension around bustline/waist/hip/upper leg.
- Use top-vs-skirt interaction physics: independent motion with believable timing offsets and no fused-garment behavior.
- Use slit dynamics tied to pose/gravity so opening behavior follows leg angle and movement.
- Use sheer optical behavior through denier gradients and layered occlusion, never as flat painted transparency.
- Use phase-aware motion transfer: torso acceleration drives delayed hem response, then damping settles folds without jitter.

Material system (primary):
- Satin/silk: anisotropic highlight flow, gravity drape vectors, compression folds at contact points.
- Velvet: direction-dependent pile shading and contact darkening.
- Sequins/crystals: controlled spark distribution with micro-normal variation, no random glitter noise.
- Hosiery: thigh-band compression transition, stretch over knee contour, ankle micro-wrinkling, directional sheen.
- Two-piece structure: waistband bending stiffness, top hem recovery, and closure/strap tension that remains physically plausible frame to frame.
- Use shell-like bending behavior cues (Kirchhoff-Love style): smooth curvature in low-strain zones and tight buckling only near constrained seams.

Editorial risk energy (primary, non-explicit):
- Keep wardrobe and pose bold, assertive, and fashion-forward while staying non-explicit.
- Favor long leg-line projection, strong S-curve torso-leg flow, and confident chin/eye tension.
- Keep full outfit readable in frame with contour-defining light placement.

Camera and render intent:
- Vertical 4:5 framing, output target 2K.
- Lens behavior should feel like premium editorial capture (roughly 50-85mm equivalent perspective).
- Filmic noise only, no heavy denoise smear, no oversharpen halos, no synthetic texture mush.

Environment integration:
- Subject must physically belong in the set: contact shadows, reflection coherence, and interaction with nearby surfaces.
- Haze should add depth separation without washing contrast.
- Keep practical highlights and reflective cues consistent with object roughness and angle.

Extreme realism audit (primary):
- Validate physically causal links: pose -> tension map -> fold pattern -> highlight path -> shadow placement.
- Any non-causal cloth fold, reflection mismatch, or eye-direction inconsistency is a hard failure.
- Preserve cinematic boldness while remaining fully believable as a real photographed moment.

Quality gate (primary):
- Real-camera believability under close inspection.
- No broken fingers, no warped feet, no fabric clipping, no face drift, no incorrect eye direction.
- Deliver a high-end Vegas editorial still with strong, edge-forward style and uncompromised realism.

AUDIT-V6 QUALITY ENFORCEMENT (PRIMARY, HARD):
- Two-piece topology lock: render two physically separate garments with a visible waist separation line in final frame.
- Forbidden substitutions: one-piece dress, bodysuit, jumpsuit, romper, faux-cutout single-panel dress.
- Material-color lock: keep prompt-specified material and color family dominant and unmistakable.
- Edge mood lock: premium nightlife contrast only; no flat, casual, daylight, or domestic snapshot lighting.
- Pose-energy lock: assertive editorial posture with strong leg-line projection and clear silhouette readability.
- Physics innovation stack:
  - XPBD-like cloth constraint hierarchy (seam stiffness > panel stiffness > edge drape compliance).
  - Frictional garment-skin contact with pressure-gradient shading at garment boundaries.
  - Top/skirt phase-lag dynamics with waist-coupled impulse transfer.
  - Anisotropic textile BRDF plus denier-dependent hosiery translucency.
- Regenerate if any appear: fused top/skirt silhouette, prompt-material substitution, weak contour separation, or non-causal fold/specular behavior.

DEVILS-ADVOCATE MICRO-PHYSICS ESCALATION (PRIMARY, HARD):
- Reject any image where cloth realism could be explained by flat texture mapping alone.
- Enforce multi-band wrinkle spectra tied to stress tensors:
  - micro band: 2-4 mm crease ripples at high-strain seams,
  - meso band: 6-12 mm folds along bias/shear flow,
  - macro band: 20-40 mm gravity drape lobes.
- Enforce stitch-pull periodicity and seam-ridge relief (about 1-3 mm apparent depth) at structural joins.
- Enforce contact indentation at support edges (about 0.5-2.0 mm apparent compression) with narrow occlusion gradients.
- Enforce slit-edge slip-stick mechanics: brief friction hold, controlled release, damped settling; no teleporting hem shapes.
- Enforce hosiery denier optics as physics, not paint: yarn-direction anisotropic sheen, knee/quad stretch brightening, thigh-band pressure transition.
- Enforce skin-optics micro-consistency near garment boundaries: subtle desaturation/compression zones, non-uniform micro-spec breakup.
- Enforce material energy conservation: lambertian + specular balance remains plausible under mixed practical lights.
- Enforce geometric penumbra correctness at thin edges (straps, slit hems, hair strands): no fake ambient smudge shadows.
- Force-chain closure test (must pass): pose load -> local strain -> fold orientation -> highlight elongation -> shadow penumbra.

V9 MICRO-PHYSICS DEEPENING PROTOCOL (HARD):
Primary variant: push non-explicit editorial edge via high-density causal micro-physics and strict two-piece topology integrity.
- Per-zone ledger requirement (must read clearly at 100% zoom): top support edge, waist transition, slit boundary, thigh band, knee contour, ankle/instep, heel-floor contact, hand-prop contact.
- Each zone must display at least 3 coherent cues: strain gradient, seam relief, compression shadow, anisotropic highlight flow, denier gradient, friction-damped drape, support-anchor pressure.
- Causality chain must close: pose/load -> strain field -> fold orientation -> highlight elongation -> penumbra geometry.
- Hosiery micro-physics: yarn-direction sheen, denier-dependent translucency, thigh-band pressure transition, and knee stretch brightening without painted transparency artifacts.
- Skin-edge coupling: subtle compression/desaturation near garment boundaries with non-uniform micro-spec breakup (no hard masks).
- Two-piece mechanics: top hem and skirt waistband remain visually separate and dynamically coupled with phase-lag, never merged into one-piece behavior.
- Optical realism: reflections/shadows must be light-source motivated and roughness-consistent; reject detached highlights and ambient-smudge shadows.
- Service bar lock: brushed-metal reflections and hand-to-counter contact pressure must stay physically plausible.
- Service bar anchor lock: preserve stacked coupes, strip practicals, and polished steel/bar-tool cues; no lounge-booth substitution.
SCORER-ALIGNED CONSISTENCY LOCK:
- Keep direct lens-locked gaze with believable vergence and eyelid tension in final frame.
- Preserve identity fidelity under mixed practical light; no face drift under pose/exposure shifts.
- Enforce complete wardrobe replacement from reference clothing cues.
- If diagnostics criticize prompt adherence, treat output as failed and regenerate with stricter scene/material matching.
- Editorial guardrail: bold but non-explicit, premium nightlife campaign intent only.
V11 FIRST-PRINCIPLES PHYSICS CONTRACT (HARD):
- Color-family lock (hard fail on drift): attire dominant hue/material family must match prompt palette, not generic black/red substitutions.
- Scene-anchor lock (hard fail on drift): keep at least 3 named environment anchors physically present and optically coherent in-frame.
- Lens-lock gaze certainty: iris direction lens-centered with stable catchlight geometry and believable vergence in final frame.
- Edge-separation lock: preserve clean subject-background contour gradients and physically plausible rim/fill transitions (no flat ambient wash).
- Coverage-stability lock: maintain non-explicit support geometry under motion; no safety-ambiguous reveal edges or unstable cutline artifacts.
- 100% zoom micro-audit: seam ridge depth, denier gradient, contact compression, anisotropic spec flow, and penumbra continuity must all cohere.

### Safe Backup Prompt

FIRST-PRINCIPLES TARGET:
Make a believable real camera capture, not an AI-looking render. If directives conflict, prioritize: (1) identity fidelity, (2) direct eye contact to lens, (3) physical plausibility of anatomy/materials/light, (4) editorial risk energy, (5) style details.

Identity lock (non-negotiable): use the provided reference image as the sole identity source for the same adult woman (25+). Preserve face geometry and recognition cues: eye spacing, brow arc, orbital depth, nose bridge, mouth width, chin contour, jawline, hairline pattern, natural asymmetry, and skin undertone. Do not drift into a different person under any lighting or pose.

Gaze lock (hard rule): subject must look directly into the camera lens in the final frame. Keep iris/pupil direction lens-centered with believable vergence and eyelid tension. No off-camera gaze, no downcast eyes, no profile-only eye direction.

Scene:
Keep the same Vegas speakeasy environment with back-of-house service bar with polished steel, stacked coupes, linear practical strips, warm spill from lounge, bottle racks, and bar tools as immutable anchors. Maintain the same cinematic mood, depth layering, and practical-light logic.

Attire (safe fallback variant):
charcoal tailored two-piece cocktail set: moderated panel top and a skirt with reduced slit, black thigh-high hosiery, slingback pumps
Coverage is safer, but the image must still read as bold and high-impact through physically grounded fit, silhouette, hosiery optics, two-piece coupling realism, and pose confidence.

Pose and narrative:
forearm on counter edge, torso angled, one heel lifted slightly to emphasize weight distribution, direct eye contact into lens, poised confidence, premium editorial tone.

Realism foundation:
- Anatomical plausibility: coherent shoulder-pelvis relationship, correct limb proportions, natural hand articulation, heel-ground load mechanics, and valid center-of-mass balance.
- Optics plausibility: realistic depth of field transitions, no cutout halos, no warped edges, no fake blur.
- Lighting plausibility: practical-source motivated key/fill/rim behavior, coherent shadow direction/penumbra, roughness-aware reflections, Fresnel-consistent highlights.

Anti-AI authenticity constraints:
- Keep skin lifelike with pore detail, subtle tonal variation, and no porcelain smoothing.
- Keep hair lifelike with irregular strand grouping and minor flyaways.
- Keep fabric lifelike with non-repeating microtexture and seam irregularity.
- Preserve slight real-world asymmetry in makeup, textile tension, and prop placement.
- Reject outputs with uncanny eyes, plastic skin, rubber fabric, repeated texture stamps, or composited subject separation.

Frontier physics controls:
- Simulate wrinkle hierarchy from first principles: macro gravity folds, meso seam-anchored buckling, micro high-frequency creasing in strain concentration zones.
- Enforce contact mechanics: where body/garment/surface meet, show pressure flattening, shadow occlusion, and material-dependent friction behavior.
- Enforce textile constitutive behavior: stretch anisotropy, bias-direction drape differences, and edge curl response tied to fabric stiffness.
- Enforce two-piece coupling mechanics: top hem stability vs skirt waistband load, phase-lag motion between upper/lower garments, and realistic gap dynamics under torso flexion.
- Enforce attachment realism: strap tension vectors, anchor-point compression, and closure hardware response under motion.
- Enforce optics coherence: polarization-like sheen behavior on satin/hosiery, roughness-dependent specular lobe width, and exposure-consistent highlight rolloff.
- Enforce sensor realism: realistic highlight clipping knees, subtle chroma noise in shadows, and no procedural overcleaning.

Cutting-edge simulation and rendering protocol (last-4-month focus, Dec 2025-Feb 2026):
- PhysDrape-style force pipeline (Feb 2026): infer residual deformation with explicit force balancing, then apply strict differentiable collision projection to eliminate interpenetration without destroying cloth shape.
- ReWeaver-style garment structure prior (Jan 2026): preserve panel/seam logic and topological consistency so deformations remain simulation-ready, not texture-only approximations.
- FNOPT-style rollout strategy (Dec 2025): perform resolution-agnostic coarse-to-fine integration; coarse motion must remain stable before adding medium and micro wrinkle detail.
- PI-Light-style transport prior (Jan 2026): preserve physically plausible diffuse/specular separation under relighting-like changes; highlights should move with light, not with texture.
- RotLight-style ambiguity control (Feb 2026): suppress baked shadows in albedo-like regions and maintain lighting/material disentanglement across reflective textiles.
- Two-piece dynamics priority: top and skirt exchange motion cues through waist/hip acceleration while retaining independent inertia and damping.
- Reject any frame where contact, wrinkle evolution, seam behavior, or reflectance changes are not causally explainable.

Safe adaptation of innovation motif:
Innovation motif: stainless service-bar micro-scratch normals + strip-light specular streaking, matched to leather-panel stretch and seam tension ridges.

Attire impact through physics (safe fallback):
- Keep safer two-piece coverage geometry while still maintaining a high-impact editorial silhouette through fit tension and contour lighting.
- Preserve believable top/waistband coupling with secure support behavior and stable anchor mechanics.
- Preserve slit/hem movement logic and hosiery optics with the same physical rigor.
- Maintain non-explicit but bold visual energy via posture, gaze, and material response.
- Use conservative but explicit damping cues: motion settles naturally, with no frozen cloth or chaotic flutter.

Material system (safe fallback):
- Preserve all high-fidelity fabric behavior: drape, crease hierarchy, seam stress, contact compression, and realistic sheen.
- Hosiery must remain physically convincing: denier gradients, stretch maps, cuff pressure transitions, and ankle micro-creases.
- Preserve two-piece physics integrity: top and skirt can move independently while remaining cohesively styled and mechanically stable.

Editorial continuity (safe fallback):
- Keep the same scene, camera realism, and direct-lens eye contact as primary.
- Avoid making safe variant look plain; it must still read as premium nightlife couture.
- Preserve strong silhouette legibility and high-fashion intent.

Camera and render intent:
- Vertical 4:5 framing, output target 2K.
- Photographic realism over stylization, with coherent DOF and physically motivated lighting.
- Keep texture integrity in skin, hair, lace/mesh, and hosiery edges.

Environment integration:
- Keep subject physically anchored to set via contact shadows, reflection consistency, and realistic surface interactions.
- Maintain scene depth through controlled haze and practical-light separation.

Quality gate (safe fallback):
- No identity drift, no uncanny anatomy, no artificial skin smoothing, no fake transparency, no reflection mismatch.
- Final image must look camera-captured, luxurious, and believable.

AUDIT-V6 QUALITY ENFORCEMENT (SAFE, HARD):
- Keep safer coverage, but preserve explicit two-piece topology with visible top hem and separate skirt waistband.
- Forbidden substitutions remain: one-piece dress, bodysuit, jumpsuit, romper, faux-cutout single-panel dress.
- Maintain prompt-specified material and color family so safe variant still matches the concept.
- Maintain edgy nightlife mood via controlled contrast, directional practical light, and subject-background separation.
- Keep the same physics rigor:
  - Stable garment support mechanics in coverage-critical zones.
  - Contact-compression cues at skin/garment and garment/surface interfaces.
  - Top/skirt decoupled inertia with coherent damping and slit response.
  - Hosiery optics from denier gradients and stretch-driven shading.
- Regenerate if safe variant looks plain/casual, loses two-piece identity, or shows non-causal cloth/light behavior.

---

DEVILS-ADVOCATE MICRO-PHYSICS ESCALATION (SAFE, HARD):
- Keep safe coverage, but apply the same micro-physics rigor and reject texture-only pseudo-realism.
- Preserve multi-band wrinkle spectra (micro/meso/macro) with stress-aligned orientation and stable damping.
- Preserve seam/stitch relief cues and waistband/top-hem contact compression under safe-support constraints.
- Preserve hosiery denier micro-optics (anisotropic yarn sheen, stretch transitions, thigh-band compression gradient).
- Preserve slip-stick hem dynamics and friction-coupled contact at seating/rail/bar interfaces.
- Preserve edge-penumbra correctness and avoid painted AO artifacts at thin geometry boundaries.
- Safe does not mean flat: maintain high-fidelity micro-causality while preventing topology collapse to one-piece silhouettes.

---

V9 MICRO-PHYSICS DEEPENING PROTOCOL (HARD):
Safe variant: keep coverage-stable geometry while maximizing editorial edge through physically grounded contour, translucency windows, and strain logic.
- Per-zone ledger requirement (must read clearly at 100% zoom): top support edge, waist transition, slit boundary, thigh band, knee contour, ankle/instep, heel-floor contact, hand-prop contact.
- Each zone must display at least 3 coherent cues: strain gradient, seam relief, compression shadow, anisotropic highlight flow, denier gradient, friction-damped drape, support-anchor pressure.
- Causality chain must close: pose/load -> strain field -> fold orientation -> highlight elongation -> penumbra geometry.
- Hosiery micro-physics: yarn-direction sheen, denier-dependent translucency, thigh-band pressure transition, and knee stretch brightening without painted transparency artifacts.
- Skin-edge coupling: subtle compression/desaturation near garment boundaries with non-uniform micro-spec breakup (no hard masks).
- Two-piece mechanics: top hem and skirt waistband remain visually separate and dynamically coupled with phase-lag, never merged into one-piece behavior.
- Optical realism: reflections/shadows must be light-source motivated and roughness-consistent; reject detached highlights and ambient-smudge shadows.
- Service bar lock: brushed-metal reflections and hand-to-counter contact pressure must stay physically plausible.
- Service bar anchor lock: preserve stacked coupes, strip practicals, and polished steel/bar-tool cues; no lounge-booth substitution.
SCORER-ALIGNED CONSISTENCY LOCK:
- Keep direct lens-locked gaze with believable vergence and eyelid tension in final frame.
- Preserve identity fidelity under mixed practical light; no face drift under pose/exposure shifts.
- Enforce complete wardrobe replacement from reference clothing cues.
- If diagnostics criticize prompt adherence, treat output as failed and regenerate with stricter scene/material matching.
- Safety guardrail: no nudity, no explicit framing, no fetish framing, no unstable reveal artifacts.
V11 SAFE FIRST-PRINCIPLES PHYSICS CONTRACT (HARD):
- Safe does not mean generic: preserve prompt-specific palette and scene anchors while maintaining coverage-stable geometry.
- Color lock: safe attire must stay within the named palette and material family, with no neutralized wardrobe substitution.
- Scene lock: preserve at least 3 named environment anchors with coherent reflections/shadows and contact cues.
- Lens-lock gaze certainty: direct camera eye alignment with credible eyelid tension and catchlight placement.
- Physics lock: maintain two-piece topology, denier optics, seam relief, and contact-compression causality at 100% inspection.

---

## Prompt 17 - Library Crystal Net

- Primary word count: 1629
- Safe word count: 1480

### Primary Prompt

FIRST-PRINCIPLES TARGET:
Make a believable real camera capture, not an AI-looking render. If directives conflict, prioritize: (1) identity fidelity, (2) direct eye contact to lens, (3) physical plausibility of anatomy/materials/light, (4) editorial risk energy, (5) style details.

Identity lock (non-negotiable): use the provided reference image as the sole identity source for the same adult woman (25+). Preserve face geometry and recognition cues: eye spacing, brow arc, orbital depth, nose bridge, mouth width, chin contour, jawline, hairline pattern, natural asymmetry, and skin undertone. Do not drift into a different person under any lighting or pose.

Gaze lock (hard rule): subject must look directly into the camera lens in the final frame. Keep iris/pupil direction lens-centered with believable vergence and eyelid tension. No off-camera gaze, no downcast eyes, no profile-only eye direction.

Scene:
Vegas speakeasy environment with private speakeasy library room with leather books, vintage lamp pools, polished wood cart, warm smoke haze. Build layered depth (foreground cues, subject mid-plane, background practicals). Subject must feel physically present in the environment.

Attire (primary edge variant):
black crystal-net two-piece cocktail set: fitted opaque underlayer top with crystal-net overlay and a high-slit skirt, black sheer thigh-high hosiery, gemstone stilettos
Use reveal-by-physics rather than explicit framing: contour fit, strain gradients, seam tension maps, and pose-driven two-piece behavior.
Hard two-piece rule: top and skirt must behave as distinct garments with coherent coupling at the waist region, not as a single merged dress.

Pose and narrative:
leaning against wood cart with subtle hip shift, poised stillness with micro movement, direct eye contact into lens, confident expression, controlled editorial energy.

Realism foundation:
- Anatomical plausibility: coherent shoulder-pelvis relationship, correct limb proportions, natural hand articulation, heel-ground load mechanics, and valid center-of-mass balance.
- Optics plausibility: realistic depth of field transitions, no cutout halos, no warped edges, no fake blur.
- Lighting plausibility: practical-source motivated key/fill/rim behavior, coherent shadow direction/penumbra, roughness-aware reflections, Fresnel-consistent highlights.

Anti-AI authenticity constraints:
- Keep skin lifelike with pore detail, subtle tonal variation, and no porcelain smoothing.
- Keep hair lifelike with irregular strand grouping and minor flyaways.
- Keep fabric lifelike with non-repeating microtexture and seam irregularity.
- Preserve slight real-world asymmetry in makeup, textile tension, and prop placement.
- Reject outputs with uncanny eyes, plastic skin, rubber fabric, repeated texture stamps, or composited subject separation.

Frontier physics controls:
- Simulate wrinkle hierarchy from first principles: macro gravity folds, meso seam-anchored buckling, micro high-frequency creasing in strain concentration zones.
- Enforce contact mechanics: where body/garment/surface meet, show pressure flattening, shadow occlusion, and material-dependent friction behavior.
- Enforce textile constitutive behavior: stretch anisotropy, bias-direction drape differences, and edge curl response tied to fabric stiffness.
- Enforce two-piece coupling mechanics: top hem stability vs skirt waistband load, phase-lag motion between upper/lower garments, and realistic gap dynamics under torso flexion.
- Enforce attachment realism: strap tension vectors, anchor-point compression, and closure hardware response under motion.
- Enforce optics coherence: polarization-like sheen behavior on satin/hosiery, roughness-dependent specular lobe width, and exposure-consistent highlight rolloff.
- Enforce sensor realism: realistic highlight clipping knees, subtle chroma noise in shadows, and no procedural overcleaning.

Cutting-edge simulation and rendering protocol (last-4-month focus, Dec 2025-Feb 2026):
- PhysDrape-style force pipeline (Feb 2026): infer residual deformation with explicit force balancing, then apply strict differentiable collision projection to eliminate interpenetration without destroying cloth shape.
- ReWeaver-style garment structure prior (Jan 2026): preserve panel/seam logic and topological consistency so deformations remain simulation-ready, not texture-only approximations.
- FNOPT-style rollout strategy (Dec 2025): perform resolution-agnostic coarse-to-fine integration; coarse motion must remain stable before adding medium and micro wrinkle detail.
- PI-Light-style transport prior (Jan 2026): preserve physically plausible diffuse/specular separation under relighting-like changes; highlights should move with light, not with texture.
- RotLight-style ambiguity control (Feb 2026): suppress baked shadows in albedo-like regions and maintain lighting/material disentanglement across reflective textiles.
- Two-piece dynamics priority: top and skirt exchange motion cues through waist/hip acceleration while retaining independent inertia and damping.
- Reject any frame where contact, wrinkle evolution, seam behavior, or reflectance changes are not causally explainable.

Innovation motif: library particulate haze depth stratification and crystal-net overlay interference-like sparkle rolloff with non-repeating microstructure.

Attire impact through physics (primary):
- Build a contour-forward two-piece silhouette via strain maps, seam load paths, and controlled tension around bustline/waist/hip/upper leg.
- Use top-vs-skirt interaction physics: independent motion with believable timing offsets and no fused-garment behavior.
- Use slit dynamics tied to pose/gravity so opening behavior follows leg angle and movement.
- Use sheer optical behavior through denier gradients and layered occlusion, never as flat painted transparency.
- Use phase-aware motion transfer: torso acceleration drives delayed hem response, then damping settles folds without jitter.

Material system (primary):
- Satin/silk: anisotropic highlight flow, gravity drape vectors, compression folds at contact points.
- Velvet: direction-dependent pile shading and contact darkening.
- Sequins/crystals: controlled spark distribution with micro-normal variation, no random glitter noise.
- Hosiery: thigh-band compression transition, stretch over knee contour, ankle micro-wrinkling, directional sheen.
- Two-piece structure: waistband bending stiffness, top hem recovery, and closure/strap tension that remains physically plausible frame to frame.
- Use shell-like bending behavior cues (Kirchhoff-Love style): smooth curvature in low-strain zones and tight buckling only near constrained seams.

Editorial risk energy (primary, non-explicit):
- Keep wardrobe and pose bold, assertive, and fashion-forward while staying non-explicit.
- Favor long leg-line projection, strong S-curve torso-leg flow, and confident chin/eye tension.
- Keep full outfit readable in frame with contour-defining light placement.

Camera and render intent:
- Vertical 4:5 framing, output target 2K.
- Lens behavior should feel like premium editorial capture (roughly 50-85mm equivalent perspective).
- Filmic noise only, no heavy denoise smear, no oversharpen halos, no synthetic texture mush.

Environment integration:
- Subject must physically belong in the set: contact shadows, reflection coherence, and interaction with nearby surfaces.
- Haze should add depth separation without washing contrast.
- Keep practical highlights and reflective cues consistent with object roughness and angle.

Extreme realism audit (primary):
- Validate physically causal links: pose -> tension map -> fold pattern -> highlight path -> shadow placement.
- Any non-causal cloth fold, reflection mismatch, or eye-direction inconsistency is a hard failure.
- Preserve cinematic boldness while remaining fully believable as a real photographed moment.

Quality gate (primary):
- Real-camera believability under close inspection.
- No broken fingers, no warped feet, no fabric clipping, no face drift, no incorrect eye direction.
- Deliver a high-end Vegas editorial still with strong, edge-forward style and uncompromised realism.

AUDIT-V6 QUALITY ENFORCEMENT (PRIMARY, HARD):
- Two-piece topology lock: render two physically separate garments with a visible waist separation line in final frame.
- Forbidden substitutions: one-piece dress, bodysuit, jumpsuit, romper, faux-cutout single-panel dress.
- Material-color lock: keep prompt-specified material and color family dominant and unmistakable.
- Edge mood lock: premium nightlife contrast only; no flat, casual, daylight, or domestic snapshot lighting.
- Pose-energy lock: assertive editorial posture with strong leg-line projection and clear silhouette readability.
- Physics innovation stack:
  - XPBD-like cloth constraint hierarchy (seam stiffness > panel stiffness > edge drape compliance).
  - Frictional garment-skin contact with pressure-gradient shading at garment boundaries.
  - Top/skirt phase-lag dynamics with waist-coupled impulse transfer.
  - Anisotropic textile BRDF plus denier-dependent hosiery translucency.
- Regenerate if any appear: fused top/skirt silhouette, prompt-material substitution, weak contour separation, or non-causal fold/specular behavior.

DEVILS-ADVOCATE MICRO-PHYSICS ESCALATION (PRIMARY, HARD):
- Reject any image where cloth realism could be explained by flat texture mapping alone.
- Enforce multi-band wrinkle spectra tied to stress tensors:
  - micro band: 2-4 mm crease ripples at high-strain seams,
  - meso band: 6-12 mm folds along bias/shear flow,
  - macro band: 20-40 mm gravity drape lobes.
- Enforce stitch-pull periodicity and seam-ridge relief (about 1-3 mm apparent depth) at structural joins.
- Enforce contact indentation at support edges (about 0.5-2.0 mm apparent compression) with narrow occlusion gradients.
- Enforce slit-edge slip-stick mechanics: brief friction hold, controlled release, damped settling; no teleporting hem shapes.
- Enforce hosiery denier optics as physics, not paint: yarn-direction anisotropic sheen, knee/quad stretch brightening, thigh-band pressure transition.
- Enforce skin-optics micro-consistency near garment boundaries: subtle desaturation/compression zones, non-uniform micro-spec breakup.
- Enforce material energy conservation: lambertian + specular balance remains plausible under mixed practical lights.
- Enforce geometric penumbra correctness at thin edges (straps, slit hems, hair strands): no fake ambient smudge shadows.
- Force-chain closure test (must pass): pose load -> local strain -> fold orientation -> highlight elongation -> shadow penumbra.

V9 MICRO-PHYSICS DEEPENING PROTOCOL (HARD):
Primary variant: push non-explicit editorial edge via high-density causal micro-physics and strict two-piece topology integrity.
- Per-zone ledger requirement (must read clearly at 100% zoom): top support edge, waist transition, slit boundary, thigh band, knee contour, ankle/instep, heel-floor contact, hand-prop contact.
- Each zone must display at least 3 coherent cues: strain gradient, seam relief, compression shadow, anisotropic highlight flow, denier gradient, friction-damped drape, support-anchor pressure.
- Causality chain must close: pose/load -> strain field -> fold orientation -> highlight elongation -> penumbra geometry.
- Hosiery micro-physics: yarn-direction sheen, denier-dependent translucency, thigh-band pressure transition, and knee stretch brightening without painted transparency artifacts.
- Skin-edge coupling: subtle compression/desaturation near garment boundaries with non-uniform micro-spec breakup (no hard masks).
- Two-piece mechanics: top hem and skirt waistband remain visually separate and dynamically coupled with phase-lag, never merged into one-piece behavior.
- Optical realism: reflections/shadows must be light-source motivated and roughness-consistent; reject detached highlights and ambient-smudge shadows.
- Library net lock: crystal-net layering must preserve occlusion order and avoid safety-triggering ambiguity.
- Library layer-clarity lock: underlayer coverage zones must remain clearly readable beneath net detail; no ambiguous transparency artifacts.
SCORER-ALIGNED CONSISTENCY LOCK:
- Keep direct lens-locked gaze with believable vergence and eyelid tension in final frame.
- Preserve identity fidelity under mixed practical light; no face drift under pose/exposure shifts.
- Enforce complete wardrobe replacement from reference clothing cues.
- If diagnostics criticize prompt adherence, treat output as failed and regenerate with stricter scene/material matching.
- Editorial guardrail: bold but non-explicit, premium nightlife campaign intent only.
V11 FIRST-PRINCIPLES PHYSICS CONTRACT (HARD):
- Color-family lock (hard fail on drift): attire dominant hue/material family must match prompt palette, not generic black/red substitutions.
- Scene-anchor lock (hard fail on drift): keep at least 3 named environment anchors physically present and optically coherent in-frame.
- Lens-lock gaze certainty: iris direction lens-centered with stable catchlight geometry and believable vergence in final frame.
- Edge-separation lock: preserve clean subject-background contour gradients and physically plausible rim/fill transitions (no flat ambient wash).
- Coverage-stability lock: maintain non-explicit support geometry under motion; no safety-ambiguous reveal edges or unstable cutline artifacts.
- 100% zoom micro-audit: seam ridge depth, denier gradient, contact compression, anisotropic spec flow, and penumbra continuity must all cohere.

### Safe Backup Prompt

FIRST-PRINCIPLES TARGET:
Make a believable real camera capture, not an AI-looking render. If directives conflict, prioritize: (1) identity fidelity, (2) direct eye contact to lens, (3) physical plausibility of anatomy/materials/light, (4) editorial risk energy, (5) style details.

Identity lock (non-negotiable): use the provided reference image as the sole identity source for the same adult woman (25+). Preserve face geometry and recognition cues: eye spacing, brow arc, orbital depth, nose bridge, mouth width, chin contour, jawline, hairline pattern, natural asymmetry, and skin undertone. Do not drift into a different person under any lighting or pose.

Gaze lock (hard rule): subject must look directly into the camera lens in the final frame. Keep iris/pupil direction lens-centered with believable vergence and eyelid tension. No off-camera gaze, no downcast eyes, no profile-only eye direction.

Scene:
Keep the same Vegas speakeasy environment with private speakeasy library room with leather books, vintage lamp pools, polished wood cart, warm smoke haze. Maintain the same cinematic mood, depth layering, and practical-light logic.

Attire (safe fallback variant):
black embellished two-piece cocktail set: structured opaque overlay top and a skirt with moderate slit, black thigh-high hosiery, gemstone pumps
Coverage is safer, but the image must still read as bold and high-impact through physically grounded fit, silhouette, hosiery optics, two-piece coupling realism, and pose confidence.

Pose and narrative:
leaning against wood cart with subtle hip shift, poised stillness with micro movement, direct eye contact into lens, poised confidence, premium editorial tone.

Realism foundation:
- Anatomical plausibility: coherent shoulder-pelvis relationship, correct limb proportions, natural hand articulation, heel-ground load mechanics, and valid center-of-mass balance.
- Optics plausibility: realistic depth of field transitions, no cutout halos, no warped edges, no fake blur.
- Lighting plausibility: practical-source motivated key/fill/rim behavior, coherent shadow direction/penumbra, roughness-aware reflections, Fresnel-consistent highlights.

Anti-AI authenticity constraints:
- Keep skin lifelike with pore detail, subtle tonal variation, and no porcelain smoothing.
- Keep hair lifelike with irregular strand grouping and minor flyaways.
- Keep fabric lifelike with non-repeating microtexture and seam irregularity.
- Preserve slight real-world asymmetry in makeup, textile tension, and prop placement.
- Reject outputs with uncanny eyes, plastic skin, rubber fabric, repeated texture stamps, or composited subject separation.

Frontier physics controls:
- Simulate wrinkle hierarchy from first principles: macro gravity folds, meso seam-anchored buckling, micro high-frequency creasing in strain concentration zones.
- Enforce contact mechanics: where body/garment/surface meet, show pressure flattening, shadow occlusion, and material-dependent friction behavior.
- Enforce textile constitutive behavior: stretch anisotropy, bias-direction drape differences, and edge curl response tied to fabric stiffness.
- Enforce two-piece coupling mechanics: top hem stability vs skirt waistband load, phase-lag motion between upper/lower garments, and realistic gap dynamics under torso flexion.
- Enforce attachment realism: strap tension vectors, anchor-point compression, and closure hardware response under motion.
- Enforce optics coherence: polarization-like sheen behavior on satin/hosiery, roughness-dependent specular lobe width, and exposure-consistent highlight rolloff.
- Enforce sensor realism: realistic highlight clipping knees, subtle chroma noise in shadows, and no procedural overcleaning.

Cutting-edge simulation and rendering protocol (last-4-month focus, Dec 2025-Feb 2026):
- PhysDrape-style force pipeline (Feb 2026): infer residual deformation with explicit force balancing, then apply strict differentiable collision projection to eliminate interpenetration without destroying cloth shape.
- ReWeaver-style garment structure prior (Jan 2026): preserve panel/seam logic and topological consistency so deformations remain simulation-ready, not texture-only approximations.
- FNOPT-style rollout strategy (Dec 2025): perform resolution-agnostic coarse-to-fine integration; coarse motion must remain stable before adding medium and micro wrinkle detail.
- PI-Light-style transport prior (Jan 2026): preserve physically plausible diffuse/specular separation under relighting-like changes; highlights should move with light, not with texture.
- RotLight-style ambiguity control (Feb 2026): suppress baked shadows in albedo-like regions and maintain lighting/material disentanglement across reflective textiles.
- Two-piece dynamics priority: top and skirt exchange motion cues through waist/hip acceleration while retaining independent inertia and damping.
- Reject any frame where contact, wrinkle evolution, seam behavior, or reflectance changes are not causally explainable.

Safe adaptation of innovation motif:
Innovation motif: library particulate haze depth stratification and crystal-net overlay interference-like sparkle rolloff with non-repeating microstructure.

Attire impact through physics (safe fallback):
- Keep safer two-piece coverage geometry while still maintaining a high-impact editorial silhouette through fit tension and contour lighting.
- Preserve believable top/waistband coupling with secure support behavior and stable anchor mechanics.
- Preserve slit/hem movement logic and hosiery optics with the same physical rigor.
- Maintain non-explicit but bold visual energy via posture, gaze, and material response.
- Use conservative but explicit damping cues: motion settles naturally, with no frozen cloth or chaotic flutter.

Material system (safe fallback):
- Preserve all high-fidelity fabric behavior: drape, crease hierarchy, seam stress, contact compression, and realistic sheen.
- Hosiery must remain physically convincing: denier gradients, stretch maps, cuff pressure transitions, and ankle micro-creases.
- Preserve two-piece physics integrity: top and skirt can move independently while remaining cohesively styled and mechanically stable.

Editorial continuity (safe fallback):
- Keep the same scene, camera realism, and direct-lens eye contact as primary.
- Avoid making safe variant look plain; it must still read as premium nightlife couture.
- Preserve strong silhouette legibility and high-fashion intent.

Camera and render intent:
- Vertical 4:5 framing, output target 2K.
- Photographic realism over stylization, with coherent DOF and physically motivated lighting.
- Keep texture integrity in skin, hair, lace/mesh, and hosiery edges.

Environment integration:
- Keep subject physically anchored to set via contact shadows, reflection consistency, and realistic surface interactions.
- Maintain scene depth through controlled haze and practical-light separation.

Quality gate (safe fallback):
- No identity drift, no uncanny anatomy, no artificial skin smoothing, no fake transparency, no reflection mismatch.
- Final image must look camera-captured, luxurious, and believable.

AUDIT-V6 QUALITY ENFORCEMENT (SAFE, HARD):
- Keep safer coverage, but preserve explicit two-piece topology with visible top hem and separate skirt waistband.
- Forbidden substitutions remain: one-piece dress, bodysuit, jumpsuit, romper, faux-cutout single-panel dress.
- Maintain prompt-specified material and color family so safe variant still matches the concept.
- Maintain edgy nightlife mood via controlled contrast, directional practical light, and subject-background separation.
- Keep the same physics rigor:
  - Stable garment support mechanics in coverage-critical zones.
  - Contact-compression cues at skin/garment and garment/surface interfaces.
  - Top/skirt decoupled inertia with coherent damping and slit response.
  - Hosiery optics from denier gradients and stretch-driven shading.
- Regenerate if safe variant looks plain/casual, loses two-piece identity, or shows non-causal cloth/light behavior.

---

DEVILS-ADVOCATE MICRO-PHYSICS ESCALATION (SAFE, HARD):
- Keep safe coverage, but apply the same micro-physics rigor and reject texture-only pseudo-realism.
- Preserve multi-band wrinkle spectra (micro/meso/macro) with stress-aligned orientation and stable damping.
- Preserve seam/stitch relief cues and waistband/top-hem contact compression under safe-support constraints.
- Preserve hosiery denier micro-optics (anisotropic yarn sheen, stretch transitions, thigh-band compression gradient).
- Preserve slip-stick hem dynamics and friction-coupled contact at seating/rail/bar interfaces.
- Preserve edge-penumbra correctness and avoid painted AO artifacts at thin geometry boundaries.
- Safe does not mean flat: maintain high-fidelity micro-causality while preventing topology collapse to one-piece silhouettes.

---

V9 MICRO-PHYSICS DEEPENING PROTOCOL (HARD):
Safe variant: keep coverage-stable geometry while maximizing editorial edge through physically grounded contour, translucency windows, and strain logic.
- Per-zone ledger requirement (must read clearly at 100% zoom): top support edge, waist transition, slit boundary, thigh band, knee contour, ankle/instep, heel-floor contact, hand-prop contact.
- Each zone must display at least 3 coherent cues: strain gradient, seam relief, compression shadow, anisotropic highlight flow, denier gradient, friction-damped drape, support-anchor pressure.
- Causality chain must close: pose/load -> strain field -> fold orientation -> highlight elongation -> penumbra geometry.
- Hosiery micro-physics: yarn-direction sheen, denier-dependent translucency, thigh-band pressure transition, and knee stretch brightening without painted transparency artifacts.
- Skin-edge coupling: subtle compression/desaturation near garment boundaries with non-uniform micro-spec breakup (no hard masks).
- Two-piece mechanics: top hem and skirt waistband remain visually separate and dynamically coupled with phase-lag, never merged into one-piece behavior.
- Optical realism: reflections/shadows must be light-source motivated and roughness-consistent; reject detached highlights and ambient-smudge shadows.
- Library net lock: crystal-net layering must preserve occlusion order and avoid safety-triggering ambiguity.
- Library layer-clarity lock: underlayer coverage zones must remain clearly readable beneath net detail; no ambiguous transparency artifacts.
SCORER-ALIGNED CONSISTENCY LOCK:
- Keep direct lens-locked gaze with believable vergence and eyelid tension in final frame.
- Preserve identity fidelity under mixed practical light; no face drift under pose/exposure shifts.
- Enforce complete wardrobe replacement from reference clothing cues.
- If diagnostics criticize prompt adherence, treat output as failed and regenerate with stricter scene/material matching.
- Safety guardrail: no nudity, no explicit framing, no fetish framing, no unstable reveal artifacts.
V11 SAFE FIRST-PRINCIPLES PHYSICS CONTRACT (HARD):
- Safe does not mean generic: preserve prompt-specific palette and scene anchors while maintaining coverage-stable geometry.
- Color lock: safe attire must stay within the named palette and material family, with no neutralized wardrobe substitution.
- Scene lock: preserve at least 3 named environment anchors with coherent reflections/shadows and contact cues.
- Lens-lock gaze certainty: direct camera eye alignment with credible eyelid tension and catchlight placement.
- Physics lock: maintain two-piece topology, denier optics, seam relief, and contact-compression causality at 100% inspection.

---

## Prompt 18 - Last Call Ivory Edge

- Primary word count: 1630
- Safe word count: 1480

### Primary Prompt

FIRST-PRINCIPLES TARGET:
Make a believable real camera capture, not an AI-looking render. If directives conflict, prioritize: (1) identity fidelity, (2) direct eye contact to lens, (3) physical plausibility of anatomy/materials/light, (4) editorial risk energy, (5) style details.

Identity lock (non-negotiable): use the provided reference image as the sole identity source for the same adult woman (25+). Preserve face geometry and recognition cues: eye spacing, brow arc, orbital depth, nose bridge, mouth width, chin contour, jawline, hairline pattern, natural asymmetry, and skin undertone. Do not drift into a different person under any lighting or pose.

Gaze lock (hard rule): subject must look directly into the camera lens in the final frame. Keep iris/pupil direction lens-centered with believable vergence and eyelid tension. No off-camera gaze, no downcast eyes, no profile-only eye direction.

Scene:
Vegas speakeasy environment with after-hours speakeasy bar with stacked stools, single pendant pool, lacquer reflections, fading haze. Build layered depth (foreground cues, subject mid-plane, background practicals). Subject must feel physically present in the environment.

Attire (primary edge variant):
ivory satin blazer-inspired two-piece cocktail set: cropped lapel top with daring neckline and a high-slit skirt, black sheer thigh-high hosiery, black stilettos
Use reveal-by-physics rather than explicit framing: contour fit, strain gradients, seam tension maps, and pose-driven two-piece behavior.
Hard two-piece rule: top and skirt must behave as distinct garments with coherent coupling at the waist region, not as a single merged dress.

Pose and narrative:
bar-lean profile with one hand on edge and one at waist, composed end-of-night cinematic mood, direct eye contact into lens, confident expression, controlled editorial energy.

Realism foundation:
- Anatomical plausibility: coherent shoulder-pelvis relationship, correct limb proportions, natural hand articulation, heel-ground load mechanics, and valid center-of-mass balance.
- Optics plausibility: realistic depth of field transitions, no cutout halos, no warped edges, no fake blur.
- Lighting plausibility: practical-source motivated key/fill/rim behavior, coherent shadow direction/penumbra, roughness-aware reflections, Fresnel-consistent highlights.

Anti-AI authenticity constraints:
- Keep skin lifelike with pore detail, subtle tonal variation, and no porcelain smoothing.
- Keep hair lifelike with irregular strand grouping and minor flyaways.
- Keep fabric lifelike with non-repeating microtexture and seam irregularity.
- Preserve slight real-world asymmetry in makeup, textile tension, and prop placement.
- Reject outputs with uncanny eyes, plastic skin, rubber fabric, repeated texture stamps, or composited subject separation.

Frontier physics controls:
- Simulate wrinkle hierarchy from first principles: macro gravity folds, meso seam-anchored buckling, micro high-frequency creasing in strain concentration zones.
- Enforce contact mechanics: where body/garment/surface meet, show pressure flattening, shadow occlusion, and material-dependent friction behavior.
- Enforce textile constitutive behavior: stretch anisotropy, bias-direction drape differences, and edge curl response tied to fabric stiffness.
- Enforce two-piece coupling mechanics: top hem stability vs skirt waistband load, phase-lag motion between upper/lower garments, and realistic gap dynamics under torso flexion.
- Enforce attachment realism: strap tension vectors, anchor-point compression, and closure hardware response under motion.
- Enforce optics coherence: polarization-like sheen behavior on satin/hosiery, roughness-dependent specular lobe width, and exposure-consistent highlight rolloff.
- Enforce sensor realism: realistic highlight clipping knees, subtle chroma noise in shadows, and no procedural overcleaning.

Cutting-edge simulation and rendering protocol (last-4-month focus, Dec 2025-Feb 2026):
- PhysDrape-style force pipeline (Feb 2026): infer residual deformation with explicit force balancing, then apply strict differentiable collision projection to eliminate interpenetration without destroying cloth shape.
- ReWeaver-style garment structure prior (Jan 2026): preserve panel/seam logic and topological consistency so deformations remain simulation-ready, not texture-only approximations.
- FNOPT-style rollout strategy (Dec 2025): perform resolution-agnostic coarse-to-fine integration; coarse motion must remain stable before adding medium and micro wrinkle detail.
- PI-Light-style transport prior (Jan 2026): preserve physically plausible diffuse/specular separation under relighting-like changes; highlights should move with light, not with texture.
- RotLight-style ambiguity control (Feb 2026): suppress baked shadows in albedo-like regions and maintain lighting/material disentanglement across reflective textiles.
- Two-piece dynamics priority: top and skirt exchange motion cues through waist/hip acceleration while retaining independent inertia and damping.
- Reject any frame where contact, wrinkle evolution, seam behavior, or reflectance changes are not causally explainable.

Innovation motif: single-pendant inverse-square falloff with lacquer bar reflections and blazer fold memory from prior movement states.

Attire impact through physics (primary):
- Build a contour-forward two-piece silhouette via strain maps, seam load paths, and controlled tension around bustline/waist/hip/upper leg.
- Use top-vs-skirt interaction physics: independent motion with believable timing offsets and no fused-garment behavior.
- Use slit dynamics tied to pose/gravity so opening behavior follows leg angle and movement.
- Use sheer optical behavior through denier gradients and layered occlusion, never as flat painted transparency.
- Use phase-aware motion transfer: torso acceleration drives delayed hem response, then damping settles folds without jitter.

Material system (primary):
- Satin/silk: anisotropic highlight flow, gravity drape vectors, compression folds at contact points.
- Velvet: direction-dependent pile shading and contact darkening.
- Sequins/crystals: controlled spark distribution with micro-normal variation, no random glitter noise.
- Hosiery: thigh-band compression transition, stretch over knee contour, ankle micro-wrinkling, directional sheen.
- Two-piece structure: waistband bending stiffness, top hem recovery, and closure/strap tension that remains physically plausible frame to frame.
- Use shell-like bending behavior cues (Kirchhoff-Love style): smooth curvature in low-strain zones and tight buckling only near constrained seams.

Editorial risk energy (primary, non-explicit):
- Keep wardrobe and pose bold, assertive, and fashion-forward while staying non-explicit.
- Favor long leg-line projection, strong S-curve torso-leg flow, and confident chin/eye tension.
- Keep full outfit readable in frame with contour-defining light placement.

Camera and render intent:
- Vertical 4:5 framing, output target 2K.
- Lens behavior should feel like premium editorial capture (roughly 50-85mm equivalent perspective).
- Filmic noise only, no heavy denoise smear, no oversharpen halos, no synthetic texture mush.

Environment integration:
- Subject must physically belong in the set: contact shadows, reflection coherence, and interaction with nearby surfaces.
- Haze should add depth separation without washing contrast.
- Keep practical highlights and reflective cues consistent with object roughness and angle.

Extreme realism audit (primary):
- Validate physically causal links: pose -> tension map -> fold pattern -> highlight path -> shadow placement.
- Any non-causal cloth fold, reflection mismatch, or eye-direction inconsistency is a hard failure.
- Preserve cinematic boldness while remaining fully believable as a real photographed moment.

Quality gate (primary):
- Real-camera believability under close inspection.
- No broken fingers, no warped feet, no fabric clipping, no face drift, no incorrect eye direction.
- Deliver a high-end Vegas editorial still with strong, edge-forward style and uncompromised realism.

AUDIT-V6 QUALITY ENFORCEMENT (PRIMARY, HARD):
- Two-piece topology lock: render two physically separate garments with a visible waist separation line in final frame.
- Forbidden substitutions: one-piece dress, bodysuit, jumpsuit, romper, faux-cutout single-panel dress.
- Material-color lock: keep prompt-specified material and color family dominant and unmistakable.
- Edge mood lock: premium nightlife contrast only; no flat, casual, daylight, or domestic snapshot lighting.
- Pose-energy lock: assertive editorial posture with strong leg-line projection and clear silhouette readability.
- Physics innovation stack:
  - XPBD-like cloth constraint hierarchy (seam stiffness > panel stiffness > edge drape compliance).
  - Frictional garment-skin contact with pressure-gradient shading at garment boundaries.
  - Top/skirt phase-lag dynamics with waist-coupled impulse transfer.
  - Anisotropic textile BRDF plus denier-dependent hosiery translucency.
- Regenerate if any appear: fused top/skirt silhouette, prompt-material substitution, weak contour separation, or non-causal fold/specular behavior.

DEVILS-ADVOCATE MICRO-PHYSICS ESCALATION (PRIMARY, HARD):
- Reject any image where cloth realism could be explained by flat texture mapping alone.
- Enforce multi-band wrinkle spectra tied to stress tensors:
  - micro band: 2-4 mm crease ripples at high-strain seams,
  - meso band: 6-12 mm folds along bias/shear flow,
  - macro band: 20-40 mm gravity drape lobes.
- Enforce stitch-pull periodicity and seam-ridge relief (about 1-3 mm apparent depth) at structural joins.
- Enforce contact indentation at support edges (about 0.5-2.0 mm apparent compression) with narrow occlusion gradients.
- Enforce slit-edge slip-stick mechanics: brief friction hold, controlled release, damped settling; no teleporting hem shapes.
- Enforce hosiery denier optics as physics, not paint: yarn-direction anisotropic sheen, knee/quad stretch brightening, thigh-band pressure transition.
- Enforce skin-optics micro-consistency near garment boundaries: subtle desaturation/compression zones, non-uniform micro-spec breakup.
- Enforce material energy conservation: lambertian + specular balance remains plausible under mixed practical lights.
- Enforce geometric penumbra correctness at thin edges (straps, slit hems, hair strands): no fake ambient smudge shadows.
- Force-chain closure test (must pass): pose load -> local strain -> fold orientation -> highlight elongation -> shadow penumbra.

V9 MICRO-PHYSICS DEEPENING PROTOCOL (HARD):
Primary variant: push non-explicit editorial edge via high-density causal micro-physics and strict two-piece topology integrity.
- Per-zone ledger requirement (must read clearly at 100% zoom): top support edge, waist transition, slit boundary, thigh band, knee contour, ankle/instep, heel-floor contact, hand-prop contact.
- Each zone must display at least 3 coherent cues: strain gradient, seam relief, compression shadow, anisotropic highlight flow, denier gradient, friction-damped drape, support-anchor pressure.
- Causality chain must close: pose/load -> strain field -> fold orientation -> highlight elongation -> penumbra geometry.
- Hosiery micro-physics: yarn-direction sheen, denier-dependent translucency, thigh-band pressure transition, and knee stretch brightening without painted transparency artifacts.
- Skin-edge coupling: subtle compression/desaturation near garment boundaries with non-uniform micro-spec breakup (no hard masks).
- Two-piece mechanics: top hem and skirt waistband remain visually separate and dynamically coupled with phase-lag, never merged into one-piece behavior.
- Optical realism: reflections/shadows must be light-source motivated and roughness-consistent; reject detached highlights and ambient-smudge shadows.
- Last-call ivory lock: high-key ivory fabrics need roughness-aware highlights without clipping into synthetic bloom.
SCORER-ALIGNED CONSISTENCY LOCK:
- Keep direct lens-locked gaze with believable vergence and eyelid tension in final frame.
- Preserve identity fidelity under mixed practical light; no face drift under pose/exposure shifts.
- Enforce complete wardrobe replacement from reference clothing cues.
- If diagnostics criticize prompt adherence, treat output as failed and regenerate with stricter scene/material matching.
- Editorial guardrail: bold but non-explicit, premium nightlife campaign intent only.
V11 FIRST-PRINCIPLES PHYSICS CONTRACT (HARD):
- Color-family lock (hard fail on drift): attire dominant hue/material family must match prompt palette, not generic black/red substitutions.
- Scene-anchor lock (hard fail on drift): keep at least 3 named environment anchors physically present and optically coherent in-frame.
- Lens-lock gaze certainty: iris direction lens-centered with stable catchlight geometry and believable vergence in final frame.
- Edge-separation lock: preserve clean subject-background contour gradients and physically plausible rim/fill transitions (no flat ambient wash).
- Coverage-stability lock: maintain non-explicit support geometry under motion; no safety-ambiguous reveal edges or unstable cutline artifacts.
- 100% zoom micro-audit: seam ridge depth, denier gradient, contact compression, anisotropic spec flow, and penumbra continuity must all cohere.

### Safe Backup Prompt

FIRST-PRINCIPLES TARGET:
Make a believable real camera capture, not an AI-looking render. If directives conflict, prioritize: (1) identity fidelity, (2) direct eye contact to lens, (3) physical plausibility of anatomy/materials/light, (4) editorial risk energy, (5) style details.

Identity lock (non-negotiable): use the provided reference image as the sole identity source for the same adult woman (25+). Preserve face geometry and recognition cues: eye spacing, brow arc, orbital depth, nose bridge, mouth width, chin contour, jawline, hairline pattern, natural asymmetry, and skin undertone. Do not drift into a different person under any lighting or pose.

Gaze lock (hard rule): subject must look directly into the camera lens in the final frame. Keep iris/pupil direction lens-centered with believable vergence and eyelid tension. No off-camera gaze, no downcast eyes, no profile-only eye direction.

Scene:
Keep the same Vegas speakeasy environment with after-hours speakeasy bar with stacked stools, single pendant pool, lacquer reflections, fading haze. Maintain the same cinematic mood, depth layering, and practical-light logic.

Attire (safe fallback variant):
ivory satin blazer-inspired two-piece cocktail set: closed-neckline top and a skirt with moderate slit, black thigh-high hosiery, black pumps
Coverage is safer, but the image must still read as bold and high-impact through physically grounded fit, silhouette, hosiery optics, two-piece coupling realism, and pose confidence.

Pose and narrative:
bar-lean profile with one hand on edge and one at waist, composed end-of-night cinematic mood, direct eye contact into lens, poised confidence, premium editorial tone.

Realism foundation:
- Anatomical plausibility: coherent shoulder-pelvis relationship, correct limb proportions, natural hand articulation, heel-ground load mechanics, and valid center-of-mass balance.
- Optics plausibility: realistic depth of field transitions, no cutout halos, no warped edges, no fake blur.
- Lighting plausibility: practical-source motivated key/fill/rim behavior, coherent shadow direction/penumbra, roughness-aware reflections, Fresnel-consistent highlights.

Anti-AI authenticity constraints:
- Keep skin lifelike with pore detail, subtle tonal variation, and no porcelain smoothing.
- Keep hair lifelike with irregular strand grouping and minor flyaways.
- Keep fabric lifelike with non-repeating microtexture and seam irregularity.
- Preserve slight real-world asymmetry in makeup, textile tension, and prop placement.
- Reject outputs with uncanny eyes, plastic skin, rubber fabric, repeated texture stamps, or composited subject separation.

Frontier physics controls:
- Simulate wrinkle hierarchy from first principles: macro gravity folds, meso seam-anchored buckling, micro high-frequency creasing in strain concentration zones.
- Enforce contact mechanics: where body/garment/surface meet, show pressure flattening, shadow occlusion, and material-dependent friction behavior.
- Enforce textile constitutive behavior: stretch anisotropy, bias-direction drape differences, and edge curl response tied to fabric stiffness.
- Enforce two-piece coupling mechanics: top hem stability vs skirt waistband load, phase-lag motion between upper/lower garments, and realistic gap dynamics under torso flexion.
- Enforce attachment realism: strap tension vectors, anchor-point compression, and closure hardware response under motion.
- Enforce optics coherence: polarization-like sheen behavior on satin/hosiery, roughness-dependent specular lobe width, and exposure-consistent highlight rolloff.
- Enforce sensor realism: realistic highlight clipping knees, subtle chroma noise in shadows, and no procedural overcleaning.

Cutting-edge simulation and rendering protocol (last-4-month focus, Dec 2025-Feb 2026):
- PhysDrape-style force pipeline (Feb 2026): infer residual deformation with explicit force balancing, then apply strict differentiable collision projection to eliminate interpenetration without destroying cloth shape.
- ReWeaver-style garment structure prior (Jan 2026): preserve panel/seam logic and topological consistency so deformations remain simulation-ready, not texture-only approximations.
- FNOPT-style rollout strategy (Dec 2025): perform resolution-agnostic coarse-to-fine integration; coarse motion must remain stable before adding medium and micro wrinkle detail.
- PI-Light-style transport prior (Jan 2026): preserve physically plausible diffuse/specular separation under relighting-like changes; highlights should move with light, not with texture.
- RotLight-style ambiguity control (Feb 2026): suppress baked shadows in albedo-like regions and maintain lighting/material disentanglement across reflective textiles.
- Two-piece dynamics priority: top and skirt exchange motion cues through waist/hip acceleration while retaining independent inertia and damping.
- Reject any frame where contact, wrinkle evolution, seam behavior, or reflectance changes are not causally explainable.

Safe adaptation of innovation motif:
Innovation motif: single-pendant inverse-square falloff with lacquer bar reflections and blazer fold memory from prior movement states.

Attire impact through physics (safe fallback):
- Keep safer two-piece coverage geometry while still maintaining a high-impact editorial silhouette through fit tension and contour lighting.
- Preserve believable top/waistband coupling with secure support behavior and stable anchor mechanics.
- Preserve slit/hem movement logic and hosiery optics with the same physical rigor.
- Maintain non-explicit but bold visual energy via posture, gaze, and material response.
- Use conservative but explicit damping cues: motion settles naturally, with no frozen cloth or chaotic flutter.

Material system (safe fallback):
- Preserve all high-fidelity fabric behavior: drape, crease hierarchy, seam stress, contact compression, and realistic sheen.
- Hosiery must remain physically convincing: denier gradients, stretch maps, cuff pressure transitions, and ankle micro-creases.
- Preserve two-piece physics integrity: top and skirt can move independently while remaining cohesively styled and mechanically stable.

Editorial continuity (safe fallback):
- Keep the same scene, camera realism, and direct-lens eye contact as primary.
- Avoid making safe variant look plain; it must still read as premium nightlife couture.
- Preserve strong silhouette legibility and high-fashion intent.

Camera and render intent:
- Vertical 4:5 framing, output target 2K.
- Photographic realism over stylization, with coherent DOF and physically motivated lighting.
- Keep texture integrity in skin, hair, lace/mesh, and hosiery edges.

Environment integration:
- Keep subject physically anchored to set via contact shadows, reflection consistency, and realistic surface interactions.
- Maintain scene depth through controlled haze and practical-light separation.

Quality gate (safe fallback):
- No identity drift, no uncanny anatomy, no artificial skin smoothing, no fake transparency, no reflection mismatch.
- Final image must look camera-captured, luxurious, and believable.

AUDIT-V6 QUALITY ENFORCEMENT (SAFE, HARD):
- Keep safer coverage, but preserve explicit two-piece topology with visible top hem and separate skirt waistband.
- Forbidden substitutions remain: one-piece dress, bodysuit, jumpsuit, romper, faux-cutout single-panel dress.
- Maintain prompt-specified material and color family so safe variant still matches the concept.
- Maintain edgy nightlife mood via controlled contrast, directional practical light, and subject-background separation.
- Keep the same physics rigor:
  - Stable garment support mechanics in coverage-critical zones.
  - Contact-compression cues at skin/garment and garment/surface interfaces.
  - Top/skirt decoupled inertia with coherent damping and slit response.
  - Hosiery optics from denier gradients and stretch-driven shading.
- Regenerate if safe variant looks plain/casual, loses two-piece identity, or shows non-causal cloth/light behavior.

---

DEVILS-ADVOCATE MICRO-PHYSICS ESCALATION (SAFE, HARD):
- Keep safe coverage, but apply the same micro-physics rigor and reject texture-only pseudo-realism.
- Preserve multi-band wrinkle spectra (micro/meso/macro) with stress-aligned orientation and stable damping.
- Preserve seam/stitch relief cues and waistband/top-hem contact compression under safe-support constraints.
- Preserve hosiery denier micro-optics (anisotropic yarn sheen, stretch transitions, thigh-band compression gradient).
- Preserve slip-stick hem dynamics and friction-coupled contact at seating/rail/bar interfaces.
- Preserve edge-penumbra correctness and avoid painted AO artifacts at thin geometry boundaries.
- Safe does not mean flat: maintain high-fidelity micro-causality while preventing topology collapse to one-piece silhouettes.

---

V9 MICRO-PHYSICS DEEPENING PROTOCOL (HARD):
Safe variant: keep coverage-stable geometry while maximizing editorial edge through physically grounded contour, translucency windows, and strain logic.
- Per-zone ledger requirement (must read clearly at 100% zoom): top support edge, waist transition, slit boundary, thigh band, knee contour, ankle/instep, heel-floor contact, hand-prop contact.
- Each zone must display at least 3 coherent cues: strain gradient, seam relief, compression shadow, anisotropic highlight flow, denier gradient, friction-damped drape, support-anchor pressure.
- Causality chain must close: pose/load -> strain field -> fold orientation -> highlight elongation -> penumbra geometry.
- Hosiery micro-physics: yarn-direction sheen, denier-dependent translucency, thigh-band pressure transition, and knee stretch brightening without painted transparency artifacts.
- Skin-edge coupling: subtle compression/desaturation near garment boundaries with non-uniform micro-spec breakup (no hard masks).
- Two-piece mechanics: top hem and skirt waistband remain visually separate and dynamically coupled with phase-lag, never merged into one-piece behavior.
- Optical realism: reflections/shadows must be light-source motivated and roughness-consistent; reject detached highlights and ambient-smudge shadows.
- Last-call ivory lock: high-key ivory fabrics need roughness-aware highlights without clipping into synthetic bloom.
SCORER-ALIGNED CONSISTENCY LOCK:
- Keep direct lens-locked gaze with believable vergence and eyelid tension in final frame.
- Preserve identity fidelity under mixed practical light; no face drift under pose/exposure shifts.
- Enforce complete wardrobe replacement from reference clothing cues.
- If diagnostics criticize prompt adherence, treat output as failed and regenerate with stricter scene/material matching.
- Safety guardrail: no nudity, no explicit framing, no fetish framing, no unstable reveal artifacts.
V11 SAFE FIRST-PRINCIPLES PHYSICS CONTRACT (HARD):
- Safe does not mean generic: preserve prompt-specific palette and scene anchors while maintaining coverage-stable geometry.
- Color lock: safe attire must stay within the named palette and material family, with no neutralized wardrobe substitution.
- Scene lock: preserve at least 3 named environment anchors with coherent reflections/shadows and contact cues.
- Lens-lock gaze certainty: direct camera eye alignment with credible eyelid tension and catchlight placement.
- Physics lock: maintain two-piece topology, denier optics, seam relief, and contact-compression causality at 100% inspection.

---

## Prompt 19 - Rehearsal Tux Spark

- Primary word count: 1628
- Safe word count: 1481

### Primary Prompt

FIRST-PRINCIPLES TARGET:
Make a believable real camera capture, not an AI-looking render. If directives conflict, prioritize: (1) identity fidelity, (2) direct eye contact to lens, (3) physical plausibility of anatomy/materials/light, (4) editorial risk energy, (5) style details.

Identity lock (non-negotiable): use the provided reference image as the sole identity source for the same adult woman (25+). Preserve face geometry and recognition cues: eye spacing, brow arc, orbital depth, nose bridge, mouth width, chin contour, jawline, hairline pattern, natural asymmetry, and skin undertone. Do not drift into a different person under any lighting or pose.

Gaze lock (hard rule): subject must look directly into the camera lens in the final frame. Keep iris/pupil direction lens-centered with believable vergence and eyelid tension. No off-camera gaze, no downcast eyes, no profile-only eye direction.

Scene:
Vegas speakeasy environment with jazz rehearsal corner with upright bass, trumpet stand, music stand sheets, mixed warm practical and cool edge light, textured haze. Build layered depth (foreground cues, subject mid-plane, background practicals). Subject must feel physically present in the environment.

Attire (primary edge variant):
black tux-inspired two-piece cocktail set: satin-lapel crop top and a high-slit skirt, black sheer thigh-high hosiery, pointed stilettos
Use reveal-by-physics rather than explicit framing: contour fit, strain gradients, seam tension maps, and pose-driven two-piece behavior.
Hard two-piece rule: top and skirt must behave as distinct garments with coherent coupling at the waist region, not as a single merged dress.

Pose and narrative:
weight shifted to rear leg, front knee softened, one hand near instrument stand, direct eye contact into lens, confident expression, controlled editorial energy.

Realism foundation:
- Anatomical plausibility: coherent shoulder-pelvis relationship, correct limb proportions, natural hand articulation, heel-ground load mechanics, and valid center-of-mass balance.
- Optics plausibility: realistic depth of field transitions, no cutout halos, no warped edges, no fake blur.
- Lighting plausibility: practical-source motivated key/fill/rim behavior, coherent shadow direction/penumbra, roughness-aware reflections, Fresnel-consistent highlights.

Anti-AI authenticity constraints:
- Keep skin lifelike with pore detail, subtle tonal variation, and no porcelain smoothing.
- Keep hair lifelike with irregular strand grouping and minor flyaways.
- Keep fabric lifelike with non-repeating microtexture and seam irregularity.
- Preserve slight real-world asymmetry in makeup, textile tension, and prop placement.
- Reject outputs with uncanny eyes, plastic skin, rubber fabric, repeated texture stamps, or composited subject separation.

Frontier physics controls:
- Simulate wrinkle hierarchy from first principles: macro gravity folds, meso seam-anchored buckling, micro high-frequency creasing in strain concentration zones.
- Enforce contact mechanics: where body/garment/surface meet, show pressure flattening, shadow occlusion, and material-dependent friction behavior.
- Enforce textile constitutive behavior: stretch anisotropy, bias-direction drape differences, and edge curl response tied to fabric stiffness.
- Enforce two-piece coupling mechanics: top hem stability vs skirt waistband load, phase-lag motion between upper/lower garments, and realistic gap dynamics under torso flexion.
- Enforce attachment realism: strap tension vectors, anchor-point compression, and closure hardware response under motion.
- Enforce optics coherence: polarization-like sheen behavior on satin/hosiery, roughness-dependent specular lobe width, and exposure-consistent highlight rolloff.
- Enforce sensor realism: realistic highlight clipping knees, subtle chroma noise in shadows, and no procedural overcleaning.

Cutting-edge simulation and rendering protocol (last-4-month focus, Dec 2025-Feb 2026):
- PhysDrape-style force pipeline (Feb 2026): infer residual deformation with explicit force balancing, then apply strict differentiable collision projection to eliminate interpenetration without destroying cloth shape.
- ReWeaver-style garment structure prior (Jan 2026): preserve panel/seam logic and topological consistency so deformations remain simulation-ready, not texture-only approximations.
- FNOPT-style rollout strategy (Dec 2025): perform resolution-agnostic coarse-to-fine integration; coarse motion must remain stable before adding medium and micro wrinkle detail.
- PI-Light-style transport prior (Jan 2026): preserve physically plausible diffuse/specular separation under relighting-like changes; highlights should move with light, not with texture.
- RotLight-style ambiguity control (Feb 2026): suppress baked shadows in albedo-like regions and maintain lighting/material disentanglement across reflective textiles.
- Two-piece dynamics priority: top and skirt exchange motion cues through waist/hip acceleration while retaining independent inertia and damping.
- Reject any frame where contact, wrinkle evolution, seam behavior, or reflectance changes are not causally explainable.

Innovation motif: mixed warm/cool key conflict resolved through physically plausible skin/subsurface response and tux-lapel directional sheen anisotropy.

Attire impact through physics (primary):
- Build a contour-forward two-piece silhouette via strain maps, seam load paths, and controlled tension around bustline/waist/hip/upper leg.
- Use top-vs-skirt interaction physics: independent motion with believable timing offsets and no fused-garment behavior.
- Use slit dynamics tied to pose/gravity so opening behavior follows leg angle and movement.
- Use sheer optical behavior through denier gradients and layered occlusion, never as flat painted transparency.
- Use phase-aware motion transfer: torso acceleration drives delayed hem response, then damping settles folds without jitter.

Material system (primary):
- Satin/silk: anisotropic highlight flow, gravity drape vectors, compression folds at contact points.
- Velvet: direction-dependent pile shading and contact darkening.
- Sequins/crystals: controlled spark distribution with micro-normal variation, no random glitter noise.
- Hosiery: thigh-band compression transition, stretch over knee contour, ankle micro-wrinkling, directional sheen.
- Two-piece structure: waistband bending stiffness, top hem recovery, and closure/strap tension that remains physically plausible frame to frame.
- Use shell-like bending behavior cues (Kirchhoff-Love style): smooth curvature in low-strain zones and tight buckling only near constrained seams.

Editorial risk energy (primary, non-explicit):
- Keep wardrobe and pose bold, assertive, and fashion-forward while staying non-explicit.
- Favor long leg-line projection, strong S-curve torso-leg flow, and confident chin/eye tension.
- Keep full outfit readable in frame with contour-defining light placement.

Camera and render intent:
- Vertical 4:5 framing, output target 2K.
- Lens behavior should feel like premium editorial capture (roughly 50-85mm equivalent perspective).
- Filmic noise only, no heavy denoise smear, no oversharpen halos, no synthetic texture mush.

Environment integration:
- Subject must physically belong in the set: contact shadows, reflection coherence, and interaction with nearby surfaces.
- Haze should add depth separation without washing contrast.
- Keep practical highlights and reflective cues consistent with object roughness and angle.

Extreme realism audit (primary):
- Validate physically causal links: pose -> tension map -> fold pattern -> highlight path -> shadow placement.
- Any non-causal cloth fold, reflection mismatch, or eye-direction inconsistency is a hard failure.
- Preserve cinematic boldness while remaining fully believable as a real photographed moment.

Quality gate (primary):
- Real-camera believability under close inspection.
- No broken fingers, no warped feet, no fabric clipping, no face drift, no incorrect eye direction.
- Deliver a high-end Vegas editorial still with strong, edge-forward style and uncompromised realism.

AUDIT-V6 QUALITY ENFORCEMENT (PRIMARY, HARD):
- Two-piece topology lock: render two physically separate garments with a visible waist separation line in final frame.
- Forbidden substitutions: one-piece dress, bodysuit, jumpsuit, romper, faux-cutout single-panel dress.
- Material-color lock: keep prompt-specified material and color family dominant and unmistakable.
- Edge mood lock: premium nightlife contrast only; no flat, casual, daylight, or domestic snapshot lighting.
- Pose-energy lock: assertive editorial posture with strong leg-line projection and clear silhouette readability.
- Physics innovation stack:
  - XPBD-like cloth constraint hierarchy (seam stiffness > panel stiffness > edge drape compliance).
  - Frictional garment-skin contact with pressure-gradient shading at garment boundaries.
  - Top/skirt phase-lag dynamics with waist-coupled impulse transfer.
  - Anisotropic textile BRDF plus denier-dependent hosiery translucency.
- Regenerate if any appear: fused top/skirt silhouette, prompt-material substitution, weak contour separation, or non-causal fold/specular behavior.

DEVILS-ADVOCATE MICRO-PHYSICS ESCALATION (PRIMARY, HARD):
- Reject any image where cloth realism could be explained by flat texture mapping alone.
- Enforce multi-band wrinkle spectra tied to stress tensors:
  - micro band: 2-4 mm crease ripples at high-strain seams,
  - meso band: 6-12 mm folds along bias/shear flow,
  - macro band: 20-40 mm gravity drape lobes.
- Enforce stitch-pull periodicity and seam-ridge relief (about 1-3 mm apparent depth) at structural joins.
- Enforce contact indentation at support edges (about 0.5-2.0 mm apparent compression) with narrow occlusion gradients.
- Enforce slit-edge slip-stick mechanics: brief friction hold, controlled release, damped settling; no teleporting hem shapes.
- Enforce hosiery denier optics as physics, not paint: yarn-direction anisotropic sheen, knee/quad stretch brightening, thigh-band pressure transition.
- Enforce skin-optics micro-consistency near garment boundaries: subtle desaturation/compression zones, non-uniform micro-spec breakup.
- Enforce material energy conservation: lambertian + specular balance remains plausible under mixed practical lights.
- Enforce geometric penumbra correctness at thin edges (straps, slit hems, hair strands): no fake ambient smudge shadows.
- Force-chain closure test (must pass): pose load -> local strain -> fold orientation -> highlight elongation -> shadow penumbra.

V9 MICRO-PHYSICS DEEPENING PROTOCOL (HARD):
Primary variant: push non-explicit editorial edge via high-density causal micro-physics and strict two-piece topology integrity.
- Per-zone ledger requirement (must read clearly at 100% zoom): top support edge, waist transition, slit boundary, thigh band, knee contour, ankle/instep, heel-floor contact, hand-prop contact.
- Each zone must display at least 3 coherent cues: strain gradient, seam relief, compression shadow, anisotropic highlight flow, denier gradient, friction-damped drape, support-anchor pressure.
- Causality chain must close: pose/load -> strain field -> fold orientation -> highlight elongation -> penumbra geometry.
- Hosiery micro-physics: yarn-direction sheen, denier-dependent translucency, thigh-band pressure transition, and knee stretch brightening without painted transparency artifacts.
- Skin-edge coupling: subtle compression/desaturation near garment boundaries with non-uniform micro-spec breakup (no hard masks).
- Two-piece mechanics: top hem and skirt waistband remain visually separate and dynamically coupled with phase-lag, never merged into one-piece behavior.
- Optical realism: reflections/shadows must be light-source motivated and roughness-consistent; reject detached highlights and ambient-smudge shadows.
- Rehearsal tux lock: stage-practical motivated shadows must govern garment contours and lapel specular response.
- Rehearsal anchor lock: upright bass + trumpet stand + music stand sheets must remain physically grounded with coherent occlusion and reflections.
SCORER-ALIGNED CONSISTENCY LOCK:
- Keep direct lens-locked gaze with believable vergence and eyelid tension in final frame.
- Preserve identity fidelity under mixed practical light; no face drift under pose/exposure shifts.
- Enforce complete wardrobe replacement from reference clothing cues.
- If diagnostics criticize prompt adherence, treat output as failed and regenerate with stricter scene/material matching.
- Editorial guardrail: bold but non-explicit, premium nightlife campaign intent only.
V11 FIRST-PRINCIPLES PHYSICS CONTRACT (HARD):
- Color-family lock (hard fail on drift): attire dominant hue/material family must match prompt palette, not generic black/red substitutions.
- Scene-anchor lock (hard fail on drift): keep at least 3 named environment anchors physically present and optically coherent in-frame.
- Lens-lock gaze certainty: iris direction lens-centered with stable catchlight geometry and believable vergence in final frame.
- Edge-separation lock: preserve clean subject-background contour gradients and physically plausible rim/fill transitions (no flat ambient wash).
- Coverage-stability lock: maintain non-explicit support geometry under motion; no safety-ambiguous reveal edges or unstable cutline artifacts.
- 100% zoom micro-audit: seam ridge depth, denier gradient, contact compression, anisotropic spec flow, and penumbra continuity must all cohere.

### Safe Backup Prompt

FIRST-PRINCIPLES TARGET:
Make a believable real camera capture, not an AI-looking render. If directives conflict, prioritize: (1) identity fidelity, (2) direct eye contact to lens, (3) physical plausibility of anatomy/materials/light, (4) editorial risk energy, (5) style details.

Identity lock (non-negotiable): use the provided reference image as the sole identity source for the same adult woman (25+). Preserve face geometry and recognition cues: eye spacing, brow arc, orbital depth, nose bridge, mouth width, chin contour, jawline, hairline pattern, natural asymmetry, and skin undertone. Do not drift into a different person under any lighting or pose.

Gaze lock (hard rule): subject must look directly into the camera lens in the final frame. Keep iris/pupil direction lens-centered with believable vergence and eyelid tension. No off-camera gaze, no downcast eyes, no profile-only eye direction.

Scene:
Keep the same Vegas speakeasy environment with jazz rehearsal corner with upright bass, trumpet stand, music stand sheets, mixed warm practical and cool edge light, textured haze. Maintain the same cinematic mood, depth layering, and practical-light logic.

Attire (safe fallback variant):
black tux-inspired two-piece cocktail set: satin-lapel top and a skirt with moderate slit, black thigh-high hosiery, pointed pumps
Coverage is safer, but the image must still read as bold and high-impact through physically grounded fit, silhouette, hosiery optics, two-piece coupling realism, and pose confidence.

Pose and narrative:
weight shifted to rear leg, front knee softened, one hand near instrument stand, direct eye contact into lens, poised confidence, premium editorial tone.

Realism foundation:
- Anatomical plausibility: coherent shoulder-pelvis relationship, correct limb proportions, natural hand articulation, heel-ground load mechanics, and valid center-of-mass balance.
- Optics plausibility: realistic depth of field transitions, no cutout halos, no warped edges, no fake blur.
- Lighting plausibility: practical-source motivated key/fill/rim behavior, coherent shadow direction/penumbra, roughness-aware reflections, Fresnel-consistent highlights.

Anti-AI authenticity constraints:
- Keep skin lifelike with pore detail, subtle tonal variation, and no porcelain smoothing.
- Keep hair lifelike with irregular strand grouping and minor flyaways.
- Keep fabric lifelike with non-repeating microtexture and seam irregularity.
- Preserve slight real-world asymmetry in makeup, textile tension, and prop placement.
- Reject outputs with uncanny eyes, plastic skin, rubber fabric, repeated texture stamps, or composited subject separation.

Frontier physics controls:
- Simulate wrinkle hierarchy from first principles: macro gravity folds, meso seam-anchored buckling, micro high-frequency creasing in strain concentration zones.
- Enforce contact mechanics: where body/garment/surface meet, show pressure flattening, shadow occlusion, and material-dependent friction behavior.
- Enforce textile constitutive behavior: stretch anisotropy, bias-direction drape differences, and edge curl response tied to fabric stiffness.
- Enforce two-piece coupling mechanics: top hem stability vs skirt waistband load, phase-lag motion between upper/lower garments, and realistic gap dynamics under torso flexion.
- Enforce attachment realism: strap tension vectors, anchor-point compression, and closure hardware response under motion.
- Enforce optics coherence: polarization-like sheen behavior on satin/hosiery, roughness-dependent specular lobe width, and exposure-consistent highlight rolloff.
- Enforce sensor realism: realistic highlight clipping knees, subtle chroma noise in shadows, and no procedural overcleaning.

Cutting-edge simulation and rendering protocol (last-4-month focus, Dec 2025-Feb 2026):
- PhysDrape-style force pipeline (Feb 2026): infer residual deformation with explicit force balancing, then apply strict differentiable collision projection to eliminate interpenetration without destroying cloth shape.
- ReWeaver-style garment structure prior (Jan 2026): preserve panel/seam logic and topological consistency so deformations remain simulation-ready, not texture-only approximations.
- FNOPT-style rollout strategy (Dec 2025): perform resolution-agnostic coarse-to-fine integration; coarse motion must remain stable before adding medium and micro wrinkle detail.
- PI-Light-style transport prior (Jan 2026): preserve physically plausible diffuse/specular separation under relighting-like changes; highlights should move with light, not with texture.
- RotLight-style ambiguity control (Feb 2026): suppress baked shadows in albedo-like regions and maintain lighting/material disentanglement across reflective textiles.
- Two-piece dynamics priority: top and skirt exchange motion cues through waist/hip acceleration while retaining independent inertia and damping.
- Reject any frame where contact, wrinkle evolution, seam behavior, or reflectance changes are not causally explainable.

Safe adaptation of innovation motif:
Innovation motif: mixed warm/cool key conflict resolved through physically plausible skin/subsurface response and tux-lapel directional sheen anisotropy.

Attire impact through physics (safe fallback):
- Keep safer two-piece coverage geometry while still maintaining a high-impact editorial silhouette through fit tension and contour lighting.
- Preserve believable top/waistband coupling with secure support behavior and stable anchor mechanics.
- Preserve slit/hem movement logic and hosiery optics with the same physical rigor.
- Maintain non-explicit but bold visual energy via posture, gaze, and material response.
- Use conservative but explicit damping cues: motion settles naturally, with no frozen cloth or chaotic flutter.

Material system (safe fallback):
- Preserve all high-fidelity fabric behavior: drape, crease hierarchy, seam stress, contact compression, and realistic sheen.
- Hosiery must remain physically convincing: denier gradients, stretch maps, cuff pressure transitions, and ankle micro-creases.
- Preserve two-piece physics integrity: top and skirt can move independently while remaining cohesively styled and mechanically stable.

Editorial continuity (safe fallback):
- Keep the same scene, camera realism, and direct-lens eye contact as primary.
- Avoid making safe variant look plain; it must still read as premium nightlife couture.
- Preserve strong silhouette legibility and high-fashion intent.

Camera and render intent:
- Vertical 4:5 framing, output target 2K.
- Photographic realism over stylization, with coherent DOF and physically motivated lighting.
- Keep texture integrity in skin, hair, lace/mesh, and hosiery edges.

Environment integration:
- Keep subject physically anchored to set via contact shadows, reflection consistency, and realistic surface interactions.
- Maintain scene depth through controlled haze and practical-light separation.

Quality gate (safe fallback):
- No identity drift, no uncanny anatomy, no artificial skin smoothing, no fake transparency, no reflection mismatch.
- Final image must look camera-captured, luxurious, and believable.

AUDIT-V6 QUALITY ENFORCEMENT (SAFE, HARD):
- Keep safer coverage, but preserve explicit two-piece topology with visible top hem and separate skirt waistband.
- Forbidden substitutions remain: one-piece dress, bodysuit, jumpsuit, romper, faux-cutout single-panel dress.
- Maintain prompt-specified material and color family so safe variant still matches the concept.
- Maintain edgy nightlife mood via controlled contrast, directional practical light, and subject-background separation.
- Keep the same physics rigor:
  - Stable garment support mechanics in coverage-critical zones.
  - Contact-compression cues at skin/garment and garment/surface interfaces.
  - Top/skirt decoupled inertia with coherent damping and slit response.
  - Hosiery optics from denier gradients and stretch-driven shading.
- Regenerate if safe variant looks plain/casual, loses two-piece identity, or shows non-causal cloth/light behavior.

---

DEVILS-ADVOCATE MICRO-PHYSICS ESCALATION (SAFE, HARD):
- Keep safe coverage, but apply the same micro-physics rigor and reject texture-only pseudo-realism.
- Preserve multi-band wrinkle spectra (micro/meso/macro) with stress-aligned orientation and stable damping.
- Preserve seam/stitch relief cues and waistband/top-hem contact compression under safe-support constraints.
- Preserve hosiery denier micro-optics (anisotropic yarn sheen, stretch transitions, thigh-band compression gradient).
- Preserve slip-stick hem dynamics and friction-coupled contact at seating/rail/bar interfaces.
- Preserve edge-penumbra correctness and avoid painted AO artifacts at thin geometry boundaries.
- Safe does not mean flat: maintain high-fidelity micro-causality while preventing topology collapse to one-piece silhouettes.

---

V9 MICRO-PHYSICS DEEPENING PROTOCOL (HARD):
Safe variant: keep coverage-stable geometry while maximizing editorial edge through physically grounded contour, translucency windows, and strain logic.
- Per-zone ledger requirement (must read clearly at 100% zoom): top support edge, waist transition, slit boundary, thigh band, knee contour, ankle/instep, heel-floor contact, hand-prop contact.
- Each zone must display at least 3 coherent cues: strain gradient, seam relief, compression shadow, anisotropic highlight flow, denier gradient, friction-damped drape, support-anchor pressure.
- Causality chain must close: pose/load -> strain field -> fold orientation -> highlight elongation -> penumbra geometry.
- Hosiery micro-physics: yarn-direction sheen, denier-dependent translucency, thigh-band pressure transition, and knee stretch brightening without painted transparency artifacts.
- Skin-edge coupling: subtle compression/desaturation near garment boundaries with non-uniform micro-spec breakup (no hard masks).
- Two-piece mechanics: top hem and skirt waistband remain visually separate and dynamically coupled with phase-lag, never merged into one-piece behavior.
- Optical realism: reflections/shadows must be light-source motivated and roughness-consistent; reject detached highlights and ambient-smudge shadows.
- Rehearsal tux lock: stage-practical motivated shadows must govern garment contours and lapel specular response.
- Rehearsal anchor lock: upright bass + trumpet stand + music stand sheets must remain physically grounded with coherent occlusion and reflections.
SCORER-ALIGNED CONSISTENCY LOCK:
- Keep direct lens-locked gaze with believable vergence and eyelid tension in final frame.
- Preserve identity fidelity under mixed practical light; no face drift under pose/exposure shifts.
- Enforce complete wardrobe replacement from reference clothing cues.
- If diagnostics criticize prompt adherence, treat output as failed and regenerate with stricter scene/material matching.
- Safety guardrail: no nudity, no explicit framing, no fetish framing, no unstable reveal artifacts.
V11 SAFE FIRST-PRINCIPLES PHYSICS CONTRACT (HARD):
- Safe does not mean generic: preserve prompt-specific palette and scene anchors while maintaining coverage-stable geometry.
- Color lock: safe attire must stay within the named palette and material family, with no neutralized wardrobe substitution.
- Scene lock: preserve at least 3 named environment anchors with coherent reflections/shadows and contact cues.
- Lens-lock gaze certainty: direct camera eye alignment with credible eyelid tension and catchlight placement.
- Physics lock: maintain two-piece topology, denier optics, seam relief, and contact-compression causality at 100% inspection.

---

## Prompt 20 - Rain Window Noir Finale

- Primary word count: 1624
- Safe word count: 1477

### Primary Prompt

FIRST-PRINCIPLES TARGET:
Make a believable real camera capture, not an AI-looking render. If directives conflict, prioritize: (1) identity fidelity, (2) direct eye contact to lens, (3) physical plausibility of anatomy/materials/light, (4) editorial risk energy, (5) style details.

Identity lock (non-negotiable): use the provided reference image as the sole identity source for the same adult woman (25+). Preserve face geometry and recognition cues: eye spacing, brow arc, orbital depth, nose bridge, mouth width, chin contour, jawline, hairline pattern, natural asymmetry, and skin undertone. Do not drift into a different person under any lighting or pose.

Gaze lock (hard rule): subject must look directly into the camera lens in the final frame. Keep iris/pupil direction lens-centered with believable vergence and eyelid tension. No off-camera gaze, no downcast eyes, no profile-only eye direction.

Scene:
Vegas speakeasy environment with window booth with rain-streaked glass, neon refraction, candle flame flicker, deep noir atmosphere. Build layered depth (foreground cues, subject mid-plane, background practicals). Subject must feel physically present in the environment.

Attire (primary edge variant):
black crystal-embellished two-piece cocktail set: sculpted top and a dramatic high-slit skirt, black sheer thigh-high hosiery, crystal stilettos
Use reveal-by-physics rather than explicit framing: contour fit, strain gradients, seam tension maps, and pose-driven two-piece behavior.
Hard two-piece rule: top and skirt must behave as distinct garments with coherent coupling at the waist region, not as a single merged dress.

Pose and narrative:
seated-to-rise transition beside window booth, hand on tabletop, elegant balance, direct eye contact into lens, confident expression, controlled editorial energy.

Realism foundation:
- Anatomical plausibility: coherent shoulder-pelvis relationship, correct limb proportions, natural hand articulation, heel-ground load mechanics, and valid center-of-mass balance.
- Optics plausibility: realistic depth of field transitions, no cutout halos, no warped edges, no fake blur.
- Lighting plausibility: practical-source motivated key/fill/rim behavior, coherent shadow direction/penumbra, roughness-aware reflections, Fresnel-consistent highlights.

Anti-AI authenticity constraints:
- Keep skin lifelike with pore detail, subtle tonal variation, and no porcelain smoothing.
- Keep hair lifelike with irregular strand grouping and minor flyaways.
- Keep fabric lifelike with non-repeating microtexture and seam irregularity.
- Preserve slight real-world asymmetry in makeup, textile tension, and prop placement.
- Reject outputs with uncanny eyes, plastic skin, rubber fabric, repeated texture stamps, or composited subject separation.

Frontier physics controls:
- Simulate wrinkle hierarchy from first principles: macro gravity folds, meso seam-anchored buckling, micro high-frequency creasing in strain concentration zones.
- Enforce contact mechanics: where body/garment/surface meet, show pressure flattening, shadow occlusion, and material-dependent friction behavior.
- Enforce textile constitutive behavior: stretch anisotropy, bias-direction drape differences, and edge curl response tied to fabric stiffness.
- Enforce two-piece coupling mechanics: top hem stability vs skirt waistband load, phase-lag motion between upper/lower garments, and realistic gap dynamics under torso flexion.
- Enforce attachment realism: strap tension vectors, anchor-point compression, and closure hardware response under motion.
- Enforce optics coherence: polarization-like sheen behavior on satin/hosiery, roughness-dependent specular lobe width, and exposure-consistent highlight rolloff.
- Enforce sensor realism: realistic highlight clipping knees, subtle chroma noise in shadows, and no procedural overcleaning.

Cutting-edge simulation and rendering protocol (last-4-month focus, Dec 2025-Feb 2026):
- PhysDrape-style force pipeline (Feb 2026): infer residual deformation with explicit force balancing, then apply strict differentiable collision projection to eliminate interpenetration without destroying cloth shape.
- ReWeaver-style garment structure prior (Jan 2026): preserve panel/seam logic and topological consistency so deformations remain simulation-ready, not texture-only approximations.
- FNOPT-style rollout strategy (Dec 2025): perform resolution-agnostic coarse-to-fine integration; coarse motion must remain stable before adding medium and micro wrinkle detail.
- PI-Light-style transport prior (Jan 2026): preserve physically plausible diffuse/specular separation under relighting-like changes; highlights should move with light, not with texture.
- RotLight-style ambiguity control (Feb 2026): suppress baked shadows in albedo-like regions and maintain lighting/material disentanglement across reflective textiles.
- Two-piece dynamics priority: top and skirt exchange motion cues through waist/hip acceleration while retaining independent inertia and damping.
- Reject any frame where contact, wrinkle evolution, seam behavior, or reflectance changes are not causally explainable.

Innovation motif: rain-streaked window refraction vectors + neon chromatic bleed, synchronized with top-waistband coupling topology during seated-to-rise transition.

Attire impact through physics (primary):
- Build a contour-forward two-piece silhouette via strain maps, seam load paths, and controlled tension around bustline/waist/hip/upper leg.
- Use top-vs-skirt interaction physics: independent motion with believable timing offsets and no fused-garment behavior.
- Use slit dynamics tied to pose/gravity so opening behavior follows leg angle and movement.
- Use sheer optical behavior through denier gradients and layered occlusion, never as flat painted transparency.
- Use phase-aware motion transfer: torso acceleration drives delayed hem response, then damping settles folds without jitter.

Material system (primary):
- Satin/silk: anisotropic highlight flow, gravity drape vectors, compression folds at contact points.
- Velvet: direction-dependent pile shading and contact darkening.
- Sequins/crystals: controlled spark distribution with micro-normal variation, no random glitter noise.
- Hosiery: thigh-band compression transition, stretch over knee contour, ankle micro-wrinkling, directional sheen.
- Two-piece structure: waistband bending stiffness, top hem recovery, and closure/strap tension that remains physically plausible frame to frame.
- Use shell-like bending behavior cues (Kirchhoff-Love style): smooth curvature in low-strain zones and tight buckling only near constrained seams.

Editorial risk energy (primary, non-explicit):
- Keep wardrobe and pose bold, assertive, and fashion-forward while staying non-explicit.
- Favor long leg-line projection, strong S-curve torso-leg flow, and confident chin/eye tension.
- Keep full outfit readable in frame with contour-defining light placement.

Camera and render intent:
- Vertical 4:5 framing, output target 2K.
- Lens behavior should feel like premium editorial capture (roughly 50-85mm equivalent perspective).
- Filmic noise only, no heavy denoise smear, no oversharpen halos, no synthetic texture mush.

Environment integration:
- Subject must physically belong in the set: contact shadows, reflection coherence, and interaction with nearby surfaces.
- Haze should add depth separation without washing contrast.
- Keep practical highlights and reflective cues consistent with object roughness and angle.

Extreme realism audit (primary):
- Validate physically causal links: pose -> tension map -> fold pattern -> highlight path -> shadow placement.
- Any non-causal cloth fold, reflection mismatch, or eye-direction inconsistency is a hard failure.
- Preserve cinematic boldness while remaining fully believable as a real photographed moment.

Quality gate (primary):
- Real-camera believability under close inspection.
- No broken fingers, no warped feet, no fabric clipping, no face drift, no incorrect eye direction.
- Deliver a high-end Vegas editorial still with strong, edge-forward style and uncompromised realism.

AUDIT-V6 QUALITY ENFORCEMENT (PRIMARY, HARD):
- Two-piece topology lock: render two physically separate garments with a visible waist separation line in final frame.
- Forbidden substitutions: one-piece dress, bodysuit, jumpsuit, romper, faux-cutout single-panel dress.
- Material-color lock: keep prompt-specified material and color family dominant and unmistakable.
- Edge mood lock: premium nightlife contrast only; no flat, casual, daylight, or domestic snapshot lighting.
- Pose-energy lock: assertive editorial posture with strong leg-line projection and clear silhouette readability.
- Physics innovation stack:
  - XPBD-like cloth constraint hierarchy (seam stiffness > panel stiffness > edge drape compliance).
  - Frictional garment-skin contact with pressure-gradient shading at garment boundaries.
  - Top/skirt phase-lag dynamics with waist-coupled impulse transfer.
  - Anisotropic textile BRDF plus denier-dependent hosiery translucency.
- Regenerate if any appear: fused top/skirt silhouette, prompt-material substitution, weak contour separation, or non-causal fold/specular behavior.

DEVILS-ADVOCATE MICRO-PHYSICS ESCALATION (PRIMARY, HARD):
- Reject any image where cloth realism could be explained by flat texture mapping alone.
- Enforce multi-band wrinkle spectra tied to stress tensors:
  - micro band: 2-4 mm crease ripples at high-strain seams,
  - meso band: 6-12 mm folds along bias/shear flow,
  - macro band: 20-40 mm gravity drape lobes.
- Enforce stitch-pull periodicity and seam-ridge relief (about 1-3 mm apparent depth) at structural joins.
- Enforce contact indentation at support edges (about 0.5-2.0 mm apparent compression) with narrow occlusion gradients.
- Enforce slit-edge slip-stick mechanics: brief friction hold, controlled release, damped settling; no teleporting hem shapes.
- Enforce hosiery denier optics as physics, not paint: yarn-direction anisotropic sheen, knee/quad stretch brightening, thigh-band pressure transition.
- Enforce skin-optics micro-consistency near garment boundaries: subtle desaturation/compression zones, non-uniform micro-spec breakup.
- Enforce material energy conservation: lambertian + specular balance remains plausible under mixed practical lights.
- Enforce geometric penumbra correctness at thin edges (straps, slit hems, hair strands): no fake ambient smudge shadows.
- Force-chain closure test (must pass): pose load -> local strain -> fold orientation -> highlight elongation -> shadow penumbra.

V9 MICRO-PHYSICS DEEPENING PROTOCOL (HARD):
Primary variant: push non-explicit editorial edge via high-density causal micro-physics and strict two-piece topology integrity.
- Per-zone ledger requirement (must read clearly at 100% zoom): top support edge, waist transition, slit boundary, thigh band, knee contour, ankle/instep, heel-floor contact, hand-prop contact.
- Each zone must display at least 3 coherent cues: strain gradient, seam relief, compression shadow, anisotropic highlight flow, denier gradient, friction-damped drape, support-anchor pressure.
- Causality chain must close: pose/load -> strain field -> fold orientation -> highlight elongation -> penumbra geometry.
- Hosiery micro-physics: yarn-direction sheen, denier-dependent translucency, thigh-band pressure transition, and knee stretch brightening without painted transparency artifacts.
- Skin-edge coupling: subtle compression/desaturation near garment boundaries with non-uniform micro-spec breakup (no hard masks).
- Two-piece mechanics: top hem and skirt waistband remain visually separate and dynamically coupled with phase-lag, never merged into one-piece behavior.
- Optical realism: reflections/shadows must be light-source motivated and roughness-consistent; reject detached highlights and ambient-smudge shadows.
- Rain-window finale lock: droplet refraction and window reflections must match scene depth and focal plane transitions.
SCORER-ALIGNED CONSISTENCY LOCK:
- Keep direct lens-locked gaze with believable vergence and eyelid tension in final frame.
- Preserve identity fidelity under mixed practical light; no face drift under pose/exposure shifts.
- Enforce complete wardrobe replacement from reference clothing cues.
- If diagnostics criticize prompt adherence, treat output as failed and regenerate with stricter scene/material matching.
- Editorial guardrail: bold but non-explicit, premium nightlife campaign intent only.
V11 FIRST-PRINCIPLES PHYSICS CONTRACT (HARD):
- Color-family lock (hard fail on drift): attire dominant hue/material family must match prompt palette, not generic black/red substitutions.
- Scene-anchor lock (hard fail on drift): keep at least 3 named environment anchors physically present and optically coherent in-frame.
- Lens-lock gaze certainty: iris direction lens-centered with stable catchlight geometry and believable vergence in final frame.
- Edge-separation lock: preserve clean subject-background contour gradients and physically plausible rim/fill transitions (no flat ambient wash).
- Coverage-stability lock: maintain non-explicit support geometry under motion; no safety-ambiguous reveal edges or unstable cutline artifacts.
- 100% zoom micro-audit: seam ridge depth, denier gradient, contact compression, anisotropic spec flow, and penumbra continuity must all cohere.

### Safe Backup Prompt

FIRST-PRINCIPLES TARGET:
Make a believable real camera capture, not an AI-looking render. If directives conflict, prioritize: (1) identity fidelity, (2) direct eye contact to lens, (3) physical plausibility of anatomy/materials/light, (4) editorial risk energy, (5) style details.

Identity lock (non-negotiable): use the provided reference image as the sole identity source for the same adult woman (25+). Preserve face geometry and recognition cues: eye spacing, brow arc, orbital depth, nose bridge, mouth width, chin contour, jawline, hairline pattern, natural asymmetry, and skin undertone. Do not drift into a different person under any lighting or pose.

Gaze lock (hard rule): subject must look directly into the camera lens in the final frame. Keep iris/pupil direction lens-centered with believable vergence and eyelid tension. No off-camera gaze, no downcast eyes, no profile-only eye direction.

Scene:
Keep the same Vegas speakeasy environment with window booth with rain-streaked glass, neon refraction, candle flame flicker, deep noir atmosphere. Maintain the same cinematic mood, depth layering, and practical-light logic.

Attire (safe fallback variant):
black embellished two-piece cocktail set: fuller-coverage top and a skirt with reduced slit, black thigh-high hosiery, crystal pumps
Coverage is safer, but the image must still read as bold and high-impact through physically grounded fit, silhouette, hosiery optics, two-piece coupling realism, and pose confidence.

Pose and narrative:
seated-to-rise transition beside window booth, hand on tabletop, elegant balance, direct eye contact into lens, poised confidence, premium editorial tone.

Realism foundation:
- Anatomical plausibility: coherent shoulder-pelvis relationship, correct limb proportions, natural hand articulation, heel-ground load mechanics, and valid center-of-mass balance.
- Optics plausibility: realistic depth of field transitions, no cutout halos, no warped edges, no fake blur.
- Lighting plausibility: practical-source motivated key/fill/rim behavior, coherent shadow direction/penumbra, roughness-aware reflections, Fresnel-consistent highlights.

Anti-AI authenticity constraints:
- Keep skin lifelike with pore detail, subtle tonal variation, and no porcelain smoothing.
- Keep hair lifelike with irregular strand grouping and minor flyaways.
- Keep fabric lifelike with non-repeating microtexture and seam irregularity.
- Preserve slight real-world asymmetry in makeup, textile tension, and prop placement.
- Reject outputs with uncanny eyes, plastic skin, rubber fabric, repeated texture stamps, or composited subject separation.

Frontier physics controls:
- Simulate wrinkle hierarchy from first principles: macro gravity folds, meso seam-anchored buckling, micro high-frequency creasing in strain concentration zones.
- Enforce contact mechanics: where body/garment/surface meet, show pressure flattening, shadow occlusion, and material-dependent friction behavior.
- Enforce textile constitutive behavior: stretch anisotropy, bias-direction drape differences, and edge curl response tied to fabric stiffness.
- Enforce two-piece coupling mechanics: top hem stability vs skirt waistband load, phase-lag motion between upper/lower garments, and realistic gap dynamics under torso flexion.
- Enforce attachment realism: strap tension vectors, anchor-point compression, and closure hardware response under motion.
- Enforce optics coherence: polarization-like sheen behavior on satin/hosiery, roughness-dependent specular lobe width, and exposure-consistent highlight rolloff.
- Enforce sensor realism: realistic highlight clipping knees, subtle chroma noise in shadows, and no procedural overcleaning.

Cutting-edge simulation and rendering protocol (last-4-month focus, Dec 2025-Feb 2026):
- PhysDrape-style force pipeline (Feb 2026): infer residual deformation with explicit force balancing, then apply strict differentiable collision projection to eliminate interpenetration without destroying cloth shape.
- ReWeaver-style garment structure prior (Jan 2026): preserve panel/seam logic and topological consistency so deformations remain simulation-ready, not texture-only approximations.
- FNOPT-style rollout strategy (Dec 2025): perform resolution-agnostic coarse-to-fine integration; coarse motion must remain stable before adding medium and micro wrinkle detail.
- PI-Light-style transport prior (Jan 2026): preserve physically plausible diffuse/specular separation under relighting-like changes; highlights should move with light, not with texture.
- RotLight-style ambiguity control (Feb 2026): suppress baked shadows in albedo-like regions and maintain lighting/material disentanglement across reflective textiles.
- Two-piece dynamics priority: top and skirt exchange motion cues through waist/hip acceleration while retaining independent inertia and damping.
- Reject any frame where contact, wrinkle evolution, seam behavior, or reflectance changes are not causally explainable.

Safe adaptation of innovation motif:
Innovation motif: rain-streaked window refraction vectors + neon chromatic bleed, synchronized with top-waistband coupling topology during seated-to-rise transition.

Attire impact through physics (safe fallback):
- Keep safer two-piece coverage geometry while still maintaining a high-impact editorial silhouette through fit tension and contour lighting.
- Preserve believable top/waistband coupling with secure support behavior and stable anchor mechanics.
- Preserve slit/hem movement logic and hosiery optics with the same physical rigor.
- Maintain non-explicit but bold visual energy via posture, gaze, and material response.
- Use conservative but explicit damping cues: motion settles naturally, with no frozen cloth or chaotic flutter.

Material system (safe fallback):
- Preserve all high-fidelity fabric behavior: drape, crease hierarchy, seam stress, contact compression, and realistic sheen.
- Hosiery must remain physically convincing: denier gradients, stretch maps, cuff pressure transitions, and ankle micro-creases.
- Preserve two-piece physics integrity: top and skirt can move independently while remaining cohesively styled and mechanically stable.

Editorial continuity (safe fallback):
- Keep the same scene, camera realism, and direct-lens eye contact as primary.
- Avoid making safe variant look plain; it must still read as premium nightlife couture.
- Preserve strong silhouette legibility and high-fashion intent.

Camera and render intent:
- Vertical 4:5 framing, output target 2K.
- Photographic realism over stylization, with coherent DOF and physically motivated lighting.
- Keep texture integrity in skin, hair, lace/mesh, and hosiery edges.

Environment integration:
- Keep subject physically anchored to set via contact shadows, reflection consistency, and realistic surface interactions.
- Maintain scene depth through controlled haze and practical-light separation.

Quality gate (safe fallback):
- No identity drift, no uncanny anatomy, no artificial skin smoothing, no fake transparency, no reflection mismatch.
- Final image must look camera-captured, luxurious, and believable.

AUDIT-V6 QUALITY ENFORCEMENT (SAFE, HARD):
- Keep safer coverage, but preserve explicit two-piece topology with visible top hem and separate skirt waistband.
- Forbidden substitutions remain: one-piece dress, bodysuit, jumpsuit, romper, faux-cutout single-panel dress.
- Maintain prompt-specified material and color family so safe variant still matches the concept.
- Maintain edgy nightlife mood via controlled contrast, directional practical light, and subject-background separation.
- Keep the same physics rigor:
  - Stable garment support mechanics in coverage-critical zones.
  - Contact-compression cues at skin/garment and garment/surface interfaces.
  - Top/skirt decoupled inertia with coherent damping and slit response.
  - Hosiery optics from denier gradients and stretch-driven shading.
- Regenerate if safe variant looks plain/casual, loses two-piece identity, or shows non-causal cloth/light behavior.

---

DEVILS-ADVOCATE MICRO-PHYSICS ESCALATION (SAFE, HARD):
- Keep safe coverage, but apply the same micro-physics rigor and reject texture-only pseudo-realism.
- Preserve multi-band wrinkle spectra (micro/meso/macro) with stress-aligned orientation and stable damping.
- Preserve seam/stitch relief cues and waistband/top-hem contact compression under safe-support constraints.
- Preserve hosiery denier micro-optics (anisotropic yarn sheen, stretch transitions, thigh-band compression gradient).
- Preserve slip-stick hem dynamics and friction-coupled contact at seating/rail/bar interfaces.
- Preserve edge-penumbra correctness and avoid painted AO artifacts at thin geometry boundaries.
- Safe does not mean flat: maintain high-fidelity micro-causality while preventing topology collapse to one-piece silhouettes.

---

V9 MICRO-PHYSICS DEEPENING PROTOCOL (HARD):
Safe variant: keep coverage-stable geometry while maximizing editorial edge through physically grounded contour, translucency windows, and strain logic.
- Per-zone ledger requirement (must read clearly at 100% zoom): top support edge, waist transition, slit boundary, thigh band, knee contour, ankle/instep, heel-floor contact, hand-prop contact.
- Each zone must display at least 3 coherent cues: strain gradient, seam relief, compression shadow, anisotropic highlight flow, denier gradient, friction-damped drape, support-anchor pressure.
- Causality chain must close: pose/load -> strain field -> fold orientation -> highlight elongation -> penumbra geometry.
- Hosiery micro-physics: yarn-direction sheen, denier-dependent translucency, thigh-band pressure transition, and knee stretch brightening without painted transparency artifacts.
- Skin-edge coupling: subtle compression/desaturation near garment boundaries with non-uniform micro-spec breakup (no hard masks).
- Two-piece mechanics: top hem and skirt waistband remain visually separate and dynamically coupled with phase-lag, never merged into one-piece behavior.
- Optical realism: reflections/shadows must be light-source motivated and roughness-consistent; reject detached highlights and ambient-smudge shadows.
- Rain-window finale lock: droplet refraction and window reflections must match scene depth and focal plane transitions.
SCORER-ALIGNED CONSISTENCY LOCK:
- Keep direct lens-locked gaze with believable vergence and eyelid tension in final frame.
- Preserve identity fidelity under mixed practical light; no face drift under pose/exposure shifts.
- Enforce complete wardrobe replacement from reference clothing cues.
- If diagnostics criticize prompt adherence, treat output as failed and regenerate with stricter scene/material matching.
- Safety guardrail: no nudity, no explicit framing, no fetish framing, no unstable reveal artifacts.
V11 SAFE FIRST-PRINCIPLES PHYSICS CONTRACT (HARD):
- Safe does not mean generic: preserve prompt-specific palette and scene anchors while maintaining coverage-stable geometry.
- Color lock: safe attire must stay within the named palette and material family, with no neutralized wardrobe substitution.
- Scene lock: preserve at least 3 named environment anchors with coherent reflections/shadows and contact cues.
- Lens-lock gaze certainty: direct camera eye alignment with credible eyelid tension and catchlight placement.
- Physics lock: maintain two-piece topology, denier optics, seam relief, and contact-compression causality at 100% inspection.

---

#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

const PACK_DIR = '/Users/louisherman/ClaudeCodeProjects/projects/imagen-experiments/scripts/vegas/prompt-packs';

const SOURCE_PACKS = [
  'speakeasy_prompts_02_20_continuation.md',
  'speakeasy_prompts_21_40_ultra_edge_v21_daring_microphysics_1500.md',
  'speakeasy_prompts_41_60_ultra_edge_v1_microphysics50.md',
  'speakeasy_prompts_61_80_luxury_suite_v7_microphysics120d.md',
  'speakeasy_prompts_81_100_luxury_suite_v9_devils_advocate_hardened.md'
];

const OUT_ALL = 'speakeasy_prompts_02_100_first_principles_rewrite_v1.md';
const OUT_41_60 = 'speakeasy_prompts_41_60_first_principles_rewrite_v1.md';

function parsePromptSections(markdown) {
  const headingRegex = /^## Prompt\s+(\d{2,3})\s+-\s+(.+)$/gm;
  const headings = [];
  let match;
  while ((match = headingRegex.exec(markdown)) !== null) {
    headings.push({
      id: String(match[1]).padStart(2, '0'),
      title: match[2].trim(),
      start: match.index,
      headingEnd: headingRegex.lastIndex
    });
  }

  const sections = [];
  for (let i = 0; i < headings.length; i += 1) {
    const current = headings[i];
    const next = headings[i + 1];
    const sectionEnd = next ? next.start : markdown.length;
    const sectionText = markdown.slice(current.headingEnd, sectionEnd);

    const primaryMarker = '### Primary Prompt';
    const safeMarker = '### Safe Backup Prompt';
    const primaryIdx = sectionText.indexOf(primaryMarker);
    const safeIdx = sectionText.indexOf(safeMarker);
    if (primaryIdx === -1 || safeIdx === -1 || safeIdx <= primaryIdx) continue;

    const primaryPrompt = sectionText.slice(primaryIdx + primaryMarker.length, safeIdx).trim();
    const safePrompt = sectionText.slice(safeIdx + safeMarker.length).trim();
    if (!primaryPrompt || !safePrompt) continue;

    sections.push({
      id: current.id,
      title: current.title,
      primaryPrompt,
      safePrompt
    });
  }

  return sections;
}

function normalizeLine(line) {
  return line.replace(/^[-*]\s*/, '').replace(/\s+/g, ' ').trim();
}

function isHeadingLine(line) {
  return /^[A-Z][A-Z0-9 ()\/.+,&'\-]{2,}:\s*$/.test(line.trim());
}

function extractBlock(text, headingMatchers) {
  const lines = String(text || '').split(/\r?\n/);
  let start = -1;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (headingMatchers.some((matcher) => matcher.test(line))) {
      start = i + 1;
      break;
    }
  }
  if (start === -1) return '';

  const collected = [];
  for (let i = start; i < lines.length; i += 1) {
    const raw = lines[i];
    const trimmed = raw.trim();
    if (!trimmed) {
      if (collected.length) break;
      continue;
    }
    if (isHeadingLine(trimmed)) break;
    collected.push(normalizeLine(trimmed));
  }

  const deduped = [];
  const seen = new Set();
  for (const item of collected) {
    const key = item.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(item);
    }
  }

  return deduped.join('\n');
}

function toBulletBlock(text, fallback) {
  const source = String(text || '').trim();
  const lines = source
    ? source.split(/\r?\n/).map((line) => normalizeLine(line)).filter(Boolean)
    : [fallback];
  return lines.map((line) => `- ${line}`).join('\n');
}

function sanitizeForStrictMode(text) {
  const replacements = [
    [/\bsultry\b/gi, 'intimate'],
    [/\bsensual\b/gi, 'close-range'],
    [/\bdaring\b/gi, 'assertive'],
    [/\brevealing\b/gi, 'high-cut'],
    [/\bprovocative\b/gi, 'high-tension'],
    [/\bseductive\b/gi, 'confident'],
    [/\bsexy\b/gi, 'editorial']
  ];
  let output = String(text || '');
  for (const [pattern, replacement] of replacements) {
    output = output.replace(pattern, replacement);
  }
  return output;
}

function buildPrimaryPrompt(meta) {
  const concept = toBulletBlock(
    meta.concept,
    `${meta.title.toLowerCase()} with intentional nightlife atmosphere and strong physical plausibility.`
  );
  const scene = toBulletBlock(
    meta.scene,
    'After-hours interior with practical light pools, layered depth, and believable surfaces.'
  );
  const attire = toBulletBlock(
    meta.attire,
    'Preserve exact wardrobe topology, color mapping, seams, and material behavior from reference intent.'
  );
  const pose = toBulletBlock(
    meta.pose,
    'Balanced full-body stance with direct eye contact, active hands, and clear load path.'
  );
  const kinematic = toBulletBlock(
    meta.kinematic,
    'Support reaction -> pelvic orientation -> ribcage counter-rotation -> limb tension -> grounded foot mechanics.'
  );
  const camera = toBulletBlock(
    meta.camera,
    'Full-frame mirrorless profile; close editorial distance; practical key + controlled rim; realistic depth of field.'
  );

  return sanitizeForStrictMode(`MISSION:
Create a premium non-explicit nightlife editorial frame with exact identity fidelity, strong physics realism, and consistent microdetail.

GOAL ORDER (HARD):
1) Identity fidelity + direct lens eye contact.
2) Wardrobe fidelity: exact garment topology, colors, seam map, and material behavior.
3) Pose mechanics: human-plausible balance, support loads, and coherent contact points.
4) Scene credibility: practical-light behavior, depth layering, and surface interaction.
5) Microdetail integrity: skin texture, fabric dynamics, reflection correctness, sensor realism.

NON-EXPLICIT LIMITS (MANDATORY):
- Adult subject only.
- Non-explicit framing only.
- No nudity and no explicit sexual context.

PHYSICS CHECKLIST (ALL MUST PASS):
- Inverse-square practical-light falloff with believable near/far contrast.
- Contact compression and contact shadow coherence at every support interface.
- Stable center-of-mass projection inside support base; no floating load paths.
- Cloth anisotropy and wrinkle hierarchy (macro drape, meso seam buckling, micro strain creases).
- Slit/hem/mesh response follows pose chain and gravity direction.
- Hosiery denier/translucency gradients and cuff-pressure transitions remain coherent.
- Material optics stay distinct: skin soft rolloff, metal tight highlights, satin directional sheen.
- Reflection integrity: no detached reflections, roughness-governed blur/intensity.
- Camera realism: natural grain, no plastic smoothing, plausible depth-of-field transition.

CRITICAL ZONE CHECKLIST (MANDATORY):
- heel-floor contact: compression, shadow anchoring, and toe-roll plausibility.
- thigh-band transition: pressure gradient, translucency change, and skin/fabric boundary continuity.
- slit-boundary mechanics: seam tension, edge curvature, and gravity-aligned opening behavior.
- knee contour + ankle instep: tendon/skin strain alignment with support force.
- hand-support interface: knuckle pressure, tendon engagement, and micro-shadow adhesion.
- jawline/eye-line lock: direct gaze, facial asymmetry realism, and expression control.

SCENE INTENT:
${concept}

SCENE ANCHORS (LOCK):
${scene}

WARDROBE LOCK (EXACT):
${attire}

POSE BLUEPRINT (EXACT):
${pose}

KINEMATIC PATH (LOCK):
${kinematic}

CAMERA + LIGHTING PROFILE:
${camera}

COMPOSITION REQUIREMENTS:
- Full body visible; clear foreground-midground-background separation.
- Strong leading lines toward eyes and face.
- Natural limb spacing, no fused geometry, no mannequin stillness.
- Keep one coherent lens profile and one coherent lighting strategy.

HARD REJECT:
- Identity drift, off-camera gaze, wardrobe topology drift, impossible joints.
- Flat lighting, detached shadows/reflections, plastic skin, geometry collapse.
- Conservative restyle, all-black substitution collapse, one-piece fusion errors.
- Any explicit or disallowed framing.
`);
}

function buildSafePrompt(meta) {
  const scene = toBulletBlock(
    meta.scene,
    'After-hours interior with practical lights, layered depth, and coherent atmosphere.'
  );
  const attire = toBulletBlock(
    meta.attire,
    'Exact wardrobe topology, colors, seam map, and material behavior from primary intent.'
  );
  const pose = toBulletBlock(
    meta.pose,
    'Balanced full-body pose with direct gaze and coherent support mechanics.'
  );
  const kinematic = toBulletBlock(
    meta.kinematic,
    'Support reaction -> pelvic orientation -> ribcage counter-rotation -> limb tension -> grounded foot mechanics.'
  );

  return sanitizeForStrictMode(`MISSION:
Create a stability-safe backup frame preserving the same identity, wardrobe, pose intent, and physics realism with strict non-explicit compliance.

MANDATORY LOCKS:
- Exact identity and direct eye contact.
- Exact wardrobe topology/colors/material behavior.
- Exact pose intent and support mechanics.
- Non-explicit framing and adult-only presentation.

SCENE PRESERVATION:
${scene}

WARDROBE PRESERVATION:
${attire}

POSE + KINEMATIC PRESERVATION:
${pose}
${kinematic}

SAFE PHYSICS CHECKS (ALL PASS):
- Inverse-square light falloff and coherent practical-light gradients.
- Contact compression + contact shadows at heels/seat/hand interfaces.
- Human-plausible center-of-mass support and joint ranges.
- Wrinkle hierarchy and seam-tension continuity under pose load.
- Reflection/contact integrity with no detached artifacts.
- Natural sensor grain and realistic depth transition.

HARD REJECT:
- Identity drift, off-camera gaze, wardrobe drift, geometry fusion.
- Plastic skin, detached shadows/reflections, impossible balance.
- Conservative restyle or explicit framing.
`);
}

function sectionToMeta(section) {
  const source = section.primaryPrompt;
  const concept = extractBlock(source, [/^PROMPT CONCEPT:/i, /^CONCEPT:/i]);
  const scene = extractBlock(source, [/^SCENE ANCHORS\s*(\(.*\))?:/i, /^SCENE:\s*$/i]);
  const attire = extractBlock(source, [/^ATTIRE\s*(\(.*\))?:/i, /^WARDROBE\s*(\(.*\))?:/i]);
  const pose = extractBlock(source, [/^POSE TARGET:/i, /^POSE:\s*$/i]);
  const kinematic = extractBlock(source, [/^KINEMATIC CHAIN:/i, /^MOTION CHAIN:/i]);
  const camera = extractBlock(source, [/^CAMERA PROFILE:/i, /^CAMERA:\s*$/i, /^LENS PROFILE:/i]);

  return {
    id: section.id,
    title: section.title,
    concept,
    scene,
    attire,
    pose,
    kinematic,
    camera
  };
}

function renderSection(meta) {
  const id = String(meta.id).padStart(2, '0');
  const primary = buildPrimaryPrompt(meta);
  const safe = buildSafePrompt(meta);
  return `## Prompt ${id} - ${meta.title}\n\n### Primary Prompt\n\n${primary}\n\n### Safe Backup Prompt\n\n${safe}\n`;
}

function sortByPromptId(a, b) {
  return Number.parseInt(a.id, 10) - Number.parseInt(b.id, 10);
}

async function main() {
  const allSections = new Map();

  for (const filename of SOURCE_PACKS) {
    const full = path.join(PACK_DIR, filename);
    const markdown = await fs.readFile(full, 'utf8');
    for (const section of parsePromptSections(markdown)) {
      allSections.set(section.id, section);
    }
  }

  const metas = Array.from(allSections.values())
    .map(sectionToMeta)
    .sort(sortByPromptId);

  const allOutput = [];
  const subset41_60 = [];

  for (const meta of metas) {
    const idNum = Number.parseInt(meta.id, 10);
    if (idNum < 2 || idNum > 100) continue;
    const block = renderSection(meta);
    allOutput.push(block);
    if (idNum >= 41 && idNum <= 60) {
      subset41_60.push(block);
    }
  }

  const header = '# Speakeasy Prompt Rewrite (First-Principles v1)\n\n'
    + 'From-scratch rewrite focused on: identity lock, wardrobe fidelity, micro-physics realism, and strict non-explicit compliance.\n\n';

  await fs.writeFile(path.join(PACK_DIR, OUT_ALL), `${header}${allOutput.join('\n---\n\n')}`);
  await fs.writeFile(path.join(PACK_DIR, OUT_41_60), `${header}${subset41_60.join('\n---\n\n')}`);

  console.log(JSON.stringify({
    generated: [OUT_ALL, OUT_41_60],
    promptCountAll: allOutput.length,
    promptCount41_60: subset41_60.length,
    minId: metas[0]?.id,
    maxId: metas[metas.length - 1]?.id
  }, null, 2));
}

await main();

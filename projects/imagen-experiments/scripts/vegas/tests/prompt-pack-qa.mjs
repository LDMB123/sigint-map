#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const vegasDir = path.resolve(__dirname, '..');
const defaultPromptFile = path.join(
  vegasDir,
  'prompt-packs',
  'speakeasy_prompts_81_100_luxury_suite_v9_devils_advocate_hardened.md'
);
const promptFile = process.argv[2] || defaultPromptFile;

const REQUIRED_PRIMARY_SUBSTRINGS = [
  'intimate luxury-suite',
  'two-piece lace "evening-gown" sexy attire only (not evening wear)',
  'ASQL anchors (for compositional fidelity):',
  'Scene-graph constraints:',
  '3D spatial scratchpad cues:',
  'Micro-physics and material checks:',
  'Reasoned generation order (think-then-generate style):',
  'Internal verifier (must pass before output):',
  'Reward objective (quality-first):',
  'Reject:'
];

const REQUIRED_SAFE_SUBSTRINGS = [
  'SAFE REALISM LOCK (MANDATORY):',
  'SAFE DIRECTION SUPREMACY:',
  'ASQL + scene-graph minimums:',
  'SAFE MICRO-PHYSICS VERIFIER:',
  'Keep scene intent:'
];

const PRIMARY_WORD_MIN = 680;
const PRIMARY_WORD_MAX = 860;
const SAFE_WORD_MIN = 180;
const SAFE_WORD_MAX = 270;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function wordCount(text) {
  return String(text || '').trim().split(/\s+/).filter(Boolean).length;
}

function parsePromptSections(markdown) {
  const headingRegex = /^## Prompt\s+(\d{2,3})\s+-\s+(.+)$/gm;
  const headings = [];
  let match;
  while ((match = headingRegex.exec(markdown)) !== null) {
    headings.push({
      id: Number(match[1]),
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

    if (primaryIdx === -1 || safeIdx === -1 || safeIdx <= primaryIdx) {
      throw new Error(
        `Prompt ${current.id} (${current.title}) missing required Primary/Safe markers`
      );
    }

    const primary = sectionText
      .slice(primaryIdx + primaryMarker.length, safeIdx)
      .trim();
    const safe = sectionText
      .slice(safeIdx + safeMarker.length)
      .trim();

    sections.push({
      id: current.id,
      title: current.title,
      primary,
      safe
    });
  }

  return sections;
}

function collectCameras(primaryText) {
  const lines = String(primaryText || '').split('\n').map((line) => line.trim());
  const idx = lines.findIndex((line) => line === 'Camera:');
  if (idx === -1 || idx + 1 >= lines.length) {
    return null;
  }
  const cameraLine = lines[idx + 1];
  return cameraLine.endsWith('.') ? cameraLine : null;
}

const markdown = await fs.readFile(promptFile, 'utf8');
const prompts = parsePromptSections(markdown);

assert(prompts.length === 20, `Expected 20 prompts, found ${prompts.length}`);

const ids = prompts.map((p) => p.id).sort((a, b) => a - b);
for (let i = 0; i < ids.length; i += 1) {
  const expected = 81 + i;
  assert(ids[i] === expected, `Expected prompt id ${expected}, found ${ids[i]}`);
}

const titleSet = new Set();
const sceneIntentSet = new Set();
const cameraSet = new Set();
const results = [];

for (const prompt of prompts) {
  assert(!titleSet.has(prompt.title), `Duplicate prompt title detected: "${prompt.title}"`);
  titleSet.add(prompt.title);

  const primaryWords = wordCount(prompt.primary);
  const safeWords = wordCount(prompt.safe);
  assert(
    primaryWords >= PRIMARY_WORD_MIN && primaryWords <= PRIMARY_WORD_MAX,
    `Prompt ${prompt.id} primary word count out of range: ${primaryWords}`
  );
  assert(
    safeWords >= SAFE_WORD_MIN && safeWords <= SAFE_WORD_MAX,
    `Prompt ${prompt.id} safe word count out of range: ${safeWords}`
  );

  for (const token of REQUIRED_PRIMARY_SUBSTRINGS) {
    assert(
      prompt.primary.includes(token),
      `Prompt ${prompt.id} missing required primary section token: ${token}`
    );
  }
  for (const token of REQUIRED_SAFE_SUBSTRINGS) {
    assert(
      prompt.safe.includes(token),
      `Prompt ${prompt.id} missing required safe section token: ${token}`
    );
  }

  const sceneIntentMatch = prompt.safe.match(/Keep scene intent:\s*(.+)\./);
  assert(sceneIntentMatch?.[1], `Prompt ${prompt.id} missing "Keep scene intent" value`);
  const sceneIntent = sceneIntentMatch[1].trim();
  assert(
    sceneIntent.toLowerCase() === prompt.title.toLowerCase(),
    `Prompt ${prompt.id} scene intent mismatch (expected "${prompt.title}", got "${sceneIntent}")`
  );
  assert(!sceneIntentSet.has(sceneIntent), `Duplicate scene intent label: "${sceneIntent}"`);
  sceneIntentSet.add(sceneIntent);

  const cameraLine = collectCameras(prompt.primary);
  assert(cameraLine, `Prompt ${prompt.id} missing camera line after "Camera:"`);
  assert(!cameraSet.has(cameraLine), `Prompt ${prompt.id} duplicates camera settings: "${cameraLine}"`);
  cameraSet.add(cameraLine);

  results.push({
    id: prompt.id,
    title: prompt.title,
    primaryWords,
    safeWords,
    camera: cameraLine
  });
}

const avgPrimaryWords =
  results.reduce((sum, p) => sum + p.primaryWords, 0) / results.length;
const avgSafeWords =
  results.reduce((sum, p) => sum + p.safeWords, 0) / results.length;

console.log(`PASS prompt-pack QA: ${promptFile}`);
console.log(`Prompts validated: ${results.length} (IDs 81-100)`);
console.log(
  `Word budgets: primary avg=${avgPrimaryWords.toFixed(1)} safe avg=${avgSafeWords.toFixed(1)}`
);

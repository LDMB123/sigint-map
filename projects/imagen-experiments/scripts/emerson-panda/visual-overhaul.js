#!/usr/bin/env node

/**
 * Emerson Violin PWA — Visual Overhaul Asset Generator
 * Uses Gemini 3 Pro Image Preview via Vertex AI
 *
 * Generates:
 * - 4 panel header illustrations (480x270 webp, 16:9)
 * - 4 decorative spot illustrations (256x256 png, 1:1)
 * - 2 loading sequence panda illustrations (320x320 webp, 1:1)
 */

import { generateImage } from '../experiments/nanobanana-direct.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PWA_ROOT = path.resolve(__dirname, '../../../emerson-violin-pwa');

const STYLE_BASE = `Cute illustrated children's app style. Warm color palette (cream, rust-orange, forest green accents). Clean vector-like digital illustration, soft rounded shapes. Designed for an 8-year-old audience — playful, encouraging. No text or words in the image.`;

const PANDA_STYLE = `Cute red panda mascot character with expressive dark eyes, fluffy striped rust-orange and cream tail, cream belly and face markings. Consistent cartoon character design.`;

// ── Rate-limit delay (30 seconds between generations) ──

const RATE_LIMIT_DELAY_MS = 30_000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Panel Header Illustrations (16:9, webp) ──

const PANEL_HEADERS = [
  {
    file: 'tools-hero.webp',
    prompt: `${STYLE_BASE} ${PANDA_STYLE} Red panda in a cozy music studio with a violin, tuning fork, and metronome on a warm wooden desk. Children's book watercolor style, warm golden afternoon light, musical notes floating in the air. Wide banner composition.`,
    aspect: '16:9',
  },
  {
    file: 'session-hero.webp',
    prompt: `${STYLE_BASE} ${PANDA_STYLE} Red panda sitting in a bamboo forest clearing meditating with a violin beside them. Zen garden aesthetic, cherry blossom petals falling, children's book watercolor, soft sunrise light. Wide banner composition.`,
    aspect: '16:9',
  },
  {
    file: 'map-hero.webp',
    prompt: `${STYLE_BASE} Overhead view of a whimsical treasure map of a musical land with winding paths through forests, over bridges, past castles. Vintage parchment style with watercolor washes, compass rose. Wide banner composition, warm tones.`,
    aspect: '16:9',
  },
  {
    file: 'ml-hero.webp',
    prompt: `${STYLE_BASE} ${PANDA_STYLE} Red panda wearing tiny scientist goggles in a colorful laboratory with bubbling beakers that emit musical notes. Children's book illustration, purple and teal science glow, friendly and fun. Wide banner composition.`,
    aspect: '16:9',
  },
];

// ── Decorative Spot Illustrations (1:1, png) ──

const SPOT_ILLUSTRATIONS = [
  {
    file: 'empty-recordings.png',
    prompt: `${STYLE_BASE} ${PANDA_STYLE} Cute red panda holding an old-fashioned microphone looking eager to record. Children's sticker style, white background, no shadow. Simple clean icon illustration, centered composition.`,
    aspect: '1:1',
  },
  {
    file: 'empty-scores.png',
    prompt: `${STYLE_BASE} ${PANDA_STYLE} Red panda sitting on a stack of music books looking up at floating golden stars. Children's sticker style, white background, no shadow. Simple clean icon illustration, centered composition.`,
    aspect: '1:1',
  },
  {
    file: 'streak-flame.png',
    prompt: `${STYLE_BASE} A cheerful cartoon flame with a warm red-orange glow and a tiny musical note inside. Children's sticker style, white background, no shadow. Simple clean icon illustration, centered composition.`,
    aspect: '1:1',
  },
  {
    file: 'practice-complete.png',
    prompt: `${STYLE_BASE} ${PANDA_STYLE} Red panda doing a victory dance with confetti and gold stars raining down. Children's sticker style, white background, no shadow. Simple clean icon illustration, centered composition.`,
    aspect: '1:1',
  },
];

// ── Loading Sequence Panda Illustrations (1:1, webp) ──

const LOADING_PANDAS = [
  {
    file: 'panda-tuning.webp',
    prompt: `${STYLE_BASE} ${PANDA_STYLE} Red panda holding a tiny violin to its ear and carefully turning a tuning peg, concentrated expression with one eye squinting. Children's book watercolor, warm cream background. Centered character portrait.`,
    aspect: '1:1',
  },
  {
    file: 'panda-conducting.webp',
    prompt: `${STYLE_BASE} ${PANDA_STYLE} Red panda in a tiny tuxedo conducting an invisible orchestra with a conductor's baton, dramatic and joyful pose. Children's book watercolor, warm cream background. Centered character portrait.`,
    aspect: '1:1',
  },
];

// -------------------------------------------------------------------

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function generate(item, outputDir, label, size = '2K', isFirst = false) {
  const outPath = path.join(outputDir, item.file);

  // Skip if already exists
  try {
    await fs.access(outPath);
    console.log(`   [SKIP] Already exists: ${item.file}`);
    return { path: outPath, skipped: true };
  } catch {
    /* not found, generate */
  }

  // Rate limit delay (skip for very first generation)
  if (!isFirst) {
    console.log(`   [WAIT] Rate limit delay (${RATE_LIMIT_DELAY_MS / 1000}s)...`);
    await sleep(RATE_LIMIT_DELAY_MS);
  }

  console.log(`\n${label} Generating: ${item.file}`);

  try {
    const result = await generateImage({
      prompt: item.prompt,
      aspectRatio: item.aspect || '1:1',
      imageSize: size,
      showThinkingProcess: false,
    });

    if (result.images && result.images.length > 0) {
      await fs.copyFile(result.images[0], outPath);
      const stats = await fs.stat(outPath);
      const sizeKB = (stats.size / 1024).toFixed(1);
      console.log(`   [OK] Saved: ${outPath} (${sizeKB} KB)`);
      return { path: outPath, skipped: false };
    } else {
      console.warn(`   [WARN] No image generated for ${item.file}`);
      return { path: null, skipped: false, error: 'No image returned' };
    }
  } catch (err) {
    console.error(`   [FAIL] ${item.file}: ${err.message}`);
    return { path: null, skipped: false, error: err.message };
  }
}

// -------------------------------------------------------------------

const DIRS = {
  panels: path.join(PWA_ROOT, 'public/assets/illustrations/panels'),
  spots: path.join(PWA_ROOT, 'public/assets/illustrations/spots'),
  panda: path.join(PWA_ROOT, 'public/assets/illustrations/panda'),
};

const command = process.argv[2] || 'all';

console.log('=== Emerson Violin PWA — Visual Overhaul Generator ===');
console.log(`   Command: ${command}`);
console.log(`   PWA Root: ${PWA_ROOT}`);
console.log(`   Rate limit delay: ${RATE_LIMIT_DELAY_MS / 1000}s between generations`);
console.log('');

const results = { generated: 0, skipped: 0, failed: 0 };
let isFirstGeneration = true;

function trackResult(r) {
  if (r.skipped) {
    results.skipped++;
  } else if (r.path) {
    results.generated++;
    isFirstGeneration = false;
  } else {
    results.failed++;
    isFirstGeneration = false;
  }
}

try {
  if (command === 'panels' || command === 'all') {
    await ensureDir(DIRS.panels);
    console.log(`\n--- Generating ${PANEL_HEADERS.length} panel header illustrations ---`);
    for (const item of PANEL_HEADERS) {
      const r = await generate(item, DIRS.panels, '[PANEL]', '2K', isFirstGeneration);
      trackResult(r);
    }
  }

  if (command === 'spots' || command === 'all') {
    await ensureDir(DIRS.spots);
    console.log(`\n--- Generating ${SPOT_ILLUSTRATIONS.length} spot illustrations ---`);
    for (const item of SPOT_ILLUSTRATIONS) {
      const r = await generate(item, DIRS.spots, '[SPOT]', '1K', isFirstGeneration);
      trackResult(r);
    }
  }

  if (command === 'panda' || command === 'all') {
    await ensureDir(DIRS.panda);
    console.log(`\n--- Generating ${LOADING_PANDAS.length} loading panda illustrations ---`);
    for (const item of LOADING_PANDAS) {
      const r = await generate(item, DIRS.panda, '[PANDA]', '1K', isFirstGeneration);
      trackResult(r);
    }
  }

  if (!['panels', 'spots', 'panda', 'all'].includes(command)) {
    console.log(`
Usage:
  node visual-overhaul.js all       — Generate everything (10 images)
  node visual-overhaul.js panels    — Generate 4 panel header illustrations
  node visual-overhaul.js spots     — Generate 4 spot illustrations
  node visual-overhaul.js panda     — Generate 2 loading panda illustrations

Output: ${PWA_ROOT}/public/assets/illustrations/
    `);
  }

  console.log('\n=== Generation Summary ===');
  console.log(`   Generated: ${results.generated}`);
  console.log(`   Skipped:   ${results.skipped}`);
  console.log(`   Failed:    ${results.failed}`);
  console.log(`   Total:     ${results.generated + results.skipped + results.failed}`);
  console.log('=== Complete ===');
} catch (err) {
  console.error(`\n[FATAL] ${err.message}`);
  process.exit(1);
}

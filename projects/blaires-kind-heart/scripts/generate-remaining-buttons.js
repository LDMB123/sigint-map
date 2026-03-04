#!/usr/bin/env node

/**
 * Generate remaining button assets with longer delays to avoid rate limits.
 */

import path from 'path';
import { ensureDir, sleep } from './lib/fs-helpers.mjs';
import { generateImagenFile } from './lib/imagen-file-generator.mjs';

const OUTPUT_DIR = path.join(process.env.HOME, 'imagen-output', 'bkh-buttons');
const NEGATIVE_PROMPT = 'text, words, letters, numbers, watermark, signature, ugly, blurry, low quality, dark, scary, realistic photo, photographic';

await ensureDir(OUTPUT_DIR);

async function generateImage(prompt, filename) {
  console.log(`\n--- Generating: ${filename} ---`);
  const result = await generateImagenFile({
    prompt,
    filename,
    outputDir: OUTPUT_DIR,
    negativePrompt: NEGATIVE_PROMPT,
    skipExisting: true,
    attempts: 2,
    rateLimitDelayMs: 65_000,
    onRateLimit: ({ waitMs }) => {
      console.log(`Rate limited on ${filename} — waiting ${Math.round(waitMs / 1000)} seconds...`);
    },
  });

  if (result.status === 'skipped') {
    console.log(`SKIP: ${filename} already exists`);
    return result;
  }
  if (result.status === 'generated' && result.bytes !== null) {
    console.log(`Saved: ${result.filepath} (${(result.bytes / 1024).toFixed(1)} KB)`);
    return result;
  }
  console.error(`ERROR generating ${filename}:`, result.errorMessage || 'No image data returned');
  return result;
}

const STYLE = 'cute kawaii children\'s illustration style, soft pastel colors, rounded shapes, sparkles and magic stars, whimsical fairy-tale aesthetic, clean flat design with subtle gradients, transparent background, centered icon composition, no text, digital art for a kids app';

// All buttons — will skip already-generated ones
const allButtons = [
  // Home nav
  { name: 'btn-kind-acts.png', prompt: `A glowing pink heart with sparkles and tiny rainbow ribbons wrapped around it, ${STYLE}` },
  { name: 'btn-quests.png', prompt: `A golden star with a magical wand and sparkle trail, quest adventure theme, ${STYLE}` },
  { name: 'btn-stories.png', prompt: `An open storybook with magical sparkles and tiny stars floating out of the pages, fairy tale book, ${STYLE}` },
  { name: 'btn-stickers.png', prompt: `A collection of cute shiny stickers with a large glowing star in the center, sticker collection reward theme, ${STYLE}` },
  { name: 'btn-games.png', prompt: `A colorful game controller made of candy and rainbows with sparkle effects, fun games theme, ${STYLE}` },
  { name: 'btn-my-week.png', prompt: `A blooming sunflower with a small calendar showing growing progress bars, weekly progress garden theme, ${STYLE}` },
  { name: 'btn-show-mom.png', prompt: `A celebration party popper with confetti hearts and stars bursting out, celebration sharing theme, ${STYLE}` },
];

console.log('=== Generating remaining button assets ===');

let generated = 0;
let skipped = 0;
let failed = 0;
for (const btn of allButtons) {
  try {
    const result = await generateImage(btn.prompt, btn.name);
    if (result.status === 'generated') generated++;
    if (result.status === 'skipped') skipped++;
    if (result.status === 'failed') failed++;
  } catch (err) {
    failed++;
    console.error(`Failed ${btn.name}:`, err instanceof Error ? err.message : String(err));
  }
  // 12-second delay between calls to stay well under rate limits
  console.log('  (waiting 12s before next...)');
  await sleep(12_000);
}

console.log(`\n=== Done: ${generated} generated, ${skipped} skipped, ${failed} failed ===`);
console.log(`Output: ${OUTPUT_DIR}`);

#!/usr/bin/env node

/**
 * Generate act category + game card button assets.
 */

import path from 'path';
import { ensureDir, sleep } from './lib/fs-helpers.mjs';
import { generateImagenFile } from './lib/imagen-file-generator.mjs';

const OUTPUT_DIR = path.join(process.env.HOME, 'imagen-output', 'bkh-buttons');
const NEGATIVE_PROMPT = 'text, words, letters, numbers, watermark, signature, ugly, blurry, low quality, dark, scary, realistic photo';

await ensureDir(OUTPUT_DIR);

async function generateImage(prompt, filename, retries = 1) {
  console.log(`Generating: ${filename}`);
  const result = await generateImagenFile({
    prompt,
    filename,
    outputDir: OUTPUT_DIR,
    negativePrompt: NEGATIVE_PROMPT,
    skipExisting: true,
    attempts: retries + 1,
    rateLimitDelayMs: 65_000,
    onRateLimit: () => {
      console.log('  Rate limited — waiting 65s then retrying...');
    },
  });

  if (result.status === 'skipped') {
    console.log(`SKIP: ${filename} exists`);
    return result;
  }
  if (result.status === 'generated' && result.bytes !== null) {
    console.log(`  Saved: ${filename} (${(result.bytes / 1024).toFixed(0)} KB)`);
    return result;
  }
  console.error(`  ERROR: ${result.errorMessage || 'No image data returned'}`);
  return result;
}

const STYLE = 'cute kawaii children\'s illustration style, soft pastel colors, rounded shapes, sparkles and magic stars, whimsical fairy-tale aesthetic, clean flat design with subtle gradients, transparent background, centered icon composition, no text, digital art for a kids app';

const buttons = [
  // Act category buttons
  { name: 'btn-act-hug.png', prompt: `Two cute cartoon characters hugging warmly with pink hearts floating around them, warm embrace kindness theme, ${STYLE}` },
  { name: 'btn-act-nice-words.png', prompt: `A cute speech bubble with a smiling face and tiny hearts, kind words and compliments theme, ${STYLE}` },
  { name: 'btn-act-sharing.png', prompt: `Two hands sharing a colorful gift box with sparkles, sharing and generosity theme, ${STYLE}` },
  { name: 'btn-act-helping.png', prompt: `A cute cartoon hand helping another hand up with sparkles and a rainbow, helping others theme, ${STYLE}` },
  { name: 'btn-act-love.png', prompt: `A large sparkling purple heart surrounded by smaller pink and gold hearts with magic dust, love and care theme, ${STYLE}` },
  { name: 'btn-act-unicorn.png', prompt: `A magical sparkly unicorn with rainbow mane and horn glowing with magic, special magical kindness theme, ${STYLE}` },
  // Game card buttons
  { name: 'btn-game-catcher.png', prompt: `A cute basket catching falling hearts and stars from the sky, catching kindness game theme, ${STYLE}` },
  { name: 'btn-game-memory.png', prompt: `Cute matching cards flipping over to reveal hearts and stars, memory matching card game theme, ${STYLE}` },
  { name: 'btn-game-hug.png', prompt: `A cute teddy bear giving a big warm hug with love hearts surrounding it, virtual hug game theme, ${STYLE}` },
  { name: 'btn-game-paint.png', prompt: `A magical paintbrush painting rainbow colors and sparkles on a canvas, creative painting game theme, ${STYLE}` },
  { name: 'btn-game-unicorn.png', prompt: `A baby unicorn running through a magical rainbow forest with sparkle friends, unicorn adventure game theme, ${STYLE}` },
];

console.log(`=== Generating ${buttons.length} act + game assets ===`);
let generated = 0;
let skipped = 0;
let failed = 0;
for (const btn of buttons) {
  try {
    const result = await generateImage(btn.prompt, btn.name);
    if (result.status === 'generated') generated++;
    if (result.status === 'skipped') skipped++;
    if (result.status === 'failed') failed++;
  } catch (error) {
    failed++;
    console.error(`Failed ${btn.name}:`, error instanceof Error ? error.message : String(error));
  }
  await sleep(12_000);
}
console.log(`\n=== Done: ${generated} generated, ${skipped} skipped, ${failed} failed (${buttons.length} total) ===`);

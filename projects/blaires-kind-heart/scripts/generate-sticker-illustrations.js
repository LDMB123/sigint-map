#!/usr/bin/env node

/**
 * Blaire's Kind Heart — Sticker Illustration Generator
 *
 * Generates 22 sticker illustrations (celebration, nature, achievement,
 * and mastery badges) using Gemini 3 Pro Image Preview via Vertex AI.
 *
 * Uses the nanobanana-direct.js module from imagen-experiments.
 * Includes skip-if-exists logic so it can be safely re-run.
 * 65-second delay between API calls to avoid rate limits.
 */

import { generateImage } from '../../imagen-experiments/scripts/experiments/nanobanana-direct.js';
import fs from 'fs/promises';
import path from 'path';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUTPUT_DIR = path.join(ROOT, 'assets', 'illustrations', 'stickers');

const STYLE_PREFIX = 'Cute watercolor sticker illustration, soft pastel palette, circular shape, white outline border, kid-friendly, no text';

const DELAY_MS = 65_000; // 65 seconds between API calls (API allows ~2 RPM)
const MAX_RETRIES = 3;   // Retry up to 3 times on rate-limit (429) errors

// ═══════════════════════════════════════════════════════════════
// 22 Sticker illustrations
// ═══════════════════════════════════════════════════════════════

const STICKERS = [
  // Celebration
  { filename: 'confetti-ball.png', prompt: 'colorful confetti ball bursting with rainbow sparkles and streamers' },
  { filename: 'tanabata-tree.png', prompt: 'decorated wish tree with colorful paper strips and ribbons hanging from branches' },
  // Star/Heart
  { filename: 'glowing-star.png', prompt: 'bright golden star with warm glow rays radiating outward' },
  { filename: 'heart-ribbon.png', prompt: 'purple heart wrapped in a pink ribbon bow' },
  // Nature
  { filename: 'bird.png', prompt: 'cute small bluebird singing with music notes floating around' },
  { filename: 'sunshine.png', prompt: 'happy warm sun with gentle golden rays' },
  { filename: 'tulip.png', prompt: 'pink tulip flower in full bloom with green stem' },
  // Achievement
  { filename: 'garden-hero.png', prompt: 'sunflower wearing a tiny golden trophy crown, garden champion' },
  { filename: 'kindness-champion.png', prompt: 'glowing star with a small golden trophy, kindness award badge' },
  { filename: 'super-helper.png', prompt: 'purple heart with a gold star overlay, helper badge' },
  // Bronze Mastery
  { filename: 'mastery-bronze-sharing.png', prompt: 'bronze medal with two small hands sharing a gift, warm copper tones' },
  { filename: 'mastery-bronze-helping.png', prompt: 'bronze medal with two small hands reaching out to help, warm copper tones' },
  { filename: 'mastery-bronze-hug.png', prompt: 'bronze medal with two small arms hugging a heart, warm copper tones' },
  { filename: 'mastery-bronze-love.png', prompt: 'bronze medal with a glowing pink heart, warm copper tones' },
  // Silver Mastery
  { filename: 'mastery-silver-sharing.png', prompt: 'silver medal with two small hands sharing a gift, cool silver and white tones' },
  { filename: 'mastery-silver-helping.png', prompt: 'silver medal with two small hands reaching out to help, cool silver and white tones' },
  { filename: 'mastery-silver-hug.png', prompt: 'silver medal with two small arms hugging a heart, cool silver and white tones' },
  { filename: 'mastery-silver-love.png', prompt: 'silver medal with a glowing pink heart, cool silver and white tones' },
  // Gold Mastery
  { filename: 'mastery-gold-sharing.png', prompt: 'golden trophy with two small hands sharing a gift, rich gold and amber tones' },
  { filename: 'mastery-gold-helping.png', prompt: 'golden trophy with two small hands reaching out to help, rich gold and amber tones' },
  { filename: 'mastery-gold-hug.png', prompt: 'golden trophy with two small arms hugging a heart, rich gold and amber tones' },
  { filename: 'mastery-gold-love.png', prompt: 'golden trophy with a glowing pink heart, rich gold and amber tones' },
];

// ═══════════════════════════════════════════════════════════════

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log('='.repeat(60));
  console.log('Blaire\'s Kind Heart — Sticker Illustration Generator');
  console.log('='.repeat(60));
  console.log(`Output directory: ${OUTPUT_DIR}`);
  console.log(`Style prefix: ${STYLE_PREFIX.substring(0, 60)}...`);
  console.log(`Aspect ratio: 1:1 (square stickers)`);
  console.log(`Delay between calls: ${DELAY_MS / 1000}s`);
  console.log();

  // Ensure output directory exists
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  // Build flat list of all images to generate
  const allImages = STICKERS.map((sticker) => ({
    filename: sticker.filename,
    prompt: `${STYLE_PREFIX}, ${sticker.prompt}`,
    outputPath: path.join(OUTPUT_DIR, sticker.filename),
  }));

  console.log(`Total stickers to process: ${allImages.length}`);
  console.log();

  let generated = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < allImages.length; i++) {
    const item = allImages[i];
    const label = `[${i + 1}/${allImages.length}] ${item.filename}`;

    // Skip if file already exists
    if (await fileExists(item.outputPath)) {
      console.log(`${label} — SKIP (already exists)`);
      skipped++;
      continue;
    }

    console.log(`${label} — Generating...`);

    let success = false;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const result = await generateImage({
          prompt: item.prompt,
          aspectRatio: '1:1',
          imageSize: '1K',
          showThinkingProcess: false,
        });

        if (result.images && result.images.length > 0) {
          // Move the generated image from nanobanana output dir to our target path
          const sourcePath = result.images[0];
          await fs.copyFile(sourcePath, item.outputPath);
          // Clean up the temp file
          await fs.unlink(sourcePath).catch(() => {});

          const stats = await fs.stat(item.outputPath);
          const sizeKB = (stats.size / 1024).toFixed(0);
          console.log(`  OK: ${item.filename} (${sizeKB} KB)`);
          generated++;
          success = true;
          break;
        } else {
          console.error(`  EMPTY: No image returned (attempt ${attempt}/${MAX_RETRIES})`);
        }
      } catch (err) {
        const is429 = err.message.includes('429') || err.message.includes('RESOURCE_EXHAUSTED');
        if (is429 && attempt < MAX_RETRIES) {
          const backoff = attempt * 60_000; // 60s, 120s, 180s
          console.log(`  RATE LIMITED (attempt ${attempt}/${MAX_RETRIES}), waiting ${backoff / 1000}s...`);
          await sleep(backoff);
          continue;
        }
        console.error(`  ERROR: ${item.filename} — ${err.message.substring(0, 120)}`);
        break;
      }
    }

    if (!success) {
      failed++;
    }

    // Delay between calls (skip after last image)
    if (i < allImages.length - 1) {
      const nextItem = allImages[i + 1];
      const nextExists = await fileExists(nextItem.outputPath);
      if (!nextExists) {
        console.log(`  Waiting ${DELAY_MS / 1000}s before next request...`);
        await sleep(DELAY_MS);
      }
    }
  }

  console.log();
  console.log('='.repeat(60));
  console.log('Summary');
  console.log('='.repeat(60));
  console.log(`  Generated: ${generated}`);
  console.log(`  Skipped:   ${skipped}`);
  console.log(`  Failed:    ${failed}`);
  console.log(`  Total:     ${allImages.length}`);
  console.log();

  if (failed > 0) {
    console.log('Some stickers failed. Re-run this script to retry (skip-if-exists).');
  } else if (generated === 0 && skipped === allImages.length) {
    console.log('All stickers already exist. Nothing to generate.');
  } else {
    console.log('All stickers generated successfully!');
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

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
import path from 'path';
import { runNanobananaBatch } from './lib/nanobanana-batch-runner.mjs';

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

async function main() {
  // Build flat list of all images to generate
  const allImages = STICKERS.map((sticker) => ({
    filename: sticker.filename,
    prompt: `${STYLE_PREFIX}, ${sticker.prompt}`,
    aspectRatio: '1:1',
    outputPath: path.join(OUTPUT_DIR, sticker.filename),
  }));

  await runNanobananaBatch({
    title: "Blaire's Kind Heart — Sticker Illustration Generator",
    outputDir: OUTPUT_DIR,
    items: allImages,
    delayMs: DELAY_MS,
    maxRetries: MAX_RETRIES,
    generateImage,
    itemLabel: (item, index, total) => `[${index + 1}/${total}] ${item.filename}`,
  });
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

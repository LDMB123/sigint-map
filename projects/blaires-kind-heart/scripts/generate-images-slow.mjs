#!/usr/bin/env node

/**
 * Blaire's Kind Heart — Slow Image Generation (1 at a time, respects rate limits)
 * Only generates images that don't already exist on disk.
 */

import path from 'path';
import { fileExists, sleep, writeBase64Image } from './lib/fs-helpers.mjs';
import { requestImagenBase64 } from './lib/imagen-client.mjs';

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || 'gen-lang-client-0925343693';
const ROOT = path.resolve(import.meta.dirname, '..');

const NEG = 'text, watermark, signature, words, letters, numbers, logo, realistic human face, scary, dark, horror, violence, blood';
const STYLE = 'cute kawaii children illustration, soft pastel colors, rounded shapes, friendly, warm lighting, simple clean background, storybook art style, digital painting';
const STICKER_STYLE = 'kawaii sticker design, cute chibi style, thick outline, bright colors, glossy finish, centered on white background, no text, single character or object';
const ICON_STYLE = 'app icon design, flat illustration, vibrant colors, centered, clean edges, simple, modern, kid-friendly';

async function generateImage({ prompt, outputPath, aspectRatio = '1:1' }) {
  // Skip if already exists
  if (await fileExists(outputPath)) {
    console.log(`  SKIP (exists): ${path.basename(outputPath)}`);
    return outputPath;
  }

  console.log(`  Generating: ${path.basename(outputPath)}...`);

  for (let attempt = 1; attempt <= 3; attempt++) {
    const result = await requestImagenBase64({
      prompt,
      aspectRatio,
      negativePrompt: NEG,
      projectId: PROJECT_ID,
    });

    if (result.ok && result.bytesBase64Encoded) {
      const bytes = await writeBase64Image(outputPath, result.bytesBase64Encoded);
      console.log(`  OK: ${path.basename(outputPath)} (${(bytes / 1024).toFixed(0)} KB)`);
      return outputPath;
    }

    if (result.status === 429) {
      const waitMs = attempt * 15_000;
      console.log(`  Rate limited, waiting ${waitMs / 1000}s (attempt ${attempt}/3)...`);
      await sleep(waitMs);
      continue;
    }

    const errorMessage = result.errorMessage || 'No image data returned';
    if (!result.ok) {
      console.error(`  FAILED: ${path.basename(outputPath)} — ${errorMessage}`);
      return null;
    }
    console.error(`  EMPTY: ${path.basename(outputPath)}`);
    if (attempt < 3) {
      await sleep(attempt * 10_000);
    }
  }
  return null;
}

// ═══════════════════════════════════════════
// ALL IMAGES (same definitions as main script)
// ═══════════════════════════════════════════

const ALL_IMAGES = [
  // App Icons
  { prompt: `${ICON_STYLE}, a magical glowing pink heart with tiny sparkles and a small unicorn horn on top, pastel pink and purple gradient background, love and kindness theme`, outputPath: path.join(ROOT, 'assets/icons/app-icon-512.png') },
  { prompt: `${ICON_STYLE}, a magical glowing pink heart with sparkles around it, a small white unicorn silhouette inside the heart, soft pink background, app icon for a kids kindness app`, outputPath: path.join(ROOT, 'assets/icons/app-icon-192.png') },

  // Story Covers
  { prompt: `${STYLE}, a small cute white bunny with big eyes sitting in a lush green garden with pink flowers and soft sunlight filtering through, storybook cover illustration`, outputPath: path.join(ROOT, 'assets/illustrations/stories/lost-bunny-cover.png') },
  { prompt: `${STYLE}, two small children sharing a colorful umbrella in gentle rain, puddles with reflections, soft blue and purple tones, cozy and happy mood, storybook cover`, outputPath: path.join(ROOT, 'assets/illustrations/stories/rainy-day-cover.png') },
  { prompt: `${STYLE}, a cheerful garden scene with bright sunflowers, tulips and daisies, a small watering can, butterflies, warm golden sunlight, storybook cover illustration`, outputPath: path.join(ROOT, 'assets/illustrations/stories/garden-surprise-cover.png') },
  { prompt: `${STYLE}, a friendly scene at a colorful playground with swings and slide, two small children waving to each other, warm happy atmosphere, storybook cover illustration`, outputPath: path.join(ROOT, 'assets/illustrations/stories/new-kid-cover.png') },
  { prompt: `${STYLE}, two small children sitting at a table sharing a sandwich and cookies, lunchbox open, warm cozy cafeteria, friendship and sharing theme, storybook cover`, outputPath: path.join(ROOT, 'assets/illustrations/stories/sharing-lunch-cover.png') },

  // Story Scenes
  { prompt: `${STYLE}, a small cute bunny looking lost and sad in a garden path with flowers, soft lighting, gentle atmosphere, children's book page illustration`, outputPath: path.join(ROOT, 'assets/illustrations/stories/lost-bunny-1.png'), aspectRatio: '3:4' },
  { prompt: `${STYLE}, a family of cute white bunnies happily reunited under a big oak tree, hearts floating above them, warm golden sunset light, children's book illustration`, outputPath: path.join(ROOT, 'assets/illustrations/stories/lost-bunny-end.png'), aspectRatio: '3:4' },
  { prompt: `${STYLE}, two small children walking happily together under a big colorful umbrella in the rain, splashing in a puddle, joyful expressions, children's book illustration`, outputPath: path.join(ROOT, 'assets/illustrations/stories/rainy-day-sharing.png'), aspectRatio: '3:4' },
  { prompt: `${STYLE}, two small children sitting at a cozy table with warm hot cocoa, steaming mugs, rain on windows, warm and happy, children's book illustration`, outputPath: path.join(ROOT, 'assets/illustrations/stories/rainy-day-end.png'), aspectRatio: '3:4' },
  { prompt: `${STYLE}, a small child carefully watering droopy flowers in a garden with a cute watering can, flowers beginning to perk up, sunshine, children's book illustration`, outputPath: path.join(ROOT, 'assets/illustrations/stories/garden-watering.png'), aspectRatio: '3:4' },
  { prompt: `${STYLE}, a grandmother hugging a small child in a beautiful blooming garden, sunflowers and roses, warm golden light, love and happiness, children's book illustration`, outputPath: path.join(ROOT, 'assets/illustrations/stories/garden-end.png'), aspectRatio: '3:4' },
  { prompt: `${STYLE}, a small child sitting alone on a bench at a colorful playground, looking shy and nervous, gentle empathetic mood, children's book illustration`, outputPath: path.join(ROOT, 'assets/illustrations/stories/new-kid-alone.png'), aspectRatio: '3:4' },
  { prompt: `${STYLE}, two small children playing together on swings at a colorful playground, big smiles, sunshine and rainbow, best friends, children's book illustration`, outputPath: path.join(ROOT, 'assets/illustrations/stories/new-kid-end.png'), aspectRatio: '3:4' },
  { prompt: `${STYLE}, a small child offering half a sandwich to a friend who forgot their lunchbox, kind gesture, warm cafeteria, children's book illustration`, outputPath: path.join(ROOT, 'assets/illustrations/stories/sharing-lunch-offer.png'), aspectRatio: '3:4' },
  { prompt: `${STYLE}, two small children happily eating lunch together sharing cookies, hearts floating, warm cozy feeling, best friends, children's book illustration`, outputPath: path.join(ROOT, 'assets/illustrations/stories/sharing-lunch-end.png'), aspectRatio: '3:4' },

  // Sparkle unicorn companion
  { prompt: `${STYLE}, a magical sparkly unicorn character floating with rainbow trail, cute companion character for kids app, white body, pink and purple mane, friendly expression, isolated on transparent-feeling soft pastel background`, outputPath: path.join(ROOT, 'assets/illustrations/blaire/sparkle-unicorn.png') },

  // Backgrounds
  { prompt: `soft pastel gradient background, pink to lavender to light blue, smooth, dreamy, subtle sparkle texture, no objects, abstract, children's app background`, outputPath: path.join(ROOT, 'assets/illustrations/backgrounds/home-bg.png'), aspectRatio: '3:4' },
  { prompt: `soft pastel green meadow background with tiny flowers and butterflies, dreamy, children's illustration style, gentle, no text, subtle, wallpaper pattern`, outputPath: path.join(ROOT, 'assets/illustrations/backgrounds/tracker-bg.png'), aspectRatio: '3:4' },
  { prompt: `soft pastel purple and blue starry sky background, gentle twinkling stars, dreamy clouds, children's illustration style, magical atmosphere, no text`, outputPath: path.join(ROOT, 'assets/illustrations/backgrounds/rewards-bg.png'), aspectRatio: '3:4' },

  // Stickers - Unicorns
  { prompt: `${STICKER_STYLE}, a cute rainbow unicorn with sparkly mane, happy expression, kawaii`, outputPath: path.join(ROOT, 'assets/illustrations/stickers/unicorn-rainbow.png') },
  { prompt: `${STICKER_STYLE}, a sparkling white unicorn surrounded by tiny stars and glitter, magical`, outputPath: path.join(ROOT, 'assets/illustrations/stickers/unicorn-sparkle.png') },
  { prompt: `${STICKER_STYLE}, a cute unicorn casting magic from its horn, purple and blue sparkles`, outputPath: path.join(ROOT, 'assets/illustrations/stickers/unicorn-magic.png') },
  { prompt: `${STICKER_STYLE}, a cute unicorn sitting on a golden star, dreamy starry background`, outputPath: path.join(ROOT, 'assets/illustrations/stickers/unicorn-star.png') },
  { prompt: `${STICKER_STYLE}, a cute purple unicorn with a flower crown, gentle smile`, outputPath: path.join(ROOT, 'assets/illustrations/stickers/unicorn-purple.png') },
  // Stickers - Celebration
  { prompt: `${STICKER_STYLE}, a single shiny red balloon floating with a cute bow, simple`, outputPath: path.join(ROOT, 'assets/illustrations/stickers/balloon-red.png') },
  { prompt: `${STICKER_STYLE}, two colorful balloons tied together, pink and blue, festive`, outputPath: path.join(ROOT, 'assets/illustrations/stickers/balloon-double.png') },
  { prompt: `${STICKER_STYLE}, a cute party popper exploding with confetti and streamers, celebration`, outputPath: path.join(ROOT, 'assets/illustrations/stickers/party-popper.png') },
  // Stickers - Hearts & Stars
  { prompt: `${STICKER_STYLE}, a glowing purple heart with tiny sparkles, magical love symbol`, outputPath: path.join(ROOT, 'assets/illustrations/stickers/heart-purple.png') },
  { prompt: `${STICKER_STYLE}, a bright gold star with a smiley face, simple and cheerful`, outputPath: path.join(ROOT, 'assets/illustrations/stickers/star-gold.png') },
  { prompt: `${STICKER_STYLE}, a sparkling pink heart with a golden ribbon bow`, outputPath: path.join(ROOT, 'assets/illustrations/stickers/heart-sparkling.png') },
  // Stickers - Animals
  { prompt: `${STICKER_STYLE}, a cute fluffy white bunny with big sparkly eyes and pink cheeks`, outputPath: path.join(ROOT, 'assets/illustrations/stickers/bunny.png') },
  { prompt: `${STICKER_STYLE}, a cute golden puppy with floppy ears, happy tongue out, adorable`, outputPath: path.join(ROOT, 'assets/illustrations/stickers/puppy.png') },
  { prompt: `${STICKER_STYLE}, a cute calico kitten with big eyes, playful pose, kawaii`, outputPath: path.join(ROOT, 'assets/illustrations/stickers/kitty.png') },
  { prompt: `${STICKER_STYLE}, a beautiful colorful butterfly with pastel wings, simple and elegant`, outputPath: path.join(ROOT, 'assets/illustrations/stickers/butterfly.png') },
  // Stickers - Nature
  { prompt: `${STICKER_STYLE}, a bright happy sunflower with a cute smiley face`, outputPath: path.join(ROOT, 'assets/illustrations/stickers/sunflower.png') },
  { prompt: `${STICKER_STYLE}, a cheerful rainbow arc with small clouds on each end, colorful`, outputPath: path.join(ROOT, 'assets/illustrations/stickers/rainbow.png') },
  { prompt: `${STICKER_STYLE}, a cute cherry blossom branch with soft pink petals floating`, outputPath: path.join(ROOT, 'assets/illustrations/stickers/cherry-blossom.png') },
  // Stickers - Streak Milestones
  { prompt: `${STICKER_STYLE}, a cute kawaii flame character, friendly fire emoji style, achievement badge, warm orange and red`, outputPath: path.join(ROOT, 'assets/illustrations/stickers/streak-3-fire.png') },
  { prompt: `${STICKER_STYLE}, a sparkling blue gemstone crystal, magical glow, achievement badge`, outputPath: path.join(ROOT, 'assets/illustrations/stickers/streak-7-gem.png') },
  { prompt: `${STICKER_STYLE}, a cute golden crown with sparkles and jewels, royal achievement`, outputPath: path.join(ROOT, 'assets/illustrations/stickers/streak-14-crown.png') },
  { prompt: `${STICKER_STYLE}, a shiny golden trophy cup with sparkles, champion achievement, celebration`, outputPath: path.join(ROOT, 'assets/illustrations/stickers/streak-30-trophy.png') },
  // Ultimate sticker
  { prompt: `${STICKER_STYLE}, a majestic unicorn wearing a golden crown, rainbow mane, sparkles everywhere, ultimate achievement, special premium feeling`, outputPath: path.join(ROOT, 'assets/illustrations/stickers/unicorn-queen.png') },
];

async function main() {
  console.log('Blaire\'s Kind Heart — Slow Image Generation');
  console.log(`${ALL_IMAGES.length} total images, skipping existing files\n`);

  let success = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < ALL_IMAGES.length; i++) {
    const item = ALL_IMAGES[i];

    // Check if exists
    if (await fileExists(item.outputPath)) {
      console.log(`[${i + 1}/${ALL_IMAGES.length}] SKIP: ${path.basename(item.outputPath)}`);
      skipped++;
      continue;
    }

    console.log(`[${i + 1}/${ALL_IMAGES.length}]`);
    const result = await generateImage(item);
    if (result) {
      success++;
    } else {
      failed++;
    }

    // 6 second delay between requests to stay under rate limit
    if (i < ALL_IMAGES.length - 1) {
      await sleep(6_000);
    }
  }

  console.log(`\nDone: ${success} generated, ${skipped} skipped, ${failed} failed`);
}

main().catch(console.error);

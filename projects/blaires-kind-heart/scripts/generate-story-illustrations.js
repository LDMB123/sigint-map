#!/usr/bin/env node

/**
 * Blaire's Kind Heart — Story Illustration Generator
 *
 * Generates 30 illustrations (3 per story: cover, interior, end) for 10
 * emoji-only stories using Gemini 3 Pro Image Preview via Vertex AI.
 *
 * Uses the nanobanana-direct.js module from imagen-experiments.
 * Includes skip-if-exists logic so it can be safely re-run.
 * 40-second delay between API calls to avoid rate limits.
 */

import { generateImage } from '../../imagen-experiments/scripts/experiments/nanobanana-direct.js';
import fs from 'fs/promises';
import path from 'path';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUTPUT_DIR = path.join(ROOT, 'assets', 'illustrations', 'stories');

const STYLE_PREFIX = 'Cute watercolor children\'s book illustration, soft pastel palette, whimsical, warm, kid-friendly, no text, gentle rounded shapes, storybook art style';

const DELAY_MS = 65_000; // 65 seconds between API calls (API allows ~2 RPM)
const MAX_RETRIES = 3;   // Retry up to 3 times on rate-limit (429) errors

// ═══════════════════════════════════════════════════════════════
// 10 Stories × 3 images = 30 illustrations
// ═══════════════════════════════════════════════════════════════

const STORIES = [
  // 1. unicorn-forest
  {
    id: 'unicorn-forest',
    images: [
      { type: 'cover', prompt: 'a lonely small unicorn standing in a magical enchanted forest with glowing mushrooms and fireflies, soft misty light filtering through tall colorful trees' },
      { type: '1', prompt: 'a unicorn\'s horn glowing with brilliant rainbow light, meeting a small kind girl in a magical forest clearing, sparkles and wonder' },
      { type: 'end', prompt: 'multiple happy unicorns playing together in a magical forest meadow with rainbow magic swirling around them, joyful celebration' },
    ],
  },
  // 2. lonely-dragon
  {
    id: 'lonely-dragon',
    images: [
      { type: 'cover', prompt: 'a sad cute baby dragon sitting alone beside a colorful fairytale castle, looking lonely with droopy wings, soft cloudy sky' },
      { type: '1', prompt: 'a brave small girl talking kindly to a friendly cute dragon, the dragon looking surprised and hopeful, castle garden setting' },
      { type: 'end', prompt: 'a small girl riding a happy friendly dragon through fluffy clouds, both laughing and playing together, rainbow in the sky' },
    ],
  },
  // 3. fairy-village
  {
    id: 'fairy-village',
    images: [
      { type: 'cover', prompt: 'a tiny fairy village with cute flower houses blown messy by a windstorm, leaves and petals scattered, tiny worried fairies hovering' },
      { type: '1', prompt: 'a small kind girl helping pick up tiny sticks and leaves with fluttering colorful fairies around her, rebuilding their little houses' },
      { type: 'end', prompt: 'a beautiful restored fairy village with tiny flower houses in perfect order, grateful fairies sprinkling golden magic dust everywhere, glowing warmly' },
    ],
  },
  // 4. sibling-adventure
  {
    id: 'sibling-adventure',
    images: [
      { type: 'cover', prompt: 'a small boy looking hopeful while his sister plays with toys nearby, cozy living room with warm light, siblings at home' },
      { type: '1', prompt: 'a brother and sister on an exciting treasure hunt in a sunny backyard garden, following a hand-drawn map together, teamwork' },
      { type: 'end', prompt: 'siblings finding a pile of pretty colorful rocks as treasure, giving each other a big warm hug, golden sunshine, love' },
    ],
  },
  // 5. grandpa-day
  {
    id: 'grandpa-day',
    images: [
      { type: 'cover', prompt: 'a kind elderly grandpa sitting alone in a cozy armchair reading a book on his birthday, quiet room, warm but lonely feeling' },
      { type: '1', prompt: 'a surprise birthday party scene with colorful balloons, a big decorated cake with candles, streamers, excited family arriving' },
      { type: 'end', prompt: 'a grandpa hugging a small girl tightly with happy tears in his eyes, birthday decorations all around, warmth and love' },
    ],
  },
  // 6. new-neighbor
  {
    id: 'new-neighbor',
    images: [
      { type: 'cover', prompt: 'a new family moving into a house next door with cardboard boxes, a moving truck, children peeking curiously from behind boxes' },
      { type: '1', prompt: 'a small friendly girl bringing a plate of cookies to welcome new neighbors at their door, warm smile, welcoming gesture' },
      { type: 'end', prompt: 'new neighbor kids and the welcoming girl all playing together happily in a sunny yard, friendship forming, laughter and fun' },
    ],
  },
  // 7. lost-puppy
  {
    id: 'lost-puppy',
    images: [
      { type: 'cover', prompt: 'a sad small lost puppy with big eyes wandering alone on a neighborhood sidewalk, looking worried, soft afternoon light' },
      { type: '1', prompt: 'a kind small girl walking through the neighborhood showing a lost puppy to friendly neighbors, asking if anyone knows the puppy' },
      { type: 'end', prompt: 'a happy puppy reunited with its joyful family, puppy giving kisses, everyone smiling, warm happy ending, hearts floating' },
    ],
  },
  // 8. library-helper
  {
    id: 'library-helper',
    images: [
      { type: 'cover', prompt: 'a messy colorful library with books scattered on the floor and piled up everywhere, bookshelves in disarray, cozy library setting' },
      { type: '1', prompt: 'a small girl carefully organizing colorful books onto library shelves, sorting them neatly, focused and helpful, cozy library interior' },
      { type: 'end', prompt: 'a tidy beautiful library with all books organized, a kind librarian giving a shiny helper badge to a proud small girl, celebration' },
    ],
  },
  // 9. park-cleanup
  {
    id: 'park-cleanup',
    images: [
      { type: 'cover', prompt: 'a park looking sad with scattered trash on the ground, littered paths, wilting flowers, grey mood, needs cleaning up' },
      { type: '1', prompt: 'a small girl and her friends happily picking up trash in a park with bags and gloves, teamwork, bright sunny day' },
      { type: 'end', prompt: 'a beautiful clean sparkling park with green grass and blooming flowers, children celebrating together, butterflies and sunshine, everyone happy' },
    ],
  },
  // 10. birthday-surprise
  {
    id: 'birthday-surprise',
    images: [
      { type: 'cover', prompt: 'a small child looking sad thinking their birthday has been forgotten, sitting alone, cloudy feeling, but a hint of hidden surprise behind' },
      { type: '1', prompt: 'children secretly decorating a room with colorful streamers and balloons, wrapping presents with bows, excited whispering, surprise preparation' },
      { type: 'end', prompt: 'a surprise birthday party reveal, the birthday child crying happy tears, friends cheering, confetti falling, cake with candles, pure joy' },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════

function getOutputPath(storyId, imageType) {
  const filename = `${storyId}-${imageType}.png`;
  return path.join(OUTPUT_DIR, filename);
}

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
  console.log('Blaire\'s Kind Heart — Story Illustration Generator');
  console.log('='.repeat(60));
  console.log(`Output directory: ${OUTPUT_DIR}`);
  console.log(`Style prefix: ${STYLE_PREFIX.substring(0, 60)}...`);
  console.log(`Delay between calls: ${DELAY_MS / 1000}s`);
  console.log();

  // Ensure output directory exists
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  // Build flat list of all images to generate
  const allImages = [];
  for (const story of STORIES) {
    for (const img of story.images) {
      allImages.push({
        storyId: story.id,
        imageType: img.type,
        prompt: `${STYLE_PREFIX}, ${img.prompt}`,
        outputPath: getOutputPath(story.id, img.type),
      });
    }
  }

  console.log(`Total images to process: ${allImages.length}`);
  console.log();

  let generated = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < allImages.length; i++) {
    const item = allImages[i];
    const label = `[${i + 1}/${allImages.length}] ${path.basename(item.outputPath)}`;

    // Skip if file already exists
    if (await fileExists(item.outputPath)) {
      console.log(`${label} — SKIP (already exists)`);
      skipped++;
      continue;
    }

    console.log(`${label} — Generating...`);
    console.log(`  Story: ${item.storyId} | Type: ${item.imageType}`);

    let success = false;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const result = await generateImage({
          prompt: item.prompt,
          aspectRatio: '4:3',
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
          console.log(`  OK: ${path.basename(item.outputPath)} (${sizeKB} KB)`);
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
        console.error(`  ERROR: ${item.storyId}-${item.imageType} — ${err.message.substring(0, 120)}`);
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
    console.log('Some images failed. Re-run this script to retry (skip-if-exists).');
  } else if (generated === 0 && skipped === allImages.length) {
    console.log('All images already exist. Nothing to generate.');
  } else {
    console.log('All images generated successfully!');
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

#!/usr/bin/env node

/**
 * Emerson Violin PWA — Bonus Game Visual Assets
 * Uses Gemini 3 Pro Image Preview via Vertex AI
 *
 * Generates:
 * - 4 game card header illustrations for the bonus games
 * - 1 adventure map illustration
 * - 5 missing collectible item sprites
 */

import { generateImage } from '../experiments/nanobanana-direct.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PWA_ROOT = path.resolve(__dirname, '../../../emerson-violin-pwa');

const STYLE_BASE = `Cute illustrated children's app style. Warm color palette (cream, rust-orange, forest green accents). Clean vector-like digital illustration, soft rounded shapes. Designed for an 8-year-old audience — playful, encouraging. No text or words in the image.`;

const PANDA_STYLE = `Cute red panda mascot character with expressive dark eyes, fluffy striped rust-orange and cream tail, cream belly and face markings. Consistent cartoon character design.`;

// ── Game Card Headers (16:9 banner style, ~400x225) ──

const GAME_CARDS = [
  {
    file: 'game-note-catch.webp',
    prompt: `${STYLE_BASE} ${PANDA_STYLE} A playful scene: the red panda wearing headphones, reaching up to catch colorful glowing musical notes (quarter notes, eighth notes) floating down from above like bubbles. Background is a soft purple-blue gradient with sparkle effects. Four violin strings (G, D, A, E) subtly visible as glowing lines on the left side. Ear training game card illustration.`,
    aspect: '16:9',
  },
  {
    file: 'game-scale-sprint.webp',
    prompt: `${STYLE_BASE} ${PANDA_STYLE} A dynamic scene: the red panda running along a colorful musical scale staircase that ascends from left to right. Each step is a different color (like xylophone bars). A violin silhouette at the top of the stairs. Speed lines and a small timer icon in the corner. Bright warm-to-cool gradient background (yellow to blue sky). Scale sprint warm-up game card illustration.`,
    aspect: '16:9',
  },
  {
    file: 'game-composer.webp',
    prompt: `${STYLE_BASE} ${PANDA_STYLE} A cozy creative scene: the red panda sitting at a small wooden desk, using a quill pen to write on a large piece of sheet music paper. Musical notes float up from the paper like magic. Small ink pot nearby. Warm golden lamplight. Bookshelves with music books in the background. Composer's workshop game card illustration.`,
    aspect: '16:9',
  },
  {
    file: 'game-play-along.webp',
    prompt: `${STYLE_BASE} ${PANDA_STYLE} An exciting performance scene: the red panda playing a small violin on a colorful stage with purple curtains. Sheet music scrolls forward on a holographic music stand. Colorful note markers float ahead like a rhythm game track. Spotlight beams and star effects. Play-along performance game card illustration.`,
    aspect: '16:9',
  },
];

// ── Adventure Map Illustration ──

const ADVENTURE_MAP = {
  file: 'adventure-map-bg.webp',
  prompt: `${STYLE_BASE} Top-down illustrated adventure world map for a children's violin practice game. Four distinct regions connected by a winding golden path:

  Bottom-left: "Twinkle Valley" — gentle rolling green hills with musical note flowers, small twinkling stars, cozy cottage.

  Center-left: "Forest Path" — enchanted bamboo forest with glowing lanterns on branches, stepping stones across a gentle stream.

  Upper-right: "Mountain Climb" — purple-blue rocky peaks with snow caps, winding switchback trail, small flags marking progress.

  Top-center: "Summit Castle" — a small golden music castle at the very top with a treble clef tower, rainbow and sparkles.

  The path has circular nodes/stops along it (like a board game). Warm golden hour lighting. Bird's eye view, no characters. Isometric perspective game board style.`,
  aspect: '3:4',
};

// ── Missing Room Collectible Sprites ──

const COLLECTIBLE_SPRITES = [
  {
    file: 'globe.png',
    prompt: `${STYLE_BASE} A cute small decorative musical globe on a wooden stand. The globe shows continents but with musical notes and treble clefs instead of country names. Soft blue and gold colors. Isometric room decoration sprite, transparent background. 256x256 icon size.`,
    aspect: '1:1',
  },
  {
    file: 'cactus.png',
    prompt: `${STYLE_BASE} A tiny cute smiling cactus in a terracotta pot with a small musical note shape. Green with tiny flowers. Isometric room decoration sprite, transparent background. 256x256 icon size.`,
    aspect: '1:1',
  },
  {
    file: 'vinyl-record.png',
    prompt: `${STYLE_BASE} A cute vinyl record player (turntable) with a colorful vinyl record spinning. Small musical notes floating up. Retro cream and brown colors. Isometric room decoration sprite, transparent background. 256x256 icon size.`,
    aspect: '1:1',
  },
  {
    file: 'lava-lamp.png',
    prompt: `${STYLE_BASE} A cute colorful lava lamp with purple and orange blobs. Soft glow effect. Musical note shapes in the lava blobs. Isometric room decoration sprite, transparent background. 256x256 icon size.`,
    aspect: '1:1',
  },
  {
    file: 'aquarium.png',
    prompt: `${STYLE_BASE} A cute small fish tank aquarium with colorful tropical fish swimming among tiny musical note decorations. Blue water, green seaweed, bubbles. Isometric room decoration sprite, transparent background. 256x256 icon size.`,
    aspect: '1:1',
  },
];

// -------------------------------------------------------------------

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function generate(item, outputDir, label, size = '2K') {
  const outPath = path.join(outputDir, item.file);

  // Skip if already exists
  try {
    await fs.access(outPath);
    console.log(`   ⏭️  Skipping (exists): ${item.file}`);
    return outPath;
  } catch { /* not found, generate */ }

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
      console.log(`   ✅ Saved: ${outPath}`);
      return outPath;
    } else {
      console.warn(`   ⚠️  No image generated for ${item.file}`);
      return null;
    }
  } catch (err) {
    console.error(`   ❌ Failed: ${err.message}`);
    return null;
  }
}

// -------------------------------------------------------------------

const DIRS = {
  gameCards: path.join(PWA_ROOT, 'public/assets/illustrations/games'),
  map: path.join(PWA_ROOT, 'public/assets/illustrations'),
  room: path.join(PWA_ROOT, 'public/assets/room'),
};

const command = process.argv[2] || 'all';

console.log('🎨 Emerson Violin PWA — Bonus Game Visual Generator');
console.log(`   Command: ${command}`);
console.log(`   PWA Root: ${PWA_ROOT}`);
console.log('');

try {
  if (command === 'cards' || command === 'all') {
    await ensureDir(DIRS.gameCards);
    console.log(`\n📦 Generating ${GAME_CARDS.length} game card headers...`);
    for (const card of GAME_CARDS) {
      await generate(card, DIRS.gameCards, '🎮', '2K');
    }
  }

  if (command === 'map' || command === 'all') {
    await ensureDir(DIRS.map);
    console.log(`\n📦 Generating adventure map background...`);
    await generate(ADVENTURE_MAP, DIRS.map, '🗺️', '2K');
  }

  if (command === 'sprites' || command === 'all') {
    await ensureDir(DIRS.room);
    console.log(`\n📦 Generating ${COLLECTIBLE_SPRITES.length} room decoration sprites...`);
    for (const sprite of COLLECTIBLE_SPRITES) {
      await generate(sprite, DIRS.room, '🏠', '1K');
    }
  }

  if (!['cards', 'map', 'sprites', 'all'].includes(command)) {
    console.log(`
Usage:
  node bonus-game-visuals.js all       — Generate everything (10 images)
  node bonus-game-visuals.js cards     — Generate 4 game card headers
  node bonus-game-visuals.js map       — Generate adventure map background
  node bonus-game-visuals.js sprites   — Generate 5 room collectible sprites

Output: ${PWA_ROOT}/public/assets/
    `);
  }

  console.log('\n✅ Generation complete!');
} catch (err) {
  console.error(`\n❌ Fatal error: ${err.message}`);
  process.exit(1);
}

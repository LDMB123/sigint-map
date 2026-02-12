#!/usr/bin/env node

/**
 * Emerson Violin PWA — Red Panda Mascot Generator
 * Uses Gemini 3 Pro Image Preview via Vertex AI
 *
 * Generates 15 character poses, 4 game backgrounds, 8 badges, 3 empty states
 * All assets output to the emerson-violin-pwa/public/assets/ directory
 */

import { generateImage } from '../experiments/nanobanana-direct.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PWA_ROOT = path.resolve(__dirname, '../../../emerson-violin-pwa');

const STYLE_BASE = `Cute red panda character mascot for a children's violin practice app. Friendly cartoon illustration style, full body, soft rounded shapes, warm color palette (cream, rust-orange, forest green accents). Clean solid-color background (#FFF4E8 cream). Digital illustration, consistent character design across all poses. The red panda has expressive dark eyes, fluffy striped tail, cream-colored belly and face markings. Designed for an 8-year-old audience — playful, encouraging, non-threatening.`;

const PANDA_POSES = [
  { file: 'panda-happy.png', pose: 'Standing upright, waving hello with right paw raised, bright smile, welcoming posture' },
  { file: 'panda-violin.png', pose: 'Playing a small violin, standing, eyes closed in concentration, music notes floating nearby' },
  { file: 'panda-conducting.png', pose: 'Holding a conductor baton in right paw, making a downbeat gesture, confident expression' },
  { file: 'panda-celebrate.png', pose: 'Jumping in the air with both paws raised high, eyes squeezed shut with joy, golden stars and sparkles around' },
  { file: 'panda-encourage.png', pose: 'Giving a thumbs up with right paw, warm encouraging smile, slight lean forward' },
  { file: 'panda-focus.png', pose: 'Standing attentively with paws clasped, focused determined expression, slight head tilt' },
  { file: 'panda-thinking.png', pose: 'One paw touching chin, looking upward thoughtfully, curious expression' },
  { file: 'panda-rest.png', pose: 'Curled up sleeping peacefully, tail wrapped around body, tiny zzz symbols, content expression' },
  { file: 'panda-jump.png', pose: 'Mid-jump with arms and legs spread wide, ecstatic expression, confetti and streamers around' },
  { file: 'panda-clap.png', pose: 'Clapping both paws together enthusiastically, eyes bright, slight bounce' },
  { file: 'panda-point.png', pose: 'Pointing to the right with outstretched paw, looking at viewer with inviting smile' },
  { file: 'panda-worried.png', pose: 'Sympathetic concerned expression, paws held together, slight frown, empathetic posture' },
  { file: 'panda-headphones.png', pose: 'Wearing large over-ear headphones, eyes closed, swaying to music, peaceful expression' },
  { file: 'panda-reading.png', pose: 'Sitting cross-legged holding an open music book, reading intently, small glasses on nose' },
  { file: 'panda-stars.png', pose: 'Standing with arms slightly out, golden stars orbiting around head like a halo, amazed expression, glowing' },
];

const BACKGROUNDS = [
  {
    file: 'bg-bamboo-forest.png',
    prompt: `Illustrated bamboo forest clearing, warm golden sunlight filtering through bamboo stalks. Soft green gradient floor of grass and clover. Cartoon style for a children's game, warm palette, no characters. Musical notes subtly carved into bamboo. 16:9 game background, parallax-ready with depth layers.`,
    aspect: '16:9',
  },
  {
    file: 'bg-mountain-meadow.png',
    prompt: `Illustrated mountain meadow with rolling green hills, wildflowers (purple, yellow, orange), distant snow-capped mountains. Floating music notes and treble clefs drift in the breeze. Warm afternoon light, children's game art style. 16:9, bright and inviting.`,
    aspect: '16:9',
  },
  {
    file: 'bg-river-path.png',
    prompt: `Illustrated winding river path through a colorful forest. Smooth stepping stones across a gentle stream. Lanterns hang from tree branches. Warm children's game style, musical note patterns in the water reflections. 16:9 background.`,
    aspect: '16:9',
  },
  {
    file: 'bg-cozy-studio.png',
    prompt: `Illustrated warm cozy music practice room interior. Wooden floor, a music stand with sheet music, a comfy armchair, warm lamp light, window showing sunset. Violin case open on a shelf. Children's illustration style, cream and warm wood tones. 16:9.`,
    aspect: '16:9',
  },
];

const BADGES = [
  { file: 'badge-rhythm-star.png', prompt: `Circular golden badge icon with a musical rhythm grid pattern and a shining star in the center. Red panda paw print accent. Children's app achievement badge, metallic gold border, "children's cartoon" style, vibrant.` },
  { file: 'badge-pitch-master.png', prompt: `Circular silver-blue badge icon with a tuning fork and perfect pitch wave symbol. Red panda paw print accent. Children's app achievement badge, metallic blue border, cartoon style.` },
  { file: 'badge-bow-hero.png', prompt: `Circular green badge icon with a violin bow making a swooping arc trail. Red panda paw print accent. Children's app achievement badge, emerald green metallic border, cartoon style.` },
  { file: 'badge-streak-3.png', prompt: `Circular badge with number "3" and three small flame icons. Bronze metallic border. Practice streak achievement for children's app, warm colors, cartoon style.` },
  { file: 'badge-streak-7.png', prompt: `Circular badge with number "7" and seven flame icons arranged in an arc. Silver metallic border. Week-long practice streak achievement, cartoon style for children's app.` },
  { file: 'badge-perfect.png', prompt: `Circular golden badge with a sparkling diamond and rainbow starburst. "Perfect" text in playful font. Premium achievement badge, cartoon style for children's app, extra sparkle effects.` },
  { file: 'badge-first-session.png', prompt: `Circular warm orange badge with a sunrise and a small violin silhouette. "First Steps" theme. First practice session achievement, inviting cartoon style for children's app.` },
  { file: 'badge-level-up.png', prompt: `Circular purple and gold badge with an upward arrow and star trail. Level up achievement, magical glow effect, cartoon style for children's app, celebration theme.` },
];

const EMPTY_STATES = [
  { file: 'empty-no-games.png', prompt: `Cute red panda character sitting next to a blank game board, looking inviting and hopeful, paw gesturing toward the empty board. Text area below for "No games played yet!" Children's illustration style, warm cream background.` },
  { file: 'empty-no-sessions.png', prompt: `Cute red panda character holding a violin case, looking at viewer with encouraging expression, pointing at an empty practice log book. Children's illustration, warm cream background.` },
  { file: 'empty-no-recordings.png', prompt: `Cute red panda character wearing headphones, standing next to an empty microphone, friendly inviting gesture. Children's illustration style, warm cream background.` },
];

// -------------------------------------------------------------------

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function generatePandaPose(pose, outputDir) {
  const outPath = path.join(outputDir, pose.file);
  console.log(`\n🐼 Generating: ${pose.file}`);
  console.log(`   Pose: ${pose.pose}`);

  const prompt = `${STYLE_BASE}\n\nPose: ${pose.pose}`;

  try {
    const result = await generateImage({
      prompt,
      aspectRatio: '1:1',
      imageSize: '2K',
      showThinkingProcess: false,
    });

    if (result.images.length > 0) {
      // Copy from output dir to target location
      await fs.copyFile(result.images[0], outPath);
      console.log(`   ✅ Saved: ${outPath}`);
      return outPath;
    } else {
      console.warn(`   ⚠️  No image generated for ${pose.file}`);
      return null;
    }
  } catch (err) {
    console.error(`   ❌ Failed: ${err.message}`);
    return null;
  }
}

async function generateBackground(bg, outputDir) {
  const outPath = path.join(outputDir, bg.file);
  console.log(`\n🌲 Generating background: ${bg.file}`);

  try {
    const result = await generateImage({
      prompt: bg.prompt,
      aspectRatio: bg.aspect || '16:9',
      imageSize: '2K',
      showThinkingProcess: false,
    });

    if (result.images.length > 0) {
      await fs.copyFile(result.images[0], outPath);
      console.log(`   ✅ Saved: ${outPath}`);
      return outPath;
    }
    return null;
  } catch (err) {
    console.error(`   ❌ Failed: ${err.message}`);
    return null;
  }
}

async function generateBadge(badge, outputDir) {
  const outPath = path.join(outputDir, badge.file);
  console.log(`\n🏅 Generating badge: ${badge.file}`);

  try {
    const result = await generateImage({
      prompt: badge.prompt,
      aspectRatio: '1:1',
      imageSize: '1K',
      showThinkingProcess: false,
    });

    if (result.images.length > 0) {
      await fs.copyFile(result.images[0], outPath);
      console.log(`   ✅ Saved: ${outPath}`);
      return outPath;
    }
    return null;
  } catch (err) {
    console.error(`   ❌ Failed: ${err.message}`);
    return null;
  }
}

async function generateEmptyState(empty, outputDir) {
  const outPath = path.join(outputDir, empty.file);
  console.log(`\n📭 Generating empty state: ${empty.file}`);

  try {
    const result = await generateImage({
      prompt: empty.prompt,
      aspectRatio: '4:3',
      imageSize: '1K',
      showThinkingProcess: false,
    });

    if (result.images.length > 0) {
      await fs.copyFile(result.images[0], outPath);
      console.log(`   ✅ Saved: ${outPath}`);
      return outPath;
    }
    return null;
  } catch (err) {
    console.error(`   ❌ Failed: ${err.message}`);
    return null;
  }
}

// -------------------------------------------------------------------
// CLI
// -------------------------------------------------------------------

const command = process.argv[2] || 'all';
const singlePose = process.argv[3]; // optional: specific pose filename

const DIRS = {
  panda: path.join(PWA_ROOT, 'public/assets/illustrations/panda'),
  backgrounds: path.join(PWA_ROOT, 'public/assets/backgrounds'),
  badges: path.join(PWA_ROOT, 'public/assets/badges'),
  empty: path.join(PWA_ROOT, 'public/assets/illustrations/empty'),
};

console.log('🎨 Emerson Violin PWA — Red Panda Asset Generator');
console.log(`   Command: ${command}`);
console.log(`   PWA Root: ${PWA_ROOT}`);
console.log('');

try {
  if (command === 'poses' || command === 'all') {
    await ensureDir(DIRS.panda);
    const poses = singlePose
      ? PANDA_POSES.filter(p => p.file === singlePose)
      : PANDA_POSES;

    if (poses.length === 0) {
      console.error(`❌ No pose found matching "${singlePose}"`);
      console.log('Available poses:', PANDA_POSES.map(p => p.file).join(', '));
      process.exit(1);
    }

    console.log(`\n📦 Generating ${poses.length} panda pose(s)...`);
    for (const pose of poses) {
      await generatePandaPose(pose, DIRS.panda);
    }
  }

  if (command === 'backgrounds' || command === 'all') {
    await ensureDir(DIRS.backgrounds);
    console.log(`\n📦 Generating ${BACKGROUNDS.length} game backgrounds...`);
    for (const bg of BACKGROUNDS) {
      await generateBackground(bg, DIRS.backgrounds);
    }
  }

  if (command === 'badges' || command === 'all') {
    await ensureDir(DIRS.badges);
    console.log(`\n📦 Generating ${BADGES.length} reward badges...`);
    for (const badge of BADGES) {
      await generateBadge(badge, DIRS.badges);
    }
  }

  if (command === 'empty' || command === 'all') {
    await ensureDir(DIRS.empty);
    console.log(`\n📦 Generating ${EMPTY_STATES.length} empty state illustrations...`);
    for (const empty of EMPTY_STATES) {
      await generateEmptyState(empty, DIRS.empty);
    }
  }

  if (!['poses', 'backgrounds', 'badges', 'empty', 'all'].includes(command)) {
    console.log(`
Usage:
  node panda-gen.js all                    — Generate everything (30 images)
  node panda-gen.js poses                  — Generate 15 panda poses
  node panda-gen.js poses panda-happy.png  — Generate single pose
  node panda-gen.js backgrounds            — Generate 4 game backgrounds
  node panda-gen.js badges                 — Generate 8 reward badges
  node panda-gen.js empty                  — Generate 3 empty state illustrations

Output: ${PWA_ROOT}/public/assets/
    `);
  }

  console.log('\n✅ Generation complete!');
} catch (err) {
  console.error(`\n❌ Fatal error: ${err.message}`);
  process.exit(1);
}

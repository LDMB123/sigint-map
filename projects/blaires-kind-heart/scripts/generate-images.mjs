#!/usr/bin/env node

/**
 * Blaire's Kind Heart — Image Generation with Imagen 3 Pro
 * Generates all app visuals: icons, story covers, stickers, backgrounds
 */

import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { fileExists, sleep, writeBase64Image } from './lib/fs-helpers.mjs';
import { requestImagenBase64 } from './lib/imagen-client.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || 'gen-lang-client-0925343693';

async function convertToWebP(pngPath, webpPath) {
  await sharp(pngPath)
    .webp({ quality: 85 })
    .toFile(webpPath);
  await fs.unlink(pngPath); // Delete PNG after conversion
  console.log(`  WEBP: ${path.basename(webpPath)} (converted from PNG)`);
}

async function generateImage({ prompt, outputPath, aspectRatio = '1:1', negativePrompt = null }) {
  // Skip if already generated
  if (await fileExists(outputPath)) {
    console.log(`  SKIP: ${path.basename(outputPath)} (already exists)`);
    return outputPath;
  }

  console.log(`  Generating: ${path.basename(outputPath)}...`);
  const result = await requestImagenBase64({
    prompt,
    aspectRatio,
    negativePrompt,
  });

  if (!result.ok || !result.bytesBase64Encoded) {
    console.error(`  FAILED: ${path.basename(outputPath)} — ${result.errorMessage || 'No image data returned'}`);
    return null;
  }

  const bytes = await writeBase64Image(outputPath, result.bytesBase64Encoded);
  console.log(`  OK: ${path.basename(outputPath)} (${(bytes / 1024).toFixed(0)} KB)`);
  return outputPath;
}

const NEG = 'text, watermark, signature, words, letters, numbers, logo, realistic human face, scary, dark, horror, violence, blood';

// ── Style constants ──
const STYLE = 'cute kawaii children illustration, soft pastel colors, rounded shapes, friendly, warm lighting, simple clean background, storybook art style, digital painting';
const STICKER_STYLE = 'kawaii sticker design, cute chibi style, thick outline, bright colors, glossy finish, centered on white background, no text, single character or object';
const ICON_STYLE = 'app icon design, flat illustration, vibrant colors, centered, clean edges, simple, modern, kid-friendly';

// ═══════════════════════════════════════════
// BATCH DEFINITIONS
// ═══════════════════════════════════════════

// ── Week 2: Companion Skins (18 WebP files) ──
const COMPANION_BATCH = [
  // Default Sparkle (3 poses)
  {
    prompt: "Default Sparkle companion character. Small friendly creature combining bunny and unicorn features. Round soft body, big expressive eyes, gentle floppy ears, small rainbow unicorn horn. Cream white fur, soft rainbow horn, pink inner ears. Pose: happy standing neutral. Soft pastel colors, whimsical children's book illustration style, simple shapes, high contrast for young readers, friendly magical aesthetic. White background.",
    outputPath: path.join(ROOT, 'assets/companions/default_happy.webp'),
  },
  {
    prompt: "Default Sparkle companion character. Small friendly creature combining bunny and unicorn features. Round soft body, big expressive eyes, gentle floppy ears, small rainbow unicorn horn. Cream white fur, soft rainbow horn, pink inner ears. Pose: celebrating with sparkles and joy, arms raised. Soft pastel colors, whimsical children's book illustration style, simple shapes, high contrast for young readers, friendly magical aesthetic. White background.",
    outputPath: path.join(ROOT, 'assets/companions/default_celebrate.webp'),
  },
  {
    prompt: "Default Sparkle companion character. Small friendly creature combining bunny and unicorn features. Round soft body, big expressive eyes, gentle floppy ears, small rainbow unicorn horn. Cream white fur, soft rainbow horn, pink inner ears. Pose: encouraging gesture, gentle wave or thumbs up. Soft pastel colors, whimsical children's book illustration style, simple shapes, high contrast for young readers, friendly magical aesthetic. White background.",
    outputPath: path.join(ROOT, 'assets/companions/default_encourage.webp'),
  },
  // Unicorn Sparkle (3 poses)
  {
    prompt: "Unicorn Sparkle companion character. Small friendly creature combining bunny and unicorn features. Round soft body, big expressive eyes, gentle floppy ears, small rainbow unicorn horn. Pure white iridescent fur, golden horn, lavender mane. Pose: happy standing neutral. Soft pastel colors, whimsical children's book illustration style, simple shapes, high contrast for young readers, friendly magical aesthetic. White background.",
    outputPath: path.join(ROOT, 'assets/companions/unicorn_happy.webp'),
  },
  {
    prompt: "Unicorn Sparkle companion character. Small friendly creature combining bunny and unicorn features. Round soft body, big expressive eyes, gentle floppy ears, small rainbow unicorn horn. Pure white iridescent fur, golden horn, lavender mane. Pose: celebrating with sparkles and joy, arms raised. Soft pastel colors, whimsical children's book illustration style, simple shapes, high contrast for young readers, friendly magical aesthetic. White background.",
    outputPath: path.join(ROOT, 'assets/companions/unicorn_celebrate.webp'),
  },
  {
    prompt: "Unicorn Sparkle companion character. Small friendly creature combining bunny and unicorn features. Round soft body, big expressive eyes, gentle floppy ears, small rainbow unicorn horn. Pure white iridescent fur, golden horn, lavender mane. Pose: encouraging gesture, gentle wave or thumbs up. Soft pastel colors, whimsical children's book illustration style, simple shapes, high contrast for young readers, friendly magical aesthetic. White background.",
    outputPath: path.join(ROOT, 'assets/companions/unicorn_encourage.webp'),
  },
  // Rainbow Sparkle (3 poses)
  {
    prompt: "Rainbow Sparkle companion character. Small friendly creature combining bunny and unicorn features. Round soft body, big expressive eyes, gentle floppy ears, small rainbow unicorn horn. Color-shifting fur with pastel gradient (pink to lavender to mint), rainbow horn, multi-color accents. Pose: happy standing neutral. Soft pastel colors, whimsical children's book illustration style, simple shapes, high contrast for young readers, friendly magical aesthetic. White background.",
    outputPath: path.join(ROOT, 'assets/companions/rainbow_happy.webp'),
  },
  {
    prompt: "Rainbow Sparkle companion character. Small friendly creature combining bunny and unicorn features. Round soft body, big expressive eyes, gentle floppy ears, small rainbow unicorn horn. Color-shifting fur with pastel gradient (pink to lavender to mint), rainbow horn, multi-color accents. Pose: celebrating with sparkles and joy, arms raised. Soft pastel colors, whimsical children's book illustration style, simple shapes, high contrast for young readers, friendly magical aesthetic. White background.",
    outputPath: path.join(ROOT, 'assets/companions/rainbow_celebrate.webp'),
  },
  {
    prompt: "Rainbow Sparkle companion character. Small friendly creature combining bunny and unicorn features. Round soft body, big expressive eyes, gentle floppy ears, small rainbow unicorn horn. Color-shifting fur with pastel gradient (pink to lavender to mint), rainbow horn, multi-color accents. Pose: encouraging gesture, gentle wave or thumbs up. Soft pastel colors, whimsical children's book illustration style, simple shapes, high contrast for young readers, friendly magical aesthetic. White background.",
    outputPath: path.join(ROOT, 'assets/companions/rainbow_encourage.webp'),
  },
  // Galaxy Sparkle (3 poses)
  {
    prompt: "Galaxy Sparkle companion character. Small friendly creature combining bunny and unicorn features. Round soft body, big expressive eyes, gentle floppy ears, small rainbow unicorn horn. Deep purple-blue fur with star sparkles, silver horn, cosmic swirls. Pose: happy standing neutral. Soft pastel colors, whimsical children's book illustration style, simple shapes, high contrast for young readers, friendly magical aesthetic. White background.",
    outputPath: path.join(ROOT, 'assets/companions/galaxy_happy.webp'),
  },
  {
    prompt: "Galaxy Sparkle companion character. Small friendly creature combining bunny and unicorn features. Round soft body, big expressive eyes, gentle floppy ears, small rainbow unicorn horn. Deep purple-blue fur with star sparkles, silver horn, cosmic swirls. Pose: celebrating with sparkles and joy, arms raised. Soft pastel colors, whimsical children's book illustration style, simple shapes, high contrast for young readers, friendly magical aesthetic. White background.",
    outputPath: path.join(ROOT, 'assets/companions/galaxy_celebrate.webp'),
  },
  {
    prompt: "Galaxy Sparkle companion character. Small friendly creature combining bunny and unicorn features. Round soft body, big expressive eyes, gentle floppy ears, small rainbow unicorn horn. Deep purple-blue fur with star sparkles, silver horn, cosmic swirls. Pose: encouraging gesture, gentle wave or thumbs up. Soft pastel colors, whimsical children's book illustration style, simple shapes, high contrast for young readers, friendly magical aesthetic. White background.",
    outputPath: path.join(ROOT, 'assets/companions/galaxy_encourage.webp'),
  },
  // Crystal Sparkle (3 poses)
  {
    prompt: "Crystal Sparkle companion character. Small friendly creature combining bunny and unicorn features. Round soft body, big expressive eyes, gentle floppy ears, small rainbow unicorn horn. Translucent crystalline texture, prismatic horn, diamond sparkles. Pose: happy standing neutral. Soft pastel colors, whimsical children's book illustration style, simple shapes, high contrast for young readers, friendly magical aesthetic. White background.",
    outputPath: path.join(ROOT, 'assets/companions/crystal_happy.webp'),
  },
  {
    prompt: "Crystal Sparkle companion character. Small friendly creature combining bunny and unicorn features. Round soft body, big expressive eyes, gentle floppy ears, small rainbow unicorn horn. Translucent crystalline texture, prismatic horn, diamond sparkles. Pose: celebrating with sparkles and joy, arms raised. Soft pastel colors, whimsical children's book illustration style, simple shapes, high contrast for young readers, friendly magical aesthetic. White background.",
    outputPath: path.join(ROOT, 'assets/companions/crystal_celebrate.webp'),
  },
  {
    prompt: "Crystal Sparkle companion character. Small friendly creature combining bunny and unicorn features. Round soft body, big expressive eyes, gentle floppy ears, small rainbow unicorn horn. Translucent crystalline texture, prismatic horn, diamond sparkles. Pose: encouraging gesture, gentle wave or thumbs up. Soft pastel colors, whimsical children's book illustration style, simple shapes, high contrast for young readers, friendly magical aesthetic. White background.",
    outputPath: path.join(ROOT, 'assets/companions/crystal_encourage.webp'),
  },
  // Golden Sparkle (3 poses)
  {
    prompt: "Golden Sparkle companion character. Small friendly creature combining bunny and unicorn features. Round soft body, big expressive eyes, gentle floppy ears, small rainbow unicorn horn. Shimmering gold fur, radiant horn, sunburst accents. Pose: happy standing neutral. Soft pastel colors, whimsical children's book illustration style, simple shapes, high contrast for young readers, friendly magical aesthetic. White background.",
    outputPath: path.join(ROOT, 'assets/companions/golden_happy.webp'),
  },
  {
    prompt: "Golden Sparkle companion character. Small friendly creature combining bunny and unicorn features. Round soft body, big expressive eyes, gentle floppy ears, small rainbow unicorn horn. Shimmering gold fur, radiant horn, sunburst accents. Pose: celebrating with sparkles and joy, arms raised. Soft pastel colors, whimsical children's book illustration style, simple shapes, high contrast for young readers, friendly magical aesthetic. White background.",
    outputPath: path.join(ROOT, 'assets/companions/golden_celebrate.webp'),
  },
  {
    prompt: "Golden Sparkle companion character. Small friendly creature combining bunny and unicorn features. Round soft body, big expressive eyes, gentle floppy ears, small rainbow unicorn horn. Shimmering gold fur, radiant horn, sunburst accents. Pose: encouraging gesture, gentle wave or thumbs up. Soft pastel colors, whimsical children's book illustration style, simple shapes, high contrast for young readers, friendly magical aesthetic. White background.",
    outputPath: path.join(ROOT, 'assets/companions/golden_encourage.webp'),
  },
];

// ── Week 2: Garden Growth Stages (60 WebP files, 12 gardens × 5 stages) ──
const GARDEN_BATCH = [
  // Bunny Garden (5 stages)
  { prompt: "Bunny Garden growth stage 1. Carrot plants, lettuce, radishes just sprouting. Orange, green palette. Seedlings just emerging from soil. Whimsical children's garden illustration, soft pastel colors, simple shapes, magical sparkles, friendly aesthetic. Top-down view.", outputPath: path.join(ROOT, 'assets/gardens/bunny_stage_1.webp') },
  { prompt: "Bunny Garden growth stage 2. Carrot plants, lettuce, radishes small plants. Orange, green palette. Young plants growing. Whimsical children's garden illustration, soft pastel colors, simple shapes, magical sparkles, friendly aesthetic. Top-down view.", outputPath: path.join(ROOT, 'assets/gardens/bunny_stage_2.webp') },
  { prompt: "Bunny Garden growth stage 3. Carrot plants, lettuce, radishes medium growth. Orange, green palette. Half-grown vegetables. Whimsical children's garden illustration, soft pastel colors, simple shapes, magical sparkles, friendly aesthetic. Top-down view.", outputPath: path.join(ROOT, 'assets/gardens/bunny_stage_3.webp') },
  { prompt: "Bunny Garden growth stage 4. Carrot plants, lettuce, radishes nearly mature. Orange, green palette. Almost ready to harvest. Whimsical children's garden illustration, soft pastel colors, simple shapes, magical sparkles, friendly aesthetic. Top-down view.", outputPath: path.join(ROOT, 'assets/gardens/bunny_stage_4.webp') },
  { prompt: "Bunny Garden growth stage 5. Carrot plants, lettuce, radishes full bloom. Orange, green palette. Fully grown, lush vegetable garden. Whimsical children's garden illustration, soft pastel colors, simple shapes, magical sparkles, friendly aesthetic. Top-down view.", outputPath: path.join(ROOT, 'assets/gardens/bunny_stage_5.webp') },
  // Balloon Garden (5 stages)
  { prompt: "Balloon Garden growth stage 1. Colorful balloon plants just sprouting. Rainbow, pink, blue palette. Tiny balloon buds. Whimsical children's garden illustration, soft pastel colors, simple shapes, magical sparkles, friendly aesthetic. Top-down view.", outputPath: path.join(ROOT, 'assets/gardens/balloon_stage_1.webp') },
  { prompt: "Balloon Garden growth stage 2. Colorful balloon plants small growth. Rainbow, pink, blue palette. Small balloons forming. Whimsical children's garden illustration, soft pastel colors, simple shapes, magical sparkles, friendly aesthetic. Top-down view.", outputPath: path.join(ROOT, 'assets/gardens/balloon_stage_2.webp') },
  { prompt: "Balloon Garden growth stage 3. Colorful balloon plants medium growth. Rainbow, pink, blue palette. Half-inflated balloons. Whimsical children's garden illustration, soft pastel colors, simple shapes, magical sparkles, friendly aesthetic. Top-down view.", outputPath: path.join(ROOT, 'assets/gardens/balloon_stage_3.webp') },
  { prompt: "Balloon Garden growth stage 4. Colorful balloon plants nearly mature. Rainbow, pink, blue palette. Balloons almost full. Whimsical children's garden illustration, soft pastel colors, simple shapes, magical sparkles, friendly aesthetic. Top-down view.", outputPath: path.join(ROOT, 'assets/gardens/balloon_stage_4.webp') },
  { prompt: "Balloon Garden growth stage 5. Colorful balloon plants full bloom. Rainbow, pink, blue palette. Fully inflated balloons floating. Whimsical children's garden illustration, soft pastel colors, simple shapes, magical sparkles, friendly aesthetic. Top-down view.", outputPath: path.join(ROOT, 'assets/gardens/balloon_stage_5.webp') },
  // Unicorn Garden (5 stages)
  { prompt: "Unicorn Garden growth stage 1. Magical unicorn flowers just sprouting. White, lavender, gold palette. Tiny horn-shaped buds. Whimsical children's garden illustration, soft pastel colors, simple shapes, magical sparkles, friendly aesthetic. Top-down view.", outputPath: path.join(ROOT, 'assets/gardens/unicorn_stage_1.webp') },
  { prompt: "Unicorn Garden growth stage 2. Magical unicorn flowers small growth. White, lavender, gold palette. Small horn flowers. Whimsical children's garden illustration, soft pastel colors, simple shapes, magical sparkles, friendly aesthetic. Top-down view.", outputPath: path.join(ROOT, 'assets/gardens/unicorn_stage_2.webp') },
  { prompt: "Unicorn Garden growth stage 3. Magical unicorn flowers medium growth. White, lavender, gold palette. Half-grown unicorn flowers. Whimsical children's garden illustration, soft pastel colors, simple shapes, magical sparkles, friendly aesthetic. Top-down view.", outputPath: path.join(ROOT, 'assets/gardens/unicorn_stage_3.webp') },
  { prompt: "Unicorn Garden growth stage 4. Magical unicorn flowers nearly mature. White, lavender, gold palette. Glowing unicorn blooms. Whimsical children's garden illustration, soft pastel colors, simple shapes, magical sparkles, friendly aesthetic. Top-down view.", outputPath: path.join(ROOT, 'assets/gardens/unicorn_stage_4.webp') },
  { prompt: "Unicorn Garden growth stage 5. Magical unicorn flowers full bloom. White, lavender, gold palette. Radiant unicorn garden with golden horns. Whimsical children's garden illustration, soft pastel colors, simple shapes, magical sparkles, friendly aesthetic. Top-down view.", outputPath: path.join(ROOT, 'assets/gardens/unicorn_stage_5.webp') },
  // Helper's Garden (5 stages)
  { prompt: "Helper's Garden growth stage 1. Helping hands flowers, tool-shaped plants sprouting. Yellow, green palette. Tiny hand-shaped buds. Whimsical children's garden illustration, soft pastel colors, simple shapes, magical sparkles, friendly aesthetic. Top-down view.", outputPath: path.join(ROOT, 'assets/gardens/helper_stage_1.webp') },
  { prompt: "Helper's Garden growth stage 2. Helping hands flowers, tool-shaped plants small growth. Yellow, green palette. Small helping hand blooms. Whimsical children's garden illustration, soft pastel colors, simple shapes, magical sparkles, friendly aesthetic. Top-down view.", outputPath: path.join(ROOT, 'assets/gardens/helper_stage_2.webp') },
  { prompt: "Helper's Garden growth stage 3. Helping hands flowers, tool-shaped plants medium growth. Yellow, green palette. Half-grown helper flowers. Whimsical children's garden illustration, soft pastel colors, simple shapes, magical sparkles, friendly aesthetic. Top-down view.", outputPath: path.join(ROOT, 'assets/gardens/helper_stage_3.webp') },
  { prompt: "Helper's Garden growth stage 4. Helping hands flowers, tool-shaped plants nearly mature. Yellow, green palette. Hands reaching out. Whimsical children's garden illustration, soft pastel colors, simple shapes, magical sparkles, friendly aesthetic. Top-down view.", outputPath: path.join(ROOT, 'assets/gardens/helper_stage_4.webp') },
  { prompt: "Helper's Garden growth stage 5. Helping hands flowers, tool-shaped plants full bloom. Yellow, green palette. Garden full of helping hands. Whimsical children's garden illustration, soft pastel colors, simple shapes, magical sparkles, friendly aesthetic. Top-down view.", outputPath: path.join(ROOT, 'assets/gardens/helper_stage_5.webp') },
  // Rainbow Garden (5 stages)
  { prompt: "Rainbow Garden growth stage 1. Rainbow-colored flowers just sprouting. Multi-color palette. Tiny rainbow buds. Whimsical children's garden illustration, soft pastel colors, simple shapes, magical sparkles, friendly aesthetic. Top-down view.", outputPath: path.join(ROOT, 'assets/gardens/rainbow_stage_1.webp') },
  { prompt: "Rainbow Garden growth stage 2. Rainbow-colored flowers small growth. Multi-color palette. Small rainbow blooms. Whimsical children's garden illustration, soft pastel colors, simple shapes, magical sparkles, friendly aesthetic. Top-down view.", outputPath: path.join(ROOT, 'assets/gardens/rainbow_stage_2.webp') },
  { prompt: "Rainbow Garden growth stage 3. Rainbow-colored flowers medium growth. Multi-color palette. Half-grown rainbow flowers. Whimsical children's garden illustration, soft pastel colors, simple shapes, magical sparkles, friendly aesthetic. Top-down view.", outputPath: path.join(ROOT, 'assets/gardens/rainbow_stage_3.webp') },
  { prompt: "Rainbow Garden growth stage 4. Rainbow-colored flowers nearly mature. Multi-color palette. Vibrant rainbow arcs. Whimsical children's garden illustration, soft pastel colors, simple shapes, magical sparkles, friendly aesthetic. Top-down view.", outputPath: path.join(ROOT, 'assets/gardens/rainbow_stage_4.webp') },
  { prompt: "Rainbow Garden growth stage 5. Rainbow-colored flowers full bloom. Multi-color palette. Complete rainbow spectrum garden. Whimsical children's garden illustration, soft pastel colors, simple shapes, magical sparkles, friendly aesthetic. Top-down view.", outputPath: path.join(ROOT, 'assets/gardens/rainbow_stage_5.webp') },
  // Heart Garden (5 stages)
  { prompt: "Heart Garden growth stage 1. Pink heart-shaped flowers just sprouting. Pink, red palette. Tiny heart buds. Whimsical children's garden illustration, soft pastel colors, simple shapes, magical sparkles, friendly aesthetic. Top-down view.", outputPath: path.join(ROOT, 'assets/gardens/heart_stage_1.webp') },
  { prompt: "Heart Garden growth stage 2. Pink heart-shaped flowers small growth. Pink, red palette. Small heart blooms. Whimsical children's garden illustration, soft pastel colors, simple shapes, magical sparkles, friendly aesthetic. Top-down view.", outputPath: path.join(ROOT, 'assets/gardens/heart_stage_2.webp') },
  { prompt: "Heart Garden growth stage 3. Pink heart-shaped flowers medium growth. Pink, red palette. Half-grown hearts. Whimsical children's garden illustration, soft pastel colors, simple shapes, magical sparkles, friendly aesthetic. Top-down view.", outputPath: path.join(ROOT, 'assets/gardens/heart_stage_3.webp') },
  { prompt: "Heart Garden growth stage 4. Pink heart-shaped flowers nearly mature. Pink, red palette. Glowing hearts. Whimsical children's garden illustration, soft pastel colors, simple shapes, magical sparkles, friendly aesthetic. Top-down view.", outputPath: path.join(ROOT, 'assets/gardens/heart_stage_4.webp') },
  { prompt: "Heart Garden growth stage 5. Pink heart-shaped flowers full bloom. Pink, red palette. Garden full of love hearts. Whimsical children's garden illustration, soft pastel colors, simple shapes, magical sparkles, friendly aesthetic. Top-down view.", outputPath: path.join(ROOT, 'assets/gardens/heart_stage_5.webp') },
  // Star Garden (5 stages)
  { prompt: "Star Garden growth stage 1. Golden star flowers just sprouting. Gold, yellow palette. Tiny star buds. Whimsical children's garden illustration, soft pastel colors, simple shapes, magical sparkles, friendly aesthetic. Top-down view.", outputPath: path.join(ROOT, 'assets/gardens/star_stage_1.webp') },
  { prompt: "Star Garden growth stage 2. Golden star flowers small growth. Gold, yellow palette. Small star blooms. Whimsical children's garden illustration, soft pastel colors, simple shapes, magical sparkles, friendly aesthetic. Top-down view.", outputPath: path.join(ROOT, 'assets/gardens/star_stage_2.webp') },
  { prompt: "Star Garden growth stage 3. Golden star flowers medium growth. Gold, yellow palette. Half-grown stars. Whimsical children's garden illustration, soft pastel colors, simple shapes, magical sparkles, friendly aesthetic. Top-down view.", outputPath: path.join(ROOT, 'assets/gardens/star_stage_3.webp') },
  { prompt: "Star Garden growth stage 4. Golden star flowers nearly mature. Gold, yellow palette. Twinkling stars. Whimsical children's garden illustration, soft pastel colors, simple shapes, magical sparkles, friendly aesthetic. Top-down view.", outputPath: path.join(ROOT, 'assets/gardens/star_stage_4.webp') },
  { prompt: "Star Garden growth stage 5. Golden star flowers full bloom. Gold, yellow palette. Starlit garden glowing. Whimsical children's garden illustration, soft pastel colors, simple shapes, magical sparkles, friendly aesthetic. Top-down view.", outputPath: path.join(ROOT, 'assets/gardens/star_stage_5.webp') },
  // Hug Garden (5 stages)
  { prompt: "Hug Garden growth stage 1. Embracing plants, friendly vines just sprouting. Warm brown, green palette. Tiny hugging vines. Whimsical children's garden illustration, soft pastel colors, simple shapes, magical sparkles, friendly aesthetic. Top-down view.", outputPath: path.join(ROOT, 'assets/gardens/hug_stage_1.webp') },
  { prompt: "Hug Garden growth stage 2. Embracing plants, friendly vines small growth. Warm brown, green palette. Small hugging vines. Whimsical children's garden illustration, soft pastel colors, simple shapes, magical sparkles, friendly aesthetic. Top-down view.", outputPath: path.join(ROOT, 'assets/gardens/hug_stage_2.webp') },
  { prompt: "Hug Garden growth stage 3. Embracing plants, friendly vines medium growth. Warm brown, green palette. Vines intertwining. Whimsical children's garden illustration, soft pastel colors, simple shapes, magical sparkles, friendly aesthetic. Top-down view.", outputPath: path.join(ROOT, 'assets/gardens/hug_stage_3.webp') },
  { prompt: "Hug Garden growth stage 4. Embracing plants, friendly vines nearly mature. Warm brown, green palette. Vines hugging gently. Whimsical children's garden illustration, soft pastel colors, simple shapes, magical sparkles, friendly aesthetic. Top-down view.", outputPath: path.join(ROOT, 'assets/gardens/hug_stage_4.webp') },
  { prompt: "Hug Garden growth stage 5. Embracing plants, friendly vines full bloom. Warm brown, green palette. Garden full of warm hugs. Whimsical children's garden illustration, soft pastel colors, simple shapes, magical sparkles, friendly aesthetic. Top-down view.", outputPath: path.join(ROOT, 'assets/gardens/hug_stage_5.webp') },
  // Share Garden (5 stages)
  { prompt: "Share Garden growth stage 1. Cookie plants, gift box flowers just sprouting. Blue, yellow palette. Tiny sharing symbols. Whimsical children's garden illustration, soft pastel colors, simple shapes, magical sparkles, friendly aesthetic. Top-down view.", outputPath: path.join(ROOT, 'assets/gardens/share_stage_1.webp') },
  { prompt: "Share Garden growth stage 2. Cookie plants, gift box flowers small growth. Blue, yellow palette. Small sharing blooms. Whimsical children's garden illustration, soft pastel colors, simple shapes, magical sparkles, friendly aesthetic. Top-down view.", outputPath: path.join(ROOT, 'assets/gardens/share_stage_2.webp') },
  { prompt: "Share Garden growth stage 3. Cookie plants, gift box flowers medium growth. Blue, yellow palette. Half-grown sharing gifts. Whimsical children's garden illustration, soft pastel colors, simple shapes, magical sparkles, friendly aesthetic. Top-down view.", outputPath: path.join(ROOT, 'assets/gardens/share_stage_3.webp') },
  { prompt: "Share Garden growth stage 4. Cookie plants, gift box flowers nearly mature. Blue, yellow palette. Gift boxes opening. Whimsical children's garden illustration, soft pastel colors, simple shapes, magical sparkles, friendly aesthetic. Top-down view.", outputPath: path.join(ROOT, 'assets/gardens/share_stage_4.webp') },
  { prompt: "Share Garden growth stage 5. Cookie plants, gift box flowers full bloom. Blue, yellow palette. Garden full of sharing. Whimsical children's garden illustration, soft pastel colors, simple shapes, magical sparkles, friendly aesthetic. Top-down view.", outputPath: path.join(ROOT, 'assets/gardens/share_stage_5.webp') },
  // Kind Words Garden (5 stages)
  { prompt: "Kind Words Garden growth stage 1. Speech bubble flowers just sprouting. Cyan, white palette. Tiny word bubbles. Whimsical children's garden illustration, soft pastel colors, simple shapes, magical sparkles, friendly aesthetic. Top-down view.", outputPath: path.join(ROOT, 'assets/gardens/kind_words_stage_1.webp') },
  { prompt: "Kind Words Garden growth stage 2. Speech bubble flowers small growth. Cyan, white palette. Small speech bubbles. Whimsical children's garden illustration, soft pastel colors, simple shapes, magical sparkles, friendly aesthetic. Top-down view.", outputPath: path.join(ROOT, 'assets/gardens/kind_words_stage_2.webp') },
  { prompt: "Kind Words Garden growth stage 3. Speech bubble flowers medium growth. Cyan, white palette. Half-grown word bubbles. Whimsical children's garden illustration, soft pastel colors, simple shapes, magical sparkles, friendly aesthetic. Top-down view.", outputPath: path.join(ROOT, 'assets/gardens/kind_words_stage_3.webp') },
  { prompt: "Kind Words Garden growth stage 4. Speech bubble flowers nearly mature. Cyan, white palette. Bubbles with kind messages. Whimsical children's garden illustration, soft pastel colors, simple shapes, magical sparkles, friendly aesthetic. Top-down view.", outputPath: path.join(ROOT, 'assets/gardens/kind_words_stage_4.webp') },
  { prompt: "Kind Words Garden growth stage 5. Speech bubble flowers full bloom. Cyan, white palette. Garden full of kind words. Whimsical children's garden illustration, soft pastel colors, simple shapes, magical sparkles, friendly aesthetic. Top-down view.", outputPath: path.join(ROOT, 'assets/gardens/kind_words_stage_5.webp') },
  // Magic Garden (5 stages)
  { prompt: "Magic Garden growth stage 1. Wand flowers, spell book plants just sprouting. Purple, silver palette. Tiny magic symbols. Whimsical children's garden illustration, soft pastel colors, simple shapes, magical sparkles, friendly aesthetic. Top-down view.", outputPath: path.join(ROOT, 'assets/gardens/magic_stage_1.webp') },
  { prompt: "Magic Garden growth stage 2. Wand flowers, spell book plants small growth. Purple, silver palette. Small magical blooms. Whimsical children's garden illustration, soft pastel colors, simple shapes, magical sparkles, friendly aesthetic. Top-down view.", outputPath: path.join(ROOT, 'assets/gardens/magic_stage_2.webp') },
  { prompt: "Magic Garden growth stage 3. Wand flowers, spell book plants medium growth. Purple, silver palette. Half-grown magic wands. Whimsical children's garden illustration, soft pastel colors, simple shapes, magical sparkles, friendly aesthetic. Top-down view.", outputPath: path.join(ROOT, 'assets/gardens/magic_stage_3.webp') },
  { prompt: "Magic Garden growth stage 4. Wand flowers, spell book plants nearly mature. Purple, silver palette. Glowing magic wands. Whimsical children's garden illustration, soft pastel colors, simple shapes, magical sparkles, friendly aesthetic. Top-down view.", outputPath: path.join(ROOT, 'assets/gardens/magic_stage_4.webp') },
  { prompt: "Magic Garden growth stage 5. Wand flowers, spell book plants full bloom. Purple, silver palette. Garden full of magic. Whimsical children's garden illustration, soft pastel colors, simple shapes, magical sparkles, friendly aesthetic. Top-down view.", outputPath: path.join(ROOT, 'assets/gardens/magic_stage_5.webp') },
  // Dream Garden (5 stages)
  { prompt: "Dream Garden growth stage 1. Cloud plants, moon flowers just sprouting. Soft blue, silver palette. Tiny dream symbols. Whimsical children's garden illustration, soft pastel colors, simple shapes, magical sparkles, friendly aesthetic. Top-down view.", outputPath: path.join(ROOT, 'assets/gardens/dream_stage_1.webp') },
  { prompt: "Dream Garden growth stage 2. Cloud plants, moon flowers small growth. Soft blue, silver palette. Small dreamy blooms. Whimsical children's garden illustration, soft pastel colors, simple shapes, magical sparkles, friendly aesthetic. Top-down view.", outputPath: path.join(ROOT, 'assets/gardens/dream_stage_2.webp') },
  { prompt: "Dream Garden growth stage 3. Cloud plants, moon flowers medium growth. Soft blue, silver palette. Half-grown clouds. Whimsical children's garden illustration, soft pastel colors, simple shapes, magical sparkles, friendly aesthetic. Top-down view.", outputPath: path.join(ROOT, 'assets/gardens/dream_stage_3.webp') },
  { prompt: "Dream Garden growth stage 4. Cloud plants, moon flowers nearly mature. Soft blue, silver palette. Floating clouds and moons. Whimsical children's garden illustration, soft pastel colors, simple shapes, magical sparkles, friendly aesthetic. Top-down view.", outputPath: path.join(ROOT, 'assets/gardens/dream_stage_4.webp') },
  { prompt: "Dream Garden growth stage 5. Cloud plants, moon flowers full bloom. Soft blue, silver palette. Dreamy garden with stars. Whimsical children's garden illustration, soft pastel colors, simple shapes, magical sparkles, friendly aesthetic. Top-down view.", outputPath: path.join(ROOT, 'assets/gardens/dream_stage_5.webp') },
];

const APP_ICONS = [
  {
    prompt: `${ICON_STYLE}, a magical glowing pink heart with tiny sparkles and a small unicorn horn on top, pastel pink and purple gradient background, love and kindness theme`,
    outputPath: path.join(ROOT, 'assets/icons/app-icon-512.png'),
  },
  {
    prompt: `${ICON_STYLE}, a magical glowing pink heart with sparkles around it, a small white unicorn silhouette inside the heart, soft pink background, app icon for a kids kindness app`,
    outputPath: path.join(ROOT, 'assets/icons/app-icon-192.png'),
  },
];

const STORY_COVERS = [
  {
    prompt: `${STYLE}, a small cute white bunny with big eyes sitting in a lush green garden with pink flowers and soft sunlight filtering through, storybook cover illustration`,
    outputPath: path.join(ROOT, 'assets/illustrations/stories/lost-bunny-cover.png'),
  },
  {
    prompt: `cute kawaii illustration, a bright colorful rainbow umbrella standing open in a gentle rain shower, soft puddles with reflections, pastel blue and purple tones, dreamy warm mood, digital painting storybook cover`,
    outputPath: path.join(ROOT, 'assets/illustrations/stories/rainy-day-cover.png'),
  },
  {
    prompt: `cute kawaii illustration, a cheerful garden with bright sunflowers tulips and daisies, colorful butterflies flying, a small watering can sitting in the garden, warm golden sunlight rays, digital painting storybook cover`,
    outputPath: path.join(ROOT, 'assets/illustrations/stories/garden-surprise-cover.png'),
  },
  {
    prompt: `${STYLE}, a friendly scene at a colorful playground with swings and slide, a cute fox cub waving to a bunny, warm happy atmosphere, storybook cover illustration`,
    outputPath: path.join(ROOT, 'assets/illustrations/stories/new-kid-cover.png'),
  },
  {
    prompt: `${STYLE}, two cute bear cubs sitting at a table sharing a picnic lunch and cookies, warm cozy scene, friendship and sharing theme, storybook cover`,
    outputPath: path.join(ROOT, 'assets/illustrations/stories/sharing-lunch-cover.png'),
  },
];

const STORY_SCENES = [
  // Lost Bunny scenes
  {
    prompt: `${STYLE}, a small cute bunny looking lost and sad in a garden path with flowers, soft lighting, gentle atmosphere, children's book page illustration`,
    outputPath: path.join(ROOT, 'assets/illustrations/stories/lost-bunny-1.png'),
    aspectRatio: '3:4',
  },
  {
    prompt: `${STYLE}, a family of cute white bunnies happily reunited under a big oak tree, hearts floating above them, warm golden sunset light, children's book illustration`,
    outputPath: path.join(ROOT, 'assets/illustrations/stories/lost-bunny-end.png'),
    aspectRatio: '3:4',
  },
  // Rainy Day scenes
  {
    prompt: `cute kawaii illustration, two adorable kittens under a big colorful umbrella, gentle rain falling around them, small puddles, pastel blue tones, cozy and warm, digital painting`,
    outputPath: path.join(ROOT, 'assets/illustrations/stories/rainy-day-sharing.png'),
    aspectRatio: '3:4',
  },
  {
    prompt: `${STYLE}, two cute kittens sitting at a cozy table with warm hot cocoa, steaming mugs, rain on windows, warm and happy, storybook page illustration`,
    outputPath: path.join(ROOT, 'assets/illustrations/stories/rainy-day-end.png'),
    aspectRatio: '3:4',
  },
  // Garden Surprise scenes
  {
    prompt: `${STYLE}, a cute squirrel carefully watering droopy flowers in a garden with a tiny watering can, flowers beginning to perk up, sunshine, storybook page illustration`,
    outputPath: path.join(ROOT, 'assets/illustrations/stories/garden-watering.png'),
    aspectRatio: '3:4',
  },
  {
    prompt: `digital painting, a magical garden at sunset, tall sunflowers and pink roses in full bloom, golden sparkles floating in the air, soft warm light, peaceful and beautiful, no text no words`,
    outputPath: path.join(ROOT, 'assets/illustrations/stories/garden-end.png'),
    aspectRatio: '3:4',
  },
  // New Kid scenes
  {
    prompt: `${STYLE}, a cute fox cub sitting alone on a bench at a colorful park, looking shy and nervous, gentle empathetic mood, storybook page illustration`,
    outputPath: path.join(ROOT, 'assets/illustrations/stories/new-kid-alone.png'),
    aspectRatio: '3:4',
  },
  {
    prompt: `${STYLE}, a cute fox cub and a bunny playing together on swings at a colorful park, big smiles, sunshine and rainbow, best friends, storybook page illustration`,
    outputPath: path.join(ROOT, 'assets/illustrations/stories/new-kid-end.png'),
    aspectRatio: '3:4',
  },
  // Sharing Lunch scenes
  {
    prompt: `cute kawaii illustration, a cozy picnic blanket with a sandwich cut in half, cookies and juice boxes, flowers around the blanket, warm sunny day, sharing and kindness theme, digital painting`,
    outputPath: path.join(ROOT, 'assets/illustrations/stories/sharing-lunch-offer.png'),
    aspectRatio: '3:4',
  },
  {
    prompt: `${STYLE}, two cute bear cubs happily eating a picnic together sharing cookies, hearts floating, warm cozy feeling, best friends, storybook page illustration`,
    outputPath: path.join(ROOT, 'assets/illustrations/stories/sharing-lunch-end.png'),
    aspectRatio: '3:4',
  },
];

const STICKERS = [
  // Unicorns
  { prompt: `${STICKER_STYLE}, a cute rainbow unicorn with sparkly mane, happy expression, kawaii`, outputPath: path.join(ROOT, 'assets/illustrations/stickers/unicorn-rainbow.png') },
  { prompt: `${STICKER_STYLE}, a sparkling white unicorn surrounded by tiny stars and glitter, magical`, outputPath: path.join(ROOT, 'assets/illustrations/stickers/unicorn-sparkle.png') },
  { prompt: `${STICKER_STYLE}, a cute unicorn casting magic from its horn, purple and blue sparkles`, outputPath: path.join(ROOT, 'assets/illustrations/stickers/unicorn-magic.png') },
  { prompt: `${STICKER_STYLE}, a cute unicorn sitting on a golden star, dreamy starry background`, outputPath: path.join(ROOT, 'assets/illustrations/stickers/unicorn-star.png') },
  { prompt: `${STICKER_STYLE}, a cute purple unicorn with a flower crown, gentle smile`, outputPath: path.join(ROOT, 'assets/illustrations/stickers/unicorn-purple.png') },
  // Balloons & Celebration
  { prompt: `${STICKER_STYLE}, a single shiny red balloon floating with a cute bow, simple`, outputPath: path.join(ROOT, 'assets/illustrations/stickers/balloon-red.png') },
  { prompt: `${STICKER_STYLE}, two colorful balloons tied together, pink and blue, festive`, outputPath: path.join(ROOT, 'assets/illustrations/stickers/balloon-double.png') },
  { prompt: `${STICKER_STYLE}, a cute party popper exploding with confetti and streamers, celebration`, outputPath: path.join(ROOT, 'assets/illustrations/stickers/party-popper.png') },
  // Hearts & Stars
  { prompt: `${STICKER_STYLE}, a glowing purple heart with tiny sparkles, magical love symbol`, outputPath: path.join(ROOT, 'assets/illustrations/stickers/heart-purple.png') },
  { prompt: `${STICKER_STYLE}, a bright gold star with a smiley face, simple and cheerful`, outputPath: path.join(ROOT, 'assets/illustrations/stickers/star-gold.png') },
  { prompt: `${STICKER_STYLE}, a sparkling pink heart with a golden ribbon bow`, outputPath: path.join(ROOT, 'assets/illustrations/stickers/heart-sparkling.png') },
  // Animals
  { prompt: `${STICKER_STYLE}, a cute fluffy white bunny with big sparkly eyes and pink cheeks`, outputPath: path.join(ROOT, 'assets/illustrations/stickers/bunny.png') },
  { prompt: `${STICKER_STYLE}, a cute golden puppy with floppy ears, happy tongue out, adorable`, outputPath: path.join(ROOT, 'assets/illustrations/stickers/puppy.png') },
  { prompt: `${STICKER_STYLE}, a cute calico kitten with big eyes, playful pose, kawaii`, outputPath: path.join(ROOT, 'assets/illustrations/stickers/kitty.png') },
  { prompt: `${STICKER_STYLE}, a beautiful colorful butterfly with pastel wings, simple and elegant`, outputPath: path.join(ROOT, 'assets/illustrations/stickers/butterfly.png') },
  // Nature
  { prompt: `${STICKER_STYLE}, a bright happy sunflower with a cute smiley face`, outputPath: path.join(ROOT, 'assets/illustrations/stickers/sunflower.png') },
  { prompt: `${STICKER_STYLE}, a cheerful rainbow arc with small clouds on each end, colorful`, outputPath: path.join(ROOT, 'assets/illustrations/stickers/rainbow.png') },
  { prompt: `${STICKER_STYLE}, a cute cherry blossom branch with soft pink petals floating`, outputPath: path.join(ROOT, 'assets/illustrations/stickers/cherry-blossom.png') },
  // Streak Milestones
  { prompt: `${STICKER_STYLE}, a cute kawaii flame character with the number 3, friendly fire emoji style, achievement badge`, outputPath: path.join(ROOT, 'assets/illustrations/stickers/streak-3-fire.png') },
  { prompt: `${STICKER_STYLE}, a sparkling blue gemstone crystal, magical glow, achievement badge`, outputPath: path.join(ROOT, 'assets/illustrations/stickers/streak-7-gem.png') },
  { prompt: `${STICKER_STYLE}, a cute golden crown with sparkles and jewels, royal achievement`, outputPath: path.join(ROOT, 'assets/illustrations/stickers/streak-14-crown.png') },
  { prompt: `${STICKER_STYLE}, a shiny golden trophy cup with sparkles, champion achievement, celebration`, outputPath: path.join(ROOT, 'assets/illustrations/stickers/streak-30-trophy.png') },
  // Ultimate
  { prompt: `${STICKER_STYLE}, a majestic unicorn wearing a golden crown, rainbow mane, sparkles everywhere, ultimate achievement, special premium feeling`, outputPath: path.join(ROOT, 'assets/illustrations/stickers/unicorn-queen.png') },
];

const BACKGROUNDS = [
  {
    prompt: `soft pastel gradient background, pink to lavender to light blue, smooth, dreamy, subtle sparkle texture, no objects, abstract, children's app background`,
    outputPath: path.join(ROOT, 'assets/illustrations/backgrounds/home-bg.png'),
    aspectRatio: '3:4',
  },
  {
    prompt: `${STYLE}, a magical sparkly unicorn character floating with rainbow trail, cute companion character for kids app, white body, pink and purple mane, friendly expression, isolated on transparent-feeling soft pastel background`,
    outputPath: path.join(ROOT, 'assets/illustrations/blaire/sparkle-unicorn.png'),
  },
  {
    prompt: `soft pastel green meadow background with tiny flowers and butterflies, dreamy, children's illustration style, gentle, no text, subtle, wallpaper pattern`,
    outputPath: path.join(ROOT, 'assets/illustrations/backgrounds/tracker-bg.png'),
    aspectRatio: '3:4',
  },
  {
    prompt: `soft pastel purple and blue starry sky background, gentle twinkling stars, dreamy clouds, children's illustration style, magical atmosphere, no text`,
    outputPath: path.join(ROOT, 'assets/illustrations/backgrounds/rewards-bg.png'),
    aspectRatio: '3:4',
  },
  {
    prompt: `soft pastel golden sparkle background, warm yellow to soft amber gradient, tiny floating golden stars and sparkle dots, magical treasure feeling, children's illustration style, no text, abstract wallpaper`,
    outputPath: path.join(ROOT, 'assets/illustrations/backgrounds/quests-bg.png'),
    aspectRatio: '3:4',
  },
  {
    prompt: `soft pastel orange and coral playful background, floating confetti shapes, balloons and swirls, fun carnival atmosphere, children's illustration style, no text, abstract wallpaper`,
    outputPath: path.join(ROOT, 'assets/illustrations/backgrounds/games-bg.png'),
    aspectRatio: '3:4',
  },
  {
    prompt: `soft pastel garden background, green grass with tiny sprouting plants and flowers at different growth stages, warm sunlight, gentle and hopeful feeling, children's illustration style, no text, abstract wallpaper`,
    outputPath: path.join(ROOT, 'assets/illustrations/backgrounds/progress-bg.png'),
    aspectRatio: '3:4',
  },
];

// ── Kind Act Category Illustrations ──
const KIND_ACT_ICONS = [
  {
    prompt: `${STICKER_STYLE}, two cute teddy bears hugging warmly, pink hearts floating around them, gentle hug illustration, kawaii friendship`,
    outputPath: path.join(ROOT, 'assets/illustrations/acts/act-hug.png'),
  },
  {
    prompt: `${STICKER_STYLE}, a cute speech bubble with a small heart inside, kind words theme, pastel blue, friendly communication`,
    outputPath: path.join(ROOT, 'assets/illustrations/acts/act-nice-words.png'),
  },
  {
    prompt: `${STICKER_STYLE}, a cute kawaii cookie being split in half with sparkles, generous sharing gesture, warm green tones, giving and kindness`,
    outputPath: path.join(ROOT, 'assets/illustrations/acts/act-sharing.png'),
  },
  {
    prompt: `${STICKER_STYLE}, a cute bunny rabbit carrying a basket of flowers, helpful gesture, warm yellow tones, kawaii helper illustration`,
    outputPath: path.join(ROOT, 'assets/illustrations/acts/act-helping.png'),
  },
  {
    prompt: `${STICKER_STYLE}, a glowing purple heart with tiny sparkle wings, love and care symbol, magical affection, kawaii love`,
    outputPath: path.join(ROOT, 'assets/illustrations/acts/act-love.png'),
  },
  {
    prompt: `${STICKER_STYLE}, a cute magical unicorn giving a gift box, special kindness, rainbow sparkles, kawaii special moment`,
    outputPath: path.join(ROOT, 'assets/illustrations/acts/act-unicorn.png'),
  },
];

// ── Game Illustrations ──
const GAME_ILLUSTRATIONS = [
  {
    prompt: `${STYLE}, a playful scene of cute hearts and stars falling from a rainbow sky, catching game concept, bright and exciting, children's game illustration`,
    outputPath: path.join(ROOT, 'assets/illustrations/games/game-catcher.png'),
  },
  {
    prompt: `${STYLE}, a cute grid of face-down purple cards with sparkles, one card flipped showing a unicorn, memory matching game, children's game illustration`,
    outputPath: path.join(ROOT, 'assets/illustrations/games/game-memory.png'),
  },
  {
    prompt: `${STYLE}, a cute white unicorn being gently hugged with floating hearts and sparkles around, warm and cozy, children's game illustration`,
    outputPath: path.join(ROOT, 'assets/illustrations/games/game-hug.png'),
  },
  {
    prompt: `${STICKER_STYLE}, a kawaii rainbow colored crayon box with sparkles, cute art supplies illustration, bright and cheerful, creative theme`,
    outputPath: path.join(ROOT, 'assets/illustrations/games/game-paint.png'),
  },
];

// ═══════════════════════════════════════════
// RUNNER
// ═══════════════════════════════════════════

async function generateBatch(items, concurrency = 2, convertWebP = false) {
  const queue = [...items];
  const results = [];

  const worker = async () => {
    while (queue.length > 0) {
      const item = queue.shift();
      const result = await generateImage({
        prompt: item.prompt,
        outputPath: item.outputPath,
        aspectRatio: item.aspectRatio || '1:1',
        negativePrompt: NEG,
      }).catch(err => {
        console.error(`  ERROR: ${path.basename(item.outputPath)} — ${err.message}`);
        return null;
      });

      // Convert PNG to WebP if requested
      if (result && convertWebP && item.outputPath.endsWith('.webp')) {
        const pngPath = item.outputPath.replace('.webp', '.png');
        await fs.rename(result, pngPath);
        await convertToWebP(pngPath, item.outputPath);
      }

      results.push(result);

      // 65s spacing between requests (quota management)
      if (queue.length > 0) {
        await sleep(65_000);
      }
    }
  };

  await Promise.all(Array(concurrency).fill(0).map(() => worker()));
  return results;
}

async function runBatch(name, items, options = {}) {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`Generating: ${name} (${items.length} images)`);
  console.log('='.repeat(50));

  const results = options.parallel
    ? await generateBatch(items, 2, options.convertWebP)
    : await generateBatch(items, 1, options.convertWebP);

  const success = results.filter(Boolean).length;
  console.log(`  Done: ${success}/${items.length} succeeded`);
  return results;
}

// ── Main ──

const section = process.argv[2]; // optional: companions, gardens, icons, stories, stickers, backgrounds, kind-acts, games, all

async function main() {
  console.log('Blaire\'s Kind Heart — Image Generation');
  console.log(`Project: ${PROJECT_ID}`);
  console.log(`Target: ${ROOT}`);

  const all = !section || section === 'all';

  // Week 2: Companion skins and gardens (WebP with parallel generation)
  if (all || section === 'companions') {
    await runBatch('Companion Skins', COMPANION_BATCH, { parallel: true, convertWebP: true });
  }
  if (all || section === 'gardens') {
    await runBatch('Garden Growth Stages', GARDEN_BATCH, { parallel: true, convertWebP: true });
  }

  // Original batches
  if (all || section === 'icons') await runBatch('App Icons', APP_ICONS);
  if (all || section === 'stories') {
    await runBatch('Story Covers', STORY_COVERS);
    await runBatch('Story Scenes', STORY_SCENES);
  }
  if (all || section === 'stickers') await runBatch('Stickers', STICKERS);
  if (all || section === 'backgrounds') await runBatch('Backgrounds', BACKGROUNDS);
  if (all || section === 'kind-acts') await runBatch('Kind Act Icons', KIND_ACT_ICONS);
  if (all || section === 'games') await runBatch('Game Illustrations', GAME_ILLUSTRATIONS);

  console.log('\nAll done!');
}

main().catch(console.error);

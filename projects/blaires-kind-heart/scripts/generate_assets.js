#!/usr/bin/env node

/**
 * Asset Generation Script for Blaire's Kind Heart
 * Uses Google Gemini Pro 3 for image generation
 *
 * Total: ~178 images
 * - 18 companion skins (6 skins × 3 poses)
 * - 50 story illustrations (10 stories × 5 pages)
 * - 60 garden visuals (12 gardens × 5 stages)
 * - 10 custom badge icons
 * - 12 quest chain headers
 * - 8 Mom Mode graphics
 * - 14 celebration animations
 *
 * Rate limiting: 10 requests/minute = 6s between calls
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, '..');

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-3-pro' });

// Delay helper for rate limiting
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function generateAsset(prompt, outputPath, width = 2048, height = 2048) {
  try {
    console.log(`\n🎨 Generating: ${path.basename(outputPath)}`);
    console.log(`   Size: ${width}×${height}px`);

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ['image'],
        responseImageFormat: 'png',
        // Add image generation parameters
        aspectRatio: width === height ? '1:1' : width > height ? '4:3' : '3:4',
        imageWidth: width,
        imageHeight: height
      }
    });

    const imageData = result.response.image.data;
    await fs.writeFile(outputPath, Buffer.from(imageData, 'base64'));
    console.log(`   ✓ Saved: ${outputPath}`);

    return true;
  } catch (error) {
    console.error(`   ✗ Failed: ${error.message}`);
    return false;
  }
}

// Style guide constants
const STYLE_GUIDE = {
  base: 'Soft, rounded shapes (no sharp edges), pastel color palette (pink, lavender, mint, sky blue, peach), high contrast for 4-year-old readability, whimsical, magical, friendly aesthetic, large bold elements (no fine detail)',
  companion: 'Small friendly creature (mix of bunny + unicorn), round body, big expressive eyes, soft floppy ears, small rainbow unicorn horn',
  colors: 'Pastel colors only - pink, lavender, mint, sky blue, peach, cream, soft rainbow accents',
  format: 'Children\'s book illustration style, simple shapes, friendly magical aesthetic'
};

// Companion skin definitions
const COMPANION_SKINS = [
  {
    id: 'default',
    name: 'Default Sparkle',
    description: 'Cream white fur, soft rainbow horn, pink inner ears',
    poses: ['happy standing', 'celebrating with sparkles', 'encouraging gesture']
  },
  {
    id: 'unicorn',
    name: 'Unicorn Sparkle',
    description: 'Pure white iridescent fur, golden horn, lavender mane',
    poses: ['happy standing', 'celebrating with sparkles', 'encouraging gesture']
  },
  {
    id: 'rainbow',
    name: 'Rainbow Sparkle',
    description: 'Color-shifting fur (pastel gradient), rainbow horn, multi-color accents',
    poses: ['happy standing', 'celebrating with sparkles', 'encouraging gesture']
  },
  {
    id: 'galaxy',
    name: 'Galaxy Sparkle',
    description: 'Deep purple-blue fur with star sparkles, silver horn, cosmic swirls',
    poses: ['happy standing', 'celebrating with sparkles', 'encouraging gesture']
  },
  {
    id: 'crystal',
    name: 'Crystal Sparkle',
    description: 'Translucent crystalline texture, prismatic horn, diamond sparkles',
    poses: ['happy standing', 'celebrating with sparkles', 'encouraging gesture']
  },
  {
    id: 'golden',
    name: 'Golden Sparkle',
    description: 'Shimmering gold fur, radiant horn, sunburst accents',
    poses: ['happy standing', 'celebrating with sparkles', 'encouraging gesture']
  }
];

async function generateCompanionSkins() {
  console.log('\n🦄 === GENERATING COMPANION SKINS (18 images) ===\n');

  const assetsDir = path.join(PROJECT_ROOT, 'assets', 'companions');
  await fs.mkdir(assetsDir, { recursive: true });

  let successCount = 0;
  let totalCount = 0;

  for (const skin of COMPANION_SKINS) {
    for (let i = 0; i < skin.poses.length; i++) {
      const pose = skin.poses[i];
      const poseId = ['happy', 'celebrate', 'encourage'][i];
      const outputPath = path.join(assetsDir, `${skin.id}_${poseId}.png`);

      const prompt = `${skin.description} companion character named Sparkle. ${STYLE_GUIDE.companion}. Pose: ${pose}. ${STYLE_GUIDE.base}. ${STYLE_GUIDE.colors}. ${STYLE_GUIDE.format}. White background. 2048x2048px.`;

      const success = await generateAsset(prompt, outputPath, 2048, 2048);
      totalCount++;
      if (success) successCount++;

      // Rate limit: 6 seconds between requests (10/min)
      await delay(6000);
    }
  }

  console.log(`\n✨ Companion Skins: ${successCount}/${totalCount} generated\n`);
  return { successCount, totalCount };
}

// Main execution
async function main() {
  console.log('🎨 BLAIRE\'S KIND HEART - ASSET GENERATION');
  console.log('=========================================\n');

  if (!process.env.GEMINI_API_KEY) {
    console.error('❌ Error: GEMINI_API_KEY environment variable not set');
    console.error('   Set it in your .env file or export it before running this script');
    process.exit(1);
  }

  const stats = {
    total: 0,
    success: 0,
    failed: 0
  };

  try {
    // Week 1: Generate companion skins (18 images)
    const companionStats = await generateCompanionSkins();
    stats.total += companionStats.totalCount;
    stats.success += companionStats.successCount;
    stats.failed += (companionStats.totalCount - companionStats.successCount);

    // TODO: Add story generation (50 images) - Week 2
    // TODO: Add garden generation (60 images) - Week 2
    // TODO: Add badge generation (10 images) - Week 3
    // TODO: Add quest chain headers (12 images) - Week 3
    // TODO: Add Mom Mode graphics (8 images) - Week 3
    // TODO: Add celebration animations (14 images) - Week 3

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }

  // Summary
  console.log('\n=========================================');
  console.log('📊 GENERATION SUMMARY');
  console.log('=========================================');
  console.log(`Total attempted: ${stats.total}`);
  console.log(`✓ Successful:    ${stats.success}`);
  console.log(`✗ Failed:        ${stats.failed}`);
  console.log('=========================================\n');

  if (stats.failed > 0) {
    console.log('⚠️  Some assets failed to generate. Review the log above for details.');
    process.exit(1);
  }

  console.log('✨ Asset generation complete!');
  console.log('\nNext steps:');
  console.log('1. Review generated images in assets/companions/');
  console.log('2. Convert to WebP: cd assets && ./optimize_images.sh');
  console.log('3. Update Service Worker precache list');
}

main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});

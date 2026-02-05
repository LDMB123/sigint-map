#!/usr/bin/env node

/**
 * Edit image for Predictable branding - KEEPING original subject and Vision Pro
 */

import { generateImage } from './projects/imagen-experiments/scripts/nanobanana-direct.js';
import path from 'path';

const imagePath = path.join(process.env.HOME, 'Documents', 'IMG_3801.jpeg');

const prompt = `
Edit this image for a prediction markets tech platform while KEEPING the exact same person and their Apple Vision Pro headset.

CRITICAL - DO NOT CHANGE:
- Keep the SAME person's face, features, and identity
- Keep the Apple Vision Pro headset ON (the blue ski goggle-looking device)
- Maintain their hoodie/casual tech wear style
- This is the actual person, do not replace them

CHANGES TO MAKE:

COMPOSITION:
- Reposition subject to be centered using rule of thirds
- Subject looking STRAIGHT into the camera with confident expression
- Square 1:1 aspect ratio format

BACKGROUND REPLACEMENT:
Replace the casual living room with a sophisticated prediction markets tech environment:
- Deep forest green (#1b4332) as the dominant background color
- Modern tech office or data visualization studio
- Prediction markets data visualizations, probability graphs, and analytics displays in the background (softly blurred)
- Professional editorial lighting - magazine-forward aesthetic
- Warm off-white (#faf9f6) accent lighting
- Professional depth of field with bokeh effect

LIGHTING & POLISH:
- Professional three-point studio lighting setup
- Soft key light from camera left
- Rim light to separate subject from background
- Fill light to eliminate harsh shadows
- Magazine-quality editorial lighting (Bloomberg, The Economist style)
- Sophisticated color grading with earth tones and deep greens

MOOD & AESTHETIC:
- Tech visionary / prediction markets expert vibe
- Apple Vision Pro suggests futuristic tech, spatial computing theme
- Confident, analytical, forward-thinking
- Professional yet innovative
- "Future of prediction markets" aesthetic

TECHNICAL:
- 4K photorealistic rendering
- Square 1:1 format
- Sharp focus on subject's face (visible under Vision Pro)
- Professional color grading matching Predictable brand
- Photorealistic - should look like professional photography

REMEMBER: Keep the SAME person and their Vision Pro headset. Only change the background, lighting, and composition.
`;

console.log('🎨 Editing image for Predictable branding (keeping Vision Pro)...');
console.log(`📸 Source: ${imagePath}`);
console.log('🎯 Keeping: Original person + Vision Pro headset');
console.log('🔄 Changing: Background, lighting, composition\n');

try {
  const result = await generateImage({
    prompt: prompt.trim(),
    editImagePath: imagePath,
    aspectRatio: '1:1',
    imageSize: '4K',
    showThinkingProcess: true
  });

  console.log('\n✅ Image editing complete!');
  console.log(`📁 Output: ${result.images[0]}`);
  console.log('\nChanges applied:');
  console.log('  ✓ Deep forest green (#1b4332) background');
  console.log('  ✓ Prediction markets data visualization environment');
  console.log('  ✓ Professional editorial lighting');
  console.log('  ✓ Centered composition, rule of thirds');
  console.log('  ✓ 4K photorealistic rendering');
  console.log('\nKept original:');
  console.log('  ✓ Same person');
  console.log('  ✓ Apple Vision Pro headset');

} catch (error) {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
}

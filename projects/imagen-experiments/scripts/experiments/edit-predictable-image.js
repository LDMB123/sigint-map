#!/usr/bin/env node

/**
 * Edit image for Predictable branding
 * Prediction markets tech aesthetic with photorealistic rendering
 */

import { generateImage } from './projects/imagen-experiments/scripts/nanobanana-direct.js';
import path from 'path';

const imagePath = path.join(process.env.HOME, 'Documents', 'IMG_3801.jpeg');

const prompt = `
Transform this image into a highly photorealistic, professional tech portrait for a prediction markets analytics platform.

SUBJECT POSITIONING:
- Center the subject using rule of thirds composition
- Subject should be looking STRAIGHT into the camera with confident, professional expression
- Professional tech industry headshot style
- Square 1:1 aspect ratio

BACKGROUND & ENVIRONMENT:
Replace the casual living room background with a sophisticated tech environment:
- Deep forest green (#1b4332) as the dominant brand color
- Modern, minimalist tech office or data visualization environment
- Subtle prediction markets data visualizations or probability graphs in the background (softly blurred)
- Professional lighting with clean, editorial quality
- Magazine-forward aesthetic - think Bloomberg, The Economist tech covers
- Warm off-white (#faf9f6) accent lighting
- Professional depth of field with bokeh effect

STYLING:
- Remove the ski goggles/VR headset - replace with professional tech attire
- Business casual or smart casual professional look
- Clean, editorial photography style
- Sophisticated color grading with earth tones
- Deep greens, warm neutrals, professional aesthetic
- Photorealistic rendering - this should look like a professional photography studio shot

LIGHTING:
- Professional three-point lighting setup
- Soft key light from camera left
- Subtle rim light to separate subject from background
- Fill light to eliminate harsh shadows
- Magazine-quality editorial lighting

MOOD:
- Confident, analytical, thoughtful
- Professional yet approachable
- Tech industry leadership aesthetic
- Prediction markets expert / data analyst vibe

Technical requirements:
- 4K resolution for maximum detail
- Photorealistic - indistinguishable from professional photography
- Square format (1:1) for social media and website use
- Sharp focus on subject's face and eyes
- Professional color grading
`;

console.log('🎨 Editing image for Predictable branding...');
console.log(`📸 Source: ${imagePath}`);
console.log('🎯 Style: Prediction markets tech, photorealistic 4K');
console.log('📐 Format: Square (1:1), rule of thirds composition\n');

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
  console.log('\nBranding details applied:');
  console.log('  • Deep forest green (#1b4332) primary color');
  console.log('  • Warm off-white (#faf9f6) accents');
  console.log('  • Editorial magazine-forward aesthetic');
  console.log('  • Professional prediction markets tech styling');
  console.log('  • Rule of thirds composition, centered subject');
  console.log('  • 4K photorealistic rendering');

} catch (error) {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
}

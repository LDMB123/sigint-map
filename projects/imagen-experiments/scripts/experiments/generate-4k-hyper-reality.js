#!/usr/bin/env node

import { generateImage } from './nanobanana-direct.js';
import fs from 'fs/promises';

const prompt = await fs.readFile('/tmp/hyper-reality-10-physics-4k.txt', 'utf-8');
const referenceImage = process.env.HOME + '/ClaudeCodeProjects/projects/imagen-experiments/assets/tinklesherpants_reference.jpeg';

console.log('🚀 Generating HYPER-REALITY 10-PHYSICS at 4K resolution...');
console.log(`📊 Prompt: ${prompt.split(' ').length} words`);
console.log(`🎯 Physics: 10 simultaneous phenomena`);
console.log(`📐 Resolution: 4K (3840×2160 or higher)`);

const result = await generateImage({
  prompt: prompt,
  imageSize: '4K',  // MAXIMUM RESOLUTION
  aspectRatio: '1:1',
  referenceImagePaths: [referenceImage],
  showThinkingProcess: true
});

console.log('\n✅ 4K HYPER-REALITY generation complete!');
console.log(`📁 Output: ${result.imagePath}`);
console.log(`💾 File size: ${(await fs.stat(result.imagePath)).size / (1024*1024)} MB`);

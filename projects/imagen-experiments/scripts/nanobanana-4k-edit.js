#!/usr/bin/env node

/**
 * Wrapper for nanobanana-direct.js that forces 4K output
 * Usage: node nanobanana-4k-edit.js /path/to/image.jpg "edit prompt"
 */

import { generateImage } from './nanobanana-direct.js';

const imagePath = process.argv[2];
const editPrompt = process.argv[3];

if (!imagePath || !editPrompt) {
  console.error('Usage: node nanobanana-4k-edit.js /path/to/image.jpg "edit prompt"');
  process.exit(1);
}

await generateImage({
  prompt: editPrompt,
  editImagePath: imagePath,
  imageSize: '4K',  // Force 4K resolution
  aspectRatio: '1:1'
});

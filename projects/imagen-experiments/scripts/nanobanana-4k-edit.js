#!/usr/bin/env node

/**
 * Wrapper for nanobanana-direct.js that forces 4K output
 * Usage: node nanobanana-4k-edit.js edit /path/to/image.jpg "edit prompt"
 */

import { generateImage } from './nanobanana-direct.js';

// Parse arguments: node script.js edit image.jpg "prompt"
const command = process.argv[2];  // "edit"
const imagePath = process.argv[3];  // image path
const editPrompt = process.argv[4];  // prompt text

if (command !== 'edit' || !imagePath || !editPrompt) {
  console.error('Usage: node nanobanana-4k-edit.js edit /path/to/image.jpg "edit prompt"');
  process.exit(1);
}

await generateImage({
  prompt: editPrompt,
  editImagePath: imagePath,
  imageSize: '4K',  // Force 4K resolution
  aspectRatio: '1:1'
});

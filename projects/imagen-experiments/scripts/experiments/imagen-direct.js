#!/usr/bin/env node

/**
 * Direct Imagen 3 API Implementation
 * Simple script for generating and editing images with Imagen 3
 * No MCP complexity - just straightforward API calls
 */

import { GoogleAuth } from 'google-auth-library';
import fs from 'fs/promises';
import path from 'path';

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || 'gen-lang-client-0925343693';
const LOCATION = 'us-central1';
const OUTPUT_DIR = path.join(process.env.HOME, 'imagen-output');

// Initialize Google Auth
const auth = new GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/cloud-platform'],
});

await fs.mkdir(OUTPUT_DIR, { recursive: true });

/**
 * Generate images with Imagen 3
 */
async function generateImage(options = {}) {
  const {
    prompt,
    model = 'imagen-3.0-generate-001', // or 'imagen-3.0-fast-generate-001'
    numberOfImages = 1,
    aspectRatio = '1:1',
    negativePrompt = null,
  } = options;

  console.log(`\n🎨 Generating ${numberOfImages} image(s) with Imagen 3...`);
  console.log(`Model: ${model}`);
  console.log(`Prompt: ${prompt}`);
  console.log(`Aspect Ratio: ${aspectRatio}`);

  const client = await auth.getClient();
  const accessToken = await client.getAccessToken();

  const endpoint = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${model}:predict`;

  const requestBody = {
    instances: [{ prompt }],
    parameters: {
      sampleCount: numberOfImages,
      aspectRatio,
    },
  };

  if (negativePrompt) {
    requestBody.parameters.negativePrompt = negativePrompt;
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Imagen API error: ${response.status} - ${JSON.stringify(error)}`);
  }

  const data = await response.json();
  const predictions = data.predictions || [];
  const savedImages = [];

  for (let i = 0; i < predictions.length; i++) {
    if (predictions[i].bytesBase64Encoded) {
      const imageData = Buffer.from(predictions[i].bytesBase64Encoded, 'base64');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `imagen_${timestamp}_${i + 1}.png`;
      const filepath = path.join(OUTPUT_DIR, filename);

      await fs.writeFile(filepath, imageData);
      savedImages.push(filepath);
      console.log(`✅ Saved: ${filepath} (${(imageData.length / 1024).toFixed(1)} KB)`);
    }
  }

  return savedImages;
}

/**
 * Edit images with Imagen 3 Capability
 *
 * Mask Modes:
 * - MASK_MODE_FOREGROUND: Auto-mask foreground objects (no mask image needed)
 * - MASK_MODE_BACKGROUND: Auto-mask background (no mask image needed)
 * - MASK_MODE_USER_PROVIDED: Provide your own mask image (requires maskPath)
 * - MASK_MODE_SEMANTIC: Semantic segmentation (requires maskClasses array)
 *
 * Edit Modes:
 * - EDIT_MODE_INPAINT_INSERTION: Add objects to masked area
 * - EDIT_MODE_INPAINT_REMOVAL: Remove objects from masked area
 * - EDIT_MODE_OUTPAINT: Extend image beyond boundaries
 * - EDIT_MODE_BGSWAP: Replace background
 */
async function editImage(options = {}) {
  const {
    imagePath,
    prompt,
    editMode = 'EDIT_MODE_INPAINT_INSERTION',
    maskMode = 'MASK_MODE_FOREGROUND', // Changed default to FOREGROUND (auto-masking)
    maskPath = null, // Optional separate mask image for USER_PROVIDED mode
    dilation = 0.03, // Optional mask dilation (0-1, default 3%)
    numberOfImages = 1,
  } = options;

  console.log(`\n✏️  Editing image with Imagen 3...`);
  console.log(`Source: ${imagePath}`);
  console.log(`Prompt: ${prompt}`);
  console.log(`Edit Mode: ${editMode}`);
  console.log(`Mask Mode: ${maskMode}`);

  const imageBuffer = await fs.readFile(imagePath);
  const base64Image = imageBuffer.toString('base64');

  const client = await auth.getClient();
  const accessToken = await client.getAccessToken();

  const model = 'imagen-3.0-capability-001';
  const endpoint = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${model}:predict`;

  // Build reference images array
  const referenceImages = [
    {
      referenceType: 'REFERENCE_TYPE_RAW',
      referenceId: 1,
      referenceImage: {
        bytesBase64Encoded: base64Image,
      },
    },
  ];

  // Add mask reference
  const maskReference = {
    referenceType: 'REFERENCE_TYPE_MASK',
    referenceId: 2,
    maskImageConfig: {
      maskMode,
      dilation,
    },
  };

  // If using user-provided mask, include the mask image
  if (maskMode === 'MASK_MODE_USER_PROVIDED') {
    if (!maskPath) {
      throw new Error('maskPath is required when using MASK_MODE_USER_PROVIDED');
    }
    const maskBuffer = await fs.readFile(maskPath);
    const base64Mask = maskBuffer.toString('base64');
    maskReference.referenceImage = {
      bytesBase64Encoded: base64Mask,
    };
  }
  // For FOREGROUND/BACKGROUND modes, no mask image needed - auto-generated

  referenceImages.push(maskReference);

  const requestBody = {
    instances: [
      {
        prompt,
        referenceImages,
      },
    ],
    parameters: {
      editMode,
      sampleCount: numberOfImages,
    },
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Imagen API error: ${response.status} - ${JSON.stringify(error)}`);
  }

  const data = await response.json();
  const predictions = data.predictions || [];
  const savedImages = [];

  for (let i = 0; i < predictions.length; i++) {
    if (predictions[i].bytesBase64Encoded) {
      const imageData = Buffer.from(predictions[i].bytesBase64Encoded, 'base64');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `imagen_edited_${timestamp}_${i + 1}.png`;
      const filepath = path.join(OUTPUT_DIR, filename);

      await fs.writeFile(filepath, imageData);
      savedImages.push(filepath);
      console.log(`✅ Saved: ${filepath} (${(imageData.length / 1024).toFixed(1)} KB)`);
    }
  }

  return savedImages;
}

// Export for use as module
export { generateImage, editImage };

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];

  if (command === 'generate') {
    const prompt = process.argv[3];
    if (!prompt) {
      console.error('Usage: node imagen-direct.js generate "your prompt here"');
      process.exit(1);
    }
    await generateImage({ prompt });
  } else if (command === 'edit') {
    const imagePath = process.argv[3];
    const prompt = process.argv[4];
    if (!imagePath || !prompt) {
      console.error('Usage: node imagen-direct.js edit /path/to/image.jpg "edit instructions"');
      process.exit(1);
    }
    await editImage({ imagePath, prompt });
  } else {
    console.log(`
Imagen 3 Direct API

Usage:
  Generate: node imagen-direct.js generate "a sunset over mountains"
  Edit:     node imagen-direct.js edit /path/to/image.jpg "add flowers"

Edit Features:
  - Auto-masks foreground/background (no mask image needed!)
  - Supports custom mask images for precise control
  - Multiple edit modes: inpaint, outpaint, background swap

Mask Modes (auto-selected):
  • MASK_MODE_FOREGROUND - Masks foreground objects automatically
  • MASK_MODE_BACKGROUND - Masks background automatically
  • MASK_MODE_USER_PROVIDED - Use your own mask image (advanced)

Edit Modes:
  • EDIT_MODE_INPAINT_INSERTION - Add objects (default)
  • EDIT_MODE_INPAINT_REMOVAL - Remove objects
  • EDIT_MODE_OUTPAINT - Extend image boundaries
  • EDIT_MODE_BGSWAP - Replace background

Environment:
  GOOGLE_CLOUD_PROJECT=${PROJECT_ID}
  Output Directory: ${OUTPUT_DIR}

Examples:
  node imagen-direct.js generate "professional headshot"
  node imagen-direct.js edit photo.jpg "add flowers in foreground"
    `);
  }
}

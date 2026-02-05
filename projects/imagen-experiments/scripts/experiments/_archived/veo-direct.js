#!/usr/bin/env node

/**
 * Veo 3.1 Direct API - Simplified Video Generation
 * Uses standard Gemini API with simple API key authentication
 * No OAuth complexity - same $100 Google Cloud credits
 */

import fs from 'fs/promises';
import path from 'path';

const API_KEY = process.env.GEMINI_API_KEY;
const OUTPUT_DIR = path.join(process.env.HOME, 'Videos', 'veo-output');

if (!API_KEY) {
  console.error('❌ Error: GEMINI_API_KEY environment variable not set');
  console.error('Set it with: export GEMINI_API_KEY="your-api-key"');
  process.exit(1);
}

await fs.mkdir(OUTPUT_DIR, { recursive: true });

/**
 * Poll operation until video generation completes
 */
async function pollOperation(operationName) {
  const pollUrl = `https://generativelanguage.googleapis.com/v1beta/${operationName}`;

  console.log('⏳ Video generation in progress...');
  let attempts = 0;
  const maxAttempts = 120; // 10 minutes max

  while (attempts < maxAttempts) {
    const response = await fetch(pollUrl, {
      headers: {
        'x-goog-api-key': API_KEY,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Poll error: ${response.status} - ${error}`);
    }

    const data = await response.json();

    if (data.done) {
      if (data.error) {
        throw new Error(`Generation failed: ${JSON.stringify(data.error)}`);
      }
      return data;
    }

    // Show progress
    if (data.metadata?.progressPercentage) {
      process.stdout.write(`\r⏳ Progress: ${data.metadata.progressPercentage}%`);
    } else {
      process.stdout.write(`\r⏳ Waiting... (${attempts * 5}s elapsed)`);
    }

    await new Promise(resolve => setTimeout(resolve, 5000));
    attempts++;
  }

  throw new Error('Operation timed out after 10 minutes');
}

/**
 * Generate video from text prompt
 */
async function generateVideo(options = {}) {
  const {
    prompt,
    model = 'veo-3.1-generate-preview', // or 'veo-3.1-fast-generate-preview'
    durationSeconds = '8',
    aspectRatio = '16:9',
    resolution = '720p',
    negativePrompt = null,
  } = options;

  console.log(`\n🎬 Generating video with ${model}...`);
  console.log(`Prompt: ${prompt}`);
  console.log(`Duration: ${durationSeconds}s, Aspect Ratio: ${aspectRatio}, Resolution: ${resolution}`);

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predictLongRunning`;

  const requestBody = {
    instances: [{
      prompt,
    }],
    parameters: {
      aspectRatio,
      resolution,
      durationSeconds,
    },
  };

  if (negativePrompt) {
    requestBody.parameters.negativePrompt = negativePrompt;
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'x-goog-api-key': API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Veo API error: ${response.status} - ${error}`);
  }

  const data = await response.json();

  if (!data.name) {
    throw new Error('No operation name returned from API');
  }

  console.log(`✅ Video generation started (operation: ${data.name})`);

  // Poll for completion
  const result = await pollOperation(data.name);
  console.log('\n✅ Video generation complete!');

  // Extract and save video
  const predictions = result.response?.predictions || [];
  const savedVideos = [];

  for (let i = 0; i < predictions.length; i++) {
    const prediction = predictions[i];

    if (prediction.bytesBase64Encoded) {
      const videoData = Buffer.from(prediction.bytesBase64Encoded, 'base64');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `veo_${timestamp}_${i + 1}.mp4`;
      const filepath = path.join(OUTPUT_DIR, filename);

      await fs.writeFile(filepath, videoData);
      savedVideos.push(filepath);
      console.log(`✅ Saved: ${filepath} (${(videoData.length / 1024 / 1024).toFixed(1)} MB)`);
    }
  }

  return savedVideos;
}

/**
 * Generate video from image + text prompt
 */
async function generateVideoFromImage(options = {}) {
  const {
    imagePath,
    prompt,
    model = 'veo-3.1-generate-preview',
    durationSeconds = '8',
    aspectRatio = '16:9',
    resolution = '720p',
  } = options;

  console.log(`\n🎬 Generating video from image with ${model}...`);
  console.log(`Image: ${imagePath}`);
  console.log(`Prompt: ${prompt}`);

  const imageBuffer = await fs.readFile(imagePath);
  const base64Image = imageBuffer.toString('base64');

  const ext = path.extname(imagePath).toLowerCase();
  const mimeType = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
                   ext === '.webp' ? 'image/webp' : 'image/png';

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predictLongRunning`;

  const requestBody = {
    instances: [{
      prompt,
      image: {
        inlineData: {
          mimeType,
          data: base64Image,
        },
      },
    }],
    parameters: {
      aspectRatio,
      resolution,
      durationSeconds,
    },
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'x-goog-api-key': API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Veo API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  console.log(`✅ Video generation started (operation: ${data.name})`);

  const result = await pollOperation(data.name);
  console.log('\n✅ Video generation complete!');

  const predictions = result.response?.predictions || [];
  const savedVideos = [];

  for (let i = 0; i < predictions.length; i++) {
    const prediction = predictions[i];
    if (prediction.bytesBase64Encoded) {
      const videoData = Buffer.from(prediction.bytesBase64Encoded, 'base64');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `veo_from_image_${timestamp}_${i + 1}.mp4`;
      const filepath = path.join(OUTPUT_DIR, filename);

      await fs.writeFile(filepath, videoData);
      savedVideos.push(filepath);
      console.log(`✅ Saved: ${filepath} (${(videoData.length / 1024 / 1024).toFixed(1)} MB)`);
    }
  }

  return savedVideos;
}

// Export for use as module
export { generateVideo, generateVideoFromImage };

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];

  try {
    if (command === 'generate') {
      const prompt = process.argv[3];
      if (!prompt) {
        console.error('Usage: node veo-direct.js generate "your prompt here"');
        process.exit(1);
      }
      await generateVideo({ prompt });
    } else if (command === 'from-image') {
      const imagePath = process.argv[3];
      const prompt = process.argv[4];
      if (!imagePath || !prompt) {
        console.error('Usage: node veo-direct.js from-image /path/to/image.jpg "video description"');
        process.exit(1);
      }
      await generateVideoFromImage({ imagePath, prompt });
    } else {
      console.log(`
Veo 3.1 Direct API - Simplified Video Generation

Usage:
  Text to video:  node veo-direct.js generate "waves crashing on a beach at sunset"
  Image to video: node veo-direct.js from-image /path/to/image.jpg "camera slowly zooms in"

Models:
  - veo-3.1-generate-preview (default, best quality)
  - veo-3.1-fast-generate-preview (faster generation)

Options (when using as module):
  - durationSeconds: '4', '6', or '8' (default: '8')
  - aspectRatio: '16:9' or '9:16' (default: '16:9')
  - resolution: '720p', '1080p', or '4k' (default: '720p')
  - negativePrompt: 'unwanted elements'

Environment:
  GEMINI_API_KEY=${API_KEY ? 'SET ✅' : 'NOT SET ❌'}
  Output Directory: ${OUTPUT_DIR}

Authentication:
  - Uses simple API key (same as Nano Banana Pro)
  - Same $100 Google Cloud credits
  - No OAuth complexity!

Note: Video generation takes 2-5 minutes. Progress will be shown.
      `);
    }
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

#!/usr/bin/env node
import { GoogleAuth } from 'google-auth-library';
import fs from 'fs/promises';
import path from 'path';

const PROJECT_ID = 'gen-lang-client-0925343693';
const LOCATION = 'us-central1';
const OUTPUT_DIR = path.join(process.env.HOME, 'imagen-output');

const auth = new GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/cloud-platform'],
});

await fs.mkdir(OUTPUT_DIR, { recursive: true });

// For transforming both person AND background, we use background swap mode
async function transformImage(imagePath, prompt) {
  console.log('\n🎨 Transforming image with Imagen 3...');
  console.log(`Source: ${imagePath}`);
  console.log(`Transformation: ${prompt}`);

  const imageBuffer = await fs.readFile(imagePath);
  const base64Image = imageBuffer.toString('base64');

  const client = await auth.getClient();
  const accessToken = await client.getAccessToken();

  const model = 'imagen-3.0-capability-001';
  const endpoint = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${model}:predict`;

  const requestBody = {
    instances: [
      {
        prompt,
        referenceImages: [
          {
            referenceType: 'REFERENCE_TYPE_RAW',
            referenceId: 1,
            referenceImage: {
              bytesBase64Encoded: base64Image,
            },
          },
          {
            referenceType: 'REFERENCE_TYPE_MASK',
            referenceId: 2,
            maskImageConfig: {
              maskMode: 'MASK_MODE_BACKGROUND',
              dilation: 0.06,
            },
          },
        ],
      },
    ],
    parameters: {
      editMode: 'EDIT_MODE_BGSWAP',
      sampleCount: 2,
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
    throw new Error(`API error: ${response.status} - ${JSON.stringify(error)}`);
  }

  const data = await response.json();
  const predictions = data.predictions || [];

  for (let i = 0; i < predictions.length; i++) {
    if (predictions[i].bytesBase64Encoded) {
      const imageData = Buffer.from(predictions[i].bytesBase64Encoded, 'base64');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `transform_${timestamp}_${i + 1}.png`;
      const filepath = path.join(OUTPUT_DIR, filename);

      await fs.writeFile(filepath, imageData);
      console.log(`✅ Saved: ${filepath} (${(imageData.length / 1024).toFixed(1)} KB)`);
    }
  }
}

const imagePath = process.argv[2];
const prompt = process.argv[3];

if (!imagePath || !prompt) {
  console.log('Usage: node imagen-transform.js /path/to/image.jpg "transformation description"');
  process.exit(1);
}

await transformImage(imagePath, prompt);

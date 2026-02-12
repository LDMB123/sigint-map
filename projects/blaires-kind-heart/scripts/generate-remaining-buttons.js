#!/usr/bin/env node

/**
 * Generate remaining button assets with longer delays to avoid rate limits
 */

import { GoogleAuth } from 'google-auth-library';
import fs from 'fs/promises';
import path from 'path';

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || 'gen-lang-client-0925343693';
const LOCATION = 'us-central1';
const MODEL = 'imagen-3.0-generate-001';
const OUTPUT_DIR = path.join(process.env.HOME, 'imagen-output', 'bkh-buttons');

const auth = new GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/cloud-platform'],
});

await fs.mkdir(OUTPUT_DIR, { recursive: true });

async function generateImage(prompt, filename) {
  console.log(`\n--- Generating: ${filename} ---`);

  // Skip if already exists
  const filepath = path.join(OUTPUT_DIR, filename);
  try {
    await fs.access(filepath);
    console.log(`SKIP: ${filename} already exists`);
    return filepath;
  } catch { /* file doesn't exist, proceed */ }

  const client = await auth.getClient();
  const accessToken = await client.getAccessToken();

  const endpoint = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL}:predict`;

  const requestBody = {
    instances: [{ prompt }],
    parameters: {
      sampleCount: 1,
      aspectRatio: '1:1',
      negativePrompt: 'text, words, letters, numbers, watermark, signature, ugly, blurry, low quality, dark, scary, realistic photo, photographic',
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
    if (error.error?.code === 429) {
      console.log(`Rate limited on ${filename} — waiting 65 seconds...`);
      await new Promise(r => setTimeout(r, 65000));
      // Retry once
      return generateImage(prompt, filename);
    }
    console.error(`ERROR: ${JSON.stringify(error)}`);
    return null;
  }

  const data = await response.json();
  const predictions = data.predictions || [];

  if (predictions.length > 0 && predictions[0].bytesBase64Encoded) {
    const imageData = Buffer.from(predictions[0].bytesBase64Encoded, 'base64');
    await fs.writeFile(filepath, imageData);
    console.log(`Saved: ${filepath} (${(imageData.length / 1024).toFixed(1)} KB)`);
    return filepath;
  }
  return null;
}

const STYLE = 'cute kawaii children\'s illustration style, soft pastel colors, rounded shapes, sparkles and magic stars, whimsical fairy-tale aesthetic, clean flat design with subtle gradients, transparent background, centered icon composition, no text, digital art for a kids app';

// All buttons — will skip already-generated ones
const allButtons = [
  // Home nav
  { name: 'btn-kind-acts.png', prompt: `A glowing pink heart with sparkles and tiny rainbow ribbons wrapped around it, ${STYLE}` },
  { name: 'btn-quests.png', prompt: `A golden star with a magical wand and sparkle trail, quest adventure theme, ${STYLE}` },
  { name: 'btn-stories.png', prompt: `An open storybook with magical sparkles and tiny stars floating out of the pages, fairy tale book, ${STYLE}` },
  { name: 'btn-stickers.png', prompt: `A collection of cute shiny stickers with a large glowing star in the center, sticker collection reward theme, ${STYLE}` },
  { name: 'btn-games.png', prompt: `A colorful game controller made of candy and rainbows with sparkle effects, fun games theme, ${STYLE}` },
  { name: 'btn-my-week.png', prompt: `A blooming sunflower with a small calendar showing growing progress bars, weekly progress garden theme, ${STYLE}` },
  { name: 'btn-show-mom.png', prompt: `A celebration party popper with confetti hearts and stars bursting out, celebration sharing theme, ${STYLE}` },
];

console.log('=== Generating remaining button assets ===');

let success = 0;
let skipped = 0;
for (const btn of allButtons) {
  try {
    const result = await generateImage(btn.prompt, btn.name);
    if (result) {
      if (result.includes('already')) skipped++;
      else success++;
    }
  } catch (err) {
    console.error(`Failed ${btn.name}:`, err.message);
  }
  // 12-second delay between calls to stay well under rate limits
  console.log('  (waiting 12s before next...)');
  await new Promise(r => setTimeout(r, 12000));
}

console.log(`\n=== Done: ${success} generated, ${skipped} skipped ===`);
console.log(`Output: ${OUTPUT_DIR}`);

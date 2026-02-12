#!/usr/bin/env node

/**
 * Generate button illustration assets for Blaire's Kind Heart
 * Uses Imagen 3 Pro via Vertex AI
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

async function generateImage(prompt, filename, aspectRatio = '1:1') {
  console.log(`\n--- Generating: ${filename} ---`);
  console.log(`Prompt: ${prompt}`);

  const client = await auth.getClient();
  const accessToken = await client.getAccessToken();

  const endpoint = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL}:predict`;

  const requestBody = {
    instances: [{ prompt }],
    parameters: {
      sampleCount: 1,
      aspectRatio,
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
    console.error(`ERROR generating ${filename}:`, JSON.stringify(error, null, 2));
    return null;
  }

  const data = await response.json();
  const predictions = data.predictions || [];

  if (predictions.length > 0 && predictions[0].bytesBase64Encoded) {
    const imageData = Buffer.from(predictions[0].bytesBase64Encoded, 'base64');
    const filepath = path.join(OUTPUT_DIR, filename);
    await fs.writeFile(filepath, imageData);
    console.log(`Saved: ${filepath} (${(imageData.length / 1024).toFixed(1)} KB)`);
    return filepath;
  }

  console.error(`No image data returned for ${filename}`);
  return null;
}

// ── Shared style prompt fragment ──
const STYLE = 'cute kawaii children\'s illustration style, soft pastel colors, rounded shapes, sparkles and magic stars, whimsical fairy-tale aesthetic, clean flat design with subtle gradients, transparent background, centered icon composition, no text, digital art for a kids app';

// ── Home navigation buttons (7 buttons) ──
const homeButtons = [
  {
    name: 'btn-kind-acts.png',
    prompt: `A glowing pink heart with sparkles and tiny rainbow ribbons wrapped around it, ${STYLE}`,
  },
  {
    name: 'btn-quests.png',
    prompt: `A golden star with a magical wand and sparkle trail, quest adventure theme, ${STYLE}`,
  },
  {
    name: 'btn-stories.png',
    prompt: `An open storybook with magical sparkles and tiny stars floating out of the pages, fairy tale book, ${STYLE}`,
  },
  {
    name: 'btn-stickers.png',
    prompt: `A collection of cute shiny stickers with a large glowing star in the center, sticker collection reward theme, ${STYLE}`,
  },
  {
    name: 'btn-games.png',
    prompt: `A colorful game controller made of candy and rainbows with sparkle effects, fun games theme, ${STYLE}`,
  },
  {
    name: 'btn-my-week.png',
    prompt: `A blooming sunflower with a small calendar/chart showing growing progress bars, weekly progress garden theme, ${STYLE}`,
  },
  {
    name: 'btn-show-mom.png',
    prompt: `A celebration party popper with confetti hearts and stars bursting out, celebration sharing theme, ${STYLE}`,
  },
];

// ── Kindness tracker category buttons (6 act types) ──
const actButtons = [
  {
    name: 'btn-act-hug.png',
    prompt: `Two cute cartoon characters hugging warmly with pink hearts floating around them, warm embrace kindness theme, ${STYLE}`,
  },
  {
    name: 'btn-act-nice-words.png',
    prompt: `A cute speech bubble with a smiling face and tiny hearts, kind words and compliments theme, ${STYLE}`,
  },
  {
    name: 'btn-act-sharing.png',
    prompt: `Two hands sharing a colorful gift box with sparkles, sharing and generosity theme, ${STYLE}`,
  },
  {
    name: 'btn-act-helping.png',
    prompt: `A cute cartoon hand helping another hand up with sparkles and a rainbow, helping others theme, ${STYLE}`,
  },
  {
    name: 'btn-act-love.png',
    prompt: `A large sparkling purple heart surrounded by smaller pink and gold hearts with magic dust, love and care theme, ${STYLE}`,
  },
  {
    name: 'btn-act-unicorn.png',
    prompt: `A magical sparkly unicorn with rainbow mane and horn glowing with magic, special magical kindness theme, ${STYLE}`,
  },
];

// ── Game card illustrations (5 games) ──
const gameButtons = [
  {
    name: 'btn-game-catcher.png',
    prompt: `A cute basket catching falling hearts and stars from the sky, catching kindness game theme, ${STYLE}`,
  },
  {
    name: 'btn-game-memory.png',
    prompt: `Cute matching cards flipping over to reveal hearts and stars, memory matching card game theme, ${STYLE}`,
  },
  {
    name: 'btn-game-hug.png',
    prompt: `A cute teddy bear giving a big warm hug with love hearts surrounding it, virtual hug game theme, ${STYLE}`,
  },
  {
    name: 'btn-game-paint.png',
    prompt: `A magical paintbrush painting rainbow colors and sparkles on a canvas, creative painting game theme, ${STYLE}`,
  },
  {
    name: 'btn-game-unicorn.png',
    prompt: `A baby unicorn running through a magical rainbow forest with sparkle friends, unicorn adventure game theme, ${STYLE}`,
  },
];

// ── Generate all assets ──
console.log('=== Blaire\'s Kind Heart — Button Asset Generation ===');
console.log(`Output: ${OUTPUT_DIR}`);
console.log(`Total images to generate: ${homeButtons.length + actButtons.length + gameButtons.length}`);

// Select which set to generate based on CLI arg
const setArg = process.argv[2] || 'all';
let buttons = [];
if (setArg === 'home' || setArg === 'all') buttons.push(...homeButtons);
if (setArg === 'acts' || setArg === 'all') buttons.push(...actButtons);
if (setArg === 'games' || setArg === 'all') buttons.push(...gameButtons);

console.log(`\nGenerating ${buttons.length} images (set: ${setArg})...`);

const results = { success: [], failed: [] };
for (const btn of buttons) {
  try {
    const result = await generateImage(btn.prompt, btn.name);
    if (result) {
      results.success.push(btn.name);
    } else {
      results.failed.push(btn.name);
    }
  } catch (err) {
    console.error(`Failed ${btn.name}:`, err.message);
    results.failed.push(btn.name);
  }
  // Small delay between API calls to avoid rate limits
  await new Promise(r => setTimeout(r, 1500));
}

console.log('\n=== Generation Complete ===');
console.log(`Success: ${results.success.length}/${buttons.length}`);
if (results.failed.length > 0) {
  console.log(`Failed: ${results.failed.join(', ')}`);
}
console.log(`Output directory: ${OUTPUT_DIR}`);

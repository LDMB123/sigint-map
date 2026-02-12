#!/usr/bin/env node

/**
 * Generate act category + game card button assets
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

async function generateImage(prompt, filename, retries = 1) {
  const filepath = path.join(OUTPUT_DIR, filename);
  try { await fs.access(filepath); console.log(`SKIP: ${filename} exists`); return filepath; } catch {}

  console.log(`Generating: ${filename}`);
  const client = await auth.getClient();
  const accessToken = await client.getAccessToken();

  const endpoint = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL}:predict`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      instances: [{ prompt }],
      parameters: { sampleCount: 1, aspectRatio: '1:1', negativePrompt: 'text, words, letters, numbers, watermark, signature, ugly, blurry, low quality, dark, scary, realistic photo' },
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    if (err.error?.code === 429 && retries > 0) {
      console.log(`  Rate limited — waiting 65s then retrying...`);
      await new Promise(r => setTimeout(r, 65000));
      return generateImage(prompt, filename, retries - 1);
    }
    console.error(`  ERROR: ${err.error?.message || JSON.stringify(err)}`);
    return null;
  }

  const data = await response.json();
  const pred = data.predictions?.[0];
  if (pred?.bytesBase64Encoded) {
    const buf = Buffer.from(pred.bytesBase64Encoded, 'base64');
    await fs.writeFile(filepath, buf);
    console.log(`  Saved: ${filename} (${(buf.length / 1024).toFixed(0)} KB)`);
    return filepath;
  }
  return null;
}

const STYLE = 'cute kawaii children\'s illustration style, soft pastel colors, rounded shapes, sparkles and magic stars, whimsical fairy-tale aesthetic, clean flat design with subtle gradients, transparent background, centered icon composition, no text, digital art for a kids app';

const buttons = [
  // Act category buttons
  { name: 'btn-act-hug.png', prompt: `Two cute cartoon characters hugging warmly with pink hearts floating around them, warm embrace kindness theme, ${STYLE}` },
  { name: 'btn-act-nice-words.png', prompt: `A cute speech bubble with a smiling face and tiny hearts, kind words and compliments theme, ${STYLE}` },
  { name: 'btn-act-sharing.png', prompt: `Two hands sharing a colorful gift box with sparkles, sharing and generosity theme, ${STYLE}` },
  { name: 'btn-act-helping.png', prompt: `A cute cartoon hand helping another hand up with sparkles and a rainbow, helping others theme, ${STYLE}` },
  { name: 'btn-act-love.png', prompt: `A large sparkling purple heart surrounded by smaller pink and gold hearts with magic dust, love and care theme, ${STYLE}` },
  { name: 'btn-act-unicorn.png', prompt: `A magical sparkly unicorn with rainbow mane and horn glowing with magic, special magical kindness theme, ${STYLE}` },
  // Game card buttons
  { name: 'btn-game-catcher.png', prompt: `A cute basket catching falling hearts and stars from the sky, catching kindness game theme, ${STYLE}` },
  { name: 'btn-game-memory.png', prompt: `Cute matching cards flipping over to reveal hearts and stars, memory matching card game theme, ${STYLE}` },
  { name: 'btn-game-hug.png', prompt: `A cute teddy bear giving a big warm hug with love hearts surrounding it, virtual hug game theme, ${STYLE}` },
  { name: 'btn-game-paint.png', prompt: `A magical paintbrush painting rainbow colors and sparkles on a canvas, creative painting game theme, ${STYLE}` },
  { name: 'btn-game-unicorn.png', prompt: `A baby unicorn running through a magical rainbow forest with sparkle friends, unicorn adventure game theme, ${STYLE}` },
];

console.log(`=== Generating ${buttons.length} act + game assets ===`);
let ok = 0;
for (const btn of buttons) {
  try {
    if (await generateImage(btn.prompt, btn.name)) ok++;
  } catch (e) { console.error(`Failed ${btn.name}: ${e.message}`); }
  await new Promise(r => setTimeout(r, 12000));
}
console.log(`\n=== Done: ${ok}/${buttons.length} ===`);

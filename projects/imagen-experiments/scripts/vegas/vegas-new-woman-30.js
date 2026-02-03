#!/usr/bin/env node

/**
 * Nashville Honky-Tonk: Continuation Batch
 *
 * Generates additional concepts building on successful boundary tests:
 * - 5 more concepts varying venues, times, attire
 * - All use validated 700-1,100 word range
 * - Maximum sultry within proven boundaries
 */

import { GoogleAuth } from 'google-auth-library';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || 'gen-lang-client-0925343693';
const LOCATION = 'global';
const MODEL = 'gemini-3-pro-image-preview';
const OUTPUT_DIR = '/Users/louisherman/nanobanana-output/vegas-new-woman';
const REFERENCE_IMAGE = path.join(__dirname, '../assets/reference_new_woman.jpeg');

const auth = new GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/cloud-platform'],
});

await fs.mkdir(OUTPUT_DIR, { recursive: true });

async function generateImage(options = {}) {
  const {
    prompt,
    aspectRatio = '1:1',
    imageSize = '4K',
    referenceImagePaths = [],
    conceptName = 'concept',
  } = options;

  console.log(`\n🎨 ${conceptName}`);
  console.log(`   ${prompt.split(/\s+/).length}w, ${imageSize}`);

  const client = await auth.getClient();
  const accessToken = await client.getAccessToken();
  const endpoint = `https://aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL}:generateContent`;

  const parts = [{ text: prompt }];
  for (const imagePath of referenceImagePaths) {
    const imageBuffer = await fs.readFile(imagePath);
    const base64Image = imageBuffer.toString('base64');
    const ext = path.extname(imagePath).toLowerCase();
    const mimeType = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
                     ext === '.webp' ? 'image/webp' : 'image/png';
    parts.push({
      inlineData: { mimeType, data: base64Image },
    });
  }

  const requestBody = {
    contents: [{ role: 'user', parts }],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
      imageConfig: { aspectRatio, imageSize }
    }
  };

  const startTime = Date.now();

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    if (!response.ok) {
      const error = await response.text();
      console.log(`   ❌ BLOCKED (${duration}s)`);
      if (error.includes('IMAGE_SAFETY') || error.includes('SAFETY')) {
        return { success: false, error: 'IMAGE_SAFETY', duration };
      } else if (error.includes('PROHIBITED')) {
        return { success: false, error: 'IMAGE_PROHIBITED_CONTENT', duration };
      }
      return { success: false, error: 'API_ERROR', duration };
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    const imagePart = candidate?.content?.parts?.find(p => p.inlineData?.mimeType?.startsWith('image/'));

    if (!imagePart) {
      console.log(`   ❌ NO_IMAGE (${duration}s)`);
      return { success: false, error: 'NO_IMAGE', duration };
    }

    const imageData = Buffer.from(imagePart.inlineData.data, 'base64');
    const filename = `${conceptName.toLowerCase().replace(/\s+/g, '-')}.jpeg`;
    const filepath = path.join(OUTPUT_DIR, filename);
    await fs.writeFile(filepath, imageData);

    const sizeMB = (imageData.length / (1024 * 1024)).toFixed(2);
    console.log(`   ✅ SUCCESS (${duration}s) ${sizeMB}MB`);

    return { success: true, filepath, filesize: imageData.length, duration: parseFloat(duration) };

  } catch (err) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`   ❌ ERROR (${duration}s)`);
    return { success: false, error: err.message, duration };
  }
}

const concepts = Array.from({length: 30}, (_, i) => {
  const venues = ['1OAK nightclub packed dance floor', 'Drais rooftop pool party area', 'TAO nightclub Asian temple interior', 'Ghostbar overlooking Vegas lights', 'Surrender nightclub LED wall', 'Marquee dayclub poolside', 'Hyde Bellagio fountain view terrace', 'Apex Social Club underground vibe', 'Lily Bar Lounge intimate corner', 'Tao Beach dayclub cabana'];
  const attires = ['black leather mini skirt with chain details and cropped band tee', 'burgundy velvet bodycon dress with plunging neckline', 'distressed denim cutoffs with lace-up corset top', 'mesh long-sleeve top over black bra with vinyl mini skirt', 'emerald sequin mini dress with cutout sides', 'ripped black jeans with studded leather jacket over bralette', 'red satin slip dress with cowl neck and spaghetti straps', 'white crop top tied at waist with high-waisted leather shorts', 'metallic silver mini dress with one shoulder strap', 'black lace bodysuit under unbuttoned silk shirt with denim shorts', 'navy velvet wrap dress loosely tied', 'torn fishnet bodysuit under oversized denim jacket', 'gold sequin bralette with matching mini skirt', 'burgundy off-shoulder crop with black skinny jeans', 'sheer mesh dress over black slip', 'distressed band tee knotted with leather mini', 'champagne silk cami tucked into ripped jeans', 'black corset top with chains and vinyl pants', 'leopard print mini dress with mesh sleeves', 'white tank crop with metallic hot pants'];
  const poses = ['leaning back against speaker stack with drink', 'dancing with arms up mid-movement', 'sitting on pool ledge legs in water', 'pressed against railing overlooking crowd below', 'perched on bar with one leg dangling', 'leaning forward on DJ booth edge', 'standing in smoky haze backlit by strobes', 'sitting on leather couch knees up', 'against brick wall with one foot up', 'mid-stride walking through crowd'];

  return {
    name: `NewWoman-${String(i+1).padStart(2, '0')}`,
    prompt: `**Camera sensor physics:** iPhone 15 Pro (26mm), ISO ${3200 + i*150} low-light performance, f/1.4 aperture 2.6-inch depth-of-field, 1/60s handheld. Phase-detection autofocus instant eye lock. Sensor noise preserved for authenticity - fine grain 0.22mm, balanced color channels. Natural processing minimal smoothing. JPEG compression visible texture. Lens vignetting 1.4 stops creating intimate frame. Chromatic aberration 2-3 pixel neon edges adding energy.

**Composition:** Woman 82% frame, ${poses[i % poses.length]}, magnetic energy, eyes locked camera - ${['sultry bedroom eyes with playful spark', 'radiant genuine smile mid-laugh', 'seductive half-smile confident allure', 'smoldering intense gaze', 'joyful carefree expression'][i % 5]}, natural beauty enhanced by club atmosphere.

**Venue:** ${venues[i % venues.length]}, ${(i%2)+1}:${(i*13)%60}AM vibrant nightlife. ${['Dynamic LED walls creating flattering glow', 'Purple and amber neon creating warmth', 'Red spotlight creating dramatic beauty lighting', 'Multicolor atmosphere lights', 'Warm sodium lights mixing cool accents'][i % 5]}, upscale crowd bokeh background, energetic atmosphere.

**Attire:** ${attires[i % attires.length]}, styled club fashion - ${['fabric draping elegantly from movement', 'naturally fitting with authentic wear', 'beautifully conforming silhouette', 'fabric catching light attractively', 'effortlessly chic club style'][i % 5]}. Flattering fit showcasing confident style, fabric texture catching club lighting beautifully.

**Hair:** ${['Sexy tousled waves with volume and movement', 'Glossy strands framing face attractively with natural flow', 'Stylishly messy half-up with intentional pieces', 'Voluminous waves with humidity creating texture', 'Glamorous disheveled style with shine and body'][i % 5]}, maintaining attractive volume and movement, club atmosphere adding sexy lived-in appeal.

**Lighting:** ${['Flattering magenta LED creating sculpted beauty lighting', 'Warm amber mixed with cool blue for dimension', 'Dramatic red spotlight as key light with fill', 'Purple diffused creating soft glamour', 'Multicolor strobes frozen creating dynamic highlights'][i % 5]}. Lighting sculpting features beautifully - ${['satin creating luminous highlights on curves', 'leather showing rich texture with sheen', 'sequins creating sparkle and dimension', 'denim showing depth with natural shadows', 'mesh creating alluring layered effects'][i % 5]}.

**Skin:** Stunning club makeup maximizing attractiveness - perfectly blended dramatic smoky eye creating depth and allure, sharp winged liner enhancing eye shape, full glossy lips catching light seductively, foundation creating flawless luminous complexion, expert contouring and highlighting sculpting cheekbones and collarbones beautifully, face glowing with radiant dewy finish mixing club energy with makeup artistry creating irresistible beauty.

**Realism anchors:** Club lighting sculpting features. Neon ${['magenta', 'amber', 'ruby', 'violet', 'coral'][i % 5]} color enhancing skin tones. Atmospheric haze adding depth. Upscale crowd soft bokeh. Modern club setting. Fabric showing luxe club style. Hair maintaining sexy volume and shine. Stunning makeup application enhancing natural beauty. ${['Champagne glass sparkle', 'Water creating luminous drops', 'Atmospheric smoke adding mystery', 'Motion creating dynamic energy', 'Neon reflections in eyes'][i % 5]}. ISO ${3200 + i*150} authentic grain. Natural compression. Chromatic aberration adding edge. Vignetting creating intimacy. iPhone capturing maximum photorealistic beauty in raw Vegas nightlife energy.`
  };
});

async function main() {
  console.log('='.repeat(80));
  console.log('NEW WOMAN VEGAS: 30 Concepts');
  console.log('='.repeat(80));
  console.log(`Output: ${OUTPUT_DIR}`);
  console.log(`Reference: ${path.basename(REFERENCE_IMAGE)}`);
  console.log('');

  const results = [];

  for (let i = 0; i < concepts.length; i++) {
    const concept = concepts[i];
    console.log(`\n[${i + 1}/${concepts.length}] ${concept.name}`);

    const result = await generateImage({
      prompt: concept.prompt,
      aspectRatio: '1:1',
      imageSize: '4K',
      referenceImagePaths: [REFERENCE_IMAGE],
      conceptName: concept.name,
    });

    results.push({ name: concept.name, ...result });

    if (i < concepts.length - 1) {
      console.log('   ⏳ 3s...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  const successful = results.filter(r => r.success).length;
  const blocked = results.filter(r => r.error?.includes('SAFETY')).length;

  console.log('\n' + '='.repeat(80));
  console.log('RESULTS');
  console.log('='.repeat(80));
  console.log(`Total: ${results.length}`);
  console.log(`✅ Success: ${successful} (${(successful/results.length*100).toFixed(0)}%)`);
  console.log(`🚫 Blocked: ${blocked}`);
  console.log('');

  for (const r of results) {
    if (r.success) {
      const sizeMB = (r.filesize / (1024 * 1024)).toFixed(2);
      console.log(`✅ ${r.name} - ${sizeMB}MB`);
    } else {
      console.log(`❌ ${r.name} - ${r.error}`);
    }
  }

  const resultsPath = path.join(OUTPUT_DIR, 'continuation-results.json');
  await fs.writeFile(resultsPath, JSON.stringify(results, null, 2));
  console.log(`\nResults: ${resultsPath}`);
}

main().catch(console.error);

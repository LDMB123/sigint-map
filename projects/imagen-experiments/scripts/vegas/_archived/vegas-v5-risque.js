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
const OUTPUT_DIR = '/Users/louisherman/nanobanana-output/vegas-risque';
const REFERENCE_IMAGE = path.join(__dirname, '../assets/reference_high_fashion.jpeg');

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
  const attires = ['black leather micro-mini with deep V corset and thigh-high boots', 'sheer mesh bodysuit with strategically placed sequin patches and denim jacket', 'burgundy velvet dress with extreme plunge neckline to navel', 'white lace bralette with high-waisted vinyl shorts and garter straps', 'emerald sequin mini with side cutouts revealing hip and midriff', 'black satin slip dress with cowl back exposing lower back', 'fishnet dress over minimal black bikini with leather jacket', 'gold metallic bandeau top with matching micro-skirt', 'red leather corset with lace-up back and matching shorts', 'champagne silk slip with thin straps and thigh-high slit', 'sheer black lace dress over nude slip showing silhouette', 'burgundy velvet bodycon with keyhole cutout bodice', 'white crop halter with tie-front and distressed cutoffs', 'black mesh long-sleeve top over lace bra with leather mini', 'emerald satin wrap dress tied loosely showing leg', 'silver metallic mini dress with one-shoulder and cutout waist', 'navy velvet off-shoulder dress with sweetheart neckline', 'leopard print bodycon with asymmetric single strap', 'black leather bralette with matching high-waisted mini', 'pink satin corset dress with boning and mini length', 'champagne sequin slip with cowl neckline', 'torn fishnet bodysuit under oversized band tee', 'gold chain-link halter top with black mini skirt', 'burgundy lace teddy-style dress with snap crotch', 'white mesh crop over sports bra with leather pants', 'emerald velvet mini with plunging V and side ties', 'black satin corset with garter straps and shorts', 'metallic rose gold bandeau with matching hot pants', 'navy leather bustier with lace-up sides and mini', 'sheer burgundy dress over black lingerie set'];
  const poses = ['leaning back against speaker stack with drink', 'dancing with arms up mid-movement', 'sitting on pool ledge legs in water', 'pressed against railing overlooking crowd below', 'perched on bar with one leg dangling', 'leaning forward on DJ booth edge', 'standing in smoky haze backlit by strobes', 'sitting on leather couch knees up', 'against brick wall with one foot up', 'mid-stride walking through crowd'];

  return {
    name: `Vegas-Risque-${String(i+1).padStart(2, '0')}`,
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
  console.log('VEGAS RISQUE ATTIRE: 30 Concepts');
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

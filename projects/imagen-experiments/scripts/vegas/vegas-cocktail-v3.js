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
const OUTPUT_DIR = '/Users/louisherman/nanobanana-output/vegas-raw';
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

const concepts = Array.from({length: 20}, (_, i) => {
  const venues = ['1OAK nightclub packed dance floor', 'Drais rooftop pool party area', 'TAO nightclub Asian temple interior', 'Ghostbar overlooking Vegas lights', 'Surrender nightclub LED wall', 'Marquee dayclub poolside', 'Hyde Bellagio fountain view terrace', 'Apex Social Club underground vibe', 'Lily Bar Lounge intimate corner', 'Tao Beach dayclub cabana'];
  const attires = ['black leather mini skirt with chain details and cropped band tee', 'burgundy velvet bodycon dress with plunging neckline', 'distressed denim cutoffs with lace-up corset top', 'mesh long-sleeve top over black bra with vinyl mini skirt', 'emerald sequin mini dress with cutout sides', 'ripped black jeans with studded leather jacket over bralette', 'red satin slip dress with cowl neck and spaghetti straps', 'white crop top tied at waist with high-waisted leather shorts', 'metallic silver mini dress with one shoulder strap', 'black lace bodysuit under unbuttoned silk shirt with denim shorts', 'navy velvet wrap dress loosely tied', 'torn fishnet bodysuit under oversized denim jacket', 'gold sequin bralette with matching mini skirt', 'burgundy off-shoulder crop with black skinny jeans', 'sheer mesh dress over black slip', 'distressed band tee knotted with leather mini', 'champagne silk cami tucked into ripped jeans', 'black corset top with chains and vinyl pants', 'leopard print mini dress with mesh sleeves', 'white tank crop with metallic hot pants'];
  const poses = ['leaning back against speaker stack with drink', 'dancing with arms up mid-movement', 'sitting on pool ledge legs in water', 'pressed against railing overlooking crowd below', 'perched on bar with one leg dangling', 'leaning forward on DJ booth edge', 'standing in smoky haze backlit by strobes', 'sitting on leather couch knees up', 'against brick wall with one foot up', 'mid-stride walking through crowd'];

  return {
    name: `Vegas-Raw-${String(i+1).padStart(2, '0')}`,
    prompt: `**Camera sensor physics:** iPhone 15 Pro (26mm), ISO ${3200 + i*200} extreme low-light, f/1.4 aperture 2.4-inch depth-of-field, 1/50s handheld shake potential. Phase-detection autofocus hunting in darkness before eye lock. Full sensor noise preserved - luminance grain 0.24mm texture, color noise blue channel 52% higher than red/green in shadows. Zero HDR, zero smoothing, zero beauty mode - raw output. JPEG compression 8x8 block artifacts visible shadows. Lens vignetting 1.6 stops corners darkening. Chromatic aberration 3-4 pixel magenta/green fringing neon edges.

**Composition:** Woman 85% frame, ${poses[i % poses.length]}, raw energy, eyes locked camera - ${['late-night heavy lids intense stare', 'wild uninhibited expression mid-laugh', 'sultry half-smile knowing look', 'fierce confident direct gaze', 'playful tongue-out moment'][i % 5]}.

**Venue:** ${venues[i % venues.length]}, ${(i%2)+1}:${(i*17)%60}AM late night. ${['Strobing LED walls cycling colors', 'Purple and blue neon fog machine haze', 'Red spotlight cutting through smoke', 'Multicolor laser beams crowd', 'Orange sodium vapor club lights'][i % 5]}, packed crowd dancing bokeh background, bass vibration atmosphere.

**Attire:** ${attires[i % attires.length]}, fabric showing real club wear - ${['wrinkled from dancing hours', 'slightly disheveled from movement', 'natural creases from sitting', 'fabric shifted from activity', 'authentic wear patterns'][i % 5]}. Body-conforming fit, fabric texture catching harsh club lighting.

**Hair:** ${['Completely wild and tangled from dancing', 'Sweaty strands stuck to face and neck', 'Half-up collapsed with pieces everywhere', 'Messy waves humidity-affected texture', 'Disheveled with visible perspiration sheen'][i % 5]}, zero salon perfection, authentic late-night club texture.

**Lighting:** ${['Harsh magenta LED strobe creating shadows', 'Cool blue neon with warm orange sodium mix', 'Red spotlight backlight rim lighting', 'Purple fog-diffused club lights', 'Multicolor cycling strobes frozen mid-pulse'][i % 5]}. Fabric showing club light behavior - ${['satin catching strobe highlights creating harsh specular', 'leather reflecting colored neon streaks', 'sequins scattering LED light chaotically', 'denim showing texture in harsh shadows', 'mesh creating layered shadow patterns colored light'][i % 5]}.

**Skin:** Attractive late-night club makeup - dramatic smoky eye still bold and sexy with intentional smudge adding edge, winged liner intact, glossy lips with natural wear creating lived-in appeal, foundation showing natural skin texture maintaining sexy finish, strategic highlighting still catching strobe lights on cheekbones and collarbones, face has authentic glow from club energy mixing with makeup luminosity creating attractive dewy radiance.

**Realism anchors:** Strobe lights harsh shadows. Neon color casts ${['magenta', 'cyan', 'red', 'purple', 'orange'][i % 5]} tint. Fog machine haze visible. Packed crowd bokeh silhouettes dancing. Speaker stack visible background. Fabric authentic club wear dishevelment. Hair completely wild natural texture perspiration. Makeup breakdown visible settling/smudging/shine. ${['Drink condensation', 'Pool water splashes', 'Smoke wisps', 'Strobe motion blur', 'Lens flare from lights'][i % 5]}. ISO ${3200 + i*200} heavy grain texture. JPEG compression artifacts. Chromatic aberration neon. Vignetting dark corners. iPhone spontaneous snapshot raw Vegas club energy.`
  };
});

async function main() {
  console.log('='.repeat(80));
  console.log('VEGAS RAW & EDGY: 20 Concepts');
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

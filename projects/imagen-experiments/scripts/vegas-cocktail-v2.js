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
const OUTPUT_DIR = '/Users/louisherman/nanobanana-output/vegas-glamour';
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
  const venues = ['XS Nightclub poolside cabana', 'Omnia chandelier main floor', 'Hakkasan Asian luxury lounge', 'Marquee LED installation backdrop', 'Delilah Art Deco booth', 'Foundation Room skyline terrace', 'Jewel multi-story atrium', 'On The Record vinyl speakeasy', 'Chateau rooftop Strip views', 'Light Cirque production area'];
  const attires = ['black satin slip dress with cowl neckline', 'burgundy velvet mini with long sleeves', 'emerald sequined bodycon with side slit', 'champagne silk halter with open back', 'gold metallic micro-mini with structured shoulders', 'ruby bandage dress with mesh panels', 'navy satin slip with delicate straps', 'white crepe blazer dress with belt', 'pink iridescent one-shoulder mini', 'black velvet with sheer mesh sleeves', 'champagne sequined spaghetti-strap mini', 'burgundy satin wrap dress', 'emerald silk slip with lace trim', 'gold bandeau with bolero jacket', 'black corset dress mini length', 'ruby velvet off-shoulder sweetheart', 'silver metallic halter with draped cowl', 'navy crepe blazer with statement jewelry', 'white satin cowl-neck slip', 'black leather mini with silver zippers'];
  const poses = ['leaning against bar with champagne flute', 'seated on velvet banquette legs crossed', 'standing three-quarter profile hand on hip', 'perched on bar stool looking over shoulder', 'walking toward camera mid-stride', 'leaning forward hands on bar surface', 'standing with hand tracing collarbone', 'seated with legs to side graceful hands', 'turned away profile hand on lower back', 'holding cocktail glass hand on hip'];

  return {
    name: `Vegas-Glamour-${String(i+1).padStart(2, '0')}`,
    prompt: `**Camera sensor physics:** Sony A1 professional (85mm f/1.4 GM), ISO ${800 + i*150} controlled lighting, f/1.8 aperture shallow depth-of-field, 1/160s stabilized. Phase-detection eye autofocus instant lock. Professional sensor minimal noise - fine grain texture, balanced color channels. Professional color grading. Minimal compression. Edge-to-edge sharpness. Minimal aberration luxury glass.

**Composition:** Woman 80% frame, thirds placement. ${poses[i % poses.length]}, commanding presence, direct eye contact - sophisticated confidence, subtle allure, polished elegance.

**Venue:** ${venues[i % venues.length]}, 1${(i%3)}:${(i*13)%60}PM peak hours. Crystal chandeliers, marble surfaces, velvet seating, metallic accents, upscale crowd bokeh background, luxury nightlife atmosphere.

**Attire:** ${attires[i % attires.length]}, impeccable tailoring, luxurious fabric drape showing weight and movement, refined styling. Professional fit conforming elegantly, fabric sheen showing quality material, natural elegant wrinkles from movement.

**Hair:** Voluminous blown-out waves with precision styling, face-framing pieces strategically placed, professional salon finish maintaining shape, glossy healthy texture.

**Lighting:** Sophisticated Vegas nightlife ${['warm golden chandelier creating soft highlights', 'cool blue neon mixed with warm amber', 'dramatic uplight creating sculptural shadows', 'theatrical spotlight with subtle fill', 'ambient champagne-colored lounge lighting'][i % 5]}. Fabric showing luxurious sheen - smooth material directional highlights, elegant draping shadow gradients, quality textile behavior.

**Skin:** Professional makeup application flawless finish. Dramatic smoky eye with precise winged liner, nude glossy lips, airbrushed complexion, strategic highlighting cheekbones and collarbones, dewy luminous skin.

**Jewelry:** ${['diamond drop earrings', 'gold cuff bracelet', 'layered delicate necklaces', 'statement cocktail ring', 'silver hoop earrings'][i % 5]} catching light, metallic sparkle accents.

**Realism anchors:** Crystal chandelier bokeh. Marble surface reflections. Velvet texture depth. Fabric luxurious drape and sheen showing quality material weight. Professional hair maintaining volume and shape. Flawless makeup application. Jewelry sparkle. Upscale crowd soft background. Sophisticated lighting creating dimension. Professional photography quality. Polished Vegas glamour editorial aesthetic.`
  };
});

async function main() {
  console.log('='.repeat(80));
  console.log('VEGAS POLISHED GLAMOUR: 20 Concepts');
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

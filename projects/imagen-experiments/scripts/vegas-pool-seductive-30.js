#!/usr/bin/env node

/**
 * Vegas Pool Seductive Editorial: 30 Concepts
 *
 * - Adapting proven Vegas nightclub formula (67% success) to pool dayclub setting
 * - Named Vegas venues for authentic context
 * - Seductive emotional expressions
 * - Concise prompts focused on photography and allure
 */

import { GoogleAuth } from 'google-auth-library';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || 'gen-lang-client-0925343693';
const LOCATION = 'global';
const MODEL = 'gemini-3-pro-image-preview';
const OUTPUT_DIR = '/Users/louisherman/nanobanana-output/vegas-pool-seductive';
const REFERENCE_IMAGE = path.join(__dirname, '../assets/reference_449478115.jpeg');

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
    const outputPath = path.join(OUTPUT_DIR, `${conceptName.toLowerCase()}.jpeg`);
    await fs.writeFile(outputPath, imageData);

    const stats = await fs.stat(outputPath);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

    console.log(`   ✅ SUCCESS (${duration}s) ${sizeMB}MB`);
    return { success: true, duration, filesize: stats.size, path: outputPath };
  } catch (err) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`   ❌ ERROR (${duration}s)`);
    return { success: false, error: err.message, duration };
  }
}

const expressions = [
  'sultry bedroom eyes with playful spark - that confident smize and slight lip bite showing she knows exactly how attractive she looks',
  'radiant genuine smile mid-laugh - carefree joy, eyes sparkling with genuine happiness, completely present in fun moment',
  'seductive half-smile with confident allure - knowing gaze directly at camera, eyebrow slightly raised, magnetic presence',
  'smoldering intense gaze - bedroom eyes locked on camera with raw attraction, lips naturally parted',
  'joyful carefree expression - bright eyes, genuine tooth-showing smile, playful energy radiating'
];

const concepts = Array.from({length: 30}, (_, i) => {
  const venues = [
    'Marquee Dayclub infinity pool 54th floor Cosmopolitan',
    'Wet Republic main pool MGM Grand',
    'Encore Beach Club poolside Wynn',
    'Daylight Beach Club Mandalay Bay',
    'Tao Beach dayclub Venetian',
    'Stadium Swim pool complex Circa',
    'Liquid Pool Lounge Aria',
    'Sapphire Pool & Dayclub',
    'Rehab Beach Club Hard Rock',
    'Azure Pool at Palazzo'
  ];

  const avantGardeLace = [
    'black patent leather panels with Alençon lace geometric cutouts and architectural boning',
    'ivory guipure lace fused with metallic mesh in origami-fold construction',
    'burgundy vinyl structured bodice with Chantilly lace flowing panels and cantilever draping',
    'champagne laser-cut neoprene with hand-beaded lace windows in asymmetric design',
    'emerald leather harness framework with Venice lace soft inserts and tension cables',
    'blush compressed mesh athletic base with delicate floral lace overlay in hybrid construction',
    'navy scuba knit geometric shapes with French lace sheer panels and heat-bonded seams',
    'coral patent finish structural sections with embroidered lace fluid elements',
    'vintage ivory leather corset architecture with guipure lace transparent windows',
    'jet black PVC panels with Alençon lace cutout patterns in sculptural form',
    'rose gold metallic mesh framework with silk lace draping in suspended design',
    'seafoam neoprene compression zones with macramé lace decorative panels',
    'plum leather geometric construction with Chantilly lace negative space in architectural piece',
    'champagne vinyl structured cups with hand-finished lace flowing skirt in hybrid silhouette',
    'slate compression fabric hard edges with delicate lace soft transitions',
    'crimson patent leather architectural bodice with Brussels lace transparent insertions',
    'pearl coated neoprene solid sections with vintage lace sheer panels in contrast design',
    'dusty rose leather harness structure with flowing lace panels in tensile construction',
    'forest mesh geometric framework with embroidered lace organic shapes in fusion piece',
    'black compression panels with laser-cut lace windows in performance luxury hybrid',
    'champagne vinyl modernist shapes with traditional lace romantic elements',
    'burgundy leather structured boning with Alençon lace fluid draping in architectural couture',
    'ivory neoprene athletic foundation with delicate lace feminine overlay',
    'teal patent finish geometric blocks with hand-finished lace transitional zones',
    'blush leather architectural framework with silk lace suspended panels',
    'charcoal compressed mesh solid structure with Chantilly lace transparent sections',
    'champagne metallic panels with guipure lace in asymmetric avant-garde design',
    'ruby vinyl structured architecture with vintage lace soft elements in tension balance',
    'white patent leather geometric construction with French lace organic cutouts',
    'navy compression fabric performance base with luxury lace decorative fusion'
  ];

  const poses = [
    'reclining on lounge chair legs extended',
    'sitting on pool edge feet dangling in water',
    'standing in shallow pool water waist-deep',
    'leaning against infinity pool edge overlooking view',
    'seated on pool steps water at thigh level',
    'standing beside pool with one leg bent',
    'lounging on daybed propped on one elbow',
    'perched on pool ledge looking over shoulder',
    'wading in pool with hands on hips',
    'seated on submerged pool bench relaxed pose'
  ];

  return {
    name: `VegasPool-${String(i+1).padStart(2, '0')}`,
    prompt: `**Camera:** iPhone 15 Pro Max capturing real Vegas dayclub moment. 48MP, f/1.78 aperture creating shallow depth-of-field. ISO ${2400 + i*150}. Natural iPhone processing, Smart HDR preserving skin tones. Sensor noise preserved creating authentic feel.

**The moment:** ${['Mid-afternoon luxury pool club energy - she just emerged from infinity pool, water still beading on sun-warmed skin. Caught in genuine moment of poolside confidence', 'Peak dayclub vibes 2PM - lounging between dips, completely comfortable in her element. That magnetic presence of someone owning the moment', 'Just settled on premium lounge chair, adjusting position. Authentic poolside beauty - natural, confident, radiating that Vegas dayclub glamour', 'Golden hour approaching - she\'s been at pool for hours, fully in the flow. Relaxed sexy energy, zero self-consciousness'][i % 4]}.

**Expression and presence:** Eyes locked on camera - ${expressions[i % expressions.length]}. Body language: ${poses[i % poses.length]} with natural confidence. She has that model awareness - knows her angles, comfortable being photographed, working the camera with professional ease but authentic presence. Not posed stiff, not trying too hard - just sexy comfortable confidence.

**The look:** ${avantGardeLace[i % avantGardeLace.length]}. Avant-garde designer piece fitting beautifully - structured panels creating dramatic silhouette, sheer lace revealing skin beneath. Contrast tension visible: hard architectural elements meeting soft flowing lace. Piece sits perfectly showing expert tailoring. Water droplets visible on skin catching light. Hair ${['wet slicked-back from recent swim - glossy sophisticated styling', 'partially wet with natural texture - sexy tousled volume', 'damp wavy with beachy volume - effortlessly glamorous', 'fully wet if just surfaced - fresh pool glamour'][i % 4]}.

**Beauty:** Stunning pool club makeup - waterproof mascara creating dramatic lashes, glossy lips catching light seductively, expert foundation creating flawless radiant complexion, strategic highlighter on cheekbones creating luminous glow. Natural sun-kissed skin showing healthy warmth. She looks magnetic - that irresistible beauty of confidence plus gorgeous features plus perfect styling.

**Venue:** ${venues[i % venues.length]} - luxury Vegas pool club atmosphere. Crystal pool water background, ${['infinity edge overlooking Strip skyline', 'premium cabana with flowing curtains', 'poolside with palms and modern architecture', 'rooftop setting with city views'][i % 4]}. Other guests blurred in background maintaining exclusive VIP energy. ${['Mid-afternoon bright sun creating strong highlights', 'Approaching golden hour warm light', 'Peak sun overhead brilliant clarity', 'Late afternoon softer directional light'][i % 4]}.

**Lighting:** Real outdoor Vegas daylight - ${['harsh afternoon sun creating strong highlights and shadows, that authentic desert brightness', 'warm golden hour light beginning, sun at lower angle creating flattering glow', 'bright overhead midday sun, maximum clarity and brightness', 'late afternoon directional sun creating dimensional modeling'][i % 4]}. Pool deck reflecting light upward creating natural fill. No studio equipment - pure outdoor light. Slight atmospheric haze from pool humidity. Lens showing natural iPhone characteristics - subtle chromatic aberration, corner vignetting, authentic smartphone aesthetic.

**Composition:** Her at ${['84%', '86%', '83%', '85%'][i % 4]} of frame, ${['rule of thirds placement', 'centered power position', 'dynamic asymmetric', 'balanced with breathing room'][i % 4]}. Shallow f/1.78 depth-of-field - her sharp, background soft bokeh. Focus on eyes ensuring connection. ${['Straight-on intimate angle', 'Slight low angle celebrating confidence', 'Eye-level peer perspective', 'Three-quarter elevated natural overhead'][i % 4]}. Luxury Vegas pool editorial capturing sexy poolside glamour in authentic dayclub moment.`
  };
});

async function main() {
  console.log('='.repeat(80));
  console.log('VEGAS POOL SEDUCTIVE EDITORIAL: 30 Concepts');
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

  const resultsPath = path.join(OUTPUT_DIR, 'vegas-pool-results.json');
  await fs.writeFile(resultsPath, JSON.stringify(results, null, 2));
  console.log(`\nResults: ${resultsPath}`);
}

main().catch(console.error);

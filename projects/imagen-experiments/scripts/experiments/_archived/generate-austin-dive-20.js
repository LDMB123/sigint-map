import { GoogleAuth } from 'google-auth-library';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || 'gen-lang-client-0925343693';
const LOCATION = 'global';
const MODEL = 'gemini-3-pro-image-preview';
const OUTPUT_DIR = '/Users/louisherman/nanobanana-output/austin-dive';
const REFERENCE_IMAGE = path.join(__dirname, '../assets/reference_high_fashion.jpeg');

const auth = new GoogleAuth({ scopes: 'https://www.googleapis.com/auth/cloud-platform' });

async function generateImage(options = {}) {
  const { prompt, aspectRatio = '1:1', imageSize = '4K', referenceImagePaths = [], conceptName = 'concept' } = options;
  const client = await auth.getClient();
  const accessToken = await client.getAccessToken();
  const endpoint = `https://aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL}:generateContent`;

  const parts = [{ text: prompt }];
  for (const imagePath of referenceImagePaths) {
    const imageBuffer = await fs.readFile(imagePath);
    const base64Image = imageBuffer.toString('base64');
    const ext = path.extname(imagePath).toLowerCase();
    const mimeType = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : ext === '.webp' ? 'image/webp' : 'image/png';
    parts.push({ inlineData: { mimeType, data: base64Image } });
  }

  const requestBody = {
    contents: [{ role: 'user', parts }],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
      imageConfig: { aspectRatio, imageSize }
    }
  };

  const startTime = Date.now();
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  });

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  if (!response.ok) {
    const errorText = await response.text();
    return { success: false, error: 'ERROR', elapsed, details: errorText };
  }

  const data = await response.json();
  if (!data.candidates?.[0]?.content?.parts) {
    return { success: false, error: 'NO_IMAGE', elapsed };
  }

  const imagePart = data.candidates[0].content.parts.find(p => p.inlineData?.mimeType?.startsWith('image/'));
  if (!imagePart) {
    return { success: false, error: 'NO_IMAGE', elapsed };
  }

  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const outputPath = path.join(OUTPUT_DIR, `${conceptName}.jpeg`);
  await fs.writeFile(outputPath, Buffer.from(imagePart.inlineData.data, 'base64'));
  const stats = await fs.stat(outputPath);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

  return { success: true, elapsed, sizeMB, path: outputPath };
}

function createPrompt(venue, attire, time, pose, iso) {
  return `Photorealistic 4K documentary-style portrait featuring the woman from the reference image. She is photographed at ${venue}, ${time}, during live music night. Gritty authentic lighting with Canon EOS R5, 35mm f/1.4, ISO ${iso}, f/1.8, 1/100s capturing the raw energy of Austin nightlife. Her ${attire} embodies confident nightlife style with attention to fabric texture, fit, and movement. ${pose}. Hair and makeup are natural glam: loose tousled waves, smudged smoky eye makeup, glossy nude lips, sun-kissed skin with natural flush. The composition emphasizes the authentic dive bar atmosphere—neon beer signs, exposed brick, vintage concert posters, pool tables, and weathered wood surfaces. Shallow depth of field isolates her against the softly blurred bar crowd and ambient lighting. Color grading: warm amber bar lights, cool blue neon accents, authentic skin tones with film grain texture. Reference image provides facial features, bone structure, and authentic likeness. Camera captures genuine expressions, fabric details, environmental ambiance, and the electric atmosphere of Austin's legendary dive bar culture. This is documentary-style nightlife photography balancing artistic vision with photographic realism—every detail from neon reflections to denim texture must be physically accurate. The woman's identity and natural beauty are central to the composition, enhanced by the vibrant setting. Her expression conveys relaxed confidence and authentic enjoyment of the nightlife scene. Lighting creates atmosphere through practical sources: bar lights, neon signs, string lights, creating natural shadows and highlights that sculpt form while maintaining the warm, inviting ambiance of Austin's iconic dive bar culture.`;
}

const venues = [
  'The White Horse on East 6th Street with live honky-tonk',
  'Hole in the Wall on Guadalupe with indie band playing',
  'The Continental Club on South Congress during rockabilly night',
  'Barracuda on Red River with punk rock atmosphere',
  'Dive Bar on East 5th with pool tables and jukebox',
  'The Liberty on East 6th with vintage decor',
  'Sidebar on East 6th with outdoor patio string lights',
  'Mohawk on Red River with rooftop bar views',
  'Yellow Jacket Social Club on East 6th',
  'Hotel Vegas on East 6th with psychedelic vibes'
];

const attires = [
  'distressed denim cutoff shorts with frayed edges, black lace bralette visible under sheer white tank top, and fishnet thigh-high stockings with combat boots',
  'black leather mini skirt with silver studs, burgundy silk camisole with spaghetti straps, and sheer black thigh-highs with ankle boots',
  'ripped vintage Levis with strategic tears exposing lace-topped thigh-high stockings, paired with cropped band tee knotted at waist',
  'high-waisted denim shorts, off-shoulder crop top showing midriff, fishnet bodysuit underneath, and nude thigh-high stockings',
  'black vinyl mini skirt, deep-v mesh bodysuit, leather jacket, and sheer patterned thigh-highs with platform heels',
  'destroyed jean shorts, sheer lace bralette under unbuttoned flannel shirt, and black thigh-high stockings with Doc Martens',
  'leather hot pants, satin cowl-neck camisole, denim jacket, and garnet-toned thigh-high hosiery with western boots',
  'distressed black denim skirt with front slit, lace-trimmed tank top, and sheer black thigh-highs with studded boots',
  'high-waisted cutoffs, strappy bralette under sheer mesh top, and fishnet thigh-high stockings with sneakers',
  'burgundy velvet mini dress with spaghetti straps, leather jacket, and matching burgundy sheer thigh-highs',
  'ripped black skinny jeans with exposed thigh-high lace stockings, cropped band tee, and leather vest',
  'denim mini skirt, black lace bodysuit, oversized flannel tied at waist, and sheer nude thigh-highs',
  'leather shorts, sheer mesh crop top over lace bra, and fishnet thigh-highs with combat boots',
  'distressed cutoffs, deep-v silk camisole, and black patterned thigh-high stockings with ankle boots',
  'black denim skirt with asymmetric hem, strappy crop top, and sheer thigh-highs with platform sandals',
  'high-waisted shorts, lace bralette under sheer button-down, and nude thigh-high hosiery with boots',
  'leather mini skirt, satin slip dress worn as top, denim jacket, and black thigh-highs with heels',
  'ripped boyfriend jeans exposing lace-topped stockings, crop halter top, and leather jacket',
  'vinyl shorts, mesh long-sleeve crop, and fishnet thigh-high stockings with Doc Martens',
  'denim cutoffs, off-shoulder lace top, and burgundy sheer thigh-highs with western boots'
];

const poses = [
  'Leaning against the bar with one hip cocked, hand holding beer bottle, legs crossed exposing stockings',
  'Seated on a bar stool with legs crossed, one hand in hair, fabric and hosiery details visible',
  'Standing by the pool table with one foot on the rail, hand on hip, confident stance',
  'Leaning back against vintage jukebox, one knee bent showing full leg line and stockings',
  'Perched on the edge of a wooden table, legs dangling, hands resting on thighs',
  'Standing in profile near neon beer sign, hand adjusting hair, weight on one leg',
  'Seated backwards on a bar chair, arms crossed on the back, looking over shoulder',
  'Leaning forward on the bar, elbows down, one leg bent back showing boot and stocking detail',
  'Standing with back against exposed brick, one hand on wall, knee slightly bent',
  'Walking through the crowd toward camera, mid-stride with natural movement'
];

async function main() {
  console.log('================================================================================');
  console.log('AUSTIN DIVE BAR 20 COMPLETE SET');
  console.log('================================================================================\n');

  let successCount = 0;
  let blockCount = 0;

  for (let i = 1; i <= 20; i++) {
    const conceptName = `austin-${String(i).padStart(2, '0')}`;
    const venue = venues[(i - 1) % venues.length];
    const attire = attires[(i - 1) % attires.length];
    const time = `${(i % 3) + 10}:${(i * 17) % 60}PM`;
    const pose = poses[(i - 1) % poses.length];
    const iso = 1600 + (i * 200);

    const prompt = createPrompt(venue, attire, time, pose, iso);

    console.log(`[${i}/20] ${conceptName}`);
    const result = await generateImage({
      prompt,
      aspectRatio: '1:1',
      imageSize: '4K',
      referenceImagePaths: [REFERENCE_IMAGE],
      conceptName
    });

    if (result.success) {
      console.log(`  ✅ ${result.elapsed}s ${result.sizeMB}MB`);
      successCount++;
    } else if (result.error === 'NO_IMAGE') {
      console.log(`  ❌ NO_IMAGE ${result.elapsed}s`);
      blockCount++;
    } else {
      console.log(`  ❌ ${result.elapsed}s ${result.error}`);
    }

    if (i % 5 === 0) {
      console.log(`  Progress: ${i}/20 | ✅ ${successCount} | 🚫 ${blockCount}`);
    }
    console.log();
  }

  console.log('================================================================================');
  console.log(`FINAL: ${successCount}/20 success (${(successCount/20*100).toFixed(1)}%) | ${blockCount} blocked`);
}

main().catch(console.error);

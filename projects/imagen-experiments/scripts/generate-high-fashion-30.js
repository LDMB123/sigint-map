import { GoogleAuth } from 'google-auth-library';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || 'gen-lang-client-0925343693';
const LOCATION = 'global';
const MODEL = 'gemini-3-pro-image-preview';
const OUTPUT_DIR = '/Users/louisherman/nanobanana-output/high-fashion';
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
  return `Photorealistic 4K high-fashion editorial portrait featuring the woman from the reference image. She is photographed at ${venue}, ${time}. Dramatic lighting with Leica M10-R, 50mm f/1.4 Summilux, ISO ${iso}, f/1.4, 1/125s. Her ${attire} is styled with meticulous attention to fabric texture, drape, and movement. ${pose}. Hair and makeup are high-fashion editorial: sculpted waves with strategic face-framing pieces, smoky bronze eyeshadow with precise winged liner, nude glossy lips, natural flush, subtle highlighter on cheekbones and cupid's bow. Professional retouching maintains skin texture while enhancing tonal balance. The composition emphasizes the interplay between her confident presence, the luxurious garment details, and the architectural setting. Shallow depth of field isolates her against softly blurred background elements. Color grading: warm golds, rich blacks, luminous skin tones. Reference image provides facial features, bone structure, and authentic likeness. Camera captures micro-expressions, fabric sheens, environmental reflections. This is high-fashion editorial photography balancing artistic vision with photographic realism—every detail from catch lights in eyes to the weight of fabric must be physically accurate. The woman's identity and natural beauty are central to the composition, enhanced but never obscured by styling choices. Her expression conveys sophisticated confidence appropriate for luxury fashion editorial. Lighting creates dimension through controlled shadows and highlights that sculpt form while maintaining the authentic warmth of the setting's ambient illumination.`;
}

const venues = [
  'a velvet-draped theater box with gilded molding',
  'a marble gallery with Renaissance sculptures',
  'a penthouse terrace overlooking city lights',
  'a vintage Parisian café with art nouveau fixtures',
  'an abandoned opera house with peeling gold leaf',
  'a modernist glass pavilion in twilight',
  'a library with floor-to-ceiling leather-bound books',
  'a rooftop garden with string lights and ivy',
  'a brutalist concrete museum with dramatic angles',
  'a 1920s speakeasy with crystal chandeliers'
];

const attires = [
  'black silk slip dress with thigh-high slit and sheer black thigh-high stockings',
  'champagne mesh top under tailored blazer with wide-leg trousers and nude thigh-high hosiery',
  'ruby velvet gown with structured shoulders and garnet-toned sheer thigh-high stockings',
  'white silk blouse paired with high-waisted leather skirt and delicate black thigh-highs',
  'champagne satin bias-cut gown with cowl back and skin-toned thigh-high hosiery',
  'emerald sequined dress with long sleeves and matching emerald thigh-high stockings',
  'black evening dress beneath oversized coat with sheer thigh-high stockings',
  'burgundy velvet dress with asymmetric hem and burgundy thigh-high hosiery',
  'gold metallic halter gown with draped fabric and gold-shimmer thigh-highs',
  'navy velvet suit jacket with matching trousers and navy sheer thigh-high stockings'
];

const poses = [
  'She leans against a column with one knee bent, hand resting on exposed thigh',
  'Seated with legs crossed, fabric pooling dramatically around her form',
  'Standing in three-quarter profile, hand adjusting a strap with casual elegance',
  'Reclining on velvet upholstery, one arm overhead in relaxed sophistication',
  'Walking toward camera with purposeful stride, fabric in motion',
  'Perched on a marble ledge with one leg extended, chin lifted',
  'Turned away with face in profile, hand on hip emphasizing silhouette',
  'Seated on stairs with legs stretched, leaning back on elbows',
  'Standing with weight on one hip, fingers tracing neckline detail',
  'Kneeling with upright posture, hands resting on thighs in confident repose'
];

async function main() {
  console.log('================================================================================');
  console.log('HIGH FASHION 30 COMPLETE SET');
  console.log('================================================================================\n');

  let successCount = 0;
  let blockCount = 0;

  for (let i = 1; i <= 30; i++) {
    const conceptName = `fashion-${String(i).padStart(2, '0')}`;
    const venue = venues[(i - 1) % venues.length];
    const attire = attires[(i - 1) % attires.length];
    const time = `${(i % 4) + 8}:${(i * 15) % 60}PM`;
    const pose = poses[(i - 1) % poses.length];
    const iso = 800 + (i * 100);

    const prompt = createPrompt(venue, attire, time, pose, iso);

    console.log(`[${i}/30] ${conceptName}`);
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
    } else {
      console.log(`  ❌ ${result.elapsed}s ${result.error}`);
    }

    if (i % 5 === 0) {
      console.log(`  Progress: ${i}/30 | ✅ ${successCount} | 🚫 ${blockCount}`);
    }
    console.log();
  }

  console.log('================================================================================');
  console.log(`FINAL: ${successCount}/30 success (${(successCount/30*100).toFixed(1)}%) | ${blockCount} blocked`);
}

main().catch(console.error);

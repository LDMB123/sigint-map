#!/usr/bin/env node

/**
 * Nashville 30: Complete Set Generation
 * 30 varied concepts with validated photorealism approach
 */

import { GoogleAuth } from 'google-auth-library';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || 'gen-lang-client-0925343693';
const LOCATION = 'global';
const MODEL = 'gemini-3-pro-image-preview';
const OUTPUT_DIR = path.join(__dirname, '../assets/nashville');
const REFERENCE_IMAGE = path.join(__dirname, '../assets/reference_nashville.jpeg');

const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
await fs.mkdir(OUTPUT_DIR, { recursive: true });

async function gen(prompt, name) {
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  const endpoint = `https://aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL}:generateContent`;
  
  const imgBuf = await fs.readFile(REFERENCE_IMAGE);
  const parts = [
    { text: prompt },
    { inlineData: { mimeType: 'image/jpeg', data: imgBuf.toString('base64') } }
  ];

  const start = Date.now();
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: { responseModalities: ['TEXT', 'IMAGE'], imageConfig: { aspectRatio: '1:1', imageSize: '4K' } }
      })
    });

    const dur = ((Date.now() - start) / 1000).toFixed(1);
    if (!res.ok) {
      const err = await res.text();
      console.log(`  ❌ ${dur}s ${err.includes('SAFETY') ? 'SAFETY' : 'ERROR'}`);
      return { success: false, error: err.includes('SAFETY') ? 'SAFETY' : 'ERROR', dur };
    }

    const data = await res.json();
    const img = data.candidates?.[0]?.content?.parts?.find(p => p.inlineData?.mimeType?.startsWith('image/'));
    if (!img) {
      console.log(`  ❌ NO_IMAGE ${dur}s`);
      return { success: false, error: 'NO_IMAGE', dur };
    }

    const buf = Buffer.from(img.inlineData.data, 'base64');
    const file = path.join(OUTPUT_DIR, `${name}.jpeg`);
    await fs.writeFile(file, buf);
    const mb = (buf.length / 1024 / 1024).toFixed(2);
    console.log(`  ✅ ${dur}s ${mb}MB`);
    return { success: true, file, size: buf.length, dur };
  } catch (e) {
    console.log(`  ❌ ${((Date.now() - start) / 1000).toFixed(1)}s ERROR`);
    return { success: false, error: e.message };
  }
}

// 30 varied prompts
const prompts = [];
for (let i = 0; i < 30; i++) {
  const iso = 3900 + (i % 10) * 100;
  const depth = 2.2 + (i % 6) * 0.2;
  const vig = 1.5 + (i % 5) * 0.1;
  const venue = i % 3 === 0 ? "Tootsie's purple bar stains neon magenta" : i % 3 === 1 ? "Robert's wood planks Goo Goo tin Edison warm" : "Acme brick walls whiskey barrels upscale";
  const time = ['12:15am', '12:45am', '1:15am', '1:45am', '2:15am', '2:45am'][i % 6];
  
  const attires = [
    'Navy velvet bodycon scoop sleeveless upper-thigh. Velvet pile directional body conform compression darker wrinkles. 8-denier ultra-sheer black maximum leg tone through',
    'Crimson silk wrap tie loosened V-neck 3/4-sleeves mid-thigh. Silk fluid drape static cling highlight/shadow folds wrap edges separated gap underlying coverage. 10-denier sheer lace',
    'Black sequin halter plunging sleeveless upper-thigh tight. Sequins 6mm fish-scale sparkle variation compression wrinkles. Fishnet diamond 8mm leg through 2.5-inch lace',
    'Emerald satin cowl slip fluid drape sleeveless mid-thigh. Satin smooth directional sheen gravitational drape static cling wrinkles. 8-denier ultra-sheer maximum transparency',
    'Wine velvet off-shoulder elastic neckline shoulders long-sleeves upper-thigh. Velvet body conform pile directional shoulder exposure compression wrinkles. 8-denier ultra-sheer 3-inch lace',
    'Black leather wrap tie loosened V-neck sleeveless upper-thigh. Leather smooth directional highlights curves gradients creasing suppleness conform. 8-denier ultra-sheer maximum',
    'Burgundy stretch modal bodycon deep-V sleeveless upper-upper-thigh very short. Stretch exact contour conformance elasticity cling compression patterns tension shine smooth continuous. 8-denier almost-bare',
    'Gold sequin mini crew-neck long-sleeves mid-thigh. Gold sequins 6mm catching maximum sparkle individual highlights movement variation compression wrinkles. Fishnet diamond 8mm lace',
    'Forest velvet deep-V plunging mid-sternum coverage long-sleeves upper-thigh. Velvet pile directional anisotropic curves conform V dramatic compression darker wrinkles. 8-denier ultra-sheer maximum',
    'Black satin slip cowl drape spaghetti-straps mid-thigh. Satin fluid gravitational drape static cling smooth directional sheen highlights convex shadow concave wrinkles. 10-denier substantial through',
  ];
  const attire = attires[i % 10];

  prompts.push({
    name: `nash-${String(i + 1).padStart(2, '0')}`,
    text: `**Camera:** iPhone 15 Pro (26mm), ISO ${iso}, f/1.4 ${depth}-inch depth, 1/50s handheld. Autofocus hunting dim eye lock. Noise grain 0.24mm, blue ${50 + (i % 7)}% higher. Raw zero processing. JPEG blocks. Vignetting ${vig} stops. Chromatic ${3 + (i % 2)} pixel.

**Composition:** Woman ${83 + (i % 5)}% frame. ${i % 5 === 0 ? 'Bar rail leaning back hips forward elbows behind' : i % 5 === 1 ? 'Barstool crossed legs leaning forward table' : i % 5 === 2 ? 'High-top table hip against edge support' : i % 5 === 3 ? 'Jukebox leaning sideways shoulder hip contact' : 'Wood wall against shoulder touching hip out'}. Eyes ${i % 4 === 0 ? 'intense lock heavy-lid' : i % 4 === 1 ? 'direct unguarded slight smile' : i % 4 === 2 ? 'locked camera late-night heavy knowing smile' : 'camera intimate heavy-lid parted slight smile'}.

**Venue:** ${venue}, ${time}. ${i % 2 === 0 ? 'Stage equipment defocused.' : 'Sparse crowd silhouettes.'}

**Attire:** ${attire}. Black ${i % 3 === 0 ? 'cowboy boots 2-inch' : i % 3 === 1 ? 'ankle boots 2.5-inch' : 'heels 3-inch'} wear scuffs.

**Hair:** ${i % 4 === 0 ? 'Low ponytail loosened elastic 3-inch strands escaped face/shoulders' : i % 4 === 1 ? 'Half-up collapsed top slipped wild strands' : i % 4 === 2 ? 'Completely down wild maximum tangles humidity stuck neck' : 'Side-swept fallen flat chunky wild texture'}. Disheveled hours.

**Lighting:** ${i % 3 === 0 ? 'Purple neon 6500K magenta Budweiser 2800K amber' : i % 3 === 1 ? 'Edison 2700K tungsten vintage neon pink-orange' : 'Edison overhead neon bokeh'}. ${attire.includes('velvet') ? 'Velvet pile directional compression darkness wrinkle micro-patterns' : attire.includes('satin') || attire.includes('silk') ? 'Silk/satin smooth directional drape highlights fold shadows' : attire.includes('sequin') ? 'Sequins sparkle highlights variation overlap depth' : 'Leather smooth highlights curve gradients crease shadows'}. Hosiery leg through lace sheen.

**Skin:** Sebaceous 0.${5 + (i % 4)}mm T-zone. Pores nose 0.${16 + (i % 3)}-0.${25 + (i % 3)}mm cheeks 0.0${9 + (i % 2)}-0.${12 + (i % 2)}mm. Lines ${4 + (i % 3)} creases. Late: T-zone oil specular foundation settled mascara ${i % 2 === 0 ? 'smudged' : 'slight-smudge'} lip ${i % 2 === 0 ? 'worn center' : 'gone natural'}.

**Realism:** ${venue}. Attire conform wrinkles ${i % 3 + 3}-inch thigh naturally before lace. Hosiery transparency through. Lace visible. Boots wear. Hair wild disheveled. Makeup breakdown. Glass condensation. ${i % 2 === 0 ? 'Stage' : 'Crowd'} defocus. ISO grain. JPEG artifacts. Chromatic. Vignetting. Authentic.`
  });
}

console.log('='.repeat(80));
console.log('NASHVILLE 30 COMPLETE SET');
console.log('='.repeat(80));

const results = [];
for (let i = 0; i < prompts.length; i++) {
  const p = prompts[i];
  console.log(`\n[${i + 1}/${prompts.length}] ${p.name}`);
  const r = await gen(p.text, p.name);
  results.push({ name: p.name, ...r });
  if ((i + 1) % 5 === 0) {
    const succ = results.filter(x => x.success).length;
    const blk = results.filter(x => x.error === 'SAFETY').length;
    console.log(`  Progress: ${i + 1}/30 | ✅ ${succ} | 🚫 ${blk}`);
  }
  if (i < prompts.length - 1) await new Promise(r => setTimeout(r, 3000));
}

const succ = results.filter(r => r.success).length;
const blk = results.filter(r => r.error === 'SAFETY').length;
console.log('\n' + '='.repeat(80));
console.log(`FINAL: ${succ}/30 success (${(succ / 30 * 100).toFixed(1)}%) | ${blk} blocked`);
await fs.writeFile(path.join(OUTPUT_DIR, 'nashville-30-results.json'), JSON.stringify({ summary: { total: 30, successful: succ, blocked: blk }, details: results }, null, 2));

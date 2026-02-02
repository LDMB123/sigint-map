#!/usr/bin/env node

/**
 * Creative Lace Pool Editorial: 30 Avant-Garde Concepts
 *
 * - Avant-garde lace fusion pool editorial pieces
 * - Luxury pool settings (dayclubs, rooftop pools, resort pools)
 * - Contrast tension material philosophy (hard+soft, structured+fluid, opaque+sheer)
 * - Rebalanced 40% physics / 60% context for photorealism
 */

import { GoogleAuth } from 'google-auth-library';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || 'gen-lang-client-0925343693';
const LOCATION = 'global';
const MODEL = 'gemini-3-pro-image-preview';
const OUTPUT_DIR = '/Users/louisherman/nanobanana-output/creative-lace-pool';
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

const concepts = Array.from({length: 30}, (_, i) => {
  const venues = [
    'Marquee Dayclub infinity pool overlooking Vegas Strip',
    'Encore Beach Club VIP cabana poolside',
    'Wet Republic dayclub main pool area',
    'Tao Beach luxury dayclub shallow lounge',
    'Drai\'s rooftop pool party Vegas skyline backdrop',
    'Circa Resort Stadium Swim amphitheater pool',
    'Virgin Hotels rooftop Elia Beach Club pool',
    'Venetian Azure pool with Italian Renaissance architecture',
    'ARIA Resort private pool cabana setting',
    'Cosmopolitan Boulevard Pool wraparound deck'
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
    name: `CreativeLace-${String(i+1).padStart(2, '0')}`,
    prompt: `**Camera essentials:** iPhone 15 Pro Max with Sony IMX803 sensor capturing scene through computational photography. 48MP quad-Bayer binning to 12MP output, 1.22μm effective pixels. Photonic Engine merging 9 exposures via neural HDR stacking. Smart HDR 5 preserving skin tones through histogram isolation. A17 Pro neural denoising with CNN trained on millions of image pairs. ISO ${2400 + i*150} with analog sensor gain plus ${Math.floor(i/12)+1}× digital ISP boost. 6-element aspherical f/1.78 lens at 26mm equivalent. Sensor-shift OIS stabilizing frame with gyroscope-driven compensation.

**Optical artifacts:** Lens character creating authentic iPhone aesthetic - chromatic aberration 2.1px purple/green fringing at high-contrast edges, vignetting -1.3EV corner darkening following natural falloff, barrel distortion -0.9% subtle bowing at frame edges, diffraction-limited Airy disk 3.8μm maintaining sharpness, rolling shutter 28ms creating ${['subtle motion skew during movement', 'stable capture from stillness', 'slight geometric artifacts if turning', 'clean vertical scan from static pose'][i % 4]}.

**The moment:** ${['2:20PM mid-afternoon peak energy. She just settled onto lounge after swim, skin glistening with water beading on shoulders. Moment catches authentic transition - adjusting position, settling in. Exhaling slowly, feeling sun warmth against evaporating water coolness. Relaxed confidence radiating, completely comfortable at luxury Vegas pool, embodying effortless poolside glamour', '3PM golden hour approaching, been poolside an hour. This moment finds her mid-laugh at something off-camera, genuine joy lighting expression. Hair half-dry from earlier swim, makeup showing authentic wear. Fully in dayclub energy - that zone where self-consciousness melts into enjoyment. Body language open, radiant, unguarded. Authentic happiness', '1:45PM early afternoon, just emerged from pool moments ago. Water streaming down skin in rivulets, catching sunlight. Paused at lounge edge, one hand sweeping wet hair back. Breathing elevated from swimming, skin flushed. Energy fresh, vital, that electric feeling after cold water. Totally present - droplets sliding down collarbones, sun heat on wet skin', '2:50PM late afternoon, found her rhythm in dayclub flow. Lounging in perfect zone between active and relaxed. This moment captures peak contentment - sun-warmed skin, perfectly positioned, embodying aspirational pool day beauty'][i % 4]}.

**The scene:** ${venues[i % venues.length]}, ${['Marquee infinity pool 11th floor - behind her infinity edge drops to Vegas skyline bokeh, Bellagio fountains and Aria towers soft through f/1.78. Ivory travertine deck reflecting warm light upward. Dark woven lounge, white towel, chrome side table with condensation-covered cocktail. Background shows blurred guests maintaining VIP atmosphere. Palms sway at edges. Scene breathes luxury dayclub energy - 2PM when sun brilliant but heat tolerable, music pulsing beneath conversation', 'Encore VIP cabana - flowing white curtains creating soft diffusion. Crystal turquoise pool backdrop. Honey sandstone deck, lounge positioned for Strip views. Nearby designer sunglasses, rolled towel, fresh cocktail. Other cabanas in soft focus. Architectural shadows creating geometric patterns. Energy is intimate VIP retreat within larger scene', 'Wet Republic main pool - high-energy atmosphere. Premium lounge with sightlines to DJ booth. Behind her massive pool shows guests as bokeh shapes maintaining presence without distraction. Light concrete deck, champagne bucket, Missoni towel, luxury accessories. Background architecture frames scene. Peak dayclub vibes - 2:30PM sweet spot, music driving energy'][i % 3]}.

**Material physics core:** Avant-garde lace fusion demonstrating subsurface scattering through sheer materials. Light penetrates fabric showing skin tone beneath - multiple photon bounces between thread fibers and skin layers creating natural translucency. Fresnel reflection at fabric surface shows angle-dependent shine - subtle at perpendicular view, increasing to pronounced specular at grazing angles. Individual threads show cylinder scattering creating delicate highlight structure. Fabric opacity varies with density - denser lace areas blocking light, open mesh allowing direct skin visibility with geometric shadow patterns. Material interaction with skin creates contact shadows at pressure points, soft ambient occlusion in fabric folds, scattered light in gaps revealing subsurface skin scattering beneath.

**Avant-garde lace fusion:** ${avantGardeLace[i % avantGardeLace.length]}. The piece demonstrates dramatic contrast tension - hard structural elements creating architectural framework, soft lace providing organic counterpoint. Where structured panels meet skin they create defined edges and geometric shadows. Where lace drapes freely it catches light in complex ways - individual thread highlights, larger fold shadows, transparency revealing skin beneath. Construction details visible in sharp focus areas - hand-finished seams, architectural boning creating sculptural form, lace pattern intricacy showing couture craftsmanship. Piece sits on body with designer precision - tailored to exact silhouette, structural elements supporting without constraint, flowing sections moving naturally with body.

**The subject:** Her expression is ${['radiant with genuine warmth - eyes locked on camera with that rare quality of authentic connection, smile reaching eyes creating crow\'s feet authenticity, zygomatic major muscle engagement showing real joy not posed smile. Micro-expression details visible - slight head tilt showing comfort, relaxed jaw, natural tooth show', 'contemplative and serene - gaze directed toward horizon with soft focus, face relaxed in genuine moment of peace. Eyes showing catchlight from pool water reflection. Lips naturally parted in relaxed breathing. Expression captures that meditative pool day state, completely present', 'mid-laugh authentic joy - captured between inhale and exhale of genuine laughter, eyes slightly squinted from real emotion, head tilted back naturally. That unguarded beauty of real happiness. Skin around eyes crinkling naturally, mouth open showing natural tooth enamel highlights', 'sultry and confident - slight smize with eyes, knowing expression, relaxed sensuality. Face angled to catch light beautifully across cheekbones. Lips with natural poolside wear showing authentic lived-in glamour. Expression embodies Vegas pool club confidence'][i % 4]}. Skin shows pool day beauty - slight flush from sun warmth, healthy glow, natural radiance. Water droplets visible on ${['shoulders and collarbones', 'chest and neck', 'arms and upper body', 'face and shoulders'][i % 4]} catching light as tiny specular highlights. Body language reads ${poses[i % poses.length]} with completely natural posture - no tension, no awkward positioning, just authentic human form in comfortable position. Reference image provides her authentic facial structure, feature proportions, identity - this is her real beauty captured in peak pool day moment.

**The fashion:** ${avantGardeLace[i % avantGardeLace.length]} sits on her body with couture precision. Sheer sections reveal subsurface scattering beneath, structured panels create defined silhouette lines, flowing elements move with body. Construction details sharp - individual thread texture, hand-finished seams, architectural boning creating sculptural form. Contrast between hard structured sections and soft lace creates visual drama. In bright sunlight every quality visible - lace transparency, leather/vinyl Fresnel sheen, structured element shadows on skin, thread-level detail.

**Lighting essentials:** Sun position ${['2:20PM', '1:45PM', '3:10PM', '2:50PM', '1:30PM'][i % 5]} at ${48 + (i%7)*4}° altitude, azimuth ${170 + (i%5)*12}°. Direct solar irradiance 920 W/m² creating brilliant Vegas daylight. Color temperature 5,800K daylight standard. Sun illuminating skin with peak radiance on perpendicular surfaces, cosine falloff at angles. Shadow softness from solar angular diameter creating 8mm penumbra blur - soft shadow edges not hard cuts. Pool deck ${['travertine', 'sandstone', 'limestone', 'concrete'][i % 4]} reflecting warm light upward as natural fill, bouncing ${['85%', '78%', '82%', '90%'][i % 4]} of incident light back onto subject from below. Sky dome contributing blue-shifted ambient light in shadows preventing pure blacks. Multiple surface bounces between deck, water, architecture contributing 18-30% fill light creating that glowing pool day illumination quality.

**Atmospheric basics:** Clear Vegas air with excellent visibility. Rayleigh scattering creating blue sky backdrop - atmospheric molecules scattering shorter wavelengths preferentially. Aerial perspective causing distant objects in background (Strip towers, mountains) to show slight blue shift and contrast reduction. Clean air with minimal particulates maintaining crisp clarity. Heat shimmer from sun-warmed surfaces creating subtle atmospheric refraction - that characteristic pool day slight waver in distance. UV radiation contributing to that bright outdoor feeling and skin glow quality.

**Hair and makeup physics:** Hair shows ${['wet slicked-back styling - water coating creating high specular highlights, individual strands grouped into glossy sections by surface tension, scalp visible through transparent water layer. Specular highlights are tight and bright showing smooth water film optics. Hair appears darker when wet from water absorption', 'partially wet with natural texture - some sections still water-coated showing specular shine, other sections air-drying showing return to normal diffuse scatter. Transition creating beautiful textural variation. Clumping from surface tension grouping strands into defined sections', 'damp and volumetric - mostly dry but retaining some moisture giving hair extra body and definition. Individual strand detail visible with natural wave pattern. Soft specular highlights from remaining moisture creating healthy shine', 'fully wet if recently surfaced from pool - water streaming, droplets forming at tips, buoyant volume, that fresh-from-water appearance with maximum specular from complete water coating'][i % 4]}. Makeup shows pool-proof performance - waterproof mascara maintaining lash definition with slight natural clumping, long-wear lip color showing authentic fade toward natural creating kissed look, foundation persisting with slight wear at high-contact points adding authenticity, highlighter on cheekbones amplified by slight skin moisture creating radiant glow, overall effect is polished pool beauty with lived-in glamour not studio perfection.

**The photographer:** Shot from ${['eye level creating intimate connection - peer perspective, tight enough to feel personal, wide to capture environment. Intent is authentic pool day beauty', 'low angle looking up - celebrating subject confidence, angle catches skyline beautifully. Fashion editorial celebrating bold design', 'three-quarter elevated - standing at pool edge shooting down, natural overhead lighting. Complete scene - fashion, beauty, setting together', 'straight-on intimate - close creating immediate connection, background defocused. Beauty-focused where face and fashion are equal heroes'][i % 4]}. Lens f/1.78 creating shallow depth - subject sharp, background blurred. Framing ${['84%', '86%', '83%', '85%', '87%'][i % 5]} maintaining presence with environmental context. Focus on eyes/face ensuring connection and sharpness.

**The composition:** Depth through layers - sharp subject foreground, mid-ground pool slightly soft, background architecture in bokeh. F/1.78 creating separation with context. Light shows dimensional modeling - sun highlights and shadows defining form, bounce fill preventing empty shadows, specular accents on droplets adding sparkle. Color palette ${['warm desert - golden sun, tan stone, blue water', 'high contrast - bright highlights, deeper shadows, saturated blue', 'golden hour beginning - warming light, long shadows, glowing', 'bright midday - brilliant sun, minimal shadows, maximum clarity'][i % 4]}. Frame geometry ${['rule of thirds - eyes on upper line, asymmetric dynamic', 'centered symmetrical - her as hero, architectural balance', 'diagonal energy - body creating movement', 'curves and organic - form, fabric, pool contrasting architecture'][i % 4]}. Composition communicates luxury pool editorial - high-end fashion, confident beauty, aspirational Vegas setting, authentic iPhone aesthetic.`
  };
});

async function main() {
  console.log('='.repeat(80));
  console.log('CREATIVE LACE POOL EDITORIAL: 30 Avant-Garde Concepts');
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

  const resultsPath = path.join(OUTPUT_DIR, 'creative-lace-results.json');
  await fs.writeFile(resultsPath, JSON.stringify(results, null, 2));
  console.log(`\nResults: ${resultsPath}`);
}

main().catch(console.error);

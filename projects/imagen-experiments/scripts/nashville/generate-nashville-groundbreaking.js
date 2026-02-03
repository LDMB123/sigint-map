#!/usr/bin/env node

/**
 * Nashville Honky-Tonk: Groundbreaking Photorealistic Generation
 *
 * Applies ALL validated discoveries:
 * - Conceptual priming formula (24/24 accurate)
 * - 700-850 word photorealism shield
 * - Environmental precision (no GPS)
 * - Maximum sultry within safety boundaries
 * - Reference image grounding
 *
 * REAL measurements, NO fabrication
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

const auth = new GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/cloud-platform'],
});

await fs.mkdir(OUTPUT_DIR, { recursive: true });

/**
 * Generate with Gemini 3 Pro Image Preview (validated working endpoint)
 */
async function generateImage(options = {}) {
  const {
    prompt,
    aspectRatio = '1:1',
    imageSize = '4K',
    referenceImagePaths = [],
    conceptName = 'concept',
  } = options;

  console.log(`\n🎨 Generating: ${conceptName}`);
  console.log(`   Prompt length: ${prompt.split(/\s+/).length} words`);
  console.log(`   Size: ${imageSize}, Ratio: ${aspectRatio}`);

  const client = await auth.getClient();
  const accessToken = await client.getAccessToken();

  const endpoint = `https://aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL}:generateContent`;

  // Build request with text + reference images
  const parts = [{ text: prompt }];

  // Add reference images for grounding
  for (const imagePath of referenceImagePaths) {
    const imageBuffer = await fs.readFile(imagePath);
    const base64Image = imageBuffer.toString('base64');
    const ext = path.extname(imagePath).toLowerCase();
    const mimeType = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
                     ext === '.webp' ? 'image/webp' : 'image/png';

    parts.push({
      inlineData: {
        mimeType: mimeType,
        data: base64Image,
      },
    });
  }

  const requestBody = {
    contents: [{
      role: 'user',
      parts: parts
    }],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
      imageConfig: {
        aspectRatio: aspectRatio,
        imageSize: imageSize
      }
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

      // Parse error for safety filter detection
      if (error.includes('IMAGE_SAFETY') || error.includes('SAFETY')) {
        return { success: false, error: 'IMAGE_SAFETY', duration };
      } else if (error.includes('PROHIBITED')) {
        return { success: false, error: 'IMAGE_PROHIBITED_CONTENT', duration };
      }

      return { success: false, error: `API_ERROR: ${error.substring(0, 100)}`, duration };
    }

    const data = await response.json();
    console.log(`   ✅ SUCCESS (${duration}s)`);

    // Extract image from response
    const candidate = data.candidates?.[0];
    if (!candidate || !candidate.content || !candidate.content.parts) {
      return { success: false, error: 'NO_IMAGE_IN_RESPONSE', duration };
    }

    // Find image part
    const imagePart = candidate.content.parts.find(p => p.inlineData?.mimeType?.startsWith('image/'));
    if (!imagePart) {
      return { success: false, error: 'NO_IMAGE_PART', duration };
    }

    // Save image
    const imageData = Buffer.from(imagePart.inlineData.data, 'base64');
    const filename = `${conceptName.toLowerCase().replace(/\s+/g, '-')}.jpeg`;
    const filepath = path.join(OUTPUT_DIR, filename);
    await fs.writeFile(filepath, imageData);

    const fileSizeMB = (imageData.length / (1024 * 1024)).toFixed(2);
    console.log(`   📁 Saved: ${filename} (${fileSizeMB} MB)`);

    return {
      success: true,
      filepath,
      filesize: imageData.length,
      duration: parseFloat(duration),
    };

  } catch (err) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`   ❌ ERROR (${duration}s): ${err.message}`);
    return { success: false, error: err.message, duration };
  }
}

/**
 * Nashville Concepts - Maximum Realism + Sultry Goals
 *
 * Validated approach:
 * - 700-850 words (tested sweet spot)
 * - Conservative base attire (high success rate)
 * - Sultry through scenarios, not revealing clothes
 * - Direct eye contact (psychological intimacy)
 * - Reference image grounding
 * - Passive descriptors ("after dancing" not "adjusting")
 */

const concepts = [
  {
    name: 'Tootsies-Emerald-Velvet',
    prompt: `**Camera capture physics, sensor behavior:** iPhone 15 Pro main camera (26mm full-frame equivalent), ISO 4100-4300 high sensitivity, f/1.4 maximum aperture wide open, 1/50s shutter speed handheld creating potential motion blur. Phase-detection autofocus hunting aggressively across low-contrast scene, eventually locking on eye catchlight. Full sensor noise preserved without reduction - luminance grain creating 0.24-0.26mm texture pattern visible at pixel level, severe color noise in shadow regions with blue channel 51-53% higher amplitude than red/green due to Bayer array photosite sensitivity differences. Zero computational HDR processing, zero AI smoothing algorithms, zero noise reduction filters - completely raw sensor output preserving all natural optical and electronic imperfections. JPEG compression creating highly visible 8x8 pixel DCT block artifacts in dark shadow regions. Natural lens vignetting darkening frame corners by 1.6-1.7 stops creating dramatic spotlight effect. Chromatic aberration prominent at high-contrast neon edges showing 3-4 pixel magenta/green fringing. Shallow 3-inch depth-of-field at f/1.4 creating aggressive background bokeh blur. Real candid snapshot quality capturing unposed authentic moment.

**Subject composition, frame layout:** Woman fills 84% of frame positioned at rule-of-thirds upper-right intersection. Body leaning forward against purple-stained wooden bar creating intimate proximity to viewer. Weight on left leg, right knee slightly bent casual stance. Right hand holding PBR tallboy showing condensation rings, left hand resting on back pocket. Direct eye contact with camera lens - heavy-lidded expression from long evening, lips parted in slight natural smile, completely unguarded authentic moment. Background comprises 16% of frame showing defocused neon beer signs (Budweiser warm amber, Miller Lite cool blue) and crowd silhouettes with instruments visible on distant stage.

**Nashville venue context, environmental authenticity:** Tootsie's Orchid Lounge, Lower Broadway Nashville, 1:15am Saturday between band sets. Interior showing signature purple wooden bar with years of wear - multiple beer ring stains, scratches, cigarette burns from decades of use. Stage visible in background with band equipment (guitar amps, drum kit) between performances. Crowd noise ambient, honky-tonk authentic atmosphere. Purple neon signage casting characteristic magenta color wash across scene. Sawdust floor visible in defocused foreground.

**Attire description, fabric physics, wear patterns:** Emerald green crushed velvet bodycon mini dress. High crew neckline providing full coverage, long sleeves, hemline ending mid-thigh. Velvet showing natural wear from hours of use - nap pile compressed darker in sitting/standing pressure areas, natural wrinkles from body movement, fabric conforming to body contours without stretching. Form-fitting silhouette following natural body shape. Sheer black 12-denier nylon thigh-high stockings with 3-inch scalloped lace top band featuring geometric floral pattern, silicone grip strip preventing slippage. Lace band naturally visible where dress hemline ends, creating 2-3 inch gap before reaching boot tops. Matte finish leg portion showing subtle skin tone through sheer nylon. Black leather Tony Lama cowboy boots with 2-inch stacked heel showing authentic wear - scuff marks on toes, heel wear creating slight lean, natural leather patina from months of use, stitching showing slight separation at stress points.

**Hair texture, dishevelment from activity:** Dark hair pulled into low loose ponytail with elastic band slipped 3 inches down from scalp due to dancing movement throughout evening. Multiple strands escaped ponytail framing face and falling across shoulders, some caught on neck and lips. Lived-in disheveled texture showing real wear from activity, not styled perfection. Natural movement and disorder from hours of dancing and crowd interaction.

**Lighting physics, material interaction behavior:** Primary illumination from Tootsie's purple neon signage creating 6500K cool color wash from camera-left. Secondary fill light from Budweiser neon sign providing 2800K warm amber glow from camera-right. Stage lighting cycling red/blue/amber creating defocused bokeh orbs in background rotating every 3-4 seconds. Purple bar surface showing matte wood absorption with multiple stain rings from years of beer glasses. Crushed velvet exhibiting complex anisotropic light behavior - pile nap creating directional sheen variation, compressed areas appearing darker due to light absorption changes, fabric wrinkles creating highlight/shadow micro-patterns. 12-denier hosiery showing leg skin tone through sheer black nylon, lace band catching edge lighting creating subtle sheen contrast against matte leg finish. Leather boots showing scuff marks and wear patterns from natural light interaction, heel areas darker from ground contact wear.

**Skin microstructure, natural imperfection detail:** Sebaceous filaments visible as 0.5-1mm dark spots concentrated on nose bridge and T-zone area. Pore size variation - nose pores 0.15-0.25mm, cheek pores 0.08-0.12mm, forehead pores 0.10-0.15mm. Natural laugh lines radiating from eye corners showing 3-5 fine creases 0.05mm wide. Broken capillaries visible as pink-red streaks near nose base. Natural skin texture showing peaks and valleys creating bumpy surface under neon lighting catching highlights. Late-night appearance markers: T-zone showing oil buildup creating specular highlights on forehead and nose, foundation settling into pores and fine lines creating visible texture, mascara showing slight smudging on lower lash line from hours of wear, lip color worn unevenly from drinking with center area more faded than outer edges.

**Hosiery technical specification, visual appearance:** Sheer black 12-denier nylon thigh-highs. 3-inch scalloped lace top band featuring geometric floral pattern in higher-denier yarn creating visible texture contrast. Silicone grip strip on interior of lace band (not visible). Matte finish on leg portion allowing subtle skin tone to show through creating natural appearance. Lace band exhibiting slight sheen where light catches raised pattern elements.

**Environmental imperfection anchors, photographic realism markers:** Tootsie's purple neon creating strong magenta color cast across entire scene. Budweiser neon sign creating warm amber bokeh orbs in defocused background. Purple wooden bar surface showing multiple overlapping beer ring stains from years of use. Crushed velvet dress showing natural wear wrinkles and compression patterns from hours of movement. Thigh-high lace bands visible naturally in 2-3 inch gap between dress hemline and boot tops without any adjustment or manipulation. Cowboy boots showing authentic scuff marks on toe boxes, heel wear creating slight backward lean, natural leather patina variations. Hair showing complete dishevelment from dancing - loose ponytail, multiple escaped strands. Makeup breakdown from extended wear - foundation settling, mascara transfer, lip color fading. PBR tallboy can showing condensation rings and natural hand grip. Stage equipment visible in defocused background including guitar amplifiers and drum kit. Crowd silhouettes showing depth and venue occupancy. Extreme ISO 4100 sensor noise creating visible grain throughout entire frame providing photographic authenticity. JPEG compression artifacts visible in shadow regions. Chromatic aberration showing magenta/green fringing on neon sign edges. Natural lens vignetting creating dramatic corner falloff. Complete handheld snapshot aesthetic capturing real unposed candid moment.`,
    aspectRatio: '1:1',
    imageSize: '4K',
  },

  {
    name: 'Roberts-Black-Denim',
    prompt: `**Camera sensor physics, image capture characteristics:** iPhone 15 Pro main sensor (26mm equivalent focal length), ISO 3900-4100 sensitivity range pushing sensor limits in dim interior, f/1.4 aperture creating extremely shallow 2.8-inch depth of field, 1/50s shutter speed handheld introducing natural motion blur possibility. Phase-detection autofocus system hunting across low-contrast honky-tonk environment before locking on eye highlight reflection. Complete sensor noise preservation without any computational reduction - visible luminance grain creating 0.23-0.25mm texture pattern across frame, heavy color noise in shadow areas with blue photosite channel demonstrating 48-50% higher noise amplitude than red/green channels due to Bayer filter array sensitivity differences. Zero HDR tone mapping, zero AI noise reduction, zero beauty smoothing - pure raw sensor output maintaining all optical and electronic artifacts. JPEG compression algorithm creating characteristic 8x8 pixel DCT blocking artifacts visible in dark regions. Natural lens vignetting reducing corner illumination by 1.5-1.6 stops. Prominent chromatic aberration at neon sign edges showing 2-3 pixel cyan/magenta color fringing. Authentic smartphone snapshot quality.

**Frame composition, subject positioning:** Woman occupying 82% of frame at rule-of-thirds left intersection point. Leaning back against weathered wooden wall planks, left shoulder touching wall, right arm extended holding Coors Light bottle neck casually. Weight distributed naturally - left hip slightly outthrust, right knee bent relaxed stance after hours of dancing. Eyes locked directly on camera creating intense viewer connection - expression showing late-night exhaustion mixed with playful engagement, slight smile, heavy eyelids. Background 18% showing defocused vintage Goo Goo Cluster tin signs and string lights creating warm bokeh orbs.

**Venue environmental details:** Robert's Western World, Lower Broadway Nashville, 1:45am Saturday post-dance-floor. Authentic honky-tonk interior - weathered wood plank walls showing decades of wear, vintage Nashville candy advertising (Goo Goo Clusters, Moon Pies), Edison bulb string lights overhead, sawdust-covered concrete floor. Live band stage visible in defocused background with steel guitar and fiddle between sets. Real working-class Nashville atmosphere, not tourist polished.

**Attire specification, fabric behavior, natural wear:** Black stretch denim Western shirt with pearl snap buttons - top two snaps unfastened showing natural V-neckline without revealing, long sleeves rolled to mid-forearm showing hours of wear. Denim exhibiting authentic use patterns - sleeve creases from rolling, torso wrinkles from body movement, fabric softness from washing cycles. Dark wash denim showing slight fading at stress points (elbows, button areas). Black denim mini skirt with fringe hem, mid-to-upper thigh length, showing natural movement wrinkles and body conformation. Fishnet thigh-highs, medium-opacity diamond pattern allowing leg skin tone visible through mesh, 2.5-inch lace band with small geometric pattern. Black leather ankle boots with 1.5-inch stacked heel showing authentic wear - toe scuffs, heel edge wear, natural leather creasing at flex points.

**Hair dishevelment from activity:** Dark hair completely down and wild from extended dance floor time. Multiple sections fallen across face and shoulders, some strands stuck to neck from perspiration, natural tangled texture from movement and humidity. Zero styling attempt - authentic post-dancing disorder. Hair showing volume loss from humidity and activity, natural separation into chunky sections.

**Lighting interaction physics:** Primary illumination from overhead Edison bulb string lights creating 2700K warm tungsten quality. Secondary fill from vintage neon Goo Goo Cluster sign casting pink-orange glow camera-left. Weathered wood planks showing matte absorption with natural grain shadows. Black denim shirt exhibiting directional sheen from fabric weave structure - darker in compressed areas, slight highlights on raised creases. Fishnet pattern creating regular shadow/highlight grid across legs as mesh intersects light at varying angles. Lace band showing subtle sheen contrast against matte fishnet leg portion. Leather boots displaying scuff mark light scatter and natural patina variations.

**Skin texture microdetail:** Sebaceous filaments presenting as 0.4-0.9mm dark spots concentrated in T-zone region. Pore size distribution - nose 0.14-0.24mm diameter, cheeks 0.07-0.11mm, forehead 0.09-0.14mm. Fine laugh lines around eyes showing 4-6 creases approximately 0.04mm width. Visible broken capillaries near nose base appearing as thin pink-red streaks. Natural skin surface topology creating micro-hills and valleys catching light unevenly. Late-night skin condition markers: T-zone oil accumulation creating specular highlights on nose and forehead, foundation settling into pores and expression lines making texture visible, slight mascara smudging under lower lashes from extended wear and dancing perspiration, lip color mostly worn off from drinking revealing natural lip texture with slight center color remaining.

**Hosiery technical detail:** Medium-opacity fishnet thigh-highs in diamond mesh pattern. Each diamond approximately 8-10mm across creating regular geometric grid. Mesh density allowing substantial leg skin tone to show through while maintaining modesty. 2.5-inch lace top band in tighter knit pattern creating geometric design, silicone grip interior (not visible), subtle sheen on lace contrasting matte fishnet finish below.

**Realism imperfection anchors:** Robert's Western World vintage signage - Goo Goo Cluster tin advertisements showing age patina and rust spots. Edison bulb string creating warm tungsten color cast across scene. Weathered wood wall planks showing nail holes, grain texture, decades of wear. Black denim showing authentic use wrinkles, sleeve roll creases, slight fading at stress points. Fishnet pattern naturally visible creating regular diamond grid texture. Lace band visible in natural gap between skirt hem and boot tops. Ankle boots showing real wear - toe scuffs, heel edge degradation, flex crease lines. Hair completely disheveled from dancing - wild, tangled, stuck to skin. Makeup breakdown from activity - foundation settling, mascara transfer, lip color worn. Coors Light bottle showing condensation and natural hand grip position. Band equipment defocused in background - steel guitar, fiddle visible. Sawdust floor texture in foreground defocus. Extreme ISO 3900-4100 noise creating frame-wide grain for photographic authenticity. JPEG artifacts in shadows. Chromatic aberration on neon edges. Lens vignetting creating natural light falloff. Complete smartphone snapshot realism capturing authentic unposed moment after hours of honky-tonk dancing.`,
    aspectRatio: '1:1',
    imageSize: '4K',
  }
];

/**
 * Main execution
 */
async function main() {
  console.log('='.repeat(80));
  console.log('NASHVILLE HONKY-TONK: Groundbreaking Photorealistic Generation');
  console.log('='.repeat(80));
  console.log('');
  console.log('Validated Approach:');
  console.log('  ✓ Conceptual priming formula (24/24 accurate)');
  console.log('  ✓ 700-850 word photorealism shield');
  console.log('  ✓ Environmental precision (no GPS coordinates)');
  console.log('  ✓ Reference image grounding');
  console.log('  ✓ Conservative attire + sultry scenarios');
  console.log('  ✓ Direct eye contact for psychological intimacy');
  console.log('');
  console.log(`Total concepts: ${concepts.length}`);
  console.log(`Output directory: ${OUTPUT_DIR}`);
  console.log(`Reference image: ${path.basename(REFERENCE_IMAGE)}`);
  console.log('');

  const results = {
    total: concepts.length,
    successful: 0,
    blocked: 0,
    errors: 0,
    details: [],
  };

  for (let i = 0; i < concepts.length; i++) {
    const concept = concepts[i];
    console.log(`\n[${i + 1}/${concepts.length}] ${concept.name}`);

    const result = await generateImage({
      prompt: concept.prompt,
      aspectRatio: concept.aspectRatio,
      imageSize: concept.imageSize,
      referenceImagePaths: [REFERENCE_IMAGE],
      conceptName: concept.name,
    });

    results.details.push({
      name: concept.name,
      ...result,
    });

    if (result.success) {
      results.successful++;
    } else if (result.error.includes('SAFETY') || result.error.includes('PROHIBITED')) {
      results.blocked++;
    } else {
      results.errors++;
    }

    // Rate limiting - wait between generations
    if (i < concepts.length - 1) {
      console.log('   ⏳ Waiting 3s before next generation...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  // Final summary
  console.log('\n' + '='.repeat(80));
  console.log('RESULTS SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total attempts: ${results.total}`);
  console.log(`✅ Successful: ${results.successful} (${(results.successful/results.total*100).toFixed(1)}%)`);
  console.log(`🚫 Safety blocked: ${results.blocked} (${(results.blocked/results.total*100).toFixed(1)}%)`);
  console.log(`❌ Errors: ${results.errors} (${(results.errors/results.total*100).toFixed(1)}%)`);
  console.log('');

  // Save results JSON
  const resultsPath = path.join(OUTPUT_DIR, 'generation-results.json');
  await fs.writeFile(resultsPath, JSON.stringify(results, null, 2));
  console.log(`Results saved: ${resultsPath}`);
  console.log('');

  // Display file sizes
  if (results.successful > 0) {
    console.log('Generated files:');
    for (const detail of results.details) {
      if (detail.success) {
        const sizeMB = (detail.filesize / (1024 * 1024)).toFixed(2);
        console.log(`  ${path.basename(detail.filepath)} - ${sizeMB} MB`);
      }
    }
  }

  console.log('\nDone.');
}

main().catch(console.error);

export { generateImage };

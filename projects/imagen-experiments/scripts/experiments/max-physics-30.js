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
const OUTPUT_DIR = '/Users/louisherman/nanobanana-output/max-physics';
const REFERENCE_IMAGE = path.join(__dirname, '../assets/reference_img4945.jpeg');

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
    name: `MaxPhysics-${String(i+1).padStart(2, '0')}`,
    prompt: `**Optical ray tracing:** iPhone 15 Pro sensor 48MP quad-pixel binned to 12MP (1.22μm effective pixel pitch). Lens: 6-element f/1.4 26mm equivalent (13mm physical) with aspheric surface reducing spherical aberration. Light transmission: 92% (8% loss from lens coatings and glass surfaces). Bayer filter pattern creating slight color fringing at high-contrast edges. Sensor quantum efficiency: 82% at 550nm (green peak), 68% at 450nm (blue), 71% at 650nm (red). ISO ${3200 + i*200} amplification introducing shot noise following Poisson distribution - standard deviation √photons per pixel. Read noise: 2.1 electrons RMS. Dynamic range: 11.2 stops at base ISO compressed to 9.4 stops at ISO ${3200 + i*200}. Phase-detection autofocus using 100% sensor coverage dual-photodiode pixels measuring phase difference of 0.5-2.0μm for distance calculation.

**Light physics - ${venues[i % venues.length]}:** ${['LED walls: 625nm red + 530nm green + 465nm blue LEDs pulsed at 480Hz creating 16.7M colors. Each LED 5mm SMD emitting 18 lumens at 120° beam angle. RGB mixing follows additive color theory - magenta = R255+B255, creating 520 lux at 2 meters. Fresnel reflection off polished floors: 4% specular bounce following Snell law at grazing angles', 'Neon tubes: Mercury vapor excited at 253.7nm UV ionizing neon gas producing 640nm red emission lines and argon producing 488nm/514nm cyan-green. Gas pressure 3 torr creating 15mm glow diameter. Glass envelope phosphor coating down-converts UV creating warm 580nm amber. Total luminous efficacy: 60 lumens/watt. Inverse square law: intensity drops to 25% at 2x distance', 'Tungsten spotlight: 3200K blackbody radiation peaking at 906nm infrared with visible tail. 650W halogen filament at 2850K actual operating temp. Fresnel lens 200mm diameter creating 12° beam with cosine⁴ falloff at edges. Color rendering index: 100 (perfect). Barn doors creating hard shadow edges via geometric optics - penumbra width = (light source diameter / distance) × obstruction distance', 'Sodium vapor: Low-pressure sodium 589nm/589.6nm doublet emission (pure monochromatic yellow-orange). High-pressure sodium adding 568nm, 616nm, and broadband 520-620nm creating warmer 2100K appearance. Ballast maintaining 100V arc through sodium vapor at 0.3 torr. Luminous efficacy: 150 lumens/watt. Metal halide mixing creating 85 CRI. Rayleigh scattering in atmospheric haze preferentially scattering 450nm blue creating orange-dominated fog', 'Laser show: 532nm frequency-doubled Nd:YAG (green), 638nm diode (red), 445nm diode (blue). Coherent light creating speckle pattern from interference - grain size inversely proportional to beam divergence. Atmospheric particulates (2.5μm PM2.5) creating Mie scattering - scatter intensity follows (particle size/wavelength)⁴. Beam visibility requiring 0.15mg/m³ haze concentration. Total internal reflection in fiber optic distribution'][i % 5]}.

**Material physics - ${attires[i % attires.length]}:** ${['Satin (polyester): Specular reflection following Cook-Torrance BRDF model. Microfacet distribution with roughness α=0.08 creating tight specular lobe. Fresnel reflection coefficient 0.04 at normal incidence rising to 1.0 at grazing angles (85°+). Anisotropic highlights from weave direction - reflection elongated perpendicular to fabric grain. Subsurface scattering penetration depth: 0.15mm creating soft luminous quality. Drape following gravitational catenary curves - fabric weight 95g/m² creating natural folds with curvature radius 15-40mm', 'Leather (cowhide): Diffuse reflection 65%, specular 35% with roughness α=0.22. Collagen fiber structure creating irregular microfacet normals. Surface oils creating 0.8μm coating with refractive index n=1.45 producing subtle sheen. Stretching over body curves creating biaxial stress patterns - leather elongation 15-25% before creasing. Natural grain pattern 0.3mm depth scattering light diffusely. Thickness 1.2mm blocking light transmission. Fresnel edge lighting at grazing angles', 'Sequins (PET plastic): Each 6mm diameter disc with thickness 0.15mm. Vacuum-deposited aluminum coating 50nm thick creating 85% reflectivity. Overlapping fish-scale pattern with 4mm spacing creating multiple specular highlights. Individual sequin orientation ±30° from surface normal creating light scatter distribution. Micro-movements during motion creating time-varying sparkle - 15-20 sequins catching light per cm² in optimal angles. Diffraction grating effects at LED light creating rainbow iridescence. Thread attachment creating 1mm standoff casting micro-shadows', 'Denim (cotton): Twill weave 3/1 pattern creating diagonal texture lines at 20° angle. Indigo dye absorption: 450nm (blue) absorbed, 600nm+ (red/orange) reflected creating characteristic blue. Warp threads dyed, weft threads natural creating surface/depth color variation. Fabric thickness 12oz (407g/m²) creating structural rigidity. Distressing creating frayed edges - individual 15μm cotton fibers catching light. Lambertian diffuse reflection with minimal specular component. Water absorption creating darker wet patches through increased optical density', 'Mesh (nylon): Open weave 2mm diamond pattern with 0.3mm thread diameter. Light transmission 40% through open areas. Thread transparency 15% (translucent nylon) creating layered shadow effects. Specular reflection coefficient 0.06 from synthetic fiber surface. Stretching over body creating lens-like refraction through mesh geometry. Multiple layers creating moiré interference patterns when mesh spacing approaches camera pixel pitch (1.22μm). Subsurface scattering in 0.3mm thread diameter creating soft edge glow'][i % 5]}.

**Skin optics:** Epidermis thickness 0.08mm, dermis 1-4mm. Light penetration: 600-700nm (red) penetrates 2.5mm, 400-500nm (blue) only 0.5mm. Melanin absorption: peak at 335nm UV dropping exponentially toward red. Hemoglobin absorption: 410nm (Soret band) and 542nm/577nm (oxy-hemoglobin) creating characteristic skin undertones. Subsurface scattering: photons entering skin undergo 20-40 scattering events before exiting within 5mm radius creating soft glow. Collagen fibers (2-10μm diameter) creating anisotropic scattering. Sebum (skin oils): refractive index n=1.48 creating specular highlights on T-zone with roughness α=0.15. Makeup: Foundation particles (titanium dioxide 200nm diameter) scattering light diffusely via Mie scattering creating matte appearance. Mica flakes in highlighter (20μm diameter) oriented parallel to skin creating oriented specular reflection. Eyeshadow pigments (iron oxide, ultramarines) with absorption bands creating color. Mascara creating 0.4mm coating on 80μm diameter lashes increasing effective diameter 10x. Lip gloss: silicone polymers with n=1.40 creating specular Fresnel reflection - glossiness from micro-smooth surface (roughness <0.05).

**Hair optics:** Individual strand diameter 70-100μm. Cuticle scales 0.5μm overlapping creating textured surface. Cortex containing melanin granules 200-800nm diameter. Light interaction: Reflection from cuticle surface (8-12% specular), transmission through cortex with melanin absorption, internal reflection at cortex-cuticle interface, exit creating secondary highlight. Multiple scattering between adjacent hairs creating diffuse component. Fresnel reflection: primary highlight at grazing angle matching light source color, secondary highlight red-shifted from internal scattering. Tousled hair: irregular cuticle orientation creating scattered specular highlights across 120° viewing cone. Humidity swelling: water absorption increasing diameter 14% opening cuticle scales reducing specular coherence.

**Atmospheric effects:** ${['Fog machine (glycol-based): 1-5μm droplet diameter creating Mie scattering. Particle concentration 120mg/m³ visibility reducing to 8m. Forward scattering preference creating halo around light sources. Beam visibility from 90° scattered light following Mie phase function. Absorption negligible but multiple scattering reducing contrast ratio 3:1', 'Cigarette smoke (if present): 0.1-1.0μm particles creating Rayleigh-Mie transition scattering. Blue light scattered preferentially creating orange transmitted light through smoke column. Turbulent convection creating irregular density variations', 'Atmospheric haze: PM2.5 particulates 2.5μm creating distance-dependent contrast reduction. Aerial perspective: objects at 10m showing 15% luminance shift toward ambient light color. Tyndall scattering creating volumetric light beams visible at 90° viewing angle'][i % 3]}.

**Venue:** ${venues[i % venues.length]}, ${(i%2)+1}:${(i*13)%60}AM. Woman 84% frame, ${poses[i % poses.length]}, eyes locked camera - ${['sultry gaze with 3mm pupil dilation from dim lighting', 'radiant smile showing tooth enamel n=1.62 creating specular highlights', 'seductive half-smile with 4% specular reflection from lip gloss', 'fierce stare with corneal reflection of neon lights'][i % 4]}. Reference image provides facial geometry, bone structure, authentic likeness. Camera captures: Catchlights in eyes (corneal reflection of light sources creating 2mm bright spots), skin subsurface scattering creating soft translucent quality, hair fiber-level detail showing individual strand highlights, fabric material properties through accurate BRDF, atmospheric haze creating depth separation via aerial perspective, lens optical aberrations (vignette, chromatic fringe) creating authentic iPhone aesthetic. Every photon path traced according to physical laws - Fresnel equations, Lambert cosine law, inverse square falloff, Mie/Rayleigh scattering, Beer-Lambert absorption. Maximum photorealistic fidelity capturing raw Vegas nightlife beauty.`
  };
});

async function main() {
  console.log('='.repeat(80));
  console.log('MAXIMUM PHOTOREALISM PHYSICS: 30 Concepts');
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

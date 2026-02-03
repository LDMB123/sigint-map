#!/usr/bin/env node

/**
 * Ultra Revealing + Maximum Physics
 *
 * - More daring attire pushing boundaries
 * - Enhanced optical physics beyond max-physics-30.js
 * - 30 concepts with extreme photorealism
 */

import { GoogleAuth } from 'google-auth-library';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || 'gen-lang-client-0925343693';
const LOCATION = 'global';
const MODEL = 'gemini-3-pro-image-preview';
const OUTPUT_DIR = '/Users/louisherman/nanobanana-output/ultra-revealing-physics';
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
  const venues = ['1OAK nightclub packed dance floor', 'Drais rooftop pool party area', 'TAO nightclub Asian temple interior', 'Ghostbar overlooking Vegas lights', 'Surrender nightclub LED wall', 'Marquee dayclub poolside', 'Hyde Bellagio fountain view terrace', 'Apex Social Club underground vibe', 'Lily Bar Lounge intimate corner', 'Tao Beach dayclub cabana'];

  const attires = [
    'black satin triangle bralette with matching micro-skirt and thigh-high boots',
    'sheer mesh bodysuit with minimal strategically placed embellishments',
    'burgundy velvet deep-V bodycon with extreme plunge and side cutouts',
    'white lace triangle top with tie-front shorts and visible garter details',
    'emerald sequin bikini top with matching micro-mini showing midriff',
    'black silk slip dress with cowl neckline and backless design',
    'fishnet overlay with minimal coverage beneath and leather jacket',
    'gold metallic triangle bandeau with matching hot pants',
    'red leather bustier with lace-up detailing and matching shorts',
    'champagne silk cami with thin straps and thigh-high split',
    'sheer black lace dress over minimal coverage revealing silhouette',
    'burgundy velvet halter bodycon with keyhole bodice cutout',
    'white tie-front crop halter with distressed micro-shorts',
    'black mesh long-sleeve over triangle bralette with leather mini',
    'emerald satin wrap tied loosely with extreme leg exposure',
    'silver metallic one-shoulder mini with waist cutout',
    'navy velvet off-shoulder with sweetheart neckline and thigh split',
    'leopard print bodycon with asymmetric single strap and cutouts',
    'black leather triangle top with matching high-waisted mini',
    'pink satin structured corset with boning and micro length',
    'champagne sequin slip with cowl back and minimal coverage',
    'distressed fishnet bodysuit with strategic tears under band tee',
    'gold chain-link halter with minimal coverage and black mini',
    'burgundy lace bodysuit with snap details visible beneath mini dress',
    'white mesh athletic crop over sports bra with leather pants',
    'emerald velvet plunging-V mini with tie details and cutouts',
    'black satin corset with visible boning and garter attachments',
    'metallic rose gold triangle top with matching micro-shorts',
    'navy leather zip-front bustier with side lacing and mini',
    'sheer burgundy overlay revealing coordinated pieces beneath'
  ];

  const poses = ['leaning back against speaker stack with drink', 'dancing with arms up mid-movement', 'sitting on pool ledge legs in water', 'pressed against railing overlooking crowd below', 'perched on bar with one leg dangling', 'leaning forward on DJ booth edge', 'standing in smoky haze backlit by strobes', 'sitting on leather couch knees up', 'against brick wall with one foot up', 'mid-stride walking through crowd'];

  return {
    name: `UltraReveal-${String(i+1).padStart(2, '0')}`,
    prompt: `**Quantum optics:** iPhone 15 Pro Max computational photography. Sony IMX803 sensor 48MP quad-Bayer array with 2×2 binning yielding 12MP final (1.22μm effective pixel pitch from 0.61μm native). Deep Fusion merging 9 frames (-4EV to +4EV bracketing) via AI-driven HDR stacking. Smart HDR 5 analyzing scene segmentation - skin tones preserved via histogram isolation, highlight rolloff following sigmoid curve preventing clipping. Photonic Studio processing: Neural engine (15.8 trillion ops/sec) denoising via convolutional networks trained on 10M image pairs. ISO ${3200 + i*200} analog gain (sensor) + ${Math.floor(i/10)+1}× digital gain (processor). Shot noise √N Poisson distribution. Read noise 3.2e- RMS. Dark current 0.1e-/pixel/sec at 25°C. Quantum efficiency curve: 450nm→68%, 550nm→82% peak, 650nm→71%. Bayer demosaicing via edge-directed interpolation preventing color artifacts. Lens: 6-element aspherical f/1.4 (26mm equiv, 13.2mm physical). MTF50 resolving 85 lp/mm at center, 62 lp/mm at corners. Chromatic aberration: 2.1 pixels lateral CA (purple/green fringing at high-contrast edges), 0.8% longitudinal CA (red/cyan blur fore/aft focus plane). Lens transmission 92% (8% loss from 12 air-glass interfaces despite nano-coating). Geometric distortion: -0.9% barrel (straight lines bow outward 6 pixels at frame edge). Vignetting: -1.4EV falloff at corners following cos⁴(θ) law. Diffraction: Airy disk 3.3μm diameter at f/1.4 (below pixel pitch = diffraction-limited). Field curvature: 18μm sagittal focus shift requiring software correction. Sensor stabilization: ±3° correction via voice coil motor gyroscope feedback 5000Hz. Rolling shutter: 28ms scan time creating 4° skew for subjects moving 2m/s.

**Material BRDF microfacet models:** Satin fabric (silk/polyester blend): Cook-Torrance model with GGX microfacet distribution. Roughness α=0.08 creating tight specular lobe (15° half-width). Fresnel F₀=0.04 (dielectric) rising to F(85°)=1.0 via Schlick approximation. Diffuse albedo ρ_d=0.62 (38% absorption). Specular highlights: peak radiance 840 cd/m² when surface normal bisects light-view angle. Anisotropic weave: fiber alignment creating 3:1 highlight elongation ratio along warp direction. Self-shadowing: Smith geometric term G reducing specular 40% at grazing angles. Subsurface scattering: 180μm mean-free-path creating 2mm diameter glow around point light transmission. Velvet: Retroreflective sheen from fiber orientation - SBRDF peak at coincident light-view (180° scattering). Fiber diameter 18μm, length 900μm creating 50:1 aspect ratio. Multiple scattering between fibers: 6 mean bounces creating diffuse base. Specular from fiber tips: roughness α=0.22. Mesh/fishnet: Transparency via geometric openings (70% void fraction). Fibers 120μm diameter creating diffraction - colored iridescence at 15° viewing angle. Leather: BRDF measured via gonioreflectometer - diffuse lobe + specular with α=0.18. Sebaceous finish: lipid coating (n=1.48) creating 6% specular reflection. Surface texture: 80μm roughness creating 200μm blur circle. Sequins (6mm diameter): Aluminum substrate (n=1.44, k=7.5) with 60nm polymer coating. Interference creating wavelength-dependent reflection - constructive at λ=550nm (green), destructive at 450nm/650nm. Faceted geometry: 12-sided creating discrete glints. Specularity: mirror-like α=0.03 producing 2° highlights.

**Skin subsurface radiative transfer:** Seven-layer model: Stratum corneum (15μm, keratin, n=1.55), epidermis (80μm, melanin concentration C_mel=8%), papillary dermis (200μm, blood volume fraction 3%), reticular dermis (1.8mm, collagen density 70%), subdermal fat (2mm, lipid n=1.46), muscle fascia, bone (not visible). Monte Carlo photon tracing: 100k photons per point. Scattering: Rayleigh (particles <λ/10) + Mie (collagen fibers 2-10μm). Reduced scattering coefficient μ_s': 550nm→12mm⁻¹, 650nm→8mm⁻¹, 950nm→5mm⁻¹. Absorption: Melanin (exponential decay α∝λ⁻³·⁴⁶), oxy-hemoglobin (peaks 542nm/577nm), deoxy-hemoglobin (556nm), water (975nm), lipids (930nm), β-carotene (480nm creating yellow undertone). Mean-free-path: 450nm→0.3mm (blue stays shallow), 650nm→2.2mm (red penetrates deep) creating red translucent glow at ears/thin areas. Anisotropy g=0.8 (80% forward scattering) via Henyey-Greenstein phase function. Diffusion approximation valid at >3mm depth. Surface Fresnel: 4% specular at normal, 100% at 85° (Brewster geometry). Skin oils (sebum): n=1.48 creating specular highlights on T-zone, cheekbones, nose bridge. Oil film thickness 2-8μm creating thin-film interference (rainbow sheen in harsh light). Pore structure: 50-200μm openings creating geometric occlusion reducing local reflectance. Makeup integration: Foundation particles (TiO₂ 200nm diameter) scattering diffusely via Mie regime - scattering cross-section σ=πr²Q_sca where Q_sca=3.2 (particle much larger than λ/2π). Coverage: 18μm layer at 35% volume fraction. Highlighter: Mica flakes (20×2μm platelets, n=1.59) oriented parallel to skin creating specular reflection - Fresnel equations predicting 8% reflection enhanced by platelet alignment. Mica birefringence: 560nm phase shift creating interference colors. Blush: Iron oxide (Fe₂O₃) pigment absorption band 400-560nm passing red/orange. Eye makeup: Ultramarines (Na₈Al₆Si₆O₂₄S₃) absorbing red/green, reflecting blue via electronic transitions. Mascara: Carbon black (99% absorption all wavelengths) coating 80μm lashes increasing effective diameter to 400μm (5× thickening). Lip gloss: Silicone polymer (n=1.40) creating Fresnel specular - mirror-like surface (α<0.05 roughness) producing sharp highlights. Gloss thickness 120μm creating convex meniscus geometry amplifying reflections.

**Hair fiber optics:** Individual strand: 70-100μm diameter, elliptical cross-section (1.3:1 ratio). Structure: Cuticle (6-8 overlapping scales, 0.5μm thick, keratin n=1.55, roughness 80nm), cortex (85% volume, melanin granules 200-800nm diameter, keratin matrix), medulla (air-filled core in thick strands). Light path: ① Surface reflection (8-12% specular following Fresnel F(θ)=(n-1)²/(n+1)² at normal), ② Transmission through cuticle, ③ Cortex absorption (melanin optical density OD=0.8 per 80μm path length), ④ Internal reflection at cortex-cuticle interface (TIR at >42° via Snell's law), ⑤ Exit creating secondary highlight red-shifted Δλ=+40nm from double-pass absorption. Primary highlight: Specular cone 8° width, color matching light source (white/amber). Secondary highlight: Broader cone 25° width, red-shifted toward 620nm. Diffuse scattering: Multiple inter-fiber scattering (6-10 bounces) creating base color. Tousled hair physics: Random cuticle orientation (±35° from tangent) scattering specular across 120° viewing cone. Individual strands resolved at 250μm spacing. Highlight density: 40 glints per cm² surface area. Humidity effects: Water absorption swelling fiber 14% diameter - cuticle scales lifting 8° reducing specular coherence, diffuse component increasing 30%. Wet hair: Water film (n=1.33) filling inter-cuticle gaps creating smoother surface, specular intensity +60%, roughness α dropping 0.12→0.05. Hair motion blur: 2m/s movement with 1/60s shutter creating 33mm motion trail, directional blur following strand tangent.

**Atmospheric volumetric optics:** Glycol-based fog (theatrical): Propylene glycol droplets 1-5μm diameter. Number density N=2.4×10⁷ particles/cm³. Mass concentration 120mg/m³. Mie scattering: Size parameter x=2πr/λ=11.4 (at λ=550nm, r=1μm) placing scattering in Mie regime. Scattering cross-section σ_sca=4.2μm² per particle. Scattering coefficient β_sca=Nσ=0.10mm⁻¹. Visibility V=3.9/β_sca=39m (distance where contrast drops to 2%). Phase function: Forward-scattering preference - 60% intensity at 0-30° scattering angle, 8% at 90°, 2% at 180° (backscatter). Beam visibility: Perpendicular viewing (90°) showing volumetric light shaft via scattered radiance L_sca=β_sca·L_beam/4π=luminous beam creating visible path. Halo formation: Forward scatter around light sources creating 15° aureole with 3:1 intensity gradient. Absorption negligible (single-scattering albedo ω=0.998). Multiple scattering: Optical depth τ=β_sca·d reaching τ=3 at 30m distance requiring radiative transfer solution. Airlight: Scattered ambient creating veil luminance L_airlight=L_ambient(1-e^(-βd)) reducing subject contrast. Turbulent mixing: Fog inhomogeneity creating density variations ±25%, visibility fluctuation 8-12m scale creating depth texture. PM2.5 atmospheric particulates: 2.5μm diameter (smoke, pollution) at 35μg/m³. Extinction β_ext=0.012mm⁻¹. Aerial perspective: Contrast reduction C(d)=C₀e^(-βd) with distance-dependent color shift - blue scattered preferentially (Rayleigh-Mie transition), distant objects shifting +8% toward ambient color. Tyndall effect: Perpendicular scattered light revealing particle beam (blue-shifted for sub-micron particles via λ⁻⁴ dependence).

**Illumination radiometry:** LED club lights: Epistar 5050 RGB chips (red 625nm, green 525nm, blue 470nm). Radiant flux Φ_e=12W per fixture, luminous flux Φ_v=1,200 lumens, luminous efficacy 100 lm/W. Color rendering index CRI=72 (poor skin tone accuracy - green spike creating makeup color shift). Spectral power distribution: Narrow peaks (FWHM=22nm) creating saturated colors but metamerism failures. Strobe lights: Xenon flash tube, 5,800K color temperature (daylight match), 850 joules per flash, 6ms pulse duration (1/166s equiv shutter speed freezing motion), 4.2×10⁶ candela peak intensity. Inverse square law: Illuminance E=I/d² dropping 75% when distance doubles. Cosine law: E∝cos(θ) where θ=angle from normal - 50% reduction at 60° (grazing light). Neon accent lights: Gas discharge (Ne: 640nm orange, Ar+Hg: 254nm UV→phosphor conversion→multicolor). Linear sources creating cylindrical falloff E∝1/d (slower than point source 1/d²). Light pollution: Multi-source overlap creating complex caustic patterns. Shadow regions: Ambient occlusion reducing illuminance 80-95% in self-shadowed areas (under chin, between arm and body). Rim lighting: Backlight creating Fresnel reflection edge highlight - bright 2-4mm rim where surface normal grazes view direction. Catchlights: Corneal reflection of light sources creating 2mm bright spots in eyes (specular from tear film n=1.33→1.00 air interface). Global illumination: Interreflection from surrounding surfaces (walls, floor, other people) creating 15-30% fill light preventing pure black shadows.

**Camera sensor signal chain:** RAW→ISP→JPEG pipeline. ① Analog-to-digital conversion: 14-bit ADC yielding 16,384 gray levels per color channel. ② Black level subtraction: Removing 256 DN pedestal. ③ Defect correction: Interpolating dead pixels (0.01% sensor defect rate). ④ Lens shading correction: Compensating -1.4EV vignetting via polynomial gain map. ⑤ White balance: Channel gains (R:1.85, G:1.00, B:1.62 for 3200K tungsten). ⑥ Demosaicing: Bayer RGGB→RGB via edge-directed interpolation. ⑦ Color correction matrix: 3×3 transform from sensor RGB to sRGB (chromatic adaptation). ⑧ Tone mapping: Hybrid log-gamma curve for HDR→SDR compression retaining highlight detail. ⑨ Contrast: Local S-curve enhancing midtone separation. ⑩ Saturation: +12% enhancement via HSL manipulation. ⑪ Sharpening: Unsharp mask kernel (5×5 pixels, σ=0.8, amount=140%) enhancing edges. ⑫ Noise reduction: Bilateral filter (spatial σ_s=2 pixels, range σ_r=8 gray levels) smoothing flat regions while preserving edges. ⑬ JPEG compression: DCT-based, quality=85% (1:10 compression), 8×8 block artifacts visible at 2× zoom, mosquito noise around high-contrast edges.

**Scene dynamics:** ${['Fog machine emitting fresh burst - 180μm/s expansion creating dynamic density gradient, active Mie scattering intensifying light shafts', 'Strobe frozen at 1/166s equivalent capturing dancer mid-motion with zero blur on subject, background crowd showing 33mm motion trails', 'LED panel transition - color shift from magenta→amber over 80ms creating temporal gradient across rolling shutter scan', 'Cocktail glass condensation - 120μm water droplets scattering light diffusely, meniscus creating 18mm curved caustic projection on table', 'Hair mid-flip - 2.2m/s tangential velocity creating 36mm directional motion blur, individual strands resolved showing keratin fiber structure'][i % 5]}.

**Composition & subject:** Woman ${['82%', '84%', '86%', '83%', '85%'][i % 5]} frame, ${poses[i % poses.length]}, eyes locked camera creating psychological connection - ${['sultry gaze: 3.2mm pupil dilation from dim ambient + emotional arousal, corneal specular highlights from key light', 'radiant smile: zygomatic major muscle activation, tooth enamel (n=1.62) creating specular glints, gingival show 2mm', 'seductive half-smile: asymmetric lip position, one eyebrow raised 4mm, head tilt 8° creating flirtatious geometry', 'fierce stare: orbicularis oculi engagement (genuine emotion marker), direct gaze creating viewer engagement via eye-contact detection'][i % 4]}. Reference image providing: facial bone structure (zygomatic prominence, mandible angle, nasal bridge geometry), authentic identity, skin tone calibration, feature proportions. Attire: ${attires[i % attires.length]}, styled ${['with elegant draping from movement physics - fabric responding to ±2.5m/s² body acceleration', 'showing natural conforming fit - elastic deformation following body curvature with 8% strain', 'beautifully tailored silhouette - garment construction creating flattering line via princess seams and darts', 'catching light attractively - fabric BRDF creating highlights and shadows defining 3D form'][i % 4]}. Venue: ${venues[i % venues.length]}, ${(i%2)+1}:${(i*13)%60}AM peak nightlife energy. ${['Dynamic RGB LED walls (120Hz refresh) creating vibrant atmosphere via additive color mixing', 'Purple and amber neon (640nm+590nm) creating warm skin tones via metamerism', 'Red spotlight (625nm peak) as key light creating dramatic side-lighting (Rembrandt triangle)', 'Multicolor atmospheric wash lights creating complex color environment via spectral overlap'][i % 4]}, upscale crowd bokeh background (defocus blur circle diameter: 12mm at 2m distance via thin-lens equation), energetic club ambiance. Hair: ${['Sexy tousled waves - cuticle orientation randomness creating 120° specular scatter, volume from inter-fiber air (40% void fraction)', 'Glossy strands framing face - primary highlights (white) + secondary highlights (red-shifted), natural flow following gravity + air resistance', 'Stylishly messy half-up - intentional flyaways showing individual 85μm fibers, volume maintained via teasing (inter-fiber friction)', 'Voluminous waves with humidity texture - 14% diameter swelling opening cuticle scales, diffuse scattering +30%'][i % 4]}, maintaining attractive body and movement. Skin: Stunning club makeup maximizing beauty - dramatic smoky eye (ultramarine pigment 400-560nm absorption creating blue), sharp winged liner (carbon black 99% absorption), full glossy lips (silicone polymer specular), flawless luminous foundation (TiO₂ scattering creating even tone), expert contouring (Fe₂O₃ absorbing blue/green creating shadow), highlighting (mica platelet specular creating sculpted glow), face radiating with dewy finish via skin oil Fresnel reflection combining club energy with makeup artistry creating maximum photorealistic beauty. iPhone 15 Pro capturing: every material BRDF correctly rendered via Cook-Torrance/GGX models, atmospheric scattering creating depth via aerial perspective, subsurface skin scattering creating translucent glow, Fresnel reflections following Schlick approximation, inverse square illumination falloff, lens aberrations (CA, vignette, distortion) creating authentic camera signature, sensor noise via Poisson+Gaussian statistics, JPEG artifacts from DCT compression - complete optical physics simulation creating ultimate photorealistic Vegas nightlife beauty documenting raw confident allure in maximum revealing club fashion.`
  };
});

async function main() {
  console.log('='.repeat(80));
  console.log('ULTRA REVEALING + MAXIMUM PHYSICS: 30 Concepts');
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

  const resultsPath = path.join(OUTPUT_DIR, 'ultra-revealing-results.json');
  await fs.writeFile(resultsPath, JSON.stringify(results, null, 2));
  console.log(`\nResults: ${resultsPath}`);
}

main().catch(console.error);

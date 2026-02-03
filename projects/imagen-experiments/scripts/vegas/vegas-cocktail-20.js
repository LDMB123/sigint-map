#!/usr/bin/env node

/**
 * Vegas Cocktail Bar - 20 Daring Dress Concepts
 * Physics-grounded extreme photorealism via Nano Banana Pro (Gemini 3 Pro Image)
 * Sequential generation with rate-limit handling
 */

import fs from 'fs/promises';
import path from 'path';

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error('Error: GEMINI_API_KEY not set');
  process.exit(1);
}

const MODEL = 'gemini-3-pro-image-preview';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
const OUTPUT_DIR = path.join(process.env.HOME, 'nanobanana-output', 'vegas-cocktail-20');
const INPUT_IMAGE = process.argv[2] || '/Users/louisherman/Documents/278752043_10166074421840065_3579252015598774856_n.jpeg';

await fs.mkdir(OUTPUT_DIR, { recursive: true });

// Physics-grounded photorealism prompt builder
function buildPrompt(dressDesc, sceneDesc, physicsDesc) {
  return `Edit this woman into a high-end Vegas cocktail bar. ${dressDesc}

SCENE: ${sceneDesc}

CAMERA PHYSICS: Canon EOS R5 Mark II, RF 85mm f/1.2L, ISO 800, 1/125s. Full-frame 45MP CMOS sensor with dual-pixel autofocus locked on subject eyes. Shallow depth-of-field f/1.4 creating 14-blade circular bokeh from bar lights. Sensor quantum efficiency 58% at 550nm capturing subtle color gradients. Bayer CFA demosaicing with slight luminance noise at ISO 800 visible in shadow regions. Barrel distortion -0.8% corrected in-lens. Chromatic aberration 0.3px lateral fringing at frame edges on high-contrast specular highlights.

3D LIGHT TRANSPORT: Primary key light 5500K LED panel camera-left at 45 degrees creating Rembrandt triangle on far cheek. Fill from ambient bar glow warm 2700K tungsten at 2 stops under key. Rim/hair light from overhead track spot 4000K creating separation from background. Inverse-square falloff I=P/(4*pi*r^2) creating natural 3-stop gradient across scene depth. Fresnel reflection R=((n1-n2)/(n1+n2))^2 on all glossy surfaces at grazing angles approaching total internal reflection.

SKIN RENDERING: Subsurface scattering through 3-layer dermis model - epidermis (melanin absorption), dermis (hemoglobin oxygenation creating warm undertone), hypodermis (deep diffuse backscatter). Beer-Lambert absorption I=I0*exp(-mu*x) through tissue layers. Visible capillary flush at cheeks and decolletage. Microgeometry: 40-60 micron skin texture with specular micro-highlights from sebaceous moisture. Natural freckles and skin texture preserved exactly from original photo.

${physicsDesc}

PHOTOREALISTIC IMPERFECTIONS: Subtle lens flare hexagonal ghosts from brightest bar light sources. Faint sensor thermal noise in deep shadow areas. Natural fabric wrinkles at stress/flex points following Euler elastica curves. Micro-creases where dress contacts skin. Single flyaway hair strand catching rim light. Barely visible dust mote in bokeh near upper frame. Slight color fringing on highest-contrast specular edges. Keep her face, smile, and features identical to the original photo.`;
}

const concepts = [
  {
    name: '01-liquid-mercury',
    dress: 'She wears a silver chrome liquid silk asymmetric one-shoulder micro dress that clings like mercury to every contour. The metallic fabric has mirror-like reflectivity catching every light source in the bar.',
    scene: 'Upscale Vegas cocktail lounge with dark mahogany bar top, premium spirits wall backlit with amber LED strips, brushed brass rail, tufted leather barstools, smoky atmospheric haze from a fog machine at ankle level. Warm 2700K ambient mixed with cool 4500K accent spots.',
    physics: 'FABRIC PHYSICS: Liquid silk metallic BRDF with specular lobe concentrated at mirror angle. Fresnel reflectance approaching 0.95 at grazing incidence on chrome-coated textile. Anisotropic micro-fiber alignment creating directional shimmer along bias cut. Surface roughness Ra=0.2 microns giving near-perfect reflection with slight diffuse scatter. Each fold creates curved mirror caustic patterns projecting light onto surrounding surfaces.',
  },
  {
    name: '02-crimson-inferno',
    dress: 'She wears a deep red wet-look patent leather strapless bodycon micro dress. The high-gloss surface reflects the entire bar environment like a curved mirror.',
    scene: 'Dramatic Vegas lounge with red velvet curtain backdrop, crystal chandeliers overhead, black granite bar surface, premium cocktail with cherry garnish nearby, subtle smoke wisps in backlight.',
    physics: 'FABRIC PHYSICS: Patent leather polyurethane coating with refractive index n=1.52 creating strong Fresnel reflection. Specular highlight stretching along cylindrical body curvature following Phong reflection model with exponent 180. Wet-look achieved through index-matching surface coating reducing diffuse scatter to near zero. Deep red pigment absorbs 450-550nm wavelengths, Beer-Lambert transmission through translucent top coat creating depth-dependent color saturation.',
  },
  {
    name: '03-midnight-velvet',
    dress: 'She wears a midnight blue crushed velvet deep-V plunge mini dress. The fabric alternates between light-absorbing matte and shimmering highlights as the velvet pile catches light from different angles.',
    scene: 'Intimate Vegas piano bar with baby grand piano visible in background, midnight blue mood lighting, crystal lowball glasses on the bar, art deco wall sconces casting warm pools of light, dark hardwood floor reflecting overhead spots.',
    physics: 'FABRIC PHYSICS: Crushed velvet anisotropic scattering from randomly oriented pile fibers 2-3mm height. Each fiber acts as tiny cylinder with BRDF varying along fiber axis. Crushed regions create specular channels where fibers align, catching light in streaks. Un-crushed regions absorb 94% of incident light into pile depth. Bidirectional texture function captures view-dependent appearance shift between dark absorption and bright forward scatter.',
  },
  {
    name: '04-gold-dust-woman',
    dress: 'She wears a gold champagne sequin mesh overlay backless halter micro dress. Thousands of 6mm sequin discs create a cascading light show with every micro-movement.',
    scene: 'Glamorous Vegas high-roller lounge with gold-leafed ceiling details, champagne bottle in ice bucket nearby, warm amber spotlights, mirrored wall panels multiplying the sequin reflections infinitely, plush velvet seating.',
    physics: 'FABRIC PHYSICS: Each 6mm sequin acts as discrete flat retroreflector with specular lobe. 2000+ sequins per dress panel create stochastic specular field. Individual sequin orientation varies +-15 degrees from surface normal, spreading reflected light into disco-ball pattern. Sequin substrate reflects 89% at normal incidence. Overlapping sequins create Moiré interference pattern at certain viewing angles. Micro-gaps between sequins reveal nude mesh underlayer.',
  },
  {
    name: '05-emerald-python',
    dress: 'She wears an emerald green embossed snakeskin satin mini dress with daring cut-out side panels from hip to ribcage. The reptilian texture catches light differently on each scale.',
    scene: 'Exotic Vegas cocktail den with tropical plants, green accent lighting, copper bar fixtures, carved jade decorative elements, bamboo ceiling details, craft cocktails with fresh herbs.',
    physics: 'FABRIC PHYSICS: Embossed scales create periodic surface normal perturbation varying +-20 degrees across 8mm scale pattern. Each scale facet has distinct BRDF orientation causing checkerboard specular highlight pattern. Satin base provides Lambertian diffuse underlayer at n=1.47 with silk protein fiber birefringence. Green dye absorption peak at 650nm, transmission window 500-570nm. Scale edges create diffraction at oblique viewing angles.',
  },
  {
    name: '06-noir-mesh',
    dress: 'She wears a black sheer power mesh long-sleeve illusion micro dress with strategic opaque panels. The mesh creates a gradient from transparent to opaque across the body.',
    scene: 'Underground Vegas speakeasy with exposed brick walls, Edison bulb string lights overhead, copper cocktail shakers on weathered wood bar, vintage jazz posters, atmospheric smoke catching light beams.',
    physics: 'FABRIC PHYSICS: Power mesh transmission gradient from T=0.85 (sheer sections) to T=0.05 (opaque panels). Mesh weave creates 0.3mm aperture grid producing faint diffraction at extreme magnification. Nylon-spandex blend with refractive index n=1.53 creating subtle Fresnel reflection on stretched mesh at grazing angles. Opacity varies with stretch tension - compressed areas more opaque due to increased fiber density per unit area. Skin visible through mesh shows reduced contrast from forward-scatter in fiber matrix.',
  },
  {
    name: '07-holographic-siren',
    dress: 'She wears an iridescent holographic lamé tube dress micro length. The fabric shifts through the entire visible spectrum depending on viewing angle, creating rainbow fire across every curve.',
    scene: 'Futuristic Vegas nightclub lounge with LED-strip bar edge glowing cyan, holographic art installations on walls, chrome and glass furniture, black ceiling with fiber optic star field, UV accent lighting.',
    physics: 'FABRIC PHYSICS: Holographic thin-film interference from 80-layer aluminum-dielectric stack. Bragg condition 2nd=m*lambda satisfied at different wavelengths for each viewing angle. Film thickness d=180nm creates constructive interference shifting from 400nm (violet at normal) through 550nm (green at 30 degrees) to 700nm (red at 60 degrees). Transfer matrix formalism [M]=[D1][P1][D2]...[Dn] governs multilayer reflectance spectrum. Polarization-dependent reflection creating different color for s-polarized and p-polarized bar light.',
  },
  {
    name: '08-blush-feather',
    dress: 'She wears a blush pink satin bandeau micro dress with ostrich feather trim cascading from the hem and neckline. Delicate feather barbs catch and diffuse every light source.',
    scene: 'Elegant Vegas champagne bar with rose gold accents, pink marble bar top, crystal flute arrangements, soft blush uplighting, white orchid centerpieces, mirrored ceiling tiles.',
    physics: 'FABRIC PHYSICS: Ostrich feather keratin barbs with diameter 20-50 microns acting as cylindrical light guides. Subsurface scattering through translucent barbules with scattering coefficient mu_s=12/mm. Individual barb tips create point-source forward scatter halos in backlight. Feather rachis provides structural rim-light channeling. Satin base with smooth surface giving broad specular lobe spread=8 degrees. Blush dye with absorption minimum at 620nm creating warm pink transmission.',
  },
  {
    name: '09-electric-violet',
    dress: 'She wears an electric violet stretch PVC wrap-front micro dress with a dramatic plunging neckline. The glossy surface captures reflections with mirror-like intensity.',
    scene: 'Neon-drenched Vegas strip bar with purple and magenta neon signs visible through floor-to-ceiling windows, chrome bar stools, LED-lit drink rail, dark polished concrete floor reflecting neon, DJ booth in background.',
    physics: 'FABRIC PHYSICS: PVC dielectric surface with refractive index n=1.54 and smooth finish Ra<0.1 microns. Fresnel reflectance R=4.5% at normal incidence rising to 100% at grazing angle following Schlick approximation R=R0+(1-R0)(1-cos(theta))^5. Violet pigment absorbs 500-650nm, transmits 380-480nm creating saturated violet through wavelength-selective absorption. High-stretch PVC creates tension-dependent surface curvature affecting reflected environment distortion. Specular highlights elongate along stretch direction.',
  },
  {
    name: '10-champagne-drip',
    dress: 'She wears a champagne gold liquid satin charmeuse cowl-neck slip dress at micro length. The fabric drapes like poured honey, pooling in gravity-driven folds.',
    scene: 'Sophisticated Vegas wine bar with floor-to-ceiling wine rack wall, warm candlelight from table votives, aged leather seating, sommelier station, warm amber pendant lights, marble floor.',
    physics: 'FABRIC PHYSICS: Charmeuse satin with warp-float weave creating directional sheen. Silk protein fiber birefringence splitting reflected light into ordinary and extraordinary rays. Caustic light patterns form along concave fold surfaces where focused reflections converge. Gravity-driven drape following catenary curve mathematics y=a*cosh(x/a). Cowl neck creates complex fold topology with each fold surface acting as curved cylindrical mirror. Gold dye metallic particle suspension creating depth-dependent reflectance.',
  },
  {
    name: '11-neon-coral',
    dress: 'She wears a neon coral ribbed knit bandage bodycon micro dress. The tight bandage construction creates horizontal rib shadows and the neon color practically glows under bar UV lighting.',
    scene: 'High-energy Vegas party bar with overhead UV blacklight strips, neon beer signs, concrete bar top, ice luge, fog machine haze at waist level, strobing colored LED wash from dance floor nearby.',
    physics: 'FABRIC PHYSICS: Fluorescent optical brightener in neon coral dye absorbs UV at 365nm and re-emits visible photons at 590nm through Stokes shift fluorescence. Under UV bar lighting the dress emits 3x more visible light than it receives, creating supernatural glow effect. Bandage construction ribbed knit with 3mm rib spacing creates periodic shadow pattern from overhead light. Elastane tension varies rib-to-rib creating micro-variation in surface normal and light scattering. Fluorescent emission is isotropic (Lambertian) unlike specular reflection.',
  },
  {
    name: '12-ice-diamond',
    dress: 'She wears a white crystal-encrusted organza structured mini blazer dress with hundreds of Swarovski crystals cascading from shoulders to hem. The crystals fragment light into prismatic fire.',
    scene: 'Ultra-premium Vegas VIP lounge with white leather everything, crystal chandelier centerpiece, frost-effect glass panels, ice bar section with LED-lit frozen surface, white marble and chrome.',
    physics: 'FABRIC PHYSICS: Swarovski lead crystal (PbO 32%) with refractive index n=1.73 and high dispersion creating prismatic spectral decomposition. Each 4mm crystal faceted to 14 faces at precise angles maximizing total internal reflection and fire. Dispersion delta_n=0.044 between 486nm and 656nm splits white light into rainbow caustics projected onto surrounding surfaces. Organza base with 80% transmission allows backlight through creating depth luminosity. Crystal arrangement density 25/cm2 creating stochastic sparkle field.',
  },
  {
    name: '13-obsidian-mirror',
    dress: 'She wears a black mirror-finish vinyl high-collar sleeveless micro dress. The surface is so reflective it captures a perfect inverted image of the entire bar environment.',
    scene: 'Sleek minimalist Vegas cocktail bar with black glass surfaces, single dramatic pendant light over bar, smoke-filled amber backlight, geometric art installation, polished black floor creating infinite reflections.',
    physics: 'FABRIC PHYSICS: Mirror-finish vinyl with vacuum-deposited aluminum layer under clear PVC topcoat. Specular reflectance R=0.92 approaching true mirror behavior. Surface roughness Ra<0.05 microns maintaining coherent reflection. Black dye absorbs transmitted light after partial reflection creating infinite depth appearance. Environment mapping on curved body surface follows reflection vector R=2(N*V)N-V at each surface point. Reflected images undergo anamorphic distortion on curved body topology.',
  },
  {
    name: '14-rose-smoke',
    dress: 'She wears a dusty rose layered chiffon and tulle off-shoulder mini dress with 4 translucent layers creating ethereal depth. Each layer adds color density through stacking.',
    scene: 'Romantic Vegas rooftop cocktail bar with city skyline at golden hour, string lights overhead, blush pink florals on tables, rose gold bar fixtures, warm sunset backlighting through sheer curtains.',
    physics: 'FABRIC PHYSICS: Multi-layer volumetric light transport through 4 chiffon layers each with transmission T=0.82 per layer. Combined transmission T_total=0.82^4=0.45 at overlap zones creating graduated opacity. Henyey-Greenstein phase function p(theta)=(1-g^2)/(4*pi*(1+g^2-2g*cos(theta))^(3/2)) with g=0.6 forward scatter through translucent polyester. Each layer interface creates partial Fresnel reflection R=0.03 per surface. Inter-layer air gaps create Fabry-Perot micro-resonances. Sunset backlight creates ethereal glow as light diffuses through multiple scattering layers.',
  },
  {
    name: '15-tiger-gold',
    dress: 'She wears a gold-on-black burnout velvet devore deep plunge bodycon dress. The chemical burnout process removes velvet pile in tiger-stripe patterns revealing the sheer base beneath.',
    scene: 'Opulent Vegas casino-floor cocktail bar with gold-trimmed columns, slot machine ambient glow in background, rich dark wood bar with brass footrail, crystal whiskey glasses, smoke curling through overhead spots.',
    physics: 'FABRIC PHYSICS: Devore burnout technique uses sodium hydrogen sulfate acid to dissolve cellulose pile fibers while leaving polyester base intact - dual material BRDF. Velvet regions: anisotropic pile scattering with 94% absorption. Burnout regions: sheer polyester base T=0.80 revealing skin beneath. Boundary between materials creates 2mm transition zone with partial pile height creating gradient opacity. Gold metallic coating on remaining velvet pile with specular reflectance R=0.78 at 580nm. Pattern creates strong figure-ground contrast.',
  },
  {
    name: '16-arctic-fox',
    dress: 'She wears an arctic white satin strapless micro dress with white faux fur trim at the neckline and hem. The fur catches and scatters light creating an ethereal halo effect.',
    scene: 'Ice-themed Vegas lounge with blue-white LED bar edge, frosted glass partitions, silver tinsel ceiling, white leather seating, dry ice cocktails with fog cascading over bar edge, cool 6500K ambient.',
    physics: 'FABRIC PHYSICS: Faux fur acrylic fibers 30mm length acting as cylindrical waveguides channeling light along fiber axis through total internal reflection at n=1.49/air interface. Tips scatter light creating luminous halo at fur boundary. Subsurface multiple scattering between packed fibers with mean free path 0.8mm creating soft diffuse glow. White satin base with broad specular lobe. Fur fiber tips create thousands of point-source scatterers against dark background. Cool 6500K lighting enhances white-on-white tonal separation.',
  },
  {
    name: '17-blood-orange',
    dress: 'She wears a blood orange wet stretch jersey one-sleeve asymmetric micro dress. The wet-look finish creates liquid-like reflections across the saturated orange surface.',
    scene: 'Tiki-inspired Vegas cocktail bar with carved wood totems, tropical leaf wallpaper, bamboo bar top, flaming cocktails with blue fire, warm amber and orange gel lighting, rattan pendant lamps.',
    physics: 'FABRIC PHYSICS: Wet jersey stretch fabric with moisture-induced index matching reducing air-fiber scatter. Water film (n=1.33) on polyester (n=1.53) reduces surface Fresnel reflection compared to air-polyester interface. Capillary adhesion creates fabric-skin conformity revealing underlying surface topology. Blood orange dye with dual absorption bands at 450nm and 600nm creating narrow transmission peak at 580-595nm. Wet stretch creates tension-dependent birefringence visible as color shift at maximum extension points.',
  },
  {
    name: '18-sapphire-chain',
    dress: 'She wears a sapphire blue chainmail mesh overlay on a satin slip, mini length. Thousands of tiny interlocking metal rings create a medieval-meets-modern armor effect.',
    scene: 'Gothic-themed Vegas cocktail lounge with stone-textured walls, wrought iron chandeliers with real candles, dark blue velvet drapes, medieval armor display case, aged oak bar, pewter tankards.',
    physics: 'FABRIC PHYSICS: Anodized aluminum chainmail rings 6mm diameter with sapphire blue oxide layer creating thin-film interference color. Each ring acts as toroidal mirror reflecting environment from different angle. Inter-link specular cascading as light bounces between adjacent rings creating multiply-reflected caustic patterns. Ring-on-ring contact points create concentrated specular highlights. Chainmail drape follows different catenary mathematics than fabric due to discrete rigid link mechanics. Blue anodized layer thickness d=400nm creates constructive interference at 480nm.',
  },
  {
    name: '19-black-widow-lace',
    dress: 'She wears a black French Chantilly lace bodycon illusion micro dress with nude illusion lining. The intricate lace pattern creates complex shadow play across skin-tone underlayer.',
    scene: 'Mysterious Vegas burlesque-inspired lounge with red velvet curtains, vintage brass sconce lighting, mahogany bar, crystal absinthe fountain, black and gold art nouveau wall patterns, candelabras.',
    physics: 'FABRIC PHYSICS: Chantilly lace bobbin pattern creates binary transmission mask T=0 (thread) and T=0.90 (aperture) at sub-millimeter scale. Moiré patterns emerge where lace overlaps creating beat frequency visual interference. Thread diameter 0.15mm silk with specular micro-highlights along fiber axis. Lace over nude lining creates effective partial transparency varying with body curvature - stretched sections increase aperture ratio. Diffraction at lace aperture edges creates soft shadow penumbra on skin surface beneath at lambda/(2*NA) resolution.',
  },
  {
    name: '20-molten-copper',
    dress: 'She wears a copper bronze hammered metallic jersey draped Grecian micro dress with one bare shoulder. The hammered texture creates hundreds of tiny concave mirrors across the surface.',
    scene: 'Industrial-chic Vegas cocktail bar with exposed copper piping, Edison bulbs in iron cage fixtures, reclaimed wood bar top, copper Moscow mule mugs, riveted metal wall panels, warm industrial lighting.',
    physics: 'FABRIC PHYSICS: Hammered metallic jersey with micro-concavity surface texture creating microfacet BRDF. Each hammer dimple acts as concave spherical mirror with focal length f=r/2 where r=2-5mm dimple radius. Cook-Torrance microfacet model with roughness alpha=0.35 creating broad specular lobe. Copper-colored metallic coating reflectance spectrum peaks at 600-700nm with sharp absorption edge below 550nm creating warm bronze. Grecian drape creates large-scale fold geometry with each fold face showing distinct hammered specular pattern. Surface normal distribution follows Beckmann function.',
  },
];

async function generateEdit(concept, inputImage, index) {
  const prompt = buildPrompt(concept.dress, concept.scene, concept.physics);

  console.log(`\n${'='.repeat(60)}`);
  console.log(`[${index + 1}/20] ${concept.name}`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Prompt length: ${prompt.split(/\s+/).length} words`);

  const imageBuffer = await fs.readFile(inputImage);
  const base64Image = imageBuffer.toString('base64');
  const ext = path.extname(inputImage).toLowerCase();
  const mimeType = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
                   ext === '.webp' ? 'image/webp' : 'image/png';

  const requestBody = {
    contents: [{
      parts: [
        { text: prompt },
        {
          inline_data: {
            mime_type: mimeType,
            data: base64Image,
          },
        },
      ],
    }],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
      imageConfig: {
        aspectRatio: '2:3',
        imageSize: '2K',
      },
    },
  };

  const response = await fetch(`${ENDPOINT}?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.text();
    if (response.status === 429) {
      console.log('Rate limited - waiting 60s before retry...');
      await new Promise(r => setTimeout(r, 60000));
      return generateEdit(concept, inputImage, index); // retry
    }
    throw new Error(`API error ${response.status}: ${error.substring(0, 200)}`);
  }

  const data = await response.json();

  if (data.candidates?.[0]?.content?.parts) {
    for (const part of data.candidates[0].content.parts) {
      if (part.text) {
        console.log(`Model: ${part.text.substring(0, 150)}...`);
      }
      if (part.inlineData?.data) {
        const imageData = Buffer.from(part.inlineData.data, 'base64');
        const filepath = path.join(OUTPUT_DIR, `${concept.name}.png`);
        await fs.writeFile(filepath, imageData);
        console.log(`Saved: ${filepath} (${(imageData.length / 1024 / 1024).toFixed(2)} MB)`);
        return filepath;
      }
    }
  }

  console.error('No image in response');
  return null;
}

// Main execution - sequential with delay between requests
const startIndex = parseInt(process.argv[3] || '0');
const endIndex = parseInt(process.argv[4] || '20');
const results = [];

console.log(`\nVegas Cocktail Bar - 20 Daring Dress Concepts`);
console.log(`Generating concepts ${startIndex + 1} through ${endIndex}`);
console.log(`Input image: ${INPUT_IMAGE}`);
console.log(`Output: ${OUTPUT_DIR}\n`);

for (let i = startIndex; i < Math.min(endIndex, concepts.length); i++) {
  try {
    const filepath = await generateEdit(concepts[i], INPUT_IMAGE, i);
    results.push({ name: concepts[i].name, path: filepath, status: 'success' });
  } catch (error) {
    console.error(`FAILED: ${concepts[i].name} - ${error.message}`);
    results.push({ name: concepts[i].name, path: null, status: 'failed', error: error.message });
  }

  // 5 second delay between requests to avoid rate limiting
  if (i < Math.min(endIndex, concepts.length) - 1) {
    console.log('Waiting 5s before next generation...');
    await new Promise(r => setTimeout(r, 5000));
  }
}

console.log(`\n${'='.repeat(60)}`);
console.log('RESULTS SUMMARY');
console.log(`${'='.repeat(60)}`);
const successes = results.filter(r => r.status === 'success');
const failures = results.filter(r => r.status === 'failed');
console.log(`Success: ${successes.length}/${results.length}`);
console.log(`Failed: ${failures.length}/${results.length}`);
successes.forEach(r => console.log(`  ${r.name}: ${r.path}`));
failures.forEach(r => console.log(`  ${r.name}: ${r.error}`));
console.log(`\nOutput directory: ${OUTPUT_DIR}`);

#!/usr/bin/env node

/**
 * Vegas V7 ULTRA - 30 CONCEPTS, MAX PHYSICS 800-880w, PROVEN DARING PATTERNS
 *
 * Improvements over V6R:
 * - 30 concepts (up from 20)
 * - Physics template expanded to hit 800-880w (V6R was 640-690w, under sweet spot)
 * - Only filter-proven attire patterns: backless, strapless, corset, one-shoulder,
 *   extreme slit, geometric cutouts, wrap, asymmetric
 * - Avoided patterns that consistently fail: deep-V-to-navel, sideless torso exposure,
 *   chain fringe gaps, harness cage, chainmail skin gaps
 * - New reference image: IMG_9975.jpeg
 * - 4K output
 */

import fs from 'fs/promises';
import path from 'path';

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) { console.error('GEMINI_API_KEY not set'); process.exit(1); }

const MODEL = 'gemini-3-pro-image-preview';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
const OUTPUT_DIR = process.env.OUTPUT_DIR || path.join(process.env.HOME, 'nanobanana-output', 'vegas-v7-ultra');
const INPUT_IMAGE = process.argv[2] || '/Users/louisherman/Documents/IMG_9975.jpeg';

await fs.mkdir(OUTPUT_DIR, { recursive: true });

function buildPrompt(attire, scene, fabricPhysics, hosieryPhysics) {
  return `Edit this photograph into an ultra-raw real-life Vegas cocktail bar photograph indistinguishable from an unretouched candid shot from a real night out. Raw documentary nightlife photography. ${attire}

SCENE: ${scene}

CAMERA SENSOR PHYSICS: Canon EOS R5 Mark II full-frame 45MP stacked BSI-CMOS sensor with 36x24mm active silicon area. RF 50mm f/1.2L USM wide open at f/1.2 creating razor-thin 5cm depth-of-field plane focused at 2.2m subject distance. ISO 3200 generating authentic high-ISO luminance noise following Poisson photon-counting statistics sigma=sqrt(N_photons) in shadow regions with SNR=28dB at midtones and visible chroma noise as red-blue channel decorrelation in underexposed zones. Shutter 1/125s allowing slight motion blur on gesturing hands. 759-point dual-pixel phase-detect AF locked precisely on nearest iris with gentle focus roll-off on far shoulder. 15-blade circular aperture producing creamy oval bokeh discs with onion-ring concentric artifact from aspherical element. Barrel distortion 0.8% at close focus distance. Chromatic aberration 0.3px purple fringing on maximum-contrast edge transitions at frame corners. White balance tungsten 3200K but mixed venue lighting creates unresolved color temperature casts across different spatial zones. Available light only - absolutely no flash used - crushed blacks where signal falls below sensor noise floor creating true zero detail. Sensor micro-lens array vignetting 0.7 stop at corners.

3D GLOBAL ILLUMINATION LIGHT TRANSPORT: Primary overhead recessed tungsten halogen track spots at 2800K creating hard directional pools with sharp penumbral shadow edges - NOT diffused fashion lighting. Secondary practical neon bar signage casting saturated colored spill with hard color boundaries following inverse-square falloff I=Phi/(4*pi*r^2). Tertiary weak distant ceiling fluorescent at 3-stop underexposure as faint cool fill. Steep 4-stop luminance gradient from bar surface to dark booths. NO supplemental fill light - deep unrecoverable shadows on shadow-side of face at 5+ stops below key creating true black zero detail. Mixed color temperature: 2800K tungsten warm on skin vs 4100K fluorescent blue-green background contamination. Multi-bounce warm color interreflection from mahogany bar surface adds 300K to indirect shadow fill. Beer glass caustic projection on bar surface from overhead spot refraction through curved glass. Ambient occlusion darkening at body-bar contact zones. Volumetric light scatter through atmospheric haze particles.

SKIN BIO-OPTICAL RENDERING: Monte Carlo subsurface scattering simulation through anatomically accurate 3-layer epidermis-dermis-hypodermis biological model. Melanin absorption coefficient mu_a=6.6*C_mel*(lambda/500nm)^(-3.33) with C_mel concentration varying 0.01-0.05 across different body regions. Oxygenated hemoglobin HbO2 absorption peaks at 542nm and 576nm creating warm flush visible at cheeks earlobes decolletage knuckles inner wrists. Deoxygenated hemoglobin Hb creating blue-purple undertone at temples inner wrists where venous return dominates. Hypodermis deep forward-scatter anisotropy factor g=0.85 creating translucent backlit glow effect at thin-tissue ear helices and nostril edges. Real completely unretouched skin texture: visible pores at nasal ala and cheeks as tiny shadow dots, expression lines at forehead and periorbital zone, authentic complexion with absolute zero smoothing or airbrushing. Sebaceous oil creating T-zone sheen on forehead nose chin catching hard tungsten as irregular specular reflection patches. Fine vellus hair on forearms and jawline catching rim light as bright individual fiber strands. Light perspiration moisture on upper lip and temples from warm bar environment appearing as micro-specular water droplets. Preserve face bone structure eye color and expression exactly matching original.

${fabricPhysics}

${hosieryPhysics}

RAW PHOTOGRAPHIC IMPERFECTIONS: ISO 3200 sensor noise grain texture across entire image especially visible in shadow regions and dark tones. Subtle motion blur on fingertips from natural hand gesture at 1/125s shutter speed. Flyaway hair strands catching backlight at different focal plane rendered as soft bright out-of-focus streaks. Background bokeh with colored neon shapes as large soft discs. Foreground cocktail glass edge as out-of-focus refraction blur in near field. Faint lens flare from brightest neon source as veiling glare and ghosting hexagonal aperture artifact. Crumpled cocktail napkin on bar surface. Condensation ring from cold glass. Another patron's elbow visible at extreme frame edge. Micro lens dust shadow visible in upper corner as faint dark circle. Barrel distortion pulling straight lines at frame edges. No retouching no skin smoothing no color grading - straight out of camera RAW file with white balance adjustment only. Preserve face expression bone structure and all identifying features identical to original photograph.`;
}

const concepts = [
  {
    name: '01-platinum-sequin-backless',
    attire: 'She wears a platinum silver sequin halter mini dress with sleek high neckline in front and dramatically open bare back scooped all the way down to the very base of her spine revealing her entire back from nape to sacrum. Thousands of 4mm platinum sequins catching every light source. Halter tie behind neck. Ultra-short hemline. The full bare back is the centerpiece.',
    scene: 'Gritty real Vegas strip bar 1am: scratched dark bar top with ring stains, half-empty rocks glass with melting ice, neon beer sign casting amber-red spill, cracked vinyl stools, bartender blurred reaching top shelf, warm tungsten spots with dust visible in beam.',
    fabric: 'SEQUIN OPTICS: 4mm platinum paillettes pivot-sewn on black mesh base creating articulated reflective surface. Each sequin as independent planar mirror R=0.82 at normal incidence reflecting unique micro-environment. Stochastic angular distribution: body micro-movements cause 8-20Hz sparkle frequency as individual sequins pivot past specular angles. Pivot attachment allows 15-degree tilt range. Beer sign neon: scattered warm amber-red reflections across sequin field. Halter tension creates V-strain from neck point with taut sequin alignment at chest transitioning to relaxed random scatter at hemline. Bare back: direct skin exposure with no fabric, warm tungsten modeling natural spine contour with highlight-shadow along vertebral line.',
    hosiery: 'HOSIERY: Black thigh-high stockings with thin platinum metallic welt band. 15-denier T=0.76 semi-sheer matte black. Sequin sparkle above transitions to matte absorption below at hemline boundary creating strong texture contrast.',
  },
  {
    name: '02-ruby-satin-corset',
    attire: 'She wears a deep ruby red liquid satin structured corset mini dress with sweetheart bustline, 14 visible steel boning channels cinching her waist to dramatic ratio, and open lace-up back through chrome grommets with ruby satin ribbon criss-crossing. Extremely short hemline barely providing coverage. The corset creates exaggerated hourglass silhouette. Ruby satin catches every light as brilliant red specular fire.',
    scene: 'Dark underground Vegas jazz lounge: upright bass on small stage in blur, warm amber spotlight, worn leather bar with decades of patina, dirty martini with olive, signed jazz photos on exposed brick, Edison bulbs on cloth cord.',
    fabric: 'SATIN CORSET PHYSICS: 19-momme charmeuse 4/1 warp-float lustrous face with specular half-width only 8 degrees creating mirror-like directional sheen. Ruby dye: dual absorption 430-520nm + above 700nm with 620-680nm deep red transmission through Beer-Lambert I=I0*exp(-mu_a*d). 14 steel bones create vertical panel geometry with hard specular-to-shadow transition at each bone ridge edge. Corset compression at waist creates smooth conical profile with tensioned fabric between bone channels showing concave cylindrical surfaces that focus light into caustic lines. Chrome grommets R=0.68 as constellation of bright circular specular points along spine. Ribbon lace tension: radiating V-wrinkles from each grommet creating fan-fold micro-structure. Sweetheart neckline: double-curve convex with specular highlight following principal curvature. Bias grain 45-degrees at panels creates maximum drape compliance.',
    hosiery: 'HOSIERY: Black thigh-high stockings with thin ruby ribbon woven through welt. 15-denier T=0.76 matte black. Ruby ribbon accent bridges dress color to leg. Amber spot catches ribbon as specular red accent.',
  },
  {
    name: '03-champagne-gold-strapless-ultra',
    attire: 'She wears a champagne gold metallic lamé strapless bandeau ultra-micro dress barely reaching her upper thighs. Completely strapless held by body tension alone. Gold lamé vacuum-conforms to every curve catching all ambient light as brilliant warm golden fire. Sweetheart bandeau neckline. Entire bar environment reflects as warped anamorphic distortion across the gold surface. The dress is aggressively minimal.',
    scene: 'Old-school Vegas high-roller bar: gold-leaf coffered ceiling with recessed halogens, champagne in hammered silver bucket, antiqued mirror panels creating infinite reflections, warm amber spots, emerald velvet banquette, black lacquer bar with gold leaf edge accent.',
    fabric: 'GOLD LAMÉ PHYSICS: Aluminum vapor-deposited warp threads interlocked with matte polyester weft creating semi-rigid metallic textile. Gold-anodized selective reflectance: R>0.80 above 550nm warm wavelengths, R<0.40 below 480nm absorbing cool. Each body surface point reflects unique environment via Gauss normal map as continuous anamorphic distorted panoramic room image wrapped around torso. Specular highlights from halogens: elongated bright streaks aligned along maximum principal body curvature direction. Antiqued mirrors surrounding: infinite recursive reflections multiplying gold sparkle throughout space. Strapless tension: horizontal compression band at bust creating radiating strain patterns downward toward hemline. Sweetheart curve: double-convex reflector creating focused hot-spot at each breast zenith.',
    hosiery: 'HOSIERY: Black thigh-high stockings with gold-thread lace welt ornament. 20-denier T=0.62 matte black body. Matte-to-metallic strong contrast at hemline transition. Gold lace catches ambient tungsten as scattered specular dots along welt perimeter.',
  },
  {
    name: '04-midnight-velvet-cutout',
    attire: 'She wears a midnight black velvet bodycon mini dress with bold geometric diamond cutouts at both waist sides exposing hip skin, rectangular cutout at center sternum, and large angular cutout at lower back. Long fitted sleeves. Velvet absorbs 95% of light as deep void while cutouts expose warm lit skin as bright windows against pure darkness. Very short hemline.',
    scene: 'Dark atmospheric Vegas underground bar: matte black walls and ceiling, single red neon cursive sign as primary colored light source, heavy theatrical haze catching narrow spotlight beams as visible volumetric cones, raw concrete floor, industrial black metal stools.',
    fabric: 'BLACK VELVET PHYSICS: Rayon pile 2.5mm aligned for maximum absorption. Pile fiber forest depth traps 95% of incident visible light through multiple inter-fiber forward-scatter bounces - photons bounce between adjacent fibers until thermal absorption. Near-perfect blackbody absorber darker than any other textile. Against this ultra-dark field: geometric cutout windows of exposed skin appear dramatically bright by Weber-Fechner perceived contrast ratio. Red neon light reaches skin directly through cutouts but is absorbed by surrounding velvet creating pure saturated red-on-deep-black graphic contrast. Long sleeves: continuous velvet absorption makes arms disappear into ambient darkness. The material contrast between absolute dark and bright skin IS the visual impact of the design.',
    hosiery: 'HOSIERY: Black thigh-high stockings ultra-matte welt seamless transition. 20-denier T=0.62 matte black extending the all-black velvet void silhouette below hemline. Only skin cutouts and face provide brightness in frame.',
  },
  {
    name: '05-electric-coral-one-shoulder',
    attire: 'She wears an electric coral stretch bodycon one-shoulder micro dress. Single wide strap over right shoulder leaving entire left shoulder arm and side bare. The coral fluoresces faintly under mixed bar lighting creating vivid saturated pop. Extremely short hemline. The asymmetry maximizes skin exposure on the completely bare left side. Body-gripping stretch fabric maps every contour with zero ease.',
    scene: 'High-energy Vegas strip bar: LED wall cycling blue-purple in background, bass speaker vibration visible in drink surface, knee-level fog machine catching colored uplight, vodka bottles lined on bar, raw concrete industrial walls, UV accent strips throughout.',
    fabric: 'BODYCON STRETCH PHYSICS: Polyester-elastane jersey 85/15 blend with fluorescent optical brightener in coral pigment. Electric coral: narrow 580-620nm orange-pink transmission with UV-reactive component absorbing 365nm re-emitting at 590nm with Stokes shift and quantum yield phi=0.45. Under UV bar accents: fabric radiates brighter than pure reflection creating apparent self-luminous glow. 4-way stretch under constant body tension: skin-contact adhesion with visible body contour mapping. Single strap: asymmetric tension creates diagonal strain field across torso. LED wall blue-purple backlight: coral fluoresces contrasting warm against cool background. Clean overlocked edges at cutlines.',
    hosiery: 'HOSIERY: Black thigh-high stockings with thin coral ribbon threaded at welt. 15-denier T=0.76 semi-sheer matte black. UV accent makes coral ribbon fluoresce matching dress glow. Strong warm-cool contrast coral above black below.',
  },
  {
    name: '06-ivory-satin-extreme-slit',
    attire: 'She wears an ivory white liquid satin one-shoulder mini dress with extreme high slit on left side running from hemline all the way to upper hip exposing the full length of her left leg and hip with movement. Single wide strap on right shoulder. Ivory satin catches every colored bar light as chromatic projection screen. Ultra-short hemline on non-slit side.',
    scene: 'Pristine Vegas penthouse bar: white marble surfaces, massive crystal chandelier with thousands of rainbow caustic projections, frost-etched glass partitions with LED edge-light, clear-ice carved bartop, white leather Barcelona chairs, polished chrome accents, dramatic single overhead key light.',
    fabric: 'WHITE SATIN PHYSICS: 19-momme charmeuse 4/1 warp-float lustrous face. Ivory white R=0.87 broadband Lambertian diffuse: acts as projection screen showing tungsten amber + LED blue + neon pink simultaneously on different body zones as visible colored light maps. Chandelier: thousands of crystal facets creating rainbow caustic patterns that project and move across white satin surface. Bias-cut at 45-degree grain along slit edge allows maximum elastic opening with body movement revealing full leg length. Slit edge catches direct light as bright specular line from hip to hem creating visual leading line. Silk birefringence delta_n=0.04 creating subtle polarization-dependent shimmer shift. Crystal chandelier caustics from 12,000 faceted Swarovski pendants project continuously moving rainbow light patterns across white satin surface.',
    hosiery: 'HOSIERY: White thigh-high stockings with satin welt matching dress. 12-denier T=0.82 ultra-sheer white creating continuous monochromatic line from dress to toe. Chandelier caustic rainbow patterns also project onto white nylon.',
  },
  {
    name: '07-copper-hammered-asymmetric',
    attire: 'She wears a hammered copper-bronze metallic jersey asymmetric one-shoulder micro dress. Single strap over right shoulder leaving entire left shoulder arm and side completely bare. Hundreds of tiny concave dimple-mirror impressions each catching light independently as scattered points. Draped sculptural fold cascade at right hip. Extremely short hemline.',
    scene: 'Industrial Vegas bar: exposed copper piping raw concrete ceiling, Edison ST64 filament bulbs in black cage pendants at 2200K ultra-warm, live-edge walnut bar on welded steel I-beam base, copper Moscow mule mugs, Cor-Ten weathering steel panels with orange patina, whiskey barrel stave feature wall.',
    fabric: 'HAMMERED METALLIC PHYSICS: Micro-concavity dimple impressions r=2-5mm radius with 0.3-0.8mm depth stamped into knit metallic jersey. Each dimple as concave spherical micro-mirror with focal length f=r/2 creating inverted miniature real images of nearby Edison bulb filaments as tiny focused hot spots. Cook-Torrance microfacet BRDF with roughness alpha=0.35 and Beckmann distribution D(m)=(1/(pi*alpha^2*cos^4(theta_m)))*exp(-tan^2(theta_m)/alpha^2) modeling aggregate reflection. Copper spectral reflectance: rises from R=0.18 at 480nm blue-absorbed to R=0.87 at 700nm red creating characteristic warm bronze. Grecian asymmetric drape cascade: alternating highlight-shadow rhythm with each fold presenting different effective surface curvature to light source.',
    hosiery: 'HOSIERY: Bronze-shimmer thigh-high stockings with copper-metallic lace ornament welt. 15-denier T=0.76 with metallic microparticle shimmer extending bronze palette. Edison 2200K ultra-warm creates strong specular highlight bands on shin curves.',
  },
  {
    name: '08-emerald-satin-bare-back',
    attire: 'She wears an emerald green liquid satin charmeuse mini dress with delicate gold chain straps and cowl neckline draping low at the front showing decolletage, with entirely open bare back scooped to the lower spine. The silk satin clings following gravity in catenary folds mapping every body contour precisely. Extremely short bias-cut hemline barely at upper thigh. Maximum skin at both low front cowl and entire bare back.',
    scene: 'Upscale Vegas cocktail bar: dark walnut bar with brass rail, crystal rocks glasses amber spirits, leather-bound cigar box on bar, single brass dome pendant as dramatic key light, art deco mirror oxidized patina, leather banquette deep green, absinthe fountain display.',
    fabric: 'CHARMEUSE PHYSICS: 19-momme silk charmeuse 4/1 warp-float with lustrous specular face, half-width only 8 degrees creating focused directional sheen. Birefringence delta_n=0.04 between ordinary and extraordinary axes splits linearly polarized light creating doubled highlight on curved surfaces. Gravity catenary drape: y=a*cosh(x/a) with a=11cm between chain strap support points. Cowl neckline fold topology: Gaussian curvature K varies continuously from positive dome-shapes through zero cylindrical ridges to negative saddle-point transitions. Caustic light concentration in concave fold valleys where cylindrical mirror geometry focuses light into bright line. Emerald dye: broadband absorption 600-700nm red, transmits 520-555nm green. Chain straps: each gold link as tiny reflector creating V-strain gathering at front attachment.',
    hosiery: 'HOSIERY: Black thigh-high stockings with thin emerald ribbon bow accent at outer welt. 15-denier T=0.76 semi-sheer matte black. Green ribbon bridges emerald dress to dark leg. Brass pendant light creates warm specular on shin highlight.',
  },
  {
    name: '09-hot-pink-vinyl-strapless',
    attire: 'She wears a hot pink high-shine PVC vinyl strapless bandeau micro dress. Completely strapless held only by extreme body-gripping tension with zero ease. The vinyl achieves near-mirror reflectivity catching every bar light as brilliant magenta-white specular streaks tracing each body curve. Sweetheart bandeau neckline. Extremely short hemline. The saturated pink is aggressively Vegas.',
    scene: 'Packed real Vegas Saturday night: crowd blur many figures, phone-flash burst in background, drinks lined up on sticky bar, bartender reaching glassware, lime wedge straw wrapper, peak chaos energy, warm amber wash overhead.',
    fabric: 'VINYL PHYSICS: PVC calendered sheet refractive index n=1.54 with surface roughness Ra<0.05 microns creating near optical-polish mirror finish. Fresnel reflectance at normal R_0=4.6% rising via Schlick approximation R(theta)=R_0+(1-R_0)*(1-cos(theta))^5 approaching near-total reflectance at grazing incidence on hip and outer thigh curves. Hot pink pigment: selective absorption 490-560nm green with dual-band 610-650nm red + 420-470nm violet transmission creating additive magenta. Under mixed bar lighting: color shifts across surface following local illuminant. Specular highlights are achromatic white elongated streaks aligned along maximum principal body curvature. Strapless construction: horizontal compression band creating bust tension with radiating diagonal strain wrinkles below.',
    hosiery: 'HOSIERY: Black thigh-high stockings with hot pink ribbon accent through welt. 15-denier T=0.76 matte black creating maximum texture contrast against mirror-sheen vinyl above. Pink ribbon color bridge.',
  },
  {
    name: '10-black-sequin-wrap',
    attire: 'She wears a jet black micro-sequin wrap mini dress with crossover V neckline showing decolletage and wrap tie at left hip creating asymmetric hemline shorter on the left revealing more thigh. Thousands of tiny 3mm black sequins creating textured matte-sparkle surface that alternates between void-dark and brilliant flash with movement. Three-quarter fitted sleeves. Wrap sash trails at hip.',
    scene: 'Classic Vegas lounge: red Naugahyde booth with brass upholstery tacks, cocktail table candle in red glass creating warm intimate uplight, vintage Vegas posters in blur, dark patterned carpet, brass candelabra wall sconces with 2700K bulbs, retro Rat Pack energy.',
    fabric: 'BLACK SEQUIN PHYSICS: 3mm paillettes jet-black anodized aluminum R=0.25 at normal creating subdued dark-sparkle not disco-flash. Each sequin pivot-sewn allowing 15-degree tilt. Against black mesh base: at rest appears near-uniform dark, but micro-body-movements cause individual sequins to pivot past specular angles creating stochastic 10-25Hz twinkle frequency scattered across surface. Wrap crossover V: converging lines of sequins meeting at neckline creating directional sparkle density gradient. Candlelight 1800K: warm amber reflections only from sequins angled toward flame. Sash tie: gathered compression at left hip with radiating fan-fold wrinkles. Asymmetric hemline: diagonal sparkle termination line.',
    hosiery: 'HOSIERY: Black thigh-high stockings with plain thin elastic welt. 20-denier T=0.62 matte black. Dark sequin transitions seamlessly to dark stocking. Candle uplight catches nylon as warm amber specular on shin.',
  },
  {
    name: '11-rose-gold-strapless-micro',
    attire: 'She wears a rose gold micro-sequin strapless bandeau micro dress. Tiny 3mm sequins at extreme 70 per square centimeter density creating ultra-dense glitter surface. Strapless bandeau held by tension alone with sweetheart neckline. Dramatically short hemline barely providing coverage. Dense rose gold sparkle catches every ambient light source as full-body shimmer field.',
    scene: 'Vegas penthouse bar: panoramic curved floor-to-ceiling windows with Strip skyline as warm bokeh wall, glass bar with LED edge-light blue, white Carrara marble surfaces, champagne in crystal ice bucket, white orchid in crystal vase, ceiling art spotlight as dramatic overhead key.',
    fabric: 'MICRO-SEQUIN OPTICS: 3mm rose gold at extreme density 70/cm^2 (2.8x standard sequin density). Copper-gold alloy creating warm pink-shifted selective reflectance R=0.72 from copper absorption below 500nm. Lower individual mass means faster pivot response: 15-30Hz fine shimmer versus 8-15Hz for standard large sequins creating finer-grain sparkle texture. Strip skyline bokeh through windows: thousands of warm point-source reflections scattered across dense sequin field. Strapless tension: bust zone taut flat creating uniform aligned sequin orientation, below waist relaxed with random-angle chaotic sparkle distribution. Sweetheart curve: convex reflector geometry at neckline edge.',
    hosiery: 'HOSIERY: Nude rose-tinted thigh-high stockings with thin rose gold thread lace welt. 10-denier T=0.87 barely-there warm rose tint. Strip skyline bokeh catches tinted ultra-sheer nylon as gentle warm ambient glow.',
  },
  {
    name: '12-crimson-vinyl-wrap',
    attire: 'She wears a deep crimson high-shine PVC vinyl wrap mini dress with crossover V showing decolletage, wrap tie at left hip creating asymmetric draped hemline shorter on left side. The vinyl mirror-reflects every light source as brilliant crimson-white specular streaks following body curves. Wrap tie opens at hip revealing additional thigh. Three-quarter pushed sleeves. Bold crimson vinyl is unapologetically Vegas.',
    scene: 'Classic vintage Vegas lounge: red Naugahyde booth brass tacks, cocktail table candle in red glass warm uplight, vintage Vegas posters in background blur, dark carpet, brass candelabra wall sconces 2700K warm bulbs, retro energy.',
    fabric: 'VINYL WRAP PHYSICS: PVC calendered n=1.54 Ra<0.05 microns near optical polish finish. Fresnel reflectance R_0=4.6% rising via Schlick approximation to near-total at grazing hip curves. Crimson pigment: selective absorption 430-580nm with 600-700nm red transmission through 0.4mm translucent PVC following Beer-Lambert attenuation I=I0*exp(-mu_a*x) with deeper penetration producing richer saturated red. Wrap construction: radial compression fan-fold from tie knot at hip with tension radiating outward. Asymmetric hemline: shorter left side reveals more thigh. Cross-over V: converging specular lines meeting at neckline. Candle warm uplight: vinyl surface reflects both specular highlight and volumetric red glow from PVC translucency.',
    hosiery: 'HOSIERY: Black thigh-high stockings with thin red ribbon at welt accent. 15-denier T=0.76 semi-sheer matte black body. Red ribbon bridges crimson vinyl to dark leg. Candlelight uplight catches ribbon as bright specular red accent.',
  },
  {
    name: '13-white-leather-corset-open-back',
    attire: 'She wears a bone-white genuine leather structured corset micro dress with sweetheart bustline pushing up dramatically, 14 visible steel boning channels cinching waist, and completely open lace-up back through chrome grommets with white leather cord criss-crossing. Extremely short hemline. The corset creates exaggerated waist-to-hip silhouette. White leather catches every colored bar light as chromatic projection.',
    scene: 'Sleek Vegas rooftop bar: Strip skyline warm bokeh through glass railing, overhead heat lamp orange glow, desert wind in hair, concrete planters modern succulents, dark contemporary furniture, sparklers at far table creating bright starburst, cool desert night haze.',
    fabric: 'WHITE LEATHER CORSET: Full-grain cowhide 1.2mm chrome-tanned semi-gloss surface finish. White R=0.82 high Lambertian diffuse reflectance: acts as projection screen showing tungsten amber + LED blue + neon pink simultaneously on different surface zones as visible colored light map. 14 steel bones create vertical panel geometry with hard specular-to-shadow transition at each bone ridge. Corset waist compression creates smooth conical waist profile with tensioned leather between bone channels showing concave cylindrical focusing surfaces. Chrome grommets R=0.68 polished 304 stainless as bright circular specular points constellation along spine. Leather cord lace tension: radiating V-wrinkle pattern from each grommet creating fan-fold texture. Heat lamp: orange glow from above creates warm gradient top to bottom.',
    hosiery: 'HOSIERY: White thigh-high stockings with clean satin welt matching white leather. 15-denier T=0.76 white semi-sheer. Continuous white monochrome line. Mixed rooftop lighting creates multicolor projections on white nylon surface.',
  },
  {
    name: '14-gold-chainmail-cowl',
    attire: 'She wears a gold-plated metal chainmail cowl-neck mini dress of thousands of tiny interlocking 2mm rings. The cowl neckline drapes low under its own heavy metal weight creating draped front. Completely bare back with thin chain straps at shoulders. Ultra-short hemline with clean chain edge. The chainmail flows like liquid gold metal fabric catching every light.',
    scene: 'Vegas VIP rock lounge: vintage Marshall amps as decor backdrop, band flyers thick on posts, pool table green glow in background, PBR neon sign, scratched hardwood floor, cage pendants with bare filament bulbs, raw dive energy.',
    fabric: 'CHAINMAIL PHYSICS: European 4-in-1 weave pattern gold-plated brass 2mm inner diameter 0.4mm wire gauge. Each toroidal ring independently reflects at unique angle creating fish-eye micro-environment image. Gold spectral Fresnel: R>0.82 above 550nm warm wavelengths, R<0.40 below 480nm cool absorption. Inter-ring cascading reflections: light bounces 2-4 times between inner ring surfaces creating multiply-reflected caustic chains that ripple through field with movement. Total mass approximately 2.8kg creating heavy distinctive drape with swing momentum and momentum-persistence oscillation. Cowl weight concentration at lowest point maximizes natural drape depth. Bare back: gold straps create minimal V-frame against exposed skin.',
    hosiery: 'HOSIERY: Black thigh-high stockings with wide plain industrial welt band. 20-denier T=0.62 matte black body. Chain fringe at hemline drapes partially over welt creating mixed metal-on-nylon texture transition.',
  },
  {
    name: '15-sapphire-sequin-backless',
    attire: 'She wears a deep sapphire blue sequin halter mini dress with clean crew neckline in front and dramatically open bare back scooped to the very base of her spine. Halter ties behind neck. Thousands of 4mm sapphire-blue sequins with iridescent oil-slick interference coating creating dark prismatic deep-blue fire. Ultra-short hemline. Full bare back from nape to sacrum is the dramatic focal point.',
    scene: 'Moody Vegas speakeasy: hidden behind unmarked door, low vaulted brick ceiling, single blue neon word behind bar, top-shelf bourbon wall backlit amber, leather wingback chairs, brass rail footrest, bartender in vest, intimate exclusive.',
    fabric: 'SAPPHIRE SEQUIN OPTICS: 4mm paillettes with TiO2 thin-film interference coating 120nm over dark blue absorber base. Bragg condition 2*n*d*cos(theta)=m*lambda creates angle-dependent iridescent color: face-on deep sapphire blue, tilted through purple-violet-teal shifting continuously with observation angle. Against black mesh base: scattered constellation of chromatic color points against void. Random orientation distribution across body: stochastic prismatic sparkle at 8-20Hz from micro-body-movement. Blue neon: strongly enhances face-on blue sequins while tilted ones show purple contrast. Halter tension: radiating strain from neck point creating directional sequin alignment.',
    hosiery: 'HOSIERY: Black thigh-high stockings with thin sapphire-blue lace welt. 15-denier T=0.76 matte black. Blue neon catches lace as cool specular accent bridging dress to leg color.',
  },
  {
    name: '16-bronze-metallic-strapless',
    attire: 'She wears a bronze metallic jersey strapless bandeau micro dress with hammered dimple texture across entire surface. Completely strapless held by body tension. Hundreds of tiny concave dimple impressions each independently catch and focus light. Sweetheart bandeau neckline. Extremely short hemline. The metallic bronze catches warm tungsten as full-body warm glow.',
    scene: 'Industrial chic Vegas gastropub: exposed copper piping overhead, Edison ST64 bulbs cage pendants 2200K, live-edge walnut bar steel I-beam base, copper mugs, Cor-Ten steel panels orange patina, bourbon barrel stave feature wall, warm dark metal.',
    fabric: 'BRONZE HAMMERED PHYSICS: Micro-concavity dimple impressions r=2-5mm radius depth 0.3-0.8mm pressed into metallic knit jersey textile. Each dimple functions as concave spherical mirror focal length f=r/2 creating tiny inverted real images of Edison filaments as focused luminous spots. Aggregate surface modeled by Cook-Torrance microfacet BRDF roughness alpha=0.35 Beckmann normal distribution. Bronze copper-tin alloy spectral: reflectance rises from R=0.18 at 480nm blue through R=0.55 at 550nm green to R=0.87 at 700nm red creating characteristic warm bronze-gold. Strapless tension: horizontal bust compression creating taut uniform dimple-field at chest, relaxing to chaotic scatter at hemline. Sweetheart curve: double-convex geometry focusing light at neckline edge.',
    hosiery: 'HOSIERY: Bronze-shimmer thigh-high stockings with copper-metallic ornament lace welt. 15-denier T=0.76 with metallic microparticle shimmer extending bronze tone to legs. Edison 2200K extreme-warm creates pronounced specular bands on shin curve.',
  },
  {
    name: '17-midnight-satin-cowl-slip',
    attire: 'She wears a midnight navy liquid satin charmeuse slip micro dress with ultra-thin gold chain straps and dramatically low cowl back scooped all the way to the sacrum exposing her entire back. Front cowl drapes low showing decolletage. Silk clings following gravity in liquid catenary drape revealing every contour. Extremely short bias-cut hemline.',
    scene: 'Intimate Vegas piano bar: baby grand with open lid reflecting amber spot, navy LED accent at bar base, crystal tumblers on polished mahogany, brass sconces with amber glass shades, dark herringbone hardwood floor reflecting warm scene.',
    fabric: 'CHARMEUSE SLIP PHYSICS: 19-momme silk charmeuse 4/1 warp-float satin weave creating lustrous face with specular reflection half-width only 8 degrees. Midnight navy: broadband absorption with narrow 430-470nm deep blue transmission window. Birefringence delta_n=0.04 between ordinary and extraordinary silk fiber axes creating polarization-dependent shimmer on curved surfaces. Bias cut 45-degree grain creates maximum drape elasticity following body catenary curves y=a*cosh(x/a). Chain strap tension: V-gathering at each attachment point with catenary between supports. Cowl back: complex minimal-energy fold surfaces with continuously varying Gaussian curvature. Caustic light concentration in concave fold valleys where cylindrical mirror geometry focuses light into bright lines.',
    hosiery: 'HOSIERY: Black thigh-high stockings with thin midnight blue lace welt color-matched. 12-denier T=0.82 near-invisible navy tint. Navy LED base light catches navy nylon as cool specular highlight extending color downward.',
  },
  {
    name: '18-scarlet-velvet-wrap',
    attire: 'She wears a deep scarlet crushed velvet wrap mini dress with crossover V neckline showing decolletage, wrap tie at right hip. Crushed velvet creates living shimmer-dark pattern as light alternately catches and misses chaotically crushed pile fibers. Long fitted sleeves. Extremely short hemline with asymmetric wrap. Rich saturated scarlet red.',
    scene: 'Moody Vegas wine bar: floor-to-ceiling wine rack wall hundreds of bottles, single warm pendant over leather bar, decanted red wine in crystal, dark slate surfaces, exposed limestone wall, burgundy leather stools, intimate.',
    fabric: 'CRUSHED VELVET WRAP: Viscose rayon pile 2.5mm with chaotic crush-deformation creating complex 6D BTF (bidirectional texture function). Where hundreds of pile fibers simultaneously present aligned specular faces: brilliant shimmer streaks. Where fibers scatter into anti-aligned valley positions: matte dark absorption trapping 95% of light in pile depth. Scarlet dye: dual-band absorption 430-520nm blue-green + above 700nm near-IR with 600-680nm wine-red transmission. Wrap crossover V: converging crushed-velvet patterns meeting at neckline with complex fold interference. Pile direction changes at wrap fold: shimmer reversal from bright to dark at fold line. Wine in decanter: reflected warm red light projects onto velvet adding to red saturation.',
    hosiery: 'HOSIERY: Black thigh-high stockings with thin scarlet ribbon bow at outer welt. 15-denier T=0.76 matte black. Scarlet ribbon bridges velvet to dark leg. Warm pendant light catches ribbon as small red specular accent.',
  },
  {
    name: '19-silver-sequin-one-shoulder',
    attire: 'She wears a liquid silver sequin one-shoulder micro dress. Single wide strap over left shoulder leaving right shoulder arm and side completely bare. Thousands of 4mm silver sequins creating maximum mirror-reflective surface catching every light as scattered brilliant points. Extremely short hemline. The asymmetric one-shoulder cut exposes maximum skin on the bare right side.',
    scene: 'Buzzing Vegas hotel bar: marble check-in desk blurred background, crystal chandelier as bokeh overhead, dark leather club chairs, travelers with luggage, polished terrazzo floor reflections, brass elevator doors catching light, cosmopolitan energy.',
    fabric: 'SILVER SEQUIN PHYSICS: 4mm aluminum paillettes pivot-sewn on black mesh creating articulated mirror-surface. Silver R=0.88 broadband high reflectance across visible spectrum creating neutral brilliant flash. Each sequin pivots independently 15-degree range: body micro-movements generate 8-20Hz stochastic sparkle frequency distributed across surface. One-shoulder asymmetry: right side bare skin contrasts left side maximum-reflective silver. Chandelier overhead: thousands of reflected point sources scattered across sequin field creating star-field effect. Strap tension: diagonal strain from shoulder across chest creating directional sequin alignment gradient. Hemline edge: random-angle sequins create irregular sparkle termination.',
    hosiery: 'HOSIERY: Black thigh-high stockings with silver metallic thread welt band. 20-denier T=0.62 matte black body. Silver welt catches chandelier as bright reflected points echoing sequin sparkle above.',
  },
  {
    name: '20-forest-velvet-bare-back',
    attire: 'She wears a deep forest green velvet halter mini dress with modest crew neckline in front and entirely open bare back scooped to the lower spine. Halter ties behind neck. Deep green crushed velvet creates rich dark shimmer that shifts between emerald bright and forest dark as pile catches and misses light. Ultra-short hemline. The full bare back exposure is the statement.',
    scene: 'Sophisticated Vegas cocktail lounge: dark walnut panels brass accents, single amber spot overhead, leather banquette forest green, crystal old-fashioned glasses, aromatic bitters bottles on bar, classic cocktail energy, warm intimate.',
    fabric: 'GREEN VELVET PHYSICS: Viscose rayon pile 2.5mm with crush-deformation creating 6D BTF texture. Forest green dye: broadband absorption 600-700nm red with dual transmission window 520-555nm green + 440-470nm blue creating deep cool green. Aligned pile streaks: brilliant emerald shimmer where hundreds of fiber tips simultaneously catch specular light. Anti-aligned valleys: near-black absorption as light penetrates full pile depth and is absorbed. Halter construction: tension from neck creating V-strain with taut pile at chest transitioning to relaxed random crush below waist. Bare back: direct skin exposure modeled by tungsten key light with warm highlight along spine and scapulae.',
    hosiery: 'HOSIERY: Black thigh-high stockings with thin forest green ribbon welt accent. 20-denier T=0.62 matte black. Green ribbon bridges velvet to dark stocking. Amber spot catches ribbon as warm-tinged green specular accent.',
  },
  {
    name: '21-pearl-satin-corset',
    attire: 'She wears a pearl white satin structured corset mini dress with sweetheart bustline, 12 visible steel boning channels creating dramatic waist-cinching silhouette, and open lace-up back through silver grommets with pearl satin ribbon. Extremely short hemline. Pearl satin catches every colored light as chromatic projection. The corset architecture creates maximum structural drama.',
    scene: 'Luxe Vegas champagne bar: crystal chandelier thousands of faceted pendants, mirror ceiling doubling all lights, champagne in crystal coupe, white marble bar, silver service, rose gold fixtures, blush uplighting, celebration energy.',
    fabric: 'PEARL SATIN CORSET: 22-momme heavy duchess satin with pronounced warp-float lustrous face. Pearl white: R=0.85 with slight warm pink undertone from weave interference. 12 steel bones: vertical structural channels creating rigid panel geometry with hard specular-shadow transitions at each bone ridge. Corset waist compression: conical profile with tensioned satin between bones showing concave cylindrical surfaces that focus chandelier light into caustic lines along bone valleys. Silver grommets as bright circular specular points along spine. Ribbon lace tension: V-wrinkle fans from each grommet. Chandelier: thousands of crystal caustics projecting rainbow onto white satin surface in motion. Mirror ceiling: infinite recursive light multiplication.',
    hosiery: 'HOSIERY: White thigh-high stockings with pearl-shimmer satin welt. 12-denier T=0.82 ultra-sheer white with iridescent microparticle shimmer. Crystal chandelier caustics project onto white nylon. Continuous pearl-white line from corset to toe.',
  },
  {
    name: '22-black-vinyl-strapless',
    attire: 'She wears a jet black high-shine PVC vinyl strapless bandeau micro dress. Completely strapless held by extreme body tension. The black vinyl achieves near-mirror finish reflecting entire bar environment as dark distorted panoramic image wrapped around her body. Sweetheart bandeau neckline. Extremely short hemline. Black vinyl reflects colored neon as saturated streaks on dark mirror surface.',
    scene: 'Underground Vegas lounge: red neon cursive sign behind bar as dominant light, heavy haze catching narrow spot beams, raw concrete walls floor ceiling, industrial black pipe stools, bourbon on rocks single large cube, dark atmospheric.',
    fabric: 'BLACK VINYL PHYSICS: PVC calendered n=1.54 carbon-black pigmented near-zero base reflectance but Ra<0.05 microns surface polish. Fresnel surface reflectance R_0=4.6% at normal creating dark mirror: reflects environment as dim distorted image against near-black substrate. At grazing incidence via Schlick: reflectance rises dramatically creating bright rim-light reflections tracing body contours against dark field. Colored neon: reflected as saturated narrow bright streaks on dark mirror creating high-contrast graphic pattern. Red neon cursive: reflected text readable as reversed letters wrapped around torso curvature. Strapless tension: horizontal bust compression band. Carbon-black pigment absorbs 99% of transmitted light creating true void between surface reflections.',
    hosiery: 'HOSIERY: Black thigh-high stockings matte finish welt. 20-denier T=0.62 matte black. Mirror-vinyl-to-matte-nylon transition at hemline: reflective dark above, absorptive matte below. Red neon catches vinyl but not stockings creating sharp visual boundary.',
  },
  {
    name: '23-tangerine-stretch-backless',
    attire: 'She wears a vivid tangerine orange stretch bodycon halter micro dress with open bare back scooped to the lower spine. Halter ties behind neck. The bright tangerine pops dramatically against any dark bar environment. Body-gripping 4-way stretch maps every contour with zero fabric ease. Ultra-short hemline. Full bare back exposure from nape to lower spine.',
    scene: 'Colorful Vegas tiki bar: bamboo surfaces, tropical neon flamingo and palm signs, rum bottles amber backlit, carved tiki totems, rattan pendants warm glow, tropical flowers as garnish, festive energy, mixed warm-cool lighting.',
    fabric: 'STRETCH BODYCON PHYSICS: Polyester-elastane 85/15 4-way stretch jersey in vivid tangerine. Orange pigment: absorption below 510nm blue-green with broad 560-650nm orange transmission peak. Against dark bar: maximum perceived color saturation via simultaneous contrast. Body tension creates skin-contact adhesion mapping: visible navel contour, hip bones, rib cage texture through stretched fabric. Elastane memory: fabric attempts to return to smaller rest state creating constant body-compression with 15% strain. Halter tie: two tension lines from neck creating V-strain pattern across chest and back. Tropical neon signs: green-pink complementary light on orange creates complex color mixing across surface zones.',
    hosiery: 'HOSIERY: Nude thigh-high stockings with thin tangerine ribbon at welt. 10-denier T=0.87 barely-visible warm nude. Tangerine ribbon bridges vivid dress to bare-effect leg. Tiki warm lighting creates amber glow on ultra-sheer nylon.',
  },
  {
    name: '24-gunmetal-sequin-strapless',
    attire: 'She wears a gunmetal dark-silver sequin strapless bandeau micro dress. Completely strapless held by body tension. Thousands of 4mm pewter-dark sequins creating subdued moody dark-sparkle rather than disco flash. Sweetheart bandeau neckline. Ultra-short hemline. The dark gunmetal sequins create mysterious understated glitter that catches light as scattered subtle points.',
    scene: 'Dark moody Vegas speakeasy: unmarked entrance, low vaulted brick ceiling, single amber Edison pendant, top-shelf whiskey wall backlit, leather wingback chairs, brass rail, bartender pouring from height, secretive intimate.',
    fabric: 'GUNMETAL SEQUIN PHYSICS: 4mm paillettes gunmetal dark-silver anodized aluminum under tinted clear-coat R=0.55 subdued matte-metallic. Each pivot-sewn sequin reflects at reduced intensity: moody dark-sparkle aesthetic NOT bright disco flash. Against dark background: scattered constellation of dim warm reflections. Stochastic sparkle 8-15Hz from micro-body-movement. Strapless bust tension: taut flat uniform sequin alignment at chest, relaxing below waist to random-angle chaotic distribution. Edison pendant: single warm source creates one bright reflected point per angled sequin versus ambient dark for all others. Sweetheart curve: convex reflector focusing light at neckline edge creating bright arc.',
    hosiery: 'HOSIERY: Black thigh-high stockings plain elastic welt no-frills. 20-denier T=0.62 matte black. Dark sequin into dark stocking creates unified moody dark palette. Edison amber catches shin as warm specular highlight.',
  },
  {
    name: '25-magenta-satin-extreme-slit',
    attire: 'She wears a deep magenta liquid satin one-shoulder mini dress with extreme high slit on right side running from hemline all the way to upper hip. Single wide strap on left shoulder. The extreme slit opens dramatically with any movement revealing full length of right leg and hip. Ultra-short hemline on non-slit side. Magenta satin creates intense saturated color pop.',
    scene: 'Vegas art gallery bar: modern art on white walls dramatic spotlit, sleek minimalist, concrete floor, architectural pendant light sculptural, clean-line furniture, curated wine list, artistic sophisticated.',
    fabric: 'MAGENTA SATIN PHYSICS: 19-momme charmeuse 4/1 warp-float lustrous specular half-width 8 degrees. Magenta dye: dual-band absorption 510-580nm green window with red 620-700nm + blue 420-470nm transmission creating additive perceptual magenta. Under gallery spot: intense saturated color on white wall reflection. Bias-cut 45-degree grain along slit: maximum elastic drape opening with movement. Slit edge: bright specular line from hip to hem as leading visual line. Birefringence delta_n=0.04 shimmer. One-shoulder asymmetry: diagonal drape line across torso creating dynamic composition. Gallery spots: hard directional key with sharp shadow edges.',
    hosiery: 'HOSIERY: Nude thigh-high stockings with thin magenta thread welt. 10-denier T=0.87 barely-visible natural. Slit reveals full stocking length. Gallery spot catches ultra-sheer nylon as subtle warm skin-tone sheen.',
  },
  {
    name: '26-cobalt-bodycon-cutout',
    attire: 'She wears a deep cobalt blue stretch bodycon mini dress with bold geometric cutouts: large diamond shapes at both waist sides exposing hip skin, and triangular cutout between shoulder blades at back. Sleeveless. Cobalt blue pops intensely under bar lighting. Ultra-short hemline. Cutouts create geometric skin windows against vivid blue field.',
    scene: 'Modern Vegas rooftop pool bar: infinity pool edge blue underwater glow in background, cabana curtains blowing, Strip skyline warm bokeh distance, outdoor string lights overhead, concrete planters, cocktail with umbrella, warm evening.',
    fabric: 'COBALT BODYCON PHYSICS: Polyester-elastane jersey deep cobalt blue pigment. Cobalt: narrow 440-490nm blue transmission with broadband 500-700nm absorption creating deep saturated blue. 4-way stretch under body tension: skin-contact adhesion with visible contour mapping through compressed fabric. Cutout edges: clean overlocked finish creating sharp geometry. Diamond waist cutouts: warm skin visible against cool cobalt blue by color temperature contrast. Pool underwater glow: blue light enhances cobalt saturation via additive color matching. String lights: warm amber overhead creates blue-shadow/amber-highlight split across body zones.',
    hosiery: 'HOSIERY: Black thigh-high stockings with thin cobalt ribbon at welt. 15-denier T=0.76 matte black. Cobalt ribbon bridges vivid blue dress to dark leg. Pool blue glow catches nylon as cool specular highlight on shin.',
  },
  {
    name: '27-gold-sequin-bare-back',
    attire: 'She wears a bright gold sequin halter mini dress with clean neckline in front and dramatically open bare back scooped to the very base of the spine. Halter ties behind neck. Thousands of 5mm gold sequins catching warm light as maximum brilliance golden sparkle field. Ultra-short hemline. The full bare back from nape to sacrum against sparkling gold front creates maximum contrast.',
    scene: 'Grand Vegas casino bar: slot machine LED color-bleed through doorway as multicolor ambient flicker, dark granite bartop, brass dome pendant dramatic overhead key, patrons blurred far end, cocktail napkin under drink, casino energy electric.',
    fabric: 'GOLD SEQUIN OPTICS: 5mm gold-anodized aluminum paillettes pivot-sewn on black mesh base. Gold selective reflectance: R>0.80 above 550nm warm, R<0.40 below 480nm cool absorption. Large 5mm: 3-8Hz slow shimmer from body sway versus 8-20Hz for smaller sequins. Casino slot LED bleed: multicolor stochastic flicker reflects as constantly-shifting color palette across gold field. Halter tension: V-strain from neck creating aligned sequin orientation zone at chest. Bare back: warm tungsten key models spine contour with highlight-shadow rhythm along vertebral column. Sequin edge: bright rim-light catches as constellation of edge-reflected points.',
    hosiery: 'HOSIERY: Black thigh-high stockings with gold-thread lace ornament welt. 20-denier T=0.62 matte black. Gold lace catches casino ambient as scattered warm specular dots. Gold sparkle above to matte dark below at hemline transition.',
  },
  {
    name: '28-burgundy-velvet-corset',
    attire: 'She wears a deep burgundy crushed velvet structured corset mini dress with sweetheart bustline, 12 steel boning channels cinching waist, and open lace-up back through brass grommets with burgundy velvet ribbon. Crushed velvet creates living shimmer-dark texture. Extremely short hemline. The combination of structured corset architecture with organic crushed velvet texture.',
    scene: 'Old-world Vegas cigar lounge: dark mahogany paneling, green-shade brass banker lamps, leather Chesterfield sofas, cigar humidor glass-front, brandy snifters, oriental rug, wood ceiling coffered, warm amber exclusive.',
    fabric: 'BURGUNDY CRUSHED VELVET CORSET: Viscose rayon pile 2.5mm chaotic crush creating 6D BTF. Burgundy dye: absorption 430-560nm blue-green with 600-680nm deep wine-red transmission. Aligned streaks: hundreds of pile fibers simultaneously present specular faces as brilliant wine shimmer. Anti-aligned valleys: deep matte absorption trapping 95% of incident light. Corset structure: 12 steel bones impose vertical geometry on chaotic velvet pile creating ordered shimmer-bands between bone ridges with chaotic crush in between. Brass grommets: warm R=0.55 matching banker lamp amber. Lace-up tension: velvet ribbon creates radial gathering at each grommet. Sweetheart neckline: double-curve convex with pile direction change creating shimmer reversal at bustline.',
    hosiery: 'HOSIERY: Black thigh-high stockings with thin burgundy ribbon bow at outer welt. 20-denier T=0.62 matte black. Burgundy ribbon bridges wine velvet to dark leg. Banker lamp warm amber catches ribbon as specular wine-red accent.',
  },
  {
    name: '29-lilac-metallic-strapless',
    attire: 'She wears a lilac purple metallic lamé strapless bandeau micro dress with iridescent color-shift finish that transitions between lilac and silver depending on viewing angle. Completely strapless held by tension. Sweetheart bandeau neckline. Extremely short hemline. The iridescent metallic surface creates ethereal color-shifting effect as she moves.',
    scene: 'Trendy Vegas cocktail bar: lavender LED ambient throughout, geometric pendant lights brass, white quartz bar surface, craft cocktail with edible flower garnish, botanical wall living plants, modern aesthetic.',
    fabric: 'IRIDESCENT METALLIC PHYSICS: Aluminum vapor-deposited metallic lamé with multilayer thin-film interference coating creating angle-dependent color shift. At normal incidence: lilac purple from constructive interference at 420nm + 650nm. As viewing angle increases: thin-film path length changes via 2*n*d*cos(theta)=m*lambda shifting through silver at 45 degrees to pink at grazing. Lavender LED ambient: enhances purple face-on while silver at angles creates cool contrast. Strapless tension: horizontal compression at bust. Metallic warp threads: directional specular aligned with body long axis. The continuously shifting color creates movement-dependent chromatic animation across surface. Sweetheart curve: color transitions concentrate at neckline convexity where viewing angle changes rapidly.',
    hosiery: 'HOSIERY: Nude lilac-tinted thigh-high stockings with iridescent metallic thread welt. 10-denier T=0.87 barely-there lilac tint. Lavender ambient catches tinted nylon as gentle purple glow extending palette to legs.',
  },
  {
    name: '30-black-satin-extreme-slit',
    attire: 'She wears a jet black liquid satin one-shoulder mini dress with extreme high slit on left side running from hemline to upper hip. Single strap on right shoulder. Black satin catches every light as brilliant directional specular while remaining dark in shadow zones. Extreme slit opens with movement revealing full leg length. Ultra-short hemline on non-slit side.',
    scene: 'Dramatic Vegas steak restaurant bar: dark wood everywhere, single overhead pin spot as dramatic key, red wine in large Bordeaux glass, white tablecloths distant dining room glow, sommelier blurred background, serious upscale.',
    fabric: 'BLACK SATIN PHYSICS: 19-momme charmeuse 4/1 warp-float lustrous face specular half-width 8 degrees. Jet black dye: broadband absorption but lustrous weave creates dual nature - dark matte in shadow zones with brilliant white specular streaks at light-catching angles. The contrast between deep black and bright specular creates maximum dynamic range across a single surface. Bias-cut at 45-degree grain along slit: maximum elastic drape with movement. Slit edge: bright specular line from hip to hem. One-shoulder asymmetry: diagonal drape across torso. Pin spot overhead: single hard key creates stark high-contrast lighting with sharp shadow edges and bright specular on curved surfaces. Birefringence shimmer in polarized light zones.',
    hosiery: 'HOSIERY: Black thigh-high stockings with satin welt matching dress finish. 15-denier T=0.76 semi-sheer matte black. Slit reveals full stocking. Pin spot catches satin welt as single bright specular line matching dress specular language.',
  },
];

async function generateEdit(concept, inputImage, index) {
  const prompt = buildPrompt(concept.attire, concept.scene, concept.fabric, concept.hosiery);
  const wordCount = prompt.split(/\s+/).length;

  console.log(`\n${'='.repeat(60)}`);
  console.log(`[${index + 1}/30] ${concept.name}`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Prompt: ${wordCount} words`);

  const imageBuffer = await fs.readFile(inputImage);
  const base64Image = imageBuffer.toString('base64');
  const ext = path.extname(inputImage).toLowerCase();
  const mimeType = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : ext === '.webp' ? 'image/webp' : 'image/png';

  const requestBody = {
    contents: [{ parts: [
      { text: prompt },
      { inline_data: { mime_type: mimeType, data: base64Image } },
    ]}],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
      imageConfig: { aspectRatio: '2:3', imageSize: '4K' },
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
      console.log('Rate limited - waiting 70s...');
      await new Promise(r => setTimeout(r, 70000));
      return generateEdit(concept, inputImage, index);
    }
    throw new Error(`API ${response.status}: ${error.substring(0, 300)}`);
  }

  const data = await response.json();
  if (data.candidates?.[0]?.content?.parts) {
    for (const part of data.candidates[0].content.parts) {
      if (part.text) console.log(`Model: ${part.text.substring(0, 100)}...`);
      if (part.inlineData?.data) {
        const img = Buffer.from(part.inlineData.data, 'base64');
        const fp = path.join(OUTPUT_DIR, `${concept.name}.png`);
        await fs.writeFile(fp, img);
        console.log(`SAVED: ${fp} (${(img.length / 1024 / 1024).toFixed(2)} MB)`);
        return fp;
      }
    }
  }
  console.error('NO IMAGE generated');
  return null;
}

const s = parseInt(process.argv[3] || '0');
const e = parseInt(process.argv[4] || '30');
const results = [];

console.log(`\n=== VEGAS V7 ULTRA - 30 CONCEPTS, MAX PHYSICS 4K ===`);
console.log(`Range: ${s + 1}-${e} | Input: ${path.basename(INPUT_IMAGE)}`);
console.log(`Output: ${OUTPUT_DIR}\n`);

for (let i = s; i < Math.min(e, concepts.length); i++) {
  try {
    const fp = await generateEdit(concepts[i], INPUT_IMAGE, i);
    results.push({ name: concepts[i].name, path: fp, ok: !!fp });
  } catch (err) {
    console.error(`FAIL: ${concepts[i].name} - ${err.message}`);
    results.push({ name: concepts[i].name, path: null, ok: false, err: err.message });
  }
  if (i < Math.min(e, concepts.length) - 1) {
    console.log('Waiting 8s...');
    await new Promise(r => setTimeout(r, 8000));
  }
}

console.log(`\n${'='.repeat(60)}`);
console.log('V7 ULTRA RESULTS');
console.log(`${'='.repeat(60)}`);
const ok = results.filter(r => r.ok);
console.log(`Success: ${ok.length}/${results.length}`);
results.forEach(r => console.log(`  ${r.ok ? 'OK' : '!!'} ${r.name}${r.err ? ': ' + r.err : ''}`));
console.log(`\nOutput: ${OUTPUT_DIR}`);

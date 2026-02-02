#!/usr/bin/env node

/**
 * Vegas V6R - MORE REVEALING ATTIRE + FULL PHYSICS DENSITY
 * Target: 820-880w per prompt (validated sweet spot)
 * Physics: Camera 150w + Transport 180w + Skin 120w + Fabric 100w + Hosiery 50w + Imperfections 150w + Scene 80w
 * Attire: maximum reveal with filter-safe language
 * 4K output via Nano Banana Pro API key
 */

import fs from 'fs/promises';
import path from 'path';

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) { console.error('GEMINI_API_KEY not set'); process.exit(1); }

const MODEL = 'gemini-3-pro-image-preview';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
const OUTPUT_DIR = process.env.OUTPUT_DIR || path.join(process.env.HOME, 'nanobanana-output', 'vegas-v6r-reveal');
const INPUT_IMAGE = process.argv[2] || '/Users/louisherman/Documents/tinklesherpants_story_11_6_2023_7_52_33 AM3230137043820160280.jpeg';

await fs.mkdir(OUTPUT_DIR, { recursive: true });

function buildPrompt(attire, scene, fabricPhysics, hosieryPhysics) {
  return `Edit this photograph into an ultra-raw real-life Vegas cocktail bar photograph indistinguishable from an unretouched candid shot from a real night out. Raw documentary nightlife photography. ${attire}

SCENE: ${scene}

CAMERA SENSOR PHYSICS: Canon EOS R5 Mark II 45MP stacked BSI-CMOS full-frame 36x24mm active area. RF 50mm f/1.2L USM wide open at f/1.2 creating razor-thin 5cm depth-of-field plane at 2.2m subject distance. ISO 3200 for authentic high-ISO luminance noise following Poisson photon-counting sigma=sqrt(N_photons) in shadow regions with SNR=28dB at midtones and chroma noise as red-blue channel decorrelation in underexposed zones. Shutter 1/125s allowing slight motion blur on gesturing hands. 759-point phase-detect AF locked on nearest iris with gentle focus roll-off on far shoulder. 15-blade aperture producing creamy oval bokeh discs with onion-ring concentric artifact from aspherical element. Barrel distortion 0.8% at close focus. Chromatic aberration 0.3px purple fringing on max-contrast transitions at frame edges. White balance tungsten 3200K but mixed lighting creates unresolved color casts across zones. Available light only - no flash - crushed blacks where signal falls below noise floor.

3D GLOBAL ILLUMINATION LIGHT TRANSPORT: Primary overhead recessed tungsten halogen track spots at 2800K creating hard directional pools with sharp shadow edges - NOT diffused fashion lighting. Secondary practical neon bar signage casting saturated colored spill with hard color boundaries following inverse-square I=Phi/(4*pi*r^2). Tertiary weak distant ceiling fluorescent at 3-stop underexposure as faint cool fill. Steep 4-stop luminance gradient from bar to dark booths. NO fill - deep unrecoverable shadows on shadow-side of face at 5+ stops below key creating true black zero detail. Mixed temperature: 2800K tungsten warm skin vs 4100K fluorescent blue-green background contamination. Multi-bounce warm interreflection from mahogany bar adds 300K to shadow fill. Beer glass caustic projection on bar from overhead spot refraction through curved glass.

SKIN BIO-OPTICAL RENDERING: Monte Carlo subsurface scattering through 3-layer epidermis-dermis-hypodermis model. Melanin absorption mu_a=6.6*C_mel*(lambda/500)^(-3.33) with C_mel varying 0.01-0.05 across body. Oxygenated HbO2 peaks 542nm 576nm as warm flush at cheeks earlobes decolletage knuckles. Deoxygenated Hb blue-purple at temples inner wrists. Hypodermis forward scatter g=0.85 creating translucent backlit glow at ear helices nostril edges. Real unretouched skin: visible pores at nasal ala and cheeks, expression lines, authentic complexion zero smoothing. Sebaceous oil T-zone sheen catching hard tungsten as irregular specular patches. Vellus hair on forearms jawline catching rim light. Perspiration moisture on upper lip temples from warm bar as micro-specular. Preserve face bone structure eye color expression exactly.

${fabricPhysics}

${hosieryPhysics}

RAW IMPERFECTIONS: ISO 3200 grain across entire image especially shadows. Motion blur on fingertips from gesture at 1/125s. Flyaway hair catching backlight at different focal plane as soft bright streak. Background blown bokeh with colored neon shapes. Foreground cocktail glass edge as out-of-focus refraction blur. Faint lens flare from brightest neon as veiling glare. Crumpled bar napkin. Condensation ring from glass. Another patron's elbow at extreme frame edge. No retouching no smoothing no grading - straight out of camera RAW with white balance only. Preserve face expression bone structure all features identical to original.`;
}

const concepts = [
  {
    name: '01-liquid-silver-micro',
    attire: 'She wears a liquid silver chrome metallic micro mini dress with spaghetti straps barely reaching the very top of her thighs. Chrome fabric vacuum-seals to every curve with zero gap reflecting the entire bar as warped funhouse-mirror distortion. Deep plunging scoop neckline revealing full decolletage to mid-sternum. Mirror-chrome surface reflects every light as brilliant elongated streaks following body curvature. Aggressively minimal coverage.',
    scene: 'Gritty real Vegas strip bar 1am: scratched dark bar top with ring stains, half-empty rocks glass with melting ice, neon beer sign casting amber-red spill, cracked vinyl stools, bartender blurred reaching top shelf, tip jar with crumpled bills, warm tungsten spots with dust in beam.',
    fabric: 'CHROME PHYSICS: Vacuum-metallized aluminum 80nm on silk creating Fresnel R=0.96 at grazing. Surface Ra=0.12 microns near-mirror coherent reflection. Concave body folds create convergent caustic I_caustic=I_source*(r/2d) onto adjacent skin and bar. Convex curves create virtual divergent reflected image with barrel-distortion following Gaussian curvature K=k1*k2. Bias-cut seam paths create directional shimmer from anisotropic micro-fiber alignment. One-piece construction means continuous reflection map across entire body with no seam discontinuity.',
    hosiery: 'HOSIERY: Black thigh-high stockings with thin chrome-metallic welt. 20-denier T=0.62 matte black. Maximum contrast: flat matte absorber below, total mirror reflector above at hemline boundary.',
  },
  {
    name: '02-scarlet-velvet-deepv',
    attire: 'She wears a deep scarlet crushed velvet bodycon mini dress with dramatically deep plunging V-neckline extending well below the sternum nearly to the navel secured only by a tiny crystal clasp at the lowest point. Long fitted sleeves. Crushed velvet creates living shimmer-dark pattern across every curve. Hemline barely at upper thigh. The deep V exposes maximum decolletage and sternum.',
    scene: 'Dark underground Vegas jazz lounge: upright bass on stage in blur, warm amber spot, worn leather bar with decades of patina, dirty martini, signed jazz photos on brick, Edison bulbs on cloth cord, smoky haze.',
    fabric: 'CRUSHED VELVET PHYSICS: Viscose rayon pile 2.5mm chaotic crush creating 6D BTF. Aligned streaks: hundreds of pile fibers simultaneously present specular faces as bright shimmer. Anti-aligned valleys: scatter away trapping 95% in pile depth as matte absorption. Scarlet dye: dual absorption 430-520nm + above 700nm with 600-680nm wine-red transmission. Deep V: converging fold lines meeting at crystal clasp with complex interference pattern. Crystal clasp: 4mm Swarovski with n=1.73 decomposing tungsten light into spectral rainbow micro-caustics on surrounding velvet.',
    hosiery: 'HOSIERY: Black thigh-high stockings with simple thin welt. 15-denier T=0.76 matte black. Crushed shimmer above vs smooth matte below creates texture contrast.',
  },
  {
    name: '03-gold-chainmail-deep-cowl',
    attire: 'She wears a gold-plated metal chainmail deep cowl-neck mini dress of thousands of tiny 2mm interlocking rings. The cowl neckline drapes extremely deep under its own metal weight creating plunging draped front exposing skin from neck to below sternum. Completely bare back to the sacrum with thin chain straps at shoulders. Ultra-short hemline with loose chain fringe. Chain gaps reveal skin beneath as the mesh shifts and swings.',
    scene: 'Vegas VIP rock lounge: Marshall amps as decor, band flyers thick on posts, pool table green glow background, PBR neon, scratched wood floor, cage pendants with bare filament bulbs, rough dive energy.',
    fabric: 'CHAINMAIL PHYSICS: European 4-in-1 weave gold-plated brass 2mm inner diameter 0.4mm wire. Each toroidal ring reflects unique fish-eye direction. Gold spectral Fresnel: R>0.82 above 550nm warm, R<0.40 below 480nm. Inter-ring cascading: light bounces 2-4 times between inner surfaces creating multiply-reflected caustic chains rippling with movement. 35% open aperture revealing skin. Total mass ~2.8kg creating heavy distinctive drape with swing momentum and audible tinkling. Cowl weight concentrates at lowest point maximizing drape depth.',
    hosiery: 'HOSIERY: Black thigh-high stockings wide plain industrial welt. 20-denier T=0.62 matte black. Chain fringe drapes over welt creating mixed metal-on-nylon.',
  },
  {
    name: '04-black-iridescent-sequin-backless',
    attire: 'She wears a jet black iridescent sequin halter mini dress with high halter neckline in front and completely bare open back scooped to the very base of the spine showing her entire back. Thousands of 5mm sequins with oil-slick rainbow interference coating creating dark prismatic fire. Halter tie behind neck. Ultra-short hemline. The backless cut is the most dramatic element - full back exposure from nape to sacrum.',
    scene: 'Real Vegas casino bar: slot LED bleed through doorway as multicolor flicker, dark granite bartop, half-eaten appetizer, crumpled cash, brass dome pendant, patrons blurred far end, casino energy.',
    fabric: 'SEQUIN OPTICS: 5mm paillettes pivot-sewn on black base. Oil-slick thin-film: 120nm TiO2 (n=2.4) over dark absorber. Bragg 2*n*d*cos(theta)=m*lambda creates angle-dependent color: face-on dark faint green, tilted blue-violet-magenta shifting continuously. Against black base: scattered constellation of color against void. Random orientation: stochastic sparkle 8-20Hz from body movement. Halter tension radiates gathering at nape point.',
    hosiery: 'HOSIERY: Black thigh-high stockings thin iridescent welt echoing oil-slick rainbow. 15-denier T=0.76 matte black. Casino multicolor makes welt shift through prismatic spectrum.',
  },
  {
    name: '05-white-corset-micro',
    attire: 'She wears a bone-white genuine leather structured corset micro dress with sweetheart bustline pushing up dramatically, 14 visible steel boning channels cinching the waist to dramatic ratio, and criss-cross white leather lace-up at completely open back through chrome grommets. Extremely short hemline barely providing any coverage. The corset creates exaggerated waist-to-hip silhouette. White leather catches every colored bar light.',
    scene: 'Sleek Vegas rooftop bar: Strip skyline warm bokeh through glass railing, heat lamp orange glow, wind in hair, concrete planters, modern dark furniture, sparklers at far table as bright starburst, cool desert haze.',
    fabric: 'WHITE LEATHER PHYSICS: Full-grain cowhide 1.2mm chrome-tanned semi-gloss. White R=0.82 Lambertian projection screen showing tungsten amber + LED blue + neon simultaneously on different zones. 14 steel bones create vertical panel geometry with hard specular-shadow transition at each bone edge. Corset compression maximum at waist creating smooth conical profile. Chrome grommets R=0.68 as bright circular specular points along spine. Lace cord tension creates radiating V-wrinkles from each grommet.',
    hosiery: 'HOSIERY: White thigh-high stockings clean welt matching leather. 15-denier T=0.76 white. Continuous white line. Mixed rooftop lighting creates multicolor projection on white nylon.',
  },
  {
    name: '06-emerald-satin-bare-back',
    attire: 'She wears an emerald green liquid satin charmeuse mini dress with delicate gold chain straps and cowl neckline draping low at the front, with entirely bare open back scooped to the lower spine. The silk satin clings following gravity in catenary folds mapping every contour. Extremely short bias-cut hemline barely at upper thigh. Maximum skin at both low front cowl and entire bare back.',
    scene: 'Upscale Vegas cocktail bar: dark walnut bar brass rail, crystal rocks glasses amber spirits, cigar box on bar, single brass spot dramatic key, art deco mirror oxidized patina, leather banquette, absinthe fountain.',
    fabric: 'CHARMEUSE PHYSICS: 19-momme silk 4/1 warp-float lustrous with specular half-width 8 degrees. Birefringence delta_n=0.04 splits polarized light creating doubled highlight. Gravity catenary y=a*cosh(x/a) a=11cm between strap supports. Cowl fold topology: Gaussian curvature K varies positive domes through zero cylindrical ridges to negative saddle transitions. Caustic concentration in concave valleys where cylindrical mirror focuses light. Emerald: absorbs 600-700nm, transmits 520-555nm. Chain straps create V-gathering at each attachment.',
    hosiery: 'HOSIERY: Black thigh-high stockings thin emerald ribbon bow at outer welt. 15-denier T=0.76 matte black. Green ribbon bridges emerald dress to dark legs. Brass spot creates warm specular on shin.',
  },
  {
    name: '07-hot-pink-vinyl-bandeau',
    attire: 'She wears a hot pink high-shine PVC vinyl strapless bandeau ultra-micro dress. Completely strapless held only by extreme body-gripping tension. The vinyl achieves near-mirror reflectivity catching every bar light as brilliant magenta-white specular streaks tracing each curve. Zero ease vacuum-tight. Sweetheart bandeau neckline. Extremely short hemline. The pink is aggressively saturated screaming Vegas.',
    scene: 'High-energy Vegas strip bar: LED wall cycling blue-purple background, bass speaker resonance, knee-level fog catching uplight, vodka bottles on bar, raw concrete industrial, UV accents, sensory overload nightlife.',
    fabric: 'VINYL PHYSICS: PVC calendered n=1.54 Ra<0.05 microns near optical polish. Fresnel R_0=4.6% rising via Schlick R(theta)=R_0+(1-R_0)*(1-cos(theta))^5 to near-total at grazing on hip and thigh. Hot pink: absorption 490-560nm with 610-650nm + 420-470nm transmission creating additive red+violet. Under blue-purple LED: shifts toward magenta as blue adds to violet. Specular highlights achromatic white streaks along maximum curvature. Strapless tension creates horizontal compression band with radiating strain below.',
    hosiery: 'HOSIERY: Black thigh-high stockings hot pink ribbon through welt. 15-denier T=0.76 matte black contrasting mirror-sheen vinyl. Pink ribbon color bridge.',
  },
  {
    name: '08-gunmetal-sequin-sideless',
    attire: 'She wears a gunmetal dark-silver sequin bodycon mini dress with deep V-neck plunging to below sternum and dramatically wide-cut armholes that expose the sides of her torso from underarm to hip on both sides. Thousands of 4mm pewter sequins. Sleeveless. Ultra-short hemline. The wide armhole cuts create maximum lateral skin exposure - front and back panels connected only by thin straps at shoulders.',
    scene: 'Packed real Vegas Saturday night: crowd blur many figures, phone-flash burst background, drinks lined up, bartender reaching glassware, sticky surface lime wedge, straw wrapper, peak chaos, warm amber wash.',
    fabric: 'SEQUIN PHYSICS: 4mm paillettes gunmetal dark-silver aluminum under tinted clear-coat R=0.55 subdued. Each reflects at reduced intensity: moody dark-sparkle not disco flash. Deep V: converging sparkle density gradient toward lowest point. Wide armholes: where arm moves, side-body fully exposed between narrow front and back panels. Stochastic sparkle 8-15Hz from micro-movement.',
    hosiery: 'HOSIERY: Black thigh-high stockings plain elastic welt tough no-frills. 20-denier T=0.62 matte black. Dark sequin into dark stockings: unified tough palette.',
  },
  {
    name: '09-copper-hammered-asymmetric',
    attire: 'She wears a hammered copper-bronze metallic jersey asymmetric one-shoulder micro dress. Single strap over right shoulder leaving entire left shoulder arm and side completely bare. Hundreds of tiny concave dimple-mirrors each catch light independently. Draped at right hip with sculptural fold cascade. Extremely short hemline. The asymmetry maximizes skin exposure on the bare side.',
    scene: 'Industrial Vegas bar: exposed copper piping raw concrete ceiling, Edison ST64 bulbs black cage pendants 2200K, live-edge walnut on steel I-beams, copper Moscow mule mugs, Cor-Ten steel panels orange patina, whiskey barrel wall.',
    fabric: 'HAMMERED PHYSICS: Micro-concavity dimple r=2-5mm depth 0.3-0.8mm. Each dimple as concave spherical mirror f=r/2 creating inverted micro-images of Edison bulbs as focused spots. Cook-Torrance microfacet BRDF alpha=0.35 Beckmann distribution D(m)=(1/(pi*alpha^2*cos^4(theta_m)))*exp(-tan^2(theta_m)/alpha^2). Copper spectral: rises above 550nm from R=0.18 blue-absorbed to R=0.87 at 700nm creating warm bronze. Grecian drape cascade: alternating light-shadow with each fold at different effective curvature.',
    hosiery: 'HOSIERY: Bronze-shimmer thigh-high stockings copper-metallic lace welt. 15-denier T=0.76 metallic microparticle shimmer extending bronze. Edison warm creates specular bands on shin.',
  },
  {
    name: '10-black-velvet-extreme-cutout',
    attire: 'She wears a black velvet bodycon mini dress with extreme geometric cutouts: large diamond shapes at both waist sides exposing hips, rectangular cutout at center chest, angular cutout at lower back, and triangular cutout between shoulder blades. Long sleeves. High neckline. Velvet absorbs 95% of light as deep void while cutouts expose warm lit skin as bright windows against darkness. Very short hemline. Maximum cutout skin exposure.',
    scene: 'Dark atmospheric Vegas underground: matte black walls ceiling, single red neon cursive sign as primary light, heavy haze catching spotlight beams as cones, raw concrete, industrial metal stools, cinematic minimal lighting.',
    fabric: 'BLACK VELVET PHYSICS: Rayon pile 2.5mm aligned maximum absorption. Pile depth traps 95% visible light through multiple inter-fiber scatter - photons bounce between fibers until absorbed. Near-perfect blackbody darker than any textile. Against this ultra-dark field: cutout windows of skin appear dramatically bright by contrast. Red neon reaches skin through cutouts but is absorbed by surrounding velvet creating pure red-on-black. The material contrast IS the visual impact.',
    hosiery: 'HOSIERY: Black thigh-high stockings matte welt. 20-denier T=0.62 matte black extending all-black silhouette. Only skin cutouts provide brightness.',
  },
  {
    name: '11-rose-gold-micro-sequin-strapless',
    attire: 'She wears a rose gold micro-sequin strapless bandeau micro dress. Tiny 3mm sequins at extreme 70/cm^2 density creating ultra-dense glitter surface. Strapless bandeau held by tension alone. Plunging sweetheart neckline. Dramatically short hemline barely providing coverage. Dense rose gold sparkle catches every ambient light as full-body shimmer field. Minimal fabric maximum sparkle.',
    scene: 'Vegas penthouse bar: panoramic curved windows Strip skyline as warm bokeh wall, glass bar LED edge light, white marble, champagne crystal bucket, orchid crystal vase, ceiling art spotlight dramatic key.',
    fabric: 'MICRO-SEQUIN OPTICS: 3mm rose gold at 70/cm^2 (2.8x standard). Copper-gold alloy warm pink-shifted R=0.72 from copper absorption below 500nm. Lower mass = faster pivot: 15-30Hz fine shimmer vs 8-15Hz large sequins. Strip bokeh through windows: thousands of warm point reflections in dense field. Strapless tension: bust zone taut flat uniform, below relaxed random-angle chaotic sparkle.',
    hosiery: 'HOSIERY: Nude rose-tinted thigh-high stockings thin rose gold thread lace welt. 10-denier T=0.87 barely-there warm rose. Strip bokeh catches tinted nylon as gentle warm glow.',
  },
  {
    name: '12-midnight-satin-cowl-slip',
    attire: 'She wears a midnight navy liquid satin charmeuse slip micro dress with ultra-thin gold chain straps and dramatically low cowl back scooped to the sacrum exposing her entire back. Front cowl drapes low showing decolletage. Silk clings following gravity revealing contours through liquid drape. Extremely short bias-cut hemline. Maximum skin at both low cowl front and extremely low bare back.',
    scene: 'Intimate Vegas piano bar: baby grand open lid reflecting spot, navy LED accent bar base, crystal tumblers polished mahogany, brass sconces amber glass, dark herringbone glossy floor reflecting scene.',
    fabric: 'SATIN PHYSICS: 19-momme charmeuse 4/1 warp-float lustrous specular half-width 8 degrees. Midnight navy: broadband absorption narrow 430-470nm deep blue transmission. Birefringence delta_n=0.04 polarization shimmer. Bias 45-degree grain creates maximum drape elasticity. Chain strap tension: V-gathering at each point with catenary between. Cowl topology: complex minimal-energy fold surfaces varying Gaussian curvature. Caustic concentration in concave valleys.',
    hosiery: 'HOSIERY: Black thigh-high stockings thin midnight blue lace welt color-matched. 12-denier T=0.82 navy tint. Blue LED catches navy nylon as cool specular highlight.',
  },
  {
    name: '13-silver-chain-fringe-halter',
    attire: 'She wears a silver chain-fringe halter mini consisting of a structured silver bandeau top with halter strap behind neck and thousands of 8-inch silver chain fringe strands hanging from the bandeau as the entire skirt portion. Completely bare back and shoulders. The chain fringe IS the coverage below the bust - swinging chains with visible gaps between strands. Every movement creates cascading metallic wave with audible clinking.',
    scene: 'Vegas nightclub VIP: LED wall cycling colors behind velvet rope, sparkler in magnum, dark cave-like space, colored moving-head wash overlap, dense haze catching beams, exclusive energy.',
    fabric: 'CHAIN FRINGE PHYSICS: Independent pendulums T=2*pi*sqrt(L/g)~0.5s for 20cm. Body excites collective oscillation: propagating wave 2-3Hz. Each 1mm link silver R=0.88. Thousands swinging at changing angles: 15-30Hz stochastic flicker. Inter-strand collisions create chaotic perturbation. Bandeau as rigid anchor. Fringe density 8 strands/cm providing partial coverage with skin visible between swinging chains during movement.',
    hosiery: 'HOSIERY: Black thigh-high stockings silver metallic welt strip. 20-denier T=0.62 matte black base for silver fringe cascade.',
  },
  {
    name: '14-crimson-vinyl-wrap-plunge',
    attire: 'She wears a deep crimson high-shine PVC vinyl wrap mini dress with deep crossover V plunging to mid-torso showing maximum decolletage, wrap tie at left hip creating asymmetric draped hemline shorter on left. The vinyl mirror-reflects every light as crimson-white specular streaks. Wrap tie opens at hip revealing flash of inner thigh. Pushed three-quarter sleeves. Bold crimson vinyl is unapologetic.',
    scene: 'Classic Vegas lounge: red Naugahyde booth brass tacks, cocktail table candle in red glass warm uplight, vintage Vegas posters blur, dark carpet, brass candelabra bulbs 2700K, retro energy.',
    fabric: 'VINYL PHYSICS: PVC n=1.54 Ra<0.05 near-polish. Fresnel R_0=4.6% rising Schlick to near-total at grazing. Crimson pigment: absorbs 430-580nm transmits 600-700nm through 0.4mm translucent PVC. Beer-Lambert I=I0*exp(-mu_a*x) deeper=richer red. Wrap tie: radial compression fan from knot. Asymmetric hem: shorter side reveals more thigh. Specular streaks along max curvature.',
    hosiery: 'HOSIERY: Black thigh-high stockings thin red ribbon at welt. 15-denier T=0.76 matte black. Ribbon bridges crimson vinyl. Candle uplight catches ribbon as specular accent.',
  },
  {
    name: '15-gold-lame-strapless-ultra',
    attire: 'She wears a liquid gold metallic lamé strapless bandeau ultra-micro dress barely reaching upper thigh. Completely strapless held by body tension. Gold lamé vacuum-conforms catching all light as brilliant warm fire. Sweetheart bandeau neckline creating maximum decolletage. Entire bar reflects in warped distortion across gold surface. The dress is aggressively minimal - maximum skin maximum impact.',
    scene: 'Old-school Vegas high-roller: gold-leaf coffered ceiling recessed halogens, champagne hammered silver bucket, antiqued mirror panels infinite reflections, warm amber spots, emerald velvet banquette, black lacquer bar gold leaf edge.',
    fabric: 'GOLD LAMÉ PHYSICS: Al vapor-deposited warp interlocked matte polyester weft. Gold-anodized selective: R>0.80 above 550nm warm, R<0.40 below 480nm cool. Each body point reflects unique environment via Gauss normal map as continuous anamorphic distorted room wrapped around torso. Specular from halogens: elongated streaks along max principal curvature. Antiqued mirrors: infinite recursive reflections multiplying gold sparkle. Strapless tension: horizontal compression at bust radiating strain downward.',
    hosiery: 'HOSIERY: Black thigh-high stockings gold-thread lace welt. 20-denier T=0.62 matte black. Matte-to-metallic contrast. Gold lace catches ambient as specular dots.',
  },
  {
    name: '16-electric-blue-cutout-sides',
    attire: 'She wears an electric blue stretch bodycon mini dress with bold side cutouts exposing skin from hip to underarm on both sides connected only by thin straps at ribs. Sleeveless high neckline. The electric blue fluoresces under UV bar lighting. Ultra-short hemline. Side cutouts create maximum lateral exposure - she is essentially wearing connected front and back panels only.',
    scene: 'Vegas EDM bar: DJ LED wall blue-purple, speaker bass resonance, knee-level fog colored uplight, energy drinks vodka on bar, concrete industrial, UV accents throughout.',
    fabric: 'BODYCON PHYSICS: Polyester-elastane jersey fluorescent brightener. Electric blue: narrow 450-490nm transmission with UV component absorbing 365nm re-emitting 470nm Stokes phi=0.45. Under UV: radiates brighter than reflection creating glow. 4-way stretch under body tension: skin-contact adhesion. Side straps under tension: localized strain 20% increased specular. Cutout edges overlocked clean.',
    hosiery: 'HOSIERY: Black thigh-high stockings electric blue ribbon at welt. 15-denier T=0.76 matte black. UV makes blue ribbon fluoresce matching dress glow.',
  },
  {
    name: '17-bronze-scale-one-shoulder',
    attire: 'She wears a bronze metallic scale-armor one-shoulder micro dress of overlapping 8mm metal scales. Single strap over right shoulder leaving entire left side bare including shoulder arm and torso side. Scales shift and click with movement. Bare back between scales and strap. Extremely short hemline with scale fringe. The exposed left side shows skin from shoulder to hip.',
    scene: 'Gothic Vegas lounge: limestone walls iron torch sconces, wrought-iron candelabra 40 beeswax tapers 1800K flickering, navy velvet drapes gold tassels, aged oak bar, pewter vessels, candlelit.',
    fabric: 'SCALE PHYSICS: 8mm bronze-anodized aluminum fish-scale tessellation. Each scale as planar reflector at body-curvature angle. Bronze oxide: R>0.82 above 550nm, R<0.40 below 480nm. Overlap creates layered opacity minimal gaps. Movement: scales slide with audible clicking and momentary gap-flash. Candlelight 1-3Hz flicker creates dynamic shimmer across scale field.',
    hosiery: 'HOSIERY: Bronze-shimmer thigh-high stockings copper lace welt. 15-denier T=0.76 metallic shimmer extending bronze armor to legs. Candle flicker catches shimmer.',
  },
  {
    name: '18-leather-harness-cage',
    attire: 'She wears a black leather bodycon micro dress with integrated harness-strap architecture: criss-crossing leather straps with chrome O-ring hardware at every junction creating cage-like pattern across torso. Straps frame and expose skin between leather panels. Chrome buckle closures at sides. Multiple chrome O-rings catch light as constellation of bright circular reflections. Ultra-short hemline.',
    scene: 'Underground Vegas rock: exposed ductwork raw concrete ceiling black, red LED strip bar base blood-red uplight chrome stools, sticky rubber mat, bourbon rocks glass, smoke wisps in spot beam, raw underground.',
    fabric: 'LEATHER + CHROME PHYSICS: Full-grain cowhide 1.2mm chrome-tanned anisotropic microfacet specular half-width 15 degrees. Chrome O-rings: polished 304 stainless toroidal R=0.68 each reflecting miniature fish-eye. Harness strap tension: visible gathering at strap-crosses-leather junctions. Chrome buckles: each with prong and keeper at different light-catching angles. Leather warms to body temp changing drape from rigid to conforming over the evening.',
    hosiery: 'HOSIERY: Black thigh-high stockings industrial wide welt utilitarian. 20-denier T=0.62 matte black. Red LED uplight catches nylon as blood-red specular on shin.',
  },
  {
    name: '19-champagne-sequin-full-bare-back',
    attire: 'She wears a champagne gold sequin halter mini dress with high crew neckline in front and dramatically bare open back scooped to the very base of the spine. Halter ties behind neck. Thousands of 4mm champagne sequins catching warm light as golden sparkle field. Ultra-short hemline. The bare back from nape to sacrum is the showpiece - maximum rear skin exposure with glittering gold front.',
    scene: 'Elegant champagne bar: rose gold fixtures, pink marble bar, champagne tower background, blush LED uplighting, white orchids crystal vases, ceiling mirrors doubling light, sophisticated sexy.',
    fabric: 'CHAMPAGNE OPTICS: 4mm champagne-gold R=0.75 at 580nm warm. Rose-gold tint from iron-oxide interference adding pink undertone. Halter: two tension lines from neck create V-strain front with taut flat uniform sequins. Bare back shows direct skin. Gravity pools weight at lowest drape. Each pivot-sewn sequin: 8-15Hz stochastic sparkle. Ceiling mirrors: reflected-reflection doubling field.',
    hosiery: 'HOSIERY: Nude champagne thigh-high stockings gold-thread lace welt. 12-denier T=0.82 warm gold extending palette. Blush uplighting catches tinted nylon as warm glow.',
  },
  {
    name: '20-ivory-satin-extreme-slit',
    attire: 'She wears an ivory white liquid satin one-shoulder mini dress with extreme high slit on left side running from hemline all the way to upper hip exposing the full length of her left leg and hip. Single wide strap on right shoulder. The extreme slit opens with movement revealing maximum leg. Ultra-short hemline on non-slit side. White satin catches every colored light as projection screen.',
    scene: 'Pristine Vegas penthouse bar: all-white marble, massive crystal chandelier thousands of rainbow caustics, frost-etched glass partitions LED edge-light, clear-ice bartop, white leather Barcelona chairs, chrome accents, dramatic single key light.',
    fabric: 'WHITE SATIN PHYSICS: 19-momme charmeuse 4/1 warp-float lustrous. White R=0.87 broadband Lambertian: every colored light projects ONTO dress as visible color zone. Chandelier rainbow caustics project prismatic patterns onto white surface. Bias-cut slit at 45-degree grain allows maximum elastic opening with movement. Slit edge catches light as bright specular line from hip to hem. Birefringence delta_n=0.04 shimmer. Crystal caustics from 12,000 Swarovski pendants create moving rainbow on white satin.',
    hosiery: 'HOSIERY: White thigh-high stockings satin welt. 12-denier T=0.82 white ultra-sheer continuous monochromatic line. Chandelier caustics project onto white nylon too.',
  },
];

async function generateEdit(concept, inputImage, index) {
  const prompt = buildPrompt(concept.attire, concept.scene, concept.fabric, concept.hosiery);
  const wordCount = prompt.split(/\s+/).length;

  console.log(`\n${'='.repeat(60)}`);
  console.log(`[${index + 1}/20] ${concept.name}`);
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
const e = parseInt(process.argv[4] || '20');
const results = [];

console.log(`\n=== VEGAS V6R - MAX REVEAL + PHYSICS 4K ===`);
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
console.log('V6R RESULTS');
console.log(`${'='.repeat(60)}`);
const ok = results.filter(r => r.ok);
console.log(`Success: ${ok.length}/${results.length}`);
results.forEach(r => console.log(`  ${r.ok ? 'OK' : '!!'} ${r.name}${r.err ? ': ' + r.err : ''}`));
console.log(`\nOutput: ${OUTPUT_DIR}`);

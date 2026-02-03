#!/usr/bin/env node

/**
 * V10 TRANSCENDENCE - ABSOLUTE PHYSICS CEILING + 30 NEW CONCEPTS
 *
 * New physics over V9 (computational photography + material science frontier):
 * - Wavefront PSF via Zernike polynomials (replacing simplified DOF)
 * - Dual-illuminant metamerism failure (upgrading WB error)
 * - Thermochromic fabric response (body heat vs ambient ΔT color shift)
 * - Microfluidic perspiration optics (sweat droplet lensing + thin-film)
 * - Atmospheric turbulence scintillation (heat shimmer dn/dT gradient)
 * - Corneal Purkinje 4-image reflections (eye surface optics)
 * - Marschner anisotropic hair BSDF (R/TT/TRT scattering paths)
 * - CRI degradation metameric failure under narrow-band LED
 * - Collagen autofluorescence (340nm→400nm skin UV response)
 * - Fabric acoustic impedance vibration (bass frequency visible resonance)
 * - Sensor electronic rolling shutter temporal skew on neon
 * - Pupil diffraction starburst (15-blade aperture Fraunhofer pattern)
 *
 * Attire: 30 new concepts pushing proven patterns further
 * Resolution: 4K at 2:3 = 3392x5056 (17.1MP)
 * Target: 920-980w (maximizing within 1100w safety ceiling)
 */

import { GoogleAuth } from 'google-auth-library';
import fs from 'fs/promises';
import path from 'path';

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || 'gen-lang-client-0925343693';
const LOCATION = 'global';
const MODEL = 'gemini-3-pro-image-preview';
const ENDPOINT = `https://aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL}:generateContent`;
const OUTPUT_DIR = process.env.OUTPUT_DIR || path.join(process.env.HOME, 'nanobanana-output', 'vegas-v10-transcendence');
const INPUT_IMAGE = process.argv[2] || '/Users/louisherman/Documents/518355716_10109335899644328_1380496532632646402_n.jpeg';

const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
await fs.mkdir(OUTPUT_DIR, { recursive: true });

function buildPrompt(attire, scene, fabricPhysics, hosieryPhysics) {
  return `Edit this photograph into raw candid nightlife photography shot by a friend with a professional camera at a real bar. NOT a professional photoshoot. NOT studio lighting. NOT retouched. NOT a fashion editorial. NO softboxes, NO beauty dishes, NO fill cards, NO hair-makeup artist results, NO symmetrical lighting, NO Photoshop, NO frequency-separation skin smoothing, NO dodge-and-burn, NO color grading. The image should look like it has NEVER been opened in Lightroom. A real moment captured by someone who happens to own a Canon R5. ${attire}

SCENE: ${scene}

CAMERA WAVEFRONT OPTICS: Canon R5 II 45MP BSI-CMOS 36x24mm. RF 50mm f/1.2L wide open. Zernike wavefront: Z4 defocus continuous with depth, Z7+Z8 coma 0.15 waves field edges comet-tail PSF on off-axis neon, Z11 spherical 0.08 waves, Z5+Z6 astigmatism 0.05 waves corner ellipses. Focus 2.2m iris: 2.15m Z4=0.3 perceptible soft, 2.0m Z4=1.5 clearly soft, 1.5m/3.0m Z4>4 defocused colored blobs -- continuous smooth PSF evolution NOT binary. ISO 3200 Poisson sigma=sqrt(N) SNR=28dB chroma noise red-blue decorrelation underexposed. Shutter 1/125s motion blur hands. DPAF locked iris. 15-blade aperture: bright neons produce Fraunhofer starburst 30 rays sinc^2 envelope. Rolling shutter 8.2ms: moving neon 2-3px horizontal skew. Barrel 0.8%. Highlight clipping pure white 1-2px magenta fringing per-channel. Bayer demosaic false color moire. No flash. Crushed blacks. Vignetting cos^4 0.7-stop corners.

3D LIGHT TRANSPORT + METAMERISM: Primary tungsten 2800K CRI=100 small capsule point-source hard shadows. Secondary neon colored spill inverse-square. Tertiary fluorescent 4100K CRI=62 triband 435+545+612nm creating metameric failure: fabrics matching under tungsten shift colors under fluorescent -- reds toward brown, blues toward grey-green. CRI desaturation in fluorescent zones. 4-stop gradient bar to booths. NO fill -- 5+ stop true black shadows. Neon interreflection bounces from bar to chin shadow-side colored fill. Dual-illuminant WB error: auto-WB between 2800K/4100K neither correct -- amber skin under tungsten, cyan-green under fluorescent, visible color boundary where illuminants overlap on subject. Heat scintillation: dn/dT=-1e-4 K^-1 shimmer distortion behind warm sources. Haze tau=0.08/m Beer-Lambert.

SKIN BIO-OPTICAL + FLUORESCENCE: 3-layer Monte Carlo SSS. Melanin mu_a=6.6*C_mel*(lambda/500)^(-3.33). HbO2 542nm+576nm flush cheeks earlobes decolletage. Stratum corneum n=1.55 R_0=4.7% gloss DISTINCT from subsurface glow -- both simultaneously, Schlick near-total grazing creating bright rim over warm SSS. Vasodilation: pinker blotchy patches cheeks chest neck. Collagen autofluorescence: neon UV 340nm excites collagen re-emitting 400nm violet-blue undertone on thin-skin areas under UV-rich sources only. Microrelief 20-100 micron crosshatch specular. Sebaceous T-zone sheen. Vellus hair rim light. Perspiration droplets as plano-convex micro-lenslets creating inverted images of brightest source plus thin-film iridescent fringe at meniscus. Marschner hair BSDF: R surface specular shifted root, TT transmitted glow, TRT secondary highlight -- three highlights on dark hair under hard tungsten. Corneal Purkinje: P1 bright corneal reflection of venue light, P2-P4 progressively fainter. Lip hemoglobin pink, moisture gloss, vertical furrows. Preserve face exactly.

${fabricPhysics}

${hosieryPhysics}

RAW IMPERFECTIONS: ISO 3200 grain shadows. Motion blur fingertips. Flyaway hair backlit soft streak Marschner R-lobe. Bokeh neon soft discs 15-blade shape on brightest. Glass refraction blur foreground. Flare veiling glare 2-3 green hexagonal ghosts. Rolling shutter skew moving neon. Sitting creases hip. Napkin condensation ring patron elbow edge. Vignetting 0.7-stop corners. Fundus reflection one eye off-axis. Thermochromic: body-contact fabric 2-3nm warmer spectral shift vs free-hanging -- barely perceptible color temperature difference same garment. Bass acoustic resonance 40-80Hz: 0.5-1mm micro-flutter hemline edges thin straps only. No retouching no grading -- RAW only. Preserve face identical.`;
}

const concepts = [
  // === SPEAKEASY / HIDDEN BAR (1-5) ===
  {
    name: '01-midnight-velvet-corset-speakeasy',
    attire: 'She wears a midnight navy crushed velvet structured corset micro dress with dramatically low sweetheart bustline, 16 steel boning channels creating maximum waist cinch, and fully open lace-up back through antique brass grommets from nape to sacrum. Crushed velvet pile direction creates chaotic light absorption patterns. Ultra-short hemline. Maximum structural drama with full back exposure.',
    scene: 'Hidden speakeasy behind bookshelf door: exposed brick low arched ceiling, prohibition-era brass fixtures, candlelight clusters in amber glass holders 1800K flickering 1-3Hz, absinthe fountain dripping, cracked leather banquettes deep brown, torn vintage poster, bartender muddling in copper shaker, prohibition cocktail menu chalkboard, cigar smoke wisps.',
    fabric: 'CRUSHED VELVET CORSET: Rayon-silk pile 3mm randomly folded crushing creating chaotic anisotropic BRDF -- pile direction varies patch-to-patch so same illumination produces bright-bright-dark-dark mosaic of reflection vs absorption. Each fold boundary: sharp BRDF discontinuity as pile direction flips. Midnight navy absorption 95% in pile-away but only 60% in pile-toward creating 6:1 luminance contrast within same fabric. 16 steel bones compress crushed structure into smooth conical geometry at waist but pile chaos resumes above and below bones. Brass grommets antique patina R=0.45 warm scattered along exposed spine. Lace tension radiating wrinkles from each grommet. Candlelight 1800K ultra-warm animated 1-3Hz dancing on crushed pile creating constantly-shifting mosaic of bright warm patches. Sweetheart extremely low.',
    hosiery: 'HOSIERY MICRO-OPTICS: Nylon 6,6 birefringent n_o=1.53 n_e=1.58 polarization-dependent transparency. Warp-knit 400-gauge 15-denier T=0.76. Black with thin midnight velvet ribbon welt. Crushed velvet to smooth nylon transition at hemline. Candlelight catches shin as sole warm specular. Compression gradient ankle 18mmHg thigh 8mmHg.',
  },
  {
    name: '02-copper-chainmail-cowl-speakeasy',
    attire: 'She wears a copper metal chainmail halter micro dress of thousands of tiny 2mm interlocking rings. Halter behind neck completely bare back to lowest spine. Deep cowl neckline draping very low under metal weight showing maximum decolletage. Ultra-short hemline. Heavy 2.8kg copper flows like liquid metal. Chainmail captures every candle flame as thousands of simultaneous fish-eye point reflections.',
    scene: 'Industrial speakeasy: raw steel beams overhead, exposed copper pipes along ceiling, Edison bulb clusters warm amber, concrete bar with brass rail, leather apron bartender, vintage glass bottles amber-backlit wall, worn wood floor sawdust traces, absinthe spoon slotted.',
    fabric: 'CHAINMAIL OPTICS: European 4-in-1 copper 2mm ID 0.4mm wire diameter. Each ring: independent toroidal fish-eye mirror reflecting unique inverted micro-image of surroundings. Copper selective R: 0.18 at 480nm rising to 0.87 at 700nm creating warm bias rejecting blue. Inter-ring light: cascading 2-4 bounce reflections between adjacent rings creating multiply-reflected caustic chains visible as bright warm threads between rings. 2.8kg heavy drape: mass creates deep catenary sag at cowl with metallic clink sound. Halter strain concentrated nape, cowl weight pulls lowest possible neckline. Edison bulbs: hundreds of warm point-source reflections across chainmail creating starfield effect. Each ring orientation slightly different = slightly different reflected image = pointillist warm mosaic.',
    hosiery: 'HOSIERY: Nylon 6,6 birefringent 15-denier T=0.76 warp-knit. Black with copper metallic thread industrial welt. Chainmail fringe at hemline drapes over welt top creating metal-over-nylon layered transition. Edison warm catches shin specular. Compression gradient.',
  },
  {
    name: '03-emerald-satin-extreme-bare-back-speakeasy',
    attire: 'She wears an emerald green liquid satin charmeuse slip micro dress with ultra-thin gold chain straps and bare back scooped to the absolute lowest point of spine. Front cowl drapes very low showing maximum decolletage. Silk clings in catenary drape mapping every contour. Extremely short bias-cut hemline barely at upper thigh. Maximum skin at deep cowl front and extreme bare back.',
    scene: 'Art deco speakeasy: geometric brass light fixtures, green marble bar with gold veining, velvet emerald curtains, etched glass dividers geometric patterns, crystal coupe glasses pyramid, jazz trio corner soft focus, absinthe green glow, torn cocktail ticket.',
    fabric: 'CHARMEUSE CATENARY: 19-momme silk 4/1 warp-float creating anisotropic specular lobe stretched perpendicular to thread direction aspect ratio 3:1 -- this elongated highlight is the signature "liquid" look of charmeuse. Emerald absorption 600-700nm transmission 520-555nm with Beer-Lambert depth-dependent saturation. Catenary drape y=a*cosh(x/a) a=11cm between chain supports creating minimal-energy surface. Cowl: varying Gaussian curvature with caustic concentration in concave valleys where light focuses. Gold chain straps: individual links each catching light as tiny R=0.85 warm points with V-gathering at attachment. Bias 45-degree maximum drape compliance creating body-mapping cling. Green marble surface reflects emerald upward onto fabric underside creating green-on-green interreflection fill. Wear: sitting creases at hip-thigh junction.',
    hosiery: 'HOSIERY: Nylon 6,6 birefringent 12-denier T=0.82 ultra-sheer warp-knit. Black with thin emerald satin ribbon bow outer welt. Marble surface reflects green upward onto stockings creating faint emerald gradient on inner thigh. Compression gradient visible through sheer.',
  },
  {
    name: '04-gold-sequin-strapless-ultra-micro-speakeasy',
    attire: 'She wears a bright gold sequin strapless bandeau ultra-micro dress barely reaching upper thighs. Completely strapless held by extreme body tension only. Sweetheart neckline pushed dramatically low. Thousands of 5mm gold sequins maximum reflective brilliance. Aggressively minimal -- maximum sparkle minimum fabric. Every candle flame multiplied by thousands of gold mirrors.',
    scene: 'Velvet-curtained speakeasy: heavy burgundy drapes framing entrance, ornate gilt mirror above bar massive carved frame, crystal decanters amber spirits backlit, red leather tufted stools brass nail trim, vintage brass cash register, wax-dripped candelabra, torn playing card.',
    fabric: 'GOLD SEQUIN ULTRA-MICRO: 5mm gold-anodized Al pivot-sewn on black mesh. Gold selective R>0.80 above 550nm R<0.40 below 480nm creating warm-only reflection. Large 5mm: dramatic 3-8Hz slow shimmer from body sway as each sequin sweeps through specular angle at different time. Candlelight animated source creates time-varying flickering warm cascades across field. Gilt mirror: recursive reflection multiplying sparkle infinitely. Strapless extreme horizontal tension across bust creating compression alignment of sequins along stress lines. Ultra-micro hemline maximum leg exposure. Wear: edge sequins slightly bent from sitting on hard stool, one sequin missing at armhole stress point.',
    hosiery: 'HOSIERY: Nylon 6,6 birefringent 10-denier T=0.87 ultra-sheer warp-knit. Nude gold-shimmer with gold-thread lace welt. Gilt mirror reflects stockings creating doubled golden shimmer. Candle catches lace warm. Compression gradient barely visible through ultra-sheer.',
  },
  {
    name: '05-scarlet-vinyl-wrap-speakeasy',
    attire: 'She wears a deep scarlet high-shine PVC vinyl wrap micro dress with crossover V showing maximum decolletage and wrap tie at left hip creating dramatically asymmetric hemline -- left side ultra-short barely covering. Scarlet vinyl near-mirror catches every warm candle as brilliant red specular streaks. Wrap opens at hip revealing flash of upper thigh. Maximum reflective drama in intimate candlelight.',
    scene: 'Prohibition cocktail den: low tin ceiling pressed pattern, dark wood wainscoting, brass wall sconces warm pools, barrel-stave bar aged oak, bitters bottles collection, hand-chipped ice block, velvet stool cushions worn, torn absinthe label.',
    fabric: 'SCARLET VINYL WRAP: PVC n=1.54 Ra<0.05 optical polish. Scarlet absorption 430-560nm transmission 600-700nm Beer-Lambert deeper=richer. Subsurface: 0.3-0.5mm translucent PVC forward-scatter creating diffuse glow halo surrounding specular -- characteristic wet look where highlights have soft luminous corona rather than pure mirror-on-black. Fresnel Schlick R=R_0+(1-R_0)(1-cos(theta))^5 rising to near-total at grazing creating bright rim-contour trace. Wrap radial compression from knot at left hip creating fan-fold tension wrinkles radiating outward. Asymmetric hemline dramatically shorter left. Brass sconces warm amber streaks on scarlet surface. Candlelight 1800K ultra-warm reflected as orange-white hot spots.',
    hosiery: 'HOSIERY: Nylon 6,6 birefringent 15-denier T=0.76 warp-knit. Black with thin scarlet ribbon welt. Vinyl mirror to matte nylon transition at hemline. Short wrap side reveals welt detail. Brass sconce catches ribbon warm accent. Compression gradient.',
  },

  // === ULTRA-LOUNGE / BOTTLE SERVICE (6-10) ===
  {
    name: '06-holographic-iridescent-one-shoulder-lounge',
    attire: 'She wears a holographic iridescent metallic one-shoulder micro dress with color that shifts continuously from teal to magenta to gold with viewing angle. Single wide strap right shoulder leaving entire left shoulder arm and side completely bare. Extremely short hemline. Holographic surface creates living rainbow that changes with every micro-movement -- like a 3D holographic sticker wrapped around body.',
    scene: 'Ultra-modern bottle service lounge: LED-lit acrylic furniture glowing blue-purple, massive LED video wall abstract colors behind DJ, chrome and glass everywhere, champagne sparklers approaching table bright, fog machine light beams visible, black marble floor mirror polish.',
    fabric: 'HOLOGRAPHIC THIN-FILM: Multilayer Al/SiO2/TiO2 nano-stack creating broad interference across visible spectrum. NOT single-color iridescence but FULL SPECTRAL rainbow: constructive interference shifts continuously through entire visible range 400-700nm as viewing angle changes by Bragg condition 2nd*cos(theta)=m*lambda. One-shoulder diagonal creates continuous angle gradient from strap to opposite hip = continuous color gradient from teal (normal incidence small theta) through magenta (45-degree) to gold (grazing). LED video wall cycling provides constantly-changing illumination SPD interacting with angle-dependent reflection creating double-dynamic: both illumination AND reflection change simultaneously. Chrome surroundings reflect holographic back creating recursive interference. Sparkler approaching: broadband white illumination reveals maximum rainbow spectrum simultaneously.',
    hosiery: 'HOSIERY: Nylon 6,6 birefringent 10-denier T=0.87 ultra-sheer warp-knit. Nude with holographic metallic thread welt creating miniature rainbow accent. LED wall color wash through ultra-sheer. Black marble reflects stockings creating perfect doubled mirror image below. Compression gradient.',
  },
  {
    name: '07-black-latex-corset-extreme-lounge',
    attire: 'She wears a jet black latex rubber structured corset micro dress with sweetheart bustline pushed dramatically low, 16 steel boning extreme waist cinch, and fully open lace-up back through chrome grommets from nape to sacrum. Latex R=0.06 mirror-black with extreme Fresnel rim-light at grazing angles. Extremely short hemline. Black latex near-perfect absorption with devastating bright rim-light contour trace.',
    scene: 'Dark VIP bottle service: private booth velvet curtain partitioned, low table LED underglow purple, champagne magnums ice bucket chrome, crystal flutes rim-catching light, dark contemporary, security presence blurred doorway, DJ visible through glass wall, bass energy.',
    fabric: 'BLACK LATEX CORSET: Natural rubber vulcanized Ra<0.03 broadband absorption. Near-perfect blackbody textile at normal incidence. Fresnel dramatic: n=1.52 gives R_0=4.3% at normal but Schlick formula rises to near-total at grazing -- body becomes invisible dark void with BRILLIANT bright contour rim-light tracing every curve as thin bright line against darkness. 16 steel bones create structural ridges -- each ridge crest catches grazing light as bright line while valleys absorb completely. Chrome grommets R=0.68 bright constellation along dark spine. LED purple underglow: reflected off table surface upward creating unusual bottom-lit purple highlight on latex underside of bust and thighs where normally shadowed. Sweetheart extremely low. Latex adhesion creates zero-gap body contact showing every micro-contour.',
    hosiery: 'HOSIERY: Nylon 6,6 birefringent 20-denier T=0.62 warp-knit. Black matte seamless extending latex void below hemline. Purple LED underglow catches shin as colored specular accent. Only chrome grommets and rim-light brightness against total darkness. Compression gradient.',
  },
  {
    name: '08-rose-gold-hammered-metallic-backless-lounge',
    attire: 'She wears a rose gold hammered metallic jersey halter micro dress with completely bare back scooped past sacrum to lowest possible spine point. Halter ties behind neck. Hundreds of tiny concave dimple-mirrors each catching light independently. Ultra-short hemline. Full bare back maximum skin against hammered metallic front creating reflective pointillist surface.',
    scene: 'Rooftop ultra-lounge: skyline panoramic through floor-ceiling glass, infinity edge water feature LED-lit blue, modern fire pit circular flames, white leather modular seating, cocktail molecular foam garnish, overhead string bistro lights warm, desert stars above city glow, slight warm breeze.',
    fabric: 'HAMMERED METALLIC JERSEY: Micro-concavities r=2-5mm depth 0.3-0.8mm randomly distributed. Each dimple: concave mirror f=r/2 creating inverted micro-image of surroundings within each tiny mirror. Cook-Torrance BRDF roughness alpha=0.35 Beckmann distribution. Rose gold Cu-Sn alloy: R climbing 0.18 at 480nm to 0.72 at 580nm to 0.87 at 700nm -- strong warm bias. Skyline through glass: hundreds of tiny inverted skylines visible in dimple-mirrors across dress surface. Fire pit 1-3Hz flame animation creates dancing warm caustics. Bistro string lights: constellation of warm points in each dimple. Water feature blue LED: cool accent reflected in lower dimples. Halter V-strain nape. Bare back: fire warmth and bistro light model spine.',
    hosiery: 'HOSIERY: Nylon 6,6 birefringent 10-denier T=0.87 ultra-sheer warp-knit. Nude rose-gold shimmer with rose gold lace welt. Skyline reflects through ultra-sheer creating faint city-light pattern on legs. Fire pit warm catches shimmer. Compression gradient barely visible.',
  },
  {
    name: '09-electric-violet-fluorescent-extreme-slit-lounge',
    attire: 'She wears an electric violet fluorescent stretch bodycon micro dress with extreme high slit on right running from hemline past upper hip to waist. Sleeveless scoop neck. Electric violet fluoresces vivid under UV creating apparent self-luminous glow brighter than ambient reflection. Extreme slit opens with any movement revealing full leg to hip bone. Body-gripping stretch maps every contour zero ease.',
    scene: 'Underground ultra-lounge: UV strip lighting ceiling and base creating fluorescent glow zone, massive subwoofer wall bass shaking air, minimal concrete aesthetic, LED ring overhead blue-white, fog machine haze beams visible, DJ booth elevated glass, crowd silhouettes.',
    fabric: 'FLUORESCENT BODYCON: Polyester-elastane 85/15 optical brightener doped. Electric violet 380-430nm+620-680nm dual-band additive. UV-reactive: absorbs 365nm re-emits 410nm+650nm Stokes shift quantum yield phi=0.45 creating apparent luminosity EXCEEDING incident reflected light -- dress appears to glow from within brighter than surroundings. 4-way stretch body tension zero ease skin-contact adhesion mapping every contour. UV strips: maximize fluorescent emission. LED ring: white illumination shows reflective violet. Fog beams: fluorescent dress acts as secondary light source casting faint violet onto nearby fog. Extreme slit bias-cut maximum opening: fluorescent edge traces slit line as bright violet boundary. Bass vibration 40Hz creates visible micro-flutter at slit edge.',
    hosiery: 'HOSIERY: Nylon 6,6 birefringent 15-denier T=0.76 warp-knit. Black with thin electric violet ribbon welt. UV makes ribbon fluoresce matching dress glow. Extreme slit reveals full stocking length to welt. Dark lounge stockings nearly invisible. Compression gradient.',
  },
  {
    name: '10-ivory-pearl-beaded-strapless-lounge',
    attire: 'She wears an ivory pearl-beaded strapless bandeau micro dress with thousands of 3mm freshwater pearls hand-sewn covering entire surface. Completely strapless held by body tension. Sweetheart neckline. Extremely short hemline. Pearls create diffuse luminous surface -- not mirror sparkle but soft warm organic glow from nacre iridescence. Organic luxury against modern lounge.',
    scene: 'Luxury hotel ultra-lounge: white Carrara marble everywhere, gold fixtures, crystal chandelier massive overhead, mirror panels floor-ceiling, champagne tower crystal coupes, white orchids floating bowls, soft gold ambient, live pianist corner, half-eaten gold-leaf truffle.',
    fabric: 'PEARL NACRE OPTICS: Freshwater pearls 3mm aragonite CaCO3 layered nacre creating orient -- diffuse iridescence from multilayer thin-film interference in 0.3-0.5 micron aragonite platelets. NOT mirror-specular but soft diffuse luminous glow with subtle color play shifting pink-green-blue. Each pearl independent orientation = independent orient direction. Thousands create pointillist diffuse luminous surface unlike any metallic or sequin texture. Chandelier overhead: warm light diffused through nacre creating soft glow rather than harsh reflections. Marble surfaces: white bounce-fill from below enhancing luminosity. Mirror panels: recursive multiplication of pearl glow. Strapless horizontal bust compression. Pearl weight 1.2kg creates slight drape pull. Wear: one pearl slightly loose near armhole from stress.',
    hosiery: 'HOSIERY: Nylon 6,6 birefringent 10-denier T=0.87 ultra-sheer warp-knit. Nude ivory-shimmer with pearl-white lace welt. Marble reflection doubles pearl glow below. Chandelier caustics on stockings. Continuous ivory tone. Compression gradient barely visible.',
  },

  // === CASINO HIGH-ROLLER BAR (11-15) ===
  {
    name: '11-red-holographic-sequin-backless-casino',
    attire: 'She wears a red holographic sequin halter micro dress with clean neckline front and dramatically bare back scooped past sacrum to lowest spine point. Halter ties behind neck. Thousands of 4mm holographic red sequins that shift through red-orange-magenta spectrum with angle. Ultra-short hemline. Full bare back against prismatic red sparkle front.',
    scene: 'Vegas casino high-roller pit: exclusive roped area, mahogany table green felt, crystal whiskey heavy tumbler, brass banker lamp green shade warm pool, slot LED bleed from main floor distant, chandelier above, security suit blur, cigar ashtray crystal, crumpled hundred.',
    fabric: 'HOLOGRAPHIC SEQUIN: 4mm red-base Al with holographic embossing -- micro-diffraction grating stamped into surface creating spectral decomposition of reflected light. Each sequin not simple mirror but tiny rainbow projector: incident white light dispersed into directional spectral fan. Red base pigment filters transmitted light red while reflected diffraction creates orange-magenta-green spectral spray at different angles. 8-20Hz stochastic sparkle now POLYCHROMATIC -- different colors flash from same sequin at different body angles. Banker lamp green shade warm: green filtered light creates unusual warm-green sparkle on sequin field. Halter V-strain. Bare back: banker lamp warm on skin models spine without sequin interference.',
    hosiery: 'HOSIERY: Nylon 6,6 birefringent 15-denier T=0.76 warp-knit. Black with thin red holographic ribbon welt. Banker lamp green-warm catches ribbon creating spectral accent. Compression gradient. Slot LED distant catches shin.',
  },
  {
    name: '12-silver-liquid-lame-extreme-cutout-casino',
    attire: 'She wears a liquid silver metallic lame mini dress with dramatic wide cutouts: large diamond shapes both waist sides exposing maximum hip skin, wide rectangular cutout center sternum, deep V cutout center back exposing spine. Sleeveless. Silver liquid metal catches every casino light as brilliant neutral reflections. Ultra-short hemline. Maximum skin windows against mirror-bright silver.',
    scene: 'Casino floor bar island: 360-degree view of slot machines LED walls flashing, overhead massive chandelier tiered crystal, circular polished dark granite bar, marble walkway, cocktail server approaching, jackpot lights distant, constant energy, ice well condensation.',
    fabric: 'SILVER LAME CUTOUT: Al vapor-deposited R=0.88 broadband neutral mirror on polyester weft. Each cutout window: warm lit skin framed against cold silver mirror. Diamond hip cutouts maximum width exposing hip contour skin with bar-light direct illumination. Sternum cutout centered window of warm skin against cold metallic. Back V-cutout exposing spine ridge with shadow-highlight from overhead chandelier. 360-degree casino: silver reflects continuous anamorphic distorted panoramic of entire casino wrapped around body. Slot LED multicolor rapidly-changing creates animated color streams across silver. Crystal chandelier: thousands of prismatic caustic projections onto silver surface. Cutout edges: silver fabric makes hard boundary warm-skin-to-cold-mirror at each window.',
    hosiery: 'HOSIERY: Nylon 6,6 birefringent 15-denier T=0.76 warp-knit. Silver-shimmer metallic thread welt. Casino panoramic reflects in silver shimmer. Chandelier caustics catch metallic welt. Compression gradient.',
  },
  {
    name: '13-burgundy-velvet-corset-casino',
    attire: 'She wears a deep burgundy crushed velvet structured corset micro dress with sweetheart bustline pushed very low, 14 steel boning extreme waist cinch, and open lace-up back through antique brass grommets from nape to sacrum. Burgundy velvet absorbs most light creating rich dark void with warm highlights only where pile catches light. Extremely short hemline.',
    scene: 'Private casino salon: exclusive high-limit room beyond velvet rope, dark paneled walls gold trim, single dramatic pendant spotlight brass, green baize table, crystal brandy snifter, leather wingback chairs, hushed exclusive atmosphere, monogrammed napkin.',
    fabric: 'BURGUNDY CRUSHED VELVET: Rayon-silk pile 3mm randomly crushed creating chaotic anisotropic BRDF. Burgundy absorption 430-560nm transmission 620-680nm deep wine through Beer-Lambert pile depth. Crushed topology: pile-toward reflecting R=0.40 warm burgundy, pile-away absorbing R=0.05 near-black creating dramatic high-contrast mosaic. 14 steel bones impose structural order onto chaotic crush -- smooth conical compression at waist with chaos above and below. Brass grommets antique patina R=0.45. Single pendant spotlight: creates single bright zone with rest in deep absorption shadow. Green baize: reflected green fill on underside creating unusual warm-burgundy/cool-green color split. Sweetheart very low.',
    hosiery: 'HOSIERY: Nylon 6,6 birefringent 20-denier T=0.62 warp-knit. Black extending velvet darkness below. Antique brass accent at welt matching grommets. Pendant spot catches shin sole specular. Green baize reflected cool fill on inner thigh. Compression gradient.',
  },
  {
    name: '14-gold-chainmail-extreme-slit-casino',
    attire: 'She wears a gold metal chainmail one-shoulder micro dress with extreme high slit on left running from hemline past upper hip to waist. Single strap right shoulder. Thousands of tiny 2mm gold interlocking rings. Extreme slit opens revealing full leg to hip bone. Ultra-short hemline non-slit side. Gold chainmail captures casino light as thousands of warm fish-eye micro-reflections with metallic clink.',
    scene: 'VIP casino lounge: elevated private area, polished dark wood circular bar, top-shelf spirits backlit amber wall floor-ceiling, heavy brass fixtures, leather cube ottomans, roulette felt green visible through glass partition, security presence, bourbon neat on stone coaster.',
    fabric: 'GOLD CHAINMAIL: European 4-in-1 gold-plated 2mm ID 0.4mm wire. Gold selective R>0.80 above 550nm warm-only. Each toroid: independent fish-eye micro-mirror reflecting unique inverted image. Inter-ring cascading 2-4 bounce multi-reflections creating caustic chains between rings. 2.2kg mass creating heavy sway drape with momentum persistence after movement. Spirit-wall amber backlit: hundreds of tiny amber bottle reflections across chainmail. One-shoulder diagonal drape gravity-weighted. Extreme slit: bias-cut edge allowing maximum opening with chain rings creating scalloped metallic edge. Slit separates to reveal smooth stockinged leg contrasting gold articulated metallic above.',
    hosiery: 'HOSIERY: Nylon 6,6 birefringent 10-denier T=0.87 ultra-sheer warp-knit. Nude gold-shimmer gold lace welt. Extreme slit reveals full stocking length to welt. Spirit-wall amber catches ultra-sheer warm. Chainmail fringe at slit edge drapes over welt. Compression gradient.',
  },
  {
    name: '15-electric-blue-satin-bare-back-casino',
    attire: 'She wears an electric blue liquid satin charmeuse slip micro dress with ultra-thin silver chain straps and bare back scooped to absolute lowest point of spine. Front cowl drapes very low showing maximum decolletage. Silk clings in catenary drape mapping every contour. Extremely short bias-cut hemline. Electric blue catches LED slot-light creating intense saturated specular.',
    scene: 'Casino bar main floor: slot machine wall LED cycling colors close proximity, wide marble walkway, overhead chandelier warm counterpoint, crowd energy all directions, cocktail waitress tray blur, craps table green glow background, constant motion, slot ticket on bar.',
    fabric: 'ELECTRIC BLUE CHARMEUSE: 19-momme silk warp-float specular half-width 8-degree. Anisotropic lobe 3:1 elongated perpendicular to thread direction creating liquid look. Electric blue selective: strong absorption 580-700nm transmission 450-490nm saturated blue. Slot LED: rapidly cycling multicolor illumination creates time-varying color on silk -- blue LED enhances (additive), red LED creates deep purple (blue+red), green LED creates teal (blue+green) -- silk becomes color-mixing palette responding to slot animation. Catenary y=a*cosh(x/a) between chain supports. Silver chain straps: cool metallic accent. Cowl Gaussian curvature caustic valleys. Marble floor: reflects electric blue creating environmental blue glow around her feet.',
    hosiery: 'HOSIERY: Nylon 6,6 birefringent 12-denier T=0.82 ultra-sheer warp-knit. Black with thin electric blue satin ribbon bow welt. Slot LED catches ribbon cycling color. Marble reflects blue creating cool underglow on stockings. Compression gradient.',
  },

  // === ROOFTOP SKYBAR (16-20) ===
  {
    name: '16-white-sequin-strapless-rooftop',
    attire: 'She wears a brilliant white sequin strapless bandeau micro dress. Completely strapless extreme body tension. Thousands of 4mm white opalescent sequins creating luminous projection screen that captures every colored light. Sweetheart neckline pushed dramatically low. Extremely short hemline. White sequins act as color-neutral canvas displaying entire rooftop light environment as projected chromatic map.',
    scene: 'Vegas skybar 50th floor: panoramic Strip view through minimal glass railing, infinity pool LED color-cycling below, helicopter passing red-green nav lights, desert sunset afterglow western horizon amber-pink, city grid stretching to mountains, cocktail stem glass, wind catching hair.',
    fabric: 'WHITE OPALESCENT SEQUIN: 4mm white pearlescent-coated Al. Opalescent coating creates angle-dependent rainbow sheen on white base. Base R=0.85 broadband neutral PLUS orient thin-film iridescence. Strapless horizontal bust tension. Strip skyline warm bokeh: hundreds of warm golden point reflections across white field. Pool LED cycling: sequential chromatic wave across white surface from below. Helicopter nav lights: red-green tracking streak across sequin field as aircraft passes. Sunset afterglow: western-facing sequins warm pink-amber, eastern cold blue-dusk creating directional color gradient across body. Wind: 3-5Hz micro-flutter at free edges slightly faster sparkle rate.',
    hosiery: 'HOSIERY: Nylon 6,6 birefringent 10-denier T=0.87 ultra-sheer warp-knit. Nude white-shimmer pearl lace welt. Strip bokeh warm on ultra-sheer. Pool LED cycling chromatic on stockings from below. Wind micro-flutter at welt ribbon. Compression gradient barely visible.',
  },
  {
    name: '17-black-vinyl-one-shoulder-extreme-slit-rooftop',
    attire: 'She wears a jet black high-shine PVC vinyl one-shoulder micro dress with extreme high slit on right running from hemline past upper hip to waist. Single strap left shoulder. Black vinyl near-mirror reflects entire rooftop skyline as dark warped panoramic. Extreme slit opens revealing full leg to hip bone. Ultra-short hemline non-slit side. Strip lights become colorful streaks on black mirror surface.',
    scene: 'Modern skybar rooftop: LED-lit infinity pool edge, Strip panoramic glass railing, concrete planter bistro string lights warm, outdoor bar polished concrete, fire pit circular flames, DJ booth LED panel, helicopter distant, desert air warm, knocked-over cocktail umbrella.',
    fabric: 'BLACK VINYL ROOFTOP: PVC n=1.54 carbon-black Ra<0.05. At normal: near-perfect absorption R=0.04 creating void. Fresnel Schlick dramatic: R rises from 4% at normal to near-total at grazing creating devastating bright rim-contour tracing every body curve against black void. Subsurface: 0.3-0.5mm translucent PVC creates diffuse glow corona around bright specular highlights. Strip panoramic: reflected as elongated colored streaks distorted by body curvature. Fire pit: warm dancing reflection on vinyl hip area. Pool LED: blue accent reflected upward on underside. One-shoulder diagonal tension. Extreme slit: vinyl edge creates bright specular line from hip to hemline. Wind: vinyl rigid resists flutter unlike fabric.',
    hosiery: 'HOSIERY: Nylon 6,6 birefringent 15-denier T=0.76 warp-knit. Black satin welt. Vinyl-to-nylon texture transition at hemline: mirror to matte. Extreme slit reveals full stocking. Fire pit warm catches shin. Strip panoramic reflected on vinyl not nylon. Compression gradient.',
  },
  {
    name: '18-magenta-metallic-wrap-rooftop',
    attire: 'She wears a magenta metallic lame wrap micro dress with crossover V showing maximum decolletage and wrap tie at right hip creating dramatically asymmetric hemline -- right side ultra-short barely covering. Magenta metallic mirror catches Strip skyline as warm-pink reflections. Wrap opens at hip revealing flash of upper thigh. Three-quarter pushed sleeves. Bold magenta against desert sky.',
    scene: 'Pool deck skybar: underwater pool LED blue-cyan, cabana curtains flowing white breeze, palm trees uplighted green, heat lamp overhead orange-red radiant, Strip view between palms, cocktail tiki style garnish, sunset afterglow, sticky spilled drink on stone deck.',
    fabric: 'MAGENTA METALLIC WRAP: Al vapor-deposited magenta-tinted lame. Magenta dual-band: reflects 420-470nm blue + 620-680nm red simultaneously absorbing 480-600nm green creating additive magenta. Pool LED blue-cyan: reflects as enhanced blue component intensifying magenta toward violet on pool-facing surfaces. Heat lamp orange-red radiant: reflects as enhanced red component pushing magenta toward warm pink on overhead-facing surfaces. Directional color variation: same magenta fabric appears DIFFERENT colors depending on which light source dominates at each angle. Wrap radial compression from knot right hip. Asymmetric hem dramatically shorter right. Cabana curtain white backdrop isolating magenta figure.',
    hosiery: 'HOSIERY: Nylon 6,6 birefringent 15-denier T=0.76 warp-knit. Black with thin magenta metallic ribbon welt. Pool LED catches ribbon as blue-shifted violet accent. Heat lamp catches shin warm. Short wrap side reveals welt. Compression gradient.',
  },
  {
    name: '19-champagne-satin-corset-rooftop',
    attire: 'She wears a champagne gold satin structured corset micro dress with sweetheart bustline pushed very low, 14 steel boning dramatic waist cinch, and open lace-up back through rose gold grommets from nape to lower spine. Champagne satin creates soft warm luminosity reflecting desert sky afterglow. Extremely short hemline. Structural corset drama against panoramic sky.',
    scene: 'Exclusive rooftop lounge: private cabana open sides, sheer curtains breeze, fire table low flames, champagne service silver ice bucket, city lights stretching to horizon, warm desert evening breeze, lounge music ambient, scattered rose petals on daybed, dying sunset crimson-gold western sky.',
    fabric: 'CHAMPAGNE SATIN CORSET: 22-momme duchess satin warp-float. Champagne gold subtle absorption 460-520nm broad 550-700nm warm transmission creating soft warm luminosity. 14 steel bones vertical panel geometry with hard specular-shadow ridges. Desert sunset afterglow: western-facing panels lit crimson-gold warm creating dramatic half-lit effect. Eastern-facing panels lit by city-light cool blue creating warm-cool split across corset following sun geometry. Rose gold grommets R=0.60 catching sunset warm along spine. Fire table flames 1-3Hz animated dancing on satin panels. Sheer curtain breeze: partial occlusion of city lights creating time-varying dappled illumination. Compression conical waist.',
    hosiery: 'HOSIERY: Nylon 6,6 birefringent 12-denier T=0.82 ultra-sheer warp-knit. Nude champagne shimmer rose gold lace welt. Sunset catches ultra-sheer warm golden glow. City lights cool counter-fill through sheer. Compression gradient barely visible.',
  },
  {
    name: '20-platinum-sequin-backless-rooftop',
    attire: 'She wears a platinum silver sequin halter micro dress with clean neckline front and dramatically bare back scooped past sacrum to absolute lowest spine point. Halter ties behind neck. Thousands of 4mm platinum sequins R=0.82 broadband catching every rooftop light. Ultra-short hemline. Full bare back nape to beyond sacrum. Neutral platinum reflects entire colorful rooftop environment without color bias.',
    scene: 'Sky lounge observatory: floor-ceiling windows 360 panoramic, Strip south view warm, mountains west dark silhouette, airport runway lights east linear, modern minimal furniture, LED floor strips blue, observatory telescope corner, craft cocktail smoke-infused, helicopter circling.',
    fabric: 'PLATINUM SEQUIN OBSERVATORY: 4mm Al R=0.82 broadband neutral. Neutral reflector becomes chameleon: Strip-facing sequins warm golden, mountain-facing sequins dark blue-grey, airport-facing sequins linear runway-light streaks, LED-floor-facing sequins cool blue uplight. 8-20Hz stochastic sparkle. Each sequin reflects different direction of 360-panoramic creating pointillist color-map of entire surrounding environment across body. Helicopter circling: tracking highlight crossing sequin field as bright moving point. Halter V-strain. Bare back: 360 panoramic lights model spine warm from Strip, cool from mountains, creating chromatic directional light-painting on skin.',
    hosiery: 'HOSIERY: Nylon 6,6 birefringent 15-denier T=0.76 warp-knit. Silver-shimmer platinum thread welt. Floor LED blue catches welt as cool accent. Strip warm catches shin. Compression gradient.',
  },

  // === POOL GROTTO BAR (21-25) ===
  {
    name: '21-turquoise-vinyl-strapless-grotto',
    attire: 'She wears a turquoise high-shine PVC vinyl strapless bandeau micro dress. Completely strapless extreme body tension. Turquoise vinyl mirror-surface catches pool water caustics as animated blue-green projections dancing across body. Sweetheart neckline. Extremely short hemline. Pool light creates living aquatic pattern on vinyl surface.',
    scene: 'Vegas pool grotto bar: natural rock cave formation around pool edge, underwater pool LED blue-green, stalactite-like rock ceiling low intimate, hidden speakers, tiki torches flame orange on rock shelves, waterfall curtain pool edge trickling, wet stone bar, tropical cocktail pineapple garnish, condensation everywhere.',
    fabric: 'TURQUOISE VINYL GROTTO: PVC n=1.54 Ra<0.05 polish. Turquoise absorption 600-700nm transmission 460-530nm. Pool underwater LED: refracted through water surface creating animated caustic patterns -- each water ripple acts as cylindrical lens focusing light into bright moving lines. These caustics PROJECT onto vinyl surface as bright dancing turquoise lines constantly moving. Tiki torch flame 1900K orange: contrasts cool turquoise with warm orange streaks. Waterfall trickle: additional fine caustic texture from turbulent water surface. Rock cave: diffuse warm bounce-fill. Subsurface PVC glow halo. Fresnel rim bright. Strapless compression. Humidity: water vapor condensation on vinyl surface as micro-droplets modifying reflectance creating soft-focus effect.',
    hosiery: 'HOSIERY: Nylon 6,6 birefringent 15-denier T=0.76 warp-knit. Black with thin turquoise ribbon welt. Pool caustics animate across welt. Tiki torch warm catches shin. Humidity condensation on nylon slightly modifying transparency. Compression gradient.',
  },
  {
    name: '22-gold-lame-one-shoulder-grotto',
    attire: 'She wears a gold metallic lame one-shoulder micro dress. Single wide strap right shoulder leaving entire left shoulder arm and side completely bare. Gold lame mirror-surface catching pool caustics as animated warm patterns. Extremely short hemline. Asymmetric bare left against gold reflective right. Pool caustics paint gold surface with dancing aquatic light.',
    scene: 'Luxury pool grotto: carved rock alcove intimate, pool LED underwater shifting blue-to-green slow cycle, flame torches mounted rock wall dancing, infinity pool edge waterfall, tropical plants backlit, wet mosaic tile bar, coconut shell drink, steam from heated pool rising.',
    fabric: 'GOLD LAME GROTTO: Al vapor-deposited gold-anodized R>0.80 above 550nm warm selective. Pool caustics: refracted animated lines projecting onto gold surface creating moving warm-on-gold bright pattern. Flame torches: 1900K fire light reflected as intense warm orange-gold amplifying gold warmth. Pool LED blue-green cycle: gold REJECTS blue (R<0.40 below 480nm) but reflects warm -- so green phase creates unusual teal-gold interplay while blue phase shows reduced brightness. One-shoulder diagonal drape. Bare left side: wet warm air and pool caustics directly on skin without fabric filter. Steam from heated pool: volumetric scatter between camera and subject creating slight haze softening.',
    hosiery: 'HOSIERY: Nylon 6,6 birefringent 10-denier T=0.87 ultra-sheer warp-knit. Nude gold-shimmer gold lace welt. Pool caustics animate across ultra-sheer. Steam haze slightly softening stocking detail. Compression gradient barely visible.',
  },
  {
    name: '23-white-satin-extreme-bare-back-grotto',
    attire: 'She wears a white liquid satin charmeuse slip micro dress with ultra-thin gold chain straps and bare back scooped to the absolute lowest point of spine. Front cowl drapes very low showing maximum decolletage. Silk clings in catenary drape. Extremely short bias-cut hemline. White satin acts as projection canvas for every pool caustic and flame as colorful animated light map.',
    scene: 'Hidden grotto pool bar: rocky cave ceiling with moisture glistening, pool turquoise LED glow, candle clusters in rock niches warm amber, waterfall behind bar thin curtain, wet stone everything, fern fronds low ceiling, rum cocktail fruit garnish, pool steam hanging.',
    fabric: 'WHITE CHARMEUSE PROJECTION: 19-momme silk warp-float. White R=0.85 Lambertian broadband neutral becomes projection canvas. Pool turquoise caustics: animated blue-green dancing lines projected onto white silk clearly visible as vivid chromatic pattern. Candle amber: warm golden pools projected where candle-light reaches creating warm zones. Waterfall caustics: fine turbulent caustic texture from thin water curtain. All three light sources project SIMULTANEOUSLY onto white creating complex layered animated color map. Catenary drape between chain supports. Cowl varying Gaussian curvature concentrating caustic lines in valleys. Moisture: cave humidity causes silk to absorb water vapor slightly increasing cling and transparency at body-contact zones.',
    hosiery: 'HOSIERY: Nylon 6,6 birefringent 12-denier T=0.82 ultra-sheer warp-knit. White satin welt matching. Pool caustics project onto white nylon. Candle warm pools on stockings. Cave moisture slightly modifying sheer transparency. Compression gradient.',
  },
  {
    name: '24-bronze-sequin-wrap-grotto',
    attire: 'She wears a bronze sequin wrap micro dress crossover V showing maximum decolletage, wrap tie left hip creating dramatically asymmetric hemline -- left side ultra-short barely covering. Thousands of 4mm bronze sequins catching flame and pool light. Wrap opens at hip revealing upper thigh. Three-quarter pushed sleeves. Bronze sequins create warm ancient-metallic sparkle in cave setting.',
    scene: 'Venetian-style grotto: stone arched ceiling frescoed faded, pool LED warm amber, brass lanterns hanging chains, mosaic tile floor geometric wet, ancient-look stone bar, wine in crystal, gondola oar decorative, candle sconces iron, limestone dust.',
    fabric: 'BRONZE SEQUIN GROTTO: 4mm bronze Cu-Sn alloy R=0.18@480nm to 0.72@580nm to 0.82@700nm warm bias. Pool LED warm amber: REINFORCES bronze warm creating intensely warm monochromatic warm-metal sparkle. Brass lanterns: matching warm point-source reflections. Stone arch ceiling: diffuse warm bounce. Mosaic wet floor: reflects sequin sparkle creating doubled warm constellation below. 8-20Hz stochastic sparkle. Wrap crossover V converging alignment. Asymmetric tie left shorter maximum thigh. Cave environment warm cocoon of bronze-amber-gold unified warm palette. Fresco faded painted surfaces as colored diffuse background.',
    hosiery: 'HOSIERY: Nylon 6,6 birefringent 15-denier T=0.76 warp-knit. Black with thin bronze metallic ribbon welt. Brass lantern catches ribbon as warm point. Wet mosaic reflects welt warm doubled. Short wrap side reveals welt. Compression gradient.',
  },
  {
    name: '25-crimson-latex-corset-grotto',
    attire: 'She wears a deep crimson latex rubber structured corset micro dress with sweetheart bustline pushed very low, 14 steel boning extreme waist cinch, and open lace-up back through chrome grommets from nape to sacrum. Crimson latex catches pool caustics as animated red-on-red patterning with Fresnel bright rim-light. Extremely short hemline.',
    scene: 'Gothic grotto bar: dark stone vaulted ceiling, pool LED deep red dramatic, iron candelabra massive dripping wax, stone columns carved, heavy oak bar centuries aged, red wine crystal decanter, torch brackets wall mounted, bat motif ironwork, cobweb corner.',
    fabric: 'CRIMSON LATEX CORSET: Natural rubber vulcanized Ra<0.03 base absorption. Crimson pigment: absorption 430-560nm transmission 600-700nm deep red. Latex Fresnel: n=1.52 gives R_0=4.3% at normal rising dramatically at grazing creating bright red rim-contour. Pool LED deep red: reinforces crimson creating intense near-monochromatic red environment. Candelabra flame 1800K: warm amber adds orange-gold accent to crimson. 14 steel bones: structural ridges catching rim-light as bright lines against crimson absorption. Chrome grommets: bright neutral points along dark red spine. Subsurface latex glow: translucent PVC layer creates crimson luminous halo around specular highlights. Dripping wax: adds textural reference for viscous material alongside latex.',
    hosiery: 'HOSIERY: Nylon 6,6 birefringent 20-denier T=0.62 warp-knit. Black extending crimson darkness below. Chrome grommet accent. Pool red LED catches shin as colored specular. Candle flame warm point on knee. Compression gradient.',
  },

  // === PENTHOUSE PRIVATE BAR (26-30) ===
  {
    name: '26-pearl-white-satin-corset-penthouse',
    attire: 'She wears a pearl white satin structured corset micro dress with sweetheart bustline pushed very low, 14 steel boning dramatic waist cinch, and open lace-up back through mother-of-pearl buttons from nape to lower spine. Pearl white satin creates angelic luminous warm glow. Extremely short hemline. Maximum structural drama in pristine white with iridescent pearl button detail.',
    scene: 'Vegas penthouse private bar: floor-ceiling windows Strip panoramic below, marble wet bar Carrara white, crystal decanter collection backlit, modern art massive wall, white leather sectional, gas fireplace linear flame, city lights carpet below, half-drunk champagne, smudged glass railing.',
    fabric: 'PEARL WHITE SATIN CORSET: 22-momme duchess satin warp-float R=0.85 warm white. 14 steel bones vertical panels. Pearl white subtle warm shift: not cold-white but warm-white with 5900K color temperature slightly golden. Mother-of-pearl buttons: nacre iridescent orient creating tiny rainbow accents along spine replacing chrome grommets -- each button shifts pink-green-blue with angle. Strip panoramic below: city lights reflected upward onto white satin from glass floor-ceiling creating environmental color map on dress surface. Fireplace linear flame: warm orange gradient on near-fire panels. Modern art: large colored canvas reflected as soft colored fill on white. Crystal decanter: caustic projections onto white.',
    hosiery: 'HOSIERY: Nylon 6,6 birefringent 10-denier T=0.87 ultra-sheer warp-knit. Nude pearl-white shimmer lace welt. Strip panoramic reflects upward through ultra-sheer. Fireplace warm catches stockings near side. Compression gradient barely visible.',
  },
  {
    name: '27-emerald-sequin-one-shoulder-penthouse',
    attire: 'She wears an emerald green sequin one-shoulder micro dress. Single wide strap right shoulder leaving entire left shoulder arm and side completely bare. Thousands of 4mm emerald sequins creating deep rich green sparkle. Extremely short hemline. Bare left side against maximum emerald sparkle right. City lights below multiply through thousands of green mirrors.',
    scene: 'Penthouse lounge: intimate with panoramic city view floor-ceiling glass two walls corner unit, custom neon art installation pink cursive on wall, low modern furniture white and chrome, in-unit infinity-edge spa pool LED blue small, personal DJ setup, skyline three sides, caviar on ice.',
    fabric: 'EMERALD SEQUIN PENTHOUSE: 4mm emerald-anodized Al. Emerald selective: absorption 600-700nm R>0.70 at 520-560nm green. City skyline through glass: thousands of warm city-light point reflections in green sequin field creating warm-points-in-green contrast. Neon art pink: pink light reflected from emerald creates unusual pink-on-green color interaction (complementary colors). Spa pool LED blue: blue reflected from emerald creates blue-green=teal accent. 8-20Hz stochastic sparkle. One-shoulder diagonal strain. Bare left side: city view reflects directly on skin without emerald filter -- warm versus green split body. Three-wall panoramic creates wrap-around city reflection.',
    hosiery: 'HOSIERY: Nylon 6,6 birefringent 10-denier T=0.87 ultra-sheer warp-knit. Nude emerald-shimmer emerald lace welt. City lights catch ultra-sheer warm. Neon pink catches welt as pink-on-green accent. Compression gradient barely visible.',
  },
  {
    name: '28-black-sequin-extreme-bare-back-penthouse',
    attire: 'She wears a jet black sequin halter micro dress with bare back scooped past sacrum to absolute lowest spine point. Halter ties behind neck. Thousands of 4mm jet-black anodized sequins creating dark sophisticated shimmer -- subtle moody sparkle not bright flash. Ultra-short hemline. Full bare back. Black sequins create dark mirror-mosaic of city lights.',
    scene: 'Penthouse private bar: intimate home bar walnut and brass, panoramic window one wall floor-ceiling, designer pendant light sculptural, art photography large-format on wall, bourbon collection backlit, leather Barcelona chair, city carpet below, single orchid stem glass vase, jazz vinyl playing.',
    fabric: 'BLACK SEQUIN PENTHOUSE: 4mm jet-black anodized Al R=0.25 subdued dark-metallic. At rest near-uniform dark moody surface. Micro-movement: individual sequins pivot past specular angle creating scattered dim warm 10-25Hz understated sparkle. Designer pendant single key: one bright reflected dot per correctly-angled sequin versus ambient dark all others -- creates moving constellation as body shifts. City panoramic: normally-invisible city lights become visible only in sequins at correct specular angle creating stochastic city-light twinkle. Halter V-strain. Bare back: pendant light models spine with clear shadow-highlight. Bourbon backlit amber: warm soft fill. Black void body with accents only.',
    hosiery: 'HOSIERY: Nylon 6,6 birefringent 20-denier T=0.62 warp-knit. Black matte welt seamless extending dark sequin void. Pendant catches shin sole specular accent. City lights reflected in bourbon catching as warm points. Compression gradient.',
  },
  {
    name: '29-rose-gold-vinyl-wrap-penthouse',
    attire: 'She wears a rose gold metallic high-shine PVC vinyl wrap micro dress with crossover V showing maximum decolletage and wrap tie at left hip creating dramatically asymmetric hemline -- left side ultra-short barely covering. Rose gold vinyl near-mirror catches city panoramic as warm pink-gold distorted reflections. Wrap opens at hip. Three-quarter pushed sleeves.',
    scene: 'Modern penthouse living bar: open plan massive space, floor-ceiling glass corner panoramic, LED strip lighting architectural ceiling warm, gas fire table low rectangular flames, white Calacatta marble island bar, wine fridge built-in glowing, abstract sculpture bronze, scattered coasters.',
    fabric: 'ROSE GOLD VINYL: PVC n=1.54 Ra<0.05 with rose gold metallic pigment. Copper-gold selective: R climbing 0.18@480nm to 0.65@580nm to 0.82@700nm warm rose. Subsurface translucent PVC glow corona. Schlick near-total grazing bright rose-gold rim. City panoramic: reflected as warm pink-gold distorted panoramic wrapped around body with building lights as elongated warm streaks. LED strip warm: reinforces rose-gold warmth from above. Fire table flames: 1-3Hz animated warm on vinyl creating dancing rose-gold hot spots. White marble: bright bounce-fill from below. Wrap radial compression knot left hip. Asymmetric hem dramatically shorter left.',
    hosiery: 'HOSIERY: Nylon 6,6 birefringent 15-denier T=0.76 warp-knit. Black with thin rose gold metallic ribbon welt. City panoramic catches ribbon as warm streak. Marble bounce-fill illuminates stockings from below. Short wrap side reveals welt detail. Compression gradient.',
  },
  {
    name: '30-diamond-white-beaded-strapless-penthouse',
    attire: 'She wears a diamond white crystal-beaded strapless bandeau micro dress with thousands of 2mm faceted Swarovski crystal beads covering entire surface. Completely strapless held by body tension. Sweetheart neckline. Extremely short hemline. Faceted crystals create prismatic rainbow fire from every bead -- not soft pearl glow but sharp diamond-like spectral dispersion scattering rainbows across room.',
    scene: 'Ultimate penthouse panoramic: highest floor corner unit three glass walls, entire Strip visible south warm golden, mountains dark west, airport east linear lights, stars above clear desert sky, personal champagne bar marble, Baccarat crystal glasses, white grand piano, candles everywhere, view of everything from above.',
    fabric: 'CRYSTAL BEAD PRISMATIC: 2mm faceted Swarovski lead crystal n=1.65 high-dispersion. Each faceted bead: NOT simple mirror but DISPERSIVE -- white light entering exits as spectral fan projecting tiny rainbow onto nearby surfaces (skin, bar, walls). Thousands simultaneously: room filled with projected micro-rainbows from every bead. High refractive index n=1.65 creates strong Fresnel R_0=6.2% plus total internal reflection at >37-degree critical angle. Strip panoramic south: warm city light enters crystals dispersing into spectral fire. Strapless horizontal compression. Candle flames: 1800K warm entering crystals creating warm spectral fans. Stars: negligible but atmospheric scintillation makes crystals twinkle matching sky. 2mm size: dense 280/cm^2 creating maximum prismatic density. Crystal weight 1.8kg gentle drape pull.',
    hosiery: 'HOSIERY: Nylon 6,6 birefringent 10-denier T=0.87 ultra-sheer warp-knit. Nude diamond-shimmer crystal lace welt. Crystal rainbow projections fall onto stockings as tiny chromatic spots. Three-wall panoramic catches ultra-sheer. Compression gradient barely visible.',
  },
];

async function generateEdit(concept, inputImage, index, retries = 0) {
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
    contents: [{ role: 'user', parts: [
      { text: prompt },
      { inlineData: { mimeType, data: base64Image } },
    ]}],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
      imageConfig: { aspectRatio: '2:3', imageSize: '4K' },
    },
  };

  const client = await auth.getClient();
  const token = await client.getAccessToken();

  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.text();
    if (response.status === 429) {
      if (retries >= 10) throw new Error('Rate limited 10x - giving up. Try again later.');
      const wait = 180;
      console.log(`Rate limited (${retries + 1}/10) - waiting ${wait}s... [${error.substring(0, 150)}]`);
      await new Promise(r => setTimeout(r, wait * 1000));
      return generateEdit(concept, inputImage, index, retries + 1);
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

console.log(`\n=== V10 TRANSCENDENCE - ABSOLUTE PHYSICS CEILING + 4K ===`);
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
    console.log('Waiting 180s...');
    await new Promise(r => setTimeout(r, 180000));
  }
}

console.log(`\n${'='.repeat(60)}`);
console.log('V10 TRANSCENDENCE RESULTS');
console.log(`${'='.repeat(60)}`);
const ok = results.filter(r => r.ok);
console.log(`Success: ${ok.length}/${results.length}`);
results.forEach(r => console.log(`  ${r.ok ? 'OK' : '!!'} ${r.name}${r.err ? ': ' + r.err : ''}`));
console.log(`\nOutput: ${OUTPUT_DIR}`);

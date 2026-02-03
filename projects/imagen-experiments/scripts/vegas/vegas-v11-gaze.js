#!/usr/bin/env node

/**
 * V11 GAZE - DIRECT EYE CONTACT + ADVANCED SENSOR PHYSICS + DARING ATTIRE
 *
 * New physics over V10:
 * - Gaze vergence angle 1.8° + P1 corneal reflection centered on pupil (direct camera gaze)
 * - JPEG DCT 8x8 block artifact visibility in dark gradients (sensor realism)
 * - Sensor hot pixels 2-3 at fixed positions (CMOS defect realism)
 * - Lens breathing 4% focal length shift at close focus (cinema lens physics)
 * - Nail lacquer specular (clear-coat BRDF on colored substrate)
 * - Jewelry micro-caustics (gem/metal caustic projections)
 * - Eyelash diffraction fringe (fine-strand Fraunhofer)
 * - Fabric contact transfer (body heat color shift at skin contact)
 * - Piloerection goosebump micro-geometry (AC cold response)
 *
 * Attire: 30 new daring concepts with per-concept eye contact expression
 * Resolution: 4K at 2:3 = 3392x5056 (17.1MP)
 * Target: 750-950w (maximizing within 1100w safety ceiling)
 */

import { GoogleAuth } from 'google-auth-library';
import fs from 'fs/promises';
import path from 'path';

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || 'gen-lang-client-0925343693';
const LOCATION = 'global';
const MODEL = 'gemini-3-pro-image-preview';
const ENDPOINT = `https://aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL}:generateContent`;
const OUTPUT_DIR = process.env.OUTPUT_DIR || path.join(process.env.HOME, 'nanobanana-output', 'vegas-v11-gaze');
const INPUT_IMAGE = process.argv[2] || '/Users/louisherman/Documents/518355716_10109335899644328_1380496532632646402_n.jpeg';

const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
await fs.mkdir(OUTPUT_DIR, { recursive: true });

const expressions = [
  'quiet confidence, slight upward chin tilt, one eyebrow barely raised',
  'playful half-smile, eyes slightly narrowed with amusement',
  'sultry intensity, lips barely parted, heavy-lidded gaze',
  'warm genuine smile reaching the eyes, crow-foot crinkles forming',
  'mysterious composure, Mona Lisa micro-smile, unreadable expression',
  'bold direct stare, chin level, unapologetic presence',
  'soft vulnerability, eyes wide and luminous, gentle parted lips',
  'knowing smirk, one corner of mouth lifted, eyes sparkling',
  'fierce determination, jaw set, eyes locked and unwavering',
  'relaxed elegance, slight head tilt, effortless poise',
  'coy glance through lowered lashes, chin dipped, eyes up',
  'radiant joy, broad genuine smile, eyes crescent-shaped',
  'cool detachment, perfectly composed, model stillness',
  'intimate warmth, as if recognizing someone beloved',
  'defiant edge, slight nostril flare, commanding presence',
  'dreamy softness, eyes slightly unfocused then snapping to lens',
  'sharp wit, compressed smile suppressing laughter',
  'regal bearing, elongated neck, imperious but inviting gaze',
  'candid surprise, caught mid-laugh, natural and unposed',
  'magnetic pull, steady unblinking gaze, gravitational eye contact',
  'tender amusement, gentle head shake, fond expression',
  'electric energy, wide eyes, barely contained excitement',
  'languid ease, heavy-lidded relaxation, unhurried presence',
  'conspiratorial wink-adjacent, one eye slightly more closed',
  'dignified grace, serene half-smile, classical composure',
  'provocative challenge, tilted chin up, daring the camera',
  'genuine surprise transitioning to delight, eyes widening',
  'contemplative depth, thoughtful gaze, intelligence visible',
  'victorious satisfaction, earned confidence, subtle triumph',
  'pure magnetism, the look that stops conversations mid-sentence',
];

function buildPrompt(attire, scene, fabricPhysics, hosieryPhysics, expression) {
  return `Edit this photograph into raw candid nightlife photography shot by a friend with a professional camera at a real bar. NOT a professional photoshoot. NOT studio lighting. NOT retouched. NOT a fashion editorial. NO softboxes, NO beauty dishes, NO fill cards, NO hair-makeup artist results, NO symmetrical lighting, NO Photoshop, NO frequency-separation skin smoothing, NO dodge-and-burn, NO color grading. The image should look like it has NEVER been opened in Lightroom. A real moment captured by someone who happens to own a Canon R5. She looks directly into the camera with ${expression}. ${attire}

SCENE: ${scene}

CAMERA + SENSOR PHYSICS: Canon R5 II 45MP BSI-CMOS 36x24mm. RF 50mm f/1.2L wide open. Lens breathing: 4% focal length shift at 2.2m close focus creating 48.1mm effective -- slight field narrowing versus infinity calibration. Zernike wavefront: Z4 defocus continuous, Z7+Z8 coma 0.15 waves field-edge comet PSF, Z11 spherical 0.08, Z5+Z6 astigmatism 0.05 corner. Focus 2.2m: 2.0m perceptible soft, 1.5m/3.0m defocused colored blobs. ISO 3200 Poisson sigma=sqrt(N) SNR=28dB chroma noise. JPEG DCT: 8x8 block boundaries faintly visible in dark shadow gradients where quantization coarsens -- not visible in highlights. 2-3 sensor hot pixels: bright fixed-position RGB dots on dark sensor columns, same location every frame. Rolling shutter 8.2ms: neon 2-3px skew. 15-blade aperture Fraunhofer starburst on bright neons. Barrel 0.8%. Clipping magenta fringe. Bayer demosaic false color. Crushed blacks cos^4 vignetting 0.7-stop.

GAZE + EYE OPTICS: Both eyes converged at vergence angle 1.8-degree inward (2.2m camera distance) confirming binocular fixation on lens axis. Corneal Purkinje P1 reflection: bright venue light reflected on anterior cornea CENTERED ON PUPIL confirming direct lens-axis gaze -- P1 dot sits at pupil center not displaced. P2 faint inverted deeper. P3-P4 from lens surfaces barely visible. Iris texture radial collarette visible. Pupil dilated 5-6mm low-light. Eyelash diffraction: individual lashes as fine strands create Fraunhofer fringes on bright background sources -- faint colored spectral streaks radiating from lash tips when backlit. Limbal ring dark 0.3mm. Scleral vessels faint red. Tear film meniscus lower lid catching light as thin bright line.

3D LIGHT + METAMERISM: Primary tungsten 2800K CRI=100 hard shadows. Secondary neon colored spill inverse-square. Tertiary fluorescent 4100K CRI=62 triband metameric failure: reds toward brown, blues toward grey-green. Dual-illuminant WB error amber/cyan-green at overlap boundary. Heat scintillation dn/dT shimmer. Haze tau=0.08/m. Neon interreflection chin fill.

SKIN BIO-OPTICAL: 3-layer Monte Carlo SSS. Melanin mu_a absorption. HbO2 flush cheeks earlobes decolletage. Stratum corneum n=1.55 Schlick grazing rim over warm SSS. Vasodilation blotchy patches. Collagen autofluorescence 340nm→400nm violet undertone UV zones. Perspiration micro-lenslets inverted images thin-film fringe. Marschner hair BSDF R/TT/TRT triple-highlight. Goosebump piloerection: AC cold air creates arrector pili contraction visible as micro-bumps on upper arms shoulders, each bump with single vellus hair erected catching rim-light. Nail lacquer: clear-coat specular over colored substrate creating double-reflection -- sharp surface gloss plus diffuse color beneath, visible on fingernails as bright highlight dot over matte color.

${fabricPhysics}

${hosieryPhysics}

RAW IMPERFECTIONS: ISO 3200 grain. Motion blur fingertips. Flyaway hair Marschner R-lobe. Bokeh 15-blade. Glass refraction foreground blur. Flare veiling 2-3 green ghosts. Rolling shutter neon skew. Sitting creases hip. Condensation ring napkin. Vignetting corners. JPEG DCT faint blocks in shadows. Hot pixels 2-3 fixed bright dots dark areas. Lens breathing field narrowing. Thermochromic: body-contact fabric 2-3nm warmer shift. Bass 40-80Hz micro-flutter thin fabric edges. Jewelry micro-caustics: any metal or gem projects tiny focused light patterns onto nearby skin. Preserve face identical.`;
}

const concepts = [
  // === NIGHTCLUB VIP (1-5) ===
  {
    name: '01-sheer-mesh-panel-bodycon-nightclub',
    attire: 'She wears a jet black bodycon micro dress with large sheer mesh panels: entire side panels from underarm to hemline are transparent black mesh revealing skin beneath, solid panels front and back only. Sleeveless high neck. Ultra-short hemline. Sheer mesh creates bold geometric windows of visible skin framed by opaque black, mesh fine enough to show skin texture beneath.',
    scene: 'VIP nightclub: massive LED wall cycling colors behind DJ booth, laser beams green cutting through fog, strobe frozen motion, bottle service sparklers approaching, black leather booth, bass vibration visible in drink surface, security rope, crushed cocktail napkin.',
    fabric: 'MESH PANEL BODYCON: Opaque sections polyester-elastane 4-way stretch body-mapped. Mesh panels: hexagonal knit 0.8mm aperture nylon monofilament. Mesh optical: each hex acts as tiny window -- skin visible through mesh but modulated by monofilament diffraction creating slight moire pattern when mesh spacing approaches camera pixel pitch. LED wall: colored light passes through mesh illuminating skin beneath with colored wash visible THROUGH mesh. Solid panels block light -- sharp boundary mesh-to-solid where skin visibility abruptly stops. Strobe: frozen mesh geometry casting hex shadow pattern onto skin beneath. Mesh tension body-mapped zero ease. Fog: volumetric scatter between mesh and skin visible as slight haze layer within mesh windows.',
    hosiery: 'HOSIERY: Nylon 6,6 birefringent 15-denier T=0.76 warp-knit. Black seamless extending body void. LED catches shin as colored specular accent through fog. Mesh-to-stocking transition at hemline: similar sheerness different geometry. Compression gradient.',
  },
  {
    name: '02-cutaway-back-spine-chain-nightclub',
    attire: 'She wears a deep crimson stretch crepe halter micro dress with completely bare cutaway back from nape to below sacrum, connected only by a thin decorative gold chain draping in three cascading loops across exposed spine. Halter high neck front. Ultra-short hemline. Maximum back exposure with ornamental chain catching every light as it sways against bare skin.',
    scene: 'Underground nightclub: industrial concrete walls, copper pipe ceiling exposed, moving head lights sweeping beams, fog machine dense low, bass bins vibrating floor, DJ elevated booth glass front, crowd silhouettes, spilled drink sticky floor.',
    fabric: 'CRIMSON CREPE CUTAWAY: Polyester crepe 150gsm matte micro-pebble texture creating diffuse scatter rather than specular sheen. Crimson absorption 430-560nm. Crepe surface roughness alpha=0.45 broad diffuse lobe. Cutaway back: complete absence of fabric nape to sacrum -- gold chain sole connection. Chain 14K gold-plate three loops: each loop catenary y=a*cosh(x/a) draping against spine, chain links 3mm each acting as tiny golden mirror. Chain sway: pendulum motion 0.5-1.5Hz from body movement, each swing shifting caustic projections onto bare back skin. Moving head beam sweeping: chain catches beam momentarily creating bright golden flash then darkness as beam passes. Chain-on-skin contact: warm metal pressing skin creating faint compression marks.',
    hosiery: 'HOSIERY: Nylon 6,6 birefringent 15-denier T=0.76 warp-knit. Black with thin crimson ribbon welt. Moving head beam catches shin momentarily. Chain gold accent at welt. Compression gradient.',
  },
  {
    name: '03-double-slit-metallic-nightclub',
    attire: 'She wears a liquid silver metallic jersey mini dress with dramatic double high slits -- both left AND right sides running from hemline past upper hip to waist. Sleeveless scoop neck. Both slits open simultaneously with any movement revealing both legs to hip bone. Ultra-short center panel. Silver metallic catches every light as brilliant neutral streaks. Maximum leg exposure through dual symmetrical slits.',
    scene: 'Mega-club main floor: massive LED ceiling grid overhead shifting colors, CO2 cannons frozen mist, confetti suspended mid-air strobe-frozen, bottle service table chrome, LED-embedded bar top blue, crowd energy, trampled wristband floor.',
    fabric: 'SILVER METALLIC DOUBLE-SLIT: Al vapor-deposited R=0.88 neutral mirror polyester jersey. Double slit bias-cut both sides: maximum opening both legs simultaneously. Each slit edge: silver fabric makes hard boundary warm-skin-to-cold-mirror creating bilateral symmetrical skin-metal-skin-metal pattern. LED ceiling grid: multicolor overhead reflected as colored mosaic mapped across silver surface -- body becomes distorted mirror of ceiling light grid. CO2 mist: volumetric scatter in slits between legs and fabric creating depth-haze within slit openings. Confetti: tiny colored reflections in silver field. Center panel: sole fabric between legs, narrow silver bridge under extreme bilateral tension.',
    hosiery: 'HOSIERY: Nylon 6,6 birefringent 10-denier T=0.87 ultra-sheer warp-knit. Nude silver-shimmer metallic thread welt. Double slits reveal both stockings fully to welt. LED ceiling catches ultra-sheer. CO2 mist between. Compression gradient barely visible.',
  },
  {
    name: '04-backless-waist-clasp-sequin-nightclub',
    attire: 'She wears a deep sapphire sequin micro dress completely backless held together only by a single jeweled clasp at the small of the back at waist level. No straps no back fabric -- entire back bare from shoulders to waist where single clasp connects two panels. Deep V front. Thousands of 4mm sapphire sequins. Ultra-short hemline. Architectural minimalism: maximum sequin drama front with maximum bare skin back.',
    scene: 'Luxury nightclub: crystal chandelier massive overhead, mirror wall floor-ceiling behind bar, black marble floor polished mirror, VIP banquette velvet purple, champagne tower crystal, gold fixtures everywhere, DJ booth elevated glass, crushed rose petal.',
    fabric: 'SAPPHIRE SEQUIN BACKLESS: 4mm sapphire-anodized Al. Sapphire selective R>0.65 at 450-490nm strong blue. Single jeweled clasp: central focal point where two sequined panels converge at waist -- 8mm crystal cabochon creating prismatic focal point. Front V-convergence and back clasp convergence creating hourglass panel geometry. Chandelier overhead: hundreds of warm point reflections scattered across blue sequin field creating warm-in-cold color contrast. Mirror wall: recursive reflection doubling sequin sparkle infinitely. Black marble: perfect mirror reflection below creating doubled upside-down sequin constellation. 8-20Hz stochastic blue sparkle. Backless: chandelier light directly on skin from shoulders to waist clasp.',
    hosiery: 'HOSIERY: Nylon 6,6 birefringent 15-denier T=0.76 warp-knit. Black with thin sapphire ribbon welt. Chandelier catches ribbon as warm-on-blue accent. Black marble reflects stockings creating mirror double. Compression gradient.',
  },
  {
    name: '05-acrylic-boned-sheer-nightclub',
    attire: 'She wears a black sheer organza structured corset micro dress with transparent acrylic boning visible through the semi-transparent fabric. 12 clear acrylic bones catch and refract light creating bright internal light-pipes visible through sheer black. Sweetheart bustline very low. Open lace-up back chrome grommets. Ultra-short hemline. Transparent structure within transparent fabric -- architectural skeleton visible.',
    scene: 'Avant-garde club: projection-mapped walls geometric animations, UV strip lighting floor base, mirror ball overhead classic, smoke machine thick, LED furniture cubes glowing, angular modern bar polished steel, DJ holographic display, broken glow stick floor.',
    fabric: 'ACRYLIC BONE SHEER: Organza silk 6-momme T=0.55 semi-transparent black. Through semi-sheer: skin visible as warm shadow, acrylic bones visible as bright refractive lines. Acrylic n=1.49 total internal reflection: light entering bone end propagates as light-pipe emerging at other end -- each bone becomes bright internal fiber-optic. UV strip: UV enters acrylic bone ends, internally reflects, exits along length creating glowing blue-violet structural lines within dark sheer fabric. Mirror ball: rotating caustic dots sweeping across sheer surface and through it onto skin beneath simultaneously. Projection-mapped walls: animated geometry projects through sheer onto skin creating layered image. Chrome grommets bright points. Sweetheart very low through sheer creating visible structure beneath.',
    hosiery: 'HOSIERY: Nylon 6,6 birefringent 20-denier T=0.62 warp-knit. Black extending sheer darkness. UV catches shin colored. Mirror ball caustic dots sweep across stockings. Acrylic bone light-pipe glow terminates at hemline. Compression gradient.',
  },

  // === ROOFTOP POOL PARTY (6-10) ===
  {
    name: '06-gold-chainmail-micro-mini-rooftop',
    attire: 'She wears a gold metal chainmail micro-mini halter dress barely reaching upper thighs, with matching gold chain shorts-liner barely peeking below hemline. Halter behind neck fully bare back. Deep cowl neckline draping very low. Thousands of 2mm interlocking gold rings. Ultra-micro length with deliberate shorts peek creating layered hemline. Heavy 2.5kg gold flows liquid-metal.',
    scene: 'Vegas rooftop pool party: infinity pool LED cyan below, cabanas white curtains breeze, palm trees uplighted, Strip skyline south warm golden, DJ booth pool-edge, bikini crowd water, champagne spray frozen droplets, sunscreen coconut, wet concrete.',
    fabric: 'GOLD CHAINMAIL MICRO: European 4-in-1 gold-plated 2mm ID. Gold selective R>0.80 above 550nm. Each ring independent toroidal fish-eye mirror. Pool cyan LED: underwater caustics animate gold creating dancing warm-blue-on-gold pattern. Micro-mini length: chain hangs barely past thighs. Shorts-liner peek: second layer of smaller 1.5mm chainmail visible 1-2cm below main hemline creating doubled metallic edge -- different ring size = different reflection scale. Halter V-strain nape. Cowl weight pulls lowest. Strip skyline: hundreds of warm point-reflections. Champagne spray: frozen droplets refracting light among gold rings. Palm uplight green: gold rejects blue but green creates warm gold-green accent.',
    hosiery: 'HOSIERY: Nylon 6,6 birefringent 10-denier T=0.87 ultra-sheer warp-knit. Nude gold-shimmer with gold lace welt. Chainmail shorts-liner drapes over welt creating triple-layer hemline. Pool caustics on ultra-sheer. Strip warm catches shimmer. Compression gradient.',
  },
  {
    name: '07-electric-pink-vinyl-cutout-rooftop',
    attire: 'She wears an electric hot pink high-shine PVC vinyl mini dress with strategic diamond-shaped cutouts: large diamond both hip sides, smaller diamond center sternum, V-cutout center back. Sleeveless. Pink vinyl near-mirror reflects rooftop in vivid pink distortion. Ultra-short hemline. Cutout windows reveal skin framed by brilliant pink mirror.',
    scene: 'Pool deck daytime-to-dusk: golden hour low sun warm directional, pool LED transitioning blue-to-pink, palm shadow geometric on deck, tiki bar thatched, frozen margarita sweating glass, pool float flamingo distant, warm breeze hair movement, sand tracked on concrete.',
    fabric: 'PINK VINYL CUTOUT: PVC n=1.54 Ra<0.05 polish. Hot pink absorption 480-560nm transmission 600-680nm + 420-450nm creating vivid additive pink. Diamond cutouts: skin windows in pink mirror. Golden hour directional: warm sun creates strong highlight-shadow on vinyl with cutouts casting diamond-shaped light patches onto skin beneath. Subsurface PVC translucent glow. Schlick grazing bright pink rim contour. Pool LED pink phase: reinforces vinyl color. Blue phase: pink vinyl reflects blue as muted purple. Cutout edges: hard pink-mirror to warm-skin boundary. Palm shadow: geometric shadow overlaying vinyl creating stripe pattern on pink. Wind: vinyl rigid resists flutter.',
    hosiery: 'HOSIERY: Nylon 6,6 birefringent 12-denier T=0.82 ultra-sheer warp-knit. Nude with thin hot pink ribbon welt. Golden hour catches ultra-sheer warm glow. Palm shadow stripes across stockings. Cutout reveals welt at hip. Compression gradient.',
  },
  {
    name: '08-white-crochet-extreme-bare-back-rooftop',
    attire: 'She wears a white hand-crochet lace halter micro dress with open macrame-scale pattern revealing significant skin through large stitch openings. Halter behind neck completely bare back to lowest spine. Front deep V through open crochet showing skin beneath at every stitch gap. Ultra-short hemline. White crochet as geometric framework with skin visible through every opening.',
    scene: 'Sunset rooftop: western sky crimson-gold-pink gradient, Strip silhouette warm, cocktail rosemary sprig garnish, bistro string lights warm coming on, fire pit circular starting up, pool still cyan below, first stars appearing, desert evening cooling, salt-rimmed glass.',
    fabric: 'WHITE CROCHET OPTICAL: Cotton-linen blend 2mm yarn open macrame stitch 8-12mm gaps. Each stitch gap: window to skin beneath. Sunset directional: warm crimson-gold light illuminates white crochet but also passes THROUGH gaps illuminating skin directly -- both crochet and skin lit by same warm sunset. Yarn cross-section: circular 2mm creates cylindrical micro-shadow on skin beneath each strand. Open pattern: more skin than fabric visible creating predominantly skin image with white geometric overlay. Bistro string lights: warm points visible through gaps. Bare back: complete open-work with skin visible through every stitch. Crochet irregular handmade: stitch size varies slightly creating organic rather than mechanical pattern.',
    hosiery: 'HOSIERY: Nylon 6,6 birefringent 10-denier T=0.87 ultra-sheer warp-knit. Nude with white crochet lace welt matching dress. Sunset warm catches ultra-sheer golden. Crochet pattern transition to smooth sheer at hemline. Compression gradient barely visible.',
  },
  {
    name: '09-iridescent-scale-one-shoulder-rooftop',
    attire: 'She wears an iridescent sequin-scale one-shoulder micro dress where overlapping 8mm scale-shaped sequins create fish-scale mermaid texture. Single strap left shoulder leaving right side completely bare. Scales shift teal-to-purple-to-gold with movement. Ultra-short hemline. Larger scales create dramatic color-shifting armor effect, each scale independently iridescent.',
    scene: 'Infinity pool edge: water surface catching sunset light, pool LED deep blue beneath, Strip view through glass railing, cocktail tropical garnish umbrella, wet footprints on deck, palm frond shadow, warm evening air, distant helicopter, pool water gentle lap sound.',
    fabric: 'IRIDESCENT SCALE ARMOR: 8mm elongated hexagonal Al scales overlapping 60% creating directional armor texture. Each scale: individual thin-film SiO2/TiO2 stack creating broad-spectrum iridescence teal-purple-gold. Overlap: only upper portion of each scale visible, creating consistent directional pattern like fish scales or chainmail. Scale tilt varies with body curvature: flat at ribs showing teal (normal incidence), tilting at waist showing purple (45-degree), extreme tilt at hip showing gold (grazing). Sunset: warm directional light animates scales differently on sun-side versus shadow-side. Pool water: reflected caustics dance across scale surface. One-shoulder diagonal: scales align along diagonal stress creating directional pattern. Each scale edge: thin dark shadow line where overlap creates gap.',
    hosiery: 'HOSIERY: Nylon 6,6 birefringent 15-denier T=0.76 warp-knit. Black with thin iridescent ribbon welt shifting color. Pool caustics across welt. Sunset warm on stockings. Scale-to-smooth transition at hemline. Compression gradient.',
  },
  {
    name: '10-bronze-mesh-wrap-rooftop',
    attire: 'She wears a bronze metallic mesh wrap micro dress with crossover V showing maximum decolletage, wrap tie at right hip creating dramatically asymmetric hemline -- right side ultra-short barely covering. Bronze mesh semi-transparent with skin visible beneath metallic weave. Three-quarter pushed sleeves. Wrap opens at hip revealing flash of skin through mesh.',
    scene: 'Rooftop lounge dusk: amber sky fading to indigo east, Strip coming alive with lights, fire table low flames, outdoor bar bamboo and steel, lanterns paper warm overhead, pool distant LED shifting, cocktail copper mug Moscow mule, desert cooling breeze.',
    fabric: 'BRONZE MESH WRAP: Metallic-coated nylon mesh 1.2mm aperture bronze finish. Bronze Cu-Sn R=0.18@480nm to 0.72@580nm warm selective. Semi-transparent: skin visible through mesh as warm shadow modulated by bronze metallic weave pattern. Fire table: warm flame reflection on bronze mesh creating animated dancing warm pattern WITH skin visible through dancing pattern simultaneously -- layered fire-on-skin effect. Wrap radial compression from knot right hip creating radial mesh tension -- apertures stretch open under tension revealing more skin, compress closed under drape revealing less. Asymmetric shorter right exposing maximum mesh-filtered skin. Amber sky: warm environmental fill reinforcing bronze warmth. Paper lanterns: soft warm overhead fill.',
    hosiery: 'HOSIERY: Nylon 6,6 birefringent 15-denier T=0.76 warp-knit. Black with thin bronze metallic ribbon welt. Fire table catches ribbon warm. Mesh-to-opaque transition at hemline. Short wrap side reveals welt. Compression gradient.',
  },

  // === CASINO HIGH-ROLLER LOUNGE (11-15) ===
  {
    name: '11-ruby-velvet-double-slit-casino',
    attire: 'She wears a deep ruby crushed velvet micro dress with dramatic double high slits -- both sides running from hemline past upper hip to waist. Sleeveless deep V front. Crushed velvet chaotic pile creates rich light-absorbing drama. Both slits open revealing both legs fully. Ultra-short center panel sole connection between top and bottom. Maximum drama: dark absorbing fabric with maximum bilateral skin reveal.',
    scene: 'Casino VIP salon: mahogany paneling gold trim, single brass banker lamp green shade, roulette table green felt through glass, crystal brandy snifter amber, leather wingback, velvet rope gold, cigar smoke wisps, monogrammed napkin, old money atmosphere.',
    fabric: 'RUBY CRUSHED VELVET DOUBLE-SLIT: Rayon-silk pile 3mm random crush anisotropic BRDF. Ruby absorption 430-560nm deep red. Crushed pile mosaic: pile-toward R=0.40 warm ruby, pile-away R=0.05 near-black creating dramatic high-contrast random pattern. Double slits: both sides open revealing full legs. Center panel narrow under extreme bilateral tension -- crushed pile compressed flat at tension zone losing crush character, returning to chaotic crush above and below. Banker lamp single key: one directional warm pool on velvet creating illuminated zone with rest in deep absorption. Green baize reflection: unusual warm-ruby/cool-green complementary color split. Slit edges: bias-cut crushed velvet fringe slightly irregular.',
    hosiery: 'HOSIERY: Nylon 6,6 birefringent 15-denier T=0.76 warp-knit. Black with thin ruby ribbon welt. Double slits reveal both stockings fully. Banker lamp warm catches shin. Green baize cool fill inner thigh. Compression gradient.',
  },
  {
    name: '12-platinum-chainmail-backless-casino',
    attire: 'She wears a platinum silver chainmail halter micro dress with completely bare back scooped past sacrum to absolute lowest spine. Halter ties behind neck. Thousands of 2mm platinum-plated rings. Ultra-short hemline. Full bare back nape to beyond sacrum. Platinum neutral reflects casino environment without color bias -- pure mirror-mosaic of surrounding light.',
    scene: 'High-roller pit: exclusive area rope and brass, mahogany table edge, crystal whiskey tumbler heavy, chandelier tiered warm above, slot LED distant bleed, suited security presence, cigar lounge adjacent glass wall, bourbon amber backlit bottles, chips stacked.',
    fabric: 'PLATINUM CHAINMAIL CASINO: European 4-in-1 platinum-plated 2mm ID. Platinum R=0.82 broadband neutral mirror. Each toroid fish-eye micro-image. Chandelier overhead: hundreds of warm tiny chandelier images across chainmail. Bourbon wall: amber bottle reflections warm. Halter V-strain nape. Bare back: chandelier light models every vertebra with warm highlight and shadow. Chain weight 2.4kg heavy drape. Felt green visible in ring reflections. Smoke wisps: volumetric scatter in inter-ring gaps catching chandelier light as tiny warm halos between platinum rings. Chip stack: small colored reflections.',
    hosiery: 'HOSIERY: Nylon 6,6 birefringent 10-denier T=0.87 ultra-sheer warp-knit. Nude platinum shimmer lace welt. Chandelier catches ultra-sheer warm. Chainmail fringe at hemline drapes over welt. Felt green reflected faint on inner thigh. Compression gradient.',
  },
  {
    name: '13-emerald-satin-spine-chain-casino',
    attire: 'She wears an emerald green liquid satin charmeuse halter micro dress with cutaway bare back connected by a thin diamond-studded chain draping in two loops across exposed spine from nape to waist. Halter high neck front. Ultra-short bias-cut hemline. Emerald satin liquid sheen front with bare back architecture connected only by jeweled chain catching every casino light.',
    scene: 'Casino bar floor: slot machine wall LED cycling close, marble walkway polished, chandelier warm overhead counterpoint, cocktail server tray passing, craps table felt green glow, constant energy motion, slot ticket on bar, ice melting in glass.',
    fabric: 'EMERALD CHARMEUSE SPINE-CHAIN: 19-momme silk warp-float anisotropic specular 3:1 elongated liquid look. Emerald absorption 600-700nm. Catenary drape body-mapping. Spine chain: 14K white gold with 3mm diamond simulant cabochons at 2cm intervals -- each stone high n=2.42 dispersing white light into spectral fire projecting tiny rainbows onto bare back skin. Chain two loops catenary against spine. Slot LED cycling: silk reflects changing colors -- green LED enhances emerald, red LED creates brown, blue LED creates teal -- silk becomes color palette responding to slot animation. Diamond stones: slot LED enters stones dispersing as colored spectral fans on skin.',
    hosiery: 'HOSIERY: Nylon 6,6 birefringent 12-denier T=0.82 ultra-sheer warp-knit. Black with thin emerald satin ribbon bow welt. Slot LED catches ribbon cycling. Marble reflects emerald below. Diamond chain caustics fall onto welt occasionally. Compression gradient.',
  },
  {
    name: '14-black-vinyl-extreme-cutout-casino',
    attire: 'She wears a jet black high-shine PVC vinyl micro dress with aggressive geometric cutouts: large triangle both sides from underarm to hip, deep V-cutout front sternum to navel, rectangular cutout center back exposing spine. Sleeveless. Black vinyl void with devastating bright Fresnel rim-light contouring every edge. Ultra-short hemline. Maximum geometric skin windows against mirror-black.',
    scene: 'Modern casino lounge: LED infinity mirror tunnel entrance, chrome fixtures everywhere, polished black granite bar, overhead downlight spots focused, cocktail molecular foam, DJ booth glass enclosed LED panel, security camera visible, premium liquor wall backlit.',
    fabric: 'BLACK VINYL CUTOUT ARCHITECTURE: PVC n=1.54 Ra<0.05 carbon-black. Normal: R=0.04 void. Fresnel Schlick grazing: near-total bright contour rim-light. Cutout edges: every cutout boundary creates NEW rim-light contour -- triangle sides, V-edges, rectangle sides ALL generate bright lines. Multiple cutouts multiply rim-light creating geometric constellation of bright contour lines on black void. LED infinity mirror: recursive reflection in tunnel reflected on vinyl creating infinite-regression pattern. Downlight spots: focused overhead creates strong top-down gradient -- bright shoulders fading to dark hemline. Through cutout windows: warm skin lit by same downlights showing in geometric shapes. Subsurface PVC glow corona at cutout edges where skin proximity scatters light into vinyl edge.',
    hosiery: 'HOSIERY: Nylon 6,6 birefringent 20-denier T=0.62 warp-knit. Black matte seamless extending vinyl void. Downlight catches shin as sole specular. LED infinity reflects in vinyl not nylon -- texture contrast. Compression gradient.',
  },
  {
    name: '15-rose-gold-sequin-waist-clasp-casino',
    attire: 'She wears a rose gold sequin micro dress completely backless held together only by a jeweled clasp at small of back at waist. No straps no back fabric. Thousands of 4mm rose gold sequins. Front deep plunging V. Ultra-short hemline. Entire back bare from shoulders to waist where ornate crystal clasp connects two sequined panels. Maximum sparkle front maximum skin back.',
    scene: 'Casino private gaming: exclusive room, dark wood ceiling coffered, crystal decanter bourbon on silver tray, leather-top card table, pendant brass spotlight single, wall sconces warm dim, heavy door ajar, velvet curtain half-drawn, monogrammed coaster.',
    fabric: 'ROSE GOLD SEQUIN BACKLESS: 4mm Cu-Sn rose gold alloy R=0.18@480nm to 0.65@580nm to 0.82@700nm warm rose selective. Crystal clasp: 15mm Swarovski crystal n=1.65 acting as central prismatic focal point projecting rainbow caustics onto lower back skin. Two panels converge at clasp creating hourglass. Pendant brass spotlight: single key warm light creates one bright zone on sequins with warm specular and shadowed sequins everywhere else. 8-20Hz stochastic warm rose sparkle. Bare back: pendant light models spine from shoulders to clasp. Dark wood ceiling: warm bounce-fill from above. Crystal decanter: amber liquid catching and projecting warm caustics.',
    hosiery: 'HOSIERY: Nylon 6,6 birefringent 15-denier T=0.76 warp-knit. Black with thin rose gold ribbon welt. Pendant catches ribbon as warm rose accent. Dark wood warm bounce on stockings. Compression gradient.',
  },

  // === SPEAKEASY / JAZZ LOUNGE (16-20) ===
  {
    name: '16-copper-scale-strapless-speakeasy',
    attire: 'She wears a hammered copper metallic strapless bandeau micro dress with thousands of tiny hammered concave dimple-mirrors 3mm across. Completely strapless held by body tension. Sweetheart neckline pushed very low. Extremely short hemline. Each tiny concavity a miniature parabolic mirror reflecting inverted micro-image of surroundings. Hammered copper warmth in intimate candlelight.',
    scene: 'Jazz speakeasy: live trio piano bass sax soft focus, exposed brick low arched ceiling, candle clusters amber glass 1800K flickering, worn leather banquettes, antique mirrors foxed, prohibition cocktail coupe, torn vintage poster, wax dripping.',
    fabric: 'HAMMERED COPPER STRAPLESS: Micro-concavities r=1.5-3mm depth 0.3mm randomly distributed. Each dimple: concave mirror f=r/2 creating inverted micro-image. Copper selective R warm. Candle 1800K flickering 1-3Hz: animated warm dancing in each tiny mirror -- hundreds of tiny flickering candle-images across surface. Jazz trio: musician shapes inverted in larger dimples. Foxed antique mirror: creates secondary diffuse reflection behind subject multiplying copper glow. Strapless horizontal compression. Wax dripping adds viscous-material textural reference. Brick warm diffuse bounce. Cook-Torrance roughness alpha=0.35 Beckmann distribution for inter-dimple flat areas.',
    hosiery: 'HOSIERY: Nylon 6,6 birefringent 15-denier T=0.76 warp-knit. Black with thin copper metallic thread welt. Candle catches welt as sole warm accent. Hammered-to-smooth transition at hemline. Brick bounce warm on stockings. Compression gradient.',
  },
  {
    name: '17-midnight-sheer-panel-corset-speakeasy',
    attire: 'She wears a midnight navy structured corset micro dress with sheer mesh side panels from underarm to hemline revealing skin, solid satin front and back with 14 steel boning extreme waist cinch, and open lace-up back through brass grommets. Sheer sides show structural boning through transparent mesh. Ultra-short hemline. Corset architecture visible through mesh windows.',
    scene: 'Hidden cocktail bar: behind unmarked door, low brick tunnel ceiling, single candle per table warm, absinthe fountain ornate brass dripping, cracked leather booth deep, vintage gramophone corner, prohibition-era bottles dusty, flickering gaslight replica, torn newspaper clipping.',
    fabric: 'MIDNIGHT CORSET MESH PANEL: Front/back 22-momme duchess satin midnight navy warp-float. Side panels: hexagonal mesh T=0.70 semi-transparent. Through mesh: skin visible AND steel boning channels visible as structural lines within sheer window -- corset engineering exposed. 14 steel bones: 4 visible through mesh as bright structural lines where bone crest catches light through sheer. Candle 1800K: warm animated light on satin panels with candle also visible through mesh illuminating skin. Brass grommets: constellation along spine. Lace-up tension radial wrinkles from each grommet. Absinthe fountain brass: warm secondary reflections. Mesh tension varies with breathing: inhale stretches mesh more transparent, exhale relaxes.',
    hosiery: 'HOSIERY: Nylon 6,6 birefringent 20-denier T=0.62 warp-knit. Black with thin midnight satin ribbon welt. Candle sole warm accent. Mesh-to-opaque stocking transition. Brass grommet accent. Compression gradient.',
  },
  {
    name: '18-scarlet-latex-micro-mini-speakeasy',
    attire: 'She wears a deep scarlet latex rubber micro-mini halter dress with hemline barely at upper thigh, halter behind neck bare back to lowest spine. Front V-neckline plunging. Scarlet latex catches every candle flame as brilliant red-orange specular streaks with Fresnel bright rim. Extremely short -- micro-mini length maximum leg exposure. Latex adhesion body-mapped zero gap.',
    scene: 'Intimate whiskey bar: barrel-stave walls, brass wall sconces warm pools, single-malt collection backlit amber, heavy oak bar centuries worn, leather stool brass nail trim, ice sphere cracking in glass, bitters bottles row, hand-written menu chalkboard.',
    fabric: 'SCARLET LATEX MICRO-MINI: Natural rubber vulcanized Ra<0.03 base. Scarlet 600-700nm transmission. n=1.52 Schlick Fresnel dramatic grazing rim-light creating bright scarlet contour. Micro-mini extreme: hemline barely past thigh creating maximum leg-to-dress ratio. Latex adhesion total body contact mapping every contour. Brass sconces warm pools: scarlet reflects warm amber-red in pool zones, dark absorption outside. Subsurface 0.3-0.5mm translucent creating luminous corona halo around specular. Whiskey amber backlit: warm environmental fill. Halter V-strain nape. Bare back: sconce warm on skin directly models spine. Oak bar: warm wood diffuse bounce. Ice sphere cracking: momentary highlight in glass.',
    hosiery: 'HOSIERY: Nylon 6,6 birefringent 15-denier T=0.76 warp-knit. Black with thin scarlet ribbon welt. Latex mirror to matte nylon transition. Sconce warm catches shin. Micro-mini reveals maximum stocking. Compression gradient.',
  },
  {
    name: '19-gold-mesh-extreme-bare-back-speakeasy',
    attire: 'She wears a gold metallic mesh halter micro dress semi-transparent with skin visible through fine metallic weave. Halter behind neck with completely bare back scooped to absolute lowest spine point. Deep cowl neckline draping low under mesh weight showing skin through metallic weave at decolletage. Ultra-short hemline. Gold mesh as warm metallic filter over visible skin.',
    scene: 'Art deco speakeasy: geometric brass fixtures overhead, green marble bar gold veining, velvet emerald curtains, etched glass dividers, crystal coupe pyramid, jazz ensemble corner, absinthe green glow, gilded mirror ornate.',
    fabric: 'GOLD MESH SPEAKEASY: Metallic gold-coated nylon mesh 0.8mm aperture. Gold R>0.80 above 550nm warm selective. Semi-transparent: skin visible through every mesh aperture as warm shadow beneath gold metallic lattice. Brass fixtures: matching warm gold reflections in mesh creating warm-on-warm reinforcement. Green marble: reflected green through mesh creating unusual gold-mesh-filtered-green on underside. Cowl: mesh weight creates deep drape, skin clearly visible through cowl mesh at decolletage. Bare back: no mesh at all, warm skin directly lit by brass fixtures. Emerald curtain backdrop: green complement to gold warm. Etched glass: creates dappled caustic pattern through glass onto mesh surface.',
    hosiery: 'HOSIERY: Nylon 6,6 birefringent 10-denier T=0.87 ultra-sheer warp-knit. Nude gold-shimmer with gold lace welt. Mesh-to-sheer transition at hemline: metallic to nylon transparency. Green marble reflects golden upward. Compression gradient barely visible.',
  },
  {
    name: '20-amethyst-sequin-double-slit-speakeasy',
    attire: 'She wears an amethyst purple sequin micro dress with double high slits both sides running from hemline past upper hip to waist. Sleeveless scoop neck. Thousands of 4mm amethyst sequins. Both slits open revealing both legs simultaneously. Ultra-short center panel. Deep purple sparkle with bilateral maximum leg exposure in candlelit intimacy.',
    scene: 'Underground wine bar: stone vaulted ceiling, candle clusters iron candelabra massive, wine barrel wall stacked, heavy oak trestle tables, red wine crystal catching candlelight, vintage maps wall, cobblestone floor worn, wax pooled on iron, muscat grape cluster.',
    fabric: 'AMETHYST SEQUIN DOUBLE-SLIT: 4mm amethyst-anodized Al. Amethyst selective: R>0.55 at 420-460nm violet + 620-660nm red creating additive purple. Candle 1800K ultra-warm: amethyst reflects warm creating rich warm-purple rather than cold purple. Double slits both sides: 8-20Hz stochastic purple sparkle flanking bilateral skin reveals. Center panel narrow maximum bilateral tension. Wine barrel warm wood diffuse. Red wine in crystal: deep crimson point of similar color temperature. Stone vault: diffuse warm overhead bounce. Iron candelabra: massive dark silhouette frame with candle points. Cobblestone floor: irregular diffuse reflection below.',
    hosiery: 'HOSIERY: Nylon 6,6 birefringent 15-denier T=0.76 warp-knit. Black with thin amethyst ribbon welt. Double slits reveal both stockings to welt. Candle catches ribbon warm. Wine-color ribbon accent. Compression gradient.',
  },

  // === ULTRA-LOUNGE BOTTLE SERVICE (21-25) ===
  {
    name: '21-holographic-strapless-ultra-micro-lounge',
    attire: 'She wears a holographic iridescent metallic strapless bandeau ultra-micro dress barely reaching upper thighs. Completely strapless extreme body tension. Holographic surface shifts through full spectrum teal-magenta-gold with micro-movement. Sweetheart neckline pushed very low. Aggressively minimal -- maximum iridescent drama minimum fabric.',
    scene: 'VIP bottle service: private booth velvet partition, LED underglow table purple, champagne magnum sparkler approaching bright, crystal flutes, contemporary dark luxury, security rope, DJ through glass wall bass shaking, fog low floor.',
    fabric: 'HOLOGRAPHIC ULTRA-MICRO: Multilayer Al/SiO2/TiO2 nano-stack full spectral interference. Strapless horizontal bust compression. Ultra-micro: extreme minimal coverage. Sparkler approaching: broadband white reveals maximum rainbow simultaneously across holographic surface. LED purple underglow: table-bounce upward creates unusual bottom-lit holographic -- angle-dependent color shift inverted from normal overhead lighting. Fog low floor: volumetric scatter below creating haze around legs. Champagne flute: catching holographic color-spill. Full spectral shift teal-magenta-gold continuous with viewing angle creating living rainbow following body contour.',
    hosiery: 'HOSIERY: Nylon 6,6 birefringent 10-denier T=0.87 ultra-sheer warp-knit. Nude with holographic metallic thread welt matching dress rainbow. LED purple catches ultra-sheer. Fog haze around ankles. Sparkler bright catches welt. Compression gradient.',
  },
  {
    name: '22-black-lace-sheer-corset-lounge',
    attire: 'She wears a jet black French lace over nude illusion mesh structured corset micro dress. Intricate floral lace pattern visible over nude mesh creating illusion of lace floating on skin. 14 steel boning. Sweetheart bustline. Open lace-up back chrome grommets. Ultra-short hemline. Lace-on-illusion creates maximum skin-visibility while architecturally structured.',
    scene: 'Upscale bottle lounge: champagne tower crystal tiers, LED color-wash wall panels shifting slow, chrome fixtures, black leather seating, massive mirror behind bar, ice bucket hammered silver, DJ visible elevated, ambient bass energy.',
    fabric: 'BLACK LACE ILLUSION CORSET: French Chantilly lace floral pattern on 15-denier nude illusion mesh T=0.76. Through nude mesh: skin visible between lace motifs creating skin-visible zones framed by black lace pattern. Lace opacity varies: dense floral centers fully opaque, connecting threads semi-transparent, open mesh zones fully skin-visible. 14 steel bones visible through nude mesh as structural lines between lace motifs. Chrome grommets along spine. LED color-wash: colors pass through mesh tinting visible skin beneath creating colored-skin-under-black-lace effect. Mirror behind bar: recursive reflection of lace pattern multiplied. Champagne tower: crystal catching and projecting warm caustics onto lace surface. Sweetheart through lace creating patterned edge.',
    hosiery: 'HOSIERY: Nylon 6,6 birefringent 15-denier T=0.76 warp-knit. Black with thin lace trim welt matching dress pattern. LED color catches lace-filtered. Mirror reflects doubled lace below. Compression gradient.',
  },
  {
    name: '23-silver-chainmail-micro-mini-shorts-lounge',
    attire: 'She wears a silver metal chainmail one-shoulder micro-mini dress with matching silver chain shorts-liner peeking below hemline. Single strap right shoulder. Thousands of 2mm interlocking silver rings. Micro-mini barely past thighs. Deliberate shorts peek creates layered chain edge. Heavy 2.3kg silver flows liquid-metal. Neutral mirror-mosaic reflecting entire lounge environment.',
    scene: 'Modern lounge: LED-lit acrylic furniture glowing blue, massive video wall abstract, chrome everywhere, bottle sparklers approaching, fog machine light beams visible, black marble floor mirror polish, cocktail smoked glass cloche.',
    fabric: 'SILVER CHAINMAIL MICRO-MINI: European 4-in-1 silver-plated 2mm ID. Silver R=0.88 broadband neutral. Video wall: abstract animation reflected as continuously-changing color pattern across silver -- body becomes animated display mirror. One-shoulder diagonal drape. Micro-mini length: chain hangs barely past thighs. Shorts-liner 1.5mm smaller rings visible 1-2cm below main hemline creating size-differentiated doubled edge. Sparkler broadband: reveals maximum reflection brilliance. Black marble: perfect mirror below creating doubled inverted silver constellation. Fog beams: volumetric scatter between rings. Chain weight momentum persistence after movement.',
    hosiery: 'HOSIERY: Nylon 6,6 birefringent 10-denier T=0.87 ultra-sheer warp-knit. Nude silver-shimmer metallic welt. Chainmail shorts-liner over welt triple-layer edge. Black marble reflects doubled. Video wall catches ultra-sheer color wash. Compression gradient.',
  },
  {
    name: '24-burgundy-vinyl-wrap-extreme-slit-lounge',
    attire: 'She wears a deep burgundy high-shine PVC vinyl wrap micro dress with crossover V maximum decolletage, wrap tie left hip with extreme high slit running from tie point past hip to hemline on left. Asymmetric: right side full panel, left side extreme slit from waist. Burgundy vinyl near-mirror catches lights as dark wine-red specular streaks. Maximum asymmetric leg exposure.',
    scene: 'Dark lounge: overhead pendants brass focused spots, champagne in coupe crystal, mirror panels floor-ceiling reflections, leather booth deep, low table candle flickering, DJ set transitioning, cocktail smoke trail, crushed velvet cushions scattered.',
    fabric: 'BURGUNDY VINYL WRAP: PVC n=1.54 Ra<0.05 polish. Burgundy absorption 430-560nm deep wine. Subsurface translucent 0.3-0.5mm creating luminous corona. Schlick grazing near-total bright burgundy rim. Wrap radial compression from knot left. Extreme slit: wrap opens from tie at left hip creating maximum left-leg exposure. Brass pendant spots: focused warm on vinyl creating hot specular zones with dark absorption outside spots. Candle 1800K: warm animated accent. Mirror panels: recursive multiplication of dark wine reflections. Vinyl rigid: slit holds open without flutter. Velvet cushion backdrop: warm diffuse.',
    hosiery: 'HOSIERY: Nylon 6,6 birefringent 15-denier T=0.76 warp-knit. Black with thin burgundy satin ribbon welt. Extreme slit reveals full stocking left. Pendant brass catches shin. Mirror doubles stocking image. Compression gradient.',
  },
  {
    name: '25-pearl-white-beaded-backless-lounge',
    attire: 'She wears a pearl white crystal-beaded halter micro dress with completely bare back scooped past sacrum to lowest spine. Halter ties behind neck. Thousands of 2mm faceted crystal beads covering surface. Ultra-short hemline. Full bare back. Crystal beads create prismatic rainbow fire -- sharp spectral dispersion scattering micro-rainbows onto nearby surfaces from every bead.',
    scene: 'Luxury hotel lounge: Carrara marble bar, gold fixtures, crystal chandelier massive, mirror panels reflections, champagne tower, white orchids floating bowls, soft gold ambient, live pianist corner, gold-leaf dessert plate.',
    fabric: 'CRYSTAL BEAD PRISMATIC BACKLESS: 2mm faceted Swarovski n=1.65 high-dispersion. Each bead dispersive: white light enters exits as spectral fan projecting tiny rainbow on nearby surfaces. Thousands simultaneously: room filled with micro-rainbow projections. Chandelier warm: enters crystals creating warm spectral fans. Marble white: bounce-fill enhancing luminosity. Mirror panels: recursive multiplication of prismatic projections. Halter V-strain. Bare back: chandelier light directly on skin with crystal rainbow projections falling on bare back from nearby beads at dress edges. Dense 280/cm^2 maximum prismatic density. Crystal weight 1.6kg gentle pull.',
    hosiery: 'HOSIERY: Nylon 6,6 birefringent 10-denier T=0.87 ultra-sheer warp-knit. Nude pearl-shimmer crystal lace welt. Rainbow projections fall on stockings as chromatic spots. Chandelier warm catches ultra-sheer. Marble reflects doubled below. Compression gradient.',
  },

  // === PENTHOUSE SKY LOUNGE (26-30) ===
  {
    name: '26-gold-vinyl-cutaway-spine-chain-penthouse',
    attire: 'She wears a bright gold high-shine PVC vinyl halter micro dress with cutaway bare back connected by three cascading gold chains across exposed spine from nape to waist. Halter high neck front. Gold vinyl near-mirror catches city panoramic as warm distorted reflections. Ultra-short hemline. Gold-on-gold: vinyl and chain unified warm metallic with maximum back architecture.',
    scene: 'Penthouse panoramic: floor-ceiling glass three walls corner, Strip view south golden, mountains dark west, personal bar marble, designer pendant light, modern art wall, fireplace linear gas, stars desert sky clear, champagne coupe, city carpet below.',
    fabric: 'GOLD VINYL SPINE-CHAIN: PVC n=1.54 Ra<0.05 gold metallic pigment. Gold selective R>0.80 above 550nm warm. Three chains 14K gold-plate cascading loops across bare back: each chain catenary against spine, 3mm links as tiny warm mirrors. Chain sway 0.5-1.5Hz pendulum. Vinyl reflects city panoramic as warm-gold distorted wrap-around panoramic. Fireplace linear: warm dancing on vinyl creating animated gold hot spots. Chain-on-skin: warm metal pressing creating faint compression. Subsurface PVC glow. Schlick grazing bright gold rim. Strip skyline: elongated warm building-light streaks on curved vinyl surface. Stars through glass: negligible but atmospheric reference.',
    hosiery: 'HOSIERY: Nylon 6,6 birefringent 15-denier T=0.76 warp-knit. Black with thin gold metallic ribbon welt. City panoramic catches ribbon. Fireplace warm on stockings. Chain gold accent at welt. Compression gradient.',
  },
  {
    name: '27-electric-blue-sequin-double-slit-penthouse',
    attire: 'She wears an electric blue sequin micro dress with dramatic double high slits both sides running from hemline past upper hip to waist. Sleeveless deep scoop neck. Thousands of 4mm electric blue sequins. Both slits open revealing both legs. Ultra-short center panel. Electric blue sparkle against night city panoramic with bilateral maximum exposure.',
    scene: 'Sky penthouse: corner unit three glass walls panoramic, neon art installation purple wall, low modern white chrome furniture, in-unit spa pool LED blue small, personal DJ setup, skyline wrapping three sides, caviar service, helicopter distant lights.',
    fabric: 'ELECTRIC BLUE SEQUIN PENTHOUSE: 4mm electric-blue-anodized Al. Electric blue selective: strong R>0.70 at 450-490nm. City panoramic three walls: warm golden city-light reflections scattered across blue creating warm-in-cold contrast points. Neon art purple: purple reflected from blue creates unusual violet tone on neon-facing sequins. Spa pool LED blue: reinforces blue from below creating monochromatic blue zone. 8-20Hz stochastic blue sparkle. Double slits bilateral: center panel narrow under extreme tension with sequin alignment following stress lines. Three-wall wrap panoramic creates continuous city reflection. Helicopter: tracking light crossing sequin field.',
    hosiery: 'HOSIERY: Nylon 6,6 birefringent 15-denier T=0.76 warp-knit. Black with thin electric blue ribbon welt. Double slits reveal both stockings. City warm catches shin. Neon purple catches welt. Pool blue underglow. Compression gradient.',
  },
  {
    name: '28-black-mesh-panel-extreme-backless-penthouse',
    attire: 'She wears a jet black bodycon micro dress with entirely sheer mesh back from nape to hemline -- entire back panel transparent mesh with skin visible through black mesh. Solid opaque front and sides. Sleeveless high neck. Ultra-short hemline. Front: sophisticated opaque black. Back: entire surface sheer revealing every contour of spine shoulders blades through transparent mesh.',
    scene: 'Modern penthouse bar: walnut bar brass fixtures, panoramic window floor-ceiling one wall, designer pendant sculptural, art photography large-format, bourbon collection backlit, Barcelona chair leather, city below, single orchid stem, jazz vinyl.',
    fabric: 'BLACK MESH PANEL BACKLESS: Front polyester-elastane 4-way opaque black stretch. Entire back panel: hexagonal mesh T=0.70 semi-transparent black nylon. Through mesh: complete back anatomy visible -- shoulder blades, spine ridge, muscle definition, lower back curve ALL visible through transparent back. Pendant light: warm illumination passes through mesh illuminating skin with hex-grid shadow pattern on back skin. Panoramic window: city lights visible through mesh creating city-lights-on-skin layered effect. Mesh tension with breathing: inhale stretches mesh more transparent, exhale compresses less transparent. Front-to-back: abrupt transition opaque to fully transparent at side seams. Bourbon backlit: warm amber environmental fill.',
    hosiery: 'HOSIERY: Nylon 6,6 birefringent 20-denier T=0.62 warp-knit. Black seamless extending opaque void from front. Pendant catches shin. City reflects faint through window. Mesh-to-opaque stocking transition. Compression gradient.',
  },
  {
    name: '29-rose-gold-scale-wrap-penthouse',
    attire: 'She wears a rose gold metallic scale-sequin wrap micro dress where overlapping 6mm scales create armor mermaid texture. Crossover V maximum decolletage, wrap tie right hip asymmetric hemline -- right ultra-short. Scales shift copper-to-pink-to-gold with movement. Three-quarter pushed sleeves. Wrap opens at hip. Rose gold armor against penthouse luxury.',
    scene: 'Penthouse living room bar: open plan massive, floor-ceiling glass corner, LED strip warm ceiling, fire table rectangular flames, Calacatta marble island bar, wine fridge glowing, abstract bronze sculpture, scattered coasters, city panoramic two walls.',
    fabric: 'ROSE GOLD SCALE WRAP: 6mm elongated hex scales overlapping 60%. Each scale individual Cu-Sn rose gold thin-film iridescence copper-pink-gold. Scale tilt varies with curvature: ribs copper (normal), waist pink (45-degree), hip gold (grazing). Wrap compression from knot right hip: scales compressed at knot showing all three colors in tight radius. Asymmetric shorter right. Fire table: warm 1-3Hz animated flame catching scales as dancing warm pattern. LED strip warm overhead: reinforces rose warmth. Marble: bright bounce from below. City panoramic: warm building lights reflected in individual scales as tiny architectural images. Scale edges: thin dark shadow lines between overlapping scales creating geometric texture.',
    hosiery: 'HOSIERY: Nylon 6,6 birefringent 15-denier T=0.76 warp-knit. Black with thin rose gold metallic ribbon welt. Fire catches welt warm. Marble bounce illuminates from below. Short wrap reveals welt right. Compression gradient.',
  },
  {
    name: '30-diamond-white-vinyl-strapless-penthouse',
    attire: 'She wears a diamond white high-shine PVC vinyl strapless bandeau micro dress. Completely strapless extreme body tension. White vinyl near-mirror acts as projection canvas displaying entire penthouse light environment as colorful reflections. Sweetheart neckline pushed very low. Extremely short hemline. White vinyl: maximum reflective canvas capturing city panoramic Strip skyline firelight everything.',
    scene: 'Ultimate penthouse: highest floor three glass walls, entire Strip visible south warm, mountains dark west, airport lights east linear, stars above desert sky, personal champagne bar marble, Baccarat crystal, white grand piano, candles everywhere, top of the world.',
    fabric: 'DIAMOND WHITE VINYL PROJECTION: PVC n=1.54 Ra<0.05 white metallic pigment broadband R=0.82 neutral. White vinyl becomes projection canvas: Strip south reflects as warm golden panoramic streaks. Mountains west: dark blue-grey zone. Airport east: linear runway light pattern. All reflected simultaneously creating chromatic environmental map wrapped around body. Subsurface PVC translucent glow corona. Schlick grazing near-total bright white rim. Strapless horizontal compression. Candles 1800K: warm animated points scattered across white surface. Grand piano: large dark reflection on hip area. Stars through glass: atmospheric scintillation reference. Three-wall panoramic wrap-around reflection.',
    hosiery: 'HOSIERY: Nylon 6,6 birefringent 10-denier T=0.87 ultra-sheer warp-knit. Nude diamond-shimmer with crystal lace welt. Strip panoramic catches ultra-sheer warm. Three-wall reflections on stockings. Candle warm accent on welt. Compression gradient barely visible.',
  },
];

async function generateEdit(concept, inputImage, index, retries = 0) {
  const expression = expressions[index % expressions.length];
  const prompt = buildPrompt(concept.attire, concept.scene, concept.fabric, concept.hosiery, expression);
  const wordCount = prompt.split(/\s+/).length;

  console.log(`\n${'='.repeat(60)}`);
  console.log(`[${index + 1}/30] ${concept.name}`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Prompt: ${wordCount} words | Expression: ${expression.substring(0, 50)}...`);

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
      imageConfig: { aspectRatio: '4:5', imageSize: '1K' },
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
      const wait = 70;
      console.log(`Rate limited (${retries + 1}/10) - waiting ${wait}s... [${error.substring(0, 150)}]`);
      await new Promise(r => setTimeout(r, wait * 1000));
      return generateEdit(concept, inputImage, index, retries + 1);
    }
    throw new Error(`API ${response.status}: ${error.substring(0, 300)}`);
  }

  const data = await response.json();
  if (data.candidates?.[0]?.content?.parts) {
    for (const part of data.candidates[0].content.parts) {
      if (part.text && !part.thought) console.log(`Model: ${part.text.substring(0, 100)}...`);
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

// Check which concepts already exist on disk (skip them)
const existingFiles = await fs.readdir(OUTPUT_DIR).catch(() => []);
const existingNums = new Set(existingFiles.filter(f => f.endsWith('.png')).map(f => parseInt(f.split('-')[0])));

console.log(`\n=== V11 GAZE - 2K + 20/min - DIRECT EYE CONTACT + SENSOR PHYSICS ===`);
console.log(`Range: ${s + 1}-${e} | Input: ${path.basename(INPUT_IMAGE)}`);
console.log(`Output: ${OUTPUT_DIR}`);
console.log(`Already generated: ${existingNums.size} | Skipping: [${[...existingNums].sort((a,b)=>a-b).join(',')}]\n`);

for (let i = s; i < Math.min(e, concepts.length); i++) {
  const conceptNum = i + 1;
  if (existingNums.has(conceptNum)) {
    console.log(`SKIP [${conceptNum}/30] ${concepts[i].name} (already exists)`);
    results.push({ name: concepts[i].name, path: 'exists', ok: true });
    continue;
  }
  try {
    const fp = await generateEdit(concepts[i], INPUT_IMAGE, i);
    results.push({ name: concepts[i].name, path: fp, ok: !!fp });
  } catch (err) {
    console.error(`FAIL: ${concepts[i].name} - ${err.message}`);
    results.push({ name: concepts[i].name, path: null, ok: false, err: err.message });
  }
  if (i < Math.min(e, concepts.length) - 1) {
    console.log('Waiting 41s...');
    await new Promise(r => setTimeout(r, 41000));
  }
}

console.log(`\n${'='.repeat(60)}`);
console.log('V11 GAZE RESULTS');
console.log(`${'='.repeat(60)}`);
const ok = results.filter(r => r.ok);
console.log(`Success: ${ok.length}/${results.length}`);
results.forEach(r => console.log(`  ${r.ok ? 'OK' : '!!'} ${r.name}${r.err ? ': ' + r.err : ''}`));
console.log(`\nOutput: ${OUTPUT_DIR}`);

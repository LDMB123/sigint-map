#!/usr/bin/env node

/**
 * V8 NIGHTLIFE - 30 CONCEPTS, 6 SETTINGS, BOLDER ATTIRE, 4K
 *
 * Settings: Vegas bars, nightclubs, rooftop pools, hotel lobbies, casino floors, champagne lounges
 * Attire: Pushing harder than V7 - lower backs, shorter hems, wider cutouts, bolder materials
 * Physics: 870-920w validated sweet spot
 * Reference: 518355716_10109335899644328_1380496532632646402_n.jpeg
 * Output: 4K PNG
 */

import fs from 'fs/promises';
import path from 'path';

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) { console.error('GEMINI_API_KEY not set'); process.exit(1); }

const MODEL = 'gemini-3-pro-image-preview';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
const OUTPUT_DIR = process.env.OUTPUT_DIR || path.join(process.env.HOME, 'nanobanana-output', 'vegas-v8-nightlife');
const INPUT_IMAGE = process.argv[2] || '/Users/louisherman/Documents/518355716_10109335899644328_1380496532632646402_n.jpeg';

await fs.mkdir(OUTPUT_DIR, { recursive: true });

function buildPrompt(attire, scene, fabricPhysics, hosieryPhysics) {
  return `Edit this photograph into an ultra-raw real-life nightlife photograph indistinguishable from an unretouched candid shot from a real night out. Raw documentary nightlife photography. ${attire}

SCENE: ${scene}

CAMERA SENSOR PHYSICS: Canon EOS R5 Mark II full-frame 45MP stacked BSI-CMOS sensor with 36x24mm active silicon area. RF 50mm f/1.2L USM wide open at f/1.2 creating razor-thin 5cm depth-of-field plane focused at 2.2m subject distance. ISO 3200 generating authentic high-ISO luminance noise following Poisson photon-counting statistics sigma=sqrt(N_photons) in shadow regions with SNR=28dB at midtones and visible chroma noise as red-blue channel decorrelation in underexposed zones. Shutter 1/125s allowing slight motion blur on gesturing hands. 759-point dual-pixel phase-detect AF locked precisely on nearest iris with gentle focus roll-off on far shoulder. 15-blade circular aperture producing creamy oval bokeh discs with onion-ring concentric artifact from aspherical element. Barrel distortion 0.8% at close focus distance. Chromatic aberration 0.3px purple fringing on maximum-contrast edge transitions at frame corners. White balance tungsten 3200K but mixed venue lighting creates unresolved color temperature casts across different spatial zones. Available light only - absolutely no flash used - crushed blacks where signal falls below sensor noise floor creating true zero detail. Sensor micro-lens array vignetting 0.7 stop at corners.

3D GLOBAL ILLUMINATION LIGHT TRANSPORT: Primary overhead recessed tungsten halogen track spots at 2800K creating hard directional pools with sharp penumbral shadow edges - NOT diffused fashion lighting. Secondary practical neon bar signage casting saturated colored spill with hard color boundaries following inverse-square falloff I=Phi/(4*pi*r^2). Tertiary weak distant ceiling fluorescent at 3-stop underexposure as faint cool fill. Steep 4-stop luminance gradient from bar surface to dark booths. NO supplemental fill light - deep unrecoverable shadows on shadow-side of face at 5+ stops below key creating true black zero detail. Mixed color temperature: 2800K tungsten warm on skin vs 4100K fluorescent blue-green background contamination. Multi-bounce warm color interreflection from mahogany bar surface adds 300K to indirect shadow fill. Beer glass caustic projection on bar surface from overhead spot refraction through curved glass. Ambient occlusion darkening at body-bar contact zones. Volumetric light scatter through atmospheric haze particles.

SKIN BIO-OPTICAL RENDERING: Monte Carlo subsurface scattering simulation through anatomically accurate 3-layer epidermis-dermis-hypodermis biological model. Melanin absorption coefficient mu_a=6.6*C_mel*(lambda/500nm)^(-3.33) with C_mel concentration varying 0.01-0.05 across different body regions. Oxygenated hemoglobin HbO2 absorption peaks at 542nm and 576nm creating warm flush visible at cheeks earlobes decolletage knuckles inner wrists. Deoxygenated hemoglobin Hb creating blue-purple undertone at temples inner wrists where venous return dominates. Hypodermis deep forward-scatter anisotropy factor g=0.85 creating translucent backlit glow effect at thin-tissue ear helices and nostril edges. Real completely unretouched skin texture: visible pores at nasal ala and cheeks as tiny shadow dots, expression lines at forehead and periorbital zone, authentic complexion with absolute zero smoothing or airbrushing. Sebaceous oil creating T-zone sheen on forehead nose chin catching hard tungsten as irregular specular reflection patches. Fine vellus hair on forearms and jawline catching rim light as bright individual fiber strands. Light perspiration moisture on upper lip and temples from warm bar environment appearing as micro-specular water droplets. Preserve face bone structure eye color and expression exactly matching original.

${fabricPhysics}

${hosieryPhysics}

RAW PHOTOGRAPHIC IMPERFECTIONS: ISO 3200 sensor noise grain texture across entire image especially visible in shadow regions and dark tones. Subtle motion blur on fingertips from natural hand gesture at 1/125s shutter speed. Flyaway hair strands catching backlight at different focal plane rendered as soft bright out-of-focus streaks. Background bokeh with colored neon shapes as large soft discs. Foreground cocktail glass edge as out-of-focus refraction blur in near field. Faint lens flare from brightest neon source as veiling glare and ghosting hexagonal aperture artifact. Crumpled cocktail napkin on bar surface. Condensation ring from cold glass. Another patron's elbow visible at extreme frame edge. Micro lens dust shadow visible in upper corner as faint dark circle. Barrel distortion pulling straight lines at frame edges. No retouching no skin smoothing no color grading - straight out of camera RAW file with white balance adjustment only. Preserve face expression bone structure and all identifying features identical to original photograph.`;
}

const concepts = [
  // === VEGAS COCKTAIL BARS (1-5) ===
  {
    name: '01-red-sequin-ultra-backless',
    attire: 'She wears a scarlet red sequin halter micro dress with high neckline in front and dramatically bare back scooped past the sacrum to the very lowest point of her spine with thin crossed straps creating X across bare back. Thousands of 4mm red sequins. Ultra-short hemline barely covering. The extreme low-back cut goes lower than conventional backless reaching maximum exposure. Red sequins catch every warm bar light as scattered fire.',
    scene: 'Gritty real Vegas strip bar 2am: scratched dark bar top ring stains, rocks glass melting ice, neon beer signs casting amber-red-blue spill, cracked vinyl stools, bartender blurred pouring, tip jar crumpled bills, warm tungsten spots dust in beam, raw authentic.',
    fabric: 'SEQUIN OPTICS: 4mm scarlet aluminum paillettes pivot-sewn on black mesh. Scarlet dye over reflective base: R=0.72 above 600nm warm red with absorption below 560nm. Each sequin pivots 15-degree range creating 8-20Hz stochastic sparkle from micro-body-movement. Neon multi-color spill: different colors reflect from different-angled sequins across body creating polychromatic scatter. Halter tension: V-strain from neck with taut alignment at chest. X-cross back straps: two tension lines crossing at mid-spine framing maximum bare skin exposure. Ultra-low back: bare skin extends below conventional backless limit showing full lumbar contour.',
    hosiery: 'HOSIERY: Black thigh-high stockings thin red metallic welt. 15-denier T=0.76 matte black. Red welt catches neon as specular accent bridging sequin sparkle above to matte dark below.',
  },
  {
    name: '02-silver-lame-corset-extreme',
    attire: 'She wears a liquid silver metallic lamé structured corset micro dress with dramatically low sweetheart bustline pushing up to maximum, 16 steel boning channels creating extreme waist cinch, and fully open lace-up back through chrome grommets from nape to sacrum. Extremely short flared peplum hemline. The 16-bone corset creates the most dramatic hourglass ratio possible. Silver lamé reflects entire bar as warped funhouse mirror.',
    scene: 'Dark underground Vegas jazz lounge: upright bass stage blur, warm amber single spot, worn leather bar decades of patina, dirty martini olive, signed jazz photos exposed brick, Edison bulbs cloth cord, intimate.',
    fabric: 'SILVER LAMÉ CORSET: Aluminum vapor-deposited metallic warp with polyester weft. Silver R=0.88 broadband neutral mirror. 16 steel bones (4 more than standard) creating extreme waist compression with smooth conical profile. Each bone ridge: hard specular-to-shadow transition line. Peplum flare: lamé springs outward from waist creating fluted reflective surface with concave-convex alternating geometry. Chrome grommets R=0.68 as bright constellation along fully exposed spine. Lace tension: radiating V-wrinkles from each grommet. Sweetheart neckline extremely low: maximum convex reflector geometry at bustline.',
    hosiery: 'HOSIERY: Black thigh-high stockings silver thread lace welt. 15-denier T=0.76 matte black. Silver lace catches amber spot as scattered warm points echoing lamé above.',
  },
  {
    name: '03-emerald-velvet-wrap-ultra',
    attire: 'She wears a deep emerald crushed velvet wrap micro dress with crossover V showing maximum decolletage, wrap tie at left hip creating dramatically asymmetric hemline with left side ultra-short. Long fitted sleeves. Crushed velvet creates living shimmer-dark pattern. The wrap opens at hip tie revealing full upper thigh on shorter side. Rich saturated emerald.',
    scene: 'Upscale Vegas cocktail bar: dark walnut bar brass rail, crystal rocks glasses amber spirits, cigar box, single brass dome pendant dramatic key, art deco mirror oxidized patina, leather banquette, absinthe fountain.',
    fabric: 'CRUSHED VELVET WRAP: Viscose rayon pile 2.5mm chaotic crush creating 6D BTF. Emerald dye: broadband absorption 600-700nm red with 520-555nm green transmission. Aligned pile streaks: brilliant emerald shimmer where hundreds of fibers simultaneously catch specular. Anti-aligned valleys: 95% absorption as deep matte. Wrap crossover V: converging crush patterns with complex fold interference at neckline. Asymmetric tie: wrap tension creates radial gathering from hip knot with shorter left side exposing maximum thigh. Pile direction reversal at fold lines creates shimmer-dark transition at each wrap fold.',
    hosiery: 'HOSIERY: Black thigh-high stockings thin emerald ribbon bow outer welt. 15-denier T=0.76 matte black. Green ribbon bridges velvet. Brass pendant catches ribbon as warm-tinted green accent. Short side reveals stocking welt.',
  },
  {
    name: '04-black-vinyl-extreme-slit',
    attire: 'She wears a jet black high-shine PVC vinyl one-shoulder micro dress with extreme high slit on right side running from hemline all the way past upper hip. Single strap left shoulder. Black vinyl near-mirror finish reflects entire bar as dark distorted panoramic image. Extreme slit opens with any movement revealing full leg to hip bone. Ultra-short hemline on non-slit side.',
    scene: 'Modern Vegas casino bar: slot LED color-bleed multicolor flicker through doorway, dark granite bartop, brass dome pendant overhead key, cocktail napkin under drink, patrons blurred far end, casino energy electric, urgent.',
    fabric: 'BLACK VINYL PHYSICS: PVC calendered n=1.54 carbon-black pigmented Ra<0.05 microns optical polish. Fresnel R_0=4.6% at normal: dark mirror reflecting dim environment against near-black substrate. Schlick: R rises dramatically at grazing creating bright rim-light contour traces. Casino slot LED: multicolor stochastic flicker reflects as constantly-shifting chromatic streaks on dark mirror. One-shoulder asymmetry: diagonal tension across torso. Extreme slit at 45-degree bias grain: maximum elastic opening. Slit edge catches direct light as brilliant specular line from hip to hem. Carbon-black absorbs 99% transmitted light creating void between surface reflections.',
    hosiery: 'HOSIERY: Black thigh-high stockings satin welt. 15-denier T=0.76 matte black. Mirror-vinyl to matte-nylon transition at hemline. Extreme slit reveals full stocking length. Casino LED catches vinyl not stockings creating visual boundary.',
  },
  {
    name: '05-gold-sequin-strapless-ultra',
    attire: 'She wears a bright gold sequin strapless bandeau ultra-micro dress barely reaching upper thighs. Completely strapless held by extreme body tension. Sweetheart neckline pushed dramatically low. Thousands of 5mm gold sequins creating maximum reflective brilliance. The dress is aggressively minimal - maximum coverage by sparkle minimum coverage by fabric. Every light source in the bar multiplied by thousands of gold mirrors.',
    scene: 'Old-school Vegas high-roller: gold-leaf coffered ceiling recessed halogens, champagne hammered silver bucket, antiqued mirror panels infinite reflections, warm amber spots, emerald velvet banquette, black lacquer bar gold leaf.',
    fabric: 'GOLD SEQUIN OPTICS: 5mm gold-anodized aluminum paillettes pivot-sewn black mesh. Gold selective: R>0.80 above 550nm warm, R<0.40 below 480nm cool. Large 5mm: dramatic 3-8Hz slow shimmer from body sway. Antiqued mirrors: infinite recursive reflections multiplying gold sparkle. Strapless extreme tension: horizontal bust compression with ultra-low sweetheart creating maximum convex reflector geometry at neckline edge. Gold ceiling: warm indirect fill adds to already-warm gold palette. Ultra-micro hemline: sequin field terminates high with maximum leg exposure below.',
    hosiery: 'HOSIERY: Nude gold-shimmer thigh-high stockings gold-thread lace welt. 10-denier T=0.87 barely-there warm gold extending palette. Mirror panels reflect stockings creating doubled shimmer.',
  },

  // === NIGHTCLUB / DANCE FLOOR (6-10) ===
  {
    name: '06-electric-blue-bodycon-backless',
    attire: 'She wears an electric blue fluorescent stretch bodycon halter micro dress with completely bare back scooped to the lowest point of spine. Halter ties behind neck. Electric blue fluoresces vivid under UV club lighting creating apparent self-luminous glow. Body-gripping 4-way stretch maps every contour zero ease. Ultra-short hemline. Full bare back from nape to sacrum against UV-glowing blue front.',
    scene: 'Vegas megaclub dance floor: massive LED wall cycling blue-purple-magenta behind DJ booth, 100+ bodies in blur motion, laser beams cutting through thick haze, bass speaker cones visible vibrating, UV strips along ceiling creating fluorescent glow on white clothing, strobe freeze-frame moments, sweat moisture in air, sensory overload.',
    fabric: 'FLUORESCENT BODYCON: Polyester-elastane 85/15 with fluorescent optical brightener. Electric blue: 450-490nm transmission with UV-reactive component absorbing 365nm re-emitting 470nm Stokes shift quantum yield phi=0.45. Under UV strips: fabric radiates brighter than reflection creating apparent self-luminous glow against dark club. 4-way stretch body tension: skin-contact adhesion mapping every contour. Halter tie: V-strain pattern. LED wall: cycling colored backlight creates constant color-shift on blue surface. Strobe: freezes fluorescent glow as sharp bright frame. Laser beams: narrow coherent lines crossing fluorescent surface.',
    hosiery: 'HOSIERY: Black thigh-high stockings thin electric blue ribbon welt. 15-denier T=0.76 matte black. UV makes blue ribbon fluoresce matching dress glow. Dark club makes matte stockings nearly invisible.',
  },
  {
    name: '07-rose-gold-sequin-one-shoulder',
    attire: 'She wears a rose gold micro-sequin one-shoulder micro dress at extreme 70/cm^2 density. Single wide strap over right shoulder leaving entire left shoulder arm and side completely bare. Tiny 3mm sequins creating ultra-dense shimmer surface. Extremely short hemline. The asymmetric cut maximizes bare skin on left side against maximum-density rose gold sparkle on right.',
    scene: 'VIP nightclub elevated section: velvet rope foreground blur, bottle service with sparklers approaching in background as bright starburst, LED wall color wash, private booth low table, dark intimate but club energy, champagne flutes catching light.',
    fabric: 'MICRO-SEQUIN OPTICS: 3mm rose gold at 70/cm^2 extreme density (2.8x standard). Copper-gold alloy warm pink-shifted R=0.72 from copper absorption below 500nm. Lower mass faster pivot: 15-30Hz fine shimmer. Sparkler approach: thousands of bright point reflections across dense sequin field creating firework-mirror effect. One-shoulder: diagonal strain from strap creating directional alignment gradient across torso. Bare left side: warm club ambient on skin contrasts sparkle-saturated right side. VIP LED wash: saturated color projects through sequin field.',
    hosiery: 'HOSIERY: Nude rose-tinted thigh-high stockings rose gold thread lace welt. 10-denier T=0.87 barely-there warm rose. LED color wash catches ultra-sheer nylon as chromatic tinted glow.',
  },
  {
    name: '08-white-satin-corset-club',
    attire: 'She wears a bone-white satin structured corset micro dress with sweetheart bustline pushed dramatically low, 14 steel boning channels extreme waist cinch, and fully open lace-up back through chrome grommets. Extremely short hemline. White satin acts as projection screen for every colored club light creating chromatic light map across body. Corset creates maximum structural drama.',
    scene: 'Main floor nightclub: massive moving-head wash lights projecting color across crowd, CO2 cannon burst creating white fog column in background, bass drop moment, hands raised crowd blur, LED ceiling panels, bottle in ice bucket on elevated platform, sweaty intense energy.',
    fabric: 'WHITE SATIN CORSET: 22-momme heavy duchess satin warp-float lustrous. White R=0.85 high Lambertian: every colored moving-head wash projects ONTO dress as visible color zones constantly shifting. 14 steel bones: vertical panel geometry hard specular-shadow at each ridge. Corset compression: conical waist profile tensioned satin between bones creating cylindrical focusing surfaces. Chrome grommets bright specular constellation along exposed spine. CO2 fog: white particles scatter light creating volumetric glow surrounding white dress. Moving-head color: cycling RGB projects onto white creating animated chromatic display.',
    hosiery: 'HOSIERY: White thigh-high stockings satin welt matching. 12-denier T=0.82 ultra-sheer white. Club lights project onto white nylon same as dress. CO2 fog catches white stockings in volumetric scatter.',
  },
  {
    name: '09-magenta-metallic-strapless',
    attire: 'She wears a magenta metallic lamé strapless bandeau micro dress with iridescent color-shift finish transitioning between magenta and violet depending on viewing angle. Completely strapless held by tension. Sweetheart neckline. Extremely short hemline. The metallic surface creates ethereal color animation as she moves through laser beams and wash lights.',
    scene: 'Underground techno club: minimal industrial space, concrete walls, single massive sound system wall of speakers, green laser grid pattern cutting through thick haze, minimal red-amber lighting, dark intense, heavy bass vibrating glass surfaces, warehouse energy.',
    fabric: 'IRIDESCENT METALLIC: Aluminum vapor-deposited lamé with multilayer thin-film interference. At normal: magenta from constructive interference at 420nm+650nm dual-band. Tilted: path length change via 2*n*d*cos(theta)=m*lambda shifts through violet at 30-degrees to pink at grazing. Green laser grid: coherent 532nm light reflects as intense narrow spectral line from metallic surface creating geometric green pattern on magenta field. Strapless tension: horizontal bust compression. Metallic warp: directional specular aligned body long axis. Continuous color animation from movement through static laser field.',
    hosiery: 'HOSIERY: Black thigh-high stockings thin magenta metallic thread welt. 20-denier T=0.62 matte black. Green laser catches metallic welt thread as spectral green point. Dark club makes stockings nearly invisible.',
  },
  {
    name: '10-copper-chainmail-backless-club',
    attire: 'She wears a copper metal chainmail halter micro dress of thousands of tiny 2mm interlocking rings. Halter behind neck with completely bare back. Cowl neckline drapes under metal weight. Ultra-short hemline. The chainmail flows like liquid copper catching every strobe flash as thousands of simultaneous point reflections creating full-body sparkle constellation. Heavy metal weight creates distinctive drape.',
    scene: 'Industrial nightclub: exposed steel beams raw concrete, strobe lights 12Hz freezing motion, fog machine thick haze, LED strips red-amber along walls, metal cage decor, raw industrial energy, bodies in strobe-frozen blur.',
    fabric: 'CHAINMAIL PHYSICS: European 4-in-1 weave copper 2mm inner diameter 0.4mm wire. Each toroidal ring independently reflects unique fish-eye micro-environment. Copper spectral: R>0.82 above 550nm warm, R<0.40 below 480nm. Inter-ring cascading: light bounces 2-4 times between inner surfaces creating multiply-reflected caustic chains. Strobe at 12Hz: freezes chainmail mid-swing capturing motion-blur on non-frozen frames between strobes. Total mass ~2.8kg heavy distinctive drape with momentum persistence. Cowl weight concentrates at lowest neckline point. Red LED strips: copper reflects red-enhanced creating deep warm glow.',
    hosiery: 'HOSIERY: Black thigh-high stockings wide industrial welt. 20-denier T=0.62 matte black. Strobe freezes chainmail fringe over welt edge. Red LED catches nylon as warm specular shin highlight.',
  },

  // === ROOFTOP POOL BAR (11-15) ===
  {
    name: '11-white-vinyl-strapless-rooftop',
    attire: 'She wears a white high-shine PVC vinyl strapless bandeau micro dress. Completely strapless held by extreme body tension. White vinyl catches every colored light as brilliant chromatic specular streaks. Sweetheart neckline. Extremely short hemline. White mirror-vinyl reflects the entire Strip skyline as warped colorful panoramic image wrapped around body. Pool water caustics project onto white surface.',
    scene: 'Vegas rooftop pool bar night: infinity pool edge underwater LED blue glow, Strip skyline warm bokeh through glass railing, palm trees uplighted green, cabana curtains gentle breeze, heat lamp orange overhead, cocktail with tropical garnish, warm desert evening, stars above city glow.',
    fabric: 'WHITE VINYL: PVC calendered n=1.54 white-pigmented Ra<0.05 optical polish. White base: R=0.82 Lambertian broadband plus Fresnel surface gloss. Acts as dual projection-reflection surface: pool underwater blue LED projects azure zones, Strip bokeh reflects as warm orange-amber dots, palm uplights reflect as green streaks. Schlick: grazing incidence near-total creating bright rim contour. Strapless tension: horizontal bust compression. Pool water caustics: refracted underwater LED projects animated blue-white patterns onto white vinyl surface. Heat lamp orange from above creates warm gradient.',
    hosiery: 'HOSIERY: White thigh-high stockings clean satin welt. 12-denier T=0.82 ultra-sheer white. Pool caustics project onto white nylon too. Strip bokeh warm on white legs. Continuous white line.',
  },
  {
    name: '12-gold-sequin-extreme-slit-rooftop',
    attire: 'She wears a bright gold sequin one-shoulder micro dress with extreme high slit on left side running from hemline past upper hip. Single strap right shoulder. Thousands of 5mm gold sequins creating maximum warm brilliance. Extreme slit opens dramatically revealing full leg. Ultra-short hemline non-slit side. Gold sequins reflect Strip skyline as warm scattered constellation.',
    scene: 'Upscale rooftop pool: pool underwater color-changing LED cycling through spectrum, Strip skyline distant warm bokeh, fire pit circular with dancing flames, modern sun loungers white, overhead string lights warm Edison bulbs, gentle warm breeze, sophisticated evening.',
    fabric: 'GOLD SEQUIN ROOFTOP: 5mm gold-anodized paillettes pivot-sewn. Gold selective R>0.80 above 550nm. Large 5mm: 3-8Hz slow shimmer from body movement. Strip skyline: warm bokeh reflects as golden scattered point-sources across sequin field. Fire pit: dancing flames create animated warm caustics across gold surface 1-3Hz flicker. Pool LED cycling: each color sequentially reflected creating time-varying chromatic sequence on gold. One-shoulder: diagonal strain. Extreme slit bias-cut: maximum elastic opening. Slit edge: bright specular line hip to hem.',
    hosiery: 'HOSIERY: Nude gold-shimmer thigh-high stockings gold lace welt. 10-denier T=0.87 barely-there gold. Fire pit catches ultra-sheer as warm amber glow. Extreme slit reveals full stocking length.',
  },
  {
    name: '13-crimson-satin-bare-back-rooftop',
    attire: 'She wears a deep crimson liquid satin charmeuse mini dress with thin gold chain straps and entirely open bare back scooped to the very lowest point of her spine. Front cowl drapes low showing decolletage. Silk clings in catenary drape. Extremely short bias-cut hemline. Maximum skin at low cowl front and extreme bare back. Crimson satin catches fire pit flames as brilliant warm specular.',
    scene: 'Luxe rooftop pool lounge: daybed cabana with flowing white curtains, pool surface reflecting city lights as rippled color, fire column gas feature, cocktail on low table, palm fronds overhead backlit, warm evening breeze, desert sky glow.',
    fabric: 'CRIMSON CHARMEUSE: 19-momme silk 4/1 warp-float lustrous specular half-width 8 degrees. Crimson dye: absorption 430-580nm with 600-700nm red transmission. Birefringence delta_n=0.04 polarization shimmer. Catenary drape y=a*cosh(x/a) a=11cm between chain supports. Chain straps: each gold link tiny reflector V-gathering at attachment. Cowl topology: varying Gaussian curvature through positive domes to negative saddles. Caustic concentration in concave valleys. Fire column: flickering 1-3Hz warm light creates animated specular on lustrous crimson. Pool reflection: indirect colored light fills shadows.',
    hosiery: 'HOSIERY: Black thigh-high stockings thin crimson ribbon bow welt. 15-denier T=0.76 matte black. Fire column catches ribbon as flickering warm accent. Pool reflection adds cool fill to dark nylon.',
  },
  {
    name: '14-silver-metallic-cutout-rooftop',
    attire: 'She wears a liquid silver metallic jersey mini dress with bold geometric cutouts: large diamond shapes at both waist sides exposing hip skin, wide rectangular cutout at center sternum, triangular cutout between shoulder blades. Sleeveless. Silver metallic catches every rooftop light as brilliant neutral-warm reflections. Ultra-short hemline. Cutouts create bold skin windows against mirror-bright silver field.',
    scene: 'Modern rooftop bar: LED-lit infinity pool edge, panoramic Strip view through minimal glass railing, contemporary concrete planters, overhead pergola with climbing vines and bistro lights, outdoor bar polished concrete, martini in stemless glass, warm evening.',
    fabric: 'SILVER METALLIC JERSEY: Aluminum-coated knit R=0.88 broadband neutral mirror-bright. Each body surface point reflects unique panoramic rooftop environment as distorted image. Cutout windows: warm skin contrasts cool silver by material and color temperature. Bistro string lights: reflected as bright point-source constellation across metallic surface. Pool LED edge-glow: blue reflected as cool accent on silver. Strip skyline bokeh: warm dots. Sleeveless: bare arms catch ambient directly. Diamond cutouts at waist: hip skin framed by brilliant reflective field. Sternum cutout: centered skin window.',
    hosiery: 'HOSIERY: Silver-shimmer thigh-high stockings metallic thread welt. 15-denier T=0.76 metallic microparticle shimmer extending silver to legs. Bistro lights catch shimmer as scattered specular points.',
  },
  {
    name: '15-hot-pink-vinyl-wrap-rooftop',
    attire: 'She wears a hot pink high-shine PVC vinyl wrap micro dress with crossover V showing decolletage and wrap tie at right hip creating asymmetric hemline dramatically shorter on right. Pink vinyl mirror-reflects every light as brilliant magenta-white specular streaks. Wrap tie opens at hip revealing flash of upper thigh. Pushed three-quarter sleeves. Saturated hot pink screams party against night sky.',
    scene: 'Pool party rooftop night: underwater LED pool cycling colors, DJ booth background with LED panel, palm trees wrapped in fairy lights, foam party residue on deck, cocktail umbrella drinks, warm bodies nearby in blur, party energy peak, desert stars above city glow.',
    fabric: 'HOT PINK VINYL WRAP: PVC n=1.54 Ra<0.05 optical polish. Hot pink pigment: absorption 490-560nm green with 610-650nm+420-470nm dual-band creating additive magenta. Fresnel R_0=4.6% rising Schlick to near-total grazing. Pool cycling LED: color shifts across pink surface following local illuminant - blue pool light creates violet zone, warm overhead creates magenta, fairy lights create pink-amber. Wrap tie: radial compression fan from knot at right hip. Asymmetric hemline: dramatically shorter right side. Specular streaks along maximum body curvature. PVC translucency: Beer-Lambert deeper=richer pink.',
    hosiery: 'HOSIERY: Black thigh-high stockings hot pink ribbon welt. 15-denier T=0.76 matte black. Pool LED color catches ribbon shifting its apparent color. Short wrap side reveals welt detail.',
  },

  // === HOTEL LOBBY BAR (16-20) ===
  {
    name: '16-champagne-sequin-backless-lobby',
    attire: 'She wears a champagne gold sequin halter micro dress with clean neckline front and dramatically bare open back scooped to the very base of spine showing entire back. Halter ties behind neck. Thousands of 4mm champagne sequins. Ultra-short hemline. Full bare back from nape to sacrum against sparkling champagne gold front. Maximum front-back contrast.',
    scene: 'Grand Vegas hotel lobby bar: soaring marble atrium, massive crystal chandelier overhead thousands of faceted pendants, polished marble floors reflecting everything, leather club chairs, travelers with luggage blur, brass elevator doors catching light, orchid arrangements, cosmopolitan sophisticated energy.',
    fabric: 'CHAMPAGNE SEQUIN LOBBY: 4mm champagne-gold paillettes R=0.75 at 580nm warm. Crystal chandelier: thousands of faceted pendants creating rainbow caustic projections that play across sequin field as animated prismatic pattern. Marble floor: polished reflection doubles sequin sparkle from below creating up-light effect. Halter V-strain: aligned sequins at chest transitioning to random scatter at hemline. Bare back: chandelier rainbow caustics project directly onto skin. Each sequin 8-15Hz stochastic sparkle. Brass elevator doors: warm reflected fill. Marble atrium: multi-bounce creates omnidirectional warm ambient.',
    hosiery: 'HOSIERY: Nude champagne thigh-high stockings gold-thread lace welt. 12-denier T=0.82 warm gold barely-there. Marble reflection catches nude nylon as warm doubled image below. Chandelier caustics on stockings.',
  },
  {
    name: '17-black-velvet-corset-lobby',
    attire: 'She wears a jet black velvet structured corset micro dress with sweetheart bustline, 14 steel boning channels extreme waist cinch, and open lace-up back through brass grommets with black velvet ribbon. Black velvet absorbs 95% light as deep void with brass grommets and lace as bright accent constellation against darkness. Extremely short hemline.',
    scene: 'Boutique hotel lobby bar: dark walnut paneling, green-shade brass banker lamps warm intimate, leather Chesterfield sofa background, art deco etched-glass partition, marble bar with brass rail, crystal whiskey glasses backlit amber, orchid in brass pot, sophisticated dark.',
    fabric: 'BLACK VELVET CORSET: Rayon pile 2.5mm maximum absorption trapping 95% visible light. Near-perfect blackbody textile. Against this void: brass grommets R=0.55 as bright warm points. Velvet ribbon lace: pile fibers with directional shimmer-dark depending on viewing angle. 14 steel bones: invisible under velvet but create structural panel geometry felt as smooth surface transitions. Corset compression: extreme waist cinch. Banker lamp warm amber: absorbed by velvet but reflected by brass creating accent-only visibility pattern. Sweetheart neckline: skin dramatically bright against velvet darkness by Weber-Fechner contrast.',
    hosiery: 'HOSIERY: Black thigh-high stockings ultra-matte welt seamless. 20-denier T=0.62 matte black extending velvet void below. Only skin and brass provide brightness. Banker lamp amber catches shin as sole specular.',
  },
  {
    name: '18-ivory-lame-strapless-lobby',
    attire: 'She wears an ivory metallic lamé strapless bandeau micro dress. Completely strapless held by body tension. Ivory lamé with subtle gold metallic thread creating warm pearl-metallic surface. Sweetheart neckline. Extremely short hemline. The metallic ivory catches lobby chandelier light as thousands of warm micro-reflections creating ethereal soft-glow effect rather than harsh mirror flash.',
    scene: 'Five-star hotel lobby bar: soaring ceiling with coffered gold leaf, enormous floral arrangement as centerpiece, baby grand piano in background someone playing, beveled mirror columns, travertine floor warm, crystal champagne flutes, concierge desk brass-trimmed blur, elegant ambient.',
    fabric: 'IVORY LAMÉ: Aluminum warp vapor-deposited with gold-tinted anodization interlocked ivory polyester weft. Warm pearl: R=0.75 with subtle gold undertone. Unlike pure mirror: metallic thread creates micro-faceted surface with broad specular half-width 12 degrees for soft diffused metallic glow. Chandelier: warm omnidirectional fill creates even luminosity across lamé. Piano: polished lid reflection adds secondary light source. Beveled mirror columns: reflected-reflection multiplies lamé glow. Strapless tension: horizontal bust compression. Travertine floor: warm indirect bounce-fill from below.',
    hosiery: 'HOSIERY: Nude ivory-shimmer thigh-high stockings pearl lace welt. 10-denier T=0.87 barely-there warm ivory. Travertine reflection catches ultra-sheer as doubled warm glow. Continuous pearl tone head to toe.',
  },
  {
    name: '19-ruby-vinyl-one-shoulder-lobby',
    attire: 'She wears a deep ruby high-shine PVC vinyl one-shoulder micro dress. Single wide strap over left shoulder leaving entire right shoulder arm and side bare. Ruby vinyl achieves near-mirror reflectivity catching lobby lights as brilliant deep-red specular streaks. Extremely short hemline. The asymmetric cut maximizes skin exposure on bare right side against mirror-bright ruby on left.',
    scene: 'Art deco hotel lobby: geometric brass fixtures, terrazzo floor geometric pattern, curved bar mahogany with brass inlay, martini in crystal coupe, jazz playing from hidden speakers, potted palms, warm brass sconces, vintage glamour.',
    fabric: 'RUBY VINYL: PVC n=1.54 Ra<0.05 polish. Ruby pigment: absorption 430-580nm with 600-700nm deep red transmission through Beer-Lambert. Fresnel Schlick: near-total at grazing on hip and thigh curves creating bright rim-light traces. Art deco brass fixtures: warm amber reflected as golden streaks on ruby creating rich red-gold interplay. Terrazzo floor: geometric pattern reflected in vinyl as distorted abstract. One-shoulder: bare right side direct skin catches brass ambient warmth. Specular highlights achromatic white along maximum curvature. Mahogany bar: warm brown indirect fill.',
    hosiery: 'HOSIERY: Black thigh-high stockings thin ruby ribbon welt. 15-denier T=0.76 matte black. Brass sconces catch ribbon as warm ruby accent. Art deco floor reflects under stockings as geometric warm pattern.',
  },
  {
    name: '20-platinum-sequin-extreme-slit-lobby',
    attire: 'She wears a platinum silver sequin one-shoulder micro dress with extreme high slit on left side running from hemline past upper hip. Single strap right shoulder. Thousands of 4mm platinum sequins R=0.82 broadband. Extreme slit opens revealing full leg length. Ultra-short hemline non-slit side. Platinum catches every lobby light as scattered brilliant neutral sparkle.',
    scene: 'Modern luxury hotel lobby: floating staircase glass railing LED edge-lit, water feature wall trickling, low modern furniture, overhead sculptural pendant light brass-mesh, polished dark stone floor, orchids floating in glass, contemporary luxury.',
    fabric: 'PLATINUM SEQUIN: 4mm aluminum paillettes R=0.82 broadband neutral silver. Pivot-sewn: 8-20Hz stochastic sparkle. Floating staircase LED: blue-white edge glow reflected as cool accent sparkle. Water feature: animated light refracted through trickling water projects moving caustic patterns onto sequin field. Brass-mesh pendant: warm filtered light through mesh creating dappled pattern. One-shoulder: diagonal strain alignment. Extreme slit bias-cut: maximum opening. Dark stone floor: polished reflection doubles sparkle from below. Each sequin reflects unique micro-environment of luxury lobby.',
    hosiery: 'HOSIERY: Silver-shimmer thigh-high stockings platinum thread welt. 15-denier T=0.76 metallic microparticle shimmer. Extreme slit reveals full stocking. Water feature caustics catch metallic shimmer.',
  },

  // === CASINO FLOOR BAR (21-25) ===
  {
    name: '21-electric-purple-bodycon-backless-casino',
    attire: 'She wears an electric purple fluorescent stretch bodycon halter micro dress with bare back scooped to lowest spine point. Halter ties behind neck. Electric purple fluoresces under casino UV accent lighting creating vivid self-luminous effect. Body-gripping stretch maps every contour. Ultra-short hemline. Full bare back against UV-glowing purple front.',
    scene: 'Vegas casino floor bar: slot machines in background flashing multicolor LED, roulette wheel visible through crowd, low ceiling with recessed warm spots, carpet bold geometric pattern, cocktail waitress tray in background blur, chips stacked, energy electric constant, mixed warm-cool-neon lighting.',
    fabric: 'FLUORESCENT BODYCON CASINO: Polyester-elastane 85/15 fluorescent brightener. Electric purple: 380-430nm violet + 620-680nm red dual-band transmission. UV-reactive: absorbs 365nm re-emits 410nm+650nm Stokes shift phi=0.40 creating apparent self-luminous purple glow. Slot machine LED: multicolor stochastic flicker creates constantly-changing background against which purple fluoresces. 4-way stretch body tension: skin-contact adhesion. Halter: V-strain pattern across torso. Casino carpet geometric: provides structured background against organic body form.',
    hosiery: 'HOSIERY: Black thigh-high stockings thin purple metallic welt. 15-denier T=0.76 matte black. UV makes purple welt fluoresce. Slot machine LED flicker catches nylon as color-shifting ambient.',
  },
  {
    name: '22-bronze-hammered-corset-casino',
    attire: 'She wears a hammered bronze metallic jersey structured corset micro dress with sweetheart bustline, 12 steel boning channels, and open lace-up back through bronze grommets. Hundreds of tiny concave dimple-mirror impressions across corset surface each catching light independently. Extremely short hemline. Bronze hammered texture plus corset structure creates maximum visual complexity.',
    scene: 'Vegas casino high-limit bar: private elevated area, polished dark wood bar, top-shelf spirits backlit amber wall, heavy leather chairs brass studs, green felt table visible beyond, security in suit blur, warm brass fixtures, exclusive high-roller energy.',
    fabric: 'HAMMERED BRONZE CORSET: Micro-concavity dimple r=2-5mm depth 0.3-0.8mm in metallic jersey. Each dimple concave mirror f=r/2 creating inverted micro-images of overhead brass fixtures. Cook-Torrance BRDF alpha=0.35 Beckmann distribution. Copper-tin bronze: R rises from 0.18 at 480nm to 0.87 at 700nm warm. 12 steel bones: structural channels overlaid on hammered texture creating ordered panels between chaotic dimple field. Bronze grommets: matching tone constellation along spine. Corset compression: dimples flatten at waist tension creating reflectance change at compression zones.',
    hosiery: 'HOSIERY: Bronze-shimmer thigh-high stockings copper lace welt. 15-denier T=0.76 metallic shimmer extending bronze to legs. Spirit-wall amber backlight catches shimmer warmly.',
  },
  {
    name: '23-scarlet-sequin-wrap-casino',
    attire: 'She wears a deep scarlet sequin wrap micro dress with crossover V showing decolletage, wrap tie at left hip creating asymmetric hemline shorter on left. Thousands of 4mm scarlet sequins. Wrap tie opens at hip. Three-quarter pushed sleeves. Casino slot lights multiply through thousands of red sequin mirrors creating cascading color fire across body.',
    scene: 'Busy casino floor: rows of slots flashing, wide walkway marble, overhead chandeliers cascade style, cocktail lounge area low seating, bartender mixing at circular island bar, ringing bells jackpot somewhere, constant motion crowd, warm spots with cool LED accent.',
    fabric: 'SCARLET SEQUIN WRAP: 4mm scarlet aluminum paillettes over red base R=0.72 above 600nm. Slot machine LED: multicolor rapidly-changing light creates polychromatic time-varying pattern across sequin field as each sequin reflects different-colored slot at different angle. Cascade chandelier: linear arrangement reflects as directional sparkle gradient. Wrap crossover V: converging sequin alignment at neckline. Asymmetric tie: left shorter revealing thigh. Each body-movement: 8-20Hz stochastic sparkle multiplied by slot color variation. Casino energy captured in sequin animation.',
    hosiery: 'HOSIERY: Black thigh-high stockings thin scarlet ribbon welt. 15-denier T=0.76 matte black. Slot LED catches ribbon color-shifting. Short wrap side reveals welt.',
  },
  {
    name: '24-midnight-satin-bare-back-casino',
    attire: 'She wears a midnight navy liquid satin charmeuse slip micro dress with ultra-thin gold chain straps and dramatically open bare back scooped to the very base of spine. Front cowl drapes low showing decolletage. Silk clings in liquid catenary drape. Extremely short bias-cut hemline. Maximum skin at cowl front and extreme bare back.',
    scene: 'Intimate casino cocktail lounge: recessed from main floor noise, dark navy velvet banquettes, low brass table lamps warm 2700K, cocktail menu leather-bound, crystal glasses dark spirits, quiet sophisticated contrast to casino floor energy.',
    fabric: 'MIDNIGHT CHARMEUSE: 19-momme silk 4/1 warp-float lustrous specular half-width 8 degrees. Midnight navy: broadband absorption narrow 430-470nm deep blue transmission. Birefringence delta_n=0.04 polarization shimmer. Catenary y=a*cosh(x/a) a=11cm between chain supports. Chain straps: gold links as tiny warm reflectors. Cowl topology: complex minimal-energy fold varying Gaussian curvature. Caustic concentration in concave valleys. Brass table lamp: single warm key at table height creating dramatic low-angle illumination modeling body differently than overhead. Navy velvet surroundings: dark absorption framing.',
    hosiery: 'HOSIERY: Black thigh-high stockings thin midnight lace welt. 12-denier T=0.82 navy tint. Brass lamp warm catches lace as specular accent. Dark lounge makes stockings nearly invisible against navy banquette.',
  },
  {
    name: '25-gold-vinyl-strapless-casino',
    attire: 'She wears a gold-metallic high-shine PVC vinyl strapless bandeau micro dress. Completely strapless held by extreme body tension. Gold vinyl achieves near-mirror finish reflecting entire casino as warm distorted panoramic. Sweetheart neckline. Extremely short hemline. Gold mirror-vinyl captures the chaotic casino light environment as animated warm reflection wrapping body.',
    scene: 'Center casino floor: 360-degree slot machines LED walls flashing, high ceiling with massive chandelier, wide marble walkway, crowd moving all directions, cocktail server approaching, craps table green felt glow visible, jackpot lights spinning, maximum sensory input.',
    fabric: 'GOLD VINYL: PVC n=1.54 gold-metallic pigment Ra<0.05 optical polish. Gold selective surface: R>0.80 above 550nm warm with <0.40 below 480nm. Fresnel Schlick: near-total grazing creating bright gold rim contour. 360-degree casino: every direction reflected as continuous anamorphic gold-tinted panoramic wrapped around body. Slot LED: rapid multicolor creates animated time-varying reflection constantly shifting. Massive chandelier: reflected as bright complex pattern overhead. Strapless tension: horizontal bust compression. Gold pigment through translucent PVC: Beer-Lambert depth=warmer gold. Marble floor: polished reflection doubles gold.',
    hosiery: 'HOSIERY: Nude gold-shimmer thigh-high stockings gold lace welt. 10-denier T=0.87 barely-there warm gold. Casino floor marble reflects doubled golden leg. Chandelier catches shimmer.',
  },

  // === CHAMPAGNE / VIP LOUNGE (26-30) ===
  {
    name: '26-blush-satin-corset-champagne',
    attire: 'She wears a blush pink satin structured corset micro dress with sweetheart bustline pushed low, 14 steel boning channels dramatic waist cinch, and open lace-up back through rose gold grommets. Blush satin creates soft warm feminine luminosity. Extremely short hemline. The corset creates maximum structural drama in delicate pink.',
    scene: 'Exclusive champagne lounge: pink-gold ambient LED, crystal champagne tower centerpiece hundreds of coupes, rose petals scattered on white tablecloth, gold fixtures everywhere, mirror ceiling doubling light, velvet blush banquettes, champagne bubbles catching light, celebration.',
    fabric: 'BLUSH SATIN CORSET: 22-momme duchess satin warp-float lustrous. Blush pink: subtle absorption 460-520nm with broad 550-700nm warm pink-peach transmission. 14 steel bones: vertical panel geometry specular-shadow at ridges. Corset compression: conical waist. Rose gold grommets: warm pink-metallic R=0.60 matching blush tone. Pink-gold LED ambient: enhances blush saturation via additive color matching. Crystal champagne tower: thousands of faceted glass surfaces creating micro-caustic projections onto blush satin. Mirror ceiling: infinite recursive reflection. Bubbles in champagne: tiny refracting spheres catching light as point sparkle.',
    hosiery: 'HOSIERY: Nude blush-pink thigh-high stockings rose gold lace welt. 10-denier T=0.87 barely-there warm blush. Pink ambient catches ultra-sheer as continuous blush glow. Mirror ceiling reflects doubled.',
  },
  {
    name: '27-black-sequin-one-shoulder-vip',
    attire: 'She wears a jet black sequin one-shoulder micro dress. Single strap over left shoulder leaving right side completely bare. Thousands of 4mm jet-black anodized sequins creating dark moody sparkle - subtle sophisticated shimmer rather than bright flash. Extremely short hemline. The asymmetric bare right side against dark sparkle left creates maximum contrast.',
    scene: 'VIP champagne room: private space behind frosted glass door, intimate low ceiling, single dramatic pendant spotlight, grey velvet L-shaped sofa, magnum in ice, crystal flutes, fresh roses in low vase, dark intimate sophisticated, small group energy.',
    fabric: 'BLACK SEQUIN VIP: 4mm jet-black anodized aluminum R=0.25 subdued dark-metallic. Each pivot-sewn sequin: at rest appears near-uniform dark matte, micro-movement causes individual sequins to pivot past specular as scattered dim warm points 10-25Hz creating understated moody sparkle. Single pendant spot: one bright reflected point per correctly-angled sequin versus ambient dark for all others. One-shoulder: diagonal tension gradient. Bare right side: warm skin catches pendant spot as bright contrast. Frosted glass: soft diffused ambient fill. Magnum ice: reflective surface adds secondary fill.',
    hosiery: 'HOSIERY: Black thigh-high stockings plain elastic welt. 20-denier T=0.62 matte black. Dark sequin seamless to dark stocking. Pendant spot catches shin as sole specular accent.',
  },
  {
    name: '28-rose-gold-lame-backless-vip',
    attire: 'She wears a rose gold metallic lamé halter micro dress with completely bare back scooped to the very base of spine. Halter ties behind neck. Rose gold lamé creates warm pink-metallic glow. Ultra-short hemline. The full bare back from nape to sacrum shows maximum skin against warm metallic front. Rose gold catches champagne lounge ambient as soft warm luminosity.',
    scene: 'Intimate champagne bar: gold leaf walls, crystal sconces amber warm, marble bar champagne bottles in ice, silver service, fresh flowers crystal vases, low French music, candlelight flickering brass holders, Parisian elegance in Vegas.',
    fabric: 'ROSE GOLD LAMÉ: Aluminum vapor-deposited with copper-tinted anodization creating warm pink-gold R=0.72. Copper absorption below 500nm adds pink warmth to metallic reflection. Gold leaf walls: reflected in lamé creating recursive warm ambient. Crystal sconces: amber light through crystal creates caustic projections onto metallic surface. Candlelight 1800K: ultra-warm 1-3Hz flicker creates animated warm dancing light on lamé. Halter V-strain: aligned metallic threads at chest. Bare back: candlelight models spine contour with warm highlight-shadow. Champagne in ice: indirect reflective fill.',
    hosiery: 'HOSIERY: Nude rose-gold shimmer thigh-high stockings rose gold lace welt. 10-denier T=0.87 barely-there warm pink-gold. Candlelight catches ultra-sheer as flickering warm glow extending rose gold to legs.',
  },
  {
    name: '29-white-velvet-extreme-cutout-vip',
    attire: 'She wears a winter white velvet bodycon mini dress with extreme geometric cutouts: large diamond shapes both waist sides exposing hips, wide oval cutout at center back, rectangular cutout at sternum. Long fitted sleeves. White velvet creates soft luminous surface while cutouts expose warm lit skin as contrasting windows. Very short hemline.',
    scene: 'Ultra-exclusive VIP: all-white room, white leather furniture, crystal chandelier dramatic overhead, silver ice bucket magnums, white roses everywhere, white candles in crystal holders, single colored LED accent strip blue along base, ethereal luxury.',
    fabric: 'WHITE VELVET CUTOUT: Rayon pile 2.5mm white creating soft diffuse surface R=0.78 but non-specular unlike satin. Pile texture creates matte luminosity: bright without harsh highlights. Against white: cutout skin appears as warm-toned windows. Blue LED strip: cool accent reflects on white velvet creating blue-white gradient at lower hemline. Crystal chandelier: overhead warm caustics on white pile creating subtle prismatic pattern. Cutout edges: pile direction change at overlocked seam creates visible texture boundary. Long sleeves: continuous white extends dramatic effect. All-white room: minimal shadow pure high-key.',
    hosiery: 'HOSIERY: White thigh-high stockings matte velvet-finish welt. 15-denier T=0.76 white semi-sheer. Continuous white line. Blue LED strip catches lower stockings as cool accent gradient.',
  },
  {
    name: '30-burgundy-sequin-wrap-vip',
    attire: 'She wears a deep burgundy sequin wrap micro dress with crossover V showing decolletage, wrap tie at right hip creating dramatically asymmetric hemline with right side ultra-short. Thousands of 4mm burgundy sequins. Wrap tie opens at hip revealing upper thigh. Pushed three-quarter sleeves. Deep wine-dark sequins create sophisticated moody sparkle. Burgundy is the ultimate VIP color.',
    scene: 'Private VIP booth: dark enclosed space curtain-partitioned, low brass table lamp intimate warm, expensive bourbon in crystal, velvet dark purple banquette, gold trim everywhere, personal bottle service, hushed exclusive, warm amber-only lighting.',
    fabric: 'BURGUNDY SEQUIN WRAP: 4mm burgundy-anodized aluminum paillettes over wine-dark base. Burgundy pigment: absorption 430-560nm blue-green with 620-680nm deep wine-red transmission. Each sequin R=0.55 subdued warm-dark: sophisticated not flashy. Brass table lamp: single warm key at low angle catching sequins from below creating unusual uplight sparkle pattern. Wrap crossover V: converging sequin alignment. Asymmetric tie: right shorter maximum thigh. Gold trim: reflected warm fills matching sequin warmth. Velvet banquette: dark absorption framing. Bourbon crystal: caustic refraction adds accent points. 8-15Hz subtle sparkle.',
    hosiery: 'HOSIERY: Black thigh-high stockings thin burgundy ribbon welt. 20-denier T=0.62 matte black. Brass lamp catches ribbon as warm wine accent. Short wrap side reveals welt. Dark VIP booth absorbs stockings into shadow.',
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

console.log(`\n=== V8 NIGHTLIFE - 30 CONCEPTS, 6 SETTINGS, 4K ===`);
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
console.log('V8 NIGHTLIFE RESULTS');
console.log(`${'='.repeat(60)}`);
const ok = results.filter(r => r.ok);
console.log(`Success: ${ok.length}/${results.length}`);
results.forEach(r => console.log(`  ${r.ok ? 'OK' : '!!'} ${r.name}${r.err ? ': ' + r.err : ''}`));
console.log(`\nOutput: ${OUTPUT_DIR}`);

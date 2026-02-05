#!/usr/bin/env node

/**
 * V12 APEX - V7 PROVEN PHYSICS (870w, 30/30) + DARING V12 CONCEPTS + 4 VALIDATED CAMERA ARTIFACTS
 *
 * Strategy: First-principles approach. V7 achieved 100% (30/30) at 870-920w with 8 core physics.
 * V12 keeps V7's proven physics density, adds ONLY 4 validated camera artifacts that are
 * renderable and don't inflate word count beyond the 870-920w sweet spot.
 *
 * New camera artifacts (validated by physics + engineering agents):
 * - Purple fringing / longitudinal chromatic aberration at high-contrast edges
 * - Onion-ring bokeh concentric artifact from aspherical element
 * - BSI stack veiling glare (inter-element scatter reducing shadow contrast)
 * - Highlight shoulder hue shift (warm-to-magenta at clipping boundary)
 *
 * New material additions (validated):
 * - Lip gloss viscoelastic meniscus
 * - Mascara edge-lit TIR glow
 * - Foundation TiO2 Mie forward scatter
 * - Gemstone Cauchy dispersion
 * - Fabric catenary drape anisotropy
 *
 * Auth: OAuth ADC (API key quota exhausted)
 * Resolution: 1K at 4:5
 * Delay: 41s inter-concept, 70s rate-limit retry
 * Word target: 870-920w (V7 proven sweet spot)
 */

import { GoogleAuth } from 'google-auth-library';
import fs from 'fs/promises';
import path from 'path';

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || 'gen-lang-client-0925343693';
const LOCATION = 'global';
const MODEL = 'gemini-3-pro-image-preview';
const ENDPOINT = `https://aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL}:generateContent`;
const OUTPUT_DIR = process.env.OUTPUT_DIR || path.join(process.env.HOME, 'nanobanana-output', 'vegas-v12-apex');
const INPUT_IMAGE = process.argv[2] || '/Users/louisherman/Documents/518355716_10109335899644328_1380496532632646402_n.jpeg';

const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
await fs.mkdir(OUTPUT_DIR, { recursive: true });

const expressions = [
  'quiet confidence, slight upward chin tilt, one eyebrow barely raised',
  'playful half-smile, eyes slightly narrowed with amusement',
  'focused intensity, steady confident gaze, composed expression',
  'warm genuine smile reaching the eyes, crow-foot crinkles forming',
  'mysterious composure, Mona Lisa micro-smile, unreadable expression',
  'bold direct stare, chin level, unapologetic presence',
  'soft warmth, eyes wide and luminous, gentle natural expression',
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
  'confident challenge, tilted chin up, engaging the camera directly',
  'genuine surprise transitioning to delight, eyes widening',
  'contemplative depth, thoughtful gaze, intelligence visible',
  'victorious satisfaction, earned confidence, subtle triumph',
  'pure magnetism, the look that stops conversations mid-sentence',
];

function buildPrompt(attire, scene, fabricPhysics, hosieryPhysics, expression) {
  return `Edit this photograph into an ultra-raw real-life Vegas cocktail bar photograph indistinguishable from an unretouched candid shot from a real night out. Raw documentary nightlife photography. ${attire}

SCENE: ${scene}

CAMERA SENSOR PHYSICS: Canon EOS R5 II full-frame 45MP stacked BSI-CMOS sensor 36x24mm active silicon. RF 50mm f/1.2L USM wide open at f/1.2 creating razor-thin 14cm depth-of-field plane focused at 2.2m subject distance. ISO 3200 generating authentic high-ISO luminance noise following Poisson photon-counting statistics sigma=sqrt(N_photons) in shadow regions with SNR=28dB at midtones and visible chroma noise as red-blue channel decorrelation in underexposed zones. Shutter 1/125s allowing slight motion blur on gesturing hands. 759-point dual-pixel phase-detect AF locked precisely on nearest iris with gentle focus roll-off on far shoulder. 10-blade circular aperture producing creamy oval bokeh discs with onion-ring concentric artifact from aspherical element. Barrel distortion 0.8% at close focus distance. Purple fringing 0.3px longitudinal chromatic aberration on maximum-contrast edge transitions at frame corners. BSI stack veiling glare: inter-element scatter reducing shadow contrast 0.3 stops in deep blacks near bright specular sources. Highlight shoulder hue shift: warm-to-magenta cast at sensor clipping boundary visible on brightest neon reflections. White balance tungsten 3200K but mixed venue lighting creates unresolved color temperature casts across different spatial zones. Available light only - absolutely no flash used - crushed blacks where signal falls below sensor noise floor creating true zero detail. Sensor micro-lens array vignetting 0.7 stop at corners. Bayer CFA demosaicing artifact: false color moire at fine repeating fabric textures where spatial frequency approaches Nyquist limit. PDAF banding: faint horizontal stripe pattern in deep shadows from dual-pixel readout phase difference. Raw file 14-bit ADC quantization: visible posterization in smooth shadow gradient regions where bit depth insufficient to encode tonal transitions.

3D GLOBAL ILLUMINATION LIGHT TRANSPORT: Primary overhead recessed tungsten halogen track spots at 2800K creating hard directional pools with sharp penumbral shadow edges - NOT diffused fashion lighting. Secondary practical neon bar signage casting saturated colored spill with hard color boundaries following inverse-square falloff I=Phi/(4*pi*r^2). Tertiary weak distant ceiling fluorescent at 3-stop underexposure as faint cool fill. Steep 4-stop luminance gradient from bar surface to dark booths. NO supplemental fill light - deep unrecoverable shadows on shadow-side at 5+ stops below key creating true black zero detail. Mixed color temperature: 2800K tungsten warm on skin vs 4100K fluorescent blue-green background contamination. Multi-bounce warm color interreflection from mahogany bar surface adds 300K to indirect shadow fill. Beer glass caustic projection on bar surface from overhead spot refraction through curved glass. Ambient occlusion darkening at body-bar contact zones. Volumetric light scatter through atmospheric haze particles.

SKIN BIO-OPTICAL RENDERING: Monte Carlo subsurface scattering 3-layer epidermis-dermis-hypodermis. Melanin mu_a=6.6*C_mel*(lambda/500nm)^(-3.33) varying 0.01-0.05 across body regions. HbO2 absorption 542nm 576nm warm flush cheeks earlobes decolletage knuckles. Hb blue-purple undertone temples inner wrists venous return. Hypodermis forward-scatter g=0.85 translucent backlit glow ear helices nostril edges. Real unretouched skin: visible pores nasal ala cheeks, expression lines forehead periorbital, zero smoothing. Sebaceous T-zone sheen forehead nose chin irregular specular patches. Vellus hair forearms jawline catching rim light as bright fiber strands. Light perspiration upper lip temples micro-specular water droplets. Lip gloss: viscoelastic meniscus pooling at lip vermilion border creating bright curved specular with thickness-dependent color shift. Foundation TiO2 Mie forward scatter: slight warm matte haze layer overlaying natural skin texture visible at jawline blend boundary. Preserve face bone structure eye color expression identical.

${fabricPhysics}

${hosieryPhysics}

RAW PHOTOGRAPHIC IMPERFECTIONS: ISO 3200 grain visible in shadows. Motion blur fingertips 1/125s. Flyaway hair catching backlight as soft bright streaks. Background neon bokeh as large soft colored discs. Foreground glass edge refraction blur. Faint lens flare veiling glare and hexagonal ghost from brightest neon. Crumpled napkin bar surface. Condensation ring cold glass. Patron elbow visible frame edge. Micro dust shadow upper corner as faint dark circle. Barrel distortion pulling straight lines at edges. Mascara edge-lit TIR: individual mascara-coated lash tips catch direct light and internally reflect creating faint bright glow at lash ends against dark background. Gemstone Cauchy dispersion: any jewelry stones n(lambda)=A+B/lambda^2 creating spectral fire rainbow projections on nearby skin. Fabric catenary drape: gravity y=a*cosh(x/a) between support points with anisotropic warp-weft tension differential visible in fold geometry. Chromatic aberration: lateral CA 0.5px red-cyan fringe at frame edges on high-contrast boundary. Sensor bloom: bright neon specular highlights bleeding 2-3px beyond physical boundary into adjacent pixels. Acoustic dampener vibration: faint micro-shake from mirror mechanism creating 0.5px directional smear on point sources. No retouching no color grading - straight RAW with WB only. Preserve face identical.`;
}

const concepts = [
  // === SPEAKEASY UNDERGROUND (1-5) ===
  {
    name: '01-platinum-sequin-extreme-backless-speakeasy',
    attire: 'She wears a platinum silver sequin halter micro dress with dramatically open bare back scooped from nape all the way past sacrum to the lower back. Sleek high neck front. Thousands of 4mm platinum sequins. Ultra-short hemline. The dramatically open back is the architectural centerpiece framed by platinum sparkle.',
    scene: 'Hidden speakeasy: behind unmarked door, low brick arched ceiling, candle clusters amber glass 1800K flickering, worn leather banquettes, antique mirrors foxed, prohibition cocktail coupe, live jazz trio soft focus, wax dripping on iron candelabra.',
    fabric: 'SEQUIN OPTICS: 4mm platinum paillettes pivot-sewn on black mesh base. Each sequin independent planar mirror R=0.82. Stochastic 8-20Hz sparkle from body micro-movements. Candle 1800K: warm amber reflections scattered across platinum. Halter V-strain from neck creating taut alignment at chest transitioning to relaxed scatter hemline. Bare back: no fabric nape to sacrum, warm candlelight modeling every vertebra highlight-shadow along spinal column. Foxed mirror: recursive multiplication of platinum sparkle in aged patina reflection.',
    hosiery: 'HOSIERY: Black thigh-high stockings with thin platinum metallic welt. 15-denier T=0.76 semi-sheer matte black. Candle catches welt as warm accent. Sequin sparkle above transitions to matte below at hemline boundary.',
  },
  {
    name: '02-ruby-charmeuse-corset-open-back-speakeasy',
    attire: 'She wears a deep ruby red liquid satin charmeuse structured corset micro dress with sweetheart bustline, 14 visible steel boning channels cinching dramatic waist ratio, and completely open lace-up back through chrome grommets with ruby ribbon criss-crossing. Extremely short hemline. Ruby satin catches every candle as brilliant red specular fire.',
    scene: 'Dark whiskey bar: barrel-stave walls, brass wall sconces warm pools, single-malt collection backlit amber, heavy oak bar centuries worn, leather stool brass nail trim, ice sphere cracking in glass, bitters bottles row, hand-written chalkboard menu.',
    fabric: 'CHARMEUSE CORSET: 19-momme 4/1 warp-float lustrous specular half-width 8 degrees. Ruby absorption 430-520nm + above 700nm, deep red 620-680nm transmission. 14 steel bones: vertical panel geometry hard specular-to-shadow transition at each ridge edge. Corset compression: smooth conical profile between bone channels, concave surfaces focusing light into caustic lines. Chrome grommets R=0.68 constellation along spine. Ribbon tension: radiating V-wrinkles from each grommet. Sweetheart very low: double-curve convex with principal curvature highlight. Brass sconces: warm pool zones on ruby creating hot zones against dark absorption outside.',
    hosiery: 'HOSIERY: Black thigh-high stockings with thin ruby ribbon welt. 15-denier T=0.76 matte black. Brass sconce catches ribbon as warm red accent on shin. Ruby bridges dress to leg.',
  },
  {
    name: '03-gold-lame-halter-speakeasy',
    attire: 'She wears a champagne gold metallic lamé halter mini dress with wide straps. Gold lamé catching all ambient as brilliant warm golden fire. Entire bar environment reflects as warped anamorphic distortion across the metallic surface. Short hemline. Thousands of gold metallic threads catching art deco brass fixtures overhead.',
    scene: 'Art deco speakeasy: geometric brass fixtures overhead, green marble bar gold veining, velvet emerald curtains, etched glass dividers, crystal coupe champagne tower, jazz ensemble corner, gilded mirror ornate, Edison 2200K ultra-warm.',
    fabric: 'GOLD LAMÉ: Al vapor-deposited warp interlocked matte polyester weft. Gold-anodized selective R>0.80 above 550nm warm, R<0.40 below 480nm absorbing cool. Each body point reflects unique environment via Gauss normal map as continuous anamorphic panoramic room image. Specular highlights: elongated bright streaks along maximum principal curvature. Brass fixtures: matching warm gold-on-gold reinforcement. Green marble: reflected green on underside creating gold-filtered emerald. Halter strap V-tension creating upward strain pattern from neckline. Emerald curtain backdrop: complement to gold warm. Edison 2200K ultra-warm: golden bulb filament visible as point sources.',
    hosiery: 'HOSIERY: Black thigh-high stockings with gold-thread lace welt. 20-denier T=0.62 matte black. Gold lace catches tungsten as scattered specular dots. Matte-to-metallic strong contrast at hemline.',
  },
  {
    name: '04-midnight-velvet-cutout-architecture-speakeasy',
    attire: 'She wears a midnight black velvet bodycon micro dress with bold geometric diamond cutouts at both waist sides exposing hip skin, deep rectangular cutout center sternum, and large angular cutout lower back exposing spine. Sleeveless. Velvet absorbs 95% as deep void while cutouts expose warm lit skin as bright windows against pure darkness. Very short hemline.',
    scene: 'Candle-lit wine cellar bar: stone vaulted ceiling, iron candelabra massive dripping wax, wine barrel wall stacked, oak trestle table heavy, red wine crystal catching candlelight, cobblestone worn, vintage maps wall, muscat grape cluster.',
    fabric: 'BLACK VELVET: Rayon pile 2.5mm maximum absorption. Pile fiber forest traps 95% visible light through inter-fiber forward-scatter bounces. Near-perfect blackbody absorber. Against ultra-dark field: cutout skin windows dramatically bright by Weber-Fechner contrast ratio. Candle 1800K warm reaches skin through cutouts but absorbed by velvet creating warm-on-void graphic contrast. Stone vault diffuse warm overhead. Wine crystal: point of warm color complement. Material contrast dark-to-bright-skin IS the visual impact.',
    hosiery: 'HOSIERY: Black thigh-high stockings ultra-matte seamless transition. 20-denier T=0.62 extending velvet void below hemline. Only skin cutouts and face provide brightness in frame.',
  },
  {
    name: '05-electric-coral-one-shoulder-speakeasy',
    attire: 'She wears an electric coral stretch bodycon one-shoulder micro dress. Single wide strap right shoulder leaving entire left shoulder arm and side completely bare. Coral fluoresces under mixed bar lighting creating vivid saturated pop. Ultra-short hemline. Asymmetric silhouette with full left side open. Fitted zero ease maps every contour.',
    scene: 'Jazz club underground: upright bass stage soft focus, amber spotlight single directional, worn leather bar decades patina, dirty martini olive, signed jazz photos exposed brick, Edison cloth cord, piano keys catching light distant.',
    fabric: 'BODYCON STRETCH: Polyester-elastane 85/15 with fluorescent optical brightener in coral. Electric coral 580-620nm transmission, UV-reactive absorbing 365nm re-emitting 590nm Stokes shift phi=0.45. Under UV bar accents: fabric radiates brighter than pure reflection creating self-luminous glow. 4-way stretch body tension: skin-contact adhesion with visible contour mapping. Single strap: asymmetric diagonal strain field across torso. Amber spotlight: warm specular on coral creating hot orange zone.',
    hosiery: 'HOSIERY: Black thigh-high stockings with thin coral ribbon welt. 15-denier T=0.76 semi-sheer. UV accent makes coral ribbon fluoresce. Warm-cool contrast coral above black below.',
  },

  // === ROOFTOP NIGHTSCAPE (6-10) ===
  {
    name: '06-ivory-satin-extreme-slit-rooftop',
    attire: 'She wears an ivory white liquid satin one-shoulder mini dress with a high side slit on the left. Single wide strap right shoulder. Ivory satin catches every colored light as a chromatic projection screen. Bias-cut hemline. The architectural slit line and asymmetric single-strap silhouette create dramatic movement.',
    scene: 'Vegas rooftop bar: Strip panoramic south golden warm, mountains dark west silhouette, string lights warm overhead, fire pit circular, pool distant LED cyan, first stars appearing, desert cooling air, cocktail rosemary sprig garnish, salt-rimmed glass.',
    fabric: 'WHITE SATIN: 19-momme charmeuse lustrous face. Ivory R=0.87 broadband Lambertian diffuse: projection screen showing Strip warm + fire amber + pool cyan simultaneously as colored light map. Bias-cut 45-degree at slit edge allows maximum elastic opening. Slit edge catches direct light as bright specular line hip to hem. Silk birefringence delta_n=0.04 polarization-dependent shimmer. Strip skyline: warm golden streaks elongated on curved surface. Fire pit: 1-3Hz animated warm on lower panels.',
    hosiery: 'HOSIERY: White thigh-high stockings satin welt matching dress. 12-denier T=0.82 ultra-sheer white. Continuous monochromatic line dress to toe. Strip warm catches ultra-sheer golden.',
  },
  {
    name: '07-copper-hammered-asymmetric-rooftop',
    attire: 'She wears a hammered copper-bronze metallic jersey asymmetric one-shoulder micro dress. Single strap right shoulder leaving entire left shoulder arm and side bare. Hundreds of tiny concave dimple-mirrors each catching light independently. Draped cascade fold at right hip. Extremely short hemline.',
    scene: 'Rooftop lounge dusk: amber sky fading indigo east, Strip coming alive with lights, fire table low flames, outdoor bar bamboo steel, lanterns paper warm overhead, cocktail copper mug Moscow mule, desert cooling breeze.',
    fabric: 'HAMMERED METALLIC: Micro-concavity dimples r=2-5mm depth 0.3-0.8mm stamped into knit metallic jersey. Each dimple concave mirror f=r/2 creating inverted miniature real image of nearby light sources. Cook-Torrance roughness alpha=0.35 Beckmann distribution. Copper spectral: R=0.18 at 480nm to R=0.87 at 700nm warm bronze. Fire table: 1-3Hz animated dancing warm in each dimple. Grecian asymmetric drape: alternating highlight-shadow rhythm with each fold different curvature. Paper lanterns: soft warm points captured in dimple mirrors.',
    hosiery: 'HOSIERY: Bronze-shimmer thigh-high stockings copper-metallic lace welt. 15-denier T=0.76 metallic shimmer extending bronze palette. Fire table catches shin specular.',
  },
  {
    name: '08-emerald-charmeuse-bare-back-chain-rooftop',
    attire: 'She wears an emerald green liquid satin charmeuse halter micro dress with cutaway bare back connected by a thin gold chain draping in two cascading loops across exposed spine from nape to waist. Halter high neck front. Ultra-short bias-cut hemline. Emerald satin front with chain-draped open back architecture.',
    scene: 'Infinity pool edge rooftop: water surface catching sunset, pool LED deep blue, Strip through glass railing, cocktail tropical garnish, wet footprints deck, palm frond shadow, warm evening, distant helicopter lights.',
    fabric: 'EMERALD CHARMEUSE + CHAIN: 19-momme warp-float anisotropic specular 3:1 elongated liquid. Emerald absorption 600-700nm. Catenary drape body-mapping. Chain 14K gold-plate two loops against spine: each link 3mm tiny mirror, chain sway 0.5-1.5Hz pendulum from body movement. Pool LED blue: silk reflects creating teal where blue mixes with emerald green. Chain-on-skin: warm metal pressing creating faint compression. Sunset warm directional: silk becomes brilliant emerald-gold on sun-side, deep emerald shadow-side.',
    hosiery: 'HOSIERY: Black thigh-high stockings thin emerald ribbon bow welt. 15-denier T=0.76 semi-sheer. Pool caustics on shins. Chain gold accent at welt. Sunset warm catches stockings.',
  },
  {
    name: '09-hot-pink-vinyl-strapless-rooftop',
    attire: 'She wears a hot pink high-shine PVC vinyl strapless bandeau micro dress. Completely strapless extreme body tension zero ease. Near-mirror vinyl catches every light as brilliant magenta-white specular streaks. Sweetheart bandeau neckline. Ultra-short hemline. Vivid saturated Vegas pink.',
    scene: 'Pool party night: LED pool shifting colors below, cabanas white curtains, palm trees uplighted green, DJ booth pool-edge massive speakers, bottle sparklers approaching, champagne spray frozen, bikini crowd distant, neon palm sign.',
    fabric: 'VINYL: PVC n=1.54 Ra<0.05 near optical-polish. Fresnel at normal R_0=4.6% rising via Schlick approaching near-total at grazing on hip curves. Hot pink: selective absorption 490-560nm green, dual-band 610-650nm + 420-470nm transmission creating additive magenta. Pool LED: color shifts across vinyl following changing pool illuminant -- pink vinyl becomes different hue every color cycle. Specular achromatic white streaks along maximum curvature. Sparkler approaching: broadband white reveals maximum brilliance. Subsurface PVC 0.3-0.5mm translucent corona.',
    hosiery: 'HOSIERY: Black thigh-high stockings hot pink ribbon welt. 15-denier T=0.76 matte black. Strong texture contrast matte against mirror vinyl. Pool LED catches ribbon cycling. Sparkler bright accent.',
  },
  {
    name: '10-black-sequin-wrap-extreme-slit-rooftop',
    attire: 'She wears a jet black micro-sequin wrap mini dress with crossover V neckline deep wrap front, wrap tie at left hip creating a high slit on the left. Thousands of 3mm black sequins creating textured matte-sparkle. Three-quarter sleeves. Wrap sash trails at hip.',
    scene: 'Rooftop cocktail terrace: skyline panoramic warm, string lights canopy overhead, fire table rectangular, modern outdoor furniture chrome, cocktail smoked glass cloche, desert sky stars emerging, breeze hair movement.',
    fabric: 'BLACK SEQUIN WRAP: 3mm jet-black anodized Al R=0.25 subdued dark-sparkle. Pivot-sewn 15-degree tilt range: at rest near-uniform dark, micro-movements cause stochastic 10-25Hz twinkle. Wrap V converging: directional sparkle density gradient at neckline. Extreme slit left: wrap opens revealing full leg. Fire table: 1-3Hz warm animated in reflections. String lights: scattered warm points across dark field. Asymmetric: diagonal sparkle termination at shorter left. Skyline warm: distant golden streaks in sequin surface.',
    hosiery: 'HOSIERY: Black thigh-high stockings plain thin welt. 20-denier T=0.62 matte black. Dark sequin transitions to dark stocking seamless. Extreme slit reveals full stocking. Fire warm on shin.',
  },

  // === CASINO HIGH-ROLLER (11-15) ===
  {
    name: '11-rose-gold-strapless-bandeau-casino',
    attire: 'She wears a rose gold metallic strapless bandeau micro dress. Completely strapless body tension. Rose gold selective reflectance warm pink-copper. Sweetheart neckline. Ultra-short hemline. Warm rose metal catches chandelier as scattered pink-gold fire across the casino VIP salon.',
    scene: 'Casino VIP salon: mahogany paneling gold trim, crystal chandelier massive warm, roulette green felt through glass, brandy snifter amber, leather wingback, velvet rope gold, cigar smoke wisps, old money atmosphere.',
    fabric: 'ROSE GOLD METALLIC: Cu-Sn alloy R=0.18@480nm to 0.65@580nm to 0.82@700nm warm rose selective. Strapless horizontal compression. Chandelier overhead: hundreds of warm pink-gold reflections scattered across surface. Green felt: unusual rose-gold / cool-green complementary split. Mahogany: warm wood bounce reinforcing rose tone. Brandy amber: environmental warm fill. Cigar smoke: volumetric scatter creating soft warm haze between chandelier and metallic. Velvet rope gold: warm matching environmental accent. Roulette through glass: green-on-rose complementary color reflection visible on hip curve.',
    hosiery: 'HOSIERY: Black thigh-high stockings rose gold ribbon welt. 15-denier T=0.76 semi-sheer. Chandelier catches welt warm. Green felt cool faint fill. Rose ribbon bridges dress to welt warm accent.',
  },
  {
    name: '12-crimson-vinyl-wrap-extreme-slit-casino',
    attire: 'She wears a deep crimson high-shine PVC vinyl wrap micro dress with crossover V deep wrap front, wrap tie right hip with high slit from tie on right side. Left side full panel. Crimson vinyl near-mirror catches casino lights as dark wine-red specular streaks.',
    scene: 'High-roller pit: exclusive area brass rope, mahogany table edge, crystal whiskey tumbler heavy, chandelier tiered, slot LED distant bleed, suited security, cigar lounge glass wall, bourbon amber backlit, chips stacked.',
    fabric: 'CRIMSON VINYL WRAP: PVC n=1.54 polish. Crimson absorption 430-560nm deep wine. Subsurface 0.3-0.5mm translucent corona. Schlick grazing bright crimson rim. Wrap compression from knot right: slit opens from tie opening right-leg side. Chandelier warm: hot specular zones on vinyl with dark absorption between. Bourbon backlit amber: warm environmental fill. Vinyl rigid: slit holds open clean edge. Slot LED: colored bleed creating unexpected hue zones on crimson.',
    hosiery: 'HOSIERY: Black thigh-high stockings thin crimson ribbon welt. 15-denier T=0.76 matte. Extreme slit reveals full stocking right. Chandelier warm catches shin. Bourbon warm fill.',
  },
  {
    name: '13-white-leather-corset-open-back-casino',
    attire: 'She wears a white leather structured corset micro dress with 14 visible steel boning, sweetheart bustline, and completely open lace-up back chrome grommets with white leather cord criss-crossing. Extremely short hemline. White leather catches casino lights as warm chromatic map. Corset cinches dramatic hourglass.',
    scene: 'Casino bar floor: slot machine wall LED cycling, marble walkway polished, chandelier warm overhead, cocktail server tray passing, craps felt green glow, constant motion energy, ice melting in glass.',
    fabric: 'WHITE LEATHER CORSET: Chrome-tanned cowhide 0.8mm calfskin. White R=0.78 broadband: acts as projection screen for slot LED cycling colors creating animated color wash across leather. 14 steel bones vertical geometry with highlight-shadow transitions at ridge edges. Corset compression: concave surfaces between bones focus light into caustic lines. Chrome grommets along spine bright constellation. Lace-up tension: radiating wrinkles from each grommet. Marble: bright bounce from below. Slot cycling: leather becomes color palette responding to changing LED.',
    hosiery: 'HOSIERY: White thigh-high stockings satin welt matching. 12-denier T=0.82 ultra-sheer. Slot LED catches sheer as cycling colored accent. Marble reflects doubled. White continuity dress to stocking.',
  },
  {
    name: '14-sapphire-sequin-backless-waist-clasp-casino',
    attire: 'She wears a deep sapphire sequin micro dress completely backless held only by a single jeweled clasp at small of back at waist. No straps no back fabric. Thousands of 4mm sapphire sequins. Deep V front. Ultra-short hemline. Entire back bare shoulders to waist where crystal clasp connects two panels. Sapphire sparkle front open back.',
    scene: 'Casino private gaming: dark wood ceiling coffered, crystal decanter bourbon silver tray, leather-top card table, pendant brass spotlight single, wall sconces warm dim, heavy door ajar, velvet curtain half-drawn.',
    fabric: 'SAPPHIRE SEQUIN BACKLESS: 4mm sapphire-anodized Al R>0.65 at 450-490nm strong blue. Crystal clasp: 15mm Swarovski n=1.65 prismatic focal point projecting rainbow caustics onto lower back skin. Two panels converge hourglass at clasp. Pendant spotlight: single warm key creating one bright zone with rest shadowed. 8-20Hz stochastic blue sparkle. Bare back: pendant models spine shoulders to clasp. Dark wood: warm bounce overhead. Decanter amber: warm caustic projection.',
    hosiery: 'HOSIERY: Black thigh-high stockings thin sapphire ribbon welt. 15-denier T=0.76 matte. Pendant catches ribbon as warm-on-blue accent. Dark wood bounce. Clasp caustics occasionally fall onto welt.',
  },
  {
    name: '15-forest-velvet-extreme-bare-back-casino',
    attire: 'She wears a deep forest green crushed velvet halter micro dress with completely bare back scooped from nape past sacrum. Halter behind neck. Crushed pile creates rich light-absorbing drama with chaotic anisotropic texture. Ultra-short hemline. Full extreme bare back -- forest void front bare skin back.',
    scene: 'VIP poker room: green felt table center, overhead brass cone pendant, crystal tumblers bourbon, leather chairs brass studded, wood paneling dark, cigar box cedar open, gold chip stacks, quiet intense atmosphere.',
    fabric: 'FOREST CRUSHED VELVET: Rayon-silk pile 3mm random crush anisotropic BRDF. Forest absorption 600-700nm red + 420-460nm blue, transmits 520-560nm green. Crushed pile mosaic: pile-toward R=0.40 warm forest, pile-away R=0.05 near-black dramatic contrast. Brass pendant: single directional warm on velvet creating illuminated zone in green-gold. Green felt table: reinforcing green from below. Bare back: pendant warm directly on skin modeling vertebrae. Halter V-strain nape. Cigar smoke: volumetric haze between pendant and fabric.',
    hosiery: 'HOSIERY: Black thigh-high stockings thin forest velvet ribbon welt. 20-denier T=0.62 matte black extending void. Pendant warm catches shin. Felt green faint fill below. Compression gradient.',
  },

  // === NIGHTCLUB VIP (16-20) ===
  {
    name: '16-silver-metallic-double-slit-nightclub',
    attire: 'She wears a liquid silver metallic jersey mini dress with side slits on both left and right. Sleeveless scoop neck. Silver metallic catches every light as brilliant neutral streaks. The bilateral slit architectural silhouette creates dramatic movement with each step.',
    scene: 'Mega-club main floor: LED ceiling grid shifting colors, CO2 cannons frozen mist, confetti suspended strobe-frozen, bottle service chrome, LED bar top blue, crowd energy, trampled wristband, bass vibration visible in drinks.',
    fabric: 'SILVER METALLIC JERSEY: Al vapor-deposited R=0.88 neutral mirror jersey. Bias-cut panels following body curvature. LED ceiling: multicolor overhead reflected as colored mosaic mapped across silver surface continuously. CO2 mist: volumetric scatter creating atmospheric depth haze around dress. Confetti: tiny colored reflections scattered across silver field from above. Body curvature creates distorted mirror of ceiling light grid as anamorphic environmental map. Slit edges: clean cut bias-grain with minimal fraying.',
    hosiery: 'HOSIERY: Nude thigh-high stockings silver-shimmer metallic welt. 10-denier T=0.87 ultra-sheer. LED ceiling catches ultra-sheer creating faint chromatic accent. CO2 mist atmospheric haze at ankles.',
  },
  {
    name: '17-crimson-crepe-cutaway-chain-nightclub',
    attire: 'She wears a deep crimson stretch crepe halter micro dress with completely bare cutaway back from nape to below sacrum, connected only by a thin gold chain draping in three cascading loops across exposed spine. Halter high neck front. Ultra-short hemline. Open back architecture with ornamental chain catching every light as it sways.',
    scene: 'Underground club: industrial concrete walls, copper pipe ceiling exposed, moving head lights sweeping, fog machine dense low, bass bins vibrating floor, DJ elevated glass booth, crowd silhouettes, spilled drink sticky floor.',
    fabric: 'CRIMSON CREPE CUTAWAY: Polyester crepe 150gsm matte micro-pebble diffuse scatter alpha=0.45 broad lobe. Crimson absorption 430-560nm. Cutaway back: complete absence nape to sacrum. Chain 14K gold three loops catenary y=a*cosh(x/a) against spine, 3mm links tiny mirrors. Chain sway 0.5-1.5Hz pendulum: each swing shifting caustic projections on bare back. Moving head sweep: chain catches beam momentarily creating golden flash. Chain-on-skin: warm metal compression marks. Fog: volumetric scatter around chain creating warm halo.',
    hosiery: 'HOSIERY: Black thigh-high stockings thin crimson ribbon welt. 15-denier T=0.76. Moving head catches shin momentarily. Chain gold accent at welt. Fog haze at ankles.',
  },
  {
    name: '18-sapphire-sequin-strapless-nightclub',
    attire: 'She wears a deep sapphire blue sequin strapless bandeau micro dress. Completely strapless extreme body tension. Thousands of 4mm sapphire sequins. Sweetheart neckline. Ultra-short hemline. Thousands of sapphire sequins creating maximum sparkle drama.',
    scene: 'Luxury nightclub: crystal chandelier massive, mirror wall floor-ceiling bar, black marble floor polished, VIP banquette purple velvet, champagne tower crystal, gold fixtures, DJ glass elevated, crushed rose petal.',
    fabric: 'SAPPHIRE SEQUIN STRAPLESS: 4mm sapphire-anodized Al R>0.65 at 450-490nm. Strapless horizontal compression. Chandelier: hundreds warm reflections scattered across blue creating warm-in-cold contrast. Mirror wall: recursive multiplication of sparkle. Black marble: mirror reflection below doubled constellation. 8-20Hz stochastic blue sparkle. Champagne tower: crystal catching and projecting caustics. VIP purple: complementary warm-cool palette. Gold fixtures: neutral specular accent points punctuating blue field. Rose petals: warm organic complement on dark marble creating scattered warm spots below.',
    hosiery: 'HOSIERY: Black thigh-high stockings thin sapphire ribbon welt. 15-denier T=0.76 semi-sheer matte. Chandelier catches welt warm. Marble reflects stockings doubled below. Sapphire ribbon bridges dress to stocking.',
  },
  {
    name: '19-bronze-scale-one-shoulder-nightclub',
    attire: 'She wears a hammered bronze metallic scale-sequin one-shoulder micro dress where overlapping 6mm scales create armor texture. Single strap left shoulder leaving right side completely bare. Scales shift copper-to-bronze with movement. Ultra-short hemline. Dramatic armor texture effect with asymmetric silhouette.',
    scene: 'Avant-garde club: projection-mapped walls geometric, UV strip lighting floor, mirror ball overhead classic, smoke thick, LED furniture cubes glowing, angular bar polished steel, DJ holographic display, broken glow stick.',
    fabric: 'BRONZE SCALE ARMOR: 6mm elongated hex scales overlapping 60%. Each scale Cu-Sn R=0.18@480nm to R=0.72@580nm warm. Scale tilt varies with curvature: ribs copper (normal), waist bronze (45-degree), hip warm-gold (grazing). Mirror ball: rotating caustic dots sweeping across. Projection-mapped: animated geometry projects onto scales. UV strip: violet accent from below. Smoke: volumetric scatter between scale ridges. One-shoulder diagonal: scales align along diagonal stress.',
    hosiery: 'HOSIERY: Bronze-shimmer thigh-high stockings copper lace welt. 15-denier T=0.76 metallic shimmer. Mirror ball caustics sweep. UV catches welt. Scale-to-smooth transition at hemline.',
  },
  {
    name: '20-black-vinyl-cutout-extreme-nightclub',
    attire: 'She wears a jet black high-shine PVC vinyl micro dress with bold geometric cutouts: triangle shapes at both hip sides, V-cutout front sternum, rectangular cutout center back. Sleeveless. Vinyl void with bright Fresnel rim-light contouring every cutout edge. Ultra-short hemline. Geometric windows against mirror-black vinyl.',
    scene: 'Modern club: LED infinity mirror tunnel entrance, chrome fixtures, polished black granite bar, overhead spots focused, cocktail molecular foam, DJ glass LED panel, security camera visible, premium liquor backlit.',
    fabric: 'BLACK VINYL CUTOUT: PVC n=1.54 carbon-black. Normal R=0.04 void. Schlick grazing near-total bright rim. Every cutout boundary creates NEW rim-light -- triangle sides V-edges rectangle ALL generate bright lines. Multiple cutouts multiply rim-light creating geometric constellation on black. LED infinity: recursive reflection in tunnel on vinyl. Downlight spots: strong top-down gradient bright shoulders dark hemline. Through cutouts: warm skin lit by same downlights in geometric shapes. Subsurface PVC glow corona at cutout edges.',
    hosiery: 'HOSIERY: Black thigh-high stockings 20-denier T=0.62 matte seamless extending vinyl void. Downlight catches shin sole specular. LED infinity reflects in vinyl not nylon texture contrast.',
  },

  // === ULTRA-LOUNGE (21-25) ===
  {
    name: '21-gold-chainmail-cowl-micro-lounge',
    attire: 'She wears a gold metal chainmail micro dress with a cowl neckline and halter behind the neck with an open back. Thousands of 2mm interlocking gold rings. Short hemline. The 2.5kg gold flows with liquid-metal weight. Cowl neckline framed by cascading gold rings.',
    scene: 'VIP bottle service: private booth velvet partition, LED underglow table purple, champagne magnum sparkler approaching, crystal flutes, contemporary dark luxury, DJ through glass bass shaking, fog low floor.',
    fabric: 'GOLD CHAINMAIL: European 4-in-1 gold-plated 2mm ID. Gold selective R>0.80 above 550nm warm. Each ring independent toroidal fish-eye mirror. Sparkler approaching: broadband white reveals maximum brilliance across chain surface. LED purple underglow: table-bounce upward creates bottom-lit gold. Cowl weight: gold mass pulls deep creating maximum low drape. Bare back: every venue light on skin directly. Fog: volumetric between rings. Chain momentum persistence after movement. Champagne flute: catching gold spill.',
    hosiery: 'HOSIERY: Nude thigh-high stockings gold-shimmer lace welt. 10-denier T=0.87 ultra-sheer. Chain fringe at hemline over welt. LED purple catches. Sparkler bright accent on welt.',
  },
  {
    name: '22-amethyst-sequin-extreme-backless-lounge',
    attire: 'She wears an amethyst purple sequin halter micro dress with dramatically open bare back scooped to the lower back. Sleek high neck front. Thousands of 4mm amethyst sequins. Ultra-short hemline. Open back against amethyst sparkle front. Deep purple drama.',
    scene: 'Upscale lounge: champagne tower crystal tiers, LED color-wash wall shifting slow, chrome fixtures, black leather, massive mirror bar, ice bucket hammered silver, DJ elevated ambient, bass energy.',
    fabric: 'AMETHYST SEQUIN BACKLESS: 4mm amethyst-anodized Al. Selective R>0.55 at 420-460nm violet + 620-660nm red creating additive purple. LED color-wash: shifts purple tone warm or cool depending on wash phase. 8-20Hz stochastic purple sparkle. Mirror bar: recursive multiplication. Champagne tower: crystal caustics onto purple. Bare back: LED directly on skin cycling. Chrome: bright neutral accent points. Ice bucket: cold metallic complement against warm purple. Black leather: deep absorption framing sequin sparkle. Bass vibration: micro-oscillation of sequins creating subtle shimmer modulation.',
    hosiery: 'HOSIERY: Black thigh-high stockings thin amethyst ribbon welt. 15-denier T=0.76 semi-sheer. LED catches ribbon cycling warm. Mirror reflects stockings doubled below. Purple ribbon bridges dress to welt.',
  },
  {
    name: '23-holographic-strapless-bandeau-lounge',
    attire: 'She wears a holographic iridescent metallic strapless bandeau micro dress. Completely strapless body tension. Holographic shifts full spectrum teal-magenta-gold with micro-movement. Sweetheart neckline. Ultra-short hemline. Iridescent rainbow drama catching every light source in the lounge.',
    scene: 'Modern lounge: LED-lit acrylic furniture glowing blue, massive video wall abstract, chrome everywhere, bottle sparklers approaching, fog light beams, black marble floor mirror, cocktail smoked cloche.',
    fabric: 'HOLOGRAPHIC METALLIC: Multilayer Al/SiO2/TiO2 nano-stack full spectral interference. Strapless horizontal compression. Sparkler broadband: reveals maximum rainbow simultaneously. LED blue acrylic: table-bounce creates bottom-lit holographic. Fog: volumetric scatter below. Video wall: abstract animation reflected as changing color. Full spectral shift teal-magenta-gold continuous with viewing angle creating living rainbow. Marble: mirror below doubling rainbow. Chrome everywhere: neutral specular accent points reflecting holographic spectrum. Fog light beams: volumetric scatter creating atmospheric depth between lounge surfaces. Cocktail cloche: glass dome catching miniature holographic reflection.',
    hosiery: 'HOSIERY: Nude thigh-high stockings holographic thread welt matching rainbow. 10-denier T=0.87 ultra-sheer. LED catches ultra-sheer warm glow. Fog haze at ankles. Sparkler catches welt bright accent.',
  },
  {
    name: '24-pearl-crystal-beaded-backless-lounge',
    attire: 'She wears a pearl white crystal-beaded halter micro dress completely bare back scooped past sacrum. Halter behind neck. Thousands of 2mm faceted crystal beads. Ultra-short hemline. Crystal beads create prismatic rainbow fire -- spectral dispersion scattering micro-rainbows from every bead. Full bare back.',
    scene: 'Luxury hotel lounge: Carrara marble bar, gold fixtures, crystal chandelier massive, mirror panels, champagne tower, white orchids bowls, gold ambient soft, live pianist, gold-leaf plate.',
    fabric: 'CRYSTAL BEAD PRISMATIC: 2mm faceted Swarovski n=1.65 high-dispersion. Each bead dispersive: white enters exits as spectral fan projecting tiny rainbow on nearby surfaces. Thousands simultaneously fill room with micro-rainbows. Chandelier: warm enters crystals creating warm spectral fans. Marble bounce: enhanced luminosity. Mirror: recursive multiplication of prismatic projections. Bare back: chandelier direct on skin with rainbow projections from edge beads. 280/cm^2 maximum prismatic density. Crystal weight 1.6kg gentle pull.',
    hosiery: 'HOSIERY: Nude thigh-high stockings pearl-shimmer crystal welt. 10-denier T=0.87 ultra-sheer. Rainbow projections as chromatic spots on stockings. Chandelier warm on sheer. Marble doubled below.',
  },
  {
    name: '25-black-lace-illusion-corset-lounge',
    attire: 'She wears a jet black French lace over skin-tone illusion mesh structured corset micro dress. Intricate floral lace pattern creates a floating lace silhouette effect. 14 steel boning channels. Sweetheart bustline. Open lace-up back with chrome grommets. Short hemline. Architecturally structured French lace corset silhouette.',
    scene: 'Dark cocktail lounge: pendant brass spots, champagne coupe crystal, mirror panels reflections, leather booth deep, low table candle flickering, DJ transitioning, cocktail smoke trail, velvet cushions scattered.',
    fabric: 'BLACK LACE ILLUSION: French Chantilly floral on 15-denier skin-tone mesh T=0.76. Lace opacity varies: dense centers opaque, thread intersections semi-opaque, mesh zones translucent creating depth layering. 14 steel bones through mesh as structural lines visible as subtle vertical shadows. Chrome grommets along spine as bright constellation points. Candle 1800K: warm through lace creating intricate pattern of light and dark. Pendant spots: focused warm on lace creating patterned shadow on mesh below. Mirror: recursive lace multiplication doubled. Sweetheart through lace creating patterned scalloped edge.',
    hosiery: 'HOSIERY: Black thigh-high stockings thin lace welt matching dress. 15-denier T=0.76. Candle warm on lace welt. Mirror doubles below. Lace pattern bridges dress to stocking.',
  },

  // === PENTHOUSE SKY (26-30) ===
  {
    name: '26-gold-vinyl-spine-chain-penthouse',
    attire: 'She wears a bright gold high-shine PVC vinyl halter micro dress with cutaway bare back connected by three cascading gold chains from nape to waist. Halter high neck front. Gold vinyl near-mirror catches city panoramic as warm distorted reflections. Ultra-short hemline. Gold-on-gold unified warm metallic back architecture.',
    scene: 'Penthouse panoramic: floor-ceiling glass three walls, Strip south golden, mountains dark west, personal bar marble, pendant light designer, modern art wall, fireplace gas linear, desert stars, city carpet below.',
    fabric: 'GOLD VINYL CHAIN: PVC n=1.54 gold metallic. Gold selective R>0.80 above 550nm. Three chains catenary against bare spine: 3mm links tiny mirrors. Chain sway 0.5-1.5Hz. Vinyl reflects city panoramic as warm distorted wrap-around. Fireplace: 1-3Hz dancing gold hot spots. Schlick grazing bright gold rim. Strip skyline: elongated warm building-light streaks on curved surface. Chain-on-skin: warm metal compression. Subsurface PVC glow. Stars through glass: atmospheric.',
    hosiery: 'HOSIERY: Black thigh-high stockings gold metallic ribbon welt. 15-denier T=0.76. City panoramic catches ribbon. Fireplace warm. Chain gold at welt.',
  },
  {
    name: '27-electric-blue-sequin-strapless-penthouse',
    attire: 'She wears an electric blue sequin strapless bandeau micro dress. Completely strapless extreme body tension. Thousands of 4mm electric blue sequins. Sweetheart neckline. Ultra-short hemline. Electric blue sparkle against night city panoramic.',
    scene: 'Sky penthouse corner: three glass walls panoramic, neon art purple wall, low modern white chrome, in-unit pool LED blue small, DJ setup personal, skyline wrapping, caviar service, helicopter distant.',
    fabric: 'ELECTRIC BLUE SEQUIN: 4mm electric-blue-anodized Al R>0.70 at 450-490nm. City panoramic three walls: warm golden reflections in blue creating warm-in-cold contrast. Neon purple: reflected creating violet on neon-facing. Pool LED: reinforces blue from below monochromatic zone. 8-20Hz stochastic blue sparkle. Strapless compression. Three-wall panoramic continuous reflection. Skyline warm: golden city streaks in blue field. Helicopter: tracking light crossing surface slowly. Caviar service: dark neutral tray creating absorption zone near bright sequins. In-unit pool: cyan LED bounce from below creating cool bottom-light. Personal DJ: colored LEDs adding animated accent to blue field.',
    hosiery: 'HOSIERY: Black thigh-high stockings thin electric blue ribbon welt. 15-denier T=0.76 semi-sheer. City warm catches shin. Neon purple catches welt accent. Pool blue underglow from below.',
  },
  {
    name: '28-rose-gold-scale-wrap-extreme-slit-penthouse',
    attire: 'She wears a rose gold metallic scale-sequin wrap micro dress, overlapping 6mm scales creating armor mermaid texture. Crossover V deep wrap front, wrap tie right hip creating high slit right side. Scales shift copper-to-pink-to-gold. Three-quarter sleeves.',
    scene: 'Penthouse living bar: open plan massive, floor-ceiling glass corner, LED strip warm ceiling, fire table rectangular, Calacatta marble island, wine fridge glowing, bronze sculpture abstract, city two walls.',
    fabric: 'ROSE GOLD SCALE WRAP: 6mm hex scales overlapping 60%. Each Cu-Sn rose gold iridescence copper-pink-gold. Scale tilt curvature: ribs copper, waist pink, hip gold. Wrap compression from knot: scales compressed showing all three colors tight radius. Extreme slit right: wrap opens maximum exposure. Fire table: 1-3Hz animated catching scales as dancing warm. LED warm overhead: reinforces rose. Marble: bright bounce below. City: warm building lights in individual scales as tiny images. Scale edges: thin dark shadow lines.',
    hosiery: 'HOSIERY: Black thigh-high stockings rose gold ribbon welt. 15-denier T=0.76. Fire catches welt warm. Marble bounce below. Extreme slit reveals full stocking right.',
  },
  {
    name: '29-black-mesh-back-bodycon-penthouse',
    attire: 'She wears a jet black bodycon micro dress with a sheer mesh back panel from nape to hemline. Solid opaque front and sides. Sleeveless high neck. Short hemline. The architectural contrast between opaque front panels and textured mesh back creates the design statement.',
    scene: 'Modern penthouse bar: walnut brass fixtures, panoramic window floor-ceiling, pendant sculptural designer, art photography large, bourbon backlit collection, Barcelona leather chair, city below, orchid stem, jazz vinyl.',
    fabric: 'BLACK MESH BACK: Front polyester-elastane 4-way opaque stretch. Back panel: hexagonal mesh T=0.70 semi-translucent creating subtle depth texture overlay. Pendant: warm through mesh creating hex-grid shadow pattern on back panel. Panoramic: city lights through mesh creating layered warm-on-dark depth. Mesh structure: hexagonal grid visible as geometric repeating pattern under directional light. Front-to-back: abrupt opaque to textured at side seam boundaries. Bourbon amber: warm environmental fill. Walnut bar: warm wood bounce reinforcing pendant warmth.',
    hosiery: 'HOSIERY: Black thigh-high stockings 20-denier T=0.62 seamless extending front void. Pendant shin. City reflects faint. Mesh-to-opaque stocking transition.',
  },
  {
    name: '30-diamond-white-vinyl-strapless-penthouse',
    attire: 'She wears a diamond white high-shine PVC vinyl strapless bandeau micro dress. Completely strapless body tension. White vinyl near-mirror acts as projection canvas displaying entire penthouse environment as colorful reflections. Sweetheart neckline. Ultra-short hemline. Reflective canvas capturing city Strip firelight as chromatic environmental map.',
    scene: 'Ultimate penthouse: highest floor three glass walls, entire Strip south warm, mountains dark west, airport east linear, stars desert sky, champagne bar marble, Baccarat crystal, white grand piano, candles everywhere, top of world.',
    fabric: 'WHITE VINYL PROJECTION: PVC n=1.54 white metallic R=0.82 broadband neutral. Becomes projection canvas: Strip south warm golden panoramic streaks. Mountains west dark blue-grey. Airport east linear runway pattern. All reflected simultaneously chromatic environmental map wrapped around body. Subsurface translucent glow corona. Schlick grazing bright white rim. Strapless compression. Candles 1800K: animated warm points scattered. Grand piano: large dark reflection hip. Stars: atmospheric reference. Three-wall panoramic wrap-around reflection.',
    hosiery: 'HOSIERY: Nude thigh-high stockings diamond-shimmer crystal welt. 10-denier T=0.87 ultra-sheer. Strip catches ultra-sheer warm. Three-wall reflections on stockings. Candle warm on welt.',
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

console.log(`\n=== V12 APEX - V7 PHYSICS (870w) + V12 CONCEPTS + 4 CAMERA ARTIFACTS ===`);
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
console.log('V12 APEX RESULTS');
console.log(`${'='.repeat(60)}`);
const ok = results.filter(r => r.ok);
console.log(`Success: ${ok.length}/${results.length}`);
results.forEach(r => console.log(`  ${r.ok ? 'OK' : '!!'} ${r.name}${r.err ? ': ' + r.err : ''}`));
console.log(`\nOutput: ${OUTPUT_DIR}`);

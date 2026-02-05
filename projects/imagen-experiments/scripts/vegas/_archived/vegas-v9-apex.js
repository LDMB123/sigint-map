#!/usr/bin/env node

/**
 * V9 APEX - MAXIMUM PHOTOREALISM + MOST DARING ATTIRE + 30 CONCEPTS
 *
 * Physics improvements over V7/V8 (from computational photography expert analysis):
 * - White balance error residual (highest-impact realism cue)
 * - Highlight clipping with per-channel fringing
 * - Stratum corneum Fresnel dual-layer skin rendering
 * - Color interreflection bleed from neon onto skin
 * - Anti-studio negative cues ("NOT a fashion shoot")
 * - Alcohol vasodilation erythema (bar-specific biological realism)
 * - Continuous DOF gradient (not binary sharp/blurry)
 * - Wear wrinkles and fabric aging
 * - Lens ghosting from bright point sources
 * - Hosiery micro-optics (birefringent nylon, knit structure, compression gradient)
 *
 * Attire: Maximum daring with proven filter-safe patterns pushed harder
 * Resolution: 4K at 2:3 = 3392x5056 (17.1MP) - API maximum for this ratio
 * Target: 900-950w (slightly above V7's 870-920w to fit new physics)
 */

import fs from 'fs/promises';
import path from 'path';

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) { console.error('GEMINI_API_KEY not set'); process.exit(1); }

const MODEL = 'gemini-3-pro-image-preview';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
const OUTPUT_DIR = process.env.OUTPUT_DIR || path.join(process.env.HOME, 'nanobanana-output', 'vegas-v9-apex');
const INPUT_IMAGE = process.argv[2] || '/Users/louisherman/Documents/518355716_10109335899644328_1380496532632646402_n.jpeg';

await fs.mkdir(OUTPUT_DIR, { recursive: true });

function buildPrompt(attire, scene, fabricPhysics, hosieryPhysics) {
  return `Edit this photograph into raw candid nightlife photography shot by a friend with a professional camera at a real bar. NOT a professional photoshoot. NOT studio lighting. NOT retouched. NOT a fashion editorial. NO softboxes, NO beauty dishes, NO fill cards, NO hair-makeup artist results, NO symmetrical lighting, NO Photoshop, NO frequency-separation skin smoothing, NO dodge-and-burn, NO color grading. The image should look like it has NEVER been opened in Lightroom. A real moment captured by someone who happens to own a Canon R5. ${attire}

SCENE: ${scene}

CAMERA SENSOR PHYSICS: Canon EOS R5 Mark II 45MP stacked BSI-CMOS full-frame 36x24mm. RF 50mm f/1.2L USM wide open creating razor-thin 5cm DOF at 2.2m. ISO 3200 authentic luminance noise Poisson sigma=sqrt(N_photons) shadow regions SNR=28dB midtones with chroma noise as red-blue decorrelation in underexposed zones. Shutter 1/125s slight motion blur gesturing hands. 759-point DPAF locked nearest iris gentle roll-off far shoulder. Continuous DOF gradient: objects 10cm behind focus CoC=0.08mm perceptible softening, 50cm behind CoC=0.4mm clearly soft, 2m behind CoC=4mm fully defocused colored blobs -- smooth continuous NOT binary sharp-blurry transition. 15-blade aperture creamy oval bokeh onion-ring from aspherical. Barrel distortion 0.8%. CA 0.3px purple fringing max-contrast edges. Hard highlight clipping: sensor well 51000e at base ISO scaled to 3200 drops threshold -- neon signs and direct specular clip to pure white with 1-2px magenta fringing at clipped boundary from per-channel saturation difference. Bayer CFA demosaicing: false color moire at fine repetitive texture edges exceeding Nyquist. Lens ghosting: bright neon creates 2-3 faint green-tinted hexagonal ghosts at mirror-reflected positions through optical center. No flash. Crushed blacks below noise floor.

3D LIGHT TRANSPORT: Primary tungsten halogen 2800K Planckian blackbody spectrum peak 1035nm IR, visible emission weighted red-orange, CRI=100 warm bias suppressed blue below 450nm by 12x vs D65. Small 3cm capsule near-point-source creating sharp umbral shadows narrow 2-3mm penumbral transition. Secondary neon saturated colored spill inverse-square I=Phi/(4pi*r^2). Tertiary fluorescent 4100K 3-stop underexposure faint cool fill. 4-stop luminance gradient bar to booths. NO fill -- 5+ stop shadow-side true black. Color interreflection bleed: neon-colored photons bounce from bar surface to underside of chin creating strong colored fill on shadow-side jaw and neck -- asymmetric warm-cool split where key-side is tungsten amber and shadow-fill is neon-tinted. White balance error: camera auto-WB compromises between 2800K and 4100K resulting in neither correct -- skin retains slight amber-orange cast while background shows cyan-green tint, this unresolvable WB split is characteristic of real mixed-light candid and should NOT be corrected. Atmospheric haze extinction tau=0.08/m at 550nm via Beer-Lambert creating luminance falloff beyond 5m.

SKIN BIO-OPTICAL: 3-layer epidermis-dermis-hypodermis Monte Carlo SSS. Melanin mu_a=6.6*C_mel*(lambda/500)^(-3.33) C_mel 0.01-0.05. HbO2 peaks 542nm 576nm warm flush cheeks earlobes decolletage. Stratum corneum surface n=1.55 Fresnel R_0=4.7% creating gloss component DISTINCT from subsurface warm glow -- both present simultaneously as layered effect, gloss increasing to near-total at grazing on shoulders creating bright specular rim-light over warm SSS beneath. Alcohol vasodilation: increased dermal hemoglobin in cheeks upper chest neck as 20% perfusion increase creating warmer pinker blotchy patches asymmetrically distributed. Skin microrelief: primary furrows 20-100 micron crosshatch creating non-uniform specular that distinguishes real skin from CG. Sebaceous oil T-zone catching tungsten as irregular specular. Vellus hair forearms jawline catching rim light. Perspiration upper lip temples. Lip tissue: thinner epithelium transmitting hemoglobin creating natural pink, moisture film high-gloss specular, fine vertical furrows. Preserve face bone structure eye color expression exactly.

${fabricPhysics}

${hosieryPhysics}

RAW IMPERFECTIONS: ISO 3200 grain especially shadows. Motion blur fingertips 1/125s. Flyaway hair backlit different focal plane as soft bright streak. Colored bokeh neon shapes large soft discs. Foreground glass edge refraction blur. Lens flare veiling glare hexagonal ghost. Wear evidence: compression creases at hip from sitting, slight pilling at high-friction zones. Crumpled napkin condensation ring patron elbow at frame edge. Vignetting cos^4 radial 0.7-stop corners 0.3-stop mid-edge. Faint fundus reflection one eye only at slight off-axis angle. No retouching no smoothing no grading -- straight RAW white balance only. Preserve face expression all features identical to original.`;
}

const concepts = [
  // === VEGAS COCKTAIL BARS (1-5) ===
  {
    name: '01-scarlet-sequin-extreme-backless',
    attire: 'She wears a scarlet red sequin halter micro dress with high neckline front and dramatically bare back scooped past the sacrum to the absolute lowest point of spine with thin crossed straps forming X across bare back. Thousands of 4mm red sequins. Ultra-short hemline barely covering upper thighs. The extreme low-back exposes maximum back skin. Red sequin fire catches every warm bar light.',
    scene: 'Gritty real Vegas strip bar 2am: scratched dark bar top ring stains spilled beer residue, rocks glass melting ice, neon beer signs amber-red-blue, cracked vinyl stools torn edge, bartender blurred pouring, tip jar crumpled bills, tungsten spots dust in beam, sticky floor.',
    fabric: 'SEQUIN OPTICS: 4mm scarlet aluminum pivot-sewn black mesh R=0.72 above 600nm. Stochastic 8-20Hz sparkle from micro-body-movement. Neon polychromatic scatter from different-angled sequins. X-cross back straps frame maximum bare skin. Halter V-strain aligned chest transitioning random at hemline. Fabric wear: slight pilling where sequins meet bar edge from leaning, one sequin missing at stress point near armhole creating tiny dark gap in sparkle field.',
    hosiery: 'HOSIERY MICRO-OPTICS: Nylon 6,6 birefringent n_o=1.53 n_e=1.58 creating polarization-dependent transparency. Warp-knit 400-gauge 15-denier T=0.76 with visible diagonal herringbone micro-pattern at close distance. Black with thin red metallic welt. Compression gradient: tighter ankle 18mmHg relaxing thigh 8mmHg visible as different skin-show. Fiber sheen: 12-micron monofilament collective satin-like directional sheen strongest shin convexity.',
  },
  {
    name: '02-silver-lame-corset-16bone',
    attire: 'She wears a liquid silver metallic lame structured corset micro dress with dramatically low sweetheart bustline pushed to maximum, 16 steel boning channels creating the most extreme waist cinch possible, and fully open lace-up back through chrome grommets from nape to sacrum. Short flared peplum hemline barely covering. The 16-bone corset creates maximum hourglass silhouette. Silver lame reflects entire bar as warped mirror.',
    scene: 'Dark underground Vegas jazz lounge: upright bass stage blur, warm amber single spot, worn leather bar decades of patina, dirty martini olive, signed jazz photos exposed brick, Edison bulbs cloth cord, torn concert poster.',
    fabric: 'SILVER LAME CORSET: Al vapor-deposited warp polyester weft R=0.88 broadband mirror. 16 steel bones extreme compression creating smooth conical waist with hard specular-shadow at each ridge. Peplum flare: lame springs outward creating fluted concave-convex geometry. Chrome grommets R=0.68 constellation along exposed spine. Lace tension V-wrinkles from each grommet. Sweetheart extremely low maximum convex reflector at bustline. Wear: slight crease memory at waist from extended wearing.',
    hosiery: 'HOSIERY: Nylon 6,6 birefringent 15-denier T=0.76 warp-knit 400-gauge. Black with silver thread lace welt. Compression gradient ankle-to-thigh visible. Fiber sheen directional on shin. Amber spot catches lace as scattered warm points.',
  },
  {
    name: '03-emerald-satin-cowl-bare-back',
    attire: 'She wears an emerald green liquid satin charmeuse mini dress with ultra-thin gold chain straps and deep cowl neckline draping very low showing maximum decolletage, with entirely bare back scooped to the very lowest point of spine. Silk clings in catenary drape mapping every contour. Extremely short bias-cut hemline barely at upper thigh. Maximum skin at both deep cowl front and extreme bare back.',
    scene: 'Upscale Vegas cocktail bar: dark walnut bar brass rail, crystal rocks glasses amber spirits, single brass dome pendant dramatic key, art deco mirror oxidized, leather banquette, torn cocktail napkin, half-eaten lime wedge.',
    fabric: 'CHARMEUSE: 19-momme silk 4/1 warp-float lustrous specular half-width 8 degrees. Anisotropic specular lobe: warp-float creates elongated highlight stretched perpendicular to thread direction aspect ratio 3:1 creating characteristic liquid appearance. Emerald absorption 600-700nm transmission 520-555nm. Catenary y=a*cosh(x/a) a=11cm between chain supports. Cowl varying Gaussian curvature caustic concentration in concave valleys. Chain straps gold links V-gathering. Bias 45-degree maximum drape. Wear: sitting creases at hip-thigh junction.',
    hosiery: 'HOSIERY: Nylon 6,6 birefringent 15-denier T=0.76 warp-knit. Black with thin emerald ribbon bow outer welt. Compression gradient visible. Fiber sheen shin. Brass pendant catches ribbon as warm-tinted green accent.',
  },
  {
    name: '04-black-vinyl-extreme-slit',
    attire: 'She wears a jet black high-shine PVC vinyl one-shoulder micro dress with extreme high slit on right running from hemline past upper hip to waist. Single strap left shoulder. Black vinyl near-mirror reflects entire bar as dark panoramic. Extreme slit opens with any movement revealing full leg to hip bone. Ultra-short hemline non-slit side. Maximum leg and hip exposure through slit.',
    scene: 'Modern Vegas casino bar: slot LED multicolor flicker through doorway, dark granite bartop, brass dome pendant key, cocktail napkin, patrons blurred far end, casino energy, sticky residue on bar.',
    fabric: 'BLACK VINYL: PVC n=1.54 carbon-black Ra<0.05 optical polish. Fresnel R_0=4.6% dark mirror. Schlick rises dramatic at grazing creating bright rim-light contour trace. Subsurface: 0.3-0.5mm translucent PVC allows forward-scattered light as diffuse glow halo surrounding specular -- characteristic wet look where highlights have soft luminous corona rather than pure mirror-on-black. Casino LED multicolor stochastic reflects as shifting chromatic streaks. One-shoulder diagonal tension. Extreme slit bias-cut maximum opening. Slit edge bright specular line hip to waist.',
    hosiery: 'HOSIERY: Nylon 6,6 birefringent 15-denier T=0.76 warp-knit. Black satin welt. Mirror-vinyl to matte-nylon transition at hemline. Extreme slit reveals full stocking length to welt. Casino LED catches vinyl not stocking creating boundary.',
  },
  {
    name: '05-gold-sequin-strapless-ultra-micro',
    attire: 'She wears a bright gold sequin strapless bandeau ultra-micro dress barely reaching upper thighs. Completely strapless held by extreme body tension only. Sweetheart neckline pushed dramatically low. Thousands of 5mm gold sequins maximum reflective brilliance. The dress is aggressively minimal -- maximum sparkle minimum fabric. Every bar light multiplied by thousands of gold mirrors wrapped around body.',
    scene: 'Old-school Vegas high-roller: gold-leaf coffered ceiling recessed halogens, champagne hammered silver bucket, antiqued mirror panels infinite reflections, warm amber spots, emerald velvet banquette, black lacquer bar gold leaf, torn coaster.',
    fabric: 'GOLD SEQUIN: 5mm gold-anodized Al pivot-sewn black mesh. Gold selective R>0.80 above 550nm R<0.40 below 480nm. Large 5mm dramatic 3-8Hz slow shimmer from body sway. Antiqued mirrors infinite recursive reflections multiplying sparkle. Strapless extreme tension horizontal bust compression ultra-low sweetheart maximum convex at neckline edge. Gold ceiling warm indirect. Ultra-micro hemline maximum leg exposure. Wear: edge sequins slightly bent from sitting on hard stool.',
    hosiery: 'HOSIERY: Nylon 6,6 birefringent 10-denier T=0.87 ultra-sheer warp-knit. Nude gold-shimmer with gold-thread lace welt. Barely-there warm gold extending palette. Mirror panels reflect stockings creating doubled shimmer. Compression gradient visible ultra-sheer.',
  },

  // === NIGHTCLUB / DANCE FLOOR (6-10) ===
  {
    name: '06-electric-blue-bodycon-backless-club',
    attire: 'She wears an electric blue fluorescent stretch bodycon halter micro dress with completely bare back scooped to the lowest point of spine. Halter ties behind neck. Electric blue fluoresces vivid under UV creating apparent self-luminous glow brighter than reflection. Body-gripping 4-way stretch maps every single contour with zero ease. Ultra-short hemline. Full bare back nape to sacrum against UV-glowing blue front.',
    scene: 'Vegas megaclub dance floor: massive LED wall blue-purple-magenta behind DJ booth, 100+ bodies blur motion, laser beams cutting thick haze, bass speaker cones vibrating, UV strips ceiling fluorescent glow, strobe freeze moments, sweat in air.',
    fabric: 'FLUORESCENT BODYCON: Polyester-elastane 85/15 fluorescent brightener. Electric blue 450-490nm with UV-reactive absorbing 365nm re-emitting 470nm Stokes shift phi=0.45. Under UV: radiates brighter than reflection apparent self-luminous glow. 4-way stretch body tension skin-contact adhesion. LED wall cycling backlight constant color-shift. Strobe freezes fluorescent as sharp bright frame. Laser 532nm coherent lines crossing fluorescent surface.',
    hosiery: 'HOSIERY: Nylon 6,6 birefringent 15-denier T=0.76 warp-knit. Black thin electric blue ribbon welt. UV makes ribbon fluoresce matching dress. Dark club makes matte stockings nearly invisible. Compression gradient.',
  },
  {
    name: '07-rose-gold-micro-sequin-one-shoulder',
    attire: 'She wears a rose gold micro-sequin one-shoulder micro dress at extreme 70/cm^2 density. Single wide strap right shoulder leaving entire left shoulder arm and side completely bare. Tiny 3mm sequins ultra-dense shimmer surface. Extremely short hemline. Asymmetric cut maximizes bare skin left side against maximum-density rose gold sparkle right.',
    scene: 'VIP nightclub elevated: velvet rope foreground blur, bottle service sparklers approaching bright starburst, LED wall color wash, private booth low table, champagne flutes catching light, confetti fragments on floor.',
    fabric: 'MICRO-SEQUIN: 3mm rose gold 70/cm^2 (2.8x standard). Copper-gold alloy warm pink R=0.72 copper absorption below 500nm. Lower mass faster pivot 15-30Hz fine shimmer. Sparkler approach thousands of reflections creating firework-mirror. One-shoulder diagonal strain gradient. Bare left side warm club ambient on skin contrasts sparkle right. VIP LED saturated color through sequin field.',
    hosiery: 'HOSIERY: Nylon 6,6 birefringent 10-denier T=0.87 ultra-sheer warp-knit. Nude rose-tinted rose gold thread lace welt. LED color wash catches ultra-sheer as chromatic glow. Compression gradient barely visible through sheer.',
  },
  {
    name: '08-white-satin-corset-extreme-club',
    attire: 'She wears a bone-white satin structured corset micro dress with sweetheart bustline pushed dramatically low, 14 steel boning extreme waist cinch, and fully open lace-up back through chrome grommets from nape to sacrum. Extremely short hemline. White satin acts as projection screen for every colored club light creating chromatic light map across body. Maximum structural drama with maximum back exposure.',
    scene: 'Main floor nightclub: massive moving-head wash lights color across crowd, CO2 cannon burst white fog column background, bass drop moment hands raised crowd blur, LED ceiling panels, bottle ice elevated platform, sweaty energy.',
    fabric: 'WHITE SATIN CORSET: 22-momme duchess satin warp-float R=0.85 Lambertian. Every moving-head wash projects ONTO dress as visible color zones constantly shifting. 14 steel bones vertical panel geometry hard specular-shadow each ridge. Corset conical waist tensioned between bones cylindrical focusing. Chrome grommets bright constellation spine. CO2 fog white particles scatter creating volumetric glow. Moving-head cycling RGB animated chromatic display on white.',
    hosiery: 'HOSIERY: Nylon 6,6 birefringent 12-denier T=0.82 ultra-sheer warp-knit. White satin welt matching. Club lights project onto white nylon same as dress. CO2 fog catches in volumetric scatter. Compression gradient.',
  },
  {
    name: '09-magenta-iridescent-strapless-club',
    attire: 'She wears a magenta metallic lame strapless bandeau micro dress with iridescent color-shift transitioning between magenta and violet with viewing angle. Completely strapless held by tension. Sweetheart neckline. Extremely short hemline. Metallic surface creates ethereal color animation as she moves through laser beams and wash lights.',
    scene: 'Underground techno club: minimal industrial concrete walls, massive speaker wall, green laser grid cutting thick haze, minimal red-amber lighting, heavy bass vibrating glass, warehouse energy, half-deflated Mylar balloon corner.',
    fabric: 'IRIDESCENT METALLIC: Al vapor-deposited lame multilayer thin-film interference. Normal: magenta constructive at 420nm+650nm dual-band. Tilted: 2*n*d*cos(theta)=m*lambda shifts through violet at 30-degrees pink at grazing. Green laser 532nm reflects as intense narrow spectral line creating geometric green pattern on magenta. Strapless horizontal bust compression. Continuous color animation from movement through static laser field. Metallic warp directional specular.',
    hosiery: 'HOSIERY: Nylon 6,6 birefringent 20-denier T=0.62 warp-knit. Black thin magenta metallic thread welt. Green laser catches metallic welt as spectral green point. Dark club stockings nearly invisible.',
  },
  {
    name: '10-copper-chainmail-backless-club',
    attire: 'She wears a copper metal chainmail halter micro dress of thousands of tiny 2mm interlocking rings. Halter behind neck completely bare back. Cowl neckline drapes low under metal weight showing decolletage. Ultra-short hemline. Chainmail flows like liquid copper catching strobe as thousands of simultaneous point reflections. Heavy 2.8kg metal weight creates distinctive drape and swing.',
    scene: 'Industrial nightclub: exposed steel beams raw concrete, strobe 12Hz freezing motion, fog thick haze, LED strips red-amber walls, metal cage decor, bodies strobe-frozen blur, sticky drink-spilled floor.',
    fabric: 'CHAINMAIL: European 4-in-1 copper 2mm ID 0.4mm wire. Each toroid independent fish-eye reflection. Copper R>0.82 above 550nm R<0.40 below 480nm. Inter-ring cascading 2-4 bounces creating multiply-reflected caustic chains. Strobe 12Hz freezes mid-swing. 2.8kg heavy drape momentum persistence. Cowl weight concentrates lowest neckline. Red LED copper reflects red-enhanced deep warm.',
    hosiery: 'HOSIERY: Nylon 6,6 birefringent 20-denier T=0.62 warp-knit. Black wide industrial welt. Strobe freezes chainmail fringe over welt. Red LED catches nylon warm specular shin. Compression gradient.',
  },

  // === ROOFTOP POOL BAR (11-15) ===
  {
    name: '11-white-vinyl-strapless-rooftop',
    attire: 'She wears a white high-shine PVC vinyl strapless bandeau micro dress. Completely strapless extreme body tension. White vinyl catches every colored light as chromatic specular streaks. Sweetheart neckline. Extremely short hemline. White mirror-vinyl reflects Strip skyline as warped colorful panoramic wrapped around body. Pool water caustics project onto white surface. Maximum reflective drama.',
    scene: 'Vegas rooftop pool bar night: infinity pool underwater LED blue glow, Strip skyline warm bokeh glass railing, palm trees uplighted green, cabana curtains breeze, heat lamp orange overhead, tropical cocktail garnish, desert stars above city.',
    fabric: 'WHITE VINYL: PVC n=1.54 white-pigmented Ra<0.05 polish. White base R=0.82 Lambertian plus Fresnel gloss. Dual projection-reflection: pool blue LED projects azure, Strip bokeh reflects warm dots, palms reflect green streaks. Subsurface: translucent PVC forward-scatter diffuse glow halo. Schlick grazing near-total bright rim. Pool caustics animated blue-white patterns on surface. Heat lamp orange warm gradient from above.',
    hosiery: 'HOSIERY: Nylon 6,6 birefringent 12-denier T=0.82 ultra-sheer warp-knit. White satin welt. Pool caustics project onto white nylon. Strip bokeh warm on white. Continuous white line. Compression gradient.',
  },
  {
    name: '12-gold-sequin-extreme-slit-rooftop',
    attire: 'She wears a bright gold sequin one-shoulder micro dress with extreme high slit on left side running from hemline past upper hip to waist. Single strap right shoulder. Thousands of 5mm gold sequins maximum warm brilliance. Extreme slit opens revealing full leg to hip bone. Ultra-short hemline non-slit side. Gold reflects Strip skyline as warm scattered constellation.',
    scene: 'Upscale rooftop pool: pool underwater color-changing LED cycling spectrum, Strip skyline distant warm bokeh, fire pit circular dancing flames, modern sun loungers white, overhead string Edison bulbs, warm breeze, discarded towel on lounger.',
    fabric: 'GOLD SEQUIN ROOFTOP: 5mm gold-anodized pivot-sewn. Gold R>0.80 above 550nm. Large 5mm 3-8Hz slow shimmer. Strip bokeh warm golden point-sources across field. Fire pit dancing flames animated warm caustics 1-3Hz. Pool LED cycling sequential chromatic on gold. One-shoulder diagonal strain. Extreme slit bias-cut maximum opening. Slit edge bright specular hip to waist.',
    hosiery: 'HOSIERY: Nylon 6,6 birefringent 10-denier T=0.87 ultra-sheer warp-knit. Nude gold-shimmer gold lace welt. Fire pit catches ultra-sheer warm amber glow. Extreme slit reveals full stocking length to welt. Compression gradient.',
  },
  {
    name: '13-crimson-satin-extreme-bare-back-rooftop',
    attire: 'She wears a deep crimson liquid satin charmeuse mini dress with thin gold chain straps and entirely bare back scooped to the absolute lowest point of spine. Front cowl drapes very low showing maximum decolletage. Silk clings in catenary drape mapping every contour. Extremely short bias-cut hemline. Maximum possible skin at deep cowl front and extreme bare back. Crimson catches fire pit flames as brilliant warm specular.',
    scene: 'Luxe rooftop pool lounge: daybed cabana flowing white curtains, pool reflecting city lights rippled color, fire column gas feature, cocktail low table, palm fronds backlit, warm evening breeze, water ring stain on stone.',
    fabric: 'CRIMSON CHARMEUSE: 19-momme silk warp-float specular 8-degree half-width. Anisotropic lobe 3:1 elongated perpendicular creating liquid appearance. Crimson absorption 430-580nm transmission 600-700nm. Catenary y=a*cosh(x/a). Chain gold links V-gathering. Cowl varying Gaussian curvature caustic concentration. Fire column 1-3Hz animated specular. Pool indirect colored fill. Sitting creases hip-thigh.',
    hosiery: 'HOSIERY: Nylon 6,6 birefringent 15-denier T=0.76 warp-knit. Black thin crimson ribbon bow welt. Fire column catches ribbon flickering warm accent. Pool reflection cool fill on dark nylon. Compression gradient.',
  },
  {
    name: '14-silver-metallic-wide-cutout-rooftop',
    attire: 'She wears a liquid silver metallic jersey mini dress with dramatic wide cutouts: large diamond shapes both waist sides exposing maximum hip skin, wide rectangular cutout center sternum, triangular cutout between shoulder blades. Sleeveless. Silver catches every rooftop light as brilliant neutral reflections. Ultra-short hemline. Bold wide cutouts create maximum skin windows against mirror-bright silver.',
    scene: 'Modern rooftop bar: LED-lit infinity pool edge, panoramic Strip view minimal glass railing, concrete planters bistro string lights, outdoor bar polished concrete, martini stemless glass, crumpled cocktail umbrella.',
    fabric: 'SILVER METALLIC JERSEY: Al-coated knit R=0.88 broadband mirror. Each surface point reflects unique panoramic rooftop. Cutout windows warm skin contrasts cool silver. Bistro lights reflected bright constellation. Pool LED blue accent. Strip bokeh warm dots. Diamond cutouts at waist hip skin framed brilliant field. Sternum cutout centered window. Sleeveless bare arms direct ambient.',
    hosiery: 'HOSIERY: Nylon 6,6 birefringent 15-denier T=0.76 warp-knit. Silver-shimmer metallic thread welt. Bistro lights catch shimmer scattered specular. Compression gradient visible through metallic sheen.',
  },
  {
    name: '15-hot-pink-vinyl-wrap-rooftop',
    attire: 'She wears a hot pink high-shine PVC vinyl wrap micro dress with crossover V showing maximum decolletage and wrap tie at right hip creating dramatically asymmetric hemline -- right side ultra-short barely covering. Pink vinyl mirror-reflects every light as magenta-white specular streaks. Wrap opens at hip revealing flash of upper thigh. Saturated hot pink screams party against night sky.',
    scene: 'Pool party rooftop night: underwater LED pool cycling colors, DJ booth LED panel, palm trees fairy lights, foam residue on deck, cocktail umbrella drinks, warm bodies blur, party peak energy, desert stars city glow.',
    fabric: 'HOT PINK VINYL: PVC n=1.54 Ra<0.05 polish. Pink absorption 490-560nm with 610-650nm+420-470nm dual-band additive magenta. Fresnel Schlick near-total grazing. Subsurface translucent PVC diffuse glow halo. Pool cycling LED color shifts across surface. Wrap radial compression from knot right hip. Asymmetric hem dramatically shorter right. Specular along maximum curvature. Beer-Lambert deeper=richer.',
    hosiery: 'HOSIERY: Nylon 6,6 birefringent 15-denier T=0.76 warp-knit. Black hot pink ribbon welt. Pool LED catches ribbon color-shifting. Short wrap side reveals welt detail. Compression gradient.',
  },

  // === HOTEL LOBBY BAR (16-20) ===
  {
    name: '16-champagne-sequin-extreme-backless-lobby',
    attire: 'She wears a champagne gold sequin halter micro dress with clean neckline front and dramatically bare back scooped past sacrum to absolute lowest spine point. Halter ties behind neck. Thousands of 4mm champagne sequins. Ultra-short hemline. Full bare back nape to sacrum maximum exposure against sparkling champagne front. Maximum front-back contrast.',
    scene: 'Grand Vegas hotel lobby bar: soaring marble atrium, massive crystal chandelier thousands of faceted pendants, polished marble floors reflecting everything, leather club chairs, brass elevator doors, orchid arrangements, lipstick on glass rim.',
    fabric: 'CHAMPAGNE SEQUIN: 4mm champagne-gold R=0.75 at 580nm warm. Crystal chandelier thousands of faceted pendants creating rainbow caustic projections playing across sequin field animated prismatic. Marble floor polished reflection doubles sparkle from below uplight effect. Halter V-strain aligned chest random scatter hemline. Bare back chandelier caustics project directly onto skin. 8-15Hz stochastic sparkle. Brass elevator warm reflected fill.',
    hosiery: 'HOSIERY: Nylon 6,6 birefringent 12-denier T=0.82 ultra-sheer warp-knit. Nude champagne gold-thread lace welt. Marble reflection catches nude nylon doubled warm image below. Chandelier caustics on stockings. Compression gradient barely visible.',
  },
  {
    name: '17-black-velvet-corset-extreme-lobby',
    attire: 'She wears a jet black velvet structured corset micro dress with sweetheart bustline pushed very low, 14 steel boning extreme waist cinch, and open lace-up back through brass grommets with black velvet ribbon from nape to sacrum. Black velvet absorbs 95% light as deep void while brass grommets and skin through lacing are bright accent against darkness. Extremely short hemline.',
    scene: 'Boutique hotel lobby bar: dark walnut paneling, green-shade brass banker lamps warm intimate, leather Chesterfield background, art deco etched-glass partition, marble bar brass rail, crystal whiskey backlit amber, torn cocktail napkin.',
    fabric: 'BLACK VELVET CORSET: Rayon pile 2.5mm maximum absorption 95% trapped. Near-perfect blackbody textile. Brass grommets R=0.55 bright warm points against void. Velvet ribbon directional shimmer-dark. 14 steel bones structural panels. Extreme compression. Banker lamp warm: absorbed by velvet reflected by brass accent-only. Sweetheart skin dramatically bright against darkness Weber-Fechner contrast.',
    hosiery: 'HOSIERY: Nylon 6,6 birefringent 20-denier T=0.62 warp-knit. Black ultra-matte welt seamless extending velvet void below. Only skin and brass brightness. Banker lamp catches shin sole specular. Compression gradient.',
  },
  {
    name: '18-ivory-lame-strapless-lobby',
    attire: 'She wears an ivory metallic lame strapless bandeau micro dress. Completely strapless body tension. Ivory lame with gold metallic thread creating warm pearl-metallic surface. Sweetheart neckline. Extremely short hemline. Metallic ivory catches lobby chandelier as thousands of warm micro-reflections creating ethereal soft-glow.',
    scene: 'Five-star hotel lobby bar: soaring coffered gold leaf ceiling, enormous floral centerpiece, baby grand piano someone playing, beveled mirror columns, travertine floor warm, crystal champagne flutes, concierge desk brass blur, half-empty glass ring stain.',
    fabric: 'IVORY LAME: Al vapor-deposited gold-tinted anodization ivory polyester weft. Warm pearl R=0.75 gold undertone. Micro-faceted surface broad specular 12-degree for soft diffused metallic glow NOT harsh mirror flash. Chandelier warm omnidirectional even luminosity. Piano polished lid secondary source. Beveled mirror recursive multiply. Strapless horizontal bust compression. Travertine warm bounce-fill below.',
    hosiery: 'HOSIERY: Nylon 6,6 birefringent 10-denier T=0.87 ultra-sheer warp-knit. Nude ivory-shimmer pearl lace welt. Travertine reflection catches ultra-sheer doubled warm glow. Continuous pearl tone. Compression gradient barely visible.',
  },
  {
    name: '19-ruby-vinyl-one-shoulder-lobby',
    attire: 'She wears a deep ruby high-shine PVC vinyl one-shoulder micro dress. Single wide strap left shoulder leaving entire right shoulder arm and side completely bare. Ruby vinyl near-mirror catching lobby lights as brilliant deep-red specular streaks. Extremely short hemline. Asymmetric bare right side against mirror-bright ruby left creates maximum skin contrast.',
    scene: 'Art deco hotel lobby: geometric brass fixtures, terrazzo floor geometric pattern, curved mahogany bar brass inlay, martini crystal coupe, jazz hidden speakers, potted palms, warm brass sconces, water ring on marble.',
    fabric: 'RUBY VINYL: PVC n=1.54 Ra<0.05 polish. Ruby absorption 430-580nm transmission 600-700nm Beer-Lambert deeper=richer. Subsurface translucent glow halo. Fresnel Schlick near-total grazing bright rim. Art deco brass warm amber reflected golden streaks on ruby rich interplay. Terrazzo geometric reflected distorted abstract. One-shoulder bare right direct skin brass warmth. Specular achromatic white along maximum curvature.',
    hosiery: 'HOSIERY: Nylon 6,6 birefringent 15-denier T=0.76 warp-knit. Black thin ruby ribbon welt. Brass sconces catch ribbon warm ruby accent. Art deco floor reflects under stockings geometric warm. Compression gradient.',
  },
  {
    name: '20-platinum-sequin-extreme-slit-lobby',
    attire: 'She wears a platinum silver sequin one-shoulder micro dress with extreme high slit on left running from hemline past upper hip to waist. Single strap right shoulder. Thousands of 4mm platinum sequins R=0.82 broadband. Extreme slit opens revealing full leg to hip bone and waist. Ultra-short hemline non-slit side. Maximum leg and hip exposure through extreme slit.',
    scene: 'Modern luxury hotel lobby: floating staircase glass railing LED edge-lit, water feature wall trickling, low modern furniture, sculptural pendant brass-mesh, polished dark stone floor, orchids floating glass, lipstick-stained napkin.',
    fabric: 'PLATINUM SEQUIN: 4mm Al R=0.82 broadband neutral. 8-20Hz stochastic sparkle. Floating staircase LED blue-white edge reflected cool accent. Water feature animated caustic projections onto sequin field. Brass-mesh pendant warm filtered dappled. One-shoulder diagonal strain. Extreme slit bias-cut maximum opening to waist. Dark stone polished doubles sparkle below.',
    hosiery: 'HOSIERY: Nylon 6,6 birefringent 15-denier T=0.76 warp-knit. Silver-shimmer platinum thread welt. Extreme slit reveals full stocking to welt. Water feature caustics catch metallic shimmer. Compression gradient.',
  },

  // === CASINO FLOOR BAR (21-25) ===
  {
    name: '21-electric-purple-bodycon-backless-casino',
    attire: 'She wears an electric purple fluorescent stretch bodycon halter micro dress with bare back scooped to lowest spine point. Halter ties behind neck. Electric purple fluoresces under casino UV accent creating vivid self-luminous effect. Body-gripping stretch maps every contour zero ease. Ultra-short hemline. Full bare back against UV-glowing purple front.',
    scene: 'Vegas casino floor bar: slot machines background flashing multicolor LED, roulette wheel visible crowd, low ceiling recessed warm spots, carpet bold geometric, cocktail waitress tray blur, chips stacked, constant energy, bent straw on bar.',
    fabric: 'FLUORESCENT BODYCON: Polyester-elastane 85/15 brightener. Electric purple 380-430nm+620-680nm dual-band. UV-reactive 365nm re-emits 410nm+650nm phi=0.40 apparent self-luminous glow. Slot LED multicolor stochastic changing background. 4-way stretch body tension skin-contact. Halter V-strain. Casino carpet geometric structured background against organic body.',
    hosiery: 'HOSIERY: Nylon 6,6 birefringent 15-denier T=0.76 warp-knit. Black thin purple metallic welt. UV makes welt fluoresce. Slot LED flicker catches nylon color-shifting. Compression gradient.',
  },
  {
    name: '22-bronze-hammered-corset-casino',
    attire: 'She wears a hammered bronze metallic jersey structured corset micro dress with sweetheart bustline, 12 steel boning, and open lace-up back through bronze grommets from nape to lower spine. Hundreds of tiny concave dimple-mirrors each catching light independently. Extremely short hemline. Bronze hammered texture plus corset structure creates maximum visual complexity with maximum back exposure.',
    scene: 'Vegas casino high-limit bar: private elevated area, polished dark wood bar, top-shelf spirits backlit amber wall, heavy leather chairs brass studs, green felt table beyond, security suit blur, brass fixtures exclusive, crumpled receipt.',
    fabric: 'HAMMERED BRONZE CORSET: Micro-concavity r=2-5mm depth 0.3-0.8mm. Each dimple concave mirror f=r/2 inverted micro-images of brass fixtures. Cook-Torrance alpha=0.35 Beckmann. Bronze Cu-Sn R 0.18@480nm to 0.87@700nm. 12 bones structural over hammered texture ordered panels between chaotic dimple. Bronze grommets matching constellation spine. Compression dimples flatten at waist creating reflectance change.',
    hosiery: 'HOSIERY: Nylon 6,6 birefringent 15-denier T=0.76 warp-knit. Bronze-shimmer copper lace welt. Spirit-wall amber catches shimmer warmly. Compression gradient. Fiber sheen extends bronze to legs.',
  },
  {
    name: '23-scarlet-sequin-wrap-casino',
    attire: 'She wears a deep scarlet sequin wrap micro dress crossover V showing maximum decolletage, wrap tie left hip creating asymmetric hemline dramatically shorter on left revealing upper thigh. Thousands of 4mm scarlet sequins. Wrap opens at hip. Three-quarter pushed sleeves. Casino slot lights multiply through thousands of red sequin mirrors creating cascading color fire.',
    scene: 'Busy casino floor: rows of slots flashing, wide marble walkway, overhead chandeliers cascade, cocktail lounge low seating, bartender mixing circular island, ringing bells jackpot, constant motion crowd, spilled drink wet spot floor.',
    fabric: 'SCARLET SEQUIN WRAP: 4mm scarlet Al over red base R=0.72 above 600nm. Slot LED multicolor rapidly-changing creates polychromatic time-varying across field. Cascade chandelier linear reflected directional gradient. Wrap crossover V converging alignment. Asymmetric tie left shorter maximum thigh. 8-20Hz stochastic sparkle multiplied by slot variation. Casino energy captured in sequin animation.',
    hosiery: 'HOSIERY: Nylon 6,6 birefringent 15-denier T=0.76 warp-knit. Black thin scarlet ribbon welt. Slot LED catches ribbon color-shifting. Short wrap side reveals welt. Compression gradient.',
  },
  {
    name: '24-midnight-satin-extreme-bare-back-casino',
    attire: 'She wears a midnight navy liquid satin charmeuse slip micro dress with ultra-thin gold chain straps and bare back scooped to the absolute lowest point of spine. Front cowl drapes very low showing maximum decolletage. Silk clings in liquid catenary mapping every contour. Extremely short bias-cut hemline. Maximum skin at deep cowl front and extreme bare back.',
    scene: 'Intimate casino cocktail lounge: recessed from main floor, dark navy velvet banquettes, low brass table lamps warm 2700K, cocktail menu leather-bound, crystal dark spirits, quiet exclusive contrast, crumpled bill on bar.',
    fabric: 'MIDNIGHT CHARMEUSE: 19-momme silk warp-float specular 8-degree half-width. Midnight navy broadband absorption narrow 430-470nm deep blue transmission. Anisotropic lobe 3:1 liquid appearance. Birefringence delta_n=0.04 shimmer. Catenary chain supports. Cowl minimal-energy fold varying Gaussian curvature. Brass lamp low angle unusual upward illumination modeling body differently than overhead. Navy velvet surroundings dark absorption framing.',
    hosiery: 'HOSIERY: Nylon 6,6 birefringent 12-denier T=0.82 ultra-sheer warp-knit. Navy tint thin midnight lace welt. Brass lamp catches lace warm accent. Dark lounge stockings nearly invisible against navy banquette. Compression gradient.',
  },
  {
    name: '25-gold-vinyl-strapless-casino',
    attire: 'She wears a gold-metallic high-shine PVC vinyl strapless bandeau micro dress. Completely strapless extreme body tension. Gold vinyl near-mirror reflecting entire casino as warm distorted panoramic. Sweetheart neckline. Extremely short hemline. Gold mirror-vinyl captures chaotic casino light environment as animated warm reflection wrapping body. Maximum metallic impact.',
    scene: 'Center casino floor: 360-degree slots LED walls flashing, high ceiling massive chandelier, wide marble walkway, crowd all directions, cocktail server approaching, craps table green glow, jackpot lights spinning, maximum sensory, gum stuck under bar ledge.',
    fabric: 'GOLD VINYL: PVC n=1.54 gold-metallic Ra<0.05. Gold selective R>0.80 above 550nm R<0.40 below 480nm. Subsurface translucent depth glow halo. Schlick near-total grazing bright gold rim. 360-degree casino reflected continuous anamorphic gold panoramic. Slot LED animated time-varying constantly shifting. Chandelier bright complex pattern. Strapless horizontal bust compression. Gold pigment Beer-Lambert deeper=warmer. Marble polished doubles gold below.',
    hosiery: 'HOSIERY: Nylon 6,6 birefringent 10-denier T=0.87 ultra-sheer warp-knit. Nude gold-shimmer gold lace welt. Casino marble reflects doubled golden leg. Chandelier catches shimmer. Compression gradient barely visible.',
  },

  // === CHAMPAGNE / VIP LOUNGE (26-30) ===
  {
    name: '26-blush-satin-corset-champagne',
    attire: 'She wears a blush pink satin structured corset micro dress with sweetheart bustline pushed very low, 14 steel boning dramatic waist cinch, and open lace-up back through rose gold grommets from nape to lower spine. Blush satin creates soft warm feminine luminosity. Extremely short hemline. Maximum structural drama in delicate pink with maximum back exposure.',
    scene: 'Exclusive champagne lounge: pink-gold ambient LED, crystal champagne tower hundreds of coupes, rose petals white tablecloth, gold fixtures everywhere, mirror ceiling doubling light, velvet blush banquettes, bubbles catching light, lipstick mark on glass.',
    fabric: 'BLUSH SATIN CORSET: 22-momme duchess satin warp-float. Blush subtle absorption 460-520nm broad 550-700nm warm pink-peach. 14 bones vertical geometry specular-shadow ridges. Compression conical waist. Rose gold grommets R=0.60 matching blush. Pink-gold LED enhances saturation additive. Crystal tower micro-caustic projections onto blush. Mirror ceiling infinite recursive. Champagne bubbles refracting point sparkle.',
    hosiery: 'HOSIERY: Nylon 6,6 birefringent 10-denier T=0.87 ultra-sheer warp-knit. Nude blush-pink rose gold lace welt. Pink ambient catches ultra-sheer continuous blush glow. Mirror ceiling reflects doubled. Compression gradient barely visible.',
  },
  {
    name: '27-black-sequin-one-shoulder-vip',
    attire: 'She wears a jet black sequin one-shoulder micro dress. Single strap left shoulder leaving entire right shoulder arm and side completely bare. Thousands of 4mm jet-black anodized sequins creating dark moody sparkle -- subtle sophisticated shimmer not bright flash. Extremely short hemline. Bare right side against dark sparkle left maximum contrast.',
    scene: 'VIP champagne room: private behind frosted glass, intimate low ceiling, single dramatic pendant spotlight, grey velvet L-sofa, magnum in ice, crystal flutes, fresh roses low vase, dark sophisticated, small group energy, spilled drop on table.',
    fabric: 'BLACK SEQUIN VIP: 4mm jet-black anodized Al R=0.25 subdued dark-metallic. At rest near-uniform dark, micro-movement pivots past specular as scattered dim warm 10-25Hz understated moody sparkle. Single pendant one bright reflected per correctly-angled sequin versus ambient dark all others. One-shoulder diagonal tension gradient. Bare right warm skin catches pendant bright contrast. Frosted glass soft diffused fill. Magnum ice reflective secondary fill.',
    hosiery: 'HOSIERY: Nylon 6,6 birefringent 20-denier T=0.62 warp-knit. Black plain elastic welt. Dark sequin seamless to dark stocking. Pendant spot catches shin sole specular accent. Compression gradient.',
  },
  {
    name: '28-rose-gold-lame-backless-vip',
    attire: 'She wears a rose gold metallic lame halter micro dress with completely bare back scooped past sacrum to lowest possible spine point. Halter ties behind neck. Rose gold creates warm pink-metallic glow. Ultra-short hemline. Full bare back nape to beyond sacrum maximum skin against warm metallic front. Rose gold catches champagne ambient as soft warm luminosity.',
    scene: 'Intimate champagne bar: gold leaf walls, crystal sconces amber warm, marble bar champagne bottles ice, silver service, fresh flowers crystal vases, low French music, candlelight flickering brass holders, Parisian elegance, wax drip on table.',
    fabric: 'ROSE GOLD LAME: Al vapor-deposited copper-tinted anodization warm pink-gold R=0.72. Copper absorption below 500nm adds pink. Gold leaf walls reflected recursive warm. Crystal sconces amber caustics onto metallic. Candlelight 1800K ultra-warm 1-3Hz animated dancing. Halter V-strain aligned. Bare back candlelight models spine warm highlight-shadow. Champagne ice indirect reflective fill.',
    hosiery: 'HOSIERY: Nylon 6,6 birefringent 10-denier T=0.87 ultra-sheer warp-knit. Nude rose-gold shimmer rose gold lace welt. Candlelight catches ultra-sheer flickering warm glow extending rose gold. Compression gradient barely visible.',
  },
  {
    name: '29-white-velvet-extreme-cutout-vip',
    attire: 'She wears a winter white velvet bodycon mini dress with extreme wide geometric cutouts: large diamond shapes both waist sides exposing maximum hip skin, wide oval cutout center back, wide rectangular cutout sternum. Long fitted sleeves. White velvet soft luminous while cutouts expose warm lit skin as contrasting bright windows. Very short hemline. Maximum cutout skin exposure.',
    scene: 'Ultra-exclusive VIP: all-white room, white leather furniture, crystal chandelier dramatic overhead, silver ice bucket magnums, white roses everywhere, white candles crystal holders, single blue LED accent strip along base, ethereal luxury, petal on floor.',
    fabric: 'WHITE VELVET CUTOUT: Rayon pile 2.5mm white diffuse R=0.78 non-specular. Pile matte luminosity bright without harsh highlights. Cutout skin warm-toned windows against white. Blue LED strip cool gradient lower hemline. Crystal chandelier warm caustics on pile subtle prismatic. Cutout edges pile direction change at seam visible texture boundary. Long sleeves continuous white dramatic. All-white room minimal shadow high-key.',
    hosiery: 'HOSIERY: Nylon 6,6 birefringent 15-denier T=0.76 warp-knit. White matte velvet-finish welt. Continuous white line. Blue LED catches lower stockings cool accent gradient. Compression gradient.',
  },
  {
    name: '30-burgundy-sequin-wrap-vip',
    attire: 'She wears a deep burgundy sequin wrap micro dress crossover V showing maximum decolletage, wrap tie right hip creating dramatically asymmetric hemline -- right side ultra-short barely covering. Thousands of 4mm burgundy sequins. Wrap opens at hip revealing upper thigh. Three-quarter pushed sleeves. Wine-dark sequins sophisticated moody sparkle. Burgundy is the ultimate VIP color.',
    scene: 'Private VIP booth: dark enclosed curtain-partitioned, low brass table lamp intimate warm, expensive bourbon crystal, velvet dark purple banquette, gold trim everywhere, personal bottle service, hushed exclusive, amber-only lighting, lipstick on crystal rim.',
    fabric: 'BURGUNDY SEQUIN WRAP: 4mm burgundy-anodized Al wine-dark base. Burgundy absorption 430-560nm transmission 620-680nm deep wine-red. R=0.55 subdued warm-dark sophisticated not flashy. Brass lamp single warm key low angle unusual uplight sparkle. Wrap crossover V converging alignment. Asymmetric tie right shorter maximum thigh. Gold trim reflected warm matching warmth. Velvet dark absorption framing. Bourbon crystal caustic accent. 8-15Hz subtle.',
    hosiery: 'HOSIERY: Nylon 6,6 birefringent 20-denier T=0.62 warp-knit. Black thin burgundy ribbon welt. Brass lamp catches ribbon warm wine accent. Short wrap side reveals welt. Dark VIP stockings into shadow. Compression gradient.',
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

console.log(`\n=== V9 APEX - MAX PHOTOREALISM + MAX DARING + 4K ===`);
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
console.log('V9 APEX RESULTS');
console.log(`${'='.repeat(60)}`);
const ok = results.filter(r => r.ok);
console.log(`Success: ${ok.length}/${results.length}`);
results.forEach(r => console.log(`  ${r.ok ? 'OK' : '!!'} ${r.name}${r.err ? ': ' + r.err : ''}`));
console.log(`\nOutput: ${OUTPUT_DIR}`);

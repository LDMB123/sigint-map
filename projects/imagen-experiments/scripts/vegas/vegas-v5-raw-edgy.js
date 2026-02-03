#!/usr/bin/env node

/**
 * Vegas V5 - RAW EDGY 4K PHOTOREALISM
 * 800-900 word prompts (validated sweet spot)
 * Gritty real-life Vegas aesthetic - not polished/glamorous
 * Nano Banana Pro (Gemini 3 Pro Image) via API key
 */

import fs from 'fs/promises';
import path from 'path';

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) { console.error('GEMINI_API_KEY not set'); process.exit(1); }

const MODEL = 'gemini-3-pro-image-preview';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
const OUTPUT_DIR = path.join(process.env.HOME, 'nanobanana-output', 'vegas-v5-raw');
const INPUT_IMAGE = process.argv[2] || '/Users/louisherman/Documents/tinklesherpants_story_11_6_2023_7_52_33 AM3230137043820160280.jpeg';

await fs.mkdir(OUTPUT_DIR, { recursive: true });

// 800-900w physics shield - raw gritty aesthetic
function buildPrompt(attire, scene, fabricPhysics, hosieryPhysics) {
  return `Edit this photograph into an ultra-raw gritty real-life Vegas cocktail bar photograph that looks like an unretouched candid shot from a real night out. NOT a fashion editorial - this is raw documentary-style nightlife photography. ${attire}

SCENE: ${scene}

CAMERA PHYSICS: Canon EOS R5 Mark II 45MP stacked BSI-CMOS sensor, full-frame 36x24mm. RF 50mm f/1.2L USM wide open at f/1.2 creating razor-thin 5cm depth-of-field. ISO 3200 for authentic high-ISO grain with visible luminance noise sigma=sqrt(N_photons) in shadow regions and color channel noise in underexposed zones. Shutter 1/125s allowing subtle motion blur on moving hands and gestures. Phase-detect AF locked on near eye with slight focus-breathing on far shoulder going soft. 15-blade aperture producing creamy oval bokeh discs with onion-ring concentric artifact from aspherical element. Slight barrel distortion from 50mm at close focus distance. Chromatic aberration: 0.3px purple fringing on high-contrast specular-to-dark transitions at frame edges. Sensor heat noise pattern faintly visible in darkest shadow quadrants. White balance set tungsten 3200K but mixed lighting creates unresolved color casts in different zones - warm foreground cool background. No flash - available light only creating authentic unlit shadow zones with crushed blacks.

LIGHT TRANSPORT: Primary illumination from overhead recessed tungsten halogen track spots at 2800K creating hard directional pools with sharp shadow edges - NOT soft diffused fashion lighting. Secondary practical light from neon bar signage casting saturated colored spill with hard color boundaries on nearest surfaces. Tertiary ambient from distant ceiling fixtures creating weak unfocused fill at 3-stop underexposure in background. Inverse-square falloff I=Phi/(4*pi*r^2) creating steep 4-stop luminance gradient from lit bar area to dark booth shadows. NO fill light - deep unrecoverable shadows on shadow-side of face and body where ambient is 5+ stops below key. Mixed color temperature: 2800K tungsten key creates warm skin rendering while 4100K cool fluorescent bathroom-spill from hallway creates blue-green color contamination on background surfaces. Beer bottle glass creating small concentrated caustic projections onto bar surface from overhead spot refraction.

SKIN RENDERING: Subsurface scattering through 3-layer epidermis-dermis-hypodermis with melanin absorption mu_a_mel=6.6*C_mel*(lambda/500)^(-3.33). Oxygenated hemoglobin HbO2 absorption peaks 542nm 576nm visible as warm flush at cheeks and decolletage from ambient heat and activity. Real skin texture: visible pores at nose and cheeks, natural expression lines, authentic complexion with zero retouching or smoothing. Sebaceous oil sheen on forehead T-zone and nose bridge catching overhead hard light as small irregular specular patches - NOT uniform glow. Visible fine vellus hair on forearms and jawline catching rim light. Slight perspiration moisture on upper lip and temples from warm bar environment creating additional micro-specular scatter points.

${fabricPhysics}

${hosieryPhysics}

RAW PHOTOGRAPHIC IMPERFECTIONS: This must look like a REAL unedited photograph. Visible high-ISO luminance grain across entire image especially in shadow regions. Slight motion blur on her fingertips from mid-gesture at 1/125s. One flyaway hair strand crossing face catching backlight at different focal plane creating soft bright streak. Background completely blown bokeh with recognizable but unreadable neon shapes. Foreground cocktail glass partially in frame at edge creating out-of-focus curved glass refraction blur. Slight lens flare from brightest neon source creating low-contrast veiling glare in that quadrant. Bar napkin crumpled on counter. Condensation ring from moved glass on bar surface. Another patron's elbow barely visible at extreme frame edge cropped by composition. Slight JPEG compression artifact at 95% quality level. No retouching no skin smoothing no color grading - straight out of camera with only white balance adjustment. Preserve her face bone structure eye color expression and all features exactly from the original photo.`;
}

const concepts = [
  {
    name: '01-red-vinyl-mini',
    attire: 'She wears a tight red PVC vinyl mini skirt riding very high on thighs paired with a black lace cropped bustier top. The vinyl catches every overhead light as elongated white specular streaks. Raw and unapologetic - this is real Vegas nightlife not a catalog shoot.',
    scene: 'Grimy real Vegas dive cocktail bar off Fremont Street: scratched dark wood bar top with cigarette burn marks and ring stains, half-empty cocktail with lipstick mark on rim, dim overhead tungsten cans with visible dust on lens, peeling band stickers on cash register, bartender blurred in background, neon Budweiser sign casting red spill on wall, vinyl bar stool with cracked leather and exposed foam.',
    fabric: 'VINYL PHYSICS: PVC calendered sheet refractive index n=1.54 with ultra-smooth surface Ra<0.05 microns. Fresnel reflectance R_0=4.6% at normal rising via Schlick R(theta)=R_0+(1-R_0)*(1-cos(theta))^5 to near-total at grazing angles on hip and thigh curvature. Deep red pigment absorbs 430-580nm transmitting only 600-700nm through 0.4mm translucent PVC. Specular highlights from hard overhead tungsten spots are elongated streaks following maximum principal curvature direction. Seated compression wrinkles radiate from hip joint with audible creak. LACE BUSTIER: Raschel knit stretch lace with floral motif, binary transmission mask T=0 at thread T=0.85 at aperture. Lace stretched over curves enlarges apertures increasing transparency at convex zones.',
    hosiery: 'HOSIERY: She wears black fishnet thigh-high stockings with industrial-weight diamond mesh pattern, 3mm diamond apertures with 0.8mm nylon cord creating bold geometric grid over skin. Wide plain-knit welt band gripping at upper thigh. Fishnet transmission varies: T=0.70 at face-on where diamonds are open, dropping to T=0.30 at grazing angles on leg curvature where foreshortened diamonds overlap visually. Each cord intersection creates a raised knot catching overhead hard light as a grid of bright specular dots. Bar neon casts colored light through fishnet creating colored diamond pattern projected onto skin beneath.',
  },
  {
    name: '02-black-leather-harness',
    attire: 'She wears a black genuine leather strappy bodycon micro dress with visible chrome O-ring hardware at every strap junction and adjustable chrome buckle closures along the sides. Multiple thin leather straps criss-cross the torso creating cage-like open architecture over skin. Ultra short skirt portion in solid leather panel. Raw biker-meets-nightclub edge.',
    scene: 'Underground Vegas lounge with industrial edge: exposed ductwork and sprinkler pipes on raw concrete ceiling painted matte black, red LED strip along bar base casting blood-red uplight on chrome bar stools, sticky black rubber floor mat behind bar, half-drunk bourbon neat in heavy rocks glass, ashtray with cigarette burning thin smoke trail caught in overhead spot beam, bartender tattoo sleeve visible reaching for bottle in background blur.',
    fabric: 'LEATHER PHYSICS: Full-grain cowhide leather 1.2mm thickness with natural grain texture creating anisotropic microfacet surface. Chrome-tanned surface with semi-gloss finish achieving specular BRDF lobe half-width 15 degrees - broader than vinyl but still distinctly reflective under hard tungsten spots. Natural leather grain creates micro-shadow texture visible at close range with each grain bump casting tiny shadow from directional overhead source. Chrome O-ring hardware: polished 304 stainless steel toroidal reflectors R=0.68 each reflecting distorted miniature image of environment from unique angle. Buckle mechanisms create localized compression gathering in leather at adjustment points. Leather warms to body temperature changing drape stiffness from rigid cold to conforming warm.',
    hosiery: 'HOSIERY: She wears sheer black thigh-high stockings with a simple narrow elastic welt, no lace - utilitarian and raw. 20-denier semi-sheer nylon T=0.62 creating substantial dark smoky coverage. The matte nylon surface contrasts the semi-gloss leather above. Red LED bar uplight catches the nylon surface along the lower shin creating a blood-red specular streak along each leg.',
  },
  {
    name: '03-silver-sequin-tube',
    attire: 'She wears a silver all-over sequin strapless tube mini dress. Thousands of 6mm flat paillette sequins overlap like fish scales covering the entire garment. Each sequin independently catches and redirects light creating a chaotic stochastic sparkle field that changes with every micro-movement. Strapless held by stretch tension. Hemline barely at upper thigh. Pure Vegas excess.',
    scene: 'Loud crowded real Vegas strip bar with energy: multiple patrons blurred in background creating busy atmosphere, spilled drink reflection on dark granite bartop, stacks of cocktail napkins, tip jar with visible bills, row of colorful backlit liquor bottles creating bokeh color wash, overhead mirror ball casting hundreds of small moving light dots across walls and ceiling, pounding bass visible as slight glass vibration blur on bar surface.',
    fabric: 'SEQUIN OPTICS: 6mm flat circular paillette sequins individually sewn at center-hole pivot allowing free rotation. Each sequin acts as tiny flat mirror: specular reflectance R=0.88 from vacuum-metallized aluminum on acetate substrate. Random orientation distribution means each sequin reflects a different part of the environment - some catch overhead spots as blinding white points, others reflect colored neon as saturated color dots, others face away showing dark matte backing. Stochastic sparkle frequency: as body breathes and micro-moves at 0.2-5Hz, sequins pivot through specular-catching angles creating random 8-20Hz flicker pattern. Mirror ball reflections compound with sequin reflections creating a double-sparkle interference pattern.',
    hosiery: 'HOSIERY: She wears sheer nude thigh-high stockings with clear silicone grip band at welt, nearly invisible. 8-denier ultra-sheer T=0.90 adding only subtle smoothing sheen. Purpose: professional finish that appears as bare legs under bar lighting. Mirror ball light dots track across the sheer nylon surface as they rotate, momentarily catching the Fresnel sheen.',
  },
  {
    name: '04-leopard-mesh-bodycon',
    attire: 'She wears a leopard print stretch mesh bodycon mini dress with high round neckline and long sleeves. The mesh is semi-transparent with skin visible through the leopard pattern - the animal print IS the mesh, not printed on opaque fabric. Clingy bodycon silhouette. Short hemline. Bold animalistic energy that reads as real Vegas nightlife.',
    scene: 'Busy real Vegas casino bar adjacent to gaming floor: slot machine lights flashing in deep background creating multicolor bokeh, casino carpet pattern visible at floor edge, circular cocktail table with votive candle providing warm key fill from below, distant ceiling with thousands of recessed downlights creating starfield bokeh, cocktail waitress tray visible passing through background blur, energy and motion everywhere.',
    fabric: 'MESH PHYSICS: Power mesh base with heat-transfer leopard print creating dual-opacity textile. Print areas: black rosette spots at polyester thread density creating T=0.15 near-opaque dark zones. Ground areas: tan-gold mesh at T=0.55 semi-transparent revealing skin through warm filter. Stretch mesh under body tension: 30% biaxial strain opens mesh apertures increasing transmission by 15% at highest-tension zones. The leopard rosette pattern distorts with stretch - circular spots become elliptical following body curvature principal strain directions: horizontal ellipses at waist compression, vertical ellipses at hip stretch.',
    hosiery: 'HOSIERY: She wears sheer black thigh-high stockings with leopard-print lace welt band matching the dress animal motif. 15-denier sheer nylon T=0.76 in matte black. The matching leopard lace creates visual continuity from dress to leg. Nylon catches the multicolor slot machine bokeh light as shifting colored specular bands along the shin surface.',
  },
  {
    name: '05-white-bandage-cutout',
    attire: 'She wears a bright white bandage-knit bodycon mini dress with aggressive geometric cutouts at both sides of the waist and a rectangular cutout between the bust, exposing skin in bold architectural windows. The bandage knit has visible 3mm horizontal ribbing tracing every contour. Thick shoulder straps. Very short hemline. Clean and bold against dark bar environment.',
    scene: 'Real Vegas cocktail lounge: dark walls making the white dress pop dramatically, blue-white LED spots creating cool wash on white fabric while warm tungsten practicals light the bar behind, long mirror behind bar reflecting the entire scene and doubling visible light sources, row of just-poured shots lined up on bar top, cocktail shaker still sweating with condensation, worn leather bar stool seats.',
    fabric: 'BANDAGE PHYSICS: Rayon-nylon-spandex power bandage knit with 3mm horizontal rib structure creating periodic shadow-highlight ribbing from directional overhead lighting. White fabric: near-Lambertian diffuse reflector R_diffuse=0.87 across visible spectrum - acts as projection screen for every colored light source in the bar, showing warm amber tint in tungsten-lit zones and cool blue tint in LED zones simultaneously on different parts of the same dress. Cutout edges: clean laser-cut with heat-sealed firm edge creating sharp geometric skin-window boundaries. Rib compression varies with body curvature: 2mm compressed ribs at narrowest waist, 3.8mm expanded ribs at hip maximum.',
    hosiery: 'HOSIERY: She wears sheer nude thigh-high stockings with thin white lace welt band matching the white dress. 10-denier barely-there T=0.87 ultra-sheer creating smooth professional finish. The white dress hemline against nude sheer stockings creates clean stark transition. Overhead LED spots create cool-white specular band along anterior shin.',
  },
  {
    name: '06-black-wet-look-halter',
    attire: 'She wears a black wet-look lycra halter-neck micro dress with plunging halter neckline and completely bare back to the waist. The wet-finish creates mirror-like liquid sheen across the entire surface mapping every curve. Tied behind neck with simple cord. Extremely short hemline. The wet-look surface reflects colored bar lights as distorted streaks following body curvature.',
    scene: 'Dark moody Vegas after-hours lounge: nearly all-black interior with single dramatic overhead tungsten spot on her position creating harsh key with deep fall-off, rest of bar in near-darkness with only neon beer sign and exit sign providing ambient, smoke machine haze visible as blue-gray volumetric wisps in the spot beam, empty cocktail glasses stacked by bartender, clock showing 2am, last-call energy.',
    fabric: 'WET-LOOK LYCRA PHYSICS: Polyester-elastane jersey with permanent silicone surface treatment filling micro-gaps between fibers and index-matching (n_treatment=1.48 vs n_polyester=1.54) eliminating 80% of diffuse fiber-air interface scatter. Result: specular-to-diffuse ratio dramatically elevated creating liquid-mirror appearance without actual moisture. Under single harsh overhead tungsten spot: one dominant elongated specular streak traces the maximum curvature path from shoulder over bust to hip, with deep black absorption everywhere else. Halter tie tension creates radiating strain lines from neck point downward. Bare back skin provides direct subsurface scattering contrast against the synthetic glossy front.',
    hosiery: 'HOSIERY: She wears sheer black thigh-high stockings with glossy wet-look finish matching the dress material. 20-denier semi-sheer nylon with gloss surface treatment creating elevated R=0.07 specular sheen echoing the wet-look dress. Thin plain welt band. The matched gloss finish creates visual continuity from dress to legs as unified wet-look surface, the single overhead spot creating matching specular streaks on both dress and stockings.',
  },
  {
    name: '07-gold-lame-wrap',
    attire: 'She wears a gold metallic lamé wrap mini dress with deep crossover V-neckline and tie closure at the left hip creating asymmetric draped hemline - shorter on the left, longer on the right. The metallic lamé catches every light source as brilliant gold fire. Loose wrap construction allows movement and drape. Three-quarter sleeves pushed up to elbows.',
    scene: 'Classic old-school Vegas cocktail lounge: red Naugahyde corner booth with brass tack trim, round cocktail table with single candle in red glass holder providing warm uplight on face, vintage Vegas show posters on wall in background blur, dark patterned commercial carpet, overhead brass fixture with three exposed candelabra bulbs at 2700K, old-fashioned cash register with NO buttons glowing at end of bar.',
    fabric: 'LAMÉ PHYSICS: Woven metallic textile with aluminum-coated polyester warp threads creating flat reflective strips interlocked with matte polyester weft. Aluminum reflective surface R=0.88 broadband but gold-anodized coating creates wavelength-selective reflection: high R>0.80 above 550nm warm wavelengths, absorption drop R<0.40 below 480nm cool wavelengths giving characteristic warm gold through Fresnel spectral filtering. Wrap drape creates large catenary fold curves y=a*cosh(x/a) with a=9cm characteristic length between tie point and hip support. Fold valleys concentrate reflected light as caustic lines. Tie closure at hip creates radial fan of compression folds emanating from knot point.',
    hosiery: 'HOSIERY: She wears sheer suntan thigh-high stockings with thin gold-thread lace welt band. 12-denier ultra-sheer T=0.82 in warm tan matching natural skin tone. Gold lace thread catches candlelight as tiny bright specular points at each thread crossing in the welt pattern. The warm nude tone with candlelight uplight creates sun-kissed appearance.',
  },
  {
    name: '08-burgundy-velvet-slip',
    attire: 'She wears a deep burgundy crushed velvet spaghetti-strap slip mini dress. The crushed velvet creates dramatic light-dark pattern as chaotically oriented pile fibers alternately catch and absorb light. Thin spaghetti straps, low scoop neckline. The slip cut skims the body following gravity rather than gripping. Ultra short hemline. Luxe fabric meets casual silhouette - effortlessly undone Vegas.',
    scene: 'Intimate real Vegas jazz bar: small stage with upright bass and empty mic stand in background blur, warm amber spot on performance area spilling into seating, worn wooden bar with years of character, half-drunk martini with olive, jazz posters and signed photos on brick wall, dim wall sconces with amber shades creating warm pools, exposed Edison bulbs dangling from cloth cord.',
    fabric: 'CRUSHED VELVET PHYSICS: Viscose rayon pile fibers 2.5mm height in chaotic crush-alignment creating anisotropic BTF surface. Aligned-fiber zones catch light as bright shimmer streaks where hundreds of pile fibers simultaneously present specular surfaces to viewer. Anti-aligned zones scatter light away from viewer creating deep matte burgundy absorption valleys at 95% light trapped in pile depth. The full bidirectional texture function varies across all 6 angular dimensions. Burgundy dye: dual absorption at 430-520nm blue-green and above 700nm, narrow transmission window 600-680nm for rich wine-red color. On body curves the crush pattern creates complex brightness mosaic with every contour showing different bright-dark distribution.',
    hosiery: 'HOSIERY: She wears sheer black thigh-high stockings with simple thin elastic welt - no lace, minimal and unfussy matching the effortless slip dress aesthetic. 15-denier sheer T=0.76 matte black creating clean dark leg line. The contrast between luxe crushed velvet texture above and smooth matte nylon below creates deliberate material contrast at the hemline.',
  },
  {
    name: '09-neon-pink-bodycon',
    attire: 'She wears a neon hot pink ribbed stretch bodycon mini dress with high crew neckline and sleeveless cut. The neon pink is aggressively saturated and eye-catching. Ribbed knit texture with 2mm horizontal ribs tracing every curve. Skin-tight with zero ease. Very short hemline. The kind of bold neon statement that only works at 1am in Vegas.',
    scene: 'Packed Vegas strip bar at peak hours: crowd energy visible as multiple blurred figures in background, bartender mid-pour in background, drinks everywhere on the bar, sticky spots on granite bar surface catching light, neon signs reflecting in every glass surface, bass speaker vibration causing slight surface ripple in nearest cocktail, overhead theatrical par can wash in warm amber with cool blue edge-fill from opposite direction creating split lighting.',
    fabric: 'NEON PINK PHYSICS: Fluorescent rhodamine-type organic dye in nylon-elastane blend with UV-excited fluorescence: absorbs 365-530nm and re-emits at 580-620nm Stokes-shifted emission with quantum yield phi=0.65. Under bar UV and blue LED accent lighting the dress radiates more visible light than a purely reflective surface, creating supernatural brightness glow. Ribbed knit: 2mm rib height creates periodic shadow-highlight micro-striping from any directional source. Body-conforming stretch maps ribs to follow body topology - ribs compress at waist narrowing to 1.5mm and expand at hips to 2.5mm.',
    hosiery: 'HOSIERY: She wears sheer nude thigh-high stockings with clear silicone welt grip, virtually invisible. 8-denier T=0.90 ultra-sheer bare-leg effect. The neon pink dress against apparently bare legs creates maximum color impact - all attention on the electric pink above, clean legs below. UV bar lighting causes slight fluorescent brightening in the optical-brightener-treated nylon.',
  },
  {
    name: '10-denim-micro-corset',
    attire: 'She wears a dark indigo raw denim corset-style strapless micro dress with visible copper rivets at stress points, functional front busk closure with brass hooks, and topstitched seaming in gold contrast thread. The raw unwashed denim has authentic slubby texture and indigo crocking potential. Strapless corset boning shapes the torso. Frayed raw-edge hemline at upper thigh. Vegas meets rodeo.',
    scene: 'Vegas honky-tonk bar with Western edge: mechanical bull in deep background blur, neon Coors Light sign, wagon wheel chandelier with flame-tip bulbs, reclaimed barnwood wall cladding, beaten copper bartop, line of shot glasses with amber whiskey, sawdust texture on wooden plank floor, leather saddle mounted on wall as decor, warm overhead tungsten track lighting.',
    fabric: 'RAW DENIM PHYSICS: 14oz selvedge denim twill weave: indigo-dyed cotton warp over natural cotton weft creating characteristic blue-face white-back dual-tone. 3x1 right-hand twill diagonal visible at macro scale running upper-left to lower-right. Indigo dye: natural plant-derived pigment absorbs 560-700nm with peak absorption 625nm, transmits 420-490nm for deep blue. Slubby yarn irregularities: random thickness variations in hand-spun-style warp create organic textural stripe pattern. Copper rivets: solid copper with R=0.75 at 600nm and characteristic patina oxidation at edges creating green-blue verdigris ring. Topstitching: doubled gold polyester thread creating raised 0.5mm ridge catching light as continuous specular line following every seam path.',
    hosiery: 'HOSIERY: She wears black fishnet thigh-high stockings with wide band welt - matching the tough raw denim edge with industrial fishnet. 2mm diamond mesh aperture with 0.6mm nylon cord. The fishnet creates bold geometric pattern on skin visible below the frayed denim hemline. Copper bar-top light reflects warm through the fishnet apertures onto skin beneath.',
  },
  {
    name: '11-emerald-satin-slip',
    attire: 'She wears an emerald green liquid satin cowl-back slip mini dress with thin chain straps in gold metal. The charmeuse satin drapes like liquid following gravity in catenary curves. Deep cowl drape at the open back reaches the lower spine. Front has subtle cowl neckline. Ultra short hemline. The satin catches light in broad glowing highlights separated by deep shadow folds.',
    scene: 'Upscale Vegas cocktail bar with edge: dark green tufted leather banquette, heavy crystal-cut rocks glasses with amber spirits, cedar cigar box open on bar showing rows of wrapped cigars, single overhead brass spotlight creating dramatic pool of light, dark walnut bar with brass rail, vintage absinthe fountain as decorative centerpiece, art deco mirror with oxidized patina in background.',
    fabric: 'CHARMEUSE SATIN PHYSICS: 19-momme silk charmeuse 4/1 warp-float weave creating lustrous face with specular lobe half-width 8 degrees. Silk fibroin protein fiber birefringence delta_n=0.04 creates subtle polarization-dependent appearance shift. Gravity drape: catenary sag y=a*cosh(x/a) with a=11cm characteristic length. Cowl neckline and cowl back each create complex minimal-energy fold surfaces with Gaussian curvature varying from positive dome bulges through zero cylindrical ridges to negative saddle-point transitions. Emerald green dye: absorption 600-700nm red wavelengths with peak transmission 520-555nm. Caustic light concentrations in concave fold valleys where cylindrical geometry focuses reflected light.',
    hosiery: 'HOSIERY: She wears sheer black thigh-high stockings with thin emerald green satin ribbon bow detail at outer welt. 15-denier sheer T=0.76 matte black nylon. The single green ribbon bow provides color bridge between emerald dress and black stockings. Brass spotlight overhead creates warm broad specular band along anterior shin surface.',
  },
  {
    name: '12-sheer-black-mini',
    attire: 'She wears a completely sheer black chiffon long-sleeve mini dress over a black micro bandeau and high-waist black briefs visible beneath. The chiffon is genuinely see-through with T=0.70 single-layer transmission. The layered opacity creates zones: opaque where undergarments layer beneath, sheer where bare skin shows through dark transparent fabric. Bold and unapologetic real Vegas nightlife.',
    scene: 'Dark atmospheric Vegas underground lounge: all matte black walls and ceiling, single red neon cursive sign reading "cocktails" as primary colored light source casting red spill, heavy theatrical haze catching overhead narrow-beam spotlights as visible volumetric cones, raw concrete floor, industrial metal bar stools, drinks served in matte black glassware, moody and cinematic.',
    fabric: 'CHIFFON OPTICS: 8-denier polyester chiffon single-layer transmission T=0.70 per pass. Where layered over opaque black bandeau: total T=0 opaque zone with visible chiffon texture overlay creating matte-on-matte depth. Where single layer over skin: Beer-Lambert I=I0*exp(-mu_a*x) through 0.15mm fabric thickness, skin visible at reduced contrast through dark transparent filter. Chiffon Henyey-Greenstein forward-scatter g=0.65 creates slight diffusion softening of skin detail beneath. Sleeve single-layer: arm skin tone visible through dark chiffon creating tinted effect. Hard overhead spot creates small concentrated chiffon specular from smooth polyester fiber surfaces.',
    hosiery: 'HOSIERY: She wears sheer black thigh-high stockings with plain thin welt - nearly invisible transition from the sheer black dress to sheer black legs, creating continuous dark translucent coverage from hem to toe. 15-denier T=0.76 matching the chiffon opacity zone creating visual continuity where dress meets leg, the boundary barely perceptible.',
  },
  {
    name: '13-red-latex-skirt-crop',
    attire: 'She wears a cherry red high-shine latex high-waisted micro skirt paired with a matching red latex cropped bandeau top leaving midriff bare. The latex on both pieces achieves mirror-like reflectivity catching the entire environment in warped reflections. The bare midriff skin between the two latex pieces provides organic contrast against the synthetic sheen. Both pieces are skin-tight zero-ease.',
    scene: 'Real Vegas strip-adjacent bar with raw energy: half-open garage door to the sidewalk letting in warm desert night air and distant Strip neon bokeh, concrete floor with drain grate, industrial pendant lights on long cord drops, graffiti-tagged bathroom hallway visible in background, stack of red Solo cups behind bar, sports on TV screen creating flickering blue-white ambient fill, real messy lived-in bar environment.',
    fabric: 'LATEX PHYSICS: Natural rubber compound n=1.52 with calendered surface Ra<0.03 microns. Fresnel reflectance following Schlick approximation from R_0=4.3% at normal to near-total at grazing angles on body curvature. Cherry red pigment absorbs 430-580nm transmitting 600-700nm through translucent 0.5mm sheet. Specular highlights are achromatic white elongated along maximum principal curvature. Two-piece construction means two independent reflection-map surfaces at different body angles - the skirt reflects floor and bar while the top reflects ceiling and lights, creating different color-temperature reflections on each piece. Bare midriff between pieces: direct skin SSS rendering with no fabric overlay.',
    hosiery: 'HOSIERY: She wears sheer red-tinted thigh-high stockings with thin glossy welt matching the red latex tone. 15-denier T=0.76 in red tint extending the cherry red from latex skirt down through legs as unified color. The glossy welt catches hard overhead light as bright specular ring at each upper thigh.',
  },
  {
    name: '14-chainmail-halter',
    attire: 'She wears a silver metal chainmail halter top with plunging V-front made of thousands of tiny interlocking aluminum rings, paired with a black leather micro skirt with chrome zipper detail. The chainmail drapes heavily with audible metallic movement. The V-halter is formed by the natural drape weight of the metal mesh. Raw and hard-edged.',
    scene: 'Vegas rock bar: Marshall amp stack as decor behind bar, band flyers stapled thick on wooden post, pool table with overhead Tiffany lamp in background creating green baize glow, PBR neon sign, scratched wooden floor, rock concert ticket stubs under bartop glass, overhead industrial cage pendant lights with bare filament bulbs, rough and authentic.',
    fabric: 'CHAINMAIL PHYSICS: European 4-in-1 weave aluminum rings 5mm inner diameter 0.8mm wire. Each toroidal ring reflects environment from unique fish-eye angle. Aluminum surface R=0.88 broadband. Inter-ring specular cascading: light entering gaps bounces 2-3 times between inner ring surfaces creating multiply-reflected caustic chains rippling through mesh with body movement. Ring-on-ring contact: thousands of metal point-contacts creating concentrated specular dot highlights. 30% open aperture revealing skin beneath with halftone-varying opacity depending on viewing angle to mesh plane. Total mass approximately 1.8kg creating heavy drape. BLACK LEATHER SKIRT: full-grain 1mm cowhide with semi-matte finish, chrome zipper teeth catching overhead filament light as row of bright specular points.',
    hosiery: 'HOSIERY: She wears sheer black thigh-high stockings with industrial-look plain wide welt band - no lace, matching the hard metal-and-leather aesthetic. 20-denier semi-sheer T=0.62 substantial dark coverage. The matte black nylon contrasts the bright reflective chainmail above creating deliberate reflective-to-matte material shift at the leather skirt hemline.',
  },
  {
    name: '15-white-crochet-mini',
    attire: 'She wears a white open-knit crochet mini dress with visible skin through the crochet holes. Scoop neckline with thick crochet border. The crochet pattern creates a geometric grid of white yarn with regularly spaced open windows showing tanned skin beneath. Short sleeves. Hemline mid-thigh with scalloped crochet edge. Bohemian Vegas pool-party-to-bar transition.',
    scene: 'Vegas pool-bar hybrid: half indoor half outdoor with retractable roof panel showing dark desert sky with single visible star, pool water creating dancing caustic light reflections on nearby concrete wall, tropical cocktail with paper umbrella and pineapple wedge, palm tree trunk visible at frame edge, warm overhead halogen floods mixed with cool LED pool lights creating dramatic split color temperature, wet footprints on terracotta tile.',
    fabric: 'CROCHET OPTICS: Cotton-acrylic blend yarn 2mm diameter in shell-stitch pattern creating binary transmission textile: T=0 at yarn (opaque white) and T=1.0 at aperture (open hole). Aperture diameter 8-12mm depending on stitch pattern zone. Area-weighted mean transmission T_mean=0.40. On body curvature: crochet holes on convex surfaces stretch larger (more transparent) while holes at compression zones close smaller (more opaque). White yarn acts as diffuse reflector R=0.85 catching every colored light source: warm halogen creates warm-tinted yarn, cool pool LED creates blue-tinted yarn, both visible simultaneously on different parts of the same garment.',
    hosiery: 'HOSIERY: She wears sheer nude thigh-high stockings with thin lace welt. 10-denier T=0.87 ultra-sheer barely-there nude. The pool bar environment is warmer and more casual - the sheer nude adds subtle polish beneath the bohemian crochet. Pool caustic light patterns dance across the nylon surface as reflected water patterns.',
  },
  {
    name: '16-copper-sequin-cowl',
    attire: 'She wears a copper-bronze all-over sequin cowl-neck spaghetti-strap mini dress. Thousands of 5mm cupped sequins in burnished copper create a scaled reptilian texture that catches light from every angle. Deep cowl neckline draping in front. Thin spaghetti straps. Hemline upper thigh. The copper sequins shift between warm gold and deep bronze depending on incident light angle.',
    scene: 'Real Vegas casino-adjacent cocktail bar: slot machine ambient LED bleed through doorway creating multicolor flickering fill, dark mahogany bar surface reflecting overhead spots, half-eaten appetizer plate pushed aside, crumpled cash on bar, martini glass with olive, overhead brass dome pendant providing key warm spot, patrons at far end of bar in conversational blur, real lived-in casino bar energy.',
    fabric: 'SEQUIN PHYSICS: 5mm cupped concave paillette sequins individually sewn allowing pivot. Cupped shape means each sequin is a tiny concave mirror with focal length f=r_cup/2 approximately 8mm creating real focused micro-images of nearby point sources. Copper-bronze metallic coating: wavelength-selective reflection R>0.80 above 560nm warm wavelengths, R<0.35 below 480nm creating characteristic warm bronze through spectral Fresnel filtering. Cupped concavity concentrates reflected light into tighter cone than flat sequins, creating brighter individual sparkle points. Random orientation distribution creates stochastic sparkle field at 8-20Hz flicker. Sequin overlap creates inter-sequin multiple reflections adding secondary dimmer sparkle layer.',
    hosiery: 'HOSIERY: She wears sheer bronze-shimmer thigh-high stockings with thin copper-metallic lace welt. 12-denier T=0.82 ultra-sheer with metallic microparticle shimmer additive creating warm bronze micro-sparkle matching the copper sequin tone. Extends the warm metallic color story from sequin dress through legs.',
  },
  {
    name: '17-black-cutout-bodycon',
    attire: 'She wears a black matte jersey bodycon mini dress with strategic angular cutouts: two diamond-shaped cutouts at the waist sides, one triangular cutout at center chest below the collarbone. Long sleeves with thumb holes. High round neckline. The cutouts expose geometric windows of skin against the matte black body-hugging jersey. Ultra short hemline. Modern and architectural.',
    scene: 'Sleek Vegas rooftop bar at night: Las Vegas Strip visible as wall of warm bokeh through glass railing, outdoor heating lamp creating orange glow zone, wind moving hair slightly, concrete planter with ornamental grass, modern low-profile outdoor furniture in dark metal, bottle service sparklers at far table creating bright overexposed starburst in background, cool desert night air visible as slight atmospheric haze.',
    fabric: 'MATTE JERSEY PHYSICS: Viscose-elastane blend jersey with matte-finish surface treatment: micro-roughened fiber surfaces Ra=2.5 microns eliminating specular reflection below detection threshold. Result: pure Lambertian diffuse reflection with zero visible highlights making the dress appear as flat matte black silhouette that absorbs 95% of incident light. The dress becomes an anti-light shape-defining negative space against lit skin and environment. Cutout edges: overlocked with clean firm edge. Bodycon stretch maps jersey to body topology with 25% biaxial strain creating perfect contour-following with zero wrinkles on tensioned surfaces. Thumb-hole sleeves create slight wrist gathering above the hole.',
    hosiery: 'HOSIERY: She wears sheer black thigh-high stockings with thin matte welt band - all-matte aesthetic matching the dress. 15-denier T=0.76 matte-finish black nylon. The unified matte black from dress through stockings creates continuous dark silhouette from neckline to toe, interrupted only by the geometric skin cutouts and the narrow band of bare thigh between hemline and welt.',
  },
  {
    name: '18-hot-pink-vinyl-skirt',
    attire: 'She wears a hot pink high-shine PVC vinyl micro skirt paired with a simple black ribbed tank top tucked in. The vinyl skirt catches bar lights as brilliant magenta-white specular streaks. The casual black tank grounds the outfit in reality while the pink vinyl skirt is pure Vegas audacity. Very high waist, very short hemline. Chrome belt buckle at waist.',
    scene: 'Packed real Vegas bar on a Saturday night: crowd noise visible as many blurred figures, someone taking a phone-flash photo in background creating blown-out white burst, drinks lined up for a group order, bartender reaching overhead for hanging glassware, sticky bar surface with lime wedge, crumpled straw wrapper, energy and chaos of a real peak night, overhead theatrical wash in warm amber.',
    fabric: 'VINYL PHYSICS: PVC calendered sheet n=1.54 Ra<0.05 microns approaching optical polish. Hot pink pigment: absorption band 490-560nm creating narrow transmission window at 610-650nm mixed with strong 420-470nm blue-violet transmission for characteristic hot pink as additive red+blue-violet. Fresnel reflectance R_0=4.6% rising steeply via Schlick approximation at grazing angles on hip curvature. Chrome belt buckle: polished 304 steel R=0.68 reflecting miniature distorted wide-angle image of the bar. RIBBED TANK: cotton-elastane 2mm rib knit with matte texture creating complete material contrast above the vinyl - matte organic cotton vs mirror-sheen synthetic PVC.',
    hosiery: 'HOSIERY: She wears sheer black thigh-high stockings with simple elastic welt - no frills matching the casual tank-and-skirt outfit energy. 15-denier T=0.76 sheer black. The hot pink vinyl catches a reflected specular streak of the black stockings at the hemline boundary creating a dark reflection band in the pink mirror surface.',
  },
  {
    name: '19-gold-fringe-flapper',
    attire: 'She wears a gold metallic fringe mini dress with thousands of 6-inch metallic chain fringe strands hanging from horizontal bands creating full-body cascading movement. Sleeveless with straight-across neckline. Every step and gesture creates a rippling wave of metallic fringe swinging and clashing with audible tinkling. Hemline fringe reaches upper thigh. Art deco excess meets Vegas.',
    scene: 'Classic Vegas lounge with old-school glamour: curved red velvet banquette booth, round cocktail table with white tablecloth and tea light, champagne coupe tower in background, vintage art deco geometric wallpaper, brass Art Deco elevator doors visible in background, old-school bartender in vest and bowtie blurred behind bar, leather-bound drink menu on table, warm amber overall ambiance.',
    fabric: 'FRINGE PHYSICS: Thousands of individual 6-inch gold-plated brass chain fringe strands each acting as independent pendulum with period T=2*pi*sqrt(L/g) approximately 0.5s for 15cm length. Collective fringe motion: body movement excites pendulum oscillation creating propagating wave patterns across the fringe field with 2-3Hz characteristic frequency. Each individual chain strand: 1mm links with gold plating R=0.82 at 580nm peak warm reflectance. Collective sparkle: thousands of independently swinging chains present constantly changing angles to light sources creating high-frequency stochastic sparkle field at 15-30Hz flicker. Inter-strand collisions create secondary chaotic perturbations. Horizontal mounting bands: 5mm gold strips at chest waist and hip creating structured horizontal bright lines between fringe zones.',
    hosiery: 'HOSIERY: She wears sheer nude thigh-high stockings with thin gold-thread lace welt. 10-denier T=0.87 barely-there ultra-sheer. The fringe strands partially hang over the welt band, metallic chains draping over the lace creating mixed metal-on-lace texture at the transition.',
  },
  {
    name: '20-electric-blue-mesh',
    attire: 'She wears an electric blue stretch mesh bodycon mini dress with long sleeves over a visible black micro bandeau and black briefs. The mesh is semi-transparent with bold geometric hexagonal pattern. The layered look - visible undergarments through colored mesh - is deliberately bold and unapologetic. Crew neckline. Very short hemline. Electric blue against black creates graphic punch.',
    scene: 'Vegas EDM bar near the club district: DJ booth LED wall cycling through blue-purple wash visible in background, bass bin speaker stack vibrating with visible resonance blur, fog machine output creating dense knee-level haze catching blue LED uplight, glow-stick-wearing patrons blurred in background, UV-reactive elements glowing throughout the space, energy drinks and vodka bottles on bar, raw concrete and industrial metal aesthetic.',
    fabric: 'MESH PHYSICS: Polyester-elastane power mesh with hexagonal pattern creating geometric semi-transparent textile. Mesh thread zones T=0 opaque electric blue. Aperture zones T=0.80 open showing skin and undergarments beneath. Hexagonal geometry: each hex cell approximately 8mm across creating repeating honeycomb over body surface. Under stretch: hexagons elongate in tension direction - horizontal hex stretch at waist compression, vertical hex stretch at hip expansion. Electric blue dye: narrow transmission band 450-490nm with fluorescent optical brightener creating UV-reactive glow under the bar blacklights. The mesh acts as blue-filtered viewing window over skin, tinting visible skin to cooler blue-shifted tone while black undergarments show through as dark shapes.',
    hosiery: 'HOSIERY: She wears sheer black thigh-high stockings with electric blue lace welt band matching the mesh dress. 15-denier T=0.76 matte black. Under UV bar lighting the blue lace welt fluoresces matching the dress mesh glow. The transition from blue mesh to black stockings creates clean color break at the hemline.',
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

console.log(`\n=== VEGAS V5 - RAW EDGY 4K PHOTOREALISM ===`);
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
console.log('V5 RAW EDGY RESULTS');
console.log(`${'='.repeat(60)}`);
const ok = results.filter(r => r.ok);
console.log(`Success: ${ok.length}/${results.length}`);
results.forEach(r => console.log(`  ${r.ok ? 'OK' : '!!'} ${r.name}${r.err ? ': ' + r.err : ''}`));
console.log(`\nOutput: ${OUTPUT_DIR}`);

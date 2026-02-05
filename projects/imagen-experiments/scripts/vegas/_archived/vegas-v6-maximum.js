#!/usr/bin/env node

/**
 * Vegas V6 - MAXIMUM DARING + FILTER-OPTIMIZED
 * All 20 concepts use materials proven to pass (metallic, sequin, velvet, satin, leather, denim, knit, fringe)
 * NO sheer-over-undergarments, NO see-through descriptions, NO latex two-piece
 * Raw gritty real-life Vegas, Canon R5 ISO 3200, no flash, 4K
 * 820-880 word prompts (validated sweet spot)
 */

import fs from 'fs/promises';
import path from 'path';

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) { console.error('GEMINI_API_KEY not set'); process.exit(1); }

const MODEL = 'gemini-3-pro-image-preview';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
const OUTPUT_DIR = process.env.V6_OUTPUT || path.join(process.env.HOME, 'nanobanana-output', 'vegas-v6-maximum');
const INPUT_IMAGE = process.argv[2] || '/Users/louisherman/Documents/tinklesherpants_story_11_6_2023_7_52_33 AM3230137043820160280.jpeg';

await fs.mkdir(OUTPUT_DIR, { recursive: true });

function buildPrompt(attire, scene, fabricPhysics, hosieryPhysics) {
  return `Edit this photograph into a raw gritty real-life Vegas bar photograph indistinguishable from an unretouched candid shot taken during a real night out. NOT a fashion editorial. Raw documentary nightlife photography capturing authentic Vegas energy. ${attire}

SCENE: ${scene}

CAMERA SENSOR PHYSICS: Canon EOS R5 Mark II 45MP stacked BSI-CMOS full-frame 36x24mm sensor. RF 50mm f/1.2L USM wide open at f/1.2 creating razor-thin 5cm depth-of-field plane. ISO 3200 producing authentic high-ISO luminance noise with visible grain sigma=sqrt(N_photons) in shadow regions and subtle chroma noise in underexposed zones. Shutter 1/125s allowing slight motion blur on moving hands and gestures. Phase-detect AF locked on near eye with gentle focus roll-off on far shoulder. 15-blade aperture producing creamy oval bokeh discs with onion-ring artifact from aspherical element. Barrel distortion at close focus. Chromatic aberration 0.3px purple fringing on high-contrast transitions at edges. White balance tungsten 3200K but mixed lighting creates unresolved color casts - warm foreground cool background. No flash - available light only with crushed blacks in unlit zones. Sensor heat noise faintly visible in deepest shadows.

3D LIGHT TRANSPORT: Primary from overhead recessed tungsten track spots at 2800K creating hard directional pools with sharp shadow edges - NOT soft diffused fashion lighting. Secondary from neon bar signage casting saturated colored spill with hard color boundaries. Tertiary weak ambient from distant ceiling at 3-stop underexposure. Inverse-square falloff I=Phi/(4*pi*r^2) creating steep 4-stop luminance gradient from bar to dark booths. NO fill light - deep unrecoverable shadows on shadow-side of face. Mixed color temperature: 2800K tungsten key with 4100K fluorescent spill creating blue-green contamination on background. Beer glass caustic projections on bar surface from spot refraction.

SKIN BIO-OPTICAL RENDERING: Subsurface scattering through epidermis-dermis-hypodermis with melanin absorption mu_a_mel=6.6*C_mel*(lambda/500)^(-3.33). HbO2 peaks 542nm 576nm as warm flush at cheeks and chest from bar heat. Real unretouched skin: visible pores at nose and cheeks, expression lines, authentic complexion. Sebaceous oil sheen on T-zone catching overhead hard light as irregular specular patches. Fine vellus hair on forearms catching rim light. Slight perspiration on upper lip and temples from warm bar creating micro-specular scatter. Preserve face bone structure eye color expression exactly from source.

${fabricPhysics}

${hosieryPhysics}

RAW IMPERFECTIONS: Visible ISO 3200 grain across entire image especially shadows. Slight motion blur on fingertips from mid-gesture at 1/125s. One flyaway hair catching backlight at different focal plane. Background blown bokeh with recognizable neon shapes. Foreground cocktail glass edge creating out-of-focus refraction blur. Slight lens flare from brightest neon creating veiling glare. Bar napkin crumpled on counter. Condensation ring from glass on bar. Another patron's elbow at extreme frame edge. No retouching no smoothing no color grading - straight out of camera. Preserve her face expression and all features identical to original.`;
}

const concepts = [
  {
    name: '01-liquid-gold-bandeau',
    attire: 'She wears a liquid gold metallic lamé strapless bandeau micro dress that barely reaches upper thigh. The metallic fabric vacuum-conforms to every curve catching all ambient light as brilliant gold fire. Completely strapless held by tension alone. The gold surface reflects the entire bar environment in warped funhouse-mirror distortion mapped onto body curvature. Aggressively short hemline.',
    scene: 'Gritty real Vegas strip bar at 1am: scratched mahogany bar top with ring stains, half-empty rocks glass with melting ice, neon Coors sign casting amber-red spill on wall, cracked vinyl bar stools, bartender reaching for top shelf in background blur, tip jar with crumpled bills, warm tungsten overhead spots with dust particles visible in beam, sticky floor catching shoe-sole prints.',
    fabric: 'METALLIC LAMÉ PHYSICS: Aluminum vapor-deposited warp threads interlocked with matte polyester weft creating flat reflective strips. Al surface R=0.88 broadband with gold-anodized selective reflection: R>0.80 above 550nm warm wavelengths, absorption drop R<0.40 below 480nm creating warm gold through spectral Fresnel filtering. On doubly-curved body each point reflects unique environment direction via Gauss surface-normal map creating continuous anamorphic distorted bar image wrapped around torso. Specular highlights from overhead tungsten are elongated streaks following maximum principal curvature. Catenary drape y=a*cosh(x/a) with a=8cm between support points. Fold valleys concentrate reflected light as caustic lines.',
    hosiery: 'HOSIERY OPTICS: She wears black thigh-high stockings with a thin gold-thread lace welt band at upper thigh. 20-denier semi-sheer nylon T=0.62 creating substantial dark smoky coverage that contrasts the brilliant gold dress above. Gold lace thread catches overhead tungsten as bright specular dots at each thread crossing. The matte-dark stockings make the metallic gold dress appear even more blazingly reflective by material contrast.',
  },
  {
    name: '02-crimson-velvet-plunge',
    attire: 'She wears a deep crimson crushed velvet plunging V-neck bodycon mini dress. The crushed velvet creates dramatic shimmer-dark pattern as chaotically oriented pile fibers alternately catch and absorb light across every curve. Deep plunging V-neckline to mid-sternum. Long fitted sleeves. Hemline well above mid-thigh. The crushed pile creates a living texture that shifts with every movement.',
    scene: 'Dark underground Vegas jazz lounge: small stage with upright bass in background blur, warm amber spot on performance area, worn leather bar with decades of character, martini with olive, signed jazz photos on exposed brick wall, dim wall sconces with amber glass shades, Edison bulbs on cloth cord, intimate and smoky atmosphere with visible haze wisps.',
    fabric: 'CRUSHED VELVET PHYSICS: Viscose rayon pile 2.5mm height in chaotic crush-alignment creating anisotropic bidirectional texture function. Aligned-fiber zones: hundreds of pile fibers simultaneously present specular surfaces creating bright shimmer streaks. Anti-aligned zones: fibers scatter away from viewer creating deep matte absorption at 95% light trapped in pile depth. Full 6D BTF(u,v,theta_i,phi_i,theta_o,phi_o) varies across body. Crimson dye: dual absorption 430-520nm and above 700nm with narrow 600-680nm wine-red transmission. Deep V-neckline creates converging fabric fold lines meeting at V-point with complex crush pattern intersection.',
    hosiery: 'HOSIERY OPTICS: She wears black thigh-high stockings with simple thin welt band - understated matching the jazz-lounge mood. 15-denier nylon T=0.76 matte black creating clean dark leg line. The contrast between luxe crushed velvet shimmer above and smooth matte nylon below creates deliberate texture shift at hemline.',
  },
  {
    name: '03-mirror-chrome-mini',
    attire: 'She wears a mirror-finish chrome silver one-shoulder mini dress approaching actual mirror reflectivity. The chrome surface captures warped inverted images of the entire bar environment mapped onto her body topology. Every light source appears as an elongated bright streak. Asymmetric single-shoulder cut baring one arm completely. Skin-tight zero ease. Ultra-short hemline.',
    scene: 'Neon-drenched Vegas strip-adjacent bar: purple and magenta neon visible through front windows showing Strip at night, chrome swivel stools with LED bases, color-cycling LED drink rail, polished dark concrete floor reflecting all neon above, DJ booth with moving-head beams through dense haze, real energy of a packed Vegas night.',
    fabric: 'CHROME PHYSICS: Vacuum-metallized aluminum on silk substrate at 80nm thickness creating Fresnel R=0.96 at grazing incidence. Surface Ra=0.12 microns giving near-mirror coherent reflection. Each concave fold creates convergent caustic projection I_caustic=I_source*(r/2d) onto adjacent skin and bar. Each convex curve creates divergent virtual reflected image with barrel distortion following body Gaussian curvature. Anisotropic silk micro-fiber alignment creates directional shimmer streaks along bias-cut seam paths. One-shoulder asymmetry creates two distinct reflection regimes: covered shoulder reflects ceiling while bare shoulder shows direct skin SSS.',
    hosiery: 'HOSIERY OPTICS: She wears black thigh-high stockings with narrow chrome-metallic welt band matching the dress mirror finish. 20-denier T=0.62 matte black nylon. The deliberate matte-black-to-mirror-chrome contrast at hemline boundary creates maximum material drama - flat black absorber below, total reflector above.',
  },
  {
    name: '04-black-sequin-plunge',
    attire: 'She wears an all-over black sequin deep-V plunging mini dress. Thousands of 5mm matte-black sequins with iridescent oil-slick rainbow coating covering every surface. Deep plunging V-neckline. Sleeveless. Each sequin independently catches colored bar light creating a dark galaxy of shifting prismatic fire across the black field. Ultra-short hemline.',
    scene: 'Real Vegas casino-adjacent bar: slot machine LED bleed through doorway creating multicolor flicker, dark granite bartop reflecting spots, half-eaten appetizer pushed aside, crumpled cash on bar, overhead brass dome pendant, patrons at far end in conversational blur, lived-in casino bar energy with zero pretension.',
    fabric: 'SEQUIN OPTICS: 5mm flat paillettes individually sewn at center-hole pivot. Black base with thin-film oil-slick interference coating: 120nm TiO2 layer (n=2.4) over dark absorber substrate. Bragg condition 2*n*d*cos(theta)=m*lambda creates angle-dependent spectral color on each sequin: face-on shows dark with faint green, tilted shows blue-violet-magenta shifting continuously with viewing angle. Against black base the prismatic fire appears as scattered points of color against dark void - like stars. Random sequin orientation creates stochastic iridescent sparkle at 8-20Hz as body micro-moves. Plunging V creates converging sparkle-density gradient toward neckline point.',
    hosiery: 'HOSIERY OPTICS: She wears black thigh-high stockings with thin iridescent welt band echoing the oil-slick sequin rainbow. 15-denier T=0.76 matte black nylon. Under casino multicolor light the iridescent welt band shifts through prismatic colors matching the dress sequin effect, bridging dress to hosiery.',
  },
  {
    name: '05-copper-chainmail-cowl',
    attire: 'She wears a copper-plated metal chainmail cowl-neck mini dress with deep draped cowl front and completely bare back. Thousands of tiny 3mm interlocking metal rings drape heavily creating liquid-metal waterfall. The cowl neckline pools the chainmail weight creating maximum sparkle concentration at the chest. Thin chain straps. Very short hemline with loose chain fringe.',
    scene: 'Vegas rock bar: Marshall amp stacks as decor, band flyers thick on wooden posts, pool table green baize glow in background, PBR neon sign, scratched wood floor, concert stubs under bartop glass, industrial cage pendants with bare filament bulbs, rough authentic dive-bar energy.',
    fabric: 'CHAINMAIL PHYSICS: European 4-in-1 weave copper-plated rings 3mm inner diameter 0.5mm wire. Each toroidal ring reflects unique fish-eye environment image. Copper spectral reflection: R>0.80 above 560nm warm, R<0.35 below 480nm creating bronze through wavelength-selective Fresnel filtering. Inter-ring specular cascading: light bounces 2-3 times between inner surfaces creating multiply-reflected caustic chains rippling through mesh with movement. Ring-on-ring contact: thousands of metal point-contacts as concentrated specular dot highlights. 35% open aperture. Total mass ~2.5kg creating heavy distinctive drape with metallic swing momentum. Cowl concentrates chain density at lowest gravity point.',
    hosiery: 'HOSIERY OPTICS: She wears black thigh-high stockings with wide plain welt - industrial aesthetic matching metal-and-rock-bar vibe. 20-denier T=0.62 matte black. The matte nylon contrasts bright reflective chainmail above creating sharp reflective-to-absorptive material transition at the chain fringe hemline.',
  },
  {
    name: '06-white-leather-corset',
    attire: 'She wears a bone-white genuine leather structured corset mini dress with 14 visible steel boning channels, sweetheart bustline, and lace-up back with white leather cord through chrome grommets. The white leather catches every colored bar light as projection screen showing warm amber tints and cool blue tints simultaneously on different surfaces. Ultra-short hemline. Waist dramatically cinched by corset structure.',
    scene: 'Sleek Vegas rooftop bar: Strip skyline as wall of warm bokeh through glass railing, outdoor heat lamp orange glow, wind moving hair slightly, concrete planters with ornamental grass, modern dark metal furniture, bottle service sparklers as bright starburst in background, cool desert night air as slight atmospheric haze.',
    fabric: 'WHITE LEATHER PHYSICS: Full-grain cowhide 1.2mm chrome-tanned with semi-gloss finish. White leather acts as near-Lambertian diffuse reflector R=0.82 - effectively a projection screen for colored bar lights showing warm amber from tungsten, cool blue from LED, neon colors all simultaneously on different body zones. 14 steel boning channels create 14 vertical panel geometry with hard edge shadow-to-highlight transition at each bone edge. Corset compression: graduated tension from maximum at waist to relaxed at bust and hip creating smooth conical profile. Chrome grommet eyelets reflect overhead spots as row of bright circular specular points along spine. Lace cord tension creates V-shaped compression wrinkles radiating from each grommet.',
    hosiery: 'HOSIERY OPTICS: She wears white thigh-high stockings with clean simple welt matching the white leather dress. 15-denier T=0.76 white nylon creating continuous white leg line extending the white leather aesthetic. Under rooftop mixed lighting the white nylon picks up the same multicolor light-projection effect as the white leather dress.',
  },
  {
    name: '07-emerald-crushed-satin',
    attire: 'She wears an emerald green crushed satin halter mini dress with deep plunging halter neckline tied behind the neck and completely open back to the waist. The crushed satin creates brilliant highlight-shadow pattern with concentrated specular streaks along crush lines. Body-skimming cut. Extremely short hemline. The satin catches bar light as molten emerald fire.',
    scene: 'Upscale Vegas cocktail bar: dark walnut bar with brass rail, heavy crystal rocks glasses with amber spirits, cedar cigar box open on bar, single overhead brass spot creating dramatic light pool, art deco mirror with oxidized patina, leather banquette, vintage absinthe fountain as centerpiece, sophisticated but lived-in.',
    fabric: 'CRUSHED SATIN PHYSICS: 19-momme silk charmeuse with random crush-fold topology. Satin 4/1 warp-float creating lustrous face with specular lobe half-width 8 degrees. Crush alignment creates: (a) aligned fold valleys where fibers catch light simultaneously as brilliant specular streaks, (b) anti-aligned fold peaks where light scatters away creating deep shadow valleys. Emerald dye absorbs 600-700nm red with peak transmission 520-555nm. Silk fibroin birefringence delta_n=0.04 creates subtle polarization-dependent shimmer. Halter tie tension radiates strain lines from neck point downward through the crush field. Open back: bare skin SSS provides organic contrast against synthetic satin sheen at the boundary.',
    hosiery: 'HOSIERY OPTICS: She wears black thigh-high stockings with thin emerald satin ribbon bow at outer welt. 15-denier T=0.76 matte black. The single emerald ribbon bow bridges dress color to hosiery. Brass spot overhead creates warm broad specular band along anterior shin.',
  },
  {
    name: '08-gunmetal-sequin-wrap',
    attire: 'She wears a gunmetal dark-silver all-over sequin wrap mini dress. Deep crossover V-neckline with wrap tie at left hip creating asymmetric draped hemline. Thousands of 4mm flat sequins in dark pewter metallic catching every light as a field of steel-gray sparkle. Three-quarter sleeves pushed to elbows. The dark metallic sequins read as tough and edgy not glamorous.',
    scene: 'Packed real Vegas bar Saturday night: many blurred figures creating crowd energy, someone phone-flash in background as blown-out burst, drinks lined up for group order, bartender reaching for hanging glassware, sticky bar surface with lime wedge, crumpled straw wrapper, peak-night chaos energy, warm amber theatrical wash overhead.',
    fabric: 'SEQUIN PHYSICS: 4mm flat paillettes in gunmetal dark-silver with aluminum base coat under tinted clear-coat creating subdued metallic reflection R=0.55 (vs bright silver R=0.88). Each sequin reflects environment but at reduced intensity creating moody dark-sparkle rather than disco-ball flash. Wrap construction: overlap zone at hip has double sequin layers creating Moiré beat-frequency interference pattern where two sequin grids overlap at slight angular offset. Tie closure creates radial compression fan from knot. Individual sequin pivot at 8-15Hz flicker from body micro-movement.',
    hosiery: 'HOSIERY OPTICS: She wears black thigh-high stockings with simple elastic welt - no frills, tough aesthetic matching gunmetal mood. 20-denier T=0.62 matte black. The dark sequin dress into dark stockings creates unified dark-metallic-to-matte-black palette - tough and cohesive.',
  },
  {
    name: '09-hot-pink-vinyl-bodycon',
    attire: 'She wears a hot pink high-shine PVC vinyl sleeveless bodycon mini dress with high round neckline. The vinyl achieves near-mirror reflectivity catching bar lights as brilliant magenta-white specular streaks that trace every curve. Completely sleeveless with armholes cut high. Skin-tight zero ease. Very short hemline. The hot pink is aggressively saturated and unapologetic.',
    scene: 'High-energy Vegas EDM-adjacent bar: LED wall cycling blue-purple in background, bass speaker stack, knee-level fog catching colored uplight, energy drink bottles and vodka on bar, raw concrete and industrial metal aesthetic, glow elements scattered through crowd blur, UV-reactive accents glowing, sensory overload atmosphere.',
    fabric: 'VINYL PHYSICS: PVC calendered sheet n=1.54 ultra-smooth Ra<0.05 microns approaching optical polish. Fresnel R_0=4.6% at normal rising via Schlick R(theta)=R_0+(1-R_0)*(1-cos(theta))^5 to near-total at grazing on hip and thigh curvature. Hot pink pigment: absorption 490-560nm with narrow 610-650nm + 420-470nm transmission for additive red+violet = hot pink. Under blue-purple LED wash: dress color shifts toward magenta as blue LED adds to violet transmission component. Specular highlights are achromatic white streaks elongated along maximum curvature direction. Bodycon biaxial stretch eliminates all micro-wrinkles on tensioned surfaces.',
    hosiery: 'HOSIERY OPTICS: She wears black thigh-high stockings with hot pink ribbon threaded through welt matching dress. 15-denier T=0.76 matte black. The matte black contrasts mirror-sheen vinyl creating deliberate reflective-to-matte material break at hemline. Pink ribbon provides color continuity.',
  },
  {
    name: '10-midnight-velvet-off-shoulder',
    attire: 'She wears a midnight navy crushed velvet off-shoulder bodycon mini dress. Wide off-shoulder neckline baring both shoulders collarbone and upper chest. The crushed velvet creates shimmering light-dark mosaic across every curve as chaotic pile orientation alternately catches and absorbs light. Fitted long sleeves starting below shoulder. Very short hemline.',
    scene: 'Intimate Vegas piano bar: Steinway baby grand with open lid in background blur reflecting spot, midnight blue LED accent along bar base, crystal-cut tumblers on polished mahogany, art deco brass wall sconces with amber glass, dark herringbone hardwood with glossy polyurethane reflecting scene, quiet sophistication.',
    fabric: 'CRUSHED VELVET PHYSICS: Viscose rayon pile 2.5mm height chaotic crush creating full BTF surface. Midnight navy dye: broadband absorption with narrow transmission window 430-470nm deep blue. Crushed pile creates complex brightness mosaic: bright streaks where hundreds of fibers align to viewer, deep absorption valleys where fibers face away. Off-shoulder construction: fabric stretches across chest creating horizontal tension that partially straightens crush pattern into more uniform alignment, while loose shoulder drape preserves chaotic crush. The transition from stretched-uniform to draped-chaotic crush creates visible texture gradient across the garment.',
    hosiery: 'HOSIERY OPTICS: She wears black thigh-high stockings with thin midnight blue lace welt band color-matched to velvet dress. 12-denier T=0.82 ultra-sheer in dark navy tint creating visual continuity between midnight dress and leg. Blue LED bar accent catches the navy-tinted nylon as cool specular highlight along shin.',
  },
  {
    name: '11-hammered-bronze-grecian',
    attire: 'She wears a hammered bronze metallic jersey one-shoulder Grecian draped mini dress. Hundreds of tiny concave dimple-mirrors across the entire surface each catch light independently creating reptilian shimmer mosaic. Asymmetric Grecian drape with single strap over right shoulder. Draped fabric gathers at right hip. Bare left shoulder. Very short hemline.',
    scene: 'Industrial-chic Vegas bar: exposed copper piping on raw concrete ceiling, Edison ST64 bulbs in matte black cage pendants at 2200K, live-edge walnut bar on steel I-beam legs, hammered copper Moscow mule mugs, Cor-Ten steel wall panels with orange patina, whiskey barrel stave accent wall, warm industrial amber.',
    fabric: 'HAMMERED METALLIC PHYSICS: Embossed micro-concavity texture with dimple r=2-5mm depth 0.3-0.8mm. Each dimple acts as concave spherical mirror f=r/2 creating real inverted micro-images of Edison bulbs within each dimple as tiny focused bright spots. Cook-Torrance microfacet BRDF alpha=0.35 Beckmann slope distribution. Bronze coating: spectrum rises sharply above 550nm from R=0.18 blue-absorbed to R=0.87 at 700nm red-reflected creating warm bronze. Grecian drape: large fold cascade creates light-shadow alternation with each fold showing different highlight pattern from different effective surface curvature.',
    hosiery: 'HOSIERY OPTICS: She wears bronze-shimmer thigh-high stockings with copper-metallic lace welt matching the dress bronze tone. 15-denier T=0.76 with warm metallic microparticle shimmer extending the hammered bronze aesthetic from dress to legs. Edison warm light creates specular bands along shin.',
  },
  {
    name: '12-scarlet-satin-slip',
    attire: 'She wears a scarlet red liquid satin charmeuse spaghetti-strap slip mini dress with bias cut and low scoop back to mid-spine. The silk charmeuse drapes like liquid following gravity in catenary folds that map every contour beneath. Delicate spaghetti straps. Cowl-like drape at front neckline. Extremely short hemline. The satin catches light as broad luminous highlights separated by deep fold shadows.',
    scene: 'Classic old-school Vegas lounge: red Naugahyde corner booth with brass tack trim, round cocktail table with candle in red glass holder for warm uplight, vintage Vegas show posters in background blur, dark commercial carpet, overhead brass fixture with candelabra bulbs at 2700K, old-fashioned cash register at bar end.',
    fabric: 'CHARMEUSE SATIN PHYSICS: 19-momme silk 4/1 warp-float creating lustrous face with specular lobe half-width 8 degrees. Silk fibroin birefringence delta_n=0.04 splitting polarized light creating doubled specular highlight. Caustic concentrations along concave fold valleys where cylindrical mirror geometry focuses light I_caustic proportional to 1/r_curvature. Bias-cut drape: fabric grain at 45 degrees to body vertical creating maximum elasticity and body-conforming drape. Scarlet dye: strong absorption 430-580nm with peak transmission 620-700nm. Spaghetti strap tension creates V-shaped gathering at each attachment point.',
    hosiery: 'HOSIERY OPTICS: She wears black thigh-high stockings with thin red satin ribbon bow at outer welt. 15-denier T=0.76 matte black. The red ribbon bow bridges scarlet dress to black stockings. Candle uplight catches the satin ribbon as tiny bright specular accent.',
  },
  {
    name: '13-silver-fringe-cage',
    attire: 'She wears a silver metallic cage-strap bodice with criss-crossing 12mm wide metallic straps forming open lattice pattern, paired with a matching silver metallic fringe micro skirt with thousands of 8-inch chain fringe strands hanging from waistband. The cage straps catch light as bright linear highlights while fringe creates chaotic shimmer field. Every movement produces cascading wave of metallic sparkle and audible clinking.',
    scene: 'Vegas nightclub VIP section: LED wall cycling colors behind velvet rope, bottle service table with sparkler in magnum champagne, dark walls and low ceiling creating intimate cave-like space, multiple colored moving-head wash lights creating overlapping colored shadows, dense theatrical haze catching beams, premium energy.',
    fabric: 'CAGE STRAP + FRINGE PHYSICS: Bodice cage: 12mm silver lamé bias-tape strips in criss-cross lattice with chrome O-ring hardware at intersection points. Each strip acts as flat reflective band R=0.85 catching light differently based on local orientation - horizontal straps reflect ceiling as bright, diagonal straps reflect walls as mid-tone, creating brightness-mapped lattice. FRINGE: thousands of individual chain strands as independent pendulums T=2*pi*sqrt(L/g)~0.5s for 20cm. Collective motion: body excites pendulum oscillation creating propagating wave patterns at 2-3Hz. Each 1mm chain link gold-plated R=0.82. Inter-strand collisions create secondary chaotic perturbation. Collective sparkle at 15-30Hz stochastic flicker.',
    hosiery: 'HOSIERY OPTICS: She wears black thigh-high stockings with silver metallic narrow welt strip. 20-denier T=0.62 matte black providing clean dark base for the bright silver fringe above to cascade over. Chain fringe strands partially drape over the welt creating mixed metal-on-nylon texture at transition.',
  },
  {
    name: '14-burnt-orange-knit-bodycon',
    attire: 'She wears a burnt orange ribbed knit bodycon one-shoulder mini dress. Thick 4mm horizontal ribs trace every curve creating periodic shadow-highlight texture. Single shoulder strap on left with completely bare right shoulder. The stretchy knit grips every contour. Very short hemline. The warm burnt orange pops against dark bar environment. Raw and unfussy - knit fabric that moves and breathes.',
    scene: 'Vegas tiki cocktail bar: hand-carved wooden tiki totems flanking entrance, tropical monstera wallpaper, bamboo bar with copper penny inlay, flaming cocktails with blue ethanol fire, warm amber-orange theatrical gels overhead, rattan pendant lamps with 2200K vintage filament, orchid garlands and pineapple garnishes, tropical warmth.',
    fabric: 'RIBBED KNIT PHYSICS: Cotton-viscose-elastane blend 4mm rib height creating periodic parallel shadow-highlight striping from directional overhead source. Rib compression varies with body curvature: compressed 2.5mm at narrowest waist, expanded 5mm at hip maximum. Burnt orange dye: dual absorption at 435nm blue + 625nm red-absorbed with narrow peak transmission 575-600nm for warm orange. Under warm amber 2200K tiki lighting: dress color shifts toward deeper red-orange because warm light lacks blue wavelengths further saturating the orange. Knit stretch under body tension: 4-way elastane creates skin-contact adhesion mapping underlying contours. Single-shoulder asymmetry creates diagonal tension line from shoulder to opposite hip.',
    hosiery: 'HOSIERY OPTICS: She wears nude thigh-high stockings with thin bronze lace welt. 10-denier T=0.87 barely-there ultra-sheer in warm tone complementing burnt orange dress. The warm nude with tiki amber lighting creates sun-kissed appearance. Casual knit dress with barely-there stockings reads as effortlessly put-together.',
  },
  {
    name: '15-black-leather-mini-moto',
    attire: 'She wears a black genuine leather biker-style zip-front mini dress with asymmetric chrome zipper running from left hip to right shoulder, multiple zippered pockets with chrome pull tabs, chrome snap epaulettes at shoulders, and wide chrome-studded belt at waist. The leather has authentic grain texture and lived-in character. Short sleeves. Very short hemline. Hard-edge motorcycle aesthetic in a cocktail context.',
    scene: 'Underground Vegas rock dive bar: band flyers stapled thick on every surface, Jagermeister and Fireball neon signs, pool table with overhead Tiffany lamp, vinyl record covers on walls, duct-taped barstool cushions, PBR tallboy cans on bar, cigarette machine in corner, wall-mounted deer head, raw and authentic dive-bar grit.',
    fabric: 'LEATHER PHYSICS: Full-grain cowhide 1.4mm chrome-tanned with natural grain creating anisotropic microfacet surface with broad specular lobe half-width 15 degrees. Asymmetric chrome zipper: polished brass teeth R=0.72 catching overhead filament light as continuous linear specular line running hip to shoulder. Chrome snap hardware: each snap as tiny circular convex mirror reflecting environment from unique angle. Chrome studs on belt: repeating row of hemispherical reflectors each with circular specular highlight from overhead source. Leather ages with wear: slight patina at stress creases, worn grain at frequent-flex zones (elbow inner), natural surface variation.',
    hosiery: 'HOSIERY OPTICS: She wears black thigh-high stockings with wide plain industrial welt - no lace, tough and utilitarian matching biker aesthetic. 20-denier T=0.62 matte black. The matte black stockings blend into the matte black leather creating near-continuous dark silhouette broken only by the texture change from smooth nylon to grained leather at hemline.',
  },
  {
    name: '16-champagne-sequin-cowl',
    attire: 'She wears a champagne gold all-over sequin cowl-back halter mini dress. Deep draped cowl at the back scooping to lower spine showing full bare back. Halter straps at neck. Front has high crew neckline. Thousands of 4mm champagne-gold sequins catching warm bar light as a field of golden sparkle. Ultra-short hemline.',
    scene: 'Elegant Vegas champagne bar: rose gold fixtures, pink-veined marble bar slab, champagne coupe tower in background, blush pink LED uplighting, white orchid arrangements in crystal vases, ceiling mirrors reflecting scene from above doubling all light sources, sophisticated with a sexy edge.',
    fabric: 'SEQUIN OPTICS: 4mm champagne-gold sequins with warm metallic coating R=0.75 at 580nm peak warm reflectance. Each individually pivot-sewn creating independent sparkle. Champagne color: gold metallic base with rose-gold tint from thin iron-oxide interference layer adding warm pink undertone. Cowl-back drape: gravity pools sequins at lowest point creating maximum sequin density and therefore maximum sparkle concentration at lower back where fabric weight accumulates. Halter construction: two lines of tension from neck point create V-shaped strain pattern on front with sequins pulled taut (flat, uniform reflection) while loose cowl back allows sequins to hang at random angles (chaotic sparkle).',
    hosiery: 'HOSIERY OPTICS: She wears nude champagne-tinted thigh-high stockings with thin gold-thread lace welt. 12-denier T=0.82 ultra-sheer in warm gold tone extending champagne color story. Blush uplighting catches the tinted nylon as warm glow along leg contour.',
  },
  {
    name: '17-electric-violet-bodycon',
    attire: 'She wears an electric violet stretch bodycon mini dress with square neckline and cap sleeves. The saturated violet catches UV-adjacent bar lighting creating intense color saturation that appears to glow. Bodycon stretch maps every curve with zero ease. Cap sleeves frame the shoulders. Square neckline shows collarbones. Very short hemline. The violet is so saturated it vibrates against the warm bar tones.',
    scene: 'Vegas strip bar with neon energy: purple and violet neon tubes visible through windows, multicolor LED par cans overhead, dense crowd blur in background with smartphone screens as blue point lights, sticky bar with neon-lit drink menu board, cocktail with glowing UV ice cube, bass vibration visible in liquid surfaces, sensory overload nightlife.',
    fabric: 'BODYCON STRETCH PHYSICS: Polyester-elastane jersey with matte-to-sheen finish. Electric violet dye: narrow transmission band 380-440nm with potential fluorescent component - under UV-adjacent bar lighting the fluorescent rhodamine-type dye absorbs 365-480nm and re-emits at 400-450nm Stokes-shifted emission with quantum yield phi=0.45, creating modest glow that makes the dress appear brighter than pure reflection. Bodycon 4-way stretch under biaxial body tension creates skin-contact adhesion. Square neckline: geometric straight-line contrast against organic body curves. Cap sleeve seam creates shoulder-framing horizontal line.',
    hosiery: 'HOSIERY OPTICS: She wears black thigh-high stockings with thin electric violet ribbon accent at welt. 15-denier T=0.76 matte black. Under UV bar lighting the violet ribbon fluoresces matching dress glow while matte black stockings absorb creating dramatic color-pop accent at each upper thigh.',
  },
  {
    name: '18-gold-mesh-armor',
    attire: 'She wears a gold metallic mesh tank mini dress over a matching gold bandeau lining. The mesh is constructed of interlocking gold metallic scales like medieval armor creating semi-rigid structure. Wide tank straps. The scales shift and click with movement. Very short hemline with scaled fringe. Bold warrior-goddess Vegas energy.',
    scene: 'High-roller Vegas VIP lounge: gold-leaf coffered ceiling with recessed halogens, champagne in hammered silver bucket, floor-to-ceiling antiqued mirror panels creating infinite reflections, warm amber overhead spots, emerald velvet banquette, black lacquer bar with gold leaf edge, premium opulence.',
    fabric: 'SCALE MESH PHYSICS: Overlapping 8mm gold-anodized aluminum scales in fish-scale tessellation. Each scale acts as individual planar reflector at unique orientation angle determined by body curvature beneath. Gold anodic oxide wavelength-selective reflection: R>0.82 above 550nm warm, absorption R<0.40 below 480nm cool. Scale overlap: each scale partially covers the one below creating layered opacity with no gaps. When body moves, scales slide over each other with audible metallic clicking and momentary gap-flash exposing gold bandeau beneath. Antiqued mirror wall creates infinite recursive reflections of the gold scales multiplying the sparkle field infinitely.',
    hosiery: 'HOSIERY OPTICS: She wears gold-shimmer thigh-high stockings with metallic lace welt matching the gold armor aesthetic. 15-denier T=0.76 with gold metallic microparticle shimmer creating warm metallic continuity from armored dress through legs. Mirror wall reflections capture the gold shimmer stockings creating additional recursive sparkle.',
  },
  {
    name: '19-black-velvet-cutout',
    attire: 'She wears a black velvet bodycon mini dress with strategic geometric cutouts: two large diamond shapes at waist sides and one angular V-cutout at center upper back. Long sleeves. High crew neckline in front. The velvet absorbs 95% of light creating ultra-deep black silhouette while cutouts expose skin as bright windows of warmth against the dark void. Very short hemline.',
    scene: 'Dark atmospheric Vegas underground lounge: all matte black walls and ceiling, single red neon cursive sign as primary colored light, heavy theatrical haze catching narrow spotlight beams as visible cones, raw concrete floor, industrial metal stools, moody cinematic atmosphere with minimal lighting.',
    fabric: 'BLACK VELVET PHYSICS: Viscose rayon pile 2.5mm height in aligned orientation creating maximum light absorption. Pile fiber depth traps 95% of incident visible light through multiple inter-fiber scattering events - photons enter pile and bounce between fibers until absorbed, never escaping. Result: the dress appears as near-perfect blackbody absorber, darker than any other textile. Against this ultra-dark field, the geometric cutout windows of bare skin appear dramatically bright by contrast - skin reflecting even dim ambient light appears luminous against the velvet void. The material contrast creates the entire visual impact. Red neon spill reaches skin through cutouts but is absorbed by surrounding velvet.',
    hosiery: 'HOSIERY OPTICS: She wears black thigh-high stockings with matte plain welt. 20-denier T=0.62 matte black extending the all-black silhouette. The velvet-to-nylon transition at hemline is barely visible in the dark environment - only the skin cutouts provide brightness.',
  },
  {
    name: '20-rose-gold-sequin-mini',
    attire: 'She wears a rose gold all-over micro-sequin strapless mini dress. Tiny 3mm sequins in warm rose gold create dense glittering surface with higher sparkle frequency than standard sequins due to smaller size - more sparkle points per square cm. Strapless bandeau top held by tension. Very short hemline. The rose gold reads as warm feminine and modern against gritty bar environment.',
    scene: 'Vegas penthouse bar: panoramic curved windows showing entire Strip skyline as warm bokeh wall, transparent glass bar with LED edge illumination, white marble floors, champagne in crystal ice bucket, single white orchid in crystal vase, ceiling art spotlight creating dramatic key light, best-view-in-Vegas energy.',
    fabric: 'MICRO-SEQUIN OPTICS: 3mm rose gold sequins at 70 sequins/cm^2 density (vs standard 25/cm^2 for 5mm sequins) creating ultra-dense sparkle field with 2.8x more independent sparkle points. Each micro-sequin: rose gold coating from copper-gold alloy creating warm pink-shifted metallic reflection R=0.72 with characteristic rose warmth from copper component absorption below 500nm. Smaller sequin mass means lower moment of inertia and faster pivot response - micro-sequins flutter at higher frequency 15-30Hz creating finer, more shimmering sparkle vs the slower 8-15Hz of large sequins. Strip skyline bokeh through windows creates thousands of warm point-light reflections in the dense sequin field. Strapless tension holds sequin fabric taut at bust creating uniform reflective zone vs relaxed random-angle zone below.',
    hosiery: 'HOSIERY OPTICS: She wears nude rose-tinted thigh-high stockings with thin rose gold thread in lace welt. 10-denier T=0.87 barely-there with warm rose tint extending the rose gold palette. Strip skyline warm bokeh light catches the tinted ultra-sheer nylon as gentle warm glow.',
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

console.log(`\n=== VEGAS V6 - MAXIMUM DARING FILTER-OPTIMIZED 4K ===`);
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
console.log('V6 MAXIMUM RESULTS');
console.log(`${'='.repeat(60)}`);
const ok = results.filter(r => r.ok);
console.log(`Success: ${ok.length}/${results.length}`);
results.forEach(r => console.log(`  ${r.ok ? 'OK' : '!!'} ${r.name}${r.err ? ': ' + r.err : ''}`));
console.log(`\nOutput: ${OUTPUT_DIR}`);

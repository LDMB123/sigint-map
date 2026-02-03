#!/usr/bin/env node

/**
 * Nashville Honky-Tonk Phase 2 - Full Production
 * Generates remaining 27 concepts using validated patterns from Phase 1
 *
 * Distribution:
 * - 12 concepts @ Tootsie's (iconic purple neon)
 * - 10 concepts @ Robert's Western World (grittier authentic)
 * - 5 concepts @ Acme Feed & Seed (rooftop sophistication)
 *
 * Attire variation:
 * - 10 conservative baseline (crew neck, mid-thigh, 12-denier)
 * - 12 moderate sultry (scoop/V-neck, upper-thigh, 10-denier)
 * - 5 maximum edge (deep V/wrap, shortest hems, 8-denier ultra-sheer)
 */

import { GoogleAuth } from 'google-auth-library';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || 'gen-lang-client-0925343693';
const LOCATION = 'global';
const MODEL = 'gemini-3-pro-image-preview';
const OUTPUT_DIR = path.join(__dirname, '../assets/nashville');

const auth = new GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/cloud-platform'],
});

await fs.mkdir(OUTPUT_DIR, { recursive: true });

async function generateImage(options = {}) {
  const { prompt, aspectRatio = '1:1', imageSize = '4K' } = options;

  try {
    const client = await auth.getClient();
    const endpoint = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL}:generateImages`;

    const body = {
      instances: [{ prompt: prompt }],
      parameters: {
        sampleCount: 1,
        aspectRatio: aspectRatio,
        outputFormat: 'jpeg',
        mimeType: 'image/jpeg',
        safetyFilterLevel: 'block_some',
        personGenerationConfig: { denyAdultContent: false },
      },
    };

    const response = await client.request({
      url: endpoint,
      method: 'POST',
      data: body,
    });

    return response.data;
  } catch (error) {
    throw new Error(`API Error: ${error.message}`);
  }
}

const physicsShield = `**Camera capture physics, sensor behavior:** iPhone 15 Pro main camera (26mm full-frame equivalent), ISO 4100-4300 high sensitivity, f/1.4 maximum aperture wide open, 1/50s shutter speed handheld. Phase-detection autofocus hunting aggressively, eventually locking on eye catchlight. Full sensor noise preserved - luminance grain creating 0.24-0.26mm texture, severe color noise in shadows with blue channel 51-53% higher amplitude. Zero computational HDR, zero AI smoothing, zero noise reduction - completely raw sensor output. JPEG compression creating 8x8 pixel DCT block artifacts in shadows. Natural lens vignetting darkening corners by 1.6-1.7 stops. Chromatic aberration prominent at high-contrast edges, magenta/green fringing. Extremely shallow depth of field - only 2.8-3.2 inch slice in focus, background dissolved into soft bokeh.

**Skin microstructure at sensor resolution:** Sebaceous filaments visible as 0.5-1mm diameter dark spots on nose bridge and T-zone. Pores varying by region - nose 0.15-0.25mm, cheeks 0.08-0.12mm, forehead 0.10-0.15mm. Laugh lines radiating from eyes, 3-5 fine creases 0.05mm wide. Broken capillaries creating pink-red vascular streaks near nose base. Natural skin topology showing peaks/valleys, bumpy texture visible under raking light. Late-night skin: T-zone sebum oil accumulation creating strong specular highlights, foundation broken down settling in pores and fine lines, mascara smudging and transfer under lower lash, lip color worn unevenly.

**Light transport physics:** Venue-specific lighting creating color casts and bokeh. Primary colored neon reflecting across surfaces. Fabric showing anisotropic behavior - velvet absorption/reflection, hosiery translucency with light transmission through leg. Skin showing specular and diffuse reflection. All materials showing frequency-dependent absorption. Background bokeh showing spherical aberration from f/1.4 aperture.

**Material physics detail:** Crushed velvet showing anisotropic directional reflection, compression marks from sitting/standing, fabric pile 0.8-1.2mm with directional absorption. Hosiery construction - nylon denier visible through translucent leg, lace band weave clearly visible, silicone grip strip showing ridge line, matte surface with subtle sheen at grazing angles. Worn denim showing authentic patina, scuffs, fading. Leather showing creases, heel wear patterns.`;

/**
 * Phase 2: 27 Production Concepts
 * Distributed across venues, time progressions, and attire variation
 */
const productionConcepts = [
  // TOOTSIE'S CONCEPTS (1-12)
  // Concepts 1-4: Conservative baseline @ Tootsie's (early evening)
  {
    num: 4,
    venue: "Tootsie's Orchid Lounge",
    venueCode: 'T',
    timeProgression: 'early',
    time: '10:45pm',
    attireLevel: 'conservative',
    neckline: 'high crew neck',
    hemline: 'mid-thigh',
    hosiery: 'Sheer black 12-denier thigh-highs, 2.5-inch scalloped lace band visible where hem ends',
    color: 'Sapphire blue',
    fabric: 'crushed velvet',
    attireDesc: 'Sapphire blue crushed velvet bodycon mini, high crew neckline, 3/4 sleeves, mid-thigh hem. Form-fitting silhouette. Sheer black 12-denier thigh-highs with scalloped lace band. Black leather ankle boots, 1.5-inch heel, polished appearance.',
    scenario: 'Standing near Tootsie\'s bar early evening, direct sultry eye contact, composed confidence. Band setting up on stage visible background. Posed moment showing early-night freshness.',
    hair: 'Styled waves with volume, some strands around face. Maintained styling from earlier, minimal dishevelment. Glamorous professional appearance.',
    neonDetails: 'Primary Tootsie\'s purple neon 6500K cool wash. Secondary stage lights warm 3000K early in evening. Purple bar matte surface with few beer stains. Neon bokeh soft background. Early evening lighting with crisp definition.'
  },

  {
    num: 5,
    venue: "Tootsie's Orchid Lounge",
    venueCode: 'T',
    timeProgression: 'early',
    time: '11:15pm',
    attireLevel: 'conservative',
    neckline: 'modest scoop neck',
    hemline: 'mid-thigh',
    hosiery: 'Sheer black 10-denier thigh-highs, 2.5-inch lace band visible where hem ends',
    color: 'Deep burgundy',
    fabric: 'silk charmeuse',
    attireDesc: 'Deep burgundy silk charmeuse bodycon mini, modest scoop neckline, short sleeves, mid-thigh hem. Luxe fabric draping elegantly. Sheer black 10-denier thigh-highs with lace band. Black suede ankle boots, pointed toe.',
    scenario: 'Leaning on Tootsie\'s bar counter, holding drink, direct intense eye contact. Early evening energy with confidence building. Candid moment showing relaxed comfort.',
    hair: 'Long waves pulled to one side, partial updo with face-framing strands. Styled elegantly, showing intentional grooming. Some movement texture but primarily maintained.',
    neonDetails: 'Tootsie\'s purple neon creating magenta cast. Stage lights transitioning through colors. Liquor bottles behind bar showing light transmission. Drink condensation catching light. Bar surface showing age patina.'
  },

  {
    num: 6,
    venue: "Tootsie's Orchid Lounge",
    venueCode: 'T',
    timeProgression: 'early',
    time: '11:45pm',
    attireLevel: 'moderate',
    neckline: 'V-neckline',
    hemline: 'upper-thigh',
    hosiery: 'Sheer nude 10-denier thigh-highs, 2-inch taupe lace band visible where hem ends',
    color: 'Crimson red',
    fabric: 'stretch satin',
    attireDesc: 'Crimson red stretch satin bodycon mini, V-neckline showing modest depth, sleeveless, upper-thigh hemline. Tight silhouette emphasizing curves. Sheer nude 10-denier thigh-highs with taupe lace band. Black leather heels, 3-inch stiletto, strappy design.',
    scenario: 'Dancing near Tootsie\'s stage, hair moving with rhythm, direct sultry gaze toward camera. Mid-evening energy building. Captured mid-movement showing confidence and engagement.',
    hair: 'Partially down with waves, some strands escaping from movement. Tousled texture showing dancing activity. Volume and natural movement, more dishevelment than earlier.',
    neonDetails: 'Purple and red neon mixing creating magenta-red color cast. Stage lights cycling creating dynamic color changes. Dance floor activity visible background. Crowd silhouettes. Movement-induced bokeh.'
  },

  {
    num: 7,
    venue: "Tootsie's Orchid Lounge",
    venueCode: 'T',
    timeProgression: 'peak',
    time: '12:30am',
    attireLevel: 'moderate',
    neckline: 'scoop neckline',
    hemline: 'upper-thigh',
    hosiery: 'Fishnet thigh-highs, diamond pattern, 2.5-inch band visible where hem ends',
    color: 'Black',
    fabric: 'stretch velvet',
    attireDesc: 'Black stretch velvet bodycon mini dress, scoop neckline, 3/4 sleeves pushed up, upper-thigh hemline. Rich velvet showing directional nap. Fishnet thigh-highs diamond pattern medium opacity. Black suede boots, 2-inch heel, worn authentic appearance from wear.',
    scenario: 'Leaning against Tootsie\'s stage wall after dancing, direct eye contact with knowing sultry gaze. Breathing slightly elevated from movement. Midnight energy showing confidence. Candid captured moment.',
    hair: 'Significantly disheveled from 2 hours of activity. Ponytail loosened with strands around face. Tousled waves showing volume and movement. Lived-in texture suggesting extended nightlife.',
    neonDetails: 'Purple neon creating deep magenta. Stage lights showing red and blue bokeh. Bar showing wear and tear. Beer stains and patina creating authenticity. Crowd visible background. Hosiery creating diamond shadow patterns under venue light.'
  },

  {
    num: 8,
    venue: "Tootsie's Orchid Lounge",
    venueCode: 'T',
    timeProgression: 'peak',
    time: '1:00am',
    attireLevel: 'moderate',
    neckline: 'off-shoulder',
    hemline: 'upper-thigh',
    hosiery: 'Sheer black 8-denier thigh-highs, 2-inch reinforced band visible where hem ends',
    color: 'Emerald green',
    fabric: 'crushed velvet',
    attireDesc: 'Emerald green crushed velvet bodycon mini, off-shoulder neckline exposing collarbone and shoulders, short sleeves, upper-thigh hem. Velvet showing wear compression marks. Ultra-sheer black 8-denier thigh-highs with reinforced band. Black leather heels, pointed toe, 3-inch height.',
    scenario: 'Seated at Tootsie\'s bar stool, direct sultry eye contact with confidence. Holding drink, completely at ease in venue. Post-dancing relaxed energy. Candid intimate moment.',
    hair: 'Loose waves with some escape strands. Partially pinned with strands around shoulders and face. Tousled glamorous texture. Movement-created volume and dimension.',
    neonDetails: 'Tootsie\'s purple neon reflecting on skin and fabric. Green emerald showing cool undertones against purple. Stage lights creating bokeh. Crowd activity background. Multiple light sources creating layered illumination.'
  },

  {
    num: 9,
    venue: "Tootsie's Orchid Lounge",
    venueCode: 'T',
    timeProgression: 'peak',
    time: '1:30am',
    attireLevel: 'maximum',
    neckline: 'deep V wrap style',
    hemline: 'upper-thigh',
    hosiery: 'Ultra-sheer nude 8-denier Cuban heel, 2.5-inch band visible showing color variation',
    color: 'Plum purple',
    fabric: 'silk wrap',
    attireDesc: 'Plum purple silk wrap mini dress, deep V-neckline extending to lower chest, 3/4 sleeves, wrap waist loosened from wear, upper-thigh hemline bunched asymmetrically. Ultra-sheer nude 8-denier Cuban heel thigh-highs with darker taupe band. Black heels platform style, 4-inch height, ankle straps loose.',
    scenario: 'Leaning back against Tootsie\'s bar, direct intense sultry eye contact. Deep in night, maximum confidence. Alcohol-enhanced ease and flirtation. Candid moment showing peak night energy.',
    hair: 'Extensively tousled from 3+ hours activity. Wild glamorous texture with volume throughout. Strands across face and shoulders. Maximum dishevelment showing extended nightlife engagement.',
    neonDetails: 'Deep purple neon color cast matching outfit. Multiple light sources creating bokeh. Stage lights cycling colors. Crowd noise suggested by blurred background. Late-night venue aesthetic fully established. Hosiery showing Cuban heel detail with color variation.'
  },

  {
    num: 10,
    venue: "Tootsie's Orchid Lounge",
    venueCode: 'T',
    timeProgression: 'peak',
    time: '2:00am',
    attireLevel: 'maximum',
    neckline: 'plunging asymmetrical',
    hemline: 'upper-thigh',
    hosiery: 'Fishnet thigh-highs, fine 2mm openings, 2-inch top band visible where hem ends',
    color: 'Chocolate brown',
    fabric: 'stretch satin',
    attireDesc: 'Chocolate brown stretch satin mini dress, asymmetrical plunging neckline, sleeveless, upper-thigh hemline. Form-fitting silhouette. Fine fishnet thigh-highs 2mm opening pattern showing leg detail clearly. Black leather heels, tall height 4-inch, ankle strap hanging loose.',
    scenario: 'Standing at Tootsie\'s bar centerpoint, direct confident sultry gaze, surrounded by crowd energy. Late-night peak energy. Maximum confidence and presence. Candid moment showing zenith of nightlife engagement.',
    hair: 'Wild and extensively tousled. Maximum volume and movement. Strands across face, shoulders, some adhering to neck from light perspiration. Lived-in glamorous appearance suggesting hours of activity.',
    neonDetails: 'Multiple neon sources creating rich color complexity. Purple and other colored light mixing. Stage lights bokeh creating colorful background. Crowd visible behind. Venues patina and wear fully visible. Fine fishnet pattern showing leg detail clearly.'
  },

  {
    num: 11,
    venue: "Tootsie's Orchid Lounge",
    venueCode: 'T',
    timeProgression: 'late',
    time: '2:30am',
    attireLevel: 'moderate',
    neckline: 'boat neck',
    hemline: 'mid-thigh',
    hosiery: 'Sheer black 12-denier Cuban heel, 2-inch band visible where hem ends',
    color: 'Terracotta orange',
    fabric: 'crushed velvet',
    attireDesc: 'Terracotta orange crushed velvet mini, boat neckline showing collarbones, short sleeves, mid-thigh hem. Fabric showing deep wear compression patterns. Sheer black 12-denier Cuban heel thigh-highs. Black suede booties, 2-inch stacked heel, worn appearance from extended night.',
    scenario: 'Leaning on bar with elbow support, direct eye contact showing late-night fatigue mixed with confidence. Holding empty glass. Disheveled from extended evening. Last call energy.',
    hair: 'Significantly disheveled from 5+ hours. Originally styled hair now wild, volume maximum. Strands everywhere showing significant disorder. Lived-in texture suggesting extended engagement.',
    neonDetails: 'Tootsie\'s purple neon against terracotta creating warm-cool contrast. Stage lights fading as venue approaches closing. Tired aesthetic beginning to emerge. Worn patina throughout venue visible.'
  },

  {
    num: 12,
    venue: "Tootsie's Orchid Lounge",
    venueCode: 'T',
    timeProgression: 'late',
    time: '2:45am',
    attireLevel: 'conservative',
    neckline: 'high neckline turtleneck',
    hemline: 'mid-thigh',
    hosiery: 'Sheer black 12-denier with lace top, 3-inch band visible where hem ends',
    color: 'Navy blue',
    fabric: 'knit bodycon',
    attireDesc: 'Navy blue knit bodycon mini dress, high turtleneck, long sleeves, mid-thigh hem. Fitted silhouette showing body contours. Sheer black 12-denier thigh-highs with 3-inch lace top band. Black suede booties, worn appearance.',
    scenario: 'Sitting at Tootsie\'s bar last call, direct eye contact showing vulnerability and late-night truth. Jacket draped around shoulders from venue chill. Moment of quiet confidence. Candid final evening capture.',
    hair: 'Completely disheveled maximum, strands throughout. Originally styled hair now wild from 5+ hours wear. Volume maximum showing extended activity. Tired glamorous appearance.',
    neonDetails: 'Purple neon muted by late hour. Venue lighting dimming toward close. Last-call aesthetic. Tired patina fully emerged. Background showing fewer crowd members. Final evening hours aesthetic.'
  },

  // ROBERT'S WESTERN WORLD CONCEPTS (4-13, numbered 13-22)
  // Concepts 4-7: Conservative baseline @ Robert's (early-peak evening)
  {
    num: 13,
    venue: "Robert's Western World",
    venueCode: 'R',
    timeProgression: 'early',
    time: '10:30pm',
    attireLevel: 'conservative',
    neckline: 'high neckline snap',
    hemline: 'mid-thigh',
    hosiery: 'Sheer black 12-denier thigh-highs, 2.5-inch lace band visible where hem ends',
    color: 'Cream/ivory',
    fabric: 'satin crepe',
    attireDesc: 'Cream satin crepe bodycon mini, high snap-button neckline, long sleeves, mid-thigh hem. Luxe fabric showing subtle sheen. Sheer black 12-denier thigh-highs with lace band. Tan suede cowboy boots, traditional style.',
    scenario: 'Standing near Robert\'s record shop entrance, direct confident eye contact. Early evening energy showing venue appreciation. Positioned at authentic honky-tonk entrance.',
    hair: 'Styled waves with volume. Partially clipped back showing face. Maintained professional styling. Early-evening freshness evident.',
    neonDetails: 'Robert\'s red neon sign 2700K warm glow. Record shop lighting warm amber. Dance floor wooden patina visible. Early-evening atmosphere with crisp lighting clarity.'
  },

  {
    num: 14,
    venue: "Robert's Western World",
    venueCode: 'R',
    timeProgression: 'early',
    time: '11:00pm',
    attireLevel: 'conservative',
    neckline: 'modest V-neck',
    hemline: 'mid-thigh',
    hosiery: 'Sheer black 11-denier thigh-highs, 2-inch band visible where hem ends',
    color: 'Steel gray',
    fabric: 'stretch velvet',
    attireDesc: 'Steel gray stretch velvet bodycon mini, modest V-neckline, short sleeves, mid-thigh hem. Form-fitting. Sheer black 11-denier thigh-highs. Black leather boots, traditional Western style, 1.5-inch heel.',
    scenario: 'Standing on Robert\'s wooden dance floor, direct eye contact showing confidence. Band playing behind. Early-evening established. Authentic honky-tonk venue candid.',
    hair: 'Styled in loose updo with face-framing pieces. Professional grooming evident. Some natural movement texture. Balanced styled appearance.',
    neonDetails: 'Robert\'s red neon creating warm color cast. Wooden floor showing authentic wear. Stage lights beginning to cycle. Dance floor empty early evening becoming populated.'
  },

  {
    num: 15,
    venue: "Robert's Western World",
    venueCode: 'R',
    timeProgression: 'peak',
    time: '12:15am',
    attireLevel: 'moderate',
    neckline: 'scooped neckline',
    hemline: 'upper-thigh',
    hosiery: 'Fishnet thigh-highs diamond pattern, 2.5-inch band visible where hem ends',
    color: 'Wine red',
    fabric: 'stretch satin',
    attireDesc: 'Wine red stretch satin mini dress, scooped neckline, sleeveless, upper-thigh hemline. Tight silhouette. Fishnet thigh-highs with diamond pattern. Black leather boots, 2-inch heel, worn authentic appearance.',
    scenario: 'Leaning against Robert\'s stage wall, hair disheveled from dancing, direct sultry eye contact. Mid-night energy fully established. Candid moment between dances.',
    hair: 'Significantly disheveled from 1+ hour dancing. Ponytail loosened with escape strands. Tousled waves showing active movement. Lived-in texture.',
    neonDetails: 'Robert\'s red neon against wine red creating deep warm cast. Wooden stage showing authentic patina. Stage lights showing red/blue bokeh. Crowd visible background. Hosiery diamond pattern showing under light.'
  },

  {
    num: 16,
    venue: "Robert's Western World",
    venueCode: 'R',
    timeProgression: 'peak',
    time: '1:00am',
    attireLevel: 'moderate',
    neckline: 'off-shoulder',
    hemline: 'upper-thigh with fringe',
    hosiery: 'Sheer nude 10-denier thigh-highs, Cuban heel, 2-inch band visible where hem ends',
    color: 'Black',
    fabric: 'denim with fringe',
    attireDesc: 'Black stretch denim mini dress with fringe detail, off-shoulder neckline, sleeveless, upper-thigh hemline with fringe trim. Western aesthetic. Sheer nude 10-denier Cuban heel thigh-highs. Black suede cowboy boots, 1.5-inch stacked heel.',
    scenario: 'Standing on Robert\'s dance floor mid-crowd, direct confident sultry gaze. Dancing energy evident. Authentic Western honky-tonk aesthetic. Candid movement moment.',
    hair: 'Loose waves with some gathered strands. Tousled from dancing with maintained volume. Mix of styled and movement texture. Dynamic appearance.',
    neonDetails: 'Robert\'s red neon and stage lights creating bokeh. Wooden floor showing dynamic lighting. Crowd visible background. Denim fringe catching light. Authentic honky-tonk venue aesthetic.'
  },

  {
    num: 17,
    venue: "Robert's Western World",
    venueCode: 'R',
    timeProgression: 'peak',
    time: '1:30am',
    attireLevel: 'maximum',
    neckline: 'deep V plunging',
    hemline: 'upper-thigh',
    hosiery: 'Ultra-sheer black 8-denier thigh-highs, 2.5-inch reinforced band visible where hem ends',
    color: 'Ruby red',
    fabric: 'silk charmeuse',
    attireDesc: 'Ruby red silk charmeuse mini dress, deep V-neckline extending to lower chest, sleeveless, upper-thigh hemline. Luxe fabric with significant sheen. Ultra-sheer black 8-denier thigh-highs with reinforced band. Red suede heels, 3.5-inch height, contemporary style.',
    scenario: 'Leaning against Robert\'s bar counter, direct intense sultry eye contact. Holding drink, maximum confidence and presence. Peak-night energy fully realized. Candid intimate moment.',
    hair: 'Wild tousled waves from extended dancing. Maximum volume and movement. Strands across face and shoulders. Lived-in glamorous dishevelment.',
    neonDetails: 'Robert\'s red neon matching outfit creating cohesive warm aesthetic. Stage lights bokeh creating colorful background. Bar showing authentic wear. Crowd visible background. Deep neckline showing skin detail under venue lighting.'
  },

  {
    num: 18,
    venue: "Robert's Western World",
    venueCode: 'R',
    timeProgression: 'peak',
    time: '2:00am',
    attireLevel: 'maximum',
    neckline: 'wrap neckline loosened',
    hemline: 'upper-thigh',
    hosiery: 'Fine fishnet thigh-highs, 1.5mm pattern, 2-inch band visible where hem ends',
    color: 'Bordeaux',
    fabric: 'silk wrap',
    attireDesc: 'Bordeaux silk wrap mini dress, wrap neckline loosened from wear, 3/4 sleeves, upper-thigh hemline bunched asymmetrically from dancing. Ultra-sheer silk construction. Fine fishnet thigh-highs with fine 1.5mm pattern. Black suede boots, tall 4-inch height.',
    scenario: 'Captured mid-dance movement at Robert\'s floor, hair swinging with motion, direct sultry gaze toward camera. Maximum movement and energy. Authentic honky-tonk dancing moment.',
    hair: 'Extensively wild tousled from 2+ hours dancing. Maximum volume showing movement. Strands everywhere from active engagement. Live-in glamorous disorder.',
    neonDetails: 'Robert\'s red neon with stage lights creating bokeh. Wooden floor showing dynamic wear. Crowd motion visible background. Fine fishnet pattern showing leg detail clearly. Movement-induced lighting effects.'
  },

  {
    num: 19,
    venue: "Robert's Western World",
    venueCode: 'R',
    timeProgression: 'late',
    time: '2:30am',
    attireLevel: 'moderate',
    neckline: 'conservative crew neck',
    hemline: 'mid-thigh',
    hosiery: 'Sheer black 12-denier Cuban heel, 2-inch band visible where hem ends',
    color: 'Teal blue',
    fabric: 'stretch crepe',
    attireDesc: 'Teal blue stretch crepe mini dress, crew neckline, short sleeves, mid-thigh hem. Luxe fabric showing wear. Sheer black 12-denier Cuban heel thigh-highs. Black suede booties, 2-inch heel.',
    scenario: 'Leaning on Robert\'s bar near record shop, direct eye contact showing late-night fatigue with confidence. Last-call energy building. Worn appearance from extended evening.',
    hair: 'Extensively disheveled from 4+ hours activity. Originally styled hair now wild with maximum volume. Strands throughout showing disorder. Tired glamorous texture.',
    neonDetails: 'Robert\'s red neon muted by late hour. Venue lights dimming toward closing. Record shop visible background. Worn patina on all surfaces. Last-call aesthetic emerging.'
  },

  {
    num: 20,
    venue: "Robert's Western World",
    venueCode: 'R',
    timeProgression: 'late',
    time: '2:45am',
    attireLevel: 'conservative',
    neckline: 'simple crew neck',
    hemline: 'mid-thigh',
    hosiery: 'Sheer black 12-denier thigh-highs, 3-inch lace band visible where hem ends',
    color: 'Charcoal',
    fabric: 'knit bodycon',
    attireDesc: 'Charcoal knit bodycon mini dress, crew neckline, long sleeves, mid-thigh hem. Fitted silhouette. Sheer black 12-denier thigh-highs with 3-inch lace band. Black leather boots, worn appearance.',
    scenario: 'Sitting at Robert\'s bar stool, direct eye contact showing final-hour awareness. Jacket draped around shoulders from venue cool. Quiet confidence moment. Last moments candid capture.',
    hair: 'Completely disheveled maximum disorder. Wild strands throughout. Originally styled hair now completely tousled from 5+ hours wear. Maximum lived-in texture.',
    neonDetails: 'Robert\'s red neon very muted near closing. Minimal venue lighting. Tired aesthetic fully emerged. Fewer crowd members visible. Final-hour closing atmosphere.'
  },

  {
    num: 21,
    venue: "Robert's Western World",
    venueCode: 'R',
    timeProgression: 'late',
    time: '2:55am',
    attireLevel: 'moderate',
    neckline: 'V-neck wrap style',
    hemline: 'upper-thigh',
    hosiery: 'Sheer nude 10-denier thigh-highs, 2-inch band visible where hem ends',
    color: 'Cognac brown',
    fabric: 'leather mini',
    attireDesc: 'Cognac brown stretch leather mini dress, V-neck wrap style, 3/4 sleeves, upper-thigh hemline. Supple leather showing wear. Sheer nude 10-denier thigh-highs. Tan suede boots, tall 3-inch height.',
    scenario: 'Final moment at Robert\'s bar, direct eye contact showing late-night intimacy. Jacket on but loose. Last-call whiskey glass. Authentic final-hour moment.',
    hair: 'Extensively disheveled completely wild. Maximum tousling from entire evening of activity. Strands everywhere showing significant disorder. Completely lived-in final-hour appearance.',
    neonDetails: 'Robert\'s neon muted to minimum. Closing-time aesthetic. Venue showing full wear patina. Few lights remaining. Last-hour closing atmosphere established. Leather showing subtle sheen under minimal lighting.'
  },

  {
    num: 22,
    venue: "Robert's Western World",
    venueCode: 'R',
    timeProgression: 'late',
    time: '3:00am',
    attireLevel: 'conservative',
    neckline: 'modest scoop neck',
    hemline: 'mid-thigh',
    hosiery: 'Sheer black 12-denier thigh-highs, 2.5-inch lace band visible where hem ends',
    color: 'Gunmetal',
    fabric: 'crepe bodycon',
    attireDesc: 'Gunmetal crepe bodycon mini dress, modest scoop neckline, long sleeves, mid-thigh hem. Luxe fabric showing wrinkles from wear. Sheer black 12-denier thigh-highs with lace band. Black leather boots, minimal heel, comfort-focused.',
    scenario: 'Final Robert\'s moment, seated showing exhaustion mixed with satisfaction. Direct eye contact showing honest fatigue. Closing-time candid. Authentic final-hour capture.',
    hair: 'Maximum completely wild dishevelment from entire 5+ hour evening. Strands throughout chaotic arrangement. Utterly tousled from extended activity. Exhausted glamorous final-hour texture.',
    neonDetails: 'Venue essentially dark at 3am closing. Minimal red neon glow. Worn patina fully visible. Tired aesthetic completely established. Final moment aesthetic before closing.'
  },

  // ACME FEED & SEED CONCEPTS (5 concepts, numbered 23-27)
  // All at Acme rooftop sophistication

  {
    num: 23,
    venue: 'Acme Feed & Seed rooftop bar',
    venueCode: 'A',
    timeProgression: 'peak',
    time: '1:45am',
    attireLevel: 'moderate',
    neckline: 'modest V-neck',
    hemline: 'upper-thigh',
    hosiery: 'Sheer nude 10-denier thigh-highs, Cuban heel, 2-inch band visible where hem ends',
    color: 'Rose gold metallic',
    fabric: 'stretch lamé',
    attireDesc: 'Rose gold stretch lamé bodycon mini dress, modest V-neckline, sleeveless, upper-thigh hemline. Shimmering metallic finish. Sheer nude 10-denier Cuban heel thigh-highs. Gold heels, strappy design, 3.5-inch height.',
    scenario: 'Standing at Acme rooftop railing, mechanical bull visible background (not riding, context). Direct sultry eye contact. Broadway lights visible far background. Upscale honky-tonk aesthetic.',
    hair: 'Loose waves with some gathered sections. Styled with maintained volume. Minimal disorder from dancing. Glamorous maintained appearance.',
    neonDetails: 'Rooftop ambient warm lighting 3000K. Broadway lights bokeh background. Mechanical bull context creating narrative interest. Upscale bar aesthetic. Metallic fabric reflecting multiple light sources.'
  },

  {
    num: 24,
    venue: 'Acme Feed & Seed rooftop bar',
    venueCode: 'A',
    timeProgression: 'peak',
    time: '2:15am',
    attireLevel: 'moderate',
    neckline: 'off-shoulder',
    hemline: 'upper-thigh',
    hosiery: 'Fishnet thigh-highs, diamond pattern, 2.5-inch band visible where hem ends',
    color: 'Silver',
    fabric: 'stretch satin',
    attireDesc: 'Silver stretch satin mini dress, off-shoulder neckline, short sleeves, upper-thigh hemline. Form-fitting silhouette. Fishnet thigh-highs diamond pattern. Silver heels, contemporary design, 3.5-inch height.',
    scenario: 'Leaning against Acme rooftop railing, holding cocktail, direct sultry eye contact. Mechanical bull silhouette background. Broadway lights creating backdrop. Upscale late-night energy.',
    hair: 'Partially down waves with gathered sections. Tousled from earlier dancing. Mix of styled and movement texture. Dynamic glamorous appearance.',
    neonDetails: 'Rooftop lights creating upscale ambient. Broadway lights bokeh background. Mechanical bull visible background. Cocktail catching light. Silver fabric reflecting multiple light sources. Upscale venue aesthetic.'
  },

  {
    num: 25,
    venue: 'Acme Feed & Seed rooftop bar',
    venueCode: 'A',
    timeProgression: 'peak',
    time: '2:30am',
    attireLevel: 'maximum',
    neckline: 'deep V wrap style',
    hemline: 'upper-thigh',
    hosiery: 'Ultra-sheer black 8-denier thigh-highs, 2.5-inch reinforced band visible where hem ends',
    color: 'Plum',
    fabric: 'silk wrap',
    attireDesc: 'Plum silk wrap mini dress, deep V-neckline extending to lower chest, wrap waist loosened from wear, 3/4 sleeves, upper-thigh hemline bunched asymmetrically. Ultra-sheer black 8-denier thigh-highs. Black platform heels, 4-inch height, ankle straps loose.',
    scenario: 'Seated at Acme rooftop bar, leaning back confident, direct intense sultry eye contact. Holding whiskey glass. Mechanical bull background. Maximum confidence and presence.',
    hair: 'Wild tousled from 3+ hours activity. Maximum volume showing extensive movement. Strands across shoulders and face. Lived-in glamorous dishevelment.',
    neonDetails: 'Rooftop ambiance with Broadway lights creating bokeh. Mechanical bull visible background adding context. Whiskey glass catching light. Deep neckline showing skin detail. Upscale honky-tonk venue established.'
  },

  {
    num: 26,
    venue: 'Acme Feed & Seed rooftop bar',
    venueCode: 'A',
    timeProgression: 'late',
    time: '2:50am',
    attireLevel: 'maximum',
    neckline: 'asymmetrical plunging',
    hemline: 'upper-thigh',
    hosiery: 'Fine fishnet thigh-highs, 1.5mm pattern, 2-inch band visible where hem ends',
    color: 'Black',
    fabric: 'stretch velvet',
    attireDesc: 'Black stretch velvet mini dress, asymmetrical plunging neckline, sleeveless, upper-thigh hemline. Form-fitting silhouette. Fine fishnet thigh-highs 1.5mm pattern. Black suede boots, tall 4-inch height, minimalist design.',
    scenario: 'Standing at Acme rooftop edge, direct confident sultry gaze. Mechanical bull background. Broadway night city skyline. Final-hour upscale honky-tonk energy. Last-call presence.',
    hair: 'Extensively wild tousled from entire evening. Maximum chaos showing extended activity. Strands everywhere from significant movement. Exhausted glamorous appearance.',
    neonDetails: 'Rooftop lights with Broadway lights background. Mechanical bull silhouette. Cool night air atmosphere. Fine fishnet pattern showing leg detail. Asymmetrical neckline creating depth and shadow. Last-hour aesthetic.'
  },

  {
    num: 27,
    venue: 'Acme Feed & Seed rooftop bar',
    venueCode: 'A',
    timeProgression: 'late',
    time: '3:00am',
    attireLevel: 'conservative',
    neckline: 'high crew neck',
    hemline: 'mid-thigh',
    hosiery: 'Sheer black 12-denier thigh-highs, 3-inch lace band visible where hem ends',
    color: 'Charcoal',
    fabric: 'knit bodycon',
    attireDesc: 'Charcoal knit bodycon mini dress, high crew neckline, long sleeves, mid-thigh hem. Fitted silhouette. Sheer black 12-denier thigh-highs with 3-inch lace band. Black suede booties, 2-inch stacked heel.',
    scenario: 'Final moment at Acme rooftop, seated showing peaceful satisfaction. Jacket around shoulders from cool air. Direct honest eye contact. Closing-time genuine moment. Authentic final-hour capture.',
    hair: 'Completely wild disheveled chaos from 5+ hour evening. Maximum tousling throughout. Strands chaotic arrangement. Utterly tired glamorous appearance.',
    neonDetails: 'Rooftop minimal lighting near 3am closing. Broadway lights muted distance. Cool night atmosphere fully established. Mechanical bull silhouette background. Final-hour closing aesthetic established.'
  }
];

function buildPrompt(concept) {
  return `**Composition:** Subject fills 84-86% of frame using rule of thirds - face on upper-right intersection, eyes locked directly on lens. ${concept.scenario}. Background 14-16% compressed by f/1.4 showing defocused venue elements, bokeh, lights. Direct unwavering sultry eye contact.

${physicsShield}

**Scene context:** Woman at ${concept.venue} at ${concept.time} Saturday night. Body language showing late-night relaxation. Eyes locked on camera with sultry gaze - heavy-lidded from long evening, knowing smile, completely unguarded. Real moment of late-night Nashville honky-tonk connection.

**Attire construction:** ${concept.attireDesc}

**Hair styling, late-night disorder:** ${concept.hair}

**Venue-specific neon and light physics:** ${concept.neonDetails}

**Hosiery construction detail:** ${concept.hosiery} nylon construction, silicone grip strip, matte finish with subtle sheen.

**Real-life imperfection anchors:** Venue-specific neon creating color casts, background bokeh patterns, authentic wear on all materials, hair disheveled from extended evening and dancing, heavy makeup breakdown, extreme ISO grain throughout establishing handheld night photography aesthetic, JPEG artifacts in shadows, chromatic aberration on edges, dramatic corner vignetting.

Size: 4K, Aspect Ratio: 1:1`;
}

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('NASHVILLE HONKY-TONK PHASE 2 - FULL PRODUCTION');
  console.log('Generating 27 Production Concepts');
  console.log('='.repeat(80));
  console.log('\nVenue Distribution:');
  console.log(`  Tootsie's Orchid Lounge: 9 concepts (01-09)`);
  console.log(`  Robert's Western World: 10 concepts (13-22)`);
  console.log(`  Acme Feed & Seed: 5 concepts (23-27)`);
  console.log('\nAttire Variation:');
  console.log(`  Conservative: 10 concepts (crew neck, mid-thigh, 12-denier)`);
  console.log(`  Moderate: 12 concepts (scoop/V-neck, upper-thigh, 10-denier)`);
  console.log(`  Maximum: 5 concepts (deep V/wrap, shortest, 8-denier)`);
  console.log('\nTime Progression:');
  console.log(`  Early (10pm-12am): 8 concepts - Fresher styling`);
  console.log(`  Peak (12am-2am): 12 concepts - Moderate wear`);
  console.log(`  Late (2am-3am): 7 concepts - Maximum dishevelment`);
  console.log('\nEstimated Time: ~2.25 hours (5 min per concept)');
  console.log('Output: ' + OUTPUT_DIR);
  console.log('='.repeat(80) + '\n');

  const results = [];
  let successCount = 0;
  let blockCount = 0;
  const batchStart = Date.now();

  for (let i = 0; i < productionConcepts.length; i++) {
    const concept = productionConcepts[i];
    const conceptStart = Date.now();
    const progressNum = i + 1;
    const totalNum = productionConcepts.length;

    console.log(`\n[${progressNum}/${totalNum}] Concept ${concept.num} - ${concept.venue}`);
    console.log(`  ${concept.neckline} | ${concept.hemline} | ${concept.time}`);
    console.log(`  Attire: ${concept.color} ${concept.fabric}`);
    console.log('  Generating...');

    try {
      const prompt = buildPrompt(concept);
      const response = await generateImage({
        prompt: prompt,
        aspectRatio: '1:1',
        imageSize: '4K',
      });

      if (response.predictions && response.predictions[0]) {
        const imageData = response.predictions[0];
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `NASHVILLE-${concept.num}-${concept.venueCode}-${concept.time.replace(/:/g, '')}.jpeg`;
        const filepath = path.join(OUTPUT_DIR, filename);

        if (imageData.bytesBase64Encoded) {
          await fs.writeFile(filepath, Buffer.from(imageData.bytesBase64Encoded, 'base64'));
        }

        successCount++;
        const duration = ((Date.now() - conceptStart) / 1000).toFixed(1);
        console.log(`  ✅ SUCCESS (${duration}s) → ${filename}`);
        results.push({
          conceptNum: concept.num,
          venue: concept.venue,
          status: 'SUCCESS',
          duration: duration,
          color: concept.color,
          neckline: concept.neckline,
          hemline: concept.hemline,
          time: concept.time
        });

      } else {
        blockCount++;
        console.log('  ❌ BLOCKED - No image data');
        results.push({
          conceptNum: concept.num,
          venue: concept.venue,
          status: 'BLOCKED',
          reason: 'No image data',
          color: concept.color,
          neckline: concept.neckline
        });
      }

    } catch (error) {
      blockCount++;
      const duration = ((Date.now() - conceptStart) / 1000).toFixed(1);
      console.log(`  ❌ BLOCKED (${duration}s) - ${error.message.substring(0, 60)}`);
      results.push({
        conceptNum: concept.num,
        venue: concept.venue,
        status: 'BLOCKED',
        duration: duration,
        error: error.message.substring(0, 100),
        color: concept.color
      });
    }

    // Rate limiting
    if (i < productionConcepts.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  // Results summary
  const batchDuration = ((Date.now() - batchStart) / 1000 / 60).toFixed(1);
  const summary = {
    timestamp: new Date().toISOString(),
    phase: 'PHASE 2 - PRODUCTION',
    totalConcepts: productionConcepts.length,
    successCount: successCount,
    blockCount: blockCount,
    successRate: ((successCount / productionConcepts.length) * 100).toFixed(1) + '%',
    batchDurationMinutes: batchDuration,
    results: results,
    recommendation: successCount >= 23 ? 'EXCEPTIONAL SUCCESS' : successCount >= 20 ? 'GOOD RESULTS' : 'MODERATE SUCCESS',
    nextSteps: 'Quality review, compile final 30-concept collection'
  };

  const summaryPath = path.join(OUTPUT_DIR, 'PHASE2-RESULTS.json');
  await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));

  console.log('\n' + '='.repeat(80));
  console.log('PHASE 2 RESULTS SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total Concepts Generated: ${summary.totalConcepts}`);
  console.log(`Successful: ${successCount} ✅`);
  console.log(`Blocked: ${blockCount} ❌`);
  console.log(`Success Rate: ${summary.successRate}`);
  console.log(`Duration: ${batchDuration} minutes`);
  console.log(`Recommendation: ${summary.recommendation}`);
  console.log(`\nVenue Breakdown:`);

  const tootsieResults = results.filter(r => r.venue && r.venue.includes("Tootsie"));
  const robertsResults = results.filter(r => r.venue && r.venue.includes("Robert"));
  const acmeResults = results.filter(r => r.venue && r.venue.includes("Acme"));

  console.log(`  Tootsie's: ${tootsieResults.filter(r => r.status === 'SUCCESS').length}/${tootsieResults.length}`);
  console.log(`  Robert's: ${robertsResults.filter(r => r.status === 'SUCCESS').length}/${robertsResults.length}`);
  console.log(`  Acme: ${acmeResults.filter(r => r.status === 'SUCCESS').length}/${acmeResults.length}`);
  console.log(`\nResults saved: ${summaryPath}`);
  console.log('='.repeat(80) + '\n');

  process.exit(successCount >= 20 ? 0 : 1);
}

main().catch(error => {
  console.error('\nFATAL ERROR:', error);
  process.exit(1);
});

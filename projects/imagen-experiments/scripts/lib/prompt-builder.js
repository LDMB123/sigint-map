/**
 * Prompt Template Builder for Imagen Generation
 * Consolidates dive-bar concepts into template + data system
 *
 * Reduces 156K tokens of prompts to ~15K tokens (90% reduction)
 */

const BASE_PHOTOGRAPHY = {
  cameras: {
    canon_r5: { name: 'Canon EOS R5', lens: 'Canon RF 50mm f/1.2L USM' },
    canon_r6: { name: 'Canon EOS R6 Mark II', lens: 'Sigma 50mm f/1.4 DG DN Art' },
    nikon_z6: { name: 'Nikon Z6 III', lens: 'Nikkor Z 85mm f/1.2 S' },
    nikon_z8: { name: 'Nikon Z8', lens: 'Nikkor Z 50mm f/1.2 S' },
    sony_a7iv: { name: 'Sony A7 IV', lens: 'Sony FE 35mm f/1.4 GM' },
    sony_a7rv: { name: 'Sony A7R V', lens: 'Sony FE 50mm f/1.2 GM' },
    fuji_xt5: { name: 'Fujifilm X-T5', lens: 'Fujinon XF 56mm f/1.2 R WR' },
    leica_sl2s: { name: 'Leica SL2-S', lens: 'Leica Summilux-SL 50mm f/1.4 ASPH' }
  },
  settings: {
    aperture: 'f/1.4',
    isoRange: [3200, 6400],
    shutterRange: ['1/60s', '1/125s'],
    whiteBalance: '3500K-4500K (warm)',
    exposure: 'underexposed by one stop'
  }
};

const BASE_STYLE = {
  mood: 'authentic dive bar atmosphere, candid portrait',
  composition: 'subject fills 70-78% of frame',
  focus: 'razor thin depth of field, near eye tack sharp',
  lighting: 'neon signs, Edison bulbs, stage lighting, Christmas lights',
  background: 'bokeh blur of bar elements, patrons, bottles',
  grain: 'visible film-like grain from high ISO',
  vignette: 'natural vignetting darkens frame edges',
  aberration: 'slight chromatic aberration on bright edges'
};

const VENUES = {
  austin: [
    { name: "Ego's Lounge", location: "South Congress" },
    { name: "Hole in the Wall", location: "Guadalupe Street" },
    { name: "Nickel City", location: "East Cesar Chavez" },
    { name: "Carousel Lounge", location: "East Riverside" },
    { name: "Mean-Eyed Cat", location: "West Fifth Street" },
    { name: "Ginny's Little Longhorn Saloon", location: "Burnet Road" },
    { name: "Deep Eddy Cabaret", location: "Lake Austin Boulevard" },
    { name: "The White Horse", location: "East Sixth Street" },
    { name: "Broken Spoke", location: "South Lamar" },
    { name: "Continental Club", location: "South Congress" }
  ]
};

const ATTIRE_TEMPLATES = {
  leather: (color) => `${color} leather mini dress`,
  velvet: (color) => `${color} crushed velvet mini dress with deep V-neckline`,
  satin: (color) => `${color} satin mini dress`,
  sequin: (color) => `${color} sequined mini dress`,
  wrap: (color) => `${color} wrap mini dress tied at waist`,
  knit: (color) => `${color} ribbed knit mini dress with turtleneck`,
  metallic: (color) => `${color} metallic lamé mini dress with halter neckline`,
  eyelet: (color) => `${color} cotton eyelet mini dress with puff sleeves`
};

const LEGWEAR_TYPES = {
  bare: 'bare legs',
  sheerThighHigh: 'black sheer thigh-high stockings with lace tops',
  opaqueThighHigh: 'black opaque thigh-high stockings',
  fishnetThighHigh: 'nude fishnet thigh-high stockings',
  kneeHighBoots: (color) => `${color} suede knee-high boots`
};

const HAIR_STYLES = {
  straight: 'straight, parted in the middle, falling past shoulders',
  wildWaves: 'wildly tousled waves going in competing directions',
  sleek: 'sleek and swept over one shoulder',
  halfUpMessy: 'half-up bun falling apart, loose tendrils everywhere',
  longWaves: 'long loose waves, one side tucked behind ear',
  windblown: 'windblown and tangled, pushed back from face',
  bluntBob: 'straight blunt bob cut at chin length',
  longStraight: 'very long and straight, center-parted, falling like curtains'
};

/**
 * Build a complete dive-bar portrait prompt
 * @param {Object} concept - Concept parameters
 * @returns {string} Complete generation prompt
 */
function buildDiveBarPrompt(concept) {
  const {
    venue,
    dress,
    legwear,
    hair,
    pose,
    expression,
    lighting,
    camera = 'canon_r5',
    details = ''
  } = concept;

  const cam = BASE_PHOTOGRAPHY.cameras[camera] || BASE_PHOTOGRAPHY.cameras.canon_r5;
  const iso = BASE_PHOTOGRAPHY.settings.isoRange[Math.floor(Math.random() * 2)];

  return `Photorealistic candid portrait of a woman in her late 20s inside ${venue.name} on ${venue.location} in Austin, Texas.

${pose}

She wears ${dress}. ${legwear}. ${hair}.

She fills approximately 75% of the frame. ${expression}

${lighting}

Shot on a ${cam.name} with a ${cam.lens} at ${BASE_PHOTOGRAPHY.settings.aperture}. ISO ${iso}, shutter speed 1/80s. White balance set warm at approximately 4000K. ${BASE_PHOTOGRAPHY.settings.exposure}. ${BASE_STYLE.grain} ${BASE_STYLE.vignette} ${BASE_STYLE.aberration}

Eyes placed on the upper-right rule of thirds intersection. ${details}

The composition feels like a snapshot taken by a friend who borrowed an expensive camera for the night.`;
}

/**
 * Build batch of prompts from concepts array
 * @param {Array} concepts - Array of concept objects
 * @returns {Array} Array of {id, prompt, metadata} objects
 */
function buildBatch(concepts) {
  return concepts.map((concept, index) => ({
    id: index + 1,
    prompt: buildDiveBarPrompt(concept),
    metadata: {
      venue: concept.venue.name,
      dress: concept.dress,
      hair: concept.hair
    }
  }));
}

/**
 * Get a random venue from the list
 * @param {string} city - City name (default: 'austin')
 * @returns {Object} Venue object with name and location
 */
function getRandomVenue(city = 'austin') {
  const venues = VENUES[city] || VENUES.austin;
  return venues[Math.floor(Math.random() * venues.length)];
}

export {
  buildDiveBarPrompt,
  buildBatch,
  getRandomVenue,
  BASE_PHOTOGRAPHY,
  BASE_STYLE,
  VENUES,
  ATTIRE_TEMPLATES,
  LEGWEAR_TYPES,
  HAIR_STYLES
};

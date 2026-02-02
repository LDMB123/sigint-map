/**
 * Grounding module for Imagen prompt enrichment.
 * Uses wttr.in (weather) and Nominatim (geocoding) - both free, no API keys.
 */

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const WTTR_URL = 'https://wttr.in';
const USER_AGENT = 'ImagenGrounding/1.0';

async function geocode(query) {
  const url = `${NOMINATIM_URL}?q=${encodeURIComponent(query)}&format=json&limit=1`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  const results = await res.json();
  if (!results.length) return null;
  return { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) };
}

async function getWeather(lat, lng) {
  const url = `${WTTR_URL}/${lat},${lng}?format=j1`;
  const res = await fetch(url, { headers: { 'User-Agent': 'curl' } });
  const data = await res.json();
  const current = data.current_condition?.[0] || {};
  const astro = data.weather?.[0]?.astronomy?.[0] || {};
  return {
    temp_f: current.temp_F || '?',
    condition: current.weatherDesc?.[0]?.value || 'clear',
    humidity: current.humidity || '?',
    wind_mph: current.windspeedMiles || '0',
    wind_dir: current.winddir16Point || '',
    sunrise: astro.sunrise || '',
    sunset: astro.sunset || ''
  };
}

function classifyLighting(hour) {
  if (hour >= 5 && hour < 7) return 'pre-dawn to sunrise, soft blue-pink light';
  if (hour >= 7 && hour < 10) return 'morning golden light, long shadows';
  if (hour >= 10 && hour < 14) return 'midday overhead sun, short harsh shadows';
  if (hour >= 14 && hour < 17) return 'afternoon warm directional light';
  if (hour >= 17 && hour < 19) return 'golden hour, warm orange-pink glow';
  if (hour >= 19 && hour < 21) return 'blue hour dusk, fading twilight';
  return 'nighttime, neon and artificial lighting';
}

function describeWind(mph, dir) {
  const val = parseInt(mph) || 0;
  if (val < 5) return 'still air';
  if (val < 15) return `gentle ${dir} breeze`;
  if (val < 25) return `moderate ${dir} wind`;
  return `strong ${dir} wind`;
}

/**
 * Get complete grounding context for a venue/location.
 *
 * @param {Object} opts
 * @param {string} opts.venue - Venue name
 * @param {string} opts.city - City
 * @param {string} [opts.state] - State
 * @param {string} [opts.country='USA'] - Country
 * @param {string} [opts.time] - Time of day (e.g., "1:15am", "sunset", "noon")
 * @returns {Promise<Object>} Grounding context with prompt_fragment
 */
async function getGroundingContext({ venue, city, state = '', country = 'USA', time = null }) {
  // Geocode
  const query = [venue, city, state, country].filter(Boolean).join(', ');
  let coords = await geocode(query);
  if (!coords) {
    // Fallback: geocode just city + state
    const fallback = await geocode([city, state, country].filter(Boolean).join(', '));
    if (!fallback) return { error: `Could not geocode: ${query}`, prompt_fragment: `${venue} in ${city}` };
    coords = fallback;
  }

  // Weather
  let weather;
  try {
    weather = await getWeather(coords.lat, coords.lng);
  } catch {
    weather = { temp_f: '?', condition: 'unknown', humidity: '?', wind_mph: '0', wind_dir: '' };
  }

  // Determine hour
  let hour = new Date().getHours();
  if (time) {
    const t = time.toLowerCase().trim();
    if (t === 'noon') hour = 12;
    else if (t === 'midnight') hour = 0;
    else if (t === 'sunset' || t === 'dusk') hour = 19;
    else if (t === 'sunrise' || t === 'dawn') hour = 6;
    else if (t === 'golden hour') hour = 18;
    else {
      // Parse "1:15am", "10:30 PM", etc.
      const match = t.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)/i);
      if (match) {
        let h = parseInt(match[1]);
        const ampm = match[3].toLowerCase();
        if (ampm === 'pm' && h !== 12) h += 12;
        if (ampm === 'am' && h === 12) h = 0;
        hour = h;
      }
    }
  }

  const lighting = classifyLighting(hour);
  const wind = describeWind(weather.wind_mph, weather.wind_dir);

  const prompt_fragment = [
    `${venue} in ${city}${state ? ', ' + state : ''}`,
    `${weather.temp_f}F ${weather.condition.toLowerCase()}`,
    lighting,
    wind
  ].join(', ');

  return {
    venue: { name: venue, city, state, country },
    coordinates: coords,
    weather,
    lighting: { hour, description: lighting },
    wind: { description: wind },
    prompt_fragment
  };
}

module.exports = { getGroundingContext, geocode, getWeather, classifyLighting, describeWind };

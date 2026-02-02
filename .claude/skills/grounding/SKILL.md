---
name: grounding
description: >
  Location and weather grounding for AI image generation and venue enrichment.
  Uses MCP servers (google-apis, macos-native) to fetch real-world context
  for grounding AI prompts with actual weather, lighting, and location data.
user-invocable: true
---

# Grounding Skill

Fetch real-world location, weather, and lighting data to ground AI outputs.

## Available MCP Tools

### Free (no API key):
- `macos-native` server:
  - `get_weather(location)` - Current weather via wttr.in
  - `get_weather_forecast(location, days)` - Multi-day forecast
  - `weather_grounding_context(location, time_of_day)` - Weather + lighting for AI prompts
  - `geocode_address(address)` - Nominatim geocoding
  - `reverse_geocode(lat, lng)` - Coordinates to address
  - `search_nearby_places(query, lat, lng)` - Nearby POIs

### Google Maps (requires API key):
- `google-apis` server:
  - `maps_geocode(address)` - Google geocoding
  - `maps_nearby_search(location, radius, place_type)` - Google Places
  - `maps_place_details(place_id)` - Detailed place info
  - `venue_grounding_context(venue_name, city, state)` - Venue + nearby for AI
  - `full_grounding_context(venue_name, city, state, time_of_day)` - Complete grounding payload

## Workflows

### Ground an Imagen Prompt
1. Call `full_grounding_context` with venue/location details
2. Use the returned `prompt_fragment` in your Imagen prompt
3. Example: "full_grounding_context('Tootsie's Orchid Lounge', 'Nashville', 'TN', '1:15am')"
4. Returns: `"Tootsie's Orchid Lounge bar in Nashville, TN, 68F clear, nighttime neon lighting, gentle SW breeze"`

### Enrich a DMB Almanac Venue
1. Call `weather_grounding_context` with venue coordinates
2. Call `venue_grounding_context` for nearby landmarks
3. Data feeds into VenueMap and VenueWeather components on venue pages

### Get Current Conditions Anywhere
1. Call `get_weather("Nashville, TN")` for quick weather
2. Call `geocode_address("The Gorge Amphitheatre, George, WA")` for coordinates
3. Combine for grounded context

## Imagen Grounding Module
For scripted Imagen generation, use the Node.js module:
```js
const { getGroundingContext } = require('./lib/grounding');
const ctx = await getGroundingContext({
  venue: "Ryman Auditorium",
  city: "Nashville",
  state: "TN",
  time: "8:30pm"
});
// Use ctx.prompt_fragment in your Imagen prompt
```

## Notes
- wttr.in and Nominatim are free but rate-limited (1 req/sec for Nominatim)
- Google Maps API has $200/month free credit
- Weather data is current/live - ideal for real-time grounding
- Lighting classification is based on hour of day, not actual sun position calculations

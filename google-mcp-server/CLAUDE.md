# Google MCP Server

MCP server exposing Google APIs as tools.

## Project Scope

**This project is ONLY the Google MCP server.** Do not reference any other workspace project.

## Quick Start

```bash
python3 google_apis_server.py
```

Set env vars:
- `GOOGLE_MAPS_API_KEY` — Google Cloud API key with Maps enabled
- `GOOGLE_CSE_ID` — Custom Search Engine ID

## Tools

**Maps tools:**
- `geocode` — address → lat/lng
- `reverse_geocode` — lat/lng → address
- `nearby_search` — find places near a location
- `place_details` — details for a place ID
- `directions` — route between two points
- `distance_matrix` — travel time/distance between multiple origins/destinations

**Search tools:**
- `web_search` — Google web search
- `image_search` — Google image search

## Costs

- Maps: $200/month free credit from Google Cloud
- Search: 100 queries/day free tier

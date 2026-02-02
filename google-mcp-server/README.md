# Google APIs MCP Server for Claude

This MCP server provides Google Maps and Google Custom Search functionality for Claude.

## Available Tools

### Google Maps Tools
| Tool | Description |
|------|-------------|
| `maps_geocode` | Convert address to lat/lng coordinates |
| `maps_reverse_geocode` | Convert coordinates to address |
| `maps_nearby_search` | Find nearby places (restaurants, gas stations, etc.) |
| `maps_place_details` | Get detailed info about a place |
| `maps_directions` | Get directions between locations |
| `maps_distance_matrix` | Calculate travel times between multiple points |

### Google Search Tools
| Tool | Description |
|------|-------------|
| `google_search` | Web search with date/site filters |
| `google_image_search` | Image search with size/type filters |

---

## Setup Instructions

### Step 1: Get Google API Keys (Free Tier)

#### Google Maps API Key
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project (or select existing)
3. Go to **APIs & Services > Library**
4. Enable these APIs:
   - Geocoding API
   - Places API
   - Directions API
   - Distance Matrix API
5. Go to **APIs & Services > Credentials**
6. Click **Create Credentials > API Key**
7. Copy your API key

> **Free tier**: $200/month credit (covers ~28,000 geocoding requests)

#### Google Custom Search API Key
1. In Google Cloud Console, go to **APIs & Services > Library**
2. Search for and enable **Custom Search API**
3. Go to **Credentials** and create another API key (or use the same one)

#### Search Engine ID
1. Go to [Programmable Search Engine](https://programmablesearchengine.google.com/)
2. Click **Add** to create a new search engine
3. Enter `*.com` to search the entire web (or specific sites)
4. Click **Create**
5. Click **Customize** on your new engine
6. Copy the **Search engine ID**

> **Free tier**: 100 queries/day

### Step 2: Configure Your Environment

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your API keys:
   ```
   GOOGLE_MAPS_API_KEY=AIzaSy...
   GOOGLE_CUSTOM_SEARCH_API_KEY=AIzaSy...
   GOOGLE_SEARCH_ENGINE_ID=a1b2c3d4e5...
   ```

### Step 3: Test the Server

Run the server directly to verify it works:
```bash
python3 google_apis_server.py
```

### Step 4: Configure Claude Code

Add to your Claude Code configuration (`.mcp.json` in your project root):

```json
{
  "mcpServers": {
    "google-apis": {
      "command": "python3",
      "args": ["/full/path/to/google_apis_server.py"],
      "env": {
        "GOOGLE_MAPS_API_KEY": "your-maps-api-key",
        "GOOGLE_CUSTOM_SEARCH_API_KEY": "your-search-api-key",
        "GOOGLE_SEARCH_ENGINE_ID": "your-engine-id"
      }
    }
  }
}
```

Or use environment variables:
```json
{
  "mcpServers": {
    "google-apis": {
      "command": "python3",
      "args": ["/full/path/to/google_apis_server.py"],
      "env": {
        "GOOGLE_MAPS_API_KEY": "${GOOGLE_MAPS_API_KEY}",
        "GOOGLE_CUSTOM_SEARCH_API_KEY": "${GOOGLE_CUSTOM_SEARCH_API_KEY}",
        "GOOGLE_SEARCH_ENGINE_ID": "${GOOGLE_SEARCH_ENGINE_ID}"
      }
    }
  }
}
```

---

## Usage Examples

Once configured, you can ask Claude things like:

**Maps:**
- "Find coffee shops near 123 Main St, San Francisco"
- "Get directions from Los Angeles to San Diego"
- "What's the travel time between NYC and Boston?"
- "What restaurants are near the Eiffel Tower?"

**Search:**
- "Search Google for Python FastMCP tutorials"
- "Find images of mountain landscapes"
- "Search stackoverflow.com for async Python examples"

---

## Troubleshooting

### "API key not set" error
Make sure your `.env` file exists and contains valid keys.

### "API not enabled" error
Go to Google Cloud Console and enable the required APIs for your project.

### "Quota exceeded" error
You've hit the free tier limit. Wait for reset or enable billing.

### Server won't start
Check that you have the required packages:
```bash
pip install fastmcp requests python-dotenv
```

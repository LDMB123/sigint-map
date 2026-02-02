# Google & Apple MCP Servers for Claude

Complete integration package for Google and Apple services.

---

## Quick Start - What's FREE vs PAID

| Server | API Keys? | Cost | Best For |
|--------|-----------|------|----------|
| **macos-native** | ❌ None | FREE | Weather, maps, reminders, calendar |
| **google-apis** | ✅ Required | FREE tier | Google Maps, web search |
| **apple-apis** | ✅ Required | $99/year | Premium Apple services |

**Recommendation**: Start with `macos-native` (completely free, no setup) + `google-apis` (free tier)

---

## All Available Tools (27 Total)

### Native macOS (FREE - No API Keys)
| Tool | Description |
|------|-------------|
| `get_current_location` | Get your location via IP |
| `get_weather` | Current weather (wttr.in) |
| `get_weather_forecast` | Multi-day forecast |
| `geocode_address` | Address → coordinates (OpenStreetMap) |
| `reverse_geocode` | Coordinates → address |
| `search_nearby_places` | Find nearby places |
| `open_in_maps` | Open Apple Maps app |
| `get_directions_in_maps` | Directions in Apple Maps |
| `get_system_info` | macOS system information |
| `set_reminder` | Create Apple Reminder |
| `add_calendar_event` | Add to Apple Calendar |

### Google APIs (Free Tier Available)
| Tool | Description |
|------|-------------|
| `maps_geocode` | Address → coordinates |
| `maps_reverse_geocode` | Coordinates → address |
| `maps_nearby_search` | Find nearby places |
| `maps_place_details` | Detailed place info |
| `maps_directions` | Turn-by-turn directions |
| `maps_distance_matrix` | Travel time matrix |
| `google_search` | Web search |
| `google_image_search` | Image search |

### Apple REST APIs ($99/year Developer Account)
| Tool | Description |
|------|-------------|
| `apple_maps_*` | Official Apple Maps (5 tools) |
| `apple_weather_*` | WeatherKit forecasts (4 tools) |
| `apple_music_*` | Apple Music catalog (6 tools) |

---

## Setup Instructions

### Step 1: Native macOS (Instant - No Setup!)

Works immediately with no configuration:

```json
{
  "mcpServers": {
    "macos-native": {
      "command": "python3",
      "args": ["/path/to/apple-mcp-server/macos_native_server.py"]
    }
  }
}
```

### Step 2: Google APIs (Free Tier)

1. **Get API Keys** (10 min):
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create project → Enable Maps APIs + Custom Search API
   - Create API key
   - Create Search Engine at [cse.google.com](https://programmablesearchengine.google.com/)

2. **Set Environment Variables**:
   ```bash
   export GOOGLE_MAPS_API_KEY="your-key"
   export GOOGLE_CUSTOM_SEARCH_API_KEY="your-key"
   export GOOGLE_SEARCH_ENGINE_ID="your-id"
   ```

3. **Add to Claude Code** (`.mcp.json`):
   ```json
   {
     "mcpServers": {
       "google-apis": {
         "command": "python3",
         "args": ["/path/to/google-mcp-server/google_apis_server.py"],
         "env": {
           "GOOGLE_MAPS_API_KEY": "${GOOGLE_MAPS_API_KEY}",
           "GOOGLE_CUSTOM_SEARCH_API_KEY": "${GOOGLE_CUSTOM_SEARCH_API_KEY}",
           "GOOGLE_SEARCH_ENGINE_ID": "${GOOGLE_SEARCH_ENGINE_ID}"
         }
       }
     }
   }
   ```

### Step 3: Apple REST APIs (Optional - $99/year)

1. Join [Apple Developer Program](https://developer.apple.com/programs/)
2. Create keys at Apple Developer Portal
3. See `apple-mcp-server/.env.example` for configuration

---

## Free Tier Limits

| Service | Free Quota |
|---------|------------|
| Google Maps | $200/month credit (~28K geocodes) |
| Google Search | 100 queries/day |
| Apple WeatherKit | 500K calls/month |
| Apple Maps | 250K views + 25K service calls/day |
| Native macOS | Unlimited |
| wttr.in (weather) | Generous (IP-based rate limit) |
| OpenStreetMap | Generous (1 request/sec) |

---

## File Structure

```
ClaudeCodeProjects/
├── google-mcp-server/
│   ├── google_apis_server.py    # Google Maps + Search
│   ├── .env.example             # Config template
│   └── README.md
├── apple-mcp-server/
│   ├── macos_native_server.py   # FREE native tools
│   ├── apple_apis_server.py     # Apple REST APIs
│   ├── .env.example             # Config template
│   └── README.md
├── mcp-all-config.json          # Combined config
└── MCP-SERVERS-README.md        # This file
```

---

## Usage Examples

**Weather** (Native - FREE):
```
"What's the weather in San Francisco?"
"5-day forecast for New York"
```

**Maps** (Google or Native):
```
"Find coffee shops near me"
"Directions from LA to San Diego"
"Open Apple Maps to the airport"
```

**Search** (Google):
```
"Search for Python tutorials"
"Find images of national parks"
```

**Music** (Apple - requires Developer Account):
```
"Search Apple Music for The Beatles"
"Top 10 songs on Apple Music charts"
```

**macOS Integration** (FREE):
```
"Set a reminder to call mom tomorrow"
"Add a meeting to my calendar for Friday at 2pm"
"What's my Mac's system info?"
```

---

## Next Steps

1. ✅ Copy the config to your Claude Code project
2. ✅ Update paths to match your setup
3. ✅ Set any required environment variables
4. ✅ Restart Claude Code to load the MCP servers

Need help? Check the individual README files in each server folder.

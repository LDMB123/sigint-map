# Apple MCP Servers for Claude

Two options for Apple integration:

| Server | API Keys Needed? | Cost |
|--------|------------------|------|
| **macos_native_server.py** | NO | FREE |
| **apple_apis_server.py** | YES | $99/year Developer Program |

---

## Option 1: Native macOS Server (RECOMMENDED TO START)

**No Apple Developer account needed!** Uses free services and native macOS features.

### Tools Available

| Tool | Description | Backend |
|------|-------------|---------|
| `get_current_location` | Get your current location | IP geolocation |
| `get_weather` | Current weather | wttr.in (free) |
| `get_weather_forecast` | Multi-day forecast | wttr.in (free) |
| `geocode_address` | Address → coordinates | OpenStreetMap |
| `reverse_geocode` | Coordinates → address | OpenStreetMap |
| `search_nearby_places` | Find nearby places | OpenStreetMap |
| `open_in_maps` | Open in Apple Maps app | Native macOS |
| `get_directions_in_maps` | Directions in Apple Maps | Native macOS |
| `get_system_info` | macOS system info | Native macOS |
| `set_reminder` | Create reminder | Native macOS |
| `add_calendar_event` | Add calendar event | Native macOS |

### Quick Start

```bash
# No setup needed! Just run:
python3 macos_native_server.py
```

### Add to Claude Code

```json
{
  "mcpServers": {
    "macos-native": {
      "command": "python3",
      "args": ["/full/path/to/macos_native_server.py"]
    }
  }
}
```

---

## Option 2: Apple REST APIs (Premium Features)

For official Apple APIs with higher quotas and more features.

### Tools Available

**Apple Maps** (250K free map views/day)
- `apple_maps_geocode` - Official Apple geocoding
- `apple_maps_reverse_geocode` - Reverse geocoding
- `apple_maps_search` - Place search
- `apple_maps_directions` - Turn-by-turn directions
- `apple_maps_eta` - Travel time estimates

**WeatherKit** (500K free calls/month)
- `apple_weather_current` - Current conditions
- `apple_weather_forecast` - Daily/hourly forecasts
- `apple_weather_full` - Complete weather data
- `apple_weather_alerts` - Severe weather alerts

**Apple Music** (Unlimited)
- `apple_music_search` - Search catalog
- `apple_music_get_song` - Song details
- `apple_music_get_album` - Album with tracks
- `apple_music_get_artist` - Artist info
- `apple_music_charts` - Top charts
- `apple_music_get_playlist` - Playlist details

### Setup Requirements

1. **Apple Developer Program** ($99/year) - [Join here](https://developer.apple.com/programs/)

2. **Create Keys** at [Apple Developer Portal](https://developer.apple.com/account):
   - Go to Certificates, Identifiers & Profiles
   - Create a Service ID for each service
   - Create a Key with desired capabilities (MapKit JS, WeatherKit, MusicKit)
   - Download the .p8 private key file

3. **Configure Environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

4. **Add to Claude Code**:
   ```json
   {
     "mcpServers": {
       "apple-apis": {
         "command": "python3",
         "args": ["/full/path/to/apple_apis_server.py"],
         "env": {
           "APPLE_TEAM_ID": "YOUR_TEAM_ID",
           "APPLE_MAPS_KEY_ID": "YOUR_KEY_ID",
           "APPLE_MAPS_PRIVATE_KEY": "/path/to/AuthKey.p8"
         }
       }
     }
   }
   ```

---

## Comparison: Native vs REST API

| Feature | Native (Free) | REST API ($99/yr) |
|---------|---------------|-------------------|
| Weather | wttr.in data | Apple Weather (more accurate) |
| Maps | OpenStreetMap | Apple Maps (better in cities) |
| Geocoding | OpenStreetMap | Apple (more precise) |
| Music | ❌ | ✅ Full Apple Music catalog |
| Quotas | Unlimited* | High (500K weather, 250K maps) |
| Setup | Instant | ~30 min |

*OpenStreetMap has rate limits, but generous for personal use

---

## Usage Examples

### Native Server
```
"What's the weather like?"
"Find coffee shops near me"
"Open Apple Maps with directions to the airport"
"Set a reminder to call mom"
```

### Apple REST APIs
```
"Get the 10-day forecast for Paris"
"Search Apple Music for Taylor Swift's latest album"
"What's the travel time from NYC to Boston?"
"Show me the top 20 songs on Apple Music"
```

---

## Troubleshooting

### Native Server Issues

**Location not working?**
- Location is determined by IP, may not be precise
- For better accuracy, use Apple REST API

**Weather returning errors?**
- wttr.in may rate limit, wait a minute and retry

### Apple REST API Issues

**"Credentials not configured"**
- Check your .env file has all required values
- Ensure .p8 file path is correct

**"Invalid token"**
- Verify TEAM_ID matches your Apple Developer account
- Check KEY_ID matches your .p8 file
- Ensure the key has the right capabilities enabled

**"API not enabled"**
- Go to App ID settings and enable the required service
- May take a few minutes to propagate

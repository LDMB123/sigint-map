# Apple MCP Server

macOS native MCP server exposing Apple platform APIs as tools.

## Project Scope

**This project is ONLY the Apple MCP server.** Do not reference any other workspace project.

## Quick Start

```bash
# Native server (free, no API keys needed)
python3 macos_native_server.py

# REST API server (requires Apple Developer Program $99/yr)
python3 apple_apis_server.py
```

## Tools

**Native server (macos_native_server.py):**
- Location services
- Weather (via WeatherKit)
- Geocoding
- Maps integration
- Reminders
- Calendar events

**REST API server (apple_apis_server.py):**
- Apple Maps API
- WeatherKit REST API
- Apple Music API

## Requirements

- macOS (native APIs unavailable on other platforms)
- Python 3.x
- REST server: Apple Developer Program membership + API keys

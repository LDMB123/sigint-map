#!/usr/bin/env python3
"""
Apple APIs MCP Server for Claude
Provides Apple Maps, WeatherKit, and Apple Music functionality

To run: python apple_apis_server.py
"""

import os
import time
import requests
from typing import Optional, List
from dotenv import load_dotenv
from fastmcp import FastMCP

# JWT handling for Apple authentication
import jwt
from datetime import datetime, timedelta

# Load environment variables
load_dotenv()

# Initialize MCP server
mcp = FastMCP("apple-apis")

# =============================================================================
# APPLE JWT TOKEN GENERATION
# =============================================================================

def generate_apple_token(service: str = "maps") -> Optional[str]:
    """
    Generate a JWT token for Apple APIs.

    Apple requires JWT tokens signed with your private key for authentication.
    Different services may use different keys/team configurations.
    """
    team_id = os.environ.get("APPLE_TEAM_ID")

    if service == "maps":
        key_id = os.environ.get("APPLE_MAPS_KEY_ID")
        private_key = os.environ.get("APPLE_MAPS_PRIVATE_KEY")
        # Maps tokens are valid for up to 7 days
        expiry = datetime.utcnow() + timedelta(days=7)
    elif service == "weather":
        key_id = os.environ.get("APPLE_WEATHER_KEY_ID")
        private_key = os.environ.get("APPLE_WEATHER_PRIVATE_KEY")
        # Weather tokens typically valid for 1 hour
        expiry = datetime.utcnow() + timedelta(hours=1)
    elif service == "music":
        key_id = os.environ.get("APPLE_MUSIC_KEY_ID")
        private_key = os.environ.get("APPLE_MUSIC_PRIVATE_KEY")
        # Music tokens valid for up to 6 months
        expiry = datetime.utcnow() + timedelta(days=180)
    else:
        return None

    if not all([team_id, key_id, private_key]):
        return None

    # Handle private key - it might be a file path or the actual key
    if private_key.startswith("-----BEGIN"):
        key = private_key
    elif os.path.exists(private_key):
        with open(private_key, "r") as f:
            key = f.read()
    else:
        # Try treating it as a path relative to the script
        key_path = os.path.join(os.path.dirname(__file__), private_key)
        if os.path.exists(key_path):
            with open(key_path, "r") as f:
                key = f.read()
        else:
            return None

    headers = {
        "alg": "ES256",
        "kid": key_id,
        "typ": "JWT"
    }

    payload = {
        "iss": team_id,
        "iat": datetime.utcnow(),
        "exp": expiry
    }

    # Add service-specific claims
    if service == "maps":
        payload["origin"] = "*"  # Or specific domain
    elif service == "music":
        payload["sub"] = os.environ.get("APPLE_MUSIC_SERVICE_ID", team_id)

    try:
        token = jwt.encode(payload, key, algorithm="ES256", headers=headers)
        return token
    except Exception as e:
        print(f"Error generating {service} token: {e}")
        return None


# =============================================================================
# APPLE MAPS API TOOLS
# =============================================================================

@mcp.tool()
def apple_maps_geocode(address: str) -> dict:
    """
    Convert an address to latitude/longitude coordinates using Apple Maps.

    Args:
        address: The address to geocode (e.g., "Apple Park, Cupertino, CA")

    Returns:
        Dictionary with location data including coordinates
    """
    token = generate_apple_token("maps")
    if not token:
        return {"error": "Apple Maps credentials not configured. Check APPLE_TEAM_ID, APPLE_MAPS_KEY_ID, and APPLE_MAPS_PRIVATE_KEY."}

    url = "https://maps-api.apple.com/v1/geocode"
    headers = {"Authorization": f"Bearer {token}"}
    params = {"q": address}

    try:
        response = requests.get(url, headers=headers, params=params, timeout=10)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        return {"error": str(e)}


@mcp.tool()
def apple_maps_reverse_geocode(lat: float, lng: float) -> dict:
    """
    Convert coordinates to an address using Apple Maps.

    Args:
        lat: Latitude
        lng: Longitude

    Returns:
        Dictionary with address information
    """
    token = generate_apple_token("maps")
    if not token:
        return {"error": "Apple Maps credentials not configured."}

    url = "https://maps-api.apple.com/v1/reverseGeocode"
    headers = {"Authorization": f"Bearer {token}"}
    params = {"loc": f"{lat},{lng}"}

    try:
        response = requests.get(url, headers=headers, params=params, timeout=10)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        return {"error": str(e)}


@mcp.tool()
def apple_maps_search(
    query: str,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    lang: str = "en-US"
) -> dict:
    """
    Search for places using Apple Maps.

    Args:
        query: Search query (e.g., "coffee shops", "Apple Store")
        lat: Optional latitude to bias results
        lng: Optional longitude to bias results
        lang: Language code (default: en-US)

    Returns:
        Dictionary with search results
    """
    token = generate_apple_token("maps")
    if not token:
        return {"error": "Apple Maps credentials not configured."}

    url = "https://maps-api.apple.com/v1/search"
    headers = {"Authorization": f"Bearer {token}"}
    params = {
        "q": query,
        "lang": lang
    }

    if lat and lng:
        params["searchLocation"] = f"{lat},{lng}"

    try:
        response = requests.get(url, headers=headers, params=params, timeout=10)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        return {"error": str(e)}


@mcp.tool()
def apple_maps_directions(
    origin: str,
    destination: str,
    transport_type: str = "Automobile",
    departure_time: Optional[str] = None
) -> dict:
    """
    Get directions between two locations using Apple Maps.

    Args:
        origin: Starting location (address or "lat,lng")
        destination: Ending location (address or "lat,lng")
        transport_type: "Automobile", "Walking", or "Transit"
        departure_time: Optional ISO 8601 departure time

    Returns:
        Dictionary with route information
    """
    token = generate_apple_token("maps")
    if not token:
        return {"error": "Apple Maps credentials not configured."}

    url = "https://maps-api.apple.com/v1/directions"
    headers = {"Authorization": f"Bearer {token}"}
    params = {
        "origin": origin,
        "destination": destination,
        "transportType": transport_type
    }

    if departure_time:
        params["departureDate"] = departure_time

    try:
        response = requests.get(url, headers=headers, params=params, timeout=10)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        return {"error": str(e)}


@mcp.tool()
def apple_maps_eta(
    origins: List[str],
    destinations: List[str],
    transport_type: str = "Automobile"
) -> dict:
    """
    Calculate estimated travel times between multiple origins and destinations.

    Args:
        origins: List of origin locations
        destinations: List of destination locations
        transport_type: "Automobile", "Walking", or "Transit"

    Returns:
        Dictionary with ETA matrix
    """
    token = generate_apple_token("maps")
    if not token:
        return {"error": "Apple Maps credentials not configured."}

    url = "https://maps-api.apple.com/v1/etas"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    data = {
        "origins": [{"address": o} if not "," in o else {"coordinate": {"latitude": float(o.split(",")[0]), "longitude": float(o.split(",")[1])}} for o in origins],
        "destinations": [{"address": d} if not "," in d else {"coordinate": {"latitude": float(d.split(",")[0]), "longitude": float(d.split(",")[1])}} for d in destinations],
        "transportType": transport_type
    }

    try:
        response = requests.post(url, headers=headers, json=data, timeout=10)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        return {"error": str(e)}


# =============================================================================
# APPLE WEATHERKIT API TOOLS
# =============================================================================

@mcp.tool()
def apple_weather_current(
    lat: float,
    lng: float,
    language: str = "en"
) -> dict:
    """
    Get current weather conditions for a location.

    Args:
        lat: Latitude
        lng: Longitude
        language: Language code (default: en)

    Returns:
        Dictionary with current weather data
    """
    token = generate_apple_token("weather")
    if not token:
        return {"error": "WeatherKit credentials not configured. Check APPLE_TEAM_ID, APPLE_WEATHER_KEY_ID, and APPLE_WEATHER_PRIVATE_KEY."}

    url = f"https://weatherkit.apple.com/api/v1/weather/{language}/{lat}/{lng}"
    headers = {"Authorization": f"Bearer {token}"}
    params = {"dataSets": "currentWeather"}

    try:
        response = requests.get(url, headers=headers, params=params, timeout=10)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        return {"error": str(e)}


@mcp.tool()
def apple_weather_forecast(
    lat: float,
    lng: float,
    forecast_type: str = "daily",
    language: str = "en"
) -> dict:
    """
    Get weather forecast for a location.

    Args:
        lat: Latitude
        lng: Longitude
        forecast_type: "daily" (10-day) or "hourly" (next 24 hours)
        language: Language code (default: en)

    Returns:
        Dictionary with forecast data
    """
    token = generate_apple_token("weather")
    if not token:
        return {"error": "WeatherKit credentials not configured."}

    url = f"https://weatherkit.apple.com/api/v1/weather/{language}/{lat}/{lng}"
    headers = {"Authorization": f"Bearer {token}"}

    if forecast_type == "daily":
        params = {"dataSets": "forecastDaily"}
    else:
        params = {"dataSets": "forecastHourly"}

    try:
        response = requests.get(url, headers=headers, params=params, timeout=10)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        return {"error": str(e)}


@mcp.tool()
def apple_weather_full(
    lat: float,
    lng: float,
    language: str = "en"
) -> dict:
    """
    Get comprehensive weather data including current conditions, hourly and daily forecasts.

    Args:
        lat: Latitude
        lng: Longitude
        language: Language code (default: en)

    Returns:
        Dictionary with complete weather data
    """
    token = generate_apple_token("weather")
    if not token:
        return {"error": "WeatherKit credentials not configured."}

    url = f"https://weatherkit.apple.com/api/v1/weather/{language}/{lat}/{lng}"
    headers = {"Authorization": f"Bearer {token}"}
    params = {"dataSets": "currentWeather,forecastDaily,forecastHourly,weatherAlerts"}

    try:
        response = requests.get(url, headers=headers, params=params, timeout=10)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        return {"error": str(e)}


@mcp.tool()
def apple_weather_alerts(
    lat: float,
    lng: float,
    language: str = "en"
) -> dict:
    """
    Get severe weather alerts for a location.

    Args:
        lat: Latitude
        lng: Longitude
        language: Language code (default: en)

    Returns:
        Dictionary with weather alerts (if any)
    """
    token = generate_apple_token("weather")
    if not token:
        return {"error": "WeatherKit credentials not configured."}

    url = f"https://weatherkit.apple.com/api/v1/weather/{language}/{lat}/{lng}"
    headers = {"Authorization": f"Bearer {token}"}
    params = {"dataSets": "weatherAlerts"}

    try:
        response = requests.get(url, headers=headers, params=params, timeout=10)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        return {"error": str(e)}


# =============================================================================
# APPLE MUSIC API TOOLS
# =============================================================================

@mcp.tool()
def apple_music_search(
    query: str,
    types: str = "songs,albums,artists",
    limit: int = 10,
    storefront: str = "us"
) -> dict:
    """
    Search the Apple Music catalog.

    Args:
        query: Search query
        types: Comma-separated types: songs, albums, artists, playlists, music-videos
        limit: Number of results per type (max 25)
        storefront: Country code (default: us)

    Returns:
        Dictionary with search results
    """
    token = generate_apple_token("music")
    if not token:
        return {"error": "Apple Music credentials not configured. Check APPLE_TEAM_ID, APPLE_MUSIC_KEY_ID, and APPLE_MUSIC_PRIVATE_KEY."}

    url = f"https://api.music.apple.com/v1/catalog/{storefront}/search"
    headers = {"Authorization": f"Bearer {token}"}
    params = {
        "term": query,
        "types": types,
        "limit": min(limit, 25)
    }

    try:
        response = requests.get(url, headers=headers, params=params, timeout=10)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        return {"error": str(e)}


@mcp.tool()
def apple_music_get_song(
    song_id: str,
    storefront: str = "us"
) -> dict:
    """
    Get details about a specific song.

    Args:
        song_id: Apple Music song ID
        storefront: Country code (default: us)

    Returns:
        Dictionary with song details
    """
    token = generate_apple_token("music")
    if not token:
        return {"error": "Apple Music credentials not configured."}

    url = f"https://api.music.apple.com/v1/catalog/{storefront}/songs/{song_id}"
    headers = {"Authorization": f"Bearer {token}"}

    try:
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        return {"error": str(e)}


@mcp.tool()
def apple_music_get_album(
    album_id: str,
    storefront: str = "us"
) -> dict:
    """
    Get details about a specific album including track listing.

    Args:
        album_id: Apple Music album ID
        storefront: Country code (default: us)

    Returns:
        Dictionary with album details and tracks
    """
    token = generate_apple_token("music")
    if not token:
        return {"error": "Apple Music credentials not configured."}

    url = f"https://api.music.apple.com/v1/catalog/{storefront}/albums/{album_id}"
    headers = {"Authorization": f"Bearer {token}"}
    params = {"include": "tracks"}

    try:
        response = requests.get(url, headers=headers, params=params, timeout=10)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        return {"error": str(e)}


@mcp.tool()
def apple_music_get_artist(
    artist_id: str,
    storefront: str = "us"
) -> dict:
    """
    Get details about an artist including top songs and albums.

    Args:
        artist_id: Apple Music artist ID
        storefront: Country code (default: us)

    Returns:
        Dictionary with artist details
    """
    token = generate_apple_token("music")
    if not token:
        return {"error": "Apple Music credentials not configured."}

    url = f"https://api.music.apple.com/v1/catalog/{storefront}/artists/{artist_id}"
    headers = {"Authorization": f"Bearer {token}"}
    params = {"include": "albums"}

    try:
        response = requests.get(url, headers=headers, params=params, timeout=10)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        return {"error": str(e)}


@mcp.tool()
def apple_music_charts(
    chart_type: str = "songs",
    storefront: str = "us",
    limit: int = 20
) -> dict:
    """
    Get Apple Music charts (top songs, albums, etc.).

    Args:
        chart_type: "songs", "albums", "music-videos", or "playlists"
        storefront: Country code (default: us)
        limit: Number of results (max 50)

    Returns:
        Dictionary with chart data
    """
    token = generate_apple_token("music")
    if not token:
        return {"error": "Apple Music credentials not configured."}

    url = f"https://api.music.apple.com/v1/catalog/{storefront}/charts"
    headers = {"Authorization": f"Bearer {token}"}
    params = {
        "types": chart_type,
        "limit": min(limit, 50)
    }

    try:
        response = requests.get(url, headers=headers, params=params, timeout=10)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        return {"error": str(e)}


@mcp.tool()
def apple_music_get_playlist(
    playlist_id: str,
    storefront: str = "us"
) -> dict:
    """
    Get details about a playlist including tracks.

    Args:
        playlist_id: Apple Music playlist ID
        storefront: Country code (default: us)

    Returns:
        Dictionary with playlist details and tracks
    """
    token = generate_apple_token("music")
    if not token:
        return {"error": "Apple Music credentials not configured."}

    url = f"https://api.music.apple.com/v1/catalog/{storefront}/playlists/{playlist_id}"
    headers = {"Authorization": f"Bearer {token}"}
    params = {"include": "tracks"}

    try:
        response = requests.get(url, headers=headers, params=params, timeout=10)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        return {"error": str(e)}


# =============================================================================
# SERVER ENTRY POINT
# =============================================================================

if __name__ == "__main__":
    print("Starting Apple APIs MCP Server...")
    print()
    print("Apple Maps Tools:")
    print("  - apple_maps_geocode: Convert address to coordinates")
    print("  - apple_maps_reverse_geocode: Convert coordinates to address")
    print("  - apple_maps_search: Search for places")
    print("  - apple_maps_directions: Get directions")
    print("  - apple_maps_eta: Calculate travel times")
    print()
    print("WeatherKit Tools:")
    print("  - apple_weather_current: Current conditions")
    print("  - apple_weather_forecast: Daily/hourly forecast")
    print("  - apple_weather_full: Complete weather data")
    print("  - apple_weather_alerts: Severe weather alerts")
    print()
    print("Apple Music Tools:")
    print("  - apple_music_search: Search catalog")
    print("  - apple_music_get_song: Get song details")
    print("  - apple_music_get_album: Get album details")
    print("  - apple_music_get_artist: Get artist info")
    print("  - apple_music_charts: Get top charts")
    print("  - apple_music_get_playlist: Get playlist details")
    print()
    mcp.run()

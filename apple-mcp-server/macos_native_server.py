#!/usr/bin/env python3
"""
Native macOS MCP Server for Claude
Uses AppleScript and system commands - NO Apple Developer account needed!

To run: python macos_native_server.py
"""

import subprocess
import json
import os
from typing import Optional
from fastmcp import FastMCP

# Initialize MCP server
mcp = FastMCP("macos-native")


def run_osascript(script: str) -> str:
    """Run an AppleScript and return the result."""
    try:
        result = subprocess.run(
            ["osascript", "-e", script],
            capture_output=True,
            text=True,
            timeout=30
        )
        if result.returncode == 0:
            return result.stdout.strip()
        else:
            return f"Error: {result.stderr.strip()}"
    except subprocess.TimeoutExpired:
        return "Error: Script timed out"
    except Exception as e:
        return f"Error: {str(e)}"


def run_command(cmd: list) -> str:
    """Run a shell command and return the result."""
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        return result.stdout.strip() if result.returncode == 0 else result.stderr.strip()
    except Exception as e:
        return f"Error: {str(e)}"


# =============================================================================
# LOCATION SERVICES (Native)
# =============================================================================

@mcp.tool()
def get_current_location() -> dict:
    """
    Get current location using macOS Core Location.
    Requires Location Services permission for Terminal/Python.

    Returns:
        Dictionary with latitude, longitude, and address
    """
    # Use CoreLocationCLI if available, or fall back to AppleScript
    script = '''
    tell application "System Events"
        set locationInfo to do shell script "
            /usr/bin/python3 -c '
import CoreLocation
import time

manager = CoreLocation.CLLocationManager.alloc().init()
manager.requestWhenInUseAuthorization()
manager.startUpdatingLocation()

time.sleep(2)

location = manager.location()
if location:
    print(f\\"{location.coordinate().latitude},{location.coordinate().longitude}\\")
else:
    print(\\"Error: Could not get location\\")
'"
    end tell
    '''

    # Simpler approach using whereami or ipinfo
    try:
        # Try IP-based geolocation as fallback
        import requests
        response = requests.get("https://ipinfo.io/json", timeout=5)
        data = response.json()
        loc = data.get("loc", "").split(",")
        if len(loc) == 2:
            return {
                "latitude": float(loc[0]),
                "longitude": float(loc[1]),
                "city": data.get("city"),
                "region": data.get("region"),
                "country": data.get("country"),
                "source": "ip_geolocation"
            }
    except:
        pass

    return {"error": "Could not determine location. Enable Location Services in System Preferences."}


# =============================================================================
# WEATHER (Native via wttr.in - no API key needed)
# =============================================================================

@mcp.tool()
def get_weather(location: Optional[str] = None) -> dict:
    """
    Get current weather using wttr.in (no API key required).

    Args:
        location: City name, zip code, or leave empty for current location

    Returns:
        Dictionary with weather information
    """
    import requests

    if not location:
        # Try to get current location
        loc_result = get_current_location()
        if "latitude" in loc_result:
            location = f"{loc_result['latitude']},{loc_result['longitude']}"
        elif "city" in loc_result:
            location = loc_result["city"]
        else:
            location = ""  # wttr.in will use IP-based location

    try:
        # Get JSON weather data
        url = f"https://wttr.in/{location}?format=j1"
        response = requests.get(url, timeout=10, headers={"User-Agent": "curl"})
        response.raise_for_status()
        data = response.json()

        current = data.get("current_condition", [{}])[0]
        area = data.get("nearest_area", [{}])[0]

        return {
            "location": {
                "city": area.get("areaName", [{}])[0].get("value"),
                "region": area.get("region", [{}])[0].get("value"),
                "country": area.get("country", [{}])[0].get("value")
            },
            "current": {
                "temperature_f": current.get("temp_F"),
                "temperature_c": current.get("temp_C"),
                "feels_like_f": current.get("FeelsLikeF"),
                "feels_like_c": current.get("FeelsLikeC"),
                "condition": current.get("weatherDesc", [{}])[0].get("value"),
                "humidity": current.get("humidity"),
                "wind_mph": current.get("windspeedMiles"),
                "wind_direction": current.get("winddir16Point"),
                "uv_index": current.get("uvIndex"),
                "visibility_miles": current.get("visibilityMiles")
            },
            "forecast": [
                {
                    "date": day.get("date"),
                    "high_f": day.get("maxtempF"),
                    "low_f": day.get("mintempF"),
                    "condition": day.get("hourly", [{}])[4].get("weatherDesc", [{}])[0].get("value")
                }
                for day in data.get("weather", [])[:3]
            ]
        }
    except Exception as e:
        return {"error": str(e)}


@mcp.tool()
def get_weather_forecast(location: str, days: int = 3) -> dict:
    """
    Get weather forecast for upcoming days.

    Args:
        location: City name or coordinates
        days: Number of days (1-3)

    Returns:
        Dictionary with forecast data
    """
    import requests

    try:
        url = f"https://wttr.in/{location}?format=j1"
        response = requests.get(url, timeout=10, headers={"User-Agent": "curl"})
        response.raise_for_status()
        data = response.json()

        forecasts = []
        for day in data.get("weather", [])[:days]:
            forecasts.append({
                "date": day.get("date"),
                "high_f": day.get("maxtempF"),
                "high_c": day.get("maxtempC"),
                "low_f": day.get("mintempF"),
                "low_c": day.get("mintempC"),
                "sunrise": day.get("astronomy", [{}])[0].get("sunrise"),
                "sunset": day.get("astronomy", [{}])[0].get("sunset"),
                "hourly": [
                    {
                        "time": h.get("time"),
                        "temp_f": h.get("tempF"),
                        "condition": h.get("weatherDesc", [{}])[0].get("value"),
                        "chance_of_rain": h.get("chanceofrain")
                    }
                    for h in day.get("hourly", [])
                ]
            })

        return {"location": location, "forecast": forecasts}
    except Exception as e:
        return {"error": str(e)}


# =============================================================================
# MAPS & DIRECTIONS (via free services)
# =============================================================================

@mcp.tool()
def geocode_address(address: str) -> dict:
    """
    Convert an address to coordinates using Nominatim (OpenStreetMap).
    Free, no API key required.

    Args:
        address: Address to geocode

    Returns:
        Dictionary with coordinates and address details
    """
    import requests

    try:
        url = "https://nominatim.openstreetmap.org/search"
        params = {
            "q": address,
            "format": "json",
            "limit": 1,
            "addressdetails": 1
        }
        headers = {"User-Agent": "ClaudeMCPServer/1.0"}

        response = requests.get(url, params=params, headers=headers, timeout=10)
        response.raise_for_status()
        results = response.json()

        if results:
            result = results[0]
            return {
                "latitude": float(result["lat"]),
                "longitude": float(result["lon"]),
                "display_name": result["display_name"],
                "address": result.get("address", {}),
                "type": result.get("type")
            }
        else:
            return {"error": "Address not found"}
    except Exception as e:
        return {"error": str(e)}


@mcp.tool()
def reverse_geocode(lat: float, lng: float) -> dict:
    """
    Convert coordinates to an address using Nominatim (OpenStreetMap).

    Args:
        lat: Latitude
        lng: Longitude

    Returns:
        Dictionary with address information
    """
    import requests

    try:
        url = "https://nominatim.openstreetmap.org/reverse"
        params = {
            "lat": lat,
            "lon": lng,
            "format": "json",
            "addressdetails": 1
        }
        headers = {"User-Agent": "ClaudeMCPServer/1.0"}

        response = requests.get(url, params=params, headers=headers, timeout=10)
        response.raise_for_status()
        result = response.json()

        return {
            "display_name": result.get("display_name"),
            "address": result.get("address", {}),
            "latitude": lat,
            "longitude": lng
        }
    except Exception as e:
        return {"error": str(e)}


@mcp.tool()
def search_nearby_places(
    query: str,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    radius_km: float = 5
) -> dict:
    """
    Search for nearby places using Nominatim (OpenStreetMap).

    Args:
        query: What to search for (e.g., "coffee shop", "restaurant")
        lat: Latitude (uses current location if not provided)
        lng: Longitude (uses current location if not provided)
        radius_km: Search radius in kilometers

    Returns:
        Dictionary with nearby places
    """
    import requests

    # Get current location if not provided
    if lat is None or lng is None:
        loc = get_current_location()
        if "error" in loc:
            return loc
        lat = loc.get("latitude")
        lng = loc.get("longitude")

    try:
        url = "https://nominatim.openstreetmap.org/search"
        params = {
            "q": query,
            "format": "json",
            "limit": 20,
            "addressdetails": 1,
            "viewbox": f"{lng - radius_km/111},{lat + radius_km/111},{lng + radius_km/111},{lat - radius_km/111}",
            "bounded": 1
        }
        headers = {"User-Agent": "ClaudeMCPServer/1.0"}

        response = requests.get(url, params=params, headers=headers, timeout=10)
        response.raise_for_status()
        results = response.json()

        places = []
        for r in results:
            places.append({
                "name": r.get("display_name", "").split(",")[0],
                "full_address": r.get("display_name"),
                "latitude": float(r["lat"]),
                "longitude": float(r["lon"]),
                "type": r.get("type")
            })

        return {"query": query, "center": {"lat": lat, "lng": lng}, "places": places}
    except Exception as e:
        return {"error": str(e)}


# =============================================================================
# GROUNDING TOOLS
# =============================================================================

@mcp.tool()
def weather_grounding_context(location: str, time_of_day: Optional[str] = None) -> dict:
    """
    Get weather context formatted for AI image generation grounding.
    Combines weather data with lighting/sun position for realistic prompts.

    Args:
        location: City name, zip code, or "lat,lng" coordinates
        time_of_day: Optional time like "1:15am", "sunset", "noon" (defaults to current)

    Returns:
        Dictionary with weather data and a prompt_fragment ready for AI image prompts
    """
    import requests
    from datetime import datetime

    # Get weather data
    weather = get_weather(location)
    if "error" in weather:
        return weather

    # Get forecast for sunrise/sunset data
    forecast = get_weather_forecast(location, days=1)

    current = weather.get("current", {})
    loc_info = weather.get("location", {})

    # Extract sun times from forecast
    sunrise = ""
    sunset = ""
    if "forecast" in forecast and forecast["forecast"]:
        day_data = forecast["forecast"][0]
        sunrise = day_data.get("sunrise", "")
        sunset = day_data.get("sunset", "")

    # Determine lighting conditions
    now = datetime.now()
    hour = now.hour
    if time_of_day:
        time_lower = time_of_day.lower()
        if "am" in time_lower or "pm" in time_lower:
            try:
                parsed = datetime.strptime(time_of_day.strip(), "%I:%M%p")
                hour = parsed.hour
            except ValueError:
                try:
                    parsed = datetime.strptime(time_of_day.strip(), "%I:%M %p")
                    hour = parsed.hour
                except ValueError:
                    pass
        elif time_lower == "noon":
            hour = 12
        elif time_lower == "midnight":
            hour = 0
        elif time_lower in ("sunset", "dusk"):
            hour = 19
        elif time_lower in ("sunrise", "dawn"):
            hour = 6
        elif time_lower == "golden hour":
            hour = 18

    # Classify lighting
    if 5 <= hour < 7:
        lighting = "pre-dawn to sunrise, soft blue-pink light"
    elif 7 <= hour < 10:
        lighting = "morning golden light, long shadows"
    elif 10 <= hour < 14:
        lighting = "midday overhead sun, short shadows"
    elif 14 <= hour < 17:
        lighting = "afternoon warm light"
    elif 17 <= hour < 19:
        lighting = "golden hour, warm orange-pink light"
    elif 19 <= hour < 21:
        lighting = "dusk, fading twilight, blue hour"
    else:
        lighting = "nighttime, artificial lighting"

    temp_f = current.get("temperature_f", "?")
    condition = current.get("condition", "clear")
    humidity = current.get("humidity", "?")
    wind_mph = current.get("wind_mph", "0")
    wind_dir = current.get("wind_direction", "")

    city = loc_info.get("city", location)

    # Build prompt fragment
    wind_desc = ""
    try:
        wind_val = int(wind_mph)
        if wind_val < 5:
            wind_desc = "still air"
        elif wind_val < 15:
            wind_desc = f"gentle {wind_dir} breeze"
        elif wind_val < 25:
            wind_desc = f"moderate {wind_dir} wind"
        else:
            wind_desc = f"strong {wind_dir} wind"
    except (ValueError, TypeError):
        wind_desc = "calm"

    prompt_fragment = f"{city}, {temp_f}F {condition.lower()}, {lighting}, {wind_desc}"

    return {
        "location": loc_info,
        "weather": {
            "temperature_f": temp_f,
            "condition": condition,
            "humidity": humidity,
            "wind_mph": wind_mph,
            "wind_direction": wind_dir,
            "uv_index": current.get("uv_index")
        },
        "sun": {
            "sunrise": sunrise,
            "sunset": sunset
        },
        "lighting": {
            "hour": hour,
            "description": lighting
        },
        "prompt_fragment": prompt_fragment
    }


# =============================================================================
# MACOS SYSTEM INTEGRATION
# =============================================================================

@mcp.tool()
def open_in_maps(address: str) -> dict:
    """
    Open a location in Apple Maps app.

    Args:
        address: Address or place name to open

    Returns:
        Confirmation message
    """
    import urllib.parse
    encoded = urllib.parse.quote(address)
    script = f'open "maps://?q={encoded}"'
    result = run_command(["bash", "-c", script])
    return {"status": "opened", "location": address}


@mcp.tool()
def get_directions_in_maps(
    origin: str,
    destination: str,
    mode: str = "d"
) -> dict:
    """
    Open directions in Apple Maps app.

    Args:
        origin: Starting address
        destination: Ending address
        mode: "d" for driving, "w" for walking, "r" for transit

    Returns:
        Confirmation message
    """
    import urllib.parse
    saddr = urllib.parse.quote(origin)
    daddr = urllib.parse.quote(destination)
    script = f'open "maps://?saddr={saddr}&daddr={daddr}&dirflg={mode}"'
    run_command(["bash", "-c", script])
    return {"status": "opened", "from": origin, "to": destination, "mode": mode}


@mcp.tool()
def get_system_info() -> dict:
    """
    Get macOS system information.

    Returns:
        Dictionary with system details
    """
    info = {}

    # Get macOS version
    info["macos_version"] = run_command(["sw_vers", "-productVersion"])
    info["build"] = run_command(["sw_vers", "-buildVersion"])

    # Get hardware info
    info["model"] = run_command(["sysctl", "-n", "hw.model"])
    info["cpu_cores"] = run_command(["sysctl", "-n", "hw.ncpu"])
    info["memory_gb"] = str(int(run_command(["sysctl", "-n", "hw.memsize"])) // (1024**3))

    # Get disk space
    df_output = run_command(["df", "-h", "/"])
    if df_output and not df_output.startswith("Error"):
        lines = df_output.split("\n")
        if len(lines) > 1:
            parts = lines[1].split()
            if len(parts) >= 4:
                info["disk_total"] = parts[1]
                info["disk_used"] = parts[2]
                info["disk_available"] = parts[3]

    return info


@mcp.tool()
def set_reminder(title: str, notes: Optional[str] = None) -> dict:
    """
    Create a reminder in Apple Reminders app.

    Args:
        title: Reminder title
        notes: Optional notes

    Returns:
        Confirmation message
    """
    if notes:
        body_part = ', body:"' + notes + '"'
    else:
        body_part = ""

    script = 'tell application "Reminders" to make new reminder with properties {name:"' + title + '"' + body_part + '}'

    result = run_osascript(script)
    if "Error" in result:
        return {"error": result}
    return {"status": "created", "title": title}


@mcp.tool()
def add_calendar_event(
    title: str,
    start_date: str,
    end_date: Optional[str] = None,
    location: Optional[str] = None,
    notes: Optional[str] = None
) -> dict:
    """
    Add an event to Apple Calendar.

    Args:
        title: Event title
        start_date: Start date/time (e.g., "February 15, 2026 at 2:00 PM")
        end_date: Optional end date/time
        location: Optional location
        notes: Optional notes

    Returns:
        Confirmation message
    """
    if end_date:
        end_part = 'end date:(date "' + end_date + '")'
    else:
        end_part = 'end date:(date "' + start_date + '") + 1 * hours'

    location_part = ', location:"' + location + '"' if location else ""
    notes_part = ', description:"' + notes + '"' if notes else ""

    props = 'summary:"' + title + '", start date:(date "' + start_date + '"), ' + end_part + location_part + notes_part
    script = 'tell application "Calendar" to tell calendar "Calendar" to make new event with properties {' + props + '}'

    result = run_osascript(script)
    if "Error" in result:
        return {"error": result}
    return {"status": "created", "title": title, "start": start_date}


# =============================================================================
# SERVER ENTRY POINT
# =============================================================================

if __name__ == "__main__":
    print("Starting Native macOS MCP Server...")
    print("NO Apple Developer account required!")
    print()
    print("Location & Maps Tools (FREE - uses OpenStreetMap):")
    print("  - get_current_location: Get your current location")
    print("  - geocode_address: Convert address to coordinates")
    print("  - reverse_geocode: Convert coordinates to address")
    print("  - search_nearby_places: Find nearby places")
    print("  - open_in_maps: Open location in Apple Maps")
    print("  - get_directions_in_maps: Get directions in Apple Maps")
    print()
    print("Weather Tools (FREE - uses wttr.in):")
    print("  - get_weather: Current weather")
    print("  - get_weather_forecast: Multi-day forecast")
    print()
    print("macOS Integration:")
    print("  - get_system_info: System information")
    print("  - set_reminder: Create reminder")
    print("  - add_calendar_event: Add calendar event")
    print()
    mcp.run()

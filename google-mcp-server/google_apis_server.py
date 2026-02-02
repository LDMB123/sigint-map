#!/usr/bin/env python3
"""
Google APIs MCP Server for Claude
Provides Google Maps and Google Custom Search functionality

To run: python google_apis_server.py
"""

import os
import requests
from datetime import datetime
from typing import Optional, List
from dotenv import load_dotenv
from fastmcp import FastMCP

# Load environment variables
load_dotenv()

# Initialize MCP server
mcp = FastMCP("google-apis")

# =============================================================================
# GOOGLE MAPS API TOOLS
# =============================================================================

@mcp.tool()
def maps_geocode(address: str) -> dict:
    """
    Convert an address to latitude/longitude coordinates.

    Args:
        address: The address to geocode (e.g., "1600 Amphitheatre Parkway, Mountain View, CA")

    Returns:
        Dictionary with location data including lat/lng coordinates
    """
    api_key = os.environ.get("GOOGLE_MAPS_API_KEY")
    if not api_key:
        return {"error": "GOOGLE_MAPS_API_KEY not set. Please add it to your .env file."}

    url = "https://maps.googleapis.com/maps/api/geocode/json"
    params = {
        "key": api_key,
        "address": address
    }

    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        return {"error": str(e)}


@mcp.tool()
def maps_reverse_geocode(lat: float, lng: float) -> dict:
    """
    Convert coordinates to a human-readable address.

    Args:
        lat: Latitude
        lng: Longitude

    Returns:
        Dictionary with address information
    """
    api_key = os.environ.get("GOOGLE_MAPS_API_KEY")
    if not api_key:
        return {"error": "GOOGLE_MAPS_API_KEY not set. Please add it to your .env file."}

    url = "https://maps.googleapis.com/maps/api/geocode/json"
    params = {
        "key": api_key,
        "latlng": f"{lat},{lng}"
    }

    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        return {"error": str(e)}


@mcp.tool()
def maps_nearby_search(
    location: str,
    radius: int = 1500,
    place_type: Optional[str] = None,
    keyword: Optional[str] = None
) -> dict:
    """
    Search for places near a location.

    Args:
        location: Location as "lat,lng" or an address to search around
        radius: Search radius in meters (max 50000)
        place_type: Type of place (e.g., "restaurant", "hospital", "gas_station", "pharmacy")
        keyword: Keyword to filter results (e.g., "pizza", "coffee")

    Returns:
        Dictionary with nearby places
    """
    api_key = os.environ.get("GOOGLE_MAPS_API_KEY")
    if not api_key:
        return {"error": "GOOGLE_MAPS_API_KEY not set. Please add it to your .env file."}

    # If location looks like an address, geocode it first
    if not ("," in location and location.replace(",", "").replace(".", "").replace("-", "").replace(" ", "").isdigit()):
        geo_result = maps_geocode(location)
        if "error" in geo_result:
            return geo_result
        if geo_result.get("results"):
            loc = geo_result["results"][0]["geometry"]["location"]
            location = f"{loc['lat']},{loc['lng']}"
        else:
            return {"error": "Could not geocode the provided location"}

    url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
    params = {
        "key": api_key,
        "location": location,
        "radius": min(radius, 50000)
    }

    if place_type:
        params["type"] = place_type
    if keyword:
        params["keyword"] = keyword

    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        return {"error": str(e)}


@mcp.tool()
def maps_place_details(place_id: str) -> dict:
    """
    Get detailed information about a specific place.

    Args:
        place_id: The Google Place ID (obtained from nearby_search or other places API calls)

    Returns:
        Dictionary with detailed place information
    """
    api_key = os.environ.get("GOOGLE_MAPS_API_KEY")
    if not api_key:
        return {"error": "GOOGLE_MAPS_API_KEY not set. Please add it to your .env file."}

    url = "https://maps.googleapis.com/maps/api/place/details/json"
    params = {
        "key": api_key,
        "place_id": place_id,
        "fields": "name,formatted_address,formatted_phone_number,opening_hours,rating,reviews,website,price_level,types"
    }

    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        return {"error": str(e)}


@mcp.tool()
def maps_directions(
    origin: str,
    destination: str,
    mode: str = "driving",
    avoid: Optional[str] = None
) -> dict:
    """
    Get directions between two locations.

    Args:
        origin: Starting address or "lat,lng"
        destination: Ending address or "lat,lng"
        mode: Travel mode - "driving", "walking", "bicycling", or "transit"
        avoid: Features to avoid - "tolls", "highways", "ferries" (comma-separated)

    Returns:
        Dictionary with route information including steps and duration
    """
    api_key = os.environ.get("GOOGLE_MAPS_API_KEY")
    if not api_key:
        return {"error": "GOOGLE_MAPS_API_KEY not set. Please add it to your .env file."}

    url = "https://maps.googleapis.com/maps/api/directions/json"
    params = {
        "key": api_key,
        "origin": origin,
        "destination": destination,
        "mode": mode
    }

    if avoid:
        params["avoid"] = avoid

    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        return {"error": str(e)}


@mcp.tool()
def maps_distance_matrix(
    origins: List[str],
    destinations: List[str],
    mode: str = "driving"
) -> dict:
    """
    Calculate travel distance and time for multiple origin-destination pairs.

    Args:
        origins: List of origin addresses or coordinates
        destinations: List of destination addresses or coordinates
        mode: Travel mode - "driving", "walking", "bicycling", or "transit"

    Returns:
        Dictionary with distance and duration for each pair
    """
    api_key = os.environ.get("GOOGLE_MAPS_API_KEY")
    if not api_key:
        return {"error": "GOOGLE_MAPS_API_KEY not set. Please add it to your .env file."}

    url = "https://maps.googleapis.com/maps/api/distancematrix/json"
    params = {
        "key": api_key,
        "origins": "|".join(origins),
        "destinations": "|".join(destinations),
        "mode": mode
    }

    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        return {"error": str(e)}


# =============================================================================
# GROUNDING TOOLS
# =============================================================================

@mcp.tool()
def venue_grounding_context(
    venue_name: str,
    city: str,
    state: str = "",
    country: str = "USA",
    lat: Optional[float] = None,
    lng: Optional[float] = None
) -> dict:
    """
    Get comprehensive venue context for AI grounding.
    Combines geocoding, place search, and nearby landmarks.

    Args:
        venue_name: Name of the venue
        city: City where venue is located
        state: State/province
        country: Country (default USA)
        lat: Optional latitude (skips geocoding if provided)
        lng: Optional longitude (skips geocoding if provided)

    Returns:
        Dictionary with venue details, nearby places, and prompt_fragment
    """
    api_key = os.environ.get("GOOGLE_MAPS_API_KEY")

    # Step 1: Geocode if needed
    if lat is None or lng is None:
        address = f"{venue_name}, {city}, {state}, {country}".strip(", ")
        if api_key:
            geo = maps_geocode(address)
            if "error" not in geo and geo.get("results"):
                loc = geo["results"][0]["geometry"]["location"]
                lat, lng = loc["lat"], loc["lng"]

        if lat is None:
            # Fallback to Nominatim (free)
            try:
                url = "https://nominatim.openstreetmap.org/search"
                params = {"q": address, "format": "json", "limit": 1}
                headers = {"User-Agent": "ClaudeMCPServer/1.0"}
                response = requests.get(url, params=params, headers=headers, timeout=10)
                results = response.json()
                if results:
                    lat = float(results[0]["lat"])
                    lng = float(results[0]["lon"])
            except:
                pass

    if lat is None or lng is None:
        return {"error": f"Could not geocode venue: {venue_name} in {city}, {state}"}

    result = {
        "venue": {
            "name": venue_name,
            "city": city,
            "state": state,
            "country": country
        },
        "coordinates": {"lat": lat, "lng": lng},
        "nearby": [],
        "place_details": None
    }

    # Step 2: Find the venue on Google Places (if API key available)
    if api_key:
        try:
            nearby = maps_nearby_search(
                location=f"{lat},{lng}",
                radius=500,
                keyword=venue_name
            )
            if "error" not in nearby:
                places = nearby.get("results", [])
                if places:
                    # Get details of the first matching place
                    place_id = places[0].get("place_id")
                    if place_id:
                        details = maps_place_details(place_id)
                        if "error" not in details:
                            detail = details.get("result", {})
                            result["place_details"] = {
                                "address": detail.get("formatted_address"),
                                "rating": detail.get("rating"),
                                "types": detail.get("types", []),
                                "website": detail.get("website")
                            }

            # Step 3: Get nearby landmarks
            landmarks = maps_nearby_search(
                location=f"{lat},{lng}",
                radius=500,
                place_type="point_of_interest"
            )
            if "error" not in landmarks:
                for place in landmarks.get("results", [])[:5]:
                    name = place.get("name", "")
                    if name.lower() != venue_name.lower():
                        result["nearby"].append({
                            "name": name,
                            "types": place.get("types", [])
                        })
        except:
            pass

    # Build prompt fragment
    venue_type = ""
    if result["place_details"] and result["place_details"].get("types"):
        types = result["place_details"]["types"]
        type_map = {
            "bar": "bar",
            "night_club": "nightclub",
            "restaurant": "restaurant",
            "stadium": "stadium",
            "park": "outdoor park",
            "museum": "museum"
        }
        for t in types:
            if t in type_map:
                venue_type = type_map[t]
                break

    nearby_text = ""
    if result["nearby"]:
        nearby_names = [p["name"] for p in result["nearby"][:3]]
        nearby_text = f", near {', '.join(nearby_names)}"

    type_text = f" {venue_type}" if venue_type else ""
    result["prompt_fragment"] = f"{venue_name}{type_text} in {city}{', ' + state if state else ''}{nearby_text}"

    return result


@mcp.tool()
def full_grounding_context(
    venue_name: str,
    city: str,
    state: str = "",
    country: str = "USA",
    time_of_day: Optional[str] = None
) -> dict:
    """
    Complete grounding context combining venue + weather + lighting.
    Designed for enriching AI image generation prompts.

    Args:
        venue_name: Name of the venue or location
        city: City name
        state: State/province
        country: Country (default USA)
        time_of_day: Optional time like "1:15am", "sunset", "noon"

    Returns:
        Dictionary with complete grounding data and prompt_fragment
    """
    # Get venue context
    venue = venue_grounding_context(venue_name, city, state, country)
    if "error" in venue:
        return venue

    lat = venue["coordinates"]["lat"]
    lng = venue["coordinates"]["lng"]

    # Get weather from wttr.in (free, no API key needed)
    weather_data = {}
    lighting = "natural light"
    try:
        response = requests.get(
            f"https://wttr.in/{lat},{lng}?format=j1",
            timeout=10,
            headers={"User-Agent": "curl"}
        )
        response.raise_for_status()
        data = response.json()

        current = data.get("current_condition", [{}])[0]
        weather_data = {
            "temperature_f": current.get("temp_F", "?"),
            "condition": current.get("weatherDesc", [{}])[0].get("value", "clear"),
            "humidity": current.get("humidity", "?"),
            "wind_mph": current.get("windspeedMiles", "0"),
            "wind_direction": current.get("winddir16Point", "")
        }

        # Get sunrise/sunset
        days = data.get("weather", [])
        if days:
            astro = days[0].get("astronomy", [{}])
            if astro:
                weather_data["sunrise"] = astro[0].get("sunrise", "")
                weather_data["sunset"] = astro[0].get("sunset", "")
    except:
        weather_data = {"temperature_f": "?", "condition": "unknown"}

    # Determine lighting
    hour = datetime.now().hour
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

    if 5 <= hour < 7:
        lighting = "pre-dawn to sunrise"
    elif 7 <= hour < 10:
        lighting = "morning golden light"
    elif 10 <= hour < 14:
        lighting = "midday sun"
    elif 14 <= hour < 17:
        lighting = "afternoon warmth"
    elif 17 <= hour < 19:
        lighting = "golden hour"
    elif 19 <= hour < 21:
        lighting = "dusk twilight"
    else:
        lighting = "nighttime, artificial/neon lighting"

    # Build wind description
    wind_desc = "calm"
    try:
        wind_val = int(weather_data.get("wind_mph", 0))
        wind_dir = weather_data.get("wind_direction", "")
        if wind_val < 5:
            wind_desc = "still air"
        elif wind_val < 15:
            wind_desc = f"gentle {wind_dir} breeze"
        elif wind_val < 25:
            wind_desc = f"moderate {wind_dir} wind"
        else:
            wind_desc = f"strong {wind_dir} wind"
    except (ValueError, TypeError):
        pass

    # Build complete prompt fragment
    temp = weather_data.get("temperature_f", "?")
    condition = weather_data.get("condition", "clear").lower()
    venue_frag = venue.get("prompt_fragment", f"{venue_name} in {city}")

    prompt_fragment = f"{venue_frag}, {temp}F {condition}, {lighting}, {wind_desc}"

    return {
        "venue": venue.get("venue"),
        "coordinates": venue.get("coordinates"),
        "place_details": venue.get("place_details"),
        "nearby": venue.get("nearby"),
        "weather": weather_data,
        "lighting": {
            "hour": hour,
            "description": lighting
        },
        "prompt_fragment": prompt_fragment
    }


# =============================================================================
# GOOGLE CUSTOM SEARCH API TOOLS
# =============================================================================

@mcp.tool()
def google_search(
    query: str,
    num_results: int = 10,
    start: int = 1,
    search_type: Optional[str] = None,
    site_search: Optional[str] = None,
    date_restrict: Optional[str] = None
) -> dict:
    """
    Search the web using Google Custom Search API.

    Args:
        query: Search query string
        num_results: Number of results (1-10)
        start: Starting index for pagination (1-based)
        search_type: Set to "image" for image search, leave None for web search
        site_search: Limit search to a specific site (e.g., "stackoverflow.com")
        date_restrict: Restrict results by date (e.g., "d7" for past week, "m1" for past month, "y1" for past year)

    Returns:
        Dictionary containing search results with titles, snippets, and links
    """
    api_key = os.environ.get("GOOGLE_CUSTOM_SEARCH_API_KEY")
    search_engine_id = os.environ.get("GOOGLE_SEARCH_ENGINE_ID")

    if not api_key:
        return {"error": "GOOGLE_CUSTOM_SEARCH_API_KEY not set. Please add it to your .env file."}
    if not search_engine_id:
        return {"error": "GOOGLE_SEARCH_ENGINE_ID not set. Please add it to your .env file."}

    url = "https://www.googleapis.com/customsearch/v1"
    params = {
        "key": api_key,
        "cx": search_engine_id,
        "q": query,
        "num": min(max(num_results, 1), 10),
        "start": start
    }

    if search_type:
        params["searchType"] = search_type
    if site_search:
        params["siteSearch"] = site_search
    if date_restrict:
        params["dateRestrict"] = date_restrict

    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()

        # Simplify the response for easier consumption
        simplified = {
            "query": query,
            "total_results": data.get("searchInformation", {}).get("totalResults", "0"),
            "search_time": data.get("searchInformation", {}).get("searchTime", 0),
            "results": []
        }

        for item in data.get("items", []):
            simplified["results"].append({
                "title": item.get("title"),
                "link": item.get("link"),
                "snippet": item.get("snippet"),
                "display_link": item.get("displayLink")
            })

        return simplified
    except requests.RequestException as e:
        return {"error": str(e)}


@mcp.tool()
def google_image_search(
    query: str,
    num_results: int = 10,
    img_size: Optional[str] = None,
    img_type: Optional[str] = None
) -> dict:
    """
    Search for images using Google Custom Search API.

    Args:
        query: Search query string
        num_results: Number of results (1-10)
        img_size: Image size filter - "huge", "icon", "large", "medium", "small", "xlarge", "xxlarge"
        img_type: Image type filter - "clipart", "face", "lineart", "stock", "photo", "animated"

    Returns:
        Dictionary containing image search results with thumbnails and links
    """
    api_key = os.environ.get("GOOGLE_CUSTOM_SEARCH_API_KEY")
    search_engine_id = os.environ.get("GOOGLE_SEARCH_ENGINE_ID")

    if not api_key:
        return {"error": "GOOGLE_CUSTOM_SEARCH_API_KEY not set. Please add it to your .env file."}
    if not search_engine_id:
        return {"error": "GOOGLE_SEARCH_ENGINE_ID not set. Please add it to your .env file."}

    url = "https://www.googleapis.com/customsearch/v1"
    params = {
        "key": api_key,
        "cx": search_engine_id,
        "q": query,
        "num": min(max(num_results, 1), 10),
        "searchType": "image"
    }

    if img_size:
        params["imgSize"] = img_size
    if img_type:
        params["imgType"] = img_type

    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()

        # Simplify the response
        simplified = {
            "query": query,
            "total_results": data.get("searchInformation", {}).get("totalResults", "0"),
            "results": []
        }

        for item in data.get("items", []):
            simplified["results"].append({
                "title": item.get("title"),
                "link": item.get("link"),
                "thumbnail": item.get("image", {}).get("thumbnailLink"),
                "context_link": item.get("image", {}).get("contextLink"),
                "width": item.get("image", {}).get("width"),
                "height": item.get("image", {}).get("height")
            })

        return simplified
    except requests.RequestException as e:
        return {"error": str(e)}


# =============================================================================
# SERVER ENTRY POINT
# =============================================================================

if __name__ == "__main__":
    print("Starting Google APIs MCP Server...")
    print("Available tools:")
    print("  - maps_geocode: Convert address to coordinates")
    print("  - maps_reverse_geocode: Convert coordinates to address")
    print("  - maps_nearby_search: Find nearby places")
    print("  - maps_place_details: Get place details")
    print("  - maps_directions: Get directions between locations")
    print("  - maps_distance_matrix: Calculate distances between multiple points")
    print("  - google_search: Web search")
    print("  - google_image_search: Image search")
    print()
    mcp.run()

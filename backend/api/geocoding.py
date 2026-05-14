"""
Geocoding and routing utilities using free APIs:
- Nominatim (OpenStreetMap) for geocoding
- OSRM public API for routing
"""

import requests
import time
import math
from typing import Tuple, Dict, Optional, List


NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
OSRM_URL = "http://router.project-osrm.org/route/v1/driving"
HEADERS = {"User-Agent": "SpotterTripPlanner/1.0 (trip-planning-assessment)"}

KM_TO_MILES = 0.621371
MS_TO_MPH = 2.23694


def geocode(location: str) -> Tuple[float, float]:
    """
    Returns (lat, lon) for a given address string.
    Raises ValueError if not found.
    """
    params = {
        "q": location,
        "format": "json",
        "limit": 1,
    }
    try:
        resp = requests.get(NOMINATIM_URL, params=params, headers=HEADERS, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        if not data:
            raise ValueError(f"Could not geocode: {location}")
        return float(data[0]["lat"]), float(data[0]["lon"])
    except requests.RequestException as e:
        raise ValueError(f"Geocoding failed for '{location}': {e}")


def get_route(origin_coords: Tuple[float, float],
              dest_coords: Tuple[float, float]) -> Dict:
    """
    Get route from OSRM.
    Returns dict with distance_miles, duration_hours, geometry (GeoJSON LineString coords)
    """
    lat1, lon1 = origin_coords
    lat2, lon2 = dest_coords

    url = f"{OSRM_URL}/{lon1},{lat1};{lon2},{lat2}"
    params = {
        "overview": "full",
        "geometries": "geojson",
        "steps": "false",
    }
    try:
        resp = requests.get(url, params=params, headers=HEADERS, timeout=15)
        resp.raise_for_status()
        data = resp.json()

        if data.get("code") != "Ok" or not data.get("routes"):
            # Fallback to haversine
            return _fallback_route(origin_coords, dest_coords)

        route = data["routes"][0]
        distance_km = route["distance"] / 1000
        distance_miles = distance_km * KM_TO_MILES
        duration_hours = route["duration"] / 3600

        geometry = route["geometry"]["coordinates"]  # [[lon, lat], ...]

        return {
            "distance_miles": round(distance_miles, 1),
            "duration_hours": round(duration_hours, 2),
            "geometry": geometry,
        }
    except Exception:
        return _fallback_route(origin_coords, dest_coords)


def _fallback_route(origin: Tuple[float, float], dest: Tuple[float, float]) -> Dict:
    """Haversine straight-line distance fallback"""
    dist_miles = haversine_miles(origin, dest)
    # Multiply by 1.3 for road factor
    dist_miles *= 1.3
    duration_hours = dist_miles / 55.0
    return {
        "distance_miles": round(dist_miles, 1),
        "duration_hours": round(duration_hours, 2),
        "geometry": [
            [origin[1], origin[0]],
            [dest[1], dest[0]],
        ],
    }


def haversine_miles(coord1: Tuple[float, float], coord2: Tuple[float, float]) -> float:
    """Calculate great-circle distance in miles"""
    R = 3958.8  # Earth radius in miles
    lat1, lon1 = math.radians(coord1[0]), math.radians(coord1[1])
    lat2, lon2 = math.radians(coord2[0]), math.radians(coord2[1])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    return R * c

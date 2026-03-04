
import json
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Dict, List
from urllib.parse import urlencode
from urllib.request import urlopen


def _fetch_coordinates(location: str, api_key: str, url: str) -> Dict[str, float]:
    query = urlencode(
        {
            "address": location,
            "key": api_key,
        }
    )

    with urlopen(f"{url}?{query}", timeout=20) as response:
        data = json.loads(response.read().decode("utf-8"))
        if data["status"] == "OK":
            return {
                "lat": data["results"][0]["geometry"]["location"]["lat"],
                "lng": data["results"][0]["geometry"]["location"]["lng"],
            }
        raise ValueError(f"Google Maps API error for '{location}': {data['status']}")


def google_maps_coordinates(locations: List[str]) -> Dict[str, Dict[str, float]]:
    """Given multiple locations, returns their coordinates in parallel using Google Maps API."""
    url = "https://maps.googleapis.com/maps/api/geocode/json"

    api_key = (os.getenv("GOOGLE_MAPS_API_KEY") or "").strip()
    if not api_key:
        raise ValueError("GOOGLE_MAPS_API_KEY is required for google_maps_coordinates.")

    if isinstance(locations, str):
        raise TypeError("locations must be a list of location strings, not a single string.")

    normalized_locations = [location.strip() for location in locations if location and location.strip()]
    if not normalized_locations:
        return {}

    coordinates: Dict[str, Dict[str, float]] = {}
    errors: Dict[str, str] = {}
    max_workers = min(10, len(normalized_locations))

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_location = {
            executor.submit(_fetch_coordinates, location, api_key, url): location
            for location in normalized_locations
        }
        for future in as_completed(future_to_location):
            location = future_to_location[future]
            try:
                coordinates[location] = future.result()
            except Exception as exc:
                errors[location] = str(exc)

    if errors:
        failed_locations = ", ".join(sorted(errors.keys()))
        raise ValueError(f"Failed to fetch coordinates for: {failed_locations}")

    return coordinates



if __name__ == "__main__":
    locations = ["Eiffel Tower, Paris", "Statue of Liberty, New York", "Colosseum, Rome"]
    coordinates = google_maps_coordinates(locations)
    print(f"Coordinates: {coordinates}")


import json
import os
from typing import Any
from urllib.parse import urlencode
from urllib.request import urlopen

def google_maps_coordinates(location:str):
    """Giving a location, returns the coordinates of that location using Google Maps API."""
    url = "https://maps.googleapis.com/maps/api/geocode/json"
    

    api_key = (os.getenv("GOOGLE_MAPS_API_KEY") or "").strip()
    if not api_key:
        raise ValueError("GOOGLE_MAPS_API_KEY is required for google_maps_coordinates.")
    
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
        else:
            raise ValueError(f"Google Maps API error: {data['status']}")



if __name__ == "__main__":
    location = "Eiffel Tower, Paris"
    coordinates = google_maps_coordinates(location)
    print(f"Coordinates of {location}: {coordinates}")
"""Google Places photo lookup tool."""

import json
import os
from typing import Any
from urllib.parse import urlencode
from urllib.request import urlopen

GOOGLE_FIND_PLACE_URL = "https://maps.googleapis.com/maps/api/place/findplacefromtext/json"
GOOGLE_PLACE_PHOTO_URL = "https://maps.googleapis.com/maps/api/place/photo"


def _get_api_key() -> str:
    api_key = (os.getenv("GOOGLE_MAPS_API_KEY") or "").strip()
    if not api_key:
        raise ValueError("GOOGLE_MAPS_API_KEY is required for google_place_photos.")
    return api_key


def _get_json(url: str, params: dict[str, Any]) -> dict[str, Any]:
    query = urlencode(params)
    with urlopen(f"{url}?{query}", timeout=20) as response:
        payload = response.read().decode("utf-8")
    return json.loads(payload)


def _build_photo_url(photo_reference: str, api_key: str, max_width: int) -> str:
    query = urlencode(
        {
            "maxwidth": max(200, min(max_width, 1600)),
            "photo_reference": photo_reference,
            "key": api_key,
        }
    )
    return f"{GOOGLE_PLACE_PHOTO_URL}?{query}"


def _normalize_locations(locations: list[str] | str) -> list[str]:
    if isinstance(locations, str):
        locations = [locations]
    return [location.strip() for location in locations if isinstance(location, str) and location.strip()]


def google_place_photos(
    locations: list[str] | str,
    region: str | None = None,
    language: str = "en",
    max_width: int = 800,
) -> str:
    """Fetch Google Places photo URLs for one or more locations."""
    normalized_locations = _normalize_locations(locations)
    if not normalized_locations:
        raise ValueError("google_place_photos requires at least one location string.")

    api_key = _get_api_key()
    results: list[dict[str, Any]] = []

    for location in normalized_locations:
        params: dict[str, Any] = {
            "input": location,
            "inputtype": "textquery",
            "fields": "name,place_id,formatted_address,photos",
            "language": language,
            "key": api_key,
        }
        if region:
            params["region"] = region

        try:
            payload = _get_json(GOOGLE_FIND_PLACE_URL, params)
            status = payload.get("status", "UNKNOWN_ERROR")
            candidates = payload.get("candidates", [])

            if status != "OK" or not candidates:
                results.append(
                    {
                        "query": location,
                        "status": status,
                        "image_url": None,
                        "error": payload.get("error_message") or "No place match found.",
                    }
                )
                continue

            candidate = candidates[0]
            photos = candidate.get("photos", [])
            photo_reference = photos[0].get("photo_reference") if photos else None
            image_url = _build_photo_url(photo_reference, api_key, max_width) if photo_reference else None

            results.append(
                {
                    "query": location,
                    "status": "OK",
                    "name": candidate.get("name"),
                    "place_id": candidate.get("place_id"),
                    "formatted_address": candidate.get("formatted_address"),
                    "image_url": image_url,
                }
            )
        except Exception as exc:
            results.append(
                {
                    "query": location,
                    "status": "REQUEST_FAILED",
                    "image_url": None,
                    "error": str(exc),
                }
            )

    return json.dumps({"provider": "google_places", "results": results})

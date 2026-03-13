"""Google Places photo lookup tool."""

import json
import os
from typing import Any
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

GOOGLE_TEXT_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText"
GOOGLE_PLACE_PHOTO_URL = "https://places.googleapis.com/v1"


def _get_api_key() -> str:
    api_key = (os.getenv("GOOGLE_MAPS_API_KEY") or "").strip()
    if not api_key:
        raise ValueError("GOOGLE_MAPS_API_KEY is required for google_place_photos.")
    return api_key


def _request_json(
    url: str,
    *,
    method: str = "GET",
    params: dict[str, Any] | None = None,
    payload: dict[str, Any] | None = None,
    headers: dict[str, str] | None = None,
) -> dict[str, Any]:
    request_url = url
    if params:
        request_url = f"{url}?{urlencode(params)}"

    request_headers = headers or {}
    request_data = None
    if payload is not None:
        request_data = json.dumps(payload).encode("utf-8")
        request_headers = {
            "Content-Type": "application/json",
            **request_headers,
        }

    request = Request(
        request_url,
        data=request_data,
        headers=request_headers,
        method=method,
    )

    try:
        with urlopen(request, timeout=20) as response:
            body = response.read().decode("utf-8")
    except HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        try:
            error_payload = json.loads(body)
        except json.JSONDecodeError as decode_error:
            raise ValueError(f"Google Places request failed: HTTP {exc.code}") from decode_error

        error = error_payload.get("error", {})
        message = error.get("message") or body or f"HTTP {exc.code}"
        raise ValueError(f"Google Places request failed: {message}") from exc

    return json.loads(body)


def _photo_width(max_width: int) -> int:
    return max(1, min(max_width, 4800))


def _normalize_locations(locations: list[str] | str) -> list[str]:
    if isinstance(locations, str):
        locations = [locations]
    return [location.strip() for location in locations if isinstance(location, str) and location.strip()]


def _fetch_photo_uri(photo_name: str, api_key: str, max_width: int) -> str | None:
    payload = _request_json(
        f"{GOOGLE_PLACE_PHOTO_URL}/{photo_name}/media",
        params={
            "maxWidthPx": _photo_width(max_width),
            "skipHttpRedirect": "true",
            "key": api_key,
        },
    )
    return payload.get("photoUri")


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
        payload: dict[str, Any] = {
            "textQuery": location,
            "languageCode": language,
        }
        if region:
            payload["regionCode"] = region.upper()

        try:
            search_payload = _request_json(
                GOOGLE_TEXT_SEARCH_URL,
                method="POST",
                payload=payload,
                headers={
                    "X-Goog-Api-Key": api_key,
                    "X-Goog-FieldMask": (
                        "places.id,"
                        "places.name,"
                        "places.displayName,"
                        "places.formattedAddress,"
                        "places.photos"
                    ),
                },
            )
            candidates = search_payload.get("places", [])

            if not candidates:
                results.append(
                    {
                        "query": location,
                        "status": "NOT_FOUND",
                        "image_url": None,
                        "error": "No place match found.",
                    }
                )
                continue

            candidate = candidates[0]
            photos = candidate.get("photos", [])
            photo = photos[0] if photos else {}
            photo_name = photo.get("name")
            image_url = _fetch_photo_uri(photo_name, api_key, max_width) if photo_name else None

            results.append(
                {
                    "query": location,
                    "status": "OK",
                    "name": candidate.get("displayName", {}).get("text"),
                    "place_id": candidate.get("id"),
                    "formatted_address": candidate.get("formattedAddress"),
                    "image_url": image_url,
                    "photo_name": photo_name,
                    "photo_attributions": photo.get("authorAttributions", []),
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

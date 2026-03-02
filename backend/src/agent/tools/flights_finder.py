"""Google Flights data tool powered by SerpApi."""

import json
import os
from typing import Any, Literal
from urllib.parse import urlencode
from urllib.request import urlopen

SERPAPI_URL = "https://serpapi.com/search.json"


def _get_serpapi_key() -> str:
    api_key = (os.getenv("SERPAPI_API_KEY") or "").strip()
    if not api_key:
        raise ValueError("SERPAPI_API_KEY is required for flights_finder.")
    return api_key


def flights_finder(
    origin: str,
    destination: str,
    departure_date: str,
    return_date: str | None = None,
    adults: int = 1,
    travel_class: Literal["ECONOMY", "PREMIUM_ECONOMY", "BUSINESS", "FIRST"] = "ECONOMY",
    max_price: int | None = None,
    currency: str = "USD",
    language: str = "en",
    country: str = "us",
) -> str:
    """Fetch Google Flights results from SerpApi and return JSON."""
    if not origin.strip() or not destination.strip():
        raise ValueError("origin and destination are required.")

    normalized_adults = max(1, min(adults, 9))
    api_key = _get_serpapi_key()

    params: dict[str, Any] = {
        "engine": "google_flights",
        "api_key": api_key,
        "departure_id": origin.strip(),
        "arrival_id": destination.strip(),
        "outbound_date": departure_date,
        "adults": normalized_adults,
        "currency": currency,
        "hl": language,
        "gl": country,
        "travel_class": travel_class,
    }

    if return_date:
        params["return_date"] = return_date

    if max_price is not None:
        params["max_price"] = max(1, max_price)

    query = urlencode(params)
    with urlopen(f"{SERPAPI_URL}?{query}", timeout=30) as response:
        payload = json.loads(response.read().decode("utf-8"))

    if payload.get("error"):
        raise ValueError(f"SerpApi error: {payload['error']}")

    result = {
        "provider": "serpapi_google_flights",
        "search_metadata": payload.get("search_metadata"),
        "search_parameters": payload.get("search_parameters"),
        "best_flights": payload.get("best_flights", []),
        "other_flights": payload.get("other_flights", []),
        "price_insights": payload.get("price_insights"),
        "airports": payload.get("airports"),
    }
    return json.dumps(result)

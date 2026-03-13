"""Flight search tool powered by fast-flights (Google Flights scraper)."""

import json
import os
import re
from typing import Any, List
from fast_flights import FlightData, Passengers, get_flights
from langgraph.types import interrupt
from typing_extensions import TypedDict


def _normalize_iata_code(value: str, label: str) -> str:
    normalized = (value or "").strip().upper()
    if len(normalized) != 3 or not normalized.isalpha():
        raise ValueError(f"{label} must be a 3-letter IATA code like 'JFK'.")
    return normalized


def _normalize_route_date(value: str, label: str) -> str:
    text = (value or "").strip()
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", text):
        raise ValueError(f"{label} must use YYYY-MM-DD format.")
    return text


def _parse_int(value: Any, default: int = 0) -> int:
    """Safely parse a value to int, handling strings like '$288', 'typical', etc."""
    if value is None:
        return default
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        return int(value)
    if isinstance(value, str):
        # Extract all digits and join them
        digits = re.findall(r'\d+', value)
        if digits:
            return int(digits[0])
        return default
    return default


def _parse_float(value: Any, default: float | None) -> float | None:
    """Safely parse a value to float."""
    if value is None:
        return default
    if isinstance(value, (float, int)):
        return float(value)
    if isinstance(value, str):
        digits = re.findall(r"\d+(?:\.\d+)?", value.replace(",", ""))
        if digits:
            return float(digits[0])
    return default


def _parse_str(value: Any, default: str = "N/A") -> str:
    """Safely parse a value to string."""
    if value is None:
        return default
    return str(value)


def _normalize_travel_class(value: str) -> str:
    normalized = (value or "economy").strip().replace("-", "_").lower()
    if normalized in {"economy", "premium_economy", "business", "first"}:
        return normalized
    return "economy"


class FlightOption(TypedDict, total=False):
    id: str
    option_id: int
    price: int
    airline: str
    departure_airport: str
    arrival_airport: str
    departure_time: str
    arrival_time: str
    arrival_time_ahead: str
    duration: str
    stops: int
    cabin: str
    is_best: bool
    delay: str
    price_level: str


def _parse_duration_minutes(value: Any) -> int:
    """Convert duration strings like '14h 35m' into minutes for ranking."""
    if value is None:
        return 0
    if isinstance(value, (int, float)):
        return int(value)

    text = str(value).lower()
    hours_match = re.search(r"(\d+)\s*h", text)
    minutes_match = re.search(r"(\d+)\s*m", text)
    hours = int(hours_match.group(1)) if hours_match else 0
    minutes = int(minutes_match.group(1)) if minutes_match else 0
    return (hours * 60) + minutes


def _flight_score(flight: FlightOption) -> float:
    """Lower scores are better: prioritize fewer stops, lower fares, and shorter trips."""
    price = _parse_int(flight.get("price"))
    stops = _parse_int(flight.get("stops"))
    duration_minutes = _parse_duration_minutes(flight.get("duration"))
    return price + (stops * 200) + (duration_minutes * 0.5)


def _search_parameters_payload(
    origin: str,
    destination: str,
    departure_date: str,
    return_date: str | None,
) -> dict[str, str | None]:
    return {
        "origin": origin.strip().upper(),
        "destination": destination.strip().upper(),
        "departure_date": departure_date,
        "return_date": return_date,
    }


def _flight_search_unavailable_payload(
    origin: str,
    destination: str,
    departure_date: str,
    return_date: str | None,
    error_messages: list[str],
) -> str:
    return json.dumps(
        {
            "type": "no_flights_found",
            "message": "Flight search is temporarily unavailable. Please try again later.",
            "search_parameters": _search_parameters_payload(
                origin, destination, departure_date, return_date
            ),
            "error": {
                "code": "flight_search_unavailable",
                "details": error_messages,
            },
        },
        indent=2,
    )


def _resolve_fetch_modes() -> list[str]:
    configured_mode = os.getenv("FAST_FLIGHTS_FETCH_MODE", "").strip().lower()
    if configured_mode:
        return [configured_mode]

    modes = ["common", "local"]
    if os.getenv("FAST_FLIGHTS_ALLOW_REMOTE_FALLBACK", "").strip().lower() in {
        "1",
        "true",
        "yes",
    }:
        modes.append("fallback")
    return modes


def flights_finder(
    origin: str,
    destination: str,
    departure_date: str,
    return_date: str | None = None,
    adults: int = 1,
    travel_class: str = "economy",
    max_price: int | None = None,
    currency: str = "USD",
    language: str = "en",
    country: str = "us",
) -> str:
    """Get live Google Flights data and let user select their preferred flight."""
    if not origin.strip() or not destination.strip():
        raise ValueError("origin and destination are required.")

    normalized_origin = _normalize_iata_code(origin, "origin")
    normalized_destination = _normalize_iata_code(destination, "destination")
    normalized_departure_date = _normalize_route_date(departure_date, "departure_date")
    normalized_return_date = (
        _normalize_route_date(return_date, "return_date") if return_date else None
    )
    if normalized_origin == normalized_destination:
        raise ValueError("origin and destination must be different airports.")

    normalized_adults = int(max(1, min(adults, 9)))
    if adults != normalized_adults:
        raise ValueError("adults must be between 1 and 9.")

    max_budget = _parse_float(max_price, None) if max_price is not None else None
    if max_budget is not None and max_budget <= 0:
        raise ValueError("max_price must be a positive number.")

    normalized_travel_class = _normalize_travel_class(travel_class)
    normalized_seat = normalized_travel_class.replace("_", "-")
    normalized_currency = (currency or "USD").strip().upper() or "USD"

    trip_type = "round-trip" if return_date else "one-way"

    flight_data_list = [
        FlightData(
            date=normalized_departure_date,
            from_airport=normalized_origin,
            to_airport=normalized_destination,
        )
    ]

    print(
        f"Fetching flights for {normalized_origin} to {normalized_destination} on"
        f" {normalized_departure_date} with {normalized_adults} adult(s) in"
        f" {normalized_travel_class} class."
    )
    if return_date:
        flight_data_list.append(
            FlightData(
                date=normalized_return_date,
                from_airport=normalized_destination,
                to_airport=normalized_origin,
            )
        )

    fetch_errors: list[str] = []
    result = None
    for fetch_mode in _resolve_fetch_modes():
        try:
            result = get_flights(
                flight_data=flight_data_list,
                trip=trip_type,
                seat=normalized_seat,  # type: ignore[arg-type]
                passengers=Passengers(adults=normalized_adults),
                fetch_mode=fetch_mode,  # type: ignore[arg-type]
            )
            print(
                "Fetched "
                f"{len(result.flights) if result.flights else 0} flights "
                f"using mode={fetch_mode}. Current price: {result.current_price}"
            )
            print(f"Raw flight data: {result.flights}")
            break
        except Exception as e:
            fetch_errors.append(f"{fetch_mode}: {str(e)}")

    if result is None:
        return _flight_search_unavailable_payload(
            origin,
            destination,
            normalized_departure_date,
            normalized_return_date,
            fetch_errors,
        )

    flights_data: List[FlightOption] = []
    
    price_level = _parse_str(getattr(result, "current_price", None), "")

    if result.flights:
        for flight in result.flights:
            # fast-flights Flight dataclass fields:
            #   is_best, name, departure, arrival, arrival_time_ahead,
            #   duration, stops, delay, price
            flight_info: FlightOption = {
                "id": _parse_str(getattr(flight, "id", None), ""),
                "option_id": 0,
                "price": _parse_int(getattr(flight, "price", None), 0),
                "airline": _parse_str(
                    getattr(flight, "name", None) or getattr(flight, "airline", None),
                    "Unknown",
                ),
                "departure_airport": normalized_origin,
                "arrival_airport": normalized_destination,
                "departure_time": _parse_str(
                    getattr(flight, "departure", None)
                    or getattr(flight, "departure_time", None)
                ),
                "arrival_time": _parse_str(
                    getattr(flight, "arrival", None)
                    or getattr(flight, "arrival_time", None)
                ),
                "arrival_time_ahead": _parse_str(getattr(flight, "arrival_time_ahead", None), ""),
                "duration": _parse_str(getattr(flight, "duration", None)),
                "stops": _parse_int(getattr(flight, "stops", None)),
                "cabin": _parse_str(getattr(flight, "cabin", None), normalized_travel_class),
                "is_best": bool(getattr(flight, "is_best", False)),
                "delay": _parse_str(getattr(flight, "delay", None), ""),
                "price_level": price_level,
            }

            if max_budget is not None and flight_info["price"] > max_budget:
                continue
            flights_data.append(flight_info)

    if not flights_data:
        return json.dumps(
            {
                "type": "no_flights_found",
                "message": (
                    f"No flights found from {normalized_origin} to {normalized_destination} "
                    f"on {normalized_departure_date}"
                ),
                "search_parameters": _search_parameters_payload(
                    normalized_origin,
                    normalized_destination,
                    normalized_departure_date,
                    normalized_return_date,
                ),
            },
            indent=2,
        )

    ranked_flights = sorted(flights_data, key=_flight_score)[:3]
    for index, flight in enumerate(ranked_flights, start=1):
        flight["option_id"] = index

    # Use interrupt to create a selection UI in the frontend
    answer = interrupt(
        {
            "type": "select_flight",
            "prompt": f"I found the top 3 flight options from {normalized_origin} to {normalized_destination}. Please select your preferred flight.",
            "flight_options": ranked_flights,
            "options_count": len(ranked_flights),
            "flights": ranked_flights,
            "search_params": {
                "origin": normalized_origin,
                "destination": normalized_destination,
                "departure_date": normalized_departure_date,
                "return_date": normalized_return_date,
                "adults": normalized_adults,
                "travel_class": normalized_travel_class,
                "trip_type": trip_type,
                "currency": normalized_currency,
            },
            "price_info": {
                "current_price": _parse_str(result.current_price, ""),
            },
        }
    )

    # Return the user's selection (full flight details from frontend)
    if isinstance(answer, dict):
        # If the frontend sent a full flight object, wrap it for downstream use
        return json.dumps({"selected_flight": answer})
    return json.dumps({"selected_flight": answer})


if __name__ == "__main__":
    # Example usage
    print(flights_finder(
        origin="JFK",
        destination="LAX",
        departure_date="2024-12-01",
        return_date="2024-12-10",
        adults=1,
        travel_class="economy"
    ))

"""Flight search tool powered by fast-flights (Google Flights scraper)."""

import json
import re
from typing import Any, List
from fast_flights import FlightData, Passengers, get_flights
from langgraph.types import interrupt
from typing_extensions import TypedDict


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
    option_id: int
    id: str
    price: int
    airline: str
    departure_airport: str
    arrival_airport: str
    departure_time: str
    arrival_time: str
    duration: str
    stops: int
    cabin: str


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

    normalized_adults = max(1, min(adults, 9))
    normalized_travel_class = _normalize_travel_class(travel_class)
    normalized_seat = normalized_travel_class.replace("_", "-")

    trip_type = "round-trip" if return_date else "one-way"
    
    flight_data_list = [
        FlightData(
            date=departure_date,
            from_airport=origin.strip().upper(),
            to_airport=destination.strip().upper(),
        )
    ]
    print(f"Fetching flights for {origin.strip().upper()} to {destination.strip().upper()} on {departure_date} with {normalized_adults} adult(s) in {normalized_travel_class} class.")
    if return_date:
        flight_data_list.append(
            FlightData(
                date=return_date,
                from_airport=destination.strip().upper(),
                to_airport=origin.strip().upper(),
            )
        )

    try:
        result = get_flights(
            flight_data=flight_data_list,
            trip=trip_type,
            seat=normalized_seat,  # type: ignore[arg-type]
            passengers=Passengers(adults=normalized_adults),
            fetch_mode="fallback",
        )
        print(f"Fetched {len(result.flights) if result.flights else 0} flights. Current price: {result.current_price}")
        print(f"Raw flight data: {result.flights}")
    except Exception as e:
        raise ValueError(f"Failed to fetch flights: {str(e)}")

    flights_data: List[FlightOption] = []
    
    if result.flights:
        for i, flight in enumerate(result.flights):
            flight_dict = flight.__dict__ if hasattr(flight, '__dict__') else {}
            
            flight_info: FlightOption = {
                "option_id": i + 1,
                "id": _parse_str(flight_dict.get("id"), f"flight_{i}"),
                "price": _parse_int(flight_dict.get("price"), _parse_int(result.current_price)),
                "airline": _parse_str(flight_dict.get("airline"), "Unknown"),
                "departure_airport": _parse_str(flight_dict.get("departure_airport"), origin.strip().upper()),
                "arrival_airport": _parse_str(flight_dict.get("arrival_airport"), destination.strip().upper()),
                "departure_time": _parse_str(flight_dict.get("departure_time")),
                "arrival_time": _parse_str(flight_dict.get("arrival_time")),
                "duration": _parse_str(flight_dict.get("duration")),
                "stops": _parse_int(flight_dict.get("stops")),
                "cabin": _parse_str(flight_dict.get("cabin"), normalized_travel_class),
            }
            flights_data.append(flight_info)

    if not flights_data:
        return json.dumps({
            "type": "no_flights_found",
            "message": f"No flights found from {origin.strip().upper()} to {destination.strip().upper()} on {departure_date}",
            "search_parameters": {
                "origin": origin.strip().upper(),
                "destination": destination.strip().upper(),
                "departure_date": departure_date,
                "return_date": return_date,
            }
        }, indent=2)

    ranked_flights = sorted(flights_data, key=_flight_score)[:3]
    for index, flight in enumerate(ranked_flights, start=1):
        flight["option_id"] = index

    # Use interrupt to create a selection UI in the frontend
    answer = interrupt(
        {
            "type": "select_flight",
            "prompt": f"I found the top 3 flight options from {origin.strip().upper()} to {destination.strip().upper()}. Please select your preferred flight.",
            "flight_options": ranked_flights,
            "options_count": len(ranked_flights),
            "flights": ranked_flights,
            "search_params": {
                "origin": origin.strip().upper(),
                "destination": destination.strip().upper(),
                "departure_date": departure_date,
                "return_date": return_date,
                "adults": normalized_adults,
                "travel_class": normalized_travel_class,
                "trip_type": trip_type,
                "currency": currency,
            },
            "price_info": {
                "current_price": _parse_int(result.current_price),
            },
        }
    )

    # Return the user's selection
    if isinstance(answer, dict):
        return json.dumps(answer)
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
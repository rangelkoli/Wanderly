"""Flight search tool powered by fast-flights (Google Flights scraper)."""

import json
from typing import Literal
from fast_flights import FlightData, Passengers, get_flights


def flights_finder(
    origin: str,
    destination: str,
    departure_date: str,
    return_date: str | None = None,
    adults: int = 1,
    travel_class: Literal["economy", "premium_economy", "business", "first"] = "economy",
    max_price: int | None = None,
    currency: str = "USD",
    language: str = "en",
    country: str = "us",
) -> str:
    """Fetch Google Flights results using fast-flights and return JSON."""
    if not origin.strip() or not destination.strip():
        raise ValueError("origin and destination are required.")

    normalized_adults = max(1, min(adults, 9))

    trip_type = "round-trip" if return_date else "one-way"
    
    flight_data_list = [
        FlightData(
            date=departure_date,
            from_airport=origin.strip().upper(),
            to_airport=destination.strip().upper(),
        )
    ]

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
            seat=travel_class,
            passengers=Passengers(adults=normalized_adults),
            fetch_mode="fallback",
        )
    except Exception as e:
        raise ValueError(f"Failed to fetch flights: {str(e)}")

    flights_data = []
    
    if result.flights:
        for flight in result.flights:
            flight_info = {
                "id": flight.id if hasattr(flight, 'id') else str(hash(str(flight))),
                "price": flight.price if hasattr(flight, 'price') else result.current_price,
                "airline": flight.airline if hasattr(flight, 'airline') else "Unknown",
                "departure_airport": flight.departure_airport if hasattr(flight, 'departure_airport') else origin.strip().upper(),
                "arrival_airport": flight.arrival_airport if hasattr(flight, 'arrival_airport') else destination.strip().upper(),
                "departure_time": flight.departure_time if hasattr(flight, 'departure_time') else "N/A",
                "arrival_time": flight.arrival_time if hasattr(flight, 'arrival_time') else "N/A",
                "duration": flight.duration if hasattr(flight, 'duration') else "N/A",
                "stops": flight.stops if hasattr(flight, 'stops') else 0,
                "cabin": flight.cabin if hasattr(flight, 'cabin') else travel_class,
            }
            flights_data.append(flight_info)

    output = {
        "provider": "fast_flights_google_flights",
        "search_parameters": {
            "origin": origin.strip().upper(),
            "destination": destination.strip().upper(),
            "departure_date": departure_date,
            "return_date": return_date,
            "adults": normalized_adults,
            "travel_class": travel_class,
            "currency": currency,
            "language": language,
            "country": country,
        },
        "current_price": result.current_price,
        "price_level": result.price_level if hasattr(result, 'price_level') else "N/A",
        "flights": flights_data,
    }

    return json.dumps(output, indent=2)

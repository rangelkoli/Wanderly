"""Unit tests for tool input/output contracts."""

import json

from importlib import import_module

ask_human_questions = import_module("agent.tools.ask_human_questions")
flights_finder_module = import_module("agent.tools.flights_finder")
google_place_photos_module = import_module("agent.tools.google_place_photos")


def test_ask_human_single_question_returns_plain_answer(monkeypatch) -> None:
    """Single-question interrupts should normalize to a plain string response."""

    monkeypatch.setattr(ask_human_questions, "interrupt", lambda payload: "June")

    answer = ask_human_questions.ask_human(
        question="When do you want to travel?", choices=["June", "July"]
    )
    assert answer == "June"


def test_ask_human_multi_question_returns_json_payload(monkeypatch) -> None:
    """Multi-question interrupts should return structured JSON text."""

    answer_payload = {
        "answers": [
            {"id": "q1", "answer": "Paris"},
            {"id": "q2", "answer": "2"},
        ]
    }

    monkeypatch.setattr(ask_human_questions, "interrupt", lambda payload: answer_payload)

    payload = ask_human_questions.ask_human(
        questions=[
            {
                "id": "q1",
                "question": "Where are you going?",
                "choices": ["Paris", "Rome", "Tokyo"],
            },
            {
                "id": "q2",
                "question": "How many people?",
                "choices": ["1", "2", "3+"],
            },
        ]
    )

    parsed = json.loads(payload)
    assert parsed == answer_payload

class _DummyFlight:
    def __init__(self, **kwargs: object) -> None:
        self.__dict__.update(kwargs)


class _DummyFlightResult:
    def __init__(self, flights: list[object], current_price: int | str = 0) -> None:
        self.flights = flights
        self.current_price = current_price


def test_flights_finder_returns_no_results_structure(monkeypatch) -> None:
    """When no flights are available, tool should return the no_flights_found schema."""

    monkeypatch.setattr(
        flights_finder_module,
        "get_flights",
        lambda *args, **kwargs: _DummyFlightResult(flights=[]),
    )

    payload = json.loads(
        flights_finder_module.flights_finder(
            origin="jfk",
            destination="cdg",
            departure_date="2026-06-10",
            return_date=None,
        )
    )

    assert payload["type"] == "no_flights_found"
    assert payload["search_parameters"]["origin"] == "JFK"
    assert payload["search_parameters"]["destination"] == "CDG"


def test_flights_finder_uses_interrupt_payload(monkeypatch) -> None:
    """Flight search should provide the selection UI payload contract."""

    captured: dict[str, object] = {}

    def fake_interrupt(payload: dict[str, object]) -> dict[str, int | str]:
        captured.update(payload)
        return {"option_id": 1}

    flight_list = [
        _DummyFlight(
            id="AA123",
            price="USD 520",
            airline="Example Air",
            departure_airport="JFK",
            arrival_airport="CDG",
            departure_time="09:00",
            arrival_time="23:00",
            duration="14h",
            stops=1,
            cabin="economy",
        )
    ]

    monkeypatch.setattr(
        flights_finder_module,
        "get_flights",
        lambda *args, **kwargs: _DummyFlightResult(flights=flight_list, current_price="1000"),
    )
    monkeypatch.setattr(flights_finder_module, "interrupt", fake_interrupt)

    selected = json.loads(
        flights_finder_module.flights_finder(
            origin="jfk",
            destination="cdg",
            departure_date="2026-06-10",
            return_date="2026-06-17",
            travel_class="Premium-Economy",
            adults=2,
        )
    )

    assert selected == {"option_id": 1}
    assert captured["type"] == "select_flight"
    assert captured["options_count"] == 1
    assert captured["search_params"]["origin"] == "JFK"
    assert captured["search_params"]["destination"] == "CDG"
    assert captured["search_params"]["travel_class"] == "premium_economy"


def test_flights_finder_limits_results_to_top_three(monkeypatch) -> None:
    """Flight search should only expose the top three ranked options."""

    captured: dict[str, object] = {}

    def fake_interrupt(payload: dict[str, object]) -> dict[str, int | str]:
        captured.update(payload)
        return {"option_id": 1}

    flight_list = [
        _DummyFlight(
            id="best-value",
            price="USD 480",
            airline="Value Air",
            departure_airport="JFK",
            arrival_airport="CDG",
            departure_time="08:00",
            arrival_time="20:00",
            duration="12h",
            stops=0,
            cabin="economy",
        ),
        _DummyFlight(
            id="cheap-stop",
            price="USD 430",
            airline="Budget Hop",
            departure_airport="JFK",
            arrival_airport="CDG",
            departure_time="07:00",
            arrival_time="23:00",
            duration="16h",
            stops=1,
            cabin="economy",
        ),
        _DummyFlight(
            id="fast-nonstop",
            price="USD 560",
            airline="Fast Air",
            departure_airport="JFK",
            arrival_airport="CDG",
            departure_time="09:30",
            arrival_time="20:30",
            duration="11h",
            stops=0,
            cabin="economy",
        ),
        _DummyFlight(
            id="worst-option",
            price="USD 900",
            airline="Late Wings",
            departure_airport="JFK",
            arrival_airport="CDG",
            departure_time="06:00",
            arrival_time="08:00",
            duration="20h",
            stops=2,
            cabin="economy",
        ),
    ]

    monkeypatch.setattr(
        flights_finder_module,
        "get_flights",
        lambda *args, **kwargs: _DummyFlightResult(flights=flight_list, current_price="480"),
    )
    monkeypatch.setattr(flights_finder_module, "interrupt", fake_interrupt)

    selected = json.loads(
        flights_finder_module.flights_finder(
            origin="jfk",
            destination="cdg",
            departure_date="2026-06-10",
        )
    )

    shown_flights = captured["flights"]

    assert selected == {"option_id": 1}
    assert captured["options_count"] == 3
    assert [flight["id"] for flight in shown_flights] == [
        "best-value",
        "fast-nonstop",
        "cheap-stop",
    ]
    assert [flight["option_id"] for flight in shown_flights] == [1, 2, 3]


def test_flights_finder_rejects_invalid_route(monkeypatch) -> None:
    """Routes with missing fields should fail fast."""

    monkeypatch.setattr(
        flights_finder_module,
        "get_flights",
        lambda *args, **kwargs: _DummyFlightResult(flights=[]),
    )

    try:
        flights_finder_module.flights_finder(
            origin="", destination="cdg", departure_date="2026-06-10"
        )
    except ValueError as exc:
        assert "origin and destination are required" in str(exc)
    else:
        raise AssertionError("Expected ValueError for missing required route fields")


def test_google_place_photos_uses_places_photo_query_contract(monkeypatch) -> None:
    """Photo URLs should use the expected Google Places Photo API query fields."""

    monkeypatch.setenv("GOOGLE_MAPS_API_KEY", "test-key")
    monkeypatch.setattr(
        google_place_photos_module,
        "_get_json",
        lambda url, params: {
            "status": "OK",
            "candidates": [
                {
                    "name": "Eiffel Tower",
                    "place_id": "place-123",
                    "formatted_address": "Paris, France",
                    "photos": [{"photo_reference": "photo-ref-abc"}],
                }
            ],
        },
    )

    payload = json.loads(google_place_photos_module.google_place_photos("Eiffel Tower"))
    result = payload["results"][0]

    assert result["status"] == "OK"
    assert "photoreference=photo-ref-abc" in result["image_url"]
    assert "photo_reference=" not in result["image_url"]

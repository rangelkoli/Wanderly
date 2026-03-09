"""Integration tests for agent graph wiring and required tool flow."""

import json

import pytest
from langchain.agents import create_agent
from langchain_core.messages import AIMessage, HumanMessage, ToolMessage
from typing import Any, cast

from agent import graph
from agent.assets.system_prompt import SYSTEM_PROMPT


def test_graph_has_expected_tools() -> None:
    """Ensure all required tools are attached to the compiled graph."""

    tool_node = graph.get_graph().nodes["tools"]
    registered = set(tool_node.data._tools_by_name)

    expected = {
        "ask_human",
        "google_maps_coordinates",
        "google_place_photos",
        "internet_search",
        "flights_finder",
    }

    assert expected.issubset(registered)


class _DeterministicFlowModel:
    """Deterministic model that simulates a specific tool-calling flow."""

    def __init__(self, final_payload: str) -> None:
        self.calls = 0
        self.final_payload = final_payload

    def bind_tools(self, *args, **kwargs):
        return self

    def bind(self, **kwargs):
        return self

    async def ainvoke(self, messages, config=None):
        self.calls += 1
        if self.calls == 1:
            return AIMessage(
                content="",
                tool_calls=[
                    {
                        "name": "ask_human",
                        "args": {"question": "Where are you going?", "choices": ["Paris", "Tokyo"]},
                        "id": "ask_1",
                        "type": "tool_call",
                    }
                ],
            )

        if self.calls == 2:
            return AIMessage(
                content="",
                tool_calls=[
                    {
                        "name": "flights_finder",
                        "args": {
                            "origin": "JFK",
                            "destination": "CDG",
                            "departure_date": "2026-06-10",
                            "return_date": "2026-06-17",
                            "adults": 2,
                            "travel_class": "economy",
                        },
                        "id": "flight_1",
                        "type": "tool_call",
                    }
                ],
            )

        return AIMessage(content=self.final_payload)

    def invoke(self, messages, config=None):
        import asyncio

        return asyncio.get_event_loop().run_until_complete(self.ainvoke(messages, config=config))


@pytest.mark.anyio
async def test_agent_graph_tool_flow_can_be_replayed_with_mocked_tools() -> None:
    """Run a controlled agent graph flow through ask_human -> flights -> final output."""

    tool_call_trace: list[tuple[str, dict[str, object]]] = []

    def ask_human(question: str | None = None, choices: list[str] | None = None, questions: list[dict[str, object]] | None = None) -> str:
        """Mocked ask_human tool."""
        tool_call_trace.append(("ask_human", {"question": question or "", "choices": list(choices or [])}))
        return "Europe"

    def flights_finder(**kwargs: object) -> str:
        """Mocked flights_finder tool."""
        tool_call_trace.append(("flights_finder", dict(kwargs)))
        return json.dumps(
            {
                "type": "select_flight",
                "flight_options": [
                    {
                        "option_id": 1,
                        "id": "AF_123",
                        "airline": "Air France",
                        "price": 620,
                        "departure_airport": "JFK",
                        "arrival_airport": "CDG",
                        "departure_time": "10:00",
                        "arrival_time": "22:30",
                        "duration": "8h 30m",
                        "stops": 0,
                        "cabin": "economy",
                    }
                ],
                "options_count": 1,
                "search_params": {
                    "origin": "JFK",
                    "destination": "CDG",
                    "departure_date": "2026-06-10",
                    "return_date": "2026-06-17",
                    "adults": 2,
                    "travel_class": "economy",
                },
            }
        )

    final_payload = {
        "itinerary_title": "Paris Weekend",
        "destination": "Paris",
        "days": [
            {
                "day_number": 1,
                "title": "Arrival & Classics",
                "date_label": "Wed, Jun 10",
                "activities_count": 2,
                "budget_label": "$$ Balanced",
                "sessions": [],
                "route": {
                    "distance_km": 10,
                    "duration_min": 30,
                    "map_image_url": "https://placehold.co/640x980/e8f3ff/4b6584?text=Paris",
                },
            }
        ],
        "sources": ["https://example.com/source"],
        "selected_flight": {
            "option_id": 1,
            "airline": "Air France",
            "price": 620,
            "departure_airport": "JFK",
            "arrival_airport": "CDG",
            "departure_time": "10:00",
            "arrival_time": "22:30",
            "duration": "8h 30m",
            "stops": 0,
            "cabin": "economy",
        },
    }

    fake_graph = create_agent(
        model=cast(Any, _DeterministicFlowModel(json.dumps(final_payload))),
        tools=[ask_human, flights_finder],
        system_prompt=SYSTEM_PROMPT,
        middleware=[],
    )

    result = await fake_graph.ainvoke(
        {"messages": [HumanMessage(content="Plan a balanced 5-day trip")]}
    )

    tool_messages = [msg for msg in result["messages"] if isinstance(msg, ToolMessage)]
    tool_names = [msg.name for msg in tool_messages]
    assert tool_names == ["ask_human", "flights_finder"]

    assistant_tool_steps = [
        tc["name"]
        for message in result["messages"]
        if isinstance(message, AIMessage) and message.tool_calls
        for tc in message.tool_calls
    ]
    assert assistant_tool_steps == ["ask_human", "flights_finder"]

    assert len(tool_call_trace) == 2
    assert tool_call_trace[0][0] == "ask_human"
    assert tool_call_trace[1][0] == "flights_finder"

    final_output = json.loads(result["messages"][-1].content)
    assert final_output["selected_flight"]["option_id"] == 1
    assert final_output["destination"] == "Paris"
    assert len(final_output["days"]) == 1

from collections.abc import Sequence
from importlib import import_module
from typing import Any

from langchain.agents import create_agent

from agent.assets.system_prompt import SYSTEM_PROMPT
from agent.models import agent_model
from agent.tools import (
    ask_human,
    flights_finder,
    travel_budget_agent,
    google_maps_coordinates,
    google_place_photos,
    internet_search,
)

langgraph_state = import_module("langgraph.graph.state")


def _patch_langgraph_control_branch() -> None:
    original = langgraph_state._control_branch

    if getattr(original, "__name__", "") == "_safe_control_branch":
        return

    def _safe_control_branch(value: Any) -> Sequence[tuple[str, Any]]:
        if isinstance(value, langgraph_state.Send):
            return ((langgraph_state.TASKS, value),)

        commands: list[langgraph_state.Command] = []
        if isinstance(value, langgraph_state.Command):
            commands.append(value)
        elif isinstance(value, (list, tuple)):
            for cmd in value:
                if isinstance(cmd, langgraph_state.Command):
                    commands.append(cmd)

        routed: list[tuple[str, Any]] = []
        for command in commands:
            if command.graph == langgraph_state.Command.PARENT:
                raise langgraph_state.ParentCommand(command)

            goto_targets = (
                [command.goto]
                if isinstance(command.goto, (langgraph_state.Send, str))
                else (command.goto or [])
            )

            for go in goto_targets:
                if isinstance(go, langgraph_state.Send):
                    routed.append((langgraph_state.TASKS, go))
                elif isinstance(go, str) and go != langgraph_state.END:
                    routed.append((langgraph_state._CHANNEL_BRANCH_TO.format(go), None))

        return routed

    langgraph_state._control_branch = _safe_control_branch


_patch_langgraph_control_branch()


graph = create_agent(
    tools=[
        internet_search,
        google_place_photos,
        ask_human,
        google_maps_coordinates,
        flights_finder,
        travel_budget_agent,
    ],
    system_prompt=SYSTEM_PROMPT,
    model=agent_model,
    middleware=[],
)

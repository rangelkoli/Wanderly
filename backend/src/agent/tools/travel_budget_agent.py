
from langchain.agents import create_agent
from agent.models import get_active_model
from agent.tools import ask_human, internet_search

def _build_subagent():
    return create_agent(
        model=get_active_model(),
        tools=[internet_search, ask_human],
        system_prompt="You are a travel budget planner. Find affordable trip options for the requested destination and budget.",
    )


def travel_budget_agent(destination: str, budget: float):
    """Search for the cheapest and best travel options for a given destination and budget."""
    if not destination or not destination.strip():
        raise ValueError("destination is required.")
    try:
        budget_amount = float(budget)
    except (TypeError, ValueError) as exc:
        raise ValueError("budget must be a valid number.") from exc
    if budget_amount < 0:
        raise ValueError("budget must be zero or a positive value.")

    if budget_amount == 0:
        budget_label = "no budget limit specified"
    else:
        budget_label = f"{budget_amount:g} USD"

    result = _build_subagent().run(
        (
            f"Find the cheapest and best travel options for {destination.strip()} "
            f"with a budget of {budget_label}."
        )
    )
    return result["messages"][-1].content


from langchain.agents import create_agent
from agent.tools import get_insta_reels, internet_search, ask_human
from agent.models.chatgpt import chatgptModel

subagent = create_agent(model=chatgptModel, tools=[internet_search, ask_human], system_prompt="You are a travel budget planner. Your task is to find the cheapest and best travel options for a given destination and budget.")

def travel_budget_agent(destination: str, budget: float):
    """Search for the cheapest and best travel options for a given destination and budget."""
    result = subagent.run(f"Find the cheapest and best travel options for {destination} with a budget of {budget}.")
    return result["messages"][-1].content


from langchain.agents import create_agent

from agent.assets.system_prompt import SYSTEM_PROMPT
from agent.models import chatgptModel, ollamaModel
from agent.tools import ask_human, google_place_photos, internet_search, select_places, google_maps_coordinates


graph = create_agent(
    tools=[internet_search, google_place_photos, ask_human, select_places, google_maps_coordinates],
    system_prompt=SYSTEM_PROMPT,
    model=chatgptModel,
    middleware=[],
)

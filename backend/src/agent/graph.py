from langchain.agents import create_agent

from agent.assets.system_prompt import SYSTEM_PROMPT
from agent.models import chatgptModel, ollamaModel
from agent.tools import (
    ask_human,
    flights_finder,
    google_maps_coordinates,
    google_place_photos,
    internet_search,
    select_places,
)


graph = create_agent(
    tools=[
        internet_search,
        google_place_photos,
        ask_human,
        select_places,
        google_maps_coordinates,
        flights_finder,
    ],
    system_prompt=SYSTEM_PROMPT,
    model=chatgptModel,
    middleware=[],
)

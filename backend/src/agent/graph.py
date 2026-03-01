from langchain.agents import create_agent

from agent.assets.system_prompt import SYSTEM_PROMPT
from agent.models.chatgpt import chatgptModel
from agent.tools import ask_human, google_place_photos, internet_search, select_places

# model = ChatOpenAI(
#     model="gpt-5",
#     temperature=0.1,
#     max_tokens=1000,
#     timeout=30
# )


graph = create_agent(
    tools=[internet_search, google_place_photos, ask_human, select_places],
    system_prompt=SYSTEM_PROMPT,
    model=chatgptModel,
    middleware=[],
)

from langchain.agents import create_agent
from agent.tools import get_insta_reels, internet_search, ask_human
from agent.assets.system_prompt import SYSTEM_PROMPT
from agent.models.chatgpt import chatgptModel




# model = ChatOpenAI(
#     model="gpt-5",
#     temperature=0.1,
#     max_tokens=1000,
#     timeout=30
# )


graph = create_agent(
    tools=[internet_search, ask_human],
    system_prompt=SYSTEM_PROMPT,
    model=chatgptModel,
    middleware=[],
)
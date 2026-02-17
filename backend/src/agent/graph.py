from langchain.agents import create_agent
from langchain_openai import ChatOpenAI


SYSTEM_PROMPT = """"""
model = ChatOpenAI(
    model="gpt-5",
    temperature=0.1,
    max_tokens=1000,
    timeout=30
)
graph = create_agent(model)
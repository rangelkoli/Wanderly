from langchain_openai import ChatOpenAI
from os import getenv

openrouterModel = ChatOpenAI(
    model="google/gemini-3.1-flash-lite-preview",
    base_url="https://openrouter.ai/api/v1",
    api_key=lambda: getenv("OPENROUTER_API_KEY") or "",
)
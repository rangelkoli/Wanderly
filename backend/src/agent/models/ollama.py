import os

from langchain_openai import ChatOpenAI
from pydantic import SecretStr


ollamaModel = ChatOpenAI(
    model=os.getenv("OLLAMA_MODEL", "llama3.1"),
    base_url=os.getenv("OLLAMA_BASE_URL", "http://localhost:11434/v1"),
    api_key=SecretStr(os.getenv("OLLAMA_API_KEY", "ollama")),
)

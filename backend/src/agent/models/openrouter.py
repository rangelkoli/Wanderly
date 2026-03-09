from langchain_openai import ChatOpenAI
from os import getenv
from pydantic import SecretStr


def build_openrouter_model() -> ChatOpenAI:
    """Build an OpenRouter model instance when the API key is available."""

    api_key = (getenv("OPENROUTER_API_KEY") or "").strip()
    if not api_key:
        raise RuntimeError("OPENROUTER_API_KEY is required for openrouter model.")

    return ChatOpenAI(
        model="google/gemini-3.1-flash-lite-preview",
        base_url="https://openrouter.ai/api/v1",
        api_key=SecretStr(api_key),
    )


try:
    openrouterModel = build_openrouter_model()
except RuntimeError:
    openrouterModel = None

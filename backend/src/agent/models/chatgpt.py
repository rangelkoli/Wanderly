"""OpenAI ChatGPT model factory with optional initialization."""

import os

from langchain.chat_models import init_chat_model
from pydantic import SecretStr


def build_chatgpt_model():
    """Build the ChatGPT model when OPENAI_API_KEY is available."""

    api_key = (os.getenv("OPENAI_API_KEY") or "").strip()
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is required for chatgpt model.")

    return init_chat_model("gpt-5-mini-2025-08-07", api_key=SecretStr(api_key))


try:
    chatgptModel = build_chatgpt_model()
except RuntimeError:
    # Keep import side effects minimal so this module works without OpenAI keys.
    chatgptModel = None


__all__ = ["build_chatgpt_model", "chatgptModel"]



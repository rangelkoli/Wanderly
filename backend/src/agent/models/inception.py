import os
from langchain_openai import ChatOpenAI
from pydantic import SecretStr


def build_inception_model() -> ChatOpenAI:
    """Build an Inception model instance if credentials are configured."""

    api_key = (os.getenv("INCEPTION_API_KEY") or "").strip()
    if not api_key:
        raise RuntimeError("INCEPTION_API_KEY is required for inception model.")

    return ChatOpenAI(
        model="mercury-2",
        temperature=0.75,
        api_key=SecretStr(api_key),
        base_url="https://api.inceptionlabs.ai/v1",
    )


def get_inception_model() -> ChatOpenAI:
    """Return a configured Inception model."""

    return build_inception_model()


try:
    inceptionModel = build_inception_model()
except RuntimeError:
    # Keep import side effects minimal so this module can be loaded even when
    # credentials are not present during local tests.
    inceptionModel = None

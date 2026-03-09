"""Model selection helpers for the travel assistant.

Use this module to centralize fallback behavior when optional providers are
not configured in the current environment.
"""

from __future__ import annotations

from os import getenv
from typing import Any

from .chatgpt import chatgptModel
from .ollama import ollamaModel
from .openrouter import openrouterModel
from .inception import inceptionModel


def _resolve_model_name() -> str:
    return (getenv("TRAVEL_AGENT_MODEL", "auto") or "auto").strip().lower()


def get_active_model() -> Any:
    """Return a usable model with fallback across providers.

    The selection order is:
    1) explicit TRAVEL_AGENT_MODEL value if supported and configured,
    2) first available provider among explicit fallback list.
    """

    requested = _resolve_model_name()

    model_candidates = [requested] if requested != "auto" else ["inception", "openrouter", "ollama", "chatgpt"]
    if requested == "auto":
        fallback_candidates = model_candidates
    elif requested == "inception":
        fallback_candidates = ["inception", "openrouter", "ollama", "chatgpt"]
    elif requested == "openrouter":
        fallback_candidates = ["openrouter", "inception", "ollama", "chatgpt"]
    elif requested == "ollama":
        fallback_candidates = ["ollama", "chatgpt", "openrouter", "inception"]
    else:
        fallback_candidates = [requested, "chatgpt", "openrouter", "inception", "ollama"]

    for candidate in fallback_candidates:
        if candidate == "inception" and inceptionModel is not None:
            return inceptionModel
        if candidate == "openrouter" and openrouterModel is not None:
            return openrouterModel
        if candidate == "ollama" and ollamaModel is not None:
            return ollamaModel
        if candidate == "chatgpt" and chatgptModel is not None:
            return chatgptModel

    raise RuntimeError("No enabled model provider found. Configure a provider key or run with Ollama.")


agent_model = get_active_model()


__all__ = [
    "chatgptModel",
    "ollamaModel",
    "openrouterModel",
    "inceptionModel",
    "get_active_model",
    "agent_model",
]

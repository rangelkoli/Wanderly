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


_MODEL_ALIASES = {
    "auto": ["inception", "openrouter", "ollama", "chatgpt"],
    "gpt": "chatgpt",
    "openai": "chatgpt",
    "inceptionlabs": "inception",
    "ollama_local": "ollama",
    "google": "openrouter",
}


def _normalize_requested_model(requested: str) -> str:
    requested_value = (requested or "auto").strip().lower()
    if not requested_value:
        return "auto"
    alias_target = _MODEL_ALIASES.get(requested_value)
    if alias_target is None:
        return requested_value
    if isinstance(alias_target, list):
        # Keep for compatibility; not used directly as base requested provider.
        return requested_value
    return alias_target


def _model_candidates_for_request(requested: str) -> list[str]:
    if requested in {"auto", ""}:
        return ["inception", "openrouter", "ollama", "chatgpt"]
    if requested == "inception":
        return ["inception", "openrouter", "ollama", "chatgpt"]
    if requested == "openrouter":
        return ["openrouter", "inception", "ollama", "chatgpt"]
    if requested == "ollama":
        return ["ollama", "chatgpt", "openrouter", "inception"]
    if requested == "chatgpt":
        return ["chatgpt", "openrouter", "ollama", "inception"]
    return ["chatgpt", "openrouter", "ollama", "inception", requested]


def _resolve_model_name() -> str:
    return _normalize_requested_model(
        (getenv("TRAVEL_AGENT_MODEL", "auto") or "auto").strip().lower()
    )


def get_active_model() -> Any:
    """Return a usable model with fallback across providers.

    The selection order is:
    1) explicit TRAVEL_AGENT_MODEL value if supported and configured,
    2) first available provider among explicit fallback list.
    """

    requested = _resolve_model_name()
    fallback_candidates = _model_candidates_for_request(requested)

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

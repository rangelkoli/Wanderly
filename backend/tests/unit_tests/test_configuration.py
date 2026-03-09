"""Unit tests for model provider resolution behavior."""

import pytest
from agent import models


def test_model_resolver_prefers_requested_provider(monkeypatch) -> None:
    """Verify explicit provider request resolves to the requested model."""

    sentinel_inception = object()

    monkeypatch.setenv("TRAVEL_AGENT_MODEL", "inception")
    monkeypatch.setattr(models, "inceptionModel", sentinel_inception, raising=False)
    monkeypatch.setattr(models, "openrouterModel", None, raising=False)
    monkeypatch.setattr(models, "ollamaModel", None, raising=False)
    monkeypatch.setattr(models, "chatgptModel", None, raising=False)

    assert models.get_active_model() is sentinel_inception


def test_model_resolver_raises_when_no_providers(monkeypatch) -> None:
    """Verify a clear error is raised when no model provider can start."""

    monkeypatch.setenv("TRAVEL_AGENT_MODEL", "inception")
    monkeypatch.setattr(models, "inceptionModel", None, raising=False)
    monkeypatch.setattr(models, "openrouterModel", None, raising=False)
    monkeypatch.setattr(models, "ollamaModel", None, raising=False)
    monkeypatch.setattr(models, "chatgptModel", None, raising=False)

    with pytest.raises(RuntimeError):
        models.get_active_model()

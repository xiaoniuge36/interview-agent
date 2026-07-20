from pathlib import Path

import pytest
from app import config
from app.config import get_settings
from app.main import checkpoint_connection_url
from pydantic import ValidationError


def test_loads_local_env_file_in_development(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    env_file = tmp_path / ".env"
    env_file.write_text(
        "INTERNAL_AGENT_TOKEN=local-development-token-with-at-least-32-characters\n",
        encoding="utf-8",
    )
    monkeypatch.delenv("INTERNAL_AGENT_TOKEN", raising=False)
    monkeypatch.delenv("NODE_ENV", raising=False)
    monkeypatch.setattr(config, "LOCAL_ENV_FILE", env_file)
    get_settings.cache_clear()

    settings = get_settings()

    assert settings.internal_agent_token.get_secret_value().startswith("local-development")
    get_settings.cache_clear()


def test_requires_internal_service_token(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("NODE_ENV", "test")
    monkeypatch.delenv("INTERNAL_AGENT_TOKEN", raising=False)
    get_settings.cache_clear()

    with pytest.raises(ValidationError):
        get_settings()

    get_settings.cache_clear()


def test_rejects_short_internal_service_token(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("NODE_ENV", "test")
    monkeypatch.setenv("INTERNAL_AGENT_TOKEN", "too-short")
    get_settings.cache_clear()

    with pytest.raises(ValidationError):
        get_settings()

    get_settings.cache_clear()


def test_production_requires_postgres_checkpoint_url(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("NODE_ENV", "production")
    monkeypatch.setenv(
        "INTERNAL_AGENT_TOKEN", "production-runtime-token-with-at-least-32-characters"
    )
    monkeypatch.setenv(
        "AGENT_RUNTIME_MODEL_GATEWAY_URL",
        "https://product-api.example.com/api/internal/model-invocations",
    )
    monkeypatch.delenv("AGENT_RUNTIME_CHECKPOINT_DATABASE_URL", raising=False)
    get_settings.cache_clear()

    with pytest.raises(ValidationError):
        get_settings()

    get_settings.cache_clear()


def test_checkpoint_connection_url_adds_a_bounded_timeout() -> None:
    assert checkpoint_connection_url("postgresql://db/runtime") == (
        "postgresql://db/runtime?connect_timeout=5"
    )
    assert checkpoint_connection_url("postgresql://db/runtime?sslmode=require") == (
        "postgresql://db/runtime?sslmode=require&connect_timeout=5"
    )
    assert checkpoint_connection_url("postgresql://db/runtime?connect_timeout=7") == (
        "postgresql://db/runtime?connect_timeout=7"
    )

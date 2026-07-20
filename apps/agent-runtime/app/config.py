from functools import lru_cache
from os import getenv
from pathlib import Path
from typing import Literal

from pydantic import Field, SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

MIN_INTERNAL_TOKEN_LENGTH = 24
DEFAULT_BODY_LIMIT_BYTES = 1_048_576
MIN_BODY_LIMIT_BYTES = 1_024
MAX_BODY_LIMIT_BYTES = 10_485_760
PROJECT_ROOT = Path(__file__).resolve().parents[3]
LOCAL_ENV_FILE = PROJECT_ROOT / ".env"


class RuntimeSettings(BaseSettings):
    model_config = SettingsConfigDict(
        case_sensitive=True,
        extra="ignore",
    )

    environment: Literal["development", "test", "production"] = Field(
        default="development",
        validation_alias="NODE_ENV",
    )
    internal_agent_token: SecretStr = Field(
        min_length=MIN_INTERNAL_TOKEN_LENGTH,
        validation_alias="INTERNAL_AGENT_TOKEN",
    )
    request_body_limit_bytes: int = Field(
        default=DEFAULT_BODY_LIMIT_BYTES,
        ge=MIN_BODY_LIMIT_BYTES,
        le=MAX_BODY_LIMIT_BYTES,
        validation_alias="RUNTIME_BODY_LIMIT_BYTES",
    )
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = Field(
        default="INFO",
        validation_alias="RUNTIME_LOG_LEVEL",
    )
    model_gateway_url: str | None = Field(
        default=None,
        validation_alias="AGENT_RUNTIME_MODEL_GATEWAY_URL",
    )
    checkpoint_database_url: SecretStr | None = Field(
        default=None,
        validation_alias="AGENT_RUNTIME_CHECKPOINT_DATABASE_URL",
    )

    @model_validator(mode="after")
    def require_production_agent_dependencies(self) -> "RuntimeSettings":
        if self.environment != "production":
            return self
        if self.model_gateway_url is None:
            raise ValueError("Production requires AGENT_RUNTIME_MODEL_GATEWAY_URL.")
        if self.checkpoint_database_url is None:
            raise ValueError("Production requires AGENT_RUNTIME_CHECKPOINT_DATABASE_URL.")
        return self


@lru_cache(maxsize=1)
def get_settings() -> RuntimeSettings:
    environment = getenv("NODE_ENV", "development")
    env_file = LOCAL_ENV_FILE if environment == "development" else None
    return RuntimeSettings(_env_file=env_file)

"""Shared support utilities for the LangGraph workflow modules."""

import logging
from collections.abc import Awaitable, Callable, Mapping
from random import SystemRandom
from typing import Protocol

from app.model_gateway import ModelGatewayRequest

RETRY_BACKOFF_BASE_SECONDS = 0.5
RETRY_BACKOFF_MAX_SECONDS = 8.0
RETRY_AFTER_CAP_SECONDS = 10.0

SleepFn = Callable[[float], Awaitable[None]]

_JITTER = SystemRandom()


class ModelGateway(Protocol):
    async def complete(self, request: ModelGatewayRequest) -> str: ...


def strip_code_fence(value: str) -> str:
    stripped = value.strip()
    if stripped.startswith("```json"):
        stripped = stripped[len("```json") :].lstrip()
    elif stripped.startswith("```"):
        stripped = stripped[len("```") :].lstrip()
    if stripped.endswith("```"):
        stripped = stripped[: -len("```")].rstrip()
    return stripped


def retry_backoff_seconds(attempt: int, retry_after_seconds: float | None = None) -> float:
    """Exponential backoff with jitter; honours a capped Retry-After hint when given."""
    if retry_after_seconds is not None:
        return min(max(retry_after_seconds, 0.0), RETRY_AFTER_CAP_SECONDS)
    exponent = max(attempt - 2, 0)
    delay = min(RETRY_BACKOFF_MAX_SECONDS, RETRY_BACKOFF_BASE_SECONDS * float(2**exponent))
    return delay * (0.5 + _JITTER.random() / 2)


def log_graph_event(
    logger: logging.Logger,
    event: str,
    fields: Mapping[str, object],
) -> None:
    """Emit a structured warning for a graph failure/fallback edge.

    Only whitelisted fields survive JSON formatting (see SAFE_RECORD_FIELDS);
    callers must never pass grants, prompts, or raw model output.
    """
    logger.warning(event, extra={"event": event, **dict(fields)})

import logging
from dataclasses import dataclass
from time import perf_counter
from typing import Final, cast
from uuid import uuid4

from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.config import DEFAULT_BODY_LIMIT_BYTES, RuntimeSettings

LOGGER = logging.getLogger("agent_runtime.http")
SERVER_ERROR_STATUS = 500
REQUEST_TOO_LARGE_STATUS = 413
TRACE_ID_MIN_LENGTH = 8
TRACE_ID_MAX_LENGTH = 128
MILLISECONDS_PER_SECOND = 1_000
TRACE_HEADER = b"x-trace-id"
SECURITY_HEADERS: Final = (
    (b"x-content-type-options", b"nosniff"),
    (b"x-frame-options", b"DENY"),
    (b"referrer-policy", b"no-referrer"),
    (b"cache-control", b"no-store"),
)


class RequestBodyTooLargeError(Exception):
    pass


@dataclass(frozen=True, slots=True)
class RequestLogContext:
    scope: Scope
    trace_id: str
    status_code: int
    started_at: float


class RequestBodyLimitMiddleware:
    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        limit = body_limit(scope)
        if declared_content_length(scope) > limit:
            await too_large_response(scope, receive, send)
            return
        received_bytes = 0

        async def limited_receive() -> Message:
            nonlocal received_bytes
            message = await receive()
            if message["type"] == "http.request":
                received_bytes += len(message.get("body", b""))
                if received_bytes > limit:
                    raise RequestBodyTooLargeError
            return message

        try:
            await self.app(scope, limited_receive, send)
        except RequestBodyTooLargeError:
            await too_large_response(scope, receive, send)


class RequestLoggingMiddleware:
    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        started_at = perf_counter()
        status_code = SERVER_ERROR_STATUS
        current_trace_id = request_trace_id(scope)

        async def tracked_send(message: Message) -> None:
            nonlocal status_code
            if message["type"] == "http.response.start":
                status_code = message["status"]
                append_response_headers(message, current_trace_id)
            await send(message)

        try:
            await self.app(scope, receive, tracked_send)
        finally:
            log_request(
                RequestLogContext(
                    scope=scope,
                    trace_id=current_trace_id,
                    status_code=status_code,
                    started_at=started_at,
                )
            )


def body_limit(scope: Scope) -> int:
    application = scope.get("app")
    state = getattr(application, "state", None)
    settings = getattr(state, "settings", None)
    if isinstance(settings, RuntimeSettings):
        return settings.request_body_limit_bytes
    return DEFAULT_BODY_LIMIT_BYTES


def request_headers(scope: Scope) -> list[tuple[bytes, bytes]]:
    return cast(list[tuple[bytes, bytes]], scope.get("headers", []))


def declared_content_length(scope: Scope) -> int:
    for name, value in request_headers(scope):
        if name == b"content-length":
            try:
                return int(value)
            except ValueError:
                return 0
    return 0


def request_trace_id(scope: Scope) -> str:
    for name, value in request_headers(scope):
        if name == TRACE_HEADER:
            candidate = value.decode("ascii", errors="ignore").strip()
            if TRACE_ID_MIN_LENGTH <= len(candidate) <= TRACE_ID_MAX_LENGTH:
                return candidate
    return str(uuid4())


def append_response_headers(message: Message, current_trace_id: str) -> None:
    headers = cast(list[tuple[bytes, bytes]], message.setdefault("headers", []))
    headers.extend(SECURITY_HEADERS)
    headers.append((TRACE_HEADER, current_trace_id.encode("ascii")))


def log_request(context: RequestLogContext) -> None:
    duration_ms = round((perf_counter() - context.started_at) * MILLISECONDS_PER_SECOND)
    LOGGER.info(
        "runtime_request_completed",
        extra={
            "event": "runtime_request_completed",
            "http_method": context.scope.get("method", "UNKNOWN"),
            "http_path": context.scope.get("path", ""),
            "http_status": context.status_code,
            "duration_ms": duration_ms,
            "trace_id": context.trace_id,
        },
    )


async def too_large_response(scope: Scope, receive: Receive, send: Send) -> None:
    response = JSONResponse(
        status_code=REQUEST_TOO_LARGE_STATUS,
        content={
            "error": {
                "code": "REQUEST_BODY_TOO_LARGE",
                "message": "Request body exceeds the configured limit.",
            }
        },
    )
    await response(scope, receive, send)

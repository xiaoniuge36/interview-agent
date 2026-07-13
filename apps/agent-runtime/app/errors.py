import logging
from dataclasses import dataclass
from typing import cast

from fastapi import Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

LOGGER = logging.getLogger("agent_runtime.errors")


@dataclass(frozen=True, slots=True)
class ApiError:
    status_code: int
    code: str
    message: str
    details: object | None = None


class RuntimeRequestError(Exception):
    def __init__(self, error: ApiError) -> None:
        super().__init__(error.message)
        self.error = error


def trace_id(request: Request) -> str | None:
    return request.headers.get("x-trace-id")


def error_response(request: Request, error: ApiError) -> JSONResponse:
    error_payload: dict[str, object] = {
        "code": error.code,
        "message": error.message,
    }
    if error.details is not None:
        error_payload["details"] = error.details
    return JSONResponse(
        status_code=error.status_code,
        content={"error": error_payload, "traceId": trace_id(request)},
    )


async def validation_error_handler(
    request: Request,
    exception: Exception,
) -> JSONResponse:
    validation_exception = cast(RequestValidationError, exception)
    details = [
        {
            "path": ".".join(str(part) for part in validation_error["loc"]),
            "code": validation_error["type"],
            "message": validation_error["msg"],
        }
        for validation_error in validation_exception.errors()
    ]
    return error_response(
        request,
        ApiError(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            code="VALIDATION_FAILED",
            message="Request validation failed.",
            details=details,
        ),
    )


async def runtime_error_handler(request: Request, exception: Exception) -> JSONResponse:
    runtime_exception = cast(RuntimeRequestError, exception)
    return error_response(request, runtime_exception.error)


async def http_error_handler(request: Request, exception: Exception) -> JSONResponse:
    http_exception = cast(StarletteHTTPException, exception)
    return error_response(
        request,
        ApiError(
            status_code=http_exception.status_code,
            code="HTTP_ERROR",
            message=str(http_exception.detail),
        ),
    )


async def unhandled_error_handler(request: Request, exception: Exception) -> JSONResponse:
    LOGGER.exception("unhandled_runtime_error", exc_info=exception)
    return error_response(
        request,
        ApiError(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            code="INTERNAL_SERVER_ERROR",
            message="Agent Runtime encountered an internal error.",
        ),
    )

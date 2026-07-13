import logging
import secrets
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Annotated, cast

from fastapi import Depends, FastAPI, Header, Request, status
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.config import RuntimeSettings, get_settings
from app.errors import (
    ApiError,
    RuntimeRequestError,
    http_error_handler,
    runtime_error_handler,
    unhandled_error_handler,
    validation_error_handler,
)
from app.logging_config import configure_logging
from app.middleware import RequestBodyLimitMiddleware, RequestLoggingMiddleware
from app.schemas.interview import NextInterviewRequest, NextInterviewResponse
from app.workflows.interview import next_interview_turn

SERVICE_NAME = "agent-runtime"
EXPECTED_CALLER = "product-api"
LOGGER = logging.getLogger("agent_runtime.lifecycle")


@asynccontextmanager
async def lifespan(application: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    configure_logging(settings.log_level)
    application.state.settings = settings
    LOGGER.info("runtime_started", extra={"event": "runtime_started", "service": SERVICE_NAME})
    yield
    LOGGER.info("runtime_stopped", extra={"event": "runtime_stopped", "service": SERVICE_NAME})


def create_app() -> FastAPI:
    application = FastAPI(
        title="Interview Agent Runtime",
        version="0.3.0",
        docs_url=None,
        redoc_url=None,
        lifespan=lifespan,
    )
    application.add_middleware(RequestBodyLimitMiddleware)
    application.add_middleware(RequestLoggingMiddleware)
    application.add_exception_handler(RequestValidationError, validation_error_handler)
    application.add_exception_handler(RuntimeRequestError, runtime_error_handler)
    application.add_exception_handler(StarletteHTTPException, http_error_handler)
    application.add_exception_handler(Exception, unhandled_error_handler)
    return application


app = create_app()


def current_settings(request: Request) -> RuntimeSettings:
    return cast(RuntimeSettings, request.app.state.settings)


def verify_internal_request(
    request: Request,
    token: Annotated[str | None, Header(alias="x-internal-agent-token")] = None,
    service_name: Annotated[str | None, Header(alias="x-service-name")] = None,
) -> None:
    expected = current_settings(request).internal_agent_token.get_secret_value()
    identity_valid = token is not None and secrets.compare_digest(token, expected)
    if service_name != EXPECTED_CALLER or not identity_valid:
        raise RuntimeRequestError(
            ApiError(
                status_code=status.HTTP_401_UNAUTHORIZED,
                code="INVALID_SERVICE_IDENTITY",
                message="Internal service identity is invalid.",
            )
        )


@app.get("/health")
@app.get("/health/live")
def liveness() -> dict[str, str]:
    return {"status": "ok", "service": SERVICE_NAME}


@app.get("/health/ready")
def readiness(request: Request) -> dict[str, object]:
    settings = current_settings(request)
    return {
        "status": "ready",
        "service": SERVICE_NAME,
        "checks": {
            "configuration": {
                "status": "up",
                "environment": settings.environment,
            }
        },
    }


@app.post(
    "/interviews/next",
    response_model=NextInterviewResponse,
    response_model_by_alias=True,
    dependencies=[Depends(verify_internal_request)],
)
def next_turn(payload: NextInterviewRequest) -> NextInterviewResponse:
    return next_interview_turn(payload.session, payload.answer)

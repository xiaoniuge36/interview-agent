import asyncio
import logging
import secrets
from collections.abc import AsyncIterator, Awaitable
from contextlib import AsyncExitStack, asynccontextmanager
from typing import Annotated, TypeVar, cast

import httpx
import psycopg
from fastapi import Depends, FastAPI, Header, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from langgraph.checkpoint.base import BaseCheckpointSaver
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
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
from app.model_gateway import (
    DEFAULT_GATEWAY_TIMEOUT_SECONDS,
    MODEL_PROVIDER_ENDPOINT_BLOCKED,
    ModelGatewayClient,
)
from app.request_cancellation import RequestCancelledError, cancel_when_disconnected
from app.schemas.interview import NextInterviewRequest, NextInterviewResponse
from app.schemas.practice_report import PracticeReportRequest, PracticeReportResponse
from app.telemetry import configure_telemetry, start_span
from app.workflows.interview import next_interview_turn
from app.workflows.interview_graph import (
    InterviewGraphError,
    create_interview_graph,
    run_interview_graph,
)
from app.workflows.practice_report_graph import (
    PracticeReportGraphError,
    create_practice_report_graph,
    run_practice_report_graph,
)

SERVICE_NAME = "agent-runtime"
EXPECTED_CALLER = "product-api"
LOGGER = logging.getLogger("agent_runtime.lifecycle")
CHECKPOINT_CONNECT_TIMEOUT_SECONDS = 5
READINESS_DATABASE_TIMEOUT_SECONDS = 2.0
CLIENT_CLOSED_REQUEST_STATUS = 499
T = TypeVar("T")


@asynccontextmanager
async def lifespan(application: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    configure_logging(settings.log_level)
    application.state.settings = settings
    gateway = ModelGatewayClient(
        url=model_gateway_url(settings),
        internal_token=settings.internal_agent_token.get_secret_value(),
        http_client=httpx.AsyncClient(timeout=DEFAULT_GATEWAY_TIMEOUT_SECONDS),
    )
    async with AsyncExitStack() as stack:
        stack.push_async_callback(gateway.aclose)
        checkpointer = await checkpoint_for(settings, stack)
        tracer_provider = configure_telemetry(settings.otel_exporter_otlp_endpoint)
        if tracer_provider is not None:
            stack.callback(tracer_provider.shutdown)
        application.state.interview_graph = create_interview_graph(gateway, checkpointer)
        application.state.practice_report_graph = create_practice_report_graph(
            gateway, checkpointer
        )
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


def model_gateway_url(settings: RuntimeSettings) -> str | None:
    return None if settings.model_gateway_url is None else str(settings.model_gateway_url)


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
async def readiness(request: Request) -> JSONResponse:
    settings = current_settings(request)
    gateway_configured = settings.model_gateway_url is not None
    database_ready = await checkpoint_database_ready(settings)
    ready = gateway_configured and database_ready
    return JSONResponse(
        status_code=status.HTTP_200_OK if ready else status.HTTP_503_SERVICE_UNAVAILABLE,
        content={
            "status": "ready" if ready else "unavailable",
            "service": SERVICE_NAME,
            "checks": {
                "configuration": {"status": "up", "environment": settings.environment},
                "model_gateway": {"status": "up" if gateway_configured else "down"},
                "checkpoint_database": {
                    "status": "up" if database_ready else "down",
                    "configured": settings.checkpoint_database_url is not None,
                },
            },
        },
    )


async def checkpoint_database_ready(settings: RuntimeSettings) -> bool:
    if settings.checkpoint_database_url is None:
        return True
    connection_url = checkpoint_connection_url(settings.checkpoint_database_url.get_secret_value())
    try:
        await asyncio.wait_for(
            probe_checkpoint_database(connection_url),
            timeout=READINESS_DATABASE_TIMEOUT_SECONDS,
        )
    except Exception as error:  # readiness must degrade, never crash the probe
        LOGGER.warning(
            "readiness_database_check_failed",
            extra={"event": "readiness_database_check_failed", "code": type(error).__name__},
        )
        return False
    return True


async def probe_checkpoint_database(connection_url: str) -> None:
    async with await psycopg.AsyncConnection.connect(connection_url) as connection:
        await connection.execute("SELECT 1")


async def run_cancellable(request: Request, operation: Awaitable[T], trace_id: str) -> T:
    try:
        return await cancel_when_disconnected(request, operation)
    except RequestCancelledError as error:
        LOGGER.info(
            "runtime_request_cancelled",
            extra={"event": "runtime_request_cancelled", "trace_id": trace_id},
        )
        raise RuntimeRequestError(
            ApiError(
                status_code=CLIENT_CLOSED_REQUEST_STATUS,
                code="REQUEST_CANCELLED",
                message="Request was cancelled by the caller.",
            )
        ) from error


@app.post(
    "/interviews/next",
    response_model=NextInterviewResponse,
    response_model_by_alias=True,
    dependencies=[Depends(verify_internal_request)],
)
async def next_turn(request: Request, payload: NextInterviewRequest) -> NextInterviewResponse:
    with start_span(
        "interview_next",
        {"interview_agent.trace_id": payload.trace_id, "session.id": payload.session.id},
    ):
        if payload.model_invocation_grant is None:
            return next_interview_turn(payload.session, payload.answer)
        operation = run_interview_graph(
            request.app.state.interview_graph,
            payload,
            timeout_seconds=current_settings(request).graph_timeout_seconds,
        )
        try:
            return await run_cancellable(request, operation, payload.trace_id)
        except InterviewGraphError as error:
            raise RuntimeRequestError(
                ApiError(
                    status_code=model_error_status(error),
                    code=model_error_code(error),
                    message="模型面试决策暂时无法生成，请稍后重试。",
                )
            ) from error


@app.post(
    "/practice/report",
    response_model=PracticeReportResponse,
    response_model_by_alias=True,
    dependencies=[Depends(verify_internal_request)],
)
async def practice_report(
    request: Request,
    payload: PracticeReportRequest,
) -> PracticeReportResponse:
    with start_span(
        "practice_report",
        {"interview_agent.trace_id": payload.trace_id, "session.id": payload.session.id},
    ):
        operation = run_practice_report_graph(
            request.app.state.practice_report_graph,
            payload,
            timeout_seconds=current_settings(request).graph_timeout_seconds,
        )
        try:
            return await run_cancellable(request, operation, payload.trace_id)
        except PracticeReportGraphError as error:
            raise RuntimeRequestError(
                ApiError(
                    status_code=model_error_status(error),
                    code=model_error_code(error),
                    message="训练报告暂时无法生成，请稍后重试。",
                )
            ) from error


async def checkpoint_for(
    settings: RuntimeSettings,
    stack: AsyncExitStack,
) -> BaseCheckpointSaver[str] | None:
    if settings.checkpoint_database_url is None:
        return None
    checkpointer_context = AsyncPostgresSaver.from_conn_string(
        checkpoint_connection_url(settings.checkpoint_database_url.get_secret_value())
    )
    checkpointer = await stack.enter_async_context(checkpointer_context)
    await checkpointer.setup()
    return checkpointer


def checkpoint_connection_url(database_url: str) -> str:
    if "connect_timeout=" in database_url:
        return database_url
    separator = "&" if "?" in database_url else "?"
    return f"{database_url}{separator}connect_timeout={CHECKPOINT_CONNECT_TIMEOUT_SECONDS}"


def model_error_status(error: Exception) -> int:
    if str(error) == MODEL_PROVIDER_ENDPOINT_BLOCKED:
        return status.HTTP_400_BAD_REQUEST
    return status.HTTP_502_BAD_GATEWAY


def model_error_code(error: Exception) -> str:
    if str(error) == MODEL_PROVIDER_ENDPOINT_BLOCKED:
        return MODEL_PROVIDER_ENDPOINT_BLOCKED
    return str(error)

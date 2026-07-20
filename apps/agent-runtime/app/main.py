import logging
import secrets
from collections.abc import AsyncIterator
from contextlib import AsyncExitStack, asynccontextmanager
from typing import Annotated, cast

from fastapi import Depends, FastAPI, Header, Request, status
from fastapi.exceptions import RequestValidationError
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
from app.model_gateway import ModelGatewayClient
from app.schemas.interview import NextInterviewRequest, NextInterviewResponse
from app.workflows.interview import next_interview_turn
from app.workflows.interview_graph import (
    InterviewGraphError,
    create_interview_graph,
    run_interview_graph,
)

SERVICE_NAME = "agent-runtime"
EXPECTED_CALLER = "product-api"
LOGGER = logging.getLogger("agent_runtime.lifecycle")
CHECKPOINT_CONNECT_TIMEOUT_SECONDS = 5


@asynccontextmanager
async def lifespan(application: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    configure_logging(settings.log_level)
    application.state.settings = settings
    gateway = ModelGatewayClient(
        url=settings.model_gateway_url,
        internal_token=settings.internal_agent_token.get_secret_value(),
    )
    async with AsyncExitStack() as stack:
        checkpointer = await checkpoint_for(settings, stack)
        application.state.interview_graph = create_interview_graph(gateway, checkpointer)
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
async def next_turn(request: Request, payload: NextInterviewRequest) -> NextInterviewResponse:
    if payload.model_invocation_grant is not None:
        try:
            return await run_interview_graph(request.app.state.interview_graph, payload)
        except InterviewGraphError as error:
            raise RuntimeRequestError(
                ApiError(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    code=str(error),
                    message="模型面试决策暂时无法生成，请稍后重试。",
                )
            ) from error
    return next_interview_turn(payload.session, payload.answer)


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

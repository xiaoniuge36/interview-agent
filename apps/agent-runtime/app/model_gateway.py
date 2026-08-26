from dataclasses import dataclass

import httpx
from pydantic import BaseModel, ConfigDict, Field, ValidationError

from app.telemetry import start_span

DEFAULT_GATEWAY_TIMEOUT_SECONDS = 35.0
HTTP_TOO_MANY_REQUESTS = 429
HTTP_SERVER_ERROR = 500
MODEL_PROVIDER_ENDPOINT_BLOCKED = "MODEL_PROVIDER_ENDPOINT_BLOCKED"


class ModelGatewayResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    content: str = Field(min_length=1, max_length=20_000)


class ModelGatewayError(Exception):
    def __init__(
        self,
        code: str,
        *,
        retryable: bool,
        retry_after_seconds: float | None = None,
    ) -> None:
        super().__init__(code)
        self.code = code
        self.retryable = retryable
        self.retry_after_seconds = retry_after_seconds


@dataclass(frozen=True, slots=True)
class ModelGatewayRequest:
    grant: str
    system_prompt: str
    user_prompt: str
    trace_id: str
    output_schema_version: str = "interview-runtime.v1"


@dataclass(slots=True)
class ModelGatewayClient:
    """Client for the internal model gateway.

    Reuses one shared ``httpx.AsyncClient`` across requests; the owner must
    call :meth:`aclose` on shutdown. Tests may inject a fake client or an
    ``httpx.AsyncClient`` backed by ``httpx.MockTransport``.
    """

    url: str | None
    internal_token: str
    timeout_seconds: float = DEFAULT_GATEWAY_TIMEOUT_SECONDS
    http_client: httpx.AsyncClient | None = None

    async def complete(self, request: ModelGatewayRequest) -> str:
        with start_span(
            "model_provider",
            {
                "interview_agent.trace_id": request.trace_id,
                "output.schema_version": request.output_schema_version,
            },
        ):
            return await self._complete(request)

    async def aclose(self) -> None:
        if self.http_client is None:
            return
        client, self.http_client = self.http_client, None
        await client.aclose()

    async def _complete(self, request: ModelGatewayRequest) -> str:
        if self.url is None:
            raise ModelGatewayError("MODEL_GATEWAY_NOT_CONFIGURED", retryable=False)
        try:
            response = await self._shared_client().post(
                self.url,
                headers=self.headers(request.trace_id),
                json={
                    "grant": request.grant,
                    "systemPrompt": request.system_prompt,
                    "userPrompt": request.user_prompt,
                    "outputSchemaVersion": request.output_schema_version,
                    "traceId": request.trace_id,
                },
                timeout=self.timeout_seconds,
            )
        except httpx.TimeoutException as error:
            raise ModelGatewayError("MODEL_PROVIDER_TIMEOUT", retryable=True) from error
        except httpx.HTTPError as error:
            raise ModelGatewayError("MODEL_PROVIDER_UNAVAILABLE", retryable=True) from error
        if not response.is_success:
            raise gateway_response_error(response)
        try:
            return ModelGatewayResponse.model_validate(response.json()).content
        except (ValueError, ValidationError) as error:
            raise ModelGatewayError("MODEL_PROVIDER_RESPONSE_INVALID", retryable=False) from error

    def _shared_client(self) -> httpx.AsyncClient:
        if self.http_client is None:
            self.http_client = httpx.AsyncClient(timeout=self.timeout_seconds)
        return self.http_client

    def headers(self, trace_id: str) -> dict[str, str]:
        return {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "x-internal-agent-token": self.internal_token,
            "x-service-name": "agent-runtime",
            "x-trace-id": trace_id,
        }


def gateway_response_error(response: httpx.Response) -> ModelGatewayError:
    status_code = response.status_code
    retry_after = parse_retry_after(response) if status_code == HTTP_TOO_MANY_REQUESTS else None
    return ModelGatewayError(
        response_error_code(status_code, response_payload(response)),
        retryable=is_retryable_status(status_code),
        retry_after_seconds=retry_after,
    )


def response_payload(response: httpx.Response) -> object:
    """Error bodies may be non-JSON (proxy HTML, plain text); never let that escape."""
    try:
        return response.json()
    except ValueError:
        return None


def parse_retry_after(response: httpx.Response) -> float | None:
    raw = response.headers.get("Retry-After")
    if raw is None:
        return None
    try:
        return max(float(raw), 0.0)
    except ValueError:
        return None


def is_retryable_status(status_code: int) -> bool:
    return status_code == HTTP_TOO_MANY_REQUESTS or status_code >= HTTP_SERVER_ERROR


def response_error_code(status_code: int, payload: object) -> str:
    code = endpoint_blocked_code(payload) if status_code < HTTP_SERVER_ERROR else None
    return code or gateway_error_code(status_code)


def endpoint_blocked_code(payload: object) -> str | None:
    if not isinstance(payload, dict):
        return None
    error = payload.get("error")
    nested = error if isinstance(error, dict) else payload
    code = nested.get("code")
    return code if code == MODEL_PROVIDER_ENDPOINT_BLOCKED else None


def gateway_error_code(status_code: int) -> str:
    if status_code == HTTP_TOO_MANY_REQUESTS:
        return "MODEL_PROVIDER_RATE_LIMITED"
    if status_code >= HTTP_SERVER_ERROR:
        return "MODEL_PROVIDER_UNAVAILABLE"
    return "MODEL_GATEWAY_REQUEST_REJECTED"

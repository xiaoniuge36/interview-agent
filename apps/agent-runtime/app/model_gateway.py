from dataclasses import dataclass

import httpx
from pydantic import BaseModel, ConfigDict, Field, ValidationError

DEFAULT_GATEWAY_TIMEOUT_SECONDS = 35.0
HTTP_TOO_MANY_REQUESTS = 429
HTTP_SERVER_ERROR = 500


class ModelGatewayResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    content: str = Field(min_length=1, max_length=20_000)


class ModelGatewayError(Exception):
    def __init__(self, code: str, *, retryable: bool) -> None:
        super().__init__(code)
        self.code = code
        self.retryable = retryable


@dataclass(frozen=True, slots=True)
class ModelGatewayRequest:
    grant: str
    system_prompt: str
    user_prompt: str
    trace_id: str


@dataclass(frozen=True, slots=True)
class ModelGatewayClient:
    url: str | None
    internal_token: str
    timeout_seconds: float = DEFAULT_GATEWAY_TIMEOUT_SECONDS

    async def complete(self, request: ModelGatewayRequest) -> str:
        if self.url is None:
            raise ModelGatewayError("MODEL_GATEWAY_NOT_CONFIGURED", retryable=False)
        try:
            async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
                response = await client.post(
                    self.url,
                    headers=self.headers(request.trace_id),
                    json={
                        "grant": request.grant,
                        "systemPrompt": request.system_prompt,
                        "userPrompt": request.user_prompt,
                        "outputSchemaVersion": "interview-runtime.v1",
                        "traceId": request.trace_id,
                    },
                )
        except httpx.TimeoutException as error:
            raise ModelGatewayError("MODEL_PROVIDER_TIMEOUT", retryable=True) from error
        except httpx.HTTPError as error:
            raise ModelGatewayError("MODEL_PROVIDER_UNAVAILABLE", retryable=True) from error
        if not response.is_success:
            raise ModelGatewayError(
                gateway_error_code(response.status_code),
                retryable=is_retryable_status(response.status_code),
            )
        try:
            return ModelGatewayResponse.model_validate(response.json()).content
        except (ValueError, ValidationError) as error:
            raise ModelGatewayError("MODEL_PROVIDER_RESPONSE_INVALID", retryable=False) from error

    def headers(self, trace_id: str) -> dict[str, str]:
        return {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "x-internal-agent-token": self.internal_token,
            "x-service-name": "agent-runtime",
            "x-trace-id": trace_id,
        }


def is_retryable_status(status_code: int) -> bool:
    return status_code == HTTP_TOO_MANY_REQUESTS or status_code >= HTTP_SERVER_ERROR


def gateway_error_code(status_code: int) -> str:
    if status_code == HTTP_TOO_MANY_REQUESTS:
        return "MODEL_PROVIDER_RATE_LIMITED"
    if status_code >= HTTP_SERVER_ERROR:
        return "MODEL_PROVIDER_UNAVAILABLE"
    return "MODEL_GATEWAY_REQUEST_REJECTED"

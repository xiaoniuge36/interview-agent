import httpx
import pytest
from app.model_gateway import (
    ModelGatewayClient,
    ModelGatewayError,
    ModelGatewayRequest,
    gateway_error_code,
    is_retryable_status,
)


class FakeResponse:
    def __init__(self, status_code: int, payload: object) -> None:
        self.status_code = status_code
        self._payload = payload

    @property
    def is_success(self) -> bool:
        return 200 <= self.status_code < 300

    def json(self) -> object:
        return self._payload


class FakeAsyncClient:
    response: FakeResponse | None = None
    error: Exception | None = None

    def __init__(self, **_: object) -> None:
        pass

    async def __aenter__(self) -> "FakeAsyncClient":
        return self

    async def __aexit__(self, *_: object) -> None:
        return None

    async def post(self, *_: object, **__: object) -> FakeResponse:
        if self.error is not None:
            raise self.error
        assert self.response is not None
        return self.response


def client() -> ModelGatewayClient:
    return ModelGatewayClient(
        url="http://product-api.test/api/internal/model-invocations",
        internal_token="internal-token",
    )


def request() -> ModelGatewayRequest:
    return ModelGatewayRequest(
        grant="grant.signature",
        system_prompt="system",
        user_prompt="user",
        trace_id="trace-test-0001",
    )


@pytest.mark.anyio
async def test_gateway_returns_valid_content(monkeypatch: pytest.MonkeyPatch) -> None:
    FakeAsyncClient.response = FakeResponse(200, {"content": '{"ok":true}'})
    FakeAsyncClient.error = None
    monkeypatch.setattr(httpx, "AsyncClient", FakeAsyncClient)

    result = await client().complete(request())

    assert result == '{"ok":true}'


@pytest.mark.anyio
async def test_gateway_maps_http_errors(monkeypatch: pytest.MonkeyPatch) -> None:
    FakeAsyncClient.response = FakeResponse(503, {})
    FakeAsyncClient.error = None
    monkeypatch.setattr(httpx, "AsyncClient", FakeAsyncClient)

    with pytest.raises(ModelGatewayError) as error:
        await client().complete(request())

    assert error.value.code == "MODEL_PROVIDER_UNAVAILABLE"
    assert error.value.retryable is True


@pytest.mark.anyio
async def test_gateway_maps_timeout(monkeypatch: pytest.MonkeyPatch) -> None:
    FakeAsyncClient.response = None
    FakeAsyncClient.error = httpx.TimeoutException("timeout")
    monkeypatch.setattr(httpx, "AsyncClient", FakeAsyncClient)

    with pytest.raises(ModelGatewayError, match="MODEL_PROVIDER_TIMEOUT"):
        await client().complete(request())


@pytest.mark.anyio
async def test_gateway_rejects_invalid_response(monkeypatch: pytest.MonkeyPatch) -> None:
    FakeAsyncClient.response = FakeResponse(200, {"unexpected": True})
    FakeAsyncClient.error = None
    monkeypatch.setattr(httpx, "AsyncClient", FakeAsyncClient)

    with pytest.raises(ModelGatewayError, match="MODEL_PROVIDER_RESPONSE_INVALID"):
        await client().complete(request())


def test_gateway_helpers_classify_statuses() -> None:
    assert is_retryable_status(429) is True
    assert is_retryable_status(503) is True
    assert is_retryable_status(400) is False
    assert gateway_error_code(429) == "MODEL_PROVIDER_RATE_LIMITED"
    assert gateway_error_code(503) == "MODEL_PROVIDER_UNAVAILABLE"
    assert gateway_error_code(400) == "MODEL_GATEWAY_REQUEST_REJECTED"


@pytest.mark.anyio
async def test_gateway_requires_url() -> None:
    missing = ModelGatewayClient(url=None, internal_token="internal-token")

    with pytest.raises(ModelGatewayError, match="MODEL_GATEWAY_NOT_CONFIGURED"):
        await missing.complete(request())

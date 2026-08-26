import asyncio
from collections.abc import Callable
from typing import cast

import httpx
import pytest
from app.model_gateway import (
    ModelGatewayClient,
    ModelGatewayError,
    ModelGatewayRequest,
    gateway_error_code,
    is_retryable_status,
)

GATEWAY_URL = "http://product-api.test/api/internal/model-invocations"
Handler = Callable[[httpx.Request], httpx.Response]


class BlockingHttpClient:
    def __init__(self) -> None:
        self.started = asyncio.Event()
        self.cancelled = asyncio.Event()

    async def post(self, *_: object, **__: object) -> httpx.Response:
        self.started.set()
        try:
            await asyncio.Event().wait()
        except asyncio.CancelledError:
            self.cancelled.set()
            raise
        raise AssertionError("cancelled request resumed")

    async def aclose(self) -> None:
        return None


def mock_client(handler: Handler) -> ModelGatewayClient:
    return ModelGatewayClient(
        url=GATEWAY_URL,
        internal_token="internal-token",
        http_client=httpx.AsyncClient(transport=httpx.MockTransport(handler)),
    )


def request() -> ModelGatewayRequest:
    return ModelGatewayRequest(
        grant="grant.signature",
        system_prompt="system",
        user_prompt="user",
        trace_id="trace-test-0001",
    )


async def complete_with(handler: Handler) -> str:
    client = mock_client(handler)
    try:
        return await client.complete(request())
    finally:
        await client.aclose()


def raise_timeout(_: httpx.Request) -> httpx.Response:
    raise httpx.ConnectTimeout("timeout")


def raise_network_error(_: httpx.Request) -> httpx.Response:
    raise httpx.ConnectError("connection refused")


@pytest.mark.anyio
async def test_gateway_returns_valid_content() -> None:
    def handler(gateway_request: httpx.Request) -> httpx.Response:
        assert gateway_request.headers["x-internal-agent-token"] == "internal-token"
        assert gateway_request.headers["x-service-name"] == "agent-runtime"
        return httpx.Response(200, json={"content": '{"ok":true}'})

    result = await complete_with(handler)

    assert result == '{"ok":true}'


@pytest.mark.anyio
async def test_gateway_reuses_one_shared_http_client() -> None:
    calls: list[httpx.Request] = []

    def handler(gateway_request: httpx.Request) -> httpx.Response:
        calls.append(gateway_request)
        return httpx.Response(200, json={"content": "ok"})

    client = mock_client(handler)
    injected_http_client = client.http_client
    try:
        await client.complete(request())
        await client.complete(request())
    finally:
        await client.aclose()

    assert len(calls) == 2
    assert injected_http_client is not None
    assert injected_http_client.is_closed
    assert client.http_client is None


@pytest.mark.anyio
async def test_gateway_lazily_creates_and_closes_its_client(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    inner = httpx.AsyncClient(
        transport=httpx.MockTransport(lambda _: httpx.Response(200, json={"content": "ok"}))
    )
    monkeypatch.setattr(httpx, "AsyncClient", lambda **_: inner)
    client = ModelGatewayClient(url=GATEWAY_URL, internal_token="internal-token")

    await client.complete(request())
    lazily_created = client.http_client
    assert lazily_created is inner

    await client.aclose()
    assert client.http_client is None
    assert inner.is_closed
    await client.aclose()


@pytest.mark.anyio
async def test_gateway_maps_http_errors() -> None:
    with pytest.raises(ModelGatewayError) as error:
        await complete_with(lambda _: httpx.Response(503, json={}))

    assert error.value.code == "MODEL_PROVIDER_UNAVAILABLE"
    assert error.value.retryable is True


@pytest.mark.anyio
async def test_gateway_maps_non_json_5xx_error_body() -> None:
    with pytest.raises(ModelGatewayError) as error:
        await complete_with(lambda _: httpx.Response(503, text="Service Unavailable"))

    assert error.value.code == "MODEL_PROVIDER_UNAVAILABLE"
    assert error.value.retryable is True


@pytest.mark.anyio
async def test_gateway_maps_html_4xx_error_body() -> None:
    with pytest.raises(ModelGatewayError) as error:
        await complete_with(
            lambda _: httpx.Response(
                404,
                content=b"<html><body>Not Found</body></html>",
                headers={"content-type": "text/html"},
            )
        )

    assert error.value.code == "MODEL_GATEWAY_REQUEST_REJECTED"
    assert error.value.retryable is False


@pytest.mark.anyio
async def test_gateway_preserves_the_allowlisted_blocked_endpoint_code() -> None:
    with pytest.raises(ModelGatewayError) as error:
        await complete_with(
            lambda _: httpx.Response(
                400, json={"error": {"code": "MODEL_PROVIDER_ENDPOINT_BLOCKED"}}
            )
        )

    assert error.value.code == "MODEL_PROVIDER_ENDPOINT_BLOCKED"
    assert error.value.retryable is False


@pytest.mark.anyio
async def test_gateway_captures_retry_after_for_rate_limits() -> None:
    with pytest.raises(ModelGatewayError) as error:
        await complete_with(lambda _: httpx.Response(429, json={}, headers={"Retry-After": "2.5"}))

    assert error.value.code == "MODEL_PROVIDER_RATE_LIMITED"
    assert error.value.retryable is True
    assert error.value.retry_after_seconds == 2.5


@pytest.mark.anyio
async def test_gateway_ignores_unparseable_retry_after() -> None:
    with pytest.raises(ModelGatewayError) as error:
        await complete_with(
            lambda _: httpx.Response(
                429, json={}, headers={"Retry-After": "Wed, 21 Oct 2026 07:28:00 GMT"}
            )
        )

    assert error.value.code == "MODEL_PROVIDER_RATE_LIMITED"
    assert error.value.retry_after_seconds is None


@pytest.mark.anyio
async def test_gateway_maps_timeout() -> None:
    with pytest.raises(ModelGatewayError, match="MODEL_PROVIDER_TIMEOUT"):
        await complete_with(raise_timeout)


@pytest.mark.anyio
async def test_gateway_maps_transport_errors() -> None:
    with pytest.raises(ModelGatewayError, match="MODEL_PROVIDER_UNAVAILABLE"):
        await complete_with(raise_network_error)


@pytest.mark.anyio
async def test_gateway_cancels_the_in_flight_http_request() -> None:
    blocking_client = BlockingHttpClient()
    client = ModelGatewayClient(
        url=GATEWAY_URL,
        internal_token="internal-token",
        http_client=cast(httpx.AsyncClient, blocking_client),
    )
    operation = asyncio.create_task(client.complete(request()))

    await blocking_client.started.wait()
    operation.cancel()

    with pytest.raises(asyncio.CancelledError):
        await operation

    assert blocking_client.cancelled.is_set()


@pytest.mark.anyio
async def test_gateway_rejects_invalid_response() -> None:
    with pytest.raises(ModelGatewayError, match="MODEL_PROVIDER_RESPONSE_INVALID"):
        await complete_with(lambda _: httpx.Response(200, json={"unexpected": True}))


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

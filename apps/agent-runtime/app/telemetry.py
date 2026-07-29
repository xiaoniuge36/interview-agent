from collections.abc import Iterator, Mapping, Sequence
from contextlib import contextmanager

from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.trace import Span
from opentelemetry.util.types import AttributeValue

SERVICE_NAME = "interview-agent-runtime"
MAX_ATTRIBUTE_TEXT = 256
MAX_ATTRIBUTE_ITEMS = 20
SENSITIVE_ATTRIBUTE_PARTS = (
    "api_key",
    "apikey",
    "authorization",
    "answer",
    "completion",
    "credential",
    "prompt",
    "secret",
    "token",
)


def configure_telemetry(endpoint: str | None) -> TracerProvider | None:
    if not endpoint:
        return None
    provider = TracerProvider(resource=Resource.create({"service.name": SERVICE_NAME}))
    exporter = OTLPSpanExporter(endpoint=endpoint, insecure=endpoint.startswith("http://"))
    provider.add_span_processor(BatchSpanProcessor(exporter))
    trace.set_tracer_provider(provider)
    return provider


@contextmanager
def start_span(name: str, attributes: Mapping[str, object]) -> Iterator[Span]:
    tracer = trace.get_tracer(SERVICE_NAME)
    with tracer.start_as_current_span(name) as span:
        for key, value in sanitize_span_attributes(attributes).items():
            span.set_attribute(key, value)
        yield span


def sanitize_span_attributes(attributes: Mapping[str, object]) -> dict[str, AttributeValue]:
    sanitized: dict[str, AttributeValue] = {}
    for key, value in attributes.items():
        if sensitive_key(key):
            continue
        safe_value = safe_attribute(value)
        if safe_value is not None:
            sanitized[key] = safe_value
    return sanitized


def sensitive_key(key: str) -> bool:
    normalized = key.lower().replace("-", "_")
    return any(part in normalized for part in SENSITIVE_ATTRIBUTE_PARTS)


def safe_attribute(value: object) -> AttributeValue | None:
    if isinstance(value, str):
        return value[:MAX_ATTRIBUTE_TEXT]
    if isinstance(value, bool | int | float):
        return value
    if isinstance(value, Sequence) and not isinstance(value, bytes | bytearray | str):
        items = [
            item[:MAX_ATTRIBUTE_TEXT]
            for item in value[:MAX_ATTRIBUTE_ITEMS]
            if isinstance(item, str)
        ]
        return items or None
    return None

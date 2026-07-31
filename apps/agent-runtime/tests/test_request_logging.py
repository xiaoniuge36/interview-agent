import json
import logging
from time import perf_counter

import pytest
from app.logging_config import JsonFormatter
from app.middleware import RequestLogContext, log_request

TRACE_ID = "trace-observability-0001"
SENSITIVE_VALUES = ("candidate-answer", "prompt-content", "credential-secret", "token-value")


@pytest.mark.parametrize(
    ("status_code", "expected_outcome"),
    [
        (200, "succeeded"),
        (408, "timeout"),
        (499, "cancelled"),
        (502, "failed"),
    ],
)
def test_runtime_request_logs_have_safe_trace_latency_and_outcome(
    caplog: pytest.LogCaptureFixture,
    status_code: int,
    expected_outcome: str,
) -> None:
    caplog.set_level(logging.INFO, logger="agent_runtime.http")

    log_request(
        RequestLogContext(
            scope={
                "type": "http",
                "method": "POST",
                "path": "/interviews/next",
                "body": "candidate-answer prompt-content",
                "headers": [(b"authorization", b"credential-secret token-value")],
            },
            trace_id=TRACE_ID,
            status_code=status_code,
            started_at=perf_counter(),
        )
    )

    record = caplog.records[-1]
    record_fields = record.__dict__
    log_output = " ".join(str(value) for value in record_fields.values())
    assert record_fields["event"] == "runtime_request_completed"
    assert record_fields["trace_id"] == TRACE_ID
    assert isinstance(record_fields["duration_ms"], int)
    assert record_fields["duration_ms"] >= 0
    assert record_fields["outcome"] == expected_outcome
    document = json.loads(JsonFormatter().format(record))
    assert document["outcome"] == expected_outcome
    assert all(value not in log_output and value not in document for value in SENSITIVE_VALUES)

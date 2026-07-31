from app.telemetry import sanitize_span_attributes


def test_span_attribute_sanitizer_excludes_secrets_and_user_content() -> None:
    sanitized = sanitize_span_attributes(
        {
            "interview_agent.trace_id": "trace-test-0001",
            "operation": "practice_report",
            "apiKey": "secret-key",
            "Authorization": "Bearer secret",
            "answer": "full candidate answer",
            "systemPrompt": "hidden prompt",
            "completion": "raw model output",
        }
    )

    assert sanitized == {
        "interview_agent.trace_id": "trace-test-0001",
        "operation": "practice_report",
    }

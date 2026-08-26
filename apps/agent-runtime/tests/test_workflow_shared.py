from app.workflows.shared import (
    RETRY_AFTER_CAP_SECONDS,
    RETRY_BACKOFF_MAX_SECONDS,
    retry_backoff_seconds,
    strip_code_fence,
)


def test_strip_code_fence_handles_fenced_and_plain_payloads() -> None:
    assert strip_code_fence('```json\n{"a":1}\n```') == '{"a":1}'
    assert strip_code_fence("```\nplain fence\n```") == "plain fence"
    assert strip_code_fence('  {"a":1}  ') == '{"a":1}'


def test_retry_backoff_honours_capped_retry_after_hint() -> None:
    assert retry_backoff_seconds(2, 3.0) == 3.0
    assert retry_backoff_seconds(2, 99.0) == RETRY_AFTER_CAP_SECONDS
    assert retry_backoff_seconds(2, -1.0) == 0.0


def test_retry_backoff_is_jittered_and_exponential() -> None:
    first_retry = retry_backoff_seconds(2)
    assert 0.25 <= first_retry <= 0.5

    third_retry = retry_backoff_seconds(4)
    assert 1.0 <= third_retry <= 2.0

    capped_retry = retry_backoff_seconds(30)
    assert RETRY_BACKOFF_MAX_SECONDS / 2 <= capped_retry <= RETRY_BACKOFF_MAX_SECONDS

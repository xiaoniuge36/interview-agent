import pytest
from app.schemas.interview import NextInterviewRequest, NextInterviewResponse
from pydantic import ValidationError


def valid_request() -> dict[str, object]:
    return {
        "contractVersion": "interview-runtime.v1",
        "commandId": "command-test-0001",
        "traceId": "trace-test-0001",
        "session": {
            "id": "session-test-0001",
            "tenantId": "tenant-test",
            "userId": "user-test",
            "status": "running",
            "stage": "jd_core",
            "version": 2,
            "title": "Agent 模拟面试",
            "candidateTurnCount": 1,
            "recentTurns": [
                {
                    "role": "candidate",
                    "stage": "warmup",
                    "content": "我负责过一个企业知识助手。",
                }
            ],
        },
        "answer": "Product API 保存事实，Runtime 只生成下一步决策。",
    }


def test_uses_snake_case_internally_and_camel_case_at_boundary() -> None:
    request = NextInterviewRequest.model_validate(valid_request())
    response = NextInterviewResponse(
        stage="jd_core",
        content="继续说明权限边界。",
        should_finish=False,
    )

    assert request.session.candidate_turn_count == 1
    assert request.command_id == "command-test-0001"
    assert response.model_dump(by_alias=True)["shouldFinish"] is False


def test_rejects_unknown_contract_fields() -> None:
    request = valid_request()
    request["unexpected"] = True

    with pytest.raises(ValidationError):
        NextInterviewRequest.model_validate(request)


def test_rejects_blank_optional_answer() -> None:
    request = valid_request()
    request["answer"] = "   "

    with pytest.raises(ValidationError):
        NextInterviewRequest.model_validate(request)

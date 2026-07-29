import pytest
from app.schemas.interview import NextInterviewRequest, NextInterviewResponse
from app.schemas.practice_report import PracticeReportRequest, PracticeReportResponse
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


def test_practice_report_contract_uses_verified_evaluations_without_answers() -> None:
    request = PracticeReportRequest.model_validate(valid_practice_report_request())
    response = PracticeReportResponse.model_validate(
        {
            "overallScore": 72,
            "summary": "The round exposed one repeatable gap.",
            "strengths": ["Explains the main boundary."],
            "weaknesses": ["Capacity planning"],
            "nextActions": ["Add a quantified capacity example."],
            "reportMarkdown": "# Practice report",
            "sourceIds": ["chunk-1"],
            "memoryEvents": [
                {"tag": "system-design", "observedScore": 72, "evidence": "Evaluation score."}
            ],
            "fallbackUsed": False,
        }
    )

    assert request.trace_id == "trace-practice-report-0001"
    assert "answer" not in request.evaluations[0].model_fields_set
    assert response.source_ids == ["chunk-1"]


def valid_practice_report_request() -> dict[str, object]:
    return {
        "contractVersion": "practice-report-runtime.v1",
        "session": {
            "id": "session-1",
            "tenantId": "tenant-1",
            "userId": "user-1",
            "title": "System design",
        },
        "evaluations": [
            {
                "itemId": "item-1",
                "questionId": "question-1",
                "questionTitle": "Design a rate limiter",
                "questionTags": ["system-design"],
                "score": 72,
                "feedback": "The boundary is clear.",
                "missingPoints": ["Capacity planning"],
            }
        ],
        "retrievalContext": [
            {"sourceId": "chunk-1", "entityType": "knowledge", "content": "Reference."}
        ],
        "commandId": "practice-report:session-1",
        "traceId": "trace-practice-report-0001",
    }

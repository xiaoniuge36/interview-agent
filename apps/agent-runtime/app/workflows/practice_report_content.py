from dataclasses import dataclass

from app.schemas.practice_report import (
    PracticeReportDecision,
    PracticeReportEvaluation,
    PracticeReportMemoryEvent,
    PracticeReportRequest,
    PracticeReportResponse,
)


@dataclass(frozen=True, slots=True)
class ReportSections:
    score: float
    strengths: list[str]
    weaknesses: list[str]
    actions: list[str]


def deterministic_report(request: PracticeReportRequest) -> PracticeReportResponse:
    sections = deterministic_sections(request.evaluations)
    return PracticeReportResponse(
        overall_score=sections.score,
        summary=f"本轮专项练习平均得分为 {sections.score:.0f} 分。",
        strengths=sections.strengths,
        weaknesses=sections.weaknesses,
        next_actions=sections.actions,
        report_markdown=markdown_report(request.session.title, sections),
        source_ids=[],
        memory_events=memory_events(request.evaluations),
        fallback_used=True,
    )


def response_from(
    request: PracticeReportRequest,
    decision: PracticeReportDecision,
) -> PracticeReportResponse:
    return PracticeReportResponse(
        overall_score=average_score(request.evaluations),
        summary=decision.summary,
        strengths=decision.strengths,
        weaknesses=decision.weaknesses,
        next_actions=decision.next_actions,
        report_markdown=decision.report_markdown,
        source_ids=decision.source_ids,
        memory_events=memory_events(request.evaluations),
        fallback_used=False,
    )


def deterministic_sections(evaluations: list[PracticeReportEvaluation]) -> ReportSections:
    weaknesses = unique_missing_points(evaluations)
    strengths = (
        ["能够识别本轮作答中的关键能力缺口，并完成题目提交。"]
        if weaknesses
        else ["回答覆盖了本轮题目的关键能力点，结构与表达较为完整。"]
    )
    actions = (
        [
            f"针对「{item}」补充一个量化案例，并按背景、行动、结果、复盘重新表达。"
            for item in weaknesses
        ]
        if weaknesses
        else ["继续使用真实项目案例练习，强化量化结果与岗位相关性。"]
    )
    return ReportSections(average_score(evaluations), strengths, weaknesses, actions)


def markdown_report(title: str, sections: ReportSections) -> str:
    lines = [
        f"# {title}",
        "",
        f"综合得分：{sections.score:.0f}/100",
        "",
        "## 本轮亮点",
        *[f"- {item}" for item in sections.strengths],
        "",
        "## 待补强能力",
        *[f"- {item}" for item in sections.weaknesses or ["暂无明显缺口"]],
        "",
        "## 下一步建议",
        *[f"- {item}" for item in sections.actions],
    ]
    return "\n".join(lines)


def memory_events(evaluations: list[PracticeReportEvaluation]) -> list[PracticeReportMemoryEvent]:
    scores: dict[str, list[float]] = {}
    for evaluation in evaluations:
        for tag in evaluation.question_tags:
            scores.setdefault(tag, []).append(evaluation.score)
    return [
        PracticeReportMemoryEvent(
            tag=tag,
            observed_score=sum(values) / len(values),
            evidence=f"基于 {len(values)} 道已验证题目评价。",
        )
        for tag, values in scores.items()
    ]


def average_score(evaluations: list[PracticeReportEvaluation]) -> float:
    return sum(item.score for item in evaluations) / len(evaluations)


def unique_missing_points(evaluations: list[PracticeReportEvaluation]) -> list[str]:
    return list(dict.fromkeys(point for item in evaluations for point in item.missing_points))

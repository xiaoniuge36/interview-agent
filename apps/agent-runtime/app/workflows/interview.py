from app.schemas.interview import NextInterviewResponse, RuntimeSessionContext

FIRST_FOLLOW_UP_TURN = 1
SECOND_FOLLOW_UP_TURN = 2


def next_interview_turn(
    session: RuntimeSessionContext,
    answer: str | None,
) -> NextInterviewResponse:
    """根据受控会话摘要生成下一步决策，不在 Runtime 内持久化业务事实。"""
    candidate_turns = session.candidate_turn_count + (1 if answer else 0)
    if not answer:
        return initial_question()
    if candidate_turns <= FIRST_FOLLOW_UP_TURN:
        return boundary_question()
    if candidate_turns <= SECOND_FOLLOW_UP_TURN:
        return recovery_question()
    return final_question()


def initial_question() -> NextInterviewResponse:
    return NextInterviewResponse(
        stage="warmup",
        content="请用 2 分钟介绍一个最能体现你产品工程能力的 AI Agent 项目。",
        should_finish=False,
    )


def boundary_question() -> NextInterviewResponse:
    return NextInterviewResponse(
        stage="jd_core",
        content="请说明这个 Agent 系统的核心边界，以及 Product API 与 Agent Runtime 如何协作。",
        should_finish=False,
    )


def recovery_question() -> NextInterviewResponse:
    return NextInterviewResponse(
        stage="project_deep_dive",
        content="如果模型超时或输出不符合契约，你会如何保证面试会话可恢复？",
        should_finish=False,
    )


def final_question() -> NextInterviewResponse:
    return NextInterviewResponse(
        stage="final_evaluation",
        content="面试已完成，正在生成结构化评估报告。",
        should_finish=True,
    )

from app.schemas.interview import InterviewStage, NextInterviewResponse, RuntimeSessionContext

FIRST_FOLLOW_UP_TURN = 1
SECOND_FOLLOW_UP_TURN = 2

ROLE_PROMPTS: dict[str, tuple[str, str, str]] = {
    "engineering": (
        (
            "请用 2 分钟介绍一个最能体现你胜任{role}的项目。"
            "请说明业务背景、你的职责、系统边界、关键技术取舍和结果。"
        ),
        (
            "请结合这个项目说明，作为{role}你如何划分系统边界、做出关键技术取舍，"
            "并保障性能、稳定性和上线质量？"
        ),
        (
            "如果项目结果没有达到预期，作为{role}你会如何定位问题，"
            "调整系统方案，并沉淀性能、稳定性或质量改进？"
        ),
    ),
    "data": (
        (
            "请用 2 分钟介绍一个最能体现你胜任{role}的项目。"
            "请说明业务问题、指标口径、分析或建模方法和业务结果。"
        ),
        (
            "请结合这个项目说明，作为{role}你如何校准指标口径、处理数据质量问题，"
            "并选择合适的分析、实验或建模方法？"
        ),
        (
            "如果项目结果没有达到预期，"
            "作为{role}你会如何排查数据质量、方法假设或指标偏差，并推动洞察落地？"
        ),
    ),
    "ai_agent": (
        (
            "请用 2 分钟介绍一个最能体现你胜任{role}的项目。"
            "请说明用户任务、工作流设计、工具边界、模型效果和结果。"
        ),
        (
            "请结合这个项目说明，作为{role}你如何设计 Agent 工作流、控制工具权限，"
            "并评估模型效果、成本和可观测性？"
        ),
        (
            "如果项目结果没有达到预期，"
            "作为{role}你会如何定位模型、检索、工具调用或失败恢复问题，并调整方案？"
        ),
    ),
    "product_design": (
        (
            "请用 2 分钟介绍一个最能体现你胜任{role}的项目。"
            "请说明用户问题、目标、方案取舍、协作过程和上线结果。"
        ),
        (
            "请结合这个项目说明，作为{role}你如何识别用户问题、确定优先级、做出方案取舍，"
            "并用指标验证上线效果？"
        ),
        "如果项目结果没有达到预期，作为{role}你会如何复盘用户洞察、需求判断、协作节奏和产品方案？",
    ),
    "growth_operations": (
        (
            "请用 2 分钟介绍一个最能体现你胜任{role}的项目。"
            "请说明目标人群、运营策略、实验设计、投入产出和结果。"
        ),
        (
            "请结合这个项目说明，"
            "作为{role}你如何进行用户分层、拆解漏斗、设计实验或渠道策略，并评估投入产出？"
        ),
        (
            "如果项目结果没有达到预期，"
            "作为{role}你会如何判断问题在用户、渠道、策略还是转化链路，并完成复盘？"
        ),
    ),
    "business_delivery": (
        (
            "请用 2 分钟介绍一个最能体现你胜任{role}的项目。"
            "请说明客户场景、业务目标、价值方案、协同过程和经营结果。"
        ),
        (
            "请结合这个项目说明，"
            "作为{role}你如何识别客户目标、设计价值方案、协调关键干系人，并控制交付风险？"
        ),
        (
            "如果项目结果没有达到预期，"
            "作为{role}你会如何复盘客户预期、方案取舍、交付风险和续约或经营结果？"
        ),
    ),
    "generic": (
        (
            "请用 2 分钟介绍一个最能体现你胜任{role}的项目或经历。"
            "请说明背景、职责、关键行动、协作方式和结果。"
        ),
        "请结合这个项目说明，作为{role}你如何识别核心问题、做出关键判断，并与相关角色协作推进？",
        "如果项目结果没有达到预期，作为{role}你会如何定位原因、调整方案并沉淀复盘？",
    ),
}

ROLE_KEYWORDS: tuple[tuple[str, tuple[str, ...]], ...] = (
    (
        "ai_agent",
        ("ai agent", "agent", "智能体", "大模型应用", "llm", "rag", "langchain", "langgraph"),
    ),
    ("data", ("数据分析", "数据工程", "算法", "机器学习", "数据科学", "数仓", "bi", "推荐")),
    ("product_design", ("产品", "ux", "ui", "用户体验", "交互设计", "视觉设计", "用户研究")),
    ("growth_operations", ("运营", "增长", "商业化", "内容", "投放", "社区", "电商")),
    (
        "business_delivery",
        (
            "商务",
            "bd",
            "销售",
            "客户成功",
            "品牌",
            "市场",
            "实施",
            "交付",
            "解决方案",
            "售前",
            "项目经理",
            "客户支持",
            "商业策略",
        ),
    ),
    (
        "engineering",
        ("前端", "后端", "全栈", "数据库", "测试", "sre", "devops", "开发", "工程师", "运维"),
    ),
)


def next_interview_turn(
    session: RuntimeSessionContext,
    answer: str | None,
) -> NextInterviewResponse:
    """根据受控会话摘要生成下一步决策，不在 Runtime 内持久化业务事实。"""
    role_title = role_from_title(session.title)
    candidate_turns = session.candidate_turn_count + (1 if answer else 0)
    if not answer:
        return question("warmup", prompt_for(role_title, 0))
    if candidate_turns <= FIRST_FOLLOW_UP_TURN:
        return question("jd_core", prompt_for(role_title, 1))
    if candidate_turns <= SECOND_FOLLOW_UP_TURN:
        return question("project_deep_dive", prompt_for(role_title, 2))
    return final_question()


def role_from_title(title: str) -> str:
    role_title = title.removesuffix("模拟面试").strip()
    return role_title or "目标岗位"


def prompt_for(role_title: str, index: int) -> str:
    return ROLE_PROMPTS[role_category(role_title)][index].format(role=role_title)


def role_category(role_title: str) -> str:
    normalized = role_title.strip().lower()
    for category, terms in ROLE_KEYWORDS:
        if any(term in normalized for term in terms):
            return category
    return "generic"


def question(stage: InterviewStage, content: str) -> NextInterviewResponse:
    return NextInterviewResponse(stage=stage, content=content, should_finish=False)


def final_question() -> NextInterviewResponse:
    return NextInterviewResponse(
        stage="final_evaluation",
        content="本轮面试已完成，正在生成你的训练复盘。",
        should_finish=True,
    )

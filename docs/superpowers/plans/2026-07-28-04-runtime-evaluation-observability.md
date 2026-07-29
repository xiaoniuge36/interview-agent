# Runtime 工作流、评测与观测 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** 新增可恢复的 practice_report graph、Golden 评测 runner 和贯穿 API、Runtime、Provider、retrieval 的 trace 观测。

**Architecture:** practice_report graph 包含检索、生成、schema 校验、一次 repair 与确定性 fallback。Product API 继续保存报告和 MemoryEvent；OpenTelemetry 只补充观测，不替代数据库审计或回放事实。

**Tech Stack:** FastAPI、LangGraph、Pydantic、NestJS、OpenTelemetry、Phoenix、Pytest、Jest。

---

## 文件边界

- Create: apps/agent-runtime/app/schemas/practice_report.py
- Create: apps/agent-runtime/app/workflows/practice_report_graph.py
- Modify: apps/agent-runtime/app/main.py
- Modify: apps/agent-runtime/app/config.py
- Modify: apps/agent-runtime/pyproject.toml
- Modify: apps/product-api/src/modules/agent-runtime/agent-runtime.client.ts
- Modify: apps/product-api/src/modules/agent-runtime/model-invocation-grant.service.ts
- Modify: packages/contracts/src/schemas/ai-usage.ts
- Modify: packages/contracts/src/schemas/report.ts
- Create: evals/{practice-evaluation,report}/cases.json
- Create: evals/run-agent-evals.ts
- Modify: infra/docker/docker-compose.yml
- Modify: .env.example
- Test: apps/agent-runtime/tests/test_practice_report_graph.py
- Test: apps/product-api/src/modules/agent-runtime/agent-runtime.client.spec.ts

### Task 1: 定义 practice_report 输入输出和 Agent operation

- [x] Step 1: 写 Pydantic 与 Zod schema 的跨端 contract 测试。

  assert PracticeReportRequest.model_validate(valid_payload).trace_id == "trace-test-0001"
  expect(PracticeReportRuntimeSchema.parse(validPayload)).toMatchObject({ traceId: "trace-test-0001" });

- [x] Step 2: 增加 operation practice_report 和受限 grant。

  export const AiInvocationOperationSchema = z.enum(["model_connection_test", "practice_evaluation", "practice_report", "interview_next", "admin_page_agent", "user_page_agent"]);

- [x] Step 3: Product API 仅传本次 session、evaluations、已授权 retrieval context 和 traceId。

  const grant = this.grants.issue({ sessionId, commandId, traceId, operation: "practice_report" });

- [x] Step 4: 运行 contract 与 gateway 测试。

Run: pnpm contracts:check && pnpm --filter @interview-agent/product-api test -- agent-runtime

Expected: 无 grant、越权 operation 或 trace 不匹配均被拒绝。

### Task 2: 实现 graph、repair 与 fallback

- [x] Step 1: 为 valid、一次 repair 成功、第二次失败 fallback、checkpoint 恢复写 Pytest。

  result = await run_practice_report_graph(graph, valid_request())
  assert result.fallback_used is False
  assert fallback_result.fallback_used is True

- [x] Step 2: 建图并显式声明条件边。

  graph.add_edge(START, "prepare_context")
  graph.add_edge("prepare_context", "retrieve_evidence")
  graph.add_edge("retrieve_evidence", "synthesize_report")
  graph.add_conditional_edges("validate_schema", route_validation, {"valid": "emit_memory_events", "repair": "repair_once"})
  graph.add_edge("repair_once", "validate_schema")

- [x] Step 3: fallback 只使用已验证 evaluation，不调用模型。

  return deterministic_report(request.session, request.evaluations, request.trace_id)

- [x] Step 4: 注册 Runtime endpoint 和 checkpointer。

Run: pnpm --filter @interview-agent/agent-runtime test -- test_practice_report_graph.py test_contract_schema.py

Expected: 重试不改变用户事实；graph 恢复不会重复模型副作用。

### Task 3: 建立 Golden runner 与 LLM Judge 趋势

- [x] Step 1: 创建固定评分和报告 cases，包含事实、分数区间、缺失点、schema 和 evidence。

  {"id":"weak-system-design","answer":"只描述组件", "expectedScoreRange":[35,60], "requiredMissingPoints":["容量规划"]}

- [x] Step 2: runner 先执行确定性断言，再选择性调用 Judge。

  const deterministic = validateCase(caseInput, output);
  const judge = process.env.LLM_JUDGE_ENABLED === "true" ? await judgeCase(caseInput, output) : null;

- [x] Step 3: 将 schema pass、fallback rate、Golden 成绩写 JSON artifact。

Run: pnpm exec tsx evals/run-agent-evals.ts

Expected: 不依赖真实 Provider 时仍能通过确定性 gate。

### Task 4: 接入 OpenTelemetry/Phoenix

- [x] Step 1: 写 span 属性清洗测试，确保没有 API key、完整答案或 Authorization。

  expect(sanitizeSpanAttributes({ apiKey: "secret", answer: longAnswer })).not.toHaveProperty("apiKey");

- [x] Step 2: 以 traceId 建立 API command、retrieval、Runtime、Provider span。

  with tracer.start_as_current_span("practice_report") as span:
  span.set_attribute("interview_agent.trace_id", request.trace_id)

- [x] Step 3: 通过环境变量配置 OTLP endpoint；未配置时无副作用运行。

Run: pnpm --filter @interview-agent/agent-runtime test && pnpm --filter @interview-agent/product-api test -- ai-usage agent-runtime

Expected: Phoenix 可用时看到关联 span；关闭时业务不失败。

### Task 5: 完整验证并提交

- [x] Step 1: 运行 Python lint/typecheck/test、contracts、agent eval 与定向 E2E。

Run: pnpm contracts:check && pnpm --filter @interview-agent/agent-runtime lint && pnpm --filter @interview-agent/agent-runtime typecheck && pnpm --filter @interview-agent/agent-runtime test && pnpm exec tsx evals/run-agent-evals.ts && pnpm test:e2e -- --grep "practice"

Expected: coverage、schema、Golden、fallback 和 E2E 均通过。

- [x] Step 2: 提交。

  git add apps/agent-runtime apps/product-api packages/contracts evals infra .env.example
  git commit -m "feat(runtime): 增加报告工作流与评测观测"

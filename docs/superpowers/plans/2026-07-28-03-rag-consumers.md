# RAG 产品消费者 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** 将已验证的 hybrid retrieval 逐步接入训练题单、面试追问和报告规划，并始终保留规则 fallback。

**Architecture:** 每个消费者使用独立 feature flag，Product API 负责鉴权、检索、来源验证和持久化；Runtime 只接收本次 grant 的有限 retrieval context。启用顺序固定为训练题单、面试追问、报告规划。

**Tech Stack:** NestJS、FastAPI/LangGraph、Zod、React、Jest、Pytest、Playwright。

---

## 文件边界

- Modify: apps/product-api/src/modules/practice/practice-recommendation.service.ts
- Modify: apps/product-api/src/modules/practice/practice-recommendation-context.ts
- Modify: apps/product-api/src/modules/interview/interview-command.builder.ts
- Modify: apps/product-api/src/modules/agent-runtime/agent-runtime.client.ts
- Modify: apps/product-api/src/common/config/environment.ts
- Modify: packages/contracts/src/schemas/question-catalog.ts
- Modify: packages/contracts/src/schemas/interview.ts
- Modify: apps/agent-runtime/app/schemas/interview.py
- Modify: apps/agent-runtime/app/workflows/interview_graph.py
- Create: apps/user-portal/src/components/questions/RecommendationSources.tsx
- Modify: apps/user-portal/src/components/questions/QuestionRecommendationBanner.tsx
- Modify: apps/user-portal/src/components/interview/InterviewPageContent.tsx
- Test: apps/product-api/src/modules/practice/practice-recommendation.service.spec.ts
- Test: apps/product-api/src/modules/interview/interview-command.service.spec.ts
- Test: apps/agent-runtime/tests/test_interview_graph.py
- Test: e2e/user-practice.spec.ts

### Task 1: 接入训练题单 RAG，并保留规则对照

- [ ] Step 1: 写 flag 关闭、无命中、RAG 命中和来源证据的测试。

  expect(await service.list(context)).toEqual([expect.objectContaining({ algorithm: "rules" })]);
  expect(await service.list(context)).toEqual([expect.objectContaining({ algorithm: "hybrid", evidence: expect.any(Array) })]);

- [ ] Step 2: 在 rules 选题之后尝试 hybrid candidate，失败回退到原规则。

  const result = flags.ragTraining ? await this.ragRecommendation(context, rules) : null;
  return result ?? rules;

- [ ] Step 3: 返回每个命中题目的 RetrievalEvidence，前端只展示来源和摘要。

<RecommendationSources evidence={recommendation.evidence} />

- [ ] Step 4: 固定相同 JD 和题库，运行 rules/hybrid A/B Golden case。

Run: pnpm --filter @interview-agent/product-api test -- practice-recommendation && pnpm exec tsx evals/retrieval/run-retrieval-eval.ts

Expected: RAG 指标低于规则基线时 flag 保持关闭。

### Task 2: 接入面试追问的受限 retrieval context

- [ ] Step 1: 写跨租户、无命中、含来源上下文和 Runtime 未获得自由查询权限的测试。

  expect(runtimeRequest.retrievalContext).toEqual(expect.arrayContaining([expect.objectContaining({ sourceId: expect.any(String) })]));
  expect(runtimeRequest).not.toHaveProperty("searchTool");

- [ ] Step 2: Product API 在签发 grant 前搜索并裁剪 context。

  const hits = await this.retrieval.search(context, { query: answer, purpose: "interview", limit: 6 });
  const request = buildRuntimeRequest({ session, command, retrievalContext: toRuntimeContext(hits) });

- [ ] Step 3: Runtime 只把 retrievalContext 作为只读 state，输出引用 sourceId。

  state.retrieval_context = request.retrieval_context
  decision = await generate_decision(state)
  validate_sources(decision, state.retrieval_context)

- [ ] Step 4: 运行 API、Runtime 与面试 smoke。

Run: pnpm --filter @interview-agent/product-api test -- interview && pnpm --filter @interview-agent/agent-runtime test -- test_interview_graph.py

Expected: 检索不可用不阻塞面试，引用不存在的 sourceId 被 schema 拒绝。

### Task 3: 接入报告规划，并分阶段启用

- [ ] Step 1: 写训练报告和面试报告在 flag 关闭时不读取 retrieval 的测试。

  expect(retrieval.search).not.toHaveBeenCalled();

- [ ] Step 2: 仅在 Plan 04 practice_report graph 达到 Golden 门槛后启用报告 retrieval。

  if (!flags.ragReport || !reportQualityGate.passed) return deterministicReport(input);

- [ ] Step 3: 将来源显示为可展开 evidence，而不在报告正文伪造事实。

<ReportEvidence sources={report.evidence} />

- [ ] Step 4: 增强 E2E，覆盖无命中和关闭 flag 的降级。

Run: pnpm test:e2e -- --grep "practice|interview"

Expected: 训练、面试、报告三个消费者均可独立关闭并回退。

### Task 4: 提交 RAG 消费者

- [ ] Step 1: 运行 contracts、API、Runtime、Portal、Golden 和 E2E。

Run: pnpm contracts:check && pnpm --filter @interview-agent/product-api test && pnpm --filter @interview-agent/agent-runtime test && pnpm --filter @interview-agent/user-portal test && pnpm test:e2e

Expected: 所有 flag 组合的关键路径通过。

- [ ] Step 2: 提交。

  git add packages/contracts apps/product-api apps/agent-runtime apps/user-portal e2e evals
  git commit -m "feat(rag): 接入训练与面试检索闭环"

# 训练体验、文档与总验收 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** 将统一记忆证据转化为错题本、弱项复练、套卷连续性和治理看板，并用文档和端到端剧本证明全能力闭环。

**Architecture:** 所有体验功能只消费已存在的 EvaluationResult、PracticeReport、MemoryEvent、MasteryProfile、RetrievalLog 和 AI usage。不得在 UI 复制推荐或评分规则；内容下架后保留历史但禁止生成新练习。

**Tech Stack:** Next.js、React、NestJS、Prisma、Vitest、Jest、Playwright、Markdown。

---

## 文件边界

- Create: apps/product-api/src/modules/practice/practice-mistake-book.service.ts
- Modify: apps/product-api/src/modules/practice/practice-query.service.ts
- Modify: apps/product-api/src/modules/practice/practice.controller.ts
- Modify: packages/contracts/src/schemas/practice.ts
- Modify: packages/contracts/src/schemas/api.ts
- Create: apps/user-portal/src/components/reports/MistakeBook.tsx
- Create: apps/user-portal/src/components/reports/MistakeBook.test.tsx
- Modify: apps/user-portal/src/components/reports/TrainingArchiveSummary.tsx
- Modify: apps/user-portal/src/components/reports/WeaknessReviewAction.tsx
- Modify: apps/user-portal/src/components/home/question-hub/TrainingContinuationCard.tsx
- Modify: apps/user-portal/src/components/interview/InterviewReviewPracticeAction.tsx
- Modify: apps/admin-console/src/components/dashboard/PlatformAiAnalytics.tsx
- Modify: apps/admin-console/src/components/dashboard/PlatformDashboard.tsx
- Modify: e2e/user-practice.spec.ts
- Modify: e2e/admin-governance.spec.ts
- Modify: README.md
- Create: docs/superpowers/DELIVERED.md

### Task 1: 提供错题本和弱项复练 API

- [ ] Step 1: 写分页、下架题目历史、跨租户和已复练状态测试。

  expect(await service.listMistakes(context, { page: 1 })).toEqual(expect.objectContaining({ items: expect.any(Array) }));
  await expect(service.listMistakes(otherTenantContext, { page: 1 })).resolves.not.toContainEqual(expect.objectContaining({ tenantId }));

- [ ] Step 2: 使用低分 EvaluationResult 加 MemoryEvent evidence 查询，返回历史快照而非题库可编辑对象。

  return MistakeBookSchema.parse({ questionSnapshot, score, evidence, canStartReview: question.status === "published" });

- [ ] Step 3: 复练只能创建引用已发布题目的 weakness_review session。

  if (!item.canStartReview) throw new ConflictException({ code: "MISTAKE_REVIEW_UNAVAILABLE" });

- [ ] Step 4: 运行 API 测试。

Run: pnpm --filter @interview-agent/product-api test -- mistake-book practice-query practice-command-weakness

Expected: 下架内容可回看但不可开始新练习。

### Task 2: 在 Portal 构建统一训练连续性

- [ ] Step 1: 写错题空态、复练、推荐 evidence、未完成训练优先级测试。

  expect(renderMistakeBook([])).toContain("还没有需要复练的错题");
  expect(renderContinuation({ active: activeSession, recommendation })).toContain("继续训练");

- [ ] Step 2: 将首页、报告、面试复练都跳转到同一 session creation API。

  await startWeaknessReview({ itemIds, loadRecommendations, createSession, router });

- [ ] Step 3: 展示证据来源、题目数量和预计时间，始终保留自主选题。

  <WeaknessReviewAction evidence={item.evidence} onStart={startReview} />

- [ ] Step 4: 运行组件测试。

Run: pnpm --filter @interview-agent/user-portal test -- MistakeBook TrainingArchiveSummary WeaknessReviewAction TrainingContinuationCard InterviewReviewPracticeAction

Expected: 页面不产生业务计算，所有行动通过 API。

### Task 3: 补齐后台质量与训练体验看板

- [ ] Step 1: 为 job、embedding 覆盖率、retrieval latency、schema pass、fallback、预算拒绝计数写聚合测试。

  expect(metrics).toMatchObject({ deadLetterJobs: 1, retrievalCoverage: 0.8, fallbackRate: 0.1 });

- [ ] Step 2: 复用 PlatformAiAnalytics 查询层，增加脱敏聚合，不返回 prompt、答案或 key。

  return { retrievalLatencyMs, schemaPassRate, fallbackRate, budgetRejected, deadLetterJobs };

- [ ] Step 3: 运行 Admin 测试和 build。

Run: pnpm --filter @interview-agent/admin-console test -- PlatformAiAnalytics PlatformDashboard && pnpm --filter @interview-agent/admin-console build

Expected: 看板展示聚合结果，不泄露用户数据。

### Task 4: 固化端到端验收和文档

- [ ] Step 1: 扩展 E2E 为资产发布、embedding 完成、训练、记忆、推荐、面试复练闭环。

  await expect(page.getByLabel("推荐依据")).toBeVisible();
  await expect(page.getByRole("button", { name: "复练薄弱项" })).toBeVisible();

- [ ] Step 2: README 能力矩阵只标记已有自动化证据的能力。

  | Memory 闭环 | 已交付 | practice/interview integration + user-practice E2E |

- [ ] Step 3: 创建 DELIVERED 索引，将历史 plan/spec 标记为 delivered、superseded 或 active。

Run: pnpm test:e2e && pnpm verify

Expected: 隔离环境的完整剧本和全仓库门禁通过。

### Task 5: 最终审阅和提交

- [ ] Step 1: 检查文档声明、E2E 名称和实际实现一致。

Run: rg -n "已交付|未交付|RAG|MemoryEvent|LLM Judge" README.md docs/superpowers

Expected: 没有把外部云部署或真实 Provider CI 描述为已完成。

- [ ] Step 2: 提交体验和验收。

  git add apps/product-api apps/user-portal apps/admin-console e2e README.md docs/superpowers
  git commit -m "feat(training): 完成复练体验与验收闭环"

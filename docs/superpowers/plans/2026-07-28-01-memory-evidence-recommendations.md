# MemoryEvent 与可解释推荐 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** 让刷题和面试通过相同的幂等事件更新掌握度，并让下一轮推荐返回可核验的结构化 evidence。

**Architecture:** Product API 在报告完成事务中写入 MemoryEvent 并调用纯函数投影 MasteryProfile。Runtime 只产出候选事件；前端只展示 Product API 返回的 evidence。

**Tech Stack:** NestJS、Prisma/PostgreSQL、Zod、Jest、Vitest、Playwright。

---

## 文件边界

- Create: packages/contracts/src/schemas/memory.ts
- Modify: packages/contracts/src/schemas/report.ts
- Modify: packages/contracts/src/schemas/question-catalog.ts
- Modify: packages/contracts/src/index.ts
- Modify: apps/product-api/prisma/schema/enums.prisma
- Modify: apps/product-api/prisma/schema/interview.prisma
- Modify: apps/product-api/prisma/schema/content.prisma
- Create: apps/product-api/prisma/schema/migrations/20260728170000_memory_event_v1/migration.sql
- Create: apps/product-api/src/modules/memory/memory-projection.ts
- Create: apps/product-api/src/modules/memory/memory-projection.service.ts
- Create: apps/product-api/src/modules/memory/memory.module.ts
- Modify: apps/product-api/src/modules/practice/practice-completion.service.ts
- Modify: apps/product-api/src/modules/interview/interview-report.factory.ts
- Modify: apps/product-api/src/modules/interview/interview-command-completion.handler.ts
- Modify: apps/product-api/src/modules/practice/practice-recommendation.service.ts
- Modify: apps/product-api/src/modules/practice/practice-recommendation-context.ts
- Modify: apps/user-portal/src/components/questions/QuestionRecommendationBanner.tsx
- Test: apps/product-api/src/modules/memory/memory-projection.spec.ts
- Test: apps/product-api/src/modules/practice/practice-command.integration.spec.ts
- Test: e2e/user-practice.spec.ts

### Task 1: 冻结 MemoryEvent v1 与 RecommendationEvidence 契约

- [ ] Step 1: 写 schema 失败测试。

  expect(() => MemoryEventSchema.parse({ schemaVersion: 1, dedupeKey: "", observedScore: 101 })).toThrow();
  expect(MemoryEventSchema.parse(validEvent)).toMatchObject({ sourceType: "practice", observedScore: 72 });

- [ ] Step 2: 定义版本化事件和推荐证据。

  export const MemoryEventSchema = z.object({
  schemaVersion: z.literal(1), dedupeKey: z.string().min(1),
  sourceType: z.enum(["practice", "interview"]), tag: z.string().min(1),
  observedScore: z.number().min(0).max(100), traceId: z.string().min(8),
  });

- [ ] Step 3: 添加字段、保留旧 enum 值并以部分唯一索引幂等。

  ALTER TYPE "MemoryEventType" ADD VALUE IF NOT EXISTS "skill_observation";
  ALTER TABLE "MemoryEvent" ADD COLUMN "schemaVersion" INTEGER NOT NULL DEFAULT 1;
  ALTER TABLE "MemoryEvent" ADD COLUMN "dedupeKey" TEXT;
  CREATE UNIQUE INDEX "MemoryEvent_dedupe_key" ON "MemoryEvent"("tenantId","userId","dedupeKey") WHERE "dedupeKey" IS NOT NULL;

- [ ] Step 4: 运行 contracts 和 Prisma 验证。

Run: pnpm contracts:check && pnpm db:validate && pnpm db:generate

Expected: 通过，旧 skill_delta 数据仍可读取。

### Task 2: 实现纯 Mastery 投影和事务服务

- [ ] Step 1: 为低分、连续高分、低置信度和重复事件写测试。

  expect(projectMastery(null, event(40)).score).toBe(40);
  expect(projectMastery(current(80, 2), event(90)).score).toBeGreaterThan(80);
  expect(projectMastery(current(80, 2), event(20, 0.1)).score).toBeGreaterThan(70);

- [ ] Step 2: 实现集中式加权平均纯函数。

  export function projectMastery(current: MasteryState | null, event: MemoryEvent): MasteryProjection {
  const weight = confidenceWeight(event.confidence);
  const total = (current?.weightedEvidence ?? 0) + weight;
  const score = ((current?.score ?? 0) * (current?.weightedEvidence ?? 0) + event.observedScore * weight) / total;
  return { score, weightedEvidence: total, evidenceCount: (current?.evidenceCount ?? 0) + 1, trend: trendFor(current?.score, score) };
  }

- [ ] Step 3: 在 service 中仅投影本次成功写入的事件。

  const result = await tx.memoryEvent.createMany({ data: records, skipDuplicates: true });
  if (result.count > 0) await this.projection.apply(tx, context, events);

- [ ] Step 4: 运行投影测试。

Run: pnpm --filter @interview-agent/product-api exec jest --runInBand memory-projection.spec.ts

Expected: 所有投影边界通过。

### Task 3: 接入 practice 和 interview 完成命令

- [ ] Step 1: 在 practice 集成测试中断言报告、事件和 Mastery 都持久化。

  expect(await prisma.memoryEvent.count({ where: { tenantId, sourceId: sessionId } })).toBeGreaterThan(0);
  expect(await prisma.masteryProfile.findUniqueOrThrow({ where: { tenantId_userId_tag: key } })).toMatchObject({ lastEvidenceSessionId: sessionId });

- [ ] Step 2: 由 evaluations 生成确定性事件，替换直接 Mastery upsert。

  const events = memoryEventsForPractice({ session, evaluations, traceId: context.traceId });
  await this.memory.apply(transaction, context, events);

- [ ] Step 3: 面试报告生成 observedScore 事件，并在 completion handler 调用同一 service。

  await this.memory.apply(transaction, preparation.context, report.memoryEvents);

- [ ] Step 4: 运行幂等和并发集成测试。

Run: RUN_DATABASE_INTEGRATION=true pnpm --filter @interview-agent/product-api exec jest --runInBand practice-command.integration.spec.ts interview-command.integration.spec.ts

Expected: 重复命令仅产生一组事件，平行会话不丢 evidence。

### Task 4: 输出并展示可解释推荐

- [ ] Step 1: 写高分 Mastery 不得成为弱项、evidence 必有来源的测试。

  expect(recommendationCandidates({ mastery: [{ tag: "系统设计", score: 92 }], ...base })).not.toContainEqual(expect.objectContaining({ weakTag: "系统设计" }));

- [ ] Step 2: 以 evidence 构建 reason，并限制候选和 evidence 数量。

  const evidence = buildRecommendationEvidence(input).slice(0, 4);
  return { ...selection, evidence, reason: summarizeEvidence(evidence) };

- [ ] Step 3: 在 Banner 中展示 evidence，保留自主选题入口。

  <ul aria-label="推荐依据">{recommendation.evidence.map((item) => <li key={item.type + item.sourceId}>{item.label}：{item.detail}</li>)}</ul>

- [ ] Step 4: 运行 API、UI 和 E2E。

Run: pnpm --filter @interview-agent/product-api test -- practice-recommendation practice-completion interview-report && pnpm --filter @interview-agent/user-portal test -- QuestionRecommendationBanner AgentRecommendationRail && pnpm test:e2e -- --grep practice

Expected: 推荐证据真实可见，低分完成训练后下一轮推荐发生变化。

### Task 5: 提交纵切

- [ ] Step 1: 执行最终验证。

Run: pnpm contracts:check && pnpm db:validate && pnpm db:generate && pnpm --filter @interview-agent/product-api test && pnpm --filter @interview-agent/user-portal test

Expected: 通过。

- [ ] Step 2: 提交。

  git add packages/contracts apps/product-api apps/user-portal e2e
  git commit -m "feat(memory): 统一记忆写回与推荐证据"

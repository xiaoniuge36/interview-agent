# C 端自主刷题与 Agent 学习闭环 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 C 端首页改为可自主搜索、筛选和组题的题库大厅，并接入真实用户模型完成逐题评价、追问和能力回写。

**Architecture:** 新增只读题库目录模块，复用现有 Question 与 PracticeSession；答案保存、模型评价和整轮提交分离。前端使用首页题库大厅、独立选题页和单题播放器三个边界清晰的页面，所有 AI 评价经用户加密凭证与 ModelProviderClient 真实调用。

**Tech Stack:** Next.js 15、React 18、TypeScript、NestJS、Prisma/PostgreSQL、Zod、Vitest/Jest、现有 BYOK ModelProviderClient。

---

## 文件结构

- `packages/contracts/src/schemas/question-catalog.ts`：题库目录、推荐和最近练习契约。
- `packages/contracts/src/schemas/practice.ts`：逐题反馈与 follow-up 契约。
- `apps/product-api/src/modules/question-catalog/*`：题库查询与租户范围控制。
- `apps/product-api/src/modules/practice/practice-recommendation.service.ts`：推荐题单。
- `apps/product-api/src/modules/practice/practice-model-evaluator.ts`：真实模型评价。
- `apps/user-portal/src/components/home/question-hub/*`：首页题库大厅。
- `apps/user-portal/src/components/questions/*`：独立选题页。
- `apps/user-portal/src/components/practice/player/*`：单题播放器。
- `apps/user-portal/src/app/styles/question-hub.css`：题库大厅与选题页样式。
- `apps/user-portal/src/app/styles/practice-player.css`：单题作答样式。

## Task 1：契约与持久化

**Files:**
- Create: `packages/contracts/src/schemas/question-catalog.ts`
- Create: `packages/contracts/src/question-catalog.test.ts`
- Modify: `packages/contracts/src/schemas/practice.ts`
- Modify: `packages/contracts/src/index.ts`
- Modify: `apps/product-api/prisma/schema/content.prisma`
- Create: `apps/product-api/prisma/schema/migrations/20260715160000_practice_follow_up_question/migration.sql`

- [ ] **Step 1：先写失败契约测试**

测试目录响应不包含 `answer/rubric`，推荐最多 10 题，逐题反馈包含 `followUpQuestion` 与 `referenceAnswer`。

```ts
expect(QuestionCatalogResponseSchema.parse(payload).items[0]).not.toHaveProperty('answer');
expect(PracticeItemFeedbackSchema.parse(feedback).evaluation.followUpQuestion).toBeTruthy();
```

- [ ] **Step 2：运行 RED**

Run: `pnpm --filter @interview-agent/contracts test -- question-catalog.test.ts`
Expected: FAIL，缺少目录与反馈 Schema。

- [ ] **Step 3：实现最小契约**

定义 `QuestionCatalogQuery/Item/Facet/Response`、`PracticeRecommendationList`、`RecentPracticeSummary`、`PracticeItemFeedback`，并在 `PracticeEvaluationSchema` 增加可空 `followUpQuestion`。

- [ ] **Step 4：增加数据库字段**

```prisma
model EvaluationResult {
  followUpQuestion String?
}
```

迁移 SQL：

```sql
ALTER TABLE "EvaluationResult" ADD COLUMN "followUpQuestion" TEXT;
```

- [ ] **Step 5：运行 GREEN**

Run: `pnpm --filter @interview-agent/contracts test -- question-catalog.test.ts` — Expected: PASS。

## Task 2：题库目录 API

**Files:**
- Create: `apps/product-api/src/modules/question-catalog/question-catalog.module.ts`
- Create: `apps/product-api/src/modules/question-catalog/question-catalog.controller.ts`
- Create: `apps/product-api/src/modules/question-catalog/question-catalog.service.ts`
- Create: `apps/product-api/src/modules/question-catalog/question-catalog.service.spec.ts`
- Modify: `apps/product-api/src/app.module.ts`

- [ ] **Step 1：写范围与筛选失败测试**

覆盖 public/current tenant published、关键词、category 隐藏标签、type、difficulty、分页和空结果。

```ts
expect(prisma.question.findMany).toHaveBeenCalledWith(expect.objectContaining({
  where: expect.objectContaining({ status: 'published', OR: expect.any(Array) }),
}));
```

- [ ] **Step 2：运行 RED**

Run: `pnpm --filter @interview-agent/product-api test -- question-catalog.service.spec.ts`
Expected: FAIL，模块不存在。

- [ ] **Step 3：实现目录服务与控制器**

`GET /question-catalog` 使用参数化 Prisma 查询，返回摘要、分页和可见 facets；通过 `visiblePracticeTags()` 移除 `role:*` 标签，禁止返回答案和 rubric。

- [ ] **Step 4：运行 GREEN**

Run: `pnpm --filter @interview-agent/product-api test -- question-catalog.service.spec.ts`
Expected: PASS。

## Task 3：推荐题单与最近练习

**Files:**
- Create: `apps/product-api/src/modules/practice/practice-recommendation.service.ts`
- Create: `apps/product-api/src/modules/practice/practice-recommendation.service.spec.ts`
- Modify: `apps/product-api/src/modules/practice/practice-query.service.ts`
- Modify: `apps/product-api/src/modules/practice/practice.service.ts`
- Modify: `apps/product-api/src/modules/practice/practice.controller.ts`
- Modify: `apps/product-api/src/modules/practice/practice.module.ts`

- [ ] **Step 1：写推荐行为失败测试**

覆盖无档案通用精选、岗位 category、低 mastery 标签优先、排除最近已完成题、档案变化后重新计算，以及最近未完成 session。

- [ ] **Step 2：运行 RED**

Run: `pnpm --filter @interview-agent/product-api test -- practice-recommendation.service.spec.ts`
Expected: FAIL，推荐服务不存在。

- [ ] **Step 3：实现推荐与端点**

新增 `GET /practice-recommendations` 和 `GET /practices/recent`。推荐只使用数据库最新状态，不增加缓存；无档案时按通用精选与更新时间返回。

- [ ] **Step 4：运行 GREEN**

Run: `pnpm --filter @interview-agent/product-api test -- practice-recommendation.service.spec.ts`
Expected: PASS。

## Task 4：真实模型逐题评价

**Files:**
- Create: `apps/product-api/src/modules/practice/practice-model-evaluator.ts`
- Create: `apps/product-api/src/modules/practice/practice-model-evaluator.spec.ts`
- Modify: `apps/product-api/src/modules/practice/practice-command.service.ts`
- Modify: `apps/product-api/src/modules/practice/practice-mappers.ts`
- Modify: `apps/product-api/src/modules/practice/practice.service.ts`
- Modify: `apps/product-api/src/modules/practice/practice.controller.ts`
- Modify: `apps/product-api/src/modules/practice/practice.module.ts`

- [ ] **Step 1：写模型评价失败测试**

覆盖默认凭证解析、真实 Provider 调用、结构化 JSON 校验、无连接、鉴权/限流、follow-up 持久化、答案更新使旧评价失效和 self-study completion。

```ts
expect(provider.complete).toHaveBeenCalledWith(expect.objectContaining({ apiKey: 'decrypted' }));
expect(result.followUpQuestion).toBe('请进一步说明失败恢复策略。');
```

- [ ] **Step 2：运行 RED**

Run: `pnpm --filter @interview-agent/product-api test -- practice-model-evaluator.spec.ts`
Expected: FAIL，评价器不存在。

- [ ] **Step 3：实现 PracticeModelEvaluator**

使用 `ModelCredentialService.resolveDefault()` 与 `ModelProviderClient.complete()`；严格解析 score、feedback、missingPoints、rubricScores、followUpQuestion。无任何 deterministic fallback。

- [ ] **Step 4：拆分保存、评价与提交**

答案保存成功后删除旧评价并恢复 `answered`；`POST /practices/:id/items/:itemId/evaluate` 持久化新评价；整轮 submit 只聚合已有评价；`complete-self-study` 要求全部答案已保存并设置 `submitted`。

- [ ] **Step 5：运行 GREEN 与回归测试**

Run: `pnpm --filter @interview-agent/product-api test -- practice-model-evaluator.spec.ts practice-command.integration.spec.ts`
Expected: PASS。

## Task 5：前端数据客户端与纯状态模型

**Files:**
- Create: `apps/user-portal/src/lib/question-catalog-api.ts`
- Modify: `apps/user-portal/src/lib/practice-api.ts`
- Create: `apps/user-portal/src/components/questions/question-picker-model.ts`
- Create: `apps/user-portal/src/components/questions/question-picker-model.test.ts`
- Create: `apps/user-portal/src/components/practice/player/practice-player-model.ts`
- Create: `apps/user-portal/src/components/practice/player/practice-player-model.test.ts`

- [ ] **Step 1：写选择与导航失败测试**

覆盖去重选择、最多 10 题、移除/清空、当前题索引、下一未完成题和评价状态。

- [ ] **Step 2：运行 RED**

Run: `pnpm --filter @interview-agent/user-portal exec vitest run src/components/questions/question-picker-model.test.ts src/components/practice/player/practice-player-model.test.ts`
Expected: FAIL，模型文件不存在。

- [ ] **Step 3：实现纯模型和 API 客户端**

所有网络响应先通过共享 Zod Schema；URL 查询参数只发送已选择筛选；选择模型返回不可变数组与明确 limit 状态。

- [ ] **Step 4：运行 GREEN**

Run: 同 Step 2。
Expected: PASS。

## Task 6：首页题库大厅

**Files:**
- Create: `apps/user-portal/src/components/home/question-hub/QuestionHubPage.tsx`
- Create: `apps/user-portal/src/components/home/question-hub/QuestionSearchBar.tsx`
- Create: `apps/user-portal/src/components/home/question-hub/QuestionTopicGrid.tsx`
- Create: `apps/user-portal/src/components/home/question-hub/AgentRecommendationRail.tsx`
- Create: `apps/user-portal/src/components/home/question-hub/useQuestionHubData.ts`
- Modify: `apps/user-portal/src/components/home/HomePageContent.tsx`
- Modify: `apps/user-portal/src/components/shell/navigation.ts`
- Create: `apps/user-portal/src/app/styles/question-hub.css`
- Modify: `apps/user-portal/src/app/globals.css`

- [ ] **Step 1：实现首页数据状态**

并行加载 catalog、recommendations、recent practice；目录成功即渲染主区域，推荐失败只影响侧栏。

- [ ] **Step 2：实现题库大厅视觉**

首屏搜索与快捷分类，主体专题卡网格，右侧深色 Agent 推荐栏；推荐卡必须显示“为什么推荐”。无档案、无推荐、最近练习和加载失败均有行动入口。

- [ ] **Step 3：响应式验证**

1180px 以下侧栏下移，820px 以下筛选横向滚动，390px 卡片单列且无横向溢出。

## Task 7：独立选题页

**Files:**
- Create: `apps/user-portal/src/app/(app)/questions/page.tsx`
- Create: `apps/user-portal/src/components/questions/QuestionPickerPage.tsx`
- Create: `apps/user-portal/src/components/questions/QuestionFilterPanel.tsx`
- Create: `apps/user-portal/src/components/questions/QuestionCatalogList.tsx`
- Create: `apps/user-portal/src/components/questions/SelectedQuestionTray.tsx`
- Create: `apps/user-portal/src/components/questions/useQuestionPicker.ts`
- Modify: `apps/user-portal/src/components/shell/navigation.ts`

- [ ] **Step 1：实现筛选与分页**

URL 保留 query/category/type/difficulty/sort/page；改变筛选时回到第一页；请求失败保留用户已选题目。

- [ ] **Step 2：实现 1–10 题题单**

桌面右侧 sticky tray，移动端底部固定汇总；不足 1 题禁用开始，达到 10 题后给出明确提示。

- [ ] **Step 3：创建 manual session**

点击开始调用现有 create practice API，成功后导航 `/practice?session=<id>`，失败时保留题单。

## Task 8：单题播放器与真实反馈 UI

**Files:**
- Create: `apps/user-portal/src/components/practice/player/PracticePlayer.tsx`
- Create: `apps/user-portal/src/components/practice/player/PracticeQuestionNav.tsx`
- Create: `apps/user-portal/src/components/practice/player/PracticeQuestionStage.tsx`
- Create: `apps/user-portal/src/components/practice/player/PracticeCoachPanel.tsx`
- Create: `apps/user-portal/src/components/practice/player/usePracticePlayer.ts`
- Modify: `apps/user-portal/src/components/practice/PracticeWorkspace.tsx`
- Modify: `apps/user-portal/src/components/practice/PracticePageContent.tsx`
- Create: `apps/user-portal/src/app/styles/practice-player.css`
- Modify: `apps/user-portal/src/app/globals.css`

- [ ] **Step 1：恢复 session 与当前题**

从 URL session 参数加载；没有参数时显示题库入口；刷新后定位第一道未评价题。

- [ ] **Step 2：实现保存与评价分离**

保存回答先更新 session；AI 评价独立 loading/error 状态。`MODEL_CONNECTION_REQUIRED` 显示设置入口，Provider 错误提供重试且不清空回答。

- [ ] **Step 3：实现标准解析与 follow-up**

评价成功后展示 score、feedback、missingPoints、rubricScores、referenceAnswer 和 followUpQuestion；支持下一题和整轮提交。

- [ ] **Step 4：实现无模型自学结束**

全部答案保存后允许结束本轮自学，明确说明不会生成 AI 分数和 mastery。

## Task 9：验证与交付

**Files:**
- Modify only if verification reveals task-scoped defects.

- [ ] **Step 1：生成并验证 Prisma Client**

Run: `pnpm db:validate && pnpm db:generate`
Expected: PASS。

- [ ] **Step 2：完整自动化验证**

Run: `pnpm --filter @interview-agent/contracts test`
Run: `pnpm --filter @interview-agent/product-api lint && pnpm --filter @interview-agent/product-api typecheck && pnpm --filter @interview-agent/product-api test && pnpm --filter @interview-agent/product-api build`
Run: `pnpm --filter @interview-agent/user-portal lint && pnpm --filter @interview-agent/user-portal typecheck && pnpm --filter @interview-agent/user-portal test && pnpm --filter @interview-agent/user-portal build`
Expected: 全部退出码 0。

- [ ] **Step 3：浏览器验收**

桌面和 390px 验证：首页题库、无档案手动选题、1–10 题限制、session 恢复、答案保存、无模型提示、真实模型评价失败不丢答案、整轮复盘更新推荐。

- [ ] **Step 4：改动范围复核**

Run: `git diff --check`
确认未覆盖 admin-console 等已有用户改动。提交、推送和迁移部署必须再次获得用户明确授权。

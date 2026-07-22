# 训练档案与刷题复盘体验 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将刷题长反馈带到独立宽版复盘卡，并把复盘中心升级为可筛选的刷题、面试训练档案。

**Architecture:** 保持题目作答三栏的高效输入结构，新增由 `PracticePlayer` 管理的本题复盘对话框和就地 AI 确认卡。Product API 新增只读练习历史摘要，前端在 `/reports` 并行读取练习摘要和既有面试列表，再通过纯模型函数合并和筛选记录。

**Tech Stack:** Next.js 15、React 18、TypeScript、Zod、NestJS、Prisma、Vitest、Jest、CSS。

## 执行收尾（2026-07-22）

- 训练历史摘要、整轮报告确认卡、本题复盘和训练档案页面均已实现；合同、API 定向 Jest 和 4 个用户端复盘/档案测试通过。
- 用户端 typecheck、lint 与生产构建通过；Product API 的标准测试命令待开发服务停止后补跑，原因是其 Prisma 生成步骤受文件锁阻塞。

## Global Constraints

- 不迁移数据库，不修改认证、权限模型、会话存储、主题存储或已有记录。
- `GET /practices/history` 必须按 `tenantId` 与当前 `actor.id` 过滤，只返回摘要，最大 200 条。
- 不再让刷题整轮 AI 报告调用 `window.confirm`。
- 开发模拟身份与真实登录身份的现有行为保持不变。
- 所有新组件小于 300 行，函数不超过 50 行；复用既有 `PracticeSession`、`PracticeReport`、`InterviewSession` 合同。

---

### Task 1: 定义并提供刷题历史摘要

**Files:**

- Modify: `packages/contracts/src/schemas/practice.ts`
- Modify: `packages/contracts/src/index.ts`（仅当 practice schema 尚未被导出）
- Test: `packages/contracts/src/contracts.test.ts`
- Modify: `apps/product-api/src/modules/practice/practice-mappers.ts`
- Modify: `apps/product-api/src/modules/practice/practice-query.service.ts`
- Modify: `apps/product-api/src/modules/practice/practice.service.ts`
- Modify: `apps/product-api/src/modules/practice/practice.controller.ts`
- Create: `apps/product-api/src/modules/practice/practice-query.service.spec.ts`

**Interfaces:**

- Consumes: `PracticeSessionStatusSchema`、Prisma `practiceSession`、关联的 `items` 与可选 `report`。
- Produces: `PracticeHistoryItemSchema`、`PracticeHistoryListSchema` 以及 `GET /practices/history`。

- [ ] **Step 1: 写出合同和查询的失败测试**

```ts
expect(PracticeHistoryListSchema.parse([historyItem])).toHaveLength(1);
expect(prisma.practiceSession.findMany).toHaveBeenCalledWith(
  expect.objectContaining({
    where: { tenantId: 'tenant-a', userId: 'user-a' },
    orderBy: { updatedAt: 'desc' },
    take: 200,
  }),
);
```

Run: `pnpm --filter @interview-agent/contracts test -- contracts.test.ts && pnpm --filter @interview-agent/product-api test -- practice-query.service.spec.ts`

Expected: FAIL，因为 schema、`history()` 和 mapper 还不存在。

- [ ] **Step 2: 增加只读摘要合同与 mapper**

```ts
export const PracticeHistoryItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(CONTRACT_LIMITS.shortText),
  mode: PracticeModeSchema,
  status: PracticeSessionStatusSchema,
  questionCount: z.number().int().positive(),
  answeredCount: z.number().int().nonnegative(),
  evaluatedCount: z.number().int().nonnegative(),
  overallScore: z.number().min(0).max(CONTRACT_LIMITS.percentage).nullable(),
  weaknesses: z.array(z.string().max(CONTRACT_LIMITS.mediumText)).max(CONTRACT_LIMITS.list),
  reportedAt: z.string().datetime().nullable(),
  updatedAt: z.string().datetime(),
});
export const PracticeHistoryListSchema = z.array(PracticeHistoryItemSchema).max(200);
```

`mapHistoryItem` 从 `items` 计算已回答、已评价数量，从可选 report 读取总分和弱项，并将日期转换为 ISO 字符串。

- [ ] **Step 3: 通过服务、控制器暴露记录**

```ts
async history(context: ProductRequestContext): Promise<PracticeHistoryItem[]> {
  this.assertAction(context, 'practice:read', context.actor.id);
  const records = await this.prisma.practiceSession.findMany({
    where: { tenantId: context.tenantId, userId: context.actor.id },
    include: { items: { select: { answer: true, evaluation: { select: { id: true } } } }, report: true },
    orderBy: { updatedAt: 'desc' },
    take: 200,
  });
  return PracticeHistoryListSchema.parse(records.map(mapHistoryItem));
}
```

将 `PracticeService.history` 委托给 query service，并在 `:id` 路由之前注册 `@Get('practices/history')`。

- [ ] **Step 4: 运行定向测试**

Run: `pnpm --filter @interview-agent/contracts test -- contracts.test.ts && pnpm --filter @interview-agent/product-api test -- practice-query.service.spec.ts`

Expected: PASS，且测试覆盖租户/用户范围、排序、上限和报告缺失时的空摘要。

### Task 2: 将 AI 整轮报告确认改为就地确认卡

**Files:**

- Modify: `apps/user-portal/src/components/practice/player/practice-player-model.ts`
- Modify: `apps/user-portal/src/components/practice/player/practice-player-model.test.ts`
- Modify: `apps/user-portal/src/components/practice/player/usePracticePlayer.ts`
- Modify: `apps/user-portal/src/components/practice/player/PracticePlayer.tsx`
- Modify: `apps/user-portal/src/app/styles/practice-player-refinement.css`

**Interfaces:**

- Consumes: `pendingEvaluationCount(session)`、`player.submitAiReport()`、`player.busy`。
- Produces: `AiReportConfirmationCard` 的打开/取消/确认状态；提交 hook 不再接收 confirm callback。

- [ ] **Step 1: 更新模型测试，移除浏览器确认依赖**

```ts
expect(pendingEvaluationCount(session)).toBe(2);
expect(canSubmitAiReport(session)).toBe(true);
expect(confirmAiReportSubmission).toBeUndefined();
```

Run: `pnpm --filter @interview-agent/user-portal test -- practice-player-model.test.ts`

Expected: FAIL，因为旧函数仍导出且 hook 仍会调用 `window.confirm`。

- [ ] **Step 2: 让提交动作只负责真实提交**

```ts
const submitAiReport = useCallback(async () => {
  if (!context.sessionId || !context.state.session) return;
  setBusy(context.setState, 'submit-ai');
  // 继续使用现有 submitPracticeSession、reload session 和 mastery 的流程
}, [context]);
```

删除 `confirmAiReportSubmission` 和 `window.confirm` 调用，不改变额度提示、异常处理或服务端写入。

- [ ] **Step 3: 在 RoundCompletionBar 增加确认卡**

```tsx
{
  confirming ? (
    <section className="practice-ai-confirmation" aria-live="polite">
      <strong>确认生成本轮 AI 复盘</strong>
      <p>{`将自动评价 ${pendingCount} 道已保存题目，并消耗你配置的模型额度。`}</p>
      <div>
        <button className="secondary" type="button" onClick={() => setConfirming(false)}>
          暂不生成
        </button>
        <button type="button" onClick={() => void player.submitAiReport()}>
          开始生成复盘
        </button>
      </div>
    </section>
  ) : null;
}
```

首次点击主操作只打开确认卡；当 `pendingCount` 为 0 时主操作仍直接提交，因为不会新增逐题模型调用。

- [ ] **Step 4: 运行定向测试**

Run: `pnpm --filter @interview-agent/user-portal test -- practice-player-model.test.ts PracticeCompletionPanel.test.tsx`

Expected: PASS。

### Task 3: 提供宽版本题复盘卡

**Files:**

- Create: `apps/user-portal/src/components/practice/player/PracticeItemReviewDialog.tsx`
- Create: `apps/user-portal/src/components/practice/player/PracticeItemReviewDialog.test.tsx`
- Modify: `apps/user-portal/src/components/practice/player/PracticeCoachPanel.tsx`
- Modify: `apps/user-portal/src/components/practice/player/PracticePlayer.tsx`
- Create: `apps/user-portal/src/app/styles/practice-item-review.css`
- Modify: `apps/user-portal/src/app/globals.css`

**Interfaces:**

- Consumes: 当前 `PracticeSession` item、草稿、可选 `PracticeItemSolution` 和 `PracticeEvaluation`。
- Produces: 由 `open`、`onClose` 控制、具名 `aria-labelledby` 的宽版本题复盘 dialog。

- [ ] **Step 1: 写出复盘对话框的失败测试**

```tsx
const html = renderToStaticMarkup(
  <PracticeItemReviewDialog
    open
    item={item}
    draft="我的回答"
    solution={solution}
    onClose={vi.fn()}
  />,
);
expect(html).toContain('role="dialog"');
expect(html).toContain('我的回答');
expect(html).toContain('标准解析');
expect(html).toContain('AI 评价');
```

Run: `pnpm --filter @interview-agent/user-portal test -- PracticeItemReviewDialog.test.tsx`

Expected: FAIL，因为组件不存在。

- [ ] **Step 2: 实现纯展示的复盘 dialog**

```tsx
if (!open) return null;
return (
  <div className="practice-item-review-backdrop" role="presentation">
    <section
      className="practice-item-review"
      role="dialog"
      aria-modal="true"
      aria-labelledby="practice-item-review-title"
    >
      <header>…关闭按钮…</header>
      <ReviewSection title="我的回答">{draft || item.answer || '尚未保存回答'}</ReviewSection>
      <ReviewSection title="标准解析">…solution…</ReviewSection>
      <ReviewSection title="AI 评价">…evaluation…</ReviewSection>
    </section>
  </div>
);
```

当解析或评价不存在时显示准确的等待文案，不伪造评价。组件用 effect 将焦点移到标题，并在关闭后恢复调用方保存的 trigger ref。

- [ ] **Step 3: 将右栏降级为入口，连接 dialog**

```tsx
<PracticeCoachPanel
  …
  onOpenReview={() => setReviewOpen(true)}
/>
<PracticeItemReviewDialog
  open={reviewOpen}
  item={item}
  draft={draft}
  solution={player.solutions[item.id]}
  onClose={() => setReviewOpen(false)}
/>
```

只有已有标准解析或 AI 评价时渲染“打开本题复盘”；右栏保留轻量状态和现有操作。

- [ ] **Step 4: 添加响应式样式并运行测试**

Run: `pnpm --filter @interview-agent/user-portal test -- PracticeItemReviewDialog.test.tsx PracticeLearningNotice.test.tsx`

Expected: PASS；桌面卡片最大阅读宽度约 920px，小屏幕改为贴边单列。

### Task 4: 训练档案聚合页

**Files:**

- Modify: `apps/user-portal/src/lib/practice-api.ts`
- Modify: `apps/user-portal/src/hooks/useInterviewController.ts`
- Create: `apps/user-portal/src/components/reports/training-records-model.ts`
- Create: `apps/user-portal/src/components/reports/training-records-model.test.ts`
- Modify: `apps/user-portal/src/components/reports/ReportsPageContent.tsx`
- Create: `apps/user-portal/src/app/styles/training-archive.css`
- Modify: `apps/user-portal/src/app/globals.css`

**Interfaces:**

- Consumes: `listPracticeHistory(): Promise<PracticeHistoryItem[]>` 和既有 `listInterviews(): Promise<InterviewSession[]>`。
- Produces: `TrainingRecord` 联合类型、`filterTrainingRecords` 与以 `?type=all|practice|interview` 控制的档案列表。

- [ ] **Step 1: 写出记录模型的失败测试**

```ts
expect(buildTrainingRecords(practices, interviews).map((record) => record.id)).toEqual([
  'practice-newer',
  'interview-older',
]);
expect(filterTrainingRecords(records, 'practice')).toHaveLength(1);
```

Run: `pnpm --filter @interview-agent/user-portal test -- training-records-model.test.ts`

Expected: FAIL，因为模型不存在。

- [ ] **Step 2: 实现只读前端 API 和纯模型**

```ts
export function listPracticeHistory(): Promise<PracticeHistoryItem[]> {
  return apiRequest({ path: '/practices/history', schema: PracticeHistoryListSchema });
}
```

`buildTrainingRecords` 将 practice 与 interview 映射为共用的 `id`、`kind`、`title`、`updatedAt`、`status`、`href`、`facts`、`signals`；按日期倒序，并不为面试历史额外发起 N+1 报告请求。

`useInterviewController` 读取可选的 `session` 查询参数，按当前用户权限加载对应面试会话；仅在会话已 `report_ready` 时请求该报告，使档案中的面试记录能被真正打开而非重新开始。

- [ ] **Step 3: 重写 `/reports` 为训练档案**

```tsx
const [practiceResult, interviewResult] = await Promise.allSettled([
  listPracticeHistory(),
  listInterviews(),
]);
const records = buildTrainingRecords(practiceItems, interviews);
```

使用 `useSearchParams` 和 `router.replace` 管理类型筛选。每条记录是可点击的语义化 Link；刷题跳转 `/practice?session=<id>`，面试跳转 `/interview?session=<id>`。保留单来源失败、无记录、加载中和重试状态。

- [ ] **Step 4: 加入档案样式与响应式布局**

```css
.training-archive-list {
  display: grid;
  gap: 12px;
}
.training-archive-record {
  grid-template-columns: 44px minmax(0, 1fr) auto;
}
@media (max-width: 680px) {
  .training-archive-record {
    grid-template-columns: 40px minmax(0, 1fr);
  }
}
```

使用蓝色作为当前筛选和练习记录标识，薄荷绿仅表达已完成。档案卡不堆叠无意义的统计图表。

- [ ] **Step 5: 运行定向测试**

Run: `pnpm --filter @interview-agent/user-portal test -- training-records-model.test.ts reports-model.test.ts`

Expected: PASS。

### Task 5: 集成验证与审查

**Files:**

- Test: 上述新增或更新的 tests。

- [ ] **Step 1: 运行用户端与 API 定向测试**

Run: `pnpm --filter @interview-agent/contracts test -- contracts.test.ts && pnpm --filter @interview-agent/product-api test -- practice-query.service.spec.ts && pnpm --filter @interview-agent/user-portal test -- practice-player-model.test.ts PracticeItemReviewDialog.test.tsx training-records-model.test.ts`

Expected: PASS。

- [ ] **Step 2: 运行静态验证**

Run: `pnpm --filter @interview-agent/user-portal typecheck && pnpm --filter @interview-agent/user-portal lint && pnpm --filter @interview-agent/user-portal build && pnpm --filter @interview-agent/product-api typecheck && pnpm --filter @interview-agent/product-api lint`

Expected: 每个命令 exit 0。

- [ ] **Step 3: 检查改动范围**

Run: `git diff --check && git status --short`

Expected: 无空白错误；不包含数据库迁移、认证、权限或主题存储改动。

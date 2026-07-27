# Weakness Review Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让用户从训练档案一键创建基于个人最新未掌握题目的 `weakness_review` 练习，并直接进入刷题播放器。

**Architecture:** Product API 新增一个纯选题边界函数，查询当前用户按时间倒序的历史评价，每题只保留最新一次并筛出当前低于 60 分的题目，服务端完成权限过滤、当前分数排序和数量截断；现有 `PracticeCommandService` 只按模式路由。用户端用独立动作组件调用现有创建会话 API、显示通知并跳转，不把选题策略放进页面组件。

**Tech Stack:** NestJS 11、Prisma 6、Jest、Next.js 15、React 18、Vitest、TypeScript 5

## Global Constraints

- 不修改 `packages/contracts`、Prisma schema、迁移、根配置、依赖或 CI。
- 只读取当前租户、当前用户的历史评价；只复练仍为 `published` 且当前租户可见的题目。
- 每题只看最新评价，最新得分低于 60 分才进入复练，按当前分数从低到高排列，最多 5 题；没有可用历史题时返回明确的 400 错误。
- 函数不超过 50 行、文件不超过 300 行、嵌套不超过 3 层、位置参数不超过 3 个、圈复杂度不超过 10、禁止未命名魔法数字。
- 构建与 TypeScript 检查串行运行，避免 Next.js `.next/types` 重建竞态。
- 本会话不执行 commit、push 或 PR；git 历史操作需要用户另行确认。

---

### Task 1: 服务端弱项选题

**Files:**

- Create: `apps/product-api/src/modules/practice/practice-weakness-selector.ts`
- Create: `apps/product-api/src/modules/practice/practice-weakness-selector.spec.ts`
- Create: `apps/product-api/src/modules/practice/practice-command-weakness.spec.ts`
- Modify: `apps/product-api/src/modules/practice/practice-command.service.ts`

**Interfaces:**

- Consumes: `PrismaService`、`ProductRequestContext`、既有 `CreatePracticeSession.mode`。
- Produces: `selectWeaknessQuestions(prisma: PrismaService, context: ProductRequestContext): Promise<Question[]>`。

- [x] **Step 1: 写失败测试，锁定用户范围、低分顺序、去重和上限**

```ts
test('selects the current user lowest-score published questions once', async () => {
  prisma.evaluationResult.findMany.mockResolvedValue([
    evidence('question-low', 35),
    evidence('question-low', 42),
    evidence('question-next', 55),
  ]);

  await expect(selectWeaknessQuestions(prisma as never, context)).resolves.toEqual([
    expect.objectContaining({ id: 'question-low' }),
    expect.objectContaining({ id: 'question-next' }),
  ]);
  expect(prisma.evaluationResult.findMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: expect.objectContaining({
        tenantId: 'tenant-1',
        sessionItem: expect.objectContaining({ session: { userId: 'user-1' } }),
      }),
      orderBy: { score: 'asc' },
    }),
  );
});
```

- [x] **Step 2: 运行测试并确认 RED**

Run: `pnpm --filter @interview-agent/product-api exec jest --runInBand src/modules/practice/practice-weakness-selector.spec.ts`  
Expected: FAIL，提示模块或 `selectWeaknessQuestions` 不存在。

- [x] **Step 3: 实现最小选题函数**

```ts
const WEAKNESS_QUESTION_COUNT = 5;
const WEAKNESS_CANDIDATE_LIMIT = 20;
const CURRENT_WEAK_SCORE = 60;

export async function selectWeaknessQuestions(
  prisma: PrismaService,
  context: ProductRequestContext,
) {
  const evidence = await prisma.evaluationResult.findMany({
    where: {
      tenantId: context.tenantId,
      sessionItem: {
        session: { userId: context.actor.id },
        question: {
          status: 'published',
          OR: [{ tenantId: context.tenantId }, { visibility: 'public' }],
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: WEAKNESS_CANDIDATE_LIMIT,
    select: { score: true, sessionItem: { select: { question: true } } },
  });
  const latest = new Map<string, (typeof evidence)[number]>();
  for (const item of evidence) {
    if (!latest.has(item.sessionItem.question.id)) latest.set(item.sessionItem.question.id, item);
  }
  return [...latest.values()]
    .filter((item) => item.score < CURRENT_WEAK_SCORE)
    .sort((left, right) => left.score - right.score)
    .slice(0, WEAKNESS_QUESTION_COUNT)
    .map((item) => item.sessionItem.question);
}
```

- [x] **Step 4: 写失败测试，锁定 `weakness_review` 路由与空结果错误**

```ts
it('uses historical weakness questions when weakness_review has no explicit ids', async () => {
  prisma.evaluationResult.findMany.mockResolvedValue([evidence('question-low', 35)]);
  await service.create(context, { title: '薄弱项复练', mode: 'weakness_review' });
  expect(prisma.practiceSession.create).toHaveBeenCalledWith(
    expect.objectContaining({ data: expect.objectContaining({ mode: 'weakness_review' }) }),
  );
});

it('rejects weakness review before creating a session when no evidence exists', async () => {
  prisma.evaluationResult.findMany.mockResolvedValue([]);
  await expect(service.create(context, { mode: 'weakness_review' })).rejects.toMatchObject({
    response: expect.objectContaining({ code: 'PRACTICE_WEAKNESSES_UNAVAILABLE' }),
  });
});
```

- [x] **Step 5: 在命令服务按模式调用选择器**

```ts
if (input.questionIds?.length) return this.selectedQuestions(where, input.questionIds);
if (input.mode === 'weakness_review') {
  const questions = await selectWeaknessQuestions(this.prisma, context);
  if (!questions.length) {
    throw new BadRequestException({
      code: 'PRACTICE_WEAKNESSES_UNAVAILABLE',
      message: '还没有可复练的薄弱项，请先完成一轮 AI 评价。',
    });
  }
  return questions;
}
```

- [x] **Step 6: 运行后端定向测试并确认 GREEN**

Run: `pnpm --filter @interview-agent/product-api exec jest --runInBand src/modules/practice/practice-weakness-selector.spec.ts src/modules/practice/practice-mappers.spec.ts`  
Expected: PASS。

### Task 2: 训练档案一键复练动作

**Files:**

- Create: `apps/user-portal/src/components/reports/WeaknessReviewAction.tsx`
- Create: `apps/user-portal/src/components/reports/WeaknessReviewAction.test.tsx`
- Create: `apps/user-portal/src/components/reports/TrainingArchiveSummary.test.tsx`
- Modify: `apps/user-portal/src/components/reports/ReportsPageContent.tsx`

**Interfaces:**

- Consumes: `createPracticeSession(input)`、`useNotifications()`、`useRouter()`。
- Produces: `createWeaknessReviewSession(createSession?)` 和 `<WeaknessReviewAction />`。

- [x] **Step 1: 写失败测试，锁定请求和按钮状态**

```tsx
it('creates a weakness review session with the existing contract', async () => {
  const createSession = vi.fn().mockResolvedValue({ id: 'review-session' });
  await expect(createWeaknessReviewSession(createSession)).resolves.toMatchObject({
    id: 'review-session',
  });
  expect(createSession).toHaveBeenCalledWith({ title: '薄弱项复练', mode: 'weakness_review' });
});

it('renders a disabled progress state', () => {
  expect(
    renderToStaticMarkup(<WeaknessReviewButton starting onStart={() => undefined} />),
  ).toContain('正在组题…');
});
```

- [x] **Step 2: 运行测试并确认 RED**

Run: `pnpm --filter @interview-agent/user-portal exec vitest run src/components/reports/WeaknessReviewAction.test.tsx`  
Expected: FAIL，提示组件或创建函数不存在。

- [x] **Step 3: 实现创建函数、按钮和导航动作**

```tsx
export function createWeaknessReviewSession(createSession = createPracticeSession) {
  return createSession({ title: '薄弱项复练', mode: 'weakness_review' });
}

export function WeaknessReviewButton(props: { starting: boolean; onStart: () => void }) {
  return (
    <button className="button" type="button" disabled={props.starting} onClick={props.onStart}>
      {props.starting ? '正在组题…' : '复练薄弱项'}
    </button>
  );
}
```

`WeaknessReviewAction` 使用 `starting` 防重复提交；成功后通知并 `router.push(`/practice?session=${session.id}`)`；失败时恢复按钮并走现有错误通知。

- [x] **Step 4: 在训练概览挂载动作**

```tsx
function ArchiveSummary({ summary }: { summary: ReturnType<typeof summarizeTrainingRecords> }) {
  return (
    <section className="training-archive-summary" aria-label="训练概览">
      <div>
        {/* existing summary copy */}
        <WeaknessReviewAction />
      </div>
      {/* existing facts */}
    </section>
  );
}
```

- [x] **Step 5: 运行用户端定向测试并确认 GREEN**

Run: `pnpm --filter @interview-agent/user-portal exec vitest run src/components/reports/WeaknessReviewAction.test.tsx src/components/reports/training-records-model.test.ts`  
Expected: PASS。

### Task 3: 质量门禁与回归

**Files:**

- Verify only: Task 1 和 Task 2 的全部文件

**Interfaces:**

- Consumes: 已实现的弱项选题与用户入口。
- Produces: 可追溯的测试、Lint、类型和构建证据。

- [x] **Step 1: 格式化本轮文件并检查差异**

Run: `pnpm exec prettier --write docs/superpowers/specs/2026-07-23-weakness-review-loop-design.md docs/superpowers/plans/2026-07-23-weakness-review-loop.md apps/product-api/src/modules/practice/practice-weakness-selector.ts apps/product-api/src/modules/practice/practice-weakness-selector.spec.ts apps/product-api/src/modules/practice/practice-command.service.ts apps/user-portal/src/components/reports/WeaknessReviewAction.tsx apps/user-portal/src/components/reports/WeaknessReviewAction.test.tsx apps/user-portal/src/components/reports/ReportsPageContent.tsx`  
Expected: exit 0。

Run: `git diff --check`  
Expected: exit 0。

- [x] **Step 2: 运行两端 Lint 和定向测试**

Run: `pnpm --filter @interview-agent/product-api lint`  
Expected: exit 0。

Run: `pnpm --filter @interview-agent/user-portal lint`  
Expected: exit 0。

Run: `pnpm --filter @interview-agent/product-api test`  
Expected: exit 0。

Run: `pnpm --filter @interview-agent/user-portal test`  
Expected: exit 0。

- [x] **Step 3: 串行运行类型检查和生产构建**

Run: `pnpm --filter @interview-agent/product-api typecheck`  
Expected: exit 0。

Run: `pnpm --filter @interview-agent/user-portal typecheck`  
Expected: exit 0。

Run: `pnpm --filter @interview-agent/product-api build`  
Expected: exit 0。

Run: `pnpm --filter @interview-agent/user-portal build`  
Expected: exit 0。

- [x] **Step 4: 审查最终 diff**

确认没有修改共享契约、schema、迁移、根配置、依赖或仍在运行的后台任务文件；确认新增文件均小于 300 行，错误文案明确，查询包含租户和用户范围。

## Verification Notes

- Product API：ESLint 通过；直接 Jest 全量运行 66 个文件、235 项测试通过，5 个数据库集成套件按仓库配置跳过；三套 TypeScript 配置和直接 `nest build` 通过。
- User Portal：ESLint 通过；Vitest 全量运行 53 个文件、144 项测试通过；TypeScript 和 Next.js 生产构建通过。
- `pnpm --filter @interview-agent/product-api test/typecheck/build` 的前置步骤会重复执行 `prisma generate`；本机 14:48 启动的现存 Product API 开发进程锁住 `query_engine-windows.dll.node`，因此包装命令不能作为通过证据。本轮未终止该非任务进程，改用对应的直接 Jest、TypeScript 与 Nest 构建命令验证源码。
- 本地 `/reports` 返回 200，但浏览器没有登录会话，只能验证认证门禁，未完成真实训练档案视觉验收。
- 代码自审修复三项 Important 问题：成功导航前保持按钮锁定；没有刷题证据时不显示复练入口；每题只按最新评价判断是否仍为弱项，避免旧低分覆盖后续进步。

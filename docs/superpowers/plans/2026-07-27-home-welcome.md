# 首页陪练欢迎体验 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在首页训练计划卡中呈现基于昵称和真实续练状态的友好陪练开场。

**Architecture:** 新增纯函数模型隔离欢迎文案规则，新增无状态欢迎组件处理展示，首页容器从认证上下文取得昵称并将真实续练状态传入既有训练计划组件。推荐、续练和选题流程均不改动。

**Tech Stack:** Next.js、React、TypeScript、Vitest、CSS。

---

### Task 1: 建立可测试的欢迎文案模型

**Files:**

- Create: `apps/user-portal/src/components/home/question-hub/home-welcome-model.test.ts`
- Create: `apps/user-portal/src/components/home/question-hub/home-welcome-model.ts`

- [x] **Step 1: 写出失败的欢迎文案测试**

```ts
expect(createHomeWelcome('林夏', continuation)).toEqual({
  title: '欢迎回来，林夏',
  detail: '上次的训练还在这里等你',
});
expect(createHomeWelcome('林夏', null)).toEqual({
  title: '你好，林夏',
  detail: '今天，先完成一小步就很好',
});
expect(createHomeWelcome(undefined, null).title).toBe('你好');
```

- [x] **Step 2: 运行测试确认失败**

Run: `pnpm --filter @interview-agent/user-portal test -- home-welcome-model.test.ts`

Expected: FAIL，原因是 `createHomeWelcome` 尚未实现。

- [x] **Step 3: 实现最小欢迎文案模型**

```ts
export function createHomeWelcome(
  displayName: string | null | undefined,
  continuation: TrainingContinuation | null,
) {
  const name = displayName?.trim();
  return continuation
    ? { title: name ? `欢迎回来，${name}` : '欢迎回来', detail: '上次的训练还在这里等你' }
    : { title: name ? `你好，${name}` : '你好', detail: '今天，先完成一小步就很好' };
}
```

- [x] **Step 4: 运行测试确认通过**

Run: `pnpm --filter @interview-agent/user-portal test -- home-welcome-model.test.ts`

Expected: PASS。

### Task 2: 渲染欢迎层并接入首页

**Files:**

- Create: `apps/user-portal/src/components/home/question-hub/HomeWelcome.test.tsx`
- Create: `apps/user-portal/src/components/home/question-hub/HomeWelcome.tsx`
- Modify: `apps/user-portal/src/components/home/question-hub/AgentRecommendationRail.test.tsx`
- Modify: `apps/user-portal/src/components/home/question-hub/AgentRecommendationRail.tsx`
- Modify: `apps/user-portal/src/components/home/question-hub/QuestionHubPage.tsx`

- [x] **Step 1: 写出失败的静态渲染断言**

```tsx
expect(
  renderToStaticMarkup(createElement(HomeWelcome, { displayName: '林夏', continuation })),
).toContain('欢迎回来，林夏');
expect(markup).toContain('陪练已就位');
```

- [x] **Step 2: 运行测试确认失败**

Run: `pnpm --filter @interview-agent/user-portal test -- HomeWelcome.test.tsx AgentRecommendationRail.test.tsx`

Expected: FAIL，原因是欢迎组件和欢迎文案尚未渲染。

- [x] **Step 3: 新增组件并传递真实数据**

在 `QuestionHubPage` 使用 `useAuth().identity?.displayName`；扩展 `AgentRecommendationRail` 属性为 `displayName` 与 `continuation`，并在头部插入 `HomeWelcome`。不得改变 `onStart`、`onRetry` 或题单渲染。

- [x] **Step 4: 运行测试确认通过**

Run: `pnpm --filter @interview-agent/user-portal test -- HomeWelcome.test.tsx AgentRecommendationRail.test.tsx`

Expected: PASS。

### Task 3: 添加局部欢迎样式和响应式处理

**Files:**

- Modify: `apps/user-portal/src/app/styles/question-hub-training-plan.css`

- [x] **Step 1: 使用现有主题 token 定义欢迎层**

```css
.home-welcome {
  display: flex;
  gap: 1rem;
  justify-content: space-between;
}
.home-welcome-status {
  color: var(--agent-text);
}
@media (max-width: 760px) {
  .home-welcome {
    align-items: flex-start;
    flex-direction: column;
  }
}
```

欢迎层必须不覆盖推荐卡的操作样式；窄屏时状态提示下移，不挤压标题。

- [x] **Step 2: 格式化并执行定向检查**

Run: `pnpm exec prettier --check apps/user-portal/src/components/home/question-hub/HomeWelcome.tsx apps/user-portal/src/components/home/question-hub/home-welcome-model.ts apps/user-portal/src/app/styles/question-hub-training-plan.css`

Expected: PASS。

### Task 4: 完成集成验证

**Files:**

- Test: `apps/user-portal/src/components/home/question-hub/home-welcome-model.test.ts`
- Test: `apps/user-portal/src/components/home/question-hub/HomeWelcome.test.tsx`
- Test: `apps/user-portal/src/components/home/question-hub/AgentRecommendationRail.test.tsx`

- [x] **Step 1: 执行首页定向测试**

Run: `pnpm --filter @interview-agent/user-portal test -- home-welcome-model.test.ts HomeWelcome.test.tsx AgentRecommendationRail.test.tsx`

Expected: PASS。

- [x] **Step 2: 执行类型检查、格式检查、构建和 diff 检查**

Run: `pnpm --dir apps/user-portal exec tsc -p tsconfig.json --noEmit; pnpm exec prettier --check apps/user-portal/src/components/home/question-hub/home-welcome-model.ts apps/user-portal/src/components/home/question-hub/HomeWelcome.tsx apps/user-portal/src/components/home/question-hub/AgentRecommendationRail.tsx apps/user-portal/src/components/home/question-hub/QuestionHubPage.tsx apps/user-portal/src/app/styles/question-hub-training-plan.css; pnpm --filter @interview-agent/user-portal build; git diff --check`

Expected: 所有命令 exit 0。

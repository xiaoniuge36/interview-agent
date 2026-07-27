# 首页训练计划 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将首页的 Agent 推荐从侧栏提升为“今日训练计划”主入口，并将继续练习和题库发现收束为支撑信息。

**Architecture:** `AgentRecommendationRail` 保留现有推荐数据和开始回调，但改为首页宽幅训练意图卡；`QuestionHubPage` 将推荐卡置于首屏，最近练习、题库专题和快速发现置于下方内容区。所有首页样式使用现有主题 token，推荐加载、无推荐、失败与自主选题入口只通过渲染层重组，不触碰 `useQuestionHubData()`。

**Tech Stack:** Next.js 15、React 18、TypeScript、CSS、Vitest。

## Global Constraints

- 不修改推荐算法、请求、合同、题单创建、评分、持久化、路由、认证、主题存储或依赖。
- 有推荐时首页主区必须展示推荐依据、题数、预计时长和“采用并开始训练”；所有状态保留自主选题入口。
- 最近练习仅在已有真实未完成记录时渲染，继续链接与进度计算不变。
- `question-hub-base.css`、`question-hub-agent.css`、`question-hub-states.css` 和新增样式不得保留硬编码十六进制颜色。
- 移动端顺序为训练计划、最近练习、快速发现；主操作和自选入口占满可用宽度；尊重减少动画偏好。

---

### Task 1: 为首页推荐状态建立静态回归测试

**Files:**

- Create: `apps/user-portal/src/components/home/question-hub/AgentRecommendationRail.test.tsx`
- Modify: `apps/user-portal/src/components/home/question-hub/AgentRecommendationRail.tsx`

**Interfaces:**

- Consumes: 现有 `PracticeRecommendation[]`、`loading`、`error`、`onRetry` 与 `onStart`。
- Produces: 首页训练意图卡，成功态、无推荐态和失败态都包含可见的自主选题入口。

- [x] **Step 1: 写出推荐训练计划的失败断言**

```tsx
expect(markup).toContain('今天的训练计划');
expect(markup).toContain('采用这组题开始练习');
expect(markup).toContain('自己组一轮');
expect(markup).toContain('本轮训练依据');
```

在静态渲染中传入一条 `PracticeRecommendation` fixture；再为 `recommendations: []` 和错误状态断言“自己组一轮”仍存在。

- [x] **Step 2: 运行测试确认首页语义不存在**

Run: `pnpm --filter @interview-agent/user-portal test -- AgentRecommendationRail.test.tsx`

Expected: FAIL，提示缺少“今天的训练计划”或“自己组一轮”。

- [x] **Step 3: 重写推荐卡的状态文案与降级动作**

```tsx
<section className="home-training-plan" aria-labelledby="home-training-plan-heading">
  <header>
    <span>今天的训练计划</span>
    <h2 id="home-training-plan-heading">为你整理的下一组题</h2>
  </header>
  <RailPrimaryContent {...props} />
</section>
```

推荐成功态保留 `onStart(recommendation)`；加载、无推荐和失败态均渲染 `<Link href="/questions">自己组一轮</Link>`。失败态保留 `onRetry`，但不让重试成为唯一入口。

- [x] **Step 4: 运行推荐卡测试**

Run: `pnpm --filter @interview-agent/user-portal test -- AgentRecommendationRail.test.tsx`

Expected: PASS，所有推荐状态有真实说明与训练入口。

### Task 2: 重排首页为训练计划优先的信息层级

**Files:**

- Modify: `apps/user-portal/src/components/home/question-hub/QuestionHubPage.tsx`
- Modify: `apps/user-portal/src/components/home/question-hub/QuestionSearchBar.tsx`
- Modify: `apps/user-portal/src/app/styles/question-hub-base.css`
- Modify: `apps/user-portal/src/app/styles/question-hub-states.css`
- Create: `apps/user-portal/src/app/styles/question-hub-training-plan.css`
- Modify: `apps/user-portal/src/app/styles/question-hub.css`

**Interfaces:**

- Consumes: 既有 `useQuestionHubData()`、`RecentPracticeSummary`、题库 catalog 和 `AgentRecommendationRail`。
- Produces: 推荐计划先于继续练习、题库专题和快速发现的首页顺序；不改变任何数据加载或开始训练回调。

- [x] **Step 1: 将推荐计划移到首屏主位**

```tsx
<AgentRecommendationRail {...recommendationProps} />
<div className="question-hub-supporting-content">
  {data.recent ? <RecentPracticeCard recent={data.recent} /> : null}
  <QuestionSearchBar total={data.catalog?.total} compact />
  <QuestionTopicGrid catalog={data.catalog} />
  <QuestionDiscovery catalog={data.catalog} />
</div>
```

`QuestionSearchBar` 的 `compact` 模式只收缩介绍文案和搜索高度，不改变搜索路径或表单行为。继续练习卡保持只在 `data.recent` 存在时渲染。

- [x] **Step 2: 增加训练计划布局与移动端顺序**

```css
.home-training-plan {
  width: min(1480px, 100%);
  margin: 22px auto 0;
}

.question-hub-supporting-content {
  width: min(1480px, 100%);
  display: grid;
  gap: 24px;
  margin: 28px auto 0;
}
```

宽屏下最近练习与题库专题保持可扫读的内容列；小于 760px 时统一单栏、推荐按钮和自主入口全宽，避免固定侧栏。

- [x] **Step 3: 运行首页推荐回归测试**

Run: `pnpm --filter @interview-agent/user-portal test -- AgentRecommendationRail.test.tsx`

Expected: PASS。

### Task 3: 使首页与主题和强调色保持一致

**Files:**

- Modify: `apps/user-portal/src/app/styles/question-hub-base.css`
- Modify: `apps/user-portal/src/app/styles/question-hub-agent.css`
- Modify: `apps/user-portal/src/app/styles/question-hub-states.css`
- Modify: `apps/user-portal/src/app/styles/question-hub-training-plan.css`

**Interfaces:**

- Consumes: `--surface*`、`--ink`、`--text-*`、`--primary*`、`--agent-*`、`--success*`、`--warning*` 和 `--outline`。
- Produces: 首页背景、搜索、训练意图卡、最近练习、错误状态和题库发现均响应用户主题，不覆盖用户主题选择。

- [x] **Step 1: 将首页固定颜色改为主题 token**

```css
.question-hub-page {
  background:
    radial-gradient(
      circle at 94% 2%,
      color-mix(in srgb, var(--primary) 10%, transparent),
      transparent 27rem
    ),
    var(--surface-subtle);
}

.home-training-plan {
  border-color: color-mix(in srgb, var(--primary) 28%, var(--agent-outline));
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--agent-surface) 82%, var(--primary)),
    var(--agent-surface)
  );
}
```

替换首页、搜索、推荐卡、最近练习和错误状态的固定蓝、白、深色与提示色；仅使用语义 token 或 `color-mix()`。

- [x] **Step 2: 保留可访问性与减少动画行为**

```css
@media (prefers-reduced-motion: reduce) {
  .home-training-plan .agent-thinking i {
    animation: none;
  }
}
```

焦点态沿用全局 `:focus-visible`；推荐主操作、自选入口和继续练习链接有足够文字含义，不只使用颜色或图标。

- [x] **Step 3: 执行主题与格式审计**

Run: `rg -n "#[0-9a-fA-F]{3,8}" apps/user-portal/src/app/styles/question-hub-base.css apps/user-portal/src/app/styles/question-hub-agent.css apps/user-portal/src/app/styles/question-hub-states.css apps/user-portal/src/app/styles/question-hub-training-plan.css && pnpm exec prettier --check apps/user-portal/src/components/home/question-hub/QuestionHubPage.tsx apps/user-portal/src/components/home/question-hub/QuestionSearchBar.tsx apps/user-portal/src/components/home/question-hub/AgentRecommendationRail.tsx apps/user-portal/src/app/styles/question-hub-base.css apps/user-portal/src/app/styles/question-hub-agent.css apps/user-portal/src/app/styles/question-hub-states.css apps/user-portal/src/app/styles/question-hub-training-plan.css`

Expected: 颜色扫描无匹配，格式检查通过。

### Task 4: 集成验证

**Files:**

- Test: `apps/user-portal/src/components/home/question-hub/AgentRecommendationRail.test.tsx`

**Interfaces:**

- Consumes: 推荐主入口、题库降级入口和主题派生样式。
- Produces: 首页在推荐成功、加载、无推荐和失败状态下都有可用训练路径。

- [x] **Step 1: 运行首页定向测试**

Run: `pnpm --filter @interview-agent/user-portal test -- AgentRecommendationRail.test.tsx`

Expected: PASS。

- [x] **Step 2: 运行用户端应用检查**

Run: `pnpm --filter @interview-agent/user-portal typecheck && pnpm --filter @interview-agent/user-portal lint && pnpm --filter @interview-agent/user-portal build && git diff --check`

Expected: 所有命令 exit 0；改动只涉及用户端首页及本次设计、计划文档。

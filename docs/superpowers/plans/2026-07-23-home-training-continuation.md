# Home Training Continuation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 首页始终只展示最近一项未完成训练，并能恢复刷题或模拟面试的精确 session。

**Architecture:** 新增纯 `training-continuation` 模型统一两类状态；`useQuestionHubData` 并行读取现有查询并做局部降级；独立卡片组件按标准化 view model 呈现进度或现场状态。

**Tech Stack:** React 18、Next.js 15、TypeScript 5、Vitest、现有 CSS tokens

## Global Constraints

- 不修改 Product API、共享契约、Prisma schema、迁移、根配置、依赖或 CI。
- 只展示更新时间最新的一项活动训练；同时间优先刷题。
- 只接受 `running`、`waiting_user`、`generating_report` 模拟面试；排除不可恢复流的 `created`。
- 任一查询失败不能阻塞另一类恢复入口、推荐或题库。
- 保持现有三列卡片与移动端单列布局，不引入新字体、孤立色值或循环动画。
- 函数不超过 50 行、文件不超过 300 行、嵌套不超过 3 层、位置参数不超过 3 个、圈复杂度不超过 10。
- 本会话不执行 commit、push 或 PR。

---

### Task 1: 训练恢复选择模型

**Files:**

- Create: `apps/user-portal/src/components/home/question-hub/training-continuation.ts`
- Create: `apps/user-portal/src/components/home/question-hub/training-continuation.test.ts`

**Interfaces:**

- Produces: `selectTrainingContinuation(recentPractice, interviews): TrainingContinuation | null`。

- [x] **Step 1: 写失败测试**

覆盖非活动面试过滤、最新活动面试、刷题/面试跨类型时间比较、同时间优先刷题、空候选。

- [x] **Step 2: 运行测试确认 RED**

Run: `pnpm --filter @interview-agent/user-portal exec vitest run src/components/home/question-hub/training-continuation.test.ts`  
Expected: FAIL，模块不存在。

- [x] **Step 3: 实现标准化模型**

```ts
export type TrainingContinuation = {
  kind: 'practice' | 'interview';
  id: string;
  title: string;
  updatedAt: string;
  href: string;
  kicker: string;
  detail: string;
  actionLabel: string;
  progressPercent: number | null;
  statusLabel: string | null;
};

export function selectTrainingContinuation(
  recentPractice: RecentPracticeSummary | null,
  interviews: InterviewSession[],
): TrainingContinuation | null;
```

- [x] **Step 4: 运行模型测试确认 GREEN**

Run: `pnpm --filter @interview-agent/user-portal exec vitest run src/components/home/question-hub/training-continuation.test.ts`  
Expected: PASS。

### Task 2: 统一恢复卡片

**Files:**

- Create: `apps/user-portal/src/components/home/question-hub/TrainingContinuationCard.tsx`
- Create: `apps/user-portal/src/components/home/question-hub/TrainingContinuationCard.test.tsx`
- Modify: `apps/user-portal/src/app/styles/question-hub-states.css`

**Interfaces:**

- Consumes: `TrainingContinuation`。

- [x] **Step 1: 写失败组件测试**

刷题断言进度与 `/practice?session=`；面试断言现场状态与 `/interview?session=`。

- [x] **Step 2: 运行组件测试确认 RED**

Run: `pnpm --filter @interview-agent/user-portal exec vitest run src/components/home/question-hub/TrainingContinuationCard.test.tsx`  
Expected: FAIL，组件不存在。

- [x] **Step 3: 实现卡片与状态轨**

组件保留 `.recent-practice-card` 布局；`progressPercent !== null` 时渲染进度条，否则渲染 `.recent-training-status`，状态轨必须有可访问名称。

- [x] **Step 4: 运行组件测试确认 GREEN**

Run: `pnpm --filter @interview-agent/user-portal exec vitest run src/components/home/question-hub/TrainingContinuationCard.test.tsx`  
Expected: PASS。

### Task 3: 首页数据接入

**Files:**

- Modify: `apps/user-portal/src/components/home/question-hub/useQuestionHubData.ts`
- Modify: `apps/user-portal/src/components/home/question-hub/QuestionHubPage.tsx`

**Interfaces:**

- Consumes: `getRecentPractice`、`listInterviews`、`selectTrainingContinuation`、`TrainingContinuationCard`。

- [x] **Step 1: 并行读取并局部降级**

使用 `Promise.all`，两项分别 `.catch(() => fallback)`；将标准化 `continuation` 存入 state。

- [x] **Step 2: 替换旧刷题专用卡片**

删除 `RecentPracticeCard` 与本地百分比常量；`data.continuation` 存在时渲染统一卡片。

- [x] **Step 3: 运行定向测试**

Run: `pnpm --filter @interview-agent/user-portal exec vitest run src/components/home/question-hub/training-continuation.test.ts src/components/home/question-hub/TrainingContinuationCard.test.tsx src/components/home/question-hub/AgentRecommendationRail.test.tsx`  
Expected: PASS。

### Task 4: User Portal 完整门禁

- [x] **Step 1: Prettier 与 `git diff --check`**
- [x] **Step 2: ESLint 与完整 Vitest**
- [x] **Step 3: TypeScript 与 Next.js 生产构建**
- [x] **Step 4: 最终 diff 与视觉契约自审，记录证据**

## Verification Evidence

- RED：选择模型和卡片测试分别因模块不存在失败；`created` 面试回归测试先选中不可恢复 session，随后修正为排除。
- 定向 GREEN：3 个测试文件、10 项测试通过。
- 完整 Vitest：58 个测试文件、169 项测试通过。
- ESLint、TypeScript、Next.js 生产构建通过；构建生成 14 个静态页面。
- 视觉契约：沿用现有三列/移动端单列 continuation strip；刷题显示真实进度，面试显示静态现场状态轨；无新增循环动画和孤立色值。
- Prettier 与 `git diff --check` 已执行；相关生产文件均少于 300 行。

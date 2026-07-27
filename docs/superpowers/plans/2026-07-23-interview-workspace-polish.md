# 模拟面试工作台体验优化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将模拟面试页面改造成围绕真实会话状态、连续作答和可核对复盘的用户端工作台。

**Architecture:** 在已有 `InterviewSession` 上新增纯派生的会话摘要，只统计候选人已回答次数、当前阶段和真实会话状态；新展示组件消费该摘要、既有 `AiOperationPhase` 与控制器回调，不改变任何服务端请求。CSS 从已超出约定行数的 `interview.css` 拆出局部 refinement 文件，复用现有全局主题 token。

**Tech Stack:** Next.js 15、React 18、TypeScript、CSS、Vitest。

## Global Constraints

- 不修改 API、合同、SSE、模型调用、会话状态机、评分、持久化或路由。
- 只能展示 `InterviewSession.turns`、`status`、`stage`、`AiOperationPhase`、事件与报告中存在的真实数据。
- 不新增总题数、倒计时、能力增长、胜率或任何后端未提供的指标。
- 主题色必须使用 `var(--primary)`、`var(--primary-soft)`、`var(--surface)`、`var(--outline)`、`var(--success)` 或 `color-mix()` 派生；新增 CSS 文件保持 300 行以内。
- 窄屏布局、焦点可见性与 `prefers-reduced-motion` 必须保留。

---

### Task 1: 建立会话脉冲的纯派生状态

**Files:**

- Modify: `apps/user-portal/src/components/interview/interview-state.ts`
- Modify: `apps/user-portal/src/components/interview/interview-state.test.ts`

**Interfaces:**

- Consumes: `InterviewSession | null`。
- Produces: `interviewSessionProgress(session)`，返回 `{ answered: number; stage: InterviewStage | null; status: InterviewSessionStatus | 'idle' }`。

- [ ] **Step 1: 写出候选人回答数和初始状态的失败用例**

```ts
expect(interviewSessionProgress(null)).toEqual({
  answered: 0,
  stage: null,
  status: 'idle',
});
expect(interviewSessionProgress(sessionWithTwoCandidateTurns)).toEqual({
  answered: 2,
  stage: 'project_deep_dive',
  status: 'waiting_user',
});
```

- [ ] **Step 2: 运行状态测试确认派生函数尚不存在**

Run: `pnpm --filter @interview-agent/user-portal test -- interview-state.test.ts`

Expected: FAIL，提示 `interviewSessionProgress` 未导出。

- [ ] **Step 3: 实现只读取会话的进度派生函数**

```ts
export function interviewSessionProgress(session: InterviewSession | null) {
  return {
    answered: session?.turns.filter((turn) => turn.role === 'candidate').length ?? 0,
    stage: session?.stage ?? null,
    status: session?.status ?? 'idle',
  } as const;
}
```

- [ ] **Step 4: 重新运行状态测试**

Run: `pnpm --filter @interview-agent/user-portal test -- interview-state.test.ts`

Expected: PASS，现有流式状态断言继续通过。

### Task 2: 组织岗位控制和会话脉冲

**Files:**

- Create: `apps/user-portal/src/components/interview/InterviewSessionPulse.tsx`
- Create: `apps/user-portal/src/components/interview/InterviewSessionPulse.test.tsx`
- Modify: `apps/user-portal/src/components/interview/InterviewConsole.tsx`
- Modify: `apps/user-portal/src/components/interview/InterviewToolbar.tsx`

**Interfaces:**

- Consumes: `interviewSessionProgress(session)`、`AiOperationPhase | null`、`InterviewController.statusLabel`、既有岗位和 `start` 回调。
- Produces: `InterviewSessionPulse({ session, phase, statusLabel })`，展示已回答次数、真实阶段与真实状态；不发起任何请求。

- [ ] **Step 1: 写入会话脉冲静态渲染断言**

```tsx
expect(markup).toContain('已回答 2 题');
expect(markup).toContain('项目深挖');
expect(markup).toContain('AI 正在组织下一题');
expect(markup).not.toContain('预计完成时间');
```

- [ ] **Step 2: 运行组件测试确认新组件不存在**

Run: `pnpm --filter @interview-agent/user-portal test -- InterviewSessionPulse.test.tsx`

Expected: FAIL，提示 `InterviewSessionPulse` 未找到。

- [ ] **Step 3: 创建会话脉冲并接入控制台顶部**

```tsx
const PHASE_LABELS: Record<AiOperationPhase, string> = {
  preparing: 'AI 正在准备本轮问题',
  analyzing: 'AI 正在分析你的回答',
  composing: 'AI 正在组织下一题',
  validating: 'AI 正在核对结果',
  saving: 'AI 正在保存本轮结果',
};

export function InterviewSessionPulse({ session, phase, statusLabel }: Props) {
  const progress = interviewSessionProgress(session);
  return (
    <section className="interview-session-pulse" aria-label="本轮面试状态">
      <span>已回答 {progress.answered} 题</span>
      <strong>{progress.stage ? interviewStageLabel(progress.stage) : '准备开始'}</strong>
      <small>{phase ? PHASE_LABELS[phase] : statusLabel}</small>
    </section>
  );
}
```

在 `InterviewConsole` 中将其放在岗位焦点与工具栏之间；`InterviewToolbar` 的启动按钮保持现有 `controller.state.session`、`busy` 和 `controller.start()` 逻辑，仅补充清晰的分组类名与启动前说明。

- [ ] **Step 4: 重新运行脉冲与状态测试**

Run: `pnpm --filter @interview-agent/user-portal test -- InterviewSessionPulse.test.tsx interview-state.test.ts`

Expected: PASS，未开始、等待用户与 AI 处理中都有文字状态。

### Task 3: 强化对话区和答题提交的连续性

**Files:**

- Modify: `apps/user-portal/src/components/interview/Transcript.tsx`
- Modify: `apps/user-portal/src/components/interview/AnswerComposer.tsx`
- Create: `apps/user-portal/src/components/interview/InterviewAnswerComposer.test.tsx`

**Interfaces:**

- Consumes: 既有 `turns`、`streamingText`、`controller.canAnswer`、`controller.state.draft`、`controller.state.notice` 与 `CONTRACT_LIMITS.longText`。
- Produces: 具有 `data-state` 的对话区和字数提示的答题区；提交仍只调用 `controller.submitAnswer()`。

- [ ] **Step 1: 写入答题区结构断言**

```tsx
expect(markup).toContain('回答结构提示');
expect(markup).toContain('0 / ' + CONTRACT_LIMITS.longText.toLocaleString());
expect(markup).toContain('提交回答并继续');
expect(markup).toContain('AI 面试官正在准备下一题');
```

- [ ] **Step 2: 运行组件测试确认新提示尚不存在**

Run: `pnpm --filter @interview-agent/user-portal test -- InterviewAnswerComposer.test.tsx`

Expected: FAIL，缺少回答结构提示和字符计数。

- [ ] **Step 3: 最小化调整对话和答题结构**

```tsx
<div className="interview-answer-meta">
  <span>回答结构提示：背景、行动、判断、结果</span>
  <span>
    {controller.state.draft.length.toLocaleString()} / {CONTRACT_LIMITS.longText.toLocaleString()}
  </span>
</div>
```

让 `Transcript` 根据 `streamingText` 输出 `data-state="streaming"` 或 `data-state="ready"`；不改变 turn 内容、`aria-live`、textarea 的 `required`、最大长度和提交禁用逻辑。

- [ ] **Step 4: 运行答题和现有流式测试**

Run: `pnpm --filter @interview-agent/user-portal test -- InterviewAnswerComposer.test.tsx interview-state.test.ts`

Expected: PASS，答题提示、字符计数和已有流式状态均可渲染。

### Task 4: 细化运行状态与复盘侧栏

**Files:**

- Modify: `apps/user-portal/src/components/interview/RuntimeEventList.tsx`
- Modify: `apps/user-portal/src/components/interview/ReportPanel.tsx`
- Create: `apps/user-portal/src/components/interview/InterviewSidebar.test.tsx`

**Interfaces:**

- Consumes: 已有 events、phase、basisSummary 与 `InterviewReport | null`。
- Produces: 状态区的明确标题、当前 AI 阶段、真实依据和复盘完成状态；不创建新的报告数据。

- [ ] **Step 1: 写入侧栏状态断言**

```tsx
expect(runtimeMarkup).toContain('AI 当前处理');
expect(runtimeMarkup).toContain('本轮关注依据');
expect(reportMarkup).toContain('下一步建议');
expect(reportMarkup).toContain('完成一场模拟面试后');
```

- [ ] **Step 2: 运行侧栏测试确认新层级尚不存在**

Run: `pnpm --filter @interview-agent/user-portal test -- InterviewSidebar.test.tsx`

Expected: FAIL，缺少当前处理或下一步建议标签。

- [ ] **Step 3: 使用真实状态重组侧栏标题和说明**

```tsx
{phase ? <p className="interview-runtime-status" role="status">AI 当前处理：{PHASE_LABELS[phase]}</p> : null}
<h3>本轮关注依据</h3>
<h3>下一步建议</h3>
```

保持事件的时间、报告分数、分阶段得分、报告摘要和 `nextActions` 数据源不变；报告为空时继续显示现有引导文案。

- [ ] **Step 4: 运行侧栏与报告测试**

Run: `pnpm --filter @interview-agent/user-portal test -- InterviewSidebar.test.tsx`

Expected: PASS，事件、依据、报告和空报告状态均可读。

### Task 5: 拆分局部样式并完成应用验证

**Files:**

- Modify: `apps/user-portal/src/app/globals.css`
- Modify: `apps/user-portal/src/app/styles/interview.css`
- Create: `apps/user-portal/src/app/styles/interview-refinement.css`

**Interfaces:**

- Consumes: `interview-session-pulse`、`interview-answer-meta`、`data-state`、运行状态与侧栏类名。
- Produces: 桌面双栏、窄屏单栏、清晰主提交操作和主题自适应的面试席位视觉。

- [ ] **Step 1: 在全局样式中加载 refinement 文件**

```css
@import './styles/interview.css';
@import './styles/interview-refinement.css';
```

- [ ] **Step 2: 写入主题派生与移动端规则**

```css
.interview-session-pulse {
  border: 1px solid color-mix(in srgb, var(--primary) 24%, var(--outline));
  background: color-mix(in srgb, var(--primary-soft) 58%, var(--surface));
}

@media (max-width: 1080px) {
  .interview {
    grid-template-columns: 1fr;
  }
}
```

将新增视觉规则放入 `interview-refinement.css`，并将 `interview.css` 中可移动的旧式硬编码视觉规则迁移过去，使两个文件均不超过 300 行；为 760px 以下的岗位工具栏、答题提交与会话脉冲提供完整宽度的可触达布局。

- [ ] **Step 3: 运行用户端定向测试和静态检查**

Run: `pnpm --filter @interview-agent/user-portal test -- interview-state.test.ts InterviewSessionPulse.test.tsx InterviewAnswerComposer.test.tsx InterviewSidebar.test.tsx && pnpm --filter @interview-agent/user-portal lint && pnpm --filter @interview-agent/user-portal typecheck`

Expected: 所有测试通过，lint 与 typecheck 均 exit 0。

- [ ] **Step 4: 运行生产构建与差异检查**

Run: `pnpm --filter @interview-agent/user-portal build && git diff --check`

Expected: 两条命令均 exit 0，改动只涉及用户端模拟面试工作台及其设计、计划文档。

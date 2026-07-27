# 训练证据桌面 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将刷题、整轮复盘和训练档案打磨为主题自适应的训练证据闭环，让用户清楚理解当前状态、已沉淀证据和下一步动作。

**Architecture:** 在现有 `PracticeSession` 和训练记录模型之上增加纯派生的证据摘要，页面组件只消费该摘要并保留现有业务动作。刷题页、完成页和档案页共享强调色、状态色和表面色变量，所有局部样式从全局主题 token 推导，不覆盖 dawn、ocean、night 或四种强调色。

**Tech Stack:** Next.js 15、React 18、TypeScript、CSS、Vitest。

## 执行收尾（2026-07-22）

- 已增加纯训练证据摘要、刷题/完成复盘状态条和训练档案真实概览；没有改变请求、评分、推荐或持久化行为。
- 刷题、完成复盘和档案的局部样式已改为主题 token 派生。主题色审计未发现硬编码十六进制颜色。
- 7 个用户端定向测试文件（22 项断言）、typecheck、lint 与生产构建均已通过。
- 本地预览只能进入登录页，因没有可用会话而未进行已认证页面截图；未创建账户或测试数据。

## Global Constraints

- 不修改 API、合同、评分、推荐、持久化、路由、认证、主题存储或依赖。
- 主题色只能使用现有 CSS 变量及 `color-mix()` 派生；不得在刷题或档案样式中写死强调蓝、画布或文字颜色。
- “能力画像已更新”只在 `session.status === 'report_ready'` 时展示；自主结束只能说明回答已保存、不会写入能力画像。
- 宽屏保持答题区与教练栏的双栏结构；在 1080px 以下降为单栏，在 760px 以下题号横向滚动、操作按钮保持可触达。
- 新组件小于 300 行、函数小于 50 行；提交、路由和原有测试基线不在本计划中变更。

---

### Task 1: 建立可复用的训练证据摘要

**Files:**

- Modify: `apps/user-portal/src/components/practice/player/practice-player-model.ts`
- Modify: `apps/user-portal/src/components/practice/player/practice-player-model.test.ts`
- Create: `apps/user-portal/src/components/practice/player/PracticeEvidenceStrip.tsx`
- Create: `apps/user-portal/src/components/practice/player/PracticeEvidenceStrip.test.tsx`

**Interfaces:**

- Consumes: `PracticeSession` 的 `items`、`status` 与已有 `practiceProgress(session)`。
- Produces: `practiceEvidence(session)`，返回 `{ answered, evaluated, total, pending, profileState }`；`PracticeEvidenceStrip({ session, compact? })` 只渲染真实进度与下一步说明。

- [ ] **Step 1: 写出摘要和状态条的失败测试**

```tsx
expect(practiceEvidence(inProgressSession)).toEqual({
  answered: 2,
  evaluated: 1,
  total: 3,
  pending: 1,
  profileState: 'awaiting_report',
});

expect(renderToStaticMarkup(<PracticeEvidenceStrip session={reportReadySession} />)).toContain(
  '能力画像已更新',
);
expect(renderToStaticMarkup(<PracticeEvidenceStrip session={selfStudySession} />)).toContain(
  '回答已保留',
);
```

- [ ] **Step 2: 运行测试确认 API 尚不存在**

Run: `pnpm --filter @interview-agent/user-portal test -- practice-player-model.test.ts PracticeEvidenceStrip.test.tsx`

Expected: FAIL，提示 `practiceEvidence` 或 `PracticeEvidenceStrip` 未导出。

- [ ] **Step 3: 实现纯摘要与展示组件**

```ts
export function practiceEvidence(session: PracticeSession) {
  const { answered, evaluated, total } = practiceProgress(session);
  return {
    answered,
    evaluated,
    total,
    pending: Math.max(total - evaluated, 0),
    profileState:
      session.status === 'report_ready'
        ? 'updated'
        : session.status === 'in_progress'
          ? 'awaiting_report'
          : 'preserved',
  } as const;
}
```

`PracticeEvidenceStrip` 使用 `data-state` 输出“本题证据”“整轮复盘”与“下一轮推荐”之间的真实进度；`compact` 仅隐藏解释文本，不隐藏状态文字。

- [ ] **Step 4: 运行定向测试**

Run: `pnpm --filter @interview-agent/user-portal test -- practice-player-model.test.ts PracticeEvidenceStrip.test.tsx`

Expected: PASS，覆盖进行中、AI 复盘完成和自主结束状态。

### Task 2: 重构刷题工作台的状态层级与主题派生样式

**Files:**

- Modify: `apps/user-portal/src/components/practice/player/PracticePlayer.tsx`
- Modify: `apps/user-portal/src/components/practice/player/PracticeCoachPanel.tsx`
- Modify: `apps/user-portal/src/components/practice/player/PracticeRoundCompletionBar.tsx`
- Modify: `apps/user-portal/src/components/practice/player/PracticeQuestionNav.tsx`
- Modify: `apps/user-portal/src/app/styles/practice-player-refinement.css`
- Modify: `apps/user-portal/src/app/styles/practice-player-refinement-responsive.css`

**Interfaces:**

- Consumes: `PracticeEvidenceStrip`、既有保存/评价/生成整轮复盘回调和 `data-status` 题号状态。
- Produces: 头部、题号轨道、教练栏和整轮操作区共用的“训练证据”视觉语言；不改变任何回调时机或按钮禁用规则。

- [ ] **Step 1: 写入刷题结构回归断言**

```tsx
expect(markup).toContain('训练证据');
expect(markup).toContain('已回答');
expect(markup).toContain('下一轮推荐');
expect(markup).not.toContain('Focused practice');
```

在 `PracticeEvidenceStrip.test.tsx` 增加断言，确保状态条文本是中文、可读且不依赖颜色描述状态。

- [ ] **Step 2: 接入状态条和中文层级标签**

```tsx
<PlayerHeader title={session.title} progress={practiceProgress(session)} />
<PracticeEvidenceStrip session={session} compact />
```

将题号轨道标签改为“本轮进度”，将教练的步骤标签改为“标准解析”和“本题评价”；只保留有真实顺序意义的编号。

- [ ] **Step 3: 以主题变量重写局部颜色**

```css
.practice-player-page {
  --training-accent: var(--primary);
  --training-accent-strong: var(--primary-strong);
  --training-accent-soft: var(--primary-soft);
  --training-surface: var(--surface);
  --training-outline: var(--outline);
  background:
    radial-gradient(
      circle at 24% -10%,
      color-mix(in srgb, var(--primary) 12%, transparent),
      transparent 31%
    ),
    var(--surface-subtle);
}

.practice-evidence-strip[data-state='updated'] {
  border-color: color-mix(in srgb, var(--success) 35%, var(--outline));
  background: var(--success-soft);
}
```

替换 `practice-player-refinement.css` 中写死的蓝、白、墨色值；保留成功/警告的语义变量，夜间主题下不使用固定浅色背景。为 1080px、760px 与减少动画规则补齐证据条、操作区和题号轨道布局。

- [ ] **Step 4: 运行刷题定向测试与格式检查**

Run: `pnpm --filter @interview-agent/user-portal test -- PracticeEvidenceStrip.test.tsx PracticeLearningNotice.test.tsx PracticeCompletionPanel.test.tsx practice-player-model.test.ts && pnpm exec prettier --check apps/user-portal/src/components/practice/player/PracticePlayer.tsx apps/user-portal/src/components/practice/player/PracticeCoachPanel.tsx apps/user-portal/src/components/practice/player/PracticeRoundCompletionBar.tsx apps/user-portal/src/components/practice/player/PracticeQuestionNav.tsx apps/user-portal/src/components/practice/player/PracticeEvidenceStrip.tsx apps/user-portal/src/app/styles/practice-player-refinement.css apps/user-portal/src/app/styles/practice-player-refinement-responsive.css`

Expected: 所有测试与格式检查通过。

### Task 3: 将完成复盘转为可行动的整轮证据页

**Files:**

- Modify: `apps/user-portal/src/components/practice/player/PracticeCompletionPanel.tsx`
- Modify: `apps/user-portal/src/components/practice/player/PracticeCompletionPanel.test.tsx`
- Modify: `apps/user-portal/src/app/styles/practice-player-refinement.css`

**Interfaces:**

- Consumes: `PracticeSession`、`PracticeReport | null`、`MasteryProfile[]` 与 `PracticeEvidenceStrip`。
- Produces: 完成方式、回答/评价计数、真实能力影响说明、下一轮主操作和可逐题回看的证据列表。

- [ ] **Step 1: 写出两种完成方式的失败断言**

```tsx
expect(aiMarkup).toContain('能力画像已更新');
expect(aiMarkup).toContain('按最新推荐开始下一轮');
expect(selfStudyMarkup).toContain('回答已保留');
expect(selfStudyMarkup).toContain('不会更新能力画像');
```

- [ ] **Step 2: 将证据状态条嵌入完成页**

```tsx
<PracticeEvidenceStrip session={props.session} />
<section className="practice-completion-next-step">
  <span>下一步</span>
  <strong>{props.aiCompleted ? '按最新推荐开始下一轮' : '选择新的题目继续训练'}</strong>
</section>
```

让 AI 完成态的推荐按钮保持首要操作；自主结束态保留去题库入口并明确不写入能力画像。逐题按钮继续调用现有 `onReviewItem`。

- [ ] **Step 3: 增加主题自适应的完成态样式**

```css
.practice-completion-next-step {
  border: 1px solid color-mix(in srgb, var(--primary) 28%, var(--outline));
  background: color-mix(in srgb, var(--primary-soft) 74%, var(--surface));
}
```

完成页与逐题列表复用 `--training-*` 变量；在小屏幕把主操作和链接堆叠为全宽按钮，避免分数与状态文字挤压。

- [ ] **Step 4: 运行完成复盘回归测试**

Run: `pnpm --filter @interview-agent/user-portal test -- PracticeCompletionPanel.test.tsx PracticeItemReviewDialog.test.tsx`

Expected: PASS，AI 复盘和自主结束状态均有准确文案，逐题 dialog 行为保持不变。

### Task 4: 把训练档案升级为主题自适应的证据索引

**Files:**

- Modify: `apps/user-portal/src/components/reports/training-records-model.ts`
- Modify: `apps/user-portal/src/components/reports/training-records-model.test.ts`
- Modify: `apps/user-portal/src/components/reports/ReportsPageContent.tsx`
- Modify: `apps/user-portal/src/app/styles/training-archive.css`

**Interfaces:**

- Consumes: `TrainingRecord[]`、现有筛选状态和 `record.score`。
- Produces: `summarizeTrainingRecords(records)` 返回 `{ total, practice, interview, reviewed }`；档案页展示真实的训练概览、记录类型、结论和下一步。

- [ ] **Step 1: 写出档案摘要模型失败测试**

```ts
expect(summarizeTrainingRecords(records)).toEqual({
  total: 3,
  practice: 2,
  interview: 1,
  reviewed: 2,
});
```

- [ ] **Step 2: 实现纯摘要并接入档案页**

```ts
export function summarizeTrainingRecords(records: TrainingRecord[]) {
  return {
    total: records.length,
    practice: records.filter((record) => record.kind === 'practice').length,
    interview: records.filter((record) => record.kind === 'interview').length,
    reviewed: records.filter((record) => record.score !== null).length,
  };
}
```

在 `ArchiveDelivery` 的 ready/partial 列表之前渲染概览，使用“已沉淀训练”“完成复盘”“刷题 / 模拟面试”而不是不可验证的成长百分比。筛选后记录为空时继续使用现有空状态与正确入口。

- [ ] **Step 3: 以主题变量重写档案样式**

```css
.training-archive {
  --archive-accent: var(--primary);
  --archive-surface: var(--surface);
  --archive-outline: var(--outline);
}

.training-archive-record-mark[data-kind='interview'] {
  background: var(--success-soft);
  color: var(--success);
}
```

将硬编码蓝、白、橙和文字色替换为主题变量或语义变量；为概览卡、记录卡、空状态和部分可用状态统一焦点、悬停与夜间主题对比；小屏幕保持单栏和完整状态文案。

- [ ] **Step 4: 运行档案模型和页面回归测试**

Run: `pnpm --filter @interview-agent/user-portal test -- training-records-model.test.ts reports-model.test.ts`

Expected: PASS，训练概览计算正确，档案页既有筛选和空状态不回归。

### Task 5: 跨主题视觉与应用级验证

**Files:**

- Test: `apps/user-portal/src/components/practice/player/PracticeEvidenceStrip.test.tsx`
- Test: `apps/user-portal/src/components/practice/player/PracticeCompletionPanel.test.tsx`
- Test: `apps/user-portal/src/components/reports/training-records-model.test.ts`

**Interfaces:**

- Consumes: 训练证据摘要、完成页和档案页的主题变量样式。
- Produces: 在 dawn/ocean/night 与 coral/blue/teal/amber 下不覆盖用户主题选择、不同状态仍具可读性。

- [ ] **Step 1: 审计局部样式的主题边界**

Run: `rg -n "#[0-9a-fA-F]{3,8}" apps/user-portal/src/app/styles/practice-player-refinement.css apps/user-portal/src/app/styles/practice-player-refinement-responsive.css apps/user-portal/src/app/styles/training-archive.css`

Expected: 不存在用于背景、文本、边框或强调色的硬编码十六进制值；允许透明值和现有全局 token 定义外的语义变量引用。

- [ ] **Step 2: 运行用户端定向测试**

Run: `pnpm --filter @interview-agent/user-portal test -- PracticeEvidenceStrip.test.tsx PracticeLearningNotice.test.tsx PracticeCompletionPanel.test.tsx PracticeItemReviewDialog.test.tsx practice-player-model.test.ts training-records-model.test.ts reports-model.test.ts`

Expected: 所有测试通过。

- [ ] **Step 3: 运行用户端应用检查**

Run: `pnpm --filter @interview-agent/user-portal typecheck && pnpm --filter @interview-agent/user-portal lint && pnpm --filter @interview-agent/user-portal build && git diff --check`

Expected: 所有命令 exit 0；改动只涉及用户端训练闭环及本次设计、计划文档。

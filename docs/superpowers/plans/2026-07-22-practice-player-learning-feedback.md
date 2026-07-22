# 刷题工作台与学习反馈 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 以更专注的刷题工作台呈现答题流程，并准确解释整轮 AI 复盘后才更新能力画像的机制。

**Architecture:** `PracticeLearningNotice` 是 `PracticeCoachPanel` 内部的纯展示组件，根据单题是否已有 AI 评价输出不同文案。新增独立的样式覆盖文件重排现有三栏布局，不调整练习数据和命令。

**Tech Stack:** Next.js 15、React 18、TypeScript、CSS、Vitest。

## 执行收尾（2026-07-22）

- 学习轨迹组件、专注答题样式和响应式覆盖已落地；相关用户端测试、typecheck、lint 与生产构建通过。
- 全仓 Prettier 检查仍受历史文件格式问题影响；本计划涉及的工作树文件已单独通过格式检查。

## Global Constraints

- 只有整轮 AI 复盘才会更新能力画像；页面文案不得声称单题保存或单题评价已即时写入。
- 不修改评分、持久化、推荐算法、API、合同、数据库、依赖或路由。
- 保留桌面与移动端键盘焦点、响应式布局和减少动画偏好。

---

### Task 1: Agent 学习轨迹组件

**Files:**

- Modify: `apps/user-portal/src/components/practice/player/PracticeCoachPanel.tsx`
- Create: `apps/user-portal/src/components/practice/player/PracticeLearningNotice.test.tsx`

**Interfaces:**

- Consumes: `PracticeSession['items'][number]` 的 `question.tags` 与 `evaluation`。
- Produces: `PracticeLearningNotice({ item })`，显示待评价或反馈就绪的学习影响说明。

- [ ] **Step 1: 写入失败测试**

```tsx
const markup = renderToStaticMarkup(createElement(PracticeLearningNotice, { item }));
expect(markup).toContain('完成整轮 AI 复盘后');
expect(markup).toContain('能力画像');
```

- [ ] **Step 2: 运行测试确认组件不存在**

Run: `pnpm --filter @interview-agent/user-portal test -- PracticeLearningNotice.test.tsx`
Expected: FAIL，提示 `PracticeLearningNotice` 未导出。

- [ ] **Step 3: 实现组件并接入教练面板**

```tsx
export function PracticeLearningNotice({ item }: Pick<PracticeCoachPanelProps, 'item'>) {
  const focus = item.question.tags.slice(0, 2).join('、') || '相关能力';
  const evaluated = Boolean(item.evaluation);
  const copy = evaluated
    ? `完成整轮 AI 复盘后，会把本题的 ${focus} 证据写入能力画像，并用于下一轮推荐。`
    : `保存回答并完成 AI 评价后，系统会在整轮 AI 复盘时更新你的 ${focus} 能力画像。`;

  return (
    <section className="practice-learning-notice" data-state={evaluated ? 'ready' : 'pending'}>
      <div>
        <span>Agent 学习轨迹</span>
        <strong>{evaluated ? '本题反馈已就绪' : '等待本题 AI 评价'}</strong>
      </div>
      <p>{copy}</p>
    </section>
  );
}
```

将 `<PracticeLearningNotice item={props.item} />` 置于 `PracticeCoachPanel` 的 AI 评价区之后。

- [ ] **Step 4: 运行定向测试**

Run: `pnpm --filter @interview-agent/user-portal test -- PracticeLearningNotice.test.tsx`
Expected: PASS，两个状态断言通过。

### Task 2: 专注答题工作台样式

**Files:**

- Create: `apps/user-portal/src/app/styles/practice-player-refinement.css`
- Create: `apps/user-portal/src/app/styles/practice-player-refinement-responsive.css`
- Modify: `apps/user-portal/src/app/styles/practice-player.css`
- Modify: `apps/user-portal/src/components/practice/player/PracticePlayer.tsx`
- Modify: `apps/user-portal/src/components/practice/player/PracticeQuestionNav.tsx`
- Modify: `apps/user-portal/src/components/practice/player/PracticeQuestionStage.tsx`

**Interfaces:**

- Consumes: 现有 `practice-player-*` CSS 类与页面结构。
- Produces: 横向题目轨道、双栏答题布局、右侧教练与学习轨迹卡，并在窄屏单栏显示。

- [ ] **Step 1: 增加样式导入和中文语义标签**

```css
@import './practice-player-refinement.css';
```

将 `Focused practice`、`Question set`、`Question 01` 分别替换为“专注练习”“本轮题单”“第 01 题”。

- [ ] **Step 2: 写入样式覆盖**

```css
.practice-player-layout {
  grid-template-columns: minmax(0, 1fr) minmax(320px, 360px);
  gap: 20px;
}

.practice-question-nav {
  position: static;
  grid-column: 1 / -1;
}

.practice-learning-notice[data-state='ready'] {
  border-color: rgba(22, 128, 108, 0.28);
}
```

基础覆盖文件设置页面画布、横向题号、主答题卡、教练卡和焦点规则；响应式覆盖文件设置移动端单栏与减少动画规则；不得修改旧样式文件。

- [ ] **Step 3: 格式与静态检查**

Run: `pnpm exec prettier --check apps/user-portal/src/components/practice/player/PracticeCoachPanel.tsx apps/user-portal/src/components/practice/player/PracticeLearningNotice.test.tsx apps/user-portal/src/components/practice/player/PracticePlayer.tsx apps/user-portal/src/components/practice/player/PracticeQuestionNav.tsx apps/user-portal/src/components/practice/player/PracticeQuestionStage.tsx apps/user-portal/src/app/styles/practice-player.css apps/user-portal/src/app/styles/practice-player-refinement.css apps/user-portal/src/app/styles/practice-player-refinement-responsive.css`
Expected: 所有指定文件格式正确。

### Task 3: 回归与构建验证

**Files:**

- Test: `apps/user-portal/src/components/practice/player/PracticeLearningNotice.test.tsx`
- Test: `apps/user-portal/src/components/practice/player/PracticeCompletionPanel.test.tsx`

**Interfaces:**

- Consumes: 练习中的学习轨迹，以及完成后写入能力画像的既有说明。
- Produces: 页面文案与整轮复盘持久化语义受测试保护。

- [ ] **Step 1: 运行刷题相关测试**

Run: `pnpm --filter @interview-agent/user-portal test -- PracticeLearningNotice.test.tsx PracticeCompletionPanel.test.tsx`
Expected: 两个测试文件均通过。

- [ ] **Step 2: 运行应用检查**

Run: `pnpm --filter @interview-agent/user-portal typecheck && pnpm --filter @interview-agent/user-portal lint && pnpm --filter @interview-agent/user-portal build`
Expected: 三个命令均以 exit code 0 结束。

- [ ] **Step 3: 复核变更范围**

Run: `git diff --check && git status --short`
Expected: 无空白错误，且没有评分、持久化、推荐与 API 文件变更。

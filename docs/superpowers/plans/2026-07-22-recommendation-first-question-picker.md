# 推荐计划优先的题库 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 Agent 推荐训练成为题库页的默认主路径，并将完整自主组卷保留为可展开的辅助工作区。

**Architecture:** 增加纯派生的自选区可见性模型，由推荐可用性、推荐加载状态、用户显式展开意图与已选题目共同决定页面层级。推荐横幅保留既有推荐请求和 `onStart()` 行为，只新增打开自选区的无副作用回调；筛选、列表和题单收束到独立工作区组件，避免改变 `useQuestionPicker()` 的业务职责。

**Tech Stack:** Next.js 15、React 18、TypeScript、CSS、Vitest。

## 执行收尾（2026-07-22）

- 已将 Agent 推荐升级为题库首屏主入口，自主组卷在推荐成功时默认收束，在无推荐、失败、已有选题或用户主动打开时保持可用。
- 原有筛选、跨分页选题、快速组卷、清空题单、推荐开始和自主开始练习的回调未改变。
- 推荐横幅和题单托盘的局部颜色均从主题 token 派生；颜色扫描未发现硬编码十六进制值。
- 题库定向测试（9 项断言）、用户端 typecheck、lint 与生产构建均已通过。

## Global Constraints

- 不修改推荐算法、请求、合同、题单创建、评分、持久化、路由、认证、主题存储或依赖。
- 有推荐时自选区默认收束；无推荐、推荐失败、用户显式打开或已有选题时自选区必须展开。
- 推荐加载、无推荐和失败状态必须有文字说明与“自己组一轮”入口。
- 题库局部样式必须使用既有主题与强调色变量；`question-picker-agent.css`、`question-picker-tray.css` 和新增样式中不得保留硬编码十六进制颜色。
- 保留跨分页选题、快速组卷、清空题单、开始练习和推荐开始的既有行为。
- 小于 980px 时自选工作区单栏；小于 600px 时推荐操作与自选入口均为全宽触达区；尊重减少动画偏好。

---

### Task 1: 建立自选工作区的可见性模型

**Files:**

- Modify: `apps/user-portal/src/components/questions/question-picker-model.ts`
- Modify: `apps/user-portal/src/components/questions/question-picker-model.test.ts`

**Interfaces:**

- Consumes: `{ recommendationAvailable: boolean; recommendationLoading: boolean; selectionCount: number; manuallyOpened: boolean }`。
- Produces: `shouldShowSelfPicker(input): boolean`，供题库页面在不触发任何业务操作的前提下决定自选工作区是否渲染。

- [ ] **Step 1: 写出可见性模型的失败测试**

```ts
expect(
  shouldShowSelfPicker({
    recommendationAvailable: true,
    recommendationLoading: false,
    selectionCount: 0,
    manuallyOpened: false,
  }),
).toBe(false);
expect(
  shouldShowSelfPicker({
    recommendationAvailable: false,
    recommendationLoading: false,
    selectionCount: 0,
    manuallyOpened: false,
  }),
).toBe(true);
```

- [ ] **Step 2: 运行测试确认函数不存在**

Run: `pnpm --filter @interview-agent/user-portal test -- question-picker-model.test.ts`

Expected: FAIL，提示 `shouldShowSelfPicker` 未导出。

- [ ] **Step 3: 实现无副作用的可见性判定**

```ts
export function shouldShowSelfPicker(input: {
  recommendationAvailable: boolean;
  recommendationLoading: boolean;
  selectionCount: number;
  manuallyOpened: boolean;
}) {
  return (
    input.manuallyOpened ||
    input.selectionCount > 0 ||
    (!input.recommendationLoading && !input.recommendationAvailable)
  );
}
```

覆盖“有推荐默认收束”“加载时收束”“无推荐自动展开”“已有选题展开”和“用户显式展开”。

- [ ] **Step 4: 运行模型回归测试**

Run: `pnpm --filter @interview-agent/user-portal test -- question-picker-model.test.ts`

Expected: PASS。

### Task 2: 重组为推荐主区与可展开自选工作区

**Files:**

- Modify: `apps/user-portal/src/components/questions/QuestionPickerPage.tsx`
- Create: `apps/user-portal/src/components/questions/SelfPickerWorkspace.tsx`
- Modify: `apps/user-portal/src/components/questions/QuestionRecommendationBanner.tsx`
- Create: `apps/user-portal/src/components/questions/QuestionRecommendationBanner.test.tsx`

**Interfaces:**

- Consumes: `useQuestionPicker()` 的现有返回值、`shouldShowSelfPicker()` 与 `QuestionRecommendationBanner` 的推荐开始回调。
- Produces: 推荐优先的首屏、具备 `aria-expanded` 和 `aria-controls` 的“自己组一轮”入口，以及不改行为的 `SelfPickerWorkspace`。

- [ ] **Step 1: 写出推荐横幅的失败渲染断言**

```tsx
expect(markup).toContain('今天优先练什么');
expect(markup).toContain('采用并开始训练');
expect(markup).toContain('自己组一轮');
expect(markup).toContain('本轮推荐依据');
```

在 `QuestionRecommendationBanner.test.tsx` 通过静态渲染传入 `PracticeRecommendation` fixture，确认推荐信息与自选入口同时可见。

- [ ] **Step 2: 运行测试确认新入口不存在**

Run: `pnpm --filter @interview-agent/user-portal test -- QuestionRecommendationBanner.test.tsx`

Expected: FAIL，因为横幅尚未渲染“今天优先练什么”或“自己组一轮”。

- [ ] **Step 3: 分离自选工作区并接入可见性模型**

```tsx
const [selfPickerOpened, setSelfPickerOpened] = useState(false);
const selfPickerVisible = shouldShowSelfPicker({
  recommendationAvailable: Boolean(picker.recommendation),
  recommendationLoading: picker.recommendationLoading,
  selectionCount: picker.selected.length,
  manuallyOpened: selfPickerOpened,
});

<QuestionRecommendationBanner
  {...recommendationProps}
  selfPickerExpanded={selfPickerVisible}
  onOpenSelfPicker={() => setSelfPickerOpened(true)}
/>;
{
  selfPickerVisible ? <SelfPickerWorkspace picker={picker} /> : null;
}
```

`SelfPickerWorkspace` 承接现有 `QuestionFilterPanel`、`QuestionCatalogList` 和 `SelectedQuestionTray` 的全部 props；页面中仅在渲染层使用 `selfPickerOpened`，不修改 `useQuestionPicker()`。

`QuestionRecommendationBanner` 在成功态显示“今天优先练什么”和次级按钮“自己组一轮”；加载、无推荐与失败态均显示该入口。入口使用 `aria-expanded={selfPickerExpanded}`、`aria-controls="self-picker-workspace"`，只在工作区存在时指向该 id。

- [ ] **Step 4: 运行推荐入口和题库模型测试**

Run: `pnpm --filter @interview-agent/user-portal test -- QuestionRecommendationBanner.test.tsx question-picker-model.test.ts`

Expected: PASS，推荐主操作、辅助自选入口和降级可见性均受保护。

### Task 3: 统一推荐与自选的主题自适应细节

**Files:**

- Modify: `apps/user-portal/src/app/styles/question-picker-workspace.css`
- Modify: `apps/user-portal/src/app/styles/question-picker-agent.css`
- Modify: `apps/user-portal/src/app/styles/question-picker-tray.css`
- Modify: `apps/user-portal/src/app/styles/question-picker.css`
- Create: `apps/user-portal/src/app/styles/question-picker-recommendation.css`

**Interfaces:**

- Consumes: 页面结构中的 `.question-agent-banner`、`.question-self-picker-toggle`、`#self-picker-workspace` 与现有题库、题单类名。
- Produces: 训练意图卡、辅助入口和自选工作区的主题自适应层级，不影响现有题目选择和移动端题单行动条。

- [ ] **Step 1: 增加推荐优先的层级样式**

```css
.question-agent-banner {
  border-color: color-mix(in srgb, var(--primary) 28%, var(--agent-outline));
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--agent-surface) 82%, var(--primary)),
    var(--agent-surface)
  );
}

.question-self-picker-toggle {
  border: 1px solid color-mix(in srgb, var(--primary) 34%, var(--outline));
  background: var(--surface);
  color: var(--primary-strong);
}
```

新增样式文件负责训练意图卡、推荐操作和自选工作区标题；在 `question-picker.css` 的现有导入链末尾加载，避免覆盖题卡和题单的状态样式。

- [ ] **Step 2: 去除推荐和题单的局部硬编码颜色**

将 agent 横幅中的白色、暗色和透明表面改为 `--agent-surface`、`--agent-text`、`--theme-control-text`、`--primary` 及 `color-mix()`；将题单托盘保留的蓝、白、文字和状态色改为 `--surface`、`--ink`、`--primary-*`、`--success-*`、`--warning-*` 和 `--outline`。

- [ ] **Step 3: 补齐响应式、焦点与减少动画细节**

```css
@media (max-width: 600px) {
  .question-agent-actions,
  .question-self-picker-toggle {
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .question-agent-banner::after,
  .question-agent-mark::after {
    animation: none;
  }
}
```

自选区展开后在 980px 以下恢复单栏；保留已有固定题单行动条，但它不能遮挡“自己组一轮”入口或推荐主操作。

- [ ] **Step 4: 执行主题与格式审计**

Run: `rg -n "#[0-9a-fA-F]{3,8}" apps/user-portal/src/app/styles/question-picker-agent.css apps/user-portal/src/app/styles/question-picker-tray.css apps/user-portal/src/app/styles/question-picker-recommendation.css && pnpm exec prettier --check apps/user-portal/src/components/questions/QuestionPickerPage.tsx apps/user-portal/src/components/questions/SelfPickerWorkspace.tsx apps/user-portal/src/components/questions/QuestionRecommendationBanner.tsx apps/user-portal/src/app/styles/question-picker-workspace.css apps/user-portal/src/app/styles/question-picker-agent.css apps/user-portal/src/app/styles/question-picker-tray.css apps/user-portal/src/app/styles/question-picker-recommendation.css`

Expected: 颜色扫描无匹配，所有指定文件格式正确。

### Task 4: 集成验证

**Files:**

- Test: `apps/user-portal/src/components/questions/question-picker-model.test.ts`
- Test: `apps/user-portal/src/components/questions/QuestionRecommendationBanner.test.tsx`

**Interfaces:**

- Consumes: 推荐优先渲染、自选降级可见性和主题派生样式。
- Produces: 题库页在推荐成功、无推荐、失败、已有选题和移动端布局下保留可用训练入口。

- [ ] **Step 1: 运行题库相关定向测试**

Run: `pnpm --filter @interview-agent/user-portal test -- QuestionRecommendationBanner.test.tsx question-picker-model.test.ts`

Expected: PASS。

- [ ] **Step 2: 运行用户端应用检查**

Run: `pnpm --filter @interview-agent/user-portal typecheck && pnpm --filter @interview-agent/user-portal lint && pnpm --filter @interview-agent/user-portal build && git diff --check`

Expected: 所有命令 exit 0；改动只涉及用户端题库及本次设计、计划文档。

# 练习解析页回答阅读体验 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 AI 解析页把长篇原回答改为可扫读、可展开的结构化阅读内容。

**Architecture:** `practice-answer-review-model.ts` 只负责将回答文本转换为可展示的块；`PracticeAnswerReview.tsx` 负责预览与展开状态；`PracticeCoachPanel.tsx` 只接入该组件。现有 CSS 文件增加局部类，不修改接口或 AI 评价数据。

**Tech Stack:** React、TypeScript、Vitest、CSS。

---

### Task 1: 写出会失败的回答块解析测试

**Files:**

- Create: `apps/user-portal/src/components/practice/player/practice-answer-review-model.test.ts`
- Modify: `apps/user-portal/src/components/practice/player/PracticeCoachPanel.test.tsx`

- [x] **Step 1: 断言标题、段落、引用、清单与代码被保留为独立块**

````ts
expect(
  parseAnswerBlocks('# 防护策略\n\n- 隔离工具\n\n> 先验证来源\n\n```ts\nallowlist()\n```'),
).toEqual([
  { kind: 'heading', level: 1, text: '防护策略' },
  { kind: 'list', ordered: false, items: ['隔离工具'] },
  { kind: 'quote', text: '先验证来源' },
  { kind: 'code', language: 'ts', text: 'allowlist()' },
]);
````

- [x] **Step 2: 运行失败测试**

Run: `pnpm --dir apps/user-portal exec vitest run src/components/practice/player/practice-answer-review-model.test.ts src/components/practice/player/PracticeCoachPanel.test.tsx`

Expected: FAIL，因为 `parseAnswerBlocks` 和结构化回答组件尚不存在。

### Task 2: 实现纯回答解析模型

**Files:**

- Create: `apps/user-portal/src/components/practice/player/practice-answer-review-model.ts`

- [x] **Step 1: 定义 `AnswerBlock` 联合类型与 `parseAnswerBlocks`**

```ts
export type AnswerBlock =
  | { kind: 'heading'; level: number; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'quote'; text: string }
  | { kind: 'list'; ordered: boolean; items: string[] }
  | { kind: 'code'; language: string | null; text: string };
```

解析器按空行分隔普通段落，识别 `# `、`> `、`- `、`* `、`1. ` 和三反引号围栏；空文本返回空数组。

- [x] **Step 2: 运行解析测试确认变绿**

Run: `pnpm --dir apps/user-portal exec vitest run src/components/practice/player/practice-answer-review-model.test.ts`

Expected: PASS。

### Task 3: 渲染可展开回答阅读台

**Files:**

- Create: `apps/user-portal/src/components/practice/player/PracticeAnswerReview.tsx`
- Modify: `apps/user-portal/src/components/practice/player/PracticeCoachPanel.tsx`
- Modify: `apps/user-portal/src/components/practice/player/PracticeCoachPanel.test.tsx`

- [x] **Step 1: 用前四个块作为默认预览，并为更多内容提供展开按钮**

```tsx
const visibleBlocks = expanded ? blocks : blocks.slice(0, 4);
{
  blocks.length > 4 ? (
    <button type="button" onClick={() => setExpanded((value) => !value)}>
      {expanded ? '收起回答' : `展开剩余 ${blocks.length - 4} 段`}
    </button>
  ) : null;
}
```

- [x] **Step 2: 将原先的 `<p>{draft}</p>` 替换为 `PracticeAnswerReview`**

组件接收 `answer`、`tags` 和 `answerCurrent`，继续显示保存状态、字数、题目标签；原有“返回修改回答”、解析与 AI 评分不改变。

- [x] **Step 3: 运行教练页渲染测试**

Run: `pnpm --dir apps/user-portal exec vitest run src/components/practice/player/PracticeCoachPanel.test.tsx`

Expected: PASS，并包含“结构化阅读”和“展开剩余”。

### Task 4: 增加隔离的阅读样式与最终验证

**Files:**

- Modify: `apps/user-portal/src/app/styles/practice-player-feedback-step.css`

- [x] **Step 1: 添加回答轨道、阅读块、引用、代码和移动端样式**

```css
.practice-answer-review-block[data-kind='heading'] {
  border-inline-start: 3px solid var(--primary);
}
.practice-answer-review-block[data-kind='code'] {
  background: var(--ink);
  color: white;
}
@media (max-width: 760px) {
  .practice-answer-review-toggle {
    width: 100%;
  }
}
```

- [x] **Step 2: 运行定向验证**

Run: `pnpm --dir apps/user-portal exec vitest run src/components/practice/player/practice-answer-review-model.test.ts src/components/practice/player/PracticeCoachPanel.test.tsx && pnpm --dir apps/user-portal exec tsc -p tsconfig.json --noEmit && pnpm --filter @interview-agent/user-portal build && git diff --check -- apps/user-portal/src/components/practice/player apps/user-portal/src/app/styles/practice-player-feedback-step.css`

Expected: 全部命令退出码为 `0`。

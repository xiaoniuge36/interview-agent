# 刷题操作优先级 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将保存与继续答题合并为同一操作区，并突出保存后进入下一题这一高频流程。

**Architecture:** `PracticeQuestionStage` 继续消费既有 `onSave`、`onSaveAndNext`、`onNext` 回调，只重组展示与禁用规则。局部 CSS 为新的操作区定义次级与主级按钮层级，并在移动端将操作区改为可读的纵向状态加横向按钮布局。

**Tech Stack:** Next.js 15、React 18、TypeScript、CSS、Vitest。

## Global Constraints

- 不修改 API、合同、保存实现、题目切换逻辑、路由、依赖或主题 token。
- 主操作使用已有 `--primary` 与相关语义变量，不写死主题色。
- 最后一题不渲染下一题按钮；所有按钮保留原有 busy 和空回答保护。
- 本次只允许修改 `PracticeQuestionStage`、其测试、题目舞台样式和响应式细节。

---

### Task 1: 为合并操作区建立组件回归测试

**Files:**

- Create: `apps/user-portal/src/components/practice/player/PracticeQuestionStage.test.tsx`
- Modify: `apps/user-portal/src/components/practice/player/PracticeQuestionStage.tsx`

**Interfaces:**

- Consumes: `PracticeQuestionStage` 的现有 props：`item`、`draft`、`busy`、`currentIndex`、`total`、四个回调。
- Produces: 可验证的连续答题动作：`仅保存`、`保存并进入下一题 →`、已保存后的 `进入下一题 →`，以及最后一题不显示下一题按钮。

- [ ] **Step 1: 写入失败的静态渲染测试**

```tsx
expect(unsavedMarkup).toContain('保存并进入下一题 →');
expect(savedMarkup).toContain('进入下一题 →');
expect(lastQuestionMarkup).not.toContain('进入下一题 →');
```

- [ ] **Step 2: 运行测试确认新行为尚不存在**

Run: `pnpm --filter @interview-agent/user-portal test -- PracticeQuestionStage.test.tsx`

Expected: FAIL，缺少合并后的主操作或最后一题断言不满足。

- [ ] **Step 3: 将保存操作与继续操作重组到编辑器下方**

```tsx
<div className="practice-answer-actions">
  <span aria-live="polite">{saveLabel(item.answer, hasUnsavedChanges)}</span>
  <div>
    <button type="button" onClick={onSave}>
      仅保存
    </button>
    {hasNext ? (
      <button type="button" onClick={nextAction}>
        保存并进入下一题 →
      </button>
    ) : null}
  </div>
</div>
```

让有未保存内容时的主按钮调用 `onSaveAndNext`，否则调用 `onNext`；删除页脚的下一题按钮，保留上一题和题号。

- [ ] **Step 4: 运行定向组件测试**

Run: `pnpm --filter @interview-agent/user-portal test -- PracticeQuestionStage.test.tsx`

Expected: PASS，覆盖未保存、已保存和最后一题三种状态。

### Task 2: 建立主次动作层级与移动端布局

**Files:**

- Modify: `apps/user-portal/src/app/styles/practice-player-stage.css`
- Modify: `apps/user-portal/src/app/styles/practice-player-refinement.css`
- Modify: `apps/user-portal/src/app/styles/practice-player-refinement-responsive.css`

**Interfaces:**

- Consumes: Task 1 输出的 `practice-answer-actions`、`practice-save-button` 和 `practice-save-next-button` CSS 类。
- Produces: 宽屏同一操作行、移动端完整点击区、主题自适应的主次按钮与焦点状态。

- [ ] **Step 1: 写入操作区视觉约束**

```css
.practice-answer-actions {
  display: flex;
  justify-content: space-between;
  gap: 16px;
}
.practice-save-next-button {
  background: var(--primary);
  color: var(--surface);
}
.practice-save-button {
  border: 1px solid var(--outline-strong);
  background: var(--surface);
}
```

使用 `color-mix()` 从主题变量派生悬停、描边和阴影；不更改已有全局主题变量。

- [ ] **Step 2: 写入窄屏适配**

```css
@media (max-width: 760px) {
  .practice-answer-actions {
    align-items: stretch;
    flex-direction: column;
  }
  .practice-answer-actions > div {
    display: grid;
    grid-template-columns: 1fr 1.45fr;
  }
}
```

- [ ] **Step 3: 运行格式与应用级静态检查**

Run: `pnpm --filter @interview-agent/user-portal lint && pnpm --filter @interview-agent/user-portal typecheck`

Expected: 两条命令均 exit 0。

### Task 3: 完成应用验证

**Files:**

- Test: `apps/user-portal/src/components/practice/player/PracticeQuestionStage.test.tsx`

- [ ] **Step 1: 运行题目作答相关测试**

Run: `pnpm --filter @interview-agent/user-portal test -- PracticeQuestionStage.test.tsx practice-player-model.test.ts PracticeLearningNotice.test.tsx`

Expected: PASS，既有导航确认与学习提示没有回归。

- [ ] **Step 2: 运行用户端生产构建与差异检查**

Run: `pnpm --filter @interview-agent/user-portal build && git diff --check`

Expected: 两条命令均 exit 0，且无空白错误。

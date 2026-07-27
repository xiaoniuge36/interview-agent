# Practice Completion Next Action Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 根据本轮 AI 评价结果，在刷题完成页提供唯一且可执行的下一轮主动作。

**Architecture:** 把弱项复练创建与状态机下沉到用户端共享 helper；`usePracticePlayer` 复用 helper 暴露动作；完成页只根据报告选择“复练薄弱项”或“最新推荐”。

**Tech Stack:** Next.js 15、React 18、TypeScript 5、Vitest

## Global Constraints

- 不修改共享契约、Prisma schema、迁移、根配置、依赖或 CI。
- 低于 60 分才视为本轮可复练弱项；服务端继续承担最终选题和权限判断。
- 完成页只显示一个主动作；成功导航前保持禁用，失败后恢复。
- 函数不超过 50 行、文件不超过 300 行、嵌套不超过 3 层、位置参数不超过 3 个、圈复杂度不超过 10、禁止未命名魔法数字。
- 本会话不执行 commit、push 或 PR。

---

### Task 1: 共享弱项复练工作流

**Files:**

- Create: `apps/user-portal/src/lib/weakness-review.ts`
- Create: `apps/user-portal/src/lib/weakness-review.test.ts`
- Modify: `apps/user-portal/src/components/reports/WeaknessReviewAction.tsx`
- Modify: `apps/user-portal/src/components/reports/WeaknessReviewAction.test.tsx`

**Interfaces:**

- Produces: `createWeaknessReviewSession`、`startWeaknessReview`、`hasReviewableWeakness`。

- [x] **Step 1: 写失败测试，锁定阈值与共享接口**

```ts
expect(hasReviewableWeakness(reportWithScores(59))).toBe(true);
expect(hasReviewableWeakness(reportWithScores(60))).toBe(false);
await expect(createWeaknessReviewSession(createSession)).resolves.toBe('session-1');
```

- [x] **Step 2: 运行测试确认 RED**

Run: `pnpm --filter @interview-agent/user-portal exec vitest run src/lib/weakness-review.test.ts`  
Expected: FAIL，模块不存在。

- [x] **Step 3: 移动并实现共享 helper**

```ts
const REVIEWABLE_WEAK_SCORE = 60;

export function hasReviewableWeakness(report: PracticeReport | null) {
  return Boolean(report?.itemEvaluations.some((item) => item.score < REVIEWABLE_WEAK_SCORE));
}
```

将现有创建函数和 `startWeaknessReview` 从报告组件移动到同一文件；报告组件改为 import，行为不变。

- [x] **Step 4: 运行 helper 与报告动作测试确认 GREEN**

Run: `pnpm --filter @interview-agent/user-portal exec vitest run src/lib/weakness-review.test.ts src/components/reports/WeaknessReviewAction.test.tsx`  
Expected: PASS。

### Task 2: 完成页动态主动作

**Files:**

- Modify: `apps/user-portal/src/components/practice/player/usePracticePlayer.ts`
- Modify: `apps/user-portal/src/components/practice/player/PracticeCompletedReview.tsx`
- Modify: `apps/user-portal/src/components/practice/player/PracticeCompletionPanel.tsx`
- Modify: `apps/user-portal/src/components/practice/player/PracticeCompletionPanel.test.tsx`

**Interfaces:**

- Consumes: `startWeaknessReview`、`hasReviewableWeakness`。
- Produces: `startWeaknessReview()`、`startingWeaknessReview` player actions。

- [x] **Step 1: 写失败测试，锁定唯一主动作**

```tsx
expect(renderCompletion(reportWithScores(59))).toContain('复练薄弱项');
expect(renderCompletion(reportWithScores(59))).not.toContain('按最新推荐开始下一轮');
expect(renderCompletion(reportWithScores(60))).toContain('按最新推荐开始下一轮');
```

- [x] **Step 2: 运行完成页测试确认 RED**

Run: `pnpm --filter @interview-agent/user-portal exec vitest run src/components/practice/player/PracticeCompletionPanel.test.tsx`  
Expected: FAIL，低分报告仍显示最新推荐。

- [x] **Step 3: 接入 player 动作并动态选择按钮**

`usePracticePlayer` 使用共享工作流创建复练会话；`PracticeCompletedReview` 传递两个新增 props；`PracticeCompletionPanel` 只渲染一个 `NextPracticeButton`。

- [x] **Step 4: 运行相关测试确认 GREEN**

Run: `pnpm --filter @interview-agent/user-portal exec vitest run src/lib/weakness-review.test.ts src/components/reports/WeaknessReviewAction.test.tsx src/components/practice/player/PracticeCompletionPanel.test.tsx`  
Expected: PASS。

### Task 3: 用户端完整门禁

- [x] **Step 1: Prettier 与 diff 检查**
- [x] **Step 2: ESLint 与完整 Vitest**
- [x] **Step 3: TypeScript 与 Next.js 生产构建**
- [x] **Step 4: 最终 diff 审查并记录证据**

## Verification Notes

- TDD：共享 helper 测试先因模块缺失失败；完成页测试先因低分报告仍显示最新推荐失败；实现后均转绿。
- User Portal ESLint 通过。
- User Portal 完整 Vitest：54 个测试文件、146 项测试通过。
- User Portal TypeScript 通过。
- Next.js 生产构建通过，14 个静态页面生成完成。
- Prettier 与全工作树 `git diff --check` 通过。
- 最终审查确认：阈值一致、主动作互斥、共享 helper 无 UI 反向依赖、成功导航前保持锁定；相关文件均低于 300 行。

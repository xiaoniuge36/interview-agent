# Practice Report Reconciliation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 报告生成成功后不再因 session/mastery 刷新失败误报整个操作失败，并始终进入可用完成态。

**Architecture:** `practice-report-reconciliation.ts` 封装主命令与后续读取的成功边界；播放器 hook 只根据标准化结果更新 state 和通知。

**Tech Stack:** TypeScript 5、React 18、Vitest、现有 Practice API

## Global Constraints

- `submitPracticeSession` 失败才属于“复盘生成失败”。
- 主命令成功后使用 `Promise.allSettled` 对账；不得因读取失败丢弃报告。
- session 读取失败回退为当前 session + `report_ready`；mastery 读取失败保留当前值。
- 主命令成功后清除本地草稿状态；失败路径不清除。
- 不修改 Product API、共享契约、Prisma schema、迁移、根配置、依赖或 CI。
- 函数不超过 50 行、文件不超过 300 行、嵌套不超过 3 层、位置参数不超过 3 个、圈复杂度不超过 10。
- 本会话不执行 commit、push 或 PR。

---

### Task 1: 对账 helper

**Files:**

- Create: `apps/user-portal/src/components/practice/player/practice-report-reconciliation.ts`
- Create: `apps/user-portal/src/components/practice/player/practice-report-reconciliation.test.ts`

**Interfaces:**

- Produces: `reconcilePracticeReport(input): Promise<PracticeReportReconciliation>`。

- [x] **Step 1: 写失败测试**

覆盖主命令失败、完全成功、session 失败、mastery 失败、两者失败。

- [x] **Step 2: 运行测试确认 RED**

Run: `pnpm --filter @interview-agent/user-portal exec vitest run src/components/practice/player/practice-report-reconciliation.test.ts`  
Expected: FAIL，模块不存在。

- [x] **Step 3: 实现 helper**

```ts
export async function reconcilePracticeReport(input: {
  currentSession: PracticeSession;
  submitReport: () => Promise<PracticeReport>;
  loadSession: () => Promise<PracticeSession>;
  loadMastery: () => Promise<MasteryProfile[]>;
}): Promise<PracticeReportReconciliation>;
```

先 await `submitReport`，再对两个 loader 使用 `Promise.allSettled`。不得在 helper 内吞掉主命令错误。

- [x] **Step 4: 运行 helper 测试确认 GREEN**

Run: `pnpm --filter @interview-agent/user-portal exec vitest run src/components/practice/player/practice-report-reconciliation.test.ts`  
Expected: PASS。

### Task 2: 播放器接入

**Files:**

- Modify: `apps/user-portal/src/components/practice/player/usePracticePlayer.ts`

**Interfaces:**

- Consumes: `reconcilePracticeReport`。

- [x] **Step 1: 替换严格 `Promise.all`**

用当前 session 和现有 API 函数构造 helper input；helper resolve 后清除本地状态并更新 report/session/mastery。

- [x] **Step 2: 区分完整与部分同步文案**

完整同步使用 success 通知；部分同步使用 info 通知和“部分训练状态将在刷新后继续同步”页面 message。catch 只处理主命令 reject。

- [x] **Step 3: 运行定向测试**

Run: `pnpm --filter @interview-agent/user-portal exec vitest run src/components/practice/player/practice-report-reconciliation.test.ts src/components/practice/player/PracticeCompletionPanel.test.tsx src/components/practice/player/practice-player-model.test.ts`  
Expected: PASS。

### Task 3: User Portal 完整门禁

- [x] **Step 1: Prettier 与 `git diff --check`**
- [x] **Step 2: ESLint 与完整 Vitest**
- [x] **Step 3: TypeScript 与 Next.js 生产构建**
- [x] **Step 4: 最终 diff 审查并记录证据**

## Verification Evidence

- RED：对账测试因模块不存在失败；反馈测试因缺少 `practiceReportOutcome` 失败。
- 定向 GREEN：3 个测试文件、25 项测试通过。
- 完整 Vitest：59 个测试文件、176 项测试通过。
- ESLint、TypeScript、Next.js 生产构建通过；构建生成 14 个静态页面。
- 主命令失败仍走现有 error；任一对账读取失败均保留报告、回退完成态并使用 info 反馈。
- Prettier 与 `git diff --check` 已执行；相关生产文件均少于 300 行。

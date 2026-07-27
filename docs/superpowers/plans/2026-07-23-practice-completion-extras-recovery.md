# Practice Completion Extras Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 恢复已完成刷题时独立保留可用的报告和能力记录。

**Architecture:** 在现有 practice report reconciliation model 中增加 completion extras loader，播放器只消费标准化的 partial 结果。

**Tech Stack:** TypeScript 5、Vitest、现有 Practice API

## Global Constraints

- 非 `report_ready` 不读取 report/mastery。
- `report_ready` 使用 `Promise.allSettled`，任一成功不得因另一项失败被丢弃。
- 失败回退分别为 `report: null` 和 `mastery: []`。
- 不修改 API、共享契约、根配置、依赖或 CI。
- 函数不超过 50 行、文件不超过 300 行、嵌套不超过 3 层、位置参数不超过 3 个、圈复杂度不超过 10。
- 本会话不执行 commit、push 或 PR。

---

### Task 1: Completion extras model

**Files:**

- Modify: `apps/user-portal/src/components/practice/player/practice-report-reconciliation.ts`
- Modify: `apps/user-portal/src/components/practice/player/practice-report-reconciliation.test.ts`

- [x] **Step 1: 写失败测试**

覆盖非完成态、两种单项失败、完整成功、全部失败。

- [x] **Step 2: 运行测试确认 RED**

Run: `pnpm --filter @interview-agent/user-portal exec vitest run src/components/practice/player/practice-report-reconciliation.test.ts`  
Expected: FAIL，`loadPracticeCompletionExtras` 不存在。

- [x] **Step 3: 实现 allSettled loader**

函数签名与设计文档一致；不得 catch 后统一清空两项。

- [x] **Step 4: 运行测试确认 GREEN**

Run: 同 Step 2。  
Expected: PASS。

### Task 2: Player 接入

**Files:**

- Modify: `apps/user-portal/src/components/practice/player/usePracticePlayer.ts`

- [x] **Step 1: 替换本地 `loadCompletionExtras`**

传入 session、`getPracticeReport` 和 `getMasteryProfiles`；删除严格 Promise.all helper。

- [x] **Step 2: 运行定向测试**

Run: `pnpm --filter @interview-agent/user-portal exec vitest run src/components/practice/player/practice-report-reconciliation.test.ts src/components/practice/player/PracticeCompletionPanel.test.tsx`  
Expected: PASS。

### Task 3: User Portal 完整门禁

- [x] **Step 1: Prettier 与 `git diff --check`**
- [x] **Step 2: ESLint 与完整 Vitest**
- [x] **Step 3: TypeScript 与 Next.js 生产构建**
- [x] **Step 4: 最终 diff 审查并记录证据**

## Verification Evidence

- RED：5 个 completion extras 测试因缺少 `loadPracticeCompletionExtras` 失败。
- 定向 GREEN：2 个测试文件、16 项测试通过。
- 完整 Vitest：61 个测试文件、193 项测试通过。
- ESLint、TypeScript、Next.js 生产构建通过；构建生成 14 个静态页面。
- 非完成态不读取；report/mastery 任一成功均独立保留；双失败返回安全空值。
- Prettier 与 `git diff --check` 已执行；相关生产文件均少于 300 行。

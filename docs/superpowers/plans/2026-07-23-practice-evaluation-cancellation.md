# Practice Evaluation Cancellation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent an aborted or superseded item evaluation from mutating a newer evaluation's state or notifications.

**Architecture:** A pure controller-identity/signal predicate gates both success and error settlement in the existing evaluation hook.

**Tech Stack:** React 18, TypeScript 5, Vitest, AbortController, existing Practice Evaluation stream

## Global Constraints

- Evaluation settlement requires the candidate controller to be the active reference and not aborted.
- Stale/aborted success and failure must be silent.
- Current success/error behavior and controller cleanup remain unchanged.
- Do not change APIs, shared contracts, dependencies, root configuration, database, or CI.
- Do not commit, push, or create a PR in this session.

---

### Task 1: Evaluation settlement predicate

**Files:**

- Create: `apps/user-portal/src/components/practice/player/practice-evaluation-lifecycle.ts`
- Create: `apps/user-portal/src/components/practice/player/practice-evaluation-lifecycle.test.ts`

**Interface:**

```ts
export function isCurrentPracticeEvaluation(
  active: AbortController | null,
  candidate: AbortController,
): boolean;
```

- [x] **Step 1: Write live, aborted, superseded, and null-active tests**
- [x] **Step 2: Run focused test and confirm RED because the module is absent**
- [x] **Step 3: Implement identity plus signal guard**
- [x] **Step 4: Re-run and confirm predicate tests GREEN**

### Task 2: Evaluation hook integration

**Files:**

- Modify: `apps/user-portal/src/components/practice/player/practice-player-actions.ts`

- [x] **Step 1: Guard success settlement immediately after the stream resolves**
- [x] **Step 2: Guard catch before `setActionError`**
- [x] **Step 3: Preserve existing identity-based `finally` cleanup**

### Task 3: Verification gate

- [x] **Step 1: Run Prettier and focused practice tests**
- [x] **Step 2: Run ESLint and TypeScript**
- [x] **Step 3: Run full User Portal Vitest and production build**
- [x] **Step 4: Run `git diff --check`, review the final diff, and record evidence**

## Verification Evidence

- TDD RED：首次运行因 `practice-evaluation-lifecycle` 模块不存在而失败，退出码 1。
- Predicate GREEN：1 个测试文件、4 项测试通过。
- 定向回归：8 个测试文件、45 项测试通过。
- ESLint 与 TypeScript：退出码均为 0。
- 完整 Vitest：72 个测试文件、233 项测试通过。
- Next.js 生产构建：退出码 0，14 个静态页面生成。
- Prettier 已执行；`git diff --check` 退出码 0；最终 diff 已复核。

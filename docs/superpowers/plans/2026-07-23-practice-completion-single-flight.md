# Practice Completion Single-flight Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent duplicate or conflicting practice completion commands before busy state renders.

**Architecture:** One exclusive runner is owned by the completion-action composite and shared by AI-report and self-study hooks.

**Tech Stack:** React 18, TypeScript 5, Vitest, existing Practice completion APIs

## Global Constraints

- At most one AI report or self-study completion may execute at a time.
- Ignored actions must not mutate busy/error/result state or call APIs.
- Fulfillment and rejection must release the lock.
- Existing reconciliation, cleanup, notifications, and messages remain unchanged.
- Do not change APIs, shared contracts, dependencies, root configuration, database, or CI.
- Do not commit, push, or create a PR in this session.

---

### Task 1: Completion exclusive runner

**Files:**

- Create: `apps/user-portal/src/components/practice/player/practice-completion-single-flight.ts`
- Create: `apps/user-portal/src/components/practice/player/practice-completion-single-flight.test.ts`

**Interface:**

```ts
export function createExclusivePracticeCompletionRunner(): (
  action: () => Promise<void>,
) => Promise<boolean>;
```

- [x] **Step 1: Write duplicate, cross-action, success retry, and rejection retry tests**
- [x] **Step 2: Run focused test and confirm RED because the module is absent**
- [x] **Step 3: Implement synchronous lock with `finally` release**
- [x] **Step 4: Re-run and confirm runner tests GREEN**

### Task 2: Completion hook integration

**Files:**

- Modify: `apps/user-portal/src/components/practice/player/usePracticePlayer.ts`

- [x] **Step 1: Create one stable runner in `usePracticeCompletionActions`**
- [x] **Step 2: Wrap AI report submission including validation and all effects**
- [x] **Step 3: Wrap self-study completion including validation and all effects**
- [x] **Step 4: Preserve next-recommendation and weakness-review behavior**

### Task 3: Verification gate

- [x] **Step 1: Run Prettier and focused practice tests**
- [x] **Step 2: Run ESLint and TypeScript**
- [x] **Step 3: Run full User Portal Vitest and production build**
- [x] **Step 4: Run `git diff --check`, review the final diff, and record evidence**

## Verification Evidence

- TDD RED：首次运行因 `practice-completion-single-flight` 模块不存在而失败，退出码 1。
- Runner GREEN：1 个测试文件、2 项测试通过。
- 定向回归：6 个测试文件、38 项测试通过。
- ESLint 与 TypeScript：退出码均为 0。
- 完整 Vitest：74 个测试文件、239 项测试通过。
- Next.js 生产构建：退出码 0，14 个静态页面生成。
- Prettier 已执行；`git diff --check` 退出码 0；最终相关实现已复核。

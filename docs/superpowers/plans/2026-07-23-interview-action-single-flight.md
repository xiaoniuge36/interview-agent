# Interview Action Single-flight Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent duplicate or overlapping interview start/answer commands before React busy state renders.

**Architecture:** One pure exclusive runner is owned by `useInterviewActions` and wraps both mutation commands. Existing command functions remain the sole owners of business effects.

**Tech Stack:** React 18, TypeScript 5, Vitest, existing Interview APIs and stream client

## Global Constraints

- At most one start or answer command may execute at a time per mounted controller.
- An ignored command must not dispatch, call APIs, connect streams, or notify.
- Fulfillment and rejection must both release the lock.
- Existing command validation, notifications, and stream behavior remain unchanged.
- Do not change APIs, shared contracts, dependencies, root configuration, database, or CI.
- Do not commit, push, or create a PR in this session.

---

### Task 1: Exclusive interview action runner

**Files:**

- Create: `apps/user-portal/src/hooks/interview-action-single-flight.ts`
- Create: `apps/user-portal/src/hooks/interview-action-single-flight.test.ts`

**Interface:**

```ts
export function createExclusiveInterviewActionRunner(): (
  action: () => Promise<void>,
) => Promise<boolean>;
```

- [x] **Step 1: Write concurrency, cross-action, success retry, and rejection retry tests**
- [x] **Step 2: Run focused test and confirm RED because the module is absent**
- [x] **Step 3: Implement synchronous lock with `finally` release**
- [x] **Step 4: Re-run and confirm runner tests GREEN**

### Task 2: Hook integration

**Files:**

- Modify: `apps/user-portal/src/hooks/useInterviewActions.ts`

- [x] **Step 1: Create one stable runner per hook**
- [x] **Step 2: Wrap `executeStart` in the runner**
- [x] **Step 3: Wrap `executeAnswer` in the same runner**
- [x] **Step 4: Preserve command context dependencies and return compatibility**

### Task 3: Verification gate

- [x] **Step 1: Run Prettier and focused interview tests**
- [x] **Step 2: Run ESLint and TypeScript**
- [x] **Step 3: Run full User Portal Vitest and production build**
- [x] **Step 4: Run `git diff --check`, review the final diff, and record evidence**

## Verification Evidence

- TDD RED：首次运行因 `interview-action-single-flight` 模块不存在而失败，退出码 1。
- Runner GREEN：1 个测试文件、2 项测试通过。
- 定向回归：7 个测试文件、17 项测试通过。
- ESLint 与 TypeScript：退出码均为 0。
- 完整 Vitest：71 个测试文件、229 项测试通过。
- Next.js 生产构建：退出码 0，14 个静态页面生成。
- Prettier 已执行；`git diff --check` 退出码 0；最终相关文件已复核。

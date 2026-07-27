# Question Practice Start Single-flight Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent duplicate practice sessions and busy-state races from rapid question-picker start actions.

**Architecture:** A pure exclusive runner acquires a synchronous per-mount lock. The practice starter executes its entire state/API transition inside that runner.

**Tech Stack:** React 18, TypeScript 5, Vitest, existing Practice API

## Global Constraints

- At most one practice start action may execute at a time per mounted picker.
- Ignored concurrent actions must not mutate error or busy state.
- Fulfillment and rejection both release the lock.
- Existing success/error notifications and `/practice?session=<id>` navigation remain unchanged.
- Do not change APIs, shared contracts, dependencies, root configuration, database, or CI.
- Do not commit, push, or create a PR in this session.

---

### Task 1: Exclusive practice start runner

**Files:**

- Create: `apps/user-portal/src/components/questions/practice-start-single-flight.ts`
- Create: `apps/user-portal/src/components/questions/practice-start-single-flight.test.ts`

**Interface:**

```ts
export function createExclusivePracticeStartRunner(): (
  action: () => Promise<void>,
) => Promise<boolean>;
```

- [x] **Step 1: Write concurrency, post-success retry, and post-rejection retry tests**
- [x] **Step 2: Run focused test and confirm RED because the module is absent**
- [x] **Step 3: Implement synchronous lock with `finally` release**
- [x] **Step 4: Re-run and confirm runner tests GREEN**

### Task 2: Practice starter integration

**Files:**

- Modify: `apps/user-portal/src/components/questions/useQuestionPicker.ts`

- [x] **Step 1: Create one stable exclusive runner per starter hook**
- [x] **Step 2: Move all busy/error/API/notification/navigation work inside its action**
- [x] **Step 3: Return the runner Promise while preserving caller compatibility**
- [x] **Step 4: Verify ignored calls cannot execute `finally`**

### Task 3: Verification gate

- [x] **Step 1: Run Prettier and focused question tests**
- [x] **Step 2: Run ESLint and TypeScript**
- [x] **Step 3: Run full User Portal Vitest and production build**
- [x] **Step 4: Run `git diff --check`, review the final diff, and record evidence**

## Verification Evidence

- TDD RED：首次运行因 `practice-start-single-flight` 模块不存在而失败，退出码 1。
- Runner GREEN：1 个测试文件、2 项测试通过。
- 定向回归：4 个测试文件、15 项测试通过。
- ESLint 与 TypeScript：退出码均为 0。
- 完整 Vitest：70 个测试文件、227 项测试通过。
- Next.js 生产构建：退出码 0，14 个静态页面生成。
- Prettier 已执行；`git diff --check` 退出码 0；最终 diff 已复核。

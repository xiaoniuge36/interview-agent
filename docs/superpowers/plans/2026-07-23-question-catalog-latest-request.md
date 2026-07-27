# Question Catalog Latest Request Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure rapid question filter or page changes always display the newest catalog request result.

**Architecture:** A pure sequence runner gates catalog success, error, and settlement callbacks. The catalog hook owns one stable instance and invalidates effect-owned work during cleanup.

**Tech Stack:** React 18, TypeScript 5, Vitest, existing Question Catalog API

## Global Constraints

- Only the latest request may update catalog, error, or loading state.
- Effect cleanup must invalidate its outstanding request.
- Manual retry must supersede older in-flight work.
- Do not change APIs, shared contracts, dependencies, root configuration, database, or CI.
- Do not commit, push, or create a PR in this session.

---

### Task 1: Latest question request runner

**Files:**

- Create: `apps/user-portal/src/components/questions/latest-question-request.ts`
- Create: `apps/user-portal/src/components/questions/latest-question-request.test.ts`

**Interface:**

```ts
export function createLatestQuestionRequestRunner(): {
  run: <T>(handlers: LatestQuestionRequestHandlers<T>) => Promise<boolean>;
  invalidate: () => void;
};
```

- [x] **Step 1: Write reverse-order, stale-error, latest-error, and invalidation tests**
- [x] **Step 2: Run focused test and confirm RED because the module is absent**
- [x] **Step 3: Implement one monotonic sequence and guarded settlement**
- [x] **Step 4: Re-run and confirm runner tests GREEN**

### Task 2: Catalog hook integration

**Files:**

- Modify: `apps/user-portal/src/components/questions/useQuestionPicker.ts`

- [x] **Step 1: Create one stable runner per catalog hook**
- [x] **Step 2: Route load success/error/finally through runner callbacks**
- [x] **Step 3: Invalidate the effect-owned request in cleanup**
- [x] **Step 4: Keep manual retry wired to the same `load` callback**

### Task 3: Verification gate

- [x] **Step 1: Run Prettier and focused question tests**
- [x] **Step 2: Run ESLint and TypeScript**
- [x] **Step 3: Run full User Portal Vitest and production build**
- [x] **Step 4: Run `git diff --check`, review the final diff, and record evidence**

## Verification Evidence

- TDD RED：首次运行因 `latest-question-request` 模块不存在而失败，退出码 1。
- Runner GREEN：1 个测试文件、4 项测试通过。
- 定向回归：3 个测试文件、13 项测试通过。
- ESLint 与 TypeScript：退出码均为 0。
- 完整 Vitest：69 个测试文件、225 项测试通过。
- Next.js 生产构建：退出码 0，14 个静态页面生成。
- Prettier 已执行；`git diff --check` 退出码 0；最终 diff 已复核。

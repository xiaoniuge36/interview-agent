# Practice Session Latest Request Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure practice recovery always reflects the latest session id or retry and ignores stale settlements.

**Architecture:** A pure sequence runner gates restored-state success/error callbacks. The loader builds one complete next state before publishing it.

**Tech Stack:** React 18, TypeScript 5, Vitest, existing Practice APIs and local recovery

## Global Constraints

- Only the latest restore request may update player state or load error.
- Missing session id and effect cleanup must invalidate outstanding work.
- Successful restore publishes one complete `PlayerState`.
- Existing completed-session local cleanup and recovery copy remain unchanged.
- Do not change APIs, shared contracts, dependencies, root configuration, database, or CI.
- Do not commit, push, or create a PR in this session.

---

### Task 1: Latest practice session request

**Files:**

- Create: `apps/user-portal/src/components/practice/player/practice-session-request.ts`
- Create: `apps/user-portal/src/components/practice/player/practice-session-request.test.ts`

**Interface:**

```ts
export function createLatestPracticeSessionRequest(): {
  run: <T>(handlers: PracticeSessionRequestHandlers<T>) => Promise<boolean>;
  invalidate: () => void;
};
```

- [x] **Step 1: Write reverse-order, stale-error, latest-error, and invalidation tests**
- [x] **Step 2: Run focused test and confirm RED because the module is absent**
- [x] **Step 3: Implement monotonic guarded settlement**
- [x] **Step 4: Re-run and confirm request tests GREEN**

### Task 2: Session loader integration

**Files:**

- Modify: `apps/user-portal/src/components/practice/player/usePracticePlayer.ts`

- [x] **Step 1: Create one stable request coordinator**
- [x] **Step 2: Build restored state inside the coordinator load callback**
- [x] **Step 3: Route latest success/error to existing state semantics**
- [x] **Step 4: Invalidate on missing id and effect cleanup**
- [x] **Step 5: Preserve manual reload on the same callback**

### Task 3: Verification gate

- [x] **Step 1: Run Prettier and focused practice tests**
- [x] **Step 2: Run ESLint and TypeScript**
- [x] **Step 3: Run full User Portal Vitest and production build**
- [x] **Step 4: Run `git diff --check`, review the final diff, and record evidence**

## Verification Evidence

- TDD RED：首次运行因 `practice-session-request` 模块不存在而失败，退出码 1。
- Request GREEN：1 个测试文件、4 项测试通过。
- 定向回归：9 个测试文件、52 项测试通过。
- ESLint 与 TypeScript：退出码均为 0。
- 完整 Vitest：73 个测试文件、237 项测试通过。
- Next.js 生产构建：退出码 0，14 个静态页面生成。
- Prettier 已执行；`git diff --check` 退出码 0；最终 diff 已复核。

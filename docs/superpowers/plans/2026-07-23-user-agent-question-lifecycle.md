# User Agent Question Lifecycle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure every Agent confirmation Promise resolves or rejects exactly once and cannot affect later conversations after settlement.

**Architecture:** A pure pending-answer manager centralizes Promise callbacks, AbortSignal listener cleanup, and visible question state. The React hook owns one manager and cancels it on conversation-scope cleanup.

**Tech Stack:** React 18, TypeScript 5, Vitest, AbortController, existing Page Agent integration

## Global Constraints

- Answer, cancel, and abort must detach the registered abort listener.
- Conversation switch and unmount must reject any pending answer Promise.
- An old signal must never clear a newer question.
- Existing activity copy, confirmation UI, and answer strings must remain unchanged.
- Do not change APIs, shared contracts, dependencies, root configuration, database, or CI.
- Do not commit, push, or create a PR in this session.

---

### Task 1: Pending-answer manager

**Files:**

- Create: `apps/user-portal/src/components/user-agent/conversation-question.ts`
- Create: `apps/user-portal/src/components/user-agent/conversation-question.test.ts`

**Interface:**

```ts
export function createPendingAnswerManager(onQuestionChange: (question: string | null) => void): {
  ask: (question: string, options?: { signal?: AbortSignal }) => Promise<string>;
  answer: (value: string) => void;
  cancel: (reason: unknown) => void;
};
```

- [x] **Step 1: Write tests for answer, cancel, abort, and stale-listener isolation**
- [x] **Step 2: Run focused test and confirm RED because the module is absent**
- [x] **Step 3: Implement one pending entry and shared cleanup**
- [x] **Step 4: Re-run and confirm all manager tests GREEN**

### Task 2: Hook integration

**Files:**

- Modify: `apps/user-portal/src/components/user-agent/useUserAgentConversation.ts`

- [x] **Step 1: Replace resolver ref with one stable pending-answer manager**
- [x] **Step 2: Delegate ask and answer while preserving activity messages**
- [x] **Step 3: Cancel the manager from conversation effect cleanup**
- [x] **Step 4: Preserve the Page Agent `onAskUser` signature**

### Task 3: Verification gate

- [x] **Step 1: Run Prettier and focused User Agent tests**
- [x] **Step 2: Run ESLint and TypeScript**
- [x] **Step 3: Run full User Portal Vitest and production build**
- [x] **Step 4: Run `git diff --check`, review the final diff, and record evidence**

## Verification Evidence

- TDD RED：首次运行因 `conversation-question` 模块不存在而失败，退出码 1。
- Manager GREEN：1 个测试文件、5 项测试通过。
- 定向回归：8 个测试文件、29 项测试通过。
- TypeScript 首次发现 `exactOptionalPropertyTypes` 下显式 `undefined` 不满足可选 signal；改为明确 union 后重跑退出码 0。
- 最新 ESLint：退出码 0。
- 完整 Vitest：67 个测试文件、214 项测试通过。
- Next.js 生产构建：退出码 0，14 个静态页面生成。
- Prettier 已执行；`git diff --check` 退出码 0；最终 diff 已复核。

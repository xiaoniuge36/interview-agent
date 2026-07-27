# User Agent Conversation Creation Race Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Coalesce duplicate new-conversation requests and prevent older selections from overwriting a newly created conversation.

**Architecture:** A pure single-flight runner owns create deduplication. The existing latest-selection coordinator gains explicit invalidation, and the hook composes both primitives around the create transition.

**Tech Stack:** React 18, TypeScript 5, Vitest, existing User Agent Conversation API

## Global Constraints

- Concurrent create calls must invoke the API exactly once and share one result.
- Fulfillment and rejection must both release the single-flight lock.
- Starting creation must invalidate every outstanding selection request.
- Creation start clears the previous active id and payload and enters loading.
- Do not change APIs, shared contracts, dependencies, root configuration, database, or CI.
- Keep functions at or below 50 lines and files at or below 300 lines.
- Do not commit, push, or create a PR in this session.

---

### Task 1: Single-flight create primitive

**Files:**

- Create: `apps/user-portal/src/components/user-agent/conversation-creation.ts`
- Create: `apps/user-portal/src/components/user-agent/conversation-creation.test.ts`

**Interface:**

```ts
export function createSingleFlightRunner<T>(): (action: () => Promise<T>) => Promise<T>;
```

- [x] **Step 1: Write tests for concurrent fulfillment and rejection retry**
- [x] **Step 2: Run the focused test and confirm RED because the module is absent**
- [x] **Step 3: Implement the closure-owned pending promise with `finally` cleanup**
- [x] **Step 4: Re-run and confirm both tests are GREEN**

### Task 2: Selection invalidation

**Files:**

- Modify: `apps/user-portal/src/components/user-agent/conversation-selection.ts`
- Modify: `apps/user-portal/src/components/user-agent/conversation-selection.test.ts`
- Modify: `apps/user-portal/src/components/user-agent/useUserAgentConversations.ts`

**Interface:**

```ts
type LatestConversationSelection = {
  run: <T>(handlers: ConversationSelectionHandlers<T>) => Promise<boolean>;
  invalidate: () => void;
};
```

- [x] **Step 1: Add a failing test that invalidation suppresses an outstanding run**
- [x] **Step 2: Implement `{ run, invalidate }` around one monotonic sequence**
- [x] **Step 3: Update selection hook call sites from `runner(...)` to `runner.run(...)`**
- [x] **Step 4: Re-run selection tests and confirm GREEN**

### Task 3: Hook creation transition

**Files:**

- Modify: `apps/user-portal/src/components/user-agent/useUserAgentConversations.ts`

- [x] **Step 1: Instantiate one stable single-flight runner per conversation hook**
- [x] **Step 2: Pass selection invalidation and single-flight into `useCreateConversation`**
- [x] **Step 3: Clear stale active state, set loading, apply success/error, and settle loading once**
- [x] **Step 4: Preserve the existing `Promise<UserAgentConversation | null>` return contract**

### Task 4: Verification gate

- [x] **Step 1: Run Prettier and focused User Agent tests**
- [x] **Step 2: Run ESLint and TypeScript**
- [x] **Step 3: Run full User Portal Vitest and production build**
- [x] **Step 4: Run `git diff --check`, review the final diff, and record evidence**

## Verification Evidence

- Single-flight RED：首次运行因 `conversation-creation` 模块不存在而失败，退出码 1。
- Single-flight GREEN：1 个测试文件、2 项测试通过；过程中先发现同步调用时序不符测试，调整实现后转绿。
- Invalidation RED：4 项选择测试均因 `selection.run` 尚不存在而按预期失败。
- Invalidation GREEN：1 个测试文件、4 项测试通过。
- 定向回归：5 个测试文件、18 项测试通过。
- ESLint 与 TypeScript：退出码均为 0。
- 完整 Vitest：64 个测试文件、203 项测试通过。
- Next.js 生产构建：退出码 0，14 个静态页面生成。
- Prettier 已执行；`git diff --check` 退出码 0；最终 diff 已复核。

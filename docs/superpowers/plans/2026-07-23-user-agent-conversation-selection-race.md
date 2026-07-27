# User Agent Conversation Selection Race Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure rapid history navigation always displays the newest selected conversation and ignores stale completions.

**Architecture:** A pure sequence-based runner owns latest-request arbitration. The conversation hook delegates selection loads to it and clears the prior payload at transition start.

**Tech Stack:** React 18, TypeScript 5, Vitest, existing User Agent Conversation API

## Global Constraints

- Only the newest selection may update conversation, error, or loading state.
- Clear the prior conversation payload immediately when selection starts.
- Do not change APIs, shared contracts, dependencies, root configuration, database, or CI.
- Keep functions at or below 50 lines and files at or below 300 lines.
- Do not commit, push, or create a PR in this session.

---

### Task 1: Latest selection runner

**Files:**

- Create: `apps/user-portal/src/components/user-agent/conversation-selection.ts`
- Create: `apps/user-portal/src/components/user-agent/conversation-selection.test.ts`

**Interface:**

```ts
type ConversationSelectionHandlers<T> = {
  load: () => Promise<T>;
  onSuccess: (value: T) => void;
  onError: (reason: unknown) => void;
  onSettled: () => void;
};

export function createLatestConversationSelectionRunner(): <T>(
  handlers: ConversationSelectionHandlers<T>,
) => Promise<boolean>;
```

- [x] **Step 1: Write deferred-promise tests**

Cover reverse-order success, stale rejection, and latest rejection. Assert that stale runs return `false` and invoke no state callbacks.

- [x] **Step 2: Run tests and confirm RED**

Run: `pnpm --filter @interview-agent/user-portal exec vitest run src/components/user-agent/conversation-selection.test.ts`  
Expected: FAIL because `conversation-selection` does not exist.

- [x] **Step 3: Implement the minimal sequence runner**

Increment a closure-owned sequence before each load. Guard success, failure, and settlement callbacks with equality against the newest sequence.

- [x] **Step 4: Run tests and confirm GREEN**

Run the command from Step 2.  
Expected: 1 test file and 3 tests pass.

### Task 2: Hook integration

**Files:**

- Modify: `apps/user-portal/src/components/user-agent/useUserAgentConversations.ts`

- [x] **Step 1: Create one stable runner per hook instance**

Create it through `useRef` in `useUserAgentConversations` and pass it to `useSelectConversation`.

- [x] **Step 2: Delegate selection settlement**

Before `run`, set loading, clear error, set the requested id, and clear `activeConversation`. Route success, failure, and settlement through the runner callbacks.

- [x] **Step 3: Update internal callback types**

Allow the selection callback's `Promise<boolean>` result to flow through bootstrap and deletion replacement calls without changing external API contracts.

### Task 3: Verification gate

- [x] **Step 1: Run Prettier and focused User Agent tests**
- [x] **Step 2: Run ESLint and TypeScript**
- [x] **Step 3: Run full User Portal Vitest and production build**
- [x] **Step 4: Run `git diff --check`, review the final diff, and record evidence below**

## Verification Evidence

- TDD RED：首次运行因 `conversation-selection` 模块不存在而失败，退出码 1。
- Runner GREEN：1 个测试文件、3 项测试通过。
- 定向回归：4 个测试文件、15 项测试通过。
- ESLint：首次发现测试 suite callback 超过 50 行；拆分后重跑退出码 0。
- TypeScript：`pnpm --filter @interview-agent/user-portal typecheck`，退出码 0。
- 完整 Vitest：63 个测试文件、200 项测试通过。
- Next.js 生产构建：退出码 0，14 个静态页面生成。
- Prettier 已执行；`git diff --check` 退出码 0；最终 diff 已复核。

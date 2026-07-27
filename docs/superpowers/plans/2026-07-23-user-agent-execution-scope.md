# User Agent Execution Scope Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent late Agent work from one conversation from writing into another conversation's visible transcript.

**Architecture:** A pure current-scope predicate gates transcript effects. The conversation hook supplies settlement-time identity through a ref while keeping successful persistence associated with the original id.

**Tech Stack:** React 18, TypeScript 5, Vitest, Page Agent Core, existing Conversation API

## Global Constraints

- A visible async effect requires a non-null source id equal to the current id.
- A stale submit must not start Agent execution after its initial persistence settles.
- A stale successful result may persist to its source conversation but must not render in the new one.
- A stale thrown execution error must be treated as cancellation and not persisted.
- Persistence failures render only while their source conversation is current.
- Do not change APIs, shared contracts, dependencies, root configuration, database, or CI.
- Do not commit, push, or create a PR in this session.

---

### Task 1: Conversation effect scope model

**Files:**

- Create: `apps/user-portal/src/components/user-agent/conversation-execution-scope.ts`
- Create: `apps/user-portal/src/components/user-agent/conversation-execution-scope.test.ts`

**Interface:**

```ts
export function isCurrentConversationEffect(
  currentConversationId: string | null,
  sourceConversationId: string | null,
): boolean;
```

- [x] **Step 1: Write matching, mismatched, and null-id tests**
- [x] **Step 2: Run focused test and confirm RED because the module is absent**
- [x] **Step 3: Implement the minimal non-null equality predicate**
- [x] **Step 4: Re-run and confirm 3 tests GREEN**

### Task 2: Submit and settlement integration

**Files:**

- Modify: `apps/user-portal/src/components/user-agent/useUserAgentConversation.ts`

- [x] **Step 1: Maintain the latest conversation id in a ref**
- [x] **Step 2: Add `isCurrent` to submit and persistence options**
- [x] **Step 3: Stop stale submissions before Agent execution**
- [x] **Step 4: Gate result/error transcript writes and persistence-error writes**
- [x] **Step 5: Persist successful Agent settlement to the captured source conversation**

### Task 3: Verification gate

- [x] **Step 1: Run Prettier and focused User Agent tests**
- [x] **Step 2: Run ESLint and TypeScript**
- [x] **Step 3: Run full User Portal Vitest and production build**
- [x] **Step 4: Run `git diff --check`, review the final diff, and record evidence**

## Verification Evidence

- TDD RED：首次运行因 `conversation-execution-scope` 模块不存在而失败，退出码 1。
- Model GREEN：1 个测试文件、3 项测试通过。
- 定向回归：7 个测试文件、24 项测试通过。
- ESLint 与 TypeScript：退出码均为 0。
- 完整 Vitest：66 个测试文件、209 项测试通过。
- Next.js 生产构建：退出码 0，14 个静态页面生成。
- Prettier 已执行；`git diff --check` 退出码 0；最终 diff 已复核。

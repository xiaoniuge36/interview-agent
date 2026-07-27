# User Agent Create/Selection Order Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure a newer history selection wins over an older in-flight conversation creation without hiding the created summary.

**Architecture:** The existing monotonic selection coordinator becomes the shared activation clock by returning tokens from invalidation and exposing current-token checks. Creation gates active/error/loading settlement on that token.

**Tech Stack:** React 18, TypeScript 5, Vitest, existing Conversation API

## Global Constraints

- Every creation start receives one activation token from the existing coordinator.
- Successful creation always inserts its summary exactly once.
- Stale creation must not update active id, active payload, error, or loading.
- Current creation preserves existing success and error behavior.
- Do not change APIs, shared contracts, dependencies, root configuration, database, or CI.
- Do not commit, push, or create a PR in this session.

---

### Task 1: Activation token contract

**Files:**

- Modify: `apps/user-portal/src/components/user-agent/conversation-selection.ts`
- Modify: `apps/user-portal/src/components/user-agent/conversation-selection.test.ts`

**Interface:**

```ts
invalidate: () => number;
isCurrent: (token: number) => boolean;
```

- [x] **Step 1: Add failing tests for issued-token current/stale transitions**
- [x] **Step 2: Run selection tests and confirm RED because `isCurrent` and return token are absent**
- [x] **Step 3: Return the incremented sequence and expose equality check**
- [x] **Step 4: Re-run and confirm selection tests GREEN**

### Task 2: Creation settlement gating

**Files:**

- Modify: `apps/user-portal/src/components/user-agent/useUserAgentConversations.ts`

- [x] **Step 1: Capture creation token before clearing active state**
- [x] **Step 2: Insert successful summary regardless of token**
- [x] **Step 3: Gate active assignment, error assignment, and loading settlement with `isCurrent`**
- [x] **Step 4: Preserve single-flight and return contracts**

### Task 3: Verification gate

- [x] **Step 1: Run Prettier and focused User Agent tests**
- [x] **Step 2: Run ESLint and TypeScript**
- [x] **Step 3: Run full User Portal Vitest and production build**
- [x] **Step 4: Run `git diff --check`, review the final diff, and record evidence**

## Verification Evidence

- Token RED：新增 2 项测试因 `selection.isCurrent` 不存在而失败，其余 4 项既有测试保持通过。
- Token GREEN：1 个选择测试文件、6 项测试通过。
- 定向回归：9 个测试文件、36 项测试通过。
- ESLint 与 TypeScript：退出码均为 0。
- 完整 Vitest：68 个测试文件、221 项测试通过。
- Next.js 生产构建：退出码 0，14 个静态页面生成。
- Prettier 已执行；`git diff --check` 退出码 0；最终 diff 已复核。

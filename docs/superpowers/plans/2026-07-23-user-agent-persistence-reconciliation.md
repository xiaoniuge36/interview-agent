# User Agent Persistence Reconciliation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent a late message persistence response from replacing a different active conversation.

**Architecture:** A pure reconciliation function decides whether a persisted conversation may replace current active state. Summary refresh stays independent and unconditional.

**Tech Stack:** React 18, TypeScript 5, Vitest, existing User Agent Conversation API

## Global Constraints

- Persisted data may replace active state only when both conversation ids match.
- A mismatched or null active state must remain unchanged.
- Summary upsert must continue for every successful persistence response.
- Do not change APIs, shared contracts, dependencies, root configuration, database, or CI.
- Do not commit, push, or create a PR in this session.

---

### Task 1: Persistence reconciliation model

**Files:**

- Create: `apps/user-portal/src/components/user-agent/conversation-persistence.ts`
- Create: `apps/user-portal/src/components/user-agent/conversation-persistence.test.ts`

**Interface:**

```ts
export function reconcilePersistedConversation(
  current: UserAgentConversation | null,
  persisted: UserAgentConversation,
): UserAgentConversation | null;
```

- [x] **Step 1: Write tests for matching, mismatched, and null active state**
- [x] **Step 2: Run the focused test and confirm RED because the module is absent**
- [x] **Step 3: Implement the minimal id comparison**
- [x] **Step 4: Re-run and confirm 3 tests GREEN**

### Task 2: Hook integration

**Files:**

- Modify: `apps/user-portal/src/components/user-agent/useUserAgentConversations.ts`

- [x] **Step 1: Import the reconciliation model**
- [x] **Step 2: Replace unconditional active assignment with functional reconciliation**
- [x] **Step 3: Keep summary upsert unconditional**

### Task 3: Verification gate

- [x] **Step 1: Run Prettier and focused User Agent tests**
- [x] **Step 2: Run ESLint and TypeScript**
- [x] **Step 3: Run full User Portal Vitest and production build**
- [x] **Step 4: Run `git diff --check`, review the final diff, and record evidence**

## Verification Evidence

- TDD RED：首次运行因 `conversation-persistence` 模块不存在而失败，退出码 1。
- Model GREEN：1 个测试文件、3 项测试通过。
- 定向回归：6 个测试文件、21 项测试通过。
- ESLint 与 TypeScript：退出码均为 0。
- 完整 Vitest：65 个测试文件、206 项测试通过。
- Next.js 生产构建：退出码 0，14 个静态页面生成。
- Prettier 已执行；`git diff --check` 退出码 0；最终 diff 已复核。

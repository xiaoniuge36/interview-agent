# User Agent Dynamic Conversation Context Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure every User Agent reasoning step sees the latest bounded persisted conversation summary without recreating the runtime.

**Architecture:** `user-agent-runtime` exports a pure instruction factory with a lazy context getter. `useUserAgentRuntime` passes its existing stable latest-context ref through that getter, so message updates affect future PageAgentCore page instructions but do not invalidate a live Agent instance.

**Tech Stack:** React 18, TypeScript 5, Vitest, PageAgentCore

## Global Constraints

- Preserve safety instructions, page scenario instructions, context limits, message filtering, and runtime lifecycle behavior.
- Do not change Agent APIs, shared contracts, schemas, dependencies, root configuration, database, CI, Admin Agent, or backend modules.
- Do not stage, commit, push, create a PR, or alter unrelated working-tree changes.

---

### Task 1: Lazy runtime instruction factory

**Files:**

- Modify: `apps/user-portal/src/components/user-agent/user-agent-runtime.ts`
- Modify: `apps/user-portal/src/components/user-agent/user-agent-runtime.test.ts`

**Interfaces:**

- `createUserAgentRuntimeInstructions({ getConversationContext, pageContext })`
- Returns `{ system, getPageInstructions(url) }` accepted by PageAgentCore.

- [x] **Step 1: Write a failing latest-context test**

```ts
let context = '第一轮摘要';
const instructions = createUserAgentRuntimeInstructions({
  pageContext: '当前在练习空间。',
  getConversationContext: () => context,
});
expect(instructions.getPageInstructions('https://app.test/practice')).toContain('第一轮摘要');
context = '第二轮摘要';
expect(instructions.getPageInstructions('https://app.test/practice')).toContain('第二轮摘要');
```

- [x] **Step 2: Run focused test and confirm RED**

Run: `pnpm --filter @interview-agent/user-portal test -- user-agent-runtime.test.ts`

Expected: FAIL because `createUserAgentRuntimeInstructions` is not exported.

- [x] **Step 3: Implement static safety plus lazy page instructions**

```ts
export function createUserAgentRuntimeInstructions(options: {
  getConversationContext: () => string;
  pageContext?: string;
}) {
  return {
    system: buildUserAgentInstructions(),
    getPageInstructions: (url: string) =>
      buildUserAgentPageInstructions(url, options.pageContext, options.getConversationContext()),
  };
}
```

- [x] **Step 4: Re-run focused test and confirm GREEN**

Run: `pnpm --filter @interview-agent/user-portal test -- user-agent-runtime.test.ts`

Expected: PASS.

### Task 2: Stable React runtime integration

**Files:**

- Modify: `apps/user-portal/src/components/user-agent/useUserAgentRuntime.ts`

- [x] **Step 1: Pass `() => contextRef.current` to runtime creation**
- [x] **Step 2: Do not add `conversationContext` to the runtime effect dependency list**
- [x] **Step 3: Preserve existing recreation dependencies and cleanup**

### Task 3: Completion verification

- [x] **Step 1: Run Prettier and focused runtime tests**
- [x] **Step 2: Run User Portal lint and TypeScript**
- [x] **Step 3: Run full User Portal Vitest and production build**
- [x] **Step 4: Run `git diff --check` and review scope**

## Verification Evidence

- RED: focused runtime test failed because `createUserAgentRuntimeInstructions` was not exported.
- GREEN: focused runtime test passed 6/6 after the lazy instruction factory was added.
- Prettier, User Portal ESLint, and User Portal TypeScript passed.
- User Portal Vitest passed 96 files and 298 tests; Next.js production build completed with 14
  static pages.
- `git diff --check` passed after final scope review.

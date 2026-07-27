# User Agent Selection Unmount Safety Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent an in-flight User Agent conversation selection from publishing after its hook unmounts.

**Architecture:** Reuse the existing sequence-based selection runner and expose a tiny cleanup creator that invalidates it. The hook registers that cleanup in one stable effect.

**Tech Stack:** React 18, TypeScript 5, Vitest

## Global Constraints

- Preserve mounted selection behavior and existing APIs.
- Do not change shared contracts, dependencies, root configuration, database, CI, or other apps.
- Do not stage, commit, push, or create a PR in this session.

---

### Task 1: Selection lifecycle cleanup

**Files:**

- Modify: `apps/user-portal/src/components/user-agent/conversation-selection.ts`
- Modify: `apps/user-portal/src/components/user-agent/conversation-selection.test.ts`
- Modify: `apps/user-portal/src/components/user-agent/useUserAgentConversations.ts`

- [x] **Step 1: Write a failing deferred-request test**

```ts
const cleanup = createConversationSelectionCleanup(selection);
cleanup();
pending.resolve('stale');
await expect(request).resolves.toBe(false);
expect(onSuccess).not.toHaveBeenCalled();
```

- [x] **Step 2: Run the focused test and confirm RED**

Run: `pnpm --filter @interview-agent/user-portal test -- conversation-selection.test.ts`

Expected: FAIL because `createConversationSelectionCleanup` is not exported.

- [x] **Step 3: Implement the cleanup factory and register it in the hook**

```ts
export function createConversationSelectionCleanup(selection: SelectionRunner) {
  return () => selection.invalidate();
}

useEffect(() => createConversationSelectionCleanup(selectionRunner), [selectionRunner]);
```

- [x] **Step 4: Re-run the focused test and confirm GREEN**

Run: `pnpm --filter @interview-agent/user-portal test -- conversation-selection.test.ts`

Expected: PASS.

### Task 2: Completion verification

- [x] **Step 1: Run formatter and focused tests**
- [x] **Step 2: Run lint and TypeScript**
- [x] **Step 3: Run full User Portal Vitest and production build**
- [x] **Step 4: Run `git diff --check` and review the final diff**

## Verification Evidence

- RED: focused test failed as expected because `createConversationSelectionCleanup` did not exist.
- GREEN: focused lifecycle test passed 7/7 after the cleanup factory and hook effect were added.
- Prettier, User Portal ESLint, and User Portal TypeScript all passed.
- User Portal Vitest passed 95 files and 293 tests; Next.js production build completed with 14
  static pages.
- Root `pnpm test` passed: all 6 package test tasks succeeded.
- `git diff --check` passed.

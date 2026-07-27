# User Agent Drawer Close Cancellation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop a running User Agent when its drawer closes and distinguish that voluntary cancellation from an error.

**Architecture:** A small User Agent-local pure module creates the close action, owns monotonic submission validity, and classifies returned execution results. The existing conversation hook consumes the lifecycle and classifier; the widget wires the close action to its stable stop callback.

**Tech Stack:** React 18, TypeScript 5, Vitest, PageAgentCore

## Global Constraints

- Preserve normal success/error persistence and the explicit Stop control.
- Do not change APIs, shared contracts, persisted message roles, schemas, dependencies, root configuration, database, CI, or other applications.
- Do not stage, commit, push, create a PR, or alter unrelated working-tree changes.

---

### Task 1: Close and execution outcome model

**Files:**

- Create: `apps/user-portal/src/components/user-agent/conversation-execution.ts`
- Create: `apps/user-portal/src/components/user-agent/conversation-execution.test.ts`

**Interfaces:**

- `createUserAgentDrawerCloseAction(stop, close): () => void`
- `createUserAgentTaskLifecycle(): { begin; cancel; isCurrent }`
- `resolveUserAgentExecutionMessage(result, status): { role; content; persist }`
- `shouldPublishUserAgentExecutionMessage(message, isConversationCurrent, isTaskCurrent): boolean`

- [x] **Step 1: Write failing close and result-classification tests**

```ts
createUserAgentDrawerCloseAction(
  () => events.push('stop'),
  () => events.push('close'),
)();
expect(events).toEqual(['stop', 'close']);
expect(
  resolveUserAgentExecutionMessage({ success: false, data: 'Task aborted' }, 'stopped'),
).toEqual({ role: 'activity', content: '已停止本次请求。', persist: false });
expect(resolveUserAgentExecutionMessage({ success: false, data: 'network down' }, 'error')).toEqual(
  { role: 'error', content: 'network down', persist: true },
);
const task = lifecycle.begin();
lifecycle.cancel();
expect(lifecycle.isCurrent(task)).toBe(false);
expect(shouldPublishUserAgentExecutionMessage(stoppedMessage, true, false)).toBe(true);
expect(shouldPublishUserAgentExecutionMessage(errorMessage, true, false)).toBe(false);
```

- [x] **Step 2: Run focused test and confirm RED**

Run: `pnpm --filter @interview-agent/user-portal test -- conversation-execution.test.ts`

Expected: FAIL because the new module does not exist.

- [x] **Step 3: Implement the minimal close action and outcome classifier**

```ts
export function createUserAgentDrawerCloseAction(stop: () => void, close: () => void) {
  return () => {
    stop();
    close();
  };
}

export function createUserAgentTaskLifecycle() {
  let latest = 0;
  return {
    begin: () => ++latest,
    cancel: () => ++latest,
    isCurrent: (token: number) => token === latest,
  };
}

export function resolveUserAgentExecutionMessage(
  result: { success: boolean; data: string },
  status: AgentStatus,
) {
  if (status === 'stopped')
    return { role: 'activity' as const, content: '已停止本次请求。', persist: false };
  return {
    role: result.success ? ('assistant' as const) : ('error' as const),
    content: result.data || '本次建议没有完成，请稍后重试。',
    persist: true,
  };
}
```

- [x] **Step 4: Re-run focused test and confirm GREEN**

Run: `pnpm --filter @interview-agent/user-portal test -- conversation-execution.test.ts`

Expected: PASS.

### Task 2: Widget and conversation integration

**Files:**

- Modify: `apps/user-portal/src/components/user-agent/UserAgentWidget.tsx`
- Modify: `apps/user-portal/src/components/user-agent/useUserAgentConversation.ts`

- [x] **Step 1: Route drawer close through the close action**
- [x] **Step 2: Invalidate the current submission before stopping the runtime**
- [x] **Step 3: Gate pre-run persistence completion and execution on the submission lifecycle**
- [x] **Step 4: Emit, but do not persist, the stopped activity result**
- [x] **Step 5: Keep successful and failed result handling unchanged**
- [x] **Step 6: Publish the stopped activity only for its active conversation**

### Task 3: Completion verification

- [x] **Step 1: Run Prettier and focused tests**
- [x] **Step 2: Run User Portal lint and TypeScript**
- [x] **Step 3: Run full User Portal Vitest and production build**
- [x] **Step 4: Run `git diff --check` and review scope**

## Verification Evidence

- RED: the initial focused test failed because `conversation-execution` did not exist. A second
  RED case failed because `createUserAgentTaskLifecycle` was not exported. A third RED case failed
  because the active-conversation publication gate was not exported.
- GREEN: focused tests passed 5/5 after adding the close action, lifecycle, result classifier, and
  active-conversation publication gate.
- Prettier, User Portal ESLint, and User Portal TypeScript passed.
- User Portal Vitest passed 96 files and 298 tests; Next.js production build completed with 14
  static pages.
- `git diff --check` passed after final scope review.

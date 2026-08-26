# User Agent Run Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist and safely recover User Agent requests without widening its read-only training boundary.

**Architecture:** A new Prisma run record is owned by the existing user conversation. Product API supplies idempotent lifecycle endpoints and stale reconciliation. User Portal keeps an active run alongside PageAgent execution, syncs bounded history, and presents terminal recovery state without persisting cancellation as a chat error.

**Tech Stack:** NestJS 11, Prisma 6, Next.js 15, React 18, TypeScript 5, Jest, Vitest, Zod

## Global Constraints

- User Agent run reads and writes are scoped by tenant, current user, and conversation.
- Maximum returned history is eight runs; stale threshold is 90 seconds.
- Prompts, progress, and errors are sanitized before persistence.
- Closing the drawer persists `cancelled` for an active run but does not add an error message.
- Do not change shared contracts, Agent tool permissions, practice/interview APIs, dependencies, or root configuration.
- Schema, migration, and User Page Agent local API changes are explicitly authorized for this phase.
- Do not stage, commit, push, create a PR, or alter unrelated working-tree changes.

---

### Task 1: Persist User Agent run lifecycle

**Files:**

- Modify: `apps/product-api/prisma/schema/user-page-agent.prisma`
- Modify: `apps/product-api/prisma/schema/identity.prisma`
- Modify: `apps/product-api/prisma/schema/enums.prisma`
- Create: `apps/product-api/prisma/schema/migrations/20260727120000_add_user_page_agent_runs/migration.sql`
- Create: `apps/product-api/src/modules/user-page-agent/user-page-agent-run.service.ts`
- Create: `apps/product-api/src/modules/user-page-agent/user-page-agent-run.service.spec.ts`
- Modify: `apps/product-api/src/modules/user-page-agent/user-page-agent.schemas.ts`
- Modify: `apps/product-api/src/modules/user-page-agent/user-page-agent.controller.ts`
- Modify: `apps/product-api/src/modules/user-page-agent/user-page-agent.module.ts`

**Interfaces:**

- `UserPageAgentRunStatus = running | waiting_confirmation | succeeded | failed | cancelled | interrupted`.
- `UserPageAgentRunService.create/latest/list/heartbeat/complete` follows the Admin Agent lifecycle
  with a `UserAgentConversation` ownership check.
- Routes are `GET|POST /user/page-agent/conversations/:conversationId/runs`,
  `GET /user/page-agent/conversations/:conversationId/runs/latest`,
  `PATCH /user/page-agent/runs/:runId/heartbeat`, and
  `POST /user/page-agent/runs/:runId/complete`.

- [ ] **Step 1: Write failing service tests**

```ts
const result = await service.list(context, 'conversation-1');
expect(prisma.userPageAgentRun.findMany).toHaveBeenCalledWith({
  where: { tenantId: 'tenant-1', userId: 'user-1', conversationId: 'conversation-1' },
  orderBy: { startedAt: 'desc' },
  take: 8,
});
expect(result).toHaveLength(1);
```

- [ ] **Step 2: Run the focused Product API test to verify RED**

Run: `pnpm --filter @interview-agent/product-api test -- user-page-agent-run.service.spec.ts --runInBand`

Expected: FAIL because the run service and Prisma delegate do not exist.

- [ ] **Step 3: Add schema, migration, schemas, service, controller routes, and module provider**

```prisma
model UserPageAgentRun {
  id String @id @default(cuid())
  tenantId String
  userId String
  conversationId String
  status UserPageAgentRunStatus @default(running)
  heartbeatAt DateTime @default(now())
  @@index([tenantId, userId, conversationId, startedAt])
}
```

- [ ] **Step 4: Validate/generate Prisma and verify GREEN**

Run: `pnpm --filter @interview-agent/product-api db:generate` then the focused Jest command.

Expected: generation succeeds and all lifecycle tests pass.

### Task 2: Typed User Portal run transport and recovery state

**Files:**

- Create: `apps/user-portal/src/lib/user-page-agent-run-api.ts`
- Create: `apps/user-portal/src/lib/user-page-agent-run-api.test.ts`
- Create: `apps/user-portal/src/components/user-agent/user-agent-run-recovery-model.ts`
- Create: `apps/user-portal/src/components/user-agent/user-agent-run-recovery-model.test.ts`
- Create: `apps/user-portal/src/components/user-agent/useUserAgentRunRecovery.ts`
- Create: `apps/user-portal/src/components/user-agent/useUserAgentRunLifecycle.ts`
- Modify: `apps/user-portal/src/components/user-agent/UserAgentWidget.tsx`

**Interfaces:**

- `UserAgentRunSchema` is local to the portal and parses run responses.
- `useUserAgentRunRecovery(conversationId)` returns `latestRun`, `runHistory`, `startRun`,
  `completeRun`, `cancelActiveRun`, `reportProgress`, `markWaiting`, and `markRunning`.

- [ ] **Step 1: Write failing transport/model tests**

```ts
expect(createUserAgentRunHistoryRequest('conversation/1').path).toBe(
  '/user/page-agent/conversations/conversation%2F1/runs',
);
expect(shouldRefreshUserAgentRun(interruptedRun, null, null)).toBe(false);
expect(resolveUserAgentRunCompletion(false, true)).toBe('cancelled');
```

- [ ] **Step 2: Run focused Portal tests to verify RED**

Run: `pnpm --filter @interview-agent/user-portal test -- user-page-agent-run-api.test.ts user-agent-run-recovery-model.test.ts`

Expected: FAIL because the transport and recovery model do not exist.

- [ ] **Step 3: Implement transport, bounded local history, heartbeats, and active-run cancellation**

```ts
export function createUserAgentRunHistoryRequest(conversationId: string) {
  return { path: conversationRunsPath(conversationId), schema: UserAgentRunSchema.array() };
}
```

- [ ] **Step 4: Verify focused Portal tests are GREEN**

Run: `pnpm --filter @interview-agent/user-portal test -- user-page-agent-run-api.test.ts user-agent-run-recovery-model.test.ts`

Expected: PASS.

### Task 3: Connect conversation execution, close cancellation, and recovery UI

**Files:**

- Modify: `apps/user-portal/src/components/user-agent/useUserAgentConversation.ts`
- Modify: `apps/user-portal/src/components/user-agent/conversation-execution.ts`
- Modify: `apps/user-portal/src/components/user-agent/UserAgentDrawer.tsx`
- Create: `apps/user-portal/src/components/user-agent/UserAgentRunHistory.tsx`
- Create: `apps/user-portal/src/components/user-agent/UserAgentRunHistory.test.tsx`
- Modify: `apps/user-portal/src/app/styles/user-agent.css`

**Interfaces:**

- `useUserAgentConversation` receives a run lifecycle and creates a durable run only after user
  message persistence succeeds.
- Its `stop` function calls `cancelActiveRun` before stopping PageAgent, and does not append an
  error message for a stopped task.
- `UserAgentDrawer` receives current run state and shows a retry card/history only for terminal
  runs; retry always creates a new linked run.

- [ ] **Step 1: Write failing execution and render tests**

```ts
expect(resolveUserAgentExecutionMessage(stoppedResult, 'stopped').persist).toBe(false);
expect(markup).toContain('上次训练建议已中断');
expect(markup).toContain('安全重试');
expect(markup).toContain('运行历史');
```

- [ ] **Step 2: Run focused tests to verify RED**

Run: `pnpm --filter @interview-agent/user-portal test -- conversation-execution.test.ts UserAgentRunHistory.test.tsx`

Expected: FAIL because no durable run lifecycle or recovery component is connected.

- [ ] **Step 3: Implement lifecycle integration and accessible compact UI**

```tsx
{
  latestRun?.status === 'interrupted' ? (
    <button type="button" onClick={() => onRetry(latestRun.prompt, latestRun.id)}>
      安全重试
    </button>
  ) : null;
}
```

- [ ] **Step 4: Verify focused tests are GREEN**

Run: `pnpm --filter @interview-agent/user-portal test -- conversation-execution.test.ts UserAgentRunHistory.test.tsx`

Expected: PASS.

### Task 4: Completion verification

- [ ] **Step 1: Run Prisma format, validation, and generation.**
- [ ] **Step 2: Run focused Product API and User Portal tests, lint, and TypeScript.**
- [ ] **Step 3: Run complete Product API/User Portal suites and production builds serially.**
- [ ] **Step 4: Run Prettier, `git diff --check`, and inspect schema/migration scope.**

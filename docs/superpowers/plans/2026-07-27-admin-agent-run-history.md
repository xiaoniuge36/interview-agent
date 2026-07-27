# Admin Agent Run History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an administrator inspect the bounded, durable run sequence for the selected Admin Agent conversation.

**Architecture:** Product API owns stale reconciliation and a tenant/operator-scoped list query over existing `AdminPageAgentRun` records. The Admin Console validates the local response with Zod, keeps the list current through its existing run lifecycle, and renders a collapsed observational history in the drawer.

**Tech Stack:** NestJS 11, Prisma 6, Next.js 15, React 18, TypeScript 5, Jest, Vitest, Zod, Ant Design

## Global Constraints

- Return at most eight newest runs, scoped by tenant, operator, and conversation.
- Do not change database schema, migrations, shared contracts, permissions, APIs outside the Admin Page Agent namespace, or execution/retry authorization.
- Do not expose client request IDs, tenant IDs, user IDs, secrets, or unsanitized run text.
- Do not stage, commit, push, create a PR, or alter unrelated working-tree changes.

---

### Task 1: Product API bounded history endpoint

**Files:**

- Modify: `apps/product-api/src/modules/admin/admin-page-agent-run.service.ts`
- Modify: `apps/product-api/src/modules/admin/admin-page-agent-run.service.spec.ts`
- Modify: `apps/product-api/src/modules/admin/admin-page-agent.controller.ts`

**Interfaces:**

- `AdminPageAgentRunService.list(context, conversationId): Promise<AdminPageAgentRun[]>`
- `GET /admin/page-agent/conversations/:conversationId/runs` returns the above list.

- [x] **Step 1: Write the failing service assertion**

```ts
const result = await service.list(context, 'conversation-1');
expect(prisma.adminPageAgentRun.findMany).toHaveBeenCalledWith({
  where: { tenantId: 'tenant-1', userId: 'admin-1', conversationId: 'conversation-1' },
  orderBy: { startedAt: 'desc' },
  take: 8,
});
expect(result.map((run) => run.id)).toEqual(['run-new', 'run-old']);
```

- [x] **Step 2: Run the focused Product API test to verify RED**

Run: `pnpm --filter @interview-agent/product-api test -- admin-page-agent-run.service.spec.ts --runInBand`

Expected: FAIL because `list` does not exist.

- [x] **Step 3: Implement shared stale reconciliation and the bounded list**

```ts
async list(context: ProductRequestContext, conversationId: string) {
  await this.requireConversation(context, conversationId);
  await this.reconcileStaleRuns(context, conversationId);
  const runs = await this.client().adminPageAgentRun.findMany({
    where: { ...this.scope(context), conversationId },
    orderBy: { startedAt: 'desc' },
    take: 8,
  });
  return runs.map(toRun);
}
```

- [x] **Step 4: Add the controller route and verify GREEN**

Run: `pnpm --filter @interview-agent/product-api test -- admin-page-agent-run.service.spec.ts --runInBand`

Expected: PASS.

### Task 2: Admin Console history state and display

**Files:**

- Modify: `apps/admin-console/src/lib/admin-page-agent-run-api.ts`
- Modify: `apps/admin-console/src/lib/admin-page-agent-run-api.test.ts`
- Modify: `apps/admin-console/src/components/admin-agent/useAdminAgentRunRecovery.ts`
- Modify: `apps/admin-console/src/components/admin-agent/useAdminAgentRunLifecycle.ts`
- Modify: `apps/admin-console/src/components/admin-agent/AdminAgentWidget.tsx`
- Modify: `apps/admin-console/src/components/admin-agent/AdminAgentDrawerContent.tsx`
- Modify: `apps/admin-console/src/components/admin-agent/AdminAgentConversationContent.tsx`
- Modify: `apps/admin-console/src/components/admin-agent/AdminAgentDrawer.test.tsx`

**Interfaces:**

- `getAdminAgentRunHistory(conversationId, signal?)` parses `AdminAgentRunSchema.array()`.
- `useAdminAgentRunRecovery` returns `runHistory: AdminAgentRun[]`, newest first.
- `AdminAgentDrawerContent` receives `runHistory` and renders it read-only.

- [x] **Step 1: Write failing client request and drawer render assertions**

```ts
expect(createAdminAgentRunHistoryRequest('conversation/1').path).toBe(
  '/admin/page-agent/conversations/conversation%2F1/runs',
);
expect(createAdminAgentRunHistoryRequest('conversation-1').schema.parse([run])).toHaveLength(1);
expect(markup).toContain('运行历史');
expect(markup).toContain('重试任务');
```

- [x] **Step 2: Run focused Admin Console tests to verify RED**

Run: `pnpm --filter @interview-agent/admin-console test -- src/lib/admin-page-agent-run-api.test.ts src/components/admin-agent/AdminAgentDrawer.test.tsx`

Expected: FAIL because the history request and rendering do not exist.

- [x] **Step 3: Implement typed loading, local upserts, and collapsed rendering**

```ts
export function createAdminAgentRunHistoryRequest(conversationId: string) {
  return { path: conversationRunsPath(conversationId), schema: AdminAgentRunSchema.array() };
}
```

- [x] **Step 4: Wire the returned history through the widget and verify GREEN**

Run: `pnpm --filter @interview-agent/admin-console test -- src/lib/admin-page-agent-run-api.test.ts src/components/admin-agent/AdminAgentDrawer.test.tsx`

Expected: PASS.

### Task 3: Completion verification

- [x] **Step 1: Run Prettier on all planned source, test, and documentation files.**
- [x] **Step 2: Run focused Product API/Admin Console tests, lint, and TypeScript checks.**
- [x] **Step 3: Run both complete test suites and production builds.**
- [x] **Step 4: Run `git diff --check` and review all changed files against the scope boundaries.**

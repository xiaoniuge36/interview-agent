# Admin Page Agent Run Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persistent Admin Page Agent run ledger with heartbeat-based interruption detection and safe retry.

**Architecture:** PostgreSQL stores tenant-scoped run records while PageAgent continues to execute against the live browser DOM. Product API owns state-transition validation and stale-run reconciliation; Admin Console owns heartbeats, terminal updates, and the recovery card.

**Tech Stack:** Prisma/PostgreSQL, NestJS, Zod, React 18, Ant Design, Vitest, Jest

**Execution status:** Implemented and verified on 2026-07-23. Standard Prisma engine generation remains blocked by a Windows DLL held by an existing process; `--no-engine` generation, schema validation, migration deployment, package tests, typechecks, lint, builds, and logged-in UI smoke were completed.

---

## File Structure

- Create `apps/product-api/src/modules/admin/admin-page-agent-run.service.ts`: run ownership, idempotent creation, transitions, and stale reconciliation.
- Create `apps/product-api/src/modules/admin/admin-page-agent-run.service.spec.ts`: service behavior and tenant isolation.
- Create `apps/product-api/src/modules/admin/admin-page-agent-sanitization.ts`: shared persistence redaction.
- Modify `apps/product-api/src/modules/admin/admin-page-agent-conversation.service.ts`: reuse shared redaction.
- Modify `apps/product-api/src/modules/admin/admin-page-agent.schemas.ts`: run request/response schemas and input types.
- Modify `apps/product-api/src/modules/admin/admin-page-agent.controller.ts`: four run endpoints.
- Modify `apps/product-api/src/modules/admin/admin.module.ts`: register the run service.
- Modify `apps/product-api/prisma/schema/admin-page-agent.prisma`, `enums.prisma`, and `identity.prisma`: run model, enum, and relations.
- Create `apps/product-api/prisma/schema/migrations/20260723150000_add_admin_page_agent_runs/migration.sql`: deployable database migration.
- Create `apps/admin-console/src/lib/admin-page-agent-run-api.ts`: typed run API client.
- Create `apps/admin-console/src/lib/admin-page-agent-run-api.test.ts`: request path, payload, and response parsing tests.
- Create `apps/admin-console/src/components/admin-agent/useAdminAgentRunRecovery.ts`: latest-run loading, polling, local heartbeat, and lifecycle callbacks.
- Modify `apps/admin-console/src/components/admin-agent/useAdminAgentConversation.ts`: create and complete runs around PageAgent execution.
- Modify `apps/admin-console/src/components/admin-agent/AdminAgentWidget.tsx`: connect run lifecycle, confirmation state, and drawer props.
- Modify `apps/admin-console/src/components/admin-agent/AdminAgentDrawerContent.tsx` and `AdminAgentConversationContent.tsx`: recovery card and safe-retry action.
- Modify `apps/admin-console/src/components/admin-agent/AdminAgentDrawer.tsx`: forward recovery props.
- Modify `apps/admin-console/src/components/admin-agent/agent-drawer-model.ts` and its test: recovery presentation model.
- Modify `apps/admin-console/src/app/styles/admin-agent.css`: recovery-card layout.

### Task 1: Persisted run model and schemas

- [x] Add a failing Product API service test that expects run creation to scope `tenantId`, `userId`, and `conversationId`, store `context.traceId`, and redact `apiKey=sk-...` from the prompt.
- [x] Run `pnpm --filter @interview-agent/product-api test -- admin-page-agent-run.service.spec.ts --runInBand` and confirm it fails because the service is missing.
- [x] Add `AdminPageAgentRunStatus`, `AdminPageAgentRun`, identity relations, and migration SQL with indexes for conversation history and stale heartbeats.
- [x] Add Zod schemas with these request shapes:

```ts
type CreateRunInput = {
  prompt: string;
  clientRequestId: string;
  retryOfRunId?: string;
};

type HeartbeatRunInput = {
  status: 'running' | 'waiting_confirmation';
  currentStep?: string;
  tokenCount?: number;
};

type CompleteRunInput = {
  status: 'succeeded' | 'failed' | 'cancelled';
  currentStep?: string;
  tokenCount?: number;
  errorCode?: string;
  errorSummary?: string;
};
```

- [x] Extract `maskAdminPageAgentText(value: string)` and keep the existing conversation redaction test green.
- [x] Implement minimal run creation and response mapping until the creation test passes.
- [x] Do not commit; Git history changes require separate user authorization.

### Task 2: State transitions and HTTP endpoints

- [x] Add failing tests for idempotent client request IDs, retry ownership, stale active-run reconciliation, terminal-run heartbeat rejection, and idempotent terminal completion.
- [x] Run the focused service test and verify every new assertion fails for the intended missing behavior.
- [x] Implement `latest`, `create`, `heartbeat`, and `complete` with a 90-second stale threshold and immutable terminal states.
- [x] Add controller endpoints and register `AdminPageAgentRunService` in `AdminModule`.
- [x] Run the focused Product API tests and Prisma validation/generation until green.
- [x] Do not commit; Git history changes require separate user authorization.

### Task 3: Typed Admin Console lifecycle

- [x] Add failing Vitest cases that expect stable encoded paths, POST/PATCH methods, client request ID serialization, nullable latest-run parsing, and terminal response parsing.
- [x] Run `pnpm --filter @interview-agent/admin-console test -- src/lib/admin-page-agent-run-api.test.ts` and confirm expected failures.
- [x] Implement `admin-page-agent-run-api.ts` with response schemas matching Product API.
- [x] Implement `useAdminAgentRunRecovery` with a 15-second local heartbeat, 15-second remote-active poll, stable callback refs, and cleanup of timers.
- [x] Update `useAdminAgentConversation` so the durable order is message -> run -> PageAgent execution -> run completion, and stop requests complete as `cancelled`.
- [x] Connect waiting-confirmation transitions and runtime progress in `AdminAgentWidget`/`useAdminAgentRuntime`.
- [x] Run focused Admin Console tests and typecheck.
- [x] Do not commit; Git history changes require separate user authorization.

### Task 4: Recovery user experience

- [x] Add a failing presentation-model test for an interrupted run with a safe-retry label, sanitized prompt, and last-step fallback.
- [x] Add a failing drawer render test that expects “上次任务已中断” and a “安全重试” action.
- [x] Run both tests and confirm they fail because the recovery presentation/card is missing.
- [x] Implement a warning recovery card shown only for `interrupted` latest runs; route retries through `retryOfRunId` and never reopen the old run.
- [x] Add compact, overflow-safe styles without changing the drawer layout architecture.
- [x] Re-run focused tests, formatting, and lint.
- [x] Do not commit; Git history changes require separate user authorization.

### Task 5: Integration and completion verification

- [x] Re-read the approved design and check every boundary against the diff: no server-side DOM resume, no queue, no shared contract, no dependency change.
- [ ] Run `pnpm db:format && pnpm db:validate && pnpm db:generate`.
- [ ] Run `pnpm --filter @interview-agent/product-api test`, `typecheck`, `lint`, and `build`.
- [x] Run `pnpm --filter @interview-agent/admin-console test`, `typecheck`, `lint`, and `build`.
- [x] Run Prettier checks on changed files and `git diff --check`.
- [ ] Smoke-test the logged-in Admin Console: normal execution, confirmation wait, simulated stale run, recovery card, and new linked retry.
- [x] Review the final diff for security, tenant isolation, state races, and accidental overlap with pre-existing user changes.
- [ ] Report exact command evidence and any existing warnings; do not commit or push.

## Self-Review

- Spec coverage: persistence, redaction, heartbeat, stale detection, safe retry, tenant isolation, and disaster-recovery boundaries each map to a task.
- Placeholder scan: no deferred behavior or unspecified error handling remains.
- Type consistency: database, Product API, and Admin Console use the same six statuses and the same three mutation payloads.
